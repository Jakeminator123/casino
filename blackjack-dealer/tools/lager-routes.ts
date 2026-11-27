// Biblioteket (studions sida /studio/bibliotek/): kartan över allt som lagras i repot (../../lager.ts), med enheterna i varje
// ställe, och raderingen (tools/lager-remove.ts). Vägarna i tools/preview.ts:
//   GET  /api/lager                    kartan; den senaste räknade, och en ny räknas i bakgrunden när den är äldre än en minut
//                                      (?nytt=1: räknas om nu)
//   GET  /api/lager/fraga?id=<enhet>   vad en radering gör, i hans ord, och om den kräver ett andra klick
//   POST /api/lager/radera             {id, andra, robot}: raderar enheten från disken (bara från studion på datorn)
//   GET  /api/lager/fil?p=<fil>[&liten=1]  en bild, film eller modell; liten=1 ger en liten bild (en ruta ur en film), sparad i
//                                      .runtime/miniatyrer/; aldrig ur live-bj (film av riktiga dealrar) och aldrig hans foto
// Servern står aldrig still för biblioteket: kartan, frågan och raderingen körs i en egen process (lager.ts --json och
// lager-remove.ts --json), och en radering räknar inte om kartan: den tar enheten ur den senaste. Kvittot säger vem som
// raderade: "Jakob i studion", eller "en agents sida i studion" från en sida med ?robot=1.
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readdir, realpath, rename, stat, unlink} from 'node:fs/promises';
import type {IncomingMessage, ServerResponse} from 'node:http';
import path from 'node:path';
import {pipeline} from 'node:stream';
import {platsFor, visasInte, type Karta} from '../../lager.ts';

const CASINO = path.resolve(import.meta.dirname, '../..');
const BJ = path.join(CASINO, 'blackjack-dealer');
const KARTAN = path.join(CASINO, 'lager.ts'), RADERA = path.join(import.meta.dirname, 'lager-remove.ts');
const MINIATYRER = path.join(BJ, '.runtime/miniatyrer'), MINIATYR_BREDD = 360, MINIATYRER_HOGST = 1500;
const TYPES: Record<string, string> = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary'};

/** Kör ett av verktygen i en egen process och ger dess sista rad (JSON) tillbaka. */
function kor(script: string, args: string[], sekunder = 120): Promise<unknown> {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', script, ...args], {cwd: CASINO, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true});
    const out: Buffer[] = []; let err = '';
    const timer = setTimeout(() => child.kill(), sekunder * 1000);
    child.stdout.on('data', (b: Buffer) => out.push(b)); child.stderr.on('data', (b: Buffer) => { err += b.toString('utf8'); });
    child.on('error', e => { clearTimeout(timer); fail(e); });
    child.on('exit', code => {
      clearTimeout(timer);
      const line = Buffer.concat(out).toString('utf8').trim().split('\n').pop() ?? '';
      try { done(JSON.parse(line)); } catch { fail(new Error(err.trim().split('\n').pop() || `verktyget slutade med kod ${code}`)); }
    });
  });
}

// ---- kartan, i en egen process ---------------------------------------------------------------------------------
let senast: {at: number; karta: Karta} | null = null, pagar: Promise<Karta> | null = null;
const rakna = () => pagar ??= (kor(KARTAN, ['--json'], 300) as Promise<Karta>).then(k => { senast = {at: Date.now(), karta: k}; return k; }).finally(() => { pagar = null; });
/** Den senaste kartan; en ny räknas i bakgrunden när den är äldre än en minut, och genast med nytt. */
async function kartan(nytt: boolean): Promise<Karta> {
  if (nytt || !senast) return rakna();
  if (Date.now() - senast.at > 60_000) void rakna().catch(() => {});
  return senast.karta;
}
/** Tar en raderad enhet ur den senaste kartan, med dess storlek ur ställets, slagets och hela summan: inget räknas om. */
export function utan(k: Karta, id: string): Karta {
  for (const p of k.platser) {
    const e = p.enheter.find(x => x.id === id); if (!e) continue;
    p.enheter = p.enheter.filter(x => x !== e); p.bytes -= e.bytes; p.files -= e.files;
    const s = k.perSlag.find(x => x.slag === p.slag); if (s) { s.bytes -= e.bytes; s.files -= e.files; }
    k.totalt.bytes -= e.bytes; k.totalt.files -= e.files;
    if (p.slag === 'tillfalligt') k.totalt.tillfalligtBytes -= e.bytes;
    if (e.dom !== undefined && e.dom !== 'domt') { k.totalt.vantar--; k.totalt.vantarBytes -= e.bytes; }
    if (!p.git && p.slag !== 'tillfalligt' && !e.anvands.length && (!e.bank || e.bank.use === 'okänd') && p.radera === 'ja') { k.totalt.utanPekare--; k.totalt.utanPekareBytes -= e.bytes; }
    break;
  }
  return k;
}

const json = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}).end(JSON.stringify(body)); };

// ---- filerna och de små bilderna -------------------------------------------------------------------------------
/** Högst tre små bilder görs åt gången, så att en sida med många inte startar trettio processer. */
let igang = 0; const ko: (() => void)[] = [];
async function tur<T>(gor: () => Promise<T>): Promise<T> {
  while (igang >= 3) await new Promise<void>(r => ko.push(r));
  igang++;
  try { return await gor(); } finally { igang--; ko.shift()?.(); }
}
/** En liten bild av en fil: en bild förminskad, en film som sin ruta vid en halv sekund; sparad efter filens namn, storlek och tid. */
async function miniatyr(abs: string, size: number, mtimeMs: number): Promise<string | null> {
  const film = /\.mp4$/i.test(abs), bild = /\.(?:png|jpe?g|webp)$/i.test(abs);
  if (!film && !bild) return null;
  const nyckel = createHash('sha1').update(`${abs}|${size}|${Math.round(mtimeMs)}`).digest('hex').slice(0, 24), ut = path.join(MINIATYRER, `${nyckel}.${film ? 'jpg' : 'webp'}`);
  if (await stat(ut).then(() => true, () => false)) return ut;
  await mkdir(MINIATYRER, {recursive: true});
  const tmp = `${ut}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp${film ? '.jpg' : '.webp'}`;
  try {
    await tur(async () => {
      if (bild) { const sharp = (await import('sharp')).default; await sharp(abs).resize({width: MINIATYR_BREDD, withoutEnlargement: true}).webp({quality: 72}).toFile(tmp); }
      else await new Promise<void>((done, fail) => { const c = spawn(process.env.FFMPEG ?? 'ffmpeg', ['-v', 'error', '-ss', '0.5', '-i', abs, '-frames:v', '1', '-vf', `scale=${MINIATYR_BREDD}:-2`, '-y', tmp], {stdio: 'ignore', windowsHide: true}); c.on('error', fail); c.on('exit', code => code === 0 ? done() : fail(new Error(`ffmpeg ${code}`))); });
    });
    await rename(tmp, ut);
  } catch { await unlink(tmp).catch(() => {}); return null; }
  // Mappen hålls liten: de äldsta tas när den är full (de görs om när de behövs).
  const alla = await readdir(MINIATYRER).catch(() => [] as string[]);
  if (alla.length > MINIATYRER_HOGST) { const med = await Promise.all(alla.map(async n => ({n, t: (await stat(path.join(MINIATYRER, n)).catch(() => null))?.mtimeMs ?? 0}))); for (const {n} of med.sort((a, b) => a.t - b.t).slice(0, alla.length - MINIATYRER_HOGST + 200)) await unlink(path.join(MINIATYRER, n)).catch(() => {}); }
  return ut;
}

/** En fil att visa: bara det visasInte släpper, och bara där filen verkligen ligger i sitt ställe (ingen länk ut). */
async function skickaFil(req: IncomingMessage, res: ServerResponse, rel: string, liten: boolean) {
  const fel = visasInte(rel); if (fel) { json(res, 404, {error: fel}); return; }
  const hit = platsFor(rel)!;
  let abs: string, rot: string;
  try { abs = await realpath(path.join(CASINO, rel)); rot = await realpath(path.join(CASINO, hit.mapp)); } catch { json(res, 404, {error: 'Finns inte på den här datorn.'}); return; }
  const r = path.relative(rot, abs);
  if (!r || r.startsWith('..') || path.isAbsolute(r)) { json(res, 404, {error: 'Visas inte.'}); return; }
  let s = await stat(abs).catch(() => null);
  if (!s?.isFile()) { json(res, 404, {error: 'Finns inte på den här datorn.'}); return; }
  if (liten) {
    const m = await miniatyr(abs, s.size, s.mtimeMs);
    if (!m) { json(res, 404, {error: 'Ingen liten bild.'}); return; }
    abs = m; s = (await stat(abs))!;
  }
  let start = 0, end = s.size - 1;
  const head: Record<string, string | number> = {'Content-Type': TYPES[path.extname(abs).toLowerCase()] ?? 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': liten ? 'private, max-age=3600' : 'no-cache'};
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
      json(res, 200, await kartan(url.searchParams.get('nytt') === '1')); return true;
    }
    if (url.pathname === '/api/lager/fil') {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return true; }
      await skickaFil(req, res, url.searchParams.get('p') ?? '', url.searchParams.get('liten') === '1'); return true;
    }
    if (url.pathname === '/api/lager/fraga') {
      if (req.method !== 'GET') { res.writeHead(405).end(); return true; }
      const id = url.searchParams.get('id') ?? '';
      if (!id || id.startsWith('-')) { json(res, 400, {error: 'Säg vad som ska raderas.'}); return true; }
      json(res, 200, await kor(RADERA, [id, '--json'])); return true;
    }
    if (url.pathname === '/api/lager/radera') {
      if (req.method !== 'POST') { res.writeHead(405).end(); return true; }
      if (req.headers.origin !== origin) { json(res, 403, {error: 'Radera från studion på datorn.'}); return true; }
      if (!req.headers['content-type']?.startsWith('application/json')) { json(res, 415, {error: 'JSON krävs.'}); return true; }
      let size = 0; const chunks: Buffer[] = [];
      for await (const chunk of req) { size += (chunk as Buffer).length; if (size > 4096) { json(res, 413, {error: 'För stort.'}); return true; } chunks.push(chunk as Buffer); }
      let body: {id?: unknown; andra?: unknown; robot?: unknown}; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { json(res, 400, {error: 'Inte giltig JSON.'}); return true; }
      if (typeof body.id !== 'string' || !body.id || body.id.startsWith('-')) { json(res, 400, {error: 'Säg vad som ska raderas.'}); return true; }
      // Vem det var: en sida med ?robot=1 är en agents; annars Jakobs klick i studion.
      const vem = body.robot === true ? 'en agents sida i studion' : 'Jakob i studion';
      const svar = await kor(RADERA, [body.id, '--ja', '--json', '--studion', '--vem', vem, ...(body.andra === true ? [] : ['--ett-klick'])]) as {raderat?: string[]};
      if (svar.raderat?.length && senast) utan(senast.karta, body.id);
      json(res, 200, svar); return true;
    }
    json(res, 404, {error: 'Den vägen finns inte.'}); return true;
  } catch (error) { json(res, 500, {error: (error as Error).message}); return true; }
}
