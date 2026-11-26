// Scenen i editorn: Blenders bord, stol och man (avatar-auto-pipeline/assets) i dockans linsvärld, med ljus som liknar
// Blenders bilder, kortet som rörelsen delar och kamerorna. Mannen ställs med dockans egen kod
// (blackjack-dealer/dealer3d/src/figure-model.ts), en ruta som dealer3d/src/stage.ts gör det.
import * as T from 'three';
import {loadFigure, type Figure} from '../../blackjack-dealer/dealer3d/src/figure-model.ts';
import {ROOM_EDGE, loadTable, roomLight, seatStool} from '../../blackjack-dealer/dealer3d/src/standard-room.ts';
import {spots, type Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {FILM, PLAY_LENS, TABLE_LENS, filmEye, fovYDeg, seatView} from '../../blackjack-dealer/src/table-lens.ts';
import {cross, type Frame, type V3} from './rorelse.ts';

// Rummet (bordet med skon och brickan, stolen under honom, golvet och ljuset) är standardrummet i
// blackjack-dealer/dealer3d/src/standard-room.ts, samma som studions dockvy ritar: där står också regeln för stolen
// och hur Blenders modeller läggs i linsvärlden. (standard.yaml:s egen regel för stolen, höftleden 9 cm över sitsen,
// gäller dockans höft; mannens höftled ligger 3–4 cm högre än rörelsens, så sitsen ställs efter hans kropp.)
const MODELLER = {man: '/avatar-auto-pipeline/assets/docka/standarddocka_man.glb', kvinna: '/avatar-auto-pipeline/assets/docka/standarddocka_kvinna.glb', bord: '/avatar-auto-pipeline/assets/bord/standardbord_nara.glb', stol: '/avatar-auto-pipeline/assets/stol/dealerstol.glb'};
/** Spelets kant mot dealern: mitten av dealerns bordskant på filten (dockans linsvärld). */
export const KANT = ROOM_EDGE as V3;
/** Hur många grader huvudets sikte lyfts över blickpunkten när han ser in i kameran (pose nedan). Satt efter bild 2026-11-26: vid 10 och 22 grader såg han under kameran, vid 34 in i den. */
const BLICK_LYFT = 32;

/** Kameran från en av de sex andra platserna vid bordet; plats 4 är spelets vy, 'spel'. */
export type Platskamera = 'plats1' | 'plats2' | 'plats3' | 'plats5' | 'plats6' | 'plats7';
/**
 * Kamerorna. 'spel' är spelets vy, standarden för standarddockans filmer (Jakob 2026-11-26, den lägre kameran: "Jag tror
 * jag gillar denna kameravinkel som standard faktiskt!"; talen är PLAY_LENS i blackjack-dealer/src/table-lens.ts): det
 * spelaren på plats 4 ser, och de andra platsernas kameror räknas ur den. 'film' är den gamla inspelningens kamera
 * (TABLE_LENS, 25 grader ned), den Paows filmer är tagna med.
 */
export type Kamera = 'spel' | 'film' | 'sida' | 'topp' | 'fri' | Platskamera;
const KAMEROR: readonly string[] = ['spel', 'film', 'sida', 'topp', 'fri', 'plats1', 'plats2', 'plats3', 'plats5', 'plats6', 'plats7'];
/** En kamera ur ett namn i en adress eller ett verktyg. De äldre namnen 'lag' och 'mellan' och 'plats4' är spelets vy. */
export const somKamera = (namn: string | null | undefined): Kamera | null => namn === 'lag' || namn === 'mellan' || namn === 'plats4' ? 'spel' : KAMEROR.includes(namn ?? '') ? namn as Kamera : null;
/** Kameran för en plats 1–7 vid bordet. */
export const platskamera = (plats: number): Kamera => plats === 4 ? 'spel' : `plats${plats}` as Platskamera;
/** Platsen (1–7) en kamera står på, eller null för de kameror som inte är en spelares. */
export const kameransPlats = (k: Kamera): number | null => k === 'spel' ? 4 : k.startsWith('plats') ? Number(k.slice(5)) : null;
/**
 * De fasta kamerorna: läge, punkten de ser mot och lodrät bildvinkel i grader. En plats kamera följer spelets regel
 * (seatView i blackjack-dealer/src/table-lens.ts): den står till platsens första kort som spelets vy står till plats
 * 4:s, lika högt och lika brant, så att spelarens eget kort hamnar på samma ställe i bilden från varje plats.
 */
export function kameraVy(k: Exclude<Kamera, 'fri'>, plan: Plan): {pos: V3; mot: V3; fov: number} {
  const z = KANT[2], oga = (e: {position: V3; forward: V3; focalPx: number}) => ({pos: e.position, mot: [e.position[0] + e.forward[0] * 2, e.position[1] + e.forward[1] * 2, e.position[2] + e.forward[2] * 2] as V3, fov: fovYDeg(e.focalPx)});
  if (k === 'sida') return {pos: [-2.4, 0.32, z - 0.12], mot: [0, -0.06, z - 0.12], fov: 34}; // från hans högra sida, som 'sida' i scen/vy.py
  if (k === 'topp') return {pos: [0.06, 2.15, z + 0.32], mot: [0.06, 0, z + 0.1], fov: 42}; // uppifrån, han överst i bilden
  if (k === 'film') return oga(filmEye(TABLE_LENS));
  const spel = filmEye(PLAY_LENS), plats = kameransPlats(k);
  if (!plats || plats === 4) return oga(spel);
  const alla = spots(plan, TABLE_LENS), egen = alla.find(s => s.id === `P${plats}.C1`), fyra = alla.find(s => s.id === 'P4.C1');
  if (!egen || !fyra) throw Error(`Planen saknar det första kortet för plats ${plats}.`);
  return oga(seatView(spel, egen.at, fyra.at, KANT));
}

/**
 * Utseendet. 'vanligt' är Blenders bord som det är. 'nyckel' är för film där dealern ska skiljas ut i efterhand (Jakob
 * 2026-11-26: "bakgrunden blir en färg och bordet en annan"): bakgrunden i en ren färg och utan golv, bordet och
 * markerbrickan i en annan och utan tryck, kasseringslådan borta, och korten i spårfärger (framsidan vit innanför en
 * ram med ett märke i ett hörn; ryggen gul med ram, ett märke i mitten och ett vid ena kortsidan), så att sidan och
 * hörnen går att känna igen. Färgerna ligger långt från hud, från varandra och från skons svarta.
 */
export type Utseende = 'vanligt' | 'nyckel';
export const NYCKEL = {bakgrund: 0x0047bb, bord: 0x00b140, kortrygg: 0xffd400, ram: 0x00c8ff, marke: 0xff2fd0};

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
  /** Ställer mannen i en ruta. `motKameran` (0–1): ansiktet vrids ända fram mot blickpunkten (se pose nedan). */
  pose(f: Frame, hip: number[], motKameran?: number): void;
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

/** Vilken av de två standarddockorna som visas. De har samma skelett, och en rörelse är händernas, armarnas och blickens
 *  lägen i rummet: kroppen ställs efter dem, så kvinnan gör samma rörelser som mannen utan att något görs om. */
export type Docka = 'man' | 'kvinna';

export async function byggScen(canvas: HTMLCanvasElement, plan: Plan, hip: number[], vila: Frame, laddar: (text: string) => void, utseende: Utseende = 'vanligt', docka: Docka = 'man'): Promise<Scen> {
  const nyckel = utseende === 'nyckel';
  const renderer = new T.WebGLRenderer({canvas, antialias: true}); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  // Ljuset, bakgrunden, golvet och bildens tonkurva är standardrummets; nyckelfärgerna får en ren bakgrund och inget golv.
  const scene = new T.Scene(); roomLight(scene, renderer, nyckel ? {background: NYCKEL.bakgrund} : undefined);
  const camera = new T.PerspectiveCamera(30, 1.5, 0.05, 40);

  // Kortet som delas: ett av bordets egna kort (samma utseende som Blenders); tills bordet har kommit ett enkelt kort.
  const card = new T.Group(); card.matrixAutoUpdate = false; scene.add(card);

  // Dockan: mannen eller kvinnan.
  laddar(docka === 'kvinna' ? 'kvinnan' : 'mannen');
  const figure = await loadFigure(MODELLER[docka]); scene.add(figure.root);
  const bone = (name: string) => { const b = figure.root.getObjectByName(name); if (!b) throw Error(`Dockan saknar leden ${name}.`); return b.getWorldPosition(new T.Vector3()); };
  const v = (p: number[]) => new T.Vector3(p[0], p[1], p[2]);
  /** En ruta på mannen, som dealer3d/src/stage.ts gör det: bålen ur axlarna och höften, armarna ur lederna, händerna ur sina 21 punkter, huvudet mot blicken. */
  // `motKameran` (0–1): hur mycket av vägen ansiktet vrids ända fram mot blickpunkten. Dockans kod vrider huvudet två
  // tredjedelar av vinkeln mot blicken (på en människa gör ögonen resten, men mannens ögon står stilla), så utan det ser
  // han under kameran. Jakob 2026-11-26: i vilan ska han alltid titta mot kameran. Ansiktet ställs därför en gång, det som
  // är kvar till blicken mäts, och huvudet ställs igen mot en punkt så mycket längre bort att ansiktet hamnar rätt.
  function pose(f: Frame, h: number[], motKameran = 0) {
    const s3 = (p: number[], q: number[]): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
    const hand = (p: number[][], side: 1 | -1) => { const n = cross(s3(p[5], p[0]), s3(p[17], p[0])), mid = [(p[9][0] + p[12][0]) / 2, (p[9][1] + p[12][1]) / 2, (p[9][2] + p[12][2]) / 2];
      return {forward: s3(mid, p[0]), palm: [n[0] * side, n[1] * side, n[2] * side] as V3, points: p as V3[]}; };
    const looks = v(f.g).sub(v(f.h)).normalize(), hander = [hand(f.R.p, 1), hand(f.L.p, -1)];
    const stall = (mot: T.Vector3) => figure.pose({hip: h as V3, shoulders: [f.R.s as V3, f.L.s as V3], arms: [{shoulder: f.R.s as V3, elbow: f.R.e as V3, wrist: f.R.w as V3}, {shoulder: f.L.s as V3, elbow: f.L.e as V3, wrist: f.L.w as V3}],
      hands: hander, looks: [mot.x, mot.y, mot.z]});
    // Leden dockans kod siktar med (från huvudets led till dess framkant) pekar brantare uppåt än ansiktet ser: siktet
    // lyfts därför BLICK_LYFT grader över blickpunkten, så att ögonen, inte pannan, är riktade mot den.
    const andel = Math.max(0, Math.min(1, motKameran)), vagratt = new T.Vector3().crossVectors(looks, new T.Vector3(0, 1, 0)).normalize();
    const mal = andel > 0 ? looks.clone().applyAxisAngle(vagratt, BLICK_LYFT * Math.PI / 180 * andel) : looks;
    stall(mal);
    if (andel > 0 && figure.root.getObjectByName('headfront') && figure.root.getObjectByName('Head')) {
      const fram = bone('headfront').sub(bone('Head')).normalize(), kvar = fram.angleTo(mal);
      if (kvar > 0.005) stall(mal.clone().applyAxisAngle(new T.Vector3().crossVectors(fram, mal).normalize(), Math.min(0.6, 1.515 * kvar) * andel));
    }
    // Kortet: lokalt x tvärs, y ut ur framsidan (normalen), z längs långsidan, som dealer3d/src/stage.ts lägger sitt.
    const n = v(f.card.n).normalize(), l = v(f.card.l).normalize(), x = new T.Vector3().crossVectors(n, l);
    card.matrix.makeBasis(x, n, l).setPosition(v(f.card.c)); card.matrixWorldNeedsUpdate = true;
  }

  // Stolen under honom som han sitter i vilan (rörelsens första ruta), ställd efter standardrummets regel.
  laddar('stolen');
  pose(vila, hip);
  const {stool: stolen, set: satt} = await seatStool(MODELLER.stol, scene, figure.root);
  let hud: T.SkinnedMesh | null = null; figure.root.traverse(o => { if ((o as T.SkinnedMesh).isSkinnedMesh) hud = o as T.SkinnedMesh; });

  // Spårkortets två sidor (utseendet 'nyckel'), ritade: ram, fält och märken.
  const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
  const sparsida = (rygg: boolean) => { const c = document.createElement('canvas'); c.width = 252; c.height = 352; const g = c.getContext('2d')!;
    g.fillStyle = hex(NYCKEL.ram); g.fillRect(0, 0, 252, 352); g.fillStyle = rygg ? hex(NYCKEL.kortrygg) : '#ffffff'; g.fillRect(20, 20, 212, 312);
    g.fillStyle = hex(NYCKEL.marke); const prick = (x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    if (rygg) { prick(126, 176, 34); prick(126, 70, 16); } else prick(54, 54, 20);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return new T.MeshStandardMaterial({map: t, roughness: 0.9}); };
  const fram = nyckel ? sparsida(false) : new T.MeshStandardMaterial({color: 0xf4f2ec}), rygg = nyckel ? sparsida(true) : new T.MeshStandardMaterial({color: 0xb8333b});
  const enkelt = new T.Mesh(new T.BoxGeometry(0.063, 0.0003, 0.088), [0, 0, fram, rygg, 0, 0].map(m => m || new T.MeshStandardMaterial({color: nyckel ? NYCKEL.ram : 0xe8e4dc})) as T.Material[]);
  enkelt.castShadow = true; card.add(enkelt);

  // Bordet, för sig: det tar en stund. Kortet som delas blir ett av bordets egna exempelkort (samma utseende som
  // Blenders), utom med nyckelfärgerna, där spårkortet står kvar. Måtten: planens kortplatser mot bordets tryckta
  // (millimeter), bordets kant mot dealern och skivans överkant.
  let bordRot: T.Object3D | null = null; const markeringar: T.Object3D[] = [];
  const bord = loadTable(MODELLER.bord, scene, plan, {key: nyckel ? {table: NYCKEL.bord, cardBack: NYCKEL.kortrygg} : undefined, progress: share => laddar(`bordet ${Math.round(share * 100)} %`)}).then(b => {
    if (b.card && !nyckel) { card.remove(enkelt); card.add(b.card); }
    bordRot = b.root; markeringar.push(...b.marks);
    return {platser: b.places, maxMm: b.maxMm, kortP4Mm: b.cardP4Mm, kantZ: b.edgeZ, skivaY: b.topY};
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
  return {renderer, scene, camera, figure, card, bord, stol: {sank: satt.lowered, flytt: satt.moved as V3, sitsUppe: satt.seatModel, sitsNu: satt.seatNow, ryggstod: satt.backrest, knaveck: satt.knee, hoft: satt.hip as V3},
    pose, bone, hud: hud!, synlig, render: () => renderer.render(scene, camera), setKamera, storlek, filmstorlek, bild, filmRam: ram};
}
