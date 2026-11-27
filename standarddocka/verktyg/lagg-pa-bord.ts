// Lägger en dealer som är filmad i nyckelfärger (editorns utseende nyckel: grönt överallt) på vårt eget bord: dealern
// och stolen klipps ut ur den gröna filmen och läggs på en bild av bordet ensamt, tagen genom samma kamera, och kortet
// ritas av oss. Bordet, bakgrunden och ljuset är då samma bildpunkter i varje klipp, hur filmmodellen än har ritat det
// gröna, och bara dealern kommer ur filmen (Jakob 2026-11-26: "bordet och allt omkring bli grönt och sedan ska vi lägga
// in den utskurne avataren ovanpå ... tillbaka till 3d-bordet. Så gör väl dealer").
//
//   node standarddocka/verktyg/lagg-pa-bord.ts <grön film.mp4> [<fler filmer> …] --platta <bordet ensamt.png>
//        (--ut <film.mp4> | --ut-mapp <mapp>)   flera filmer (klippen ur en tagning) läggs i en körning, med samma namn i mappen
//        [--docka <rörelse.json> [--takt <takt.json>] [--valor H7] [--visa]]   kortet ritas av oss (Kortet nedan): rörelsen
//                         som filmen är gjord efter, och vilken dockruta varje filmruta är (i-dockans-takt.ts --takt; utan
//                         den är filmens ruta dockans ruta). --valor är framsidan med kortatlasens namn (H7, SK, D10 …), och
//                         --visa skriver kortets läge i varje ruta
//        [--skugga 1]     hur mycket av dealerns skugga på filten som läggs på vårt bord (0 ingen, 1 som i filmen)
//        [--falt <film>]  det rena gröna mäts i den filmen i stället: hela tagningen, när filmen som läggs är ett klipp
//                         ur den (i ett kort klipp ligger skuggan kvar på samma ställe och räknas annars som rent grönt)
//        [--hall 46,52]   de rutorna (räknat från 0) ersätts av rutan före: en ruta som filmmodellen har ritat fel, som när
//                         Kling ritade mannen större på en enda ruta (ruta 46, 2026-11-27)
//        [--egen-sko <bordet med vår sko.png> [--sko-ruta 30]]   skon och kortleken är våra: där den plattan skiljer sig
//                         från --platta (skon, med en marginal) tas ur filmen bara handen och ärmen (hud, och dealerns
//                         färger där filmen har ändrats sedan --sko-ruta); filmens sko, kortlek och glaskanter byts mot
//                         plattans (domaren 2026-11-27: Klings kortlek blev trappstegig och prickig). Filmens stilla sko
//                         och kortlek mäts i --sko-ruta, där handen inte är vid skon
//
// Dealerns färger mäts i filmen själv, inget antas om skjortan: allt som inte är grönt i tagningens första ruta (kortet ligger
// då i skon), utom skons område och spårkortet, är dealern (hud, hår, skjorta och stolen). Det avgör vad som är handen och
// ärmen vid skon och framför vårt kort.
//
// Plattorna ligger fast i standarddocka/klipp/ (utanför Git): platta-bord-ensamt.png (--platta) och platta-bord-med-sko.png
// (--egen-sko), livebordet genom sin egen kamera i 1728 x 972. De görs om när bordet eller rummet ändras, båda i en
// körning (på en rad): editorn filmar en stilla ruta utan docka, kort, sko och stol, visar skon och filmar en till,
//   node standarddocka/verktyg/titta.ts --utan docka,kort,sko,stol --kor "(async () => [await window.editor.spelaIn(['spel'], 0, 0, {namn: 'platta-bord-ensamt', stilla: 0.04}), window.editor.visa('sko', true), await window.editor.spelaIn(['spel'], 0, 0, {namn: 'platta-bord-med-sko', stilla: 0.04})])()"
// och för var och en av de två (standarddocka/klipp/<namn>-kameran-danilo.mp4) blir rutan plattan och filmen tas bort:
//   ffmpeg -i standarddocka/klipp/<namn>-kameran-danilo.mp4 -frames:v 1 -y standarddocka/klipp/<namn>.png
// Arbetet görs i plattans storlek, och filmen skalas till den. Två knep är lånade ur
// blackjack-dealer (src/scene3d-film.ts, src/film-after.ts):
//  - Det gröna mäts i varje ruta för sig, på ett ställe på filten och ett i bakgrunden som ingenting går över i filmen
//    (bordet läses ur table-live.ts LIVE genom livebordets kamera), och varje bildpunkts grönhet räknas mot bordets eller
//    bakgrundens. Utklippet följer då med när filmmodellen låter det gröna glida i ton under en lång tagning.
//  - Skuggan läggs som en kvot: hur mycket mörkare en grön bildpunkt är än det rena gröna på samma ställe (det ljusaste
//    stället har haft under hela filmen, eftersom skuggorna flyttar sig) gånger vårt bord. Skuggan följer då händerna,
//    men bordets egen färg och tryck är våra.
//
// Kortet (--docka; Jakob 2026-11-27: inget "rött överlägg", ryggen "ska i och för sig vara mönstrat röd", och kortet
// slätt och lika stort hela filmen). Filmens spårkort (gul rygg, vit framsida, turkos ram, rosa märke, och det grå och
// vita innanför dem) tas bort helt, också dess kant mot det gröna, och vårt eget kort ritas i dess ställe:
// ryggen och framsidan ur kortatlasen som bordets kort (avatar-auto-pipeline/assets/bord/kort/kortatlas.png, samma
// mönstrade röda rygg som korten i vår sko), i kortets riktiga storlek (space.ts CARD) genom livebordets kamera
// (table-live.ts LIVE_CAMERA), med runda hörn, rätt perspektiv och utan kant.
//  - Läget är dockans kort (rörelsens frames[].card) i dockrutan som filmrutan svarar mot, men filmens kort avgör: i varje
//    ruta söks den dockruta (inom 12 rutor) och den förskjutning på filten (högst 12 cm och 40 grader kring lodlinjen) där
//    vårt kort bäst täcker kärnan av filmens kort, så att kortet sitter i handen. Att vårt kort sticker ut över det gröna
//    väger lätt, eftersom filmmodellen ritar kortet mindre än ett riktigt. I en ruta där filmens kort inte syns (i skon,
//    bakom handen, på kant) följer kortet dockan med förskjutningen från rutorna omkring. Kortet i skon förskjuts inte:
//    där ligger det som vår sko har det. Läget jämnas över rutan före och efter, och där kortet ligger still får det ett
//    enda läge.
//  - Fingrarna och handen ligger framför kortet där de täcker det. Där ett finger och filmens gula kort är blandade i
//    samma bildpunkt (kanten mellan dem, och ett finger som är suddigt över kortet) hör bildpunkten till dealern så mycket
//    som dess ton är hud och inte gult (HUD, hudDel), och det gula tas ur dess färg; likadant vid skons mynning mot
//    kortlekens gula. Filmens kort tas bort också där det är utsmetat av farten (blekt gult, eller en fläck av spårfärg
//    blandad i det gröna) och där det är mörkt i handens skugga.
//  - Den del av kortet som ännu är inne i skon (bakom skons front och mellan dess väggar, LIVE.shoe) ritas inte: där
//    syns vår skos nästa kort, och kortet kommer ut genom mynningen under fingrarna.
//  - Kortets ljus: ryggen i skons fönster lika ljus som skons nästa kort i plattan med vår sko, framsidan med samma ljus
//    utan färg, och något mörkare ju mer kortet står på kant. Där kortet rör sig fort blir det suddigt som handen (en halv
//    rutas slutare).
// Kräver FFmpeg på datorn (FFMPEG och FFPROBE pekar ut dem om de inte ligger i sökvägen).
import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {CARD, type Vec3} from '../../blackjack-dealer/src/space.ts';
import {LIVE, LIVE_CAMERA, liveFrame, liveShoeCard} from '../../blackjack-dealer/src/table-live.ts';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const forstaVal = process.argv.findIndex((x, i) => i >= 2 && x.startsWith('--')), filmer = process.argv.slice(2, forstaVal < 0 ? undefined : forstaVal), film = filmer[0];
const platta = arg('--platta'), ut = arg('--ut'), utMapp = arg('--ut-mapp'), skugga = Number(arg('--skugga') ?? '1'), falt = arg('--falt') ?? film, egenSko = arg('--egen-sko'), skoRuta = Number(arg('--sko-ruta') ?? '30'), hall = new Set((arg('--hall') ?? '').split(',').filter(Boolean).map(Number));
const dockFil = arg('--docka'), taktFil = arg('--takt'), valor = (arg('--valor') ?? 'H7').toUpperCase(), visa = process.argv.includes('--visa');
if (process.argv.includes('--kortfarger')) throw Error('--kortfarger finns inte längre: kortet ritas av oss med --docka <rörelse.json> --takt <takt.json>.');
if (!film || !platta || !(filmer.length === 1 ? ut || utMapp : utMapp) || !(skugga >= 0 && skugga <= 1) || (taktFil && !dockFil)) throw Error('node standarddocka/verktyg/lagg-pa-bord.ts <grön film.mp4> [<fler filmer> …] --platta <bordet ensamt.png> (--ut <film.mp4> | --ut-mapp <mapp>) [--docka <rörelse.json> [--takt <takt.json>] [--valor H7] [--visa]] [--skugga 1] [--falt <hela tagningen.mp4>] [--hall <ruta,ruta>] [--egen-sko <bordet med vår sko.png> [--sko-ruta 30]]');
const FFMPEG = process.env.FFMPEG || 'ffmpeg', FFPROBE = process.env.FFPROBE || 'ffprobe';
const mat = (fil: string) => spawnSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'csv=p=0', fil], {encoding: 'utf8'}).stdout.trim().split(',');
const [W, H] = mat(platta).slice(0, 2).map(Number), takt = mat(film)[2];
if (!(W > 0 && H > 0)) throw Error(`${platta} gick inte att läsa.`);
if (!takt) throw Error(`${film} gick inte att läsa.`);
const N = W * H * 3, WH = W * H;

/** Filmens (eller bildens) rutor som rå RGB i plattans storlek, en i taget. */
async function* rutor(fil: string): AsyncGenerator<Buffer> {
  const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', fil, '-vf', `scale=${W}:${H}:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true});
  let kvar: Buffer = Buffer.alloc(0);
  for await (const bit of p.stdout) { kvar = kvar.length ? Buffer.concat([kvar, bit as Buffer]) : bit as Buffer; while (kvar.length >= N) { yield kvar.subarray(0, N); kvar = kvar.subarray(N); } }
}
const ljus = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const LO = 0.12, HI = 0.5;
/** Hur grön en bildpunkt är mot rutans rena gröna (0 inte alls, 1 helt): grönt över det största av rött och blått. */
const gron = (r: number, g: number, b: number, ren: number) => { const s = (g - Math.max(r, b)) / ren; return s <= LO ? 0 : s >= HI ? 1 : (s - LO) / (HI - LO); };

// Livebordets kamera i arbetets bildpunkter (plattans storlek; bildpunkternas mitt räknas, som i table-live.ts).
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3) => mul(a, 1 / Math.hypot(a[0], a[1], a[2])), lerp = (a: Vec3, b: Vec3, u: number) => add(a, mul(sub(b, a), u));
const RAM = liveFrame(LIVE_CAMERA), sk = W / LIVE_CAMERA.film.width, FOK = LIVE_CAMERA.focalPx * sk, CX = (LIVE_CAMERA.centre.x + 0.5) * sk - 0.5, CY = (LIVE_CAMERA.centre.y + 0.5) * sk - 0.5;
if (Math.abs(H - LIVE_CAMERA.film.height * sk) > 1) throw Error(`Plattan (${W} x ${H}) har inte livebordets bildform (${LIVE_CAMERA.film.width} x ${LIVE_CAMERA.film.height}).`);
/** Var kameran ritar punkten p. */
const se = (p: Vec3): [number, number] => { const d = sub(p, RAM.position), z = Math.max(1e-6, dot(d, RAM.forward)); return [CX + FOK * dot(d, RAM.right) / z, CY - FOK * dot(d, RAM.up) / z]; };

// Bordet i bilden, ur livebordet (table-live.ts LIVE) genom kameran. SKIVA är bordets skiva: filten, relingen runt den (ut till
// relingens bredd i filtens höjd och halva bredden i dess topp) och hyllan bakom dealerns kant vid hans höger, ut till
// relingens yttre kant. Där får dealerns skugga falla, aldrig på golvet eller väggen (Kling 2026-11-27: skuggan lades där
// som ett rutmönster). BORD är skivan och bordets sida under den ner till bildens underkant; där räknas det gröna mot
// filtens gröna, och annars mot bakgrundens.
const {felt, rail, shelf} = LIVE, SKIVA = new Uint8Array(WH), BORD = new Uint8Array(WH);
/** Ligger punkten p på skivan, med relingen ut till w från filtens kant? */
const paSkivan = (p: Vec3, w: number) => (Math.hypot(p[0] - felt.centre[0], p[2] - felt.centre[2]) <= felt.radius + w && p[2] >= felt.edgeZ - w)
  || (p[0] >= felt.centre[0] - felt.radius - rail.width && p[0] <= shelf.right && p[2] <= felt.edgeZ && p[2] >= felt.edgeZ - shelf.back);
/** Var strålen genom bildpunkten (x, y) når höjden h över filten, eller null. */
const nar = (x: number, y: number, h: number): Vec3 | null => { const d = add(RAM.forward, add(mul(RAM.right, (x - CX) / FOK), mul(RAM.up, -(y - CY) / FOK))), t = (h - RAM.position[1]) / d[1]; return t > 0 ? add(RAM.position, mul(d, t)) : null; };
for (let x = 0; x < W; x++) { let ovan = H;
  for (let y = 0; y < H; y++) { const p0 = nar(x, y, 0), p1 = nar(x, y, rail.above); if ((p0 && paSkivan(p0, rail.width)) || (p1 && paSkivan(p1, rail.width / 2))) { SKIVA[y * W + x] = 1; if (y < ovan) ovan = y; } }
  for (let y = ovan; y < H; y++) BORD[y * W + x] = 1; }
// Där det rena gröna mäts i varje ruta: en ruta på filten och en i bakgrunden som ingenting går över i filmen. Filtens
// ställen ligger 10 cm innanför relingen mot var och en av spelarnas platser (LIVE.betMarks), framför kortplatserna där
// dealerns händer, korten och skon inte når när han ger; bakgrundens i bildens två övre hörn, om de ligger utanför bordet.
// Av dem tas det som var grönast i sin sämsta ruta under filmen, alltså det som ingenting gick över.
const RUTA = 32, medel = (f: Buffer, x0: number, y0: number) => { let r = 0, g = 0, b = 0; for (let y = y0; y < y0 + RUTA; y++) for (let x = x0; x < x0 + RUTA; x++) { const o = (y * W + x) * 3; r += f[o]; g += f[o + 1]; b += f[o + 2]; } const n = RUTA * RUTA; return [r / n, g / n, b / n]; };
const helt = (x0: number, y0: number, i: Uint8Array, ja: number) => { if (x0 < 0 || y0 < 0 || x0 + RUTA > W || y0 + RUTA > H) return false; for (let y = y0; y < y0 + RUTA; y++) for (let x = x0; x < x0 + RUTA; x++) if (i[y * W + x] !== ja) return false; return true; };
const STALLEN = {filt: LIVE.betMarks.map(m => { const d = Math.hypot(m[0] - felt.centre[0], m[2] - felt.centre[2]), r = felt.radius - 0.1, [x, y] = se([felt.centre[0] + (m[0] - felt.centre[0]) * r / d, 0, felt.centre[2] + (m[2] - felt.centre[2]) * r / d]); return [Math.round(x - RUTA / 2), Math.round(y - RUTA / 2)]; }).filter(([x, y]) => helt(x, y, SKIVA, 1)),
  bakgrund: [[8, 8], [W - 8 - RUTA, 8]].filter(([x, y]) => helt(x, y, BORD, 0))};
// Första varvet: var det gröna mäts (och tagningens första ruta, där dealerns färger mäts, och rutan där skon står orörd).
const samst = {filt: STALLEN.filt.map(() => Infinity), bakgrund: STALLEN.bakgrund.map(() => Infinity)};
let skoBild: Buffer | null = null, forstaBild: Buffer | null = null, varv1 = 0;
for await (const f of rutor(falt)) {
  if (!varv1) forstaBild = Buffer.from(f);
  if (varv1++ === skoRuta) skoBild = Buffer.from(f);
  for (const slag of ['filt', 'bakgrund'] as const) STALLEN[slag].forEach(([x, y], i) => { const [r, g, b] = medel(f, x, y); samst[slag][i] = Math.min(samst[slag][i], g - Math.max(r, b)); });
}
const valt = (slag: 'filt' | 'bakgrund') => { let i = -1; samst[slag].forEach((s, j) => { if (i < 0 || s > samst[slag][i]) i = j; }); if (i < 0 || !(samst[slag][i] > 30)) throw Error(`${falt}: hittar inget rent grönt ${slag === 'filt' ? 'på bordets filt' : 'i bakgrunden'} genom livebordets kamera. Är filmen inspelad i utseendet nyckel vid livebordet?`); return STALLEN[slag][i]; };
const MATT_FILT = valt('filt'), MATT_BAK = valt('bakgrund');
/** Rutans rena gröna: i bakgrunden (ru) och på filten (rn), och filtens ljus. */
const renaGrona = (f: Buffer) => { const u = medel(f, MATT_BAK[0], MATT_BAK[1]), n = medel(f, MATT_FILT[0], MATT_FILT[1]); return {ru: u[1] - Math.max(u[0], u[2]), rn: n[1] - Math.max(n[0], n[2]), ln: ljus(n[0], n[1], n[2])}; };
if (visa) console.log(`det gröna mäts på filten vid (${MATT_FILT.map(v => v + RUTA / 2).join(', ')}) och i bakgrunden vid (${MATT_BAK.map(v => v + RUTA / 2).join(', ')})`);

// Andra varvet, på var fjärde bildpunkt: bordets rena gröna ljus per ställe (det ljusaste en helt grön bildpunkt där har
// varit under filmen, räknat mot rutans eget gröna på filten så att filmens glidning i ton inte räknas in).
const C = 4, cw = Math.ceil(W / C), ch = Math.ceil(H / C), rent = new Float32Array(cw * ch), iBord = (i: number, j: number) => BORD[Math.min(H - 1, j * C) * W + Math.min(W - 1, i * C)] === 1;
for await (const f of rutor(falt)) { const {rn, ln} = renaGrona(f);
  for (let y = 0; y < H; y += C) for (let x = 0; x < W; x += C) { const o = (y * W + x) * 3, r = f[o], g = f[o + 1], b = f[o + 2]; if (!BORD[y * W + x] || gron(r, g, b, rn) < 1) continue; const k = (y / C | 0) * cw + (x / C | 0), l = ljus(r, g, b) / ln; if (l > rent[k]) rent[k] = l; } }
// Ställen på bordet som aldrig var rent gröna (under skon, vid kanten) får grannarnas värde; sedan jämnas fältet ut, så att
// en skugga som låg kvar på ett ställe hela filmen fylls i av det omkring.
for (let varv = 0; varv < 40; varv++) { let tomma = 0; const forra = rent.slice(); for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const k = j * cw + i; if (forra[k] > 0 || !iBord(i, j)) continue; let s = 0, n = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + dx, y = j + dy; if (x < 0 || x >= cw || y < 0 || y >= ch) continue; const v = forra[y * cw + x]; if (v > 0) { s += v; n++; } } if (n) rent[k] = s / n; else tomma++; } if (!tomma) break; }
for (let varv = 0; varv < 3; varv++) { const forra = rent.slice(), R = 6; for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { if (!iBord(i, j)) continue; let s = 0, n = 0, m = 0;
  for (let dy = -R; dy <= R; dy += 3) for (let dx = -R; dx <= R; dx += 3) { const x = i + dx, y = j + dy; if (x < 0 || x >= cw || y < 0 || y >= ch || !iBord(x, y)) continue; const v = forra[y * cw + x]; if (v > 0) { s += v; n++; if (v > m) m = v; } }
  if (n) rent[j * cw + i] = (s / n + m) / 2; } }

// Plattorna, och det som är samma för varje film.
const forstaRutan = async (fil: string) => { for await (const f of rutor(fil)) return Buffer.from(f); throw Error(`${fil} gick inte att läsa.`); };
const P = await forstaRutan(platta);
const KOD = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart'];
if (utMapp) mkdirSync(utMapp, {recursive: true});
const K = new Float32Array(WH), A = new Float32Array(WH), S = new Float32Array(WH), T = new Float32Array(WH), D = new Uint8ClampedArray(N);
/** Det rena gröna ljuset på stället (rutnätet `rent`), läst mjukt mellan rutnätets punkter och inte i rutor. */
const rentVid = (x: number, y: number) => { const fx = x / C - 0.5, fy = y / C - 0.5, i = Math.max(0, Math.min(cw - 2, Math.floor(fx))), j = Math.max(0, Math.min(ch - 2, Math.floor(fy))), u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fy - j));
  return (rent[j * cw + i] * (1 - u) + rent[j * cw + i + 1] * u) * (1 - v) + (rent[(j + 1) * cw + i] * (1 - u) + rent[(j + 1) * cw + i + 1] * u) * v || 1; };
/** Fältet v jämnat med en låda på 2R + 1 bildpunkter i båda led. */
const lada = (v: Float32Array, R: number) => { const n = 2 * R + 1;
  for (let y = 0; y < H; y++) { const r0 = y * W; let s = 0; for (let x = -R; x <= R; x++) s += v[r0 + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { T[r0 + x] = s / n; s += v[r0 + Math.min(W - 1, x + R + 1)] - v[r0 + Math.max(0, x - R)]; } }
  for (let x = 0; x < W; x++) { let s = 0; for (let y = -R; y <= R; y++) s += T[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { v[y * W + x] = s / n; s += T[Math.min(H - 1, y + R + 1) * W + x] - T[Math.max(0, y - R) * W + x]; } } };
// Vår egen sko (--egen-sko): plattan med skon, och skons område där den skiljer sig från plattan utan sko, med marginal.
const P2 = egenSko ? await forstaRutan(egenSko) : null, SKO = new Uint8Array(WH), M = new Float32Array(WH), M2 = new Float32Array(WH);
if (P2) { const s = new Float32Array(WH); for (let q = 0; q < WH; q++) { const o = q * 3; s[q] = Math.abs(P2[o] - P[o]) + Math.abs(P2[o + 1] - P[o + 1]) + Math.abs(P2[o + 2] - P[o + 2]) > 24 ? 1 : 0; }
  lada(s, 6); for (let q = 0; q < WH; q++) SKO[q] = s[q] > 0.02 ? 1 : 0; }
/** Spårkortets färger i filmen (gul rygg, vit framsida, turkos ram), också mjukt blandade som en filmmodell ritar dem. */
const kortFarg = (r: number, g: number, b: number) => (r > 100 && Math.min(r, g) - b > 25 && b < 0.65 * g) || (Math.min(r, g, b) > 190 && Math.max(r, g, b) - Math.min(r, g, b) < 40) || (b > 120 && r < 0.72 * g && g > 0.86 * b);
// Filmens stilla kortlek (DEKK): kortfärgat i skons område i en ruta där handen inte är vid skon (--sko-ruta, 30), med
// marginal. Kortfärgat utanför den är kortet som dras. STILL är den rutan utan det gröna som spiller över.
const DEKK = new Uint8Array(WH), STILL = new Uint8Array(P2 ? N : 0);
if (P2) { if (!skoBild) throw Error(`--sko-ruta ${skoRuta} finns inte i ${falt}.`); const d = new Float32Array(WH);
  for (let q = 0; q < WH; q++) { const o = q * 3; let r = skoBild[o], g = skoBild[o + 1], b = skoBild[o + 2]; if (g > Math.max(r, b)) g = Math.max(r, b); STILL[o] = r; STILL[o + 1] = g; STILL[o + 2] = b; d[q] = SKO[q] && kortFarg(r, g, b) ? 1 : 0; }
  lada(d, 3); for (let q = 0; q < WH; q++) DEKK[q] = d[q] > 0.02 ? 1 : 0; }

// ---- kortet (--docka) ---------------------------------------------------------------------------------------------------
type Kort = {c: Vec3; l: Vec3; n: Vec3};
/** Kortets läge i en filmruta: dockruta t (med bråk), flyttat dx och dz meter på filten och vridet v radianer kring lodlinjen. */
type Lage = {t: number; dx: number; dz: number; v: number};
const rorelse = dockFil ? JSON.parse(readFileSync(dockFil, 'utf8')) as {frameCount: number; frames: {card: Kort}[]} : null, SIST = rorelse ? rorelse.frames.length - 1 : 0;
const ankare = taktFil ? (JSON.parse(readFileSync(taktFil, 'utf8')) as {ankare: {dockruta: number; filmruta: number}[]}).ankare : null;
if (ankare && ankare.length < 2) throw Error(`${taktFil}: färre än två ankare.`);
/** Dockrutan som filmrutan f svarar mot: rakt mellan ankarna i --takt, annars samma ruta. */
const dockrutaVid = (f: number) => { if (!ankare) return Math.min(SIST, f); let i = 0; while (i < ankare.length - 2 && f > ankare[i + 1].filmruta) i++;
  const a = ankare[i], b = ankare[i + 1]; return Math.max(0, Math.min(SIST, a.dockruta + (f - a.filmruta) * (b.dockruta - a.dockruta) / (b.filmruta - a.filmruta))); };
/** Dockans kort vid dockruta t: mitten rakt mellan rutorna, riktningarna mjukt. */
const dockKort = (t: number): Kort => { const F = rorelse!.frames, i = Math.max(0, Math.min(SIST, Math.floor(t))), j = Math.min(SIST, i + 1), u = Math.max(0, Math.min(1, t - i)), a = F[i].card, b = F[j].card;
  const l = unit(lerp(a.l, b.l, u)), n0 = lerp(a.n, b.n, u); return {c: lerp(a.c, b.c, u), l, n: unit(sub(n0, mul(l, dot(n0, l))))}; };
/** Kortet i läget L. Förskjutningen gäller fullt först när dockans kort har lämnat sitt första läge med 2 cm: i skon ligger kortet som vår sko har det. */
const kortVid = (L: Lage): Kort => { const k = dockKort(L.t), w = Math.min(1, Math.hypot(...sub(k.c, rorelse!.frames[0].card.c)) / 0.02), c = Math.cos(L.v * w), s = Math.sin(L.v * w);
  const r = (p: Vec3): Vec3 => [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; return {c: [k.c[0] + L.dx * w, k.c[1], k.c[2] + L.dz * w], l: r(k.l), n: r(k.n)}; };
/** Kortets fyra hörn i bilden, runt om. */
const horn = (k: Kort) => { const a = cross(k.n, k.l), h = CARD.height / 2, w = CARD.width / 2; return [[-h, -w], [h, -w], [h, w], [-h, w]].map(([u, v]) => se(add(k.c, add(mul(k.l, u), mul(a, v))))); };
/** Kortets längd i bilden: den längre diagonalen mellan hörnen. */
const langd = (q: [number, number][]) => Math.max(Math.hypot(q[2][0] - q[0][0], q[2][1] - q[0][1]), Math.hypot(q[3][0] - q[1][0], q[3][1] - q[1][1]));
/** Ligger (x, y) i den konvexa fyrhörningen q? */
const iFyra = (q: [number, number][], x: number, y: number) => { let pos = 0, neg = 0; for (let i = 0; i < 4; i++) { const [ax, ay] = q[i], [bx, by] = q[(i + 1) & 3], c = (bx - ax) * (y - ay) - (by - ay) * (x - ax); if (c > 0) pos++; else if (c < 0) neg++; } return !pos || !neg; };
type Lada = {x0: number; y0: number; x1: number; y1: number};
const ladaKring = (pts: [number, number][], marg: number): Lada => ({x0: Math.max(0, Math.floor(Math.min(...pts.map(p => p[0])) - marg)), y0: Math.max(0, Math.floor(Math.min(...pts.map(p => p[1])) - marg)), x1: Math.min(W, Math.ceil(Math.max(...pts.map(p => p[0])) + marg + 1)), y1: Math.min(H, Math.ceil(Math.max(...pts.map(p => p[1])) + marg + 1))});
// Skons front: en punkt bakom den och mellan skons väggar är inne i skon.
const [fd, fp, , td] = LIVE.shoe.frontCorners as Vec3[], langs = sub(fp, fd), bred = Math.hypot(...langs), framUt = (() => { const n = unit(cross(langs, sub(td, fd))); return dot(sub(LIVE.shoe.foot.back, fd), n) > 0 ? mul(n, -1) : n; })();
const iSkon = (p: Vec3) => { const d = sub(p, fd), s = dot(d, langs) / bred, b = dot(d, framUt); return b < 0 && b > -LIVE.shoe.length - 0.02 && s > -0.004 && s < bred + 0.004 && p[1] < LIVE.shoe.backHeight + 0.01; };
// Kortatlasen: 13 x 5 rutor, spader, hjärter, ruter och klöver ess till kung, och sist baksidan; i linjärt ljus.
const ATLAS = path.join(import.meta.dirname, '../../avatar-auto-pipeline/assets/bord/kort/kortatlas.png'), RANGER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], farg = 'SHDC'.indexOf(valor[0]), rang = RANGER.indexOf(valor.slice(1));
if (rorelse && (farg < 0 || rang < 0)) throw Error(`--valor ${valor}: färgen S, H, D eller C och valören A, 2–10, J, Q eller K, som H7 eller SK.`);
const LIN = Float32Array.from({length: 256}, (_, v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const tillByte = (l: number) => { const c = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(255, c * 255)); };
type Bild = {w: number; h: number; px: Float32Array};
const cellen = (i: number): Bild => { const [aw, ah] = mat(ATLAS).slice(0, 2).map(Number), w = Math.round(aw / 13), h = Math.round(ah / 5);
  const raw = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', ATLAS, '-vf', `crop=${w}:${h}:${(i % 13) * w}:${Math.floor(i / 13) * h}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 1 << 28, windowsHide: true}).stdout as Buffer;
  if (!raw || raw.length !== w * h * 3) throw Error(`${ATLAS} gick inte att läsa.`); return {w, h, px: Float32Array.from(raw, v => LIN[v])}; };
const FRAM = rorelse ? cellen(farg * 13 + rang) : null, RYGG = rorelse ? cellen(52) : null;
/** Bilden läst mjukt i (x, y), in i ut. */
const prov = (B: Bild, x: number, y: number, ut: number[]) => { x = Math.max(0, Math.min(B.w - 1.001, x)); y = Math.max(0, Math.min(B.h - 1.001, y)); const i = x | 0, j = y | 0, u = x - i, v = y - j, o = (j * B.w + i) * 3, o2 = o + B.w * 3;
  for (let c = 0; c < 3; c++) ut[c] = (B.px[o + c] * (1 - u) + B.px[o + 3 + c] * u) * (1 - v) + (B.px[o2 + c] * (1 - u) + B.px[o2 + 3 + c] * u) * v; };
// Kortets ljus mot plattan: skons nästa kort (liveShoeCard, ryggen ut) i plattan med vår sko mot kortatlasens rygg, som en
// förstärkning och ett neutralt lyft lika i alla färger (olika förstärkning per färg gör kortets vita kant turkos).
const vinkelLjus = (syns: Vec3) => 0.8 + 0.2 * Math.max(0, syns[1]);
let ljusGang = 1, ljusLyft = 0;
if (rorelse && P2) { const s = liveShoeCard(), q = horn({c: s.centre, l: s.long, n: mul(s.out, -1)}), mx = q.reduce((a, p) => a + p[0] / 4, 0), my = q.reduce((a, p) => a + p[1] / 4, 0), inre = q.map(([x, y]) => [mx + (x - mx) * 0.6, my + (y - my) * 0.6] as [number, number]), b = ladaKring(inre, 0);
  const pm = [0, 0, 0], am = [0, 0, 0]; let n = 0; for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) if (iFyra(inre, x, y)) { const o = (y * W + x) * 3; for (let c = 0; c < 3; c++) pm[c] += LIN[P2[o + c]]; n++; }
  let m = 0; for (let y = RYGG!.h * 0.2 | 0; y < RYGG!.h * 0.8; y++) for (let x = RYGG!.w * 0.2 | 0; x < RYGG!.w * 0.8; x++) { const o = (y * RYGG!.w + x) * 3; for (let c = 0; c < 3; c++) am[c] += RYGG!.px[o + c]; m++; }
  // (plattan = förstärkning gånger atlasen plus lyft, minsta kvadrat över de tre färgerna, i kortets eget ljus i fönstret)
  if (n > 20) { const l = vinkelLjus(s.out), p = pm.map(x => x / n / l), a = am.map(x => x / m), ma = (a[0] + a[1] + a[2]) / 3, mp = (p[0] + p[1] + p[2]) / 3;
    const kov = a.reduce((s, x, c) => s + (x - ma) * (p[c] - mp), 0), va = a.reduce((s, x) => s + (x - ma) ** 2, 0); ljusGang = Math.max(0.2, kov / va); ljusLyft = Math.max(0, mp - ljusGang * ma); }
  if (visa) console.log(`kortets ljus: förstärkning ${ljusGang.toFixed(2)}, lyft ${ljusLyft.toFixed(3)} (skons kort i plattan över ${n} bildpunkter)`); }
/** Spårkortets gula rygg, också blekt av rörelseoskärpa (Kling 2026-11-27: kortet i farten var 245, 214, 122, och
 * verktyget såg det då inte och ritade vårt kort efter dockan, bredvid handen): blått under hälften av grönt, eller upp till
 * 0,62 av grönt när rött och grönt är nära varandra, vilket hud och hud blandad med det gröna inte är. */
const gul = (r: number, g: number, b: number) => r > 100 && Math.min(r, g) - b > 25 && (b < 0.5 * g || (b < 0.62 * g && r - g < 0.2 * r));
/** Spårkortets egna färger (gul rygg, turkos ram, rosa märke), också mjukt blandade och blekta mot det vita (ramen blir
 * ljust turkos: grönt och blått lika, rött under). */
const sparFarg = (r: number, g: number, b: number) => gul(r, g, b) || (b > 120 && r < 0.72 * g && g > 0.86 * b) || (r > 140 && b > 110 && g < Math.min(r, b) - 30)
  || (Math.min(g, b) > 170 && Math.abs(g - b) < 12 && r < Math.min(g, b) - 10) || (b > 50 && r < 0.6 * Math.min(g, b) && g > 0.8 * b && g < 1.25 * b);
/** Vitt eller grått utan färg, ljusare än min (kortets framsida, också i skugga; och en ljus skjorta). */
const graVit = (r: number, g: number, b: number, min: number) => Math.min(r, g, b) > min && Math.max(r, g, b) - Math.min(r, g, b) < 35;
/** Hud: varm, inte gul, inte kortets vita och inte rosa som märket. */
const hud = (r: number, g: number, b: number) => r > 80 && r > g + 20 && r - b > 25 && b > 0.68 * g && b <= g + 8 && g > 0.6 * r && (Math.min(r, g) < 190 || b > 0.75 * g) && Math.min(r, g, b) < 225;
// Dealerns färger (se huvudet): färgerna, utan det gröna som spiller över, i rutor om 16 steg per färg, där minst 3 på 10 000
// av den första rutans inre bildpunkter ligger (inte vid det gröna, inte vid spårkortet, inte i skons område), och rutorna
// ett steg bort i en enda färg, men inte en annan färgton eller det vitaste (kortets gula blandat i det gröna blir annars
// en ljusgrå skjorta, och kortets vita framsida en vit skjortas högdager).
const fack = (r: number, g: number, b: number) => (r >> 4) << 8 | (g >> 4) << 4 | b >> 4, PERSON = new Uint8Array(4096);
// Finger och gult kort i samma bildpunkt (kanten mellan dem, och ett finger som är suddigt över kortet). En färgs ton utan
// grått är rött över grönt och grönt över blått; den är densamma hur blek eller mörk färgen än är. Tonen ses som en blandning
// av dealerns hud (HUD, mätt i första rutan) och det gula (filmens kort i rutan, eller skons kortlek), och bildpunkten hör
// till dealern så mycket som den är hud: under 0,3 inte alls, över 0,8 helt. Förut avgjordes det med ja eller nej, och
// fingrarna över vårt kort blev borta eller fick gula flagor (domaren 2026-11-27: kortet "ligger ovanpå fingrarna").
type Ton = [number, number];
const HUD = {ton: [55, 30] as Ton, farg: [213, 158, 128], ljus: 170, linje: 0.35};   // (linje: grönt mellan blått och rött, 0–1)
/** Det gula i ett område: medeltonen över de gula bildpunkterna (minst 30), eller null. */
const gultI = (bild: Uint8Array | Uint8ClampedArray, med: (q: number) => boolean, b: Lada): Ton | null => { let u = 0, v = 0, n = 0;
  for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const q = y * W + x; if (!med(q)) continue; const o = q * 3, r = bild[o], g = bild[o + 1], bl = bild[o + 2]; if (gul(r, g, bl)) { u += r - g; v += g - bl; n++; } }
  return n >= 30 ? [u / n, v / n] : null; };
/** Hur stor del av bildpunkten som är dealerns hud (0–1) när dess ton är en blandning av hud och det gula Y, eller null när
 * den inte är en sådan blandning (kall eller grå). */
const hudDel = (r: number, g: number, b: number, Y: Ton) => { const u = r - g, v = g - b, det = HUD.ton[0] * Y[1] - Y[0] * HUD.ton[1]; if (r < g - 5 || Math.abs(det) < 200) return null;
  const s = Math.max(0, (Y[1] * u - Y[0] * v) / det), a = Math.max(0, (HUD.ton[0] * v - HUD.ton[1] * u) / det); if (s + a < 0.25) return null;
  return Math.max(0, Math.min(1, (s / (s + a) - 0.3) / 0.5)); };
/** Bildpunkten o i D målad i dealerns hudfärg, med sitt eget ljus (det gula är då ute ur den). */
const iHudfarg = (o: number) => { const k = ljus(D[o], D[o + 1], D[o + 2]) / HUD.ljus; for (let c = 0; c < 3; c++) D[o + c] = HUD.farg[c] * k; };
if (P2 || rorelse) { const f = forstaBild!, {ru, rn} = renaGrona(f), gr = new Uint8Array(WH), sp = new Float32Array(WH), n = new Float64Array(4096), h = [0, 0, 0]; let alla = 0, hn = 0;
  for (let q = 0; q < WH; q++) { const o = q * 3, r = f[o], b = f[o + 2]; let g = f[o + 1]; gr[q] = gron(r, g, b, BORD[q] ? rn : ru) > 0 ? 1 : 0; if (g > Math.max(r, b)) g = Math.max(r, b); sp[q] = !gr[q] && sparFarg(r, g, b) ? 1 : 0; }
  lada(sp, 12);
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) { const q = y * W + x; if (gr[q] || gr[q - 3] || gr[q + 3] || gr[q - 3 * W] || gr[q + 3 * W] || sp[q] > 0 || SKO[q]) continue;
    const o = q * 3, r = f[o], b = f[o + 2], g = Math.min(f[o + 1], Math.max(r, b)); n[fack(r, g, b)]++; alla++; if (hud(r, g, b)) { h[0] += r; h[1] += g; h[2] += b; hn++; } }
  if (hn > 200) { HUD.farg = h.map(v => v / hn); HUD.ton = [HUD.farg[0] - HUD.farg[1], HUD.farg[1] - HUD.farg[2]]; HUD.ljus = ljus(HUD.farg[0], HUD.farg[1], HUD.farg[2]);
    HUD.linje = Math.max(0, Math.min(1, (HUD.farg[1] - HUD.farg[2]) / Math.max(1, HUD.farg[0] - HUD.farg[2]))); }
  const minst = Math.max(8, alla * 3e-4);
  for (let i = 0; i < 4096; i++) { if (n[i] < minst) continue; const r = i >> 8, g = (i >> 4) & 15, b = i & 15;
    for (const [dr, dg, db] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const R = r + dr, G = g + dg, B = b + db; if (R >= 0 && R < 16 && G >= 0 && G < 16 && B >= 0 && B < 16) PERSON[R << 8 | G << 4 | B] = 1; } }
  if (visa) console.log(`dealerns färger: ${PERSON.reduce((s, v) => s + v, 0)} av 4096 färgrutor, ur ${alla} bildpunkter i första rutan; huden ${HUD.farg.map(v => Math.round(v)).join(', ')} (${hn} bildpunkter)`); }
/** Det gula i skons stilla kortlek, som fingrarna vid mynningen blandas med. */
const DEKK_GULT = P2 ? gultI(STILL, q => DEKK[q] === 1, {x0: 0, y0: 0, x1: W, y1: H}) : null;
/** Dealerns (färgen utan det gröna som spiller över): hud, eller dealerns färger mätta i filmen. Säkert dealerns är en
 * bildpunkt först när den är hud eller har dealerns färg utan något grönt inblandat (rent: kortets kant blandad i det gröna
 * kan få en ljus skjortas färg). */
const person = (r: number, g: number, b: number, rent = true) => hud(r, g, b) || (rent && PERSON[fack(r, g, b)] === 1);
// Filmens kort i en ruta, inom en låda: SPAR 1 är kortet, 2 helt grönt, 0 annat. Kortet är spårfärgerna (i skons område bara
// det gula som inte är filmens stilla kortlek) och det vita och grå som hänger ihop med dem. Det vita och grå som har
// dealerns färger räknas bara innanför kortet: i det konvexa höljet kring spårfärgernas kärna (spårkortets ram går runt
// båda sidor), med två bildpunkters marginal, eller i vårt eget kort (inne). En ljus skjorta är lika vit och grå som kortets
// framsida och skiljs bara så, av var den ligger: utanför kortet följer den aldrig med. Vitt som dealern inte har följer
// kortet också utanför höljet (Kling ritar ibland ramen bara på två sidor).
const SPAR = new Uint8Array(WH), KAR = new Uint8Array(WH), DEL = new Int32Array(WH), stack: number[] = [];
/** Det konvexa höljet (moturs i bilden) kring kärnans största del och de delar som är minst en tiondel så stora och ligger
 * inom ett korts längd d från den: kärnans inre (kärnan på alla fyra sidor), så att en tunn gul eller turkos kant längs
 * handen eller skjortan inte räknas. */
const holje = (b: Lada, d: number): [number, number][] => {
  const delar: {n: number; mx: number; my: number; pts: [number, number][]}[] = []; DEL.fill(0, b.y0 * W, b.y1 * W);
  for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const q0 = y * W + x; if (!KAR[q0] || DEL[q0]) continue;
    const del = {n: 0, mx: 0, my: 0, pts: [] as [number, number][]}, rad = new Map<number, [number, number]>(); delar.push(del); DEL[q0] = delar.length; stack.push(q0);
    while (stack.length) { const q = stack.pop()!, qx = q % W, qy = q / W | 0; del.n++; del.mx += qx; del.my += qy; const r = rad.get(qy); if (!r) rad.set(qy, [qx, qx]); else { if (qx < r[0]) r[0] = qx; if (qx > r[1]) r[1] = qx; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const px = qx + dx, py = qy + dy, p = py * W + px; if (px >= b.x0 && px < b.x1 && py >= b.y0 && py < b.y1 && KAR[p] && !DEL[p]) { DEL[p] = delar.length; stack.push(p); } } }
    del.mx /= del.n; del.my /= del.n; for (const [y2, [x0, x1]] of rad) del.pts.push([x0, y2], [x1, y2]); }
  if (!delar.length) return [];
  const st = delar.reduce((a, c) => c.n > a.n ? c : a), pts = delar.filter(c => c.n >= st.n / 10 && Math.hypot(c.mx - st.mx, c.my - st.my) <= d).flatMap(c => c.pts).sort((a, c) => a[0] - c[0] || a[1] - c[1]);
  const kors = (o: [number, number], a: [number, number], c: [number, number]) => (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0]), ner: [number, number][] = [], upp: [number, number][] = [];
  for (const p of pts) { while (ner.length >= 2 && kors(ner[ner.length - 2], ner[ner.length - 1], p) <= 0) ner.pop(); ner.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upp.length >= 2 && kors(upp[upp.length - 2], upp[upp.length - 1], p) <= 0) upp.pop(); upp.push(p); }
  return [...ner.slice(0, -1), ...upp.slice(0, -1)]; };
/** Ligger (x, y) i höljet h, med marginalen m bildpunkter? */
const iHoljet = (h: [number, number][], x: number, y: number, m: number) => { if (h.length < 3) return false;
  for (let i = 0; i < h.length; i++) { const a = h[i], c = h[(i + 1) % h.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]); if ((c[0] - a[0]) * (y - a[1]) - (c[1] - a[1]) * (x - a[0]) < -m * l) return false; } return true; };
const filmKortet = (f: Buffer, b: Lada, ru: number, rn: number, kMax: number, d: number, inne?: Float32Array) => {
  for (let y = b.y0; y < b.y1; y++) { for (let x = b.x0; x < b.x1; x++) { const q = y * W + x, o = q * 3, r = f[o], bl = f[o + 2]; let g = f[o + 1]; const k = gron(r, g, bl, BORD[q] ? rn : ru); if (g > Math.max(r, bl)) g = Math.max(r, bl);
    let v = k >= 1 ? 2 : 0; if (!v) { const s = P2 && SKO[q];
      // (kortets kärna är där det gröna är litet inblandat; det mer gröna (upp till kMax: kortets suddiga kant) räknas bara
      // inom åtta bildpunkter från kärnan, eftersom handens och skjortans kant mot det gröna också blir gul och turkos; det
      // vita och grå i vårt kort är kärna (7) men räknas inte när det avgörs vad som är innanför kortet)
      if (k < kMax && (s ? !DEKK[q] && gul(r, g, bl) : sparFarg(r, g, bl))) v = k < 0.35 ? 1 : 4;
      else if (!s && k <= 0 && graVit(r, g, bl, 110)) v = inne && inne[q] > 0 && graVit(r, g, bl, 150) ? 7 : PERSON[fack(r, g, bl)] ? 3 : 8;
      // (när filmens kort tas bort: mörkt som varken är grönt eller dealerns färg är kortet i handens skugga, som den svarta
      // kanten som stack ut ur näven när Kling bar kortet 2026-11-27; det räknas som spårfärg med grönt inblandat, 4)
      else if (inne && !s && k < 0.35 && Math.max(r, g, bl) < 60 && !PERSON[fack(r, g, bl)]) v = 4; }
    SPAR[q] = v; } }
  for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const q = y * W + x; KAR[q] = SPAR[q] === 1 && x > b.x0 && x < b.x1 - 1 && y > b.y0 && y < b.y1 - 1 && SPAR[q - 1] === 1 && SPAR[q + 1] === 1 && SPAR[q - W] === 1 && SPAR[q + W] === 1 ? 1 : 0; }
  const h = holje(b, d);
  for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const q = y * W + x; if (SPAR[q] === 1 || SPAR[q] === 7) { SPAR[q] = 1; stack.push(q); } }
  while (stack.length) { const q = stack.pop()!, x = q % W; for (const p of [x > b.x0 ? q - 1 : -1, x < b.x1 - 1 ? q + 1 : -1, q - W, q + W]) { if (p < 0 || p >= WH) continue; const py = (p / W) | 0; if (py < b.y0 || py >= b.y1) continue; if (SPAR[p] === 8 || (SPAR[p] === 3 && ((inne && inne[p] > 0) || iHoljet(h, p % W, py, 2)))) { SPAR[p] = 1; stack.push(p); } } }
  // (spårfärg med grönt inblandat, 4: en fläck av den som är minst tre bildpunkter tjock (6) är filmens kort i farten, utsmetat
  // över det gröna, som när Kling lät kortet flyga in i näven på två rutor 2026-11-27 och en olivgul fläck blev kvar på vårt
  // bord; en tunn rand av den är handens eller skjortans kant mot det gröna och räknas bara nära kortet)
  for (let y = b.y0 + 1; y < b.y1 - 1; y++) for (let x = b.x0 + 1; x < b.x1 - 1; x++) { const q = y * W + x; if (SPAR[q] !== 4) continue;
    const tjock = (p: number) => SPAR[p] === 1 || SPAR[p] === 4 || SPAR[p] === 6; if (tjock(q - 1) && tjock(q + 1) && tjock(q - W) && tjock(q + W)) SPAR[q] = 6; }
  for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const q = y * W + x; if (SPAR[q] !== 4) continue;
    for (let dy = -8; dy <= 8 && SPAR[q] === 4; dy++) for (let dx = -8; dx <= 8; dx++) { const yy = y + dy, xx = x + dx; if (yy >= b.y0 && yy < b.y1 && xx >= b.x0 && xx < b.x1 && (SPAR[yy * W + xx] === 1 || SPAR[yy * W + xx] === 6)) { SPAR[q] = 5; break; } } }
  for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const q = y * W + x, v = SPAR[q]; if (v === 5 || v === 6) SPAR[q] = 1; else if (v === 3 || v === 4 || v === 8) SPAR[q] = 0; }
  return h; };
/** Var vårt kort ska ligga i rutan f: dockruta och förskjutning där det bäst täcker filmens kort (se huvudet), eller null om filmens kort inte syns. */
const sok = (f: Buffer, t0: number, forra: Lage | null) => {
  const {ru, rn} = renaGrona(f), pts: [number, number][] = [];
  for (let t = Math.max(0, t0 - 12); t <= Math.min(SIST, t0 + 12); t++) pts.push(...horn(dockKort(t)));
  const b = ladaKring(pts, 100); b.x0 &= ~1; b.y0 &= ~1; filmKortet(f, b, ru, rn, 0.35, langd(horn(dockKort(t0))));
  // (bara kortets kärna räknas, kort på alla fyra sidor: Kling ritar handens och skjortans kant gul och turkos)
  for (let y = b.y0 + 1; y < b.y1 - 1; y++) for (let x = b.x0 + 1; x < b.x1 - 1; x++) { const q = y * W + x; KAR[q] = SPAR[q] === 1 && SPAR[q - 1] === 1 && SPAR[q + 1] === 1 && SPAR[q - W] === 1 && SPAR[q + W] === 1 ? 1 : 0; }
  let nF = 0, mx = 0, my = 0; for (let y = b.y0 + 2; y < b.y1 - 1; y += 2) for (let x = b.x0 + 2; x < b.x1 - 1; x += 2) if (KAR[y * W + x]) { nF++; mx += x; my += y; }
  if (nF < 40) return {L: null, nF, tackt: 0, ute: 0, b};
  mx /= nF; my /= nF; const MAX = 0.12, VMAX = 0.7; let st = 2;
  const rakna = (L: Lage) => { const q = horn(kortVid(L)), l = ladaKring(q, 1); let inne = 0, ute = 0;
    for (let y = Math.max(b.y0 + 2, l.y0 & ~1); y < Math.min(b.y1 - 1, l.y1); y += st) for (let x = Math.max(b.x0 + 2, l.x0 & ~1); x < Math.min(b.x1 - 1, l.x1); x += st) if (iFyra(q, x, y)) { const p = y * W + x; if (KAR[p]) inne++; else if (SPAR[p] === 2 && !SKO[p]) ute++; }
    return {inne: inne * st * st / 4, ute: ute * st * st / 4}; };
  // (filmens kort som vårt inte täcker, och vårt som sticker ut över det gröna, lättare eftersom filmmodellen ritar kortet
  // mindre än ett riktigt; plus hur långt kortet har flyttats från dockans väg och vridits, och en liten dragning mot dockans ruta)
  const kost = (L: Lage) => { const {inne, ute} = rakna(L); return nF - inne + 0.3 * ute + 1e4 * (L.dx ** 2 + L.dz ** 2) + 0.05 * (L.t - t0) ** 2 + 100 * L.v ** 2; };
  let basta: Lage = {t: t0, dx: 0, dz: 0, v: 0}, bk = kost(basta);
  const prova = (L: Lage) => { L = {t: Math.max(0, Math.min(SIST, L.t)), dx: Math.max(-MAX, Math.min(MAX, L.dx)), dz: Math.max(-MAX, Math.min(MAX, L.dz)), v: Math.max(-VMAX, Math.min(VMAX, L.v))}; const k = kost(L); if (k < bk) { bk = k; basta = L; return true; } return false; };
  // (början: för varje dockruta flyttat så att kortets mitt ligger på mitten av filmens kort, i några vridningar)
  const d: Vec3 = add(RAM.forward, add(mul(RAM.right, (mx - CX) / FOK), mul(RAM.up, -(my - CY) / FOK)));
  for (let t = Math.max(0, t0 - 12); t <= Math.min(SIST, t0 + 12); t += 0.5) { const c = dockKort(t).c;
    if (d[1] < -1e-6) { const p = add(RAM.position, mul(d, (c[1] - RAM.position[1]) / d[1])); for (const v of [-0.5, -0.25, 0, 0.25, 0.5]) prova({t, dx: p[0] - c[0], dz: p[2] - c[2], v}); }
    prova({t, dx: 0, dz: 0, v: 0}); if (forra) prova({...forra, t}); }
  // (sedan små steg åt alla håll, de två sista varven på varje bildpunkt)
  for (const s of [1, 0.5, 0.25, 0.125, 0.0625]) { if (s < 0.2 && st === 2) { st = 1; bk = kost(basta); }
    for (let varv = 0, battre = true; battre && varv < 20; varv++) { battre = false;
      for (const e of [-1, 1]) { battre = prova({...basta, t: basta.t + e * s}) || battre; battre = prova({...basta, dx: basta.dx + e * 0.01 * s}) || battre; battre = prova({...basta, dz: basta.dz + e * 0.01 * s}) || battre; battre = prova({...basta, v: basta.v + e * 0.08 * s}) || battre; } } }
  // (täcker vårt kort inte ens en tredjedel av det funna är det inte kortet i ett läge vi kan lägga vårt i, som när bara en
  // strimma av framsidan sticker fram under handen: rutan följer då rutorna omkring)
  const {inne, ute} = rakna(basta); return {L: inne >= nF / 3 ? basta : null, nF, tackt: inne / nF, ute, b};
};
// Kortet ritat (CL linjärt ljus gånger täckning, CA täckning) och filmens kort som tas bort (BORT).
const CL = new Float32Array(N), CA = new Float32Array(WH), BORT = new Float32Array(WH), HM = new Float32Array(WH), SAK = new Uint8Array(WH);
/** Ritar kortet k med vikten w in i CL och CA: 4 x 4 strålar per bildpunkt, runda hörn, inget inne i skon. */
const rita = (k: Kort, w: number, l: Lada) => {
  const syns = dot(k.n, sub(RAM.position, k.c)) > 0, B = syns ? FRAM! : RYGG!, nS = syns ? k.n : mul(k.n, -1), vl = vinkelLjus(nS);
  const a = cross(k.n, k.l), h2 = CARD.height / 2, w2 = CARD.width / 2, rh = CARD.corner, den0 = dot(sub(k.c, RAM.position), k.n), c = [0, 0, 0], ws = w / 16;
  for (let y = l.y0; y < l.y1; y++) for (let x = l.x0; x < l.x1; x++) { const q = y * W + x; let ack = 0; const sum = [0, 0, 0];
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) { const px = (x + (sx + 0.5) / 4 - 0.5 - CX) / FOK, py = -(y + (sy + 0.5) / 4 - 0.5 - CY) / FOK, d: Vec3 = add(RAM.forward, add(mul(RAM.right, px), mul(RAM.up, py))), dn = dot(d, k.n);
      if (Math.abs(dn) < 1e-9) continue; const t = den0 / dn; if (t <= 0) continue; const p = add(RAM.position, mul(d, t)), e = sub(p, k.c), u = dot(e, k.l), v = dot(e, a), au = Math.abs(u), av = Math.abs(v);
      if (au > h2 || av > w2 || (au > h2 - rh && av > w2 - rh && (au - h2 + rh) ** 2 + (av - w2 + rh) ** 2 > rh * rh) || iSkon(p)) continue;
      prov(B, ((syns ? v : -v) / CARD.width + 0.5) * B.w - 0.5, (u / CARD.height + 0.5) * B.h - 0.5, c); for (let i = 0; i < 3; i++) sum[i] += Math.min(1, (c[i] * ljusGang + ljusLyft) * vl); ack++; }
    if (!ack) continue; CA[q] += ack * ws; for (let i = 0; i < 3; i++) CL[q * 3 + i] += sum[i] * ws; } };
/** Kortet vid filmruta x (med bråk), rakt mellan rutornas kort. */
const kortMellan = (kort: Kort[], x: number): Kort => { const i = Math.max(0, Math.min(kort.length - 1, Math.floor(x))), j = Math.min(kort.length - 1, i + 1), u = Math.max(0, Math.min(1, x - i)), a = kort[i], b = kort[j];
  const l = unit(lerp(a.l, b.l, u)), n0 = lerp(a.n, b.n, u); return {c: lerp(a.c, b.c, u), l, n: unit(sub(n0, mul(l, dot(n0, l))))}; };

for (const en of filmer) {
const mal = utMapp ? path.join(utMapp, path.basename(en)) : ut!;
// (en ruta som filmmodellen har ritat fel, --hall: den förra i dess ställe)
const hallen = async function* (): AsyncGenerator<Buffer> { let forra: Buffer | null = null, nr = 0; for await (const f0 of rutor(en)) { const f: Buffer = hall.has(nr++) && forra ? forra : f0; forra = Buffer.from(f); yield f; } };

// Kortets läge ruta för ruta: sökt där filmens kort syns, och däremellan dockans med förskjutningen från rutorna omkring.
let kort: Kort[] = []; const sokLador: Lada[] = [];
if (rorelse) { const lagen: Lage[] = [];
  const sokt: (Lage | null)[] = [], t0: number[] = [], vikt: number[] = [], rad: string[] = []; let forra: Lage | null = null;
  for await (const f of hallen()) { const nr = sokt.length, t = dockrutaVid(nr), s = sok(f, t, forra); sokt.push(s.L); t0.push(t); vikt.push(s.L ? s.nF : 0); sokLador.push(s.b); if (s.L) forra = s.L;
    rad.push(`ruta ${String(nr).padStart(3)}  dockruta ${t.toFixed(1).padStart(5)}${s.L ? ` → ${s.L.t.toFixed(1).padStart(5)}  flyttat ${(s.L.dx * 1000).toFixed(0).padStart(3)} ${(s.L.dz * 1000).toFixed(0).padStart(3)} mm  vridet ${(s.L.v * 180 / Math.PI).toFixed(0).padStart(3)}°  filmens kort ${String(s.nF * 4).padStart(5)} bp, täckt ${(s.tackt * 100).toFixed(0).padStart(3)} %, utanför ${s.ute * 4} bp` : `  (filmens kort syns inte: ${s.nF * 4} bp)`}`); }
  const n = sokt.length, fran = sokt.map((L, i) => L ? i : -1).filter(i => i >= 0);
  // (mellan sökta rutor: dockrutans avvikelse och förskjutningen rakt emellan; före den första är tiden den första funnas,
  // eftersom filmmodellen ligger lika mycket efter dockan redan innan kortet syns (Kling 2026-11-27: kortet i handen kom ur
  // skon en till två rutor efter dockans), och förskjutningen växer från ingenting i ruta 0; efter den sista som den)
  const del = (i: number): Lage => { const L = sokt[i]!; return {t: L.t - t0[i], dx: L.dx, dz: L.dz, v: L.v}; }, noll: Lage = {t: 0, dx: 0, dz: 0, v: 0};
  for (let i = 0; i < n; i++) { if (sokt[i]) { lagen.push(sokt[i]!); continue; } const f = [...fran].reverse().find(j => j < i), e = fran.find(j => j > i);
    const a = f === undefined ? noll : del(f), b = e === undefined ? a : del(e), fa = f ?? 0, u = e === undefined ? 0 : (i - fa) / (e - fa), m = {t: f === undefined ? b.t : a.t + (b.t - a.t) * u, dx: a.dx + (b.dx - a.dx) * u, dz: a.dz + (b.dz - a.dz) * u, v: a.v + (b.v - a.v) * u};
    lagen.push({t: Math.max(0, Math.min(SIST, t0[i] + m.t)), dx: m.dx, dz: m.dz, v: m.v}); }
  // (kortet jämnas över rutan före och efter, vägt efter hur mycket av filmens kort som syns, så att det inte darrar; bara
  // med rutor där kortet är inom 2 cm: ett kort i farten, 6 cm per ruta ur skon, drogs annars mot grannarna och hamnade
  // framför handen)
  const ra = lagen.map(kortVid), nara = (a: Kort, b: Kort) => Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1], a.c[2] - b.c[2]) < 0.02;
  kort = ra.map((_, i) => { let c: Vec3 = [0, 0, 0], l: Vec3 = [0, 0, 0], m: Vec3 = [0, 0, 0], ws = 0;
    for (const [j, k] of [[i - 1, 1], [i, 2], [i + 1, 1]]) { if (j < 0 || j >= n || !nara(ra[j], ra[i])) continue; const w = k * (vikt[j] + 1); c = add(c, mul(ra[j].c, w)); l = add(l, mul(ra[j].l, w)); m = add(m, mul(ra[j].n, w)); ws += w; }
    const lu = unit(l); return {c: mul(c, 1 / ws), l: lu, n: unit(sub(m, mul(lu, dot(m, lu))))}; });
  // (ett kort som ligger platt på filten under fingret hoppar inte: där jämnas läget över tre rutor åt varje håll, så att ett
  // språng i filmmodellens kort blir en vridning under fingret; Kling vred kortet rakt på en ruta 2026-11-27. Också här
  // bara med rutor där kortet är inom 2 cm: kortet som skjuts plant över filten från skon ligger också platt)
  const platt = (k: Kort) => Math.abs(k.n[1]) > 0.97 && k.c[1] < 0.005, fore = kort.slice();
  kort = fore.map((k, i) => { if (!platt(k)) return k; let c: Vec3 = [0, 0, 0], l: Vec3 = [0, 0, 0], m: Vec3 = [0, 0, 0], ws = 0;
    for (let j = Math.max(0, i - 3); j <= Math.min(n - 1, i + 3); j++) { if (!platt(fore[j]) || !nara(fore[j], k)) continue; const w = (4 - Math.abs(j - i)) * (vikt[j] + 1); c = add(c, mul(fore[j].c, w)); l = add(l, mul(fore[j].l, w)); m = add(m, mul(fore[j].n, w)); ws += w; }
    const lu = unit(l); return {c: mul(c, 1 / ws), l: lu, n: unit(sub(m, mul(lu, dot(m, lu))))}; });
  // (där kortet ligger still, hörnen inom 3 bildpunkter i minst fem rutor i rad, får det ett enda läge: rutornas medel)
  for (let i = 0; i < n;) { const h0 = horn(kort[i]); let j = i + 1; while (j < n && horn(kort[j]).every((p, k) => Math.hypot(p[0] - h0[k][0], p[1] - h0[k][1]) < 3)) j++;
    if (j - i >= 5) { let c: Vec3 = [0, 0, 0], l: Vec3 = [0, 0, 0], m: Vec3 = [0, 0, 0], ws = 0; for (let k = i; k < j; k++) { const w = vikt[k] + 1; c = add(c, mul(kort[k].c, w)); l = add(l, mul(kort[k].l, w)); m = add(m, mul(kort[k].n, w)); ws += w; }
      const lu = unit(l), still: Kort = {c: mul(c, 1 / ws), l: lu, n: unit(sub(m, mul(lu, dot(m, lu))))}; for (let k = i; k < j; k++) kort[k] = still; if (visa) console.log(`stilla i ruta ${i}–${j - 1}`); }
    i = j; }
  if (visa) for (let i = 0; i < n; i++) console.log(`${rad[i]}${sokt[i] ? '' : `   → ${lagen[i].t.toFixed(1)}`}`);
}

const kod = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', takt, '-i', '-', '-vf', 'scale=out_color_matrix=bt709:out_range=tv', ...KOD, mal], {stdio: ['pipe', 'ignore', 'inherit'], windowsHide: true});
const klar = once(kod, 'close'), bild = Buffer.alloc(N); let antal = 0, nr = 0;
for await (const f of hallen()) {
  const {ru, rn, ln} = renaGrona(f);
  for (let q = 0; q < WH; q++) { const o = q * 3; K[q] = gron(f[o], f[o + 1], f[o + 2], BORD[q] ? rn : ru); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 3, q = y * W + x; let r = f[o], g = f[o + 1], b = f[o + 2], k = K[q];
    // Kanten mot det gröna: en kall bildpunkt (blåare än röd) bredvid helt grönt är skärmens grönt blandat i skjortan eller
    // kortets ram och lyser som en ljus turkos rand mot vårt mörka bord (Klings film 2026-11-27); den räknas till bordet.
    // Skärmens grönt har mer blått än rött, så en skjorta i vilken färg som helst blir kall där; hud och dockans vita blir
    // det inte förrän det gröna tar över, så fingrarna tunnas inte ut.
    if (k < 1 && b > r + 10 && Math.min(g, b) > 90 && x > 0 && y > 0 && x < W - 1 && y < H - 1 && (K[q - 1] >= 1 || K[q + 1] >= 1 || K[q - W] >= 1 || K[q + W] >= 1)) k = Math.max(k, 0.9);
    A[q] = k;
    // Dealerns skugga på filten: där det gröna är mörkare än det rena gröna på stället (jämnas nedan).
    S[q] = k > 0 && SKIVA[q] && skugga > 0 ? 1 - skugga * (1 - Math.min(1, ljus(r, g, b) / (ln * rentVid(x, y)))) : 1;
    // Dealern: det gröna som spiller över i kanten tas ned till det största av rött och blått. I hudens kant mot det gröna
    // räcker inte det: rött och grönt blir då lika och kanten gulgrön (randen längs handen 2026-11-27). Där, i det varma som
    // inte är kortets gula och ligger inom två bildpunkter från helt grönt, tas det gröna ned till hudens egen ton
    // (grönt lika långt mellan blått och rött som i dealerns hud).
    if (g > Math.max(r, b)) g = Math.max(r, b);
    if (k < 1 && r > b + 10 && x > 1 && y > 1 && x < W - 2 && y < H - 2 && !gul(r, g, b)
      && (K[q - 1] >= 1 || K[q + 1] >= 1 || K[q - W] >= 1 || K[q + W] >= 1 || K[q - 2] >= 1 || K[q + 2] >= 1 || K[q - 2 * W] >= 1 || K[q + 2 * W] >= 1)) g = Math.min(g, b + (r - b) * HUD.linje);
    D[o] = r; D[o + 1] = g; D[o + 2] = b; }
  if (skugga > 0) lada(S, 4);
  // (i skons område: bara handen och ärmen ur filmen: hud, och dealerns färger där filmen har ändrats sedan rutan med den
  // stilla skon (--sko-ruta), eftersom filmens glaskanter kan ha skjortans vita och grå, och aldrig filmens gula kortlek i
  // handens skugga; hål i handen fylls och lösa prickar tas bort i rutan 5 x 5, och kanten mjukas en bildpunkt)
  // (masken räknas över hela bilden och används bara i skons område, så att dess kant inte skär en linje genom handen;
  // utan --docka släpps filmens kort som dras fram som handen)
  if (P2) {
    for (let q = 0; q < WH; q++) { const o = q * 3, r = D[o], g = D[o + 1], b = D[o + 2];
      M[q] = A[q] < 1 && (hud(r, g, b) || (person(r, g, b) && Math.abs(r - STILL[o]) + Math.abs(g - STILL[o + 1]) + Math.abs(b - STILL[o + 2]) > 60 && !(DEKK[q] && r > 100 && Math.min(r, g) - b > 25 && b < 0.65 * g))
        || (!rorelse && SKO[q] && !DEKK[q] && kortFarg(r, g, b))) ? 1 : 0; }
    M2.set(M); lada(M2, 4); for (let q = 0; q < WH; q++) if (M2[q] < 0.3) M[q] = 0;
    M2.set(M); lada(M2, 2); for (let q = 0; q < WH; q++) if (M2[q] > 0.8) M[q] = 1;
    // (fingertopparna vid mynningen är blandade med kortlekens gula och är då varken hud eller dealerns färg: intill handen
    // hör en sådan bildpunkt till handen så mycket som den är hud, så att vårt kort ligger under fingrarna och inte över dem)
    if (DEKK_GULT) for (let q = 0; q < WH; q++) { if (!SKO[q] || M[q] >= 1 || A[q] >= 1 || M2[q] < 0.1) continue; const o = q * 3, del = hudDel(D[o], D[o + 1], D[o + 2], DEKK_GULT);
      if (del) { M[q] = del; if (del < 1) iHudfarg(o); } }
    lada(M, 1); }
  // Kortet: vårt ritat i rutans läge (med rörelseoskärpa över en halv ruta), och filmens borttaget med sin kant.
  let rl: Lada | null = null;
  if (rorelse) { CA.fill(0); CL.fill(0); BORT.fill(0);
    const vid = (o: number) => horn(kortMellan(kort, nr + o)), fore = vid(-0.25), efter = vid(0.25), steg = Math.max(...fore.map((p, i) => Math.hypot(p[0] - efter[i][0], p[1] - efter[i][1]))), ns = Math.max(1, Math.min(48, Math.ceil(steg / 1.5)));
    rl = ladaKring([...fore, ...efter, ...vid(0)], 2);
    for (let s = 0; s < ns; s++) rita(kortMellan(kort, nr + (ns > 1 ? -0.25 + 0.5 * s / (ns - 1) : 0)), 1 / ns, rl);
    // (filmens kort letas där vårt ligger och där sökningen letade, så att det tas bort också där vårt kort inte hamnade)
    const v = ladaKring([[rl.x0, rl.y0], [rl.x1, rl.y1]], 60), s = sokLador[nr], b = s ? {x0: Math.min(v.x0, s.x0), y0: Math.min(v.y0, s.y0), x1: Math.max(v.x1, s.x1), y1: Math.max(v.y1, s.y1)} : v; const hol = filmKortet(f, b, ru, rn, 1, langd(vid(0)), CA);
    // (säkert dealern (SAK 2): dealerns färg, hopkopplad genom det som inte är grönt eller filmens kort med dealern utanför
    // filmens kort; en hudfärgad fläck helt inne i kortet är kortets märke blandat i det gula. I vårt kort bara där minst
    // halva rutan 5 x 5 runt om är dealern, så att märket inte blir prickar)
    for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const q = y * W + x, o = q * 3;
      SAK[q] = A[q] >= 1 || SPAR[q] === 1 ? 0 : !person(D[o], D[o + 1], D[o + 2], A[q] <= 0) ? 3 : iHoljet(hol, x, y, 2) ? 1 : 2; if (SAK[q] === 2) stack.push(q); }
    while (stack.length) { const q = stack.pop()!, x = q % W, y = q / W | 0; for (const [p, px, py] of [[q - 1, x - 1, y], [q + 1, x + 1, y], [q - W, x, y - 1], [q + W, x, y + 1]]) if (px >= b.x0 && px < b.x1 && py >= b.y0 && py < b.y1 && (SAK[p] === 1 || SAK[p] === 3)) { SAK[p] = SAK[p] === 1 ? 2 : 4; stack.push(p); } }
    HM.fill(0); for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const q = y * W + x; HM[q] = SAK[q] === 2 ? 1 : 0; } lada(HM, 2);
    const gult = gultI(D, q => SPAR[q] === 1, b);
    for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const q = y * W + x; if (SPAR[q] === 1) { BORT[q] = 1; continue; }
      // (finger och filmens gula kort i samma bildpunkt, där den hänger ihop med dealern: kvar så mycket som den är hud)
      if (gult && (SAK[q] === 2 || SAK[q] === 4)) { const o = q * 3, del = hudDel(D[o], D[o + 1], D[o + 2], gult);
        if (del !== null && (del < 1 || SAK[q] === 4)) { BORT[q] = 1 - del; if (del > 0 && del < 1) iHudfarg(o); continue; } }
      // (kortets kant: två bildpunkter runt det utom där det säkert är dealern, och fem där det gröna är inblandat (Kling ritar
      // kortet suddigt i det snabba); i vårt kort bara dealern; det som är dealerns färg men inte hänger ihop med dealern tas bort)
      const h = SAK[q] === 2; if ((CA[q] > 0 || SAK[q] === 1) && (!h || HM[q] < 0.5)) { BORT[q] = 1; continue; } if (h) continue; const R = A[q] > 0 ? 5 : 2; let nara = false;
      for (let dy = -R; dy <= R && !nara; dy++) for (let dx = -R; dx <= R; dx++) { const p = q + dy * W + dx; if (p >= 0 && p < WH && SPAR[p] === 1 && x + dx >= b.x0 && x + dx < b.x1 && y + dy >= b.y0 && y + dy < b.y1) { nara = true; break; } }
      if (nara) BORT[q] = 1; }
    lada(BORT, 1); }
  for (let q = 0; q < WH; q++) { const o = q * 3, k = A[q], s = S[q], iSko = P2 && SKO[q], Pb = iSko ? P2 : P;
    let br = Pb[o] * s, bg = Pb[o + 1] * s, bb = Pb[o + 2] * s;
    if (rl && CA[q] > 0) { const a = Math.min(1, CA[q]); br = br * (1 - a) + tillByte(CL[o] / CA[q]) * a; bg = bg * (1 - a) + tillByte(CL[o + 1] / CA[q]) * a; bb = bb * (1 - a) + tillByte(CL[o + 2] / CA[q]) * a; }
    // (plattan med skon får dealerns skugga på filten som plattan utan, så att skons fot inte får en ljus kant)
    const m = (iSko ? M[q] : 1) * (1 - k) * (1 - BORT[q]);
    bild[o] = D[o] * m + br * (1 - m); bild[o + 1] = D[o + 1] * m + bg * (1 - m); bild[o + 2] = D[o + 2] * m + bb * (1 - m); }
  nr++; antal++; if (!kod.stdin.write(bild)) await once(kod.stdin, 'drain');
}
kod.stdin.end(); const [slut] = await klar; if (slut !== 0) throw Error('FFmpeg kunde inte skriva filmen.');
console.log(`${antal} rutor lagda på ${platta}: ${mal} (det gröna mätt på filten och i bakgrunden genom livebordets kamera)${rorelse ? `, kortet ${valor} ritat efter ${path.basename(dockFil!)}` : ''}`);
}
