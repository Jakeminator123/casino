// Visarens sida, med paketets egen figur (MightyCat_Queen) i två lägen:
// - Utställningen: Unity-demots uppställning (Demo_CardGames.unity), en figur per rörelse. Uppställningen, golven och
//   kameran kommer ur scenen genom /demo.json (server.ts).
// - Blackjackbordet: figuren som dealer och tre spelare vid spelets bord (bord.ts).
// I båda går en rörelse att stega igenom, och en bit av den att märka ut, spela om och om igen och spara med ett namn
// (kortspelspaket/sekvenser.json).
// Adressen kan välja läget: ?vy=bord, &kamera=spel|runt|sida|topp, &spelare=nej, &rorelse=<AS_namn> och &t=<sekunder>
// (står då stilla där).
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {Bord, Sits, Vy} from './bord.ts';

type Vec = [number, number, number];
type Demo = {
  figur: string; texturer: string[];
  kamera: {pos: Vec; fram: Vec; fov: number} | null;
  golv: {namn: string; pos: Vec; storlek: Vec}[];
  figurer: {namn: string; fil: string; pos: Vec; fram: Vec}[];
};
/** En rörelse som figuren kan spela, och höftens läge i dess första ruta (paketets ram och enheter: x åt sidan, y bakåt, z upp). */
type Clip = {clip: THREE.AnimationClip; hip: THREE.Vector3};
/** En rad i listan: rörelsen, dess fil i paketet, knappen, platsen för dess sparade bitar och längden när den är läst. */
type Row = {namn: string; fil: string; button: HTMLButtonElement; cuts: HTMLElement; length: number};
/** En figur i utställningen: `root` står på demots plats, `body` är figuren i den. */
type Figure = {namn: string; root: THREE.Group; body: THREE.Object3D; mixer: THREE.AnimationMixer; action?: THREE.AnimationAction};
/** En sparad bit av en rörelse: namn och tider i sekunder. */
type Cut = {namn: string; fran: number; till: number};
type Lens = {fov: number; kvot?: number};

const GROUPS: [string, string][] = [['Blackjack', 'Blackjack'], ['Poker', 'Poker'], ['Bonus', 'Bonus'], ['CCG', 'Kortspel (CCG)'], ['Reactions', 'Reaktioner']];
/** Det bordet spelar när det öppnas: blackjackdealerns giv och de tre blackjackspelarna. */
const AT_TABLE = ['AS_Blackjack_Dealer_DealCard', 'AS_Blackjack_Player_01', 'AS_Blackjack_Player_02', 'AS_Blackjack_Player_03'];
const CUTS = '/kortspelspaket/sekvenser.json';
const demo: Demo = await (await fetch('/demo.json')).json();
const el = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;
const view = el('vy'), info = el('info'), loading = el('laddar');
const sek = (n: number) => n.toFixed(1).replace('.', ',');

// ---- scenen ------------------------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
// Bordsvyn har skuggor (standardrummets ljus): påslaget från början, så att inget byggs om när läget byts.
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1d20);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3634, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(0.32, 0.77, 0.56).multiplyScalar(30); // Unity-scenens solljus, från vänster framifrån och ovanifrån
scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({color: new THREE.Color().setRGB(0.30, 0.27, 0.27, THREE.SRGBColorSpace), roughness: 0.9}));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
for (const g of demo.golv) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(...g.storlek), new THREE.MeshStandardMaterial({color: new THREE.Color().setRGB(0.07, 0.08, 0.085, THREE.SRGBColorSpace), transparent: true, opacity: 0.74, roughness: 0.6}));
  box.position.set(...g.pos);
  scene.add(box);
}

const camera = new THREE.PerspectiveCamera(demo.kamera?.fov ?? 60, 1, 0.05, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
/** Demots egen kamera: där den står och tio meter fram i dess riktning. */
const overview = () => {
  const k = demo.kamera ?? {pos: [0, 5, -12] as Vec, fram: [0, -0.3, 1] as Vec};
  return {pos: new THREE.Vector3(...k.pos), target: new THREE.Vector3(...k.pos).addScaledVector(new THREE.Vector3(...k.fram), 10)};
};
camera.position.copy(overview().pos); controls.target.copy(overview().target);

// Demots kamera är vidvinkel (95 grader) för att få med hela raden; en figur ses närmare med en smalare lins.
const CLOSE_FOV = 35, WIDE_FOV = camera.fov;
/** Linsen kameran ska ha: lodrät bildvinkel, och för en vy som ska rymmas hel (spelets) bildens bredd genom höjd. */
let lens: Lens = {fov: WIDE_FOV};
/** Bildvinkeln i det här fönstret: är fönstret smalare än vyns bild vidgas vinkeln så att hela bilden ryms. */
const fovFor = (l: Lens) => l.kvot && camera.aspect < l.kvot ? 2 * Math.atan(Math.tan(l.fov * Math.PI / 360) * l.kvot / camera.aspect) * 180 / Math.PI : l.fov;
let flight: {from: THREE.Vector3; to: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3; fromFov: number; t: number} | null = null;
const fly = (to: THREE.Vector3, toT: THREE.Vector3, l: Lens) => { lens = l; flight = {from: camera.position.clone(), to, fromT: controls.target.clone(), toT, fromFov: camera.fov, t: 0}; };

function resize() {
  renderer.setSize(view.clientWidth, view.clientHeight);
  camera.aspect = view.clientWidth / view.clientHeight;
  if (!flight) camera.fov = fovFor(lens);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---- figuren och dess material -------------------------------------------------------------------------------------
// Unity kopplar texturerna i sina material, inte i FBX-filen: MightyCat_Quinn_low_<materialets namn>_<slag>.png.
const loader = new FBXLoader(), textures = new THREE.TextureLoader();
const texture = (material: string, kind: string, color = false) => {
  const file = demo.texturer.find(t => t.endsWith(`/MightyCat_Quinn_low_${material}_${kind}.png`));
  if (!file) return null;
  const t = textures.load('/paket/' + file);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const template = await loader.loadAsync('/paket/' + demo.figur);
const materials = new Map<string, THREE.Material>();
template.traverse(o => {
  const mesh = o as THREE.SkinnedMesh;
  if (!mesh.isMesh) return;
  const swap = (m: THREE.Material) => {
    if (!materials.has(m.name)) {
      const see = m.name === 'transparency', emissive = texture(m.name, 'Emission', true);
      materials.set(m.name, new THREE.MeshStandardMaterial({
        name: m.name, map: texture(m.name, 'AlbedoTransparency', true), normalMap: texture(m.name, 'Normal'),
        emissiveMap: emissive, emissive: emissive ? 0xffffff : 0x000000, roughness: 0.5, metalness: 0.1,
        transparent: see, opacity: see ? 0.35 : 1, depthWrite: !see,
      }));
    }
    return materials.get(m.name)!;
  };
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  mesh.frustumCulled = false; // den vilande formens gränser följer inte med när armarna rör sig
});
// Figuren och rörelserna är skrivna i centimeter (Unreals enhet); scenen är i meter.
const size = new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3());
const SCALE = size.y > 10 ? 0.01 : 1;

const bones = new Set<string>();
template.traverse(o => { if ((o as THREE.Bone).isBone) bones.add(o.name); });
/**
 * Rörelsen som figuren kan spela den. I paketets filer bär två led läget: roten (var vid bordet den som sitter är,
 * omkring en meter från ramens mitt) och höften under den. Figurens rot är inget led utan det som reser den upp (z upp
 * till y upp) och får inte röras, så rotens rörelse läggs in i höftens: höften får då sitt läge i paketets ram, i
 * figurens egna enheter. Varje annat led bara vrids.
 */
function fit(clip: THREE.AnimationClip): Clip {
  const track = (name: string) => clip.tracks.find(t => t.name === name);
  const rootAt = track('root.position'), rootTurn = track('root.quaternion'), hipAt = track('pelvis.position'), hipTurn = track('pelvis.quaternion');
  // (spårets egen avläsare mellan rutorna; three.js typbeskrivning nämner den inte)
  const reader = (t?: THREE.KeyframeTrack) => t ? (t as unknown as {createInterpolant(): THREE.Interpolant}).createInterpolant() : null;
  const at = reader(rootAt), turn = reader(rootTurn);
  const q = new THREE.Quaternion(), r = new THREE.Vector3(), p = new THREE.Vector3(), k = new THREE.Quaternion();
  const root = (time: number) => { if (turn) q.fromArray(turn.evaluate(time) as number[]); else q.identity(); if (at) r.fromArray(at.evaluate(time) as number[]); else r.set(0, 0, 0); };
  if (hipAt) for (let i = 0; i < hipAt.times.length; i++) { root(hipAt.times[i]); p.fromArray(hipAt.values, i * 3).applyQuaternion(q).add(r).toArray(hipAt.values, i * 3); }
  if (hipTurn) for (let i = 0; i < hipTurn.times.length; i++) { root(hipTurn.times[i]); k.fromArray(hipTurn.values, i * 4).premultiply(q).toArray(hipTurn.values, i * 4); }
  clip.tracks = clip.tracks.filter(t => {
    const [bone, property] = t.name.split('.');
    return bones.has(bone) && (property === 'quaternion' || (property === 'position' && bone === 'pelvis'));
  });
  return {clip, hip: hipAt ? new THREE.Vector3().fromArray(hipAt.values, 0) : new THREE.Vector3()};
}

// ---- listan och utställningen ---------------------------------------------------------------------------------------
const list = el('lista');
const rows = new Map<string, Row>(), figures = new Map<string, Figure>();
const groupOf = (namn: string) => namn.split('_')[1];
const label = (namn: string) => namn.replace(/^AS_[A-Za-z]+_/, '').replaceAll('_', ' ');
for (const [key, title] of GROUPS) {
  const own = demo.figurer.filter(f => groupOf(f.namn) === key).sort((a, b) => a.namn.localeCompare(b.namn));
  if (!own.length) continue;
  list.insertAdjacentHTML('beforeend', `<h2>${title} (${own.length})</h2>`);
  for (const f of own) {
    const root = new THREE.Group(), body = clone(template);
    body.scale.setScalar(SCALE); root.add(body);
    root.position.set(...f.pos);
    root.rotation.y = Math.atan2(f.fram[0], f.fram[2]);
    root.userData.figure = f.namn;
    scene.add(root);
    const button = document.createElement('button'), cuts = document.createElement('div');
    button.className = 'rorelse';
    button.innerHTML = `<span>${label(f.namn)}</span><small></small>`;
    button.onclick = () => select(f.namn);
    list.append(button, cuts);
    rows.set(f.namn, {namn: f.namn, fil: f.fil, button, cuts, length: 0});
    figures.set(f.namn, {namn: f.namn, root, body, mixer: new THREE.AnimationMixer(body)});
  }
}

/** En rörelse läses en gång, vem som än frågar (utställningens figur och bordets), och listan får dess längd. */
const clips = new Map<string, Promise<Clip>>();
function clipOf(namn: string): Promise<Clip> {
  let c = clips.get(namn);
  if (c) return c;
  const row = rows.get(namn)!, small = row.button.querySelector('small')!;
  c = loader.loadAsync('/paket/' + row.fil).then(o => {
    const made = fit(o.animations[0]);
    row.length = made.clip.duration; small.textContent = `${sek(row.length)} s`;
    return made;
  });
  clips.set(namn, c);
  c.catch(e => { small.textContent = 'fel'; console.error(row.fil, e); });
  return c;
}

/** Det som håller på att laddas, uppe till höger: rörelserna och bordet var för sig. */
const said = {rorelser: '', bord: ''};
const say = (what: keyof typeof said, text: string) => { said[what] = text; loading.textContent = [said.bord, said.rorelser].filter(Boolean).join(' · '); };

/**
 * Rörelserna laddas några i taget; utställningens figurer står i vila tills deras rörelse har kommit. Medan bordet
 * läses (35 MB) väntar de på det, så att bordet och det som spelas vid det kommer först.
 */
const queue = [...figures.values()];
const total = queue.length;
let done = 0, first: Promise<unknown> = Promise.resolve();
say('rorelser', `Laddar rörelser: 0 av ${total}`);
async function worker() {
  for (let f = queue.shift(); f; f = queue.shift()) {
    await first;
    try {
      const {clip, hip} = await clipOf(f.namn);
      f.action = f.mixer.clipAction(clip).play();
      // Som i Unity-demot: figuren står med höften över sin plats (i paketets ram sitter den en meter från mitten).
      f.body.position.set(-hip.x * SCALE, 0, hip.y * SCALE);
    } catch { /* raden säger "fel" */ }
    done++; say('rorelser', done < total ? `Laddar rörelser: ${done} av ${total}` : '');
    if (selected === f.namn) showInfo();
  }
}

// ---- läget, valet och tiden ----------------------------------------------------------------------------------------
let mode: 'utstallning' | 'bord' = 'utstallning';
/** Den valda rörelsen: den reglaget stegar och den en bit klipps ur. */
let selected: string | null = null;
/** Biten som är utmärkt i den valda rörelsen; den spelas om och om igen. */
let cut: {fran: number; till: number} | null = null;
let paused = false, dragging = false;
/** De sparade bitarna, per rörelse (kortspelspaket/sekvenser.json). */
let saved: Record<string, Cut[]> = {};
/** Bordet, när det har byggts, dess klocka (alla vid bordet följer den) och kameran. */
let table: Bord | null = null, building: Promise<Bord> | null = null, tableTime = 0, tableView: Vy = 'runt';
for (let i = 0; i < 4; i++) worker();

const alone = el<HTMLInputElement>('ensam'), players = el<HTMLInputElement>('spelare');
const nameField = el('namn'), seconds = el('sek'), slider = el<HTMLInputElement>('tid');
const lengthOf = (namn: string | null) => namn ? rows.get(namn)!.length : 0;
/** Vem vid bordet som spelar en rörelse: dealern (0) dealerns, och spelare 1–3 den som är inspelad för just den spelaren; övriga spelarrörelser spelaren i mitten. */
const seatFor = (namn: string) => namn.includes('_Dealer_') ? 0 : Number(namn.match(/^AS_(?:Blackjack|Poker)_Player_0([123])$/)?.[1] ?? namn.match(/^AS_Reactions_Player0([123])_/)?.[1] ?? 2);
/** Tiden i den valda rörelsen. Bordets klocka går fritt, och var och en vid bordet är på den tiden räknat i sin egen rörelses längd. */
const now = () => mode !== 'bord' ? (selected && figures.get(selected)?.action?.time) || 0 : lengthOf(selected) ? tableTime % lengthOf(selected) : tableTime;
function setTime(t: number) {
  if (mode === 'bord') { tableTime = t; return; }
  const f = selected ? figures.get(selected) : null;
  if (f?.action) { f.action.time = t; f.mixer.update(0); }
}

function showInfo() {
  info.hidden = !selected;
  if (!selected) return;
  const length = lengthOf(selected), seat = mode === 'bord' && table ? table.sitsar[seatFor(selected)] : null;
  nameField.textContent = seat ? `${selected} · ${seat.titel}` : selected;
  slider.disabled = !length; slider.max = String(length);
  const t = length ? now() : 0;
  if (!dragging) slider.value = String(t);
  seconds.textContent = length ? `${sek(t)} / ${sek(length)} s` : 'laddar …';
}
/** Bandet över reglaget och texten för biten som är utmärkt, och vilken sparad bit det är. */
function showCut() {
  const length = lengthOf(selected), band = el('bandbit');
  band.hidden = !cut || !length;
  if (cut && length) { band.style.left = `${cut.fran / length * 100}%`; band.style.width = `${(cut.till - cut.fran) / length * 100}%`; }
  el('bittext').textContent = cut ? `${sek(cut.fran)}–${sek(cut.till)} s (${sek(cut.till - cut.fran)} s)` : 'hela rörelsen';
  for (const row of rows.values()) for (const line of row.cuts.children) {
    const c = saved[row.namn]?.find(x => x.namn === (line as HTMLElement).dataset.namn);
    line.classList.toggle('vald', row.namn === selected && !!c && !!cut && c.fran === cut.fran && c.till === cut.till);
  }
}
slider.addEventListener('pointerdown', () => { dragging = true; });
addEventListener('pointerup', () => { dragging = false; });
slider.oninput = () => { setTime(Number(slider.value)); showInfo(); };

/** Väljer en rörelse (eller ingen), och en bit av den om den följer med. */
function select(namn: string | null, piece?: Cut) {
  if (selected) rows.get(selected)!.button.classList.remove('vald');
  const same = namn === selected;
  selected = namn; cut = piece ? {fran: piece.fran, till: piece.till} : same ? cut : null;
  if (namn) { const b = rows.get(namn)!.button; b.classList.add('vald'); b.scrollIntoView({block: 'nearest'}); }
  if (mode === 'bord') { if (namn) seat(namn, true); }
  else {
    const figure = namn ? figures.get(namn)! : null;
    for (const f of figures.values()) f.root.visible = !alone.checked || !figure || f === figure;
    if (!figure) { const o = overview(); fly(o.pos, o.target, {fov: WIDE_FOV}); }
    else if (!same || !piece) {
      const front = new THREE.Vector3(Math.sin(figure.root.rotation.y), 0, Math.cos(figure.root.rotation.y));
      const target = figure.root.position.clone().add(new THREE.Vector3(0, 0.85, 0));
      fly(target.clone().addScaledVector(front, 4.2).add(new THREE.Vector3(0, 0.9, 0)), target, {fov: CLOSE_FOV});
    }
  }
  if (piece) setTime(piece.fran);
  showInfo(); showCut();
}
alone.onchange = () => select(selected);
el('hela').onclick = () => select(null);
const pauseButton = el<HTMLButtonElement>('paus');
const pause = (on: boolean) => { paused = on; pauseButton.textContent = paused ? 'Spela' : 'Pausa'; };
pauseButton.onclick = () => pause(!paused);

// ---- bordet --------------------------------------------------------------------------------------------------------
/** Den som spelar rörelsen vid bordet börjar spela den. `show`: syns den inte (spelarna dolda, eller platsen kameran står på) visas den. */
async function seat(namn: string, show = false) {
  if (!table) return;
  const s: Sits = table.sitsar[seatFor(namn)];
  if (show && s.nr && (!players.checked || inTheWay(s))) { players.checked = true; if (inTheWay(s)) look('runt'); seen(); }
  if (s.namn === namn) return;
  s.namn = namn; playing();
  const {clip} = await clipOf(namn).catch(() => ({clip: null}));
  if (!clip || s.namn !== namn) return; // en annan rörelse valdes medan den här lästes
  s.mixer.stopAllAction(); s.action = s.mixer.clipAction(clip).play(); s.length = clip.duration;
}
/** Pricken i listan på de rörelser som spelas vid bordet. */
function playing() { for (const row of rows.values()) row.button.classList.toggle('spelas', !!table?.sitsar.some(s => s.namn === row.namn)); }
/** Spelare som sitter i vägen för kameran: i spelets vy alla (kameran står bakom dem, och spelets bild har bara dealern), från sidan den på plats 2 (närmast kameran). */
const inTheWay = (s: Sits) => tableView === 'spel' || (tableView === 'sida' && s.plats === 2);
/** Spelarna visas eller döljs, och den som sitter i vägen för kameran är borta. */
function seen() { if (table) for (const s of table.sitsar) if (s.nr) s.holder.visible = players.checked && !inTheWay(s); }
players.onchange = seen;
const viewButtons = [...document.querySelectorAll<HTMLButtonElement>('button[data-vy]')];
function look(vy: Vy) {
  tableView = vy;
  for (const b of viewButtons) b.classList.toggle('pa', b.dataset.vy === vy);
  if (!table) return;
  const k = table.kamera(vy);
  fly(k.pos, k.mot, {fov: k.fov, kvot: k.kvot}); seen();
}
for (const b of viewButtons) b.onclick = () => look(b.dataset.vy as Vy);

async function setMode(to: typeof mode) {
  mode = to;
  document.body.classList.toggle('bord', to === 'bord');
  el('lageBord').classList.toggle('pa', to === 'bord'); el('lageUtstallning').classList.toggle('pa', to !== 'bord');
  if (to === 'utstallning') {
    renderer.toneMapping = THREE.ACESFilmicToneMapping; say('bord', '');
    const keep = selected; selected = null; select(keep); return;
  }
  // Bordet byggs första gången det visas; dess kod och spelets mått läses först då.
  building ??= (async () => {
    say('bord', 'Bygger bordet …');
    const {byggBord} = await import('./bord.ts');
    const made = await byggBord(renderer, () => clone(template), SCALE, text => say('bord', text));
    made.klart.then(text => say('bord', text));
    return made;
  })();
  first = building.then(made => made.klart).catch(() => null);
  try { table = await building; } catch (e) { building = null; say('bord', `Bordsvyn kunde inte byggas: ${e instanceof Error ? e.message : e}`); await setMode('utstallning'); return; }
  if (mode !== 'bord') return;
  renderer.toneMapping = THREE.AgXToneMapping; // standardrummets tonkurva
  for (const namn of AT_TABLE) if (rows.has(namn) && !table.sitsar[seatFor(namn)].namn) seat(namn);
  look(tableView);
  const keep = selected ?? (rows.has(AT_TABLE[0]) ? AT_TABLE[0] : null); selected = null; select(keep);
}
el('lageBord').onclick = () => setMode('bord');
el('lageUtstallning').onclick = () => setMode('utstallning');

// ---- bitarna -------------------------------------------------------------------------------------------------------
const note = el('sagt'), cutName = el<HTMLInputElement>('bitnamn');
let noteTimer: ReturnType<typeof setTimeout> | undefined;
const tell = (text: string) => { note.textContent = text; clearTimeout(noteTimer); noteTimer = setTimeout(() => { note.textContent = ''; }, 5000); };
async function store(next: Record<string, Cut[]>): Promise<boolean> {
  const res = await fetch(CUTS, {method: 'PUT', body: JSON.stringify(next)}).catch(() => null);
  if (!res?.ok) { tell(`Kunde inte spara${res ? ` (${res.status})` : ': visaren svarar inte'}.`); return false; }
  saved = await res.json();
  return true;
}
/** De sparade bitarna under sin rörelse i listan: ett klick spelar biten, krysset tar bort den. */
function drawCuts(namn: string) {
  const row = rows.get(namn);
  if (!row) return;
  row.cuts.replaceChildren(...(saved[namn] ?? []).map(c => {
    const line = document.createElement('div'), play = document.createElement('button'), remove = document.createElement('button');
    line.className = 'bit'; line.dataset.namn = c.namn;
    play.className = 'spela'; play.innerHTML = '<span></span><small></small>';
    play.querySelector('span')!.textContent = `↳ ${c.namn}`; play.querySelector('small')!.textContent = `${sek(c.fran)}–${sek(c.till)} s`;
    play.onclick = () => select(namn, c);
    remove.className = 'bort'; remove.textContent = '✕'; remove.title = 'Ta bort biten';
    remove.onclick = async () => {
      if (!confirm(`Ta bort biten "${c.namn}"?`)) return;
      if (await store({...saved, [namn]: (saved[namn] ?? []).filter(x => x.namn !== c.namn)})) { drawCuts(namn); showCut(); tell(`Borttagen: ${c.namn}.`); }
    };
    line.append(play, remove);
    return line;
  }));
}
fetch(CUTS).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(got => { saved = got; for (const namn of Object.keys(saved)) drawCuts(namn); showCut(); });
el('start').onclick = () => {
  if (!selected || !lengthOf(selected)) return;
  const t = now(); cut = {fran: t, till: cut && cut.till > t + 0.05 ? cut.till : lengthOf(selected)}; showCut();
};
el('slut').onclick = () => {
  if (!selected || !lengthOf(selected)) return;
  const t = now(); cut = {fran: cut && cut.fran < t - 0.05 ? cut.fran : 0, till: t}; setTime(cut.fran); showCut();
};
el('helaRorelsen').onclick = () => { cut = null; showCut(); };
el('spara').onclick = async () => {
  if (!selected || !cut) { tell('Märk först ut var biten börjar och slutar.'); return; }
  const namn = cutName.value.trim(), clip = selected, piece = {namn, fran: cut.fran, till: cut.till};
  if (!namn) { tell('Ge biten ett namn.'); cutName.focus(); return; }
  // En bit med samma namn i samma rörelse byts ut.
  if (await store({...saved, [clip]: [...(saved[clip] ?? []).filter(x => x.namn !== namn), piece]})) {
    const kept = saved[clip]?.find(x => x.namn === namn);
    if (kept && selected === clip) cut = {fran: kept.fran, till: kept.till};
    drawCuts(clip); showCut(); cutName.value = ''; tell(`Sparad: ${namn}.`);
  }
};

// ---- klick i bilden ------------------------------------------------------------------------------------------------
// Ett klick (inte ett drag) på en figur väljer den, eller rörelsen den spelar vid bordet.
const ray = new THREE.Raycaster(), down = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', e => down.set(e.clientX, e.clientY));
renderer.domElement.addEventListener('pointerup', e => {
  if (down.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 4) return;
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const atTable = mode === 'bord' && table, key = atTable ? 'sits' : 'figure';
  const among = atTable ? atTable.sitsar.map(s => s.holder) : [...figures.values()].map(f => f.root);
  let o = ray.intersectObjects(among.filter(x => x.visible), true)[0]?.object as THREE.Object3D | undefined;
  while (o && o.userData[key] === undefined) o = o.parent ?? undefined;
  if (!o) return;
  const namn = atTable ? atTable.sitsar[o.userData.sits as number].namn : o.userData.figure as string;
  if (namn) select(namn);
});

// ---- bild för bild -------------------------------------------------------------------------------------------------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  // (en flik som har legat i bakgrunden får inte hoppa fram hela tiden den var borta)
  const dt = Math.min(clock.getDelta(), 0.1), run = !paused && !dragging;
  if (mode === 'bord' && table) {
    // Alla vid bordet står på bordets klocka; en utmärkt bit i den valda rörelsen spelas om och om igen.
    if (run) {
      tableTime += dt;
      if (cut && (now() >= cut.till || now() < cut.fran)) tableTime = cut.fran;
    }
    for (const s of table.sitsar) if (s.action && s.length) { s.action.time = tableTime % s.length; s.mixer.update(0); }
  } else if (!paused) {
    for (const f of figures.values()) {
      const own = f.namn === selected;
      if (own && dragging) continue;
      f.mixer.update(dt);
      if (own && cut && f.action && (f.action.time >= cut.till || f.action.time < cut.fran)) { f.action.time = cut.fran; f.mixer.update(0); }
    }
  }
  if (flight) {
    flight.t = Math.min(1, flight.t + dt / 0.8);
    const s = flight.t * flight.t * (3 - 2 * flight.t);
    camera.position.lerpVectors(flight.from, flight.to, s); controls.target.lerpVectors(flight.fromT, flight.toT, s);
    camera.fov = flight.fromFov + (fovFor(lens) - flight.fromFov) * s; camera.updateProjectionMatrix();
    if (flight.t === 1) flight = null;
  }
  controls.update();
  if (selected) showInfo();
  renderer.render(mode === 'bord' && table ? table.scene : scene, camera);
});

// ---- det adressen ber om -------------------------------------------------------------------------------------------
const asked = new URLSearchParams(location.search), askedView = asked.get('kamera'), askedClip = asked.get('rorelse'), askedTime = asked.get('t');
if (askedView && viewButtons.some(b => b.dataset.vy === askedView)) tableView = askedView as Vy;
if (asked.get('spelare') === 'nej') players.checked = false;
await setMode(asked.get('vy') === 'bord' ? 'bord' : 'utstallning');
if (askedClip && rows.has(askedClip)) select(askedClip);
if (askedTime !== null && Number.isFinite(Number(askedTime))) {
  pause(true);
  if (selected) await clipOf(selected).catch(() => null);
  setTime(Number(askedTime));
}
