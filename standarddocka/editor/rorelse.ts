// Rörelsen i editorn: sparade rörelser efter varandra (följden), skarven mellan dem utjämnad, och Jakobs ändringar
// ovanpå. Rent: ingen three.js och ingen I/O, så att sidan och ett verktyg räknar likadant.
//
// Formatet är dockans (blackjack-dealer/dealer3d/data/*.json, läst av dealer3d/src/stage.ts): lägen i meter i dockans
// linsvärld (y upp, filten på y = 0, kameran mot -z), per ruta `L`/`R` (`s` axel, `e` armbåge, `w` handled, `p` handens
// 21 punkter i MediaPipes ordning), `h` huvudet, `g` blicken och `card` (`c` mitt, `l` långsida, `n` normal). R är
// dealerns högra sida, L hans vänstra.

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
/** Det som sparas: vilka grundrörelser i vilken ordning, skarvens övertoning och ändringarna. Grundrörelserna ändras aldrig. */
export type Sparad = {namn: string; om?: string; grund: string[]; andringar: Andring[]; sparad?: string; blickMot?: 'film' | 'lag'};

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
/** `plats`: kortplatsen (1–7) som given går till. */
export type Foljd = {fps: number; frames: Frame[]; hip: V3; delar: Del[]; skarv: Skarv; held: {R: number; L: number}[]; blick: BlickTider; forsta: Motion; andra: Motion; forskjutning: number; plats: number};

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
  return {fps, frames, hip: [andra.hip[0], andra.hip[1], andra.hip[2]], held, forsta, andra, forskjutning: sista, plats,
    delar: [{namn: 'Vilan till skon', fran: 0, till: skon}, {namn: `Kortet till plats ${plats}`, fran: skon, till: ligger / fps}, {namn: 'Tillbaka', fran: ligger / fps, till: (frames.length - 1) / fps}],
    blick: {fran: lamnar - 0.4, full: lamnar, ligger: ligger / fps, ut: 0.6},
    skarv: {fore, efter, jamnasUt: [fran / fps, till / fps]}};
}
export const langd = (f: Foljd) => (f.frames.length - 1) / f.fps;

/** Grundrörelsen vid tiden t, mellan två rutor (som dealer3d/src/stage.ts setTime), och hur mycket var hand håller kortet. */
export function rutaVid(f: Foljd, t: number): {frame: Frame; held: {R: number; L: number}} {
  const at = Math.max(0, Math.min(f.frames.length - 1, t * f.fps)), i = Math.min(f.frames.length - 2, Math.floor(at)), k = at - i, a = f.frames[i], b = f.frames[i + 1];
  const limb = (s: 'R' | 'L'): Limb => ({s: mix(a[s].s, b[s].s, k), e: mix(a[s].e, b[s].e, k), w: mix(a[s].w, b[s].w, k), k: a[s].k, p: a[s].p.map((p, j) => mix(p, b[s].p[j], k))});
  // Ett kort och samma kort med ändarna bytta är ett: långsidan tas åt samma håll i båda rutorna innan de blandas.
  const bl = dot(a.card.l, b.card.l) < 0 ? mul(b.card.l, -1) : b.card.l, long = norm(mix(a.card.l, bl, k)), toward = mix(a.card.n, b.card.n, k), d = dot(toward, long);
  const card: Card = {c: mix(a.card.c, b.card.c, k), l: long, n: norm(sub(toward, mul(long, d)))};
  const hi = f.held[i], hj = f.held[i + 1];
  return {frame: {card, R: limb('R'), L: limb('L'), h: mix(a.h, b.h, k), g: mix(a.g, b.g, k)}, held: {R: hi.R + (hj.R - hi.R) * k, L: hi.L + (hj.L - hi.L) * k}};
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
 * och ändringarna ovanpå. Utan kamera är blicken rörelsens egen.
 */
export function stallning(f: Foljd, t: number, andringar: readonly Andring[], kamera: readonly number[] | null = null): Frame {
  const {frame, held} = rutaVid(f, t);
  if (kamera) frame.g = mix(kamera, frame.g, foljerKortet(f.blick, t));
  return medAndringar(frame, held, t, andringar);
}

/**
 * Hela den ändrade rörelsen i grundrörelsernas format (dealer3d/data), ruta för ruta, så att den kan läggas in i de
 * andra mapparna. Givens ögonblick (kortet lämnar skon, vänds, ligger) räknas om till följdens rutor.
 */
export function rutor(f: Foljd, sparad: Sparad, kamera: readonly number[] | null, rattning: string) {
  const r4 = (a: number[]) => a.map(n => Math.round(n * 10000) / 10000), off = f.forskjutning, b = f.andra;
  const frames = f.frames.map((_, i) => { const x = stallning(f, i / f.fps, sparad.andringar, kamera), limb = (l: Limb) => ({s: r4(l.s), e: r4(l.e), w: r4(l.w), k: l.k, p: l.p.map(r4)});
    return {card: {c: r4(x.card.c), l: r4(x.card.l), n: r4(x.card.n)}, L: limb(x.L), R: limb(x.R), h: r4(x.h), g: r4(x.g)}; });
  return {about: `${sparad.namn}: ${sparad.grund.join(' och sedan ')} efter varandra (skarven utjämnad i standarddocka/editor/rorelse.ts), ${rattning}, blicken mot kameran ${kamera ? r4([...kamera]).join(', ') : '(rörelsens egen)'} utom när kortet är på väg, och ${sparad.andringar.length} ändringar från editorn i standarddocka. Samma fält som dealer3d/data.`,
    film: `a1-a23-p${f.plats}c1`, pose: 'A1', to: `P${f.plats}.C1`, fps: f.fps, frameCount: frames.length, leavesShoe: off + b.leavesShoe, edge: b.edge.map(n => off + n), folds: off + b.folds, rests: off + b.rests,
    hip: r4(f.hip), doll: b.doll, grund: sparad.grund, blickMot: sparad.blickMot ?? null, andringar: sparad.andringar.length, made: sparad.sparad, frames};
}
