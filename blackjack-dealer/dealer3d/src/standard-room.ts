// The standard room: what stands round the standard doll wherever she is shown, the editor of standarddocka/ and the
// studio's doll view alike (Jakob 2026-11-26, of the doll view with its older table: "Vi ska ha in vy/vinkel och allt det
// andra från 'standarddockan'-mappens mini-blender"). Blender's table with its shoe, chip tray and discard box, its
// dealer's edge 15 cm nearer her than the game's edge (avatar-auto-pipeline/assets/bord/standardbord_nara.glb), the
// dealer's stool set under her as she sits, the floor and the light. One definition, so that a picture of the doll is
// the same picture in both places. The models are local media of avatar-auto-pipeline: the page says where its server
// hands them out, and a computer where they are not built has no standard room.
import * as T from 'three';
import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {TABLE_BASE, TABLE_LENS, type Vec3} from './camera.ts';
import {dealerEdge, spots, type Plan} from './world.ts';

/** The game's edge toward the dealer: the middle of the dealer's table edge on the felt (the doll's lens world). */
export const ROOM_EDGE: Vec3 = dealerEdge(TABLE_LENS);
/**
 * Blender's models have their origin on the floor under the game's dealer edge, the felt 0.95 m up, and glTF's axes are
 * the doll's already (y up, the players toward +z): they are laid in the lens world with this offset.
 */
export const BLENDER_TO_LENS: Vec3 = [0, TABLE_BASE.floor, ROOM_EDGE[2]];
/**
 * The stool under her, as she sits when it is set (seatStool). The numbers are those standarddocka/scen/vy.py uses in
 * Blender:
 * - sideways: the seat's middle under her hip;
 * - forward: the backrest backAir metres behind her rearmost point at the seat (her seat and lower back), but never so far
 *   forward that the seat's front edge comes nearer than kneeAir to the back of her calves;
 * - height: the seat's top `sink` over the underside of her thighs (the cushion gives that much under her).
 * Where the seat, its front edge and the backrest lie in the stool's model is found with rays through the seat's middle
 * (seatMid, the model's x and z). Where the seat is too high the stool's legs are pressed together between the floor and
 * legsTo (metres over the floor) and all above them is lowered, so that the foot stays on the floor.
 */
export const STOOL = {backAir: 0.03, kneeAir: 0.02, sink: 0.005, seatMid: [-0.0152, -0.46], legsTo: 0.5};

const v = (p: number[]) => new T.Vector3(p[0], p[1], p[2]);
const shadows = (o: T.Object3D) => o.traverse(m => { if ((m as T.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
/**
 * A model read once per address and kept for the page's life, so that another doll or another scene does not read and
 * parse the 35 MB table or the stool again; each scene gets a copy of its own (sharing the geometry and the materials,
 * which seatStool copies before it moves the stool's corners). A read that failed is forgotten, so it is tried again.
 * `progress` is told only by the read that loads.
 */
const read = new Map<string, Promise<GLTF>>();
async function load(url: string, progress?: (share: number) => void): Promise<T.Object3D> {
  let p = read.get(url);
  if (!p) { p = new GLTFLoader().loadAsync(url, e => { if (progress && e.total) progress(e.loaded / e.total); }); read.set(url, p); p.catch(() => read.delete(url)); }
  return (await p).scene.clone(true);
}

/**
 * The room's light, background and floor, after standarddocka/scen/vy.py: a dark world, a floor of 8 x 8 m round the
 * dealer's edge, and four soft lights (area lights in Blender): the ceiling over the table (the one that casts the
 * shadows), one at her face from the front right, a fill from the left and one from behind. The places are Blender's,
 * carried to the lens world; the strengths are set by eye. The picture has a soft tone curve like Blender's. `key`: clean
 * colours for a film the dealer is to be cut out of (a background of one colour and no floor), which that curve would
 * bleach, so there it is linear.
 */
export function roomLight(scene: T.Scene, renderer: T.WebGLRenderer, key?: {background: number}): {floor: T.Mesh} {
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = key ? T.LinearToneMapping : T.AgXToneMapping; renderer.toneMappingExposure = key ? 0.7 : 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const lin = (r: number, g: number, b: number) => new T.Color().setRGB(r, g, b, T.LinearSRGBColorSpace), z = ROOM_EDGE[2];
  scene.background = key ? new T.Color(key.background) : lin(0.05, 0.05, 0.055);
  scene.environment = new T.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3;
  scene.add(new T.HemisphereLight(0xffffff, 0x3a3836, 0.5));
  const aimed = (strength: number, from: Vec3, at: Vec3) => { const l = new T.DirectionalLight(0xffffff, strength); l.position.set(...from); l.target.position.set(...at); scene.add(l, l.target); return l; };
  const ceiling = new T.SpotLight(0xffffff, 11, 0, 1.15, 1, 2); ceiling.position.set(0, 1.75, z + 0.2); ceiling.target.position.set(0, 0, z + 0.1); ceiling.castShadow = true; scene.add(ceiling, ceiling.target);
  ceiling.shadow.mapSize.set(4096, 4096); ceiling.shadow.bias = -0.00015; ceiling.shadow.normalBias = 0.01; ceiling.shadow.radius = 5; ceiling.shadow.camera.near = 0.3; ceiling.shadow.camera.far = 6;
  aimed(1.1, [0.7, 1.0, z + 1.6], [0, 0.4, z - 0.3]); aimed(0.55, [-0.9, 0.65, z + 1.9], [0, 0.05, z - 0.1]); aimed(0.9, [-0.4, 1.25, z - 1.9], [0, 0.35, z - 0.35]);
  const floor = new T.Mesh(new T.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({color: lin(0.18, 0.17, 0.16), roughness: 0.8})); floor.position.set(0, TABLE_BASE.floor, z); floor.receiveShadow = true; floor.visible = !key; scene.add(floor);
  return {floor};
}

/**
 * The table as it lies in the room. `card`: one of the table's own example cards (the one at seat 4, face up, its middle
 * at the origin, its long side along z), for a page that deals with Blender's card; `marks`: the card places printed on
 * the felt; `places`, `maxMm` and `cardP4Mm`: how far the plan's places lie from the table's printed ones (their
 * middles on the felt, millimetres); `edgeZ` and `topY`: the table's edge toward the dealer and the top of the board
 * (the felt's nearest edge and its height: the felt ends at the tray's back wall, which is the edge).
 */
export type RoomTable = {root: T.Object3D; card: T.Mesh | null; marks: T.Object3D[]; places: {id: string; mm: number}[]; maxMm: number; cardP4Mm: number; edgeZ: number; topY: number};
/**
 * Loads Blender's table (35 MB, so it takes a while) and lays it in the scene. Its example cards (a deal on the places
 * and a deck beside them) are hidden: only the motion's card is to show; the shoe and its cards stay. `key`: the table
 * and the tray in one colour and no print, the discard box gone, the shoe's cards with the trace card's back.
 */
export async function loadTable(url: string, scene: T.Scene, plan: Plan, options: {key?: {table: number; cardBack: number}; progress?: (share: number) => void} = {}): Promise<RoomTable> {
  const root = await load(url, options.progress), key = options.key; root.updateMatrixWorld(true);
  // (three.js drops the dot in node names: giv_P4.C1 and markering_P4.C1 in Blender are giv_P4C1 and markering_P4C1 here.)
  const example = root.getObjectByName('giv_P4C1') as T.Mesh | undefined; let card: T.Mesh | null = null;
  if (example?.isMesh) { const g = example.geometry.clone().applyMatrix4(example.matrixWorld); g.computeBoundingBox(); const b = g.boundingBox!, c = b.getCenter(new T.Vector3()), s = b.getSize(new T.Vector3()); g.translate(-c.x, -c.y, -c.z);
    if (s.x > s.z) g.rotateY(Math.PI / 2);
    card = new T.Mesh(g, Array.isArray(example.material) ? example.material.map(x => x.clone()) : example.material.clone()); card.castShadow = true; card.receiveShadow = true; }
  root.traverse(o => { if (/^(giv_|kort_)/.test(o.name)) o.visible = false; });
  if (key) { const green = new T.MeshStandardMaterial({color: key.table, roughness: 1, metalness: 0}), yellow = new T.MeshStandardMaterial({color: key.cardBack, roughness: 0.9});
    const of = (o: T.Object3D, name: RegExp) => name.test(o.name) || name.test(o.parent?.name ?? '');
    root.traverse(o => { if (/^(kassering_|markering_)/.test(o.name)) o.visible = false; const m = o as T.Mesh; if (!m.isMesh) return;
      if (of(o, /^(bord_|bricka_)/)) m.material = green; else if (of(o, /^sko_kort/)) m.material = yellow; }); }
  root.position.set(...BLENDER_TO_LENS); shadows(root); scene.add(root); root.updateMatrixWorld(true);
  const all = spots(plan, TABLE_LENS), places = all.flatMap(s => { const o = root.getObjectByName(`markering_${s.id.replace('.', '')}`); if (!o) return [];
    const c = new T.Box3().setFromObject(o).getCenter(new T.Vector3()); return [{id: s.id, mm: Math.round(Math.hypot(c.x - s.at[0], c.z - s.at[2]) * 10000) / 10}]; });
  const p4 = all.find(s => s.id === 'P4.C1')!, ex = example ? new T.Box3().setFromObject(example).getCenter(new T.Vector3()) : null;
  const felt = root.getObjectByName('bord_filt'), fb = felt ? new T.Box3().setFromObject(felt) : null, marks: T.Object3D[] = [];
  if (!key) root.traverse(o => { if (o.name.startsWith('markering_')) marks.push(o); });
  return {root, card, marks, places, maxMm: Math.max(...places.map(p => p.mm)), cardP4Mm: ex ? Math.round(Math.hypot(ex.x - p4.at[0], ex.z - p4.at[2]) * 10000) / 10 : NaN,
    edgeZ: fb ? fb.min.z : ROOM_EDGE[2], topY: fb ? fb.max.y : 0};
}

/** How the stool was set: lowered, moved, the seat's top in the model and now (over the floor), the air from her back to the backrest and from the seat's front edge to her calves, and her hip joint. */
export type StoolSet = {lowered: number; moved: Vec3; seatModel: number; seatNow: number; backrest: number; knee: number; hip: Vec3};
/**
 * Loads the dealer's stool and sets it under `figure` as she sits now (the rule STOOL above), so pose her at rest first.
 * `figure` is a rigged model's root with a skinned body and the bones Hips, RightLeg and LeftLeg. The rays go in the
 * stool's own model (the floor at y = 0).
 */
export async function seatStool(url: string, scene: T.Scene, figure: T.Object3D): Promise<{stool: T.Object3D; set: StoolSet}> {
  const bone = (name: string) => { const b = figure.getObjectByName(name); if (!b) throw Error(`The model has no bone ${name}.`); return b.getWorldPosition(new T.Vector3()); };
  // Her body as she sits, in the world (the skin as the skeleton bends it): taken before the stool loads, while she still sits as she was posed.
  let skin: T.SkinnedMesh | null = null; figure.traverse(o => { if ((o as T.SkinnedMesh).isSkinnedMesh) skin = o as T.SkinnedMesh; });
  if (!skin) throw Error('The model has no skinned body.'); const body: T.Vector3[] = [], m = skin as T.SkinnedMesh; figure.updateMatrixWorld(true); m.skeleton.update();
  for (let i = 0; i < m.geometry.attributes.position.count; i++) body.push(m.getVertexPosition(i, new T.Vector3()).applyMatrix4(m.matrixWorld));
  const hip = bone('Hips'), knee = Math.min(bone('RightLeg').y, bone('LeftLeg').y), kneeZ = Math.min(bone('RightLeg').z, bone('LeftLeg').z);
  // (its corners are moved below: this stool's own geometry, not the copy kept for the next scene)
  const stool = await load(url); stool.traverse(o => { const part = o as T.Mesh; if (part.isMesh) part.geometry = part.geometry.clone(); }); stool.updateMatrixWorld(true);
  const hit = (from: Vec3, dir: Vec3, what: string) => { const t = new T.Raycaster(v(from), v(dir)).intersectObject(stool, true)[0]; if (!t) throw Error(`The stool's ${what} was not found.`); return t.point; };
  const [sx, sz] = STOOL.seatMid, seatModel = hit([sx, 3, sz], [0, -1, 0], 'seat').y;
  const backrest = hit([sx, seatModel + 0.2, 1], [0, 0, -1], 'backrest').z, front = hit([sx, seatModel - 0.03, 1], [0, 0, -1], 'front edge').z;
  // Her rearmost point at the seat (her seat and lower back) and the back of her calves under the knees.
  const back = Math.min(...body.filter(p => Math.abs(p.x - hip.x) < 0.15 && p.y > hip.y - 0.12 && p.y < hip.y + 0.25).map(p => p.z));
  const calf = Math.min(...body.filter(p => Math.abs(p.x - hip.x) < 0.25 && p.z > kneeZ - 0.15 && p.y < knee - 0.05 && p.y > knee - 0.3).map(p => p.z));
  const moved: Vec3 = [hip.x - sx, 0, Math.min((back - STOOL.backAir) - (ROOM_EDGE[2] + backrest), (calf - STOOL.kneeAir) - (ROOM_EDGE[2] + front))];
  // The height: the underside of her thighs between the hip and the knees. (Her seat under the hip joint sinks as the
  // doll's code angles the thighs forward, and then lies in the cushion, as a seat does.)
  const lowest = Math.min(...body.filter(p => Math.abs(p.x - hip.x) < 0.19 && p.z > hip.z + 0.05 && p.z < kneeZ - 0.1 && p.y < hip.y).map(p => p.y));
  const seatNow = lowest + STOOL.sink - TABLE_BASE.floor, lowered = seatModel - seatNow;
  stool.traverse(o => { const part = o as T.Mesh; if (!part.isMesh) return; const pos = part.geometry.attributes.position, to = part.matrixWorld, from = to.clone().invert(), p = new T.Vector3();
    for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(to); p.y = p.y > STOOL.legsTo ? p.y - lowered : p.y * (STOOL.legsTo - lowered) / STOOL.legsTo; p.applyMatrix4(from); pos.setXYZ(i, p.x, p.y, p.z); }
    pos.needsUpdate = true; part.geometry.computeBoundingBox(); part.geometry.computeBoundingSphere(); });
  stool.position.set(BLENDER_TO_LENS[0] + moved[0], BLENDER_TO_LENS[1], BLENDER_TO_LENS[2] + moved[2]); shadows(stool); scene.add(stool);
  const mm = (n: number) => Math.round(n * 1000) / 1000;
  return {stool, set: {lowered: mm(lowered), moved: moved.map(mm) as Vec3, seatModel: mm(seatModel), seatNow: mm(seatNow), backrest: mm(back - (ROOM_EDGE[2] + backrest + moved[2])), knee: mm(calf - (ROOM_EDGE[2] + front + moved[2])), hip: [hip.x, hip.y, hip.z].map(mm) as Vec3}};
}
