// Biblioteket (/bibliotek/, components/bibliotek/): allt som lagras i repot, per slag, ur kartan i repots rot (lager.ts,
// genom GET /api/lager, tools/lager-routes.ts), och raderingen (GET /api/lager/fraga, POST /api/lager/radera,
// tools/lager-remove.ts). Formerna här är kartans, skrivna för studion; storleken och hans ord har en källa var
// (proof-areas.ts sizeWord och hisWord), som Prov och kartan läser. Rena funktioner, ingen DOM.
import { labUrl } from "./lab.ts";
import { sizeWord, type Standing } from "./proof-areas.ts";

export type Anvandning = { ord: string; antal: number; kod: boolean; text: string };
export type Enhet = {
  id: string; plats: string; namn: string; bytes: number; files: number; andrad: string;
  filer: string[]; bild: string | null; anvands: Anvandning[]; gratis: boolean;
  dom?: Standing; utanProv?: boolean; git?: number;
  bank?: { use: string; what: string; judged: string | null };
};
export type Plats = {
  id: string; mapp: string; namn: string; slag: string; projekt: string; git: boolean; lasare: string[];
  gratis: boolean; hur?: string; betald?: boolean; visas: "media" | "aldrig"; radera: "ja" | "aldrig"; aldrig?: string; vantar?: boolean; okand?: boolean;
  bytes: number; files: number; enheter: Enhet[];
};
export type ProvInfo = { titel: string | null; omrade: string | null; dom: Standing; bra: number; inteBra: number; obesvarat: boolean; domare: string | null; extern: string | null; oenig: boolean };
export type Lager = {
  gjord: string;
  platser: Plats[];
  perSlag: { slag: string; ord: string; bytes: number; files: number; platser: number }[];
  totalt: { bytes: number; files: number; utanPekare: number; utanPekareBytes: number; vantar: number; vantarBytes: number; tillfalligtBytes: number };
  saknas: { register: string; sokvag: string }[];
  prov: Record<string, ProvInfo>;
};
export type Orsak = { text: string; skyddar: boolean };
export type Fraga = { id: string; namn: string; platsNamn: string; niva: "fri" | "skyddad" | "vagras" | "aldrig"; orsaker: Orsak[]; vagras: string | null; bytes: number; files: number; rattas: string[] };
export type Raderat = { id: string; raderat: string[]; bytes: number; rattat: string[]; vagrat: string | null };

async function answer<T>(response: Response | null, what: string): Promise<T> {
  const body = (await response?.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response?.ok || !body) throw new Error(body?.error ?? `${what} kunde inte läsas.`);
  return body;
}
export const getLager = (nytt = false) => fetch(labUrl(`/api/lager${nytt ? "?nytt=1" : ""}`)).catch(() => null).then((r) => answer<Lager>(r, "Biblioteket"));
export const getFraga = (id: string) => fetch(labUrl(`/api/lager/fraga?id=${encodeURIComponent(id)}`)).catch(() => null).then((r) => answer<Fraga>(r, "Frågan"));
/** En agents egen sida (?robot=1, src/preview-ui.ts) säger det, så att kvittot inte påstår att det var Jakob. */
const robot = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("robot") === "1";
export const radera = (id: string, andra: boolean) =>
  fetch(labUrl("/api/lager/radera"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, andra, robot: robot() }) }).catch(() => null).then((r) => answer<Raderat>(r, "Raderingen"));
/** Adressen till en fil; liten: en liten bild av den (en ruta ur en film), som rutorna visar. */
export const filUrl = (rel: string, liten = false) => labUrl(`/api/lager/fil?p=${encodeURIComponent(rel)}${liten ? "&liten=1" : ""}`);

/** Vad en fil är att visa som. */
export const sortAv = (rel: string | null): "bild" | "film" | "modell" | null =>
  !rel ? null : /\.(?:png|jpe?g|webp)$/i.test(rel) ? "bild" : /\.mp4$/i.test(rel) ? "film" : /\.glb$/i.test(rel) ? "modell" : null;

/** En storlek i ord: samma som Prov och kartan (proof-areas.ts sizeWord). */
export const storlek = sizeWord;
/** En dag i ord: "27 nov". */
export const dagOrd = (iso: string) => (iso ? new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : "");

/** Text att söka i: små bokstäver utan prickar och ringar, så att "atta" hittar "Åtta". */
export const sokbar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Spelets banks ord för hur en enhet används (media-audit), som han säger det. */
const BANK_ORD: Record<string, string> = { spelas: "Spelet spelar den", visas: "Studion visar den", referens: "En referens", "bara registrerad": "Ett register nämner den", "okänd": "Inget pekar på den" };
/** Var en enhet används, i hans ord: bankens användning först, sedan filerna som pekar på den. */
export function anvandsOrd(e: Enhet): string[] {
  const ut: string[] = [];
  if (e.bank && e.bank.use !== "okänd") ut.push(BANK_ORD[e.bank.use] ?? e.bank.use);
  for (const a of e.anvands) ut.push(a.text);
  return ut;
}
/** Hans ord om en sak (hisWord), som panelen säger det. */
export const DOM_ORD: Record<Standing, string> = { domt: "Du har sagt ditt", vantar: "Ett kort i Beslut väntar", utan: "Väntar på din dom" };
