// Pure geometry for the 3D scene tab: the film camera read from data/scene-contract.json and the mapping
// between film pixels and the table top. No I/O and no three.js, so Node can test it.
// World frame, metres: x toward image right, y up, z toward the camera. The felt is y = 0, the film camera
// stands at (0, heightM, 0) looking along -z, pitched down. Lengths are in the film camera's scene units; `scale` says how many
// of them a dealer metre is: 1 under the live table's camera (setupCamera), the contract's k under the room's (cameraFromContract).
// The pinhole itself is the one in src/scene-geometry.ts (table millimetres, Y away from the camera); this file only changes frame.
import {applyH, cameraHomography, cameraProject, inv3, type Camera} from './scene-geometry.ts';
import {FILM} from './plan-lens.ts';
import {BET, type Standard} from './standard.ts';

/** The contract's picture (the bank's frame, src/plan-lens.ts), which the room's camera is composed for. A film camera carries its own (FilmCamera frame). */
export {FILM};
/**
 * A film camera. `frame`: the picture its films are in, pixels (the live table's own 1728 x 972; the contract's 1764 x 1174 for the
 * room's camera); the optical axis meets it in its middle. `roll`: how the picture is turned about its middle
 * (radians, as src/table-live.ts liveFrame has it: the live table's -0.16 degrees lowers the picture's right), 0 but for the live
 * table. Rows and the edge row are counted in the picture as it would be without the roll (unrolled, below).
 */
export type FilmCamera = {focalPx: number; horizonRow: number; edgeRow: number; heightM: number; scale: number; source: 'contract' | 'lens'; frame: {width: number; height: number}; roll: number};
export type TablePoint = {x: number; z: number};
/** dealer metres: x across the table, s from the dealer-side edge toward the players; turn: a card place's lie where it has one (radians, as src/space.ts cardCorners takes a heading: positive turns its far end toward the picture's right). */
export type Spot = {id: string; x: number; s: number; turn?: number};
/** The middle of a camera's picture, where its optical axis meets it. */
const middleOf = (c: Pick<FilmCamera, 'frame'>) => ({x: (c.frame.width - 1) / 2, y: (c.frame.height - 1) / 2});
/** A pixel of the picture as it would be without the camera's roll (turned back about the middle), and the other way; unchanged at roll 0. */
function unrolled(c: FilmCamera, px: number, py: number): [number, number] {
  if (!c.roll) return [px, py];
  const m = middleOf(c), dx = px - m.x, dy = py - m.y, cr = Math.cos(c.roll), sr = Math.sin(c.roll);
  return [m.x + dx * cr - dy * sr, m.y + dx * sr + dy * cr];
}
function rolled(c: FilmCamera, ux: number, uy: number): {x: number; y: number} {
  if (!c.roll) return {x: ux, y: uy};
  const m = middleOf(c), dx = ux - m.x, dy = uy - m.y, cr = Math.cos(c.roll), sr = Math.sin(c.roll);
  return {x: m.x + dx * cr + dy * sr, y: m.y - dx * sr + dy * cr};
}

type Figure = {value?: unknown};
const figure = (group: Record<string, Figure> | undefined, name: string): number => {
  const v = group?.[name]?.value; if (typeof v !== 'number' || !Number.isFinite(v)) throw Error(`scene-contract.json saknar keyFigures.${name}.value.`); return v;
};
// The contract's camera (data/scene-contract.json): the one the room's pictures were composed for (src/scene3d-view.ts written).
export function cameraFromContract(contract: {keyFigures?: Record<string, Figure>; cardSizeAtTargets?: {scale?: {bodyScale?: {k?: unknown}}}}): FilmCamera {
  const k = contract.keyFigures, focalPx = figure(k, 'focalPx'), tilt = figure(k, 'tiltDownDeg') * Math.PI / 180, body = contract.cardSizeAtTargets?.scale?.bodyScale?.k;
  return {focalPx, horizonRow: middleOf({frame: FILM}).y - focalPx * Math.tan(tilt), edgeRow: figure(k, 'dealerEdgeImageRow'), heightM: figure(k, 'heightAboveFeltMm') / 1000, scale: typeof body === 'number' && body > 0 ? body : 1, source: 'contract', frame: FILM, roll: 0};
}
/**
 * The standard's camera (src/standard.ts) as the scene's film camera: the live table's, in real metres (scale 1, source 'lens'),
 * with its own picture and roll. Its world is the live table's lens world itself: the camera over the origin, and the dealer's
 * edge where the live table has it (the edge row is the row that edge has in the unrolled picture).
 */
export function setupCamera(u: Pick<Standard, 'bild' | 'kamera' | 'kant'>): FilmCamera {
  const k = u.kamera, y = (u.bild.height - 1) / 2, distance = -u.kant()[2];
  return {focalPx: k.focalPx, horizonRow: y - k.focalPx * Math.tan(k.pitch), edgeRow: y + k.focalPx * Math.tan(Math.atan(k.height / distance) - k.pitch), heightM: k.height, scale: 1, source: 'lens', frame: u.bild, roll: k.roll};
}
/** The film row of the dealer's table edge, as the contract has measured it. */
export const edgeRowOf = (contract: {keyFigures?: Record<string, Figure>}): number => figure(contract.keyFigures, 'dealerEdgeImageRow');
// Pitch below the horizontal (radians), ground distance from below the camera to the dealer-side table edge, vertical field of view.
export function solveCamera(c: FilmCamera) {
  const CY = middleOf(c).y, pitch = Math.atan((CY - c.horizonRow) / c.focalPx), edgeDistance = c.heightM / Math.tan(pitch + Math.atan((c.edgeRow - CY) / c.focalPx));
  return {pitch, edgeDistance, fovYDeg: 2 * Math.atan(c.frame.height / 2 / c.focalPx) * 180 / Math.PI};
}
// The pinhole of src/scene-geometry.ts, whose roll turns the picture as the camera's does (rollDeg: the same sign as liveFrame's roll).
const pinhole = (c: FilmCamera): Camera => { const m = middleOf(c); return {focalPx: c.focalPx, cx: m.x, cy: m.y, pitchDeg: solveCamera(c).pitch * 180 / Math.PI, rollDeg: c.roll * 180 / Math.PI, yawDeg: 0, heightMm: c.heightM * 1000, x: 0, y: 0}; };
// Film pixel -> point on the felt, or null for a pixel at or above the table's vanishing line.
export function filmToTable(c: FilmCamera, px: number, py: number): TablePoint | null {
  if (unrolled(c, px, py)[1] <= c.horizonRow + 1e-9) return null;
  const p = applyH(inv3(cameraHomography(pinhole(c))), {x: px, y: py}); return {x: p.x / 1000, z: -p.y / 1000};
}
export const tableToFilm = (c: FilmCamera, x: number, z: number): {x: number; y: number} => cameraProject(pinhole(c), {x: x * 1000, y: -z * 1000, z: 0});
// Vertical field of view of a view that shows the whole film frame at zoom 1: fitted by height on wide canvases, by width on tall ones.
export function viewFovDeg(c: FilmCamera, aspect: number, zoom = 1): number {
  const {width, height} = c.frame, half = aspect >= width / height ? height / 2 / c.focalPx : width / 2 / c.focalPx / aspect;
  return 2 * Math.atan(half / zoom) * 180 / Math.PI;
}
// Extra yaw and pitch (radians, three.js sign: yaw turns toward -x) that keep `pivot` where it was when the camera moves from `base` to `moved`.
export function aimCorrection(base: number[], moved: number[], pivot: number[]): {yaw: number; pitch: number} {
  const a = pivot.map((v, i) => v - base[i]), b = pivot.map((v, i) => v - moved[i]);
  return {yaw: Math.atan2(-b[0], -b[2]) - Math.atan2(-a[0], -a[2]), pitch: Math.atan2(b[1], Math.hypot(b[0], b[2])) - Math.atan2(a[1], Math.hypot(a[0], a[2]))};
}
// Where a film pixel lies in the scene: on the felt from the dealer edge row downward, on the vertical plane standing on that edge above it.
// Under a roll the edge row and the upright plane are taken in the unrolled picture.
export function filmToScene(c: FilmCamera, px: number, py: number): [number, number, number] {
  const {pitch, edgeDistance} = solveCamera(c), [ux, uy] = unrolled(c, px, py), table = uy >= c.edgeRow ? filmToTable(c, px, py) : null;
  if (table) return [table.x, 0, table.z];
  const m = middleOf(c), u = ux - m.x, v = uy - m.y, forward = c.focalPx * Math.cos(pitch) - v * Math.sin(pitch), t = edgeDistance / forward;
  return [u * t, c.heightM - (v * Math.cos(pitch) + c.focalPx * Math.sin(pitch)) * t, -edgeDistance];
}
export type CardTrack = {leavesShoe?: number | null; restFrom?: number | null; frames?: {frame: number; quad?: number[][] | null; edge?: number[][] | null}[]};
// The film pixel to keep sharp while a card is dealt: the card's centre from shortly before it leaves the shoe until
// shortly after it has come to rest. Null otherwise: a card lying still is not the subject, the dealer is.
export function cardFocusPixel(track: CardTrack | null, frame: number, lead = 6, hold = 18): {x: number; y: number} | null {
  if (!track?.frames || typeof track.leavesShoe !== 'number' || typeof track.restFrom !== 'number') return null;
  if (frame < track.leavesShoe - lead || frame > track.restFrom + hold) return null;
  return cardPixel(track, frame);
}
// Centre of the tracked card on a frame, wherever it is; null when the frame has neither quad nor edge.
export function cardPixel(track: CardTrack | null, frame: number): {x: number; y: number} | null {
  const entry = track?.frames?.find(f => f.frame === frame), points = entry?.quad ?? entry?.edge;
  if (!points?.length) return null;
  return {x: points.reduce((s, p) => s + p[0], 0) / points.length, y: points.reduce((s, p) => s + p[1], 0) / points.length};
}

// ---- a card as an object in the scene ---------------------------------------------------------------------
// The rendered card is geometry in the scene (src/scene3d-deal.ts), placed so that seen from the film camera it covers the
// film's card exactly: each point of the card is where the film's own surfaces (filmToScene) carry the film pixel that the
// card's homography gives it. The card thereby lies on the felt like the film's hands, and stays with them when the view
// moves. A true 3D pose solved from the quad (a card of known size seen by the known camera) was tried and dropped: the
// tracked corners are a few pixels off a true perspective rectangle, and a 70 px card has only about 8 px of perspective,
// so the lying P4 card came out 13 cm under the felt and tilted 35 degrees.
export type Vec3 = [number, number, number];
/**
 * The projective map of the unit square onto a quad (row-major, last element 1): (0,0), (1,0), (1,1), (0,1) go to the
 * quad's corners in order. Card coordinates u to the right and v downward of the visible print, as the track orders its
 * corners (top left, top right, bottom right, bottom left), so a print laid with it sits on the film's card exactly.
 */
export function squareToQuad(q: number[][]): number[] {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  if (Math.abs(sx) < 1e-12 && Math.abs(sy) < 1e-12) return [x1 - x0, x3 - x0, x0, y1 - y0, y3 - y0, y0, 0, 0, 1];
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(den) < 1e-12) throw Error('Degenerate card quad.');
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}
/** A scene point seen from the film camera, in film pixels; null behind the camera. */
export function filmPixel(c: FilmCamera, p: Vec3): {x: number; y: number} | null {
  const q = solveCamera(c).pitch, cq = Math.cos(q), sq = Math.sin(q), y = p[1] - c.heightM, z = p[2], forward = -y * sq - z * cq, m = middleOf(c);
  return forward > 1e-9 ? rolled(c, m.x + c.focalPx * p[0] / forward, m.y + c.focalPx * (-y * cq + z * sq) / forward) : null;
}
/** An edge-on card as a thin quad along its edge line, `half` pixels to each side, in texture order (clockwise on screen). */
export function edgeQuad(a: number[], b: number[], half: number): number[][] {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l * half, ny = (b[0] - a[0]) / l * half;
  const q = [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]];
  const area = q.reduce((s, p, i) => { const r = q[(i + 1) % 4]; return s + p[0] * r[1] - r[0] * p[1]; }, 0);
  return area >= 0 ? q : [q[1], q[0], q[3], q[2]];
}
/**
 * How large the rendered card is drawn in the hand, as a share of the overlay's own size there (card-overlay.ts poseAt,
 * which makes it MARGIN times the film's card so that the film's card cannot show beside it). The scene keys the film's card
 * away instead, so in the hand the card can be the film's card itself (`held` = 1 / MARGIN): fingers that hold its edge then
 * hold the rendered card's edge. It grows to the plan's resting size while it settles (`resting` 0 to 1).
 */
export const heldScale = (resting: number, held: number): number => held + (1 - held) * Math.max(0, Math.min(1, resting));

// ---- time: what moves by the clock, kept pure so it can be tested ---------------------------------------
// Angles of a clock's hands in radians, clockwise from twelve. Every hand creeps; none of them ticks.
export function clockAngles(hours: number, minutes: number, seconds: number): {hour: number; minute: number; second: number} {
  const turn = 2 * Math.PI; return {second: seconds / 60 * turn, minute: (minutes + seconds / 60) / 60 * turn, hour: (hours % 12 + minutes / 60 + seconds / 3600) / 12 * turn};
}
// A lamp that flickers now and then: 1 most of the time, and once in every `every` seconds a short burst of dips,
// at most down to 1 - strength. Decided by the time alone, so nothing has to be stored and the same second always looks the same.
export function flickerLevel(seconds: number, every: number, strength: number): number {
  if (!(every > 0) || !(strength > 0) || !Number.isFinite(seconds)) return 1;
  const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const slot = Math.floor(seconds / every), length = Math.min(every, 0.5 + hash(slot + 0.5) * 0.7), t = seconds - (slot * every + hash(slot) * (every - length));
  if (t < 0 || t > length) return 1;
  const dip = hash(slot * 31 + Math.floor(t / 0.06)); // a new dip every 60 ms, strongest in the middle of the burst
  return 1 - Math.min(1, strength) * Math.sin(Math.PI * t / length) * (dip > 0.45 ? dip : 0.15);
}
// A cloud passing the sun, for rooms lit from outside: 1 most of the time, and once in every `every` seconds a smooth dip of
// three to five seconds, at most down to 1 - strength. Same rule as the flicker: the time alone decides.
export function cloudLevel(seconds: number, every: number, strength: number): number {
  if (!(every > 0) || !(strength > 0) || !Number.isFinite(seconds)) return 1;
  const hash = (n: number) => { const x = Math.sin(n * 91.7 + 17.3) * 24634.6345; return x - Math.floor(x); };
  const slot = Math.floor(seconds / every), length = Math.min(every, 3 + hash(slot + 0.5) * 2), t = seconds - (slot * every + hash(slot) * (every - length));
  return t < 0 || t > length ? 1 : 1 - Math.min(1, strength) * Math.sin(Math.PI * t / length) ** 2;
}

// Bet rings: one per player seat, round the live table's measured bet marks (setupBets). The felt prints them from this and a
// game reads the same list, so print and game cannot drift apart. Dealer metres, seats in order. The ring's size: src/standard.ts BET.
export {BET};
export type BetSpot = {id: string; x: number; s: number; radius: number};
/** A point of the live table's lens world on the felt as dealer metres under its camera (setupCamera): x across, s from its edge. */
const setupSpot = (c: FilmCamera, at: readonly number[]) => ({x: at[0] / c.scale, s: (at[2] + solveCamera(c).edgeDistance) / c.scale});
/** The standard's card places (src/standard.ts kortplatser: metres with their lie) as the scene's spots under its camera. */
export const setupSpots = (u: Pick<Standard, 'kortplatser'>, c: FilmCamera): Spot[] => u.kortplatser().map(p => ({id: p.id, ...setupSpot(c, p.at), turn: p.heading}));
/** The standard's bet marks (src/standard.ts insatser, measured on the live table) as the scene's bet rings, seat 1 at the picture's left. */
export const setupBets = (u: Pick<Standard, 'insatser'>, c: FilmCamera): BetSpot[] => u.insatser().map(b => ({id: `P${b.seat}`, ...setupSpot(c, b.at), radius: BET.radius}));
// A point in dealer metres (x across the table, s from the dealer-side edge toward the players, y above the felt) as a
// scene position, and a scene position on the felt back in dealer metres.
export function spotToScene(c: FilmCamera, x: number, s: number, y = 0): [number, number, number] { return [x * c.scale, y * c.scale, s * c.scale - solveCamera(c).edgeDistance]; }
export function sceneToSpot(c: FilmCamera, x: number, z: number): {x: number; s: number} { return {x: x / c.scale, s: (z + solveCamera(c).edgeDistance) / c.scale}; }
