// The workshops beside the studio that have servers of their own (tools/casino-routes.ts): dockans editor and
// kortpaketets visare. The studio shows each inside its own frame, with the menu still there, and starts its server the
// first time its page is opened; one that already answers is never started twice.
import { labUrl } from "./lab.ts";

export type WorkshopId = "editorn" | "kortpaketet";
export type WorkshopState = { id: WorkshopId; name: string; address: string; answers: boolean; ours: boolean; error: string | null };

/** How each workshop is named and said in the studio. */
export const WORKSHOP_WORDS: Record<WorkshopId, { title: string; starting: string; running: string }> = {
  editorn: { title: "Dockan", starting: "Startar dockans editor …", running: "Dockans editor" },
  kortpaketet: { title: "Kortpaketet", starting: "Startar kortpaketets visare …", running: "Kortpaketets visare" },
};

async function answer(response: Response | null, what: string): Promise<WorkshopState> {
  if (!response) throw new Error("Servern svarar inte.");
  const body = (await response.json().catch(() => null)) as (WorkshopState & { error?: string }) | null;
  if (!response.ok || !body) throw new Error(body?.error ?? `${what} kunde inte läsas.`);
  return body;
}

/** Whether the workshop's server answers, without starting it. */
export const workshopState = async (id: WorkshopId) => answer(await fetch(labUrl(`/api/verkstader/${id}`)).catch(() => null), WORKSHOP_WORDS[id].running);

/** Starts the workshop's server if it does not answer, and says how it went (the server waits up to 20 s for it). */
export const startWorkshop = async (id: WorkshopId) => answer(await fetch(labUrl(`/api/verkstader/${id}`), { method: "POST" }).catch(() => null), WORKSHOP_WORDS[id].running);

/** All the workshops at once, for the start page. */
export async function workshopStates(): Promise<WorkshopState[]> {
  const response = await fetch(labUrl("/api/verkstader")).catch(() => null);
  if (!response?.ok) return [];
  const body = (await response.json().catch(() => null)) as { workshops?: WorkshopState[] } | null;
  return body?.workshops ?? [];
}
