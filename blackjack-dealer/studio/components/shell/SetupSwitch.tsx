"use client";

// <SetupSwitch />: the studio's one choice of table and camera, under the dealer switch at the top of the menu: "Standard", with
// Live and Förra (Jakob 2026-11-27: the whole is Livestandarden or Förra standarden; every name is the source's,
// src/uppsattning.ts, the short ones on the buttons and the whole names in the tooltip), the chosen one marked. A click
// chooses for every view and is remembered (components/shell/SetupProvider.tsx). The views that read it pass its word on:
// Dockan to the editor, Casino to the game, Mått marks it, Filmverkstaden builds Scen under it with its own play view, plays there
// only the films made at it (components/bordet/SceneBody.tsx), and sends it with a new order (the store makes the draft there, or
// says why not). Inspelning's doll stands at the former table.
import { isSnapshot } from "../../lib/mode.ts";
import { CHOICES, NAMN } from "../../lib/uppsattning-val.ts";
import { cn } from "../ui/cn";
import { Tooltip } from "../ui/Tooltip";
import { useSetup } from "./SetupProvider";

const LABEL = "text-center text-[9.5px] font-semibold uppercase leading-3 tracking-[0.12em] text-faint rail:w-full rail:text-left rail:text-2xs rail:leading-4 rail:tracking-widest";

/** Where the choice holds today, said in the tooltip. */
const SETUP_REACH = "Gäller i Dockan, i Mått, i Casino och i Filmverkstaden: Scen och spelvyn går efter valet, Scen spelar bara filmer som är gjorda vid vald standard, och en ny beställning görs vid den. Dockan i Inspelning står ännu vid förra standardens bord.";

export function SetupSwitch() {
  const { id, set } = useSetup();
  if (isSnapshot) return null;
  return (
    <div role="group" aria-label={NAMN} className="mx-2 mt-2.5 flex shrink-0 flex-col gap-1.5 rail:mx-3 rail:flex-row rail:flex-wrap rail:px-2">
      <span className={LABEL}>{NAMN}</span>
      {CHOICES.map((c) => {
        const on = c.id === id;
        return (
          <Tooltip key={c.id} content={<span className="flex max-w-64 flex-col gap-0.5"><span>{c.namn}: {c.om}</span><span className="text-dim">{SETUP_REACH}</span></span>} side="right">
            <button
              type="button"
              aria-pressed={on}
              aria-label={c.namn}
              onClick={() => set(c.id)}
              className={cn(
                "relative flex h-7 w-full items-center justify-center rounded-md px-1 text-[11.5px] font-medium leading-4 ring-1 ring-inset transition-colors duration-150 focus-visible:outline-offset-0",
                "rail:h-8 rail:w-auto rail:min-w-16 rail:px-3 rail:text-sm rail:leading-5",
                on ? "bg-raised text-ink ring-brass/55" : "text-dim ring-line hover:bg-raised/60 hover:text-ink",
              )}
            >
              <span className="truncate">{c.kort}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
