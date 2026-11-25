"use client";

// The doll in Bordet's Kortplan: Kortplan's one picture, for every step (Jakob 2026-11-25: "Jag vill att vi skapar ett och
// samma läge för detta ... jag vill ha allt i 3d ... Det andra ska raderas."). The doll lab, embedded
// (dealer3d/page/docka.html?inbaddad=1), shows the table, the chosen dealer's doll and the draft plan's cards on the felt in
// 3D, with its view buttons, its note and its transport row. Its controls (Rörelse, Ställning, Giv från, Vändning, Landning,
// Styr with "Spara som standard") the lab lays itself into step 2's host, DollControls: an element React never fills, found
// as [data-docklabb-styr]; their look is the studio's (app/globals.css .docklabb-styr). The talk with the frame, all
// {docklabb: {...}}, the studio's own origin only:
//   to the lab    {place, entry?, play?}  Bordet's card, the pose it is dealt from (the guide tree's anchor, lib/bordet.ts
//                                          treeAnchor) and "Spela kortbanan" (the deal from the start)
//                 {plan}                  the draft plan as it stands, unsaved changes too: when the lab is ready, and 80 ms
//                                          after a change
//                 {attach: true}          lay the controls into the host: when the lab is ready and when a host is mounted anew
//                 {flytta}                true while step 1 is open and the plan can be changed: the card's place can be
//                                          dragged on the felt
//                 {film}                  the dealer's film of the card's deal, {src, label, start, end, speed} (useDollFilm),
//                                          or null where the card has none on this computer: the lab's slider "Filmen" lays
//                                          it over the doll in "Filmens kamera" (Jakob 2026-11-25: "så man kan jämföra videos
//                                          som är skapade med tex dockan"); sent when the lab is ready and when it changes
//   from the lab  {ready: true}           it has started: all of the above is sent then (what is sent before its script runs
//                                          is lost), and again after every new load of the frame
//                 {place, entry}          a card or a pose chosen there (also by a click in the picture), and its answer to
//                                          every {place}: the card is Bordet's, and the pose is told on (onEntry), so that
//                                          step 2 can say where it is not the tree's
//                 {place, saved}          a standard was saved: what step 2 and 3 say of it is read again
//                 {moved: {place, u, v}}  the card's place dragged in the picture (about 20 a second, and once at the end):
//                                          the draft's place in the plan's picture, the drag one step for Ångra; the plan
//                                          sent back after it is what the lab lays the deal from again
// "Dockans filmer" shows the doll's films for the chosen card instead of the picture (DollFilms.tsx); the frame stays loaded
// beside them. The doll is the chosen dealer's own where a doll is named as she is (dealer3d/src/doll.ts), else the standard
// doll, and only for a dealer with her own is a deal ordered from the doll (step 3; lib/orders.ts orderDoll,
// tools/doll-order.ts): what is saved in the lab is what is ordered. The side a card lies with is the plan's alone (step 2,
// "Kortet ligger"); the lab lays it as the plan it is sent says. Only in the local studio: the copy has no doll lab, and no
// Kortplan.
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DOLLS } from "../../../dealer3d/src/doll.ts";
import { genitive, type OrdersAnswer } from "../../../src/order-model.ts";
import { SHOE, type Place, type PlacementPlan } from "../../../src/placement-model.ts";
import type { cardFilm } from "../../lib/bordet.ts";
import { dollFilms, takesOf, type DollGroup } from "../../lib/doll-films.ts";
import type { Ledger } from "../../lib/ledger.ts";
import { swedishMoment } from "../../lib/mode.ts";
import { nodeCode } from "../../lib/names.ts";
import { placeCode, placeFromCode } from "../../lib/placement.ts";
import { ErrorState, SegmentedControl, Skeleton, cn } from "../ui";
import { DollFilms } from "./DollFilms";

/** The poses the doll deals a card from. */
export type DollEntry = "A2.1" | "A2.3";
/** The films without a card (the entry to an anchor) among the cards of the films' row. */
const ENTRY = "ingang";
/** The cards a deal from A2.3 is ordered to from the doll: a player's, or one of the dealer's own (tools/doll-order.ts). */
export const DOLL_CARD = /^(?:P[1-7]\.C[12]|D\.C[1-3])$/;

/** The doll lab's word for the chosen dealer's doll: hers where one is named as she is, else the standard doll. */
const dollWord = (dealer: string) => (dealer !== "standard" && Object.hasOwn(DOLLS, dealer) ? dealer : "standard");
/** Whether the dealer has a doll of her own: only then is a deal ordered from the doll (tools/doll-order.ts takes her doll). */
export const ownDoll = (dealer: string) => dollWord(dealer) === dealer;

/** The doll's films grouped by card, and how many there are in all. */
export function useDollGroups(orders: OrdersAnswer | null, ledger: Ledger | null) {
  return useMemo(() => {
    const groups = dollFilms(orders?.rendered ?? [], orders?.orders ?? [], ledger?.rows ?? []);
    return { groups, count: groups.reduce((n, g) => n + g.films.length, 0) };
  }, [orders, ledger]);
}

/** His saved standard for the doll's deal from A2.3 to a card, as the lab saved it (dealer3d/standard/<doll>-<card>.json). */
export type DollStandard = { name: string; savedAt: string; cardTempo: number };
/** What is known of the card's standard: being read, read (null: none saved), or not readable. */
export type StandardState = { state: "läser" } | { state: "läst"; standard: DollStandard | null } | { state: "fel" };

/**
 * The saved standard for the chosen dealer's doll and card, read from the doll lab (GET /dealer3d/standard, then the one
 * file for its card's tempo). `tick` is raised when the lab says it saved one, so that it is read again.
 */
export function useDollStandard(dealer: string, place: Place, tick: number, on: boolean): StandardState {
  const name = place === SHOE ? null : `${dollWord(dealer)}-${placeCode(place).replace(".", "").toLowerCase()}`;
  const [read, setRead] = useState<{ key: string; state: StandardState } | null>(null);
  const key = `${name}|${tick}`;
  useEffect(() => {
    if (!on || !name) return;
    let live = true;
    (async () => {
      const list = (await (await fetch("/dealer3d/standard", { cache: "no-store" })).json()) as { standards: { name: string; savedAt: string }[] };
      const found = list.standards.find((s) => s.name === name);
      if (!found) return null;
      const file = (await (await fetch(`/dealer3d/standard/${name}.json`, { cache: "no-store" })).json()) as { lab?: { steer?: { cardTempo?: number } } };
      return { name, savedAt: found.savedAt, cardTempo: file.lab?.steer?.cardTempo ?? 1 };
    })().then(
      (standard) => live && setRead({ key, state: { state: "läst", standard } }),
      () => live && setRead({ key, state: { state: "fel" } }),
    );
    return () => {
      live = false;
    };
  }, [on, name, key]);
  return read?.key === key ? read.state : { state: "läser" };
}

/** Step 2's one line on the doll: whose doll it is, when the card's standard was saved, and the card's tempo where it is not the ordinary. */
export function DollNote({ dealer, place, standard }: { dealer: string; place: Place; standard: StandardState }) {
  if (place === SHOE) return null;
  const saved = standard.state === "läst" ? standard.standard : null;
  const said =
    standard.state === "läser"
      ? "läser …"
      : standard.state === "fel"
        ? "standarden kunde inte läsas"
        : saved
          ? [`sparad ${swedishMoment(saved.savedAt) ?? "utan datum"}`, saved.cardTempo !== 1 ? `kortet ${Math.round(saved.cardTempo * 100)} %` : null].filter(Boolean).join(" · ")
          : "ingen sparad standard · Naturlig";
  const word = dollWord(dealer);
  const whose = word === "standard" ? "Standarddockan" : `${genitive(word.charAt(0).toUpperCase() + word.slice(1))} docka`;
  return (
    <p data-doll-note title={saved ? `Din sparade standard ${saved.name}` : undefined} className="mx-4 mt-3 text-sm leading-5 text-dim">
      <span className="font-semibold text-ink">{whose}</span> · {said}
    </p>
  );
}

/**
 * Where the doll lab lays its controls (step 2): an empty element React never renders children into, so that the lab's
 * nodes stay. It stays mounted while Kortplan shows, hidden while the step is folded.
 */
export const DollControls = forwardRef<HTMLDivElement, { hidden: boolean }>(function DollControls({ hidden }, ref) {
  return <div ref={ref} data-docklabb-styr hidden={hidden} className="docklabb-host" />;
});

/**
 * The film the lab's slider "Filmen" lays over the doll: the path on this server, its words (the step and whose film, never a
 * file's name), and the deal's seconds in the file (`end`: where its return begins) and the speed it is watched at.
 */
export type DollFilm = { src: string; label: string; start: number; end: number; speed: number };

/**
 * The card's film for the doll's picture (lib/bordet.ts cardFilm, for the chosen card, tree and dealer), once the server
 * has said that its file is on this computer (most media is not: a 404 is a card without a film).
 */
export function useDollFilm(found: ReturnType<typeof cardFilm>, treeName: string | null): DollFilm | null {
  const film = useMemo<DollFilm | null>(() => {
    if (!found) return null;
    const { part, own, waits } = found;
    const whose = own && treeName ? `ur trädet ${treeName}` : `den spelet spelar${treeName ? `, ${genitive(treeName)} egen saknas` : ""}`;
    return { src: part.path, label: `${nodeCode(part.from)} → ${nodeCode(part.to)} · ${whose}${waits ? " · väntar på din dom" : ""}`, start: part.start / part.fps, end: part.end / part.fps, speed: part.speed };
  }, [found, treeName]);
  const src = film?.src ?? null;
  const [here, setHere] = useState<{ src: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!src) return;
    let live = true;
    fetch(src, { method: "HEAD", cache: "no-store" }).then(
      (r) => live && setHere({ src, ok: r.ok }),
      () => live && setHere({ src, ok: false }),
    );
    return () => {
      live = false;
    };
  }, [src]);
  return film && here?.src === film.src && here.ok ? film : null;
}

export function DollStage({
  place, entry, play, plan, flytta, film, host, films, dealer, orders, ordersRead, groups, onPlace, onEntry, onSaved, onMoved,
}: {
  place: Place;
  /** The pose the doll deals the card from: the guide tree's anchor, where the lab has it (A2.1 or A2.3), else null. */
  entry: DollEntry | null;
  /** Raised by "Spela kortbanan": the lab plays the doll's deal to the card from the start. */
  play: number;
  /** The draft plan, as the lab shows it. */
  plan: PlacementPlan;
  /** The card's place may be dragged in the picture (step 1 open, the plan changeable). */
  flytta: boolean;
  /** The dealer's film of the card's deal, for the lab's slider "Filmen" (useDollFilm), or null: none on this computer. */
  film: DollFilm | null;
  /** Step 2's host for the lab's controls (DollControls), or null while none is mounted. */
  host: HTMLElement | null;
  /** The doll's films for the card are shown instead of the picture. */
  films: boolean;
  dealer: string;
  orders: OrdersAnswer | null;
  ordersRead: boolean;
  groups: readonly DollGroup[];
  /** A card chosen in the lab. */
  onPlace: (place: Place) => void;
  /** The pose the lab says it deals from. */
  onEntry: (entry: DollEntry) => void;
  /** The lab saved a standard: what step 2 and 3 say of it is read again. */
  onSaved: () => void;
  /** The card's place dragged in the picture, in the plan's picture (0–1 from the left and from the bottom). */
  onMoved: (place: Place, u: number, v: number) => void;
}) {
  // The lab is loaded on the card, pose and doll chosen when Kortplan opens; another dealer's doll loads it again.
  const doll = dollWord(dealer);
  const [lab, setLab] = useState<{ doll: string; src: string } | null>(null);
  if (!lab || lab.doll !== doll) setLab({ doll, src: labAddress(place, doll, entry) });
  const [ingang, setIngang] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  // The window that said it was ready: the frame's own, until another doll loads a new frame.
  const readyWindow = useRef<Window | null>(null);
  const post = useCallback((said: Record<string, unknown>) => frame.current?.contentWindow?.postMessage({ docklabb: said }, window.location.origin), []);
  const isReady = useCallback(() => !!frame.current?.contentWindow && readyWindow.current === frame.current.contentWindow, []);

  // What is told when the lab says it is ready, and what is done with what it says: the newest of each.
  const latest = useRef({ place, entry, plan, flytta, film, onPlace, onEntry, onSaved, onMoved });
  useEffect(() => {
    latest.current = { place, entry, plan, flytta, film, onPlace, onEntry, onSaved, onMoved };
  });
  useEffect(() => {
    const hear = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !frame.current || event.source !== frame.current.contentWindow) return;
      const said = (event.data as { docklabb?: unknown } | null)?.docklabb;
      if (!said || typeof said !== "object") return;
      const s = said as { ready?: unknown; place?: unknown; entry?: unknown; saved?: unknown; moved?: unknown };
      const now = latest.current;
      if (s.ready === true) {
        readyWindow.current = frame.current.contentWindow;
        post({ attach: true });
        post({ plan: now.plan });
        if (now.place !== SHOE) post({ place: now.place, ...(now.entry ? { entry: now.entry } : {}) });
        post({ flytta: now.flytta });
        post({ film: now.film });
      }
      const moved = s.moved as { place?: unknown; u?: unknown; v?: unknown } | null | undefined;
      if (moved && typeof moved === "object") {
        const at = typeof moved.place === "string" ? placeFromCode(moved.place) : null;
        const { u, v } = moved;
        if (at && at !== SHOE && typeof u === "number" && typeof v === "number" && Number.isFinite(u) && Number.isFinite(v)) now.onMoved(at, Math.min(1, Math.max(0, u)), Math.min(1, Math.max(0, v)));
        return;
      }
      const next = typeof s.place === "string" ? placeFromCode(s.place) : null;
      if (next && next !== SHOE) {
        setIngang(false);
        now.onPlace(next);
      }
      if (s.entry === "A2.1" || s.entry === "A2.3") now.onEntry(s.entry);
      if (typeof s.saved === "string") now.onSaved();
    };
    window.addEventListener("message", hear);
    return () => window.removeEventListener("message", hear);
  }, [post]);

  // A host mounted anew (Kortplan opened again, the column laid out anew): the lab lays its controls there.
  useEffect(() => {
    if (host && isReady()) post({ attach: true });
  }, [host, isReady, post]);
  // The card chosen in Bordet (its card buttons, the films' row, the guide's step) is asked for in the lab, from the pose the
  // tree deals it from; the lab answers with the card it shows, which is its own where sliders are moved and not saved.
  // "Spela kortbanan" asks it to play the deal from the start.
  const played = useRef(play);
  useEffect(() => {
    if (place === SHOE) return;
    const go = play !== played.current;
    played.current = play;
    if (isReady()) post({ place, ...(entry ? { entry } : {}), ...(go ? { play: true } : {}) });
  }, [place, entry, play, isReady, post]);
  // The draft as it changes, at most every 80 ms (a drag changes it on every move).
  useEffect(() => {
    if (!isReady()) return;
    const t = setTimeout(() => post({ plan }), 80);
    return () => clearTimeout(t);
  }, [plan, isReady, post]);
  useEffect(() => {
    if (isReady()) post({ flytta });
  }, [flytta, isReady, post]);
  // The card's film, when the card, the tree or the dealer gives another (or none).
  useEffect(() => {
    if (isReady()) post({ film });
  }, [film, isReady, post]);

  const chosen = ingang ? ENTRY : place;
  const group = groups.find((g) => (g.place ?? ENTRY) === chosen) ?? null;

  return (
    <div className="relative size-full">
      {lab ? <iframe key={lab.doll} ref={frame} src={lab.src} title="Dockan vid bordet" data-doll-lab className={cn("absolute inset-0 size-full border-0", films && "invisible")} /> : null}
      {films ? (
        <div className="absolute inset-0 flex flex-col overflow-y-auto bg-canvas [scrollbar-gutter:stable]">
          {groups.length ? (
            <div className="shrink-0 overflow-x-auto border-b border-line px-3 py-1.5">
              <SegmentedControl
                size="sm"
                label="Kort"
                value={chosen}
                onChange={(value) => {
                  const next = value === ENTRY ? null : placeFromCode(value);
                  setIngang(!next);
                  if (next) onPlace(next);
                }}
                options={groups.map((g) => {
                  const takes = g.films.reduce((n, f) => n + takesOf(f), 0);
                  return {
                    value: g.place ?? ENTRY,
                    label: (
                      <>
                        {g.place ? placeCode(g.place as Place) : "Ingång"}
                        <span className="tabular-nums text-faint">{g.films.length}</span>
                      </>
                    ),
                    title: `${g.films.length} ${g.films.length === 1 ? "film" : "filmer"} av dockan, ${takes} ${takes === 1 ? "beställd film" : "beställda filmer"}`,
                  };
                })}
              />
            </div>
          ) : null}
          {!ordersRead ? (
            <Skeleton className="m-4 h-[60vh] rounded-md" />
          ) : !orders ? (
            <ErrorState title="Dockans filmer kunde inte läsas" error="Beställningarna kunde inte läsas från servern." />
          ) : (
            <DollFilms group={group} dealer={dealer} word={ingang ? "ingången" : placeCode(place)} />
          )}
        </div>
      ) : null}
    </div>
  );
}

/** The doll lab's address inside the frame: embedded, on the chosen card, its pose and the doll. */
function labAddress(place: Place, doll: string, entry: DollEntry | null): string {
  const p = new URLSearchParams({ inbaddad: "1" });
  if (place !== SHOE) p.set("plats", placeCode(place).toLowerCase());
  if (entry === "A2.1") p.set("fran", "a2-1");
  p.set("docka", doll);
  return `/dealer3d/docka?${p}`;
}
