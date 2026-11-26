// Editorn för standarddockan: mannen vid Blenders bord i rörelsen A1 → A2.3 → kort 1 på en av de sju platserna och
// tillbaka, en tidslinje att spela och dra i, kameror (också från de sju platserna), handtag att dra i som blir ändringar
// ovanpå grundrörelserna, och inspelning av ett klipp. Ändringarna sparas genom editorns server i standarddocka/rorelser/
// (grundrörelserna ändras aldrig), klippen i standarddocka/klipp/.
//   ?plats=<1–7>&t=<sekunder>&kamera=<lag|film|plats1…plats7|sida|topp|fri>[&kulor=0][&utseende=nyckel]   öppnar ett läge
//   direkt (förval: given till plats 4, lägre kamera, Blenders bord som det är)
//   ?giv=<namn>[&vilan=<namn>]   en grundrörelse på prov i stället för platsens (se PROV nedan)
// window.editor (för kontrollen och verktyget ../verktyg/titta.ts): ready, setTime(t), setKamera(k), state(), addChange({...}),
// removeChange(id), undo(), save(), kula(led), visa(vad, på), tillSparat(), tillGrund(), fart(del, gånger),
// spelaIn(kameror, förstaDel, sistaDel).
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import type {Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {FART, GIVAR, LEDER, LEDNAMN, LIVSDELAR, TILL_SKON, VARAR, foljerKortet, rutor, sattIhop, stallning, taktFor, vikt, type Andring, type Foljd, type Frame, type Led, type Liv, type Livsdel, type Motion, type Q, type Sparad, type V3} from './rorelse.ts';
import {byggScen, kameraVy, kameransPlats, platskamera, somKamera, type Kamera, type Scen, type Utseende} from './scen.ts';
import {ARMAR, lyftArmar, matArmar} from './armar.ts';

const query = new URLSearchParams(location.search);
/** Platsen kortet ges till (varje plats har sin egen rörelse och sina egna sparade ändringar). */
const PLATS = GIVAR[Number(query.get('plats'))] ? Number(query.get('plats')) : 4;
// En grundrörelse på prov (?giv=<namn> och ?vilan=<namn>, filer i blackjack-dealer/dealer3d/data): spelas i stället för
// platsens giv eller vilan till skon, utan det sparade lagret, och går inte att spara. För den som gör om en grundrörelse.
const prov = (namn: string | null) => namn && /^[a-z0-9][a-z0-9-]*$/.test(namn) ? namn : null;
const PROVGIV = prov(query.get('giv')), PROVVILA = prov(query.get('vilan')), PROV = !!(PROVGIV || PROVVILA);
const NAMN = PROV ? `prov-p${PLATS}` : `a1-a23-p${PLATS}c1`, SPARAS = `/standarddocka/rorelser/${NAMN}.json`, RUTOR = `/standarddocka/rorelser/${NAMN}.rutor.json`;
const GRUND = [PROVVILA ?? TILL_SKON, PROVGIV ?? GIVAR[PLATS]];
const FORVAL: Sparad = {namn: `Vilan, skon och given till plats ${PLATS} kort 1`, om: `A1 till A2.3 (${GRUND[0]}) och sedan Paows giv från A2.3 till plats ${PLATS} kort 1 och tillbaka. Ändringarna läggs ovanpå grundrörelserna.`, grund: GRUND, andringar: []};
const PLATSER = [1, 2, 3, 4, 5, 6, 7];
const KAMERANAMN = (k: Kamera) => { const plats = kameransPlats(k); return plats ? `plats-${plats}` : ({film: 'gamla-kameran', sida: 'sidan', topp: 'uppifran', fri: 'fri'} as Record<string, string>)[k]; };
const $ = <E extends HTMLElement>(sel: string) => document.querySelector(sel) as E;
const fel: string[] = [];
const visaFel = (text: string) => { fel.push(text); const box = $('#fel'); box.style.display = 'block'; box.textContent = 'Något gick fel: ' + fel.join('\n'); };
window.addEventListener('error', e => visaFel(String(e.message)));
window.addEventListener('unhandledrejection', e => visaFel(String((e.reason as Error)?.message ?? e.reason)));
const laddarText = (vad: string) => { $('#laddar').firstChild!.textContent = `Laddar ${vad} …`; };
const sek = (t: number) => t.toFixed(2).replace('.', ',') + ' s';

type Visa = 'bord' | 'stol' | 'platser';
type Klipp = {fil: string; rutor: number; bytes: number};
type Api = {ready: boolean; setTime(t: number): void; setKamera(k: Kamera): void; state(): unknown; addChange(a: Partial<Andring> & {led: Led}): string; removeChange(id: string): void; undo(): void; save(): Promise<unknown>; visa(vad: Visa, på: boolean): void; kula(led: Led): {x: number; y: number};
  tillSparat(): void; tillGrund(): void; fart(del: number, ganger: number): void; liv(delar: Livsdel[], fro?: number): void; spelaIn(kameror: Kamera[], fran: number, till: number): Promise<Klipp[]>};
declare global { interface Window { editor: Api } }
const api: Api = {ready: false} as Api; window.editor = api;

const hämta = async <X>(url: string): Promise<X> => { const r = await fetch(url, {cache: 'no-store'}); if (!r.ok) throw Error(`${url}: ${r.status}`); return r.json() as Promise<X>; };

// ---- data ----------------------------------------------------------------------------------------------------
laddarText('rörelserna');
const [plan, forsta, andra, sparadFil] = await Promise.all([
  hämta<Plan>('/blackjack-dealer/placements/default.json'),
  hämta<Motion>(`/blackjack-dealer/dealer3d/data/${GRUND[0]}.json`),
  hämta<Motion>(`/blackjack-dealer/dealer3d/data/${GRUND[1]}.json`),
  PROV ? null : fetch(SPARAS, {cache: 'no-store'}).then(r => r.status === 200 ? r.json() as Promise<Sparad> : null), // 204: inget sparat ännu
]);
const sparad: Sparad = sparadFil ? {...FORVAL, ...sparadFil, grund: GRUND} : structuredClone(FORVAL);
const foljd: Foljd = sattIhop(forsta, andra, PLATS), RUTA = 1 / foljd.fps;
// Takten: farten per del. `tid` och DUR är filmens tid (det tidslinjen visar); ändringarna, blicken och rutorna räknas i
// grundrörelsens tid, som tak.grund(tid) ger.
// Förvalet är Jakobs takt (1 s, 1 s och 0,6 s) på tiden då något rör sig; en fart han själv har satt gäller före den
// (rorelse.ts taktFor).
let tak = taktFor(foljd, sparad.fart, PROV), DUR = tak.langd;
/** Ändringarna, farten (null: förvalet) och de små rörelserna som ett stycke text: det som ångras, sparas och jämförs med den sparade filen. */
const ogonblick = () => JSON.stringify([sparad.andringar, tak.forval ? null : tak.fart, sparad.liv ?? null]);
/** Som de ligger i den sparade filen: det "Tillbaka till det sparade" går till. */
let sparatLage = ogonblick();
console.log('Skarven, före och efter att bålen lades om (m):', foljd.skarv);

// ---- scenen ----------------------------------------------------------------------------------------------------
const canvas = $<HTMLCanvasElement>('#bild');
/** Utseendet 'nyckel' (?utseende=nyckel): rena färger på bakgrund, bord och kort, för film där dealern ska skiljas ut (scen.ts). */
const UTSEENDE: Utseende = query.get('utseende') === 'nyckel' ? 'nyckel' : 'vanligt';
const scen: Scen = await byggScen(canvas, plan, foljd.hip, stallning(foljd, 0, []), laddarText, UTSEENDE);
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
let kamera: Kamera = somKamera(query.get('kamera')) ?? 'spel';
/** Blicken i vilan: mot spelets kamera när den är vald, annars mot den lägre kameran (Jakob 2026-11-26: blicken mot kameran). */
// Blicken är rörelsens egen och följer inte den valda kameran: i vilan ser han in i spelets vy, kameran på plats 4
// (Jakob 2026-11-26: "A1 [ska] alltid ha avataren som tittar mot kameran … mot P4:as kamera för tillfället"). Då har
// två klipp som möts i ett ankare samma huvud, vilken kamera som än var vald.
const blickMot = (): 'spel' => 'spel';
/** Under en inspelning står blicken fast, så att samma rörelse filmas från varje kamera. */
let blickLas: V3 | null = null;
const blickKamera = () => blickLas ?? kameraVy(blickMot(), plan).pos;
let vald: Led | null = null, lage: 'flytta' | 'vrida' = 'flytta', varar = VARAR, osparat = false, sparadKl = '';
/** Det armarnas mätning sade vid senaste Spara, om en underarm går genom bordets kant. */
let sparadVarning = '';
/** En inspelning som pågår: handtagen är dolda och Esc avbryter. */
let inspelning: {avbryt: boolean} | null = null;
const angraLista: string[] = [];
let nu: Frame = stallning(foljd, tak.grund(tid), sparad.andringar, blickKamera(), sparad.liv);
const nyId = () => Math.random().toString(36).slice(2, 9);
const visaKulor = () => $<HTMLInputElement>('#kulor').checked;

// Ansiktet vrids ända fram mot kameran när han inte följer kortet (scen.ts pose): då ser han in i den, inte under den.
function stall() { const grundtid = tak.grund(tid); nu = stallning(foljd, grundtid, sparad.andringar, blickKamera(), sparad.liv); scen.pose(nu, foljd.hip, 1 - foljerKortet(foljd.blick, grundtid)); }
/** Handtagen där mannens leder och blicken är nu (utom det som dras). */
function handtagTill() {
  // Blickens kula står BLICK meter framför ansiktet åt det håll han ser (blickpunkten själv kan ligga i kameran).
  const huvud = scen.bone('Head'), blick = new T.Vector3(...(nu.g as V3)).sub(new T.Vector3(...(nu.h as V3))).normalize().multiplyScalar(BLICK).add(huvud);
  const plats: Record<Led, T.Vector3> = {hogerHand: scen.bone('RightHand'), vansterHand: scen.bone('LeftHand'), hogerArmbage: scen.bone('RightForeArm'), vansterArmbage: scen.bone('LeftForeArm'), blick};
  // Blickens kula står mellan honom och kameran och skymmer bordet: den syns bara när Blicken är vald.
  for (const led of LEDER) { const m = handtag[led]; if (!(drag && drag.led === led)) m.position.copy(plats[led]); m.visible = !inspelning && (led === 'blick' ? vald === 'blick' : visaKulor() || vald === led);
    m.material.opacity = vald === led ? 1 : 0.8; }
  blicklinje.geometry.setFromPoints([huvud, handtag.blick.position]); blicklinje.computeLineDistances(); blicklinje.visible = !inspelning && vald === 'blick';
  flytta.getHelper().visible = !inspelning && vald !== null;
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
  kamera = k;
  if (k !== 'fri') { scen.setKamera(k); const dir = new T.Vector3(); camera.getWorldDirection(dir); orbit.target.copy(camera.position).addScaledVector(dir, k === 'topp' ? 2.1 : k === 'sida' ? 2.4 : 1.95); orbit.update(); }
  document.querySelectorAll<HTMLButtonElement>('#kameror button').forEach(b => b.classList.toggle('vald', b.dataset.kamera === k)); ram(); rita();
}
/** Spelets bild som en ram i fönstret, när kameran är en plats vid bordet (plats 4 är spelets egen). */
function ram() { const r = scen.filmRam(), box = $('#ram'), plats = kameransPlats(kamera); box.style.display = plats && !inspelning ? 'block' : 'none'; Object.assign(box.style, {left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'});
  if (plats) box.firstElementChild!.textContent = plats === 4 ? 'Spelets bild (plats 4)' : `Bilden från plats ${plats}`; }
orbit.addEventListener('start', () => { if (kamera !== 'fri') { kamera = 'fri'; document.querySelectorAll<HTMLButtonElement>('#kameror button').forEach(b => b.classList.toggle('vald', b.dataset.kamera === 'fri')); ram(); } });
orbit.addEventListener('change', rita);

// ---- ändringarna ----------------------------------------------------------------------------------------------
const spara = () => { angraLista.push(ogonblick()); if (angraLista.length > 200) angraLista.shift(); };
/** Skiljer sig ändringarna eller farten från den sparade filen? */
const olikt = () => ogonblick() !== sparatLage;
function ändrat() { osparat = olikt(); stall(); handtagTill(); visaLista(); visaStatus(); visaVarar(); visaTid(); rita(); }
/** Takten räknas om efter en ny fart; tidslinjen står kvar i samma ögonblick av rörelsen. */
function nyTakt() { const grundtid = tak.grund(tid); tak = taktFor(foljd, sparad.fart, PROV); DUR = tak.langd; tid = tak.ut(grundtid); visaDelar(); }
function tillOgonblick(text: string) { const [andringar, fart, liv] = JSON.parse(text) as [Andring[], number[] | null, Liv | null]; sparad.andringar = andringar; sparad.fart = fart ?? undefined; sparad.liv = liv ?? undefined; nyTakt(); visaLiv(); }
/** De små egna rörelserna (rorelse.ts medLiv): vilka som är på, och slumpens frö; ett nytt frö lägger dem på andra ställen. */
function visaLiv() { document.querySelectorAll<HTMLInputElement>('#liv input').forEach(c => { c.checked = !!sparad.liv?.delar.includes(c.dataset.liv as Livsdel); }); $<HTMLButtonElement>('#liv-slumpa').disabled = !sparad.liv?.delar.length; }
function sattLiv(delar: readonly Livsdel[], fro = sparad.liv?.fro ?? Math.floor(Math.random() * 1e9)) { spara(); sparad.liv = delar.length ? {fro, delar: LIVSDELAR.filter(d => delar.includes(d))} : undefined; visaLiv(); ändrat(); }
/** Farten för en del: 1 är grundrörelsens, 1,5 en och en halv gång så fort (Jakob 2026-11-26). */
function sattFart(del: number, ganger: number) {
  if (!foljd.delar[del] || !(ganger > 0)) return; const fart = [...tak.fart]; fart[del] = Math.max(FART.minst, Math.min(FART.mest, Math.round(ganger * 1000) / 1000));
  if (fart[del] === tak.fart[del]) { visaDelar(); return; } spara(); sparad.fart = fart; nyTakt(); ändrat();
}
// Återställningen (Jakob 2026-11-26: "en resetknapp så att vi kan återgå till rörelserna som finns"). Båda går att ångra,
// och inget skrivs till filen förrän han trycker Spara; grundrörelserna kan editorn aldrig ändra.
/** Det som inte är sparat kastas: ändringarna och farten blir som de ligger i den sparade filen. */
function tillSparat() { if (!olikt()) return; spara(); tillOgonblick(sparatLage); välj(null); ändrat(); }
/** Alla ändringar tas bort och farten blir grundrörelsens: kvar är grundrörelsen som den är. */
const ärGrund = () => !sparad.andringar.length && tak.forval && !sparad.liv?.delar.length;
function tillGrund() { if (ärGrund()) return; spara(); sparad.andringar = []; sparad.fart = undefined; sparad.liv = undefined; nyTakt(); visaLiv(); välj(null); ändrat(); }
/** Ändringen för en led som gäller just nu (gjord vid den här tiden), om det finns en. */
const härNu = (led: Led) => { const grundtid = tak.grund(tid); return sparad.andringar.find(a => a.led === led && Math.abs(a.tid - grundtid) < RUTA / 2) ?? null; };
function ångra() { const förra = angraLista.pop(); if (förra === undefined) return; tillOgonblick(förra); ändrat(); }
function taBort(id: string) { spara(); sparad.andringar = sparad.andringar.filter(a => a.id !== id); ändrat(); }
/** En ändring där tidslinjen står, eller vid filmens tid `a.tid`; den sparas i grundrörelsens tid. */
function läggTill(a: Partial<Andring> & {led: Led}): string {
  if (!LEDER.includes(a.led)) throw Error(`Ingen led ${a.led}.`);
  spara(); const ny: Andring = {id: nyId(), tid: tak.grund(a.tid ?? tid), led: a.led, flytt: (a.flytt ?? [0, 0, 0]) as V3, vrid: a.vrid ?? null, varar: a.varar ?? varar}; sparad.andringar.push(ny); ändrat(); return ny.id;
}

// skala: blickens kula står närmare än blickpunkten, så dess förflyttning förstoras till blickpunktens avstånd.
let drag: {led: Led; a: Andring; start: T.Vector3; startQ: T.Quaternion; flytt0: V3; vrid0: Q | null; ny: boolean; skala: number} | null = null;
flytta.addEventListener('dragging-changed', e => { orbit.enabled = !e.value; });
flytta.addEventListener('mouseDown', () => {
  if (!vald) return; spara(); let a = härNu(vald), ny = false;
  if (!a) { a = {id: nyId(), tid: tak.grund(tid), led: vald, flytt: [0, 0, 0], vrid: null, varar}; sparad.andringar.push(a); ny = true; }
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
  const del = tak.delar.findIndex(d => tid < d.till - 1e-6), nuDel = del < 0 ? tak.delar.length - 1 : del;
  document.querySelectorAll('#delar li').forEach((li, i) => li.classList.toggle('nu', i === nuDel));
  document.querySelectorAll('#tidslinje .del').forEach((d, i) => d.classList.toggle('nu', i === nuDel));
}
function visaVarar() {
  const a = vald ? härNu(vald) : null, värde = a ? a.varar : varar, input = $<HTMLInputElement>('#varar');
  if (document.activeElement !== input) input.value = String(värde);
  $('#varar-text').textContent = `${värde.toFixed(2).replace('.', ',')} s åt varje håll`;
  $('#varar-om').textContent = a ? `Gäller ändringen av ${LEDNAMN[a.led].toLowerCase()} vid ${sek(tak.ut(a.tid))}.` : 'Gäller nästa ändring du gör.';
}
function visaLista() {
  const ul = $('#lista'); ul.replaceChildren();
  const alla = [...sparad.andringar].sort((a, b) => a.tid - b.tid || a.led.localeCompare(b.led)), grundtid = tak.grund(tid);
  if (!alla.length) { const li = document.createElement('li'); li.className = 'tom'; li.textContent = 'Inga ändringar ännu.'; ul.append(li); }
  for (const a of alla) {
    const li = document.createElement('li'), text = document.createElement('span'), cm = Math.round(Math.hypot(...a.flytt) * 1000) / 10, grader = a.vrid ? Math.round(2 * Math.acos(Math.min(1, Math.abs(a.vrid[3]))) * 180 / Math.PI) : 0;
    text.textContent = `${sek(tak.ut(a.tid))} · ${LEDNAMN[a.led]} · ${[cm ? `${String(cm).replace('.', ',')} cm` : '', grader ? `vriden ${grader}°` : ''].filter(Boolean).join(', ') || 'ingen skillnad'}`;
    const bort = document.createElement('button'); bort.textContent = 'Ta bort'; bort.title = 'Ta bort ändringen'; bort.onclick = e => { e.stopPropagation(); taBort(a.id); };
    li.onclick = () => { setTime(tak.ut(a.tid)); välj(a.led); };
    li.classList.toggle('har', Math.abs(a.tid - grundtid) < RUTA / 2 && vald === a.led); li.append(text, bort); ul.append(li);
  }
  $<HTMLButtonElement>('#angra').disabled = !angraLista.length;
  const linje = $('#tidslinje'); linje.querySelectorAll('.prick').forEach(p => p.remove());
  for (const a of alla) { const p = document.createElement('div'), t = tak.ut(a.tid); p.className = 'prick'; p.style.left = `${t / DUR * 100}%`; p.title = `${LEDNAMN[a.led]}, ${sek(t)}`; linje.append(p); }
}
function visaStatus() { const s = $('#status'); s.className = osparat ? 'osparat' : sparadKl ? 'bra' : ''; s.textContent = PROV ? `På prov: ${GRUND.join(' och ')}. Sparas inte.` : osparat ? 'Ändrat – inte sparat ännu.' : sparadKl ? `Sparat kl. ${sparadKl}.${sparadVarning}` : sparadFil ? 'Allt är sparat.' : 'Inget sparat ännu.';
  if (sparadVarning && !osparat) s.className = 'osparat';
  $<HTMLButtonElement>('#spara').disabled = PROV;
  $<HTMLButtonElement>('#till-sparat').disabled = !osparat; $<HTMLButtonElement>('#till-grund').disabled = ärGrund(); }

/** Vad som kan spelas in: hela rörelsen, en del, eller given (kortet ut och handen tillbaka i samma film). Värdet är första och sista delen. */
const OMFANG = (): {varde: string; text: string; namn: string}[] => { const d = tak.delar, sist = d.length - 1, l = (a: number, b: number) => sek(d[b].till - d[a].fran);
  const slug = (s: string) => s.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-');
  return [{varde: `0-${sist}`, text: `Hela rörelsen (${l(0, sist)})`, namn: 'hela'}, ...d.map((x, i) => ({varde: `${i}-${i}`, text: `Bara ${x.namn.toLowerCase()} (${l(i, i)})`, namn: slug(x.namn)})),
    ...(sist >= 2 ? [{varde: `1-${sist}`, text: `Given: kortet ut och handen tillbaka (${l(1, sist)})`, namn: 'given'}] : [])]; };
/**
 * Delarna, i panelen och på tidslinjen, som de är med farten som gäller. I panelen en rad var: klick hoppar dit, och
 * längden går att skriva om (sekunder), vilket ändrar delens fart.
 */
function visaDelar() {
  const ul = $('#delar'); ul.replaceChildren();
  tak.delar.forEach((d, i) => { const li = document.createElement('li'), nr = document.createElement('b'), namn = document.createElement('span'), längd = document.createElement('input'), s = document.createElement('small'), fart = tak.fart[i];
    const grundlängd = tak.spann[i].till - tak.spann[i].fran;
    nr.textContent = `${i + 1}.`; namn.textContent = d.namn; li.title = `Börjar vid ${sek(d.fran)}. Grundrörelsen tar ${sek(grundlängd)} här${tak.forval ? '; tiden är förvalet (1 s, 1 s och 0,6 s)' : ''}.`;
    längd.type = 'number'; längd.step = '0.1'; längd.min = (grundlängd / FART.mest).toFixed(1); längd.max = (grundlängd / FART.minst).toFixed(1); längd.value = (d.till - d.fran).toFixed(2); längd.title = 'Hur många sekunder delen ska ta. Skriv ett nytt tal för att göra den fortare eller långsammare.';
    s.textContent = Math.abs(fart - 1) < 0.005 ? 's' : `s · ${Math.round(fart * 100)} %`; s.classList.toggle('andrad', !tak.forval);
    längd.onclick = e => e.stopPropagation(); längd.onchange = () => { const sekunder = Number(längd.value); sattFart(i, sekunder > 0 ? grundlängd / sekunder : 1); };
    li.append(nr, namn, längd, s); li.onclick = () => { spela(false); setTime(tak.delar[i].fran); }; ul.append(li); });
  const linje = $('#tidslinje'), spets = linje.querySelector('.spets'); linje.querySelectorAll('.del').forEach(x => x.remove());
  for (const d of tak.delar) { const del = document.createElement('div'); del.className = 'del'; del.textContent = d.namn; del.style.left = `${d.fran / DUR * 100}%`; del.style.width = `calc(${(d.till - d.fran) / DUR * 100}% - 2px)`; linje.insertBefore(del, spets); }
  const val = $<HTMLSelectElement>('#inspela-del'), förr = val.value; val.replaceChildren(...OMFANG().map(o => { const x = document.createElement('option'); x.value = o.varde; x.textContent = o.text; return x; })); if (OMFANG().some(o => o.varde === förr)) val.value = förr;
}
// Tidslinjen: delarna med namn, en prick per ändring och spetsen där han står; dra i den för att gå i tiden.
{ const linje = $('#tidslinje'), spets = document.createElement('div'); spets.className = 'spets'; linje.append(spets); visaDelar();
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
    if (a) { if (!pågår) { spara(); pågår = true; } a.varar = n; osparat = olikt(); stall(); handtagTill(); visaStatus(); rita(); } else varar = n; visaVarar(); });
  input.addEventListener('change', () => { pågår = false; input.blur(); visaLista(); visaVarar(); }); }
$('#angra').onclick = ångra;
$('#spara').onclick = () => { void sparaFiler(); };
$('#till-sparat').onclick = tillSparat;
$('#till-grund').onclick = tillGrund;
document.querySelectorAll<HTMLInputElement>('#liv input').forEach(c => { c.onchange = () => sattLiv([...document.querySelectorAll<HTMLInputElement>('#liv input')].filter(x => x.checked).map(x => x.dataset.liv as Livsdel)); });
$('#liv-slumpa').onclick = () => sattLiv(sparad.liv?.delar ?? [], Math.floor(Math.random() * 1e9));
// Vilken plats kortet ges till: varje plats är en egen rörelse med egna sparade ändringar, så sidan laddas om med den.
document.querySelectorAll<HTMLButtonElement>('#malplatser button').forEach(b => { const plats = Number(b.dataset.plats); b.classList.toggle('vald', plats === PLATS);
  b.onclick = () => { if (plats === PLATS) return; const q = new URLSearchParams({plats: String(plats), kamera}); location.search = q.toString(); }; });
{ const valt = (): [number, number] => { const [a, b] = $<HTMLSelectElement>('#inspela-del').value.split('-').map(Number); return [a, b]; }, fel = (e: unknown) => visaFel(String((e as Error).message ?? e));
  $('#inspela-en').onclick = () => { void spelaIn([kamera], ...valt()).catch(fel); };
  $('#inspela-alla').onclick = () => { void spelaIn(PLATSER.map(platskamera), ...valt()).catch(fel); }; }
window.addEventListener('keydown', e => {
  if (inspelning) { if (e.key === 'Escape') inspelning.avbryt = true; e.preventDefault(); return; }
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
  if (PROV) throw Error('En grundrörelse på prov sparas inte: öppna editorn utan giv och vilan i adressen.');
  const fil: Sparad = {namn: sparad.namn, om: sparad.om, grund: GRUND, blickMot: blickMot(), ...(tak.forval ? {} : {fart: tak.fart}), ...(sparad.liv ? {liv: sparad.liv} : {}), andringar: [...sparad.andringar].sort((a, b) => a.tid - b.tid), sparad: new Date().toISOString()};
  const put = async (url: string, data: unknown) => { const r = await fetch(url, {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify(data, null, 1)}); if (!r.ok) throw Error(`Kunde inte spara (${r.status}).`); return r.json(); };
  $('#status').textContent = 'Sparar …';
  // Armarna mäts på den färdiga rörelsen, med hans ändringar i: regeln rättar bara grundrörelsen, och en hand han har
  // dragit i kan föra underarmen ned i kanten igen. Måtten sparas med rutorna, och han får veta om en arm går igenom.
  const rattning = `armbågarna vridna ut och upp av editorns regel (standarddocka/editor/armar.ts, minst ${ARMAR.luft * 100} cm luft i grundrörelsen); luften på den färdiga rörelsen står i fältet armar`;
  const data = rutor(foljd, fil, blickKamera(), rattning, tak), armarNu = matArmar(data.frames as unknown as Frame[], foljd.hip, scen, bord), genom = armarNu.R.genomRutor + armarNu.L.genomRutor; stall();
  const svar = [await put(SPARAS, fil), await put(RUTOR, {...data, armar: armarNu})];
  sparadVarning = genom ? ` Obs: en underarm går genom bordets kant i ${genom} rutor (höger ${armarNu.R.genomRutor}, vänster ${armarNu.L.genomRutor}).` : '';
  sparatLage = ogonblick(); osparat = false; sparadKl = new Date().toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'}); visaStatus(); return svar;
}

// ---- spela in ----------------------------------------------------------------------------------------------------
/**
 * Spelar in rörelsen från delen `forst` till och med delen `sist` (0 är den första) som en film per kamera, i filmens
 * storlek, med farten som gäller och utan handtag. Varje ruta ritas för sig och skickas till editorns server, som lägger
 * filmen i standarddocka/klipp/ (en ny inspelning med samma namn skriver över den förra). Blicken står fast som den är när
 * inspelningen börjar, så att det är samma rörelse från varje kamera. Esc avbryter.
 */
async function spelaIn(kameror: Kamera[], forst: number, sist: number): Promise<Klipp[]> {
  if (inspelning) return []; spela(false); kameror = kameror.map(k => somKamera(k) ?? 'spel');
  const a = tak.delar[forst], b = tak.delar[sist]; if (!a || !b || sist < forst) throw Error('Det finns ingen sådan del att spela in.');
  const fran = Math.round(a.fran * foljd.fps), till = Math.round(b.till * foljd.fps), antal = (till - fran + 1) * kameror.length;
  const delnamn = OMFANG().find(o => o.varde === `${forst}-${sist}`)?.namn ?? `del-${forst + 1}-${sist + 1}`;
  const före = {tid, kamera, pos: camera.position.clone(), kvat: camera.quaternion.clone(), mot: orbit.target.clone()}, klara: Klipp[] = [], text = $('#laddar'), status = $('#inspela-status');
  const post = async <X>(url: string, body: BodyInit | null): Promise<X> => { const r = await fetch(url, {method: 'POST', body}); if (!r.ok) throw Error(`Inspelningen stannade: ${(await r.text()).slice(0, 300)}`); return r.json() as Promise<X>; };
  const lås = blickKamera(); blickLas = [lås[0], lås[1], lås[2]]; inspelning = {avbryt: false}; välj(null); handtagTill(); ram(); text.style.display = 'grid'; status.className = 'tips'; status.textContent = '';
  let id: string | null = null, gjorda = 0;
  try {
    scen.filmstorlek(true);
    for (const k of kameror) {
      if (k !== 'fri') scen.setKamera(k);
      id = (await post<{id: string}>('/inspelning/start', JSON.stringify({namn: `${NAMN}-${delnamn}-${KAMERANAMN(k)}${UTSEENDE === 'nyckel' ? '-nyckel' : ''}`, fps: foljd.fps}))).id;
      for (let i = fran; i <= till; i++) {
        if (inspelning.avbryt) break;
        tid = i / foljd.fps; stall(); await post(`/inspelning/${id}/ruta`, await scen.bild()); gjorda++;
        text.firstChild!.textContent = `Spelar in ${kameror.length > 1 ? `kamera ${kameror.indexOf(k) + 1} av ${kameror.length}, ` : ''}bild ${gjorda} av ${antal} … (Esc avbryter)`;
      }
      if (inspelning.avbryt) break;
      klara.push(await post<Klipp>(`/inspelning/${id}/klar`, null)); id = null;
    }
  } finally {
    if (id) await fetch(`/inspelning/${id}/avbryt`, {method: 'POST'}).catch(() => {});
    const avbruten = inspelning.avbryt; inspelning = null; blickLas = null; scen.filmstorlek(false); text.style.display = 'none';
    if (före.kamera === 'fri') { kamera = 'fri'; camera.position.copy(före.pos); camera.quaternion.copy(före.kvat); orbit.target.copy(före.mot); orbit.update(); scen.storlek(); } else setKamera(före.kamera);
    setTime(före.tid); ritaNu();
    status.className = klara.length && !avbruten ? 'tips bra' : 'tips'; status.textContent = `${avbruten ? 'Avbruten. ' : ''}${klara.length ? `${klara.length === 1 ? 'Klippet ligger' : `${klara.length} klipp ligger`} i mappen standarddocka/klipp: ${klara.map(c => c.fil.split('/').pop()).join(', ')}` : ''}`;
  }
  return klara;
}

// ---- start -------------------------------------------------------------------------------------------------------
setKamera(kamera); scen.storlek(); stall(); handtagTill(); visaTid(); visaLista(); visaStatus(); visaVarar(); visaLiv(); välj(null);
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
  setKamera: (k: Kamera) => { setKamera(somKamera(k) ?? 'spel'); ritaNu(); },
  addChange: (a: Partial<Andring> & {led: Led}) => { const id = läggTill(a); ritaNu(); return id; },
  removeChange: (id: string) => { taBort(id); ritaNu(); },
  undo: () => { ångra(); ritaNu(); },
  save: () => sparaFiler(),
  visa: (vad: Visa, på: boolean) => { visaDel(vad, på); ritaNu(); },
  tillSparat: () => { tillSparat(); ritaNu(); },
  tillGrund: () => { tillGrund(); ritaNu(); },
  fart: (del: number, ganger: number) => { sattFart(del, ganger); ritaNu(); },
  liv: (delar: Livsdel[], fro?: number) => { sattLiv(delar, fro); ritaNu(); },
  spelaIn,
  // Var en kula syns i fönstret (bildpunkter), så att kontrollen kan dra i den med musen.
  kula: (led: Led) => { const p = handtag[led].position.clone().project(camera), r = canvas.getBoundingClientRect(); return {x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height}; },
  state: () => {
    const p = (v: T.Vector3) => [v.x, v.y, v.z].map(n => Math.round(n * 10000) / 10000), hips = scen.bone('Hips');
    const grundtid = tak.grund(tid);
    return {namn: NAMN, plats: PLATS, grund: GRUND, tid, grundtid, langd: DUR, fart: tak.fart, forvaldTakt: tak.forval, kamera, kameraLage: p(camera.position), spelar, vald, osparat, andringar: sparad.andringar, delar: tak.delar, grunddelar: foljd.delar, skarv: foljd.skarv, platser: bord, stol: scen.stol, armar, synligt, fel,
      blick: {mot: blickMot(), foljerKortet: Math.round(foljerKortet(foljd.blick, grundtid) * 100) / 100, tider: foljd.blick, punkt: nu.g},
      hoft: {rorelsen: foljd.hip, mannen: p(hips), skillnadMm: Math.round(hips.distanceTo(new T.Vector3(...foljd.hip)) * 1000)},
      leder: {hogerHand: p(scen.bone('RightHand')), vansterHand: p(scen.bone('LeftHand')), hogerArmbage: p(scen.bone('RightForeArm')), vansterArmbage: p(scen.bone('LeftForeArm')), huvud: p(scen.bone('Head')), hogerLar: p(scen.bone('RightUpLeg')), hogerKna: p(scen.bone('RightLeg')), hogerFot: p(scen.bone('RightFoot'))},
      malHogerHand: nu.R.w, malVansterHand: nu.L.w, kort: nu.card.c, vikter: sparad.andringar.map(a => ({id: a.id, vikt: vikt(a, grundtid)}))};
  },
});
api.ready = true;
