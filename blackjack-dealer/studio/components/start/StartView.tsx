"use client";

// Start (/): the studio as the entry to the whole project (Jakob 2026-11-27: "att vår 'studio' blir som grunden i roten
// av projektet"). From the top: what waits for his verdict, the chain from a picture to a film (the root PROJEKTET.md)
// with the workshop that does each step, the workshops themselves (one tile each, with a line of what it is for and where
// in the chain it belongs), and last what lies beside the work. A workshop with a server of its own shows whether it
// runs; the studio starts it when its page is opened.
import { ArrowRight, Clapperboard, Images, ListChecks, Music, Package, PersonStanding, Ruler, Scale, ScanEye, Spade, Speech, Users, Workflow, type LucideIcon } from "lucide-react";
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

const ICONS: Record<Tile["icon"], LucideIcon> = { users: Users, doll: PersonStanding, film: Clapperboard, review: ScanEye, map: Workflow, images: Images, game: Spade, ruler: Ruler, live: Scale, pack: Package, lips: Speech, sound: Music, decisions: ListChecks };

function TileCard({ tile, dealer, count, workshop }: { tile: Tile; dealer: string; count?: number; workshop?: WorkshopState }) {
  const Icon = ICONS[tile.icon];
  const inside = (
    <>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-raised text-brass"><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-md font-semibold text-ink">{tile.name}</h3>
            {count ? <Badge tone="brass">{count}</Badge> : null}
          </div>
          {tile.steps ? <div className="text-xs text-faint">{tile.steps}</div> : null}
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-faint transition-colors group-hover:text-brass" />
      </div>
      <p className="text-sm leading-5 text-soft">{tile.line}</p>
      {workshop ? (
        <div className="mt-auto flex items-center gap-2 text-xs text-faint">
          <span className={cn("size-2 rounded-full", workshop.answers ? "bg-godkand" : "bg-line-hi")} />
          {workshop.answers ? "går" : "startas när du öppnar den"}
        </div>
      ) : null}
    </>
  );
  const classes = "group flex min-h-[132px] flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-inset transition-colors hover:border-line-strong hover:bg-raised/50";
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
  const counts: Record<string, number> = { "/granska/": waiting, "/beslut/": cards };
  const workshopOf = (id?: WorkshopId) => (id ? workshops.find((w) => w.id === id) : undefined);
  const shown = (t: { localOnly?: boolean }) => !(isSnapshot && t.localOnly);

  return (
    <Page title="Start" status={<span>ingången till hela projektet</span>}>
      <div className="flex flex-col gap-10">
        <section className="flex max-w-[92ch] flex-col gap-2">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.015em] text-ink">En dealer som ser verklig ut, från varje spelares plats</h2>
          <p className="text-base leading-6 text-soft">
            Korta filmer av en person som ger kort vid ett blackjackbord. En docka spelar rörelsen exakt vid ett uppmätt bord, och en filmmodell gör om dockans film till personen. Härifrån når du varje del: från bilderna av personen till filmen i spelet.
          </p>
        </section>

        {!isSnapshot && (waiting > 0 || cards > 0) ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-faint">Väntar på dig</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {waiting > 0 ? <TileCard tile={{ name: "Granska", href: "/granska/", icon: "review", line: waiting === 1 ? "En film väntar på din dom." : `${waiting} filmer väntar på din dom.` }} dealer={dealer} count={waiting} /> : null}
              {cards > 0 ? <TileCard tile={{ name: "Beslut", href: "/beslut/", icon: "decisions", line: cards === 1 ? "Ett kort väntar på ditt svar." : `${cards} kort väntar på ditt svar.` }} dealer={dealer} count={cards} /> : null}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-faint">Kedjan, från bild till film</h2>
          <ol className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">
            {START_CHAIN.map((step) => (
              <li key={step.nr} className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-3 shadow-inset">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-lg font-semibold text-brass tabular-nums">{step.nr}</span>
                  <span className="text-sm font-semibold text-ink">{step.name}</span>
                </div>
                <p className="text-xs leading-4 text-dim">{step.line}</p>
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
