// Ett lyft ur livebordets film (live-bj/data/lyft/) lagt på en docka vid livebordet (Danilo eller Frasse, dealer3d/src/doll.ts
// LIVE_DOLLS) som en rörelse dockan kan spela, i dockans eget format (som dealer3d/data/giv-fran-2-3-p4c1-ren-a-man.json,
// med minen i fältet a) och i livebordets linsvärld (src/table-live.ts):
//   dealer3d/data/lyft-<docka>-p<plats>.json      en giv: kortet ur skon, handbytet, kortet på platsen, händerna hem
//   dealer3d/data/lyft-<docka>-vantan-<n>.json    en väntan: händerna i vilan, huvudet, blicken och minen lever
//   dealer3d/data/ankare-vila-<docka>.json        vilan som dockans alla rörelser börjar och slutar exakt i
//
//   node dealer3d/tools/lyft-till-docka.ts <lyftet.json> <docka>      (från blackjack-dealer/)
//   node dealer3d/tools/lyft-till-docka.ts --alla                     alla lyften i live-bj/data/lyft/, var och en på sin docka
//
// Den riktiga dealerns: TIDEN (lyftets rutor; när vänsterhanden är vid skon, när kortet lämnar skon, rutan där händerna är
// som närmast och kortet byter hand, när kortet ligger), axlarnas och huvudets rörelse i sidled och höjd, blicken,
// handledernas väg i sidled och höjd, händernas form där den håller (fingrarnas krökning och spretning på dockans ben,
// lederna inom hand-rule.ts LIMITS, fyllt från grannrutorna där handen saknas eller fingrarna går i varandra) och minen
// (bara ansiktsformerna som bär enligt live-bj/data/stil-<stil>.json; blinkningarna som korta toppar, eyeSquint dämpad).
// VÅRT EGET: dockans ben och mått (doll.ts), DJUPET (handen på filten i vilan, kortet i skons front när det tas
// (liveShoeCard), kortets plats när det läggs (LIVE.cards), och däremellan lyftets väg förskjuten mjukt dit, i takt med
// hur långt lyftets hand har gått i bilden), handens vinkel mellan greppen (mjukt från det ena till det andra: lyftets egen
// vinkel på handen är för brusig), bålens lutning när armen inte når (ren-giv.ts rackvidd och bal, som vår egen
// giv), armbågen (body.ts arm, mot en pol på samma sida om linjen axel–handled som lyftets), greppen om kortet (vänsterns
// fingertoppar på kortets rygg; högerns nyckelgrepp, koreo-giv.ts nyckelgrepp), KORTETS VÄNDNING (version A, koreo-giv.ts:
// vänstern reser kortet på högkant före bytet, högern rullar det framåt så att framsidan är uppe före halva vägen,
// standarddocka/DOMAR.md "Kortets vändning") och nedsättningen kring kortets fria långsida.
// BRUSET: lyftets spår jämnas med ett Butterworthfilter av andra ordningen, 6 Hz, kört framåt och bakåt (nollfas: topparna
// står kvar i tiden, de blir bara något lägre).
// Första och sista rutan är ankaret; lyftets början och slut tonas mot det. En väntan visar dockan i vilan med lyftets små
// rörelser (handlederna, axlarna), huvudet, blicken och minen; var lyftets händer låg står i filens about.
// Kontrollen är dealer3d/tools/lyft-kolla.ts.
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CARD, add, cross, dot, length, mul, sub, unit, type Vec3} from '../src/camera.ts';
import {TABLE_LENS} from '../../src/table-lens.ts';
import {LIVE, LIVE_CAMERA, liveShoeCard, liveSee} from '../../src/table-live.ts';
import {arm, turned} from '../src/body.ts';
import {LIVE_DOLLS, dollFrame, type Doll} from '../src/doll.ts';
import {axesOf, between, local, placed, type Axes} from '../src/hand-pose.ts';
import {FINGERS} from '../src/capture.ts';
import {LIMITS, bendsOf, fingerFrom, handFaults} from '../src/hand-rule.ts';
import {KOREO, nyckelgrepp} from '../src/koreo-giv.ts';
import {REN, bal, formMellan, medLeder, mjuk, rackvidd, smooth, underarmLuft, type Kant} from '../src/ren-giv.ts';
import {BALL} from '../src/landing.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url)), CASINO = path.join(ROOT, '..');
export const DATA = path.join(ROOT, 'dealer3d/data'), LYFT = path.join(CASINO, 'live-bj/data/lyft');

// ---- typerna --------------------------------------------------------------------------------------------------------
export type Kort = {c: Vec3; l: Vec3; n: Vec3};
type Hand = {a: Axes; w: Vec3; S: Vec3[]};
export type Limb = {s: Vec3; e: Vec3; w: Vec3; k: number; p: Vec3[]};
export type Frame = {card: Kort & {id: number}; R: Limb; L: Limb; h: Vec3; g: Vec3; a: Record<string, number>};
type LyftLimb = {s: Vec3; e: Vec3; w: Vec3; p: Vec3[] | null};
export type LyftRuta = {t: number; R: LyftLimb; L: LyftLimb; h: Vec3 | null; g: Vec3 | null; a: Record<string, number> | null; card?: {c: Vec3 | null; l: Vec3 | null; n: Vec3 | null; seen: boolean} | null};
export type Lyft = {style: 'kameran' | 'bordet'; docka: string; to?: string; kind?: string; left_at?: string; right_at?: string; film_seconds: number[]; fps: number; frameCount: number; leavesShoe?: number; rests?: number; hands?: string; frames: LyftRuta[]};
type Stil = {face: {shapes: Record<string, {verdict: string; usual: number}>}};
type Sida = 'R' | 'L';

// ---- småsaker -------------------------------------------------------------------------------------------------------
const FPS = 30, UP: Vec3 = [0, 1, 0], HK = CARD.height, WK = CARD.width, T = CARD.thickness, CAM_H = LIVE_CAMERA.height;
const SIDOR: [Sida, number][] = [['R', 1], ['L', -1]];
const r4 = (v: Vec3): Vec3 => v.map(x => Math.round(x * 10000) / 10000) as Vec3;
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, mul(sub(b, a), t));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const rad = (d: number) => d * Math.PI / 180, grad = (r: number) => r * 180 / Math.PI;
const flat = (v: Vec3): Vec3 => unit([v[0], 0, v[2]]);
const mitt = (a: Vec3, b: Vec3): Vec3 => mul(add(a, b), 0.5);
const vinkel = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b)))));
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const medianV = (v: Vec3[]): Vec3 => [0, 1, 2].map(k => median(v.map(p => p[k]))) as Vec3;
const punkter = (h: Hand) => placed(h.S, h.a, h.w);
const toppMitt = (h: Hand) => { const p = punkter(h); return mitt(p[8], p[12]); };
const kring = (v: Vec3, o: Vec3, ax: Vec3, x: number) => add(o, turned(sub(v, o), ax, x));
const vridKort = (k: Kort, o: Vec3, ax: Vec3, x: number): Kort => ({c: kring(k.c, o, ax, x), l: turned(k.l, ax, x), n: turned(k.n, ax, x)});
const vridAxlar = (A: Axes, ax: Vec3, x: number): Axes => ({forward: turned(A.forward, ax, x), palm: turned(A.palm, ax, x), across: turned(A.across, ax, x)});
const vridHand = (h: Hand, o: Vec3, ax: Vec3, x: number): Hand => ({a: vridAxlar(h.a, ax, x), w: kring(h.w, o, ax, x), S: h.S});
const flyttHand = (h: Hand, d: Vec3): Hand => ({...h, w: add(h.w, d)});
const flyttKort = (k: Kort, d: Vec3): Kort => ({...k, c: add(k.c, d)});
/** Handen med punkten mitt emellan pek- och långfingrets toppar på `P`. */
const medToppar = (a: Axes, S: Vec3[], P: Vec3): Hand => { const q = mitt(S[8], S[12]); return {a, w: sub(P, add(add(mul(a.forward, q[0]), mul(a.palm, q[1])), mul(a.across, q[2]))), S}; };
/** En punkt längs lyftets synlinje (kameran står över origo) flyttad till djupet z: samma bildpunkt. */
const tillDjup = (p: Vec3, z: number): Vec3 => { const k = z / p[2]; return [p[0] * k, CAM_H + (p[1] - CAM_H) * k, z]; };
const kortHorn = (k: Kort): Vec3[] => { const a = cross(k.n, k.l); return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([u, v]) => add(add(k.c, mul(k.l, u * HK / 2)), mul(a, v * WK / 2))); };
const kortLagst = (k: Kort) => Math.min(...kortHorn(k).map(p => p[1])) - T / 2;
const sha = (fil: string) => createHash('sha256').update(readFileSync(fil)).digest('hex').slice(0, 12);

// ---- jämningen --------------------------------------------------------------------------------------------------------
/** Butterworth av andra ordningen, `fc` Hz vid 30 rutor/s, framåt och bakåt (nollfas), med udda spegling i ändarna. */
export function lagpass(x: number[], fc = 6, fs = FPS): number[] {
  const n = x.length; if (n < 4) return x.slice();
  const K = Math.tan(Math.PI * fc / fs), q = Math.SQRT2, nrm = 1 / (1 + q * K + K * K), b0 = K * K * nrm, b1 = 2 * b0, b2 = b0, a1 = 2 * (K * K - 1) * nrm, a2 = (1 - q * K + K * K) * nrm;
  const pad = Math.min(n - 1, 15), ext = [...Array.from({length: pad}, (_, i) => 2 * x[0] - x[pad - i]), ...x, ...Array.from({length: pad}, (_, i) => 2 * x[n - 1] - x[n - 2 - i])];
  const kor = (v: number[]) => { const y: number[] = []; let x1 = v[0], x2 = v[0], y1 = v[0], y2 = v[0]; for (const xi of v) { const y0 = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = xi; y2 = y1; y1 = y0; y.push(y0); } return y; };
  return kor(kor(ext).reverse()).reverse().slice(pad, pad + n);
}
export const jamna = (v: Vec3[], fc = 6): Vec3[] => { const k = [0, 1, 2].map(i => lagpass(v.map(p => p[i]), fc)); return v.map((_, t) => [k[0][t], k[1][t], k[2][t]] as Vec3); };
/** Luckorna (null) fyllda mellan närmaste kända rutor; före den första och efter den sista som den. */
export function fyll<X>(v: (X | null | undefined)[], blanda: (a: X, b: X, t: number) => X): X[] {
  const ok = v.flatMap((x, i) => x == null ? [] : [i]); if (!ok.length) throw Error('lyftet saknar det helt');
  return v.map((x, i) => { if (x != null) return x; const fore = ok.filter(j => j < i).at(-1), efter = ok.find(j => j > i);
    if (fore === undefined) return v[efter!]!; if (efter === undefined) return v[fore]!; return blanda(v[fore]!, v[efter]!, (i - fore) / (efter - fore)); });
}

// ---- handens form ur lyftet ---------------------------------------------------------------------------------------------
/**
 * Lyftets handform (`q`, i handens egna axlar) lagd på dockans hand `bas`: dockans handflata (handleden, tummens rot och
 * knogarna), varje fingerben pekande som lyftets med dockans längd, och fingrarnas leder hållna inom LIMITS (en grad till godo).
 */
export function paDockan(q: Vec3[], bas: Vec3[]): Vec3[] {
  const S = bas.map(v => [...v] as Vec3);
  for (const c of FINGERS) for (let j = 1; j < 4; j++) S[c[j]] = add(S[c[j - 1]], mul(unit(sub(q[c[j]], q[c[j - 1]])), length(sub(bas[c[j]], bas[c[j - 1]]))));
  const b = bendsOf(S), J = [LIMITS.mcp, LIMITS.pip, LIMITS.dip];
  for (let f = 1; f <= 4; f++) { const c = FINGERS[f], x = b[f - 1], lens = [1, 2, 3].map(j => length(sub(bas[c[j]], bas[c[j - 1]])));
    const flex = x.flex.map((v, j) => Math.max(J[j].flex[0] + 1, Math.min(J[j].flex[1] - 1, v))) as [number, number, number], side = x.side.map((v, j) => Math.max(-J[j].side + 1, Math.min(J[j].side - 1, v))) as [number, number, number];
    fingerFrom(S, f, {flex, side}, lens).forEach((p, j) => { S[c[j + 1]] = p; }); }
  return S;
}
/** Handens egna axlar som rummets (across är cross(palm, forward), som hand-pose.ts har dem). */
const ID: Axes = {forward: [1, 0, 0], palm: [0, 1, 0], across: [0, 0, -1]};
/** Fingrar i varandra i formen (hand-rule.ts handFaults 'i varandra'). */
const iVarandra = (S: Vec3[], sign: number) => handFaults(placed(S, ID, [0, 0, 0]), sign, null, null).some(f => f.kind === 'i varandra');

/** Lyftets handform ruta för ruta på dockans ben: jämnad, inom lederna, fylld där den saknas eller fingrarna går i varandra. */
function lyftetsHander(lyft: Lyft, side: Sida, bas: Vec3[]) {
  const sign = side === 'R' ? 1 : -1, P = lyft.frames.map(f => f[side].p);
  const Q = fyll(P.map(p => p ? local(p, axesOf(p, sign)) : null), (a, b, t) => a.map((v, k) => lerp(v, b[k], t)));
  const Qj = Array.from({length: 21}, (_, k) => jamna(Q.map(q => q[k]), 6)), q = Q.map((_, t) => Qj.map(v => v[t]));
  const S0 = q.map(x => { const S = paDockan(x, bas); return iVarandra(S, sign) ? null : S; });
  const godkand = S0.filter(Boolean).length / S0.length;
  const S1 = S0.some(Boolean) ? fyll(S0, (a, b, t) => formMellan(a, b, t)) : S0.map(() => bas);
  // (jämnat en gång till efter fyllningen, och åter på dockans ben inom lederna)
  const S1j = Array.from({length: 21}, (_, k) => jamna(S1.map(s => s[k]), 4)), S = S1.map((_, t) => paDockan(S1j.map(v => v[t]), bas));
  return {S, godkand, saknas: P.filter(p => !p).length / P.length};
}

// ---- kort och grepp --------------------------------------------------------------------------------------------------
/** Handens egna axlar som ett rum (som koreo-giv.ts REF): framåt x, handflatan y, tvärs -z. */
const REF: Axes = {forward: [1, 0, 0], palm: [0, 1, 0], across: [0, 0, -1]};
/** Handen som håller kortet `k` med greppet där kortet är `ref` i handens rum (koreo-giv.ts handFor). */
function handFor(k: Kort, ref: Kort, S: Vec3[]): Hand {
  const a = cross(k.n, k.l), ar = cross(ref.n, ref.l), M = (v: Vec3): Vec3 => add(add(mul(k.l, dot(ref.l, v)), mul(k.n, dot(ref.n, v))), mul(a, dot(ar, v)));
  return {a: {forward: M(REF.forward), palm: M(REF.palm), across: M(REF.across)}, w: sub(k.c, M(ref.c)), S};
}
/** Kortet som handen `h` håller med det greppet (koreo-giv.ts kortI). */
function kortI(h: Hand, ref: Kort): Kort {
  const M = (v: Vec3): Vec3 => add(add(mul(h.a.forward, dot(REF.forward, v)), mul(h.a.palm, dot(REF.palm, v))), mul(h.a.across, dot(REF.across, v)));
  return {c: add(h.w, M(ref.c)), l: unit(M(ref.l)), n: unit(M(ref.n))};
}
/** Kortet i skon: i skons front som liveShoeCard() har det, framsidan in mot skon (ryggen ut, där fingrarna tar det). */
export const kortISkon = (): Kort => { const s = liveShoeCard(); return {c: s.centre, l: unit(s.long), n: mul(unit(s.out), -1)}; };
/** Kortet på platsen `id` (LIVE.cards): plant på filten, framsidan upp, långsidan som platsen har den, pekande mot spelaren. */
export function kortPaPlats(id: string): Kort {
  const p = LIVE.cards[id], l: Vec3 = [Math.sin(rad(p.turn)), 0, Math.cos(rad(p.turn))];
  return {c: [p.at[0], T / 2, p.at[2]], l: l[2] >= 0 ? l : mul(l, -1), n: UP};
}

// ---- armen, armbågen och handleden ---------------------------------------------------------------------------------------
/** Underarmens radie i tio delar, armbågen till handleden (dockans form), för luften över bordets kant. */
const kantFor = (doll: Doll): Kant => ({z: LIVE.edge[2], y: 0, radie: Array.from({length: 10}, (_, i) => doll.shape.forearmRadius[0] + (doll.shape.forearmRadius[1] - doll.shape.forearmRadius[0]) * i / 9), luft: 0.004, handen: 0.3});
/** Hur mycket handen står från underarmen (grader). */
const handled = (e: Vec3, h: Hand) => grad(vinkel(sub(h.w, e), sub(punkter(h)[9], h.w)));
/**
 * Armbågen för axeln `s` och handen `h`: dockans ben (body.ts arm), polen `pol` (lyftets sida om linjen axel–handled)
 * vriden kring linjen högst 0,6 radianer, så lite som håller handen nära underarmens linje och underarmen över bordets kant.
 */
function armVrid(s: Vec3, h: Hand, pol: Vec3, doll: Doll, kant: Kant): number {
  const line = unit(sub(h.w, s)), fram = unit(sub(punkter(h)[9], h.w)); let best = 0, kost = Infinity;
  for (let t = -0.6; t <= 0.6 + 1e-9; t += 0.025) { const e = arm(s, h.w, turned(pol, line, t), doll).elbow, bojd = grad(vinkel(sub(h.w, e), fram)), luft = underarmLuft(e, h.w, kant);
    const c = (Math.max(0, bojd - 25) / 15) ** 2 + (t / 0.4) ** 2 + 400 * Math.max(0, kant.luft - luft) / 0.01; if (c < kost) { kost = c; best = t; } }
  return best;
}
const armbageVid = (s: Vec3, w: Vec3, pol: Vec3, t: number, doll: Doll) => arm(s, w, turned(pol, unit(sub(w, s)), t), doll).elbow;
const armbagen = (s: Vec3, h: Hand, pol: Vec3, doll: Doll, kant: Kant) => armbageVid(s, h.w, pol, armVrid(s, h, pol, doll, kant), doll);
/** Riktningen rakt nedåt vinkelrätt mot linjen axel–handled: där armbågens vinkel räknas från. */
const lodratt = (line: Vec3): Vec3 => { const d = sub([0, -1, 0], mul(line, -line[1])); return length(d) > 1e-6 ? unit(d) : [0, 0, 1]; };
/** Armbågens vinkel kring linjen axel–handled, från lodrätt nedåt, för polen `pol` vriden `t` radianer. */
const svang = (s: Vec3, w: Vec3, pol: Vec3, t: number) => { const line = unit(sub(w, s)), ref = lodratt(line), p = turned(pol, line, t), d = unit(sub(p, mul(line, dot(p, line)))); return Math.atan2(dot(cross(ref, d), line), dot(ref, d)); };
const armbageSvang = (s: Vec3, w: Vec3, th: number, doll: Doll) => { const line = unit(sub(w, s)); return arm(s, w, turned(lodratt(line), line, th), doll).elbow; };

// ---- ankaret ----------------------------------------------------------------------------------------------------------
/** Kroppen i en ruta: axlarna efter bålens lutning, armbågarna, händerna och huvudet. */
type Kropp = {S: [Vec3, Vec3]; h: Vec3; g: Vec3};
/** Lyftet läst som det ska läggas: jämnat, luckorna fyllda, i dockans djup. */
function last(lyft: Lyft, zAxlar: number) {
  const f = lyft.frames, n = f.length, j = (v: Vec3[]) => jamna(v);
  const sida = (s: Sida) => {
    const grepp = fyll(f.map(x => x[s].p ? mitt(x[s].p![4], x[s].p![8]) : null), lerp), toppar = fyll(f.map(x => x[s].p ? mitt(x[s].p![8], x[s].p![12]) : null), lerp);
    const pol = jamna(f.map(x => { const line = unit(sub(x[s].w, x[s].s)), d = sub(x[s].e, x[s].s); return unit(sub(d, mul(line, dot(d, line)))); }), 3).map(unit);
    return {s: j(f.map(x => tillDjup(x[s].s, zAxlar))), w: j(f.map(x => x[s].w)), e: f.map(x => x[s].e), grepp: j(grepp), toppar: j(toppar), pol};
  };
  const h = j(fyll(f.map(x => x.h), lerp)), riktning = jamna(fyll(f.map(x => x.h && x.g ? unit(sub(x.g, x.h)) : null), lerp)).map(unit), avst = fyll(f.map(x => x.h && x.g ? Math.max(0.3, Math.min(2.5, length(sub(x.g, x.h)))) : null), (a, b, t) => a + (b - a) * t);
  const a = fyll(f.map(x => x.a), (x, y, t) => Object.fromEntries(Object.keys(x).map(k => [k, x[k] + ((y[k] ?? x[k]) - x[k]) * t])));
  return {n, R: sida('R'), L: sida('L'), h, riktning, avst, a, zAxlar};
}
type Last = ReturnType<typeof last>;
/** Axlarnas mitt i en ruta av lyftet, i dockans djup. */
const axelMitt = (L: Last, t: number) => mitt(L.R.s[t], L.L.s[t]);

/**
 * Stilens medel för axlarnas mitt och huvudet mot axlarna, över alla stilens lyft: rörelsen räknas mot dem. Huvudet ligger
 * på sin synlinje i dockans huvuds djup (`zHuvud`): där bilden har det, så att dealerns hållning (huvudet lägre och framåt
 * än i modellens vila) följer med i rörelsen.
 */
function stilensMedel(stil: string, zAxlar: number, zHuvud: number) {
  const filer = readdirSync(LYFT).filter(f => f.startsWith(`${stil}-`) && f.endsWith('.json'));
  const mitten: Vec3[] = [], huvud: Vec3[] = [];
  for (const fil of filer) { const ly = JSON.parse(readFileSync(path.join(LYFT, fil), 'utf8')) as Lyft;
    for (const f of ly.frames) { const m = mitt(tillDjup(f.R.s, zAxlar), tillDjup(f.L.s, zAxlar)); mitten.push(m); if (f.h) huvud.push(sub(tillDjup(f.h, zHuvud), m)); } }
  return {mitt: medianV(mitten), huvud: medianV(huvud)};
}

/** Var händerna vilar: handsAtRest-raden vars vänsterhand ligger där väntans gör (`vantan`), och höger ur väntan där den raden har handen lyft. */
function vilansHander(stil: 'kameran' | 'bordet', vantan: Lyft) {
  const d = LIVE.dealer.styles[stil], gL = medianV(vantan.frames.filter(f => f.L.p).map(f => mitt(f.L.p![4], f.L.p![8]))), gR = medianV(vantan.frames.filter(f => f.R.p).map(f => mitt(f.R.p![4], f.R.p![8])));
  const rad = [...d.handsAtRest].filter(r => r.leftGrip).sort((a, b) => Math.hypot(a.leftGrip![0] - gL[0], a.leftGrip![2] - gL[2]) - Math.hypot(b.leftGrip![0] - gL[0], b.leftGrip![2] - gL[2]))[0];
  return {rad, L: rad.leftGrip!, R: rad.rightGrip ?? gR, hogerUrVantan: !rad.rightGrip};
}

/**
 * Ankaret: dockans vila vid livebordet. Axlarna där doll.ts har dem (LIVE.dealer), händerna på filten där handsAtRest
 * säger (greppet, punkten mellan tummens och pekfingrets toppar), lagda som väntans händer ligger (lyftets axlar och form
 * på dockans ben), handflatan och fingrarna 1,5 mm över filten; blicken mot kameran; kortet i skon; minen i vila.
 */
export function ankaret(doll: Doll, stil: 'kameran' | 'bordet', vantan: Lyft, vantanNamn: string) {
  const fr = dollFrame(TABLE_LENS, doll), H = doll.hand!, kant = kantFor(doll), vh = vilansHander(stil, vantan), nar = doll.upperArm + doll.forearm - REN.naturlig;
  const limb = (side: Sida): {limb: Limb; flytt: number; pol: Vec3} => {
    const sign = side === 'R' ? 1 : -1, s = side === 'R' ? fr.shoulders[0] : fr.shoulders[1], fr2 = vantan.frames.filter(f => f[side].p);
    const A = (() => { const fw = unit(medianV(fr2.map(f => axesOf(f[side].p!, sign).forward))), pm = medianV(fr2.map(f => axesOf(f[side].p!, sign).palm)), palm = unit(sub(pm, mul(fw, dot(pm, fw)))); return {forward: fw, palm, across: cross(palm, fw)}; })();
    const q = Array.from({length: 21}, (_, k) => medianV(fr2.map(f => local(f[side].p!, axesOf(f[side].p!, sign))[k])));
    const bas = side === 'R' ? H.rest!.right : H.rest!.left, S0 = paDockan(q, bas), S = iVarandra(S0, sign) ? bas : S0;
    const G = side === 'R' ? vh.R : vh.L;
    let h: Hand = {a: A, w: [0, 0, 0], S}; { const p = punkter(h), g = mitt(p[4], p[8]); h = flyttHand(h, sub([G[0], G[1], G[2]], g)); }
    const overFilten = (x: Hand) => Math.min(x.w[1] - 0.0185, ...punkter(x).map((p, k) => p[1] - BALL(k) - 0.0015));
    h = flyttHand(h, [0, -overFilten(h), 0]);
    // (når armen inte dit utan att bålen lutar, flyttas handen längs filten mot axeln så långt som behövs)
    let flytt = 0; const mot = flat(sub(s, h.w)); while (length(sub(h.w, s)) > nar && flytt < 0.2) { h = flyttHand(h, mul(mot, 0.002)); flytt += 0.002; }
    const pol = unit(medianV(vantan.frames.map(f => { const line = unit(sub(f[side].w, f[side].s)), d = sub(f[side].e, f[side].s); return unit(sub(d, mul(line, dot(d, line)))); })));
    return {limb: {s: r4(s), e: r4(armbagen(s, h, pol, doll, kant)), w: r4(h.w), k: 1, p: punkter(h).map(r4)}, flytt, pol};
  };
  const R = limb('R'), L = limb('L'), k = kortISkon();
  // (huvudet som dealern brukar hålla det mot axlarna, stilens medel i bilden i modellens huvuds djup: hållningen hör till rörelsen)
  const huvud = add(mitt(fr.shoulders[0], fr.shoulders[1]), stilensMedel(stil, fr.shoulders[0][2], fr.head[2]).huvud);
  const frame: Frame = {card: {c: r4(k.c), l: r4(k.l), n: r4(k.n), id: 0}, R: R.limb, L: L.limb, h: r4(huvud), g: [0, CAM_H, 0], a: {}};
  const mm = (x: number) => Math.round(x * 1000);
  const about = `Vilan vid livebordet för dockan ${doll.name} (stilen ${stil}): ankaret som dockans alla rörelser (dealer3d/data/lyft-${doll.name}-*.json) börjar och slutar exakt i. Axlarna där doll.ts har dem (LIVE.dealer.styles.${stil}), händerna på filten där handsAtRest har dealerns vila "${vh.rad.left}" och "${vh.rad.right}" (${vh.rad.times} gånger, ${vh.rad.seconds} s; vald för att dealerns väntan i ${vantanNamn} är i den)${vh.hogerUrVantan ? ', högerhanden där den ligger i väntan (handsAtRest har den lyft från filten)' : ''}: greppet (mellan tummens och pekfingrets toppar) där, handen lagd som i väntan (lyftets axlar och fingrar på dockans ben), handflatan och fingrarna 1,5 mm över filten${R.flytt || L.flytt ? `; flyttad mot axeln så att armen når utan att bålen lutar: höger ${mm(R.flytt)} mm, vänster ${mm(L.flytt)} mm` : ''}. Huvudet där dealern brukar hålla det mot axlarna (medel över stilens lyft, i modellens huvuds djup), blicken mot livebordets kamera, kortet i skons front (liveShoeCard), minen i vila.`;
  return {about, doll: doll.name, style: stil, hip: r4(fr.hip), frame, vila: vh, pol: {R: R.pol, L: L.pol} as Record<Sida, Vec3>};
}

// ---- en giv ------------------------------------------------------------------------------------------------------------
/** Rutorna i lyftet där det händer något: tiderna är dealerns. */
function tiderna(lyft: Lyft, L: Last) {
  const n = L.n, leaves = lyft.leavesShoe!, rests = lyft.rests!;
  const fart = (v: Vec3[]) => v.map((p, t) => t ? length(sub(p, v[t - 1])) * FPS : 0);
  const fL = fart(L.L.w);
  // vänsterhanden stilla vid skon före draget: den sista stilla rutan före leaves är draget, den första i samma stillhet är framme
  let pull = leaves - 2; for (let t = leaves - 1; t >= Math.max(1, leaves - 10); t--) if (fL[t] < 0.25) { pull = t; break; }
  pull = Math.max(2, Math.min(leaves - 2, pull));
  let arrive = pull; while (arrive > Math.max(2, pull - 30) && fL[arrive - 1] < 0.25) arrive--;
  // bytet: händerna är som närmast en tiondels sekund innan vänstern stannar (live-bj stil-*.json handover); kortet byter
  // hand när vänstern har stannat, i den första rutan efter det närmaste där lyftets vänsterhand går under 0,35 m/s
  let narmast = leaves + 4, best = Infinity; for (let t = leaves + 3; t <= rests - 9; t++) { const d = length(sub(L.L.grepp[t], L.R.grepp[t])); if (d < best) { best = d; narmast = t; } }
  let meet = Math.min(rests - 9, narmast + 4); for (let t = narmast; t <= Math.min(rests - 9, narmast + 6); t++) if (fL[t] < 0.35) { meet = t; break; }
  // (vänstern drar kortet på filten till mötet, framme i bytets ruta, och reser det de sista rutorna dit, från raise0 till
  // restat; högern kommer över kanten när det står och nyper det i bytet)
  const raise0 = Math.max(leaves, meet - 8), restat = Math.max(raise0 + 2, meet - 1), nere = Math.max(meet + 5, rests - 5);
  // (fingrarna vilar på kortet tills lyftets högerhand börjar gå hem, högst fyra rutor)
  const fR = fart(L.R.w); let vila = Math.min(n - 3, rests + 4); for (let t = rests + 1; t <= Math.min(n - 3, rests + 4); t++) if (fR[t] > 0.3) { vila = t; break; }
  return {n, arrive, pull, leaves, raise0, restat, narmast, meet, nere, rests, vila, avstandVidBytet: best};
}

/** Stilens ansiktsformer som bär, och minen i en ruta: blinkningarna som korta toppar ovanpå en halverad långsam del, eyeSquint dämpad. */
function minen(L: Last, stil: Stil) {
  const bar = Object.entries(stil.face.shapes).filter(([, v]) => v.verdict === 'carries').map(([k]) => k), n = L.n;
  const spar = Object.fromEntries(bar.map(k => [k, L.a.map(a => a[k] ?? 0)]));
  const langsam = (v: number[]) => v.map((_, t) => median(v.slice(Math.max(0, t - 7), t + 8)));
  for (const k of bar.filter(k => k.startsWith('eyeBlink'))) { const v = spar[k], l = langsam(v), topp = v.map((x, t) => x - l[t]), ut = l.map(x => 0.5 * x);
    for (let t = 0; t < n; ) { if (topp[t] <= 0.12) { t++; continue; } let e = t; while (e < n && topp[e] > 0.12) e++;
      if (e - t <= 12) for (let i = Math.max(0, t - 1); i < Math.min(n, e + 1); i++) ut[i] += Math.max(0, topp[i]); t = e; }
    spar[k] = ut; }
  for (const k of bar.filter(k => k.startsWith('eyeSquint'))) spar[k] = spar[k].map(x => 0.4 * x);
  return {bar, spar};
}

type Bygg = {doll: Doll; stil: 'kameran' | 'bordet'; lyft: Lyft; ank: ReturnType<typeof ankaret>; minen: ReturnType<typeof minen>};

/** Kroppen i varje ruta: axlarna ur lyftet (i dockans djup, med dockans bredd), huvudet och blicken. Tonade mot ankaret i ändarna. */
function kroppen(b: Bygg, L: Last, medel: ReturnType<typeof stilensMedel>, zHuvud: number, F: number) {
  const f0 = b.ank.frame, n = L.n, halv = b.doll.place.kind === 'seat' ? b.doll.place.shouldersApart / 2 : 0.18;
  const ankMitt = mitt(f0.R.s, f0.L.s), blick0 = unit(sub(f0.g, f0.h)), avst0 = length(sub(f0.g, f0.h));
  const ton = (t: number) => smooth(Math.min(t, n - 1 - t) / F);
  return Array.from({length: n}, (_, t): Kropp => {
    const w = ton(t), m = add(ankMitt, mul(sub(axelMitt(L, t), medel.mitt), w)), rikt = unit(sub(L.L.s[t], L.R.s[t])), dir = unit(lerp([1, 0, 0], [rikt[0], rikt[1], 0], w));
    const S: [Vec3, Vec3] = [sub(m, mul(dir, halv)), add(m, mul(dir, halv))];
    // (huvudet mot axlarna som i bilden, i dockans huvuds djup; i ändarna stilens vanliga hållning, som ankaret har)
    const hm = sub(tillDjup(L.h[t], zHuvud), axelMitt(L, t)), h = add(m, lerp(medel.huvud, hm, w));
    const g = add(h, mul(unit(lerp(blick0, L.riktning[t], w)), avst0 + (L.avst[t] - avst0) * w));
    return {S, h, g};
  });
}

/** Lyftets väg mellan nyckelrutorna, förskjuten till nyckellägena: förskjutningen läggs ut efter hur långt lyftets punkt har gått i bilden (85 %) och tiden (15 %). */
export function forskjut(lyft: Vec3[], nycklar: Map<number, Vec3>, vagAndel = 0.85): Vec3[] {
  const px = lyft.map(p => liveSee(p)!), s = [0]; for (let i = 1; i < lyft.length; i++) s.push(s[i - 1] + Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y));
  const k = [...nycklar.keys()].sort((a, b) => a - b), off = (j: number) => sub(nycklar.get(j)!, lyft[j]);
  return lyft.map((p, t) => { if (nycklar.has(t)) return nycklar.get(t)!; const a = k.filter(j => j < t).at(-1), b = k.find(j => j > t);
    if (a === undefined) return add(p, off(b!)); if (b === undefined) return add(p, off(a));
    const ds = s[b] - s[a], u = vagAndel * (ds > 2 ? (s[t] - s[a]) / ds : (t - a) / (b - a)) + (1 - vagAndel) * (t - a) / (b - a);
    return add(p, lerp(off(a), off(b), u)); });
}
/** Hur långt lyftets punkt har gått i bilden mellan a och b, andelen i rutan t (0 i a, 1 i b). */
const andelAvVagen = (lyft: Vec3[], a: number, b: number, t: number) => { let s = 0, st = 0; for (let i = a + 1; i <= b; i++) { const p = liveSee(lyft[i])!, q = liveSee(lyft[i - 1])!, d = Math.hypot(p.x - q.x, p.y - q.y); s += d; if (i <= t) st += d; } return s > 2 ? st / s : (t - a) / (b - a); };

/**
 * En fri hand (mellan två rutor där vår kod lägger den): handens vinkel mjukt från den fasta handen före till den efter, i
 * takt med lyftets väg och tiden (lyftets egen vinkel på handen är för brusig för att följa); formen lyftets, tonad mot den
 * fasta handens form närmare än 6 rutor från den.
 */
function friHand(fri: {S: Vec3[][]}, fasta: (Hand | null)[], lyftW: Vec3[], t: number): {a: Axes; S: Vec3[]} {
  const n = fasta.length; let fore = 0, efter = n - 1; for (let j = t; j >= 0; j--) if (fasta[j]) { fore = j; break; } for (let j = t; j < n; j++) if (fasta[j]) { efter = j; break; }
  const u = 0.5 * andelAvVagen(lyftW, fore, efter, t) + 0.5 * (t - fore) / Math.max(1, efter - fore), a = between(fasta[fore]!.a, fasta[efter]!.a, smooth(u));
  const wf = smooth(1 - (t - fore) / 6), we = smooth(1 - (efter - t) / 6); let S = fri.S[t];
  if (wf > 0 || we > 0) S = formMellan(S, (wf >= we ? fasta[fore] : fasta[efter])!.S, Math.max(wf, we));
  return {a, S};
}

/**
 * Hur djupt handen går i kortet och filten (hand-rule.ts handFaults, millimeter sammanlagt), med kortet prövat 0,3 mm
 * närmare handen än det är: marginal mot avrundningen till en tiondels millimeter, så att en hand som ligger an inte fälls.
 */
function iKortMarg(h: Hand, k: Kort, sign: number) {
  const p = punkter(h), sida = Math.sign(dot(sub(toppMitt(h), k.c), k.n)) || 1, kk = {...k, c: add(k.c, mul(k.n, sida * 0.0003))};
  return handFaults(p, sign, null, kk).filter(f => f.kind === 'kortet').reduce((s, f) => s + f.by + 1, 0) + handFaults(p, sign, null, null).filter(f => f.kind === 'filten').reduce((s, f) => s + f.by + 1, 0);
}
/** Handens lägsta del över filten: handleden 18,5 mm (som mat.ts räknar handflatan), fingrarnas kulor 1,5 mm. */
const overFilten = (h: Hand) => Math.min(h.w[1] - 0.0185, ...punkter(h).map((p, k) => p[1] - BALL(k) - 0.0015));

/** Rörelsen: en giv eller en väntan, ruta för ruta. */
export function bygg(b: Bygg) {
  const {doll, lyft} = b, fr = dollFrame(TABLE_LENS, doll), zAxlar = fr.shoulders[0][2], L = last(lyft, zAxlar), n = L.n, H = doll.hand!, kant = kantFor(doll);
  const zHuvud = fr.head[2], medel = stilensMedel(b.stil, zAxlar, zHuvud), F = 10, f0 = b.ank.frame, giv = lyft.leavesShoe !== undefined;
  const kropp = kroppen(b, L, medel, zHuvud, F);
  const ank: Record<Sida, Hand> = {R: {a: axesOf(f0.R.p, 1), w: f0.R.w, S: local(f0.R.p, axesOf(f0.R.p, 1))}, L: {a: axesOf(f0.L.p, -1), w: f0.L.w, S: local(f0.L.p, axesOf(f0.L.p, -1))}};
  const fri = {R: lyftetsHander(lyft, 'R', ank.R.S), L: lyftetsHander(lyft, 'L', ank.L.S)};
  const fasta: Record<Sida, (Hand | null)[]> = {R: Array(n).fill(null), L: Array(n).fill(null)};
  fasta.R[0] = fasta.R[n - 1] = ank.R; fasta.L[0] = fasta.L[n - 1] = ank.L;
  const C: Kort[] = Array.from({length: n}, () => kortISkon());
  /** Rutor där handen bär kortet (högern) eller har topparna på det (vänstern): kortet följer med när handen rättas. */
  const harKort: Record<Sida, boolean[]> = {R: Array(n).fill(false), L: Array(n).fill(false)};
  const topp = {finger: Math.max(REN.topp, H.topp?.finger ?? 0), thumb: Math.max(REN.tumme, H.topp?.thumb ?? 0)};
  let tider: ReturnType<typeof tiderna> | null = null, plats: string | null = null, sattGrader = 0;
  let nyp: {t: number; sluta: number; upp: Vec3; oppen: Vec3[]; hand: Hand} | null = null;

  if (giv) {
    const ti = tiderna(lyft, L); tider = ti;
    // ---- platsen: den kortplats för lyftets plats som ligger närmast där lyftets kort lades
    const seat = /seat (\d)/.exec(lyft.to ?? '')![1], landat = lyft.frames[ti.rests].card?.c ?? L.R.grepp[ti.rests];
    plats = Object.keys(LIVE.cards).filter(id => id.startsWith(`P${seat}.`)).sort((x, y) => Math.hypot(LIVE.cards[x].at[0] - landat[0], LIVE.cards[x].at[2] - landat[2]) - Math.hypot(LIVE.cards[y].at[0] - landat[0], LIVE.cards[y].at[2] - landat[2]))[0];
    const KL = kortPaPlats(plats);

    // ---- vänsterhanden och kortet: skon, draget, på filten till mötet, rest på högkant
    const SL = medLeder(H.rest?.left ?? H.left, [[20, 30, 15], [20, 30, 15], [20, 30, 15], [20, 30, 15]]);
    // (topparna på kortets rygg där livebordets mätning har vänsterns grepp vid skon, lagt i kortets plan och inom kortet;
    // på filten glider de mot kortets närmre långsida, där de håller det medan det reses)
    const vidSkon = LIVE.dealer.styles[b.stil].leftAtShoe as {atFront?: Vec3; overMouth?: Vec3}, K0 = kortISkon(), a0 = cross(K0.n, K0.l), d0 = sub(vidSkon.atFront ?? vidSkon.overMouth ?? K0.c, K0.c);
    const u0 = Math.max(-(HK / 2 - 0.012), Math.min(HK / 2 - 0.012, dot(d0, K0.l))), v0 = Math.max(-(WK / 2 - 0.012), Math.min(WK / 2 - 0.012, dot(d0, a0)));
    // (topparnas punkt en fingertopps radie och 0,8 mm från ryggen: med en tiondels millimeters avrundning ligger inget finger i kortet)
    const paV = (k: Kort, v: number, u = u0) => { const a = cross(k.n, k.l); return add(add(add(k.c, mul(k.l, u)), mul(a, v)), mul(k.n, -(T / 2 + topp.finger + 0.0008))); };
    // (före resningen glider topparna ut över kortets närmre långsida och ligger strax utanför den: där håller de kanten medan
    // den reser sig, och ligger till sist ovanpå den, så att fingrarna går över kortet och inte genom det)
    const pa = (k: Kort) => paV(k, v0), vNara = (k: Kort) => -(Math.sign(cross(k.n, k.l)[2]) || 1) * (WK / 2 + 0.004);
    /**
     * Vänsterhanden med handflatan mot kortets rygg och topparna på `P`, pekande som lyftets hand i rutan `t` (från lyftets
     * handled mot topparna), så att handleden hamnar där lyftets är; vriden och lutad så lite som håller alla delar ur kortet och filten.
     */
    // (före resningen vrids handen så att fingrarna pekar tvärs över kortet, mot dess bortre långsida: då ligger de över den
    // närmre långsidan när den reser sig, i stället för längs den)
    const tvars = (k: Kort): Vec3 => { const a = cross(k.n, k.l); return a[2] >= 0 ? a : mul(a, -1); };
    // (bland de sätt som håller handen ur kortet och filten väljs det som ligger närmast handen i rutan före, `forra`, så att
    // handen inte byter vinkel tvärt; utan den det första i ordningen)
    const vansterPa = (k: Kort, t: number, P = pa(k), forra?: Hand): Hand => { const nrm = unit(k.n), w = t > ti.raise0 - 4 ? smooth((t - (ti.raise0 - 4)) / 4) : 0, fw = unit(lerp(unit(sub(P, L.L.w[t])), tvars(k), w)), f00 = unit(sub(fw, mul(nrm, dot(fw, nrm)))), lut = grad(Math.asin(Math.max(-1, Math.min(1, dot(fw, nrm)))));
      let forst: Hand | null = null, bast: {h: Hand; c: number} | null = null, ordning = 0;
      for (const lyftUt of [0, 0.0015, 0.003]) for (const yaw of [0, 15, -15, 30, -30]) for (const dp of [0, 5, -5, 10, -10, 15, 20, 25, 30, 40]) { const pitch = Math.max(10, Math.min(70, lut + dp)), f0v = turned(f00, nrm, rad(yaw)), Fv = unit(add(mul(f0v, Math.cos(rad(pitch))), mul(nrm, Math.sin(rad(pitch))))), Pm = unit(sub(nrm, mul(Fv, dot(nrm, Fv)))), h = medToppar({forward: Fv, palm: Pm, across: cross(Pm, Fv)}, SL, sub(P, mul(nrm, lyftUt))); forst ??= h; ordning++;
        if (iKortMarg(h, k, -1) !== 0 || overFilten(h) <= -0.0005) continue;
        // (nära handen i rutan före, pekande ungefär som armen från axeln (handleden rak) och som lyftets hand)
        const c = (forra ? vinkel(Fv, forra.a.forward) + vinkel(Pm, forra.a.palm) : 0) + 0.4 * vinkel(Fv, sub(P, f0.L.s)) + 0.3 * vinkel(Fv, fw) + ordning * 1e-4; if (!bast || c < bast.c) bast = {h, c}; }
      return bast?.h ?? forst!; };
    // (draget: kortet går från frontens lutning till plant, ryggen upp, med långsidan som den låg i skon)
    const Kut: Kort = {c: [0, 0, 0], l: flat(K0.l), n: mul(UP, -1)};
    const kortRam0 = {forward: K0.l, palm: K0.n, across: cross(K0.n, K0.l)}, kortRam1 = {forward: Kut.l, palm: Kut.n, across: cross(Kut.n, Kut.l)};
    // (mötet: kortets mitt där lyftets två grepp är vid bytet, i sidled; djupet lyftets, inom 10–32 cm framför kanten; långsidan i sidled)
    // (långsidan i sidled som i vår giv (KOREO.moteYaw), eller vriden mot spelarna så lite som behövs för att högerns handled i
    // nypet ska stå högst 44 grader från underarmen: greppet håller handen längs kortet)
    const grepp = nyckelgrepp(H.right, topp); if (!grepp) throw Error('tummen når inte kortet i nyckelgreppet');
    // (kortet 0,8 mm längre in i greppet än nyckelgrepp lägger det: pekfingrets mellanled ligger där på gränsen för kortets kant,
    // och avrundningen till en tiondels millimeter fäller annars en ruta här och där; som koreo-giv.ts NATUR.kantluft)
    const SK = grepp.S, refK: Kort = {...grepp.kort, c: add(grepp.kort.c, [0, 0.0008, 0])};
    const bortre = (k: Kort): Vec3 => { const a = cross(k.n, k.l), mot = a[2] >= 0 ? a : mul(a, -1); return [k.c[0] + mot[0] * WK / 2, 0, k.c[2] + mot[2] * WK / 2]; };
    const resAxel = (k: Kort) => unit(dot(k.l, [1, 0, 0]) >= 0 ? k.l : mul(k.l, -1));
    const somHogern = (k: Kort): Kort => dot(k.l, [1, 0, 0]) >= 0 ? k : {...k, l: mul(k.l, -1)};
    // (mötet: kortet där vänstern har det i bytets ruta, topparna på dess närmre långsida där lyftets vänstra toppar är;
    // djupet lyftets, med kortets mitt 10–32 cm framför kanten)
    const tM = L.L.toppar[ti.meet];
    const motePa = (grader: number): Kort => { const y = rad(grader), l: Vec3 = [Math.sin(y), 0, Math.cos(y)], k0: Kort = {c: [0, 0, 0], l, n: mul(UP, -1)}, P0 = paV(k0, vNara(k0));
      return {c: [tM[0] - P0[0], T / 2, Math.max(LIVE.edge[2] + 0.1, Math.min(LIVE.edge[2] + 0.32, tM[2] - P0[2]))], l, n: k0.n}; };
    const nypBojd = (k: Kort) => { const st = vridKort(k, bortre(k), resAxel(k), rad(KOREO.rest)), h = handFor(somHogern(st), refK, SK); return handled(armbagen(f0.R.s, h, L.R.pol[ti.meet], doll, kant), h); };
    const moteYaw = (() => { let bast = {g: KOREO.moteYaw, b: Infinity}; for (let g = KOREO.moteYaw; g >= 30; g -= 5) { const b = nypBojd(motePa(g)); if (b <= 44) return g; if (b < bast.b) bast = {g, b}; } return bast.g; })();
    const KM0 = motePa(moteYaw), lM: Vec3 = dot(Kut.l, KM0.l) >= 0 ? KM0.l : mul(KM0.l, -1), KM: Kort = {...KM0, l: lM};
    // (ur skon och på filten till mötet, i ett tag: topparna längs lyftets handleds väg (jämnare än dess toppar), förskjuten från skon till mötet, där kortet
    // är i bytets ruta och dit farten sjunker mjukt de sista tre rutorna (dalen i bytet); kortet går från frontens lutning till
    // plant tills det är ute (leaves), vrids sedan mjukt till sidled, och topparna glider till dess närmre långsida innan det reses)
    const tillToppar = medianV(Array.from({length: ti.meet - ti.pull + 1}, (_, i) => sub(L.L.toppar[ti.pull + i], L.L.w[ti.pull + i])));
    // (förskjutningen här lagd hälften efter vägen och hälften efter tiden: den är stor, och lagd bara efter vägen gör den
    // handens toppfart dubbelt så hög som lyftets)
    const vM = vNara(KM), Lt0 = jamna(forskjut(L.L.w.map(w => add(w, tillToppar)), new Map([[ti.pull, pa(K0)], [ti.meet, paV(KM, vM)]]), 0.5), 5);
    const Lt = Lt0.map((p, t) => t > ti.meet - 5 && t <= ti.meet ? lerp(p, Lt0[ti.meet], smooth((t - (ti.meet - 5)) / 5)) : p);
    const yawUt = Math.atan2(Kut.l[0], Kut.l[2]), yawM = (() => { let y = Math.atan2(lM[0], lM[2]); while (y - yawUt > Math.PI) y -= 2 * Math.PI; while (y - yawUt < -Math.PI) y += 2 * Math.PI; return y; })();
    const vVid = (t: number) => v0 + (vM - v0) * smooth((t - ti.leaves) / Math.max(1, ti.raise0 - ti.leaves));
    const lagd = (t: number): Kort => { if (t <= ti.leaves) { const A = between(kortRam0, kortRam1, smooth((t - ti.pull) / (ti.leaves - ti.pull))); return {c: [0, 0, 0], l: A.forward, n: A.palm}; }
      const y = yawUt + (yawM - yawUt) * smooth((t - ti.leaves) / (ti.meet - ti.leaves)); return {c: [0, 0, 0], l: [Math.sin(y), 0, Math.cos(y)], n: mul(UP, -1)}; };
    /** Kortet i rutan t (från draget till bytet): som `lagd` ligger det, med topparna på lyftets förskjutna toppar i sidled och djup; i höjd från skons front ned till filten tills det är ute, sedan på filten. */
    const paFilten = (t: number): Kort => { const k0 = lagd(t), P = paV(k0, t <= ti.leaves ? v0 : vVid(t)), c = sub(Lt[t], P), y = t <= ti.leaves ? K0.c[1] + (T / 2 - K0.c[1]) * smooth((t - ti.pull) / (ti.leaves - ti.pull)) : T / 2;
      const k = {...k0, c: [c[0], y, c[2]] as Vec3}, lag = kortLagst(k); return lag < 0 ? flyttKort(k, [0, -lag, 0]) : k; };
    // (resningen kring den bortre långsidan, KOREO.rest grader, framsidan mot dealern, medan kortet glider de sista rutorna;
    // topparna håller den närmre långsidan, som reser sig, och handen vrids med kortet bara så mycket som håller fingrarna ur
    // kortet: den stannar på dealerns sida)
    const rest = (t: number) => KOREO.rest * smooth((t - ti.raise0) / (ti.restat - ti.raise0));
    const hSko = vansterPa(K0, ti.arrive);
    const iKortetV = (hh: Hand, k: Kort) => iKortMarg(hh, k, -1);
    /** Handen på kortet i rutan t, före resningen: topparna följer kortet ur skon, och handens vinkel går mjukt från skons till filtens (inte stelt med kortet), mer mot filtens om ett finger annars går i kortet. */
    // (handens vinkel går mjukt från skons till den den har när resningen börjar (fingrarna tvärs över kortet), i takt med
    // tiden; där ett finger annars skulle gå i kortet eller filten lutas handen lite kring topparna eller lyfts en aning från kortet)
    const kortR = paFilten(ti.raise0), hRes = vansterPa(kortR, ti.raise0, paV(kortR, vVid(ti.raise0)));
    const foreH: {kf: Kort; hf: Hand}[] = [];
    for (let t = ti.pull + 1; t <= ti.meet; t++) { const kf = paFilten(t), P = paV(kf, t <= ti.leaves ? v0 : vVid(t)), A = t >= ti.raise0 ? hRes.a : between(hSko.a, hRes.a, smooth((t - ti.pull) / Math.max(1, ti.raise0 - ti.pull)));
      let hf = medToppar(A, SL, P);
      if (iKortetV(hf, kf) !== 0) { let bast: {h: Hand; c: number} | null = null;
        for (const ut of [0, 0.0015, 0.003]) for (const x of [5, -5, 10, -10, 15, -15, 20, -20, 30, -30]) { const h = vridHand(medToppar(A, SL, sub(P, mul(unit(kf.n), ut))), toppMitt(medToppar(A, SL, P)), A.across, rad(x)), c = iKortetV(h, kf) * 100 + Math.abs(x) + ut * 1000;
          if (!bast || c < bast.c) bast = {h, c}; if (c < 100 && iKortetV(h, kf) === 0) break; }
        hf = bast!.h; }
      foreH[t] = {kf, hf}; }
    const fore = (t: number) => foreH[t];
    // (resningen: andelen av kortets vridning handen tar tillbaka kring topparna är den största som håller fingrarna ur kortet,
    // jämnad så att den ändras högst 0,08 per ruta och aldrig är större än den som håller dem ur)
    const resa = (t: number, andel: number) => { const {kf, hf} = fore(t), x = rad(rest(t)), o = bortre(kf), ax = resAxel(kf), k = vridKort(kf, o, ax, x), med = vridHand(hf, o, ax, x); return {k, h: vridHand(med, toppMitt(med), ax, -x * andel)}; };
    const tillat = Array.from({length: ti.meet + 1}, (_, t) => { if (t <= ti.raise0) return 1; for (let a = 1; a >= 0; a -= 0.05) { const r = resa(t, a); if (iKortetV(r.h, r.k) === 0) return a; } return 0; });
    const andel = tillat.map((_, t) => Math.min(...tillat.map((a, j) => a + 0.08 * Math.abs(t - j))));
    for (let t = ti.arrive; t <= ti.meet; t++) {
      let k: Kort, h: Hand;
      if (t <= ti.pull) { k = K0; h = hSko; }
      else if (t <= ti.raise0) { const f = fore(t); k = f.kf; h = f.hf; }
      else { let a = andel[t], r = resa(t, a); while (a > 0 && iKortetV(r.h, r.k) > 0) { a = Math.max(0, a - 0.05); r = resa(t, a); } ({k, h} = r); }
      fasta.L[t] = h; C[t] = k; harKort.L[t] = t > ti.pull;
    }

    // ---- högerhanden: nypet, bärandet med vändningen, nedsättningen, fingrarna på kortet
    const Kstar = somHogern(vridKort(KM, bortre(KM), resAxel(KM), rad(KOREO.rest)));
    const hNyp = handFor(Kstar, refK, SK);
    // (platsens ram: Zp långsidan mot spelaren, Xp åt sidan; gångjärnet kortets långsida åt +Xp, kortet lutat med den hållna långsidan uppe)
    const Zp = KL.l, Xp = cross(UP, Zp), gangjarn: Vec3 = add([KL.c[0], 0, KL.c[2]], mul(Xp, WK / 2)), lutat = (g: number) => vridKort(KL, gangjarn, Zp, -rad(g));
    const friH = (h: Hand) => overFilten(h) >= 0 && !handFaults(punkter(h), 1, null, null).some(x => x.kind === 'filten');
    sattGrader = (() => { for (let g = KOREO.satt; g <= 80; g += 2.5) if (friH(handFor(lutat(g), refK, SK))) return g; return 80; })();
    const hNere = handFor(lutat(sattGrader), refK, SK);
    const SV = medLeder(H.right, [[25, 35, 18], [25, 35, 18], [22, 32, 16], [20, 30, 15]]);
    // (fingertopparna vilar på kortet en bit in från dess närmre kortsida; handen pekar som lyftets hand när kortet ligger,
    // högst 30 grader från kortets långsida)
    const yawVila = (() => { const d = flat(sub(L.R.toppar[ti.rests], L.R.w[ti.rests])); return Math.max(-rad(30), Math.min(rad(30), Math.atan2(dot(cross(Zp, d), UP), dot(Zp, d)))); })(), Fw = turned(Zp, UP, yawVila);
    const hRest: Hand = (() => { const palm = turned(mul(UP, -1), Fw, rad(KOREO.rulleVila)), A: Axes = {forward: Fw, palm, across: cross(palm, Fw)}, P = placed(SV, A, [0, 0, 0]), m = mitt(P[8], P[12]), lag = Math.min(P[8][1], P[12][1]);
      const mal = add(add([KL.c[0], 0, KL.c[2]], mul(Xp, -0.008)), mul(Zp, -HK / 2 + 0.03)); return {a: A, w: [mal[0] - m[0], T + topp.finger + 0.0005 - lag, mal[2] - m[2]], S: SV}; })();
    const lyftAx = (() => { const ax = unit(hRest.a.across), w = kring(hRest.w, toppMitt(hRest), ax, rad(KOREO.vilaLyft)); return w[1] > hRest.w[1] ? ax : mul(ax, -1); })();
    // nypet: över kortets kant, ned på den medan greppet sluts
    const sluta = Math.max(3, (() => { for (let t = ti.raise0 + 1; t < ti.meet; t++) if (rest(t) >= 55) return ti.meet - t; return 1; })());
    // (handen är fri fram till nypet; de sista rutorna kommer den över kortets kant, på handryggens sida, med fingrarna öppna,
    // och sluts om kanten i bytets ruta: se handlederna nedan)
    fasta.R[ti.meet] = hNyp; nyp = {t: ti.meet, sluta, upp: mul(hNyp.a.palm, -KOREO.ovanfor), oppen: grepp.Soppen, hand: hNyp};
    // bärandet: lyftets väg, förskjuten från nypet till nedsättningen; handens axlar som version A (svängd mot platsen och rullad: framsidan upp före halva vägen)
    const Rbar0 = forskjut(L.R.w, new Map([[ti.meet, hNyp.w], [ti.nere, hNere.w]])), Rbar = Rbar0.map((p, t) => t > ti.meet && t < ti.meet + 3 ? lerp(hNyp.w, p, smooth((t - ti.meet) / 3)) : p);
    const A0 = hNyp.a, An = hNere.a, rulla = (A: Axes, x: number) => vridAxlar(A, A.forward, x), i01 = (x: number, a: number, c: number) => clamp01((x - a) / (c - a));
    const svangd = between(A0, {forward: An.forward, palm: turned(An.palm, An.forward, -rad(90 - sattGrader)), across: turned(An.across, An.forward, -rad(90 - sattGrader))}, 1);
    const axlarS = (sg: number): Axes => rulla(between(A0, svangd, mjuk(i01(sg, KOREO.svang, 1))), rad(90) * smooth(i01(sg, KOREO.rull[0], KOREO.rull[1])) - rad(sattGrader) * smooth(i01(sg, KOREO.rull[1], 1)));
    // (vändningen i takt med både tiden och lyftets väg, så att den inte sker på ett par rutor där lyftets hand rör sig fort)
    for (let t = ti.meet + 1; t < ti.nere; t++) { const sg = 0.5 * andelAvVagen(L.R.w, ti.meet, ti.nere, t) + 0.5 * (t - ti.meet) / (ti.nere - ti.meet), h: Hand = {a: axlarS(sg), w: Rbar[t], S: SK}; fasta.R[t] = h; C[t] = kortI(h, refK); harKort.R[t] = true; }
    fasta.R[ti.nere] = hNere; C[ti.nere] = lutat(sattGrader); harKort.R[ti.meet] = harKort.R[ti.nere] = true; C[ti.meet] = Kstar;
    // (hand och kort lyfta så mycket som håller dem ur filten medan kortet bärs, jämnat över rutorna intill)
    { const brist = fasta.R.map((h, t) => t > ti.meet && t < ti.nere && h ? Math.max(0, 0.002 - overFilten(h), 0.004 - kortLagst(C[t])) : 0);
      const lyft = brist.map((_, t) => Math.max(0, ...brist.map((x, j) => x * smooth(1 - Math.abs(t - j) / 4))));
      for (let t = ti.meet + 1; t < ti.nere; t++) if (lyft[t] > 0) { fasta.R[t] = flyttHand(fasta.R[t]!, [0, lyft[t], 0]); C[t] = flyttKort(C[t], [0, lyft[t], 0]); } }
    // nedsättningen: kortet läggs ned kring gångjärnet; handen från greppet till fingertopparna på framsidan, sökt ruta för
    // ruta så att den inte går i kortet eller filten och tummen eller en fingertopp ligger an (som koreo-giv.ts K6)
    const iKortet = (h: Hand, k: Kort) => iKortMarg(h, k, 1) + 1000 * Math.max(0, -overFilten(h));
    const nara = (h: Hand, k: Kort) => { const p = punkter(h), a = cross(k.n, k.l); return Math.min(...[4, 8, 12, 16, 20].map(j => { const d = sub(p[j], k.c); return Math.abs(dot(d, k.l)) < HK / 2 + 0.005 && Math.abs(dot(d, a)) < WK / 2 + 0.005 ? Math.abs(dot(d, k.n)) - T / 2 - (j === 4 ? topp.thumb : topp.finger) : Infinity; })); };
    const T0 = toppMitt(hNere), PT = toppMitt(hRest); let spar = [toppMitt(fasta.R[ti.nere - 1] ?? hNere), T0];
    for (let t = ti.nere + 1; t < ti.rests; t++) { const u = (t - ti.nere) / (ti.rests - ti.nere), k = lutat(sattGrader * (1 - mjuk(u))), S = formMellan(SK, SV, smooth(u / 0.7)), A = between(hNere.a, hRest.a, smooth(u));
      const nom = lerp(T0, PT, smooth(u)), Pnom = add(nom, [0, 0.015 * Math.sin(Math.PI * u), 0]), giss = sub(mul(spar[1], 2), spar[0]); let bast: {h: Hand; P: Vec3; c: number} | null = null;
      for (let dx = -0.02; dx <= 0.02 + 1e-9; dx += 0.005) for (let dy = -0.01; dy <= 0.035 + 1e-9; dy += 0.005) for (let dz = -0.02; dz <= 0.02 + 1e-9; dz += 0.005) for (let dr = -30; dr <= 30; dr += 10) {
        const P = add(Pnom, add(mul(Xp, dx), add([0, dy, 0], mul(Zp, dz)))), h = medToppar(vridAxlar(A, A.forward, rad(dr)), S, P);
        const c = 100 * iKortet(h, k) + (length(sub(P, Pnom)) / 0.01) ** 2 + (dr / 10) ** 2 + 2 * (length(sub(P, giss)) / 0.01) ** 2 + 10 * Math.max(0, nara(h, k) - 0.004) * 1000;
        if (!bast || c < bast.c) bast = {h, P, c}; }
      fasta.R[t] = bast!.h; C[t] = k; spar = [spar[1], bast!.P]; }
    for (let t = ti.rests; t < n; t++) C[t] = KL;
    for (let t = ti.rests; t <= ti.vila; t++) fasta.R[t] = vridHand(hRest, toppMitt(hRest), lyftAx, rad(KOREO.vilaLyft) * smooth((t - ti.rests) / (ti.vila - ti.rests)));
  }

  // Två varv: i det första rättas de fasta händerna (handen nära underarmens linje, se nedan), i det andra läggs de fria
  // händernas väg mellan de rättade, så att ingen hand hoppar där en fast del börjar eller slutar.
  const hip = b.ank.hip;
  const losa = () => {
  // ---- handlederna: fasta där händerna gör något med kortet eller vilar, annars lyftets väg förskjuten mellan dem
  const handerna: Record<Sida, Hand[]> = {R: [], L: []}, rattade: Record<Sida, (Hand | null)[]> = {R: Array(n).fill(null), L: Array(n).fill(null)}, rattatKort: Kort[] = C.slice();
  for (const [side] of SIDOR) {
    const lyftW = L[side].w;
    let W: Vec3[];
    // (i ändarna går handen mjukt ur och in i ankaret: stilla i första och sista rutan, som ankaret)
    // (och likaså ur och in i de fasta delarna: fyra rutor där handen sakta lämnar dem och sakta kommer fram till dem)
    // (efter sista fasta delen går handen in på lyftets egen väg, där dealern väntar på nästa kort, och till vilan först de sista
    // 15 rutorna)
    if (giv) { const sist = n - 1 - 15, nycklar = new Map(fasta[side].flatMap((h, t) => h && t < n - 1 ? [[t, h.w] as [number, Vec3]] : [])), senast = Math.max(...nycklar.keys());
      if (sist > senast + 4) nycklar.set(sist, lyftW[sist]);
      W = forskjut(lyftW, nycklar).map((w, t) => lerp(w, ank[side].w, smooth((t - sist) / 15))).map((w, t) => lerp(ank[side].w, w, smooth(Math.min(t, n - 1 - t) / 6)));
      const V = W.slice(), fa = fasta[side];
      for (let t = 1; t < n - 1; t++) { if (fa[t]) continue; let fore = -1, efter = -1; for (let j = t - 1; j >= Math.max(0, t - 4); j--) if (fa[j]) { fore = j; break; } for (let j = t + 1; j <= Math.min(n - 1, t + 4); j++) if (fa[j]) { efter = j; break; }
        if (fore > 0) V[t] = lerp(W[fore], V[t], smooth((t - fore) / 4)); if (efter >= 0 && efter < n - 1) V[t] = lerp(V[t], W[efter], smooth(1 - (efter - t) / 4)); }
      W = V; }
    else { const ref = medianV(lyftW); W = lyftW.map((w, t) => add(ank[side].w, mul(sub(w, ref), smooth(Math.min(t, n - 1 - t) / F)))); }
    handerna[side] = W.map((w, t) => { const h = fasta[side][t]; if (h) return h; if (!giv) return {...ank[side], w};
      const x = friHand(fri[side], fasta[side], lyftW, t);
      // (högern före nypet: över kortets kant på handryggens sida, fingrarna öppna, och ned på kanten medan greppet sluts)
      // (mot slutet saktar handen in mot nypet, ovanför kortets kant, där den sluts i bytets ruta)
      const fonster = nyp ? Math.max(6, 2 * nyp.sluta) : 0;
      if (side === 'R' && nyp && t < nyp.t && t >= nyp.t - fonster) { const u = (t - (nyp.t - fonster)) / fonster, s = smooth(u);
        return {a: between(x.a, nyp.hand.a, s), w: add(lerp(w, nyp.hand.w, s), mul(nyp.upp, Math.sin(Math.PI * u))), S: formMellan(x.S, nyp.oppen, s)}; }
      return {a: x.a, w, S: x.S}; });
    // (vänstern släpper kortet vid bytet: fingrarna och handen upp och bakåt ur kortets väg de första rutorna)
    if (giv && side === 'L' && tider) { const ti = tider;
      for (let t = ti.meet + 1; t < Math.min(n - 1, ti.meet + 9); t++) { const j = t - ti.meet, bump = Math.sin(Math.PI * Math.min(1, j / 8)), h = handerna.L[t];
        handerna.L[t] = flyttHand(h, add([0, 0.04 * bump, 0], mul(flat(mul(h.a.forward, -1)), 0.03 * bump))); } }
    // (de fria händernas form jämnad över rutorna, med de fasta händernas former kvar som de är)
    if (giv) { const Sj = Array.from({length: 21}, (_, k) => jamna(handerna[side].map(h => h.S[k]), 3)), bas = ank[side].S;
      handerna[side] = handerna[side].map((h, t) => fasta[side][t] ? h : {...h, S: paDockan(Sj.map(v => v[t]), bas)}); }
    // (en fri hand som annars skulle gå i kortet flyttas ut från det, längs kortets normal åt handledens sida, jämnat över rutorna intill)
    if (giv) { const sign = side === 'R' ? 1 : -1, genom = (h: Hand, k: Kort) => handFaults(punkter(h), sign, null, k).some(f => f.kind === 'kortet');
      const ut = handerna[side].map((h, t) => { if (fasta[side][t] || t === 0 || t === n - 1 || !genom(h, C[t])) return null; const k = C[t], d = mul(unit(k.n), Math.sign(dot(sub(h.w, k.c), k.n)) || 1);
        for (let x = 0.003; x <= 0.08; x += 0.003) if (!genom(flyttHand(h, mul(d, x)), k)) return mul(d, x + 0.002); return mul(d, 0.08); });
      const vikt = (j: number, t: number) => smooth(1 - Math.abs(t - j) / 5);
      handerna[side] = handerna[side].map((h, t) => { if (fasta[side][t] || t === 0 || t === n - 1) return h; let d: Vec3 = [0, 0, 0], mest = 0;
        ut.forEach((u, j) => { if (!u) return; const w = vikt(j, t), l = length(u) * w; if (l > mest) { mest = l; d = mul(u, w); } }); return mest > 0 ? flyttHand(h, d) : h; }); }
  }
  // ---- kroppen: bålen lutar mot den hand som inte når (ren-giv.ts rackvidd), jämnat; armbågarna; handen nära underarmens linje
  const behov = kropp.map((k, t) => { let best = {lean: 0, twist: 0, mot: handerna.R[t].w};
    for (const [side, i] of [['R', 0], ['L', 1]] as const) { const r = rackvidd(hip, k.S[i], [handerna[side][t].w], handerna[side][t].w, doll, REN.naturlig); if (r.lean > best.lean) best = {lean: r.lean, twist: r.twist, mot: handerna[side][t].w}; }
    return best; });
  const W8 = 8, lutn = behov.map((_, t) => Math.max(0, ...behov.map((x, j) => x.lean * smooth(1 - Math.abs(t - j) / (W8 + 1)))));
  const riktn = behov.map((_, t) => { let v: Vec3 = [0, 0, 0], tw = 0, sum = 0; behov.forEach((x, j) => { const w = x.lean * smooth(1 - Math.abs(t - j) / (W8 + 1)); if (w > 0) { v = add(v, mul(flat(sub(x.mot, hip)), w)); tw += (x.twist / (x.lean || 1)) * w; sum += w; } });
    return sum > 0 ? {mot: add(hip, unit(v)), kvot: tw / sum} : {mot: add(hip, [0, 0, 1]), kvot: 0}; });
  const frames: Frame[] = [], kvitto = {lutGrader: 0, handledMest: {R: 0, L: 0}, nadde: {R: 0, L: 0}};
  // (bålen i varje ruta, och händerna lyfta ur filten där de är fria)
  const torsos = kropp.map((k, t) => { const torso = bal(hip, riktn[t].mot, lutn[t], riktn[t].kvot * lutn[t]), h = torso(k.h, 0.85); kvitto.lutGrader = Math.max(kvitto.lutGrader, grad(lutn[t]));
    return {S: [torso(k.S[0]), torso(k.S[1])] as [Vec3, Vec3], h, g: add(h, sub(k.g, k.h))}; });
  for (const [side] of SIDOR) handerna[side] = handerna[side].map((hand, t) => { if (fasta[side][t]) return hand; const brist = -overFilten(hand); return brist > 0 ? flyttHand(hand, [0, brist, 0]) : hand; });
  // (armbågen: polen lyftets, tonad mot ankarets i ändarna; vridningen kring linjen axel–handled vald ruta för ruta och jämnad)
  // (i en väntan är händerna kvar i vilan, och armbågarna med dem)
  const polVid = (side: Sida, t: number) => giv ? unit(lerp(b.ank.pol[side], L[side].pol[t], smooth(Math.min(t, n - 1 - t) / F))) : b.ank.pol[side];
  // (armbågens läge runt linjen axel–handled som en vinkel från lodrätt nedåt, vald ruta för ruta, utvecklad och jämnad: så
  // byter armbågen aldrig sida på en ruta)
  const vrid: Record<Sida, number[]> = {R: [], L: []};
  for (const [side] of SIDOR) { const ra = handerna[side].map((hand, t) => { const s = torsos[t].S[side === 'R' ? 0 : 1], pol = polVid(side, t); return svang(s, hand.w, pol, armVrid(s, hand, pol, doll, kant)); });
    for (let t = 1; t < n; t++) { let d = ra[t] - ra[t - 1]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; ra[t] = ra[t - 1] + d; }
    vrid[side] = lagpass(ra, 2.5); }
  for (let t = 0; t < n; t++) {
    const {S, h, g} = torsos[t];
    let kort = C[t];
    const limbs = {} as Record<Sida, Limb>;
    for (const [side] of SIDOR) {
      const s = side === 'R' ? S[0] : S[1], pol = polVid(side, t), tw = vrid[side][t];
      let hand = handerna[side][t];
      if (t === 0 || t === n - 1) { limbs[side] = side === 'R' ? f0.R : f0.L; continue; }
      void pol; let e = armbageSvang(s, hand.w, tw, doll);
      // (handen högst så många grader från underarmen: vänstern 40 och högern 46 medan de håller kortet, annars 48; vriden mot
      // underarmen kring fingertopparna där de rör kortet, annars kring handleden; kortet med högern medan den bär det)
      // (medan båda händerna håller kortet, i nypet, rättas ingen av dem: greppen ligger fast på kortet)
      const mest = side === 'R' && giv && tider && t === tider.meet ? 180 : harKort[side][t] ? 46 : 48;
      // (en hand vars toppar ligger på kortet utan att bära det vrids bara så långt som inte för ett finger in i kortet)
      const bar = side === 'R' && giv && tider && t > tider.meet && t < tider.nere, sign = side === 'R' ? 1 : -1;
      const iKort = (hh: Hand) => iKortMarg(hh, kort, sign);
      for (let gang = 0; gang < 3; gang++) { const fore = unit(sub(hand.w, e)), fram = unit(sub(punkter(hand)[9], hand.w)); let x = vinkel(fram, fore) - rad(mest); if (x <= 0) break;
        const ax = unit(cross(fram, fore)), o = fasta[side][t] ? toppMitt(hand) : hand.w;
        if (fasta[side][t] && !bar) { const fore0 = iKort(hand); if (iKort(vridHand(hand, o, ax, x)) > fore0) { let lo = 0, hi = x; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (iKort(vridHand(hand, o, ax, m)) > fore0) hi = m; else lo = m; } x = lo; } }
        hand = vridHand(hand, o, ax, x);
        if (bar) kort = vridKort(kort, o, ax, x);
        // (en fri hand som vreds kring handleden lyfts åter ur filten)
        if (!fasta[side][t]) { const brist = -overFilten(hand); if (brist > 0) hand = flyttHand(hand, [0, brist, 0]); }
        e = armbageSvang(s, hand.w, tw, doll); }
      // (sist: en fri hand som ändå går i kortet flyttas ut ur det längs dess normal)
      if (giv && !fasta[side][t] && handFaults(punkter(hand), sign, null, kort).some(f => f.kind === 'kortet')) { const d = mul(unit(kort.n), Math.sign(dot(sub(hand.w, kort.c), kort.n)) || 1);
        for (let x = 0.002; x <= 0.1; x += 0.002) { const hh = flyttHand(hand, mul(d, x)); if (!handFaults(punkter(hh), sign, null, kort).some(f => f.kind === 'kortet')) { hand = hh; break; } }
        e = armbageSvang(s, hand.w, tw, doll); }
      if (fasta[side][t]) { rattade[side][t] = hand; if (side === 'R') rattatKort[t] = kort; }
      kvitto.handledMest[side] = Math.max(kvitto.handledMest[side], handled(e, hand));
      limbs[side] = {s: r4(s), e: r4(e), w: r4(hand.w), k: 1, p: punkter(hand).map(r4)};
      if (length(sub(hand.w, s)) > doll.upperArm + doll.forearm - 0.002) kvitto.nadde[side]++;
    }
    const a = t === 0 || t === n - 1 ? {} : Object.fromEntries(b.minen.bar.map(nm => [nm, Math.round(clamp01(b.minen.spar[nm][t] * smooth(Math.min(t, n - 1 - t) / F)) * 1000) / 1000]));
    // (första och sista rutan är ankaret; i den sista ligger kortet kvar där det lades)
    const kortet = {c: r4(kort.c), l: r4(unit(kort.l)), n: r4(unit(kort.n)), id: 0};
    frames.push(t === 0 ? {...f0, card: {...f0.card}} : t === n - 1 ? {...f0, card: kortet} : {card: kortet, R: limbs.R, L: limbs.L, h: r4(h), g: r4(g), a});
  }
  return {frames, kvitto, rattade, rattatKort};
  };
  const forsta = losa();
  for (const [side] of SIDOR) forsta.rattade[side].forEach((h, t) => { if (h && t > 0 && t < n - 1) fasta[side][t] = h; });
  forsta.rattatKort.forEach((k, t) => { C[t] = k; });
  const {frames, kvitto} = losa();
  // (kortets långsida åt samma håll i alla rutor)
  for (let t = 1; t < n; t++) if (dot(frames[t].card.l, frames[t - 1].card.l) < 0) frames[t].card.l = frames[t].card.l.map(x => -x) as Vec3;
  return {frames, tider, plats, sattGrader, kvitto, hander: {R: {godkand: fri.R.godkand, saknas: fri.R.saknas}, L: {godkand: fri.L.godkand, saknas: fri.L.saknas}}};
}

// ---- körningen -----------------------------------------------------------------------------------------------------------
const LYFTEN = (): string[] => readdirSync(LYFT).filter(f => f.endsWith('.json')).sort();
const VANTAN_FOR: Record<string, string> = {kameran: 'kameran-vantan-1.json', bordet: 'bordet-vantan-1.json'};
const las = <X>(fil: string): X => JSON.parse(readFileSync(fil, 'utf8')) as X;
const skriv = (fil: string, data: unknown) => writeFileSync(fil, JSON.stringify(data) + '\n');
const rel = (fil: string) => path.relative(CASINO, fil).split(path.sep).join('/');

export function ankaretFor(dockNamn: string) {
  const doll = LIVE_DOLLS[dockNamn]; if (!doll) throw Error(`Ingen docka vid livebordet heter ${dockNamn}.`);
  const stil = (Object.entries(LIVE.dealer.styles).find(([, d]) => d.name === dockNamn)![0]) as 'kameran' | 'bordet', vantanFil = path.join(LYFT, VANTAN_FOR[stil]);
  return {doll, stil, ank: ankaret(doll, stil, las<Lyft>(vantanFil), VANTAN_FOR[stil].replace('.json', '')), vantanFil};
}
function kor(lyftFil: string, dockNamn?: string) {
  const lyft = las<Lyft>(lyftFil), namn = dockNamn ?? lyft.docka, {doll, stil, ank, vantanFil} = ankaretFor(namn);
  if (lyft.style !== stil) console.log(`  (lyftet är stilen ${lyft.style}, dockan ${namn} stilen ${stil})`);
  const stilFil = las<Stil>(path.join(CASINO, `live-bj/data/stil-${lyft.style}.json`)), L = last(lyft, dollFrame(TABLE_LENS, doll).shoulders[0][2]);
  const ut = bygg({doll, stil, lyft, ank, minen: minen(L, stilFil)});
  const giv = lyft.leavesShoe !== undefined, nr = giv ? /seat (\d)/.exec(lyft.to!)![1] : /vantan-(\d)/.exec(lyftFil)![1];
  const fil = path.join(DATA, giv ? `lyft-${namn}-p${nr}.json` : `lyft-${namn}-vantan-${nr}.json`), ankFil = path.join(DATA, `ankare-vila-${namn}.json`);
  const ti = ut.tider, mm = (x: number) => Math.round(x * 1000);
  const about = giv
    ? `Dockan ${namn} ger ett kort till ${ut.plats}, lyftat ur livebordets film (${rel(lyftFil)}, filmens sekunder ${lyft.film_seconds.join('–')}) och lagt på dockans egen kropp av dealer3d/tools/lyft-till-docka.ts. Den riktiga dealerns: tiden (rutorna; vänsterhanden vid skon i ruta ${ti!.arrive}, draget ${ti!.pull}–${ti!.leaves}, bytet i ruta ${ti!.meet} där lyftets händer är som närmast, kortet ligger i ruta ${ti!.rests}), axlarnas och huvudets rörelse i sidled och höjd, blicken, handledernas väg i sidled och höjd, händernas form där den håller, och minen. Vårt eget: djupet (handen i vilan på filten, kortet i skons front, kortet på ${ut.plats} som LIVE.cards har det; däremellan lyftets väg förskjuten mjukt dit), bålens lutning där armen inte når, greppen (vänsterns fingertoppar på kortets rygg, högerns nyckelgrepp), kortets vändning som version A (rest på högkant före bytet, rullat framåt så att framsidan är uppe före halva vägen) och nedsättningen kring den fria långsidan (lutad ${ut.sattGrader} grader). Börjar och slutar i ${rel(ankFil)}.`
    : `Dockan ${namn} väntar, lyftat ur livebordets film (${rel(lyftFil)}, filmens sekunder ${lyft.film_seconds.join('–')}; där har dealern vänsterhanden vid "${lyft.left_at}" och högerhanden vid "${lyft.right_at}"). Dockan är i sin vila (${rel(ankFil)}) med lyftets små rörelser av handlederna och axlarna, och huvudet, blicken och minen som dealerns. Börjar och slutar i vilan.`;
  const motion = {fps: FPS, frameCount: ut.frames.length, ...(giv ? {leavesShoe: ti!.leaves, edge: [ti!.nere, ti!.nere], folds: ti!.nere, rests: ti!.rests} : {}), hip: ank.hip, doll: namn, ...(giv ? {to: [ut.plats], marke: {hander: 'tva', vands: 'pa-vagen', satts: 'langsida'}} : {}), about,
    made: {tool: 'dealer3d/tools/lyft-till-docka.ts', lift: rel(lyftFil), doll: namn, from: rel(ankFil), to: rel(ankFil), sources: {[rel(lyftFil)]: sha(lyftFil), [rel(vantanFil)]: sha(vantanFil), 'blackjack-dealer/src/table-live.ts': sha(path.join(ROOT, 'src/table-live.ts'))},
      times: ti, filter: 'Butterworth 2:a ordningen, 6 Hz, framåt och bakåt (nollfas)', hands: ut.hander, chosen: {sattGrader: ut.sattGrader, ...ut.kvitto}},
    frames: ut.frames};
  skriv(fil, motion);
  skriv(ankFil, {about: ank.about, doll: namn, style: stil, hip: ank.hip, frame: ank.frame, made: {tool: 'dealer3d/tools/lyft-till-docka.ts', waiting: rel(vantanFil), sources: {[rel(vantanFil)]: sha(vantanFil), 'blackjack-dealer/src/table-live.ts': sha(path.join(ROOT, 'src/table-live.ts'))}}});
  console.log(`${path.basename(fil)}: ${ut.frames.length} rutor${giv ? `, ${ut.plats}, skon ${ti!.arrive}/${ti!.pull}/${ti!.leaves}, bytet ${ti!.meet} (${mm(ti!.avstandVidBytet)} mm), nere ${ti!.nere}, ligger ${ti!.rests}, lutat ${ut.sattGrader}°` : ''}; bålen högst ${ut.kvitto.lutGrader.toFixed(1)}°, handleden högst ${ut.kvitto.handledMest.R.toFixed(0)}/${ut.kvitto.handledMest.L.toFixed(0)}°, når inte ${ut.kvitto.nadde.R}/${ut.kvitto.nadde.L}; lyftets händer godkända ${Math.round(ut.hander.R.godkand * 100)}/${Math.round(ut.hander.L.godkand * 100)} %`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--alla')) for (const f of LYFTEN()) kor(path.join(LYFT, f));
  else { const [fil, docka] = process.argv.slice(2); if (!fil) throw Error('Användning: node dealer3d/tools/lyft-till-docka.ts <lyftet.json> <docka> | --alla'); kor(path.resolve(fil), docka); }
}
