// En dockas egna mått ur sin riggade modell (avatar-auto-pipeline bygger den, scen/bygg_docka.py), för en persons docka
// vid livebordet (avatar-auto-pipeline/ny_dealer.py steg 3 skriver dem i dealer3d/src/persondockor.ts). Läser modellen
// som dealer3d/src/figure-model.ts läser den: benens lägen i vilopose och huden som skelettet böjer den. Mäter
// axellederna, överarmen, underarmen, höften till axlarna, halsen, huvudet (huden på Head, hjässa till haka) och handens
// ben och fingertoppar på huden. Handens former är den gemensamma kroppens (dealer3d/src/doll.ts, Danilos och Frasses)
// böjda på modellens egna ben: varje fingerled lika mycket (hand-rule.ts bendsOf och fingerFrom), tummens ben pekande som
// formens i handens axlar. Lägena i hand.at, hand.rest.at och hand.natural.at är den gemensamma kroppens: vid livebordet
// ligger händerna där ankarena har dem (dealer3d/data/ankare-*-<docka>.json).
//   node dealer3d/tools/docka-matt.ts --fil <glb, sökvägen från casino-roten>
// Skriver måtten och sist en rad "DOCKAN (<fil>) i doll.ts form: <JSON>" (name, upperArm, forearm, hand och place).
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {lasDocka} from './modell.ts';
import {fingertopp} from '../src/fingertopp.ts';
import {add, length, mul, sub, unit, type Vec3} from '../../src/space.ts';
import {DANILO, type DollHand} from '../src/doll.ts';
import {FINGERS, axesOf, local} from '../src/hand-pose.ts';
import {bendsOf, fingerFrom} from '../src/hand-rule.ts';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const FIL = arg('--fil'); if (!FIL) throw Error('--fil <glb> saknas (sökvägen från casino-roten).');
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const mm = (m: number) => Math.round(m * 10000) / 10, r4 = (v: Vec3): Vec3 => v.map(x => Math.round(x * 10000) / 10000 || 0) as Vec3, t4 = (n: number) => Math.round(n * 10000) / 10000;

// ---- måtten ---------------------------------------------------------------------------------------------------------
const modell = lasDocka(path.join(ROOT, FIL)), {led} = modell;
const SIDOR = ['Right', 'Left'] as const, FINGERNAMN = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'] as const;
const medel = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
const mid = mul(add(led('RightArm'), led('LeftArm')), 0.5), axelIsar = length(sub(led('RightArm'), led('LeftArm')));
const overarm = SIDOR.map(s => length(sub(led(`${s}Arm`), led(`${s}ForeArm`)))), underarm = SIDOR.map(s => length(sub(led(`${s}ForeArm`), led(`${s}Hand`))));
const hoftAxlar = length(sub(led('Hips'), mid));
const domin = modell.hud.pa.map(p => modell.hud.leder[p.reduce((a, b) => b.vikt > a.vikt ? b : a).led]);
const huvudHorn = modell.hud.horn.filter((_, i) => domin[i] === 'Head'), huvudMitt = mul(huvudHorn.reduce((s, p) => add(s, p), [0, 0, 0] as Vec3), 1 / huvudHorn.length);
const hjassa = Math.max(...huvudHorn.map(p => p[1])), haka = Math.min(...huvudHorn.map(p => p[1]));
/** Fingertoppen på huden (dealer3d/src/fingertopp.ts). */
function topp(side: string, finger: string) {
  const moln = modell.pa(`${side}Hand${finger}3`), t = fingertopp(led(`${side}Hand${finger}2`), led(`${side}Hand${finger}3`), moln); if (!t) throw Error(`${side} ${finger}: för få hörn på det tredje benet.`);
  return t;
}
/** Handens 21 punkter i modellens vilopose (MediaPipes ordning: handleden, sedan tummen till lillfingret från roten ut). */
const handen = (side: typeof SIDOR[number]) => { const p: Vec3[] = [led(`${side}Hand`)], toppar: ReturnType<typeof topp>[] = [];
  for (const f of FINGERNAMN) { for (const n of [1, 2, 3]) p.push(led(`${side}Hand${f}${n}`)); const t = topp(side, f); toppar.push(t); p.push(t.punkt); }
  return {p, toppar}; };
const H = SIDOR.map(handen), SIGN = [1, -1];
/** Händerna i vilopose, i handens egna axlar (hand-pose.ts), höger och vänster. */
const [hoger, vanster] = H.map((h, i) => local(h.p, axesOf(h.p, SIGN[i])).map(r4));

// ---- handens former -----------------------------------------------------------------------------------------------
const benLangd = (S: Vec3[], a: number, b: number) => length(sub(S[b], S[a]));
/** Den egna handen böjd som formen `form`: varje fingerled lika mycket, från dess knoge och med dess benlängder; tummens ben pekande som formens. */
function bojdSom(egen: Vec3[], form: Vec3[]): Vec3[] {
  const S = egen.map(q => [...q] as Vec3), b = bendsOf(form);
  for (let f = 1; f <= 4; f++) { const c = FINGERS[f]; fingerFrom(S, f, b[f - 1], [1, 2, 3].map(j => benLangd(egen, c[j - 1], c[j]))).forEach((q, j) => { S[c[j + 1]] = q; }); }
  const t = FINGERS[0]; for (let j = 1; j <= 3; j++) S[t[j]] = add(S[t[j - 1]], mul(unit(sub(form[t[j]], form[t[j - 1]])), benLangd(egen, t[j - 1], t[j])));
  return S.map(r4);
}
const B = DANILO.hand!;
const hand: DollHand = {anchor: B.anchor, right: bojdSom(hoger, B.right), left: bojdSom(vanster, B.left), at: B.at,
  // (topparnas tjocklek på huden: pek- och långfingrets, och tummens, med 0,3 mm till godo)
  topp: {finger: t4(Math.max(H[0].toppar[1].radie, H[0].toppar[2].radie, H[1].toppar[1].radie, H[1].toppar[2].radie) + 0.0003), thumb: t4(Math.max(H[0].toppar[0].radie, H[1].toppar[0].radie) + 0.0003)},
  grip: {right: bojdSom(hoger, B.grip!.right), left: bojdSom(vanster, B.grip!.left)},
  rest: {right: bojdSom(hoger, B.rest!.right), left: bojdSom(vanster, B.rest!.left), at: B.rest!.at},
  natural: {left: bojdSom(vanster, B.natural!.left), at: B.natural!.at}};

// ---- vad det blev --------------------------------------------------------------------------------------------------
const upperArm = Math.round(medel(overarm) * 1000) / 1000, forearm = Math.round(medel(underarm) * 1000) / 1000;
const place = {shouldersApart: t4(axelIsar), trunk: t4(hoftAxlar), neck: r4(sub(led('neck'), mid)), head: r4(sub(huvudMitt, mid)), headRadius: t4((hjassa - haka) / 2)};
console.log(`${FIL}: ${modell.hud.horn.length} hörn i huden`);
console.log(`axlarna ${mm(axelIsar)} mm isär, överarmen ${overarm.map(mm).join('/')} mm, underarmen ${underarm.map(mm).join('/')} mm, höften till axlarna ${mm(hoftAxlar)} mm, hjässan ${mm(hjassa - mid[1])} mm över axellederna`);
SIDOR.forEach((s, i) => console.log(`${s}: toppar ${H[i].toppar.map((t, f) => `${FINGERNAMN[f]} radie ${mm(t.radie)} mm`).join(', ')}`));
console.log(`DOCKAN (${FIL}) i doll.ts form: ${JSON.stringify({name: path.basename(FIL, '.glb').replace(/^standarddocka_/, ''), upperArm, forearm, hand, place})}`);
