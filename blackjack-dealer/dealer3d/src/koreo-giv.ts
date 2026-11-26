// Given som koreografi: steg för steg som en animatör gör den, inte genom att pröva varianter. Några namngivna
// handställningar på dockans egen hand, kortet fast i den hållande handens grepp (ett fast läge i handens egna axlar, så
// att hand och kort aldrig glider isär), nyckellägen mot bordets egna punkter (skon, mötespunkten, kortplatsen) och mjuka
// övergångar (varje del en båge där farten stiger och faller som en klocka). Armen ur body.ts arm, bålen ur räckvidden,
// armbågarna över bordets kant (ren-giv.ts). ren-giv.ts granska och givRegler är kontrollerna efteråt.
//
// Jakobs ord (2026-11-26): "Dealerns vänstra hand trycker ut kortet. Dealerns högra hand ... tar emot det med sin tumme
// ned och vänder över kortet cirka 100 grader i nyckelvridningsrotation medan armen förs mot P4C1."
// Så ska de läsas (huvudagenten 2026-11-26, mätt på två lärofilmer av riktiga dealrar som ger ur en sko,
// ../slask/standarddocka/youtube-dealer/): "tumme ned" är INTE tummen under ett plant kort. Kortet står på högkant när
// högern tar det, och tummen pekar nedåt längs dess framsida. En riktig dealer gör så, och så ritas version A:
//   K1 Vänsterhanden, handflatan ned och fingertopparna på kortets rygg, drar ut kortet plant ur skon mot dealerns höger,
//      till mötespunkten ute över bordet (KOREO.mote; Jakob: "mötas mer i mitten av bordet"), där högerns underarm pekar
//      i sidled och vänstern når utan att sträckas.
//   K2 Vänsterhanden reser kortet på högkant kring dess bortre långsida, KOREO.rest grader mot filten, framsidan mot
//      dealern och ryggen mot spelarna: första halvan av vändningen.
//   K3 Högern kommer med handryggen upp och pekande i sidled mot skon, och nyper kortets övre långsida ovanifrån: tummen
//      på framsidan (dealersidan), pekande nedåt, och pekfingret på ryggen (nyckelgreppet: kortet mellan tummens topp och
//      pekfingrets sida; långfingret bredvid). Vänstern släpper en ruta efter.
//   K4 Högern rullar kortet framåt, bort från dealern, kring en axel längs bordskanten: underarmen vrids utåt (som en
//      nyckel) cirka 90 grader, från handryggen upp till handskakning med tummen upp. Handflatan vänds aldrig upp och
//      handryggen syns från spelets kamera hela vägen; vridningen är underarmens, inte handledens.
//   K5 Framsidan är uppe före halva vägen till platsen. Resten bärs kortet plant och lågt (KOREO.lyft över filten) i
//      nyckelgreppet, tummen på framsidan och pekfingrets sida under kanten, medan armen svänger fram mot platsen.
//   K6 Kortet sätts ned plant: handen vänds lite tillbaka så att kortets fria långsida når filten, och kortet läggs ned
//      kring den medan tummen följer framsidan och pekfingret glider ut; fingertopparna skjuter det KOREO.skjut på plats och
//      lyfts. Inget kort som står på filten och faller av sig självt, inget kort på högkant vid platsen.
//   K7 Vänsterhanden går tillbaka till skon och står där, lugn och redo för nästa kort.
//   K8 Blicken: mot händerna vid bytet, sedan följer den kortet till platsen.
// Version B (Jakobs alternativ, vändningen nära platsen): samma grepp, men kortet bärs hängande på högkant i nypet lågt
// över filten och rullas framåt först de sista centimetrarna före platsen (KOREO_B).
// Takten (Jakob 2026-11-26): kortet ute och lagt på högst 1 s, handen tillbaka cirka 0,6 s.
// Rent: ingen I/O och ingen three.js.
import {CARD, add, cross, dot, length, mul, sub, unit, type Lens, type Vec3} from './camera.ts';
import {arm, turned} from './body.ts';
import type {Doll} from './doll.ts';
import {axesOf, between, local, placed, thumbToward, type Axes} from './hand-pose.ts';
import {handFaults} from './hand-rule.ts';
import {BALL} from './landing.ts';
import {leavingShoe} from './pinch-deal.ts';
import {SHOE, type Shoe} from './world.ts';
import {REN, armbage, bal, bezier, formMellan, medLeder, mjuk, rackvidd, smooth, underarmLuft, type Ankare23, type Kant} from './ren-giv.ts';

type Kort = {c: Vec3; l: Vec3; n: Vec3};
type Hand = {a: Axes; w: Vec3; S: Vec3[]};
type Limb = Ankare23['frame']['R'];
const UP: Vec3 = [0, 1, 0], X: Vec3 = [1, 0, 0], Z: Vec3 = [0, 0, 1], HK = CARD.height, WK = CARD.width, T = CARD.thickness;
const rad = (d: number) => d * Math.PI / 180, grad = (r: number) => Math.round(r * 1800 / Math.PI) / 10;
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, mul(sub(b, a), t));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const r4 = (v: Vec3): Vec3 => v.map(x => Math.round(x * 10000) / 10000) as Vec3;
const flat = (v: Vec3): Vec3 => unit([v[0], 0, v[2]]);
const vinkel = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b)))));

/**
 * Koreografin: rutorna (30 per sekund) där stegen möts, och måtten.
 * - framme: kortet plant vid mötespunkten; restFore: så många rutor före framme börjar vänstern resa det; restat: kortet rest på högkant; hogerFran: högern lämnar ankaret; nyp: högerns
 *   nyp slutet (fingrarna sluts under de sista `sluta` rutorna medan handen sänks mot kortets kant); vansterSlapper,
 *   vansterHemma: vänstern lyfter från kortet och står åter vid skon.
 * - vant: kortet rullat med framsidan upp (version A; B: rullFran, där rullningen börjar); nere: kortets fria långsida når
 *   filten vid platsen; plant: kortet ligger plant KOREO.skjut före platsen; ligger: skjutet på plats; vilar: fingrarna har
 *   legat på det; hemma: åter i ankaret.
 * - mote: kortets mitt där det ligger plant vid mötet, från axlarnas mitt (meter; x åt hans vänster, z fram mot spelarna).
 * - rest: grader kortet reses mot filten; ovanfor: hur högt (meter) över kortets kant högern kommer innan den sänks och
 *   nyper; lyft: kortets höjd över filten när det bärs; satt: minst så många grader vänds handen tillbaka från tummen upp när kortets fria
 *   långsida når filten (kortet lutar då lika mycket; fler om handen annars är i filten); skjut: hur långt fingertopparna skjuter det på plats.
 * - rulleVila, vilaLyft: handens vridning (grader från handflatan nedåt) när fingrarna ligger på kortet, och hur många
 *   grader handleden lyfts kring fingertopparna innan de släpper; vansterUpp: vänsterns lyft från kortet.
 */
export const KOREO = {
  framme: 9, restFore: 2, restat: 12, hogerFran: 2, nyp: 13, sluta: 4, vansterSlapper: 14, vansterHemma: 32,
  vant: 18, rullFran: 13, nere: 23, plant: 27, ligger: 30, vilar: 33, hemma: 48,
  mote: {x: 0.1, z: 0.31},
  rest: 80, ovanfor: 0.025, lyft: 0.05, satt: 20, skjut: 0.02, rulleVila: 15, vilaLyft: 6, vansterUpp: 0.03,
};
/** Version B: kortet hängande i nypet tills rullningen börjar (rullFran) nära platsen, och lägre. */
const KOREO_B = {rullFran: 20, vant: 22, lyft: 0.075};
/**
 * Hur många grader vänsterhanden och högerhanden (medan den bär kortet) högst står från underarmen (figure-model.ts
 * ställer handen högst 50 grader från den).
 */
const RAK = 40, RAK_H = 46;
/** Hur många meter en radians vridning av kortet räknas som när vänsterns väg med kortet från skon delas i rutor (farten en klocka över vägen). */
const VRIDEN = 0.06;
/**
 * Nedsättningens sökning, ruta för ruta (meter och grader): fingertopparna får flyttas högst `sok` från sin båge (i steg
 * om `steg`) och handen vridas högst `rulle` grader för att hålla handen ur kortet och filten och tummen nära kortet.
 */
const LAGG = {sok: 0.03, steg: 0.0075, rulle: 30};

// ---- greppen: kortet fast i handens egna axlar ------------------------------------------------------------------------
/** Handens egna axlar som ett rum: framåt x, handflatan y, tvärs -z (som hand-pose.ts axesOf ger för en högerhand). */
const REF: Axes = {forward: [1, 0, 0], palm: [0, 1, 0], across: [0, 0, -1]};
const iRef = (S: Vec3[]) => placed(S, REF, [0, 0, 0]);
/** En punkt i handens rum som formens mått (formen har tvärs åt +z). */
const iForm = (q: Vec3): Vec3 => [q[0], q[1], -q[2]];
/**
 * Nyckelgreppet (K3, K5) på dockans högerhand `SR` (formen i ankaret): pekfingret böjt (PEK) så att kortets rygg ligger
 * an mot dess sida mitt på mellanfalangen, tummens topp på framsidan mitt emot, och lång-, ring- och lillfingret avspända
 * bredvid på ryggens sida (aldrig mer böjda än pekfingret). Kortet står vinkelrätt mot handens tvärs, med framsidan mot
 * tummen, långsidan längs handen och kroppen åt handflatan (det hänger under handen när handryggen är upp); den hållna
 * långsidan ligger NYP.upp ovanför kontakten och kortets mitt NYP.fram framför den. `kort` i handens rum (REF), `S`
 * formen, `Soppen` samma form med tummen NYP.isar längre ut (före nypet). Null om tummen inte når utan fel.
 */
const PEK: [number, number, number][] = [[30, 55, 25], [30, 60, 30], [35, 55, 25], [35, 60, 30]];
const NYP = {mitt: [0.5, 0.65], fram: 0.035, upp: 0.006, isar: 0.008, ovriga: [15, 25, 12] as [number, number, number]};
export function nyckelgrepp(SR: Vec3[], topp: {finger: number; thumb: number}) {
  for (const pek of PEK) for (const mitt of NYP.mitt) {
    const S0 = medLeder(SR, [pek, NYP.ovriga, NYP.ovriga, NYP.ovriga]), P = iRef(S0), pim = add(mul(P[6], 1 - mitt), mul(P[7], mitt));
    const zc = pim[2] + topp.finger + T / 2, mal = (extra: number): Vec3 => [pim[0], pim[1], zc + T / 2 + topp.thumb + extra];
    const S = thumbToward(S0, iForm(mal(0)), 80); if (length(sub(iRef(S)[4], mal(0))) > 0.003) continue;
    const kort: Kort = {c: [pim[0] + NYP.fram, pim[1] - NYP.upp + WK / 2, zc], l: X, n: Z};
    if (handFaults(iRef(S), 1, null, kort).some(f => f.kind === 'kortet' || f.kind === 'led' || f.kind === 'i varandra')) continue;
    return {S, Soppen: thumbToward(S0, iForm(mal(NYP.isar)), 80), kort, pek, mitt};
  }
  return null;
}
/** Handen som håller kortet `k` (i världen) med greppet: kortet är `ref` i handens rum. */
function handFor(k: Kort, ref: Kort, S: Vec3[]): Hand {
  const a = cross(k.n, k.l), ar = cross(ref.n, ref.l), M = (v: Vec3): Vec3 => add(add(mul(k.l, dot(ref.l, v)), mul(k.n, dot(ref.n, v))), mul(a, dot(ar, v)));
  return {a: {forward: M(REF.forward), palm: M(REF.palm), across: M(REF.across)}, w: sub(k.c, M(ref.c)), S};
}
/** Kortet som handen `h` håller med greppet (kortet `ref` i handens rum). */
function kortI(h: Hand, ref: Kort): Kort {
  const M = (v: Vec3): Vec3 => add(add(mul(h.a.forward, dot(REF.forward, v)), mul(h.a.palm, dot(REF.palm, v))), mul(h.a.across, dot(REF.across, v)));
  return {c: add(h.w, M(ref.c)), l: unit(M(ref.l)), n: unit(M(ref.n))};
}
const punkter = (h: Hand) => placed(h.S, h.a, h.w);
/** `v` vriden `x` radianer kring axeln `ax` genom punkten `o`. */
const kring = (v: Vec3, o: Vec3, ax: Vec3, x: number) => add(o, turned(sub(v, o), ax, x));
const vridKort = (k: Kort, o: Vec3, ax: Vec3, x: number): Kort => ({c: kring(k.c, o, ax, x), l: turned(k.l, ax, x), n: turned(k.n, ax, x)});
const vridHand = (h: Hand, o: Vec3, ax: Vec3, x: number): Hand => ({a: {forward: turned(h.a.forward, ax, x), palm: turned(h.a.palm, ax, x), across: turned(h.a.across, ax, x)}, w: kring(h.w, o, ax, x), S: h.S});
/** Axlarna vridna `x` radianer kring axeln `ax`. */
const vridAxlar = (A: Axes, ax: Vec3, x: number): Axes => ({forward: turned(A.forward, ax, x), palm: turned(A.palm, ax, x), across: turned(A.across, ax, x)});
/** Handens lägsta kula över filten (landing.ts BALL), meter. */
const overFilten = (h: Hand) => Math.min(...punkter(h).map((q, k) => q[1] - BALL(k)));
/** Hur djupt (mm) handens ben går i kortet `k` och i filten, sammanlagt (hand-rule.ts handFaults). */
const iKortet = (h: Hand, k: Kort | null) => handFaults(punkter(h), 1, null, k).filter(f => f.kind === 'kortet' || f.kind === 'filten').reduce((s, f) => s + f.by, 0);
/** Kortets lägsta hörn över filten, meter. */
const kortLagst = (k: Kort) => { const a = cross(k.n, k.l); return Math.min(...[[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([u, v]) => k.c[1] + k.l[1] * u * HK / 2 + a[1] * v * WK / 2)) - T / 2; };

// ---- given -----------------------------------------------------------------------------------------------------------
export type KoreoInput = {start: Ankare23; place: string; at: Vec3; doll: Doll; lens: Lens; shoe?: Shoe; kant?: Kant; version?: 'a' | 'b'};
export function koreoGiv(input: KoreoInput) {
  const {start, doll, lens, kant} = input, f0 = start.frame, hip = start.hip, B = input.version === 'b', K = B ? {...KOREO, ...KOREO_B} : KOREO, n = K.hemma + 1;
  const HR0 = axesOf(f0.R.p, 1), SR0 = local(f0.R.p, HR0), HL0 = axesOf(f0.L.p, -1), SL0 = local(f0.L.p, HL0);
  const topp = {finger: Math.max(REN.topp, doll.hand?.topp?.finger ?? 0), thumb: Math.max(REN.tumme, doll.hand?.topp?.thumb ?? 0)};
  const grepp = nyckelgrepp(SR0, topp); if (!grepp) throw Error(`koreo-giv: ${input.place}: tummen når inte kortet i nyckelgreppet.`);
  const SK = grepp.S, refK = grepp.kort, hogerDel = (k: Kort, S = SK) => handFor(k, refK, S);

  // K1: kortet ut ur skon (pinch-deal.ts leavingShoe), plant med ryggen upp, och skjutet till mötespunkten, långsidan i
  // sidled (längs bordskanten), vänt så att vänsterns fingertoppar ligger på dess ände mot skon (högern tar den andra).
  const skon = input.shoe ?? SHOE, ut = leavingShoe(lens, skon), aSlut = skon.windowLift / Math.sin(skon.plateLean) + HK, ute = ut(aSlut);
  const k0 = f0.card, a0 = cross(k0.n, k0.l), tipp = mul(add(f0.L.p[8], f0.L.p[12]), 0.5), tippPa = [dot(sub(tipp, k0.c), k0.l), dot(sub(tipp, k0.c), a0), dot(sub(tipp, k0.c), k0.n) - 0.0006];
  const paKort = (k: Kort): Vec3 => add(add(add(k.c, mul(k.l, tippPa[0])), mul(cross(k.n, k.l), tippPa[1])), mul(k.n, tippPa[2]));
  const axelMitt = mul(add(f0.R.s, f0.L.s), 0.5), M: Vec3 = [axelMitt[0] + K.mote.x, T / 2, axelMitt[2] + K.mote.z];
  // (långsidan i sidled, vänd så att vänsterns fingertoppar ligger på kortets halva mot skon: högern tar den andra)
  const kortM: Kort = (() => { const val = [X, mul(X, -1)].map(l => ({k: {c: M, l, n: ute.n} as Kort, x: paKort({c: M, l, n: ute.n})[0] - M[0]})); return val.sort((p, q) => q.x - p.x)[0].k; })();
  const tappUte: Vec3 = (() => { const p = paKort(ute); return [p[0], ute.c[1], p[2]]; })();
  const yaw = Math.atan2(dot(cross(flat(ute.l), flat(kortM.l)), UP), dot(flat(ute.l), flat(kortM.l)));
  const flytt: Vec3 = (() => { const d = sub(sub(M, tappUte), turned(sub(ute.c, tappUte), UP, yaw)); return [d[0], 0, d[2]]; })();
  const skjutet = (s: number): Kort => ({c: add(add(tappUte, mul(flytt, s)), turned(sub(ute.c, tappUte), UP, yaw * s)), l: turned(ute.l, UP, yaw * s), n: ute.n});
  // (vägen räknas som vänsterns fingertoppar drar kortet, och dess vridning (en radian som VRIDEN meter), så att farten
  // är en klocka över hela vägen: ut ur skon och skjutet till mötespunkten)
  const vag = (a: Kort, b: Kort) => length(sub(paKort(a), paKort(b))) + VRIDEN * vinkel(a.n, b.n) + VRIDEN * vinkel(a.l, b.l);
  const N = 200, tab: number[] = [0]; for (let i = 1; i <= N; i++) tab.push(tab[i - 1] + vag(ut(aSlut * (i - 1) / N), ut(aSlut * i / N)));
  const utLangd = tab[N], skjutLangd = length(flytt) + VRIDEN * Math.abs(yaw), hela = utLangd + skjutLangd;
  const utVid = (s: number) => { let i = 1; while (i < N && tab[i] < s) i++; return aSlut * (i - 1 + clamp01((s - tab[i - 1]) / Math.max(1e-9, tab[i] - tab[i - 1]))) / N; };
  const lamVid = (t: number) => hela * mjuk(t / K.framme), forskj = sub(k0.c, ut(0).c);
  const dra = (() => { for (let t = 0; t <= K.framme; t++) if (lamVid(t) > utLangd) return t; return K.framme; })();
  const kortFram = (t: number): Kort => { const lam = lamVid(t);
    if (lam <= utLangd) { const k = ut(utVid(lam)); return {...k, c: add(k.c, mul(forskj, 1 - smooth(t / 3)))}; }
    return skjutet(clamp01((lam - utLangd) / Math.max(1e-9, skjutLangd))); };
  // K2: rest på högkant kring den bortre långsidan (framsidan mot dealern).
  const restAxel: Vec3 = [M[0], 0, M[2] + WK / 2];
  const kortRest = (grader: number): Kort => vridKort(kortM, restAxel, X, rad(grader));
  // (resningen börjar KOREO.restFore rutor innan kortet har stannat, så att det inte står still mellan skjutet och resningen;
  // den sker kring kortets egen bortre långsida där det är)
  const restFran = K.framme - K.restFore, rest = (t: number) => t <= restFran ? 0 : K.rest * mjuk((t - restFran) / (K.restat - restFran));
  const bortreKant = (k: Kort): Vec3 => { const a = cross(k.n, k.l), mot = dot(a, Z) >= 0 ? a : mul(a, -1); return [k.c[0] + mot[0] * WK / 2, 0, k.c[2] + mot[2] * WK / 2]; };
  const kortRestT = (t: number): Kort => { const k = kortFram(Math.min(t, K.framme)); return vridKort(k, bortreKant(k), unit(dot(k.l, X) >= 0 ? k.l : mul(k.l, -1)), rad(rest(t))); };
  // (kortet som högern ser det: samma kort, långsidan åt det håll handen pekar, +x)
  const somHogern = (k: Kort): Kort => dot(k.l, X) >= 0 ? k : {...k, l: mul(k.l, -1)};
  const kortStar = somHogern(kortRest(K.rest)), hNyp = hogerDel(kortStar), hOver: Hand = {...hNyp, w: add(hNyp.w, [0, K.ovanfor, 0]), S: grepp.Soppen};

  // K6: kortet till sist plant på platsen, rakt (långsidan mot spelarna), framsidan upp; först plant KOREO.skjut före
  // platsen, och dit lagt kring sin fria långsida (+x, gångjärnet). Kortet lutat `grader` med den hållna långsidan uppe.
  const F: Kort = {c: [input.at[0], T / 2, input.at[2]], l: Z, n: UP}, Ff: Kort = {...F, c: add(F.c, [0, 0, -K.skjut])}, gangjarn: Vec3 = [Ff.c[0] + WK / 2, 0, Ff.c[2]];
  const kortLutat = (grader: number): Kort => vridKort(Ff, gangjarn, Z, -rad(grader));
  // (handen när den fria långsidan når filten: greppet, handen vänd KOREO.satt grader tillbaka från tummen upp; kortet
  // lutar lika mycket, och handen är över filten)
  const friH = (h: Hand) => overFilten(h) >= 0.002 && !handFaults(punkter(h), 1, null, null).some(x => x.kind === 'filten');
  const satt = (() => { for (let g = K.satt; g <= 80; g += 2.5) if (friH(hogerDel(kortLutat(g)))) return g; return 80; })(), hNere = hogerDel(kortLutat(satt));
  // K4, K5: från nypet till nere. Handens axlar: först rullad (underarmen vriden utåt) kring sin egen framåt, sedan
  // svängd mot platsen (A); i B svängd först, med kortet hängande, och rullad sist. Handleden i en båge, kortet i greppet.
  const A0 = hNyp.a, Aner = hNere.a, rulla = (A: Axes, x: number) => vridAxlar(A, A.forward, x);
  // (den vridning kring framåt som för handflatan från nypets till nedsättningens, sedd längs nedsättningens framåt)
  const svangd = between(A0, {forward: Aner.forward, palm: turned(Aner.palm, Aner.forward, -rad(90 - satt)), across: turned(Aner.across, Aner.forward, -rad(90 - satt))}, 1);
  const axlarVid = (t: number): Axes => { const u = (a: number, b: number) => clamp01((t - a) / Math.max(1, b - a));
    if (!B) { const rulld = rulla(A0, rad(90) * mjuk(u(K.nyp, K.vant))); return between(rulld, Aner, mjuk(u(K.vant - 1, K.nere))); }
    const hangd = between(A0, svangd, mjuk(u(K.nyp, K.rullFran))); return rulla(hangd, rad(90 - satt) * mjuk(u(K.rullFran, K.nere))); };
  // (först upp ur vänsterns fingrar, sedan fram mot platsen)
  const vagVid = (t: number): Vec3 => { const s = mjuk((t - K.nyp) / (K.nere - K.nyp)), p1 = add(hNyp.w, [0, K.lyft * 1.5, 0]), p2 = add(hNere.w, [0, K.lyft * 0.8, 0]); return bezier(hNyp.w, p1, p2, hNere.w, s); };
  const handBar = (t: number): Hand => ({a: axlarVid(t), w: vagVid(t), S: SK});

  // ---- högerhanden ruta för ruta ----
  const ankare: Hand = {a: HR0, w: f0.R.w, S: SR0};
  // (fingrarna vilande på det liggande kortet: handflatan nedåt och lite vriden, pek- och långfingrets toppar på framsidan
  // en bit in från den närmre kortsidan, ring- och lillfingret aldrig mer böjda än långfingret, tummen som i ankaret)
  const SV = medLeder(SR0, [[25, 35, 18], [25, 35, 18], [22, 32, 16], [20, 30, 15]]);
  const AV: Axes = (() => { const palm = turned([0, -1, 0], Z, rad(K.rulleVila)); return {forward: Z, palm, across: cross(palm, Z)}; })();
  const toppMitt = (h: Hand) => { const p = punkter(h); return mul(add(p[8], p[12]), 0.5); };
  const hTryck: Hand = (() => { const P = placed(SV, AV, [0, 0, 0]), m = mul(add(P[8], P[12]), 0.5), lag = Math.min(P[8][1], P[12][1]), mal: Vec3 = [Ff.c[0] - 0.008, T + topp.finger + 0.0005, Ff.c[2] - HK / 2 + 0.03];
    return {a: AV, w: [mal[0] - m[0], mal[1] - lag, mal[2] - m[2]], S: SV}; })();
  const hVila: Hand = {...hTryck, w: add(hTryck.w, [0, 0, K.skjut])};
  // (handleden lyfts lite kring fingertopparna medan de vilar, så att handen inte står still; sedan lyfts de)
  const lyftAxel = (() => { const ax = unit(hVila.a.across), w = kring(hVila.w, toppMitt(hVila), ax, rad(K.vilaLyft)); return w[1] > hVila.w[1] ? ax : mul(ax, -1); })();
  const vilande = (s: number) => vridHand(hVila, toppMitt(hVila), lyftAxel, rad(K.vilaLyft) * smooth(s));
  // K6: nedsättningen, ruta för ruta: kortet läggs ned kring gångjärnet (vinkeln en klocka till noll), och handen går från
  // greppet till fingertopparna på framsidan: vriden kring sin framåt (Z) och med fingertopparna längs en båge, flyttade
  // och vridna så lite som håller handen ur kortet och filten och tummen eller en fingertopp nära kortet.
  const lutVid = (t: number) => satt * (1 - mjuk((t - K.nere) / (K.plant - K.nere)));
  const rullad = (rho: number): Axes => { const palm = turned([0, -1, 0], Z, rad(rho)); return {forward: Z, palm, across: cross(palm, Z)}; };
  const medToppar = (A: Axes, S: Vec3[], P: Vec3): Hand => { const q = mul(add(S[8], S[12]), 0.5); return {a: A, w: sub(P, add(add(mul(A.forward, q[0]), mul(A.palm, q[1])), mul(A.across, q[2]))), S}; };
  const rho0 = 90 - satt, T0 = toppMitt(hNere), PT = toppMitt(hTryck);
  const nominell = (u: number) => ({P: bezier(T0, add(T0, [-0.01, 0.02, 0]), add(PT, [0, 0.02, 0]), PT, smooth(u)), rho: rho0 + (K.rulleVila - rho0) * smooth(u)});
  /** Hur nära kortet (meter från dess yta) närmaste fingertopp eller tummen är, där den är över kortet. */
  const nara = (h: Hand, k: Kort) => { const p = punkter(h), a = cross(k.n, k.l);
    return Math.min(...[4, 8, 12, 16, 20].map(j => { const d = sub(p[j], k.c); return Math.abs(dot(d, k.l)) < HK / 2 + 0.005 && Math.abs(dot(d, a)) < WK / 2 + 0.005 ? Math.abs(dot(d, k.n)) - T / 2 - (j === 4 ? topp.thumb : topp.finger) : Infinity; })); };
  const formLagg = (u: number) => formMellan(SK, SV, smooth(u / 0.7));
  const laggR: Hand[] = (() => { const ut: Hand[] = [hNere], spar: {P: Vec3; rho: number}[] = [{P: toppMitt(handBar(K.nere - 1)), rho: rho0}, {P: T0, rho: rho0}];
    for (let t = K.nere + 1; t < K.plant; t++) { const u = (t - K.nere) / (K.plant - K.nere), k = kortLutat(lutVid(t)), S = formLagg(u), nom = nominell(u);
      const [a, b] = spar.slice(-2), gissP = sub(mul(b.P, 2), a.P), gissR = 2 * b.rho - a.rho; let bast: {h: Hand; P: Vec3; rho: number; c: number} | null = null;
      for (let dx = -LAGG.sok; dx <= LAGG.sok + 1e-9; dx += LAGG.steg) for (let dy = -LAGG.sok; dy <= LAGG.sok + 1e-9; dy += LAGG.steg) for (let dr = -LAGG.rulle; dr <= LAGG.rulle; dr += 5) {
        const P = add(nom.P, [dx, dy, 0]), rho = nom.rho + dr, h = medToppar(rullad(rho), S, P);
        const c = 100 * iKortet(h, k) + (length(sub(P, nom.P)) / 0.01) ** 2 + (dr / 10) ** 2 + 2 * (length(sub(P, gissP)) / 0.01) ** 2 + 2 * ((rho - gissR) / 10) ** 2 + 10 * Math.max(0, nara(h, k) - 0.004) * 1000;
        if (!bast || c < bast.c) bast = {h, P, rho, c}; }
      ut.push(bast!.h); spar.push({P: bast!.P, rho: bast!.rho}); }
    ut.push(hTryck); return ut; })();
  const formH = (t: number) => { const oppen = formMellan(SR0, grepp.Soppen, smooth(clamp01((t - K.hogerFran) / (K.nyp - K.sluta - K.hogerFran)))), k = smooth(clamp01((t - (K.nyp - K.sluta)) / K.sluta));
    return k > 0 ? formMellan(oppen, SK, k) : oppen; };
  const hogerVid = (t: number): Hand => {
    if (t <= K.hogerFran) return ankare;
    // (K3: fram över kortets övre kant i en båge, handryggen upp och pekande mot skon, och ned på den medan nypet sluts)
    const tOver = K.nyp - K.sluta;
    if (t <= tOver) { const s = mjuk((t - K.hogerFran) / (tOver - K.hogerFran)), p1 = add(lerp(f0.R.w, hOver.w, 0.35), [0, 0.035, 0]), p2 = add(hOver.w, [0, 0.015, 0]);
      return {a: between(HR0, hOver.a, mjuk(Math.min(1, s / 0.85))), w: bezier(f0.R.w, p1, p2, hOver.w, s), S: formH(t)}; }
    if (t <= K.nyp) return {a: hNyp.a, w: lerp(hOver.w, hNyp.w, smooth((t - tOver) / K.sluta)), S: formH(t)};
    if (t <= K.nere) return handBar(t);
    if (t < K.plant) return laggR[t - K.nere];
    // (fingertopparna skjuter kortet på plats)
    if (t <= K.ligger) { const s = mjuk((t - K.plant) / (K.ligger - K.plant)); return {...hTryck, w: add(hTryck.w, [0, 0, K.skjut * s])}; }
    if (t <= K.vilar) return vilande((t - K.ligger) / (K.vilar - K.ligger));
    const fran = vilande(1), s = mjuk((t - K.vilar) / (K.hemma - K.vilar)), p1 = add(lerp(fran.w, f0.R.w, 0.35), [0, 0.04, 0]), p2 = add(lerp(fran.w, f0.R.w, 0.75), [0, 0.015, 0]);
    return {a: between(fran.a, HR0, s), w: bezier(fran.w, p1, p2, f0.R.w, s), S: formMellan(SV, SR0, s)};
  };

  // ---- kortet ruta för ruta ----
  const kortVidT = (t: number): Kort => t <= restFran ? kortFram(t) : t <= K.nyp ? kortRestT(t) : t <= K.nere ? kortI(handBar(t), refK)
    : t < K.plant ? kortLutat(lutVid(t)) : t <= K.ligger ? {...Ff, c: add(Ff.c, [0, 0, K.skjut * mjuk((t - K.plant) / (K.ligger - K.plant))])} : F;

  // ---- vänsterhanden ruta för ruta ----
  // (K1: fingertopparna på kortets rygg där de är i ankaret, fingrarna öppna och lätt böjda (Jakob 2026-11-26 om bytet:
  // "krökta som en klo" var fel); K2: handen vrids med kortet när den reser det; K7: hem till skon efter bytet)
  const SLo = medLeder(SL0, [[20, 30, 15], [20, 30, 15], [20, 30, 15], [20, 30, 15]]);
  const iFilten = (p: Vec3[]) => handFaults(p, -1, null, null).filter(f => f.kind === 'filten').reduce((s, f) => s + f.by, 0);
  const P0 = paKort(k0), yaw0 = flat(sub(P0, f0.L.s));
  /** Handen med handflatan mot det liggande kortet, framåt `f` (vågrätt) lutat `pitch` grader nedåt. */
  const motKortet = (f: Vec3, pitch: number): Axes => { const Fv = unit(add(mul(f, Math.cos(rad(pitch))), mul(UP, -Math.sin(rad(pitch))))), Pm = unit(sub(mul(UP, -1), mul(Fv, dot(mul(UP, -1), Fv)))); return {forward: Fv, palm: Pm, across: cross(Pm, Fv)}; };
  const vansterPa = (k: Kort, S: Vec3[], plan: number): Hand => { const P = paKort(k), tl = mul(add(S[8], S[12]), 0.5), y = Math.atan2(dot(cross(yaw0, flat(sub(P, f0.L.s))), UP), dot(yaw0, flat(sub(P, f0.L.s))));
    const r = (v: Vec3) => turned(v, UP, y), AY: Axes = {forward: r(HL0.forward), palm: r(HL0.palm), across: r(HL0.across)};
    const med = (A: Axes): Hand => ({a: A, w: sub(P, add(add(mul(A.forward, tl[0]), mul(A.palm, tl[1])), mul(A.across, tl[2]))), S});
    for (const pitch of [25, 30, 35, 40, 20, 45]) { const h = med(between(AY, motKortet(flat(AY.forward), pitch), plan)); if (iFilten(punkter(h)) === 0) return h; }
    return med(AY); };
  const formV = (t: number) => formMellan(SL0, SLo, smooth(t / (dra + 2)));
  // (handens vinkel jämnad över rutorna intill, så att handleden inte rycker när kortet vrids ut ur skon)
  let aV: Axes[] = Array.from({length: K.framme + 1}, (_, t) => t === 0 ? HL0 : vansterPa(kortFram(t), formV(t), smooth(t / (dra + 1))).a);
  for (let pass = 0; pass < 6; pass++) aV = aV.map((a, t) => t === 0 || t === K.framme ? a : between(between(aV[t - 1], aV[t + 1], 0.5), a, 0.5));
  const vansterFram = (t: number): Hand => { const k = kortFram(t), S = formV(t), tl = mul(add(S[8], S[12]), 0.5), A = aV[t], P = paKort(k);
    return {a: A, w: sub(P, add(add(mul(A.forward, tl[0]), mul(A.palm, tl[1])), mul(A.across, tl[2]))), S}; };
  // (K2: handen vriden med kortet kring resningens axel, fingertopparna kvar på ryggen)
  const vansterRest = (t: number): Hand => { const k = kortFram(Math.min(t, K.framme)), o = bortreKant(k), ax = unit(dot(k.l, X) >= 0 ? k.l : mul(k.l, -1)), x = rad(rest(t)), h = vridHand(vansterFram(Math.min(t, K.framme)), o, ax, x);
    return {...h, w: add(h.w, sub(paKort(kortVidT(t)), kring(paKort(k), o, ax, x)))}; };
  const hSlapp = vansterRest(K.vansterSlapper);
  const vansterVid = (t: number): Hand => {
    if (t === 0) return {a: HL0, w: f0.L.w, S: SL0};
    if (t <= restFran) return vansterFram(t);
    if (t <= K.nyp) return vansterRest(t);
    // (följer kortet en ruta medan högern börjar bära det, fingertopparna kvar på ryggen)
    if (t <= K.vansterSlapper) return {...hSlapp, w: add(vansterRest(K.nyp).w, sub(kortVidT(t).c, kortVidT(K.nyp).c))};
    // (först rakt upp längs kortet, fingrarna längs ryggen och tummen längs framsidan förbi dess övre kant, fortare än
    // högern lyfter kortet; sedan i en båge hem, fingrarna åter som i ankaret)
    const slapp = {...hSlapp, w: add(vansterRest(K.nyp).w, sub(kortVidT(K.vansterSlapper).c, kortVidT(K.nyp).c))}, j = t - K.vansterSlapper, UPP = 4;
    const uppe: Hand = {...slapp, w: add(slapp.w, [0.01, K.vansterUpp * 2, 0])};
    if (j <= UPP) { const u = mjuk(j / UPP); return {...slapp, w: lerp(slapp.w, uppe.w, u), S: formMellan(SLo, formMellan(SLo, SL0, 0.3), u)}; }
    const s = smooth((t - K.vansterSlapper - UPP) / (K.vansterHemma - K.vansterSlapper - UPP)); if (s >= 1) return {a: HL0, w: f0.L.w, S: SL0};
    const p1 = add(uppe.w, [0.03, 0.01, 0]), p2 = add(f0.L.w, [0, K.vansterUpp * 1.5, 0]);
    return {a: between(slapp.a, HL0, smooth(s)), w: bezier(uppe.w, p1, p2, f0.L.w, s), S: formMellan(formMellan(SLo, SL0, 0.3), SL0, s)};
  };

  // ---- rutorna: händer och kort ----
  const R: Hand[] = [], L: Hand[] = [], C: Kort[] = [];
  for (let t = 0; t < n; t++) { R.push(hogerVid(t)); L.push(vansterVid(t)); C.push(kortVidT(t)); }
  // (vänsterhanden högst RAK grader från underarmen, som en handled böjs: vriden mot underarmen kring fingertopparna;
  // underarmen från axeln som armen når handleden, tre gånger om eftersom den följer handleden)
  const polV = unit(sub(f0.L.e, f0.L.s));
  for (let t = 1; t < n; t++) for (let gang = 0; gang < 3; gang++) { const h = L[t], e = arm(f0.L.s, h.w, polV, doll).elbow, fore = unit(sub(h.w, e)), fram = unit(sub(punkter(h)[9], h.w)), x = vinkel(fram, fore) - rad(RAK);
    if (x <= 0) break; const ax = unit(cross(fram, fore)); L[t] = vridHand(h, toppMitt(h), ax, x); }
  // (och vänsterns pek- och långfinger på ryggen till bytet: handen flyttad längs kortets normal tills den lägsta av
  // topparna ligger an)
  for (let t = 1; t <= K.vansterSlapper; t++) { const k = C[t], p = punkter(L[t]), sida = (q: Vec3) => dot(sub(q, k.c), k.n), s = Math.sign(sida(p[8]) + sida(p[12])) || -1;
    const glapp = Math.min(...[p[8], p[12]].map(q => Math.abs(sida(q)) - T / 2 - topp.finger)) - 0.0005; L[t] = {...L[t], w: sub(L[t].w, mul(k.n, s * glapp))}; }
  // (medan högern bär kortet: hand och kort lyfta så mycket som håller handen och kortet ur filten, jämnat över rutorna
  // intill så att lyftet är en mjuk båge)
  const brist = R.map((h, t) => t > K.nyp && t < K.nere ? Math.max(0, 0.002 - overFilten(h), 0.004 - kortLagst(C[t])) : 0);
  const lyft = brist.map((_, t) => Math.max(0, ...brist.map((x, j) => x * smooth(1 - Math.abs(t - j) / 4))));
  for (let t = K.nyp + 1; t < K.nere; t++) if (lyft[t] > 0) { const upp: Vec3 = [0, lyft[t], 0]; R[t] = {...R[t], w: add(R[t].w, upp)}; C[t] = {...C[t], c: add(C[t].c, upp)}; }
  // (kortets långsida åt samma håll i alla rutor: ett kort och samma kort vänt ett halvt varv kring framsidans normal är ett)
  for (let t = 1; t < n; t++) if (dot(C[t].l, C[t - 1].l) < 0) C[t] = {...C[t], l: mul(C[t].l, -1)};

  // ---- bålen, armarna, huvudet och blicken (som ren-giv.ts: bålen bara så mycket räckvidden kräver) ----
  const need = rackvidd(hip, f0.R.s, R.map(h => h.w), F.c, doll, REN.naturlig), torso = bal(hip, F.c, need.lean, need.twist);
  const nar = doll.upperArm + doll.forearm - REN.naturlig, nas = (k: number, t: number) => length(sub(R[t].w, torso(f0.R.s, k))) <= nar && length(sub(L[t].w, torso(f0.L.s, k))) <= nar;
  const kravs = R.map((_, t) => { if (nas(0, t)) return 0; if (!nas(1, t)) return 1; let lo = 0, hi = 1; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (nas(m, t)) hi = m; else lo = m; } return hi; });
  const TONA = 10, fonster = (t: number) => smooth(t / 4) * smooth((n - 1 - t) / 4), tonad = (v: number[]) => v.map((_, t) => Math.max(v[t], fonster(t) * Math.max(0, ...v.map((x, j) => x * smooth(1 - Math.abs(t - j) / (TONA + 1))))));
  // (andelen jämnad över rutorna intill, men aldrig under det räckvidden kräver, så att huvudet inte rycker)
  const andel = (() => { const v = tonad(kravs); return v.map((x, t) => Math.max(kravs[t], (v[Math.max(0, t - 2)] + v[Math.max(0, t - 1)] + x + v[Math.min(n - 1, t + 1)] + v[Math.min(n - 1, t + 2)]) / 5 * fonster(t), t === 0 || t === n - 1 ? 0 : 0)); })(), sR = (t: number) => torso(f0.R.s, andel[t]), sL = (t: number) => torso(f0.L.s, andel[t]);
  const polR = unit(sub(f0.R.e, f0.R.s)), polL = unit(sub(f0.L.e, f0.L.s));
  const vridR = R.map((h, t) => armbage(sR(t), h.w, polR, h.a, doll).vrid), vridL = L.map((h, t) => armbage(sL(t), h.w, polL, h.a, doll).vrid);
  // (armbågarnas vridning jämnad över rutorna intill och tonad till noll i första och sista rutan, där de är ankarets)
  const jamn = (v: number[]) => v.map((_, t) => { const s = v.slice(Math.max(0, t - 3), t + 4); return s.reduce((x, y) => x + y, 0) / s.length; });
  const vR = jamn(vridR).map((x, t) => x * fonster(t)), vL = jamn(vridL).map((x, t) => x * fonster(t) * (1 - smooth((t - K.vansterHemma + 4) / 4)));
  const overKanten = (s: (t: number) => Vec3, hand: Hand[], pol: Vec3, v: number[], utat: number) => hand.map((h, t) => { if (!kant) return 0;
    const S = s(t), line = unit(sub(h.w, S)), e = (x: number) => arm(S, h.w, turned(pol, line, x), doll).elbow, tk = dot(sub(e(v[t] + 0.05), e(v[t])), [utat, 0, 0]) >= 0 ? 1 : -1;
    for (let x = 0; x <= rad(110); x += rad(0.5)) if (underarmLuft(e(v[t] + tk * x), h.w, kant) >= kant.luft) return tk * x;
    return tk * rad(110); });
  const tonadVrid = (v: number[]) => v.map((_, t) => { let b = 0; v.forEach((x, j) => { const y = x * smooth(1 - Math.abs(t - j) / (TONA + 1)) * (j === t ? 1 : fonster(t)); if (Math.abs(y) > Math.abs(b)) b = y; }); return b; });
  const extraR = tonadVrid(overKanten(sR, R, polR, vR, -1)), extraL = tonadVrid(overKanten(sL, L, polL, vL, 1));
  const g0 = f0.g, frames: {card: Kort & {id: number}; L: Limb; R: Limb; h: Vec3; g: Vec3}[] = [];
  for (let t = 0; t < n; t++) {
    const s1 = sR(t), s2 = sL(t), ände = t === 0 || t === n - 1;
    const armbageR = () => arm(s1, R[t].w, turned(polR, unit(sub(R[t].w, s1)), vR[t] + extraR[t]), doll).elbow;
    // (högerhanden högst RAK_H grader från underarmen medan den bär kortet: vriden mot den kring fingertopparna, kortet med
    // den i greppet, och armbågen löst igen)
    let e1 = ände ? f0.R.e : armbageR();
    if (t > K.nyp && t < K.nere) for (let gang = 0; gang < 3; gang++) { const fore = unit(sub(R[t].w, e1)), fram = unit(sub(punkter(R[t])[9], R[t].w)), x = vinkel(fram, fore) - rad(RAK_H);
      if (x <= 0) break; const ax = unit(cross(fram, fore)), o = toppMitt(R[t]); R[t] = vridHand(R[t], o, ax, x); C[t] = vridKort(C[t], o, ax, x); e1 = armbageR(); }
    const e2 = ände ? f0.L.e : arm(s2, L[t].w, turned(polL, unit(sub(L[t].w, s2)), vL[t] + extraL[t]), doll).elbow;
    // (K8: blicken till kortet när det lämnar skon, på händerna vid bytet och sedan med kortet till platsen; hem igen)
    const k = C[t], blick = t <= 10 ? lerp(g0, k.c, mjuk(t / 10)) : t <= K.ligger ? k.c : lerp(k.c, g0, mjuk((t - K.ligger) / (K.hemma - K.ligger)));
    frames.push({card: {c: r4(k.c), l: r4(unit(k.l)), n: r4(unit(k.n)), id: 0},
      R: {s: r4(s1), e: r4(e1), w: r4(ände ? f0.R.w : R[t].w), k: f0.R.k, p: (ände ? f0.R.p : punkter(R[t])).map(r4)},
      L: {s: r4(s2), e: r4(e2), w: r4(ände ? f0.L.w : L[t].w), k: f0.L.k, p: (ände ? f0.L.p : punkter(L[t])).map(r4)},
      h: r4(torso(f0.h, andel[t] * 0.85)), g: r4(blick)});
  }
  const lutPer = andel.map(x => grad(need.lean * x)), vridPer = andel.map(x => grad(Math.abs(need.twist) * x)), mest = Math.max(...andel);
  const times = {ute: dra, framme: K.framme, rest: K.restat, greppat: K.nyp, tar: K.nyp, vansterLyfter: K.vansterSlapper, nere: K.nere, slapper: K.plant, ligger: K.ligger, slut: K.hemma};
  const kvitto = {grepp: {pek: grepp.pek, mitt: grepp.mitt}, mote: r4(M), sattGrader: satt, lutGrader: grad(need.lean * mest), vridGrader: grad(Math.abs(need.twist) * mest), lutPerRuta: lutPer, vridPerRuta: vridPer,
    armbagenUtGrader: {R: grad(Math.max(...extraR.map(Math.abs))), L: grad(Math.max(...extraL.map(Math.abs)))}};
  const metod = B ? 'version B (turned near the place): drawn out of the shoe flat by the left hand to the meeting point out over the table, stood on its far long side facing the dealer, nipped from above by the right (thumb down on the face, forefinger on the back), carried hanging on its edge low over the felt and rolled forward by the forearm only in the last centimetres, set down flat, pushed onto the place by the fingertips and released.'
    : 'version A (the key turn, read from Jakob\'s words and two training films): drawn out of the shoe flat by the left hand to the meeting point out over the table, stood on its far long side facing the dealer, nipped from above by the right (thumb down on the face, forefinger on the back), rolled forward away from the dealer by the forearm turning outward like a key (back of the hand up to a handshake), carried flat and low, set down flat, pushed onto the place by the fingertips and released.';
  const motion = {fps: 30, frameCount: n, leavesShoe: dra, edge: [K.nere, K.nere], folds: K.nere, rests: K.ligger, hip, doll: doll.name, to: [input.place], frames,
    cycle: {holdThrough: K.vilar, liftStarts: K.vilar, liftEnds: K.vilar + 2, readyFrom: n - 1, durationSeconds: n / 30, liftMeters: 0.02, method: `Choreographed from A2.3 by dealer3d/src/koreo-giv.ts, ${metod}`}};
  return {motion, times, kvitto};
}
