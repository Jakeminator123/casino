// Kroppens gränser i editorn. Jakob 2026-11-26, om en armbåge dragen in i bålen: "Sånna här rörelser ska ju bara inte
// gå", de "borde vara blockerade". Det han drar i stannar därför vid kroppen, bordet och vad en led kan. Rent: ingen
// three.js och ingen I/O, så att sidan och ett verktyg räknar likadant.
//
// Måtten mäts på dockans hud en gång (armar.ts matKropp), i bålens egna axlar, de som dealer3d/src/figure-model.ts
// ställer bålen efter: origo mitt mellan rutans axlar, x från hans högra axel mot hans vänstra, y upp från höften mot
// axlarnas mitt, z framåt. Bålen ställs stelt, så måtten gäller i varje ruta. Armen räknas som figure-model.ts ställer
// den: från modellens egen axelled till rutans handled med modellens benlängder, armbågen åt det håll rutans armbåge står.
//
// Spärren rör bara det en ändring gör. Ställningen utan ändringar räknas också, och det den själv gör (en arm som ligger
// an mot bålen, en armbåge i en viss vinkel, en hand långt ut) är tillåtet: en ändring får inte göra det värre.
import type {Frame, Led, Limb, V3} from './rorelse.ts';

// ---- små räknesätt -------------------------------------------------------------------------------------------
type P = readonly number[];
const add = (a: P, b: P): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: P, b: P): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: P, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const mix = (a: P, b: P, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const dot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: P, b: P): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: P) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: P): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** `a` utan sin del längs enhetsvektorn `n`, som enhetsvektor (figure-model.ts flatten). */
const plan = (a: P, n: P): V3 => norm(sub(a, mul(n, dot(a, n))));
/** `v` vriden `vinkel` radianer kring enhetsvektorn `k`. */
const vrid = (v: P, k: P, vinkel: number): V3 => { const c = Math.cos(vinkel), s = Math.sin(vinkel); return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))); };
const vinkelMellan = (a: P, b: P) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * GRAD;
/** En vinkel i grader lagd mellan -180 och 180. */
const runt = (g: number) => ((g + 180) % 360 + 360) % 360 - 180;
const smooth = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
const GRAD = 180 / Math.PI;

// ---- måtten --------------------------------------------------------------------------------------------------
/** Bordet: kanten mot dealern (filten är framför den, z större) och skivans överkant. */
export type Bord = {kantZ: number; skivaY: number};
/** En arm: modellens axelled (bålens axlar), överarmens och underarmens längd (meter), och tjockleken (radie) i tio fack längs var och en, från leden närmast axeln. */
export type Arm = {axel: V3; over: number; under: number; tjockOver: number[]; tjockUnder: number[]};
/**
 * Kroppen i bålens axlar. `bal`: skivor på höjden, den första vid y0 och sedan dy meter isär, varje skiva med sin mitt (x, z)
 * och sin radie åt `r.length` håll runt mitten (vinkeln räknad från +x mot +z). `huvud`: en kula.
 */
export type Kroppsmatt = {bal: {y0: number; dy: number; skivor: {x: number; z: number; r: number[]}[]}; huvud: {c: V3; r: number}; armar: Record<'R' | 'L', Arm>};
export type Granser = {matt: Kroppsmatt; bord: Bord};

/**
 * Gränserna. armTjocklek: armen räknas så här tjock av den mätta (huden ger efter, och en arm får ligga an). hoppaOver:
 * den del av överarmen närmast axeln som inte prövas (den sitter i axeln). underarmBord: den del av underarmen närmast
 * handleden som får ligga på filten (handen vilar där, som armar.ts ARMAR.handen). armbage: hur långt armbågen kan stå
 * kring linjen axel–handled, grader från rakt ned (negativt in mot kroppen, positivt ut och upp). bojd: mest armbågen
 * böjs (grader från rak). handled: mest handen står från underarmens linje (grader). tol: det som är för litet att räknas
 * (meter, grader).
 */
export const GRANS = {armTjocklek: 0.85, hoppaOver: 1 / 3, underarmBord: 0.2, armbage: [-40, 130] as const, bojd: 150, handled: 75, tol: 0.001, tolGrader: 0.5};
/** Handens 21 punkters tjocklek (radie, meter): fingrarna som dealer3d/src/hand-rule.ts ritar dem (DRAWN), handleden och tummens rot som handflatan. */
const HAND_R = [0.02, 0.012, 0.0088, 0.0082, 0.0076, ...[0, 1, 2, 3].flatMap(() => [0.0078, 0.0071, 0.0064, 0.0064])];
/** Filten ligger på y = 0; en hand får gå 2 mm in i den, som hand-rule.ts inFelt räknar. */
const FILT_TOL = 0.002;

// ---- bålens axlar --------------------------------------------------------------------------------------------
export type Axlar = {o: V3; x: V3; y: V3; z: V3};
/** Bålens axlar i en ruta, som figure-model.ts pose ställer bålen. */
export function balensAxlar(f: Frame, hip: P): Axlar {
  const o = mix(f.R.s, f.L.s, 0.5), x = norm(sub(f.L.s, f.R.s)), z = norm(cross(x, norm(sub(o, hip)))), y = cross(z, x);
  return {o, x, y, z};
}
/** En punkt i världen i bålens axlar. */
export const iBalensAxlar = (a: Axlar, p: P): V3 => { const d = sub(p, a.o); return [dot(d, a.x), dot(d, a.y), dot(d, a.z)]; };
const riktning = (a: Axlar, q: P): V3 => add(add(mul(a.x, q[0]), mul(a.y, q[1])), mul(a.z, q[2]));
const iVarlden = (a: Axlar, q: P): V3 => add(a.o, riktning(a, q));

// ---- djupet --------------------------------------------------------------------------------------------------
/** Hur djupt (meter) en kula ligger i något, och åt vilket håll (världen) den kommer ut närmast. */
type Djup = {djup: number; ut: V3};
/** En kula med radien r i `p` (världen) mot bålen; null utanför bålens höjd. Ut är rakt ut från skivans mitt. */
function iBalen(m: Kroppsmatt, a: Axlar, p: P, r: number): Djup | null {
  const q = iBalensAxlar(a, p), {y0, dy, skivor} = m.bal, i = (q[1] - y0) / dy;
  if (!(i >= 0 && i <= skivor.length - 1)) return null;
  const k = Math.min(skivor.length - 2, Math.floor(i)), t = i - k, A = skivor[k], B = skivor[k + 1];
  const dx = q[0] - (A.x + (B.x - A.x) * t), dz = q[2] - (A.z + (B.z - A.z) * t), d = Math.hypot(dx, dz), n = A.r.length;
  const u = ((Math.atan2(dz, dx) / (2 * Math.PI)) * n + n) % n, j = Math.floor(u) % n, f = u - Math.floor(u);
  const radie = (s: {r: number[]}) => s.r[j] + (s.r[(j + 1) % n] - s.r[j]) * f, R = radie(A) + (radie(B) - radie(A)) * t;
  return {djup: R + r - d, ut: d > 1e-6 ? riktning(a, [dx / d, 0, dz / d]) : a.z};
}
function iHuvudet(m: Kroppsmatt, a: Axlar, p: P, r: number): Djup {
  const d = sub(p, iVarlden(a, m.huvud.c)), l = len(d); return {djup: m.huvud.r + r - l, ut: l > 1e-6 ? mul(d, 1 / l) : a.z};
}
/** Hur djupt en del av armen ligger i bordets skiva där den är över bordet; -Infinity bakom kanten. */
const iBordet = (b: Bord, p: P, r: number) => p[2] > b.kantZ ? b.skivaY + r - p[1] : -Infinity;
/** Hur djupt en del av handen ligger i filten (mer än FILT_TOL) där den är över bordet; -Infinity bakom kanten. */
const iFilten = (b: Bord, p: P, r: number) => p[2] > b.kantZ ? r - FILT_TOL - p[1] : -Infinity;

// ---- armen som modellen ställer den ----------------------------------------------------------------------------
/**
 * Modellens arm mot handleden `w`: axelleden S, riktningen mot handleden, hur långt längs den och hur långt ut armbågen
 * står (figure-model.ts pose), och kring linjen två riktningar: rakt ned (bålens ned, lite bakåt där armen pekar rakt ned)
 * och ut från kroppen (vinkeln 90 grader), så att en armbåges vinkel är densamma i varje ruta.
 */
type Armgeo = {S: V3; W: V3; avst: number; dir: V3; ned: V3; ut: V3; langs: number; h: number};
function armen(a: Axlar, arm: Arm, sida: 'R' | 'L', w: P): Armgeo {
  const S = iVarlden(a, arm.axel), d = sub(w, S), avst = len(d), dir = norm(d), {over, under} = arm;
  const far = Math.min(over + under - 0.002, Math.max(Math.abs(over - under) + 0.002, avst)), langs = (over * over - under * under + far * far) / (2 * far);
  const ned = plan(add(mul(a.y, -1), mul(a.z, -0.3)), dir), ut = mul(cross(dir, ned), sida === 'R' ? -1 : 1);
  return {S, W: [w[0], w[1], w[2]], avst, dir, ned, ut, langs, h: Math.sqrt(Math.max(0, over * over - langs * langs))};
}
const armbagen = (g: Armgeo, grader: number): V3 => { const v = grader / GRAD; return add(add(g.S, mul(g.dir, g.langs)), mul(add(mul(g.ned, Math.cos(v)), mul(g.ut, Math.sin(v))), g.h)); };
/** Vinkeln (grader) som rutans armbåge ger modellens: sedd från rutans linje axel–handled och sedan från modellens, som figure-model.ts gör. */
function begard(g: Armgeo, limb: Limb): number {
  const sida = plan(plan(sub(limb.e, limb.s), norm(sub(limb.w, limb.s))), g.dir);
  return Math.atan2(dot(sida, g.ut), dot(sida, g.ned)) * GRAD;
}
const fackVid = (f: readonly number[], s: number) => f[Math.min(f.length - 1, Math.max(0, Math.floor(s * f.length)))];
/** Hur djupt armen (överarmen utan sin första tredjedel, och underarmen) ligger i bålen, huvudet och bordet med armbågen i E. */
function armensDjup(gr: Granser, a: Axlar, g: Armgeo, arm: Arm, E: V3) {
  const d = {kroppen: -Infinity, huvudet: -Infinity, bordet: -Infinity}, hand = add(E, mul(norm(sub(g.W, E)), arm.under));
  const prova = (p: V3, r: number, bord: boolean) => { r *= GRANS.armTjocklek; const k = iBalen(gr.matt, a, p, r); if (k) d.kroppen = Math.max(d.kroppen, k.djup);
    d.huvudet = Math.max(d.huvudet, iHuvudet(gr.matt, a, p, r).djup); if (bord) d.bordet = Math.max(d.bordet, iBordet(gr.bord, p, r)); };
  for (let k = 0; k <= 5; k++) { const s = GRANS.hoppaOver + (1 - GRANS.hoppaOver) * k / 5; prova(mix(g.S, E, s), fackVid(arm.tjockOver, s), true); }
  for (let k = 1; k <= 6; k++) { const s = k / 6; prova(mix(E, hand, s), fackVid(arm.tjockUnder, s), s <= 1 - GRANS.underarmBord + 1e-9); }
  return d;
}
/** Hur djupt handen (handleden och de 20 punkterna, var och en med sin tjocklek), flyttad `d`, ligger i bålen, huvudet och filten. */
function handensDjup(gr: Granser, a: Axlar, limb: Limb, d: P = [0, 0, 0]) {
  let kroppen: Djup = {djup: -Infinity, ut: a.z}, huvudet: Djup = {djup: -Infinity, ut: a.z}, filten = -Infinity;
  for (let i = 0; i < 21; i++) { const p = add(i ? limb.p[i] : limb.w, d), r = HAND_R[i], k = iBalen(gr.matt, a, p, r), h = iHuvudet(gr.matt, a, p, r);
    if (k && k.djup > kroppen.djup) kroppen = k; if (h.djup > huvudet.djup) huvudet = h; filten = Math.max(filten, iFilten(gr.bord, p, r)); }
  return {kroppen, huvudet, filten};
}
/** Hur långt (grader) handen står från underarmens linje: från armbågen till handleden mot handledens väg till långfingrets knoge (figure-model.ts forward). */
const handledsvinkel = (limb: Limb, E: V3) => vinkelMellan(sub(limb.w, E), sub(limb.p[9], limb.p[0]));
/** Hur långt från axelleden handleden kan stå: armen rak, och armbågen böjd så mycket den kan. */
const nar = (arm: Arm) => ({mest: arm.over + arm.under - 0.002, minst: Math.sqrt(arm.over ** 2 + arm.under ** 2 - 2 * arm.over * arm.under * Math.cos((180 - GRANS.bojd) / GRAD))});
/** Allt som prövas på en arm i en ställning. */
function matArm(gr: Granser, a: Axlar, f: Frame, s: 'R' | 'L') {
  const arm = gr.matt.armar[s], limb = f[s], g = armen(a, arm, s, limb.w), vinkel = begard(g, limb), E = armbagen(g, vinkel);
  return {hand: handensDjup(gr, a, limb), avst: g.avst, vinkel, arm: armensDjup(gr, a, g, arm, E), handled: handledsvinkel(limb, E)};
}

// ---- spärren -------------------------------------------------------------------------------------------------
export type Orsak = 'kroppen' | 'huvudet' | 'bordet' | 'filten' | 'rackvidden' | 'bojen' | 'axeln' | 'handleden';
/** Det spärren höll emot: leden, vad som tog emot, hur mycket (millimeter eller grader) och det i vanliga ord. */
export type Stopp = {led: Led; orsak: Orsak; mangd: number; enhet: 'mm' | 'grader'; text: string};
const TEXT: Record<'Hand' | 'Armbage', Partial<Record<Orsak, string>>> = {
  Hand: {kroppen: 'hand kan inte gå längre in: kroppen är i vägen.', huvudet: 'hand kan inte gå längre in: huvudet är i vägen.', filten: 'hand kan inte gå längre ned: den ligger på filten.',
    rackvidden: 'hand når inte längre: armen är rak.', bojen: 'hand kan inte komma närmare axeln: armbågen är böjd så mycket den kan.', handleden: 'hand kan inte böjas mer: handleden går inte längre.'},
  Armbage: {kroppen: 'armbåge kan inte gå längre in: kroppen är i vägen.', huvudet: 'armbåge kan inte gå längre: huvudet är i vägen.', bordet: 'armbåge kan inte gå längre ned: armen tar i bordet.'}};

/**
 * Håller ställningen C (med ändringar) inom gränserna där ändringarna rör armarna `sidor`, mot B, samma ställning utan
 * ändringar. C ändras på plats och lämnas tillbaka med det som hölls emot. `held`: hur mycket var hand håller kortet
 * (kortet följer en hand som flyttas eller vrids, som i rorelse.ts medAndringar).
 */
export function hallInom(B: Frame, C: Frame, held: {R: number; L: number}, hip: P, gr: Granser, sidor: readonly ('R' | 'L')[]): {frame: Frame; stopp: Stopp[]} {
  const a = balensAxlar(C, hip), stopp: Stopp[] = [];
  for (const s of sidor) hallArmen(gr, a, B, C, s, held[s], stopp);
  for (const x of stopp) x.mangd = Math.round(x.mangd * 10) / 10;
  return {frame: C, stopp};
}

function hallArmen(gr: Granser, a: Axlar, B: Frame, C: Frame, s: 'R' | 'L', held: number, stopp: Stopp[]) {
  const arm = gr.matt.armar[s], limb = C[s], grund = matArm(gr, a, B, s), {mest, minst} = nar(arm), {tol, tolGrader} = GRANS, vem = s === 'R' ? 'Höger' : 'Vänster';
  const stoppa = (del: 'Hand' | 'Armbage', orsak: Orsak, mangd: number, enhet: 'mm' | 'grader', text = `${vem} ${TEXT[del][orsak]}`) => {
    const led = `${s === 'R' ? 'hoger' : 'vanster'}${del}` as Led, finns = stopp.find(x => x.led === led && x.orsak === orsak);
    if (finns) finns.mangd += mangd; else stopp.push({led, orsak, mangd, enhet, text}); };
  // Handen flyttas hel: handleden och punkterna, armbågen halva vägen (som i medAndringar), kortet om handen håller det.
  const flytta = (d: V3, orsak: Orsak) => { limb.w = add(limb.w, d); limb.p = limb.p.map(p => add(p, d)); limb.e = add(limb.e, mul(d, 0.5));
    if (held > 0) C.card.c = add(C.card.c, mul(d, held)); stoppa('Hand', orsak, len(d) * 1000, 'mm'); };
  // Handen vrids tillbaka kring handleden tills den står högst GRANS.handled (eller som utan ändringar) från underarmen.
  const tillatHandled = Math.max(GRANS.handled, grund.handled);
  const handleden = (E: V3) => {
    const fram = norm(sub(limb.p[9], limb.p[0])), mot = norm(sub(limb.w, E)), v = vinkelMellan(mot, fram); if (v <= tillatHandled + tolGrader) return;
    const kors = cross(fram, mot), axel = len(kors) > 1e-6 ? norm(kors) : plan(a.y, fram), vinkel = (v - tillatHandled) / GRAD, piv: V3 = [limb.w[0], limb.w[1], limb.w[2]];
    limb.p = limb.p.map(p => add(piv, vrid(sub(p, piv), axel, vinkel)));
    if (held > 0) { const k = vinkel * held; C.card.c = add(piv, vrid(sub(C.card.c, piv), axel, k)); C.card.l = vrid(C.card.l, axel, k); C.card.n = vrid(C.card.n, axel, k); }
    stoppa('Hand', 'handleden', v - tillatHandled, 'grader'); };

  // 1. Handleden, mot underarmen som armbågen begärs (före handens läge, så att fingrar som vrids ned i filten inte lyfter handen i onödan).
  const g0 = armen(a, arm, s, limb.w); handleden(armbagen(g0, begard(g0, limb)));
  // 2. Handen. Går den in i bålen eller huvudet djupare än utan ändringar, stannar den där den först tar i på vägen från
  // handleden utan ändringar till den begärda (så att den inte slinker igenom eller slår över till andra sidan när han drar
  // vidare). Sedan upp ur filten, inom armens räckvidd från modellens axelled, och det som återstår av bålen och huvudet
  // ut åt närmaste håll.
  const tK = Math.max(0, grund.hand.kroppen.djup), tH = Math.max(0, grund.hand.huvudet.djup), tF = Math.max(0, grund.hand.filten), tMest = Math.max(mest, grund.avst), tMinst = Math.min(minst, grund.avst);
  const vag = sub(limb.w, B[s].w), iKroppen = (k: number) => { const h = handensDjup(gr, a, limb, mul(vag, k - 1)), x = h.kroppen.djup - tK, y = h.huvudet.djup - tH; return {mer: Math.max(x, y), orsak: (x >= y ? 'kroppen' : 'huvudet') as Orsak}; };
  if (len(vag) > 1e-4 && iKroppen(0).mer <= tol) {
    let ok = 0, inne = -1, orsak: Orsak = 'kroppen';
    for (let i = 1; i <= 40; i++) { const k = i / 40, b = iKroppen(k); if (b.mer > tol) { inne = k; orsak = b.orsak; break; } ok = k; }
    if (inne > 0) { for (let j = 0; j < 12; j++) { const m = (ok + inne) / 2; if (iKroppen(m).mer > tol) inne = m; else ok = m; } flytta(mul(vag, ok - 1), orsak); }
  }
  for (let varv = 0; varv < 3; varv++) {
    let h = handensDjup(gr, a, limb);
    if (h.filten > tF + tol) { flytta([0, h.filten - tF, 0], 'filten'); h = handensDjup(gr, a, limb); }
    const g = armen(a, arm, s, limb.w);
    if (g.avst > tMest + tol) flytta(mul(g.dir, tMest - g.avst), 'rackvidden'); else if (g.avst < tMinst - tol) flytta(mul(g.dir, tMinst - g.avst), 'bojen');
    h = handensDjup(gr, a, limb);
    if (h.kroppen.djup > tK + tol) { flytta(mul(h.kroppen.ut, h.kroppen.djup - tK), 'kroppen'); h = handensDjup(gr, a, limb); }
    if (h.huvudet.djup > tH + tol) flytta(mul(h.huvudet.ut, h.huvudet.djup - tH), 'huvudet');
  }
  // 3. Armbågen ligger på en cirkel kring linjen axel–handled. Den begärda vinkeln räknas från vinkeln utan ändringar (så att
  // den inte slår runt), hålls inom vad axeln klarar, och prövas: går armen in i bålen, huvudet eller bordet djupare än utan
  // ändringar, går armbågen från vinkeln utan ändringar mot den begärda och stannar där något tar emot.
  const g = armen(a, arm, s, limb.w), lo = Math.min(GRANS.armbage[0], grund.vinkel), hi = Math.max(GRANS.armbage[1], grund.vinkel);
  const tA = {kroppen: Math.max(0, grund.arm.kroppen), huvudet: Math.max(0, grund.arm.huvudet), bordet: Math.max(0, grund.arm.bordet)};
  const bryter = (v: number) => { const d = armensDjup(gr, a, g, arm, armbagen(g, v)); let mer = 0, orsak: Orsak = 'kroppen';
    for (const k of ['kroppen', 'huvudet', 'bordet'] as const) if (d[k] - tA[k] > mer) { mer = d[k] - tA[k]; orsak = k; } return {mer, orsak}; };
  // En armbåge som dras nära linjen axel–handled säger inte åt vilket håll den står (figure-model.ts läser bara riktningen
  // från linjen): den slår runt på en ruta när den passerar linjen. Där dämpas därför den begärda vinkeln mot vinkeln utan
  // ändringar, mjukt när den dragna armbågen kommer närmare linjen än halva avståndet utan ändringar.
  const fran = (l: Limb) => { const own = norm(sub(l.w, l.s)), e0 = sub(l.e, l.s); return len(sub(e0, mul(own, dot(e0, own)))); };
  const rak = grund.vinkel + runt(begard(g, limb) - grund.vinkel), dampa = smooth(fran(limb) / Math.max(0.01, 0.5 * fran(B[s])));
  const mal = grund.vinkel + (rak - grund.vinkel) * dampa, inom = Math.max(lo, Math.min(hi, mal));
  // Hela vägen prövas, inte bara målet: en armbåge som dras förbi kroppen ska inte hoppa till andra sidan av den.
  const start = Math.max(lo, Math.min(hi, grund.vinkel)); let vinkel = inom, hinder: Orsak | null = null;
  if (bryter(start).mer <= tol) {
    // Från vinkeln utan ändringar mot den begärda, en grad i taget, och sedan halvering mot det första som tar emot.
    const n = Math.ceil(Math.abs(inom - start)); let ok = start;
    for (let k = 1; k <= n; k++) { const v = start + (inom - start) * k / n, b = bryter(v); if (b.mer <= tol) { ok = v; continue; }
      hinder = b.orsak; let inne = v; for (let j = 0; j < 12; j++) { const m = (ok + inne) / 2; if (bryter(m).mer > tol) inne = m; else ok = m; } vinkel = ok; break; }
  } else if (bryter(inom).mer > tol) {
    // Redan vinkeln utan ändringar tar emot (handen har flyttats): den tillåtna vinkel som ligger närmast den begärda, annars den som bryter minst.
    let ok: number | null = null, minstV = start, minstMer = Infinity; hinder = bryter(inom).orsak;
    for (let v = lo; v <= hi + 1e-9; v += 2) { const b = bryter(v).mer; if (b <= tol && (ok === null || Math.abs(v - inom) < Math.abs(ok - inom))) ok = v; if (b < minstMer) { minstMer = b; minstV = v; } }
    vinkel = ok ?? minstV;
  }
  if (hinder) stoppa('Armbage', hinder, Math.abs(mal - vinkel), 'grader');
  else if (Math.abs(mal - inom) > tolGrader) stoppa('Armbage', 'axeln', Math.abs(mal - inom), 'grader', `${vem} armbåge kan inte gå längre ${inom >= hi ? 'ut och upp' : 'in mot kroppen'}: axeln går inte längre.`);
  // Rutans armbåge skrivs om så att figure-model.ts ställer armen dit: lika långt längs och ut från rutans linje
  // axel–handled som armbågen utan ändringar (så att en armbåge som står kvar i sitt läge är rutans egen), åt det håll som
  // efter båda plattningarna (rutans linje, sedan modellens) blir den valda vinkeln.
  if (Math.abs(vinkel - rak) > 1e-6) {
    const v = vinkel / GRAD, u = add(mul(g.ned, Math.cos(v)), mul(g.ut, Math.sin(v))), own = norm(sub(limb.w, limb.s)), dd = dot(g.dir, own), n = Math.abs(dd) > 0.2 ? norm(add(u, mul(g.dir, -dot(u, own) / dd))) : u;
    const e0 = sub(B[s].e, B[s].s), ownB = norm(sub(B[s].w, B[s].s)), langs = dot(e0, ownB), ut = len(sub(e0, mul(ownB, langs)));
    limb.e = add(add(limb.s, mul(own, langs)), mul(n, ut > 0.01 ? ut : g.h));
  }
  // 4. Handleden igen, mot underarmen som den blev, och filten igen (handen lyfts bara).
  handleden(armbagen(g, vinkel));
  const fl = handensDjup(gr, a, limb).filten; if (fl > tF + tol) flytta([0, fl - tF, 0], 'filten');
}

// ---- grundrörelsens egna brott ---------------------------------------------------------------------------------
export type Slag = 'balen' | 'huvudet' | 'bordet' | 'filten' | 'armbagen' | 'rackvidden' | 'bojen' | 'handleden';
/**
 * Hur långt en ställning går utanför gränserna, per arm: millimeter (balen och huvudet: handen eller armen i dem; bordet:
 * armen i skivan; filten: handen i den; rackvidden: handleden bortom armens längd; bojen: närmare axeln än armbågen kan
 * böjas) eller grader (armbagen: utanför vad axeln klarar; handleden: mer än GRANS.handled). 0 där den håller sig inom.
 */
export function brott(f: Frame, hip: P, gr: Granser): Record<'R' | 'L', Record<Slag, number>> {
  const a = balensAxlar(f, hip), mm = (x: number) => x > GRANS.tol ? Math.round(x * 10000) / 10 : 0, grader = (x: number) => x > GRANS.tolGrader ? Math.round(x * 10) / 10 : 0, [lo, hi] = GRANS.armbage;
  const arm = (s: 'R' | 'L'): Record<Slag, number> => { const m = matArm(gr, a, f, s), {mest, minst} = nar(gr.matt.armar[s]);
    return {balen: mm(Math.max(m.hand.kroppen.djup, m.arm.kroppen)), huvudet: mm(Math.max(m.hand.huvudet.djup, m.arm.huvudet)), bordet: mm(m.arm.bordet), filten: mm(m.hand.filten),
      armbagen: grader(Math.max(lo - m.vinkel, m.vinkel - hi)), rackvidden: mm(m.avst - mest), bojen: mm(minst - m.avst), handleden: grader(m.handled - GRANS.handled)}; };
  return {R: arm('R'), L: arm('L')};
}
