// Armarna över bordets kant: en automatisk rättning av grundrörelsen. Rörelserna är gjorda för ett bord vars kant låg 15 cm
// längre bort, och där hängde armbågarna under filtens nivå; vid det närmare bordet går underarmen då genom kanten och
// markerbrickans bakvägg. Jakobs regel (standarddocka/AGENTS.md): armarna går aldrig genom bordets kant. Därför vrids
// armbågen ut och upp kring linjen axel–handled (handen ligger kvar där den låg), ruta för ruta precis så mycket att
// underarmen ligger minst ARMAR.luft över skivan där den är över bordet, och vridningen tonas in och ut över tiden.
// Mätt på mannen själv: hans leder som dockans kod ställer dem och hans underarms tjocklek på huden. Här mäts också
// kroppens mått för spärren i kropp.ts (matKropp), på samma sätt.
import * as T from 'three';
import {qrot, type Foljd, type Frame, type Q, type V3} from './rorelse.ts';
import {balensAxlar, iBalensAxlar, type Arm, type Bord, type Kroppsmatt} from './kropp.ts';

/**
 * luft: minsta luft under underarmen över bordet (meter). handen: den del av underarmen närmast handleden som får ligga
 * på filten (handen vilar där). utjamning: hur långt (sekunder) en vridning tonas in och ut. mestGrader: mest armbågen vrids.
 */
export const ARMAR = {luft: 0.01, handen: 0.2, utjamning: 0.35, mestGrader: 100};
export type Kropp = {pose(f: Frame, hip: number[]): void; bone(name: string): T.Vector3; hud: T.SkinnedMesh};
const SIDOR = [['R', 'Right'], ['L', 'Left']] as const;

/** Det ben som väger tyngst för varje punkt på huden (index i skelettets benlista). */
function tyngstaBen(m: T.SkinnedMesh): Int32Array {
  const idx = m.geometry.attributes.skinIndex, vikt = m.geometry.attributes.skinWeight, ut = new Int32Array(idx.count).fill(-1);
  for (let i = 0; i < idx.count; i++) { let bv = 0; for (let j = 0; j < 4; j++) { const w = vikt.getComponent(i, j); if (w > bv) { bv = w; ut[i] = idx.getComponent(i, j); } } }
  return ut;
}
/** Ett bens tjocklek (radie i meter) i tio fack längs det, från leden `E` (0) till leden `W` (1), mätt på huden som den sitter nu. */
function fack(k: Kropp, namn: string, E: T.Vector3, W: T.Vector3): number[] {
  const m = k.hud, ben = m.skeleton.bones.findIndex(b => b.name === namn), d = W.clone().sub(E), L = d.length();
  d.normalize(); m.skeleton.update();
  const tyngst = tyngstaBen(m), fack = new Array<number>(10).fill(0), p = new T.Vector3();
  for (let i = 0; i < tyngst.length; i++) {
    if (tyngst[i] !== ben) continue;
    m.getVertexPosition(i, p).applyMatrix4(m.matrixWorld); const r = p.clone().sub(E), along = r.dot(d), s = along / L; if (s < 0 || s > 1) continue;
    const f = Math.min(9, Math.floor(s * 10)); fack[f] = Math.max(fack[f], r.sub(d.clone().multiplyScalar(along)).length());
  }
  const störst = Math.max(...fack); for (let f = 0; f < 10; f++) if (!fack[f]) fack[f] = störst; // tomma fack (ingen hud räknad dit): den tjockaste delen
  return fack;
}
/** Underarmens tjocklek (radie i meter) längs den, från armbågen (0) till handleden (1), mätt på huden som den sitter nu. */
function tjocklek(k: Kropp, sida: 'Right' | 'Left'): (s: number) => number {
  const f = fack(k, `${sida}ForeArm`, k.bone(`${sida}ForeArm`), k.bone(`${sida}Hand`));
  return s => f[Math.min(9, Math.max(0, Math.floor(s * 10)))];
}

/** Bålens ben (huden som hänger tyngst på dem är bålen) och huvudets (Head och benen under det, ansiktets). */
const BAL = new Set(['Hips', 'Spine', 'Spine1', 'Spine2', 'LeftShoulder', 'RightShoulder', 'neck']);
/**
 * Kroppens mått för spärren (kropp.ts), mätta på huden en gång i ställningen `f`, i bålens egna axlar. Bålen: skivor
 * var 2 cm på höjden, från det lägsta till det högsta av huden som hänger på bålens ben; varje skiva har sin mitt
 * (mitt i dess utbredning) och sin radie åt 24 håll (den yttersta huden åt det hållet; tomma håll fylls från grannarna,
 * tomma skivor från närmaste skiva). Huvudet: en kula kring huden på huvudets ben, med radien som medlet av dess tre
 * halva mått. Armarna: modellens axelleder, benlängderna och tjockleken längs överarmen och underarmen. Mannen och
 * kvinnan mäts var för sig av samma kod.
 */
export function matKropp(k: Kropp, f: Frame, hip: number[]): Kroppsmatt {
  k.pose(f, hip); const m = k.hud; m.skeleton.update();
  const a = balensAxlar(f, hip), tyngst = tyngstaBen(m), ben = m.skeleton.bones, p = new T.Vector3();
  const iHuvudet = ben.map(b => { for (let x: T.Object3D | null = b; x; x = x.parent) if (x.name === 'Head') return true; return false; }), iBal = ben.map(b => BAL.has(b.name));
  const bal: V3[] = [], huvud: V3[] = [];
  for (let i = 0; i < tyngst.length; i++) { const b = tyngst[i]; if (b < 0 || !(iBal[b] || iHuvudet[b])) continue;
    m.getVertexPosition(i, p).applyMatrix4(m.matrixWorld); (iBal[b] ? bal : huvud).push(iBalensAxlar(a, [p.x, p.y, p.z])); }
  const DY = 0.02, N = 24; let lagst = Infinity, hogst = -Infinity; for (const q of bal) { lagst = Math.min(lagst, q[1]); hogst = Math.max(hogst, q[1]); }
  const antal = Math.max(2, Math.ceil((hogst - lagst) / DY) + 1), lager: V3[][] = Array.from({length: antal}, () => []);
  for (const q of bal) lager[Math.min(antal - 1, Math.round((q[1] - lagst) / DY))].push(q);
  const skivor = lager.map(l => { if (!l.length) return null;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const q of l) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[2]); z1 = Math.max(z1, q[2]); }
    const x = (x0 + x1) / 2, z = (z0 + z1) / 2, r = new Array<number>(N).fill(0);
    for (const q of l) { const j = ((Math.round(Math.atan2(q[2] - z, q[0] - x) / (2 * Math.PI) * N) % N) + N) % N; r[j] = Math.max(r[j], Math.hypot(q[0] - x, q[2] - z)); }
    const har = r.map((v, j) => v > 0 ? j : -1).filter(j => j >= 0);
    const fylld = r.map((v, j) => { if (v > 0) return v; const fore = [...har].reverse().find(i => i < j) ?? har[har.length - 1] - N, efter = har.find(i => i > j) ?? har[0] + N;
      const rf = r[(fore + N) % N], re = r[efter % N]; return rf + (re - rf) * (j - fore) / (efter - fore); });
    return {x, z, r: fylld}; });
  const finns = skivor.map((s, i) => s ? i : -1).filter(i => i >= 0);
  const hela = skivor.map((s, i) => s ?? skivor[finns.reduce((b, j) => Math.abs(j - i) < Math.abs(b - i) ? j : b, finns[0])]!);
  let lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const q of huvud) { lo = lo.map((v, i) => Math.min(v, q[i])) as V3; hi = hi.map((v, i) => Math.max(v, q[i])) as V3; }
  const armar = Object.fromEntries(SIDOR.map(([s, namn]) => { const S = k.bone(`${namn}Arm`), E = k.bone(`${namn}ForeArm`), W = k.bone(`${namn}Hand`);
    return [s, {axel: iBalensAxlar(a, [S.x, S.y, S.z]), over: S.distanceTo(E), under: E.distanceTo(W), tjockOver: fack(k, `${namn}Arm`, S, E), tjockUnder: fack(k, `${namn}ForeArm`, E, W)} as Arm]; })) as Record<'R' | 'L', Arm>;
  return {bal: {y0: lagst, dy: DY, skivor: hela}, huvud: {c: lo.map((v, i) => (v + hi[i]) / 2) as V3, r: ((hi[0] - lo[0]) + (hi[1] - lo[1]) + (hi[2] - lo[2])) / 6}, armar};
}

/** Minsta luft under underarmen från armbågen E till handleden W där den är över bordet (framför kanten); Infinity om den inte är det. */
function luftUnder(E: T.Vector3, W: T.Vector3, r: (s: number) => number, bord: Bord): number {
  let minst = Infinity; const P = new T.Vector3();
  for (let k = 0; k <= 24; k++) { const s = k / 24 * (1 - ARMAR.handen); P.copy(E).lerp(W, s); if (P.z <= bord.kantZ) continue; minst = Math.min(minst, P.y - r(s) - bord.skivaY); }
  return minst;
}
const kvat = (axel: number[], vinkel: number): Q => { const s = Math.sin(vinkel / 2); return [axel[0] * s, axel[1] * s, axel[2] * s, Math.cos(vinkel / 2)]; };
const smooth = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };

/** Mäter armarna i varje ruta: minsta luft (meter) och hur många grader armbågen behöver vridas ut för att få ARMAR.luft. */
function mät(f: Foljd, k: Kropp, r: Record<'R' | 'L', (s: number) => number>, bord: Bord) {
  return f.frames.map(frame => { k.pose(frame, f.hip);
    return Object.fromEntries(SIDOR.map(([s, namn]) => {
      const S = k.bone(`${namn}Arm`), E = k.bone(`${namn}ForeArm`), W = k.bone(`${namn}Hand`), luft = luftUnder(E, W, r[s], bord);
      // Utåt: den väg kring linjen axel–handled som för armbågen bort från kroppen (hans höger är -x).
      const dir = W.clone().sub(S).normalize(), C = S.clone().addScaledVector(dir, E.clone().sub(S).dot(dir)), o = E.clone().sub(C), vridd = (g: number) => C.clone().add(o.clone().applyAxisAngle(dir, g * Math.PI / 180));
      const ut = (vridd(5).x - E.x) * (s === 'R' ? -1 : 1) > 0 ? 1 : -1;
      let grader = 0; if (luft < ARMAR.luft) { grader = ARMAR.mestGrader; for (let g = 1; g <= ARMAR.mestGrader; g++) if (luftUnder(vridd(ut * g), W, r[s], bord) >= ARMAR.luft) { grader = g; break; } }
      return [s, {luft, grader: grader * ut}];
    })) as Record<'R' | 'L', {luft: number; grader: number}>; });
}

/**
 * Mäter armarna i en färdig rörelse (rutor med ändringarna i, som de sparas): minsta luft under underarmarna över bordet
 * i millimeter (negativ: genom bordet) och hur många rutor en underarm går genom det. Regeln ovan rättar grundrörelsen;
 * det han själv drar i efteråt kan föra en arm ned igen, så det sparade mäts för sig.
 */
export function matArmar(rutor: readonly Frame[], hip: number[], k: Kropp, bord: Bord) {
  k.pose(rutor[0], hip); const r = {R: tjocklek(k, 'Right'), L: tjocklek(k, 'Left')}, luft: Record<'R' | 'L', number[]> = {R: [], L: []};
  for (const ruta of rutor) { k.pose(ruta, hip); for (const [s, namn] of SIDOR) { const l = luftUnder(k.bone(`${namn}ForeArm`), k.bone(`${namn}Hand`), r[s], bord); if (Number.isFinite(l)) luft[s].push(l); } }
  const en = (l: number[]) => ({minstMm: l.length ? Math.round(Math.min(...l) * 1000) : null, genomRutor: l.filter(x => x < 0).length});
  return {R: en(luft.R), L: en(luft.L)};
}

/**
 * Rättar följdens grundrutor på plats och säger hur mycket luft det var före och efter (minsta luft i millimeter, negativ:
 * genom bordet, och hur många rutor som gick genom kanten).
 */
export function lyftArmar(f: Foljd, k: Kropp, bord: Bord) {
  k.pose(f.frames[0], f.hip);
  const r = {R: tjocklek(k, 'Right'), L: tjocklek(k, 'Left')}, summa = (m: ReturnType<typeof mät>) => Object.fromEntries(SIDOR.map(([s]) => {
    const l = m.map(x => x[s].luft).filter(Number.isFinite); return [s, {minstMm: l.length ? Math.round(Math.min(...l) * 1000) : null, genomRutor: l.filter(x => x < 0).length, underLuftRutor: l.filter(x => x < ARMAR.luft - 0.0005).length}];
  }));
  let m = mät(f, k, r, bord); const fore = summa(m), totalt = f.frames.map(() => ({R: 0, L: 0})), N = Math.round(ARMAR.utjamning * f.fps);
  for (let varv = 0; varv < 3 && m.some(x => x.R.grader || x.L.grader); varv++) {
    for (const [s] of SIDOR) {
      // Tonas in och ut: varje ruta får minst den vridning grannarna behöver, avtagande mjukt över ARMAR.utjamning.
      const vill = m.map(x => x[s].grader), jämnad = vill.map((_, i) => { let bäst = 0; for (let j = Math.max(0, i - N); j <= Math.min(vill.length - 1, i + N); j++) { const g = vill[j] * smooth(1 - Math.abs(i - j) / (N + 1)); if (Math.abs(g) > Math.abs(bäst)) bäst = g; } return bäst; });
      f.frames.forEach((frame, i) => { if (!jämnad[i]) return; const limb = frame[s], axel = [limb.w[0] - limb.s[0], limb.w[1] - limb.s[1], limb.w[2] - limb.s[2]], l = Math.hypot(...axel);
        const q = kvat(axel.map(n => n / l), jämnad[i] * Math.PI / 180), e = qrot(q, [limb.e[0] - limb.s[0], limb.e[1] - limb.s[1], limb.e[2] - limb.s[2]]);
        limb.e = [limb.s[0] + e[0], limb.s[1] + e[1], limb.s[2] + e[2]] as V3; totalt[i][s] += jämnad[i]; });
    }
    m = mät(f, k, r, bord);
  }
  const mest = Object.fromEntries(SIDOR.map(([s]) => [s, Math.round(Math.max(...totalt.map(t => Math.abs(t[s]))))]));
  return {fore, efter: summa(m), mestGrader: mest, rutorVridna: totalt.filter(t => t.R || t.L).length};
}
