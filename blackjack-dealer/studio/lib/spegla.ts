// Spegla (/spegla/, components/spegla/): svaret från GET /api/spegla (tools/spegla-routes.ts) och de rena räkningarna sidan
// gör med det: vilken ruta i Youtubefilmen en ruta i vår vy svarar mot (tiden står i svaret, ur lyftets data), vilken tid en
// video ställs på för att visa en ruta, och var bordsbilden sitter i filmens bild. Filmens adress kommer med svaret; den
// står aldrig här. Bara i studion på Jakobs dator: kopian på nätet har ingen server och visar ett tomt läge.
import { labUrl } from "./lab.ts";

export type VarVy = { id: string; namn: string; url: string };
export type Giv = {
  id: string;
  docka: string;
  namn: string;
  fps: number;
  rutor: number;
  /** Filmens sekund för vår ruta k. */
  tider: number[];
  /** Den sista ruta som har en egen ruta i lyftet; därefter står filmen still. */
  lyftetTill: number;
  marken: { skon?: number; bytet?: number; ligger?: number };
  var: VarVy[];
};
export type Film = { url: string; bredd: number; hojd: number; fps: number; ruta: { x: number; y: number; bredd: number; hojd: number } };
export type Spegling = { film: Film | null; givar: Giv[] };

export async function getSpegling(): Promise<Spegling> {
  const response = await fetch(labUrl("/api/spegla"), { cache: "no-store" }).catch(() => null);
  const body = (await response?.json().catch(() => null)) as (Spegling & { error?: string }) | null;
  if (!response?.ok || !body || !Array.isArray(body.givar)) throw new Error(body?.error ?? "Speglingen kunde inte läsas.");
  return body;
}

export const clampRuta = (giv: Giv, k: number) => Math.max(0, Math.min(giv.rutor - 1, Math.round(k)));
/** Youtubefilmens egen ruta för vår ruta k. */
export const filmRuta = (giv: Giv, film: Film, k: number) => Math.round(giv.tider[clampRuta(giv, k)] * film.fps);
/** Filmens sekund för vår ruta k, som datan har den. */
export const filmSekund = (giv: Giv, k: number) => giv.tider[clampRuta(giv, k)];
/** Tiden en video ställs på för att visa sin ruta n: mitt i rutan, så att avrundningen aldrig ger grannen. */
export const mittI = (n: number, fps: number) => (n + 0.5) / fps;

/** Bordsbilden i filmens bild: videon görs större och flyttas så att bordsbildens ruta fyller rutan (procent av rutan). */
export function beskarning(film: Film): { width: string; height: string; left: string; top: string } {
  const { ruta } = film;
  return {
    width: `${(film.bredd / ruta.bredd) * 100}%`,
    height: `${(film.hojd / ruta.hojd) * 100}%`,
    left: `${(-ruta.x / ruta.bredd) * 100}%`,
    top: `${(-ruta.y / ruta.hojd) * 100}%`,
  };
}

/** Givet adressen pekar på: ?giv=danilo-p4, eller ?docka=danilo&plats=4 som i Dockan; annars den första. */
export function valdGiv(givar: readonly Giv[], params: URLSearchParams): Giv | null {
  const giv = params.get("giv"), docka = params.get("docka"), plats = params.get("plats");
  return givar.find((g) => g.id === giv) ?? givar.find((g) => docka && plats && g.id === `${docka}-p${plats}`) ?? givar.find((g) => docka && g.docka === docka) ?? givar[0] ?? null;
}

/** Svensk decimal med tre siffror: 137.983 → "137,983". */
export const sekunder = (t: number) => t.toFixed(3).replace(".", ",");
