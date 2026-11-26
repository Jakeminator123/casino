// Mäter en rörelse utan webbläsare: händernas och kortets lägen ruta för ruta, som de blir med det som är sparat i
// standarddocka/rorelser/ (ändringarna och farten), prövade mot vad en hand och ett kort kan göra. För den som granskar
// en rörelse: talen säger var det är värt att titta (verktyg/titta.ts), de dömer inte rörelsen.
//
//   node standarddocka/verktyg/mat.ts --plats 7 [--json] [--giv <namn>] [--vilan <namn>] [--docka man|kvinna]
//   node standarddocka/verktyg/mat.ts --alla [--giv-monster giv-fran-2-3-p#c1-<namn>] [--docka man|kvinna]
//   --docka: grundrörelserna editorn spelar för den dockan (rorelse.ts EGNA: dockans egna där de finns, annars de äldre),
//   med det lagret; förvalet är mannen, som i editorn.
//   --giv, --vilan: en grundrörelse på prov (en fil i blackjack-dealer/dealer3d/data, utan .json) i stället för platsens
//   giv eller vilan till skon; då mäts den utan det sparade lagret.
//   --alla: alla sju platser, en rad var, och slutkoden 1 om någon har en spärr (nedan). Med --giv-monster mäts en
//   grundrörelse på prov per plats; # byts mot platsens nummer. Spärren är till för att köras innan något filmas.
//
// Vad som mäts (filten är y = 0, meter; tider är filmens sekunder). Rörelsen räknas som editorn räknar den
// (rorelse.ts stallning, med takten, ändringarna och de små egna rörelserna; spärren i kropp.ts med kroppens mått som
// Spara skrev i .rutor.json, när de hör till det sparade), utan blicken och utan editorns lyft av armbågarna över
// bordskanten (armar.ts, som kräver dockan):
// - benen: överarmen, underarmen och varje fingerben ska ha samma längd i varje ruta av en grundrörelse (högst 1 mm från
//   dess första ruta); dockan ritas med sina egna ben och följer inte en rörelse vars ben växer;
// - armen: handleden inom armens räckvidd (BODY i blackjack-dealer/dealer3d/src/body.ts, armen som dockan skalas till,
//   räknat från rörelsens axel), och handen högst GRANS.handled (50) grader från underarmen, den vinkel kroppen ritar
//   (figure-model.ts; underarmen som dockan ställer den, med BODY:s ben och armbågen åt rörelsens håll);
// - handen: en led bortom vad ett finger kan, fingrar i varandra, ett finger genom kortet eller i filten (handFaults i
//   blackjack-dealer/dealer3d/src/hand-rule.ts, dockans egen regel);
// - kortet: ett hörn under filten, en vändning på mer än 40 grader mellan två rutor, och rutor där kortet är ute ur skon
//   utan stöd: varken hållet mellan fingrar på var sin sida, tryckt mot filten av ett finger, eller liggande; fallet före
//   landningen jämförs med vad tyngdkraften ger;
// - hopp: en handled eller kortet flyttar sig i en ruta minst 15 mm längre än i rutan före och rutan efter (ett hack i
//   filmen; ett jämnt snabbt drag är inget hopp);
// - landningen: plant, på filten, med framsidan upp, hur långt från planens plats, och stilla efteråt;
// - farten: handledernas högsta fart och de häftigaste ryck.
// Spärrar (det som inte får finnas i en rörelse som filmas): ett ben som ändrar längd, en handled bortom räckvidden, en
// hand bortom den vinkel kroppen ritar, ett finger genom kortet, ett finger i filten, kortet utan stöd, ett hörn under
// filten, ett hopp, och en landning som inte är plan, på platsen och stilla.
// Armarna mot bordskanten mäts inte här: det gör editorn på mannens kropp (state().armar i verktyg/titta.ts), och
// window.editor.granskaGrund() mäter räckvidden och handleden på dockans egen axel.
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {BODY} from '../../blackjack-dealer/dealer3d/src/body.ts';
import {handFaults} from '../../blackjack-dealer/dealer3d/src/hand-rule.ts';
import {spots, type Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {CARD, TABLE_LENS, type Vec3} from '../../blackjack-dealer/src/table-lens.ts';
import {GIVAR, grundFor, sattIhop, vilanFor, stallning, taktFor, type Limb, type Motion, type Sparad, type Standarddocka} from '../editor/rorelse.ts';
import {GRANS, type Granser} from '../editor/kropp.ts';

const arg = (name: string, fallback?: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), las = async <X>(fil: string) => JSON.parse(await readFile(path.join(ROOT, fil), 'utf8')) as X;
const namnOk = (n: string | undefined) => n === undefined || /^[a-z0-9][a-z0-9-]*$/.test(n);

const sub = (a: number[], b: number[]): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: number[]) => Math.hypot(a[0], a[1], a[2]), grader = (cos: number) => Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
const r2 = (n: number) => Math.round(n * 100) / 100, mm = (m: number) => Math.round(m * 1000);
type Kort = {c: number[]; l: number[]; n: number[]};
const horn = (c: Kort) => { const s = cross(c.n, c.l); return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [0, 1, 2].map(k => c.c[k] + c.l[k] * a * CARD.height / 2 + s[k] * b * CARD.width / 2)); };
/** Var en punkt är mot kortet, ut ur framsidan; null om den inte rör det (inom 1 cm från kanten och 16 mm från ytan). */
const mot = (c: Kort, p: number[]) => { const d = sub(p, c.c), u = dot(d, c.l), v = dot(d, cross(c.n, c.l)), w = dot(d, c.n); return Math.abs(u) < CARD.height / 2 + 0.01 && Math.abs(v) < CARD.width / 2 + 0.01 && Math.abs(w) < 0.016 ? w : null; };
const FINGRAR = [2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 20];
/** Fynd som stoppar en rörelse från att filmas. */
const SPARR = /ändrar längd|bortom armens räckvidd|från underarmen|ett finger i eller genom kortet|ett finger i filten|utan stöd|ett hörn under filten|hoppar/;
const SIDOR = [['R', 'höger'], ['L', 'vänster']] as const;
/** Fingrarnas ben (MediaPipes punkter, varje finger från knogen ut), som dockans fingerben ligger mellan dem (figure-model.ts). */
const FINGERBEN = ([['tummens', 1], ['pekfingrets', 5], ['långfingrets', 9], ['ringfingrets', 13], ['lillfingrets', 17]] as const).flatMap(([namn, s]) => [0, 1, 2].map(n => ({namn: `${namn} ${['första', 'andra', 'tredje'][n]} ben`, a: s + n, b: s + n + 1})));
/** Armens längd när den är rak: dockan skalas så att armen blir BODY:s (figure-model.ts), och når 2 mm kortare än så. */
const RACKVIDD = BODY.upperArm + BODY.forearm - 0.002;
/** Underarmen som dockan ställer den: från axeln med BODY:s ben, armbågen åt det håll rörelsens armbåge står från linjen axel–handled (figure-model.ts pose). */
function underarmen(l: Limb): Vec3 {
  const d = sub(l.w, l.s), avst = len(d), dir = d.map(n => n / (avst || 1)), a = BODY.upperArm, b = BODY.forearm;
  const far = Math.min(a + b - 0.002, Math.max(Math.abs(a - b) + 0.002, avst)), langs = (a * a - b * b + far * far) / (2 * far);
  const r = sub(l.e, l.s), ut = sub(r, dir.map(n => n * dot(r, dir))), u = len(ut) > 1e-6 ? ut.map(n => n / len(ut)) : [0, -1, 0], h = Math.sqrt(Math.max(0, a * a - langs * langs));
  return sub(l.w, [0, 1, 2].map(k => l.s[k] + dir[k] * langs + u[k] * h));
}

type Fynd = {vad: string; rutor: number; varst: string; vid: number};
async function mat(plats: number, provgiv?: string, provvila?: string, docka: Standarddocka = 'man') {
  const egen = grundFor(docka, plats), prov = !!(provgiv || provvila), giv = provgiv ?? egen.giv;
  const [andra, plan] = await Promise.all([las<Motion>(`blackjack-dealer/dealer3d/data/${giv}.json`), las<Plan>('blackjack-dealer/placements/default.json')]);
  // En giv på prov utan --vilan börjar i vilan för den docka den är ritad för (som i editorn).
  const namn = {vila: provvila ?? (provgiv ? vilanFor(andra.doll) : egen.vila), giv}, forsta = await las<Motion>(`blackjack-dealer/dealer3d/data/${namn.vila}.json`);
  // Det sparade lagret gäller bara de grundrörelser det sparades på (som i editorn); kroppens mått för spärren står i
  // .rutor.json från samma Spara.
  const fil = prov ? null : await las<Sparad>(`standarddocka/rorelser/${egen.namn}.json`).catch(() => null);
  const aldre = !!fil && !(fil.grund?.length === 2 && fil.grund[0] === namn.vila && fil.grund[1] === namn.giv), sparad = aldre ? null : fil;
  const sparadeRutor = sparad ? await las<{made?: string; granser?: Granser}>(`standarddocka/rorelser/${egen.namn}.rutor.json`).catch(() => null) : null;
  const granser = sparadeRutor?.made && sparadeRutor.made === sparad?.sparad ? sparadeRutor.granser : undefined;
  const f = sattIhop(forsta, andra, plats), T = taktFor(f, sparad?.fart, prov), fps = f.fps, antal = Math.round(T.langd * fps) + 1;
  // Varje ruta i filmens takt, med ändringarna och de små egna rörelserna, som editorn ställer den.
  const rutor = Array.from({length: antal}, (_, i) => ({t: i / fps, x: stallning(f, T.grund(i / fps), sparad?.andringar ?? [], null, sparad?.liv, granser, T.spelad)}));
  const lamnar = Math.round(T.ut((f.forskjutning + andra.leavesShoe) / fps) * fps), ligger = Math.min(antal - 1, Math.round(T.ut((f.forskjutning + andra.rests) / fps) * fps));

  const samla = new Map<string, {rutor: number; by: number; text: string; vid: number}>();
  const not = (nyckel: string, by: number, text: string, t: number) => { const s = samla.get(nyckel) ?? {rutor: 0, by: -Infinity, text: '', vid: t}; s.rutor++; if (by > s.by) { s.by = by; s.text = text; s.vid = t; } samla.set(nyckel, s); };
  // Benens längd i var och en av grundrörelserna, mot dess första ruta. Rutan räknas om till filmens tid i följden
  // (vilan till skon är följdens första rutor, given börjar där skon är).
  for (const [m, mnamn, forst] of [[forsta, namn.vila, 0], [andra, namn.giv, f.forskjutning]] as const) for (const [s, sida] of SIDOR) {
    const ben = [{del: 'arm', namn: 'överarmen', p: (l: Limb) => [l.s, l.e]}, {del: 'arm', namn: 'underarmen', p: (l: Limb) => [l.e, l.w]}, ...FINGERBEN.map(x => ({del: 'hand', namn: x.namn, p: (l: Limb) => [l.p[x.a], l.p[x.b]]}))];
    for (const b of ben) { const l = m.frames.map(x => { const [p, q] = b.p(x[s]); return len(sub(p, q)); }), mm1 = (n: number) => Math.round(n * 10000) / 10;
      l.forEach((x, j) => { const fran = x - l[0]; if (Math.abs(fran) > 0.001) not(`${sida} ${b.del}: ${b.namn} ändrar längd i ${mnamn}`, Math.abs(fran), `${fran > 0 ? '+' : ''}${mm1(fran)} mm (${mm1(Math.min(...l))}–${mm1(Math.max(...l))} mm)`, Math.min(T.langd, T.ut((forst + j) / fps))); }); }
  }
  const utanStod: number[] = [];
  rutor.forEach(({t, x}, i) => {
    const ute = i > lamnar && i < ligger, kort = x.card as {c: Vec3; l: Vec3; n: Vec3};
    for (const [sida, namn, tecken] of [['R', 'höger hand', 1], ['L', 'vänster hand', -1]] as const) {
      for (const fel of handFaults(x[sida].p as Vec3[], tecken, null, i >= lamnar ? kort : null)) if (fel.kind !== 'ordning' && fel.kind !== 'grannen') not(`${namn}: ${fel.kind === 'led' ? 'en led bortom vad ett finger kan' : fel.kind === 'i varandra' ? 'fingrar i varandra' : fel.kind === 'kortet' ? 'ett finger i eller genom kortet' : fel.kind === 'filten' ? 'ett finger i filten' : fel.kind}`, fel.by, fel.what, t);
      const arm = sida === 'R' ? 'höger arm' : 'vänster arm', bort = len(sub(x[sida].w, x[sida].s)) - RACKVIDD;
      if (bort > 0.001) not(`${arm}: handleden bortom armens räckvidd`, bort, `${mm(bort)} mm bortom`, t);
      const led = grader(dot(underarmen(x[sida]), sub(x[sida].p[9], x[sida].p[0])) / (len(underarmen(x[sida])) * len(sub(x[sida].p[9], x[sida].p[0])) || 1));
      if (led > GRANS.handled + GRANS.tolGrader) not(`${namn}: mer än ${GRANS.handled} grader från underarmen (den ritade handen följer inte)`, led, `${Math.round(led)}°`, t);
    }
    const lagst = Math.min(...horn(kort).map(p => p[1])); if (i >= lamnar && lagst < -0.002) not('kortet: ett hörn under filten', -lagst, `${mm(-lagst)} mm under`, t);
    if (ute) { const sidor = [...FINGRAR.map(k => mot(kort, x.R.p[k])), ...FINGRAR.map(k => mot(kort, x.L.p[k]))].filter(w => w !== null) as number[];
      const hallet = sidor.some(w => w > 0) && sidor.some(w => w < 0), motFilten = lagst < 0.004 && sidor.length > 0, liggande = horn(kort).every(p => p[1] < 0.004);
      if (!hallet && !motFilten && !liggande) { utanStod.push(i); not('kortet: ute ur skon utan stöd (varken hållet, tryckt mot filten eller liggande)', kort.c[1], `${mm(kort.c[1])} mm över filten`, t); } }
    if (i > 0) { const y = rutor[i - 1].x.card, vinkel = grader(dot(kort.n, y.n)), lang = grader(Math.abs(dot(kort.l, y.l)));
      if (i > lamnar && vinkel > 40) not('kortet: vänder mer än 40 grader mellan två rutor', vinkel, `${Math.round(vinkel)}° på en ruta`, t);
      if (i > lamnar && lang > 40) not('kortet: vrids mer än 40 grader i sitt plan mellan två rutor', lang, `${Math.round(lang)}° på en ruta`, t); }
  });
  // Farten, rycken och hoppen: steget per ruta, fartens ändring räknad i m/s², och ett steg som sticker ut ur sina grannar.
  const ryck = (vad: string, punkt: (i: number) => number[]) => { const d = rutor.map((_, i) => i ? len(sub(punkt(i), punkt(i - 1))) : 0), v = d.map(x => x * fps), a = v.map((_, i) => i > 1 ? Math.abs(v[i] - v[i - 1]) * fps : 0);
    for (let i = 2; i < d.length - 1; i++) { const over = d[i] - Math.max(d[i - 1], d[i + 1]); if (over > 0.015) not(`${vad}: hoppar på en ruta`, over, `${mm(d[i])} mm på en ruta, ${mm(over)} mm längre än rutorna bredvid`, i / fps); }
    return {hogstaFart: r2(Math.max(...v)), haftigast: a.map((x, i) => ({vid: r2(i / fps), ms2: Math.round(x)})).sort((p, q) => q.ms2 - p.ms2).slice(0, 3)}; };
  const fart = {hogerHandled: ryck('höger handled', i => rutor[i].x.R.w), vansterHandled: ryck('vänster handled', i => rutor[i].x.L.w), kortet: ryck('kortet', i => rutor[i].x.card.c)};
  const fynd: Fynd[] = [...samla].map(([vad, s]) => ({vad, rutor: s.rutor, varst: s.text, vid: r2(s.vid)}));

  // Landningen och fallet före den.
  const sist = rutor[ligger].x.card, mal = spots(plan, TABLE_LENS).find(s => s.id === `P${plats}.C1`);
  const landning = {vid: r2(ligger / fps), plant: Math.abs(sist.n[1]) > Math.cos(3 * Math.PI / 180), lutarGrader: Math.round(grader(Math.abs(sist.n[1])) * 10) / 10, overFiltenMm: mm(sist.c[1]), framsidanUpp: sist.n[1] > 0,
    franPlatsenMm: mal ? mm(Math.hypot(sist.c[0] - mal.at[0], sist.c[2] - mal.at[2])) : null, rorSigEfterMm: mm(Math.max(0, ...rutor.slice(ligger).map(r => len(sub(r.x.card.c, sist.c)))))};
  let fall: {fran: number; hojdMm: number; tar: number; tyngdkraftenGer: number} | null = null;
  { let i = ligger; while (i > lamnar && utanStod.includes(i - 1)) i--; if (i < ligger) { const h = rutor[i].x.card.c[1] - sist.c[1]; fall = {fran: r2(i / fps), hojdMm: mm(h), tar: r2((ligger - i) / fps), tyngdkraftenGer: r2(Math.sqrt(2 * Math.max(0, h) / 9.81))}; } }
  const landarRatt = landning.plant && landning.framsidanUpp && Math.abs(landning.overFiltenMm) <= 3 && (landning.franPlatsenMm ?? 0) <= 5 && landning.rorSigEfterMm <= 1;
  const sparrar = [...fynd.filter(x => SPARR.test(x.vad)).map(x => `${x.vad} (${x.rutor} rutor, vid ${x.vid} s)`), ...(landarRatt ? [] : ['landningen är inte plan, på platsen och stilla'])];
  const tider = [...new Set([...fynd.map(x => x.vid), landning.vid, r2(lamnar / fps), ...fart.kortet.haftigast.map(x => x.vid)])].sort((a, b) => a - b);
  const lagret = prov ? 'inget (på prov)' : aldre ? 'hör till en äldre rörelse och används inte' : !sparad ? 'inget sparat' : granser ? 'sparat, genom spärren' : 'sparat, utan spärren (kroppens mått saknas i .rutor.json från samma Spara)';
  return {rorelse: prov ? `prov: ${namn.vila} och ${namn.giv}` : `${egen.namn} (${namn.vila} och ${namn.giv}${egen.egen ? `, ${docka === 'man' ? 'mannens' : 'kvinnans'} egna` : `, de äldre: ${docka === 'man' ? 'mannen' : 'kvinnan'} har ingen egen giv till plats ${plats} än`})`, plats, langd: r2(T.langd), fart: T.fart.map(r2), andringar: sparad?.andringar.length ?? 0, lagret,
    delar: T.delar.map(d => `${d.namn} ${r2(d.fran)}–${r2(d.till)} s`), kortetLamnarSkon: r2(lamnar / fps), fynd, sparrar, landning, fall, farten: fart, tiderAttTittaPa: tider};
}

const docka: Standarddocka = arg('--docka', 'man') === 'kvinna' ? 'kvinna' : 'man';
if (!['man', 'kvinna'].includes(arg('--docka', 'man')!)) throw Error('--docka tar man eller kvinna.');
if (process.argv.includes('--alla')) {
  const monster = arg('--giv-monster'); if (monster !== undefined && !namnOk(monster.replace('#', '1'))) throw Error('--giv-monster tar ett filnamn med # för platsens nummer.');
  let stopp = 0;
  for (let plats = 1; plats <= 7; plats++) { const m = await mat(plats, monster?.replace('#', String(plats)), undefined, docka); if (m.sparrar.length) stopp++;
    console.log(`plats ${plats}: ${m.rorelse}, ${m.langd} s (${m.delar.map(d => d.split(' ').slice(-2).join(' ')).join(' · ')}) ${m.sparrar.length ? `SPÄRR: ${m.sparrar.join('; ')}` : 'grön'}`); }
  console.log(stopp ? `${stopp} av 7 platser har en spärr: filma inte de givarna.` : 'Alla sju platser är gröna.');
  process.exit(stopp ? 1 : 0);
}
const plats = Number(arg('--plats', '4')), provgiv = arg('--giv'), provvila = arg('--vilan');
if (!GIVAR[plats]) throw Error('--plats tar 1–7.');
if (!namnOk(provgiv) || !namnOk(provvila)) throw Error('--giv och --vilan tar ett filnamn ur blackjack-dealer/dealer3d/data, utan .json.');
const ut = await mat(plats, provgiv, provvila, docka);
if (process.argv.includes('--json')) console.log(JSON.stringify(ut, null, 1));
else {
  console.log(`${ut.rorelse}: ${ut.langd} s (${ut.delar.join(' · ')}), ${ut.andringar} ändringar (lagret: ${ut.lagret}), farten ${ut.fart.join(' / ')}`);
  console.log(ut.fynd.length ? ut.fynd.map(x => `  MÄRKT  ${x.vad}: ${x.rutor} rutor, värst vid ${x.vid} s (${x.varst})`).join('\n') : '  Inget märkt på händerna eller kortet.');
  const l = ut.landning;
  console.log(`  Landningen vid ${l.vid} s: ${l.plant ? 'plant' : `lutar ${l.lutarGrader}°`}, ${l.overFiltenMm} mm över filten, framsidan ${l.framsidanUpp ? 'upp' : 'NED'}, ${l.franPlatsenMm} mm från planens plats, rör sig ${l.rorSigEfterMm} mm efteråt.`);
  if (ut.fall) console.log(`  Fallet: utan stöd från ${ut.fall.fran} s, ${ut.fall.hojdMm} mm på ${ut.fall.tar} s; tyngdkraften ger ${ut.fall.tyngdkraftenGer} s.`);
  for (const [vad, x] of Object.entries(ut.farten)) console.log(`  ${vad}: högst ${x.hogstaFart} m/s; häftigaste rycken ${x.haftigast.map(h => `${h.ms2} m/s² vid ${h.vid} s`).join(', ')}`);
  console.log(ut.sparrar.length ? `  SPÄRR (filma inte): ${ut.sparrar.join('; ')}` : '  Ingen spärr.');
  console.log(`  Tider att titta på: ${ut.tiderAttTittaPa.join(',')}`);
}
