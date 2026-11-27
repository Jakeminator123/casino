// How the doll deals from A2.3, for dealer3d/page/docka.ts and dealer3d/tools/docka-cykel.ts: one chain, so that what
// Inspelning shows is what an order films (Jakob 2026-11-26: "everything must be watertight and not unnecessarily
// complicated"). Pure: no I/O and no three.js.
// - The one chain (the end of this file): filmRules, filmDeal and filmed turn a state (the place, its recipe, the doll and
//   what the controls or docka-cykel.ts's flags steer) into the motion filmed, the deal with its return. The page plays it and
//   docka-cykel.ts writes it, both through these three functions only.
// - The way is the doll's (wayFor), not a choice: every dealer's doll deals "Naturlig" (Jakob 2026-11-23, "vissa aningen
//   konstiga ställningar görs lite naturligare som standard"): the deal laid from its recipe with the natural hand change
//   (lay.ts `natural`), as steered but for the body, posed on the doll as "Naturlig" has her (doll.ts naturalDoll: her left
//   hand at the shoe as her picture has it) and moved as a person moves (dealer3d/src/natural.ts), with the body's sliders,
//   the shoulders and the elbows laid on the doll herself as far as her arms reach: a slider there never makes the deal
//   fail. Where nothing steers the hand's angle on the card in a contact grip, it is NATURAL_GRIP_YAW_TAKE as her right hand
//   takes the card and NATURAL_GRIP_YAW once it is turned (gripYawsOf). The standard doll deals as the deal was laid before
//   2026-11-23 (Way 'forut': lay.ts without `natural`, posed on the doll as she is).
// - withReturn: either deal, or one read off a film (from A2.1), with its return to the pose it began in, in one motion.
// In "Naturlig" her right hand ends at the laid card as `landing` says (dealer3d/src/landing.ts); without one, or with the
// default, as it did before landings were made, to the last digit. Last, her free fingers keep to what a hand can do
// (dealer3d/src/hand-rule.ts `humaneMotion`, Jakob 2026-11-23: "inget finger kan försvinna på ett konstigt sätt").
import {cardTempoOf, layDeal, sideOf, type LaidDeal, type PoseFilm, type Recipe, type Steer} from './lay.ts';
import {poseOnDoll, type PoseOptions} from './pose-on-doll.ts';
import {natural} from '../src/natural.ts';
import {LANDING_DEFAULT, landed, landingTimes, type Landing} from '../src/landing.ts';
import {TURN_DEFAULT, turnedInHand, type TurnId} from '../src/turn-in-hand.ts';
import {naturalDoll, type Doll} from '../src/doll.ts';
import {humaneMotion} from '../src/hand-rule.ts';
import {buildReturnCycle, type DealMotion, type ReturnCycleOptions} from '../src/return-cycle.ts';
import type {Plan} from '../src/world.ts';
import type {Lens} from '../src/camera.ts';

export type Way = 'naturlig' | 'forut';
/** What only "Naturlig" steers: each shoulder [up, forward] centimetres, each elbow out from her side [right, left] degrees (dealer3d/src/natural.ts NaturalSteer). */
export type Knobs = {shoulderR: [number, number]; shoulderL: [number, number]; elbowOut: [number, number]};
export const NO_KNOBS: Knobs = {shoulderR: [0, 0], shoulderL: [0, 0], elbowOut: [0, 0]};
/**
 * The hand's angle on the card in "Naturlig" where nothing steers it, degrees (the contact grips only), once the card is
 * turned and to the end (Steer.gripYawEnd): Jakob 2026-11-23, after saving seats 4 and 5 with the slider at −30, "Jag vill
 * ha denna vridning som standard-återställningens satta normala.. ser naturligare ut". As her right hand takes the card it
 * is NATURAL_GRIP_YAW_TAKE (Steer.gripYaw; Jakob the same evening, "Förinställt är -30 men rimligare är typ 17 grader för
 * när dealerns högerhand som tar emot kortet görs. Men sedan vid själva slutet när kortet är vänt och så vidare är det
 * snarare -30"), the hand going from the one to the other over the turn. "Som förut" keeps the recipe's own (15 in the sweep).
 */
export const NATURAL_GRIP_YAW = -30, NATURAL_GRIP_YAW_TAKE = 17;
/**
 * What "Naturlig" lays differently from what it laid before 2026-11-23, each to be had as before to make a film made then
 * again (dealer3d/tools/docka-cykel.ts --sam-hand, --recipe-grip-yaw, --fingrar-som-forut, --en-vinkel): `samHand`, her
 * left hand at the shoe as SAM read it (doll.ts `hand.left`); `recipeGripYaw`, the recipe's own angle of the hand on the
 * card where nothing steers it; `fingers`, her free fingers as her grip and the moving left them, without
 * dealer3d/src/hand-rule.ts; `oneGripYaw`, one angle of the hand on the card from the hand change to the end,
 * NATURAL_GRIP_YAW where nothing steers it (as the lab laid "Naturlig" on the day, before the evening).
 */
export type AsBefore = {samHand?: boolean; recipeGripYaw?: boolean; fingers?: boolean; oneGripYaw?: boolean};
/** The motion with her free fingers kept to what a hand can do, unless as before. */
const humaneUnless = <M extends {frames: unknown[]}>(motion: M, before: AsBefore = {}): M => before.fingers ? motion : humaneMotion(motion);
type Posed = {motion: {frames: unknown[]; frameCount: number}; receipt: {frames: {shortMm: [number, number]}[]}};

/** A motion made with the standard doll, on `doll`; and how far her arm is too short at the worst, millimetres. */
export function onDoll<M extends object>(lens: Lens, motion: M, doll: Doll, options?: PoseOptions): {motion: M & {doll: string}; shortMm: number} {
  if (doll.name === 'standard') return {motion: {...motion, doll: 'standard'}, shortMm: 0};
  const posed = poseOnDoll(lens, motion as never, doll, options) as unknown as Posed;
  return {motion: posed.motion as unknown as M & {doll: string}, shortMm: Math.max(0, ...posed.receipt.frames.flatMap(f => f.shortMm))};
}
/** The doll as a way has her: in "Naturlig" with her left hand at the shoe as her picture has it, unless as before. */
export const dollFor = (way: Way, doll: Doll, before: AsBefore = {}): Doll => way === 'naturlig' && !before.samHand ? naturalDoll(doll) : doll;
/**
 * The hand's angle on the card a recipe is laid with in a way, as steered, degrees: [as her right hand takes the card, once
 * it is turned], what the lab's two sliders show (null: no contact grip, no angle). A steering saved with one angle (gripYaw
 * and no gripYawEnd, as every standard saved before the two) keeps that angle all the way, as it was laid when saved.
 */
export function gripYawsOf(recipe: Recipe, steer: Steer, way: Way, before: AsBefore = {}): [number, number] | null {
  if (!recipe.pace.contactGrip) return null;
  if (way !== 'naturlig' || before.recipeGripYaw) { const g = steer.gripYaw ?? recipe.pace.gripYaw ?? 15; return [g, steer.gripYawEnd ?? recipe.pace.gripYawEnd ?? g]; }
  if (before.oneGripYaw || (steer.gripYaw !== null && steer.gripYawEnd == null)) { const g = steer.gripYaw ?? NATURAL_GRIP_YAW; return [g, steer.gripYawEnd ?? g]; }
  return [steer.gripYaw ?? NATURAL_GRIP_YAW_TAKE, steer.gripYawEnd ?? NATURAL_GRIP_YAW];
}

/** "Naturlig", the deal alone: to `target` with the natural hand change, steered by everything but the body, laid with the standard doll. Throws where layDeal does. */
export function naturalDeal(input: {plan: Plan; target: string; recipe: Recipe; pose: PoseFilm; steer: Steer; before?: AsBefore}) {
  const {plan, target, recipe, pose, steer} = input, before = input.before ?? {};
  // (the recipe's own angle is left to the recipe, and a second angle is given only where it differs from the first: the deal as it was laid before there were two)
  const yaws = gripYawsOf(recipe, steer, 'naturlig', before), {gripYawEnd: _end, ...rest} = steer;
  const gripYaw = yaws && !(before.recipeGripYaw && steer.gripYaw === null) ? yaws[0] : steer.gripYaw, end = yaws && yaws[1] !== yaws[0] ? {gripYawEnd: yaws[1]} : {};
  return layDeal({plan, target, recipe, pose, steer: {...rest, gripYaw, ...end, body: null}, natural: true});
}
/** "Naturlig", first half: naturalDeal on the doll as "Naturlig" has her (`doll`, returned). Throws where layDeal does. */
export function layNatural(input: {plan: Plan; target: string; recipe: Recipe; pose: PoseFilm; steer: Steer; lens: Lens; doll: Doll; before?: AsBefore}) {
  const before = input.before ?? {}, doll = dollFor('naturlig', input.doll, before), deal = naturalDeal(input), posed = onDoll(input.lens, deal, doll);
  return {deal, motion: posed.motion, shortMm: posed.shortMm, doll, before};
}
export type LaidNatural = ReturnType<typeof layNatural>;

/**
 * The return of a deal laid with the card's tempo (lay.ts Steer.cardTempo), where nothing else times it: the card hand
 * rests on the laid card and comes back that many times sooner than the return's own times (return-cycle.ts: a fifth of a
 * second's hold, a lift, four thirds of a second back), while her gaze turns back to the shoe over the return's own time
 * and her free hand goes on along the deal's way back at its own pace (`freeLeft`). Whatever the order's cycle says goes
 * before it (dealer3d/tools/docka-cykel.ts --hold, --ready, --duration).
 */
export function quickReturn(deal: DealMotion, cardTempo: number): ReturnCycleOptions {
  const fps = deal.fps, holdThrough = deal.rests + Math.max(1, Math.round(fps / 5 / cardTempo)), liftEnds = holdThrough + Math.max(1, Math.round(fps / 5));
  const readyFrom = Math.max(liftEnds + 2, holdThrough + Math.round(fps * 4 / 3 / cardTempo)), gazeReadyFrom = Math.max(readyFrom, holdThrough + Math.max(3, Math.round(fps * 4 / 3)));
  let leftHome = deal.frameCount; while (leftHome > 0 && Math.hypot(...[0, 1, 2].map(j => deal.frames[leftHome - 1].L.w[j] - deal.frames[0].L.w[j])) <= 1e-6) leftHome--;
  return {holdThrough, readyFrom, gazeReadyFrom, freeLeft: true, durationSeconds: (Math.max(gazeReadyFrom, leftHome) + Math.max(1, Math.round(fps * 2 / 15))) / fps};
}

/** The body the sliders ask of her laid on as the difference from what the deal asks (`lab.bodyAsked`); null: the deal's own. */
const bodyMore = (body: [number, number, number] | null, asked: [number, number, number]) => body ? body.map((x, k) => Math.round((x - asked[k]) * 1000) / 1000) as [number, number, number] : null;
/**
 * "Naturlig", second half: that deal moved as a person moves. `body`: the body the sliders ask of her at the place
 * (degrees [sideways toward seat 7, the right shoulder forward, forward], as Steer.body; null: the deal's own), laid on
 * as the difference from what the deal asks (`lab.bodyAsked`). `bodyShare`: the least share of that steering any frame
 * took (1: all of it; below 1 where her arms would not reach further).
 */
export function moveNatural(laid: LaidNatural, body: [number, number, number] | null, knobs: Knobs, lens: Lens, landing?: Landing, turn?: TurnId) {
  const {motion: moved, receipt} = natural(lens, laid.motion as never, laid.doll, {body: bodyMore(body, laid.deal.lab.bodyAsked), ...knobs});
  const inHand = turnedInHand(moved as never, laid.doll, turn ?? TURN_DEFAULT), motion = inHand.motion as typeof moved;
  const end = landed(motion, laid.doll, landing ?? {id: LANDING_DEFAULT}, landingTimes(motion as never));
  return {motion: humaneUnless(end.motion, laid.before) as unknown as typeof laid.motion, receipt, bodyShare: Math.min(...receipt.frames.map(f => f.bodyShare)), landing: end.receipt, turn: inHand.receipt};
}

/**
 * A deal and its return to the pose it began in, in one motion (Jakob 2026-11-23, "giv och återgång i en film"): what
 * dealer3d/tools/docka-cykel.ts writes for an order and the lab shows (through `filmed`, below). `deal` is laid with the
 * standard doll: naturalDeal's or layDeal's (`way` "naturlig" or "forut"); the deal from A2.1 is built with its
 * return (dealer3d/src/pinch-deal.ts). Its return is dealer3d/src/return-cycle.ts's (`source` is the file the deal was
 * laid from); the whole is posed on the doll and in "Naturlig" moved as a person moves, what the sliders steer going out
 * over the return.
 */
export function withReturn<D extends DealMotion & {lab?: {bodyAsked?: [number, number, number]}}>(deal: D, input: {way: Way; body: [number, number, number] | null; knobs: Knobs; lens: Lens; doll: Doll;
  source: {path: string; sha256: string}; cycle?: ReturnCycleOptions; flatHand?: boolean; before?: AsBefore; landing?: Landing; turn?: TurnId; cardTempo?: number}) {
  const {way, lens} = input, doll = dollFor(way, input.doll, input.before);
  const quick = (input.cardTempo ?? 1) !== 1 ? quickReturn(deal, input.cardTempo!) : {};
  const said = Object.fromEntries(Object.entries(input.cycle ?? {}).filter(([, v]) => v !== undefined)) as ReturnCycleOptions; // (a flag not given says nothing)
  const cycle = buildReturnCycle(deal, input.source, {...quick, ...said});
  const posed = onDoll(lens, cycle, doll);
  if (way !== 'naturlig') return {cycle, motion: posed.motion, shortMm: posed.shortMm, bodyShare: null, receipt: null, landing: null, turn: null};
  const moved = natural(lens, posed.motion as never, doll, {body: bodyMore(input.body, deal.lab!.bodyAsked!), ...input.knobs, steerOut: [cycle.cycle.liftStarts, cycle.cycle.readyFrom], ...(input.flatHand ? {flatHand: true} : {})});
  const inHand = turnedInHand(moved.motion as never, doll, input.turn ?? TURN_DEFAULT), motion = inHand.motion as typeof moved.motion;
  const end = landed(motion, doll, input.landing ?? {id: LANDING_DEFAULT}, landingTimes(motion as never, cycle.cycle));
  return {cycle, motion: humaneUnless(end.motion, input.before) as unknown as typeof posed.motion, shortMm: posed.shortMm, bodyShare: Math.min(...moved.receipt.frames.map(f => f.bodyShare)), receipt: moved.receipt, landing: end.receipt, turn: inHand.receipt};
}

// ---- the one chain: what the lab shows is what an order films ---------------------------------------------------------
/** The way a doll deals from A2.3: "Naturlig" for every dealer's doll; the standard doll, the base every doll is fitted from, as the deal was laid before ('forut'). There is no choice of it (Jakob 2026-11-26). */
export const wayFor = (doll: Doll): Way => doll.name === 'standard' ? 'forut' : 'naturlig';
/**
 * The ends of two of the lab's sliders, below which every card they apply to lays, with her return, on Paow with her arm
 * reaching every frame, the other sliders as they are by default (Jakob 2026-11-26: "everything must be watertight";
 * measured 2026-11-26 through this chain on the plan as saved, every 5 % from 105 % and from 5 %, and rounded down):
 * - the card's tempo (lay.ts Steer.cardTempo, "Kortets fart"): P1.C1 lays to 155 % (at 160 % her return moves too far),
 *   P1.C2 to 160 %, P2.C1 and P6.C2 to 195 %, the other twelve cards to 200 % and more; the lab's slider also stops at
 *   lay.ts cardTempoMost for the card;
 * - where the turn begins (Steer.turnNear, "Var kortet vänds"): P4.C1 and P4.C2 lay to 35 % (at 40 % her arm is 10 mm
 *   short), P5.C1, P5.C2 and P6.C2 to 40 %, the other eleven to 50 % and more.
 * A combination of sliders a card cannot take is said on the page.
 */
export const ENDS = {cardTempo: 1.5, turnNear: 0.3};
/** One state of a deal from A2.3 as it is filmed: the place, its recipe and the pose film it begins on, the doll, and what the lab's controls (or docka-cykel.ts's flags) steer. `source`: the recipe's file, which the return records. `cycle`, `flatHand`, `before`: docka-cykel.ts's own flags (none on the page). */
export type FilmInput = {plan: Plan; place: string; recipe: Recipe; pose: PoseFilm; doll: Doll; lens: Lens; steer: Steer; knobs: Knobs; landing: Landing; turn: TurnId;
  source?: {path: string; sha256: string}; cycle?: ReturnCycleOptions; flatHand?: boolean; before?: AsBefore};
/**
 * The rules every filmed deal keeps, whatever a state or a saved file says, so that nothing the lab does not show can move
 * the motion and an order never fails where the lab showed the deal:
 * - the way is the doll's (wayFor); only "Naturlig" has shoulders, elbows, a landing and a turn of its own;
 * - a card laid closed (Steer.side 'BACK', the plan's) is slid face down and never turned: no turn in her hand and no
 *   landing, and neither where the turn begins, how late, nor the hand's height in it steers it (turnNear, turnLater, carry);
 * - the whole deal's tempo (Steer.tempo, the lab's "Hela given" until 2026-11-26) is 1: the card's tempo is the one speed.
 */
export function filmRules(input: Pick<FilmInput, 'doll' | 'steer' | 'knobs' | 'landing' | 'turn'>) {
  const way = wayFor(input.doll), closed = sideOf(input.steer) === 'BACK', own = way === 'naturlig' && !closed;
  const steer: Steer = {...input.steer, tempo: 1, ...(closed ? {turnNear: null, turnLater: 0, carry: null} : {})};
  const knobs: Knobs = way === 'naturlig' ? input.knobs : structuredClone(NO_KNOBS);
  return {way, closed, steer, knobs, landing: own ? input.landing : {id: LANDING_DEFAULT} as Landing, turn: own ? input.turn : TURN_DEFAULT};
}
/** A filmed deal's first half, the deal alone laid with the standard doll as the rules have it: what the body, the shoulders, the elbows, the landing and the turn move comes after it (filmed), so the lab keeps it while only those move. */
export function filmDeal(input: FilmInput): LaidDeal {
  const r = filmRules(input), {plan, place: target, recipe, pose} = input;
  return r.way === 'naturlig' ? naturalDeal({plan, target, recipe, pose, steer: r.steer, before: input.before}) : layDeal({plan, target, recipe, pose, steer: r.steer});
}
/** The motion an order films and the lab shows: `deal` (filmDeal of the same input) with its return, on the doll, in "Naturlig" moved as a person moves, turned and landed; and the rules it was laid by. */
export function filmed(deal: LaidDeal, input: FilmInput) {
  const r = filmRules(input), source = input.source ?? {path: `dealer3d/data/${input.recipe.from}.json`, sha256: ''};
  const done = withReturn(deal as unknown as Parameters<typeof withReturn>[0], {way: r.way, body: r.steer.body, knobs: r.knobs, lens: input.lens, doll: input.doll, source, cycle: input.cycle, cardTempo: cardTempoOf(r.steer), flatHand: input.flatHand, before: input.before, landing: r.landing, turn: r.turn});
  return {...done, rules: r};
}
