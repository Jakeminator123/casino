// Where the doll cannot deal a card of the plan from A2.1 (Jakob 2026-11-24: "I vissa lägen från vissa typer av ställningar
// ska man liksom inte kunna byta hand kanske, eller så måste man det. Beroende på vad dockan försöker sig på att göra och vad
// som är anatomiskt möjligt."). tools/doll-order.ts refuses such a deal from A2.1 (handChange), the doll lab shows it
// (dealer3d/page/lay.ts placeFrom, overHand) and docka-cykel.ts stops on it. The anchor a card is dealt from is the guide
// tree's (studio/lib/bordet.ts treeAnchor), not the plan's "Handbyte". Pure: no I/O.
//
// - Over her right hand: from A2.1 her left hand carries the card alone while her right hand rests on the felt in front of
//   her (dealer3d/data/ankare-2-1-paow.json). A place further to her right than her right shoulder takes the left arm over
//   that hand. Measured on the deals the builder makes (dealer3d/src/pinch-deal.ts, the plan as saved 2026-11-24), the left
//   arm's least distance to her right hand and forearm, bone to bone: P1 1–4 mm and P2 43–46 mm (through the hand and
//   against it), P3 52–58 mm (clear by about a centimetre), the dealer's cards 105 mm and more, P4 to P7 172 mm and more.
//   There the card goes from A2.3, where her right hand lays it.
// - Laid closed: from A2.1 the card is turned face up in her fingers on the way, always; a card laid closed goes from A2.3.
// From A2.3 her right hand reaches every place of the plan.
import {TABLE_LENS, filmEye, onPlane, planPixel, type Lens, type Vec3} from '../../src/table-lens.ts';

/** Her right shoulder across the table in the pose A2.1, metres (her left +): dealer3d/data/ankare-2-1-paow.json, frame.R.s. */
export const RIGHT_SHOULDER_21 = -0.2129;

/** The plan's places as far as the choices read them: each card's place on the bank's picture. */
export type PlanPlaces = {targets: Record<string, {geometry: {native: {u: number; v: number}}}>};
/** The plan as far as the choices read it: each card's place, and the side it lies with. */
export type PlanChoices = {targets: Record<string, {geometry: {native: {u: number; v: number}}; intent: {endSide: 'BACK' | 'FRONT'}}>};
/** Whether the card must change hands, and why, in his words; `over`: because her left arm would go over her right hand. */
export type HandChange = {must: boolean; over: boolean; why: string | null};

export const OVER_HAND = 'Från A2.1 skulle vänster arm gå över hennes högra hand, som vilar på bordet: platsen ligger till höger om hennes högra axel. Kortet byter hand och läggs från A2.3.';
export const CLOSED = 'Ett stängt kort läggs från A2.3 med handbyte: från A2.1 vänds kortet alltid upp i handen på vägen.';

/** Where a place of the plan lies on the felt, in metres; null if the plan has no such place. */
export function feltOf(plan: PlanPlaces, id: string, lens: Lens = TABLE_LENS): Vec3 | null {
  const g = plan.targets[id]?.geometry.native, p = g ? planPixel(g) : null;
  return p ? onPlane(filmEye(lens), p.x, p.y) : null;
}
/** Whether her left arm would go over her right hand on the way from A2.1 to the place. */
export function overHand(plan: PlanPlaces, id: string, lens: Lens = TABLE_LENS): boolean {
  const at = feltOf(plan, id, lens);
  return !!at && at[0] < RIGHT_SHOULDER_21;
}
/** Whether the card to the place cannot go from A2.1 and must change hands (go from A2.3): over her right hand, or laid closed. */
export function handChange(plan: PlanChoices, id: string, lens: Lens = TABLE_LENS): HandChange {
  const t = plan.targets[id];
  if (!t) return {must: false, over: false, why: null};
  if (overHand(plan, id, lens)) return {must: true, over: true, why: OVER_HAND};
  if (t.intent.endSide === 'BACK') return {must: true, over: false, why: CLOSED};
  return {must: false, over: false, why: null};
}
