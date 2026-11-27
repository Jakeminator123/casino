"use client";

// Karta, Schemat (?vy=schema): the dolls' motion scheme on one screen, from GET /api/schema (tools/schema-routes.ts, which reads
// ../standarddocka/rorelsekatalog.json, the live film's segments and the files on disk each time). The picture (SchemaGraph:
// the anchors left to right in the order a round goes, the motions as arrows with their status in the line), the stages as a
// row of buttons over it (a click lifts the stage's home and motions), the doll to show (Danilo, Frasse, the man, the woman,
// and the older dealer with films in her tree: what each has per motion), the card places as a grid (PlatsGrid), a round as a
// path, the bridges and what is not copied, and what the catalogue says that the files do not. A click on a motion opens its
// box (MotionSheet), on an anchor the anchor's. What is chosen lives in the address (?docka=…&stadium=…&rorelse=…&ankare=…).
// The trees with Paow's films stay beside it (?vy=trad, SchemaSwitch). Nothing here writes.
import { RotateCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Page } from "../shell";
import { Badge, Button, ErrorState, Panel, SegmentedControl, Skeleton, cn } from "../ui";
import { AnchorSheet, MotionSheet } from "./MotionSheet";
import { PlatsGrid } from "./PlatsGrid";
import { EDGE_STYLE, SchemaGraph, SchemaLegend } from "./SchemaGraph";
import { SchemaSwitch } from "./SchemaSwitch";
import { STATUS_ORD, SLAG_ORD, finnsFor, getSchema, platsAv, stadietsTal, type Schema } from "@/lib/schemat";

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
      .then((s) => live && setSchema(s))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [round]);

  const dockaId = params.get("docka");
  const docka = schema?.dockor.find((d) => d.id === dockaId) ?? null;
  const stadium = schema?.stadier.find((s) => s.id === params.get("stadium"))?.id ?? null;
  const rorelse = params.get("rorelse");
  const ankare = params.get("ankare");
  const kortplats = params.get("kortplats");
  const pick = useCallback((id: string, plats: string | null = null) => set({ rorelse: id, kortplats: plats, ankare: null }), [set]);
  const pickAnchor = useCallback((id: string) => set({ ankare: id, rorelse: null, kortplats: null }), [set]);

  const counts = useMemo(() => {
    if (!schema) return null;
    const by = (s: string) => schema.rorelser.filter((r) => r.status === s).length;
    return { finns: by("finns"), delvis: by("delvis"), saknas: by("saknas"), forslag: by("förslag"), alla: schema.rorelser.length };
  }, [schema]);

  return (
    <Page
      title="Karta"
      status={
        <>
          <SchemaSwitch value="schema" />
          {counts ? (
            <span className="hidden truncate tabular-nums md:inline">
              {counts.alla} rörelser: {counts.finns} finns, {counts.delvis} delvis, {counts.saknas} saknas, {counts.forslag} förslag
            </span>
          ) : null}
        </>
      }
      actions={
        <Button size="sm" variant="quiet" icon={<RotateCw />} onClick={() => setRound((n) => n + 1)} title="Läs schemat och filerna igen" aria-label="Läs om">
          <span className="hidden sm:inline">Läs om</span>
        </Button>
      }
    >
      {error ? (
        <ErrorState title="Schemat kunde inte läsas" error={error} onRetry={() => setRound((n) => n + 1)} />
      ) : !schema ? (
        <Skeleton className="h-[520px] w-full" />
      ) : (
        <div className="space-y-5">
          {/* The doll and the stages. */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="w-16 shrink-0 text-xs font-medium text-faint">Docka</span>
              <div className="max-w-full overflow-x-auto">
                <SegmentedControl
                  label="Docka"
                  value={docka?.id ?? ""}
                  onChange={(v) => set({ docka: v || null, kortplats: null })}
                  options={[
                    { value: "", label: "Ingen", title: "Bara katalogens status" },
                    ...schema.dockor.map((d) => ({
                      value: d.id,
                      label: d.slag === "dealer" ? `${d.namn} (filmer)` : d.namn,
                      title: d.slag === "dealer" ? `${d.namn}: den äldre dealern, med filmer i sitt träd, vid ${d.bord}` : `${d.namn} vid ${d.bord}`,
                    })),
                  ]}
                />
              </div>
              {docka ? <span className="text-xs text-dim">{docka.slag === "dealer" ? `den äldre dealern: filmerna i hennes träd, vid ${docka.bord}` : `vid ${docka.bord}`}</span> : null}
            </div>
            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
              <span className="w-16 shrink-0 pt-2 text-xs font-medium text-faint">Stadium</span>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {schema.stadier.map((s) => {
                  const t = stadietsTal(schema, s.rorelser), on = s.id === stadium;
                  const doll = docka ? s.rorelser.filter((r) => finnsFor(schema, docka.id, r).poster.length).length : null;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ stadium: on ? null : s.id })}
                      title={`${s.namn}: ${s.nar}`}
                      className={cn(
                        "flex flex-col items-start rounded-md border px-2.5 py-1.5 text-left transition-colors",
                        on ? "border-brass bg-brass/12" : "border-line-strong bg-surface hover:border-line-hi hover:bg-raised",
                      )}
                    >
                      <span className={cn("text-sm font-medium", on ? "text-brass-hi" : "text-ink")}>
                        {s.namn} <span className="text-2xs font-normal text-faint">{s.id}</span>
                      </span>
                      <span className="text-2xs text-dim tabular-nums">
                        {t.finns} av {t.alla} finns{t.delvis ? `, ${t.delvis} delvis` : ""}
                        {doll !== null ? <span className={doll ? "text-[#7fd3a5]" : "text-faint"}> · {docka!.namn} {doll}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {stadium ? <StageLine schema={schema} id={stadium} onAnchor={pickAnchor} /> : null}
          </div>

          {/* The picture. */}
          <section className="rounded-lg border border-line bg-canvas">
            <div className="overflow-x-auto">
              <SchemaGraph schema={schema} docka={docka?.id ?? null} stadium={stadium} chosen={rorelse} onPick={(id) => pick(id)} onAnchor={pickAnchor} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line px-4 py-2.5">
              <SchemaLegend docka={docka?.id ?? null} />
              <span className="text-xs text-faint">Rutorna är ankarena, pilarna rörelserna. Klicka en pil för rörelsen, en ruta för ankaret.</span>
            </div>
            {docka && docka.slag === "dealer" ? <Outside schema={schema} docka={docka.id} /> : null}
          </section>

          {/* The card places. */}
          <Panel title="Kortet hos en spelare och hos dealern">
            <p className="mb-3 text-xs text-dim">
              {docka ? `Var ${docka.namn} har en giv: varje kortplats vid ${docka.bord}, plats för plats och kort för kort. Klicka en ruta för given dit.` : "Välj en docka för att se vilka platser och kort som har en giv."}
            </p>
            {docka ? (
              <PlatsGrid schema={schema} docka={docka} onPick={(id, plats) => pick(id, plats)} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {schema.dockor.map((d) => (
                  <Button key={d.id} size="sm" variant="secondary" onClick={() => set({ docka: d.id })}>
                    {d.namn}
                  </Button>
                ))}
              </div>
            )}
          </Panel>

          {/* A round as a path. */}
          {schema.runda ? <RoundPath schema={schema} docka={docka?.id ?? null} onPick={pick} onAnchor={pickAnchor} /> : null}

          {/* The bridges and what is not copied. */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Bryggorna">
              {schema.begrepp.brygga ? <p className="mb-3 text-xs text-dim">{schema.begrepp.brygga}</p> : null}
              <ul className="divide-y divide-line">
                {schema.bryggor.map((b) => (
                  <li key={b.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="text-sm font-medium text-ink">
                      {b.namn} <span className="text-2xs font-normal text-faint">{b.id}</span>
                    </div>
                    <p className="text-sm text-soft">{b.vad}</p>
                    <p className="text-xs text-dim">{b.regel}</p>
                    <FilmShort tal={b.segment ? schema.filmen[b.segment] : undefined} />
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Det som inte härmas">
              {schema.begrepp.harmas_inte ? <p className="mb-3 text-xs text-dim">{schema.begrepp.harmas_inte}</p> : null}
              <ul className="divide-y divide-line">
                {schema.harmasInte.map((h) => (
                  <li key={h.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="text-sm font-medium text-ink">
                      {h.namn} <span className="text-2xs font-normal text-faint">{h.id}</span>
                    </div>
                    <p className="text-sm text-soft">{h.vad}</p>
                    <FilmShort tal={h.segment ? schema.filmen[h.segment] : undefined} />
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <Mismatch schema={schema} />
        </div>
      )}
      {schema ? (
        <>
          <MotionSheet schema={schema} id={rorelse} plats={kortplats} onClose={() => set({ rorelse: null, kortplats: null })} onAnchor={pickAnchor} />
          <AnchorSheet schema={schema} id={ankare} onClose={() => set({ ankare: null })} onPick={(id) => pick(id)} />
        </>
      ) : null}
    </Page>
  );
}

/** The chosen stage in a line: when it is played and its home. */
function StageLine({ schema, id, onAnchor }: { schema: Schema; id: string; onAnchor: (id: string) => void }) {
  const s = schema.stadier.find((x) => x.id === id)!;
  const home = schema.ankare.find((a) => a.id === s.hem);
  return (
    <p className="pl-[76px] text-sm text-dim">
      <span className="text-brass-hi">{s.namn}</span>: {s.nar}. Hem:{" "}
      <button type="button" className="text-ink hover:underline" onClick={() => onAnchor(s.hem)}>
        {home?.namn ?? s.hem} <span className="text-xs text-faint">{s.hem}</span>
      </button>
      .
    </p>
  );
}

/** The film's numbers in one line per dealer (the bridges, what is not copied). */
function FilmShort({ tal }: { tal: Schema["filmen"][string] | undefined }) {
  if (!tal?.length) return null;
  const line = (t: (typeof tal)[number]) =>
    t.rader
      .map((r) => `${r.vad === "gånger" ? `${r.antal} ${r.antal === 1 ? "gång" : "gånger"}` : r.vad === "i de bästa styckena" ? `${r.antal} stycken` : `${r.vad} ${r.antal}`}${r.median !== null ? `, oftast ${r.median.toLocaleString("sv-SE")} s` : ""}`)
      .join("; ") || "inte i filmen";
  return (
    <p className="mt-1 text-xs text-faint">
      I filmen: {tal.map((t) => `${t.namn} ${line(t)}`).join(" · ")}
    </p>
  );
}

/** The older dealer's films that no motion of the scheme is. */
function Outside({ schema, docka }: { schema: Schema; docka: string }) {
  const rows = schema.utanforSchemat.filter((u) => u.docka === docka);
  if (!rows.length) return null;
  const name = schema.dockor.find((d) => d.id === docka)?.namn ?? docka;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-line px-4 py-2.5 text-xs text-dim">
      <span className="font-medium text-soft">{name}s filmer som ingen pil i schemat är:</span>
      {rows.map((u, i) => (
        <span key={i} className="whitespace-nowrap">
          {u.fran} → {u.till} ({u.filmer} {u.filmer === 1 ? "film" : "filmer"}, {u.trad})
        </span>
      ))}
    </div>
  );
}

type StepState = { word: string; tone: "has" | "lift" | "none" | "status" };

/** A round as a path through the scheme, with the motions between the anchors and what is missing marked. */
function RoundPath({ schema, docka, onPick, onAnchor }: { schema: Schema; docka: string | null; onPick: (id: string, plats?: string | null) => void; onAnchor: (id: string) => void }) {
  const runda = schema.runda!;
  const card = runda.steg.map((s) => platsAv(s.kod)).find(Boolean) ?? null;
  const name = docka ? schema.dockor.find((d) => d.id === docka)?.namn ?? docka : null;
  // A lift of the round's card from the rest to the rest covers the way to the shoe and home in the same clip.
  const whole = docka && card ? schema.poster.some((p) => p.docka === docka && p.plats === card && p.helaVagen) : false;
  const state = (rid: string | null, i: number): StepState => {
    const r = rid ? schema.rorelser.find((x) => x.id === rid) : null;
    if (!r) return { word: "ingen rörelse", tone: "none" };
    if (!docka) return { word: STATUS_ORD[r.status].namn.toLowerCase(), tone: "status" };
    const a = runda.steg[i].kod, b = runda.steg[i + 1].kod, place = platsAv(b) ?? platsAv(a);
    const mine = schema.poster.filter((p) => p.docka === docka && p.rorelse === r.id && (!place || p.plats === place));
    if (mine.length) return { word: [...new Set(mine.map((p) => SLAG_ORD[p.slag].kort))].join(", "), tone: "has" };
    if (whole) return { word: "i lyftet", tone: "lift" };
    return { word: "saknas", tone: "none" };
  };
  return (
    <Panel title="En runda som en väg">
      <p className="mb-3 text-xs text-dim">
        <span className="text-soft tabular-nums">{runda.text}</span>: vilan, till skon, ett kort{card ? ` till ${card.startsWith("D") ? "dealern" : `plats ${card.slice(1, card.indexOf("."))}`}` : ""}, hem och vilan
        {name ? `, för ${name}` : ""}. Det som saknas är rött.
      </p>
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-max items-stretch gap-1.5">
          {runda.steg.map((s, i) => {
            const a = schema.ankare.find((x) => x.id === s.ankare);
            const rid = runda.rorelser[i];
            const r = rid ? schema.rorelser.find((x) => x.id === rid) : null;
            const st = i < runda.rorelser.length ? state(rid, i) : null;
            const missing = st?.tone === "none" || (st?.tone === "status" && (r?.status === "saknas"));
            return (
              <Fragment key={i}>
                <li>
                  <button type="button" onClick={() => s.ankare && onAnchor(s.ankare)} className="flex h-full min-w-[120px] max-w-[160px] flex-col justify-center rounded-md border border-line-hi bg-raised px-2.5 py-1.5 text-left hover:border-brass">
                    <span className="text-2xs text-faint tabular-nums">{s.kod}</span>
                    <span className="text-sm leading-tight font-medium text-ink">{a?.namn ?? s.kod}</span>
                  </button>
                </li>
                {r && st ? (
                  <li className="flex items-center">
                    <button
                      type="button"
                      onClick={() => onPick(r.id, platsAv(runda.steg[i + 1].kod) ?? platsAv(s.kod))}
                      className={cn(
                        "flex max-w-[180px] flex-col items-center rounded-md border px-2 py-1 text-center transition-colors",
                        missing ? "border-dashed border-underkand/60 bg-underkand/8" : st.tone === "lift" ? "border-dashed border-godkand/40" : st.tone === "has" ? "border-godkand/45 bg-godkand/10" : "border-line-strong",
                      )}
                      title={`${r.namn} (${r.id})`}
                    >
                      <svg width={70} height={10} aria-hidden>
                        <line x1={2} x2={62} y1={5} y2={5} stroke={EDGE_STYLE[r.status].stroke} strokeWidth={EDGE_STYLE[r.status].width} strokeDasharray={EDGE_STYLE[r.status].dash} strokeLinecap="round" opacity={EDGE_STYLE[r.status].opacity} />
                        <path d="M 62 1 L 69 5 L 62 9 z" fill={EDGE_STYLE[r.status].stroke} opacity={EDGE_STYLE[r.status].opacity} />
                      </svg>
                      <span className="text-xs leading-tight text-soft">{r.namn}</span>
                      <span className={cn("text-2xs font-medium", missing ? "text-[#ef8b8b]" : st.tone === "has" ? "text-[#7fd3a5]" : st.tone === "lift" ? "text-[#7fd3a5]/80" : "text-dim")}>
                        {st.word}
                      </span>
                    </button>
                  </li>
                ) : i < runda.rorelser.length ? (
                  <li className="flex items-center px-2 text-xs text-[#ef8b8b]">ingen rörelse</li>
                ) : null}
              </Fragment>
            );
          })}
        </ol>
      </div>
      {whole ? <p className="mt-2 text-xs text-dim">{name}s lyft går från vilan till vilan i ett klipp: vägen till skon och hem ingår i det, utan att stanna i ankarena emellan.</p> : null}
    </Panel>
  );
}

/** What the catalogue says that the files on disk do not, in a few lines (no file names). */
function Mismatch({ schema }: { schema: Schema }) {
  const said = schema.avvikelser.filter((a) => a.slag !== "fil-utanfor");
  const files = schema.avvikelser.filter((a) => a.slag === "fil-utanfor");
  const older = files.filter((f) => /Paow/.test(f.text)).length;
  if (!said.length && !files.length && !schema.fel.length) return null;
  return (
    <Panel title="Katalogen och filerna">
      <p className="mb-3 text-xs text-dim">Där schemats status och det som finns på disken inte säger samma sak.</p>
      <ul className="space-y-1.5 text-sm">
        {schema.fel.map((f, i) => (
          <li key={`f${i}`} className="flex gap-2 text-[#ef8b8b]">
            <Badge tone="bad">Fel</Badge>
            {f}
          </li>
        ))}
        {said.map((a, i) => (
          <li key={i} className="flex items-start gap-2 text-soft">
            <Badge tone={a.slag === "finns-utan-filer" ? "bad" : "remark"} className="mt-0.5">
              {a.slag === "finns-utan-filer" ? "Saknar filer" : "Finns ändå"}
            </Badge>
            <span>{a.text}</span>
          </li>
        ))}
        {files.length ? (
          <li className="flex items-start gap-2 text-dim">
            <Badge className="mt-0.5">Utanför</Badge>
            <span>
              {files.length} rörelser på disken som schemat inte nämner{older ? `, ${older} av dem den äldre dockans` : ""}.
            </span>
          </li>
        ) : null}
      </ul>
    </Panel>
  );
}


