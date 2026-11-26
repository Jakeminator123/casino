// Armarna över bordets kant: en automatisk rättning av grundrörelsen. Rörelserna är gjorda för ett bord vars kant låg 15 cm
// längre bort, och där hängde armbågarna under filtens nivå; vid det närmare bordet går underarmen då genom kanten och
// markerbrickans bakvägg. Jakobs regel (standarddocka/AGENTS.md): armarna går aldrig genom bordets kant. Därför vrids
// armbågen ut och upp kring linjen axel–handled (handen ligger kvar där den låg), ruta för ruta precis så mycket att
// underarmen ligger minst ARMAR.luft över skivan där den är över bordet, och vridningen tonas in och ut över tiden.
// Mätt på mannen själv: hans leder som dockans kod ställer dem och hans underarms tjocklek på huden.
import * as T from 'three';
import {qrot, type Foljd, type Frame, type Q, type V3} from './rorelse.ts';

/**
 * luft: minsta luft under underarmen över bordet (meter). handen: den del av underarmen närmast handleden som får ligga
 * på filten (handen vilar där). utjamning: hur långt (sekunder) en vridning tonas in och ut. mestGrader: mest armbågen vrids.
 */
export const ARMAR = {luft: 0.01, handen: 0.2, utjamning: 0.35, mestGrader: 100};
export type Kropp = {pose(f: Frame, hip: number[]): void; bone(name: string): T.Vector3; hud: T.SkinnedMesh};
export type Bord = {kantZ: number; skivaY: number};
const SIDOR = [['R', 'Right'], ['L', 'Left']] as const;

/** Underarmens tjocklek (radie i meter) längs den, från armbågen (0) till handleden (1), mätt på huden som den sitter nu. */
function tjocklek(k: Kropp, sida: 'Right' | 'Left'): (s: number) => number {
  const m = k.hud, ben = m.skeleton.bones.findIndex(b => b.name === `${sida}ForeArm`), E = k.bone(`${sida}ForeArm`), W = k.bone(`${sida}Hand`), d = W.clone().sub(E), L = d.length();
  d.normalize(); m.skeleton.update();
  const idx = m.geometry.attributes.skinIndex, vikt = m.geometry.attributes.skinWeight, fack = new Array<number>(10).fill(0), p = new T.Vector3();
  for (let i = 0; i < idx.count; i++) {
    let bast = -1, bv = 0; for (let j = 0; j < 4; j++) { const w = vikt.getComponent(i, j); if (w > bv) { bv = w; bast = idx.getComponent(i, j); } }
    if (bast !== ben) continue;
    m.getVertexPosition(i, p).applyMatrix4(m.matrixWorld); const r = p.clone().sub(E), along = r.dot(d), s = along / L; if (s < 0 || s > 1) continue;
    const f = Math.min(9, Math.floor(s * 10)); fack[f] = Math.max(fack[f], r.sub(d.clone().multiplyScalar(along)).length());
  }
  const störst = Math.max(...fack); for (let f = 0; f < 10; f++) if (!fack[f]) fack[f] = störst; // tomma fack (ingen hud räknad dit): den tjockaste delen
  return s => fack[Math.min(9, Math.max(0, Math.floor(s * 10)))];
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
