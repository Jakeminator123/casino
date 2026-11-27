// The measures for the view Mått: MATT.md's own text, as the repo's matt.ts writes it out of the code at this moment
// (GET /api/matt → `node matt.ts --json`, tools/casino-routes.ts), cut into headings, paragraphs, lists and tables. Not a
// second source: the page shows what MATT.md says, read anew each time. What is written for the one who changes a
// measure (which file holds it, which command writes the file) is left out here, since the studio names no files
// (blackjack-dealer/AGENTS.md, "Vanlig svenska i studion"): the columns Källa, the part Källorna and the file names in
// the text. Data and pure functions, no DOM.
import { labUrl } from "./lab.ts";

export type Block =
  | { typ: "rubrik"; niva: number; text: string }
  | { typ: "stycke"; text: string }
  | { typ: "lista"; rader: string[] }
  | { typ: "tabell"; huvud: string[]; rader: string[][] };
export type Measures = { block: Block[]; olasta: number };

export async function getMeasures(): Promise<Measures> {
  const response = await fetch(labUrl("/api/matt")).catch(() => null);
  const body = (await response?.json().catch(() => null)) as (Measures & { error?: string }) | null;
  if (!response?.ok || !body?.block) throw new Error(body?.error ?? "Måtten kunde inte läsas.");
  return body;
}

/** Columns that only say where a number stands in the code. */
const SOURCE_COLUMNS = new Set(["Källa", "Fil", "Hur", "Läst"]);
/** A code span that names a file, a folder or a command (the other code spans are words, shown as words). */
const FILE_LIKE = /[/\\]|\.(?:ts|json|md|py|yaml|glb|blend)\b|^node\b|--/;

/** A parenthesis that holds a code span: "(`table-lens.ts PLAY_LENS`)" says where a number is written, and goes. */
const stripSourceParens = (text: string) => text.replace(/\s*\((?:[^()]|\([^()]*\))*`[^`]*`(?:[^()]|\([^()]*\))*\)/g, "");

/**
 * A text without what names a file: parentheses that hold a code span go; a sentence that still names a file or a
 * command goes; a code span left that is a word (the measurement's own English names) stays, in quotes.
 */
export function plainText(text: string): string {
  const sentences = stripSourceParens(text).split(/(?<=[.!?:])\s+(?=[A-ZÅÄÖ"*0-9])/);
  const kept = sentences.filter((s) => ![...s.matchAll(/`([^`]+)`/g)].some((m) => FILE_LIKE.test(m[1])));
  return kept.join(" ").replace(/`([^`]+)`/g, "”$1”").replace(/\s+([,.;])(?=\s|$)/g, "$1").trim();
}

export type Section = { title: string; id: string; blocks: Block[] };

/**
 * MATT.md as the page shows it: the heading of each part (## …) with its blocks under it, the first part being the
 * introduction. Left out: the title, the paragraph for the one who writes the file, the part Källorna, the source
 * columns of the tables and the file names of the text; an empty paragraph or list after that goes too.
 */
export function measureSections(blocks: readonly Block[]): Section[] {
  const out: Section[] = [{ title: "Så läses måtten", id: "inledning", blocks: [] }];
  for (const b of blocks) {
    if (b.typ === "rubrik" && b.niva === 1) continue;
    if (b.typ === "rubrik" && b.niva === 2) {
      out.push({ title: b.text, id: `del-${out.length}`, blocks: [] });
      continue;
    }
    const here = out[out.length - 1];
    if (b.typ === "stycke") {
      if (b.text.startsWith("**Den här filen")) continue;
      const text = plainText(b.text);
      if (text) here.blocks.push({ typ: "stycke", text });
    } else if (b.typ === "lista") {
      const rader = b.rader.map(plainText).filter(Boolean);
      if (rader.length) here.blocks.push({ typ: "lista", rader });
    } else if (b.typ === "tabell") {
      const keep = b.huvud.map((h, i) => (SOURCE_COLUMNS.has(h) ? -1 : i)).filter((i) => i >= 0);
      if (keep.length < 2) continue;
      here.blocks.push({ typ: "tabell", huvud: keep.map((i) => b.huvud[i]), rader: b.rader.map((r) => keep.map((i) => plainText(r[i] ?? ""))) });
    } else here.blocks.push({ ...b, text: plainText(b.text) });
  }
  return out.filter((s) => s.blocks.length && s.title !== "Källorna");
}
