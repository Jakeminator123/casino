// The game's picture of the table: which card lies where. Pure, no DOM, so Node can test it.
//
// The engine (game/) says which cards a seat's hands hold, by draw number in the shoe. This file turns that into a place per
// card: a slot (seat, hand, number in the hand), the placement key whose films deal a card there, and the card's quad in film
// pixels. The placement plan has two places per player (C1, C2) and three for the dealer. Extra player cards follow C1/C2:
// a third, fourth and fifth card continue the line C1 → C2 in short steps, and split hands lie one behind the other toward
// the dealer. Seats are 1–7, seat 1 at camera left; nothing here knows the engine's zero-based boxes.
//
// A card's outline at its place follows the look's lens (the scene key lins; Lins in src/card-plan.ts): under 'standard' the
// card plan's own rule (planCardAt: a real card through the table's lens in the look's Kortens form, the scene key cardTaper,
// the same for a place of the plan and for a place made up here), the default since Jakob chose it on 2026-11-19; under 'bred'
// (Bred lins) the plan's older projective plane (flatQuad), which the game follows where its look says so (Casino's since Jakob
// 2026-11-21).
//
// Under the live table (src/uppsattning.ts, the option uppsattning) a card lies by its measured place instead: a real card at its
// place in metres with its lie (LIVE.cards in src/table-live.ts), drawn through the live table's camera into its own picture
// (1728 x 972, rolled), so the scene lays it back on exactly that place (liveLayout below).
import {DEALER_THIRD_FILM, flatQuad, quad, toPixels, fromPixels, type Geometry, type PlacementPlan} from './placement-model.ts';
import {CARD_TAPER, LINS, filmToPlan, planCardAt, planToFilm, type Lins} from './card-plan.ts';
import {cardCorners, type Lens, type Vec3} from './table-lens.ts';
import {UPPSATTNING, type Plats, type UppsattningId} from './uppsattning.ts';

export type Pt = {x: number; y: number};
// owner P: a seat 1–7. owner D: the dealer (seat 0). hand: which of the seat's hands, 0 first, of `hands`. index: the card's
// number in its hand, 0 first.
export type Slot = {owner: 'P' | 'D'; seat: number; hand: number; hands: number; index: number};
// Draw numbers in dealing order. A seat's hands keep the order the engine gives them.
export type TableHand = {seat: number; cards: number[]};
export type TableCards = {hands: TableHand[]; dealer: number[]};

// Pixels in the film frame. FAN: step between cards from the third on. SPLIT: step between the hands of one seat.
// Both are first values to be judged by eye in motion; the seat films were only tried to about 45–50 px from their own card.
export const FAN = 24, SPLIT = 66;
// Seats where the seat film's hand does not reach a fan of 24 px (the film agent's trial in motion, 2026-11-11): a shorter
// step keeps the cards under the fingers at seat 5 and away from the shoe at seat 7. Proposals, not yet tried in motion.
export const FAN_AT: Record<number, number> = {5: 16, 7: 12};
// Migration fallback for files without the now editable D.C3. New and normalized plans keep this in their own target.
export const DEALER_THIRD = DEALER_THIRD_FILM;
// The plan is written for the 1762 px wide lab view and the films are 1764 px wide: src/card-plan.ts planToFilm and filmToPlan.

export function slotOf(table: TableCards, shoeDraw: number): Slot | null {
  const d = table.dealer.indexOf(shoeDraw);
  if (d >= 0) return {owner: 'D', seat: 0, hand: 0, hands: 1, index: d};
  for (const hand of table.hands) {
    const index = hand.cards.indexOf(shoeDraw); if (index < 0) continue;
    const own = table.hands.filter(h => h.seat === hand.seat);
    return {owner: 'P', seat: hand.seat, hand: own.indexOf(hand), hands: own.length, index};
  }
  return null;
}
const place = (slot: Slot) => slot.owner === 'D' ? 'D' : `P${slot.seat}`;
/** The card's name on the table: P4.C1, P4.C3, P4.H2.C1 (second hand after a split), D.C2. */
export const slotLabel = (slot: Slot) => `${place(slot)}${slot.hands > 1 ? `.H${slot.hand + 1}` : ''}.C${slot.index + 1}`;
/**
 * The placement key whose films deal a card to this slot. A seat has films for its first card; its second card shares them
 * (the clip bank knows that). The dealer has films of their own for the open first card, the closed second and a third.
 * Every other card plays the nearest film there is, and the rendered card is moved to the slot.
 */
export function slotFilm(slot: Slot): string {
  if (slot.owner === 'D') return `D.C${Math.min(slot.index, 2) + 1}`;
  return `P${slot.seat}.C${slot.hands === 1 && slot.index === 1 ? 2 : 1}`;
}

/**
 * fan: one step for every seat instead of FAN and FAN_AT (for trying values from the page's address). lins: the look's lens,
 * which decides the rule a card's outline follows (see the top); left out, Standard (LINS). taper: the look's Kortens form
 * under Standard (CARD_TAPER in src/card-plan.ts); left out, the look's default. lens: another lens than the table's, for the
 * tests that change the camera.
 */
export function createLayout(plan: PlacementPlan, options: {fan?: number | null; lins?: Lins; taper?: number; lens?: Lens; uppsattning?: UppsattningId} = {}) {
  if (options.uppsattning === 'live') return liveLayout(plan, options.fan ?? null);
  const flat = plan.tableProjection?.mode === 'flat', heading = plan.tableProjection?.heading ?? 0, reference = plan.targets['P4.C1'].geometry.native;
  const rule = options.lins ?? LINS, taper = options.taper ?? CARD_TAPER.chosen;
  const shape = (g: Geometry): Pt[] => (rule === 'standard' ? planCardAt(plan, g, 'native', options.lens, taper) : flat ? flatQuad(g, reference, 'native', heading) : quad(g, 'native')).map(planToFilm);
  function geometry(slot: Slot): Geometry {
    const first = plan.targets[`${place(slot)}.C1`].geometry.native, second = plan.targets[`${place(slot)}.C2`].geometry.native;
    if (slot.hands === 1 && slot.index <= 1) return slot.index ? second : first;
    const step = options.fan ?? FAN_AT[slot.seat] ?? FAN;
    if (slot.owner === 'D') {
      const saved=plan.targets['D.C3']?.geometry.native;
      const origin=saved ? planToFilm(toPixels(saved,'native')) : DEALER_THIRD;
      const third=filmToPlan({x:origin.x+(slot.index-2)*step,y:origin.y});
      return {...(saved??second),...fromPixels(third.x,third.y,'native')};
    }
    const a = toPixels(first, 'native'), b = toPixels(second, 'native'), length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const along = {x: (b.x - a.x) / length, y: (b.y - a.y) / length};
    // Split hands step away from the player, toward the dealer: up in the image, whichever way the line C1 → C2 points.
    const away = along.x >= 0 ? {x: along.y, y: -along.x} : {x: -along.y, y: along.x};
    const run = slot.index === 0 ? 0 : length + (slot.index - 1) * step, back = slot.hand * SPLIT;
    return {...(slot.index ? second : first), ...fromPixels(a.x + along.x * run + away.x * back, a.y + along.y * run + away.y * back, 'native')};
  }
  const quadOf = (slot: Slot) => shape(geometry(slot));
  return {
    /** The card's four corners in film pixels, in the plan's corner order. */
    quad: quadOf,
    centre(slot: Slot): Pt { const q = quadOf(slot); return {x: q.reduce((s, p) => s + p.x, 0) / 4, y: q.reduce((s, p) => s + p.y, 0) / 4}; },
    /** Bend and gloss of the plan's card at the seat (the Material panel's values). */
    material: (slot: Slot) => (slot.owner==='D'&&slot.index>=2&&plan.targets['D.C3'] ? plan.targets['D.C3'] : plan.targets[`${place(slot)}.C${slot.index ? 2 : 1}`]).material,
  };
}
export type Layout = {quad(slot: Slot): Pt[]; centre(slot: Slot): Pt; material(slot: Slot): PlacementPlan['targets'][string]['material']};

/**
 * The live table's steps in metres, first values to be judged in motion as FAN and SPLIT are: a third and later card continue
 * the line from the first card to the second LIVE_FAN apart, and a split hand lies LIVE_SPLIT behind the one before it, toward the
 * dealer. The measurement's third places are not used: there the third card first lay still on the second (seat 1 within 3 mm,
 * the dealer's on his first within 4 mm), and on a table that shows every card it would hide one.
 */
export const LIVE_FAN = 0.02, LIVE_SPLIT = 0.05;
/**
 * The game's cards under the live table (src/uppsattning.ts): each slot's place on the felt (a measured first and second card,
 * LIVE.cards; a seat whose second card the measurement lacks, seat 3's, takes the mirrored seat's step from its first, mirrored),
 * the card's four corners there (table-lens.ts cardCorners: far left, far right, near right, near left, the plan's corner order)
 * through the live table's camera, in its picture. fan: one step in metres for every seat (the page's ?fan= is in pixels of the
 * former picture and is not read here).
 */
export function liveLayout(plan: PlacementPlan, fan: number | null = null): Layout {
  const u = UPPSATTNING.live, places = new Map(u.kortplatser().map(p => [p.id, p]));
  const placeOf = (owner: string, seat: number, index: number): Plats => {
    const id = `${owner}.C${index + 1}`, own = places.get(id); if (own) return own;
    const first = places.get(`${owner}.C1`)!, mirror = places.get(`P${8 - seat}.C${index + 1}`), mirrorFirst = places.get(`P${8 - seat}.C1`);
    if (!mirror || !mirrorFirst || owner === 'D') return first;
    return {id, at: [first.at[0] - (mirror.at[0] - mirrorFirst.at[0]), 0, first.at[2] + (mirror.at[2] - mirrorFirst.at[2])], heading: -mirror.heading};
  };
  function at(slot: Slot): Plats {
    const owner = place(slot), first = placeOf(owner, slot.seat, 0), second = placeOf(owner, slot.seat, 1);
    if (slot.hands === 1 && slot.index <= 1) return slot.index ? second : first;
    const dx = second.at[0] - first.at[0], dz = second.at[2] - first.at[2], length = Math.hypot(dx, dz) || 1, along = [dx / length, dz / length];
    // a split hand steps across the line toward the dealer (-z), whichever way the line points
    const across = [-along[1], along[0]], away = across[1] <= 0 ? across : [-across[0], -across[1]];
    const run = slot.index === 0 ? 0 : length + (slot.index - 1) * (fan ?? LIVE_FAN), back = slot.hand * LIVE_SPLIT;
    return {id: slotLabel(slot), at: [first.at[0] + along[0] * run + away[0] * back, 0, first.at[2] + along[1] * run + away[1] * back] as Vec3, heading: slot.index ? second.heading : first.heading};
  }
  const quadOf = (slot: Slot): Pt[] => { const p = at(slot); return cardCorners(p.at, p.heading).map(c => u.see(c)!); };
  return {
    quad: quadOf,
    centre(slot: Slot): Pt { const q = quadOf(slot); return {x: q.reduce((s, p) => s + p.x, 0) / 4, y: q.reduce((s, p) => s + p.y, 0) / 4}; },
    // the card's look (bend, gloss) is the plan's for that seat, as under the former standard
    material: (slot: Slot) => (slot.owner === 'D' && slot.index >= 2 && plan.targets['D.C3'] ? plan.targets['D.C3'] : plan.targets[`${place(slot)}.C${slot.index ? 2 : 1}`]).material,
  };
}
