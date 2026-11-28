// Rummet runt dockan vid livebordet: Blenders livebord med sko och kasseringslåda (avatar-auto-pipeline/assets/bord/
// standardbord_live.glb), dealerns stol under honom som han sitter, golvet och ljuset. Modellerna är avatar-auto-pipelines
// lokala media: editorns server lämnar ut dem, och en dator där de inte är byggda har inget rum.
import * as T from 'three';
import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {LIVE} from '../../blackjack-dealer/src/table-live.ts';

type V3 = [number, number, number];
/** Golvet under filten (livebordets, LIVE.floor: filten 0,95 m över golvet). */
export const GOLV = -LIVE.floor.feltOverFloor;
/**
 * Där rummets ljus och kamerorna från sidan och uppifrån räknas från (z, meter): 0,38 m framför dealerns axlar (LIVE.edge
 * och LIVE.dealer.behindEdge): så står de till dealern som Blenders ljus står till en dealer som sitter 0,38 m bakom
 * bordets kant.
 */
export const RUMMETS_Z = LIVE.edge[2] - LIVE.dealer.behindEdge + 0.38;
/** Livebordets modell har sitt origo på golvet under dess egen kant mot dealern (LIVE.edge; avatar-auto-pipeline/scen/bygg_bord.py). */
const BORDETS_ORIGO: V3 = [LIVE.edge[0], GOLV, LIVE.edge[2]];
/**
 * Stolen under honom, som han sitter när den ställs (seatStool). Talen är Blenders:
 * - i sidled: sitsens mitt under hans höft;
 * - framåt: ryggstödet backAir meter bakom hans bakersta punkt vid sitsen (stussen och nedre ryggen), men aldrig så långt
 *   fram att sitsens framkant kommer närmare än kneeAir till vadernas baksida;
 * - höjden: sitsens överkant `sink` över lårens undersida (dynan ger efter så mycket).
 * Var sitsen, dess framkant och ryggstödet ligger i stolens modell hittas med strålar genom sitsens mitt (seatMid, modellens
 * x och z). Är sitsen för hög trycks stolens ben ihop mellan golvet och legsTo (meter över golvet) och allt ovanför sänks.
 */
export const STOOL = {backAir: 0.03, kneeAir: 0.02, sink: 0.005, seatMid: [-0.0152, -0.46], legsTo: 0.5};

const v = (p: number[]) => new T.Vector3(p[0], p[1], p[2]);
const shadows = (o: T.Object3D) => o.traverse(m => { if ((m as T.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
/** En modell läses en gång per adress och sidans liv ut; varje scen får en egen kopia. En läsning som föll glöms, så den prövas igen. */
const read = new Map<string, Promise<GLTF>>();
async function load(url: string, progress?: (share: number) => void): Promise<T.Object3D> {
  let p = read.get(url);
  if (!p) { p = new GLTFLoader().loadAsync(url, e => { if (progress && e.total) progress(e.loaded / e.total); }); read.set(url, p); p.catch(() => read.delete(url)); }
  return (await p).scene.clone(true);
}

/**
 * Golvet går ut i rummets mörker: helt fram till `inne` meter från rummets mitt (RUMMETS_Z) och sedan allt mer
 * genomskinligt, borta vid `ute` meter. Så syns ingen golvkant genom någon kamera (livebordets kamera ser 18 grader ned, och
 * kanten på ett golv som tar slut hamnar mitt i bilden som en linje bakom dealern), bara golv som tonar bort i den mörka
 * bakgrunden. Vårt utseende, inget mått; Blenders bilder (avatar-auto-pipeline/scen/qc_render.py) har samma golv.
 */
export const GOLVET = {inne: 2.5, ute: 10};
/** Golvets genomskinlighet som en bild (alphaMap läser den gröna kanalen): 1 inne, 0 ute, mjukt däremellan. */
function golvetsTon(n = 256): T.DataTexture {
  const data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const r = Math.hypot((i + 0.5) / n - 0.5, (j + 0.5) / n - 0.5) * 2 * GOLVET.ute, s = Math.min(1, Math.max(0, (r - GOLVET.inne) / (GOLVET.ute - GOLVET.inne)));
    data.fill(Math.round(255 * (1 - s * s * (3 - 2 * s))), (j * n + i) * 4, (j * n + i) * 4 + 4);
  }
  const t = new T.DataTexture(data, n, n, T.RGBAFormat); t.needsUpdate = true; return t;
}

/**
 * Rummets ljus, bakgrund och golv, som i Blenders bilder: en mörk värld, golvet som tonar bort i den (GOLVET) och fyra
 * mjuka ljus (ytljus i Blender): taket över bordet (det som kastar skuggorna), ett mot ansiktet framifrån höger, ett
 * fyllnadsljus från vänster och ett bakifrån. Bilden har en mjuk tonkurva som Blenders. `key`: rena färger för en film där
 * dealern ska skäras ut (en bakgrund i en färg och inget golv), som den kurvan skulle bleka, så där är den linjär.
 */
export function roomLight(scene: T.Scene, renderer: T.WebGLRenderer, key?: {background: number}): {floor: T.Mesh} {
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = key ? T.LinearToneMapping : T.AgXToneMapping; renderer.toneMappingExposure = key ? 0.7 : 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const lin = (r: number, g: number, b: number) => new T.Color().setRGB(r, g, b, T.LinearSRGBColorSpace), z = RUMMETS_Z;
  scene.background = key ? new T.Color(key.background) : lin(0.05, 0.05, 0.055);
  scene.environment = new T.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3;
  scene.add(new T.HemisphereLight(0xffffff, 0x3a3836, 0.5));
  const aimed = (strength: number, from: V3, at: V3) => { const l = new T.DirectionalLight(0xffffff, strength); l.position.set(...from); l.target.position.set(...at); scene.add(l, l.target); return l; };
  const ceiling = new T.SpotLight(0xffffff, 11, 0, 1.15, 1, 2); ceiling.position.set(0, 1.75, z + 0.2); ceiling.target.position.set(0, 0, z + 0.1); ceiling.castShadow = true; scene.add(ceiling, ceiling.target);
  ceiling.shadow.mapSize.set(4096, 4096); ceiling.shadow.bias = -0.00015; ceiling.shadow.normalBias = 0.01; ceiling.shadow.radius = 5; ceiling.shadow.camera.near = 0.3; ceiling.shadow.camera.far = 6;
  aimed(1.1, [0.7, 1.0, z + 1.6], [0, 0.4, z - 0.3]); aimed(0.55, [-0.9, 0.65, z + 1.9], [0, 0.05, z - 0.1]); aimed(0.9, [-0.4, 1.25, z - 1.9], [0, 0.35, z - 0.35]);
  const floor = new T.Mesh(new T.PlaneGeometry(2 * GOLVET.ute, 2 * GOLVET.ute).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({color: lin(0.18, 0.17, 0.16), roughness: 0.8, alphaMap: golvetsTon(), transparent: true}));
  floor.position.set(0, GOLV, z); floor.receiveShadow = true; floor.visible = !key; scene.add(floor);
  return {floor};
}

/**
 * Bordet som det ligger i rummet. `marks`: kortplatserna tryckta på filten; `places`, `maxMm` och `cardP4Mm`: hur långt livebordets
 * kortplatser (LIVE.cards) ligger från bordets tryckta (deras mitt på filten, millimeter); `edgeZ` och `topY`: bordets kant
 * mot dealern och skivans överkant (filtens närmaste kant och dess höjd).
 */
export type RoomTable = {root: T.Object3D; marks: T.Object3D[]; places: {id: string; mm: number}[]; maxMm: number; cardP4Mm: number; edgeZ: number; topY: number};
/**
 * Läser Blenders livebord och lägger det i scenen. Dess exempelkort (en giv på platserna och en kortlek bredvid) döljs: bara
 * rörelsens kort ska synas; skon och dess kort står kvar. `key`: bordet i en färg och utan tryck, kasseringslådan borta,
 * skons kort med spårkortets rygg.
 */
export async function loadTable(url: string, scene: T.Scene, options: {key?: {table: number; cardBack: number}; progress?: (share: number) => void} = {}): Promise<RoomTable> {
  const root = await load(url, options.progress), key = options.key; root.updateMatrixWorld(true);
  // (three.js tar bort punkten i nodernas namn: giv_P4.C1 och markering_P4.C1 i Blender är giv_P4C1 och markering_P4C1 här.)
  const example = root.getObjectByName('giv_P4C1');
  root.traverse(o => { if (/^(giv_|kort_)/.test(o.name)) o.visible = false; });
  if (key) { const green = new T.MeshStandardMaterial({color: key.table, roughness: 1, metalness: 0}), yellow = new T.MeshStandardMaterial({color: key.cardBack, roughness: 0.9});
    const of = (o: T.Object3D, name: RegExp) => name.test(o.name) || name.test(o.parent?.name ?? '');
    root.traverse(o => { if (/^(kassering_|markering_)/.test(o.name)) o.visible = false; const m = o as T.Mesh; if (!m.isMesh) return;
      if (of(o, /^(bord_|bricka_)/)) m.material = green; else if (of(o, /^sko_kort/)) m.material = yellow; }); }
  root.position.set(...BORDETS_ORIGO); shadows(root); scene.add(root); root.updateMatrixWorld(true);
  const mitt = (o: T.Object3D) => new T.Box3().setFromObject(o).getCenter(new T.Vector3()), mm = (p: T.Vector3, at: readonly number[]) => Math.round(Math.hypot(p.x - at[0], p.z - at[2]) * 10000) / 10;
  const places = Object.entries(LIVE.cards).flatMap(([id, c]) => { const o = root.getObjectByName(`markering_${id.replace('.', '')}`); return o ? [{id, mm: mm(mitt(o), c.at)}] : []; });
  const felt = root.getObjectByName('bord_filt'), fb = felt ? new T.Box3().setFromObject(felt) : null, marks: T.Object3D[] = [];
  if (!key) root.traverse(o => { if (o.name.startsWith('markering_')) marks.push(o); });
  return {root, marks, places, maxMm: places.length ? Math.max(...places.map(p => p.mm)) : NaN, cardP4Mm: example ? mm(mitt(example), LIVE.cards['P4.C1'].at) : NaN,
    edgeZ: fb ? fb.min.z : LIVE.edge[2], topY: fb ? fb.max.y : 0};
}

/** Hur stolen ställdes: sänkt, var dess origo står i rummet, sitsens överkant i modellen och nu (över golvet), luften från hans rygg till ryggstödet och från sitsens framkant till vaderna, och hans höftled. */
export type StoolSet = {lowered: number; moved: V3; seatModel: number; seatNow: number; backrest: number; knee: number; hip: V3};
/**
 * Läser dealerns stol och ställer den under `figure` som han sitter nu (regeln STOOL ovan), så ställ honom i vilan först.
 * `figure` är en riggad modells rot med en hud och benen Hips, RightLeg och LeftLeg. Strålarna går i stolens egen modell
 * (golvet vid y = 0).
 */
export async function seatStool(url: string, scene: T.Scene, figure: T.Object3D): Promise<{stool: T.Object3D; set: StoolSet}> {
  const bone = (name: string) => { const b = figure.getObjectByName(name); if (!b) throw Error(`Modellen saknar benet ${name}.`); return b.getWorldPosition(new T.Vector3()); };
  // Hans kropp som han sitter, i världen (huden som skelettet böjer den): tagen innan stolen laddas, medan han sitter som han ställdes.
  let skin: T.SkinnedMesh | null = null; figure.traverse(o => { if ((o as T.SkinnedMesh).isSkinnedMesh) skin = o as T.SkinnedMesh; });
  if (!skin) throw Error('Modellen har ingen hud.'); const body: T.Vector3[] = [], m = skin as T.SkinnedMesh; figure.updateMatrixWorld(true); m.skeleton.update();
  for (let i = 0; i < m.geometry.attributes.position.count; i++) body.push(m.getVertexPosition(i, new T.Vector3()).applyMatrix4(m.matrixWorld));
  const hip = bone('Hips'), knee = Math.min(bone('RightLeg').y, bone('LeftLeg').y), kneeZ = Math.min(bone('RightLeg').z, bone('LeftLeg').z);
  // (dess hörn flyttas nedan: den här stolens egen geometri, inte kopian som sparas till nästa scen)
  const stool = await load(url); stool.traverse(o => { const part = o as T.Mesh; if (part.isMesh) part.geometry = part.geometry.clone(); }); stool.updateMatrixWorld(true);
  const hit = (from: V3, dir: V3, what: string) => { const t = new T.Raycaster(v(from), v(dir)).intersectObject(stool, true)[0]; if (!t) throw Error(`Stolens ${what} hittades inte.`); return t.point; };
  const [sx, sz] = STOOL.seatMid, seatModel = hit([sx, 3, sz], [0, -1, 0], 'sits').y;
  const backrest = hit([sx, seatModel + 0.2, 1], [0, 0, -1], 'ryggstöd').z, front = hit([sx, seatModel - 0.03, 1], [0, 0, -1], 'framkant').z;
  // Hans bakersta punkt vid sitsen (stussen och nedre ryggen) och vadernas baksida under knäna.
  const back = Math.min(...body.filter(p => Math.abs(p.x - hip.x) < 0.15 && p.y > hip.y - 0.12 && p.y < hip.y + 0.25).map(p => p.z));
  const calf = Math.min(...body.filter(p => Math.abs(p.x - hip.x) < 0.25 && p.z > kneeZ - 0.15 && p.y < knee - 0.05 && p.y > knee - 0.3).map(p => p.z));
  const moved: V3 = [hip.x - sx, 0, Math.min((back - STOOL.backAir) - backrest, (calf - STOOL.kneeAir) - front)];
  // Höjden: lårens undersida mellan höften och knäna. (Stussen under höftleden sjunker när dockans kod vinklar låren framåt,
  // och ligger då i dynan, som på en sits.)
  const lowest = Math.min(...body.filter(p => Math.abs(p.x - hip.x) < 0.19 && p.z > hip.z + 0.05 && p.z < kneeZ - 0.1 && p.y < hip.y).map(p => p.y));
  const seatNow = lowest + STOOL.sink - GOLV, lowered = seatModel - seatNow;
  stool.traverse(o => { const part = o as T.Mesh; if (!part.isMesh) return; const pos = part.geometry.attributes.position, to = part.matrixWorld, from = to.clone().invert(), p = new T.Vector3();
    for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(to); p.y = p.y > STOOL.legsTo ? p.y - lowered : p.y * (STOOL.legsTo - lowered) / STOOL.legsTo; p.applyMatrix4(from); pos.setXYZ(i, p.x, p.y, p.z); }
    pos.needsUpdate = true; part.geometry.computeBoundingBox(); part.geometry.computeBoundingSphere(); });
  stool.position.set(moved[0], GOLV, moved[2]); shadows(stool); scene.add(stool);
  const mm = (n: number) => Math.round(n * 1000) / 1000;
  return {stool, set: {lowered: mm(lowered), moved: moved.map(mm) as V3, seatModel: mm(seatModel), seatNow: mm(seatNow), backrest: mm(back - (backrest + moved[2])), knee: mm(calf - (front + moved[2])), hip: [hip.x, hip.y, hip.z].map(mm) as V3}};
}
