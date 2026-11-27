// Lägger en dealer som är filmad i nyckelfärger (editorns utseende nyckel: grönt överallt) på vårt eget bord: dealern,
// stolen, skon och korten klipps ut ur den gröna filmen och läggs på en bild av bordet ensamt, tagen genom samma kamera.
// Bordet, bakgrunden och ljuset är då samma bildpunkter i varje klipp, hur filmmodellen än har ritat det gröna, och
// bara dealern kommer ur filmen (Jakob 2026-11-26: "bordet och allt omkring bli grönt och sedan ska vi lägga in den
// utskurne avataren ovanpå ... tillbaka till 3d-bordet. Så gör väl dealer").
//
//   node standarddocka/verktyg/lagg-pa-bord.ts <grön film.mp4> [<fler filmer> …] --platta <bordet ensamt.png>
//        (--ut <film.mp4> | --ut-mapp <mapp>)   flera filmer (klippen ur en tagning) läggs i en körning, med samma namn i mappen
//        [--kortfarger]   spårkortets färger görs om till ett vanligt kort: den gula ryggen röd, ramen och märket vita
//        [--skugga 1]     hur mycket av dealerns skugga på filten som läggs på vårt bord (0 ingen, 1 som i filmen)
//        [--falt <film>]  det rena gröna mäts i den filmen i stället: hela tagningen, när filmen som läggs är ett klipp
//                         ur den (i ett kort klipp ligger skuggan kvar på samma ställe och räknas annars som rent grönt)
//        [--hall 46,52]   de rutorna (räknat från 0) ersätts av rutan före: en ruta som filmmodellen har ritat fel, som när
//                         Kling ritade mannen större på en enda ruta (ruta 46, 2026-11-27)
//        [--egen-sko <bordet med vår sko.png>]   skon och kortleken är våra: där den plattan skiljer sig från --platta (skon,
//                         med en marginal) tas ur filmen bara handen och ärmen (hud och skjorta); filmens sko, kortlek och
//                         glaskanter byts mot plattans (domaren 2026-11-27: Klings kortlek blev trappstegig och prickig). Ett
//                         kort som har lämnat skons mynning kommer ur filmen som förut.
//
// Plattan: node standarddocka/verktyg/titta.ts --runda --spela-in 0-0 --utan docka,kort,sko,stol --kamera plats4, och
// första rutan ur det klippet. Två knep är lånade ur blackjack-dealer (src/scene3d-film.ts, src/film-after.ts):
//  - Det gröna mäts i varje ruta för sig, i två hörn som alltid är tomma (uppe till vänster bakgrunden, nere till
//    vänster bordet), och varje bildpunkts grönhet räknas mot det. Utklippet följer då med när filmmodellen låter det
//    gröna glida i ton under en lång tagning.
//  - Skuggan läggs som en kvot: hur mycket mörkare en grön bildpunkt är än det rena gröna på samma ställe (det ljusaste
//    stället har haft under hela filmen, eftersom skuggorna flyttar sig) gånger vårt bord. Skuggan följer då händerna,
//    men bordets egen färg och tryck är våra.
// Kräver FFmpeg på datorn (FFMPEG och FFPROBE pekar ut dem om de inte ligger i sökvägen).
import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const forstaVal = process.argv.findIndex((x, i) => i >= 2 && x.startsWith('--')), filmer = process.argv.slice(2, forstaVal < 0 ? undefined : forstaVal), film = filmer[0];
const platta = arg('--platta'), ut = arg('--ut'), utMapp = arg('--ut-mapp'), kortfarger = process.argv.includes('--kortfarger'), skugga = Number(arg('--skugga') ?? '1'), falt = arg('--falt') ?? film, egenSko = arg('--egen-sko'), hall = new Set((arg('--hall') ?? '').split(',').filter(Boolean).map(Number));
if (!film || !platta || !(filmer.length === 1 ? ut || utMapp : utMapp) || !(skugga >= 0 && skugga <= 1)) throw Error('node standarddocka/verktyg/lagg-pa-bord.ts <grön film.mp4> [<fler filmer> …] --platta <bordet ensamt.png> (--ut <film.mp4> | --ut-mapp <mapp>) [--kortfarger] [--skugga 1] [--falt <hela tagningen.mp4>] [--hall <ruta,ruta>] [--egen-sko <bordet med vår sko.png>]');
const FFMPEG = process.env.FFMPEG || 'ffmpeg', FFPROBE = process.env.FFPROBE || 'ffprobe';
const [W, H, takt] = spawnSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'csv=p=0', film], {encoding: 'utf8'}).stdout.trim().split(',').map((x, i) => i < 2 ? Number(x) : x) as [number, number, string];
if (!(W > 0 && H > 0)) throw Error(`${film} gick inte att läsa.`);
const N = W * H * 3;

/** Filmens rutor som rå RGB, en i taget. */
async function* rutor(fil: string, skala = false): AsyncGenerator<Buffer> {
  const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', fil, ...(skala ? ['-vf', `scale=${W}:${H}:flags=lanczos`] : []), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true});
  let kvar: Buffer = Buffer.alloc(0);
  for await (const bit of p.stdout) { kvar = kvar.length ? Buffer.concat([kvar, bit as Buffer]) : bit as Buffer; while (kvar.length >= N) { yield kvar.subarray(0, N); kvar = kvar.subarray(N); } }
}
const ljus = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
/** Medelfärgen i en ruta på 48 bildpunkter med hörnet (x, y). */
const hornet = (f: Buffer, x: number, y: number) => { let r = 0, g = 0, b = 0; for (let j = y; j < y + 48; j++) for (let i = x; i < x + 48; i++) { const o = (j * W + i) * 3; r += f[o]; g += f[o + 1]; b += f[o + 2]; } return [r / 2304, g / 2304, b / 2304]; };
const HORN = {uppe: [8, 8], nere: [8, H - 56]} as const, LO = 0.12, HI = 0.5;
/** Hur grön en bildpunkt är mot rutans rena gröna (0 inte alls, 1 helt): grönt över det största av rött och blått. */
const gron = (r: number, g: number, b: number, ren: number) => { const s = (g - Math.max(r, b)) / ren; return s <= LO ? 0 : s >= HI ? 1 : (s - LO) / (HI - LO); };

// Första varvet, på var fjärde bildpunkt: raden där bordet börjar, och bordets rena gröna ljus per ställe (det ljusaste
// en helt grön bildpunkt där har varit under filmen, räknat mot rutans eget hörn så att filmens glidning i ton inte räknas in).
const C = 4, cw = Math.ceil(W / C), ch = Math.ceil(H / C), rent = new Float32Array(cw * ch); let kant = -1;
for await (const f of rutor(falt, falt !== film)) {
  const uppe = hornet(f, ...HORN.uppe), nere = hornet(f, ...HORN.nere), lu = ljus(uppe[0], uppe[1], uppe[2]), ln = ljus(nere[0], nere[1], nere[2]), rn = nere[1] - Math.max(nere[0], nere[2]);
  if (kant < 0) { for (let y = 8; y < H - 8 && kant < 0; y++) { const o = (y * W + 20) * 3, l = ljus(f[o], f[o + 1], f[o + 2]); if (Math.abs(l - ln) < Math.abs(l - lu)) kant = y; }
    if (kant < 0 || !(rn > 30)) throw Error(`${falt}: hittar inte det gröna bordet nere till vänster och den gröna bakgrunden uppe till vänster. Är filmen inspelad i utseendet nyckel?`); }
  for (let y = kant; y < H; y += C) for (let x = 0; x < W; x += C) { const o = (y * W + x) * 3, r = f[o], g = f[o + 1], b = f[o + 2]; if (gron(r, g, b, rn) < 1) continue; const k = (y / C | 0) * cw + (x / C | 0), l = ljus(r, g, b) / ln; if (l > rent[k]) rent[k] = l; }
}
// Ställen som aldrig var rent gröna (under skon, vid kanten) får grannarnas värde; sedan jämnas fältet ut, så att en
// skugga som låg kvar på ett ställe hela filmen fylls i av det omkring.
for (let varv = 0; varv < 40; varv++) { let tomma = 0; const forra = rent.slice(); for (let j = kant / C | 0; j < ch; j++) for (let i = 0; i < cw; i++) { const k = j * cw + i; if (forra[k] > 0) continue; let s = 0, n = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + dx, y = j + dy; if (x < 0 || x >= cw || y < 0 || y >= ch) continue; const v = forra[y * cw + x]; if (v > 0) { s += v; n++; } } if (n) rent[k] = s / n; else tomma++; } if (!tomma) break; }
for (let varv = 0; varv < 3; varv++) { const forra = rent.slice(), R = 6; for (let j = kant / C | 0; j < ch; j++) for (let i = 0; i < cw; i++) { let s = 0, n = 0, m = 0;
  for (let dy = -R; dy <= R; dy += 3) for (let dx = -R; dx <= R; dx += 3) { const x = i + dx, y = j + dy; if (x < 0 || x >= cw || y < (kant / C | 0) || y >= ch) continue; const v = forra[y * cw + x]; if (v > 0) { s += v; n++; if (v > m) m = v; } }
  if (n) rent[j * cw + i] = (s / n + m) / 2; } }

// Andra varvet: varje ruta läggs på plattan.
const P = (await rutor(platta, true).next()).value as Buffer; if (!P) throw Error(`${platta} gick inte att läsa.`);
const KOD = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart'];
if (utMapp) mkdirSync(utMapp, {recursive: true});
for (const en of filmer) {
const mal = utMapp ? path.join(utMapp, path.basename(en)) : ut!;
const kod = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', takt, '-i', '-', '-vf', 'scale=out_color_matrix=bt709:out_range=tv', ...KOD, mal], {stdio: ['pipe', 'ignore', 'inherit'], windowsHide: true});
const klar = once(kod, 'close'), bild = Buffer.alloc(N); let antal = 0;
const WH = W * H, K = new Float32Array(WH), A = new Float32Array(WH), S = new Float32Array(WH), T = new Float32Array(WH), RW = new Float32Array(WH), RL = new Float32Array(WH), VIT = new Uint8Array(WH), D = new Uint8ClampedArray(N);
// Var skuggan får falla: plattans filt och bordskant (mörka), aldrig golvet eller väggen bakom bordet (Kling 2026-11-27:
// skuggan lades där som ett rutmönster).
const filt = new Uint8Array(WH); for (let q = 0; q < WH; q++) { const o = q * 3; filt[q] = (q / W | 0) >= kant && ljus(P[o], P[o + 1], P[o + 2]) < 100 ? 1 : 0; }
/** Det rena gröna ljuset på stället (rutnätet `rent`), läst mjukt mellan rutnätets punkter och inte i rutor. */
const rentVid = (x: number, y: number) => { const fx = x / C - 0.5, fy = y / C - 0.5, i = Math.max(0, Math.min(cw - 2, Math.floor(fx))), j = Math.max(0, Math.min(ch - 2, Math.floor(fy))), u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fy - j));
  return (rent[j * cw + i] * (1 - u) + rent[j * cw + i + 1] * u) * (1 - v) + (rent[(j + 1) * cw + i] * (1 - u) + rent[(j + 1) * cw + i + 1] * u) * v || 1; };
/** Fältet v jämnat med en låda på 2R + 1 bildpunkter i båda led. */
const lada = (v: Float32Array, R: number) => { const n = 2 * R + 1;
  for (let y = 0; y < H; y++) { const r0 = y * W; let s = 0; for (let x = -R; x <= R; x++) s += v[r0 + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { T[r0 + x] = s / n; s += v[r0 + Math.min(W - 1, x + R + 1)] - v[r0 + Math.max(0, x - R)]; } }
  for (let x = 0; x < W; x++) { let s = 0; for (let y = -R; y <= R; y++) s += T[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { v[y * W + x] = s / n; s += T[Math.min(H - 1, y + R + 1) * W + x] - T[Math.max(0, y - R) * W + x]; } } };
// Vår egen sko (--egen-sko): plattan med skon, och skons område där den skiljer sig från plattan utan sko, med marginal.
const P2 = egenSko ? (await rutor(egenSko, true).next()).value as Buffer : null, SKO = new Float32Array(WH), M = new Float32Array(WH), M2 = new Float32Array(WH);
if (egenSko && !P2) throw Error(`${egenSko} gick inte att läsa.`);
if (P2) { for (let q = 0; q < WH; q++) { const o = q * 3; SKO[q] = Math.abs(P2[o] - P[o]) + Math.abs(P2[o + 1] - P[o + 1]) + Math.abs(P2[o + 2] - P[o + 2]) > 24 ? 1 : 0; }
  lada(SKO, 6); for (let q = 0; q < WH; q++) SKO[q] = SKO[q] > 0.02 ? 1 : 0; }
let forra: Buffer | null = null, nr = 0;
for await (const f0 of rutor(en)) {
  // (en ruta som filmmodellen har ritat fel, --hall: den förra i dess ställe)
  const f = hall.has(nr++) && forra ? forra : f0; forra = Buffer.from(f);
  const uppe = hornet(f, ...HORN.uppe), nere = hornet(f, ...HORN.nere), ru = uppe[1] - Math.max(uppe[0], uppe[2]), rn = nere[1] - Math.max(nere[0], nere[2]), ln = ljus(nere[0], nere[1], nere[2]);
  for (let y = 0; y < H; y++) { const ren = y >= kant ? rn : ru; for (let x = 0; x < W; x++) { const o = (y * W + x) * 3; K[y * W + x] = gron(f[o], f[o + 1], f[o + 2], ren); } }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 3, q = y * W + x; let r = f[o], g = f[o + 1], b = f[o + 2], k = K[q];
    // Kanten mot det gröna: en kall (blåaktig) bildpunkt bredvid helt grönt är skärmens grönt blandat i skjortan eller
    // kortets ram och lyser som en ljus turkos rand mot vårt mörka bord (Klings film 2026-11-27); den räknas till bordet.
    // Hud och dockans vita är inte kalla, så fingrarna tunnas inte ut.
    if (k < 1 && b > r + 10 && Math.min(g, b) > 90 && x > 0 && y > 0 && x < W - 1 && y < H - 1 && (K[q - 1] >= 1 || K[q + 1] >= 1 || K[q - W] >= 1 || K[q + W] >= 1)) k = Math.max(k, 0.9);
    A[q] = k;
    // Dealerns skugga på filten: där det gröna är mörkare än det rena gröna på stället (jämnas nedan).
    S[q] = k > 0 && filt[q] && skugga > 0 ? 1 - skugga * (1 - Math.min(1, ljus(r, g, b) / (ln * rentVid(x, y)))) : 1;
    // Dealern: det gröna som spiller över i kanten tas ned till det största av rött och blått.
    if (g > Math.max(r, b)) g = Math.max(r, b);
    D[o] = r; D[o + 1] = g; D[o + 2] = b; RW[q] = 0; VIT[q] = 0;
    if (kortfarger && k < 1) { // spårkortets färger (editor/scen.ts NYCKEL) blir ett vanligt kort: röd rygg, vit framsida.
      // Gränserna är snäva: nästan inget blått i det gula, nästan inget rött i ramens blå och nästan inget grönt i
      // märkets rosa, så att varken ljus hud eller en ljusblå skjorta i skugga räknas dit.
      // (det gula: rött och grönt klart över blått, inte hudens; också det mörkare gula mellan korten i skon och det gula
      // som blandats med huden eller det gröna i en filmmodells kant (Kling 2026-11-27), med en mjuk övergång så att
      // kanten inte blir ett trappsteg. Ljuset hålls nära ryggens eget, så att kortleken blir en slät röd yta)
      const Y = Math.min(r, g) - b;
      if (r > 185 && g > 140 && b < 75 && g > 0.7 * r) { RW[q] = 1; RL[q] = ljus(r, g, b) / 205; }
      else if (r > 100 && Y > 25 && g < 1.15 * r && (b < 0.5 * g || (Math.min(r, g) > 195 && b < 0.8 * g && r - g < 18))) { RW[q] = Math.min(1, (Y - 25) / 30) * (b < 0.5 * g ? 1 : Math.min(1, (0.8 * g - b) / (0.15 * g))); RL[q] = Math.min(1.05, Math.max(0.8, ljus(r, g, b) / 205)); }
      else if ((r < 70 && g > 150 && b > 190) || (r > 190 && g < 90 && b > 160)) VIT[q] = 1;
      // En filmmodell ritar ramen och märket mjukare och blandar dem med det vita (Kling 2026-11-27): turkost (grönt och
      // blått lika, rött långt under, inte skjortans lavendel där grönt ligger klart under blått) och rosa (rött och blått
      // klart över grönt, inte hudens) blir också vitt, och blekt rosa (märkets kant mot det vita). Blekt gult (kortlekens
      // kanter i skon) är rött ovan, så att kortleken är enfärgad (domaren 2026-11-27).
      else if ((b > 120 && r < 0.72 * g && g > 0.86 * b) || (r > 150 && r > g + 40 && b > g + 30)) VIT[q] = 2;
      else if (r > 200 && b > 200 && g < Math.min(r, b) - 15) VIT[q] = 2; } }
  if (kortfarger) {
    // (det mjukare vita (2) bara där det hänger ihop med kortets vita: minst sex vita i rutan 5 x 5 runt om; annars är det
    // prickar vid fingertopparna och längs ärmens kant, och bildpunkten får sin egen färg)
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const q = y * W + x; if (VIT[q] !== 2) continue; let n = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const p = q + dy * W + dx, o = p * 3; if (p !== q && (VIT[p] || (Math.min(D[o], D[o + 1], D[o + 2]) > 200 && Math.max(D[o], D[o + 1], D[o + 2]) - Math.min(D[o], D[o + 1], D[o + 2]) < 30))) n++; }
      if (n < 6) VIT[q] = 0; }
    // (kortlekens ljusa kanter i skon: en ljus, varken grön, kall eller hudfärgad bildpunkt mitt i det röda (minst åtta
    // av rutan 5 x 5 runt om röda) blir också röd, så att kortleken är en enfärgad yta och inte prickig)
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const q = y * W + x, o = q * 3; if (RW[q] >= 0.5 || VIT[q] || A[q] >= 1) continue;
      const r = D[o], g = D[o + 1], b = D[o + 2]; if (!(Math.min(r, g) > 170 && r - g < 18 && b <= g + 5)) continue; let n = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (RW[q + dy * W + dx] >= 0.8) n++;
      if (n >= 8) { RW[q] = 1; RL[q] = 0.95; } }
    lada(RW, 1); }
  if (skugga > 0) lada(S, 4);
  // (i skons område: bara handen och ärmen ur filmen, hud (varm, inte gul och inte kortets vita) och skjorta (kall, inte
  // turkos); hål i handen
  // fylls och lösa prickar tas bort i rutan 5 x 5, och kanten mjukas en bildpunkt)
  if (P2) {
    for (let q = 0; q < WH; q++) { if (!SKO[q]) { M[q] = 0; continue; } const o = q * 3, r = D[o], g = D[o + 1], b = D[o + 2];
      M[q] = A[q] < 1 && ((r > 80 && r > g + 20 && r - b > 25 && b > 0.68 * g && g > 0.6 * r && (Math.min(r, g) < 190 || b > 0.75 * g) && Math.min(r, g, b) < 225) || (b > r + 10 && b > 110 && g < b + 5 && r > 0.5 * g)) ? 1 : 0; }
    M2.set(M); lada(M2, 4); for (let q = 0; q < WH; q++) if (SKO[q] && M2[q] < 0.3) M[q] = 0;
    M2.set(M); lada(M2, 2); for (let q = 0; q < WH; q++) if (SKO[q] && M2[q] > 0.8) M[q] = 1;
    lada(M, 1); }
  for (let q = 0; q < WH; q++) { const o = q * 3, k = A[q], s = S[q], pr = P[o] * s, pg = P[o + 1] * s, pb = P[o + 2] * s;
    let r = D[o], g = D[o + 1], b = D[o + 2];
    if (VIT[q]) { r = 244; g = 242; b = 236; }
    else if (RW[q] > 0) { const w = RW[q], l = RL[q] || 0.9; r += (Math.min(255, 184 * l) - r) * w; g += (Math.min(255, 51 * l) - g) * w; b += (Math.min(255, 59 * l) - b) * w; }
    if (P2 && SKO[q]) { const m = M[q] * (1 - k); bild[o] = r * m + P2[o] * (1 - m); bild[o + 1] = g * m + P2[o + 1] * (1 - m); bild[o + 2] = b * m + P2[o + 2] * (1 - m); continue; }
    if (k >= 1) { bild[o] = pr; bild[o + 1] = pg; bild[o + 2] = pb; continue; }
    bild[o] = r * (1 - k) + pr * k; bild[o + 1] = g * (1 - k) + pg * k; bild[o + 2] = b * (1 - k) + pb * k; }
  antal++; if (!kod.stdin.write(bild)) await once(kod.stdin, 'drain');
}
kod.stdin.end(); const [slut] = await klar; if (slut !== 0) throw Error('FFmpeg kunde inte skriva filmen.');
console.log(`${antal} rutor lagda på ${platta}: ${mal} (bordet börjar vid rad ${kant})`);
}
