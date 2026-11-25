"use client";

// Inspelning's keys and gestures beside the doll's picture: Ctrl+Z ångra, the arrows nudge the chosen place (a pixel of the
// plan's picture, Shift ten), and a run of changes (key presses, or the card's place dragged in the doll's picture) is one
// step for Ångra.
import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { Place, PlacementPlan } from "../../../src/placement-model.ts";
import { PLAN_VIEW, nudged } from "../../lib/placement.ts";
import { draftActions } from "./useDraft.ts";

/** Changes that come in a run (arrow keys, a drag in the doll's picture) are one step: the run ends after a short pause. */
export function useGesture() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  return useCallback((fn: (plan: PlacementPlan) => PlacementPlan) => {
    if (!timer.current) draftActions.begin();
    else clearTimeout(timer.current);
    draftActions.move(fn);
    timer.current = setTimeout(() => {
      timer.current = null;
      draftActions.end();
    }, 700);
  }, []);
}

/**
 * Ctrl+Z takes the draft's last step back, except while text is written. The arrows move the chosen place while nothing
 * else has the keys: the page itself, the picture's column (`area`) or the right column ([data-nudge]), never a field or
 * the doll's controls laid into step 2 (they are the doll lab's).
 */
export function usePlanKeys({ place, editable, area }: { place: Place; editable: boolean; area: RefObject<HTMLElement | null> }) {
  const run = useGesture();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const writing = !!el.closest?.("input, textarea, select, [contenteditable='true']");
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "z" && !writing) {
        e.preventDefault();
        draftActions.undo();
        return;
      }
      if (writing || e.ctrlKey || e.metaKey || e.altKey || !e.key.startsWith("Arrow") || !editable) return;
      if (el.closest?.("[data-docklabb-styr]")) return;
      const free = el === document.body || !!area.current?.contains(el) || !!el.closest?.("[data-nudge]");
      if (!free) return;
      e.preventDefault();
      run((p) => nudged(p, place, PLAN_VIEW, e.key, e.shiftKey) ?? p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable, run, place, area]);
}
