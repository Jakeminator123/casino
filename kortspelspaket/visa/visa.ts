// Visarens sida: Unity-demots utställning (Demo_CardGames.unity) med paketets egen figur, MightyCat_Queen, en gång per
// animation. Uppställningen, golven och kameran kommer ur scenen genom /demo.json (server.ts).
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

type Vec = [number, number, number];
type Demo = {
  figur: string; texturer: string[];
  kamera: {pos: Vec; fram: Vec; fov: number} | null;
  golv: {namn: string; pos: Vec; storlek: Vec}[];
  figurer: {namn: string; fil: string; pos: Vec; fram: Vec}[];
};
type Figure = {namn: string; root: THREE.Object3D; mixer: THREE.AnimationMixer; action?: THREE.AnimationAction; length: number; button: HTMLButtonElement};

const GROUPS: [string, string][] = [['Blackjack', 'Blackjack'], ['Poker', 'Poker'], ['Bonus', 'Bonus'], ['CCG', 'Kortspel (CCG)'], ['Reactions', 'Reaktioner']];
const demo: Demo = await (await fetch('/demo.json')).json();
const view = document.getElementById('vy')!, info = document.getElementById('info')!, loading = document.getElementById('laddar')!;

// ---- scenen ------------------------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
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

function resize() {
  renderer.setSize(view.clientWidth, view.clientHeight);
  camera.aspect = view.clientWidth / view.clientHeight; camera.updateProjectionMatrix();
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
// FBX-filen är i centimeter eller meter beroende på programmet som skrev den; scenen är i meter.
const size = new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3());
const SCALE = size.y > 10 ? 0.01 : 1;

const bones = new Map<string, THREE.Bone>();
template.traverse(o => { if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone); });
/**
 * Animationen vrider varje led; bara höften (pelvis) och roten får också flytta sig. Höftens rörelse räknas om till
 * figurens egna mått, så att en animation skriven för ett skelett i andra enheter eller av en annan längd ändå står rätt.
 */
function fit(clip: THREE.AnimationClip): THREE.AnimationClip {
  clip.tracks = clip.tracks.filter(t => {
    const [bone, property] = t.name.split('.');
    if (property === 'quaternion') return bones.has(bone);
    if (property !== 'position' || (bone !== 'pelvis' && bone !== 'root') || !bones.has(bone)) return false;
    const rest = bones.get(bone)!.position.length(), first = new THREE.Vector3().fromArray(t.values, 0).length();
    if (rest > 1e-6 && first > 1e-6) { const k = rest / first; for (let i = 0; i < t.values.length; i++) t.values[i] *= k; }
    return true;
  });
  return clip;
}

// ---- utställningen -------------------------------------------------------------------------------------------------
const list = document.getElementById('lista')!;
const figures: Figure[] = [];
let selected: Figure | null = null;
const groupOf = (namn: string) => namn.split('_')[1];
const label = (namn: string) => namn.replace(/^AS_[A-Za-z]+_/, '').replaceAll('_', ' ');
for (const [key, title] of GROUPS) {
  const own = demo.figurer.filter(f => groupOf(f.namn) === key).sort((a, b) => a.namn.localeCompare(b.namn));
  if (!own.length) continue;
  list.insertAdjacentHTML('beforeend', `<h2>${title} (${own.length})</h2>`);
  for (const f of own) {
    const root = clone(template);
    root.scale.setScalar(SCALE);
    root.position.set(...f.pos);
    root.rotation.y = Math.atan2(f.fram[0], f.fram[2]);
    root.userData.figure = figures.length;
    scene.add(root);
    const button = document.createElement('button');
    button.innerHTML = `<span>${label(f.namn)}</span><small></small>`;
    const figure: Figure = {namn: f.namn, root, mixer: new THREE.AnimationMixer(root), length: 0, button};
    button.onclick = () => select(figure);
    list.append(button);
    figures.push(figure);
  }
}

/** Animationerna laddas några i taget; figurerna står i vila tills deras animation har kommit. */
const queue = figures.map(f => ({f, fil: demo.figurer.find(d => d.namn === f.namn)!.fil}));
const total = queue.length;
let done = 0;
const showLoading = () => { loading.textContent = done < total ? `Laddar animationer: ${done} av ${total}` : ''; };
showLoading();
async function worker() {
  for (let job = queue.shift(); job; job = queue.shift()) {
    try {
      const clip = fit((await loader.loadAsync('/paket/' + job.fil)).animations[0]);
      job.f.action = job.f.mixer.clipAction(clip).play();
      job.f.length = clip.duration;
      job.f.button.querySelector('small')!.textContent = `${clip.duration.toFixed(1)} s`;
    } catch (e) {
      job.f.button.querySelector('small')!.textContent = 'fel';
      console.error(job.fil, e);
    }
    done++; showLoading();
    if (selected === job.f) showInfo();
  }
}
for (let i = 0; i < 4; i++) worker();

// ---- att välja en figur --------------------------------------------------------------------------------------------
// Demots kamera är vidvinkel (95 grader) för att få med hela raden; en figur ses närmare med en smalare lins.
const CLOSE_FOV = 35, WIDE_FOV = camera.fov;
let flight: {from: THREE.Vector3; to: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3; fromFov: number; toFov: number; t: number} | null = null;
const alone = document.getElementById('ensam') as HTMLInputElement;
const fly = (to: THREE.Vector3, toT: THREE.Vector3, toFov: number) => { flight = {from: camera.position.clone(), to, fromT: controls.target.clone(), toT, fromFov: camera.fov, toFov, t: 0}; };
const nameField = document.getElementById('namn')!, seconds = document.getElementById('sek')!, slider = document.getElementById('tid') as HTMLInputElement;
function showInfo() {
  info.hidden = !selected;
  if (!selected) return;
  const a = selected.action;
  nameField.textContent = selected.namn;
  slider.disabled = !a; slider.max = String(selected.length);
  if (a && document.activeElement !== slider) slider.value = String(a.time);
  seconds.textContent = a ? `${a.time.toFixed(1)} / ${selected.length.toFixed(1)} s` : 'laddar …';
}
// Reglaget flyttar den valda figuren till en viss tid i dess animation; de andra spelar vidare.
slider.oninput = () => {
  if (!selected?.action) return;
  selected.action.time = Number(slider.value); selected.mixer.update(0); showInfo();
};
function select(figure: Figure | null) {
  selected?.button.classList.remove('vald');
  selected = figure;
  for (const f of figures) f.root.visible = !alone.checked || !figure || f === figure;
  if (!figure) { const o = overview(); fly(o.pos, o.target, WIDE_FOV); showInfo(); return; }
  figure.button.classList.add('vald');
  figure.button.scrollIntoView({block: 'nearest'});
  const front = new THREE.Vector3(Math.sin(figure.root.rotation.y), 0, Math.cos(figure.root.rotation.y));
  const target = figure.root.position.clone().add(new THREE.Vector3(0, 0.85, 0));
  fly(target.clone().addScaledVector(front, 4.2).add(new THREE.Vector3(0, 0.9, 0)), target, CLOSE_FOV);
  showInfo();
}
alone.onchange = () => select(selected);
document.getElementById('hela')!.onclick = () => select(null);
let paused = false;
document.getElementById('paus')!.onclick = e => { paused = !paused; (e.target as HTMLButtonElement).textContent = paused ? 'Spela' : 'Pausa'; };

// Ett klick (inte ett drag) på en figur väljer den.
const ray = new THREE.Raycaster(), down = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', e => down.set(e.clientX, e.clientY));
renderer.domElement.addEventListener('pointerup', e => {
  if (down.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 4) return;
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.intersectObjects(figures.filter(f => f.root.visible).map(f => f.root), true)[0];
  let o = hit?.object as THREE.Object3D | undefined;
  while (o && o.userData.figure === undefined) o = o.parent ?? undefined;
  if (o) select(figures[o.userData.figure as number]);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (!paused) for (const f of figures) f.mixer.update(dt);
  if (flight) {
    flight.t = Math.min(1, flight.t + dt / 0.8);
    const s = flight.t * flight.t * (3 - 2 * flight.t);
    camera.position.lerpVectors(flight.from, flight.to, s); controls.target.lerpVectors(flight.fromT, flight.toT, s);
    camera.fov = flight.fromFov + (flight.toFov - flight.fromFov) * s; camera.updateProjectionMatrix();
    if (flight.t === 1) flight = null;
  }
  controls.update();
  if (selected) showInfo();
  renderer.render(scene, camera);
});
