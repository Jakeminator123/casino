// Karta, Schemat (studions sida /studio/karta/?vy=schema, studio/components/schemat/): rörelseschemat ur
// ../standarddocka/rorelsekatalog.json, med det som finns för varje docka. Vägen i tools/preview.ts:
//   GET /api/schema   ankarena, stadierna och rörelserna; för varje docka (Danilo, Frasse, mannen, kvinnan, och den äldre
//                     dealern som har filmer i ett träd) bordets kortplatser och det som finns per rörelse och plats: lyft ur
//                     livefilmen, ritad, inspelat i dockans editor, en film (beställd, eller i trädet), med sidan där det
//                     öppnas; hur ofta varje rörelse finns i livefilmen (../live-bj/data/segment.json); rundan som en väg;
//                     och det katalogen säger som inte stämmer med filerna.
// Läser varje gång: katalogen, segment.json, dockans rörelser (dealer3d/data/), editorns klipp (../standarddocka/klipp/, bara
// namnen och rundans klipplista), beställningarna (data/orders/), kortplanen (placements/default.json, bara läst) och träden
// (tools/dealer-tree.ts treeAnswer). Lagrar ingenting och skriver ingenting. De rena reglerna (vilket ankare ett id menar,
// vilken rörelse ett steg är, orden) står i studio/lib/schemat.ts. Provet: tools/schema-routes.test.ts.
//
// Vilken rörelse en fil är:
//   - en fil som en rörelses mönster i katalogen (fältet filer, till exempel giv-fran-2-3-p<n>c1-ren-<a|b>-<docka>) nämner är
//     den rörelsen, för dockan i namnet och platsen i namnet (p4c1: plats 4, kort 1); ritad, eller lyft om den heter lyft-;
//   - ett lyft (lyft-<docka>-*.json) som katalogen inte nämner läses: ett lyft med ett kort (fältet to, P4.C1) är kortets giv i
//     livefilmens kategori (GIV till en spelare, GIV-EGET till dealern), och den rörelse i katalogen med den kategorin vars till
//     kortet är (A3P4C1: GIV-KORT-1); ett lyft utan kort är en väntan (kategorin VANTA). Ett lyft går från vilan till vilan;
//   - ett inspelat klipp är den rörelse det är inspelat av: ett lyft (live-lyft-<lyftet>-…, live-sekvens-<delarna>-…), en
//     plats med dockans egna grundrörelser (a1-a23-p<n>c1-<del>-…-<docka>, editor/rorelse.ts grundFor), en grundrörelse på prov
//     (prov-<grundrörelsen>-…) eller hela rundan (runda-c1-…-<docka>, med klipplistan runda-c1-<docka>.json);
//   - en beställning vars förlaga är en dockas film (reference.doll) är steget den beställer (step.edge, A2.3 → A3P4C1);
//   - ett steg med film i den äldre dealerns träd är den rörelse vars från och till steget är.
import {open, readFile, readdir} from 'node:fs/promises';
import type {IncomingMessage, ServerResponse} from 'node:http';
import path from 'node:path';
import {grundFor, vilanFor, type Standarddocka} from '../../standarddocka/editor/rorelse.ts';
import {nodeCode} from '../src/dealer-trees.ts';
import {ADRESSORD, UPPSATTNING, UPPSATTNINGAR, datatsUppsattning, dockansUppsattning, type UppsattningId} from '../src/uppsattning.ts';
import {
  ankareFor, dockNamn, kodAv, kortplatsOrd, platsAv, platsOchKort, rorelseFor, rundansVag,
  type Ankare, type Avvikelse, type Docka, type FilmRad, type FilmTal, type Katalog, type KatalogRorelse, type Post, type Schema, type Slag,
} from '../studio/lib/schemat.ts';

const CASINO = path.resolve(import.meta.dirname, '../..');
export const KALLOR = {
  katalog: 'standarddocka/rorelsekatalog.json',
  segment: 'live-bj/data/segment.json',
  data: 'blackjack-dealer/dealer3d/data',
  klipp: 'standarddocka/klipp',
  orders: 'blackjack-dealer/data/orders',
  plan: 'blackjack-dealer/placements/default.json',
  trad: 'blackjack-dealer/data/dealer-trees.json',
  dealers: 'blackjack-dealer/data/dealers.json',
} as const;

type Json = Record<string, unknown>;
const lasJson = async <T = Json>(casino: string, rel: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(casino, rel), 'utf8')) as T; } catch { return null; } };
const lista = async (casino: string, rel: string): Promise<string[]> => (await readdir(path.join(casino, rel)).catch(() => [] as string[])).sort();
const tal = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
/**
 * En rörelses huvud utan rutorna: fälten före "frames" (doll, to, made), läst ur filens början. En rörelse är hundratals kB
 * rutor, och schemat behöver bara huvudet; går början inte att läsa så läses hela filen.
 */
async function huvud<T = Json>(casino: string, rel: string): Promise<T | null> {
  let fh: Awaited<ReturnType<typeof open>> | null = null;
  try {
    fh = await open(path.join(casino, rel), 'r');
    const buf = Buffer.alloc(65536), {bytesRead} = await fh.read(buf, 0, buf.length, 0);
    const text = buf.subarray(0, bytesRead).toString('utf8'), at = text.search(/,\s*"frames"\s*:/);
    if (at > 0) try { return JSON.parse(`${text.slice(0, at)}}`) as T; } catch { /* läses hel nedan */ }
  } catch { return null; } finally { await fh?.close(); }
  return lasJson<T>(casino, rel);
}

// ── Livefilmen ──────────────────────────────────────────────────────────────
type Statistik = {n?: number; median?: number; p10?: number; p90?: number};
type SegKategori = {antal?: number; sekunder?: Statistik; per_plats?: Record<string, number>; per_kort?: Record<string, number>};
type SegDealer = {docka?: string; stil?: string; kategorier?: Record<string, SegKategori>} & Record<string, unknown>;
type Segment = {kategorier?: Record<string, {vad?: string}>; dealrar?: Record<string, SegDealer>};

const kvantil = (v: number[], q: number) => { const s = [...v].sort((a, b) => a - b); if (!s.length) return null; const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return Math.round((s[lo] + (s[hi] - s[lo]) * (i - lo)) * 100) / 100; };
const summa = (a: Record<string, number> | null, b: Record<string, number> | undefined) => { if (!b) return a; const out = {...(a ?? {})}; for (const [k, n] of Object.entries(b)) out[k] = (out[k] ?? 0) + n; return out; };

/**
 * Hur ofta ett segment finns i livefilmen per dealer: en kategori (GIV) per hand, med längden; "basta.<fält>" som ett mått över
 * de bästa styckena (bryggornas längd); ett annat fält som är en lista (ersattningar) som antalet gånger, med längden.
 */
export function filmTal(seg: Segment | null, segment: string): FilmTal[] {
  if (!seg?.dealrar) return [];
  return Object.entries(seg.dealrar).flatMap(([dealer, d]): FilmTal[] => {
    const docka = d.docka ?? dealer, namn = dockNamn(docka);
    if (seg.kategorier?.[segment]) {
      let perPlats: Record<string, number> | null = null, perKort: Record<string, number> | null = null;
      const rader: FilmRad[] = (['höger', 'vänster'] as const).flatMap(hand => {
        const k = d.kategorier?.[`${segment} ${hand}`];
        if (!k) return [];
        perPlats = summa(perPlats, k.per_plats); perKort = summa(perKort, k.per_kort);
        return [{vad: hand === 'höger' ? 'högern' : 'vänstern', antal: tal(k.antal), median: tal(k.sekunder?.median), p10: tal(k.sekunder?.p10), p90: tal(k.sekunder?.p90)}];
      });
      return [{dealer, docka, namn, rader, perPlats, perKort}];
    }
    const basta = /^basta\.(.+)$/.exec(segment);
    if (basta && Array.isArray(d.basta)) {
      const v = (d.basta as Json[]).map(b => tal(b[basta[1]])).filter((x): x is number => x !== null);
      return [{dealer, docka, namn, rader: [{vad: 'i de bästa styckena', antal: v.length, median: kvantil(v, 0.5), p10: kvantil(v, 0.1), p90: kvantil(v, 0.9)}], perPlats: null, perKort: null}];
    }
    const listan = d[segment];
    if (Array.isArray(listan)) {
      const v = (listan as Json[]).map(e => { const a = tal(e.fran_s), b = tal(e.till_s); return a !== null && b !== null ? b - a : null; }).filter((x): x is number => x !== null);
      return [{dealer, docka, namn, rader: [{vad: 'gånger', antal: listan.length, median: kvantil(v, 0.5), p10: kvantil(v, 0.1), p90: kvantil(v, 0.9)}], perPlats: null, perKort: null}];
    }
    return [];
  });
}

// ── Filerna ─────────────────────────────────────────────────────────────────
/** Ett mönster ur katalogen som ett uttryck: <docka> en av dockorna, <n> och <m> tal, <a|b> ett av orden, <ord> ett ord. */
export function filerRe(filer: string, dockor: readonly string[]): RegExp {
  const sett = new Set<string>(), grupp = (namn: string) => { const fri = !sett.has(namn); sett.add(namn); return fri ? `?<${namn}>` : '?:'; };
  const delar = filer.split(/(<[^>]+>)/).map(d => {
    if (!d.startsWith('<')) return d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const inne = d.slice(1, -1);
    if (inne === 'docka') return `(${grupp('docka')}${dockor.join('|')})`;
    if (inne === 'n' || inne === 'm') return `(${grupp(inne)}\\d+)`;
    if (inne.includes('|')) return `(${grupp('val')}${inne.split('|').map(x => x.replace(/[^a-z0-9-]/g, '')).join('|')})`;
    return '[a-z0-9]+';
  });
  return new RegExp(`^${delar.join('')}\\.json$`);
}
/** Kortplatsen i ett filnamn: p4c1 → P4.C1, d-c2 eller dc2 → D.C2. */
const platsIFil = (namn: string): string | null => {
  const p = /(?:^|-)p(\d+)c(\d+)(?:-|$)/.exec(namn); if (p) return `P${p[1]}.C${p[2]}`;
  const d = /(?:^|-)d-?c(\d+)(?:-|$)/.exec(namn); return d ? `D.C${d[1]}` : null;
};
/** Sidan Dockan för en grundrörelse: dockans bord, dockan, platsen, och grundrörelsen när den inte är platsens egen. */
function dockanFor(docka: string, fil: string, plats: string | null): string {
  const u = dockansUppsattning(docka) ?? 'live', q = new URLSearchParams({[ADRESSORD]: u, docka});
  const nr = plats ? platsOchKort(plats)?.plats : null, n = nr && /^\d+$/.test(nr) ? Number(nr) : null;
  if (u === 'forra') {
    const d = docka as Standarddocka;
    if (fil.startsWith('till-ankare-')) { if (vilanFor(d) !== fil) q.set('vilan', fil); }
    else if (n) { q.set('plats', String(n)); if (grundFor(d, n).giv !== fil) q.set('giv', fil); }
    else q.set('giv', fil);
  } else {
    if (n) q.set('plats', String(n));
    if (!(n && fil === `lyft-${docka}-p${n}`)) q.set('giv', fil);
  }
  return `/dockan/?${q}`;
}

type Fil = {namn: string; docka: string; rorelser: string[]; plats: string | null; slag: Slag; text: string; oppna: string; helaVagen?: boolean};

/** Det som finns för varje docka i dockans rörelser, klipp och beställningar, och filerna ingen rörelse är. */
async function dockornasFiler(casino: string, kat: Katalog, dockor: readonly string[]): Promise<{poster: Post[]; utanfor: Avvikelse[]; fel: string[]}> {
  const poster: Post[] = [], utanfor: Avvikelse[] = [], fel: string[] = [];
  const data = (await lista(casino, KALLOR.data)).filter(n => n.endsWith('.json'));
  const filer = new Map<string, Fil[]>();
  const lagg = (f: Fil) => filer.set(f.namn, [...(filer.get(f.namn) ?? []), f]);
  // Katalogens mönster.
  for (const r of kat.rorelser.filter(r => r.filer)) {
    const re = filerRe(r.filer!, dockor);
    const traffar = data.filter(n => re.test(n));
    if (!traffar.length) fel.push(`Mönstret för ${r.namn} (${r.id}) passar ingen fil.`);
    for (const n of traffar) {
      const namn = n.replace(/\.json$/, ''), m = re.exec(n)!.groups ?? {}, docka = m.docka, plats = platsIFil(namn);
      if (!docka) continue;
      const lyft = namn.startsWith('lyft-'), version = m.val && m.val.length === 1 ? `, version ${m.val.toUpperCase()}` : '';
      const redan = filer.get(namn)?.find(f => f.docka === docka);
      if (redan) { redan.rorelser.push(r.id); continue; }
      lagg({namn, docka, rorelser: [r.id], plats, slag: lyft ? 'lyft' : 'ritad', text: `${lyft ? 'lyft ur filmen' : 'ritad'}${plats ? `, ${kortplatsOrd(plats)}` : ''}${version}`, oppna: dockanFor(docka, namn, plats)});
    }
  }
  // Lyften som katalogen inte nämner: kortet i filen säger vilken giv.
  const lyften = data.filter(n => { const m = /^lyft-([a-z]+)-/.exec(n); return m && dockor.includes(m[1]) && !filer.has(n.replace(/\.json$/, '')); });
  const huvuden = new Map(await Promise.all(lyften.map(async n => [n, await huvud<{to?: unknown; doll?: unknown}>(casino, `${KALLOR.data}/${n}`)] as const)));
  for (const n of lyften) {
    const namn = n.replace(/\.json$/, ''), m = /^lyft-([a-z]+)-(.+)$/.exec(namn)!;
    const d = huvuden.get(n);
    const docka = typeof d?.doll === 'string' && dockor.includes(d.doll) ? d.doll : m[1];
    const kort = Array.isArray(d?.to) && typeof d.to[0] === 'string' ? d.to[0] : null, kod = kort ? kodAv(kort) : null;
    const kategori = kort ? (kort.startsWith('D.') ? 'GIV-EGET' : 'GIV') : 'VANTA';
    const r = kod ? rorelseFor(null, kod, kat.rorelser, kategori) : kat.rorelser.find(x => x.segment === kategori) ?? null;
    if (!r) { utanfor.push({slag: 'fil-utanfor', fil: `${KALLOR.data}/${n}`, text: `Ett lyft som ingen rörelse i schemat är (kategorin ${kategori}).`}); continue; }
    const forsok = kort && namn !== `lyft-${docka}-p${platsOchKort(kort)?.plats}` ? ' (ett försök till)' : '';
    const vantan = /vantan-(\d+)/.exec(namn);
    // Börjar och slutar lyftet i dockans vila (made.from och made.to), är vägen till skon och hem med i samma klipp.
    const made = (d as {made?: {from?: unknown; to?: unknown}} | null)?.made, vila = (x: unknown) => typeof x === 'string' && /ankare-vila-/.test(x);
    const hela = vila(made?.from) && vila(made?.to), fran = hela ? ', från vilan till vilan' : '';
    lagg({namn, docka, rorelser: [r.id], plats: kort, slag: 'lyft', text: kort ? `lyft ur filmen${fran}${forsok}` : `lyft ur filmen: väntan${vantan ? ` ${vantan[1]}` : ''}${fran}`, oppna: dockanFor(docka, namn, kort), ...(hela ? {helaVagen: true} : {})});
  }
  for (const list of filer.values()) for (const f of list) for (const r of f.rorelser) poster.push({docka: f.docka, rorelse: r, slag: f.slag, plats: f.plats, text: f.text, fil: `${KALLOR.data}/${f.namn}.json`, oppna: f.oppna, oppnaOrd: 'Öppna i Dockan', ...(f.helaVagen ? {helaVagen: true} : {})});
  // Filerna ingen rörelse är (ankarnas ställningar är inga rörelser).
  for (const n of data) {
    const namn = n.replace(/\.json$/, '');
    if (filer.has(namn) || namn.startsWith('ankare-') || utanfor.some(u => u.fil === `${KALLOR.data}/${n}`)) continue;
    utanfor.push({slag: 'fil-utanfor', fil: `${KALLOR.data}/${n}`, text: /-paow$/.test(namn) ? 'Den äldre dockans (Paow), inte i schemat.' : 'En rörelse som katalogen inte nämner.'});
  }

  // Editorns klipp: den rörelse varje klipp är inspelat av.
  const klipp = (await lista(casino, KALLOR.klipp)).filter(n => n.endsWith('.mp4'));
  const lyft = [...filer.values()].flat().filter(f => f.namn.startsWith('lyft-')).sort((a, b) => b.namn.length - a.namn.length);
  const allaFiler = [...filer.values()].flat().sort((a, b) => b.namn.length - a.namn.length);
  const rundor = new Map<string, string[]>();
  const sista = (namn: string) => namn.replace(/\.mp4$/, '').replace(/(?:-(?:nyckel|liv))+$/, '').split('-').at(-1) ?? '';
  const klippAv = new Map<string, {f: Fil; klipp: string[]}>();
  const av = (f: Fil, k: string) => { const key = `${f.namn}|${f.docka}`; const e = klippAv.get(key) ?? {f, klipp: []}; e.klipp.push(k); klippAv.set(key, e); };
  for (const k of klipp) {
    const bas = k.replace(/\.mp4$/, '');
    if (bas.startsWith('live-lyft-')) { const f = lyft.find(l => `lyft-${bas.slice('live-lyft-'.length)}`.startsWith(`${l.namn}-`)); if (f) av(f, k); continue; }
    if (bas.startsWith('live-sekvens-')) { const docka = sista(k); for (const f of lyft.filter(l => l.docka === docka)) { const del = f.namn.slice(`lyft-${docka}-`.length); if (bas.includes(`-${del}-`)) av(f, k); } continue; }
    const plats = /^a1-a23-p(\d+)c1-(.+)$/.exec(bas);
    if (plats) {
      const docka = sista(k); if (docka !== 'man' && docka !== 'kvinna') continue;
      const g = grundFor(docka, Number(plats[1])), del = plats[2];
      const namn = [...(del.startsWith('given') || del.startsWith('hela') ? [g.giv] : []), ...(del.startsWith('vilan') || del.startsWith('hela') ? [g.vila] : [])];
      for (const nm of namn) for (const f of filer.get(nm) ?? []) if (f.docka === docka) av(f, k);
      continue;
    }
    if (bas.startsWith('prov-')) { for (const f of allaFiler) if (bas.startsWith(`prov-${f.namn}-`) || bas.includes(`-${f.namn}-`)) av(f, k); continue; }
    if (bas.startsWith('runda-')) {
      const docka = sista(k); if (!dockor.includes(docka)) continue;
      if (!rundor.has(docka)) rundor.set(docka, ((await lasJson<{klipp?: {grund?: unknown}[]}>(casino, `${KALLOR.klipp}/runda-c1-${docka}.json`))?.klipp ?? []).flatMap(x => (typeof x.grund === 'string' ? [x.grund] : [])));
      for (const nm of rundor.get(docka)!) for (const f of filer.get(nm) ?? []) if (f.docka === docka) av(f, k);
    }
  }
  for (const {f, klipp: ks} of klippAv.values()) for (const r of f.rorelser)
    poster.push({docka: f.docka, rorelse: r, slag: 'klipp', plats: f.plats, text: `inspelat i dockans editor${f.plats ? `, ${kortplatsOrd(f.plats)}` : ''} (${ks.length} klipp)`, fil: `${KALLOR.klipp}/${ks[0]}`, oppna: f.oppna, oppnaOrd: 'Öppna i Dockan', ...(f.helaVagen ? {helaVagen: true} : {})});

  // Beställningarna med en dockas film som förlaga.
  type Order = {status?: unknown; step?: {edge?: unknown}; reference?: {doll?: unknown}};
  const orders = await Promise.all((await lista(casino, KALLOR.orders)).filter(x => x.endsWith('.json')).map(async n => [n, await lasJson<Order>(casino, `${KALLOR.orders}/${n}`)] as const));
  for (const [n, o] of orders) {
    const docka = o?.reference?.doll, edge = o?.step?.edge;
    if (typeof docka !== 'string' || !dockor.includes(docka) || typeof edge !== 'string' || !edge.includes('>')) continue;
    const [a, b] = edge.split('>').map(x => nodeCode(x)), r = rorelseFor(a, b, kat.rorelser);
    if (!r) continue;
    poster.push({docka, rorelse: r.id, slag: 'film', plats: platsAv(b) ?? platsAv(a), text: `beställd film${typeof o?.status === 'string' ? ` (${o.status.toLowerCase()})` : ''}`, fil: `${KALLOR.orders}/${n}`, oppna: null, oppnaOrd: null});
  }
  return {poster, utanfor, fel};
}

// ── Den äldre dealerns träd ─────────────────────────────────────────────────
type TradSvar = {trees: {tree: {id: string; name: string; state?: string; uppsattning?: unknown}; steps: {id: string; from: string; to: string; edge: string; state: string; ids: string[]}[]}[]};
/** Stegen med film i en dealers träd som rörelser i schemat, och stegen som ingen rörelse är. */
async function tradensFilmer(dealer: string, kat: Katalog, svar?: TradSvar): Promise<{poster: Post[]; utanfor: Schema['utanforSchemat']; uppsattning: UppsattningId}> {
  const answer = svar ?? (await (await import('./dealer-tree.ts')).treeAnswer(dealer)) as unknown as TradSvar;
  const poster: Post[] = [], utanfor: Schema['utanforSchemat'] = [];
  for (const v of answer.trees) for (const s of v.steps.filter(x => x.state === 'finns')) {
    const a = nodeCode(s.from), b = nodeCode(s.to), r = rorelseFor(a, b, kat.rorelser), n = s.ids.length;
    if (!r) { utanfor.push({docka: dealer, fran: a, till: b, filmer: n, trad: v.tree.name}); continue; }
    const q = new URLSearchParams({dealer, vy: 'trad', trad: v.tree.id, steg: s.id, kant: s.edge});
    poster.push({docka: dealer, rorelse: r.id, slag: 'film', plats: platsAv(b) ?? platsAv(a), text: `${n === 1 ? 'film' : `${n} filmer`} i trädet ${v.tree.name}${v.tree.state ? ` (${v.tree.state})` : ''}`, fil: null, oppna: `/karta/?${q}`, oppnaOrd: 'Öppna i Karta'});
  }
  return {poster, utanfor, uppsattning: datatsUppsattning(answer.trees[0]?.tree.uppsattning)};
}

// ── Schemat ─────────────────────────────────────────────────────────────────
export type Val = {casino?: string; trad?: boolean | Record<string, TradSvar>};
/** Schemat som studion ritar det, läst nu. trad: false läser inga träd (ett prov utan registren), ett objekt ger dem färdiga. */
export async function schema(val: Val = {}): Promise<Schema> {
  const casino = val.casino ?? CASINO;
  const kat = await lasJson<Katalog>(casino, KALLOR.katalog);
  if (!kat) throw Error('Rörelseschemat kunde inte läsas.');
  const seg = await lasJson<Segment>(casino, KALLOR.segment);
  const fel: string[] = [];

  // Ankarena: katalogens, och de en rörelse eller ett stadium nämner som inget ankare är.
  const ankare: Ankare[] = kat.ankare.map(a => ({...a}));
  const okant = (id: string, vem: string) => { if (ankareFor(id, ankare)) return; fel.push(`${vem} nämner ${id}, som inget ankare är.`); ankare.push({id, namn: id, status: 'saknas', okand: true}); };
  for (const r of kat.rorelser) { okant(r.fran, `${r.namn} (${r.id})`); okant(r.till, `${r.namn} (${r.id})`); }
  for (const s of kat.stadier) okant(s.hem, `Stadiet ${s.namn} (${s.id})`);
  for (const r of kat.rorelser) if (!kat.stadier.some(s => s.id === r.stadium)) fel.push(`${r.namn} (${r.id}) hör till stadiet ${r.stadium}, som inte finns.`);
  const rorelser = kat.rorelser.map(r => ({...r, franAnkare: ankareFor(r.fran, ankare), tillAnkare: ankareFor(r.till, ankare), kategori: (r.segment && seg?.kategorier?.[r.segment]?.vad) || null}));

  // Dockorna och deras bords kortplatser (källan: src/uppsattning.ts), och den äldre dealern med filmer i ett träd.
  const plan = await lasJson(casino, KALLOR.plan);
  const platserAv = (u: UppsattningId): Docka['platser'] => {
    try { return UPPSATTNING[u].kortplatser({plan: plan as never}).flatMap(p => { const pk = platsOchKort(p.id); return pk ? [{id: p.id, ...pk, x: p.at[0], z: p.at[2], vinkel: p.heading}] : []; }); }
    catch { fel.push(`${UPPSATTNING[u].namn}: kortplatserna kunde inte läsas.`); return []; }
  };
  const dockor: Docka[] = UPPSATTNINGAR.flatMap(u => UPPSATTNING[u].dockor.map(id => ({id, namn: dockNamn(id), slag: 'docka' as const, uppsattning: u, bord: UPPSATTNING[u].namn, platser: platserAv(u)})));
  const ids = dockor.map(d => d.id);
  // Träden läses medan filerna läses.
  const traden = async () => {
    if (val.trad === false) return [];
    const reg = await lasJson<{dealers?: Record<string, unknown>}>(casino, KALLOR.trad);
    const namn = new Map(((await lasJson<{dealers?: {id: string; name?: string}[]}>(casino, KALLOR.dealers))?.dealers ?? []).map(d => [d.id, d.name ?? d.id]));
    return Promise.all(Object.keys(reg?.dealers ?? {}).map(async dealer => {
      try { return {dealer, namn: namn.get(dealer) ?? dockNamn(dealer), t: await tradensFilmer(dealer, kat, typeof val.trad === 'object' ? val.trad[dealer] : undefined)}; }
      catch (e) { return {dealer, namn: namn.get(dealer) ?? dockNamn(dealer), fel: (e as Error).message}; }
    }));
  };
  const [{poster, utanfor, fel: filfel}, trad] = await Promise.all([dockornasFiler(casino, kat, ids), traden()]);
  fel.push(...filfel);

  const utanforSchemat: Schema['utanforSchemat'] = [];
  for (const x of trad) {
    if ('fel' in x) { fel.push(`Träden för ${x.namn} kunde inte läsas: ${x.fel}`); continue; }
    const t = x.t!;
    if (!t.poster.length && !t.utanfor.length) continue;
    dockor.push({id: x.dealer, namn: x.namn, slag: 'dealer', uppsattning: t.uppsattning, bord: UPPSATTNING[t.uppsattning].namn, platser: platserAv(t.uppsattning)});
    poster.push(...t.poster); utanforSchemat.push(...t.utanfor);
  }

  // Livefilmens tal för varje segment som schemat nämner.
  const segment = new Set([...kat.rorelser, ...kat.bryggor, ...kat.harmas_inte].flatMap(x => (x.segment ? [x.segment] : [])));
  const filmen = Object.fromEntries([...segment].map(s => [s, filmTal(seg, s)]));

  // Rundan som en väg ur katalogens ord.
  const vag = rundansVag(kat.begrepp?.schemat);
  const runda = vag.length > 1 ? {text: vag.join(' - '), steg: vag.map(kod => ({kod, ankare: ankareFor(kod, ankare)})), rorelser: vag.slice(1).map((b, i) => rorelseFor(vag[i], b, kat.rorelser)?.id ?? null)} : null;
  if (runda) runda.rorelser.forEach((r, i) => { if (!r) fel.push(`Rundan: ingen rörelse går från ${vag[i]} till ${vag[i + 1]}.`); });

  // Det katalogen säger som inte stämmer med filerna.
  const avvikelser: Avvikelse[] = [];
  const finnsFor = (r: KatalogRorelse) => poster.filter(p => p.rorelse === r.id);
  for (const r of kat.rorelser) {
    const ps = finnsFor(r);
    if (r.status === 'finns' && !ps.length) avvikelser.push({slag: 'finns-utan-filer', rorelse: r.id, text: `${r.namn} (${r.id}) står som finns, men ingen docka har den.`});
    if ((r.status === 'saknas' || r.status === 'förslag') && ps.length) {
      const vem = [...new Set(ps.map(p => p.docka))].map(d => `${dockor.find(x => x.id === d)?.namn ?? d} (${[...new Set(ps.filter(p => p.docka === d).map(p => p.slag))].join(', ')})`);
      avvikelser.push({slag: 'filer-men-saknas', rorelse: r.id, text: `${r.namn} (${r.id}) står som ${r.status}, men finns för ${vem.join(', ')}.`});
    }
  }
  avvikelser.push(...utanfor);

  return {
    gjord: new Date().toISOString(), om: kat.om, begrepp: kat.begrepp ?? {}, ankare, lagen: kat.lagen ?? [],
    stadier: kat.stadier.map(s => ({...s, rorelser: kat.rorelser.filter(r => r.stadium === s.id).map(r => r.id)})),
    rorelser, bryggor: kat.bryggor ?? [], harmasInte: kat.harmas_inte ?? [], dockor, poster, filmen, utanforSchemat, runda, fel, avvikelser,
  };
}

const json = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}).end(JSON.stringify(body)); };

/** Schemats väg; true när adressen var den. */
export async function handleSchema(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  if (url.pathname !== '/api/schema') return false;
  if (req.method !== 'GET') { res.writeHead(405).end(); return true; }
  try { json(res, 200, await schema()); } catch (error) { json(res, 500, {error: (error as Error).message}); }
  return true;
}
