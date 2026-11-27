// Måtten på ett ställe (Jakob 2026-11-27: "en fil i typ roten på casino. Där ska vi skriva alla vinklar och lutningar,
// storlekar och annat i någon form av matris"). MATT.md är en utskrift av måtten där de redan står: Livestandarden i
// spelets kod, Blenders standard, dockornas rörelser, Jakobs domar och livebordets mätningar. Den är ingen ny källa: ett mått ändras
// där kolumnen Källa säger, och sedan skrivs MATT.md om. Talen läses som kod där det går (importerade); bara det som
// inte exporteras eller inte går att importera i Node tolkas ur text. Listan Källorna sist i MATT.md säger vilket.
// Inget här mäter något nytt: det som räknas (avstånd, vinklar, farter) räknas ur talen i källorna.
//   node matt.ts            skriver MATT.md
//   node matt.ts --kolla    skriver inget; slutar med kod 1 och visar raderna om MATT.md inte stämmer med källorna
//   node matt.ts --json     skriver inget; samma text som MATT.md, delad i rubriker, stycken, listor och tabeller, på en
//                           rad JSON (studions sida Mått läser den genom servern: blackjack-dealer/tools/casino-routes.ts)
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CARD} from './blackjack-dealer/src/space.ts';
import {LIVE, liveBox, liveSee, liveShoeCard} from './blackjack-dealer/src/table-live.ts';
import {BET} from './blackjack-dealer/src/standard.ts';
import {LIVE_DOLLS, dollFrame, type Doll} from './blackjack-dealer/dealer3d/src/doll.ts';

const ROOT = import.meta.dirname, UT = path.join(ROOT, 'MATT.md'), KOLLA = process.argv.includes('--kolla'), SOM_JSON = process.argv.includes('--json');
const DEG = 180 / Math.PI;

// ---- källorna ---------------------------------------------------------------------------------------------------
type Kalla = {fil: string; hur: string; ok: boolean; varfor?: string};
const kallor: Kalla[] = [
  {fil: 'blackjack-dealer/src/table-live.ts', hur: 'kod', ok: true},
  {fil: 'blackjack-dealer/src/space.ts', hur: 'kod', ok: true},
  {fil: 'blackjack-dealer/src/standard.ts', hur: 'kod', ok: true},
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
  kort: dom('2026-11-26', 'Våra kort som används i \'standarddocka\'-mappens editor är det som ska användas som standard'),
  takt: dom('2026-11-27', 'Att ge ett kort ska ta 1.2 sek och återgången 0.8'),
};

// ---- det som läses -------------------------------------------------------------------------------------------------
const yaml = lasYaml('avatar-auto-pipeline/scen/standard.yaml');
const DATA = 'blackjack-dealer/dealer3d/data/';
// Livebordet: mätt av live-bj/ på en film; läses om det finns, och är preliminärt tills filen själv säger att kameran är bekräftad.
const scen = data('live-bj/data/scen.json'), stilA = data('live-bj/data/stil-kameran.json'), stilB = data('live-bj/data/stil-bordet.json'), U = data('live-bj/data/uppsattning.json'), R = data('live-bj/data/reling.json');
const bekraftad = (o: any): boolean => !!o && typeof o === 'object' && Object.entries(o).some(([n, v]) => (/confirm|bekr/i.test(n) && v === true) || bekraftad(v));
const MATT = scen && bekraftad(scen.camera) ? 'Mätt på film' : 'Mätt på film (preliminärt)';
const LIVE_A = 'Danilo (dealer A, ser i kameran)', LIVE_B = 'Frasse (dealer B, ser på bordet)';
if (!U) saknas.push('Livebordets mätning: `live-bj/data/uppsattning.json` finns inte eller går inte att läsa, så kolumnen för det mätta är tom.');
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

const HUR: Record<string, string> = {measured: 'mätt', estimated: 'skattat', inferred: 'slutlett', assumed: 'antaget'};
const hur = (o: any) => HUR[/^\w+/.exec(typeof o?.how === 'string' ? o.how : '')?.[0] ?? ''] ?? '—';
const storst = (a: number[][] | undefined, b: number[][] | undefined) => a && b && a.length === b.length ? Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[2] - b[i][2]))) : undefined;
const lk = (n: string) => k('table-live.ts', n), L = LIVE, kantZ = -L.edge[2], franK = (p: readonly number[]) => p[2] - L.edge[2];

const ut: string[] = [];
const rubrik = (s: string) => ut.push('', s, '');
ut.push('# Måtten: Livestandarden, Danilo och Frasse', '',
  'Alla mått på ett ställe: kameran, bordet och det som står på det, var korten hamnar, dockorna och rörelserna, var och en bredvid det som är mätt på filmen av ett riktigt livebord och två riktiga dealrar (`live-bj/`).',
  '',
  '**Den här filen ändras aldrig för hand.** Den skrivs av `node matt.ts` (från repots rot) ur måttens egna källor, och skrivs över nästa gång. `node matt.ts --kolla` säger om den inte längre stämmer med källorna. Ett mått ändras på riktigt där kolumnen Källa säger (oftast `blackjack-dealer/src/table-live.ts`, se Källorna sist), och sedan körs `node matt.ts` igen. Jakobs domar står i `standarddocka/DOMAR.md`; kolumnen Jakobs dom citerar dem och är aldrig källan till ett tal.',
  '',
  `Så läses talen: meter, centimeter, millimeter, grader och sekunder. "Åt sidan" är åt dealerns vänster (bildens höger) med plus, räknat från kamerans fot. "Från kanten" är från bordets kant mot dealern, ut mot spelarna. Skillnaden är koden minus det mätta och ska vara noll där koden är kopierad ur mätningen; det som inte är mätt är vårt eget mått, märkt antaget.${MATT.includes('preliminärt') ? ' Mätningen är preliminär: kameran är inte bekräftad än.' : ''}`);

// ==== 1. Kameran ==================================================================================================
rubrik('## 1. Kameran');
{
  const uc = U?.camera, rk: string[][] = [], q = (matt: string, kod: string, mat: string, skill: string, kalla: string) => rk.push([matt, kod, mat, skill, hur(uc), kalla]);
  q('höjd över filten', m(L.camera.height, 4), visa(uc?.position?.[1], x => m(x, 4)), skillnad(L.camera.height, uc?.position?.[1], m), lk('LIVE_CAMERA.height'));
  q('lutning nedåt', gr(L.camera.pitch * DEG, 2), visa(uc?.tilt_down_degrees, x => gr(x, 2)), skillnad(L.camera.pitch * DEG, uc?.tilt_down_degrees, gr, false), lk('LIVE_CAMERA.pitch'));
  q('rullning', gr(L.camera.roll * DEG, 2), visa(uc?.roll_degrees, x => gr(x, 2)), skillnad(L.camera.roll * DEG, uc?.roll_degrees, gr, false), lk('LIVE_CAMERA.roll'));
  q('brännvidd', `${tal(L.camera.focalPx, 1)} bildpunkter`, visa(uc?.focal_px, x => `${tal(x, 1)} bildpunkter`), skillnad(L.camera.focalPx, uc?.focal_px, x => tal(x, 1)), lk('LIVE_CAMERA.focalPx'));
  q('bildvinkel i sidled och höjdled', `${gr(sidled(L.camera.focalPx, L.camera.film.width))} och ${gr(sidled(L.camera.focalPx, L.camera.film.height))}`, '', '', lk('LIVE_CAMERA'));
  q('bilden', form(L.camera.film.width, L.camera.film.height), Array.isArray(uc?.picture) ? form(uc.picture[0], uc.picture[1]) : '—', '—', lk('LIVE_CAMERA.film'));
  q('kanten mot dealern från kamerans fot', m(kantZ, 4), visa(U?.felt?.dealers_edge_z, x => m(-x, 4)), skillnad(kantZ, ok(U?.felt?.dealers_edge_z) ? -U.felt.dealers_edge_z : undefined, m), lk('LIVE.edge'));
  ut.push('Höjden är över filten och avstånden längs filten från kamerans fot (punkten rakt under den). Bildvinkeln är hela bildens, kant till kant. Brännvidden står i bildpunkter, eftersom det är så den är mätt. Spelet, dockans editor, inspelningen och varje beställning ser genom den här kameran.', '',
    tabell(['Mått', 'Koden', MATT, 'Skillnad', 'Hur säkert', 'Källa'], rk));
}

// ==== 2. Bordet och det som står på det ==========================================================================
rubrik('## 2. Bordet och det som står på det');
{
  const rk: string[][] = [], q = (sak: string, matt: string, kod: string, mat: string, skill: string, sakert: string, kalla: string, d = '') => rk.push([sak, matt, kod, mat, skill, sakert, kalla, d]);
  const uf = U?.felt, us = U?.shoe, ub = U?.box_for_used_cards;
  q('Filten', 'djup; bredd vid kanten mot dealern', `${m(L.felt.depth)}; ${m(L.felt.widthAtEdge)}`, ok(uf?.depth) ? `${m(uf.depth)}; ${m(uf.width_at_dealers_edge)}` : '—', skillnad(L.felt.depth, uf?.depth, m), hur(uf), lk('LIVE.felt'));
  q('', 'bågens radie; mitten bakom kanten', `${m(L.felt.radius, 4)}; ${cm(L.felt.edgeZ - L.felt.centre[2], 2)}`, ok(uf?.arc_radius) ? `${m(uf.arc_radius, 4)}; ${cm(uf.dealers_edge_z - uf.arc_centre[2], 2)}` : '—', skillnad(L.felt.radius, uf?.arc_radius, m), hur(uf), lk('LIVE.felt'));
  const ur = R?.rail, uh = R?.tray;
  q('Rullen', 'bredd utanför filten; rullens topp över filten; dess yttre sida under filtens nivå', `${cm(L.rail.width, 1)}; ${mm(L.rail.above, 0)}; ${mm(L.rail.below, 0)}`, ok(ur?.width) ? `${cm(ur.width, 1)}; ${mm(ur.above, 0)}; ${mm(ur.below, 0)} (${tal(ur.rmsPx, 1)} bildpunkter fel)` : '—', skillnad(L.rail.width, ur?.width, m), 'mätt (höjden svagt)', lk('LIVE.rail'));
  q('Hyllan bakom kanten, vid dealerns höger', 'högra sidans ytterkant i sidled; bakre sidan bakom kanten', `${m(L.shelf.right)}; ${m(L.shelf.back)}`, ok(uh?.right) ? `${m(uh.right)}; ${m(uh.back)}` : '—', skillnad(L.shelf.back, uh?.back, m), 'mätt', lk('LIVE.shelf'));
  const fot = [L.shoe.foot.byDealer, L.shoe.foot.towardPlayers, L.shoe.foot.back], kortet = liveShoeCard(L.shoe), uFront = us?.front_plate, uKort = us?.card_when_drawn?.middle;
  q('Skon', 'fotens längd × bredd', `${m(L.shoe.length)} × ${m(L.shoe.width)}`, ok(us?.foot_length) ? `${m(us.foot_length)} × ${m(us.foot_width)}` : '—', skillnad(L.shoe.length, us?.foot_length, m), hur(us), lk('LIVE.shoe'));
  q('', 'fotens tre hörn: största avstånd', '', '', visa(storst(fot as number[][], us?.foot), mm), hur(us), lk('LIVE.shoe.foot'));
  q('', 'höjd bak; den klara frontens topp', `${m(L.shoe.backHeight)}; ${m(L.shoe.frontHeight)}`, ok(us?.back_height) ? `${m(us.back_height)}; ${Array.isArray(uFront?.top_height) ? uFront.top_height.map((x: number) => m(x)).join(' och ') + ' (de två topphörnen)' : '—'}` : '—', skillnad(L.shoe.backHeight, us?.back_height, m), 'mätt', lk('LIVE.shoe'));
  q('', 'frontens lutning bakåt från lodrätt', gr(90 - L.shoe.plateLean * DEG), Array.isArray(uFront?.lean_back_degrees) ? `${uFront.lean_back_degrees.map((x: number) => gr(x)).join(' och ')} (de två topphörnen)` : '—', '—', 'mätt', lk('LIVE.shoe.plateLean'));
  q('', 'bädden kortleken ligger på: lutning från filten; höjd fram', `${gr(L.shoe.bedLean * DEG)}; ${mm(L.shoe.windowLift, 0)}`, ok(us?.bed?.lean_degrees) ? `${gr(us.bed.lean_degrees)}; ${mm(us.bed.height_at_front, 0)}` : '—', skillnad(L.shoe.bedLean * DEG, us?.bed?.lean_degrees, gr, false), hur(us?.bed), lk('LIVE.shoe.bedLean, windowLift'));
  q('', 'korten i skon: hur de ligger', 'långsidan tvärs skon, kortsidan uppför fronten, lutade som den', Array.isArray(us?.card_when_drawn?.pattern_mm) ? `ryggens mönster ${tal(us.card_when_drawn.pattern_mm[0], 0)} mm tvärs och ${tal(us.card_when_drawn.pattern_mm[1], 0)} mm uppför` : '—', '—', hur(us?.card_when_drawn), lk('liveShoeCard'));
  q('', 'kortleken längs bädden', m(L.shoe.deckLength), '—', '—', 'skattat', lk('LIVE.shoe.deckLength'));
  q('', 'nästa kort i fronten: mitten', `${m(kortet.centre[0])} åt sidan, ${m(franK(kortet.centre))} från kanten, ${cm(kortet.centre[1])} över filten`, Array.isArray(uKort) ? `${m(uKort[0])} åt sidan, ${m(franK(uKort))} från kanten, ${cm(uKort[1])} över filten` : '—', Array.isArray(uKort) ? mm(Math.hypot(kortet.centre[0] - uKort[0], kortet.centre[1] - uKort[1], kortet.centre[2] - uKort[2])) : '—', hur(us?.card_when_drawn), lk('liveShoeCard'));
  q('', 'den lösa klara biten framför skon: hörnen, största avstånd', '', '', visa(storst(L.clearPiece.corners as number[][], us?.clear_piece_before_the_shoe?.corners), mm), hur(us?.clear_piece_before_the_shoe), lk('LIVE.clearPiece'));
  const lada = liveBox(L.box);
  q('Lådan för använda kort', 'fotens mått; höjden', `${m(L.box.width)} × ${m(L.box.depth)}; ${m(L.box.height, 4)}`, ok(ub?.foot_width) ? `${m(ub.foot_width)} × ${m(ub.foot_depth)}; ${ub.height.map((x: number) => m(x)).join(' och ')}` : '—', skillnad(L.box.width, ub?.foot_width, m), hur(ub), lk('LIVE.box'));
  q('', 'mitten åt sidan; från kanten', `${m(lada.centre[0])}; ${m(franK(lada.centre))}`, '', visa(storst(L.box.foot as number[][], ub?.foot), x => `hörnen ${mm(x)}`), hur(ub), lk('liveBox'));
  q('', 'de använda korten', `ligger plant, ryggen upp; högen ${cm(L.box.pile)}`, ub?.cards ? 'ligger plant, ryggen upp' : '—', '—', 'mätt; högen skattad', lk('LIVE.box.pile'));
  q('Skärkortet', 'mitten åt sidan; från kanten', `${m(L.cutCard.middle[0])}; ${m(franK(L.cutCard.middle))}`, '', '', 'mätt', lk('LIVE.cutCard'));
  q('Markerbrickan', '', 'ingen (vår kan läggas till i Blender som ett tillägg: bygg_bord.py --med-bricka)', U?.chip_tray ? 'ingen' : '—', '—', hur(U?.chip_tray), lk('LIVE.tray'));
  q('Insatsmärkena', 'sju, största avstånd', `plats 4 ${m(franK(L.betMarks[3]))} från kanten`, '', visa(storst(L.betMarks as number[][], U?.bet_marks?.seats), mm), hur(U?.bet_marks), lk('LIVE.betMarks'));
  q('', 'ringen runt märket: radie', mm(BET.radius, 0), '— (spelets ritade knappar)', '—', 'antaget (vår)', k('standard.ts', 'BET'));
  const kortStorlek = scen?.camera?.cardSize, storlekar = kortStorlek ? Object.entries(kortStorlek).map(([n, v]) => ({n, v: v as number, mat: /([\d.]+) x ([\d.]+) mm/.exec(n)})).filter(x => x.mat) : [];
  const bast = storlekar.slice().sort((a, b) => a.v - b.v)[0];
  q('Kortet', 'bredd × höjd', `${mm(CARD.width, 1)} × ${mm(CARD.height, 1)}`, bast ? `passar bäst: ${bast.n.replace(/\./g, ',').replace(' x ', ' × ')} (fel ${tal(bast.v, 2)} bildpunkter)` : '—', bast ? `${skillnad(CARD.width, Number(bast.mat![1]) / 1000, mm, false)} × ${skillnad(CARD.height, Number(bast.mat![2]) / 1000, mm, false)}` : '—', 'mätt', `${k('space.ts', 'CARD')}; ${k('scen.json', 'camera.cardSize')}`, DOM.kort);
  q('', 'tjocklek och hörnradie', `${mm(CARD.thickness, 1)}; hörnen ${mm(CARD.corner, 1)}`, '—', '—', 'antaget (ett riktigt kort)', k('space.ts', 'CARD.thickness, corner'));
  if (ok(Y('kort.lekar_i_skon'))) q('', 'kortbunten i Blender', `${Y('kort.lekar_i_skon')} lekar`, '—', '—', 'antaget', k('standard.yaml', 'kort.lekar_i_skon'));
  q('Golvet', 'filten över golvet; sitsen', `${m(L.floor.feltOverFloor, 2)} (±${tal(L.floor.giveOrTake, 2)}); ${m(L.floor.seatOverFloor, 2)}`, ok(U?.floor?.felt_over_floor) ? `${m(U.floor.felt_over_floor, 2)}; ${m(U.floor.seat_over_floor, 2)}` : '—', skillnad(L.floor.feltOverFloor, U?.floor?.felt_over_floor, m), hur(U?.floor), lk('LIVE.floor'));
  ut.push(`Livebordet i koden (${k('blackjack-dealer/src/table-live.ts', 'LIVE')}), i kamerans linsvärld (kameran rakt över origo), kopierat ur mätningen (${k('live-bj/data/uppsattning.json')}) och byggt i Blender av ${k('avatar-auto-pipeline/scen/bygg_bord.py')}.`, '',
    tabell(['Sak', 'Mått', 'Koden', MATT, 'Skillnad', 'Hur säkert', 'Källa', 'Jakobs dom'], rk));
}

// ==== 3. Var korten hamnar ==========================================================================================
// En rad per kortplats: läget på filten, vridningen, och bildpunkten genom kameran, räknade ur koden (liveSee), så att de
// följer med när ett mått ändras.
rubrik('## 3. Var korten hamnar');
{
  const uk = (id: string) => { const [p, c] = id.split('.'); return U?.card_places?.[p === 'D' ? 'himself' : `seat ${p.slice(1)}`]?.[`card_${c.slice(1)}`]; };
  const kortRader = Object.entries(L.cards).map(([id, c]) => {
    const px = liveSee(c.at), x = uk(id), avst = x ? Math.hypot(c.at[0] - x.middle[0], c.at[2] - x.middle[2]) : undefined;
    return [id, m(c.at[0]), m(franK(c.at)), m(Math.hypot(c.at[0] - L.edge[0], franK(c.at))), `${gr(c.turn)} (${c.turnFrom})`, String(c.landings), px ? `${tal(px.x, 1)}; ${tal(px.y, 1)}` : '— (bakom kameran)', visa(avst, mm)];
  });
  ut.push(`Kortplatserna (${lk('LIVE.cards')}), kortets mitt. P är spelarnas platser och C kortets nummer, D dealerns egna. Platserna räknas i dag från bildens vänster: plats 1 längst till vänster i bilden, vid dealerns höger. Vridningen är kortets långsida från tvärs kanten som mätningen har den: "mätt" där landningarna var eniga, annars den speglade platsens. Bildpunkten (x; y, origo uppe till vänster) är kortets mitt i bilden ${L.camera.film.width} × ${L.camera.film.height} genom kameran (${lk('liveSee')}). Avståndet är koden mot mätningen (${k('uppsattning.json', 'card_places')}).`, '',
    tabell(['Plats', 'Åt sidan', 'Från kanten', 'Från kantens mitt', 'Vriden', 'Landningar', 'Bildpunkt', 'Mot mätningen'], kortRader));
}

// ==== 4. Dockorna ===================================================================================================
rubrik('## 4. Dockorna');
{
  const dockor = Object.values(LIVE_DOLLS), dr: string[][] = [];
  const drad = (matt: string, f: (d: Doll) => string, a: string, b: string, kalla: string) => dr.push([matt, ...dockor.map(f), a, b, kalla]);
  const axlar = (d: Doll) => dollFrame(d).shoulders, axelY = (d: Doll) => { const [a, b] = axlar(d); return (a[1] + b[1]) / 2; };
  const stil = (nm: 'kameran' | 'bordet') => L.dealer.styles[nm];
  drad('överarm; underarm', d => `${m(d.upperArm)}; ${m(d.forearm)}`, '—', '—', k('doll.ts', 'upperArm, forearm'));
  drad('räckvidd innan bålen böjer sig', d => m(d.reach), '—', '—', k('doll.ts', 'reach'));
  drad('handens längd, handled till långfingrets topp', d => d.hand ? m(Math.hypot(...d.hand.right[12])) : '—', '—', '—', k('doll.ts', 'hand.right[12]'));
  drad('axelbredd', d => { const [a, b] = axlar(d); return m(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])); }, m(stil('kameran').shoulderWidth), m(stil('bordet').shoulderWidth), `${k('doll.ts', 'dollFrame')}; ${lk('LIVE.dealer.styles.*.shoulderWidth')}`);
  drad('axlarnas mitt över filten', d => m(axelY(d)), m(stil('kameran').shouldersMiddle[1]), m(stil('bordet').shouldersMiddle[1]), `${k('doll.ts', 'place.shoulderHeight')}; ${lk('LIVE.dealer.styles.*.shouldersMiddle')}`);
  drad('ögonen över filten', () => '— (ben i modellen)', m(stil('kameran').eyesOverFelt), m(stil('bordet').eyesOverFelt), lk('LIVE.dealer.styles.*.eyesOverFelt'));
  drad('huvudets mitt över filten; radien', d => { const f = dollFrame(d); return `${m(f.head[1])}; ${m(f.headRadius)}`; }, '—', '—', k('doll.ts', 'dollFrame.head, headRadius'));
  drad('axlarna bakom kanten', d => m(d.place.behindEdge, 2), `${m(L.dealer.behindEdge, 2)} (antaget; skattat ${m(stil('kameran').behindEdgeEstimated, 2)})`, `${m(L.dealer.behindEdge, 2)} (antaget; skattat ${m(stil('bordet').behindEdgeEstimated, 2)})`, `${k('doll.ts', 'place.behindEdge')}; ${lk('LIVE.dealer.behindEdge')}`);
  drad('höften under filten', d => m(d.hipBelowFelt), '—', '—', k('doll.ts', 'hipBelowFelt'));
  drad('mest lutning framåt; mest vridning', d => `${gr(d.mostLean * DEG)}; ${gr(d.mostTwist * DEG)}`, '—', '—', k('doll.ts', 'mostLean, mostTwist'));
  drad('vänsterhandens grepp vid skon: höjd över filten', () => '—', cm(stil('kameran').leftAtShoe.atFront[1]), cm(stil('bordet').leftAtShoe.atFront[1]), lk('LIVE.dealer.styles.*.leftAtShoe'));
  ut.push(`Dockornas mått står i ${k('blackjack-dealer/dealer3d/src/doll.ts')}: Danilo och Frasse har kroppens mått och stil ur mätningen av de två dealrarna och vårt eget ansikte. De riktiga dealrarna är mätta i bilden, axlarna på ett plan antaget bakom kanten; armarnas längd går inte att mäta (dockans egna används).`, '',
    tabell(['Mått', ...dockor.map(d => d.name[0].toUpperCase() + d.name.slice(1)), LIVE_A, LIVE_B, 'Källa'], dr));
}

// ==== 5. Rörelserna =================================================================================================
// Dockornas rörelser är lyfta ur livebordets film (dealer3d/data/lyft-<docka>-*.json). Takten räknas ur varje fils eget huvud:
// greppet vid skon tills kortet lämnar den (leavesShoe), kortet ut tills det ligger (rests), och handen hem (till sista rutan).
rubrik('## 5. Rörelserna');
{
  const lyft = readdirSync(path.join(ROOT, DATA)).filter(n => /^lyft-[a-z]+-.+\.json$/.test(n)).sort();
  const huvud = (n: string) => { const t = las(`${DATA}${n}`), h = t?.slice(0, 400) ?? '', num = (x: string) => { const y = new RegExp(`"${x}":(\\d+(?:\\.\\d+)?)`).exec(h); return y ? Number(y[1]) : undefined; };
    return {fps: num('fps') ?? 30, rutor: num('frameCount'), ut: num('leavesShoe'), ligger: num('rests'), till: /"to":\["([^"]+)"/.exec(h)?.[1]}; };
  const rader = lyft.map(n => { const h = huvud(n), s = (r: Tal) => visa(ok(r) ? r / h.fps : undefined, sek);
    return [n.replace(/\.json$/, ''), h.till ?? '—', ok(h.rutor) ? `${h.rutor} rutor = ${sek(h.rutor / h.fps)}` : '—', s(h.ut), ok(h.ut) && ok(h.ligger) ? sek((h.ligger - h.ut) / h.fps) : '—', ok(h.ligger) && ok(h.rutor) ? sek((h.rutor - 1 - h.ligger) / h.fps) : '—']; });
  kallor.push({fil: `${DATA}lyft-*.json`, hur: 'data (bara huvudet: fps, frameCount, leavesShoe, rests, to)', ok: lyft.length > 0});
  ut.push(`Dockornas rörelser, lyfta ur livebordets film och lagda på dockans kropp (${k('blackjack-dealer/dealer3d/tools/lyft-till-docka.ts')}), en fil per rörelse i ${k(DATA)}. Takten ur varje fils huvud: greppet vid skon tills kortet lämnar den, kortet ut tills det ligger, och handen hem. Jakobs dom om takten: ${DOM.takt}.`, '',
    tabell(['Rörelsen', 'Till', 'Hela', 'Greppet vid skon', 'Kortet ut', 'Handen hem'], rader));
  const tr: string[][] = [], trad = (del: string, p: string) => tr.push([del, livecell(stilA, p, sek), livecell(stilB, p, sek), k('stil-*.json', p)]);
  trad('Greppet vid skon, tills kortet har lämnat den', 'tempo.left_at_shoe_s');
  trad('Vänsterhanden med kortet till mötet', 'tempo.left_back_with_card_s');
  trad('Händerna möts, räknat från att vänstern är framme', 'handover.meets_after_left_arrives_s');
  trad('Högerhanden ut med kortet', 'tempo.right_out_s');
  trad('Högerhanden hem', 'tempo.right_back_s');
  trad('Vänsterhanden tillbaka till skon efter släppet', 'tempo.left_to_shoe_s');
  trad('Från ett grepp vid skon till nästa, när han ger i följd', 'tempo.grip_to_grip_when_dealing_on_s');
  trad('En blinkning', 'blinks.seconds');
  ut.push('', 'De riktiga dealrarnas takt, medianer (inom parentes det minsta och största där stil-filen har räknat det på mer än en antagen höjd för handen):', '',
    tabell(['Delen', LIVE_A, LIVE_B, 'Källa'], tr));
}

// ==== 6. Rörelsekatalogen ===========================================================================================
// standarddocka/rorelsekatalog.json (lägena per hand, ankarena, rörelserna mellan dem, bryggorna, med status) bredvid
// det som är mätt på de riktiga dealrarna: hela livefilmen indelad per hand (live-bj/data/segment.json,
// dealrar.<A|B>.kategorier och lagen); för en rörelse kontrolleras att de lyft katalogen nämner finns i
// blackjack-dealer/dealer3d/data/.
rubrik('## 6. Rörelsekatalogen');
const katalog = data('standarddocka/rorelsekatalog.json'), seg = data('live-bj/data/segment.json');
const SEGNAMN: Record<string, string> = {A: 'Danilo (dealer A)', B: 'Frasse (dealer B)'};
const dealrar: string[] = seg?.dealrar && typeof seg.dealrar === 'object' ? Object.keys(seg.dealrar) : [];
const STATUS: Record<string, string> = {finns: 'finns', delvis: 'delvis', saknas: 'saknas', 'förslag': 'förslag'};
if (!katalog) saknas.push('Rörelsekatalogen: `standarddocka/rorelsekatalog.json` finns inte eller går inte att läsa.');
else {
  const ank: any[] = Array.isArray(katalog.ankare) ? katalog.ankare : [], ror: any[] = Array.isArray(katalog.rorelser) ? katalog.rorelser : [];
  const stad: any[] = Array.isArray(katalog.stadier) ? katalog.stadier : [], lagen: any[] = Array.isArray(katalog.lagen) ? katalog.lagen : [];
  const BEGREPP: Record<string, string> = {lage: 'Läge', ankare: 'Ankare', rorelse: 'Rörelse', stadium: 'Stadium', schemat: 'Schemat', brygga: 'Brygga', harmas_inte: 'Det som inte härmas'};
  const begrepp = katalog.begrepp && typeof katalog.begrepp === 'object' ? Object.entries(katalog.begrepp as Record<string, unknown>) : [];
  const stor = (t: string) => t ? t[0].toUpperCase() + t.slice(1) : t;
  ut.push(`Rörelseschemat som ${k('standarddocka/rorelsekatalog.json')} har det: det ändras där, inte här.${katalog.regel ? ' ' + katalog.regel : ''}`);
  if (begrepp.length) ut.push('', begrepp.map(([n, t]) => `- **${BEGREPP[n] ?? stor(n)}.** ${String(t)}`).join('\n'));
  // Ett läge i indelningen: lägena per plats (H3P1 … H3P7) räknas ihop under H3Pn.
  const iLaget = (dl: string, id: string) => {
    const l = seg?.dealrar?.[dl]?.lagen ?? {}, traff = Object.entries(l).filter(([n]) => n === id || (id.endsWith('Pn') && new RegExp(`^${id.slice(0, -1).replace('.', '\\.')}\\d$`).test(n))).map(([, v]) => v as any);
    if (!traff.length) return '—';
    return `${traff.reduce((s, v) => s + (v.stopp ?? 0), 0)} stopp, ${tal(traff.reduce((s, v) => s + (v.sekunder ?? 0), 0), 0)} s`;
  };
  if (lagen.length) ut.push('', '### Lägena per hand', '', `Var en hand är när ett klipp börjar och slutar. Bredvid: hur många gånger och hur länge sammanlagt handen står stilla i läget hos de riktiga dealrarna (${k('live-bj/data/segment.json', 'dealrar.<A|B>.lagen')}).`, '',
    tabell(['Läge', 'Hand', 'Namn', 'Var', 'I ankarena', 'Status', ...dealrar.map(dl => SEGNAMN[dl] ?? dl)],
      lagen.map(l => [String(l.id ?? ''), String(l.hand ?? ''), String(l.namn ?? ''), String(l.var ?? '') + (l.anteckning ? ` (${l.anteckning})` : ''), Array.isArray(l.i_ankare) && l.i_ankare.length ? l.i_ankare.join(', ') : '—', STATUS[l.status] ?? String(l.status ?? '—'), ...dealrar.map(dl => iLaget(dl, String(l.id)))])));
  ut.push('', '### Ankarena', '',
    tabell(['Ankare', 'Namn', 'Höger + vänster', 'Var händerna är', 'Status', 'Anteckning'], ank.map(a => [String(a.id ?? ''), String(a.namn ?? ''), a.lagen ? `${a.lagen.hoger ?? '?'} + ${a.lagen.vanster ?? '?'}` : '—', String(a.var ?? ''), STATUS[a.status] ?? String(a.status ?? '—'), String(a.anteckning ?? a.varfor ?? '')])));
  if (dealrar.length) {
    const par = new Map<string, Record<string, any>>();
    for (const dl of dealrar) for (const [n, v] of Object.entries(seg.dealrar[dl].bada_stilla ?? {})) par.set(n, {...(par.get(n) ?? {}), [dl]: v});
    const rader = [...par].sort(([, a], [, b]) => dealrar.reduce((s, dl) => s + (b[dl]?.sekunder ?? 0), 0) - dealrar.reduce((s, dl) => s + (a[dl]?.sekunder ?? 0), 0)).slice(0, 8);
    ut.push('', 'Båda händerna stilla samtidigt hos de riktiga dealrarna, de åtta vanligaste paren av lägen (en hel bild; de vanligaste är kandidaterna till ankare):', '',
      tabell(['Höger + vänster', 'Ankare', ...dealrar.map(dl => SEGNAMN[dl] ?? dl)], rader.map(([n, v]) => [n, ank.filter(a => a.lagen && `${a.lagen.hoger} + ${a.lagen.vanster}`.replace(/P\d|Pn/, 'Pn') === n).map(a => a.id).join(', ') || '—',
        ...dealrar.map(dl => v[dl] ? `${v[dl].ganger} gånger, ${tal(v[dl].sekunder, 1)} s` : '—')])));
  }
  /** De lyft katalogen nämner för en rörelse (fältet lyfta), och om de finns i dealer3d/data. */
  const filerFor = (r: any) => {
    const namn: string[] = Array.isArray(r.lyfta) ? r.lyfta : [];
    if (!namn.length) return {text: '—', stammer: r.status === 'finns' ? 'nej: katalogen säger finns men nämner inga lyft' : '— (inga lyft att leta efter)'};
    const har = namn.filter(n => existsSync(path.join(ROOT, DATA, `${n}.json`))), saknade = namn.filter(n => !har.includes(n));
    const stammer = saknade.length ? `nej: ${saknade.length} saknas (${saknade.slice(0, 8).join(', ')})` : r.status === 'saknas' ? `nej: katalogen säger saknas, men ${har.length} finns` : 'ja';
    return {text: namn.map(n => `\`${n}\``).join(', '), stammer};
  };
  /** En kategori i indelningen hos en dealer, hand för hand: hur många stycken och hur länge ett tar (median, 10–90 %). */
  const kategori = (dl: string, kat: any) => {
    if (!kat) return '— (ingen kategori i indelningen)';
    const k2 = seg?.dealrar?.[dl]?.kategorier ?? {}, delar: string[] = [];
    for (const hand of ['höger', 'vänster']) { const x = k2[`${kat} ${hand}`]; if (!x) continue; const s = x.sekunder ?? {};
      delar.push(`${hand} ${x.antal} st, ${visa(s.median, sek)}${ok(s.p10) && ok(s.p90) ? ` (${tal(s.p10, 2)}–${tal(s.p90, 2)})` : ''}`); }
    return delar.length ? delar.join('; ') : '— (inte i filmen)';
  };
  const radFor = (x: any) => { const f = filerFor(x); return [`${x.namn ?? ''} (${x.id ?? ''})`, `${x.fran ?? '?'} → ${x.till ?? '?'}${x.over ? ` (över ${x.over})` : ''}`, String(x.hander ?? ''), STATUS[x.status] ?? String(x.status ?? '—'), f.text, f.stammer,
    ...dealrar.map(dl => kategori(dl, x.segment)), x.segment ? `\`${x.segment}\`` : '—', String(x.anteckning ?? '')]; };
  const kol = ['Rörelse', 'Från → till', 'Händerna', 'Status', 'Filerna', 'Stämmer?', ...dealrar.map(dl => SEGNAMN[dl] ?? dl), 'Kategorin i indelningen', 'Anteckning'];
  ut.push('', '### Rörelserna, stadium för stadium', '', `I den ordning katalogen har stadierna. "Filerna" är rörelsens lyft i ${k('blackjack-dealer/dealer3d/data/')} (katalogens fält \`lyfta\`); "Stämmer?" jämför dem med katalogens status. Bredvid står samma kategori i indelningen av hela livefilmen (${k('live-bj/data/segment.json', 'dealrar.<A|B>.kategorier')}${MATT.includes('preliminärt') ? ', mätt på film, preliminärt' : ''}), hand för hand: hur många stycken och hur länge ett tar (median, och 10–90 % av dem). En kategori kan höra till flera rörelser: GIV är alla kort till en plats, vilket kort det än är.`);
  const kandaStadier = new Set(stad.map(st => st.id));
  for (const st of stad) {
    const egna = ror.filter(x => x.stadium === st.id);
    ut.push('', `#### ${st.namn ?? st.id} (${st.id}): hemankare ${st.hem ?? '?'}${st.nar ? `, ${st.nar}` : ''}`, '', egna.length ? tabell(kol, egna.map(radFor)) : 'Inga rörelser i katalogen än.');
  }
  const utanStadium = ror.filter(x => !kandaStadier.has(x.stadium));
  if (utanStadium.length) ut.push('', '#### Utan ett stadium som katalogen listar', '', tabell(kol, utanStadium.map(radFor)));
  const bryggor: any[] = Array.isArray(katalog.bryggor) ? katalog.bryggor : [], harmasEj: any[] = Array.isArray(katalog.harmas_inte) ? katalog.harmas_inte : [];
  if (bryggor.length) ut.push('', '### Bryggorna', '', tabell(['Brygga', 'Namn', 'Vad', 'Regel'], bryggor.map(b => [String(b.id ?? ''), String(b.namn ?? ''), String(b.vad ?? ''), String(b.regel ?? '')])));
  if (harmasEj.length) ut.push('', '### Det som inte härmas', '', tabell(['Kategori', 'Namn', 'Vad', ...dealrar.map(dl => SEGNAMN[dl] ?? dl)], harmasEj.map(x => [String(x.id ?? ''), String(x.namn ?? ''), String(x.vad ?? ''), ...dealrar.map(dl => kategori(dl, x.segment))])));
  // Kategorier i indelningen som varken en rörelse eller listan över det som inte härmas pekar på (stoppen i arbetet räknas inte).
  const iKatalog = new Set([...ror, ...harmasEj].map(x => x.segment).filter(Boolean)), utanfor: string[] = [];
  for (const dl of dealrar) for (const n of Object.keys(seg.dealrar[dl].kategorier ?? {})) { const kat = n.replace(/ (höger|vänster|huvud)$/, ''); if (!n.endsWith(' huvud') && kat !== 'STOPP' && !iKatalog.has(kat) && !utanfor.includes(kat)) utanfor.push(kat); }
  if (utanfor.length) ut.push('', 'Kategorier i indelningen som katalogen inte har en rörelse för:', '', utanfor.map(n => `- \`${n}\`: ${dealrar.map(dl => `${SEGNAMN[dl] ?? dl} ${kategori(dl, n)}`).join('; ')}`).join('\n'));
  if (!seg) saknas.push('Indelningen av livefilmen: `live-bj/data/segment.json` finns inte eller går inte att läsa, så katalogens kolumner för de riktiga dealrarna är tomma (görs med `live-bj/verktyg/segment.py dela`).');
}

// ==== 7. Det som inte har något mått i kod än ===================================================================
rubrik('## 7. Det som inte har något mått i kod än');
saknas.unshift(
  'Livebordets sko: kortleken ligger på en bädd som stiger bakåt, och korten lutar bakåt som fronten med långsidan tvärs skon. Bara kortlekens längd längs bädden är skattad: den krymper när korten delas ut (`table-live.ts LIVE.shoe`). Rullen är bara mätt i bildpunkter. Livebordet har ingen markerbricka; insatsmärkena är spelets ritade knappar i bilden.',
  'Dealrarna: hur långt bakom kanten de sitter är antaget (0,2 m; skattat 0,07–0,16 m), och armarnas längd går inte att mäta (dockans egna används).',
  'Golvet syns inte i bilden; filtens och sitsens höjd över golvet är slutledda ur dealrarnas ögon när de står, inte mätta.',
  'Danilos och Frasses ögon har ingen höjd i koden: ögonen är ben i modellerna (eyeL, eyeR i .glb-filerna), och närmast i koden är huvudets mitt.',
  'Antaget, inte mätt (`avatar-auto-pipeline/scen/standard.yaml`, skrivet av gen_standard.py): stolen, kortbunten i skon, kortplatsernas ram och Blenders extra kameror.',
  'Dockornas räckvidd, mest lutning och mest vridning är gissade (doll.ts säger det själv i `about`).',
);
ut.push(saknas.map(x => `- ${x}`).join('\n'));

rubrik('## Källorna');
ut.push('Det verktyget läste. "kod" är importerat som programmet självt använder det; "text" är tolkat ur filens text, därför att namnet inte exporteras eller filen inte går att importera i Node, och går sönder om skrivsättet ändras (då blir raden tom eller nämns här); "data" är en JSON-fil.', '',
  tabell(['Fil', 'Hur', 'Läst'], kallor.map(x => [k(x.fil), x.hur, x.ok ? 'ja' : `nej: ${x.varfor ?? 'gick inte att tolka'}`])));

// ---- skriv eller kolla ------------------------------------------------------------------------------------------
type Block = {typ: 'rubrik'; niva: number; text: string} | {typ: 'stycke'; text: string} | {typ: 'lista'; rader: string[]} | {typ: 'tabell'; huvud: string[]; rader: string[][]};
/** MATT.md:s text delad i block (för --json): rubriker, stycken, listor och tabeller, med cellerna utan sina \|. */
function somBlock(text: string): Block[] {
  const block: Block[] = [], celler = (r: string) => r.trim().replace(/^\|\s?|\s?\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
  let grupp: string[] = [], slag = '';
  const klar = () => {
    if (!grupp.length) return;
    if (slag === 'h') { const h = /^(#+) (.*)$/.exec(grupp[0])!; block.push({typ: 'rubrik', niva: h[1].length, text: h[2]}); }
    else if (slag === 't') { const [huvud, , ...rader] = grupp.map(celler); block.push({typ: 'tabell', huvud, rader}); }
    else if (slag === 'l') block.push({typ: 'lista', rader: grupp.map(r => r.slice(2))});
    else block.push({typ: 'stycke', text: grupp.join(' ')});
    grupp = [];
  };
  for (const rad of text.split('\n')) {
    if (!rad.trim()) { klar(); slag = ''; continue; }
    const s = rad.startsWith('|') ? 't' : rad.startsWith('- ') ? 'l' : /^#{1,6} /.test(rad) ? 'h' : 's';
    if (s !== slag || s === 'h') { klar(); slag = s; }
    grupp.push(rad);
  }
  klar();
  return block;
}

const nytt = ut.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
if (SOM_JSON) { console.log(JSON.stringify({block: somBlock(nytt), olasta: kallor.filter(x => !x.ok).length})); process.exit(0); }
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
