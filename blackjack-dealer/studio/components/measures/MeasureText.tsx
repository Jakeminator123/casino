// The measures' text and tables as the view Mått draws them (lib/measures.ts gives the blocks): **bold** stays bold,
// the rest is plain text; a table scrolls sideways in a narrow window and keeps its first column in sight.
import { Fragment, type ReactNode } from "react";
import type { Block } from "../../lib/measures.ts";
import { cn } from "../ui/cn";

/** A line of text with its **bold** parts. */
export function Inline({ text }: { text: string }): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>));
}

export function MeasureBlock({ block }: { block: Block }) {
  if (block.typ === "rubrik")
    return <h3 className={cn("pt-3 font-semibold text-ink", block.niva >= 4 ? "text-sm" : "text-md")}><Inline text={block.text} /></h3>;
  if (block.typ === "stycke") return <p className="max-w-[110ch] text-sm leading-6 text-soft"><Inline text={block.text} /></p>;
  if (block.typ === "lista")
    return (
      <ul className="max-w-[110ch] list-disc space-y-1 pl-5 text-sm leading-6 text-soft">
        {block.rader.map((r, i) => <li key={i}><Inline text={r} /></li>)}
      </ul>
    );
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-inset">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm tabular-nums">
        <thead>
          <tr className="border-b border-line-strong">
            {block.huvud.map((h, i) => (
              <th key={i} className={cn("whitespace-nowrap px-3 py-2 text-xs font-semibold text-dim", i === 0 && "sticky left-0 bg-surface")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rader.map((r, i) => (
            <tr key={i} className={cn("border-b border-line last:border-b-0", r[0] ? "" : "text-soft")}>
              {r.map((c, j) => (
                <td key={j} className={cn("px-3 py-1.5 align-top", j === 0 ? "sticky left-0 bg-surface font-medium text-ink" : "text-soft", j > 0 && c.length < 28 && "whitespace-nowrap")}>
                  <Inline text={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
