// The dolls: one named set of measures each (Jakob 2026-11-21: "Kanske kan man ta mått för respektive dealer?"). A doll is
// where the upright figure's joints are in the bank's frame, how long its bones are, how far it may bend, and the shapes the
// stage draws round its joints. Pure: no I/O and no three.js.
//   standard   the white figure every deal and film until 2026-11-21 was made with; its numbers are those of body.ts BODY
//              and dealer3d/src/stage.ts as they stood, and give the same frames to the last digit
//   paow       a stand-in with Paow's own measures, read by SAM 3D Body on her anchors 1 and 2.3 (dealer3d/tools/docka-sam.py,
//              dealer3d/tools/docka-mat.ts): where her hands say she sits, straight trunk, sloping shoulders, a neck, the
//              head over the trunk, her own hand, and elbows that hang where hers do
//   man        the standard doll's man (avatar-auto-pipeline's standarddocka_man.glb): his own arms and hands measured on
//              the model (dealer3d/tools/docka-standard.ts, which writes it), seated where Paow sits, her hand's shapes
//              bent on his own bones
// `about` says of each measure whether it is measured (mätt, and on what) or guessed (gissat, and why).
// A doll from SAM with all its joints (fingers, face) is a doll whose `skeleton` is filled: the names, parents and rest
// places of the joints, read as dealer3d/tools/docka-sam.py reads them; see DollSkeleton.
import {add, filmEye, length, mul, onUpright, sub, unit, type Lens, type Pixel, type Vec3} from './camera.ts';
import {ASSUMED, DOLL_TABLE, MEASURED, dealerEdge} from './world.ts';

export type Frame = {hip: Vec3; shoulders: [Vec3, Vec3]; neck: Vec3; head: Vec3; headRadius: number}; // shoulders: her right (image left), her left (image right)
/**
 * Where the upright figure is.
 * 'film': as the standard has always been placed: the jacket's shoulder points of paow-nyp-ung-1 read by eye, taken
 *   `jointIn` of the way in, the neck `neckOver` metres over their middle, the head between the top of the hair and the chin.
 * 'joints': the joint centres as a reading of her picture has them, as pixels of the bank's frame on the upright plane of
 *   her shoulders, `behindEdge` metres behind the table edge, each with how far it stands ahead of that plane (metres,
 *   toward the camera); the head's radius is her skull's (crown to chin, halved), not her hair's. `behindEdge` is where
 *   her hands say she is: a reading of her picture is as big and as far away as it must be for the hands that lie on the
 *   felt to lie on it (dealer3d/tools/docka-mat.ts, handsOnFelt). Every length of the doll is a length at that distance.
 * 'seat': a doll measured on its own model (the standard doll's man and woman), placed in metres: its shoulder joints
 *   `shouldersApart` apart, their middle `behindEdge` metres behind the table edge, `shoulderHeight` over the felt and at
 *   `x` across, the hip `trunk` metres straight under that middle (its own hip-to-shoulders), and the neck and the head as
 *   steps from that middle (across, up, toward the camera).
 */
export type DollPlace =
  | {kind: 'film'; jointIn: number; neckOver: number}
  | {kind: 'seat'; behindEdge: number; shoulderHeight: number; x: number; shouldersApart: number; trunk: number; neck: Vec3; head: Vec3; headRadius: number}
  | {kind: 'joints'; behindEdge: number; shoulders: [Pixel, Pixel]; neck: Pixel; head: Pixel; ahead: {shoulders: [number, number]; neck: number; head: number}; headRadius: number};
/** The shapes drawn round the joints (dealer3d/src/stage.ts), metres. */
export type DollShape = {
  /** 'bar': one straight cylinder between the shoulder joints (the standard's yoke). 'slope': one from a point `footOver` metres over the shoulders' middle (along the trunk) down to each shoulder joint, as shoulders slope from the neck. */
  yoke: {kind: 'bar'; radius: number} | {kind: 'slope'; radius: number; footOver: number};
  shoulderBall: number; elbowBall: number; wristBall: number;
  upperArmRadius: [number, number]; forearmRadius: [number, number];
  /** The neck from the frame's neck up to `intoHead` of the head's radius under the head's middle, radius at the foot and at the top. */
  neck: {radius: [number, number]; intoHead: number};
  /** The head: a ball of the frame's head radius times `scale`, stretched by `skull` (across, up, deep). */
  headScale: number; skull: Vec3;
  /**
   * The trunk between the hip and the shoulders' middle, leaning and turning with them. 'egg' (the standard's): one egg
   * reaching `wide` times the shoulders' span to each side, `tall` times hip-to-shoulders up and down from its middle and
   * `deep` metres to the front and back, its middle `at` of the way from the hip to the shoulders. 'profile': one smooth
   * body turned about its upright axis, `profile` its half-width (times the shoulders' span) at heights (times
   * hip-to-shoulders over the hip), from the bottom up and closing at the top, and `deep` its depth as a share of its width.
   */
  trunk: {kind: 'egg'; wide: number; tall: number; deep: number; at: number} | {kind: 'profile'; profile: [number, number][]; deep: number};
};
/** All the joints of a doll that came out of SAM 3D Body (127 for MHR: fingers, face, tongue and twist joints among them): names, each joint's parent (-1 for the root), and where each is in the doll's rest pose, metres in the scene. */
export type DollSkeleton = {names: string[]; parents: number[]; rest: Vec3[]; source: string};
/**
 * A doll's own hand: its 21 points against the wrist in the hand's own axes (dealer3d/src/hand-pose.ts: along the hand, the
 * way the palm looks, across), metres, her right hand and her left as she holds them at the anchor `anchor`. The bones'
 * lengths are those between the points. `at` is where each hand lies in the room at that anchor: its wrist and the hand's
 * axes forward and palm (metres; the room of dealer3d/src/world.ts, the doll standing on its own `place`). A motion laid
 * with the standard's hand is carried to it by dealer3d/tools/doll-pose.ts: this shape, lying here, where the motion stands
 * at that anchor; the fingers bend from it as the motion's do, and away from the anchor the hand holds what the motion's holds.
 * `grip` is the same hand (its palm, its bones' lengths) as she carries a card: the shape the hand has away from the anchor.
 * `rest` is the same hand as it lies at rest (anchor 1), its shape and its place: what the hand is where a motion stands at rest.
 * `topp`, where it is given, is how thick the tips are on the doll's skin (dealer3d/src/fingertopp.ts): the deals rest a
 * tip point that far from the card or the felt, never nearer than the stage draws a tip (hand-rule.ts DRAWN).
 * `natural` is her left hand at the anchor as the doll lab's "Naturlig" has it (naturalDoll): its shape and its place
 * fitted to the hand in her picture (dealer3d/tools/docka-hand.ts), the same palm and bones; "Som förut", the films made
 * and the motions in dealer3d/data/ keep `left` and `at.left`.
 */
export type HandPlace = {wrist: Vec3; forward: Vec3; palm: Vec3};
export type DollHand = {anchor: string; right: Vec3[]; left: Vec3[]; at: {right: HandPlace; left: HandPlace}; grip?: {right: Vec3[]; left: Vec3[]};
  /** How far a fingertip's point and the thumb's are from what they touch, metres: the tip's radius on the skin, where it is measured (a doll from a rigged model). */
  topp?: {finger: number; thumb: number};
  rest?: {right: Vec3[]; left: Vec3[]; at: {right: HandPlace; left: HandPlace}}; natural?: {left: Vec3[]; at: {left: HandPlace}}};
export type Doll = {
  name: string;
  upperArm: number; forearm: number;
  /** Where the elbows hang: the pole each arm bends toward (body.ts arm), her right arm's and her left's. Without it the standard's (ELBOW_POLES). */
  elbowPoles?: [Vec3, Vec3];
  /**
   * Where the elbows hang in the posture she rests in, both hands in front of her: a pole for her right arm and her left,
   * and how far that posture holds, by how far out to the arm's own side of its shoulder each wrist is as a share of the
   * arm's length: a hand counts as in front up to within[0] and as out from within[1], eased between, and the two hands'
   * shares are multiplied. So with one hand out to its side (as at the shoe) both arms bend toward `elbowPoles`.
   * See elbowPolesAt.
   */
  elbowAtRest?: {poles: [Vec3, Vec3]; within: [number, number]};
  hand?: DollHand;
  /** How far the dealing wrist may be from the shoulder before she bends (body.ts solveBody), and how far she may bend and turn, radians. */
  reach: number; mostLean: number; mostTwist: number;
  hipBelowFelt: number;
  place: DollPlace; shape: DollShape; skeleton?: DollSkeleton;
  about: Record<string, string>;
};

/** The poles the figure's elbows have always bent toward: out to her side, down and back; her right arm's and her left's. */
export const ELBOW_POLES: [Vec3, Vec3] = [[-0.7, -0.6, -0.4], [0.7, -0.6, -0.4]];
const eased = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
/**
 * The poles the doll's arms bend their elbows toward (body.ts arm), her right arm's and her left's, from where her
 * shoulders and wrists are. A doll without poles of its own has the standard's; one with `elbowAtRest` turns both toward
 * those poles as far as both hands lie in front of their shoulders.
 */
export function elbowPolesAt(doll: Doll, shoulders: [Vec3, Vec3], wrists: [Vec3, Vec3]): [Vec3, Vec3] {
  const poles = doll.elbowPoles ?? ELBOW_POLES, rest = doll.elbowAtRest; if (!rest) return poles;
  const inFront = (side: 0 | 1) => 1 - eased(((wrists[side][0] - shoulders[side][0]) * (side ? 1 : -1) / (doll.upperArm + doll.forearm) - rest.within[0]) / (rest.within[1] - rest.within[0]));
  const share = inFront(0) * inFront(1); if (share <= 0) return poles;
  return [unit(add(poles[0], mul(sub(rest.poles[0], poles[0]), share))), unit(add(poles[1], mul(sub(rest.poles[1], poles[1]), share)))];
}
export const STANDARD: Doll = {
  name: 'standard',
  upperArm: 0.29, forearm: 0.26, reach: 0.535, mostLean: 0.6, mostTwist: 0.6, hipBelowFelt: 0.2,
  place: {kind: 'film', jointIn: 0.82, neckOver: 0.03},
  shape: {yoke: {kind: 'bar', radius: 0.052}, shoulderBall: 0.055, elbowBall: 0.04, wristBall: 0.031, upperArmRadius: [0.047, 0.04], forearmRadius: [0.038, 0.03],
    neck: {radius: [0.04, 0.036], intoHead: 0.6}, headScale: 0.92, skull: [0.74, 1, 0.86], trunk: {kind: 'egg', wide: 0.47, tall: 0.56, deep: 0.095, at: 0.52}},
  about: {all: 'som dockan har varit sedan 2026-11-17: axlarna i kavajens axelpunkter (paow-nyp-ung-1, lästa med ögat) 0,82 in, huvudet mellan hårets topp och hakan, armarna 0,29 och 0,26 m antagna'},
};

// Paow's measures. SAM 3D Body read her anchors 1 (paow-vila-tatuerad) and 2.3 (paow-ankare-2-3-c) in the bank's frame
// (dealer3d/tools/docka-sam.py); dealer3d/tools/docka-mat.ts laid each reading into the scene, scaled about the eye, and
// measured it. How big and how far away, her hands say: in anchor 1 both lie on the felt, in 2.3 her right lies on it and
// her left holds the card in the shoe's window, and those four touches put her shoulders 0.37 to 0.39 m behind the table
// edge. (Until 2026-11-23 the doll stood on the standard's plane 0.18 m behind it, every length 9 % short: the hands then
// reached their places with the elbows where hers never are.) Places are anchor 1's, where she sits still and straight.
// "mätt" is a measure of those readings (mean of the two where both are good); "gissat" is not.
export const PAOW: Doll = {
  name: 'paow',
  upperArm: 0.293, forearm: 0.275, reach: 0.552, mostLean: 0.21, mostTwist: 0.63, hipBelowFelt: 0.278,
  elbowPoles: [[-0.354, -0.707, 0.612], [0.015, -0.985, -0.173]],
  elbowAtRest: {poles: [[-0.207, -0.743, 0.636], [0.315, -0.777, 0.545]], within: [0, 0.11]},
  place: {kind: 'joints', behindEdge: 0.38, shoulders: [{x: 687, y: 445.5}, {x: 1045, y: 445.5}], neck: {x: 865.5, y: 432.6}, head: {x: 864.1, y: 208.8}, ahead: {shoulders: [0, 0], neck: 0.012, head: 0.012}, headRadius: 0.118},
  shape: {yoke: {kind: 'slope', radius: 0.049, footOver: 0.055}, shoulderBall: 0.049, elbowBall: 0.04, wristBall: 0.03, upperArmRadius: [0.048, 0.041], forearmRadius: [0.035, 0.029],
    neck: {radius: [0.068, 0.051], intoHead: 0.6}, headScale: 1, skull: [0.71, 1, 0.93],
    trunk: {kind: 'profile', deep: 0.68, profile: [[0.2, 0.4], [0.33, 0.39], [0.45, 0.365], [0.55, 0.375], [0.62, 0.395], [0.7, 0.435], [0.8, 0.468], [0.88, 0.472], [0.95, 0.445], [1, 0.4], [1.05, 0.32], [1.09, 0.2], [1.115, 0.08], [1.12, 0]]}},
  hand: {anchor: '2.3',
    right: [[0, 0, 0], [0.0244, 0.0234, -0.0244], [0.0525, 0.0357, -0.038], [0.0864, 0.0461, -0.0438], [0.1094, 0.0566, -0.0506], [0.084, 0.0089, -0.0249], [0.1217, 0.0198, -0.017], [0.1446, 0.0299, -0.0112], [0.1644, 0.0365, -0.0053], [0.0862, 0, 0], [0.1291, 0.0085, 0.0087], [0.1549, 0.0149, 0.0142], [0.1769, 0.0185, 0.019], [0.0776, 0.0014, 0.0201], [0.117, 0.0016, 0.028], [0.1435, 0.005, 0.0336], [0.1654, 0.0079, 0.0368], [0.066, 0.007, 0.0387], [0.0941, -0.003, 0.046], [0.1136, -0.0045, 0.052], [0.133, -0.0024, 0.0553]],
    left: [[0, 0, 0], [0.0244, 0.0234, 0.0244], [0.0521, 0.035, 0.0393], [0.0853, 0.0452, 0.0487], [0.1082, 0.0554, 0.0563], [0.084, 0.0089, 0.0249], [0.1171, 0.0235, 0.0077], [0.1314, 0.0436, 0.0003], [0.1375, 0.064, -0.0029], [0.0862, 0, 0], [0.1291, 0.0092, -0.0084], [0.1468, 0.0294, -0.0119], [0.1536, 0.051, -0.0133], [0.0776, 0.0014, -0.0201], [0.1162, -0.0028, -0.0303], [0.1388, 0.0125, -0.0303], [0.1479, 0.0317, -0.0234], [0.066, 0.007, -0.0387], [0.0927, -0.0075, -0.0345], [0.1128, -0.0102, -0.0327], [0.1322, -0.0077, -0.0287]],
    at: {right: {wrist: [0.0118, 0.0318, -1.8452], forward: [0.8154, 0.1346, 0.563], palm: [0.2699, -0.9488, -0.1641]},
      left: {wrist: [0.2944, 0.0853, -1.9349], forward: [0.3705, 0.223, 0.9017], palm: [-0.0373, -0.9664, 0.2543]}},
    grip: {right: [[0, 0, 0], [0.0244, 0.0234, -0.0244], [0.0524, 0.0416, -0.0273], [0.0843, 0.0561, -0.0192], [0.1041, 0.067, -0.006], [0.084, 0.0089, -0.0249], [0.1155, 0.029, -0.0106], [0.1176, 0.0527, -0.0008], [0.1137, 0.0724, 0.0073], [0.0862, 0, 0], [0.1233, 0.0198, 0.0149], [0.1256, 0.046, 0.0216], [0.1223, 0.0682, 0.0254], [0.0776, 0.0014, 0.0201], [0.1104, 0.0186, 0.0357], [0.1055, 0.0454, 0.0357], [0.0955, 0.0649, 0.0312], [0.066, 0.007, 0.0387], [0.0922, 0.0184, 0.0499], [0.094, 0.0387, 0.0488], [0.0868, 0.0553, 0.0408]],
      left: [[0, 0, 0], [0.0244, 0.0234, 0.0244], [0.0499, 0.0395, 0.0391], [0.0816, 0.0563, 0.0415], [0.103, 0.0711, 0.0441], [0.084, 0.0089, 0.0249], [0.1205, 0.0233, 0.0167], [0.1349, 0.0433, 0.0094], [0.1442, 0.0615, 0.0023], [0.0862, 0, 0], [0.116, 0.0323, -0.0074], [0.1191, 0.0591, -0.0104], [0.1183, 0.0818, -0.0122], [0.0776, 0.0014, -0.0201], [0.1064, 0.0281, -0.0282], [0.1125, 0.0546, -0.031], [0.1144, 0.0769, -0.0311], [0.066, 0.007, -0.0387], [0.0866, 0.026, -0.0511], [0.0937, 0.0445, -0.0558], [0.0984, 0.0639, -0.0561]]},
    rest: {right: [[0, 0, 0], [0.0244, 0.0234, -0.0244], [0.0519, 0.0328, -0.0412], [0.0866, 0.0413, -0.0445], [0.1109, 0.0505, -0.0484], [0.084, 0.0089, -0.0249], [0.1226, 0.0157, -0.0166], [0.1462, 0.0236, -0.0103], [0.1662, 0.0291, -0.004], [0.0862, 0, 0], [0.1297, 0.0066, 0.0071], [0.1558, 0.0126, 0.0118], [0.1779, 0.0166, 0.0158], [0.0776, 0.0014, 0.0201], [0.1175, 0.0031, 0.0249], [0.1444, 0.0058, 0.0284], [0.1664, 0.009, 0.03], [0.066, 0.007, 0.0387], [0.096, 0.0019, 0.0426], [0.1161, 0.0013, 0.0466], [0.1357, 0.003, 0.0483]],
      left: [[0, 0, 0], [0.0244, 0.0234, 0.0244], [0.051, 0.0346, 0.0414], [0.0853, 0.0446, 0.0459], [0.1088, 0.0549, 0.051], [0.084, 0.0089, 0.0249], [0.1221, 0.0175, 0.0161], [0.1456, 0.0258, 0.0095], [0.1653, 0.0319, 0.003], [0.0862, 0, 0], [0.129, 0.0102, -0.0076], [0.155, 0.0162, -0.0124], [0.177, 0.0201, -0.0164], [0.0776, 0.0014, -0.0201], [0.1171, 0.006, -0.0253], [0.144, 0.0096, -0.029], [0.1659, 0.0137, -0.0308], [0.066, 0.007, -0.0387], [0.096, 0.0027, -0.0431], [0.116, 0.0026, -0.0475], [0.1357, 0.0047, -0.0495]],
      at: {right: {wrist: [-0.1595, 0.0266, -1.867], forward: [0.5478, 0.1937, 0.8139], palm: [0.3375, -0.9413, -0.0031]},
        left: {wrist: [0.1425, 0.0242, -1.876], forward: [-0.5539, 0.1926, 0.81], palm: [-0.3192, -0.9477, 0.0071]}}},
    natural: {left: [[0, 0, 0], [0.0244, 0.0234, 0.0244], [0.0525, 0.0228, 0.0427], [0.0859, 0.02, 0.0557], [0.1096, 0.0239, 0.0662], [0.084, 0.0089, 0.0249], [0.1225, 0.0198, 0.0251], [0.1473, 0.0269, 0.0253], [0.1678, 0.0334, 0.0254], [0.0862, 0, 0], [0.1291, 0.0105, 0.0066], [0.1552, 0.0169, 0.0105], [0.1774, 0.0202, 0.0138], [0.0776, 0.0014, -0.0201], [0.1174, 0.0067, -0.0219], [0.1434, 0.0101, -0.0146], [0.1605, 0.0108, -0.0002], [0.066, 0.007, -0.0387], [0.0957, -0.0002, -0.0359], [0.1154, -0.0052, -0.0353], [0.1341, -0.0117, -0.0327]],
      at: {left: {wrist: [0.2782, 0.1029, -1.9437], forward: [0.515, -0.0963, 0.8518], palm: [0.0727, -0.9852, -0.1553]}}}},
  about: {
    place: 'mätt: hennes händer mot filten och kortet i skon (ankare 1: 390 och 372 mm bakom bordskanten, ankare 2.3: 374 och 380); 0,38 m. Mått tagna vid 0,18 m är 9 % för korta',
    upperArm: 'mätt: axel- till armbågsled 293 mm (ankare 1 och 2.3, båda armarna)',
    forearm: 'mätt: armbågs- till handled 275 mm',
    reach: 'gissat: armarnas summa gånger 0,972, samma andel som standarddockans 0,535 av 0,55',
    mostLean: 'mätt förhållande, gissat tak: när hon lägger kortet på plats 4 lutar hon 6-7 grader och vrider axlarna 23 (given till plats 4, läst med SAM), tre gånger så mycket vridning som lutning; taket 12 grader gissat',
    mostTwist: 'tre gånger lutningen (se mostLean); taket 36 grader gissat',
    elbowPoles: 'mätt: det håll hennes armbågar hänger åt i givarna till plats 4 och 1 och i ankare 2.3 (femton bilder): nedåt och en aning utåt, inte bakåt som standarddockans',
    elbowAtRest: 'mätt: i vilan, med båda händerna framför sig, hänger hennes armbågar utåt och fram, inte rakt ned som i givarna (tre bilder: vilan och de två första ur ingångsfilmen till 2.3; dockans armbågar hamnar inom 11 bildpunkter från hennes till höger och inom 4 till vänster, mot 34 till 44 och 130 med givarnas poler). Vilans poler gäller bara medan ingen hand är ute åt sin egen sida om axeln: gränsen 0,11 av armens längd är satt så att givarna från 2.3 inte ändras, där är vänsterhanden vid skon minst 0,119 ut. Handens plats ensam skiljer inte vilan från en giv: i given till plats 1 går hennes högra hand förbi samma plats framför axeln med armbågen längre ut än i vilan',
    hand: 'mätt: hennes hand i ankare 2.3, benens längder medel av båda händerna över femton bilder; handen 190 mm från handled till långfingertopp, 70 mm över knogarna. Var händerna ligger i ankaret (at) är läst i samma bild, med hennes axlar 0,38 m bakom bordskanten. Greppet (grip) är hennes hand när hon bär kortet: högern medel av sex bilder ur givarna till plats 4 och 1 (fingrarnas mellanleder böjda 48-74 grader), vänstern två bilder (32-36 grader). Vänsterhandens fingrar i ankaret (left) är böjda så att de ritade topparna (fingret slutar i en kula på 8,2 mm) ligger på hennes vid skon, lästa med ögat i 8x, och pek-, lång- och ringfingrets kulor vilar på kortets yta i skons fönster (2026-11-23; de stack ut 8-15 bildpunkter); pek- och långfingret böjer i alla tre lederna mot handflatan, mellanleden en och en halv gång den yttre (de var bakåtböjda 21-36 grader i mellan- och ytterleden, en klo); benlängderna och handflatan är desamma',
    handNatural: 'mätt: vänsterhanden i ankare 2.3 som Naturlig har den (2026-11-23, Jakob: handen över skon "fel i grunden … typ lillfingret"). SAM läste handen pekande mot kameran med ryggen nästan på kant (77 grader mot ögat), handleden 10 bildpunkter för långt till höger och ned och knogarnas linje vriden 34 grader i bilden; för att topparna ändå skulle nå hennes böjdes fingrarna till en klo och lillfingret 40 grader bakåt. MediaPipe läste hennes hand i ankarbilden paow-ankare-2-3-d (tre utsnitt i dubbel storlek, medel); handen är anpassad till den läsningen med samma handflata och benlängder, fingrarna böjda bara i sina leder och inom dem, pek-, lång- och ringfingrets toppar på kortets yta i skons fönster (dealer3d/tools/docka-hand.ts). Felet i bilden 3,3 bildpunkter i medel mot 12,5; handleden 25 mm längre in mot skon, handen vriden 26 grader, ryggen 53 grader mot ögat, fingrarna raka och lillfingret lyft (som hennes), handleden böjd 42 grader mot handflatan',
    handAtRest: 'mätt: hennes händer i vilan (ankare 1, en bild): samma handflata och benlängder som hand, varje fingerben pekar som hennes där; var händerna ligger (at) är läst i samma bild med axlarna 0,38 m bakom bordskanten',
    hipBelowFelt: 'mätt längd, gissad hållning: höftled till axelleder 505 och 511 mm; rak bål rakt under axlarna (höfterna syns inte, SAM lägger dem 13-17 cm framför)',
    shoulders: 'mätt: axellederna på rad 448 och 443 (1764x1174), 366 mm isär; jämnade till rad 445,5. Standarddockans leder ligger högre, i hennes akromion',
    neck: 'mätt: halsleden 19 och 26 mm över axellederna, 12 mm framför; halsen 57 mm i radie 3-6 cm upp, där den vidgas mot axlarna; ritad 68 mm vid foten och 51 vid huvudet (gissat: foten vidgas mot nacken och axlarna)',
    head: 'mätt: skallen 236 mm från hjässa till haka, 167 bred och 220 djup vid ögonen; utan hår. Hakan på rad 323 (med ögat 322)',
    yoke: 'mätt mot hennes kontur på greenen: 50 mm över lederna vid axelspetsen och 58-63 mm 14 cm från mitten, en lutning på 14-15 grader',
    shoulderBall: 'mätt: akromion 42-45 mm över axelleden, konturen 46-52',
    arms: 'mätt: överarmen 46-50 mm och underarmen 35 mm i radie; avsmalningen, armbågs- och handledskulan gissade',
    trunk: 'mätt vid 0,8-0,88 av höft-axel: 355-365 bred och 221-234 djup; vid 0,7: 320 bred; vid 0,6: 285 och 210; dockans profil är andelar av axelbredden och höft-axel, och djupet 0,68 av bredden. Midjan, höfterna under filten och toppen under oket gissade: låren skymmer i läsningen',
  },
};

/** The upright figure, as the film has her: joints on the plane she sits in, behind the table edge (the standard's 0.18 m, or the doll's own). */
export function dollFrame(lens: Lens, doll: Doll = STANDARD): Frame {
  const p = doll.place, eye = filmEye(lens), z = dealerEdge(lens)[2] - (p.kind === 'film' ? ASSUMED.shouldersBehindEdge : p.behindEdge), at = (x: number, y: number) => onUpright(eye, x, y, z)!;
  if (p.kind === 'seat') {
    const mid: Vec3 = [p.x, p.shoulderHeight, z], half: Vec3 = [p.shouldersApart / 2, 0, 0];
    return {hip: [p.x, p.shoulderHeight - p.trunk, z], shoulders: [sub(mid, half), add(mid, half)], neck: add(mid, p.neck), head: add(mid, p.head), headRadius: p.headRadius};
  }
  if (p.kind === 'film') {
    const a = at(MEASURED.shoulders.a.x, MEASURED.shoulders.a.y), b = at(MEASURED.shoulders.b.x, MEASURED.shoulders.b.y), mid = mul(add(a, b), 0.5), k = p.jointIn;
    const midX = (MEASURED.pupils.a.x + MEASURED.pupils.b.x) / 2, crown = at(midX, MEASURED.crownRow), chin = at(midX, MEASURED.chinRow);
    return {hip: [mid[0], -doll.hipBelowFelt, z], shoulders: [add(mid, mul(sub(a, mid), k)), add(mid, mul(sub(b, mid), k))], neck: [mid[0], mid[1] + p.neckOver, z], head: mul(add(crown, chin), 0.5), headRadius: length(sub(crown, chin)) / 2};
  }
  // A point a reading put `ahead` metres before the plane, on the ray through its pixel (so that it is drawn on that pixel).
  const ahead = (q: Pixel, by: number): Vec3 => onUpright(eye, q.x, q.y, z + by)!;
  const a = ahead(p.shoulders[0], p.ahead.shoulders[0]), b = ahead(p.shoulders[1], p.ahead.shoulders[1]), mid = mul(add(a, b), 0.5);
  return {hip: [mid[0], -doll.hipBelowFelt, z], shoulders: [a, b], neck: ahead(p.neck, p.ahead.neck), head: ahead(p.head, p.ahead.head), headRadius: p.headRadius};
}

/**
 * How a card lies on a place of the standard doll's table (src/table-lens.ts DOLL_TABLE.cardsFrom): the angle of its long
 * side about the upright, radians, 0 toward the players (+z) and positive toward the dealer's left (+x). A player's card
 * points along the line from the dealer (the standard figure's middle, `cardsFrom` behind the game's edge) through the
 * place, the line its player sits on; the same angle as avatar-auto-pipeline's scen/standard.yaml has as
 * riktning_mot_dealer, which the doll table's marks are turned by. The dealer's own cards (D.…) lie straight.
 */
export function dollCardYaw(id: string, at: Vec3, lens: Lens): number {
  return /^P\d/.test(id) ? Math.atan2(at[0] - dollFrame(lens, STANDARD).hip[0], at[2] - (dealerEdge(lens)[2] - DOLL_TABLE.cardsFrom)) : 0;
}

/** The doll as the doll lab's "Naturlig" has her: her left hand at the anchor as `hand.natural` has it, where she has one; else the doll as she is. Same name. */
export function naturalDoll(doll: Doll): Doll {
  const n = doll.hand?.natural; return n ? {...doll, hand: {...doll.hand!, left: n.left, at: {...doll.hand!.at, left: n.at.left}}} : doll;
}

// <docka man>
/** Standarddockans man, mätt på modellen; skriven av dealer3d/tools/docka-standard.ts --docka man --skriv (ändra den inte för hand). */
export const MAN: Doll = {name:'man',upperArm:0.279,forearm:0.272,reach:0.536,mostLean:0.4363323129985824,mostTwist:0.3490658503988659,hipBelowFelt:0.1426,elbowPoles:[[-0.354,-0.707,0.612],[0.015,-0.985,-0.173]],elbowAtRest:{poles:[[-0.207,-0.743,0.636],[0.315,-0.777,0.545]],within:[0,0.11]},hand:{anchor:'2.3',right:[[0,0,0],[0.0393,0.0045,-0.0254],[0.0663,0.0163,-0.0385],[0.1022,0.0273,-0.0446],[0.1229,0.0368,-0.0507],[0.1077,0.0055,-0.027],[0.1332,0.0114,-0.0206],[0.155,0.0197,-0.0142],[0.1745,0.0251,-0.0076],[0.107,0,0],[0.1409,0.0067,0.0069],[0.1681,0.0135,0.0127],[0.1879,0.0167,0.017],[0.1009,-0.0007,0.0202],[0.1316,-0.0013,0.0246],[0.157,0.0013,0.0285],[0.1791,0.0036,0.0305],[0.0908,0.0046,0.0396],[0.1111,-0.0037,0.0426],[0.127,-0.0057,0.0457],[0.1433,-0.0049,0.0468]],left:[[0,0,0],[0.0393,0.0045,0.0254],[0.066,0.0157,0.0397],[0.101,0.0264,0.0497],[0.1216,0.0356,0.0565],[0.1077,0.0055,0.027],[0.13,0.0141,0.0145],[0.1441,0.0322,0.0067],[0.1508,0.052,0.0029],[0.107,0,0],[0.1409,0.0073,-0.0066],[0.1596,0.0286,-0.0103],[0.1657,0.0481,-0.0116],[0.1009,-0.0007,-0.0202],[0.131,-0.0047,-0.0264],[0.1528,0.0093,-0.0253],[0.162,0.0281,-0.0177],[0.0908,0.0046,-0.0396],[0.109,-0.0069,-0.0345],[0.1247,-0.0101,-0.0316],[0.1404,-0.009,-0.0269]],at:{right:{wrist:[-0.0246,0.0405,-1.8635],forward:[0.8409,-0.0531,0.5386],palm:[0.1115,-0.9568,-0.2684]},left:{wrist:[0.3784,0.0762,-1.9505],forward:[0.3705,0.223,0.9017],palm:[-0.0373,-0.9664,0.2543]}},topp:{finger:0.0067,thumb:0.0079},grip:{right:[[0,0,0],[0.0393,0.0045,-0.0254],[0.0663,0.022,-0.0282],[0.1,0.0373,-0.0196],[0.1178,0.0472,-0.0078],[0.1077,0.0055,-0.027],[0.1292,0.0179,-0.0164],[0.1319,0.0398,-0.0067],[0.1288,0.0591,0.0017],[0.107,0,0],[0.1363,0.0157,0.0118],[0.1388,0.0433,0.0188],[0.1358,0.0632,0.0223],[0.1009,-0.0007,0.0202],[0.1272,0.0119,0.0308],[0.1234,0.0375,0.0304],[0.1141,0.0572,0.0256],[0.0908,0.0046,0.0396],[0.1109,0.0118,0.0453],[0.1133,0.0279,0.0436],[0.1081,0.0415,0.0363]],left:[[0,0,0],[0.0393,0.0045,0.0254],[0.0638,0.02,0.0395],[0.0973,0.0377,0.0421],[0.1166,0.0511,0.0444],[0.1077,0.0055,0.027],[0.1325,0.0138,0.0204],[0.1467,0.0318,0.0128],[0.1565,0.0491,0.0052],[0.107,0,0],[0.1306,0.0256,-0.0059],[0.1339,0.0538,-0.009],[0.1331,0.0742,-0.0106],[0.1009,-0.0007,-0.0202],[0.124,0.0194,-0.0252],[0.1306,0.0443,-0.0269],[0.1333,0.0665,-0.0263],[0.0908,0.0046,-0.0396],[0.1073,0.0175,-0.0466],[0.1144,0.032,-0.049],[0.1197,0.0475,-0.0479]]},rest:{right:[[0,0,0],[0.0393,0.0045,-0.0254],[0.0657,0.0135,-0.0416],[0.1025,0.0225,-0.045],[0.1243,0.0308,-0.0485],[0.1077,0.0055,-0.027],[0.1338,0.01,-0.0221],[0.1555,0.0194,-0.0169],[0.1745,0.0273,-0.0113],[0.107,0,0],[0.141,0.0076,0.0056],[0.1669,0.0186,0.0105],[0.1854,0.0266,0.0141],[0.1009,-0.0007,0.0202],[0.1314,0.0023,0.0243],[0.1561,0.0094,0.0279],[0.1767,0.0176,0.0297],[0.0908,0.0046,0.0396],[0.1124,0.0013,0.0432],[0.1282,0.0035,0.0468],[0.1436,0.0085,0.0487]],left:[[0,0,0],[0.0393,0.0045,0.0254],[0.0649,0.0153,0.0418],[0.1011,0.0258,0.0465],[0.1223,0.0351,0.0511],[0.1077,0.0055,0.027],[0.1335,0.0114,0.0218],[0.1549,0.021,0.0163],[0.1735,0.0295,0.0104],[0.107,0,0],[0.1402,0.0104,-0.006],[0.1661,0.0215,-0.0111],[0.1846,0.0294,-0.0147],[0.1009,-0.0007,-0.0202],[0.1311,0.0046,-0.0246],[0.1555,0.0125,-0.0284],[0.1757,0.0216,-0.0303],[0.0908,0.0046,-0.0396],[0.1124,0.002,-0.0435],[0.1281,0.0044,-0.0475],[0.1433,0.0099,-0.0495]],at:{right:{wrist:[-0.2167,0.0336,-1.9141],forward:[0.6765,0.0273,0.736],palm:[0.2213,-0.9607,-0.1678]},left:{wrist:[0.1852,0.0327,-1.9141],forward:[-0.6799,0.0482,0.7317],palm:[-0.2343,-0.9598,-0.1544]}}},natural:{left:[[0,0,0],[0.0393,0.0045,0.0254],[0.0663,0.0039,0.043],[0.1016,0.001,0.0567],[0.1229,0.0045,0.0662],[0.1077,0.0055,0.027],[0.134,0.0114,0.026],[0.1576,0.0168,0.0252],[0.1781,0.0221,0.0245],[0.107,0,0],[0.1409,0.0083,0.0052],[0.1684,0.015,0.0093],[0.1884,0.018,0.0123],[0.1009,-0.0007,-0.0202],[0.1317,0.0026,-0.0199],[0.1561,0.0052,-0.0116],[0.1723,0.0054,0.0037],[0.0908,0.0046,-0.0396],[0.1115,-0.0018,-0.0352],[0.1269,-0.0067,-0.0329],[0.1415,-0.0128,-0.029]],at:{left:{wrist:[0.3555,0.1006,-1.9568],forward:[0.515,-0.0963,0.8518],palm:[0.0727,-0.9852,-0.1553]}}}},place:{kind:'seat',behindEdge:0.38,shoulderHeight:0.29,x:-0.0159,shouldersApart:0.3753,trunk:0.4326,neck:[0,0.1046,-0.0064],head:[0,0.2342,0.0841],headRadius:0.1131},shape:{yoke:{kind:'slope',radius:0.049,footOver:0.055},shoulderBall:0.049,elbowBall:0.04,wristBall:0.03,upperArmRadius:[0.048,0.041],forearmRadius:[0.035,0.029],neck:{radius:[0.068,0.051],intoHead:0.6},headScale:1,skull:[0.71,1,0.93],trunk:{kind:'profile',deep:0.68,profile:[[0.2,0.4],[0.33,0.39],[0.45,0.365],[0.55,0.375],[0.62,0.395],[0.7,0.435],[0.8,0.468],[0.88,0.472],[0.95,0.445],[1,0.4],[1.05,0.32],[1.09,0.2],[1.115,0.08],[1.12,0]]}},about:{all:'mätt på avatar-auto-pipeline/assets/docka/standarddocka_man.glb (dealer3d/tools/docka-standard.ts --docka man): lederna i modellens vilopose som dealer3d/src/figure-model.ts läser dem, och fingertopparna på huden; övertaget från paow där det står så',place:'axellederna (RightArm, LeftArm) mätta 375.3 mm isär; deras mitt 0.38 m bakom spelets kant (där kortplanen räknar med att dealern sitter, som Paow) och 0.29 m över filten, mitt för Paows; med bordets dealerkant 0.23 m bakom spelets kant har magen 31 mm till den. Höften (Hips) mätt 432.6 mm under axellederna (hennes 505-511), rakt under dem; halsen (neck) och huvudet (huden på Head, hjässa till haka) mätta',upperArm:'mätt: axel- till armbågsled 279 och 279 mm (höger, vänster)',forearm:'mätt: armbågs- till handled 272 och 272 mm',hipBelowFelt:'följer av platsen: bålen (place.trunk) minus axlarnas höjd',reach:'gissat som Paows: armarnas summa gånger 0,972',mostLean:'gissat: 25 grader framåt i höften, när armen nästan är utsträckt; en sittande dealer som når långt fram böjer sig mest framåt (Paows 12 grader var för lite för en docka som sitter högre)',mostTwist:'gissat: 20 grader, lutningen gör det mesta (Paows 36 grader såg ut som att hela överkroppen vreds mot platsen)',elbowPoles:'övertaget från paow',elbowAtRest:'övertaget från paow',shape:'övertaget från paow (den vita figuren som ritas i hans ställe; hans kropp är modellens)',hand:'mätt: handleden (RightHand, LeftHand), tummens rot, mellanled och ytterled (Thumb1-3), varje fingers knoge, mellanled och ytterled (Index1-3 … Pinky1-3) i vilopose; knogarna 111.2/107/102.9/99.2 mm från handleden till höger, pekfingrets ben 27/24.2/21.3 mm. Topparna mätta på huden: mitt i fingertoppens rundning, en fingerradie innanför fingrets slut (radien vid toppen tummen 7.6, pek 6.4, lång 6.4, ring 5.9, lill 4.4 mm till höger). Formerna (right, left, grip, rest, natural) är Paows former med hans egna ben: varje fingerled böjd lika mycket som Paows (hand-rule.ts bendsOf), tummens ben pekande som hennes i handens axlar; knogarna och benlängderna är hans. topp: pek- och långfingrets och tummens topp på huden (radien), 0,3 mm till godo: så långt från kortet och filten lägger givarna topparnas punkter',handAt:'ankaret 2.3 (at): högerhanden där Paows ligger (handens mitt på hennes, flyttad så lite som håller den 10 mm från dealerns kortplatser: 53/16/15 mm), lagd på hans hud som vilan (docka-standard.ts lagg): pekande som underarmen, lutad 11.25 grader, handflatan och fingrarna 1-2 mm över filten, underarmen 17 mm över filten, armbågen 3.5 cm ut; vänsterhanden vid skon med Paows axlar och handleden flyttad så att pek-, lång- och ringfingrets toppar i medel ligger där hennes gör på kortet',handAtRest:'vilan (rest och rest.at), lagd på hans hud (docka-standard.ts vilaFor): händerna strax framför markerbrickan, mitt i handen 15 och 15 cm från mitten, pekande som underarmen (43 och 43 grader inåt, handleden 17 och 19 grader böjd), fingrarna Paows vila böjd 0.5 och 0.5 krokar till och lite isär, handflatan och fingrarna 1-2 mm över filten, underarmen minst 12 mm över filten där den är över bordet, fria från dealerns kortplatser och skon, och armbågen så nära kroppen som det då går: 18.1 och 18.2 cm ut från axeln, överarmen 49 och 50 grader från lodrät, armbågen böjd 86 och 86 grader'}};
// </docka man>

// <docka kvinna>
/** Standarddockans kvinna, mätt på modellen; skriven av dealer3d/tools/docka-standard.ts --docka kvinna --skriv (ändra den inte för hand). */
export const KVINNA: Doll = {name:'kvinna',upperArm:0.263,forearm:0.249,reach:0.498,mostLean:0.4363323129985824,mostTwist:0.3490658503988659,hipBelowFelt:0.1247,elbowPoles:[[-0.354,-0.707,0.612],[0.015,-0.985,-0.173]],elbowAtRest:{poles:[[-0.207,-0.743,0.636],[0.315,-0.777,0.545]],within:[0,0.11]},hand:{anchor:'2.3',right:[[0,0,0],[0.0363,0.0052,-0.0238],[0.0615,0.0162,-0.036],[0.0951,0.0265,-0.0417],[0.1146,0.0355,-0.0475],[0.1015,0.0044,-0.0256],[0.1257,0.0098,-0.0196],[0.1461,0.0174,-0.0136],[0.165,0.0225,-0.0073],[0.1003,0,0],[0.1323,0.0063,0.0065],[0.1582,0.0128,0.012],[0.1768,0.0158,0.0161],[0.0948,-0.0005,0.019],[0.1237,-0.001,0.0231],[0.1477,0.0015,0.0268],[0.1689,0.0037,0.0287],[0.0857,0.0037,0.0371],[0.105,-0.0043,0.0399],[0.1199,-0.0064,0.0428],[0.1355,-0.0057,0.0438]],left:[[0,0,0],[0.0363,0.0052,0.0238],[0.0612,0.0156,0.0372],[0.094,0.0257,0.0465],[0.1135,0.0344,0.0529],[0.1015,0.0044,0.0256],[0.1226,0.0123,0.0138],[0.1359,0.0292,0.0066],[0.1426,0.0482,0.0029],[0.1003,0,0],[0.1323,0.0069,-0.0063],[0.1501,0.0272,-0.0098],[0.1558,0.0455,-0.011],[0.0948,-0.0005,-0.019],[0.1231,-0.0042,-0.0248],[0.1437,0.0091,-0.0238],[0.1525,0.0271,-0.0165],[0.0857,0.0037,-0.0371],[0.1029,-0.0074,-0.0322],[0.1177,-0.0105,-0.0294],[0.1327,-0.0095,-0.025]],at:{right:{wrist:[-0.0058,0.0383,-1.8666],forward:[0.7819,-0.0531,0.6212],palm:[0.1382,-0.9568,-0.2557]},left:{wrist:[0.3822,0.0757,-1.9418],forward:[0.3705,0.223,0.9017],palm:[-0.0373,-0.9664,0.2543]}},topp:{finger:0.0064,thumb:0.0073},grip:{right:[[0,0,0],[0.0363,0.0052,-0.0238],[0.0615,0.0216,-0.0264],[0.093,0.0359,-0.0184],[0.1098,0.0452,-0.0072],[0.1015,0.0044,-0.0256],[0.1219,0.0159,-0.0157],[0.1247,0.0365,-0.0066],[0.1218,0.0551,0.0015],[0.1003,0,0],[0.128,0.0148,0.0111],[0.1303,0.0411,0.0178],[0.1275,0.0599,0.0211],[0.0948,-0.0005,0.019],[0.1195,0.0114,0.029],[0.1159,0.0356,0.0286],[0.1069,0.0545,0.024],[0.0857,0.0037,0.0371],[0.105,0.0104,0.0425],[0.1073,0.0255,0.0409],[0.1024,0.0386,0.0339]],left:[[0,0,0],[0.0363,0.0052,0.0238],[0.0592,0.0197,0.037],[0.0906,0.0363,0.0394],[0.1088,0.0489,0.0416],[0.1015,0.0044,0.0256],[0.125,0.0121,0.0194],[0.1385,0.0288,0.0123],[0.148,0.0454,0.005],[0.1003,0,0],[0.1226,0.0241,-0.0055],[0.1257,0.051,-0.0085],[0.125,0.0702,-0.0101],[0.0948,-0.0005,-0.019],[0.1165,0.0184,-0.0237],[0.1227,0.042,-0.0254],[0.1252,0.0632,-0.0247],[0.0857,0.0037,-0.0371],[0.1016,0.0159,-0.0437],[0.1084,0.0295,-0.046],[0.1135,0.0442,-0.0448]]},rest:{right:[[0,0,0],[0.0363,0.0052,-0.0238],[0.061,0.0136,-0.0389],[0.0954,0.0221,-0.0421],[0.116,0.0299,-0.0454],[0.1015,0.0044,-0.0256],[0.1262,0.0086,-0.021],[0.1466,0.0171,-0.0162],[0.1649,0.0246,-0.0108],[0.1003,0,0],[0.1324,0.0072,0.0053],[0.157,0.0176,0.0099],[0.1745,0.0252,0.0133],[0.0948,-0.0005,0.019],[0.1236,0.0024,0.0229],[0.1468,0.0091,0.0263],[0.1666,0.0171,0.028],[0.0857,0.0037,0.0371],[0.1063,0.0005,0.0405],[0.1212,0.0023,0.0438],[0.1359,0.007,0.0456]],left:[[0,0,0],[0.0363,0.0052,0.0238],[0.0602,0.0153,0.0391],[0.0941,0.0252,0.0435],[0.1141,0.0339,0.0479],[0.1015,0.0044,0.0256],[0.1259,0.0097,0.0207],[0.1461,0.0186,0.0156],[0.164,0.0267,0.0101],[0.1003,0,0],[0.1316,0.0098,-0.0057],[0.1562,0.0203,-0.0105],[0.1737,0.0278,-0.0139],[0.0948,-0.0005,-0.019],[0.1233,0.0045,-0.0232],[0.1463,0.0119,-0.0267],[0.1656,0.0208,-0.0287],[0.0857,0.0037,-0.0371],[0.1063,0.0011,-0.0408],[0.1211,0.0033,-0.0444],[0.1357,0.0083,-0.0463]],at:{right:{wrist:[-0.2059,0.0318,-1.9194],forward:[0.5808,0.0273,0.8136],palm:[0.2403,-0.9607,-0.1393]},left:{wrist:[0.1744,0.0309,-1.9193],forward:[-0.5837,0.0482,0.8106],palm:[-0.2517,-0.9598,-0.1241]}}},natural:{left:[[0,0,0],[0.0363,0.0052,0.0238],[0.0615,0.0047,0.0402],[0.0946,0.0019,0.0531],[0.1147,0.0052,0.062],[0.1015,0.0044,0.0256],[0.1264,0.0098,0.0247],[0.1485,0.0147,0.024],[0.1684,0.0196,0.0233],[0.1003,0,0],[0.1323,0.0078,0.0049],[0.1585,0.0142,0.0088],[0.1773,0.017,0.0116],[0.0948,-0.0005,-0.019],[0.1238,0.0027,-0.0187],[0.1468,0.0051,-0.0108],[0.1624,0.0053,0.0038],[0.0857,0.0037,-0.0371],[0.1054,-0.0025,-0.0328],[0.1198,-0.0073,-0.0307],[0.1338,-0.0132,-0.0269]],at:{left:{wrist:[0.3604,0.0984,-1.948],forward:[0.515,-0.0963,0.8518],palm:[0.0727,-0.9852,-0.1553]}}}},place:{kind:'seat',behindEdge:0.38,shoulderHeight:0.29,x:-0.0159,shouldersApart:0.337,trunk:0.4147,neck:[0,0.0847,-0.022],head:[0,0.2111,0.0716],headRadius:0.107},shape:{yoke:{kind:'slope',radius:0.049,footOver:0.055},shoulderBall:0.049,elbowBall:0.04,wristBall:0.03,upperArmRadius:[0.048,0.041],forearmRadius:[0.035,0.029],neck:{radius:[0.068,0.051],intoHead:0.6},headScale:1,skull:[0.71,1,0.93],trunk:{kind:'profile',deep:0.68,profile:[[0.2,0.4],[0.33,0.39],[0.45,0.365],[0.55,0.375],[0.62,0.395],[0.7,0.435],[0.8,0.468],[0.88,0.472],[0.95,0.445],[1,0.4],[1.05,0.32],[1.09,0.2],[1.115,0.08],[1.12,0]]}},about:{all:'mätt på avatar-auto-pipeline/assets/docka/standarddocka_kvinna.glb (dealer3d/tools/docka-standard.ts --docka kvinna): lederna i modellens vilopose som dealer3d/src/figure-model.ts läser dem, och fingertopparna på huden; övertaget från paow där det står så',place:'axellederna (RightArm, LeftArm) mätta 337 mm isär; deras mitt 0.38 m bakom spelets kant (där kortplanen räknar med att dealern sitter, som Paow) och 0.29 m över filten, mitt för Paows; med bordets dealerkant 0.23 m bakom spelets kant har magen 24 mm till den. Höften (Hips) mätt 414.7 mm under axellederna (hennes 505-511), rakt under dem; halsen (neck) och huvudet (huden på Head, hjässa till haka) mätta',upperArm:'mätt: axel- till armbågsled 263 och 263 mm (höger, vänster)',forearm:'mätt: armbågs- till handled 249 och 249 mm',hipBelowFelt:'följer av platsen: bålen (place.trunk) minus axlarnas höjd',reach:'gissat som Paows: armarnas summa gånger 0,972',mostLean:'gissat: 25 grader framåt i höften, när armen nästan är utsträckt; en sittande dealer som når långt fram böjer sig mest framåt (Paows 12 grader var för lite för en docka som sitter högre)',mostTwist:'gissat: 20 grader, lutningen gör det mesta (Paows 36 grader såg ut som att hela överkroppen vreds mot platsen)',elbowPoles:'övertaget från paow',elbowAtRest:'övertaget från paow',shape:'övertaget från paow (den vita figuren som ritas i hennes ställe; hennes kropp är modellens)',hand:'mätt: handleden (RightHand, LeftHand), tummens rot, mellanled och ytterled (Thumb1-3), varje fingers knoge, mellanled och ytterled (Index1-3 … Pinky1-3) i vilopose; knogarna 104.8/100.3/96.7/93.5 mm från handleden till höger, pekfingrets ben 25.5/22.7/20.5 mm. Topparna mätta på huden: mitt i fingertoppens rundning, en fingerradie innanför fingrets slut (radien vid toppen tummen 7, pek 5.8, lång 6.1, ring 5.5, lill 4.2 mm till höger). Formerna (right, left, grip, rest, natural) är Paows former med hennes egna ben: varje fingerled böjd lika mycket som Paows (hand-rule.ts bendsOf), tummens ben pekande som hennes i handens axlar; knogarna och benlängderna är hennes. topp: pek- och långfingrets och tummens topp på huden (radien), 0,3 mm till godo: så långt från kortet och filten lägger givarna topparnas punkter',handAt:'ankaret 2.3 (at): högerhanden där Paows ligger (handens mitt på hennes, flyttad så lite som håller den 10 mm från dealerns kortplatser: 59/19/12 mm), lagd på hennes hud som vilan (docka-standard.ts lagg): pekande som underarmen, lutad 11.25 grader, handflatan och fingrarna 1-2 mm över filten, underarmen 22 mm över filten, armbågen -0.3 cm ut; vänsterhanden vid skon med Paows axlar och handleden flyttad så att pek-, lång- och ringfingrets toppar i medel ligger där hennes gör på kortet',handAtRest:'vilan (rest och rest.at), lagd på hennes hud (docka-standard.ts vilaFor): händerna strax framför markerbrickan, mitt i handen 15 och 15 cm från mitten, pekande som underarmen (36 och 36 grader inåt, handleden 18 och 20 grader böjd), fingrarna Paows vila böjd 0.5 och 0.5 krokar till och lite isär, handflatan och fingrarna 1-2 mm över filten, underarmen minst 12 mm över filten där den är över bordet, fria från dealerns kortplatser och skon, och armbågen så nära kroppen som det då går: 15.1 och 15.3 cm ut från axeln, överarmen 44 och 45 grader från lodrät, armbågen böjd 77 och 77 grader'}};
// </docka kvinna>

export const DOLLS: Record<string, Doll> = {standard: STANDARD, paow: PAOW, man: MAN, kvinna: KVINNA};
/** The doll of a name; an unknown name is an error, not the standard. */
export function dollNamed(name: string | null | undefined): Doll {
  const d = DOLLS[name ?? 'standard']; if (!d) throw Error(`Ingen docka heter ${name}.`); return d;
}
