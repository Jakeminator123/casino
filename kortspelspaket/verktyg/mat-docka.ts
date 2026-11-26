// Mäter dockan i paketets rörelser utan webbläsare: kör visa/docka.ts och jämför var dockans led hamnar med paketets figurs.
//   node kortspelspaket/verktyg/mat-docka.ts [man|kvinna] [AS_namn ...]   en rörelse (förval blackjackdealerns giv): varje led, docka minus figur i medel och störst
//   node kortspelspaket/verktyg/mat-docka.ts man --alla                   alla 66: en rad per rörelse, och att ingen omräkning ger fel
//   --t <s>                                                              en enda tid: varje leds läge hos figuren och dockan, och underarmens vridning
// Visaren ska vara igång (filerna hämtas från den). Mått i paketets ram: centimeter, x åt figurens vänster, y upp, z framåt.
import {registerHooks} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url)), SERVER = 'http://127.0.0.1:4330';
const three = (file: string) => pathToFileURL(path.join(ROOT, 'blackjack-dealer/node_modules/three', file)).href;
registerHooks({resolve(specifier, context, next) {
  if (specifier === 'three') return {url: three('build/three.module.js'), shortCircuit: true};
  if (specifier.startsWith('three/addons/')) return {url: three('examples/jsm/' + specifier.slice('three/addons/'.length)), shortCircuit: true};
  return next(specifier, context);
}});
const T = await import('three');
const {FBXLoader} = await import('three/addons/loaders/FBXLoader.js');
const {clone} = await import('three/addons/utils/SkeletonUtils.js');
const {laddaDocka} = await import(pathToFileURL(path.join(ROOT, 'kortspelspaket/visa/docka.ts')).href) as typeof import('../visa/docka.ts');
// (three.js laddare räknar med webbläsarens ProgressEvent)
(globalThis as Record<string, unknown>).ProgressEvent ??= class extends Event { constructor(type: string, init?: object) { super(type); Object.assign(this, init); } };
T.DefaultLoadingManager.setURLModifier(url => url.startsWith('/') ? SERVER + url : url);
const warn = console.warn; console.warn = (...a: unknown[]) => { if (!String(a[0]).includes('skinning weights')) warn(...a); };

const VALUED = ['--t'];
const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const rest = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !VALUED.includes(all[i - 1]));
const vilken = rest.includes('kvinna') ? 'kvinna' : 'man', asked = rest.filter(a => a.startsWith('AS_'));
const ALL = process.argv.includes('--alla'), AT = arg('--t');

const demo = await (await fetch(`${SERVER}/demo.json`)).json() as {figur: string; figurer: {namn: string; fil: string}[]};
const loader = new FBXLoader();
const read = async (file: string) => loader.parse(await (await fetch(`${SERVER}/paket/${file}`)).arrayBuffer(), '');
const template = await read(demo.figur);
const bones = new Set<string>();
template.traverse(o => { if ((o as import('three').Bone).isBone) bones.add(o.name); });
/** Som `fit` i visa.ts. */
function fit(clip: import('three').AnimationClip) {
  const track = (name: string) => clip.tracks.find(t => t.name === name);
  const rootAt = track('root.position'), rootTurn = track('root.quaternion'), hipAt = track('pelvis.position'), hipTurn = track('pelvis.quaternion');
  const reader = (t?: import('three').KeyframeTrack) => t ? (t as unknown as {createInterpolant(): import('three').Interpolant}).createInterpolant() : null;
  const at = reader(rootAt), turn = reader(rootTurn);
  const q = new T.Quaternion(), r = new T.Vector3(), p = new T.Vector3(), k = new T.Quaternion();
  const root = (time: number) => { if (turn) q.fromArray(turn.evaluate(time) as number[]); else q.identity(); if (at) r.fromArray(at.evaluate(time) as number[]); else r.set(0, 0, 0); };
  if (hipAt) for (let i = 0; i < hipAt.times.length; i++) { root(hipAt.times[i]); p.fromArray(hipAt.values, i * 3).applyQuaternion(q).add(r).toArray(hipAt.values, i * 3); }
  if (hipTurn) for (let i = 0; i < hipTurn.times.length; i++) { root(hipTurn.times[i]); k.fromArray(hipTurn.values, i * 4).premultiply(q).toArray(hipTurn.values, i * 4); }
  clip.tracks = clip.tracks.filter(t => {
    const [bone, property] = t.name.split('.');
    return bones.has(bone) && (property === 'quaternion' || (property === 'position' && bone === 'pelvis'));
  });
  return clip;
}

const doll = await laddaDocka(vilken, {figur: template});
const cat = clone(template), body = doll.figur();
const catMixer = new T.AnimationMixer(cat), dollMixer = new T.AnimationMixer(body);
console.log(`dockan: ${vilken}, skala ${(body.children[0].scale.x / 100).toFixed(4)}`);

const PAIRS: [string, string, string][] = [
  ['höft', 'pelvis', 'Hips'], ['bröst', 'spine_05', 'Spine2'], ['huvud', 'head', 'Head'],
  ...(['r', 'l'] as const).flatMap(s => {
    const S = s === 'r' ? 'Right' : 'Left', w = s === 'r' ? 'hö' : 'vä';
    return [[`axel ${w}`, `upperarm_${s}`, `${S}Arm`], [`armbåge ${w}`, `lowerarm_${s}`, `${S}ForeArm`], [`handled ${w}`, `hand_${s}`, `${S}Hand`], [`pekknoge ${w}`, `index_01_${s}`, `${S}HandIndex1`],
      [`pekfinger yttersta ${w}`, `index_03_${s}`, `${S}HandIndex3`], [`tumme yttersta ${w}`, `thumb_03_${s}`, `${S}HandThumb3`], [`lillfinger yttersta ${w}`, `pinky_03_${s}`, `${S}HandPinky3`],
      [`höftled ${w}`, `thigh_${s}`, `${S}UpLeg`], [`knä ${w}`, `calf_${s}`, `${S}Leg`], [`fotled ${w}`, `foot_${s}`, `${S}Foot`]] as [string, string, string][];
  }),
];
const find = (root: import('three').Object3D, name: string) => { const o = root.getObjectByName(name); if (!o) throw Error(`saknar ${name}`); return o; };
const pairs = PAIRS.map(([label, a, b]) => ({label, a: find(cat, a), b: find(body, b)}));
const pa = new T.Vector3(), pb = new T.Vector3(), r1 = (n: number) => n.toFixed(1).padStart(6);

const names = ALL ? demo.figurer.map(f => f.namn).sort() : asked.length ? asked : ['AS_Blackjack_Dealer_DealCard'];
let failed = 0;
const worst: {namn: string; hand: number; finger: number}[] = [];
for (const namn of names) {
  const fil = demo.figurer.find(f => f.namn === namn)?.fil;
  if (!fil) { console.log(`${namn}: finns inte i paketet`); failed++; continue; }
  try {
    const clip = fit((await read(fil)).animations[0]), t0 = performance.now(), made = doll.rorelse(clip), took = performance.now() - t0;
    const bad = made.tracks.filter(t => Array.prototype.some.call(t.values, (v: number) => !Number.isFinite(v)));
    if (bad.length) throw Error(`ogiltiga tal i ${bad.map(t => t.name).join(', ')}`);
    catMixer.stopAllAction(); dollMixer.stopAllAction();
    const ca = catMixer.clipAction(clip).play(), da = dollMixer.clipAction(made).play();
    const longest = clip.tracks.reduce<ArrayLike<number>>((a, t) => t.times.length > a.length ? t.times : a, new Float32Array(1));
    const times = AT ? [Number(AT)] : Array.from(longest);
    const sum = pairs.map(() => ({d: new T.Vector3(), mean: 0, max: 0, at: 0}));
    for (const t of times) {
      ca.time = t; da.time = t; catMixer.update(0); dollMixer.update(0); cat.updateMatrixWorld(true); body.updateMatrixWorld(true);
      pairs.forEach((p, i) => {
        p.a.getWorldPosition(pa); p.b.getWorldPosition(pb);
        const d = pb.distanceTo(pa), s = sum[i];
        s.d.add(pb.sub(pa)); s.mean += d; if (d > s.max) { s.max = d; s.at = t; }
        if (AT) console.log(`  ${p.label.padEnd(24)} katt ${r1(pa.x)} ${r1(pa.y)} ${r1(pa.z)}   docka−katt ${r1(pb.x)} ${r1(pb.y)} ${r1(pb.z)}   ${r1(d)} cm`);
      });
    }
    if (AT) {
      // Vridningen kring underarmen: paketets vridben och hand mot dockans (vinkel i grader och axel, mot föräldern).
      const show = (root: import('three').Object3D, restRoot: import('three').Object3D, name: string) => {
        const o = find(root, name), rest = find(restRoot, name), d = o.quaternion.clone().multiply(rest.quaternion.clone().invert());
        if (d.w < 0) d.set(-d.x, -d.y, -d.z, -d.w);
        const angle = 2 * Math.acos(Math.min(1, d.w)) * 180 / Math.PI, s = Math.hypot(d.x, d.y, d.z) || 1;
        console.log(`  ${name.padEnd(22)} ${angle.toFixed(0).padStart(4)}° kring (${(d.x / s).toFixed(2)}, ${(d.y / s).toFixed(2)}, ${(d.z / s).toFixed(2)})`);
      };
      const dollRest = doll.figur();
      for (const s of ['l', 'r']) for (const n of [`lowerarm_${s}`, `lowerarm_twist_02_${s}`, `lowerarm_twist_01_${s}`, `hand_${s}`]) show(cat, template, n);
      for (const S of ['Left', 'Right']) for (const n of [`${S}ForeArm`, `${S}ForeArmTwist1`, `${S}ForeArmTwist2`, `${S}Hand`]) show(body, dollRest, n);
    }
    const of = (label: string) => sum[pairs.findIndex(p => p.label === label)];
    const hand = Math.max(of('handled hö').mean, of('handled vä').mean) / times.length, finger = Math.max(of('pekfinger yttersta hö').mean, of('pekfinger yttersta vä').mean) / times.length;
    worst.push({namn, hand, finger});
    if (ALL) { console.log(`${namn.padEnd(44)} ${clip.duration.toFixed(2).padStart(6)} s  ${String(made.tracks.length).padStart(3)} spår  ${String(times.length).padStart(4)} rutor  rutor från ${longest[0].toFixed(3)}  handled medel ${r1(hand)}  pekfinger medel ${r1(finger)} cm  omräkningen ${took.toFixed(0)} ms`); continue; }
    if (AT) continue;
    console.log(`${namn}  ${clip.duration.toFixed(2)} s, ${times.length} rutor (första ${longest[0].toFixed(3)}, steg ${(longest[1] - longest[0]).toFixed(4)}), ${made.tracks.length} spår`);
    console.log('  led                      docka − katt i medel (x y z)   avstånd medel   störst (vid s)');
    pairs.forEach((p, i) => { const s = sum[i], n = times.length; console.log(`  ${p.label.padEnd(24)} ${r1(s.d.x / n)} ${r1(s.d.y / n)} ${r1(s.d.z / n)}        ${r1(s.mean / n)}        ${r1(s.max)}  (${s.at.toFixed(2)})`); });
  } catch (e) { failed++; console.log(`${namn}: FEL ${e instanceof Error ? e.stack : e}`); }
}
if (ALL) {
  const n = worst.length, mean = (f: (w: typeof worst[number]) => number) => worst.reduce((a, w) => a + f(w), 0) / n;
  console.log(`\n${n} rörelser omräknade, ${failed} fel. Handled i medel över alla ${mean(w => w.hand).toFixed(1)} cm, pekfingrets yttersta led ${mean(w => w.finger).toFixed(1)} cm.`);
}
