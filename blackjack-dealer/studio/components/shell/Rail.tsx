"use client";

// The menu, the column on the left of every view. From the top: the studio's mark and name, whose studio it is
// (DealerSwitch, one button per dealer), the views with the active one marked and a count where it helps (the chosen
// dealer's takes waiting for Jakob beside Granska; beside Karta the number of the tree the game plays, "22/36 steg", from
// src/dealer-trees.ts countWord, as Karta's row shows it), then Beslut and Ordlista, the pages beside the studio (Ljud,
// Modeller and the trial of the graphic: plain pages with their own look, opened in the same tab) and last whether the
// server answers. A view's link keeps the chosen dealer in the address.
//
// One row is drawn in two ways (app/globals.css, --breakpoint-rail): in a window wide enough, an icon and a word on a line
// with the count at its right end; in a narrow window or on a phone, the icon with a small word under it.
//
// In the online copy (lib/mode.ts) the pages beside the studio and Beslut are not there, so they are not drawn; instead
// the bot is there: the view Önskemål (with the answers from Jakob not yet seen) and "Fråga", which opens and closes the
// panel (components/bot).
import { BookOpen, Box, Images, Inbox, LayoutPanelLeft, ListChecks, MessageCircleQuestion, ScanEye, Spade, Speech, Volume2, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ComponentType } from "react";
import { useBank } from "../../lib/bank.ts";
import { dealerHref } from "../../lib/dealer.ts";
import { isSnapshot } from "../../lib/mode.ts";
import { waitingCount } from "../../lib/decisions.ts";
import { awaitingJakob, primarCount } from "../../lib/verdict.ts";
import { countWord } from "../../../src/dealer-trees.ts";
import { useBot } from "../bot/BotProvider";
import { useDecisions } from "../decisions/useDecisions";
import { firstTree, useTrees } from "../map/useTrees";
import { useRequests } from "../requests/RequestsProvider";
import { cn } from "../ui/cn";
import { Tooltip } from "../ui/Tooltip";
import { DealerSwitch } from "./DealerSwitch";
import { Glossary } from "./Glossary";

type Icon = ComponentType<{ className?: string }>;
type View = { href: string; label: string; hint: string; icon: Icon };

export const VIEWS: readonly View[] = [
  // Bordet (2026-11-17): the one view of the table, in the studio and in the copy. Its parts hold what Placering (Kortplan),
  // Scen (Scen, Råfilm, Efterarbete) and Beställ were; their old addresses lead there (/, /scen/, /bestall/).
  { href: "/bordet/", label: "Bordet", hint: "Ändra scen, bord, kortplan och utdelning; beställ och efterarbeta filmer", icon: LayoutPanelLeft },
  // Karta holds Primära too since 2026-11-17 (each step with its Primär and secondary films); /primara/ leads there. Since
  // 2026-11-21 it draws the dealer's trees, one at a time, against the 36 steps of his measure.
  { href: "/karta/", label: "Karta", hint: "Nodträden: vilka av de 36 stegen som har film, och vad ett saknat steg behöver", icon: Workflow },
  // Granska holds the proofs too since 2026-11-17 (its part Prov); /prov/ leads there.
  { href: "/granska/", label: "Granska", hint: "Filmer som väntar på ditt beslut, och proven", icon: ScanEye },
  { href: "/material/", label: "Material", hint: "Per dealer: ingångsbild, keystone, ankare, filmer och referenser", icon: Images },
  { href: "/lipsync/", label: "Lipsync", hint: "Läppsynken per dealer: var munnen görs, vad som är inställt och vad som stämmer", icon: Speech },
  { href: "/game/", label: "Casino", hint: "Spela blackjack som i casinot: spelmotorn, marker och reglage, med valt förval", icon: Spade },
];

/**
 * The views the menu shows: the same list in the studio and in the online copy, minus what the copy lacks. The copy carries
 * no lip-sync facts, so it has no Lipsync; Bordet is there Scen, Råfilm and Efterarbete only (no Kortplan, no Kön), and Casino plays there too
 * (the game page runs the engine itself).
 */
const LOCAL_ONLY: readonly string[] = ["/lipsync/"];
const SHOWN: readonly View[] = isSnapshot ? VIEWS.filter((view) => !LOCAL_ONLY.includes(view.href)) : VIEWS;
/** Where the mark at the top leads: the first view of the menu. */
const HOME = "/bordet/";

/** The view of requests to Jakob: only where the bot is (the online copy). */
export const REQUESTS_VIEW: View = { href: "/onskemal/", label: "Önskemål", hint: "Önskemål till Jakob, med status och hans svar", icon: Inbox };

/** What waits for Jakob's answer: only in the studio on his computer (the online copy has no Beslut). */
export const DECISIONS_VIEW: View = { href: "/beslut/", label: "Beslut", hint: "Det som väntar på ditt svar: ett kort per sak", icon: ListChecks };

// The pages beside the studio, reached at their own addresses: the sound and model pages (tools/lab-routes.ts PAGES),
// which become parts of a later view (Efterarbete), and the provisional trial of how a card comes to rest
// (pages/kortlandning.html).
const PAGE_LINKS: readonly { href: string; label: string; icon: Icon }[] = [
  { href: "/sound.html", label: "Ljud", icon: Volume2 },
  { href: "/props.html", label: "Modeller", icon: Box },
  { href: "/kortlandning.html", label: "Grafik (prov)", icon: Spade },
];

const trim = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

/** The view an address belongs to ("/jamfor/" belongs to none). */
export function activeView(pathname: string | null): string | null {
  const here = trim(pathname ?? "/");
  return VIEWS.find((view) => trim(view.href) === here)?.href ?? null;
}

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
      <rect x="8.5" y="5.5" width="15" height="21" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-8 16 16)" />
      <path d="M16 11.2 19.6 16 16 20.8 12.4 16Z" fill="currentColor" transform="rotate(-8 16 16)" />
    </svg>
  );
}

/** A row of the menu, whatever it is (a view's link, a button, a page beside the studio): narrow first, then wide. */
const row = (on: boolean, quiet = false) =>
  cn(
    "group relative mx-2 flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center transition-colors duration-150 focus-visible:outline-offset-0",
    "rail:mx-3 rail:h-9 rail:flex-row rail:gap-3 rail:px-3 rail:py-0 rail:text-left",
    on ? "bg-raised text-ink shadow-inset" : quiet ? "text-faint hover:bg-raised/60 hover:text-ink" : "text-dim hover:bg-raised/60 hover:text-ink",
  );

/** What a row holds: the brass mark of the active one, the icon, the word, a quiet note (Karta's steps) and a count. */
function RowBody({ icon: Icon, label, on = false, note, count, tone = "neutral" }: { icon: Icon; label: string; on?: boolean; note?: string | null; count?: string | null; tone?: "brass" | "neutral" }) {
  return (
    <>
      {on ? <span aria-hidden className="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brass rail:-left-3" /> : null}
      <Icon className={cn("size-5 shrink-0 transition-colors duration-150 rail:size-[18px]", on ? "text-brass" : "text-faint group-hover:text-ink")} />
      <span className="max-w-full text-[11px] font-medium leading-[13px] rail:min-w-0 rail:flex-1 rail:truncate rail:text-sm rail:leading-5">{label}</span>
      {note ? <span className="text-[10px] leading-3 text-faint tabular-nums rail:text-xs rail:leading-4">{note}</span> : null}
      {count ? (
        <span
          className={cn(
            "absolute right-1.5 top-1 h-4 min-w-4 rounded-full px-1 text-center text-[10px] font-semibold leading-4 tabular-nums",
            "rail:static rail:h-5 rail:min-w-5 rail:px-1.5 rail:text-2xs rail:leading-5",
            tone === "brass" ? "bg-brass text-brass-ink" : "bg-overlay text-dim",
          )}
        >
          {count}
        </span>
      ) : null}
    </>
  );
}

function ViewRow({ view, href, active, note, count, tone }: { view: View; href?: string; active: boolean; note?: string | null; count?: string | null; tone?: "brass" | "neutral" }) {
  return (
    <Tooltip content={view.hint} side="right">
      <Link href={href ?? view.href} aria-current={active ? "page" : undefined} className={row(active)}>
        <RowBody icon={view.icon} label={view.label} on={active} note={note} count={count} tone={tone} />
      </Link>
    </Tooltip>
  );
}

/** "Fråga": opens and closes the bot's panel. A row like a view's; marked while the panel is open. */
function AskButton() {
  const bot = useBot();
  if (!bot?.enabled) return null;
  return (
    <Tooltip content={bot.open ? "Stäng Fråga" : "Fråga om dealern, eller tyck till"} side="right">
      <button type="button" aria-pressed={bot.open} onClick={() => bot.setOpen(!bot.open)} className={cn(row(bot.open), "w-auto")}>
        <RowBody icon={MessageCircleQuestion} label="Fråga" on={bot.open} />
      </button>
    </Tooltip>
  );
}

const Rule = () => <div aria-hidden className="mx-4 my-2 h-px shrink-0 bg-line rail:mx-5" />;

export function Rail() {
  const pathname = usePathname();
  const active = activeView(pathname);
  const bot = useBot();
  const requests = useRequests();
  const onRequests = trim(pathname ?? "/") === trim(REQUESTS_VIEW.href);
  const onDecisions = trim(pathname ?? "/") === trim(DECISIONS_VIEW.href);
  const decisions = useDecisions();
  const waitingDecisions = decisions.answer ? waitingCount(decisions.answer.decisions) : 0;
  const [glossary, setGlossary] = useState(false);
  const { graph, status, error, dealer, readAt } = useBank();
  // Karta's number is its tree's: the tree the game plays, as Karta's row counts it. Where the server has no trees (the
  // online copy) Karta draws the bank's map, and the number is its Primär count, as that map's header says.
  const trees = useTrees(dealer, readAt);
  const tree = firstTree(trees.answer);
  const counts = useMemo(() => {
    if (!graph) return null;
    const p = primarCount(graph);
    return { waiting: awaitingJakob(graph).length, karta: tree ? `${countWord(tree.count)} steg` : trees.state === "off" ? `${p.set}/${p.total} primära` : null };
  }, [graph, tree, trees.state]);
  const offline = !!error;
  const who = isSnapshot ? "Kopian" : "Servern";
  const answers = status === "loading" ? "Läser klippbanken…" : offline ? `${who} svarar inte` : `${who} svarar`;

  return (
    // min-h-0, and the list scrolls: in a window too low for the menu (a phone) the list scrolls instead of making the whole
    // frame taller than the window, which would cut off the foot of every view.
    <nav aria-label="Vyer" className="flex h-full min-h-0 w-[72px] flex-col border-r border-line bg-surface rail:w-[208px]">
      <Link
        href={dealerHref(HOME, dealer)}
        aria-label="Dealer Studio, till Bordet"
        className="mx-2 mt-2.5 flex shrink-0 items-center justify-center gap-2.5 rounded-lg py-1.5 text-brass transition-colors hover:bg-raised/60 rail:mx-3 rail:justify-start rail:px-2"
      >
        <Mark />
        <span className="hidden font-display text-md font-semibold tracking-[-0.01em] text-ink rail:block">Dealer Studio</span>
      </Link>
      <DealerSwitch />
      <Rule />
      <ul className="flex min-h-0 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none]">
        {SHOWN.map((view) => (
          <li key={view.href}>
            <ViewRow
              view={view}
              href={dealerHref(view.href, dealer)}
              active={active === view.href}
              note={view.href === "/karta/" ? (counts?.karta ?? null) : null}
              count={view.href === "/granska/" && counts && counts.waiting > 0 ? String(counts.waiting) : null}
              tone="brass"
            />
          </li>
        ))}
        {bot?.enabled ? (
          <>
            <li aria-hidden className="mx-4 my-2 h-px shrink-0 bg-line rail:mx-5" />
            <li>
              <ViewRow view={REQUESTS_VIEW} active={onRequests} count={requests.unseen > 0 ? String(requests.unseen) : null} tone="brass" />
            </li>
          </>
        ) : null}
      </ul>
      {/* The foot never scrolls: Beslut's count stays in sight in any window, and no view moves. */}
      <div className="mt-auto flex shrink-0 flex-col gap-0.5 pb-2 pt-2">
        {isSnapshot ? null : (
          <ViewRow view={DECISIONS_VIEW} href={dealerHref(DECISIONS_VIEW.href, dealer)} active={onDecisions} count={waitingDecisions > 0 ? String(waitingDecisions) : null} tone="brass" />
        )}
        <Tooltip content="Ordlista: studions ord och deras andra namn" side="right">
          <button type="button" onClick={() => setGlossary(true)} aria-haspopup="dialog" className={cn(row(false), "w-auto")}>
            <RowBody icon={BookOpen} label="Ordlista" />
          </button>
        </Tooltip>
        <Glossary open={glossary} onOpenChange={setGlossary} />
        <AskButton />
        {isSnapshot ? null : (
          <>
            <Rule />
            <span className="hidden px-6 pb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-faint rail:block">Sidor bredvid</span>
            {PAGE_LINKS.map(({ href, label, icon }) => (
              <a key={href} href={href} className={row(false, true)}>
                <RowBody icon={icon} label={label} />
              </a>
            ))}
          </>
        )}
        <Rule />
        <Tooltip
          content={
            status === "loading"
              ? "Läser klippbanken…"
              : offline
                ? `${who} svarar inte: ${error?.message}`
                : isSnapshot
                  ? "Kopian svarar · klippbanken är fryst som den var när kopian gjordes"
                  : "Servern svarar · klippbanken läses var 4:e sekund"
          }
          side="right"
        >
          <span role="status" aria-label={answers} className="mx-2 flex items-center justify-center gap-3 rounded-lg py-1 rail:mx-3 rail:justify-start rail:px-3">
            <span className="grid size-[18px] shrink-0 place-items-center">
              <span
                className={cn(
                  "size-2 rounded-full",
                  status === "loading" ? "animate-pulse bg-vantar" : offline ? "bg-underkand shadow-[0_0_0_3px_rgb(224_108_108/0.2)]" : "bg-godkand shadow-[0_0_0_3px_rgb(79_178_127/0.16)]",
                )}
              />
            </span>
            <span className={cn("hidden text-xs rail:block", offline ? "text-[#ef8b8b]" : "text-faint")}>{answers}</span>
          </span>
        </Tooltip>
      </div>
    </nav>
  );
}
