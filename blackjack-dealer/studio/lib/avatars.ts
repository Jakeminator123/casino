// The avatars' guide (components/avatars): the ways to build a dealer doll as avatar-auto-pipeline/vagar.json has them
// (its parts, the alternatives for each, the finished ways and the rules for what goes together; VAGAR.md is its
// print-out), and what lies on disk for each person (GET /api/vagar, tools/casino-routes.ts). A map to read and click
// through: nothing here starts a run, paid or free. Data and pure functions, no DOM.
import { labUrl } from "./lab.ts";

export type Status = "finns" | "provat" | "tankt" | "gar_inte";
export type Cost = { krediter?: number | Record<string, number> | null; hos?: string; text?: string } | null;
export type Alternative = { id: string; namn: string; status: Status; kraver?: string[]; ger?: string[]; kostnad?: Cost; tid?: { text?: string } | null; provet?: { id?: string; sa?: string } | null; hinder?: string };
export type Part = { id: string; namn: string; fraga: string; alternativ: Alternative[] };
export type Step = { nr: number | string; mapp?: string; namn: string; gor: string; delar?: string[]; betalt?: { hos?: string; krediter?: number | null; text?: string } | null; ut?: string[]; tid_s?: number | null };
export type Way = {
  id: string; namn: string; status: Status; kan_koras: boolean; beskrivning: string;
  val: Record<string, string | null>; last?: string[]; far_bytas?: Record<string, string[]>; varfor_last?: string; anm?: string;
  kostnad?: Cost; tid?: { text?: string } | null; provet?: { id?: string; sa?: string } | null; steg: Step[];
};
export type Rule = { id: string; typ: string; villkor?: string; varfor?: string; i_dag?: string };
export type Vagar = { om: { vad: string; status: Record<string, string> }; skelettet: { regel: string }; scenen: { text: string }; delar: Part[]; vagar: Way[]; regler: Rule[] };
export type Person = { name: string; pictures: number; steps: Record<string, { files: number; names: string[] }> };
export type Model = { folder: string; name: string; bytes: number };
export type AvatarAnswer = { vagar: Vagar; people: Person[]; models: Model[] };

export async function getAvatars(): Promise<AvatarAnswer> {
  const response = await fetch(labUrl("/api/vagar")).catch(() => null);
  const body = (await response?.json().catch(() => null)) as (AvatarAnswer & { error?: string }) | null;
  if (!response?.ok || !body?.vagar) throw new Error(body?.error ?? "Vägarna kunde inte läsas.");
  return body;
}

export const STATUS_WORD: Record<Status, string> = { finns: "i bruk", provat: "prövat", tankt: "tänkt", gar_inte: "går inte" };
export const STATUS_TONE: Record<Status, "ok" | "variant" | "wait" | "bad"> = { finns: "ok", provat: "variant", tankt: "wait", gar_inte: "bad" };

/** The ways in the order the guide shows them: Version 1 first (the one that runs today), then the others in use, tried, thought of. */
export function waysInOrder(ways: readonly Way[]): Way[] {
  const rank = (w: Way) => (w.id === "version-1" ? 0 : { finns: 1, provat: 2, tankt: 3, gar_inte: 4 }[w.status] ?? 5);
  return [...ways].sort((a, b) => rank(a) - rank(b));
}

/** A token that names a file, a folder or a command: not shown in the studio. */
const FILE = /(?:[\w.-]+\/)+[\w.<>-]*|\b[\w<>-]+\.(?:py|ts|glb|json|md|blend|yaml|png|mp4|ps1|cmd)\b|--[\w-]+/;
/**
 * A text of vagar.json in plain words: a parenthesis that names a file goes, and so does a sentence that still names
 * one, unless that would leave nothing (then the names alone go).
 */
export function plainWords(text: string | undefined | null): string {
  if (!text) return "";
  const noParens = text.replace(/\s*\((?:[^()]|\([^()]*\))*\)/g, (m) => (FILE.test(m) ? "" : m));
  const sentences = noParens.split(/(?<=[.!?:])\s+(?=[A-ZÅÄÖ0-9"])/);
  const kept = sentences.filter((s) => !FILE.test(s));
  const out = kept.length ? kept.join(" ") : noParens.replace(new RegExp(FILE.source, "g"), "").replace(/\s{2,}/g, " ");
  return out.replace(/\s+([,.;])/g, "$1").trim();
}

/** What a step costs, in words: "gratis" where nothing is paid. */
export const costWord = (c: Step["betalt"] | Cost | undefined): string => (c && (c.text || c.hos) ? [c.hos, c.text].filter(Boolean).join(": ") : "gratis");

/** The person shown first: the one who has the most on disk. */
export const firstPerson = (people: readonly Person[]): Person | null =>
  [...people].sort((a, b) => Object.keys(b.steps).length - Object.keys(a.steps).length || b.pictures - a.pictures)[0] ?? null;

/** How a person's names read in the studio: "tomasz" → "Tomasz", "docka-standard" → "Docka standard". */
export const personName = (id: string) => id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, " ");

/** The models on disk in Swedish: what each finished file is, by its name. */
export function modelWord(m: Model): string {
  const base = m.name.replace(/\.glb$/, "");
  const known: Record<string, string> = {
    standardbord_live: "Livebordet, vår klon", dealerstol: "Dealerns stol", standarddocka_man: "Mannen, dockornas grund",
    standarddocka_danilo: "Danilo (mätt på livebordet)", standarddocka_frasse: "Frasse (mätt på livebordet)",
  };
  if (known[base]) return known[base];
  const who = /^standarddocka_([a-z]+)(?:_(.+))?$/.exec(base);
  return who ? `${personName(who[1])}${who[2] ? ` (${who[2].replace(/_/g, " ")})` : ""}` : base.replace(/_/g, " ");
}
