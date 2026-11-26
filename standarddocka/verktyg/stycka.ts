// Styckar en film av hela rundan i sina klipp, efter klipplistan som verktyg/titta.ts --spela-in runda skriver
// (klipp/runda-c1-<docka>.json). Filmen är dockans egen tagning eller samma tagning omgjord av en filmmodell: en modell
// som behåller rörelsen ruta för ruta (Aleph 2) lämnar lika många rutor, och då gäller listans rutor också för den.
//
//   node standarddocka/verktyg/stycka.ts <film.mp4> --lista <klipplista.json> --ut <mapp>
//        [--marginal 2]        så många rutor tas bort på var sida om varje klipp i tagningen: där försvinner kortet från
//                              bordet, och en filmmodell kan smeta ut det bytet över någon ruta. Rutorna där är stilla
//                              (klippets stillhet före och efter rörelsen), så rörelsen rörs inte. Förval 0.
//        [--ordning 4,1,7]     gör också en följd: vilan till skon och sedan givarna till de platserna i den ordningen,
//                              lagda efter varandra. Visar om klippen möts i ankaret i vilken ordning som helst.
//
// Skriver <mapp>/<nr>-<klipp>.mp4 (a1-a23, a23-p7c1-a23 …), <mapp>/foljd-<ordning>.mp4 och <mapp>/klipp.json. Stannar med
// ett fel om filmen inte har listans antal rutor eller rutor per sekund, eller om marginalen är större än stillheten.
// Kräver FFmpeg på datorn (FFMPEG och FFPROBE pekar ut dem om de inte ligger i sökvägen).
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

type Klipp = {namn: string; plats: number | null; forsta: number; stillaTill: number; stillaFran: number; sista: number};
type Lista = {namn: string; fps: number; rutor: number; klipp: Klipp[]};

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const film = process.argv[2], listfil = arg('--lista'), ut = arg('--ut'), marginal = Number(arg('--marginal') ?? '0'), ordning = arg('--ordning')?.split(',').map(Number);
if (!film || film.startsWith('--') || !listfil || !ut || !(marginal >= 0) || !Number.isInteger(marginal)) throw Error('node standarddocka/verktyg/stycka.ts <film.mp4> --lista <klipplista.json> --ut <mapp> [--marginal 2] [--ordning 4,1,7]');
const FFMPEG = process.env.FFMPEG || 'ffmpeg', FFPROBE = process.env.FFPROBE || 'ffprobe';
const kor = (program: string, args: string[]) => { const r = spawnSync(program, args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true}); if (r.error || r.status !== 0) throw Error(`${program} föll: ${r.error ?? r.stderr.slice(-600)}`); return r.stdout; };

const lista = JSON.parse(readFileSync(listfil, 'utf8')) as Lista;
const [takt, antal] = kor(FFPROBE, ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,nb_read_frames', '-of', 'csv=p=0', film]).trim().split(','), [a, b] = takt.split('/').map(Number), fps = a / (b || 1);
if (Number(antal) !== lista.rutor || Math.abs(fps - lista.fps) > 0.01) throw Error(`${film} har ${antal} rutor i ${fps} rutor/s, men ${lista.namn} har ${lista.rutor} rutor i ${lista.fps}: klipplistan gäller inte den filmen.`);

// Varje klipps rutor i filmen, med marginalen borttagen där klippet möter ett annat (inte i tagningens första och sista ruta).
const bitar = lista.klipp.map((k, i) => {
  const fran = k.forsta + (i ? marginal : 0), till = k.sista - (i < lista.klipp.length - 1 ? marginal : 0);
  if (fran > k.stillaTill || till < k.stillaFran) throw Error(`${k.namn}: marginalen ${marginal} är större än klippets stillhet (rutorna ${k.forsta}–${k.stillaTill} före och ${k.stillaFran}–${k.sista} efter).`);
  return {...k, fran, till, fil: `${String(i + 1).padStart(2, '0')}-${k.namn.toLowerCase().replaceAll('.', '').replaceAll('>', '-')}.mp4`};
});
// Samma inkodning som editorns inspelning (editor/server.ts), så att ett klipp ser ut som tagningen det kom ur.
const KOD = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart'];
const del = (x: {fran: number; till: number}, namn: string) => `[0:v]trim=start_frame=${x.fran}:end_frame=${x.till + 1},setpts=PTS-STARTPTS[${namn}]`;
mkdirSync(ut, {recursive: true});
for (const x of bitar) kor(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', film, '-filter_complex', del(x, 'v'), '-map', '[v]', ...KOD, path.join(ut, x.fil)]);

let foljd: string | null = null;
if (ordning) {
  const valda = [bitar[0], ...ordning.map(p => bitar.find(x => x.plats === p) ?? (() => { throw Error(`--ordning: listan har ingen giv till plats ${p}.`); })())];
  foljd = `foljd-${ordning.join('-')}.mp4`;
  kor(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', film, '-filter_complex', `${valda.map((x, i) => del(x, `d${i}`)).join(';')};${valda.map((_, i) => `[d${i}]`).join('')}concat=n=${valda.length}:v=1:a=0[v]`, '-map', '[v]', ...KOD, path.join(ut, foljd)]);
}
writeFileSync(path.join(ut, 'klipp.json'), JSON.stringify({film: path.basename(film), lista: lista.namn, fps: lista.fps, marginal, klipp: bitar.map(x => ({fil: x.fil, namn: x.namn, plats: x.plats, rutorITagningen: [x.fran, x.till], rutor: x.till - x.fran + 1})), foljd}, null, 1) + '\n');
console.log(`${bitar.length} klipp${foljd ? ` och ${foljd}` : ''} i ${ut} (marginal ${marginal} rutor)`);
