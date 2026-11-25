"use client";

// <DealerSwitch />: whose studio this is, at the top of the menu under the mark: one button per dealer the bank holds takes
// of, the chosen one marked, and beside a name the number of takes waiting for Jakob's word when there are any. A paused
// dealer (data/dealers.json) shows only while it is the chosen one (Jakob 2026-11-18: "en pausad dealer visas bara när en
// adress nämner den"): an address names it (?dealer=<id>, or one of its takes), or an earlier click on it is remembered,
// and then the address carries its word (lib/bank.ts). It then says so quietly: a small pause sign, the words in the
// tooltip. A click chooses the dealer for every view (lib/bank.ts setDealer: the address and the memory follow).
import { useBank } from "../../lib/bank.ts";
import { isSnapshot } from "../../lib/mode.ts";
import { cn } from "../ui/cn";
import { Tooltip } from "../ui/Tooltip";

function PauseSign({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" aria-hidden className={cn("size-2 shrink-0", className)}>
      <rect x="1" y="1" width="2" height="6" rx="0.6" fill="currentColor" />
      <rect x="5" y="1" width="2" height="6" rx="0.6" fill="currentColor" />
    </svg>
  );
}

export function DealerSwitch() {
  const { dealer, dealers, setDealer } = useBank();
  const who = isSnapshot ? "Jakob" : "dig";
  return (
    // Narrow: the buttons under each other, as wide as the menu. Wide (rail:): the word on its own line and the buttons in a row.
    <div role="group" aria-label="Dealer: vems studio" className="mx-2 mt-2.5 flex shrink-0 flex-col gap-1.5 rail:mx-3 rail:flex-row rail:flex-wrap rail:px-2">
      <span className="text-center text-[9.5px] font-semibold uppercase leading-3 tracking-[0.12em] text-faint rail:w-full rail:text-left rail:text-2xs rail:leading-4 rail:tracking-[0.1em]">Dealer</span>
      {dealers.filter((d) => !d.paused || d.id === dealer).map((d) => {
        const on = d.id === dealer;
        const tip = (
          <span className="flex max-w-64 flex-col gap-0.5">
            <span>
              {d.name} · {d.takes} {d.takes === 1 ? "tagning" : "tagningar"} · {d.waiting ? `${d.waiting} väntar på ${who}` : `inget väntar på ${who}`}
            </span>
            {d.paused ? <span className="text-dim">Pausad: {d.paused}</span> : null}
          </span>
        );
        return (
          <Tooltip key={d.id} content={tip} side="right">
            <button
              type="button"
              aria-pressed={on}
              aria-label={[d.name, d.waiting ? `${d.waiting} väntar` : null, d.paused ? "pausad" : null].filter(Boolean).join(", ")}
              onClick={() => setDealer(d.id)}
              className={cn(
                "relative flex h-7 w-full items-center justify-center gap-1 rounded-md px-1 text-[11.5px] font-medium leading-4 ring-1 ring-inset transition-colors duration-150 focus-visible:outline-offset-0",
                "rail:h-8 rail:w-auto rail:min-w-16 rail:gap-1.5 rail:px-3 rail:text-sm rail:leading-5",
                on ? "bg-raised text-ink ring-brass/55" : d.paused ? "text-faint ring-line hover:bg-raised/60 hover:text-dim" : "text-dim ring-line hover:bg-raised/60 hover:text-ink",
              )}
            >
              <span className="truncate">{d.name}</span>
              {d.paused ? <PauseSign className={on ? "text-dim" : "text-faint/80"} /> : null}
              {d.waiting ? (
                <span
                  className={cn(
                    "absolute -right-1.5 -top-1.5 h-4 min-w-4 rounded-full bg-brass px-1 text-center text-[10px] font-semibold leading-4 text-brass-ink tabular-nums ring-2",
                    on ? "ring-raised" : "ring-surface",
                  )}
                >
                  {d.waiting}
                </span>
              ) : null}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
