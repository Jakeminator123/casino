"use client";

// The column's panels for the chosen place in Bordet's Inspelning, beside the doll's 3D picture (Jakob 2026-11-25: "jag vill ha
// allt i 3d"). The table is always the real one: every card is a real card through the same camera as the dealer, so a card
// has no direction or shape of its own to set. Step 1, Var kortet landar: PlacePanel (where the card lies, and whether it is
// checked). Step 2, Hur det kommer dit: MotionPanel (the side the card lies with, "Kortet ligger", chosen here and nowhere
// else; the card's way from the anchor it goes from). Hela bordet: TablePanel
// (the table's one shape number, Bordets perspektiv, and how many places are checked). A real card has no size of its own
// here (Jakob 2026-11-17: "kör vi 1.0 så kanske det är bra"; its size is adjusted only in Efterarbete). Every change goes to
// the draft as one step (a slider's drag is one step); nothing is saved here, and the plan keeps every field it has, also
// those no panel shows.
import { Grid2x2, RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Anchor } from "../../../src/order-model.ts";
import { planTaper } from "../../../src/card-plan.ts";
import { CARD_COLOUR, SHOE, TABLE_PERSPECTIVE, TARGETS, editIntent, editPlace, resetPlace, setTablePerspective, snapPlace, type Place, type PlacementPlan } from "../../../src/placement-model.ts";
import { PLAN_VIEW, motionSteps } from "../../lib/placement.ts";
import { Button, SegmentedControl, Select, Slider, Switch } from "../ui";
import { cn } from "../ui/cn";
import { NumberField } from "./NumberField";
import { draftActions } from "./useDraft.ts";

// ── pieces ──
export function Section({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3 border-b border-line px-4 py-4 last:border-b-0", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
/** A slider's drag (or a run of its keys) is one step for Ångra. */
function OneStep({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  const start = () => {
    if (disabled) return;
    draftActions.begin();
    window.addEventListener("pointerup", () => draftActions.end(), { once: true });
  };
  return (
    <div onPointerDownCapture={start} onKeyDownCapture={() => !disabled && draftActions.begin()} onKeyUpCapture={() => draftActions.end()} onBlurCapture={() => draftActions.end()}>
      {children}
    </div>
  );
}
const swatch = (colour: string) => <span aria-hidden className="inline-block size-2.5 rounded-[2px] border border-black/30" style={{ background: colour }} />;
const SIDES = [
  { value: "BACK" as const, label: "Stängt", icon: swatch(CARD_COLOUR.BACK) },
  { value: "FRONT" as const, label: "Öppet", icon: swatch(CARD_COLOUR.FRONT) },
];

// ── Bordets perspektiv ──
// One number for the whole plan, and only the cards' shape (src/card-plan.ts planShape; Jakob 2026-11-17: "Om alla kort är
// exakt lika stora, blir de väldigt tvådimensionella", and 2026-11-18 when a lens also shrank the dealer's cards: "Kortet i
// skon är större än korten som ligger närmare oss"): how much narrower a card's far edge is drawn, as the share at seat 4,
// from a real card's own 96 % down to 80 %. Every card keeps its real size and place. "Din plan" is seat 4's own stored
// taper (87 % since 11 Nov), which the plan draws with when no value is saved. The game and an order's last picture draw
// with it; the doll's 3D picture always shows a real card.
const percent = (v: number) => `${Math.round(v * 100)} %`;
function TableDepth({ plan, off }: { plan: PlacementPlan; off: boolean }) {
  const value = planTaper(plan);
  const span = TABLE_PERSPECTIVE.max - TABLE_PERSPECTIVE.min;
  const own = planTaper({ targets: plan.targets, tableProjection: undefined });
  const marks = [
    { value: own, label: "Din plan", set: null },
    { value: TABLE_PERSPECTIVE.max, label: "Riktigt kort", set: TABLE_PERSPECTIVE.max },
  ];
  return (
    <div className="flex flex-col gap-1.5">
      <OneStep disabled={off}>
        <Slider label="Bordets perspektiv" value={value} min={TABLE_PERSPECTIVE.min} max={TABLE_PERSPECTIVE.max} step={TABLE_PERSPECTIVE.step} format={percent} disabled={off} onChange={(v) => draftActions.move((p) => setTablePerspective(p, v))} />
      </OneStep>
      <div aria-hidden className="relative mx-[7px] -mt-1 h-1.5">
        {marks.map((m) => (
          <span key={m.label} className="absolute top-0 h-1.5 w-px bg-faint" style={{ left: `${((m.value - TABLE_PERSPECTIVE.min) / span) * 100}%` }} />
        ))}
      </div>
      <div className="relative mx-[7px] h-4">
        {marks.map((m) => (
          <button
            key={m.label}
            type="button"
            disabled={off}
            aria-pressed={Math.abs(value - m.value) < 0.005}
            onClick={() => draftActions.edit((p) => setTablePerspective(p, m.set))}
            // under its tick: the real card's at the right end, ending there; the others starting just left of theirs
            style={m.value >= TABLE_PERSPECTIVE.max ? { right: "-7px" } : { left: `calc(${((m.value - TABLE_PERSPECTIVE.min) / span) * 100}% - 0.75rem)` }}
            className="absolute top-0 whitespace-nowrap rounded-sm px-1 text-2xs text-dim underline decoration-dotted underline-offset-2 hover:text-ink disabled:opacity-45 aria-pressed:text-ink aria-pressed:no-underline"
          >
            {`${m.label} ${percent(m.value)}`}
          </button>
        ))}
      </div>
      <p className="text-xs leading-5 text-dim">Ändrar kortens form i spelet och i en beställnings sista bild. Dockans bild visar alltid ett riktigt kort.</p>
    </div>
  );
}

// ── Step 1: the place ──
export function PlacePanel({ plan, id, editable }: { plan: PlacementPlan; id: Place; editable: boolean }) {
  const view = PLAN_VIEW;
  const [snap, setSnap] = useState("10");
  const off = !editable;
  const edit = (fn: (p: PlacementPlan) => PlacementPlan) => draftActions.edit(fn);
  const point = id === SHOE ? plan.shoe[view] : plan.targets[id].geometry[view];
  return (
    <>
      <Section title="Läge">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Från vänster" unit="%" value={point.u * 100} digits={2} min={0} max={100} step={0.1} disabled={off} onCommit={(n) => edit((p) => editPlace(p, id, view, { u: n / 100 }))} />
          <NumberField label="Från botten" unit="%" value={point.v * 100} digits={2} min={0} max={100} step={0.1} disabled={off} onCommit={(n) => edit((p) => editPlace(p, id, view, { v: n / 100 }))} />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Select label="Snäpp till" size="sm" value={snap} onChange={setSnap} options={[5, 10, 20].map((n) => ({ value: String(n), label: `${n} px` }))} className="w-24 shrink-0" disabled={off} />
          <Button size="sm" icon={<Grid2x2 />} disabled={off} onClick={() => edit((p) => snapPlace(p, id, view, Number(snap)))}>
            Snäpp
          </Button>
          <Button size="sm" variant="quiet" icon={<RotateCcw />} disabled={off} onClick={() => edit((p) => resetPlace(p, id, view))} title="Platsen tillbaka till startförslaget" className="ml-auto">
            Startförslag
          </Button>
        </div>
        {id === SHOE ? null : <p className="text-xs leading-5 text-dim">Dra kortet på bordet i bilden, eller flytta det med piltangenterna (Skift: tio steg).</p>}
      </Section>
      {id === SHOE ? null : (
        <Section title="Kontroll">
          <Switch checked={plan.targets[id].geometry[view].reviewed} disabled={off} onChange={(reviewed) => edit((p) => editPlace(p, id, view, { reviewed }))} label="Kontrollerad" />
        </Section>
      )}
    </>
  );
}

// ── Step 2: the way there ──
/**
 * What the plan steers of the card's way: the side it lies with ("Kortet ligger", the plan's endSide: the doll lays it so,
 * and an order's text says it). Everything else the anchor the card goes from (`anchor`, the guide tree's: lib/bordet.ts
 * treeAnchor) decides, and Kortbanan shows the card's way from that anchor. The doll's picture and its own controls (how it
 * moves, lands and turns, under this panel) show the motion; step 3 says what an order sends.
 */
export function MotionPanel({ plan, id, editable, anchor }: { plan: PlacementPlan; id: Place; editable: boolean; anchor: Exclude<Anchor, "1"> }) {
  if (id === SHOE) return null;
  const intent = plan.targets[id].intent;
  const way = motionSteps(id, intent, anchor);
  return (
    <Section title="Det som styr">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-dim">Kortet ligger</span>
        <SegmentedControl size="sm" label="Kortet ligger" value={intent.endSide} disabled={!editable} onChange={(s) => draftActions.edit((p) => editIntent(p, id, "endSide", s))} options={SIDES} />
      </div>
      {/* the card's way from the anchor; "Spela kortbanan" plays the doll's deal to the card */}
      <ol className="flex flex-wrap items-center gap-1" aria-label="Kortbanan">
        {way.steps.map((s, n) => (
          <li key={s.id} className="flex items-center gap-1">
            {n ? <span aria-hidden className="text-faint">→</span> : null}
            <span data-step={s.id} className="flex flex-col rounded-md border border-line-strong bg-raised px-2 py-1 leading-tight">
              <b className="text-xs font-semibold text-brass-hi">{s.label}</b>
              <span className="text-2xs text-dim">{s.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ── Hela bordet: what holds for every card ──
export function TablePanel({ plan, editable }: { plan: PlacementPlan; editable: boolean }) {
  const checked = TARGETS.filter((t) => plan.targets[t].geometry[PLAN_VIEW].reviewed).length;
  return (
    <Section title="Bordet" aside={<span className="text-xs text-faint">{`${checked} av ${TARGETS.length} kontrollerade`}</span>}>
      <TableDepth plan={plan} off={!editable} />
    </Section>
  );
}
