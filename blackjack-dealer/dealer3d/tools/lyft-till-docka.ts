// Ett lyft ur livebordets film (live-bj/data/lyft/) lagt på en docka vid livebordet (Danilo eller Frasse, dealer3d/src/doll.ts
// LIVE_DOLLS) som en rörelse dockan kan spela, i dockans eget format (som dealer3d/data/giv-fran-2-3-p4c1-ren-a-man.json,
// med minen i fältet a) och i livebordets linsvärld (src/table-live.ts):
//   dealer3d/data/lyft-<docka>-p<plats>.json      en giv, från ankaret vid skon till ankaret vid skon (A2.3): kortet ur
//                                                 skon, handbytet, kortet på platsen, högern hem och vänstern till skon
//   dealer3d/data/lyft-<docka>-vantan-<n>.json    en väntan i vilan (A1): händerna i vilan, huvudet, blicken och minen lever
//   dealer3d/data/lyft-<docka>-till-skon.json     ur vilan till skon (A1 till A2.3), och lyft-<docka>-hem.json tillbaka: vårt eget
//   dealer3d/data/ankare-vila-<docka>.json        vilan (A1), och ankare-skon-<docka>.json redo vid skon (A2.3, ur filmen)
//   (rörelserna säger sina ankaren i fältet ankare; huvudets eget mål står i rutornas hv, ögonens i g)
//
//   node dealer3d/tools/lyft-till-docka.ts <lyftet.json> <docka>      (från blackjack-dealer/)
//   node dealer3d/tools/lyft-till-docka.ts --alla                     alla lyften i live-bj/data/lyft/, var och en på sin docka, och vägarna till och från skon
//                                                                     (och varje persons docka, src/persondockor.ts, med lyften i sin stil)
//   node dealer3d/tools/lyft-till-docka.ts --docka <namn>             bara en persons docka: lyften i dess stil och vägarna till och från skon
//        [--lyft <mapp>] [--ut <mapp>]                                lyften ur en annan mapp, rörelserna till en annan (för att pröva)
//
// DET RÅA LYFTET ÄR SANNINGEN OM VAR HÄNDERNA ÄR (Jakob 2026-11-27, om vänsterhanden i bytet: "en kvarleva från gamla dockan
// eller förra standarddockans rörelsemönster"). Inget här kommer ur standarddockans koreografi (koreo-giv.ts): inga egna
// nyckellägen; kortet på kant i bytet och nypet i högern är den riktiga dealerns (filmen ruta 48–52). Den riktiga dealerns, ruta för ruta: handledernas
// väg (lyftets, jämnad lugnt där handen är stilla och lätt där den rör sig, se lugna), händernas vinkel (lyftets, med de
// rutor där MediaPipe vänder handen bort och jämnad likadant), fingrarnas form (lyftets riktningar på dockans ben, inom
// hand-rule.ts LIMITS), axlarnas och huvudets rörelse, minen och TIDEN (när vänsterhanden är vid skon, när kortet lämnar
// skon, bytet, när högerns handled stannar vid platsen). Kortet följer händerna: i skon tills vänstern drar ut det, plant
// under vänsterns fingertoppar och rest på kant i vänsterns grepp fram till bytet, på kant mellan händerna i bytet, och
// sedan i HÖGERN (vandKort, nypt): på kant uppe i luften mellan pekfingret och tummen, tippat kring sin övre långsida ned
// på filten med framsidan upp, och skjutet plant till platsen, där fingret vilar på kortets övre kant tills handen går hem
// (filmen ruta för ruta, Danilos giv till plats 4: på kant mellan händerna i ruta 48–49, i luften 50–52, framsidan syns
// under pekfingret i 59).
// VÅRT EGET, och märkt: dockans ben och mått (doll.ts); ankaret (vilan, dealer3d/data/ankare-vila-<docka>.json: handlederna
// där väntans lyft har dem, händerna plant på filten med lätt böjda, samlade fingrar); bryggorna mellan ankaret och lyftet
// i början och slutet (en mjuk rörelse i stilens fart, rörelsens made.faser säger var); den pekande högerhanden medan kortet
// är under fingret (pekande: fingrarnas form och handens lutning längs synlinjen, där lyftet är osäkert); handledens djup
// längs synlinjen (en jämn kurva); rättningar vid en kontakt, högst KONTAKT (2 cm) och bara i de rutorna; bålens lutning där
// armen inte når (ren-giv.ts rackvidd och bal, jämnad); blicken (ett mål per stycke ur lyftets fält blick, blickMal);
// armbågen (body.ts arm, mot lyftets sida om linjen axel–handled, vriden så att handen står nära underarmens linje och
// underarmen går över bordets kant); högerns väg böjd mot där den riktiga dealerns kort låg (kortetIFilmen, siktat). Kortet
// läggs aldrig till rätta: det ligger där handen lägger det, i den vinkel det kom. Det rättningarna inte når står i made.chosen
// och i lyft-kolla.ts, som fynd om lyftet eller bordet.
// Kontrollen är dealer3d/tools/lyft-kolla.ts.
import {mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CARD, add, cross, dot, length, mul, sub, unit, type Vec3} from '../../src/space.ts';
import {LIVE, LIVE_CAMERA, liveSee, liveShoeCard} from '../../src/table-live.ts';
import {arm, turned} from '../src/body.ts';
import {LIVE_DOLLS, dollFrame, type Doll} from '../src/doll.ts';
import {PERSONDOCKOR} from '../src/persondockor.ts';
import {axesOf, between, local, placed, type Axes} from '../src/hand-pose.ts';
import {FINGERS} from '../src/hand-pose.ts';
import {LIMITS, bendsOf, fingerFrom, handFaults} from '../src/hand-rule.ts';
import {BALL, REN, bal, formMellan, mjuk, rackvidd, smooth, underarmLuft, type Kant} from '../src/lyft.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url)), CASINO = path.join(ROOT, '..');
export const DATA = path.join(ROOT, 'dealer3d/data'), LYFT = path.join(CASINO, 'live-bj/data/lyft');

// ---- typerna --------------------------------------------------------------------------------------------------------
export type Kort = {c: Vec3; l: Vec3; n: Vec3};
type Hand = {a: Axes; w: Vec3; S: Vec3[]};
export type Limb = {s: Vec3; e: Vec3; w: Vec3; k: number; p: Vec3[]};
/** En ruta: g är blickpunkten (ögonen), hv (om den finns) punkten huvudet vänds mot, ht (om den finns) huvudets tippning i grader (toppen mot dockans egen höger positiv): då bär ögonen blicken och huvudet rör sig som dealerns. */
export type Frame = {card: Kort & {id: number}; R: Limb; L: Limb; h: Vec3; g: Vec3; hv?: Vec3; ht?: number; a: Record<string, number>};
type LyftLimb = {s: Vec3; e: Vec3; w: Vec3; p: Vec3[] | null};
export type LyftRuta = {t: number; blick?: string; R: LyftLimb; L: LyftLimb; h: Vec3 | null; g: Vec3 | null; hv?: Vec3 | null; huvud?: Vec3 | null; ansikte?: Vec3 | null; a: Record<string, number> | null; card?: {c: Vec3 | null; l: Vec3 | null; n: Vec3 | null; seen: boolean} | null};
export type Lyft = {style: 'kameran' | 'bordet'; docka: string; to?: string; kind?: string; left_at?: string; right_at?: string; film_seconds: number[]; fps: number; frameCount: number; leavesShoe?: number; rests?: number; hands?: string; frames: LyftRuta[]};
type Stil = {face: {shapes: Record<string, {verdict: string; usual: number}>}; speed: Record<string, {top_m_s?: {best?: {median: number}}}>};
type Sida = 'R' | 'L';
/** Vad en hand gör i en ruta, i rörelsens made.hand: v vilan (ankaret), b en brygga mellan ankaret och lyftet, l lyftet, k lyftet med en kontakträttning. */
export type Kalla = 'v' | 'b' | 'l' | 'k' | 'a';
export type Fas = {fran: number; till: number; vad: string; kalla: 'ankaret' | 'brygga' | 'lyftet'};

// ---- småsaker -------------------------------------------------------------------------------------------------------
const FPS = 30, UP: Vec3 = [0, 1, 0], HK = CARD.height, WK = CARD.width, T = CARD.thickness;
/** Det största en kontakt får flytta en hand från lyftet (meter): behövs mer är det ett fynd om lyftet eller bordet. */
export const KONTAKT = 0.02;
/** Hur många rutor kroppen tar på sig att resa sig från skon till vilan, sedan händerna är hemma (domaren: minst en halv sekund; dealerns huvud är 6–7 cm lägre medan han ger). */
const KROPP_HEM = 24;
const SIDOR: [Sida, number][] = [['R', 1], ['L', -1]];
const r4 = (v: Vec3): Vec3 => v.map(x => Math.round(x * 10000) / 10000) as Vec3;
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, mul(sub(b, a), t));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const rad = (d: number) => d * Math.PI / 180, grad = (r: number) => r * 180 / Math.PI;
/**
 * Huvudets vinklar som dealerns i lyftet (live-bj/verktyg/lyft.py huvud): nick (ned positivt), vridning (mot dealerns egen
 * vänster positivt) och tippning (toppen mot hans egen höger positivt), i grader från vilan där han ser in i kameran.
 * huvudMot ger punkten huvudet i h vänds mot med de vinklarna, räknad som lyft.py räknar dealerns: från hållet mot
 * livebordets kamera, på kamerans avstånd (så att vinklarna noll är kameran själv, som i vilan).
 */
const KAMERA: Vec3 = [0, LIVE_CAMERA.height, 0];
const huvudMot = (h: Vec3, v: Vec3): Vec3 => { const c = sub(KAMERA, h), a = Math.atan2(c[0], c[2]) + rad(v[1]), low = Math.atan2(-c[1], Math.hypot(c[0], c[2])) + rad(v[0]);
  return add(h, mul([Math.sin(a) * Math.cos(low), -Math.sin(low), Math.cos(a) * Math.cos(low)], length(c))); };
/** En ton 0–1 med jämn fart i mitten (en fjärdedel upp i fart, en fjärdedel ned): högsta farten är 4/3 av medelfarten. */
const jamnTon = (u: number) => { const x = clamp01(u), a = 0.25, v = 1 / (1 - a); return x < a ? v * x * x / (2 * a) : x > 1 - a ? 1 - v * (1 - x) ** 2 / (2 * a) : v * (a / 2 + x - a); };
const r1 = (x: number) => Math.round(x * 10) / 10;
/** En riktnings höjd (upp positivt) och sida (mot bildens höger positivt) i grader, och riktningen ur dem. */
const hojdSida = (d: Vec3): [number, number] => { const u = unit(d); return [grad(Math.asin(clamp(u[1], -1, 1))), grad(Math.atan2(u[0], u[2]))]; };
const ritningAv = (hojd: number, sida: number): Vec3 => [Math.cos(rad(hojd)) * Math.sin(rad(sida)), Math.sin(rad(hojd)), Math.cos(rad(hojd)) * Math.cos(rad(sida))];
/** Hur riktningen a ligger mot riktningen b: höjd och sida i grader (sidan inom ±180), som en Vec3 med noll sist. */
const vinkelSkillnad = (a: Vec3, b: Vec3): Vec3 => { const x = hojdSida(a), y = hojdSida(b); let s = x[1] - y[1]; while (s > 180) s -= 360; while (s < -180) s += 360; return [x[0] - y[0], s, 0]; };
/** Blickpunkten för ett huvud i h som vetter mot hv, med ögonen vridna `ogon` (höjd, sida i grader) i huvudet: en meter ut. */
const blickAv = (h: Vec3, hv: Vec3, ogon: Vec3): Vec3 => { const [p, s] = hojdSida(sub(hv, h)); return add(h, ritningAv(p + ogon[0], s + ogon[1])); };
/**
 * Dockans nick mot kameran (huvudMot, grader) och vad ansiktsnätet läser på hennes film genom livebordets kamera
 * (live-bj/verktyg/lyft.py dockhuvud; mätt 2026-11-27 med huvudet låst i Danilos ankare vid skon). Dealerns nick läses av
 * samma nät (lyftets ansikte), så dockans nick är den som ger samma tal: domaren ser med nätet och ögat, inte med lyftets
 * vila. Över 40° tar halsen inte mer (figure-model.ts HEAD.most).
 */
const NICK_NAT: [number, number][] = [[0, 11.0], [10, 18.9], [20, 27.2], [30, 33.5], [40, 41.4]];
const nickFranNat = (m: number) => { const k = NICK_NAT, i = m <= k[1][1] ? 0 : m >= k[k.length - 2][1] ? k.length - 2 : k.findIndex((p, j) => j < k.length - 1 && m >= p[1] && m <= k[j + 1][1]);
  const [a, b] = [k[i], k[i + 1]]; return a[0] + (m - a[1]) * (b[0] - a[0]) / (b[1] - a[1]); };
/** Huvudets ton till och från ankaret: högst så många grader per ruta vrider tonen själv huvudet, tillbaka till ankaret i slutet och (ovanpå dealerns egen rörelse) från det i början. */
const HUVUD_UT = 1.0, HUVUD_IN = 0.45;
const huvudTonLangd = (grader: number, fart: number) => Math.max(16, Math.ceil(4 / 3 * grader / fart));
/**
 * Var huvudet i slutet börjar gå från dealerns till ankarets (e0: inte före rutan fran, inte efter lyftets sista) och hur
 * lång rörelsen då blir (N, minst N0): så sent som möjligt utan att rörelsen blir längre än den måste, och tonen vrider
 * huvudet högst HUVUD_UT grader per ruta eller dealerns egen högsta fart i lyftet om den är större. Får rörelsen inte bli
 * längre (en väntan) är det rutan som behöver minst, och tonen får gå fortare.
 */
function huvudetsSlut(HV: Vec3[], A: Vec3, fran: number, N0: number, forlang: boolean) {
  const fart = Math.max(HUVUD_UT, ...HV.slice(1).map((x, i) => length(sub(x, HV[i])))), sist = Math.min(HV.length - 1, forlang ? HV.length - 1 : N0 - 2);
  let bast = {e0: Math.min(fran, sist), N: Infinity};
  for (let e = Math.min(fran, sist); e <= sist; e++) { const N = Math.max(N0, e + huvudTonLangd(length(sub(HV[e], A)), fart) + 1); if (N <= bast.N) bast = {e0: e, N}; }
  return forlang ? bast : {e0: bast.e0, N: N0};
}
const flat = (v: Vec3): Vec3 => unit([v[0], 0, v[2]]);
const mitt = (a: Vec3, b: Vec3): Vec3 => mul(add(a, b), 0.5);
const vinkel = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b)))));
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const medianV = (v: Vec3[]): Vec3 => [0, 1, 2].map(k => median(v.map(p => p[k]))) as Vec3;
const begrans = (v: Vec3, m: number): Vec3 => length(v) > m ? mul(unit(v), m) : v;
const punkter = (h: Hand) => placed(h.S, h.a, h.w);
const toppMitt = (h: Hand) => { const p = punkter(h); return mitt(p[8], p[12]); };
const kring = (v: Vec3, o: Vec3, ax: Vec3, x: number) => add(o, turned(sub(v, o), ax, x));
const vridAxlar = (A: Axes, ax: Vec3, x: number): Axes => ({forward: turned(A.forward, ax, x), palm: turned(A.palm, ax, x), across: turned(A.across, ax, x)});
const vridHand = (h: Hand, o: Vec3, ax: Vec3, x: number): Hand => ({a: vridAxlar(h.a, ax, x), w: kring(h.w, o, ax, x), S: h.S});
const flyttHand = (h: Hand, d: Vec3): Hand => ({...h, w: add(h.w, d)});
const flyttKort = (k: Kort, d: Vec3): Kort => ({...k, c: add(k.c, d)});
const kortHorn = (k: Kort): Vec3[] => { const a = cross(k.n, k.l); return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([u, v]) => add(add(k.c, mul(k.l, u * HK / 2)), mul(a, v * WK / 2))); };
const kortLagst = (k: Kort) => Math.min(...kortHorn(k).map(p => p[1])) - T / 2;
const sha = (fil: string) => createHash('sha256').update(readFileSync(fil)).digest('hex').slice(0, 12);
/** Fingertopparnas trampdynor: mitt emellan pek- och långfingrets toppar, en topps radie ut åt handflatans sida. */
const dynor = (h: Hand) => add(toppMitt(h), mul(h.a.palm, BALL(8)));

// ---- vändningen under pekfingret ------------------------------------------------------------------------------------
// Så gör den riktiga dealern (Danilos giv till plats 4, ruta för ruta, live-bj/rutor): vänstern för kortet ur skon och
// reser det på kant (45–48), kortet står på sin långsida mellan händerna i bytet (48–49), högern tar det på kant och bär
// det uppe i luften (50–52), för det snabbt ned mot platsen med kortet under handen (53–57), framsidan syns under
// pekfingret (59), kortet ligger plant med pekfingret ovanpå och skjuts på plats, och fingret vilar på kortets övre kant
// tills handen går hem. Här: kortet står på kant i bytet med sin övre långsida under högerns pekfingertopp och den andra
// änden vid vänsterns fingertoppar; högern bär det så, med kortets nedre kant KORT_LYFT över filten och tummen mot dess sida,
// och tippar det kring den övre långsidan ned på filten med framsidan upp medan handen går ned; på filten skjuts det på plats.
/** Hur högt pekfingertoppens mitt är över kortets kant och ovansida (meter): fingret ligger an. */
const LUFT = 0.0006;
/** Hur långt in från kortets långsida pekfingret ligger när kortet är plant (meter); i kanten när det står. */
const KANT = 0.005;
const kantIn = (fi: number) => KANT * Math.abs(Math.cos(fi));
/** Var pekfingret ligger på kortet medan det vänds: en dryg centimeter från änden mot dealern, vid långsidan (kortets egna u och v när det är plant med framsidan upp). */
const VAND_U = -(CARD.height / 2 - 0.012);
/** Pekfingertoppens höjd över filten när kortet ligger plant under den med framsidan upp: fingret ligger an. */
const PEK_PLANT = CARD.thickness + BALL(8) + LUFT;
/** Fingrarnas böjning (grader i knogen, mellan- och ytterleden) i den pekande handen: pekfingret nästan rakt, de andra krökta in under handen, som dealerns i filmen. */
const PEKFORM: Record<number, [number, number, number]> = {1: [8, 12, 8], 2: [75, 95, 60], 3: [75, 95, 60], 4: [75, 95, 60]};
/** Hur mycket mer pekfingret krökas (grader i knogen och mellanleden, 0,6 av det i ytterleden) medan högern nyper kortet på kant mot tummen. */
const PEKKROK = 30;
/**
 * Den riktiga dealerns pekande hand när kortet är under pekfingret (filmen ruta 54–79: pekfingret rakt ned mot kortet, de
 * andra fingrarna krökta under handen). Lyftets fingrar och handens lutning är osäkra där, under rörelseoskärpan och längs
 * synlinjen: fingrarna går mot PEKFORM (andelen `krok`), och handen lutas nedåt kring handleden med vinkeln `lut`, i det
 * lodräta planet genom handens riktning (handen pekar mest mot kameran, så i filmens bild pekar den åt samma håll).
 * Handleden står kvar. TUMMEN ÄR DEALERNS (Jakob 2026-11-27 om tummen tryckt längs de böjda fingrarna: "Något är nog med
 * tummen"): lyftets egen, fri från fingrarna (i filmen står tummens topp 4 cm från pekfingrets, ned mot kortet), och vriden
 * ut från handflatan kring sin rot bara så mycket som håller den minst TUMLUFT från de krökta fingrarna (tumUt).
 */
function pekande(h: Hand, krok: number, lut: number, nyp = 0): Hand {
  let S = h.S;
  if (krok > 0) { S = S.map(v => [...v] as Vec3); const b = bendsOf(S);
    for (let f = 1; f <= 4; f++) { const c = FINGERS[f], x = b[f - 1], lens = [1, 2, 3].map(j => length(sub(S[c[j]], S[c[j - 1]])));
      const flex = x.flex.map((v, j) => v + (PEKFORM[f][j] - v) * krok) as [number, number, number], side = x.side.map(v => v * (1 - krok)) as [number, number, number];
      fingerFrom(S, f, {flex, side}, lens).forEach((p, j) => { S[c[j + 1]] = p; }); }
    S = tumUt(S); }
  if (nyp > 0.5) S = krokat(S, 1, nyp);
  let a = h.a;
  if (lut) { const F = a.forward, k = cross(F, [0, -1, 0]); if (length(k) > 1e-6) a = vridAxlar(a, unit(k), lut); }
  return {a, w: h.w, S};
}
/** Handformen `S` med fingret `f` (FINGERS) krökt `g` grader mer i knogen och mellanleden och 0,6 av det i ytterleden, inom LIMITS. */
function krokat(S0: Vec3[], f: number, g: number): Vec3[] {
  const S = S0.map(v => [...v] as Vec3), b = bendsOf(S)[f - 1], c = FINGERS[f], lens = [1, 2, 3].map(j => length(sub(S[c[j]], S[c[j - 1]]))), J = [LIMITS.mcp, LIMITS.pip, LIMITS.dip];
  const flex = b.flex.map((v, j) => Math.min(J[j].flex[1] - 1, v + g * (j === 2 ? 0.6 : 1))) as [number, number, number];
  fingerFrom(S, f, {flex, side: b.side}, lens).forEach((p, j) => { S[c[j + 1]] = p; }); return S;
}
/** Hur långt tummen minst håller sig från de andra fingrarna (meter, mellan benens mittlinjer): hand-rule.ts APART (11 mm, då är de i varandra) och 2 mm till. */
const TUMLUFT = 0.013;
/** Kortaste avståndet mellan två sträckor a–b och c–d. */
function strackor(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number {
  let mest = Infinity; for (let i = 0; i <= 8; i++) { const p = lerp(a, b, i / 8), e = sub(d, c), s = clamp01(dot(sub(p, c), e) / Math.max(1e-12, dot(e, e))); mest = Math.min(mest, length(sub(p, add(c, mul(e, s))))); }
  for (let i = 0; i <= 8; i++) { const p = lerp(c, d, i / 8), e = sub(b, a), s = clamp01(dot(sub(p, a), e) / Math.max(1e-12, dot(e, e))); mest = Math.min(mest, length(sub(p, add(a, mul(e, s))))); }
  return mest;
}
/** Tummens minsta avstånd till pek-, lång-, ring- och lillfingrets ben i handformen `S`. */
const tumGlapp = (S: Vec3[]) => Math.min(...[0, 1, 2].flatMap(k => FINGERS.slice(1).flatMap(c => [0, 1, 2].map(j => strackor(S[FINGERS[0][k]], S[FINGERS[0][k + 1]], S[c[j]], S[c[j + 1]])))));
/**
 * Tummen fri från de krökta fingrarna: står den närmare dem än TUMLUFT vrids den kring sin rot (FINGERS[0][0]) så lite som
 * behövs, högst 40 grader, kring den av handens tre axlar och åt det håll som når luften på minst vinkel (annars som ger mest
 * luft). Resten av handen står kvar.
 */
function tumUt(S: Vec3[]): Vec3[] {
  if (tumGlapp(S) >= TUMLUFT) return S;
  const rot = S[FINGERS[0][0]], leder = FINGERS[0].slice(1), vriden = (ax: Vec3, g: number) => { const T2 = S.map(v => [...v] as Vec3); for (const j of leder) T2[j] = add(rot, turned(sub(S[j], rot), ax, rad(g))); return T2; };
  let bast = {S, g: Infinity, luft: tumGlapp(S)};
  for (const ax of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as Vec3[]) for (let g = 2; g <= 40; g += 2) { const T2 = vriden(ax, g), luft = tumGlapp(T2);
    if (luft >= TUMLUFT) { if (g < bast.g || (g === bast.g && luft > bast.luft)) bast = {S: T2, g, luft}; break; } if (bast.g === Infinity && luft > bast.luft) bast = {S: T2, g: Infinity, luft}; }
  return bast.S;
}
/** Hur mycket lägre än pekfingertoppen handens övriga delar går (meter, under noll: ingen), med kulornas radie: handleden som overFilten räknar den. */
const underToppen = (h: Hand) => { const p = punkter(h), topp = p[8][1] - BALL(8); return Math.max(topp - (h.w[1] - 0.0185), ...p.map((q, k) => k === 8 ? -1 : topp - (q[1] - BALL(k)))); };
/** Kortets vinkel i rutan x: på kant (pi/2) från bytet till vändningen börjar, framsidan upp (0) från rutan där det är plant, mjukt emellan. */
const vandVinkel = (ti: {vandFran: number; plan: number}, x: number) => x <= ti.vandFran ? Math.PI / 2 : x >= ti.plan ? 0 : Math.PI / 2 * (1 - smooth((x - ti.vandFran) / (ti.plan - ti.vandFran)));
/** Hur många rutor före bytet högerns pekfinger tar kortet ur vänsterns grepp (kortet mjukt från det ena greppet till det andra). */
const TAG = 5;
/** Hur högt kortets nedre kant är över filten medan högern bär det på kant (meter): uppe i luften, som i filmen ruta 50–52. */
const KORT_LYFT = 0.02;
type Vandtid = {meet: number; vandFran: number; plan: number};
/** Kortets nedre kant över filten i rutan x: på filten i bytet, KORT_LYFT tre rutor senare och medan högern bär det, ned till filten medan det tippas. */
const lyftVid = (ti: Vandtid, x: number) => x >= ti.plan ? 0 : KORT_LYFT * smooth((x - ti.meet) / 3) * (1 - smooth((x - ti.vandFran) / (ti.plan - ti.vandFran)));
/** Hur mycket ett nypt kort på kant står upp över pekfingertoppens mitt till kortets kant räknat från vandKort (meter): kanten 3 mm över toppen. */
const NYP_UPP = BALL(8) + CARD.thickness / 2 + LUFT + 0.003;
/**
 * Kortet i vinkeln `fi` under handen `h`s pekfingertopp (vandKort) nypt mellan pekfingret och tummen, mer ju mer det står
 * (sin fi): flyttat mot tummens sida så att pekfingertoppen ligger an mot kortets andra sida, och upp så att kortets kant är
 * 3 mm över toppens mitt; tummen läggs an mot kortets sida nedan. Så hålls ett kort på kant, och inte på en fingertopp.
 */
const nypt = (k: Kort, h: Hand, fi: number): Kort => { const p = punkter(h), s = Math.sign(dot(sub(p[2], p[8]), k.n)) || 1, f = Math.abs(Math.sin(fi));
  return flyttKort(k, add(mul(k.n, s * (BALL(8) + CARD.thickness / 2) * f), [0, NYP_UPP * f, 0])); };
/** Hur långt under pekfingertoppens mitt kortets lägsta punkt är i vinkeln `fi`, nypt (meter). */
const underTopp = (fi: number) => { const f = Math.abs(Math.sin(fi)); return BALL(8) + CARD.thickness / 2 + LUFT - NYP_UPP * f + (CARD.width - kantIn(fi)) * f + CARD.thickness / 2 * Math.abs(Math.cos(fi)); };
/** Pekfingertoppens höjd över filten som kortet under den kräver i rutan x, från bytet. */
const hojdKort = (ti: Vandtid, x: number) => { const fi = vandVinkel(ti, x); return underTopp(fi) + LUFT * Math.abs(Math.sin(fi)) + lyftVid(ti, x); };
/**
 * Kortet under pekfingertoppen `tipp` i vinkeln `fi` kring långsidan `l` (vågrät): kanten fingret ligger på är dess
 * vänstra långsida när det ligger med framsidan upp (u = `u`, v = -bredden/2 + kantIn), toppen LUFT och en fingertopps
 * radie över den; vid `fi` = pi ligger kortet med ryggen upp åt andra hållet, under handen.
 */
const vandKort = (tipp: Vec3, l: Vec3, fi: number, u = VAND_U, v = -(CARD.width / 2 - kantIn(fi))): Kort => {
  const n = turned(UP, l, -fi), a = turned(cross(UP, l), l, -fi), E = sub(tipp, [0, BALL(8) + CARD.thickness / 2 + LUFT, 0]);
  return {c: sub(sub(E, mul(l, u)), mul(a, v)), l, n};
};

// ---- jämningen --------------------------------------------------------------------------------------------------------
/** Butterworth av andra ordningen, `fc` Hz vid 30 rutor/s, framåt och bakåt (nollfas), med udda spegling i ändarna. */
export function lagpass(x: number[], fc = 6, fs = FPS): number[] {
  const n = x.length; if (n < 4) return x.slice();
  const K = Math.tan(Math.PI * fc / fs), q = Math.SQRT2, nrm = 1 / (1 + q * K + K * K), b0 = K * K * nrm, b1 = 2 * b0, b2 = b0, a1 = 2 * (K * K - 1) * nrm, a2 = (1 - q * K + K * K) * nrm;
  const pad = Math.min(n - 1, 15), ext = [...Array.from({length: pad}, (_, i) => 2 * x[0] - x[pad - i]), ...x, ...Array.from({length: pad}, (_, i) => 2 * x[n - 1] - x[n - 2 - i])];
  const kor = (v: number[]) => { const y: number[] = []; let x1 = v[0], x2 = v[0], y1 = v[0], y2 = v[0]; for (const xi of v) { const y0 = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = xi; y2 = y1; y1 = y0; y.push(y0); } return y; };
  return kor(kor(ext).reverse()).reverse().slice(pad, pad + n);
}
export const jamna = (v: Vec3[], fc = 6): Vec3[] => { const k = [0, 1, 2].map(i => lagpass(v.map(p => p[i]), fc)); return v.map((_, t) => [k[0][t], k[1][t], k[2][t]] as Vec3); };
/**
 * Lugnt men inte suddigt (Jakob 2026-11-27: "han var lite skakig"): där handen i stort är stilla (farten under LUGN.stilla)
 * jämnat hårt (LUGN.lag Hz), där den rör sig (över LUGN.rorlig) lätt (LUGN.hog Hz), så att rörelsens toppar står kvar. Den
 * lätta jämningen gäller fyra rutor före och efter en rörelse. Båda är nollfas; vikten själv är mjukad. Ger också vikten.
 */
export const LUGN = {lag: 1.5, hog: 6, stilla: 0.05, rorlig: 0.25};
export function lugnVikt(v: Vec3[]): number[] {
  const b = jamna(v, LUGN.hog), n = v.length, fart = b.map((_, t) => length(sub(b[Math.min(n - 1, t + 1)], b[Math.max(0, t - 1)])) * FPS / 2);
  const w0 = fart.map(x => smooth((x - LUGN.stilla) / (LUGN.rorlig - LUGN.stilla))), w1 = w0.map((_, t) => Math.max(...w0.slice(Math.max(0, t - 4), t + 5)));
  return lagpass(w1, 3).map(clamp01);
}
export const lugnaMed = (v: Vec3[], w: number[]): Vec3[] => { const a = jamna(v, LUGN.lag), b = jamna(v, LUGN.hog); return v.map((_, t) => lerp(a[t], b[t], w[t])); };
export const lugna = (v: Vec3[]): Vec3[] => lugnaMed(v, lugnVikt(v));
/** Luckorna (null) fyllda mellan närmaste kända rutor; före den första och efter den sista som den. */
export function fyll<X>(v: (X | null | undefined)[], blanda: (a: X, b: X, t: number) => X): X[] {
  const ok = v.flatMap((x, i) => x == null ? [] : [i]); if (!ok.length) throw Error('lyftet saknar det helt');
  return v.map((x, i) => { if (x != null) return x; const fore = ok.filter(j => j < i).at(-1), efter = ok.find(j => j > i);
    if (fore === undefined) return v[efter!]!; if (efter === undefined) return v[fore]!; return blanda(v[fore]!, v[efter]!, (i - fore) / (efter - fore)); });
}
/** En mjuk väg från p0 (farten v0) till p1 (farten v1) på T rutor, i rutan t (femtegradspolynom, accelerationen noll i ändarna). */
const brygga = (p0: Vec3, v0: Vec3, p1: Vec3, v1: Vec3, Tr: number, t: number): Vec3 => {
  const s = clamp01(t / Tr), s3 = s * s * s, s4 = s3 * s, s5 = s4 * s;
  return add(add(mul(p0, 1 - 10 * s3 + 15 * s4 - 6 * s5), mul(v0, (s - 6 * s3 + 8 * s4 - 3 * s5) * Tr)), add(mul(v1, (-4 * s3 + 7 * s4 - 3 * s5) * Tr), mul(p1, 10 * s3 - 15 * s4 + 6 * s5)));
};
/** Hur många rutor en brygga på `d` meter tar i farten `v` (m/s som mest, en mjuk rörelses topp är 1,875 gånger medlet), minst 8. */
const bryggTid = (d: number, v: number) => Math.max(8, Math.round(FPS * 1.875 * d / v));

// ---- handens form ur lyftet ---------------------------------------------------------------------------------------------
/**
 * Lyftets handform (`q`, i handens egna axlar) lagd på dockans hand `bas`: dockans handflata (handleden, tummens rot och
 * knogarna), varje fingerben pekande som lyftets med dockans längd, och fingrarnas leder hållna inom LIMITS (en grad till godo).
 */
export function paDockan(q: Vec3[], bas: Vec3[]): Vec3[] {
  const S = bas.map(v => [...v] as Vec3);
  for (const c of FINGERS) for (let j = 1; j < 4; j++) S[c[j]] = add(S[c[j - 1]], mul(unit(sub(q[c[j]], q[c[j - 1]])), length(sub(bas[c[j]], bas[c[j - 1]]))));
  const b = bendsOf(S), J = [LIMITS.mcp, LIMITS.pip, LIMITS.dip];
  for (let f = 1; f <= 4; f++) { const c = FINGERS[f], x = b[f - 1], lens = [1, 2, 3].map(j => length(sub(bas[c[j]], bas[c[j - 1]])));
    const flex = x.flex.map((v, j) => Math.max(J[j].flex[0] + 1, Math.min(J[j].flex[1] - 1, v))) as [number, number, number], side = x.side.map((v, j) => Math.max(-J[j].side + 1, Math.min(J[j].side - 1, v))) as [number, number, number];
    fingerFrom(S, f, {flex, side}, lens).forEach((p, j) => { S[c[j + 1]] = p; }); }
  return S;
}
/** Handens egna axlar som rummets (across är cross(palm, forward), som hand-pose.ts har dem). */
const ID: Axes = {forward: [1, 0, 0], palm: [0, 1, 0], across: [0, 0, -1]};
/** Fingrar i varandra i formen (hand-rule.ts handFaults 'i varandra'). */
const iVarandra = (S: Vec3[], sign: number) => handFaults(placed(S, ID, [0, 0, 0]), sign, null, null).some(f => f.kind === 'i varandra');

/**
 * Rutor där MediaPipe har vänt handen bort: handens framåt mer än 50 grader eller handflatan mer än 60 från medianen av
 * rutorna omkring (sju åt var sida, rutan själv oräknad: så syns också fyra bortvända rutor i följd). Där räknas handen som
 * inte funnen, och vinkeln och formen fylls från grannrutorna.
 */
function bortvanda(lyft: Lyft, side: Sida): boolean[] {
  const sign = side === 'R' ? 1 : -1, A = lyft.frames.map(f => f[side].p ? axesOf(f[side].p!, sign) : null);
  return A.map((a, t) => { if (!a) return false; const nb = [...A.slice(Math.max(0, t - 7), t), ...A.slice(t + 1, t + 8)].filter(Boolean) as Axes[]; if (nb.length < 5) return false;
    return vinkel(a.forward, medianV(nb.map(x => x.forward))) > rad(50) || vinkel(a.palm, medianV(nb.map(x => x.palm))) > rad(60); });
}
/** Lyftets handform ruta för ruta på dockans ben: jämnad, inom lederna, fylld där den saknas, är bortvänd eller fingrarna går i varandra. */
function lyftetsHander(lyft: Lyft, side: Sida, bas: Vec3[], bort: boolean[]) {
  const sign = side === 'R' ? 1 : -1, P = lyft.frames.map((f, t) => bort[t] ? null : f[side].p);
  const Q = fyll(P.map(p => p ? local(p, axesOf(p, sign)) : null), (a, b, t) => a.map((v, k) => lerp(v, b[k], t)));
  // (fingrarna lugna: lyftets fingrar darrar 14–24 mm mot handleden och byter håll 9–14 gånger i sekunden, så formen jämnas hårt, 2 och 1,5 Hz)
  const Qj = Array.from({length: 21}, (_, k) => jamna(Q.map(q => q[k]), 2)), q = Q.map((_, t) => Qj.map(v => v[t]));
  const S0 = q.map(x => { const S = paDockan(x, bas); return iVarandra(S, sign) ? null : S; });
  const godkand = S0.filter(Boolean).length / S0.length;
  const S1 = S0.some(Boolean) ? fyll(S0, (a, b, t) => formMellan(a, b, t)) : S0.map(() => bas);
  // (jämnat en gång till efter fyllningen, 1,5 Hz, och åter på dockans ben inom lederna)
  const S1j = Array.from({length: 21}, (_, k) => jamna(S1.map(s => s[k]), 1.5)), S = S1.map((_, t) => paDockan(S1j.map(v => v[t]), bas));
  return {S, godkand, saknas: P.filter(p => !p).length / P.length};
}
/** Lyftets handvinkel ruta för ruta: de bortvända rutorna fyllda från grannarna, jämnad som handleden (vikten `w`, lugnaMed). */
function lyftetsVinklar(lyft: Lyft, side: Sida, bort: boolean[], w: number[]): Axes[] {
  const sign = side === 'R' ? 1 : -1, A = fyll(lyft.frames.map((f, t) => f[side].p && !bort[t] ? axesOf(f[side].p!, sign) : null), (a, b, t) => between(a, b, t));
  const fw = lugnaMed(A.map(a => a.forward), w), pm = lugnaMed(A.map(a => a.palm), w);
  return fw.map((f, t) => { const F = unit(f), P = unit(sub(pm[t], mul(F, dot(pm[t], F)))); return {forward: F, palm: P, across: cross(P, F)}; });
}

// ---- kortet -----------------------------------------------------------------------------------------------------------
/** Kortet i skon: i skons front som liveShoeCard() har det, framsidan in mot skon (ryggen ut, där fingrarna tar det). */
export const kortISkon = (): Kort => { const s = liveShoeCard(); return {c: s.centre, l: unit(s.long), n: mul(unit(s.out), -1)}; };
/** Kortet på platsen `id` (LIVE.cards): plant på filten, framsidan upp, långsidan som platsen har den, pekande mot spelaren. */
export function kortPaPlats(id: string): Kort {
  const p = LIVE.cards[id], l: Vec3 = [Math.sin(rad(p.turn)), 0, Math.cos(rad(p.turn))];
  return {c: [p.at[0], T / 2, p.at[2]], l: l[2] >= 0 ? l : mul(l, -1), n: UP};
}
/**
 * KORTET DÄR DEN RIKTIGA DEALERN LADE DET (Jakob 2026-11-27: kortet "ska inte automatiskt läggas i rätt vinkel bara för det
 * inte kom exakt rätt"): lyftets kort när det först syns liggande på filten (live-bj/verktyg/kort.py, kortets hörn i
 * filmens bild lagda på filten), medianen av läget och långsidans vinkel över de åtta första rutorna, med långsidan som
 * kortPaPlats har den (mot spelaren); null om lyftet aldrig ser det ligga. Danilos giv till dagens plats 4: 0,0114 / -1,0225
 * och 174,4°, 5 mm och 3,3° från kortplatsen P4.C1, som själv ligger inom 2 mm och 1° från medianen av de åtta kort till
 * plats 4 som filmen ser lämna skon.
 */
export function kortetIFilmen(lyft: Lyft): Kort | null {
  const sedd = lyft.frames.flatMap(f => f.card?.seen && f.card.c && f.card.l ? [{c: f.card.c, l: f.card.l}] : []).slice(0, 8);
  if (!sedd.length) return null;
  // (vinkeln från z mot x, mot spelaren, och varje ruta inom ett kvarts varv från den första: ett kort är lika åt båda håll)
  const mot = (l: Vec3) => { let a = Math.atan2(l[0], l[2]); if (Math.cos(a) < 0) a += a > 0 ? -Math.PI : Math.PI; return a; }, a0 = mot(sedd[0].l);
  const a = median(sedd.map(x => { let d = mot(x.l) - a0; if (d > Math.PI / 2) d -= Math.PI; if (d < -Math.PI / 2) d += Math.PI; return a0 + d; }));
  const l: Vec3 = [Math.sin(a), 0, Math.cos(a)];
  return {c: [median(sedd.map(x => x.c[0])), T / 2, median(sedd.map(x => x.c[2]))], l: l[2] >= 0 ? l : mul(l, -1), n: UP};
}
/** Långsidans vinkel på filten i grader, 0 till 180 från z mot x (som LIVE.cards turn). */
const kortVinkel = (l: Vec3) => { let a = grad(Math.atan2(l[0], l[2])); while (a < 0) a += 180; while (a >= 180) a -= 180; return a; };
/** Hur långt två vinklar 0–180 ligger ifrån varandra (grader, högst 90). */
const vinkelMellan = (a: number, b: number) => { const d = Math.abs(a - b) % 180; return Math.min(d, 180 - d); };
/** Kortet i handens egna axlar (läget mot handleden), och tillbaka i rummet. */
type Grepp = {c: Vec3; l: Vec3; n: Vec3};
const inn = (h: Hand, v: Vec3): Vec3 => [dot(v, h.a.forward), dot(v, h.a.palm), dot(v, h.a.across)];
const ut = (h: Hand, q: Vec3): Vec3 => add(add(mul(h.a.forward, q[0]), mul(h.a.palm, q[1])), mul(h.a.across, q[2]));
const iHanden = (h: Hand, k: Kort): Grepp => ({c: inn(h, sub(k.c, h.w)), l: inn(h, k.l), n: inn(h, k.n)});
const urHanden = (h: Hand, g: Grepp): Kort => ({c: add(h.w, ut(h, g.c)), l: unit(ut(h, g.l)), n: unit(ut(h, g.n))});
const ram = (k: {l: Vec3; n: Vec3}): Axes => ({forward: k.l, palm: k.n, across: cross(k.n, k.l)});
/** Mjukt från ett läge till ett annat (läget rakt, vinkeln längs den kortaste vridningen). */
const mellan = <K extends Kort | Grepp>(a: K, b: K, t: number): K => { const A = between(ram(a), ram(b), t); return {...a, c: lerp(a.c, b.c, t), l: A.forward, n: A.palm}; };
/** Hur mycket ett grepp skiljer sig från ett annat: läget (meter) och vinkeln (grader). */
const glid = (a: Grepp, b: Grepp) => ({mm: Math.round(length(sub(a.c, b.c)) * 1000), grader: Math.round(grad(Math.max(vinkel(a.l, b.l), vinkel(a.n, b.n))))});
/** Närmaste punkt på kortets yta (mittplanet) till p, `inset` innanför kanterna. */
const paKortet = (k: Kort, p: Vec3, inset = 0.012): Vec3 => { const a = cross(k.n, k.l), d = sub(p, k.c), u = clamp(dot(d, k.l), -(HK / 2 - inset), HK / 2 - inset), v = clamp(dot(d, a), -(WK / 2 - inset), WK / 2 - inset); return add(add(k.c, mul(k.l, u)), mul(a, v)); };

/** Fingrarnas leder och toppar (tummens med), som lyft-kolla.ts prövar stödet med. */
const FINGRAR = [2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 20];
/** Var en punkt är mot kortet, ut ur framsidan; null om den inte rör det (inom 1 cm från kanten och 16 mm från ytan): lyft-kolla.ts mot. */
const motKortet = (k: Kort, p: Vec3) => { const d = sub(p, k.c), u = dot(d, k.l), v = dot(d, cross(k.n, k.l)), w = dot(d, k.n); return Math.abs(u) < HK / 2 + 0.01 && Math.abs(v) < WK / 2 + 0.01 && Math.abs(w) < 0.016 ? w : null; };
/** Kortet har stöd av händerna `hs`: fingrar på var sin sida, eller mot filten med ett finger på det, eller liggande (som lyft-kolla.ts). */
const stod = (k: Kort, hs: Hand[]) => { const horn = kortHorn(k); if (horn.every(p => p[1] < 0.004)) return true; const w = hs.flatMap(h => { const p = punkter(h); return FINGRAR.map(j => motKortet(k, p[j])).filter((x): x is number => x !== null); });
  return (w.some(x => x > 0) && w.some(x => x < 0)) || (Math.min(...horn.map(p => p[1])) < 0.004 && w.length > 0); };
/** Hur djupt handens fingrar går i kortet (hand-rule.ts handFaults 'kortet', millimeter sammanlagt, plus en per fel). */
const iKortet = (h: Hand, k: Kort, sign: number) => handFaults(punkter(h), sign, null, k).filter(f => f.kind === 'kortet').reduce((s, f) => s + f.by + 1, 0);
/** Handens lägsta del över filten: handleden 18,5 mm (som mat.ts räknar handflatan), fingrarnas kulor 1,5 mm. */
const overFilten = (h: Hand) => Math.min(h.w[1] - 0.0185, ...punkter(h).map((p, k) => p[1] - BALL(k) - 0.0015));

// ---- armen, armbågen och handleden ---------------------------------------------------------------------------------------
/** Underarmens radie i tio delar, armbågen till handleden (dockans form), för luften över bordets kant (ren-giv.ts underarmLuft: underarmens undersida över filtens kantlinje, 4 mm). */
const kantFor = (doll: Doll): Kant => ({z: LIVE.edge[2], y: 0, radie: Array.from({length: 10}, (_, i) => doll.shape.forearmRadius[0] + (doll.shape.forearmRadius[1] - doll.shape.forearmRadius[0]) * i / 9), luft: 0.004, handen: 0.3});
/** Hur mycket handen står från underarmen (grader). */
const handled = (e: Vec3, h: Hand) => grad(vinkel(sub(h.w, e), sub(punkter(h)[9], h.w)));
/** Riktningen rakt nedåt vinkelrätt mot linjen axel–handled: där armbågens vinkel räknas från. */
const lodratt = (line: Vec3): Vec3 => { const d = sub([0, -1, 0], mul(line, -line[1])); return length(d) > 1e-6 ? unit(d) : [0, 0, 1]; };
const armbageSvang = (s: Vec3, w: Vec3, th: number, doll: Doll) => { const line = unit(sub(w, s)); return arm(s, w, turned(lodratt(line), line, th), doll).elbow; };
/**
 * Armbågen där filmen har den: av de lägen dockans ben ger för axeln `s` och handen `h` (en cirkel kring linjen
 * axel–handled) det som i livebordets bild ligger närmast `mal` (lyftets armbåge; i vilan ankarets), med armen utanför
 * bålen (`bal`: axlarna och höften i rutan; armIBalenAv), underarmen över bordets kant och handen högst 40 grader från
 * underarmen så långt det går. Dockans axlar sitter inte där dealerns gör (Danilos 13,5 cm längre bak), så där filmens
 * armbåge skulle ligga i dockans bål väljs det närmaste läget utanför den. Vinkeln från lodrätt nedåt (armbageSvang).
 */
function armbageVinkel(s: Vec3, h: Hand, mal: Vec3, doll: Doll, kant: Kant, bal?: {R: Vec3; L: Vec3; hip: Vec3}): number {
  const M = liveSee(mal), fram = unit(sub(punkter(h)[9], h.w)); let best = 0, kost = Infinity;
  for (let g = 0; g < 360; g += 4) { const th = rad(g), e = armbageSvang(s, h.w, th, doll), P = liveSee(e), px = M && P ? Math.hypot(P.x - M.x, P.y - M.y) : length(sub(e, mal)) * 1000;
    const inne = bal ? Math.max(0, armIBalenAv(bal.R, bal.L, bal.hip, s, e, h.w, doll) - BALEN.tol + 0.002) : 0;
    const c = (px / 25) ** 2 + 400 * Math.max(0, kant.luft - underarmLuft(e, h.w, kant)) / 0.01 + (Math.max(0, grad(vinkel(sub(h.w, e), fram)) - 40) / 8) ** 2 + 4000 * inne / 0.01; if (c < kost) { kost = c; best = th; } }
  return best;
}

/** Armen mot bålen (som standarddocka/editor/kropp.ts GRANS): armen räknas så tjock av den ritade, överarmens tredjedel närmast axeln prövas inte (den sitter i axeln), och 5 mm räknas inte. */
export const BALEN = {armTjocklek: 0.85, hoppaOver: 1 / 3, tol: 0.005};
/**
 * Hur djupt en kula med radien `r` kring punkten `p` går in i bålen (meter; under 0 utanför). Bålen som scenen ritar den
 * (dealer3d/src/stage.ts): dockans profil (doll.ts shape.trunk) vriden kring linjen från höften till axlarnas (`R`, `L`)
 * mitt, lika bred som axlarna, djupet en andel av bredden. Samma sak som editorns granskaGrund mäter på huden, på den
 * ritade kroppen i stället: ett mått nära, inte samma tal.
 */
export function iBalen(R: Vec3, L: Vec3, hip: Vec3, p: Vec3, r: number, doll: Doll): number {
  const tr = doll.shape.trunk; if (tr.kind !== 'profile') return -Infinity;
  const across = sub(L, R), wide = length(across), ax = unit(across), up0 = sub(mitt(R, L), hip), tall = length(up0), az = unit(cross(ax, unit(up0))), ay = cross(az, ax), pr = tr.profile;
  const d = sub(p, hip), u = dot(d, ax) / wide, v = dot(d, ay) / tall, z = dot(d, az) / (wide * tr.deep);
  if (v < pr[0][0] || v > pr[pr.length - 1][0]) return -Infinity;
  let rd = 0; for (let i = 1; i < pr.length; i++) if (v <= pr[i][0]) { rd = pr[i - 1][1] + (pr[i][1] - pr[i - 1][1]) * (v - pr[i - 1][0]) / (pr[i][0] - pr[i - 1][0]); break; }
  const phi = Math.atan2(z, u); return (rd - Math.hypot(u, z)) * wide * Math.hypot(Math.cos(phi), tr.deep * Math.sin(phi)) + r;
}
/** Hur djupt armen axel `s`, armbåge `e`, handled `w` går in i bålen (meter; under 0 går den fritt), med dockans armtjocklek. lyft-kolla.ts mäter med det. */
export function armIBalenAv(R: Vec3, L: Vec3, hip: Vec3, s: Vec3, e: Vec3, w: Vec3, doll: Doll): number {
  const inne = (p: Vec3, r: number) => iBalen(R, L, hip, p, r, doll);
  const S = doll.shape; let mest = -Infinity;
  for (let i = 0; i <= 12; i++) { const f = BALEN.hoppaOver + (1 - BALEN.hoppaOver) * i / 12; mest = Math.max(mest, inne(lerp(s, e, f), (S.upperArmRadius[0] + (S.upperArmRadius[1] - S.upperArmRadius[0]) * f) * BALEN.armTjocklek)); }
  for (let i = 0; i <= 12; i++) { const f = i / 12; mest = Math.max(mest, inne(lerp(e, w, f), (S.forearmRadius[0] + (S.forearmRadius[1] - S.forearmRadius[0]) * f) * BALEN.armTjocklek)); }
  return mest;
}

// ---- lyftet läst --------------------------------------------------------------------------------------------------------
/** En punkt längs lyftets synlinje (kameran står över origo) flyttad till djupet z: samma bildpunkt. */
const tillDjup = (p: Vec3, z: number): Vec3 => { const k = z / p[2]; return [p[0] * k, LIVE_CAMERA.height + (p[1] - LIVE_CAMERA.height) * k, z]; };
/** Lyftet läst som det ska läggas: lugnat (handlederna, axlarna, huvudet), luckorna fyllda; axlarna i dockans djup. */
function last(lyft: Lyft, zAxlar: number) {
  const f = lyft.frames, n = f.length;
  const sida = (s: Sida) => {
    const w0 = f.map(x => x[s].w), vikt = lugnVikt(w0), bort = bortvanda(lyft, s);
    const grepp = fyll(f.map(x => x[s].p ? mitt(x[s].p![4], x[s].p![8]) : null), lerp);
    return {s: lugna(f.map(x => tillDjup(x[s].s, zAxlar))), w: lugnaMed(w0, vikt), e: lugna(f.map(x => x[s].e)), vikt, bort, grepp: jamna(grepp), vinklar: lyftetsVinklar(lyft, s, bort, vikt)};
  };
  // (blickens riktning, hårt jämnad: den används bara där en väntan ser på bordet, för var blicken möter filten; målen, blickMal)
  const h = lugna(fyll(f.map(x => x.h), lerp)), riktning = jamna(fyll(f.map(x => x.h && x.g ? unit(sub(x.g, x.h)) : null), lerp), 1).map(unit);
  const a = fyll(f.map(x => x.a), (x, y, t) => Object.fromEntries(Object.keys(x).map(k => [k, x[k] + ((y[k] ?? x[k]) - x[k]) * t])));
  // (huvudets egna vinklar, utan ögonen: lyftets huvud, live-bj/verktyg/lyft.py huvud; saknas de, huvudet i vila)
  // (nicken ur ansiktsnätets egen vinkel mot kameran (lyftets ansikte), omräknad till dockans genom NICK_NAT: så läser nätet
  // samma nick på dockan som på dealern i samma ruta; vridning och tippning som lyftets huvud. Bara Danilo (stilen kameran):
  // NICK_NAT är mätt på hans docka, och Frasses nick står kvar från hans vila tills hans docka är mätt)
  const huvudV = f.some(x => x.huvud) ? fyll(f.map(x => x.huvud ? (x.ansikte && lyft.style === "kameran" ? [nickFranNat(x.ansikte[0]), x.huvud[1], x.huvud[2]] as Vec3 : x.huvud) : null), lerp) : f.map((): Vec3 => [0, 0, 0]);
  // (ögonen mot huvudet: dealerns blick (h mot g) mot hans huvud (h mot hv), höjd och sida i grader; en ruta där de skiljer
  // mer än 25° är brus och fylls från grannarna; hårt jämnad (1 Hz) och högst ±10°, som ögon kan)
  const ogon0 = f.map(x => { if (!x.h || !x.g || !x.hv) return null; const d = vinkelSkillnad(sub(x.g, x.h), sub(x.hv, x.h)); return Math.abs(d[0]) > 25 || Math.abs(d[1]) > 25 ? null : d; });
  const ogon = jamna(ogon0.some(Boolean) ? fyll(ogon0, lerp) : f.map((): Vec3 => [0, 0, 0]), 1).map(v => [clamp(v[0], -10, 10), clamp(v[1], -10, 10), 0] as Vec3);
  return {n, R: sida('R'), L: sida('L'), h, riktning, huvudV, ogon, a, zAxlar};
}
type Last = ReturnType<typeof last>;
const axelMitt = (L: Last, t: number) => mitt(L.R.s[t], L.L.s[t]);

/**
 * Stilens medel för axlarnas mitt och huvudet mot axlarna, över alla stilens lyft: rörelsen räknas mot dem. Huvudet ligger
 * på sin synlinje i dockans huvuds djup (`zHuvud`): där bilden har det, så att dealerns hållning följer med i rörelsen.
 */
function stilensMedel(stil: string, zAxlar: number, zHuvud: number, dir = LYFT) {
  const filer = readdirSync(dir).filter(f => f.startsWith(`${stil}-`) && f.endsWith('.json'));
  const mitten: Vec3[] = [], huvud: Vec3[] = [], bredd: number[] = [];
  for (const fil of filer) { const ly = JSON.parse(readFileSync(path.join(dir, fil), 'utf8')) as Lyft;
    for (const f of ly.frames) { const R = tillDjup(f.R.s, zAxlar), L = tillDjup(f.L.s, zAxlar), m = mitt(R, L); mitten.push(m); bredd.push(Math.hypot(L[0] - R[0], L[1] - R[1])); if (f.h) huvud.push(sub(tillDjup(f.h, zHuvud), m)); } }
  // (axlarnas fulla bredd i bilden, i dockans djup: där nio av tio rutor är smalare)
  bredd.sort((a, b) => a - b);
  return {mitt: medianV(mitten), huvud: medianV(huvud), bredd: bredd[Math.floor(bredd.length * 0.9)]};
}

// ---- ankaret ----------------------------------------------------------------------------------------------------------
/** Fingrarnas böjning i den vilande handen (grader i knogen, mellan- och ytterleden): lätt böjda, som en avslappnad hand på bordet. */
const VILFORM: [number, number, number] = [6, 14, 8];
/** Dockans avslappnade hand `bas` med fingrarna lätt böjda (VILFORM) och samlade (raka i sidled, bredvid varandra). */
function vilform(bas: Vec3[]): Vec3[] {
  const S = bas.map(v => [...v] as Vec3), b = bendsOf(S);
  for (let f = 1; f <= 4; f++) { const c = FINGERS[f], lens = [1, 2, 3].map(j => length(sub(S[c[j]], S[c[j - 1]])));
    fingerFrom(S, f, {flex: [...VILFORM] as [number, number, number], side: b[f - 1].side.map(() => 0) as [number, number, number]}, lens).forEach((p, j) => { S[c[j + 1]] = p; }); }
  return S;
}
/**
 * Ankaret: dockans vila vid livebordet. Axlarna där doll.ts har dem (LIVE.dealer), handlederna där väntans lyft har dem
 * (medianen), handen plant på filten med handflatan nedåt i den riktning väntans hand pekar längs filten, fingrarna lätt
 * böjda och samlade (vilform), lutad så att handloven och fingertopparna ligger lika lågt, och flyttad i höjd så att dess
 * lägsta del är 1,5 mm över filten (hur mycket står i about); blicken mot kameran; kortet i skon.
 */
export function ankaret(doll: Doll, stil: 'kameran' | 'bordet', vantan: Lyft, vantanNamn: string, dir = LYFT) {
  const fr = dollFrame(doll), H = doll.hand!, kant = kantFor(doll), nar = doll.upperArm + doll.forearm - REN.naturlig;
  const limb = (side: Sida) => {
    const sign = side === 'R' ? 1 : -1, s = side === 'R' ? fr.shoulders[0] : fr.shoulders[1], fr2 = vantan.frames.filter(f => f[side].p);
    // (handen ligger plant på filten med handflatan nedåt, i den riktning väntans hand pekar längs filten: lyftets
    // handflata i vilan är osäker (den pekar mot kameran) och gav en hand som stod på fingertopparna, domaren 2026-11-27)
    const fw0 = flat(medianV(fr2.map(f => axesOf(f[side].p!, sign).forward))), palm0: Vec3 = [0, -1, 0], A0: Axes = {forward: fw0, palm: palm0, across: cross(palm0, fw0)};
    const S = vilform(side === 'R' ? H.rest!.right : H.rest!.left);
    const W0 = medianV(vantan.frames.map(f => f[side].w));
    // (lutad kring sin tvärled så att handloven och knogarna ligger lika lågt: handflatan plant på filten, fingrarna lätt böjda ned mot den)
    const lagt = (b: number) => { const h0: Hand = {a: vridAxlar(A0, A0.across, b), w: W0, S}, p = punkter(h0); return {h0, skillnad: (h0.w[1] - 0.0185) - Math.min(...[5, 9, 13, 17].map(k => p[k][1] - BALL(k)))}; };
    let b0 = 0, minst = Infinity; for (let g = -30; g <= 30; g += 0.5) { const x = Math.abs(lagt(rad(g)).skillnad); if (x < minst) { minst = x; b0 = rad(g); } }
    let h: Hand = lagt(b0).h0; const hojd = -overFilten(h); h = flyttHand(h, [0, hojd, 0]);
    // (når armen inte dit utan att bålen lutar, flyttas handen längs filten mot axeln så långt som behövs)
    let flytt = 0; const mot = flat(sub(s, h.w)); while (length(sub(h.w, s)) > nar && flytt < 0.2) { h = flyttHand(h, mul(mot, 0.002)); flytt += 0.002; }
    // (armbågen där väntans armbåge är i bilden)
    const E0 = medianV(vantan.frames.map(f => f[side].e)), e = armbageSvang(s, h.w, armbageVinkel(s, h, E0, doll, kant, {R: fr.shoulders[0], L: fr.shoulders[1], hip: fr.hip}), doll);
    return {limb: {s: r4(s), e: r4(e), w: r4(h.w), k: 1, p: punkter(h).map(r4)} as Limb, flytt, hojd, fran: length(sub(h.w, W0))};
  };
  const R = limb('R'), L = limb('L'), k = kortISkon();
  const huvud = add(mitt(fr.shoulders[0], fr.shoulders[1]), stilensMedel(stil, fr.shoulders[0][2], fr.head[2], dir).huvud);
  const frame: Frame = {card: {c: r4(k.c), l: r4(k.l), n: r4(k.n), id: 0}, R: R.limb, L: L.limb, h: r4(huvud), g: [0, LIVE_CAMERA.height, 0], a: {}};
  const mm = (x: number) => Math.round(x * 1000);
  const about = `Vilan vid livebordet för dockan ${doll.name} (stilen ${stil}): ankaret som dockans alla rörelser (dealer3d/data/lyft-${doll.name}-*.json) börjar och slutar exakt i. Axlarna där doll.ts har dem (LIVE.dealer.styles.${stil}). Handlederna där dealerns väntan i ${vantanNamn} har dem (medianen), händerna plant på filten med handflatan nedåt i den riktning väntans hand pekar, fingrarna lätt böjda och samlade, och flyttade i höjd så att handens lägsta del är 1,5 mm över filten: höger ${mm(R.hojd)} mm, vänster ${mm(L.hojd)} mm${R.flytt || L.flytt ? `; flyttad mot axeln så att armen når utan att bålen lutar: höger ${mm(R.flytt)} mm, vänster ${mm(L.flytt)} mm` : ''}. Huvudet där dealern brukar hålla det mot axlarna (medel över stilens lyft, i modellens huvuds djup), blicken mot livebordets kamera, kortet i skons front (liveShoeCard), minen i vila.`;
  return {namn: 'A1' as const, about, doll: doll.name, style: stil, hip: r4(fr.hip), frame, fran: {R: R.fran, L: L.fran}};
}

// ---- en giv ------------------------------------------------------------------------------------------------------------
/** Rutorna i lyftet där det händer något: tiderna är dealerns. */
function tiderna(lyft: Lyft, L: Last) {
  const n = L.n, leaves = lyft.leavesShoe!, rests = lyft.rests!;
  const fart = (v: Vec3[]) => v.map((p, t) => t ? length(sub(p, v[t - 1])) * FPS : 0);
  const fL = fart(L.L.w), fR = fart(L.R.w);
  // vänsterhanden stilla vid skon före draget: den sista stilla rutan före leaves är draget, den första i samma stillhet är framme
  let pull = leaves - 2; for (let t = leaves - 1; t >= Math.max(1, leaves - 10); t--) if (fL[t] < 0.25) { pull = t; break; }
  pull = Math.max(2, Math.min(leaves - 2, pull));
  let arrive = pull; while (arrive > Math.max(2, pull - 30) && fL[arrive - 1] < 0.25) arrive--;
  // (vänsterns resa till skon: där farten först är över 15 % av sin topp före framme)
  let topp = 1; for (let t = 1; t <= arrive; t++) if (fL[t] > fL[topp]) topp = t; let resa = topp; while (resa > 1 && fL[resa - 1] > 0.15 * fL[topp]) resa--;
  // bytet: händerna är som närmast en tiondels sekund innan vänstern stannar (live-bj stil-*.json handover); kortet byter
  // hand när vänstern har stannat, i den första rutan efter det närmaste där lyftets vänsterhand går under 0,35 m/s
  let narmast = leaves + 4, best = Infinity; for (let t = leaves + 3; t <= rests - 9; t++) { const d = length(sub(L.L.grepp[t], L.R.grepp[t])); if (d < best) { best = d; narmast = t; } }
  let meet = Math.min(rests - 9, narmast + 4); for (let t = narmast; t <= Math.min(rests - 9, narmast + 6); t++) if (fL[t] < 0.35) { meet = t; break; }
  // (högern lämnar kortet: den första rutan efter att det ligger där lyftets högerhand går över 0,3 m/s, högst fyra rutor)
  let vila = Math.min(n - 3, rests + 4); for (let t = rests + 1; t <= Math.min(n - 3, rests + 4); t++) if (fR[t] > 0.3) { vila = t; break; }
  // KORTET LIGGER när högerns handled stannar vid platsen: den första rutan efter bytet, sedan handen har gått ut fortare än
  // 0,5 m/s längs filten, där den går under 0,15 m/s två rutor i följd (lyftets handled, lugnad); högst lyftets rests. Lyftets
  // rests (live-bj/data/givar.json landed) är där kortet först syns liggande i bildens kortsökning, som kommer sent: i Danilos
  // giv till plats 4 ruta 73, medan kortet ligger stilla på platsen i filmen från ruta 63, där handleden stannar.
  const fP = (x: number) => Math.hypot(L.R.w[x][0] - L.R.w[x - 1][0], L.R.w[x][2] - L.R.w[x - 1][2]) * FPS;
  // (och där handleden är högst 4 cm längs filten från där den är när lyftet säger att kortet ligger: en paus på vägen är det inte)
  const nara = (x: number) => Math.hypot(L.R.w[x][0] - L.R.w[rests][0], L.R.w[x][2] - L.R.w[rests][2]) < 0.04;
  let ligger = rests, snabb = false; for (let t = meet + 2; t < rests; t++) { if (fP(t) > 0.5) snabb = true; if (snabb && fP(t) < 0.2 && fP(t + 1) < 0.2 && nara(t)) { ligger = t; break; } }
  // Vändningen (Danilos giv till plats 4 ruta för ruta, live-bj/rutor/jamfor): framsidan syns fem rutor innan kortet ligger
  // (ruta 58), kortet är plant på filten tre rutor innan (60) och skjuts sedan på plats; vändningen börjar sju rutor före
  // det plana (53, när handen pekar nedåt med kortet under pekfingret), högst tre rutor efter bytet.
  const plan = Math.max(meet + 10, ligger - 3), vandFran = Math.max(meet + 3, plan - 7);
  // (efter bytet: högern pekar och lägger kortet med ryggen upp på filten på två rutor, ned)
  return {n, resa, arrive, pull, leaves, narmast, meet, rests, vila, ligger: Math.max(ligger, plan + 1), ned: Math.min(vandFran, meet + 2), vandFran, plan, framsidan: plan - 2, avstandVidBytet: best};
}
type Tider = ReturnType<typeof tiderna>;
/**
 * En giv börjar redo vid skon (domaren 2026-11-27): lyftet från tre rutor innan vänstern är framme vid skon. Det som är
 * före (handen till skon, huvudet ned ur kameran) hör till vägen till skon. `fran` är lyftets ruta där given börjar.
 */
function franSkon(lyft: Lyft, zA: number): Lyft & {fran: number} {
  if (lyft.leavesShoe === undefined) return {...lyft, fran: 0};
  const s = Math.max(0, tiderna(lyft, last(lyft, zA)).arrive - 3), f = (x?: number) => x === undefined ? x : x - s;
  return {...lyft, fran: s, frames: lyft.frames.slice(s), frameCount: lyft.frames.length - s, leavesShoe: f(lyft.leavesShoe), rests: f(lyft.rests), film_seconds: [Math.round((lyft.film_seconds[0] + s / FPS) * 1000) / 1000, lyft.film_seconds[1]]};
}

/** Stilens ansiktsformer som bär, och minen i en ruta: blinkningarna som korta toppar ovanpå en halverad långsam del, eyeSquint dämpad. */
function minen(L: Last, stil: Stil) {
  const bar = Object.entries(stil.face.shapes).filter(([, v]) => v.verdict === 'carries').map(([k]) => k), n = L.n;
  const spar = Object.fromEntries(bar.map(k => [k, L.a.map(a => a[k] ?? 0)]));
  const langsam = (v: number[]) => v.map((_, t) => median(v.slice(Math.max(0, t - 7), t + 8)));
  for (const k of bar.filter(k => k.startsWith('eyeBlink'))) { const v = spar[k], l = langsam(v), topp = v.map((x, t) => x - l[t]), ut0 = l.map(x => 0.5 * x);
    for (let t = 0; t < n; ) { if (topp[t] <= 0.12) { t++; continue; } let e = t; while (e < n && topp[e] > 0.12) e++;
      if (e - t <= 12) for (let i = Math.max(0, t - 1); i < Math.min(n, e + 1); i++) ut0[i] += Math.max(0, topp[i]); t = e; }
    spar[k] = ut0; }
  for (const k of bar.filter(k => k.startsWith('eyeSquint'))) spar[k] = spar[k].map(x => 0.4 * x);
  return {bar, spar};
}

/**
 * Blickens mål ruta för ruta (N rutor, lyftets n): lyftets fält blick (kameran eller annat), jämnat som flertalet över sju
 * rutor och med stycken kortare än åtta rutor uppgångna i grannen; `ram.vila` (de rutor där dockan är i vilan i början och
 * slutet) är kameran. Varje stycke har ett mål (kameran, eller `malFor` för stycket), och målet går mjukt mellan styckena
 * på tolv rutor (0,4 s) kring gränsen.
 */
function blickMal(lyft: Lyft, N: number, n: number, ram: {vila: [number, number]} | null, malFor: (fran: number, till: number) => Vec3, kamera: Vec3): Vec3[] {
  const raa = Array.from({length: N}, (_, t) => lyft.frames[Math.min(t, n - 1)].blick === 'kameran' ? 1 : 0);
  let lab = raa.map((_, t) => { let s = 0, c = 0; for (let k = t - 3; k <= t + 3; k++) if (k >= 0 && k < N) { s += raa[k]; c++; } return s * 2 >= c ? 1 : 0; });
  if (ram) lab = lab.map((x, t) => t <= ram.vila[0] || t >= ram.vila[1] ? 1 : x);
  const runs: {fran: number; till: number; lab: number}[] = [];
  lab.forEach((x, t) => { const r = runs.at(-1); if (r && r.lab === x) r.till = t; else runs.push({fran: t, till: t, lab: x}); });
  for (let i = 0; i < runs.length;) { const r = runs[i]; if (runs.length > 1 && r.till - r.fran + 1 < 8 && r.fran > 0 && r.till < N - 1) { const g = i > 0 ? runs[i - 1] : runs[i + 1]; g.fran = Math.min(g.fran, r.fran); g.till = Math.max(g.till, r.till); runs.splice(i, 1);
    for (let k = 1; k < runs.length;) { if (runs[k].lab === runs[k - 1].lab) { runs[k - 1].till = runs[k].till; runs.splice(k, 1); } else k++; } i = 0; } else i++; }
  const mal = runs.map(r => r.lab ? kamera : malFor(r.fran, r.till));
  const vikter = runs.map((r, i) => Array.from({length: N}, (_, t) => (i ? smooth((t - (r.fran - 0.5) + 6) / 12) : 1) * (i < runs.length - 1 ? 1 - smooth((t - (r.till + 0.5) + 6) / 12) : 1)));
  return Array.from({length: N}, (_, t) => { let s = 0, p: Vec3 = [0, 0, 0]; vikter.forEach((w, i) => { s += w[t]; p = add(p, mul(mal[i], w[t])); }); return s > 1e-6 ? mul(p, 1 / s) : kamera; });
}

/** Ett ankare (rörelseschemats namn, standarddocka/rorelsekatalog.json): vilan A1 eller redo vid skon A2.3; axelRef: lyftets axlars mitt där ankaret är taget (A2.3), annars stilens medel; huvudVinklar: huvudets nick, vridning och tippning i ankaret (grader från kameran, som huvudMot), annars noll. */
export type Ankare = {namn: 'A1' | 'A2.3'; about: string; doll: string; style: string; hip: Vec3; frame: Frame; axelRef?: Vec3; huvudVinklar?: Vec3};
/** sikte: hur mycket högerns mål på kortet flyttas (meter) för att kortet ska landa där målet är, när handens rättningar flyttade det (siktat nedan). */
type Bygg = {doll: Doll; stil: 'kameran' | 'bordet'; stilFil: Stil; lyft: Lyft; ank: Ankare; minen: ReturnType<typeof minen>; dir?: string; sikte?: Vec3};

/**
 * Kroppen i varje ruta av rörelsen (N rutor, lyftets ruta li(t)): axlarna ur lyftet i dockans djup och bredd, och huvudet
 * (blicken sätts av blickMal); tonade mot ankaret i ändarna. Bålens vridning kring lodlinjen är lyftets: axlarna ser smalare ut i bilden när
 * bålen är vriden (live-bj/README.md "Kroppen följer handen": 12 % smalare vid skon), så vinkeln är den som ger lyftets
 * bredd mot stilens fulla (medel.bredd), högst dockans mostTwist; bröstet vänds åt det håll händerna arbetar (`hall`).
 */
function kroppen(b: Bygg, L: Last, medel: ReturnType<typeof stilensMedel>, zHuvud: number, ton: (t: number) => number, N: number, hall: (t: number) => number) {
  const f0 = b.ank.frame, n = L.n, li = (t: number) => Math.min(t, n - 1), halv = b.doll.place.kind === 'seat' ? b.doll.place.shouldersApart / 2 : 0.18;
  // (ankarets egen hållning där rörelsen är ankarets: axlarnas riktning och huvudet mot axlarna, i vilan som vid skon)
  const ankMitt = mitt(f0.R.s, f0.L.s), ankDir = unit(sub(f0.L.s, f0.R.s)), ankHuvud = sub(f0.h, ankMitt), ref = b.ank.axelRef ?? medel.mitt;
  const vrid = lagpass(Array.from({length: n}, (_, j) => { const v = sub(L.L.s[j], L.R.s[j]), wp = Math.hypot(v[0], v[1]); return Math.min(b.doll.mostTwist, Math.acos(Math.min(1, wp / medel.bredd))); }), 2);
  return Array.from({length: N}, (_, t) => {
    const j = li(t), w = ton(t), m = add(ankMitt, mul(sub(axelMitt(L, j), ref), w)), v = sub(L.L.s[j], L.R.s[j]), r2 = unit([v[0], v[1], 0]), y = Math.max(0, vrid[j]) * hall(t);
    // (bröstet åt +x: höger axel fram, mot spelarna)
    const rikt: Vec3 = unit([r2[0] * Math.cos(y), r2[1], -Math.sin(y)]), dir = unit(lerp(ankDir, rikt, w));
    const S: [Vec3, Vec3] = [sub(m, mul(dir, halv)), add(m, mul(dir, halv))];
    const hm = sub(tillDjup(L.h[j], zHuvud), axelMitt(L, j)), h = add(m, lerp(ankHuvud, hm, w));
    return {S, h};
  });
}

/** Rörelsen: en giv eller en väntan, ruta för ruta. */
export function bygg(b: Bygg) {
  const {doll, lyft} = b, fr = dollFrame(doll), zAxlar = fr.shoulders[0][2], L = last(lyft, zAxlar), n = L.n, kant = kantFor(doll);
  const zHuvud = fr.head[2], medel = stilensMedel(b.stil, zAxlar, zHuvud, b.dir), F = 10, f0 = b.ank.frame, giv = lyft.leavesShoe !== undefined;
  const ank: Record<Sida, Hand> = {R: {a: axesOf(f0.R.p, 1), w: f0.R.w, S: local(f0.R.p, axesOf(f0.R.p, 1))}, L: {a: axesOf(f0.L.p, -1), w: f0.L.w, S: local(f0.L.p, axesOf(f0.L.p, -1))}};
  const fri = {R: lyftetsHander(lyft, 'R', ank.R.S, L.R.bort), L: lyftetsHander(lyft, 'L', ank.L.S, L.L.bort)};
  // (högern medan pekfingret är på kortet: pekande, lutad nedåt längs synlinjen, pek.krok och pek.lut per ruta, se pekande)
  const pek = {krok: Array<number>(n).fill(0), lut: Array<number>(n).fill(0), nyp: Array<number>(n).fill(0)};
  const lyftHand = (s: Sida, t: number): Hand => { const j = Math.min(t, n - 1), h: Hand = {a: L[s].vinklar[j], w: L[s].w[j], S: fri[s].S[j]};
    return s === 'R' && (pek.krok[j] || pek.lut[j] || pek.nyp[j]) ? pekande(h, pek.krok[j], pek.lut[j], pek.nyp[j]) : h; };
  const fart = (s: Sida, t: number): Vec3 => { const w = L[s].w, a = Math.max(0, t - 1), c = Math.min(n - 1, t + 1); return mul(sub(w[c], w[a]), 1 / Math.max(1, c - a)); };
  const vTopp = (namn: string, ers: number) => Math.min(1.3, b.stilFil.speed[namn]?.top_m_s?.best?.median ?? ers);

  // ---- tiderna, bryggorna och var varje hand är ----------------------------------------------------------------------
  let ti: Tider | null = null, N = n, plats: string | null = null, malKort: Kort | null = null, malKalla: 'lyftet' | 'platsen' = 'platsen';
  const faser: Record<Sida, Fas[]> = {R: [], L: []}, egen: Record<Sida, [number, number] | null> = {R: null, L: null};
  // (bryggorna: från ankaret i rutan t0 till lyftet i t1, och från lyftet i t2 till ankaret i t3)
  const bryggor: Record<Sida, {t0: number; t1: number; t2: number; t3: number}> = {R: {t0: 0, t1: 0, t2: n - 1, t3: n - 1}, L: {t0: 0, t1: 0, t2: n - 1, t3: n - 1}};
  let vidSkonHem = false, huvudSlut: {e0: number; N: number} | null = null;
  if (giv) {
    ti = tiderna(lyft, L); const t = ti, fR = L.R.w.map((p, i) => i ? length(sub(p, L.R.w[i - 1])) * FPS : 0);
    // vänstern: ur vilan till lyftet där dess resa till skon börjar om ankaret ligger nära den (under 6 cm), annars ända fram till skon
    const nara = length(sub(L.L.w[t.resa], ank.L.w)) < 0.06, t1L = nara ? t.resa : t.arrive, TL = bryggTid(length(sub(L.L.w[t1L], ank.L.w)), vTopp('left_to_shoe', 1.1));
    bryggor.L.t1 = t1L; bryggor.L.t0 = Math.max(0, t1L - TL);
    // högern: ur vilan till där den väntar på kortet före bytet (den första rutan i stillheten närmast före bytet, farten
    // under 0,25 m/s), annars till bytet; den går ut medan vänstern går till skon (som dealern gör i 64 och 94 % av turerna,
    // live-bj/README.md), högst dubbelt så långsamt som stilens fart
    let st = t.meet - 1; while (st > 1 && fR[st] < 0.25) st--; st = Math.min(t.meet - 1, st + 1);
    const TR0 = bryggTid(length(sub(L.R.w[st], ank.R.w)), vTopp('right_out', 1.0)), t1R = Math.max(st, Math.min(t.meet, TR0));
    bryggor.R.t1 = t1R; bryggor.R.t0 = Math.max(0, t1R - 2 * bryggTid(length(sub(L.R.w[t1R], ank.R.w)), vTopp('right_out', 1.0)));
    // hem: högern från rutan den lämnar kortet till vilan; klippet slutar när den är hemma. Vänstern följer lyftet så länge
    // och går hem i en kort brygga från där den då är (står den vid skon efter nästa kort är det märkt).
    const t2R = t.vila, TRh = bryggTid(length(sub(L.R.w[t2R], ank.R.w)), vTopp('right_back', 1.1)), ER = t2R + TRh;
    bryggor.R.t2 = t2R; bryggor.R.t3 = ER;
    let t2L = Math.min(n - 1, ER - 8); for (; t2L > t.meet + 8; t2L--) if (t2L + bryggTid(length(sub(L.L.w[t2L], ank.L.w)), vTopp('left_to_shoe', 1.1)) <= ER) break;
    t2L = Math.max(t.meet + 8, Math.min(n - 1, t2L)); const TLh = bryggTid(length(sub(L.L.w[t2L], ank.L.w)), vTopp('left_to_shoe', 1.1));
    bryggor.L.t2 = t2L; bryggor.L.t3 = Math.max(ER, t2L + TLh);
    vidSkonHem = length(sub(L.L.w[t2L], kortISkon().c)) < 0.15;
    N = Math.max(bryggor.R.t3, bryggor.L.t3) + 1;
    // (huvudet går tillbaka till ankarets först när kortet ligger, och inte fortare än dealern själv vrider sitt: räcker
    // given inte till det blir den så mycket längre, med händerna kvar i ankaret)
    huvudSlut = huvudetsSlut(L.huvudV, b.ank.huvudVinklar ?? [0, 0, 0], t.ligger, N, true); N = huvudSlut.N;
    // platsen: den kortplats för lyftets plats som ligger närmast där lyftets kort lades
    const seat = /seat (\d)/.exec(lyft.to ?? '')![1], landat = lyft.frames[t.rests].card?.c ?? L.R.grepp[t.rests];
    plats = Object.keys(LIVE.cards).filter(id => id.startsWith(`P${seat}.`)).sort((x, y) => Math.hypot(LIVE.cards[x].at[0] - landat[0], LIVE.cards[x].at[2] - landat[2]) - Math.hypot(LIVE.cards[y].at[0] - landat[0], LIVE.cards[y].at[2] - landat[2]))[0];
    // (kortets mål: där den riktiga dealerns kort låg i den här given, annars kortplatsen; handen för det dit, nedan)
    const iFilmen = kortetIFilmen(lyft); malKort = iFilmen ?? kortPaPlats(plats); malKalla = iFilmen ? 'lyftet' : 'platsen';
    const B = bryggor;
    faser.L = [{fran: 0, till: B.L.t0, vad: 'vilan', kalla: 'ankaret'}, {fran: B.L.t0, till: B.L.t1, vad: nara ? 'ur vilan in i lyftet' : 'ur vilan till skon', kalla: 'brygga'},
      ...(nara ? [{fran: t.resa, till: t.arrive, vad: 'till skon', kalla: 'lyftet' as const}] : []), {fran: t.arrive, till: t.pull, vad: 'vid skon', kalla: 'lyftet'}, {fran: t.pull, till: t.leaves, vad: 'drar kortet ur skon', kalla: 'lyftet'},
      {fran: t.leaves, till: t.meet, vad: 'för kortet till bytet och reser det på kant', kalla: 'lyftet'}, {fran: t.meet, till: B.L.t2, vad: 'släpper kortet, fri', kalla: 'lyftet'},
      {fran: B.L.t2, till: B.L.t3, vad: vidSkonHem ? 'hem från skon (lyftets vänster är vid skon efter nästa kort: kan bytas mot vänstern vid skon)' : 'hem', kalla: 'brygga'}, {fran: B.L.t3, till: N - 1, vad: 'vilan', kalla: 'ankaret'}];
    faser.R = [{fran: 0, till: B.R.t0, vad: 'vilan', kalla: 'ankaret'}, {fran: B.R.t0, till: B.R.t1, vad: 'ur vilan in i lyftet', kalla: 'brygga'}, {fran: B.R.t1, till: t.meet, vad: 'väntar på kortet', kalla: 'lyftet'},
      {fran: t.meet, till: t.vandFran, vad: 'tar kortet på kant i bytet och bär det i luften, pekfingret på dess övre kant och tummen mot dess sida', kalla: 'lyftet'}, {fran: t.vandFran, till: t.plan, vad: 'tippar kortet kring långsidan under handen ned på filten, framsidan upp', kalla: 'lyftet'},
      {fran: t.plan, till: t.ligger, vad: 'skjuter kortet på plats med pekfingret', kalla: 'lyftet'}, {fran: t.ligger, till: B.R.t2, vad: 'pekfingret vilar på kortet', kalla: 'lyftet'},
      {fran: B.R.t2, till: B.R.t3, vad: 'hem', kalla: 'brygga'}, {fran: B.R.t3, till: N - 1, vad: 'vilan', kalla: 'ankaret'}];
    for (const s of ['R', 'L'] as Sida[]) faser[s] = faser[s].filter(x => x.till > x.fran);
    egen.L = [t.resa, t.meet]; egen.R = [Math.max(B.R.t1, t.meet - 6), t.vila];
  }

  // ---- djupet: förankrat vid kontakterna, längs synlinjen från livebordets kamera -------------------------------------------
  // Ett lyft ur en kamera är säkert tvärs synlinjen (det bilden visar) och osäkert längs den (djupet: 5–7 cm fel i median).
  // Bordets punkter är kända i alla tre led. Där en hand rör kortet (vänstern vid skon, vänstern på filten när kortet är ute,
  // högern i bytet, högern när kortet ligger) flyttas den därför längs sin synlinje så långt kontakten kräver: i filmens
  // bild står den kvar. Flytten tonas mjukt mellan kontakterna och bort efter dem. Det som ändå inte går ihop rättas tvärs
  // synlinjen, högst KONTAKT, och resten är ett fynd om lyftet eller bordet (kvittots kontakt, med bildpunkter).
  const KAM: Vec3 = [0, LIVE_CAMERA.height, 0], syn = (s: Sida, t: number) => unit(sub(L[s].w[Math.min(t, n - 1)], KAM));
  const tvars = (v: Vec3, u: Vec3): Vec3 => sub(v, mul(u, dot(v, u)));
  const pxAv = (a: Vec3, b: Vec3) => { const A = liveSee(a), Bp = liveSee(b); return A && Bp ? Math.round(Math.hypot(A.x - Bp.x, A.y - Bp.y)) : NaN; };
  /** Hur långt längs `u` punkten P0 ska flyttas (högst 25 cm åt vardera hållet) för att `mal` ska bli minst. */
  const langsMed = (P0: Vec3, u: Vec3, mal: (P: Vec3) => number) => { let best = 0, c = Infinity; for (let l = -0.25; l <= 0.25 + 1e-9; l += 0.002) { const x = mal(add(P0, mul(u, l))) + Math.abs(l) * 0.002; if (x < c) { c = x; best = l; } } return best; };
  /** Mjukt genom nycklarna [ruta, värde]; före den första och efter den sista som den. */
  const genom = (keys: [number, number][]) => (t: number) => { if (!keys.length) return 0; if (t <= keys[0][0]) return keys[0][1]; const k = keys.findIndex(([x]) => x >= t); if (k < 0) return keys.at(-1)![1];
    const [a, va] = keys[k - 1], [b2, vb] = keys[k]; return b2 > a ? va + (vb - va) * mjuk((t - a) / (b2 - a)) : vb; };
  const djupF: Record<Sida, (t: number) => number> = {R: () => 0, L: () => 0};
  const sido: Record<Sida, {v: Vec3; w: (t: number) => number}[]> = {R: [], L: []}, andpunkt: {v: Vec3; w: (t: number) => number} = {v: [0, 0, 0], w: () => 0};
  const kontakt: Record<string, {langsMm: number; tvarsMm: number; behovdesMm: number; px: number}> = {};
  const ramp =(t: number, a: number, b: number) => b <= a ? (t >= b ? 1 : 0) : smooth((t - a) / (b - a));
  if (giv && ti && plats && malKort) {
    const t = ti, K0 = kortISkon(), KL = malKort;
    const ryggen = (k: Kort, p: Vec3) => add(paKortet(k, p), mul(k.n, -T / 2));
    const not = (vad: string, l: number, P: Vec3, mal: Vec3, u: Vec3, lat: Vec3) => { kontakt[vad] = {langsMm: Math.round(l * 1000), tvarsMm: Math.round(length(lat) * 1000), behovdesMm: Math.round(length(tvars(sub(mal, P), u)) * 1000), px: pxAv(P, mal)}; };
    // högern pekar från bytet tills den lämnar kortet (pekande): fingrarna krökta på tre rutor efter bytet; lutningen, från
    // rutan innan vändningen börjar, så liten som håller handens övriga delar ovanför pekfingertoppen (högst 80 grader),
    // mjukad över rutorna intill, och från bytet dit mjukt från ingen
    // (den minsta lutningen: nedan läggs den så att pekfingertoppen är där kortet kräver den)
    for (let x = 0; x < n; x++) pek.krok[x] = smooth((Math.min(x, t.vila) - t.meet) / (t.ned - t.meet));
    // (medan högern tar och bär kortet på kant är pekfingret krökt in mot tummen, så att de nyper kortet mellan sig (tummen
    // läggs an nedan): krökt på elva rutor fram till bytet, rakt igen medan kortet tippas ned, tills det är plant)
    for (let x = 0; x < Math.min(n, t.plan); x++) pek.nyp[x] = PEKKROK * smooth((x - (t.meet - 10)) / 11) * (1 - smooth((x - t.vandFran) / (t.plan - t.vandFran)));
    // (medan kortet står på kant är fingret högre än när kortet ligger: så mycket lägre än toppen får handens övriga delar gå)
    // (och medan kortet förs ned mot filten efter bytet: så högt som fingret är över filten)
    const tillat = (x: number) => x >= t.plan ? 0 : Math.max(0, hojdKort(t, x) - PEK_PLANT - 0.004);
    const lutBehov = Array.from({length: n}, (_, x) => { if (x <= t.meet || x > t.vila) return 0; const h = {a: L.R.vinklar[x], w: L.R.w[x], S: fri.R.S[x]};
      for (let g = 0; g <= 80; g += 2) if (underToppen(pekande(h, pek.krok[x], rad(g), pek.nyp[x])) <= 0.002 + tillat(x)) return rad(g); return rad(80); });
    const lutJ = lutBehov.map((_, x) => Math.max(0, ...lutBehov.map((y, j) => y * smooth(1 - Math.abs(Math.min(x, t.vila) - j) / 4))));
    // (i bytet är handen filmens; den lutas och pekar på tre rutor medan den sänker kortet mot filten)
    for (let x = 0; x < n; x++) pek.lut[x] = lutJ[x] * smooth((x - t.meet) / (t.ned - t.meet));
    // vänstern vid skon: fingertopparnas dynor på kortets rygg i draget
    const uS = syn('L', t.pull), PS0 = dynor(lyftHand('L', t.pull)), lS = langsMed(PS0, uS, P => length(sub(ryggen(K0, P), P))), PS = add(PS0, mul(uS, lS)), latS = begrans(tvars(sub(ryggen(K0, PS), PS), uS), KONTAKT);
    not('vänstern mot kortet i skon', lS, PS, ryggen(K0, PS), uS, latS);
    // vänstern när kortet är ute: dynorna på kortets rygg, kortet plant på filten
    const uU = syn('L', t.leaves), PU0 = dynor(lyftHand('L', t.leaves)), lU = clamp((T - PU0[1]) / (uU[1] || -1e-6), -0.25, 0.25);
    kontakt['vänstern på kortet när det är ute'] = {langsMm: Math.round(lU * 1000), tvarsMm: 0, behovdesMm: 0, px: 0};
    // bytet: kortet står på kant på filten mellan händerna (de håller i var sin ände, live-bj/README.md "Handbytet"; filmen
    // ruta 48–49: kortet syns smalt, dess långsida längs synlinjen): högerns pekfingertopp an mot kortets sida vid den främre
    // änden, så högt som kortet på kant kräver (djupet längs synlinjen), och vänsterns dynor på dess övre kant vid den bakre,
    // en kortlängd bakom (vänsterns djup som när kortet kom ut)
    const pLm = add(dynor(lyftHand('L', t.meet)), mul(syn('L', t.meet), lU)), uM = syn('R', t.meet), gM0 = punkter(lyftHand('R', t.meet))[8];
    const lM = (hojdKort(t, t.meet) - gM0[1]) / (uM[1] || -1e-6), tM = add(gM0, mul(uM, lM));
    kontakt['högern mot kortet i bytet'] = {langsMm: Math.round(lM * 1000), tvarsMm: 0, behovdesMm: Math.round(Math.abs(length(sub(tM, pLm)) - (HK - 0.025)) * 1000), px: 0};
    djupF.L = genom([[Math.max(0, Math.min(t.resa, t.arrive - 6)), 0], [t.arrive, lS], [t.pull, lS], [t.leaves, lU], [t.meet, lU], [t.meet + 12, 0]]);
    sido.L.push({v: latS, w: x => ramp(x, t.arrive - 5, t.arrive) * (1 - ramp(x, t.pull, t.leaves + 3))});
    // platsen: pekfingertoppen på kortets övre kant, vid änden mot dealern (filmens ruta 63–79), på samma ställe på kortet
    // som den har haft sedan bytet (VAND_U, långsidan): kortet glider inte under fingret, det följer det. Där står toppen kvar
    // tills handen lämnar kortet (fingretVilar nedan).
    const tipp = (x: number) => punkter(lyftHand('R', x))[8], uL = KL.l, aL = cross(KL.n, KL.l);
    // (ändpunkten: högerns väg böjd mjukt från bytet (noll) till där kortet ligger (helt), så att fingret, och kortet under
    // det, kommer dit den riktiga dealerns kort låg (malKort); det står kvar tills handen har gått hem: undantaget från
    // KONTAKT, redovisat som andpunktMm. Vägen behåller filmens form och takt. Längs synlinjen står handen där pekfingret når
    // kortet, nedan. `sikte` är det handens rättningar sedan flyttar fingret, så att kortet landar på målet: siktat.)
    const malet = add(add(add(add(KL.c, mul(uL, VAND_U)), mul(aL, -(WK / 2 - KANT))), [0, T / 2 + BALL(8) + LUFT, 0]), b.sikte ?? [0, 0, 0]), uR = syn('R', t.ligger), dR = sub(malet, tipp(t.ligger));
    andpunkt.v = tvars(dR, uR); andpunkt.w = x => x <= t.meet ? 0 : x >= t.ligger ? 1 : mjuk((x - t.meet) / (t.ligger - t.meet));
    kontakt['högern på kortet när det ligger'] = {langsMm: Math.round(dot(dR, uR) * 1000), tvarsMm: Math.round(length(andpunkt.v) * 1000), behovdesMm: Math.round(length(andpunkt.v) * 1000), px: pxAv(tipp(t.ligger), add(tipp(t.ligger), andpunkt.v))};
    // HÖGERN FRÅN BYTET: pekfingertoppen där kortet kräver den (hojdKort): kortet på kant på filten i bytet, lyft KORT_LYFT
    // medan högern bär det, tippat ned till framsidan upp, och skjutet på plats. Höjden tas med handens lutning (handleden går
    // som i filmen), på ett djup längs synlinjen som är lugnt (jämnat): det lutningen inte når tas med djupet. I filmens bild
    // står handleden kvar.
    // (djupet går till bytets från högst 20 rutor före, men inte förrän sex rutor efter att handen kommit in i lyftet, där
    // bryggan och ankaret vid skon tar den)
    const fran = Math.max(bryggor.R.t1, Math.min(t.meet - 6, Math.max(bryggor.R.t1 + 6, t.meet - 20))), djupR0 = genom([[fran, 0], [t.meet, lM]]);
    const hojdVid = (x: number) => hojdKort(t, Math.max(t.meet, Math.min(x, t.vila)));
    const toppVid = (x: number, lut: number, djup: number) => { const y = Math.min(x, t.vila), j = Math.min(y, n - 1), h = pekande({a: L.R.vinklar[j], w: L.R.w[j], S: fri.R.S[j]}, pek.krok[j], lut, pek.nyp[j]);
      return add(add(punkter(h)[8], mul(andpunkt.v, andpunkt.w(y))), mul(syn('R', y), djup)); };
    // (handleden ska gå lugnt: djupet är en jämn kurva från där högern kommer in i lyftet till där den lämnar kortet, så
    // låg längs synlinjen (så högt) att fingret når sin höjd med den minsta lutningen; höjden tas sedan med lutningen, och
    // bara det den inte når med djupet, ruta för ruta)
    const uy = (x: number) => syn('R', Math.min(x, t.vila))[1] || -1e-6, alla = Array.from({length: t.vila - fran + 1}, (_, i) => fran + i);
    // (fram till bytet kommer högerns pekfinger ovanifrån, över vänsterns fingertoppar: så möter det kortets rygg och går inte genom kortet)
    const ovanVanstern = (x: number) => { const pL = dynor(flyttHand(lyftHand('L', x), mul(syn('L', x), djupF.L(x)))); return (pL[1] + BALL(8) + 0.004 - toppVid(x, pek.lut[x], 0)[1]) / uy(x); };
    const krav = alla.map(x => x < t.meet ? (x >= t.meet - 5 ? Math.min(djupR0(x), ovanVanstern(x)) : djupR0(x)) : (hojdVid(x) - toppVid(x, pek.lut[x], 0)[1]) / uy(x));
    let bas = lagpass(krav, 1.5);
    for (let varv = 0; varv < 4; varv++) { const over = alla.map((x, i) => x >= t.meet ? Math.max(0, bas[i] - krav[i]) : 0);
      const bula = over.map((_, i) => Math.max(0, ...over.map((y, j) => y * smooth(1 - Math.abs(i - j) / 7)))); bas = lagpass(bas.map((v, i) => v - bula[i] * 1.15), 2); }
    const lutMin = alla.map(x => pek.lut[x]), djupSlut: number[] = [];
    // (de fem rutorna före bytet går toppen mjukt till höjden i bytet, så att handen inte hoppar dit)
    alla.forEach((x, i) => { if (x < Math.max(t.meet - 4, fran + 1)) { djupSlut.push(bas[i]); return; } const y0 = (g: number) => toppVid(x, g, bas[i])[1], hojd = x >= t.meet ? hojdVid(x) : y0(lutMin[i]) + (hojdVid(t.meet) - y0(lutMin[i])) * smooth((x - (t.meet - 5)) / 5); let lo = lutMin[i], hi = rad(88);
      if (y0(lo) <= hojd) hi = lo; else if (y0(hi) >= hojd) lo = hi; else for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (y0(m) > hojd) lo = m; else hi = m; }
      pek.lut[x] = (lo + hi) / 2; djupSlut.push(bas[i] + (hojd - y0(pek.lut[x])) / uy(x)); });
    for (let x = t.vila + 1; x < n; x++) pek.lut[x] = pek.lut[t.vila];
    // (medan högern tar och bär kortet i luften är djupet och lutningen jämnade (4 Hz), så att handen inte rycker; toppens
    // höjd får där gå någon millimeter från kravet, som kortets vinkel tar upp, och är kravets igen när kortet är plant)
    { const glattD = lagpass(djupSlut, 4), glattL = lagpass(alla.map(x => pek.lut[x]), 4);
      alla.forEach((x, i) => { const w = x < t.meet - 4 || x >= t.plan ? 0 : Math.min(smooth((x - (t.meet - 5)) / 3), 1 - smooth((x - (t.plan - 4)) / 4));
        if (w > 0) { djupSlut[i] += (glattD[i] - djupSlut[i]) * w; pek.lut[x] += (glattL[i] - pek.lut[x]) * w; } }); }
    const djup0 = genom([[Math.max(bryggor.R.t1, fran - 12), 0], [fran, bas[0]]]);
    djupF.R = x => x < fran ? djup0(x) : djupSlut[Math.min(x, t.vila) - fran];
  }
  const andpunktVid = (s: Sida, t: number): Vec3 => s === 'R' ? mul(andpunkt.v, andpunkt.w(t)) : [0, 0, 0];
  /** Lyftets hand med djupet förankrat (längs synlinjen) och, för högern, ändpunkten på vår plats. */
  const lyftHandD = (s: Sida, t: number): Hand => flyttHand(lyftHand(s, t), add(mul(syn(s, t), djupF[s](t)), andpunktVid(s, t)));

  // ---- händerna: ankaret, bryggorna och lyftet --------------------------------------------------------------------------
  const kalla: Record<Sida, Kalla[]> = {R: [], L: []};
  const hander: Record<Sida, Hand[]> = {R: [], L: []};
  const vikt: Record<Sida, number[]> = {R: [], L: []};   // (hur mycket handen är lyftets: 1 i lyftet, 0 i ankaret; för armbågen och kroppen)
  for (const [s] of SIDOR) {
    const B = bryggor[s], refV = medianV(L[s].w), tonV = (t: number) => smooth(Math.min(t, N - 1 - t) / F);
    for (let t = 0; t < N; t++) {
      if (!giv) { hander[s].push({...ank[s], w: add(ank[s].w, mul(sub(L[s].w[t], refV), tonV(t)))}); kalla[s].push('v'); vikt[s].push(tonV(t)); continue; }
      if (t <= B.t0 || t >= B.t3) { hander[s].push({...ank[s]}); kalla[s].push('v'); vikt[s].push(0); continue; }
      if (t < B.t1) { const Tr = B.t1 - B.t0, u = (t - B.t0) / Tr, m = mjuk(u), h1 = lyftHandD(s, B.t1);
        hander[s].push({a: between(ank[s].a, h1.a, m), w: brygga(ank[s].w, [0, 0, 0], h1.w, fart(s, B.t1), Tr, t - B.t0), S: formMellan(ank[s].S, h1.S, m)}); kalla[s].push('b'); vikt[s].push(m); continue; }
      if (t > B.t2) { const Tr = B.t3 - B.t2, u = (t - B.t2) / Tr, m = mjuk(u), h2 = lyftHandD(s, B.t2);
        hander[s].push({a: between(h2.a, ank[s].a, m), w: brygga(h2.w, fart(s, B.t2), ank[s].w, [0, 0, 0], Tr, t - B.t2), S: formMellan(h2.S, ank[s].S, m)}); kalla[s].push('b'); vikt[s].push(1 - m); continue; }
      hander[s].push(lyftHandD(s, t)); kalla[s].push(length(andpunktVid(s, t)) > 0.001 ? 'a' : 'l'); vikt[s].push(1);
    }
  }
  // (taket och kontrollen räknar tvärs synlinjen från de händer lyftet och bryggorna ger, med djupet förankrat)
  const fore = {R: hander.R.map(h => h.w), L: hander.L.map(h => h.w)};
  for (const [s] of SIDOR) for (const x of sido[s]) for (let t = 0; t < N; t++) { const w = x.w(t); if (w > 0 && kalla[s][t] !== 'v' && kalla[s][t] !== 'b') { hander[s][t] = flyttHand(hander[s][t], mul(x.v, w)); if (length(x.v) * w > 0.001) kalla[s][t] = 'k'; } }

  // ---- kontakterna och kortet -------------------------------------------------------------------------------------------
  const C: Kort[] = Array.from({length: N}, () => kortISkon());
  const haller: Record<Sida, boolean[]> = {R: Array(N).fill(false), L: Array(N).fill(false)};
  const kvitto = {lutGrader: 0, huvudTon: [0, 0] as number[], handledMest: {R: 0, L: 0}, nadde: {R: 0, L: 0}, kontakt, andpunktMm: 0, langsSynlinjen: {R: {median: 0, mest: 0}, L: {median: 0, mest: 0}}, ur: {R: 0, L: 0}, urFiltenLangs: {R: 0, L: 0}, vridenUrFilten: {R: 0, L: 0}, kortetPaFilten: 0, overGransen: {R: 0, L: 0}, kortetUr: {R: 0, L: 0}, glid: {} as Record<string, {mm: number; grader: number}>,
    vandning: null as null | {fran: number; plant: number; framsidan: number; ligger: number}, landning: null as null | {mal: 'lyftet' | 'platsen'; malet: {c: Vec3; vinkel: number}; lagt: {c: Vec3; vinkel: number}; franMaletMm: number; vinkelMotMalet: number; plats: string; franPlatsenMm: number; vinkelMotPlatsen: number; maletFranPlatsenMm: number; sikteMm: number},
    pekande: {lutGraderMest: Math.round(grad(Math.max(...pek.lut))), lutGrader: pek.lut.map(x => Math.round(grad(x)))}};
  /** En rättning lagd på handen `s`: `d(t)` meter i rutan t; rutorna med en rättning tvärs synlinjen över en millimeter är kontakter (k). */
  const ratta = (s: Sida, d: (t: number) => Vec3) => { for (let t = 0; t < N; t++) { const x = d(t); if (length(x) < 1e-9) continue; hander[s][t] = flyttHand(hander[s][t], x); if (length(tvars(x, syn(s, t))) > 0.001 && kalla[s][t] === 'l') kalla[s][t] = 'k'; } };
  // (taket: ingen rättning flyttar en handled mer än KONTAKT tvärs synlinjen från där lyftet och bryggorna har den, med
  // djupet förankrat; längs synlinjen fritt. Behövs mer står det i kvittot som overGransen, och det som blir kvar säger lyft-kolla.ts)
  const tak = () => { for (const [s] of SIDOR) hander[s] = hander[s].map((h, x) => { const u = syn(s, x), d = tvars(sub(h.w, fore[s][x]), u), l = length(d); if (l <= KONTAKT + 1e-6) return h; kvitto.overGransen[s] = Math.max(kvitto.overGransen[s], Math.round(l * 1000)); return flyttHand(h, mul(d, KONTAKT / l - 1)); }); };
  /** Handen flyttad längs sin synlinje (mot kameran är minus) så lite som håller den ur filten, högst 15 cm; meter. */
  const urFiltenLangs = (s: Sida, h: Hand, x: number) => { if (overFilten(h) >= 0) return 0; const u = syn(s, x); for (let l = -0.002; l >= -0.15; l -= 0.002) if (overFilten(flyttHand(h, mul(u, l))) >= 0) return l; return -0.15; };
  if (giv && ti && plats && malKort) {
    const t = ti, K0 = kortISkon(), KL = malKort;
    // ute ur skon: kortet plant på filten, ryggen upp, långsidan som i skon, mitt under vänsterns dynor (som djupet har lagt på ryggen)
    const lUt = flat(K0.l), pU = dynor(hander.L[t.leaves]), K1: Kort = {c: [pU[0], T / 2, pU[2]], l: lUt, n: mul(UP, -1)};
    const G1 = iHanden(hander.L[t.leaves], K1);
    // bytet: kortet på kant mellan händerna (filmen ruta 48–49), dess övre långsida under högerns pekfingertopp och
    // långsidan vågrät mot vänsterns dynor, som håller i den andra änden på kortets sida (vänsterns djup ovan). Vänstern
    // reser kortet dit i sitt grepp från att det är ute ur skon (G1 till G2L).
    const pekfingret = (x: number) => punkter(hander.R[x])[8];
    let fiM = Math.PI / 2; while (fiM > 0 && underTopp(fiM) > pekfingret(t.meet)[1]) fiM -= rad(0.5);
    const K2 = nypt(vandKort(pekfingret(t.meet), unit(flat(sub(dynor(hander.L[t.meet]), pekfingret(t.meet)))), fiM), hander.R[t.meet], fiM);
    const G2L = iHanden(hander.L[t.meet], K2);
    kvitto.glid['vänstern: från ute ur skon till bytet'] = glid(G1, G2L);
    kvitto.vandning = {fran: t.vandFran, plant: t.plan, framsidan: t.framsidan, ligger: t.ligger};
    // (i högern, från bytet: kortet på kant under pekfingertoppen (vandKort), uppe i luften (KORT_LYFT), tills vändningen börjar;
    // tippat kring den övre långsidan till framsidan upp på filten; skjutet plant på filten av fingret, och där handen
    // stannar ligger det. Kortets långsida vrids mjukt från bytets till den riktiga dealerns (malKort) medan kortet är i
    // luften, och är där när det når filten; är det mer än ett kvarts varv, åt det håll där kortets fria ände går bort från
    // tummen (och vänstern), inte genom dem. På filten vrids och glider det inte under fingret: det ligger där handen lägger
    // det, i den vinkel det kom (Jakob 2026-11-27).)
    // (kortets vinkel: tidsplanens (vandVinkel), eller mer tippat åt samma håll där fingret är för lågt för att kortets nedre
    // kant ska gå fri från filten)
    const vinkelVid = (x: number) => { const h = pekfingret(x)[1]; let fi = vandVinkel(t, x); while (fi > 0 && underTopp(fi) > h) fi -= rad(0.5); return Math.max(0, fi); };
    const yaw = (v: Vec3) => Math.atan2(v[0], v[2]), yaw0 = yaw(K2.l), dYaw = (() => { let d = yaw(KL.l) - yaw0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) < Math.PI / 2) return d; const ts = flat(sub(punkter(hander.R[t.meet])[4], pekfingret(t.meet))), alt = d > 0 ? d - 2 * Math.PI : d + 2 * Math.PI, mitten = (dd: number): Vec3 => [Math.sin(yaw0 + dd / 2), 0, Math.cos(yaw0 + dd / 2)];
      return dot(mitten(d), ts) <= dot(mitten(alt), ts) ? d : alt; })();
    const langsida = (x: number): Vec3 => { const a = yaw0 + dYaw * jamnTon((x - t.meet) / (t.plan - t.meet)); return [Math.sin(a), 0, Math.cos(a)]; };
    /** Kortet plant på filten under pekfingret i rutan x: på samma ställe under fingret som när det blev plant. */
    const underFingret = (x: number): Kort => { const k = vandKort(pekfingret(x), langsida(x), 0); return {...k, c: [k.c[0], T / 2, k.c[2]]}; };
    const kortet = () => {
      const lagt = underFingret(t.ligger), p0 = LIVE.cards[plats!], fran = (c: Vec3, at: Vec3) => Math.round(Math.hypot(c[0] - at[0], c[2] - at[2]) * 10000) / 10;
      kvitto.landning = {mal: malKalla, malet: {c: r4(KL.c), vinkel: r1(kortVinkel(KL.l))}, lagt: {c: r4(lagt.c), vinkel: r1(kortVinkel(lagt.l))}, franMaletMm: fran(lagt.c, KL.c), vinkelMotMalet: r1(vinkelMellan(kortVinkel(lagt.l), kortVinkel(KL.l))),
        plats: plats!, franPlatsenMm: fran(lagt.c, p0.at), vinkelMotPlatsen: r1(vinkelMellan(kortVinkel(lagt.l), p0.turn)), maletFranPlatsenMm: fran(KL.c, p0.at), sikteMm: Math.round(length(b.sikte ?? [0, 0, 0]) * 10000) / 10};
      for (let x = 0; x < N; x++) {
      if (x <= t.pull) C[x] = K0;
      else if (x < t.leaves) { C[x] = mellan(K0, urHanden(hander.L[x], G1), smooth((x - t.pull) / (t.leaves - t.pull))); haller.L[x] = true; }
      // (de sista TAG rutorna före bytet tar högerns pekfinger kortet ur vänsterns grepp: kortet går mjukt från vänsterns grepp
      // till nypet under högerns pekfingertopp, som i bytet, så att det inte hoppar i bytets ruta, där skon till bytet och
      // bytet till platsen möts)
      else if (x < t.meet) { const vL = urHanden(hander.L[x], mellan(G1, G2L, mjuk((x - t.leaves) / (t.meet - t.leaves)))), s = smooth((x - (t.meet - TAG)) / TAG);
        C[x] = s > 0 ? mellan(vL, nypt(vandKort(pekfingret(x), K2.l, fiM), hander.R[x], fiM), s) : vL; haller.L[x] = true; if (s > 0) haller.R[x] = true; }
      else if (x === t.meet) { C[x] = K2; haller.L[x] = haller.R[x] = true; }
      else if (x < t.plan) { const fi = vinkelVid(x); C[x] = nypt(vandKort(pekfingret(x), langsida(x), fi), hander.R[x], fi); haller.R[x] = true; }
      else if (x < t.ligger) { C[x] = underFingret(x); haller.R[x] = true; }
      else { C[x] = lagt; if (x <= t.vila) haller.R[x] = true; } } };
    // (händerna ur filten: först längs synlinjen, mot kameran (djupet är det osäkra), mjukt över rutorna intill; det som då
    // återstår vrids bort kring handleden, fingrarna uppåt, högst 25 grader, och höjs till sist, högst KONTAKT tvärs synlinjen.
    // Inte högern medan pekfingret är på kortet: där står den längs synlinjen där kortet kräver den.)
    const paKortetR = (x: number) => x >= t.meet && x <= t.vila;
    // (högern rörs inte av rättningarna från bytet tills den lämnar kortet, och de tonas in och ut fyra rutor runt omkring)
    const skyddR = (x: number) => x <= t.meet ? 1 - smooth((x - (t.meet - 2)) / 2) : x <= t.vila ? 0 : smooth((x - t.vila) / 4);
    for (const [s] of SIDOR) {
      const langsBehov = hander[s].map((h, x) => kalla[s][x] === 'v' || kalla[s][x] === 'b' || (s === 'R' && paKortetR(x)) ? 0 : -urFiltenLangs(s, h, x));
      const langsJ = langsBehov.map((_, x) => Math.max(0, ...langsBehov.map((y, j) => y * smooth(1 - Math.abs(x - j) / 6))));
      const skydd = (x: number) => s === 'R' ? skyddR(x) : 1;
      hander[s] = hander[s].map((h, x) => langsJ[x] * skydd(x) > 0 ? flyttHand(h, mul(syn(s, x), -langsJ[x] * skydd(x))) : h);
      kvitto.urFiltenLangs[s] = Math.round(Math.max(0, ...langsJ) * 1000);
      const upp = (h: Hand, x: number) => { const ax = unit(h.a.across), a = vridHand(h, h.w, ax, rad(x)), b2 = vridHand(h, h.w, ax, -rad(x)); return toppMitt(a)[1] >= toppMitt(b2)[1] ? a : b2; };
      const vinkelBehov = hander[s].map((h, x) => { if (kalla[s][x] === 'v' || overFilten(h) >= 0 || (s === 'R' && paKortetR(x))) return 0; for (let g = 2; g <= 25; g += 2) if (overFilten(upp(h, g)) >= 0) return g; return 25; });
      const vinkelJ = vinkelBehov.map((_, x) => Math.max(0, ...vinkelBehov.map((y, j) => y * smooth(1 - Math.abs(x - j) / 5))) * skydd(x));
      hander[s] = hander[s].map((h, x) => vinkelJ[x] > 0 ? upp(h, vinkelJ[x]) : h);
      kvitto.vridenUrFilten[s] = Math.round(Math.max(0, ...vinkelJ));
      const brist = hander[s].map((h, x) => kalla[s][x] === 'v' || (s === 'R' && paKortetR(x)) ? 0 : Math.max(0, -overFilten(h)));
      const hoj = brist.map((_, x) => Math.max(0, ...brist.map((y, j) => y * smooth(1 - Math.abs(x - j) / 5))) * skydd(x));
      kvitto.ur[s] = Math.round(Math.max(0, ...hoj) * 1000);
      ratta(s, x => [0, hoj[x], 0]);
    }
    // (fingret vilar: från rutan kortet ligger står pekfingertoppen still där på kortet, medan handleden går som i filmen i
    // bilden; handen står längs synlinjen och vrids kring handleden så att den når toppen. De tre sista rutorna innan handen
    // lämnar kortet släpps toppen mjukt till där handen har den.)
    const vilar = pekfingret(t.ligger);
    for (let x = t.ligger + 1; x <= t.vila; x++) { const h0 = hander.R[x], fri0 = punkter(h0)[8], vikt = 1 - smooth((x - (t.vila - 3)) / 3), mal = lerp(fri0, vilar, vikt);
      const u = syn('R', x), r = length(sub(fri0, h0.w)), d = sub(mal, h0.w), bb = dot(u, d), disk = bb * bb - dot(d, d) + r * r;
      const l = disk >= 0 ? [bb - Math.sqrt(disk), bb + Math.sqrt(disk)].sort((p, q) => Math.abs(p) - Math.abs(q))[0] : bb, h1 = flyttHand(h0, mul(u, l));
      const v1 = sub(punkter(h1)[8], h1.w), v2 = sub(mal, h1.w), ax = cross(v1, v2);
      hander.R[x] = length(ax) > 1e-9 ? vridHand(h1, h1.w, unit(ax), Math.atan2(length(ax), dot(v1, v2))) : h1; }
    tak(); kortet();
    // (tummen: högern från strax före bytet tills kortet är plant på filten; vänstern de sista rutorna före bytet, när kortet
    // har lämnat filten. Står kortet (på kant i bytet och medan högern bär det) ligger tummen an mot kortets sida på tummens
    // egen sida, en dryg centimeter in från kanten pekfingret är på: kortet hålls mellan tummen och pekfingret. Ligger det,
    // är tummen mitt emot pekfingret på andra sidan kortet, strax utanför kanten fingret håller i.)
    // (och tonad ut på fyra rutor efter att kortet är plant)
    const tummar: [Sida, number, number][] = [...Array.from({length: t.plan - t.meet + 6}, (_, i) => { const x = t.meet - 2 + i; return ['R', x, x < t.meet ? smooth((i + 1) / 3) : x < t.plan ? 1 : 1 - smooth((x - t.plan + 1) / 5)] as [Sida, number, number]; }),
      ...Array.from({length: 4}, (_, i) => ['L', t.meet - 4 + i, smooth((i + 1) / 2)] as [Sida, number, number])];
    for (const [sd, x, vikt] of tummar) {
      if (sd === 'L' && kortLagst(C[x]) < 0.004) continue;
      const h = hander[sd][x], k = C[x], p = punkter(h), a = cross(k.n, k.l), star = Math.abs(k.n[1]) < 0.7, P = paKortet(k, p[8], 0), d = sub(P, k.c);
      const sida = star ? (Math.sign(dot(sub(p[2], k.c), k.n)) || 1) : -(Math.sign(dot(sub(p[8], k.c), k.n)) || 1);
      const iSidled = Math.abs(dot(d, a)) / (WK / 2) > Math.abs(dot(d, k.l)) / (HK / 2), ut = iSidled ? mul(a, Math.sign(dot(d, a)) || 1) : mul(k.l, Math.sign(dot(d, k.l)) || 1);
      const tillKanten = iSidled ? WK / 2 - Math.abs(dot(d, a)) : HK / 2 - Math.abs(dot(d, k.l));
      // (står kortet: tummen dit den når, rakt in mot kortets sida från där den är, minst 3 mm innanför kanterna)
      const mal = star ? add(paKortet(k, p[4], 0.003), mul(k.n, sida * (T / 2 + BALL(4) + LUFT))) : add(add(P, mul(ut, tillKanten + 0.006)), mul(k.n, sida * (T / 2 + BALL(4) + LUFT)));
      const S = h.S.map(v => [...v] as Vec3), malL = inn(h, sub(mal, h.w)), S0 = S.map(v => [...v] as Vec3);
      for (let varv = 0; varv < 12; varv++) for (const j of [3, 2, 1]) { const fran = sub(S[4], S[j]), till = sub(malL, S[j]), ax = cross(fran, till); if (length(ax) < 1e-12) continue;
        const v = Math.atan2(length(ax), dot(fran, till)), k2 = unit(ax); for (let q = j + 1; q <= 4; q++) S[q] = add(S[j], turned(sub(S[q], S[j]), k2, v)); }
      for (const j of [2, 3, 4]) S[j] = lerp(S0[j], S[j], vikt);
      // (lerp mellan två lägen ändrar benens längd lite: varje ben läggs tillbaka i sin längd längs sin nya riktning)
      for (const j of [2, 3, 4]) S[j] = add(S[j - 1], mul(unit(sub(S[j], S[j - 1])), length(sub(S0[j], S0[j - 1]))));
      hander[sd][x] = {...h, S}; }
    // (vänsterns tumme släpps på fyra rutor efter bytet: från sitt läge i rutan före, i handens egna axlar, till handens eget)
    const tL = hander.L[t.meet - 1].S;
    for (let i = 0; i < 4; i++) { const x = t.meet + i, h = hander.L[x], w = 1 - smooth((i + 1) / 5), S = h.S.map(v => [...v] as Vec3);
      for (const j of [2, 3, 4]) S[j] = lerp(h.S[j], add(h.S[1], sub(tL[j], tL[1])), w);
      for (const j of [2, 3, 4]) S[j] = add(S[j - 1], mul(unit(sub(S[j], S[j - 1])), length(sub(h.S[j], h.S[j - 1]))));
      hander.L[x] = {...h, S}; }
    // (ett kort som vänstern för lägre än filten ligger på filten: det glider där, och handen ligger an mot det, nedan)
    const kortUpp = C.map((k, x) => x > t.pull && x < t.meet ? Math.max(0, 0.0005 - kortLagst(k)) : 0), kortUppJ = kortUpp.map((_, x) => Math.max(0, ...kortUpp.map((y, j) => y * smooth(1 - Math.abs(x - j) / 3))));
    for (let x = 0; x < N; x++) if (kortUppJ[x] > 0) C[x] = flyttKort(C[x], [0, kortUppJ[x], 0]);
    kvitto.kortetPaFilten = Math.round(Math.max(0, ...kortUpp) * 1000);
    // (vänsterns grepp ur skon till bytet: kortet mellan fingrarna, med fingrar på var sin sida eller kortet mot filten, och
    // inget finger i det: kortet flyttas längs sin normal i handen, högst 2,4 cm, mjukat över rutorna; en fri hand i kortet
    // flyttas ut, högst KONTAKT. Från bytet ligger kortet under högerns pekfinger, och högern flyttas inte ur det.)
    const sign = (s: Sida) => s === 'R' ? 1 : -1;
    // (efter bytet hålls flytten liten, så att kortet stannar under högerns pekfinger)
    const knuffTill = t.ned;
    const knuff = C.map((k, x) => { const h = (['R', 'L'] as Sida[]).filter(s => haller[s][x]); if (!h.length || x > knuffTill) return 0;
      const rakna = h, vikt = x > t.meet ? 600 : 100;
      const kost = (o: number) => { const ko = flyttKort(k, mul(k.n, o)); return (stod(ko, rakna.map(s => hander[s][x])) ? 0 : 100) + rakna.reduce((sum, s) => sum + iKortet(hander[s][x], ko, sign(s)), 0) + Math.abs(o) * vikt + 1e5 * Math.max(0, 0.0005 - kortLagst(ko)); };
      let bast = 0, kb = kost(0); for (let o = -0.024; o <= 0.024 + 1e-9; o += 0.002) { const c = kost(o); if (c < kb - 1e-9) { kb = c; bast = o; } } return bast; });
    const knuffJ = lagpass(knuff, 5);
    for (let x = 0; x < N; x++) if ((haller.L[x] || haller.R[x]) && x <= knuffTill) C[x] = flyttKort(C[x], mul(C[x].n, knuffJ[x] * (x <= t.meet ? 1 : 1 - smooth((x - t.meet) / (knuffTill + 1 - t.meet)))));
    for (const [s] of SIDOR) {
      // (vänstern också vid skon, där fingrarna ligger mot kortets rygg: ett finger som går in i kortet flyttar handen ut)
      const ut = hander[s].map((h, x) => { if (kalla[s][x] === 'v' || x <= (s === 'L' ? t.arrive - 6 : t.pull) || (s === 'R' && paKortetR(x)) || iKortet(h, C[x], sign(s)) === 0) return null; const k = C[x], d = mul(unit(k.n), Math.sign(dot(sub(h.w, k.c), k.n)) || 1);
        for (let y = 0.002; y <= KONTAKT; y += 0.002) if (iKortet(flyttHand(h, mul(d, y)), k, sign(s)) === 0) return mul(d, y + 0.001); return mul(d, KONTAKT); });
      kvitto.kortetUr[s] = Math.round(Math.max(0, ...ut.map(v => v ? length(v) : 0)) * 1000);
      const d = hander[s].map((_, x) => { let v: Vec3 = [0, 0, 0], m = 0; ut.forEach((u0, j) => { if (!u0) return; const w = smooth(1 - Math.abs(x - j) / 4), l = length(u0) * w; if (l > m) { m = l; v = mul(u0, w); } }); return mul(v, s === 'R' ? skyddR(x) : 1); });
      ratta(s, x => d[x]);
      // (och till sist ur filten igen, där en fri hand flyttades ned)
      const brist = hander[s].map((h, x) => kalla[s][x] === 'v' || haller[s][x] ? 0 : Math.max(0, -overFilten(h)));
      ratta(s, x => [0, Math.max(0, ...brist.map((y, j) => y * smooth(1 - Math.abs(x - j) / 3))), 0]);
    }
    tak();
    // (lång-, ring- och lillfingret ur kortet: där ett av dem ändå går in i kortet krökas det mer in mot handflatan, tio
    // grader i taget och högst sextio, mjukat över rutorna intill; pekfingret och tummen, som håller, rörs inte)
    for (const [s, sg] of SIDOR) { const krok = [2, 3, 4].map(f => hander[s].map((h, x) => { if (kalla[s][x] === 'v' || x <= t.pull - 10) return 0;
        const iK = (S: Vec3[]) => handFaults(placed(S, h.a, h.w), sg, null, C[x]).some(fel => fel.kind === 'kortet' && fel.fingers.includes(f)); if (!iK(h.S)) return 0;
        for (let g = 10; g <= 60; g += 10) if (!iK(krokat(h.S, f, g))) return g; return 60; }));
      krok.forEach((v, i) => { const J = v.map((_, x) => Math.max(0, ...v.map((y, j) => y * smooth(1 - Math.abs(x - j) / 4)))); hander[s] = hander[s].map((h, x) => J[x] > 0 ? {...h, S: krokat(h.S, i + 2, J[x])} : h); }); }
  } else if (!giv) {
    for (const [s] of SIDOR) { const brist = hander[s].map(h => Math.max(0, -overFilten(h))); kvitto.ur[s] = Math.round(Math.max(0, ...brist) * 1000); ratta(s, x => [0, brist[x], 0]); }
  }

  // ---- kroppen: bålen lutar mot den hand som inte når (ren-giv.ts rackvidd), jämnat; armbågarna ----------------------
  // (kroppen följer lyftet där båda händerna gör det och tonas mot ankaret medan en hand är i vilan eller i en brygga: så
  // gungar inte bålen in i en arm som vilar)
  const tHem = Math.min(bryggor.R.t2, bryggor.L.t2), vidHem = giv ? Math.min(vikt.R[tHem], vikt.L[tHem]) : 1;
  // (i en väntan går kroppen in i och ut ur dealerns hållning på dubbelt så lång tid som händerna, 2F rutor)
  const tonK = (t: number) => Math.min(smooth(Math.min(t, N - 1 - t) / (giv ? F : 2 * F)), !giv ? 1 : t <= tHem ? Math.min(vikt.R[t], vikt.L[t]) : vidHem * (1 - smooth((t - tHem) / (N - 1 - tHem))));
  // (åt vilket håll bröstet vänds: dit händerna arbetar, deras mitt mot axlarnas i sidled, mjukt)
  const axMitt = mitt(f0.R.s, f0.L.s)[0], hallV = lagpass(hander.R.map((h, t) => Math.tanh(((h.w[0] + hander.L[t].w[0]) / 2 - axMitt) / 0.06)), 1);
  const hip = b.ank.hip, kropp = kroppen(b, L, medel, zHuvud, tonK, N, t => hallV[t]);
  const behov = kropp.map((k, t) => { let best = {lean: 0, twist: 0, mot: hander.R[t].w};
    for (const [side, i] of [['R', 0], ['L', 1]] as const) { const r = rackvidd(hip, k.S[i], [hander[side][t].w], hander[side][t].w, doll, REN.naturlig); if (r.lean > best.lean) best = {lean: r.lean, twist: r.twist, mot: hander[side][t].w}; }
    return best; });
  // (lutningen jämnad till en mjuk kurva, 1,5 Hz, och den släpper högst en halv grad per ruta när armen inte längre behöver
  // den: inga knyckar i huvud och axlar)
  const W8 = 8, lutn0 = behov.map((_, t) => Math.max(0, ...behov.map((x, j) => x.lean * smooth(1 - Math.abs(t - j) / (W8 + 1))))), lutn = lagpass(lutn0.reduce<number[]>((y, x, t) => [...y, Math.max(x, t ? y[t - 1] - rad(0.5) : x)], []), 1.5).map((x, t) => Math.max(0, x) * smooth(Math.min(t, N - 1 - t) / F));
  const riktn = behov.map((_, t) => { let v: Vec3 = [0, 0, 0], tw = 0, sum = 0; behov.forEach((x, j) => { const w = x.lean * smooth(1 - Math.abs(t - j) / (W8 + 1)); if (w > 0) { v = add(v, mul(flat(sub(x.mot, hip)), w)); tw += (x.twist / (x.lean || 1)) * w; sum += w; } });
    return sum > 0 ? {mot: add(hip, unit(v)), kvot: tw / sum} : {mot: add(hip, [0, 0, 1]), kvot: 0}; });
  const kamera: Vec3 = [0, LIVE_CAMERA.height, 0];
  const torsos0 = kropp.map((k, t) => { const torso = bal(hip, riktn[t].mot, lutn[t], riktn[t].kvot * lutn[t]), h = torso(k.h, 0.85); kvitto.lutGrader = Math.max(kvitto.lutGrader, grad(lutn[t]));
    return {S: [torso(k.S[0]), torso(k.S[1])] as [Vec3, Vec3], h}; });
  // BLICKEN: ett mål per stycke och en mjuk vridning mellan målen (0,3 s), inte lyftets vinkel ruta för ruta (den är mest
  // brus: byter håll 18 gånger i sekunden). Lyftets fält blick säger kameran eller bordet, jämnat (flertalet över sju
  // rutor; ett stycke kortare än åtta rutor går upp i grannen). Kameran: livebordets kamera. Bordet: i en giv skon medan
  // vänstern är där, platsen från bytet tills kortet ligger, annars kortet; i en väntan där lyftets blick möter filten.
  // I vilan i början och slutet ser dockan in i kameran, som ankaret.
  const tavla = blickMal(lyft, N, n, {vila: giv ? [Math.max(6, Math.min(bryggor.R.t0, bryggor.L.t0)), Math.min(N - 7, Math.max(bryggor.R.t3, bryggor.L.t3))] : [6, N - 7]}, (fran, till) => {
    if (giv && ti && plats) { const k0 = kortISkon(), kl = kortPaPlats(plats), over = (a: number, b2: number) => Math.min(till, b2) - Math.max(fran, a);
      return over(ti.meet, ti.ligger) > 0 ? kl.c : over(ti.arrive, ti.leaves) > 0 ? k0.c : C[Math.round((fran + till) / 2)].c; }
    const p: Vec3[] = []; for (let t = fran; t <= till; t++) { const j = Math.min(t, n - 1), h = kropp[t].h, r = L.riktning[j]; if (r[1] < -0.05) p.push(add(h, mul(r, (h[1] - T) / -r[1]))); }
    return p.length ? medianV(p) : add(kropp[fran].h, [0, -0.45, 0.4]); }, kamera);
  // HUVUDET ÄR DEALERNS EGET (domaren 2026-11-27: dealern vrider huvudet 1–10° mot skon, tippar det 0–8° och vrider det
  // högst 1,5° per ruta; ögonen gör resten): huvudets tre vinklar (nick, vridning, tippning; utan ögonen) är lyftets
  // (live-bj/verktyg/lyft.py huvud), räknade från dockans eget håll mot kameran som lyft.py räknar dealerns. I en giv är de
  // som dealerns; i en väntan dealerns kring hans eget medel, eftersom dockans vila ser in i kameran (Jakob 2026-11-27:
  // blicken mot kameran, inte uppåt; dealern håller där huvudet 11° över kameran). I början går huvudet från ankarets
  // till dealerns, skillnaden tonad bort ovanpå hans egen rörelse (högst HUVUD_IN grader per ruta); i slutet, i en giv
  // först när kortet ligger, går huvudet från där dealerns är till ankarets (högst HUVUD_UT grader per ruta, och given är
  // så lång att det hinner). ÖGONEN I EN GIV ÄR DEALERNS (domaren 2026-11-27: inga egna blickmål; dealern ser aldrig på
  // skon eller platsen, han drar kortet utan att titta): hans blick mot hans huvud (lyftets ogon, högst ±10°, hårt
  // jämnad), lagd på dockans huvud och tonad till och från ankarets på samma rutor som huvudet. I en väntan blickens mål
  // per stycke (blickMal).
  const A = b.ank.huvudVinklar ?? [0, 0, 0], HV = giv ? L.huvudV : (() => { const m = medianV(L.huvudV); return L.huvudV.map(x => sub(x, m)); })();
  const Hj = (t: number) => HV[Math.min(t, n - 1)], E0 = Math.min(huvudTonLangd(length(sub(Hj(0), A)), HUVUD_IN), Math.floor((N - 1) / 2));
  const e0 = Math.max(E0, (huvudSlut ?? huvudetsSlut(HV, A, E0, N, false)).e0);
  const vinklar = Array.from({length: N}, (_, t) => t < e0 ? add(Hj(t), mul(sub(A, Hj(0)), 1 - jamnTon(t / E0))) : lerp(Hj(e0), A, jamnTon((t - e0) / (N - 1 - e0))));
  kvitto.huvudTon = [E0, N - 1 - e0];
  const eA: Vec3 = f0.hv ? vinkelSkillnad(sub(f0.g, f0.h), sub(f0.hv, f0.h)) : [0, 0, 0], Oj = (t: number) => L.ogon[Math.min(t, n - 1)];
  const ogonV = Array.from({length: N}, (_, t) => t < e0 ? add(Oj(t), mul(sub(eA, Oj(0)), 1 - jamnTon(t / E0))) : lerp(Oj(e0), eA, jamnTon((t - e0) / (N - 1 - e0))));
  const torsos = torsos0.map((x, t) => {
    const ande = t === 0 || t === N - 1, hv = ande ? f0.hv : huvudMot(x.h, vinklar[t]), ht = ande ? f0.ht : r1(vinklar[t][2]);
    if (!giv) return {...x, g: ande ? kamera : tavla[t], hv, ht};
    return {...x, g: ande ? f0.g : blickAv(x.h, hv!, ogonV[t]), hv, ht}; });
  // (armbågen där lyftets armbåge är i bilden där handen är lyftets, ankarets i vilan, emellan i bryggorna; vinkeln kring
  // linjen axel–handled vald ruta för ruta, utvecklad och jämnad: så byter armbågen aldrig sida på en ruta)
  const vrid: Record<Sida, number[]> = {R: [], L: []};
  for (const [s] of SIDOR) { const ra = hander[s].map((hand, t) => { const S = torsos[t].S, sh = S[s === 'R' ? 0 : 1]; return armbageVinkel(sh, hand, lerp(f0[s].e, L[s].e[Math.min(t, n - 1)], vikt[s][t]), doll, kant, {R: S[0], L: S[1], hip}); });
    for (let t = 1; t < N; t++) { let d = ra[t] - ra[t - 1]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; ra[t] = ra[t - 1] + d; }
    vrid[s] = lagpass(ra, 2.5); }
  const frames: Frame[] = [];
  for (let t = 0; t < N; t++) {
    const {S, h, g, hv, ht} = torsos[t], kort = C[t], limbs = {} as Record<Sida, Limb>;
    for (const [s, sign] of SIDOR) {
      if (t === 0 || t === N - 1) { limbs[s] = s === 'R' ? f0.R : f0.L; continue; }
      const sh = s === 'R' ? S[0] : S[1]; let hand = hander[s][t], e = armbageSvang(sh, hand.w, vrid[s][t], doll);
      // (en fri hand högst 48 grader från underarmen: vriden kring handleden mot underarmen, så att handleden står kvar; går den
      // då i filten eller kortet blir den som den var. En hand som håller kortet eller vilar i ankaret rörs inte)
      if (!haller[s][t] && kalla[s][t] !== 'v') for (let gang = 0; gang < 3; gang++) { const fore = unit(sub(hand.w, e)), fram = unit(sub(punkter(hand)[9], hand.w)), x = vinkel(fram, fore) - rad(48); if (x <= 0) break;
        const forra = hand; hand = vridHand(hand, hand.w, unit(cross(fram, fore)), x);
        if (overFilten(hand) < Math.min(0, overFilten(forra)) || (giv && t > (ti?.pull ?? 0) && iKortet(hand, kort, sign) > iKortet(forra, kort, sign))) { hand = forra; break; } e = armbageSvang(sh, hand.w, vrid[s][t], doll); }
      kvitto.handledMest[s] = Math.max(kvitto.handledMest[s], handled(e, hand));
      limbs[s] = {s: r4(sh), e: r4(e), w: r4(hand.w), k: 1, p: punkter(hand).map(r4)};
      if (length(sub(hand.w, sh)) > doll.upperArm + doll.forearm - 0.002) kvitto.nadde[s]++;
    }
    const j = Math.min(t, n - 1), ton = smooth(Math.min(t, N - 1 - t) / F);
    const a = t === 0 || t === N - 1 ? {} : Object.fromEntries(b.minen.bar.map(nm => [nm, Math.round(clamp01(b.minen.spar[nm][j] * ton) * 1000) / 1000]));
    const kortet = {c: r4(kort.c), l: r4(unit(kort.l)), n: r4(unit(kort.n)), id: 0};
    frames.push(t === 0 ? {...f0, card: {...f0.card}} : t === N - 1 ? {...f0, card: kortet} : {card: kortet, R: limbs.R, L: limbs.L, h: r4(h), g: r4(g), ...(hv ? {hv: r4(hv)} : {}), ...(ht ? {ht} : {}), a});
  }
  // (kortets långsida åt samma håll i alla rutor)
  for (let t = 1; t < N; t++) if (dot(frames[t].card.l, frames[t - 1].card.l) < 0) frames[t].card.l = frames[t].card.l.map(x => -x) as Vec3;
  // (hur långt handlederna står från lyftet längs synlinjen, där handen är lyftets: djupet som förankrades)
  kvitto.andpunktMm = Math.round(length(andpunkt.v) * 1000);
  for (const [s] of SIDOR) { const v = frames.flatMap((f, t) => t < n && (kalla[s][t] === 'l' || kalla[s][t] === 'k' || kalla[s][t] === 'a') ? [Math.abs(dot(sub(f[s].w, L[s].w[t]), syn(s, t)))] : []).sort((a, b) => a - b); if (v.length) kvitto.langsSynlinjen[s] = {median: Math.round(v[v.length >> 1] * 1000), mest: Math.round(v[v.length - 1] * 1000)}; }
  const handen = {R: kalla.R.join(''), L: kalla.L.join('')};
  return {frames, kropp: kropp.map(k => ({S: k.S, h: k.h})), L, tider: ti, plats, kvitto, faser, egen, bryggor, handen, vand: ti ? {fran: ti.vandFran, till: ti.plan} : null, vidSkonHem, hander: {R: {godkand: fri.R.godkand, saknas: fri.R.saknas}, L: {godkand: fri.L.godkand, saknas: fri.L.saknas}}};
}

/**
 * Rörelsen byggd och siktad: handens rättningar efter böjningen (djupet, lutningen, fingret som vilar) flyttar pekfingret
 * några millimeter, och kortet under det med. Så mycket som kortet då landar från målet flyttas högerns mål, och rörelsen
 * byggs om, tills kortet landar inom en millimeter (högst fyra varv). Kortet läggs aldrig till rätta: det är handen som
 * siktar.
 */
export function siktat(b: Bygg) {
  let ut = bygg(b);
  for (let varv = 0; varv < 4 && ut.kvitto.landning && ut.kvitto.landning.franMaletMm > 1; varv++) {
    const l = ut.kvitto.landning; b = {...b, sikte: add(b.sikte ?? [0, 0, 0], [l.malet.c[0] - l.lagt.c[0], 0, l.malet.c[2] - l.lagt.c[2]])}; ut = bygg(b); }
  return ut;
}

// ---- körningen -----------------------------------------------------------------------------------------------------------
// (--lyft och --ut byter mappen lyften läses ur och mappen rörelserna skrivs till, för att pröva en ändring utan att röra dealer3d/data/)
let lyftDir = LYFT, utDir = DATA;
const LYFTEN = (): string[] => readdirSync(lyftDir).filter(f => f.endsWith('.json')).sort();
const VANTAN_FOR: Record<string, string> = {kameran: 'kameran-vantan-1.json', bordet: 'bordet-vantan-1.json'};
const las = <X>(fil: string): X => JSON.parse(readFileSync(fil, 'utf8')) as X;
const skriv = (fil: string, data: unknown) => writeFileSync(fil, JSON.stringify(data) + '\n');
const rel = (fil: string) => path.relative(CASINO, fil).split(path.sep).join('/');

/** Stilens giv till mitten (plats 4): ankaret vid skon tas ur den. */
const MITTEN: Record<string, string> = {kameran: 'kameran-mitten-plats-4.json', bordet: 'bordet-mitten-plats-4.json'};
const stilFor = (lyft: Lyft) => las<Stil>(path.join(CASINO, `live-bj/data/stil-${lyft.style}.json`));
/**
 * Ankaret vid skon (A2.3, rörelseschemats "Redo vid skon": vänstern vid skons mynning, högern redo) för dockan, ur filmen:
 * stilens giv till mitten lagd med vilan som ankare, i en ruta när vänsterhanden är vid skon. Kroppen, vänsterhanden,
 * huvudet och blicken är dealerns egna i den rutan (framåtlutad, huvudet böjt mot bordet, ögonen där han ser; han ser inte
 * på skon), högerhanden där givens är när den först är filmens. Givarna börjar och slutar här, och rörelserna till-skon och
 * hem går mellan det och vilan.
 */
export function ankaretVidSkon(doll: Doll, stil: 'kameran' | 'bordet', a1: Ankare): Ankare {
  const lyftFil = path.join(lyftDir, MITTEN[stil]), fr = dollFrame(doll), zA = fr.shoulders[0][2], lyft = franSkon(las<Lyft>(lyftFil), zA), stilFil = stilFor(lyft);
  // (rutan: vänstern vid skon och båda händerna i lyftet, så att kroppen är dealerns hållning och inte vilans)
  const ut0 = bygg({doll, stil, stilFil, lyft, ank: a1, minen: minen(last(lyft, zA), stilFil), dir: lyftDir}), ut = ut0, B0 = ut0.bryggor, ti0 = ut0.tider!;
  const t = Math.min(ti0.pull, Math.max(ti0.arrive, B0.R.t1, B0.L.t1, 10)), f = ut.frames[t], S = ut.kropp[t].S, h = ut.kropp[t].h, kant = kantFor(doll), bal0 = {R: S[0], L: S[1], hip: fr.hip};
  const hand = (p: Vec3[], sign: number, w: Vec3): Hand => ({a: axesOf(p, sign), w, S: local(p, axesOf(p, sign))});
  // (högern redo framför dealern: där givens högerhand är när den först är filmens, och väntar på kortet)
  const fR = ut.frames[ut.bryggor.R.t1].R, hR = hand(fR.p, 1, fR.w), hL = hand(f.L.p, -1, f.L.w);
  const eR = armbageSvang(S[0], hR.w, armbageVinkel(S[0], hR, fR.e, doll, kant, bal0), doll), eL = armbageSvang(S[1], hL.w, armbageVinkel(S[1], hL, f.L.e, doll, kant, bal0), doll);
  // (huvudets hållning och blicken: dealerns egna i samma ruta, när vänstern är vid skon (domaren 2026-11-27: ankaret ett
  // ögonblick ur dealerns egen giv, inte uppe i kameran): huvudets vinklar (lyftets huvud) och ögonen mot huvudet (ogon))
  const V = ut.L.huvudV[t].map(r1) as Vec3, O = ut.L.ogon[t], k = kortISkon(), hvA = huvudMot(h, V);
  const frame: Frame = {card: {c: r4(k.c), l: r4(k.l), n: r4(k.n), id: 0}, R: {s: r4(S[0]), e: r4(eR), w: r4(hR.w), k: 1, p: punkter(hR).map(r4)}, L: {s: r4(S[1]), e: r4(eL), w: r4(hL.w), k: 1, p: punkter(hL).map(r4)},
    h: r4(h), g: r4(blickAv(h, hvA, O)), hv: r4(hvA), ...(V[2] ? {ht: V[2]} : {}), a: {}};
  // (lyftets axlar där ankaret är taget, så att en giv lägger dealerns hållning på samma sätt som från vilan)
  const axelRef = add(stilensMedel(stil, zA, fr.head[2], lyftDir).mitt, sub(mitt(S[0], S[1]), mitt(a1.frame.R.s, a1.frame.L.s)));
  const about = `Redo vid skon (A2.3) för dockan ${doll.name} (stilen ${stil}): ankaret som dockans givar börjar och slutar i. Kroppen och vänsterhanden där dealerns giv till mitten (${rel(lyftFil)}) har dem i rutan ${t}, när vänsterhanden är vid skon och båda händerna är dealerns: framåtlutad, huvudet lätt böjt, vänstern vid skons mynning. Högerhanden i vilan (ankare-vila-${doll.name}.json). Huvudet och blicken är dealerns egna i samma ruta: huvudet nick ${V[0]}°, vridning ${V[1]}°, tippning ${V[2]}° från kameran (huvudVinklar), ögonen ${r1(O[0])}° i höjd och ${r1(O[1])}° i sidled från huvudets håll. Kortet i skons front.`;
  return {namn: 'A2.3', about, doll: doll.name, style: stil, hip: a1.hip, frame, axelRef: r4(axelRef), huvudVinklar: V};
}
/** Ankarena för dockan `dockNamn` (eller dockan `annan` i hennes ställe, för den som prövar ett annat mått): vilan, och (lat) ankaret vid skon. */
const ANKARE = new Map<string, {a1: Ankare; a23?: Ankare}>();
export function ankaretFor(dockNamn: string, annan?: Doll) {
  const doll = annan ?? LIVE_DOLLS[dockNamn]; if (!doll) throw Error(`Ingen docka vid livebordet heter ${dockNamn}.`);
  const stil = (Object.entries(LIVE.dealer.styles).find(([, d]) => d.name === dockNamn)?.[0] ?? PERSONDOCKOR[dockNamn]?.stil) as 'kameran' | 'bordet', vantanFil = path.join(lyftDir, VANTAN_FOR[stil]), nyckel = `${dockNamn}${annan ? '-annan' : ''}`;
  if (!ANKARE.has(nyckel)) ANKARE.set(nyckel, {a1: ankaret(doll, stil, las<Lyft>(vantanFil), VANTAN_FOR[stil].replace('.json', ''), lyftDir)});
  const a = ANKARE.get(nyckel)!, vidSkon = () => a.a23 ??= ankaretVidSkon(doll, stil, a.a1);
  return {doll, stil, ank: a.a1, vidSkon, vantanFil};
}
/** Lyftet `lyftFil` på dockan (som körningen nedan gör, utan att skriva något): en giv från ankaret vid skon, en väntan från vilan; `annan` prövar en annan docka i hennes ställe. */
export function pa(lyftFil: string, dockNamn?: string, annan?: Doll) {
  const lyft = las<Lyft>(lyftFil), namn = dockNamn ?? lyft.docka, {doll, stil, ank: a1, vidSkon} = ankaretFor(namn, annan), stilFil = stilFor(lyft), L = last(lyft, dollFrame(doll).shoulders[0][2]);
  return siktat({doll, stil, stilFil, lyft, ank: lyft.leavesShoe !== undefined ? vidSkon() : a1, minen: minen(L, stilFil), dir: lyftDir});
}
function kor(lyftFil: string, dockNamn?: string) {
  const lyft0 = las<Lyft>(lyftFil), namn = dockNamn ?? lyft0.docka, {doll, stil, ank: a1, vidSkon, vantanFil} = ankaretFor(namn), lyft = franSkon(lyft0, dollFrame(doll).shoulders[0][2]), ank = lyft.leavesShoe !== undefined ? vidSkon() : a1;
  if (lyft.style !== stil) console.log(`  (lyftet är stilen ${lyft.style}, dockan ${namn} stilen ${stil})`);
  const stilFil = las<Stil>(path.join(CASINO, `live-bj/data/stil-${lyft.style}.json`)), L = last(lyft, dollFrame(doll).shoulders[0][2]);
  const ut0 = siktat({doll, stil, stilFil, lyft, ank, minen: minen(L, stilFil), dir: lyftDir});
  const giv = lyft.leavesShoe !== undefined, nr = giv ? /seat (\d)/.exec(lyft.to!)![1] : /vantan-(\d)/.exec(lyftFil)![1];
  const fil = path.join(utDir, giv ? `lyft-${namn}-p${nr}.json` : `lyft-${namn}-vantan-${nr}.json`), ankFil = path.join(utDir, ank.namn === "A2.3" ? `ankare-skon-${namn}.json` : `ankare-vila-${namn}.json`);
  const ti = ut0.tider, k = ut0.kvitto, N = ut0.frames.length, B = ut0.bryggor;
  const kontakter = Object.entries(k.kontakt).map(([vad, x]) => `${vad} ${x.langsMm} mm längs synlinjen och ${x.tvarsMm} tvärs${x.behovdesMm > x.tvarsMm + 1 ? ` (tvärs behövdes ${x.behovdesMm} mm, ${x.px} bildpunkter: ett fynd om lyftet eller bordet)` : ''}`).join(', ');
  const about = giv
    ? `Dockan ${namn} ger ett kort till ${ut0.plats}, lyftat ur livebordets film (${rel(lyftFil)}, filmens sekunder ${lyft.film_seconds.join('–')}) och lagt på dockans egen kropp av dealer3d/tools/lyft-till-docka.ts. Händerna är lyftets ruta för ruta (handlederna, vinkeln och fingrarna, jämnade lugnt i stillhet och lätt i rörelse) från ruta ${Math.min(B.L.t1, B.R.t1)} till ${Math.max(B.L.t2, B.R.t2)}; dessförinnan och därefter en mjuk brygga till och från ankaret vid skon (A2.3, ${rel(ankFil)}), där made.faser säger vilka rutor. Tiden är dealerns (vänsterhanden vid skon i ruta ${ti!.arrive}, draget ${ti!.pull}–${ti!.leaves}, bytet i ruta ${ti!.meet} där lyftets händer är som närmast, kortet vänt kring sin långsida under högerns pekfinger i ruta ${ti!.vandFran}–${ti!.plan} med framsidan uppe i ruta ${ti!.framsidan}, kortet ligger i ruta ${ti!.ligger} där lyftets högra handled stannar, och pekfingret vilar på det till ruta ${ti!.vila}). Kortet följer händerna: plant under vänsterns fingertoppar ur skon, mellan händernas grepp i bytet, sedan under högerns pekfingertopp: ryggen upp, vänt på kant till framsidan upp, och skjutet plant på filten av fingret, och det ligger där handen lägger det, i den vinkel det kom: ${k.landning ? `${k.landning.mal === 'lyftet' ? 'där den riktiga dealerns kort låg i filmen' : `på ${ut0.plats}`} inom ${k.landning.franMaletMm} mm och ${k.landning.vinkelMotMalet}°, ${k.landning.franPlatsenMm} mm och ${k.landning.vinkelMotPlatsen}° från kortplatsen ${ut0.plats} (handens mål flyttat ${k.landning.sikteMm} mm för att träffa)` : ''}. Djupet (längs synlinjen från livebordets kamera, det ett lyft ur en kamera inte vet) är förankrat där händerna rör kortet och följer lyftet däremellan; i filmens bild står händerna kvar. Kontakterna: ${kontakter}; handlederna flyttade längs synlinjen median ${k.langsSynlinjen.R.median}/${k.langsSynlinjen.L.median} mm, högst ${k.langsSynlinjen.R.mest}/${k.langsSynlinjen.L.mest} mm (höger/vänster); händerna ur filten flyttade längs synlinjen högst ${k.urFiltenLangs.R}/${k.urFiltenLangs.L} mm och höjda högst ${k.ur.R}/${k.ur.L} mm och ur kortet flyttade högst ${k.kortetUr.R}/${k.kortetUr.L} mm. Bålen lutar där armen inte når (högst ${k.lutGrader.toFixed(1)} grader).${ut0.vidSkonHem ? ' Lyftets vänsterhand är vid skon efter nästa kort när högern går hem: vänsterns väg hem är en brygga, märkt i made.faser, som kan bytas mot vänstern vid skon.' : ''}`
    : `Dockan ${namn} väntar, lyftat ur livebordets film (${rel(lyftFil)}, filmens sekunder ${lyft.film_seconds.join('–')}; där har dealern vänsterhanden vid "${lyft.left_at}" och högerhanden vid "${lyft.right_at}"). Dockan är i sin vila (${rel(ankFil)}), vars handleder är väntans, med lyftets små rörelser av handlederna och axlarna (jämnade lugnt), och huvudet, blicken och minen som dealerns. Börjar och slutar i vilan.`;
  // (ankaret i början och slutet, med rörelseschemats namn (standarddocka/rorelsekatalog.json): en giv redo vid skon, A2.3; en väntan vilan, A1)
  const motion = {fps: FPS, frameCount: N, ankare: {borjan: ank.namn, slut: ank.namn}, ...(giv ? {leavesShoe: ti!.leaves, edge: [ut0.vand!.fran, ut0.vand!.till], folds: ut0.vand!.till, rests: ti!.ligger} : {}), hip: ank.hip, doll: namn, ...(giv ? {to: [ut0.plats], marke: {hander: 'tva', vands: 'pa-vagen', satts: 'plant'}} : {}), about,
    made: {tool: 'dealer3d/tools/lyft-till-docka.ts', lift: rel(lyftFil), liftFrom: lyft.fran, doll: namn, from: rel(ankFil), to: rel(ankFil), sources: {[rel(lyftFil)]: sha(lyftFil), [rel(vantanFil)]: sha(vantanFil), 'blackjack-dealer/src/table-live.ts': sha(path.join(ROOT, 'src/table-live.ts'))},
      times: ti, liftFrames: 'rörelsens ruta t är lyftets ruta t (efter lyftets sista ruta: dess sista)', faser: ut0.faser, egen: ut0.egen, hand: ut0.handen,
      filter: `handlederna, händernas vinkel, axlarna och huvudet: Butterworth 2:a ordningen framåt och bakåt (nollfas), ${LUGN.lag} Hz där handen är stilla och ${LUGN.hog} Hz där den rör sig (lugna)`, hands: ut0.hander, chosen: k},
    frames: ut0.frames};
  skriv(fil, motion);
  skriv(ankFil, {namn: ank.namn, about: ank.about, doll: namn, style: stil, hip: ank.hip, frame: ank.frame, ...(ank.axelRef ? {axelRef: ank.axelRef, huvudVinklar: ank.huvudVinklar} : {}), made: {tool: 'dealer3d/tools/lyft-till-docka.ts', ...(ank.namn === 'A2.3' ? {give: rel(path.join(lyftDir, MITTEN[stil]))} : {waiting: rel(vantanFil)}), sources: {[rel(vantanFil)]: sha(vantanFil), 'blackjack-dealer/src/table-live.ts': sha(path.join(ROOT, 'src/table-live.ts'))}}});
  // HANDBYTET SOM ANKARE (A2M; Jakob 2026-11-27: "Försökte vi att skapa som en universell överlämning med detta parti när
  // händerna möts?"): stilens giv till mitten delad i rutan där kortet byter hand (tiderna meet), utan att något i den
  // ändras. Ankaret är givens ruta där: kortet på kant mellan händerna, vänstern i dess ena ände och högerns pekfinger på dess
  // övre kant, kroppen, huvudet och blicken som dealerns i samma ruta. Skon till bytet (lyft-<docka>-till-bytet, A2.3 till
  // A2M) är givens rutor fram till bytet och är samma vart kortet än ska; bytet till platsen och hem (lyft-<docka>-bytet-p<n>,
  // A2M till A2.3) är resten. Spelade efter varandra med skarvrutan en gång (standarddocka/editor/rorelse.ts sekvens) är de
  // given ruta för ruta, i samma takt; hela given står kvar som den är.
  if (giv && path.basename(lyftFil) === MITTEN[stil]) {
    const m = ti!.meet, bytFil = path.join(utDir, `ankare-byte-${namn}.json`), forsta = path.join(utDir, `lyft-${namn}-till-bytet.json`), andra = path.join(utDir, `lyft-${namn}-bytet-p${nr}.json`);
    const del = (a: number, b: number) => ({faser: Object.fromEntries((['R', 'L'] as Sida[]).map(s => [s, ut0.faser[s].filter(x => x.till > a && x.fran < b).map(x => ({...x, fran: Math.max(x.fran, a) - a, till: Math.min(x.till, b) - a}))])),
      egen: Object.fromEntries((['R', 'L'] as Sida[]).map(s => { const e = ut0.egen[s]; return [s, e && e[1] > a && e[0] < b ? [Math.max(e[0], a) - a, Math.min(e[1], b) - a] : null]; })),
      hand: {R: ut0.handen.R.slice(a, b + 1), L: ut0.handen.L.slice(a, b + 1)}, frames: ut0.frames.slice(a, b + 1)});
    const f1 = del(0, m), f2 = del(m, N - 1), made = (a: number, b: number, fran: string, till: string) => ({tool: 'dealer3d/tools/lyft-till-docka.ts', lift: rel(lyftFil), liftFrom: lyft.fran + a, doll: namn, from: fran, to: till, sources: motion.made.sources,
      del: {av: rel(fil), rutor: [a, b]}, times: null, liftFrames: motion.made.liftFrames, filter: motion.made.filter, hands: ut0.hander});
    const om = `Givens ruta ${m}, där kortet byter hand`;
    skriv(bytFil, {namn: 'A2M', about: `Handbytet (A2M) för dockan ${namn} (stilen ${stil}): ankaret där skon till bytet slutar och bytet till platsen börjar. ${om} i ${rel(fil)}: kortet på kant mellan händerna, vänstern i dess ena ände och högerns pekfinger på dess övre kant, tummen mot kortets sida; kroppen, huvudet och blicken som dealerns i samma ruta. Samma ställning vart kortet än ska.`,
      doll: namn, style: stil, hip: ank.hip, frame: ut0.frames[m], made: {tool: 'dealer3d/tools/lyft-till-docka.ts', give: rel(fil), frame: m, sources: motion.made.sources}});
    skriv(forsta, {fps: FPS, frameCount: m + 1, ankare: {borjan: 'A2.3', slut: 'A2M'}, leavesShoe: ti!.leaves, hip: ank.hip, doll: namn,
      about: `Dockan ${namn} drar ett kort ur skon och för det till handbytet: från ankaret vid skon (A2.3, ${rel(ankFil)}) till handbytet (A2M, ${rel(bytFil)}). Givens rutor 0–${m} (${rel(fil)}), oförändrade: samma för alla platser. Nästa klipp är bytet till platsen (${rel(andra)} för ${ut0.plats}).`,
      made: {...made(0, m, rel(ankFil), rel(bytFil)), faser: f1.faser, egen: f1.egen, hand: f1.hand}, frames: f1.frames});
    skriv(andra, {fps: FPS, frameCount: N - m, ankare: {borjan: 'A2M', slut: 'A2.3'}, leavesShoe: 0, edge: [ut0.vand!.fran - m, ut0.vand!.till - m], folds: ut0.vand!.till - m, rests: ti!.ligger - m, hip: ank.hip, doll: namn, to: [ut0.plats], marke: {hander: 'tva', vands: 'pa-vagen', satts: 'plant'},
      about: `Dockan ${namn} tar kortet i handbytet och lägger det på ${ut0.plats}, och högern går hem till skon: från handbytet (A2M, ${rel(bytFil)}) till ankaret vid skon (A2.3, ${rel(ankFil)}). Givens rutor ${m}–${N - 1} (${rel(fil)}), oförändrade; skon till bytet (${rel(forsta)}) går före.`,
      made: {...made(m, N - 1, rel(bytFil), rel(ankFil)), faser: f2.faser, egen: f2.egen, hand: f2.hand, chosen: {landning: k.landning, andpunktMm: k.andpunktMm}}, frames: f2.frames});
    console.log(`${path.basename(bytFil)}: givens ruta ${m}; ${path.basename(forsta)}: ${m + 1} rutor; ${path.basename(andra)}: ${N - m} rutor`);
  }
  console.log(`${path.basename(fil)}: ${N} rutor (lyftet ${lyft.frames.length})${giv ? `, ${ut0.plats}, skon ${ti!.arrive}/${ti!.pull}/${ti!.leaves}, bytet ${ti!.meet} (${Math.round(ti!.avstandVidBytet * 1000)} mm), vänt ${ut0.vand?.fran}–${ut0.vand?.till} (framsidan ${ti!.framsidan}), ligger ${ti!.ligger}, fingret av ${ti!.vila}; bryggor V ${B.L.t0}–${B.L.t1}, ${B.L.t2}–${B.L.t3}, H ${B.R.t0}–${B.R.t1}, ${B.R.t2}–${B.R.t3}; ${kontakter}` : ''}; ur filten ${k.ur.R}/${k.ur.L} mm, ur kortet ${k.kortetUr.R}/${k.kortetUr.L} mm, bålen högst ${k.lutGrader.toFixed(1)}°, handleden högst ${k.handledMest.R.toFixed(0)}/${k.handledMest.L.toFixed(0)}°, når inte ${k.nadde.R}/${k.nadde.L}; lyftets händer godkända ${Math.round(ut0.hander.R.godkand * 100)}/${Math.round(ut0.hander.L.godkand * 100)} %`);
}

/**
 * Vägen mellan vilan (A1) och ankaret vid skon (A2.3), åt något håll: VÅRT EGET, en mjuk rörelse mellan ankarena (filmen har
 * inget lyft av den). Till skon: blicken och huvudet går ned mot skon först, kroppen lutar sig fram och vänstern går till
 * skon. Hem: vänstern går hem från skon, och först när händerna är hemma reser sig kroppen och huvudet mot kameran, på
 * KROPP_HEM rutor (domaren 2026-11-27: minst en halv sekund, och först när händerna är hemma). Händerna går i bryggans
 * mjuka väg, i stilens fart; armbågarna som i en giv.
 */
export function overgang(doll: Doll, fran: Ankare, till: Ankare, hem: boolean) {
  const A = fran.frame, B = till.frame, kant = kantFor(doll), fr = dollFrame(doll);
  const hand = (l: Limb, sign: number): Hand => ({a: axesOf(l.p, sign), w: l.w, S: local(l.p, axesOf(l.p, sign))});
  const T = Math.max(...SIDOR.map(([s]) => bryggTid(length(sub(B[s].w, A[s].w)), 1.0))), start = hem ? 0 : 6, kropp0 = hem ? T + 2 : 0, KT = hem ? KROPP_HEM : Math.max(KROPP_HEM, T + start);
  const N = Math.max(start + T, kropp0 + KT) + 2, frames: Frame[] = [], hv = (f: Frame) => f.hv ?? f.g;
  for (let t = 0; t < N; t++) {
    if (t === 0 || t === N - 1) { frames.push(t === 0 ? A : B); continue; }
    const mb = mjuk(clamp01((t - kropp0) / KT)), S: [Vec3, Vec3] = [lerp(A.R.s, B.R.s, mb), lerp(A.L.s, B.L.s, mb)], h = lerp(A.h, B.h, mb);
    const mg = mjuk(clamp01((t - (hem ? kropp0 : 0)) / (hem ? KT : 18))), g = lerp(A.g, B.g, mg), hvt = lerp(hv(A), hv(B), mb);
    const limbs = {} as Record<Sida, Limb>;
    for (const [s, sign] of SIDOR) { const hA = hand(A[s], sign), hB = hand(B[s], sign), u = clamp01((t - start) / T), m = mjuk(u);
      const h1: Hand = {a: between(hA.a, hB.a, m), w: brygga(hA.w, [0, 0, 0], hB.w, [0, 0, 0], T, t - start), S: formMellan(hA.S, hB.S, m)}, sh = s === 'R' ? S[0] : S[1];
      const e = armbageSvang(sh, h1.w, armbageVinkel(sh, h1, lerp(A[s].e, B[s].e, m), doll, kant, {R: S[0], L: S[1], hip: fr.hip}), doll);
      limbs[s] = {s: r4(sh), e: r4(e), w: r4(h1.w), k: 1, p: punkter(h1).map(r4)}; }
    const ht = r1((A.ht ?? 0) + ((B.ht ?? 0) - (A.ht ?? 0)) * mb);
    frames.push({card: {...A.card}, R: limbs.R, L: limbs.L, h: r4(h), g: r4(g), hv: r4(hvt), ...(ht ? {ht} : {}), a: {}});
  }
  return {frames, T, kropp0, KT};
}
function korOvergangar(namn: string) {
  const {doll, ank: a1, vidSkon, vantanFil} = ankaretFor(namn), a23 = vidSkon();
  for (const [fil, fran, till, hem] of [[`lyft-${namn}-till-skon.json`, a1, a23, false], [`lyft-${namn}-hem.json`, a23, a1, true]] as [string, Ankare, Ankare, boolean][]) {
    const ut0 = overgang(doll, fran, till, hem), N = ut0.frames.length, filA = (a: Ankare) => rel(path.join(utDir, a.namn === 'A2.3' ? `ankare-skon-${namn}.json` : `ankare-vila-${namn}.json`));
    const about = hem ? `Dockan ${namn} går från ankaret vid skon (A2.3) hem till vilan (A1): vänstern från skon till vilan på ${ut0.T} rutor, och sedan, när händerna är hemma, reser sig kroppen och huvudet och blicken går till kameran på ${ut0.KT} rutor. Vårt eget: en mjuk rörelse mellan ankarena, inget lyft ur filmen.`
      : `Dockan ${namn} går ur vilan (A1) till ankaret vid skon (A2.3): blicken och huvudet går ned mot skon, kroppen lutar sig fram och vänstern går till skon på ${ut0.T} rutor. Vårt eget: en mjuk rörelse mellan ankarena, inget lyft ur filmen.`;
    skriv(path.join(utDir, fil), {fps: FPS, frameCount: N, ankare: {borjan: fran.namn, slut: till.namn}, hip: a1.hip, doll: namn, about,
      made: {tool: 'dealer3d/tools/lyft-till-docka.ts', lift: rel(vantanFil), doll: namn, from: filA(fran), to: filA(till), hand: {R: 'b'.repeat(N), L: 'b'.repeat(N)}, times: null, egen: 'hela rörelsen är vår egen (made.lift är bara stilens väntan, som rycken mäts mot)'}, frames: ut0.frames});
    console.log(`${fil}: ${N} rutor (${fran.namn} till ${till.namn}), händerna på ${ut0.T} rutor, kroppen ${ut0.kropp0}–${ut0.kropp0 + ut0.KT}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), val = (namn: string) => { const i = args.indexOf(namn); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
  const l = val('--lyft'), u = val('--ut'); if (l) lyftDir = path.resolve(l); if (u) { utDir = path.resolve(u); mkdirSync(utDir, {recursive: true}); }
  if (args.includes('--alla')) { for (const f of LYFTEN()) kor(path.join(lyftDir, f)); for (const namn of new Set(LYFTEN().map(f => las<Lyft>(path.join(lyftDir, f)).docka))) korOvergangar(namn);
    // en persons docka (src/persondockor.ts) spelar lyften i sin stil: Danilos för kameran, Frasses för bordet
    for (const [namn, p] of Object.entries(PERSONDOCKOR)) { for (const f of LYFTEN()) if (las<Lyft>(path.join(lyftDir, f)).style === p.stil) kor(path.join(lyftDir, f), namn); korOvergangar(namn); } }
  else if (args[0] === '--docka') { const namn = args[1], p = PERSONDOCKOR[namn]; if (!p) throw Error(`--docka tar en persons docka (src/persondockor.ts): ${Object.keys(PERSONDOCKOR).join(', ') || 'ingen finns'}.`);
    for (const f of LYFTEN()) if (las<Lyft>(path.join(lyftDir, f)).style === p.stil) kor(path.join(lyftDir, f), namn); korOvergangar(namn); }
  else { const [fil, docka] = args; if (!fil) throw Error('Användning: node dealer3d/tools/lyft-till-docka.ts <lyftet.json> <docka> | --alla [--lyft <mapp>] [--ut <mapp>]'); kor(path.resolve(fil), docka); }
}
