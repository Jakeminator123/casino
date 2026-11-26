// Editorn för standarddockan: mannen vid Blenders bord i rörelsen A1 → A2.3 → plats 4 kort 1, en tidslinje att spela och
// dra i, kameror, och handtag att dra i som blir ändringar ovanpå grundrörelserna. Ändringarna sparas genom editorns
// server i standarddocka/rorelser/ (grundrörelserna ändras aldrig).
//   ?t=<sekunder>&kamera=<lag|film|sida|topp|fri>[&kulor=0]   öppnar ett läge direkt (förval: lägre kamera)
// window.editor (för kontrollen): ready, setTime(t), setKamera(k), state(), addChange({...}), removeChange(id), undo(), save(), kula(led),
// visa(vad, på).
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import type {Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {LEDER, LEDNAMN, VARAR, foljerKortet, langd, rutor, sattIhop, stallning, vikt, type Andring, type Foljd, type Frame, type Led, type Motion, type Q, type Sparad, type V3} from './rorelse.ts';
import {byggScen, kameraVy, type Kamera, type Scen} from './scen.ts';
import {ARMAR, lyftArmar} from './armar.ts';

const NAMN = 'a1-a23-p4c1', SPARAS = `/standarddocka/rorelser/${NAMN}.json`, RUTOR = `/standarddocka/rorelser/${NAMN}.rutor.json`;
const GRUND = ['till-ankare-2-3-c', 'giv-fran-2-3-p4c1-naturlig-cykel-a-paow'];
const FORVAL: Sparad = {namn: 'Vilan, skon och given till plats 4 kort 1', om: 'A1 till A2.3 (till-ankare-2-3-c) och sedan Paows giv från A2.3 till plats 4 kort 1 och tillbaka. Ändringarna läggs ovanpå grundrörelserna.', grund: GRUND, andringar: []};
const KAMEROR: Kamera[] = ['film', 'lag', 'sida', 'topp', 'fri'];
const $ = <E extends HTMLElement>(sel: string) => document.querySelector(sel) as E;
const fel: string[] = [];
const visaFel = (text: string) => { fel.push(text); const box = $('#fel'); box.style.display = 'block'; box.textContent = 'Något gick fel: ' + fel.join('\n'); };
window.addEventListener('error', e => visaFel(String(e.message)));
window.addEventListener('unhandledrejection', e => visaFel(String((e.reason as Error)?.message ?? e.reason)));
const laddarText = (vad: string) => { $('#laddar').firstChild!.textContent = `Laddar ${vad} …`; };
const sek = (t: number) => t.toFixed(2).replace('.', ',') + ' s';

type Visa = 'bord' | 'stol' | 'platser';
type Api = {ready: boolean; setTime(t: number): void; setKamera(k: Kamera): void; state(): unknown; addChange(a: Partial<Andring> & {led: Led}): string; removeChange(id: string): void; undo(): void; save(): Promise<unknown>; visa(vad: Visa, på: boolean): void; kula(led: Led): {x: number; y: number}};
declare global { interface Window { editor: Api } }
const api: Api = {ready: false} as Api; window.editor = api;

const hämta = async <X>(url: string): Promise<X> => { const r = await fetch(url, {cache: 'no-store'}); if (!r.ok) throw Error(`${url}: ${r.status}`); return r.json() as Promise<X>; };
const query = new URLSearchParams(location.search);

// ---- data ----------------------------------------------------------------------------------------------------
laddarText('rörelserna');
const [plan, forsta, andra, sparadFil] = await Promise.all([
  hämta<Plan>('/blackjack-dealer/placements/default.json'),
  hämta<Motion>(`/blackjack-dealer/dealer3d/data/${GRUND[0]}.json`),
  hämta<Motion>(`/blackjack-dealer/dealer3d/data/${GRUND[1]}.json`),
  fetch(SPARAS, {cache: 'no-store'}).then(r => r.status === 200 ? r.json() as Promise<Sparad> : null), // 204: inget sparat ännu
]);
const sparad: Sparad = sparadFil ? {...FORVAL, ...sparadFil, grund: GRUND} : structuredClone(FORVAL);
const foljd: Foljd = sattIhop(forsta, andra), DUR = langd(foljd), RUTA = 1 / foljd.fps;
console.log('Skarven, före och efter att bålen lades om (m):', foljd.skarv);

// ---- scenen ----------------------------------------------------------------------------------------------------
const canvas = $<HTMLCanvasElement>('#bild');
const scen: Scen = await byggScen(canvas, plan, foljd.hip, stallning(foljd, 0, []), laddarText);
const {camera, scene, renderer} = scen;

// Handtagen: små kulor som syns genom kroppen och bordet, lika stora i bilden var de än är (radien i bildpunkter).
const FARG: Record<Led, number> = {hogerHand: 0x7fd6c4, vansterHand: 0x7fd6c4, hogerArmbage: 0xe2bd6c, vansterArmbage: 0xe2bd6c, blick: 0xb59cf0};
const KULA = {vanlig: 7, vald: 10}, BLICK = 0.6;
const handtag = Object.fromEntries(LEDER.map(led => { const m = new T.Mesh(new T.SphereGeometry(1, 20, 14), new T.MeshBasicMaterial({color: FARG[led], transparent: true, opacity: 0.85, depthTest: false}));
  m.renderOrder = 10; m.userData.led = led; scene.add(m); return [led, m]; })) as Record<Led, T.Mesh<T.SphereGeometry, T.MeshBasicMaterial>>;
const blicklinje = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), new T.LineDashedMaterial({color: 0xb59cf0, dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0.7, depthTest: false}));
blicklinje.renderOrder = 9; scene.add(blicklinje);

const orbit = new OrbitControls(camera, canvas); orbit.enableDamping = false; orbit.zoomSpeed = 0.8;
const flytta = new TransformControls(camera, canvas); flytta.setSize(0.75); flytta.setSpace('world'); scene.add(flytta.getHelper());

// ---- läget ----------------------------------------------------------------------------------------------------
let tid = Math.max(0, Math.min(DUR, Number(query.get('t')) || 0)), spelar = false, fart = 1, slinga = true;
let kamera: Kamera = KAMEROR.includes(query.get('kamera') as Kamera) ? query.get('kamera') as Kamera : 'lag';
/** Blicken i vilan: mot spelets kamera när den är vald, annars mot den lägre kameran (Jakob 2026-11-26: blicken mot kameran). */
const blickMot = (): 'film' | 'lag' => kamera === 'film' ? 'film' : 'lag';
const blickKamera = () => kameraVy(blickMot()).pos;
let vald: Led | null = null, lage: 'flytta' | 'vrida' = 'flytta', varar = VARAR, osparat = false, sparadKl = '';
const angraLista: string[] = [];
let nu: Frame = stallning(foljd, tid, sparad.andringar, blickKamera());
const nyId = () => Math.random().toString(36).slice(2, 9);
const visaKulor = () => $<HTMLInputElement>('#kulor').checked;

function stall() { nu = stallning(foljd, tid, sparad.andringar, blickKamera()); scen.pose(nu, foljd.hip); }
/** Handtagen där mannens leder och blicken är nu (utom det som dras). */
function handtagTill() {
  // Blickens kula står BLICK meter framför ansiktet åt det håll han ser (blickpunkten själv kan ligga i kameran).
  const huvud = scen.bone('Head'), blick = new T.Vector3(...(nu.g as V3)).sub(new T.Vector3(...(nu.h as V3))).normalize().multiplyScalar(BLICK).add(huvud);
  const plats: Record<Led, T.Vector3> = {hogerHand: scen.bone('RightHand'), vansterHand: scen.bone('LeftHand'), hogerArmbage: scen.bone('RightForeArm'), vansterArmbage: scen.bone('LeftForeArm'), blick};
  // Blickens kula står mellan honom och kameran och skymmer bordet: den syns bara när Blicken är vald.
  for (const led of LEDER) { const m = handtag[led]; if (!(drag && drag.led === led)) m.position.copy(plats[led]); m.visible = led === 'blick' ? vald === 'blick' : visaKulor() || vald === led;
    m.material.opacity = vald === led ? 1 : 0.8; }
  blicklinje.geometry.setFromPoints([huvud, handtag.blick.position]); blicklinje.computeLineDistances(); blicklinje.visible = vald === 'blick';
}
function kulstorlek() {
  const h = canvas.clientHeight || 1, per = 2 * Math.tan(camera.fov * Math.PI / 360) / h;
  for (const led of LEDER) { const m = handtag[led]; m.scale.setScalar(camera.position.distanceTo(m.position) * per * (led === 'blick' ? KULA.vanlig : vald === led ? KULA.vald : KULA.vanlig)); }
}
const visa = () => { ram(); kulstorlek(); renderer.render(scene, camera); };
let ritas = false;
function rita() { if (ritas) return; ritas = true; requestAnimationFrame(() => { ritas = false; visa(); }); }
function ritaNu() { stall(); handtagTill(); visa(); }

// ---- tiden och uppspelningen ------------------------------------------------------------------------------------
function setTime(t: number) { tid = Math.max(0, Math.min(DUR, t)); stall(); handtagTill(); visaTid(); visaVarar(); rita(); }
let förra = 0;
function steg(now: number) {
  if (spelar) { const dt = Math.min(0.1, (now - förra) / 1000); tid += dt * fart; if (tid >= DUR) { if (slinga) tid = tid % DUR; else { tid = DUR; spela(false); } } setTime(tid); }
  förra = now; requestAnimationFrame(steg);
}
function spela(på: boolean) { spelar = på; $('#spela').textContent = på ? '❚❚ Paus' : '▶ Spela'; if (på && tid >= DUR - 1e-6) tid = 0; }

// ---- kamerorna ---------------------------------------------------------------------------------------------------
function setKamera(k: Kamera) {
  const blick = blickMot(); kamera = k; if (blickMot() !== blick) { stall(); handtagTill(); } // blicken följer den valda kameran
  if (k !== 'fri') { scen.setKamera(k); const dir = new T.Vector3(); camera.getWorldDirection(dir); orbit.target.copy(camera.position).addScaledVector(dir, k === 'topp' ? 2.1 : k === 'sida' ? 2.4 : 1.95); orbit.update(); }
  document.querySelectorAll<HTMLButtonElement>('#kameror button').forEach(b => b.classList.toggle('vald', b.dataset.kamera === k)); ram(); rita();
}
/** Spelets bild som en ram i fönstret, när det är spelets kamera. */
function ram() { const r = scen.filmRam(), box = $('#ram'); box.style.display = kamera === 'film' ? 'block' : 'none'; Object.assign(box.style, {left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'}); }
orbit.addEventListener('start', () => { if (kamera !== 'fri') { kamera = 'fri'; document.querySelectorAll<HTMLButtonElement>('#kameror button').forEach(b => b.classList.toggle('vald', b.dataset.kamera === 'fri')); ram(); } });
orbit.addEventListener('change', rita);

// ---- ändringarna ----------------------------------------------------------------------------------------------
const spara = () => { angraLista.push(JSON.stringify(sparad.andringar)); if (angraLista.length > 200) angraLista.shift(); };
function ändrat() { osparat = true; stall(); handtagTill(); visaLista(); visaStatus(); visaVarar(); visaTid(); rita(); }
/** Ändringen för en led som gäller just nu (gjord vid den här tiden), om det finns en. */
const härNu = (led: Led) => sparad.andringar.find(a => a.led === led && Math.abs(a.tid - tid) < RUTA / 2) ?? null;
function ångra() { const förra = angraLista.pop(); if (förra === undefined) return; sparad.andringar = JSON.parse(förra); ändrat(); }
function taBort(id: string) { spara(); sparad.andringar = sparad.andringar.filter(a => a.id !== id); ändrat(); }
function läggTill(a: Partial<Andring> & {led: Led}): string {
  if (!LEDER.includes(a.led)) throw Error(`Ingen led ${a.led}.`);
  spara(); const ny: Andring = {id: nyId(), tid: a.tid ?? tid, led: a.led, flytt: (a.flytt ?? [0, 0, 0]) as V3, vrid: a.vrid ?? null, varar: a.varar ?? varar}; sparad.andringar.push(ny); ändrat(); return ny.id;
}

// skala: blickens kula står närmare än blickpunkten, så dess förflyttning förstoras till blickpunktens avstånd.
let drag: {led: Led; a: Andring; start: T.Vector3; startQ: T.Quaternion; flytt0: V3; vrid0: Q | null; ny: boolean; skala: number} | null = null;
flytta.addEventListener('dragging-changed', e => { orbit.enabled = !e.value; });
flytta.addEventListener('mouseDown', () => {
  if (!vald) return; spara(); let a = härNu(vald), ny = false;
  if (!a) { a = {id: nyId(), tid, led: vald, flytt: [0, 0, 0], vrid: null, varar}; sparad.andringar.push(a); ny = true; }
  const m = handtag[vald]; if (lage === 'vrida') m.quaternion.identity();
  const skala = vald === 'blick' ? Math.hypot(nu.g[0] - nu.h[0], nu.g[1] - nu.h[1], nu.g[2] - nu.h[2]) / BLICK : 1;
  drag = {led: vald, a, start: m.position.clone(), startQ: m.quaternion.clone(), flytt0: [...a.flytt] as V3, vrid0: a.vrid ? [...a.vrid] as Q : null, ny, skala};
});
flytta.addEventListener('objectChange', () => {
  if (!drag) return; const m = handtag[drag.led];
  if (lage === 'flytta') { const d = m.position.clone().sub(drag.start).multiplyScalar(drag.skala); drag.a.flytt = [drag.flytt0[0] + d.x, drag.flytt0[1] + d.y, drag.flytt0[2] + d.z]; }
  else { const q = m.quaternion.clone().multiply(drag.startQ.clone().invert()); if (drag.vrid0) q.multiply(new T.Quaternion(...drag.vrid0)); drag.a.vrid = [q.x, q.y, q.z, q.w]; }
  stall(); handtagTill(); rita();
});
flytta.addEventListener('mouseUp', () => {
  if (!drag) return; const a = drag.a, rörd = Math.hypot(...a.flytt.map((n, i) => n - drag!.flytt0[i])) > 1e-5 || JSON.stringify(a.vrid) !== JSON.stringify(drag.vrid0);
  if (!rörd) { if (drag.ny) sparad.andringar = sparad.andringar.filter(x => x !== a); angraLista.pop(); drag = null; handtagTill(); rita(); return; }
  if (Math.hypot(...a.flytt) < 1e-6 && (!a.vrid || Math.abs(a.vrid[3]) > 0.999999)) sparad.andringar = sparad.andringar.filter(x => x !== a); // tillbaka där den var: ingen ändring
  drag = null; handtag[a.led].quaternion.identity(); ändrat();
});

function välj(led: Led | null) {
  vald = led; if (led !== 'hogerHand' && led !== 'vansterHand' && lage === 'vrida') sättLäge('flytta');
  if (led) { flytta.attach(handtag[led]); flytta.setMode(lage === 'vrida' ? 'rotate' : 'translate'); } else flytta.detach();
  document.querySelectorAll<HTMLButtonElement>('#leder button').forEach(b => b.classList.toggle('vald', b.dataset.led === led));
  $<HTMLButtonElement>('[data-lage=vrida]').disabled = !(led === 'hogerHand' || led === 'vansterHand');
  handtagTill(); visaVarar(); visaLista(); rita();
}
function sättLäge(l: 'flytta' | 'vrida') { lage = l; flytta.setMode(l === 'vrida' ? 'rotate' : 'translate'); flytta.setSpace(l === 'vrida' ? 'local' : 'world'); handtag.hogerHand.quaternion.identity(); handtag.vansterHand.quaternion.identity();
  document.querySelectorAll<HTMLButtonElement>('#lagen button').forEach(b => b.classList.toggle('vald', b.dataset.lage === l)); rita(); }

// Klick i bilden: en kula väljs (och dras sedan i pilarna); ett klick på tomma ytan släpper den valda.
const pek = new T.Raycaster(), ner = {x: 0, y: 0, på: false};
canvas.addEventListener('pointerdown', e => {
  ner.x = e.clientX; ner.y = e.clientY; ner.på = flytta.axis !== null;
  if (flytta.axis !== null) { orbit.enabled = false; return; } // pilarna tar det
  const r = canvas.getBoundingClientRect(); pek.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
  const hit = pek.intersectObjects(LEDER.map(l => handtag[l]).filter(m => m.visible))[0];
  if (hit) { ner.på = true; orbit.enabled = false; välj(hit.object.userData.led as Led); }
}, {capture: true});
window.addEventListener('pointerup', e => { if (!drag) orbit.enabled = true; if (!ner.på && Math.hypot(e.clientX - ner.x, e.clientY - ner.y) < 4 && e.target === canvas && vald) välj(null); ner.på = false; });

// ---- panelen ----------------------------------------------------------------------------------------------------
function visaTid() {
  $('#klocka').textContent = `${sek(tid)} av ${sek(DUR)}`;
  ($('#tidslinje .spets') as HTMLElement).style.left = `${tid / DUR * 100}%`;
  // Den del tidslinjen står i är markerad, i listan och på tidslinjen.
  const del = foljd.delar.findIndex(d => tid < d.till - 1e-6), nuDel = del < 0 ? foljd.delar.length - 1 : del;
  document.querySelectorAll('#delar li').forEach((li, i) => li.classList.toggle('nu', i === nuDel));
  document.querySelectorAll('#tidslinje .del').forEach((d, i) => d.classList.toggle('nu', i === nuDel));
}
function visaVarar() {
  const a = vald ? härNu(vald) : null, värde = a ? a.varar : varar, input = $<HTMLInputElement>('#varar');
  if (document.activeElement !== input) input.value = String(värde);
  $('#varar-text').textContent = `${värde.toFixed(2).replace('.', ',')} s åt varje håll`;
  $('#varar-om').textContent = a ? `Gäller ändringen av ${LEDNAMN[a.led].toLowerCase()} vid ${sek(a.tid)}.` : 'Gäller nästa ändring du gör.';
}
function visaLista() {
  const ul = $('#lista'); ul.replaceChildren();
  const alla = [...sparad.andringar].sort((a, b) => a.tid - b.tid || a.led.localeCompare(b.led));
  if (!alla.length) { const li = document.createElement('li'); li.className = 'tom'; li.textContent = 'Inga ändringar ännu.'; ul.append(li); }
  for (const a of alla) {
    const li = document.createElement('li'), text = document.createElement('span'), cm = Math.round(Math.hypot(...a.flytt) * 1000) / 10, grader = a.vrid ? Math.round(2 * Math.acos(Math.min(1, Math.abs(a.vrid[3]))) * 180 / Math.PI) : 0;
    text.textContent = `${sek(a.tid)} · ${LEDNAMN[a.led]} · ${[cm ? `${String(cm).replace('.', ',')} cm` : '', grader ? `vriden ${grader}°` : ''].filter(Boolean).join(', ') || 'ingen skillnad'}`;
    const bort = document.createElement('button'); bort.textContent = 'Ta bort'; bort.title = 'Ta bort ändringen'; bort.onclick = e => { e.stopPropagation(); taBort(a.id); };
    li.onclick = () => { setTime(a.tid); välj(a.led); };
    li.classList.toggle('har', Math.abs(a.tid - tid) < RUTA / 2 && vald === a.led); li.append(text, bort); ul.append(li);
  }
  $<HTMLButtonElement>('#angra').disabled = !angraLista.length;
  const linje = $('#tidslinje'); linje.querySelectorAll('.prick').forEach(p => p.remove());
  for (const a of alla) { const p = document.createElement('div'); p.className = 'prick'; p.style.left = `${a.tid / DUR * 100}%`; p.title = `${LEDNAMN[a.led]}, ${sek(a.tid)}`; linje.append(p); }
}
function visaStatus() { const s = $('#status'); s.className = osparat ? 'osparat' : sparadKl ? 'bra' : ''; s.textContent = osparat ? 'Ändrat – inte sparat ännu.' : sparadKl ? `Sparat kl. ${sparadKl}.` : sparadFil ? 'Allt är sparat.' : 'Inget sparat ännu.'; }

// Delarna i panelen: en rad var, klick hoppar dit.
foljd.delar.forEach((d, i) => { const li = document.createElement('li'), nr = document.createElement('b'), namn = document.createElement('span'), längd = document.createElement('small');
  nr.textContent = `${i + 1}.`; namn.textContent = d.namn; längd.textContent = sek(d.till - d.fran); li.title = `Börjar vid ${sek(d.fran)}`; li.append(nr, namn, längd);
  li.onclick = () => { spela(false); setTime(d.fran); }; $('#delar').append(li); });
// Tidslinjen: delarna med namn, en prick per ändring och spetsen där han står; dra i den för att gå i tiden.
{ const linje = $('#tidslinje');
  for (const d of foljd.delar) { const del = document.createElement('div'); del.className = 'del'; del.textContent = d.namn; del.style.left = `${d.fran / DUR * 100}%`; del.style.width = `calc(${(d.till - d.fran) / DUR * 100}% - 2px)`; linje.append(del); }
  const spets = document.createElement('div'); spets.className = 'spets'; linje.append(spets);
  const gå = (e: PointerEvent) => { const r = linje.getBoundingClientRect(); setTime((e.clientX - r.left) / r.width * DUR); };
  linje.addEventListener('pointerdown', e => { linje.setPointerCapture(e.pointerId); gå(e); });
  linje.addEventListener('pointermove', e => { if (linje.hasPointerCapture(e.pointerId)) gå(e); }); }

$('#spela').onclick = () => spela(!spelar);
document.querySelectorAll<HTMLButtonElement>('#farter button').forEach(b => b.onclick = () => { fart = Number(b.dataset.fart); document.querySelectorAll('#farter button').forEach(x => x.classList.toggle('vald', x === b)); });
$<HTMLInputElement>('#slinga').onchange = e => { slinga = (e.target as HTMLInputElement).checked; };
document.querySelectorAll<HTMLButtonElement>('#kameror button').forEach(b => b.onclick = () => setKamera(b.dataset.kamera as Kamera));
document.querySelectorAll<HTMLButtonElement>('#leder button').forEach(b => b.onclick = () => välj(vald === b.dataset.led ? null : b.dataset.led as Led));
document.querySelectorAll<HTMLButtonElement>('#lagen button').forEach(b => b.onclick = () => sättLäge(b.dataset.lage as 'flytta' | 'vrida'));
$<HTMLInputElement>('#kulor').onchange = () => { handtagTill(); rita(); };
{ const input = $<HTMLInputElement>('#varar'); let pågår = false;
  input.addEventListener('input', () => { const n = Number(input.value), a = vald ? härNu(vald) : null;
    if (a) { if (!pågår) { spara(); pågår = true; } a.varar = n; osparat = true; stall(); handtagTill(); visaStatus(); rita(); } else varar = n; visaVarar(); });
  input.addEventListener('change', () => { pågår = false; input.blur(); visaLista(); visaVarar(); }); }
$('#angra').onclick = ångra;
$('#spara').onclick = () => { void sparaFiler(); };
window.addEventListener('keydown', e => {
  const iText = (e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'checkbox';
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); ångra(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void sparaFiler(); return; }
  if (iText) return;
  if (e.key === ' ') { e.preventDefault(); spela(!spelar); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); spela(false); setTime(Math.round(tid * foljd.fps - 1) / foljd.fps); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); spela(false); setTime(Math.round(tid * foljd.fps + 1) / foljd.fps); }
  else if (e.key === 'Escape') välj(null);
});
window.addEventListener('beforeunload', e => { if (osparat) e.preventDefault(); });
new ResizeObserver(() => { scen.storlek(); ram(); rita(); }).observe($('#yta'));
const synligt = {bord: true, stol: true, platser: true};
function visaDel(vad: Visa, på: boolean) { synligt[vad] = på; scen.synlig(vad, på); $<HTMLInputElement>(`#visa-${vad}`).checked = på; rita(); }
(['bord', 'stol', 'platser'] as Visa[]).forEach(vad => { $<HTMLInputElement>(`#visa-${vad}`).onchange = e => visaDel(vad, (e.target as HTMLInputElement).checked); });

// ---- spara -------------------------------------------------------------------------------------------------------
async function sparaFiler() {
  const fil: Sparad = {namn: sparad.namn, om: sparad.om, grund: GRUND, blickMot: blickMot(), andringar: [...sparad.andringar].sort((a, b) => a.tid - b.tid), sparad: new Date().toISOString()};
  const put = async (url: string, data: unknown) => { const r = await fetch(url, {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify(data, null, 1)}); if (!r.ok) throw Error(`Kunde inte spara (${r.status}).`); return r.json(); };
  $('#status').textContent = 'Sparar …';
  const rattning = `armbågarna vridna ut och upp så att underarmarna ligger minst ${ARMAR.luft * 100} cm över bordet framför dess kant (standarddocka/editor/armar.ts)`;
  const svar = [await put(SPARAS, fil), await put(RUTOR, rutor(foljd, fil, blickKamera(), rattning))];
  osparat = false; sparadKl = new Date().toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'}); visaStatus(); return svar;
}

// ---- start -------------------------------------------------------------------------------------------------------
setKamera(kamera); scen.storlek(); stall(); handtagTill(); visaTid(); visaLista(); visaStatus(); visaVarar(); välj(null);
$<HTMLButtonElement>('[data-lage=vrida]').disabled = true;
if (query.get('kulor') === '0') { $<HTMLInputElement>('#kulor').checked = false; handtagTill(); }
const bord = await scen.bord;
// Armarna över bordskanten: grundrörelsen rättas en gång när bordet (och därmed dess kant) är på plats.
laddarText('armarna över bordskanten'); await new Promise(r => setTimeout(r, 0));
const armar = lyftArmar(foljd, scen, bord);
$('#laddar').style.display = 'none'; ritaNu(); requestAnimationFrame(steg);
console.log('Kortplatserna, planen mot bordets tryckta (mm):', JSON.stringify(bord));
console.log('Armarna över bordskanten, före och efter (minsta luft i mm):', JSON.stringify(armar));

Object.assign(api, {
  setTime: (t: number) => { spela(false); setTime(t); ritaNu(); },
  setKamera: (k: Kamera) => { setKamera(k); ritaNu(); },
  addChange: (a: Partial<Andring> & {led: Led}) => { const id = läggTill(a); ritaNu(); return id; },
  removeChange: (id: string) => { taBort(id); ritaNu(); },
  undo: () => { ångra(); ritaNu(); },
  save: () => sparaFiler(),
  visa: (vad: Visa, på: boolean) => { visaDel(vad, på); ritaNu(); },
  // Var en kula syns i fönstret (bildpunkter), så att kontrollen kan dra i den med musen.
  kula: (led: Led) => { const p = handtag[led].position.clone().project(camera), r = canvas.getBoundingClientRect(); return {x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height}; },
  state: () => {
    const p = (v: T.Vector3) => [v.x, v.y, v.z].map(n => Math.round(n * 10000) / 10000), hips = scen.bone('Hips');
    return {tid, langd: DUR, kamera, spelar, vald, osparat, andringar: sparad.andringar, delar: foljd.delar, skarv: foljd.skarv, platser: bord, stol: scen.stol, armar, synligt, fel,
      blick: {mot: blickMot(), foljerKortet: Math.round(foljerKortet(foljd.blick, tid) * 100) / 100, tider: foljd.blick, punkt: nu.g},
      hoft: {rorelsen: foljd.hip, mannen: p(hips), skillnadMm: Math.round(hips.distanceTo(new T.Vector3(...foljd.hip)) * 1000)},
      leder: {hogerHand: p(scen.bone('RightHand')), vansterHand: p(scen.bone('LeftHand')), hogerArmbage: p(scen.bone('RightForeArm')), vansterArmbage: p(scen.bone('LeftForeArm')), huvud: p(scen.bone('Head')), hogerLar: p(scen.bone('RightUpLeg')), hogerKna: p(scen.bone('RightLeg')), hogerFot: p(scen.bone('RightFoot'))},
      malHogerHand: nu.R.w, malVansterHand: nu.L.w, kort: nu.card.c, vikter: sparad.andringar.map(a => ({id: a.id, vikt: vikt(a, tid)}))};
  },
});
api.ready = true;
