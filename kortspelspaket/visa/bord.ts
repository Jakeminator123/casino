// Bordsvyn: paketets figur som dealer och sju spelare vid spelets blackjackbord, i standardrummet (bordet, ljuset och
// golvet ur blackjack-dealer/dealer3d/src/standard-room.ts, samma som standarddockans editor och studions dockvy ritar)
// och med spelets kamera (PLAY_LENS i blackjack-dealer/src/table-lens.ts). Inget av det kopieras hit.
//
// Paketets rörelser är inspelade vid paketets eget bord, var och en i sin egen ram: den som sitter har höften omkring
// 115 cm från ramens mitt och är vänd mot den, och bordsskivan ligger 78 cm över golvet. Det är mätt ur rörelserna och
// prövat i bild: i vilan ligger fingrarnas leder 80–81 cm över golvet, och med skivan vid 80 sjunker figurens fingrar
// ner i filten, vid 78 ligger de på den. Figuren ställs så att den skivan är spelets filt och höften hamnar på sin
// plats vid spelets bord.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ROOM_EDGE, STOOL, loadTable, roomLight} from '../../blackjack-dealer/dealer3d/src/standard-room.ts';
import {spots, type Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {DOLL_TABLE, FILM, PLAY_LENS, TABLE_BASE, TABLE_LENS, filmEye, fovYDeg} from '../../blackjack-dealer/src/table-lens.ts';

/** Paketets bord i rörelsernas egen ram, i centimeter: skivans höjd, höftens avstånd från ramens mitt och dess höjd. */
const PACK = {top: 78, hipLine: 115, hip: 55};
/** Dealerns höft bakom bordets kant mot dealern, som standarddockans (meter). */
const DEALER_BEHIND = 0.15;
/** Spelarnas höft utanför bordets rundade kant (meter): så når deras händer in till kortplatserna som i paketet. */
const PLAYER_OUTSIDE = 0.2;
/**
 * Spelarna sitter glesare än kortplatserna ligger: en plats vinkel från bordets mittlinje är kortplatsens gånger så här
 * mycket. Kortplatserna ligger 16 grader isär sedda från dealerns kant, vilket är 32 cm mellan stolarna; sju kroppar
 * får plats först vid 24 grader (48 cm). Var och en sitter vänd mot sina egna kort.
 */
const SEAT_SPREAD = 1.5;
/** Sitsens överkant under höftleden (meter), som pallen ställs under standarddockan. */
const SEAT_UNDER_HIP = 0.1;
const MODELS = {bord: '/avatar-auto-pipeline/assets/bord/standardbord_nara23.glb', stol: '/avatar-auto-pipeline/assets/stol/dealerstol.glb'};

/** En som sitter vid bordet: dealern (nr 0) eller spelaren på plats 1–7 (nr är platsen), med figuren och rörelsen den spelar nu. */
export type Sits = {nr: number; titel: string; plats: number | null; holder: T.Group; mixer: T.AnimationMixer; action: T.AnimationAction | null; namn: string | null; length: number};
/** Kamerorna: spelets vy (det spelaren på plats 4 ser), snett framifrån över hela bordet, från sidan och uppifrån. */
export type Vy = 'spel' | 'runt' | 'sida' | 'topp';
export type Kamera = {pos: T.Vector3; mot: T.Vector3; fov: number; /** bildens bredd genom höjd, för en vy som ska rymmas hel */ kvot?: number};
export type Bord = {
  scene: T.Scene; sitsar: Sits[];
  kamera(vy: Vy): Kamera;
  /** Löst när bordet och pallarna ligger på plats; texten säger vad som saknas, tom om allt kom. */
  klart: Promise<string>;
  /** Flyttar bordet upp eller ner från spelets höjd (meter; minus är ner). Figurerna, pallarna och golvet står kvar. */
  hojd(meter: number): void;
};

/**
 * Bygger bordsvyn. `figur` lämnar en ny kopia av paketets figur (i figurens egna enheter, `skala` gör dem till meter);
 * `laddar` får veta hur långt bordet har kommit.
 */
export async function byggBord(renderer: T.WebGLRenderer, figur: () => T.Object3D, skala: number, laddar: (text: string) => void): Promise<Bord> {
  const plan = await (await fetch('/blackjack-dealer/placements/default.json')).json() as Plan;
  const scene = new T.Scene();
  roomLight(scene, renderer);
  const edgeZ = ROOM_EDGE[2] - DOLL_TABLE.edgeBack; // bordets kant mot dealern, och mitten av halvmånens raka sida

  // Platserna. Dealern mitt för kanten, vänd mot spelarna. Spelarna på plats 1–7 utanför den rundade kanten, i den
  // riktning från kantens mitt som platsens första kort ligger i, utdragen med SEAT_SPREAD, och vända mot det kortet.
  const places = spots(plan, TABLE_LENS);
  const seat = (nr: number, titel: string, plats: number | null, x: number, z: number, turn: number): Sits => {
    const holder = new T.Group(), body = figur();
    body.scale.setScalar(skala); body.position.set(0, -PACK.top * skala, PACK.hipLine * skala);
    body.traverse(o => { if ((o as T.Mesh).isMesh) o.castShadow = true; });
    holder.add(body); holder.position.set(x, 0, z); holder.rotation.y = turn; holder.userData.sits = nr; scene.add(holder);
    return {nr, titel, plats, holder, mixer: new T.AnimationMixer(body), action: null, namn: null, length: 0};
  };
  const sitsar = [seat(0, 'dealern', null, 0, edgeZ - DEALER_BEHIND, 0)];
  for (let plats = 1; plats <= 7; plats++) {
    const card = places.find(s => s.id === `P${plats}.C1`);
    if (!card) throw Error(`Kortplanen saknar det första kortet för plats ${plats}.`);
    const angle = Math.atan2(card.at[0], card.at[2] - edgeZ) * SEAT_SPREAD, out = DOLL_TABLE.depth + PLAYER_OUTSIDE;
    const x = Math.sin(angle) * out, z = edgeZ + Math.cos(angle) * out;
    sitsar.push(seat(plats, `spelaren på plats ${plats}`, plats, x, z, Math.atan2(card.at[0] - x, card.at[2] - z)));
  }

  // Bordet (35 MB) och pallarna kommer efter hand; figurerna visas under tiden.
  let board: T.Object3D | null = null, boardY = 0, lift = 0;
  const hojd = (meter: number) => { lift = meter; if (board) board.position.y = boardY + lift; };
  const table = loadTable(MODELS.bord, scene, plan, {progress: share => laddar(`Laddar bordet: ${Math.round(share * 100)} %`)})
    .then(t => { board = t.root; boardY = t.root.position.y; hojd(lift); return ''; }, () => 'Spelets bord är inte byggt på den här datorn (avatar-auto-pipeline/assets/bord/standardbord_nara23.glb).');
  // En pall under var och en: dealerns pall, med sitsen under figurens höft. Var sitsen är i modellen hittas med en
  // stråle rakt ner genom sitsens mitt (STOOL.seatMid); pallen trycks ihop i höjd så att sitsen kommer rätt.
  const stools = new GLTFLoader().loadAsync(MODELS.stol).then(g => {
    const model = g.scene; model.updateMatrixWorld(true);
    const [sx, sz] = STOOL.seatMid, hit = new T.Raycaster(new T.Vector3(sx, 3, sz), new T.Vector3(0, -1, 0)).intersectObject(model, true)[0];
    if (!hit) return 'Pallens sits hittades inte i modellen.';
    model.traverse(o => { if ((o as T.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const seatOverFloor = (PACK.hip - PACK.top) / 100 - SEAT_UNDER_HIP - TABLE_BASE.floor;
    for (const s of sitsar) {
      const stool = model.clone(true), pivot = new T.Group();
      stool.position.set(-sx, 0, -sz); pivot.add(stool);
      pivot.position.set(0, TABLE_BASE.floor, 0); pivot.scale.y = seatOverFloor / hit.point.y;
      s.holder.add(pivot); // följer figuren: dold när den är dold
    }
    return '';
  }, () => 'Dealerns pall är inte byggd på den här datorn (avatar-auto-pipeline/assets/stol/dealerstol.glb).');
  const klart = Promise.all([table, stools]).then(said => said.filter(Boolean).join(' '));

  const v = (x: number, y: number, z: number) => new T.Vector3(x, y, z), z = ROOM_EDGE[2];
  function kamera(vy: Vy): Kamera {
    if (vy === 'sida') return {pos: v(-2.8, 0.5, z + 0.35), mot: v(0, -0.05, z + 0.35), fov: 38}; // från dealerns högra sida
    if (vy === 'topp') return {pos: v(0, 3.1, z + 0.46), mot: v(0, 0, z + 0.4), fov: 42};
    if (vy === 'runt') return {pos: v(1.9, 2.0, z + 3.1), mot: v(0, -0.1, z + 0.35), fov: 38}; // snett uppifrån, över spelarnas huvuden
    const e = filmEye(PLAY_LENS), p = v(...e.position);
    return {pos: p, mot: p.clone().addScaledVector(v(...e.forward), 1.6), fov: fovYDeg(e.focalPx), kvot: FILM.width / FILM.height};
  }
  return {scene, sitsar, kamera, klart, hojd};
}
