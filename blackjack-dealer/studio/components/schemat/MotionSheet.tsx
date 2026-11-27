"use client";

// Schemat's boxes (SchemaView.tsx). A motion opened: its name, from and to, what the hands do in one line, what each doll has
// with the links that open it in Dockan, and the live film's numbers (how many times, how long) per dealer and hand. An anchor
// opened: where each hand is, the dolls that have its pose, and the motions here, from it and to it. All from /api/schema;
// nothing is written. No codes but the anchors' own (A1, A2.3), which Jakob uses.
import Link from "next/link";
import { Fragment } from "react";
import { Badge, Sheet, buttonClasses, cn, type BadgeTone } from "../ui";
import { drawn } from "./SchemaGraph";
import { SLAG_ORD, STATUS_ORD, finnsFor, platsOchKort, type Post, type Schema, type Status } from "@/lib/schemat";

export const STATUS_TONE: Record<Status, BadgeTone> = { finns: "ok", delvis: "wait", saknas: "bad", förslag: "brass" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-2xs font-semibold tracking-wide text-faint uppercase">{title}</h3>
      {children}
    </section>
  );
}

const anchorName = (schema: Schema, id: string | null) => {
  const a = id ? schema.ankare.find((x) => x.id === id) : null;
  return a ? (
    <>
      {a.namn} <span className="text-faint tabular-nums">{a.id}</span>
    </>
  ) : (
    "okänt"
  );
};

/** A link's word: "plats 4", "plats 2, kort 2", "dealern", or "öppna". */
function chipOf(p: Post): string {
  const pk = p.plats ? platsOchKort(p.plats) : null;
  if (!pk) return "öppna";
  return `${pk.plats === "D" ? "dealern" : `plats ${pk.plats}`}${pk.kort > 1 ? `, kort ${pk.kort}` : ""}`;
}

/** What one doll has of a motion: a row per kind, with a link per place. */
function DollRow({ schema, docka, rorelse }: { schema: Schema; docka: Schema["dockor"][number]; rorelse: string }) {
  const { poster, slag } = finnsFor(schema, docka.id, rorelse);
  return (
    <li className="flex flex-col gap-1.5 py-2.5 first:pt-0">
      <span className="font-medium text-ink">{docka.namn}</span>
      {!poster.length ? <span className="text-sm text-faint">–</span> : null}
      {slag.map((s) => {
        const mine = poster.filter((p) => p.slag === s);
        const links = [...new Map(mine.map((p) => [p.oppna ?? `${p.slag}${p.plats}`, p])).values()].sort((a, b) => chipOf(a).localeCompare(chipOf(b), "sv", { numeric: true }));
        // The recordings open where the motion opens: their number only.
        if (s === "klipp")
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span className="w-14 text-sm text-[#7fd3a5]">{SLAG_ORD[s].kort}</span>
              <span className="text-sm text-soft tabular-nums">{mine.reduce((n, p) => n + (Number(/^\d+/.exec(p.text)?.[0]) || 1), 0)}</span>
            </div>
          );
        return (
          <div key={s} className="flex flex-wrap items-center gap-1.5">
            <span className="w-14 text-sm text-[#7fd3a5]">{SLAG_ORD[s].kort}</span>
            {links.map((p) =>
              p.oppna ? (
                <Link key={p.oppna} href={p.oppna} className={buttonClasses({ variant: "secondary", size: "sm" })} title={`${p.oppnaOrd ?? "Öppna"}: ${chipOf(p)}`}>
                  {chipOf(p)}
                </Link>
              ) : (
                <Badge key={`${p.slag}${p.plats}`} size="md">
                  {chipOf(p) === "öppna" ? p.text : chipOf(p)}
                </Badge>
              ),
            )}
          </div>
        );
      })}
    </li>
  );
}

/** The live film's numbers: per dealer and hand, how many times and how long (median seconds). */
function FilmTable({ schema, segment }: { schema: Schema; segment: string | null }) {
  const tal = segment ? schema.filmen[segment] : undefined;
  if (!tal?.length || !tal.some((t) => t.rader.length)) return <p className="text-sm text-faint">–</p>;
  const hands = ["högern", "vänstern"];
  const num = (n: number | null) => (n === null ? "–" : n.toLocaleString("sv-SE", { maximumFractionDigits: 2 }));
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-2xs text-faint">
          <th className="pb-1 text-left font-medium" />
          {hands.map((h) => (
            <th key={h} className="pb-1 text-right font-medium" colSpan={2}>
              {h === "högern" ? "Högern" : "Vänstern"}
            </th>
          ))}
        </tr>
        <tr className="text-2xs text-faint">
          <th />
          {hands.map((h) => [
            <th key={`${h}n`} className="text-right font-normal">gånger</th>,
            <th key={`${h}s`} className="text-right font-normal">s</th>,
          ])}
        </tr>
      </thead>
      <tbody>
        {tal.map((t) => (
          <tr key={t.dealer}>
            <td className="py-1 text-ink">{t.namn}</td>
            {hands.map((h) => {
              const r = t.rader.find((x) => x.vad === h);
              return [
                <td key={`${h}n`} className="py-1 text-right text-soft">{r ? num(r.antal) : "–"}</td>,
                <td key={`${h}s`} className="py-1 text-right text-soft">{r ? num(r.median) : "–"}</td>,
              ];
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MotionSheet({ schema, id, onClose, onAnchor }: { schema: Schema; id: string | null; onClose: () => void; onAnchor: (id: string) => void }) {
  const r = id ? schema.rorelser.find((x) => x.id === id) ?? null : null;
  return (
    <Sheet
      open={!!r}
      onOpenChange={(o) => (o ? null : onClose())}
      title={r?.namn ?? ""}
      subtitle={
        r ? (
          <>
            {[r.franAnkare, r.tillAnkare].map((a, i) => (
              <Fragment key={i}>
                {i ? " → " : null}
                <button type="button" onClick={() => a && onAnchor(a)} className="hover:text-brass-hi hover:underline">
                  {anchorName(schema, a)}
                </button>
              </Fragment>
            ))}
          </>
        ) : undefined
      }
      width={460}
    >
      {r ? (
        <div>
          <Section title="Läge">
            <Badge tone={STATUS_TONE[r.status]} size="md">{STATUS_ORD[r.status].namn}</Badge>
          </Section>
          <Section title="Händerna">
            <p className="text-sm text-soft">{r.hander}</p>
          </Section>
          <Section title="Dockorna">
            <ul className="divide-y divide-line">
              {schema.dockor.map((d) => (
                <DollRow key={d.id} schema={schema} docka={d} rorelse={r.id} />
              ))}
            </ul>
          </Section>
          <Section title="I livefilmen">
            <FilmTable schema={schema} segment={r.segment} />
          </Section>
        </div>
      ) : null}
    </Sheet>
  );
}

export function AnchorSheet({ schema, id, docka, onClose, onPick }: { schema: Schema; id: string | null; docka: string; onClose: () => void; onPick: (rorelse: string) => void }) {
  const a = id ? schema.ankare.find((x) => x.id === id) ?? null : null;
  const lage = (lid: string | undefined) => (lid ? schema.lagen.find((l) => l.id === lid)?.namn ?? null : null);
  const here = a ? schema.rorelser.filter((r) => r.franAnkare === a.id && r.tillAnkare === a.id) : [];
  const out = a ? schema.rorelser.filter((r) => r.franAnkare === a.id && r.tillAnkare !== a.id) : [];
  const into = a ? schema.rorelser.filter((r) => r.tillAnkare === a.id && r.franAnkare !== a.id) : [];
  const poses = a ? schema.dockor.filter((d) => schema.ankaren.some((x) => x.docka === d.id && x.ankare === a.id)) : [];
  const list = (rs: typeof here) =>
    rs.length ? (
      <ul className="space-y-1.5 text-sm">
        {rs.map((r) => {
          const d = drawn(schema, docka, r.id);
          return (
            <li key={r.id}>
              <button type="button" onClick={() => onPick(r.id)} className={cn("inline-flex items-center gap-2 text-left hover:text-brass-hi", d.has ? "text-ink" : "text-faint")}>
                <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", d.has ? "bg-godkand" : "border border-faint")} />
                {r.namn}
              </button>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="text-sm text-faint">–</p>
    );
  return (
    <Sheet open={!!a} onOpenChange={(o) => (o ? null : onClose())} title={a?.namn ?? ""} subtitle={a?.id} width={420}>
      {a ? (
        <div>
          <Section title="Läge">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={a.okand ? "bad" : STATUS_TONE[a.status]} size="md">{a.okand ? "Inget ankare" : STATUS_ORD[a.status].namn}</Badge>
              {poses.map((d) => (
                <Badge key={d.id} tone="ok" size="md">{d.namn}</Badge>
              ))}
            </div>
          </Section>
          {a.lagen ? (
            <Section title="Händerna">
              <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-faint">Högern</dt>
                <dd className="text-soft">{lage(a.lagen.hoger) ?? "–"}</dd>
                <dt className="text-faint">Vänstern</dt>
                <dd className="text-soft">{lage(a.lagen.vanster) ?? "–"}</dd>
              </dl>
            </Section>
          ) : null}
          {here.length ? <Section title="Här">{list(here)}</Section> : null}
          <Section title="Härifrån">{list(out)}</Section>
          <Section title="Hit">{list(into)}</Section>
        </div>
      ) : null}
    </Sheet>
  );
}
