// The doll (Jakob 2026-11-23): the white doll at the table in a view the mouse turns, dealing one card from an entry (A2.3,
// or A2.1; lay.ts Entry) to a place of his plan, with play, pause, scrubbing and speed, the joints and the fingertips on the
// card marked, her poses A1, A2.1 and A2.3 to look at (in the picture's row), the sliders that lay the deal again as they
// are moved, and "Spara som standard", which writes what is shown as a motion file for that doll and place
// (dealer3d/standard/, lay.ts standardName; the routes are dealer3d/page/server.ts).
// What is shown is what an order films (Jakob 2026-11-26: "everything must be watertight and not unnecessarily
// complicated"): the deal with its return to the entry's pose, laid by the one chain of page/natural-lab.ts (filmRules,
// filmDeal, filmed) that dealer3d/tools/docka-cykel.ts writes an order's motion with, from the same state. From A2.3 a
// dealer's doll deals "Naturlig" and the standard doll as the deal was laid before (natural-lab.ts wayFor: no choice of it);
// from A2.1 the deal is the pinch's own, built on the doll's bones with its return (dealer3d/src/pinch-deal.ts, as
// docka-cykel.ts builds it), and nothing here steers it. The room and the doll are dealer3d/src/stage.ts's
// (page/lab-stage.ts): nothing is drawn or posed here that those and the chain do not make.
// A control that cannot act where it stands is not shown (Jakob 2026-11-26), each condition measured: from A2.1 none of
// them; for a card laid closed no turn, no landing, and not the hand's height or where and when the turn begins; for a
// recipe without a contact grip (the roll: seats 6 and 7's first card and her own cards) no hand's angle on the card; for
// the standard doll no landing, turn, shoulders or elbows (only "Naturlig" has them).
// Everything is laid here, with the shoe the films have (src/table-lens.ts SHOE). A standard he has saved is laid again
// from its recipe and his sliders by the same chain; the file's frames are not played.
// The side a dealer's card lies with is the plan's, and only the plan's (its intent.endSide, read as it stands; lay.ts
// Steer.side): the same fact was chosen in two places, in Inspelning and in a choice of the lab's own, until Jakob
// 2026-11-25 ("Simplifiera väldigt mycket, men framförallt så inte förväxlingar kan ske"). A standard saved with the other
// side is laid with the plan's. A closed card is slid face down and never turned (natural-lab.ts filmRules).
// A click in the picture (no drag) chooses the place nearest the point of the felt under the pointer, as its button does.
// Embedded in the studio (?inbaddad=1, Bordet's Inspelning: one picture, the 3D one, Jakob 2026-11-25) the doll is the dealer
// chosen there, the entry is the studio's (its guide tree's anchor: the lab shows no choice of it), the plan is the studio's
// draft as it is changed, the page is the picture alone and the controls stand in the studio's own column (the end of this
// file); a place can be moved on the felt by hand while the studio asks for it, and the dealer's film of the card's deal can
// be laid over the doll in "Filmens kamera" (the film over the doll, below).
// window.docklabb is for a test that looks at the page: ready, facts() of what is shown, and at(place): where a place lies in the picture.
import {createLabStage, type LabStage, type Touch, type ViewName} from './lab-stage.ts';
import {DEALER_CARD, NO_STEER, cardInFilmsShoe, cardTempoMost, cardTempoOf, placeFrom, planPoint, recipeOf, shares, sideOf, sideOfPlan, standardName, type Entry, type Side, type LaidDeal, type PoseFilm, type Recipe, type Steer, type Stored} from './lay.ts';
import {ENDS, NO_KNOBS, dollFor, filmDeal, filmRules, filmed, gripYawsOf, onDoll, savedState, wayFor, type FilmInput, type Knobs, type Way} from './natural-lab.ts';
import {LANDINGS, LANDING_DEFAULT, SHAPING_KNOBS, asBefore, landingOf, landingWords, type Landing, type LandingReceipt} from '../src/landing.ts';
import {TURNS, TURN_DEFAULT, type TurnId, type TurnReceipt} from '../src/turn-in-hand.ts';
import type {PoseOptions} from './pose-on-doll.ts';
import {dollNamed, type Doll} from '../src/doll.ts';
import {filmLens, spots, type Plan} from '../src/world.ts';
import {pinchDeal, type Anchor21} from '../src/pinch-deal.ts';
import {CARD, type Vec3} from '../src/camera.ts';
import {TWO_HAND} from '../src/two-hand.ts';
import type {Read} from '../src/stage.ts';

type Pose = 'A1' | 'A2.1' | 'A2.3';
type Shown = {kind: 'pose'; pose: Pose} | {kind: 'deal'};
/** How a deal shown was laid: a way from A2.3, or built (from A2.1). */
type How = Way | 'byggd';
type Motion = Read & {doll?: string; lab?: Record<string, unknown>; cycle?: unknown};
type Standard = {name: string; doll: string; place: string; savedAt: string};
/** What a saved standard carries of how it was made: the recipe, the sliders, for "Naturlig" the shoulders and elbows (`naturlig`, which a standard saved before has not), the landing and the turn where they are not the default (`landing`, landing.ts; `turn`, turn-in-hand.ts), and when it was saved (`savedAt`). (Its return, `back`, is a record only: it is laid again from the rest.) */
type SavedLab = {recipe?: string; steer?: Steer; bodyAsked?: [number, number, number]; shortMm?: number; naturlig?: {knobs?: Partial<Knobs>; bodyShare?: number}; landing?: unknown; turn?: unknown; savedAt?: string};
/** An element of the picture, which is always this page's own (#stage, #frame, #views, #joints, #grip, #note, #play, #scrub, #clock, #speed, #loop, and the film over the doll: #film, #filmKnob, #filmShare, #filmShown, #filmNote). */
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
// The controls: everything under one root, which embedded may stand in the page around (attach, below); so a control is
// always looked up through the root, never through this page's document.
const root = document.querySelector<HTMLElement>('.docklabb-styr')!, aside = document.querySelector<HTMLElement>('aside')!;
const ctl = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!, ctls = <T extends HTMLElement = HTMLButtonElement>(selector: string) => [...root.querySelectorAll<T>(selector)];
// The address may name the doll, the entry and the card to begin on (/dealer3d/docka?docka=paow&fran=a2-1&plats=p4c1):
// the studio's Bordet opens the lab on the card chosen there. Without the words, or with a place no deal is laid to
// from the entry, it begins as before. `inbaddad=1` in a frame of the lab's own origin: embedded (the end of this file).
const asked = new URLSearchParams(location.search), embedded = asked.get('inbaddad') === '1' && parent !== window;
// What the page around says before the lab has started waits until it has.
const early: MessageEvent[] = []; let hear: ((e: MessageEvent) => void) | null = null;
if (embedded) addEventListener('message', e => { if (hear) hear(e); else early.push(e); });
const get =async (address: string) => { const r = await fetch(address, {cache: 'no-store'}); if (!r.ok) throw Error(`${address}: ${r.status}`); return r.json(); };
const files = new Map<string, Promise<unknown>>(), stored = <T>(name: string) => { let p = files.get(name); if (!p) { p = get(`/dealer3d/data/${name}.json`); files.set(name, p); } return p as Promise<T>; };
const comma = (n: number, digits = 0) => n.toFixed(digits).replace('.', ',').replace('-', '−');
const DOLLS: Record<string, string> = {paow: 'Paow', standard: 'Standarddockan'}, LENT = {'seat 5': 'receptet lånat av plats 5', 'her first card': 'receptet lånat av kort 1'};
/** Why no deal goes from the entry to a place (lay.ts placeFrom's `none`), in his words. */
const WHY: Record<string, string> = {reach: 'en spelares andra kort läggs alltid med svepet, och med svepet räcker inte hennes högra arm dit', unposed: 'dockan har ingen ställning A2.1', closed: 'ett stängt kort vänds aldrig i hennes fingrar, så det läggs från A2.3'};
const whyOf = (r: ReturnType<typeof placeFrom>) => r && 'none' in r ? WHY[r.none] ?? 'dockan lägger inget kort dit' : '';
// The pose films: A1 is the first frame of the film to A2.3 and A2.3 its last; A2.1, the pinch at the shoe, is the first
// frame of her built deal (pinch-deal.ts, from her pose A2.1, lay.ts POSE_21).
const POSES: Record<Pose, {film: string; end: boolean; built?: boolean; said?: string}> = {
  'A1': {film: 'till-ankare-2-3-c', end: false}, 'A2.3': {film: 'till-ankare-2-3-c', end: true},
  'A2.1': {film: '', end: false, built: true, said: 'Nypet A2.1'}};
const placeWords = (id: string) => { const m = /^(?:P([1-7])|D)\.C([123])$/.exec(id)!; return m[1] ? `plats ${m[1]}, kort ${m[2]}` : `dealern, kort ${m[2]}`; };
const knobsOf = (k?: Partial<Knobs>): Knobs => ({shoulderR: [...(k?.shoulderR ?? NO_KNOBS.shoulderR)] as [number, number], shoulderL: [...(k?.shoulderL ?? NO_KNOBS.shoulderL)] as [number, number], elbowOut: [...(k?.elbowOut ?? NO_KNOBS.elbowOut)] as [number, number]});

// The plan in use: the saved one (GET /dealer3d/plan), until the page around sends its draft (takePlan). `planNo` counts the
// plans taken, so that a laying begun on one is dropped once another has come.
let plan = await get('/dealer3d/plan').catch(e => { $('note').textContent = 'Dockan kunde inte läsa kortplanen.'; throw e; }) as Plan, planText = JSON.stringify(plan), planNo = 0;
const lens = filmLens();
/** The side the plan has a dealer's card lie with (null for a player's card, or where the plan says none). */
const planSide = (id: string): Side | null => DEALER_CARD.test(id) ? sideOfPlan(plan, id) : null;
/** A steering with the plan's side: a dealer's card the plan has closed is laid closed (Steer.side 'BACK'), every other card open. */
const sided = (steer: Steer, id: string): Steer => { const {side: _side, ...rest} = steer; return planSide(id) === 'BACK' ? {...rest, side: 'BACK'} : rest; };
/** The steering where nothing is moved: the recipe as it is, and the card on the side the plan has it. */
const baseSteer = (id: string): Steer => sided({...NO_STEER}, id);
// (`wanted`: a card asked for that no deal goes to from the entry; the picture keeps the card it shows, and says why)
const state = {doll: 'paow', entry: 'A2.3' as Entry, shown: {kind: 'deal'} as Shown, place: 'P4.C1', wanted: null as string | null, steer: {...NO_STEER} as Steer, knobs: knobsOf(), landing: {id: LANDING_DEFAULT} as Landing, turn: TURN_DEFAULT as TurnId, touched: false, playing: false, speed: 1, loop: false, joints: false, view: 'film' as ViewName, t: 0};
/** Whether a deal goes from `entry` to the place `id` (for the chosen doll: from A2.1 one with the pose A2.1). */
const opens = (entry: Entry, id: string) => { const r = placeFrom(entry, id, state.doll, plan); return !!r && !('none' in r); };
/** The first place of the plan a deal goes to from `entry`. */
const firstOpen = (entry: Entry) => Object.keys(plan.targets).find(id => opens(entry, id));
{ if (Object.hasOwn(DOLLS, asked.get('docka') ?? '')) state.doll = asked.get('docka')!; if (asked.get('fran') === 'a2-1') state.entry = 'A2.1';
  const m = /^(?:p([1-7])|d)c([123])$/.exec(asked.get('plats') ?? ''), id = m ? `${m[1] ? `P${m[1]}` : 'D'}.C${m[2]}` : null;
  if (id && Object.hasOwn(plan.targets, id) && opens(state.entry, id)) state.place = id; else if (!opens(state.entry, state.place)) state.place = Object.keys(plan.targets).find(k => opens(state.entry, k)) ?? state.place;
  state.steer = baseSteer(state.place); }
/** The way the chosen doll deals from A2.3 (natural-lab.ts wayFor): "Naturlig", or as the deal was laid before for the standard doll. */
const wayOf = (): Way => wayFor(dollNamed(state.doll));
// What is on the stage now: the motion, and for a deal what it was laid from. `from`: a saved standard (laid again from what it was saved with), laid here as steered, or a pose. `savedAt`: when the standard shown was saved (its lab.savedAt). `rules`: what the chain laid it by (natural-lab.ts filmRules). `fault`: why the last laying did not go (the motion is then the last that did).
type Now = {doll: string; place: string | null; entry: Entry; motion: Motion; deal: LaidDeal | null; recipe: Recipe | null; lent: string | null; shortMm: number; saved: boolean; said: string | null;
  way: How; from: 'saved' | 'laid' | 'pose'; savedAt: string | null; bodyShare: number | null; receipt: ReturnType<typeof filmed>['receipt'] | null; landed: LandingReceipt | null; turned: TurnReceipt | null; rules: ReturnType<typeof filmRules> | null};
let now: Now | null = null, fault: string | null = null, laid: {key: string; value: LaidDeal} | null = null;
// His saved standards, and the one before each (`forra`: what a save replaced or "Alla till förvalet" laid aside, which
// "Ta tillbaka den förra" takes back; dealer3d/page/server.ts). Read when the page starts and from every answer that changes
// them. `savedWhen`: when each standard read was saved, as its own file says (lab.savedAt).
let standards: Standard[] = [], before: Standard[] = [], stage: LabStage | null = null, held = 0;
const savedWhen = new Map<string, string>();
const takeLists = (a: {standards?: Standard[]; forra?: Standard[]}) => { standards = a.standards ?? []; before = a.forra ?? []; };
const readLists = async () => takeLists(await get('/dealer3d/standard').catch(() => ({})));
await readLists();
/** While a change of the saved standards is asked (its buttons wait), and what the last one said, until another place is chosen. */
let busy = false, notice: {text: string; warn?: boolean} | null = null;

/** A motion made with the standard doll, on the doll `D` (the chosen one, as a way has her); and how far paow's arm is too short at the worst, millimetres. */
const posedOn = (motion: object, D: Doll, options?: PoseOptions) => onDoll(lens, motion, D, options) as unknown as {motion: Motion; shortMm: number};
const plain = (e: unknown) => { const s = String((e as Error)?.message ?? e); return /reach/.test(s) ? 'armen når inte' : /frames to turn|too few|settle/.test(s) ? 'för snabbt för vändningen' : /grip/.test(s) ? 'greppet passar inte platsen' : /return moves too far/.test(s) ? 'återgången går för fort' : 'går inte att räkna'; };

/** Her deal from A2.1 to a place, built on the doll's bones from her pose A2.1 (`pose`, lay.ts POSE_21), its return in it; the last one built is kept. */
let builtLast: {key: string; value: ReturnType<typeof pinchDeal>} | null = null;
async function builtDeal(pose: string, place: string, D: Doll) {
  const anchor = await stored<Anchor21>(pose), key = `${planNo} ${pose} ${place} ${D.name}`; if (builtLast?.key === key) return builtLast.value;
  const spot = spots(plan, lens).find(s => s.id === place); if (!spot) throw Error(`reach: ${place} is not in the plan`);
  builtLast = {key, value: pinchDeal({start: {hip: anchor.hip, frame: anchor.frame}, place, at: spot.at as [number, number, number], doll: D, lens})}; return builtLast.value;
}
/** A recipe by the name of its stored deal, and the pose film it begins on. */
const recipeNamed = async (name: string) => { const recipe = recipeOf(name, await stored<Stored & Motion>(name)); return {recipe, pose: await stored<PoseFilm>(recipe.poseFilm ?? 'till-ankare-2-3')}; };
/** Where the deal from the entry to the place comes from: a recipe (A2.3) or her pose A2.1, which it is built from. */
async function dealOfPlace(entry: Entry, place: string, doll: string) {
  const r = placeFrom(entry, place, doll, plan); if (!r || 'none' in r) return null;
  if ('pinch' in r) return {pinch: r.pinch, lent: null};
  return {...await recipeNamed(r.recipe), lent: r.lent ? LENT[r.lent] : null};
}
const untouched = () => JSON.stringify(state.steer) === JSON.stringify(baseSteer(state.place)) && JSON.stringify(state.knobs) === JSON.stringify(NO_KNOBS) && asBefore(state.landing) && state.turn === TURN_DEFAULT;
type Laid = {motion: Motion; deal: LaidDeal | null; shortMm: number; bodyShare: number | null; receipt: Now['receipt']; landed: LandingReceipt | null; turned: TurnReceipt | null; rules: Now['rules']};
/**
 * Lays the deal from the chosen entry to the chosen place as an order films it (natural-lab.ts filmed: the deal with its
 * return), as steered, on the doll; or, untouched, the standard saved for the doll and place, laid again from its recipe
 * and his sliders by the same chain. From A2.1 the pinch's own deal, as built. Keeps what is shown where the laying does
 * not go.
 */
async function showDeal(keepTime = false) {
  const place = state.place, doll = state.doll, entry = state.entry, planned = planNo, found = await dealOfPlace(entry, place, doll);
  const stale = () => place !== state.place || doll !== state.doll || entry !== state.entry || planned !== planNo;
  if (!found || stale()) return;
  // (a standard is saved from A2.3 only: from A2.1 nothing here steers the deal)
  let saved = state.touched || entry !== 'A2.3' ? undefined : standards.find(s => s.name === standardName(doll, place)); const D = dollNamed(doll);
  try {
    let lab: SavedLab | null = null;
    // (a standard laid aside since the list was read, in another tab or by an agent, is no longer there: the default holds)
    if (saved) { const file = await get(`/dealer3d/standard/${saved.name}.json`).catch(() => null) as Motion | null; if (stale()) return;
      if (file) { lab = (file.lab ?? {}) as SavedLab; if (typeof lab.savedAt === 'string') savedWhen.set(saved.name, lab.savedAt); } else { saved = undefined; await readLists(); if (stale()) return; } }
    let way: How, recipe: Recipe | null = null, shown: Laid;
    if (found.pinch !== undefined) {
      // From A2.1: built on her bones with its return, as docka-cykel.ts films it from A2.1.
      const built = await builtDeal(found.pinch, place, D); if (stale()) return;
      way = 'byggd'; shown = {motion: built.motion as unknown as Motion, deal: null, shortMm: built.shortMm, bodyShare: null, receipt: null, landed: null, turned: null, rules: null}; }
    else {
      let {recipe: own, pose} = found;
      // (the side is the plan's, whichever the standard was saved with)
      if (lab) { const s = savedState(lab); state.steer = sided(s.steer, place); state.knobs = s.knobs; state.landing = s.landing; state.turn = s.turn;
        if (s.recipe && s.recipe !== own.from) ({recipe: own, pose} = await recipeNamed(s.recipe)); if (stale()) return; }
      recipe = own; way = wayFor(D);
      const input: FilmInput = {plan, place, recipe: own, pose, doll: D, lens, steer: state.steer, knobs: state.knobs, landing: state.landing, turn: state.turn}, rules = filmRules(input);
      // (the deal is laid again only when what it takes has changed: the body (in "Naturlig"), shoulders, elbows, landing and turn move the doll after it, natural-lab.ts filmDeal)
      const key = JSON.stringify([planned, doll, place, own.from, rules.way === 'naturlig' ? {...rules.steer, body: null} : rules.steer]);
      if (laid?.key !== key) laid = {key, value: filmDeal(input)};
      const f = filmed(laid.value, input);
      shown = {motion: f.motion as unknown as Motion, deal: laid.value, shortMm: f.shortMm, bodyShare: f.bodyShare, receipt: f.receipt, landed: f.landing, turned: f.turn, rules}; }
    now = {doll, place, entry, recipe, lent: found.lent, said: way === 'byggd' ? `byggd på ${DOLLS[doll]}s kropp` : null, way, saved: !!saved, from: saved ? 'saved' : 'laid', savedAt: saved ? savedWhen.get(saved.name) ?? saved.savedAt : null, ...shown};
    fault = null;
  } catch (e) { fault = plain(e); console.warn(e); if (!now || now.place !== place || now.doll !== doll || now.entry !== entry || state.shown.kind !== 'deal') { paint(); return; } }
  if (stale()) return;
  state.shown = {kind: 'deal'}; const t = keepTime ? state.t : 0; stage!.setTarget(place); stage!.setMotion(now!.motion); state.t = Math.min(t, stage!.duration()); stage!.setTime(state.t); paint();
}
async function showPose(pose: Pose) {
  // A1 and A2.3 on the doll as the way has her (in "Naturlig" her left hand at the shoe as her picture has it); A2.1 the first frame of her built deal.
  const p = POSES[pose], doll = state.doll; let posed: {motion: Motion};
  if (p.built) { const r = placeFrom('A2.1', 'P4.C1', doll); if (!r || !('pinch' in r)) { fault = WHY.unposed; paint(); return; }
    const m = (await builtDeal(r.pinch, 'P4.C1', dollNamed(doll))).motion as unknown as Motion & {frames: unknown[]}; if (doll !== state.doll) return;
    posed = {motion: {...m, frameCount: 1, frames: m.frames.slice(0, 1), cycle: undefined} as Motion}; }
  else { const film = await stored<Motion>(p.film); if (doll !== state.doll) return;
    posed = posedOn(film, dollFor(wayOf(), dollNamed(doll))); posed.motion = cardInFilmsShoe(posed.motion as Motion & {frames: {card: {c: number[]; l: number[]; n: number[]}}[]}); } // the pose films' card stood in the shoe of before 2026-11-23
  state.shown = {kind: 'pose', pose}; state.playing = false; fault = null;
  now = {doll, place: null, entry: state.entry, motion: posed.motion, deal: null, recipe: null, lent: null, shortMm: 0, saved: false, said: p.said && doll !== 'standard' ? `${p.said} på ${DOLLS[doll]}s kropp` : p.said ?? null, way: wayOf(), from: 'pose', savedAt: null, bodyShare: null, receipt: null, landed: null, turned: null, rules: null};
  stage!.setMotion(posed.motion); state.t = p.end ? stage!.duration() : 0; stage!.setTime(state.t); paint();
}
const show = (keepTime = false) => state.shown.kind === 'deal' ? showDeal(keepTime) : showPose(state.shown.pose);

// The body that is drawn (Jakob 2026-11-26: "Se till att vi använder denna nya standarddocka för allt som syns i också
// 'blackjack-dealer'"): the standard doll's model, the woman unless the address says ?figur=man, posed from the same joints
// as the white figure and made as large as the figure's arms are. ?figur=vit, or a computer where the model is not built
// (it is local media of avatar-auto-pipeline), keeps the white figure. The doll chosen on the page is still whose measures
// the motion is laid for; the model is only what is seen.
const FIGURE = asked.get('figur') === 'vit' ? null : asked.get('figur') === 'man' ? 'man' : 'kvinna';
const figureNow = async () => FIGURE ? (await import('../src/figure-model.ts')).loadFigure(`/dealer3d/figur/${FIGURE}.glb`).catch(() => null) : null;
/** A stage for the chosen doll on a canvas of its own (a stage's doll is fixed when it is made). */
async function setDoll(name: string) {
  state.doll = name; state.touched = false; notice = null; state.steer = baseSteer(state.place); state.knobs = knobsOf(); state.landing = {id: LANDING_DEFAULT}; state.turn = TURN_DEFAULT;
  const [film, figure] = await Promise.all([stored<Motion>('till-ankare-2-3-c'), figureNow()]);
  const first = posedOn(film, dollNamed(name)).motion, old = $('stage'), canvas = document.createElement('canvas'); canvas.id = 'stage';
  stage?.dispose(); old.replaceWith(canvas); size(canvas); stage = createLabStage(canvas, plan, dollNamed(name), first, figure); stage.setJoints(state.joints); stage.setGrips(gripsShown()); stage.setTarget(state.place); stage.view(state.view);
  await show();
}
function size(canvas = $<HTMLCanvasElement>('stage')) { const box = $('frame').getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), w = Math.max(2, Math.round(box.width * dpr)), h = Math.max(2, Math.round(box.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; stage?.resized(); } }
/** The fingertips on the card are marked with the joints, and always close on the card. */
const gripsShown = () => state.joints || state.view === 'card';

// The sliders: each shows the recipe's own value until it is moved (the hand's angle on the card: in "Naturlig" 17° as her
// right hand takes it and −30° once it is turned, natural-lab.ts gripYawsOf), and lays the deal again when it is. Each is
// shown only where it can act (`on`; `turns`: not for a card laid closed, which the chain never turns: natural-lab.ts
// filmRules); from A2.1 none. "Var kortet vänds" and "Kortets fart" end where every card they apply to still lays
// (natural-lab.ts ENDS).
type Knob = {name: string; group?: string; min: () => number; max: () => number; step: number; on: () => boolean; value: () => number; set: (v: number) => void; text: (v: number) => string; turns?: boolean};
/** Whether the card shown is laid closed (lay.ts Steer.side): it is never turned. */
const closedNow = () => sideOf(state.steer) === 'BACK';
const R = () => now?.recipe ?? null, bodyNow = (): [number, number, number] => state.steer.body ?? ((now?.deal?.lab as {bodyAsked?: [number, number, number]} | undefined)?.bodyAsked ?? ((now?.motion.lab as {bodyAsked?: [number, number, number]} | undefined)?.bodyAsked) ?? [0, 0, 0]);
/** The hand's two angles on the card, as her right hand takes it and once it is turned; moving either slider sets both, the other as it shows (both at −30: "Naturlig" as it was before the two). */
const yawsNow = (): [number, number] => (R() && gripYawsOf(R()!, state.steer, wayOf())) ?? [15, 15];
const yawKnob = (j: 0 | 1, name: string): Knob => ({name, min: () => -45, max: () => 40, step: 1, on: () => !!R()?.pace.contactGrip, value: () => yawsNow()[j], set: v => { const y = yawsNow(); y[j] = v; state.steer.gripYaw = y[0]; state.steer.gripYawEnd = y[1]; }, text: v => `${comma(v)}°`});
const body = (i: number, name: string, min: number, max: number, text: (v: number) => string, group?: string): Knob => ({name, group, min: () => min, max: () => max, step: 0.5, on: () => !!R(), value: () => bodyNow()[i], set: v => { const b = [...bodyNow()] as [number, number, number]; b[i] = v; state.steer.body = b; }, text});
/** A slider of "Naturlig" only: a shoulder or an elbow, laid on the doll by dealer3d/src/natural.ts. */
const natural = (key: keyof Knobs, j: 0 | 1, name: string, min: number, max: number, step: number, text: (v: number) => string): Knob => ({name, min: () => min, max: () => max, step, on: () => !!R() && wayOf() === 'naturlig', value: () => state.knobs[key][j],
  set: v => { const k = [...state.knobs[key]] as [number, number]; k[j] = v; state.knobs = {...state.knobs, [key]: k}; }, text});
const cm = (up: string, down: string) => (v: number) => v ? `${comma(Math.abs(v), 1)} cm ${v > 0 ? up : down}` : '0', out = (v: number) => v ? `${comma(Math.abs(v))}° ${v > 0 ? 'ut' : 'in'}` : '0°';
const KNOBS: Knob[] = [
  {name: 'Var kortet vänds', group: 'Kortet', turns: true, min: () => 0, max: () => Math.round(ENDS.turnNear * 100), step: 5, on: () => !!R()?.pace.single, value: () => Math.round((state.steer.turnNear ?? R()?.pace.turnNear ?? 0) * 100), set: v => { state.steer.turnNear = v / 100; }, text: v => v ? `${v} % av vägen` : 'från handbytet'},
  {name: 'Vändningen börjar', turns: true, min: () => R() && shares(R()!) ? -(R()!.pace.shared?.wait ?? 1) : -6, max: () => R() && shares(R()!) ? 20 : 10, step: 1, on: () => !!R(), value: () => state.steer.turnLater, set: v => { state.steer.turnLater = v; }, text: v => v ? `${v > 0 ? '+' : ''}${comma(v / 30, 2)} s` : 'som receptet'},
  {name: 'Handens höjd', turns: true, min: () => 1, max: () => 12, step: 0.5, on: () => !!R()?.pace.single, value: () => (state.steer.carry ?? R()?.pace.carry ?? TWO_HAND.heights.carry) * 100, set: v => { state.steer.carry = v / 100; }, text: v => `${comma(v, 1)} cm`},
  yawKnob(0, 'Handens vinkel när högerhanden tar kortet'),
  yawKnob(1, 'Handens vinkel när kortet är vänt och läggs'),
  body(2, 'Lutning framåt', -5, 30, v => `${comma(v, 1)}°`, 'Kroppen'),
  body(0, 'Lutning åt sidan', -25, 25, v => v ? `${comma(Math.abs(v), 1)}° mot plats ${v > 0 ? 7 : 1}` : '0°'),
  body(1, 'Vridning', -15, 30, v => v ? `${comma(Math.abs(v), 1)}° ${v > 0 ? 'höger' : 'vänster'} axel fram` : '0°'),
  natural('shoulderR', 0, 'Höger axel upp', -2, 4, 0.5, cm('upp', 'ned')),
  natural('shoulderR', 1, 'Höger axel fram', -3, 4, 0.5, cm('fram', 'bak')),
  natural('shoulderL', 0, 'Vänster axel upp', -2, 4, 0.5, cm('upp', 'ned')),
  natural('shoulderL', 1, 'Vänster axel fram', -3, 4, 0.5, cm('fram', 'bak')),
  natural('elbowOut', 0, 'Höger armbåge ut', -20, 40, 1, out),
  natural('elbowOut', 1, 'Vänster armbåge ut', -20, 40, 1, out),
  // (Jakob 2026-11-23: "det är hennes rörelser med kortet som ska gå snabbare"; lay.ts Steer.cardTempo: the one speed, the whole deal's tempo having gone 2026-11-26.)
  {name: 'Kortets fart', group: 'Fart', min: () => 100, max: () => R() ? Math.round(Math.min(ENDS.cardTempo, cardTempoMost(R()!, state.steer)) * 100) : 100, step: 5, on: () => !!R(), value: () => Math.round(cardTempoOf(state.steer) * 100), set: v => { if (v === 100) delete state.steer.cardTempo; else state.steer.cardTempo = v / 100; }, text: v => v === 100 ? '100 %' : `${v} %, bara korthänderna`},
];
// (each slider under the heading of its group, `head`, which is shown while one of its sliders is)
let groupHead: HTMLElement | null = null;
const knobs = KNOBS.map(k => { const box = ctl('knobs'); if (k.group) { groupHead = document.createElement('h3'); groupHead.textContent = k.group; box.append(groupHead); } const head = groupHead;
  const label = document.createElement('label'), name = document.createElement('span'), out = document.createElement('output'), input = document.createElement('input'); label.className = 'knob'; name.textContent = k.name; input.type = 'range'; input.step = String(k.step); label.append(name, out, input); box.append(label);
  input.addEventListener('input', () => { k.set(Number(input.value)); out.textContent = k.text(Number(input.value)); state.touched = true; clearTimeout(held); held = setTimeout(() => showDeal(true), 140); });
  input.addEventListener('change', () => { clearTimeout(held); showDeal(true); });
  return {k, label, out, input, head}; });
// The landing (dealer3d/src/landing.ts, "Naturlig" only): her right hand's end pose at the laid card, one of LANDINGS, and
// his own shaping on top of it (how far onto the card, the hand rolled, the wrist bent, the fingers spread, the free fingers curled).
const landingOn = () => state.shown.kind === 'deal' && !!R() && wayOf() === 'naturlig' && !closedNow();
const landingButtons = LANDINGS.map(l => { const b = document.createElement('button'); b.dataset.landing = l.id; b.textContent = l.label; ctl('landings').append(b);
  b.addEventListener('click', () => { if (b.disabled || state.landing.id === l.id) return; state.landing = {...state.landing, id: l.id}; state.touched = true; showDeal(true); }); return b; });
// The turn (dealer3d/src/turn-in-hand.ts, "Naturlig" only): how her right hand turns the card face up, one of TURNS.
const turnButtons = TURNS.map(t => { const b = document.createElement('button'); b.dataset.turn = t.id; b.textContent = t.label; ctl('turns').append(b);
  b.addEventListener('click', () => { if (b.disabled || state.turn === t.id) return; state.turn = t.id; state.touched = true; showDeal(true); }); return b; });
const shapers = SHAPING_KNOBS.map(k => { const label = document.createElement('label'), name = document.createElement('span'), out = document.createElement('output'), input = document.createElement('input');
  label.className = 'knob'; name.textContent = k.label; input.type = 'range'; input.min = String(k.min); input.max = String(k.max); input.step = String(k.step); label.append(name, out, input); ctl('shaping').append(label);
  const said = (v: number) => v ? `${comma(Math.abs(v), k.step < 1 ? 1 : 0)}${k.unit === '°' ? '°' : ` ${k.unit}`} ${v > 0 ? k.plus : k.minus}` : '0';
  input.addEventListener('input', () => { const v = Number(input.value), l: Landing = {...state.landing}; if (v) l[k.key] = v; else delete l[k.key]; state.landing = l; out.textContent = said(v); state.touched = true; clearTimeout(held); held = setTimeout(() => showDeal(true), 140); });
  input.addEventListener('change', () => { clearTimeout(held); showDeal(true); });
  return {k, label, out, input, said}; });

/** Shows or hides a part of the page (also inline: embedded, the studio's own stylesheet gives the controls their display, app/globals.css). */
const display = (el: HTMLElement, yes: boolean) => { el.hidden = !yes; el.style.display = yes ? '' : 'none'; };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1), moment = (iso: string) => new Date(iso).toLocaleString('sv-SE', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
/** Everything on the page that says what is chosen and shown. */
function paint() {
  const deal = state.shown.kind === 'deal', read = state.entry === 'A2.1', saved = read ? undefined : standards.find(s => s.name === standardName(state.doll, state.place));
  for (const b of document.querySelectorAll<HTMLButtonElement>('#dolls button')) b.setAttribute('aria-pressed', String(b.dataset.doll === state.doll));
  for (const b of document.querySelectorAll<HTMLButtonElement>('#views button[data-pose]')) b.setAttribute('aria-pressed', String(!deal && b.dataset.pose === (state.shown as {pose?: string}).pose));
  for (const b of ctls('#entries button')) b.setAttribute('aria-pressed', String(b.dataset.entry === state.entry));
  // (embedded neither the entry's buttons nor the places' grid is there, the studio's own choosing both: the head names them)
  ctl('dealHead').textContent = embedded ? `Giv från ${state.entry} till ${placeWords(state.place)}` : `Giv från ${state.entry} till`;
  const buttons = new Map(ctls('#places button').map(b => [b.dataset.place!, b]));
  for (const id of gridIds()) { const b = buttons.get(id); if (!b) continue; const r = placeFrom(state.entry, id, state.doll, plan), open = !!r && !('none' in r), why = whyOf(r);
    b.disabled = !open; b.textContent = open ? '●' : '–'; b.title = why ? `${cap(placeWords(id))}: ${why}.` : placeWords(id);
    b.setAttribute('aria-pressed', String(deal && id === state.place)); b.classList.toggle('saved', !read && standards.some(s => s.name === standardName(state.doll, id))); }
  // (why no deal goes to a card is said only for the card asked for, `wanted`; the picture keeps the card it shows)
  const wantedWhy = state.wanted ? whyOf(placeFrom(state.entry, state.wanted, state.doll, plan)) : '';
  ctl('closed').textContent = read && !opens('A2.1', 'P4.C1') ? `Från A2.1: ${WHY.unposed}.` : wantedWhy ? `${cap(placeWords(state.wanted!))} ges inte från ${state.entry}: ${wantedWhy}. Bilden visar ${placeWords(state.place)}.` : '';
  display(ctl('sideNote'), deal && !read && closedNow());
  for (const b of document.querySelectorAll<HTMLButtonElement>('#views button[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === state.view));
  for (const b of document.querySelectorAll<HTMLButtonElement>('#speed button')) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === state.speed));
  // What cannot act is not shown: from A2.1 nothing here steers the deal; the turn and the landing only in "Naturlig" and for a card that is turned; each slider where it acts.
  const lon = landingOn(), steers = !(deal && read);
  display(ctl('turnBox'), lon); display(ctl('landingBox'), lon); display(ctl('builtNote'), !steers); display(ctl('knobs'), steers); display(ctl('steerActs'), steers);
  for (const {k, label, out, input} of knobs) { const on = deal && k.on() && !(k.turns && closedNow()); input.disabled = !on; display(label, on); input.min = String(k.min()); input.max = String(k.max());
    if (on) { const v = Math.max(k.min(), Math.min(k.max(), k.value())); input.value = String(v); out.textContent = k.text(k.value()); } else out.textContent = ''; }
  for (const head of new Set(knobs.map(x => x.head))) if (head) display(head, knobs.some(x => x.head === head && !x.label.hidden));
  const ld = lon ? now?.landed ?? null : null, landingNote = ctl('landingNote');
  for (const b of landingButtons) { b.disabled = !lon; b.setAttribute('aria-pressed', String(lon && b.dataset.landing === state.landing.id)); }
  for (const {k, out, input, said} of shapers) { const v = state.landing[k.key] ?? 0; input.disabled = !lon; input.value = String(v); out.textContent = lon ? said(v) : ''; }
  landingNote.className = ld && (ld.liftedMm || ld.shortMm) ? 'small warn' : 'small';
  landingNote.textContent = !lon ? '' : !ld ? 'Förvalet: långfingret på kortet, som hon alltid har lagt det.'
    : [`På kortet: ${ld.touching.length ? ld.touching.join(', ') : 'inget finger'}`, ld.liftedMm ? `handen lyft ${comma(ld.liftedMm)} mm så att ingen led går in i kortet` : '', ld.shortMm ? `armen räcker inte hela vägen, ${comma(ld.shortMm)} mm kortare` : ''].filter(Boolean).join(' · ') + '.';
  const td = lon ? now?.turned ?? null : null, turnNote = ctl('turnNote');
  for (const b of turnButtons) { b.disabled = !lon; b.setAttribute('aria-pressed', String(lon && b.dataset.turn === state.turn)); }
  turnNote.className = td && (!td.laid || td.shortMm) ? 'small warn' : 'small';
  turnNote.textContent = !lon ? '' : !td ? 'Förvalet: kortet vänds som given själv vänder det.' : !td.laid ? `Går inte här: ${td.why}.`
    : [`Höger hand tar kortet i ${td.edge === 'long' ? 'långsidan' : 'kortsidan'} när vänster har släppt det, vrider det ${Math.round(td.heldInAll!)}° i greppet och släpper det strax före det ligger`,
      `handleden böjd högst ${comma(td.wrist!.most)}° (förut ${comma(td.wristBefore!.most)}°)`, td.shortMm ? `armen räcker inte hela vägen, ${comma(td.shortMm)} mm kortare` : ''].filter(Boolean).join(' · ') + '.';
  const steered = !untouched(), recipe = R();
  ctl<HTMLButtonElement>('reset').disabled = !deal || !recipe || (!steered && !now?.saved); ctl<HTMLButtonElement>('save').disabled = !deal || read || !now || now.saved || !now.deal || !!fault || now.shortMm > 0;
  const prior = read ? undefined : before.find(s => s.name === standardName(state.doll, state.place)), mine = standards.filter(s => s.doll === state.doll).length, back = ctl<HTMLButtonElement>('back'), all = ctl<HTMLButtonElement>('allDefault');
  back.disabled = busy || !deal || (!prior && !saved); back.title = prior ? `Byter till standarden som var sparad här förut (${moment(prior.savedAt)}). Det du har nu blir det förra, så ett tryck till byter tillbaka.` : saved ? 'Före den sparade gällde förvalet här: lägger undan den sparade, så att förvalet gäller igen. Ett tryck till tar tillbaka den.' : 'Det finns inget förra att ta tillbaka för den här platsen.';
  all.disabled = busy || !mine; all.title = mine ? `Lägger undan ${DOLLS[state.doll]}s ${mine} sparade standarder, så att förvalet gäller på varje plats. Inget raderas: Ta tillbaka den förra tar tillbaka en plats i taget.` : `${DOLLS[state.doll]} har ingen sparad standard: förvalet gäller överallt.`;
  // The line about the saved standard: whether one holds for the card (an order films it) and when it was saved (its own lab.savedAt).
  const status = ctl('status'), when = now?.savedAt ? moment(now.savedAt) : saved ? moment(savedWhen.get(saved.name) ?? saved.savedAt) : '', there = embedded ? 'kortet i bilden' : 'platsen';
  status.className = fault || (deal && now?.shortMm) ? 'small warn' : 'small';
  // (embedded there is no grid of places: the card is chosen in the studio, or by a click on it in the picture)
  status.textContent = !deal ? (embedded ? 'Ställningen visas. Spela visar given till kortet igen.' : 'Ställningen visas. Välj en plats, eller tryck Spela, för given.')
    : fault ? `Går inte: ${fault}. Bilden visar den senaste som gick, och den här kan inte sparas.`
    : read ? 'Nypets egen rörelse, som en beställning från A2.1 filmar den.'
    : now?.shortMm ? `Armen når inte hela vägen (${comma(now.shortMm)} mm), så den här kan inte sparas.`
    : now?.saved ? `Din sparade standard (${when}): det är den en beställning filmar.`
    : saved && !steered ? `Reglagen visar förvalet; din sparade standard (${when}) gäller tills du sparar. Klicka på ${there} för att se den.`
    : saved ? `Ändrad, inte sparad. Din sparade standard (${when}) gäller tills du sparar.`
    : !steered ? 'Ingen sparad standard för kortet: dockan ger med förvalet.'
    : 'Ändrad, inte sparad. Ingen sparad standard för kortet: dockan ger med förvalet tills du sparar.';
  if (notice) { status.textContent += ` ${notice.text}`; if (notice.warn) status.className = 'small warn'; }
  // The line in the picture: what is shown, and what is not as it should be.
  const what = deal ? `${state.entry} → ${placeWords(state.place)}` : (state.shown as {pose: string}).pose, notes: string[] = [], warns: string[] = [];
  if (deal && now) notes.push(now.saved ? 'sparad standard' : now.way === 'byggd' ? 'nypets egen rörelse' : steered ? 'ändrad' : 'förvalet');
  if (deal && now?.recipe && DEALER_CARD.test(state.place)) notes.push(closedNow() ? 'stängt' : 'öppet');
  if (deal && now?.turned?.laid) notes.push('vändning: i handen');
  if (deal && now?.landed) notes.push(`landning: ${landingWords({id: now.landed.id, ...now.landed.shaping}).toLowerCase()}`);
  if (now?.said) notes.push(now.said); if (deal && now?.lent) notes.push(now.lent);
  if (deal && now?.bodyShare !== null && now?.bodyShare !== undefined && now.bodyShare < 0.995) notes.push(`kroppen tar ${Math.round(now.bodyShare * 100)} % av styrningen, längre når inte armen`);
  if (deal && now?.shortMm) warns.push(`armen räcker inte, ${comma(now.shortMm)} mm`); const laidAs = (now?.deal ?? now?.motion) as {elbowForced?: unknown[]; throughShoe?: number} | undefined; // a saved standard carries what its laying said
  if (deal && laidAs?.elbowForced?.length) warns.push('armbågen tvingad'); if (deal && laidAs?.throughShoe) warns.push('handen går genom skon');
  // A deal that could not be laid is said in the picture too, not only under Styr: the stage then still shows the last motion
  // that could (at first the pose to A2.3), and beside a film that reads as the doll doing something else (Jakob 2026-11-25).
  if (deal && fault) warns.unshift(`given går inte att lägga (${fault}): bilden visar ${now ? 'den senaste som gick' : 'ställningen, inte given'}`);
  const note = $('note'); note.replaceChildren(); const strong = document.createElement('b'); strong.textContent = `${DOLLS[state.doll]} · ${what}`; note.append(strong);
  if (notes.length) note.append(` · ${notes.join(' · ')}`); if (warns.length) { const w = document.createElement('span'); w.className = 'warn'; w.textContent = ` · ${warns.join(' · ')}`; note.append(w); }
  transport(); grip(true); paintFilm();
}
function transport() {
  const deal = state.shown.kind === 'deal', length = stage?.duration() ?? 0;
  $('play').textContent = state.playing ? 'Paus' : 'Spela'; $<HTMLInputElement>('scrub').disabled = !deal; $<HTMLInputElement>('scrub').value = String(deal && length ? Math.round(Math.min(state.t, length) / length * 1000) : 0);
  $('clock').textContent = deal ? `${comma(Math.min(state.t, length), 2)} s` : '';
}
/** Where on the card a fingertip lies, in words: at a corner, at an edge, or on the face. */
const whereOn = (t: Touch) => { const h = CARD.height / 2 - 0.012, w = CARD.width / 2 - 0.012, long = Math.abs(t.along) >= h, short = Math.abs(t.across) >= w; return long && short ? 'i hörnet' : long || short ? 'vid kanten' : 'mitt på'; };
let gripSaid = '';
/** The line over the picture that says which fingertips hold the card and where (with the marks: the joints on, or close on the card). */
function grip(force = false) {
  const list = stage && gripsShown() ? stage.touching() : [], hand = (h: 'R' | 'L', name: string) => { const own = list.filter(t => t.hand === h); return own.length ? `${name}: ${own.map(t => `${t.name} ${whereOn(t)}`).join(', ')}` : ''; };
  const said = !stage || !gripsShown() ? '' : list.length ? `Rör kortet · ${[hand('R', 'höger hand'), hand('L', 'vänster hand')].filter(Boolean).join(' · ')}` : 'Inga fingertoppar på kortet';
  if (said !== gripSaid || force) { gripSaid = said; $('grip').textContent = said; }
}

/** A word to the page around (embedded only, and only to the lab's own origin). */
const post = (said: Record<string, unknown>) => { if (embedded) parent.postMessage({docklabb: said}, location.origin); };
let hush = false;
/** The page around is told the card chosen here (`hush`: while it is the page around that chooses, told once at the end). */
const tell = () => { if (!hush) post({place: state.place}); };
/** Chooses a place as its button does: the deal to it from the chosen entry, untouched (his saved standard where there is one), played from the start. A place no deal goes to is `wanted`: the picture keeps its card, and says why. */
function choose(id: string) {
  if (!opens(state.entry, id)) { state.wanted = id; paint(); return; }
  state.place = id; state.wanted = null; state.touched = false; notice = null; state.steer = baseSteer(id); state.knobs = knobsOf(); state.landing = {id: LANDING_DEFAULT}; state.turn = TURN_DEFAULT; state.shown = {kind: 'deal'}; state.playing = false; tell();
  showDeal().then(() => { if (state.view === 'player') stage!.view('player'); if (state.shown.kind === 'deal' && !fault) { state.t = 0; state.playing = true; paint(); } });
}
/** Chooses an entry: the place stays where a deal goes there from the new one, else the first that has one. */
function chooseEntry(entry: Entry) {
  if (entry === state.entry && state.shown.kind === 'deal') return;
  state.entry = entry; state.wanted = null; if (!opens(entry, state.place)) state.place = firstOpen(entry) ?? state.place;
  state.touched = false; notice = null; state.steer = baseSteer(state.place); state.knobs = knobsOf(); state.landing = {id: LANDING_DEFAULT}; state.turn = TURN_DEFAULT; state.shown = {kind: 'deal'}; state.playing = false; tell(); showDeal();
}
// The places: a row for each card and a column for each seat and for the dealer; a place no deal goes to from the chosen
// entry is closed, and says why below (paint). Embedded there is no grid: the studio chooses the card, and so does a click in
// the picture; nor a choice of the entry, which is the studio's (its guide tree's anchor, told with the card).
const SEATS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'D'];
/** The grid's places in its order, those of the plan a deal is laid to. */
const gridIds = () => [1, 2, 3].flatMap(card => SEATS.map(seat => `${seat}.C${card}`)).filter(id => Object.hasOwn(plan.targets, id) && !!placeFrom('A2.3', id));
if (embedded) ctl('entries').remove();
{ const grid = ctl('places'), ids = gridIds(), cell = (text: string, row = false) => { const s = document.createElement('span'); s.textContent = text; if (row) s.className = 'row'; grid.append(s); };
  if (embedded) grid.remove();
  else { cell(''); for (const c of ['1', '2', '3', '4', '5', '6', '7', 'D']) cell(c);
    for (const card of [1, 2, 3]) { cell(`Kort ${card}`, true);
      for (const seat of SEATS) { const id = `${seat}.C${card}`; if (!ids.includes(id)) { cell(''); continue; }
        const b = document.createElement('button'); b.dataset.place = id; b.textContent = '●'; b.title = placeWords(id); b.setAttribute('aria-label', placeWords(id));
        b.addEventListener('click', () => choose(id)); grid.append(b); } } } }

for (const b of document.querySelectorAll<HTMLButtonElement>('#dolls button')) b.addEventListener('click', () => { if (b.dataset.doll !== state.doll) setDoll(b.dataset.doll!); });
for (const b of document.querySelectorAll<HTMLButtonElement>('#views button[data-pose]')) b.addEventListener('click', () => showPose(b.dataset.pose as Pose));
for (const b of ctls('#entries button')) b.addEventListener('click', () => chooseEntry(b.dataset.entry as Entry));
for (const b of document.querySelectorAll<HTMLButtonElement>('#views button[data-view]')) b.addEventListener('click', () => { state.view = b.dataset.view as ViewName; stage!.view(state.view); stage!.setGrips(gripsShown()); paint(); });
for (const b of document.querySelectorAll<HTMLButtonElement>('#speed button')) b.addEventListener('click', () => { state.speed = Number(b.dataset.speed); paint(); });
$<HTMLInputElement>('loop').addEventListener('change', e => { state.loop = (e.target as HTMLInputElement).checked; });
$<HTMLInputElement>('joints').addEventListener('change', e => { state.joints = (e.target as HTMLInputElement).checked; stage!.setJoints(state.joints); stage!.setGrips(gripsShown()); grip(true); });
const play = async () => { if (state.shown.kind !== 'deal') { await showDeal(); if (state.shown.kind !== 'deal') return; } if (!state.playing && state.t >= stage!.duration() - 1e-3) state.t = 0; state.playing = !state.playing; paint(); };
$('play').addEventListener('click', play);
addEventListener('keydown', e => { if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); play(); } });
$<HTMLInputElement>('scrub').addEventListener('input', e => { state.playing = false; state.t = Number((e.target as HTMLInputElement).value) / 1000 * stage!.duration(); stage!.setTime(state.t); transport(); grip(); });
// "Återställ": the sliders back to the default; a standard saved for the card still holds (an order films it) until he saves.
ctl('reset').addEventListener('click', () => { state.steer = baseSteer(state.place); state.knobs = knobsOf(); state.landing = {id: LANDING_DEFAULT}; state.turn = TURN_DEFAULT; state.touched = true; showDeal(true); });
ctl('save').addEventListener('click', async () => {
  if (!now?.deal || !now.rules || state.shown.kind !== 'deal' || state.entry !== 'A2.3' || fault || now.shortMm > 0) return; const name = standardName(state.doll, state.place), button = ctl<HTMLButtonElement>('save'); button.disabled = true;
  // Exactly the motion on the stage, the deal with its return, for this doll, with what it was laid from as the chain's rules have it (the steering, for "Naturlig" also the shoulders and elbows and how much of the body's steering she took, the landing and the turn where they are not the default, natural-lab.ts filmRules): docka-cykel.ts lays an order from `lab` through the same chain. The return goes in `lab.back`, a record.
  const r = now.rules, {cycle, ...shown} = now.motion, savedAt = new Date().toISOString();
  const landing = r.way === 'naturlig' && now.landed ? {landing: landingOf({id: now.landed.id, ...now.landed.shaping})} : {}, turn = r.way === 'naturlig' && now.turned?.laid ? {turn: now.turned.id} : {};
  const lab = {...now.deal.lab, steer: r.steer, from: 'A2.3', doll: state.doll, place: state.place, shortMm: now.shortMm, savedAt, ...(r.way === 'naturlig' ? {naturlig: {knobs: r.knobs, bodyShare: now.bodyShare}} : {}), ...landing, ...turn, ...(cycle ? {back: cycle} : {})};
  const motion = {...shown, doll: state.doll, lab} as Motion;
  try { const res = await fetch(`/dealer3d/standard/${name}.json`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(motion)}), answer = await res.json(); if (!res.ok) throw Error(answer.error ?? String(res.status));
    takeLists(answer); savedWhen.set(name, savedAt); now = {...now, motion: {...now.motion, doll: state.doll, lab}, saved: true, from: 'saved', savedAt};
    notice = before.some(s => s.name === name) ? {text: 'Den du hade sparad här förut ligger kvar: Ta tillbaka den förra byter tillbaka.'} : null; paint();
    // (embedded: the page around is told, so that what it says of the saved standard is read again)
    post({place: state.place, saved: name}); }
  catch (e) { paint(); const status = ctl('status'); status.className = 'small warn'; status.textContent = `Sparades inte: ${String((e as Error).message ?? e)}`; }
});
// His saved standards, forgiving (Jakob 2026-11-26: "en knapp för detta som är lite mer förlåtande om man råkat spara över
// originalet"): nothing is deleted (dealer3d/page/server.ts). "Ta tillbaka den förra": the place's standard and the one
// before it change places (the one before is what a save replaced, or what "Alla till förvalet" laid aside), so that a
// second press changes them back. "Alla till förvalet": every saved standard of the doll laid aside in a folder of its own,
// so that the default holds on every place, each of them its place's one before.
/** Asks the server for a change of the saved standards, takes the lists from its answer, and lays the place shown again as it now is. */
async function changeStandards(kind: 'aterstall' | 'tillbaka', ask: Record<string, string>, said: (answer: Record<string, unknown>) => string) {
  busy = true; notice = null; paint();
  try {
    const r = await fetch(`/dealer3d/standard/${kind}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(ask)}), answer = await r.json().catch(() => null);
    if (!r.ok || !answer) throw Error(answer?.error ?? (r.status === 404 || r.status === 405 ? 'servern behöver startas om för den här knappen' : String(r.status)));
    takeLists(answer); notice = {text: said(answer)};
    state.touched = false; state.steer = baseSteer(state.place); state.knobs = knobsOf(); state.landing = {id: LANDING_DEFAULT}; state.turn = TURN_DEFAULT;
    post({place: state.place, saved: standardName(state.doll, state.place)});
  } catch (e) { notice = {text: `Gick inte: ${String((e as Error).message ?? e)}.`, warn: true}; }
  busy = false; if (state.shown.kind === 'deal') await showDeal(true); else paint();
}
ctl('back').addEventListener('click', () => { const name = standardName(state.doll, state.place);
  changeStandards('tillbaka', {name}, () => standards.some(s => s.name === name) ? 'Det förra är tillbaka. Det du hade ligger nu som det förra: ett tryck till byter tillbaka.' : 'Förvalet gäller här igen. Den sparade ligger som den förra: ett tryck till tar tillbaka den.'); });
ctl('allDefault').addEventListener('click', () => {
  const n = standards.filter(s => s.doll === state.doll).length; if (!n) return;
  if (!confirm(`Lägga undan alla ${n} sparade standarder för ${DOLLS[state.doll]}, så att förvalet gäller på varje plats?\n\nInget raderas: Ta tillbaka den förra tar tillbaka en plats i taget.`)) return;
  changeStandards('aterstall', {doll: state.doll}, a => { const u = a.undanlagt as {when?: string; names?: string[]} | undefined; return `${u?.names?.length ?? n} sparade standarder är undanlagda (${u?.when ?? 'i dag'}); förvalet gäller nu. Ta tillbaka den förra tar tillbaka en plats.`; });
});

// The picture: a click (no drag: the pointer let go within 4 px and 300 ms) chooses the place nearest the point of the felt
// under it, within 6 cm, of those a deal goes to from the chosen entry, as its button does. While the page around has said
// `flytta` (its step for where the card lands is open), a drag that begins within 4 cm of the chosen place moves that place
// on the felt instead of turning the view: its outline follows the pointer at once, and the page around is told where it lies
// in the plan's own words (`moved`, about 20 times a second and once at the end; lay.ts planPoint); it writes its draft and
// sends the plan back, and the deal is laid again on that once the drag has ended.
const CLICK = {px: 4, ms: 300}, NEAR = 0.06, GRAB = 0.04;
let press: {x: number; y: number; at: number; pointer: number} | null = null, flytta = false;
let moving: {place: string; pointer: number; offset: Vec3; at: Vec3; told: number; moved: boolean} | null = null;
const flat = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const spotNow = (id: string): Vec3 | null => stage?.places().find(s => s.id === id)?.at ?? null;
function tellMoved() {
  const uv = moving && planPoint(moving.at, lens); if (!moving || !uv) return; moving.told = performance.now();
  post({moved: {place: moving.place, u: Math.min(1, Math.max(0, uv.u)), v: Math.min(1, Math.max(0, uv.v))}});
}
function endMove() {
  if (!moving) return; if (moving.moved) tellMoved(); const canvas = $('stage'); if (canvas.hasPointerCapture(moving.pointer)) canvas.releasePointerCapture(moving.pointer);
  moving = null; stage?.orbit(true); layAgain(250);
}
// (on #frame, and on the way down: the view's controls on the canvas hear a press after this, so they are off before it)
$('frame').addEventListener('pointerdown', e => {
  if ((e.target as Element).id !== 'stage' || e.button !== 0 || !stage) return;
  press = {x: e.clientX, y: e.clientY, at: performance.now(), pointer: e.pointerId};
  if (!flytta || moving || state.shown.kind !== 'deal') return;
  const p = stage.pick(e.clientX, e.clientY), at = spotNow(state.place); if (!p || !at || flat(p, at) > GRAB) return;
  stage.orbit(false); (e.target as Element).setPointerCapture(e.pointerId);
  moving = {place: state.place, pointer: e.pointerId, offset: [at[0] - p[0], 0, at[2] - p[2]], at, told: 0, moved: false};
}, true);
$('frame').addEventListener('pointermove', e => {
  const canvas = $('stage');
  if (!moving) { if (flytta && e.target === canvas && !e.buttons && stage && state.shown.kind === 'deal') { const p = stage.pick(e.clientX, e.clientY), at = spotNow(state.place); canvas.style.cursor = p && at && flat(p, at) <= GRAB ? 'move' : ''; } return; }
  if (e.pointerId !== moving.pointer || !stage) return;
  if (!moving.moved && press && Math.hypot(e.clientX - press.x, e.clientY - press.y) <= CLICK.px) return; // (a click on the place, not yet a drag)
  const p = stage.pick(e.clientX, e.clientY); if (!p) return;
  moving.at = [p[0] + moving.offset[0], 0, p[2] + moving.offset[2]]; moving.moved = true; stage.movePlace(moving.place, moving.at);
  if (performance.now() - moving.told >= 50) tellMoved();
}, true);
const letGo = (e: PointerEvent) => {
  const was = press; press = null;
  if (moving && e.pointerId === moving.pointer) endMove();
  if (e.type !== 'pointerup' || !was || e.pointerId !== was.pointer || !stage || Math.hypot(e.clientX - was.x, e.clientY - was.y) > CLICK.px || performance.now() - was.at > CLICK.ms) return;
  const p = stage.pick(e.clientX, e.clientY); if (!p) return;
  let best: string | null = null, least = NEAR; for (const s of stage.places()) { const d = flat(p, s.at); if (d <= least && opens(state.entry, s.id)) { least = d; best = s.id; } }
  if (best) choose(best);
};
$('frame').addEventListener('pointerup', letGo, true); $('frame').addEventListener('pointercancel', letGo, true);

// The plan the page around sends (its draft, as it is changed): the places' outlines follow at once, and the deal shown is
// laid again on it keeping the time, with the sliders as they are, once the plan has stood still a moment and never while a
// place is moved by hand. A plan like the one in use is not taken again. The chosen place stays where a deal still goes to
// it from the entry, else the first that has one is chosen; its side is the plan's.
let layLater: ReturnType<typeof setTimeout> | undefined;
function layAgain(ms = 120) { clearTimeout(layLater); layLater = setTimeout(() => { if (moving || !stage) return; if (state.shown.kind === 'deal') void showDeal(true); else paint(); }, ms); }
/** Whether `p` has a plan's shape, as far as the lab reads it: places, each with its u and v in the picture. */
const planShaped = (p: unknown): p is Plan => { const t = (p as {targets?: unknown} | null)?.targets; return !!t && typeof t === 'object' && Object.keys(t).length > 0
  && Object.values(t as Record<string, {geometry?: {native?: {u?: unknown; v?: unknown}}} | null>).every(x => Number.isFinite(x?.geometry?.native?.u) && Number.isFinite(x?.geometry?.native?.v)); };
function takePlan(next: unknown) {
  if (!planShaped(next)) { console.warn('Dockan: en kortplan utan platser togs inte emot.'); return; }
  const text = JSON.stringify(next); if (text === planText) return;
  plan = next; planText = text; planNo++; laid = null; builtLast = null;
  stage?.setPlan(plan, moving ? {id: moving.place, at: moving.at} : undefined);
  if (!opens(state.entry, state.place)) { const first = firstOpen(state.entry); if (first) { choose(first); return; } }
  const shut = closedNow(); state.steer = sided(state.steer, state.place); if (closedNow() && !shut) { state.landing = {id: LANDING_DEFAULT}; state.turn = TURN_DEFAULT; }
  stage?.setTarget(state.place); paint(); layAgain();
}

// Embedded the controls stand in the studio's own column: the root is attached into the element [data-docklabb-styr] of the
// page around (the same origin, so its document is reachable) as the lab starts and whenever the page around says `attach`
// (that element mounted anew), and .styr-ute leaves only the picture here (docka.html). Where there is no such element they
// stand in this page's own column. When this page goes, its controls go with it.
function attach() {
  let host: HTMLElement | null = null;
  if (embedded) try { host = parent.document.querySelector<HTMLElement>('[data-docklabb-styr]'); } catch { host = null; }
  if (host) host.replaceChildren(root); else if (root.parentElement !== aside) aside.append(root);
  document.documentElement.classList.toggle('styr-ute', !!host);
}
if (embedded) { attach(); addEventListener('pagehide', () => { if (root.ownerDocument !== document) root.remove(); }); }

// The film over the doll (embedded only; Jakob 2026-11-25: "så man kan jämföra videos som är skapade med tex dockan", the
// doll, the table and a film in one and the same view): the page around names the dealer's film of the card's deal
// ({film}, the end of this file), and the slider "Filmen" lays it over the picture, 0 % none (nothing is loaded) to 100 %
// the film alone. It lies exactly over the canvas and is seen only in "Filmens kamera" as that view puts the camera: turned,
// zoomed, moved or another view, the picture is no longer the film's, and the film is hidden until "Filmens kamera" is
// chosen again (lab-stage.ts atFilm). Only under a deal: a pose has no film of its own. The lab's clock drives it: the
// film's time is the lab's (from `start`, at its own `speed` and the chosen speed), set while scrubbed or paused, and while
// playing kept within about 0,05 s by nudging its rate, sought only when it is far off. Past the deal's end (`end`, where
// its return begins in the file) it holds its last frame, as the doll's deal ends there. The page on its own has no film
// and no slider.
type Film = {src: string; label: string; start: number; end: number; speed: number};
const video = $<HTMLVideoElement>('film'), filmKnob = $('filmKnob'), filmShare = $<HTMLInputElement>('filmShare');
let film: Film | null = null, share = 0, filmFault = false, filmSaid = '';
const finite = (v: unknown, or: number) => typeof v === 'number' && Number.isFinite(v) ? v : or;
/** The film the page around names (a path on this server, and the words for it), or null: none for the card. */
function takeFilm(said: unknown) {
  const f = said as Partial<Film> | null, ok = !!f && typeof f.src === 'string' && f.src.startsWith('/') && !f.src.startsWith('//') && typeof f.label === 'string';
  const next: Film | null = ok ? {src: f!.src!, label: f!.label!, start: Math.max(0, finite(f!.start, 0)), end: finite(f!.end, Infinity), speed: finite(f!.speed, 1) > 0 ? finite(f!.speed, 1) : 1} : null;
  if (JSON.stringify(next) === JSON.stringify(film)) return;
  film = next; filmFault = false; loadFilm(); paintFilm();
}
/** The film is loaded only while it is asked for (a film named and the slider above 0); else nothing is. */
function loadFilm() {
  const want = film && share > 0 ? film.src : null;
  if (want === video.getAttribute('src')) return;
  video.pause(); if (want) video.src = want; else { video.removeAttribute('src'); video.load(); }
}
/** Whether the film is seen now: named, the slider above 0, a deal shown, and the picture the film's camera's own. */
const filmSeen = () => !!film && share > 0 && !filmFault && state.shown.kind === 'deal' && !!stage?.atFilm();
/** Where in the file the film stands for the lab's time, and the last time it is held at (the deal's last frame). */
function filmAt() {
  const f = film!, length = Number.isFinite(video.duration) ? video.duration : Infinity, hold = Math.max(f.start, Math.min(f.end, length) - 0.01);
  return {at: Math.min(hold, f.start + Math.min(state.t, stage?.duration() ?? state.t) * f.speed), hold};
}
/** The slider and the line over the picture. */
function paintFilm() {
  filmKnob.hidden = !embedded; filmKnob.classList.toggle('off', !film); filmShare.disabled = !film;
  filmKnob.title = film ? 'Dealerns film av given över dockan: 0 % ingen, 100 % bara filmen. Syns bara i Filmens kamera.' : 'Ingen film till kortet på den här datorn: trädet har ingen, eller den finns inte här.';
  $('filmShown').textContent = `${Math.round(share * 100)} %`;
  const seen = filmSeen(), note = $('filmNote');
  const said = share <= 0 ? '' : !film ? 'Ingen film till det här kortet' : filmFault ? `Filmen kunde inte spelas · ${film.label}`
    : `Filmen · ${film.label} · ${Math.round(share * 100)} %${seen ? '' : state.shown.kind !== 'deal' ? ' · syns under en giv' : ' · syns bara i Filmens kamera'}`;
  if (said !== filmSaid) { filmSaid = said; note.textContent = said; note.hidden = !said; }
}
filmShare.addEventListener('input', () => { share = Number(filmShare.value) / 100; video.style.opacity = String(share); loadFilm(); paintFilm(); });
video.addEventListener('error', () => { if (video.getAttribute('src')) { filmFault = true; paintFilm(); } });
/** Every picture: the film shown or hidden, and its time kept to the lab's. */
function syncFilm() {
  const seen = filmSeen(); if (video.hidden === seen) { video.hidden = !seen; paintFilm(); }
  if (!seen) { if (!video.paused) video.pause(); return; }
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) return;
  const {at, hold} = filmAt(), rate = state.speed * film!.speed;
  if (!state.playing || at >= hold) { if (!video.paused) video.pause(); if (!video.seeking && Math.abs(video.currentTime - at) > 0.004) video.currentTime = at; return; }
  const drift = at - video.currentTime;
  if (video.paused || Math.abs(drift) > 0.25) { if (!video.seeking) video.currentTime = at; video.playbackRate = rate; if (video.paused) void video.play().catch(() => {}); return; }
  // (a small drift is taken up within a second or so by playing a little faster or slower, never by seeking every picture)
  const nudged = Math.abs(drift) > 0.03 ? rate * (1 + Math.max(-0.2, Math.min(0.2, drift * 2))) : rate;
  if (Math.abs(video.playbackRate - nudged) > 0.005) video.playbackRate = nudged;
}
paintFilm();

// The clock: the time runs while it plays (a breath on the last picture before a loop begins again), and the stage is drawn only when something has changed.
let last = performance.now();
function tick(ms: number) {
  const dt = Math.min(0.1, (ms - last) / 1000); last = ms;
  if (stage) { size();
    if (state.playing) { const length = stage.duration(); state.t += dt * state.speed;
      if (state.t >= length + (state.loop ? 0.5 : 0)) { if (state.loop) state.t = 0; else { state.t = length; state.playing = false; paint(); } }
      stage.setTime(Math.min(state.t, length)); transport(); grip(); }
    if (stage.needsDraw()) stage.draw();
    if (embedded) syncFilm(); }
  requestAnimationFrame(tick);
}
try { await setDoll(state.doll); } catch (e) { $('note').textContent = `Dockan kunde inte starta: ${String((e as Error).message ?? e)}`; throw e; }
requestAnimationFrame(tick);
// (?spela=1: Bordet's "Spela kortbanan" opened the lab, which then plays the deal from the start)
if (asked.get('spela') === '1') void play();
(window as unknown as {docklabb: unknown}).docklabb = {ready: true,
  /** Where a place of the plan lies in the picture now, in this page's client pixels (a test clicks or drags there); null where it is not drawn. */
  at: (id: string) => { const p = spotNow(id), box = $('stage').getBoundingClientRect(), s = p && stage ? stage.seen(p) : null; return s ? {x: box.left + s.x, y: box.top + s.y} : null; },
  facts: () => ({doll: state.doll, way: wayOf(), entry: state.entry, shown: state.shown, place: state.place, steer: state.steer, side: sideOf(state.steer), planSide: planSide(state.place), knobs: state.knobs, playing: state.playing, t: state.t, duration: stage?.duration(), fault, saved: now?.saved ?? false, from: now?.from ?? null, savedAt: now?.savedAt ?? null, wanted: state.wanted, shortMm: now?.shortMm ?? 0,
  frames: now?.motion.frameCount, forced: (now?.deal as LaidDeal | null)?.elbowForced ?? null, throughShoe: now?.deal?.throughShoe ?? null, note: $('note').textContent, status: ctl('status').textContent, grip: $('grip').textContent, standards: standards.map(s => s.name), camera: stage?.camera(), bodyShare: now?.bodyShare ?? null,
  gripYaw: R() ? gripYawsOf(R()!, state.steer, wayOf()) : null, landing: state.landing, landed: now?.landed ?? null, landingNote: ctl('landingNote').textContent, turn: state.turn, turned: now?.turned ?? null, turnNote: ctl('turnNote').textContent,
  // Where the controls stand (this page's own column, or the studio's), whether a place can be moved by hand, and where the chosen place lies on the felt.
  controls: root.ownerDocument === document ? 'sidan' : 'studion', flytta, spot: spotNow(state.place),
  // The film over the doll: the one named, the slider, whether it is seen, what is loaded, its time against the lab's and where it should stand, and its box against the canvas's (client pixels).
  film: (() => { const box = (e: Element) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
    return {named: film, share, seen: !video.hidden, atFilm: stage?.atFilm() ?? false, loaded: video.getAttribute('src'), ready: video.readyState, paused: video.paused, rate: video.playbackRate, videoTime: video.currentTime, labTime: state.t, want: film && video.readyState ? filmAt().at : null, fault: filmFault, slider: {hidden: filmKnob.hidden, disabled: filmShare.disabled, title: filmKnob.title}, note: $('filmNote').hidden ? '' : $('filmNote').textContent, video: box(video), canvas: box($('stage'))}; })(),
  // What "Naturlig" did, over the whole deal: the hands' least gap, the wrists' most bend, the thumb's most gap from the card while the forefinger is on it (to the beat the card lies), and the fingertips on the card now.
  natural: now?.receipt ? (() => { const f = now.receipt!.frames, h = Math.ceil(((now.motion as {beats?: {h: number}[]}).beats?.[0]?.h) ?? f.length), held = f.filter(x => x.i <= h && x.touching.includes('R1'));
    return {apartMm: Math.min(...f.map(x => x.apartMm)), wristDeg: Math.max(...f.map(x => Math.max(...x.wristDeg))), thumbCardMm: held.length ? Math.max(...held.map(x => x.thumbCardMm[1])) : null, throughCard: f.reduce((s, x) => s + x.throughCard[1], 0)}; })() : null,
  touching: stage?.touching().map(t => `${t.hand}${t.finger} ${t.name} ${whereOn(t)}`) ?? [],
  // Where her right wrist and the card are, in the room and in the picture now (CSS pixels of the canvas): for checking a view against the film's own.
  seen: (() => { const m = now?.motion, i = m ? Math.min(m.frameCount - 1, Math.round(state.t * m.fps)) : 0, of = (world: number[]) => ({world, at: stage!.seen(world)}); return m && stage ? {wrist: of(m.frames[i].R.w), card: of(m.frames[i].card.c)} : null; })()})};
// Embedded in the studio (?inbaddad=1: Bordet's Inspelning, studio/components/bordet/). Every word is {docklabb: {...}}, and
// only the lab's own origin is told and heard.
// Told: {ready: true} once the lab has started; {place} whenever a card is chosen here (a click in the picture, or the page
// around's own choice, answered); {place, saved} after "Spara som standard"; {moved: {place, u, v}} while a place is moved
// by hand (above).
// Heard: {place, entry?, play?}: the entry the page around names (the guide tree's anchor, studio/lib/bordet.ts treeAnchor)
// is always taken, there being no other choice of it (sliders moved for a deal from the other entry go with it); a card
// chosen there is chosen here, except where sliders are moved and not saved: the deal then stays, and the answer names the
// card still shown; a card no deal goes to from the entry is `wanted` (the deal stays, and the page says why);
// `play`: its "Spela kortbanan", the deal played from the start. {plan}: the studio's
// draft (takePlan). {attach: true}: the controls attached again (attach). {flytta: boolean}: whether a place can be moved
// by hand (false until it is said). {film: {src, label, start, end, speed} | null}: the dealer's film of the card's deal (a
// path on this server; its words; the seconds of the deal in the file, `end` where its return begins; the speed it is
// watched at), or none (takeFilm).
if (embedded) {
  hear = e => {
    const said = (e.data as {docklabb?: Record<string, unknown>} | null)?.docklabb;
    if (e.source !== parent || e.origin !== location.origin || !said || typeof said !== 'object') return;
    if ('plan' in said) takePlan(said.plan);
    if ('film' in said) takeFilm(said.film);
    if (said.attach === true) attach();
    if (typeof said.flytta === 'boolean') { flytta = said.flytta; if (!flytta) { endMove(); $('stage').style.cursor = ''; } }
    if (typeof said.place === 'string') { const place = said.place, entry = said.entry === 'A2.1' || said.entry === 'A2.3' ? said.entry : null;
      hush = true;
      // (free: nothing moved by hand since the deal was laid, or it is saved; a pose shown instead of the deal changes neither)
      try { if (entry && entry !== state.entry) chooseEntry(entry); const free = !state.touched || untouched() || !!now?.saved;
        // (the answer names the card still shown, which the page around then sends back: `wanted` stays said until another card is chosen)
        if (free && Object.hasOwn(plan.targets, place)) { if (!opens(state.entry, place)) { state.wanted = place; paint(); } else if (place !== state.place) choose(place); } }
      finally { hush = false; }
      tell();
      if (said.play === true) { state.t = 0; if (!state.playing) void play(); else paint(); } }
  };
  attach(); post({ready: true});
  for (const e of early.splice(0)) hear(e);
}
