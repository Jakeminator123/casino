// The live table's own props in the 3D scene: its shoe, its discard box and the cards in them, drawn from the measures
// (src/table-live.ts), laid on the table as a prop of the scene ({group, build(edgeZ, scale)}, dealer metres).
import * as T from 'three';
import {roomReflection} from './scene3d-table.ts';
import {CARD, type Vec3} from './space.ts';
import {LIVE, liveBox, liveShoeCard, liveShoePose, type LiveSetup} from './table-live.ts';

type Scene = {lit<M extends T.Material>(material: M): M};

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
