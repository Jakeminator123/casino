// The set-ups: the two tables, with their cameras, shoes and card places, that recording, orders, the editor and the game
// can be made under (Jakob 2026-11-27: the set-up cloned from a film of a real live table is the new standard, "men detta ska
// vara valbart också: exakt den vy/bord/sko/kort, ja allt som framkommit från videon"). One list, read by everything that
// chooses; it points at the measures in src/table-live.ts and src/table-lens.ts and copies none of them.
//
//   live   the live table (src/table-live.ts LIVE and LIVE_CAMERA): its own picture (1728 x 972), a rolled camera, a half
//          circle of felt, a clear shoe, card places in metres with their lie, the game's bet marks, Danilo and Frasse.
//   forra  the former standard (src/table-lens.ts): the bank's picture (1764 x 1174) through TABLE_LENS, the oval table, the
//          film's shoe, the card plan's places (placements/default.json, Jakob's) and the man and the woman.
//
// Two defaults, kept apart. The choice's (VALETS_FORVAL, live): what a chooser takes when nothing is said, and what new
// recording, orders and showing are made under. The data's (DATATS_FORVAL, forra): what a tree, a film, an order or a saved
// choice that names no set-up was made under, so nothing that exists is rewritten when the choice's default changes.
//
// The address word is `uppsattning` (?uppsattning=live|forra). The editor's older word 'standard' is read as forra and never
// written. What Jakob sees (Jakob 2026-11-27, "Namnbyte - ja"): the whole is "Livestandarden" or "Förra standarden" (namn),
// the menu's heading is "Standard" (NAMN) with the choices "Live" and "Förra" (kort); the table itself, the furniture, is still
// the live table where a text means it. The word "uppsättning" already means a dealer's set of anchors to him (tools/speech.ts,
// the skill ny-dealer). Every name Jakob sees comes from here.
//
// Pure: imports only src/table-lens.ts, src/table-live.ts and src/play-view.ts, no I/O, so the browser reads it too.
// World frame of each set-up: its own lens world (metres, x toward the picture's right, the dealer's left, y up with the
// felt at 0, z toward the player, the camera straight over the origin). Tests: tools/uppsattning.test.ts.
import {CARD, FILM, SHOE, TABLE_LENS, TABLE_TOP, filmEye, onPlane, planPixel, see, shoePose, type Pixel, type ShoePose, type Vec3} from './table-lens.ts';
import {LIVE, LIVE_CAMERA, liveCardHeading, liveOnFelt, liveSee, liveShoePose} from './table-live.ts';
import {PLAY_VIEW, type Framing} from './play-view.ts';

export type UppsattningId = 'live' | 'forra';
export const UPPSATTNINGAR: readonly UppsattningId[] = ['live', 'forra'];
/** The choice's default: live (Jakob 2026-11-27: "Jag skulle vilja helt övergå till det som är klonat totalt"). */
export const VALETS_FORVAL: UppsattningId = 'live';
/** The data's default: what a tree, film, order or saved choice without the field was made under. */
export const DATATS_FORVAL: UppsattningId = 'forra';
/** The word in an address (?uppsattning=live) and the field's name in data. */
export const ADRESSORD = 'uppsattning';
/** What the choice is called where Jakob sees it: the menu's heading. */
export const NAMN = 'Standard';

/** A word as a set-up: live, forra, and the editor's older 'standard' read as forra; anything else is null. */
export const lasUppsattning = (word: unknown): UppsattningId | null => word === 'live' ? 'live' : word === 'forra' || word === 'standard' ? 'forra' : null;

/** A card place in the set-up's lens world: where its middle lies on the felt, and its heading as table-lens.ts cardCorners takes it (radians, positive turns the card's far end toward the picture's right). */
export type Plats = {id: string; at: Vec3; heading: number};
/** A bet mark: the middle of seat 1–7's ring or button on the felt (seat 1 at the picture's left, the dealer's right). */
export type Insats = {seat: number; at: Vec3};
/** The card plan as far as a set-up reads it: each place's point in the bank's picture (normalised, from below). */
export type PlanLike = {targets?: Record<string, {geometry?: {native?: {u?: number; v?: number}}}>} | null;
/** What the former standard's places are made of that is data, not code: the card plan (placements/default.json, Jakob's) and the dealer edge's row in the bank's picture (data/scene-contract.json keyFigures.dealerEdgeImageRow). The live table's places are in the code and ignore it. */
export type Underlag = {plan?: PlanLike; edgeRow?: number};
/**
 * The bet ring of the former standard's felt: one rule under both its lenses (src/scene3d-geometry.ts ringOffset), from a seat's
 * first card's middle, half the card as it lies there, the ring's radius and 12 mm of felt toward the player. The live table has
 * its bet marks measured (LIVE.betMarks), with a ring of the same radius drawn round them.
 */
export const BET = {radius: 0.027, clear: 0.012};

export type Uppsattning = {
  id: UppsattningId;
  /** Its name where Jakob sees it (the whole: Livestandarden), its short word (the menu's choice: Live), and one line on what it is. */
  namn: string; kort: string; om: string;
  /** The picture its films and stills are made in. */
  bild: {width: number; height: number};
  /** The camera: focal length in the picture's pixels, pitch below the horizontal and roll (radians; roll as table-live.ts liveFrame turns the picture), height over the felt, and where the optical axis meets the picture. */
  kamera: {focalPx: number; pitch: number; roll: number; height: number; centre: Pixel};
  /** A point of the lens world in the picture's pixels; null behind the camera. */
  see(p: Vec3): Pixel | null;
  /** The point a pixel shows on the level plane `lift` metres over the felt; null at or above the horizon. */
  onFelt(px: Pixel, lift?: number): Vec3 | null;
  /** The middle of the dealer's edge of the felt. */
  kant(u?: Underlag): Vec3;
  kortplatser(u?: Underlag): Plats[];
  insatser(u?: Underlag): Insats[];
  /** The shoe's foot on the felt (table-lens.ts ShoePose). */
  sko: ShoePose;
  /** The table: the felt's half width at the dealer's edge and its depth toward the players, the padded rail's width, and its shape. */
  bord: {halfWidth: number; depth: number; rail: number; form: 'halvoval' | 'halvcirkel'};
  /** The game's own framing of it until Jakob saves one (src/play-view.ts Framing: zoom and turns from its own camera's place). */
  spelvy: {dator: Framing; mobil: Framing};
  /** The file his saved play view of it is kept in (tools/play-view-store.ts, /api/play-view?uppsattning=<id>): one per set-up, so that saving one never touches the other's. */
  spelvyFil: string;
  /** The chip tray sunk at the dealer's edge, or none (the live table has none: LIVE.tray). */
  bricka: boolean;
  /** The dolls that sit at it (dealer3d/src/doll.ts). */
  dockor: readonly string[];
};

// ---- live ------------------------------------------------------------------------------------------------------
const live: Uppsattning = {
  id: 'live', namn: 'Livestandarden', kort: 'Live', om:'Bordet, kameran, skon, korten och kortplatserna som de är mätta ur filmen av ett riktigt livebord.',
  bild: LIVE_CAMERA.film,
  kamera: {focalPx: LIVE_CAMERA.focalPx, pitch: LIVE_CAMERA.pitch, roll: LIVE_CAMERA.roll, height: LIVE_CAMERA.height, centre: LIVE_CAMERA.centre},
  see: p => liveSee(p), onFelt: (px, lift = 0) => liveOnFelt(px, lift),
  kant: () => LIVE.edge,
  kortplatser: () => Object.entries(LIVE.cards).map(([id, c]) => ({id, at: c.at, heading: liveCardHeading(c)})),
  insatser: () => LIVE.betMarks.map((at, i) => ({seat: i + 1, at})),
  sko: liveShoePose(LIVE.shoe),
  bord: {halfWidth: LIVE.felt.widthAtEdge / 2, depth: LIVE.felt.depth, rail: LIVE.rail.width, form: 'halvcirkel'},
  // The film's own frame on a computer (exactly the cloned view); on a phone held upright seats 2–6 whole across the picture's
  // width, rings and cards (they reach 421 px from the picture's middle, so the zoom is at most 2,05; 1,95 leaves a margin), with
  // the dealer's head and the cards in it. First values of the game's own, until Jakob saves his in Scen (data/play-view-live.json).
  spelvy: {dator: {zoom: 1, pitch: 0, yaw: 0}, mobil: {zoom: 1.95, pitch: -2, yaw: 0}}, spelvyFil: 'data/play-view-live.json',
  bricka: LIVE.tray !== null,
  dockor: [LIVE.dealer.styles.kameran.name, LIVE.dealer.styles.bordet.name],
};

// ---- the former standard ---------------------------------------------------------------------------------------
const EYE = filmEye(TABLE_LENS), CENTRE: Pixel = {x: (FILM.width - 1) / 2, y: (FILM.height - 1) / 2};
const cards = (u?: Underlag): Plats[] => Object.entries(u?.plan?.targets ?? {}).flatMap(([id, t]) => {
  const n = t.geometry?.native; if (typeof n?.u !== 'number' || typeof n?.v !== 'number') return [];
  const px = planPixel({u: n.u, v: n.v}), at = onPlane(EYE, px.x, px.y); return at ? [{id, at, heading: 0}] : []; // the plan's angle is not read: all are 0 (docs/SYSTEM.md)
});
const forra: Uppsattning = {
  id: 'forra', namn: 'Förra standarden', kort: 'Förra', om:'Bordet, kameran och skon som bankens filmer är tagna med, och kortplanens platser.',
  bild: FILM,
  kamera: {focalPx: TABLE_LENS.focalPx, pitch: TABLE_LENS.pitch, roll: 0, height: TABLE_LENS.height, centre: CENTRE},
  see: p => see(EYE, p), onFelt: (px, lift = 0) => onPlane(EYE, px.x, px.y, lift),
  kant: u => { if (typeof u?.edgeRow !== 'number') throw Error('Förra standardens kant läses ur scenkontraktets rad (data/scene-contract.json dealerEdgeImageRow).'); return onPlane(EYE, CENTRE.x, u.edgeRow)!; },
  kortplatser: cards,
  insatser: u => cards(u).filter(p => /^P[1-7]\.C1$/.test(p.id)).map(p => ({seat: Number(p.id[1]), at: [p.at[0], 0, p.at[2] + CARD.height / 2 + BET.radius + BET.clear] as Vec3})).sort((a, b) => a.seat - b.seat),
  sko: shoePose(TABLE_LENS, SHOE),
  bord: {halfWidth: TABLE_TOP.halfWidth, depth: TABLE_TOP.depth, rail: TABLE_TOP.rail, form: 'halvoval'},
  spelvy: {dator: PLAY_VIEW.dator, mobil: PLAY_VIEW.mobil}, spelvyFil: 'data/play-view.json',
  bricka: true,
  dockor: ['man', 'kvinna'],
};

export const UPPSATTNING: Readonly<Record<UppsattningId, Uppsattning>> = {live, forra};
/** The set-up of a word, or the choice's default when the word is none. */
export const uppsattningAv = (word: unknown): Uppsattning => UPPSATTNING[lasUppsattning(word) ?? VALETS_FORVAL];
/** The set-up a doll sits at: Danilo and Frasse at the live table, the man and the woman at the former; null for another name. */
export const dockansUppsattning = (docka: string | null | undefined): UppsattningId | null => UPPSATTNINGAR.find(id => UPPSATTNING[id].dockor.includes(docka ?? '')) ?? null;
/** What a chooser takes (the editor's ?uppsattning= and ?docka=, titta.ts's --uppsattning and --docka): the word, else the doll's table, else the choice's default. */
export const valdUppsattning = (word: unknown, docka?: string | null): UppsattningId => lasUppsattning(word) ?? dockansUppsattning(docka) ?? VALETS_FORVAL;
/** The set-up data was made under: its field, else the data's default (a tree, a film or an order from before the choice). */
export const datatsUppsattning = (field: unknown): UppsattningId => lasUppsattning(field) ?? DATATS_FORVAL;
/**
 * Whether a film may be shown under a set-up: only under its own (docs/SYSTEM.md: a film is never shown under another set-up's
 * camera). The film says its set-up in the field uppsattning (a film part, src/scene3d-film.ts Part); without it, the former
 * standard's, as every film made before the choice.
 */
export const filmenPassar = (film: {uppsattning?: unknown} | null | undefined, under: UppsattningId): boolean => datatsUppsattning(film?.uppsattning) === under;
