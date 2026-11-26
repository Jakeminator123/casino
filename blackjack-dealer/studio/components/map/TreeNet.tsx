"use client";

// Karta's net (?trad=alla; Jakob 2026-11-26: "alla nodträd i en samma typ av vy där man t.ex. kan se en A1, men sedan
// förgreningar till olika kanske A2.1, A2.2 och A2.3, så att liksom alla olika läggs på varandra i ett smart nät"). Every tree
// of the dealer at once, read on one sheet:
//   A1        each tree's A1 (its hands) with what every way of it shares there: the rest, her talk, the hole card
//   the fork  A1 branches to A2.1, A2.2 and A2.3; under each, one column per tree (or way) that deals from it, with its picture
//   the steps one row per step from the shoe (entry, each card's deal and return, exit) across every column, so that what one
//             tree has and another lacks is side by side
// A dot is a step: its verdict's colour where a film is, dashed grey where one waits, a red ring where none is, an amber ring
// where the film's file is not on this machine. A click opens that tree with the step (its films, or what an order of it
// lacks). An anchor at the shoe that only stands in for some steps of its tree (the Casino's A2.2, src/dealer-trees.ts
// otherSteps) is a column of its own, marked as such. "Bara där de skiljer sig" keeps the rows where the columns differ;
// Sök finds a film by its name or id and lights its steps. Sätt ihop: mark two or more columns and open a new composition of
// them (CompositionKarta, ?komposition=ny&med=<ids>). Colours per tree are the compositions' (CompositionKarta TREE_COLORS).
import { Combine, Network, Search, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { MEASURE_CARDS, nodeCode, waysOf, type TreeAnswer, type TreeStep, type TreeView } from "../../../src/dealer-trees.ts";
import { BankStatus, Page } from "@/components/shell";
import { Button, Switch, cn } from "@/components/ui";
import { useBank } from "@/lib/bank";
import type { EntryAnswer } from "@/lib/media";
import { takeName } from "@/lib/names";
import { talkOf, talkWord } from "@/lib/tree-talk";
import { VERDICT_LABEL } from "@/lib/verdict";
import { coverOfEntry } from "../material/Tile";
import { ProofStill } from "../proofs";
import { LINE } from "./EdgeChip";
import { STEP_LINE } from "./TreeCanvas";
import { NEW_COMPOSITION, TreeRow } from "./TreeRow";
import { useCompositions } from "./useCompositions";
import { useMedia } from "./useOlder";

/** The compositions' colours, by the order of the trees a composition can take (CompositionKarta). */
export const TREE_COLORS = ["#d9b96a", "#7f9cf5", "#4fb27f", "#e39b5b"];
const HUBS = ["READY", "READY-B", "READY-C"];
const SHOE_WORD: Record<string, string> = { READY: "nyp", "READY-B": "släp", "READY-C": "två händer" };
const STATE_WORD: Record<string, string> = { spelas: "spelas", byggs: "byggs", vilar: "vilar" };

type Set = (patch: Record<string, string | null>) => void;
/** A column: one tree (or way) dealing from one anchor at the shoe. helper: an anchor that only stands in for some of its tree's steps. */
type Column = { key: string; view: TreeView; hub: string; helper: boolean; steps: TreeStep[]; color: string; picture: string | null };
type Row = { key: string; label: string; kind: "ingang" | "kort" | "utgang"; card: string | null };

const ROWS: Row[] = [
  { key: "ingang", label: "Ingång", kind: "ingang", card: null },
  ...MEASURE_CARDS.map((c): Row => ({ key: c, label: c.startsWith("D.") ? `Dealern kort ${c.slice(3)}` : `${c.slice(0, 2)} kort ${c.slice(4)}`, kind: "kort", card: c })),
  { key: "utgang", label: "Utgång", kind: "utgang", card: null },
];

/** The steps of a row in a column: the entry or the exit, or a card's deal and return. */
function stepsOf(col: Column, row: Row): TreeStep[] {
  if (row.kind === "kort") return ["giv", "retur"].map((k) => col.steps.find((s) => s.kind === k && s.card === row.card)).filter((s): s is TreeStep => !!s);
  return col.steps.filter((s) => s.kind === row.kind);
}

const dotTitle = (col: Column, s: TreeStep) =>
  `${col.view.tree.name} · ${s.name}: ${s.state === "finns" ? `finns (${VERDICT_LABEL[s.verdict ?? "godkand"]}${s.via ? `, från ${nodeCode(s.via)}` : ""})` : s.state === "prov" ? "prov, väntar på dom" : "saknas"}${s.noFile ? "; filmen finns inte på den här datorn" : ""}`;

/** A step as a dot: the verdict's colour (finns), dashed grey (prov), a red ring (saknas); an amber ring: no file here; lit: a film found by Sök. */
function Dot({ step, title, lit, onClick }: { step: TreeStep; title: string; lit: boolean; onClick: () => void }) {
  const fill = step.state === "finns" ? LINE[step.verdict ?? "godkand"] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-full transition-transform duration-100 hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brass",
        lit && "ring-2 ring-brass ring-offset-1 ring-offset-canvas",
      )}
    >
      {fill ? (
        <span aria-hidden className={cn("size-3 rounded-full", step.noFile && "ring-[1.5px] ring-anmarkning ring-offset-1 ring-offset-canvas")} style={{ background: fill }} />
      ) : step.state === "prov" ? (
        <span aria-hidden className="size-3 rounded-full border-[1.5px] border-dashed" style={{ borderColor: STEP_LINE.prov.color }} />
      ) : (
        <span aria-hidden className="size-3 rounded-full border-[1.5px] border-dashed border-[#ef8b8b]/80" />
      )}
    </button>
  );
}

function Picture({ entry, code, className }: { entry: EntryAnswer | undefined; code: string; className?: string }) {
  const cover = entry ? coverOfEntry(entry) : null;
  return (
    <span className={cn("relative block overflow-hidden rounded-md", cover ? "border border-line-strong bg-well" : "border border-dashed border-line-strong", className)} title={entry ? `${code}: ${entry.name ?? ""}${entry.exists ? "" : " (bilden finns inte på den här datorn)"}` : code}>
      {cover ? <ProofStill cover={cover} fps={entry?.fps ?? 30} className="absolute inset-0" /> : null}
      <span className={cn("absolute left-1 top-1 rounded-xs px-1 text-[10.5px] font-semibold leading-[14px]", cover ? "bg-black/65 text-ink" : "text-dim")}>{code}</span>
    </span>
  );
}

function Chip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-raised/60 px-2 py-0.5 text-[11.5px] text-dim">
      {children}
    </span>
  );
}

export function TreeNet({ answer, set }: { answer: TreeAnswer; set: Set }) {
  const { graph, dealer, readAt } = useBank();
  const media = useMedia();
  const compositions = useCompositions(dealer, readAt).answer?.compositions;
  const [differ, setDiffer] = useState(false);
  const [query, setQuery] = useState("");
  const [marked, setMarked] = useState<string[]>([]);

  // The trees in the compositions' order, each with its colour; a tree's ways after it.
  const solo = answer.trees.filter((v) => v.home === v.tree.id);
  const colorOf = (id: string) => TREE_COLORS[Math.max(0, solo.findIndex((v) => v.tree.id === id)) % TREE_COLORS.length];
  const mains = answer.trees.filter((v) => !v.tree.wayOf && !v.tree.shares);
  const columns = useMemo<Column[]>(() => {
    const out: Column[] = [];
    for (const main of mains) {
      for (const way of waysOf(answer.trees, main.tree.id))
        out.push({ key: way.tree.id, view: way, hub: way.hub, helper: false, steps: way.steps, color: colorOf(way.tree.id), picture: way.nodes.find((n) => n.node === way.hub)?.entry ?? null });
      for (const o of main.otherSteps ?? [])
        out.push({ key: `${main.tree.id}@${o.hub}`, view: main, hub: o.hub, helper: true, steps: o.steps, color: colorOf(main.tree.id), picture: main.nodes.find((n) => n.node === o.hub)?.entry ?? null });
    }
    return out.sort((a, b) => HUBS.indexOf(a.hub) - HUBS.indexOf(b.hub));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer]);
  const groups = HUBS.map((hub) => ({ hub, cols: columns.filter((c) => c.hub === hub) })).filter((g) => g.cols.length);

  // Sök: a film by its name ("Giv A2.3 01 01") or its id; the steps that hold it are lit.
  const needle = query.trim().toLowerCase();
  const hit = useMemo(() => {
    if (!needle) return null;
    const name = (id: string) => {
      const t = graph?.takes[id];
      return `${id} ${t ? takeName(t, graph?.edge[t.edge]?.takes) : ""}`.toLowerCase();
    };
    const out = new Set<string>(), films = new Set<string>();
    for (const c of columns) for (const s of c.steps) for (const id of s.ids) if (name(id).includes(needle)) { out.add(`${c.key}|${s.id}`); films.add(id); }
    return { steps: out, films: films.size };
  }, [needle, columns, graph]);
  const lit = (c: Column, s: TreeStep) => !!hit?.steps.has(`${c.key}|${s.id}`);

  // Bara där de skiljer sig: a row where the trees' own columns do not all say the same.
  const word = (s: TreeStep | undefined) => (s ? `${s.state}${s.noFile ? "!" : ""}` : "-");
  const differs = (row: Row) => new Set(columns.filter((c) => !c.helper).map((c) => stepsOf(c, row).map(word).join(","))).size > 1;
  const rows = ROWS.filter((r) => (!differ || differs(r)) && (!hit || columns.some((c) => stepsOf(c, r).some((s) => lit(c, s)))));

  const open = (c: Column, s: TreeStep) => {
    // An anchor that only stands in opens its tree on the same card's step from the tree's own anchor.
    const step = c.helper ? c.view.steps.find((x) => x.kind === s.kind && x.card === s.card) : s;
    set({ trad: c.view.tree.id, steg: step?.id ?? null, kant: step && step.state === "finns" ? step.edge : null, tagning: null });
  };
  const toggle = (id: string) => setMarked((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  const status = (
    <TreeRow trees={answer.trees} chosen="alla" onChoose={(id) => set({ trad: id === "alla" ? "alla" : id, steg: null, kant: null, tagning: null })} compositions={compositions} onCompose={(id) => set({ komposition: id, trad: null })} />
  );
  const actions = (
    <>
      <label className="mr-2 inline-flex items-center gap-2 text-sm text-dim" title="Visa bara stegen där träden inte har samma sak">
        <Switch size="sm" checked={differ} onChange={setDiffer} aria-label="Bara där de skiljer sig" />
        Bara där de skiljer sig
      </label>
      <span className="relative mr-2 inline-flex items-center">
        <Search className="pointer-events-none absolute left-2 size-3.5 text-faint" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 60))}
          placeholder="Sök film"
          aria-label="Sök film"
          className="h-8 w-44 rounded-md border border-line-strong bg-well pl-7 pr-7 text-sm text-ink placeholder:text-faint focus:border-brass/70 focus-visible:outline-none"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Töm sökningen" className="absolute right-1.5 text-faint hover:text-ink">
            <X className="size-3.5" />
          </button>
        ) : null}
      </span>
      <Button
        variant={marked.length > 1 ? "primary" : "secondary"}
        icon={<Combine />}
        disabled={marked.length < 2}
        onClick={() => set({ trad: null, komposition: NEW_COMPOSITION, med: marked.join(",") })}
        title={marked.length < 2 ? "Markera två eller fler grenar (rutan över bilden) för att sätta ihop dem" : "Öppna en ny komposition av de markerade grenarna"}
      >
        Sätt ihop{marked.length ? ` ${marked.length}` : ""}
      </Button>
    </>
  );

  return (
    <Page title="Karta" full status={answer.trees.length ? status : <BankStatus />} actions={actions}>
      <div className="absolute inset-0 overflow-auto p-6">
        <div className="mx-auto flex w-max min-w-full flex-col gap-0">
          {/* ── A1: each tree's hands, and what all its ways share there ── */}
          <section aria-label="A1" className="flex flex-wrap items-stretch gap-3 rounded-lg border border-line bg-surface p-3">
            <span className="flex w-24 shrink-0 flex-col justify-center gap-1">
              <span className="font-display text-lg font-semibold text-ink">A1</span>
              <span className="text-xs text-dim">vila, tal och hålkort, gemensamt för trädets grenar</span>
            </span>
            {mains.map((v) => {
              const rest = v.steps.find((s) => s.kind === "vila"), hole = v.steps.find((s) => s.kind === "halkort"), talk = talkOf(v), a1 = v.nodes.find((n) => n.node === "IDLE")?.entry;
              const opening = v.tree.opening ? (media.get(v.tree.opening)?.name ?? "filmen före spelet") : null;
              return (
                <div key={v.tree.id} className="flex items-center gap-3 rounded-md border border-line bg-raised/40 p-2 pr-3">
                  <Picture entry={a1 ? media.get(a1) : undefined} code="A1" className="h-[60px] w-[90px] shrink-0" />
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(v.tree.id) }} />
                      {v.tree.name}
                      <span className="text-xs font-normal text-faint">{STATE_WORD[v.tree.state]}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {rest ? (
                        <Chip>
                          vila <Dot step={rest} title={dotTitle({ key: v.tree.id, view: v, hub: "IDLE", helper: false, steps: v.steps, color: "", picture: null }, rest)} lit={false} onClick={() => set({ trad: v.tree.id, steg: rest.id, kant: rest.state === "finns" ? rest.edge : null })} />
                        </Chip>
                      ) : null}
                      {talk ? (
                        <Chip title={`Tal: ${talk.have} av ${talk.total} repliker har en talfilm här på datorn${talk.noFile ? ` (${talk.noFile} till finns bara på den andra datorn)` : ""}`}>
                          tal <span className={cn("tabular-nums", talk.have ? "text-ink" : "text-[#ef8b8b]")}>{talkWord(talk)}</span>
                        </Chip>
                      ) : null}
                      {hole ? (
                        <Chip>
                          hålkort <Dot step={hole} title={dotTitle({ key: v.tree.id, view: v, hub: "IDLE", helper: false, steps: v.steps, color: "", picture: null }, hole)} lit={false} onClick={() => set({ trad: v.tree.id, steg: hole.id, kant: hole.state === "finns" ? hole.edge : null })} />
                        </Chip>
                      ) : null}
                      {opening ? <Chip title="Rundan kan börja med filmen före spelet, som slutar på trädets A1">början: {opening}</Chip> : null}
                    </span>
                  </span>
                </div>
              );
            })}
          </section>

          {/* ── the fork: A1 branches to the anchors at the shoe ── */}
          <div aria-hidden className="ml-12 h-5 w-px bg-line-strong" />
          <div className="grid items-start" style={{ gridTemplateColumns: `112px ${groups.map((g) => `repeat(${g.cols.length}, minmax(124px, 140px))`).join(" 16px ")}` }}>
            {/* branch headings */}
            <span />
            {groups.map((g, gi) => (
              <div key={g.hub} className="contents">
                {gi ? <span /> : null}
                <div className="flex items-center gap-2 border-t border-line-strong pb-2 pt-2" style={{ gridColumn: `span ${g.cols.length}` }}>
                  <Network className="size-3.5 text-faint" aria-hidden />
                  <span className="font-display text-base font-semibold text-ink">{nodeCode(g.hub)}</span>
                  <span className="text-xs text-dim">{SHOE_WORD[g.hub]}</span>
                </div>
              </div>
            ))}
            {/* columns: picture, tree, number */}
            <span />
            {groups.map((g, gi) => (
              <div key={g.hub} className="contents">
                {gi ? <span /> : null}
                {g.cols.map((c) => {
                  const on = marked.includes(c.view.tree.id);
                  return (
                    <div key={c.key} className={cn("flex flex-col gap-1.5 rounded-t-md border-x border-t px-2 pb-2 pt-2", on ? "border-brass/70 bg-brass/5" : "border-line bg-surface")}>
                      <span className="relative">
                        <Picture entry={c.picture ? media.get(c.picture) : undefined} code={nodeCode(c.hub)} className="aspect-3/2 w-full" />
                        {!c.helper ? (
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(c.view.tree.id)}
                            aria-label={`Markera ${c.view.tree.name} för att sätta ihop`}
                            title="Markera för att sätta ihop till en komposition"
                            className="absolute right-1 top-1 size-4 cursor-pointer accent-[#d9b96a]"
                          />
                        ) : null}
                      </span>
                      <button type="button" onClick={() => set({ trad: c.view.tree.id, steg: null, kant: null })} className="flex items-center gap-1.5 text-left text-[12.5px] font-medium text-ink hover:underline" title={`Öppna ${c.view.tree.name}`}>
                        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                        <span className="truncate">{c.view.tree.name}</span>
                      </button>
                      <span className="text-[11px] tabular-nums text-faint">
                        {c.helper ? `ger ${[...new Set(c.view.steps.filter((s) => s.via === c.hub).map((s) => nodeCode(s.card ?? s.to)))].join(", ") || "inget steg"} i ${c.view.tree.name}` : `${c.view.count.have}/${c.view.count.total} · ${STATE_WORD[c.view.tree.state]}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
            {/* the steps */}
            {rows.map((row, ri) => (
              <div key={row.key} className="contents">
                <span className={cn("flex h-8 items-center pr-2 text-xs", row.kind === "kort" ? "text-dim" : "font-medium text-ink", row.card?.endsWith("C1") && ri > 1 && "border-t border-line/60")}>{row.label}</span>
                {groups.map((g, gi) => (
                  <div key={g.hub} className="contents">
                    {gi ? <span /> : null}
                    {g.cols.map((c) => {
                      const steps = stepsOf(c, row);
                      const on = marked.includes(c.view.tree.id);
                      return (
                        <span key={c.key} className={cn("flex h-8 items-center justify-center gap-1.5 border-x", on ? "border-brass/70 bg-brass/5" : "border-line bg-surface", row.card?.endsWith("C1") && ri > 1 && "border-t border-t-line/60")}>
                          {steps.map((s) => (
                            <Dot key={s.id} step={s} title={dotTitle(c, s)} lit={lit(c, s)} onClick={() => open(c, s)} />
                          ))}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
            {/* the columns' feet */}
            <span />
            {groups.map((g, gi) => (
              <div key={g.hub} className="contents">
                {gi ? <span /> : null}
                {g.cols.map((c) => (
                  <span key={c.key} className={cn("h-2 rounded-b-md border-x border-b", marked.includes(c.view.tree.id) ? "border-brass/70 bg-brass/5" : "border-line bg-surface")} />
                ))}
              </div>
            ))}
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ background: LINE.primar }} /> Primär</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ background: LINE.godkand }} /> Godkänd</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ background: LINE.variant }} /> Variant</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full border-[1.5px] border-dashed" style={{ borderColor: STEP_LINE.prov.color }} /> prov</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full border-[1.5px] border-dashed border-[#ef8b8b]/80" /> saknas</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full ring-[1.5px] ring-anmarkning ring-offset-1 ring-offset-canvas" style={{ background: LINE.godkand }} /> filmen finns inte på den här datorn</span>
            <span>Vid ett kort: giv till vänster, retur till höger. Klicka en prick för att öppna steget.</span>
            {hit ? <span className="text-ink">Sök: {hit.films} {hit.films === 1 ? "film" : "filmer"} i {hit.steps.size} steg</span> : null}
            {differ && !rows.length ? <span className="text-ink">Träden har samma sak i varje steg.</span> : null}
          </p>
        </div>
      </div>
    </Page>
  );
}
