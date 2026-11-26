// Standarddockans egna mått ur modellen (Jakob 2026-11-26: givarna ritas för standarddockans egen kropp, så att kroppen
// som visas och rörelsens punkter är samma sak). Läser den riggade modellen som avatar-auto-pipeline bygger
// (../avatar-auto-pipeline/assets/docka/standarddocka_<docka>.glb, scen/bygg_docka.py) som dealer3d/src/figure-model.ts
// läser den: benens lägen i modellens vilopose, och huden som skelettet böjer den. Mäter axellederna, överarmen,
// underarmen, höften till axlarna och handen (handleden, tummens tre leder, varje fingers knoge, mellanled och ytterled,
// och topparna på huden), och skriver dem som en docka (dealer3d/src/doll.ts): platsen (SITS nedan, samma för mannen och
// kvinnan), Paows handformer böjda på dockans egna ben, och händerna på filten i vilan (A1) och i ankaret (A2.3), lagda på
// dockans hud vid standarddockans bord (hud.ts STANDARDBORD).
//   node dealer3d/tools/docka-standard.ts --docka man|kvinna [--skriv] [--hojd <m>] [--bakom <m>] [--kant-bak <m>]
//   --skriv: dockan in i dealer3d/src/doll.ts (mellan raderna // <docka namn> och // </docka namn>); utan: bara måtten.
//   --hojd, --bakom, --kant-bak: pröva andra tal för platsen och bordets kant (utan --skriv).
// Topparna mäts på huden (dealer3d/src/fingertopp.ts). Ankaret, vilan till skon och givarna skrivs sedan av
// dealer3d/tools/ren-givar.ts --docka <namn>.
import {readFileSync, writeFileSync} from 'node:fs';
import {lasDocka} from './modell.ts';
import {fingertopp} from '../src/fingertopp.ts';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CARD, PLAY_LENS, TABLE_LENS, add, cross, dot, filmEye, length, mul, see, sub, unit, type Vec3} from '../src/camera.ts';
import {PAOW, dollFrame, type Doll, type DollHand, type DollPlace, type HandPlace} from '../src/doll.ts';
import {axesOf, local, placed, type Axes} from '../src/hand-pose.ts';
import {bendsOf, fingerFrom, handFaults} from '../src/hand-rule.ts';
import {FINGERS} from '../src/capture.ts';
import {arm, turned} from '../src/body.ts';
import {armbageOverKanten, underarmLuft, type Kant} from '../src/ren-giv.ts';
import {SKON_FLYTT, STANDARDBORD, bordet, franLadan, handHud, kantFor, kroppen} from './hud.ts';
import {spots, type Plan} from '../src/world.ts';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const NAMN = arg('--docka') ?? 'man'; if (!/^(man|kvinna)$/.test(NAMN)) throw Error('--docka tar man eller kvinna.');
const ROOT = fileURLToPath(new URL('../../../', import.meta.url)), FIL = `avatar-auto-pipeline/assets/docka/standarddocka_${NAMN}.glb`;
const mm = (m: number) => Math.round(m * 10000) / 10, r4 = (v: Vec3): Vec3 => v.map(x => Math.round(x * 10000) / 10000 || 0) as Vec3, grad = (r: number) => Math.round(r * 1800 / Math.PI) / 10, rad = (d: number) => d * Math.PI / 180;

// ---- måtten ---------------------------------------------------------------------------------------------------------
const modell = lasDocka(path.join(ROOT, FIL)), {led} = modell;
const SIDOR = ['Right', 'Left'] as const, FINGERNAMN = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'] as const;
const medel = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
const axelIsar = length(sub(led('RightArm'), led('LeftArm')));
const overarm = SIDOR.map(s => length(sub(led(`${s}Arm`), led(`${s}ForeArm`)))), underarm = SIDOR.map(s => length(sub(led(`${s}ForeArm`), led(`${s}Hand`))));
const hoftAxlar = length(sub(led('Hips'), mul(add(led('RightArm'), led('LeftArm')), 0.5)));
/** Fingertoppen på huden (dealer3d/src/fingertopp.ts), och hur många hörn den mättes på. */
function topp(side: string, finger: string) {
  const moln = modell.pa(`${side}Hand${finger}3`), t = fingertopp(led(`${side}Hand${finger}2`), led(`${side}Hand${finger}3`), moln); if (!t) throw Error(`${side} ${finger}: för få hörn på det tredje benet.`);
  return {...t, vinkel: grad(t.vinkel * Math.PI / 180), horn: moln.length};
}
/** Handens 21 punkter i modellens vilopose (MediaPipes ordning: handleden, sedan tummen till lillfingret från roten ut). */
const handen = (side: typeof SIDOR[number]) => { const p: Vec3[] = [led(`${side}Hand`)], toppar: ReturnType<typeof topp>[] = [];
  for (const f of FINGERNAMN) { for (const n of [1, 2, 3]) p.push(led(`${side}Hand${f}${n}`)); const t = topp(side, f); toppar.push(t); p.push(t.punkt); }
  return {p, toppar}; };
const H = SIDOR.map(handen), SIGN = [1, -1];
/** Hans händer i vilopose, i handens egna axlar (hand-pose.ts), höger och vänster. */
const egen = H.map((h, i) => local(h.p, axesOf(h.p, SIGN[i])).map(r4));

// ---- handens former -----------------------------------------------------------------------------------------------
const benLangd = (S: Vec3[], a: number, b: number) => length(sub(S[b], S[a]));
/**
 * Hans hand böjd som hennes form `hennes` är: varje fingerled böjd lika mycket (hand-rule.ts bendsOf och fingerFrom, från
 * hans knoge och med hans benlängder), och tummens ben pekande som hennes i handens axlar, från hans tumrot och med hans längder.
 */
function bojdSom(hans: Vec3[], hennes: Vec3[]): Vec3[] {
  const S = hans.map(q => [...q] as Vec3), b = bendsOf(hennes);
  for (let f = 1; f <= 4; f++) { const c = FINGERS[f]; fingerFrom(S, f, b[f - 1], [1, 2, 3].map(j => benLangd(hans, c[j - 1], c[j]))).forEach((q, j) => { S[c[j + 1]] = q; }); }
  const t = FINGERS[0]; for (let j = 1; j <= 3; j++) S[t[j]] = add(S[t[j - 1]], mul(unit(sub(hennes[t[j]], hennes[t[j - 1]])), benLangd(hans, t[j - 1], t[j])));
  return S.map(r4);
}
const axlarAv = (at: HandPlace): Axes => ({forward: unit(at.forward), palm: unit(at.palm), across: cross(unit(at.palm), unit(at.forward))});
/** Hans hand där hennes håller kortet i skon: samma axlar, handleden flyttad så att pek-, lång- och ringfingrets toppar i medel är där hennes är. */
// (och lyft ut ur kortet längs dess yta, en halv millimeter i taget, tills inget av pek-, lång- och ringfingret är i det;
// vid standarddockornas sko, hud.ts SKON: kortet i Paows ankare och hennes hand där flyttade lika långt som skon)
const paowsKort = (JSON.parse(readFileSync(path.join(ROOT, 'blackjack-dealer/dealer3d/data/ankare-2-3-paow.json'), 'utf8')) as {frame: {card: {c: Vec3; l: Vec3; n: Vec3}}}).frame.card;
const skonsKort = {...paowsKort, c: add(paowsKort.c, SKON_FLYTT)}, vidSkon = (at: HandPlace): HandPlace => ({...at, wrist: add(at.wrist, SKON_FLYTT)});
const paKortet = (S: Vec3[], hennes: Vec3[], at: HandPlace): HandPlace => { const a = axlarAv(at), toppar = (p: Vec3[]) => mul(add(add(p[8], p[12]), p[16]), 1 / 3);
  let w = add(at.wrist, sub(toppar(placed(hennes, a, at.wrist)), toppar(placed(S, a, at.wrist)))); const ut = mul(skonsKort.n, Math.sign(dot(sub(toppar(placed(S, a, w)), skonsKort.c), skonsKort.n)) || 1);
  for (let k = 0; k < 20 && handFaults(placed(S, a, w), -1, null, skonsKort).some(x => x.kind === 'kortet' && x.fingers.some(g => g >= 1 && g <= 3)); k++) w = add(w, mul(ut, 0.0005));
  return {...at, wrist: r4(w)}; };
const P = PAOW.hand!, [hoger, vanster] = egen;
const hand: DollHand = {anchor: P.anchor, right: bojdSom(hoger, P.right), left: bojdSom(vanster, P.left), at: {right: P.at.right, left: P.at.left},
  // (topparnas tjocklek på huden: pek- och långfingrets, och tummens, med 0,3 mm till godo)
  topp: {finger: Math.round((Math.max(H[0].toppar[1].radie, H[0].toppar[2].radie, H[1].toppar[1].radie, H[1].toppar[2].radie) + 0.0003) * 10000) / 10000, thumb: Math.round((Math.max(H[0].toppar[0].radie, H[1].toppar[0].radie) + 0.0003) * 10000) / 10000}};
hand.at = {right: P.at.right, left: paKortet(hand.left, P.left, vidSkon(P.at.left))}; // (högerhanden läggs på filten nedan)
hand.grip = {right: bojdSom(hoger, P.grip!.right), left: bojdSom(vanster, P.grip!.left)};
const restR = bojdSom(hoger, P.rest!.right), restL = bojdSom(vanster, P.rest!.left);
hand.rest = {right: restR, left: restL, at: P.rest!.at}; // (lägena läggs i vilan nedan)
const natL = bojdSom(vanster, P.natural!.left); hand.natural = {left: natL, at: {left: paKortet(natL, P.natural!.left, vidSkon(P.natural!.at.left))}};

// ---- platsen -------------------------------------------------------------------------------------------------------
// Var standarddockan sitter, samma för mannen och kvinnan (Jakob 2026-11-26: "så man inte behöver jobba dubbelt för
// grundposer"): axelledernas mitt SITS.bakom m bakom spelets kant och SITS.hojd m över filten, mitt för Paows, höften rakt
// under den på dockans egen bål, och bordets dealerkant SITS.kantBak m bakom spelets kant. Han sitter där kortplanen
// räknar med (som Paow, 0,38 m), och det är bordets kant och markerbrickan som kommer närmare honom (Jakob 2026-11-26:
// dockorna "aningen till mot bordet", men "annars kanske det blir för trångt" för korten och skon): kanten 0,23 m bakom
// spelets kant ger magen några centimeter luft. Höjden valde han 2026-11-26 ur fyra prov (0,23, 0,27, 0,31, 0,35): 0,31 m
// ("okej" i spelets vy, Bra från sidan; 0,35 klipper huvudet). Regeln är så högt som spelets bild rymmer hjässan, högst
// hans 0,31: med människans mått (huvudagenten 2026-11-26) sitter mannen, vars hjässa står högre över axlarna, på 0,29
// (hjässan på rad 9 i spelets vy; på 0,31 klipptes den) och kvinnan på 0,31 (rad 18). --hojd, --bakom och --kant-bak
// prövar andra tal utan att skriva dockan. Bordets modell kan vara byggd med en annan kant (bygg_bord.py --kant-bak):
// kanten, brickan och sargen räknas då dit SITS.kantBak säger.
/** Hur långt standarddockan lutar framåt och vrider sig när armen inte räcker, radianer (doll.ts mostLean, mostTwist). */
const BAL = {luta: 25 * Math.PI / 180, vrida: 20 * Math.PI / 180};
/** Axelledernas höjd över filten per docka (meter): så högt som spelets bild rymmer hjässan, högst Jakobs 0,31. */
const HOJD: Record<string, number> = {man: 0.29, kvinna: 0.31};
const SITS = {bakom: Number(arg('--bakom') ?? 0.38), hojd: Number(arg('--hojd') ?? HOJD[NAMN]), kantBak: Number(arg('--kant-bak') ?? STANDARDBORD.kantBak)};
if (PAOW.place.kind !== 'joints') throw Error('Paows plats är inte lederna.');
const lens = TABLE_LENS, paowMitt = (() => { const f = dollFrame(lens, PAOW); return mul(add(f.shoulders[0], f.shoulders[1]), 0.5); })();
const mid = mul(add(led('RightArm'), led('LeftArm')), 0.5), domin = modell.hud.pa.map(p => modell.hud.leder[p.reduce((a, b) => b.vikt > a.vikt ? b : a).led]);
const huvudHorn = modell.hud.horn.filter((_, i) => domin[i] === 'Head'), huvudMitt = mul(huvudHorn.reduce((s, p) => add(s, p), [0, 0, 0] as Vec3), 1 / huvudHorn.length);
const hjassa = Math.max(...huvudHorn.map(p => p[1])), haka = Math.min(...huvudHorn.map(p => p[1]));
const place: Extract<DollPlace, {kind: 'seat'}> = {kind: 'seat', behindEdge: SITS.bakom, shoulderHeight: Math.round(SITS.hojd * 10000) / 10000, x: r4(paowMitt)[0], shouldersApart: Math.round(axelIsar * 10000) / 10000, trunk: Math.round(hoftAxlar * 10000) / 10000,
  neck: r4(sub(led('neck'), mid)), head: r4(sub(huvudMitt, mid)), headRadius: Math.round((hjassa - haka) / 2 * 10000) / 10000};
const upperArm = Math.round(medel(overarm) * 1000) / 1000, forearm = Math.round(medel(underarm) * 1000) / 1000;
const HANS = NAMN === 'man' ? 'hans' : 'hennes';
const dollUtanVila: Doll = {name: NAMN, upperArm, forearm, reach: Math.round((upperArm + forearm) * 0.972 * 1000) / 1000, mostLean: BAL.luta, mostTwist: BAL.vrida,
  hipBelowFelt: Math.round((place.trunk - place.shoulderHeight) * 10000) / 10000, elbowPoles: PAOW.elbowPoles, elbowAtRest: PAOW.elbowAtRest, hand, place, shape: PAOW.shape, about: {}};
const fram = dollFrame(lens, dollUtanVila);

// ---- händerna på filten: vilan (A1) och högerhanden i ankaret (A2.3) ---------------------------------------------------
// Jakobs domar (standarddocka/AGENTS.md): händerna vilar på filten, inte i den; armarna går aldrig genom bordets kant;
// vilan ser avslappnad ut, och i vilan pekar handen som underarmen (Jakob 2026-11-26 om vilan vid 0,31 m: "så ska väl
// händerna mer vara i samma riktning som underarmarna"). En hand läggs därför på hans hud: handflatan och fingrarna 1–2 mm
// över filten, handen vriden kring lodlinjen så att den pekar som underarmen och lutad så att handleden är rak (högst
// VILA.handled; 20 grader sedan dockan fick en människas tjockare underarm 2026-11-26, som går brantare över kanten),
// underarmen minst VILA.luft över filten där den är över bordet (standarddocka/editor/armar.ts vill ha
// 1 cm), och armbågen så nära kroppen som det då går: hängande som `pol` säger, vriden ut bara så mycket som luften kräver.
// I vilan ligger händerna strax framför markerbrickan (huden inte över den), inte på dealerns kortplatser (D.C1-D.C3, ett
// kort 63 x 88 mm, minst VILA.kortLuft ifrån) och inte vid skon (VILA.skoLuft), fingrarna Paows vila lätt böjd (ring- och
// lillfingret lite mer) och lite isär; av hur långt från mitten och hur långt framför brickan de ligger och hur böjda
// fingrarna är väljs det som ger armbågen närmast kroppen.
const VILA = {luft: 0.012, overBrickan: 0.004, overFilten: 0.0015, ligger: 0.0025, handled: 20, kortLuft: 0.01, skoLuft: 0.02, pol: unit([0, -1, -0.25] as Vec3),
  isar: [0.15, 0.17, 0.19, 0.21], fram: [0, 0.02, 0.04], krok: [0.5, 1],
  /** En krok: grader till i knogen, mellanleden och ytterleden, pekfingret till lillfingret gånger `fingrar`; isär: grader ut i knogen från långfingret. */
  enKrok: [8, 12, 6] as const, fingrar: [0.8, 1, 1.15, 1.3], isarGrader: [-4, 0, 4, 8]};
const bord = bordet(path.join(ROOT, STANDARDBORD.fil), SITS.kantBak), kant: Kant = {...kantFor(modell, bord), luft: VILA.luft}, radie = kant.radie;
const hudar = {Right: handHud(modell, 'Right'), Left: handHud(modell, 'Left')};
const plan = JSON.parse(readFileSync(path.join(ROOT, 'blackjack-dealer/placements/default.json'), 'utf8')) as Plan;
const kortplatser = spots(plan, lens).filter(s => /^D\.C[123]$/.test(s.id)).sort((a, b) => a.id.localeCompare(b.id));
/** Hur långt handens hud är från en kortplats på filten (meter, sett uppifrån; negativ: över den, så långt in). */
const franKortet = (h: Vec3[], at: Vec3) => { const W = CARD.width / 2, L = CARD.height / 2; let ute = Infinity, inne = 0;
  for (const q of h) { const dx = Math.abs(q[0] - at[0]) - W, dz = Math.abs(q[2] - at[2]) - L; if (dx < 0 && dz < 0) inne = Math.max(inne, Math.min(-dx, -dz)); else ute = Math.min(ute, Math.hypot(Math.max(0, dx), Math.max(0, dz))); }
  return inne > 0 ? -inne : ute; };
const franSkon = (h: Vec3[]) => Math.min(...h.map(q => Math.min(franLadan(bord.sko.kropp, q), franLadan(bord.sko.front, q))));
const vinkel = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b))))) * 180 / Math.PI;
/** Formen med fingrarna böjda `k` krokar till och isär (VILA), varje ben sin längd. */
function krokad(S: Vec3[], k: number): Vec3[] {
  const out = S.map(q => [...q] as Vec3), b = bendsOf(S), o = Math.sign(S[17][2] - S[5][2]) || 1;
  for (let f = 1; f <= 4; f++) { const c = FINGERS[f], m = VILA.fingrar[f - 1] * k;
    fingerFrom(S, f, {flex: b[f - 1].flex.map((x, j) => x + VILA.enKrok[j] * m) as [number, number, number], side: [b[f - 1].side[0] + o * VILA.isarGrader[f - 1], b[f - 1].side[1], b[f - 1].side[2]]}, [1, 2, 3].map(j => benLangd(S, c[j - 1], c[j]))).forEach((q, j) => { out[c[j + 1]] = q; }); }
  return out.map(r4);
}
type Lagd = {kostar: number; w: Vec3; a: Axes; e: Vec3; p: Vec3[]; S: Vec3[]; ut: number; handled: number; palm: number; fingrar: number; luft: number; inat: number; lutad: number; kort: number[]; sko: number};
/**
 * Handen `sida` med formen `S` lagd på filten som ovan: dess mitt (handleden och knogarna) på x `mittX`, och antingen
 * strax framför brickan (`framom` meter till) eller med mitten på z `mittZ`. `bas` ger handflatans rullning kring handen.
 * Av lutningarna väljs den som ger armbågen närmast kroppen och handleden rakast; null om ingen håller.
 */
function lagg(sida: 'Right' | 'Left', S: Vec3[], bas: Axes, pol: Vec3, mittX: number, z: {framom: number} | {mittZ: number}, nej: Record<string, number>): Lagd | null {
  const i = sida === 'Right' ? 0 : 1, ut = i ? 1 : -1, s = fram.shoulders[i], hud = hudar[sida], mitten = (p: Vec3[]) => mul([0, 5, 9, 13, 17].reduce((a, k) => add(a, p[k]), [0, 0, 0] as Vec3), 0.2);
  const flatt = (v: Vec3) => unit([v[0], 0, v[2]]), yawAv = (v: Vec3) => Math.atan2(v[0], v[2]);
  let bast: Lagd | null = null;
  for (let th = -10; th <= 30; th += 1.25) {
    let w: Vec3 = [mittX, 0.03, 'mittZ' in z ? z.mittZ - 0.08 : bord.brickaFram + 0.06], e = arm(s, w, pol, dollUtanVila).elbow, a = bas;
    for (let k = 0; k < 8; k++) {
      // (handen vriden kring lodlinjen så att den pekar som underarmen, och lutad th mot handflatan)
      const vrid = yawAv(flatt(sub(w, e))) - yawAv(flatt(bas.forward)), yaw = (v: Vec3) => turned(v, [0, 1, 0], vrid), a0: Axes = {forward: yaw(bas.forward), palm: yaw(bas.palm), across: yaw(bas.across)}, tip = (v: Vec3) => turned(v, a0.across, -rad(th));
      a = {forward: tip(a0.forward), palm: tip(a0.palm), across: a0.across};
      const p0 = placed(S, a, w), m0 = mitten(p0); w = add(w, [mittX - m0[0], 0, 'mittZ' in z ? z.mittZ - m0[2] : 0]);
      const hornen = hud.stall(placed(S, a, w), e), lagst = Math.min(...hornen.map(q => q[1])), bakerst = Math.min(...hornen.map(q => q[2]));
      w = add(w, [0, VILA.overFilten - lagst, 'framom' in z ? bord.brickaFram + VILA.overBrickan + z.framom - bakerst : 0]);
      e = armbageOverKanten(s, w, pol, dollUtanVila, kant, ut).e; }
    const p = placed(S, a, w), hornen = hud.stall(p, e), luft = underarmLuft(e, w, kant), handled = vinkel(sub(w, e), sub(p[9], p[0]));
    const palm = Math.min(...hornen.filter((_, k) => hud.finger[k] === -1).map(q => q[1])), fingrar = Math.min(...hornen.filter((_, k) => hud.finger[k] > 0).map(q => q[1])), utCm = (e[0] - s[0]) * ut * 100;
    const kort = kortplatser.map(c => franKortet(hornen, c.at)), sko = franSkon(hornen), bakerst = Math.min(...hornen.map(q => q[2]));
    // (handflatan och fingrarna båda på filten: ingen av dem mer än VILA.ligger över den lägsta huden)
    if (luft < VILA.luft - 1e-4) { nej.luft++; continue; } if (handled > VILA.handled) { nej.handled++; continue; } if (palm > VILA.overFilten + VILA.ligger || fingrar > VILA.overFilten + VILA.ligger) { nej.filten++; continue; }
    if (bakerst < bord.brickaFram) { nej.brickan++; continue; }
    const kostar = utCm + 0.3 * handled;
    if (!bast || kostar < bast.kostar) bast = {kostar, w, a, e, p, S, ut: utCm, handled, palm, fingrar, luft, inat: Math.round(Math.atan2(-ut * a.forward[0], a.forward[2]) * 180 / Math.PI), lutad: th, kort, sko}; }
  return bast;
}
type Vila = Lagd & {isar: number; framom: number; krok: number};
function vilaFor(sida: 'Right' | 'Left'): Vila {
  // (vänsterhanden utgår från högerns läge i Paows vila, spegelvänt: standarddockan är lika på båda sidor)
  const spegel = (v: Vec3): Vec3 => [-v[0], v[1], v[2]], hogerBas = axlarAv(P.rest!.at.right), i = sida === 'Right' ? 0 : 1, ut = i ? 1 : -1;
  const bas: Axes = i ? {forward: spegel(hogerBas.forward), palm: spegel(hogerBas.palm), across: cross(spegel(hogerBas.palm), spegel(hogerBas.forward))} : hogerBas;
  let bast: Vila | null = null; const nej = {fel: 0, luft: 0, handled: 0, filten: 0, brickan: 0, kort: 0, sko: 0};
  for (const krok of VILA.krok) { const S = krokad(i ? hand.rest!.left : hand.rest!.right, krok); if (handFaults(placed(S, bas, [0, 0, 0]), SIGN[i], null, null).some(x => x.kind === 'led' || x.kind === 'i varandra')) { nej.fel++; continue; }
    for (const framom of VILA.fram) for (const isar of VILA.isar) { const l = lagg(sida, S, bas, VILA.pol, place.x + ut * isar, {framom}, nej); if (!l) continue;
      if (Math.min(...l.kort) < VILA.kortLuft) { nej.kort++; continue; } if (l.sko < VILA.skoLuft) { nej.sko++; continue; }
      const kostar = l.kostar + 2 * Math.abs(krok - 1) + 30 * framom; if (!bast || kostar < bast.kostar) bast = {...l, kostar, isar, framom, krok}; } }
  if (!bast) throw Error(`${sida}: ingen vila med underarmen över kanten, handen på filten som underarmen och fri från korten och skon (förkastade: ${JSON.stringify(nej)}).`);
  return bast;
}
const vila = [vilaFor('Right'), vilaFor('Left')];
const restAt = (v: Lagd): HandPlace => ({wrist: r4(v.w), forward: r4(v.a.forward), palm: r4(v.a.palm)});
hand.rest = {right: vila[0].S, left: vila[1].S, at: {right: restAt(vila[0]), left: restAt(vila[1])}};
// Högerhanden i ankaret A2.3: där Paows ligger (hennes handled och knogar i medel), Paows form med hans ben, lagd på
// filten på samma sätt och med armbågen hängande som hennes i ankaret.
const ankarePaow = JSON.parse(readFileSync(path.join(ROOT, 'blackjack-dealer/dealer3d/data/ankare-2-3-paow.json'), 'utf8')) as {frame: {R: {s: Vec3; e: Vec3}}};
const ankR = (() => { const pp = placed(P.right, axlarAv(P.at.right), P.at.right.wrist), m = mul([0, 5, 9, 13, 17].reduce((a, k) => add(a, pp[k]), [0, 0, 0] as Vec3), 0.2), nej = {luft: 0, handled: 0, filten: 0, brickan: 0};
  // (flyttad mot dealern och mitten så lite som håller den borta från dealerns kortplatser, som vilan)
  for (const dz of [0, -0.01, -0.02, -0.03, -0.04]) for (const dx of [0, -0.01, -0.02]) { const l = lagg('Right', hand.right, axlarAv(P.at.right), unit(sub(ankarePaow.frame.R.e, ankarePaow.frame.R.s)), m[0] + dx, {mittZ: m[2] + dz}, nej);
    if (l && Math.min(...l.kort) >= VILA.kortLuft) return l; }
  throw Error(`Högerhanden i ankaret: ingen läggning håller (förkastade: ${JSON.stringify(nej)}).`); })();
hand.at = {...hand.at, right: restAt(ankR)};
const tal = vila.map((v, i) => ({utCm: Math.round(v.ut * 10) / 10, overarm: Math.round(vinkel(sub(v.e, fram.shoulders[i]), [0, -1, 0])), boj: Math.round(vinkel(sub(v.e, fram.shoulders[i]), sub(v.w, v.e))), handled: Math.round(v.handled), luftMm: Math.round(v.luft * 1000), palmMm: mm(v.palm), fingrarMm: mm(v.fingrar),
  isarCm: Math.round(v.isar * 100), framomCm: Math.round(v.framom * 100), inat: v.inat, lutad: v.lutad, krok: v.krok, kortMm: v.kort.map(x => Math.round(x * 1000)), skoMm: Math.round(v.sko * 1000)}));
const hjassanRad = Math.round(see(filmEye(PLAY_LENS), [place.x, place.shoulderHeight + hjassa - mid[1], fram.hip[2]])!.y);
const kropp = kroppen(modell), mageLuft = bord.kantZ - (fram.hip[2] + kropp.mage(place.shoulderHeight - 0.05, place.shoulderHeight - bord.sargUnder));
// (låren mot sargen: sargen är en lodrät skiva i bordets kant ned till sargUnder; lårens hud där de går under kanten)
const larLuft = bord.sargUnder - Math.max(...kropp.lar(fram.hip[1]).map(q => add(q, [place.x, place.shoulderHeight, fram.hip[2]])).filter(q => Math.abs(q[2] - bord.kantZ) < 0.01).map(q => q[1]));

// ---- dockan ---------------------------------------------------------------------------------------------------------
const knogar = (S: Vec3[]) => [5, 9, 13, 17].map(k => mm(length(S[k]))).join('/'), ben = (S: Vec3[], f: number) => [1, 2, 3].map(j => mm(benLangd(S, FINGERS[f][j - 1], FINGERS[f][j]))).join('/');
const toppText = (i: number) => H[i].toppar.map((t, f) => `${['tummen', 'pek', 'lång', 'ring', 'lill'][f]} ${mm(t.radie)}`).join(', ');
const doll: Doll = {...dollUtanVila, hand,
  about: {
    all: `mätt på ${FIL} (dealer3d/tools/docka-standard.ts --docka ${NAMN}): lederna i modellens vilopose som dealer3d/src/figure-model.ts läser dem, och fingertopparna på huden; övertaget från paow där det står så`,
    place: `axellederna (RightArm, LeftArm) mätta ${mm(axelIsar)} mm isär; deras mitt ${SITS.bakom} m bakom spelets kant (där kortplanen räknar med att dealern sitter, som Paow) och ${place.shoulderHeight} m över filten, mitt för Paows; med bordets dealerkant ${SITS.kantBak} m bakom spelets kant har magen ${Math.round(mageLuft * 1000)} mm till den. Höften (Hips) mätt ${mm(hoftAxlar)} mm under axellederna (hennes 505-511), rakt under dem; halsen (neck) och huvudet (huden på Head, hjässa till haka) mätta`,
    upperArm: `mätt: axel- till armbågsled ${overarm.map(mm).join(' och ')} mm (höger, vänster)`,
    forearm: `mätt: armbågs- till handled ${underarm.map(mm).join(' och ')} mm`,
    hipBelowFelt: 'följer av platsen: bålen (place.trunk) minus axlarnas höjd',
    reach: 'gissat som Paows: armarnas summa gånger 0,972',
    mostLean: `gissat: ${Math.round(BAL.luta * 180 / Math.PI)} grader framåt i höften, när armen nästan är utsträckt; en sittande dealer som når långt fram böjer sig mest framåt (Paows 12 grader var för lite för en docka som sitter högre)`, mostTwist: `gissat: ${Math.round(BAL.vrida * 180 / Math.PI)} grader, lutningen gör det mesta (Paows 36 grader såg ut som att hela överkroppen vreds mot platsen)`, elbowPoles: 'övertaget från paow', elbowAtRest: 'övertaget från paow',
    shape: `övertaget från paow (den vita figuren som ritas i ${HANS} ställe; ${HANS} kropp är modellens)`,
    hand: `mätt: handleden (RightHand, LeftHand), tummens rot, mellanled och ytterled (Thumb1-3), varje fingers knoge, mellanled och ytterled (Index1-3 … Pinky1-3) i vilopose; knogarna ${knogar(hoger)} mm från handleden till höger, pekfingrets ben ${ben(hoger, 1)} mm. Topparna mätta på huden: mitt i fingertoppens rundning, en fingerradie innanför fingrets slut (radien vid toppen ${toppText(0)} mm till höger). Formerna (right, left, grip, rest, natural) är Paows former med ${HANS} egna ben: varje fingerled böjd lika mycket som Paows (hand-rule.ts bendsOf), tummens ben pekande som hennes i handens axlar; knogarna och benlängderna är ${HANS}. topp: pek- och långfingrets och tummens topp på huden (radien), 0,3 mm till godo: så långt från kortet och filten lägger givarna topparnas punkter`,
    handAt: `ankaret 2.3 (at): högerhanden där Paows ligger (handens mitt på hennes, flyttad så lite som håller den ${VILA.kortLuft * 1000} mm från dealerns kortplatser: ${ankR.kort.map(x => Math.round(x * 1000)).join('/')} mm), lagd på ${HANS} hud som vilan (docka-standard.ts lagg): pekande som underarmen, lutad ${ankR.lutad} grader, handflatan och fingrarna 1-2 mm över filten, underarmen ${Math.round(ankR.luft * 1000)} mm över filten, armbågen ${Math.round(ankR.ut * 10) / 10} cm ut; vänsterhanden vid skon med Paows axlar och handleden flyttad så att pek-, lång- och ringfingrets toppar i medel ligger där hennes gör på kortet`,
    handAtRest: `vilan (rest och rest.at), lagd på ${HANS} hud (docka-standard.ts vilaFor): händerna strax framför markerbrickan, mitt i handen ${tal.map(t => t.isarCm).join(' och ')} cm från mitten, pekande som underarmen (${tal.map(t => t.inat).join(' och ')} grader inåt, handleden ${tal.map(t => t.handled).join(' och ')} grader böjd), fingrarna Paows vila böjd ${tal.map(t => t.krok).join(' och ')} krokar till och lite isär, handflatan och fingrarna 1-2 mm över filten, underarmen minst ${VILA.luft * 1000} mm över filten där den är över bordet, fria från dealerns kortplatser och skon, och armbågen så nära kroppen som det då går: ${tal.map(t => t.utCm).join(' och ')} cm ut från axeln, överarmen ${tal.map(t => t.overarm).join(' och ')} grader från lodrät, armbågen böjd ${tal.map(t => t.boj).join(' och ')} grader`,
  },
};

// ---- vad det blev --------------------------------------------------------------------------------------------------
console.log(`${FIL}: ${modell.hud.horn.length} hörn i huden`);
console.log(`axlarna ${mm(axelIsar)} mm isär, överarmen ${overarm.map(mm).join('/')} mm, underarmen ${underarm.map(mm).join('/')} mm, höften till axlarna ${mm(hoftAxlar)} mm, hjässan ${mm(hjassa - mid[1])} mm över axellederna`);
SIDOR.forEach((s, i) => { console.log(`${s}: knogar ${knogar(egen[i])} mm; ben ${[0, 1, 2, 3, 4].map(f => ben(egen[i], f)).join(' | ')} mm`);
  console.log(`   toppar: ${H[i].toppar.map((t, f) => `${FINGERNAMN[f]} radie ${mm(t.radie)} mm, ytterleden ${t.vinkel}° från mellanledens linje (${t.horn} hörn)`).join('; ')}`); });
console.log(`platsen: axlarna ${fram.shoulders.map(q => r4(q).join(',')).join(' och ')}, höften ${r4(fram.hip).join(',')}`);
console.log(`bordet: kanten z ${bord.kantZ.toFixed(4)}, filten y ${bord.skivaY.toFixed(4)}, brickan fram till z ${bord.brickaFram.toFixed(4)}, sargen ned till y ${bord.sargUnder.toFixed(3)}; underarmens radie ${radie.map(r => Math.round(r * 1000)).join(' ')} mm`);
for (const [vad, S, at, sign] of [['ankaret höger', hand.right, hand.at.right, 1], ['Naturlig vänster', hand.natural!.left, hand.natural!.at.left, -1], ['vilan höger', hand.rest!.right, hand.rest!.at.right, 1], ['vilan vänster', hand.rest!.left, hand.rest!.at.left, -1]] as const) {
  const p = placed(S as Vec3[], axlarAv(at as HandPlace), (at as HandPlace).wrist), f = handFaults(p, sign, null, null).filter(x => x.kind !== 'ordning' && x.kind !== 'grannen');
  console.log(`${vad}: handleden ${(at as HandPlace).wrist.join(',')}; ${f.length ? f.map(x => x.what).join(' | ') : 'inga fel'}`); }
const rad1 = (t: (typeof tal)[number]) => `${t.isarCm} cm från mitten, ${t.framomCm} cm framför brickan, ${t.inat}° inåt, lutad ${t.lutad}°, ${t.krok} krok, kortplatserna D.C1-3 ${t.kortMm.join('/')} mm, skon ${t.skoMm} mm (negativt: över); armbågen ${t.utCm} cm ut, överarmen ${t.overarm}° från lodrät, böjd ${t.boj}°, handleden ${t.handled}° från underarmen, underarmen ${t.luftMm} mm över filten, handflatan ${t.palmMm} och fingrarna ${t.fingrarMm} mm över filten`;
console.log(`VILAN vid axlarna ${place.shoulderHeight} m över filten, ${SITS.bakom} m bakom spelets kant, bordets kant ${bord.kantBak} m bakom den: höger ${rad1(tal[0])}; vänster ${rad1(tal[1])}; hjässan på rad ${hjassanRad} av 1174 i spelets bild; magen ${Math.round(mageLuft * 1000)} mm från kanten; låren ${Math.round(larLuft * 1000)} mm under sargen${larLuft < 0 ? ' (GENOM sargen)' : ''}`);

if (process.argv.includes('--skriv')) {
  if (arg('--hojd')) throw Error('--skriv tar höjden ur SITS (docka-standard.ts), inte ur --hojd: ändra talet där.');
  const FIL_DOLL = path.join(ROOT, 'blackjack-dealer/dealer3d/src/doll.ts'), text = readFileSync(FIL_DOLL, 'utf8'), KONST = NAMN.toUpperCase();
  const json = (x: unknown) => JSON.stringify(x).replace(/"([A-Za-z_][A-Za-z0-9_]*)":/g, '$1:').replace(/"/g, "'");
  const block = `// <docka ${NAMN}>\n/** Standarddockans ${NAMN === 'man' ? 'man' : 'kvinna'}, mätt på modellen; skriven av dealer3d/tools/docka-standard.ts --docka ${NAMN} --skriv (ändra den inte för hand). */\nexport const ${KONST}: Doll = ${json(doll)};\n// </docka ${NAMN}>\n`;
  const start = text.indexOf(`// <docka ${NAMN}>`), slut = text.indexOf(`// </docka ${NAMN}>`);
  const ny = start >= 0 && slut > start ? text.slice(0, start) + block + text.slice(slut + `// </docka ${NAMN}>\n`.length) : text.replace('\nexport const DOLLS', `\n${block}\nexport const DOLLS`);
  writeFileSync(FIL_DOLL, ny); console.log(`skrev ${KONST} i dealer3d/src/doll.ts`);
}
