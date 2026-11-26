"use client";

// Bordet (/bordet/?plats=p4c2): the studio's one view of the table (Jakob 2026-11-17: "Scen och placering bör ha samma typ av
// vy, och på högersidan ska man kunna ändra och laborera med detta. Detta ska också vara underlaget för beställning av nya
// filmer."). One frame for everything, titled Bordet: the toolbar on top with the view's menu at its left (the row wraps
// rather than hides what does not fit), the picture as large as the window allows, one column on the right where things are
// changed (under the picture on a narrow or upright window). The menu's parts:
//   Inspelning   one picture and one column (Jakob 2026-11-25: "Jag vill att vi skapar ett och samma läge för detta ... jag
//                vill ha allt i 3d ... Det andra ska raderas. ... Simplifiera väldigt mycket, men framförallt så inte
//                förväxlingar kan ske."). The picture is the doll's, in 3D, for every step: the table, the chosen dealer's
//                doll (for the menu's Standarddockan the standard doll's man or woman, which orders nothing: step 3 says
//                so; lib/dealer.ts STANDARD_DOLL) and the draft plan's cards on the felt (DollPanel.tsx), and with the picture's slider "Filmen" the
//                dealer's film of the card's deal from the tree's anchor over her, in the films' camera (lib/bordet.ts
//                cardFilm); "Dockans filmer" shows her films for the card instead, and "Spela kortbanan" plays her deal to it. The column: the card and its buttons, then the steps for
//                the chosen card, 1 Var kortet landar (the place; the card can be dragged in the picture while it is open),
//                2 Hur det kommer dit (the side a dealer's card lies with, chosen there only, a player's card always open;
//                the card's way from the anchor; the doll's own controls, which the doll lab lays there), 3 Ny film (the
//                guide for the dealer chosen in the frame: her tree and the step, the step's recipe, what is sent and
//                "Spara utkastet"; NewFilm.tsx). The
//                anchor the card goes from is the guide tree's (lib/bordet.ts treeAnchor): step 2, the pose the
//                doll deals from and Scen's round all name it, and step 3 orders from it. Step 3 makes a deal from A2.3 to a
//                player's card or one of the dealer's own from the doll's saved standard where the dealer has a doll of her
//                own.
//   Kön          the orders (OrderView): what a round lacks, the drafts to approve, an order open with "Det här skickas"
//   Scen, Råfilm, Efterarbete   the live picture (SceneBody: the 3D scene, the films on their green, what is laid over)
// The plan is a draft (useDraft): nothing is written until Jakob's click on "Spara i kortplanen", which writes the whole
// plan; Ctrl+Z takes a step back and the arrows nudge the chosen place. The card and the guide's step stay when the menu
// changes. Addresses: ?lage=bestall opens Inspelning with step 3 open, and with trad=, film= and komposition= on the tree and
// step they name (Karta's "Beställ", lib/new-film.ts guideHref; the view writes the same words while the guide is open);
// ?lage=ko, ?lage=bestall&ko=1, ?order=<id> and ?ny=1&som=<id> open Kön (that order); ?ny=1&steg=…&plats=… (Ny
// beställning's, which is gone) opens the guide on that film. The online copy (lib/mode.ts isSnapshot) has no doll lab and
// orders nothing: there Bordet is Scen, Råfilm and Efterarbete, and opens on Scen. Inside <Suspense>.
import { Clapperboard, Play, RotateCcw, Save, Undo2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { stepOf, type Anchor, type BankFacts, type OrdersAnswer } from "../../../src/order-model.ts";
import { editPlace, type Place } from "../../../src/placement-model.ts";
import type { Ledger } from "../../lib/ledger.ts";
import type { MediaAnswer } from "../../lib/media.ts";
import { useBank } from "../../lib/bank.ts";
import { cardFilm, filmRow, hasRound, lastOrder, pathCard, roundFor, sceneWords, stepTwoSummary, treeAnchor, wishKey, type FilmWish, type RowChoice } from "../../lib/bordet.ts";
import { useViewContext } from "../../lib/context.ts";
import { isStandardDoll } from "../../lib/dealer.ts";
import { isSnapshot, swedishMoment } from "../../lib/mode.ts";
import { GUIDE_WORDS, cardOf, filmCode, guideOf, itemOf, pickFor, pickOfWish, pickTree, sameIn, treeBase, type GuideItem, type StepPick } from "../../lib/new-film.ts";
import { getOrders, orderingState, presetOf, type CreatedOrders, type DollOrdered } from "../../lib/orders.ts";
import { PLAN_VIEW, START_PLACE, changedPlaces, decimal, placeCode, placeFromCode, placeName } from "../../lib/placement.ts";
import { useTrees } from "../map/useTrees";
import { getMedia } from "../material/client.ts";
import { getLedger } from "../ledger/LedgerView";
import { OrderView } from "../order/OrderView";
import { MotionPanel, PlacePanel } from "../placement/Panels";
import { SlotPicker } from "../placement/SlotPicker";
import { useGesture, usePlanKeys } from "../placement/usePlanKeys.ts";
import { draftActions, useDraft } from "../placement/useDraft.ts";
import { Page } from "../shell";
import { Badge, Button, ErrorState, IconButton, SegmentedControl, Skeleton, cn, useToast } from "../ui";
import { treeChip } from "../map/TreeRow";
import type { Made } from "./FilmList";
import { DOLL_CARD, DollControls, DollNote, DollStage, ownDoll, useDollFilm, useDollGroups, useDollStandard, type DollEntry, type DollFilm, type StandardState } from "./DollPanel";import type { DollGroup } from "../../lib/doll-films.ts";
import { NewFilm, type Phase } from "./NewFilm";
import type { SceneKind } from "./SceneBody";
import { RowSends } from "./Sends";

// The live picture is loaded only when it is chosen, so that Inspelning stays light.
const SceneBody = dynamic(() => import("./SceneBody").then((m) => m.SceneBody), { ssr: false, loading: () => <Skeleton className="m-4 h-[60vh] rounded-md" /> });

// The part "kortplan" is shown as Inspelning (Jakob 2026-11-25: "ja till namnbyte för inspelning"): the recording format,
// the doll at the table through the film's camera, and where a new film is ordered. Its value keeps the old word, so that
// an old address (?lage=kortplan) opens it as before.
export type Mode = "kortplan" | "ko" | SceneKind;
export const MODES: readonly { value: Mode; label: string }[] = [
  { value: "kortplan", label: "Inspelning" },
  { value: "ko", label: "Kön" },
  { value: "scen", label: "Scen" },
  { value: "rafilm", label: "Råfilm" },
  { value: "efterarbete", label: "Efterarbete" },
];
/** The parts the menu shows: the copy has no doll lab and orders nothing, so it has neither Inspelning nor Kön. */
const SHOWN_MODES = isSnapshot ? MODES.filter((m) => m.value !== "kortplan" && m.value !== "ko") : MODES;
/** The part Bordet opens on without a word for it: Inspelning, and Scen in the copy. */
const FIRST_MODE: Mode = isSnapshot ? "scen" : "kortplan";
const isMode = (v: string | null): v is Mode => SHOWN_MODES.some((m) => m.value === v);
const isScene = (m: Mode): m is SceneKind => m === "scen" || m === "rafilm" || m === "efterarbete";
/** A dealer with no drafts made: one object, so that the reference stays the same between renders. */
const NO_DRAFTS: Made = {};
/** The pose the doll lab deals from for an anchor at the shoe: it has A2.1 and A2.3. */
const dollEntryOf = (from: Exclude<Anchor, "1">): DollEntry | null => (from === "2.1" ? "A2.1" : from === "2.3" ? "A2.3" : null);

type Params = { get(name: string): string | null };
/** The address asks for Kön: ?lage=ko, and Beställ's old words (?lage=bestall&ko=1, ?order=<id>, ?ny=1&som=<id>). */
const asksQueue = (p: Params) => !isSnapshot && (p.get("lage") === "ko" || p.get("ko") === "1" || !!p.get("order") || (p.get("ny") === "1" && !!p.get("som")));
/** The menu's part the address asks for; ?lage=bestall (Beställ, which is now step 3) opens Inspelning, as does any other word. */
const modeOf = (p: Params): Mode => (asksQueue(p) ? "ko" : isMode(p.get("lage")) ? (p.get("lage") as Mode) : FIRST_MODE);
/** Beställ's old words, read once and then taken out of the address. */
const OLD_WORDS = ["ko", "ny", "som", "steg", "modell"] as const;

/**
 * Where an old address of Ny beställning (?ny=1&steg=GIV-2.2&plats=P4.C1&modell=…) leads now: the card, the film the guide
 * opens on (with the model as his exception where one was named) and step 3 open. Null for any other address.
 */
function oldOrder(p: Params): { place: Place | null; wish: FilmWish | null; model: string | null } | null {
  const preset = isSnapshot ? null : presetOf(p);
  if (!preset || preset.like) return null;
  const def = preset.step ? stepOf(preset.step) : null;
  const wish = def && (!def.card || preset.target) ? { step: def.key, target: def.card ? preset.target : null } : null;
  return { place: placeFromCode(preset.target), wish, model: wish ? preset.model : null };
}

/**
 * The view's address: the menu's part and the card ("?lage=ko&plats=p4c1"), with the guide open its tree, step and
 * composition (?lage=bestall&trad=…&film=…, so that a reload opens the same); the rail's dealer and robot are kept.
 */
function writeAddress(mode: Mode, place: Place, guide: Partial<Record<(typeof GUIDE_WORDS)[number], string>> | null) {
  const p = new URLSearchParams(window.location.search);
  const like = p.get("ny") === "1" ? p.get("som") : null;
  for (const w of OLD_WORDS) p.delete(w);
  // Kön keeps the open order ("Ny beställning som den här" opens the order it was like); elsewhere there is none.
  if (mode === "ko") {
    if (like && !p.get("order")) p.set("order", like);
  } else p.delete("order");
  // Scen's words (the round, the look) belong to the live picture.
  if (!isScene(mode)) for (const key of [...p.keys()]) if (sceneWords.has(key) && key !== "robot") p.delete(key);
  for (const w of GUIDE_WORDS) {
    const value = mode === "kortplan" ? guide?.[w] : undefined;
    if (value) p.set(w, value);
    else p.delete(w);
  }
  if (mode === "kortplan" && guide) p.set("lage", "bestall");
  else if (mode === FIRST_MODE) p.delete("lage");
  else p.set("lage", mode);
  if (place === START_PLACE) p.delete("plats");
  else p.set("plats", placeCode(place).toLowerCase());
  const q = p.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
}

type StepId = "place" | "motion" | "order";

/**
 * A film's exceptions with one more, and without those the form hides after it (Sends.tsx), so that nothing unseen goes
 * with the draft: tur och retur has no Slutbild, bara dit no card size, and another model its own lengths and reference
 * films (both back to the recipe's). A choice set back to the recipe's (undefined: "Platsens egen", "Med dockans film") is
 * taken out, so that a row with nothing chosen is not called changed.
 */
function withPatch(was: RowChoice, patch: RowChoice): RowChoice {
  const next: RowChoice = { ...was, ...patch };
  if (patch.shape === "ROUND_TRIP") delete next.end;
  if (patch.shape === "ONE_WAY") delete next.cardScale;
  if ("model" in patch && patch.model !== was.model) {
    if (!("duration" in patch)) delete next.duration;
    if (!("reference" in patch)) delete next.reference;
  }
  for (const key of Object.keys(next) as (keyof RowChoice)[]) if (next[key] === undefined) delete next[key];
  return next;
}

export function BordetView() {
  const params = useSearchParams();
  const [first] = useState(() => oldOrder(params));
  // An old Ny beställning link (?ny=1&steg=…&plats=…) opens Inspelning at its card even when /bestall/ added ko=1 to it.
  const [mode, setMode] = useState<Mode>(() => (first ? "kortplan" : modeOf(params)));
  // A link to Kön while the view is open (an order's "Utkast gjort", "Öppna i Kön") opens Kön.
  const askedQueue = asksQueue(params);
  const [seenAsk, setSeenAsk] = useState(askedQueue);
  if (askedQueue !== seenAsk) {
    setSeenAsk(askedQueue);
    if (askedQueue) setMode("ko");
  }
  const [step, setStep] = useState<StepId | null>(() => (first || params.get("lage") === "bestall" ? "order" : "place"));
  // Raised when the doll lab saves a standard: what step 2 and 3 say of it is read again.
  const [savedTick, setSavedTick] = useState(0);
  const onDollSaved = useCallback(() => setSavedTick((n) => n + 1), []);
  const [media, setMedia] = useState<MediaAnswer | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [choices, setChoices] = useState<Record<string, RowChoice>>(() => (first?.wish && first.model ? { [wishKey(first.wish)]: { model: first.model } } : {}));
  // The guide Ny film: the tree and step the address names (Karta's "Beställ"), or the film of an old Ny beställning link.
  const [guide, setGuide] = useState<{ tree: string | null; pick: StepPick | null; composition: string | null; phase: Phase }>(() => {
    const asked = isSnapshot ? null : guideOf(params);
    const pick = asked?.pick ?? (first?.wish ? pickOfWish(first.wish) : null);
    return { tree: asked?.tree ?? null, pick, composition: asked?.composition ?? null, phase: pick ? "hur" : "vad" };
  });
  const [place, setPlace] = useState<Place>(() => first?.place ?? placeFromCode(guide.pick ? cardOf(guide.pick) : null) ?? placeFromCode(params.get("plats")) ?? START_PLACE);
  const [madeBy, setMadeBy] = useState<Record<string, Made>>({});
  const [orders, setOrders] = useState<OrdersAnswer | null>(null);
  const [ordersRead, setOrdersRead] = useState(false);
  const draft = useDraft();
  const toast = useToast();
  const { dealer, dealers, bank, graph, status, readAt } = useBank();
  const trees = useTrees(dealer, readAt);
  // The drafts made follow their dealer: a switch away and back still shows them as made, so no second draft of the same film.
  const made = madeBy[dealer] ?? NO_DRAFTS;
  // The rail's switch to another dealer: the exceptions (their pictures and films are the other dealer's) go, and the guide
  // opens her own tree (the step stays: it names nodes only). The first settling of the dealer (the address read after the
  // default) is no switch and resets nothing, so an old link's model exception and Karta's tree stay.
  const [seenDealer, setSeenDealer] = useState<string | null>(null);
  if (status !== "loading" && dealer !== seenDealer) {
    if (seenDealer !== null) {
      setChoices({});
      setGuide((g) => ({ ...g, tree: null, composition: null }));
    }
    setSeenDealer(dealer);
  }
  const views = trees.answer?.trees;
  const view = useMemo(() => pickTree(views ?? [], guide.tree), [views, guide.tree]);
  const item = guide.pick ? itemOf(view, guide.pick) : null;
  // The anchor Inspelning's card goes from: the guide's tree's, A2.3 where no tree is read.
  const from = treeAnchor(view);
  // A card chosen in Inspelning (its buttons, the doll's picture) moves the guide's step to that card; what is sent is then read again.
  const [seenPlace, setSeenPlace] = useState(place);
  if (place !== seenPlace) {
    setSeenPlace(place);
    const pick = item ? pickFor(view, item, place) : null;
    if (pick && item && (pick.from !== item.from || pick.to !== item.to)) setGuide({ ...guide, pick, phase: guide.phase === "skicka" ? "hur" : guide.phase });
  }
  const guideOpen = mode === "kortplan" && step === "order";
  const treeWord = guideOpen ? (view?.tree.id ?? guide.tree) : null;
  const filmWord = guideOpen && guide.pick ? filmCode(guide.pick) : null;
  const compositionWord = guideOpen ? guide.composition : null;
  useEffect(() => writeAddress(mode, place, guideOpen ? { trad: treeWord ?? undefined, film: filmWord ?? undefined, komposition: compositionWord ?? undefined } : null), [mode, place, guideOpen, treeWord, filmWord, compositionWord]);
  const readOrders = useCallback(
    () =>
      getOrders().then(
        (o) => (setOrders(o), setOrdersRead(true)),
        () => (setOrders(null), setOrdersRead(true)),
      ),
    [],
  );
  useEffect(() => {
    // the copy orders nothing: no orders, no pictures to send, no protocol
    if (isSnapshot) return;
    void readOrders();
    void getMedia().then(setMedia, () => setMedia(null));
    void getLedger().then(setLedger, () => setLedger(null));
  }, [readOrders]);
  useViewContext({ vy: "bordet", val: { läge: MODES.find((m) => m.value === mode)?.label, plats: placeCode(place), film: guideOpen ? item?.name : undefined } });

  const d = draft.draft;
  const plan = d?.plan ?? null;
  // The dealer's pictures in Material and the bank with the dummy's rendered films: what a film's recipe is resolved against
  // (its reference film by rule, the seat's own end picture), the same as the store resolves it when the draft is made.
  const entries = useMemo(() => media?.dealers.find((x) => x.id === dealer)?.entries ?? [], [media, dealer]);
  const bankFacts = useMemo<BankFacts | null>(() => (bank ? { ...(bank as BankFacts), rendered: orders?.rendered ?? [], cutChecks: orders?.cutChecks } : null), [bank, orders]);
  const rowOf = useCallback(
    (w: FilmWish) => filmRow(dealer, w, orders?.methods ?? null, orders?.policy ?? null, { bank: bankFacts, choice: choices[wishKey(w)], entries, plan: orders?.plan ?? null, dealers: orders?.dealers, marks: orders?.marks }),
    [dealer, orders, bankFacts, choices, entries],
  );
  // The guide's film as Beställ makes it, and the draft's body: the row's, with the tree's own anchor picture where the
  // picture that holds in Material is another (the store's existing base; nothing new in the order's format).
  const guideRow = item?.wish ? rowOf(item.wish) : null;
  const base = view && item?.wish ? treeBase(view, item.wish, entries) : null;
  const body = guideRow?.body ? (base ? { ...guideRow.body, base } : guideRow.body) : null;

  // Whether anything can be approved now (the switch, the balance, the agents' mandate), in one line where films are ordered.
  const ordering = orders ? orderingState(orders) : null;
  const orderable = !orders?.dealers || orders.dealers.some((x) => x.id === dealer);
  // A paused dealer (data/dealers.json, his word) gets nothing new: no draft is made for her.
  const paused = !!orders?.dealers?.find((x) => x.id === dealer)?.paused;
  const dealerName = dealers.find((x) => x.id === dealer)?.name ?? dealer;
  const madeAnswer = guideRow && made[guideRow.key] ? (orders?.orders.find((a) => a.order.id === made[guideRow.key]) ?? null) : null;
  // (the standard doll is no dealer: nothing is ordered for it; a dealer's films are ordered in her own studio, lib/dealer.ts STANDARD_DOLL)
  const blocked = !ordersRead ? "Läser beställningarna …" : !orders ? "Beställningarna kunde inte läsas från servern." : isStandardDoll(dealer) ? "Standarddockan är ingen dealer: inga filmer beställs för den. Välj en dealer i menyn för att beställa hennes filmer." : paused ? `${dealerName} är pausad: inget nytt beställs.` : !orderable ? `Filmer till ${dealerName} kan inte beställas härifrån.` : draft.dirty ? "Spara kortplanen först: utkastet ritar kortet där den sparade planen lägger det." : guideRow && made[guideRow.key] && !madeAnswer ? "Utkastet är sparat: läser Kön …" : null;
  // The dealers the guide can order for: those not paused.
  const orderDealers = orders?.dealers ? orders.dealers.filter((x) => !x.paused) : dealers;

  /** A draft saved by the guide (the recipe's, or the doll's: made.id): the row is made, and the orders are read again. */
  const madeDraft = (id: string, detail: string) => {
    if (!guideRow) return;
    const key = guideRow.key;
    setMadeBy((was) => ({ ...was, [dealer]: { ...(was[dealer] ?? {}), [key]: id } }));
    toast({ tone: "ok", title: "Utkastet är sparat", detail });
    void readOrders();
  };
  const created = (answer: CreatedOrders) => madeDraft(answer.made[0], "Det godkänns i Kön.");
  const dollMade = (made: DollOrdered) => madeDraft(made.id, `Med dockans film ${made.film}. Det godkänns i Kön.`);
  // The doll's standard for the chosen card (step 2 says it, step 3 orders from it), and the doll's films by card.
  const standard = useDollStandard(dealer, place, savedTick, mode === "kortplan" && (step === "motion" || step === "order"));
  const doll = useDollGroups(orders, ledger, dealer);
  // The dealer's film of the card's deal from the tree's anchor, which the doll's picture can lay over her (lib/bordet.ts cardFilm).
  const found = useMemo(() => (isSnapshot ? null : cardFilm(graph, view, place)), [graph, view, place]);
  const dollFilm = useDollFilm(found, view?.tree.name ?? null);
  // Step 3 orders a deal from A2.3 to a player's card or one of the dealer's own from the doll's saved standard (Jakob 2026-11-23,
  // "Ett ställe för dockan"; "Givarna från A2.3 beställs ändå med dockans film"), where the dealer has a doll of her own.
  // tools/doll-order.ts sends the anchor that holds in Material; where the tree's own picture is another, the panel says so
  // (treePicture). The standard read is the chosen card's, which the guide's step follows.
  const dollTarget = guideRow?.wish.step === "GIV-2.3" ? guideRow.wish.target : null;
  const dollWay = dollTarget && DOLL_CARD.test(dollTarget) && ownDoll(dealer) ? { place: dollTarget, standard, treePicture: base } : null;
  /** A step chosen among the tiles: its card is chosen in Inspelning, and the guide goes on to Hur. */
  const pickItem = (i: GuideItem, go: (card: Place) => void) => {
    setGuide((g) => ({ ...g, pick: { from: i.from, to: i.to }, phase: "hur" }));
    const at = i.card ? placeFromCode(i.card) : null;
    if (at && at !== place) go(at);
  };
  /** Another tree: the same step in it (the giv to the card from its own anchor), and no composition to go back to. */
  const chooseTree = (id: string) => {
    const next = views?.find((v) => v.tree.id === id);
    setGuide((g) => ({ ...g, tree: id, composition: null, pick: next && item ? sameIn(next, item) : g.pick }));
  };
  // The tree, chosen in one place, in the row above the picture (Jakob 2026-11-26: the dealer's films for the card, tree by
  // tree, against the doll). It says where the doll deals from (A2.3, or the nyp from A2.1), which film Filmen lays over her
  // (lib/bordet.ts cardFilm) and which films step 3 lists. Offered: every tree and way of the dealer; a tree put together
  // only while it is the one shown.
  const choosableTrees = (views ?? []).filter((v) => !v.tree.shares || v.tree.id === view?.tree.id);
  const treeChoice = choosableTrees.length > 1 ? (
    <span className="flex shrink-0 items-center gap-2" title="Trädet avgör varifrån dockan ger kortet, vilken film reglaget Filmen lägger över henne och vilka filmer steg 3 visar">
      <span aria-hidden className="h-5 w-px shrink-0 bg-line" />
      <SegmentedControl size="sm" label="Träd" value={view?.tree.id ?? ""} onChange={chooseTree} options={choosableTrees.map((v) => ({ value: v.tree.id, label: treeChip(v) }))} />
    </span>
  ) : null;

  const save = async () => {
    const result = await draftActions.save();
    if (result.ok) {
      toast({ tone: "ok", title: "Kortplanen är sparad" });
      // the rows read the plan from the orders' answer (its sides, hands, text and marks): read it again
      void readOrders();
    }
    else toast({ tone: "bad", title: result.conflict ? "Planen har ändrats på annat håll" : "Kortplanen sparades inte", detail: result.message });
  };

  const menu = <SegmentedControl size="sm" label="Bordets delar" value={mode} onChange={setMode} options={SHOWN_MODES.map((m) => ({ value: m.value, label: m.label }))} />;
  // What goes to Runway for the guide's film, before and after its draft is made.
  const names = Object.fromEntries((orders?.dealers ?? []).map((x) => [x.id, x.name]));
  // Förra filmen: the film's last order (the same dealer, step and card, not set aside), with the takes that came of it.
  const lastAnswer = guideRow ? lastOrder(orders?.orders ?? [], dealer, guideRow.wish, (id) => !!ledger?.rows.some((r) => r.order === id && r.see.film)) : null;
  const last = lastAnswer ? { answer: lastAnswer, takes: (ledger?.rows ?? []).filter((r) => r.order === lastAnswer.order.id) } : null;
  const sendsPanel = guideRow ? (
    <RowSends
      row={guideRow}
      names={names}
      bank={bankFacts}
      dealer={dealer}
      choice={choices[guideRow.key] ?? {}}
      onChoice={(patch) => setChoices((was) => ({ ...was, [guideRow.key]: patch ? withPatch(was[guideRow.key] ?? {}, patch) : {} }))}
      made={madeAnswer}
      all={orders}
      last={last}
    />
  ) : null;
  const gaps = view ? view.steps.filter((s) => s.state === "saknas").length : 0;
  const guideSummary = isStandardDoll(dealer) ? "inga filmer beställs för standarddockan" : item ? item.name : view ? `${view.tree.name} · ${gaps ? `${gaps} saknas` : "inget saknas"}` : null;
  // (the standard doll gets no guide: nothing is ordered for it, and it has no tree)
  const newFilm = (go: (card: Place) => void) => isStandardDoll(dealer) ? (
    <p data-new-film className="px-4 pb-4 text-sm leading-5 text-dim">{blocked ?? "Standarddockan är ingen dealer: inga filmer beställs för den."}</p>
  ) : (
    <NewFilm
      dealer={dealer}
      dealers={orderDealers}
      trees={trees}
      view={view}

      item={item}
      phase={guide.phase}
      onPhase={(phase) => setGuide((g) => ({ ...g, phase }))}
      onPick={(i) => pickItem(i, go)}
      place={place}
      row={guideRow}
      body={body}
      sends={sendsPanel}
      entries={entries}
      names={names}
      ordering={ordering}
      blocked={blocked}
      made={madeAnswer}
      orders={orders}
      composition={guide.composition}
      onCreated={created}
      doll={dollWay}
      onDollMade={dollMade}
    />
  );
  const table = mode === "kortplan";
  const changes = d ? changedPlaces(d.saved, d.plan) : { places: [], table: false };
  const count = changes.places.length + (changes.table ? 1 : 0);
  const when = d?.saved.updatedAt ? swedishMoment(d.saved.updatedAt) : null;
  // Scen plays the card's round from the anchor Inspelning's card goes from where the bank has that round; the game's own until then.
  const card = pathCard(place);
  const roundText = roundFor(card, dealer, hasRound(graph, card, from) ? from : null);

  // Kön: the same frame and menu over the orders (the queue, or an order open with "Det här skickas").
  if (mode === "ko") return <OrderView menu={menu} />;
  return (
    <Page
      title="Bordet"
      full
      status={
        !table ? null : draft.dirty ? (
          <Badge tone="brass" size="md">
            ● Osparat · {count} {count === 1 ? "ändrad" : "ändrade"}
          </Badge>
        ) : when ? (
          <span className="text-faint">Sparad {when}</span>
        ) : null
      }
      actions={
        d && table ? (
          <>
            <IconButton label="Ångra" kbd="Ctrl+Z" icon={<Undo2 />} disabled={!d.past.length || draft.saving} onClick={draftActions.undo} />
            <Button variant="quiet" icon={<RotateCcw />} disabled={!draft.dirty || draft.saving} onClick={draftActions.toSaved}>
              Till sparat
            </Button>
            <Button variant="primary" icon={<Save />} disabled={!draft.dirty} loading={draft.saving} onClick={() => void save()} title="Skriver kortplanen (gäller alla dealers)">
              Spara i kortplanen
            </Button>
          </>
        ) : null
      }
    >
      {table ? (
        draft.status === "error" ? (
          <ErrorState title="Kortplanen kunde inte läsas" error={draft.error ?? "Okänt fel"} onRetry={() => void draftActions.load()} />
        ) : !d || !plan ? (
          <div className="flex h-full flex-col gap-4 p-5 lg:flex-row">
            <Skeleton className="aspect-3/2 shrink-0 rounded-md lg:aspect-auto lg:h-full lg:flex-1" />
            <Skeleton className="h-36 shrink-0 rounded-md lg:h-full lg:w-100" />
          </div>
        ) : (
          <TableBody
            menu={menu}
            step={step}
            setStep={setStep}
            place={place}
            setPlace={setPlace}
            dealer={dealer}
            from={from}
            standard={standard}
            dollCount={doll.count}
            lab={{ orders, ordersRead, groups: doll.groups, onSaved: onDollSaved, film: dollFilm }}
            treeChoice={treeChoice}
            newFilm={newFilm}
            newFilmSummary={guideSummary}
          />
        )
      ) : (
        <SceneBody kind={mode as SceneKind} toolbar={menu} roundText={roundText} />
      )}
    </Page>
  );
}

function TableBody({
  menu, step, setStep, place, setPlace, dealer, from, standard, dollCount, lab, treeChoice, newFilm, newFilmSummary,
}: {
  menu: ReactNode;
  /** The choice of tree for the row above the picture, or null where the dealer has one tree or none. */
  treeChoice: ReactNode;
  step: StepId | null;
  setStep: (s: StepId | null) => void;
  place: Place;
  setPlace: (p: Place) => void;
  dealer: string;
  /** The anchor the card goes from: the guide tree's (lib/bordet.ts treeAnchor). */
  from: Exclude<Anchor, "1">;
  /** The doll's saved standard for the chosen card (step 2's line on the doll). */
  standard: StandardState;
  /** How many films of the doll's there are, for the toolbar. */
  dollCount: number;
  /** What the doll's films need, what is done when the lab saves a standard, and the film its picture can lay over the doll. */
  lab: { orders: OrdersAnswer | null; ordersRead: boolean; groups: readonly DollGroup[]; onSaved: () => void; film: DollFilm | null };
  /** Step 3, the guide Ny film; go chooses a card in Inspelning. */
  newFilm: (go: (card: Place) => void) => ReactNode;
  /** One line of what the guide has chosen, for step 3 folded. */
  newFilmSummary: string | null;
}) {
  const draft = useDraft();
  const d = draft.draft!;
  const plan = d.plan;
  const editable = !draft.saving;
  // "Dockans filmer": the doll's films for the card instead of her picture; "Spela kortbanan" plays her deal to it.
  const [films, setFilms] = useState(false);
  const [play, setPlay] = useState(0);
  // Step 2's host for the doll lab's controls, once mounted.
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  // The pose the doll deals from: the tree's anchor, which the lab always takes (it has no choice of its own here).
  const entry = dollEntryOf(from);
  const changes = useMemo(() => changedPlaces(d.saved, d.plan), [d]);
  const changed = useMemo(() => new Set<Place>(changes.places), [changes]);
  const stageArea = useRef<HTMLElement>(null);
  usePlanKeys({ place, editable, area: stageArea });
  // Step 1 open: the card's place can be dragged in the doll's picture, and a drag is one step for Ångra.
  const flytta = step === "place" && editable;
  const gesture = useGesture();
  const moved = useCallback(
    (at: Place, u: number, v: number) => {
      if (flytta) gesture((p) => editPlace(p, at, PLAN_VIEW, { u, v }));
    },
    [flytta, gesture],
  );

  const target = plan.targets[place];
  const at = target.geometry[PLAN_VIEW];
  // A step of the guide with a card chooses that card, as a click on its button does.
  const go = (card: Place) => setPlace(card);
  const toggle = (s: StepId) => setStep(step === s ? null : s);
  const steps: { id: StepId; title: string; summary: string | null; body: ReactNode; keep?: ReactNode }[] = [
    {
      id: "place",
      title: "Var kortet landar",
      summary: `${decimal(at.u * 100)} % från vänster · ${decimal(at.v * 100)} % från botten`,
      body: <PlacePanel plan={plan} id={place} editable={editable} />,
    },
    {
      id: "motion",
      title: "Hur det kommer dit",
      summary: stepTwoSummary(place, from, target.intent.endSide),
      body: (
        <>
          <MotionPanel plan={plan} id={place} editable={editable} />
          <DollNote dealer={dealer} place={place} standard={standard} />
        </>
      ),
      // the doll lab's controls: their host stays in place while the step is folded, so that the lab's nodes are kept
      keep: <DollControls ref={setHost} />,
    },
    {
      id: "order",
      title: "Ny film",
      summary: newFilmSummary,
      body: newFilm(go),
    },
  ];

  // The scrollbar's room is kept in one column, so that the column's width, and with it the picture's height, never follows the scrollbar.
  return (
    <div className="grid h-full min-h-0 grid-cols-1 content-start overflow-y-auto scrollbar-gutter-stable lg:landscape:grid-cols-[minmax(0,1fr)_400px] lg:landscape:content-stretch lg:landscape:overflow-hidden lg:landscape:scrollbar-gutter-auto">
      <section ref={stageArea} className="@container relative flex min-w-0 flex-col lg:landscape:min-h-0">
        <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line px-3 py-1.5">
          {menu}
          <span aria-hidden className="h-5 w-px shrink-0 bg-line" />
          <Button
            size="sm"
            variant="primary"
            icon={<Play />}
            onClick={() => {
              setFilms(false);
              setPlay((n) => n + 1);
            }}
            className="shrink-0"
            title="Dockans giv till kortet, från början"
          >
            Spela kortbanan
          </Button>
          <Button size="sm" variant="secondary" icon={<Clapperboard />} aria-pressed={films} onClick={() => setFilms(!films)} className="shrink-0" title={films ? "Tillbaka till dockans bild" : "Dockans filmer till kortet, var och en med filmerna som beställdes med den"}>
            {dollCount ? `Dockans filmer · ${dollCount}` : "Dockans filmer"}
          </Button>
          {treeChoice}
        </div>
        {draft.conflict ? <p className="shrink-0 border-b border-underkand/30 bg-underkand/8 px-4 py-1.5 text-xs text-[#ef8b8b]">Planen har ändrats på annat håll sedan den lästes.</p> : null}
        {/* the doll's picture: in one column the film's shape and the lab's transport row under it, at most most of the window; side by side all the height there is */}
        <div className="relative h-[calc(100cqw*1174/1764+72px)] max-h-[85vh] shrink-0 lg:landscape:h-auto lg:landscape:max-h-none lg:landscape:min-h-0 lg:landscape:flex-1">
          <DollStage
            place={place}
            entry={entry}
            play={play}
            plan={plan}
            flytta={flytta}
            film={lab.film}
            host={host}
            films={films}
            dealer={dealer}
            orders={lab.orders}
            ordersRead={lab.ordersRead}
            groups={lab.groups}
            onPlace={setPlace}
            onSaved={lab.onSaved}
            onMoved={moved}
          />
        </div>
      </section>
      <aside className="flex min-w-0 flex-col border-t border-line bg-surface lg:landscape:min-h-0 lg:landscape:border-l lg:landscape:border-t-0" data-nudge>
        <div className="flex flex-col gap-2.5 border-b border-line px-4 pb-3 pt-3.5">
          <div className="flex items-baseline gap-2">
            <h2 className="font-mono text-base font-semibold text-ink">{placeCode(place)}</h2>
            <span className="truncate text-sm text-dim">{placeName(place)}</span>
            {changed.has(place) ? <Badge tone="brass">ändrad</Badge> : null}
          </div>
          <SlotPicker plan={plan} selected={place} changed={changed} onSelect={setPlace} />
        </div>
        <div className="lg:landscape:min-h-0 lg:landscape:flex-1 lg:landscape:overflow-y-auto lg:landscape:scrollbar-gutter-stable">
          {steps.map((s, i) => (
            <Step key={s.id} n={i + 1} title={s.title} summary={s.summary} open={step === s.id} onToggle={() => toggle(s.id)} keep={s.keep}>
              {s.body}
            </Step>
          ))}
        </div>
      </aside>
    </div>
  );
}

/**
 * One of the column's steps: its number, its name, one line of what it says now when folded, and its panel when open.
 * `keep`: what stays mounted while the step is folded, hidden then (the doll lab's controls, which React must not remove).
 */
function Step({ n, title, summary, open, onToggle, keep, children }: { n: number; title: string; summary: string | null; open: boolean; onToggle: () => void; keep?: ReactNode; children: ReactNode }) {
  return (
    <section className={cn("border-b border-line", open && "bg-raised/25")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-raised/40">
        <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold", open ? "border-brass bg-brass/15 text-brass-hi" : "border-line-strong text-dim")}>{n}</span>
        <span className="flex min-w-0 flex-col">
          <span className="text-md font-semibold text-ink">{title}</span>
          {summary && !open ? <span className="truncate text-xs tabular-nums text-dim">{summary}</span> : null}
        </span>
      </button>
      {open || keep ? (
        <div className="pb-1" hidden={!open}>
          {open ? children : null}
          {keep}
        </div>
      ) : null}
    </section>
  );
}
