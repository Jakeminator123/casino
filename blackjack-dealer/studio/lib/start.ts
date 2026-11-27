// What the start page shows (components/start/StartView.tsx): the chain from a picture to a film, as the root PROJEKTET.md
// has it, with the workshops that do each step, and one tile per workshop. Names only: what each is for stands in the
// glossary (lib/words.ts), not on the page (blackjack-dealer/AGENTS.md, "Studion visar, den förklarar inte"). Data only. The
// menu (components/shell/Rail.tsx) has the same workshops in the same order.
import type { WorkshopId } from "./workshops.ts";

export type Tile = {
  name: string;
  href: string;
  icon: "users" | "doll" | "film" | "review" | "map" | "images" | "game" | "ruler" | "live" | "sound" | "decisions" | "library";
  /** A workshop with a server of its own, started when its page opens. */
  workshop?: WorkshopId;
  /** Not in the online copy (it needs this computer). */
  localOnly?: boolean;
};

type Where = { name: string; href: string; localOnly?: boolean };
export type ChainStep = { nr: number; name: string; where: Where[] };

const DOCKAN: Where = { name: "Dockan", href: "/dockan/", localOnly: true };
const FILM: Where = { name: "Filmverkstaden", href: "/bordet/" };
const LIVE: Where = { name: "Livebordet", href: "/matt/?del=livebordet", localOnly: true };

export const START_CHAIN: readonly ChainStep[] = [
  { nr: 1, name: "Personen", where: [{ name: "Avatarer", href: "/avatarer/", localOnly: true }] },
  { nr: 2, name: "Rörelsen", where: [DOCKAN, LIVE] },
  { nr: 3, name: "Inspelningen", where: [DOCKAN] },
  { nr: 4, name: "Bilderna", where: [FILM, { name: "Material", href: "/material/" }] },
  { nr: 5, name: "Filmen", where: [FILM] },
  { nr: 6, name: "Granskningen", where: [{ name: "Granska", href: "/granska/" }] },
  { nr: 7, name: "Utskärningen", where: [FILM] },
  { nr: 8, name: "Spelet", where: [{ name: "Casino", href: "/game/" }] },
];

export const START_TILES: readonly Tile[] = [
  { name: "Avatarer", href: "/avatarer/", icon: "users", localOnly: true },
  { name: "Dockan", href: "/dockan/", icon: "doll", workshop: "editorn", localOnly: true },
  { name: "Filmverkstaden", href: "/bordet/", icon: "film" },
  { name: "Granska", href: "/granska/", icon: "review" },
  { name: "Karta", href: "/karta/", icon: "map" },
  { name: "Material", href: "/material/", icon: "images" },
  { name: "Casino", href: "/game/", icon: "game" },
  { name: "Mått", href: "/matt/", icon: "ruler", localOnly: true },
  { name: "Livebordet", href: "/matt/?del=livebordet", icon: "live", localOnly: true },
  { name: "Biblioteket", href: "/bibliotek/", icon: "library", localOnly: true },
];

export const START_SIDE: readonly Tile[] = [
  { name: "Ljud", href: "/sound.html", icon: "sound", localOnly: true },
];
