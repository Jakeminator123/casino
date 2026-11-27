// The proofs' areas (Jakob 2026-11-27: "kategoriseras och får organisation"): the field `area` of a proof.json, one of a
// few fixed words, by which Granska's part Prov groups the proofs (components/proofs/ProofGrid.tsx). And what each proof
// stands at for him: waiting for his verdict (a card in Beslut without his answer, or takes it names that wait for him),
// judged (his answer on its card, or a note of his on it), or neither; and how much room it takes. Data and pure
// functions, no DOM.
import type { Proof } from "./api.ts";

export const AREAS = [
  { id: "rorelser", word: "Rörelser" },
  { id: "ansikte-och-hander", word: "Ansikte och händer" },
  { id: "filmer", word: "Filmer" },
  { id: "bord-och-kamera", word: "Bord och kamera" },
  { id: "avatarer", word: "Avatarer" },
  { id: "studion", word: "Studion" },
] as const;
export type AreaId = (typeof AREAS)[number]["id"];
/** The word for a proof without an area, or with one that is not in the list. */
export const NO_AREA = "Utan område";

export const areaWord = (area: string | null | undefined): string => AREAS.find((a) => a.id === area)?.word ?? NO_AREA;

/** The proofs in groups by area, in the list's order, those without one last; empty groups left out. */
export function byArea<T extends Pick<Proof, "area">>(proofs: readonly T[]): { word: string; proofs: T[] }[] {
  const known = new Set<string>(AREAS.map((a) => a.id));
  const groups: { word: string; proofs: T[] }[] = AREAS.map((a) => ({ word: a.word, proofs: proofs.filter((p) => p.area === a.id) }));
  groups.push({ word: NO_AREA, proofs: proofs.filter((p) => !p.area || !known.has(p.area)) });
  return groups.filter((g) => g.proofs.length);
}

export type Standing = "vantar" | "domt" | "inget";
export const STANDING_WORD: Record<Standing, string> = { vantar: "Väntar på dig", domt: "Du har sagt ditt", inget: "Ingen dom" };

/** Where a proof stands for him, from the cards in Beslut, his notes and the takes it names that wait for him. */
export function standing(id: string, cards: readonly { proof?: string; answer: unknown }[], notesOnIt: number, takesWaiting: number): Standing {
  const own = cards.filter((c) => c.proof === id);
  if (own.some((c) => !c.answer) || takesWaiting > 0) return "vantar";
  if (own.some((c) => c.answer) || notesOnIt > 0) return "domt";
  return "inget";
}

/** The room a proof takes: its films and pictures together, in bytes. */
export const proofBytes = (p: Pick<Proof, "files">): number => p.files.reduce((s, f) => s + (f.bytes || 0), 0);

/** Bytes in plain words: "412 MB", "1,3 GB". */
export function sizeWord(bytes: number): string {
  const mb = bytes / 1048576;
  return mb >= 1024 ? `${(mb / 1024).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} GB` : `${mb.toLocaleString("sv-SE", { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
}
