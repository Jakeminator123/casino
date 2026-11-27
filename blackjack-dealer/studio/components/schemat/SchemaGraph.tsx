"use client";

// Schemat's picture (SchemaView.tsx): the anchors as boxes, the motions as curves with their names (layout.ts), in SVG, for the
// chosen doll. What she has is drawn whole and clear, with a dot by its name (full: finns, half: delvis) and a number (how
// many places); what she lacks is left out, and shown faint (dashed; dotted in brass for a proposal) only when "Visa det som
// saknas" is on. Several motions from an anchor back to it are one label with their number, which opens the anchor. A chosen
// stage lifts its home and motions and tones the rest down. A click on a curve or a name opens the motion, on a box the anchor.
// The picture fills its frame, down to a width where the names can be read; narrower, it is scrolled sideways.
import { useMemo, useState } from "react";
import { NODE, schemaLayout, type LayoutMotion } from "./layout";
import { finnsFor, platsOchKort, type Schema, type Status } from "@/lib/schemat";

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

const LINE = 15, CHAR = 6.7, NAME_CHARS = 18, MIN_WIDTH = 980;
const GROUP = "grupp:";

/** The status a doll's motion is drawn with: hers when she has it (the catalogue's finns or delvis), else what it lacks. */
export function drawn(schema: Schema, docka: string, id: string): { has: boolean; status: Status; places: number } {
  const r = schema.rorelser.find((x) => x.id === id)!;
  const { poster } = finnsFor(schema, docka, id);
  const places = new Set(poster.flatMap((p) => (p.plats ? [platsOchKort(p.plats)?.plats ?? ""] : []))).size;
  return { has: poster.length > 0, status: poster.length ? (r.status === "delvis" ? "delvis" : "finns") : r.status, places };
}

const LACK: Record<Status, { stroke: string; dash: string }> = {
  finns: { stroke: "var(--color-faint)", dash: "6 5" },
  delvis: { stroke: "var(--color-faint)", dash: "6 5" },
  saknas: { stroke: "var(--color-faint)", dash: "6 5" },
  förslag: { stroke: "var(--color-brass)", dash: "0.5 5" },
};

/** The dot by a name: full for finns, half for delvis. */
function Dot({ x, y, status }: { x: number; y: number; status: Status }) {
  if (status === "delvis")
    return (
      <g>
        <circle cx={x} cy={y} r={5} fill="none" stroke="var(--color-godkand)" strokeWidth={1.5} />
        <path d={`M ${x} ${y - 5} A 5 5 0 0 0 ${x} ${y + 5} Z`} fill="var(--color-godkand)" />
      </g>
    );
  return <circle cx={x} cy={y} r={5} fill="var(--color-godkand)" />;
}

export function SchemaGraph({
  schema,
  docka,
  stadium,
  chosen,
  missing,
  onPick,
  onAnchor,
}: {
  schema: Schema;
  docka: string;
  stadium: string | null;
  chosen: string | null;
  missing: boolean;
  onPick: (rorelse: string) => void;
  onAnchor: (ankare: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  // What is shown: her motions, and with "Visa det som saknas" all; several loops on an anchor as one label.
  const shown = useMemo(() => {
    const motions = schema.rorelser.filter((r) => missing || drawn(schema, docka, r.id).has);
    const loops = new Map<string, typeof motions>();
    for (const r of motions) if (r.franAnkare && r.franAnkare === r.tillAnkare) loops.set(r.franAnkare, [...(loops.get(r.franAnkare) ?? []), r]);
    const layoutMotions: LayoutMotion[] = motions.filter((r) => !(r.franAnkare && r.franAnkare === r.tillAnkare && (loops.get(r.franAnkare)?.length ?? 0) > 1));
    const groups = [...loops].filter(([, rs]) => rs.length > 1).map(([a, rs]) => ({ anchor: a, ids: rs.map((r) => r.id) }));
    for (const g of groups) layoutMotions.push({ id: GROUP + g.anchor, franAnkare: g.anchor, tillAnkare: g.anchor });
    const used = new Set(layoutMotions.flatMap((m) => [m.franAnkare ?? "", m.tillAnkare ?? ""]));
    const mine = new Set(schema.ankaren.filter((a) => a.docka === docka).map((a) => a.ankare));
    const anchors = schema.ankare.filter((a) => missing || used.has(a.id) || mine.has(a.id));
    return { layoutMotions, groups, anchors, mine };
  }, [schema, docka, missing]);

  // Each name's lines and its number line.
  const labels = useMemo(() => {
    const out = new Map<string, { lines: string[]; sub: string | null; status: Status; has: boolean; w: number; h: number }>();
    const put = (id: string, name: string, sub: string | null, status: Status, has: boolean) => {
      const lines = wrap(name, NAME_CHARS, 3);
      const chars = Math.max(...lines.map((l) => l.length), sub ? sub.length + 3 : 0);
      out.set(id, { lines, sub, status, has, w: Math.max(70, Math.round(chars * CHAR + 30)), h: (lines.length + (sub ? 1 : 0)) * LINE + 12 });
    };
    for (const m of shown.layoutMotions) {
      if (m.id.startsWith(GROUP)) {
        const g = shown.groups.find((x) => GROUP + x.anchor === m.id)!;
        const has = g.ids.filter((id) => drawn(schema, docka, id).has).length;
        put(m.id, `${g.ids.length} rörelser här`, missing ? `${has} finns` : null, has ? "finns" : "saknas", has > 0);
        continue;
      }
      const r = schema.rorelser.find((x) => x.id === m.id)!, d = drawn(schema, docka, r.id);
      put(r.id, r.namn, d.has && d.places > 1 ? `${d.places} platser` : null, d.status, d.has);
    }
    return out;
  }, [schema, docka, shown, missing]);
  const layout = useMemo(() => schemaLayout(shown.anchors, shown.layoutMotions, (id) => labels.get(id) ?? { w: 70, h: 26 }), [shown, labels]);

  // The stage lifted: its home, its motions and the anchors they go between.
  const stage = stadium ? schema.stadier.find((s) => s.id === stadium) ?? null : null;
  const lit = useMemo(() => {
    if (!stage) return null;
    const motions = new Set(stage.rorelser);
    for (const g of shown.groups) if (g.ids.some((id) => motions.has(id))) motions.add(GROUP + g.anchor);
    const anchors = new Set([stage.hem, ...schema.rorelser.filter((r) => motions.has(r.id)).flatMap((r) => [r.franAnkare ?? "", r.tillAnkare ?? ""])]);
    return { motions, anchors, home: stage.hem };
  }, [stage, schema, shown]);
  const anchorOf = new Map(schema.ankare.map((a) => [a.id, a]));
  const used = new Set(layout.edges.filter((e) => labels.get(e.id)?.has).flatMap((e) => [e.from, e.to]));
  const pick = (id: string) => (id.startsWith(GROUP) ? onAnchor(id.slice(GROUP.length)) : onPick(id));
  const title = (id: string) => (id.startsWith(GROUP) ? shown.groups.find((g) => GROUP + g.anchor === id)!.ids.map((x) => schema.rorelser.find((r) => r.id === x)!.namn).join(", ") : schema.rorelser.find((r) => r.id === id)!.namn);

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ width: "100%", minWidth: Math.min(layout.width, MIN_WIDTH), maxWidth: Math.round(layout.width * 1.25), height: "auto" }}
      role="img"
      aria-label="Rörelseschemat: ankarena och rörelserna mellan dem"
      className="mx-auto block select-none"
    >
      <defs>
        {[
          ["on", "var(--color-soft)"],
          ["off", "var(--color-faint)"],
          ["brass", "var(--color-brass)"],
          ["hi", "var(--color-brass-hi)"],
        ].map(([id, fill]) => (
          <marker key={id} id={`schema-pil-${id}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0.5 L 10 5 L 0 9.5 z" fill={fill} />
          </marker>
        ))}
      </defs>

      {/* The curves under the boxes. */}
      {layout.edges.map((e) => {
        const l = labels.get(e.id)!, on = e.id === chosen || e.id === hover, dim = lit ? !lit.motions.has(e.id) : false;
        const lack = LACK[l.status];
        return (
          <g key={e.id} opacity={dim ? 0.12 : l.has ? 1 : 0.55} className="cursor-pointer" onClick={() => pick(e.id)} onMouseEnter={() => setHover(e.id)} onMouseLeave={() => setHover(null)}>
            <title>{title(e.id)}</title>
            <path d={e.d} fill="none" stroke="transparent" strokeWidth={16} />
            <path
              d={e.d}
              fill="none"
              stroke={on ? "var(--color-brass-hi)" : l.has ? "var(--color-soft)" : lack.stroke}
              strokeWidth={on ? 3 : l.has ? 2.2 : 1.4}
              strokeDasharray={l.has ? undefined : lack.dash}
              strokeLinecap="round"
              markerEnd={`url(#schema-pil-${on ? "hi" : l.has ? "on" : l.status === "förslag" ? "brass" : "off"})`}
            />
          </g>
        );
      })}

      {/* The boxes. */}
      {layout.nodes.map((n) => {
        const a = anchorOf.get(n.id)!, home = lit?.home === n.id, dim = lit ? !lit.anchors.has(n.id) : false;
        const has = used.has(n.id) || shown.mine.has(n.id);
        const lines = wrap(a.okand ? "Inget ankare" : a.namn, 20, 2);
        return (
          <g key={n.id} opacity={dim ? 0.25 : has ? 1 : 0.55} className="cursor-pointer" onClick={() => onAnchor(n.id)}>
            <title>{a.namn}</title>
            {home ? <rect x={n.x - NODE.w / 2 - 5} y={n.y - NODE.h / 2 - 5} width={NODE.w + 10} height={NODE.h + 10} rx={15} fill="none" stroke="var(--color-brass)" strokeWidth={2} /> : null}
            <rect
              x={n.x - NODE.w / 2}
              y={n.y - NODE.h / 2}
              width={NODE.w}
              height={NODE.h}
              rx={11}
              fill={has ? "var(--color-raised)" : "var(--color-surface)"}
              stroke={a.okand ? "var(--color-underkand)" : has ? "var(--color-line-hi)" : "var(--color-line-strong)"}
              strokeDasharray={has ? undefined : "5 4"}
              strokeWidth={1.5}
            />
            <text x={n.x} y={n.y - NODE.h / 2 + 17} textAnchor="middle" fontSize={11.5} fill={home ? "var(--color-brass-hi)" : "var(--color-faint)"} className="tabular-nums">
              {a.id}
            </text>
            {lines.map((t, i) => (
              <text key={i} x={n.x} y={n.y + 7 + i * 17 - (lines.length - 1) * 5} textAnchor="middle" fontSize={14.5} fontWeight={600} fill={has ? "var(--color-ink)" : "var(--color-dim)"}>
                {t}
              </text>
            ))}
          </g>
        );
      })}

      {/* The names over everything. */}
      {layout.edges.map((e) => {
        const l = labels.get(e.id)!, on = e.id === chosen || e.id === hover, dim = lit ? !lit.motions.has(e.id) : false;
        const x = e.label.x - l.w / 2, y = e.label.y - l.h / 2, lack = LACK[l.status];
        return (
          <g key={e.id} opacity={dim ? 0.15 : 1} className="cursor-pointer" onClick={() => pick(e.id)} onMouseEnter={() => setHover(e.id)} onMouseLeave={() => setHover(null)}>
            <rect
              x={x}
              y={y}
              width={l.w}
              height={l.h}
              rx={8}
              fill={l.has ? "var(--color-raised)" : "var(--color-canvas)"}
              stroke={on ? "var(--color-brass-hi)" : l.has ? "var(--color-line-hi)" : lack.stroke}
              strokeDasharray={l.has ? undefined : lack.dash}
              strokeWidth={on ? 1.6 : 1}
              opacity={l.has || on ? 1 : 0.7}
            />
            {l.has ? <Dot x={x + 13} y={y + 6 + LINE / 2 + 1} status={l.status} /> : null}
            {l.lines.map((t, i) => (
              <text key={i} x={x + (l.has ? 24 : 12)} y={y + 6 + LINE * (i + 1) - 4} fontSize={12.5} fontWeight={l.has ? 500 : 400} fill={l.has ? "var(--color-ink)" : "var(--color-dim)"}>
                {t}
              </text>
            ))}
            {l.sub ? (
              <text x={x + (l.has ? 24 : 12)} y={y + 6 + LINE * (l.lines.length + 1) - 4} fontSize={11.5} fill="#7fd3a5" className="tabular-nums">
                {l.sub}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
