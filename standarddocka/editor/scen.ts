// Scenen i editorn: Blenders bord, stol och man (avatar-auto-pipeline/assets) i dockans linsvärld, med ljus som liknar
// Blenders bilder, kortet som rörelsen delar och kamerorna. Mannen ställs med dockans egen kod
// (blackjack-dealer/dealer3d/src/figure-model.ts), en ruta som dealer3d/src/stage.ts gör det.
import * as T from 'three';
import {loadFigure, type Figure} from '../../blackjack-dealer/dealer3d/src/figure-model.ts';
import {DOLLS} from '../../blackjack-dealer/dealer3d/src/doll.ts';
import {ROOM_EDGE, loadTable, roomLight, seatStool} from '../../blackjack-dealer/dealer3d/src/standard-room.ts';
import {spots, type Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {FILM, PLAY_LENS, TABLE_LENS, filmEye, fovYDeg, seatView} from '../../blackjack-dealer/src/table-lens.ts';
import {cross, type Frame, type V3} from './rorelse.ts';

// Rummet (bordet med skon och brickan, stolen under honom, golvet och ljuset) är standardrummet i
// blackjack-dealer/dealer3d/src/standard-room.ts, samma som studions dockvy ritar: där står också regeln för stolen
// och hur Blenders modeller läggs i linsvärlden. (standard.yaml:s egen regel för stolen, höftleden 9 cm över sitsen,
// gäller dockans höft; mannens höftled ligger 3–4 cm högre än rörelsens, så sitsen ställs efter hans kropp.)
const MODELLER = {man: '/avatar-auto-pipeline/assets/docka/standarddocka_man.glb', kvinna: '/avatar-auto-pipeline/assets/docka/standarddocka_kvinna.glb', bord: '/avatar-auto-pipeline/assets/bord/standardbord_nara.glb', bord23: '/avatar-auto-pipeline/assets/bord/standardbord_nara23.glb', stol: '/avatar-auto-pipeline/assets/stol/dealerstol.glb'};
/**
 * Bordet en rörelse är ritad för, efter vilken docka rörelsen säger att den är gjord för (fältet `doll` i filen).
 * Standarddockans egna rörelser (dockorna man och kvinna) sitter kvar på kortplanens plats, och bordets kant och
 * bricka kommer till dem: kanten 23 cm bakom spelets kant (Jakob 2026-11-26: inte trångt framför dealern). De äldre
 * rörelserna (paow och den vita dockan) visas vid bordet de lagades för, med kanten 15 cm bakom, tills de är utbytta.
 */
export const bordFor = (rorelsensDocka: string | null | undefined) => rorelsensDocka === 'man' || rorelsensDocka === 'kvinna' ? MODELLER.bord23 : MODELLER.bord;
/** Spelets kant mot dealern: mitten av dealerns bordskant på filten (dockans linsvärld). */
export const KANT = ROOM_EDGE as V3;

/** Sidokameran: bildens bredd (meter, som Blenders 'sida') och hur många gånger längre bort än Blenders den står (kameraVy). */
const SIDA = {bredd: 2.5, langre: 8};
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
  // Från hans högra sida: Blenders kamera 'sida' i scen/vy.py, den Jakob har dömt bilder från (ortografisk, bilden 2,5 m
  // bred, från X -3,0 m, 0,05 m bakom spelets kant och 1,20 m över golvet, mot X 0 och 0,80 m över golvet; golvet ligger
  // 0,95 m under filten, standard.yaml filt_z). Den här kameran har perspektiv, så den står SIDA.langre gånger längre bort
  // längs samma siktlinje med en så smal vinkel att bilden blir lika stor: då är perspektivet nästan borta (ungefär 1 %
  // mellan hans närmaste och bortre axel). Talen står två gånger, här och i vy.py, tills en uppställningsfil delas.
  if (k === 'sida') { const golv = 0.95, mot: V3 = [0, 0.80 - golv, z - 0.05], fran: V3 = [-3.0, 1.20 - golv, z - 0.05], d = fran.map((n, i) => (n - mot[i]) * SIDA.langre), avst = Math.hypot(...d);
    return {pos: mot.map((n, i) => n + d[i]) as V3, mot, fov: 2 * Math.atan(SIDA.bredd / (FILM.width / FILM.height) / 2 / avst) * 180 / Math.PI}; }
  if (k === 'topp') return {pos: [0.06, 2.15, z + 0.32], mot: [0.06, 0, z + 0.1], fov: 42}; // uppifrån, han överst i bilden
  if (k === 'film') return oga(filmEye(TABLE_LENS));
  const spel = filmEye(PLAY_LENS), plats = kameransPlats(k);
  if (!plats || plats === 4) return oga(spel);
  const alla = spots(plan, TABLE_LENS), egen = alla.find(s => s.id === `P${plats}.C1`), fyra = alla.find(s => s.id === 'P4.C1');
  if (!egen || !fyra) throw Error(`Planen saknar det första kortet för plats ${plats}.`);
  return oga(seatView(spel, egen.at, fyra.at, KANT));
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
export const NYCKEL = {bakgrund: 0x00b140, bord: 0x00b140, kortrygg: 0xffd400, ram: 0x00c8ff, marke: 0xff2fd0};

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
  /** Inspelningens läge på eller av: bilden ritas i filmens storlek (FILM) i stället för fönstrets. */
  filmstorlek(pa: boolean): void;
  /** Ritar bilden som den står nu och lämnar den som PNG (för inspelningen, i filmens storlek). */
  bild(): Promise<Blob>;
  filmRam(): {left: number; top: number; width: number; height: number};
  /** Vilket kort som delas: bordets eget (Blenders) eller det enkla, och i så fall varför (bordet har inte kommit, saknar sitt exempelkort giv_P4.C1, eller det är ingen enkel mesh). */
  kortet(): string;
};

/** Vilken av de två standarddockorna som visas. De har samma skelett, och en rörelse är händernas, armarnas och blickens
 *  lägen i rummet: kroppen ställs efter dem, så kvinnan gör samma rörelser som mannen utan att något görs om. */
export type Docka = 'man' | 'kvinna';

export async function byggScen(canvas: HTMLCanvasElement, plan: Plan, hip: number[], vila: Frame, laddar: (text: string) => void, utseende: Utseende = 'vanligt', docka: Docka = 'man', rorelsensDocka?: string | null): Promise<Scen> {
  const nyckel = utseende === 'nyckel';
  const renderer = new T.WebGLRenderer({canvas, antialias: true}); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  // Ljuset, bakgrunden, golvet och bildens tonkurva är standardrummets; nyckelfärgerna får en ren bakgrund och inget golv.
  const scene = new T.Scene(); roomLight(scene, renderer, nyckel ? {background: NYCKEL.bakgrund} : undefined);
  const camera = new T.PerspectiveCamera(30, 1.5, 0.05, 40);

  // Kortet som delas: ett av bordets egna kort (samma utseende som Blenders); tills bordet har kommit ett enkelt kort.
  const card = new T.Group(); card.matrixAutoUpdate = false; scene.add(card);

  // Dockan: mannen eller kvinnan.
  laddar(docka === 'kvinna' ? 'kvinnan' : 'mannen');
  // En modell på prov (?modell=<namn> och ?bord=<namn> i adressen: standarddocka_<namn>.glb och standardbord_<namn>.glb
  // ur avatar-auto-pipeline/assets), för den som bygger om dockan eller bordet och vill se det innan det byts in.
  const prov = (nyckel: string) => { const n = new URLSearchParams(location.search).get(nyckel); return n && /^[a-z0-9_]+$/.test(n) ? n : null; };
  // ?vridben=0: underarmens vridning läggs på ForeArm som i en docka utan vridben (för att jämföra; figure-model.ts).
  // Dockans storlek: spelar den sina egna rörelser (rorelse.ts EGNA) visas den i sin egen storlek, den som rörelserna,
  // handens punkter och fingertopparna är mätta på. Spelar den en rörelse ritad för en annan kropp (de äldre, eller en
  // modell på prov) görs den som förut så stor att armen blir standardfigurens, så att handlederna når.
  const egen = !prov('modell') && rorelsensDocka === docka ? DOLLS[docka] : null;
  const figure = await loadFigure(prov('modell') ? `/avatar-auto-pipeline/assets/docka/standarddocka_${prov('modell')}.glb` : MODELLER[docka], {twistBones: prov('vridben') !== '0', ...(egen ? {arm: egen.upperArm + egen.forearm} : {})}); scene.add(figure.root);
  const bone = (name: string) => { const b = figure.root.getObjectByName(name); if (!b) throw Error(`Dockan saknar leden ${name}.`); return b.getWorldPosition(new T.Vector3()); };
  const v = (p: number[]) => new T.Vector3(p[0], p[1], p[2]);
  /** En ruta på mannen, som dealer3d/src/stage.ts gör det: bålen ur axlarna och höften, armarna ur lederna, händerna ur sina 21 punkter, huvudet mot blicken. */
  // Blicken: dockans kod riktar linjen mellan hans ögon mot rutans blickpunkt, i vågen (figure-model.ts), så i vilan ser
  // han in i spelets kamera (Jakob 2026-11-26: "A1 [ska] alltid ha avataren som tittar mot kameran").
  function pose(f: Frame, h: number[]) {
    const s3 = (p: number[], q: number[]): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
    const hand = (p: number[][], side: 1 | -1) => { const n = cross(s3(p[5], p[0]), s3(p[17], p[0])), mid = [(p[9][0] + p[12][0]) / 2, (p[9][1] + p[12][1]) / 2, (p[9][2] + p[12][2]) / 2];
      return {forward: s3(mid, p[0]), palm: [n[0] * side, n[1] * side, n[2] * side] as V3, points: p as V3[]}; };
    const looks = v(f.g).sub(v(f.h)).normalize();
    figure.pose({hip: h as V3, shoulders: [f.R.s as V3, f.L.s as V3], arms: [{shoulder: f.R.s as V3, elbow: f.R.e as V3, wrist: f.R.w as V3}, {shoulder: f.L.s as V3, elbow: f.L.e as V3, wrist: f.L.w as V3}],
      hands: [hand(f.R.p, 1), hand(f.L.p, -1)], looks: [looks.x, looks.y, looks.z], lookAt: f.g as V3, face: f.a ?? {}}); // ansiktet i vila där rutan inte har något
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
  const bord = loadTable(prov('bord') ? `/avatar-auto-pipeline/assets/bord/standardbord_${prov('bord')}.glb` : bordFor(rorelsensDocka), scene, plan, {key: nyckel ? {table: NYCKEL.bord, cardBack: NYCKEL.kortrygg} : undefined, progress: share => laddar(`bordet ${Math.round(share * 100)} %`)}).then(b => {
    // Bordets kort ligger i modellen med bildens överkant mot dealern (Blenders +Y), alltså åt -z här; vänt ett halvt varv
    // i sitt plan står överkanten åt kortets långsida (+z, rörelsens `l`), som dealer3d/src/stage.ts ritar sitt kort. Då
    // ligger kortet som rörelsen lägger det (långsidan mot dealern) som Blenders kort på platsen. (Förut ett halvt varv fel.)
    if (b.card && !nyckel) { b.card.geometry.rotateY(Math.PI); card.remove(enkelt); card.add(b.card); }
    bordRot = b.root; markeringar.push(...b.marks);
    return {platser: b.places, maxMm: b.maxMm, kortP4Mm: b.cardP4Mm, kantZ: b.edgeZ, skivaY: b.topY};
  });
  // Dockan, kortet och skon döljs bara av ett verktyg (titta.ts --utan): bilden av bordet ensamt, som en utskuren dealer läggs på.
  const synlig = (vad: Synligt, pa: boolean) => { if (vad === 'stol') stolen.visible = pa; else if (vad === 'bord') { if (bordRot) bordRot.visible = pa; } else if (vad === 'docka') figure.root.visible = pa; else if (vad === 'kort') card.visible = pa;
    else if (vad === 'sko') bordRot?.traverse(o => { if (/^sko/.test(o.name)) o.visible = pa; }); else markeringar.forEach(o => { o.visible = pa; }); };

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
    if (k === 'fri') return; const vy = kameraVy(k, plan); fovNu = vy.fov; filmlik = k !== 'topp'; // sidans bild ryms också hel, 2,5 m bred som Blenders
    camera.position.set(...vy.pos); camera.up.set(0, 1, 0); camera.lookAt(v(vy.mot)); storlek();
  }
  const filmstorlek = (pa: boolean) => { spelasIn = pa; storlek(); };
  // Bilden tas i samma steg som den ritas: efter det får webbläsaren tömma ritytan.
  const bild = () => { renderer.render(scene, camera); return new Promise<Blob>((klar, fel) => canvas.toBlob(b => b ? klar(b) : fel(Error('Bilden kunde inte läsas ur ritytan.')), 'image/png')); };
  return {renderer, scene, camera, figure, card, bord, stol: {sank: satt.lowered, flytt: satt.moved as V3, sitsUppe: satt.seatModel, sitsNu: satt.seatNow, ryggstod: satt.backrest, knaveck: satt.knee, hoft: satt.hip as V3},
    pose, bone, hud: hud!, synlig, render: () => renderer.render(scene, camera), setKamera, storlek, filmstorlek, bild, filmRam: ram, kortet: () => { if (card.children[0] !== enkelt) return 'bordets'; const ex = bordRot?.getObjectByName('giv_P4C1');
      return nyckel ? 'enkelt (nyckelfärgerna)' : !bordRot ? 'enkelt (bordet har inte kommit)' : !ex ? 'enkelt (bordet har inget exempelkort giv_P4.C1)' : `enkelt (exempelkortet är en ${ex.type} med ${ex.children.length} delar, inte en mesh)`; }};
}
