"use client";

// Start (/): the studio as the entry to the whole project (Jakob 2026-11-27: "att vår 'studio' blir som grunden i roten
// av projektet"). From the top: what waits for his verdict, the chain from a picture to a film (the root PROJEKTET.md)
// with the workshops that do each step, the workshops themselves (one tile each: a name, a count, a dot for a workshop's
// own server), and last what lies beside the work. Names only: what each is for is in the glossary (blackjack-dealer/
// AGENTS.md, "Studion visar, den förklarar inte").
import { Archive, ArrowRight, Clapperboard, Images, ListChecks, Music, PersonStanding, Ruler, ScanEye, Spade, SquareSplitHorizontal, Users, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Page } from "../shell";
import { Badge } from "../ui";
import { cn } from "../ui/cn";
import { useDecisions } from "../decisions/useDecisions";
import { useBank } from "../../lib/bank.ts";
import { dealerHref } from "../../lib/dealer.ts";
import { waitingCount } from "../../lib/decisions.ts";
import { isSnapshot } from "../../lib/mode.ts";
import { awaitingJakob } from "../../lib/verdict.ts";
import { workshopStates, type WorkshopId, type WorkshopState } from "../../lib/workshops.ts";
import { START_CHAIN, START_SIDE, START_TILES, type Tile } from "../../lib/start.ts";
import { getProofs } from "../../lib/api.ts";
import { getProofNotes } from "../../lib/proof-notes.ts";
import { hisWord } from "../../lib/proof-areas.ts";

const ICONS: Record<Tile["icon"], LucideIcon> = { users: Users, doll: PersonStanding, film: Clapperboard, review: ScanEye, map: Workflow, images: Images, game: Spade, ruler: Ruler, live: SquareSplitHorizontal, sound: Music, decisions: ListChecks, library: Archive };

/** A workshop's tile: its icon, its name, a count where something waits, and whether its own server runs. */
function TileCard({ tile, dealer, count, workshop }: { tile: Tile; dealer: string; count?: number; workshop?: WorkshopState }) {
  const Icon = ICONS[tile.icon];
  const inside = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-raised text-brass"><Icon className="size-5" /></span>
      <h3 className="min-w-0 flex-1 truncate text-md font-semibold text-ink">{tile.name}</h3>
      {count ? <Badge tone="brass">{count}</Badge> : null}
      {workshop ? <span title={workshop.answers ? "går" : "startas när den öppnas"} className={cn("size-2 shrink-0 rounded-full", workshop.answers ? "bg-godkand" : "bg-line-hi")} /> : null}
      <ArrowRight className="size-4 shrink-0 text-faint transition-colors group-hover:text-brass" />
    </>
  );
  const classes = "group flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-inset transition-colors hover:border-line-strong hover:bg-raised/50";
  return tile.href.endsWith(".html") ? <a href={tile.href} className={classes}>{inside}</a> : <Link href={dealerHref(tile.href, dealer)} className={classes}>{inside}</Link>;
}

export function StartView() {
  const { graph, dealer } = useBank();
  const decisions = useDecisions();
  const [workshops, setWorkshops] = useState<WorkshopState[]>([]);
  useEffect(() => {
    if (isSnapshot) return;
    let live = true;
    const read = () => workshopStates().then((w) => { if (live) setWorkshops(w); });
    void read();
    const timer = setInterval(read, 8000);
    return () => { live = false; clearInterval(timer); };
  }, []);
  const waiting = useMemo(() => (graph ? awaitingJakob(graph).length : 0), [graph]);
  const cards = decisions.answer ? waitingCount(decisions.answer.decisions) : 0;
  // The proofs he has not said his word on (hisWord, the one answer Prov and Biblioteket read too).
  const [proofsRead, setProofsRead] = useState<{ ids: string[]; notes: { proof?: string }[] } | null>(null);
  useEffect(() => {
    if (isSnapshot) return;
    let live = true;
    Promise.all([getProofs(), getProofNotes()]).then(([p, n]) => { if (live) setProofsRead({ ids: p.proofs.map((x) => x.id), notes: n.notes }); }, () => {});
    return () => { live = false; };
  }, []);
  const proofsWaiting = proofsRead ? proofsRead.ids.filter((id) => hisWord(id, decisions.answer?.decisions ?? [], proofsRead.notes) !== "domt").length : 0;
  const counts: Record<string, number> = { "/granska/": waiting, "/beslut/": cards };
  const workshopOf = (id?: WorkshopId) => (id ? workshops.find((w) => w.id === id) : undefined);
  const shown = (t: { localOnly?: boolean }) => !(isSnapshot && t.localOnly);

  return (
    <Page title="Start">
      <div className="flex flex-col gap-8">
        {!isSnapshot && (waiting > 0 || cards > 0 || proofsWaiting > 0) ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-faint">Väntar på dig</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {waiting > 0 ? <TileCard tile={{ name: "Granska", href: "/granska/", icon: "review" }} dealer={dealer} count={waiting} /> : null}
              {cards > 0 ? <TileCard tile={{ name: "Beslut", href: "/beslut/", icon: "decisions" }} dealer={dealer} count={cards} /> : null}
              {proofsWaiting > 0 ? <TileCard tile={{ name: "Prov", href: "/granska/?vy=prov", icon: "review" }} dealer={dealer} count={proofsWaiting} /> : null}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-faint">Kedjan</h2>
          <ol className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">
            {START_CHAIN.map((step) => (
              <li key={step.nr} className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-3 shadow-inset">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-lg font-semibold text-brass tabular-nums">{step.nr}</span>
                  <span className="text-sm font-semibold text-ink">{step.name}</span>
                </div>
                <div className="mt-auto flex flex-wrap gap-1 pt-1">
                  {step.where.filter(shown).map((w) => (
                    <Link key={w.href} href={dealerHref(w.href, dealer)} className="rounded-full bg-raised px-2 py-0.5 text-2xs text-soft transition-colors hover:bg-overlay hover:text-ink">
                      {w.name}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-faint">Verkstäderna</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {START_TILES.filter(shown).map((t) => <TileCard key={t.href} tile={t} dealer={dealer} count={counts[t.href]} workshop={workshopOf(t.workshop)} />)}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-faint">Vid sidan</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {START_SIDE.filter(shown).map((t) => <TileCard key={t.href} tile={t} dealer={dealer} workshop={workshopOf(t.workshop)} />)}
          </div>
        </section>
      </div>
    </Page>
  );
}
