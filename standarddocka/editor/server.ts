// Editorns egen lilla server: lämnar ut sidan, dess moduler och det den visar, bara till den här datorn (127.0.0.1).
//   node standarddocka/editor/server.ts [--port 4320] [--oppna]
//   --oppna   öppnar sidan i webbläsaren när servern är igång (det STARTA editorn.cmd gör); är en editor redan igång på
//             porten öppnas den i stället.
// Bara GET, utom PUT till standarddocka/rorelser/ (där Spara skriver). Det som lämnas ut har sökvägar som speglar
// casino-mappen (så att sidans relativa importer är desamma i webbläsaren och på disken), och varje namn kontrolleras
// mot en lista eller ett mönster: ingen sökväg utifrån kan peka ut ur mapparna. TypeScript lämnas ut med typerna
// strukna (som blackjack-dealer/dealer3d/tools/shoot.ts gör), three.js ur blackjack-dealer/node_modules.
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, rename, stat, writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const PORT = Number(arg('--port') ?? 4320), OPEN = process.argv.includes('--oppna');
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw Error('--port tar ett heltal 1–65535.');
const ROOT = fileURLToPath(new URL('../../', import.meta.url)); // casino-mappen, hittad från serverns egen plats
const HERE = 'standarddocka/editor/', SAVES = 'standarddocka/rorelser/';
const THREE = 'blackjack-dealer/node_modules/three/';

/** Fasta adresser: three.js och dess tillägg, modellerna, grundrörelserna och planen. */
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
  '/blackjack-dealer/dealer3d/data/till-ankare-2-3-c.json': 'blackjack-dealer/dealer3d/data/till-ankare-2-3-c.json',
  '/blackjack-dealer/dealer3d/data/giv-fran-2-3-p4c1-naturlig-cykel-a-paow.json': 'blackjack-dealer/dealer3d/data/giv-fran-2-3-p4c1-naturlig-cykel-a-paow.json',
  '/blackjack-dealer/placements/default.json': 'blackjack-dealer/placements/default.json',
  '/blackjack-dealer/src/table-lens.ts': 'blackjack-dealer/src/table-lens.ts',
};
const NAME = '[a-z0-9][a-z0-9-]*';
/** Mönstren: sidans egna filer, dockans moduler (blackjack-dealer/dealer3d/src) och det som sparats i rorelser/. */
function fileFor(url: string): string | null {
  if (FIXED[url]) return FIXED[url];
  if (url === '/' + HERE || url === `/${HERE}index.html`) return HERE + 'index.html';
  let m = url.match(new RegExp(`^/${HERE}(${NAME})\\.ts$`, 'i')); if (m && m[1] !== 'server') return `${HERE}${m[1]}.ts`;
  m = url.match(/^\/blackjack-dealer\/dealer3d\/src\/([a-z0-9-]+)\.ts$/i); if (m) return `blackjack-dealer/dealer3d/src/${m[1]}.ts`;
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

/** PUT till rorelser/: giltig JSON, skrivs hel till en tillfällig fil och byter sedan namn, så att en halv fil aldrig blir kvar. */
async function save(req: IncomingMessage, res: ServerResponse, file: string) {
  const parts: Buffer[] = []; let size = 0;
  for await (const chunk of req) { size += (chunk as Buffer).length; if (size > MOST) { res.writeHead(413).end('för stor'); return; } parts.push(chunk as Buffer); }
  const text = Buffer.concat(parts).toString('utf8');
  try { JSON.parse(text); } catch { res.writeHead(400).end('inte JSON'); return; }
  const full = path.join(ROOT, file), temp = `${full}.${process.pid}.tmp`;
  await mkdir(path.dirname(full), {recursive: true}); await writeFile(temp, text.endsWith('\n') ? text : text + '\n', 'utf8'); await rename(temp, full);
  res.writeHead(200, {'content-type': 'application/json; charset=utf-8'}).end(JSON.stringify({sparad: file, bytes: Buffer.byteLength(text)}));
}

const server = createServer(async (req, res) => {
  try {
    if (!ownHost(req)) { res.writeHead(403).end('bara 127.0.0.1'); return; }
    const url = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
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
