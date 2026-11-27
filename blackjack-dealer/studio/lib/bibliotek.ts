// Biblioteket (/bibliotek/, components/bibliotek/): allt som lagras i repot, per slag, ur kartan i repots rot (lager.ts,
// genom GET /api/lager, tools/lager-routes.ts), och raderingen på hans klick (GET /api/lager/fraga, POST /api/lager/radera,
// tools/lager-remove.ts). Formerna här är kartans, skrivna för studion; orden för det han ser och rena funktioner, ingen DOM.
import { labUrl } from "./lab.ts";

export type Anvandning = { ord: string; antal: number; kod: boolean; text: string };
export type Enhet = {
  id: string; plats: string; namn: string; bytes: number; files: number; andrad: string;
  filer: string[]; bild: string | null; anvands: Anvandning[];
  bank?: { use: string; what: string; judged: string | null };
};
export type Plats = {
  id: string; mapp: string; namn: string; slag: string; projekt: string; git: boolean; lasare: string[];
  gratis: boolean; hur?: string; betald?: boolean; visas: "media" | "aldrig"; radera: "ja" | "aldrig"; aldrig?: string; vantar?: boolean; okand?: boolean;
  bytes: number; files: number; enheter: Enhet[];
};
export type ProvInfo = { titel: string | null; omrade: string | null; bra: number; inteBra: number; kort: boolean; obesvarat: boolean; domare: string | null; extern: string | null; oenig: boolean };
export type Lager = {
  gjord: string;
  platser: Plats[];
  perSlag: { slag: string; ord: string; rad: string; bytes: number; files: number; platser: number }[];
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
export const radera = (id: string, andra: boolean) =>
  fetch(labUrl("/api/lager/radera"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, andra }) }).catch(() => null).then((r) => answer<Raderat>(r, "Raderingen"));
/** Adressen till en fil att visa som miniatyr. */
export const filUrl = (rel: string) => labUrl(`/api/lager/fil?p=${encodeURIComponent(rel)}`);

/** Vad en fil är att visa som. */
export const sortAv = (rel: string | null): "bild" | "film" | "modell" | null =>
  !rel ? null : /\.(?:png|jpe?g|webp)$/i.test(rel) ? "bild" : /\.mp4$/i.test(rel) ? "film" : /\.glb$/i.test(rel) ? "modell" : null;

/** Bytes i ord: "412 MB", "1,3 GB", "84 kB". */
export function storlek(bytes: number): string {
  if (bytes <= 0) return "0 kB";
  if (bytes >= 1e9) return `${(bytes / 1e9).toLocaleString("sv-SE", { maximumFractionDigits: 2 })} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toLocaleString("sv-SE", { maximumFractionDigits: bytes < 1e7 ? 1 : 0 })} MB`;
  return `${Math.max(1, Math.ceil(bytes / 1e3))} kB`;
}
/** En dag i ord: "27 nov". */
export const dagOrd = (iso: string) => (iso ? new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : "");

/** Spelets banks ord för hur en enhet används (media-audit), som han säger det. */
const BANK_ORD: Record<string, string> = { spelas: "Spelet spelar den", visas: "Studion visar den", referens: "En referens", "bara registrerad": "Ett register nämner den", "okänd": "Inget pekar på den" };
/** Var en enhet används, i hans ord: bankens användning först, sedan filerna som pekar på den. */
export function anvandsOrd(e: Enhet): string[] {
  const ut: string[] = [];
  if (e.bank && e.bank.use !== "okänd") ut.push(BANK_ORD[e.bank.use] ?? e.bank.use);
  for (const a of e.anvands) ut.push(a.text);
  return ut;
}
/** En användning som en kort bricka: "3 prov", "1 beställning", "Dockans editor". */
export const kortOrd = (a: Anvandning) =>
  a.ord === "Proven" ? `${a.antal} prov` : a.ord === "Beställningarna" ? `${a.antal} ${a.antal === 1 ? "beställning" : "beställningar"}` : a.ord;
/** Inget pekar på den: ingen fil nämner den, och banken känner den inte. */
export const utanPekare = (e: Enhet) => !e.anvands.length && (!e.bank || e.bank.use === "okänd");

/** Det som syns på en enhets ruta: korta brickor. */
export function brickor(e: Enhet, p: Plats, prov?: ProvInfo): { text: string; tone: "brass" | "ok" | "wait" | "bad" | "neutral" }[] {
  const ut: { text: string; tone: "brass" | "ok" | "wait" | "bad" | "neutral" }[] = [];
  if (e.bank?.use === "spelas") ut.push({ text: "Spelas", tone: "ok" });
  if (p.vantar || (prov && !prov.bra && !prov.inteBra && !prov.kort)) ut.push({ text: "Väntar på din dom", tone: "brass" });
  if (prov?.obesvarat) ut.push({ text: "Kort i Beslut", tone: "brass" });
  if (prov && prov.bra) ut.push({ text: "Du har sagt Bra", tone: "ok" });
  else if (prov && prov.inteBra) ut.push({ text: "Du har sagt Inte bra", tone: "bad" });
  if (e.bank?.judged && /ACCEPTED|SECONDARY/.test(e.bank.judged)) ut.push({ text: "Du har godkänt den", tone: "ok" });
  if (!p.git && p.slag !== "tillfalligt" && utanPekare(e) && p.radera === "ja") ut.push({ text: "Inget pekar på den", tone: "wait" });
  return ut;
}

/** Läsarnas ord. */
export const LASARE: Record<string, string> = { spelet: "spelet", studion: "studion", dockan: "dockans editor", verktyg: "ett verktyg", ingen: "ingen" };
export const PROJEKT: Record<string, string> = { "blackjack-dealer": "Spelet och studion", "avatar-auto-pipeline": "Avatarerna", standarddocka: "Dockans editor", "live-bj": "Livebordet", kortspelspaket: "Kortpaketet", slask: "Slasken" };
