"use client";

// Schemat's boxes (SchemaView.tsx): a motion opened (its name, from and to, what the hands do, the note, the status, what each
// doll has and where it opens, how often it is in the live film per dealer and how long it is), or an anchor opened (where
// each hand is, and the motions to and from it). All from /api/schema; nothing is written.
import Link from "next/link";
import { Badge, Sheet, buttonClasses, type BadgeTone } from "../ui";
import { EDGE_STYLE } from "./SchemaGraph";
import {
  SLAG_ORD, STATUS_ORD, finnsFor, ganger, kortplatsOrd, platsLista, platsOchKort, sekunder,
  type FilmTal, type Post, type Schema, type Status,
} from "@/lib/schemat";

export const STATUS_TONE: Record<Status, BadgeTone> = { finns: "ok", delvis: "wait", saknas: "bad", förslag: "brass" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-2xs font-semibold tracking-wide text-faint uppercase">{title}</h3>
      {children}
    </section>
  );
}

function AnchorRef({ schema, id, onAnchor }: { schema: Schema; id: string | null; onAnchor: (id: string) => void }) {
  const a = id ? schema.ankare.find((x) => x.id === id) : null;
  if (!a) return <span className="text-faint">okänt</span>;
  return (
    <button type="button" onClick={() => onAnchor(a.id)} className="text-left text-ink hover:text-brass-hi hover:underline">
      {a.namn} <span className="text-xs text-faint tabular-nums">{a.id}</span>
    </button>
  );
}

/** The film's numbers for one segment, a line per dealer. */
export function FilmLines({ tal, kategori }: { tal: FilmTal[] | undefined; kategori?: string | null }) {
  if (!tal?.length) return <p className="text-sm text-faint">Inte indelad i livefilmen.</p>;
  return (
    <div className="space-y-2.5 text-sm">
      {kategori ? <p className="text-dim">I filmen räknas det som: {kategori}.</p> : null}
      {tal.map((t) => (
        <div key={t.dealer}>
          <div className="font-medium text-ink">{t.namn}</div>
          {t.rader.length ? (
            <ul className="text-soft">
              {t.rader.map((r) => (
                <li key={r.vad}>
                  {r.vad === "gånger" || r.vad === "i de bästa styckena" ? `${r.antal ?? 0} ${r.vad === "gånger" ? (r.antal === 1 ? "gång" : "gånger") : "stycken"}` : `${r.vad} ${ganger(r.antal ?? 0)}`}
                  {r.median !== null ? `, oftast ${sekunder(r.median)}` : ""}
                  {r.p10 !== null && r.p90 !== null && r.p10 !== r.p90 ? ` (${sekunder(r.p10).replace(" s", "")}–${sekunder(r.p90)})` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-faint">inte i filmen</p>
          )}
          {t.perPlats ? (
            <p className="text-xs text-dim">
              Per plats: {Object.entries(t.perPlats).map(([p, n]) => `${p === "D" ? "dealern" : p} ${n}`).join(" · ")}
            </p>
          ) : null}
          {t.perKort ? (
            <p className="text-xs text-dim">
              Per kort: {Object.entries(t.perKort).map(([k, n]) => `${k === "CNone" ? "okänt" : k.replace("C", "")} ${n}`).join(" · ")}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** The places a doll's posts of one kind are at, and the links that open them. */
function DollRow({ schema, docka, rorelse }: { schema: Schema; docka: Schema["dockor"][number]; rorelse: string }) {
  const { poster, slag } = finnsFor(schema, docka.id, rorelse);
  const open = new Map<string, { href: string; word: string; label: string }>();
  for (const p of poster) if (p.oppna && !open.has(p.oppna)) open.set(p.oppna, { href: p.oppna, word: p.oppnaOrd ?? "Öppna", label: chipOf(p) });
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium text-ink">{docka.namn}</span>
        <span className="text-xs text-faint">{docka.slag === "dealer" ? "den äldre dealern, filmer" : docka.bord}</span>
      </div>
      {!poster.length ? (
        <p className="text-sm text-faint">inget</p>
      ) : (
        <ul className="mt-0.5 space-y-0.5 text-sm text-soft">
          {slag.map((s) => {
            const mine = poster.filter((p) => p.slag === s);
            const platser = [...new Set(mine.flatMap((p) => (p.plats ? [platsOchKort(p.plats)?.plats ?? ""] : [])))].filter(Boolean);
            return (
              <li key={s}>
                <span className="text-[#7fd3a5]">{SLAG_ORD[s].namn}</span>
                {platser.length ? `: ${platser.length === 1 && platser[0] === "D" ? "" : platser.length === 1 ? "plats " : "platserna "}${platsLista(platser)}` : mine.length > 1 ? ` (${mine.length})` : ""}
                {s === "film" || s === "lyft" ? <span className="block text-xs text-dim">{[...new Set(mine.map((p) => p.text))].slice(0, 4).join(" · ")}</span> : null}
              </li>
            );
          })}
        </ul>
      )}
      {[...new Set([...open.values()].map((o) => o.word))].map((word) => {
        const links = [...open.values()].filter((o) => o.word === word).sort((a, b) => a.label.localeCompare(b.label, "sv", { numeric: true }));
        return (
          <div key={word} className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-dim">{word}:</span>
            {links.slice(0, 18).map((o) => (
              <Link key={o.href} href={o.href} className={buttonClasses({ variant: "secondary", size: "sm" })} title={`${word}${o.label ? `, ${o.label}` : ""}`}>
                {o.label || "öppna"}
              </Link>
            ))}
          </div>
        );
      })}
    </li>
  );
}
/** The short word on a link: "plats 4", "plats 4 B", "väntan 1", "kort 2". */
function chipOf(p: Post): string {
  const pk = p.plats ? platsOchKort(p.plats) : null;
  const version = /version ([A-Z])/.exec(p.text)?.[1];
  const vantan = /väntan (\d+)/.exec(p.text)?.[1];
  const more = p.text.includes("försök till") ? " (2)" : "";
  if (pk) return `${pk.plats === "D" ? "dealern" : `plats ${pk.plats}`}${pk.kort > 1 ? `, kort ${pk.kort}` : ""}${version && version !== "A" ? ` ${version}` : ""}${more}`;
  return vantan ? `väntan ${vantan}` : "";
}

export function MotionSheet({ schema, id, plats, onClose, onAnchor }: { schema: Schema; id: string | null; plats: string | null; onClose: () => void; onAnchor: (id: string) => void }) {
  const r = id ? schema.rorelser.find((x) => x.id === id) ?? null : null;
  const stage = r ? schema.stadier.find((s) => s.id === r.stadium) : null;
  return (
    <Sheet open={!!r} onOpenChange={(o) => (o ? null : onClose())} title={r?.namn ?? ""} subtitle={r ? `${r.id}${stage ? ` · ${stage.namn}` : ""}${plats ? ` · ${kortplatsOrd(plats)}` : ""}` : undefined} width={480}>
      {r ? (
        <div>
          <Section title="Status">
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_TONE[r.status]} size="md">{STATUS_ORD[r.status].namn}</Badge>
              <svg width={44} height={10} aria-hidden>
                <line x1={2} x2={42} y1={5} y2={5} stroke={EDGE_STYLE[r.status].stroke} strokeWidth={EDGE_STYLE[r.status].width} strokeDasharray={EDGE_STYLE[r.status].dash} strokeLinecap="round" opacity={EDGE_STYLE[r.status].opacity} />
              </svg>
              <span className="text-sm text-dim">{STATUS_ORD[r.status].om}</span>
            </div>
          </Section>
          <Section title="Från och till">
            <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-faint">Från</dt>
              <dd><AnchorRef schema={schema} id={r.franAnkare} onAnchor={onAnchor} />{r.fran !== r.franAnkare ? <span className="text-xs text-faint"> ({r.fran})</span> : null}</dd>
              <dt className="text-faint">Till</dt>
              <dd><AnchorRef schema={schema} id={r.tillAnkare} onAnchor={onAnchor} />{r.till !== r.tillAnkare ? <span className="text-xs text-faint"> ({r.till})</span> : null}</dd>
              {r.over ? (<><dt className="text-faint">Över</dt><dd className="text-soft">{r.over}</dd></>) : null}
              {stage ? (<><dt className="text-faint">Stadium</dt><dd className="text-soft">{stage.namn} <span className="text-xs text-faint">{stage.id}</span></dd></>) : null}
            </dl>
          </Section>
          <Section title="Händerna">
            <p className="text-sm text-soft">{r.hander}</p>
            {r.anteckning ? <p className="mt-2 text-sm text-dim">{r.anteckning}</p> : null}
          </Section>
          <Section title="Finns för">
            <ul className="divide-y divide-line">
              {schema.dockor.map((d) => (
                <DollRow key={d.id} schema={schema} docka={d} rorelse={r.id} />
              ))}
            </ul>
          </Section>
          <Section title="I livefilmen">
            <FilmLines tal={r.segment ? schema.filmen[r.segment] : undefined} kategori={r.kategori} />
          </Section>
        </div>
      ) : null}
    </Sheet>
  );
}

export function AnchorSheet({ schema, id, onClose, onPick }: { schema: Schema; id: string | null; onClose: () => void; onPick: (rorelse: string) => void }) {
  const a = id ? schema.ankare.find((x) => x.id === id) ?? null : null;
  const lage = (lid: string | undefined) => (lid ? schema.lagen.find((l) => l.id === lid) : undefined);
  const ut = a ? schema.rorelser.filter((r) => r.franAnkare === a.id) : [];
  const in_ = a ? schema.rorelser.filter((r) => r.tillAnkare === a.id && r.franAnkare !== a.id) : [];
  const homes = a ? schema.stadier.filter((s) => s.hem === a.id) : [];
  const list = (rs: typeof ut) => (
    <ul className="space-y-1 text-sm">
      {rs.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => onPick(r.id)} className="inline-flex items-center gap-2 text-left text-soft hover:text-brass-hi">
            <Badge tone={STATUS_TONE[r.status]}>{STATUS_ORD[r.status].namn}</Badge>
            {r.namn}
          </button>
        </li>
      ))}
    </ul>
  );
  return (
    <Sheet open={!!a} onOpenChange={(o) => (o ? null : onClose())} title={a?.namn ?? ""} subtitle={a ? `${a.id}${homes.length ? ` · hem för ${homes.map((s) => s.namn).join(", ")}` : ""}` : undefined} width={440}>
      {a ? (
        <div>
          <Section title="Ankaret">
            <div className="mb-2 flex items-center gap-2">
              <Badge tone={a.okand ? "bad" : STATUS_TONE[a.status]} size="md">{a.okand ? "Inget ankare" : STATUS_ORD[a.status].namn}</Badge>
            </div>
            {a.okand ? <p className="text-sm text-dim">En rörelse nämner {a.id}, men katalogen har inget ankare med det namnet.</p> : null}
            {a.var ? <p className="text-sm text-soft">{a.var}</p> : null}
            {a.anteckning ? <p className="mt-2 text-sm text-dim">{a.anteckning}</p> : null}
          </Section>
          {a.lagen ? (
            <Section title="Händerna">
              <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-sm">
                {(["hoger", "vanster"] as const).map((h) => {
                  const l = lage(a.lagen?.[h]);
                  return (
                    <div key={h} className="contents">
                      <dt className="text-faint">{h === "hoger" ? "Högern" : "Vänstern"}</dt>
                      <dd className="text-soft">
                        {l ? (
                          <>
                            {l.namn} <span className="text-xs text-faint">{l.id}</span>
                            <span className="block text-xs text-dim">{l.var}</span>
                          </>
                        ) : (
                          a.lagen?.[h] ?? "–"
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </Section>
          ) : null}
          <Section title="Rörelser härifrån">{ut.length ? list(ut) : <p className="text-sm text-faint">inga</p>}</Section>
          <Section title="Rörelser hit">{in_.length ? list(in_) : <p className="text-sm text-faint">inga</p>}</Section>
        </div>
      ) : null}
    </Sheet>
  );
}


