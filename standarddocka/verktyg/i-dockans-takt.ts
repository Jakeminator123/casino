// Ger en film som en filmmodell har gjort ur dockans stillbilder dockans egen takt. Kling 4 lägger stillbilderna (första
// bild, mellanbilderna, sista bild) jämnt i tiden, så sträckan där bilderna låg tätast (bytet och vändningen) blev upp
// till sex gånger långsammare än dockans (Jakob 2026-11-27: "Varför saktas det in så mycket när kortet ska vändas? Just
// vändningen ska gå ... snabbt", och filmen ska inte gå i en annan takt än dockan utan skäl).
//
//   node standarddocka/verktyg/i-dockans-takt.ts <film.mp4> --docka <rörelse.json> --bild <stillbild.png>@<dockruta> [--bild …]
//        [--takt <takt.json>]   ankarna skrivs dit; utan --bild läses de därifrån, så att samma takt läggs på en film som
//                               är gjord av den första (den gröna filmen lagd på bordet med lagg-pa-bord.ts --takt)
//        [--ut <film.mp4>]      filmen i dockans takt: rörelsens rutor (frameCount) i rörelsens bildtakt (fps)
//        [--oskarpa 0.5]        rörelseoskärpa: varje ruta blandar filmens rutor under den delen av rutans tid, som en
//                               kameras slutare (0: en hel ruta ur filmen; 1: alla rutor som hoppas över). Där filmen går
//                               fortare än dockan blir det snabba suddigt; där slutaren täcker mindre än en filmruta (där
//                               filmen går långsammare än dockan eller nästan lika fort) tas den närmaste rutan hel
//
// Ankarna: varje stillbild paras med den filmruta som liknar den mest. Bilderna och rutorna jämförs i 240 x 135 bildpunkter,
// och bara där stillbilderna skiljer sig från varandra (armarna, händerna, kortet och huvudet: det som rör sig), så att
// bordet och bakgrunden inte räknas. Paren går i stigande ordning: den första bilden i en tidigare ruta än den andra, och
// så vidare (det bästa sådana valet räknas fram över alla). En mellanbild som filmen aldrig gick igenom (dess bästa ruta
// mer än --gans 1,5 gånger så långt från den som bilderna i mitten är från sina) lämnas utanför, och filmens takt läses
// rakt mellan de andra. Där filmen står still över flera rutor (de som är inom 15 % lika nära) är bilden den av dem som
// ger jämn takt mot ankarna före och efter.
// Utrutan k (dockans ruta k) läser filmen rakt mellan ankarna: mellan dockruta 24 i filmruta 13 och dockruta 27 i filmruta
// 27 läser utruta 25 filmruta 17,7. Utan oskärpa tas den närmaste rutan.
// Kräver FFmpeg på datorn (FFMPEG och FFPROBE pekar ut dem om de inte ligger i sökvägen).
import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2), arg = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const film = argv[0] && !argv[0].startsWith('--') ? argv[0] : undefined, docka = arg('--docka'), taktFil = arg('--takt'), ut = arg('--ut');
const oskarpa = Number(arg('--oskarpa') ?? '0'), gans = Number(arg('--gans') ?? '1.5');
const bilder = argv.flatMap((x, i) => x === '--bild' ? [argv[i + 1]] : []).map(x => { const at = x.lastIndexOf('@'); return {fil: x.slice(0, at), ruta: Number(x.slice(at + 1))}; });
const ANVAND = 'node standarddocka/verktyg/i-dockans-takt.ts <film.mp4> --docka <rörelse.json> (--bild <stillbild.png>@<dockruta> … | --takt <takt.json>) [--takt <takt.json>] [--ut <film.mp4>] [--oskarpa 0.5] [--gans 1.5]';
if (!film || !docka || (!bilder.length && !taktFil) || bilder.some(b => !b.fil || !Number.isInteger(b.ruta)) || !(oskarpa >= 0 && oskarpa <= 1)) throw Error(ANVAND);
const FFMPEG = process.env.FFMPEG || 'ffmpeg', FFPROBE = process.env.FFPROBE || 'ffprobe';
const rorelse = JSON.parse(readFileSync(docka, 'utf8')) as {fps: number; frameCount: number};
const [W, H, takt, antal] = spawnSync(FFPROBE, ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_frames', '-of', 'csv=p=0', film], {encoding: 'utf8'}).stdout.trim().split(',').map((x, i) => i === 2 ? x : Number(x)) as [number, number, string, number];
if (!(W > 0 && H > 0 && antal > 1)) throw Error(`${film} gick inte att läsa.`);

/** Filmens (eller bildens) rutor som rå RGB i storleken w x h, en i taget. */
async function* rutor(fil: string, w: number, h: number): AsyncGenerator<Buffer> {
  const n = w * h * 3, p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', fil, '-vf', `scale=${w}:${h}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true});
  let kvar: Buffer = Buffer.alloc(0);
  for await (const bit of p.stdout) { kvar = kvar.length ? Buffer.concat([kvar, bit as Buffer]) : bit as Buffer; while (kvar.length >= n) { yield Buffer.from(kvar.subarray(0, n)); kvar = kvar.subarray(n); } }
}
const forsta = async (fil: string, w: number, h: number) => { for await (const f of rutor(fil, w, h)) return f; throw Error(`${fil} gick inte att läsa.`); };

// ---- ankarna --------------------------------------------------------------------------------------------------------
type Ankare = {dockruta: number; filmruta: number; lika: [number, number]; bild: string; avstand: number};
let ankare: Ankare[], utan: (Ankare & {varfor: string})[] = [];
if (bilder.length) {
  const w = 240, h = 135, n = w * h, B = await Promise.all([...bilder].sort((a, b) => a.ruta - b.ruta).map(async b => ({...b, px: await forsta(b.fil, w, h)})));
  // (bildpunkterna där stillbilderna skiljer sig: största skillnaden mot deras medel, summerad över färgerna, över 30)
  const med = new Float32Array(n * 3); for (const b of B) for (let q = 0; q < n * 3; q++) med[q] += b.px[q] / B.length;
  const ror: number[] = []; for (let q = 0; q < n; q++) { let m = 0; for (const b of B) m = Math.max(m, Math.abs(b.px[3 * q] - med[3 * q]) + Math.abs(b.px[3 * q + 1] - med[3 * q + 1]) + Math.abs(b.px[3 * q + 2] - med[3 * q + 2])); if (m > 30) ror.push(q); }
  if (ror.length < 50) throw Error('Stillbilderna är nästan lika: inget att para med filmen.');
  const A: number[][] = B.map(() => []);
  for await (const f of rutor(film, w, h)) B.forEach((b, i) => { let s = 0; for (const q of ror) s += Math.abs(b.px[3 * q] - f[3 * q]) + Math.abs(b.px[3 * q + 1] - f[3 * q + 1]) + Math.abs(b.px[3 * q + 2] - f[3 * q + 2]); A[i].push(s / ror.length / 3); });
  const M = A[0].length;
  // (paren i stigande ordning med minst summa: bästa[i][f] är bild i i ruta f, med bilderna före i tidigare rutor)
  const basta = A.map(() => new Float64Array(M).fill(Infinity)), fran = A.map(() => new Int32Array(M).fill(-1));
  for (let f = 0; f < M; f++) basta[0][f] = A[0][f];
  for (let i = 1; i < B.length; i++) { let m = Infinity, mf = -1; for (let f = 0; f < M; f++) { if (f > 0 && basta[i - 1][f - 1] < m) { m = basta[i - 1][f - 1]; mf = f - 1; } if (mf >= 0) { basta[i][f] = m + A[i][f]; fran[i][f] = mf; } } }
  let f = basta[B.length - 1].reduce((b, x, k, a) => x < a[b] ? k : b, 0); const val: number[] = [];
  for (let i = B.length - 1; i >= 0; i--) { val[i] = f; f = fran[i][f]; }
  // (rutorna intill den valda som är inom 15 % lika nära: där står filmen still, och vilken av dem som är bilden avgörs nedan)
  const lika = val.map((f, i) => { let a = f, b = f; while (a > 0 && A[i][a - 1] <= 1.15 * A[i][f]) a--; while (b < M - 1 && A[i][b + 1] <= 1.15 * A[i][f]) b++; return [a, b] as [number, number]; });
  const alla = B.map((b, i) => ({dockruta: b.ruta, filmruta: val[i], lika: lika[i], bild: path.basename(b.fil), avstand: Math.round(A[i][val[i]] * 100) / 100}));
  const typiskt = [...alla].map(a => a.avstand).sort((x, y) => x - y)[alla.length >> 1];
  ankare = alla.filter((a, i) => i === 0 || i === alla.length - 1 || a.avstand <= gans * typiskt);
  utan = alla.filter(a => !ankare.includes(a)).map(a => ({...a, varfor: `bästa rutan ${a.avstand} mot ${typiskt} för bilderna i mitten: filmen gick inte genom bilden`}));
  // (där filmen står still över flera rutor är bilden den av dem som ger jämn takt mot ankarna före och efter)
  for (let i = 1; i < ankare.length - 1; i++) { const a = ankare[i], f = ankare[i - 1], e = ankare[i + 1], mal = f.filmruta + (a.dockruta - f.dockruta) * (e.filmruta - f.filmruta) / (e.dockruta - f.dockruta);
    a.filmruta = Math.min(e.filmruta - 1, Math.max(f.filmruta + 1, Math.round(Math.min(a.lika[1], Math.max(a.lika[0], mal))))); }
  for (const a of alla) console.log(`dockruta ${String(a.dockruta).padStart(3)}  filmruta ${String(a.filmruta).padStart(3)}${a.lika[0] < a.lika[1] ? ` (lika ${a.lika[0]}–${a.lika[1]})` : ''}  avstånd ${a.avstand.toFixed(1).padStart(5)}${ankare.includes(a) ? '' : '  utanför'}  ${a.bild}`);
  if (process.argv.includes('--visa')) A.forEach((r, i) => console.log(B[i].ruta, r.map(x => x.toFixed(1)).join(' ')));
  if (taktFil) writeFileSync(taktFil, JSON.stringify({om: 'Filmens ruta för dockans ruta: stillbilderna parade med filmrutan som liknar dem mest (standarddocka/verktyg/i-dockans-takt.ts). Mellan ankarna läses filmen rakt.', film: path.basename(film), filmRutor: antal, filmTakt: takt, docka: path.basename(docka), dockRutor: rorelse.frameCount, dockTakt: rorelse.fps, ankare, utan}, null, 1) + '\n');
} else {
  const t = JSON.parse(readFileSync(taktFil!, 'utf8')) as {ankare: Ankare[]; filmRutor: number; dockRutor: number};
  if (t.filmRutor !== antal || t.dockRutor !== rorelse.frameCount) throw Error(`${taktFil} gäller en film med ${t.filmRutor} rutor och en rörelse med ${t.dockRutor}, inte ${antal} och ${rorelse.frameCount}.`);
  ankare = t.ankare;
}
if (ankare.length < 2) throw Error('Färre än två ankare: takten går inte att läsa.');

/** Filmens läge (i rutor, med bråk) för dockans ruta k: rakt mellan ankarna, och utanför dem med de närmaste ankarnas lutning. */
const filmVid = (k: number) => { let i = 0; while (i < ankare.length - 2 && k > ankare[i + 1].dockruta) i++;
  const a = ankare[i], b = ankare[i + 1]; return Math.min(antal - 1, Math.max(0, a.filmruta + (k - a.dockruta) * (b.filmruta - a.filmruta) / (b.dockruta - a.dockruta))); };
const steg = Array.from({length: rorelse.frameCount}, (_, k) => k ? filmVid(k) - filmVid(k - 1) : 0);
console.log(`${rorelse.frameCount} rutor i ${rorelse.fps} rutor/s (${(rorelse.frameCount / rorelse.fps).toFixed(2)} s) ur ${antal} i ${takt} (${(antal / takt.split('/').map(Number).reduce((x, y) => x / (y || 1))).toFixed(2)} s); filmen läses ${Math.min(...steg.slice(1)).toFixed(2)} till ${Math.max(...steg).toFixed(2)} rutor per ruta`);

// ---- filmen i dockans takt ------------------------------------------------------------------------------------------
if (ut) {
  const N = W * H * 3, LIN = Float32Array.from({length: 256}, (_, v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  const tillByte = (l: number) => { const c = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(c * 255))); };
  const KOD = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart'];
  const kod = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(rorelse.fps), '-i', '-', '-vf', 'scale=out_color_matrix=bt709:out_range=tv', ...KOD, ut], {stdio: ['pipe', 'ignore', 'inherit'], windowsHide: true});
  const klar = once(kod, 'close'), las = rutor(film, W, H)[Symbol.asyncIterator](), har = new Map<number, Buffer>(); let last = -1;
  const ruta = async (i: number) => { while (last < i) { const r = await las.next(); if (r.done) throw Error(`${film} tog slut vid ruta ${last}.`); har.set(++last, r.value); } return har.get(i)!; };
  const sum = new Float32Array(N), bild = Buffer.alloc(N);
  for (let k = 0; k < rorelse.frameCount; k++) {
    // (rutans tid i filmen: från läget en halv slutare före till en halv efter; filmens ruta i täcker i - 0,5 till i + 0,5)
    const a = Math.max(-0.5, filmVid(k - oskarpa / 2)), b = Math.min(antal - 0.5, filmVid(k + oskarpa / 2)), vikt: [number, number][] = [];
    // (en slutare kortare än en filmruta blandar inget: två rutor blandade blir två kort, inte oskärpa)
    if (b - a < 1) vikt.push([Math.round(filmVid(k)), 1]);
    else for (let i = Math.max(0, Math.round(a)); i <= Math.min(antal - 1, Math.round(b)); i++) { const w = Math.min(b, i + 0.5) - Math.max(a, i - 0.5); if (w > 1e-6) vikt.push([i, w / (b - a)]); }
    for (const key of [...har.keys()]) if (key < vikt[0][0]) har.delete(key);
    if (vikt.length === 1) { bild.set(await ruta(vikt[0][0])); }
    else { sum.fill(0); for (const [i, w] of vikt) { const f = await ruta(i); for (let q = 0; q < N; q++) sum[q] += LIN[f[q]] * w; } for (let q = 0; q < N; q++) bild[q] = tillByte(sum[q]); }
    if (!kod.stdin.write(bild)) await once(kod.stdin, 'drain');
  }
  kod.stdin.end(); const [slut] = await klar; if (slut !== 0) throw Error('FFmpeg kunde inte skriva filmen.');
  console.log(`${ut}: ${rorelse.frameCount} rutor${oskarpa ? `, rörelseoskärpa ${oskarpa}` : ''}`);
}
