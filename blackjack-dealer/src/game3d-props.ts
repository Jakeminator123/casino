// Jakob's table props in the 3D scene: models made in Meshy, thinned and sized by tools/prop-glb.ts (data/props.json),
// read here as GLB and laid on the table as props of the scene ({group, build(edgeZ, scale)}, dealer metres).
//
// The chip tray lies sunk into the felt at the dealer's edge, where the film's hands rest: its highest point is level with
// the felt, so the hands lie on it and nothing of it stands in front of them. It brings its own notch in the felt, and the
// scene's built tray steps aside. The models are in metres with their origin under them and +Z toward the players.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {roomReflection} from './scene3d-table.ts';
import {CARD, type Vec3} from './table-lens.ts';
import {LIVE, liveBox, liveShoeCard, liveShoePose, type LiveSetup} from './table-live.ts';

// Where the tray lies: centred where the built tray was (x across the table), from the dealer's edge toward the players.
// The model is as wide as the built tray but twice as deep (0.215 m), which would put it under the dealer's own cards. So
// its rows are pressed together along their length to this depth: the tubes keep their round section, the chips in them
// become thinner. margin is the gap to the felt.
export const TRAY_PLACE = {x: -0.03, width: 0.54, depth: 0.105, margin: 0.003};
/** The notch in the felt for a tray of that size: a little wider than the tray on every side but the dealer's. */
export const trayNotch = (place = TRAY_PLACE) => ({x0: place.x - place.width / 2 - place.margin, x1: place.x + place.width / 2 + place.margin, s1: place.depth + place.margin});

type Scene = {lit<M extends T.Material>(material: M): M};
async function load(url: string, scene: Scene): Promise<{object: T.Object3D; size: T.Vector3}> {
  const gltf = await new GLTFLoader().loadAsync(url);
  gltf.scene.traverse(node => { const mesh = node as T.Mesh; if (!mesh.isMesh) return; const material = mesh.material as T.MeshStandardMaterial; material.side = T.FrontSide; mesh.material = scene.lit(material); });
  return {object: gltf.scene, size: new T.Box3().setFromObject(gltf.scene).getSize(new T.Vector3())};
}

/** The chip tray as a prop of the scene. Rejects when the model is not there (assets/props/tray.glb is local media). */
export async function loadTray(scene: Scene, url = 'assets/props/tray.glb') {
  const {object, size} = await load(url, scene), group = new T.Group(), place = {...TRAY_PLACE, width: size.x};
  // Sunk so that its highest point (the tops of the chips) is level with the felt, and set against the dealer's edge.
  object.scale.set(1, 1, place.depth / size.z); object.position.set(place.x, -size.y + 0.0004, place.depth / 2);
  group.add(object);
  // deep: the scale toward the players, the tray's own laid footprint under Bred lins (trayDeep in src/scene3d-geometry.ts)
  return {group, notch: trayNotch(place), build(edgeZ: number, scale: number, deep = scale) { group.position.set(0, 0, edgeZ); group.scale.set(scale, scale, deep); }};
}

// The film's own shoe in the standard frame, film pixels: the box that holds it (with room for its shadow), and three corners of
// its foot on the felt: the near long side from its rear to its front, and the far front corner. Measured in the rest film.
// How the model is shown in the scene: how strongly the room is mirrored in it, its roughness at most, and how much its colour is lifted.
export const SHOE_LOOK = {room: 2.4, roughness: 0.42, lift: 2.2};
export const FILM_SHOE = {box: [1192, 635, 1764, 960], rear: [1687, 829], front: [1287, 893], far: [1193, 876]};
/**
 * How the shoe model stands on the felt so that its foot covers the film shoe's: `rear`, `front` and `far` are those three
 * corners as points on the felt (x across, z along; any one unit). The model is `width` wide and `length` long in its own
 * metres, its origin under its middle, its mouth toward +Z. Returns the place of its middle, its turn about the upright axis
 * and its size, in the points' unit.
 */
export function shoeFit(rear: number[], front: number[], far: number[], width: number, length: number): {x: number; z: number; yaw: number; scale: number} {
  const dx = front[0] - rear[0], dz = front[1] - rear[1], long = Math.hypot(dx, dz) || 1, ux = dx / long, uz = dz / long, scale = long / length;
  // across the shoe, toward its far side: what is left of front -> far once its part along the shoe is taken away
  const ax = far[0] - front[0], az = far[1] - front[1], along = ax * ux + az * uz, nx = ax - along * ux, nz = az - along * uz, n = Math.hypot(nx, nz) || 1;
  return {x: (rear[0] + front[0]) / 2 + nx / n * width * scale / 2, z: (rear[1] + front[1]) / 2 + nz / n * width * scale / 2, yaw: Math.atan2(ux, uz), scale};
}
/**
 * The live table's clear shoe and its clear discard box at the dealer's right, drawn from their measures (src/table-live.ts LIVE:
 * the shoe's foot, its heights and its front leaning back, open at the top; inside, the bed rising toward the back and the deck
 * lying on it, every card leaning as the front with its long side across the shoe, the next one's back in the front; the clear
 * piece lying before it; the box's
 * foot and height, and the used cards lying flat in it, back up), for a table with no film over it. Nothing is read from a file.
 * A prop of the scene ({group, build}): the points are the live table's lens world, laid from its dealer edge, which the scene's
 * edge under its camera is.
 */
export function liveProps(scene: Scene, setup: LiveSetup = LIVE) {
  const group = new T.Group(), s = setup.shoe, pose = liveShoePose(s), up: Vec3 = [0, 1, 0];
  const glass = scene.lit(new T.MeshStandardMaterial({color: 0xe4ecf0, transparent: true, opacity: 0.14, roughness: 0.06, depthWrite: false, side: T.DoubleSide}));
  const edge = new T.LineBasicMaterial({color: 0xdce6ea, transparent: true, opacity: 0.6});
  const backs = scene.lit(new T.MeshStandardMaterial({color: 0x8c2030, roughness: 0.75, side: T.DoubleSide})); // the cards' backs
  const sides = scene.lit(new T.MeshStandardMaterial({color: 0xe8e2d6, roughness: 0.8, side: T.DoubleSide})); // a deck's edges, seen from the side
  const at = (p: Vec3, ...steps: [Vec3, number][]) => steps.reduce<Vec3>((q, [d, k]) => [q[0] + d[0] * k, q[1] + d[1] * k, q[2] + d[2] * k], p);
  const FACES = [[0, 1, 2, 3], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]];
  const geometry = (c: Vec3[], faces: number[][]) => {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(c.flat(), 3)); g.setIndex(faces.flatMap(([a, b, d, e]) => [a, b, d, a, d, e])); return g;
  };
  /** A clear solid from its corners (bottom four, then top four, in the same order round), with its edges drawn; `open`: no top. */
  const solid = (c: Vec3[], open = false) => {
    const g = geometry(c, open ? FACES.slice(0, 5) : FACES); g.computeVertexNormals();
    const mesh = new T.Mesh(g, glass); mesh.renderOrder = 4; return [mesh, new T.LineSegments(new T.EdgesGeometry(g, 20), edge)];
  };
  /** A pile of cards from its corners as solid() has them: the first four face shows `face` (a back), the others the deck's edges. */
  const pile = (c: Vec3[], face: number) => {
    const g = geometry(c, FACES).toNonIndexed(); g.computeVertexNormals();
    FACES.forEach((_, i) => g.addGroup(i * 6, 6, i === face ? 0 : 1));
    return new T.Mesh(g, [backs, sides]);
  };
  // The shoe: its foot from the front corner toward the players back along the shoe and across to its far wall, the back end
  // backHeight high, the front leaning back from the foot to frontHeight, the walls' top edges straight between; open at the top.
  const lean = s.frontHeight / Math.tan(s.plateLean), f = pose.front, b = pose.back, w = pose.far;
  const foot = [f, at(f, [w, s.width]), at(f, [w, s.width], [b, s.length]), at(f, [b, s.length])];
  const shoe = solid([...foot, at(foot[0], [b, lean], [up, s.frontHeight]), at(foot[1], [b, lean], [up, s.frontHeight]), at(foot[2], [up, s.backHeight]), at(foot[3], [up, s.backHeight])], true);
  // the bed, rising from the next card's lower edge at the front to the back, and the deck lying on it: the next card's back in
  // the front (liveShoeCard), the rest of the cards behind it along the bed, deckLength in all
  const bed: Vec3 = [b[0] * Math.cos(s.bedLean), Math.sin(s.bedLean), b[2] * Math.cos(s.bedLean)], u0 = s.windowLift / Math.tan(s.plateLean), run = (s.length - u0) / Math.cos(s.bedLean);
  const bedFront = [at(f, [b, u0], [up, s.windowLift]), at(f, [b, u0], [up, s.windowLift], [w, s.width])];
  const bedPlate = solid([...bedFront.map(p => at(p, [up, -0.003])), ...[...bedFront].reverse().map(p => at(p, [bed, run], [up, -0.003])), ...bedFront, ...[...bedFront].reverse().map(p => at(p, [bed, run]))]);
  const card = liveShoeCard(s), face = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([l, h]) => at(card.centre, [card.long, l * CARD.height / 2], [card.short, h * CARD.width / 2], [card.out, CARD.thickness / 2]));
  const deck = pile([...face, ...face.map(p => at(p, [bed, s.deckLength]))], 0);
  // the separate clear piece lying flat on the felt before the shoe's front, which the drawn card slides out over
  const piece = solid([...setup.clearPiece.corners, ...setup.clearPiece.corners.map(p => at(p, [up, 0.003]))]);
  // The discard box: open at the top, its foot from three measured corners, turned as they lie; the used cards lying flat in it,
  // back up, their long side along its depth.
  const box = liveBox(setup.box), turn = box.turn, across: Vec3 = [Math.cos(turn), 0, -Math.sin(turn)], depth: Vec3 = [Math.sin(turn), 0, Math.cos(turn)];
  const corner = at(box.centre, [across, -setup.box.width / 2], [depth, -setup.box.depth / 2]);
  const boxFoot = [corner, at(corner, [across, setup.box.width]), at(corner, [across, setup.box.width], [depth, setup.box.depth]), at(corner, [depth, setup.box.depth])];
  const discard = solid([...boxFoot, ...boxFoot.map(p => at(p, [up, setup.box.height]))], true);
  const lying = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, d]) => at(box.centre, [across, a * CARD.width / 2], [depth, d * CARD.height / 2]));
  const used = pile([...lying, ...lying.map(p => at(p, [up, setup.box.pile]))], 5);
  const inner = new T.Group(); inner.add(deck, used, ...bedPlate, ...shoe, ...piece, ...discard); inner.position.set(0, 0, -setup.edge[2]); group.add(inner);
  return {group, build(edgeZ: number, scale: number) { group.position.set(0, 0, edgeZ); group.scale.setScalar(scale); }};
}

/** The shoe as a prop of the scene, standing where the film's shoe stands. `at`: the three corners of the film shoe's foot as scene points on the felt. Rejects when the model is not there (assets/props/shoe.glb is local media). */
export async function loadShoe(scene: Scene, at: {rear: number[]; front: number[]; far: number[]}, url = 'assets/props/shoe.glb') {
  const {object, size} = await load(url, scene), group = new T.Group(), room = roomReflection();
  // The model's black is nearly without light of its own under the scene's lamps, where the film's shoe shows its faces in a soft
  // sheen: the room is mirrored in it as in the rail's brass, and its colour is lifted to the film shoe's dark grey.
  object.traverse(node => { const mesh = node as T.Mesh; if (!mesh.isMesh) return; const material = mesh.material as T.MeshStandardMaterial;
    material.envMap = room; material.envMapIntensity = SHOE_LOOK.room; material.roughness = Math.min(material.roughness, SHOE_LOOK.roughness); material.color.multiplyScalar(SHOE_LOOK.lift); material.needsUpdate = true; });
  // its shadow on the felt: darkest under it, fading out a little beyond its foot
  const blot = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!, fill = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    fill.addColorStop(0, 'rgba(0,0,0,.62)'); fill.addColorStop(0.62, 'rgba(0,0,0,.5)'); fill.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fill; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const shadow = new T.Mesh(new T.PlaneGeometry(size.x * 1.7, size.z * 1.28).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({map: blot, transparent: true, depthWrite: false})); shadow.renderOrder = -1;
  group.add(shadow, object);
  return {group, build(edgeZ: number, scale: number) { group.position.set(0, 0, edgeZ); group.scale.setScalar(scale);
    const local = (p: number[]) => [p[0] / scale, (p[2] - edgeZ) / scale], fit = shoeFit(local(at.rear), local(at.front), local(at.far), size.x, size.z);
    object.position.set(fit.x, 0.0005, fit.z); object.rotation.set(0, fit.yaw, 0); object.scale.setScalar(fit.scale);
    shadow.position.set(fit.x, 0.0003, fit.z); shadow.rotation.set(0, fit.yaw, 0); shadow.scale.setScalar(fit.scale); }};
}
