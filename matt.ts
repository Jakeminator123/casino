// Måtten på ett ställe (Jakob 2026-11-27: "en fil i typ roten på casino. Där ska vi skriva alla vinklar och lutningar,
// storlekar och annat i någon form av matris"). MATT.md är en utskrift av måtten där de redan står: spelets kod,
// Blenders standard, dockans rörelser, Jakobs domar och livebordets mätningar. Den är ingen ny källa: ett mått ändras
// där kolumnen Källa säger, och sedan skrivs MATT.md om. Talen läses som kod där det går (importerade); bara det som
// inte exporteras eller inte går att importera i Node tolkas ur text. Listan Källorna sist i MATT.md säger vilket.
// Inget här mäter något nytt: det som räknas (avstånd, vinklar, farter) räknas ur talen i källorna.
//   node matt.ts            skriver MATT.md
//   node matt.ts --kolla    skriver inget; slutar med kod 1 och visar raderna om MATT.md inte stämmer med källorna
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CARD, DOLL_TABLE, FILM, PLAY_LENS, SHOE, TABLE_BASE, TABLE_LENS, TABLE_RAIL, TABLE_TOP, TRAY, dollShoe, filmEye, seatView, see, shoePose, type ShoePose, type Vec3} from './blackjack-dealer/src/table-lens.ts';
import {ASSUMED, dealerEdge, spots, type Spot} from './blackjack-dealer/dealer3d/src/world.ts';
import {DOLLS, dollCardYaw, dollFrame, type Doll} from './blackjack-dealer/dealer3d/src/doll.ts';

const ROOT = import.meta.dirname, UT = path.join(ROOT, 'MATT.md'), KOLLA = process.argv.includes('--kolla');
const DEG = 180 / Math.PI;

// ---- källorna ---------------------------------------------------------------------------------------------------
type Kalla = {fil: string; hur: string; ok: boolean; varfor?: string};
const kallor: Kalla[] = [
  {fil: 'blackjack-dealer/src/table-lens.ts', hur: 'kod', ok: true},
  {fil: 'blackjack-dealer/dealer3d/src/world.ts', hur: 'kod', ok: true},
  {fil: 'blackjack-dealer/dealer3d/src/doll.ts', hur: 'kod', ok: true},
];
const saknas: string[] = [];
const las = (rel: string): string | null => { try { return readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return null; } };
const lastData = new Map<string, any>();
function data(rel: string, hur = 'data'): any {
  if (lastData.has(rel)) return lastData.get(rel);
  const t = las(rel); let v: any = null;
  if (t === null) kallor.push({fil: rel, hur, ok: false, varfor: 'filen finns inte'});
  else try { v = JSON.parse(t); kallor.push({fil: rel, hur, ok: true}); } catch { kallor.push({fil: rel, hur, ok: false, varfor: 'går inte att läsa som JSON'}); }
  lastData.set(rel, v); return v;
}
async function kod(rel: string): Promise<any> {
  try { const mod = await import(pathToFileURL(path.join(ROOT, rel)).href); kallor.push({fil: rel, hur: 'kod', ok: true}); return mod; }
  catch (e) { kallor.push({fil: rel, hur: 'kod', ok: false, varfor: String(e).split('\n')[0]}); return null; }
}
/** Ett objekt skrivet i koden (`const NAMN = {...};`) som JSON, för det som inte exporteras; null om det inte går. */
function somJson(lit: string): any {
  const j = lit.replace(/\s+as\s+\[[^\]]*\]/g, '').replace(/\s+as\s+[A-Za-z_]\w*/g, '').replace(/'([^']*)'/g, '"$1"')
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":').replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(j); } catch { return null; }
}
const objektUrText = (src: string | null, namn: string) => { const m = src && new RegExp(`const\\s+${namn}\\s*=\\s*(\\{[\\s\\S]*?\\});`).exec(src); return m ? somJson(m[1]) : null; };
/** Ett värde ur JSON längs en väg av nycklar; ett objekt med median ger medianen. */
const g = (o: any, p: string): any => p.split('.').reduce((v, k) => v == null ? undefined : v[k], o);
const md = (o: any, p: string): number | undefined => { const v = g(o, p); return typeof v === 'number' ? v : typeof v?.median === 'number' ? v.median : typeof v?.best?.median === 'number' ? v.best.median : undefined; };
/** Den första av vägarna som finns i någon av filerna (ett mått som har bytt namn läses under båda). */
const forst = (o: any[], ...p: string[]) => p.find(x => o.some(y => g(y, x) !== undefined)) ?? p[0];
/** Ett mått ur en stil-fil som cell: medianen, och där filen har det det minsta och största (at_least–at_most). */
const livecell = (o: any, p: string, f: (n: number) => string) => { const v = md(o, p), r = g(o, p); return !ok(v) ? '—' : `${f(v)}${ok(r?.at_least) && ok(r?.at_most) ? ` (${tal(r.at_least, 2)}–${tal(r.at_most, 2)})` : ''}`; };

// ---- hur talen skrivs ---------------------------------------------------------------------------------------------
type Tal = number | null | undefined;
const ok = (x: Tal): x is number => typeof x === 'number' && Number.isFinite(x);
function tal(x: number, d: number): string {
  let s = x.toFixed(d); if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s.replace('.', ',').replace(/^-/, '−');
}
const m = (x: number, d = 3) => `${tal(x, d)} m`, cm = (x: number, d = 1) => `${tal(x * 100, d)} cm`, mm = (x: number, d = 1) => `${tal(x * 1000, d)} mm`;
const gr = (x: number, d = 1) => `${tal(x, d)}°`, sek = (x: number, d = 2) => `${tal(x, d)} s`, ms = (x: number, d = 2) => `${tal(x, d)} m/s`;
const visa = (x: Tal, f: (n: number) => string) => ok(x) ? f(x) : '—';
/** Vårt minus livebordets (eller dockan minus de riktiga dealrarnas medel), och i procent av det senare där det är en storlek. */
function skillnad(a: Tal, b: Tal, f: (n: number) => string, procent = true): string {
  if (!ok(a) || !ok(b)) return '—';
  const d = a - b, t = d > 0 ? '+' : d < 0 ? '−' : '±';
  return `${t}${f(Math.abs(d))}${procent && b > 0 ? ` (${t}${tal(Math.abs(d / b) * 100, 0)} %)` : ''}`;
}
const medel = (...x: Tal[]) => { const v = x.filter(ok); return v.length ? v.reduce((s, y) => s + y, 0) / v.length : undefined; };
const k = (fil: string, namn = '') => `\`${fil}${namn ? ' ' + namn : ''}\``;
const cell = (c: string) => c.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
const tabell = (huvud: string[], rader: string[][]) => [huvud, huvud.map(() => '---'), ...rader].map(r => `| ${r.map(cell).join(' | ')} |`).join('\n');
const form = (w: number, h: number) => `${w} × ${h} bildpunkter (${tal(w / h, 2)} : 1)`;
const sidled = (focalPx: number, bredd: number) => 2 * Math.atan(bredd / 2 / focalPx) * DEG;

// ---- Jakobs domar: citerade ur standarddocka/DOMAR.md, så att en dom som har ändrats syns -------------------------
const DOMTEXT = (las('standarddocka/DOMAR.md') ?? '').replace(/\s+/g, ' ');
kallor.push({fil: 'standarddocka/DOMAR.md', hur: 'text (bara citaten i kolumnen Jakobs dom)', ok: DOMTEXT.length > 0});
const dom = (datum: string, citat: string, sa = '') => DOMTEXT.includes(citat.replace(/\s+/g, ' '))
  ? `"${citat}"${sa ? (/^[;:,]/.test(sa) ? '' : ' ') + sa : ''} (${datum})` : `(${datum}: citatet "${citat}" står inte längre i DOMAR.md)`;
const DOM = {
  spelvy: dom('2026-11-26', 'Jag tror jag gillar denna kameravinkel som standard faktiskt!', 'om den lägre kameran'),
  filmvy: dom('utan datum', 'inte naturlig utifrån att man skulle spela i casinot', 'om inspelningens kamera'),
  halvmane: dom('2026-11-26', 'mer som en halvmåne', '; halvmånen Bra, det 1,15 m djupa Inte bra'),
  skon: dom('2026-11-26', 'aningen längre bort från dealern', 'om skon'),
  bricka: dom('utan datum', 'Chipbrickan ska också vara så långt in mot dealern', ': brickan är bordets kant'),
  kort: dom('2026-11-26', 'Våra kort som används i \'standarddocka\'-mappens editor är det som ska användas som standard'),
  vanda: dom('2026-11-26', 'fyrkanter som pekar mot respektive stol', '(en fråga, inte en dom än)'),
  sitthojd: dom('2026-11-26', 'dockan sitter med axlarna 31 cm över filten', '(23 och 27 cm Inte bra)'),
  takt: dom('2026-11-27', 'Att ge ett kort ska ta 1.2 sek och återgången 0.8'),
  vila: dom('2026-11-26', 'A1 - A2.3 ska ta 1 sekund ungefär'),
  mote: dom('2026-11-26', 'mötas mer i mitten av bordet'),
  ab: dom('2026-11-26', 'Superbra, 5/5 för båda', 'om A och B'),
  handled: dom('utan datum', 'hela handleden ska vridas i maxläge som är onaturligt', '(med de vända platserna högst 36°, DOMAR.md 2026-11-26)'),
  vandning: dom('2026-11-26', 'vänder över kortet cirka 100 grader'),
};

// ---- det som läses -------------------------------------------------------------------------------------------------
const kant = dealerEdge(TABLE_LENS), tillKant = Math.hypot(kant[0], kant[2]); // kamerans fot står i (0, 0), spelets kant mot dealern i `kant`
const dockKant = tillKant + DOLL_TABLE.edgeBack;
const MAN = DOLLS.man as Doll | undefined, KVINNA = DOLLS.kvinna as Doll | undefined, PAOW = DOLLS.paow as Doll | undefined, VIT = DOLLS.standard as Doll | undefined;
const bakom = (d: Doll) => d.place.kind === 'film' ? ASSUMED.shouldersBehindEdge : d.place.behindEdge;
const plan = data('blackjack-dealer/placements/default.json');
const platser: Spot[] = plan ? spots(plan, TABLE_LENS) : [];
const yaml = lasYaml('avatar-auto-pipeline/scen/standard.yaml');
const byggBord = las('avatar-auto-pipeline/scen/bygg_bord.py');
const geometri = await kod('blackjack-dealer/src/scene3d-geometry.ts');
const koreoFil = 'blackjack-dealer/dealer3d/src/koreo-giv.ts', koreoSrc = las(koreoFil), koreo = await kod(koreoFil);
const KOREO: any = koreo?.KOREO ?? objektUrText(koreoSrc, 'KOREO'), ENSAM: any = koreo?.ENSAM ?? objektUrText(koreoSrc, 'ENSAM');
if (!koreo && KOREO) kallor.push({fil: koreoFil, hur: 'text (KOREO och ENSAM, när importen föll)', ok: true});
const VERSIONER = [...(koreoSrc ?? '').matchAll(/const\s+KOREO_([A-Z0-9]+)\s*=\s*(\{[^;]*\});/g)].map(x => ({namn: x[1], andrar: somJson(x[2]) as Record<string, unknown> | null, text: x[2]}));
const RAK = /const RAK = (\d+(?:\.\d+)?), RAK_H = (\d+(?:\.\d+)?)/.exec(koreoSrc ?? '');
kallor.push({fil: koreoFil, hur: 'text (KOREO_B och de andra versionerna, RAK och RAK_H: de exporteras inte)', ok: VERSIONER.length > 0 || !!RAK});
const rorelseFil = 'standarddocka/editor/rorelse.ts', rorelse = await kod(rorelseFil);
const TAKT: number[] | null = rorelse?.STANDARDTAKT ?? (/STANDARDTAKT = \[([^\]]*)\]/.exec(las(rorelseFil) ?? '')?.[1].split(',').map(Number) ?? null);
const RUNDLIV: any = rorelse?.RUNDLIV ?? null, BLINK: any = rorelse?.BLINK ?? null;
const DATA = 'blackjack-dealer/dealer3d/data/';
const givA = (d: string) => data(`${DATA}giv-fran-2-3-p4c1-ren-a-${d}.json`), tillSkon = (d: string) => data(`${DATA}till-ankare-2-3-${d}.json`);
// Livebordet: skrivet av en annan chatt (live-bj/); läses om det finns, och är preliminärt tills filen själv säger att kameran är bekräftad.
const scen = data('live-bj/data/scen.json'), stilA = data('live-bj/data/stil-kameran.json'), stilB = data('live-bj/data/stil-bordet.json');
const bekraftad = (o: any): boolean => !!o && typeof o === 'object' && Object.entries(o).some(([n, v]) => (/confirm|bekr/i.test(n) && v === true) || bekraftad(v));
const LIVE = scen ? (bekraftad(scen.camera) ? 'Livebordet (mätt på film)' : 'Livebordet (mätt på film, preliminärt)') : 'Livebordet';
const LIVE_A = 'Dealer A, ser i kameran', LIVE_B = 'Dealer B, ser på bordet';
if (!scen) saknas.push('Livebordets bord och kamera: `live-bj/data/scen.json` finns inte eller går inte att läsa, så kolumnen för livebordet är tom.');
if (!stilA || !stilB) saknas.push('De riktiga dealrarnas takt och rörelser: `live-bj/data/stil-kameran.json` eller `stil-bordet.json` finns inte eller går inte att läsa, så deras kolumner är tomma.');

/** standard.yaml rad för rad: varje nyckel med sitt värde och sin kommentar ("källa: ..." eller "antaget: ..."). */
function lasYaml(rel: string): Map<string, {v: any; om: string}> {
  const t = las(rel), ut = new Map<string, {v: any; om: string}>(), stack: {ind: number; namn: string}[] = [];
  kallor.push({fil: rel, hur: 'text (rad för rad: det antagna och det som bara Blender har)', ok: t !== null});
  for (const rad of (t ?? '').split(/\r?\n/)) {
    const x = /^(\s*)([\w.]+):\s*(.*?)\s*(?:#\s*(.*))?$/.exec(rad); if (!x || /^\s*#/.test(rad)) continue;
    const ind = x[1].length; while (stack.length && stack[stack.length - 1].ind >= ind) stack.pop();
    const nyckel = [...stack.map(s => s.namn), x[2]].join('.');
    if (x[3] === '') { stack.push({ind, namn: x[2]}); continue; }
    let v: any = x[3]; try { v = JSON.parse(x[3]); } catch { /* text */ }
    ut.set(nyckel, {v, om: x[4] ?? ''});
  }
  return ut;
}
const Y = (n: string): any => yaml.get(n)?.v;
const antaget = (n: string) => /^antaget/.test(yaml.get(n)?.om ?? '') ? 'antaget' : '';

// ==== 1. Kamerorna ==================================================================================================
const ut: string[] = [];
const rubrik = (s: string) => ut.push('', s, '');
ut.push('# Måtten: vårt bord, våra dockor och livebordet', '',
  'Alla mått på ett ställe: kamerorna, bordet och det som står på det, dockorna och rörelserna, och bredvid dem ett riktigt livebord och två riktiga dealrar mätta på film.',
  '',
  '**Den här filen ändras aldrig för hand.** Den skrivs av `node matt.ts` (från repots rot) ur måttens egna källor, och skrivs över nästa gång. `node matt.ts --kolla` säger om den inte längre stämmer med källorna. Ett mått ändras på riktigt där kolumnen Källa säger (oftast `blackjack-dealer/src/table-lens.ts`, se Källorna sist), och sedan körs `node matt.ts` igen. Jakobs domar står i `standarddocka/DOMAR.md`; kolumnen Jakobs dom citerar dem och är aldrig källan till ett tal.',
  '',
  `Så läses talen: meter, centimeter, millimeter, grader och sekunder. "Åt sidan" är åt dealerns vänster (bildens höger) med plus, räknat från bordets mitt. "Från kanten" är från bordets kant mot dealern, ut mot spelarna. Skillnad är vårt minus livebordets (i rörelserna dockan minus de två dealrarnas medel), och i procent av det senare. Livebordets tal är mätta av en annan chatt på en film av ett riktigt bord (\`live-bj/\`)${LIVE.includes('preliminärt') ? ' och är preliminära: kameran är inte bekräftad än' : ''}.`);

rubrik('## 1. Kamerorna');
const axlarSpel = [MAN, KVINNA].filter((d): d is Doll => !!d), axlarTal = [...new Set(axlarSpel.map(d => tillKant + bakom(d)))];
const kamRader: string[][] = [];
const linsRad = (namn: string, l: typeof PLAY_LENS, kanten: string, axlar: string, kalla: string, d: string) => [namn, m(l.height), gr(l.pitch * DEG, 2), gr(sidled(l.focalPx, FILM.width)), gr(sidled(l.focalPx, FILM.height)), form(FILM.width, FILM.height), `${tal(l.focalPx, 1)} bildpunkter på ${FILM.width}`, kanten, axlar, kalla, d];
kamRader.push(linsRad('Spelets vy (plats 4): standarddockans filmer', PLAY_LENS, `${m(dockKant)} till dockans bord (${m(tillKant)} till spelets kant)`,
  axlarTal.length ? `${axlarTal.map(x => m(x)).join(' / ')} (mannen och kvinnan)` : '—', `${k('table-lens.ts', 'PLAY_LENS')}; kanten ${k('world.ts', 'dealerEdge')}, ${k('table-lens.ts', 'DOLL_TABLE.edgeBack')}; axlarna ${k('doll.ts', 'MAN/KVINNA.place.behindEdge')}`, DOM.spelvy));
kamRader.push(linsRad('Inspelningens kamera: bankens filmer (Paow)', TABLE_LENS, `${m(tillKant)} till filmernas bord`, PAOW ? `${m(tillKant + bakom(PAOW))} (Paow)` : '—', `${k('table-lens.ts', 'TABLE_LENS')}; ${k('world.ts', 'dealerEdge')}; ${k('doll.ts', 'PAOW.place.behindEdge')}`, DOM.filmvy));
const sida = sidokamera();
if (sida) kamRader.push(['Från sidan (editorn, dealerns högra sida)', m(sida.hojd), gr(sida.lut, 2), gr(sida.sid, 2), gr(sida.hoj, 2), `${form(FILM.width, FILM.height)}, nästan utan perspektiv`, '—', `${m(sida.kant, 2)} åt sidan`, `${m(sida.axlar, 2)}`, `${k('standarddocka/editor/scen.ts', "kameraVy('sida'), SIDA")} (tolkad ur text)`, '']);
else saknas.push('Sidokameran: talen i `standarddocka/editor/scen.ts` (kameraVy, \'sida\') gick inte att läsa ur texten.');
const C = scen?.camera, P = scen?.picture, T = scen?.table;
const liveSid = ok(C?.fovDeg?.horizontal) ? C.fovDeg.horizontal : ok(C?.focalPx) && ok(P?.width) ? sidled(C.focalPx, P.width) : undefined;
const liveHoj = ok(C?.fovDeg?.vertical) ? C.fovDeg.vertical : ok(C?.focalPx) && ok(P?.height) ? sidled(C.focalPx, P.height) : undefined;
const pm = (x: Tal, sd: Tal, f: (n: number) => string, d: number) => ok(x) ? `${f(x)}${ok(sd) ? ` (±${tal(sd, d)})` : ''}` : '—';
kamRader.push([LIVE, pm(C?.heightM, C?.spread?.heightM, m, 3), pm(C?.tiltDeg, C?.spread?.tiltDeg, x => gr(x, 2), 2), visa(liveSid, gr), visa(liveHoj, gr), ok(P?.width) ? form(P.width, P.height) : '—',
  ok(C?.focalPx) ? `${tal(C.focalPx, 1)} bildpunkter på ${P?.width}` : '—', visa(T?.dealerEdgeM, x => `${m(x, 3)} till livebordets kant`), '— (inte mätt)', k('live-bj/data/scen.json', 'camera, picture, table.dealerEdgeM'), '']);
kamRader.push(['Skillnad: spelets vy − livebordet', skillnad(PLAY_LENS.height, C?.heightM, m), skillnad(PLAY_LENS.pitch * DEG, C?.tiltDeg, gr), skillnad(sidled(PLAY_LENS.focalPx, FILM.width), liveSid, gr),
  skillnad(sidled(PLAY_LENS.focalPx, FILM.height), liveHoj, gr), ok(P?.width) ? `${tal(FILM.width / FILM.height, 2)} mot ${tal(P.width / P.height, 2)}` : '—', '—', skillnad(dockKant, T?.dealerEdgeM, m), '—', '', '']);
ut.push('Höjden är över filten och avstånden längs filten från kamerans fot (punkten rakt under den). Bildvinkeln är hela bildens, kant till kant. Brännvidden står i bildpunkter, eftersom det är så den är mätt.', '',
  tabell(['Kamera', 'Höjd över filten', 'Lutning nedåt', 'Bildvinkel i sidled', 'Bildvinkel i höjdled', 'Bildens form', 'Brännvidd', 'Till bordets kant mot dealern', 'Till dealerns axlar', 'Källa', 'Jakobs dom'], kamRader));

// De sju platsernas kameror: spelets vy flyttad till varje plats (seatView), lika hög och lika brant.
const spelOga = filmEye(PLAY_LENS), fyra = platser.find(s => s.id === 'P4.C1'), platsRader: string[][] = [];
for (let p = 1; p <= 7; p++) {
  const egen = platser.find(s => s.id === `P${p}.C1`); if (!egen || !fyra) continue;
  const e = p === 4 ? spelOga : seatView(spelOga, egen.at, fyra.at, kant);
  platsRader.push([String(p), m(e.position[0], 3), m(Math.hypot(e.position[0] - kant[0], e.position[2] - kant[2]), 3), gr(Math.atan2(e.forward[0], -e.forward[2]) * DEG), m(e.position[1], 3), gr(Math.asin(-e.forward[1]) * DEG, 2)]);
}
if (platsRader.length) ut.push('', 'De sju platsernas kameror är spelets vy flyttad till varje plats: lika hög och lika brant, och vriden runt bordet så att spelarens eget första kort hamnar på samma ställe i bilden (`table-lens.ts seatView`, platsernas kort ur `placements/default.json`). "Vriden" är hur mycket kameran är vriden från rakt fram mot dealern, plus mot bildens höger (dealerns vänster).', '',
  tabell(['Plats', 'Står åt sidan', 'Till kantens mitt (spelets kant)', 'Vriden', 'Höjd över filten', 'Lutning nedåt'], platsRader));

/** Editorns kamera från sidan, ur texten i scen.ts (filen importerar three.js och går inte att importera i Node). */
function sidokamera() {
  const src = las('standarddocka/editor/scen.ts'); if (!src) return null;
  const s = /const SIDA = \{bredd: ([\d.]+), langre: ([\d.]+)\}/.exec(src), x = /k === 'sida'\) \{ const golv = ([\d.]+), mot: V3 = \[([^\]]+)\], fran: V3 = \[([^\]]+)\]/.exec(src);
  if (!s || !x) return null;
  kallor.push({fil: 'standarddocka/editor/scen.ts', hur: 'text (sidokameran: filen importerar three.js)', ok: true});
  const golv = Number(x[1]), rakna = (e: string) => [...e.replace(/golv/g, String(golv)).replace(/\bz\b/g, '0').matchAll(/([+-]?)\s*(\d+(?:\.\d+)?)/g)].reduce((a, y) => a + (y[1] === '-' ? -1 : 1) * Number(y[2]), 0);
  const mot = x[2].split(',').map(rakna), fran = x[3].split(',').map(rakna), d = fran.map((v, i) => (v - mot[i]) * Number(s[2])), pos = mot.map((v, i) => v + d[i]), avst = Math.hypot(...d);
  const axlar = MAN ? dollFrame(TABLE_LENS, MAN).shoulders : null, axMitt = axlar ? [(axlar[0][0] + axlar[1][0]) / 2, (axlar[0][2] + axlar[1][2]) / 2 - kant[2]] : [0, -0.38];
  return {hojd: pos[1], lut: Math.atan2(pos[1] - mot[1], Math.hypot(d[0], d[2])) * DEG, sid: 2 * Math.atan(Number(s[1]) / 2 / avst) * DEG, hoj: 2 * Math.atan(Number(s[1]) / (FILM.width / FILM.height) / 2 / avst) * DEG,
    kant: Math.hypot(pos[0], pos[2]), axlar: Math.hypot(pos[0] - axMitt[0], pos[2] - axMitt[1])};
}

// ==== 2. Bordet och det som står på det ==========================================================================
rubrik('## 2. Bordet och det som står på det');
const bord: string[][] = [], r = (sak: string, matt: string, vart: string, live: string, skill: string, kalla: string, d = '') => bord.push([sak, matt, vart, live, skill, kalla, d]);
const halvcirkel = Math.abs(DOLL_TABLE.depth - TABLE_TOP.halfWidth) < 1e-9;
r('Filten (dockans bord)', 'djup, från kanten till spelarnas kant', m(DOLL_TABLE.depth), visa(T?.depthM, m), skillnad(DOLL_TABLE.depth, T?.depthM, m), `${k('table-lens.ts', 'DOLL_TABLE.depth')}; ${k('scen.json', 'table.depthM')}`, DOM.halvmane);
r('', 'bredd längs kanten mot dealern', m(2 * TABLE_TOP.halfWidth), visa(T?.widthAtDealerEdgeM, m), skillnad(2 * TABLE_TOP.halfWidth, T?.widthAtDealerEdgeM, m), `${k('table-lens.ts', 'TABLE_TOP.halfWidth')} × 2; ${k('scen.json', 'table.widthAtDealerEdgeM')}`);
r('', 'bredast', m(2 * TABLE_TOP.halfWidth), visa(T?.widestM, m), skillnad(2 * TABLE_TOP.halfWidth, T?.widestM, m), `${k('table-lens.ts', 'TABLE_TOP.halfWidth')} × 2; ${k('scen.json', 'table.widestM')}`);
r('', 'form', halvcirkel ? `en halvcirkel med rak kant mot dealern, radie ${m(TABLE_TOP.halfWidth)}` : `en halv oval, ${m(TABLE_TOP.halfWidth)} åt var sida och ${m(DOLL_TABLE.depth)} djup`,
  ok(T?.arc?.radiusM) ? `en båge med radie ${m(T.arc.radiusM)}, mitten ${cm(T.arc.centreBehindDealerEdgeM)} bakom kanten (avviker ${mm(T.arc.rmsM)})` : '—', skillnad(TABLE_TOP.halfWidth, T?.arc?.radiusM, m), `${k('table-lens.ts', 'DOLL_TABLE, TABLE_TOP')}; ${k('scen.json', 'table.arc')}`);
r('', 'spelarnas kant från kamerans fot', m(dockKant - DOLL_TABLE.depth), visa(T?.feltFrontFromCameraM, m), skillnad(dockKant - DOLL_TABLE.depth, T?.feltFrontFromCameraM, m), `${k('world.ts', 'dealerEdge')} och ${k('table-lens.ts', 'DOLL_TABLE')}; ${k('scen.json', 'table.feltFrontFromCameraM')}`);
r('', 'sargen (läderrullen) utanför filten', cm(TABLE_TOP.rail), '— (sargen står upp från filten och är bara mätt i bildpunkter)', '—', k('table-lens.ts', 'TABLE_TOP.rail'));
r('Filmernas bord', 'djup (gäller filmerna som finns)', m(TABLE_TOP.depth), '', '', k('table-lens.ts', 'TABLE_TOP.depth'), DOM.halvmane);
r('Kanten mot dealern', 'dockans bords kant bakom spelets kant', cm(DOLL_TABLE.edgeBack), '', '', k('table-lens.ts', 'DOLL_TABLE.edgeBack'), DOM.bricka);
r('Markerbrickan', 'bredd längs kanten', `${m(TRAY.x1 - TRAY.x0, 2)}, från ${m(TRAY.x0, 2)} till ${m(TRAY.x1, 2)} åt sidan`, '— (inte mätt)', '—', k('table-lens.ts', 'TRAY.x0, x1'), DOM.bricka);
r('', 'djup mot spelarna, och hur djupt den är försänkt', `${cm(TRAY.s1 - TRAY.s0)} från kanten; ${cm(TRAY.depth)} ned`, '— (inte mätt)', '—', k('table-lens.ts', 'TRAY.s0, s1, depth'));
if (ok(Y('markerbricka.chip_radie'))) r('', 'fack och marker', `${Y('markerbricka.ror')} fack; marker ${mm(2 * Y('markerbricka.chip_radie'))} i diameter och ${mm(Y('markerbricka.chip_hojd'), 2)} tjocka`, '', '', `${k('standard.yaml', 'markerbricka.ror, chip_radie, chip_hojd')} (ur spelets game3d-tray.ts och game3d-chips.ts)`);
// Skon: filmernas och dockans bords. Mynningen är plattans fot mitt i skon, där kortet kommer ut.
const poseF = shoePose(TABLE_LENS, SHOE), poseD = shoePose(TABLE_LENS, dollShoe(TABLE_LENS));
const mynning = (p: ShoePose): Vec3 => [p.front[0] + p.far[0] * SHOE.width / 2, 0, p.front[2] + p.far[2] * SHOE.width / 2];
const fran = (p: Vec3, bak: number) => p[2] - kant[2] + bak, skoVinkel = (p: ShoePose) => Math.atan2(-p.back[2], p.back[0]) * DEG;
const sko = scen?.things?.sko, fot: number[][] | undefined = Array.isArray(sko?.footMetres) && sko.footMetres.length >= 3 ? sko.footMetres : undefined;
const liveSkoVinkel = fot ? Math.atan2(fot[2][1] - fot[1][1], fot[2][0] - fot[1][0]) * DEG : undefined;
const mun: number[][] | undefined = Array.isArray(sko?.mouthMetres) && sko.mouthMetres.length ? sko.mouthMetres : undefined;
const munMitt = mun ? [mun.reduce((s, q) => s + q[0], 0) / mun.length, mun.reduce((s, q) => s + q[1], 0) / mun.length] : undefined;
const munFran = munMitt && ok(T?.dealerEdgeM) ? T.dealerEdgeM - munMitt[1] : undefined;
const myD = mynning(poseD), myF = mynning(poseF);
r('Skon', 'längd', m(SHOE.length), visa(sko?.footLength, m), skillnad(SHOE.length, sko?.footLength, m), `${k('table-lens.ts', 'SHOE.length')}; ${k('scen.json', 'things.sko.footLength')} (foten på filten)`);
r('', 'bredd', m(SHOE.width), visa(sko?.footWidth, m), skillnad(SHOE.width, sko?.footWidth, m), `${k('table-lens.ts', 'SHOE.width')}; ${k('scen.json', 'things.sko.footWidth')}`);
r('', 'höjd bak och fram', `${m(SHOE.backHeight)} och ${m(SHOE.frontHeight)}`, '— (bara i bildpunkter)', '—', k('table-lens.ts', 'SHOE.backHeight, frontHeight'));
r('', 'frontplattans lutning mot filten', gr(SHOE.plateLean * DEG), '— (bara i bildpunkter)', '—', k('table-lens.ts', 'SHOE.plateLean'));
r('', 'kortet i fönstret, underkanten över filten', mm(SHOE.windowLift, 0), '—', '—', k('table-lens.ts', 'SHOE.windowLift'));
r('', 'vinkel mot kanten (bakänden vriden mot dealern)', gr(skoVinkel(poseD)), visa(liveSkoVinkel, gr), skillnad(skoVinkel(poseD), liveSkoVinkel, gr), `${k('table-lens.ts', 'shoePose(TABLE_LENS).back')}; ${k('scen.json', 'things.sko.footMetres')} (den främre och den bakre hörnan mot spelarna)`);
r('', 'mynningens mitt åt sidan', `${m(myD[0])} (filmernas sko ${m(myF[0])})`, visa(munMitt?.[0], m), skillnad(myD[0], munMitt?.[0], m), `${k('table-lens.ts', 'dollShoe, shoePose')}; ${k('scen.json', 'things.sko.mouthMetres')} (medel)`, DOM.skon);
r('', 'mynningens mitt från kanten', `${m(fran(myD, DOLL_TABLE.edgeBack))} från dockans bords kant (filmernas sko ${m(fran(myF, 0))} från spelets kant)`, visa(munFran, m), skillnad(fran(myD, DOLL_TABLE.edgeBack), munFran, m), `${k('table-lens.ts', 'dollShoe, DOLL_TABLE.edgeBack')}; ${k('scen.json', 'table.dealerEdgeM, things.sko.mouthMetres')}`);
r('', 'flyttad på dockans bord', `${cm(DOLL_TABLE.shoeOut)} ut längs sin längd och ${cm(DOLL_TABLE.shoeForward)} mot spelarna: ${cm(Math.hypot(myD[0] - myF[0], myD[2] - myF[2]))} från filmernas`, '', '', k('table-lens.ts', 'DOLL_TABLE.shoeOut, shoeForward'), DOM.skon);
const front = byggBord ? /SKO_FRONT = dict\(([\s\S]*?)\n\)/.exec(byggBord) : null, sf: Record<string, number> = {};
for (const x of (front?.[1] ?? '').matchAll(/(\w+)=([\d.]+),/g)) sf[x[1]] = Number(x[2]);
const vagg = byggBord ? /\bwt = ([\d.]+)/.exec(byggBord) : null;
kallor.push({fil: 'avatar-auto-pipeline/scen/bygg_bord.py', hur: 'text (SKO_FRONT och skons väggar: står bara där)', ok: Object.keys(sf).length > 0});
if (ok(sf.ub)) r('', 'frontplattan i Blender: öppningen för fingret', `${tal(2 * sf.ub, 0)} mm bred nedtill, ${tal(2 * sf.ur, 0)} mm i bågen, upp till ${tal(sf.us, 0)} mm uppför plattan`, '—', '—', `${k('bygg_bord.py', 'SKO_FRONT.ub, ur, us')} (tolkad ur text)`);
if (ok(sf.s0)) r('', 'frontplattan i Blender: nederkant och tjocklek', `nederkanten ${tal(sf.s0, 0)} mm uppför plattan (${mm(sf.s0 / 1000 * Math.sin(SHOE.plateLean), 0)} över filten); plattan ${tal(sf.n1 - sf.n0, 1)} mm tjock`, '—', '—', `${k('bygg_bord.py', 'SKO_FRONT.s0, n0, n1')} (tolkad ur text)`);
if (vagg) r('', 'väggarna i Blender', mm(Number(vagg[1]), 0), '—', '—', `${k('bygg_bord.py', 'wt')} (tolkad ur text)`);
// Kortet.
const kortStorlek = scen?.camera?.cardSize, storlekar = kortStorlek ? Object.entries(kortStorlek).map(([n, v]) => ({n, v: v as number, mat: /([\d.]+) x ([\d.]+) mm/.exec(n)})).filter(x => x.mat) : [];
const bast = storlekar.slice().sort((a, b) => a.v - b.v)[0];
const bastB = bast ? Number(bast.mat![1]) / 1000 : undefined, bastH = bast ? Number(bast.mat![2]) / 1000 : undefined;
const kortLive = bast ? `passar bäst: ${bast.n.replace(/\./g, ',').replace(' x ', ' × ')} (fel ${tal(bast.v, 2)} bildpunkter${storlekar.filter(x => x !== bast).map(x => `; ${x.n.replace(/\./g, ',').replace(' x ', ' × ')}: ${tal(x.v, 2)}`).join('')})` : '—';
r('Kortet', 'bredd × höjd', `${mm(CARD.width, 1)} × ${mm(CARD.height, 1)}`, kortLive, bastB ? `${skillnad(CARD.width, bastB, mm, false)} × ${skillnad(CARD.height, bastH, mm, false)}` : '—', `${k('table-lens.ts', 'CARD')}; ${k('scen.json', 'camera.cardSize')}`, DOM.kort);
if (ok(kortStorlek?.['widthWhenFree mm'])) r('', 'bredd när måttet får vara fritt', '', `${tal(kortStorlek['widthWhenFree mm'], 1)} mm (±${tal(kortStorlek['widthWhenFreeSd mm'] ?? NaN, 2)})`, skillnad(CARD.width * 1000, kortStorlek['widthWhenFree mm'], x => `${tal(x, 1)} mm`, false), k('scen.json', "camera.cardSize['widthWhenFree mm']"));
r('', 'tjocklek och hörnradie', `${mm(CARD.thickness, 1)}; hörnen ${mm(CARD.corner, 1)}`, '—', '—', k('table-lens.ts', 'CARD.thickness, corner'));
r('Korten i skon', 'lutning mot filten', `${gr(SHOE.plateLean * DEG)}: de ligger mot frontplattan och lutar som den`, '— (inte mätt)', '—', `${k('table-lens.ts', 'SHOE.plateLean, shoeCard')}; Blender lägger dem så (${k('bygg_bord.py', 'step')})`);
if (ok(Y('kort.lekar_i_skon'))) r('', 'kortbunten', `${Y('kort.lekar_i_skon')} lekar`, '—', '—', k('standard.yaml', 'kort.lekar_i_skon'), '');
if (bord[bord.length - 1][2].includes('lekar') && antaget('kort.lekar_i_skon')) bord[bord.length - 1][2] += ' (antaget)';
const BET = geometri?.BET;
if (ok(BET?.radius)) r('Insatsringarna', 'radie, och ringens mitt framför kortets mitt', `${mm(BET.radius, 0)}; ${mm(CARD.height / 2 + BET.radius + BET.clear, 0)} framför (halva kortet, ringens radie och ${mm(BET.clear, 0)} filt)`, '— (inte mätt)', '—', k('scene3d-geometry.ts', 'BET, ringOffset'));
if (ok(Y('kort.markering.marginal'))) r('Kortplatsernas ram', 'marginal runt kortet och linjens bredd', `${mm(Y('kort.markering.marginal'), 0)}; ${mm(Y('kort.markering.linjebredd'), 0)} (antaget)`, '— (inte mätt)', '—', k('standard.yaml', 'kort.markering'));
const kass = Y('kassering.yttermatt'), box = scen?.things?.slaskbox;
const boxMitt = Array.isArray(box?.footMetres) && box.footMetres.length ? box.footMetres.reduce((s: number, q: number[]) => s + q[0], 0) / box.footMetres.length : undefined;
if (Array.isArray(kass)) r('Lådan för använda kort', 'fotens mått, höjden', `${m(kass[0])} × ${m(kass[1])}, ${m(kass[2])} hög (antaget)`, ok(box?.footWidth) ? `${m(box.footWidth)} × ${m(box.footDepth)} (foten)` : '—', skillnad(kass[0], box?.footWidth, m), `${k('standard.yaml', 'kassering.yttermatt')}; ${k('scen.json', 'things.slaskbox.footWidth, footDepth')}`);
const kassX = Y('kassering.fot_mitt')?.[0];
if (ok(kassX)) r('', 'mitten åt sidan', `${m(kassX)} (antaget, speglad mot skon)`, visa(boxMitt, m), skillnad(kassX, boxMitt, m), `${k('standard.yaml', 'kassering.fot_mitt')}; ${k('scen.json', 'things.slaskbox.footMetres')} (medel)`);
// Höjderna från golvet. Golvet står i standarden (TABLE_BASE.floor, som dockans rum och Blender bygger på), men 3D-scenens
// rum och sal har ett eget golv (const FLOOR, exporteras inte): båda skrivs.
const GOLV = -TABLE_BASE.floor, INTE = 'syns inte i bilden, inte mätt';
const andraGolv = ['blackjack-dealer/src/scene3d-room.ts', 'blackjack-dealer/src/scene3d-hall.ts'].map(f => ({f, x: /const FLOOR = (-?\d+(?:\.\d+)?)/.exec(las(f) ?? '')})).filter(y => y.x).map(y => ({f: y.f, golv: -Number(y.x![1])}));
kallor.push({fil: 'blackjack-dealer/src/scene3d-room.ts, scene3d-hall.ts', hur: 'text (FLOOR: exporteras inte)', ok: andraGolv.length > 0});
const yamlFilt = Y('filt_z'), olikaGolv = andraGolv.filter(y => Math.abs(y.golv - GOLV) > 1e-9);
r('Höjder från golvet', 'filten över golvet', `${m(GOLV, 2)}${ok(yamlFilt) ? (Math.abs(yamlFilt - GOLV) < 1e-9 ? ' (Blenders standard.yaml: samma)' : `; Blenders standard.yaml säger ${m(yamlFilt, 2)}`) : ''}${olikaGolv.length ? `. Två källor säger olika: ${[...new Set(olikaGolv.map(y => y.golv))].map(v => `3D-scenens ${olikaGolv.filter(y => y.golv === v).map(y => y.f.endsWith('hall.ts') ? 'sal' : 'rum').join(' och ')} har golvet ${m(v, 2)} under filten`).join('; ')}` : ''}`, INTE, '—',
  `${k('table-lens.ts', 'TABLE_BASE.floor')}; ${k('standard.yaml', 'filt_z')}${andraGolv.length ? `; ${andraGolv.map(y => k(path.basename(y.f), 'FLOOR')).join(', ')} (tolkade ur text)` : ''}`);
r('', 'bordsskivans undersida över golvet', m(GOLV + TABLE_BASE.under, 2), INTE, '—', k('table-lens.ts', 'TABLE_BASE.under, floor'));
r('', 'rullens (sargens) överkant över golvet', `${m(GOLV + TABLE_RAIL.lift + TABLE_RAIL.above)} (${mm(TABLE_RAIL.lift + TABLE_RAIL.above, 0)} över filten)`, INTE, '—', k('table-lens.ts', 'TABLE_RAIL.lift, above; TABLE_BASE.floor'));
r('', 'stolens sits över golvet', `${ok(Y('stol.sits_z')) ? `${m(Y('stol.sits_z'), 2)} (antaget, för den vita dockan) i Blenders standard.yaml; ` : ''}dockans rum sätter stolen under hennes lår när bilden ritas, inget fast tal`, INTE, '—', `${k('standard.yaml', 'stol.sits_z')}; ${k('dealer3d/src/standard-room.ts', 'STOOL, seatStool')}`);
r('', 'spelets kamera över golvet', `${m(GOLV + PLAY_LENS.height, 2)}${olikaGolv.length ? ` (${[...new Set(olikaGolv.map(y => m(y.golv + PLAY_LENS.height, 2)))].join(' / ')} med 3D-scenens golv)` : ''}`, INTE, '—', k('table-lens.ts', 'PLAY_LENS.height, TABLE_BASE.floor'));
r('', 'inspelningens kamera över golvet', m(GOLV + TABLE_LENS.height, 2), INTE, '—', k('table-lens.ts', 'TABLE_LENS.height, TABLE_BASE.floor'));
ut.push(tabell(['Sak', 'Mått', 'Vårt (standarden)', LIVE, 'Skillnad', 'Källa', 'Jakobs dom'], bord));

// ==== 3. Var korten hamnar ==========================================================================================
// En rad per kortplats i Jakobs kortplan: läget på filten, vridningen, och bildpunkten genom spelets vy och genom
// inspelningens kamera, räknade ur kamerorna i koden (see och filmEye i table-lens.ts), så att de följer med när en vy ändras.
rubrik('## 3. Var korten hamnar');
const marken: number[][] | undefined = Array.isArray(scen?.seatsUiM) ? scen.seatsUiM : undefined, kortRader: string[][] = [];
const spelBild = filmEye(PLAY_LENS), filmBild = filmEye(TABLE_LENS);
const bp = (q: {x: number; y: number} | null) => !q ? '— (bakom kameran)' : `${tal(q.x, 1)}; ${tal(q.y, 1)}${q.x < 0 || q.x > FILM.width - 1 || q.y < 0 || q.y > FILM.height - 1 ? ' (utanför bilden)' : ''}`;
for (const sp of platser) {
  const geo = plan.targets[sp.id]?.geometry, s = sp.at[2] - kant[2], fd = s + DOLL_TABLE.edgeBack, radie = Math.hypot(sp.at[0] - kant[0], fd);
  const nr = /^P(\d)\.C1$/.exec(sp.id), lm = nr && marken ? marken[Number(nr[1]) - 1] : undefined;
  const lf = lm && ok(T?.dealerEdgeM) ? T.dealerEdgeM - lm[1] : undefined, lr = lm && ok(lf) ? Math.hypot(lm[0], lf) : undefined;
  const filmVrid = geo?.native?.angle, dockVrid = dollCardYaw(sp.id, sp.at, TABLE_LENS) * DEG;
  kortRader.push([sp.id, m(sp.at[0]), m(sp.at[2]), `${m(s)} / ${m(fd)}`, m(radie), `${visa(filmVrid, gr)} (mobilen ${visa(geo?.portrait?.angle, gr)})`,
    ok(filmVrid) && Math.abs(dockVrid - filmVrid) < 0.05 ? 'samma' : gr(dockVrid), bp(see(spelBild, sp.at)), bp(see(filmBild, sp.at)), lm ? `${m(lm[0])}; ${visa(lf, m)}` : '', lm ? skillnad(radie, lr, m) : '']);
}
if (kortRader.length) ut.push(`Kortplatserna i Jakobs kortplan (${k('placements/default.json')}), kortets mitt. P är spelarnas platser och C kortets nummer, D dealerns egna. Läget räknas ur planens bildpunkter genom inspelningens kamera (${k('world.ts', 'spots')}) och står i linsvärlden, i meter: x åt sidan (plus åt dealerns vänster), z i djupled (kameran står i z = 0 och ser mot minus, mot dealern; filten är y = 0). Dockornas bord har samma kortplatser som filmernas, bara vridna mot spelaren (${k('doll.ts', 'dollCardYaw')}, ${k('table-lens.ts', 'DOLL_TABLE.cardsFrom')}), och kanten 0,23 m längre bort. Vridningen är kortets långsida från rakt fram, plus åt dealerns vänster.`, '',
  `Bildpunkterna (x; y, origo uppe till vänster) är kortets mitt i bilden 1764 × 1174, genom spelets vy (${k('table-lens.ts', 'see(filmEye(PLAY_LENS), …)')}: standarddockans filmer, samma lins och bildstorlek som inspelningen) och genom inspelningens kamera (${k('table-lens.ts', 'TABLE_LENS')}: bankens ruta, där planen själv står). De räknas om varje gång ur kameran i koden, så de följer med när en vy ändras. "Från kantens mitt" är avståndet från mitten av dockornas bords kant; det jämförs med livebordets platsmärken (spelets ritade märken i bilden, ett per plats, inte kortrutor; ${k('scen.json', 'seatsUiM')}).`, '',
  tabell(['Plats', 'x, åt sidan', 'z, djupled', 'Från spelets kant / dockornas bords kant', 'Från kantens mitt', 'Vriden: filmernas plan', 'Vriden: dockornas bord', 'Bildpunkt, spelets vy', 'Bildpunkt, inspelningen', `${LIVE}: märket, åt sidan; från kanten`, 'Skillnad, från kantens mitt'], kortRader),
  '', `Jakobs dom om de vända platserna: ${DOM.vanda}.`);
else saknas.push('Var korten hamnar: kortplanen `blackjack-dealer/placements/default.json` gick inte att läsa.');

// ==== 4. Dockorna ===================================================================================================
rubrik('## 4. Dockorna');
type Ankare = {armbageSko: number; armbageVila: number; balVrid: number; axelLut: number; sidled: number} | null;
const vinkelVid = (e: number[], a: number[], b: number[]) => { const u = [a[0] - e[0], a[1] - e[1], a[2] - e[2]], v = [b[0] - e[0], b[1] - e[1], b[2] - e[2]]; return Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / Math.hypot(...u) / Math.hypot(...v)))) * DEG; };
function ankare(namn: string): Ankare {
  const sko0 = givA(namn)?.frames?.[0], vila0 = tillSkon(namn)?.frames?.[0]; if (!sko0 || !vila0) return null;
  const mitt = (f: any) => (f.R.s[0] + f.L.s[0]) / 2;
  return {armbageSko: vinkelVid(sko0.L.e, sko0.L.s, sko0.L.w), armbageVila: vinkelVid(vila0.L.e, vila0.L.s, vila0.L.w),
    balVrid: Math.abs(Math.atan2(sko0.L.s[2] - sko0.R.s[2], sko0.L.s[0] - sko0.R.s[0]) * DEG),
    axelLut: Math.atan2(sko0.L.s[1] - sko0.R.s[1], Math.hypot(sko0.L.s[0] - sko0.R.s[0], sko0.L.s[2] - sko0.R.s[2])) * DEG, sidled: mitt(sko0) - mitt(vila0)};
}
const dockor: {namn: string; d: Doll | undefined; a: Ankare; bord: boolean}[] = [
  {namn: 'Mannen', d: MAN, a: ankare('man'), bord: true}, {namn: 'Kvinnan', d: KVINNA, a: ankare('kvinna'), bord: true},
  {namn: 'Paow (äldre)', d: PAOW, a: null, bord: false}, {namn: 'Vita dockan (äldre)', d: VIT, a: null, bord: false}].filter(x => x.d);
const om = (d: Doll, n: string) => { const t = d.about[n] ?? ''; const f = /^(mätt|gissat)/.exec(t); return f ? ` (${f[1]})` : ''; };
const dr: string[][] = [], drad = (matt: string, f: (x: typeof dockor[number]) => string, a: string, b: string, kalla: string, d = '') => dr.push([matt, ...dockor.map(f), a, b, kalla, d]);
const fr = (d: Doll) => dollFrame(TABLE_LENS, d);
drad('överarm (axelled till armbågsled)', x => m(x.d!.upperArm), '—', '—', k('doll.ts', 'upperArm'));
drad('underarm (armbåge till handled)', x => m(x.d!.forearm), '—', '—', k('doll.ts', 'forearm'));
drad('armen, axel till handled', x => m(x.d!.upperArm + x.d!.forearm), '—', '—', k('doll.ts', 'upperArm + forearm'));
drad('räckvidd innan bålen böjer sig', x => m(x.d!.reach) + om(x.d!, 'reach'), '—', '—', k('doll.ts', 'reach'));
drad('handens längd, handled till långfingrets topp', x => x.d!.hand ? m(Math.hypot(...x.d!.hand.right[12])) : '—', '—', '—', k('doll.ts', 'hand.right[12]'));
drad('axelbredd', x => { const [a, b] = fr(x.d!).shoulders; return m(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])); }, visa(md(stilA, 'metres.shoulder_width_m'), m), visa(md(stilB, 'metres.shoulder_width_m'), m), `${k('doll.ts', 'dollFrame')} (axellederna); ${k('stil-*.json', 'metres.shoulder_width_m')} (axlarna i bilden)`);
drad('axlarnas höjd över filten', x => { const [a, b] = fr(x.d!).shoulders; return m((a[1] + b[1]) / 2); }, '—', '—', k('doll.ts', 'dollFrame, place.shoulderHeight'), DOM.sitthojd);
const axelY = (d: Doll) => { const [a, b] = fr(d).shoulders; return (a[1] + b[1]) / 2; }, ogonYaml = Y('kameror.dealer_ogon.pos');
drad('höften över golvet', x => m(GOLV - x.d!.hipBelowFelt), INTE, INTE, `${k('doll.ts', 'hipBelowFelt')}; ${k('table-lens.ts', 'TABLE_BASE.floor')}`);
drad('axlarna över golvet', x => m(GOLV + axelY(x.d!)), INTE, INTE, `${k('doll.ts', 'dollFrame')}; ${k('table-lens.ts', 'TABLE_BASE.floor')}`);
drad('huvudets mitt (mellan hjässa och haka) över filten', x => m(fr(x.d!).head[1]), '—', '—', k('doll.ts', 'dollFrame.head (place.head)'));
drad('huvudets mitt över golvet', x => m(GOLV + fr(x.d!).head[1]), INTE, INTE, `${k('doll.ts', 'dollFrame.head')}; ${k('table-lens.ts', 'TABLE_BASE.floor')}`);
drad('hjässan över filten (huvudets mitt plus radien)', x => m(fr(x.d!).head[1] + fr(x.d!).headRadius), '—', '—', k('doll.ts', 'dollFrame.head, headRadius'));
drad('ögonen över filten och över golvet', x => x.d === VIT && Array.isArray(ogonYaml) && ok(ogonYaml[2]) ? `${m(ogonYaml[2] - GOLV)} och ${m(ogonYaml[2])} (antaget i Blenders standard.yaml)` : '— (bara i modellen)', INTE, INTE, `${k('standard.yaml', 'kameror.dealer_ogon.pos')}; mannens och kvinnans ögon är ben i modellerna (eyeL, eyeR)`);
drad('axlarna bakom spelets kant',x => m(bakom(x.d!), 2), '—', '—', `${k('doll.ts', 'place.behindEdge')} (den vita: ${k('world.ts', 'ASSUMED.shouldersBehindEdge')})`);
drad('axlarna bakom dockans bords kant', x => x.bord ? m(bakom(x.d!) - DOLL_TABLE.edgeBack, 2) : '—', '—', '—', k('table-lens.ts', 'DOLL_TABLE.edgeBack'));
drad('höften under filten', x => m(x.d!.hipBelowFelt), '—', '—', k('doll.ts', 'hipBelowFelt'));
drad('mest lutning framåt', x => gr(x.d!.mostLean * DEG) + om(x.d!, 'mostLean'), '—', '—', k('doll.ts', 'mostLean'));
drad('mest vridning', x => gr(x.d!.mostTwist * DEG) + om(x.d!, 'mostTwist'), '—', '—', k('doll.ts', 'mostTwist'));
drad('huvudets radie', x => m(fr(x.d!).headRadius), '—', '—', k('doll.ts', 'dollFrame.headRadius'));
drad('vid skon (A2.3): vänster armbåge', x => visa(x.a?.armbageSko, gr), visa(md(stilA, 'trunk.at_the_shoe.elbow_degrees'), gr), visa(md(stilB, 'trunk.at_the_shoe.elbow_degrees'), gr), `${k('dealer3d/data/giv-fran-2-3-p4c1-ren-a-*.json', 'frames[0].L')}; ${k('stil-*.json', 'trunk.at_the_shoe.elbow_degrees')}`);
drad('i vilan (A1): vänster armbåge', x => visa(x.a?.armbageVila, gr), visa(md(stilA, 'trunk.at_the_shoe.elbow_at_rest_degrees'), gr), visa(md(stilB, 'trunk.at_the_shoe.elbow_at_rest_degrees'), gr), `${k('dealer3d/data/till-ankare-2-3-*.json', 'frames[0].L')}; ${k('stil-*.json', 'trunk.at_the_shoe.elbow_at_rest_degrees')}`);
drad('vid skon: bålens vridning', x => visa(x.a?.balVrid, gr), visa(md(stilA, 'trunk.at_the_shoe.trunk_turn_degrees'), gr), visa(md(stilB, 'trunk.at_the_shoe.trunk_turn_degrees'), gr), `axellinjen i ${k('giv-fran-2-3-p4c1-ren-a-*.json', 'frames[0]')}; ${k('stil-*.json', 'trunk.at_the_shoe.trunk_turn_degrees')}`);
drad('vid skon: axellinjens lutning', x => visa(x.a?.axelLut, gr), visa(md(stilA, 'trunk.at_the_shoe.shoulder_line_tilt_degrees'), gr), visa(md(stilB, 'trunk.at_the_shoe.shoulder_line_tilt_degrees'), gr), `som ovan; ${k('stil-*.json', 'trunk.at_the_shoe.shoulder_line_tilt_degrees')}`);
drad('vid skon: axlarna åt sidan från vilan', x => visa(x.a?.sidled, m), visa(md(stilA, 'trunk.at_the_shoe.shoulders_sideways_m'), m), visa(md(stilB, 'trunk.at_the_shoe.shoulders_sideways_m'), m), `axlarnas mitt, vilan mot skon; ${k('stil-*.json', 'trunk.at_the_shoe.shoulders_sideways_m')}`);
ut.push(`Dockornas mått står i ${k('blackjack-dealer/dealer3d/src/doll.ts')}: mannen och kvinnan är mätta på sina modeller, Paow och den vita dockan är de äldre som de gamla filmerna och rörelserna gjordes med. "(gissat)" och "(mätt)" är vad doll.ts själv säger om måttet. Ställningarna vid skon (A2.3) och i vilan (A1) är rörelsernas första rutor, som dockans kod ritar dem. De riktiga dealrarna är mätta i bilden, axlarna på ett plan 0,2 m bakom kanten; var de sitter och hur långa armarna är är inte mätt.`, '',
  tabell(['Mått', ...dockor.map(x => x.namn), LIVE_A, LIVE_B, 'Källa', 'Jakobs dom'], dr));

// ==== 5. Rörelserna =================================================================================================
rubrik('## 5. Rörelserna');
const rorA = givA('man'), F: any[] | undefined = rorA?.frames, FPS: number = ok(rorA?.fps) ? rorA.fps : 30;
const vilaFil = tillSkon('man');
if (!KOREO) saknas.push(`Givens takt: KOREO i \`${koreoFil}\` gick varken att importera eller läsa ur texten.`);
if (!F) saknas.push('Dockans fart och mönster: rörelsens fil `blackjack-dealer/dealer3d/data/giv-fran-2-3-p4c1-ren-a-man.json` finns inte.');
if (F && KOREO && (rorA.rests !== KOREO.ligger || F.length !== KOREO.hemma + 1)) saknas.push(`Rörelsens fil \`giv-fran-2-3-p4c1-ren-a-man.json\` är ritad i en annan takt än KOREO (kortet ligger i ruta ${rorA.rests}, ${F.length} rutor; KOREO säger ${KOREO.ligger} och ${KOREO.hemma + 1}): rita om den, så stämmer farterna nedan med takten.`);
const ru = (a: number, b = 0) => `${a - b} rutor = ${sek((a - b) / FPS)}`;
const s = (x: any, p: string) => md(x, p);
// Dockans rörelse räknad ur rutorna: handledens fart längs filten (som de riktiga dealrarnas, mätta på ett plan över filten).
const hor = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const fart = (P: (f: any) => number[]) => F ? F.map((_, t) => { const a = Math.max(0, t - 1), b = Math.min(F.length - 1, t + 1); return hor(P(F[b]), P(F[a])) / ((b - a) / FPS); }) : [];
const vag = (P: (f: any) => number[], a: number, b: number) => { let v = 0; for (let t = a; t < b; t++) v += hor(P(F![t + 1]), P(F![t])); return v; };
function drag(P: (f: any) => number[], a: number, b: number) {
  if (!F || b <= a || b >= F.length) return null;
  const v = fart(P); let top = -1, vid = a; for (let t = a; t <= b; t++) if (v[t] > top) { top = v[t]; vid = t; }
  const l = vag(P, a, b); return {top, vid, andel: (vid - a) / (b - a), medel: l / ((b - a) / FPS), langd: l};
}
/** Hur bålen eller huvudet följer en hand under rörelsen a–b: hur långt, och när de har gått en femtedel av sin väg mot handen. */
function folj(P: (f: any) => number[], a: number, b: number, varde: (f: any) => number) {
  if (!F || b <= a || b >= F.length) return null;
  const tot = vag(P, a, b); let acc = 0, tH = b; for (let t = a; t < b; t++) { acc += hor(P(F[t + 1]), P(F[t])); if (acc >= 0.2 * tot) { tH = t + 1; break; } }
  const v0 = varde(F[a]); let storlek = 0; for (let t = a; t <= b; t++) storlek = Math.max(storlek, Math.abs(varde(F[t]) - v0));
  let tS = b; for (let t = a; t <= b; t++) if (Math.abs(varde(F[t]) - v0) >= 0.2 * storlek) { tS = t; break; }
  return {storlek, borjar: (tS - tH) / FPS};
}
const RW = (f: any) => f.R.w, LW = (f: any) => f.L.w, grepp = (h: any) => [(h.p[4][0] + h.p[8][0]) / 2, (h.p[4][1] + h.p[8][1]) / 2, (h.p[4][2] + h.p[8][2]) / 2];
const huvud = (f: any) => Math.atan2(f.g[0] - f.h[0], f.g[2] - f.h[2]) * DEG, bal = (f: any) => (f.R.s[0] + f.L.s[0]) / 2;

// 4a. Takten
const tr: string[][] = [], trad = (del: string, d: string, doc: string, a: Tal, b: Tal, f: (n: number) => string, kalla: string, dockTal: Tal) => tr.push([del, d, doc, visa(a, f), visa(b, f), skillnad(dockTal, medel(a, b), f), kalla]);
let mote: number | undefined, isar: number | undefined;
if (F && KOREO) { let best = Infinity; for (let t = 0; t <= Math.min(KOREO.ligger, F.length - 1); t++) { const q = grepp(F[t].L), p = grepp(F[t].R), d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); if (d < best) { best = d; mote = t; } } isar = best; }
if (KOREO) {
  const vilaS = TAKT?.[0], skoS = ok(rorA?.leavesShoe) ? rorA.leavesShoe : undefined;
  trad('Vilan till skon (A1 till A2.3)', DOM.vila, `${visa(vilaS, sek)} i editorn (stillheten i ankarna oräknad)${vilaFil ? `; rörelsens fil ${vilaFil.frames?.length} rutor` : ''}`, undefined, undefined, sek, `${k('rorelse.ts', 'STANDARDTAKT[0]')}; ${k('till-ankare-2-3-man.json')}`, vilaS);
  trad('Greppet vid skon, tills kortet har lämnat den', '', ok(skoS) ? ru(skoS) : '—', s(stilA, 'tempo.left_at_shoe_s'), s(stilB, 'tempo.left_at_shoe_s'), sek, `${k('giv-fran-2-3-p4c1-ren-a-man.json', 'leavesShoe')}; ${k('stil-*.json', 'tempo.left_at_shoe_s')}`, ok(skoS) ? skoS / FPS : undefined);
  trad('Vänsterhanden med kortet till mötet', '', ok(skoS) ? ru(KOREO.framme, skoS) : ru(KOREO.framme), s(stilA, 'tempo.left_back_with_card_s'), s(stilB, 'tempo.left_back_with_card_s'), sek, `${k('koreo-giv.ts', 'KOREO.framme')}; ${k('stil-*.json', 'tempo.left_back_with_card_s')}`, (KOREO.framme - (skoS ?? 0)) / FPS);
  trad('Händerna möts (greppen närmast), räknat från att vänstern är framme', '', ok(mote) ? `ruta ${mote}, ${sek((mote - KOREO.framme) / FPS)} efter (nypet i ruta ${KOREO.nyp})` : '—', s(stilA, 'handover.meets_after_left_arrives_s'), s(stilB, 'handover.meets_after_left_arrives_s'), sek, `${k('koreo-giv.ts', 'KOREO.framme, nyp')}, rörelsens fil; ${k('stil-*.json', 'handover.meets_after_left_arrives_s')}`, ok(mote) ? (mote - KOREO.framme) / FPS : undefined);
  trad('Högerhanden ut med kortet (nypet till att kortet ligger)', '', ru(KOREO.ligger, KOREO.nyp), s(stilA, 'tempo.right_out_s'), s(stilB, 'tempo.right_out_s'), sek, `${k('koreo-giv.ts', 'KOREO.nyp, ligger')}; ${k('stil-*.json', 'tempo.right_out_s')}`, (KOREO.ligger - KOREO.nyp) / FPS);
  trad('Kortet ut: från skon till att det ligger', DOM.takt, `${ru(KOREO.ligger)} (editorn: ${visa(TAKT?.[1], sek)})`, undefined, undefined, sek, `${k('koreo-giv.ts', 'KOREO.ligger')}; ${k('rorelse.ts', 'STANDARDTAKT[1]')}`, KOREO.ligger / FPS);
  trad('Handen hem: från att kortet ligger till ankaret', DOM.takt, `${ru(KOREO.hemma, KOREO.ligger)} (editorn: ${visa(TAKT?.[2], sek)})`, s(stilA, 'tempo.right_back_s'), s(stilB, 'tempo.right_back_s'), sek, `${k('koreo-giv.ts', 'KOREO.ligger, hemma')}; ${k('stil-*.json', 'tempo.right_back_s')}`, (KOREO.hemma - KOREO.ligger) / FPS);
  trad('Vänsterhanden tillbaka till skon efter släppet', '', ru(KOREO.vansterHemma, KOREO.vansterSlapper), s(stilA, 'tempo.left_to_shoe_s'), s(stilB, 'tempo.left_to_shoe_s'), sek, `${k('koreo-giv.ts', 'KOREO.vansterSlapper, vansterHemma')}; ${k('stil-*.json', 'tempo.left_to_shoe_s')}`, (KOREO.vansterHemma - KOREO.vansterSlapper) / FPS);
  trad('Vänsterhandens hela tur, skon och åter', '', ru(KOREO.vansterHemma), s(stilA, 'tempo.left_whole_trip_s'), s(stilB, 'tempo.left_whole_trip_s'), sek, `${k('koreo-giv.ts', 'KOREO.vansterHemma')}; ${k('stil-*.json', 'tempo.left_whole_trip_s')}`, KOREO.vansterHemma / FPS);
  trad('Från ett grepp vid skon till nästa, när han ger i följd', '', ru(KOREO.hemma), s(stilA, 'tempo.grip_to_grip_when_dealing_on_s'), s(stilB, 'tempo.grip_to_grip_when_dealing_on_s'), sek, `${k('koreo-giv.ts', 'KOREO.hemma')}; ${k('stil-*.json', 'tempo.grip_to_grip_when_dealing_on_s')}`, KOREO.hemma / FPS);
}
ut.push(`Dockans takt är version A av givens koreografi (${k('koreo-giv.ts', 'KOREO')}), 30 rutor i sekunden, från skon (A2.3) till plats 4; editorn spelar rörelserna i Jakobs takt (${k('rorelse.ts', 'STANDARDTAKT')}). De riktiga dealrarnas tal är medianer. Mannens och kvinnans givar har samma rutor.`, '',
  tabell(['Delen', 'Jakobs dom', 'Dockan', LIVE_A, LIVE_B, 'Skillnad (dockan mot dealrarnas medel)', 'Källa'], tr));

// 4b. Nyckelrutorna
const HANDELSER: [string, string][] = [['hogerFran', 'högerhanden lämnar sin plats på filten'], ['restStart', 'vänstern börjar resa kortet på högkant'], ['framme', 'kortet ligger plant vid mötet'], ['restat', 'kortet står på högkant'],
  ['nyp', 'högerns nyp om kortet är slutet'], ['vansterSlapper', 'vänstern släpper kortet'], ['nere', 'kortets fria långsida når filten vid platsen'], ['vansterHemma', 'vänstern är tillbaka vid skon'],
  ['plant', 'kortet ligger plant, strax före platsen'], ['ligger', 'kortet är skjutet på plats'], ['vilar', 'fingrarna har vilat på kortet'], ['hemma', 'högerhanden är hemma']];
if (KOREO) {
  const rutaFor = (n: string) => n === 'restStart' ? (ok(KOREO.framme) && ok(KOREO.restFore) ? KOREO.framme - KOREO.restFore : undefined) : KOREO[n];
  const nr = HANDELSER.map(([n, vad]) => ({n, vad, t: rutaFor(n)})).filter(x => ok(x.t)).sort((a, b) => a.t - b.t);
  ut.push('', `Nyckelrutorna i version A (${k('koreo-giv.ts', 'KOREO')}); B har samma rutor. Platserna närmast skon ges med vänsterhanden ensam (${k('koreo-giv.ts', 'ENSAM')})${ENSAM ? `: kortet ute ur skon i ruta ${ENSAM.ute}, strax hitom platsen i ${ENSAM.framme}, vänt och på plats i ${ENSAM.ligger} (${sek(ENSAM.ligger / FPS)}), fingrarna har vilat i ${ENSAM.vilar}, hemma i ${ENSAM.hemma} (${sek(ENSAM.hemma / FPS)})` : ''}.`, '',
    tabell(['Ruta', 'Sekund', 'Vad som händer'], nr.map(x => [String(x.t), sek(x.t / FPS), x.vad])));
  // Givens mått och versionerna
  const ETIKETT: Record<string, string> = {mote: 'mötespunkten, kortets mitt från axlarnas mitt', moteYaw: 'kortets långsida vid mötet (90° är längs kanten)', rest: 'hur högt kortet reses mot filten', ovanfor: 'högern kommer så högt över kortets kant innan den nyper',
    lyft: 'kortets höjd över filten när det bärs', satt: 'handen vänds tillbaka minst så mycket när kortet sätts ned', skjut: 'fingertopparna skjuter kortet på plats', vansterUpp: 'vänstern lyfts från kortet', vansterBak: 'vänstern går bakåt längs sig själv',
    vansterOppna: 'vänsterns handled sträcks när den släpper', vansterBage: 'vänsterns båge hem över den raka vägen', vantaMest: 'högern väntar högst på vänstern (rutor)', rull: 'mellan vilka delar av vägen kortet rullas (A)', rullB: 'var på vägen rullningen börjar (B)',
    svang: 'var på vägen svängen mot platsen börjar', vansterSlapper: 'vänstern släpper kortet (ruta)', vansterUppRutor: 'vänsterns lyft tar (rutor)', vansterHemma: 'vänstern hemma (ruta)', sluta: 'högerns fingrar sluts under (rutor)'};
  const ENHET: Record<string, (x: any) => string> = {mote: (v: any) => `${cm(v.x)} åt vänster, ${cm(v.z)} fram`, moteYaw: gr, rest: gr, satt: gr, vansterOppna: gr, ovanfor: cm, lyft: cm, skjut: cm, vansterUpp: cm, vansterBak: cm, vansterBage: cm,
    rull: (v: any) => Array.isArray(v) ? v.map((y: number) => tal(y, 2)).join(' till ') : String(v), rullB: (v: number) => tal(v, 2), svang: (v: number) => tal(v, 2)};
  const visaV = (n: string, v: any) => (ENHET[n] ?? ((x: any) => typeof x === 'number' ? tal(x, 3) : JSON.stringify(x)))(v);
  const B = VERSIONER.find(x => x.namn === 'B'), gm: string[][] = [];
  for (const n of ['mote', 'moteYaw', 'rest', 'ovanfor', 'lyft', 'skjut', 'satt', 'vansterUpp', 'vansterBak', 'vansterOppna', 'vansterBage', 'svang', 'rull', 'rullB']) {
    if (KOREO[n] === undefined) continue;
    const bv = B?.andrar && n in B.andrar ? visaV(n, B.andrar[n]) : '';
    gm.push([ETIKETT[n] ?? n, visaV(n, KOREO[n]), bv, k('koreo-giv.ts', `KOREO.${n}${bv ? ', KOREO_B' : ''}`), n === 'mote' ? DOM.mote : n === 'lyft' && bv ? DOM.ab : '']);
  }
  if (RAK) gm.push(['handleden högst från underarmen: vänstern, och högern medan den bär kortet', `${RAK[1]}° och ${RAK[2]}°`, '', `${k('koreo-giv.ts', 'RAK, RAK_H')} (tolkade ur text)`, DOM.handled]);
  gm.push(['kortets vändning i handbytet', '— (inget eget tal: koden säger "cirka 90 grader" i en kommentar)', '', k('koreo-giv.ts', 'K4'), DOM.vandning]);
  const andra = VERSIONER.filter(x => x.namn !== 'B');
  ut.push('', `Givens mått. B är Jakobs alternativ (vänds nära platsen) och står där den skiljer från A.${andra.length ? ` Fler versioner i koden: ${andra.map(x => `${x.namn} (ändrar ${x.andrar ? Object.keys(x.andrar).map(n => `${ETIKETT[n] ?? n} till ${visaV(n, x.andrar![n])}`).join(', ') : x.text})`).join('; ')}; de är prov och står inte i tabellen.` : ''}`, '',
    tabell(['Mått', 'Version A', 'Version B', 'Källa', 'Jakobs dom'], gm));
}

// 4c. Fart och mönster
if (F && KOREO) {
  const fm: string[][] = [];
  /** En rad: dockans tal, och samma mått (vägen `p`) hos de två dealrarna; eller dealrarnas tal givna direkt. */
  const frad = (matt: string, dock: Tal, p: string | [Tal, Tal], f: (n: number) => string, kalla: string, procent = true) => {
    const [a, b] = typeof p === 'string' ? [md(stilA, p), md(stilB, p)] : p;
    fm.push([matt, visa(dock, f), typeof p === 'string' ? livecell(stilA, p, f) : visa(a, f), typeof p === 'string' ? livecell(stilB, p, f) : visa(b, f), skillnad(dock, medel(a, b), f, procent), kalla]); };
  const delar: [string, string, (f: any) => number[], number, number][] = [
    ['Vänsterhanden med kortet, skon till mötet', 'left_back_with_card', LW, 0, KOREO.framme], ['Högerhanden ut med kortet', 'right_out', RW, KOREO.nyp, KOREO.ligger],
    ['Högerhanden hem', 'right_back', RW, KOREO.ligger, KOREO.hemma], ['Vänsterhanden till skon efter släppet', 'left_to_shoe', LW, KOREO.vansterSlapper, KOREO.vansterHemma]];
  for (const [namn, nyckel, P, a, b] of delar) {
    const d = drag(P, a, b); if (!d) continue;
    const kalla = `rutorna ${a}–${b} i ${k('giv-fran-2-3-p4c1-ren-a-man.json')}; ${k('stil-*.json', `speed.${nyckel}`)}`;
    frad(`${namn}: toppfart`, d.top, `speed.${nyckel}.top_m_s`, ms, kalla);
    frad(`${namn}: medelfart`, d.medel, `speed.${nyckel}.mean_m_s`, ms, kalla);
    frad(`${namn}: vägen`, d.langd, forst([stilA, stilB], `speed.${nyckel}.path_m`, `speed.${nyckel}.length_m`), m, kalla);
    const toppVid = (x: any) => { const v = g(x, `speed.${nyckel}.speed_share_of_top`), t = g(x, `speed.${nyckel}.time`); if (!Array.isArray(v) || !Array.isArray(t)) return undefined; let i = 0; v.forEach((y: number, j: number) => { if (y > v[i]) i = j; }); return t[i]; };
    frad(`${namn}: toppen så långt in i rörelsen`, d.andel, [toppVid(stilA), toppVid(stilB)], x => `${tal(x * 100, 0)} %`, kalla, false);
  }
  // Handbytet: handen som har kortet (vänstern till mötet, sedan högern), som de riktiga dealrarnas.
  if (ok(mote)) {
    const vL = fart(LW), vR = fart(RW); let iB = 0, iA = mote;
    for (let t = 0; t <= mote; t++) if (vL[t] > vL[iB]) iB = t;
    for (let t = mote; t <= KOREO.ligger; t++) if (vR[t] > vR[iA]) iA = t;
    let dal = Infinity; for (let t = iB; t <= iA; t++) dal = Math.min(dal, t <= mote ? vL[t] : vR[t]);
    const toppen = Math.max(vL[iB], vR[iA]), kalla = `${k('giv-fran-2-3-p4c1-ren-a-man.json')}; ${k('stil-*.json', 'handover')}`;
    frad('Handbytet: greppen så nära varandra', isar, 'handover.hands_apart_m', m, kalla);
    frad('Handbytet: vänsterns toppfart på väg in', vL[iB], 'handover.top_before_m_s', ms, kalla);
    frad('Handbytet: högerns toppfart på väg ut', vR[iA], 'handover.top_after_m_s', ms, kalla);
    frad('Handbytet: dalen, kortets hand som långsammast', dal, 'handover.dip_m_s', ms, kalla);
    frad('Handbytet: dalen som andel av toppen (0 är stopp)', dal / toppen, 'handover.dip_share_of_top', x => tal(x, 2), kalla, false);
    frad('Handbytet: från topp till topp', (iA - iB) / FPS, 'handover.top_to_top_s', sek, kalla);
  }
  const fol: [string, string, (f: any) => number[], number, number][] = [['högerhanden ut', 'with_right_out', RW, KOREO.nyp, KOREO.ligger], ['vänsterhanden till skon', 'with_left_to_shoe', LW, KOREO.vansterSlapper, KOREO.vansterHemma]];
  for (const [namn, nyckel, P, a, b] of fol) {
    const bl = folj(P, a, b, bal), hu = folj(P, a, b, huvud), kalla = `rutorna ${a}–${b}; ${k('stil-*.json', `trunk.${nyckel}, head.${nyckel}`)}`;
    const andel = (x: any, p: string) => { const v = g(x, p); return ok(v) ? v : undefined; };
    if (bl) { frad(`Bålen med ${namn}: hur långt åt sidan`, bl.storlek, `trunk.${nyckel}.size`, x => mm(x, 0), kalla);
      fm.push([`Bålen med ${namn}: följer med (över 12 mm)`, bl.storlek > 0.012 ? 'ja' : 'nej', visa(andel(stilA, `trunk.${nyckel}.goes_along_share`), x => `${tal(x * 100, 0)} % av gångerna`), visa(andel(stilB, `trunk.${nyckel}.goes_along_share`), x => `${tal(x * 100, 0)} % av gångerna`), '—', kalla]);
      if (bl.storlek > 0.012) frad(`Bålen med ${namn}: börjar efter handen`, bl.borjar, `trunk.${nyckel}.starts_after_hand_s`, sek, kalla, false); }
    if (hu) { frad(`Huvudet med ${namn}: hur långt det vrids`, hu.storlek, `head.${nyckel}.size`, gr, kalla);
      if (hu.storlek > 5) frad(`Huvudet med ${namn}: börjar efter handen`, hu.borjar, `head.${nyckel}.starts_after_hand_s`, sek, kalla, false); }
  }
  let huTopp = 0; for (let t = 1; t < F.length - 1; t++) huTopp = Math.max(huTopp, Math.abs(huvud(F[t + 1]) - huvud(F[t - 1])) / (2 / FPS));
  frad('Huvudets toppfart', huTopp, 'head.top_degrees_s', x => `${tal(x, 0)}°/s`, `huvudet mot blickpunkten i varje ruta; ${k('stil-*.json', 'head.top_degrees_s')}`);
  const ovr: [string, string, (f: any) => number[], number, number][] = [['Vänsterhanden medan högern går ut', 'left_while_right_goes_out', LW, KOREO.nyp, KOREO.ligger], ['Högerhanden medan vänstern kommer med kortet', 'right_while_left_comes_back', RW, 0, KOREO.framme], ['Högerhanden medan vänstern går till skon', 'right_while_left_goes_to_shoe', RW, KOREO.vansterSlapper, KOREO.vansterHemma]];
  for (const [namn, nyckel, P, a, b] of ovr) { const d = drag(P, a, b); if (!d) continue;
    frad(`${namn}: vägen`, d.langd, `other_hand.${nyckel}.path_m`, m, `rutorna ${a}–${b}; ${k('stil-*.json', `other_hand.${nyckel}`)}`);
    frad(`${namn}: medelfart`, d.medel, `other_hand.${nyckel}.mean_m_s`, ms, `rutorna ${a}–${b}; ${k('stil-*.json', `other_hand.${nyckel}`)}`); }
  ut.push('', `Fart och mönster: dockan räknad ur rutorna i mannens giv A till plats 4 (${k('blackjack-dealer/dealer3d/data/giv-fran-2-3-p4c1-ren-a-man.json')}, ritad av koreo-giv.ts), handledens fart längs filten som de riktiga dealrarnas (de är mätta på ett plan strax över filten, så att lyft inte räknas). Bålen är axlarnas mitt åt sidan, huvudet dess vridning mot blickpunkten; "börjar efter handen" räknas som för dealrarna, när var och en har gått en femtedel av sin väg (minus: före handen). Inom parentes hos dealrarna: det minsta och största måttet där stil-filen har räknat det på mer än en antagen höjd för handen (\`at_least\`, \`at_most\`); deras meter är svagare än deras sekunder.`, '',
    tabell(['Mått', 'Dockan (mannen, A till plats 4)', LIVE_A, LIVE_B, 'Skillnad (dockan mot dealrarnas medel)', 'Källa'], fm));
}
// Blinkningarna och vilan
{
  const bv: string[][] = [], klipp = F ? F.length / FPS : undefined, blinkS = BLINK ? BLINK.stang + BLINK.stangd + BLINK.oppna : undefined;
  const per = RUNDLIV?.blinkning?.andel;
  bv.push(['Blinkningar i minuten', ok(per) ? `${tal(per, 2)} av klippen får en blinkning${ok(klipp) ? `; med en giv på ${sek(klipp)} ${tal(per * 60 / klipp, 1)} i minuten` : ''}` : '—', visa(s(stilA, 'blinks.a_minute'), x => tal(x, 1)), visa(s(stilB, 'blinks.a_minute'), x => tal(x, 1)), ok(per) && ok(klipp) ? skillnad(per * 60 / klipp, medel(s(stilA, 'blinks.a_minute'), s(stilB, 'blinks.a_minute')), x => tal(x, 1)) : '—', `${k('rorelse.ts', 'RUNDLIV.blinkning')}; ${k('stil-*.json', 'blinks.a_minute')}`]);
  bv.push(['En blinkning tar', visa(blinkS, sek), visa(s(stilA, 'blinks.seconds'), sek), visa(s(stilB, 'blinks.seconds'), sek), skillnad(blinkS, medel(s(stilA, 'blinks.seconds'), s(stilB, 'blinks.seconds')), sek), `${k('rorelse.ts', 'BLINK')}; ${k('stil-*.json', 'blinks.seconds')}`]);
  const spann = (v: any, f: (n: number) => string) => Array.isArray(v) ? `${f(v[0])} till ${f(v[1])}` : '—';
  bv.push(['Vilan: axlarna (dockan: lyftet i ett andetag; dealrarna: spridningen över 2 s)', spann(RUNDLIV?.andning, x => mm(x, 0)), visa(s(stilA, 'rest.shoulders_slow_mm'), x => `${tal(x, 2)} mm`), visa(s(stilB, 'rest.shoulders_slow_mm'), x => `${tal(x, 2)} mm`), '— (inte samma mått)', `${k('rorelse.ts', 'RUNDLIV.andning')}; ${k('stil-*.json', 'rest.shoulders_slow_mm')}`]);
  bv.push(['Vilan: bålen åt sidan', spann(RUNDLIV?.kropp?.sida, x => mm(x, 0)), '—', '—', '—', k('rorelse.ts', 'RUNDLIV.kropp.sida')]);
  bv.push(['Vilan: huvudet (dockan: blickpunkten vandrar åt sidan och i höjd; dealrarna: näsan)', Array.isArray(RUNDLIV?.huvud) ? `${mm(RUNDLIV.huvud[0], 0)} och ${mm(RUNDLIV.huvud[1], 0)}` : '—', visa(s(stilA, 'rest.nose_slow_mm'), x => `${tal(x, 2)} mm`), visa(s(stilB, 'rest.nose_slow_mm'), x => `${tal(x, 2)} mm`), '— (inte samma mått)', `${k('rorelse.ts', 'RUNDLIV.huvud')}; ${k('stil-*.json', 'rest.nose_slow_mm')}`]);
  bv.push(['Vilan: huvudets vridning', '—', visa(s(stilA, 'rest.head_degrees'), x => gr(x, 2)), visa(s(stilB, 'rest.head_degrees'), x => gr(x, 2)), '—', k('stil-*.json', 'rest.head_degrees')]);
  bv.push(['Vilan: handlederna, vänster och höger', '—', `${visa(s(stilA, 'rest.wrist_L_mm'), x => `${tal(x, 1)} mm`)} och ${visa(s(stilA, 'rest.wrist_R_mm'), x => `${tal(x, 1)} mm`)}`, `${visa(s(stilB, 'rest.wrist_L_mm'), x => `${tal(x, 1)} mm`)} och ${visa(s(stilB, 'rest.wrist_R_mm'), x => `${tal(x, 1)} mm`)}`, '—', k('stil-*.json', 'rest.wrist_L_mm, wrist_R_mm')]);
  ut.push('', `Blinkningarna och vilan. Dockan blinkar och rör sig i vilan bara med valet "Små egna rörelser och blinkning" i Hela rundan (${k('rorelse.ts', 'RUNDLIV, BLINK')}); grundrörelserna har inget av det.`, '',
    tabell(['Mått', 'Dockan', LIVE_A, LIVE_B, 'Skillnad (dockan mot dealrarnas medel)', 'Källa'], bv));
}

// ==== 6. Rörelsekatalogen ===========================================================================================
// standarddocka/rorelsekatalog.json (ankarena och rörelserna mellan dem, med status) bredvid det som är mätt på de
// riktiga dealrarna (live-bj/data/rorelser.json, styles.<stil>.kinds.<slag>); för en rörelse som finns kontrolleras att
// dess filer finns i blackjack-dealer/dealer3d/data/ för mannen och kvinnan.
rubrik('## 6. Rörelsekatalogen');
const katalog = data('standarddocka/rorelsekatalog.json'), livRor = data('live-bj/data/rorelser.json');
const STILNAMN: Record<string, string> = {kameran: LIVE_A, bordet: LIVE_B};
const stilar: string[] = livRor?.styles && typeof livRor.styles === 'object' ? Object.keys(livRor.styles) : [];
const STATUS: Record<string, string> = {finns: 'finns', delvis: 'delvis', saknas: 'saknas', 'förslag': 'förslag'};
if (!katalog) saknas.push('Rörelsekatalogen: `standarddocka/rorelsekatalog.json` finns inte eller går inte att läsa.');
else {
  const ank: any[] = Array.isArray(katalog.ankare) ? katalog.ankare : [], ror: any[] = Array.isArray(katalog.rorelser) ? katalog.rorelser : [];
  const stad: any[] = Array.isArray(katalog.stadier) ? katalog.stadier : [];
  const BEGREPP: Record<string, string> = {ankare: 'Ankare', rorelse: 'Rörelse', stadium: 'Stadium', schemat: 'Schemat'};
  const begrepp = katalog.begrepp && typeof katalog.begrepp === 'object' ? Object.entries(katalog.begrepp as Record<string, unknown>) : [];
  const stor = (t: string) => t ? t[0].toUpperCase() + t.slice(1) : t;
  ut.push(`Rörelseschemat som ${k('standarddocka/rorelsekatalog.json')} har det: det ändras där, inte här.${katalog.regel ? ' ' + katalog.regel : ''}`);
  if (begrepp.length) ut.push('', begrepp.map(([n, t]) => `- **${BEGREPP[n] ?? stor(n)}.** ${String(t)}`).join('\n'));
  ut.push('', '### Ankarena', '',
    tabell(['Ankare', 'Namn', 'Var händerna är', 'Status', 'Anteckning'], ank.map(a => [String(a.id ?? ''), String(a.namn ?? ''), String(a.var ?? ''), STATUS[a.status] ?? String(a.status ?? '—'), String(a.anteckning ?? a.varfor ?? '')])));
  /** Ett mönster ur katalogens "filer" som filnamn: <docka> är dockan, <n> plats 1–7, <a|b> vart och ett av alternativen. */
  const utvidga = (s: string): string[] | null => { const x = /<([^>]+)>/.exec(s); if (!x) return [s];
    const alt = x[1] === 'n' ? ['1', '2', '3', '4', '5', '6', '7'] : x[1].includes('|') ? x[1].split('|') : null; if (!alt) return null;
    const ut2 = alt.map(a => utvidga(s.slice(0, x.index) + a + s.slice(x.index + x[0].length))); return ut2.some(y => y === null) ? null : ut2.flat() as string[]; };
  const huvudCache = new Map<string, {fps: number; rutor?: number; vid?: number; hander?: string} | null>();
  /** En rörelsefils huvud (det som står före rutorna): rutor i sekunden, antal rutor, rutan där kortet ligger och vilka händer som ger. */
  const huvudet = (n: string) => {
    if (huvudCache.has(n)) return huvudCache.get(n)!;
    const t = las(`${DATA}${n}.json`), h = t?.slice(0, 600) ?? '', num = (x: string) => { const y = new RegExp(`"${x}":(\\d+(?:\\.\\d+)?)`).exec(h); return y ? Number(y[1]) : undefined; };
    const v = t === null ? null : {fps: num('fps') ?? 30, rutor: num('frameCount'), vid: num('rests'), hander: /"hander":"(\w+)"/.exec(h)?.[1]}; huvudCache.set(n, v); return v;
  };
  /** En annan version än A av en giv väntas bara där A ges med två händer: platserna som ges med vänstern ensam har bara A (fältet marke i A:s fil). */
  const vantas = (n: string) => { const x = /-ren-([a-z])-/.exec(n); if (!x || x[1] === 'a') return true; const a = huvudet(n.replace(x[0], '-ren-a-')); return !(a && a.hander === 'vanster'); };
  const platsText = (p: number[]) => { const s = [...new Set(p)].sort((a, b) => a - b), d: string[] = []; for (let i = 0; i < s.length; i++) { let j = i; while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++; d.push(j > i ? `${s[i]}–${s[j]}` : String(s[i])); i = j; } return d.join(', '); };
  const filerFor = (r: any) => {
    if (!r.filer) return {text: '—', stammer: r.status === 'finns' ? 'nej: katalogen säger finns men har inga filer' : '— (inga filer att leta efter)'};
    const delar: [string, string][] = [], saknade: string[] = []; let alla = 0, finns = 0, okand = false;
    for (const docka of ['man', 'kvinna']) {
      const namn = utvidga(String(r.filer).replace(/<docka>/g, docka))?.filter(vantas); if (!namn) { okand = true; continue; }
      const har = namn.filter(n => existsSync(path.join(ROOT, DATA, `${n}.json`)));
      alla += namn.length; finns += har.length; saknade.push(...namn.filter(n => !har.includes(n)));
      const ver = new Map<string, number[]>(); for (const n of har) { const x = /p(\d+)c\d+-ren-([a-z])-/.exec(n); if (x) ver.set(x[2], [...(ver.get(x[2]) ?? []), Number(x[1])]); }
      delar.push([docka === 'man' ? 'mannen' : 'kvinnan', ver.size ? [...ver].sort(([a], [b]) => a < b ? -1 : 1).map(([v, p]) => `${v.toUpperCase()}: plats ${platsText(p)}`).join(', ') : `${har.length} av ${namn.length}`]);
    }
    if (okand) return {text: `\`${r.filer}\` (mönstret går inte att läsa)`, stammer: 'kan inte kontrolleras'};
    const stammer = r.status === 'finns' ? (finns === alla ? 'ja' : `nej: ${alla - finns} filer saknas (${saknade.slice(0, 8).join(', ')}${saknade.length > 8 ? ' …' : ''})`)
      : r.status === 'delvis' ? (finns > 0 ? 'ja' : 'nej: inga filer finns') : finns > 0 ? `nej: katalogen säger ${r.status}, men ${finns} filer finns` : 'ja';
    const lika = delar.length === 2 && delar[0][1] === delar[1][1];
    return {text: `\`${r.filer}\`: ${lika ? `mannen och kvinnan ${delar[0][1]}` : delar.map(([d, t]) => `${d} ${t}`).join('; ')} (${finns} av ${alla} filer som väntas)`, stammer};
  };
  const slag = (stil: string, matt: any) => { if (!matt) return '— (inte urskilt i mätningen)'; const x = livRor?.styles?.[stil]?.kinds?.[matt]; if (!x) return '— (inget sådant slag)';
    const sec = x.seconds ?? {}; return `${x.count ?? '?'} st (${x.clean ?? '?'} rena), ${visa(sec.median, sek)}${ok(sec.p10) && ok(sec.p90) ? ` (${tal(sec.p10, 2)}–${tal(sec.p90, 2)})` : ''}`; };
  const radFor = (x: any) => { const f = filerFor(x); return [`${x.namn ?? ''} (${x.id ?? ''})`, `${x.fran ?? '?'} → ${x.till ?? '?'}${x.over ? ` (över ${x.over})` : ''}`, String(x.hander ?? ''), STATUS[x.status] ?? String(x.status ?? '—'), f.text, f.stammer,
    ...stilar.map(st => slag(st, x.matt)), x.matt ? `\`${x.matt}\`` : '—', String(x.anteckning ?? '')]; };
  const kol = ['Rörelse', 'Från → till', 'Händerna', 'Status', 'Filerna', 'Stämmer?', ...stilar.map(st => STILNAMN[st] ?? `Stilen ${st}`), 'Slaget i mätningen', 'Anteckning'];
  ut.push('', '### Rörelserna, stadium för stadium', '', `I den ordning katalogen har stadierna. "Filerna" är rörelsens filer i ${k('blackjack-dealer/dealer3d/data/')} för mannen och kvinnan (\`<n>\` är plats 1–7, \`<docka>\` mannen och kvinnan); "Stämmer?" jämför dem med katalogens status. En annan version än A väntas bara där A ges med två händer (fältet \`marke\` i A:s fil): platserna som ges med vänstern ensam har bara A. Bredvid står samma slag hos de två riktiga dealrarna (${k('live-bj/data/rorelser.json', 'styles.<stil>.kinds.<slag>')}${LIVE.includes('preliminärt') ? ', mätt på film, preliminärt' : ''}): hur många, hur många som är rena nog att rita efter, och hur länge ett tar (median, och 10–90 % av dem).`);
  const kandaStadier = new Set(stad.map(st => st.id));
  for (const st of stad) {
    const egna = ror.filter(x => x.stadium === st.id);
    ut.push('', `#### ${st.namn ?? st.id} (${st.id}): hemankare ${st.hem ?? '?'}${st.nar ? `, ${st.nar}` : ''}`, '', egna.length ? tabell(kol, egna.map(radFor)) : 'Inga rörelser i katalogen än.');
  }
  const utanStadium = ror.filter(x => !kandaStadier.has(x.stadium));
  if (utanStadium.length) ut.push('', '#### Utan ett stadium som katalogen listar', '', tabell(kol, utanStadium.map(radFor)));
  // Rörelser som pekar på samma filer (given och handen hem är ritade i en fil): var filerna delar dem, i sekunder ur filernas egna huvuden.
  const grupper = new Map<string, any[]>(); for (const x of ror) if (x.filer) grupper.set(String(x.filer), [...(grupper.get(String(x.filer)) ?? []), x]);
  const delning: string[] = [];
  for (const [monster, rs] of grupper) {
    if (rs.length < 2) continue;
    const varianter = new Map<string, number>(); let antal = 0;
    for (const docka of ['man', 'kvinna']) for (const n of utvidga(monster.replace(/<docka>/g, docka)) ?? []) {
      const hv = huvudet(n); if (!hv) continue;
      const {fps, rutor, vid} = hv; if (!ok(rutor) || !ok(vid)) continue;
      antal++; const nyckel = `${rs[0].namn ?? rs[0].id} i rutorna 0–${vid} (${sek(vid / fps)}), ${rs[1].namn ?? rs[1].id} i rutorna ${vid}–${rutor - 1} (${sek((rutor - 1 - vid) / fps)})`;
      varianter.set(nyckel, (varianter.get(nyckel) ?? 0) + 1);
    }
    delning.push(`- ${rs.map(x => x.id).join(' och ')} pekar på samma filer (\`${monster}\`): de är ritade i en fil, och rutan där kortet ligger (\`rests\` i filen) delar dem. ${antal ? `I de ${antal} filer som finns: ${[...varianter].map(([v, c]) => `${v}${varianter.size > 1 ? ` (${c} filer)` : ''}`).join('; ')}.` : 'Ingen av filerna finns.'}${rs.length > 2 ? ` (${rs.length} rörelser delar mönstret; bara de två första är räknade.)` : ''}`);
  }
  if (delning.length) { ut.push('', '**Rörelser som delar filer.**', '', delning.join('\n')); kallor.push({fil: `${DATA}<katalogens filer>`, hur: 'data (bara huvudet: fps, frameCount, rests)', ok: true}); }
  const iKatalog = new Set(ror.map(x => x.matt).filter(Boolean)), utanfor: string[] = [];
  for (const st of stilar) for (const n of Object.keys(livRor.styles[st]?.kinds ?? {})) if (!iKatalog.has(n) && !utanfor.includes(n)) utanfor.push(n);
  if (utanfor.length) ut.push('', 'Slag som de riktiga dealrarna gör men som katalogen inte har:', '', utanfor.map(n => `- \`${n}\`: ${stilar.map(st => `${STILNAMN[st] ?? st} ${slag(st, n)}`).join('; ')}`).join('\n'));
  if (!livRor) saknas.push('De riktiga dealrarnas slag av rörelser: `live-bj/data/rorelser.json` finns inte eller går inte att läsa, så katalogens kolumner för dem är tomma.');
}

// ==== 7. Det som inte har något mått i kod än ===================================================================
rubrik('## 7. Det som inte har något mått i kod än');
saknas.unshift(
  `Skons lutning: skon står plant på filten; bara frontplattan lutar (${gr(SHOE.plateLean * DEG)}, \`table-lens.ts SHOE.plateLean\`). Korten i skon har ingen egen lutning: de ligger mot plattan och lutar som den.`,
  'Kortets vändning i handbytet har inget eget tal i koden: koreo-giv.ts säger "cirka 90 grader" i en kommentar, och Jakob sa "cirka 100 grader".',
  'Handledens gräns 36 grader i DOMAR.md är ett resultat på de vända platserna, inte ett tal i koden; koden håller handen inom RAK och RAK_H (koreo-giv.ts, ovan).',
  'Livebordets sko: frontplattans lutning, skons höjd och mynningens vinkel (plattan står upp från filten och är bara mätt i bildpunkter). Livebordets markerbricka, insatsringar, kortrutor och deras vridning, och sargen, är inte mätta; platsmärkena är spelets ritade märken i bilden.',
  'Livebordets dealrar: var de sitter (hur långt bakom kanten), axlarnas höjd över filten och armarnas längd är inte mätta. Mätningen räknar med att axlarna står 0,2 m bakom kanten; det är ett antagande i stil-filernas text, inget mått.',
  'Livebordet: inga höjder från golvet (filten, bordet, stolen, dealern, kameran). Golvet syns inte i bilden, så det är inte mätt.',
  'Mannens och kvinnans ögon har ingen höjd i koden: ögonen är ben i modellerna (eyeL, eyeR i .glb-filerna), och närmast i koden är huvudets mitt. Blenders kamera dealer_ogon i standard.yaml är antagen, för den vita dockan.',
  `Stolens höjd: dockans rum sätter stolen under hennes lår när bilden ritas (standard-room.ts seatStool), så den har inget fast tal; det enda talet är standard.yaml:s antagna sits för den vita dockan.${olikaGolv.length ? ` Golvet står olika: ${m(GOLV, 2)} under filten i standarden (table-lens.ts TABLE_BASE.floor, dockans rum och Blender) och ${[...new Set(olikaGolv.map(y => m(y.golv, 2)))].join(' / ')} i 3D-scenens rum och sal (scene3d-room.ts och scene3d-hall.ts FLOOR).` : ''}`,
  'Antaget, inte mätt (`avatar-auto-pipeline/scen/standard.yaml`, skrivet av gen_standard.py): stolen, lådan för använda kort, kortbunten i skon, kortplatsernas ram, spelarnas platser och Blenders extra kameror (dealerns ögon, händerna, hela bordet, uppifrån).',
  'Dockornas räckvidd, mest lutning och mest vridning är gissade (doll.ts säger det själv i `about`).',
  'Blenders `standard.yaml` har ingen docka för mannen och kvinnan: dess `docka` är den vita dockan (doll.ts STANDARD) flyttad till Paows plats.',
  'Sidokamerans tal står två gånger, i editorns `standarddocka/editor/scen.ts` och i Blenders `scen/vy.py`; matt.ts läser scen.ts.',
  'Dockan blinkar inte och andas inte i grundrörelserna; det finns bara som valet i Hela rundan (rorelse.ts RUNDLIV), avstängt tills Jakob har sett det (DOMAR.md).',
);
ut.push(saknas.map(x => `- ${x}`).join('\n'));

rubrik('## Källorna');
ut.push('Det verktyget läste. "kod" är importerat som programmet självt använder det; "text" är tolkat ur filens text, därför att namnet inte exporteras eller filen inte går att importera i Node, och går sönder om skrivsättet ändras (då blir raden tom eller nämns här); "data" är en JSON-fil.', '',
  tabell(['Fil', 'Hur', 'Läst'], kallor.map(x => [k(x.fil), x.hur, x.ok ? 'ja' : `nej: ${x.varfor ?? 'gick inte att tolka'}`])));

// ---- skriv eller kolla ------------------------------------------------------------------------------------------
const nytt = ut.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
if (KOLLA) {
  const nu = las('MATT.md');
  if (nu === nytt) { console.log('MATT.md stämmer med källorna.'); process.exit(0); }
  if (nu === null) { console.log('MATT.md finns inte. Skriv den med: node matt.ts'); process.exit(1); }
  const a = nu.split('\n'), b = nytt.split('\n'), olika: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length) && olika.length < 15; i++) if (a[i] !== b[i]) olika.push(`rad ${i + 1}:\n  i MATT.md:      ${(a[i] ?? '(ingen rad)').slice(0, 220)}\n  ur källorna:    ${(b[i] ?? '(ingen rad)').slice(0, 220)}`);
  console.log(`MATT.md stämmer inte med källorna (${olika.length >= 15 ? 'minst 15' : olika.length} rader skiljer). Skriv om den med: node matt.ts\n${olika.join('\n')}`);
  process.exit(1);
}
writeFileSync(UT, nytt);
console.log(`MATT.md skriven: ${nytt.split('\n').length} rader, ${kallor.filter(x => !x.ok).length} källor gick inte att läsa.`);
