// Schemat (Karta, ?vy=schema; components/schemat/): rörelseschemat ur ../../standarddocka/rorelsekatalog.json som en bild,
// med det som finns för varje docka. Formerna här är svaret från GET /api/schema (tools/schema-routes.ts), som läser
// katalogen, livefilmens indelning (../../live-bj/data/segment.json) och filerna på disken varje gång; här står också de rena
// reglerna båda sidor delar: vilket ankare ett id i en rörelse menar (A3P4C1 och A3PnC1 är A3PnCm), vilken rörelse ett steg
// från ett ankare till ett annat är, och orden för det Jakob ser. Inga filnamn eller verktygsnamn i orden. Ren kod, ingen DOM.
import { labUrl } from "./lab.ts";

// ── Katalogens former ───────────────────────────────────────────────────────
export type Status = "finns" | "delvis" | "saknas" | "förslag";
export type KatalogAnkare = { id: string; namn: string; var?: string; status: Status; anteckning?: string; lagen?: { hoger?: string; vanster?: string } };
export type KatalogLage = { id: string; hand: string; namn: string; var: string; i_ankare: string[]; status: Status; anteckning?: string };
export type KatalogStadium = { id: string; hem: string; namn: string; nar: string };
export type KatalogRorelse = {
  id: string; stadium: string; namn: string; fran: string; till: string; over?: string; hander: string; status: Status;
  anteckning?: string; filer?: string; segment: string | null;
};
export type KatalogBrygga = { id: string; namn: string; vad: string; regel: string; segment: string | null };
export type KatalogHarmasInte = { id: string; namn: string; vad: string; segment: string | null };
export type Katalog = {
  om: string; begrepp: Record<string, string>; lagen: KatalogLage[]; ankare: KatalogAnkare[]; stadier: KatalogStadium[];
  rorelser: KatalogRorelse[]; bryggor: KatalogBrygga[]; harmas_inte: KatalogHarmasInte[];
};

// ── Svaret ──────────────────────────────────────────────────────────────────
/** Hur något finns för en docka: lyft ur livefilmen, ritad av koden, inspelat i dockans editor, eller en film (beställd, eller i ett träd). */
export type Slag = "lyft" | "ritad" | "klipp" | "film";
export const SLAGEN: readonly Slag[] = ["lyft", "ritad", "film", "klipp"];

/** Ett ankare i bilden: katalogens, eller ett som en rörelse nämner men som katalogen saknar (okand). */
export type Ankare = KatalogAnkare & { okand?: boolean };
/** En docka (eller den äldre dealern med filmer) att välja: vilket bord hon sitter vid och bordets kortplatser ur källan. */
export type Docka = {
  id: string; namn: string; slag: "docka" | "dealer"; uppsattning: string; bord: string;
  /** Bordets kortplatser (src/uppsattning.ts kortplatser): id som P4.C1 eller D.C1, platsens nummer ur id:t, kortet, och läget på filten i meter (x åt bildens höger, z mot spelaren). */
  platser: { id: string; plats: string; kort: number; x: number; z: number; vinkel: number }[];
};
/** Något som finns för en docka och en rörelse. fil: filen det är (för provet; visas aldrig), oppna: sidan i studion där det öppnas. */
export type Post = {
  docka: string; rorelse: string; slag: Slag; plats: string | null; text: string; fil: string | null; oppna: string | null; oppnaOrd: string | null;
  /** Ett lyft går från vilan till vilan i ett klipp: vägen till skon och hem ingår, utan att stanna i ankarena emellan. */
  helaVagen?: boolean;
};
/** Hur ofta något finns i livefilmen för en dealer, per hand eller som ett mått. */
export type FilmRad = { vad: string; antal: number | null; median: number | null; p10: number | null; p90: number | null };
export type FilmTal = { dealer: string; docka: string; namn: string; rader: FilmRad[]; perPlats: Record<string, number> | null; perKort: Record<string, number> | null };
export type Runda = { text: string; steg: { kod: string; ankare: string | null }[]; rorelser: (string | null)[] };
/** Det katalogen säger som inte stämmer med filerna på disken (för rapporten och en rad i sidan). */
export type Avvikelse = { slag: "finns-utan-filer" | "filer-men-saknas" | "fil-utanfor"; rorelse?: string; fil?: string; text: string };

export type Schema = {
  gjord: string;
  om: string;
  begrepp: Record<string, string>;
  ankare: Ankare[];
  lagen: KatalogLage[];
  stadier: (KatalogStadium & { rorelser: string[] })[];
  rorelser: (KatalogRorelse & { franAnkare: string | null; tillAnkare: string | null; kategori: string | null })[];
  bryggor: KatalogBrygga[];
  harmasInte: KatalogHarmasInte[];
  dockor: Docka[];
  poster: Post[];
  /** Livefilmens tal per segment (rörelsens, bryggans eller det som inte härmas fält segment). */
  filmen: Record<string, FilmTal[]>;
  /** Steg i den äldre dealerns träd som ingen rörelse i schemat är: från och till, hur många filmer. */
  utanforSchemat: { docka: string; fran: string; till: string; filmer: number; trad: string }[];
  runda: Runda | null;
  fel: string[];
  avvikelser: Avvikelse[];
};

// ── Ankarena som mönster ────────────────────────────────────────────────────
/** Små bokstäver i ett ankares id är platshållare: n en plats, m ett kort (A3PnCm, A3DCm). */
const PLATSHALLARE = /[a-z]/g;
const escape = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const monster = new Map<string, RegExp>();
/** Om id:t är ett fall av mönstret: A3P4C1 och A3PnC1 av A3PnCm, A3P4C1 av A3PnC1, men A3PnCm inte av A3PnC1. */
export function ar(id: string, pattern: string): boolean {
  if (id === pattern) return true;
  let re = monster.get(pattern);
  if (!re) {
    re = new RegExp(`^${[...pattern].map((c) => (/[a-z]/.test(c) ? "(?:\\d+|[a-z])" : escape(c))).join("")}$`);
    monster.set(pattern, re);
  }
  return re.test(id);
}
/** Hur allmänt ett mönster är: antalet platshållare (A1 0, A3PnC1 1, A3PnCm 2). */
export const allmant = (pattern: string) => (pattern.match(PLATSHALLARE) ?? []).length;
/** Ankaret ett id i en rörelse menar: samma id, annars det minst allmänna ankare id:t är ett fall av; null när inget. */
export function ankareFor(id: string, ankare: readonly { id: string }[]): string | null {
  if (ankare.some((a) => a.id === id)) return id;
  const hits = ankare.filter((a) => ar(id, a.id)).sort((a, b) => allmant(a.id) - allmant(b.id));
  return hits[0]?.id ?? null;
}
/**
 * Rörelsen ett steg från ett ankare till ett annat är (A2.3 → A3P4C1 är GIV-KORT-1): den vars fran och till stegets ankare är
 * fall av, den minst allmänna först, och vid lika katalogens ordning. kategori: bara rörelser med det segmentet.
 */
export function rorelseFor<R extends Pick<KatalogRorelse, "id" | "fran" | "till" | "segment">>(fran: string | null, till: string, rorelser: readonly R[], kategori?: string): R | null {
  const hits = rorelser
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => (fran === null || ar(fran, r.fran)) && ar(till, r.till) && (kategori === undefined || r.segment === kategori));
  hits.sort((a, b) => allmant(a.r.till) + allmant(a.r.fran) - (allmant(b.r.till) + allmant(b.r.fran)) || a.i - b.i);
  return hits[0]?.r ?? null;
}
/** Kortplatsen ett ankare med plats och kort är: A3P4C1 → P4.C1, A3DC2 → D.C2; null för ett annat. */
export function platsAv(kod: string): string | null {
  const p = /^A3P(\d+)C(\d+)$/.exec(kod);
  if (p) return `P${p[1]}.C${p[2]}`;
  const d = /^A3DC(\d+)$/.exec(kod);
  return d ? `D.C${d[1]}` : null;
}
/** Ankaret en kortplats är: P4.C1 → A3P4C1, D.C2 → A3DC2. */
export function kodAv(plats: string): string | null {
  const p = /^P(\d+)\.C(\d+)$/.exec(plats);
  if (p) return `A3P${p[1]}C${p[2]}`;
  const d = /^D\.C(\d+)$/.exec(plats);
  return d ? `A3DC${d[1]}` : null;
}
/** Platsens nummer och kortet ur en kortplats: P4.C1 → {plats: "4", kort: 1}, D.C2 → {plats: "D", kort: 2}. */
export function platsOchKort(id: string): { plats: string; kort: number } | null {
  const m = /^(P(\d+)|D)\.C(\d+)$/.exec(id);
  return m ? { plats: m[2] ?? "D", kort: Number(m[3]) } : null;
}
/** En runda som en väg ur katalogens ord (begrepp.schemat: "A1 - A2.3 - A3P4C1 - A2.3 - A1"): den längsta raden av ankare med streck. */
export function rundansVag(text: string | undefined): string[] {
  const hits = [...(text ?? "").matchAll(/A[0-9][A-Za-z0-9.]*(?:\s+-\s+A[0-9][A-Za-z0-9.]*)+/g)].map((m) => m[0].replace(/\.$/, ""));
  const best = hits.sort((a, b) => b.length - a.length)[0];
  return best ? best.split(/\s+-\s+/).map((s) => s.replace(/\.$/, "")) : [];
}

// ── Orden ───────────────────────────────────────────────────────────────────
export const STATUS_ORD: Record<Status, { namn: string; om: string }> = {
  finns: { namn: "Finns", om: "finns i koden och kan spelas" },
  delvis: { namn: "Delvis", om: "finns till en del" },
  saknas: { namn: "Saknas", om: "finns inte än" },
  förslag: { namn: "Förslag", om: "ett förslag som inte är prövat" },
};
export const SLAG_ORD: Record<Slag, { kort: string; namn: string }> = {
  lyft: { kort: "lyft", namn: "Lyft ur filmen" },
  ritad: { kort: "ritad", namn: "Ritad" },
  klipp: { kort: "klipp", namn: "Inspelat klipp" },
  film: { kort: "film", namn: "Film" },
};
/** En docka i hans ord: Mannen och Kvinnan, annars namnet med stor bokstav (Danilo, Frasse). */
export const dockNamn = (id: string): string => ({ man: "Mannen", kvinna: "Kvinnan" } as Record<string, string>)[id] ?? (id ? id[0].toUpperCase() + id.slice(1) : id);
/** En plats i hans ord: "plats 4", "dealerns plats". */
export const platsOrd = (plats: string) => (plats === "D" ? "dealerns plats" : `plats ${plats}`);
/** En kortplats i hans ord: "plats 4, kort 1", "dealerns kort 2". */
export function kortplatsOrd(id: string): string {
  const p = platsOchKort(id);
  if (!p) return id;
  return p.plats === "D" ? `dealerns kort ${p.kort}` : `plats ${p.plats}, kort ${p.kort}`;
}
/** Sekunder i hans ord: 0,87 s. */
export const sekunder = (s: number | null) => (s === null ? "–" : `${s.toLocaleString("sv-SE", { maximumFractionDigits: 2 })} s`);
/** "1 gång", "33 gånger". */
export const ganger = (n: number) => `${n} ${n === 1 ? "gång" : "gånger"}`;
/** Platserna i en kort rad: "1, 2, 4–7". */
export function platsLista(platser: readonly string[]): string {
  const nr = [...new Set(platser)].filter((p) => /^\d+$/.test(p)).map(Number).sort((a, b) => a - b);
  const delar: string[] = [];
  for (let i = 0; i < nr.length; i++) {
    let j = i;
    while (j + 1 < nr.length && nr[j + 1] === nr[j] + 1) j++;
    delar.push(j - i >= 2 ? `${nr[i]}–${nr[j]}` : nr.slice(i, j + 1).join(", "));
    i = j;
  }
  const d = platser.includes("D") ? ["dealerns"] : [];
  return [...delar, ...d].join(", ");
}

// ── Svaret läst ─────────────────────────────────────────────────────────────
/** Det som finns för en docka och en rörelse, och vilka slag det är (i SLAGENs ordning). */
export function finnsFor(schema: Pick<Schema, "poster">, docka: string, rorelse: string): { poster: Post[]; slag: Slag[] } {
  const poster = schema.poster.filter((p) => p.docka === docka && p.rorelse === rorelse);
  return { poster, slag: SLAGEN.filter((s) => poster.some((p) => p.slag === s)) };
}
/** Hur många av ett stadiums rörelser som finns och delvis finns, enligt katalogen. */
export function stadietsTal(schema: Pick<Schema, "rorelser">, ids: readonly string[]): { finns: number; delvis: number; alla: number } {
  const rs = schema.rorelser.filter((r) => ids.includes(r.id));
  return { finns: rs.filter((r) => r.status === "finns").length, delvis: rs.filter((r) => r.status === "delvis").length, alla: rs.length };
}

export const getSchema = async (): Promise<Schema> => {
  const r = await fetch(labUrl("/api/schema")).catch(() => null);
  const body = (await r?.json().catch(() => null)) as (Schema & { error?: string }) | null;
  if (!r?.ok || !body) throw new Error(body?.error ?? "Schemat kunde inte läsas.");
  return body;
};
