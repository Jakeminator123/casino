// Kartan över allt som lagras (Jakob 2026-11-27: "Alla olika mappars innehavande videos, glb-filer, bilder och mycket
// annat ... Vi ska ju inte bara ansamla massa skit, men vill inte ta bort bra saker"). Mapparna ligger kvar där de är;
// här står, för varje ställe i repot där något lagras: mappen, slaget, projektet, om Git har det, vilket register som
// pekar på det, vem som läser det, och om det går att göra om gratis. Studions sida Biblioteket och verktygen läser den
// härifrån (blackjack-dealer/tools/lager-routes.ts, och raderingen i tools/lager-remove.ts), som MATT.md läses ur matt.ts.
//   node lager.ts           översikten: storlek per ställe och slag, vad inget pekar på, och vad registren pekar på som saknas
//   node lager.ts --json    samma som data, på en rad
// Inget här skriver eller raderar. Storleken mäts ställe för ställe och enhet för enhet, en mapp i taget, aldrig hela trädet
// på en gång. Alla sökvägar räknas från repots rot (casino/): inga sökvägar till en viss dator.
// En ny mapp som .gitignore håller tillbaka som media eller producerat ska stå här (testet i
// blackjack-dealer/tools/lager.test.ts håller det), eller i UTANFOR med skälet.
import {existsSync, lstatSync, readFileSync, readdirSync, type Stats} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const CASINO = path.dirname(fileURLToPath(import.meta.url));

// ---- slagen ---------------------------------------------------------------------------------------------------
export const SLAG = {
  personer: {ord: 'Personers bilder', rad: 'Bilder av personerna som blir dealrar, och ditt foto som förlaga.'},
  figurer: {ord: '3D-figurer', rad: 'Dockorna och personernas figurer på vårt skelett, och körningarna som gör dem.'},
  foremal: {ord: 'Bord och föremål', rad: 'Borden, stolen, skon, lådan och 3D-scenens rum.'},
  rorelser: {ord: 'Rörelser som data', rad: 'Rörelserna som tal, ruta för ruta. Git har dem.'},
  dockfilmer: {ord: 'Dockfilmer', rad: 'Dockan filmad i 3D: editorns inspelningar och filmerna som följer med beställningarna.'},
  bestallt: {ord: 'Beställda filmer och bilder', rad: 'Filmerna i spelets bank, ankarna, beställningarna hos Runway och det som kom tillbaka.'},
  prov: {ord: 'Prov', rad: 'Proven i Granska.'},
  vantar: {ord: 'Väntar på din dom', rad: 'Original och arbetsmappar som väntar på din dom.'},
  matdata: {ord: 'Mätdata', rad: 'Mätningen av livebordet och kortspåren i filmerna.'},
  paket: {ord: 'Köpt paket', rad: 'Animationspaketet som är köpt, uppackat.'},
  tillfalligt: {ord: 'Tillfälligt', rad: 'Pågående arbete, kontrollbilder och papperskorgen.'},
  program: {ord: 'Program och byggen', rad: 'Studion byggd, verktygens modeller och register. Raderas inte här.'},
} as const;
export type Slag = keyof typeof SLAG;
export const SLAG_ORDNING = Object.keys(SLAG) as Slag[];

/** Vem som läser stället. */
export type Lasare = 'spelet' | 'studion' | 'dockan' | 'verktyg' | 'ingen';
export const LASARE_ORD: Record<Lasare, string> = {spelet: 'spelet', studion: 'studion', dockan: 'dockans editor', verktyg: 'ett verktyg', ingen: 'ingen'};

/** Hur ett ställe delas i enheter (det som raderas som en sak): varje post i mappen, varje post en nivå ner, ingen alls. */
export type Delning = 'barn' | 'barnbarn' | 'ingen';
/** Vad studion får visa: bilder, filmer, modeller, eller aldrig mer än storlek och antal. */
export type Visas = 'media' | 'aldrig';
/** Om studion erbjuder radering: som regel (frågan säger följden), eller aldrig (skälet står i `aldrig`). */
export type Radera = 'ja' | 'aldrig';

export type Plats = {
  id: string;
  /** Mappen, från repots rot. En `*` står för en mapp i ledet (slask/*\/granska). */
  mapp: string;
  /** Vad det är, med hans ord. */
  namn: string;
  slag: Slag;
  projekt: string;
  /** Git har det (rörelserna som data). Det som Git har raderas aldrig från studion. */
  git: boolean;
  /** Raden i .gitignore som håller tillbaka det; null när Git har det. */
  ignore: string | null;
  /** Registren som pekar på det, från repots rot (det som säger vad som finns och var). */
  register: string[];
  lasare: Lasare[];
  /** Går att göra om gratis, och hur (ett skript, en körning). */
  gratis: boolean;
  hur?: string;
  /** Det kostade pengar att göra (Runway, Meshy, ett köpt paket). */
  betald?: boolean;
  delning: Delning;
  /** Filer i samma mapp med samma namn före första punkten är en enhet (en figur med .glb, .blend och .json). */
  stam?: boolean;
  /** Poster i mappen som inte hör hit (de har ett eget ställe). */
  utom?: string[];
  visas: Visas;
  radera: Radera;
  /** Varför studion aldrig raderar här, i hans ord. */
  aldrig?: string;
  /** Spelets bank: enheterna och deras användning ur blackjack-dealer/tools/media-audit.ts, som den är. */
  banken?: boolean;
  /** Det som väntar på hans dom. */
  vantar?: boolean;
  /** En sida i studion som visar varje enhet av sig själv (Avatarer läser varje person och körning ur mappen). */
  listas?: string;
};

const BJ = 'blackjack-dealer', AP = 'avatar-auto-pipeline', SD = 'standarddocka', LB = 'live-bj', KP = 'kortspelspaket';
const BANK = `/${BJ}/**/assets/`;
const GIT = 'Git har den: kod och register raderas inte från studion.';

export const PLATSER: readonly Plats[] = [
  // ── blackjack-dealer: spelets bank och det runt den ──
  {id: 'filmer', mapp: `${BJ}/assets/motions`, namn: 'Filmerna i spelets bank', slag: 'bestallt', projekt: BJ, git: false, ignore: BANK, register: [`${BJ}/data/motions.jsonl`, `${BJ}/data/clip-jobs.json`], lasare: ['spelet', 'studion'], gratis: false, betald: true, delning: 'barn', visas: 'media', radera: 'ja', banken: true},
  {id: 'ankare', mapp: `${BJ}/assets/anchors`, namn: 'Ankarna: stillbilderna som filmerna börjar och slutar på', slag: 'bestallt', projekt: BJ, git: false, ignore: BANK, register: [`${BJ}/data/media-roles.json`, `${BJ}/data/clip-jobs.json`], lasare: ['studion', 'spelet'], gratis: false, betald: true, delning: 'barn', visas: 'media', radera: 'ja', banken: true},
  {id: 'bestallningar', mapp: `${BJ}/assets/orders`, namn: 'Beställningarna hos Runway och det som kom tillbaka', slag: 'bestallt', projekt: BJ, git: false, ignore: BANK, register: [`${BJ}/data/orders/`], lasare: ['studion', 'verktyg'], gratis: false, betald: true, delning: 'barn', visas: 'media', radera: 'ja', banken: true},
  {id: 'intro', mapp: `${BJ}/assets/films`, namn: 'Filmen före spelet', slag: 'bestallt', projekt: BJ, git: false, ignore: BANK, register: [], lasare: ['spelet'], gratis: false, betald: true, delning: 'barn', visas: 'media', radera: 'ja', banken: true},
  {id: 'prov', mapp: `${BJ}/assets/proofs`, namn: 'Proven i Granska', slag: 'prov', projekt: BJ, git: false, ignore: BANK, register: [`${BJ}/assets/proofs/*/proof.json`, `${BJ}/data/proof-notes.json`, `${BJ}/data/decisions.json`], lasare: ['studion'], gratis: false, delning: 'barn', visas: 'media', radera: 'ja', banken: true},
  {id: 'dockfilmer-bestallning', mapp: `${BJ}/assets/references`, namn: 'Dockans filmer som följer med beställningarna, med styrbilderna', slag: 'dockfilmer', projekt: BJ, git: false, ignore: BANK, register: [`${BJ}/data/rendered-references.json`], lasare: ['verktyg'], gratis: true, hur: 'dockan filmas igen i 3D; en styrbild görs om av en bildmodell och kostar', delning: 'barn', visas: 'media', radera: 'ja', banken: true},
  {id: 'kortspar', mapp: `${BJ}/assets/tracking`, namn: 'Kortspåren: var kortet är i varje ruta av en film', slag: 'matdata', projekt: BJ, git: false, ignore: BANK, register: [`${BJ}/data/clip-jobs.json`], lasare: ['spelet'], gratis: true, hur: 'spåras om ur filmen med ett verktyg', delning: 'barn', visas: 'aldrig', radera: 'ja', banken: true},
  {id: 'scenen', mapp: `${BJ}/assets/scene`, namn: '3D-scenens rum, bilder och bordsmaterial', slag: 'foremal', projekt: BJ, git: false, ignore: BANK, register: [`${BJ}/data/scene-rooms.json`, `${BJ}/data/scene-materials.json`], lasare: ['spelet', 'studion'], gratis: false, betald: true, delning: 'barn', visas: 'media', radera: 'ja', banken: true},
  {id: 'spelets-foremal', mapp: `${BJ}/assets/props`, namn: 'Skon och lådan på spelets bord', slag: 'foremal', projekt: BJ, git: false, ignore: BANK, register: [`${BJ}/data/props.json`], lasare: ['spelet'], gratis: true, hur: 'byggs om ur koden', delning: 'barn', visas: 'media', radera: 'ja', banken: true},
  {id: 'renderingar', mapp: `${BJ}/output`, namn: 'Renderingar ur spelets verktyg', slag: 'dockfilmer', projekt: BJ, git: false, ignore: `/${BJ}/**/output/`, register: [], lasare: ['verktyg'], gratis: true, hur: 'görs om av verktyget', delning: 'barn', visas: 'media', radera: 'ja', banken: true},
  {id: 'papperskorgen', mapp: `${BJ}/.runtime/papperskorg`, namn: 'Papperskorgen för den automatiska gallringen (töms efter 14 dygn)', slag: 'tillfalligt', projekt: BJ, git: false, ignore: `/${BJ}/**/.runtime/`, register: [], lasare: ['ingen'], gratis: false, delning: 'barn', visas: 'aldrig', radera: 'ja'},
  {id: 'verktygens-eget', mapp: `${BJ}/.runtime`, namn: 'Verktygens eget: registren, liggarna över betalda anrop och loggarna', slag: 'program', projekt: BJ, git: false, ignore: `/${BJ}/**/.runtime/`, register: [], lasare: ['verktyg', 'studion'], gratis: false, delning: 'ingen', utom: ['papperskorg'], visas: 'aldrig', radera: 'aldrig', aldrig: 'Liggarna över betalda anrop och registren raderas aldrig.'},
  {id: 'matmodeller', mapp: `${BJ}/tools/python/models`, namn: 'Mätverktygens modeller', slag: 'program', projekt: BJ, git: false, ignore: `/${BJ}/tools/python/models/`, register: [], lasare: ['verktyg'], gratis: true, hur: 'hämtas igen enligt verktygens beskrivning', delning: 'ingen', visas: 'aldrig', radera: 'aldrig', aldrig: 'Ett program som verktygen behöver.'},
  {id: 'studion', mapp: `${BJ}/studio/out`, namn: 'Studion, byggd', slag: 'program', projekt: BJ, git: false, ignore: `/${BJ}/studio/out/`, register: [], lasare: ['studion'], gratis: true, hur: 'byggs om', delning: 'ingen', visas: 'aldrig', radera: 'aldrig', aldrig: 'Det är studion själv.'},
  {id: 'ditt-foto', mapp: `${BJ}/private`, namn: 'Ditt foto som förlaga', slag: 'personer', projekt: BJ, git: false, ignore: 'private/', register: [], lasare: ['verktyg'], gratis: false, delning: 'ingen', visas: 'aldrig', radera: 'aldrig', aldrig: 'Ditt foto rörs bara av dig.'},
  {id: 'dockans-rorelser', mapp: `${BJ}/dealer3d/data`, namn: 'Dockans rörelser som tal: lyfta ur filmen och ritade', slag: 'rorelser', projekt: BJ, git: true, ignore: null, register: [`${SD}/rorelsekatalog.json`], lasare: ['dockan', 'studion'], gratis: false, delning: 'ingen', visas: 'aldrig', radera: 'aldrig', aldrig: GIT},
  // ── avatar-auto-pipeline: personerna, figurerna och föremålen ──
  {id: 'personer', listas: 'Avatarer visar den', mapp: `${AP}/input`, namn: 'Bilderna av personerna', slag: 'personer', projekt: AP, git: false, ignore: `/${AP}/input/`, register: [`${AP}/vagar.json`], lasare: ['studion', 'verktyg'], gratis: false, delning: 'barn', visas: 'aldrig', radera: 'ja'},
  {id: 'korningar', listas: 'Avatarer visar den', mapp: `${AP}/output`, namn: 'Körningarna: en persons figur steg för steg', slag: 'figurer', projekt: AP, git: false, ignore: `/${AP}/output/`, register: [`${AP}/vagar.json`], lasare: ['studion', 'verktyg'], gratis: false, betald: true, delning: 'barnbarn', visas: 'media', radera: 'ja'},
  {id: 'dockor', mapp: `${AP}/assets/docka`, namn: 'Dockorna och personernas figurer', slag: 'figurer', projekt: AP, git: false, ignore: `/${AP}/assets/docka/*.json`, register: [`${BJ}/dealer3d/src/doll.ts`, `${AP}/vagar.json`], lasare: ['dockan', 'studion'], gratis: false, delning: 'barn', stam: true, visas: 'media', radera: 'ja'},
  {id: 'bord', mapp: `${AP}/assets/bord`, namn: 'Borden, med kortens och filtens bilder', slag: 'foremal', projekt: AP, git: false, ignore: null, register: [`${BJ}/dealer3d/page/server.ts`, `${SD}/editor/server.ts`], lasare: ['dockan', 'studion'], gratis: true, hur: 'byggs om av bordets skript', delning: 'barn', stam: true, visas: 'media', radera: 'ja'},
  {id: 'stol', mapp: `${AP}/assets/stol`, namn: 'Dealerns stol', slag: 'foremal', projekt: AP, git: false, ignore: null, register: [`${BJ}/dealer3d/page/server.ts`], lasare: ['dockan', 'studion'], gratis: true, hur: 'byggs om av stolens skript', delning: 'barn', stam: true, visas: 'media', radera: 'ja'},
  {id: 'meshy', mapp: `${AP}/assets/meshy`, namn: 'Stolen som Meshy gjorde', slag: 'foremal', projekt: AP, git: false, ignore: null, register: [], lasare: ['ingen'], gratis: false, betald: true, delning: 'barn', stam: true, visas: 'media', radera: 'ja'},
  {id: 'kontrollbilder', mapp: `${AP}/qc`, namn: 'Kontrollbilderna från Blender-skripten', slag: 'tillfalligt', projekt: AP, git: false, ignore: `/${AP}/**/qc/`, register: [], lasare: ['verktyg'], gratis: true, hur: 'skripten gör dem igen vid nästa bygge', delning: 'barn', visas: 'media', radera: 'ja'},
  {id: 'aldre-rorelsekatalog', mapp: `${AP}/rorelser`, namn: 'En äldre rörelsekatalog, som ska föras in i rörelseschemat', slag: 'rorelser', projekt: AP, git: true, ignore: null, register: [], lasare: ['ingen'], gratis: false, delning: 'ingen', visas: 'aldrig', radera: 'aldrig', aldrig: GIT},
  // ── standarddocka: dockans editor ──
  {id: 'inspelningar', mapp: `${SD}/klipp`, namn: 'Dockans inspelningar i editorn', slag: 'dockfilmer', projekt: SD, git: false, ignore: `/${SD}/**/klipp/`, register: [`${SD}/rorelsekatalog.json`], lasare: ['dockan', 'studion'], gratis: true, hur: 'editorn filmar rörelsen igen', delning: 'barn', stam: true, visas: 'media', radera: 'ja'},
  {id: 'vyn', mapp: `${SD}/vy`, namn: 'Dockans senaste vy ur Blender (skrivs om varje gång)', slag: 'tillfalligt', projekt: SD, git: false, ignore: `/${SD}/**/vy/`, register: [], lasare: ['verktyg'], gratis: true, hur: 'görs om av vyskriptet', delning: 'barn', visas: 'media', radera: 'ja'},
  // ── live-bj: mätningen av livebordet. Film av riktiga dealrar: visas aldrig, bara storlek och antal. ──
  {id: 'livefilmen', mapp: `${LB}/video`, namn: 'Filmen från livebordet', slag: 'matdata', projekt: LB, git: false, ignore: `/${LB}/video/`, register: [], lasare: ['verktyg'], gratis: false, delning: 'ingen', visas: 'aldrig', radera: 'aldrig', aldrig: 'Film av riktiga dealrar: den mäts bara, och sköts i livebordets mätning.'},
  {id: 'liverutor', mapp: `${LB}/rutor`, namn: 'Rutorna ur livefilmen', slag: 'matdata', projekt: LB, git: false, ignore: `/${LB}/rutor/`, register: [], lasare: ['verktyg'], gratis: true, hur: 'skärs ur filmen igen', delning: 'ingen', visas: 'aldrig', radera: 'aldrig', aldrig: 'Bilder av riktiga dealrar: de sköts i livebordets mätning.'},
  {id: 'livematten', mapp: `${LB}/matt`, namn: 'Måtten per ruta ur livefilmen', slag: 'matdata', projekt: LB, git: false, ignore: `/${LB}/matt/`, register: [], lasare: ['verktyg'], gratis: true, hur: 'mäts om med verktyget', delning: 'ingen', visas: 'aldrig', radera: 'aldrig', aldrig: 'Sköts i livebordets mätning.'},
  {id: 'livedata', mapp: `${LB}/data`, namn: 'Livebordets mått: takt, hållning, blick, bord och kamera', slag: 'matdata', projekt: LB, git: true, ignore: null, register: [], lasare: ['spelet', 'dockan', 'studion'], gratis: false, delning: 'ingen', visas: 'aldrig', radera: 'aldrig', aldrig: GIT},
  // ── kortspelspaket ──
  {id: 'paketet', mapp: `${KP}/paket`, namn: 'Det köpta animationspaketet, uppackat', slag: 'paket', projekt: KP, git: false, ignore: `/${KP}/**/paket/`, register: [], lasare: ['verktyg'], gratis: false, betald: true, hur: 'packas upp igen ur det köpta paketet, om det ligger kvar i Hämtade filer', delning: 'barn', visas: 'aldrig', radera: 'ja'},
  // ── slasken ──
  {id: 'vantar', mapp: 'slask/*/granska', namn: 'Original och arbetsmappar som väntar på din dom', slag: 'vantar', projekt: 'slask', git: false, ignore: '/slask/*', register: [`${BJ}/assets/proofs/*/proof.json`], lasare: ['studion'], gratis: false, betald: true, delning: 'barn', visas: 'media', radera: 'ja', vantar: true},
  {id: 'arbete', mapp: 'slask/*', namn: 'Pågående arbete (raderas efter tre timmar orört)', slag: 'tillfalligt', projekt: 'slask', git: false, ignore: '/slask/*', register: [], lasare: ['verktyg'], gratis: true, hur: 'det är arbete på väg', delning: 'barn', utom: ['granska'], visas: 'media', radera: 'ja'},
];

/** Rader i .gitignore som håller tillbaka en mapp som inte är lagring, med skälet. */
export const UTANFOR: readonly {ignore: string; varfor: string}[] = [
  {ignore: `/${AP}/tools/`, varfor: 'Blender, portabelt: ett program.'},
  {ignore: `/${BJ}/studio/.next-build.lock/`, varfor: 'Ett lås medan studion byggs.'},
  {ignore: '/inbox/*', varfor: 'Lapparna mellan chattar som arbetar samtidigt.'},
];

/** Mappar där varje undermapp hör till kartan: en som inte står i PLATSER visas ändå, som okänd. */
const ROTTER = [`${BJ}/assets`, `${AP}/assets`];

// ---- var en enhet används --------------------------------------------------------------------------------------
/** Filerna som pekar på det som lagras, med vad de är. En `*` står för en post i mappen. Läses som text. */
export const PEKARE: readonly {fil: string; ord: string; en: string; flera: string; kod?: boolean}[] = [
  {fil: `${BJ}/dealer3d/src/doll.ts`, ord: 'Dockornas mått i koden', en: 'Dockornas kod nämner den', flera: '', kod: true},
  {fil: `${BJ}/dealer3d/page/server.ts`, ord: 'Dockans sida i studion', en: 'Dockans sida i studion laddar den', flera: '', kod: true},
  {fil: `${BJ}/dealer3d/src/standard-room.ts`, ord: 'Dockans rum', en: 'Dockans rum laddar den', flera: '', kod: true},
  {fil: `${SD}/editor/server.ts`, ord: 'Dockans editor', en: 'Dockans editor laddar den', flera: '', kod: true},
  {fil: `${SD}/editor/scen.ts`, ord: 'Dockans editor', en: 'Dockans editor laddar den', flera: '', kod: true},
  {fil: `${KP}/visa/server.ts`, ord: 'Kortpaketets visare', en: 'Kortpaketets visare laddar den', flera: '', kod: true},
  {fil: `${AP}/vagar.json`, ord: 'Avatarernas vägar', en: 'Avatarernas vägar pekar på den', flera: ''},
  {fil: `${SD}/rorelsekatalog.json`, ord: 'Rörelseschemat', en: 'Rörelseschemat nämner den', flera: ''},
  {fil: `${BJ}/data/rendered-references.json`, ord: 'Dockans filmer för beställningarna', en: 'Beställningarna tar den som dockans film', flera: ''},
  {fil: `${BJ}/data/orders/*`, ord: 'Beställningarna', en: 'En beställning pekar på den', flera: 'beställningar pekar på den'},
  {fil: `${BJ}/assets/proofs/*/proof.json`, ord: 'Proven', en: 'Ett prov pekar på den', flera: 'prov pekar på den'},
];

const TAL = ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv'];
const ETT = ['noll', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv'];
/** Ett tal i ord, stort i början ("Tre prov"); `ett` för ett-ord. */
export const talOrd = (n: number, ettOrd = false, stor = true): string => { const s = n < TAL.length ? (ettOrd ? ETT : TAL)[n] : String(n); return stor ? s[0].toUpperCase() + s.slice(1) : s; };

export type Anvandning = {ord: string; antal: number; fil: string; kod: boolean; text: string};

// ---- mätningen -------------------------------------------------------------------------------------------------
export type Matt = {bytes: number; files: number; newest: number};
const slash = (p: string) => p.replace(/\\/g, '/');
/** En mapps storlek, filer och senaste ändring: mappen och det under den, en mapp i taget, utan att följa länkar. */
export function mat(abs: string, utom: readonly string[] = []): Matt {
  const m: Matt = {bytes: 0, files: 0, newest: 0};
  let st: Stats; try { st = lstatSync(abs); } catch { return m; }
  if (st.isSymbolicLink()) return m;
  if (st.isFile()) return {bytes: st.size, files: 1, newest: st.mtimeMs};
  const stack = [abs];
  while (stack.length) {
    const dir = stack.pop()!;
    let list; try { list = readdirSync(dir, {withFileTypes: true}); } catch { continue; }
    for (const e of list) {
      if (dir === abs && utom.includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) { try { const s = lstatSync(p); m.bytes += s.size; m.files++; m.newest = Math.max(m.newest, s.mtimeMs); } catch { /* borta medan den mättes */ } }
    }
  }
  return m;
}

/** Mapparna ett ställe står för: sig själv, eller varje mapp som `*` står för. */
export function mapparAv(casino: string, p: Pick<Plats, 'mapp'>): string[] {
  const delar = p.mapp.split('/');
  let ut = [''];
  for (const d of delar) {
    if (d !== '*') { ut = ut.map(u => u ? `${u}/${d}` : d); continue; }
    const nya: string[] = [];
    for (const u of ut) { let list; try { list = readdirSync(path.join(casino, u), {withFileTypes: true}); } catch { continue; } for (const e of list) if (e.isDirectory()) nya.push(u ? `${u}/${e.name}` : e.name); }
    ut = nya;
  }
  return ut.filter(u => existsSync(path.join(casino, u)));
}

// ---- enheterna -------------------------------------------------------------------------------------------------
export type Enhet = {
  /** Sökvägen från repots rot; för en figur med flera filer mappen och namnet före punkten (assets/docka/standarddocka_man). */
  id: string;
  plats: string;
  /** Vad den heter, i ord. */
  namn: string;
  bytes: number; files: number;
  /** Senast ändrad, ISO-dag och tid. */
  andrad: string;
  /** Filerna enheten är, från repots rot, när den är flera filer bredvid varandra; annars tom (mappen eller filen är id). */
  filer: string[];
  /** En fil som studion får visa som miniatyr, från repots rot, eller null. */
  bild: string | null;
  /** Var den används, ur PEKARE (och för spelets bank media-audit:s skäl). */
  anvands: Anvandning[];
  /** Spelets bank (media-audit.ts): användningen, skälen, hans dom. */
  bank?: {use: string; why: string[]; what: string; judged: string | null};
};

const MEDIA = /\.(?:png|jpe?g|webp|mp4|glb)$/i, BILD = /\.(?:png|jpe?g|webp)$/i;
/** Vad en enhet heter, ur namnet på disken: utan ändelse, med mellanslag. */
export function namnAv(namn: string): string {
  const s = namn.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/^standarddocka_/, 'docka ').replace(/^standardbord/, 'bord').replace(/[-_]+/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : namn;
}
/** En fil att visa för en enhet: en bild före en film före en modell, högst två nivåer ner. */
function bildI(casino: string, rel: string): string | null {
  const abs = path.join(casino, rel);
  let st; try { st = lstatSync(abs); } catch { return null; }
  if (st.isFile()) return MEDIA.test(rel) ? rel : null;
  if (!st.isDirectory()) return null;
  const funna: string[] = [];
  const titta = (dir: string, djup: number) => {
    let list; try { list = readdirSync(path.join(casino, dir), {withFileTypes: true}); } catch { return; }
    for (const e of list) { const r = `${dir}/${e.name}`; if (e.isFile() && MEDIA.test(e.name)) funna.push(r); else if (e.isDirectory() && djup < 2) titta(r, djup + 1); }
  };
  titta(rel, 0);
  const rang = (f: string) => BILD.test(f) ? 0 : /\.mp4$/i.test(f) ? 1 : 2;
  return funna.sort((a, b) => rang(a) - rang(b) || a.localeCompare(b))[0] ?? null;
}

type Rad = {rel: string; filer: string[]; namn: string};
/** Posterna ett ställe delas i: varje post i mappen (filer med samma stam ihop), eller en nivå ner. */
function poster(casino: string, p: Plats, mapp: string): Rad[] {
  const lista = (rel: string) => { try { return readdirSync(path.join(casino, rel), {withFileTypes: true}).filter(e => !e.isSymbolicLink()); } catch { return []; } };
  const utom = new Set(p.utom ?? []);
  const barn = (rel: string, topp: boolean): Rad[] => {
    const ut: Rad[] = [], stammar = new Map<string, string[]>();
    for (const e of lista(rel)) {
      if (topp && utom.has(e.name)) continue;
      const r = `${rel}/${e.name}`;
      if (e.isFile() && p.stam) { const s = e.name.split('.')[0]; stammar.set(s, [...(stammar.get(s) ?? []), r]); }
      else ut.push({rel: r, filer: [], namn: namnAv(e.name)});
    }
    for (const [s, filer] of stammar) ut.push(filer.length === 1 ? {rel: filer[0], filer: [], namn: namnAv(s)} : {rel: `${rel}/${s}`, filer: filer.sort(), namn: namnAv(s)});
    return ut;
  };
  if (p.delning === 'barn') return barn(mapp, true);
  if (p.delning === 'barnbarn') return lista(mapp).filter(e => !utom.has(e.name)).flatMap(e => e.isDirectory() ? barn(`${mapp}/${e.name}`, false).map(r => ({...r, namn: `${namnAv(e.name)}: ${r.namn}`})) : [{rel: `${mapp}/${e.name}`, filer: [], namn: namnAv(e.name)}]);
  return [];
}

/** Texterna i PEKARE, lästa en gång. */
export function pekarTexter(casino: string): {fil: string; text: string; def: (typeof PEKARE)[number]}[] {
  const ut: {fil: string; text: string; def: (typeof PEKARE)[number]}[] = [];
  for (const def of PEKARE) {
    const filer = def.fil.includes('*') ? mapparAv(casino, {mapp: def.fil.replace(/\/[^/]*$/, '')}).flatMap(d => { const sista = def.fil.split('/').at(-1)!; if (sista === '*') { try { return readdirSync(path.join(casino, d)).filter(f => f.endsWith('.json')).map(f => `${d}/${f}`); } catch { return []; } } return [`${d}/${sista}`]; }) : [def.fil];
    for (const fil of filer) { try { ut.push({fil, text: readFileSync(path.join(casino, fil), 'utf8'), def}); } catch { /* finns inte här */ } }
  }
  return ut;
}
const avgransad = (namn: string) => new RegExp(`(?<![A-Za-z0-9_-])${namn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_-])`);
/** Ett namn som är så eget att en träff är en pekare: med bindestreck, understreck eller siffra, eller långt (inte "status"). */
const eget = (namn: string) => /[-_0-9]/.test(namn) ? namn.length >= 5 : namn.length >= 9;
/** Namnen en enhet nämns med: sitt eget, och en docka också utan "standarddocka_" (editorn öppnar ?modell=tomasz_handled). */
export function namnFor(id: string): string[] {
  const namn = id.split('/').at(-1)!.replace(/\.[a-z0-9]{2,5}$/i, '');
  return [namn, namn.replace(/^standarddocka_/, '')].filter((n, i, a) => a.indexOf(n) === i && eget(n));
}
/** Var en enhet används: varje fil i PEKARE som nämner dess namn (hela namnet, inte inuti ett längre), räknad per slag. */
export function anvandningAv(id: string, texter: ReturnType<typeof pekarTexter>): Anvandning[] {
  const re = namnFor(id).map(avgransad), per = new Map<string, Anvandning>();
  if (!re.length) return [];
  for (const t of texter) {
    if (t.fil.startsWith(id + '/') || t.fil === id) continue; // ett prov pekar inte på sig självt
    if (!re.some(r => r.test(t.text))) continue;
    const e = per.get(t.def.ord) ?? {ord: t.def.ord, antal: 0, fil: t.fil, kod: !!t.def.kod, text: ''};
    e.antal++; e.text = e.antal > 1 && t.def.flera ? `${talOrd(e.antal, false)} ${t.def.flera}` : t.def.en; per.set(t.def.ord, e);
  }
  return [...per.values()];
}

/** Spelets bank ur media-audit.ts, som den är: enheterna under blackjack-dealer/assets och output, med användning och dom. */
export type BankItem = {path: string; top: string; bytes: number; files: number; changed: string; use: string; why: string[]; what: string; judged?: string | null};
export async function banken(casino: string): Promise<BankItem[]> {
  try {
    // Verktyget ur den här utcheckningen, bankens filer ur den som frågas om (ett test frågar om en tillfällig).
    const {audit} = await import(pathToFileURL(path.join(CASINO, BJ, 'tools/media-audit.ts')).href);
    return (audit(path.join(casino, BJ)).items as BankItem[]);
  } catch { return []; }
}

export type PlatsMatt = Plats & Matt & {mappar: string[]; enheter: Enhet[]; okand?: boolean};
export type Karta = {
  gjord: string;
  platser: PlatsMatt[];
  perSlag: {slag: Slag; ord: string; rad: string; bytes: number; files: number; platser: number}[];
  totalt: {bytes: number; files: number; utanPekare: number; utanPekareBytes: number; vantar: number; vantarBytes: number; tillfalligtBytes: number};
  saknas: {register: string; sokvag: string}[];
};

/** Okända mappar under rötterna: visas ändå, så att inget kan komma till utan att synas. */
export function okanda(casino: string): Plats[] {
  const kanda = new Set(PLATSER.map(p => p.mapp)), extra: Plats[] = [];
  for (const rot of ROTTER) { let list; try { list = readdirSync(path.join(casino, rot), {withFileTypes: true}); } catch { continue; } for (const e of list) if (e.isDirectory() && !kanda.has(`${rot}/${e.name}`)) extra.push({id: `okand-${slash(`${rot}/${e.name}`).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`, mapp: `${rot}/${e.name}`, namn: `En mapp som kartan inte känner (${e.name})`, slag: 'tillfalligt', projekt: rot.split('/')[0], git: false, ignore: null, register: [], lasare: ['ingen'], gratis: false, delning: 'barn', visas: 'media', radera: 'ja', banken: rot.startsWith(BJ)}); }
  return extra;
}

/** Vad en enhet i spelets bank är, kort, före dess namn ("Ankare: paow vila tatuerad"). */
const BANK_SORT: Record<string, string> = {motions: 'Film', anchors: 'Ankare', orders: 'Beställning', films: 'Film', tracking: 'Kortspår', scene: 'Scenen', props: 'Föremål', references: 'Dockans film'};
const bankNamn = (rel: string) => { const delar = rel.split('/'), sort = BANK_SORT[delar[1]]; const namn = namnAv(delar.at(-1)!); return sort && delar[1] !== 'proofs' ? `${sort}: ${namn.toLowerCase()}` : namn; };

/** Ett ställe mätt, med sina enheter (texter och bank: det som redan är läst, så att kartan läser dem en gång). */
export function platsMatt(casino: string, p: Plats, ctx: {texter: ReturnType<typeof pekarTexter>; bank: BankItem[]; enheter?: boolean}): PlatsMatt {
  const mappar = mapparAv(casino, p);
  // Ett ställe vars mapp ett annat ställe står i (slask/* och slask/*/granska): det inre räknas bara där det står.
  const inre = PLATSER.filter(q => q !== p && q.mapp.startsWith(p.mapp + '/')).map(q => q.mapp.split('/').at(-1)!);
  const utom = [...(p.utom ?? []), ...inre.filter(n => n !== '*')];
  let m: Matt = {bytes: 0, files: 0, newest: 0};
  const enheter: Enhet[] = [];
  if (p.banken && ctx.enheter !== false) {
    const top = p.mapp.slice(BJ.length + 1);
    for (const i of ctx.bank.filter(i => i.path === top || i.path.startsWith(top + '/'))) {
      const id = `${BJ}/${i.path}`;
      enheter.push({id, plats: p.id, namn: bankNamn(i.path), bytes: i.bytes, files: i.files, andrad: i.changed, filer: [], bild: p.visas === 'media' ? bildI(casino, id) : null, anvands: anvandningAv(id, ctx.texter), bank: {use: i.use, why: i.why, what: i.what, judged: i.judged ?? null}});
    }
  } else if (ctx.enheter !== false && p.delning !== 'ingen') {
    for (const mapp of mappar) for (const r of poster(casino, p, mapp)) {
      const mm = r.filer.length ? r.filer.map(f => mat(path.join(casino, f))).reduce((a, b) => ({bytes: a.bytes + b.bytes, files: a.files + b.files, newest: Math.max(a.newest, b.newest)}), {bytes: 0, files: 0, newest: 0}) : mat(path.join(casino, r.rel));
      const namn = p.mapp.includes('*') ? `${namnAv(r.rel.split('/')[1])}: ${r.namn}` : r.namn;
      enheter.push({id: r.rel, plats: p.id, namn, bytes: mm.bytes, files: mm.files, andrad: mm.newest ? new Date(mm.newest).toISOString() : '', filer: r.filer, bild: p.visas === 'media' ? (r.filer.length ? r.filer.find(f => BILD.test(f)) ?? r.filer.find(f => MEDIA.test(f)) ?? null : bildI(casino, r.rel)) : null, anvands: [...(p.listas ? [{ord: 'Avatarer', antal: 1, fil: '', kod: false, text: p.listas}] : []), ...anvandningAv(r.rel, ctx.texter)]});
    }
  }
  for (const mapp of mappar) { const x = mat(path.join(casino, mapp), utom); m = {bytes: m.bytes + x.bytes, files: m.files + x.files, newest: Math.max(m.newest, x.newest)}; }
  return {...p, ...m, mappar, enheter: enheter.sort((a, b) => b.bytes - a.bytes), ...(p.id.startsWith('okand-') ? {okand: true} : {})};
}

const SAKER = /^[A-Za-z0-9._][A-Za-z0-9._ -]*$/;
/** Varför en sökväg inte kan vara en enhet i kartan (bakåtsnedstreck, .., en tom eller konstig del, en absolut väg), eller null. */
export function osakerSokvag(id: unknown): string | null {
  if (typeof id !== 'string' || !id || id.length > 400) return 'Ingen sökväg.';
  if (id.includes('\\') || id.startsWith('/') || /^[A-Za-z]:/.test(id)) return 'Sökvägen ska räknas från repots rot med snedstreck framåt.';
  if (id.split('/').some(d => d === '..' || d === '.' || !SAKER.test(d) || /^\.env/i.test(d))) return 'Sökvägen går utanför kartan.';
  return null;
}
/** Stället en sökväg ligger i, ur kartan (det mest precisa först), med mappen den ligger i; null utanför kartan. Läser inte disken. */
export function platsFor(id: string, platser: readonly Plats[] = PLATSER): {plats: Plats; mapp: string} | null {
  if (osakerSokvag(id)) return null;
  const delar = id.split('/');
  for (const p of [...platser].sort((a, b) => b.mapp.split('/').length - a.mapp.split('/').length)) {
    const m = p.mapp.split('/');
    if (delar.length <= m.length || !m.every((d, i) => d === '*' || d === delar[i])) continue;
    if (p.utom?.includes(delar[m.length])) continue;
    return {plats: p, mapp: delar.slice(0, m.length).join('/')};
  }
  return null;
}
/** Bilder, filmer och modeller som studion får visa som miniatyr. */
export const VISBAR = /\.(?:png|jpe?g|webp|mp4|glb)$/i;
/** Varför studion inte får visa en fil, eller null. live-bj (film och bilder av riktiga dealrar) och ditt foto aldrig. */
export function visasInte(rel: string, platser: readonly Plats[] = PLATSER): string | null {
  const fel = osakerSokvag(rel); if (fel) return fel;
  if (rel.startsWith(`${LB}/`) || rel.split('/').includes('private') || /(^|\/)\.env/i.test(rel)) return 'Visas aldrig.';
  if (!VISBAR.test(rel)) return 'Bara bilder, filmer och modeller visas.';
  const hit = platsFor(rel, platser);
  if (!hit || hit.plats.visas !== 'media' || hit.plats.git) return 'Visas inte.';
  return null;
}

/** Hela kartan: varje ställe mätt, med sina enheter (enheter: false mäter bara ställena). */
export async function karta(casino = CASINO, o: {enheter?: boolean} = {}): Promise<Karta> {
  const medEnheter = o.enheter !== false;
  const texter = medEnheter ? pekarTexter(casino) : [];
  const bank = medEnheter ? await banken(casino) : [];
  const platser = [...PLATSER, ...okanda(casino)].map(p => platsMatt(casino, p, {texter, bank, enheter: medEnheter}));
  const perSlag = SLAG_ORDNING.map(slag => { const ps = platser.filter(p => p.slag === slag); return {slag, ...SLAG[slag], bytes: ps.reduce((s, p) => s + p.bytes, 0), files: ps.reduce((s, p) => s + p.files, 0), platser: ps.length}; }).filter(s => s.platser);
  const alla = platser.flatMap(p => p.enheter.map(e => ({e, p})));
  // Det som inget pekar på: ingen fil i PEKARE nämner det, och i spelets bank är det okänt för registren. Det tillfälliga
  // (slasken, kontrollbilderna, papperskorgen) har ingen pekare av sin natur och räknas för sig.
  const fri = alla.filter(({e, p}) => !p.git && p.slag !== 'tillfalligt' && !e.anvands.length && (!e.bank || e.bank.use === 'okänd') && p.radera === 'ja');
  const vant = platser.filter(p => p.vantar);
  return {
    gjord: new Date().toISOString(),
    platser,
    perSlag,
    totalt: {bytes: platser.reduce((s, p) => s + p.bytes, 0), files: platser.reduce((s, p) => s + p.files, 0), utanPekare: fri.length, utanPekareBytes: fri.reduce((s, {e}) => s + e.bytes, 0), vantar: vant.reduce((s, p) => s + p.enheter.length, 0), vantarBytes: vant.reduce((s, p) => s + p.bytes, 0), tillfalligtBytes: platser.filter(p => p.slag === 'tillfalligt').reduce((s, p) => s + p.bytes, 0)},
    saknas: medEnheter ? saknas(casino) : [],
  };
}

// ---- det registren pekar på som saknas -------------------------------------------------------------------------
/** Registren vars filpekare ska finnas på datorn: projektets mapp som sökvägarna räknas från, och filen. */
export const REGISTER: readonly {fil: string; bas: string; bara?: string}[] = [
  {fil: `${BJ}/data/media-roles.json`, bas: BJ},
  {fil: `${BJ}/data/rendered-references.json`, bas: BJ},
  {fil: `${BJ}/data/clip-jobs.json`, bas: BJ},
  {fil: `${BJ}/data/manifest.json`, bas: BJ},
  {fil: `${BJ}/data/speech-patches.json`, bas: BJ},
  {fil: `${BJ}/data/scene-rooms.json`, bas: BJ},
  {fil: `${BJ}/data/props.json`, bas: BJ},
  {fil: `${BJ}/data/lipsync.json`, bas: BJ},
  {fil: `${AP}/vagar.json`, bas: AP, bara: 'var'},
];
const PEKAR = /(?:\.\.\/[a-z-]+\/)?(?:assets|output|input|klipp)\/[A-Za-z0-9_.\-/]+\.[A-Za-z0-9]{2,5}(?![A-Za-z0-9_/-])/g;
/** Filerna ett register pekar på som inte finns här. I vagar.json räknas bara listorna `var` (resten är beskrivning). */
export function saknas(casino: string): {register: string; sokvag: string}[] {
  const ut: {register: string; sokvag: string}[] = [], sett = new Set<string>();
  for (const r of REGISTER) {
    let text: string; try { text = readFileSync(path.join(casino, r.fil), 'utf8'); } catch { continue; }
    if (r.bara) { try { const varden: string[] = []; JSON.parse(text, (k, v) => { if (k === r.bara && Array.isArray(v)) varden.push(...v.filter((x: unknown) => typeof x === 'string')); return v; }); text = varden.join('\n'); } catch { continue; } }
    for (const hit of text.match(PEKAR) ?? []) {
      const sokvag = slash(path.posix.normalize(`${r.bas}/${hit}`));
      if (sokvag.startsWith('..') || sett.has(sokvag)) continue;
      sett.add(sokvag);
      if (!existsSync(path.join(casino, sokvag))) ut.push({register: r.fil, sokvag});
    }
  }
  return ut;
}

// ---- utskriften ------------------------------------------------------------------------------------------------
export const storlek = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.ceil(bytes / 1e3)} kB`).replace('.', ',');
function oversikt(k: Karta): string {
  const rader = [`Lagringen i repot: ${storlek(k.totalt.bytes)} i ${k.totalt.files.toLocaleString('sv-SE')} filer på ${k.platser.length} ställen.`,
    `Inget pekar på ${k.totalt.utanPekare} enheter (${storlek(k.totalt.utanPekareBytes)}); ${k.totalt.vantar} väntar på Jakobs dom (${storlek(k.totalt.vantarBytes)}); tillfälligt ${storlek(k.totalt.tillfalligtBytes)}.`, ''];
  for (const s of k.perSlag) {
    rader.push(`${s.ord}, ${storlek(s.bytes)}`);
    for (const p of k.platser.filter(p => p.slag === s.slag).sort((a, b) => b.bytes - a.bytes))
      rader.push(`  ${p.mapp.padEnd(44)} ${storlek(p.bytes).padStart(10)}  ${String(p.files).padStart(6)} filer${p.enheter.length ? `, ${p.enheter.length} enheter` : ''}${p.git ? ', Git har den' : ''}${p.gratis ? ', går att göra om gratis' : ''}${p.okand ? ', OKÄND' : ''}`);
  }
  rader.push('', k.saknas.length ? `Registren pekar på ${k.saknas.length} filer som inte finns här:` : 'Allt registren pekar på finns här.');
  const per = new Map<string, number>(); for (const s of k.saknas) per.set(s.register, (per.get(s.register) ?? 0) + 1);
  for (const [r, n] of per) rader.push(`  ${r}: ${n}`);
  return rader.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const k = await karta(CASINO);
  if (process.argv.includes('--json')) console.log(JSON.stringify(k));
  else console.log(oversikt(k));
}
