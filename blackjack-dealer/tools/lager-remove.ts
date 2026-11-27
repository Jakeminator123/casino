// Radera på riktigt (Jakob 2026-11-27: "absolut kunna hårt radera dockor, videos, rörelser, bord och mycket annat i Dealer
// Studio, som direkt faktiskt raderar saker på riktigt också"): hans klick i Biblioteket och i Granska, Prov tar en enhet ur
// kartan (../../lager.ts) från disken, utan papperskorg. Ett verktyg och en väg i servern (tools/lager-routes.ts):
//   fraga(casino, id)            vad som händer: vad som raderas, följden i hans ord, och om det kräver ett andra klick
//   radera(casino, id, {andra})  raderingen; ett register som pekar dit rättas i samma steg där det går
// Skyddet mot ett felklick är frågan: det som spelet spelar, som har en roll, som är betalt och inte går att göra om, som
// väntar på hans dom eller som andra saker pekar på kräver ett andra klick (niva 'skyddad'); det som går att göra om gratis
// eller som han har dömt Inte bra går med ett klick och en enkel fråga (niva 'fri'). Aldrig erbjudet ('aldrig'): det Git har
// (kod och register), hans domar och anteckningar, korten i Beslut, kortplanen, hans sparade val, liggarna över betalda anrop,
// programmen och livebordets film. Vägrat ('vagras'): det ett register håller som inte kan rättas här (ett kort i Beslut, ett
// träd i Karta, en beställning som pågår, en munlapp, kopian på nätet): pekaren tas bort först, där den står.
// Rättat i samma steg: rollen i Material (data/media-roles.json), raden om en av dockans filmer
// (data/rendered-references.json) och avatarernas vägars pekare på en modell eller ett prov (vagar.json, listorna `var`).
// Spelets bank tas genom tools/media-thin.ts removeOnWord (hard: dess poster lämnar registret, hans domar står kvar som rader i
// data/motions-removed.jsonl); allt annat med fs.rm, bara inom stället i kartan. Den automatiska gallringen (media-thin.ts
// --auto) är en annan sak: den raderar utan hans klick och behåller sin papperskorg.
import {existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, rmdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {PLATSER, banken, okanda, osakerSokvag, pekarTexter, platsFor, platsMatt, talOrd, type Enhet, type Plats, type PlatsMatt} from '../../lager.ts';
import {IN_FLIGHT, removeOnWord, TRASH} from './media-thin.ts';

export const CASINO = path.resolve(import.meta.dirname, '../..');
const BJ = 'blackjack-dealer', AP = 'avatar-auto-pipeline';
const MEDIA = /\.(?:mp4|mov|webm|mkv|wav|mp3|m4a|png|jpe?g|webp|glb|tar)$/i;

export type Niva = 'fri' | 'skyddad' | 'vagras' | 'aldrig';
/** En följd i hans ord; skyddar: den kräver ett andra klick. */
export type Orsak = {text: string; skyddar: boolean};
export type Fraga = {
  id: string; namn: string; plats: string; platsNamn: string;
  niva: Niva;
  /** Följderna, i hans ord ("Spelet spelar den: steget blir utan film"). */
  orsaker: Orsak[];
  /** Varför den inte raderas (vagras, aldrig), eller null. */
  vagras: string | null;
  bytes: number; files: number;
  /** Det som rättas i samma steg, i hans ord. */
  rattas: string[];
};
export type Raderat = {id: string; raderat: string[]; bytes: number; rattat: string[]; vagrat: string | null};

// ---- att läsa ---------------------------------------------------------------------------------------------------
const las = (casino: string, rel: string): string => { try { return readFileSync(path.join(casino, rel), 'utf8'); } catch { return ''; } };
const json = <T>(casino: string, rel: string): T | null => { try { return JSON.parse(las(casino, rel)) as T; } catch { return null; } };
const inne = (rel: string, unit: string) => rel === unit || rel.startsWith(`${unit}/`);

/** Var ett register står i studions ord (removeOnWord säger vilken fil som pekar). */
const PEKAR_ORD: [RegExp, string][] = [
  [/data\/decisions\.json/, 'Ett kort i Beslut frågar om det: svara på kortet, så tas det bort när svaret är utfört.'],
  [/data\/studio-release\.json/, 'Det finns med i kopian på nätet.'],
  [/data\/dealer-(?:trees|compositions)\.json/, 'Det används i ett träd i Karta.'],
  [/data\/speech-patches\.json/, 'En munlapp använder det.'],
  [/data\/orders\//, 'En beställning som pågår använder det.'],
];
export const vagranOrd = (reason: string): string =>
  PEKAR_ORD.find(([p]) => p.test(reason))?.[1] ?? (/skyddad/.test(reason) ? 'Original och referenser raderas aldrig.' : 'Det gick inte att radera.');

type Roll = {dealer: string; id: string; role: string; name?: string; state?: string; path?: string};
/** Rollerna i Material vars bild ligger i enheten (sökvägen räknad från blackjack-dealer). */
function rollerI(casino: string, unit: string): Roll[] {
  const roles = json<{dealers?: Record<string, {entries?: Roll[]}>}>(casino, `${BJ}/data/media-roles.json`);
  return Object.entries(roles?.dealers ?? {}).flatMap(([dealer, d]) => (d.entries ?? []).filter(e => typeof e.path === 'string' && inne(e.path, unit)).map(e => ({...e, dealer})));
}
const ROLL_ORD: Record<string, string> = {'ankare-1': 'ankare 1', 'ankare-2.1': 'ankare 2.1', 'ankare-2.2': 'ankare 2.2', 'ankare-2.3': 'ankare 2.3', keystone: 'keystone', ingangsbild: 'ingångsbild', film: 'film', referens: 'referens', arbetsmaterial: 'arbetsmaterial'};
const rollOrd = (r: Roll) => ROLL_ORD[r.role] ?? r.role.replace(/-/g, ' ');

/** Hans anteckningar och korten i Beslut om ett prov. */
function provetsOrd(casino: string, id: string): {bra: number; inteBra: number; kort: number; obesvarade: number} {
  const notes = json<{notes?: {proof?: string; choice?: string | null}[]}>(casino, `${BJ}/data/proof-notes.json`)?.notes ?? [];
  const cards = json<{decisions?: {proof?: string; answer?: unknown}[]}>(casino, `${BJ}/data/decisions.json`)?.decisions ?? [];
  const mine = notes.filter(n => n.proof === id), own = cards.filter(c => c.proof === id);
  return {bra: mine.filter(n => n.choice === 'bra').length, inteBra: mine.filter(n => n.choice === 'inte-bra').length, kort: own.length, obesvarade: own.filter(c => !c.answer).length};
}
/** Provets mappar i slasken som väntar på hans dom: slask/<projekt>/granska/<id>. */
function slaskenAv(casino: string, id: string): string[] {
  let list: string[] = []; try { list = readdirSync(path.join(casino, 'slask'), {withFileTypes: true}).filter(d => d.isDirectory()).map(d => d.name); } catch { /* ingen slask */ }
  return list.map(p => `slask/${p}/granska/${id}`).filter(d => existsSync(path.join(casino, d)));
}
/** En beställning som pågår (ett utkast, godkänd men inte lagd, eller en tagning på väg). */
function bestallningPagar(casino: string, id: string): boolean {
  const o = json<{status?: string}>(casino, `${BJ}/data/orders/${id}.json`);
  if (!o) return false;
  const takes = json<{takes?: {status?: string}[]}>(casino, `${BJ}/assets/orders/${id}/receipt.json`)?.takes ?? [];
  return o.status === 'UTKAST' || (o.status === 'GODKÄND' && !existsSync(path.join(casino, BJ, 'assets/orders', id, 'receipt.json'))) || takes.some(t => IN_FLIGHT.has(t.status ?? ''));
}
/** Pekarna i vagar.json (listorna `var`, räknade från avatar-auto-pipeline) på det som raderas. */
function vagarPekare(casino: string, filer: string[]): string[] {
  const text = las(casino, `${AP}/vagar.json`); if (!text) return [];
  const ut: string[] = [];
  try { JSON.parse(text, (k, v) => { if (k === 'var' && Array.isArray(v)) for (const x of v) if (typeof x === 'string' && filer.some(f => inne(path.posix.normalize(`${AP}/${x}`).replace(/\/$/, ''), f))) ut.push(x); return v; }); } catch { /* inte läsbar */ }
  return ut;
}
/** Raderna om dockans filmer (data/rendered-references.json) vars fil ligger i det som raderas. */
function referensRader(casino: string, filer: string[]): string[] {
  const reg = json<{films?: {id: string; path?: string}[]}>(casino, `${BJ}/data/rendered-references.json`);
  return (reg?.films ?? []).filter(f => typeof f.path === 'string' && filer.some(u => inne(`${BJ}/${f.path}`, u))).map(f => f.id);
}

// ---- enheten och frågan -----------------------------------------------------------------------------------------
type Hittad = {plats: Plats; pm: PlatsMatt | null; enhet: Enhet | null; fel: string | null};
async function hitta(casino: string, id: string): Promise<Hittad> {
  const osaker = osakerSokvag(id); if (osaker) return {plats: PLATSER[0], pm: null, enhet: null, fel: osaker};
  const hit = platsFor(id, [...PLATSER, ...okanda(casino)]);
  if (!hit) return {plats: PLATSER[0], pm: null, enhet: null, fel: 'Det finns inte i kartan.'};
  const p = hit.plats;
  if (p.radera === 'aldrig' || p.git) return {plats: p, pm: null, enhet: null, fel: null};
  const pm = platsMatt(casino, p, {texter: pekarTexter(casino), bank: p.banken ? await banken(casino) : []});
  const enhet = pm.enheter.find(e => e.id === id) ?? null;
  return {plats: p, pm, enhet, fel: enhet ? null : 'Det finns inte längre.'};
}
/** Filerna och mapparna enheten är, från repots rot. */
const delarAv = (e: Enhet) => e.filer.length ? e.filer : [e.id];

/** Vad en radering av enheten gör, i hans ord. */
export async function fraga(casino: string, id: string, now = Date.now()): Promise<Fraga> {
  const h = await hitta(casino, id), p = h.plats;
  const bas = {id, namn: h.enhet?.namn ?? id.split('/').at(-1)!, plats: p.id, platsNamn: p.namn, bytes: h.enhet?.bytes ?? 0, files: h.enhet?.files ?? 0, rattas: [] as string[], orsaker: [] as Orsak[]};
  if (h.fel) return {...bas, niva: 'vagras', vagras: h.fel};
  if (!h.enhet) return {...bas, niva: 'aldrig', vagras: p.git ? 'Git har den: kod och register raderas inte från studion.' : p.aldrig ?? 'Det raderas inte här.'};
  const e = h.enhet, o: Orsak[] = bas.orsaker, rattas = bas.rattas;
  const skydda = (text: string) => o.push({text, skyddar: true}), saga = (text: string) => o.push({text, skyddar: false});
  let vagras: string | null = null;
  const delar = delarAv(e);

  if (p.banken) {
    const rel = e.id.slice(BJ.length + 1), top = rel.split('/')[1], name = rel.split('/').at(-1)!;
    const use = e.bank?.use, judged = e.bank?.judged ?? '';
    const avvisad = /\((?:REJECTED)\)/.test(judged), godkand = /\((?:ACCEPTED|SECONDARY)\)/.test(judged);
    if (top === 'proofs') {
      const ord = provetsOrd(casino, name), slask = slaskenAv(casino, name);
      if (ord.obesvarade) vagras = 'Ett kort i Beslut frågar om provet: svara på kortet, så tas det bort när svaret är utfört.';
      if (ord.bra) skydda(`Du har sagt Bra om ${talOrd(ord.bra, true, false)} ${ord.bra === 1 ? 'sak' : 'saker'} i provet.`);
      else if (ord.inteBra) saga('Du har dömt det Inte bra.');
      else skydda('Det väntar på din dom: du har inte sagt något om det.');
      if (slask.length) skydda(`Dess original som väntar på din dom raderas med det (${slask.length === 1 ? 'en mapp' : `${slask.length} mappar`} i slasken): betalda filmer går inte att göra om.`);
      saga('Dina anteckningar om provet finns kvar.');
    } else {
      if (use === 'spelas') skydda(top === 'motions' ? 'Spelet spelar den: steget blir utan film.' : top === 'tracking' ? 'Spelet läser kortspåret till en film som spelas: kortet följer inte handen utan det.' : 'Spelet laddar den: den saknas i spelet.');
      if (godkand) skydda('Du har godkänt den.');
      else if (avvisad) saga('Du har dömt den Inte bra.');
      const roller = rollerI(casino, rel);
      for (const r of roller) (r.state === 'ersatt' || r.state === 'arkiverad' ? saga : skydda)(`Har rollen ${rollOrd(r)} i Material${r.state === 'ersatt' || r.state === 'arkiverad' ? ` (${r.state})` : ''}: rollen tas bort med den.`);
      if (roller.length) rattas.push(roller.length === 1 ? 'Rollen i Material tas bort.' : `${talOrd(roller.length)} roller i Material tas bort.`);
      if (top === 'orders') { if (bestallningPagar(casino, name)) vagras = 'Beställningen pågår: den raderas när den är klar.'; skydda('Betald, går inte att göra om. Kvittona står kvar.'); }
      else if (['motions', 'anchors', 'films'].includes(top) && !avvisad) skydda(top === 'anchors' ? 'Betald bild, går inte att göra om.' : 'Betald film, går inte att göra om.');
      if (top === 'references') {
        const rader = referensRader(casino, delar);
        if (rader.length) rattas.push('Raden om den i dockans filmer för beställningarna tas bort.');
        let styr = false; try { styr = readdirSync(path.join(casino, e.id)).some(f => /^styrbild/.test(f)); } catch { /* ingen mapp */ }
        if (styr) skydda('Styrbilden är betald och går inte att göra om; dockans film går att filma igen.');
        else saga('Dockans film går att filma igen.');
      }
      if (p.gratis && top !== 'references') saga(`Går att göra om gratis: ${p.hur ?? 'med ett verktyg'}.`);
      // Det som removeOnWord vägrar också på hans ord: en pekare som inte rättas här.
      const {result} = await removeOnWord([top === 'motions' ? name : rel], {repo: path.join(casino, BJ), why: 'fråga', trash: path.join(casino, BJ, TRASH), receiptDir: path.join(casino, BJ, '.runtime/cleanup'), dry: true, now});
      const andra = result.refused.filter(r => !/data\/media-roles\.json/.test(r.reason));
      if (andra.length && !vagras) vagras = vagranOrd(andra[0].reason);
    }
  } else {
    const minuter = e.andrad ? (now - Date.parse(e.andrad)) / 60000 : Infinity;
    // A lock in the slask (gpu-och-headless.lock): a run holds it, and only the one who set it takes it away.
    if (/\.lock$/i.test(e.id)) vagras = 'Ett lås för en körning som pågår: den som satte det tar bort det.';
    if (p.vantar) { skydda('Väntar på din dom.'); skydda('Kan vara betalt: går inte att göra om.'); }
    if (p.id === 'arbete' && minuter < 60) skydda(`En chatt kan arbeta i den just nu (ändrad för ${Math.max(1, Math.round(minuter))} minuter sedan).`);
    if (p.id === 'personer') skydda('Bilderna av en person går inte att göra om.');
    if (p.id === 'korningar') skydda('Körningen kan ha kostat (Meshy, Runway): den går inte att göra om gratis.');
    if (p.id === 'paketet') skydda('Köpt: det packas upp igen bara om paketet ligger kvar i Hämtade filer.');
    if (p.id === 'meshy') skydda('Betald (Meshy), går inte att göra om.');
    if (p.id === 'papperskorgen') saga('Det som ligger i papperskorgen raderas för gott.');
    if (p.id.startsWith('okand-')) skydda('Kartan känner inte mappen: titta först.');
    const gratis = p.gratis || (p.id === 'dockor' && /^docka (?:man|kvinna|danilo|frasse)(?: ogon)?$/i.test(e.namn));
    const kod = [...new Set(e.anvands.filter(a => a.kod).map(a => a.ord))];
    if (kod.length) skydda(`${kod.length === 1 ? kod[0] : `${kod.slice(0, -1).join(', ')} och ${kod.at(-1)!.toLowerCase()}`} laddar den: den saknas där tills den ${gratis ? 'byggs igen' : 'görs om, och det går inte gratis'}.`.replace(/(, |och )([A-ZÅÄÖ])/g, (_, a, b) => a + b.toLowerCase()));
    for (const a of e.anvands.filter(a => !a.kod)) {
      if (a.ord === 'Avatarernas vägar') { if (vagarPekare(casino, delar).length) rattas.push('Avatarernas vägar slutar peka på den.'); else saga('Avatarernas vägar nämner den i en beskrivning.'); continue; }
      if (a.ord === 'Dockans filmer för beställningarna') { rattas.push('Raden om den i dockans filmer för beställningarna tas bort.'); continue; }
      skydda(`${a.text}.`);
    }
    if (gratis) saga(`Går att göra om gratis${p.hur ? `: ${p.hur}` : ''}.`);
    else if (!o.some(x => x.skyddar) && !p.vantar && p.id !== 'papperskorgen' && p.id !== 'arbete') skydda('Går inte att göra om gratis.');
  }
  if (p.banken && vagarPekare(casino, delar).length) rattas.push('Avatarernas vägar slutar peka på den.');
  const niva: Niva = vagras ? 'vagras' : o.some(x => x.skyddar) ? 'skyddad' : 'fri';
  return {...bas, niva, vagras, orsaker: o, rattas: [...new Set(rattas)]};
}

// ---- raderingen -------------------------------------------------------------------------------------------------
/** Tar en fil eller mapp från disken, bara om den verkligen ligger i stället (inga länkar ut, inget ovanför). */
function taBort(casino: string, rel: string, mapp: string): number {
  const fel = osakerSokvag(rel); if (fel) throw new Error(fel);
  const abs = path.join(casino, rel), rot = realpathSync(path.join(casino, mapp));
  const st = lstatSync(abs);
  if (st.isSymbolicLink()) throw new Error(`${rel} är en länk: den raderas inte härifrån.`);
  const verklig = realpathSync(abs), r = path.relative(rot, verklig);
  if (!r || r.startsWith('..') || path.isAbsolute(r)) throw new Error(`${rel} ligger inte i stället.`);
  let bytes = 0;
  if (st.isDirectory()) { const stack = [abs]; while (stack.length) { const d = stack.pop()!; for (const x of readdirSync(d, {withFileTypes: true})) { const q = path.join(d, x.name); if (x.isDirectory()) stack.push(q); else if (x.isFile()) bytes += lstatSync(q).size; } } }
  else bytes = st.size;
  rmSync(abs, {recursive: true, force: false});
  return bytes;
}
/** Skriver ett JSON-register på samma form som dess eget verktyg (två mellanslag), genom en tillfällig fil. */
function skrivJson(abs: string, value: unknown) { const tmp = `${abs}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n'); renameSync(tmp, abs); }
/** Rättar pekarna på det raderade: rollerna i Material, raderna om dockans filmer, vägarnas listor `var`. */
function ratta(casino: string, delar: string[]): string[] {
  const gjort: string[] = [];
  const bj = (f: string) => f.startsWith(`${BJ}/`) ? f.slice(BJ.length + 1) : null;
  const inom = delar.map(bj).filter((x): x is string => !!x);
  if (inom.length) {
    const rolesFile = path.join(casino, BJ, 'data/media-roles.json'), roles = json<{dealers?: Record<string, {entries?: Roll[]}>}>(casino, `${BJ}/data/media-roles.json`);
    let n = 0;
    for (const d of Object.values(roles?.dealers ?? {})) if (d.entries) { const before = d.entries.length; d.entries = d.entries.filter(e => !(typeof e.path === 'string' && inom.some(u => inne(e.path!, u)))); n += before - d.entries.length; }
    if (n) { skrivJson(rolesFile, roles); gjort.push(n === 1 ? 'Rollen i Material är borttagen.' : `${talOrd(n)} roller i Material är borttagna.`); }
  }
  const refs = referensRader(casino, delar);
  if (refs.length) {
    const file = path.join(casino, BJ, 'data/rendered-references.json'), reg = json<{films: {id: string}[]}>(casino, `${BJ}/data/rendered-references.json`)!;
    reg.films = reg.films.filter(f => !refs.includes(f.id)); skrivJson(file, reg);
    gjort.push('Raden om den i dockans filmer för beställningarna är borttagen.');
  }
  const vagar = vagarPekare(casino, delar);
  if (vagar.length) {
    // Bara raderna med `"var": [...]` skrivs om, med samma form; resten av filen står kvar tecken för tecken.
    const file = path.join(casino, AP, 'vagar.json'), text = readFileSync(file, 'utf8');
    const ny = text.split('\n').map(line => { const m = /^(\s*"var": )(\[.*\])(,?\s*)$/.exec(line); if (!m) return line; let arr: unknown[]; try { arr = JSON.parse(m[2]); } catch { return line; } const kvar = arr.filter(x => !(typeof x === 'string' && vagar.includes(x))); return kvar.length === arr.length ? line : `${m[1]}${JSON.stringify(kvar).replace(/","/g, '", "')}${m[3]}`; }).join('\n');
    if (ny !== text) { JSON.parse(ny); writeFileSync(file, ny); gjort.push('Avatarernas vägar pekar inte längre på den.'); }
  }
  return gjort;
}

/** Raderar enheten på hans klick. `andra`: hans andra klick, som det skyddade kräver. */
export async function radera(casino: string, id: string, o: {andra?: boolean; now?: number} = {}): Promise<Raderat> {
  const now = o.now ?? Date.now();
  const f = await fraga(casino, id, now);
  if (f.niva === 'aldrig' || f.niva === 'vagras') return {id, raderat: [], bytes: 0, rattat: [], vagrat: f.vagras};
  if (f.niva === 'skyddad' && !o.andra) return {id, raderat: [], bytes: 0, rattat: [], vagrat: 'Det kräver ditt andra klick.'};
  const h = await hitta(casino, id);
  if (!h.enhet || h.fel) return {id, raderat: [], bytes: 0, rattat: [], vagrat: h.fel ?? 'Det finns inte längre.'};
  const e = h.enhet, p = h.plats, delar = delarAv(e);
  const why = `Jakob raderade i studion: ${e.namn} (${id})`;
  const raderat: string[] = [];
  let bytes = 0;
  // Pekarna först, så att inget pekar på något som är borta: rollerna, raderna och vägarnas listor.
  const rattat = ratta(casino, delar);
  if (p.banken) {
    const repo = path.join(casino, BJ), rel = e.id.slice(BJ.length + 1), top = rel.split('/')[1], name = rel.split('/').at(-1)!;
    const {result} = await removeOnWord([top === 'motions' ? name : rel], {repo, why, trash: path.join(repo, TRASH), receiptDir: path.join(repo, '.runtime/cleanup'), hard: true, now, ...(top === 'orders' ? {only: MEDIA} : {})});
    if (result.refused.length) return {id, raderat: [], bytes: 0, rattat, vagrat: vagranOrd(result.refused[0].reason)};
    raderat.push(...result.units.map(u => `${BJ}/${u}`)); bytes += result.done.reduce((s, d) => s + d.bytes, 0);
    if (top === 'proofs') for (const d of slaskenAv(casino, name)) { bytes += taBort(casino, d, d.split('/').slice(0, 3).join('/')); raderat.push(d); }
  } else {
    for (const d of delar) { if (!existsSync(path.join(casino, d))) continue; bytes += taBort(casino, d, h.pm!.mappar.find(m => inne(d, m)) ?? p.mapp); raderat.push(d); }
    // Den mapp en grupp av filer låg i står kvar; en tom mapp efter en körnings steg tas bort.
    const upp = path.posix.dirname(e.id);
    if (p.delning === 'barnbarn' && existsSync(path.join(casino, upp)) && !readdirSync(path.join(casino, upp)).length) rmdirSync(path.join(casino, upp));
    const kvitto = path.join(casino, BJ, '.runtime/cleanup');
    mkdirSync(kvitto, {recursive: true});
    writeFileSync(path.join(kvitto, `${new Date(now).toISOString().replace(/[:.]/g, '-')}-raderat-pa-hans-klick.json`), JSON.stringify({tool: 'tools/lager-remove.ts (hans klick i studion)', at: new Date(now).toISOString(), why, raderat, bytes, rattat}, null, 2) + '\n');
  }
  return {id, raderat, bytes, rattat, vagrat: null};
}
