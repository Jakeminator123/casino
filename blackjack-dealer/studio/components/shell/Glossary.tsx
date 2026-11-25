"use client";

// <Glossary open onOpenChange />: the menu's "Ordlista": the studio's one table of words (lib/words.ts) in a dialog,
// searchable. The menu draws the row that opens it (Rail.tsx). Each word with what it means, the other words Jakob himself
// uses for it ("Säger också": släpar, A3, tillbakagången …) and, quieter, the names it has in code and documents ("Kallas
// också": IDLE, Keystone 1, kant …), so that whichever word he looks for, or an older name read somewhere, leads to the
// word the studio uses. The search reads all three, the word itself first.
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { WORD_GROUPS, findWords } from "../../lib/words.ts";
import { Dialog } from "../ui/Dialog";
import { cn } from "../ui/cn";

export function Glossary({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const found = useMemo(() => findWords(query), [query]);
  const searching = query.trim().length > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Ordlista" width={680}>
      <div className="flex flex-col gap-4 pb-1">
        <label className="flex h-9 items-center gap-2 rounded-md border border-line-strong bg-well px-2.5 focus-within:border-brass/60">
          <Search aria-hidden className="size-4 shrink-0 text-faint" />
          <input
            type="search"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök ett ord eller ett annat namn: släpar, A3, tillbakagången, IDLE …"
            aria-label="Sök i ordlistan"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
        </label>
        {found.length ? (
          (searching ? [null] : WORD_GROUPS).map((group) => {
            const words = group ? found.filter((w) => w.grupp === group) : found;
            if (!words.length) return null;
            return (
              <section key={group ?? "träffar"} className="flex flex-col gap-1">
                {group ? <h3 className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">{group}</h3> : null}
                <dl className="flex flex-col">
                  {words.map((w, i) => (
                    <div key={w.ord} className={cn("grid grid-cols-[150px_minmax(0,1fr)] gap-x-4 py-2", i > 0 && "border-t border-line")}>
                      <dt className="text-sm font-semibold text-ink">{w.ord}</dt>
                      <dd className="flex flex-col gap-0.5">
                        <span className="text-sm leading-5 text-soft">{w.betyder}</span>
                        {w.sager.length ? <span className="text-xs leading-4 text-dim">Säger också: {w.sager.join(" · ")}</span> : null}
                        {w.aven.length ? <span className="text-xs leading-4 text-faint">Kallas också: {w.aven.join(" · ")}</span> : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })
        ) : (
          <p className="py-6 text-center text-sm text-faint">Inget ord i ordlistan matchar ”{query.trim()}”.</p>
        )}
      </div>
    </Dialog>
  );
}
