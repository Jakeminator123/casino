// En GLB-modell läst utan three.js: ledernas lägen och huden i vilopose för en riggad docka (avatar-auto-pipeline bygger
// dockorna; dealer3d/tools/docka-matt.ts mäter dem). Lägena är de three.js ger när modellen
// läses (dealer3d/src/figure-model.ts, standarddocka/editor/scen.ts): nodernas egna flyttningar, vridningar och skalor.
// Bara läsning; inget skrivs.
import {readFileSync} from 'node:fs';
import {add, mul, type Vec3} from '../../src/space.ts';

type M4 = number[]; // 4x4, kolumn för kolumn (som glTF)
const I: M4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mulM = (a: M4, b: M4): M4 => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
const apply = (m: M4, p: Vec3): Vec3 => [0, 1, 2].map(r => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]) as Vec3;
function trs(n: {translation?: number[]; rotation?: number[]; scale?: number[]; matrix?: number[]}): M4 {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1], [sx, sy, sz] = n.scale ?? [1, 1, 1], [tx, ty, tz] = n.translation ?? [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
}
type Gltf = {scene?: number; scenes: {nodes: number[]}[]; nodes: {name?: string; children?: number[]; mesh?: number; skin?: number; translation?: number[]; rotation?: number[]; scale?: number[]; matrix?: number[]}[];
  meshes: {primitives: {attributes: Record<string, number>}[]}[]; skins?: {joints: number[]; inverseBindMatrices?: number}[];
  accessors: {bufferView: number; byteOffset?: number; componentType: number; count: number; type: string; normalized?: boolean}[]; bufferViews: {byteOffset?: number; byteLength: number; byteStride?: number}[]};

function oppna(fil: string, rot: M4 = I) {
  const b = readFileSync(fil), jl = b.readUInt32LE(12), g = JSON.parse(b.subarray(20, 20 + jl).toString('utf8')) as Gltf, bin = b.subarray(20 + jl + 8);
  const SIZE: Record<string, number> = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16};
  const accessor = (i: number): number[][] => { const a = g.accessors[i], v = g.bufferViews[a.bufferView], n = SIZE[a.type], bytes = {5126: 4, 5125: 4, 5123: 2, 5121: 1}[a.componentType]!;
    const stride = v.byteStride ?? n * bytes, base = (v.byteOffset ?? 0) + (a.byteOffset ?? 0), out: number[][] = [];
    const read = (o: number) => a.componentType === 5126 ? bin.readFloatLE(o) : a.componentType === 5125 ? bin.readUInt32LE(o) : a.componentType === 5123 ? bin.readUInt16LE(o) / (a.normalized ? 65535 : 1) : bin.readUInt8(o) / (a.normalized ? 255 : 1);
    for (let k = 0; k < a.count; k++) out.push(Array.from({length: n}, (_, j) => read(base + k * stride + j * bytes)));
    return out; };
  const world = new Map<number, M4>(), walk = (i: number, parent: M4) => { const m = mulM(parent, trs(g.nodes[i])); world.set(i, m); for (const c of g.nodes[i].children ?? []) walk(c, m); };
  for (const r of g.scenes[g.scene ?? 0].nodes) walk(r, rot);
  return {g, accessor, world, named: new Map(g.nodes.map((n, i) => [n.name ?? '', i]))};
}

/** Huden: varje hörns läge i vilopose och de leder (namn) det hänger på, med vikterna. */
export type Hud = {horn: Vec3[]; leder: string[]; pa: {led: number; vikt: number}[][]};
/**
 * En riggad docka: `led(namn)` en leds läge i vilopose (nodens läge i världen), `hud` huden som skelettet böjer den i
 * vilan (varje hörn genom sina leders matriser: leden i världen gånger dess inversa bindning), och `pa(namn, minst)` de
 * hörn som hänger på leden med minst den vikten.
 */
export function lasDocka(fil: string) {
  const {g, accessor, world, named} = oppna(fil);
  const led = (name: string): Vec3 => { const i = named.get(name); if (i === undefined) throw Error(`Modellen saknar leden ${name}.`); const m = world.get(i)!; return [m[12], m[13], m[14]]; };
  const node = g.nodes.findIndex(n => n.mesh !== undefined && n.skin !== undefined); if (node < 0 || !g.skins) throw Error('Modellen har ingen hud på ett skelett.');
  const skin = g.skins[g.nodes[node].skin!], ibm = skin.inverseBindMatrices === undefined ? skin.joints.map(() => I) : accessor(skin.inverseBindMatrices);
  const jm = skin.joints.map((j, k) => mulM(world.get(j)!, ibm[k]));
  const prim = g.meshes[g.nodes[node].mesh!].primitives[0], pos = accessor(prim.attributes.POSITION), jo = accessor(prim.attributes.JOINTS_0), we = accessor(prim.attributes.WEIGHTS_0);
  const horn = pos.map((p, i) => { let o: Vec3 = [0, 0, 0]; for (let k = 0; k < 4; k++) if (we[i][k] > 0) o = add(o, mul(apply(jm[jo[i][k]], p as Vec3), we[i][k])); return o; });
  const hud: Hud = {horn, leder: skin.joints.map(j => g.nodes[j].name ?? ''), pa: we.map((w, i) => [0, 1, 2, 3].filter(k => w[k] > 0).map(k => ({led: jo[i][k], vikt: w[k]})))};
  const pa = (name: string, minst = 0.5) => { const j = hud.leder.indexOf(name); return horn.filter((_, i) => hud.pa[i].some(x => x.led === j && x.vikt >= minst)); };
  return {led, hud, pa};
}
