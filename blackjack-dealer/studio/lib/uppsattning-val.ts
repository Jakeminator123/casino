// The studio's one choice of table and camera, "Bord och kamera" (Jakob 2026-11-27: the set-up cloned from the live table is
// the new standard, and the former one stays as a choice in the studio's menus). The set-ups, their names, the default and
// the address word are the source's (src/uppsattning.ts); this file only chooses among them: the address's word when it
// names one, else the remembered choice of this browser, else the source's default. The word "uppsättning" is not shown to
// Jakob in this sense (it is a dealer's set of anchors to him): the studio says "Bord och kamera". Pure; the memory's key is
// here, the reading of the browser is in components/shell/SetupProvider.tsx. Tests: studio/tests/uppsattning-val.test.ts.
import { ADRESSORD, NAMN, UPPSATTNING, UPPSATTNINGAR, VALETS_FORVAL, lasUppsattning, type UppsattningId } from "../../src/uppsattning.ts";

export type { UppsattningId };
export { ADRESSORD, NAMN, VALETS_FORVAL, lasUppsattning };

/** Where this browser remembers the choice (as the dealer switch remembers its own, lib/dealer.ts DEALER_MEMORY). */
export const UPPSATTNING_MEMORY = "studio.bordOchKamera";

/** The choices the menu shows, in the source's order, with the source's names, a short word for a narrow menu, and one line on what each is. */
export const CHOICES: readonly { id: UppsattningId; namn: string; kort: string; om: string }[] = UPPSATTNINGAR.map((id) => ({
  id,
  namn: UPPSATTNING[id].namn,
  kort: id === "live" ? "Live" : "Förra",
  om: UPPSATTNING[id].om,
}));

/** The choice: the address's word, else the remembered one, else the source's default. A word that names no set-up is passed over. */
export const chooseUppsattning = (address: string | null | undefined, remembered: string | null | undefined): UppsattningId =>
  lasUppsattning(address) ?? lasUppsattning(remembered) ?? VALETS_FORVAL;

/** An address with the choice's word set (a page that reads it: the editor, the game): "/x/?a=1" → "/x/?a=1&uppsattning=live". */
export function withUppsattning(href: string, id: UppsattningId): string {
  const at = href.indexOf("?"), path = at < 0 ? href : href.slice(0, at);
  const q = new URLSearchParams(at < 0 ? "" : href.slice(at + 1));
  q.set(ADRESSORD, id);
  return `${path}?${q}`;
}

/** The choice's name where Jakob sees it. */
export const choiceName = (id: UppsattningId): string => UPPSATTNING[id].namn;
