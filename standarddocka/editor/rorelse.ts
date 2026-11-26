// Rörelsen i editorn: sparade rörelser efter varandra (följden), skarven mellan dem utjämnad, och Jakobs ändringar
// ovanpå. Rent: ingen three.js och ingen I/O, så att sidan och ett verktyg räknar likadant.
//
// Formatet är dockans (blackjack-dealer/dealer3d/data/*.json, läst av dealer3d/src/stage.ts): lägen i meter i dockans
// linsvärld (y upp, filten på y = 0, kameran mot -z), per ruta `L`/`R` (`s` axel, `e` armbåge, `w` handled, `p` handens
// 21 punkter i MediaPipes ordning), `h` huvudet, `g` blicken och `card` (`c` mitt, `l` långsida, `n` normal). R är
// dealerns högra sida, L hans vänstra.
import {brott, hallInom, type Granser, type Slag, type Stopp} from './kropp.ts';

export type V3 = [number, number, number];
/** En vridning som kvaternion: x, y, z, w. */
export type Q = [number, number, number, number];
export type Limb = {s: number[]; e: number[]; w: number[]; k: number; p: number[][]};
export type Card = {c: number[]; l: number[]; n: number[]; id?: number};
export type Frame = {card: Card; L: Limb; R: Limb; h: number[]; g: number[]};
/** En sparad rörelse som den ligger i dealer3d/data (bara det editorn läser). */
export type Motion = {fps: number; frameCount: number; hip: number[]; frames: Frame[]; leavesShoe: number; edge: number[]; folds: number; rests: number; doll?: string; film?: string};

/** Lederna en ändring kan flytta. Höger och vänster är dealerns egna. */
export type Led = 'hogerHand' | 'vansterHand' | 'hogerArmbage' | 'vansterArmbage' | 'blick';
export const LEDER: Led[] = ['hogerHand', 'vansterHand', 'hogerArmbage', 'vansterArmbage', 'blick'];
export const LEDNAMN: Record<Led, string> = {hogerHand: 'Höger hand', vansterHand: 'Vänster hand', hogerArmbage: 'Höger armbåge', vansterArmbage: 'Vänster armbåge', blick: 'Blicken'};
/**
 * En ändring: leden förskjuts `flytt` meter (och en hand vrids `vrid` kring handleden) mot grundrörelsen vid tiden `tid`
 * (sekunder), helt just då och mjukt in och ut `varar` sekunder åt varje håll.
 */
export type Andring = {id: string; tid: number; led: Led; flytt: V3; vrid: Q | null; varar: number};
/**
 * Det som sparas: vilka grundrörelser i vilken ordning, ändringarna och farten per del (`fart`: 1 är grundrörelsens,
 * 1,5 en och en halv gång så fort; saknas den är allt 1). Grundrörelserna ändras aldrig. En ändrings `tid` står i
 * grundrörelsens tid, så att den sitter kvar i samma ögonblick av rörelsen när farten ändras.
 */
export type Sparad = {namn: string; om?: string; grund: string[]; andringar: Andring[]; fart?: number[]; liv?: Liv; sparad?: string; blickMot?: 'film' | 'lag' | 'spel'};

/**
 * De små egna rörelserna (Jakob 2026-11-26: "5 autonoma mikrorörelser med den andra handen, eller huvudet och/eller små
 * rörelser med kroppen … som man också kan randomisera"): han andas, huvudet rör sig lätt, blicken går kort mot en
 * spelare, ett finger på en hand som vilar lyfter, och kroppen väger över. `fro` är slumpens frö (samma frö ger samma
 * rörelser), `delar` vilka som är på. De tonar ut helt i varje dels början och slut, så att klippen möts i ankaren.
 */
export type Livsdel = 'andning' | 'huvud' | 'blick' | 'hand' | 'kropp';
export const LIVSDELAR: Livsdel[] = ['andning', 'huvud', 'blick', 'hand', 'kropp'];
export type Liv = {fro: number; delar: Livsdel[]};

/** Grundrörelserna (blackjack-dealer/dealer3d/data): från vilan till skon, och Paows giv från skon (A2.3) till kort 1 på var och en av de sju platserna och tillbaka. */
export const TILL_SKON = 'till-ankare-2-3-c';
export const GIVAR: Record<number, string> = {1: 'giv-fran-2-3-p1c1-naturlig-cykel-a-paow', 2: 'giv-fran-2-3-p2c1-naturlig-cykel-a-paow', 3: 'giv-fran-2-3-p3c1-naturlig-cykel-a-paow', 4: 'giv-fran-2-3-p4c1-naturlig-cykel-a-paow',
  5: 'giv-fran-2-3-p5c1-naturlig-cykel-b-paow', 6: 'giv-fran-2-3-p6c1-bestalld-a-paow', 7: 'giv-fran-2-3-p7c1-bestalld-a-paow'};

/** Förvalet för hur länge en ny ändring tonas in och ut, åt varje håll (Jakob 2026-11-26 via claude-dockan: 0,4 s). */
export const VARAR = 0.4;

// ---- små räknesätt -------------------------------------------------------------------------------------------
const add = (a: number[], b: number[]): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: number[], b: number[]): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: number[], k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const mix = (a: readonly number[], b: readonly number[], k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const norm = (a: number[]): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: number[], b: number[]): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const smooth = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
/** Kvaternionens vridning av en vektor. */
export function qrot(q: Q, v: number[]): V3 {
  const [x, y, z, w] = q, u: V3 = [x, y, z], t = mul(cross(u, v), 2);
  return add(add(v, mul(t, w)), cross(u, t));
}
/** Vridningen `q` till andelen `k` (0: ingen, 1: hela), den kortaste vägen. */
export function qdel(q: Q, k: number): Q {
  let [x, y, z, w] = q; if (w < 0) { x = -x; y = -y; z = -z; w = -w; }
  const half = Math.acos(Math.min(1, w)), s = Math.sin(half);
  if (s < 1e-9) return [0, 0, 0, 1];
  const f = Math.sin(half * k) / s; return [x * f, y * f, z * f, Math.cos(half * k)];
}
const kopia = (f: Frame): Frame => JSON.parse(JSON.stringify(f));

/** Hur mycket av en ändring som gäller vid tiden t: 1 vid dess tid, mjukt ned till 0 `varar` sekunder därifrån. */
export const vikt = (a: Andring, t: number) => smooth(1 - Math.abs(t - a.tid) / Math.max(1e-3, a.varar));

// ---- följden --------------------------------------------------------------------------------------------------
/** Vad skarven mellan två delar flyttade, i meter: före och efter att den första delens bål lades i den andras. */
export type Skarv = {fore: Record<string, number>; efter: Record<string, number>; jamnasUt: [number, number]};
export type Del = {namn: string; fran: number; till: number};
/** När blicken följer kortet (sekunder): börjar vända från kameran vid `fran`, följer helt från `full` tills kortet ligger (`ligger`), och är tillbaka mot kameran `ut` sekunder senare. */
export type BlickTider = {fran: number; full: number; ligger: number; ut: number};
/**
 * `plats`: kortplatsen (1–7) som given går till. `stilla`: hur stilla var hand ligger i varje ruta (1: handleden rör sig
 * inte). `delar` är grundrörelsens delar med stillheten i ankaret; `spann` är den tid i varje del då något rör sig.
 */
export type Foljd = {fps: number; frames: Frame[]; hip: V3; delar: Del[]; spann: Del[]; skarv: Skarv; held: {R: number; L: number}[]; stilla: {R: number; L: number}[]; blick: BlickTider; forsta: Motion; andra: Motion; forskjutning: number; plats: number};

/** Hur långt varje led hoppar mellan två rutor, i meter (för skarven). */
function hopp(a: Frame, b: Frame, hipA: number[], hipB: number[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const s of ['R', 'L'] as const) { r[`${s}.axel`] = dist(a[s].s, b[s].s); r[`${s}.armbage`] = dist(a[s].e, b[s].e); r[`${s}.handled`] = dist(a[s].w, b[s].w); r[`${s}.handpunkt`] = Math.max(...a[s].p.map((p, i) => dist(p, b[s].p[i]))); }
  r.huvud = dist(a.h, b.h); r.blick = dist(a.g, b.g); r.kort = dist(a.card.c, b.card.c); r.hoft = dist(hipA, hipB);
  for (const k of Object.keys(r)) r[k] = Math.round(r[k] * 1000) / 1000;
  return r;
}

/**
 * Två rörelser efter varandra: från vilan till skon (gjord för den vita standarddockan, med axlarna 0,18 m bakom spelets
 * kant) och given till kortplatsen `plats` (Paows, med axlarna 0,38 m bakom kanten och höften lägre). Den första delens bål (höft, axlar och
 * huvud, som står still i den) läggs därför i den andras, armbågarna halva vägen med axlarna, och kortet står i skon där
 * den andra delen har det (den första stod med en äldre sko, 3 cm därifrån). Det som då återstår av hoppet (händerna och
 * armbågarna) jämnas ut medan händerna rör sig i den första delen, så att han kommer fram till skon precis som den andra
 * delen börjar. Den första delens sista ruta är då den andras första och tas bort.
 */
export function sattIhop(forsta: Motion, andra: Motion, plats: number): Foljd {
  if (forsta.fps !== andra.fps) throw Error('Delarna har olika antal rutor per sekund.');
  const b0 = andra.frames[0], sista = forsta.frames.length - 1, fore = hopp(forsta.frames[sista], b0, forsta.hip, andra.hip);
  const lagd = forsta.frames.map(f => {
    const limb = (s: 'R' | 'L'): Limb => { const d = sub(b0[s].s, f[s].s); return {s: [...b0[s].s], e: add(f[s].e, mul(d, 0.5)), w: [...f[s].w], k: f[s].k, p: f[s].p.map(p => [...p])}; };
    return {card: JSON.parse(JSON.stringify(b0.card)), R: limb('R'), L: limb('L'), h: [...b0.h], g: [...f.g]} as Frame;
  });
  // Var händerna rör sig i den första delen: där jämnas resten ut. Rör de sig inte, de sista 0,4 s.
  const rör = (i: number) => Math.max(dist(lagd[i].R.w, lagd[i + 1].R.w), dist(lagd[i].L.w, lagd[i + 1].L.w)) > 0.001;
  let fran = -1, till = -1; for (let i = 0; i < sista; i++) if (rör(i)) { if (fran < 0) fran = i; till = i + 1; }
  if (fran < 0) { till = sista; fran = Math.max(0, sista - Math.round(0.4 * forsta.fps)); }
  const rest = lagd[sista], skillnad = (a: number[], b: number[]) => sub(b, a);
  lagd.forEach((f, i) => {
    const k = smooth((i - fran) / Math.max(1, till - fran)); if (k <= 0) return;
    for (const s of ['R', 'L'] as const) { f[s].e = add(f[s].e, mul(skillnad(rest[s].e, b0[s].e), k)); f[s].w = add(f[s].w, mul(skillnad(rest[s].w, b0[s].w), k)); f[s].p = f[s].p.map((p, j) => add(p, mul(skillnad(rest[s].p[j], b0[s].p[j]), k))); }
    f.g = add(f.g, mul(skillnad(rest.g, b0.g), k));
  });
  const efter = hopp(lagd[sista], b0, andra.hip, andra.hip);
  const frames = [...lagd.slice(0, sista), ...andra.frames.map(kopia)], fps = forsta.fps, skon = sista / fps, ligger = sista + andra.rests;
  // Vilken hand som håller kortet i varje ruta: den vars fingrar (tummen och fingertopparna, och fingrarnas leder) är
  // närmast kortets mitt, helt inom 5,5 cm och inte alls bortom 8 cm; delas mellan händerna när båda håller (när det
  // lämnas över). När kortet har lagts håller ingen det.
  const FINGRAR = [2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 20];
  const held = frames.map((f, i) => { if (i >= ligger) return {R: 0, L: 0}; const near = (l: Limb) => Math.min(...FINGRAR.map(j => dist(l.p[j], f.card.c))), h = (d: number) => smooth((0.08 - d) / 0.025);
    let R = h(near(f.R)), L = h(near(f.L)); const sum = R + L; if (sum > 1) { R /= sum; L /= sum; } return {R, L}; });
  const lamnar = (sista + andra.leavesShoe) / fps;
  // Var en hand ligger stilla: handleden rör sig mindre än 1,5 mm per ruta i de sju rutorna omkring.
  const steg = (i: number, s: 'R' | 'L') => dist(frames[i][s].w, frames[i - 1][s].w);
  const stilla = frames.map((_, i) => { const lugn = (s: 'R' | 'L') => { let mest = 0; for (let j = Math.max(1, i - 3); j <= Math.min(frames.length - 1, i + 3); j++) mest = Math.max(mest, steg(j, s)); return smooth(1 - mest / 0.0015); }; return {R: lugn('R'), L: lugn('L')}; });
  const delar: Del[] = [{namn: 'Vilan till skon', fran: 0, till: skon}, {namn: `Kortet till plats ${plats}`, fran: skon, till: ligger / fps}, {namn: 'Tillbaka', fran: ligger / fps, till: (frames.length - 1) / fps}];
  // Var i varje del något rör sig: från första till sista rutan där en handled, en fingertopp eller kortet flyttar sig
  // mer än 1 mm, med en rutas marginal. Det som står stilla före och efter hör till ankaret och räknas inte in i delens
  // tid. (Fingertopparna räknas med, så att ett finger som lyfter från kortet efter att handleden har stannat inte
  // klipps bort.)
  const TOPPAR = [4, 8, 12, 16, 20];
  const flyttar = (i: number) => Math.max(steg(i, 'R'), steg(i, 'L'), dist(frames[i].card.c, frames[i - 1].card.c),
    ...TOPPAR.flatMap(j => [dist(frames[i].R.p[j], frames[i - 1].R.p[j]), dist(frames[i].L.p[j], frames[i - 1].L.p[j])])) > 0.001;
  const spann = delar.map(d => { const a = Math.round(d.fran * fps), b = Math.round(d.till * fps); let forst = -1, sist = -1;
    for (let i = a + 1; i <= b; i++) if (flyttar(i)) { if (forst < 0) forst = i - 1; sist = i; }
    return forst < 0 ? {...d} : {namn: d.namn, fran: Math.max(a, forst - 1) / fps, till: Math.min(b, sist + 1) / fps}; });
  return {fps, frames, hip: [andra.hip[0], andra.hip[1], andra.hip[2]], held, stilla, forsta, andra, forskjutning: sista, plats, delar, spann,
    blick: {fran: lamnar - 0.4, full: lamnar, ligger: ligger / fps, ut: 0.6},
    skarv: {fore, efter, jamnasUt: [fran / fps, till / fps]}};
}
export const langd = (f: Foljd) => (f.frames.length - 1) / f.fps;

// ---- takten ----------------------------------------------------------------------------------------------------
/** Hur mycket fortare eller långsammare än grundrörelsen en del får gå. */
export const FART = {minst: 0.25, mest: 4};
/**
 * Delarna som de blir i den färdiga filmen, och omräkningen mellan filmens tid (`ut`) och grundrörelsens (`grund`).
 * `spann` är den del av grundrörelsen som varje del spelar; `forval` säger om farten är förvalet och inte hans eget val.
 */
export type Takt = {fart: number[]; delar: Del[]; spann: Del[]; langd: number; forval: boolean; grund(t: number): number; ut(grundtid: number): number};
/**
 * Jakobs takt (standarddocka/AGENTS.md, 2026-11-26): från vilan till skon cirka 1 s, kortet ut högst 1 s, handen
 * tillbaka cirka 0,6 s. Sekunder per del, för rörelsen själv: stillheten i ankaret räknas inte in.
 */
export const STANDARDTAKT = [1.0, 1.0, 0.6];
const inom = (k: number) => Math.max(FART.minst, Math.min(FART.mest, k));
/**
 * Takten (Jakob 2026-11-26: "Kan jag snabba upp eller korta av en rörelse?"): varje del av följden går med sin egen
 * fart, jämnt genom hela delen. Delarna börjar och slutar i ett ankare, där händerna står stilla, så bytet av fart
 * syns inte. Allt annat (ändringarna, blicken, vem som håller kortet) räknas i grundrörelsens tid. `spann` är vad av
 * grundrörelsen som spelas i varje del: hela delen, eller bara tiden då något rör sig.
 */
export function takt(f: Foljd, fart: readonly number[] = [], spann: readonly Del[] = f.delar, forval = false): Takt {
  const k = spann.map((_, i) => inom(Number(fart[i]) || 1)), delar: Del[] = []; let t = 0;
  spann.forEach((d, i) => { const l = (d.till - d.fran) / k[i]; delar.push({namn: d.namn, fran: t, till: t + l}); t += l; });
  const del = (lista: readonly Del[], x: number) => { const i = lista.findIndex(d => x < d.till); return i < 0 ? lista.length - 1 : i; };
  const mellan = (x: number, d: Del) => Math.max(d.fran, Math.min(d.till, x));
  return {fart: k, delar, spann: [...spann], langd: t, forval,
    grund: x => { const i = del(delar, x); return mellan(spann[i].fran + (x - delar[i].fran) * k[i], spann[i]); },
    ut: x => { const i = del(spann, x); return mellan(delar[i].fran + (x - spann[i].fran) / k[i], delar[i]); }};
}
/**
 * Takten som gäller för en följd. Står en fart sparad är den hans eget val och gäller, vilka tal den än har. Annars
 * förvalet: bara tiden då något rör sig, i Jakobs takt. En grundrörelse på prov spelas som den är, med stillheten kvar,
 * så att den som gör om den ser och mäter just den.
 */
export function taktFor(f: Foljd, sparadFart: readonly number[] | undefined, prov = false): Takt {
  const eget = !!sparadFart?.length;
  if (prov) return takt(f, eget ? sparadFart : [], f.delar, !eget);
  if (eget) return takt(f, sparadFart, f.spann);
  return takt(f, f.spann.map((d, i) => STANDARDTAKT[i] ? inom((d.till - d.fran) / STANDARDTAKT[i]) : 1), f.spann, true);
}

/** Grundrörelsen vid tiden t, mellan två rutor (som dealer3d/src/stage.ts setTime), och hur mycket var hand håller kortet. */
export function rutaVid(f: Foljd, t: number): {frame: Frame; held: {R: number; L: number}; stilla: {R: number; L: number}} {
  const at = Math.max(0, Math.min(f.frames.length - 1, t * f.fps)), i = Math.min(f.frames.length - 2, Math.floor(at)), k = at - i, a = f.frames[i], b = f.frames[i + 1];
  const limb = (s: 'R' | 'L'): Limb => ({s: mix(a[s].s, b[s].s, k), e: mix(a[s].e, b[s].e, k), w: mix(a[s].w, b[s].w, k), k: a[s].k, p: a[s].p.map((p, j) => mix(p, b[s].p[j], k))});
  // Ett kort och samma kort med ändarna bytta är ett: långsidan tas åt samma håll i båda rutorna innan de blandas.
  const bl = dot(a.card.l, b.card.l) < 0 ? mul(b.card.l, -1) : b.card.l, long = norm(mix(a.card.l, bl, k)), toward = mix(a.card.n, b.card.n, k), d = dot(toward, long);
  const card: Card = {c: mix(a.card.c, b.card.c, k), l: long, n: norm(sub(toward, mul(long, d)))};
  const hi = f.held[i], hj = f.held[i + 1], si = f.stilla[i], sj = f.stilla[i + 1];
  return {frame: {card, R: limb('R'), L: limb('L'), h: mix(a.h, b.h, k), g: mix(a.g, b.g, k)}, held: {R: hi.R + (hj.R - hi.R) * k, L: hi.L + (hj.L - hi.L) * k},
    stilla: {R: si.R + (sj.R - si.R) * k, L: si.L + (sj.L - si.L) * k}};
}

/** Ändringarna lagda på en ruta vid tiden t. Kortet följer en hand som håller det. Rutan ändras på plats och lämnas tillbaka. */
export function medAndringar(frame: Frame, held: {R: number; L: number}, t: number, andringar: readonly Andring[]): Frame {
  for (const a of andringar) {
    const w = vikt(a, t); if (w <= 0) continue;
    if (a.led === 'blick') { frame.g = add(frame.g, mul(a.flytt, w)); continue; }
    const s = a.led === 'hogerHand' || a.led === 'hogerArmbage' ? 'R' : 'L', limb = frame[s];
    if (a.led === 'hogerArmbage' || a.led === 'vansterArmbage') { limb.e = add(limb.e, mul(a.flytt, w)); continue; }
    // En hand: handleden flyttas, handens punkter följer den och vrids kring den; armbågen går halva vägen med, så att
    // armen böjs åt samma håll som förut.
    const pivot = [...limb.w], move = (k: number) => { const q = a.vrid ? qdel(a.vrid, k) : null, d = mul(a.flytt, k); return (p: number[]) => add(add(pivot, d), q ? qrot(q, sub(p, pivot)) : sub(p, pivot)); };
    const hand = move(w); limb.w = add(pivot, mul(a.flytt, w)); limb.p = limb.p.map(hand); limb.e = add(limb.e, mul(a.flytt, w * 0.5));
    const h = held[s]; if (h > 0) { const kort = move(w * h), q = a.vrid ? qdel(a.vrid, w * h) : null; frame.card.c = kort(frame.card.c); if (q) { frame.card.l = qrot(q, frame.card.l); frame.card.n = qrot(q, frame.card.n); } }
  }
  return frame;
}
/**
 * Hur mycket blicken följer rörelsens egen blick (kortet) vid tiden t: 0 i vilan och vid skon, upp till 1 medan kortet
 * lämnar skon, 1 tills det ligger, och sedan tillbaka till 0 (Jakobs regel: blicken mot kameran; medan kortet är på väg
 * följer han det).
 */
export function foljerKortet(b: BlickTider, t: number): number {
  if (t < b.full) return smooth((t - b.fran) / Math.max(1e-3, b.full - b.fran));
  return t <= b.ligger ? 1 : 1 - smooth((t - b.ligger) / b.ut);
}
/**
 * Ställningen vid tiden t: grundrörelsen, blicken mot kameran `kamera` (ett läge i världen) utom när han följer kortet,
 * och ändringarna ovanpå. Utan kamera är blicken rörelsens egen. Med `granser` (kroppens mått och bordet) hålls det
 * ändringarna gör inom kroppen, bordet och lederna (kropp.ts); grundrörelsen själv rörs aldrig.
 */
export function stallning(f: Foljd, t: number, andringar: readonly Andring[], kamera: readonly number[] | null = null, liv?: Liv, granser?: Granser): Frame {
  return stallningOchStopp(f, t, andringar, kamera, liv, granser).frame;
}
/** Vilken arm en led hör till. */
const ARM: Record<Led, 'R' | 'L' | null> = {hogerHand: 'R', hogerArmbage: 'R', vansterHand: 'L', vansterArmbage: 'L', blick: null};
/**
 * Som `stallning`, och vad spärren höll emot. Den verkar bara på en arm som en ändring rör vid tiden t, och jämför med
 * samma ställning utan ändringar: där ingen ändring verkar på en arm är rutan exakt som utan spärren.
 */
export function stallningOchStopp(f: Foljd, t: number, andringar: readonly Andring[], kamera: readonly number[] | null = null, liv?: Liv, granser?: Granser): {frame: Frame; stopp: Stopp[]} {
  const {frame, held, stilla} = rutaVid(f, t);
  if (kamera) frame.g = mix(kamera, frame.g, foljerKortet(f.blick, t));
  const sidor = granser ? [...new Set(andringar.filter(a => ARM[a.led] && vikt(a, t) > 0).map(a => ARM[a.led]!))] : [];
  const utan = sidor.length ? medLiv(kopia(frame), t, f, liv, held, stilla) : null, med = medLiv(medAndringar(frame, held, t, andringar), t, f, liv, held, stilla);
  return utan && granser ? hallInom(utan, med, held, f.hip, granser, sidor) : {frame: med, stopp: []};
}
/** Vridningen som för en hand (21 punkter) till en annan, kring handleden: ur handens egna axlar (mot långfingrets knoge och tvärs knogarna) i båda. */
function handvridning(fran: number[][], till: number[][]): Q {
  const axlar = (p: number[][]) => { const f = norm(sub(p[9], p[0])), t = sub(p[5], p[17]), s = norm(sub(t, mul(f, dot(t, f)))); return [f, s, cross(f, s)]; };
  const A = axlar(fran), B = axlar(till), R = [0, 1, 2].map(i => [0, 1, 2].map(j => B[0][i] * A[0][j] + B[1][i] * A[1][j] + B[2][i] * A[2][j]));
  const sp = R[0][0] + R[1][1] + R[2][2];
  if (sp > 0) { const S = Math.sqrt(sp + 1) * 2; return [(R[2][1] - R[1][2]) / S, (R[0][2] - R[2][0]) / S, (R[1][0] - R[0][1]) / S, S / 4]; }
  if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) { const S = Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]) * 2; return [S / 4, (R[0][1] + R[1][0]) / S, (R[0][2] + R[2][0]) / S, (R[2][1] - R[1][2]) / S]; }
  if (R[1][1] > R[2][2]) { const S = Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]) * 2; return [(R[0][1] + R[1][0]) / S, S / 4, (R[1][2] + R[2][1]) / S, (R[0][2] - R[2][0]) / S]; }
  const S = Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]) * 2; return [(R[0][2] + R[2][0]) / S, (R[1][2] + R[2][1]) / S, S / 4, (R[1][0] - R[0][1]) / S];
}
/**
 * Det en ändring faktiskt gjorde där spärren höll emot vid dess tid: läget med den (spärrat) minus läget utan den, och
 * för en hand som spärren vred tillbaka också vridningen. Skrivs in i ändringen när han släpper, så att nästa drag börjar
 * där armen står. null när inget hölls emot på den armen; då står ändringen som den är.
 */
export function somDenBlev(f: Foljd, a: Andring, andringar: readonly Andring[], kamera: readonly number[] | null, liv: Liv | undefined, granser: Granser): {flytt: V3; vrid: Q | null} | null {
  const s = ARM[a.led]; if (!s) return null;
  const med = stallningOchStopp(f, a.tid, andringar, kamera, liv, granser), egna = med.stopp.filter(x => ARM[x.led] === s); if (!egna.length) return null;
  const utan = stallning(f, a.tid, andringar.filter(x => x !== a), kamera, liv, granser)[s], ny = med.frame[s], w = vikt(a, a.tid) || 1;
  if (a.led === 'hogerArmbage' || a.led === 'vansterArmbage') return {flytt: mul(sub(ny.e, utan.e), 1 / w), vrid: a.vrid};
  return {flytt: mul(sub(ny.w, utan.w), 1 / w), vrid: egna.some(x => x.orsak === 'handleden') ? handvridning(utan.p, ny.p) : a.vrid};
}
/**
 * Var grundrörelsen själv (utan ändringar) går utanför gränserna, per arm och slag (kropp.ts brott: millimeter eller
 * grader): i hur många rutor, värst hur mycket och i vilken ruta, och första och sista rutan. `tid` räknar en ruta om
 * till filmens tid. Rättar ingenting; till för den som ritar om grundrörelserna.
 */
export function grundensBrott(f: Foljd, granser: Granser, tid: (grundtid: number) => number = t => t) {
  type Fynd = {rutor: number; varst: number; ruta: number; tid: number; fran: number; till: number};
  const ut: Record<'R' | 'L', Partial<Record<Slag, Fynd>>> = {R: {}, L: {}}, sek = (i: number) => Math.round(tid(i / f.fps) * 100) / 100;
  f.frames.forEach((frame, i) => { const b = brott(frame, f.hip, granser); for (const s of ['R', 'L'] as const) for (const [slag, v] of Object.entries(b[s]) as [Slag, number][]) { if (!(v > 0)) continue;
    const x = ut[s][slag] ??= {rutor: 0, varst: 0, ruta: i, tid: 0, fran: i, till: i}; x.rutor++; x.till = i; if (v > x.varst) { x.varst = v; x.ruta = i; } } });
  for (const s of ['R', 'L'] as const) for (const x of Object.values(ut[s])) { x.tid = sek(x.ruta); x.fran = sek(x.fran); x.till = sek(x.till); }
  return {rutor: f.frames.length, enheter: 'millimeter, utom armbagen och handleden i grader; tid, fran och till i filmens sekunder', hoger: ut.R, vanster: ut.L};
}

// ---- de små egna rörelserna ------------------------------------------------------------------------------------
/** Slumptal ur ett frö, samma följd varje gång. */
const slump = (fro: number) => { let a = (Math.round(fro) >>> 0) || 1; return () => { a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; };
/** En mjuk vandring kring noll: tre långsamma svängningar med frekvens (Hz) och fas ur fröet, tillsammans högst 1. */
type Vag = [styrka: number, hz: number, fas: number][];
const vag = (v: Vag, t: number) => v.reduce((s, [a, hz, fas]) => s + a * Math.sin(2 * Math.PI * hz * t + fas), 0);
type Livsplan = {fas: number; kroppX: Vag; kroppZ: Vag; huvudX: Vag; huvudY: Vag; blickar: {t: number; dx: number; dy: number}[]; lyft: {t: number; finger: number}[]};
const planer = new Map<string, Livsplan>();
/** Vad fröet ger för den här följden: svängningarna, när blicken går åt sidan (meter vid blickpunkten) och när ett finger lyfter. */
function livsplan(f: Foljd, fro: number): Livsplan {
  const nyckel = `${fro}:${f.frames.length}`, finns = planer.get(nyckel); if (finns) return finns;
  const r = slump(fro), T = langd(f), mellan = (a: number, b: number) => a + (b - a) * r();
  const ny = (lagst: number, hogst: number): Vag => [[0.55, mellan(lagst, hogst), mellan(0, 6.28)], [0.3, mellan(lagst, hogst) * 1.7, mellan(0, 6.28)], [0.15, mellan(lagst, hogst) * 2.9, mellan(0, 6.28)]];
  const plan: Livsplan = {fas: mellan(0, 6.28), kroppX: ny(0.12, 0.3), kroppZ: ny(0.1, 0.25), huvudX: ny(0.15, 0.4), huvudY: ny(0.15, 0.4),
    blickar: Array.from({length: 1 + Math.round(r() * Math.max(1, T / 4))}, () => ({t: mellan(0.12, 0.88) * T, dx: (r() < 0.5 ? -1 : 1) * mellan(0.25, 0.5), dy: mellan(-0.05, 0.05)})),
    lyft: Array.from({length: 2 + Math.round(r() * Math.max(1, T / 3))}, () => ({t: mellan(0.08, 0.92) * T, finger: Math.floor(r() * 2)}))};
  planer.set(nyckel, plan); return plan;
}
/** Handens punkter för ett fingers tre yttre leder (MediaPipes ordning), pekfingret och långfingret, och hur mycket var och en lyfts. */
const LYFT = {punkter: [[6, 7, 8], [10, 11, 12]], andel: [0.35, 0.7, 1]};
/**
 * De små egna rörelserna lagda på en ruta vid tiden t (grundrörelsens tid). Måtten: axlarna 2,5 mm upp och ned när han
 * andas; bålen högst 6 mm åt sidan; blickpunkten högst 10 cm för huvudets lätta rörelse och 25–50 cm åt sidan för en
 * kort blick mot en spelare (inte medan han följer kortet); ett finger 7 mm upp på en hand som ligger stilla och inte
 * håller kortet. Allt gånger en kurva som är noll i delens början och slut.
 */
export function medLiv(frame: Frame, t: number, f: Foljd, liv: Liv | undefined, held: {R: number; L: number}, stilla: {R: number; L: number}): Frame {
  if (!liv?.delar.length) return frame;
  // Tonen är noll där rörelsen i en del börjar och slutar (och i stillheten omkring), ett mitt i den.
  const d = f.spann.find(x => t < x.till) ?? f.spann[f.spann.length - 1], u = Math.max(0, Math.min(1, (t - d.fran) / Math.max(1e-6, d.till - d.fran))), ton = Math.sin(Math.PI * u) ** 2;
  if (ton <= 0) return frame;
  const p = livsplan(f, liv.fro), har = (x: Livsdel) => liv.delar.includes(x), sidor = ['R', 'L'] as const;
  if (har('andning')) { const upp = 0.0025 * Math.sin(2 * Math.PI * 0.27 * t + p.fas) * ton; for (const s of sidor) frame[s].s = add(frame[s].s, [0, upp, 0]); frame.h = add(frame.h, [0, upp * 0.6, 0]); }
  if (har('kropp')) { const v: V3 = [0.006 * vag(p.kroppX, t) * ton, 0, 0.003 * vag(p.kroppZ, t) * ton]; for (const s of sidor) { frame[s].s = add(frame[s].s, v); frame[s].e = add(frame[s].e, mul(v, 0.5)); } frame.h = add(frame.h, v); }
  if (har('huvud')) frame.g = add(frame.g, [0.1 * vag(p.huvudX, t) * ton, 0.06 * vag(p.huvudY, t) * ton, 0]);
  if (har('blick')) { const fri = 1 - foljerKortet(f.blick, t); for (const b of p.blickar) { const w = smooth(1 - Math.abs(t - b.t) / 0.3) * ton * fri; if (w > 0) frame.g = add(frame.g, [b.dx * w, b.dy * w, 0]); } }
  if (har('hand')) for (const s of sidor) { const ledig = stilla[s] * (1 - Math.min(1, held[s] * 4)); if (ledig <= 0) continue;
    for (const l of p.lyft) { const w = smooth(1 - Math.abs(t - l.t) / 0.22) * ton * ledig; if (w > 0) LYFT.punkter[l.finger].forEach((j, n) => { frame[s].p[j] = add(frame[s].p[j], [0, 0.007 * w * LYFT.andel[n], 0]); }); } }
  return frame;
}

/**
 * Hela den ändrade rörelsen i grundrörelsernas format (dealer3d/data), ruta för ruta, så att den kan läggas in i de
 * andra mapparna. Givens ögonblick (kortet lämnar skon, vänds, ligger) räknas om till följdens rutor.
 */
export function rutor(f: Foljd, sparad: Sparad, kamera: readonly number[] | null, rattning: string, T: Takt = taktFor(f, sparad.fart), granser?: Granser) {
  const r4 = (a: number[]) => a.map(n => Math.round(n * 10000) / 10000), off = f.forskjutning, b = f.andra;
  // Rutorna tas i filmens takt; givens ögonblick (grundrörelsens rutor) räknas om till filmens rutor. Med `granser` är
  // ändringarna hållna inom kroppen, bordet och lederna, som i editorn.
  const antal = Math.round(T.langd * f.fps) + 1, ruta = (grundruta: number) => Math.round(T.ut(grundruta / f.fps) * f.fps);
  const frames = Array.from({length: antal}, (_, i) => { const x = stallning(f, T.grund(i / f.fps), sparad.andringar, kamera, sparad.liv, granser), limb = (l: Limb) => ({s: r4(l.s), e: r4(l.e), w: r4(l.w), k: l.k, p: l.p.map(r4)});
    return {card: {c: r4(x.card.c), l: r4(x.card.l), n: r4(x.card.n)}, L: limb(x.L), R: limb(x.R), h: r4(x.h), g: r4(x.g)}; });
  return {about: `${sparad.namn}: ${sparad.grund.join(' och sedan ')} efter varandra (skarven utjämnad i standarddocka/editor/rorelse.ts), ${rattning}, blicken mot kameran ${kamera ? r4([...kamera]).join(', ') : '(rörelsens egen)'} utom när kortet är på väg, farten per del ${T.fart.join(', ')} gånger grundrörelsens, och ${sparad.andringar.length} ändringar från editorn i standarddocka. Samma fält som dealer3d/data.`,
    film: `a1-a23-p${f.plats}c1`, pose: 'A1', to: `P${f.plats}.C1`, fps: f.fps, frameCount: frames.length, leavesShoe: ruta(off + b.leavesShoe), edge: b.edge.map(n => ruta(off + n)), folds: ruta(off + b.folds), rests: ruta(off + b.rests),
    hip: r4(f.hip), doll: b.doll, grund: sparad.grund, fart: T.fart, liv: sparad.liv ?? null, blickMot: sparad.blickMot ?? null, andringar: sparad.andringar.length, made: sparad.sparad, frames};
}
