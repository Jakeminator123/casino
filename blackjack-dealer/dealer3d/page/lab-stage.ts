// The doll lab's stage (dealer3d/page/docka.ts): the room, table, shoe, card and doll of dealer3d/src/stage.ts, drawn
// through a camera of the lab's own that the mouse turns, with the motion exchanged while the page is open and the joints
// marked. Nothing of the doll or the room is drawn here: that is the stage's; this file adds the camera, the marks on the
// joints and on the fingertips that touch the card, the place that is lit, the places' outlines kept to the plan in use
// (setPlan: the studio's draft, as it is changed; each turned on the felt as the studio draws it), the point of the felt
// under the pointer (pick), one place's outline moved by hand (movePlace), and whether the picture is the film's camera's own
// (atFilm: docka.ts lays the dealer's film over it only then).
//
// What it borrows of the stage that the stage does not hand out, all of it in createLabStage's first lines and nowhere
// else: the scene (taken as the stage adds its first light to it), the renderer (taken at one drawing of the stage's own),
// the places' outlines (the stage's LineLoops, in the order of world.ts spots; redrawn here from then on), and one `read`
// whose frames are exchanged in place (the stage reads them at every setTime; it is made with a frame count that never
// ends, since the stage fixes its duration when it is made). Wanted of dealer3d/src/stage.ts, so that these go:
// createStage hands out `scene` and `renderer`, draws through a camera it is given, takes a new read and a new plan.
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStage, type Read} from '../src/stage.ts';
import {CARD, FILM, PLAY_LENS, filmEye, fovYDeg, type Eye, type Vec3} from '../src/camera.ts';
import {loadTable, roomLight, seatStool} from '../src/standard-room.ts';
import {dealerEdge, seatEye, spots, type Plan, type Spot} from '../src/world.ts';
import {standing} from '../src/body.ts';
import {FINGERS} from '../src/capture.ts';
import {touching, type Touch} from '../src/natural.ts';
import type {Doll} from '../src/doll.ts';
import type {Figure} from '../src/figure-model.ts';

export type ViewName = 'film' | 'spel' | 'side' | 'above' | 'player' | 'card';
/** Where the page's server hands out the standard room's models (dealer3d/src/standard-room.ts). */
export type Room = {table: string; stool: string};
type Frame = Read['frames'][number];
export type {Touch};
const v3 = (p: number[]) => new T.Vector3(p[0], p[1], p[2]), UP = new T.Vector3(0, 1, 0);
const mix = (a: number[], b: number[], k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
// The marks: her right arm and hand warm, her left cool, the hands brighter than the arms, the trunk faint.
const MARK = {right: {arm: 0xd98a2b, hand: 0xffd23f}, left: {arm: 0x2b8fd9, hand: 0x4de3ff}, trunk: 0x9aa39d};
/** The plan as far as the turn of its cards is read from it (placements/default.json). */
type Turned = {tableProjection?: {mode?: string; heading?: number}; targets: Record<string, {geometry: {native: {angle?: number}}}>};
/**
 * The turn of a place's card on the felt, radians as src/table-lens.ts realCardQuad takes it (0: its long side straight
 * away from the camera, positive toward image right). Where the table is "Plant bord" (tableProjection.mode 'flat') every
 * card turns as the table, its heading and P4.C1's angle, as the studio draws the plan through the lens
 * (src/card-plan.ts planCardQuad); else the card's own angle.
 */
function headingOf(plan: Plan, id: string): number {
  const p = plan as unknown as Turned, angle = (at: string) => p.targets[at]?.geometry.native.angle ?? 0;
  const degrees = p.tableProjection?.mode === 'flat' ? (p.tableProjection.heading ?? 0) + angle('P4.C1') : angle(id);
  return Number.isFinite(degrees) ? degrees * Math.PI / 180 : 0;
}
/** A place's outline as stage.ts draws it, a real card 3 mm larger all round, just over the felt, turned by `heading`. */
function outlineAt(at: number[], heading: number): T.Vector3[] {
  const c = Math.cos(heading), s = Math.sin(heading), w = CARD.width / 2 + 0.003, h = CARD.height / 2 + 0.003; // (x across, z toward the camera)
  return [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, z]) => new T.Vector3(at[0] + x * c - z * s, 0.0006, at[2] + x * s + z * c));
}

/** The joints as balls with bones between, drawn over everything (no depth test), in metres of the room. */
function marks() {
  const group = new T.Group(); group.visible = false; group.renderOrder = 10;
  const paint = (colour: number) => new T.MeshBasicMaterial({color: colour, depthTest: false, depthWrite: false, transparent: true});
  const dot = (m: T.Material, r: number) => { const b = new T.Mesh(new T.SphereGeometry(r, 14, 10), m); b.renderOrder = 11; group.add(b); return b; };
  const bone = (m: T.Material, r: number) => { const c = new T.Mesh(new T.CylinderGeometry(r, r, 1, 8), m); c.renderOrder = 10; group.add(c);
    return (a: number[], b: number[]) => { const p = v3(a), d = v3(b).sub(p), l = d.length() || 1e-6; c.position.copy(p).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / l)); c.scale.set(1, l, 1); }; };
  const pairs: [number, number][] = []; for (const c of FINGERS) { pairs.push([0, c[0]]); for (let k = 0; k < 3; k++) pairs.push([c[k], c[k + 1]]); } for (const [a, b] of [[5, 9], [9, 13], [13, 17]]) pairs.push([a, b]);
  const side = (c: {arm: number; hand: number}) => { const arm = paint(c.arm), hand = paint(c.hand);
    return {upper: bone(arm, 0.0035), fore: bone(arm, 0.0035), joints: [dot(arm, 0.011), dot(arm, 0.011), dot(hand, 0.008)], bones: pairs.map(() => bone(hand, 0.0016)), points: Array.from({length: 21}, (_, i) => i ? dot(hand, 0.0036) : null)}; };
  const R = side(MARK.right), L = side(MARK.left), faint = paint(MARK.trunk), across = bone(faint, 0.0025), spine = bone(faint, 0.0025), hipDot = dot(faint, 0.009);
  const limb = (s: typeof R, a: {s: number[]; e: number[]; w: number[]; p: number[][]}) => { s.upper(a.s, a.e); s.fore(a.e, a.w); [a.s, a.e, a.w].forEach((p, i) => s.joints[i].position.copy(v3(p)));
    pairs.forEach(([i, j], k) => s.bones[k](a.p[i], a.p[j])); s.points.forEach((b, i) => b?.position.copy(v3(a.p[i]))); };
  return {group, set(a: Frame, b: Frame, k: number, hip: number[]) {
    const at = (x: Frame['L'], y: Frame['L']) => ({s: mix(x.s, y.s, k), e: mix(x.e, y.e, k), w: mix(x.w, y.w, k), p: x.p.map((p, i) => mix(p, y.p[i], k))}), r = at(a.R, b.R), l = at(a.L, b.L);
    limb(R, r); limb(L, l); across(r.s, l.s); spine(hip, mix(r.s, l.s, 0.5)); hipDot.position.copy(v3(hip)); }};
}

/**
 * The fingertips that touch the card (dealer3d/src/natural.ts `touching`), drawn over everything: on the card a ring and
 * a dot where each tip lies, the tip itself ringed, and a line from the tip to the card, so that it shows which finger
 * holds the card where; her right hand's warm, her left's cool, as the joints are marked.
 */
function grips() {
  const group = new T.Group(); group.visible = false; group.renderOrder = 12;
  const paint = (colour: number, opacity = 1) => new T.MeshBasicMaterial({color: colour, depthTest: false, depthWrite: false, transparent: true, opacity, side: T.DoubleSide});
  const ring = new T.RingGeometry(0.0042, 0.0062, 28), disc = new T.CircleGeometry(0.0022, 18), halo = new T.RingGeometry(0.0085, 0.0105, 28), rod = new T.CylinderGeometry(0.0007, 0.0007, 1, 6);
  const Z = new T.Vector3(0, 0, 1);
  const slots = Array.from({length: 10}, (_, n) => { const colour = n < 5 ? MARK.right.hand : MARK.left.hand, solid = paint(colour), soft = paint(colour, 0.55);
    const meshes = {ring: new T.Mesh(ring, solid), dot: new T.Mesh(disc, solid), halo: new T.Mesh(halo, soft), rod: new T.Mesh(rod, soft)};
    meshes.halo.onBeforeRender = (_r, _s, camera) => { meshes.halo.quaternion.copy(camera.quaternion); meshes.halo.updateMatrixWorld(); };
    for (const m of Object.values(meshes)) { m.renderOrder = 12; m.visible = false; group.add(m); } return meshes; });
  return {group, set(list: Touch[], card: {n: number[]}, tips: {R: number[][]; L: number[][]}) {
    slots.forEach(s => { for (const m of Object.values(s)) m.visible = false; });
    for (const t of list) { const s = slots[(t.hand === 'R' ? 0 : 5) + t.finger], tip = v3(tips[t.hand][FINGERS[t.finger][3]]), at = v3(t.at), n = v3(card.n).normalize();
      const face = tip.clone().sub(at).dot(n) < 0 ? n.clone().negate() : n; // the face the finger is on
      const q = new T.Quaternion().setFromUnitVectors(Z, face); for (const m of [s.ring, s.dot]) { m.position.copy(at).addScaledVector(face, 0.0004); m.quaternion.copy(q); m.visible = true; }
      s.halo.position.copy(tip); s.halo.visible = true; // ringed as seen from the camera (turned to it as it is drawn)
      const d = at.clone().sub(tip), l = d.length(); if (l > 1e-4) { s.rod.position.copy(tip).addScaledVector(d, 0.5); s.rod.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / l)); s.rod.scale.set(1, l, 1); s.rod.visible = true; } } }};
}

/**
 * The stage for `doll`, showing `first` until another motion is set. One canvas has one stage: for another doll make a
 * new canvas and a new stage, and dispose of this one. The canvas keeps the film's shape (1764 : 1174), so that the
 * film's view is the film's picture. `figure`: a rigged model drawn in the white figure's place and posed from the same
 * joints (dealer3d/src/figure-model.ts; docka.ts loads the standard doll's); a figure belongs to one stage. `room`: the
 * standard room round her in the stage's own room's place (Jakob 2026-11-26: "Vi ska ha in vy/vinkel och allt det andra
 * från 'standarddockan'-mappens mini-blender"): its light and floor at once, its table and the stool under her as they
 * arrive. It is set under the rigged model, so it needs a figure; without one the stage's own room is drawn.
 */
export function createLabStage(canvas: HTMLCanvasElement, plan: Plan, doll: Doll, first: Read, figure: Figure | null = null, room: Room | null = null) {
  // The stage, with its scene taken as it is filled, and a read that is exchanged in place.
  const read: Read = {...first, laid: [], frameCount: 1e9}; let found: T.Scene | null = null; const standard = room && figure ? room : null;
  Object.defineProperty(T.Scene.prototype, 'add', {configurable: true, writable: true, value(this: T.Scene, ...objects: T.Object3D[]) { found = this; return T.Object3D.prototype.add.apply(this, objects); }});
  let stage: ReturnType<typeof createStage>;
  try { stage = createStage(canvas, plan, {look: standard ? 'standard' : 'room', target: 'P4.C1', read, doll, figure}); } finally { delete (T.Scene.prototype as unknown as {add?: unknown}).add; }
  const scene = found as T.Scene | null; if (!scene) throw Error('The stage made no scene.');
  let taken: T.WebGLRenderer | null = null; const before = scene.onBeforeRender; scene.onBeforeRender = r => { taken = r; }; stage.render(['film']); scene.onBeforeRender = before;
  const renderer = taken as T.WebGLRenderer | null; if (!renderer) throw Error('The stage drew with no renderer.');
  read.frameCount = first.frameCount;
  // The standard room. She sits at rest now (the stage's first frame), which is how the stool is set under her; the
  // table is 35 MB and comes when it comes. A model that will not load is said, not hidden: the room then lacks it.
  let roomFault: string | null = null;
  if (standard) { roomLight(scene, renderer); const failed = (what: string) => (e: unknown) => { roomFault = `${what}: ${e instanceof Error ? e.message : String(e)}`; console.error(roomFault); };
    void seatStool(standard.stool, scene, figure!.root).then(() => { dirty = true; }, failed('The stool'));
    void loadTable(standard.table, scene, plan).then(() => { dirty = true; }, failed('The table')); }

  const lens = stage.lens, edge = dealerEdge(lens), body = standing(lens, doll), film = stage.eyeOf('film');
  let planNow = plan, all: Spot[] = spots(plan, lens);
  const outlines = scene.children.filter(o => (o as T.LineLoop).isLineLoop) as T.LineLoop[]; // the plan's places, in the order of `all` (stage.ts, look 'room')
  const outlineColour = (outlines[0]?.material as T.LineBasicMaterial | undefined)?.color.getHex() ?? 0xd8c27a;
  const redraw = (o: T.LineLoop, at: number[], heading: number) => { o.geometry.dispose(); o.geometry = new T.BufferGeometry().setFromPoints(outlineAt(at, heading)); };
  const joints = marks(); scene.add(joints.group); const held = grips(); scene.add(held.group); let touchNow: Touch[] = [];
  const camera = new T.PerspectiveCamera(fovYDeg(film.focalPx), FILM.width / FILM.height, 0.2, 30), controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false; controls.minDistance = 0.25; controls.maxDistance = 9; controls.maxPolarAngle = Math.PI * 0.52; controls.zoomSpeed = 1.2; controls.rotateSpeed = 0.9;
  let target = 'P4.C1', now = 0, dirty = true, follow: Vec3 | null = null; controls.addEventListener('change', () => { dirty = true; });
  // Where "Filmens kamera" put the camera, until another view is chosen: the picture is the film's own only while the
  // camera stands there (atFilm), so that a film laid over it lies true.
  let home: {p: T.Vector3; t: T.Vector3; fov: number} | null = null;
  /** The two frames the time stands between, and how far from the first. */
  const between = () => { const at = Math.min(read.frameCount - 1, now * read.fps), i = Math.min(read.frameCount - 2, Math.floor(at)); return {a: read.frames[i], b: read.frames[i + 1], k: at - i}; };
  const cardNow = (): Vec3 => { const {a, b, k} = between(); return mix(a.card.c, b.card.c, k); };

  /** An eye as the camera's place, turning about the point of its line of sight that is nearest `about`: the picture is the eye's own until the mouse moves it. */
  function through(eye: Eye, about: Vec3) {
    const p = v3(eye.position), f = v3(eye.forward).normalize(), along = Math.max(0.3, v3(about).sub(p).dot(f));
    camera.fov = fovYDeg(eye.focalPx); camera.up.copy(UP); camera.position.copy(p); controls.target.copy(p).addScaledVector(f, along); camera.updateProjectionMatrix(); controls.update(); dirty = true;
  }
  const chest: Vec3 = mix(mix(body.shoulders[0], body.shoulders[1], 0.5), body.hip, 0.3), table: Vec3 = [edge[0], 0.12, edge[2] + 0.22];
  const seatOf = () => { const m = /^P([1-7])\./.exec(target); return m ? Number(m[1]) : 4; };
  function view(name: ViewName) {
    follow = null; home = null;
    // Filmens kamera: the bank's own (stage.ts cameraOf: its place, its line of sight, its lens, the film's shape).
    if (name === 'film') { through(film, chest); home = {p: camera.position.clone(), t: controls.target.clone(), fov: camera.fov}; }
    // Spelets vy: what the player at seat 4 sees, the standard for the standard doll's films (src/table-lens.ts PLAY_LENS:
    // the lower camera, Jakob 2026-11-26). Not the camera the older films were taken with, so no film is laid over it.
    else if (name === 'spel') through(filmEye(PLAY_LENS), chest);
    // From her right side, where the hand that lays the card is nearest; level with her arms.
    else if (name === 'side') through({position: [table[0] - 2.1, 0.5, table[2]], forward: [2.1, -0.38, 0], focalPx: film.focalPx}, table);
    // Straight down on the table, the dealer at the top as in the film (a hair off the plumb line, which has no up).
    else if (name === 'above') through({position: [edge[0], 2.5, edge[2] + 0.16], forward: [0, -2.5, -0.04], focalPx: film.focalPx}, [edge[0], 0, edge[2] + 0.12]);
    // The eye of the seat the card is laid at (world.ts seatEye); for the dealer's own cards seat 4's.
    else if (name === 'player') { const eye = seatEye(seatOf(), planNow, lens), at = all.find(s => s.id === target)?.at ?? table; through(eye, at); }
    // Close on the card, along the film's line of sight to it; the view then goes with the card (setTime), so the hand that holds it stays in the picture.
    else { const c = cardNow(), f = v3(c).sub(v3(film.position)).normalize(); through({position: v3(c).addScaledVector(f, -0.5).toArray() as Vec3, forward: f.toArray() as Vec3, focalPx: film.focalPx}, c); follow = c; }
  }

  function setTime(t: number) {
    const last = (read.frameCount - 1) / read.fps; now = Math.max(0, Math.min(last, t)); stage.setTime(now);
    const {a, b, k} = between(); if (joints.group.visible) joints.set(a, b, k, read.hip);
    // The fingertips on the card, as the stage draws the card between two frames (stage.ts setTime: one card or the other, never half way between two).
    { const one = a.card.id !== b.card.id ? (k < 0.5 ? a : b).card : null, ca = one ?? a.card, cb = one ?? b.card, l = v3(mix(ca.l, cb.l, k)).normalize(), toward = v3(mix(ca.n, cb.n, k)), n = toward.addScaledVector(l, -toward.dot(l)).normalize();
      const card = {c: mix(ca.c, cb.c, k), l: l.toArray() as Vec3, n: n.toArray() as Vec3, id: ca.id}, tips = {R: a.R.p.map((p, i) => mix(p, b.R.p[i], k)), L: a.L.p.map((p, i) => mix(p, b.L.p[i], k))};
      touchNow = touching({card, R: {...a.R, p: tips.R}, L: {...a.L, p: tips.L}, h: a.h} as never); if (held.group.visible) held.set(touchNow, card, tips); }
    if (follow) { const c = mix(a.card.c, b.card.c, k), moved = v3(c).sub(v3(follow)); camera.position.add(moved); controls.target.add(moved); controls.update(); follow = c; }
    dirty = true;
  }
  function draw() {
    const W = canvas.width, H = canvas.height; // the camera keeps the film's shape, as the canvas does: the film's view is the film's picture whatever the size
    renderer!.setViewport(0, 0, W, H); renderer!.setScissor(0, 0, W, H); renderer!.setClearColor(0x0b0d0f, 1); renderer!.clear(); renderer!.render(scene!, camera); dirty = false;
  }
  const mark = () => outlines.forEach((o, i) => { const m = o.material as T.LineBasicMaterial; m.opacity = all[i]?.id === target ? 1 : 0.3; });
  /**
   * The places of `next` drawn on the felt: an outline for each, in the order of `all`, made or taken away where the plan has
   * more or fewer places; `keep`: a place held where the hand has it (docka.ts, while it is dragged), whatever the plan says.
   */
  function setPlan(next: Plan, keep?: {id: string; at: Vec3}) {
    planNow = next; all = spots(next, lens);
    while (outlines.length < all.length) { const o = new T.LineLoop(new T.BufferGeometry(), new T.LineBasicMaterial({color: outlineColour, transparent: true, opacity: 0.3})); scene!.add(o); outlines.push(o); }
    while (outlines.length > all.length) { const o = outlines.pop()!; scene!.remove(o); o.geometry.dispose(); (o.material as T.Material).dispose(); }
    all.forEach((s, i) => { if (keep && s.id === keep.id) s.at = keep.at; redraw(outlines[i], s.at, headingOf(next, s.id)); });
    mark(); dirty = true;
  }
  const ray = new T.Raycaster(), felt = new T.Plane(UP, 0);
  setPlan(plan); view('film'); setTime(0);
  return {
    lens, doll,
    /** Another motion in the same room (at least two frames, as the stage mixes between two); the time goes to its start. */
    setMotion(motion: Read) { if (motion.frameCount < 2 || motion.frames.length !== motion.frameCount) throw Error('A motion needs two frames or more.');
      Object.assign(read, {frames: motion.frames, fps: motion.fps, frameCount: motion.frameCount, hip: motion.hip}); (stage.moments as {lands: number}).lands = motion.rests / motion.fps; setTime(0); },
    duration: () => (read.frameCount - 1) / read.fps, time: () => now, setTime,
    /** The place that is lit, and whose seat "Från spelaren" looks from. */
    setTarget(id: string) { target = id; mark(); dirty = true; },
    setPlan,
    /** The plan's places on the felt as drawn now (a place being moved where the hand has it). */
    places: (): Spot[] => all.map(s => ({...s, at: [...s.at] as Vec3})),
    /** One place's outline moved to `at` on the felt, turned as before; the plan itself is the page's. */
    movePlace(id: string, at: Vec3) { const i = all.findIndex(s => s.id === id); if (i < 0) return; all[i] = {...all[i], at}; redraw(outlines[i], at, headingOf(planNow, id)); dirty = true; },
    /** The point of the felt (y = 0) under a pointer at client pixels `x`, `y`, along the ray from the camera; null off the canvas or where the ray never meets the felt. */
    pick(x: number, y: number): Vec3 | null {
      const box = canvas.getBoundingClientRect(); if (!box.width || !box.height) return null;
      camera.updateMatrixWorld(); ray.setFromCamera(new T.Vector2((x - box.left) / box.width * 2 - 1, 1 - (y - box.top) / box.height * 2), camera);
      const hit = ray.ray.intersectPlane(felt, new T.Vector3()); return hit ? [hit.x, 0, hit.z] : null; },
    /** Whether the mouse turns the view (off while docka.ts moves a place by hand). */
    orbit(on: boolean) { controls.enabled = on; },
    view,
    /** Whether the picture is the film's camera's own now: "Filmens kamera" as it was set, not turned, zoomed or moved since (within 0,01 mm). */
    atFilm: () => !!home && camera.fov === home.fov && camera.position.distanceToSquared(home.p) < 1e-10 && controls.target.distanceToSquared(home.t) < 1e-10,
    setJoints(on: boolean) { joints.group.visible = on; setTime(now); },
    /** The fingertips on the card marked (dealer3d/page/docka.ts: with the joints, and always close on the card). */
    setGrips(on: boolean) { held.group.visible = on; setTime(now); },
    /** The fingertips that touch the card now, and where on it each lies. */
    touching: () => touchNow,
    /** Call when the canvas has got a new size in pixels. */
    resized() { dirty = true; },
    needsDraw: () => dirty, draw,
    /** Where a point of the room is in the picture now, in CSS pixels of the canvas; for a test that looks at the picture. */
    seen(p: number[]) { const q = v3(p).project(camera), box = canvas.getBoundingClientRect(); return {x: (q.x + 1) / 2 * box.width, y: (1 - q.y) / 2 * box.height}; },
    camera: () => ({position: camera.position.toArray(), target: controls.target.toArray(), fov: camera.fov}),
    /** Which room is drawn, and what of the standard room would not load. */
    room: () => ({standard: !!standard, fault: roomFault}),
    dispose() { controls.dispose(); renderer!.dispose(); renderer!.forceContextLoss(); },
  };
}
export type LabStage = ReturnType<typeof createLabStage>;
