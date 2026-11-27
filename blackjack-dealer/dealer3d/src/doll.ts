// The dolls: Danilo and Frasse at the live table (src/table-live.ts LIVE), one after each of the two real dealers live-bj/
// measured on film (the styles kameran and bordet; Jakob 2026-11-27: "kan vi inte bara klona allt från videon ... bara
// egentligen få en ny eller två nya dockor"), and the persons' dolls built on them. A doll is where the upright figure's
// joints are in the live table's lens world, how long its bones are, how far it may bend, its hand, and the shapes drawn
// round its joints. Pure: no I/O and no three.js; imports only src/table-live.ts.
// `about` says of each measure whether it is measured (mätt, and on what) or guessed (gissat, and why).
import {LIVE} from '../../src/table-live.ts';
import type {Vec3} from '../../src/space.ts';

export type Frame = {hip: Vec3; shoulders: [Vec3, Vec3]; neck: Vec3; head: Vec3; headRadius: number}; // shoulders: his right (image left), his left (image right)
/**
 * Where the upright figure sits, in metres: its shoulder joints `shouldersApart` apart, their middle `behindEdge` metres
 * behind the table edge `edge` (the z of the live table's dealer edge, LIVE.edge), `shoulderHeight` over the felt and at
 * `x` across, the hip `trunk` metres straight under that middle (its own hip-to-shoulders), and the neck and the head as
 * steps from that middle (across, up, toward the camera).
 */
export type DollPlace = {kind: 'seat'; behindEdge: number; shoulderHeight: number; x: number; shouldersApart: number; trunk: number; neck: Vec3; head: Vec3; headRadius: number; edge: number};
/** The shapes drawn round the joints, metres. */
export type DollShape = {
  /** One cylinder from a point `footOver` metres over the shoulders' middle (along the trunk) down to each shoulder joint, as shoulders slope from the neck. */
  yoke: {kind: 'slope'; radius: number; footOver: number};
  shoulderBall: number; elbowBall: number; wristBall: number;
  upperArmRadius: [number, number]; forearmRadius: [number, number];
  /** The neck from the frame's neck up to `intoHead` of the head's radius under the head's middle, radius at the foot and at the top. */
  neck: {radius: [number, number]; intoHead: number};
  /** The head: a ball of the frame's head radius times `scale`, stretched by `skull` (across, up, deep). */
  headScale: number; skull: Vec3;
  /**
   * The trunk between the hip and the shoulders' middle, leaning and turning with them: one smooth body turned about its
   * upright axis, `profile` its half-width (times the shoulders' span) at heights (times hip-to-shoulders over the hip),
   * from the bottom up and closing at the top, and `deep` its depth as a share of its width.
   */
  trunk: {kind: 'profile'; profile: [number, number][]; deep: number};
};
/**
 * A doll's own hand: its 21 points against the wrist in the hand's own axes (dealer3d/src/hand-pose.ts: along the hand, the
 * way the palm looks, across), metres, his right hand and his left as he holds them at the anchor `anchor`. The bones'
 * lengths are those between the points. `at` is where each hand lay at that anchor where the shapes were measured: its
 * wrist and the hand's axes forward and palm. `grip` is the same hand (its palm, its bones' lengths) as it carries a card;
 * `rest` the same hand as it lies at rest (anchor 1), its shape and its place; `natural` the left hand at the anchor with
 * straighter fingers. `topp` is how thick the tips are on the doll's skin (dealer3d/src/fingertopp.ts): the motions rest a
 * tip point that far from the card or the felt, never nearer than a tip is drawn (hand-rule.ts DRAWN).
 */
export type HandPlace = {wrist: Vec3; forward: Vec3; palm: Vec3};
export type DollHand = {anchor: string; right: Vec3[]; left: Vec3[]; at: {right: HandPlace; left: HandPlace}; grip?: {right: Vec3[]; left: Vec3[]};
  /** How far a fingertip's point and the thumb's are from what they touch, metres: the tip's radius on the skin. */
  topp?: {finger: number; thumb: number};
  rest?: {right: Vec3[]; left: Vec3[]; at: {right: HandPlace; left: HandPlace}}; natural?: {left: Vec3[]; at: {left: HandPlace}}};
export type Doll = {
  name: string;
  upperArm: number; forearm: number;
  /** Where the elbows hang: the pole each arm bends toward (body.ts arm), his right arm's and his left's. */
  elbowPoles: [Vec3, Vec3];
  /**
   * Where the elbows hang in the posture he rests in, both hands in front of him: a pole for his right arm and his left,
   * and how far that posture holds, by how far out to the arm's own side of its shoulder each wrist is as a share of the
   * arm's length: a hand counts as in front up to within[0] and as out from within[1], eased between.
   */
  elbowAtRest?: {poles: [Vec3, Vec3]; within: [number, number]};
  hand?: DollHand;
  /** How far the dealing wrist may be from the shoulder before he bends, and how far he may bend and turn, radians. */
  reach: number; mostLean: number; mostTwist: number;
  hipBelowFelt: number;
  place: DollPlace; shape: DollShape;
  about: Record<string, string>;
};

/** The upright figure: its joints where its place puts them, behind the live table's edge. */
export function dollFrame(doll: Doll): Frame {
  const p = doll.place, z = p.edge - p.behindEdge, mid: Vec3 = [p.x, p.shoulderHeight, z], half: Vec3 = [p.shouldersApart / 2, 0, 0];
  const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  return {hip: [p.x, p.shoulderHeight - p.trunk, z], shoulders: [sub(mid, half), add(mid, half)], neck: add(mid, p.neck), head: add(mid, p.head), headRadius: p.headRadius};
}

/**
 * The body Danilo and Frasse have in common until their own models give theirs (the same skeleton): measured on the rigged
 * model of the standard doll's man (avatar-auto-pipeline's standarddocka_man.glb, its joints in rest pose and its
 * fingertips on the skin), his arms, his hand's shapes bent on his own bones (anchor 2.3, the grip, the rest, the natural
 * left hand), the poles his elbows bend toward and the white figure's shapes. Their own: where they sit and how far their
 * shoulders are apart and their heads (liveDoll). The numbers are those the dolls have had since they were made, so that
 * their motions (dealer3d/data/lyft-<doll>-*.json) stay as they are.
 */
const KROPP = {upperArm: 0.279, forearm: 0.272, reach: 0.536, mostLean: 0.4363323129985824, mostTwist: 0.3490658503988659,
  elbowPoles: [[-0.354,-0.707,0.612],[0.015,-0.985,-0.173]] as [Vec3, Vec3],
  elbowAtRest: {poles:[[-0.207,-0.743,0.636],[0.315,-0.777,0.545]],within:[0,0.11]} as Doll['elbowAtRest'],
  hand: {anchor:'2.3',right:[[0,0,0],[0.0393,0.0045,-0.0254],[0.0663,0.0163,-0.0385],[0.1022,0.0273,-0.0446],[0.1229,0.0368,-0.0507],[0.1077,0.0055,-0.027],[0.1332,0.0114,-0.0206],[0.155,0.0197,-0.0142],[0.1745,0.0251,-0.0076],[0.107,0,0],[0.1409,0.0067,0.0069],[0.1681,0.0135,0.0127],[0.1879,0.0167,0.017],[0.1009,-0.0007,0.0202],[0.1316,-0.0013,0.0246],[0.157,0.0013,0.0285],[0.1791,0.0036,0.0305],[0.0908,0.0046,0.0396],[0.1111,-0.0037,0.0426],[0.127,-0.0057,0.0457],[0.1433,-0.0049,0.0468]],left:[[0,0,0],[0.0393,0.0045,0.0254],[0.066,0.0157,0.0397],[0.101,0.0264,0.0497],[0.1216,0.0356,0.0565],[0.1077,0.0055,0.027],[0.13,0.0141,0.0145],[0.1441,0.0322,0.0067],[0.1508,0.052,0.0029],[0.107,0,0],[0.1409,0.0073,-0.0066],[0.1596,0.0286,-0.0103],[0.1657,0.0481,-0.0116],[0.1009,-0.0007,-0.0202],[0.131,-0.0047,-0.0264],[0.1528,0.0093,-0.0253],[0.162,0.0281,-0.0177],[0.0908,0.0046,-0.0396],[0.109,-0.0069,-0.0345],[0.1247,-0.0101,-0.0316],[0.1404,-0.009,-0.0269]],at:{right:{wrist:[-0.0246,0.0405,-1.8635],forward:[0.8409,-0.0531,0.5386],palm:[0.1115,-0.9568,-0.2684]},left:{wrist:[0.3784,0.0762,-1.9505],forward:[0.3705,0.223,0.9017],palm:[-0.0373,-0.9664,0.2543]}},topp:{finger:0.0067,thumb:0.0079},grip:{right:[[0,0,0],[0.0393,0.0045,-0.0254],[0.0663,0.022,-0.0282],[0.1,0.0373,-0.0196],[0.1178,0.0472,-0.0078],[0.1077,0.0055,-0.027],[0.1292,0.0179,-0.0164],[0.1319,0.0398,-0.0067],[0.1288,0.0591,0.0017],[0.107,0,0],[0.1363,0.0157,0.0118],[0.1388,0.0433,0.0188],[0.1358,0.0632,0.0223],[0.1009,-0.0007,0.0202],[0.1272,0.0119,0.0308],[0.1234,0.0375,0.0304],[0.1141,0.0572,0.0256],[0.0908,0.0046,0.0396],[0.1109,0.0118,0.0453],[0.1133,0.0279,0.0436],[0.1081,0.0415,0.0363]],left:[[0,0,0],[0.0393,0.0045,0.0254],[0.0638,0.02,0.0395],[0.0973,0.0377,0.0421],[0.1166,0.0511,0.0444],[0.1077,0.0055,0.027],[0.1325,0.0138,0.0204],[0.1467,0.0318,0.0128],[0.1565,0.0491,0.0052],[0.107,0,0],[0.1306,0.0256,-0.0059],[0.1339,0.0538,-0.009],[0.1331,0.0742,-0.0106],[0.1009,-0.0007,-0.0202],[0.124,0.0194,-0.0252],[0.1306,0.0443,-0.0269],[0.1333,0.0665,-0.0263],[0.0908,0.0046,-0.0396],[0.1073,0.0175,-0.0466],[0.1144,0.032,-0.049],[0.1197,0.0475,-0.0479]]},rest:{right:[[0,0,0],[0.0393,0.0045,-0.0254],[0.0657,0.0135,-0.0416],[0.1025,0.0225,-0.045],[0.1243,0.0308,-0.0485],[0.1077,0.0055,-0.027],[0.1338,0.01,-0.0221],[0.1555,0.0194,-0.0169],[0.1745,0.0273,-0.0113],[0.107,0,0],[0.141,0.0076,0.0056],[0.1669,0.0186,0.0105],[0.1854,0.0266,0.0141],[0.1009,-0.0007,0.0202],[0.1314,0.0023,0.0243],[0.1561,0.0094,0.0279],[0.1767,0.0176,0.0297],[0.0908,0.0046,0.0396],[0.1124,0.0013,0.0432],[0.1282,0.0035,0.0468],[0.1436,0.0085,0.0487]],left:[[0,0,0],[0.0393,0.0045,0.0254],[0.0649,0.0153,0.0418],[0.1011,0.0258,0.0465],[0.1223,0.0351,0.0511],[0.1077,0.0055,0.027],[0.1335,0.0114,0.0218],[0.1549,0.021,0.0163],[0.1735,0.0295,0.0104],[0.107,0,0],[0.1402,0.0104,-0.006],[0.1661,0.0215,-0.0111],[0.1846,0.0294,-0.0147],[0.1009,-0.0007,-0.0202],[0.1311,0.0046,-0.0246],[0.1555,0.0125,-0.0284],[0.1757,0.0216,-0.0303],[0.0908,0.0046,-0.0396],[0.1124,0.002,-0.0435],[0.1281,0.0044,-0.0475],[0.1433,0.0099,-0.0495]],at:{right:{wrist:[-0.2167,0.0336,-1.9141],forward:[0.6765,0.0273,0.736],palm:[0.2213,-0.9607,-0.1678]},left:{wrist:[0.1852,0.0327,-1.9141],forward:[-0.6799,0.0482,0.7317],palm:[-0.2343,-0.9598,-0.1544]}}},natural:{left:[[0,0,0],[0.0393,0.0045,0.0254],[0.0663,0.0039,0.043],[0.1016,0.001,0.0567],[0.1229,0.0045,0.0662],[0.1077,0.0055,0.027],[0.134,0.0114,0.026],[0.1576,0.0168,0.0252],[0.1781,0.0221,0.0245],[0.107,0,0],[0.1409,0.0083,0.0052],[0.1684,0.015,0.0093],[0.1884,0.018,0.0123],[0.1009,-0.0007,-0.0202],[0.1317,0.0026,-0.0199],[0.1561,0.0052,-0.0116],[0.1723,0.0054,0.0037],[0.0908,0.0046,-0.0396],[0.1115,-0.0018,-0.0352],[0.1269,-0.0067,-0.0329],[0.1415,-0.0128,-0.029]],at:{left:{wrist:[0.3555,0.1006,-1.9568],forward:[0.515,-0.0963,0.8518],palm:[0.0727,-0.9852,-0.1553]}}}} as DollHand,
  shape: {yoke:{kind:'slope',radius:0.049,footOver:0.055},shoulderBall:0.049,elbowBall:0.04,wristBall:0.03,upperArmRadius:[0.048,0.041],forearmRadius:[0.035,0.029],neck:{radius:[0.068,0.051],intoHead:0.6},headScale:1,skull:[0.71,1,0.93],trunk:{kind:'profile',deep:0.68,profile:[[0.2,0.4],[0.33,0.39],[0.45,0.365],[0.55,0.375],[0.62,0.395],[0.7,0.435],[0.8,0.468],[0.88,0.472],[0.95,0.445],[1,0.4],[1.05,0.32],[1.09,0.2],[1.115,0.08],[1.12,0]]}} as DollShape};
/** The common body's hip-to-shoulders and its neck as a step from the shoulders' middle (across, up, toward the camera). */
const BAL = {trunk: 0.4326, neck: [0, 0.1046, -0.0064] as Vec3};

// The dolls at the live table: Danilo and Frasse, one after each of the two real dealers live-bj/ measured on film (the
// styles kameran and bordet), seated at the live table's set-up (src/table-live.ts LIVE) and drawn through its camera.
// Their shoulders are the dealer's, measured through that camera (LIVE.dealer); their arms, hands, neck and head are the
// common body's (KROPP) until their own models are built; their face is ours. Their motions are the lifts out of the film
// laid on them (dealer3d/tools/lyft-till-docka.ts, dealer3d/data/lyft-<doll>-*.json).
/**
 * What the doll's own model measures where it differs from the common body: the shoulder joints apart, the head's middle from their middle and its radius.
 * A person's doll (src/persondockor.ts) has its own name and may have its own arms, trunk, neck and hand as well; what it leaves out is the common body's.
 */
type OwnModel = {model: string; shouldersApart: number; head: Vec3; headRadius: number; name?: string; upperArm?: number; forearm?: number; trunk?: number; neck?: Vec3; hand?: DollHand; about?: Record<string, string>};
function liveDoll(style: 'kameran' | 'bordet', own: OwnModel): Doll {
  const d = LIVE.dealer.styles[style], [x, height] = d.shouldersMiddle, r4 = (n: number) => Math.round(n * 10000) / 10000;
  const upperArm = own.upperArm ?? KROPP.upperArm, forearm = own.forearm ?? KROPP.forearm, trunk = own.trunk ?? BAL.trunk;
  return {name: own.name ?? d.name, ...KROPP, hipBelowFelt: r4(trunk - height), upperArm, forearm, ...(own.upperArm || own.forearm ? {reach: r4((upperArm + forearm) * 0.972)} : {}), ...(own.hand ? {hand: own.hand} : {}),
    place: {kind: 'seat', behindEdge: LIVE.dealer.behindEdge, shoulderHeight: height, x, shouldersApart: own.shouldersApart, trunk, neck: own.neck ?? BAL.neck, head: own.head, headRadius: own.headRadius, edge: LIVE.edge[2]},
    about: {
      all: `vid livebordet (src/table-live.ts LIVE), efter den riktiga dealern med stilen ${style} (live-bj/data/stil-${style}.json); kroppen avatar-auto-pipeline/assets/docka/${own.model} (samma skelett som mannen): axelbredden och huvudet mätta på den, allt annat mannens (KROPP); var dockan sitter mätt genom livebordets kamera; ansiktet vårt eget`,
      place: `axlarnas mitt ${height} m över filten och ${x} m åt sidan (LIVE.dealer.styles.${style}.shouldersMiddle: mätt i bilden, på ett plan antaget ${LIVE.dealer.behindEdge} m bakom filtens kant, LIVE.dealer.behindEdge; skattat ur rutorna där en hand ligger still: ${d.behindEdgeEstimated} m bakom kanten, ±0,1 m); kanten är livebordets (LIVE.edge). Axellederna ${own.shouldersApart * 1000} mm isär (modellen; dealern i bilden ${d.shoulderWidth} m). Halsen mannens; huvudets mitt och radie modellens. Filmens korta mått av hakan över axlarna (${d.head.chinOverShoulders} m) är hållning och synvinkel och hör till rörelsen, inte kroppen`,
      upperArm: 'mannens (KROPP), som modellen: dealerns egen arm går inte att mäta med en kamera', forearm: 'mannens (KROPP)',
      hand: 'mannens former, ben och toppar (KROPP.hand); lägena i hand.at och hand.rest.at är där formerna mättes och gäller inte vid bordet: vid livebordet ligger händerna i vilan där dealer3d/data/ankare-vila-<docka>.json har dem',
      hipBelowFelt: 'följer av platsen: mannens bål (place.trunk) minus axlarnas höjd', reach: 'mannens', mostLean: 'mannens', mostTwist: 'mannens', ...own.about},
  };
}
/** Danilo, after the dealer of the style kameran (the first in the film: young and slim, he seeks the camera). */
export const DANILO: Doll = liveDoll('kameran', {model: 'standarddocka_danilo.glb', shouldersApart: 0.357, head: [0, 0.2324, 0.0856], headRadius: 0.1118});
/** Frasse, after the dealer of the style bordet (the second: with a beard, his eyes on the table). */
export const FRASSE: Doll = liveDoll('bordet', {model: 'standarddocka_frasse.glb', shouldersApart: 0.3485, head: [0, 0.2247, 0.084], headRadius: 0.1043});
/** A person's doll, one per person measured out of their own pictures (src/persondockor.ts, written by avatar-auto-pipeline's steg 15): at the live table, in the style whose motions it plays. */
import {PERSONDOCKOR} from './persondockor.ts';
export const LIVE_DOLLS: Record<string, Doll> = {danilo: DANILO, frasse: FRASSE, ...Object.fromEntries(Object.entries(PERSONDOCKOR).map(([name, p]) => [name, liveDoll(p.stil, {...p, name})]))};

/** The doll of a name; an unknown name is an error. */
export function dollNamed(name: string | null | undefined): Doll {
  const d = LIVE_DOLLS[name ?? '']; if (!d) throw Error(`Ingen docka heter ${name}.`); return d;
}
