"use client";

// The column's panels for the chosen card in Bordet's Inspelning, beside the doll's 3D picture (Jakob 2026-11-25: "jag vill ha
// allt i 3d"). The table is always the real one: every card is a real card through the same camera as the dealer, so a card
// has no direction or shape of its own to set. Step 1, Var kortet landar: PlacePanel (where the card lies). Step 2, Hur det
// kommer dit: MotionPanel (for a dealer's card the side it lies with, "Kortet ligger", chosen here and nowhere else; a
// player's card always lies open; the doll's own controls under it show and steer the way). The recording always has a real
// card (Jakob 2026-11-26), so the table has no shape to set here; how the game draws its cards is the look's Kortens form,
// chosen in Scen. A real card has no size of its own here (Jakob 2026-11-17: "kör vi 1.0 så kanske det är bra"; its size is
// adjusted only in Efterarbete), and no grid to snap to or start proposal to go back to (Jakob 2026-11-24: "färre val").
// Every change goes to the draft as one step; nothing is saved here, and the plan keeps every field it has, also those no
// panel shows.
import type { ReactNode } from "react";
import { CARD_COLOUR, editIntent, editPlace, type Place, type PlacementPlan } from "../../../src/placement-model.ts";
import { PLAN_VIEW, isDealerCard } from "../../lib/placement.ts";
import { SegmentedControl } from "../ui";
import { NumberField } from "./NumberField";
import { draftActions } from "./useDraft.ts";

// ── pieces ──
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-line px-4 py-4 last:border-b-0">
      <h3 className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">{title}</h3>
      {children}
    </section>
  );
}
const swatch = (colour: string) => <span aria-hidden className="inline-block size-2.5 rounded-[2px] border border-black/30" style={{ background: colour }} />;
const SIDES = [
  { value: "BACK" as const, label: "Stängt", icon: swatch(CARD_COLOUR.BACK) },
  { value: "FRONT" as const, label: "Öppet", icon: swatch(CARD_COLOUR.FRONT) },
];

// ── Step 1: the place ──
export function PlacePanel({ plan, id, editable }: { plan: PlacementPlan; id: Place; editable: boolean }) {
  const view = PLAN_VIEW;
  const off = !editable;
  const edit = (fn: (p: PlacementPlan) => PlacementPlan) => draftActions.edit(fn);
  const point = plan.targets[id].geometry[view];
  return (
    <Section title="Läge">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Från vänster" unit="%" value={point.u * 100} digits={2} min={0} max={100} step={0.1} disabled={off} onCommit={(n) => edit((p) => editPlace(p, id, view, { u: n / 100 }))} />
        <NumberField label="Från botten" unit="%" value={point.v * 100} digits={2} min={0} max={100} step={0.1} disabled={off} onCommit={(n) => edit((p) => editPlace(p, id, view, { v: n / 100 }))} />
      </div>
      <p className="text-xs leading-5 text-dim">Dra kortet på bordet i bilden, eller flytta det med piltangenterna (Skift: tio steg).</p>
    </Section>
  );
}

// ── Step 2: the way there ──
/**
 * What the plan steers of the card's way: for a dealer's card (DC1–DC3) the side it lies with ("Kortet ligger", the plan's
 * endSide: the doll lays it so, and an order's text says it). A player's card always lies open, and the doll lays it open
 * whatever the plan says, so it has nothing to choose. Everything else the anchor the card goes from (the guide tree's:
 * lib/bordet.ts treeAnchor) and the doll decide: its picture and its own controls under this panel (how it lands and turns,
 * its body and the card's speed) show the motion an order films; step 3 says what an order sends. (A row of the way's steps
 * read from the plan's hidden fields stood here until 2026-11-26: it named steps the doll does not make. `anchor` is
 * no longer read.)
 */
export function MotionPanel({ plan, id, editable }: { plan: PlacementPlan; id: Place; editable: boolean }) {
  const intent = plan.targets[id].intent;
  return (
    <Section title="Det som styr">
      {isDealerCard(id) ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-dim">Kortet ligger</span>
          <SegmentedControl size="sm" label="Kortet ligger" value={intent.endSide} disabled={!editable} onChange={(s) => draftActions.edit((p) => editIntent(p, id, "endSide", s))} options={SIDES} />
        </div>
      ) : (
        <p className="text-sm text-dim">Spelarens kort ligger alltid öppet.</p>
      )}
    </Section>
  );
}
