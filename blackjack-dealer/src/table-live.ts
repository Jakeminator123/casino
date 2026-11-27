// The live table: a second set-up beside the standard (Jakob 2026-11-27: "ska vi bara klona allt som finns på videon
// först, sedan helt enkelt laborera med den så vi inte sitter i gamla spår?"). A real blackjack table measured on a film
// by the measuring workshop live-bj/ (its live-bj/data/uppsattning.json and scen.json, 2026-11-27), copied in here so
// that this is our set-up: nothing here reads live-bj/ when it runs. The standard in table-lens.ts, and all that uses
// it (the game, Paow's films, the doll's motions of today), is not touched by it. The standard doll is set at this table
// through this camera to be compared with the real dealer; the Blender build is avatar-auto-pipeline/scen/bygg_bord.py
// --live (through scen/standard.yaml livebord, written by scen/gen_standard.py out of this file).
//
// Preliminary: measured on one film through one camera. Every number says how sure it is, in the words of the
// measurement: mätt (measured), skattat (estimated, measured but weakly), slutlett (inferred from other measures, not
// seen), antaget (assumed: ours, until a measurement comes). An assumed number is ours on purpose and is changed here
// when it is measured.
//
// World frame: the lens world of the live camera, as table-lens.ts has it for ours: metres, x toward the picture's right
// (the dealer's left), y up with the felt at y = 0, z toward the player, the camera straight over the origin looking
// along -z, pitched down and slightly rolled. Pure: imports only table-lens.ts, no I/O, so the browser reads it too.
import {CARD, SHOE, TABLE_RAIL, TABLE_TOP, cardCorners, type Pixel, type ShoePose, type Vec3} from './table-lens.ts';

const D = Math.PI / 180;
/** How sure a number is (the measurement's own words: measured, estimated, inferred, assumed). */
export type Sure = 'mätt' | 'skattat' | 'slutlett' | 'antaget';

// ---- the camera ------------------------------------------------------------------------------------------------
/**
 * The live table's camera, mätt from 29 single cards lying on the felt (0.54 pixel a corner), checked by the felt's
 * round edge falling on a circle within 1.8 mm. Honest uncertainty: focal length and field of view 5 %, height 2 to 3
 * cm, tilt 0.3 degrees; it stands still through the film. Unlike ours it has its own picture (1728 x 972, 67.6 by 41.3
 * degrees) and a roll: a level line across the felt falls toward the right of the picture by 2.8 pixels per 1000
 * (roll -0.16 degrees). Pixels are pixel centres, origin top left; `centre` is where the optical axis meets the picture.
 * Not a table-lens Lens: filmEye and see draw in the bank's picture without roll, so this camera has its own liveSee.
 */
export type LiveCamera = {focalPx: number; pitch: number; roll: number; height: number; centre: Pixel; film: {width: number; height: number}};
export const LIVE_CAMERA: LiveCamera = {focalPx: 1290.3, pitch: 18.13 * D, roll: -0.16 * D, height: 0.6175, centre: {x: 863.5, y: 485.5}, film: {width: 1728, height: 972}};
/** The camera in the lens world: where it stands, the way it looks, and the picture's right and up (rolled). */
export function liveFrame(c: LiveCamera = LIVE_CAMERA): {position: Vec3; forward: Vec3; right: Vec3; up: Vec3} {
  const s = Math.sin(c.pitch), k = Math.cos(c.pitch), cr = Math.cos(c.roll), sr = Math.sin(c.roll);
  const up0: Vec3 = [0, k, -s]; // the picture's up without roll; right without roll is +x
  return {position: [0, c.height, 0], forward: [0, -s, -k], right: [cr, -up0[1] * sr, -up0[2] * sr], up: [sr, up0[1] * cr, up0[2] * cr]};
}
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** A point of the lens world as the live camera draws it, in the live picture's pixels; null behind the camera. */
export function liveSee(p: Vec3, c: LiveCamera = LIVE_CAMERA): Pixel | null {
  const {position, forward, right, up} = liveFrame(c), d: Vec3 = [p[0] - position[0], p[1] - position[1], p[2] - position[2]], z = dot(d, forward);
  return z > 1e-9 ? {x: c.centre.x + c.focalPx * dot(d, right) / z, y: c.centre.y - c.focalPx * dot(d, up) / z} : null;
}
/** The point a pixel of the live picture shows on the level plane `lift` metres over the felt; null at or above the horizon. */
export function liveOnFelt(px: Pixel, lift = 0, c: LiveCamera = LIVE_CAMERA): Vec3 | null {
  const {position, forward, right, up} = liveFrame(c), a = (px.x - c.centre.x) / c.focalPx, b = -(px.y - c.centre.y) / c.focalPx;
  const d: Vec3 = [forward[0] + right[0] * a + up[0] * b, forward[1] + right[1] * a + up[1] * b, forward[2] + right[2] * a + up[2] * b];
  if (d[1] > -1e-9) return null;
  const t = (lift - position[1]) / d[1]; return [position[0] + d[0] * t, position[1] + d[1] * t, position[2] + d[2] * t];
}

// ---- the set-up --------------------------------------------------------------------------------------------------
/** A card place: where the cards of that order first lay still, and how they lay. */
export type LiveCard = {
  at: Vec3;
  /** The long side's lie on the felt in degrees, 0 to 180, from the z axis toward the x axis (the measurement's turnM). */
  turn: number;
  /** Where `turn` comes from: mätt, or taken from another place where the landings did not agree on it (agreement under 0.5). */
  turnFrom: string;
  landings: number;
  /** The landings' spread, sideways and in depth, in metres. */
  spread: [number, number];
};
/** One of the two measured dealers: how he sits, his hands at rest, and his left hand where it takes the card. */
export type LiveDealer = {
  /** The name the measurement gives the doll made after him. */
  name: string;
  /** The shoulders' middle, mätt in height and sideways through the camera with the depth antaget (behindEdge). */
  shouldersMiddle: Vec3; shoulderWidth: number; eyesOverFelt: number;
  /** mätt the same way, head level and turned to the camera: chin to crown (skattat: a quarter added over the forehead),
   * and how far the chin and the eyes are over the line between the shoulder joints. Waist and hips are hidden by the table. */
  head: {chinToCrown: number; chinOverShoulders: number; eyesOverShoulders: number};
  /** skattat from the frames where a hand lies still: how far behind the felt's edge the trunk is (give or take 0.1 m). */
  behindEdgeEstimated: number;
  /** skattat and likely too short (what points in depth comes out short); the doll's own arms are used. */
  arm: {upper: number; fore: number};
  /** mätt: the point between the thumb's tip and the index finger's laid on the felt, in the waits (both hands still 1.5 s
   * or more), the four commonest by time, the first this style's rest; null where the hand is lifted off the felt. */
  handsAtRest: {left: string; right: string; times: number; seconds: number; leftGrip: Vec3 | null; rightGrip: Vec3 | null}[];
  /** The left hand where it takes the next card: the grip mätt in the picture and laid on the felt, and slutlett how high
   * it is if it is over the middle of what shows of the card (it falls behind the mouth when laid on the felt). */
  leftAtShoe: {reaches: number; onFelt: Vec3; spread: [number, number]; overMouth: Vec3};
};
export type LiveSetup = {
  camera: LiveCamera;
  /** The middle of the dealer's edge, under the camera's line: where the Blender build has its origin, as ours. */
  edge: Vec3;
  /** mätt: a half circle with a straight edge toward the dealer; the circle's centre lies 1.56 cm behind that edge. */
  felt: {centre: Vec3; radius: number; edgeZ: number; frontZ: number; depth: number; widthAtEdge: number};
  /** antaget (ours): the padded rail round the arc, outside the felt; it stands up from the felt and is mätt in pixels only. */
  rail: {width: number; section: typeof TABLE_RAIL};
  shoe: {
    /** mätt where it stands on the felt (corners read by eye, 1 to 2 cm): by the dealer and toward the players at the front, and the back corner toward the players. */
    foot: {byDealer: Vec3; towardPlayers: Vec3; back: Vec3};
    length: number; width: number;
    /** mätt from the picture. */
    backHeight: number;
    /** skattat: the front plate's top if the plate stood upright; leaning at plateLean its top read off the picture would be 0.06 to 0.08 m, too low for a card on it, so this number and the lean are changed together when the lean is measured. */
    frontHeight: number;
    /** antaget (ours, SHOE.plateLean): the lean of the front the next card lies on. */
    plateLean: number;
    /** antaget (ours, SHOE.windowLift): how high over the felt the card's lower edge stands. */
    windowLift: number;
    /** mätt as seen, laid on the felt: the part of the next card that shows in the mouth (4 by 10 cm there), its corners and middle. The card itself lies on the sloping front (liveShoeCard below), not flat on the felt. */
    seen: Vec3[]; seenMiddle: Vec3;
  };
  /** mätt where it stands: a clear box at the dealer's right, open at the top. Foot: near left, near right, far right. */
  box: {foot: [Vec3, Vec3, Vec3]; width: number; depth: number; height: number};
  /** mätt in the 8 keyframes where it lies out (it is not always there): the red cut card before the box. */
  cutCard: {middle: Vec3; size: [number, number]};
  /** mätt: there is none, the chips are the game's graphics. The Blender build can add ours (bygg_bord.py --live --med-bricka), marked as ours. */
  tray: null;
  /** mätt: the middle of the game's seat buttons, the bet marks, seat 1 at the picture's left (the dealer's right). */
  betMarks: Vec3[];
  /** mätt: the card places, D for the dealer's own and P<seat>.C<order> for a player's (seat 1 at the picture's left). */
  cards: Record<string, LiveCard>;
  dealer: {
    /** mätt: he sits, on a high chair. */
    sits: true;
    /** antaget: how far behind the felt's edge his trunk is, the plane the heights are measured on. */
    behindEdge: number;
    styles: {kameran: LiveDealer; bordet: LiveDealer};
  };
  /** slutlett, not mätt (the floor is never in the picture): from the dealers' eyes when they stand at the table. */
  floor: {feltOverFloor: number; giveOrTake: number; seatOverFloor: number};
};

const card = (x: number, z: number, turn: number, turnFrom: string, landings: number, spread: [number, number]): LiveCard => ({at: [x, 0, z], turn, turnFrom, landings, spread});
/**
 * The set-up, copied from live-bj/data/uppsattning.json of 2026-11-27 (as pushed in 72f7aa6). The card places' lie: where the landings agree on
 * it (long_side_agreement 0.5 or more) it is theirs; where they do not, it is the mirror image of the same card at the
 * mirrored seat (seat 1 and 7, 2 and 6, 3 and 5), else that seat's own first card's.
 */
export const LIVE: LiveSetup = {
  camera: LIVE_CAMERA,
  edge: [0, 0, -1.5375],
  felt: {centre: [0.002, 0, -1.5531], radius: 0.7295, edgeZ: -1.5375, frontZ: -0.824, depth: 0.714, widthAtEdge: 1.459},
  rail: {width: TABLE_TOP.rail, section: TABLE_RAIL},
  shoe: {
    foot: {byDealer: [0.427, 0, -1.4842], towardPlayers: [0.4521, 0, -1.3844], back: [0.7162, 0, -1.4577]},
    length: 0.274, width: 0.103, backHeight: 0.117, frontHeight: 0.108, plateLean: SHOE.plateLean, windowLift: SHOE.windowLift,
    seen: [[0.3652, 0, -1.446], [0.4017, 0, -1.4618], [0.4311, 0, -1.3674], [0.3977, 0, -1.3589]], seenMiddle: [0.3989, 0, -1.4085],
  },
  box: {foot: [[-0.6481, 0, -1.4543], [-0.5725, 0, -1.458], [-0.5749, 0, -1.5506]], width: 0.076, depth: 0.093, height: (0.159 + 0.156) / 2},
  cutCard: {middle: [-0.5737, 0, -1.4042], size: [0.0479, 0.0863]},
  tray: null,
  betMarks: [[-0.4967, 0, -1.1335], [-0.3347, 0, -0.9978], [-0.1711, 0, -0.9279], [0.0004, 0, -0.9074], [0.173, 0, -0.9295], [0.3363, 0, -1.0013], [0.4991, 0, -1.1392]],
  cards: {
    'D.C1': card(-0.0272, -1.3601, 4.8, 'mätt', 18, [0.042, 0.054]),
    'D.C2': card(0.0243, -1.3447, 177.7, 'mätt', 18, [0.091, 0.066]),
    'D.C3': card(-0.0269, -1.3567, 3.5, 'mätt', 11, [0.104, 0.055]),
    'P1.C1': card(-0.4206, -1.2185, 128.7, 'spegel av P7.C1', 6, [0.01, 0.107]),
    'P1.C2': card(-0.3732, -1.2157, 136.0, 'mätt', 5, [0.029, 0.003]),
    'P1.C3': card(-0.3701, -1.2165, 124.9, 'spegel av P7.C3', 3, [0.023, 0.011]),
    'P2.C1': card(-0.2964, -1.1272, 150.0, 'spegel av P6.C1', 3, [0.043, 0.021]),
    'P2.C2': card(-0.2987, -1.1171, 149.9, 'spegel av P6.C2', 2, [0.001, 0.009]),
    'P3.C1': card(-0.0938, -1.0974, 166.1, 'spegel av P5.C1', 3, [0.035, 0.054]),
    'P4.C1': card(0.0155, -1.0251, 177.7, 'mätt', 11, [0.009, 0.026]),
    'P4.C2': card(0.044, -1.0648, 179.0, 'mätt', 9, [0.008, 0.012]),
    'P5.C1': card(0.1575, -1.0402, 13.9, 'mätt', 6, [0.031, 0.037]),
    'P5.C2': card(0.1804, -1.0839, 12.4, 'mätt', 4, [0.006, 0.01]),
    'P6.C1': card(0.2922, -1.1044, 30.0, 'mätt', 14, [0.006, 0.025]),
    'P6.C2': card(0.2974, -1.1509, 30.1, 'mätt', 11, [0.004, 0.008]),
    'P6.C3': card(0.2949, -1.1602, 30.0, 'som P6.C1', 3, [0.048, 0.015]),
    'P7.C1': card(0.4265, -1.2306, 51.3, 'mätt', 14, [0.021, 0.066]),
    'P7.C2': card(0.4156, -1.2762, 44.0, 'spegel av P1.C2', 11, [0.018, 0.025]),
    'P7.C3': card(0.4612, -1.2739, 55.1, 'mätt', 5, [0.043, 0.039]),
  },
  dealer: {
    sits: true,
    behindEdge: 0.2,
    styles: {
      kameran: {
        name: 'danilo', shouldersMiddle: [0.033, 0.318, -1.738], shoulderWidth: 0.357, eyesOverFelt: 0.509,
        head: {chinToCrown: 0.228, chinOverShoulders: 0.063, eyesOverShoulders: 0.191}, behindEdgeEstimated: 0.065, arm: {upper: 0.266, fore: 0.219},
        handsAtRest: [
          {left: 'plats 6', right: 'lyft', times: 4, seconds: 18.1, leftGrip: [0.224, 0, -1.2423], rightGrip: null},
          {left: 'skon', right: 'lyft', times: 4, seconds: 17.1, leftGrip: [0.3207, 0, -1.3086], rightGrip: null},
          {left: 'egna kort', right: 'plats 1', times: 3, seconds: 14.6, leftGrip: [-0.0805, 0, -1.4619], rightGrip: [-0.531, 0, -1.2734]},
          {left: 'egna kort', right: 'lådan', times: 3, seconds: 9.8, leftGrip: [-0.0473, 0, -1.4688], rightGrip: [-0.5336, 0, -1.3121]},
        ],
        leftAtShoe: {reaches: 58, onFelt: [0.4683, 0, -1.5765], spread: [0.075, 0.071], overMouth: [0.3989, 0.068, -1.4085]},
      },
      bordet: {
        name: 'frasse', shouldersMiddle: [0.046, 0.31, -1.738], shoulderWidth: 0.348, eyesOverFelt: 0.514,
        head: {chinToCrown: 0.21, chinOverShoulders: 0.089, eyesOverShoulders: 0.204}, behindEdgeEstimated: 0.158, arm: {upper: 0.228, fore: 0.195},
        handsAtRest: [
          {left: 'mot skon', right: 'lådan', times: 7, seconds: 61.3, leftGrip: [0.1815, 0, -1.4294], rightGrip: [-0.4809, 0, -1.3536]},
          {left: 'skon', right: 'egna kort', times: 9, seconds: 37.6, leftGrip: [0.3399, 0, -1.3561], rightGrip: [-0.1312, 0, -1.3596]},
          {left: 'plats 7', right: 'egna kort', times: 6, seconds: 27.6, leftGrip: [0.2647, 0, -1.2652], rightGrip: [-0.1327, 0, -1.3596]},
          {left: 'mot skon', right: 'egna kort', times: 4, seconds: 10.8, leftGrip: [0.1647, 0, -1.3902], rightGrip: [-0.1472, 0, -1.3561]},
        ],
        leftAtShoe: {reaches: 71, onFelt: [0.4482, 0, -1.5481], spread: [0.044, 0.074], overMouth: [0.3989, 0.057, -1.4085]},
      },
    },
  },
  floor: {feltOverFloor: 0.95, giveOrTake: 0.1, seatOverFloor: 0.67},
};

// ---- what follows from it ----------------------------------------------------------------------------------------
/** The shoe's pose in table-lens.ts's form: the front corner toward the players, the way to the back, and across to the far wall. */
export function liveShoePose(s: LiveSetup['shoe'] = LIVE.shoe): ShoePose {
  const f = s.foot.towardPlayers, b = s.foot.back, n = Math.hypot(b[0] - f[0], b[2] - f[2]), back: Vec3 = [(b[0] - f[0]) / n, 0, (b[2] - f[2]) / n];
  return {front: f, back, far: [back[2], 0, -back[0]], footLength: n}; // across, away from the camera (-z): toward the dealer's corner
}
/**
 * The next card in the shoe: on the sloping front as in our shoe (table-lens.ts shoeCard: its lower edge windowLift over
 * the felt, in the middle of the shoe, a millimetre outside the plate), but with its long side across the shoe, since
 * what shows of it in the mouth is 10 cm across (seen). Its centre, the direction of its long side (across, toward the
 * far wall), of its short side (up the front) and out of the front. Measured against the picture this card stands some
 * 75 pixels right of what shows in the mouth: what shows lies 2.5 to 6.7 cm in front of the foot's marked front corners
 * on the felt, where no card on a front leaning back from those corners can be seen; the front's lean and where it
 * starts are what the measurement has still to give.
 */
export function liveShoeCard(s: LiveSetup['shoe'] = LIVE.shoe): {centre: Vec3; long: Vec3; short: Vec3; out: Vec3} {
  const pose = liveShoePose(s), c = Math.cos(s.plateLean), n = Math.sin(s.plateLean), b = pose.back, f = pose.front, w = pose.far;
  const short: Vec3 = [b[0] * c, n, b[2] * c], out: Vec3 = [-b[0] * n, c, -b[2] * n], along = s.windowLift / n + CARD.width / 2;
  const mid: Vec3 = [f[0] + w[0] * s.width / 2, 0, f[2] + w[2] * s.width / 2];
  return {centre: [mid[0] + short[0] * along + out[0] * 0.001, short[1] * along + out[1] * 0.001, mid[2] + short[2] * along + out[2] * 0.001], long: w, short, out};
}
/** The box's middle on the felt and its turn (radians, the near side's direction from +x toward -z). */
export function liveBox(b: LiveSetup['box'] = LIVE.box): {centre: Vec3; turn: number} {
  const [nl, nr, fr] = b.foot, a = Math.atan2(-(nr[2] - nl[2]), nr[0] - nl[0]), c = Math.atan2(-(fr[2] - nr[2]), fr[0] - nr[0]) - Math.PI / 2;
  return {centre: [(nl[0] + fr[0]) / 2, 0, (nl[2] + fr[2]) / 2], turn: (a + c) / 2};
}
/** A card place's heading for table-lens.ts cardCorners (radians: positive turns the card's far end toward the picture's right). */
export const liveCardHeading = (c: LiveCard) => -(c.turn > 90 ? c.turn - 180 : c.turn) * D;
/** The four corners of a card lying at a card place, as cardCorners gives them. */
export const liveCardCorners = (id: string): Vec3[] | null => { const c = LIVE.cards[id]; return c ? cardCorners(c.at, liveCardHeading(c)) : null; };
