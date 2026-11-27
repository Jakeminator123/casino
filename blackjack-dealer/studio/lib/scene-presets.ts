// Presets of the 3D scene: a named look, the keys that differ from the scene's DEFAULTS (src/scene3d-view.ts), kept in
// data/scene-presets/<name>.json and served by the lab server (tools/scene-preset-store.ts, /api/scene-presets). Three
// ship with the lab and cannot be changed: basgrund (what the game shows today), levande (basgrund with the look Jakob
// remembers of the 3D lab, the camera leaning but not swaying) and rumsstudien (levande with the room study's table, not
// yet judged by him). The Scen view's baseline is basgrund: what differs from it is marked. A look saved in one of Jakob's
// numbered places (Profilval 1–10, 2026-11-13) is a preset of his own like any other, under the name profilval-<n> (slotOf),
// so that ?forval=profilval-1 plays it wherever a preset is read. A look also travels as an address,
// /scen/?forval=levande&dust=0.8. The lens (Standard or Bred lins) is the key lins like any other (Jakob 2026-11-25: Bred lins
// is a filter on the same standard), saved with every look; its older word geometri (src/card-plan.ts linsOfAlias) is still
// read, from a file, an answer of the server and an address.
// How the picture is framed is no part of a look unless he has given it one (Jakob 2026-11-25: the recording is one standard,
// the play view another, the look on top): a look that names no zoom, pitch or yaw is shown with the play view's Dator
// (src/play-view.ts, effective below), in Scen, in the Casino and in the game alike, and Scen's Visa (the key format) is never
// saved with it (savedState). Pure: no DOM, no network.
import { LINS_ALIAS_WORD, linsOfAlias } from "../../src/card-plan.ts";
import { FRAMING_KEYS, type Framing } from "../../src/play-view.ts";
import type { SceneState } from "../../src/scene3d-view.ts";
import { RETIRED_KEYS, SCENE_KEYS, checkValue, decodeValue, hasControl, isSceneKey, keySpec, sameValue, type SceneKey } from "./scene-keys.ts";

export type ScenePreset = { schemaVersion: 1; name: string; label: string; about: string; state: Partial<SceneState>; updatedAt: string };

export const PRESET_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const NAME_LIMIT = 40;
export const LABEL_LIMIT = 40;
export const ABOUT_LIMIT = 400;
/** Bytes of one preset file the server takes. */
export const PRESET_BYTES = 16384;
/** Presets of his own the server keeps at most. */
export const OWN_LIMIT = 100;
export const BASE = "basgrund";
/** The editable look used when Casino or Bordet is opened without an explicit preset. */
export const CASINO_PRESET = "casino";

// ── The older form ──
// Until 2026-11-26 a look carried its lens beside the state, as the word geometri ("kontrakt" Bred lins, "lins" Standard; only
// Casino's was ever written, by Använd i Casino). Bred lins goes into the state as lins, unless the state has a lins of its own;
// Standard is the scene's default and needs no key. A state that is no object is left for the check to refuse.
function aliasedState(state: unknown, geometri: unknown): unknown {
  const own = !!state && typeof state === "object" && !Array.isArray(state);
  return own && linsOfAlias(geometri) === "bred" && (state as Record<string, unknown>).lins === undefined ? { ...state, lins: "bred" } : state;
}
/**
 * A preset as the server answers it, in the form since 2026-11-26: the older word geometri read into the state (aliasedState)
 * and left out. A server started before then answers Casino's look as {state: {…}, geometri: "kontrakt"}.
 */
export function presetInForm<T extends { state: Partial<SceneState> }>(answered: T & { geometri?: unknown }): Omit<T, "geometri"> {
  const { geometri, ...preset } = answered;
  return { ...preset, state: aliasedState(preset.state, geometri) as Partial<SceneState> };
}

// What the game sets on the scene by itself (src/game-own.ts GAME_OWN): the room Las Vegas when the player has chosen none,
// its blur 5 (its entry in data/scene-rooms.json), the drawn cards and the shimmer when the room changes. The
// framing is the play view's, as in every look without one of its own, and the picture filling the stage is the game's
// way to show it, not the look's (Scen's Visa). Everything else is the scene's own.
const GAME: Partial<SceneState> = { room: "panorama", blur: 5, cards: true, roomShift: "shimmer" };
// What Jakob remembers of the 3D lab (proof 3d-kanslan), without the sway: the camera leans and stays where it is put
// (Jakob 2026-11-13, "Autoläget ska inte gunga heller"; the scene's own sway is off and its switch is under Kamera). The
// Scen view starts with it.
const ALIVE: Partial<SceneState> = { mode: "lean", focus: "follow", dust: 0.6, clock: true };
// The room study of 2026-11-07 (docs/SYSTEM.md "3D-scenen") with the lab trials of 2026-11-12.
const STUDY: Partial<SceneState> = { surface: "photo", base: "legs", shadowAbove: 0, lamp: 0.5 };
const SHIPPED_AT = "2026-11-12T20:00:00.000Z";

/** The three that ship with the lab, in the order of their chips. data/scene-presets/<name>.json holds the same (the test compares). */
export const SHIPPED: readonly ScenePreset[] = [
  {
    schemaVersion: 1,
    name: "basgrund",
    label: "Basgrund",
    about: "Det spelet visar i dag och som Jakob har kallat mycket bra: Las Vegas, hela bordet i spelvyns inramning, markerbrädet, kort på bordet och filmens eget kort i handen, skimmer vid rumsbyte. Resten är scenens grund. Spelet lägger dessutom Jakobs bricka och markerna; de styrs under Kort och marker.",
    state: { ...GAME },
    updatedAt: SHIPPED_AT,
  },
  {
    schemaVersion: 1,
    name: "levande",
    label: "Levande",
    about: "Basgrund med det Jakob minns av den första 3D-scenen: kameran lutar men gungar inte, skärpan följer kortet, damm i luften och klockan.",
    state: { ...GAME, ...ALIVE },
    updatedAt: SHIPPED_AT,
  },
  {
    schemaVersion: 1,
    name: "rumsstudien",
    label: "Rumsstudien",
    about: "Levande med rumsstudiens bord: fotomaterial, två ben, ingen filmskugga ovanför kanten och lampan över dealern till hälften. Inte bedömd av Jakob än.",
    state: { ...GAME, ...ALIVE, ...STUDY },
    updatedAt: SHIPPED_AT,
  },
];
export const SHIPPED_NAMES: readonly string[] = SHIPPED.map((p) => p.name);
export const isShipped = (name: string) => SHIPPED_NAMES.includes(name);

// ── Checking ──
/**
 * The state of a preset: every key known, every value in its range. A key that has been retired (RETIRED_KEYS: a look's own
 * scale and camera) is left out without an error, so that a look saved with one still reads and is written without it the
 * next time it is saved. rooms: the rooms the scene has, when known.
 */
export function validateState(value: unknown, rooms?: readonly string[]): { state: Partial<SceneState>; errors: string[] } {
  const errors: string[] = [];
  const state: Record<string, unknown> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return { state: {}, errors: ["state ska vara ett objekt"] };
  for (const [key, v] of Object.entries(value)) {
    if (RETIRED_KEYS.includes(key)) continue;
    const s = keySpec(key);
    if (!s) {
      errors.push(`okänd nyckel ${key.slice(0, 40)}`);
      continue;
    }
    const wrong = checkValue(s, v, rooms);
    if (wrong) errors.push(`${key} ${wrong}`);
    else state[key] = v;
  }
  return { state: state as Partial<SceneState>, errors };
}

/**
 * A preset as it is to be kept under `name`: what was sent (label, about, state; schemaVersion and name may come along and
 * must agree, updatedAt is the server's) checked and cleaned. A file or a request in the older form (geometri beside the state)
 * is read into the form since 2026-11-26 (aliasedState), so that the next save writes it without the word. Errors in Swedish,
 * for the answer.
 */
export function validatePreset(value: unknown, name: string, rooms?: readonly string[]): { preset: Omit<ScenePreset, "updatedAt"> | null; errors: string[] } {
  const errors: string[] = [];
  if (!PRESET_NAME.test(name) || name.length > NAME_LIMIT) errors.push(`namnet får bara ha a–z, 0–9 och bindestreck, högst ${NAME_LIMIT} tecken`);
  if (!value || typeof value !== "object" || Array.isArray(value)) return { preset: null, errors: [...errors, "förvalet ska vara ett objekt"] };
  const v = value as Record<string, unknown>;
  for (const key of Object.keys(v)) if (!["schemaVersion", "name", "label", "about", "state", "geometri", "updatedAt"].includes(key)) errors.push(`okänt fält ${key.slice(0, 40)}`);
  if (v.geometri !== undefined && !linsOfAlias(v.geometri)) errors.push("geometri ska vara lins eller kontrakt");
  if (v.schemaVersion !== undefined && v.schemaVersion !== 1) errors.push("schemaVersion ska vara 1");
  if (v.name !== undefined && v.name !== name) errors.push("namnet i förvalet och i adressen skiljer sig");
  const label = typeof v.label === "string" ? v.label.trim() : "";
  if (!label || label.length > LABEL_LIMIT) errors.push(`label ska vara 1–${LABEL_LIMIT} tecken`);
  const about = v.about === undefined ? "" : typeof v.about === "string" ? v.about.trim() : null;
  if (about === null || about.length > ABOUT_LIMIT) errors.push(`about ska vara text, högst ${ABOUT_LIMIT} tecken`);
  if (hasControl(label)) errors.push("label får inte ha styrtecken");
  const checked = validateState(aliasedState(v.state, v.geometri), rooms);
  errors.push(...checked.errors);
  return errors.length ? { preset: null, errors } : { preset: { schemaVersion: 1, name, label, about: about ?? "", state: checked.state }, errors };
}

/** A name for a file from what he called it: "Kvällsljus i skogen" → "kvallsljus-i-skogen". */
export function slugOf(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, NAME_LIMIT)
    .replace(/-+$/, "");
}

// ── Places ──
// Jakob 2026-11-13: "Profilval 1" … "Profilval 10", ten numbered places for a look. A place is no store of its own: place n
// is his preset profilval-<n> (what "Spara som…" makes of the name "Profilval 3" too), counted among his own (OWN_LIMIT)
// and read by name like any preset. Since 2026-11-21 Scen saves a look one way, "Spara som…", and shows a filled place as a
// chip among the others (components/scene-editor/PresetBar.tsx); these helpers name the places for the store's test.
export const SLOTS = 10;
export const slotName = (n: number) => `profilval-${n}`;
export const slotLabel = (n: number) => `Profilval ${n}`;
/** The place a preset is, 1–10, or null: profilval-3 is 3; profilval-03, profilval-11 and the rest are named presets. */
export function slotOf(name: string): number | null {
  const n = /^profilval-([1-9][0-9]?)$/.exec(name) ? Number(name.slice("profilval-".length)) : 0;
  return n >= 1 && n <= SLOTS ? n : null;
}
/** The ten places in order: each its preset, or null when empty. */
export function slotsOf<T extends { name: string }>(presets: readonly T[]): (T | null)[] {
  const slots: (T | null)[] = Array.from({ length: SLOTS }, () => null);
  for (const p of presets) {
    const n = slotOf(p.name);
    if (n && !slots[n - 1]) slots[n - 1] = p;
  }
  return slots;
}
// ── States ──
/**
 * The whole state a preset gives: the scene's defaults, the play view's Dator (framing: zoom, pitch and yaw, src/play-view.ts)
 * and the preset's keys over them, as the game lays them (src/game-look.ts lookState). A look that names no framing follows the
 * play view; one that names it keeps its own.
 */
export const effective = (defaults: SceneState, state: Partial<SceneState>, framing?: Framing): SceneState => ({ ...defaults, ...framing, ...state });

/** What Scen shows: the film as recorded (Inspelningen), or what the player sees on a computer (Dator) or a phone (Mobil). */
export type Visa = "desk" | "fill" | "mob";
/** The framing of the recording: the film's own frame, unturned. */
export const RECORDING: Framing = { zoom: 1, pitch: 0, yaw: 0 };
/** The framing of a state. */
export const framingOf = (state: Pick<SceneState, "zoom" | "pitch" | "yaw">): Framing => ({ zoom: state.zoom, pitch: state.pitch, yaw: state.yaw });
/** Whether a look has a framing of its own: it names zoom, pitch or yaw. */
export const hasOwnFraming = (state: Partial<SceneState>): boolean => FRAMING_KEYS.some((key) => state[key] !== undefined);

/**
 * What Scen shows of a look under Visa. `look` is its whole state (effective, with the play view's Dator): Dator shows it as it
 * is, Mobil with the play view's Mobil (the game on a phone shows Mobil whatever the look), Inspelningen in the film's own frame.
 * The format is Visa's own.
 */
export function shownState(look: SceneState, visa: Visa, mobil: Framing): SceneState {
  return { ...look, ...(visa === "mob" ? mobil : visa === "desk" ? RECORDING : {}), format: visa };
}

/**
 * What a save keeps of a look: the keys that differ from the scene's defaults, never format (Scen's Visa, not the look's), and
 * zoom, pitch and yaw only when the look has a framing of its own; then all three, so that it keeps them whatever the play view
 * becomes. Without, the look follows the play view.
 */
export function savedState(state: SceneState, defaults: SceneState, ownFraming: boolean): Partial<SceneState> {
  const kept: Record<string, unknown> = {};
  for (const { key } of SCENE_KEYS) {
    if (key === "format") continue;
    if ((FRAMING_KEYS as readonly string[]).includes(key) ? ownFraming : !sameValue(state[key], defaults[key])) kept[key] = state[key];
  }
  return kept as Partial<SceneState>;
}

/**
 * A replacement renderer starts with the visible look unless a new address still needs to be applied. `view`: what Scen's Visa
 * lays under a look it has not yet applied (Dator: the play view's framing and the picture filling the stage).
 */
export function initialSceneState({ asked, current, comparison, needApply, view = {} }: {
  asked: { forval: string; patch: Partial<SceneState> };
  current: SceneState | null;
  comparison: SceneState | null;
  needApply: boolean;
  view?: Partial<SceneState>;
}): Partial<SceneState> {
  if (!needApply) {
    if (comparison) return { ...comparison, roomShift: "cut" };
    if (current) return current;
  }
  const preset = SHIPPED.find((p) => p.name === asked.forval);
  // An address naming a custom preset starts on Basgrund until the lab has supplied that preset.
  return preset ? { ...view, ...preset.state, ...asked.patch } : { ...view, ...SHIPPED[0].state };
}

/** The keys whose values differ between two states, in the catalogue's order. */
export const differences = (a: SceneState, b: SceneState): SceneKey[] => SCENE_KEYS.filter((s) => !sameValue(a[s.key], b[s.key])).map((s) => s.key);
/** The keys in which two looks differ: format is Scen's Visa, never a look's, and does not count. */
export const lookDifferences = (a: SceneState, b: SceneState): SceneKey[] => differences(a, b).filter((key) => key !== "format");

/** What turns `from` into `to`: the keys of `to` that differ. */
export function patchOf(to: SceneState, from: SceneState): Partial<SceneState> {
  const patch: Record<string, unknown> = {};
  for (const key of differences(to, from)) patch[key] = to[key];
  return patch as Partial<SceneState>;
}

/**
 * The preset whose whole look is exactly this one, if any (the first in the list wins). framing: the play view's Dator, which a
 * look without a framing of its own is shown with. Format does not count.
 */
export function matchPreset(state: SceneState, defaults: SceneState, presets: readonly ScenePreset[], preferred?: string, framing?: Framing): ScenePreset | null {
  const matches = (p: ScenePreset) => lookDifferences(state, effective(defaults, p.state, framing)).length === 0;
  return presets.find((p) => p.name === preferred && matches(p)) ?? presets.find(matches) ?? null;
}

// ── Addresses ──
type Params = { get(name: string): string | null; forEach(fn: (value: string, key: string) => void): void };

/**
 * The look an address asks for: the preset (basgrund when none) and the keys over it. Words that are no key, or values that do
 * not fit, are left out and named. The lens's older word (geometri=kontrakt Bred lins, geometri=lins Standard; src/card-plan.ts
 * linsOfAlias) is read as the key lins where the address has none of its own, as the game reads it (src/game-look.ts readLook);
 * an unknown value of it is no word at all.
 */
export function readAddress(params: Params, rooms?: readonly string[]): { forval: string; patch: Partial<SceneState>; ignored: string[] } {
  const asked = params.get("forval") ?? "";
  const forval = PRESET_NAME.test(asked) && asked.length <= NAME_LIMIT ? asked : BASE;
  const patch: Record<string, unknown> = {};
  const ignored: string[] = [];
  params.forEach((value, key) => {
    if (key === "forval" || key === LINS_ALIAS_WORD || RETIRED_KEYS.includes(key)) return; // a retired key in an old link is no word at all
    const s = isSceneKey(key) ? keySpec(key) : null;
    const decoded = s ? decodeValue(s, value, rooms) : null;
    if (s && decoded !== null) patch[key] = decoded;
    else ignored.push(key);
  });
  const alias = patch.lins === undefined ? linsOfAlias(params.get(LINS_ALIAS_WORD)) : null;
  if (alias) patch.lins = alias;
  return { forval, patch: patch as Partial<SceneState>, ignored };
}

