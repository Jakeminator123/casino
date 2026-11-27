// The scene's talk with the lab server (Bordet's Scen and Efterarbete): presets of the scene (/api/scene-presets, tools/scene-preset-store.ts), the
// play view (/api/play-view, tools/play-view-store.ts: how the game frames the picture on a computer and a phone, one for every
// look) and the one write to Jakob's placement plan it can make, the cards' bend and gloss (/api/placements), only on his click. In the
// online copy nothing is written, and the presets are the three that ship with the studio when the copy has none. A preset
// is read in the form since 2026-11-26 (lib/scene-presets.ts presetInForm), whichever form the server or the copy answers.
import { readPlayView, type Framing, type PlayView } from "../../../src/play-view.ts";
import { TARGETS, validatePlan, type PlacementPlan } from "../../../src/placement-model.ts";
import { ADRESSORD, DATATS_FORVAL, type UppsattningId } from "../../../src/uppsattning.ts";
import { ApiError, SNAPSHOT_REFUSAL, asApiError } from "../../lib/api.ts";
import { labUrl } from "../../lib/lab.ts";
import { isSnapshot } from "../../lib/mode.ts";
import { SHIPPED, presetInForm, type ScenePreset } from "../../lib/scene-presets.ts";

export type Preset = ScenePreset & { shipped: boolean; revision: string | null };

const kindOf = (status: number) => (status === 409 ? "conflict" : status === 404 ? "missing" : status === 428 ? "precondition" : status === 403 || status === 413 || status === 415 ? "refused" : status >= 500 ? "server" : "invalid");

async function call<T>(path: string, what: string, init?: RequestInit): Promise<T> {
  if (isSnapshot && init?.method && init.method !== "GET") throw new ApiError(SNAPSHOT_REFUSAL, 403, "refused");
  let response: Response;
  try {
    response = await fetch(labUrl(path), { cache: "no-store", ...init });
  } catch {
    throw new ApiError(`${what}: servern svarar inte.`, 0, "network");
  }
  const text = await response.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!response.ok) throw new ApiError(String((data as { error?: unknown } | null)?.error ?? "") || `${what} gick inte (${response.status}).`, response.status, kindOf(response.status));
  return data as T;
}

const shipped = (): Preset[] => SHIPPED.map((p) => ({ ...p, shipped: true, revision: null }));

/** Every preset; in the online copy the shipped ones when the copy holds none. */
export async function listPresets(): Promise<{ presets: Preset[]; problems: string[]; fromCopy: boolean }> {
  try {
    const answer = await call<{ presets: Preset[]; problems: string[] }>("api/scene-presets", "Förvalen");
    if (!Array.isArray(answer?.presets) || !answer.presets.length) throw new Error("tomt");
    return { presets: answer.presets.map(presetInForm), problems: answer.problems ?? [], fromCopy: false };
  } catch (error) {
    if (isSnapshot) return { presets: shipped(), problems: [], fromCopy: true };
    throw asApiError(error, "Förvalen");
  }
}

/** Saves one of his own; revision: the one last read when the name exists (an overwrite), null for a new name. */
export async function savePreset(name: string, body: { label: string; about: string; state: ScenePreset["state"] }, revision: string | null): Promise<Preset> {
  const answer = await call<{ preset: Preset }>(`api/scene-presets/${encodeURIComponent(name)}`, "Förvalet", {
    method: "PUT",
    headers: { "content-type": "application/json", ...(revision ? { "if-match": revision } : {}) },
    body: JSON.stringify(body),
  });
  return presetInForm(answer.preset);
}

export async function deletePreset(name: string, revision: string): Promise<void> {
  await call(`api/scene-presets/${encodeURIComponent(name)}`, "Förvalet", { method: "DELETE", headers: { "if-match": revision } });
}

// ── The play view ──
/** The play view as read (src/play-view.ts readPlayView: what does not hold up is the game's own) and its revision; null while there is no file. */
export type StoredPlayView = PlayView & { revision: string | null };
const storedOf = (answer: unknown): StoredPlayView => {
  const revision = (answer as { view?: { revision?: unknown } } | null)?.view?.revision;
  return { ...readPlayView(answer), revision: typeof revision === "string" ? revision : null };
};

/** The play view's address for a set-up: each table and camera has its own (?uppsattning=live; the former standard without the word). */
const viewAddress = (setup: UppsattningId) => (isSnapshot || setup === DATATS_FORVAL ? "api/play-view" : `api/play-view?${ADRESSORD}=${setup}`);

/** GET /api/play-view for the chosen table and camera (the copy answers its frozen one). */
export async function getPlayView(setup: UppsattningId): Promise<StoredPlayView> {
  return storedOf(await call<unknown>(viewAddress(setup), "Spelvyn"));
}

/** Saves both framings of the chosen table and camera against the revision last read (none while there is no file). Only from his click; never in the copy. */
export async function putPlayView(framings: { dator: Framing; mobil: Framing }, revision: string | null, setup: UppsattningId): Promise<StoredPlayView> {
  return storedOf(
    await call<unknown>(viewAddress(setup), "Spelvyn", {
      method: "PUT",
      headers: { "content-type": "application/json", ...(revision ? { "if-match": revision } : {}) },
      body: JSON.stringify({ dator: framings.dator, mobil: framings.mobil }),
    }),
  );
}

// ── The cards' material in Jakob's placement plan ──
export type CardLook = { bend: number; gloss: number };
/** The cards' bend and gloss in the plan: the same on all, or the smallest and largest when they differ. */
export function cardLookOf(plan: PlacementPlan): { look: CardLook; even: boolean; range: { bend: [number, number]; gloss: [number, number] } } {
  const all = TARGETS.map((id) => plan.targets[id]?.material).filter(Boolean) as CardLook[];
  const span = (k: keyof CardLook): [number, number] => [Math.min(...all.map((m) => m[k])), Math.max(...all.map((m) => m[k]))];
  const bend = span("bend");
  const gloss = span("gloss");
  return { look: { bend: all[0]?.bend ?? 0.07, gloss: all[0]?.gloss ?? 0.35 }, even: bend[0] === bend[1] && gloss[0] === gloss[1], range: { bend, gloss } };
}
/** The plan with one bend and gloss on every card ("Materialet gäller alla 16 kort"); the given plan is left alone. */
export function withCardLook(plan: PlacementPlan, look: CardLook): PlacementPlan {
  const next = structuredClone(plan);
  for (const id of TARGETS) if (next.targets[id]) next.targets[id].material = { bend: look.bend, gloss: look.gloss };
  validatePlan(next);
  return next;
}
/** Writes the plan (PUT /api/placements against the revision read). Only from his click. */
export async function savePlan(plan: PlacementPlan, revision: string): Promise<{ plan: PlacementPlan; revision: string }> {
  if (isSnapshot) throw new ApiError(SNAPSHOT_REFUSAL, 403, "refused");
  validatePlan(plan);
  return call<{ plan: PlacementPlan; revision: string }>("api/placements", "Placeringsplanen", {
    method: "PUT",
    headers: { "content-type": "application/json", "if-match": revision },
    body: JSON.stringify(plan),
  });
}
