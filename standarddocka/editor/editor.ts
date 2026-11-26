// Editorn för standarddockan: mannen vid Blenders bord i rörelsen A1 → A2.3 → kort 1 på en av de sju platserna och
// tillbaka, en tidslinje att spela och dra i, kameror (också från de sju platserna), handtag att dra i som blir ändringar
// ovanpå grundrörelserna, och inspelning av ett klipp. Ändringarna sparas genom editorns server i standarddocka/rorelser/
// (grundrörelserna ändras aldrig), klippen i standarddocka/klipp/.
//   ?plats=<1–7>&t=<sekunder>&kamera=<spel|film|plats1…plats7|sida|topp|fri>[&kulor=0][&utseende=nyckel][&docka=kvinna]
//   öppnar ett läge direkt (förval: given till plats 4, spelets vy, mannen, Blenders bord som det är)
//   ?giv=<namn>[&vilan=<namn>]   en grundrörelse på prov i stället för platsens (se PROV nedan)
//   ?runda=1   hela rundan: vilan till skon och sedan första kortet till alla sju platserna, plats 7 först, i ett svep
//   (se RUNDA nedan); med &stillhet=1 en exakt stillhet vid skon före och efter varje rörelse, som i tagningen som ska
//   bli film och klippas; den tar inga ändringar och sparas inte
// window.editor (för kontrollen och verktyget ../verktyg/titta.ts): ready, setTime(t), setKamera(k), nara(vad, från), state(), addChange({...}),
// slapp(id), removeChange(id), undo(), save(skrivÖver), kula(led), visa(vad, på), tillSparat(), tillGrund(), fart(del, gånger),
// spelaIn(kameror, förstaDel, sistaDel), granskaGrund().
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import type {Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {FART, GIVAR, LEDER, LEDNAMN, LIVSDELAR, RUNDANS_PLATSER, STILLHET, VARAR, blickenFoljer, grundFor, klipplista, lagretsFel, langd, markeText, vilanFor, grundensBrott, rundaAv, rundansMatt, rutor, sattIhop, somDenBlev, stallning, stallningOchStopp, takt, taktFor, vikt, type Andring, type Foljd, type Frame, type Led, type Liv, type Livsdel, type Motion, type Q, type Sparad, type V3} from './rorelse.ts';
import {byggScen, kameraVy, kameransPlats, platskamera, somKamera, type Docka, type Kamera, type Scen, type Utseende} from './scen.ts';
import {ARMAR, lyftArmar, matArmar, matKropp} from './armar.ts';
import type {Granser, Stopp} from './kropp.ts';

const query = new URLSearchParams(location.search);
/** Platsen kortet ges till (varje plats har sin egen rörelse och sina egna sparade ändringar). */
const PLATS = GIVAR[Number(query.get('plats'))] ? Number(query.get('plats')) : 4;
// En grundrörelse på prov (?giv=<namn> och ?vilan=<namn>, filer i blackjack-dealer/dealer3d/data): spelas i stället för
// platsens giv eller vilan till skon, utan det sparade lagret, och går inte att spara. För den som gör om en grundrörelse.
// Ett namn som inte är ett namn på en grundrörelse ger ett fel (visas när felrutan finns, nedan) i stället för att
// platsens vanliga rörelse visas.
const provFel: string[] = [];
const prov = (vad: 'giv' | 'vilan') => { const namn = query.get(vad); if (namn === null || namn === '') return null;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(namn)) { provFel.push(`?${vad}=${namn} är inget namn på en grundrörelse (små bokstäver, siffror och bindestreck, utan .json): inget visas i stället för fel rörelse.`); return '-'; } return namn; };
const PROVGIV = prov('giv'), PROVVILA = prov('vilan'), PROV = !!(PROVGIV || PROVVILA);
/**
 * Hela rundan (?runda=1; rorelse.ts rundaAv): vilan till skon och sedan första kortet till alla sju platserna i en
 * tagning, i spelets ordning, med dockans egna rörelser som de är och en exakt stillhet vid skon efter varje. Den spelas
 * och spelas in som en rörelse med en del per klipp. Ändringar, takt och små egna rörelser hör till en plats i taget och
 * finns inte här, och inget sparas. Inte tillsammans med en grundrörelse på prov.
 */
const RUNDA = query.get('runda') === '1' && !PROV;
/** Rundan med stillheten vid skon (?stillhet=1): tagningen som ska bli film och klippas. Utan den går rundan i ett svep. */
const STILLA = RUNDA && query.get('stillhet') === '1';
/** Dockan som visas (?docka=kvinna). Den väljer också grundrörelserna: dockans egna där de finns (rorelse.ts EGNA), annars de äldre. */
const DOCKA: Docka = query.get('docka') === 'kvinna' ? 'kvinna' : 'man';
const EGEN = grundFor(DOCKA, PLATS);
const NAMN = RUNDA ? `runda-c1-${DOCKA}` : PROV ? `prov-p${PLATS}` : EGEN.namn, SPARAS = `/standarddocka/rorelser/${NAMN}.json`, RUTOR = `/standarddocka/rorelser/${NAMN}.rutor.json`;
const PLATSER = [1, 2, 3, 4, 5, 6, 7];
const KAMERANAMN = (k: Kamera) => { const plats = kameransPlats(k); return plats ? `plats-${plats}` : ({film: 'gamla-kameran', sida: 'sidan', topp: 'uppifran', fri: 'fri'} as Record<string, string>)[k]; };
const $ = <E extends HTMLElement>(sel: string) => document.querySelector(sel) as E;
const fel: string[] = [];
const visaFel = (text: string) => { fel.push(text); const box = $('#fel'); box.style.display = 'block'; box.textContent = 'Något gick fel: ' + fel.join('\n'); };
window.addEventListener('error', e => visaFel(String(e.message)));
window.addEventListener('unhandledrejection', e => visaFel(String((e.reason as Error)?.message ?? e.reason)));
if (provFel.length) { visaFel(provFel.join(' ')); await new Promise(() => {}); } // sidan stannar här, med felet synligt
const laddarText = (vad: string) => { $('#laddar').firstChild!.textContent = `Laddar ${vad} …`; };
const sek = (t: number) => t.toFixed(2).replace('.', ',') + ' s';

type Visa = 'bord' | 'stol' | 'platser';
type Klipp = {fil: string; rutor: number; bytes: number};
type Api = {ready: boolean; setTime(t: number): void; setKamera(k: Kamera): void; nara(vad: 'hogerHand' | 'vansterHand' | 'kort', fran?: V3): void; state(): unknown; addChange(a: Partial<Andring> & {led: Led}): string; slapp(id: string): Andring | null; removeChange(id: string): void; undo(): void; save(skrivOver?: boolean): Promise<unknown>; visa(vad: Visa, på: boolean): void; kula(led: Led): {x: number; y: number};
  tillSparat(): void; tillGrund(): void; fart(del: number, ganger: number): void; liv(delar: Livsdel[], fro?: number): void; spelaIn(kameror: Kamera[], fran: number, till: number): Promise<Klipp[]>; granskaGrund(): unknown};
declare global { interface Window { editor: Api } }
const api: Api = {ready: false} as Api; window.editor = api;

const hämta = async <X>(url: string): Promise<X> => { const r = await fetch(url, {cache: 'no-store'}); if (!r.ok) throw Error(`${url}: ${r.status}`); return r.json() as Promise<X>; };

// ---- data ----------------------------------------------------------------------------------------------------
laddarText('rörelserna');
/** Det sparade lagret som text, som det låg när sidan laddades ('' om inget): före Spara jämförs filen med det. */
const lasSparat = () => fetch(SPARAS, {cache: 'no-store'}).then(r => r.status === 200 ? r.text() : ''); // 204: inget sparat ännu
const [plan, andra, sparadText] = await Promise.all([
  hämta<Plan>('/blackjack-dealer/placements/default.json'),
  hämta<Motion>(`/blackjack-dealer/dealer3d/data/${PROVGIV ?? EGEN.giv}.json`),
  PROV || RUNDA ? '' : lasSparat(),
]);
// En giv på prov utan vila i adressen börjar i vilan för den docka den är ritad för (rorelse.ts vilanFor).
// Rundan: vilan till skon och dockans egen giv till var och en av platserna, i spelets ordning.
const RUNDGIVAR = RUNDA ? await Promise.all(RUNDANS_PLATSER.map(async plats => { const namn = grundFor(DOCKA, plats).giv; return {plats, namn, rorelse: await hämta<Motion>(`/blackjack-dealer/dealer3d/data/${namn}.json`)}; })) : [];
const GRUND = RUNDA ? [EGEN.vila, ...RUNDGIVAR.map(g => g.namn)] : [PROVVILA ?? (PROVGIV ? vilanFor(andra.doll) : EGEN.vila), PROVGIV ?? EGEN.giv];
const forsta = await hämta<Motion>(`/blackjack-dealer/dealer3d/data/${GRUND[0]}.json`);
const FORVAL: Sparad = RUNDA ? {namn: 'Hela rundan: kort 1 till alla sju platserna', om: `A1 till A2.3 och sedan första kortet till plats ${RUNDANS_PLATSER.join(', ')}, i en tagning.`, grund: GRUND, andringar: []}
  : {namn: `Vilan, skon och given till plats ${PLATS} kort 1`, om: `A1 till A2.3 (${GRUND[0]}) och sedan given från A2.3 till plats ${PLATS} kort 1 och tillbaka (${GRUND[1]}). Ändringarna läggs ovanpå grundrörelserna.`, grund: GRUND, andringar: []};
const foljd: Foljd = RUNDA ? rundaAv({namn: GRUND[0], rorelse: forsta}, RUNDGIVAR, STILLA) : sattIhop(forsta, andra, PLATS);
// Ett sparat lager gäller bara de grundrörelser det sparades på: ändringarnas tider och farten per del hör till dem. Hör
// det till andra (grundrörelserna har bytts ut), eller har det fel (det kan skrivas för hand: rorelse.ts lagretsFel),
// läggs det inte på; det står kvar i filen tills han själv trycker Spara.
const sammaGrund = (g: readonly string[] | undefined) => !!g && g.length === GRUND.length && g.every((n, i) => n === GRUND[i]);
const sparadFil: Sparad | null = (() => { if (!sparadText) return null; try { return JSON.parse(sparadText) as Sparad; } catch { return null; } })();
const aldreSparat = sparadFil && Array.isArray(sparadFil.grund) && !sammaGrund(sparadFil.grund) ? sparadFil : null;
const lagretFel = sparadText && !aldreSparat ? (sparadFil ? lagretsFel(sparadFil, langd(foljd), foljd.delar.length) : ['filen är inte giltig JSON']) : [];
if (lagretFel.length) console.warn('Det sparade lagret har fel och används inte:', lagretFel);
const sparad: Sparad = sparadFil && !aldreSparat && !lagretFel.length ? {...FORVAL, ...sparadFil, grund: GRUND} : structuredClone(FORVAL);
/** Filen som den låg när sidan laddades, eller som den här sidan sparade den senast. */
let kandText = sparadText;
// Takten: farten per del. `tid` och DUR är filmens tid (det tidslinjen visar); ändringarna, blicken och rutorna räknas i
// grundrörelsens tid, som tak.grund(tid) ger.
// Förvalet är Jakobs takt (1 s, 1 s och 0,6 s) på tiden då något rör sig; en fart han själv har satt gäller före den
// (rorelse.ts taktFor).
// Rundan spelas som den är, ruta för ruta, med sin stillhet i ankaren.
const taktNu = () => RUNDA ? takt(foljd, [], foljd.delar, true) : taktFor(foljd, sparad.fart, PROV);
let tak = taktNu(), DUR = tak.langd;
/** Ändringarna, farten (null: förvalet) och de små rörelserna som ett stycke text: det som ångras, sparas och jämförs med den sparade filen. */
const ogonblick = () => JSON.stringify([sparad.andringar, tak.forval ? null : tak.fart, sparad.liv ?? null]);
/** Som de ligger i den sparade filen: det "Tillbaka till det sparade" går till. */
let sparatLage = ogonblick();
console.log('Skarven, före och efter att bålen lades om (m):', foljd.skarv);

// ---- scenen ----------------------------------------------------------------------------------------------------
const canvas = $<HTMLCanvasElement>('#bild');
/** Utseendet 'nyckel' (?utseende=nyckel): rena färger på bakgrund, bord och kort, för film där dealern ska skiljas ut (scen.ts). */
const UTSEENDE: Utseende = query.get('utseende') === 'nyckel' ? 'nyckel' : 'vanligt';
/** Sidans adress med ett annat val, och de val som ska följa med när den laddas om. */
const medVal = (val: Record<string, string>) => { const q = new URLSearchParams({plats: String(PLATS), kamera, ...(DOCKA === 'kvinna' ? {docka: DOCKA} : {}), ...(UTSEENDE === 'nyckel' ? {utseende: UTSEENDE} : {}), ...(RUNDA ? {runda: '1'} : {}), ...(STILLA ? {stillhet: '1'} : {}), ...val}); if (q.get('docka') === 'man') q.delete('docka'); if (!q.get('runda')) q.delete('runda'); if (!q.get('runda') || !q.get('stillhet')) q.delete('stillhet'); return q.toString(); };
const scen: Scen = await byggScen(canvas, plan, foljd.hip, stallning(foljd, 0, []), laddarText, UTSEENDE, DOCKA, andra.doll);
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
// Pilarna drar i en osynlig punkt som står där den valda kulan står när han tar tag. Kulorna står alltid där lederna
// faktiskt är, också medan han drar: en armbåge kan bara stå på sin cirkel kring linjen axel–handled, och spärren håller
// emot, så kulan visar var leden följer och pilarna var musen är.
const dragpunkt = new T.Object3D(); scene.add(dragpunkt);

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
/** Ett sparande pågår: Spara är avstängd tills det är klart, så att två aldrig skriver samma fil samtidigt. */
let sparar = false;
/** Det armarnas mätning sade vid senaste Spara, om en underarm går genom bordets kant. */
let sparadVarning = '';
/** En inspelning som pågår: handtagen är dolda och Esc avbryter. */
let inspelning: {avbryt: boolean} | null = null;
const angraLista: string[] = [];
let nu: Frame = stallning(foljd, tak.grund(tid), sparad.andringar, blickKamera(), sparad.liv, undefined, tak);
/**
 * Kroppens gränser (kropp.ts; Jakob 2026-11-26 om en armbåge dragen in i bålen: "Sånna här rörelser ska ju bara inte
 * gå"): mätta på dockan när bordet har kommit. Det han drar i stannar vid kroppen, bordet och vad en led kan, och
 * `stoppNu` är vad som hölls emot i ställningen som visas.
 */
let granser: Granser | undefined, stoppNu: Stopp[] = [];
const nyId = () => Math.random().toString(36).slice(2, 9);
const visaKulor = () => !RUNDA && $<HTMLInputElement>('#kulor').checked; // rundan har inga handtag: den tar inga ändringar
/** Det rundan inte har, sagt som ett fel till ett verktyg som ändå ber om det. */
const inteIRundan = (vad: string) => { if (RUNDA) throw Error(`${vad} hör till en plats i taget och finns inte i hela rundan (öppna editorn utan runda i adressen).`); };

function stall() { const grundtid = tak.grund(tid), r = stallningOchStopp(foljd, grundtid, sparad.andringar, blickKamera(), sparad.liv, granser, tak); nu = r.frame; stoppNu = r.stopp; scen.pose(nu, foljd.hip); visaStopp(); }
/** En rad i bilden om vad som tog emot, i vanliga ord; borta när inget stoppas och under en inspelning. */
function visaStopp() { const box = $('#stopp'), text = inspelning ? '' : [...new Set(stoppNu.map(s => s.text))].join(' '); box.textContent = text; box.style.display = text ? 'block' : 'none'; }
/** Handtagen där mannens leder och blicken är nu (utom det som dras). */
function handtagTill() {
  // Blickens kula står BLICK meter framför ansiktet åt det håll han ser (blickpunkten själv kan ligga i kameran).
  const huvud = scen.bone('Head'), blick = new T.Vector3(...(nu.g as V3)).sub(new T.Vector3(...(nu.h as V3))).normalize().multiplyScalar(BLICK).add(huvud);
  const plats: Record<Led, T.Vector3> = {hogerHand: scen.bone('RightHand'), vansterHand: scen.bone('LeftHand'), hogerArmbage: scen.bone('RightForeArm'), vansterArmbage: scen.bone('LeftForeArm'), blick};
  // Blickens kula står mellan honom och kameran och skymmer bordet: den syns bara när Blicken är vald.
  for (const led of LEDER) { const m = handtag[led]; m.position.copy(plats[led]); m.visible = !inspelning && (led === 'blick' ? vald === 'blick' : visaKulor() || vald === led);
    m.material.opacity = vald === led ? 1 : 0.8; }
  if (vald && !drag) { dragpunkt.position.copy(handtag[vald].position); dragpunkt.quaternion.copy(ringen(vald)); }
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
/**
 * Slingan: i slutet står han stilla en stund vid skon, och sedan börjar rörelsen om i vilan och står en stund där, så
 * att omstarten syns som en omstart och inte som ett ryck i rörelsen (från skon till vilan flyttar sig handlederna 17–18
 * cm och kortet 52 cm). Sekunder på klockan, vilken fart uppspelningen än har.
 */
const SLINGA = {slut: 0.8, borjan: 0.4};
let förra = 0, stillaKvar = 0, omstart = false;
function steg(now: number) {
  if (spelar) { const dt = Math.min(0.1, (now - förra) / 1000);
    if (stillaKvar > 0) { stillaKvar -= dt; if (stillaKvar <= 0 && omstart) { omstart = false; stillaKvar = SLINGA.borjan; setTime(0); } }
    else { const t = tid + dt * fart; if (t < DUR) setTime(t); else { setTime(DUR); if (slinga) { stillaKvar = SLINGA.slut; omstart = true; } else spela(false); } } }
  förra = now; requestAnimationFrame(steg);
}
function spela(på: boolean) { spelar = på; stillaKvar = 0; omstart = false; $('#spela').textContent = på ? '❚❚ Paus' : '▶ Spela'; if (på && tid >= DUR - 1e-6) tid = 0; }

// ---- kamerorna ---------------------------------------------------------------------------------------------------
function setKamera(k: Kamera) {
  kamera = k;
  if (k !== 'fri') { scen.setKamera(k); const dir = new T.Vector3(); camera.getWorldDirection(dir); orbit.target.copy(camera.position).addScaledVector(dir, k === 'topp' ? 2.1 : k === 'sida' ? camera.position.distanceTo(new T.Vector3(...kameraVy('sida', plan).mot)) : 1.95); orbit.update(); }
  document.querySelectorAll<HTMLButtonElement>('#kameror button').forEach(b => b.classList.toggle('vald', b.dataset.kamera === k)); ram(); rita();
}
/** Spelets bild som en ram i fönstret, när kameran är en plats vid bordet (plats 4 är spelets egen). */
function ram() { const r = scen.filmRam(), box = $('#ram'), plats = kameransPlats(kamera); box.style.display = plats && !inspelning ? 'block' : 'none'; Object.assign(box.style, {left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'});
  if (plats) box.firstElementChild!.textContent = plats === 4 ? 'Spelets bild (plats 4)' : `Bilden från plats ${plats}`; }
/**
 * Kameran nära en hand eller kortet som de står nu, för den som granskar fingrarna: den fria kameran `fran` meter från
 * handens mitt (förvalet snett uppifrån spelarnas sida), riktad mot den.
 */
type Nara = 'hogerHand' | 'vansterHand' | 'kort';
function nara(vad: Nara, fran: V3 = [0, 0.2, 0.36]) {
  const v = (p: number[]) => new T.Vector3(p[0], p[1], p[2]), hand = vad === 'kort' ? null : nu[vad === 'hogerHand' ? 'R' : 'L'], mal = hand ? v(hand.w).add(v(hand.p[9])).multiplyScalar(0.5) : v(nu.card.c);
  scen.setKamera('spel'); // spelets bildvinkel, inte den förra kamerans (sidans eller uppifrån)
  kamera = 'fri'; camera.position.copy(mal).add(v(fran)); camera.up.set(0, 1, 0); camera.lookAt(mal); orbit.target.copy(mal); orbit.update(); scen.storlek();
  document.querySelectorAll<HTMLButtonElement>('#kameror button').forEach(b => b.classList.toggle('vald', b.dataset.kamera === 'fri')); ram(); rita();
}
orbit.addEventListener('start', () => { if (kamera !== 'fri') { kamera = 'fri'; document.querySelectorAll<HTMLButtonElement>('#kameror button').forEach(b => b.classList.toggle('vald', b.dataset.kamera === 'fri')); ram(); } });
orbit.addEventListener('change', rita);

// ---- ändringarna ----------------------------------------------------------------------------------------------
const spara = () => { angraLista.push(ogonblick()); if (angraLista.length > 200) angraLista.shift(); };
/** Skiljer sig ändringarna eller farten från den sparade filen? */
const olikt = () => ogonblick() !== sparatLage;
function ändrat() { osparat = olikt(); stall(); handtagTill(); visaLista(); visaStatus(); visaVarar(); visaTid(); rita(); }
/** Takten räknas om efter en ny fart; tidslinjen står kvar i samma ögonblick av rörelsen. */
function nyTakt() { const grundtid = tak.grund(tid); tak = taktNu(); DUR = tak.langd; tid = tak.ut(grundtid); visaDelar(); }
function tillOgonblick(text: string) { const [andringar, fart, liv] = JSON.parse(text) as [Andring[], number[] | null, Liv | null]; sparad.andringar = andringar; sparad.fart = fart ?? undefined; sparad.liv = liv ?? undefined; nyTakt(); visaLiv(); }
/** De små egna rörelserna (rorelse.ts medLiv): vilka som är på, och slumpens frö; ett nytt frö lägger dem på andra ställen. */
function visaLiv() { document.querySelectorAll<HTMLInputElement>('#liv input').forEach(c => { c.checked = !!sparad.liv?.delar.includes(c.dataset.liv as Livsdel); }); $<HTMLButtonElement>('#liv-slumpa').disabled = !sparad.liv?.delar.length; }
function sattLiv(delar: readonly Livsdel[], fro = sparad.liv?.fro ?? Math.floor(Math.random() * 1e9)) { inteIRundan('Små egna rörelser'); spara(); sparad.liv = delar.length ? {fro, delar: LIVSDELAR.filter(d => delar.includes(d))} : undefined; visaLiv(); ändrat(); }
/** Farten för en del: 1 är grundrörelsens, 1,5 en och en halv gång så fort (Jakob 2026-11-26). */
function sattFart(del: number, ganger: number) {
  inteIRundan('Farten per del'); if (!foljd.delar[del] || !(ganger > 0)) return; const fart = [...tak.fart]; fart[del] = Math.max(FART.minst, Math.min(FART.mest, Math.round(ganger * 1000) / 1000));
  if (fart[del] === tak.fart[del]) { visaDelar(); return; } spara(); sparad.fart = fart; nyTakt(); ändrat();
}
// Återställningen (Jakob 2026-11-26: "en resetknapp så att vi kan återgå till rörelserna som finns"). Båda går att ångra,
// och inget skrivs till filen förrän han trycker Spara; grundrörelserna kan editorn aldrig ändra.
/** Det som inte är sparat kastas: ändringarna och farten blir som de ligger i den sparade filen. */
function tillSparat() { if (!olikt()) return; spara(); tillOgonblick(sparatLage); välj(null); ändrat(); }
/** Alla ändringar tas bort och farten blir grundrörelsens: kvar är grundrörelsen som den är. */
const ärGrund = () => !sparad.andringar.length && tak.forval && !sparad.liv?.delar.length;
function tillGrund() { if (ärGrund()) return; spara(); sparad.andringar = []; sparad.fart = undefined; sparad.liv = undefined; nyTakt(); visaLiv(); välj(null); ändrat(); }
/**
 * Ändringen för en led som gäller just nu: den närmaste av ledens ändringar inom NARA sekunder (filmens) från där
 * tidslinjen står, om det finns en. Ett drag där ändrar den i stället för att lägga en ny, nästan ovanpå (efter ett drag i
 * tidslinjen står den sällan på exakt samma ruta).
 */
const NARA = 0.1;
const härNu = (led: Led) => { let bast: Andring | null = null, avst = NARA; for (const a of sparad.andringar) { const d = Math.abs(tak.ut(a.tid) - tid); if (a.led === led && d < avst) { avst = d; bast = a; } } return bast; };
function ångra() { const förra = angraLista.pop(); if (förra === undefined) return; tillOgonblick(förra); ändrat(); }
function taBort(id: string) { spara(); sparad.andringar = sparad.andringar.filter(a => a.id !== id); ändrat(); }
/** En ändring där tidslinjen står, eller vid filmens tid `a.tid`; den sparas i grundrörelsens tid. */
function läggTill(a: Partial<Andring> & {led: Led}): string {
  inteIRundan('Ändringar'); if (!LEDER.includes(a.led)) throw Error(`Ingen led ${a.led}.`);
  spara(); const ny: Andring = {id: nyId(), tid: tak.grund(a.tid ?? tid), led: a.led, flytt: (a.flytt ?? [0, 0, 0]) as V3, vrid: a.vrid ?? null, varar: a.varar ?? varar}; sparad.andringar.push(ny); ändrat(); return ny.id;
}

// skala: blickens kula står närmare än blickpunkten, så dess förflyttning förstoras till blickpunktens avstånd, och
// delas med ändringens vikt där tidslinjen står (en ändring strax bredvid verkar lite mindre här än vid sin egen tid).
let drag: {led: Led; a: Andring; start: T.Vector3; startQ: T.Quaternion; flytt0: V3; vrid0: Q | null; ny: boolean; skala: number} | null = null;
flytta.addEventListener('dragging-changed', e => { orbit.enabled = !e.value; });
flytta.addEventListener('mouseDown', () => {
  if (!vald) return; spela(false); spara(); let a = härNu(vald), ny = false; // ett drag görs i den ruta som syns
  if (!a) { a = {id: nyId(), tid: tak.grund(tid), led: vald, flytt: [0, 0, 0], vrid: null, varar}; sparad.andringar.push(a); ny = true; }
  const m = dragpunkt; if (lage === 'vrida') m.quaternion.copy(ringen(vald));
  const skala = (vald === 'blick' ? Math.hypot(nu.g[0] - nu.h[0], nu.g[1] - nu.h[1], nu.g[2] - nu.h[2]) / BLICK : 1) / Math.max(0.2, vikt(a, tak.grund(tid), tak.ut));
  drag = {led: vald, a, start: m.position.clone(), startQ: m.quaternion.clone(), flytt0: [...a.flytt] as V3, vrid0: a.vrid ? [...a.vrid] as Q : null, ny, skala};
});
flytta.addEventListener('objectChange', () => {
  if (!drag) return; const m = dragpunkt;
  if (lage === 'flytta') { const d = m.position.clone().sub(drag.start).multiplyScalar(drag.skala); drag.a.flytt = [drag.flytt0[0] + d.x, drag.flytt0[1] + d.y, drag.flytt0[2] + d.z]; }
  else { const q = m.quaternion.clone().multiply(drag.startQ.clone().invert()); if (drag.vrid0) q.multiply(new T.Quaternion(...drag.vrid0)); drag.a.vrid = [q.x, q.y, q.z, q.w]; }
  stall(); handtagTill(); rita();
});
flytta.addEventListener('mouseUp', () => {
  if (!drag) return; const a = drag.a, rörd = Math.hypot(...a.flytt.map((n, i) => n - drag!.flytt0[i])) > 1e-5 || JSON.stringify(a.vrid) !== JSON.stringify(drag.vrid0);
  if (!rörd) { if (drag.ny) sparad.andringar = sparad.andringar.filter(x => x !== a); angraLista.pop(); drag = null; handtagTill(); rita(); return; }
  slapp(a); drag = null; ändrat();
});
/**
 * Som när han släpper musen: ändringen blir det som faktiskt blev (där spärren höll emot, och en armbåge alltid: den
 * läggs på sin cirkel), så att nästa drag börjar där armen står, och en ändring som inte syns tas bort: en armbåge som
 * flyttar sig mindre än 1 mm (dragen längs armen, som kroppen inte läser), eller en ändring tillbaka där den började.
 * Sant om ändringen står kvar.
 */
function slapp(a: Andring): boolean {
  const blev = granser ? somDenBlev(foljd, a, sparad.andringar, blickKamera(), sparad.liv, granser, tak) : null; if (blev) { a.flytt = blev.flytt; a.vrid = blev.vrid; }
  const armbage = a.led === 'hogerArmbage' || a.led === 'vansterArmbage', vriden = !!a.vrid && Math.abs(a.vrid[3]) <= 0.999999;
  const syns = vriden || Math.hypot(...a.flytt) >= (armbage && blev ? 0.001 : 1e-6);
  if (!syns) sparad.andringar = sparad.andringar.filter(x => x !== a);
  return syns;
}
/**
 * Ringarna som vrider en hand (läget Vrida): x längs underarmen som kroppen står (från armbågen till handleden), y ut ur
 * handflatan, z tvärs handen, så att den ena ringen vrider handen kring underarmen och de andra kring handleden. (Förut
 * stod ringarna efter rummets axlar.) I läget Flytta, och för armbågarna och blicken, rummets axlar.
 */
function ringen(led: Led): T.Quaternion {
  if (lage !== 'vrida' || (led !== 'hogerHand' && led !== 'vansterHand')) return new T.Quaternion();
  const s = led === 'hogerHand' ? 'R' : 'L', ben = s === 'R' ? 'Right' : 'Left', p = nu[s].p, v = (q: number[]) => new T.Vector3(q[0], q[1], q[2]);
  const x = scen.bone(`${ben}Hand`).sub(scen.bone(`${ben}ForeArm`)).normalize();
  const palm = new T.Vector3().crossVectors(v(p[5]).sub(v(p[0])), v(p[17]).sub(v(p[0]))).multiplyScalar(s === 'R' ? 1 : -1), y = palm.sub(x.clone().multiplyScalar(palm.dot(x)));
  if (y.lengthSq() < 1e-10) return new T.Quaternion();
  y.normalize(); return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, new T.Vector3().crossVectors(x, y)));
}

function välj(led: Led | null) {
  if (led) spela(false); // en kula väljs i den ruta som syns: bilden står still medan han drar
  vald = led; if (led !== 'hogerHand' && led !== 'vansterHand' && lage === 'vrida') sättLäge('flytta');
  if (led) { dragpunkt.position.copy(handtag[led].position); dragpunkt.quaternion.copy(ringen(led)); flytta.attach(dragpunkt); flytta.setMode(lage === 'vrida' ? 'rotate' : 'translate'); } else flytta.detach();
  document.querySelectorAll<HTMLButtonElement>('#leder button').forEach(b => b.classList.toggle('vald', b.dataset.led === led));
  $<HTMLButtonElement>('[data-lage=vrida]').disabled = !(led === 'hogerHand' || led === 'vansterHand');
  handtagTill(); visaVarar(); visaLista(); rita();
}
function sättLäge(l: 'flytta' | 'vrida') { lage = l; flytta.setMode(l === 'vrida' ? 'rotate' : 'translate'); flytta.setSpace(l === 'vrida' ? 'local' : 'world'); dragpunkt.quaternion.copy(vald ? ringen(vald) : new T.Quaternion());
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
window.addEventListener('pointerup', e => { if (!drag && !inspelning) orbit.enabled = true; if (!ner.på && Math.hypot(e.clientX - ner.x, e.clientY - ner.y) < 4 && e.target === canvas && vald) välj(null); ner.på = false; });

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
  const alla = [...sparad.andringar].sort((a, b) => a.tid - b.tid || a.led.localeCompare(b.led)), valdNu = vald ? härNu(vald) : null;
  if (!alla.length) { const li = document.createElement('li'); li.className = 'tom'; li.textContent = 'Inga ändringar ännu.'; ul.append(li); }
  for (const a of alla) {
    const li = document.createElement('li'), text = document.createElement('span'), cm = Math.round(Math.hypot(...a.flytt) * 1000) / 10, grader = a.vrid ? Math.round(2 * Math.acos(Math.min(1, Math.abs(a.vrid[3]))) * 180 / Math.PI) : 0;
    text.textContent = `${sek(tak.ut(a.tid))} · ${LEDNAMN[a.led]} · ${[cm ? `${String(cm).replace('.', ',')} cm` : '', grader ? `vriden ${grader}°` : ''].filter(Boolean).join(', ') || 'ingen skillnad'}`;
    const bort = document.createElement('button'); bort.textContent = 'Ta bort'; bort.title = 'Ta bort ändringen'; bort.onclick = e => { e.stopPropagation(); taBort(a.id); };
    li.onclick = () => { setTime(tak.ut(a.tid)); välj(a.led); };
    li.classList.toggle('har', a === valdNu); li.append(text, bort); ul.append(li);
  }
  $<HTMLButtonElement>('#angra').disabled = !angraLista.length;
  const linje = $('#tidslinje'); linje.querySelectorAll('.prick').forEach(p => p.remove());
  for (const a of alla) { const p = document.createElement('div'), t = tak.ut(a.tid); p.className = 'prick'; p.style.left = `${t / DUR * 100}%`; p.title = `${LEDNAMN[a.led]}, ${sek(t)}`; linje.append(p); }
}
/** Varför det som ligger sparat inte används ('' när det används eller inget finns), i vanliga ord. */
const oanvant = () => sparadKl ? '' : aldreSparat ? 'Det som är sparat för den här platsen hör till en äldre rörelse och används inte'
  : lagretFel.length ? `Det som är sparat för den här platsen har fel och används inte (${lagretFel.slice(0, 2).join('; ')}${lagretFel.length > 2 ? ` och ${lagretFel.length - 2} till` : ''})` : '';
/** Hela rundan: sagt i statusraden när tagningen inte är ren att klippa (en stillhet som inte är exakt, ett hopp i en skarv); tomt annars. */
let rundvarning = '';
function visaStatus() { const s = $('#status'), omAldre = oanvant();
  // Hela rundan: vad den är, i stället för en plats sparade läge; den sparas inte.
  if (RUNDA) { s.className = rundvarning ? 'osparat' : ''; $<HTMLButtonElement>('#spara').disabled = true; const vanster = RUNDGIVAR.filter(g => g.rorelse.marke?.hander === 'vanster').map(g => g.plats);
    s.textContent = `Hela rundan: vilan till skon och sedan första kortet till plats ${RUNDANS_PLATSER.join(', ')}, ${STILLA ? `med ${sek(STILLHET.efter + STILLHET.fore)} stilla vid skon efter varje kort, där filmen sedan klipps (tagningen som ska bli film)` : 'i ett svep, som klippen spelas efter varandra'}.${vanster.length ? ` Plats ${vanster.join(' och ')} ges med vänsterhanden ensam, de andra med handbyte.` : ''} Här ändras och sparas inget: det görs på en plats i taget.${rundvarning}`; return; }
  // Spelar platsen ännu de äldre rörelserna (ingen egen giv för dockan där än), sägs det först.
  const lanad = PROV || EGEN.egen ? '' : `Plats ${PLATS} spelar ännu den äldre rörelsen, ritad för en annan kropp än ${DOCKA === 'kvinna' ? 'kvinnans' : 'mannens'}. `;
  s.className = osparat ? 'osparat' : sparadKl ? 'bra' : '';
  // (givens märke först: vänsterhanden ensam eller handbyte, och vilken version; Jakob 2026-11-26: "det måste markeras")
  s.textContent = markeText(andra, PLATS) + lanad + (PROV ? `På prov: ${GRUND.join(' och ')}. Sparas inte.` : sparar ? 'Sparar …' : osparat ? `Ändrat – inte sparat ännu.${omAldre ? ` ${omAldre}; Spara skriver över det.` : ''}` : sparadKl ? `Sparat kl. ${sparadKl}.${sparadVarning}` : omAldre ? `${omAldre}. Det står kvar tills du trycker Spara.` : sparadFil ? 'Allt är sparat.' : 'Inget sparat ännu.');
  if ((sparadVarning && !osparat) || omAldre) s.className = 'osparat';
  $<HTMLButtonElement>('#spara').disabled = PROV || sparar;
  $<HTMLButtonElement>('#till-sparat').disabled = !osparat; $<HTMLButtonElement>('#till-grund').disabled = ärGrund(); }

/** Vad som kan spelas in: hela rörelsen, en del, eller given (kortet ut och handen tillbaka i samma film). Värdet är första och sista delen. */
const OMFANG = (): {varde: string; text: string; namn: string}[] => { const d = tak.delar, sist = d.length - 1, l = (a: number, b: number) => sek(d[b].till - d[a].fran);
  const slug = (s: string) => s.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-');
  // Hela rundan: allt i en film (utan del i filmens namn), eller ett klipp för sig, med klippets namn (a23-p7c1-a23).
  if (foljd.runda) { const k = foljd.runda.klipp; return [{varde: `0-${sist}`, text: `Hela rundan (${l(0, sist)})`, namn: ''}, ...d.map((x, i) => ({varde: `${i}-${i}`, text: `Bara ${x.namn.toLowerCase()} (${l(i, i)})`, namn: k[i].namn.toLowerCase().replace(/\./g, '').replace(/>/g, '-')}))]; }
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
    längd.dataset.del = String(i);
    // Hela rundan: takten är fast, och raden säger klippets rutor i tagningen.
    if (foljd.runda) { const k = foljd.runda.klipp[i]; längd.disabled = true; längd.title = 'Rundans takt är fast. Farten ändras på en plats i taget.';
      li.title = `${i ? markeText(RUNDGIVAR[i - 1].rorelse, RUNDGIVAR[i - 1].plats) : ''}Klippet ${k.namn}: ruta ${k.forsta}–${k.sista}.${k.kortetLigger === null ? '' : ` Kortet ligger från ruta ${k.kortetLigger}.`} Han står stilla vid skon från ruta ${k.stillaFran}.`; }
    s.textContent = Math.abs(fart - 1) < 0.005 ? 's' : `s · ${Math.round(fart * 100)} %`; s.classList.toggle('andrad', !tak.forval);
    // Ett tomt fält, 0 eller ett tal utanför det delen kan ta sägs vid fältet; tomt och 0 ändrar ingenting.
    längd.onclick = e => e.stopPropagation(); längd.oninput = () => längd.setCustomValidity('');
    längd.onchange = () => { const sekunder = Number(längd.value), [lo, hi] = [grundlängd / FART.mest, grundlängd / FART.minst];
      if (!(sekunder > 0)) { visaDelar(); sagVidDel(i, `Skriv hur många sekunder delen ska ta, ett tal större än 0 (${sek(lo)} till ${sek(hi)}). Inget ändrades.`); return; }
      sattFart(i, grundlängd / sekunder); if (sekunder < lo - 1e-6 || sekunder > hi + 1e-6) sagVidDel(i, `Delen kan ta ${sek(lo)} till ${sek(hi)}; den tar nu ${sek(tak.delar[i].till - tak.delar[i].fran)}.`); };
    li.append(nr, namn, längd, s); li.onclick = () => { spela(false); setTime(tak.delar[i].fran); }; ul.append(li); });
  const linje = $('#tidslinje'), spets = linje.querySelector('.spets'); linje.querySelectorAll('.del').forEach(x => x.remove());
  for (const d of tak.delar) { const del = document.createElement('div'); del.className = 'del'; del.textContent = d.namn; del.style.left = `${d.fran / DUR * 100}%`; del.style.width = `calc(${(d.till - d.fran) / DUR * 100}% - 2px)`; linje.insertBefore(del, spets); }
  const val = $<HTMLSelectElement>('#inspela-del'), förr = val.value; val.replaceChildren(...OMFANG().map(o => { const x = document.createElement('option'); x.value = o.varde; x.textContent = o.text; return x; })); if (OMFANG().some(o => o.varde === förr)) val.value = förr;
}
/** Ett besked vid en dels längd i panelen (webbläsarens egen ruta vid fältet). */
function sagVidDel(i: number, text: string) { const f = document.querySelector<HTMLInputElement>(`#delar input[data-del="${i}"]`); if (!f) return; f.setCustomValidity(text); f.reportValidity(); }
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
$('#angra').onclick = () => { if (!drag) ångra(); };
$('#spara').onclick = () => { void sparaFiler(); };
$('#till-sparat').onclick = tillSparat;
$('#till-grund').onclick = tillGrund;
document.querySelectorAll<HTMLInputElement>('#liv input').forEach(c => { c.onchange = () => sattLiv([...document.querySelectorAll<HTMLInputElement>('#liv input')].filter(x => x.checked).map(x => x.dataset.liv as Livsdel)); });
$('#liv-slumpa').onclick = () => sattLiv(sparad.liv?.delar ?? [], Math.floor(Math.random() * 1e9));
// Vilken plats kortet ges till: varje plats är en egen rörelse med egna sparade ändringar, så sidan laddas om med den.
document.querySelectorAll<HTMLButtonElement>('#malplatser button[data-plats]').forEach(b => { const plats = Number(b.dataset.plats); b.classList.toggle('vald', !RUNDA && plats === PLATS);
  b.onclick = () => { if (RUNDA || plats !== PLATS) location.search = medVal({plats: String(plats), runda: ''}); }; });
// Hela rundan i en tagning (?runda=1): ett eget val under platserna.
{ const b = document.querySelector<HTMLButtonElement>('#hela-rundan'); if (b) { b.classList.toggle('vald', RUNDA); b.onclick = () => { if (!RUNDA) location.search = medVal({runda: '1'}); }; } }
// Vilken docka som visas: samma rörelse och samma sparade ändringar, på den andra kroppen.
document.querySelectorAll<HTMLButtonElement>('#dockor button').forEach(b => { const docka = b.dataset.docka as Docka; b.classList.toggle('vald', docka === DOCKA);
  b.onclick = () => { if (docka !== DOCKA) location.search = medVal({docka}); }; });
{ const valt = (): [number, number] => { const [a, b] = $<HTMLSelectElement>('#inspela-del').value.split('-').map(Number); return [a, b]; }, fel = (e: unknown) => visaFel(String((e as Error).message ?? e));
  $('#inspela-en').onclick = () => { void spelaIn([kamera], ...valt()).catch(fel); };
  $('#inspela-alla').onclick = () => { void spelaIn(PLATSER.map(platskamera), ...valt()).catch(fel); }; }
window.addEventListener('keydown', e => {
  if (inspelning) { if (e.key === 'Escape') inspelning.avbryt = true; e.preventDefault(); return; }
  const iText = (e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'checkbox';
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (!drag) ångra(); return; } // mitt i ett drag ångras inget: draget är inte klart
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!RUNDA) void sparaFiler(); return; }
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
/** En fråga under Spara, med ett val per knapp; borta när han väljer (eller när en ny fråga kommer). */
function fraga(text: string, val: [string, () => void][]) {
  let box = document.querySelector<HTMLElement>('#fraga'); if (!box) { box = document.createElement('div'); box.id = 'fraga'; box.style.marginTop = '6px'; $('#status').after(box); }
  const p = document.createElement('p'), knappar = document.createElement('div'); p.className = 'tips'; p.style.color = 'var(--warn)'; p.textContent = text; knappar.className = 'knappar';
  for (const [namn, gor] of val) { const b = document.createElement('button'); b.textContent = namn; b.onclick = () => { box!.remove(); gor(); }; knappar.append(b); }
  box.replaceChildren(p, knappar);
}
/** Lika som lager (samma JSON), oavsett radbrytningar. */
const sammaText = (a: string, b: string) => { try { return JSON.stringify(a ? JSON.parse(a) : null) === JSON.stringify(b ? JSON.parse(b) : null); } catch { return a === b; } };
/**
 * Spara. Före skrivningen ses efter om filen har ändrats sedan sidan laddades (en annan flik, en agent) och om det som
 * ligger där inte används (äldre rörelse, fel): då frågas han i vanliga ord, med valet att ladda om sidan eller skriva
 * över, och inget skrivs förrän han väljer. `skrivOver` hoppar över frågan. Ett sparande i taget.
 */
async function sparaFiler(skrivOver = false): Promise<{sparat: boolean; varfor?: string; svar?: unknown}> {
  if (PROV) throw Error('En grundrörelse på prov sparas inte: öppna editorn utan giv och vilan i adressen.');
  if (RUNDA) throw Error('Hela rundan sparas inte: ändringar görs och sparas på en plats i taget.');
  if (sparar) return {sparat: false, varfor: 'Ett sparande pågår redan.'};
  const fil: Sparad = {namn: sparad.namn, om: sparad.om, grund: GRUND, blickMot: blickMot(), ...(tak.forval ? {} : {fart: tak.fart}), ...(sparad.liv ? {liv: sparad.liv} : {}), andringar: [...sparad.andringar].sort((a, b) => a.tid - b.tid || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)), sparad: new Date().toISOString()};
  const fel = lagretsFel(fil, langd(foljd), foljd.delar.length); if (fel.length) throw Error(`Det här lagret har fel och sparas inte: ${fel.join('; ')}.`);
  const put = async (url: string, data: unknown) => { const r = await fetch(url, {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify(data, null, 1)}); if (!r.ok) throw Error(`Kunde inte spara (${r.status}: ${(await r.text()).slice(0, 200)}).`); return r.json(); };
  sparar = true; document.querySelector('#fraga')?.remove(); visaStatus();
  try {
    if (!skrivOver) {
      const nuText = await lasSparat(), andrad = !sammaText(nuText, kandText), inteAnvant = oanvant();
      const varfor = andrad ? 'Det sparade för den här platsen har ändrats sedan sidan laddades (i en annan flik eller av en agent). Spara skriver över det med det du ser här.'
        : inteAnvant ? `${inteAnvant}. Spara skriver över det med det du ser här.` : '';
      if (varfor) { fraga(varfor, [['Ladda om sidan', () => { osparat = false; location.reload(); }], ['Spara ändå', () => { void sparaFiler(true); }], ['Låt bli', () => {}]]); return {sparat: false, varfor}; }
    }
    // Armarna mäts på den färdiga rörelsen, med hans ändringar i: regeln rättar bara grundrörelsen, och en hand han har
    // dragit i kan föra underarmen ned i kanten igen. Måtten sparas med rutorna, och han får veta om en arm går igenom.
    const rattning = `armbågarna vridna ut och upp av editorns regel (standarddocka/editor/armar.ts, minst ${ARMAR.luft * 100} cm luft i grundrörelsen), ändringarna hållna inom kroppen, bordet och lederna (standarddocka/editor/kropp.ts); luften på den färdiga rörelsen står i fältet armar`;
    const data = rutor(foljd, fil, blickKamera(), rattning, tak, granser), armarNu = matArmar(data.frames as unknown as Frame[], foljd.hip, scen, bord), genom = armarNu.R.genomRutor + armarNu.L.genomRutor; stall();
    // Kroppens mått och bordet följer med rutorna, så att verktyg/mat.ts räknar det sparade genom samma spärr som här.
    const svar = [await put(SPARAS, fil), await put(RUTOR, {...data, armar: armarNu, granser})];
    kandText = JSON.stringify(fil);
    sparadVarning = genom ? ` Obs: en underarm går genom bordets kant i ${genom} rutor (höger ${armarNu.R.genomRutor}, vänster ${armarNu.L.genomRutor}).` : '';
    sparatLage = ogonblick(); osparat = false; sparadKl = new Date().toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'}); return {sparat: true, svar};
  } finally { sparar = false; visaStatus(); }
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
  // I rundan är det klippens egna rutor (ett klipp slutar på sin stillhets sista ruta, rutan före nästa klipps första).
  const [fran, till] = foljd.runda ? [foljd.runda.klipp[forst].forsta, foljd.runda.klipp[sist].sista] : [Math.round(a.fran * foljd.fps), Math.round(b.till * foljd.fps)], antal = (till - fran + 1) * kameror.length;
  const delnamn = OMFANG().find(o => o.varde === `${forst}-${sist}`)?.namn ?? `del-${forst + 1}-${sist + 1}`;
  const före = {tid, kamera, pos: camera.position.clone(), kvat: camera.quaternion.clone(), mot: orbit.target.clone()}, klara: Klipp[] = [], text = $('#laddar'), status = $('#inspela-status');
  const post = async <X>(url: string, body: BodyInit | null): Promise<X> => { const r = await fetch(url, {method: 'POST', body}); if (!r.ok) throw Error(`Inspelningen stannade: ${(await r.text()).slice(0, 300)}`); return r.json() as Promise<X>; };
  // Klippets namn: rörelsen (på prov: grundrörelsernas namn), delen, kameran och dockan, så att mannens och kvinnans
  // klipp inte skriver över varandra. Hela rundan heter runda-c1 och har ingen del i namnet.
  const rorelse = RUNDA ? (STILLA ? 'runda-c1' : 'runda-c1-flyt') : PROV ? `prov-${PROVVILA ? `${PROVVILA}-` : ''}${GRUND[1]}` : `a1-a23-p${PLATS}c1`, stam = delnamn ? `${rorelse}-${delnamn}` : rorelse;
  // Panelen, tidslinjen, kameran och pilarna står still under inspelningen: inget han rör ändrar klippet medan det görs.
  const stang = (pa: boolean) => { for (const s of ['#panel', '#botten']) document.querySelector<HTMLElement>(s)!.inert = pa; orbit.enabled = !pa; flytta.enabled = !pa; };
  const lås = blickKamera(); blickLas = [lås[0], lås[1], lås[2]]; inspelning = {avbryt: false}; välj(null); stang(true); handtagTill(); ram(); text.style.display = 'grid'; status.className = 'tips'; status.textContent = '';
  let id: string | null = null, gjorda = 0;
  try {
    scen.filmstorlek(true);
    for (const k of kameror) {
      if (k !== 'fri') scen.setKamera(k);
      id = (await post<{id: string}>('/inspelning/start', JSON.stringify({namn: `${stam}-${KAMERANAMN(k)}-${DOCKA}${UTSEENDE === 'nyckel' ? '-nyckel' : ''}`, fps: foljd.fps}))).id;
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
    const avbruten = inspelning.avbryt; inspelning = null; blickLas = null; stang(false); scen.filmstorlek(false); text.style.display = 'none';
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
// Hela rundan: det som hör till en plats i taget (ändringarna, de små rörelserna, Spara och Återställ) visas inte, och
// raden under delarna säger vad en del är här.
document.querySelectorAll<HTMLElement>('.bara-runda').forEach(x => { x.style.display = RUNDA ? '' : 'none'; });
{ const ruta = document.querySelector<HTMLInputElement>('#stillhet'); if (ruta) { ruta.checked = STILLA; ruta.onchange = () => { location.search = medVal({stillhet: ruta.checked ? '1' : ''}); }; } }
if (RUNDA) { document.querySelectorAll<HTMLElement>('.bara-plats').forEach(x => { x.style.display = 'none'; });
  const tips = document.querySelector('#delar-tips'); if (tips) tips.textContent = STILLA ? `Varje del är ett klipp: ${sek(STILLHET.fore)} stilla vid skon med tomt bord, rörelsen, och ${sek(STILLHET.efter)} stilla med kortet kvar på sin plats. Filmen klipps mellan två delar, där kortet försvinner från bordet. Takten är fast här.` : 'Varje del är ett klipp, och de spelas i ett svep. Kortet ligger kvar tills nästa del börjar; i spelet ritar spelet korten som ligger. Takten är fast här.'; }
const bord = await scen.bord;
// Armarna över bordskanten: grundrörelsen rättas en gång när bordet (och därmed dess kant) är på plats.
laddarText('armarna över bordskanten'); await new Promise(r => setTimeout(r, 0));
const armar = lyftArmar(foljd, scen, bord);
// Hela rundan ska gå att klippa: varje stillhet exakt och ingen skarv med hopp, också efter regeln ovan. Den jämnar ut sin
// vridning över tiden, så där en dockas rörelser behöver den nära ett ankare spiller den över stillheten och skarven.
// Det rättas inte här (det hör till grundrörelserna eller regeln); det sägs i statusraden och i klipplistan (matt.ren).
{ const m = rundansMatt(foljd), mm = (n: number) => String(n).replace('.', ',');
  if (STILLA && m && !m.ren) { rundvarning = ` Obs: den här tagningen är inte ren att klippa. Inom en stillhet rör sig dockan upp till ${mm(m.storstaSkillnad)} mm, och i en skarv hoppar den upp till ${mm(m.storstaHopp)} mm.${armar.rutorVridna ? ` Det kommer av regeln som lyfter armbågarna över bordets kant: den ändrade ${armar.rutorVridna} rutor, eftersom ${DOCKA === 'kvinna' ? 'kvinnans' : 'mannens'} rörelser annars går genom kanten.` : ''}`; visaStatus(); } }
// Kroppens mått för spärren, på den docka som visas, i vilan (rörelsens första ruta).
laddarText('kroppens mått');
granser = {matt: matKropp(scen, foljd.frames[0], foljd.hip), bord};
$('#laddar').style.display = 'none'; ritaNu(); requestAnimationFrame(steg);
console.log('Kortplatserna, planen mot bordets tryckta (mm):', JSON.stringify(bord));
console.log('Armarna över bordskanten, före och efter (minsta luft i mm):', JSON.stringify(armar));
console.log('Kroppens mått för spärren:', granser.matt);

Object.assign(api, {
  setTime: (t: number) => { spela(false); setTime(t); ritaNu(); },
  setKamera: (k: Kamera) => { setKamera(somKamera(k) ?? 'spel'); ritaNu(); },
  nara: (vad: Nara, fran?: V3) => { nara(vad, fran); ritaNu(); },
  addChange: (a: Partial<Andring> & {led: Led}) => { const id = läggTill(a); ritaNu(); return id; },
  // Som när han släpper musen efter ett drag (slapp ovan): ändringen som den blev, eller null om den inte syns och togs bort.
  slapp: (id: string) => { const a = sparad.andringar.find(x => x.id === id); if (!a) return null; spara(); const kvar = slapp(a); ändrat(); ritaNu(); return kvar ? a : null; },
  removeChange: (id: string) => { taBort(id); ritaNu(); },
  undo: () => { ångra(); ritaNu(); },
  // Som Spara; frågar sidan något (filen har ändrats, det sparade används inte) stannar det med frågan som fel, så att ett
  // verktyg aldrig skriver över i tysthet. save(true) skriver över.
  save: async (skrivOver = false) => { const r = await sparaFiler(skrivOver); document.querySelector('#fraga')?.remove(); if (!r.sparat) throw Error(r.varfor); return r.svar; },
  // Dockan, kortet och skon har ingen ruta i panelen: de döljs bara av ett verktyg, för bilden av bordet ensamt.
  visa: (vad: Visa | 'docka' | 'kort' | 'sko', på: boolean) => { if (vad === 'docka' || vad === 'kort' || vad === 'sko') scen.synlig(vad, på); else visaDel(vad, på); ritaNu(); },
  tillSparat: () => { tillSparat(); ritaNu(); },
  tillGrund: () => { tillGrund(); ritaNu(); },
  fart: (del: number, ganger: number) => { sattFart(del, ganger); ritaNu(); },
  liv: (delar: Livsdel[], fro?: number) => { sattLiv(delar, fro); ritaNu(); },
  spelaIn,
  // Var grundrörelsen själv, utan ändringar, går utanför kroppens gränser (rorelse.ts grundensBrott). Rättar ingenting.
  granskaGrund: () => granser ? grundensBrott(foljd, granser, tak.ut) : null,
  // Var en kula syns i fönstret (bildpunkter), så att kontrollen kan dra i den med musen.
  kula: (led: Led) => { const p = handtag[led].position.clone().project(camera), r = canvas.getBoundingClientRect(); return {x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height}; },
  state: () => {
    const p = (v: T.Vector3) => [v.x, v.y, v.z].map(n => Math.round(n * 10000) / 10000), hips = scen.bone('Hips'), mm = (n: number) => Math.round(n * 1000) / 1000;
    const grundtid = tak.grund(tid);
    // Hur långt modellens fingerleder ligger från rörelsens handpunkter (mm): knoge, mellanled och ytterled per finger,
    // tummen först. Punkterna är rörelsens (handen den är ritad för); lederna är dockans egna, så skillnaden är vad kroppen inte följer.
    const FINGRAR = [['Thumb', 1], ['Index', 5], ['Middle', 9], ['Ring', 13], ['Pinky', 17]] as const;
    const fingrar = Object.fromEntries((['R', 'L'] as const).map(s => [s, FINGRAR.map(([namn, start]) => [1, 2, 3].map(n => Math.round(scen.bone(`${s === 'R' ? 'Right' : 'Left'}Hand${namn}${n}`).distanceTo(new T.Vector3(...(nu[s].p[start + n - 1] as V3))) * 1000)))]));
    const handled = {R: Math.round(scen.bone('RightHand').distanceTo(new T.Vector3(...(nu.R.w as V3))) * 1000), L: Math.round(scen.bone('LeftHand').distanceTo(new T.Vector3(...(nu.L.w as V3))) * 1000)};
    const armbage = {R: Math.round(scen.bone('RightForeArm').distanceTo(new T.Vector3(...(nu.R.e as V3))) * 1000), L: Math.round(scen.bone('LeftForeArm').distanceTo(new T.Vector3(...(nu.L.e as V3))) * 1000)};
    const axel = {R: Math.round(scen.bone('RightArm').distanceTo(new T.Vector3(...(nu.R.s as V3))) * 1000), L: Math.round(scen.bone('LeftArm').distanceTo(new T.Vector3(...(nu.L.s as V3))) * 1000)};
    // Handleden som kroppen ritade den (figure-model.ts measure, grader, höger sedan vänster): hur långt handen står från
    // underarmen (wrist) och hur långt rutans hand bad om (wristAsked); lika när den ritade handen är rutans.
    // Underarmens vridning (grader, höger sedan vänster) och det som blev kvar åt handleden, och om dockan har vridben i underarmarna.
    const {wrist, wristAsked, twist, wristTwist} = scen.figure.measure();
    return {namn: NAMN, handledGrader: {ritad: wrist, begard: wristAsked}, vridning: {underarm: twist, handled: wristTwist, vridben: scen.figure.about.forearmTwistBones}, fingrarFranPunkternaMm: fingrar, handledFranPunktenMm: handled, armbageFranPunktenMm: armbage, axelFranPunktenMm: axel, plats: PLATS, grund: GRUND, tid, grundtid, langd: DUR, fart: tak.fart, forvaldTakt: tak.forval, kamera, kameraLage: p(camera.position), spelar, vald, osparat, andringar: sparad.andringar, delar: tak.delar, grunddelar: foljd.delar, skarv: foljd.skarv, platser: bord, stol: scen.stol, armar, synligt, fel,
      dockansEgna: EGEN.egen, sparasSom: NAMN, lagretsFel: lagretFel, bildvinkel: Math.round(camera.fov * 100) / 100, sparar, kortetsUtseende: scen.kortet(),
      // I läget Vrida: åt vilket håll ringarnas x (den som vrider handen kring underarmen) pekar i världen.
      lage, ringensX: lage === 'vrida' && vald ? p(new T.Vector3(1, 0, 0).applyQuaternion(dragpunkt.quaternion)) : null, axelLeder: {hoger: p(scen.bone('RightArm')), vanster: p(scen.bone('LeftArm'))},
      blick: {mot: blickMot(), foljerKortet: Math.round(blickenFoljer(foljd, grundtid, tak.spelad) * 100) / 100, tider: foljd.blick, punkt: nu.g},
      // Hela rundan (?runda=1): klipplistan, med skarvarna och stillheten mätta på rutorna som de spelas; annars null.
      runda: klipplista(foljd, DOCKA),
      hoft: {rorelsen: foljd.hip, mannen: p(hips), skillnadMm: Math.round(hips.distanceTo(new T.Vector3(...foljd.hip)) * 1000)},
      leder: {hogerHand: p(scen.bone('RightHand')), vansterHand: p(scen.bone('LeftHand')), hogerArmbage: p(scen.bone('RightForeArm')), vansterArmbage: p(scen.bone('LeftForeArm')), huvud: p(scen.bone('Head')), hogerLar: p(scen.bone('RightUpLeg')), hogerKna: p(scen.bone('RightLeg')), hogerFot: p(scen.bone('RightFoot'))},
      malHogerHand: nu.R.w, malVansterHand: nu.L.w, kort: nu.card.c, vikter: sparad.andringar.map(a => ({id: a.id, vikt: vikt(a, grundtid, tak.ut)})), aldreSparat: aldreSparat ? aldreSparat.grund ?? [] : null,
      // Vad spärren höll emot vid tiden som visas (led, vad som tog emot, hur mycket, och raden i bilden).
      sparr: {klar: !!granser, stopp: stoppNu, matt: granser && (({bal, huvud, armar: a}) => ({balensHojd: [bal.y0, bal.y0 + (bal.skivor.length - 1) * bal.dy].map(mm), skivor: bal.skivor.length, huvud: {c: huvud.c.map(mm), r: mm(huvud.r)},
        armar: Object.fromEntries((['R', 'L'] as const).map(s => [s, {axel: a[s].axel.map(mm), over: mm(a[s].over), under: mm(a[s].under), tjockUnder: a[s].tjockUnder.map(mm)}]))}))(granser.matt)}};
  },
});
api.ready = true;
