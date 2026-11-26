// Standarddockans hud ställd som dealer3d/src/figure-model.ts ställer den (utan three.js), för att mäta det kroppen
// gör med en rörelse: handen och fingrarna (lagda efter rörelsens 21 handpunkter, med handleden högst 50 grader från
// underarmen och varje fingerben vridet den kortaste vägen, som figure-model.ts gör), underarmens tjocklek (som
// standarddocka/editor/armar.ts mäter den), magen och låren. Huden böjs som skelettet böjer den: varje hörn efter
// lederna det hänger på, med sina vikter. Bara läsning.
import {add, cross, dot, length, mul, sub, unit, type Vec3} from '../src/camera.ts';
import {turned} from '../src/body.ts';
import {lasDelar, lasDocka} from './modell.ts';
import {larRiktning} from '../src/sitter.ts';
import {fingertopp} from '../src/fingertopp.ts';
import {dealerEdge} from '../src/world.ts';
import {TABLE_BASE, TABLE_LENS} from '../../src/table-lens.ts';

/**
 * Standarddockans bord (avatar-auto-pipeline/scen/bygg_bord.py --kant-bak): modellen, och hur långt bakom spelets kant
 * dealerkanten och markerbrickan ligger (Jakob 2026-11-26: dockorna "aningen till mot bordet", utan att röra kortplanen
 * eller skon). Modellen kan vara byggd med en annan kant; bordet() räknar då kanten dit kantBak säger.
 */
export const STANDARDBORD = {fil: 'avatar-auto-pipeline/assets/bord/standardbord_nara23.glb', kantBak: 0.23};
/** Underarmarnas luft över bordets kant (dealer3d/src/ren-giv.ts Kant) för dockan `d` vid bordet `bord`: editorn i standarddocka vill ha 1 cm (armar.ts), här 12 mm. */
export const kantFor = (d: Docka, bord: ReturnType<typeof bordet>) => { const r = underarmRadie(d, 'Right'), l = underarmRadie(d, 'Left');
  return {z: bord.kantZ, y: bord.skivaY, radie: r.map((x, k) => Math.max(x, l[k])), luft: 0.012, handen: 0.2}; };

/** En låda vriden kring lodlinjen: mitten, de två vågräta axlarna, halva längderna längs dem, och lägsta och högsta y. */
export type Lada = {c: Vec3; a: [Vec3, Vec3]; halv: [number, number]; y: [number, number]};
/** Lådan kring ett moln av punkter, med de vågräta axlarna där molnet är längst och bredast. */
function ladaKring(h: Vec3[]): Lada {
  const c = mul(h.reduce((s, p) => add(s, p), [0, 0, 0] as Vec3), 1 / h.length); let xx = 0, xz = 0, zz = 0;
  for (const p of h) { const dx = p[0] - c[0], dz = p[2] - c[2]; xx += dx * dx; xz += dx * dz; zz += dz * dz; }
  const t = 0.5 * Math.atan2(2 * xz, xx - zz), a: [Vec3, Vec3] = [[Math.cos(t), 0, Math.sin(t)], [-Math.sin(t), 0, Math.cos(t)]];
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity]; let ylo = Infinity, yhi = -Infinity;
  for (const p of h) { const d = sub(p, c); for (const j of [0, 1]) { const v = dot(d, a[j]); lo[j] = Math.min(lo[j], v); hi[j] = Math.max(hi[j], v); } ylo = Math.min(ylo, p[1]); yhi = Math.max(yhi, p[1]); }
  const mitt = add(add(c, mul(a[0], (lo[0] + hi[0]) / 2)), mul(a[1], (lo[1] + hi[1]) / 2));
  return {c: [mitt[0], 0, mitt[2]], a, halv: [(hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2], y: [ylo, yhi]};
}
/** Hur långt punkten `p` är från lådan (meter); negativ: inne i den, så djupt. */
export function franLadan(l: Lada, p: Vec3): number {
  const d = sub(p, l.c), u = [Math.abs(dot(d, l.a[0])) - l.halv[0], Math.abs(dot(d, l.a[1])) - l.halv[1], Math.max(l.y[0] - p[1], p[1] - l.y[1])];
  const ute = Math.hypot(...u.map(x => Math.max(0, x))); return ute > 0 ? ute : Math.max(...u);
}

/**
 * Bordet standarddockan sitter vid (avatar-auto-pipeline/assets/bord/standardbord_nara.glb, ställt som
 * standarddocka/editor/scen.ts ställer det): kanten mot dealern och filtens höjd (filtens närmaste kant, som editorn mäter
 * den), markerbrickans främre kant (spelarnas sida), sargens underkant (låren går under den), och skon (kroppen och
 * fronten med mynningen) som vridna lådor. `kantBak`: dealerkanten så många meter bakom spelets kant i stället för där
 * modellen har den (bygg_bord.py --kant-bak); kanten, brickan och sargen flyttas då med, skon och korten står kvar.
 */
export function bordet(fil: string, kantBak?: number) {
  const K = dealerEdge(TABLE_LENS), delar = lasDelar(fil, [0, TABLE_BASE.floor, K[2]]), del = (n: string) => { const h = delar.get(n); if (!h) throw Error(`Bordet saknar ${n}.`); return h; };
  const lo = (h: Vec3[], j: number) => h.reduce((m, q) => Math.min(m, q[j]), Infinity), hi = (h: Vec3[], j: number) => h.reduce((m, q) => Math.max(m, q[j]), -Infinity);
  const filt = del('bord_filt'), bricka = [...delar].filter(([n]) => n.startsWith('bricka_')).flatMap(([, h]) => h), kantZ = lo(filt, 2), dz = kantBak === undefined ? 0 : K[2] - kantBak - kantZ;
  return {kantZ: kantZ + dz, kantBak: Math.round((K[2] - kantZ - dz) * 10000) / 10000, skivaY: hi(filt, 1), brickaFram: hi(bricka, 2) + dz, brickaX: [lo(bricka, 0), hi(bricka, 0)], sargUnder: lo(del('bord_sarg'), 1),
    sko: {kropp: ladaKring(del('sko_kropp')), front: ladaKring(del('sko_front'))}};
}

type Docka = ReturnType<typeof lasDocka>;
type R3 = [Vec3, Vec3, Vec3]; // en vridning som tre kolumner
const rot = (R: R3, v: Vec3): Vec3 => add(add(mul(R[0], v[0]), mul(R[1], v[1])), mul(R[2], v[2]));
const efter = (A: R3, B: R3): R3 => [rot(A, B[0]), rot(A, B[1]), rot(A, B[2])];
const I: R3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
/** Den kortaste vridningen som för enhetsvektorn a till b. */
function kortast(a: Vec3, b: Vec3): R3 { const ax = cross(a, b), s = length(ax), c = dot(a, b); if (s < 1e-12) return c > 0 ? I : (() => { const o = unit(Math.abs(a[0]) < 0.9 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0])); return I.map(e => turned(e, o, Math.PI)) as R3; })();
  const k = mul(ax, 1 / s), ang = Math.atan2(s, c); return I.map(e => turned(e, k, ang)) as R3; }
/** Vridningen som för axlarna (fram, handflata, tvärs) `fran` till `till`. */
const mellanAxlar = (fran: R3, till: R3): R3 => { const M = (v: Vec3) => add(add(mul(till[0], dot(fran[0], v)), mul(till[1], dot(fran[1], v))), mul(till[2], dot(fran[2], v))); return [M([1, 0, 0]), M([0, 1, 0]), M([0, 0, 1])]; };
const flatt = (n: Vec3, axel: Vec3) => unit(sub(n, mul(axel, dot(n, axel))));
const FINGRAR = [['Thumb', 1], ['Index', 5], ['Middle', 9], ['Ring', 13], ['Pinky', 17]] as const, WRIST = 50 * Math.PI / 180;
const tung = (d: Docka) => d.hud.pa.map(p => d.hud.leder[p.reduce((a, b) => b.vikt > a.vikt ? b : a).led]);

/**
 * Handens hud på sidan `sida` ('Right' hans högra, 'Left' den vänstra). `stall(p, armbage)` ger hudens hörn på handen och
 * fingrarna (de som till minst hälften hänger på handens eller fingrarnas leder) med handen lagd efter rörelsens 21
 * punkter `p` (handleden p[0]) och underarmen från `armbage`, som figure-model.ts lägger den: handleden på rörelsens,
 * handen längs långfingrets knoge och med handflatan som punkternas (högst 50 grader från underarmen), och varje
 * fingerben vridet den kortaste vägen så att det pekar som rörelsens. Leder det på, vilka fingrar (0 tummen … 4
 * lillfingret, -1 handflatan) varje hörn hör till står i `finger`.
 */
export function handHud(d: Docka, sida: 'Right' | 'Left') {
  const sign = sida === 'Right' ? 1 : -1, led = d.led, W0 = led(`${sida}Hand`), F0 = led(`${sida}ForeArm`);
  const ben = FINGRAR.map(([namn]) => [1, 2, 3].map(n => `${sida}Hand${namn}${n}`)), huvud0 = ben.map(f => f.map(led));
  // (figure-model.ts fingerWays: det tredje benet mot toppen på huden, fingertopp.ts)
  const vag0 = huvud0.map((h, k) => [0, 1, 2].map(n => { const t = n === 2 ? fingertopp(h[1], h[2], d.pa(ben[k][2])) : null; return unit(t ? sub(t.punkt, h[2]) : sub(h[Math.min(n, 1) + 1], h[Math.min(n, 1)])); }));
  const axlar = (w: Vec3, i: Vec3, m: Vec3, l: Vec3): R3 => { const f = unit(sub(m, w)), p = flatt(mul(cross(sub(i, w), sub(l, w)), sign), f); return [f, p, cross(p, f)]; };
  const A0 = axlar(W0, huvud0[1][0], huvud0[2][0], huvud0[4][0]);
  const namnTill = new Map<string, number>(); namnTill.set(`${sida}Hand`, 0); ben.forEach((f, k) => f.forEach((n, j) => namnTill.set(n, 1 + k * 3 + j))); namnTill.set(`${sida}ForeArm`, 16);
  const dom = tung(d), horn: number[] = [], finger: number[] = [];
  d.hud.horn.forEach((_, i) => { const dm = dom[i]; if (!namnTill.has(dm) || dm === `${sida}ForeArm`) return; const pa = d.hud.pa[i], tot = pa.reduce((s, x) => s + (namnTill.has(d.hud.leder[x.led]) ? x.vikt : 0), 0);
    if (tot < 0.99) return; horn.push(i); const k = namnTill.get(dm)!; finger.push(k === 0 ? -1 : Math.floor((k - 1) / 3)); });
  const huvudVila = [W0, ...huvud0.flat(), F0];
  function stall(p: Vec3[], armbage: Vec3) {
    const fore = unit(sub(p[0], armbage)); let fram = unit(sub(p[9], p[0])); const fraga = Math.acos(Math.max(-1, Math.min(1, dot(fore, fram))));
    if (fraga > WRIST) { const ax = unit(cross(fore, fram)); fram = turned(fore, ax, WRIST); }
    const palm = flatt(mul(cross(sub(p[5], p[0]), sub(p[17], p[0])), sign), fram), A: R3 = [fram, palm, cross(palm, fram)], Rh = mellanAxlar(A0, A);
    const Rs: R3[] = [Rh], H: Vec3[] = [p[0]];
    FINGRAR.forEach(([, start], k) => { let Rp = Rh, hp0 = W0, hp = p[0];
      for (let n = 0; n < 3; n++) { const h0 = huvud0[k][n], h = add(hp, rot(Rp, sub(h0, hp0))), till = sub(p[start + n + 1], p[start + n]);
        const R = length(till) > 1e-6 ? efter(kortast(rot(Rp, vag0[k][n]), unit(till)), Rp) : Rp; Rs.push(R); H.push(h); Rp = R; hp0 = h0; hp = h; } });
    const Rf = kortast(unit(sub(W0, F0)), fore); Rs.push(Rf); H.push(armbage);
    return horn.map(i => { const v0 = d.hud.horn[i]; let o: Vec3 = [0, 0, 0];
      for (const x of d.hud.pa[i]) { const k = namnTill.get(d.hud.leder[x.led]); if (k === undefined) continue; o = add(o, mul(add(H[k], rot(Rs[k], sub(v0, huvudVila[k]))), x.vikt)); }
      return o; });
  }
  return {stall, finger, antal: horn.length};
}

/** Underarmens radie på huden i tio delar från armbågen till handleden (meter), som standarddocka/editor/armar.ts mäter den. */
export function underarmRadie(d: Docka, sida: 'Right' | 'Left'): number[] {
  const E = d.led(`${sida}ForeArm`), W = d.led(`${sida}Hand`), r = unit(sub(W, E)), L = length(sub(W, E)), fack = new Array<number>(10).fill(0), dom = tung(d);
  d.hud.horn.forEach((p, i) => { if (dom[i] !== `${sida}ForeArm`) return; const q = sub(p, E), a = dot(q, r), s = a / L; if (s < 0 || s > 1) return; const f = Math.min(9, Math.floor(s * 10)); fack[f] = Math.max(fack[f], length(sub(q, mul(r, a)))); });
  const storst = Math.max(...fack); return fack.map(x => x || storst);
}

/**
 * Kroppen i vilopose mot axellederna: hur långt magen (bålens hud, inom 20 cm från mitten) når fram framför axelledernas
 * mitt mellan höjderna `fran` och `till` under den (meter, framåt +z), och lårens hud, ställda som figure-model.ts
 * ställer dem (fram under bordet), som punkter mot axelledernas mitt.
 */
export function kroppen(d: Docka) {
  const mid = mul(add(d.led('RightArm'), d.led('LeftArm')), 0.5), dom = tung(d), BAL = new Set(['Hips', 'Spine', 'Spine1', 'Spine2']);
  const mage = (fran: number, till: number) => Math.max(-Infinity, ...d.hud.horn.filter((p, i) => BAL.has(dom[i]) && Math.abs(p[0] - mid[0]) < 0.2 && mid[1] - p[1] >= fran && mid[1] - p[1] <= till).map(p => p[2] - mid[2]));
  /** Lårens hud, ställd som figure-model.ts ställer den för höften på höjden `hoftY` (dealer3d/src/sitter.ts), mot axelledernas mitt. */
  const lar = (hoftY: number) => (['Right', 'Left'] as const).flatMap((s, i) => { const h = d.led(`${s}UpLeg`), k = d.led(`${s}Leg`), R = kortast(unit(sub(k, h)), unit(larRiktning(hoftY, !i)));
    return d.hud.horn.filter((_, j) => dom[j] === `${s}UpLeg`).map(p => sub(add(h, rot(R, sub(p, h))), mid)); });
  return {mage, lar};
}
