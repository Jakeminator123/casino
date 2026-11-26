// A rigged model of the dealer (a GLB with a skeleton, as Meshy rigs one or as avatar-auto-pipeline builds the standard
// doll) seated at the table and posed from the same joints the white figure is drawn from. For looking at how such a
// model sits in the scene, not for a reference film. The model's bones are found by name (Mixamo's, without a prefix).
// A model with finger bones (<Side>Hand<Finger>1-3, as the standard doll has) bends each finger as the doll's hand does;
// one without them (Meshy's) has its hands aimed and turned as a whole, its fingers stay as they were modelled and it
// never holds the card. Loaded only when the page asks for it (?model=1). It is made as large as its arm needs to be to
// equal the figure's (BODY.upperArm + BODY.forearm), so that its wrists come to the figure's wrists: Jakob's first model
// becomes 1.10 of its own size.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Vec3} from './camera.ts';
import {BODY} from './body.ts';
import {larRiktning} from './sitter.ts';
import {fingertopp} from './fingertopp.ts';

/**
 * What the model is posed from, in the scene's metres: her right then her left for shoulders, arms and hands; `looks` is
 * the way her head faces, and `lookAt` (if given) the point she looks at, which her eyes' line is aimed at. A hand's
 * `points` are the doll's 21 hand points (MediaPipe's order, the wrist first): with them a model that has finger bones
 * lays its palm as the doll's palm lies and bends each finger as the doll's.
 */
export type FigurePose = {hip: Vec3; shoulders: [Vec3, Vec3]; arms: {shoulder: Vec3; elbow: Vec3; wrist: Vec3}[]; hands: ({forward: Vec3; palm: Vec3; points?: Vec3[]} | null)[]; looks: Vec3; lookAt?: Vec3};
/**
 * `measure`: the arms and the head as last posed, degrees, her right then her left: how far the upper arm was rolled to
 * set the elbow's hinge, how far the elbow is bent, how far the hand stands off the forearm's line and how far the
 * figure's hand asked it to, how far the forearm is turned about its own length from its rest (`twist`, positive the way
 * a right hand's palm turns up) and what was left for the wrist beyond it (`wristTwist`), and how far the line of her
 * eyes falls short of the point she looks at (`gazeShort`; her eyes' bones turn the rest).
 */
export type Figure = {root: T.Group; scale: number; triangles: number; about: Record<string, unknown>; pose(p: FigurePose): void; measure(): {roll: number[]; elbow: number[]; wrist: number[]; wristAsked: number[]; twist: number[]; wristTwist: number[]; gazeShort: number}};
/** The most a hand stands off the forearm's line (radians); a hand asked farther is turned back whole, fingers and all. */
const WRIST = 50 * Math.PI / 180;
/**
 * How far a forearm turns about its own length from its rest (the palm toward the body, as the doll is modelled): the
 * whole of what the hand asks up to `full`, then more softly up to at most `most`, and only what lies beyond goes into the
 * wrist (radians). On a person the turn is in the forearm, not the wrist.
 */
const FOREARM = {full: 70 * Math.PI / 180, most: 95 * Math.PI / 180};
/**
 * Her spine from the hip up (each bone by its Mixamo name, or the name Meshy's rig gives it), with how stiff it is
 * against turning about the world's three axes (x: bowing forward and back, y: turning about the spine, z: leaning
 * sideways), against one another. The hip is the stiffest: it sits on the stool; the lean and the turn are shared out
 * up the spine, most of them in the chest. (Chosen 2026-11-26 on the standard man's deal to seat 4: his belly by the
 * table's edge moves at most 4 cm where it swung 11 cm with the trunk as one piece, and keeps 13 mm from the edge where
 * it went 23 mm into it; a stiffer lower back keeps it stiller still, but bends the chest alone.)
 */
const SPINE: readonly [readonly string[], readonly [number, number, number]][] = [[['Hips'], [30, 30, 30]], [['Spine'], [8, 12, 8]], [['Spine1', 'Spine01'], [2, 3, 2]], [['Spine2', 'Spine02'], [1, 1, 1]]];
/** The head turns toward what she looks at by at most `most` from where the trunk carries it (radians; a head bowed farther hides her face), the neck taking `neck` of it; the eyes' bones turn at most EYES more. */
const HEAD = {most: 40 * Math.PI / 180, neck: 0.4}, EYES = 35 * Math.PI / 180;
const SIDES = ['Right', 'Left'] as const, v = (p: Vec3) => new T.Vector3(p[0], p[1], p[2]), round = (p: T.Vector3) => [p.x, p.y, p.z].map(n => Math.round(n * 1000) / 1000);

/** The three axes of a cloud of points, longest first (the eigenvectors of its covariance, by Jacobi turns). */
function axes(points: T.Vector3[]): {centre: T.Vector3; axes: T.Vector3[]} {
  const c = points.reduce((s, p) => s.add(p), new T.Vector3()).multiplyScalar(1 / points.length), a = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], e = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (const p of points) { const d = [p.x - c.x, p.y - c.y, p.z - c.z]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) a[i][j] += d[i] * d[j]; }
  for (let sweep = 0; sweep < 24; sweep++) for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) { if (Math.abs(a[p][q]) < 1e-18) continue;
    const t = (a[q][q] - a[p][p]) / (2 * a[p][q]), tan = Math.sign(t || 1) / (Math.abs(t) + Math.sqrt(t * t + 1)), cos = 1 / Math.sqrt(tan * tan + 1), sin = tan * cos;
    for (let k = 0; k < 3; k++) { const x = a[k][p], y = a[k][q]; a[k][p] = cos * x - sin * y; a[k][q] = sin * x + cos * y; }
    for (let k = 0; k < 3; k++) { const x = a[p][k], y = a[q][k]; a[p][k] = cos * x - sin * y; a[q][k] = sin * x + cos * y; }
    for (let k = 0; k < 3; k++) { const x = e[k][p], y = e[k][q]; e[k][p] = cos * x - sin * y; e[k][q] = sin * x + cos * y; } }
  const order = [0, 1, 2].sort((i, j) => a[j][j] - a[i][i]);
  return {centre: c, axes: order.map(i => new T.Vector3(e[0][i], e[1][i], e[2][i]).normalize())};
}

// ---- the spine ------------------------------------------------------------------------------------------------
type Q4 = [number, number, number, number];
const qmul = (a: Q4, b: Q4): Q4 => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
/** The turn whose rotation vector is (x, y, z), radians about its direction. */
const qexp = (x: number, y: number, z: number): Q4 => { const t = Math.hypot(x, y, z), s = t < 1e-12 ? 0.5 : Math.sin(t / 2) / t; return [x * s, y * s, z * s, Math.cos(t / 2)]; };
const qrot = (q: Q4, p: Vec3): Vec3 => { const [x, y, z, w] = q, tx = 2 * (y * p[2] - z * p[1]), ty = 2 * (z * p[0] - x * p[2]), tz = 2 * (x * p[1] - y * p[0]);
  return [p[0] + w * tx + y * tz - z * ty, p[1] + w * ty + z * tx - x * tz, p[2] + w * tz + x * ty - y * tx]; };
const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
/** Solves A x = b (Gauss with the largest pivot); A and b are spent. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) { const k = A[r][c] / A[c][c]; for (let j = c; j < n; j++) A[r][j] -= k * A[c][j]; b[r] -= k * b[c]; } }
  const x = new Array<number>(n).fill(0); for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let j = r + 1; j < n; j++) s -= A[r][j] * x[j]; x[r] = s / A[r][r]; }
  return x;
}
/**
 * How her spine bends so that both shoulder joints come onto the figure's: one turn for each bone from the hip up (a
 * rotation vector in the world, about the bone's own joint, each carrying the bones above it), the least turning there
 * is, each bone weighed by how stiff it is (`stiff`, per world axis). `joints` are the spine's joints and `shoulders`
 * the shoulder joints as they lie unbent; `want` where the shoulders are to be. Found by Gauss-Newton steps from no
 * turn at all, with the shoulders' miss weighed far above the turning, so that the same pose always bends the same way.
 */
function bendSpine(joints: Vec3[], shoulders: Vec3[], want: Vec3[], stiff: readonly (readonly number[])[]): Q4[] {
  const n = joints.length, steps = joints.slice(1).map((j, k) => sub3(j, joints[k])), ends = shoulders.map(s => sub3(s, joints[n - 1]));
  const miss = (x: number[]) => { let R: Q4 = [0, 0, 0, 1], P = joints[0];
    for (let k = 0; k < n; k++) { R = qmul(qexp(x[3 * k], x[3 * k + 1], x[3 * k + 2]), R); if (k < n - 1) P = add3(P, qrot(R, steps[k])); }
    return ends.flatMap((e, s) => sub3(add3(P, qrot(R, e)), want[s])); };
  const m = 3 * n, x = new Array<number>(m).fill(0), w = stiff.flatMap(s => [...s]), MISS = 1e6, H = 1e-6;
  for (let step = 0; step < 12; step++) {
    const r = miss(x), J = Array.from({length: m}, (_, c) => { const y = x.slice(); y[c] += H; return miss(y).map((q, i) => (q - r[i]) / H); });
    const A = J.map((a, i) => J.map((b, j) => MISS * a.reduce((s, q, k) => s + q * b[k], 0) + (i === j ? w[i] : 0))), g = J.map((a, i) => -(MISS * a.reduce((s, q, k) => s + q * r[k], 0) + w[i] * x[i]));
    const d = solve(A, g); for (let i = 0; i < m; i++) x[i] += d[i];
    if (Math.hypot(...d) < 1e-9) break;
  }
  return Array.from({length: n}, (_, k) => qexp(x[3 * k], x[3 * k + 1], x[3 * k + 2]));
}

export async function loadFigure(url: string): Promise<Figure> {
  const gltf = await new GLTFLoader().loadAsync(url), root = new T.Group(); root.add(gltf.scene); root.updateMatrixWorld(true);
  const bone = (name: string) => { const b = gltf.scene.getObjectByName(name); if (!b) throw Error(`The model has no bone ${name}.`); return b; };
  let skinned: T.SkinnedMesh | null = null, triangles = 0;
  gltf.scene.traverse(o => { const m = o as T.SkinnedMesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; triangles += (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3; if (m.isSkinnedMesh) skinned = m; } });
  if (!skinned) throw Error('The model has no skinned mesh.'); const mesh = skinned as T.SkinnedMesh;
  const at = (o: T.Object3D) => o.getWorldPosition(new T.Vector3()), worldQ0 = (o: T.Object3D) => o.getWorldQuaternion(new T.Quaternion());
  const arms = SIDES.map(s => ({upper: bone(`${s}Arm`), fore: bone(`${s}ForeArm`), hand: bone(`${s}Hand`), thigh: bone(`${s}UpLeg`), shin: bone(`${s}Leg`), foot: bone(`${s}Foot`)}));
  // Her spine: the bones of SPINE she has that lie between her hip and her shoulders, from the hip up.
  const above = (o: T.Object3D, b: T.Object3D) => { for (let x: T.Object3D | null = o; x; x = x.parent) if (x === b) return true; return false; };
  const spine = SPINE.flatMap(([names, stiff]) => { const b = names.map(n => gltf.scene.getObjectByName(n)).find(Boolean); return b && arms.every(a => above(a.upper, b)) ? [{bone: b, stiff}] : []; });
  if (!spine.length || spine[0].bone.name !== 'Hips') throw Error('The model has no Hips bone above both shoulders.');
  // Finger bones, where the model has them for a whole hand: three to a finger, the thumb's first from the wrist. Bone n
  // of a finger lies between the doll's hand points start+n and start+n+1 (MediaPipe's order). The way each bone points as
  // it was modelled is kept in its own frame: toward the next bone, and for the last one toward the fingertip on the skin.
  const FINGERS = [['Thumb', 1], ['Index', 5], ['Middle', 9], ['Ring', 13], ['Pinky', 17]] as const;
  const fingers = SIDES.map(s => { const all = FINGERS.map(([name, start]) => ({start, bones: [1, 2, 3].map(n => gltf.scene.getObjectByName(`${s}Hand${name}${n}`))}));
    return all.every(f => f.bones.every(Boolean)) ? all.map(f => ({start: f.start, bones: f.bones as T.Object3D[]})) : null; });
  // The last bone has no next bone: it points toward the fingertip measured on the skin (fingertopp.ts), as the doll's hand
  // has its tip there (dealer3d/tools/docka-standard.ts). (Until 2026-11-26 it pointed as the bone before it; the standard
  // doll's thumb tip is bent 19 degrees from that, so the skin's tip missed the hand point's by 7 mm, the forefinger's by 3.)
  const tipOf = (b2: T.Object3D, b3: T.Object3D): T.Vector3 | null => { const which = mesh.skeleton.bones.indexOf(b3 as T.Bone), idx = mesh.geometry.attributes.skinIndex, wt = mesh.geometry.attributes.skinWeight, moln: Vec3[] = [], q = new T.Vector3();
    for (let i = 0; i < idx.count; i++) for (let k = 0; k < 4; k++) if (idx.getComponent(i, k) === which && wt.getComponent(i, k) >= 0.5) { mesh.getVertexPosition(i, q).applyMatrix4(mesh.matrixWorld); moln.push([q.x, q.y, q.z]); }
    const p = (o: T.Object3D): Vec3 => { const w = at(o); return [w.x, w.y, w.z]; }, tip = fingertopp(p(b2), p(b3), moln); return tip ? v(tip.punkt) : null; };
  const fingerWays = fingers.map(side => side && side.map(f => f.bones.map((b, n) => { const tip = n === 2 ? tipOf(f.bones[1], f.bones[2]) : null;
    return (tip ? tip.sub(at(f.bones[2])) : at(f.bones[Math.min(n, 1) + 1]).sub(at(f.bones[Math.min(n, 1)]))).normalize().applyQuaternion(b.getWorldQuaternion(new T.Quaternion()).invert()); })));
  // Her head and eyes as modelled, facing +z: the head's own forward and up, and each eye's forward, kept in their own
  // frames. (Until 2026-11-26 the head was aimed along the bone 'headfront', which points 31 degrees up from where her
  // face looks: she looked 13-23 degrees under what she should look at and rolled her head when she turned it.) Her
  // eyes' line starts between her eyes ('eye.L' and 'eye.R', which three.js names eyeL and eyeR).
  const neck = bone('neck'), head = bone('Head'), eyes = ['eyeL', 'eyeR'].map(n => gltf.scene.getObjectByName(n)).filter((e): e is T.Object3D => !!e);
  const headRest = worldQ0(head), headForward = new T.Vector3(0, 0, 1).applyQuaternion(headRest.clone().invert()), eyeForward = eyes.map(e => new T.Vector3(0, 0, 1).applyQuaternion(worldQ0(e).invert()));
  const posed = [...spine.map(s => s.bone), ...arms.flatMap(a => [a.upper, a.fore, a.hand, a.thigh, a.shin]), neck, head, ...eyes, ...fingers.flatMap(side => side ? side.flatMap(f => f.bones) : [])], bind = new Map(posed.map(b => [b, b.quaternion.clone()]));
  // As she was modelled: the lengths of her arm bones, and each hand's own forward and palm directions, read off the
  // vertices that hang on the hand bone (their long axis and their flat one), kept in the hand bone's own frame. Which way
  // along the flat axis the palm is, the thumb tells: it is the side the hand's width leans to (the long tail of the
  // vertices across the hand), and a right hand's palm is thumb x forward, a left hand's forward x thumb. (Where the
  // fingertips curl to, and which side faces the body, were tried first: each gave one palm turned up on Jakob's model,
  // whose two hands are not modelled as each other's mirror.)
  const lengths = arms.map(a => [at(a.upper).distanceTo(at(a.fore)), at(a.fore).distanceTo(at(a.hand))]);
  const scale = (BODY.upperArm + BODY.forearm) / (lengths[1][0] + lengths[1][1]), position = mesh.geometry.attributes.position, index = mesh.geometry.attributes.skinIndex, weight = mesh.geometry.attributes.skinWeight, about: Record<string, unknown> = {};
  const handAxes = arms.map((a, side) => {
    // A hand with finger bones says it itself, as the doll's hand does: forward from the wrist to the middle finger's
    // knuckle, the palm's way from the wrist and the two outer knuckles.
    const own = fingers[side];
    if (own) { const [, index, middle, , little] = own, from = at(a.hand), forward = at(middle.bones[0]).sub(from).normalize(), local = a.hand.getWorldQuaternion(new T.Quaternion()).invert();
      const palm = new T.Vector3().crossVectors(at(index.bones[0]).sub(from), at(little.bones[0]).sub(from)).multiplyScalar(side ? -1 : 1); palm.sub(forward.clone().multiplyScalar(palm.dot(forward))).normalize();
      about[`${SIDES[side]}Hand`] = {fingers: true, forward: round(forward), palm: round(palm)};
      return {forward: forward.clone().applyQuaternion(local), palm: palm.applyQuaternion(local), long: from.distanceTo(at(middle.bones[0])) + at(middle.bones[0]).distanceTo(at(middle.bones[2])) * 1.5}; }
    const which = mesh.skeleton.bones.indexOf(a.hand as T.Bone), cloud: T.Vector3[] = [];
    for (let i = 0; i < position.count; i++) for (let k = 0; k < 4; k++) if (index.getComponent(i, k) === which && weight.getComponent(i, k) > 0.6) cloud.push(mesh.getVertexPosition(i, new T.Vector3()).applyMatrix4(mesh.matrixWorld));
    const wrist = at(a.hand), along = at(a.hand).sub(at(a.fore)).normalize(), toLocal = a.hand.getWorldQuaternion(new T.Quaternion()).invert();
    if (cloud.length < 50) { about[`${SIDES[side]}Hand`] = `only ${cloud.length} vertices hang on the hand bone; its directions are guessed`; return {forward: along.clone().applyQuaternion(toLocal), palm: new T.Vector3(wrist.x > 0 ? -0.7 : 0.7, -0.7, 0).applyQuaternion(toLocal), long: 0.17}; }
    const whole = axes(cloud), forward = whole.axes[0].clone(); if (forward.dot(along) < 0) forward.negate();
    const reach = cloud.map(p => p.clone().sub(wrist).dot(forward)), far = Math.max(...reach), flat = axes(cloud.filter((_, i) => reach[i] < far * 0.55)); // the palm without the fingers
    const palm = flat.axes[2].clone(); palm.sub(forward.clone().multiplyScalar(palm.dot(forward))).normalize();
    const across = new T.Vector3().crossVectors(palm, forward).normalize(), widths = cloud.map(p => p.clone().sub(whole.centre).dot(across)), mean = widths.reduce((s, n) => s + n, 0) / widths.length, skew = widths.reduce((s, n) => s + (n - mean) ** 3, 0) / widths.length;
    const thumb = across.clone().multiplyScalar(Math.sign(skew) || 1); palm.copy(side ? new T.Vector3().crossVectors(forward, thumb) : new T.Vector3().crossVectors(thumb, forward)).normalize();
    about[`${SIDES[side]}Hand`] = {vertices: cloud.length, long: Math.round(far * 1000) / 1000, forward: round(forward), thumb: round(thumb), palm: round(palm)};
    return {forward: forward.applyQuaternion(toLocal), palm: palm.applyQuaternion(toLocal), long: far}; });
  // Her elbow's hinge, as she was modelled: square to her own upper arm and forearm (the skin at the elbow is made to
  // bend in that plane), or for an arm modelled straight, square to the upper arm and the way she faces. Kept in the upper
  // arm's own frame, so that it can be asked for in any pose. (Until 2026-11-26 it was square to the line from her head
  // to 'headfront', 31 degrees up: the hinge stood 18 degrees off his own, 24 off hers, and the elbow bent askew.)
  const hinges = arms.map(a => { const upper = at(a.fore).sub(at(a.upper)), fore = at(a.hand).sub(at(a.fore)), n = new T.Vector3().crossVectors(upper, fore);
    if (n.length() < 0.1 * upper.length() * fore.length()) n.crossVectors(upper, new T.Vector3(0, 0, 1));
    return n.normalize().applyQuaternion(a.upper.getWorldQuaternion(new T.Quaternion()).invert()); });
  const last = {roll: [0, 0], elbow: [0, 0], wrist: [0, 0], wristAsked: [0, 0], twist: [0, 0], wristTwist: [0, 0], gazeShort: 0}, degrees = (n: number) => Math.round(n * 1800 / Math.PI) / 10;
  root.scale.setScalar(scale); root.updateMatrixWorld(true); about.arm = lengths.map(l => l.map(n => Math.round(n * 1000) / 1000)); about.shouldersApart = Math.round(at(arms[0].upper).distanceTo(at(arms[1].upper)) * 1000) / 1000;
  // From her hip joint to her shoulders' middle, as modelled (her size).
  const trunk = at(arms[0].upper).add(at(arms[1].upper)).multiplyScalar(0.5).distanceTo(at(spine[0].bone));
  /** Each forearm's turn in the last pose, for the next: it is chosen near the last where a hand turns past half a turn. */
  const lastTwist: (number | null)[] = [null, null];

  const worldQ = new T.Quaternion(), parentQ = new T.Quaternion(), turn = new T.Quaternion();
  /** Turns a bone by `q`, a turn in the world, keeping its place. */
  const turned = (b: T.Object3D, q: T.Quaternion) => { b.getWorldQuaternion(worldQ).premultiply(q); b.parent!.getWorldQuaternion(parentQ); b.quaternion.copy(parentQ.invert().multiply(worldQ)); b.updateMatrixWorld(true); };
  /** Turns a bone the shortest way that brings the direction `from` (in the world, as it is now) to lie along `to`. */
  const swing = (b: T.Object3D, from: T.Vector3, to: T.Vector3) => turned(b, turn.setFromUnitVectors(from.clone().normalize(), to.clone().normalize()));
  const aimAt = (b: T.Object3D, tip: T.Object3D, target: T.Vector3) => swing(b, at(tip).sub(at(b)), target.clone().sub(at(b)));
  const flatten = (n: T.Vector3, axis: T.Vector3) => n.clone().sub(axis.clone().multiplyScalar(n.dot(axis))).normalize();
  const arr = (p: T.Vector3): Vec3 => [p.x, p.y, p.z];
  /** A softly bounded turn: the whole of `a` up to FOREARM.full, then less and less, never past FOREARM.most. */
  const forearmShare = (a: number) => { const m = Math.abs(a), {full, most} = FOREARM; return Math.sign(a) * (m <= full ? m : full + (most - full) * Math.tanh((m - full) / (most - full))); };
  function pose(p: FigurePose) {
    for (const [b, q] of bind) b.quaternion.copy(q);
    // Her trunk. Her hip sits on the figure's hip, still on the stool and upright, facing the table; her spine bends so
    // that her shoulders come onto the figure's, the lean and the turn shared out up the spine (SPINE), so that her
    // belly by the table's edge stays nearly where it is. (Until 2026-11-26 her whole body was turned about her
    // shoulders as one piece, and her belly swung forward into the edge and the chip tray when she leaned.) A figure whose
    // hip lies farther from its shoulders than hers sets her hip on the line between them, as far from the shoulders as
    // her own; what her spine still cannot reach moves her whole body.
    root.quaternion.identity(); root.position.set(0, 0, 0); root.updateMatrixWorld(true);
    const want = p.shoulders.map(v), mid = want[0].clone().add(want[1]).multiplyScalar(0.5), hip = v(p.hip), long = mid.distanceTo(hip), hips = at(spine[0].bone);
    root.position.copy(long > 1e-6 ? mid.clone().addScaledVector(hip.clone().sub(mid), trunk / long) : hip).sub(hips); root.updateMatrixWorld(true);
    const bends = bendSpine(spine.map(s => arr(at(s.bone))), arms.map(a => arr(at(a.upper))), want.map(arr), spine.map(s => s.stiff));
    spine.forEach((s, k) => turned(s.bone, new T.Quaternion(...bends[k])));
    const left = want[0].clone().sub(at(arms[0].upper)).add(want[1].clone().sub(at(arms[1].upper))).multiplyScalar(0.5);
    if (left.lengthSq() > 1e-10) { root.position.add(left); root.updateMatrixWorld(true); }
    arms.forEach((a, i) => {
      // Seated on a high stool: thighs forward under the table, sloping down more the higher the hip sits (sitter.ts), shins down.
      swing(a.thigh, at(a.shin).sub(at(a.thigh)), new T.Vector3(...larRiktning(p.hip[1], !i))); swing(a.shin, at(a.foot).sub(at(a.shin)), new T.Vector3(0, -1, 0.08));
      // Her arm: from her own shoulder to the figure's wrist, her own bone lengths, the elbow out the way the figure's elbow is.
      const s = at(a.upper), w = v(p.arms[i].wrist), l1 = lengths[i][0] * scale, l2 = lengths[i][1] * scale, far = Math.min(l1 + l2 - 0.002, Math.max(Math.abs(l1 - l2) + 0.002, s.distanceTo(w)));
      // The side her elbow is on is the figure's own: the figure's elbow off the figure's own line from shoulder to wrist.
      // (Taken from her shoulder, as it was first, a nearly straight arm got its elbow from the few centimetres her
      // shoulders are broader than the figure's, and the arm bent to a side no arm bends to.)
      const own = v(p.arms[i].wrist).sub(v(p.arms[i].shoulder)).normalize(), side = flatten(v(p.arms[i].elbow).sub(v(p.arms[i].shoulder)), own);
      const dir = w.clone().sub(s).normalize(), along = (l1 * l1 - l2 * l2 + far * far) / (2 * far), out = flatten(side, dir), elbow = s.clone().addScaledVector(dir, along).addScaledVector(out, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
      aimAt(a.upper, a.fore, elbow);
      // An elbow is a hinge. Aiming the upper arm the shortest way leaves it rolled about its own length any which way, and
      // the forearm then bends sideways out of the elbow (Jakob, 2026-11-18: "ur led"). So the upper arm is rolled until
      // the hinge she was modelled with stands square to the plane this arm bends in; the forearm then swings in it.
      const upper = elbow.clone().sub(s).normalize(), fore = w.clone().sub(elbow).normalize(), bend = new T.Vector3().crossVectors(upper, fore); last.roll[i] = 0;
      if (bend.length() > 0.02) { const has = flatten(hinges[i].clone().applyQuaternion(a.upper.getWorldQuaternion(new T.Quaternion())), upper), want = flatten(bend, upper), roll = Math.atan2(new T.Vector3().crossVectors(has, want).dot(upper), has.dot(want));
        turned(a.upper, turn.setFromAxisAngle(upper, roll)); last.roll[i] = degrees(roll); }
      aimAt(a.fore, a.hand, w); last.elbow[i] = degrees(upper.angleTo(fore));
      const hand = p.hands[i]; last.twist[i] = 0; last.wristTwist[i] = 0; if (!hand) { lastTwist[i] = null; return; }
      // Her hand: along the figure's hand, and turned about its own length until its palm looks where the figure's palm
      // looks. Her fingers are stiff, so a hand aimed down at the table would go through it: its tips stay a finger's
      // thickness over the felt (y = 0). With the doll's hand points and fingers of her own to bend, her palm lies as the
      // doll's palm lies (not along the whole hand, which is for stiff fingers) and no tip needs holding off the felt: the
      // fingers follow the doll's.
      let bent = hand.points?.length === 21 && fingers[i] ? hand.points.map(v) : null;
      const palmWay = bent ? new T.Vector3().crossVectors(bent[5].clone().sub(bent[0]), bent[17].clone().sub(bent[0])).multiplyScalar(i ? -1 : 1) : v(hand.palm);
      const forward = (bent ? bent[9].clone().sub(bent[0]) : v(hand.forward)).normalize(), reach = handAxes[i].long * scale, clear = 0.012, axis = at(a.hand).sub(at(a.fore)).normalize(), asked = axis.angleTo(forward); last.wristAsked[i] = degrees(asked);
      // The forearm turns the hand about its length, as a forearm does (the wrist does not turn): from its rest, where the
      // palm faces the body, by the angle between the thumb's side of her hand at rest and of the figure's hand, seen
      // along the forearm. The whole of it up to about 90 degrees each way (FOREARM); only what lies beyond is the wrist's.
      // Seen from the rest, half a turn is a palm turned out, where no forearm goes, so the turn never flips over there;
      // and where a hand still passes it, the turn nearest the last pose is taken, if the last pose was close by.
      const handQ = a.hand.getWorldQuaternion(new T.Quaternion()), restPalm = handAxes[i].palm.clone().applyQuaternion(handQ), restForward = handAxes[i].forward.clone().applyQuaternion(handQ);
      const thumb = (palm: T.Vector3, fwd: T.Vector3) => i ? new T.Vector3().crossVectors(palm, fwd) : new T.Vector3().crossVectors(fwd, palm);
      // (A hand bent so far sideways that its thumb's side points along the forearm is measured by its palm instead.)
      const across = (n: T.Vector3) => n.clone().sub(axis.clone().multiplyScalar(n.dot(axis))).length();
      let has = thumb(restPalm, restForward), wants = thumb(flatten(palmWay, forward), forward);
      if (across(has) < 0.3 || across(wants) < 0.3) { has = restPalm; wants = palmWay.clone(); }
      has = flatten(has, axis); wants = flatten(wants, axis);
      let twist = Math.atan2(new T.Vector3().crossVectors(has, wants).dot(axis), has.dot(wants)); const before = lastTwist[i];
      if (before !== null && Math.abs(twist - before) > Math.PI) { const other = twist - Math.sign(twist - before) * 2 * Math.PI; if (Math.abs(other - before) < 1) twist = other; }
      lastTwist[i] = twist; const forearm = forearmShare(twist); turned(a.fore, turn.setFromAxisAngle(axis, forearm)); last.twist[i] = degrees(forearm * (i ? -1 : 1)); last.wristTwist[i] = degrees((twist - forearm) * (i ? -1 : 1));
      // Her forearm is not the figure's (her shoulders are broader and her bones her own), so the figure's hand can stand
      // farther off her forearm's line than a wrist bends: the whole hand is turned back about the wrist to WRIST off it,
      // its fingers with it, so that it stays one hand. (Until 2026-11-26 only its direction was turned back and the
      // fingers still followed the unturned points: they broke at the knuckles and the grip moved 4-5 cm.)
      if (asked > WRIST) { const to = axis.clone().applyQuaternion(new T.Quaternion().slerp(new T.Quaternion().setFromUnitVectors(axis, forward), WRIST / asked)).normalize(), back = new T.Quaternion().setFromUnitVectors(forward, to), pivot = at(a.hand);
        forward.copy(to); palmWay.applyQuaternion(back); if (bent) bent = bent.map(q => q.sub(pivot).applyQuaternion(back).add(pivot)); }
      if (!bent && w.y > clear && w.y + forward.y * reach < clear) { forward.y = (clear - w.y) / reach; const k = Math.sqrt(Math.max(0, 1 - forward.y * forward.y)) / (Math.hypot(forward.x, forward.z) || 1); forward.x *= k; forward.z *= k; }
      const want = flatten(palmWay, forward), lay = () => { swing(a.hand, handAxes[i].forward.clone().applyQuaternion(a.hand.getWorldQuaternion(new T.Quaternion())), forward);
        return flatten(handAxes[i].palm.clone().applyQuaternion(a.hand.getWorldQuaternion(new T.Quaternion())), forward); };
      swing(a.hand, lay(), want);
      last.wrist[i] = degrees(at(a.hand).sub(at(a.fore)).angleTo(handAxes[i].forward.clone().applyQuaternion(a.hand.getWorldQuaternion(new T.Quaternion()))));
      // Her fingers, from the knuckle out: each bone is turned the shortest way to point as the doll's finger bone points.
      if (bent) { const pts = bent; fingers[i]!.forEach((f, k) => f.bones.forEach((b, n) => { const to = pts[f.start + n + 1].clone().sub(pts[f.start + n]);
        if (to.lengthSq() > 1e-10) swing(b, fingerWays[i]![k][n].clone().applyQuaternion(b.getWorldQuaternion(new T.Quaternion())), to); })); }
    });
    // Her head: the line of her eyes (from between them, straight ahead in the head's own frame) toward the point she looks
    // at, at most HEAD.most from where her trunk carries it, level (no roll: her ears stay level as she turns), the neck
    // taking HEAD.neck of the turn; her eyes' bones turn the rest. Aimed twice, since her eyes move a little with her head.
    const eyesAt = () => eyes.length ? eyes.reduce((s, e) => s.add(at(e)), new T.Vector3()).multiplyScalar(1 / eyes.length) : at(head);
    const goal = p.lookAt ? v(p.lookAt) : eyesAt().addScaledVector(v(p.looks).normalize(), 1.5);
    const aim = (from: T.Vector3) => {
      neck.quaternion.copy(bind.get(neck)!); head.quaternion.copy(bind.get(head)!); neck.updateMatrixWorld(true);
      const now = headForward.clone().applyQuaternion(head.getWorldQuaternion(new T.Quaternion())), to = goal.clone().sub(from).normalize(), angle = now.angleTo(to);
      const ahead = angle > 1e-6 ? now.clone().applyQuaternion(new T.Quaternion().slerp(new T.Quaternion().setFromUnitVectors(now, to), Math.min(1, HEAD.most / angle))).normalize() : now;
      const up = flatten(new T.Vector3(0, 1, 0), ahead), level = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3().crossVectors(up, ahead), up, ahead)).multiply(headRest);
      turned(neck, new T.Quaternion().slerp(level.clone().multiply(head.getWorldQuaternion(new T.Quaternion()).invert()), HEAD.neck));
      turned(head, level.clone().multiply(head.getWorldQuaternion(new T.Quaternion()).invert()));
    };
    aim(eyesAt()); aim(eyesAt());
    last.gazeShort = degrees(headForward.clone().applyQuaternion(head.getWorldQuaternion(new T.Quaternion())).angleTo(goal.clone().sub(eyesAt())));
    eyes.forEach((e, k) => { const now = eyeForward[k].clone().applyQuaternion(e.getWorldQuaternion(new T.Quaternion())), to = goal.clone().sub(at(e)).normalize(), angle = now.angleTo(to);
      if (angle > 1e-6) turned(e, new T.Quaternion().slerp(new T.Quaternion().setFromUnitVectors(now, to), Math.min(1, EYES / angle))); });
  }
  return {root, scale, triangles: Math.round(triangles), about, pose, measure: () => JSON.parse(JSON.stringify(last))};
}
