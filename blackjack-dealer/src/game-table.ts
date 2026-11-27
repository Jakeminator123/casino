// The game's picture of the table: which card lies where. Pure, no DOM, so Node can test it.
//
// The engine (game/) says which cards a seat's hands hold, by draw number in the shoe. This file turns that into a place per
// card: a slot (seat, hand, number in the hand), the placement key whose films deal a card there, and the card's quad in film
// pixels. The live table has two places per player (C1, C2) and its dealer's. Extra player cards follow C1/C2: a third, fourth
// and fifth card continue the line C1 → C2 in short steps, and split hands lie one behind the other toward the dealer. Seats are
// 1–7, seat 1 at camera left; nothing here knows the engine's zero-based boxes.
//
// A card lies by its measured place: a real card at its place in metres with its lie (LIVE.cards in src/table-live.ts), drawn
// through the live table's camera into its own picture (1728 x 972, rolled), so the scene lays it back on exactly that place.
// The card plan (placements/default.json) gives each card its look (bend, gloss).
import type {PlacementPlan} from './placement-model.ts';
import {cardCorners, type Vec3} from './space.ts';
import {STANDARD, type Plats} from './standard.ts';

export type Pt = {x: number; y: number};
// owner P: a seat 1–7. owner D: the dealer (seat 0). hand: which of the seat's hands, 0 first, of `hands`. index: the card's
// number in its hand, 0 first.
export type Slot = {owner: 'P' | 'D'; seat: number; hand: number; hands: number; index: number};
// Draw numbers in dealing order. A seat's hands keep the order the engine gives them.
export type TableHand = {seat: number; cards: number[]};
export type TableCards = {hands: TableHand[]; dealer: number[]};

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

export type Layout = {quad(slot: Slot): Pt[]; centre(slot: Slot): Pt; material(slot: Slot): PlacementPlan['targets'][string]['material']};

/**
 * The live table's steps in metres, first values to be judged in motion: a third and later card continue
 * the line from the first card to the second LIVE_FAN apart, and a split hand lies LIVE_SPLIT behind the one before it, toward the
 * dealer. The measurement's third places are not used: there the third card first lay still on the second (seat 1 within 3 mm,
 * the dealer's on his first within 4 mm), and on a table that shows every card it would hide one.
 */
export const LIVE_FAN = 0.02, LIVE_SPLIT = 0.05;
/**
 * The game's cards at the live table: each slot's place on the felt (a measured first and second card, LIVE.cards; a seat whose
 * second card the measurement lacks, seat 3's, takes the mirrored seat's step from its first, mirrored), the card's four corners
 * there (src/space.ts cardCorners: far left, far right, near right, near left, the plan's corner order) through the live table's
 * camera, in its picture. fan: one step in metres for every seat instead of LIVE_FAN (the page's ?fan=, for trying values).
 */
export function createLayout(plan: PlacementPlan, fan: number | null = null): Layout {
  const u = STANDARD, places = new Map(u.kortplatser().map(p => [p.id, p]));
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
    // the card's look (bend, gloss) is the plan's for that seat
    material: (slot: Slot) => (slot.owner === 'D' && slot.index >= 2 && plan.targets['D.C3'] ? plan.targets['D.C3'] : plan.targets[`${place(slot)}.C${slot.index ? 2 : 1}`]).material,
  };
}
