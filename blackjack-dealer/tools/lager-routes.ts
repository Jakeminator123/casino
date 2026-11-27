// Biblioteket (studions sida /studio/bibliotek/): kartan över allt som lagras i repot (../../lager.ts), med enheterna i varje
// ställe, och raderingen på hans klick (tools/lager-remove.ts). Vägarna i tools/preview.ts:
//   GET  /api/lager                 kartan: ställena per slag med storlek, enheterna med användning, vad som väntar och vad som saknas
//   GET  /api/lager/fraga?id=<enhet>  vad en radering gör, i hans ord, och om den kräver ett andra klick
//   POST /api/lager/radera          {id, andra}: raderar enheten från disken (bara från studion på datorn)
//   GET  /api/lager/fil?p=<fil>     en bild, film eller modell att visa som miniatyr; aldrig ur live-bj (film av riktiga
//                                   dealrar) och aldrig ditt foto (lager.ts visasInte)
// För spelets bank är enheterna media-audit.ts:s som de är; för proven läggs det studion redan vet till (område, titel, hans
// ord, kortet i Beslut, domarens dom). Kartan räknas om högst var 20:e sekund, och genast efter en radering.
import {createReadStream} from 'node:fs';
import {readFile, readdir, realpath, stat} from 'node:fs/promises';
import type {IncomingMessage, ServerResponse} from 'node:http';
import path from 'node:path';
import {pipeline} from 'node:stream';
import {karta, platsFor, visasInte, type Karta} from '../../lager.ts';
import {fraga, radera} from './lager-remove.ts';

const CASINO = path.resolve(import.meta.dirname, '../..');
const BJ = 'blackjack-dealer';
const TYPES: Record<string, string> = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary'};
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Det studion vet om ett prov: titel, område, hans ord, kortet i Beslut och domarens dom (proof.json domare). */
export type ProvInfo = {titel: string | null; omrade: string | null; bra: number; inteBra: number; kort: boolean; obesvarat: boolean; domare: string | null; extern: string | null; oenig: boolean};
async function provInfo(casino: string): Promise<Map<string, ProvInfo>> {
  const read = async <T>(rel: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(casino, rel), 'utf8')) as T; } catch { return null; } };
  const notes = (await read<{notes?: {proof?: string; choice?: string | null}[]}>(`${BJ}/data/proof-notes.json`))?.notes ?? [];
  const cards = (await read<{decisions?: {proof?: string; answer?: unknown}[]}>(`${BJ}/data/decisions.json`))?.decisions ?? [];
  const out = new Map<string, ProvInfo>();
  for (const id of (await readdir(path.join(casino, BJ, 'assets/proofs')).catch(() => [])).filter(n => ID.test(n))) {
    const p = await read<{title?: unknown; area?: unknown; domare?: {dom?: unknown; extern?: {dom?: unknown} | null; oenig?: unknown}}>(`${BJ}/assets/proofs/${id}/proof.json`);
    const mine = notes.filter(n => n.proof === id), own = cards.filter(c => c.proof === id);
    out.set(id, {titel: typeof p?.title === 'string' ? p.title : null, omrade: typeof p?.area === 'string' ? p.area : null, bra: mine.filter(n => n.choice === 'bra').length, inteBra: mine.filter(n => n.choice === 'inte-bra').length, kort: own.length > 0, obesvarat: own.some(c => !c.answer),
      domare: typeof p?.domare?.dom === 'string' ? p.domare.dom : null, extern: typeof p?.domare?.extern?.dom === 'string' ? p.domare.extern.dom : null, oenig: p?.domare?.oenig === true});
  }
  return out;
}

export type LagerSvar = Karta & {prov: Record<string, ProvInfo>};
let cache: {at: number; value: Promise<LagerSvar>} | null = null;
/** Kartan med provens info, räknad om högst var 20:e sekund (nytt: genast). */
export function lager(casino = CASINO, nytt = false): Promise<LagerSvar> {
  if (!nytt && cache && Date.now() - cache.at < 20_000) return cache.value;
  const value = (async () => {
    const [k, prov] = await Promise.all([karta(casino), provInfo(casino)]);
    // Ett provs namn är dess titel, som i Granska.
    for (const p of k.platser) if (p.id === 'prov') for (const e of p.enheter) { const t = prov.get(e.id.split('/').at(-1)!)?.titel; if (t) e.namn = t; }
    return {...k, prov: Object.fromEntries(prov)};
  })();
  cache = {at: Date.now(), value};
  value.catch(() => { if (cache?.value === value) cache = null; });
  return value;
}

const json = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}).end(JSON.stringify(body)); };

/** En fil att visa: bara det visasInte släpper, och bara där filen verkligen ligger i sitt ställe (ingen länk ut). */
async function skickaFil(req: IncomingMessage, res: ServerResponse, rel: string) {
  const fel = visasInte(rel); if (fel) { json(res, 404, {error: fel}); return; }
  const hit = platsFor(rel)!;
  let abs: string, rot: string;
  try { abs = await realpath(path.join(CASINO, rel)); rot = await realpath(path.join(CASINO, hit.mapp)); } catch { json(res, 404, {error: 'Finns inte på den här datorn.'}); return; }
  const r = path.relative(rot, abs);
  if (!r || r.startsWith('..') || path.isAbsolute(r)) { json(res, 404, {error: 'Visas inte.'}); return; }
  const s = await stat(abs).catch(() => null);
  if (!s?.isFile()) { json(res, 404, {error: 'Finns inte på den här datorn.'}); return; }
  let start = 0, end = s.size - 1;
  const head: Record<string, string | number> = {'Content-Type': TYPES[path.extname(abs).toLowerCase()] ?? 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache'};
  const m = req.headers.range ? /^bytes=(\d+)-(\d*)$/.exec(req.headers.range) : null;
  if (req.headers.range && !m) { res.writeHead(416, {'Content-Range': `bytes */${s.size}`}).end(); return; }
  if (m) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), s.size - 1) : end; if (start > end) { res.writeHead(416, {'Content-Range': `bytes */${s.size}`}).end(); return; } res.writeHead(206, {...head, 'Content-Range': `bytes ${start}-${end}/${s.size}`, 'Content-Length': end - start + 1}); }
  else res.writeHead(200, {...head, 'Content-Length': s.size});
  if (req.method === 'HEAD' || s.size === 0) { res.end(); return; }
  pipeline(createReadStream(abs, {start, end}), res, () => {});
}

/** Bibliotekets vägar; true när adressen var en av dem. */
export async function handleLager(req: IncomingMessage, res: ServerResponse, url: URL, origin: string): Promise<boolean> {
  if (!url.pathname.startsWith('/api/lager')) return false;
  try {
    if (url.pathname === '/api/lager') {
      if (req.method !== 'GET') { res.writeHead(405).end(); return true; }
      json(res, 200, await lager(CASINO, url.searchParams.get('nytt') === '1')); return true;
    }
    if (url.pathname === '/api/lager/fil') {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return true; }
      await skickaFil(req, res, url.searchParams.get('p') ?? ''); return true;
    }
    if (url.pathname === '/api/lager/fraga') {
      if (req.method !== 'GET') { res.writeHead(405).end(); return true; }
      json(res, 200, await fraga(CASINO, url.searchParams.get('id') ?? '')); return true;
    }
    if (url.pathname === '/api/lager/radera') {
      if (req.method !== 'POST') { res.writeHead(405).end(); return true; }
      if (req.headers.origin !== origin) { json(res, 403, {error: 'Radera från studion på datorn.'}); return true; }
      if (!req.headers['content-type']?.startsWith('application/json')) { json(res, 415, {error: 'JSON krävs.'}); return true; }
      let size = 0; const chunks: Buffer[] = [];
      for await (const chunk of req) { size += (chunk as Buffer).length; if (size > 4096) { json(res, 413, {error: 'För stort.'}); return true; } chunks.push(chunk as Buffer); }
      let body: {id?: unknown; andra?: unknown}; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { json(res, 400, {error: 'Inte giltig JSON.'}); return true; }
      if (typeof body.id !== 'string') { json(res, 400, {error: 'Säg vad som ska raderas.'}); return true; }
      const svar = await radera(CASINO, body.id, {andra: body.andra === true});
      if (svar.raderat.length) cache = null;
      json(res, 200, svar); return true;
    }
    json(res, 404, {error: 'Den vägen finns inte.'}); return true;
  } catch (error) { json(res, 500, {error: (error as Error).message}); return true; }
}

