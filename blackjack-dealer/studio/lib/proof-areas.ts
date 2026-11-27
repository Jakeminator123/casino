// The proofs' areas (Jakob 2026-11-27: "kategoriseras och får organisation"): the field `area` of a proof.json, one of a
// few fixed words, by which Granska's part Prov groups the proofs (components/proofs/ProofGrid.tsx). And what each proof
// stands at for him (standing, below), how much room it takes, and what tells two proofs with the same title apart. Data
// and pure functions, no DOM.
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

/**
 * The proofs in groups by area, in the list's order, those without one last; empty groups left out. Within a group the
 * proofs where the judge and the external voice disagree come first (Jakob needs to look at those), the rest as given.
 */
export function byArea<T extends Pick<Proof, "area" | "domare">>(proofs: readonly T[]): { word: string; proofs: T[] }[] {
  const known = new Set<string>(AREAS.map((a) => a.id));
  const first = (list: T[]) => [...list.filter(oense), ...list.filter((p) => !oense(p))];
  const groups: { word: string; proofs: T[] }[] = AREAS.map((a) => ({ word: a.word, proofs: first(proofs.filter((p) => p.area === a.id)) }));
  groups.push({ word: NO_AREA, proofs: first(proofs.filter((p) => !p.area || !known.has(p.area))) });
  return groups.filter((g) => g.proofs.length);
}

// ── The judge (the skill doma): its verdict in his place, never his ─────────
/** The judge's verdict word ("Bra", "Nja", "Inte bra"), or null where no judge has judged the proof. */
export const domOf = (p: Pick<Proof, "domare">): string | null => (typeof p.domare?.dom === "string" && p.domare.dom.trim() ? p.domare.dom.trim() : null);
/** The external voice's verdict word, or null. */
export const externOf = (p: Pick<Proof, "domare">): string | null => (typeof p.domare?.extern?.dom === "string" && p.domare.extern.dom.trim() ? p.domare.extern.dom.trim() : null);
/** The judge and the external voice disagree: marked, and first in its area. */
export const oense = (p: Pick<Proof, "domare">): boolean => p.domare?.oenig === true;
/** The tone of a verdict word, as the takes' chips have it. */
export const domTone = (dom: string | null): "ok" | "remark" | "bad" | "neutral" => (dom === "Bra" ? "ok" : dom === "Nja" ? "remark" : dom === "Inte bra" ? "bad" : "neutral");
/** A reason as a sentence (the external voice's carry where it is seen: "… (fil, ruta 30–42)" is left to the sentence alone). */
export const skalText = (s: string | { vad?: string } | null | undefined): string => (typeof s === "string" ? s : (s?.vad ?? "")).trim();

/**
 * Where a proof stands for him. "vantar": a card in Beslut asks him about it and has no answer. "domt": he has answered its
 * card or written a note on it. "utan": neither, and for him that too waits for his verdict (Jakob 2026-11-27: a proof
 * without his verdict is something that waits for him), only not asked in Beslut.
 */
export type Standing = "vantar" | "domt" | "utan";
export const STANDING_WORD: Record<Standing, string> = { vantar: "Väntar på dig i Beslut", domt: "Du har sagt ditt", utan: "Utan din dom" };

export function standing(id: string, cards: readonly { proof?: string; answer: unknown }[], notesOnIt: number): Standing {
  const own = cards.filter((c) => c.proof === id);
  if (own.some((c) => !c.answer)) return "vantar";
  if (own.some((c) => c.answer) || notesOnIt > 0) return "domt";
  return "utan";
}

/** The line over the proofs: how many, how many without his verdict, how many asked in Beslut, how many the judge failed (and where the two judges disagree), and their room. */
export function proofsLine(stands: readonly Standing[], bytes: number, judge: { falld: number; oense: number } = { falld: 0, oense: 0 }): string {
  const utan = stands.filter((s) => s === "utan").length, vantar = stands.filter((s) => s === "vantar").length;
  return [`${stands.length} prov`, `${utan} utan din dom`, ...(vantar ? [`${vantar} väntar på dig i Beslut`] : []), ...(judge.falld ? [`${judge.falld} fällda av domaren`] : []), ...(judge.oense ? [`${judge.oense} där domarna är oense`] : []), sizeWord(bytes)].join(" · ");
}

/**
 * The second line of a card whose title another proof shares ("Standarddockan" five times): the rest of its title after the
 * name, else the first sentence of its description, else its folder's name; null when the title is its own.
 */
export function telling(p: Pick<Proof, "id" | "description">, rest: string, shared: boolean): string | null {
  if (!shared) return null;
  if (rest) return rest;
  const first = (p.description ?? "").replace(/^[A-ZÅÄÖ ]{3,}:\s*/, "").split(/(?<=[.!?])\s/)[0]?.trim();
  return first ? (first.length > 110 ? `${first.slice(0, 108)}…` : first) : p.id;
}

/** The room a proof takes: its films and pictures together, in bytes. */
export const proofBytes = (p: Pick<Proof, "files">): number => p.files.reduce((s, f) => s + (f.bytes || 0), 0);

/** Bytes in plain words: "412 MB", "1,3 GB". */
export function sizeWord(bytes: number): string {
  const mb = bytes / 1048576;
  return mb >= 1024 ? `${(mb / 1024).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} GB` : `${mb.toLocaleString("sv-SE", { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
}
