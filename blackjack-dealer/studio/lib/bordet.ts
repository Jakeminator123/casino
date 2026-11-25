// Bordet (/bordet/): the lab's one view of the table, where a card's place, its way there and the films to order are set in
// one frame (Jakob 2026-11-17: "Scen och placering bör ha samma typ av vy, och på högersidan ska man kunna ändra och laborera
// med detta. Detta ska också vara underlaget för beställning av nya filmer."). Pure helpers for it: the anchor a card's films
// go from (the guide tree's, treeAnchor), the film the picture lays over the doll (cardFilm), step 2's folded line, the card
// and round Scen plays, and the films to order (step 3): each in his notation, with its step's one recipe
// (data/order-methods.json), what the store will resolve for it (lineOf, from the same pure functions the store uses), its five
// marks (first picture, last picture, reference film, text, price), its text and price as the order freezes them, and the
// choices sent for a server preview: the dealer, the step and the card, and over them only his deliberate exceptions.
// A row stops only on what cannot be sent (no first picture, no model or length, no price, a paused dealer), and then says
// what to do; a deal to a seat with no last picture yet goes without one, as the store makes it, a return waits for the deal
// whose last frame it starts in, and a recipe's status and its reference film only inform (Jakob 2026-11-23,
// "Rensa bort regler och låsningar som blockerar"). Nothing here composes an order: the store does, as for every draft. No
// DOM, no network; tests in studio/tests/bordet-line.test.ts (the rows and the stops) and studio/tests/line-same.test.ts, and
// for the film over the doll in studio/tests/tree-path.test.ts.
import { resolveRound, type Graph } from "../../src/clip-graph.ts";
import type { TreeView } from "../../src/dealer-trees.ts";
import {
  ANCHOR_NODE, ANCHOR_ROLE, LANDS_LABEL, a3Candidates, a3Name, costOf, credits, defaultFlip, genitive, giveEndOf, handsOf, landingOf, modelFor, paramsOf, referenceCandidates, seatEndOf, seatWords, stepOf,
  type Anchor, type BankFacts, type DealerLook, type FlipAxis, type HandChoice, type ModelDef, type PlanAnswer, type Policy, type RefCandidate, type SeatEnd, type Shape, type StepDef, type StepKey, type TextStyle,
} from "../../src/order-model.ts";
import { NO_RECIPE, methodFor, recipeFor, recipeHands, recipeWords, referenceAbsent, referenceByRule, secondsOf, triedWords, type MethodRegister, type Recipe } from "../../src/order-methods.ts";
import { TEMPLATE_VERSION, orderPrompt } from "../../src/order-prompts.ts";
import type { Place, Side } from "../../src/placement-model.ts";
import { SHOE } from "../../src/placement-model.ts";
import { dealAnchor, type NewOrderInput } from "./orders.ts";
import { partsOf, playable, type PlayPart } from "./parts.ts";
import { START_PLACE } from "./placement.ts";
import { SCENE_KEYS } from "./scene-keys.ts";
import { nodeCode } from "./names.ts";

// ── The anchor a card's films go from ──────────────────────────────────────
/**
 * The anchor Kortplan's card goes from and back to: the anchor at the shoe of the tree chosen in the guide (step 3; with none
 * chosen the tree the guide opens on, lib/new-film.ts pickTree), and A2.3 where no tree is read. Jakob 2026-11-24: "vi ska
 * köra enbart med hennes nya händer och de tatuerade klippen"; the tree Tatuerad deals every card from A2.3, Tatuerad nyp
 * from A2.1. Step 2, Kortbanan, the pose the doll deals from and Scen's round all name it. The plan's "Handbyte" chooses
 * nothing (it did from 2026-11-21 until the trees took over).
 */
export function treeAnchor(view: { hub: string } | null): Exclude<Anchor, "1"> {
  return (["2.1", "2.2", "2.3"] as const).find((a) => ANCHOR_NODE[a] === view?.hub) ?? "2.3";
}

/** The card a film or a round is shown for: the chosen card, or the start place's (P4C2, START_PLACE) with the shoe chosen. */
export const pathCard = (place: Place) => (place === SHOE ? START_PLACE : place);

/**
 * Whether the dealer's bank has a film each way between an anchor and a card, so that Scen can play the round from it. The
 * bank files a film from a pose at the shoe other than A2.1 (A2.2, A2.3) under A2.1's step as a take with that pose
 * (src/clip-graph.ts, HUB_VARIANT): such a take that is not rejected counts.
 */
export function hasRound(graph: Pick<Graph, "edge" | "experiments"> | null, card: string, anchor: Anchor): boolean {
  if (!graph) return false;
  const node = ANCHOR_NODE[anchor], variant = /^READY-/.test(node), base = variant ? "READY" : node;
  const way = (id: string) => {
    const e = graph.edge[id] ?? graph.experiments.find((x) => x.id === id);
    if (!e) return false;
    return variant ? e.takes.some((t) => t.hub === node && t.decision !== "REJECTED") : !!e.main;
  };
  return way(`${base}>${card}`) && way(`${card}>${base}`);
}

/**
 * The card's deal and back in his notation ("A2.2 - A3P6C1 - A2.2"): Bordet's default round, from the anchor the game deals
 * it from. `from`: the anchor Kortplan's films go from (treeAnchor), which the view passes only where the bank has that round
 * (hasRound); the game keeps its own until then.
 */
export function roundFor(card: string, dealer: string, from: Exclude<Anchor, "1"> | null = null): string {
  const at = nodeCode(ANCHOR_NODE[from ?? dealAnchor(dealer, card)]);
  return `${at} - ${nodeCode(card)} - ${at}`;
}

// ── The film over the doll ──────────────────────────────────────────────────
/**
 * The film Kortplan's picture can lay over the doll (Jakob 2026-11-25: "så man kan jämföra videos som är skapade med tex
 * dockan"): the dealer's deal to the card from the tree's anchor at the shoe, the frames of it that are played. The tree's own
 * film on the step where it has one that holds (finns: its take locked, a stand-in's from its own anchor, as Karta plays a
 * path, lib/tree-path.ts), else the game's own choice for the card's round from that anchor, as Bordet's Scen plays it
 * (resolveRound). Only the card's own film: a seat's film played for its second card lays the card on the first card's place
 * (src/dealer-trees.ts gameFilm leaves it out too). Null where there is none, or the bank has no file of it on this computer
 * (the part's gap). `own`: the film is the tree's own; `waits`: it waits for his verdict (the game plays such a film where
 * it has no other).
 */
export function cardFilm(graph: Graph | null, view: Pick<TreeView, "hub" | "steps"> | null, place: Place): { part: PlayPart & { path: string }; own: boolean; waits: boolean } | null {
  if (!graph || place === SHOE) return null;
  const hub = view?.hub ?? ANCHOR_NODE["2.3"];
  const step = view?.steps.find((s) => s.kind === "giv" && s.card === place) ?? null;
  const take = step?.state === "finns" ? step.take : null;
  const from = take && step?.via ? step.via : hub;
  const [deal] = resolveRound(graph, [{ from, to: place, ...(take ? { take } : {}) }, { from: place, to: from }]);
  if (!deal || deal.film !== deal.edge || (take && deal.take?.id !== take)) return null;
  const [part] = partsOf([deal]);
  return playable(part) ? { part, own: !!take, waits: deal.take?.decision === "PENDING" } : null;
}

// ── Step 2: what steers the motion ──────────────────────────────────────────
/** Step 2's line when folded: the anchor the card goes from and how it lies ("A2.3 · Stängt → öppet"). */
export function stepTwoSummary(place: Place, from: Exclude<Anchor, "1">, endSide: Side | null): string {
  if (place === SHOE || !endSide) return "Välj ett kort";
  return `${nodeCode(ANCHOR_NODE[from])} · ${LANDS_LABEL[endSide]}`;
}

// ── Step 3: the films to order ──────────────────────────────────────────────
/** One film on the list: a step, and the card it is about (null for a step without one). */
export type FilmWish = { step: StepKey; target: string | null };
export const wishKey = (w: FilmWish) => `${w.step}@${w.target ?? ""}`;

/** The bank's edges a film is filed under, as nodes: a deal tur och retur gives anchor → card → anchor. */
function nodesOf(step: StepDef, target: string | null, shape: Shape | null): string[] {
  const from = ANCHOR_NODE[step.from], to = ANCHOR_NODE[step.to ?? step.from];
  if (step.edge?.startsWith("IDLE>REVEAL(")) return ["IDLE", step.edge.slice("IDLE>".length), "IDLE"];
  if (step.card && target) {
    if (step.start === "LAND") return [target, to];
    return shape === "ROUND_TRIP" ? [from, target, from] : [from, target];
  }
  return [from, to];
}
/** "A2.1 → A3P4C1", "A3P4C1 → A2.1", "A1 → A2.1": a film in his notation (a deal is bara dit unless it is said to go tur och retur). */
export const wishLine = (step: StepDef, target: string | null, shape: Shape | null): string => nodesOf(step, target, shape).map(nodeCode).join(" → ");

/**
 * A deliberate exception on an opened row: what Jakob chose himself against the step's recipe (the model, its length, takes,
 * the text's style, tur och retur, another reference film or none, the hand, the side, the trial card scale) and his own
 * addition. Only what is chosen is sent; everything else is the recipe's, which the store fills in.
 */
export type RowChoice = Partial<{ model: string; duration: number; takes: number; style: TextStyle; shape: Shape; reference: string | null; hand: HandChoice; side: Side; cardScale: number; extra: string; /** A deal bara dit: an A3 candidate of the seat as its last picture (the exception "med kandidaten som sista bild"), or null for none where the seat has one ("utan slutbild", the command's --no-end). Nothing said: the seat's own, and none where it has none yet. */ end: string | null }>;

type EntryLike = { id: string; role: string; state?: string; node?: string; card?: string; hand?: string; served: string | null; name?: string; frame?: number; fps?: number | null };

/** The five things a film needs before it can be ordered, in the order a row shows them (Jakob 2026-11-21). */
export const MARK_NAMES = ["Första bild", "Slutbild", "Referensfilm", "Text", "Pris"] as const;
export type MarkName = (typeof MARK_NAMES)[number];
/**
 * One of a row's five marks: ready or not, and its few words ("A2.3", "ingen, A3P4C2 görs efteråt", "dockan", "128 ord",
 * "64 krediter"). A mark that is not ready also says what to do about it, in a sentence (`todo`). `waits`: nothing is
 * wrong and nothing is to be done here, it comes with another film (a return's first picture is its deal's last frame).
 */
export type Mark = { name: MarkName; ready: boolean; words: string; todo?: string; waits?: boolean };

/**
 * What the store makes of a film on the list, resolved the same way before a draft exists (tools/order-store.ts prepare, from
 * the same pure functions): the step's one recipe, and over it only his deliberate exceptions. `marks`: the five things a
 * film needs, each ready or not. Missing is only what cannot be sent: a picture that is not there, a model or a length that
 * nobody has chosen, a price outside the frame, a reference film he named that is gone. A reference film the recipe's rule
 * does not find is not missing: the film goes without one, and `notes` says so. Nor is a deal's last picture: where the
 * seat has none yet the deal goes without one (`open`). `why`: what to do about the first mark that is not ready, in the
 * order the store asks for them (the first picture, the model, the last picture, the reference film, the price), else
 * null; `waits`: that mark only waits for another film. A row can be ordered when all five are ready.
 */
export type Line = {
  recipe: Recipe | null;
  model: ModelDef | null;
  seconds: number | null;
  takes: number;
  style: TextStyle;
  /** A deal's shape; every other film is one way. */
  shape: Shape | null;
  /** The turn the draft gets: the recipe's; null where the recipe takes the plan's (the dealer's own cards). */
  flipAxis: FlipAxis | null;
  hands: { hand: "LH" | "RH"; pass: boolean };
  side: Side;
  reference: RefCandidate | null;
  /** The recipe takes a reference film by its rule (and he has not said otherwise on the row). */
  wanted: boolean;
  /** The film the recipe's rule finds for the step and the seat, whatever is chosen on the row: what "med" goes back to. Null where the rule finds none, or the recipe takes none. */
  ruled: RefCandidate | null;
  /** Where a deal bara dit ends: the seat's own end picture (its A3 for the laying hand, else the cut frame), or the A3 candidate he named; null where it goes without one. */
  end: SeatEnd<EntryLike> | null;
  /** The seat has an end picture of its own (whatever is chosen on the row): where it has, "utan slutbild" is his exception. */
  ownEnd: boolean;
  /** A deal bara dit that goes without a last picture: the seat has none yet, or he chose none. The film ends where the model leaves the card, and the seat's A3 is made from its last frame. */
  open: boolean;
  /** The seat's A3 candidates for the laying hand: what the exception "med kandidaten som sista bild" can name. */
  endChoices: EntryLike[];
  marks: Mark[];
  /** What the row tells that stops nothing: that the film goes without a reference film where the rule found none, or with neither a last picture nor a reference film. */
  notes: string[];
  /** The text the store writes for it, word for word; null where it is written only with the draft (a picture drawn or read off a film's frame, a still) or cannot be written yet. */
  text: string | null;
  /** What one draft costs at the policy's prices (all its takes), or null where no price is known. */
  cost: number | null;
  why: string | null;
  waits: boolean;
};

const HAND_WORD = { LH: "vänster hand", RH: "höger hand" } as const;
const ready = (name: MarkName, words: string): Mark => ({ name, ready: true, words });
const missing = (name: MarkName, words: string, todo: string): Mark => ({ name, ready: false, words, todo });
const waiting = (name: MarkName, words: string, todo: string): Mark => ({ name, ready: false, words, todo, waits: true });
const anchorCode = (at: Anchor) => nodeCode(ANCHOR_NODE[at]);
const wordCount = (text: string) => text.trim().split(/\s+/).length;
/** A row's `why` as the line it is shown as: a capital first and a full stop last. */
export const sentence = (words: string): string => `${words.charAt(0).toUpperCase()}${words.slice(1)}${/[.!?]$/.test(words) ? "" : "."}`;

/** A step without a recipe: nothing is preselected, so the one who orders says the model and the length (the store asks for the same). */
export const NO_MODEL = `${NO_RECIPE}: välj modell och längd under Receptet`;
/** A model without a length: a step without a recipe, or a recipe that says none. */
export const NO_LENGTH = "välj längd under Receptet";
/** The return to A2.3 (StepDef.off): its trial continues an approved deal on that deal's frozen last picture, which only the command finds. */
export const NOT_FROM_HERE = "provet beställs med kommandot (tools/order-new.ts), som själv hittar den godkända given och dess slutbild: be huvudagenten";
export function lineOf(input: {
  dealer: string; wish: FilmWish; methods: Pick<MethodRegister, "methods"> | null; bank: BankFacts | null; entries: readonly EntryLike[]; plan: Pick<PlanAnswer, "seats"> | null; choice?: RowChoice;
  /** The prices (data/order-policy.json); without them the row has no price. */
  policy?: Pick<Policy, "prices"> | null;
  /** The dealers' looks (GET /api/orders), which the text is written with; without them the row has no text. */
  dealers?: readonly Pick<DealerLook, "id" | "name" | "look">[];
  /** The pictures that show the card's marks (GET /api/orders, marks): a landing picture the blue side's, an anchor the yellow side's in the shoe's window. What the text says of the card. */
  marks?: Readonly<Record<string, boolean>>;
}): Line {
  const { dealer, wish, bank, entries } = input, c = input.choice ?? {};
  const def = stepOf(wish.step)!;
  const recipe = recipeFor(input.methods, wish.step, wish.target);
  const model = modelFor(def, c.model ?? recipe?.model ?? null);
  const deal = def.card && def.start !== "LAND";
  const shape: Shape | null = def.kind !== "FILM" ? null : deal ? (c.shape ?? recipe?.shape ?? "ONE_WAY") : "ONE_WAY";
  const seat = wish.target ? (input.plan?.seats[wish.target] ?? null) : null;
  const twoHands = def.grip === "TWO_HANDS";
  // The hand: his exception, else the recipe's (the hand at the shoe all the way), else what Placering says for the card.
  const byLine = recipeHands(def, recipe, seat);
  const hands = twoHands ? { hand: "LH" as const, pass: false } : c.hand ? handsOf(c.hand) : { hand: byLine.hand, pass: byLine.pass };
  const lays: "LH" | "RH" = twoHands || hands.pass ? "RH" : hands.hand;
  const side: Side = c.side ?? seat?.side ?? "FRONT";
  const oneWayDeal = deal && shape === "ONE_WAY";
  // A deal bara dit ends on the seat's own end picture (its A3 for the laying hand, else the cut frame), or on the A3
  // candidate he named. Where the seat has none yet, and where he chose none ("Utan slutbild", the command's --no-end), it
  // goes without a last picture, as the store makes it: the film ends where the model leaves the card, its A3 made afterwards.
  const own = oneWayDeal ? seatEndOf(entries, bank, { dealer, step: def, target: wish.target, hand: lays }) : null;
  const end = !oneWayDeal || c.end === null ? null : c.end ? seatEndOf(entries, bank, { dealer, step: def, target: wish.target, hand: lays, chosen: c.end }) : own;
  const open = oneWayDeal && !end && !c.end;
  const endChoices = oneWayDeal ? a3Candidates(entries, wish.target, lays) : [];
  // The reference film is a choice of the order, never a condition (the store, tools/order-store.ts prepare): the one he
  // named on the row; none where he said none; else the one the recipe's rule finds, and where it finds none the film goes
  // without one. `ruled` is the rule's film whatever the row says: what the row's choice "med" goes back to.
  const rule = recipe && recipe.reference !== "ingen" && model?.videos ? recipe.reference : null;
  const ruled = rule ? referenceByRule(bank, rule, { dealer, step: def, target: wish.target, model, shape, lays }) : null;
  const byRule = c.reference === undefined && !!rule;
  const reference = c.reference
    ? ((bank && model ? referenceCandidates(bank, { dealer, step: def, target: wish.target, model }).find((x) => (x.take === c.reference || x.film === c.reference) && x.fits) : null) ?? null)
    : byRule ? ruled : null;
  // With a reference film its own length rules, as in the store; his length is an exception only without one (orderBody).
  const seconds = def.kind !== "FILM" || !model ? null : (!reference && c.duration !== undefined ? c.duration : secondsOf(model, recipe?.seconds ?? null, reference));
  // What the store cannot write or price: a step that is off (the return to 2.3, made with the command), no model (a step
  // without a recipe, until he chooses one), no length. In few words for the marks, and in a sentence that says what to do.
  const writable = !!model && !def.off && (def.kind !== "FILM" || seconds !== null);
  const notHere = def.off ? "beställs med kommandot" : !model ? "ingen modell vald" : "ingen längd vald";
  const toWrite = def.off ? NOT_FROM_HERE : !model ? NO_MODEL : NO_LENGTH;

  // The anchor a picture is, where it holds (role, node, gäller, no card), as the store copies it (holding).
  const holds = (at: Anchor) => entries.find((e) => e.role === ANCHOR_ROLE[at] && e.state === "gäller" && !e.card && e.node === ANCHOR_NODE[at] && e.served !== null) ?? null;
  const anchorMark = (name: MarkName, at: Anchor, drawn = false) =>
    holds(at) ? ready(name, `${anchorCode(at)}${drawn ? " med kortet ritat" : ""}`) : missing(name, `${anchorCode(at)} saknas`, `ingen bild gäller för ${anchorCode(at)}: gör en gällande i Material`);
  // A return starts on the seat's landing picture for the hand that laid the card (with handbyte the right hand's): the
  // last frame of the deal there. Until that picture is made from the deal the return waits for it, which is no fault of
  // the row's. The words name the picture, not the deal: the deal may be there already, with its A3 not made yet.
  const startLanding = def.start === "LAND" ? landingOf(entries, wish.target, lays) : null;
  // The return to rest continues a give (Jakob 2026-11-23: from the laid card "direkt" to A1): with no landing picture it
  // starts on the last frame of the newest good give there in the bank, as the store takes it (giveEndOf), and the hand
  // that laid the card goes back.
  const giveEnd = wish.step === "RETUR-1" && !startLanding ? giveEndOf(bank, { dealer, target: wish.target }) : null;
  const a3 = wish.target ? a3Name(wish.target) : "";
  const first = def.start === "LAND"
    ? (startLanding ? ready("Första bild", a3) : giveEnd ? ready("Första bild", `sista rutan i given ${giveEnd.clip}`) : waiting("Första bild", `väntar på ${a3}`, `väntar på ${a3}: returen börjar i sista rutan av given dit, och ${a3} görs ur den`))
    : anchorMark("Första bild", def.from);
  const last = def.kind !== "FILM" ? ready("Slutbild", "ingen, en bild")
    : open ? ready("Slutbild", `ingen, ${a3} görs efteråt`)
    : oneWayDeal ? (end ? ready("Slutbild", end.kind === "LANDNING" ? `${a3}${end.candidate ? " (kandidat)" : ""}` : `snittruta ${end.cut.frame} ur ${end.cut.clip}`)
      : missing("Slutbild", `${c.end} är ingen kandidat`, `slutbilden som valdes (${c.end}) är ingen A3-kandidat för platsen med ${HAND_WORD[lays]} vid kortet: välj en annan under Receptet`))
    : deal || def.cards?.length ? anchorMark("Slutbild", def.from, true)
    : anchorMark("Slutbild", def.to ?? def.from);
  // What is not there where the recipe's rule finds no film, in the store's words (its draft's note).
  const absent = byRule && !reference ? `${referenceAbsent(rule!, def)}${lays === "RH" && !twoHands ? " (lagd med höger hand)" : ""}` : null;
  const referenceMark = reference ? ready("Referensfilm", reference.kind === "RENDERED" || reference.dealer === "docka" ? "dockan" : "godkänd giv")
    : c.reference ? missing("Referensfilm", "den valda finns inte", `referensfilmen som valdes (${c.reference}) finns inte bland dem som passar: välj en annan, eller ingen, under Receptet`)
    : ready("Referensfilm", absent || open ? "går utan" : "ingen");
  // What goes without a reference film although the recipe would take one, and a deal with neither picture nor film to show
  // the way: said, as the draft's notes say it, and nothing is stopped by it.
  const notes: string[] = [];
  if (open && !reference) notes.push(`Varken slutbild eller referensfilm går med${absent ? ` (${absent})` : ""}: bara första bilden och texten säger vart kortet ska.`);
  else if (absent) notes.push(`Går utan referensfilm: ${absent}.`);

  // The text, as the store writes it (textOf): the motion it stores, the plan's point for the card where the last picture
  // draws none, and the marks where the picture that shows the open card shows them.
  const look = input.dealers?.find((d) => d.id === dealer) ?? null;
  const shows = def.start === "LAND" ? startLanding : end?.kind === "LANDNING" ? end.entry : null;
  const drawnOrCut = (deal && shape === "ROUND_TRIP") || !!def.cards?.length || end?.kind === "SNITTRUTA" || !!giveEnd;
  let text: string | null = null;
  if (writable && look && model && def.kind === "FILM" && first.ready && last.ready && !drawnOrCut && (!def.card || seat)) {
    const turn = wish.step === "GIV-2.3" ? side === "FRONT" : def.start !== "LAND" && !!seat && side !== seat.startSide;
    const style = c.style ?? recipe?.style ?? "KORT";
    const axis: FlipAxis = wish.step === "GIV-2.3" && style === "KORT" && turn ? "FREE" : (recipe?.turn ?? defaultFlip(wish.step, seat?.turnAt, seat?.flipAxis));
    const held = twoHands ? { hand: "LH" as const, pass: true } : hands;
    const mall = recipe?.template ?? TEMPLATE_VERSION;
    // Without a last picture the marks are said as the store says them for it: pilot 02's (tools/order-store.ts textOf).
    const faceMark = open ? side === "FRONT" : !!shows && side === "FRONT" && !!input.marks?.[shows.id] && (def.start === "LAND" || wish.step.startsWith("GIV-"));
    // The yellow side's marks are said where the anchor the film starts on shows them on the card in the shoe's window.
    const backMark = def.start !== "LAND" && !!input.marks?.[holds(def.from)?.id ?? ""];
    text = orderPrompt({
      step: { key: wish.step, shape },
      motion: def.card && seat ? { grip: def.grip ?? "PINCH", hand: held.hand, pass: held.pass, turn, flipAxis: turn ? axis : null, side, target: wish.target } : null,
      // Without a last picture the text is the open deal's, which the store writes from the first picture alone.
      generation: { model: model.id }, pictures: open ? [{ goesAs: "startFrame" } as never] : [],
      prompt: { extra: (c.extra === undefined ? recipe?.extra : c.extra)?.trim() || null, style, template: mall !== TEMPLATE_VERSION ? `@${mall}` : "", faceMark, backMark },
      reference: { status: reference ? "FINNS" : "INGEN" },
    }, look, seat ? { x: seat.centre[0], y: seat.centre[1] } : null).text;
  }
  const takes = c.takes ?? recipe?.takes ?? 1;
  // The price where the model and the length are known, also on a row that is not ordered from here (Bordet shows it dimmed);
  // the row's own cost stays null until it can be ordered.
  const cost = model && (def.kind !== "FILM" || seconds !== null) ? lineCost(def, { model, seconds, takes, recipe }, input.policy ?? null) : null;
  // The text is not ready while a picture it is written against is missing. Where it is written only with the draft (a
  // picture drawn, or a last picture read off a film's frame) the row says so, and Förhandsvisa shows it word for word.
  const textMark = !writable ? missing("Text", notHere, toWrite)
    : text ? ready("Text", `${wordCount(text)} ord`)
    : !first.ready || !last.ready ? { ...missing("Text", "väntar på bilderna", (first.ready ? last : first).todo!), ...((first.ready ? last : first).waits ? { waits: true } : {}) }
    : ready("Text", "skrivs med utkastet");
  const priceMark = cost !== null ? ready("Pris", `${credits(cost)} krediter`)
    : !writable ? missing("Pris", notHere, toWrite)
    : input.policy ? missing("Pris", "inget pris i ramen", "ramen (data/order-policy.json) har inget pris för modellen med de här värdena: välj en annan modell eller längd under Receptet")
    : missing("Pris", "priserna är inte lästa", "priserna kunde inte läsas från servern: ladda om sidan");
  const marks = [first, last, referenceMark, textMark, priceMark];
  // The first mark that is not ready, in the order the store asks: no model before the last picture, a text that waits for
  // the pictures after them; what to do about it, and whether it only waits for another film.
  const stop = (writable ? [first, last, textMark, referenceMark, priceMark] : [first, textMark, last, referenceMark, priceMark]).find((m) => !m.ready) ?? null;
  return { recipe, model, seconds, takes, style: c.style ?? recipe?.style ?? "KORT", shape, flipAxis: recipe?.turn ?? null, hands, side, reference, wanted: byRule, ruled, end, ownEnd: !!own, open, endChoices, marks, notes, text, cost, why: stop?.todo ?? null, waits: !!stop?.waits };
}

export type FilmRow = {
  key: string;
  wish: FilmWish;
  /** His notation, and the step's own name ("Nyp, ett kort till platsen"). */
  line: string;
  label: string;
  /** The recipe in one line with the model and length the order gets, and the end it gets ("Kling 4 · 1080p · 3 s · bara given, utan slutbild · …" where the deal goes without a last picture, else "…, slutar på A3P4C2"), or "inget sätt är prövat än" (a step without a recipe). */
  recipe: string;
  /**
   * What has been tried with the recipe, in plain words in place of its status ("prövat i 6 beställningar", "inte prövat
   * än", "inget sätt är prövat än"), and Jakob's own last words about a take of those orders, or null. It informs; nothing
   * is stopped by it.
   */
  tried: string;
  said: string | null;
  /** The five marks in their order: Första bild, Slutbild, Referensfilm, Text, Pris. */
  marks: Mark[];
  /** All five marks are ready and the dealer is not paused: the row can be sent. */
  orderable: boolean;
  /** The text the order gets, word for word, or null (Line.text). */
  text: string | null;
  /** What one draft of it costs (all its takes), or null where it cannot be ordered. */
  cost: number | null;
  /** The body of POST /api/orders for it: the dealer, the step and the card, and his exceptions; null when it cannot be sent. */
  body: NewOrderInput | null;
  /** What stops it and what to do: that the dealer is paused, else about the first of the five marks that is not ready (Line.why), or null. */
  why: string | null;
  /** `why` is no fault: the row only waits for another film (Line.waits), a return for its deal. */
  waits: boolean;
  /** What the row tells that stops nothing (Line.notes). */
  notes: string[];
  /** The reference film that goes with it, or null; `wanted`: the recipe takes one by its rule; `ruled`: the film that rule finds, whatever the row says. */
  reference: RefCandidate | null;
  wanted: boolean;
  ruled: RefCandidate | null;
  /** He has chosen something against the recipe on the row. */
  chosen: boolean;
  /** Everything the store will resolve for it (what "Det här skickas" shows before the draft exists). */
  resolved: Line;
};

/**
 * The body of POST /api/orders for a film: the line and nothing else. The dealer, the step and the card; the store fills in
 * the recipe (model, length, shape, takes, text, the reference film its rule finds, the seat's end picture). Over that, only
 * his deliberate exceptions, with the keys the store reads them under.
 */
export function orderBody(dealer: string, wish: FilmWish, c: RowChoice = {}, row: { shape?: Shape | null; reference?: boolean } = {}): NewOrderInput | null {
  const def = stepOf(wish.step);
  if (!def) return null;
  const out: NewOrderInput = { dealer, step: wish.step, ...(def.card && wish.target ? { target: wish.target } : {}) };
  if (c.model !== undefined) out.model = c.model;
  // An exception the form hides is not sent (review of PR 1, 2026-11-21): the length only without a reference film (the
  // film's own length rules otherwise), the card's size only for a round trip, the end picture only for a deal bara dit.
  if (c.duration !== undefined && !row.reference) out.duration = c.duration;
  if (c.takes !== undefined) out.takes = c.takes;
  if (c.style !== undefined) out.style = c.style;
  if (c.shape !== undefined && def.card && def.start !== "LAND") out.shape = c.shape;
  if (c.reference !== undefined) out.reference = c.reference || null;
  if (c.hand !== undefined) Object.assign(out, c.hand === "PASS" ? { hand: "LH", pass: true } : { hand: c.hand, pass: false });
  if (c.side !== undefined) out.side = c.side;
  if (c.cardScale !== undefined && c.cardScale !== 1 && row.shape === "ROUND_TRIP") out.cardScale = c.cardScale;
  if (c.extra !== undefined) out.extra = c.extra.trim() || null;
  if (c.end !== undefined && def.card && def.start !== "LAND" && row.shape === "ONE_WAY") out.end = c.end;
  return out;
}

/** What one draft costs at the policy's prices: the model, the length and the takes the store will give it. */
export function lineCost(step: StepDef, line: Pick<Line, "model" | "seconds" | "takes" | "recipe">, policy: Pick<Policy, "prices"> | null): number | null {
  if (!line.model || !policy) return null;
  const params = paramsOf(step, line.model, step.kind === "FILM" ? { duration: line.seconds ?? undefined, resolution: line.recipe?.resolution } : {});
  return costOf({ model: line.model.id, params }, line.takes, policy.prices)?.total ?? null;
}

/**
 * A film of the list with its recipe, what the store will resolve for it, its five marks, its text and price as the order
 * freezes them, his exceptions and the body to send. `more.dealers` and `more.marks` (GET /api/orders) give the text, and
 * `more.dealers` the pause: nothing of a paused dealer's can be ordered (data/dealers.json, his word).
 */
export function filmRow(dealer: string, wish: FilmWish, methods: Pick<MethodRegister, "methods"> | null, policy: Pick<Policy, "prices"> | null, more: { bank?: BankFacts | null; choice?: RowChoice; entries?: readonly EntryLike[]; plan?: Pick<PlanAnswer, "seats"> | null; dealers?: readonly Pick<DealerLook, "id" | "name" | "look" | "paused">[]; marks?: Readonly<Record<string, boolean>> } = {}): FilmRow {
  const def = stepOf(wish.step)!;
  const method = methodFor(methods, wish.step, wish.target);
  const choice = more.choice ?? {};
  const resolved = lineOf({ dealer, wish, methods, bank: more.bank ?? null, entries: more.entries ?? [], plan: more.plan ?? null, choice, policy, dealers: more.dealers, marks: more.marks });
  const pausedBy = more.dealers?.find((d) => d.id === dealer && d.paused) ?? null;
  const orderable = !pausedBy && resolved.marks.every((m) => m.ready);
  return {
    key: wishKey(wish), wish, line: wishLine(def, wish.target, resolved.shape), label: def.label,
    recipe: recipeWords(method, wish.target, { model: resolved.model?.id ?? null, seconds: resolved.seconds, open: resolved.open }), ...triedWords(method), marks: resolved.marks, orderable, text: resolved.text,
    cost: orderable ? resolved.cost : null, body: orderable ? orderBody(dealer, wish, choice, { shape: resolved.shape, reference: !!resolved.reference }) : null,
    why: pausedBy ? `${pausedBy.name} är pausad: inget nytt beställs förrän pausen är hävd` : resolved.why,
    waits: !pausedBy && resolved.waits, notes: resolved.notes,
    reference: resolved.reference, wanted: resolved.wanted, ruled: resolved.ruled, chosen: Object.keys(choice).length > 0, resolved,
  };
}

/** "Dockans giv till plats 4", "Paows retur från plats 2": a reference film by whose it is and what it shows. */
export function referenceName(c: Pick<RefCandidate, "dealer" | "edge" | "goesTo">, names: Readonly<Record<string, string>>): string {
  const who = c.dealer === "docka" ? "Dockans" : genitive(names[c.dealer] ?? c.dealer);
  const back = !/^(READY(?:-[A-Z])?|DRAWN|IDLE)>/.test(c.edge);
  return `${who} ${back ? "retur från" : "giv till"} ${seatWords(c.goesTo)}`;
}

/**
 * What the order's text says of the reference film that goes with it, for the row's choice between with and without: with
 * template 14's short text a rough guide where her natural movement comes first (GUIDES), else that the movement follows it.
 */
export const referenceRole = (line: Pick<Line, "recipe" | "style">): string => (line.recipe?.template === 14 && line.style === "KORT" ? "grov vägledning, naturlig rörelse går före" : "rörelsen följer filmen");
/** "dockans film" or "referensfilm": a reference film by whose it is, for the choice "Med dockans film". */
export const referenceOwner = (c: Pick<RefCandidate, "kind" | "dealer">): string => (c.kind === "RENDERED" || c.dealer === "docka" ? "dockans film" : "referensfilm");

/**
 * Granska filmen: a film's last order (of the same dealer, step and card, not set aside) whose takes are shown beside
 * everything that was sent for it: the newest that brought a film (`delivered`), else the newest; null when the film has
 * never been ordered.
 */
export function lastOrder<A extends { order: { id: string; dealer: string; status: string; created: string; step: { key: string }; motion?: { target: string | null } | null } }>(orders: readonly A[], dealer: string, wish: FilmWish, delivered: (id: string) => boolean = () => false): A | null {
  const mine = [...orders].filter((a) => a.order.dealer === dealer && a.order.step.key === wish.step && (a.order.motion?.target ?? null) === wish.target && a.order.status !== "AVBRUTEN").sort((a, b) => b.order.created.localeCompare(a.order.created));
  return mine.find((a) => delivered(a.order.id)) ?? mine[0] ?? null;
}

/**
 * The words of the scene's address (the view Scen's before 2026-11-17, now Bordet's Scen, Råfilm and Efterarbete): the round
 * (runda, kant, tagning, vy), the look (forval and every key of the scene, lib/scene-keys.ts) and the lab's own (robot).
 * None of them is one of Bordet's own words (lage, plats, ko, order, ny, …).
 */
export const sceneWords: ReadonlySet<string> = new Set(["runda", "kant", "tagning", "vy", "robot", "forval", ...SCENE_KEYS.map((s) => s.key as string)]);

/**
 * Bordet's scene with the same thing on screen, for an address of the view Scen (/, /scen/): the round and the look kept,
 * vy=platt as the mode Råfilm, anything else as the mode Scen; with no round and no look, Bordet as it opens (Kortplan).
 * /?runda=A2.1%20-%20P4C1&vy=platt leads to /bordet/?lage=rafilm&runda=A2.1+-+P4C1.
 */
export function bordetSceneAddress(params: { forEach(fn: (value: string, key: string) => void): void; get(name: string): string | null }): string {
  const rest: [string, string][] = [];
  let scene = false;
  params.forEach((value, key) => {
    if (key === "vy" || key === "lage") return;
    if (sceneWords.has(key) && key !== "robot") scene = true;
    rest.push([key, value]);
  });
  const platt = params.get("vy") === "platt";
  const p = new URLSearchParams(scene || platt ? [["lage", platt ? "rafilm" : "scen"], ...rest] : rest);
  const q = p.toString();
  return `/bordet/${q ? `?${q}` : ""}`;
}
