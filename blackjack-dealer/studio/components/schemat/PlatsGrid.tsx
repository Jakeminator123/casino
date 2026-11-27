"use client";

// Schemat's card places (SchemaView.tsx): every card place of the doll's table (src/uppsattning.ts kortplatser, through
// /api/schema) as a grid, the seats as the source numbers them in the order they lie in the picture and the dealer's own
// last, card 1, 2, 3 … down; a cell is filled where the doll has the deal there, with how (lyft, ritad, klipp, film). Beside
// it the same places seen from above, where they lie on the felt. A click opens the deal's motion. No number is written here:
// the seats' numbers and places are the source's.
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

export function PlatsGrid({ schema, docka, cells, onPick }: { schema: Schema; docka: Docka; cells: Map<string, Cell>; onPick: (rorelse: string, plats: string) => void }) {
  // The seats in the order they lie in the picture (mean x of their places), the dealer's own last.
  const seats = [...new Set(docka.platser.map((p) => p.plats))];
  const meanX = (s: string) => {
    const xs = docka.platser.filter((p) => p.plats === s).map((p) => p.x);
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  };
  seats.sort((a, b) => (a === "D" ? 1 : b === "D" ? -1 : meanX(a) - meanX(b)));
  const cards = [...new Set(docka.platser.map((p) => p.kort))].sort((a, b) => a - b);

  const seatWord = (s: string) => (s === "D" ? "Dealern" : `Plats ${s}`);
  const cell = (s: string, k: number, wide: boolean) => {
    const place = docka.platser.find((p) => p.plats === s && p.kort === k);
    if (!place) return <td key={`${s}${k}`} />;
    const c = cells.get(place.id), full = !!c?.slag.length;
    return (
      <td key={`${s}${k}`} className="p-0">
        <button
          type="button"
          disabled={!c?.rorelse}
          onClick={() => c?.rorelse && onPick(c.rorelse, place.id)}
          title={full ? c!.poster.map((p) => p.text).join("\n") : undefined}
          className={cn(
            "flex w-full items-center justify-center rounded-md border px-1 text-xs leading-tight font-medium transition-colors",
            wide ? "h-12 min-w-[60px] flex-col" : "h-9 gap-1.5",
            full ? "border-godkand/50 bg-godkand/20 text-[#8fe0b2] hover:bg-godkand/30" : "border-line bg-well hover:border-line-hi",
          )}
        >
          {full ? c!.slag.map((x) => <span key={x}>{SLAG_ORD[x].kort}</span>) : null}
        </button>
      </td>
    );
  };

  return (
    <div className="flex flex-col gap-5 md:flex-row md:flex-wrap md:items-start md:gap-6">
      {/* Wide: the seats across, the cards down. */}
      <table className="hidden border-separate border-spacing-1 text-sm md:table">
        <thead>
          <tr>
            <th />
            {seats.map((s) => (
              <th key={s} className="min-w-[60px] px-1 pb-1 text-center font-medium text-dim">
                {seatWord(s)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cards.map((k) => (
            <tr key={k}>
              <th className="pr-2 text-left font-medium whitespace-nowrap text-dim">Kort {k}</th>
              {seats.map((s) => cell(s, k, true))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Narrow (a phone): the same turned, the seats down and the cards across, as wide as the screen. */}
      <table className="w-full table-fixed border-separate border-spacing-1 text-sm md:hidden">
        <thead>
          <tr>
            <th className="w-[76px]" />
            {cards.map((k) => (
              <th key={k} className="pb-1 text-center font-medium text-dim">
                Kort {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {seats.map((s) => (
            <tr key={s}>
              <th className="pr-1 text-left font-medium whitespace-nowrap text-dim">{seatWord(s)}</th>
              {cards.map((k) => cell(s, k, false))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="w-full md:w-[400px]">
        <PlatsKarta docka={docka} cells={cells} onPick={onPick} />
      </div>
    </div>
  );
}

/** The same places seen from above: where each lies on the felt (the dealer's at the top, the players' toward the bottom). */
function PlatsKarta({ docka, cells, onPick }: { docka: Docka; cells: Map<string, Cell>; onPick: (rorelse: string, plats: string) => void }) {
  if (!docka.platser.length) return null;
  const W = 400, H = 200, M = 24;
  const xs = docka.platser.map((p) => p.x), zs = docka.platser.map((p) => p.z);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const s = Math.min((W - 2 * M) / (x1 - x0 || 1), (H - 2 * M) / (z1 - z0 || 1));
  const px = (x: number) => W / 2 + (x - (x0 + x1) / 2) * s, pz = (z: number) => H / 2 + (z - (z0 + z1) / 2) * s;
  const first = docka.platser.filter((p) => p.kort === 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-lg border border-line bg-well" role="img" aria-label={`Kortplatserna vid ${docka.bord}, sedda uppifrån`}>
      {docka.platser.map((p) => {
        const c = cells.get(p.id), full = !!c?.slag.length;
        return (
          <g key={p.id} transform={`translate(${px(p.x)} ${pz(p.z)}) rotate(${(p.vinkel * 180) / Math.PI})`} className={c?.rorelse ? "cursor-pointer" : undefined} onClick={() => c?.rorelse && onPick(c.rorelse, p.id)}>
            <title>{`${p.plats === "D" ? "Dealern" : `Plats ${p.plats}`}, kort ${p.kort}${full ? `: ${c!.slag.map((x) => SLAG_ORD[x].kort).join(", ")}` : ""}`}</title>
            <rect x={-8} y={-11} width={16} height={22} rx={2} fill={full ? "var(--color-godkand)" : "var(--color-raised)"} fillOpacity={full ? 0.85 : 1} stroke={full ? "var(--color-godkand)" : "var(--color-line-hi)"} strokeWidth={1} />
          </g>
        );
      })}
      {first.map((p) => (
        <text key={p.id} x={px(p.x)} y={pz(p.z) + (p.plats === "D" ? -17 : 27)} textAnchor="middle" fontSize={12} fill="var(--color-dim)">
          {p.plats === "D" ? "Dealern" : p.plats}
        </text>
      ))}
    </svg>
  );
}
