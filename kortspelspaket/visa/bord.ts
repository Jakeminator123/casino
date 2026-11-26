// Bordsvyn: paketets figur som dealer och sju spelare vid spelets blackjackbord, i standardrummet (bordet, ljuset och
// golvet ur blackjack-dealer/dealer3d/src/standard-room.ts, samma som standarddockans editor och studions dockvy ritar)
// och med spelets kamera (PLAY_LENS i blackjack-dealer/src/table-lens.ts). Inget av det kopieras hit.
//
// Paketets rörelser är inspelade vid paketets eget bord, var och en i sin egen ram: den som sitter har höften omkring
// 115 cm från ramens mitt och är vänd mot den, och bordsskivan ligger 78 cm över golvet. Det är mätt ur rörelserna och
// prövat i bild: i vilan ligger fingrarnas leder 80–81 cm över golvet, och med skivan vid 80 sjunker figurens fingrar
// ner i filten, vid 78 ligger de på den. Figuren ställs så att den skivan är spelets filt och höften hamnar på sin
// plats vid spelets bord.
//
// Bredvid spelets bord finns egna bord för paketets figurer (paketbord.ts), valda med valjBord: spelets bord döljs,
// spelarna flyttas till det bordets platser, och kamerorna utom spelets ryms med hela det bordet. Dealern, filtens
// höjd och spelets kamera är desamma vid alla bord.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ROOM_EDGE, STOOL, loadTable, roomLight} from '../../blackjack-dealer/dealer3d/src/standard-room.ts';
import {spots, type Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {DOLL_TABLE, FILM, PLAY_LENS, TABLE_BASE, TABLE_LENS, filmEye, fovYDeg} from '../../blackjack-dealer/src/table-lens.ts';
import {KROPP, egnaBord, type Plats} from './paketbord.ts';

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

/**
 * En som sitter vid bordet: dealern (nr 0) eller spelaren på plats 1–7 (nr är platsen och dess ställe i listan), med
 * figuren och rörelsen den spelar nu. `ledig`: platsen finns inte vid det valda bordet, och sidan visar den inte.
 */
export type Sits = {nr: number; titel: string; plats: number | null; holder: T.Group; mixer: T.AnimationMixer; action: T.AnimationAction | null; namn: string | null; length: number; ledig: boolean};
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
  /** Borden som går att välja i vyn (sidan visar valet när de är fler än ett), det valda bordets id, och bytet: spelarna flyttas till det bordets platser. */
  bordslag: {id: string; namn: string}[];
  valtBord(): string;
  valjBord(id: string): void;
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
    return {nr, titel, plats, holder, mixer: new T.AnimationMixer(body), action: null, namn: null, length: 0, ledig: false};
  };
  const sitsar = [seat(0, 'dealern', null, 0, edgeZ - DEALER_BEHIND, 0)];
  for (let plats = 1; plats <= 7; plats++) {
    const card = places.find(s => s.id === `P${plats}.C1`);
    if (!card) throw Error(`Kortplanen saknar det första kortet för plats ${plats}.`);
    const angle = Math.atan2(card.at[0], card.at[2] - edgeZ) * SEAT_SPREAD, out = DOLL_TABLE.depth + PLAYER_OUTSIDE;
    const x = Math.sin(angle) * out, z = edgeZ + Math.cos(angle) * out;
    sitsar.push(seat(plats, `spelaren på plats ${plats}`, plats, x, z, Math.atan2(card.at[0] - x, card.at[2] - z)));
  }

  // Borden: spelets (modellen nedan) och de egna, som är dolda tills ett av dem väljs. Var spelarna sitter vid spelets
  // bord sparas, så att de kan flyttas tillbaka.
  const spel: (Plats | null)[] = sitsar.map(s => s.nr ? {x: s.holder.position.x, z: s.holder.position.z, turn: s.holder.rotation.y} : null);
  const egna = egnaBord({edgeZ, hipZ: edgeZ - DEALER_BEHIND, places});
  for (const b of egna) scene.add(b.root);
  const bordslag = [{id: 'spel', namn: 'spelets'}, ...egna.map(b => ({id: b.id, namn: b.namn}))]; let valt = 'spel';
  const eget = () => egna.find(b => b.id === valt);

  // Bordet (35 MB) och pallarna kommer efter hand; figurerna visas under tiden.
  let board: T.Object3D | null = null, boardY = 0, lift = 0;
  const hojd = (meter: number) => { lift = meter; if (board) board.position.y = boardY + lift; for (const b of egna) b.root.position.y = lift; };
  const table = loadTable(MODELS.bord, scene, plan, {progress: share => laddar(`Laddar bordet: ${Math.round(share * 100)} %`)})
    .then(t => { board = t.root; boardY = t.root.position.y; t.root.visible = !eget(); hojd(lift); return ''; }, () => 'Spelets bord är inte byggt på den här datorn (avatar-auto-pipeline/assets/bord/standardbord_nara23.glb).');
  /** Byter bord: det valda visas, och spelarna flyttas och vrids till dess platser. En plats bordet inte har blir ledig och står kvar där den stod. */
  const valjBord = (id: string) => {
    if (!bordslag.some(b => b.id === id)) return;
    valt = id; const own = eget();
    if (board) board.visible = !own;
    for (const b of egna) b.root.visible = b === own;
    for (const s of sitsar) {
      if (!s.nr) continue; // dealern sitter där han sitter
      const p = (own ? own.platser : spel)[s.nr]; s.ledig = !p;
      if (p) { s.holder.position.set(p.x, 0, p.z); s.holder.rotation.y = p.turn; }
    }
  };
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
  /** Kamerorna vid spelets bord. */
  function spelKamera(vy: Vy): Kamera {
    if (vy === 'sida') return {pos: v(-2.8, 0.5, z + 0.35), mot: v(0, -0.05, z + 0.35), fov: 38}; // från dealerns högra sida
    if (vy === 'topp') return {pos: v(0, 3.1, z + 0.46), mot: v(0, 0, z + 0.4), fov: 42};
    if (vy === 'runt') return {pos: v(1.9, 2.0, z + 3.1), mot: v(0, -0.1, z + 0.35), fov: 38}; // snett uppifrån, över spelarnas huvuden
    const e = filmEye(PLAY_LENS), p = v(...e.position);
    return {pos: p, mot: p.clone().addScaledVector(v(...e.forward), 1.6), fov: fovYDeg(e.focalPx), kvot: FILM.width / FILM.height};
  }
  /**
   * Kamerorna. Spelets vy är densamma vid alla bord. Vid ett eget bord är de andra spelets kameror flyttade så att
   * hela det bordet och de som sitter vid det ryms: längre bort i samma riktning så mycket som bordet är bredare, och
   * riktade mot mitten mellan dealerns rygg och den bortersta spelarens.
   */
  function kamera(vy: Vy): Kamera {
    const k = spelKamera(vy), own = eget();
    if (!own || vy === 'spel') return k;
    const far = Math.max(1, (own.halvBredd + KROPP) / (Math.max(...spel.map(p => Math.abs(p?.x ?? 0))) + KROPP));
    const near = own.djup[0] - KROPP, deep = own.djup[1] + KROPP - near, mid = edgeZ + near + deep / 2, half = Math.tan(k.fov * Math.PI / 360);
    if (vy === 'sida') { const away = -k.pos.x * far; return {pos: v(-away, k.pos.y, mid), mot: v(0, k.mot.y, mid), fov: k.fov, kvot: deep / (2 * away * half)}; }
    // Uppifrån med luft runt om: sidans knappar och tidslinje ligger över bildens över- och underkant.
    if (vy === 'topp') { const high = Math.max(k.pos.y, 1.25 * deep / 2 / half); return {pos: v(0, high, mid + k.pos.z - k.mot.z), mot: v(0, 0, mid), fov: k.fov, kvot: 1.1 * (own.halvBredd + KROPP) / (high * half)}; }
    return {pos: k.mot.clone().addScaledVector(k.pos.clone().sub(k.mot), far), mot: k.mot, fov: k.fov};
  }
  return {scene, sitsar, kamera, klart, hojd, bordslag, valtBord: () => valt, valjBord};
}
