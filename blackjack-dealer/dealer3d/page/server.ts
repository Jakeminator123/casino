// The lab server's routes for the doll lab (dealer3d/page/docka.html). The server calls handleDollLab(req, res, url)
// before its own routes (tools/preview.ts); it answers true when the request was one of these.
//   GET /dealer3d/docka                    the page
//   GET /dealer3d/page/<name>.ts           the page's modules, and
//   GET /dealer3d/src/<name>.ts            the 3D lane's, and
//   GET /src/table-lens.ts                 the lens they rest on: each with its types taken off, under its own name (the
//                                          modules name their neighbours with .ts, as Node needs them)
//   GET /dealer3d/data/<name>.json         a motion of dealer3d/data/
//   GET /dealer3d/data                     the names of those motions ({names}), so that the page finds the standard
//                                          doll's own motions without asking for each
//   GET /dealer3d/plan                     Jakob's card plan (placements/default.json), read only
//   GET /dealer3d/figur/<kvinna|man>.glb   the standard doll's model as avatar-auto-pipeline builds it
//                                          (../avatar-auto-pipeline/assets/docka/, local media: 404 where it is not built,
//                                          and the page then draws the white figure)
//   GET /dealer3d/figur/<bord|stol>.glb    the standard room's table (its dealer's edge 15 cm nearer her) and stool
//                                          (assets/bord/standardbord_nara.glb, assets/stol/dealerstol.glb; 404 where they
//                                          are not built, and the page then draws the stage's own room)
//   GET /dealer3d/figur/bord23.glb         the table for the standard doll's own motions: its edge and tray 23 cm behind the
//                                          game's edge, the shoe, cards and places where they were
//                                          (assets/bord/standardbord_nara23.glb; the page takes it for the man and the woman,
//                                          as the editor of standarddocka/ does, and the older table where it is not built)
//   GET /dealer3d/standard                 the saved standards: name, doll, entry, place and when each was saved (`lab.savedAt`,
//                                          the file's time where it has none); the one before each (`forra`) and what has
//                                          been laid aside (`undanlagda`: the folders, each with its names)
//   GET /dealer3d/standard/<name>.json     one saved standard
//   PUT /dealer3d/standard/<name>.json     save one: "Spara som standard" on the page; the one it replaces goes to forra/ first
//   POST /dealer3d/standard/aterstall      {doll} or {name}: those standards laid aside, so that the default holds there
//   POST /dealer3d/standard/tillbaka       {name}: the place as it was before (its standard and the one before change places,
//                                          the default standing for the one that is not there);
//                                          {from, name?}: one, or all, of a folder laid aside taken back
// A standard is a motion in the form of dealer3d/data/*.json for one doll, one entry and one place, named <doll>-<place>
// from A2.3 (paow-p6c1, standard-dc1; every standard saved before the entries) and <doll>-a2-1-<place> from A2.1
// (paow-a2-1-p4c1), so that `node dealer3d/tools/render-reference.ts --motion dealer3d/standard/<name>.json`
// films exactly what was saved. The write is narrow: only into dealer3d/standard/, only a name of that pattern, only from
// the lab's own origin, only JSON of a motion's shape that names the same doll, entry (`lab.from`, A2.3 if left out) and place as its name, at most 1.5 MB;
// written beside the target and renamed over it. Nothing else under the repo is written by these routes.
// Nothing he has saved is lost (Jakob 2026-11-26: "en knapp ... som är lite mer förlåtande om man råkat spara över
// originalet"), and nothing here deletes a file: a standard that is replaced or laid aside is moved, never removed.
// - forra/<name>.json is the one before, one per place: a save moves the standard it replaces there (the one that was
//   there before that is let go: one step back per place), and "tillbaka" lets the two change places (the default, no
//   file, standing for the one that is not there), so that taking back can itself be taken back.
// - undanlagda/<when>/ is what one "aterstall" laid aside, kept whole: each standard as it was, and in forra/ the one
//   before it where there was one. Each standard laid aside also becomes its place's one before (forra/), so that
//   "tillbaka" brings it back place by place; "tillbaka" with `from` takes any of the folder back, as a save would.
// Imports nothing of dealer3d/src/, so that a module half way through a change there cannot stop the lab server.
import {constants} from 'node:fs';
import {copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import path from 'node:path';
import type {IncomingMessage, ServerResponse} from 'node:http';

/** The models handed out under /dealer3d/figur/, as avatar-auto-pipeline builds them (under its assets/). */
const MODELS: Record<string, string> = {kvinna: 'docka/standarddocka_kvinna.glb', man: 'docka/standarddocka_man.glb', bord: 'bord/standardbord_nara.glb', bord23: 'bord/standardbord_nara23.glb', stol: 'stol/dealerstol.glb'};
export const STANDARDS = 'dealer3d/standard';
/** Under STANDARDS: the one before each standard, and the folders of what has been laid aside. */
export const BEFORE = 'forra', ASIDE = 'undanlagda';
const BODY_LIMIT = 1_500_000, ASK_LIMIT = 2_000, MOST_FRAMES = 900;
const NAME = /^([a-z][a-z0-9]{1,15})-(?:a2-(1)-)?(p[1-7]c[12]|dc[123])$/, DOLL = /^[a-z][a-z0-9]{1,15}$/;
/** A folder of undanlagda/: the local time it was laid aside (2026-11-26-041530), a number after it where two fell in one second. */
const WHEN = /^\d{4}-\d{2}-\d{2}-\d{6}(?:-\d{1,2})?$/;
const whenOf = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
// A motion's own fields (dealer3d/tools/deal-film.ts and doll-pose.ts write these), and `lab`: what the page laid it from.
const KEYS = new Set(['about', 'film', 'pose', 'poseFilm', 'places', 'pace', 'rightAt', 'to', 'loose', 'fps', 'frameCount', 'leavesShoe', 'edge', 'folds', 'rests', 'handSize', 'palm', 'throughShoe', 'elbowForced', 'hip', 'beats', 'turns', 'laid', 'frames', 'doll', 'lab']);
class Refused extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }

/** The plan's name of a place from a standard's: p6c1 is P6.C1, dc3 is D.C3. */
export const placeOf = (short: string) => short.startsWith('d') ? `D.C${short[2]}` : `P${short[1]}.C${short[3]}`;
/** The entry a standard's name says its deal begins in: A2.1 where the name has a2-1, else A2.3. */
const entryOf = (m: RegExpExecArray) => `A2.${m[2] ?? 3}`;
const vec = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every(x => typeof x === 'number' && Number.isFinite(x));
const limb = (l: unknown) => { const a = l as {s?: unknown; e?: unknown; w?: unknown; p?: unknown} | null; return !!a && typeof a === 'object' && vec(a.s) && vec(a.e) && vec(a.w) && Array.isArray(a.p) && a.p.length === 21 && a.p.every(vec); };
/** Says what is wrong with a standard that is to be saved under `name`, or null: a motion's shape, and the doll, entry and place its name says. */
export function faultOf(name: string, value: unknown): string | null {
  const m = NAME.exec(name); if (!m) return 'Namnet är inte en docka och en plats.';
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Rörelsen är inte ett objekt.';
  const v = value as Record<string, unknown>, strange = Object.keys(v).find(k => !KEYS.has(k)); if (strange) return `Okänt fält: ${strange.slice(0, 40)}.`;
  if (v.doll !== m[1]) return 'Rörelsen är för en annan docka än namnet säger.';
  if (!Array.isArray(v.to) || v.to.length !== 1 || v.to[0] !== placeOf(m[3])) return 'Rörelsen går till en annan plats än namnet säger.';
  if (((v.lab as {from?: unknown} | null)?.from ?? 'A2.3') !== entryOf(m)) return 'Rörelsen börjar i en annan ställning än namnet säger.';
  if (typeof v.fps !== 'number' || !(v.fps > 0 && v.fps <= 120)) return 'Rörelsen saknar rutor per sekund.';
  if (!Array.isArray(v.frames) || !Number.isInteger(v.frameCount) || v.frameCount !== v.frames.length || v.frames.length < 2 || v.frames.length > MOST_FRAMES) return 'Antalet rutor stämmer inte.';
  if (!vec(v.hip)) return 'Rörelsen saknar höft.';
  for (const key of ['leavesShoe', 'folds', 'rests'] as const) if (typeof v[key] !== 'number' || !Number.isFinite(v[key])) return `Rörelsen saknar ${key}.`;
  if (!Array.isArray(v.edge) || v.edge.length !== 2 || !v.edge.every(x => typeof x === 'number' && Number.isFinite(x))) return 'Rörelsen saknar edge.';
  const bad = v.frames.findIndex(f => { const a = f as {card?: {c?: unknown; l?: unknown; n?: unknown}; L?: unknown; R?: unknown; h?: unknown; g?: unknown} | null;
    return !a || typeof a !== 'object' || !a.card || !vec(a.card.c) || !vec(a.card.l) || !vec(a.card.n) || !limb(a.L) || !limb(a.R) || !vec(a.h) || (a.g !== undefined && !vec(a.g)); });
  return bad < 0 ? null : `Ruta ${bad} är inte en hel ruta.`;
}

export function dollLabRoutes(options: {root: string; origin: string}) {
  const {root, origin} = options, folder = path.join(root, STANDARDS);
  const send = (res: ServerResponse, status: number, type: string, body: string | Buffer) => { res.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-store'}).end(body); };
  const json = (res: ServerResponse, status: number, value: unknown) => send(res, status, 'application/json; charset=utf-8', JSON.stringify(value));
  const file = async (res: ServerResponse, relative: string, type: string, change: (text: string) => string = t => t) => {
    const text = await readFile(path.join(root, relative), 'utf8').catch(() => null);
    if (text === null) send(res, 404, 'text/plain; charset=utf-8', 'Finns inte.'); else send(res, 200, type, change(text.replace(/^﻿/, '')));
  };
  async function body(req: IncomingMessage, limit = BODY_LIMIT): Promise<unknown> {
    if (!req.headers['content-type']?.startsWith('application/json')) throw new Refused(415, 'JSON krävs.');
    if (Number(req.headers['content-length'] ?? 0) > limit) throw new Refused(413, 'Rörelsen är för stor.');
    let size = 0; const chunks: Buffer[] = [];
    for await (const chunk of req) { size += chunk.length; if (size > limit) throw new Refused(413, 'Rörelsen är för stor.'); chunks.push(chunk); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Refused(400, 'Rörelsen är inte giltig JSON.'); }
  }
  const before = path.join(folder, BEFORE), aside = path.join(folder, ASIDE);
  const current = (name: string) => path.join(folder, `${name}.json`), beforeOf = (name: string) => path.join(before, `${name}.json`);
  const exists = (file: string) => stat(file).then(s => s.isFile(), () => false);
  const namesIn = async (dir: string) => (await readdir(dir).catch(() => [] as string[])).filter(n => n.endsWith('.json') && NAME.test(n.slice(0, -5))).map(n => n.slice(0, -5)).sort();
  /** When a standard was saved: the time the page wrote in it (`lab.savedAt`, its last), else the file's. */
  async function savedAt(file: string) {
    const said = [...(await readFile(file, 'utf8')).matchAll(/"savedAt":"([^"]{10,40})"/g)].at(-1)?.[1];
    return said && !Number.isNaN(Date.parse(said)) ? new Date(said).toISOString() : (await stat(file)).mtime.toISOString();
  }
  const described = (dir: string) => async (name: string) => { const m = NAME.exec(name)!; return {name, doll: m[1], from: entryOf(m), place: placeOf(m[3]), savedAt: await savedAt(path.join(dir, `${name}.json`))}; };
  /** The saved standards, the one before each, and what has been laid aside: GET /dealer3d/standard, and beside every change's answer. */
  async function list() {
    const whens = (await readdir(aside).catch(() => [] as string[])).filter(w => WHEN.test(w)).sort();
    return {standards: await Promise.all((await namesIn(folder)).map(described(folder))), forra: await Promise.all((await namesIn(before)).map(described(before))),
      undanlagda: await Promise.all(whens.map(async when => ({when, names: await namesIn(path.join(aside, when))})))};
  }
  let writes: Promise<unknown> = Promise.resolve(), serial = 0;
  /** One change at a time, in the order asked. */
  const inTurn = <T>(change: () => Promise<T>): Promise<T> => { const task = writes.then(change); writes = task.then(() => {}, () => {}); return task; };
  const tempOf = (name: string) => path.join(folder, `.${name}.${process.pid}.${++serial}.tmp`);
  /** The standard in its place moved to forra/, where there is one: the one before it there is let go (one step back per place). */
  async function keepBefore(name: string) { if (await exists(current(name))) { await mkdir(before, {recursive: true}); await rename(current(name), beforeOf(name)); } }
  async function save(name: string, value: unknown) {
    const fault = faultOf(name, value); if (fault) throw new Refused(400, fault);
    if (path.dirname(current(name)) !== folder) throw new Refused(400, 'Namnet är inte en docka och en plats.');
    const temp = tempOf(name);
    await mkdir(folder, {recursive: true});
    try { await writeFile(temp, JSON.stringify(value) + '\n', {flag: 'wx'}); await keepBefore(name); await rename(temp, current(name)); } finally { await rm(temp, {force: true}); }
  }
  /** Lays the standards `names` aside in a new folder of undanlagda/ (the head of this file), and answers its name. */
  async function layAside(names: string[]) {
    await mkdir(aside, {recursive: true});
    const first = whenOf(new Date()); let when = first;
    for (let k = 2; ; k++) { try { await mkdir(path.join(aside, when)); break; } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST' || k > 99) throw e; when = `${first}-${k}`; } }
    const dir = path.join(aside, when); await mkdir(before, {recursive: true});
    for (const name of names) {
      if (await exists(beforeOf(name))) { await mkdir(path.join(dir, BEFORE), {recursive: true}); await rename(beforeOf(name), path.join(dir, BEFORE, `${name}.json`)); }
      await copyFile(current(name), path.join(dir, `${name}.json`), constants.COPYFILE_EXCL);
      await rename(current(name), beforeOf(name));
    }
    return when;
  }
  /**
   * The place as it was before taken back: its standard and the one before change places. Where one of the two is not
   * there, the default is (no file), and the other goes from its place to the empty one: the one before comes back where
   * no standard is saved, and a standard with none before it is laid aside as the one before, so that the default holds
   * again. Each press undoes the one before it.
   */
  async function swapBack(name: string) {
    const has = await exists(current(name)), had = await exists(beforeOf(name));
    if (!has && !had) throw new Refused(404, 'Det finns ingen förra att ta tillbaka.');
    if (!had) { await mkdir(before, {recursive: true}); await rename(current(name), beforeOf(name)); return; }
    if (!has) { await rename(beforeOf(name), current(name)); return; }
    const swap = path.join(before, `.${name}.${process.pid}.${++serial}.byte`);
    await rename(current(name), swap); await rename(beforeOf(name), current(name)); await rename(swap, beforeOf(name));
  }
  /** One standard, or all, of a folder laid aside taken back as a save would: the one in its place to forra/. The folder keeps its copy. */
  async function takeFrom(when: string, only: string | null) {
    const dir = path.join(aside, when), names = only ? [only] : await namesIn(dir);
    if (!names.length) throw new Refused(404, 'Det finns inget undanlagt där.');
    for (const name of names) if (!await exists(path.join(dir, `${name}.json`))) throw new Refused(404, 'Den finns inte bland de undanlagda.');
    for (const name of names) { const temp = tempOf(name);
      try { await copyFile(path.join(dir, `${name}.json`), temp, constants.COPYFILE_EXCL); await keepBefore(name); await rename(temp, current(name)); } finally { await rm(temp, {force: true}); } }
    return names;
  }
  /** What POST /dealer3d/standard/aterstall and /tillbaka ask, read and done. */
  async function act(kind: 'aterstall' | 'tillbaka', ask: Record<string, unknown>) {
    const text = (k: string) => ask[k] === undefined ? null : typeof ask[k] === 'string' ? ask[k] as string : '';
    const name = text('name'), doll = text('doll'), from = text('from');
    if (name !== null && !NAME.test(name)) throw new Refused(400, 'Namnet är inte en docka och en plats.');
    if (kind === 'aterstall') {
      if ((name === null) === (doll === null) || from !== null) throw new Refused(400, 'Säg en docka (doll) eller en standard (name).');
      if (doll !== null && !DOLL.test(doll)) throw new Refused(400, 'Det är inte en docka.');
      const names = name !== null ? (await exists(current(name)) ? [name] : []) : (await namesIn(folder)).filter(n => NAME.exec(n)![1] === doll);
      if (!names.length) throw new Refused(404, 'Det finns ingen sparad standard att lägga undan.');
      return {undanlagt: {when: await layAside(names), names}};
    }
    if (doll !== null) throw new Refused(400, 'Säg en standard (name), eller en undanlagd mapp (from).');
    if (from !== null) { if (!WHEN.test(from)) throw new Refused(400, 'Det är ingen undanlagd mapp.'); return {tillbaka: await takeFrom(from, name), from}; }
    if (name === null) throw new Refused(400, 'Säg vilken standard (name).');
    await swapBack(name); return {tillbaka: [name]};
  }

  /** Answers true when the request was the doll lab's. */
  return async function handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
    const at = url.pathname, lab = at === '/dealer3d/docka' || at === '/dealer3d/plan' || at === '/src/table-lens.ts' || /^\/dealer3d\/(page|src|data|standard|figur)(\/|$)/.test(at);
    if (!lab) return false;
    try {
      const standard = /^\/dealer3d\/standard\/([^/]+)\.json$/.exec(at), change = /^\/dealer3d\/standard\/(aterstall|tillbaka)$/.exec(at);
      if (standard && req.method === 'PUT') {
        if (req.headers.origin !== origin) throw new Refused(403, 'Bara studions egen sida får spara.');
        if (!NAME.test(standard[1])) throw new Refused(400, 'Namnet är inte en docka och en plats.');
        const value = await body(req); await inTurn(() => save(standard[1], value));
        json(res, 200, {saved: `${STANDARDS}/${standard[1]}.json`, ...await list()}); return true;
      }
      if (change && req.method === 'POST') {
        if (req.headers.origin !== origin) throw new Refused(403, 'Bara studions egen sida får ändra standarderna.');
        const ask = await body(req, ASK_LIMIT); if (!ask || typeof ask !== 'object' || Array.isArray(ask)) throw new Refused(400, 'Frågan är inte ett objekt.');
        const done = await inTurn(() => act(change[1] as 'aterstall' | 'tillbaka', ask as Record<string, unknown>));
        json(res, 200, {...done, ...await list()}); return true;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') { req.resume(); res.writeHead(405, {Allow: change ? 'POST' : standard ? 'GET, PUT' : 'GET'}).end(); return true; }
      const script = /^\/dealer3d\/(page|src)\/([\w-]+)\.ts$/.exec(at), data = /^\/dealer3d\/data\/([\w-]+)\.json$/.exec(at), figure = /^\/dealer3d\/figur\/(kvinna|man|bord|bord23|stol)\.glb$/.exec(at);
      if (at === '/dealer3d/docka') await file(res, 'dealer3d/page/docka.html', 'text/html; charset=utf-8');
      else if (figure) {
        // The models are large (the table 35 MB): the browser may keep them and asks only whether they have changed.
        const full = path.join(root, '..', 'avatar-auto-pipeline', 'assets', MODELS[figure[1]]), s = await stat(full).catch(() => null), head = s && {'Content-Type': 'model/gltf-binary', 'Content-Length': s.size, ETag: `"${s.size}-${Math.round(s.mtimeMs)}"`, 'Cache-Control': 'no-cache'};
        if (!s || !head) send(res, 404, 'text/plain; charset=utf-8', 'Finns inte.');
        else if (req.headers['if-none-match'] === head.ETag) res.writeHead(304, {ETag: head.ETag}).end();
        else if (req.method === 'HEAD') res.writeHead(200, head).end();
        else res.writeHead(200, head).end(await readFile(full)); }
      else if (script) await file(res, `dealer3d/${script[1]}/${script[2]}.ts`, 'text/javascript; charset=utf-8', stripTypeScriptTypes);
      else if (at === '/src/table-lens.ts') await file(res, 'src/table-lens.ts', 'text/javascript; charset=utf-8', stripTypeScriptTypes);
      else if (data) await file(res, `dealer3d/data/${data[1]}.json`, 'application/json; charset=utf-8');
      else if (at === '/dealer3d/data') json(res, 200, {names: (await readdir(path.join(root, 'dealer3d', 'data'))).filter(n => /^[\w-]+\.json$/.test(n)).map(n => n.slice(0, -5)).sort()});
      else if (at === '/dealer3d/plan') await file(res, 'placements/default.json', 'application/json; charset=utf-8');
      else if (at === '/dealer3d/standard') json(res, 200, await list());
      else if (standard && NAME.test(standard[1])) await file(res, `${STANDARDS}/${standard[1]}.json`, 'application/json; charset=utf-8');
      else send(res, 404, 'text/plain; charset=utf-8', 'Finns inte.');
    } catch (error) {
      req.resume(); // what is left of a refused body is let through, so that the answer reaches the sender
      if (!res.headersSent) json(res, error instanceof Refused ? error.status : 500, {error: error instanceof Refused ? error.message : 'Något gick fel hos dockan.'});
      else res.end();
    }
    return true;
  };
}

export const handleDollLab = dollLabRoutes({root: path.resolve(process.cwd()), origin: 'http://127.0.0.1:4319'});
