// Where the doll cannot deal a card of the plan from A2.1 (Jakob 2026-11-24: "I vissa lägen från vissa typer av ställningar
// ska man liksom inte kunna byta hand kanske, eller så måste man det. Beroende på vad dockan försöker sig på att göra och vad
// som är anatomiskt möjligt."). tools/doll-order.ts refuses such a deal from A2.1 (handChange), the doll lab shows it
// (dealer3d/page/lay.ts placeFrom) and docka-cykel.ts stops on it, all three by this rule. The anchor a card is dealt from
// is the guide tree's (studio/lib/bordet.ts treeAnchor), not the plan's "Handbyte". Pure: no I/O.
//
// - Laid closed: from A2.1 the doll turns the card face up in her fingers on the way, always (dealer3d/src/pinch-deal.ts
//   builds no closed card); a card the plan lays closed goes from A2.3. Paow herself does it from A2.1 (her film
//   paow-giv-2-1-d-01-01 lays D.C1 face down with her left hand alone; Jakob 2026-11-13: "Den är mycket bra"): the doll
//   cannot yet.
// - Every other place, seats 1 and 2 too (Jakob 2026-11-26: "plats ett ska få nyp"). Her films to them from A2.1
//   (paow-giv-2-1-p1-06-01, -p1-10-01, -p2-03-01, -p2-05-01) carry the card with her left hand alone, the left arm across her
//   body over her right hand, which rests on the felt, her trunk turned toward the place; the doll's deal does the same,
//   her left arm 10 mm and more off her right arm and hand at seat 1, 54 mm at seat 2. (Until 2026-11-26 a place to the
//   right of her right shoulder was refused, "her left arm over her right hand", and its card changed hands.)
// From A2.3 her right hand reaches every place of the plan.

/** The plan as far as the choices read it: the side each card lies with. */
export type PlanSides = {targets: Record<string, {intent?: {endSide?: 'BACK' | 'FRONT'}}>};
/** Whether the card must change hands (go from A2.3), and why, in his words. */
export type HandChange = {must: boolean; why: string | null};

export const CLOSED = 'Ett stängt kort läggs från A2.3 med handbyte: från A2.1 vänds kortet alltid upp i handen på vägen.';

/** Whether the card to the place cannot go from A2.1 and must change hands (go from A2.3): a card laid closed. */
export function handChange(plan: PlanSides, id: string): HandChange {
  return plan.targets[id]?.intent?.endSide === 'BACK' ? {must: true, why: CLOSED} : {must: false, why: null};
}
