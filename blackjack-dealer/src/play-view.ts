// The play view (spelvyn): how the game frames the picture for the player, on a computer (Dator) and on a phone (Mobil).
// Jakob 2026-11-25: the recording's format is one standard (the film's frame and camera, src/table-lens.ts) and what the
// player sees is another, "lite mer utzoomat" and a little more from the front. It is saved once (data/play-view.json,
// written only by the server on his click in Scen: tools/play-view-store.ts) and holds for every look; a look carries a
// framing of its own only when he has switched that on for it.
//
// A framing is a turn and a zoom from the film camera's own place, so the film stays exact under it. The layers of a look,
// last wins: the scene's DEFAULTS, the play view's Dator, the look's own keys, the address's keys (lookState in
// src/game-look.ts, effective in studio/lib/scene-presets.ts). Mobil is always the play view's.
// Pure: no DOM, no network; tests in tools/play-view.test.ts.

/** zoom: 1 is the film frame filling the picture; pitch and yaw: degrees the view is turned up and to the left of the film's own. */
export type Framing = {zoom: number; pitch: number; yaw: number};
export type PlayView = {schemaVersion: 1; dator: Framing; mobil: Framing; updatedAt: string};

/** A stage narrower than this (its width over its height) is a phone held upright: the game shows Mobil. */
export const MOBILE_BELOW = 0.8;
/** The same limits as the scene keys zoom, pitch and yaw (KEYS in src/game-look.ts; tools/play-view.test.ts holds them together). */
export const FRAMING_LIMITS: Readonly<Record<keyof Framing, readonly [number, number]>> = {zoom: [0.45, 2.5], pitch: [-35, 25], yaw: [-60, 60]};
/**
 * The framings the game had before the file (GAME_OWN and FRAMING in src/game-page.ts until 2026-11-26): what the game shows
 * when the file cannot be read, and until it has been read (the film before the game is laid before anything is fetched).
 */
export const PLAY_VIEW: PlayView = {schemaVersion: 1, dator: {zoom: 0.84, pitch: -8, yaw: 0}, mobil: {zoom: 1.55, pitch: -4.4, yaw: 0}, updatedAt: ''};

const FIELDS = ['zoom', 'pitch', 'yaw'] as const;
const within = (key: keyof Framing, value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= FRAMING_LIMITS[key][0] - 1e-9 && value <= FRAMING_LIMITS[key][1] + 1e-9;
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** A framing as read: each number that is within its limits, else the fallback's. Never throws. */
export function readFraming(value: unknown, fallback: Framing): Framing {
  const v = isObject(value) ? value : {};
  return {zoom: within('zoom', v.zoom) ? v.zoom : fallback.zoom, pitch: within('pitch', v.pitch) ? v.pitch : fallback.pitch, yaw: within('yaw', v.yaw) ? v.yaw : fallback.yaw};
}
/**
 * The play view as a page reads it: the file's content, or the server's answer {view: …}; whatever does not hold up falls
 * back, number by number, on PLAY_VIEW. Never throws, so the game always has a framing.
 */
export function readPlayView(value: unknown): PlayView {
  const outer = isObject(value) ? value : {}, v = isObject(outer.view) ? outer.view : outer;
  return {schemaVersion: 1, dator: readFraming(v.dator, PLAY_VIEW.dator), mobil: readFraming(v.mobil, PLAY_VIEW.mobil), updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : ''};
}
/** The play view as it is to be saved: both framings whole and within the limits, nothing else in it. Errors in Swedish, for the answer. */
export function validatePlayView(value: unknown): {view: Omit<PlayView, 'updatedAt'> | null; errors: string[]} {
  const errors: string[] = [];
  if (!isObject(value)) return {view: null, errors: ['spelvyn ska vara ett objekt']};
  for (const key of Object.keys(value)) if (!['schemaVersion', 'dator', 'mobil', 'updatedAt'].includes(key)) errors.push(`okänt fält ${key.slice(0, 40)}`);
  if (value.schemaVersion !== undefined && value.schemaVersion !== 1) errors.push('schemaVersion ska vara 1');
  const framing = (name: 'dator' | 'mobil'): Framing | null => {
    const f = value[name];
    if (!isObject(f)) { errors.push(`${name} ska vara ett objekt med zoom, pitch och yaw`); return null; }
    for (const key of Object.keys(f)) if (!(FIELDS as readonly string[]).includes(key)) errors.push(`${name}: okänt fält ${key.slice(0, 40)}`);
    for (const key of FIELDS) if (!within(key, f[key])) errors.push(`${name}.${key} ska vara ett tal ${FRAMING_LIMITS[key][0]} till ${FRAMING_LIMITS[key][1]}`);
    return {zoom: f.zoom as number, pitch: f.pitch as number, yaw: f.yaw as number};
  };
  const dator = framing('dator'), mobil = framing('mobil');
  return errors.length || !dator || !mobil ? {view: null, errors} : {view: {schemaVersion: 1, dator, mobil}, errors};
}
/** The framing a stage of this shape (width over height) is shown with. */
export const framingFor = (view: PlayView, aspect: number): Framing => (aspect < MOBILE_BELOW ? view.mobil : view.dator);
/** Whether two framings are the same picture (numbers saved and read back differ in their last decimals). */
export const sameFraming = (a: Framing, b: Framing): boolean => FIELDS.every(key => Math.abs(a[key] - b[key]) < 1e-6);
/** The scene keys of a framing, and the keys that make a framing (what a look that follows the play view leaves out). */
export const FRAMING_KEYS: readonly (keyof Framing)[] = FIELDS;
