// Det lyftet av en riktig dealers rörelse (dealer3d/tools/lyft-till-docka.ts) lånar för att lägga den på en docka: hur
// långt armen sträcks innan bålen tar resten (räckvidden och bålens lutning), underarmens luft över bordets kant, en
// handform en del av vägen till en annan, kulorna handens punkter ritas med, och två mjuka kurvor. Rent: ingen I/O och
// ingen three.js.
import {add, cross, dot, length, mul, sub, unit, type Vec3} from '../../src/space.ts';
import {turned} from './body.ts';
import type {Doll} from './doll.ts';
import {FINGERS, shapeBetween} from './hand-pose.ts';
import {bendsOf, fingerFrom} from './hand-rule.ts';

/**
 * Armens marginaler, meter: när bålens lutning väljs sträcks armen högst till sin längd minus `marginal`; i varje ruta
 * högst till sin längd minus `naturlig` (armbågen böjd minst 30 grader), och bålen tar resten.
 */
export const REN = {marginal: 0.012, naturlig: 0.025};
const UP: Vec3 = [0, 1, 0];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
export const mjuk = (x: number) => { const t = clamp01(x); return t * t * t * (10 + t * (-15 + 6 * t)); };
const mm = (m: number) => Math.round(m * 10000) / 10;
const flat = (v: Vec3): Vec3 => unit([v[0], 0, v[2]]);

const KNUCKLES = [5, 9, 13, 17];
/** Radien varje punkt av handen ritas med: handleden, knogarna, tummens första led och de andra lederna och topparna. */
export const BALL = (k: number) => k === 0 ? 0.0125 : k === 1 || KNUCKLES.includes(k) ? 0.0105 : k === 2 ? 0.0088 : 0.0082;

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

/** Bålen vriden kring höften: lutad `lean` mot `mot` och vriden `twist` kring den lutade ryggen. */
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
