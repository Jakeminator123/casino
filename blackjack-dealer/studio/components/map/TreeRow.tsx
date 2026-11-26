"use client";

// The choice at the top of Karta (Jakob 2026-11-26: "för en vald dealer som t.ex. PAOW kunna se de olika nodträden som i en
// rullgardinsmeny"): ONE list for what the map shows, in place of a row of tabs and a separate button for the compositions.
//   Alla träd      every tree of the dealer in one net (TreeNet.tsx, ?trad=alla)
//   Träd           each tree with its A1, its name, its state and its number (n/36, its first way's: what the game plays)
//   Kompositioner  each composition with its trees' A1, its name and its number, and "Ny komposition" last
// A tree's further way (Tatuerad nyp on Tatuerad's A1) is no row of its own: it is chosen on the map, beside the tree
// (KartaView WaySwitch). The choice is in the address (?trad=<id>, ?komposition=<id>), so a link opens it. Prova i Casino
// beside the list opens the Casino with the dealer and the tree (or way) on the map (lib/casino.ts casinoAddress): its films
// only, a card without a film laid without a hand (src/game-page.ts); a composition has its own beside Spara. Also the words
// for a tree in a line of text (treeChip, Bordet's guide).
import * as RS from "@radix-ui/react-select";
import { Check, ChevronDown, Network, Play, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { HANDS_WORD, compositionWord, handsNote, type CompositionView } from "../../../src/composition.ts";
import { ALL_TREES, countWord, type TreeView } from "../../../src/dealer-trees.ts";
import { casinoAddress } from "@/lib/casino";
import { withDealer } from "@/lib/dealer";
import type { EntryAnswer } from "@/lib/media";
import { CASINO_PRESET } from "@/lib/scene-presets";
import { buttonClasses, cn } from "@/components/ui";
import { coverOfEntry } from "../material/Tile";
import { ProofStill } from "../proofs";
import { useMedia } from "./useOlder";

const STATE_WORD: Record<string, string> = { spelas: "spelas", byggs: "byggs", vilar: "vilar" };
/** The word in Karta's address for a composition that is not saved yet. */
export const NEW_COMPOSITION = "ny";
/** The list's value for a composition: its id with this mark, so that it never meets a tree's id. */
const COMPOSED = "k:";

/** A tree in a line of text (Bordet's guide): its name, its number, and its state unless the game plays it. */
export const treeChip = (v: Pick<TreeView, "tree" | "count">): string => `${v.tree.name} ${countWord(v.count)}${v.tree.state !== "spelas" ? ` · ${STATE_WORD[v.tree.state]}` : ""}`;

const withName = (href: string, dealer: string): string => {
  const at = href.indexOf("?");
  return `${href.slice(0, at)}${withDealer(href.slice(at), dealer)}`;
};
/** The Casino with Casino's look, the dealer named and only the tree's films: /game/?forval=…&trad=tatuerad&dealer=paow. */
export const trialHref = (dealer: string, tree: string): string => withName(casinoAddress(CASINO_PRESET, {}, null, tree), dealer);
/** The same with a composition played: /game/?forval=…&komposition=casino-tatuerad&dealer=paow. */
export const compositionHref = (dealer: string, id: string): string => withName(casinoAddress(CASINO_PRESET, {}, null, null, id), dealer);

type Media = ReadonlyMap<string, EntryAnswer>;

/** A small picture of a Material entry (a tree's A1); a dashed box where the lab has none to give. */
export function Thumb({ entry, className }: { entry: EntryAnswer | undefined; className?: string }) {
  const cover = entry ? coverOfEntry(entry) : null;
  return (
    <span className={cn("relative block h-6 w-9 shrink-0 overflow-hidden rounded-[3px]", cover ? "bg-well" : "border border-dashed border-line-strong", className)}>
      {cover ? <ProofStill cover={cover} fps={entry?.fps ?? 30} className="absolute inset-0" /> : null}
    </span>
  );
}

/** The pictures of a composition's trees, laid over each other. */
function Thumbs({ entries, media }: { entries: readonly (string | null)[]; media: Media }) {
  return (
    <span className="flex shrink-0 items-center">
      {entries.slice(0, 3).map((entry, i) => (
        <Thumb key={`${entry}${i}`} entry={entry ? media.get(entry) : undefined} className={cn("ring-1 ring-canvas", i > 0 && "-ml-4")} />
      ))}
    </span>
  );
}

/** n/36 as a thin bar and a small number. */
function Meter({ have, total }: { have: number; total: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className="relative block h-[3px] w-9 overflow-hidden rounded-full bg-line-strong">
        <span className="absolute inset-y-0 left-0 rounded-full bg-brass/85" style={{ width: `${total ? (100 * have) / total : 0}%` }} />
      </span>
      <span className="text-[10.5px] leading-none tabular-nums text-faint">
        {have}/{total}
      </span>
    </span>
  );
}

/** A row of the list (and, chosen, the field): a picture, a name, a small word, a meter. */
function Line({ pic, name, word, meter }: { pic: ReactNode; name: string; word?: string | null; meter?: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {pic}
      <span className="truncate text-[13px] font-medium text-ink">{name}</span>
      {word ? <span className="shrink-0 text-[11px] text-faint">{word}</span> : null}
      {meter}
    </span>
  );
}

function Item({ value, title, children }: { value: string; title?: string; children: ReactNode }) {
  return (
    <RS.Item
      value={value}
      title={title}
      className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-7 pr-3 outline-none data-highlighted:bg-overlay"
    >
      <RS.ItemIndicator className="absolute left-2 inline-flex">
        <Check className="size-3.5 text-brass" />
      </RS.ItemIndicator>
      <RS.ItemText>{children}</RS.ItemText>
    </RS.Item>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <RS.Label className="px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">{children}</RS.Label>;
}

export function TreeRow({
  trees,
  chosen,
  onChoose,
  compositions,
  composition = null,
  onCompose,
}: {
  trees: readonly TreeView[];
  /** The tree, way or ALL_TREES the map shows ("" while a composition is open). */
  chosen: string;
  onChoose: (id: string) => void;
  /** The dealer's compositions, where the lab has them; with onCompose they are in the list. */
  compositions?: readonly CompositionView[];
  /** The composition that is open (NEW_COMPOSITION: one that is not saved yet), else none. */
  composition?: string | null;
  onCompose?: (id: string) => void;
}) {
  const media = useMedia();
  // A tree's further ways and a tree that plays another's are not rows of their own.
  const rows = trees.filter((v) => !v.tree.wayOf && !v.tree.shares);
  const picked = composition ? null : (trees.find((v) => v.tree.id === chosen) ?? null);
  const parent = picked?.tree.wayOf ?? picked?.tree.id ?? null;
  const value = composition ? `${COMPOSED}${composition}` : chosen === ALL_TREES ? ALL_TREES : parent;
  const open = composition ? (compositions?.find((c) => c.def.id === composition) ?? null) : null;
  const restOf = (v: TreeView) => v.nodes.find((n) => n.node === "IDLE")?.entry;
  const waysOf = (v: TreeView) => trees.filter((w) => w.tree.wayOf === v.tree.id);
  const choose = (next: string) => {
    if (next.startsWith(COMPOSED)) onCompose?.(next.slice(COMPOSED.length));
    else onChoose(next);
  };
  // A composition has its own Prova i Casino beside Spara (CompositionKarta): it plays only what is saved.
  const trial = picked ? trialHref(picked.dealer, picked.tree.id) : null;
  const trialWhat = picked?.tree.name ?? null;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <RS.Root value={value ?? undefined} onValueChange={choose}>
        <RS.Trigger
          aria-label="Vad kartan visar"
          className={cn(
            "group inline-flex h-9 min-w-[240px] max-w-[420px] items-center justify-between gap-2 rounded-md border border-line-strong bg-well pl-2 pr-2.5 text-left text-ink shadow-inset",
            "transition-[border-color] duration-150 hover:border-line-hi data-[state=open]:border-brass/70 focus-visible:outline-none focus-visible:border-brass/70",
          )}
        >
          <span className="min-w-0 truncate">
            <RS.Value placeholder={composition === NEW_COMPOSITION ? "Ny komposition" : "Välj träd"} />
          </span>
          <RS.Icon asChild>
            <ChevronDown className="size-4 shrink-0 text-dim transition-transform duration-150 group-data-[state=open]:rotate-180" />
          </RS.Icon>
        </RS.Trigger>
        <RS.Portal>
          <RS.Content position="popper" sideOffset={6} collisionPadding={12} className="z-50 max-h-[min(var(--radix-select-content-available-height),520px)] min-w-(--radix-select-trigger-width) overflow-hidden rounded-lg border border-line-strong bg-raised shadow-pop data-[state=open]:animate-pop-in">
            <RS.Viewport className="p-1">
              <Item value={ALL_TREES} title="Alla träd i ett nät: A1, grenarna till A2.1, A2.2 och A2.3 och stegen under dem">
                <Line pic={<span className="grid h-6 w-9 shrink-0 place-items-center rounded-[3px] border border-line-strong text-dim"><Network className="size-3.5" /></span>} name="Alla träd" word="nätet" />
              </Item>
              <RS.Group>
                <Heading>Träd</Heading>
                {rows.map((v) => {
                  const ways = waysOf(v);
                  const rest = restOf(v);
                  return (
                    <Item
                      key={v.tree.id}
                      value={v.tree.id}
                      title={`${v.tree.name} (${STATE_WORD[v.tree.state]}): ${v.count.have} av ${v.count.total} steg har en film${ways.length ? `; ${ways.length + 1} grenar från samma A1` : ""}${v.tree.opening ? "; börjar med filmen före spelet" : ""}`}
                    >
                      <Line pic={<Thumb entry={rest ? media.get(rest) : undefined} />} name={v.tree.name} word={`${STATE_WORD[v.tree.state]}${ways.length ? ` · ${ways.length + 1} grenar` : ""}`} meter={<Meter have={v.count.have} total={v.count.total} />} />
                    </Item>
                  );
                })}
              </RS.Group>
              {onCompose && compositions ? (
                <>
                  <RS.Separator className="mx-2 my-1 h-px bg-line" />
                  <RS.Group>
                    <Heading>Kompositioner</Heading>
                    {compositions.map((c) => {
                      // Trees with different hands: said beside the name, as information (Jakob 2026-11-24).
                      const hands = handsNote(c);
                      return (
                        <Item key={c.def.id} value={`${COMPOSED}${c.def.id}`} title={`${c.trees.map((t) => `${t.name} ${Math.round(t.percent)} %`).join(", ")}. ${compositionWord(c.count)} steg har en film, varav ${c.count.own} egna${hands ? `. ${hands}` : ""}`}>
                          <Line pic={<Thumbs entries={c.trees.map((t) => t.rest)} media={media} />} name={c.def.name} word={hands ? HANDS_WORD : null} meter={<Meter have={c.count.have} total={c.count.total} />} />
                        </Item>
                      );
                    })}
                    <Item value={`${COMPOSED}${NEW_COMPOSITION}`} title="Sätt samman två eller fler träd eller grenar">
                      <Line pic={<span className="grid h-6 w-9 shrink-0 place-items-center rounded-[3px] border border-dashed border-line-strong text-dim"><Plus className="size-3.5" /></span>} name="Ny komposition" />
                    </Item>
                  </RS.Group>
                </>
              ) : null}
            </RS.Viewport>
          </RS.Content>
        </RS.Portal>
      </RS.Root>
      {trial && trialWhat ? (
        <Link href={trial} className={buttonClasses({ variant: "quiet", size: "sm" })} title={`Spela ${trialWhat} i Casinot${picked ? `: bara dess filmer (${countWord(picked.count)}), ett kort utan film läggs utan hand` : ""}`}>
          <Play /> Prova i Casino
        </Link>
      ) : null}
    </div>
  );
}
