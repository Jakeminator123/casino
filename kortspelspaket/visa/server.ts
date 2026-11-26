// Visarens lilla server: paketets Unity-demo (Demo_CardGames.unity) och paketets figurer vid spelets blackjackbord, i
// webbläsaren och bara till den här datorn.
//   node kortspelspaket/visa/server.ts [--port 4330] [--oppna]
//   --oppna   öppnar sidan i webbläsaren när servern är igång (det STARTA visaren.cmd gör)
// Läser det uppackade paketet i kortspelspaket/paket/unity/Assets/ (node kortspelspaket/packa-upp.ts gör det).
// /demo.json är scenen omräknad till webbläsarens 3D: var figurerna står, vilken animation var och en spelar, golven och
// kameran. Unity räknar med z framåt och three.js med z mot betraktaren, så z byter tecken.
// Bordsvyn lånar spelets mått och rum (blackjack-dealer/src/table-lens.ts och dealer3d/src/) och de byggda modellerna
// av bordet och pallen (avatar-auto-pipeline/assets/), som standarddockans editor gör. Bara GET, utom PUT till
// kortspelspaket/sekvenser.json, där sidan sparar de bitar Jakob klipper ut ur en rörelse.
// three.js tas ur blackjack-dealer/node_modules om det är installerat, annars från jsDelivr i samma version. De byggda
// modellerna finns bara på en dator där de är byggda; saknas de svarar servern 404 och sidan säger det.
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {createReadStream, existsSync} from 'node:fs';
import {mkdir, readdir, readFile, rename, stat, writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const PORT = Number(arg('--port') ?? 4330), OPEN = process.argv.includes('--oppna');
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw Error('--port tar ett heltal 1–65535.');
const ROOT = fileURLToPath(new URL('../../', import.meta.url)); // casino-mappen, hittad från serverns egen plats
const HERE = 'kortspelspaket/visa/', ASSETS = path.join(ROOT, 'kortspelspaket/paket/unity/Assets');
const CUTS = 'kortspelspaket/sekvenser.json';
const THREE = path.join(ROOT, 'blackjack-dealer/node_modules/three');
const THREE_VERSION = JSON.parse(await readFile(path.join(ROOT, 'blackjack-dealer/package.json'), 'utf8')).dependencies.three as string;
const SCENE = 'CardGamesAnimationPack/Scenes/Demo_CardGames.unity', FIGURE = 'TheMightyCat/Characters/MightyCat_Queen.fbx';
const TYPES: Record<string, string> = {'.html': 'text/html; charset=utf-8', '.ts': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.fbx': 'application/octet-stream', '.png': 'image/png', '.glb': 'model/gltf-binary'};
/** Bordsvyns lån: spelets kortplan, och de byggda modellerna av standarddockans bord och dealerns pall. */
const PLAN = 'blackjack-dealer/placements/default.json';
const MODELS = ['avatar-auto-pipeline/assets/bord/standardbord_nara23.glb', 'avatar-auto-pipeline/assets/stol/dealerstol.glb'];

// ---- Unity-scenen --------------------------------------------------------------------------------------------------
type Vec = [number, number, number];
type Mods = Map<string, Map<string, {value: string; ref?: string}>>; // per mål i prefaben: egenskap → värde

/** Varje tillgångs GUID (ur dess .meta) och dess sökväg under Assets/: så pekar Unitys filer på varandra. */
async function guids(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const e of await readdir(ASSETS, {withFileTypes: true, recursive: true})) {
    if (!e.isFile() || !e.name.endsWith('.meta')) continue;
    const full = path.join(e.parentPath, e.name), m = (await readFile(full, 'utf8')).match(/^guid: (\w+)/m);
    if (m) out.set(m[1], path.relative(ASSETS, full).slice(0, -'.meta'.length).split(path.sep).join('/'));
  }
  return out;
}

/** Scenens utplacerade prefaber: vilken prefab, och det scenen ändrar i den, grupperat per mål. */
function prefabInstances(text: string): {prefab: string; mods: Mods}[] {
  const out: {prefab: string; mods: Mods}[] = [];
  for (const block of text.split(/^--- /m)) {
    const source = block.match(/m_SourcePrefab: \{fileID: -?\d+, guid: (\w+)/);
    if (!block.includes('PrefabInstance:') || !source) continue;
    const mods: Mods = new Map();
    const re = /- target: \{fileID: (-?\d+), guid: \w+, type: \d+\}\s+propertyPath: (.+?)\s*\n\s+value: ?(.*?)\s*\n\s+objectReference: \{fileID: -?\d+(?:, guid: (\w+))?/g;
    for (const m of block.matchAll(re)) {
      if (!mods.has(m[1])) mods.set(m[1], new Map());
      mods.get(m[1])!.set(m[2], {value: m[3], ref: m[4]});
    }
    out.push({prefab: source[1], mods});
  }
  return out;
}

const num = (props: Map<string, {value: string}>, key: string, otherwise: number) => props.has(key) ? Number(props.get(key)!.value) : otherwise;
const position = (p: Map<string, {value: string}>, d: Vec = [0, 0, 0]): Vec => [num(p, 'm_LocalPosition.x', d[0]), num(p, 'm_LocalPosition.y', d[1]), num(p, 'm_LocalPosition.z', d[2])];
/** Unitys rotation som riktningen framåt (z), omräknad till three.js. */
function forward(p: Map<string, {value: string}>): [number, number, number] {
  const x = num(p, 'm_LocalRotation.x', 0), y = num(p, 'm_LocalRotation.y', 0), z = num(p, 'm_LocalRotation.z', 0), w = num(p, 'm_LocalRotation.w', 1);
  return [2 * (x * z + w * y), 2 * (y * z - w * x), -(1 - 2 * (x * x + y * y))];
}
const three = (v: Vec): Vec => [v[0], v[1], -v[2]];

/** Utställningen i demoscenen: figurerna med var sin animation, golven under grupperna och kameran. */
async function demo() {
  const byGuid = await guids(), guidOf = (file: string) => [...byGuid].find(([, f]) => f === file)?.[0];
  const display = guidOf('TheMightyCat/Prefabs/DisplayCharacter.prefab'), ground = guidOf('TheMightyCat/Prefabs/ShowcaseGround.prefab'), env = guidOf('TheMightyCat/Prefabs/Env.prefab');
  const figurer = [], golv = []; let kamera = null;
  for (const {prefab, mods} of prefabInstances(await readFile(path.join(ASSETS, SCENE), 'utf8'))) {
    const all = [...mods.values()], named = all.find(p => p.has('m_Name'))?.get('m_Name')?.value ?? '';
    // Prefabens rot är det mål scenen har vridit (Unity skriver alltid rotationen för det som placerats ut).
    const root = all.find(p => p.has('m_LocalRotation.w')) ?? new Map();
    if (prefab === display) {
      const clip = all.find(p => p.has('animationClip'))?.get('animationClip')?.ref;
      figurer.push({namn: named, fil: clip ? byGuid.get(clip) : null, pos: three(position(root)), fram: forward(root)});
    } else if (prefab === ground) {
      // Golvet är en låda (GroundMesh) under roten: 10 x 1 x 10 och 0,53 under den, om scenen inte säger annat.
      const mesh = all.find(p => p !== root && [...p.keys()].some(k => k.startsWith('m_Local'))) ?? new Map(), at = position(root), off = position(mesh, [0, -0.53, 0]);
      golv.push({namn: named, pos: three([at[0] + off[0], at[1] + off[1], at[2] + off[2]]), storlek: [num(mesh, 'm_LocalScale.x', 10), 1, num(mesh, 'm_LocalScale.z', 10)]});
    } else if (prefab === env) {
      // Kameran är det mål i miljön som scenen har flyttat från origo.
      const cam = all.find(p => p.has('m_LocalPosition.z') && position(p).some(v => v !== 0));
      const fov = all.find(p => p.has('field of view'))?.get('field of view')?.value;
      if (cam) kamera = {pos: three(position(cam)), fram: forward(cam), fov: fov ? Number(fov) : 60};
    }
  }
  const textures = (await readdir(path.join(ASSETS, path.dirname(FIGURE)))).filter(f => f.toLowerCase().endsWith('.png'));
  return {figur: FIGURE, texturer: textures.map(f => `${path.dirname(FIGURE)}/${f}`), kamera, golv, figurer};
}

// ---- sekvenserna ---------------------------------------------------------------------------------------------------
// En sekvens är en bit av en rörelse: ett namn och två tider i sekunder. Bara namn och tider, inget ur paketet, så
// filen går in i Git. {"<animationens namn>": [{"namn": "...", "fran": 1.5, "till": 4.7}]}
type Cut = {namn: string; fran: number; till: number};
function cutsFrom(text: string): Record<string, Cut[]> | null {
  let data: unknown; try { data = JSON.parse(text); } catch { return null; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const out: Record<string, Cut[]> = {};
  for (const [clip, list] of Object.entries(data)) {
    if (!/^[A-Za-z0-9_]{1,80}$/.test(clip) || !Array.isArray(list)) return null;
    const cuts: Cut[] = [];
    for (const c of list as Cut[]) {
      if (!c || typeof c.namn !== 'string' || !c.namn.trim() || c.namn.length > 80 || !Number.isFinite(c.fran) || !Number.isFinite(c.till) || c.fran < 0 || c.till <= c.fran) return null;
      cuts.push({namn: c.namn.trim(), fran: Math.round(c.fran * 100) / 100, till: Math.round(c.till * 100) / 100});
    }
    if (cuts.length) out[clip] = cuts.sort((a, b) => a.fran - b.fran);
  }
  return out;
}
let saving: Promise<void> = Promise.resolve();
async function saveCuts(req: IncomingMessage, res: ServerResponse) {
  const parts: Buffer[] = []; let size = 0;
  for await (const chunk of req) { size += (chunk as Buffer).length; if (size > 1024 * 1024) { res.writeHead(413).end('för stor'); return; } parts.push(chunk as Buffer); }
  const cuts = cutsFrom(Buffer.concat(parts).toString('utf8'));
  if (!cuts) { res.writeHead(400, {'content-type': 'text/plain; charset=utf-8'}).end('inte en lista av sekvenser'); return; }
  // Skrivs hel under ett tillfälligt namn och byter sedan namn; två sparanden väntar på varandra.
  const full = path.join(ROOT, CUTS), temp = `${full}.${process.pid}.tmp`;
  const write = saving.catch(() => {}).then(async () => { await mkdir(path.dirname(full), {recursive: true}); await writeFile(temp, JSON.stringify(cuts, null, 2) + '\n', 'utf8'); await rename(temp, full); });
  saving = write; await write;
  res.writeHead(200, {'content-type': TYPES['.json']}).end(JSON.stringify(cuts));
}

// ---- servern -------------------------------------------------------------------------------------------------------
const ownHost = (req: IncomingMessage) => [`127.0.0.1:${PORT}`, `localhost:${PORT}`].includes(req.headers.host ?? '');
const sameOrigin = (req: IncomingMessage) => !req.headers.origin || [`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`].includes(req.headers.origin);
const typed = async (res: ServerResponse, file: string) => { res.writeHead(200, {'content-type': TYPES['.ts'], 'cache-control': 'no-store'}).end(stripTypeScriptTypes(await readFile(path.join(ROOT, file), 'utf8'))); };

/** three.js: byggfilerna och tilläggen (examples/jsm), lokalt eller från jsDelivr. */
async function vendor(res: ServerResponse, rest: string) {
  const file = rest === 'three.module.js' || rest === 'three.core.js' ? `build/${rest}` : `examples/jsm/${rest.slice('addons/'.length)}`;
  if (!existsSync(THREE)) { res.writeHead(302, {location: `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/${file}`}).end(); return; }
  res.writeHead(200, {'content-type': TYPES['.js'], 'cache-control': 'no-cache'}).end(await readFile(path.join(THREE, file)));
}

async function sendFile(req: IncomingMessage, res: ServerResponse, full: string) {
  const s = await stat(full), tag = `"${s.size}-${Math.round(s.mtimeMs)}"`;
  if (req.headers['if-none-match'] === tag) { res.writeHead(304, {etag: tag}).end(); return; }
  res.writeHead(200, {'content-type': TYPES[path.extname(full).toLowerCase()] ?? 'application/octet-stream', 'content-length': s.size, etag: tag, 'cache-control': 'no-cache'});
  createReadStream(full).pipe(res);
}

let demoCache: Promise<unknown> | null = null;
const server = createServer(async (req, res) => {
  try {
    if (!ownHost(req)) { res.writeHead(403).end('bara 127.0.0.1'); return; }
    const url = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    if (url === '/' + CUTS && req.method === 'PUT') { if (!sameOrigin(req)) { res.writeHead(403).end('fel ursprung'); return; } await saveCuts(req, res); return; }
    if (req.method !== 'GET') { res.writeHead(405).end('bara GET'); return; }
    if (url === '/favicon.ico') { res.writeHead(204).end(); return; }
    if (url === '/' || url === '/kortspelspaket/visa') { res.writeHead(302, {location: '/' + HERE}).end(); return; }
    if (url === '/vem') { res.writeHead(200, {'content-type': 'text/plain; charset=utf-8'}).end('kortspelspaketets visare'); return; }
    if (url === '/' + HERE || url === `/${HERE}index.html`) { res.writeHead(200, {'content-type': TYPES['.html'], 'cache-control': 'no-store'}).end(await readFile(path.join(ROOT, HERE, 'index.html'), 'utf8')); return; }
    let m = url.match(new RegExp(`^/${HERE}(visa|bord)\\.ts$`));
    if (m) { await typed(res, `${HERE}${m[1]}.ts`); return; }
    // Det som inte har sparats ännu är inget fel: inga sekvenser.
    if (url === '/' + CUTS) { res.writeHead(200, {'content-type': TYPES['.json'], 'cache-control': 'no-store'}).end(await readFile(path.join(ROOT, CUTS), 'utf8').catch(() => '{}')); return; }
    // Bordsvyns lån: spelets mått och rum (kod, med typerna strukna), kortplanen och de byggda modellerna.
    m = url.match(/^\/blackjack-dealer\/(src\/table-lens|dealer3d\/src\/[a-z0-9-]+)\.ts$/);
    if (m) { await typed(res, `blackjack-dealer/${m[1]}.ts`); return; }
    if (url === '/' + PLAN) { res.writeHead(200, {'content-type': TYPES['.json'], 'cache-control': 'no-store'}).end(await readFile(path.join(ROOT, PLAN), 'utf8')); return; }
    if (MODELS.includes(url.slice(1))) { await sendFile(req, res, path.join(ROOT, url.slice(1))); return; }
    if (url === '/demo.json') {
      if (!existsSync(ASSETS)) { res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'}).end('Paketet är inte uppackat: kör node kortspelspaket/packa-upp.ts'); return; }
      demoCache ??= demo();
      res.writeHead(200, {'content-type': TYPES['.json'], 'cache-control': 'no-store'}).end(JSON.stringify(await demoCache)); return;
    }
    m = url.match(/^\/vendor\/(three\.(?:module|core)\.js|addons\/[A-Za-z0-9_\-/.]+\.js)$/); // tilläggens egna importer har punkter i namnen (libs/fflate.module.js)
    if (m && !m[1].includes('..')) { await vendor(res, m[1]); return; }
    // Bara figuren, dess texturer och animationerna, och inget utanför Assets/.
    m = url.match(/^\/paket\/((?:[A-Za-z0-9_\- ]+\/)*[A-Za-z0-9_\- .]+\.(?:fbx|png))$/i);
    if (m && !m[1].split('/').includes('..')) { await sendFile(req, res, path.join(ASSETS, ...m[1].split('/'))); return; }
    res.writeHead(404).end('lämnas inte ut');
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500;
    if (!res.headersSent) res.writeHead(code, {'content-type': 'text/plain; charset=utf-8'}); res.end(code === 404 ? 'finns inte' : String(e));
  }
});

const address = `http://127.0.0.1:${PORT}/${HERE}`;
const openPage = () => {
  if (!OPEN) return;
  const [program, args] = process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', address]] : process.platform === 'darwin' ? ['open', [address]] : ['xdg-open', [address]];
  spawn(program as string, args as string[], {stdio: 'ignore', detached: true, windowsHide: true}).on('error', () => console.log(`Öppna ${address} i webbläsaren.`)).unref();
};
server.on('error', async (e: NodeJS.ErrnoException) => {
  if (e.code === 'EADDRINUSE') {
    const ours = await fetch(`http://127.0.0.1:${PORT}/vem`, {signal: AbortSignal.timeout(1500)}).then(r => r.text()).catch(() => '');
    if (ours === 'kortspelspaketets visare') { console.log(`Visaren är redan igång: ${address}`); openPage(); process.exit(0); }
    console.error(`Porten ${PORT} används redan av något annat. Starta med --port och ett annat tal.`); process.exit(1);
  }
  console.error(e); process.exit(1);
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Kortspelspaketets visare är igång: ${address}`);
  console.log('Stäng det här fönstret (eller tryck Ctrl+C) för att stänga visaren.');
  openPage();
});
