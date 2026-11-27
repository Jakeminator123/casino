// What the start page shows (components/start/StartView.tsx): the chain from a picture to a film, as the root
// PROJEKTET.md has it, with the workshop that does each step, and one tile per workshop with a line of what it is for.
// Data only. The menu (components/shell/Rail.tsx) has the same workshops in the same order.
import type { WorkshopId } from "./workshops.ts";

export type Tile = {
  name: string;
  href: string;
  icon: "users" | "doll" | "film" | "review" | "map" | "images" | "game" | "ruler" | "live" | "pack" | "lips" | "sound" | "decisions" | "library";
  /** What it is for, in one line. */
  line: string;
  /** Where in the chain it belongs ("Steg 2–3"). */
  steps?: string;
  /** A workshop with a server of its own, started when its page opens. */
  workshop?: WorkshopId;
  /** Not in the online copy (it needs this computer). */
  localOnly?: boolean;
};

type Where = { name: string; href: string; localOnly?: boolean };
export type ChainStep = { nr: number; name: string; line: string; where: Where[] };

const DOCKAN: Where = { name: "Dockan", href: "/dockan/", localOnly: true };
const FILM: Where = { name: "Filmverkstaden", href: "/bordet/" };
const LIVE: Where = { name: "Livebordet", href: "/matt/?del=livebordet", localOnly: true };

export const START_CHAIN: readonly ChainStep[] = [
  { nr: 1, name: "Personen", line: "Några bilder av en person, och personen som 3D-figur på vårt skelett.", where: [{ name: "Avatarer", href: "/avatarer/", localOnly: true }] },
  { nr: 2, name: "Rörelsen", line: "Dockan spelar en rörelse vid bordet: ritad, eller lyft ur en riktig dealer.", where: [DOCKAN, LIVE] },
  { nr: 3, name: "Inspelningen", line: "Dockan filmas genom spelets kamera, en gång per spelarplats.", where: [DOCKAN] },
  { nr: 4, name: "Bilderna", line: "Rutor ur dockans film görs om till personen: där klippet börjar och slutar.", where: [FILM, { name: "Material", href: "/material/" }] },
  { nr: 5, name: "Filmen", line: "En filmmodell gör om dockans film till personen. Det betalda steget.", where: [FILM] },
  { nr: 6, name: "Granskningen", line: "Du dömer filmen. Det du godkänner får en roll; resten raderas.", where: [{ name: "Granska", href: "/granska/" }] },
  { nr: 7, name: "Utskärningen", line: "Personen skärs ut ur filmen mot ren färg.", where: [FILM] },
  { nr: 8, name: "Spelet", line: "Filmen vid bordet i en miljö, med spelets kort ovanpå.", where: [{ name: "Casino", href: "/game/" }] },
];

export const START_TILES: readonly Tile[] = [
  { name: "Avatarer", href: "/avatarer/", icon: "users", steps: "Steg 1: personen", localOnly: true, line: "Vägarna från bilder av en person till en docka på vårt skelett, steg för steg, med vad varje steg kostar; och föremålen vid bordet i 3D." },
  { name: "Dockan", href: "/dockan/", icon: "doll", steps: "Steg 2 och 3: rörelsen och inspelningen", workshop: "editorn", localOnly: true, line: "Dockans editor: standarddockans rörelser spelas, justeras och filmas, vid vårt bord eller vid livebordet." },
  { name: "Filmverkstaden", href: "/bordet/", icon: "film", steps: "Steg 4, 5 och 7: bilderna, filmen och utskärningen", line: "Dockan vid bordet med din kortplan, beställningen av en ny film och kön, och filmen lagd i scenen med efterarbetet." },
  { name: "Granska", href: "/granska/", icon: "review", steps: "Steg 6: granskningen", line: "Filmerna och proven som väntar på din dom, en i taget och stort." },
  { name: "Karta", href: "/karta/", icon: "map", steps: "Filmerna per dealer", line: "Varje dealers träd: vilka steg som har film, vilken som spelas, och vad som saknas." },
  { name: "Material", href: "/material/", icon: "images", steps: "Bilderna per dealer", line: "Varje dealers bilder och filmer med sin roll, och vilka som gäller för nya beställningar." },
  { name: "Casino", href: "/game/", icon: "game", steps: "Steg 8: spelet", line: "Blackjack som i casinot, med filmerna du har godkänt." },
  { name: "Mått", href: "/matt/", icon: "ruler", steps: "Allt utgår från dem", localOnly: true, line: "Alla mått på ett ställe, ur koden: kamerorna, bordet, kortplatserna, dockorna och rörelserna, bredvid livebordet." },
  { name: "Livebordet", href: "/matt/?del=livebordet", icon: "live", steps: "Facit från verkligheten", localOnly: true, line: "Ett riktigt livebord och två riktiga dealrar, mätta på film: klonen är den nya standarden, bredvid den förra. Här visas bara talen, aldrig filmen." },
  { name: "Biblioteket", href: "/bibliotek/", icon: "library", steps: "Allt som lagras", localOnly: true, line: "Filmerna, figurerna, borden, proven och resten, per slag: hur mycket, var det används och vad som väntar på dig. Det du raderar här är borta på riktigt." },
];

export const START_SIDE: readonly Tile[] = [
  { name: "Kortpaketet", href: "/kortpaketet/", icon: "pack", workshop: "kortpaketet", localOnly: true, line: "Ett köpt paket med inspelade rörelser och dess visare. Ligger vid sidan: inte grunden för dockans rörelser." },
  { name: "Lipsync", href: "/lipsync/", icon: "lips", localOnly: true, line: "Hur munnen görs efter rösten, per dealer: grundbilderna, inställningarna och proven." },
  { name: "Ljud", href: "/sound.html", icon: "sound", localOnly: true, line: "Spelets ljud: marker, kort, rummet och musiken." },
];
