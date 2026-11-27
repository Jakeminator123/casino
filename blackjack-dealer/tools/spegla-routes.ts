// Spegla (studions sida /studio/spegla/, studio/components/spegla/): Youtubefilmen som allt är mätt ur och vår vy av samma
// giv, i samma bild och i samma takt. Vägarna i tools/preview.ts, bara på den här datorns server:
//   GET /api/spegla              vad som går att spegla: filmens bordsbild (rutan i ../live-bj/data/kalla.json), och för
//                                varje lyft giv dockans rutor med filmens sekund för varje ruta och vår vy: dockans
//                                inspelning genom livebordets kamera och filmer av en person i ett prov
//   GET /api/spegla/film         Youtubefilmen själv (../live-bj/video/kalla.mp4), med byte-intervall så att sidan kan hoppa
//                                i tiden; den strömmas där den ligger och kopieras aldrig
//   GET /api/spegla/klipp/<namn> en inspelning ur ../standarddocka/klipp/
//
// Sambandet mellan dockans ruta och filmens tid står i datan, inte här: dockans ruta k är lyftets ruta made.liftFrom + k,
// efter lyftets sista ruta dess sista (dealer3d/tools/lyft-till-docka.ts, made.liftFrames), och lyftets ruta i har filmens
// sekund frames[i].t (live-bj/verktyg/lyft.py). Vår vy finns för en giv när dess inspelning är nyare än lyftet och har
// lika många rutor som rörelsen; en persons film när ett prov har dockfilmen av personens docka i samma giv (original/
// dockfilm-lyft-<docka>-<giv>…mp4, eller i en omgång under original/), personens lyft är samma lyft från samma ruta, och
// filmen har vår bilds storlek och rörelsens längd (i sin egen bildtakt: en film ur Kling 4 går i 24 bilder/s).
//
// Filmen och vägarna finns bara här: kopian på nätet har ingen server, dess bygge (tools/build-studio-snapshot.ts) tar inget
// utanför blackjack-dealer/ och frågar aldrig efter de här vägarna, och studions sida får filmens adress ur svaret, inte ur
// koden. Provet: tools/spegla-routes.test.ts. Lagrar ingenting och skriver ingenting.
import {execFile} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {readdir, readFile, realpath, stat} from 'node:fs/promises';
import type {IncomingMessage, ServerResponse} from 'node:http';
import path from 'node:path';
import {pipeline} from 'node:stream';

const CASINO = path.resolve(import.meta.dirname, '../..');
/** Den enda server vägarna svarar på: studions på den här datorn. */
export const LOCAL_HOST = '127.0.0.1:4319';
export const KALLOR = {
  film: 'live-bj/video/kalla.mp4',
  ruta: 'live-bj/data/kalla.json',
  lyften: 'live-bj/data/lyft',
  dockorna: 'blackjack-dealer/dealer3d/data',
  klipp: 'standarddocka/klipp',
  prov: 'blackjack-dealer/assets/proofs',
} as const;
/** Bildens storlek genom livebordets kamera (src/table-live.ts LIVE_CAMERA): inspelningarna och personernas filmer. */
export const VAR_STORLEK = {bredd: 1728, hojd: 972} as const;

export type Probe = {width: number; height: number; fps: number; frames: number};
export type VarVy = {id: string; namn: string; url: string};
export type Giv = {
  id: string; docka: string; namn: string; fps: number; rutor: number;
  /** Filmens sekund för dockans ruta k. */
  tider: number[];
  /** Den sista ruta som har en egen ruta i lyftet; därefter står filmen stilla på lyftets sista. */
  lyftetTill: number;
  /** Rutorna att hoppa till: vänsterhanden vid skon, handbytet och kortet som ligger (made.times). */
  marken: {skon?: number; bytet?: number; ligger?: number};
  var: VarVy[];
};
export type Spegling = {film: {url: string; bredd: number; hojd: number; fps: number; ruta: {x: number; y: number; bredd: number; hojd: number}} | null; givar: Giv[]};

type Json = Record<string, any>;
export type Options = {casino?: string; probe?: (file: string) => Promise<Probe | null>};

// ---- läsa, med en cache per fil och ändringstid ------------------------------------------------------------------
const cache = new Map<string, {key: string; value: unknown}>();
async function minns<T>(file: string, read: () => Promise<T>): Promise<T | null> {
  const s = await stat(file).catch(() => null);
  if (!s?.isFile()) return null;
  const key = `${s.size}|${s.mtimeMs}`, hit = cache.get(file);
  if (hit?.key === key) return hit.value as T;
  const value = await read();
  if (cache.size > 400) cache.clear();
  cache.set(file, {key, value});
  return value;
}
const json = (file: string) => minns<Json | null>(file, async () => { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; } });

/** Filmens storlek, takt och antal rutor (ffprobe räknar paketen, utan att avkoda). */
export function ffprobe(file: string): Promise<Probe | null> {
  return minns(file, () => new Promise<Probe | null>(done => {
    execFile(process.env.FFPROBE ?? 'ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_packets', '-of', 'json', file], {windowsHide: true, timeout: 20000}, (error, out) => {
      if (error) { done(null); return; }
      try {
        const s = JSON.parse(out).streams?.[0], [a, b] = String(s?.r_frame_rate ?? '0/1').split('/').map(Number);
        done({width: Number(s.width), height: Number(s.height), fps: b ? a / b : 0, frames: Number(s.nb_read_packets)});
      } catch { done(null); }
    });
  })).then(p => p ?? null);
}

const stor = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Rörelsens namn i studion, med platsen som Schemat skriver den (dagens plats). */
const rorelseOrd = (r: string) => { const p = /^p(\d)$/.exec(r); if (p) return `plats ${p[1]}`; const v = /^vantan-(\d)$/.exec(r); return v ? `väntan ${v[1]}` : r; };
const GIV = /^lyft-([a-z0-9]+)-(p[1-7]|vantan-\d)\.json$/;

type Lyft = {docka: string; rorelse: string; file: string; mtimeMs: number; fps: number; rutor: number; lift: string; fran: number; times: Json | null};
async function lyften(casino: string): Promise<Lyft[]> {
  const dir = path.join(casino, KALLOR.dockorna), out: Lyft[] = [];
  for (const name of (await readdir(dir).catch(() => [] as string[])).sort()) {
    const m = GIV.exec(name); if (!m) continue;
    const file = path.join(dir, name), j = await json(file), s = await stat(file).catch(() => null);
    const lift = j?.made?.lift, fran = j?.made?.liftFrom;
    if (!s || !j || typeof lift !== 'string' || !lift.startsWith(`${KALLOR.lyften}/`) || !Number.isInteger(fran) || !Number.isInteger(j.frameCount)) continue;
    out.push({docka: m[1], rorelse: m[2], file, mtimeMs: s.mtimeMs, fps: Number(j.fps) || 30, rutor: j.frameCount, lift, fran, times: j.made.times ?? null});
  }
  return out;
}

/** Filmens sekund för varje ruta i rörelsen, och den sista ruta som har en egen ruta i lyftet. */
export function tiderFor(lyftetsTider: number[], fran: number, rutor: number): {tider: number[]; lyftetTill: number} | null {
  if (!lyftetsTider.length || fran < 0 || fran >= lyftetsTider.length) return null;
  const sista = lyftetsTider.length - 1;
  return {tider: Array.from({length: rutor}, (_, k) => lyftetsTider[Math.min(fran + k, sista)]), lyftetTill: Math.min(rutor - 1, sista - fran)};
}

/** En film är rörelsens när den har vår bild och är lika lång som rörelsen, inom två av dockans rutor. Bildtakten får vara
 * filmens egen: sidan ställer vår film efter tiden, så en film i 24 bilder/s visar rätt ruta för dockans ruta k. */
const passar = (p: Probe | null, rutor: number) => !!p && p.width === VAR_STORLEK.bredd && p.height === VAR_STORLEK.hojd && p.fps > 0 && Math.abs(p.frames / p.fps - rutor / 30) <= 2 / 30;

/** Allt sidan behöver, läst ur filerna varje gång. */
export async function spegling(options: Options = {}): Promise<Spegling> {
  const casino = options.casino ?? CASINO, probe = options.probe ?? ffprobe;
  const kalla = await json(path.join(casino, KALLOR.ruta)), filmFinns = (await stat(path.join(casino, KALLOR.film)).catch(() => null))?.isFile() ?? false;
  const c = kalla?.crop;
  const film = filmFinns && c && [c.x, c.y, c.width, c.height, kalla.width, kalla.height, kalla.fps].every(Number.isFinite)
    ? {url: '/api/spegla/film', bredd: kalla.width, hojd: kalla.height, fps: kalla.fps, ruta: {x: c.x, y: c.y, bredd: c.width, hojd: c.height}} : null;

  const alla = await lyften(casino), givar: Giv[] = [];
  const somLyftet = (a: Lyft, b: Lyft) => a.lift === b.lift && a.fran === b.fran && a.rutor === b.rutor && a.rorelse === b.rorelse;
  // Personernas filmer: prov med dockfilmen av en persons docka i en giv.
  const personer: {docka: string; rorelse: string; prov: string; filer: string[]; skapad: number}[] = [];
  const provRot = path.join(casino, KALLOR.prov);
  for (const prov of (await readdir(provRot, {withFileTypes: true}).catch(() => [])).filter(d => d.isDirectory() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.name))) {
    // (dockfilmen ligger i original/, eller i en omgång under den: original/v4/, där ny_dealer.py --omgang lägger den)
    const rot = path.join(provRot, prov.name, 'original'), overst = await readdir(rot, {withFileTypes: true}).catch(() => []);
    const original = [...overst.filter(d => d.isFile()).map(d => d.name),
      ...(await Promise.all(overst.filter(d => d.isDirectory()).map(d => readdir(path.join(rot, d.name)).catch(() => [] as string[])))).flat()];
    const docka = original.map(n => /^dockfilm-lyft-([a-z0-9]+)-(p[1-7]|vantan-\d)(?:-[a-z0-9-]+)?\.mp4$/.exec(n)).find(Boolean);
    if (!docka) continue;
    const filer = (await readdir(path.join(provRot, prov.name)).catch(() => [] as string[])).filter(n => /^[a-z0-9][a-z0-9._-]*\.mp4$/.test(n) && !n.includes('dockfilm')).sort();
    const skapad = Date.parse((await json(path.join(provRot, prov.name, 'proof.json')))?.createdAt ?? '');
    personer.push({docka: docka[1], rorelse: docka[2], prov: prov.name, filer, skapad: Number.isFinite(skapad) ? skapad : 0});
  }
  // (proven i den ordning de gjordes, det äldsta först: en persons filmer numreras efter den)
  personer.sort((a, b) => a.skapad - b.skapad || a.prov.localeCompare(b.prov));

  for (const l of alla) {
    const raw = await json(path.join(casino, l.lift));
    // Bara dockan som lyftet är gjort för (Danilo för kameran, Frasse för bordet) är en egen giv; en persons docka på samma lyft
    // är en av dess vyer.
    if (!raw || raw.docka !== l.docka || !Array.isArray(raw.frames)) continue;
    const t = tiderFor(raw.frames.map((f: Json) => Number(f.t)), l.fran, l.rutor);
    if (!t || t.tider.some(x => !Number.isFinite(x))) continue;
    const var_: VarVy[] = [];
    const klipp = `live-lyft-${l.docka}-${l.rorelse}-hela-kameran-${l.docka}.mp4`, klippFil = path.join(casino, KALLOR.klipp, klipp);
    const ks = await stat(klippFil).catch(() => null);
    if (ks?.isFile() && ks.mtimeMs >= l.mtimeMs && passar(await probe(klippFil), l.rutor))
      var_.push({id: 'dockan', namn: 'Dockan', url: `/api/spegla/klipp/${klipp}?v=${Math.round(ks.mtimeMs)}`});
    // En persons filmer heter efter personen och ett löpande nummer över alla prov, i den ordning proven gjordes (Kenji 1 är
    // den äldsta), och den senaste står först. Förut hette de efter filens nummer i sitt prov, och två prov gav då två
    // filmer med samma namn (två "Kenji 01", 2026-11-27).
    const filmer: VarVy[] = [], antal = new Map<string, number>();
    for (const p of personer.filter(p => p.rorelse === l.rorelse)) {
      const hans = alla.find(x => x.docka === p.docka && x.rorelse === p.rorelse);
      if (!hans || !somLyftet(hans, l)) continue;
      for (const fil of p.filer) {
        const abs = path.join(provRot, p.prov, fil);
        if (!passar(await probe(abs), l.rutor)) continue;
        const nr = (antal.get(p.docka) ?? 0) + 1; antal.set(p.docka, nr);
        filmer.push({id: `${p.prov}/${fil}`, namn: `${stor(p.docka)} ${nr}`, url: `/assets/proofs/${p.prov}/${fil}`});
      }
    }
    var_.push(...filmer.reverse());
    if (!var_.length) continue;
    const tm = l.times ?? {}, ruta = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < l.rutor ? v as number : undefined);
    const marken = Object.fromEntries(Object.entries({skon: ruta(tm.arrive), bytet: ruta(tm.meet ?? tm.narmast), ligger: ruta(tm.ligger)}).filter(([, v]) => v !== undefined));
    givar.push({id: `${l.docka}-${l.rorelse}`, docka: l.docka, namn: `${stor(l.docka)}, ${rorelseOrd(l.rorelse)}`, fps: l.fps, rutor: l.rutor, tider: t.tider, lyftetTill: t.lyftetTill, marken, var: var_});
  }
  givar.sort((a, b) => a.docka.localeCompare(b.docka) || a.id.localeCompare(b.id, 'sv', {numeric: true}));
  return {film, givar};
}

// ---- svaren --------------------------------------------------------------------------------------------------------
const svara = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}).end(JSON.stringify(body)); };

/** Varför en fråga inte besvaras här: en annan server än studions på datorn, eller en sida från en annan webbplats. */
export function inteHar(req: IncomingMessage): string | null {
  if (req.headers.host !== LOCAL_HOST) return 'Bara på studions server på den här datorn.';
  const site = req.headers['sec-fetch-site'];
  if (site !== undefined && site !== 'same-origin' && site !== 'none') return 'Bara från studion på den här datorn.';
  return null;
}

/** En film ur sin mapp, med byte-intervall; bara där filen verkligen ligger i mappen (ingen länk ut). */
async function skicka(req: IncomingMessage, res: ServerResponse, mapp: string, fil: string) {
  let abs: string;
  try { abs = await realpath(path.join(mapp, fil)); const r = path.relative(await realpath(mapp), abs); if (!r || r.startsWith('..') || path.isAbsolute(r)) throw Error(); }
  catch { svara(res, 404, {error: 'Finns inte på den här datorn.'}); return; }
  const s = await stat(abs).catch(() => null);
  if (!s?.isFile()) { svara(res, 404, {error: 'Finns inte på den här datorn.'}); return; }
  const head: Record<string, string | number> = {'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600', 'Last-Modified': s.mtime.toUTCString()};
  let start = 0, end = s.size - 1;
  const m = req.headers.range ? /^bytes=(\d*)-(\d*)$/.exec(req.headers.range) : null;
  if (req.headers.range && (!m || (!m[1] && !m[2]))) { res.writeHead(416, {'Content-Range': `bytes */${s.size}`}).end(); return; }
  if (m) {
    if (m[1]) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), s.size - 1) : end; } else { start = Math.max(0, s.size - Number(m[2])); }
    if (start > end || start >= s.size) { res.writeHead(416, {'Content-Range': `bytes */${s.size}`}).end(); return; }
    res.writeHead(206, {...head, 'Content-Range': `bytes ${start}-${end}/${s.size}`, 'Content-Length': end - start + 1});
  } else res.writeHead(200, {...head, 'Content-Length': s.size});
  if (req.method === 'HEAD' || s.size === 0) { res.end(); return; }
  pipeline(createReadStream(abs, {start, end}), res, () => {});
}

const KLIPP = /^live-lyft-[a-z0-9]+(?:-[a-z0-9]+)*-hela-kameran-[a-z0-9]+\.mp4$/;

/** Speglingens vägar; true när adressen var en av dem. */
export async function handleSpegla(req: IncomingMessage, res: ServerResponse, url: URL, options: Options = {}): Promise<boolean> {
  if (url.pathname !== '/api/spegla' && !url.pathname.startsWith('/api/spegla/')) return false;
  const casino = options.casino ?? CASINO;
  const nej = inteHar(req);
  if (nej) { svara(res, 403, {error: nej}); return true; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, {Allow: 'GET, HEAD'}).end(); return true; }
  try {
    if (url.pathname === '/api/spegla') { svara(res, 200, await spegling(options)); return true; }
    if (url.pathname === '/api/spegla/film') { await skicka(req, res, path.join(casino, path.dirname(KALLOR.film)), path.basename(KALLOR.film)); return true; }
    const namn = url.pathname.slice('/api/spegla/klipp/'.length);
    if (url.pathname.startsWith('/api/spegla/klipp/') && KLIPP.test(namn)) { await skicka(req, res, path.join(casino, KALLOR.klipp), namn); return true; }
    svara(res, 404, {error: 'Ingen sådan väg.'});
  } catch (error) { if (!res.headersSent) svara(res, 500, {error: (error as Error).message}); else res.end(); }
  return true;
}
