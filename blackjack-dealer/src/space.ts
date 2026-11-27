// The table's space and the real card in it: vectors in metres and a playing card's own measures, shared by the live
// table (src/table-live.ts), the game's scene, the doll and the editor. No camera and no table here: those are the live
// table's (src/table-live.ts LIVE_CAMERA and LIVE). Pure, no imports, no I/O, so the browser reads it too.
//
// World frame: the live camera's lens world (src/table-live.ts): metres, x toward the picture's right (the dealer's left),
// y up with the felt at y = 0, z toward the players.

/** A real playing card (63 x 88 mm), in metres; thickness and corner radius for a drawn card. */
export const CARD = {width: 0.063, height: 0.088, thickness: 0.0003, corner: 0.0035};
export type Vec3 = [number, number, number];
export type Pixel = {x: number; y: number};

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: Vec3): Vec3 => mul(a, 1 / (length(a) || 1));

/** The four corners of a card lying flat at `centre`: far left, far right, near right, near left for heading 0. `grow` enlarges the card about its middle. Heading in radians, positive turns the card's far end toward the picture's right. */
export function cardCorners(centre: Vec3, heading = 0, grow = 1): Vec3[] {
  const c = Math.cos(heading), s = Math.sin(heading), right: Vec3 = [c, 0, s], away: Vec3 = [s, 0, -c], hw = CARD.width * grow / 2, hh = CARD.height * grow / 2;
  return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([a, b]) => add(centre, add(mul(right, a * hw), mul(away, b * hh))));
}
/** A card in space from its centre and the directions of its long and short sides: the two corners at the long side's far end first, then the other two, going round. */
export function cardInSpace(centre: Vec3, up: Vec3, across: Vec3, grow = 1): Vec3[] {
  const hw = CARD.width * grow / 2, hh = CARD.height * grow / 2;
  return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([a, b]) => add(centre, add(mul(across, a * hw), mul(up, b * hh))));
}
/** How a lying card's outline measures on screen: its far and near edge, its depth between their middles, and far over near (the taper). */
export function quadMeasure(q: Pixel[]) {
  const d = (a: Pixel, b: Pixel) => Math.hypot(a.x - b.x, a.y - b.y), mid = (a: Pixel, b: Pixel): Pixel => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
  const far = d(q[0], q[1]), near = d(q[3], q[2]);
  return {far, near, depth: d(mid(q[0], q[1]), mid(q[3], q[2])), taper: far / near};
}
/** The sides of a card's outline on screen: the mean of its two short sides and of its two long sides, in pixels. */
export function sides(q: Pixel[]) {
  const d = (a: Pixel, b: Pixel) => Math.hypot(a.x - b.x, a.y - b.y);
  return {short: (d(q[0], q[1]) + d(q[3], q[2])) / 2, long: (d(q[1], q[2]) + d(q[0], q[3])) / 2};
}
/** Where a shoe stands: the front end of its near wall on the felt, the direction from front to back, across the shoe away from the camera, and the length of its foot. */
export type ShoePose = {front: Vec3; back: Vec3; far: Vec3; footLength: number};
