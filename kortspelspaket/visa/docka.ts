// En docka ur avatar-pipelinen i paketets rörelser: standarddockans man eller kvinna (samma skelett som varje dealer
// pipelinen bygger, ../avatar-auto-pipeline/new_docka.md avsnitt 7) i stället för paketets egen figur vid bordet.
// Sidan (visa.ts) väljer figur med ?figur=man|kvinna och använder bara det som står här:
// - `figur()` lämnar en ny kopia av dockan för en plats vid bordet. Sidan ställer och skalar den precis som paketets
//   figur (bord.ts: skala 0,01 och en förskjutning i paketets ram), så kopians egen ram ska vara paketets: centimeter,
//   y upp, vänd mot plus z, och mitten där paketets ram har sin mitt.
// - `rorelse(clip)` räknar om en av paketets rörelser till ett klipp för dockans skelett. Klippet som kommer in är det
//   `fit` i visa.ts har gjort: ett quaternion-spår per led med paketets lednamn (Unreals standardskelett), och
//   `pelvis.position` i paketets ram (centimeter, z upp, under figurens rot som reser den till y upp).
//
// Omräkningen. De två skeletten har olika lokala axlar och olika vila, så en vinkel kan inte kopieras. I stället räknas
// för varje bild hur varje led i paketet är vridet i rummet jämfört med sin vila, och dockans motsvarande led vrids
// lika mycket i rummet från sin vila (PAR nedan säger vilket led som följer vilket). Före det rättas dockans vila mot
// paketets, så att samma vridning ger samma riktning: överarm, underarm, lår, underben och fingrarnas leder pekar åt
// samma håll som paketets i vilan, och handen ligger med handflatan och knogarna som paketets. Bålen, nacken, huvudet,
// nyckelbenen och fötterna rättas inte: där är båda vilorna en kropp som står rak, och lederna sitter på olika ställen
// i kroppen. Underarmen rullar i paketet vid armbågen; dockans gör det inte, utan den vridningen bärs av handen och
// underarmens två vridben (VRIDBEN), som dockans hud är byggd för. Ingen hand styrs till någon plats: händerna hamnar
// där vinklarna och dockans egna benlängder för dem.
//
// Storleken och läget. Dockan skalas så att vägen höftled–axel–armbåge–handled är lika lång som paketets (SKALA_EFTER:
// mannen blir 0,97 av sin storlek, kvinnan 1,03), och ställs i varje bild så att mitten mellan axellederna är där
// paketets är (ANKARE): armarna börjar då där paketets börjar. Höften hamnar där dockans egen bål för den, hos mannen
// 7 cm längre bak och 3 cm högre än paketets höftleder, hos kvinnan 3 och 2: dockans axlar sitter längre fram över
// höften än figurens. Med höften i stället på paketets plats hamnar mannens händer 9 cm fel, 7 fram och 3 ner i filten.
// Mätt mot paketets figur i alla 66 rörelserna: handlederna 3 cm ifrån i medel (mannen; kvinnan 2), nästan allt i
// sidled, för att dockans axlar är bredare, och pekfingrets yttersta led 4 cm.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

export type Docka = {figur(): T.Object3D; rorelse(clip: T.AnimationClip): T.AnimationClip};

/**
 * Hur dockans led rättas mot paketets vila innan vridningen läggs på: `som` inte alls, `riktning` så att benet pekar åt
 * samma håll som paketets (mot leden `mot`; det yttersta fingerledet längs sin egen axel), `hand` så att handleden,
 * långfingrets knoge och raden av knogar ligger som paketets.
 */
type Par = {docka: string; paket: string; slag: 'som' | 'riktning' | 'hand'; mot?: [docka: string, paket: string]};
const FINGRAR: [string, string][] = [['Thumb', 'thumb'], ['Index', 'index'], ['Middle', 'middle'], ['Ring', 'ring'], ['Pinky', 'pinky']];
/**
 * Dockans led och det led i paketet det följer. Ryggens fem led blir tre och nackens två ett: dockans led följer det
 * led i paketet som ligger på samma höjd i kroppen, och det översta (`Spine2`, som bär axlarna och nacken) följer
 * paketets översta. Mellanhandsbenen, vridbenen och hjälpbenen i paketet har ingen motsvarighet; fingrarnas första led
 * följer paketets första led i rummet, så mellanhandens vridning kommer med ändå.
 */
const PAR: Par[] = [
  {docka: 'Hips', paket: 'pelvis', slag: 'som'}, {docka: 'Spine', paket: 'spine_02', slag: 'som'}, {docka: 'Spine1', paket: 'spine_04', slag: 'som'},
  {docka: 'Spine2', paket: 'spine_05', slag: 'som'}, {docka: 'neck', paket: 'neck_01', slag: 'som'}, {docka: 'Head', paket: 'head', slag: 'som'},
  ...([['Left', 'l'], ['Right', 'r']] as const).flatMap(([S, s]): Par[] => [
    {docka: `${S}Shoulder`, paket: `clavicle_${s}`, slag: 'som'},
    {docka: `${S}Arm`, paket: `upperarm_${s}`, slag: 'riktning', mot: [`${S}ForeArm`, `lowerarm_${s}`]},
    {docka: `${S}ForeArm`, paket: `lowerarm_${s}`, slag: 'riktning', mot: [`${S}Hand`, `hand_${s}`]},
    {docka: `${S}Hand`, paket: `hand_${s}`, slag: 'hand'},
    ...FINGRAR.flatMap(([F, f]) => [1, 2, 3].map((nr): Par => ({docka: `${S}Hand${F}${nr}`, paket: `${f}_0${nr}_${s}`, slag: 'riktning', mot: nr < 3 ? [`${S}Hand${F}${nr + 1}`, `${f}_0${nr + 1}_${s}`] : undefined}))),
    {docka: `${S}UpLeg`, paket: `thigh_${s}`, slag: 'riktning', mot: [`${S}Leg`, `calf_${s}`]},
    {docka: `${S}Leg`, paket: `calf_${s}`, slag: 'riktning', mot: [`${S}Foot`, `foot_${s}`]},
    {docka: `${S}Foot`, paket: `foot_${s}`, slag: 'som'}, {docka: `${S}ToeBase`, paket: `ball_${s}`, slag: 'som'},
  ]),
];
/** Dockans led för ett av paketets (för det som följer figurens led, som korten i kort.ts), eller null om det inte har någon motsvarighet. */
export const dockansLed = (paketets: string): string | null => PAR.find(p => p.paket === paketets)?.docka ?? null;
/**
 * Underarmens vridben (new_docka.md 7.1b): handens vridning kring underarmen, räknad från dockans vila, läggs till en
 * tredjedel på det första och två tredjedelar på det andra, så att huden inte nyps vid handleden.
 */
const VRIDBEN = ['Left', 'Right'].flatMap(S => [{ben: `${S}ForeArmTwist1`, hand: `${S}Hand`, del: 1 / 3}, {ben: `${S}ForeArmTwist2`, hand: `${S}Hand`, del: 2 / 3}]);
/** Vägen som ska vara lika lång hos dockan som i paketet: från mitten mellan höftlederna till mitten mellan axellederna, och en arm till handleden. */
const SKALA_EFTER = {docka: {hoft: ['LeftUpLeg', 'RightUpLeg'], arm: ['LeftArm', 'LeftForeArm', 'LeftHand']}, paket: {hoft: ['thigh_l', 'thigh_r'], arm: ['upperarm_l', 'lowerarm_l', 'hand_l']}};
/** Lederna vars mitt bär dockans läge: axellederna. */
const ANKARE = {docka: ['LeftArm', 'RightArm'], paket: ['upperarm_l', 'upperarm_r']};
const FIL = (vilken: string) => `/avatar-auto-pipeline/assets/docka/standarddocka_${vilken}.glb`;

/**
 * Ett skelett i vilan, i sin egen ram (det som lästes, utan dess egen plats i en scen): varje nod med sin förälder (−1:
 * ramen), föräldern alltid före barnet; nodens vridning och läge mot föräldern, och dess vridning och läge i ramen.
 * Inget i de två skeletten är skalat, så ett led står på sin förälders plats plus sitt läge vridet med förälderns vridning.
 */
type Skelett = {namn: string[]; nr: Map<string, number>; foralder: number[]; lokal: T.Quaternion[]; lage: T.Vector3[]; varld: T.Quaternion[]; plats: T.Vector3[]};
function skelett(rot: T.Object3D): Skelett {
  const noder: T.Object3D[] = [];
  rot.traverse(o => { if (o !== rot) noder.push(o); });
  const nr = new Map<string, number>(), at = new Map(noder.map((o, i) => [o, i]));
  noder.forEach((o, i) => { if (!nr.has(o.name)) nr.set(o.name, i); });
  const s: Skelett = {namn: noder.map(o => o.name), nr, foralder: noder.map(o => at.get(o.parent!) ?? -1), lokal: noder.map(o => o.quaternion.clone()), lage: noder.map(o => o.position.clone()), varld: noder.map(() => new T.Quaternion()), plats: noder.map(() => new T.Vector3())};
  stall(s, s.lokal, s.lage, s.varld, s.plats);
  return s;
}
/** Ställer skelettet: ur varje nods vridning och läge mot föräldern räknas dess vridning och läge i ramen. */
function stall(s: Skelett, lokal: T.Quaternion[], lage: T.Vector3[], varld: T.Quaternion[], plats: T.Vector3[]) {
  for (let i = 0; i < lokal.length; i++) {
    const f = s.foralder[i];
    if (f < 0) { varld[i].copy(lokal[i]); plats[i].copy(lage[i]); }
    else { varld[i].multiplyQuaternions(varld[f], lokal[i]); plats[i].copy(lage[i]).applyQuaternion(varld[f]).add(plats[f]); }
  }
}
/** Nodens nummer; ett led som omräkningen behöver och som saknas är ett fel i modellen, inte något att gissa sig förbi. */
function led(s: Skelett, namn: string, vems: string) {
  const i = s.nr.get(namn);
  if (i === undefined) throw Error(`${vems} saknar leden ${namn}.`);
  return i;
}

/** Läser dockan. `paket.figur` är paketets figur i vila (mallen sidan har läst), för dess skelett och vilställning. */
export async function laddaDocka(vilken: 'man' | 'kvinna', paket: {figur: T.Object3D}): Promise<Docka> {
  const scen = (await new GLTFLoader().loadAsync(FIL(vilken)).catch(() => { throw Error(`Standarddockan är inte byggd på den här datorn (${FIL(vilken).slice(1)}).`); })).scene;
  scen.traverse(o => { if ((o as T.Mesh).isMesh) o.frustumCulled = false; }); // den vilande formens gränser följer inte med när dockan sätter sig
  const kalla = skelett(paket.figur), mal = skelett(scen);
  const k = (namn: string) => led(kalla, namn, 'Paketets figur'), m = (namn: string) => led(mal, namn, 'Dockan');
  const mitt = (plats: T.Vector3[], a: number, b: number, till = new T.Vector3()) => till.addVectors(plats[a], plats[b]).multiplyScalar(0.5);

  // Storleken: paketets väg genom dockans (dockan är byggd i meter, paketet i centimeter).
  const vag = (s: Skelett, nr: (namn: string) => number, v: typeof SKALA_EFTER.docka) => {
    const [axel, armbage, handled] = v.arm.map(nr), hoft = mitt(s.plats, nr(v.hoft[0]), nr(v.hoft[1])), axlar = s.plats[axel].clone().setX(hoft.x);
    return hoft.distanceTo(axlar) + s.plats[axel].distanceTo(s.plats[armbage]) + s.plats[armbage].distanceTo(s.plats[handled]);
  };
  const skala = vag(kalla, k, SKALA_EFTER.paket) / (100 * vag(mal, m, SKALA_EFTER.docka));

  // Dockans vila rättad mot paketets, led för led. `fran[j]` är det som läggs efter paketets leds vridning i ramen för
  // att ge dockans led j dess: paketets vila bakåt, rättningen, dockans vila.
  const riktning = (s: Skelett, i: number, mot: number | null) => mot !== null ? s.plats[mot].clone().sub(s.plats[i]).normalize()
    : s.lage[i].clone().normalize().applyQuaternion(s.varld[i]); // det yttersta ledet: samma axel som ledet före har mot det här
  const handram = (s: Skelett, nr: (namn: string) => number, hand: string, knogar: string[]) => {
    const [lang, pek, lill] = knogar.map(n => s.plats[nr(n)]), x = lang.clone().sub(s.plats[nr(hand)]).normalize();
    const z = x.clone().cross(lill.clone().sub(pek)).normalize(), y = z.clone().cross(x);
    return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
  };
  const parAv = new Map(PAR.map(p => [m(p.docka), p]));
  const rattning: (T.Quaternion | null)[] = mal.namn.map(() => null), fran: (T.Quaternion | null)[] = mal.namn.map(() => null), foljer = mal.namn.map(() => -1);
  mal.namn.forEach((_, j) => {
    const p = parAv.get(j);
    if (!p) return;
    const i = foljer[j] = k(p.paket), c = new T.Quaternion();
    if (p.slag === 'riktning') {
      // Det närmaste ledet ovanför som har ett par är redan rättat; det här ledet ärver det och vrids sedan den kortaste vägen till paketets riktning.
      let f = mal.foralder[j]; while (f >= 0 && !rattning[f]) f = mal.foralder[f];
      const arv = f >= 0 ? rattning[f]! : new T.Quaternion();
      c.setFromUnitVectors(riktning(mal, j, p.mot ? m(p.mot[0]) : null).applyQuaternion(arv), riktning(kalla, i, p.mot ? k(p.mot[1]) : null)).multiply(arv);
    } else if (p.slag === 'hand') {
      const S = p.docka.replace('Hand', ''), s = p.paket.slice(-1);
      c.copy(handram(kalla, k, p.paket, [`middle_01_${s}`, `index_01_${s}`, `pinky_01_${s}`])).multiply(handram(mal, m, p.docka, [`${S}HandMiddle1`, `${S}HandIndex1`, `${S}HandPinky1`]).invert());
    }
    rattning[j] = c;
    fran[j] = kalla.varld[i].clone().invert().multiply(c).multiply(mal.varld[j]);
  });
  const vridben = VRIDBEN.map(v => {
    const j = m(v.ben), hand = m(v.hand);
    if (mal.foralder[j] !== mal.foralder[hand]) throw Error(`Dockans ${v.ben} och ${v.hand} sitter inte på samma underarm.`);
    return {j, hand, del: v.del, langs: mal.lage[hand].clone().normalize()};
  });
  // Underarmen själv: dess längd i vilan sedd från överarmen, kring vilken den inte ska rulla (`rullar[j]`).
  const rullar: (T.Vector3 | null)[] = mal.namn.map(() => null);
  for (const ben of vridben) { const j = mal.foralder[ben.hand]; rullar[j] ??= ben.langs.clone().applyQuaternion(mal.lokal[j]); }
  /** Den del av vridningen `q` som går kring `axel`, med det tecken som ger den korta vägen. */
  const kring = (q: T.Quaternion, axel: T.Vector3, till: T.Quaternion) => {
    const del = axel.x * q.x + axel.y * q.y + axel.z * q.z;
    till.set(axel.x * del, axel.y * del, axel.z * del, q.w);
    if (till.lengthSq() < 1e-12) return till.identity();
    return till.w < 0 ? till.set(-till.x, -till.y, -till.z, -till.w).normalize() : till.normalize();
  };
  const hoft = m('Hips'), backen = k('pelvis');
  const ankare = {docka: ANKARE.docka.map(m), paket: ANKARE.paket.map(k)};

  return {
    figur() {
      // Dockan är byggd i meter: skalan gör dem till paketets centimeter och kroppen lika stor som paketets.
      const ram = new T.Group(), kropp = clone(scen);
      kropp.scale.setScalar(100 * skala); ram.add(kropp);
      return ram;
    },
    rorelse(clip) {
      // (spårets egen avläsare mellan rutorna; three.js typbeskrivning nämner den inte)
      const avlasare = (t?: T.KeyframeTrack) => t ? (t as unknown as {createInterpolant(): T.Interpolant}).createInterpolant() : null;
      const spar = new Map(clip.tracks.map(t => [t.name, t]));
      const vrid = kalla.namn.map(n => avlasare(spar.get(`${n}.quaternion`))), flytt = avlasare(spar.get('pelvis.position'));
      // Samma rutor som paketets rörelse har (spåret med flest).
      const tider = clip.tracks.reduce<ArrayLike<number>>((a, t) => t.times.length > a.length ? t.times : a, [0]), n = tider.length;
      const ut = mal.namn.map((_, j) => fran[j] || vridben.some(b => b.j === j) ? new Float32Array(n * 4) : null), lagen = new Float32Array(n * 3);
      // En ruta i taget: paketets led mot föräldern (kl, kg) och i ramen (kv, kp), och dockans (ml, mv, mp).
      const ny = (s: Skelett) => s.namn.map(() => new T.Quaternion()), nya = (s: Skelett) => s.namn.map(() => new T.Vector3());
      const kl = ny(kalla), kv = ny(kalla), kp = nya(kalla), kg = kalla.lage.map(p => p.clone()), ml = ny(mal), mv = ny(mal), mp = nya(mal);
      const q = new T.Quaternion(), rull = new T.Quaternion(), v = new T.Vector3(), a = new T.Vector3(), b = new T.Vector3();
      for (let r = 0; r < n; r++) {
        const t = tider[r];
        for (let i = 0; i < kl.length; i++) { const s = vrid[i]; if (s) kl[i].fromArray(s.evaluate(t) as number[]); else kl[i].copy(kalla.lokal[i]); }
        if (flytt) kg[backen].fromArray(flytt.evaluate(t) as number[]);
        stall(kalla, kl, kg, kv, kp);
        // Dockans led, uppifrån och ner: de som har ett par får paketets vridning i ramen, de andra står kvar mot sin förälder.
        for (let j = 0; j < ml.length; j++) {
          const f = mal.foralder[j];
          if (!fran[j]) { ml[j].copy(mal.lokal[j]); if (f < 0) mv[j].copy(ml[j]); else mv[j].multiplyQuaternions(mv[f], ml[j]); continue; }
          mv[j].multiplyQuaternions(kv[foljer[j]], fran[j]!);
          if (f < 0) ml[j].copy(mv[j]); else ml[j].copy(mv[f]).invert().multiply(mv[j]);
          // Underarmen böjs men rullar inte vid armbågen (paketets underarm gör det): rullningen från vilan tas bort
          // här, benet pekar åt samma håll som förut, och handen, som står kvar i rummet, bär hela vridningen.
          const langs = rullar[j];
          if (langs && f >= 0) {
            q.copy(mal.lokal[j]).invert().premultiply(ml[j]);
            ml[j].copy(q.multiply(kring(q, langs, rull).invert())).multiply(mal.lokal[j]);
            mv[j].multiplyQuaternions(mv[f], ml[j]);
          }
        }
        // Vridbenen: den del av handens vridning mot underarmen, räknad från vilan, som går kring underarmens längd.
        for (const ben of vridben) {
          kring(q.copy(mal.lokal[ben.hand]).invert().premultiply(ml[ben.hand]), ben.langs, rull);
          ml[ben.j].identity().slerp(rull, ben.del).multiply(mal.lokal[ben.j]);
        }
        for (let j = 0; j < ut.length; j++) {
          const till = ut[j];
          if (!till) continue;
          // (samma vridning kan skrivas med två tecken: det som ligger närmast rutan före hålls, så att den som spelar går den korta vägen mellan rutorna)
          if (r && q.fromArray(till, (r - 1) * 4).dot(ml[j]) < 0) ml[j].set(-ml[j].x, -ml[j].y, -ml[j].z, -ml[j].w);
          ml[j].toArray(till, r * 4);
        }
        // Läget: dockan ställs med höften i sin vila, och höften flyttas sedan så att ankarets mitt hamnar där paketets är
        // (paketets centimeter till dockans egna enheter), uttryckt mot höftens förälder.
        stall(mal, ml, mal.lage, mv, mp);
        const f = mal.foralder[hoft];
        v.copy(mitt(kp, ankare.paket[0], ankare.paket[1], a)).divideScalar(100 * skala).sub(mitt(mp, ankare.docka[0], ankare.docka[1], b)).add(mp[hoft]);
        if (f >= 0) v.sub(mp[f]).applyQuaternion(q.copy(mv[f]).invert());
        v.toArray(lagen, r * 3);
      }
      const tracks: T.KeyframeTrack[] = [new T.VectorKeyframeTrack(`${mal.namn[hoft]}.position`, tider, lagen)];
      ut.forEach((till, j) => { if (till) tracks.push(new T.QuaternionKeyframeTrack(`${mal.namn[j]}.quaternion`, tider, till)); });
      return new T.AnimationClip(clip.name, clip.duration, tracks);
    },
  };
}
