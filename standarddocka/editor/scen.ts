// Scenen i editorn: Blenders bord, stol och man (avatar-auto-pipeline/assets) i dockans linsvärld, med ljus som liknar
// Blenders bilder, kortet som rörelsen delar och kamerorna. Mannen ställs med dockans egen kod
// (blackjack-dealer/dealer3d/src/figure-model.ts), en ruta som dealer3d/src/stage.ts gör det.
import * as T from 'three';
import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {loadFigure, type Figure} from '../../blackjack-dealer/dealer3d/src/figure-model.ts';
import {dealerEdge, seatEye, spots, type Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {FILM, TABLE_BASE, TABLE_LENS, filmEye, fovYDeg} from '../../blackjack-dealer/src/table-lens.ts';
import {cross, type Frame, type V3} from './rorelse.ts';

const MODELLER = {man: '/avatar-auto-pipeline/assets/docka/standarddocka_man.glb', bord: '/avatar-auto-pipeline/assets/bord/standardbord_nara.glb', stol: '/avatar-auto-pipeline/assets/stol/dealerstol.glb'};
/** Spelets kant mot dealern: mitten av dealerns bordskant på filten (dockans linsvärld). */
export const KANT = dealerEdge(TABLE_LENS) as V3;
/**
 * Blenders modeller har origo på golvet under spelets dealerkant, med filten 0,95 m upp, och glTF:s axlar är redan
 * dockans (y upp, spelarna mot +z): de läggs i linsvärlden med den här förskjutningen.
 */
export const BLENDER_TILL_LINS: V3 = [0, TABLE_BASE.floor, KANT[2]];
/**
 * Stolen under honom, som han sitter i vilan (rörelsens första ruta). Regeln ska senare läsas ur en gemensam fil; talen
 * är desamma som scen/vy.py använder i Blender:
 * - sidled: sitsens mitt under hans höft;
 * - framåt: ryggstödet ryggLuft meter bakom hans bakersta punkt vid sitsen (sätet och nedre ryggen), men aldrig så långt
 *   fram att sitsens framkant kommer närmare än knaveckLuft till vadernas baksida;
 * - höjd: sitsens överkant sitsIntryck över lårens undersida (dynan ger efter så mycket under honom).
 * Var sitsen, dess framkant och ryggstödet ligger i stolens modell mäts med strålar genom sitsens mitt (sitsMitt, i
 * modellens x och z, standard.yaml:s 'stol'). Är sitsen för hög trycks stolens ben ihop mellan golvet och benTill (meter
 * över golvet) och allt över dem sänks, som scen/vy.py gör, så att foten står kvar på golvet.
 * (standard.yaml:s egen regel, höftleden 9 cm över sitsen, gäller dockans höft; mannens höftled ligger 3–4 cm högre än
 * rörelsens, så sitsen ställs efter hans kropp.)
 */
export const STOL = {ryggLuft: 0.03, knaveckLuft: 0.02, sitsIntryck: 0.005, sitsMitt: [-0.0152, -0.46], benTill: 0.5};

/** Kameran från en av de sex andra platserna vid bordet; plats 4 är spelets kamera, 'film'. */
export type Platskamera = 'plats1' | 'plats2' | 'plats3' | 'plats5' | 'plats6' | 'plats7';
export type Kamera = 'film' | 'lag' | 'sida' | 'topp' | 'fri' | Platskamera;
/** Kameran för en plats 1–7 vid bordet. */
export const platskamera = (plats: number): Kamera => plats === 4 ? 'film' : `plats${plats}` as Platskamera;
/** Platsen (1–7) en kamera står på, eller null för de kameror som inte är en spelares. */
export const kameransPlats = (k: Kamera): number | null => k === 'film' ? 4 : k.startsWith('plats') ? Number(k.slice(5)) : null;
/**
 * De fasta kamerorna: läge, punkten de ser mot och lodrät bildvinkel i grader. En plats kamera är spelets egen regel
 * (seatEye i blackjack-dealer/dealer3d/src/world.ts): den står till platsens första kort som spelets kamera står till
 * plats 4:s, lika högt och lika brant, så att spelarens eget kort hamnar på samma ställe i bilden från varje plats.
 */
export function kameraVy(k: Exclude<Kamera, 'fri'>, plan: Plan): {pos: V3; mot: V3; fov: number} {
  const plats = kameransPlats(k), eye = plats && plats !== 4 ? seatEye(plats, plan, TABLE_LENS) : filmEye(TABLE_LENS), fov = fovYDeg(TABLE_LENS.focalPx), z = KANT[2];
  if (plats) return {pos: eye.position, mot: [eye.position[0] + eye.forward[0] * 2, eye.position[1] + eye.forward[1] * 2, eye.position[2] + eye.forward[2] * 2], fov};
  // Samma håll och lins som spelets kamera, men lägre: 10 grader ned i stället för 25, mot bröstet (som 'lag' i scen/vy.py).
  if (k === 'lag') return {pos: [0, 0.58, 0], mot: [0, 0.2, z - 0.3], fov};
  if (k === 'sida') return {pos: [-2.4, 0.32, z - 0.12], mot: [0, -0.06, z - 0.12], fov: 34}; // från hans högra sida, som 'sida' i scen/vy.py
  return {pos: [0.06, 2.15, z + 0.32], mot: [0.06, 0, z + 0.1], fov: 42}; // uppifrån, han överst i bilden
}

export type Scen = {
  renderer: T.WebGLRenderer; scene: T.Scene; camera: T.PerspectiveCamera; figure: Figure; card: T.Object3D;
  /** Laddas för sig (35 MB); löst när bordet ligger på plats. */
  bord: Promise<{platser: {id: string; mm: number}[]; maxMm: number; kortP4Mm: number; kantZ: number; skivaY: number}>;
  /** Hans hud (den riggade kroppen), för mätningar på honom. */
  hud: T.SkinnedMesh;
  /** Visar eller döljer bordet (med skon och brickan), stolen eller bordets tryckta kortplatser. */
  synlig(vad: 'bord' | 'stol' | 'platser', pa: boolean): void;
  /** Hur stolen ställdes: sänkt, flyttad, sitsens överkant i modellen och nu (över golvet), luften från hans rygg till ryggstödet och från sitsens framkant till vaderna, och hans höftled i vilan. */
  stol: {sank: number; flytt: V3; sitsUppe: number; sitsNu: number; ryggstod: number; knaveck: number; hoft: V3};
  pose(f: Frame, hip: number[]): void;
  bone(name: string): T.Vector3;
  render(): void;
  setKamera(k: Kamera): void;
  storlek(): void;
  /** Inspelningens läge på eller av: bilden ritas i filmens storlek (FILM) i stället för fönstrets. */
  filmstorlek(pa: boolean): void;
  /** Ritar bilden som den står nu och lämnar den som PNG (för inspelningen, i filmens storlek). */
  bild(): Promise<Blob>;
  filmRam(): {left: number; top: number; width: number; height: number};
};

const loadGltf = (url: string, progress?: (share: number) => void) => new GLTFLoader().loadAsync(url, e => { if (progress && e.total) progress(e.loaded / e.total); });

export async function byggScen(canvas: HTMLCanvasElement, plan: Plan, hip: number[], vila: Frame, laddar: (text: string) => void): Promise<Scen> {
  const renderer = new T.WebGLRenderer({canvas, antialias: true});
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.AgXToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const lin = (r: number, g: number, b: number) => new T.Color().setRGB(r, g, b, T.LinearSRGBColorSpace);
  // Ljuset efter scen/vy.py: en mörk värld, ett golv 8 x 8 m kring dealerkanten, och fyra mjuka ljus (i Blender ytljus):
  // taket över bordet (det som ger skuggorna), ett mot ansiktet snett framifrån höger, en fyllning från vänster och ett
  // bakifrån. Lägena är Blenders, omräknade till linsvärlden (x, z - 0,95, kanten - y); styrkorna är satta för ögat.
  const scene = new T.Scene(); scene.background = lin(0.05, 0.05, 0.055);
  const pmrem = new T.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3;
  scene.add(new T.HemisphereLight(0xffffff, 0x3a3836, 0.5));
  const z = KANT[2], ljus = (styrka: number, från: V3, mot: V3) => { const l = new T.DirectionalLight(0xffffff, styrka); l.position.set(...från); l.target.position.set(...mot); scene.add(l, l.target); return l; };
  const tak = new T.SpotLight(0xffffff, 11, 0, 1.15, 1, 2); tak.position.set(0, 1.75, z + 0.2); tak.target.position.set(0, 0, z + 0.1); tak.castShadow = true; scene.add(tak, tak.target);
  tak.shadow.mapSize.set(4096, 4096); tak.shadow.bias = -0.00015; tak.shadow.normalBias = 0.01; tak.shadow.radius = 5; tak.shadow.camera.near = 0.3; tak.shadow.camera.far = 6;
  ljus(1.1, [0.7, 1.0, z + 1.6], [0, 0.4, z - 0.3]); ljus(0.55, [-0.9, 0.65, z + 1.9], [0, 0.05, z - 0.1]); ljus(0.9, [-0.4, 1.25, z - 1.9], [0, 0.35, z - 0.35]);
  const golv = new T.Mesh(new T.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({color: lin(0.18, 0.17, 0.16), roughness: 0.8})); golv.position.set(0, TABLE_BASE.floor, z); golv.receiveShadow = true; scene.add(golv);
  const camera = new T.PerspectiveCamera(30, 1.5, 0.05, 40);
  const skuggor = (o: T.Object3D) => o.traverse(m => { if ((m as T.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  // Kortet som delas: ett av bordets egna kort (samma utseende som Blenders); tills bordet har kommit ett enkelt kort.
  const card = new T.Group(); card.matrixAutoUpdate = false; scene.add(card);

  // Mannen.
  laddar('mannen');
  const figure = await loadFigure(MODELLER.man); scene.add(figure.root);
  const bone = (name: string) => { const b = figure.root.getObjectByName(name); if (!b) throw Error(`Mannen saknar leden ${name}.`); return b.getWorldPosition(new T.Vector3()); };
  const v = (p: number[]) => new T.Vector3(p[0], p[1], p[2]);
  /** En ruta på mannen, som dealer3d/src/stage.ts gör det: bålen ur axlarna och höften, armarna ur lederna, händerna ur sina 21 punkter, huvudet mot blicken. */
  function pose(f: Frame, h: number[]) {
    const s3 = (p: number[], q: number[]): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
    const hand = (p: number[][], side: 1 | -1) => { const n = cross(s3(p[5], p[0]), s3(p[17], p[0])), mid = [(p[9][0] + p[12][0]) / 2, (p[9][1] + p[12][1]) / 2, (p[9][2] + p[12][2]) / 2];
      return {forward: s3(mid, p[0]), palm: [n[0] * side, n[1] * side, n[2] * side] as V3, points: p as V3[]}; };
    const looks = v(f.g).sub(v(f.h)).normalize();
    figure.pose({hip: h as V3, shoulders: [f.R.s as V3, f.L.s as V3], arms: [{shoulder: f.R.s as V3, elbow: f.R.e as V3, wrist: f.R.w as V3}, {shoulder: f.L.s as V3, elbow: f.L.e as V3, wrist: f.L.w as V3}],
      hands: [hand(f.R.p, 1), hand(f.L.p, -1)], looks: [looks.x, looks.y, looks.z]});
    // Kortet: lokalt x tvärs, y ut ur framsidan (normalen), z längs långsidan, som dealer3d/src/stage.ts lägger sitt.
    const n = v(f.card.n).normalize(), l = v(f.card.l).normalize(), x = new T.Vector3().crossVectors(n, l);
    card.matrix.makeBasis(x, n, l).setPosition(v(f.card.c)); card.matrixWorldNeedsUpdate = true;
  }

  // Stolen under honom som han sitter i vilan (regeln STOL ovan). Strålarna går i stolens egen modell (golvet y = 0).
  laddar('stolen');
  pose(vila, hip);
  const stolGltf = await loadGltf(MODELLER.stol); const stolen = stolGltf.scene; stolen.updateMatrixWorld(true);
  const träff = (from: V3, dir: V3, vad: string) => { const t = new T.Raycaster(v(from), v(dir)).intersectObject(stolen, true)[0]; if (!t) throw Error(`Hittade inte stolens ${vad}.`); return t.point; };
  const [sx, sz] = STOL.sitsMitt, sitsUppe = träff([sx, 3, sz], [0, -1, 0], 'sits').y;
  const ryggstod = träff([sx, sitsUppe + 0.2, 1], [0, 0, -1], 'ryggstöd').z, framkant = träff([sx, sitsUppe - 0.03, 1], [0, 0, -1], 'sits framkant').z;
  // Hans kropp i vilan, i världen (huden som skelettet böjer den).
  let hud: T.SkinnedMesh | null = null; figure.root.traverse(o => { if ((o as T.SkinnedMesh).isSkinnedMesh) hud = o as T.SkinnedMesh; });
  const kropp: T.Vector3[] = []; { const m = hud! as T.SkinnedMesh; m.skeleton.update(); for (let i = 0; i < m.geometry.attributes.position.count; i++) kropp.push(m.getVertexPosition(i, new T.Vector3()).applyMatrix4(m.matrixWorld)); }
  // Hans bakersta punkt vid sitsen (sätet och nedre ryggen) och vadernas baksida under knäna.
  const höft = bone('Hips'), kna = Math.min(bone('RightLeg').y, bone('LeftLeg').y), knaZ = Math.min(bone('RightLeg').z, bone('LeftLeg').z);
  const bak = Math.min(...kropp.filter(p => Math.abs(p.x - höft.x) < 0.15 && p.y > höft.y - 0.12 && p.y < höft.y + 0.25).map(p => p.z));
  const vad = Math.min(...kropp.filter(p => Math.abs(p.x - höft.x) < 0.25 && p.z > knaZ - 0.15 && p.y < kna - 0.05 && p.y > kna - 0.3).map(p => p.z));
  const flytt: V3 = [höft.x - sx, 0, Math.min((bak - STOL.ryggLuft) - (KANT[2] + ryggstod), (vad - STOL.knaveckLuft) - (KANT[2] + framkant))];
  // Höjden: lårens undersida mellan höften och knäna. (Sätet under höftleden sjunker när dockans kod vinklar låren fram,
  // och hamnar då i dynan, som ett säte gör.)
  const lägst = Math.min(...kropp.filter(p => Math.abs(p.x - höft.x) < 0.19 && p.z > höft.z + 0.05 && p.z < knaZ - 0.1 && p.y < höft.y).map(p => p.y));
  const sitsNu = lägst + STOL.sitsIntryck - TABLE_BASE.floor, sank = sitsUppe - sitsNu;
  stolen.traverse(o => { const m = o as T.Mesh; if (!m.isMesh) return; const pos = m.geometry.attributes.position, till = m.matrixWorld, från = till.clone().invert(), p = new T.Vector3();
    for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(till); p.y = p.y > STOL.benTill ? p.y - sank : p.y * (STOL.benTill - sank) / STOL.benTill; p.applyMatrix4(från); pos.setXYZ(i, p.x, p.y, p.z); }
    pos.needsUpdate = true; m.geometry.computeBoundingBox(); m.geometry.computeBoundingSphere(); });
  stolen.position.set(BLENDER_TILL_LINS[0] + flytt[0], BLENDER_TILL_LINS[1], BLENDER_TILL_LINS[2] + flytt[2]); skuggor(stolen); scene.add(stolen);

  const enkelt = new T.Mesh(new T.BoxGeometry(0.063, 0.0003, 0.088), [0, 0, new T.MeshStandardMaterial({color: 0xf4f2ec}), new T.MeshStandardMaterial({color: 0xb8333b}), 0, 0].map(m => m || new T.MeshStandardMaterial({color: 0xe8e4dc})) as T.Material[]);
  enkelt.castShadow = true; card.add(enkelt);

  // Bordet, för sig: det tar en stund.
  let bordRot: T.Object3D | null = null; const markeringar: T.Object3D[] = [];
  const bord =loadGltf(MODELLER.bord, share => laddar(`bordet ${Math.round(share * 100)} %`)).then((gltf: GLTF) => {
    const root = gltf.scene; root.updateMatrixWorld(true);
    // Kortet ur bordets exempelkort på plats 4 kort 1, med framsidan uppåt: dess geometri läggs med mitten i origo.
    // (three.js stryker punkten i nodnamnen: giv_P4.C1 och markering_P4.C1 i Blender heter giv_P4C1 och markering_P4C1 här.)
    const exempel = root.getObjectByName('giv_P4C1') as T.Mesh | undefined;
    if (exempel?.isMesh) { const g = exempel.geometry.clone().applyMatrix4(exempel.matrixWorld); g.computeBoundingBox(); const b = g.boundingBox!, c = b.getCenter(new T.Vector3()), s = b.getSize(new T.Vector3()); g.translate(-c.x, -c.y, -c.z);
      if (s.x > s.z) g.rotateY(Math.PI / 2);
      const m = new T.Mesh(g, Array.isArray(exempel.material) ? exempel.material.map(x => x.clone()) : exempel.material.clone()); m.castShadow = true; m.receiveShadow = true; card.remove(enkelt); card.add(m); }
    // Bordets exempelkort (en giv på platserna och en kortlek bredvid) döljs: bara rörelsens kort ska synas. Skon och dess kort står kvar.
    root.traverse(o => { if (/^(giv_|kort_)/.test(o.name)) o.visible = false; });
    root.position.set(...BLENDER_TILL_LINS); skuggor(root); scene.add(root); root.updateMatrixWorld(true);
    // Kontrollen: planens kortplatser mot bordets tryckta (deras mitt på filten), i millimeter.
    const platser = spots(plan, TABLE_LENS).flatMap(s => { const o = root.getObjectByName(`markering_${s.id.replace('.', '')}`); if (!o) return [];
      const c = new T.Box3().setFromObject(o).getCenter(new T.Vector3()); return [{id: s.id, mm: Math.round(Math.hypot(c.x - s.at[0], c.z - s.at[2]) * 10000) / 10}]; });
    const p4 = spots(plan, TABLE_LENS).find(s => s.id === 'P4.C1')!, ex = exempel ? new T.Box3().setFromObject(exempel).getCenter(new T.Vector3()) : null;
    // Bordets kant mot dealern och skivans överkant: filtens närmaste kant och dess höjd (filten slutar vid brickans bakvägg, som är kanten).
    const filt = root.getObjectByName('bord_filt'), fb = filt ? new T.Box3().setFromObject(filt) : null;
    bordRot = root; root.traverse(o => { if (o.name.startsWith('markering_')) markeringar.push(o); });
    return {platser, maxMm: Math.max(...platser.map(p => p.mm)), kortP4Mm: ex ? Math.round(Math.hypot(ex.x - p4.at[0], ex.z - p4.at[2]) * 10000) / 10 : NaN,
      kantZ: fb ? fb.min.z : KANT[2], skivaY: fb ? fb.max.y : 0};
  });
  const synlig = (vad: 'bord' | 'stol' | 'platser', pa: boolean) => { if (vad === 'stol') stolen.visible = pa; else if (vad === 'bord') { if (bordRot) bordRot.visible = pa; } else markeringar.forEach(o => { o.visible = pa; }); };

  const ram = () => { const W = canvas.clientWidth, H = canvas.clientHeight, a = FILM.width / FILM.height;
    return W / H >= a ? {width: H * a, height: H, left: (W - H * a) / 2, top: 0} : {width: W, height: W / a, left: 0, top: (H - W / a) / 2}; };
  let fovNu = 30, filmlik = true, spelasIn = false;
  function storlek() {
    const a = FILM.width / FILM.height;
    if (spelasIn) { renderer.setPixelRatio(1); renderer.setSize(FILM.width, FILM.height, false); camera.aspect = a; camera.fov = fovNu; camera.updateProjectionMatrix(); return; }
    const W = canvas.clientWidth, H = canvas.clientHeight; renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W, H, false); camera.aspect = W / H;
    // Spelets, platsernas och den lägre kamerans bild ryms hel: är fönstret smalare än filmens ruta vidgas vinkeln.
    camera.fov = filmlik && W / H < a ? 2 * Math.atan(Math.tan(fovNu * Math.PI / 360) * a / (W / H)) * 180 / Math.PI : fovNu;
    camera.updateProjectionMatrix();
  }
  function setKamera(k: Kamera) {
    if (k === 'fri') return; const vy = kameraVy(k, plan); fovNu = vy.fov; filmlik = k !== 'sida' && k !== 'topp';
    camera.position.set(...vy.pos); camera.up.set(0, 1, 0); camera.lookAt(v(vy.mot)); storlek();
  }
  const filmstorlek = (pa: boolean) => { spelasIn = pa; storlek(); };
  // Bilden tas i samma steg som den ritas: efter det får webbläsaren tömma ritytan.
  const bild = () => { renderer.render(scene, camera); return new Promise<Blob>((klar, fel) => canvas.toBlob(b => b ? klar(b) : fel(Error('Bilden kunde inte läsas ur ritytan.')), 'image/png')); };
  const mm = (n: number) => Math.round(n * 1000) / 1000;
  return {renderer, scene, camera, figure, card, bord, stol: {sank: mm(sank), flytt: flytt.map(mm) as V3, sitsUppe: mm(sitsUppe), sitsNu: mm(sitsNu), ryggstod: mm(bak - (KANT[2] + ryggstod + flytt[2])), knaveck: mm(vad - (KANT[2] + framkant + flytt[2])), hoft: [höft.x, höft.y, höft.z].map(mm) as V3},
    pose, bone, hud: hud!, synlig, render: () => renderer.render(scene, camera), setKamera, storlek, filmstorlek, bild, filmRam: ram};
}
