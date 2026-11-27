// Ett lyft ur livebordets film (live-bj/data/lyft/) lagt på en docka vid livebordet (Danilo eller Frasse, dealer3d/src/doll.ts
// LIVE_DOLLS) som en rörelse dockan kan spela, i dockans eget format (som dealer3d/data/giv-fran-2-3-p4c1-ren-a-man.json,
// med minen i fältet a) och i livebordets linsvärld (src/table-live.ts):
//   dealer3d/data/lyft-<docka>-p<plats>.json      en giv: kortet ur skon, handbytet, kortet på platsen, händerna hem
//   dealer3d/data/lyft-<docka>-vantan-<n>.json    en väntan: händerna i vilan, huvudet, blicken och minen lever
//   dealer3d/data/ankare-vila-<docka>.json        vilan som dockans alla rörelser börjar och slutar exakt i
//
//   node dealer3d/tools/lyft-till-docka.ts <lyftet.json> <docka>      (från blackjack-dealer/)
//   node dealer3d/tools/lyft-till-docka.ts --alla                     alla lyften i live-bj/data/lyft/, var och en på sin docka
//        [--lyft <mapp>] [--ut <mapp>]                                lyften ur en annan mapp, rörelserna till en annan (för att pröva)
//
// DET RÅA LYFTET ÄR SANNINGEN OM VAR HÄNDERNA ÄR (Jakob 2026-11-27, om vänsterhanden i bytet: "en kvarleva från gamla dockan
// eller förra standarddockans rörelsemönster"). Inget här kommer ur standarddockans koreografi (koreo-giv.ts): ingen
// resning på högkant, inget nyp, ingen rullning, inga egna nyckellägen. Den riktiga dealerns, ruta för ruta: handledernas
// väg (lyftets, jämnad lugnt där handen är stilla och lätt där den rör sig, se lugna), händernas vinkel (lyftets, med de
// rutor där MediaPipe vänder handen bort och jämnad likadant), fingrarnas form (lyftets riktningar på dockans ben, inom
// hand-rule.ts LIMITS), axlarnas och huvudets rörelse, blicken, minen och TIDEN (när vänsterhanden är vid skon, när kortet
// lämnar skon, bytet, när högerhanden vrids, när kortet ligger). Kortet följer händerna: i skon tills vänstern drar ut det,
// plant under vänsterns fingertoppar, i bytet mellan de två händernas grepp (lyftets, som de är), i högerns grepp till
// platsen, och vänt kring sin långsida under de rutor där lyftets högerhand vrids (klart senast där filmen först visar
// framsidan, live-bj/data/givar.json turnWindow). Var i handen kortet ligger glider mjukt mellan de tre lägena.
// VÅRT EGET, och märkt: dockans ben och mått (doll.ts); ankaret (vilan, dealer3d/data/ankare-vila-<docka>.json: handlederna
// där väntans lyft har dem, handen lagd på filten); bryggorna mellan ankaret och lyftet i början och slutet (en mjuk rörelse
// i stilens fart, rörelsens made.faser säger var); rättningar vid en kontakt, högst KONTAKT (2 cm) och bara i de rutorna
// (fingertopparna mot kortet i skon, mot kortet på filten, högerns grepp mot kortet i bytet, händerna och kortet ur filten);
// bålens lutning där armen inte når (ren-giv.ts rackvidd och bal); armbågen (body.ts arm, mot lyftets sida om linjen
// axel–handled, vriden så att handen står nära underarmens linje och underarmen går över bordets kant); kortets slutläge
// på platsen (LIVE.cards). Det rättningarna inte når står i made.chosen och i lyft-kolla.ts, som fynd om lyftet eller bordet.
// Kontrollen är dealer3d/tools/lyft-kolla.ts.
import {mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CARD, add, cross, dot, length, mul, sub, unit, type Vec3} from '../src/camera.ts';
import {TABLE_LENS} from '../../src/table-lens.ts';
import {LIVE, LIVE_CAMERA, liveSee, liveShoeCard} from '../../src/table-live.ts';
import {arm, turned} from '../src/body.ts';
import {LIVE_DOLLS, dollFrame, type Doll} from '../src/doll.ts';
import {axesOf, between, local, placed, type Axes} from '../src/hand-pose.ts';
import {FINGERS} from '../src/capture.ts';
import {LIMITS, bendsOf, fingerFrom, handFaults} from '../src/hand-rule.ts';
import {REN, bal, formMellan, mjuk, rackvidd, smooth, underarmLuft, type Kant} from '../src/ren-giv.ts';
import {BALL} from '../src/landing.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url)), CASINO = path.join(ROOT, '..');
export const DATA = path.join(ROOT, 'dealer3d/data'), LYFT = path.join(CASINO, 'live-bj/data/lyft');

// ---- typerna --------------------------------------------------------------------------------------------------------
export type Kort = {c: Vec3; l: Vec3; n: Vec3};
type Hand = {a: Axes; w: Vec3; S: Vec3[]};
export type Limb = {s: Vec3; e: Vec3; w: Vec3; k: number; p: Vec3[]};
export type Frame = {card: Kort & {id: number}; R: Limb; L: Limb; h: Vec3; g: Vec3; a: Record<string, number>};
type LyftLimb = {s: Vec3; e: Vec3; w: Vec3; p: Vec3[] | null};
export type LyftRuta = {t: number; blick?: string; R: LyftLimb; L: LyftLimb; h: Vec3 | null; g: Vec3 | null; a: Record<string, number> | null; card?: {c: Vec3 | null; l: Vec3 | null; n: Vec3 | null; seen: boolean} | null};
export type Lyft = {style: 'kameran' | 'bordet'; docka: string; to?: string; kind?: string; left_at?: string; right_at?: string; film_seconds: number[]; fps: number; frameCount: number; leavesShoe?: number; rests?: number; hands?: string; frames: LyftRuta[]};
type Stil = {face: {shapes: Record<string, {verdict: string; usual: number}>}; speed: Record<string, {top_m_s?: {best?: {median: number}}}>};
type Sida = 'R' | 'L';
/** Vad en hand gör i en ruta, i rörelsens made.hand: v vilan (ankaret), b en brygga mellan ankaret och lyftet, l lyftet, k lyftet med en kontakträttning. */
export type Kalla = 'v' | 'b' | 'l' | 'k';
export type Fas = {fran: number; till: number; vad: string; kalla: 'ankaret' | 'brygga' | 'lyftet'};

// ---- småsaker -------------------------------------------------------------------------------------------------------
const FPS = 30, UP: Vec3 = [0, 1, 0], HK = CARD.height, WK = CARD.width, T = CARD.thickness;
/** Det största en kontakt får flytta en hand från lyftet (meter): behövs mer är det ett fynd om lyftet eller bordet. */
export const KONTAKT = 0.02;
const SIDOR: [Sida, number][] = [['R', 1], ['L', -1]];
const r4 = (v: Vec3): Vec3 => v.map(x => Math.round(x * 10000) / 10000) as Vec3;
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, mul(sub(b, a), t));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const rad = (d: number) => d * Math.PI / 180, grad = (r: number) => r * 180 / Math.PI;
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
/** Greppet: mitt emellan tummens och pekfingrets toppar (som lyftets kort när det inte syns). */
const greppet = (h: Hand) => { const p = punkter(h); return mitt(p[4], p[8]); };

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
  const Qj = Array.from({length: 21}, (_, k) => jamna(Q.map(q => q[k]), 6)), q = Q.map((_, t) => Qj.map(v => v[t]));
  const S0 = q.map(x => { const S = paDockan(x, bas); return iVarandra(S, sign) ? null : S; });
  const godkand = S0.filter(Boolean).length / S0.length;
  const S1 = S0.some(Boolean) ? fyll(S0, (a, b, t) => formMellan(a, b, t)) : S0.map(() => bas);
  // (jämnat en gång till efter fyllningen, 3 Hz, och åter på dockans ben inom lederna)
  const S1j = Array.from({length: 21}, (_, k) => jamna(S1.map(s => s[k]), 3)), S = S1.map((_, t) => paDockan(S1j.map(v => v[t]), bas));
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
  const h = lugna(fyll(f.map(x => x.h), lerp)), riktning = lugna(fyll(f.map(x => x.h && x.g ? unit(sub(x.g, x.h)) : null), lerp)).map(unit), avst = fyll(f.map(x => x.h && x.g ? Math.max(0.3, Math.min(2.5, length(sub(x.g, x.h)))) : null), (a, b, t) => a + (b - a) * t);
  const a = fyll(f.map(x => x.a), (x, y, t) => Object.fromEntries(Object.keys(x).map(k => [k, x[k] + ((y[k] ?? x[k]) - x[k]) * t])));
  // (där lyftet säger att dealern ser in i kameran, fältet blick, ser dockan rakt in i livebordets kamera: Jakobs dom 2026-11-27)
  const kam = lagpass(f.map(x => x.blick === 'kameran' ? 1 : 0), 3).map(clamp01);
  return {n, R: sida('R'), L: sida('L'), h, riktning, avst, a, kam, zAxlar};
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
/**
 * Ankaret: dockans vila vid livebordet. Axlarna där doll.ts har dem (LIVE.dealer), handlederna där väntans lyft har dem
 * (medianen), handen lagd som i väntan (lyftets vinkel och fingrar på dockans ben) och flyttad i höjd så att dess lägsta del
 * är 1,5 mm över filten (handen vilar på filten: en kontakt; hur mycket står i about); blicken mot kameran; kortet i skon.
 */
export function ankaret(doll: Doll, stil: 'kameran' | 'bordet', vantan: Lyft, vantanNamn: string, dir = LYFT) {
  const fr = dollFrame(TABLE_LENS, doll), H = doll.hand!, kant = kantFor(doll), nar = doll.upperArm + doll.forearm - REN.naturlig;
  const limb = (side: Sida) => {
    const sign = side === 'R' ? 1 : -1, s = side === 'R' ? fr.shoulders[0] : fr.shoulders[1], fr2 = vantan.frames.filter(f => f[side].p);
    const A = (() => { const fw = unit(medianV(fr2.map(f => axesOf(f[side].p!, sign).forward))), pm = medianV(fr2.map(f => axesOf(f[side].p!, sign).palm)), palm = unit(sub(pm, mul(fw, dot(pm, fw)))); return {forward: fw, palm, across: cross(palm, fw)}; })();
    const q = Array.from({length: 21}, (_, k) => medianV(fr2.map(f => local(f[side].p!, axesOf(f[side].p!, sign))[k])));
    const bas = side === 'R' ? H.rest!.right : H.rest!.left, S0 = paDockan(q, bas), S = iVarandra(S0, sign) ? bas : S0;
    const W0 = medianV(vantan.frames.map(f => f[side].w));
    let h: Hand = {a: A, w: W0, S}; const hojd = -overFilten(h); h = flyttHand(h, [0, hojd, 0]);
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
  const about = `Vilan vid livebordet för dockan ${doll.name} (stilen ${stil}): ankaret som dockans alla rörelser (dealer3d/data/lyft-${doll.name}-*.json) börjar och slutar exakt i. Axlarna där doll.ts har dem (LIVE.dealer.styles.${stil}). Handlederna där dealerns väntan i ${vantanNamn} har dem (medianen), händerna lagda som där (lyftets vinkel och fingrar på dockans ben) och flyttade i höjd så att handens lägsta del är 1,5 mm över filten: höger ${mm(R.hojd)} mm, vänster ${mm(L.hojd)} mm${R.flytt || L.flytt ? `; flyttad mot axeln så att armen når utan att bålen lutar: höger ${mm(R.flytt)} mm, vänster ${mm(L.flytt)} mm` : ''}. Huvudet där dealern brukar hålla det mot axlarna (medel över stilens lyft, i modellens huvuds djup), blicken mot livebordets kamera, kortet i skons front (liveShoeCard), minen i vila.`;
  return {about, doll: doll.name, style: stil, hip: r4(fr.hip), frame, fran: {R: R.fran, L: L.fran}};
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
  return {n, resa, arrive, pull, leaves, narmast, meet, rests, vila, avstandVidBytet: best};
}
type Tider = ReturnType<typeof tiderna>;

/** Rutan där filmen först visar kortets framsida (live-bj/data/givar.json turnWindow), i lyftets rutor; null om kortet inte finns där. */
function framsidanSyns(lyft: Lyft, ti: Tider): number | null {
  try {
    const g = JSON.parse(readFileSync(path.join(CASINO, 'live-bj/data/givar.json'), 'utf8')) as {cards: {left: number | null; turnWindow: [number, number] | null}[]};
    const lamnar = lyft.film_seconds[0] + ti.leaves / lyft.fps, kort = g.cards.find(c => c.left !== null && Math.abs(c.left - lamnar) < 0.1 && c.turnWindow);
    return kort ? Math.round((kort.turnWindow![1] - lyft.film_seconds[0]) * lyft.fps) : null;
  } catch { return null; }
}
/**
 * Kortets vändning (radianer, 0 till pi) ruta för ruta: i takt med hur mycket lyftets högerhand vrids kring sin längd
 * (framåt) mellan bytet och att kortet ligger, klar senast där filmen först visar framsidan. Vrids handen för lite (under
 * 25 grader sammanlagt), jämnt mjukt över den tiden. Riktningen som handens största vridning.
 */
function vandningen(L: Last, ti: Tider, syns: number | null) {
  const A = L.R.vinklar, slut = Math.max(ti.meet + 4, Math.min(ti.rests - 1, syns ?? ti.rests - 1));
  const roll = A.map(a => { const r0 = unit(sub(mul(UP, -1), mul(a.forward, dot(mul(UP, -1), a.forward)))); return Math.atan2(dot(cross(r0, a.palm), a.forward), dot(r0, a.palm)); });
  const steg = roll.map((r, t) => t > ti.meet && t <= slut ? Math.abs(Math.atan2(Math.sin(r - roll[t - 1]), Math.cos(r - roll[t - 1]))) : 0);
  const tot = steg.reduce((s, x) => s + x, 0), ur = roll.slice(ti.meet, slut + 1).reduce((m, r) => Math.abs(r - roll[ti.meet]) > Math.abs(m) ? r - roll[ti.meet] : m, 0), sign = ur < 0 ? -1 : 1;
  let sum = 0; const theta = roll.map((_, t) => { if (t <= ti.meet) return 0; if (t > slut) return Math.PI; if (tot < rad(25)) return Math.PI * mjuk((t - ti.meet) / (slut - ti.meet)); sum += steg[t]; return Math.PI * sum / tot; });
  let jamnad = lagpass(theta, 4).map((x, t) => t <= ti.meet ? 0 : t >= slut ? Math.PI : clamp(x, 0, Math.PI));
  // (högst 30 grader på en ruta: vrids handen fortare än så, går vändningen över minst sex rutor kring där den är som snabbast)
  if (jamnad.some((x, t) => t && x - jamnad[t - 1] > rad(30))) { const mid = jamnad.findIndex(x => x >= Math.PI / 2), a = Math.max(ti.meet, Math.min(slut - 7, mid - 4)), b2 = Math.min(slut, a + 8);
    jamnad = jamnad.map((_, t) => t <= a ? 0 : t >= b2 ? Math.PI : Math.PI * mjuk((t - a) / (b2 - a))); }
  const fran = jamnad.findIndex(x => x > 0.05 * Math.PI), till = jamnad.findIndex(x => x >= 0.95 * Math.PI);
  return {theta: jamnad.map(x => sign * x), fran, till, slut, handVreds: Math.round(grad(tot)), efterHanden: tot >= rad(25)};
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

type Bygg = {doll: Doll; stil: 'kameran' | 'bordet'; stilFil: Stil; lyft: Lyft; ank: ReturnType<typeof ankaret>; minen: ReturnType<typeof minen>; dir?: string};

/**
 * Kroppen i varje ruta av rörelsen (N rutor, lyftets ruta li(t)): axlarna ur lyftet i dockans djup och bredd, huvudet och
 * blicken; tonade mot ankaret i ändarna. Bålens vridning kring lodlinjen är lyftets: axlarna ser smalare ut i bilden när
 * bålen är vriden (live-bj/README.md "Kroppen följer handen": 12 % smalare vid skon), så vinkeln är den som ger lyftets
 * bredd mot stilens fulla (medel.bredd), högst dockans mostTwist; bröstet vänds åt det håll händerna arbetar (`hall`).
 */
function kroppen(b: Bygg, L: Last, medel: ReturnType<typeof stilensMedel>, zHuvud: number, ton: (t: number) => number, N: number, hall: (t: number) => number) {
  const f0 = b.ank.frame, n = L.n, li = (t: number) => Math.min(t, n - 1), halv = b.doll.place.kind === 'seat' ? b.doll.place.shouldersApart / 2 : 0.18;
  const ankMitt = mitt(f0.R.s, f0.L.s), blick0 = unit(sub(f0.g, f0.h)), avst0 = length(sub(f0.g, f0.h));
  const vrid = lagpass(Array.from({length: n}, (_, j) => { const v = sub(L.L.s[j], L.R.s[j]), wp = Math.hypot(v[0], v[1]); return Math.min(b.doll.mostTwist, Math.acos(Math.min(1, wp / medel.bredd))); }), 2);
  return Array.from({length: N}, (_, t) => {
    const j = li(t), w = ton(t), m = add(ankMitt, mul(sub(axelMitt(L, j), medel.mitt), w)), v = sub(L.L.s[j], L.R.s[j]), r2 = unit([v[0], v[1], 0]), y = Math.max(0, vrid[j]) * hall(t);
    // (bröstet åt +x: höger axel fram, mot spelarna)
    const rikt: Vec3 = unit([r2[0] * Math.cos(y), r2[1], -Math.sin(y)]), dir = unit(lerp([1, 0, 0], rikt, w));
    const S: [Vec3, Vec3] = [sub(m, mul(dir, halv)), add(m, mul(dir, halv))];
    const hm = sub(tillDjup(L.h[j], zHuvud), axelMitt(L, j)), h = add(m, lerp(medel.huvud, hm, w));
    const g = add(h, mul(unit(lerp(blick0, L.riktning[j], w)), avst0 + (L.avst[j] - avst0) * w));
    return {S, h, g, kam: L.kam[j] * w};
  });
}

/** Rörelsen: en giv eller en väntan, ruta för ruta. */
export function bygg(b: Bygg) {
  const {doll, lyft} = b, fr = dollFrame(TABLE_LENS, doll), zAxlar = fr.shoulders[0][2], L = last(lyft, zAxlar), n = L.n, kant = kantFor(doll);
  const zHuvud = fr.head[2], medel = stilensMedel(b.stil, zAxlar, zHuvud, b.dir), F = 10, f0 = b.ank.frame, giv = lyft.leavesShoe !== undefined;
  const ank: Record<Sida, Hand> = {R: {a: axesOf(f0.R.p, 1), w: f0.R.w, S: local(f0.R.p, axesOf(f0.R.p, 1))}, L: {a: axesOf(f0.L.p, -1), w: f0.L.w, S: local(f0.L.p, axesOf(f0.L.p, -1))}};
  const fri = {R: lyftetsHander(lyft, 'R', ank.R.S, L.R.bort), L: lyftetsHander(lyft, 'L', ank.L.S, L.L.bort)};
  const lyftHand = (s: Sida, t: number): Hand => { const j = Math.min(t, n - 1); return {a: L[s].vinklar[j], w: L[s].w[j], S: fri[s].S[j]}; };
  const fart = (s: Sida, t: number): Vec3 => { const w = L[s].w, a = Math.max(0, t - 1), c = Math.min(n - 1, t + 1); return mul(sub(w[c], w[a]), 1 / Math.max(1, c - a)); };
  const vTopp = (namn: string, ers: number) => Math.min(1.3, b.stilFil.speed[namn]?.top_m_s?.best?.median ?? ers);

  // ---- tiderna, bryggorna och var varje hand är ----------------------------------------------------------------------
  let ti: Tider | null = null, N = n, plats: string | null = null;
  const faser: Record<Sida, Fas[]> = {R: [], L: []}, egen: Record<Sida, [number, number] | null> = {R: null, L: null};
  // (bryggorna: från ankaret i rutan t0 till lyftet i t1, och från lyftet i t2 till ankaret i t3)
  const bryggor: Record<Sida, {t0: number; t1: number; t2: number; t3: number}> = {R: {t0: 0, t1: 0, t2: n - 1, t3: n - 1}, L: {t0: 0, t1: 0, t2: n - 1, t3: n - 1}};
  let vidSkonHem = false;
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
    // platsen: den kortplats för lyftets plats som ligger närmast där lyftets kort lades
    const seat = /seat (\d)/.exec(lyft.to ?? '')![1], landat = lyft.frames[t.rests].card?.c ?? L.R.grepp[t.rests];
    plats = Object.keys(LIVE.cards).filter(id => id.startsWith(`P${seat}.`)).sort((x, y) => Math.hypot(LIVE.cards[x].at[0] - landat[0], LIVE.cards[x].at[2] - landat[2]) - Math.hypot(LIVE.cards[y].at[0] - landat[0], LIVE.cards[y].at[2] - landat[2]))[0];
    const B = bryggor;
    faser.L = [{fran: 0, till: B.L.t0, vad: 'vilan', kalla: 'ankaret'}, {fran: B.L.t0, till: B.L.t1, vad: nara ? 'ur vilan in i lyftet' : 'ur vilan till skon', kalla: 'brygga'},
      ...(nara ? [{fran: t.resa, till: t.arrive, vad: 'till skon', kalla: 'lyftet' as const}] : []), {fran: t.arrive, till: t.pull, vad: 'vid skon', kalla: 'lyftet'}, {fran: t.pull, till: t.leaves, vad: 'drar kortet ur skon', kalla: 'lyftet'},
      {fran: t.leaves, till: t.meet, vad: 'för kortet plant till bytet', kalla: 'lyftet'}, {fran: t.meet, till: B.L.t2, vad: 'släpper kortet, fri', kalla: 'lyftet'},
      {fran: B.L.t2, till: B.L.t3, vad: vidSkonHem ? 'hem från skon (lyftets vänster är vid skon efter nästa kort: kan bytas mot vänstern vid skon)' : 'hem', kalla: 'brygga'}, {fran: B.L.t3, till: N - 1, vad: 'vilan', kalla: 'ankaret'}];
    faser.R = [{fran: 0, till: B.R.t0, vad: 'vilan', kalla: 'ankaret'}, {fran: B.R.t0, till: B.R.t1, vad: 'ur vilan in i lyftet', kalla: 'brygga'}, {fran: B.R.t1, till: t.meet, vad: 'väntar på kortet', kalla: 'lyftet'},
      {fran: t.meet, till: t.rests, vad: 'tar kortet i bytet, bär och vänder det, lägger det', kalla: 'lyftet'}, {fran: t.rests, till: B.R.t2, vad: 'släpper kortet', kalla: 'lyftet'},
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
  const sido: Record<Sida, {v: Vec3; w: (t: number) => number}[]> = {R: [], L: []};
  const kontakt: Record<string, {langsMm: number; tvarsMm: number; behovdesMm: number; px: number}> = {};
  const ramp = (t: number, a: number, b: number) => b <= a ? (t >= b ? 1 : 0) : smooth((t - a) / (b - a));
  if (giv && ti && plats) {
    const t = ti, K0 = kortISkon(), KL = kortPaPlats(plats);
    const ryggen = (k: Kort, p: Vec3) => add(paKortet(k, p), mul(k.n, -T / 2)), ytan = (k: Kort, p: Vec3) => add(paKortet(k, p, 0.008), mul(k.n, T / 2));
    const not = (vad: string, l: number, P: Vec3, mal: Vec3, u: Vec3, lat: Vec3) => { kontakt[vad] = {langsMm: Math.round(l * 1000), tvarsMm: Math.round(length(lat) * 1000), behovdesMm: Math.round(length(tvars(sub(mal, P), u)) * 1000), px: pxAv(P, mal)}; };
    // vänstern vid skon: fingertopparnas dynor på kortets rygg i draget
    const uS = syn('L', t.pull), PS0 = dynor(lyftHand('L', t.pull)), lS = langsMed(PS0, uS, P => length(sub(ryggen(K0, P), P))), PS = add(PS0, mul(uS, lS)), latS = begrans(tvars(sub(ryggen(K0, PS), PS), uS), KONTAKT);
    not('vänstern mot kortet i skon', lS, PS, ryggen(K0, PS), uS, latS);
    // vänstern när kortet är ute: dynorna på kortets rygg, kortet plant på filten
    const uU = syn('L', t.leaves), PU0 = dynor(lyftHand('L', t.leaves)), lU = clamp((T - PU0[1]) / (uU[1] || -1e-6), -0.25, 0.25);
    kontakt['vänstern på kortet när det är ute'] = {langsMm: Math.round(lU * 1000), tvarsMm: 0, behovdesMm: 0, px: 0};
    // bytet: högerns grepp en kortlängd från vänsterns dynor (de håller i var sin ände, live-bj/README.md "Handbytet")
    const pLm = add(dynor(lyftHand('L', t.meet)), mul(syn('L', t.meet), lU)), uM = syn('R', t.meet), gM0 = greppet(lyftHand('R', t.meet));
    const lM = langsMed(gM0, uM, P => Math.abs(length(sub(P, pLm)) - (HK - 0.025)));
    kontakt['högern mot kortet i bytet'] = {langsMm: Math.round(lM * 1000), tvarsMm: 0, behovdesMm: Math.round(Math.abs(length(sub(add(gM0, mul(uM, lM)), pLm)) - (HK - 0.025)) * 1000), px: 0};
    // platsen: högerns grepp på kortet där det ligger
    const uR = syn('R', t.rests), gR0 = greppet(lyftHand('R', t.rests)), lR = langsMed(gR0, uR, P => length(sub(ytan(KL, P), P))), PR = add(gR0, mul(uR, lR)), latR = begrans(tvars(sub(ytan(KL, PR), PR), uR), KONTAKT);
    not('högern på kortet när det ligger', lR, PR, ytan(KL, PR), uR, latR);
    djupF.L = genom([[Math.max(0, Math.min(t.resa, t.arrive - 6)), 0], [t.arrive, lS], [t.pull, lS], [t.leaves, lU], [t.meet, lU], [t.meet + 12, 0]]);
    djupF.R = genom([[Math.max(bryggor.R.t1, t.meet - 12), 0], [t.meet, lM], [t.rests, lR], [t.vila, lR]]);
    sido.L.push({v: latS, w: x => ramp(x, t.arrive - 5, t.arrive) * (1 - ramp(x, t.pull, t.leaves + 3))});
    sido.R.push({v: latR, w: x => ramp(x, t.rests - 8, t.rests) * (1 - ramp(x, t.vila, t.vila + 4))});
  }
  /** Lyftets hand med djupet förankrat (längs synlinjen). */
  const lyftHandD = (s: Sida, t: number): Hand => flyttHand(lyftHand(s, t), mul(syn(s, t), djupF[s](t)));

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
      hander[s].push(lyftHandD(s, t)); kalla[s].push('l'); vikt[s].push(1);
    }
  }
  // (taket och kontrollen räknar tvärs synlinjen från de händer lyftet och bryggorna ger, med djupet förankrat)
  const fore = {R: hander.R.map(h => h.w), L: hander.L.map(h => h.w)};
  for (const [s] of SIDOR) for (const x of sido[s]) for (let t = 0; t < N; t++) { const w = x.w(t); if (w > 0 && kalla[s][t] !== 'v' && kalla[s][t] !== 'b') { hander[s][t] = flyttHand(hander[s][t], mul(x.v, w)); if (length(x.v) * w > 0.001) kalla[s][t] = 'k'; } }

  // ---- kontakterna och kortet -------------------------------------------------------------------------------------------
  const C: Kort[] = Array.from({length: N}, () => kortISkon());
  const haller: Record<Sida, boolean[]> = {R: Array(N).fill(false), L: Array(N).fill(false)};
  const kvitto = {lutGrader: 0, handledMest: {R: 0, L: 0}, nadde: {R: 0, L: 0}, kontakt, langsSynlinjen: {R: {median: 0, mest: 0}, L: {median: 0, mest: 0}}, ur: {R: 0, L: 0}, urFiltenLangs: {R: 0, L: 0}, vridenUrFilten: {R: 0, L: 0}, kortetPaFilten: 0, overGransen: {R: 0, L: 0}, kortetUr: {R: 0, L: 0}, glid: {} as Record<string, {mm: number; grader: number}>,
    vandning: null as null | {fran: number; till: number; handVreds: number; efterHanden: boolean; framsidanSyns: number | null}, landning: null as null | {handenFranKortet: number}};
  /** En rättning lagd på handen `s`: `d(t)` meter i rutan t; rutorna med en rättning tvärs synlinjen över en millimeter är kontakter (k). */
  const ratta = (s: Sida, d: (t: number) => Vec3) => { for (let t = 0; t < N; t++) { const x = d(t); if (length(x) < 1e-9) continue; hander[s][t] = flyttHand(hander[s][t], x); if (length(tvars(x, syn(s, t))) > 0.001 && kalla[s][t] === 'l') kalla[s][t] = 'k'; } };
  let vandn: ReturnType<typeof vandningen> | null = null;
  // (taket: ingen rättning flyttar en handled mer än KONTAKT tvärs synlinjen från där lyftet och bryggorna har den, med
  // djupet förankrat; längs synlinjen fritt. Behövs mer står det i kvittot som overGransen, och det som blir kvar säger lyft-kolla.ts)
  const tak = () => { for (const [s] of SIDOR) hander[s] = hander[s].map((h, x) => { const u = syn(s, x), d = tvars(sub(h.w, fore[s][x]), u), l = length(d); if (l <= KONTAKT + 1e-6) return h; kvitto.overGransen[s] = Math.max(kvitto.overGransen[s], Math.round(l * 1000)); return flyttHand(h, mul(d, KONTAKT / l - 1)); }); };
  /** Handen flyttad längs sin synlinje (mot kameran är minus) så lite som håller den ur filten, högst 15 cm; meter. */
  const urFiltenLangs = (s: Sida, h: Hand, x: number) => { if (overFilten(h) >= 0) return 0; const u = syn(s, x); for (let l = -0.002; l >= -0.15; l -= 0.002) if (overFilten(flyttHand(h, mul(u, l))) >= 0) return l; return -0.15; };
  if (giv && ti && plats) {
    const t = ti, K0 = kortISkon(), KL = kortPaPlats(plats);
    // ute ur skon: kortet plant på filten, ryggen upp, långsidan som i skon, mitt under vänsterns dynor (som djupet har lagt på ryggen)
    const lUt = flat(K0.l), pU = dynor(hander.L[t.leaves]), K1: Kort = {c: [pU[0], T / 2, pU[2]], l: lUt, n: mul(UP, -1)};
    const G1 = iHanden(hander.L[t.leaves], K1);
    // bytet: kortet mellan vänsterns dynor (1,5 cm in från kortets ena ände) och högerns grepp, ryggen mot vänsterns handflata
    const pL = dynor(hander.L[t.meet]), gR = greppet(hander.R[t.meet]), dRL = length(sub(gR, pL));
    const u = dRL > 0.02 ? unit(sub(gR, pL)) : flat(hander.L[t.meet].a.forward), palmL = hander.L[t.meet].a.palm, nM = unit(sub(palmL, mul(u, dot(palmL, u))));
    // (långsidan åt det håll den hade när kortet kom ut: ett kort med ändarna bytta är samma kort, och så vrids det inte ett halvt varv i handen)
    const K2: Kort = {c: add(add(pL, mul(u, HK / 2 - 0.015)), mul(nM, T / 2)), l: dot(u, K1.l) >= 0 ? u : mul(u, -1), n: nM};
    const G2L = iHanden(hander.L[t.meet], K2), G2R = iHanden(hander.R[t.meet], K2);
    kvitto.glid['vänstern: från ute ur skon till bytet'] = glid(G1, G2L);
    kvitto.landning = {handenFranKortet: Math.round(length(sub(greppet(hander.R[t.rests]), paKortet(KL, greppet(hander.R[t.rests]), 0))) * 1000)};
    vandn = vandningen(L, t, framsidanSyns(lyft, t));
    kvitto.vandning = {fran: vandn.fran, till: vandn.till, handVreds: vandn.handVreds, efterHanden: vandn.efterHanden, framsidanSyns: framsidanSyns(lyft, t)};
    // (i högern: som den tog kortet i bytet till som den har det när det ligger (greppet glider mjukt däremellan), och vänt
    // kring dess långa linje genom greppet, mellan tummen och pekfingret, åt det håll som håller det ur filten)
    const vandIGreppet = (k: Kort, h: Hand, x: number): Kort => { const l = unit(k.l), g = greppet(h), d = sub(g, k.c), o = add(k.c, sub(d, mul(l, dot(d, l)))); return {c: add(o, turned(sub(k.c, o), l, x)), l, n: turned(k.n, l, x)}; };
    const mittFlip = Math.round((Math.max(t.meet, vandn.fran) + Math.max(t.meet + 1, vandn.till)) / 2);
    const hallet = (() => { const h = hander.R[mittFlip], k = urHanden(h, G2R); return kortLagst(vandIGreppet(k, h, Math.PI / 2)) >= kortLagst(vandIGreppet(k, h, -Math.PI / 2)) ? 1 : -1; })();
    const G3Rned = iHanden(hander.R[t.rests], vandIGreppet(KL, hander.R[t.rests], -hallet * Math.PI));
    kvitto.glid['högern: från bytet till platsen'] = glid(G2R, G3Rned);
    const kortet = () => { for (let x = 0; x < N; x++) {
      if (x <= t.pull) C[x] = K0;
      else if (x < t.leaves) { C[x] = mellan(K0, urHanden(hander.L[x], G1), smooth((x - t.pull) / (t.leaves - t.pull))); haller.L[x] = true; }
      else if (x < t.meet) { C[x] = urHanden(hander.L[x], mellan(G1, G2L, mjuk((x - t.leaves) / (t.meet - t.leaves)))); haller.L[x] = true; }
      else if (x === t.meet) { C[x] = K2; haller.L[x] = haller.R[x] = true; }
      else if (x < t.rests) { C[x] = vandIGreppet(urHanden(hander.R[x], mellan(G2R, G3Rned, mjuk((x - t.meet) / (t.rests - t.meet)))), hander.R[x], hallet * Math.abs(vandn!.theta[Math.min(x, n - 1)])); haller.R[x] = true; }
      else C[x] = KL; } };
    // (händerna ur filten: först längs synlinjen, mot kameran (djupet är det osäkra), mjukt över rutorna intill; det som då
    // återstår vrids bort kring handleden, fingrarna uppåt, högst 25 grader, och höjs till sist, högst KONTAKT tvärs synlinjen)
    for (const [s] of SIDOR) {
      const langsBehov = hander[s].map((h, x) => kalla[s][x] === 'v' || kalla[s][x] === 'b' ? 0 : -urFiltenLangs(s, h, x));
      const langsJ = langsBehov.map((_, x) => Math.max(0, ...langsBehov.map((y, j) => y * smooth(1 - Math.abs(x - j) / 6))));
      hander[s] = hander[s].map((h, x) => langsJ[x] > 0 ? flyttHand(h, mul(syn(s, x), -langsJ[x])) : h);
      kvitto.urFiltenLangs[s] = Math.round(Math.max(0, ...langsJ) * 1000);
      const upp = (h: Hand, x: number) => { const ax = unit(h.a.across), a = vridHand(h, h.w, ax, rad(x)), b2 = vridHand(h, h.w, ax, -rad(x)); return toppMitt(a)[1] >= toppMitt(b2)[1] ? a : b2; };
      const vinkelBehov = hander[s].map((h, x) => { if (kalla[s][x] === 'v' || overFilten(h) >= 0) return 0; for (let g = 2; g <= 25; g += 2) if (overFilten(upp(h, g)) >= 0) return g; return 25; });
      const vinkelJ = vinkelBehov.map((_, x) => Math.max(0, ...vinkelBehov.map((y, j) => y * smooth(1 - Math.abs(x - j) / 5))));
      hander[s] = hander[s].map((h, x) => vinkelJ[x] > 0 ? upp(h, vinkelJ[x]) : h);
      kvitto.vridenUrFilten[s] = Math.round(Math.max(0, ...vinkelJ));
      const brist = hander[s].map((h, x) => kalla[s][x] === 'v' ? 0 : Math.max(0, -overFilten(h)));
      const hoj = brist.map((_, x) => Math.max(0, ...brist.map((y, j) => y * smooth(1 - Math.abs(x - j) / 5))));
      kvitto.ur[s] = Math.round(Math.max(0, ...hoj) * 1000);
      ratta(s, x => [0, hoj[x], 0]);
    }
    tak(); kortet();
    // (ett kort som handen för lägre än filten ligger på filten: det glider där, och handen ligger an mot det, nedan)
    const kortUpp = C.map((k, x) => x > t.pull && x < t.rests ? Math.max(0, 0.0005 - kortLagst(k)) : 0), kortUppJ = kortUpp.map((_, x) => Math.max(0, ...kortUpp.map((y, j) => y * smooth(1 - Math.abs(x - j) / 3))));
    for (let x = 0; x < N; x++) if (kortUppJ[x] > 0) C[x] = flyttKort(C[x], [0, kortUppJ[x], 0]);
    kvitto.kortetPaFilten = Math.round(Math.max(0, ...kortUpp) * 1000);
    // (greppet: den hand som håller kortet har det mellan fingrarna, med fingrar på var sin sida eller kortet mot filten, och
    // inget finger i det: kortet flyttas längs sin normal i handen, högst 2,4 cm, mjukat över rutorna; en fri hand i kortet
    // flyttas ut, högst KONTAKT)
    const sign = (s: Sida) => s === 'R' ? 1 : -1;
    const knuff = C.map((k, x) => { const h = (['R', 'L'] as Sida[]).filter(s => haller[s][x]); if (!h.length || x >= t.rests) return 0;
      const kost = (o: number) => { const ko = flyttKort(k, mul(k.n, o)); return (stod(ko, h.map(s => hander[s][x])) ? 0 : 100) + h.reduce((sum, s) => sum + iKortet(hander[s][x], ko, sign(s)), 0) + Math.abs(o) * 100 + 1e5 * Math.max(0, 0.0005 - kortLagst(ko)); };
      let bast = 0, kb = kost(0); for (let o = -0.024; o <= 0.024 + 1e-9; o += 0.002) { const c = kost(o); if (c < kb - 1e-9) { kb = c; bast = o; } } return bast; });
    const knuffJ = lagpass(knuff, 5);
    for (let x = 0; x < N; x++) if ((haller.L[x] || haller.R[x]) && x < t.rests) C[x] = flyttKort(C[x], mul(C[x].n, knuffJ[x]));
    for (const [s] of SIDOR) {
      const ut = hander[s].map((h, x) => { if (kalla[s][x] === 'v' || x <= t.pull || iKortet(h, C[x], sign(s)) === 0) return null; const k = C[x], d = mul(unit(k.n), Math.sign(dot(sub(h.w, k.c), k.n)) || 1);
        for (let y = 0.002; y <= KONTAKT; y += 0.002) if (iKortet(flyttHand(h, mul(d, y)), k, sign(s)) === 0) return mul(d, y + 0.001); return mul(d, KONTAKT); });
      kvitto.kortetUr[s] = Math.round(Math.max(0, ...ut.map(v => v ? length(v) : 0)) * 1000);
      const d = hander[s].map((_, x) => { let v: Vec3 = [0, 0, 0], m = 0; ut.forEach((u0, j) => { if (!u0) return; const w = smooth(1 - Math.abs(x - j) / 4), l = length(u0) * w; if (l > m) { m = l; v = mul(u0, w); } }); return v; });
      ratta(s, x => d[x]);
      // (och till sist ur filten igen, där en fri hand flyttades ned)
      const brist = hander[s].map((h, x) => kalla[s][x] === 'v' || haller[s][x] ? 0 : Math.max(0, -overFilten(h)));
      ratta(s, x => [0, Math.max(0, ...brist.map((y, j) => y * smooth(1 - Math.abs(x - j) / 3))), 0]);
    }
    tak();
  } else if (!giv) {
    for (const [s] of SIDOR) { const brist = hander[s].map(h => Math.max(0, -overFilten(h))); kvitto.ur[s] = Math.round(Math.max(0, ...brist) * 1000); ratta(s, x => [0, brist[x], 0]); }
  }

  // ---- kroppen: bålen lutar mot den hand som inte når (ren-giv.ts rackvidd), jämnat; armbågarna ----------------------
  // (kroppen följer lyftet där båda händerna gör det och tonas mot ankaret medan en hand är i vilan eller i en brygga: så
  // gungar inte bålen in i en arm som vilar)
  const tonK = (t: number) => Math.min(smooth(Math.min(t, N - 1 - t) / F), giv ? Math.min(vikt.R[t], vikt.L[t]) : 1);
  // (åt vilket håll bröstet vänds: dit händerna arbetar, deras mitt mot axlarnas i sidled, mjukt)
  const axMitt = mitt(f0.R.s, f0.L.s)[0], hallV = lagpass(hander.R.map((h, t) => Math.tanh(((h.w[0] + hander.L[t].w[0]) / 2 - axMitt) / 0.06)), 2);
  const hip = b.ank.hip, kropp = kroppen(b, L, medel, zHuvud, tonK, N, t => hallV[t]);
  const behov = kropp.map((k, t) => { let best = {lean: 0, twist: 0, mot: hander.R[t].w};
    for (const [side, i] of [['R', 0], ['L', 1]] as const) { const r = rackvidd(hip, k.S[i], [hander[side][t].w], hander[side][t].w, doll, REN.naturlig); if (r.lean > best.lean) best = {lean: r.lean, twist: r.twist, mot: hander[side][t].w}; }
    return best; });
  const W8 = 8, lutn = behov.map((_, t) => Math.max(0, ...behov.map((x, j) => x.lean * smooth(1 - Math.abs(t - j) / (W8 + 1)))));
  const riktn = behov.map((_, t) => { let v: Vec3 = [0, 0, 0], tw = 0, sum = 0; behov.forEach((x, j) => { const w = x.lean * smooth(1 - Math.abs(t - j) / (W8 + 1)); if (w > 0) { v = add(v, mul(flat(sub(x.mot, hip)), w)); tw += (x.twist / (x.lean || 1)) * w; sum += w; } });
    return sum > 0 ? {mot: add(hip, unit(v)), kvot: tw / sum} : {mot: add(hip, [0, 0, 1]), kvot: 0}; });
  // (blicken: lyftets, och rakt mot livebordets kamera från dockans huvud där lyftet säger att dealern ser in i kameran)
  const kamera: Vec3 = [0, LIVE_CAMERA.height, 0];
  const torsos = kropp.map((k, t) => { const torso = bal(hip, riktn[t].mot, lutn[t], riktn[t].kvot * lutn[t]), h = torso(k.h, 0.85); kvitto.lutGrader = Math.max(kvitto.lutGrader, grad(lutn[t]));
    const d = sub(k.g, k.h), mot = sub(kamera, h), g = add(h, lerp(d, mot, k.kam));
    return {S: [torso(k.S[0]), torso(k.S[1])] as [Vec3, Vec3], h, g}; });
  // (armbågen där lyftets armbåge är i bilden där handen är lyftets, ankarets i vilan, emellan i bryggorna; vinkeln kring
  // linjen axel–handled vald ruta för ruta, utvecklad och jämnad: så byter armbågen aldrig sida på en ruta)
  const vrid: Record<Sida, number[]> = {R: [], L: []};
  for (const [s] of SIDOR) { const ra = hander[s].map((hand, t) => { const S = torsos[t].S, sh = S[s === 'R' ? 0 : 1]; return armbageVinkel(sh, hand, lerp(f0[s].e, L[s].e[Math.min(t, n - 1)], vikt[s][t]), doll, kant, {R: S[0], L: S[1], hip}); });
    for (let t = 1; t < N; t++) { let d = ra[t] - ra[t - 1]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; ra[t] = ra[t - 1] + d; }
    vrid[s] = lagpass(ra, 2.5); }
  const frames: Frame[] = [];
  for (let t = 0; t < N; t++) {
    const {S, h, g} = torsos[t], kort = C[t], limbs = {} as Record<Sida, Limb>;
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
    frames.push(t === 0 ? {...f0, card: {...f0.card}} : t === N - 1 ? {...f0, card: kortet} : {card: kortet, R: limbs.R, L: limbs.L, h: r4(h), g: r4(g), a});
  }
  // (kortets långsida åt samma håll i alla rutor)
  for (let t = 1; t < N; t++) if (dot(frames[t].card.l, frames[t - 1].card.l) < 0) frames[t].card.l = frames[t].card.l.map(x => -x) as Vec3;
  // (hur långt handlederna står från lyftet längs synlinjen, där handen är lyftets: djupet som förankrades)
  for (const [s] of SIDOR) { const v = frames.flatMap((f, t) => t < n && (kalla[s][t] === 'l' || kalla[s][t] === 'k') ? [Math.abs(dot(sub(f[s].w, L[s].w[t]), syn(s, t)))] : []).sort((a, b) => a - b); if (v.length) kvitto.langsSynlinjen[s] = {median: Math.round(v[v.length >> 1] * 1000), mest: Math.round(v[v.length - 1] * 1000)}; }
  const handen = {R: kalla.R.join(''), L: kalla.L.join('')};
  return {frames, tider: ti, plats, kvitto, faser, egen, bryggor, handen, vand: vandn ? {fran: vandn.fran, till: vandn.till} : null, vidSkonHem, hander: {R: {godkand: fri.R.godkand, saknas: fri.R.saknas}, L: {godkand: fri.L.godkand, saknas: fri.L.saknas}}};
}

// ---- körningen -----------------------------------------------------------------------------------------------------------
// (--lyft och --ut byter mappen lyften läses ur och mappen rörelserna skrivs till, för att pröva en ändring utan att röra dealer3d/data/)
let lyftDir = LYFT, utDir = DATA;
const LYFTEN = (): string[] => readdirSync(lyftDir).filter(f => f.endsWith('.json')).sort();
const VANTAN_FOR: Record<string, string> = {kameran: 'kameran-vantan-1.json', bordet: 'bordet-vantan-1.json'};
const las = <X>(fil: string): X => JSON.parse(readFileSync(fil, 'utf8')) as X;
const skriv = (fil: string, data: unknown) => writeFileSync(fil, JSON.stringify(data) + '\n');
const rel = (fil: string) => path.relative(CASINO, fil).split(path.sep).join('/');

/** Ankaret för dockan `dockNamn` (eller dockan `annan` i hennes ställe, för den som prövar ett annat mått). */
export function ankaretFor(dockNamn: string, annan?: Doll) {
  const doll = annan ?? LIVE_DOLLS[dockNamn]; if (!doll) throw Error(`Ingen docka vid livebordet heter ${dockNamn}.`);
  const stil = (Object.entries(LIVE.dealer.styles).find(([, d]) => d.name === dockNamn)![0]) as 'kameran' | 'bordet', vantanFil = path.join(lyftDir, VANTAN_FOR[stil]);
  return {doll, stil, ank: ankaret(doll, stil, las<Lyft>(vantanFil), VANTAN_FOR[stil].replace('.json', ''), lyftDir), vantanFil};
}
/** Lyftet `lyftFil` på dockan (som körningen nedan gör, utan att skriva något); `annan` prövar en annan docka i hennes ställe. */
export function pa(lyftFil: string, dockNamn?: string, annan?: Doll) {
  const lyft = las<Lyft>(lyftFil), namn = dockNamn ?? lyft.docka, {doll, stil, ank} = ankaretFor(namn, annan);
  const stilFil = las<Stil>(path.join(CASINO, `live-bj/data/stil-${lyft.style}.json`)), L = last(lyft, dollFrame(TABLE_LENS, doll).shoulders[0][2]);
  return bygg({doll, stil, stilFil, lyft, ank, minen: minen(L, stilFil), dir: lyftDir});
}
function kor(lyftFil: string, dockNamn?: string) {
  const lyft = las<Lyft>(lyftFil), namn = dockNamn ?? lyft.docka, {doll, stil, ank, vantanFil} = ankaretFor(namn);
  if (lyft.style !== stil) console.log(`  (lyftet är stilen ${lyft.style}, dockan ${namn} stilen ${stil})`);
  const stilFil = las<Stil>(path.join(CASINO, `live-bj/data/stil-${lyft.style}.json`)), L = last(lyft, dollFrame(TABLE_LENS, doll).shoulders[0][2]);
  const ut0 = bygg({doll, stil, stilFil, lyft, ank, minen: minen(L, stilFil), dir: lyftDir});
  const giv = lyft.leavesShoe !== undefined, nr = giv ? /seat (\d)/.exec(lyft.to!)![1] : /vantan-(\d)/.exec(lyftFil)![1];
  const fil = path.join(utDir, giv ? `lyft-${namn}-p${nr}.json` : `lyft-${namn}-vantan-${nr}.json`), ankFil = path.join(utDir, `ankare-vila-${namn}.json`);
  const ti = ut0.tider, k = ut0.kvitto, N = ut0.frames.length, B = ut0.bryggor;
  const kontakter = Object.entries(k.kontakt).map(([vad, x]) => `${vad} ${x.langsMm} mm längs synlinjen och ${x.tvarsMm} tvärs${x.behovdesMm > x.tvarsMm + 1 ? ` (tvärs behövdes ${x.behovdesMm} mm, ${x.px} bildpunkter: ett fynd om lyftet eller bordet)` : ''}`).join(', ');
  const about = giv
    ? `Dockan ${namn} ger ett kort till ${ut0.plats}, lyftat ur livebordets film (${rel(lyftFil)}, filmens sekunder ${lyft.film_seconds.join('–')}) och lagt på dockans egen kropp av dealer3d/tools/lyft-till-docka.ts. Händerna är lyftets ruta för ruta (handlederna, vinkeln och fingrarna, jämnade lugnt i stillhet och lätt i rörelse) från ruta ${Math.min(B.L.t1, B.R.t1)} till ${Math.max(B.L.t2, B.R.t2)}; dessförinnan och därefter en mjuk brygga till och från vilan (${rel(ankFil)}), där made.faser säger vilka rutor. Tiden är dealerns (vänsterhanden vid skon i ruta ${ti!.arrive}, draget ${ti!.pull}–${ti!.leaves}, bytet i ruta ${ti!.meet} där lyftets händer är som närmast, kortet vänt i ruta ${ut0.vand?.fran}–${ut0.vand?.till} medan lyftets högerhand vrids, kortet ligger i ruta ${ti!.rests}). Kortet följer händerna: plant under vänsterns fingertoppar ur skon, mellan händernas grepp i bytet, i högerns grepp till ${ut0.plats}, där det ligger som LIVE.cards har det. Djupet (längs synlinjen från livebordets kamera, det ett lyft ur en kamera inte vet) är förankrat där händerna rör kortet och följer lyftet däremellan; i filmens bild står händerna kvar. Kontakterna: ${kontakter}; handlederna flyttade längs synlinjen median ${k.langsSynlinjen.R.median}/${k.langsSynlinjen.L.median} mm, högst ${k.langsSynlinjen.R.mest}/${k.langsSynlinjen.L.mest} mm (höger/vänster); händerna ur filten flyttade längs synlinjen högst ${k.urFiltenLangs.R}/${k.urFiltenLangs.L} mm och höjda högst ${k.ur.R}/${k.ur.L} mm och ur kortet flyttade högst ${k.kortetUr.R}/${k.kortetUr.L} mm. Bålen lutar där armen inte når (högst ${k.lutGrader.toFixed(1)} grader).${ut0.vidSkonHem ? ' Lyftets vänsterhand är vid skon efter nästa kort när högern går hem: vänsterns väg hem är en brygga, märkt i made.faser, som kan bytas mot vänstern vid skon.' : ''}`
    : `Dockan ${namn} väntar, lyftat ur livebordets film (${rel(lyftFil)}, filmens sekunder ${lyft.film_seconds.join('–')}; där har dealern vänsterhanden vid "${lyft.left_at}" och högerhanden vid "${lyft.right_at}"). Dockan är i sin vila (${rel(ankFil)}), vars handleder är väntans, med lyftets små rörelser av handlederna och axlarna (jämnade lugnt), och huvudet, blicken och minen som dealerns. Börjar och slutar i vilan.`;
  const motion = {fps: FPS, frameCount: N, ...(giv ? {leavesShoe: ti!.leaves, edge: [ut0.vand!.fran, ut0.vand!.till], folds: ut0.vand!.till, rests: ti!.rests} : {}), hip: ank.hip, doll: namn, ...(giv ? {to: [ut0.plats], marke: {hander: 'tva', vands: 'pa-vagen', satts: 'plant'}} : {}), about,
    made: {tool: 'dealer3d/tools/lyft-till-docka.ts', lift: rel(lyftFil), doll: namn, from: rel(ankFil), to: rel(ankFil), sources: {[rel(lyftFil)]: sha(lyftFil), [rel(vantanFil)]: sha(vantanFil), 'blackjack-dealer/src/table-live.ts': sha(path.join(ROOT, 'src/table-live.ts'))},
      times: ti, liftFrames: 'rörelsens ruta t är lyftets ruta t (efter lyftets sista ruta: dess sista)', faser: ut0.faser, egen: ut0.egen, hand: ut0.handen,
      filter: `handlederna, händernas vinkel, axlarna och huvudet: Butterworth 2:a ordningen framåt och bakåt (nollfas), ${LUGN.lag} Hz där handen är stilla och ${LUGN.hog} Hz där den rör sig (lugna)`, hands: ut0.hander, chosen: k},
    frames: ut0.frames};
  skriv(fil, motion);
  skriv(ankFil, {about: ank.about, doll: namn, style: stil, hip: ank.hip, frame: ank.frame, made: {tool: 'dealer3d/tools/lyft-till-docka.ts', waiting: rel(vantanFil), sources: {[rel(vantanFil)]: sha(vantanFil), 'blackjack-dealer/src/table-live.ts': sha(path.join(ROOT, 'src/table-live.ts'))}}});
  console.log(`${path.basename(fil)}: ${N} rutor (lyftet ${lyft.frames.length})${giv ? `, ${ut0.plats}, skon ${ti!.arrive}/${ti!.pull}/${ti!.leaves}, bytet ${ti!.meet} (${Math.round(ti!.avstandVidBytet * 1000)} mm), vänt ${ut0.vand?.fran}–${ut0.vand?.till}, ligger ${ti!.rests}; bryggor V ${B.L.t0}–${B.L.t1}, ${B.L.t2}–${B.L.t3}, H ${B.R.t0}–${B.R.t1}, ${B.R.t2}–${B.R.t3}; ${kontakter}` : ''}; ur filten ${k.ur.R}/${k.ur.L} mm, ur kortet ${k.kortetUr.R}/${k.kortetUr.L} mm, bålen högst ${k.lutGrader.toFixed(1)}°, handleden högst ${k.handledMest.R.toFixed(0)}/${k.handledMest.L.toFixed(0)}°, når inte ${k.nadde.R}/${k.nadde.L}; lyftets händer godkända ${Math.round(ut0.hander.R.godkand * 100)}/${Math.round(ut0.hander.L.godkand * 100)} %`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), val = (namn: string) => { const i = args.indexOf(namn); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
  const l = val('--lyft'), u = val('--ut'); if (l) lyftDir = path.resolve(l); if (u) { utDir = path.resolve(u); mkdirSync(utDir, {recursive: true}); }
  if (args.includes('--alla')) for (const f of LYFTEN()) kor(path.join(lyftDir, f));
  else { const [fil, docka] = args; if (!fil) throw Error('Användning: node dealer3d/tools/lyft-till-docka.ts <lyftet.json> <docka> | --alla [--lyft <mapp>] [--ut <mapp>]'); kor(path.resolve(fil), docka); }
}
