// Mäter en rörelse utan webbläsare: händernas och kortets lägen ruta för ruta, som de blir med det som är sparat i
// standarddocka/rorelser/ (ändringarna och farten), prövade mot vad en hand och ett kort kan göra. För den som granskar
// en rörelse: talen säger var det är värt att titta (verktyg/titta.ts), de dömer inte rörelsen.
//
//   node standarddocka/verktyg/mat.ts --plats 7 [--json] [--giv <namn>] [--vilan <namn>]
//   --giv, --vilan: en grundrörelse på prov (en fil i blackjack-dealer/dealer3d/data, utan .json) i stället för platsens
//   giv eller vilan till skon; då mäts den utan det sparade lagret.
//
// Vad som mäts (filten är y = 0, meter; tider är filmens sekunder):
// - handen: en led bortom vad ett finger kan, fingrar i varandra, ett finger genom kortet eller i filten (handFaults i
//   blackjack-dealer/dealer3d/src/hand-rule.ts, dockans egen regel), och handleden böjd mer än 70 grader;
// - kortet: ett hörn under filten, ett hopp i farten, en vändning på mer än 40 grader mellan två rutor, och rutor där
//   kortet är ute ur skon utan stöd: varken hållet mellan fingrar på var sin sida, tryckt mot filten av ett finger, eller
//   liggande; fallet före landningen jämförs med vad tyngdkraften ger;
// - landningen: plant, på filten, med framsidan upp, hur långt från planens plats, och stilla efteråt;
// - farten: handledernas högsta fart och de häftigaste ryck (ett hack i filmen är ett ryck).
// Armarna mot bordskanten mäts inte här: det gör editorn på mannens kropp (state().armar i verktyg/titta.ts).
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {handFaults} from '../../blackjack-dealer/dealer3d/src/hand-rule.ts';
import {spots, type Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {CARD, TABLE_LENS, type Vec3} from '../../blackjack-dealer/src/table-lens.ts';
import {GIVAR, TILL_SKON, rutaVid, medAndringar, sattIhop, takt, type Motion, type Sparad} from '../editor/rorelse.ts';

const arg = (name: string, fallback?: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const plats = Number(arg('--plats', '4')); if (!GIVAR[plats]) throw Error('--plats tar 1–7.');
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), las = async <X>(fil: string) => JSON.parse(await readFile(path.join(ROOT, fil), 'utf8')) as X;
// --giv och --vilan: en grundrörelse på prov i stället för platsens, mätt utan det sparade lagret.
const provgiv = arg('--giv'), provvila = arg('--vilan'); if (![provgiv, provvila].every(n => n === undefined || /^[a-z0-9][a-z0-9-]*$/.test(n))) throw Error('--giv och --vilan tar ett filnamn ur blackjack-dealer/dealer3d/data, utan .json.');
const [forsta, andra, plan] = await Promise.all([las<Motion>(`blackjack-dealer/dealer3d/data/${provvila ?? TILL_SKON}.json`), las<Motion>(`blackjack-dealer/dealer3d/data/${provgiv ?? GIVAR[plats]}.json`), las<Plan>('blackjack-dealer/placements/default.json')]);
const sparad = provgiv || provvila ? null : await las<Sparad>(`standarddocka/rorelser/a1-a23-p${plats}c1.json`).catch(() => null);
const f = sattIhop(forsta, andra, plats), T = takt(f, sparad?.fart), fps = f.fps, antal = Math.round(T.langd * fps) + 1;

const sub = (a: number[], b: number[]): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: number[]) => Math.hypot(a[0], a[1], a[2]), grader = (cos: number) => Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
const r2 = (n: number) => Math.round(n * 100) / 100, mm = (m: number) => Math.round(m * 1000);

// Varje ruta i filmens takt, med ändringarna, och vad som håller kortet i den.
const rutor = Array.from({length: antal}, (_, i) => { const g = T.grund(i / fps), {frame, held} = rutaVid(f, g); return {t: i / fps, x: medAndringar(frame, held, g, sparad?.andringar ?? [])}; });
const lamnar = Math.round(T.ut((f.forskjutning + andra.leavesShoe) / fps) * fps), ligger = Math.min(antal - 1, Math.round(T.ut((f.forskjutning + andra.rests) / fps) * fps));
const horn = (c: {c: number[]; l: number[]; n: number[]}) => { const s = cross(c.n, c.l); return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [0, 1, 2].map(k => c.c[k] + c.l[k] * a * CARD.height / 2 + s[k] * b * CARD.width / 2)); };
/** Var en punkt är mot kortet: längs, tvärs och ut ur framsidan; null om den inte rör det (inom 1 cm från kanten och 16 mm från ytan). */
const mot = (c: {c: number[]; l: number[]; n: number[]}, p: number[]) => { const d = sub(p, c.c), u = dot(d, c.l), v = dot(d, cross(c.n, c.l)), w = dot(d, c.n); return Math.abs(u) < CARD.height / 2 + 0.01 && Math.abs(v) < CARD.width / 2 + 0.01 && Math.abs(w) < 0.016 ? w : null; };
const FINGRAR = [2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 20];

type Fynd = {vad: string; rutor: number; varst: string; vid: number};
const fynd: Fynd[] = [], samla = new Map<string, {rutor: number; by: number; text: string; vid: number}>();
const not = (nyckel: string, by: number, text: string, t: number) => { const s = samla.get(nyckel) ?? {rutor: 0, by: -Infinity, text: '', vid: t}; s.rutor++; if (by > s.by) { s.by = by; s.text = text; s.vid = t; } samla.set(nyckel, s); };
const utanStod: number[] = [];
rutor.forEach(({t, x}, i) => {
  const ute = i > lamnar && i < ligger, kort = x.card as {c: Vec3; l: Vec3; n: Vec3};
  for (const [sida, namn, tecken] of [['R', 'höger hand', 1], ['L', 'vänster hand', -1]] as const) {
    for (const fel of handFaults(x[sida].p as Vec3[], tecken, null, i >= lamnar ? kort : null)) if (fel.kind !== 'ordning' && fel.kind !== 'grannen') not(`${namn}: ${fel.kind === 'led' ? 'en led bortom vad ett finger kan' : fel.kind === 'i varandra' ? 'fingrar i varandra' : fel.kind === 'kortet' ? 'ett finger i eller genom kortet' : fel.kind === 'filten' ? 'ett finger i filten' : fel.kind}`, fel.by, fel.what, t);
    const led = grader(dot(sub(x[sida].w, x[sida].e), sub(x[sida].p[9], x[sida].p[0])) / (len(sub(x[sida].w, x[sida].e)) * len(sub(x[sida].p[9], x[sida].p[0])) || 1));
    if (led > 70) not(`${namn}: handleden böjd mer än 70 grader`, led, `${Math.round(led)}°`, t);
  }
  const lagst = Math.min(...horn(kort).map(p => p[1])); if (i >= lamnar && lagst < -0.002) not('kortet: ett hörn under filten', -lagst, `${mm(-lagst)} mm under`, t);
  if (ute) { const sidor = [...FINGRAR.map(k => mot(kort, x.R.p[k])), ...FINGRAR.map(k => mot(kort, x.L.p[k]))].filter(w => w !== null) as number[];
    const hallet = sidor.some(w => w > 0) && sidor.some(w => w < 0), motFilten = lagst < 0.004 && sidor.length > 0, liggande = horn(kort).every(p => p[1] < 0.004);
    if (!hallet && !motFilten && !liggande) { utanStod.push(i); not('kortet: ute ur skon utan stöd (varken hållet, tryckt mot filten eller liggande)', kort.c[1], `${mm(kort.c[1])} mm över filten`, t); } }
  if (i > 0) { const y = rutor[i - 1].x.card, vinkel = grader(dot(kort.n, y.n)), lang = grader(Math.abs(dot(kort.l, y.l)));
    if (i > lamnar && vinkel > 40) not('kortet: vänder mer än 40 grader mellan två rutor', vinkel, `${Math.round(vinkel)}° på en ruta`, t);
    if (i > lamnar && lang > 40) not('kortet: vrids mer än 40 grader i sitt plan mellan två rutor', lang, `${Math.round(lang)}° på en ruta`, t); }
});
for (const [vad, s] of samla) fynd.push({vad, rutor: s.rutor, varst: s.text, vid: r2(s.vid)});

// Farten och rycken: fart i m/s mellan rutor, ryck som fartens ändring per ruta räknat i m/s².
const ryck = (punkt: (i: number) => number[]) => { const v = rutor.map((_, i) => i ? len(sub(punkt(i), punkt(i - 1))) * fps : 0), a = v.map((_, i) => i > 1 ? Math.abs(v[i] - v[i - 1]) * fps : 0);
  return {hogstaFart: r2(Math.max(...v)), haftigast: a.map((x, i) => ({vid: r2(i / fps), ms2: Math.round(x)})).sort((p, q) => q.ms2 - p.ms2).slice(0, 3)}; };
const fart = {hogerHandled: ryck(i => rutor[i].x.R.w), vansterHandled: ryck(i => rutor[i].x.L.w), kortet: ryck(i => rutor[i].x.card.c)};

// Landningen och fallet före den.
const sist = rutor[ligger].x.card, mal = spots(plan, TABLE_LENS).find(s => s.id === `P${plats}.C1`);
const landning = {vid: r2(ligger / fps), plant: Math.abs(sist.n[1]) > Math.cos(3 * Math.PI / 180), lutarGrader: Math.round(grader(Math.abs(sist.n[1])) * 10) / 10, overFiltenMm: mm(sist.c[1]), framsidanUpp: sist.n[1] > 0,
  franPlatsenMm: mal ? mm(Math.hypot(sist.c[0] - mal.at[0], sist.c[2] - mal.at[2])) : null, rorSigEfterMm: mm(Math.max(0, ...rutor.slice(ligger).map(r => len(sub(r.x.card.c, sist.c)))))};
let fall: {fran: number; hojdMm: number; tar: number; tyngdkraftenGer: number} | null = null;
{ let i = ligger; while (i > lamnar && utanStod.includes(i - 1)) i--; if (i < ligger) { const h = rutor[i].x.card.c[1] - sist.c[1]; fall = {fran: r2(i / fps), hojdMm: mm(h), tar: r2((ligger - i) / fps), tyngdkraftenGer: r2(Math.sqrt(2 * Math.max(0, h) / 9.81))}; } }

const tider = [...new Set([...fynd.map(x => x.vid), landning.vid, r2(lamnar / fps), ...fart.kortet.haftigast.map(x => x.vid)])].sort((a, b) => a - b);
const ut = {rorelse: provgiv || provvila ? `prov: ${provvila ?? TILL_SKON} och ${provgiv ?? GIVAR[plats]}` : `a1-a23-p${plats}c1`, plats, langd: r2(T.langd), fart: T.fart, andringar: sparad?.andringar.length ?? 0, delar: T.delar.map(d => `${d.namn} ${r2(d.fran)}–${r2(d.till)} s`), kortetLamnarSkon: r2(lamnar / fps), fynd, landning, fall, farten: fart, tiderAttTittaPa: tider};
if (process.argv.includes('--json')) console.log(JSON.stringify(ut, null, 1));
else {
  console.log(`${ut.rorelse}: ${ut.langd} s (${ut.delar.join(' · ')}), ${ut.andringar} ändringar, farten ${T.fart.join(' / ')}`);
  console.log(fynd.length ? fynd.map(x => `  MÄRKT  ${x.vad}: ${x.rutor} rutor, värst vid ${x.vid} s (${x.varst})`).join('\n') : '  Inget märkt på händerna eller kortet.');
  console.log(`  Landningen vid ${landning.vid} s: ${landning.plant ? 'plant' : `lutar ${landning.lutarGrader}°`}, ${landning.overFiltenMm} mm över filten, framsidan ${landning.framsidanUpp ? 'upp' : 'NED'}, ${landning.franPlatsenMm} mm från planens plats, rör sig ${landning.rorSigEfterMm} mm efteråt.`);
  if (fall) console.log(`  Fallet: utan stöd från ${fall.fran} s, ${fall.hojdMm} mm på ${fall.tar} s; tyngdkraften ger ${fall.tyngdkraftenGer} s.`);
  for (const [vad, x] of Object.entries(fart)) console.log(`  ${vad}: högst ${x.hogstaFart} m/s; häftigaste rycken ${x.haftigast.map(h => `${h.ms2} m/s² vid ${h.vid} s`).join(', ')}`);
  console.log(`  Tider att titta på: ${tider.join(',')}`);
}
