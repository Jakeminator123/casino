// Karta, Schemat (studions sida /studio/karta/?vy=schema, studio/components/schemat/): rörelseschemat ur
// ../standarddocka/rorelsekatalog.json, med det som finns för standardens dockor (src/standard.ts dockor: Danilo och
// Frasse vid livebordet). Vägen i tools/preview.ts:
//   GET /api/schema   ankarena, stadierna och rörelserna; för varje docka bordets kortplatser och det som finns per rörelse och
//                     plats (lyft, inspelat i dockans editor, beställd film) med sidan i Dockan där det öppnas; hur ofta
//                     varje rörelse finns i livefilmen (../live-bj/data/segment.json); rundan som en väg med Dockans adress för
//                     hela rundan; och det katalogen säger som inte stämmer med filerna (fel, avvikelser: för agenterna, inte
//                     för sidan).
//   node tools/schema-routes.ts   skriver ut felen och avvikelserna.
// Läser varje gång: katalogen, segment.json, dockans rörelser (dealer3d/data/, bara huvudet före rutorna), editorns klipp
// (../standarddocka/klipp/, bara namnen) och beställningarna (data/orders/); kortplatserna är livebordets (src/standard.ts).
// Lagrar ingenting och skriver ingenting. De rena reglerna (vilket ankare ett id menar, vilken rörelse ett steg är, orden) står
// i studio/lib/schemat.ts. Provet: tools/schema-routes.test.ts.
//
// Vilken rörelse en fil är: den katalogen säger. Fältet lyfta på en rörelse eller ett ankare namnger filerna (lyft-danilo-p4);
// platsen är filens kort (to: P4.C1), annars namnets (p4c1). Ett inspelat klipp är den rörelse det är inspelat av (live-lyft-<lyftet>-…, live-sekvens-<delarna>-…). En
// beställning vars förlaga är en dockas film (reference.doll) är steget den beställer (step.edge, A2.3 → A3P4C1).
import {open, readFile, readdir} from 'node:fs/promises';
import type {IncomingMessage, ServerResponse} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {nodeCode} from '../src/dealer-trees.ts';
import {STANDARD} from '../src/standard.ts';
import {
  ankareFor, dockNamn, kodAv, kortplatsOrd, platsAv, platsOchKort, rorelseFor, rundansVag,
  type Ankare, type Avvikelse, type Docka, type FilmRad, type FilmTal, type Katalog, type Post, type Schema, type Slag,
} from '../studio/lib/schemat.ts';

const CASINO = path.resolve(import.meta.dirname, '../..');
export const KALLOR = {
  katalog: 'standarddocka/rorelsekatalog.json',
  segment: 'live-bj/data/segment.json',
  data: 'blackjack-dealer/dealer3d/data',
  klipp: 'standarddocka/klipp',
  orders: 'blackjack-dealer/data/orders',
} as const;

type Json = Record<string, unknown>;
const lasJson = async <T = Json>(casino: string, rel: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(casino, rel), 'utf8')) as T; } catch { return null; } };
const lista = async (casino: string, rel: string): Promise<string[]> => (await readdir(path.join(casino, rel)).catch(() => [] as string[])).sort();
const tal = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
/**
 * En rörelses huvud utan rutorna: fälten före "frames" (doll, to, made), läst ur filens början. En rörelse är hundratals kB
 * rutor, och schemat behöver bara huvudet; går början inte att läsa så läses hela filen. null: filen finns inte.
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

/** Kortplatsen i ett filnamn: p4c1 → P4.C1, d-c2 eller dc2 → D.C2. */
const platsIFil = (namn: string): string | null => {
  const p = /(?:^|-)p(\d+)c(\d+)(?:-|$)/.exec(namn); if (p) return `P${p[1]}.C${p[2]}`;
  const d = /(?:^|-)d-?c(\d+)(?:-|$)/.exec(namn); return d ? `D.C${d[1]}` : null;
};
/** Sidan Dockan för en rörelse: dockan, platsen, och rörelsen när den inte är platsens egen (lyft-<docka>-p<n>). */
export function dockanFor(docka: string, fil: string, plats: string | null): string {
  const q = new URLSearchParams({docka});
  const nr = plats ? platsOchKort(plats)?.plats : null;
  if (nr && /^\d+$/.test(nr)) q.set('plats', nr);
  if (fil !== `lyft-${docka}-p${nr}`) q.set('giv', fil);
  return `/dockan/?${q}`;
}

type Fil = {namn: string; docka: string; rorelser: string[]; plats: string | null; slag: Slag; text: string};

/** Det som finns för varje docka: katalogens filer, editorns klipp av dem och beställningarna; och filerna katalogen inte nämner. */
async function dockornasFiler(casino: string, kat: Katalog, dockor: readonly string[]): Promise<{poster: Post[]; ankaren: Schema['ankaren']; utanfor: Avvikelse[]; fel: string[]}> {
  const poster: Post[] = [], utanfor: Avvikelse[] = [], fel: string[] = [], ankaren: Schema['ankaren'] = [];
  const data = new Set((await lista(casino, KALLOR.data)).filter(n => n.endsWith('.json')));
  const filer = new Map<string, Fil>();
  type Huvud = {to?: unknown; doll?: unknown};
  const huvuden = new Map<string, Huvud | null>();
  const las = async (namn: string) => { if (!huvuden.has(namn)) huvuden.set(namn, await huvud<Huvud>(casino, `${KALLOR.data}/${namn}.json`)); return huvuden.get(namn) ?? null; };
  const dockaAv = (namn: string, h: Huvud | null) => (typeof h?.doll === 'string' ? h.doll : /^[a-z]+-([a-z]+)-/.exec(namn)?.[1] ?? '');
  const kortAv = (namn: string, h: Huvud | null) => (Array.isArray(h?.to) && typeof h.to[0] === 'string' ? h.to[0] : platsIFil(namn));
  const lagg = async (namn: string, rorelse: string, slag: Slag, text: (plats: string | null) => string) => {
    const redan = filer.get(namn);
    if (redan) { if (!redan.rorelser.includes(rorelse)) redan.rorelser.push(rorelse); return; }
    const h = await las(namn), docka = dockaAv(namn, h);
    if (!dockor.includes(docka)) return;
    const plats = kortAv(namn, h);
    filer.set(namn, {namn, docka, rorelser: [rorelse], plats, slag, text: text(plats)});
  };
  // Katalogens namn på lyften (fältet lyfta).
  for (const r of kat.rorelser) {
    for (const namn of r.lyfta ?? []) {
      if (!data.has(`${namn}.json`)) { fel.push(`${r.namn} nämner ${namn}, som inte finns bland dockans rörelser.`); continue; }
      await lagg(namn, r.id, 'lyft', plats => `lyft${plats ? `, ${kortplatsOrd(plats)}` : ''}`);
    }
  }
  for (const f of filer.values()) for (const r of f.rorelser) poster.push({docka: f.docka, rorelse: r, slag: f.slag, plats: f.plats, text: f.text, fil: `${KALLOR.data}/${f.namn}.json`, oppna: dockanFor(f.docka, f.namn, f.plats), oppnaOrd: 'Öppna i Dockan'});
  // Dockans ställning på ett ankare.
  for (const a of kat.ankare) for (const namn of a.lyfta ?? []) {
    if (!data.has(`${namn}.json`)) { fel.push(`Ankaret ${a.namn} nämner ${namn}, som inte finns bland dockans rörelser.`); continue; }
    const docka = dockaAv(namn, await las(namn));
    if (dockor.includes(docka)) ankaren.push({docka, ankare: a.id, fil: `${KALLOR.data}/${namn}.json`});
  }
  // Filerna katalogen inte nämner.
  const namnda = new Set([...filer.keys(), ...kat.ankare.flatMap(a => a.lyfta ?? [])]);
  for (const n of data) if (!namnda.has(n.replace(/\.json$/, ''))) utanfor.push({slag: 'fil-utanfor', fil: `${KALLOR.data}/${n}`, text: 'En fil som katalogen inte nämner.'});

  // Editorns klipp: den rörelse varje klipp är inspelat av (lyften, längsta namnet först).
  const lyften = [...filer.values()].filter(f => f.namn.startsWith('lyft-')).sort((a, b) => b.namn.length - a.namn.length);
  const klippAv = new Map<string, string[]>();
  const av = (f: Fil, k: string) => klippAv.set(f.namn, [...(klippAv.get(f.namn) ?? []), k]);
  for (const k of (await lista(casino, KALLOR.klipp)).filter(n => n.endsWith('.mp4'))) {
    const bas = k.replace(/\.mp4$/, '');
    if (bas.startsWith('live-lyft-')) { const f = lyften.find(l => `lyft-${bas.slice('live-lyft-'.length)}`.startsWith(`${l.namn}-`)); if (f) av(f, k); }
    else if (bas.startsWith('live-sekvens-')) {
      const docka = bas.replace(/(?:-(?:nyckel|liv))+$/, '').split('-').at(-1) ?? '';
      for (const f of lyften.filter(l => l.docka === docka)) if (bas.includes(`-${f.namn.slice(`lyft-${docka}-`.length)}-`)) av(f, k);
    }
  }
  for (const [namn, ks] of klippAv) { const f = filer.get(namn)!; for (const r of f.rorelser) poster.push({docka: f.docka, rorelse: r, slag: 'klipp', plats: f.plats, text: `${ks.length} klipp`, fil: `${KALLOR.klipp}/${ks[0]}`, oppna: dockanFor(f.docka, f.namn, f.plats), oppnaOrd: 'Öppna i Dockan'}); }

  // Beställningarna med en dockas film som förlaga.
  type Order = {status?: unknown; step?: {edge?: unknown}; reference?: {doll?: unknown}};
  const orders = await Promise.all((await lista(casino, KALLOR.orders)).filter(x => x.endsWith('.json')).map(async n => [n, await lasJson<Order>(casino, `${KALLOR.orders}/${n}`)] as const));
  for (const [n, o] of orders) {
    const docka = o?.reference?.doll, edge = o?.step?.edge;
    if (typeof docka !== 'string' || !dockor.includes(docka) || typeof edge !== 'string' || !edge.includes('>')) continue;
    const [a, b] = edge.split('>').map(x => nodeCode(x)), r = rorelseFor(a, b, kat.rorelser);
    if (r) poster.push({docka, rorelse: r.id, slag: 'film', plats: platsAv(b) ?? platsAv(a), text: `beställd film${typeof o?.status === 'string' ? `, ${o.status.toLowerCase()}` : ''}`, fil: `${KALLOR.orders}/${n}`, oppna: null, oppnaOrd: null});
  }
  return {poster, ankaren, utanfor, fel};
}

// ── Schemat ─────────────────────────────────────────────────────────────────
/** Schemat som studion ritar det, läst nu ur katalogen och filerna under casino (förval: repots rot). */
export async function schema(casino = CASINO): Promise<Schema> {
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

  // Dockorna: de vid standardens bord, med bordets kortplatser (källan: src/standard.ts).
  const platser: Docka['platser'] = STANDARD.kortplatser().flatMap(p => { const pk = platsOchKort(p.id); return pk ? [{id: p.id, ...pk, x: p.at[0], z: p.at[2], vinkel: p.heading}] : []; });
  const dockor: Docka[] = STANDARD.dockor.map(id => ({id, namn: dockNamn(id), bord: STANDARD.namn, platser}));
  const {poster, ankaren, utanfor, fel: filfel} = await dockornasFiler(casino, kat, dockor.map(d => d.id));
  fel.push(...filfel);

  // Livefilmens tal för varje rörelses segment.
  const segment = new Set(kat.rorelser.flatMap(x => (x.segment ? [x.segment] : [])));
  const filmen = Object.fromEntries([...segment].map(s => [s, filmTal(seg, s)]));

  // Rundan som en väg ur katalogens ord, och för varje docka Dockans adress som spelar hela rundan (?sekvens= med dockans lyft).
  const vag = rundansVag(kat.begrepp?.schemat);
  let runda: Schema['runda'] = null;
  if (vag.length > 1) {
    const steg = vag.slice(1).map((b, i) => ({a: vag[i], b, r: rorelseFor(vag[i], b, kat.rorelser)}));
    for (const s of steg) if (!s.r) fel.push(`Rundan: ingen rörelse går från ${s.a} till ${s.b}.`);
    const sekvens = Object.fromEntries(dockor.map(d => {
      const delar: string[] = [];
      for (const s of steg) {
        const plats = platsAv(s.b) ?? platsAv(s.a);
        const p = poster.find(x => x.docka === d.id && x.slag === 'lyft' && x.rorelse === s.r?.id && (!plats || x.plats === plats));
        const namn = p?.fil ? path.basename(p.fil, '.json') : null;
        if (!namn?.startsWith(`lyft-${d.id}-`)) return [d.id, null];
        const del = namn.slice(`lyft-${d.id}-`.length);
        if (delar.at(-1) !== del) delar.push(del);
      }
      return [d.id, `/dockan/?${new URLSearchParams({docka: d.id, sekvens: delar.join(',')})}`];
    }));
    runda = {text: vag.join(' - '), steg: vag.map(kod => ({kod, ankare: ankareFor(kod, ankare)})), rorelser: steg.map(s => s.r?.id ?? null), sekvens};
  }

  // Det katalogen säger som inte stämmer med filerna.
  const avvikelser: Avvikelse[] = [];
  for (const r of kat.rorelser) {
    const ps = poster.filter(p => p.rorelse === r.id);
    if (r.status === 'finns' && !ps.length) avvikelser.push({slag: 'finns-utan-filer', rorelse: r.id, text: `${r.namn} (${r.id}) står som finns, men ingen docka har den.`});
    if ((r.status === 'saknas' || r.status === 'förslag') && ps.length) {
      const vem = [...new Set(ps.map(p => p.docka))].map(d => `${dockNamn(d)} (${[...new Set(ps.filter(p => p.docka === d).map(p => p.slag))].join(', ')})`);
      avvikelser.push({slag: 'filer-men-saknas', rorelse: r.id, text: `${r.namn} (${r.id}) står som ${r.status}, men finns för ${vem.join(', ')}.`});
    }
  }
  avvikelser.push(...utanfor);

  return {
    gjord: new Date().toISOString(), begrepp: kat.begrepp ?? {}, ankare, lagen: kat.lagen ?? [],
    stadier: kat.stadier.map(s => ({...s, rorelser: kat.rorelser.filter(r => r.stadium === s.id).map(r => r.id)})),
    rorelser, dockor, poster, ankaren, filmen, runda, fel, avvikelser,
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

// node tools/schema-routes.ts: felen och det katalogen säger som inte stämmer med filerna, för agenterna.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = await schema();
  console.log(s.fel.length ? `Fel (${s.fel.length}):\n${s.fel.map(f => `  ${f}`).join('\n')}` : 'Inga fel.');
  const said = s.avvikelser.filter(a => a.slag !== 'fil-utanfor'), files = s.avvikelser.filter(a => a.slag === 'fil-utanfor');
  if (said.length) console.log(`Katalogen mot filerna (${said.length}):\n${said.map(a => `  ${a.text}`).join('\n')}`);
  if (files.length) console.log(`Filer i ${KALLOR.data} som katalogen inte nämner (${files.length}):\n${files.map(a => `  ${path.basename(a.fil!)}`).join('\n')}`);
}
