// Lägger en dealer som är filmad i nyckelfärger (editorns utseende nyckel: grönt överallt) på vårt eget bord: dealern,
// stolen, skon och korten klipps ut ur den gröna filmen och läggs på en bild av bordet ensamt, tagen genom samma kamera.
// Bordet, bakgrunden och ljuset är då samma bildpunkter i varje klipp, hur filmmodellen än har ritat det gröna, och
// bara dealern kommer ur filmen (Jakob 2026-11-26: "bordet och allt omkring bli grönt och sedan ska vi lägga in den
// utskurne avataren ovanpå ... tillbaka till 3d-bordet. Så gör väl dealer").
//
//   node standarddocka/verktyg/lagg-pa-bord.ts <grön film.mp4> --platta <bordet ensamt.png> --ut <film.mp4>
//        [--kortfarger]   spårkortets färger görs om till ett vanligt kort: den gula ryggen röd, ramen och märket vita
//        [--skugga 1]     hur mycket av dealerns skugga på filten som läggs på vårt bord (0 ingen, 1 som i filmen)
//        [--falt <film>]  det rena gröna mäts i den filmen i stället: hela tagningen, när filmen som läggs är ett klipp
//                         ur den (i ett kort klipp ligger skuggan kvar på samma ställe och räknas annars som rent grönt)
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

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const film = process.argv[2], platta = arg('--platta'), ut = arg('--ut'), kortfarger = process.argv.includes('--kortfarger'), skugga = Number(arg('--skugga') ?? '1'), falt = arg('--falt') ?? film;
if (!film || film.startsWith('--') || !platta || !ut || !(skugga >= 0 && skugga <= 1)) throw Error('node standarddocka/verktyg/lagg-pa-bord.ts <grön film.mp4> --platta <bordet ensamt.png> --ut <film.mp4> [--kortfarger] [--skugga 1]');
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
const C = 4, cw = Math.ceil(W / C), ch = Math.ceil(H / C), rent = new Float32Array(cw * ch); let kant = -1, antal = 0;
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
const kod = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', takt, '-i', '-', '-vf', 'scale=out_color_matrix=bt709:out_range=tv', ...KOD, ut], {stdio: ['pipe', 'ignore', 'inherit'], windowsHide: true});
const klar = once(kod, 'close'), bild = Buffer.alloc(N);
for await (const f of rutor(film)) {
  const uppe = hornet(f, ...HORN.uppe), nere = hornet(f, ...HORN.nere), ru = uppe[1] - Math.max(uppe[0], uppe[2]), rn = nere[1] - Math.max(nere[0], nere[2]), ln = ljus(nere[0], nere[1], nere[2]);
  for (let y = 0; y < H; y++) { const bord = y >= kant, ren = bord ? rn : ru, rad = (y / C | 0) * cw;
    for (let x = 0; x < W; x++) { const o = (y * W + x) * 3; let r = f[o], g = f[o + 1], b = f[o + 2]; const k = gron(r, g, b, ren);
      // Vårt bord, med dealerns skugga där det gröna är mörkare än det rena gröna på stället.
      let pr = P[o], pg = P[o + 1], pb = P[o + 2];
      if (k > 0 && bord && skugga > 0) { const rentHar = rent[rad + (x / C | 0)] || 1, s = 1 - skugga * (1 - Math.min(1, ljus(r, g, b) / (ln * rentHar))); pr *= s; pg *= s; pb *= s; }
      if (k >= 1) { bild[o] = pr; bild[o + 1] = pg; bild[o + 2] = pb; continue; }
      // Dealern: det gröna som spiller över i kanten tas ned till det största av rött och blått.
      if (g > Math.max(r, b)) g = Math.max(r, b);
      if (kortfarger) { // spårkortets färger (editor/scen.ts NYCKEL) blir ett vanligt kort: röd rygg, vit framsida
        if (r > 170 && g > 130 && b < 110 && r - b > 100) { const l = ljus(r, g, b) / 205; r = Math.min(255, 184 * l); g = Math.min(255, 51 * l); b = Math.min(255, 59 * l); }
        else if ((b > 170 && g > 130 && r < 120) || (r > 170 && b > 140 && g < 120)) { r = 244; g = 242; b = 236; } }
      bild[o] = r * (1 - k) + pr * k; bild[o + 1] = g * (1 - k) + pg * k; bild[o + 2] = b * (1 - k) + pb * k; } }
  antal++; if (!kod.stdin.write(bild)) await once(kod.stdin, 'drain');
}
kod.stdin.end(); const [slut] = await klar; if (slut !== 0) throw Error('FFmpeg kunde inte skriva filmen.');
console.log(`${antal} rutor lagda på ${platta}: ${ut} (bordet börjar vid rad ${kant})`);
