// Mäter en av paketets rörelser utan webbläsare: vad händerna, huvudet och bålen gör över tiden, och var rörelsen
// naturligt delar sig i bitar (en giv, en blandning, ett kort som vänds, en gest).
//   node kortspelspaket/verktyg/mat.ts AS_Poker_Dealer_Shuffling_01            bitarna och en tidslinje var 0,2 s
//   node kortspelspaket/verktyg/mat.ts AS_Poker_Dealer_Shuffling_01 --steg 0.1 tätare tidslinje (--steg 0 ingen)
//   node kortspelspaket/verktyg/mat.ts --alla                                  alla 66: längd och bitarna, en rad per bit
//   --kort           en rad per bit också för en namngiven rörelse (som --alla skriver)
//   --sparade        mäter bitarna som står i sekvenser.json i stället för att föreslå egna (för att kontrollera dem)
//   --bilder <mapp>  ritar varje bit som en rad streckgubbar, <mapp>/<AS_namn>.png (inget grafikkort; lägg dem i slasken)
//   --rutor <n>      lägen per rad i bilden (förval 8; färre ger större gubbar, där fingrarna syns)
//   --json           förslagen i sekvenser.json:s form ({"<AS_namn>": [{"namn": "", "fran": ..., "till": ...}]}), utan namn
//   --still <cm/s>   farten under vilken något räknas som stilla (förval 4)
//   --paus <s>       kortaste stillheten som delar (förval 0.3)
// Läser kortspelspaket/paket/fbx/CardGamesAnimationPack/Animations/<AS_namn>.FBX (node kortspelspaket/packa-upp.ts
// packar upp dem) med three.js ur blackjack-dealer/node_modules. Paketets mått: centimeter, z upp, bordets mitt i
// origo med skivan 78 cm över golvet, och den som sitter 115 cm ut på y, vänd mot minus y. Verktyget skriver i den
// sittandes egna ord: fram (mot bordets mitt), hö/vä (figurens egen sida) och upp (över skivan).
// En bit är tiden mellan två stillheter: båda handlederna långsammare än --still, och huvudet och bröstet långsammare
// än det dubbla, i minst --paus.
// För varje bit: vilken hand som rör sig och hur långt, var den är längst från där den började, hållpunkterna (där den
// stannar upp eller vänder, med greppet där: öppen, pekar, två fingrar, nyper, knuten eller kupad), handflatans håll
// (ner mot bordet eller upp), hur nära händerna kommer varandra och huvudet, och hur huvudet och bålen rör sig.
// Inne i en lång bit utan stillhet står andhålen: stunderna då farten är som lägst, där en bit kan delas för hand.
// Streckgubbarna ses snett framifrån och uppifrån: höger arm röd, vänster blå, strecket ur huvudet är näsan, rutan är
// bordsskivan, och talet i hörnet är tiden. Namnen sätts av den som läser: talen och strecken säger vad kroppen gör,
// inte vad det betyder (titta.ts tar en riktig bild vid tveksamhet). Bitarna sparas genom visarens server (README).
import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {crc32, deflateSync} from 'node:zlib';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ANIMS = path.join(ROOT, 'kortspelspaket/paket/fbx/CardGamesAnimationPack/Animations');
const three = (file: string) => pathToFileURL(path.join(ROOT, 'blackjack-dealer/node_modules/three', file)).href;
const T = await import(three('build/three.module.js')) as typeof import('three');
const {FBXLoader} = await import(three('examples/jsm/loaders/FBXLoader.js')) as typeof import('three/addons/loaders/FBXLoader.js');

const VALUED = ['--still', '--paus', '--steg', '--bilder', '--rutor'];
const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const STILL = Number(arg('--still') ?? 4), PAUSE = Number(arg('--paus') ?? 0.3), STEP = Number(arg('--steg') ?? 0.2), SHEETS = arg('--bilder');
const ALL = process.argv.includes('--alla'), JSON_OUT = process.argv.includes('--json'), SAVED = process.argv.includes('--sparade'), BRIEF = process.argv.includes('--kort');
const asked = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !VALUED.includes(all[i - 1]));
if (!ALL && !asked.length || [STILL, PAUSE, STEP].some(n => !Number.isFinite(n) || n < 0)) { console.error('Användning: node kortspelspaket/verktyg/mat.ts <AS_namn> [...] | --alla  [--kort] [--sparade] [--bilder <mapp>] [--rutor 8] [--json] [--steg 0.2] [--still 4] [--paus 0.3]'); process.exit(2); }

const FPS = 30, TABLE = 78, MARGIN = 0.1;
type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const dist = (a: V, b: V) => len(sub(a, b));
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const r1 = (n: number) => n.toFixed(1), r0 = (n: number) => n.toFixed(0), r2 = (n: number) => Math.round(n * 100) / 100;

/** De led som mäts. Handflatan räknas ur handleden och pekfingrets och lillfingrets knogar, greppet ur fingrarnas led. */
const FINGERS = ['index', 'middle', 'ring', 'pinky'] as const, CHAIN = ['metacarpal', '01', '02', '03'] as const;
const JOINTS = ['head', 'spine_05', 'pelvis', ...(['r', 'l'] as const).flatMap(side => [`hand_${side}`, `thumb_03_${side}`, ...FINGERS.flatMap(f => CHAIN.map(c => `${f}_${c}_${side}`))])];
/** En streckgubbe: benen som streck (med sin sida), huvudets mitt och åt vilket håll ansiktet ser. */
type Pose = {sticks: {a: V; b: V; side: string; thin: boolean}[]; head: V; face: V};
type Motion = {name: string; dur: number; n: number; at: Record<string, V[]>; speed: {r: number[]; l: number[]; head: number[]; chest: number[]}; busy: number[]; pose: (t: number) => Pose};

async function read(name: string): Promise<Motion> {
  const file = await readFile(path.join(ANIMS, `${name}.FBX`)).catch(() => { throw Error(`${name} finns inte i paket/fbx (node kortspelspaket/packa-upp.ts packar upp paketet).`); });
  const obj = new FBXLoader().parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer, '');
  const clip = obj.animations[0];
  if (!clip) throw Error(`${name} har ingen animation.`);
  const mixer = new T.AnimationMixer(obj); mixer.clipAction(clip).play();
  const stand = (t: number) => { mixer.setTime(Math.min(Math.max(t, 0), clip.duration - 1e-4)); obj.updateMatrixWorld(true); };
  const p = new T.Vector3(), q = new T.Quaternion();
  const spot = (o: import('three').Object3D): V => { o.getWorldPosition(p); return [p.x, p.y, p.z]; };
  const bones = Object.fromEntries(JOINTS.map(j => [j, obj.getObjectByName(j)])) as Record<string, import('three').Object3D | undefined>;
  const missing = JOINTS.filter(j => !bones[j]);
  if (missing.length) throw Error(`${name} saknar leden ${missing.join(', ')}.`);
  const n = Math.max(2, Math.round(clip.duration * FPS) + 1), at = Object.fromEntries(JOINTS.map(j => [j, [] as V[]])) as Record<string, V[]>;
  for (let i = 0; i < n; i++) { stand(i / FPS); for (const j of JOINTS) at[j].push(spot(bones[j]!)); }
  // Farten i cm/s: skillnaden över två bilder, jämnad över fem (inspelningen darrar annars över gränsen för stilla).
  const speedOf = (ps: V[]) => {
    const raw = ps.map((_, i) => dist(ps[Math.min(n - 1, i + 1)], ps[Math.max(0, i - 1)]) * FPS / (Math.min(n - 1, i + 1) - Math.max(0, i - 1)));
    return raw.map((_, i) => { let s = 0, c = 0; for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) { s += raw[k]; c++; } return s / c; });
  };
  const speed = {r: speedOf(at.hand_r), l: speedOf(at.hand_l), head: speedOf(at.head), chest: speedOf(at.spine_05)};
  // Huvudet och bröstet räknas till hälften: de vaggar efter en handrörelse utan att något händer, men en nick eller en
  // som lutar sig bakåt (reaktionerna) ska ändå bli en bit.
  const busy = speed.r.map((_, i) => Math.max(speed.r[i], speed.l[i], speed.head[i] / 2, speed.chest[i] / 2));
  // Streckgubben: varje ben mot sin förälder, utan hjälpbenen (ik_*, interaction, center_of_mass) och roten.
  const limbs: import('three').Object3D[] = [];
  obj.traverse(o => { if ((o as import('three').Bone).isBone && o.parent?.name !== 'root' && (o.parent as import('three').Bone | null)?.isBone && !/^(ik_|interaction|center_of_mass)/.test(o.name)) limbs.push(o); });
  const pose = (t: number): Pose => {
    stand(t);
    // Huvudets ben pekar uppåt med sin x-axel och bakåt med sin y-axel (mätt i vilan): mitten ligger 9 cm upp, näsan mot minus y.
    bones.head!.getWorldQuaternion(q);
    const up = new T.Vector3(1, 0, 0).applyQuaternion(q), face = new T.Vector3(0, -1, 0).applyQuaternion(q), neck = spot(bones.head!);
    return {
      sticks: limbs.map(o => ({a: spot(o.parent!), b: spot(o), side: /_r$/.test(o.name) ? 'r' : /_l$/.test(o.name) ? 'l' : '', thin: /^(thumb|index|middle|ring|pinky)_/.test(o.name)})),
      head: [neck[0] + up.x * 9, neck[1] + up.y * 9, neck[2] + up.z * 9], face: [face.x, face.y, face.z],
    };
  };
  return {name, dur: clip.duration, n, at, speed, busy, pose};
}

/** En bit: bilderna där något rör sig (till och med) och tiderna med marginal. */
type Cut = {a: number; b: number; fran: number; till: number; namn: string};
const travel = (ps: V[], c: {a: number; b: number}) => { let d = 0; for (let i = c.a + 1; i <= c.b; i++) d += dist(ps[i], ps[i - 1]); return d; };
/** Bitarna mellan stillheterna, med en tiondels marginal men aldrig förbi mitten av stillheten mot grannen. */
function propose(m: Motion): Cut[] {
  const spans: {a: number; b: number}[] = [], min = Math.round(PAUSE * FPS);
  let start = -1, quiet = 0;
  for (let i = 0; i <= m.n; i++) {
    const moving = i < m.n && m.busy[i] >= STILL;
    if (moving) { if (start < 0) start = i; quiet = 0; }
    else if (start >= 0 && (++quiet >= min || i === m.n)) { spans.push({a: start, b: i - quiet}); start = -1; quiet = 0; }
  }
  // En ryckning är ingen bit: kortare än en kvarts sekund, eller ingen hand och inget huvud som flyttar sig 3 cm.
  const found = spans.filter(s => s.b - s.a >= FPS / 4 && (['hand_r', 'hand_l', 'head'] as const).some(j => travel(m.at[j], s) >= 3));
  return found.map((s, k) => {
    const before = k ? (found[k - 1].b + s.a) / 2 / FPS : 0, after = k < found.length - 1 ? (s.b + found[k + 1].a) / 2 / FPS : m.dur;
    return {...s, fran: r2(Math.max(before, s.a / FPS - MARGIN, 0)), till: r2(Math.min(after, s.b / FPS + MARGIN, m.dur)), namn: ''};
  });
}
/** Bitarna som de står sparade i sekvenser.json. */
const savedFile = SAVED ? JSON.parse(await readFile(path.join(ROOT, 'kortspelspaket/sekvenser.json'), 'utf8').catch(() => '{}')) as Record<string, {namn: string; fran: number; till: number}[]> : {};
const saved = (m: Motion): Cut[] => (savedFile[m.name] ?? []).map(c => ({a: Math.min(m.n - 1, Math.round(c.fran * FPS)), b: Math.min(m.n - 1, Math.round(c.till * FPS)), fran: c.fran, till: c.till, namn: c.namn}));

/** Ett läge i den sittandes ord: fram mot bordets mitt, åt figurens egen högra eller vänstra sida, och över skivan. */
const where = (p: V, hip: V) => `fram ${r0(hip[1] - p[1])}, ${p[0] - hip[0] <= 0 ? 'hö' : 'vä'} ${r0(Math.abs(p[0] - hip[0]))}, upp ${r0(p[2] - TABLE)}`;
/** Handflatans håll: −1 rakt ner mot bordet, +1 rakt upp. */
function palm(m: Motion, side: 'r' | 'l', i: number) {
  const hand = m.at[`hand_${side}`][i], n = cross(sub(m.at[`index_01_${side}`][i], hand), sub(m.at[`pinky_01_${side}`][i], hand));
  return (side === 'r' ? 1 : -1) * n[2] / (len(n) || 1);
}
const palmWord = (z: number) => z < -0.5 ? 'ner' : z > 0.5 ? 'upp' : z < -0.2 ? 'snett ner' : z > 0.2 ? 'snett upp' : 'på kant';
/** Greppet: hur raka fingrarna är (fingertoppens avstånd från handleden mot fingrets hela längd) och om tummen möter pekfingret. */
function grip(m: Motion, side: 'r' | 'l', i: number) {
  const hand = m.at[`hand_${side}`][i];
  const straight = FINGERS.map(f => {
    const chain = [hand, ...CHAIN.map(c => m.at[`${f}_${c}_${side}`][i])];
    let whole = 0; for (let k = 1; k < chain.length; k++) whole += dist(chain[k], chain[k - 1]);
    return dist(chain[chain.length - 1], hand) / whole;
  });
  // Mätt i paketet: en hand som vilar platt har 0,96–0,99 i alla fingrar, en som håller ett kort 0,7–0,9, en knuten
  // näve 0,5–0,6; tummens och pekfingrets yttersta led ligger 8 cm isär i vilan och 4 när de tar ett kort.
  const pinch = dist(m.at[`thumb_03_${side}`][i], m.at[`index_03_${side}`][i]), mean = (straight[0] + straight[1] + straight[2] + straight[3]) / 4;
  return straight.every(s => s < 0.66) ? 'knuten' : pinch < 4.5 ? 'nyper' : mean > 0.93 ? 'öppen'
    : straight[0] > 0.92 && straight[1] > 0.92 && straight[2] < 0.82 && straight[3] < 0.84 ? 'två fingrar' : straight[0] > 0.92 && (mean * 4 - straight[0]) / 3 < 0.84 ? 'pekar' : 'kupad';
}

function describe(m: Motion, s: Cut, nr: number) {
  const hip = m.at.pelvis[s.a], at = (i: number) => (i / FPS).toFixed(2), lines = [`  Bit ${nr}: ${s.fran.toFixed(2)}–${s.till.toFixed(2)} s (${r1(s.till - s.fran)} s)${s.namn ? `  "${s.namn}"` : ''}`];
  for (const side of ['r', 'l'] as const) {
    const ps = m.at[`hand_${side}`], way = travel(ps, s), label = side === 'r' ? 'höger' : 'vänster';
    if (way < 5) { lines.push(`    ${label} hand stilla (${where(ps[s.a], hip)})`); continue; }
    let far = s.a, high = s.a, fastest = s.a;
    for (let i = s.a; i <= s.b; i++) { if (dist(ps[i], ps[s.a]) > dist(ps[far], ps[s.a])) far = i; if (ps[i][2] > ps[high][2]) high = i; if (m.speed[side][i] > m.speed[side][fastest]) fastest = i; }
    const palms = [s.a, far, s.b].map(i => palmWord(palm(m, side, i)));
    lines.push(`    ${label} hand: väg ${r0(way)} cm, längst ut ${r0(dist(ps[far], ps[s.a]))} cm vid ${at(far)} s (${where(ps[far], hip)}; x ${r0(ps[far][0])}, y ${r0(ps[far][1])}, z ${r0(ps[far][2])}), ` +
      `högst ${r0(ps[high][2] - TABLE)} över skivan vid ${at(high)} s, fortast ${r0(m.speed[side][fastest])} cm/s, slutar ${r0(dist(ps[s.b], ps[s.a]))} cm från början, handflatan ${new Set(palms).size > 1 ? palms.join(' → ') : palms[0]}`);
    // Hållpunkterna: där handen stannar upp eller vänder (farten som lägst, under 40 % av bitens högsta). De ritar vägen:
    // en knackning är upp och ner på samma ställe, en vinkning sida till sida, en giv ut och hem.
    const stops = [s.a], sp = m.speed[side];
    for (let i = s.a + 3; i <= s.b - 3; i++) {
      let low = sp[i] < 0.4 * sp[fastest] && i - stops[stops.length - 1] >= 5;
      for (let k = i - 3; k <= i + 3 && low; k++) if (sp[k] < sp[i] || sp[k] === sp[i] && k < i) low = false;
      if (low) stops.push(i);
    }
    stops.push(s.b);
    if (way >= 12) lines.push(`      ${label} hands hållpunkter: ${stops.slice(0, 14).map(i => `${at(i)} (${where(ps[i], hip)}, ${grip(m, side, i)}${palmWord(palm(m, side, i)) === 'ner' ? '' : `, flatan ${palmWord(palm(m, side, i))}`})`).join(' → ')}${stops.length > 14 ? ` → och ${stops.length - 14} till, slutar ${at(s.b)}` : ''}`);
  }
  let near = s.a, faceR = s.a, faceL = s.a;
  for (let i = s.a; i <= s.b; i++) {
    if (dist(m.at.hand_r[i], m.at.hand_l[i]) < dist(m.at.hand_r[near], m.at.hand_l[near])) near = i;
    if (dist(m.at.hand_r[i], m.at.head[i]) < dist(m.at.hand_r[faceR], m.at.head[faceR])) faceR = i;
    if (dist(m.at.hand_l[i], m.at.head[i]) < dist(m.at.hand_l[faceL], m.at.head[faceL])) faceL = i;
  }
  lines.push(`    händerna närmast varandra ${r0(dist(m.at.hand_r[near], m.at.hand_l[near]))} cm vid ${at(near)} s; närmast huvudet: höger ${r0(dist(m.at.hand_r[faceR], m.at.head[faceR]))} cm vid ${at(faceR)} s, vänster ${r0(dist(m.at.hand_l[faceL], m.at.head[faceL]))} cm vid ${at(faceL)} s`);
  // Huvudet och bålen: hur långt de går, och åt vilket håll huvudet är som längst från där det började.
  const headWay = travel(m.at.head, s), chestWay = travel(m.at.spine_05, s);
  if (headWay >= 8 || chestWay >= 8) {
    let far = s.a; for (let i = s.a; i <= s.b; i++) if (dist(m.at.head[i], m.at.head[s.a]) > dist(m.at.head[far], m.at.head[s.a])) far = i;
    const d = sub(m.at.head[far], m.at.head[s.a]);
    lines.push(`    huvudet: väg ${r0(headWay)} cm, bröstet ${r0(chestWay)} cm; huvudet längst bort vid ${at(far)} s: ${r0(Math.abs(d[1]))} cm ${d[1] < 0 ? 'framåt' : 'bakåt'}, ${r0(Math.abs(d[0]))} cm åt ${d[0] <= 0 ? 'höger' : 'vänster'}, ${r0(Math.abs(d[2]))} cm ${d[2] >= 0 ? 'upp' : 'ner'}`);
  }
  // Andhål: där farten är som lägst inne i en lång bit, minst 0,8 s från bitens ändar och från varandra.
  if (s.b - s.a > 3 * FPS) {
    const gap = Math.round(0.8 * FPS), dips: number[] = [];
    for (let i = s.a + gap; i <= s.b - gap; i++) {
      let low = true; for (let k = i - gap; k <= i + gap && low; k++) if (m.busy[k] < m.busy[i] || m.busy[k] === m.busy[i] && k < i) low = false;
      if (low && m.busy[i] < 3 * STILL) dips.push(i);
    }
    if (dips.length) lines.push(`    andhål: ${dips.map(i => `${at(i)} s (${r0(m.busy[i])} cm/s)`).join(', ')}`);
  }
  return lines;
}

/** Biten på en rad, för översikten: var varje hand är längst ut, och hur långt huvudet går. */
function brief(m: Motion, s: Cut) {
  const hip = m.at.pelvis[s.a], parts = (['r', 'l'] as const).map(side => {
    const ps = m.at[`hand_${side}`], label = side === 'r' ? 'hö' : 'vä';
    if (travel(ps, s) < 5) return `${label} stilla`;
    let far = s.a; for (let i = s.a; i <= s.b; i++) if (dist(ps[i], ps[s.a]) > dist(ps[far], ps[s.a])) far = i;
    return `${label} hand ${r0(dist(ps[far], ps[s.a]))} cm ut vid ${(far / FPS).toFixed(2)} (${where(ps[far], hip)})`;
  });
  const head = travel(m.at.head, s);
  return `${s.fran.toFixed(2)}–${s.till.toFixed(2)}${s.namn ? `  "${s.namn}"` : ''}  ${parts.join(' · ')}${head >= 8 ? ` · huvudet ${r0(head)} cm` : ''}`;
}

function timeline(m: Motion) {
  const every = Math.max(1, Math.round(STEP * FPS)), hip = m.at.pelvis[0], lines = ['  Tidslinje (läget räknat från höften vid start; fart i cm/s; # = 10 cm/s för den snabbaste handen; · = stilla):', '      s   höger hand                     fart  flata      vänster hand                   fart  flata      huvud  isär'];
  const cell = (side: 'r' | 'l', i: number) => `${where(m.at[`hand_${side}`][i], hip).padEnd(30)} ${r0(m.speed[side][i]).padStart(4)}  ${palmWord(palm(m, side, i)).padEnd(9)}`;
  for (let i = 0; i < m.n; i += every) lines.push(`  ${(i / FPS).toFixed(2).padStart(5)}   ${cell('r', i)}  ${cell('l', i)}  ${r0(m.speed.head[i]).padStart(5)}  ${r0(dist(m.at.hand_r[i], m.at.hand_l[i])).padStart(4)}  ${'#'.repeat(Math.min(40, Math.round(Math.max(m.speed.r[i], m.speed.l[i]) / 10)))}${m.busy[i] < STILL ? '·' : ''}`);
  return lines;
}

// ---- streckgubbarna ------------------------------------------------------------------------------------------------
// En rad per bit, upp till åtta lägen jämnt över biten (en rörelse utan bitar: åtta lägen över hela). Ritas rakt i en
// bild i minnet och skrivs som PNG med Nodes egen zlib: inget grafikkort och inget lås att vänta på.
const PER_ROW = Math.max(2, Math.min(12, Math.round(Number(arg('--rutor') ?? 8)) || 8)), CELL = Math.floor(1520 / PER_ROW), GUTTER = 34;
const DIGITS: Record<string, string> = {0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111', '.': '000000000000010'};
function sheet(m: Motion, found: Cut[]): Buffer {
  const rows = found.length ? found.map(c => ({from: c.fran, to: c.till})) : [{from: 0, to: m.dur}];
  const W = GUTTER + PER_ROW * CELL, H = rows.length * CELL, px = Buffer.alloc(W * H * 3, 255);
  const disc = (x: number, y: number, r: number, c: V) => { for (let v = Math.floor(y - r); v <= Math.ceil(y + r); v++) for (let u = Math.floor(x - r); u <= Math.ceil(x + r); u++) if (u >= 0 && v >= 0 && u < W && v < H && (u - x) ** 2 + (v - y) ** 2 <= r * r + 0.5) px.set(c, (v * W + u) * 3); };
  const line = (a: [number, number], b: [number, number], r: number, c: V) => { const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let k = 0; k <= steps; k++) disc(a[0] + (b[0] - a[0]) * k / steps, a[1] + (b[1] - a[1]) * k / steps, r, c); };
  const text = (s: string, x: number, y: number, c: V) => [...s].forEach((ch, k) => [...(DIGITS[ch] ?? '')].forEach((bit, j) => { if (bit === '1') for (let v = 0; v < 3; v++) for (let u = 0; u < 3; u++) px.set(c, ((y + Math.floor(j / 3) * 3 + v) * W + x + k * 12 + (j % 3) * 3 + u) * 3); }));
  // Sedd snett framifrån (25 grader åt figurens vänster) och 30 grader uppifrån; den som sitter har sin vänstra sida till höger i bilden.
  const az = 25 * Math.PI / 180, el = 30 * Math.PI / 180, right: V = [Math.cos(az), -Math.sin(az), 0], fwd: V = [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), -Math.sin(el)], up = cross(right, fwd);
  const aim: V = [m.at.pelvis[0][0], 78, 114], scale = CELL / 150, thick = CELL / 190;
  rows.forEach((row, r) => {
    const count = Math.min(PER_ROW, Math.max(Math.min(4, PER_ROW), Math.ceil((row.to - row.from) / 0.6)));
    text(String(r + 1), 6, r * CELL + 8, [0, 0, 0]);
    for (let k = 0; k < count; k++) {
      const t = row.from + (row.to - row.from) * k / (count - 1), x0 = GUTTER + k * CELL, y0 = r * CELL;
      const at = (p: V): [number, number] => [x0 + CELL / 2 + dot(sub(p, aim), right) * scale, y0 + CELL / 2 - dot(sub(p, aim), up) * scale];
      const corners: V[] = [[-70, 8, TABLE], [70, 8, TABLE], [70, 97, TABLE], [-70, 97, TABLE]];
      corners.forEach((c, i) => line(at(c), at(corners[(i + 1) % 4]), 0.5, [200, 170, 120]));
      const pose = m.pose(t);
      // Det som ligger längst bort ritas först, så att armen framför kroppen syns.
      for (const s of pose.sticks.sort((a, b) => dot(b.a, fwd) - dot(a.a, fwd))) line(at(s.a), at(s.b), (s.thin ? 0.5 : 1.5) * thick, s.side === 'r' ? [215, 40, 40] : s.side === 'l' ? [40, 90, 225] : [70, 70, 70]);
      const c = at(pose.head);
      for (let a = 0; a < 96; a++) disc(c[0] + Math.cos(a * Math.PI / 48) * 10 * scale, c[1] + Math.sin(a * Math.PI / 48) * 10 * scale, 0.8 * thick, [70, 70, 70]);
      line(c, at([pose.head[0] + pose.face[0] * 17, pose.head[1] + pose.face[1] * 17, pose.head[2] + pose.face[2] * 17]), thick, [20, 150, 60]);
      text(t.toFixed(2), x0 + 6, y0 + 8, [0, 0, 0]);
      line([x0, y0], [x0, y0 + CELL - 1], 0.3, [215, 215, 215]); line([x0, y0], [x0 + CELL - 1, y0], 0.3, [215, 215, 215]);
    }
  });
  const chunk = (type: string, data: Buffer) => { const body = Buffer.concat([Buffer.from(type, 'latin1'), data]), out = Buffer.alloc(body.length + 8); out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc32(body), body.length + 4); return out; };
  const head = Buffer.alloc(13); head.writeUInt32BE(W, 0); head.writeUInt32BE(H, 4); head.set([8, 2, 0, 0, 0], 8);
  const lines = Buffer.alloc((W * 3 + 1) * H); for (let y = 0; y < H; y++) px.copy(lines, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(lines)), chunk('IEND', Buffer.alloc(0))]);
}

const names = ALL ? (await readdir(ANIMS)).filter(f => /^AS_.*\.fbx$/i.test(f)).map(f => f.slice(0, -4)).sort() : asked.map(a => a.replace(/\.fbx$/i, ''));
const json: Record<string, {namn: string; fran: number; till: number}[]> = {};
if (SHEETS) await mkdir(path.resolve(ROOT, SHEETS), {recursive: true});
for (const name of names) {
  const m = await read(name), found = SAVED ? saved(m) : propose(m);
  if (SHEETS) await writeFile(path.resolve(ROOT, SHEETS, `${name}.png`), sheet(m, found));
  if (JSON_OUT) { if (found.length) json[name] = found.map(c => ({namn: c.namn, fran: c.fran, till: c.till})); continue; }
  console.log(`${name}  ${m.dur.toFixed(2)} s, ${found.length} ${SAVED ? found.length === 1 ? 'sparad ' : 'sparade ' : ''}${found.length === 1 ? 'bit' : 'bitar'}, stilla ${r0(m.busy.filter(b => b < STILL).length / m.n * 100)} % av tiden`);
  if (ALL || BRIEF) { console.log(`  ${found.map(c => brief(m, c)).join('\n  ') || (SAVED ? '(inga sparade bitar)' : '(ingen rörelse mellan stillheter: en väntan)')}`); continue; }
  found.forEach((c, k) => console.log(describe(m, c, k + 1).join('\n')));
  if (STEP > 0) console.log(timeline(m).join('\n'));
}
if (JSON_OUT) console.log(JSON.stringify(json, null, 2));
