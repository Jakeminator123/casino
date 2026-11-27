"use client";

// Karta, Schemat (?vy=schema): the dolls' motion scheme, from GET /api/schema (tools/schema-routes.ts, which reads
// ../standarddocka/rorelsekatalog.json, the live film's segments and the files on disk each time). For the chosen doll (the
// standard table's: Danilo, Frasse), first a round as a path, with what is missing in red and Dockan playing the whole round;
// then the card places as a grid and seen from above; then the whole scheme as a picture, with the stages as a row over it
// and what she lacks shown only on "Visa det som saknas". A click on a motion opens its box (MotionSheet), on an anchor the
// anchor's. What is chosen lives in the address (?docka=…&stadium=…&rorelse=…&ankare=…&saknas=1). The page shows, it does
// not explain (blackjack-dealer/AGENTS.md): the words are in the glossary. Nothing here writes.
import { ArrowDown, ArrowRight, Play, RotateCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Page } from "../shell";
import { Button, ErrorState, Panel, SegmentedControl, Skeleton, buttonClasses, cn } from "../ui";
import { AnchorSheet, MotionSheet } from "./MotionSheet";
import { PlatsGrid, cellsOf } from "./PlatsGrid";
import { SchemaGraph, drawn } from "./SchemaGraph";
import { SchemaSwitch } from "./SchemaSwitch";
import { SLAG_ORD, getSchema, platsAv, type Schema } from "@/lib/schemat";

function useAddress() {
  const params = useSearchParams();
  const set = useCallback((patch: Record<string, string | null>) => {
    const p = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value) p.set(key, value);
      else p.delete(key);
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${p}`);
  }, []);
  return { params, set };
}

export function SchemaView() {
  const { params, set } = useAddress();
  const [schema, setSchema] = useState<Schema | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    let live = true;
    setError(null);
    getSchema()
      .then((s) => {
        if (live) setSchema(s);
      })
      .catch((e: Error) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [round]);

  const docka = schema ? (schema.dockor.find((d) => d.id === params.get("docka")) ?? schema.dockor[0] ?? null) : null;
  const stadium = schema?.stadier.find((s) => s.id === params.get("stadium"))?.id ?? null;
  const rorelse = params.get("rorelse");
  const ankare = params.get("ankare");
  const missing = params.get("saknas") === "1";
  const pick = useCallback((id: string) => set({ rorelse: id, ankare: null }), [set]);
  const pickAnchor = useCallback((id: string) => set({ ankare: id, rorelse: null }), [set]);
  const cells = useMemo(() => (schema && docka ? cellsOf(schema, docka) : null), [schema, docka]);
  const filled = cells ? [...cells.values()].filter((c) => c.slag.length).length : 0;

  return (
    <Page
      title="Karta"
      status={<SchemaSwitch value="schema" />}
      actions={
        <Button size="sm" variant="quiet" icon={<RotateCw />} onClick={() => setRound((n) => n + 1)} title="Läs om" aria-label="Läs om">
          <span className="hidden sm:inline">Läs om</span>
        </Button>
      }
    >
      {error ? (
        <ErrorState title="Schemat kunde inte läsas" error={error} onRetry={() => setRound((n) => n + 1)} />
      ) : !schema || !docka ? (
        <Skeleton className="h-[520px] w-full" />
      ) : (
        <div className="space-y-5">
          <SegmentedControl label="Docka" value={docka.id} onChange={(v) => set({ docka: v })} options={schema.dockor.map((d) => ({ value: d.id, label: d.namn }))} />

          {schema.runda ? <RoundPath schema={schema} docka={docka.id} onPick={pick} onAnchor={pickAnchor} /> : null}

          <Panel title="Kortplatserna" actions={<span className="text-sm text-dim tabular-nums">{filled} av {docka.platser.length}</span>}>
            <PlatsGrid schema={schema} docka={docka} cells={cells!} onPick={(id) => pick(id)} />
          </Panel>

          <Panel
            title="Schemat"
            flush
            actions={
              <Button size="sm" variant={missing ? "primary" : "secondary"} aria-pressed={missing} onClick={() => set({ saknas: missing ? null : "1" })}>
                {missing ? "Dölj det som saknas" : "Visa det som saknas"}
              </Button>
            }
          >
            <div className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-3">
              {schema.stadier.map((s) => {
                const on = s.id === stadium, has = s.rorelser.filter((r) => drawn(schema, docka.id, r).has).length;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ stadium: on ? null : s.id })}
                    title={s.nar}
                    className={cn(
                      "flex shrink-0 items-baseline gap-2 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                      on ? "border-brass bg-brass/12 text-brass-hi" : "border-line-strong bg-surface text-ink hover:border-line-hi hover:bg-raised",
                    )}
                  >
                    {s.namn}
                    <span className={cn("text-xs tabular-nums", has ? "text-[#7fd3a5]" : "text-faint")}>
                      {has} av {s.rorelser.length}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="overflow-x-auto p-3">
              <SchemaGraph schema={schema} docka={docka.id} stadium={stadium} chosen={rorelse} missing={missing} onPick={pick} onAnchor={pickAnchor} />
            </div>
          </Panel>
        </div>
      )}
      {schema && docka ? (
        <>
          <MotionSheet schema={schema} id={rorelse} onClose={() => set({ rorelse: null })} onAnchor={pickAnchor} />
          <AnchorSheet schema={schema} id={ankare} docka={docka.id} onClose={() => set({ ankare: null })} onPick={pick} />
        </>
      ) : null}
    </Page>
  );
}

/** A round as a path through the scheme for the doll: the anchors, and the motions between them, what is missing in red. */
function RoundPath({ schema, docka, onPick, onAnchor }: { schema: Schema; docka: string; onPick: (id: string) => void; onAnchor: (id: string) => void }) {
  const runda = schema.runda!;
  const play = runda.sekvens[docka];
  const step = (i: number) => {
    const id = runda.rorelser[i], r = id ? schema.rorelser.find((x) => x.id === id) ?? null : null;
    const a = runda.steg[i].kod, b = runda.steg[i + 1].kod, place = platsAv(b) ?? platsAv(a);
    const mine = r ? schema.poster.filter((p) => p.docka === docka && p.rorelse === r.id && (!place || p.plats === place)) : [];
    return { r, word: mine.length ? [...new Set(mine.map((p) => SLAG_ORD[p.slag].kort))].join(", ") : "saknas", has: mine.length > 0 };
  };
  return (
    <Panel
      title="En runda"
      actions={
        play ? (
          <Link href={play} className={buttonClasses({ variant: "primary", size: "sm" })}>
            <Play className="size-4" />
            Spela i Dockan
          </Link>
        ) : null
      }
    >
      <ol className="flex flex-col items-stretch gap-2 md:flex-row md:items-stretch">
        {runda.steg.map((s, i) => {
          const a = schema.ankare.find((x) => x.id === s.ankare);
          const st = i < runda.rorelser.length ? step(i) : null;
          return (
            <Fragment key={i}>
              <li className="md:flex-1">
                <button
                  type="button"
                  onClick={() => s.ankare && onAnchor(s.ankare)}
                  className="flex h-full w-full flex-col justify-center rounded-lg border border-line-hi bg-raised px-3 py-2.5 text-left hover:border-brass md:min-h-20"
                >
                  <span className="text-xs text-faint tabular-nums">{s.kod}</span>
                  <span className="text-md leading-snug font-semibold text-ink">{a?.namn ?? s.kod}</span>
                </button>
              </li>
              {st ? (
                <li className="md:flex-1">
                  <button
                    type="button"
                    disabled={!st.r}
                    onClick={() => st.r && onPick(st.r.id)}
                    className={cn(
                      "flex h-full w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors md:flex-col md:items-start md:justify-center",
                      st.has ? "border-godkand/50 bg-godkand/12 hover:bg-godkand/20" : "border-underkand/70 bg-underkand/12 hover:bg-underkand/20",
                    )}
                  >
                    <ArrowDown aria-hidden className={cn("size-4 shrink-0 md:hidden", st.has ? "text-[#7fd3a5]" : "text-[#ef8b8b]")} />
                    <ArrowRight aria-hidden className={cn("hidden size-4 shrink-0 md:block", st.has ? "text-[#7fd3a5]" : "text-[#ef8b8b]")} />
                    <span className="min-w-0 flex-1 text-sm leading-snug text-ink md:flex-none">{st.r?.namn ?? "Ingen rörelse"}</span>
                    <span className={cn("text-xs font-semibold", st.has ? "text-[#7fd3a5]" : "text-[#ef8b8b]")}>{st.word}</span>
                  </button>
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </Panel>
  );
}
