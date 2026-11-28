// Scenen i editorn: livebordet (avatar-auto-pipeline/assets/bord/standardbord_live.glb), stolen och Danilo eller Frasse
// i livebordets linsvärld (blackjack-dealer/src/table-live.ts), med ljus som liknar Blenders bilder, kortet som rörelsen
// delar och kamerorna. Dockan ställs med dockans egen kod (blackjack-dealer/dealer3d/src/figure-model.ts).
import * as T from 'three';
import {loadFigure, type Figure} from '../../blackjack-dealer/dealer3d/src/figure-model.ts';
import {dollNamed} from '../../blackjack-dealer/dealer3d/src/doll.ts';
import {LIVE, LIVE_CAMERA, liveFrame} from '../../blackjack-dealer/src/table-live.ts';
import {STANDARD} from '../../blackjack-dealer/src/standard.ts';
import {CARD} from '../../blackjack-dealer/src/space.ts';
import {RUMMETS_Z, loadTable, roomLight, seatStool} from './rum.ts';
import {cross, type Frame, type V3} from './rorelse.ts';
import {dockorna} from './dockval.ts';

/** Dockorna vid livebordet (dealer3d/src/doll.ts LIVE_DOLLS): Danilo, Frasse och en persons docka ur sina bilder (dockval.ts dockorna). */
export type Livedocka = string;
export const LIVEDOCKOR: readonly Livedocka[] = dockorna();
export const arLivedocka = (namn: string | null | undefined): namn is Livedocka => (LIVEDOCKOR as readonly string[]).includes(namn ?? '');
/** Filmens bild (livebordets egen, 1728 x 972): inspelningen görs i den. */
export const FILMBILD = LIVE_CAMERA.film;

// Rummet (bordet med skon, stolen under honom, golvet och ljuset) står i rum.ts.
const MODELLER = {danilo: '/avatar-auto-pipeline/assets/docka/standarddocka_danilo.glb', frasse: '/avatar-auto-pipeline/assets/docka/standarddocka_frasse.glb',
  bord: '/avatar-auto-pipeline/assets/bord/standardbord_live.glb', stol: '/avatar-auto-pipeline/assets/stol/dealerstol.glb'};

/** Kameran från en av de sex andra platserna vid bordet; plats 4 är livebordets kamera, 'spel'. */
export type Platskamera = 'plats1' | 'plats2' | 'plats3' | 'plats5' | 'plats6' | 'plats7';
/** Kamerorna. 'spel' är livebordets kamera (mätt i filmen); de andra platsernas räknas ur den. */
export type Kamera = 'spel' | 'sida' | 'topp' | 'fri' | Platskamera;
const KAMEROR: readonly string[] = ['spel', 'sida', 'topp', 'fri', 'plats1', 'plats2', 'plats3', 'plats5', 'plats6', 'plats7'];
/** En kamera ur ett namn i en adress eller ett verktyg; 'plats4' är livebordets kamera. */
export const somKamera = (namn: string | null | undefined): Kamera | null => namn === 'plats4' ? 'spel' : KAMEROR.includes(namn ?? '') ? namn as Kamera : null;
/** Kameran för en plats 1–7 vid bordet. */
export const platskamera = (plats: number): Kamera => plats === 4 ? 'spel' : `plats${plats}` as Platskamera;
/** Platsen (1–7) en kamera står på, eller null för de kameror som inte är en spelares. */
export const kameransPlats = (k: Kamera): number | null => k === 'spel' ? 4 : k.startsWith('plats') ? Number(k.slice(5)) : null;
/** Sidokameran: bildens bredd (meter, som Blenders 'sida') och hur många gånger längre bort än Blenders den står (kameraVy). */
const SIDA = {bredd: 2.5, langre: 8};
type Oga = {position: V3; forward: V3};
/** Ögat flyttat runt den lodräta linjen genom `pivot`; en positiv vinkel (radianer) för det mot bildens höger. */
function runt(e: Oga, pivot: V3, vinkel: number): Oga {
  const c = Math.cos(vinkel), s = Math.sin(vinkel), vrid = (v: V3): V3 => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  const t = vrid([e.position[0] - pivot[0], e.position[1] - pivot[1], e.position[2] - pivot[2]]);
  return {position: [pivot[0] + t[0], pivot[1] + t[1], pivot[2] + t[2]], forward: vrid(e.forward)};
}
/** Ögat för en annan plats: det står till platsens punkt (`egen`) som `vy` står till plats 4:s (`fyra`), vridet runt bordet så mycket som vinkeln mellan de två punkterna sedd från `pivot`. */
function platsensOga(vy: Oga, egen: V3, fyra: V3, pivot: V3): Oga {
  const baring = (p: V3) => Math.atan2(p[0] - pivot[0], p[2] - pivot[2]), t = runt(vy, fyra, baring(egen) - baring(fyra));
  return {...t, position: [t.position[0] + egen[0] - fyra[0], t.position[1], t.position[2] + egen[2] - fyra[2]]};
}
/**
 * De fasta kamerorna: läge, punkten de ser mot och lodrät bildvinkel i grader. 'spel' är livebordets kamera (LIVE_CAMERA,
 * mätt i filmen): ögat 0,6175 m över filten rakt över origo, 18,13 grader ned, rullad som filmen (liveFrame), med
 * bildvinkeln ur brännvidden i sin egen bild (1728 x 972). En plats kamera är en spelares vy från sin insatsruta
 * (LIVE.betMarks; Jakob 2026-11-27: "en vinkel från ... insatsplaceringssymboler"): livebordets kamera vriden kring
 * lodlinjen genom mitten av livebordets kant så mycket som platsens insatsruta ligger vid sidan av plats 4:s, sett därifrån,
 * och flyttad så att den står till sin ruta som livebordets kamera står till plats 4:s: lika högt, lika långt, lika brant och
 * med samma lins, utan rullningen (-0,16 grader). Från sidan och uppifrån räknade från RUMMETS_Z (rum.ts).
 */
export function kameraVy(k: Exclude<Kamera, 'fri'>): {pos: V3; mot: V3; fov: number; upp?: V3} {
  const film = LIVE_CAMERA.film, fov = 2 * Math.atan(film.height / 2 / LIVE_CAMERA.focalPx) * 180 / Math.PI, z = RUMMETS_Z, lf = liveFrame();
  const oga = (e: Oga) => ({pos: e.position, mot: [e.position[0] + e.forward[0] * 2, e.position[1] + e.forward[1] * 2, e.position[2] + e.forward[2] * 2] as V3, fov});
  // Från hans högra sida: Blenders kamera 'sida' (ortografisk, bilden 2,5 m bred, från X -3,0 m, 0,05 m bakom
  // och 1,20 m över golvet, mot X 0 och 0,80 m över golvet). Den här kameran har perspektiv, så den står SIDA.langre gånger
  // längre bort längs samma siktlinje med en så smal vinkel att bilden blir lika stor.
  if (k === 'sida') { const golv = LIVE.floor.feltOverFloor, mot: V3 = [0, 0.80 - golv, z - 0.05], fran: V3 = [-3.0, 1.20 - golv, z - 0.05], d = fran.map((n, i) => (n - mot[i]) * SIDA.langre), avst = Math.hypot(...d);
    return {pos: mot.map((n, i) => n + d[i]) as V3, mot, fov: 2 * Math.atan(SIDA.bredd / (film.width / film.height) / 2 / avst) * 180 / Math.PI}; }
  if (k === 'topp') return {pos: [0.06, 2.15, z + 0.32], mot: [0.06, 0, z + 0.1], fov: 42}; // uppifrån, han överst i bilden
  const plats = kameransPlats(k);
  if (!plats || plats === 4) return {...oga(lf), upp: lf.up};
  return oga(platsensOga({position: lf.position, forward: lf.forward}, LIVE.betMarks[plats - 1] as V3, LIVE.betMarks[3] as V3, LIVE.edge as V3));
}

/**
 * Utseendet. 'vanligt' är Blenders bord som det är. 'nyckel' är för film där dealern ska skiljas ut i efterhand och
 * läggas på vårt eget bord: bakgrunden i en ren grön färg och utan golv, bordet och markerbrickan gröna och utan tryck,
 * kasseringslådan borta, och korten i spårfärger (framsidan vit innanför en ram med ett märke i ett hörn; ryggen gul
 * med ram, ett märke i mitten och ett vid ena kortsidan), så att sidan och hörnen går att känna igen. Allt omkring
 * dealern är grönt (Jakob 2026-11-26: "Ska inte också typ bordet och allt omkring bli grönt … Så gör väl 'dealer'"),
 * som i blackjack-dealers filmer, där spelets urklippning bara mäter grönt; bakgrunden var först blå, men blått ligger
 * för nära en blå skjorta. Bordet blir ljusare än bakgrunden i bilden, eftersom det är belyst. Färgerna ligger långt
 * från hud och från skons svarta.
 */
export type Utseende = 'vanligt' | 'nyckel';
/** Det som går att dölja i bilden: bordet, stolen och kortplatsernas markeringar från panelen, och dockan, kortet och skon från ett verktyg. */
export type Synligt = 'bord' | 'stol' | 'platser' | 'docka' | 'kort' | 'sko';
export const NYCKEL = {bakgrund: 0x00b140, bord: 0x00b140, kortrygg: 0xffd400, ram: 0x00c8ff, marke: 0xff2fd0, rodRygg: 0xb8333b};

export type Scen = {
  renderer: T.WebGLRenderer; scene: T.Scene; camera: T.PerspectiveCamera; figure: Figure; card: T.Object3D;
  /** Laddas för sig (35 MB); löst när bordet ligger på plats. */
  bord: Promise<{platser: {id: string; mm: number}[]; maxMm: number; kortP4Mm: number; kantZ: number; skivaY: number}>;
  /** Hans hud (den riggade kroppen), för mätningar på honom. */
  hud: T.SkinnedMesh;
  /** Visar eller döljer bordet (med skon och brickan), stolen eller bordets tryckta kortplatser. */
  synlig(vad: Synligt, pa: boolean): void;
  /** Hur stolen ställdes: sänkt, flyttad, sitsens överkant i modellen och nu (över golvet), luften från hans rygg till ryggstödet och från sitsens framkant till vaderna, och hans höftled i vilan. */
  stol: {sank: number; flytt: V3; sitsUppe: number; sitsNu: number; ryggstod: number; knaveck: number; hoft: V3};
  /** Ställer mannen i en ruta. `motKameran` läses inte längre (se pose nedan). */
  pose(f: Frame, hip: number[], motKameran?: number): void;
  bone(name: string): T.Vector3;
  render(): void;
  setKamera(k: Kamera): void;
  storlek(): void;
  /** Inspelningens läge på eller av: bilden ritas i filmens storlek (FILMBILD, 1728 x 972) i stället för fönstrets. */
  filmstorlek(pa: boolean): void;
  /** Ritar bilden som den står nu och lämnar den som PNG (för inspelningen, i filmens storlek). */
  bild(): Promise<Blob>;
  filmRam(): {left: number; top: number; width: number; height: number};
  /** Vilket kort som delas: bordets eget (Blenders) eller det enkla, och i så fall varför (bordet har inte kommit, saknar sitt exempelkort giv_P4.C1, eller det är ingen enkel mesh). */
  kortet(): string;
  /** Korten som redan har lagts och ligger kvar på bordet (en sekvens vid livebordet, rorelse.ts sekvens): samma kort som delas, ett per läge. */
  lagda(kort: readonly Frame['card'][]): void;
  /** Nästa kort i skons mynning (vid livebordet, när rörelsens eget kort har lämnat den): samma kort som delas, i det läge det står där; null döljer det. */
  nasta(kort: Frame['card'] | null): void;
};

/** Vilken docka som visas: Danilo eller Frasse. Båda har samma skelett, och en rörelse är händernas, armarnas och blickens
 *  lägen i rummet: kroppen ställs efter dem. */
export type Docka = Livedocka;

export async function byggScen(canvas: HTMLCanvasElement, hip: number[], vila: Frame, laddar: (text: string) => void, utseende: Utseende, docka: Docka, rorelsensDocka: string | null | undefined): Promise<Scen> {
  const nyckel = utseende === 'nyckel', film = FILMBILD;
  const renderer = new T.WebGLRenderer({canvas, antialias: true}); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  // Ljuset, bakgrunden, golvet och bildens tonkurva är rummets (rum.ts); nyckelfärgerna får en ren bakgrund och inget golv.
  const scene = new T.Scene(); roomLight(scene, renderer, nyckel ? {background: NYCKEL.bakgrund} : undefined);
  const camera = new T.PerspectiveCamera(30, 1.5, 0.05, 40);

  // Kortet som delas, ritat här nedan (kortets sidor).
  const card = new T.Group(); card.matrixAutoUpdate = false; scene.add(card);

  // Dockan: Danilo, Frasse eller en persons docka.
  laddar(docka.charAt(0).toUpperCase() + docka.slice(1));
  // En modell på prov (?modell=<namn> och ?bord=<namn> i adressen: standarddocka_<namn>.glb och standardbord_<namn>.glb
  // ur avatar-auto-pipeline/assets), för den som bygger om dockan eller bordet och vill se det innan det byts in.
  const prov = (nyckel: string) => { const n = new URLSearchParams(location.search).get(nyckel); return n && /^[a-z0-9_]+$/.test(n) ? n : null; };
  // ?vridben=0: underarmens vridning läggs på ForeArm som i en docka utan vridben (för att jämföra; figure-model.ts).
  // Dockans storlek: spelar den sina egna rörelser visas den i sin egen storlek, den som rörelserna, handens punkter och
  // fingertopparna är mätta på. En annan kropp (en modell på prov, som Tomasz figur) görs så stor att armen blir den lyfta
  // rörelsens dockas (Danilos eller Frasses), som rörelsens handleder är ritade för.
  const egen = !prov('modell') && rorelsensDocka === docka ? dollNamed(docka) : null;
  const lyftDocka = !egen && arLivedocka(rorelsensDocka) ? dollNamed(rorelsensDocka) : null, arm = egen ?? lyftDocka;
  const figure = await loadFigure(prov('modell') ? `/avatar-auto-pipeline/assets/docka/standarddocka_${prov('modell')}.glb` : (MODELLER as Record<string, string>)[docka] ?? `/avatar-auto-pipeline/assets/docka/standarddocka_${docka}.glb`, {twistBones: prov('vridben') !== '0', ...(arm ? {arm: arm.upperArm + arm.forearm} : {})}); scene.add(figure.root);
  const bone = (name: string) => { const b = figure.root.getObjectByName(name); if (!b) throw Error(`Dockan saknar leden ${name}.`); return b.getWorldPosition(new T.Vector3()); };
  const v = (p: number[]) => new T.Vector3(p[0], p[1], p[2]);
  /** En ruta på dockan: bålen ur axlarna och höften, armarna ur lederna, händerna ur sina 21 punkter, huvudet mot blicken. */
  // Blicken: dockans kod riktar linjen mellan hans ögon mot rutans blickpunkt, i vågen (figure-model.ts), så i vilan ser
  // han in i spelets kamera (Jakob 2026-11-26: "A1 [ska] alltid ha avataren som tittar mot kameran").
  function pose(f: Frame, h: number[]) {
    const s3 = (p: number[], q: number[]): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
    const hand = (p: number[][], side: 1 | -1) => { const n = cross(s3(p[5], p[0]), s3(p[17], p[0])), mid = [(p[9][0] + p[12][0]) / 2, (p[9][1] + p[12][1]) / 2, (p[9][2] + p[12][2]) / 2];
      return {forward: s3(mid, p[0]), palm: [n[0] * side, n[1] * side, n[2] * side] as V3, points: p as V3[]}; };
    const looks = v(f.g).sub(v(f.h)).normalize();
    figure.pose({hip: h as V3, shoulders: [f.R.s as V3, f.L.s as V3], arms: [{shoulder: f.R.s as V3, elbow: f.R.e as V3, wrist: f.R.w as V3}, {shoulder: f.L.s as V3, elbow: f.L.e as V3, wrist: f.L.w as V3}],
      hands: [hand(f.R.p, 1), hand(f.L.p, -1)], looks: [looks.x, looks.y, looks.z], lookAt: f.g as V3, face: f.a ?? {}, // ansiktet i vila där rutan inte har något
      ...(f.hv ? {headAt: f.hv as V3} : {}), ...(f.ht ? {headTilt: f.ht} : {})}); // (en lyft rörelse kan ge huvudets eget mål, hv, och dess tippning, ht: då ser ögonen på blickpunkten och huvudet dit)
    kortLage(card, f.card);
  }
  /** Kortet: lokalt x tvärs, y ut ur framsidan (normalen), z längs långsidan. */
  function kortLage(o: T.Object3D, k: Frame['card']) {
    const n = v(k.n).normalize(), l = v(k.l).normalize(), x = new T.Vector3().crossVectors(n, l);
    o.matrix.makeBasis(x, n, l).setPosition(v(k.c)); o.matrixWorldNeedsUpdate = true;
  }
  // De lagda korten (lagda nedan): en grupp som läggs i scenen först när det finns något att lägga; kloner av kortet som delas.
  let lagdaGrupp: T.Group | null = null;
  function lagda(kort: readonly Frame['card'][]) {
    if (!lagdaGrupp) { if (!kort.length) return; lagdaGrupp = new T.Group(); scene.add(lagdaGrupp); }
    const g = lagdaGrupp; while (g.children.length > kort.length) g.remove(g.children[g.children.length - 1]);
    while (g.children.length < kort.length) { const o = new T.Group(); o.matrixAutoUpdate = false; o.add(card.children[0].clone()); g.add(o); }
    kort.forEach((k, i) => kortLage(g.children[i], k)); g.visible = card.visible;
  }
  // Nästa kort i skon (nasta nedan): en klon av kortet som delas.
  let nastaKort: T.Group | null = null;
  function nasta(k: Frame['card'] | null) {
    if (!k) { if (nastaKort) nastaKort.visible = false; return; }
    if (!nastaKort) { nastaKort = new T.Group(); nastaKort.matrixAutoUpdate = false; nastaKort.add(card.children[0].clone()); scene.add(nastaKort); }
    kortLage(nastaKort, k); nastaKort.visible = card.visible;
  }

  // Stolen under honom som han sitter i vilan (rörelsens första ruta), ställd efter rummets regel (rum.ts STOOL).
  laddar('stolen');
  pose(vila, hip);
  const {stool: stolen, set: satt} = await seatStool(MODELLER.stol, scene, figure.root);
  let hud: T.SkinnedMesh | null = null; figure.root.traverse(o => { if ((o as T.SkinnedMesh).isSkinnedMesh) hud = o as T.SkinnedMesh; });

  // Spårkortets två sidor (utseendet 'nyckel'), ritade: ram, fält och märken.
  const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
  // Med ?rygg=rod är ryggen kortets riktiga: röd med vit kant och utan märken (NYCKEL.rodRygg). Då ritar filmmodellen
  // själv kortets rygg, också i farten, och efterarbetet ritar bara framsidan, som bär valören (domaren 2026-11-27: det gula
  // spårkortet gick inte att byta ut rent där hand och kort är utsmetade av farten). Framsidan är spårkortets i båda.
  const rodRygg = nyckel && prov('rygg') === 'rod';
  const sparsida = (rygg: boolean) => { const c = document.createElement('canvas'); c.width = 252; c.height = 352; const g = c.getContext('2d')!;
    if (rygg && rodRygg) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 252, 352); g.fillStyle = hex(NYCKEL.rodRygg); g.fillRect(16, 16, 220, 320);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return new T.MeshStandardMaterial({map: t, roughness: 0.9}); }
    g.fillStyle = hex(NYCKEL.ram); g.fillRect(0, 0, 252, 352); g.fillStyle = rygg ? hex(NYCKEL.kortrygg) : '#ffffff'; g.fillRect(20, 20, 212, 312);
    g.fillStyle = hex(NYCKEL.marke); const prick = (x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    if (rygg) { prick(126, 176, 34); prick(126, 70, 16); } else prick(54, 54, 20);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return new T.MeshStandardMaterial({map: t, roughness: 0.9}); };
  // Kortet i det vanliga utseendet, ritat här: ryggen röd och mönstrad med vit kant, som kortet i skons mynning i filmen,
  // framsidan vit med en tunn ram, och rundade hörn (Jakob 2026-11-28: "Youtubekorten ... inkluderar det omgärdande vita
  // av kortet"). Bordets eget exempelkort prövades samma dag och syntes som två kort på platsen, så kortet ritas här och
  // är ett enda. Med nyckelfärgerna står spårkortet kvar som det är, eftersom filmerna är gjorda efter det.
  const vanligSida = (ryggen: boolean) => { const c = document.createElement('canvas'); c.width = 504; c.height = 704; const g = c.getContext('2d')!;
    g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, 504, 704);
    if (ryggen) { g.fillStyle = '#b8333b'; g.fillRect(34, 34, 436, 636); g.save(); g.beginPath(); g.rect(34, 34, 436, 636); g.clip();
      g.strokeStyle = 'rgba(255, 255, 255, 0.26)'; g.lineWidth = 3;
      for (let d = -704; d < 504; d += 28) { g.beginPath(); g.moveTo(d, 34); g.lineTo(d + 636, 670); g.stroke(); g.beginPath(); g.moveTo(d + 636, 34); g.lineTo(d, 670); g.stroke(); }
      g.restore(); }
    else { g.strokeStyle = '#cfcabd'; g.lineWidth = 4; g.strokeRect(30, 30, 444, 644); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return new T.MeshStandardMaterial({map: t, roughness: 0.6}); };
  /** Kortets yta med rundade hörn, i kortets eget plan (x tvärs, y längs långsidan), med bilden över hela ytan. */
  const kortyta = () => { const w = CARD.width / 2, h = CARD.height / 2, r = 0.0032, s = new T.Shape();
    s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
    s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
    const g = new T.ShapeGeometry(s, 6), p = g.getAttribute('position'), uv = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / CARD.width + 0.5, p.getY(i) / CARD.height + 0.5);
    return g; };
  let enkelt: T.Object3D;
  if (nyckel) { const sidor = new T.MeshStandardMaterial({color: NYCKEL.ram});
    enkelt = new T.Mesh(new T.BoxGeometry(CARD.width, CARD.thickness, CARD.height), [sidor, sidor, sparsida(false), sparsida(true), sidor, sidor]); enkelt.castShadow = true; }
  else { // (två ytor, en tjocklek isär: framsidan ut ur kortets y, ryggen åt andra hållet)
    const fram = new T.Mesh(kortyta().rotateX(-Math.PI / 2), vanligSida(false)), rygg = new T.Mesh(kortyta().rotateX(Math.PI / 2), vanligSida(true));
    fram.position.y = CARD.thickness / 2; rygg.position.y = -CARD.thickness / 2; fram.castShadow = true; rygg.castShadow = true;
    enkelt = new T.Group(); enkelt.add(fram, rygg); }
  card.add(enkelt);

  // Bordet, för sig: det tar en stund. Måtten: livebordets kortplatser mot bordets tryckta (millimeter), bordets kant mot
  // dealern och skivans överkant.
  let bordRot: T.Object3D | null = null; const markeringar: T.Object3D[] = [];
  const bordUrl = prov('bord') ? `/avatar-auto-pipeline/assets/bord/standardbord_${prov('bord')}.glb` : MODELLER.bord;
  const bord = loadTable(bordUrl, scene, {key: nyckel ? {table: NYCKEL.bord, cardBack: rodRygg ? NYCKEL.rodRygg : NYCKEL.kortrygg} : undefined, progress: share => laddar(`bordet ${Math.round(share * 100)} %`)}).then(b => {
    bordRot = b.root; markeringar.push(...b.marks);
    return {platser: b.places, maxMm: b.maxMm, kortP4Mm: b.cardP4Mm, kantZ: b.edgeZ, skivaY: b.topY};
  });
  // Dockan, kortet och skon döljs bara av ett verktyg (titta.ts --utan): bilden av bordet ensamt, som en utskuren dealer läggs på.
  const synlig = (vad: Synligt, pa: boolean) => { if (vad === 'stol') stolen.visible = pa; else if (vad === 'bord') { if (bordRot) bordRot.visible = pa; } else if (vad === 'docka') figure.root.visible = pa; else if (vad === 'kort') card.visible = pa;
    else if (vad === 'sko') bordRot?.traverse(o => { if (/^sko/.test(o.name)) o.visible = pa; }); else markeringar.forEach(o => { o.visible = pa; }); };

  const ram = () => { const W = canvas.clientWidth, H = canvas.clientHeight, a = film.width / film.height;
    return W / H >= a ? {width: H * a, height: H, left: (W - H * a) / 2, top: 0} : {width: W, height: W / a, left: 0, top: (H - W / a) / 2}; };
  let fovNu = 30, filmlik = true, spelasIn = false;
  function storlek() {
    const a = film.width / film.height;
    if (spelasIn) { renderer.setPixelRatio(1); renderer.setSize(film.width, film.height, false); camera.aspect = a; camera.fov = fovNu; camera.updateProjectionMatrix(); return; }
    const W = canvas.clientWidth, H = canvas.clientHeight; renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W, H, false); camera.aspect = W / H;
    // Spelets, platsernas och den lägre kamerans bild ryms hel: är fönstret smalare än filmens ruta vidgas vinkeln.
    camera.fov = filmlik && W / H < a ? 2 * Math.atan(Math.tan(fovNu * Math.PI / 360) * a / (W / H)) * 180 / Math.PI : fovNu;
    camera.updateProjectionMatrix();
  }
  function setKamera(k: Kamera) {
    if (k === 'fri') return; const vy = kameraVy(k); fovNu = vy.fov; filmlik = k !== 'topp'; // sidans bild ryms också hel, 2,5 m bred som Blenders
    camera.position.set(...vy.pos); camera.up.set(...(vy.upp ?? [0, 1, 0] as V3)); camera.lookAt(v(vy.mot)); storlek(); // (livebordets kamera är rullad: dess upp)
  }
  const filmstorlek = (pa: boolean) => { spelasIn = pa; storlek(); };
  // Bilden tas i samma steg som den ritas: efter det får webbläsaren tömma ritytan.
  const bild = () => { renderer.render(scene, camera); return new Promise<Blob>((klar, fel) => canvas.toBlob(b => b ? klar(b) : fel(Error('Bilden kunde inte läsas ur ritytan.')), 'image/png')); };
  return {renderer, scene, camera, figure, card, bord, stol: {sank: satt.lowered, flytt: satt.moved as V3, sitsUppe: satt.seatModel, sitsNu: satt.seatNow, ryggstod: satt.backrest, knaveck: satt.knee, hoft: satt.hip as V3},
    pose, bone, hud: hud!, synlig, lagda, nasta, render: () => renderer.render(scene, camera), setKamera, storlek, filmstorlek, bild, filmRam: ram, kortet: () => nyckel ? 'spårkortet (nyckelfärgerna)' : 'ritat (röd mönstrad rygg med vit kant)'};
}
