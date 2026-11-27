"use client";

// A film's own table and camera on a page about that one film (Granska, Karta). Such a page shows the film as it is, at its own
// table, whatever the menu says, and a link from it into Scen opens Scen at that table (Jakob 2026-11-27: a film is never shown
// under another table's camera; the 3D scene stands at the menu's table and shows only films made there, components/bordet/
// SceneBody.tsx). A film is its tree's table (src/dealer-trees.ts filmSetups); until the trees are read, and in the copy on the
// net, nothing is known and nothing is said.
//   useFilmSetup(take)    the table the film is made at, or null while it is not known
//   <FilmTable take />    "Gjord vid Förra standarden", only when that is not the menu's choice
import { filmSetups } from "../../../src/dealer-trees.ts";
import { UPPSATTNING, type UppsattningId } from "../../../src/uppsattning.ts";
import { useOptionalBank } from "../../lib/bank.ts";
import { NAMN, choiceName } from "../../lib/uppsattning-val.ts";
import { useTrees } from "../map/useTrees";
import { useSetup } from "../shell/SetupProvider";
import { cn } from "../ui/cn";
import { Tooltip } from "../ui/Tooltip";

type FilmRef = { id: string; dealer: string };

export function useFilmSetup(take: FilmRef): UppsattningId | null {
  const trees = useTrees(take.dealer, useOptionalBank()?.readAt ?? null);
  return trees.state === "ready" ? filmSetups(trees.answer?.trees ?? [])(take.id) : null;
}

export function FilmTable({ take, className }: { take: FilmRef; className?: string }) {
  const made = useFilmSetup(take);
  const { id: chosen } = useSetup();
  if (!made || made === chosen) return null;
  return (
    <Tooltip content={`Filmen visas här som den är, vid sitt eget bord och sin egen kamera. I Scen visas den bara vid ${choiceName(made)}; ${NAMN} i menyn står nu på ${UPPSATTNING[chosen].kort}.`}>
      <span className={cn("inline-flex shrink-0 items-center rounded-full border border-line-strong px-2 py-0.5 text-xs text-dim", className)}>Gjord vid {choiceName(made)}</span>
    </Tooltip>
  );
}
