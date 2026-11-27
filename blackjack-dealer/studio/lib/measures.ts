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

/** A table's cell without a file's name: what plainText leaves, and a bare path or file name left in it (with its parenthesis). */
const plainCell = (text: string) =>
  plainText(text)
    .replace(/\s*\([^()]*(?:[/\\]|\.(?:ts|json|md|py|yaml|glb|blend)\b)[^()]*\)/g, "")
    .replace(/\S*[/\\]\S+|\S+\.(?:ts|json|md|py|yaml|glb|blend)\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

/**
 * MATT.md as the page shows it: the heading of each part (## …) with its headings and tables under it. The studio shows and
 * does not explain (blackjack-dealer/AGENTS.md): the paragraphs and lists, which tell how to read the numbers, are left
 * out, as are the title, the part Källorna, the source columns of the tables and every file name in a cell; a part with
 * nothing left goes too.
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
    if (b.typ === "stycke" || b.typ === "lista") continue;
    if (b.typ === "tabell") {
      const keep = b.huvud.map((h, i) => (SOURCE_COLUMNS.has(h) ? -1 : i)).filter((i) => i >= 0);
      if (keep.length < 2) continue;
      here.blocks.push({ typ: "tabell", huvud: keep.map((i) => b.huvud[i]), rader: b.rader.map((r) => keep.map((i) => plainCell(r[i] ?? ""))) });
    } else here.blocks.push({ ...b, text: plainText(b.text) });
  }
  // A heading with no table after it before the next heading or the part's end says nothing on its own.
  for (const s of out) s.blocks = s.blocks.filter((x, i) => x.typ !== "rubrik" || s.blocks.slice(i + 1).find((y) => y.typ === "tabell" || (y.typ === "rubrik" && y.niva <= x.niva))?.typ === "tabell");
  return out.filter((s) => s.blocks.length && s.title !== "Källorna");
}
