// Den rena given från A2.3 (Jakob 2026-11-26, efter granskningen av de sju givarna: "Detta ska verkligen få ändras",
// "du har fulla privilegier för ändringar av allt"): kortet ur skon till en plats och handen tillbaka till A2.3 i samma
// rörelse, byggd på dockans ben från ankaret. Den läggs inte ovanpå Naturlig (natural.ts, turn-in-hand.ts, landing.ts):
// felen där satt i hur de lagren rättade varandra, och filmmodellen kopierar dockan ruta för ruta. Det han har sagt om
// givarna, och som byggs in här:
// - Takten: kortet ligger senast 1 s efter första rutan och handen är åter i A2.3 ungefär 0,6 s därefter, hans takt
//   2026-11-26 ("respektive utgivning är max 1 sekund och tillbakagången ... ca 0,6 sekunder"); rörelsen börjar och
//   slutar stilla i ankaret. Hans takt sedan 2026-11-27 är 1,2 s och 0,8 s (standarddocka/DOMAR.md): standarddockornas
//   givar ritas i den av koreo-giv.ts, och ingen fil i data/ är ritad av den rena given här.
// - Greppet: högerhanden tar emot kortet med tummen; tummen under kanten och pek- och långfingret på baksidan, på var sin
//   sida från början ("fingrarna ska vara på rätt sida av kortet från början"), och greppet hålls fast tills hon släpper.
// - Vändningen: en gång, av underarmen (handflatan nedåt till tummen uppåt), inte med handleden i maxläge.
// - Släppet: kortet hänger ur handen med sin nedre kant mot filten, och vrids vidare när hon släpper; det tippar över
//   kanten och faller den sista biten som tyngdkraften ger (ett kort som vrids kring sin kant), och ligger sedan stilla.
// - Fler fingrar på kortet vid slutet: pek- och långfingret följer det ned och vilar på det en stund innan handen går hem.
// - Handen vid skon: vänsterhanden drar ut kortet och skjuter det till högern, släpper det och lägger sig i ankaret,
//   avspänd, medan högern ger ("lyfts upp och spänns medan den andra delar ut kortet" var felet).
// - Armarna: aldrig en handled armen inte når (bålen lutar och vrider sig så mycket räckvidden kräver, högst dockans
//   mostLean och mostTwist), och med bordets kant (RenInput kant) går underarmarna över den ("Armarna går aldrig genom
//   bordets kant").
// Här finns också vilan till skon (renVila, A1 till A2.3) för standarddockorna. Det som redan används rörs inte: det här
// är ett eget sätt bredvid de andra, och dealer3d/tools/ren-givar.ts skriver det (ankaret, vilan och givarna per docka).
// Rent: ingen I/O och ingen three.js.
import {CARD, add, cross, dot, length, mul, sub, unit, type Lens, type Vec3} from './camera.ts';
import {arm, turned} from './body.ts';
import type {Doll} from './doll.ts';
import {axesOf, between, local, placed, shapeBetween, thumbToward, type Axes} from './hand-pose.ts';
import {BALL, bendFinger} from './landing.ts';
import {DRAWN, bendsOf, boneLengths, fingerFrom, handFaults} from './hand-rule.ts';
import {FINGERS} from './capture.ts';
import {handsApart} from './natural.ts';
import {thumbRound} from './turn-in-hand.ts';
import {leavingShoe} from './pinch-deal.ts';
import {SHOE, type Shoe} from './world.ts';

type Limb = {s: Vec3; e: Vec3; w: Vec3; k: number; p: Vec3[]};
type Kort = {c: Vec3; l: Vec3; n: Vec3};
/** Ankaret A2.3 på en docka: höften och ställningen (kortet i skons fönster under vänsterhandens fingrar, högerhanden på filten). */
export type Ankare23 = {hip: Vec3; frame: {card: Kort; L: Limb; R: Limb; h: Vec3; g: Vec3}};
/** En hand: axlarna (hand-pose.ts), handleden och formen i handens egna mått. */
type Hand = {a: Axes; w: Vec3; S: Vec3[]};
/** Kortet i vändningens mått: mitten, `o` från kanten handen håller mot kanten det tippar över, `e` längs de kanterna, `n` framsidan. */
type Lage = {c: Vec3; o: Vec3; e: Vec3; n: Vec3};

/**
 * Takten och måtten. Rutor är 30 per sekund.
 * - fran: högerhanden börjar röra sig mot kortet; ute: kortet är ute ur skon och skjutet dit högerhanden tar det, och
 *   vänsterhanden släpper det; vid: högerhanden är
 *   vid kanten, tummen vid filten; tar: tummen är under kanten (kortet lyft på den).
 * - bar: rutor kortet bärs och vänds, från bar[0] (kortast väg, barMeter[0]) till bar[1] (längst, barMeter[1]).
 * - hemV: rutor vänsterhanden tar till ankaret när den har släppt; vila: rutor pek- och långfingret ligger på kortet;
 *   efter: rutor från att kortet ligger till att högerhanden är hemma (0,6 s); tillRor: rutor från att kortet ligger till
 *   att fingrarna vilar på det; foreLigger: rutor innan kortet ligger som fingrarna och tummen börjar gå dit.
 * - slapp: grader från liggande kortet står när hon släpper det (90 är lodrätt; över 90 lutar det ännu mot henne och
 *   vrids över av farten); fart: hur fort vändningen går när hon släpper, mot en jämn vändning (1).
 * - topp, tumme: meter från kortets mitt till fingertopparnas och tummens punkt där de rör det (ett finger ritat med
 *   radien DRAWN räknas i kortet först 2 mm in, hand-rule.ts); in: fingertopparna så långt in från kanten de håller;
 *   bakomTumme: i det öppna greppet kortets kant så långt bakom tummens topp.
 * - lyft: meter kortet och handen minst går över filten medan det bärs.
 */
export const REN = {
  fran: 3, ute: 11, vid: 12, tar: 14, bar: [9, 13] as [number, number], barMeter: [0.15, 0.7] as [number, number],
  hemV: 8, vila: 2, efter: 18, tillRor: 5, foreLigger: 1,
  /** Var kortets mitt ligger i bytet mellan händerna, från axlarnas mitt (meter, x åt hans vänster, z fram mot spelarna). */
  bytet: {x: [0.04, 0.08, 0.12], z: [0.44, 0.48, 0.52]},
  slapp: [90, 96, 102, 110], fart: 1.4, skjut: [0, 30, 45, 60],
  topp: DRAWN.finger[2] - 0.0005, tumme: DRAWN.thumb[2] - 0.0005, in: 0.009, bakomTumme: 0.006,
  lyft: 0.008,
  /** Rutan kortet senast ligger i, i den rena given (Jakobs takt 2026-11-26: "respektive utgivning är max 1 sekund"). */
  ligger: 30,
  /** Hur många av de bästa sätten att släppa kortet som prövas med alla sätt att ta det. */
  provas: 14,
  /** Hur många av de billigaste sätten som byggs hela och mäts innan ett väljs. */
  byggs: 10,
  /** Armen sträcks högst till sin längd minus `marginal` meter när sättet väljs; bålen lutar och vrider sig mot platsen högst dockans mostLean och mostTwist. */
  marginal: 0.012,
  /** Armen sträcks i varje ruta högst till sin längd minus `naturlig` meter (armbågen böjd minst 30 grader); bålen tar resten. */
  naturlig: 0.025,
};
const FPS = 30, UP: Vec3 = [0, 1, 0], X: Vec3 = [1, 0, 0], Y: Vec3 = [0, 1, 0], NZ: Vec3 = [0, 0, -1];
const HK = CARD.height, WK = CARD.width, T = CARD.thickness, G = 9.81;
function rad(d: number) { return d * Math.PI / 180; }
const grad = (r: number) => Math.round(r * 1800 / Math.PI) / 10, mm = (m: number) => Math.round(m * 10000) / 10;
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, mul(sub(b, a), t));
/** En kubisk Bézierkurva från p0 till p3 (mot p1 och p2), andelen k av vägen. */
export const bezier = (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, k: number): Vec3 => { const a = 1 - k; return add(add(mul(p0, a * a * a), mul(p1, 3 * a * a * k)), add(mul(p2, 3 * a * k * k), mul(p3, k * k * k))); };
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
export const mjuk = (x: number) => { const t = clamp01(x); return t * t * t * (10 + t * (-15 + 6 * t)); };
const r4 = (v: Vec3): Vec3 => v.map(x => Math.round(x * 10000) / 10000) as Vec3;
const flat = (v: Vec3): Vec3 => unit([v[0], 0, v[2]]);
/** Vinkeln kring UP från a till b (radianer, båda platta). */
const yawFrom = (a: Vec3, b: Vec3) => Math.atan2(dot(cross(flat(a), flat(b)), UP), dot(flat(a), flat(b)));

// ---- handen: hur böjd handleden är, hur vriden underarmen är, armbågen ------------------------------------------------
/** Handledens böjning mot underarmen (natural.ts mått): åt sidan och mot handflatan, radianer. */
const bojd = (a: Axes, w: Vec3, e: Vec3) => { const d = unit(sub(w, e)); return {dev: Math.atan2(dot(d, a.across), dot(d, a.forward)), flex: Math.atan2(dot(d, a.palm), dot(d, a.forward))}; };
/** Vad en böjd handled kostar: som natural.ts väger den (0,35 rad åt sidan, 0,8 mot handflatan), och fort bortom 0,5 och 1,0. */
const bojdKostar = (b: {dev: number; flex: number}) => (b.dev / 0.35) ** 2 + (b.flex / 0.8) ** 2 + 200 * (Math.max(0, Math.abs(b.dev) - 0.5) ** 2 + Math.max(0, Math.abs(b.flex) - 1.0) ** 2) + 400 * Math.max(0, Math.hypot(b.dev, b.flex) - rad(62)) ** 2;
/** Underarmens vridning för högerhanden, grader: 0 handflatan nedåt, 90 tummen uppåt, 180 handflatan uppåt. */
const rulle = (a: Axes) => grad(Math.atan2(-dot(a.across, UP), -dot(a.palm, UP)));
/** Armbågen för handleden `w` och handens axlar `a`: vriden kring linjen axel-handled från `pol` så att handleden böjs minst; och vridningen. */
export function armbage(s: Vec3, w: Vec3, pol: Vec3, a: Axes, doll: Doll) {
  const line = unit(sub(w, s)); let best = 0, cost = Infinity;
  for (let t = -0.9; t <= 0.9 + 1e-9; t += 0.05) { const e = arm(s, w, turned(pol, line, t), doll).elbow, c = bojdKostar(bojd(a, w, e)) + (t / 0.7) ** 2; if (c < cost) { cost = c; best = t; } }
  return {vrid: best, cost};
}

// ---- underarmen över bordets kant ---------------------------------------------------------------------------------
/**
 * Bordets kant mot dealern för underarmarna (Jakob 2026-11-26: "Armarna går aldrig genom bordets kant"), som editorn i
 * standarddocka mäter den (standarddocka/editor/armar.ts): kantens läge `z` och skivans överkant `y`, underarmens radie på
 * huden i tio delar från armbågen till handleden (`radie`, meter), och den luft som minst ska finnas under den där den är
 * över bordet (`luft`). Den del närmast handleden som får vila på filten (`handen`, en andel av underarmen) räknas inte.
 */
export type Kant = {z: number; y: number; radie: number[]; luft: number; handen: number};
/** Minsta luft under underarmen från armbågen `e` till handleden `w` där den är över bordet (meter); Infinity där den inte är det. */
export function underarmLuft(e: Vec3, w: Vec3, kant: Kant): number {
  let minst = Infinity;
  for (let k = 0; k <= 24; k++) { const s = k / 24 * (1 - kant.handen), p = add(e, mul(sub(w, e), s)); if (p[2] <= kant.z) continue; minst = Math.min(minst, p[1] - kant.radie[Math.min(9, Math.floor(s * 10))] - kant.y); }
  return minst;
}
/**
 * Armbågen för en arm från axeln `s` till handleden `w`, vriden kring linjen mellan dem från polen `pol` så lite som ger
 * underarmen luften över kanten, åt det håll som för armbågen ut från kroppen (`ut`: -1 hans högra arm, +1 den vänstra,
 * längs x). `vrid` är vridningen i radianer (positiv: utåt), `luft` luften det gav; räcker ingen vridning upp till
 * `mest` radianer: den som gav mest luft.
 */
export function armbageOverKanten(s: Vec3, w: Vec3, pol: Vec3, doll: Doll, kant: Kant, ut: number, mest = rad(110)) {
  const line = unit(sub(w, s)), e0 = arm(s, w, pol, doll).elbow, tecken = dot(sub(arm(s, w, turned(pol, line, 0.05), doll).elbow, e0), [ut, 0, 0]) >= 0 ? 1 : -1;
  const vid = (v: number) => arm(s, w, turned(pol, line, tecken * v), doll).elbow;
  let bast = {vrid: 0, luft: underarmLuft(e0, w, kant), e: e0};
  if (bast.luft >= kant.luft) return bast;
  for (let v = rad(0.5); v <= mest + 1e-9; v += rad(0.5)) { const e = vid(v), l = underarmLuft(e, w, kant); if (l > bast.luft) bast = {vrid: v, luft: l, e}; if (l >= kant.luft) return {vrid: v, luft: l, e}; }
  return bast;
}

/**
 * En form en del av vägen till en annan: fingrarna led för led (hand-rule.ts bendsOf och fingerFrom, så att ingen led går
 * bortom vad de två formerna har), tummen ben för ben (hand-pose.ts shapeBetween). Knogarna är desamma i båda.
 */
export function formMellan(a: Vec3[], b: Vec3[], k: number): Vec3[] {
  if (k <= 0) return a; if (k >= 1) return b;
  const out = shapeBetween(a, b, k), ba = bendsOf(a), bb = bendsOf(b);
  for (let f = 1; f <= 4; f++) { const c = FINGERS[f], lens = [1, 2, 3].map(j => length(sub(a[c[j]], a[c[j - 1]]))), x = ba[f - 1], y = bb[f - 1];
    const mix = {flex: x.flex.map((v, j) => v + (y.flex[j] - v) * k) as [number, number, number], side: x.side.map((v, j) => v + (y.side[j] - v) * k) as [number, number, number]};
    fingerFrom(a, f, mix, lens).forEach((q, j) => { out[c[j + 1]] = q; }); }
  return out;
}
/** Formen med fingrarnas leder (pek- till lillfinger, från knogen, grader mot handflatan) satta som `bojar` säger och sidleden som i `S`. */
export function medLeder(S: Vec3[], bojar: [number, number, number][]): Vec3[] {
  const out = S.map(q => [...q] as Vec3), b = bendsOf(S);
  for (let f = 1; f <= 4; f++) { const c = FINGERS[f], lens = [1, 2, 3].map(j => length(sub(S[c[j]], S[c[j - 1]])));
    fingerFrom(S, f, {flex: bojar[f - 1], side: b[f - 1].side}, lens).forEach((q, j) => { out[c[j + 1]] = q; }); }
  return out;
}

// ---- greppet ----------------------------------------------------------------------------------------------------------
/** Handen i ett eget rum: handleden i origo, framåt X, handflatan Y, tvärs -Z (som axesOf ger för en högerhand så lagd). */
const REF: Axes = {forward: X, palm: Y, across: NZ};
const iRef = (S: Vec3[]) => placed(S, REF, [0, 0, 0]);
const tillForm = (v: Vec3): Vec3 => [v[0], v[1], -v[2]];
/**
 * Pek- och långfingrets leder (från knogen, grader mot handflatan), från rakast; ring- och lillfingret böjda undan. De sista
 * med knogen mer böjd: en hand vars tumrot sitter längre ut och närmare handflatans plan (standarddockans) når kortet
 * under fingertopparna först med fingrarna böjda mer i knogen och mindre i mellanleden.
 */
const HALL: [number, number, number][] = [[25, 30, 15], [30, 40, 20], [20, 50, 25], [35, 45, 20], [25, 60, 30], [40, 50, 25], [30, 70, 35], [40, 70, 35], [50, 70, 35], [60, 60, 30], [70, 50, 25], [70, 60, 30]];
const FRIA: [number, number, number][] = [[50, 70, 40], [60, 80, 45], [65, 95, 50], [70, 100, 55]];
/** Felen mat.ts räknar (hand-rule.ts handFaults utom ordning och grannen). */
const fel = (p: Vec3[], sign: number, kort: Kort | null) => handFaults(p, sign, null, kort).filter(f => f.kind !== 'ordning' && f.kind !== 'grannen');
/** Samma fel för en hand i handens eget rum (där y = 0 inte är filten). */
const felIRum = (p: Vec3[], kort: Kort) => fel(p, 1, kort).filter(f => f.kind !== 'filten');

/**
 * Greppet: pek- och långfingrets toppar på kortets baksida (t8, t12, i handens rum), kortets mitt `djup` från handflatan,
 * fingrarnas leder, och en tumme för varje håll kanten hon håller kan vetta åt i handflatans plan (`tummar`, var 15:e grad:
 * tummens topp under kortet, några mm in från kanten och mitt för fingertopparna).
 */
export type Grepp = {djup: number; t8: Vec3; t12: Vec3; hall: number[]; fria: number[]; tummar: Map<number, Vec3[]>; kant?: Vec3};
/** Kanten hon håller: dess håll ut ur kortet i handens rum, vridet `phi` (grader) i handflatans plan från framåt mot tummen. */
const utAt = (phi: number): Vec3 => [Math.cos(rad(phi)), 0, Math.sin(rad(phi))];
/** Var den kanten ligger längs `o`: fingertopparna REN.in innanför den, eller i det öppna greppet REN.bakomTumme bakom tummens topp (g.kant). */
const kantVid = (g: Grepp, o: Vec3) => g.kant ? dot(g.kant, o) + REN.bakomTumme : Math.max(dot(g.t8, o), dot(g.t12, o)) + REN.in;
/**
 * Kortet i handens rum: den kant hon håller vetter åt `phi`, är en långsida (`lang`) eller kortsida, kortets långsida åt
 * `tecken`, och greppet flyttat `glid` meter längs kanten från mitt för fingertopparna.
 */
export function refKort(g: Grepp, phi: number, lang: boolean, tecken: number, glid: number): Kort {
  const o = utAt(phi), tvars = cross(Y, o), inat = lang ? WK : HK, mid = mul(add(g.t8, g.t12), 0.5);
  const c = add(add(mul(o, kantVid(g, o) - inat / 2), mul(tvars, dot(mid, tvars) + glid)), mul(Y, g.djup));
  return {c, l: mul(lang ? tvars : o, tecken), n: Y};
}
/**
 * Formen för greppet: pek- och långfingret böjda så att topparna ligger i samma djup, ring- och lillfingret böjda undan, och
 * en tumme för varje håll (dess mellanled utanför kanten och under kortets yta, så att den går runt kanten och inte genom
 * kortet: turn-in-hand.ts thumbRound). De rakaste fingrarna där flest håll har en tumme som håller ett kort utan fel (mat.ts).
 * Samma hand ger samma grepp: det räknas en gång.
 */
const greppMinne = new Map<string, Grepp>();
function greppForm(bas: Vec3[], topp: {finger: number; thumb: number}): Grepp {
  const nyckel = JSON.stringify([bas, topp]), minns = greppMinne.get(nyckel); if (minns) return minns;
  let bast: (Grepp & {antal: number}) | null = null;
  for (const hall of HALL) for (const fria of FRIA.slice(0, 2)) {
    const S = bas.map(q => [...q] as Vec3); bendFinger(S, 1, hall);
    // långfingrets knoge så att dess topp ligger i pekfingrets djup
    let b0 = hall[0], c0 = Infinity; for (let b = hall[0] - 30; b <= hall[0] + 30; b += 0.5) { const Q = S.map(q => [...q] as Vec3); bendFinger(Q, 2, [b, hall[1], hall[2]]); const c = Math.abs(Q[12][1] - Q[8][1]); if (c < c0) { c0 = c; b0 = b; } }
    bendFinger(S, 2, [b0, hall[1], hall[2]]); bendFinger(S, 3, fria); bendFinger(S, 4, [fria[0] - 5, fria[1] - 5, fria[2] - 5]);
    const P = iRef(S), t8 = P[8], t12 = P[12], djup = (t8[1] + t12[1]) / 2 + topp.finger + T / 2, Lt = length(sub(S[4], S[3]));
    const g: Grepp = {djup, t8, t12, hall: [...hall, b0], fria, tummar: new Map()};
    for (let phi = 0; phi < 360; phi += 15) {
      const o = utAt(phi), tvars = cross(Y, o), mid = mul(add(t8, t12), 0.5), kant = kantVid(g, o);
      found: for (const inne of [0.005, 0.007, 0.003]) for (const slant of [15, 25, 35, 45]) for (const sida of [0, -20, 20, -40, 40]) {
        const mal = add(add(mul(o, kant - inne), mul(tvars, dot(mid, tvars))), mul(Y, djup + T / 2 + topp.thumb));
        const ut = turned(o, Y, rad(sida)), led = add(add(mal, mul(ut, Lt * Math.cos(rad(slant)))), mul(Y, Lt * Math.sin(rad(slant))));
        const St = thumbRound(S, tillForm(led), tillForm(mal)); if (length(sub(iRef(St)[4], mal)) > 0.003) continue;
        if ([true, false].every(lang => felIRum(iRef(St), refKort(g, phi, lang, 1, 0)).length === 0)) { g.tummar.set(phi, St); break found; } }
    }
    if (!bast || g.tummar.size > bast.antal) bast = {...g, antal: g.tummar.size};
  }
  if (!bast || !bast.antal) throw Error('ren-giv: inget grepp når kortet med tummen.');
  greppMinne.set(nyckel, bast);
  return bast;
}
/**
 * Det öppna greppet (Jakob 2026-11-26 om den gamla given: "hennes högerhand ser spänd och stiff ut"; om den första rena:
 * handen knöt sig kring kortet): pek- och långfingret lätt böjda med topparna på kortets baksida, ring- och lillfingret
 * avspänt bredvid (lika böjda eller rakare, aldrig inrullade och aldrig i kortet), och tummens topp under kortet en bit
 * bakom fingertopparna, nära kortets kant mot handen (`kant`: kortets kant ligger REN.bakomTumme bakom tummens topp och
 * kortet sträcker sig fram under fingertopparna). Kanten hon håller vetter bakåt mot handleden, högst 60 grader åt sidan.
 * De rakaste fingrarna och den tumme närmast topparna där flest håll ger ett kort utan fel (mat.ts) med topparna på det.
 */
const OPPEN: [number, number, number][] = [[10, 15, 8], [15, 20, 10], [20, 25, 12], [25, 30, 15], [30, 35, 18], [20, 40, 20], [30, 45, 22], [35, 50, 25]];
export function greppOppet(bas: Vec3[], topp: {finger: number; thumb: number}): Grepp | null {
  const nyckel = JSON.stringify(['oppet', bas, topp]), minns = greppMinne.get(nyckel); if (minns) return minns;
  let bast: (Grepp & {antal: number; kostar: number}) | null = null;
  for (const hall of OPPEN) {
    const S = bas.map(q => [...q] as Vec3); bendFinger(S, 1, hall);
    let b0 = hall[0], c0 = Infinity; for (let b = hall[0] - 30; b <= hall[0] + 30; b += 0.5) { const Q = S.map(q => [...q] as Vec3); bendFinger(Q, 2, [b, hall[1], hall[2]]); const c = Math.abs(Q[12][1] - Q[8][1]); if (c < c0) { c0 = c; b0 = b; } }
    bendFinger(S, 2, [b0, hall[1], hall[2]]);
    const P = iRef(S), t8 = P[8], t12 = P[12], djup = (t8[1] + t12[1]) / 2 + topp.finger + T / 2, mid = mul(add(t8, t12), 0.5), Lt = length(sub(S[4], S[3]));
    for (const bak of [0.025, 0.035, 0.045, 0.055]) for (const sid of [0, 0.01, -0.01]) {
      const mal: Vec3 = [mid[0] - bak, djup + T / 2 + topp.thumb, mid[2] + sid];
      let St: Vec3[] | null = null;
      tumme: for (const slant of [20, 35, 50]) for (const sida of [0, 25, 50, -25]) { const ut = turned([-1, 0, 0], Y, rad(sida)), led = add(add(mal, mul(ut, Lt * Math.cos(rad(slant)))), mul(Y, Lt * Math.sin(rad(slant))));
        const s = thumbRound(S, tillForm(led), tillForm(mal)); if (length(sub(iRef(s)[4], mal)) <= 0.003) { St = s; break tumme; } }
      if (!St) continue;
      // ring- och lillfingret som långfingret, och rakare (lyfta i knogen) där de annars skulle gå i kortet
      const g: Grepp = {djup, t8, t12, hall: [...hall, b0], fria: [], tummar: new Map(), kant: mal};
      const kort = (phi: number, lang: boolean) => refKort(g, phi, lang, 1, 0), pa = (k: Kort, q: Vec3) => { const d = sub(q, k.c), a = cross(k.n, k.l); return Math.abs(dot(d, k.l)) < HK / 2 - 0.004 && Math.abs(dot(d, a)) < WK / 2 - 0.004; };
      let lyft = 0, form: Vec3[] | null = null;
      for (; lyft <= 40; lyft += 5) { const F = St.map(q => [...q] as Vec3); bendFinger(F, 3, [b0 - lyft, hall[1], hall[2]]); bendFinger(F, 4, [b0 - lyft - 5, hall[1], hall[2]]);
        if ([180, 150, 210].some(phi => [true, false].some(lang => felIRum(iRef(F), kort(phi, lang)).length === 0))) { form = F; break; } }
      if (!form) continue;
      for (let phi = 120; phi <= 240; phi += 15) if ([true, false].some(lang => { const k = kort(phi, lang); return felIRum(iRef(form!), k).length === 0 && pa(k, t8) && pa(k, t12); })) g.tummar.set(phi, form);
      const kostar = -g.tummar.size * 10 + (hall[0] + hall[1] + hall[2]) / 10 + bak * 100 + lyft / 10;
      if (g.tummar.size && (!bast || kostar < bast.kostar)) bast = {...g, fria: [b0 - lyft, hall[1], hall[2]], antal: g.tummar.size, kostar};
    }
  }
  if (bast) greppMinne.set(nyckel, bast);
  return bast;
}
/** Handen som håller kortet `k` i världen, med kortet som `ref` i handens rum och formen `S`. */
function handVid(k: Kort, ref: Kort, S: Vec3[]): Hand {
  const a = cross(k.n, k.l), ar = cross(ref.n, ref.l), M = (v: Vec3): Vec3 => add(add(mul(k.l, dot(ref.l, v)), mul(k.n, dot(ref.n, v))), mul(a, dot(ar, v)));
  return {a: {forward: M(X), palm: M(Y), across: M(NZ)}, w: sub(k.c, M(ref.c)), S};
}
const kortAv = (L: Lage, D: number): Kort => ({c: L.c, l: D === HK ? L.o : L.e, n: L.n});
const punkter = (h: Hand) => placed(h.S, h.a, h.w);
/** Hur långt handens lägsta kula är över filten (negativt: i den), meter: handledens kula och fingrarnas. */
const overFilten = (h: Hand, doll: Doll) => Math.min(h.w[1] - doll.shape.wristBall - 0.003, ...punkter(h).map((q, k) => q[1] - BALL(k) - 0.0015));
/** Kortets fyra hörn. */
const horn = (k: Kort): Vec3[] => { const a = cross(k.n, k.l); return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([u, v]) => add(add(k.c, mul(k.l, u * HK / 2)), mul(a, v * WK / 2))); };

// ---- bålen ------------------------------------------------------------------------------------------------------------
/** Bålen vriden kring höften: lutad `lean` mot `mot` och vriden `twist` kring den lutade ryggen (som pinch-deal.ts trunkAt). */
export function bal(hip: Vec3, mot: Vec3, lean: number, twist: number) {
  const axis = unit(cross(UP, flat(sub(mot, hip)))), spine = turned(UP, axis, lean);
  return (p: Vec3, k = 1) => add(hip, turned(turned(sub(p, hip), axis, lean * k), spine, twist * k));
}
/** Den minsta lutningen (med vridningen i takt, åt det håll som för högeraxeln närmare) där högerarmen når varje handled i `mal`; högst dockans mostLean och mostTwist. */
export function rackvidd(hip: Vec3, s0: Vec3, mal: Vec3[], mot: Vec3, doll: Doll, marginal = REN.marginal) {
  const nar = doll.upperArm + doll.forearm - marginal, luta = doll.mostLean, vrida = doll.mostTwist;
  const way = length(sub(mal[0], bal(hip, mot, 0, 0.1)(s0))) < length(sub(mal[0], bal(hip, mot, 0, -0.1)(s0))) ? 1 : -1;
  const langst = (lean: number) => Math.max(...mal.map(w => length(sub(w, bal(hip, mot, lean, way * vrida * lean / luta)(s0)))));
  let lean = 0; if (langst(0) > nar) { let lo = 0, hi = luta; if (langst(hi) > nar) lean = hi; else { for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (langst(m) > nar) lo = m; else hi = m; } lean = hi; } }
  return {lean, twist: way * vrida * lean / luta, kortMm: Math.max(0, mm(langst(lean) - nar - marginal))};
}

// ---- granskningen --------------------------------------------------------------------------------------------------------
/**
 * En giv mätt som standarddocka/verktyg/mat.ts mäter den (på givens egna rutor): rutor med något som spärrar (ett finger
 * i kortet eller filten, kortet ute ur skon utan stöd, ett hörn under filten, en handled eller kortet som hoppar på en
 * ruta, kortet som vänds fel) och rutor med handleden böjd mer än 70 grader eller fingrar i varandra. Med dockan `doll`
 * spärrar också ett ben som inte har sin längd (överarmen och underarmen dockans, varje fingerben som i första rutan, högst
 * 0,5 mm fel): en handled armen inte når, eller en hand som inte är dockans. Med `strang` (huvudagentens granskare
 * 2026-11-26, om de sju första rena givarna) dessutom: armen sträckt närmare sin fulla längd än GRANSKA.marginal; en led
 * bortom vad ett finger kan; handflatans punkter (handleden, knogarna) i filten; fingrarna mot kortet i alla rutor, också
 * i skon; och ett ryck: en handled, armbåge, fingertopp eller kortet vars hastighet (som vektor) ändras mer än
 * GRANSKA.ryck mellan två rutor, i alla rutor. Med `kropp` (meter luft mellan bålens hud och bordets kant och bricka i en
 * ruta, dealer3d/tools/hud.ts) spärrar mindre än GRANSKA.bal. `poang`: hundra per spärrande ruta, tio per böjd handled,
 * en per fingrar i varandra (noll: grön).
 */
export const GRANSKA = {marginal: 0.008, ryck: 0.03, bal: 0.005};
export function granska(m: {frames: {card: Kort; L: Limb; R: Limb}[]; leavesShoe: number; rests: number}, doll?: Doll, val: {strang?: boolean; kropp?: (i: number) => number} = {}) {
  const {strang = false, kropp} = val;
  const F = m.frames, utom = (k: string) => k !== 'ordning' && k !== 'grannen', FING = [2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 20];
  const mot = (c: Kort, p: Vec3) => { const d = sub(p, c.c), u = dot(d, c.l), v = dot(d, cross(c.n, c.l)), w = dot(d, c.n); return Math.abs(u) < HK / 2 + 0.01 && Math.abs(v) < WK / 2 + 0.01 && Math.abs(w) < 0.016 ? w : null; };
  const spar = new Set<number>(); let bojdRutor = 0, varandra = 0; const vad = new Set<string>(), ben0 = {R: boneLengths(F[0].R.p), L: boneLengths(F[0].L.p)};
  const motSpelaren = (() => { const l = F[F.length - 1].card.l, p = flat(l); return p[2] >= 0 ? p : mul(p, -1); })();
  F.forEach((f, i) => {
    if (doll) for (const s of ['R', 'L'] as const) { const l = f[s], fel = Math.max(Math.abs(length(sub(l.e, l.s)) - doll.upperArm), Math.abs(length(sub(l.w, l.e)) - doll.forearm), ...boneLengths(l.p).map((x, k) => Math.abs(x - ben0[s][k])));
      if (fel > 0.0005) { spar.add(i); vad.add(`${s} ben`); }
      if (strang && length(sub(l.w, l.s)) > doll.upperArm + doll.forearm - GRANSKA.marginal) { spar.add(i); vad.add(`${s} sträckt`); } }
    if (kropp && kropp(i) < GRANSKA.bal) { spar.add(i); vad.add('bålen i bordet'); }
    for (const [s, sign] of [['R', 1], ['L', -1]] as const) { const fl = handFaults(f[s].p, sign, null, strang || i >= m.leavesShoe ? f.card : null).filter(x => utom(x.kind)), sparrar = (x: {kind: string}) => x.kind === 'kortet' || x.kind === 'filten' || (strang && x.kind === 'led');
      if (fl.some(sparrar)) { spar.add(i); vad.add(`${s} ${fl.find(sparrar)!.kind}`); }
      if (strang && [0, 5, 9, 13, 17].some(k => f[s].p[k][1] - BALL(k) < -0.002)) { spar.add(i); vad.add(`${s} handflatan i filten`); }
      if (fl.some(x => x.kind === 'i varandra')) varandra++;
      const a = sub(f[s].w, f[s].e), b = sub(f[s].p[9], f[s].p[0]); if (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (length(a) * length(b) || 1)))) > rad(70)) { bojdRutor++; vad.add(`${s} handled`); } }
    const hornen = horn(f.card), lagst = Math.min(...hornen.map(q => q[1]));
    if (i >= m.leavesShoe && lagst < -0.002) { spar.add(i); vad.add('hörn'); }
    // (vändningen, Jakob 2026-11-26 "Fel håll av kortvändningen" och "nyckelvridningsrotation", läst på två lärofilmer
    // av riktiga dealrar (koreo-giv.ts): framsidan går från nedåt till dealern (kortet rest på högkant) och rullas fram och
    // upp; i luften vetter den aldrig mot spelarna)
    // (mot spelarna: åt det håll kortet till sist pekar på sin plats, från dealern mot platsens spelare; rakt mot spelarna
    // där platsen ligger rakt, och för standarddockornas vända platser mot kortets egen spelare)
    if (i > m.leavesShoe && i < m.rests && lagst > 0.002) { const nn = unit(f.card.n); if (dot(nn, motSpelaren) > 0.35) { spar.add(i); vad.add("kortet vänds fel"); } }
    if (i > m.leavesShoe && i < m.rests) { const sidor = [...FING.map(k => mot(f.card, f.R.p[k])), ...FING.map(k => mot(f.card, f.L.p[k]))].filter(w => w !== null) as number[];
      if (!(sidor.some(w => w > 0) && sidor.some(w => w < 0)) && !(lagst < 0.004 && sidor.length > 0) && !hornen.every(q => q[1] < 0.004)) { spar.add(i); vad.add('utan stöd'); } } });
  // (ryck: hastighetens ändring som vektor mellan två rutor, i alla rutor; utan `strang` det äldre hopptestet)
  type Fr = (typeof F)[number];
  if (!strang) for (const [namn, g] of [['R', (f: Fr) => f.R.w], ['L', (f: Fr) => f.L.w], ['kort', (f: Fr) => f.card.c]] as const) {
    const d = F.map((f, i) => i ? length(sub(g(f), g(F[i - 1]))) : 0); for (let i = 2; i < d.length - 1; i++) if (d[i] - Math.max(d[i - 1], d[i + 1]) > 0.015) { spar.add(i); vad.add(`${namn} hopp`); } }
  const punkterna: [string, (f: Fr) => Vec3][] = [['R handled', f => f.R.w], ['L handled', f => f.L.w], ['R armbåge', f => f.R.e], ['L armbåge', f => f.L.e], ['kortet', f => f.card.c],
    ...[4, 8, 12, 16, 20].flatMap(k => [[`R topp ${k}`, (f: Fr) => f.R.p[k]], [`L topp ${k}`, (f: Fr) => f.L.p[k]]] as [string, (f: Fr) => Vec3][])];
  if (strang) for (const [namn, g] of punkterna) { const v = F.map((f, i) => i ? sub(g(f), g(F[i - 1])) : [0, 0, 0] as Vec3);
    for (let i = 1; i < F.length; i++) { const nasta = i + 1 < F.length ? v[i + 1] : [0, 0, 0] as Vec3; if (length(sub(v[i], v[i - 1])) > GRANSKA.ryck || length(sub(nasta, v[i])) > GRANSKA.ryck) { spar.add(i); vad.add(`${namn.replace(/ \d+$/, '')} ryck`); } } }
  return {poang: 100 * spar.size + 10 * bojdRutor + varandra, sparrRutor: spar.size, bojdRutor, varandra, vad: [...vad], rutor: [...spar].sort((a, b) => a - b)};
}

/**
 * Givens regler, mätta på rörelsen (huvudagenten 2026-11-26 efter fyra granskares genomgång av mannens första giv; Jakobs
 * egen beskrivning av vändningen går före dem): tal för varje regel, och de som inte hålls (`bryter`).
 * 1 Bytet: båda händerna rör kortet (högst RORA) i minst 3 rutor i följd, kortet ligger aldrig ensamt mellan skon och
 *   högerns grepp, vänstern släpper cirka en ruta efter att greppet har slutit sig, och mötet är utanför dealerns egna
 *   kortplatser (`dealerKort`, kortens mitt; ett kort 63 x 88 mm med långsidan mot spelarna).
 * 2 Öppen hand från bytet till hemma: fingertopparna minst 75 % av fingrets längd från handleden, ring- och lillfingret
 *   aldrig mer böjda än långfingret.
 * 3 Kortet står aldrig på högkant eller lutar utan att en hand rör det (högst RORA): inget kort som står på filten och
 *   faller av sig självt (huvudagenten 2026-11-26 efter två lärofilmer: kortet reses på högkant av vänstern och nyps av
 *   högern, så rutorna nära lodrätt räknas men spärrar inte); fingrarna på kortet en stund efter att det ligger.
 * 4 Kortet längs handen medan det hålls: vinkeln mellan kortets långsida och handens framåt; handleden mot underarmen.
 * 5 Kroppen: bålens lutning fram och vridning (grader, från ankaret), armbågarnas minsta böjning, och högerhandens
 *   acceleration och dess ändring på hemvägen (m/s²).
 * 6 Högerhandens vridning i världen (grader: 0 handflatan nedåt, 90 tummen upp, 180 handflatan upp).
 */
export const RORA = 0.003;
type GivRuta = {card: Kort; L: Limb; R: Limb};
export function givRegler(m: {frames: GivRuta[]; leavesShoe: number; rests: number; fps: number; hip: Vec3}, doll: Doll, val: {dealerKort?: Vec3[]; topp?: {finger: number; thumb: number}; hand?: 'R' | 'L'} = {}) {
  const F = m.frames, n = F.length, fps = m.fps, tp = {finger: Math.max(REN.topp, doll.hand?.topp?.finger ?? 0), thumb: Math.max(REN.tumme, doll.hand?.topp?.thumb ?? 0), ...val.topp};
  const TOPPAR = [4, 6, 7, 8, 10, 11, 12, 16, 20], g = (r: number) => Math.round(r * 1800 / Math.PI) / 10, ang = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b)))));
  /** Vilka sidor av kortet handens toppar, pek- och långfingrets leder rör (högst RORA från ytan, inom kortet): +1 framsidan, -1 ryggen, och tummens sida. */
  const ror = (l: Limb, k: Kort) => { const a = cross(k.n, k.l), sidor = new Set<number>(); let tumme = 0;
    for (const j of TOPPAR) { const d = sub(l.p[j], k.c); if (Math.abs(dot(d, k.l)) > HK / 2 + RORA || Math.abs(dot(d, a)) > WK / 2 + RORA) continue; const w = dot(d, k.n), glapp = Math.abs(w) - T / 2 - (j === 4 ? tp.thumb : tp.finger);
      if (glapp <= RORA) { sidor.add(Math.sign(w)); if (j === 4) tumme = Math.sign(w); } }
    return {ror: sidor.size > 0, bada: sidor.size === 2, tumme, sidor}; };
  const hall = (l: Limb, k: Kort) => { const r = ror(l, k); return r.tumme !== 0 && r.sidor.has(-r.tumme); };
  const lutning = (k: Kort) => g(Math.acos(Math.min(1, Math.abs(unit(k.n)[1])))), horn = (k: Kort) => { const a = cross(k.n, k.l); return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([u, v]) => add(add(k.c, mul(k.l, u * HK / 2)), mul(a, v * WK / 2))); };
  const R = F.map(f => ror(f.R, f.card)), L = F.map(f => ror(f.L, f.card));
  // 1 bytet
  const greppat = (() => { for (let i = m.leavesShoe; i < m.rests; i++) if (hall(F[i].R, F[i].card) && hall(F[Math.min(i + 1, n - 1)].R, F[Math.min(i + 1, n - 1)].card)) return i; return -1; })();
  const slappt = (() => { let s = -1; for (let i = 0; i < m.rests; i++) if (L[i].ror) s = i; return s + 1; })();
  let foljd = 0, langst = 0, mote = -1; for (let i = 0; i < n; i++) { if (R[i].ror && L[i].ror) { foljd++; if (foljd > langst) { langst = foljd; if (mote < 0 || foljd === 1) mote = i; } } else foljd = 0; }
  const ensamt = greppat < 0 ? -1 : F.slice(m.leavesShoe, greppat + 1).filter((_, j) => !R[m.leavesShoe + j].ror && !L[m.leavesShoe + j].ror).length;
  const axelMitt = mul(add(F[0].R.s, F[0].L.s), 0.5), moteC = mote >= 0 ? F[mote].card.c : F[0].card.c;
  const kortplatser = (val.dealerKort ?? []).map(c => { const hk = horn(mote >= 0 ? F[mote].card : F[0].card); const gap = (q: Vec3) => Math.max(Math.abs(q[0] - c[0]) - WK / 2, Math.abs(q[2] - c[2]) - HK / 2);
    // (det kortets hörn och mitt mot platsens rektangel: negativt där något är inne på den)
    return Math.round(Math.min(...[...hk, moteC].map(gap)) * 1000); });
  // 2 öppen hand
  const fran = Math.max(0, greppat), bojning = (p: Vec3[]) => bendsOf(local(p, axesOf(p, 1))).map(b => b.flex.reduce((s, x) => s + x, 0));
  const langd = (p: Vec3[], c: number[]) => length(sub(p[c[1]], p[0])) + length(sub(p[c[2]], p[c[1]])) + length(sub(p[c[3]], p[c[2]])) + length(sub(p[c[4]], p[c[3]]));
  const ut = F.slice(fran).map(f => [1, 2, 3, 4].map(k => length(sub(f.R.p[FINGERS[k][3]], f.R.p[0])) / langd(f.R.p, [0, ...FINGERS[k]])));
  const minstUt = Math.round(Math.min(...ut.flat()) * 100) / 100, merBojda = F.slice(fran).filter(f => { const b = bojning(f.R.p); return b[2] > b[1] + 5 || b[3] > b[1] + 5; }).length;
  // 3 kortet i handen
  const lagt = F.slice(Math.max(0, greppat), m.rests);
  const utanHand = F.slice(m.leavesShoe, m.rests).map((f, j) => ({i: m.leavesShoe + j, f})).filter(({i, f}) => lutning(f.card) > 10 && !R[i].ror && !L[i].ror).map(x => x.i);
  const lodratt = F.slice(m.leavesShoe, m.rests).map((f, j) => ({i: m.leavesShoe + j, f})).filter(({f}) => lutning(f.card) > 78);
  const lodrattIHanden = lodratt.filter(({i, f}) => hall(f.R, f.card) && i > 0 && (length(sub(f.card.c, F[i - 1].card.c)) > 0.001 || ang(f.card.n, F[i - 1].card.n) > 0.02)).length;
  let efter = 0; for (let i = m.rests; i < n && (val.hand === 'L' ? L : R)[i].ror; i++) efter++;
  // 4 längs handen
  const halls = F.map((f, i) => ({i, f})).filter(({f}) => hall(f.R, f.card));
  const langsHanden = Math.max(0, ...halls.map(({f}) => { const fram = unit(sub(f.R.p[9], f.R.p[0])), l = unit(f.card.l); return g(Math.acos(Math.min(1, Math.abs(dot(fram, l))))); }));
  const handled = Math.max(0, ...halls.map(({f}) => g(ang(sub(f.R.w, f.R.e), sub(f.R.p[9], f.R.p[0])))));
  // 5 kroppen
  const bal0 = sub(axelMitt, m.hip), tvars0 = sub(F[0].L.s, F[0].R.s);
  const lut = F.map(f => { const b = sub(mul(add(f.R.s, f.L.s), 0.5), m.hip); return g(Math.atan2(b[2], b[1]) - Math.atan2(bal0[2], bal0[1])); });
  const vrid = F.map(f => { const t = sub(f.L.s, f.R.s); return g(Math.atan2(t[2], t[0]) - Math.atan2(tvars0[2], tvars0[0])); });
  const armbage = (l: Limb) => 180 - g(ang(sub(l.s, l.e), sub(l.w, l.e)));
  const hem = F.slice(m.rests).map(f => f.R.w), vel = hem.map((w, i) => i ? mul(sub(w, hem[i - 1]), fps) : [0, 0, 0] as Vec3), acc = vel.map((v, i) => i ? mul(sub(v, vel[i - 1]), fps) : [0, 0, 0] as Vec3);
  const hemAcc = Math.round(Math.max(...acc.map(length)) * 10) / 10, hemRyck = Math.round(Math.max(...acc.map((a, i) => i ? length(sub(a, acc[i - 1])) : 0)) * 10) / 10;
  // 6 vridningen
  const rulle = F.map(f => { const a = axesOf(f.R.p, 1); return g(Math.atan2(-dot(a.across, UP), -dot(a.palm, UP))); });
  const tal = {
    bytet: {badaRorRutor: langst, ensamtRutor: ensamt, greppetSlutetRuta: greppat, vansternSlapperRuta: slappt, rutorEmellan: slappt - greppat, moteFranAxlarnasMittMm: [Math.round((moteC[0] - axelMitt[0]) * 1000), Math.round((moteC[2] - axelMitt[2]) * 1000)], franDealernsKortMm: kortplatser},
    oppenHand: {minstAndelUt: minstUt, ringEllerLillMerBojdaRutor: merBojda},
    kortetIHanden: {lutarUtanHandRutor: utanHand, lodrattRutor: lodratt.length, lodrattIHandenOchRorelse: lodrattIHanden, fingrarnaKvarSekunder: Math.round(efter / fps * 100) / 100, mestLutadILuften: Math.max(0, ...lagt.map(f => lutning(f.card)))},
    langsHanden: {kortetMotHandenGrader: langsHanden, handledenGrader: handled},
    kroppen: {lutningGrader: Math.max(...lut), vridningGrader: Math.max(...vrid.map(Math.abs)), armbagenMinstBojdGrader: Math.min(...F.slice(1, -1).flatMap(f => [armbage(f.R), armbage(f.L)])), hemvagenAcceleration: hemAcc, hemvagenAccelerationensAndring: hemRyck},
    vridningen: {rulleGrader: [Math.min(...rulle), Math.max(...rulle)]},
    takten: {liggerSekunder: Math.round(m.rests / fps * 100) / 100, hemmaEfterSekunder: Math.round((n - 1 - m.rests) / fps * 100) / 100}};
  const bryter: string[] = [];
  if (val.hand !== 'L') { if (langst < 3) bryter.push(`1: båda händerna rör kortet bara ${langst} rutor i följd`); if (ensamt !== 0) bryter.push(`1: kortet ensamt ${ensamt} rutor`);
  if (Math.abs(slappt - greppat - 1) > 1) bryter.push(`1: vänstern släpper ${slappt - greppat} rutor efter greppet`); if (kortplatser.some(x => x < 0)) bryter.push('1: mötet på dealerns kortplats'); }
  if (minstUt < 0.75) bryter.push(`2: fingertopparna bara ${minstUt} av fingret ut`); if (merBojda) bryter.push(`2: ring- eller lillfingret mer böjt än långfingret i ${merBojda} rutor`);
  if (utanHand.length) bryter.push(`3: kortet lutar utan att en hand rör det i rutorna ${utanHand.join(',')}`);
  if (efter < 3) bryter.push(`3: fingrarna på kortet bara ${(efter / fps).toFixed(2)} s efter att det ligger`);
  if (tal.kroppen.armbagenMinstBojdGrader < 30) bryter.push(`5: armbågen bara ${tal.kroppen.armbagenMinstBojdGrader}° böjd`);
  return {tal, bryter};
}

// ---- ankaret -----------------------------------------------------------------------------------------------------------
/**
 * Ankaret A2.3 rent: ställningen `frame` (en givs första ruta) med vänsterhanden vid skon som "Naturlig" har den
 * (doll.ts hand.natural, Jakob 2026-11-23), och dess fingrar inom vad ett finger kan (hand-rule.ts LIMITS, en grad till
 * godo): ringfingret lyft ur kortet och lillfingret isär från det. Armbågen löst igen med samma pol. Givarna börjar och
 * slutar här; vilan dit (editorn) jämnar ut skarven.
 */
export function rentAnkare(frame: Ankare23['frame'], doll: Doll): Ankare23['frame'] {
  const nat = doll.hand?.natural; if (!nat) return frame;
  const at = nat.at.left, a: Axes = {forward: unit(at.forward), palm: unit(at.palm), across: cross(unit(at.palm), unit(at.forward))};
  let S = nat.left.map(q => [...q] as Vec3);
  const lim = {mcp: [-29, 89, 29], pip: [-4, 104, 14], dip: [-9, 79, 14]} as const, leder = ['mcp', 'pip', 'dip'] as const;
  const lagt = (s: Vec3[]) => placed(s, a, at.wrist), felV = (s: Vec3[]) => fel(lagt(s), -1, frame.card);
  for (let f = 1; f <= 4; f++) { const b = bendsOf(S)[f - 1], c = FINGERS[f], lens = [1, 2, 3].map(j => length(sub(S[c[j]], S[c[j - 1]])));
    const ny = {flex: b.flex.map((x, j) => Math.max(lim[leder[j]][0], Math.min(lim[leder[j]][1], x))) as [number, number, number], side: b.side.map((x, j) => Math.max(-lim[leder[j]][2], Math.min(lim[leder[j]][2], x))) as [number, number, number]};
    fingerFrom(S, f, ny, lens).forEach((q, j) => { S[c[j + 1]] = q; }); }
  // (ett finger i kortet lyfts vid knogen, lillfingret förs ut från ringfingret, en grad i taget)
  const flytta = (f: number, led: 'flex' | 'side', steg: number, tills: (s: Vec3[]) => boolean) => { for (let n = 0; n < 40 && !tills(S); n++) { const b = bendsOf(S)[f - 1], c = FINGERS[f], lens = [1, 2, 3].map(j => length(sub(S[c[j]], S[c[j - 1]])));
    const ny = {flex: [...b.flex] as [number, number, number], side: [...b.side] as [number, number, number]}; ny[led][0] += steg; const T2 = S.map(q => [...q] as Vec3); fingerFrom(T2, f, ny, lens).forEach((q, j) => { T2[c[j + 1]] = q; }); S = T2; } };
  for (const f of [3, 4]) flytta(f, 'flex', -1, s => !felV(s).some(x => x.kind === 'kortet' && x.fingers.includes(f)));
  flytta(4, 'side', -Math.sign(bendsOf(S)[3].side[0] || 1), s => !felV(s).some(x => x.kind === 'i varandra'));
  const p = lagt(S), e = arm(frame.L.s, at.wrist, sub(frame.L.e, frame.L.s), doll).elbow;
  return {...frame, L: {...frame.L, e: r4(e), w: r4(at.wrist), p: p.map(r4)}};
}

// ---- given ------------------------------------------------------------------------------------------------------------
/** `kant`: bordets kant mot dealern, som underarmarna ska gå över (utan den: armbågarna som handlederna vill). */
export type RenInput = {start: Ankare23; place: string; at: Vec3; doll: Doll; lens: Lens; shoe?: Shoe; kant?: Kant};
/** Den rena given från A2.3 till platsen vid `at` (en punkt på filten) och tillbaka, på dockan `doll`. */
export function renGiv(input: RenInput) {
  const {start, doll, lens} = input, f0 = start.frame, hip = start.hip;
  const HR0 = axesOf(f0.R.p, 1), SR0 = local(f0.R.p, HR0), HL0 = axesOf(f0.L.p, -1);
  // (fingertopparnas och tummens punkt så långt från det de rör: ritade (REN), eller dockans topp på huden om den är tjockare)
  const topp = {finger: Math.max(REN.topp, doll.hand?.topp?.finger ?? 0), thumb: Math.max(REN.tumme, doll.hand?.topp?.thumb ?? 0)}, grepp = greppOppet(SR0, topp) ?? greppForm(SR0, topp);

  // 1. Vägen ut ur skon (pinch-deal.ts leavingShoe, som two-hand.ts tar ut kortet), till kortet ligger platt med baksidan upp.
  const skon = input.shoe ?? SHOE, ut = leavingShoe(lens, skon), aSlut = skon.windowLift / Math.sin(skon.plateLean) + HK, ute = ut(aSlut);
  const ur0 = ut(0), skillnad0 = mm(length(sub(ur0.c, f0.card.c)));
  // Vänsterhanden ligger fast på kortet tills hon släpper det (som i ankaret: fingertopparna på baksidan).
  const k0 = f0.card, a0 = cross(k0.n, k0.l), SL0 = local(f0.L.p, HL0);
  const vansterPa = (k: Kort): Hand => { const a = cross(k.n, k.l), M = (v: Vec3): Vec3 => add(add(mul(k.l, dot(k0.l, v)), mul(k.n, dot(k0.n, v))), mul(a, dot(a0, v)));
    return {a: {forward: M(HL0.forward), palm: M(HL0.palm), across: M(HL0.across)}, w: add(k.c, M(sub(f0.L.w, k0.c))), S: SL0}; };
  // (handen lutar bara hälften så mycket som kortet när det lägger sig ut ur skon: topparna står kvar på kortet och
  // handleden högre, så att den inte böjs mot sitt tak eller går i filten)
  // (fingertopparna drar kortet: de står kvar där de är på kortet, och handen vrids med kortet kring lodlinjen men lutar
  // med det bara så mycket som håller fingrarna ur filten: handleden böjs då inte mot sitt tak)
  const tippPaKort0 = (() => { const d = sub(mul(add(f0.L.p[8], f0.L.p[12]), 0.5), k0.c); return [dot(d, k0.l), dot(d, a0), dot(d, k0.n) - 0.0006]; })();
  // (Jakob 2026-11-26 om handbytet: fingrarna "krökta som en klo över kortet" såg inte naturligt ut: när kortet ligger på
  // filten är vänsterhandens fingrar öppna och lätt böjda på dess baksida, och handen följer kortet när det lägger sig, i
  // stället för att stå kvar brant som vid skon)
  const SLo = medLeder(SL0, [[20, 30, 15], [20, 30, 15], [25, 35, 18], [25, 35, 18]]);
  const vansterDrag = (k: Kort, S: Vec3[] = SL0): Hand => { const a = cross(k.n, k.l), P = add(add(add(k.c, mul(k.l, tippPaKort0[0])), mul(a, tippPaKort0[1])), mul(k.n, tippPaKort0[2])), tippLok0 = mul(add(S[8], S[12]), 0.5);
    const y = yawFrom(k0.l, k.l), r = (v: Vec3) => turned(v, UP, y), AY: Axes = {forward: r(HL0.forward), palm: r(HL0.palm), across: r(HL0.across)}, AR = vansterPa(k).a;
    const med = (A: Axes): Hand => ({a: A, w: sub(P, add(add(mul(A.forward, tippLok0[0]), mul(A.palm, tippLok0[1])), mul(A.across, tippLok0[2]))), S});
    const fri = (h: Hand) => -Math.max(0, ...fel(punkter(h), -1, null).filter(f => f.kind === 'filten').map(f => f.by + 0.5));
    for (let w = 1; w >= -0.0001; w -= 0.05) { const h = med(between(AY, AR, w)); if (fri(h) >= 0) return h; }
    return med(AY); };
  // Ute ur skon skjuter hon det på filten dit högern tar det, och vrider det under fingertopparna (kring punkten under
  // pek- och långfingret, så att topparna står kvar på kortet och handen svänger kring dem).
  const tappUte = (() => { const p = punkter(vansterDrag(ute)), m = mul(add(p[8], p[12]), 0.5); return [m[0], ute.c[1], m[2]] as Vec3; })();
  const skjutet = (flytt: Vec3, yaw: number, s: number): Kort => { const pv = add(tappUte, mul(flytt, s));
    return {c: add(pv, turned(sub(ute.c, tappUte), UP, yaw * s)), l: turned(ute.l, UP, yaw * s), n: ute.n}; };
  // Sedan släpper hon det där högern ska ta det (det ligger på filten): fingertopparna lyfts rakt upp och handen går hem
  // till ankaret, redo vid skon (Jakob 2026-11-26: "dockan ska inte vara avspänd vid skon i REDO/A2.3").
  const vansterHem = (slapp: Hand, j: number): Hand => { const k = mjuk(j / REN.hemV); if (k >= 1) return {a: HL0, w: f0.L.w, S: SL0};
    // (fingertopparna dras genast tillbaka från kortet längs handen och upp, så att högern får platsen)
    const bak = mul(flat(slapp.a.forward), -0.03 * smooth(j / 2) * (1 - k));
    return {a: between(slapp.a, HL0, k), w: add(add(lerp(slapp.w, f0.L.w, k), bak), [0, 0.025 * smooth(j / 2) * (1 - k) + 0.01 * Math.sin(Math.PI * k), 0]), S: formMellan(slapp.S, SL0, k)}; };
  // Högern kommer in vid kanten hon ska ta: 15 mm utanför den med tummens topp vid filten (ansatsen, ruta vid), och
  // tummen glider in under kanten medan kanten lyfts på den (till ruta tar).
  const ansats = (ht: Hand, ut: Vec3, S: Vec3[]): Hand => ({a: ht.a, w: add(ht.w, mul(flat(ut), 0.015)), S});
  /** Kanten hon håller: dess håll ut ur kortet `k` i världen, för greppet med kortet som `ref` och kanten åt `phi` i handen. */
  const kantUt = (k: Kort, ref: Kort, phi: number): Vec3 => { const o = utAt(phi), ar = cross(ref.n, ref.l), a = cross(k.n, k.l); return unit(add(mul(k.l, dot(o, ref.l)), mul(a, dot(o, ar)))); };
  const tU = REN.ute, tA = REN.vid, tT = REN.tar;
  /** Högerhanden fram till att den tar kortet (ruta t ≤ tar): från ankaret till ansatsen `hA`, lyft lite på vägen, och in under kanten till greppet `ht`. */
  // (i en enda båge, farten upp och ned som en klocka: lyft ur ankaret, mot ansatsen utanför kanten och in under den; handen
  // vriden och öppnad på vägen, och fingrarna sluter sig om kanten först på slutet)
  const hogerFore = (t: number, hA: Hand, ht: Hand, SA: Vec3[]): Hand => {
    if (t <= REN.fran) return {a: HR0, w: f0.R.w, S: SR0};
    const s = mjuk((t - REN.fran) / (tT - REN.fran)), p1 = add(lerp(f0.R.w, hA.w, 0.35), [0, 0.03, 0]);
    return {a: between(HR0, ht.a, mjuk(Math.min(1, s / 0.85))), w: bezier(f0.R.w, p1, hA.w, ht.w, s), S: s < 0.75 ? formMellan(SR0, SA, smooth(s / 0.75)) : formMellan(SA, ht.S, smooth((s - 0.75) / 0.25))}; };

  // 2. Var kortet ligger till sist, och de fyra kanterna det kan tippa över dit.
  const F: Kort = {c: [input.at[0], T / 2, input.at[2]], l: [0, 0, -1], n: UP}, aF = cross(UP, F.l);
  const gangjarn = [F.l, mul(F.l, -1), aF, mul(aF, -1)].map((o, j) => ({o, D: j < 2 ? HK : WK, j}));

  // 3. Valet: kanten det tippar över, vilken kant hon håller och hur, hur det står när hon släpper, hur det ligger när hon
  // tar det och var; minst böjd handled där hon tar det, halvvägs och där hon släpper, underarmen inom vad den vrids, armen
  // inom räckvidd, händerna isär och vägen kort.
  const pol0 = unit(sub(f0.R.e, f0.R.s)), utanfor = (v: number) => Math.max(0, -15 - v, v - 115);
  /**
   * Fallet: kortet vrids kring kanten på filten från vinkeln `beta` (radianer från liggande) med farten `omega` (negativ: mot
   * liggande), som tyngdkraften ger en tunn skiva kring sin kant (vinkelns acceleration 3g/(2D) gånger cos), tills det
   * ligger: vinkeln vid varje ruta därefter och tiden det tar.
   */
  const fallet = (beta: number, omega: number, D: number) => { const k = 3 * G / (2 * D), h = 1 / 4000, rutor: number[] = [beta]; let b = beta, w = omega, t = 0, f = 1;
    while (b > 0 && t < 1) { w -= k * Math.cos(b) * h; b += w * h; t += h; if (t >= f / FPS - 1e-12) { rutor.push(Math.max(0, b)); f++; } }
    if (rutor.at(-1)! > 0) rutor.push(0); return {rutor, tid: t}; };
  /** Kortet vänt `beta` från liggande kring kanten `gj` (0: där det ska ligga, 180: baksidan upp på andra sidan kanten), vridet `gamma` kring den kantens mitt och flyttat `d`. */
  const lageFor = (gj: (typeof gangjarn)[number]) => { const {o: oF, D} = gj, eF = cross(UP, oF), hF = add(F.c, mul(oF, D / 2));
    return (beta: number, gamma: number, d: Vec3): Lage => {
      let c = add(hF, turned(sub(F.c, hF), eF, beta)), o = turned(oF, eF, beta), n = turned(UP, eF, beta), e = eF;
      if (gamma) { c = add(hF, turned(sub(c, hF), UP, gamma)); o = turned(o, UP, gamma); n = turned(n, UP, gamma); e = turned(e, UP, gamma); }
      return {c: add(c, d), o, e, n}; }; };
  /**
   * Tummen skjuter kortet över (Jakob 2026-11-26: "med hjälp av tummen ta emot kortet som sedan skjuts och vänds över"):
   * på slutet vänds kortet `rho` radianer i fingrarna, kring linjen genom pek- och långfingrets toppar (där de och tummen
   * håller det; topparna står kvar på kortet), åt samma håll som det vänds över kanten, så att handen själv vänds så mycket
   * mindre. `nypI`: den linjen i kortets egna mått (en punkt och hållet, längs långsidan och tvärs). Handen för kortet `k`, sett så.
   */
  const nypI = (ref: Kort) => { const ar = cross(ref.n, ref.l), i = (q: Vec3) => { const d = sub(q, ref.c); return [dot(d, ref.l), dot(d, ar)] as [number, number]; };
    const p8 = i(grepp.t8), p12 = i(grepp.t12), d = [p12[0] - p8[0], p12[1] - p8[1]], L = Math.hypot(d[0], d[1]) || 1;
    // (linjen går genom topparnas mitt, ovanför kortet där de är: kortet vänds kring den och ligger kvar mot dem)
    const w = dot(sub(mul(add(grepp.t8, grepp.t12), 0.5), ref.c), ref.n);
    return {p: [(p8[0] + p12[0]) / 2, (p8[1] + p12[1]) / 2] as [number, number], d: [d[0] / L, d[1] / L] as [number, number], w}; };
  const linjeI = (k: Kort, ref: Kort) => { const {p, d, w} = nypI(ref), a = cross(k.n, k.l); return {nyp: add(add(add(k.c, mul(k.l, p[0])), mul(a, p[1])), mul(k.n, w)), dir: unit(add(mul(k.l, d[0]), mul(a, d[1])))}; };
  const handSkjuten = (k: Kort, e: Vec3, ref: Kort, S: Vec3[], rho: number): Hand => { if (!rho) return handVid(k, ref, S);
    const {nyp, dir} = linjeI(k, ref), ax = dot(dir, e) < 0 ? mul(dir, -1) : dir, r = (x: Vec3) => turned(x, ax, rho);
    return handVid({c: add(nyp, r(sub(k.c, nyp))), l: r(k.l), n: r(k.n)}, ref, S); };
  // Steg ett, där hon släpper: kanten det tippar över, vilken kant hon håller och hur kortet sitter i handen, hur brant
  // det står och hur långt tummen har skjutit det; handleden minst böjd, underarmen inom vad den vrids, handen över filten
  // och armen inom räckvidd.
  type Slapp = {gj: (typeof gangjarn)[number]; phi: number; lang: boolean; tecken: number; glid: number; slapp: number; rho: number; S: Vec3[]; ref: Kort; hr: Hand; cost: number};
  const slapp: Slapp[] = [];
  for (const gj of gangjarn) { const lage = lageFor(gj), eF = cross(UP, gj.o);
    for (const [phi, S] of grepp.tummar) for (const lang of [true, false]) for (const tecken of [1, -1]) for (const glidAndel of [-1, 0, 1]) {
      const glid = glidAndel * ((lang ? HK : WK) / 2 - 0.016), ref = refKort(grepp, phi, lang, tecken, glid);
      if (felIRum(iRef(S), ref).length) continue;
      for (const sl of REN.slapp) { const kr = kortAv(lage(rad(sl), 0, [0, 0, 0]), gj.D);
        // (tummen kan skjuta det över bara där linjen genom topparna går ungefär längs kanten det tippar över)
        for (const rh of !grepp.kant && Math.abs(dot(linjeI(kr, ref).dir, eF)) > 0.8 ? REN.skjut : [0]) {
          const hr = handSkjuten(kr, eF, ref, S, rad(rh)), fri = overFilten(hr, doll); if (fri < -0.006) continue;
          // (där tummen har skjutit kortet över får inget finger vara i det: de fria fingrarna ligger närmast det då)
          if (rh && [0.5, 1].some(x => fel(punkter(handSkjuten(kr, eF, ref, S, rad(rh) * x)), 1, kr).some(f => f.kind === 'kortet'))) continue;
          const need = rackvidd(hip, f0.R.s, [hr.w], F.c, doll), bR = armbage(bal(hip, F.c, need.lean, need.twist)(f0.R.s), hr.w, pol0, hr.a, doll);
          // (fallet som det ungefär blir: med vändningens fart när hon släpper, som i steg två med ett medellångt bärande)
          const omegaUngefar = -Math.max(1.2 * Math.sqrt(Math.max(0, 3 * G / gj.D * (1 - Math.sin(rad(sl))))), (Math.PI - rad(16) - rad(sl)) * REN.fart * FPS / 13), fallTid = fallet(rad(sl), omegaUngefar, gj.D).tid;
          const cost = 1.5 * bR.cost + (glid / 0.02) ** 2 + (utanfor(rulle(hr.a)) / 10) ** 2 + 1e5 * Math.max(0, -fri) ** 2 + 0.5 * need.kortMm ** 2 + (rh / 40) ** 2 + (Math.max(0, fallTid - 0.12) / 0.03) ** 2;
          slapp.push({gj, phi, lang, tecken, glid, slapp: rad(sl), rho: rad(rh), S, ref, hr, cost}); } } } }
  slapp.sort((a, b) => a.cost - b.cost);
  // Steg två, där hon tar det: hur vänsterhanden har skjutit och vridit det, hur lyft kanten är på tummen; handleden
  // minst böjd där och halvvägs, underarmen inom vad den vrids, händerna isär och vänsterhanden inte i maxläge.
  type Val = ReturnType<typeof prova>;
  function prova(s: Slapp, dYaw: number, flytt: Vec3, tau: number) {
    const {gj, ref, S, hr, slapp: sl} = s, {D} = gj, lage = lageFor(gj), hF = add(F.c, mul(gj.o, D / 2));
    // kortet platt ute ur skon i vändningens mått: vridningen kring UP som ger dess långsida
    const yaw0 = yawFrom(kortAv(lage(Math.PI, 0, [0, 0, 0]), D).l, ute.l);
    const gamma = yaw0 + dYaw, tarC = skjutet(flytt, dYaw, 1).c, dTar: Vec3 = (() => { const c = lage(Math.PI, gamma, [0, 0, 0]).c; return [tarC[0] - c[0], 0, tarC[2] - c[2]]; })();
    const Lt = lage(Math.PI - tau, gamma, dTar), ht = handVid(kortAv(Lt, D), ref, S);
    const Lm = lage((Math.PI - tau + sl) / 2, gamma * 0.2, add(mul(dTar, 0.5), [0, 0.04, 0])), hm = handVid(kortAv(Lm, D), ref, S);
    // bärandets längd efter hur långt kanten det tippar över går, och farten vändningen har när hon släpper: så att kortet
    // säkert går över lodrätt (en tunn skiva kring sin kant: farten minst roten ur 3g/D gånger (1 - sin vinkeln), och en femtedel till)
    const tarH = add(lage(Math.PI, gamma, dTar).c, mul(lage(Math.PI, gamma, dTar).o, D / 2)), avst = Math.hypot(hF[0] - tarH[0], hF[2] - tarH[2]);
    // (kortare där det annars inte skulle ligga senast ruta REN.ligger: en snabbare vändning faller också fortare)
    const omegaMinst = 1.2 * Math.sqrt(Math.max(0, 3 * G / D * (1 - Math.sin(sl))));
    const takt = (n: number) => { const v1 = Math.max(REN.fart, Math.min(3, omegaMinst * n / FPS / Math.abs(Math.PI - tau - sl))); return {n, v1, fallTid: fallet(sl, (sl - (Math.PI - tau)) * v1 / (n / FPS), D).tid}; };
    let tk = takt(Math.round(REN.bar[0] + (REN.bar[1] - REN.bar[0]) * clamp01((avst - REN.barMeter[0]) / (REN.barMeter[1] - REN.barMeter[0]))));
    while (tk.n > 8 && tT + tk.n + Math.ceil(tk.fallTid * FPS) > REN.ligger) tk = takt(tk.n - 1);
    const {n: nBar, v1, fallTid} = tk;
    const need = rackvidd(hip, f0.R.s, [hr.w], F.c, doll), torso = bal(hip, F.c, need.lean, need.twist), torsoHalv = bal(hip, F.c, need.lean * 0.5, need.twist * 0.5);
    const bT = armbage(f0.R.s, ht.w, pol0, ht.a, doll), bM = armbage(torsoHalv(f0.R.s), hm.w, pol0, hm.a, doll), bR = armbage(torso(f0.R.s), hr.w, pol0, hr.a, doll);
    const vt = rulle(ht.a), vr = rulle(hr.a), vm = rulle(hm.a);
    // (händerna isär från att vänstern släpper till att högern har tagit kortet)
    const vSl = vansterDrag(kortAv(lage(Math.PI, gamma, dTar), D), SLo), hA = ansats(ht, kantUt(kortAv(Lt, D), ref, s.phi), S);
    const isar = Math.min(...Array.from({length: tT - tU + 1}, (_, j) => handsApart({L: {p: punkter(vansterHem(vSl, j))}, R: {p: punkter(hogerFore(tU + j, hA, ht, S))}})));
    // (vänsterhanden där den släpper: handleden inte i maxläge och över filten)
    const bV = armbage(f0.L.s, vSl.w, unit(sub(f0.L.e, f0.L.s)), vSl.a, doll), friV = overFilten(vSl, doll);
    const kostar = {bojd: bT.cost + bM.cost + 1.5 * bR.cost, vanster: bV.cost + 1e5 * Math.max(0, -friV) ** 2, vrid: ((utanfor(vt) + utanfor(vr) + utanfor(vm)) / 5) ** 2, kort: 0.5 * need.kortMm ** 2,
      isar: 1e6 * Math.max(0, 0.012 - isar) ** 2, nara: (length(sub(ht.w, f0.R.w)) / 0.12) ** 2, yaw: (dYaw / rad(60)) ** 2, flytt: (length(flytt) / 0.06) ** 2,
      filten: 1e5 * Math.max(0, -overFilten(hr, doll)) ** 2, flick: ((v1 - 1.4) / 1.2) ** 2,
      // (fallet: kortet ska ligga senast REN.ligger rutor in, och handen själv vända kortet en del: tummen skjuter bara resten)
      fall: ((Math.max(0, fallTid - 0.12)) / 0.06) ** 2 + 1e3 * Math.max(0, tT + nBar + Math.ceil(fallTid * FPS) - REN.ligger) ** 2, vander: (Math.max(0, 35 - (vr - vt)) / 15) ** 2};
    const cost = Object.values(kostar).reduce((x, y) => x + y, 0);
    const b = (h: Hand, sh: Vec3, v: number) => { const x = bojd(h.a, h.w, arm(sh, h.w, turned(pol0, unit(sub(h.w, sh)), v), doll).elbow); return [grad(x.dev), grad(x.flex)]; };
    const bojdGrader = {tar: b(ht, f0.R.s, bT.vrid), halv: b(hm, torsoHalv(f0.R.s), bM.vrid), slapper: b(hr, torso(f0.R.s), bR.vrid)};
    return {cost, kostar, bojdGrader, gj, phi: s.phi, lang: s.lang, glid: s.glid, dYaw, flytt, slapp: sl, rho: s.rho, nBar, v1, tau, gamma, dTar, D, hF, ref, S, lage, ht, hr, need, vt, vr, isar};
  }
  let val: NonNullable<Val> | null = null; const basta: NonNullable<Val>[] = [];
  // (bytet: vänsterhanden för kortet ur skon in mot mitten framför honom, och där tar högern det (Jakob 2026-11-26: "Låt alla
  // möten mellan handen som drar fram kort och det som tar emot mötas mer i mitten av bordet"): kortets mitt i bytet
  // REN.bytet från axlarnas mitt, och vägen dit för vridningen dy)
  const axelMitt = mul(add(f0.R.s, f0.L.s), 0.5), byten = REN.bytet.x.flatMap(x => REN.bytet.z.map(z => [axelMitt[0] + x, 0, axelMitt[2] + z] as Vec3));
  const flyttTill = (Hc: Vec3, dy: number): Vec3 => { const d = sub(sub(Hc, tappUte), turned(sub(ute.c, tappUte), UP, dy)); return [d[0], 0, d[2]]; };
  const perKant = new Map<number, NonNullable<Val>>();
  // (de bästa sätten att släppa det för var och en av kanterna det kan tippa över, så att alla fyra prövas)
  const provas = gangjarn.flatMap(g => slapp.filter(s => s.gj.j === g.j).slice(0, Math.ceil(REN.provas / 3)));
  for (const s of provas) {
    // hur lyft kanten hon håller är när tummen är under den: så lite att handen är över filten
    const lage = lageFor(s.gj), hTilt = (x: number) => overFilten(handVid(kortAv(lage(Math.PI - x, 0, [0, 0, 0]), s.gj.D), s.ref, s.S), doll);
    let lo = rad(3), hi = rad(45); if (hTilt(hi) < 0) continue;
    for (let i = 0; i < 25; i++) { const m = (lo + hi) / 2; if (hTilt(m) >= 0) hi = m; else lo = m; }
    let sBast: NonNullable<Val> | null = null;
    for (let dy = -90; dy <= 90; dy += 15) for (const flytt of byten.map(Hc => flyttTill(Hc, rad(dy)))) {
      const v = prova(s, rad(dy), flytt, hi); if (!val || v.cost < val.cost) val = v; if (!sBast || v.cost < sBast.cost) sBast = v;
      const b = perKant.get(s.gj.j); if (!b || v.cost < b.cost) perKant.set(s.gj.j, v); }
    if (sBast) basta.push(sBast); }
  if (!val) throw Error(`ren-giv: ${input.place}: inget grepp går.`);
  // Steg tre: de billigaste byggs hela och mäts som mat.ts mäter (granska); den första utan något som spärrar vinner,
  // annars den med minst.
  let vald: {r: ReturnType<typeof bygg>; g: ReturnType<typeof granska>} | null = null;
  for (const V of basta.sort((a, b) => a.cost - b.cost).slice(0, REN.byggs)) { const r = bygg(V), g = granska(r.motion, doll);
    if (!vald || g.poang < vald.g.poang) vald = {r, g}; if (g.poang === 0) break; }
  return {...vald!.r, granskning: vald!.g};

  function bygg(V: NonNullable<Val>) {
  const {lage, ref, D, tau, gamma, dTar} = V;

  // 4. Tiderna: kortet ute och framskjutet (ute), högern vid kanten (tA), taget (tar), bärs och vänds (släpps vid tR),
  // faller (ligger vid tL). Bärandet tar längre ju längre kanten det tippar över har att gå (valet ovan).
  const {nBar, v1} = V, tR = tT + nBar;
  // Vändningen i bärandet: vinkeln från kanten (beta) med farten v1 när hon släpper; kortet vrids klart kring
  // filten (gamma) på de första sju tiondelarna; kanten det tippar över följer en mjuk väg dit, lyft så mycket som behövs.
  const betaT = Math.PI - tau, betaR = V.slapp;
  const sBeta = (u: number) => { const x = clamp01(u); return (-2 * x ** 3 + 3 * x ** 2) + (x ** 3 - x ** 2) * v1; };
  const bump = (u: number) => 16 * u * u * (1 - u) * (1 - u);
  const barLage = (u: number, lyft: number) => lage(betaT + (betaR - betaT) * sBeta(u), gamma * (1 - smooth(u / 0.7)), add(mul(dTar, 1 - smooth(u)), [0, lyft * bump(u), 0]));
  // (handen i bärandet: fast på kortet, och på slutet skjuter tummen det över i fingrarna, V.rho till sist)
  const handBar = (u: number, lyft: number) => { const L = barLage(u, lyft); return handSkjuten(kortAv(L, D), L.e, ref, V.S, V.rho * smooth((u - 0.5) / 0.5)); };
  // lyftet: så lite att kortets hörn och handen är minst REN.lyft över filten mitt i bärandet
  let lyft = 0; for (let pass = 0; pass < 40; pass++) { let worst = 0;
    for (let j = 1; j < nBar; j++) { const u = j / nBar, L = barLage(u, lyft), need = Math.min(...horn(kortAv(L, D)).map(q => q[1]), overFilten(handBar(u, lyft), doll) + REN.lyft) - REN.lyft * Math.min(1, bump(u) * 4);
      if (need < -1e-4) worst = Math.max(worst, -need / Math.max(0.05, bump(u))); }
    if (worst <= 0) break; lyft += worst + 0.0005; }

  // 5. Fallet: när hon släpper har kortet vändningens fart (sBeta'(1) = v1: vinkeln ändras v1/nBar av hela per ruta;
  // negativ mot liggande), och tyngdkraften tar det resten (fallet ovan).
  const omega0 = (betaR - betaT) * v1 * FPS / nBar, fallen = fallet(betaR, omega0, D), fall = fallen.rutor, fallTid = fallen.tid;
  const tL = tR + fall.length - 1;
  const tRor = tL + REN.tillRor, tVila = tRor + REN.vila - 1, slut = tL + REN.efter;

  // 6. Kortet ruta för ruta.
  const forstaKort = ut(0);
  // (vägen räknas som kortet rör sig: mittens väg och dess vridning, en radian som 12 cm, så att det går jämnt fast det
  // vrids fort när det släpper plåten; utVag ger var längs vägen ut ur skon kortet är när det har gått så långt)
  const vridVag = (a: Kort, b: Kort) => length(sub(a.c, b.c)) + 0.12 * Math.acos(Math.max(-1, Math.min(1, dot(a.n, b.n))));
  const utTab: number[] = [0]; for (let i = 1; i <= 200; i++) utTab.push(utTab[i - 1] + vridVag(ut(aSlut * (i - 1) / 200), ut(aSlut * i / 200)));
  const utVag = (s: number) => { let i = 1; while (i < 200 && utTab[i] < s) i++; const k = (s - utTab[i - 1]) / Math.max(1e-9, utTab[i] - utTab[i - 1]); return aSlut * (i - 1 + Math.max(0, Math.min(1, k))) / 200; };
  const slideLangd = length(V.flytt) + Math.abs(V.dYaw) * 0.12, utLangd = utTab[200]; // (vridningen tar sin tid: en radian som 12 cm väg)
  const kortVid = (t: number): Kort => {
    if (t <= tU) { const lam = (utLangd + slideLangd) * mjuk(t / tU);
      if (lam <= utLangd) { const k = ut(utVag(lam)); return skillnad0 > 0.05 ? flyttatFranAnkare(k, t) : k; }
      return skjutet(V.flytt, V.dYaw, slideLangd > 1e-6 ? (lam - utLangd) / slideLangd : 1); }
    if (t <= tT) return lyftPaTummen(t);
    if (t <= tR) return kortAv(barLage((t - tT) / nBar, lyft), D);
    if (t <= tL) return kortAv(lage(fall[t - tR], 0, [0, 0, 0]), D);
    return kortAv(lage(0, 0, [0, 0, 0]), D);
  };
  /**
   * Medan tummen glider in under kanten (ruta vid till tar) rider kanten upp på den: kortet lutar kring motsatta kanten
   * så mycket planen säger, och mer där tummen annars skulle vara i det (aldrig mer än det lutar när hon har tagit det).
   */
  function lyftPaTummen(t: number): Kort {
    // (den lutning närmast planen där varken tummen under eller fingertopparna ovanpå är i kortet)
    const plan = tau * smooth((t - tA) / (tT - tA)), h = hogerFore(t, hA, hT, SA), p = punkter(h);
    const djup = (x: number) => fel(p, 1, kortAv(lage(Math.PI - x, gamma, dTar), D)).filter(f => f.kind === 'kortet').reduce((s, f) => s + f.by, 0);
    if (t <= tA || djup(plan) === 0) return kortAv(lage(Math.PI - plan, gamma, dTar), D);
    let bast = {x: plan, d: djup(plan), c: Infinity};
    for (let x = 0; x <= tau + 1e-9; x += rad(0.5)) { const d = djup(x), c = d * 100 + Math.abs(x - plan); if (c < bast.c) bast = {x, d, c}; }
    return kortAv(lage(Math.PI - bast.x, gamma, dTar), D);
  }
  // (kortet i skon i ankaret och vägens början skiljer sig `skillnad0` mm: skillnaden tonas ut på vägen ned)
  function flyttatFranAnkare(k: Kort, t: number): Kort { const v = mul(sub(f0.card.c, forstaKort.c), 1 - smooth(t / 3)); return {...k, c: add(k.c, v)}; }

  // 7. Högerhanden ruta för ruta.
  const hT = handVid(kortAv(lage(betaT, gamma, dTar), D), ref, V.S), utT = kantUt(kortAv(lage(betaT, gamma, dTar), D), ref, V.phi);
  // (in mot kanten: 15 mm utanför den, med tummens topp vid filten och fingrarna lite öppnare)
  const oppen = V.S.map(q => [...q] as Vec3); bendFinger(oppen, 1, [grepp.hall[0] - 15, grepp.hall[1] - 10, grepp.hall[2]]); bendFinger(oppen, 2, [grepp.hall[3] - 15, grepp.hall[1] - 10, grepp.hall[2]]);
  const SA = thumbToward(oppen, local(punkter(hT), hT.a)[4], 75);
  const hA = ansats(hT, utT, SA);
  // (där hon släpper och farten då: kortet ruta före och efter)
  const hRel = handBar(1, lyft);
  // (två fingertoppar på det lagda kortet: pek- och långfingret där de höll det, handflatan nedåt; landing.ts 'pek-lang')
  const ror = (() => {
    const S = medLeder(SR0, grepp.kant ? [[40, 12, 6], [38, 12, 6], [30, 25, 12], [25, 25, 12]] : [[40, 12, 6], [38, 12, 6], [64, 92, 48], [58, 88, 46]]); // (landing.ts pek-lang; i det öppna greppet ring- och lillfingret avspänt)
    const Lf = lage(0, 0, [0, 0, 0]), kf = kortAv(Lf, D), af = cross(kf.n, kf.l), hf = handVid(kf, ref, V.S), pf = punkter(hf), mal = mul(add(pf[8], pf[12]), 0.5), fram0 = flat(hRel.a.forward);
    // (tummen där den har följt kortet ned, så att handen inte hoppar dit: topparna läggs nära den)
    const kr = kortVid(tR), ar = cross(kr.n, kr.l), dt = sub(punkter(hRel)[4], kr.c), malTumme = add(add(add(kf.c, mul(kf.l, dot(dt, kr.l))), mul(af, dot(dt, ar))), mul(UP, topp.thumb + 0.0025 + T / 2));
    let bast: {h: Hand; c: number} | null = null;
    for (const du of [-0.02, 0, 0.02]) for (const dv of [-0.02, 0, 0.02]) { const p0 = add(add(mal, mul(kf.l, du)), mul(af, dv)), pa: Vec3 = [p0[0], T + topp.finger, p0[2]];
      for (let pitch = 0; pitch <= 50; pitch += 5) for (let roll = -24; roll <= 24; roll += 8) for (let yaw = -30; yaw <= 30; yaw += 15) {
        const fram = turned(fram0, UP, rad(yaw)), tvars = unit(cross(mul(UP, -1), fram));
        let a: Axes = {forward: fram, palm: mul(UP, -1), across: tvars}; a = {forward: turned(a.forward, a.across, -rad(pitch)), palm: turned(a.palm, a.across, -rad(pitch)), across: a.across};
        const rr = (v: Vec3) => turned(v, a.forward, rad(roll)); a = {forward: a.forward, palm: rr(a.palm), across: rr(a.across)};
        if (dot(cross(a.palm, a.forward), a.across) < 0) a = {...a, across: mul(a.across, -1)};
        const P0 = placed(S, a, [0, 0, 0]), mid = mul(add(P0[8], P0[12]), 0.5), w = sub(pa, mid), h: Hand = {a, w, S}, P = punkter(h);
        const niva = Math.abs(P[8][1] - P[12][1]), fels = fel(P, 1, kf).length, handled = Math.max(0, doll.shape.wristBall + 0.005 - h.w[1]);
        const c = (niva / 0.001) ** 2 + 1e5 * handled ** 2 + 50 * fels + (yaw / 20) ** 2 + ((pitch - 20) / 25) ** 2 + (roll / 20) ** 2 + (length(sub(P[4], malTumme)) / 0.012) ** 2
          + (grepp.kant ? (length(sub(h.w, hf.w)) / 0.02) ** 2 + (Math.acos(Math.max(-1, Math.min(1, dot(a.forward, hf.a.forward)))) / rad(15)) ** 2 + (Math.acos(Math.max(-1, Math.min(1, dot(a.palm, hf.a.palm)))) / rad(15)) ** 2 : 0);
        if (!bast || c < bast.c) bast = {h, c}; } }
    return bast!.h; })();
  // (efter släppet: tummen följer kortets framsida medan det tippar över kanten och faller, en knapp centimeter från den
  // utan att röra den, så att kortet aldrig är utan en hand intill. Handen vrids först med kortet och sedan jämnt till vilan,
  // fingrarna sträcks genast upp från baksidan, och när kortet ligger sänks de på det, två rutor efter)
  const tummeKort = (() => { const k = kortVid(tR), a = cross(k.n, k.l), d = sub(punkter(hRel)[4], k.c); return [dot(d, k.l), dot(d, a)]; })();
  const tummeVila = (() => { const k = kortVid(tL), a = cross(k.n, k.l), d = sub(punkter(ror)[4], k.c); return [dot(d, k.l), dot(d, a), dot(d, k.n)]; })();
  // (fingrarna böjs in från baksidan när hon släpper, och går över till vilans när kortet ligger)
  // (i det öppna greppet sträcks de i stället upp från baksidan, och böjs aldrig in mot handflatan)
  const knuten = grepp.kant ? medLeder(V.S, [[10, 15, 8], [10, 15, 8], [15, 20, 10], [15, 20, 10]]) : medLeder(V.S, [[75, 95, 60], [75, 95, 60], [70, 95, 55], [65, 90, 50]]);
  const efterSlapp = (t: number): Hand => {
    const j = t - tR, u = clamp01(j / (tRor - tR)), kc = kortVid(Math.min(t, tL)), Lf = lage(fall[Math.min(j, fall.length - 1)], 0, [0, 0, 0]);
    const medKortet = handSkjuten(kortAv(Lf, D), Lf.e, ref, V.S, V.rho).a, A = between(medKortet, ror.a, mjuk(u));
    // (när kortet ligger lyfts handen först till vilans höjd, och fingrarna sträcks ned på kortet efter)
    const S = formMellan(formMellan(V.S, knuten, smooth(j / 2)), ror.S, smooth((t - tL + REN.foreLigger) / (tRor - tL + REN.foreLigger)));
    // (tummens punkt glider på vägen över kortet till där den är i vilan, och lyfts dit först när kortet ligger)
    const k = mjuk(u), ner = t <= tL ? 0 : smooth((t - tL) / (tRor - tL)), ac = cross(kc.n, kc.l);
    // (tummen står kvar där den var mot framsidan första rutan, medan fingrarna böjs ut från baksidan, och glider sedan
    // en knapp centimeter ut; innan kortet ligger håller den sig innanför kortets kanter, där den stöder det)
    const inom = (x: number, h: number) => t <= tL ? Math.max(-h + 0.004, Math.min(h - 0.004, x)) : x, ut0 = topp.thumb + T / 2;
    const cu = inom(tummeKort[0] + (tummeVila[0] - tummeKort[0]) * k, HK / 2), cv = inom(tummeKort[1] + (tummeVila[1] - tummeKort[1]) * k, WK / 2), cw = (ut0 + 0.0025 * smooth((j - 1) / 2)) * (1 - ner) + tummeVila[2] * ner;
    const mal = add(add(add(kc.c, mul(kc.l, cu)), mul(ac, cv)), mul(kc.n, cw));
    return {a: A, w: sub(mal, add(add(mul(A.forward, S[4][0]), mul(A.palm, S[4][1])), mul(A.across, S[4][2]))), S}; };
  const hogerVid = (t: number): Hand => {
    if (t <= tT) return hogerFore(t, hA, hT, SA);
    if (t <= tR) return handBar((t - tT) / nBar, lyft);
    if (t <= tRor) return efterSlapp(t);
    if (t <= tVila) return ror;
    const k = mjuk((t - tVila) / (slut - tVila)); return {a: between(ror.a, HR0, k), w: add(lerp(ror.w, f0.R.w, k), [0, 0.03 * Math.sin(Math.PI * k), 0]), S: formMellan(ror.S, SR0, k)};
  };

  // 8. Vänsterhanden: fast på kortet tills det ligger där högern ska ta det, sedan lyft av och hem till ankaret.
  const vHemma = tU + REN.hemV;
  // (under dragningen ligger pek- och långfingrets toppar kvar där de är på kortet, och handens vinkel vrids jämnt från
  // ankarets till den den har när hon släpper, så att handleden inte svänger med kortets vridning ut ur skon; och handen
  // rullar kring linjen genom topparna där ring- och lillfingret annars skulle gå i filten)
  // (formen öppnas medan kortet läggs på filten)
  const formV = (t: number) => formMellan(SL0, SLo, smooth(t / (tU * 0.6)));
  const tippPaKort = (() => { const d = sub(mul(add(f0.L.p[8], f0.L.p[12]), 0.5), k0.c); return [dot(d, k0.l), dot(d, a0), dot(d, k0.n) - 0.0006]; })();
  // (handens vinkel som den fasta handen på kortet har den, jämnad över rutorna intill: kortet vrids fort när det lämnar plåten)
  let aDrag: Axes[] = Array.from({length: tU + 1}, (_, t) => t === 0 ? HL0 : vansterDrag(kortVid(t), formV(t)).a);
  for (let pass = 0; pass < 3; pass++) aDrag = aDrag.map((a, t) => t === 0 || t === tU ? a : between(between(aDrag[t - 1], aDrag[t + 1], 0.5), a, 0.5));
  const dragen = (t: number): Hand => { const k = kortVid(t), a = cross(k.n, k.l), P = add(add(add(k.c, mul(k.l, tippPaKort[0])), mul(a, tippPaKort[1])), mul(k.n, tippPaKort[2]));
    const A = aDrag[t], S = formV(t), tippLokal = mul(add(S[8], S[12]), 0.5); return {a: A, w: sub(P, add(add(mul(A.forward, tippLokal[0]), mul(A.palm, tippLokal[1])), mul(A.across, tippLokal[2]))), S}; };
  const rullad = (h: Hand, x: number): Hand => { if (!x) return h; const p = punkter(h), ax = unit(sub(p[12], p[8])), o = p[8], r = (v: Vec3) => turned(v, ax, x);
    return {a: {forward: r(h.a.forward), palm: r(h.a.palm), across: r(h.a.across)}, w: add(o, r(sub(h.w, o))), S: h.S}; };
  const friV = (h: Hand) => -Math.max(0, ...fel(punkter(h), -1, null).filter(f => f.kind === 'filten').map(f => f.by + 0.5));
  // (där det ändå inte räcker rullar handen åt det håll som hjälper, högst så långt att den blir fri; hjälper ingen rullning rullar den inte)
  const rullBehov = (h: Hand) => { if (friV(h) >= 0) return 0; let bast = {x: 0, f: friV(h)};
    for (const s of [1, -1]) for (let x = 0.01; x <= 0.6; x += 0.01) { const f = friV(rullad(h, s * x)); if (f > bast.f + 1e-9) bast = {x: s * x, f}; if (f >= 0) break; }
    return bast.x; };
  const rullV = Array.from({length: tU + 1}, (_, t) => t === 0 ? 0 : rullBehov(dragen(t)));
  const rullJamn = rullV.map((_, t) => t === 0 ? 0 : rullV.reduce((s, x, j) => Math.abs(x) * (1 - smooth(Math.abs(t - j) / 3)) > Math.abs(s) ? x * (1 - smooth(Math.abs(t - j) / 3)) : s, 0));
  // (och lyfts det lilla som ändå behövs för att inget finger ska gå i filten, jämnat över rutorna intill)
  const lyftV0 = rullV.map((_, t) => t === 0 ? 0 : Math.max(0, -friV(rullad(dragen(t), rullJamn[t])) / 1000));
  const lyftVJ = lyftV0.map((_, t) => t === 0 ? 0 : Math.max(...lyftV0.map((x, j) => x * (1 - smooth(Math.abs(t - j) / 3)))));
  const upp = (h: Hand, y: number): Hand => y ? {...h, w: add(h.w, [0, y, 0])} : h;
  // (vänsterhanden lämnar kortet plant på filten i bytet och går hem medan högern kommer: de möts kring kortet)
  const vansterVid = (t: number): Hand => t === 0 ? {a: HL0, w: f0.L.w, S: SL0} : t <= tU ? upp(rullad(dragen(t), rullJamn[t]), lyftVJ[t]) : vansterHem(upp(rullad(dragen(tU), rullJamn[tU]), lyftVJ[tU]), t - tU);

  // 9. Bålen, armarna, huvudet och blicken. Bålen lutar och vrider sig mot platsen (bal) bara så mycket som räckvidden
  // kräver i varje ruta, för båda händerna (en handled armen inte når sparas aldrig: body.ts arm), högst dockans mostLean
  // och mostTwist, och tonas mjukt in och ut över rutorna intill. Armbågen vrids så att handleden böjs minst (armbage),
  // och med bordets kant (input.kant) ut så mycket mer som underarmen behöver för luften över kanten (Jakob: "Armarna går
  // aldrig genom bordets kant"), också den mjukt in och ut.
  const n = slut + 1, H: Hand[] = [], L: Hand[] = [], K: Kort[] = [];
  for (let t = 0; t < n; t++) { H.push(hogerVid(t)); L.push(vansterVid(t)); K.push(kortVid(t)); }
  // (på väg till kortet och efter släppet lyfts högerhanden så mycket som behövs för att ingen del av den ska gå i filten,
  // jämnat över rutorna intill)
  const iFilten = H.map((h, t) => t <= REN.fran || (t >= tA && t <= tR) ? 0 : Math.max(0, ...fel(punkter(h), 1, null).filter(f => f.kind === 'filten').map(f => f.by / 1000 + 0.0025)));
  const lyftH = iFilten.map((_, t) => Math.max(0, ...iFilten.map((x, j) => x * smooth(1 - Math.abs(t - j) / 4))));
  lyftH.forEach((y, t) => { if (y > 0) H[t] = {...H[t], w: add(H[t].w, [0, y, 0])}; });
  const need = rackvidd(hip, f0.R.s, [...H.map(h => h.w)], F.c, doll, REN.naturlig), torso = bal(hip, F.c, need.lean, need.twist);
  const nar = doll.upperArm + doll.forearm - REN.naturlig, nas = (k: number, t: number) => length(sub(H[t].w, torso(f0.R.s, k))) <= nar && length(sub(L[t].w, torso(f0.L.s, k))) <= nar;
  const kravs = H.map((_, t) => { if (nas(0, t)) return 0; let lo = 0, hi = 1; if (!nas(1, t)) return 1; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (nas(m, t)) hi = m; else lo = m; } return hi; });
  // (tonat över TONA rutor åt varje håll, men noll i första och sista rutan: given börjar och slutar i exakt ankaret)
  const TONA = 8, fonster = (t: number) => smooth(t / 4) * smooth((n - 1 - t) / 4), tonad = (v: number[]) => v.map((_, t) => Math.max(v[t], fonster(t) * Math.max(0, ...v.map((x, j) => x * smooth(1 - Math.abs(t - j) / (TONA + 1))))));
  const andel = tonad(kravs), mestAndel = Math.max(0, ...andel), balUt = (t: number) => andel[Math.max(0, Math.min(n - 1, t))];
  const sR = (t: number) => torso(f0.R.s, balUt(t)), sL = (t: number) => torso(f0.L.s, balUt(t));
  const polL = unit(sub(f0.L.e, f0.L.s));
  const vridR = H.map((h, t) => t === 0 || t === n - 1 ? 0 : armbage(sR(t), h.w, pol0, h.a, doll).vrid), vridL = L.map((h, t) => t === 0 || t === n - 1 ? 0 : armbage(sL(t), h.w, polL, h.a, doll).vrid);
  // (vridningen jämnad över rutorna intill, och noll i ankaret där handen är som i det)
  const jamn = (v: number[], hemma: (t: number) => boolean) => v.map((_, t) => { if (hemma(t)) return 0; const s = v.slice(Math.max(0, t - 2), t + 3); return s.reduce((x, y) => x + y, 0) / s.length; });
  const hemmaR = (t: number) => t <= REN.fran || t === n - 1, hemmaL = (t: number) => t === 0 || t >= vHemma;
  const vR = jamn(vridR, hemmaR), vL = jamn(vridL, hemmaL);
  // (armbågen ut över kanten: i varje ruta den vridning till, åt det håll som för armbågen ut, som ger underarmen luften)
  const overKanten = (s: (t: number) => Vec3, hand: Hand[], pol: Vec3, v: number[], ut: number) => hand.map((h, t) => { if (!input.kant) return 0;
    const S = s(t), line = unit(sub(h.w, S)), e = (x: number) => arm(S, h.w, turned(pol, line, x), doll).elbow, tecken = dot(sub(e(v[t] + 0.05), e(v[t])), [ut, 0, 0]) >= 0 ? 1 : -1;
    for (let x = 0; x <= rad(110); x += rad(0.5)) if (underarmLuft(e(v[t] + tecken * x), h.w, input.kant) >= input.kant.luft) return tecken * x;
    return tecken * rad(110); });
  const tonadVrid = (v: number[]) => v.map((_, t) => { let b = 0; v.forEach((x, j) => { const y = x * smooth(1 - Math.abs(t - j) / (TONA + 1)) * (j === t ? 1 : fonster(t)); if (Math.abs(y) > Math.abs(b)) b = y; }); return b; });
  const extraR = tonadVrid(overKanten(sR, H, pol0, vR, -1)), extraL = tonadVrid(overKanten(sL, L, polL, vL, 1));
  const g0 = f0.g, frames: {card: Kort & {id: number}; L: Limb; R: Limb; h: Vec3; g: Vec3}[] = [];
  for (let t = 0; t < n; t++) {
    const s1 = sR(t), s2 = sL(t), h = H[t], l = L[t], k = K[t];
    const e1 = hemmaR(t) && !extraR[t] && !balUt(t) ? f0.R.e : arm(s1, h.w, turned(pol0, unit(sub(h.w, s1)), vR[t] + extraR[t]), doll).elbow, e2 = hemmaL(t) && !extraL[t] && !balUt(t) ? f0.L.e : arm(s2, l.w, turned(polL, unit(sub(l.w, s2)), vL[t] + extraL[t]), doll).elbow;
    const pR = hemmaR(t) ? f0.R.p : punkter(h), pL = (t === 0 || (t >= vHemma)) ? f0.L.p : punkter(l);
    const blick = t <= 10 ? lerp(g0, k.c, mjuk(t / 10)) : t <= tL ? k.c : lerp(k.c, g0, mjuk((t - tL) / (slut - tL)));
    frames.push({card: {c: r4(k.c), l: r4(unit(k.l)), n: r4(unit(k.n)), id: 0}, R: {s: r4(s1), e: r4(e1), w: r4(hemmaR(t) ? f0.R.w : h.w), k: f0.R.k, p: pR.map(r4)}, L: {s: r4(s2), e: r4(e2), w: r4(t === 0 || t >= vHemma ? f0.L.w : l.w), k: f0.L.k, p: pL.map(r4)},
      h: r4(torso(f0.h, balUt(t) * 0.85)), g: r4(blick)});
  }

  // 10. Kvittot: vad som valdes och hur det blev.
  const kvitto = {bojdGrader: V.bojdGrader, gangjarn: V.gj.D === HK ? 'kortsidan' : 'långsidan', phiGrader: V.phi, glidMm: mm(V.glid), yawVidTagGrader: grad(V.dYaw), flyttMm: V.flytt.map(mm), tauGrader: grad(tau), lyftMm: mm(lyft),
    rulle: {tar: V.vt, slapper: V.vr}, isarMm: mm(V.isar), lutGrader: grad(need.lean * mestAndel), vridGrader: grad(need.twist * mestAndel), armenKortMm: need.kortMm, armbagenUtGrader: {R: grad(Math.max(...extraR.map(Math.abs))), L: grad(Math.max(...extraL.map(Math.abs)))}, fallTid: Math.round(fallTid * 1000) / 1000, omega: Math.round(omega0 * 100) / 100,
    skonSkillnadMm: skillnad0, kostar: Object.fromEntries(Object.entries(V.kostar).map(([k, x]) => [k, Math.round(x * 100) / 100])), grepp: {hall: grepp.hall, fria: grepp.fria}};
  const times = {ute: tU, tar: tT, slapper: tR, ligger: tL, fingrarPa: tRor, hemFran: tVila, slut};
  const motion = {fps: FPS, frameCount: n, leavesShoe: tU, edge: [tR, tR], folds: tR, rests: tL, hip, doll: doll.name, to: [input.place], frames,
    cycle: {holdThrough: tVila, liftStarts: tVila + 1, liftEnds: tVila + 4, readyFrom: n - 1, durationSeconds: n / FPS, liftMeters: 0.03,
      method: 'Built from A2.3 by dealer3d/src/ren-giv.ts: drawn out of the shoe by the left hand, taken by the right thumb under the edge and two fingertips on the back, turned once by the forearm, set on its edge and let go, falling flat; two fingertips rest on it, the hand goes home.'}};
  return {motion, times, kvitto};
  }
}
export type RenGiv = ReturnType<typeof renGiv>;

// ---- vilan till skon --------------------------------------------------------------------------------------------------
/**
 * Takten för vilan till skon (Jakob 2026-11-26: "A1 - A2.3 ska ta 1 sekund ungefär"): rutor stilla i vilan, rutor i
 * rörelse, rutor stilla i ankaret; hur högt högerhanden lyfts på vägen och hur vänsterhanden går till kortet i skon
 * (`over`: upp ur vilan, `fore`: så långt utanför kortets yta och över det den är innan den sänks på det).
 */
export const VILA_TILL_SKON = {stillaFore: 3, ror: 30, stillaEfter: 3, lyft: 0.02, over: 0.07, fore: [0.05, 0.03] as [number, number]};
/**
 * Vilan till skon (A1 till A2.3) rent, på dockans ben: börjar stilla i vilan `a1` och slutar stilla i exakt ankarets
 * första ruta (`a23.frame`), så att den och givarna från ankaret möts utan skarv. Axlarna och kortet i skon står stilla.
 * Högerhanden glider från vilan till sin plats på filten, lyft lite på vägen; vänsterhanden lyfts ur vilan, förs över och
 * sänks på kortet i skon utifrån, längs kortets yta; varje hand byter form led för led (formMellan) och vrids i en enda
 * vridning (hand-pose.ts between). Armbågarna går från vilans till ankarets, och med bordets kant (`kant`) ut så mycket
 * mer som underarmen behöver för luften över den, mjukt in och ut.
 */
export function renVila(input: {a1: Ankare23['frame']; a23: Ankare23; doll: Doll; kant?: Kant}) {
  const {a1, a23, doll, kant} = input, f2 = a23.frame, V = VILA_TILL_SKON, n = V.stillaFore + V.ror + V.stillaEfter, sista = V.stillaFore + V.ror;
  const u = (t: number) => clamp01((t - V.stillaFore) / V.ror);
  const sidor = (['R', 'L'] as const).map(s => { const sign = s === 'R' ? 1 : -1, A1 = axesOf(a1[s].p, sign), A2 = axesOf(f2[s].p, sign);
    return {s, sign, A1, A2, S1: local(a1[s].p, A1), S2: local(f2[s].p, A2), w1: a1[s].w, w2: f2[s].w, e1: a1[s].e, e2: f2[s].e, sh: f2[s].s, ut: s === 'R' ? -1 : 1}; });
  // (vänsterhanden till kortet utifrån: kortets yta åt fingertopparnas håll)
  const k2 = f2.card, toppar = mul(add(f2.L.p[8], f2.L.p[12]), 0.5), utat = mul(k2.n, Math.sign(dot(sub(toppar, k2.c), k2.n)) || 1);
  const handAt = (i: number, t: number): Hand => { const x = sidor[i], k = mjuk(u(t));
    if (i === 0) return {a: between(x.A1, x.A2, k), w: add(lerp(x.w1, x.w2, k), [0, V.lyft * Math.sin(Math.PI * k), 0]), S: formMellan(x.S1, x.S2, k)};
    const p1 = add(x.w1, [0, V.over, 0]), p2 = add(add(x.w2, mul(utat, V.fore[0])), [0, V.fore[1], 0]);
    return {a: between(x.A1, x.A2, k), w: bezier(x.w1, p1, p2, x.w2, k), S: formMellan(x.S1, x.S2, mjuk(Math.min(1, u(t) / 0.8)))}; };
  const H = [0, 1].map(i => Array.from({length: n}, (_, t) => handAt(i, t)));
  // armbågarna: mot det håll som går från vilans armbåge till ankarets, och ut över kanten där det behövs
  const pol = (i: number, t: number) => { const x = sidor[i], k = mjuk(u(t)); return unit(lerp(unit(sub(x.e1, x.sh)), unit(sub(x.e2, x.sh)), k)); };
  const behov = [0, 1].map(i => H[i].map((h, t) => { if (!kant) return 0; const x = sidor[i], line = unit(sub(h.w, x.sh)), e = (v: number) => arm(x.sh, h.w, turned(pol(i, t), line, v), doll).elbow;
    const tecken = dot(sub(e(0.05), e(0)), [x.ut, 0, 0]) >= 0 ? 1 : -1; for (let v = 0; v <= rad(110); v += rad(0.5)) if (underarmLuft(e(tecken * v), h.w, kant) >= kant.luft) return tecken * v; return tecken * rad(110); }));
  const TONA = 8, tonad = (v: number[]) => v.map((_, t) => { let b = 0; v.forEach((x, j) => { const y = x * smooth(1 - Math.abs(t - j) / (TONA + 1)); if (Math.abs(y) > Math.abs(b)) b = y; }); return b; });
  const extra = behov.map(tonad);
  const frames: {card: Kort & {id?: number}; L: Limb; R: Limb; h: Vec3; g: Vec3}[] = [];
  for (let t = 0; t < n; t++) {
    if (t <= V.stillaFore) { frames.push(JSON.parse(JSON.stringify({...a1, card: f2.card}))); continue; }
    if (t >= sista) { frames.push(JSON.parse(JSON.stringify(f2))); continue; }
    const limb = (i: number): Limb => { const x = sidor[i], h = H[i][t], e = arm(x.sh, h.w, turned(pol(i, t), unit(sub(h.w, x.sh)), extra[i][t]), doll).elbow;
      return {s: x.sh, e: r4(e), w: r4(h.w), k: f2[x.s].k, p: punkter(h).map(r4)}; };
    const k = mjuk(u(t));
    frames.push({card: f2.card, R: limb(0), L: limb(1), h: r4(lerp(a1.h, f2.h, k)), g: r4(lerp(a1.g, f2.g, k))});
  }
  return {fps: FPS, frameCount: n, leavesShoe: n, edge: [n, n], folds: n, rests: n, hip: a23.hip, doll: doll.name, to: ['A2.3'], frames,
    times: {borjar: V.stillaFore, framme: sista}, armbagenUtGrader: extra.map(v => grad(Math.max(...v.map(Math.abs))))};
}
