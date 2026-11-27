// The standard: Livestandarden, the live table (src/table-live.ts) as everything that records, orders, edits and shows
// reads it (Jakob 2026-11-27: "vi byter standard till att i princip enbart utgå från vy/vinkel/riktningar/storlekar och
// annat som fanns i videon"). One table, one camera, one picture; no choice. It points at the measures in
// src/table-live.ts and copies none of them.
//
// Pure: imports only src/space.ts and src/table-live.ts, no I/O, so the browser reads it too. World frame: the live
// camera's lens world (metres, x toward the picture's right, the dealer's left, y up with the felt at 0, z toward the
// players, the camera straight over the origin). Tests: tools/standard.test.ts.
import type {Pixel, ShoePose, Vec3} from './space.ts';
import {LIVE, LIVE_CAMERA, liveCardHeading, liveOnFelt, liveSee, liveShoePose} from './table-live.ts';

/** A card place: where its middle lies on the felt, and its heading as src/space.ts cardCorners takes it (radians, positive turns the card's far end toward the picture's right). */
export type Plats = {id: string; at: Vec3; heading: number};
/** A bet mark: the middle of seat 1–7's ring or button on the felt (seat 1 at the picture's left, the dealer's right). */
export type Insats = {seat: number; at: Vec3};
/** The bet ring drawn round each measured bet mark (LIVE.betMarks): its radius, and the felt it keeps clear. */
export const BET = {radius: 0.027, clear: 0.012};
/** The game's own framing of the table until Jakob saves one (zoom and turns in degrees from the film camera's place). */
export type Framing = {zoom: number; pitch: number; yaw: number};

export type Standard = {
  /** Its name where Jakob sees it, and one line on what it is. */
  namn: string; om: string;
  /** The picture its films and stills are made in. */
  bild: {width: number; height: number};
  /** The camera: focal length in the picture's pixels, pitch below the horizontal and roll (radians; roll as table-live.ts liveFrame turns the picture), height over the felt, and where the optical axis meets the picture. */
  kamera: {focalPx: number; pitch: number; roll: number; height: number; centre: Pixel};
  /** A point of the lens world in the picture's pixels; null behind the camera. */
  see(p: Vec3): Pixel | null;
  /** The point a pixel shows on the level plane `lift` metres over the felt; null at or above the horizon. */
  onFelt(px: Pixel, lift?: number): Vec3 | null;
  /** The middle of the dealer's edge of the felt. */
  kant(): Vec3;
  kortplatser(): Plats[];
  insatser(): Insats[];
  /** The shoe's foot on the felt (src/space.ts ShoePose). */
  sko: ShoePose;
  /** The table: the felt's half width at the dealer's edge and its depth toward the players, and the padded rail's width. */
  bord: {halfWidth: number; depth: number; rail: number};
  /** The game's own framing of it until Jakob saves one. */
  spelvy: {dator: Framing; mobil: Framing};
  /** The file his saved play view is kept in (tools/play-view-store.ts, /api/play-view). */
  spelvyFil: string;
  /** The dolls that sit at it (dealer3d/src/doll.ts). */
  dockor: readonly string[];
};

export const STANDARD: Standard = {
  namn: 'Livestandarden', om: 'Bordet, kameran, skon, korten och kortplatserna som de är mätta ur filmen av ett riktigt livebord.',
  bild: LIVE_CAMERA.film,
  kamera: {focalPx: LIVE_CAMERA.focalPx, pitch: LIVE_CAMERA.pitch, roll: LIVE_CAMERA.roll, height: LIVE_CAMERA.height, centre: LIVE_CAMERA.centre},
  see: p => liveSee(p), onFelt: (px, lift = 0) => liveOnFelt(px, lift),
  kant: () => LIVE.edge,
  kortplatser: () => Object.entries(LIVE.cards).map(([id, c]) => ({id, at: c.at, heading: liveCardHeading(c)})),
  insatser: () => LIVE.betMarks.map((at, i) => ({seat: i + 1, at})),
  sko: liveShoePose(LIVE.shoe),
  bord: {halfWidth: LIVE.felt.widthAtEdge / 2, depth: LIVE.felt.depth, rail: LIVE.rail.width},
  // The film's own frame on a computer (exactly the cloned view); on a phone held upright seats 2–6 whole across the picture's
  // width, rings and cards (they reach 421 px from the picture's middle, so the zoom is at most 2,05; 1,95 leaves a margin), with
  // the dealer's head and the cards in it. First values of the game's own, until Jakob saves his in the game's view.
  spelvy: {dator: {zoom: 1, pitch: 0, yaw: 0}, mobil: {zoom: 1.95, pitch: -2, yaw: 0}}, spelvyFil: 'data/play-view-live.json',
  dockor: [LIVE.dealer.styles.kameran.name, LIVE.dealer.styles.bordet.name],
};
