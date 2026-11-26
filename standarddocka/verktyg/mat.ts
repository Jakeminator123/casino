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
// Tiderna: varje tid står i filmens sekunder (det tidslinjen och titta.ts --tider tar) och bredvid i grundrörelsens
// sekunder, som en ändrings "tid" i lagret tar (rorelse.ts Andring). Takten som mättes står överst.
//
// Vad som mäts (filten är y = 0, meter). Rörelsen räknas som editorn räknar den (rorelse.ts stallning, med takten,
// ändringarna, de små egna rörelserna och blicken mot spelets kamera; spärren i kropp.ts med kroppens mått som Spara
// skrev i .rutor.json, när de hör till det sparade), utan editorns lyft av armbågarna över bordskanten (armar.ts, som
// kräver dockan). Alla rutor prövas, också den första och den sista (ankaret):
// - lagret: rätt skrivet (rorelse.ts lagretsFel); ett lager med fel används inte;
// - ankaret: en giv börjar och slutar i sitt ankare (A2.3), vilan till skon slutar i sitt, och de två möts, inom 0,5 mm
//   (ankaret ur fälten made.from och made.to; utan dem givens första mot dess sista ruta);
// - benen: överarmen, underarmen och varje fingerben ska ha samma längd i varje ruta av en grundrörelse (högst 1 mm från
//   dess första ruta); dockan ritas med sina egna ben och följer inte en rörelse vars ben växer;
// - armen: handleden inom armens räckvidd (armen dockan visas med: dockans egen i dess egna rörelser, annars BODY i
//   blackjack-dealer/dealer3d/src/body.ts, som en docka skalas till när rörelsen är ritad för en annan kropp; räknat
//   från rörelsens axel), och handen högst GRANS.handled (50) grader från underarmen, den vinkel kroppen ritar
//   (figure-model.ts; underarmen som dockan ställer den, med samma ben och armbågen åt rörelsens håll);
// - handen: en led bortom vad ett finger kan (Jakobs dom: ingen led bortom sitt läge), fingrar i varandra, ett finger i
//   filten, ett finger genom kortet också medan det står i skon (handFaults i blackjack-dealer/dealer3d/src/hand-rule.ts,
//   dockans egen regel), och handflatan (handleden och knogarna) i filten;
// - kortet: ett hörn under filten, en vändning på mer än 40 grader mellan två rutor, och rutor där kortet är ute ur skon
//   utan stöd: varken hållet mellan fingrar på var sin sida, tryckt mot filten av ett finger, eller liggande; fallet före
//   landningen jämförs med vad tyngdkraften ger;
// - hack: handlederna, armbågarna, fingertopparna, kortet och huvudet, i den takt som spelas. Ett hopp är ett steg minst
//   15 mm (huvudet 5 mm) längre än rutan före och rutan efter; ett ryck är en ändring av farten, som vektor, minst 25 mm
//   per ruta (huvudet 15) mer än i rutorna bredvid: farten byter riktning eller storlek tvärt. Före första och efter sista
//   rutan står rörelsen stilla (ankaret). Blicken hoppar om den vrids minst 5 grader mer på en ruta än på rutorna bredvid;
// - landningen: plant, på filten, med framsidan upp, hur långt från planens plats, och stilla efteråt;
// - farten: handledernas och kortets högsta fart och häftigaste ryck.
// Spärrar (det som inte får finnas i en rörelse som filmas): allt ovan utom fingrar i varandra och farten, och en landning
// som inte är plan, på platsen och stilla. Vad mätningen inte ser står i SER_INTE (skrivs ut).
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {BODY} from '../../blackjack-dealer/dealer3d/src/body.ts';
import {DOLLS} from '../../blackjack-dealer/dealer3d/src/doll.ts';
import {handFaults} from '../../blackjack-dealer/dealer3d/src/hand-rule.ts';
import {spots, type Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {CARD, PLAY_LENS, TABLE_LENS, filmEye, type Vec3} from '../../blackjack-dealer/src/table-lens.ts';
import {GIVAR, grundFor, lagretsFel, langd, sattIhop, vilanFor, stallning, taktFor, type Frame, type Limb, type Motion, type Sparad, type Standarddocka} from '../editor/rorelse.ts';
import {GRANS, type Granser} from '../editor/kropp.ts';

const arg = (name: string, fallback?: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), las = async <X>(fil: string) => JSON.parse(await readFile(path.join(ROOT, fil), 'utf8')) as X;
const namnOk = (n: string | undefined) => n === undefined || /^[a-z0-9][a-z0-9-]*$/.test(n);

const sub = (a: number[], b: number[]): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: number[]) => Math.hypot(a[0], a[1], a[2]), grader = (cos: number) => Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
const r2 = (n: number) => Math.round(n * 100) / 100, mm = (m: number) => Math.round(m * 1000), mm1 = (m: number) => Math.round(m * 10000) / 10;
type Kort = {c: number[]; l: number[]; n: number[]};
const horn = (c: Kort) => { const s = cross(c.n, c.l); return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [0, 1, 2].map(k => c.c[k] + c.l[k] * a * CARD.height / 2 + s[k] * b * CARD.width / 2)); };
/** Var en punkt är mot kortet, ut ur framsidan; null om den inte rör det (inom 1 cm från kanten och 16 mm från ytan). */
const mot = (c: Kort, p: number[]) => { const d = sub(p, c.c), u = dot(d, c.l), v = dot(d, cross(c.n, c.l)), w = dot(d, c.n); return Math.abs(u) < CARD.height / 2 + 0.01 && Math.abs(v) < CARD.width / 2 + 0.01 && Math.abs(w) < 0.016 ? w : null; };
const FINGRAR = [2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 20];
/** Fynd som stoppar en rörelse från att filmas. */
const SPARR = /lagret har fel|ankare|möts inte|ändrar längd|bortom armens räckvidd|från underarmen|en led bortom|handflatan i filten|ett finger i eller genom kortet|ett finger i filten|utan stöd|ett hörn under filten|hoppar|rycker/;
const SIDOR = [['R', 'höger'], ['L', 'vänster']] as const;
/** Fingrarnas ben (MediaPipes punkter, varje finger från knogen ut), som dockans fingerben ligger mellan dem (figure-model.ts). */
const FINGERBEN = ([['tummens', 1], ['pekfingrets', 5], ['långfingrets', 9], ['ringfingrets', 13], ['lillfingrets', 17]] as const).flatMap(([namn, s]) => [0, 1, 2].map(n => ({namn: `${namn} ${['första', 'andra', 'tredje'][n]} ben`, a: s + n, b: s + n + 1})));
/** Handflatan mot filten: handleden (2 cm tjock, som spärren i editor/kropp.ts räknar den) och linjerna mellan den och knogarna, med knogarnas tjocklek (hand-rule.ts DRAWN). En hand får gå 2 mm in i filten, som hand-rule.ts räknar. */
const HANDFLATA: [number, number, number][] = [[0, 0, 0.02], [0, 1, 0.012], [0, 5, 0.0078], [0, 9, 0.0078], [0, 13, 0.0078], [0, 17, 0.0078], [5, 9, 0.0078], [9, 13, 0.0078], [13, 17, 0.0078]];
const FINGERTOPPAR = [[4, 'tummen'], [8, 'pekfingret'], [12, 'långfingret'], [16, 'ringfingret'], [20, 'lillfingret']] as const;
/** Armens ben som dockan visas med (editor/scen.ts): dockans egna när rörelsen är ritad för den, annars standardfigurens, som den då skalas till. */
type Armben = {upperArm: number; forearm: number};
const armbenFor = (docka: string, rorelsensDocka: string | undefined): Armben => rorelsensDocka === docka ? DOLLS[docka] : BODY;
/** Armens längd när den är rak: den når 2 mm kortare än benen tillsammans (figure-model.ts). */
const rackvidd = (ben: Armben) => ben.upperArm + ben.forearm - 0.002;
/** Blicken som editorn visar den: mot spelets kamera (editor.ts blickKamera), utom när han följer kortet. */
const KAMERA = filmEye(PLAY_LENS).position as number[];
/** Gränserna för ett hack: steget (meter) och fartens ändring per ruta (meter), mer än i rutorna bredvid; blicken i grader. */
const HACK = {steg: 0.015, ryck: 0.025, huvudSteg: 0.005, huvudRyck: 0.015, blick: 5};
/** Det mätningen inte ser: säg det, så att ingen tar en grön rad för mer än den är. */
export const SER_INTE = 'dockans egen kropp (huden, axlarnas bredd: räckvidden och handleden räknas från rörelsens axel, editorns granskaGrund() mäter på dockan), armarna mot bordets kant och brickan (editorns state().armar), låren och stolen, vridningen kring underarmen, hur fingrarna ritas på dockan, huvudets vridning mot kameran, och hur det ser ut (titta.ts)';
/** Underarmen som dockan ställer den: från axeln med BODY:s ben, armbågen åt det håll rörelsens armbåge står från linjen axel–handled (figure-model.ts pose). */
function underarmen(l: Limb, ben: Armben): Vec3 {
  const d = sub(l.w, l.s), avst = len(d), dir = d.map(n => n / (avst || 1)), a = ben.upperArm, b = ben.forearm;
  const far = Math.min(a + b - 0.002, Math.max(Math.abs(a - b) + 0.002, avst)), langs = (a * a - b * b + far * far) / (2 * far);
  const r = sub(l.e, l.s), ut = sub(r, dir.map(n => n * dot(r, dir))), u = len(ut) > 1e-6 ? ut.map(n => n / len(ut)) : [0, -1, 0], h = Math.sqrt(Math.max(0, a * a - langs * langs));
  return sub(l.w, [0, 1, 2].map(k => l.s[k] + dir[k] * langs + u[k] * h));
}
/** Hur långt två ställningar är från varandra (meter): axlarna, armbågarna, handlederna, handens punkter och huvudet, och kortet om `medKort`. */
const skillnad = (a: Frame, b: Frame, medKort: boolean) => Math.max(len(sub(a.h, b.h)), medKort ? len(sub(a.card.c, b.card.c)) : 0,
  ...SIDOR.flatMap(([s]) => [len(sub(a[s].s, b[s].s)), len(sub(a[s].e, b[s].e)), len(sub(a[s].w, b[s].w)), ...a[s].p.map((p, k) => len(sub(p, b[s].p[k])))]));
type Made = {made?: {from?: string; to?: string}};

type Fynd = {vad: string; rutor: number; varst: string; vid: number; iLagret: number};
async function mat(plats: number, provgiv?: string, provvila?: string, docka: Standarddocka = 'man') {
  const egen = grundFor(docka, plats), prov = !!(provgiv || provvila), giv = provgiv ?? egen.giv;
  const [andra, plan] = await Promise.all([las<Motion & Made>(`blackjack-dealer/dealer3d/data/${giv}.json`), las<Plan>('blackjack-dealer/placements/default.json')]);
  // En giv på prov utan --vilan börjar i vilan för den docka den är ritad för (som i editorn).
  const namn = {vila: provvila ?? (provgiv ? vilanFor(andra.doll) : egen.vila), giv}, forsta = await las<Motion & Made>(`blackjack-dealer/dealer3d/data/${namn.vila}.json`);
  const f = sattIhop(forsta, andra, plats), armben = armbenFor(docka, andra.doll);
  // Det sparade lagret gäller bara de grundrörelser det sparades på (som i editorn), och bara om det är rätt skrivet;
  // kroppens mått för spärren står i .rutor.json från samma Spara.
  let trasig = false;
  const fil = prov ? null : await las<Sparad>(`standarddocka/rorelser/${egen.namn}.json`).catch(e => { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') trasig = true; return null; });
  const aldre = !!fil && Array.isArray(fil.grund) && !(fil.grund.length === 2 && fil.grund[0] === namn.vila && fil.grund[1] === namn.giv);
  const lagretFel = trasig ? ['filen är inte giltig JSON'] : fil && !aldre ? lagretsFel(fil, langd(f), f.delar.length) : [];
  const sparad = fil && !aldre && !lagretFel.length ? fil : null;
  const sparadeRutor = sparad ? await las<{made?: string; granser?: Granser}>(`standarddocka/rorelser/${egen.namn}.rutor.json`).catch(() => null) : null;
  const granser = sparadeRutor?.made && sparadeRutor.made === sparad?.sparad ? sparadeRutor.granser : undefined;
  const T = taktFor(f, sparad?.fart, prov), fps = f.fps, antal = Math.round(T.langd * fps) + 1, iLagret = (t: number) => r2(T.grund(t));
  // Varje ruta i filmens takt, med ändringarna och de små egna rörelserna, som editorn ställer den.
  const rutor = Array.from({length: antal}, (_, i) => ({t: i / fps, x: stallning(f, T.grund(i / fps), sparad?.andringar ?? [], KAMERA, sparad?.liv, granser, T)}));
  const lamnar = Math.round(T.ut((f.forskjutning + andra.leavesShoe) / fps) * fps), ligger = Math.min(antal - 1, Math.round(T.ut((f.forskjutning + andra.rests) / fps) * fps));

  // Ett fynd per slag: i hur många rutor (varje ruta en gång, hur många fingrar det än gäller), och det värsta.
  const samla = new Map<string, {rutor: number; by: number; text: string; vid: number; senast: number}>();
  const not = (nyckel: string, by: number, text: string, t: number) => { const s = samla.get(nyckel) ?? {rutor: 0, by: -Infinity, text: '', vid: t, senast: NaN}; if (s.senast !== t) { s.rutor++; s.senast = t; } if (by > s.by) { s.by = by; s.text = text; s.vid = t; } samla.set(nyckel, s); };
  // Ankaret: vilan till skon slutar i sitt, given börjar och slutar i sitt (A2.3), och de möts (inom 0,5 mm).
  const ankare = async (fil?: string) => fil && /^dealer3d\/data\/[a-z0-9-]+\.json$/.test(fil) ? (await las<{frame?: Frame}>(`blackjack-dealer/${fil}`).catch(() => null))?.frame ?? null : null;
  const [vilansAnkare, givensAnkare] = await Promise.all([ankare(forsta.made?.to), ankare(andra.made?.from)]), slutGiv = (f.frames.length - 1) / fps, ANKARE = 0.0005;
  const prova = (vad: string, d: number, t: number) => { if (d > ANKARE) not(vad, d, `${mm1(d)} mm`, Math.min(T.langd, T.ut(t))); };
  if (vilansAnkare) prova(`vilan till skon: slutar inte i sitt ankare (${forsta.made!.to})`, skillnad(forsta.frames.at(-1)!, vilansAnkare, true), f.forskjutning / fps);
  if (givensAnkare) prova(`given: börjar inte i sitt ankare (${andra.made!.from})`, skillnad(andra.frames[0], givensAnkare, true), f.forskjutning / fps);
  prova(`given: slutar inte i sitt ankare (${givensAnkare ? andra.made!.from : 'där den började'})`, skillnad(andra.frames.at(-1)!, givensAnkare ?? andra.frames[0], false), slutGiv);
  if (forsta.doll && forsta.doll === andra.doll) prova('vilan till skon och given möts inte i ankaret', skillnad(forsta.frames.at(-1)!, andra.frames[0], true), f.forskjutning / fps);
  // Benens längd i var och en av grundrörelserna, mot dess första ruta. Rutan räknas om till filmens tid i följden
  // (vilan till skon är följdens första rutor, given börjar där skon är).
  for (const [m, mnamn, forst] of [[forsta, namn.vila, 0], [andra, namn.giv, f.forskjutning]] as const) for (const [s, sida] of SIDOR) {
    const ben = [{del: 'arm', namn: 'överarmen', p: (l: Limb) => [l.s, l.e]}, {del: 'arm', namn: 'underarmen', p: (l: Limb) => [l.e, l.w]}, ...FINGERBEN.map(x => ({del: 'hand', namn: x.namn, p: (l: Limb) => [l.p[x.a], l.p[x.b]]}))];
    for (const b of ben) { const l = m.frames.map(x => { const [p, q] = b.p(x[s]); return len(sub(p, q)); });
      l.forEach((x, j) => { const fran = x - l[0]; if (Math.abs(fran) > 0.001) not(`${sida} ${b.del}: ${b.namn} ändrar längd i ${mnamn}`, Math.abs(fran), `${fran > 0 ? '+' : ''}${mm1(fran)} mm (${mm1(Math.min(...l))}–${mm1(Math.max(...l))} mm)`, Math.min(T.langd, T.ut((forst + j) / fps))); }); }
  }
  const utanStod: number[] = [];
  rutor.forEach(({t, x}, i) => {
    const ute = i > lamnar && i < ligger, kort = x.card as {c: Vec3; l: Vec3; n: Vec3};
    for (const [sida, namn, tecken] of [['R', 'höger hand', 1], ['L', 'vänster hand', -1]] as const) {
      // Fingrarna mot kortet i varje ruta, också medan det står i skon.
      for (const fel of handFaults(x[sida].p as Vec3[], tecken, null, kort)) if (fel.kind !== 'ordning' && fel.kind !== 'grannen') not(`${namn}: ${fel.kind === 'led' ? 'en led bortom vad ett finger kan' : fel.kind === 'i varandra' ? 'fingrar i varandra' : fel.kind === 'kortet' ? 'ett finger i eller genom kortet' : fel.kind === 'filten' ? 'ett finger i filten' : fel.kind}`, fel.by, fel.what, t);
      const flata = Math.max(...HANDFLATA.map(([a, b, r]) => -0.002 - (Math.min(x[sida].p[a][1], x[sida].p[b][1]) - r)));
      if (flata > 0) not(`${namn}: handflatan i filten`, flata, `${mm1(flata + 0.002)} mm i filten`, t);
      const arm = sida === 'R' ? 'höger arm' : 'vänster arm', bort = len(sub(x[sida].w, x[sida].s)) - rackvidd(armben);
      if (bort > 0.001) not(`${arm}: handleden bortom armens räckvidd`, bort, `${mm(bort)} mm bortom`, t);
      const fore = underarmen(x[sida], armben), led = grader(dot(fore, sub(x[sida].p[9], x[sida].p[0])) / (len(fore) * len(sub(x[sida].p[9], x[sida].p[0])) || 1));
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
  // Hacken: stegen och fartens ändring (som vektor) ruta för ruta, i den takt som spelas, med rörelsen stilla före första
  // och efter sista rutan. Ett steg eller en ändring som sticker ut ur sina grannar är ett hopp eller ett ryck.
  const hack = (vad: string, punkt: (x: Frame) => number[], steg = HACK.steg, ryck = HACK.ryck) => {
    const v = [[0, 0, 0], ...rutor.slice(1).map((r, i) => sub(punkt(r.x), punkt(rutor[i].x))), [0, 0, 0]], s = v.map(len), dv = v.map((x, i) => i ? len(sub(x, v[i - 1])) : 0);
    // s[i]: steget in i ruta i (i = 1 … antal-1); dv[i]: fartens ändring i ruta i-1 (i = 1 … antal).
    for (let i = 1; i < antal; i++) { const over = s[i] - Math.max(s[i - 1], s[i + 1]); if (over > steg) not(`${vad}: hoppar på en ruta`, over, `${mm(s[i])} mm på en ruta, ${mm(over)} mm längre än rutorna bredvid`, i / fps); }
    for (let i = 1; i <= antal; i++) { const over = dv[i] - Math.max(dv[i - 1], dv[i + 1] ?? 0); if (over > ryck) not(`${vad}: rycker (farten byter tvärt)`, over, `farten ändras ${mm(dv[i])} mm per ruta, ${mm(over)} mm mer än rutorna bredvid`, (i - 1) / fps); }
    return {hogstaFart: r2(Math.max(...s) * fps), haftigast: dv.slice(1).map((x, i) => ({vid: r2(i / fps), ms2: Math.round(x * fps * fps)})).sort((p, q) => q.ms2 - p.ms2).slice(0, 3)};
  };
  const fart = {hogerHandled: hack('höger handled', x => x.R.w), vansterHandled: hack('vänster handled', x => x.L.w), kortet: hack('kortet', x => x.card.c)};
  for (const [s, sida] of SIDOR) { hack(`${sida} armbåge`, x => x[s].e); for (const [k, finger] of FINGERTOPPAR) hack(`${sida} hand: ${finger}s topp`, x => x[s].p[k]); }
  hack('huvudet', x => x.h, HACK.huvudSteg, HACK.huvudRyck);
  { const blick = rutor.map((r, i) => { if (!i) return 0; const a = sub(r.x.g, r.x.h), b = sub(rutor[i - 1].x.g, rutor[i - 1].x.h); return grader(dot(a, b) / (len(a) * len(b) || 1)); });
    for (let i = 1; i < antal; i++) { const over = blick[i] - Math.max(blick[i - 1], blick[i + 1] ?? 0); if (over > HACK.blick) not('blicken: hoppar på en ruta', over, `${Math.round(blick[i])}° på en ruta, ${Math.round(over)}° mer än rutorna bredvid`, i / fps); } }
  const fynd: Fynd[] = [...samla].map(([vad, s]) => ({vad, rutor: s.rutor, varst: s.text, vid: r2(s.vid), iLagret: iLagret(s.vid)}));

  // Landningen och fallet före den.
  const sist = rutor[ligger].x.card, mal = spots(plan, TABLE_LENS).find(s => s.id === `P${plats}.C1`);
  const landning = {vid: r2(ligger / fps), iLagret: iLagret(ligger / fps), plant: Math.abs(sist.n[1]) > Math.cos(3 * Math.PI / 180), lutarGrader: Math.round(grader(Math.abs(sist.n[1])) * 10) / 10, overFiltenMm: mm(sist.c[1]), framsidanUpp: sist.n[1] > 0,
    franPlatsenMm: mal ? mm(Math.hypot(sist.c[0] - mal.at[0], sist.c[2] - mal.at[2])) : null, rorSigEfterMm: mm(Math.max(0, ...rutor.slice(ligger).map(r => len(sub(r.x.card.c, sist.c)))))};
  let fall: {fran: number; hojdMm: number; tar: number; tyngdkraftenGer: number} | null = null;
  { let i = ligger; while (i > lamnar && utanStod.includes(i - 1)) i--; if (i < ligger) { const h = rutor[i].x.card.c[1] - sist.c[1]; fall = {fran: r2(i / fps), hojdMm: mm(h), tar: r2((ligger - i) / fps), tyngdkraftenGer: r2(Math.sqrt(2 * Math.max(0, h) / 9.81))}; } }
  const landarRatt = landning.plant && landning.framsidanUpp && Math.abs(landning.overFiltenMm) <= 3 && (landning.franPlatsenMm ?? 0) <= 5 && landning.rorSigEfterMm <= 1;
  const sparrar = [...(lagretFel.length ? [`lagret har fel och används inte: ${lagretFel.join('; ')}`] : []), ...fynd.filter(x => SPARR.test(x.vad)).map(x => `${x.vad} (${x.rutor} rutor, vid ${x.vid} s, i lagret ${x.iLagret} s)`), ...(landarRatt ? [] : ['landningen är inte plan, på platsen och stilla'])];
  const tider = [...new Set([...fynd.map(x => x.vid), landning.vid, r2(lamnar / fps), ...fart.kortet.haftigast.map(x => x.vid)])].sort((a, b) => a - b);
  const lagret = prov ? 'inget (på prov)' : aldre ? 'hör till en äldre rörelse och används inte' : lagretFel.length ? 'har fel och används inte' : !sparad ? 'inget sparat' : granser ? 'sparat, genom spärren' : 'sparat, utan spärren (kroppens mått saknas i .rutor.json från samma Spara)';
  const takt = prov ? 'grundrörelsens egen, med stillheten kvar (på prov)' : T.forval ? 'förvalet: Jakobs takt på det som rör sig (1 s, 1,2 s och 0,8 s; en del som redan är i hans takt spelas som den är)' : 'den sparade farten per del';
  return {rorelse: prov ? `prov: ${namn.vila} och ${namn.giv}` : `${egen.namn} (${namn.vila} och ${namn.giv}${egen.egen ? `, ${docka === 'man' ? 'mannens' : 'kvinnans'} egna` : `, de äldre: ${docka === 'man' ? 'mannen' : 'kvinnan'} har ingen egen giv till plats ${plats} än`})`, plats, takt, langd: r2(T.langd), fart: T.fart.map(r2), andringar: sparad?.andringar.length ?? 0, lagret, lagretsFel: lagretFel,
    delar: T.delar.map(d => `${d.namn} ${r2(d.fran)}–${r2(d.till)} s (i lagret ${iLagret(d.fran)}–${r2(T.grund(d.till - 1e-9))} s)`), kortetLamnarSkon: r2(lamnar / fps), fynd, sparrar, landning, fall, farten: fart,
    tiderAttTittaPa: tider, tiderILagret: tider.map(iLagret), serInte: SER_INTE};
}

const docka: Standarddocka = arg('--docka', 'man') === 'kvinna' ? 'kvinna' : 'man';
if (!['man', 'kvinna'].includes(arg('--docka', 'man')!)) throw Error('--docka tar man eller kvinna.');
if (process.argv.includes('--alla')) {
  const monster = arg('--giv-monster'); if (monster !== undefined && !namnOk(monster.replace('#', '1'))) throw Error('--giv-monster tar ett filnamn med # för platsens nummer.');
  let stopp = 0;
  for (let plats = 1; plats <= 7; plats++) { const m = await mat(plats, monster?.replace('#', String(plats)), undefined, docka); if (m.sparrar.length) stopp++;
    console.log(`plats ${plats}: ${m.rorelse}, ${m.langd} s (${m.delar.map(d => d.split(' (')[0].split(' ').slice(-2).join(' ')).join(' · ')}) ${m.sparrar.length ? `SPÄRR: ${m.sparrar.join('; ')}` : 'grön'}`); }
  console.log(stopp ? `${stopp} av 7 platser har en spärr: filma inte de givarna.` : 'Alla sju platser är gröna.');
  console.log(`Tiderna: filmens sekunder, och i lagret grundrörelsens (en ändrings "tid"). Mätningen ser inte: ${SER_INTE}.`);
  process.exit(stopp ? 1 : 0);
}
const plats = Number(arg('--plats', '4')), provgiv = arg('--giv'), provvila = arg('--vilan');
if (!GIVAR[plats]) throw Error('--plats tar 1–7.');
if (!namnOk(provgiv) || !namnOk(provvila)) throw Error('--giv och --vilan tar ett filnamn ur blackjack-dealer/dealer3d/data, utan .json.');
const ut = await mat(plats, provgiv, provvila, docka);
if (process.argv.includes('--json')) console.log(JSON.stringify(ut, null, 1));
else {
  console.log(`${ut.rorelse}: ${ut.langd} s, ${ut.andringar} ändringar (lagret: ${ut.lagret}), farten ${ut.fart.join(' / ')}`);
  console.log(`  Takten som mättes: ${ut.takt}. Tiderna står i filmens sekunder, och "i lagret" i grundrörelsens, som en ändrings "tid" i lagret tar.`);
  console.log(`  Delarna: ${ut.delar.join(' · ')}`);
  if (ut.lagretsFel.length) console.log(`  LAGRET HAR FEL (används inte): ${ut.lagretsFel.join('; ')}`);
  console.log(ut.fynd.length ? ut.fynd.map(x => `  MÄRKT  ${x.vad}: ${x.rutor} rutor, värst vid ${x.vid} s, i lagret ${x.iLagret} s (${x.varst})`).join('\n') : '  Inget märkt.');
  const l = ut.landning;
  console.log(`  Landningen vid ${l.vid} s (i lagret ${l.iLagret} s): ${l.plant ? 'plant' : `lutar ${l.lutarGrader}°`}, ${l.overFiltenMm} mm över filten, framsidan ${l.framsidanUpp ? 'upp' : 'NED'}, ${l.franPlatsenMm} mm från planens plats, rör sig ${l.rorSigEfterMm} mm efteråt.`);
  if (ut.fall) console.log(`  Fallet: utan stöd från ${ut.fall.fran} s, ${ut.fall.hojdMm} mm på ${ut.fall.tar} s; tyngdkraften ger ${ut.fall.tyngdkraftenGer} s.`);
  for (const [vad, x] of Object.entries(ut.farten)) console.log(`  ${vad}: högst ${x.hogstaFart} m/s; häftigaste rycken ${x.haftigast.map(h => `${h.ms2} m/s² vid ${h.vid} s`).join(', ')}`);
  console.log(ut.sparrar.length ? `  SPÄRR (filma inte): ${ut.sparrar.join('; ')}` : '  Ingen spärr.');
  console.log(`  Tider att titta på (filmens s → lagrets s): ${ut.tiderAttTittaPa.map((t, i) => `${t}→${ut.tiderILagret[i]}`).join(', ')}`);
  console.log(`  Mätningen ser inte: ${ut.serInte}.`);
}
