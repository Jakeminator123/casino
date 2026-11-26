// Editorns egen lilla server: lämnar ut sidan, dess moduler och det den visar, bara till den här datorn (127.0.0.1).
//   node standarddocka/editor/server.ts [--port 4320] [--oppna]
//   --oppna   öppnar sidan i webbläsaren när servern är igång (det STARTA editorn.cmd gör); är en editor redan igång på
//             porten öppnas den i stället.
// Bara GET, utom PUT till standarddocka/rorelser/ (där Spara skriver) och POST till /inspelning/ (där Spela in skickar
// sina bilder; FFmpeg gör filmen av dem i standarddocka/klipp/). Det som lämnas ut har sökvägar som speglar
// casino-mappen (så att sidans relativa importer är desamma i webbläsaren och på disken), och varje namn kontrolleras
// mot en lista eller ett mönster: ingen sökväg utifrån kan peka ut ur mapparna. TypeScript lämnas ut med typerna
// strukna (som blackjack-dealer/dealer3d/tools/shoot.ts gör), three.js ur blackjack-dealer/node_modules.
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, rename, rm, stat, writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {spawn, type ChildProcessByStdio} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import type {Readable, Writable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const PORT = Number(arg('--port') ?? 4320), OPEN = process.argv.includes('--oppna');
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw Error('--port tar ett heltal 1–65535.');
const ROOT = fileURLToPath(new URL('../../', import.meta.url)); // casino-mappen, hittad från serverns egen plats
const HERE = 'standarddocka/editor/', SAVES = 'standarddocka/rorelser/', CLIPS = 'standarddocka/klipp/';
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const THREE = 'blackjack-dealer/node_modules/three/';

/** Fasta adresser: three.js och dess tillägg, modellerna och planen. */
const FIXED: Record<string, string> = {
  '/vendor/three.module.js': THREE + 'build/three.module.js',
  '/vendor/three.core.js': THREE + 'build/three.core.js',
  '/vendor/addons/loaders/GLTFLoader.js': THREE + 'examples/jsm/loaders/GLTFLoader.js',
  '/vendor/addons/utils/BufferGeometryUtils.js': THREE + 'examples/jsm/utils/BufferGeometryUtils.js',
  '/vendor/addons/controls/OrbitControls.js': THREE + 'examples/jsm/controls/OrbitControls.js',
  '/vendor/addons/controls/TransformControls.js': THREE + 'examples/jsm/controls/TransformControls.js',
  '/vendor/addons/environments/RoomEnvironment.js': THREE + 'examples/jsm/environments/RoomEnvironment.js',
  '/avatar-auto-pipeline/assets/docka/standarddocka_man.glb': 'avatar-auto-pipeline/assets/docka/standarddocka_man.glb',
  '/avatar-auto-pipeline/assets/bord/standardbord_nara.glb': 'avatar-auto-pipeline/assets/bord/standardbord_nara.glb',
  '/avatar-auto-pipeline/assets/stol/dealerstol.glb': 'avatar-auto-pipeline/assets/stol/dealerstol.glb',
  '/blackjack-dealer/placements/default.json': 'blackjack-dealer/placements/default.json',
  '/blackjack-dealer/src/table-lens.ts': 'blackjack-dealer/src/table-lens.ts',
};
const NAME = '[a-z0-9][a-z0-9-]*';
/** Mönstren: sidans egna filer, dockans moduler (blackjack-dealer/dealer3d/src), grundrörelserna (dealer3d/data, bara att läsa) och det som sparats i rorelser/. */
function fileFor(url: string): string | null {
  if (FIXED[url]) return FIXED[url];
  if (url === '/' + HERE || url === `/${HERE}index.html`) return HERE + 'index.html';
  let m = url.match(new RegExp(`^/${HERE}(${NAME})\\.ts$`, 'i')); if (m && m[1] !== 'server') return `${HERE}${m[1]}.ts`;
  m = url.match(/^\/blackjack-dealer\/dealer3d\/src\/([a-z0-9-]+)\.ts$/i); if (m) return `blackjack-dealer/dealer3d/src/${m[1]}.ts`;
  m = url.match(new RegExp(`^/blackjack-dealer/dealer3d/data/(${NAME})\\.json$`)); if (m) return `blackjack-dealer/dealer3d/data/${m[1]}.json`;
  m = url.match(new RegExp(`^/${SAVES}(${NAME}(?:\\.rutor)?)\\.json$`)); if (m) return `${SAVES}${m[1]}.json`;
  return null;
}
const TYPES: Record<string, string> = {'.html': 'text/html; charset=utf-8', '.ts': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.glb': 'model/gltf-binary'};
const MOST = 30 * 1024 * 1024; // det största Spara skickar (hela den ändrade rörelsen är några hundra kB)

/** Bara den här datorns adress, så att en annan sida i webbläsaren inte kan tala med servern genom ett annat namn. */
const ownHost = (req: IncomingMessage) => [`127.0.0.1:${PORT}`, `localhost:${PORT}`].includes(req.headers.host ?? '');
const sameOrigin = (req: IncomingMessage) => !req.headers.origin || [`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`].includes(req.headers.origin);

async function send(req: IncomingMessage, res: ServerResponse, file: string) {
  const full = path.join(ROOT, file), ext = path.extname(file);
  if (ext === '.glb') {
    // Modellerna är stora (bordet 35 MB): webbläsaren får behålla dem och frågar bara om de har ändrats.
    const s = await stat(full), tag = `"${s.size}-${Math.round(s.mtimeMs)}"`;
    if (req.headers['if-none-match'] === tag) { res.writeHead(304, {etag: tag}).end(); return; }
    res.writeHead(200, {'content-type': TYPES[ext], 'content-length': s.size, etag: tag, 'cache-control': 'no-cache'});
    createReadStream(full).pipe(res); return;
  }
  const body = await readFile(full, 'utf8');
  res.writeHead(200, {'content-type': TYPES[ext] ?? 'application/octet-stream', 'cache-control': 'no-store'}).end(ext === '.ts' ? stripTypeScriptTypes(body) : body);
}

/** Det som skickades med, eller null (och svaret 413) om det är större än MOST. */
async function body(req: IncomingMessage, res: ServerResponse): Promise<Buffer | null> {
  const parts: Buffer[] = []; let size = 0;
  for await (const chunk of req) { size += (chunk as Buffer).length; if (size > MOST) { res.writeHead(413).end('för stor'); return null; } parts.push(chunk as Buffer); }
  return Buffer.concat(parts);
}

/** PUT till rorelser/: giltig JSON, skrivs hel till en tillfällig fil och byter sedan namn, så att en halv fil aldrig blir kvar. */
async function save(req: IncomingMessage, res: ServerResponse, file: string) {
  const sent = await body(req, res); if (!sent) return;
  const text = sent.toString('utf8');
  try { JSON.parse(text); } catch { res.writeHead(400).end('inte JSON'); return; }
  const full = path.join(ROOT, file), temp = `${full}.${process.pid}.tmp`;
  await mkdir(path.dirname(full), {recursive: true}); await writeFile(temp, text.endsWith('\n') ? text : text + '\n', 'utf8'); await rename(temp, full);
  res.writeHead(200, {'content-type': 'application/json; charset=utf-8'}).end(JSON.stringify({sparad: file, bytes: Buffer.byteLength(text)}));
}

// ---- inspelningen ------------------------------------------------------------------------------------------------
// Sidan ritar rörelsen bild för bild och skickar varje bild som PNG; FFmpeg tar emot dem i tur och ordning och gör en
// film (H.264, som de flesta program läser) i standarddocka/klipp/<namn>.mp4. Filmen skrivs under ett tillfälligt namn
// och byter namn när den är hel; en ny inspelning med samma namn skriver över den förra.
//   POST /inspelning/start {namn, fps} → {id}    POST /inspelning/<id>/ruta (PNG)    POST /inspelning/<id>/klar | avbryt
type Recording = {child: ChildProcessByStdio<Writable, null, Readable>; file: string; temp: string; frames: number; error: string; closed: Promise<number>};
const recordings = new Map<string, Recording>();
async function record(req: IncomingMessage, res: ServerResponse, id: string, step: string | undefined) {
  const json = (code: number, data: unknown) => { res.writeHead(code, {'content-type': 'application/json; charset=utf-8'}).end(JSON.stringify(data)); };
  if (id === 'start' && !step) {
    const sent = await body(req, res); if (!sent) return;
    let ask: {namn?: unknown; fps?: unknown}; try { ask = JSON.parse(sent.toString('utf8')); } catch { res.writeHead(400).end('inte JSON'); return; }
    const fps = Number(ask.fps);
    if (typeof ask.namn !== 'string' || !new RegExp(`^${NAME}$`).test(ask.namn) || ask.namn.length > 120 || !(fps >= 1 && fps <= 120)) { res.writeHead(400).end('namn eller fps saknas'); return; }
    const file = `${CLIPS}${ask.namn}.mp4`, full = path.join(ROOT, file), temp = `${full}.${process.pid}.tmp`;
    await mkdir(path.dirname(full), {recursive: true});
    // Färgerna märks som BT.709 och räknas om dit, så att filmen ser ut som bilden i webbläsaren.
    const child = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-movflags', '+faststart', '-f', 'mp4', temp], {stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true});
    const r: Recording = {child, file, temp, frames: 0, error: '', closed: new Promise<number>(resolve => {
      child.on('error', e => { r.error += (e as NodeJS.ErrnoException).code === 'ENOENT' ? 'FFmpeg hittades inte på datorn (det behövs för att göra filmen).' : String(e); resolve(-1); });
      child.on('close', code => resolve(code ?? -1)); })};
    child.stderr.on('data', d => { r.error += String(d); }); child.stdin.on('error', () => {}); // ett avbrutet FFmpeg stänger sin ingång; felet kommer med dess slut
    const key = randomBytes(5).toString('hex'); recordings.set(key, r); json(200, {id: key, fil: file}); return;
  }
  const r = recordings.get(id);
  if (!r) { res.writeHead(404).end('ingen sådan inspelning'); return; }
  const full = path.join(ROOT, r.file);
  const stop = async (why: string) => { recordings.delete(id); r.child.kill(); await r.closed; await rm(r.temp, {force: true}); res.writeHead(500, {'content-type': 'text/plain; charset=utf-8'}).end(why); };
  if (step === 'ruta') {
    const png = await body(req, res); if (!png) return;
    if (r.child.exitCode !== null || r.error) { await stop(r.error.trim() || 'FFmpeg stannade.'); return; }
    if (!r.child.stdin.write(png)) await Promise.race([once(r.child.stdin, 'drain'), r.closed]);
    r.frames++; json(200, {rutor: r.frames}); return;
  }
  if (step === 'klar') {
    r.child.stdin.end(); const code = await r.closed;
    if (code !== 0 || !r.frames) { await stop(r.error.trim() || `FFmpeg slutade med ${code}.`); return; }
    recordings.delete(id); await rename(r.temp, full); json(200, {fil: r.file, rutor: r.frames, bytes: (await stat(full)).size}); return;
  }
  if (step === 'avbryt') { recordings.delete(id); r.child.kill(); await r.closed; await rm(r.temp, {force: true}); json(200, {avbruten: true}); return; }
  res.writeHead(404).end('finns inte');
}

const server = createServer(async (req, res) => {
  try {
    if (!ownHost(req)) { res.writeHead(403).end('bara 127.0.0.1'); return; }
    const url = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    const rec = url.match(/^\/inspelning\/([a-z0-9]+)(?:\/(ruta|klar|avbryt))?$/);
    if (rec) { if (req.method !== 'POST') { res.writeHead(405).end('bara POST'); return; } if (!sameOrigin(req)) { res.writeHead(403).end('fel ursprung'); return; } await record(req, res, rec[1], rec[2]); return; }
    if (url === '/favicon.ico') { res.writeHead(204).end(); return; }
    if (url === '/' || url === '/standarddocka/editor') { res.writeHead(302, {location: '/' + HERE}).end(); return; }
    if (url === '/vem') { res.writeHead(200, {'content-type': 'text/plain; charset=utf-8'}).end('standarddockans editor'); return; }
    const file = fileFor(url);
    if (!file) { res.writeHead(404).end('lämnas inte ut'); return; }
    if (req.method === 'PUT' && file.startsWith(SAVES)) { if (!sameOrigin(req)) { res.writeHead(403).end('fel ursprung'); return; } await save(req, res, file); return; }
    if (req.method !== 'GET') { res.writeHead(405).end('bara GET'); return; }
    // Det som inte har sparats ännu är inget fel: tomt svar (sidan börjar då utan ändringar).
    if (file.startsWith(SAVES) && !(await stat(path.join(ROOT, file)).then(() => true, () => false))) { res.writeHead(204, {'cache-control': 'no-store'}).end(); return; }
    await send(req, res, file);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500;
    if (!res.headersSent) res.writeHead(code, {'content-type': 'text/plain; charset=utf-8'}); res.end(code === 404 ? 'finns inte' : String(e));
  }
});

const address = `http://127.0.0.1:${PORT}/${HERE}`;
/** Öppnar sidan i datorns vanliga webbläsare. */
const openPage = () => {
  if (!OPEN) return;
  const [program, args] = process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', address]] : process.platform === 'darwin' ? ['open', [address]] : ['xdg-open', [address]];
  spawn(program as string, args as string[], {stdio: 'ignore', detached: true, windowsHide: true}).on('error', () => console.log(`Öppna ${address} i webbläsaren.`)).unref();
};
server.on('error', async (e: NodeJS.ErrnoException) => {
  if (e.code === 'EADDRINUSE') {
    const ours = await fetch(`http://127.0.0.1:${PORT}/vem`, {signal: AbortSignal.timeout(1500)}).then(r => r.text()).catch(() => '');
    if (ours === 'standarddockans editor') { console.log(`Editorn är redan igång: ${address}`); openPage(); process.exit(0); }
    console.error(`Porten ${PORT} används redan av något annat. Starta med --port och ett annat tal.`); process.exit(1);
  }
  console.error(e); process.exit(1);
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Editorn för standarddockan är igång: ${address}`);
  console.log('Stäng det här fönstret (eller tryck Ctrl+C) för att stänga editorn.');
  openPage();
});
