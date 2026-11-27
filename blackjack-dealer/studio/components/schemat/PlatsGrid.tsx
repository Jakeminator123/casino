"use client";

// Schemat's card places (SchemaView.tsx): the anchor "Kortet har landat hos en spelare" (and hos dealern) holds every seat and
// every card, so it is drawn as a grid: the chosen doll's table's places (src/uppsattning.ts kortplatser, through
// /api/schema), seats in the order they lie in the picture, from the picture's left, and the dealer's own last, card 1, 2, 3 …
// down. A cell is filled where the doll has the deal there, with how (lyft, ritad, klipp, film). Beside it the same places
// seen from above, where they lie on the felt. A click opens the deal's motion. Numbers and places are the source's.
import { cn } from "../ui";
import { SLAGEN, SLAG_ORD, ar, kodAv, rorelseFor, type Docka, type Post, type Schema, type Slag } from "@/lib/schemat";

type Cell = { id: string; rorelse: string | null; slag: Slag[]; poster: Post[] };

/** The deal into each place of the doll's table: the posts of motions whose end is that place. */
export function cellsOf(schema: Schema, docka: Docka): Map<string, Cell> {
  const out = new Map<string, Cell>();
  for (const p of docka.platser) {
    const kod = kodAv(p.id);
    if (!kod) continue;
    const into = schema.rorelser.filter((r) => ar(kod, r.till));
    const poster = schema.poster.filter((x) => x.docka === docka.id && x.plats === p.id && into.some((r) => r.id === x.rorelse));
    const rorelse = poster[0]?.rorelse ?? rorelseFor(null, kod, schema.rorelser)?.id ?? null;
    out.set(p.id, { id: p.id, rorelse, slag: SLAGEN.filter((s) => poster.some((x) => x.slag === s)), poster });
  }
  return out;
}

export function PlatsGrid({ schema, docka, onPick }: { schema: Schema; docka: Docka; onPick: (rorelse: string, plats: string) => void }) {
  const cells = cellsOf(schema, docka);
  // The seats in the order they lie in the picture (mean x of their places), the dealer's own last.
  const seats = [...new Set(docka.platser.map((p) => p.plats))];
  const meanX = (s: string) => {
    const xs = docka.platser.filter((p) => p.plats === s).map((p) => p.x);
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  };
  seats.sort((a, b) => (a === "D" ? 1 : b === "D" ? -1 : meanX(a) - meanX(b)));
  const cards = [...new Set(docka.platser.map((p) => p.kort))].sort((a, b) => a - b);
  const has = [...cells.values()].filter((c) => c.slag.length).length;

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="min-w-0 overflow-x-auto">
        <table className="border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="px-1 text-left font-normal text-faint" />
              {seats.map((s) => (
                <th key={s} className="min-w-[58px] px-1 pb-1 text-center font-medium text-dim">
                  {s === "D" ? "Dealern" : `Plats ${s}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cards.map((k) => (
              <tr key={k}>
                <th className="pr-2 text-left font-medium whitespace-nowrap text-dim">Kort {k}</th>
                {seats.map((s) => {
                  const place = docka.platser.find((p) => p.plats === s && p.kort === k);
                  if (!place) return <td key={s} className="h-11 rounded-sm border border-dashed border-line text-center text-faint" title="Bordet har ingen kortplats här">–</td>;
                  const c = cells.get(place.id);
                  const full = !!c?.slag.length;
                  return (
                    <td key={s} className="p-0">
                      <button
                        type="button"
                        disabled={!c?.rorelse}
                        onClick={() => c?.rorelse && onPick(c.rorelse, place.id)}
                        title={full ? c!.poster.map((p) => p.text).join("\n") : `Ingen giv hit för ${docka.namn}`}
                        className={cn(
                          "flex h-11 w-full min-w-[58px] flex-col items-center justify-center rounded-sm border px-1 leading-tight transition-colors",
                          full ? "border-godkand/45 bg-godkand/15 text-[#7fd3a5] hover:bg-godkand/25" : "border-line-strong bg-well text-faint hover:border-line-hi",
                        )}
                      >
                        {full ? c!.slag.map((x) => <span key={x}>{SLAG_ORD[x].kort}</span>) : <span>inget</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-faint">
          {docka.namn} vid {docka.bord}: en giv till {has} av bordets {docka.platser.length} kortplatser. Platserna räknas från bildens vänster.
        </p>
      </div>
      <PlatsKarta docka={docka} cells={cells} onPick={onPick} />
    </div>
  );
}

/** The same places seen from above: where each lies on the felt (the dealer's at the top, the players' toward the bottom). */
function PlatsKarta({ docka, cells, onPick }: { docka: Docka; cells: Map<string, Cell>; onPick: (rorelse: string, plats: string) => void }) {
  if (!docka.platser.length) return null;
  const W = 380, H = 190, M = 22;
  const xs = docka.platser.map((p) => p.x), zs = docka.platser.map((p) => p.z);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const s = Math.min((W - 2 * M) / (x1 - x0 || 1), (H - 2 * M) / (z1 - z0 || 1));
  const px = (x: number) => W / 2 + (x - (x0 + x1) / 2) * s, pz = (z: number) => H / 2 + (z - (z0 + z1) / 2) * s;
  const first = docka.platser.filter((p) => p.kort === 1);
  return (
    <figure className="w-full max-w-[380px] min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-md border border-line bg-well" role="img" aria-label={`Kortplatserna vid ${docka.bord}, sedda uppifrån`}>
        {docka.platser.map((p) => {
          const c = cells.get(p.id), full = !!c?.slag.length;
          return (
            <g key={p.id} transform={`translate(${px(p.x)} ${pz(p.z)}) rotate(${(p.vinkel * 180) / Math.PI})`} className={c?.rorelse ? "cursor-pointer" : undefined} onClick={() => c?.rorelse && onPick(c.rorelse, p.id)}>
              <title>{`${p.plats === "D" ? "Dealern" : `Plats ${p.plats}`}, kort ${p.kort}${full ? `: ${c!.slag.map((x) => SLAG_ORD[x].kort).join(", ")}` : ""}`}</title>
              <rect x={-7} y={-10} width={14} height={20} rx={2} fill={full ? "var(--color-godkand)" : "var(--color-raised)"} fillOpacity={full ? 0.75 : 1} stroke={full ? "var(--color-godkand)" : "var(--color-line-hi)"} strokeWidth={1} />
            </g>
          );
        })}
        {first.map((p) => (
          <text key={p.id} x={px(p.x)} y={pz(p.z) + (p.plats === "D" ? -15 : 24)} textAnchor="middle" fontSize={11} fill="var(--color-dim)">
            {p.plats === "D" ? "dealern" : p.plats}
          </text>
        ))}
      </svg>
      <figcaption className="mt-1 text-2xs text-faint">Uppifrån: dealern överst, spelarna nedåt, bildens vänster till vänster.</figcaption>
    </figure>
  );
}
