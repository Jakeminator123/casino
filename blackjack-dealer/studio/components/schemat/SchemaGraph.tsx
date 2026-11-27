"use client";

// Schemat's picture (SchemaView.tsx): the anchors as boxes, the motions as curves with their names (layout.ts), drawn in SVG.
// The line says the catalogue's status: finns whole and clear, delvis whole and fainter, saknas dashed grey, förslag dotted in
// brass (SchemaLegend). A chosen doll adds a line under each name with what she has (lyft, ritad, klipp, film) and a dot,
// green where she has something. A chosen stage lifts its home anchor and its motions and tones the rest down. A click on a
// curve or a name opens the motion, on a box the anchor.
import { useMemo, useState } from "react";
import { cn } from "../ui";
import { NODE, schemaLayout } from "./layout";
import { SLAG_ORD, finnsFor, platsLista, platsOchKort, type Schema, type Status } from "../../lib/schemat";

/** Words in lines of at most `max` characters, at most `rows` lines (the last cut with …). */
export function wrap(text: string, max: number, rows: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = lines.at(-1);
    if (last !== undefined && (last + " " + word).length <= max) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
  }
  if (lines.length <= rows) return lines;
  const kept = lines.slice(0, rows);
  kept[rows - 1] = kept[rows - 1].slice(0, max - 1).replace(/\s+\S*$/, "") + " …";
  return kept;
}

const LINE = 13, CHAR = 5.9, NAME_CHARS = 17, MIN_WIDTH = 1240;
/** What a doll has of a motion, in one short line: "ritad, klipp · 7 platser", "lyft · plats 2, 4, 7", "inget". */
export function dollLine(schema: Schema, docka: string, rorelse: string): { text: string; has: boolean } {
  const { poster, slag } = finnsFor(schema, docka, rorelse);
  if (!poster.length) return { text: "inget", has: false };
  const platser = [...new Set(poster.flatMap((p) => (p.plats ? [platsOchKort(p.plats)?.plats ?? ""] : [])))].filter(Boolean);
  const where = platser.length > 3 ? `${platser.length} platser` : platser.length ? `${platser.length === 1 && platser[0] === "D" ? "" : "plats "}${platsLista(platser)}` : "";
  return { text: `${slag.map((s) => SLAG_ORD[s].kort).join(", ")}${where ? ` · ${where}` : ""}`, has: true };
}

export const EDGE_STYLE: Record<Status, { stroke: string; dash?: string; width: number; opacity: number; marker: string; text: string }> = {
  finns: { stroke: "var(--color-soft)", width: 2, opacity: 1, marker: "soft", text: "var(--color-ink)" },
  delvis: { stroke: "var(--color-soft)", width: 2, opacity: 0.5, marker: "soft", text: "var(--color-soft)" },
  saknas: { stroke: "var(--color-faint)", dash: "6 5", width: 1.5, opacity: 0.9, marker: "faint", text: "var(--color-dim)" },
  förslag: { stroke: "var(--color-brass)", dash: "0.5 5", width: 2.2, opacity: 0.95, marker: "brass", text: "var(--color-brass-hi)" },
};
const NODE_STROKE: Record<Status, { stroke: string; dash?: string }> = {
  finns: { stroke: "var(--color-line-hi)" },
  delvis: { stroke: "var(--color-line-strong)" },
  saknas: { stroke: "var(--color-faint)", dash: "5 4" },
  förslag: { stroke: "var(--color-brass)", dash: "0.5 4.5" },
};

export function SchemaGraph({
  schema,
  docka,
  stadium,
  chosen,
  onPick,
  onAnchor,
}: {
  schema: Schema;
  docka: string | null;
  stadium: string | null;
  chosen: string | null;
  onPick: (rorelse: string) => void;
  onAnchor: (ankare: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  // Each name's lines, and the doll's line under it.
  const labels = useMemo(() => {
    const out = new Map<string, { lines: string[]; doll: { text: string; has: boolean; lines: string[] } | null; w: number; h: number }>();
    for (const r of schema.rorelser) {
      const lines = wrap(r.namn, NAME_CHARS, 3), d = docka ? dollLine(schema, docka, r.id) : null;
      const doll = d ? { ...d, lines: wrap(d.text, NAME_CHARS, 2) } : null;
      const chars = Math.max(...lines.map((l) => l.length), ...(doll ? doll.lines.map((l) => l.length + 2) : [0]));
      out.set(r.id, { lines, doll, w: Math.max(64, Math.round(chars * CHAR + 18)), h: (lines.length + (doll?.lines.length ?? 0)) * LINE + 10 });
    }
    return out;
  }, [schema, docka]);
  const layout = useMemo(() => schemaLayout(schema.ankare, schema.rorelser, (id) => labels.get(id) ?? { w: 60, h: 24 }), [schema, labels]);

  // The stage lifted: its home, its motions and the anchors they go between.
  const stage = stadium ? schema.stadier.find((s) => s.id === stadium) ?? null : null;
  const lit = useMemo(() => {
    if (!stage) return null;
    const motions = new Set(stage.rorelser);
    const anchors = new Set([stage.hem, ...schema.rorelser.filter((r) => motions.has(r.id)).flatMap((r) => [r.franAnkare ?? "", r.tillAnkare ?? ""])]);
    return { motions, anchors, home: schema.ankare.find((a) => a.id === stage.hem)?.id ?? stage.hem };
  }, [stage, schema]);
  const anchorOf = new Map(schema.ankare.map((a) => [a.id, a]));
  const motionOf = new Map(schema.rorelser.map((r) => [r.id, r]));

  return (
    // As wide as the frame, down to a size where the names can still be read; narrower than that it is scrolled sideways.
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ width: "100%", minWidth: Math.min(layout.width, MIN_WIDTH), maxWidth: layout.width, height: "auto" }}
      role="img"
      aria-label="Rörelseschemat: ankarena och rörelserna mellan dem"
      className="block select-none"
    >
      <defs>
        {[
          ["soft", "var(--color-soft)"],
          ["faint", "var(--color-faint)"],
          ["brass", "var(--color-brass)"],
          ["hi", "var(--color-brass-hi)"],
        ].map(([id, fill]) => (
          <marker key={id} id={`schema-pil-${id}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0.5 L 10 5 L 0 9.5 z" fill={fill} />
          </marker>
        ))}
      </defs>

      {layout.spareY !== null ? (
        <g>
          <line x1={16} x2={layout.width - 16} y1={layout.spareY - NODE.h / 2 - 26} y2={layout.spareY - NODE.h / 2 - 26} stroke="var(--color-line)" strokeDasharray="3 5" />
          <text x={20} y={layout.spareY - NODE.h / 2 - 10} fontSize={11} fill="var(--color-faint)">
            Övriga ankare: inte på en plats i rundans rad
          </text>
        </g>
      ) : null}

      {/* The curves under the boxes. */}
      {layout.edges.map((e) => {
        const r = motionOf.get(e.id)!, st = EDGE_STYLE[r.status], on = e.id === chosen || e.id === hover;
        const dim = lit ? !lit.motions.has(e.id) : false;
        return (
          <g key={e.id} opacity={dim ? 0.13 : 1} className="cursor-pointer" onClick={() => onPick(e.id)} onMouseEnter={() => setHover(e.id)} onMouseLeave={() => setHover(null)}>
            <title>{`${r.namn} (${r.id}): ${r.fran} → ${r.till}`}</title>
            <path d={e.d} fill="none" stroke="transparent" strokeWidth={14} />
            <path
              d={e.d}
              fill="none"
              stroke={on ? "var(--color-brass-hi)" : st.stroke}
              strokeWidth={on ? st.width + 1.2 : st.width}
              strokeDasharray={st.dash}
              strokeLinecap="round"
              opacity={on ? 1 : st.opacity}
              markerEnd={`url(#schema-pil-${on ? "hi" : st.marker})`}
            />
          </g>
        );
      })}

      {/* The boxes. */}
      {layout.nodes.map((n) => {
        const a = anchorOf.get(n.id)!, s = NODE_STROKE[a.status] ?? NODE_STROKE.saknas, home = lit?.home === n.id;
        const dim = lit ? !lit.anchors.has(n.id) : false;
        const lines = wrap(a.okand ? "Inget ankare med det namnet" : a.namn, 22, 2);
        return (
          <g key={n.id} opacity={dim ? 0.3 : 1} className="cursor-pointer" onClick={() => onAnchor(n.id)}>
            <title>{`${a.namn} (${a.id})${a.var ? `: ${a.var}` : ""}`}</title>
            {home ? <rect x={n.x - NODE.w / 2 - 5} y={n.y - NODE.h / 2 - 5} width={NODE.w + 10} height={NODE.h + 10} rx={14} fill="none" stroke="var(--color-brass)" strokeWidth={2} /> : null}
            <rect
              x={n.x - NODE.w / 2}
              y={n.y - NODE.h / 2}
              width={NODE.w}
              height={NODE.h}
              rx={10}
              fill={n.spare ? "var(--color-surface)" : "var(--color-raised)"}
              stroke={a.okand ? "var(--color-underkand)" : s.stroke}
              strokeDasharray={a.okand ? "5 4" : s.dash}
              strokeWidth={1.5}
            />
            <text x={n.x} y={n.y - NODE.h / 2 + 15} textAnchor="middle" fontSize={10.5} fill={home ? "var(--color-brass-hi)" : "var(--color-faint)"} className="tabular-nums">
              {a.id}
              {home ? " · hem" : ""}
            </text>
            {lines.map((l, i) => (
              <text key={i} x={n.x} y={n.y + 4 + i * 15 - (lines.length - 1) * 4} textAnchor="middle" fontSize={12.5} fontWeight={500} fill="var(--color-ink)">
                {l}
              </text>
            ))}
          </g>
        );
      })}

      {/* The names over everything. */}
      {layout.edges.map((e) => {
        const r = motionOf.get(e.id)!, st = EDGE_STYLE[r.status], l = labels.get(e.id)!, on = e.id === chosen || e.id === hover;
        const dim = lit ? !lit.motions.has(e.id) : false;
        const x = e.label.x - l.w / 2, y = e.label.y - l.h / 2;
        return (
          <g key={e.id} opacity={dim ? 0.18 : 1} className="cursor-pointer" onClick={() => onPick(e.id)} onMouseEnter={() => setHover(e.id)} onMouseLeave={() => setHover(null)}>
            <rect x={x} y={y} width={l.w} height={l.h} rx={7} fill="var(--color-surface)" stroke={on ? "var(--color-brass-hi)" : st.stroke} strokeOpacity={on ? 1 : st.opacity * 0.8} strokeDasharray={st.dash} strokeWidth={on ? 1.6 : 1} />
            {l.lines.map((t, i) => (
              <text key={i} x={e.label.x} y={y + 5 + LINE * (i + 1) - 3} textAnchor="middle" fontSize={11} fill={st.text} opacity={r.status === "delvis" ? 0.8 : 1}>
                {t}
              </text>
            ))}
            {l.doll ? (
              <g>
                <circle cx={x + 9} cy={y + 5 + LINE * l.lines.length + 6} r={3.4} fill={l.doll.has ? "var(--color-godkand)" : "none"} stroke={l.doll.has ? "var(--color-godkand)" : "var(--color-faint)"} strokeWidth={1.2} />
                {l.doll.lines.map((t, i) => (
                  <text key={i} x={x + 17} y={y + 5 + LINE * (l.lines.length + 1 + i) - 3} fontSize={10.5} fill={l.doll!.has ? "#6cc595" : "var(--color-faint)"}>
                    {t}
                  </text>
                ))}
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** The little legend beside the picture: the four lines, and the doll's dot when one is chosen. */
export function SchemaLegend({ docka, className }: { docka: string | null; className?: string }) {
  const sample = (status: Status) => {
    const st = EDGE_STYLE[status];
    return (
      <svg width={34} height={10} aria-hidden className="shrink-0">
        <line x1={2} x2={32} y1={5} y2={5} stroke={st.stroke} strokeWidth={st.width} strokeDasharray={st.dash} strokeLinecap="round" opacity={st.opacity} />
      </svg>
    );
  };
  const rows: [Status, string][] = [
    ["finns", "Finns"],
    ["delvis", "Delvis"],
    ["saknas", "Saknas"],
    ["förslag", "Förslag, inte prövat"],
  ];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-dim", className)}>
      {rows.map(([s, word]) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          {sample(s)}
          {word}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-2.5 rounded-full border border-brass" />
        Ram i mässing: stadiets hem
      </span>
      {docka ? (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2 rounded-full bg-godkand" />
            finns för dockan
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2 rounded-full border border-faint" />
            inget för dockan
          </span>
        </>
      ) : null}
    </div>
  );
}
