// The studio as the entry to the whole casino repo (Jakob 2026-11-27: "centralstyra de olika delprojekten ... servrar som
// behövs startas smartare"): the routes of tools/preview.ts that reach the folders beside blackjack-dealer.
//   GET  /api/verkstader          the workshops with servers of their own, and whether each answers
//   POST /api/verkstader/<id>     starts that workshop's server if it does not answer yet, and waits until it does
//   GET  /api/matt                every measure, as `node matt.ts --json` writes them now (the same source as MATT.md)
//   GET  /api/vagar               avatar-auto-pipeline/vagar.json, and what lies on disk for each person in input/ and output/
// A workshop is started the first time the studio's page for it is opened, as a child of this server, without a window,
// and stopped with it (stopWorkshops). One that already answers (started by its own start file, or by another chat) is
// left alone and never started twice: its server answers /vem with its own name. Nothing here costs money or writes.
import {spawn, type ChildProcess} from 'node:child_process';
import {readdir, readFile, stat} from 'node:fs/promises';
import type {IncomingMessage, ServerResponse} from 'node:http';
import path from 'node:path';

/** The casino folder, found from this file's own place (blackjack-dealer/tools/): no machine's path. */
export const CASINO = path.resolve(import.meta.dirname, '../..');

export type Workshop = {
  id: string;
  /** The workshop's name in the studio. */
  name: string;
  /** Its folder in casino, its server script in that folder and the port and page the script serves. */
  dir: string; script: string; port: number; page: string;
  /** What the server answers on /vem: how a running server is known to be this one. */
  who: string;
};

export const WORKSHOPS: readonly Workshop[] = [
  {id: 'editorn', name: 'Dockans editor', dir: 'standarddocka', script: 'editor/server.ts', port: 4320, page: '/standarddocka/editor/', who: 'standarddockans editor'},
];

const started = new Map<string, ChildProcess>();
const address = (w: Workshop) => `http://127.0.0.1:${w.port}${w.page}`;

/** The name the server on the workshop's port answers with, '' when nothing answers. */
async function whoAnswers(w: Workshop): Promise<string> {
  try { const r = await fetch(`http://127.0.0.1:${w.port}/vem`, {signal: AbortSignal.timeout(1200)}); return r.ok ? (await r.text()).trim() : '?'; }
  catch { return ''; }
}

export type WorkshopState = {id: string; name: string; address: string; answers: boolean; ours: boolean; error: string | null};
async function state(w: Workshop, error: string | null = null): Promise<WorkshopState> {
  const who = await whoAnswers(w), child = started.get(w.id);
  const busy = who !== '' && who !== w.who ? `Porten ${w.port} används av något annat än ${w.name.toLowerCase()}.` : null;
  return {id: w.id, name: w.name, address: address(w), answers: who === w.who, ours: !!child && child.exitCode === null, error: error ?? busy};
}

/** Starts the workshop's server unless it answers already, and waits up to 20 seconds for it to answer. */
async function ensure(w: Workshop): Promise<WorkshopState> {
  if (await whoAnswers(w)) return state(w); // it answers already: this workshop, or something else on its port (state says which)
  const running = started.get(w.id);
  if (!running || running.exitCode !== null) {
    // A child of this server, without a window: it stops with the studio (stopWorkshops) and does not keep it running.
    const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', w.script], {cwd: path.join(CASINO, w.dir), stdio: 'ignore', windowsHide: true});
    child.on('error', () => {}); child.unref(); started.set(w.id, child);
  }
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 250));
    if (await whoAnswers(w) === w.who) return state(w);
    if (started.get(w.id)?.exitCode !== null) break;
  }
  return state(w, `${w.name} startade inte.`);
}

/** Stops the workshop servers this server started (the others are not its own). */
export function stopWorkshops() {
  for (const child of started.values()) if (child.exitCode === null) child.kill();
  started.clear();
}

/** `node matt.ts --json` from the casino root: the measures as the code has them right now. */
function measures(): Promise<{status: number; body: string}> {
  return new Promise(done => {
    const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'matt.ts', '--json'], {cwd: CASINO, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true});
    const out: Buffer[] = []; let err = '';
    const timer = setTimeout(() => child.kill(), 60_000);
    child.stdout.on('data', (b: Buffer) => out.push(b)); child.stderr.on('data', (b: Buffer) => { err += b.toString('utf8'); });
    child.on('error', e => { clearTimeout(timer); done({status: 500, body: JSON.stringify({error: e.message})}); });
    // The last line only: the JSON is one line, and nothing a module says on the way can spoil it.
    child.on('exit', code => { clearTimeout(timer); done(code === 0 ? {status: 200, body: Buffer.concat(out).toString('utf8').trim().split('\n').pop() ?? '{}'} : {status: 500, body: JSON.stringify({error: err.trim().split('\n').slice(-3).join(' ') || `matt.ts slutade med kod ${code}`})}); });
  });
}

const AVATAR = path.join(CASINO, 'avatar-auto-pipeline');
const NAME = /^[a-z0-9][a-z0-9-]*$/;
/** What lies on disk for one person: the number of pictures in input/<name>/ and, per step folder of output/<name>/, how many files it holds. */
async function person(name: string) {
  const pictures = (await readdir(path.join(AVATAR, 'input', name)).catch(() => [])).filter(f => /\.(?:jpe?g|png|webp)$/i.test(f)).length;
  const steps: Record<string, {files: number; names: string[]}> = {};
  for (const dir of await readdir(path.join(AVATAR, 'output', name), {withFileTypes: true}).catch(() => [])) {
    if (!dir.isDirectory() || !/^\d\d-/.test(dir.name)) continue;
    const names = (await readdir(path.join(AVATAR, 'output', name, dir.name), {recursive: true, withFileTypes: true}).catch(() => [])).filter(e => e.isFile()).map(e => path.relative(path.join(AVATAR, 'output', name, dir.name), path.join(e.parentPath, e.name)).replaceAll('\\', '/'));
    steps[dir.name] = {files: names.length, names: names.slice(0, 200)};
  }
  return {name, pictures, steps};
}
async function paths() {
  const vagar = JSON.parse(await readFile(path.join(AVATAR, 'vagar.json'), 'utf8'));
  const names = new Set<string>();
  for (const top of ['input', 'output']) for (const dir of await readdir(path.join(AVATAR, top), {withFileTypes: true}).catch(() => [])) if (dir.isDirectory() && NAME.test(dir.name)) names.add(dir.name);
  // The finished models the studio and the editor read (assets/docka, bord, stol): name and size, never the file itself.
  const models: {folder: string; name: string; bytes: number}[] = [];
  for (const folder of ['docka', 'bord', 'stol']) for (const f of await readdir(path.join(AVATAR, 'assets', folder)).catch(() => [])) if (f.endsWith('.glb')) models.push({folder, name: f, bytes: (await stat(path.join(AVATAR, 'assets', folder, f))).size});
  return {vagar, people: await Promise.all([...names].sort().map(person)), models};
}

const json = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'}).end(typeof body === 'string' ? body : JSON.stringify(body)); };

/** The casino routes; true when the address was one of them. */
export async function handleCasino(req: IncomingMessage, res: ServerResponse, url: URL, origin: string): Promise<boolean> {
  if (url.pathname === '/api/verkstader') {
    if (req.method !== 'GET') { res.writeHead(405).end(); return true; }
    json(res, 200, {workshops: await Promise.all(WORKSHOPS.map(w => state(w)))}); return true;
  }
  if (url.pathname.startsWith('/api/verkstader/')) {
    const w = WORKSHOPS.find(x => x.id === url.pathname.slice('/api/verkstader/'.length));
    if (!w) { json(res, 404, {error: 'Den verkstaden finns inte.'}); return true; }
    if (req.method === 'GET') { json(res, 200, await state(w)); return true; }
    if (req.method !== 'POST') { res.writeHead(405).end(); return true; }
    if (req.headers.origin !== origin) { json(res, 403, {error: 'Starta från studion på datorn.'}); return true; }
    json(res, 200, await ensure(w)); return true;
  }
  if (url.pathname === '/api/matt') {
    if (req.method !== 'GET') { res.writeHead(405).end(); return true; }
    const r = await measures(); json(res, r.status, r.body); return true;
  }
  if (url.pathname === '/api/vagar') {
    if (req.method !== 'GET') { res.writeHead(405).end(); return true; }
    try { json(res, 200, await paths()); } catch (e) { json(res, 500, {error: (e as Error).message}); }
    return true;
  }
  return false;
}
