// The thin helpers of Bordet's Inspelning, where Jakob's card plan is changed with the doll's 3D picture beside it: places in
// his words, the draft with its undo and what differs from the saved plan, an arrow key's nudge, numbers with a decimal comma
// and the card's way in his words (Kortbanan). The plan's own rules (where a card lies, how an edit is made) are
// src/placement-model.ts. Pure: no DOM, no network; the motion's words are tested in studio/tests/bordet-line.test.ts.
import { ANCHOR_NODE, type Anchor } from "../../src/order-model.ts";
import { SHOE, TARGETS, VIEWS, editPlace, motionNodes, sequence, type Hand, type Intent, type Place, type PlacementPlan, type Side, type View } from "../../src/placement-model.ts";
import { cardCode, nodeCode } from "./names.ts";

// ── Places ──────────────────────────────────────────────────────────────────
const PLACES: readonly Place[] = [...TARGETS, SHOE];
export const SEATS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "D"] as const;
/** The place Inspelning opens on: P4C2. */
export const START_PLACE: Place = "P4.C2";

/** "Plats 4 · kort 2", "Dealern · kort 1", "Skon". */
export function placeName(id: Place): string {
  if (id === SHOE) return "Skon";
  const m = /^(P([1-7])|D)\.C([123])$/.exec(id);
  if (!m) return id;
  return m[2] ? `Plats ${m[2]} · kort ${m[3]}` : `Dealern · kort ${m[3]}`;
}
/** "P4C2", "DC1", "Sko": the short form in the column and in the address. */
export const placeCode = (id: Place): string => (id === SHOE ? "Sko" : (cardCode(id) ?? id));
/** A place from its short form ("p4c2", "DC1", "sko") or its plan key ("P4.C2"); null when it names none. */
export function placeFromCode(code: string | null | undefined): Place | null {
  const text = (code ?? "").trim().toUpperCase().replace(/\./g, "");
  if (text === "SKO" || text === "SHOE") return SHOE;
  const m = /^(P[1-7]|D)C([123])$/.exec(text);
  const id = m ? `${m[1]}.C${m[2]}` : null;
  return id && TARGETS.includes(id) ? id : null;
}

/**
 * The one view the card plan is edited in: the bank's picture, Dator (Jakob 2026-11-18: "Jag trodde att ingenting skulle göras
 * dubbelt för mobilen"). The plan file still holds a second view, portrait, that nothing in the studio, the game or an order
 * reads; validatePlan keeps accepting it and the studio leaves it as it stands.
 */
export const PLAN_VIEW: View = "native";
const handWord = (h: Hand) => (h === "LH" ? "vänster" : "höger");
const sideWord = (s: Side) => (s === "BACK" ? "stängt" : "öppet");

// ── Numbers ─────────────────────────────────────────────────────────────────
/** 12.5 → "12,5" with `digits` decimals (the minus sign as "−"). */
export const decimal = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",").replace("-", "−");
/** A number as Jakob may write it: "12,5", "12.5", "−3", " 4 ". NaN when it is none. */
export function parseDecimal(text: string): number {
  const t = text.trim().replace(/\s+/g, "").replace(/[−–]/g, "-").replace(",", ".");
  return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : Number.NaN;
}

// ── The draft ───────────────────────────────────────────────────────────────
// What Jakob changes is a draft beside the plan as it was read. Nothing is written until he presses Spara. Undo goes one
// step back; "Till sparat" goes to the saved plan as one step that can itself be undone. A gesture (a drag of the card's
// place in the doll's picture, a run of key presses) is one step: its first change puts the plan it started from on the
// undo list.
export type Draft = { saved: PlacementPlan; revision: string; plan: PlacementPlan; past: PlacementPlan[]; gesture: PlacementPlan | null };
const HISTORY = 60;
const signature = (plan: PlacementPlan) => JSON.stringify(plan);
const withProjection = (plan: PlacementPlan): PlacementPlan => (plan.tableProjection ? plan : { ...plan, tableProjection: { mode: "flat", heading: 0 } });

/**
 * A draft of the plan as read. A plan saved before the table projection existed gets the flat table in the draft, as the old
 * lab gave it: the draft then differs from the file until it is saved, and says so.
 */
export function openDraft(saved: PlacementPlan, revision: string): Draft {
  return { saved, revision, plan: withProjection(structuredClone(saved)), past: [], gesture: null };
}
export const isDirty = (d: Draft) => signature(d.plan) !== signature(d.saved);
const push = (past: PlacementPlan[], plan: PlacementPlan) => [...past, plan].slice(-HISTORY);

/** One step: the plan before it goes on the undo list (nothing happens when the plan is the same). */
export function commit(d: Draft, next: PlacementPlan): Draft {
  if (signature(next) === signature(d.plan)) return d;
  return { ...d, plan: next, past: push(d.past, d.plan), gesture: null };
}
/** A gesture begins: its first change will be one step. */
export const begin = (d: Draft): Draft => ({ ...d, gesture: d.plan });
/** A change within the gesture; without one, a step of its own. */
export function amend(d: Draft, next: PlacementPlan): Draft {
  if (!d.gesture) return commit(d, next);
  if (signature(next) === signature(d.plan)) return d;
  const first = d.plan === d.gesture;
  return { ...d, plan: next, past: first ? push(d.past, d.gesture) : d.past };
}
export const end = (d: Draft): Draft => (d.gesture ? { ...d, gesture: null } : d);
export const undo = (d: Draft): Draft => (d.past.length ? { ...d, plan: d.past[d.past.length - 1], past: d.past.slice(0, -1), gesture: null } : d);
/** Back to the saved plan, as one step that Ångra takes back. */
export const toSaved = (d: Draft): Draft => commit(d, withProjection(structuredClone(d.saved)));
/** After a save: the server's plan (with its new updatedAt) is both the saved plan and the draft; the undo list is cleared. */
export const afterSave = (saved: PlacementPlan, revision: string): Draft => ({ saved, revision, plan: structuredClone(saved), past: [], gesture: null });

/** The places whose data differ between two plans (geometry in either view, motion, material), and whether the table's projection does. */
export function changedPlaces(a: PlacementPlan, b: PlacementPlan): { places: Place[]; table: boolean } {
  const places = PLACES.filter((id) => (id === SHOE ? JSON.stringify(a.shoe) !== JSON.stringify(b.shoe) : JSON.stringify(a.targets[id]) !== JSON.stringify(b.targets[id])));
  const table = JSON.stringify(a.tableProjection ?? null) !== JSON.stringify(b.tableProjection ?? null);
  return { places, table };
}

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
/** An arrow key on a place: one pixel of the plan's picture (Shift: ten) in the arrow's direction. null when the key is no arrow. */
export function nudged(plan: PlacementPlan, id: Place, view: View, key: string, shift: boolean): PlacementPlan | null {
  const d = ARROWS[key];
  if (!d) return null;
  const v = VIEWS[view];
  const step = shift ? 10 : 1;
  const old = id === SHOE ? plan.shoe[view] : plan.targets[id].geometry[view];
  return editPlace(plan, id, view, { u: old.u + (d[0] * step) / (v.width - 1), v: old.v - (d[1] * step) / (v.height - 1) });
}

// ── The motion, in his words ────────────────────────────────────────────────
export type MotionStep = { id: string; label: string; detail: string };
/** How the hand at the shoe takes the card from each anchor. */
const TAKE_WORD: Record<Exclude<Anchor, "1">, string> = { "2.1": "Nyp", "2.2": "Släp", "2.3": "Drar ut" };
/**
 * The card's way from the shoe and back (motionNodes), in Swedish, from `anchor`: the anchor the card's films go from
 * (lib/bordet.ts treeAnchor). From A2.3 the card changes hands, whatever the plan's own "Handbyte" says. `code` is the
 * model's own line for the exact reading. The turn says only what the plan steers (the sides); where and how it turns the
 * doll's picture shows, and an order's recipe and reference film decide.
 */
export function motionSteps(id: string, intent: Intent, anchor: Exclude<Anchor, "1">): { steps: MotionStep[]; code: string } {
  const way: Intent = { ...intent, pass: anchor === "2.3" };
  const at = nodeCode(ANCHOR_NODE[anchor]);
  const words: Record<string, (detail: string) => MotionStep> = {
    ready: () => ({ id: "ready", label: at, detail: sideWord(way.startSide) }),
    take: () => ({ id: "take", label: TAKE_WORD[anchor], detail: handWord(way.takeHand) }),
    pass: () => ({ id: "pass", label: "Handbyte", detail: `${handWord(way.takeHand)} → ${handWord(way.takeHand === "LH" ? "RH" : "LH")}` }),
    turn: () => ({ id: "turn", label: "Vänd", detail: `${sideWord(way.startSide)} → ${sideWord(way.endSide)}` }),
    land: () => ({ id: "land", label: "Landar", detail: `${nodeCode(id)} · ${sideWord(way.endSide)}` }),
    release: (detail) => ({ id: "release", label: "Släpper", detail: handWord(detail as Hand) }),
    return: () => ({ id: "return", label: "Tillbaka", detail: at }),
  };
  return { steps: motionNodes(id, way).map((n) => words[n.id](n.detail)), code: sequence(id, way) };
}
