// Given som koreografi (Jakob 2026-11-26, efter den rena given: "kortet vänds åt fel håll. Fan hur svårt ska det vara att
// bara få en normal rörelse"). Given ritas steg för steg som en animatör gör den, inte genom att pröva varianter: några
// namngivna handställningar på dockans egen hand, kortet fast i den hållande handens grepp (ett fast läge i handens egna
// axlar, så att hand och kort aldrig glider isär), nyckellägen mot bordets egna punkter (skon, mötespunkten, kortplatsen)
// och mjuka övergångar (varje del en båge där farten stiger och faller som en klocka). Armen ur body.ts arm, bålen ur
// räckvidden, armbågarna över bordets kant (ren-giv.ts). ren-giv.ts granska och givRegler är kontrollerna efteråt.
// Version A, "nyckelvridningen", som Jakob beskrev den 2026-11-26 (dealern sitter, skon till hans vänster; hans takt:
// kortet ut högst 1 s, handen tillbaka cirka 0,6 s):
//   1 Dra och för in: vänsterhandens pek- och långfinger på kortets rygg drar det ur skon och skjuter det plant över filten
//     till mötespunkten framför bröstet (KOREO.mote, utanför dealerns egna kortplatser), med långsidan riktad längs
//     högerns underarm; den sista biten skjuts kortets närmre ände upp på högerns tumme.
//   2 Bytet: högern tar emot med tummen ned: handflatan nedåt, tummen under kortets närmre kortsida mot framsidan, pek- och
//     långfingret ovanpå ryggen, ring- och lillfingret avspända bredvid; kortet pekar fram längs handen (ren-giv.ts
//     greppOppet). Vänstern håller kvar en ruta efter att greppet har slutit sig, lyfter och går hem till skon och står där.
//   3 Bär och vrid: medan armen förs mot platsen vrids underarmen som en nyckel (tummen upp): framsidan går från nedåt mot
//     hans vänster (+x), kortet kring sin långsida.
//   4 Lägg: i samma svep sänks handen, kortets nedre långsida (den mot lillfingret) möter filten där kortet ska ligga, och
//     kortet läggs på rygg i samma vridriktning, framsidan upp; fingrarna glider av ryggen, tummen släpper, och handen
//     vänds tillbaka över kortet så att pek- och långfingret ligger på det en stund (KOREO.vilar).
//   5 Tillbaka: handen går i en mjuk båge hem till ankaret, fingrarna öppna.
// Rent: ingen I/O och ingen three.js.
import {CARD, add, cross, dot, length, mul, sub, unit, type Lens, type Vec3} from './camera.ts';
import {arm, turned} from './body.ts';
import type {Doll} from './doll.ts';
import {axesOf, between, local, placed, type Axes} from './hand-pose.ts';
import {handFaults} from './hand-rule.ts';
import {BALL} from './landing.ts';
import {leavingShoe} from './pinch-deal.ts';
import {SHOE, type Shoe} from './world.ts';
import {REN, armbage, bal, bezier, formMellan, greppOppet, medLeder, mjuk, rackvidd, refKort, smooth, underarmLuft, type Ankare23, type Kant} from './ren-giv.ts';

type Kort = {c: Vec3; l: Vec3; n: Vec3};
type Hand = {a: Axes; w: Vec3; S: Vec3[]};
type Limb = Ankare23['frame']['R'];
const UP: Vec3 = [0, 1, 0], Z: Vec3 = [0, 0, 1], HK = CARD.height, WK = CARD.width, T = CARD.thickness;
const rad = (d: number) => d * Math.PI / 180, grad = (r: number) => Math.round(r * 1800 / Math.PI) / 10;
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, mul(sub(b, a), t));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const r4 = (v: Vec3): Vec3 => v.map(x => Math.round(x * 10000) / 10000) as Vec3;
const flat = (v: Vec3): Vec3 => unit([v[0], 0, v[2]]);
const vinkel = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b)))));

/**
 * Koreografin: rutorna (30 per sekund) där stegen möts, och måtten.
 * - hogerFran: högern lämnar ankaret; sluta: rutorna högerns fingrar tar på sig att sluta sig om kortet; greppat: kortets
 *   närmre ände har skjutits upp på tummen och pek- och långfingret
 *   ligger på ryggen; vansterSlapper, vansterHemma: vänstern lyfter från kortet och är åter vid skon.
 * - vridFran: underarmen börjar vridas; nere: kortets nedre långsida möter filten; slapp: sista rutan i greppet (kortet vrids till dess kring den kanten, hand och kort stelt); ligger: kortet
 *   plant med framsidan upp; vilar: pek- och långfingret har legat på det (0,2 s); hemma: åter i ankaret.
 * - mote: kortets mitt i bytet från axlarnas mitt (meter; x åt hans vänster, z fram mot spelarna).
 * - glid: hur långt (meter) kortet ligger mot lillfingrets sida från mitt för pek- och långfingret (refKort), så att
 *   handen är över filten när kortet står på sin nedre långsida; tummeIn: hur långt kortet skjuts upp på tummen.
 * - bage: hur högt kortet lyfts mitt i bärandet; rulleVila: handens vridning (grader från handflatan nedåt) när fingrarna
 *   vilar på kortet; vilaLyft: hur många grader handleden lyfts kring fingertopparna medan de vilar; vansterUpp: vänsterns
 *   lyft från kortet.
 */
export const KOREO = {
  hogerFran: 2, greppat: 12, sluta: 4, vansterSlapper: 12, vansterHemma: 25,
  vridFran: 15, nere: 21, slapp: 22, ligger: 30, vilar: 36, hemma: 48,
  mote: {x: 0.07, z: 0.41},
  glid: -0.015, tummeIn: 0.025, bage: 0.05, rulleVila: 15, vilaLyft: 6, vansterUpp: 0.03,
};
/**
 * Läggningens båge för fingertopparna (meter): `upp` lyfts de först från greppet, `over` över vilan kommer de ned mot
 * kortet; ruta för ruta får de flyttas högst `sok` åt sidan och i höjd (i steg om `steg`) och handen vridas högst `rulle` grader för att hålla handen ur kortet och nära det.
 */
/**
 * Hur många grader vänsterhanden och högerhanden (medan den bär kortet) högst står från underarmen (figure-model.ts
 * ställer handen högst 50 grader från den). Högerns är greppets vid bytet, så att den inte vrids på en ruta när
 * bärandet börjar.
 */
const RAK = 40, RAK_H = 50;
/** Hur många meter en radians vridning av kortet räknas som när vänsterns väg med kortet från skon delas i rutor (farten en klocka över vägen). */
const VRIDEN = 0.02;
const LAGG = {upp: 0.025, over: 0.03, sok: 0.045, steg: 0.0075, rulle: 40};
/**
 * Version B (Jakob 2026-11-26): kortet bärs lågt och plant med ryggen upp nästan hela vägen och sätts ned bredvid
 * platsen med den långsida det vänds kring på filten (ruta nere; tummen under kortet håller dess fria långsida lite lyft),
 * och vänds först där: tummen lyfter den fria långsidan
 * och underarmen vrids som i A, så att kortet viks över gångjärnet som ett blad i en bok och landar på
 * platsen med framsidan upp. Måtten som skiljer från KOREO.
 */
const KOREO_B = {vridFran: 17, nere: 21, slapp: 23, bage: 0.04};

// ---- greppet: kortet fast i handens egna axlar -----------------------------------------------------------------------
/** Handens egna axlar som ett rum: framåt x, handflatan y, tvärs -z (som hand-pose.ts axesOf ger för en högerhand). */
const REF: Axes = {forward: [1, 0, 0], palm: [0, 1, 0], across: [0, 0, -1]};
/** Handen som håller kortet `k` (i världen) med greppet: kortet är `ref` i handens rum. */
function handFor(k: Kort, ref: Kort, S: Vec3[]): Hand {
  const a = cross(k.n, k.l), ar = cross(ref.n, ref.l), M = (v: Vec3): Vec3 => add(add(mul(k.l, dot(ref.l, v)), mul(k.n, dot(ref.n, v))), mul(a, dot(ar, v)));
  return {a: {forward: M(REF.forward), palm: M(REF.palm), across: M(REF.across)}, w: sub(k.c, M(ref.c)), S};
}
const punkter = (h: Hand) => placed(h.S, h.a, h.w);
/** `v` vriden `x` radianer kring axeln `ax` genom punkten `o`. */
const kring = (v: Vec3, o: Vec3, ax: Vec3, x: number) => add(o, turned(sub(v, o), ax, x));
const vridKort = (k: Kort, o: Vec3, ax: Vec3, x: number): Kort => ({c: kring(k.c, o, ax, x), l: turned(k.l, ax, x), n: turned(k.n, ax, x)});
const vridHand = (h: Hand, o: Vec3, ax: Vec3, x: number): Hand => ({a: {forward: turned(h.a.forward, ax, x), palm: turned(h.a.palm, ax, x), across: turned(h.a.across, ax, x)}, w: kring(h.w, o, ax, x), S: h.S});
/** Kortet lutat `x` radianer kring sin kortsida åt `slut` (+1: den bortre i l:s riktning), den kortsidan stilla. */
const kortsidaLyft = (k: Kort, slut: number, x: number): Kort => { const o = add(k.c, mul(k.l, slut * HK / 2)), ax = unit(cross(k.n, k.l)), t = vridKort(k, o, ax, x);
  return dot(sub(add(t.c, mul(t.l, -slut * HK / 2)), o), UP) >= 0 ? t : vridKort(k, o, ax, -x); };
/** Kortets axlar som handens: långsidan som framåt, framsidan som handflatan. */
const ram = (k: Kort): Axes => ({forward: unit(k.l), palm: unit(k.n), across: cross(unit(k.n), unit(k.l))});
/** Vridningen som för axlarna `fran` till `till`. */
const vridning = (fran: Axes, till: Axes) => (v: Vec3): Vec3 => add(add(mul(till.forward, dot(fran.forward, v)), mul(till.palm, dot(fran.palm, v))), mul(till.across, dot(fran.across, v)));
/** Handens lägsta kula över filten (landing.ts BALL), meter. */
const overFilten = (h: Hand) => Math.min(...punkter(h).map((q, k) => q[1] - BALL(k)));
/** Hur djupt (meter) handens ben går i kortet `k` och i filten, sammanlagt (hand-rule.ts handFaults). */
const iKortet = (h: Hand, k: Kort | null) => handFaults(punkter(h), 1, null, k).filter(f => f.kind === 'kortet' || f.kind === 'filten').reduce((s, f) => s + f.by, 0);

// ---- given -----------------------------------------------------------------------------------------------------------
export type KoreoInput = {start: Ankare23; place: string; at: Vec3; doll: Doll; lens: Lens; shoe?: Shoe; kant?: Kant; version?: 'a' | 'b'};
export function koreoGiv(input: KoreoInput) {
  const {start, doll, lens, kant} = input, f0 = start.frame, hip = start.hip, B = input.version === 'b', K = B ? {...KOREO, ...KOREO_B} : KOREO, n = K.hemma + 1;
  const HR0 = axesOf(f0.R.p, 1), SR0 = local(f0.R.p, HR0), HL0 = axesOf(f0.L.p, -1), SL0 = local(f0.L.p, HL0);
  const topp = {finger: Math.max(REN.topp, doll.hand?.topp?.finger ?? 0), thumb: Math.max(REN.tumme, doll.hand?.topp?.thumb ?? 0)};
  const grepp = greppOppet(SR0, topp); if (!grepp) throw Error(`koreo-giv: ${input.place}: inget öppet grepp med tummen under kortet.`);
  // (kanten hon håller vetter bakåt mot handleden: kortet pekar fram längs handen; framsidan mot handflatan)
  const phi = [...grepp.tummar.keys()].reduce((b, p) => Math.abs(p - 180) < Math.abs(b - 180) ? p : b), SG = grepp.tummar.get(phi)!, ref = refKort(grepp, phi, false, -1, K.glid);
  // (handen öppen före greppet: fingrarna lyfta från ryggen, tummen där den ska vara)
  const SO = medLeder(SG, [[15, 25, 12], [15, 25, 12], [15, 25, 12], [12, 22, 10]]);
  // (högerns form fram till greppet: öppnad på vägen från ankaret, och sluten om kortet över de sista KOREO.sluta rutorna,
  // så att fingertopparna går dit i en jämn rörelse och inte hoppar på en ruta)
  const formH = (t: number) => { const oppen = formMellan(SR0, SO, smooth(clamp01((t - K.hogerFran) / (Math.max(K.hogerFran + 1, tIn) - K.hogerFran)))), k = smooth(clamp01((t - (K.greppat - K.sluta)) / K.sluta));
    return k > 0 ? formMellan(oppen, SG, k) : oppen; };

  // Kortet ut ur skon (pinch-deal.ts leavingShoe), plant på filten med ryggen upp, skjutet till mötespunkten och upp på tummen.
  const skon = input.shoe ?? SHOE, ut = leavingShoe(lens, skon), aSlut = skon.windowLift / Math.sin(skon.plateLean) + HK, ute = ut(aSlut);
  const k0 = f0.card, a0 = cross(k0.n, k0.l), tipp = mul(add(f0.L.p[8], f0.L.p[12]), 0.5), tippPa = [dot(sub(tipp, k0.c), k0.l), dot(sub(tipp, k0.c), a0), dot(sub(tipp, k0.c), k0.n) - 0.0006];
  const paKort = (k: Kort): Vec3 => add(add(add(k.c, mul(k.l, tippPa[0])), mul(cross(k.n, k.l), tippPa[1])), mul(k.n, tippPa[2]));
  // (mötespunkten: kortets mitt där, långsidan längs högerns underarm (från hans högra axel), vänt så att vänsterns
  // fingertoppar är på den bortre änden: högern tar den närmre)
  const axelMitt = mul(add(f0.R.s, f0.L.s), 0.5), M: Vec3 = [axelMitt[0] + K.mote.x, T / 2, axelMitt[2] + K.mote.z], mot = flat(sub(M, f0.R.s));
  const kortM: Kort = (() => { const val = [mot, mul(mot, -1)].map(l => ({k: {c: M, l, n: ute.n} as Kort, fram: dot(sub(paKort({c: M, l, n: ute.n}), M), mot)})); return val.sort((x, y) => y.fram - x.fram)[0].k; })();
  const kortMH: Kort = {...kortM, l: mot};
  // Bytet: kortets närmre ände lutad upp på tummen (kring den bortre kortsidan, som ligger kvar på filten under vänsterns
  // fingrar), så lite att högerhanden är över filten.
  const hogerDel = (k: Kort) => handFor(k, ref, SG);
  const fri = (h: Hand) => overFilten(h) >= 0.001 && !handFaults(punkter(h), 1, null, null).some(f => f.kind === 'filten');
  const tau = (() => { for (let d = 4; d <= 25; d += 0.5) if (fri(hogerDel(kortsidaLyft(kortMH, 1, rad(d))))) return rad(d + 1); return rad(25); })();
  const kortTag = kortsidaLyft(kortMH, 1, tau), hTag = hogerDel(kortTag), kortIn: Kort = {...kortMH, c: add(M, mul(mot, K.tummeIn))};
  // (vägen räknas som vänsterns fingertoppar drar kortet, och dess vridning (en radian som VRIDEN meter), så att farten är en klocka över hela vägen:
  // ut ur skon, skjutet till strax bortom mötespunkten, och sista biten upp på tummen)
  const tappUte: Vec3 = (() => { const p = paKort(ute); return [p[0], ute.c[1], p[2]]; })();
  const yaw = Math.atan2(dot(cross(flat(ute.l), flat(kortM.l)), UP), dot(flat(ute.l), flat(kortM.l)));
  const flytt: Vec3 = (() => { const d = sub(sub(kortIn.c, tappUte), turned(sub(ute.c, tappUte), UP, yaw)); return [d[0], 0, d[2]]; })();
  const skjutet = (s: number): Kort => ({c: add(add(tappUte, mul(flytt, s)), turned(sub(ute.c, tappUte), UP, yaw * s)), l: turned(ute.l, UP, yaw * s), n: ute.n});
  const upp = (s: number): Kort => kortsidaLyft({...kortM, c: lerp(kortIn.c, M, s)}, dot(kortM.l, mot) > 0 ? 1 : -1, tau * smooth(s / 0.45));
  const vag = (a: Kort, b: Kort) => length(sub(paKort(a), paKort(b))) + VRIDEN * vinkel(a.n, b.n) + VRIDEN * vinkel(a.l, b.l);
  const N = 200, tab: number[] = [0]; for (let i = 1; i <= N; i++) tab.push(tab[i - 1] + vag(ut(aSlut * (i - 1) / N), ut(aSlut * i / N)));
  const utLangd = tab[N], skjutLangd = length(flytt) + VRIDEN * Math.abs(yaw), uppLangd = K.tummeIn + VRIDEN * tau, hela = utLangd + skjutLangd + uppLangd;
  const utVid = (s: number) => { let i = 1; while (i < N && tab[i] < s) i++; return aSlut * (i - 1 + clamp01((s - tab[i - 1]) / Math.max(1e-9, tab[i] - tab[i - 1]))) / N; };
  const lamVid = (t: number) => hela * mjuk(t / K.greppat), forsta = (x: number) => { for (let t = 0; t <= K.greppat; t++) if (lamVid(t) > x) return t; return K.greppat; };
  const forskj = sub(k0.c, ut(0).c), dra = forsta(utLangd), tIn = forsta(utLangd + skjutLangd);
  const kortFram = (t: number): Kort => { const lam = lamVid(t);
    if (lam <= utLangd) { const k = ut(utVid(lam)); return {...k, c: add(k.c, mul(forskj, 1 - smooth(t / 3)))}; }
    if (lam <= utLangd + skjutLangd) return skjutet(clamp01((lam - utLangd) / Math.max(1e-9, skjutLangd)));
    return upp(clamp01((lam - utLangd - skjutLangd) / uppLangd)); };

  // Läggningen: kortet till sist plant på platsen, rakt (långsidan mot spelarna), framsidan upp. Kortet vid vridningen
  // `theta` (grader: 0 ryggen upp, 90 framsidan mot hans vänster, 180 framsidan upp) är det kortet vridet kring den
  // långsida det läggs över (gångjärnet, på dess +x-sida), så att den sista biten är en vridning kring den kanten.
  const F: Kort = {c: [input.at[0], T / 2, input.at[2]], l: Z, n: UP}, gangjarn: Vec3 = [F.c[0] + WK / 2, B ? T / 2 : 0, F.c[2]];
  const kortVid = (theta: number): Kort => vridKort(F, gangjarn, Z, rad(theta - 180));
  const vridet = (t: number) => t <= K.vridFran ? 0 : 180 * mjuk((t - K.vridFran) / (K.ligger - K.vridFran));
  // Bärandet: kortet vrids kring gångjärnet, och gångjärnet och kortets axlar förs från bytet till platsen (i en låg båge).
  const td0 = kortVid(0), R0 = ram(td0), RT = ram(kortTag), tillTag = vridning(R0, RT), off0 = sub(sub(kortTag.c, gangjarn), tillTag(sub(td0.c, gangjarn)));
  const offVid = (b: number) => bezier(off0, add(mul(off0, 0.6), [0, K.bage, 0]), add(mul(off0, 0.2), [0, K.bage * 0.6, 0]), [0, 0, 0], b);
  const kortBar = (t: number): Kort => { const b = mjuk((t - K.greppat) / (K.nere - K.greppat)), R = vridning(R0, between(RT, R0, mjuk(clamp01(((t - K.greppat) / (K.nere - K.greppat) - 0.15) / 0.85)))), k = kortVid(vridet(t)), o = offVid(b);
    return {c: add(add(gangjarn, o), R(sub(k.c, gangjarn))), l: unit(R(k.l)), n: unit(R(k.n))}; };
  const hSlapp = hogerDel(kortVid(vridet(K.slapp)));

  // ---- högerhanden ruta för ruta ----
  const ankare: Hand = {a: HR0, w: f0.R.w, S: SR0};
  // (fingrarna vilande på det liggande kortet: handflatan nedåt och lite vriden, pek- och långfingrets toppar på framsidan
  // en bit in från den närmre kortsidan, ring- och lillfingret aldrig mer böjda än långfingret, tummen som i ankaret)
  const SV = medLeder(SR0, [[25, 35, 18], [25, 35, 18], [22, 32, 16], [20, 30, 15]]);
  const AV: Axes = (() => { const palm = turned([0, -1, 0], Z, rad(K.rulleVila)); return {forward: Z, palm, across: cross(palm, Z)}; })();
  const hVila: Hand = (() => { const P = placed(SV, AV, [0, 0, 0]), m = mul(add(P[8], P[12]), 0.5), lag = Math.min(P[8][1], P[12][1]), mal: Vec3 = [F.c[0] - 0.008, T + topp.finger + 0.0005, F.c[2] - HK / 2 + 0.03];
    return {a: AV, w: [mal[0] - m[0], mal[1] - lag, mal[2] - m[2]], S: SV}; })();
  const toppMitt = (h: Hand) => { const p = punkter(h); return mul(add(p[8], p[12]), 0.5); };
  // (handleden lyfts lite kring fingertopparna medan de vilar, så att handen inte står still)
  const lyftAxel = (() => { const ax = unit(hVila.a.across), x = rad(K.vilaLyft), w = kring(hVila.w, toppMitt(hVila), ax, x); return w[1] > hVila.w[1] ? ax : mul(ax, -1); })();
  const vilande = (s: number) => vridHand(hVila, toppMitt(hVila), lyftAxel, rad(K.vilaLyft) * smooth(s));
  // Läggningens väg för handen, från sista rutan i greppet (kortet på sin nedre långsida på filten) till vilan: fingrarna och tummen
  // glider upp av ryggen och framsidan medan tummen för kortet förbi lodrätt, handen lyfts över kortets fria långsida och
  // vänds tillbaka (handflatan nedåt) och sänks så att pek- och långfingret ligger på framsidan när kortet ligger. Handen
  // vrids bara kring sin framåt (underarmen) och dess fingertoppar följer en båge (LAGG); ruta för ruta flyttas båda så
  // lite som håller handen ur kortet och filten, med farten jämn mellan rutorna.
  const rullad = (rho: number): Axes => { const palm = turned([0, -1, 0], Z, rad(rho)); return {forward: Z, palm, across: cross(palm, Z)}; };
  const medToppar = (A: Axes, S: Vec3[], P: Vec3): Hand => { const q = mul(add(S[8], S[12]), 0.5); return {a: A, w: sub(P, add(add(mul(A.forward, q[0]), mul(A.palm, q[1])), mul(A.across, q[2]))), S}; };
  const theta0 = vridet(K.slapp), T0 = toppMitt(hSlapp), PV = toppMitt(hVila);
  const nominell = (u: number) => ({P: bezier(T0, add(T0, [-0.01, LAGG.upp, 0]), add(PV, [0, LAGG.over, 0]), PV, smooth(u)), rho: theta0 + (K.rulleVila - theta0) * smooth(u)});
  /** Hur långt tummen och pek- eller långfingret är från kortets två sidor (meter, det sämsta av dem). */
  const ror = (h: Hand, k: Kort) => { const p = punkter(h), sida = (q: Vec3) => dot(sub(q, k.c), k.n), gap = (q: Vec3, r: number) => Math.abs(sida(q)) - T / 2 - r;
    return Math.max(gap(p[4], topp.thumb), Math.min(gap(p[8], topp.finger), gap(p[12], topp.finger))); };
  /** Hur nära kortet (meter från dess yta) närmaste fingertopp eller tummen är, där den är över kortet: handen följer det ned. */
  const nara = (h: Hand, k: Kort) => { const p = punkter(h), a = cross(k.n, k.l);
    return Math.min(...[4, 8, 12, 16, 20].map(j => { const d = sub(p[j], k.c); return Math.abs(dot(d, k.l)) < HK / 2 + 0.005 && Math.abs(dot(d, a)) < WK / 2 + 0.005 ? Math.abs(dot(d, k.n)) - T / 2 - (j === 4 ? topp.thumb : topp.finger) : Infinity; })); };
  const laggR: Hand[] = (() => { const ut: Hand[] = [hSlapp], spar: {P: Vec3; rho: number}[] = [{P: toppMitt(hogerDel(kortVid(vridet(K.slapp - 1)))), rho: vridet(K.slapp - 1)}, {P: T0, rho: theta0}];
    for (let t = K.slapp + 1; t < K.ligger; t++) { const u = (t - K.slapp) / (K.ligger - K.slapp), k = kortVid(vridet(t)), S = formMellan(SG, SV, smooth(u / 0.6)), nom = nominell(u);
      const [a, b] = spar.slice(-2), gissP = sub(mul(b.P, 2), a.P), gissR = 2 * b.rho - a.rho; let bast: {h: Hand; P: Vec3; rho: number; c: number} | null = null;
      for (let dx = -LAGG.sok; dx <= LAGG.sok + 1e-9; dx += LAGG.steg) for (let dy = -LAGG.sok; dy <= LAGG.sok + 1e-9; dy += LAGG.steg) for (let dr = -LAGG.rulle; dr <= LAGG.rulle; dr += 5) {
        const P = add(nom.P, [dx, dy, 0]), rho = nom.rho + dr, h = medToppar(rullad(rho), S, P);
        let c = 100 * iKortet(h, k) + (length(sub(P, nom.P)) / 0.01) ** 2 + (dr / 10) ** 2 + 2 * (length(sub(P, gissP)) / 0.01) ** 2 + 2 * ((rho - gissR) / 10) ** 2;
        if (t === K.slapp + 1) c += 50 * Math.max(0, ror(h, k) - 0.003) * 1000;
        else c += 10 * Math.max(0, nara(h, k) - 0.005) * 1000;
        if (!bast || c < bast.c) bast = {h, P, rho, c}; }
      ut.push(bast!.h); spar.push({P: bast!.P, rho: bast!.rho}); }
    // (vägen jämnad: varje ruta mot medel av rutorna intill, så länge handen inte går djupare i kortet eller filten därav)
    const lag = [{P: T0, rho: theta0}, ...spar.slice(2), {P: PV, rho: K.rulleVila}], hand = (j: number, x: {P: Vec3; rho: number}) => { const u = j / (K.ligger - K.slapp); return medToppar(rullad(x.rho), formMellan(SG, SV, smooth(u / 0.6)), x.P); };
    for (let pass = 0; pass < 6; pass++) for (let j = 1; j < lag.length - 1; j++) { const x = {P: mul(add(add(lag[j - 1].P, lag[j + 1].P), mul(lag[j].P, 2)), 0.25), rho: (lag[j - 1].rho + lag[j + 1].rho + 2 * lag[j].rho) / 4}, k = kortVid(vridet(K.slapp + j));
      if (iKortet(hand(j, x), k) <= iKortet(hand(j, lag[j]), k) + 1e-9 && (j > 1 || ror(hand(j, x), k) <= Math.max(0.003, ror(hand(j, lag[j]), k)))) lag[j] = x; }
    for (let j = 1; j < lag.length - 1; j++) ut[j] = hand(j, lag[j]);
    ut.push(hVila); return ut; })();
  const hogerVid = (t: number): Hand => {
    if (t <= K.hogerFran) return ankare;
    // (fram till kortet: lyft ur ankaret i en båge, vriden och öppnad på vägen, och stilla vid tummens plats när kortet kommer)
    if (t <= tIn) { const s = mjuk((t - K.hogerFran) / (tIn - K.hogerFran)), p1 = add(lerp(f0.R.w, hTag.w, 0.35), [0, 0.035, 0]), p2 = add(hTag.w, [0, 0.02, 0]);
      return {a: between(HR0, hTag.a, mjuk(Math.min(1, s / 0.85))), w: bezier(f0.R.w, p1, p2, hTag.w, s), S: formH(t)}; }
    if (t <= K.greppat) return {...hTag, S: formH(t)};
    if (t <= K.nere) return hogerDel(kortBar(t));
    if (t <= K.slapp) return hogerDel(kortVid(vridet(t)));
    if (t <= K.ligger) return laggR[t - K.slapp];
    if (t <= K.vilar) return vilande((t - K.ligger) / (K.vilar - K.ligger));
    const fran = vilande(1), s = mjuk((t - K.vilar) / (K.hemma - K.vilar)), p1 = add(lerp(fran.w, f0.R.w, 0.35), [0, 0.04, 0]), p2 = add(lerp(fran.w, f0.R.w, 0.75), [0, 0.015, 0]);
    return {a: between(fran.a, HR0, s), w: bezier(fran.w, p1, p2, f0.R.w, s), S: formMellan(SV, SR0, s)};
  };

  // ---- kortet ruta för ruta ----
  const kortVidT = (t: number): Kort => t <= K.greppat ? kortFram(t) : t <= K.nere ? kortBar(t) : t <= K.ligger ? kortVid(vridet(t)) : F;

  // ---- vänsterhanden ruta för ruta ----
  // (fingertopparna på kortets rygg där de är i ankaret; handen vrids med kortet när det lägger sig (eller mindre, där
  // fingrarna annars skulle gå i filten) och fingrarna öppnas, lätt böjda: Jakob 2026-11-26 om bytet, "krökta som en klo" var fel)
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
  let aV: Axes[] = Array.from({length: K.greppat + 1}, (_, t) => t === 0 ? HL0 : vansterPa(kortFram(t), formV(t), smooth(t / (dra + 1))).a);
  for (let pass = 0; pass < 6; pass++) aV = aV.map((a, t) => t === 0 || t === K.greppat ? a : between(between(aV[t - 1], aV[t + 1], 0.5), a, 0.5));
  const vansterFram = (t: number): Hand => { const k = kortFram(t), S = formV(t), tl = mul(add(S[8], S[12]), 0.5), A = aV[t], P = paKort(k);
    return {a: A, w: sub(P, add(add(mul(A.forward, tl[0]), mul(A.palm, tl[1])), mul(A.across, tl[2]))), S}; };
  // (vänstern följer kortet stelt medan högern börjar bära det, en ruta: dess fingertoppar ligger kvar på ryggen)
  const hGreppat = vansterFram(K.greppat);
  const medKortet = (t: number): Hand => ({...hGreppat, w: add(hGreppat.w, sub(kortVidT(Math.min(t, K.vansterSlapper)).c, kortTag.c))});
  const vansterVid = (t: number): Hand => {
    if (t === 0) return {a: HL0, w: f0.L.w, S: SL0};
    if (t <= K.greppat) return vansterFram(t);
    if (t <= K.vansterSlapper) return medKortet(t);
    const slapp = medKortet(K.vansterSlapper), s = mjuk((t - K.vansterSlapper) / (K.vansterHemma - K.vansterSlapper));
    if (s >= 1) return {a: HL0, w: f0.L.w, S: SL0};
    // (upp från kortet i takt med att högern lyfter det, sedan i en båge hem; en enda båge, så att farten
    // stiger och faller jämnt; fingrarna åter som i ankaret)
    const p1 = add(slapp.w, [0, K.vansterUpp * 2, 0]), p2 = add(f0.L.w, [0, K.vansterUpp, 0]);
    const j = t - K.vansterSlapper, foljer: Vec3 = [0, (kortVidT(t).c[1] - kortVidT(K.vansterSlapper).c[1] + 0.012 * smooth(j / 2)) * (1 - smooth(j / 8)), 0];
    return {a: between(slapp.a, HL0, smooth(s)), w: add(bezier(slapp.w, p1, p2, f0.L.w, s), foljer), S: formMellan(SLo, SL0, s)};
  };

  // ---- rutorna: händer och kort ----
  const R: Hand[] = [], L: Hand[] = [], C: Kort[] = [];
  for (let t = 0; t < n; t++) { R.push(hogerVid(t)); L.push(vansterVid(t)); C.push(kortVidT(t)); }
  // (vänsterhanden högst RAK grader från underarmen, som en handled böjs (figure-model.ts ställer den högst 50 grader från
  // den): vriden mot underarmen kring fingertopparna (som ligger på kortet till bytet); underarmen från
  // axeln som armen når handleden, två gånger om eftersom den följer handleden)
  const polV = unit(sub(f0.L.e, f0.L.s));
  for (let t = 1; t < n; t++) for (let gang = 0; gang < 3; gang++) { const h = L[t], e = arm(f0.L.s, h.w, polV, doll).elbow, fore = unit(sub(h.w, e)), fram = unit(sub(punkter(h)[9], h.w)), x = vinkel(fram, fore) - rad(RAK);
    if (x <= 0) break; const ax = unit(cross(fram, fore)); L[t] = vridHand(h, toppMitt(h), ax, x); }
  // (och vänsterns pek- och långfinger på ryggen till bytet: handen flyttad längs kortets normal tills den lägsta av
  // topparna ligger an)
  for (let t = 1; t <= K.vansterSlapper; t++) { const k = C[t], p = punkter(L[t]), sida = (q: Vec3) => dot(sub(q, k.c), k.n), s = Math.sign(sida(p[8]) + sida(p[12])) || -1;
    const glapp = Math.min(...[p[8], p[12]].map(q => Math.abs(sida(q)) - T / 2 - topp.finger)) - 0.0005; L[t] = {...L[t], w: sub(L[t].w, mul(k.n, s * glapp))}; }
  // (medan högern bär kortet ned mot platsen: hand och kort lyfta så mycket som håller tummen under kortet ur filten,
  // jämnat över rutorna intill så att lyftet är en mjuk båge)
  const brist = R.map((h, t) => t > K.greppat && t < K.nere ? Math.max(0, 0.002 - overFilten(h)) : 0);
  const lyft = brist.map((_, t) => Math.max(0, ...brist.map((x, j) => x * smooth(1 - Math.abs(t - j) / 4))));
  for (let t = K.greppat + 1; t < K.nere; t++) if (lyft[t] > 0) { const upp: Vec3 = [0, lyft[t], 0]; R[t] = {...R[t], w: add(R[t].w, upp)}; C[t] = {...C[t], c: add(C[t].c, upp)}; }
  // (kortets långsida åt samma håll i alla rutor: ett kort och samma kort vänt ett halvt varv kring framsidans normal är ett)
  for (let t = 1; t < n; t++) if (dot(C[t].l, C[t - 1].l) < 0) C[t] = {...C[t], l: mul(C[t].l, -1)};

  // ---- bålen, armarna, huvudet och blicken (som ren-giv.ts: bålen bara så mycket räckvidden kräver) ----
  const need = rackvidd(hip, f0.R.s, R.map(h => h.w), F.c, doll, REN.naturlig), torso = bal(hip, F.c, need.lean, need.twist);
  const nar = doll.upperArm + doll.forearm - REN.naturlig, nas = (k: number, t: number) => length(sub(R[t].w, torso(f0.R.s, k))) <= nar && length(sub(L[t].w, torso(f0.L.s, k))) <= nar;
  const kravs = R.map((_, t) => { if (nas(0, t)) return 0; if (!nas(1, t)) return 1; let lo = 0, hi = 1; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (nas(m, t)) hi = m; else lo = m; } return hi; });
  const TONA = 10, fonster = (t: number) => smooth(t / 4) * smooth((n - 1 - t) / 4), tonad = (v: number[]) => v.map((_, t) => Math.max(v[t], fonster(t) * Math.max(0, ...v.map((x, j) => x * smooth(1 - Math.abs(t - j) / (TONA + 1))))));
  const andel = tonad(kravs), sR = (t: number) => torso(f0.R.s, andel[t]), sL = (t: number) => torso(f0.L.s, andel[t]);
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
    // (högerhanden högst RAK grader från underarmen medan den bär kortet: vriden mot den kring fingertopparna, kortet med
    // den i greppet, och armbågen löst igen)
    let e1 = ände ? f0.R.e : armbageR();
    if (t > K.greppat && t < K.nere) for (let gang = 0; gang < 3; gang++) { const fore = unit(sub(R[t].w, e1)), fram = unit(sub(punkter(R[t])[9], R[t].w)), x = vinkel(fram, fore) - rad(RAK_H);
      if (x <= 0) break; const ax = unit(cross(fram, fore)), o = toppMitt(R[t]); R[t] = vridHand(R[t], o, ax, x); C[t] = vridKort(C[t], o, ax, x);
      const upp: Vec3 = [0, Math.max(0, 0.003 - overFilten(R[t])), 0]; R[t] = {...R[t], w: add(R[t].w, upp)}; C[t] = {...C[t], c: add(C[t].c, upp)}; e1 = armbageR(); }
    const e2 = ände ? f0.L.e : arm(s2, L[t].w, turned(polL, unit(sub(L[t].w, s2)), vL[t] + extraL[t]), doll).elbow;
    // (blicken till kortet när det lämnar skon och följer det, över tio rutor dit och hem igen)
    const k = C[t], blick = t <= 10 ? lerp(g0, k.c, mjuk(t / 10)) : t <= K.ligger ? k.c : lerp(k.c, g0, mjuk((t - K.ligger) / (K.hemma - K.ligger)));
    frames.push({card: {c: r4(k.c), l: r4(unit(k.l)), n: r4(unit(k.n)), id: 0},
      R: {s: r4(s1), e: r4(e1), w: r4(ände ? f0.R.w : R[t].w), k: f0.R.k, p: (ände ? f0.R.p : punkter(R[t])).map(r4)},
      L: {s: r4(s2), e: r4(e2), w: r4(ände ? f0.L.w : L[t].w), k: f0.L.k, p: (ände ? f0.L.p : punkter(L[t])).map(r4)},
      h: r4(torso(f0.h, andel[t] * 0.85)), g: r4(blick)});
  }
  const lutPer = andel.map(x => grad(need.lean * x)), vridPer = andel.map(x => grad(Math.abs(need.twist) * x)), mest = Math.max(...andel);
  const times = {ute: dra, framme: tIn, greppat: K.greppat, vansterLyfter: K.vansterSlapper, nere: K.nere, ligger: K.ligger, slut: K.hemma, tar: K.greppat, slapper: K.slapp};
  const kvitto = {grepp: {hall: grepp.hall, phi, glid: K.glid}, mote: r4(M), lyftVidBytetGrader: grad(tau), lutGrader: grad(need.lean * mest), vridGrader: grad(Math.abs(need.twist) * mest), lutPerRuta: lutPer, vridPerRuta: vridPer,
    armbagenUtGrader: {R: grad(Math.max(...extraR.map(Math.abs))), L: grad(Math.max(...extraL.map(Math.abs)))}};
  const motion = {fps: 30, frameCount: n, leavesShoe: dra, edge: [K.nere, K.nere], folds: K.nere, rests: K.ligger, hip, doll: doll.name, to: [input.place], frames,
    cycle: {holdThrough: K.vilar, liftStarts: K.vilar, liftEnds: K.vilar + 2, readyFrom: n - 1, durationSeconds: n / 30, liftMeters: 0.02,
      method: B ? 'Choreographed from A2.3 by dealer3d/src/koreo-giv.ts, version B (turned where it lands): drawn out of the shoe and slid to the middle by the left hand, taken thumb under by the right; carried low and flat, back up, and laid beside the place; there the thumb lifts its free long side and the forearm turns, so that the card folds over the other long side like a page and lands face up on the place; two fingertips rest on it and the hand goes home.' : 'Choreographed from A2.3 by dealer3d/src/koreo-giv.ts, version A (the key turn): drawn out of the shoe and slid to the middle by the left hand, its near end pushed onto the right thumb; taken thumb under, forefinger and middle finger on the back; carried while the forearm turns like a key (thumb up), the lower long side set on the felt at the place and the card laid on its back the same way round, face up, the fingers sliding off; two fingertips rest on it and the hand goes home.'}};
  return {motion, times, kvitto};
}
