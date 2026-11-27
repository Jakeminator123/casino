// Editorn för dockorna: en docka vid standardens bord, vid livebordet Danilo eller Frasse i en rörelse lyft ur filmen, vid
// förra standardens bord mannen eller kvinnan i rörelsen A1 → A2.3 → kort 1 på en av de sju platserna och tillbaka; en
// tidslinje att spela och dra i, kameror (också från de sju platserna), handtag att dra i som blir ändringar ovanpå
// grundrörelserna, och inspelning av ett klipp. Ändringarna sparas genom editorns server i standarddocka/rorelser/
// (grundrörelserna ändras aldrig), klippen i standarddocka/klipp/.
//   Utan ord: livestandarden med Danilo (förvalet sedan 2026-11-27, se VAL nedan).
//   ?uppsattning=live|forra&docka=<en av standardens dockor>   standarden och dockan (dockval.ts): utan ?uppsattning väljer
//   dockan sitt bord, och en docka som inte sitter vid standarden ger standardens förvalda, med en rad i panelen
//   ?docka=man|kvinna&plats=<1–7>&t=<sekunder>&kamera=<spel|film|plats1…plats7|sida|topp|fri>[&kulor=0][&utseende=nyckel]
//   förra standardens bord med mannen eller kvinnan (förval där: given till plats 4, spelets vy, Blenders bord som det är);
//   ?uppsattning=forra räcker för mannen
//   ?giv=<namn>[&vilan=<namn>]   en grundrörelse på prov i stället för platsens (se PROV nedan)
//   [?uppsattning=live][&docka=danilo|frasse][&plats=<1–7>|&giv=<namn>]   livebordet med Danilo eller Frasse och deras
//   rörelser lyfta ur filmen, var och en spelad som den är (se LIVEBORD nedan); ?docka=danilo eller frasse räcker;
//   &sekvens=vantan-1,p7,p4,p2,vantan-2 (eller 1) flera efter varandra i en tagning, med korten kvar (se SEKVENS nedan)
//   ?runda=1   hela rundan: vilan till skon och sedan första kortet till alla sju platserna, plats 7 först, i ett svep
//   (se RUNDA nedan); med &stillhet=1 en exakt stillhet vid skon före och efter varje rörelse, som i tagningen som ska
//   bli film och klippas; den tar inga ändringar och sparas inte. Med &liv=1[&fro=<tal>] rundans små egna rörelser och
//   blinkning (se RUNDA nedan; &liv=andning,blinkning slår på bara de delarna)
// window.editor (för kontrollen och verktyget ../verktyg/titta.ts): ready, setTime(t), setKamera(k), nara(vad, från), state(), addChange({...}),
// slapp(id), removeChange(id), undo(), save(skrivÖver), kula(led), visa(vad, på), tillSparat(), tillGrund(), fart(del, gånger),
// liv(delar, frö), ansikte(former), uttryck(namn, styrka, när), uttrycksserie(namn, från, per),
// spelaIn(kameror, förstaDel, sistaDel, {namn, stilla, skyltar}), granskaGrund().
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import type {Plan} from '../../blackjack-dealer/dealer3d/src/world.ts';
import {UTTRYCK, UTTRYCKEN, lagUttryck, medUttryck, uttryckVid, uttrycksserie, type LagtUttryck, type Uttrycksnamn} from './rorelse.ts';
import {FART, GIVAR, LEDER, LEDNAMN, LIVSDELAR, RUNDANS_LIV, RUNDANS_PLATSER, STILLHET, VARAR, blickenFoljer, ensam, grundFor, sekvens, klipplista, lagretsFel, langd, markeText, vilanFor, grundensBrott, rundaAv, rundlivet, rutor, sattIhop, somDenBlev, stallning, stallningOchStopp, takt, taktFor, vikt, type Andring, type Ansikte, type Foljd, type Frame, type Led, type Liv, type Livsdel, type Motion, type Q, type Sparad, type Standarddocka, type V3} from './rorelse.ts';
import {byggScen, kameraVy, kameransPlats, platskamera, somKamera, type Docka, type Kamera, type Scen, type Uppsattning, type Utseende} from './scen.ts';
import {NAMN as VALETS_NAMN, UPPSATTNING as STANDARDER} from '../../blackjack-dealer/src/uppsattning.ts';
import {dockord, dockval, helaSekvensen, lyftPlats, rorelsensOrd} from './dockval.ts';
import {ARMAR, lyftArmar, matArmar, matKropp} from './armar.ts';
import type {Granser, Stopp} from './kropp.ts';

const query = new URLSearchParams(location.search);
const $ = <E extends HTMLElement>(sel: string) => document.querySelector(sel) as E;
const fel: string[] = [];
const visaFel = (text: string) => { fel.push(text); const box = $('#fel'); box.style.display = 'block'; box.textContent = 'Något gick fel: ' + fel.join('\n'); };
window.addEventListener('error', e => visaFel(String(e.message)));
window.addEventListener('unhandledrejection', e => visaFel(String((e.reason as Error)?.message ?? e.reason)));
/**
 * Standarden och dockan (dockval.ts; Jakob 2026-11-27: valet av standard är ett val, i studions meny): ?uppsattning=live|forra
 * (det äldre ordet standard läses som forra), annars dockans bord (?docka=man eller kvinna: förra standardens; danilo eller
 * frasse: livebordets), annars livebordet, förvalet sedan han gjorde det klonade bordet till den nya standarden. Vid en
 * standard visas bara dess dockor, och dockan byter aldrig bord. En docka som inte sitter vid standarden, eller ett okänt ord,
 * ger standardens förvalda docka och en rad i panelen (VAL.rad), aldrig ett fel.
 */
const VAL = dockval(query.get('uppsattning'), query.get('docka'));
const UPPSATTNING: Uppsattning = VAL.uppsattning, LIVEBORD = UPPSATTNING === 'live', STANDARD = STANDARDER[UPPSATTNING];
/** Dockan som visas. Den väljer också grundrörelserna: dockans egna där de finns (rorelse.ts EGNA), annars de äldre. Vid livebordet Danilo eller Frasse. */
const DOCKA = VAL.docka as Docka, ORD = dockord(DOCKA), Han = ORD.han.charAt(0).toUpperCase() + ORD.han.slice(1);
/** Raderna i panelen om ord i adressen som inte passar, och vad som visas i stället. */
const inteSa: string[] = VAL.rad ? [VAL.rad] : [];
/** Grundrörelserna som finns (editorns server listar blackjack-dealer/dealer3d/data): sidan vet vad den kan visa utan att pröva sig fram. */
const FINNS = new Set(await fetch('/blackjack-dealer/dealer3d/data/', {cache: 'no-store'}).then(r => r.ok ? r.json() as Promise<{rorelser: string[]}> : null).catch(() => null)
  .then(x => x?.rorelser ?? (visaFel('Editorns server är äldre än sidan och vet inte vilka rörelser som finns. Stäng editorns fönster och starta den igen.'), [])));
// En grundrörelse på prov (?giv=<namn> och ?vilan=<namn>, filer i blackjack-dealer/dealer3d/data): spelas i stället för
// platsens giv eller vilan till skon, utan det sparade lagret, och går inte att spara. För den som gör om en grundrörelse.
// Ett namn som inte är en grundrörelse som finns ger ett fel (felrutan, nedan) i stället för att platsens vanliga rörelse
// visas, så att ett verktyg aldrig mäter fel rörelse.
const provFel: string[] = [];
const prov = (vad: 'giv' | 'vilan') => { const namn = query.get(vad); if (namn === null || namn === '') return null;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(namn) || !FINNS.has(namn)) { provFel.push(`Det finns ingen grundrörelse som heter ${namn}: inget visas i stället för fel rörelse.`); return '-'; } return namn; };
/**
 * Livebordet (förvalet, eller ?uppsattning=live; scen.ts Uppsattning): det klonade bordet genom sin egen kamera, med Danilo
 * eller Frasse (?docka=danilo|frasse, förval Danilo). Deras rörelser är lyfta ur
 * filmen av de riktiga dealrarna (dealer3d/data/lyft-<docka>-*.json) och går var och en från vilan till vilan: en spelas
 * som den är (rorelse.ts ensam), i sin egen takt, utan vilan till skon framför och utan det sparade lagret, som en
 * grundrörelse på prov. ?plats=<1–7> väljer given dit (lyft-<docka>-p<plats>; har dockan ingen dit, den närmaste hon eller
 * han har, med en rad), ?giv=<namn> vilken som helst av dem. Inget sparas här.
 */
if (LIVEBORD && query.get('vilan')) inteSa.push(`Vid ${STANDARD.namn} går varje rörelse från vilan till vilan: en annan vila används inte här.`);
if (LIVEBORD && query.get('runda') === '1') inteSa.push(`Hela rundan finns bara vid ${STANDARDER.forra.namn}. Här visas en rörelse i taget.`);
const PROVGIV = prov('giv'), PROVVILA = LIVEBORD ? null : prov('vilan'), PROV = !!(PROVGIV || PROVVILA) || LIVEBORD;
/**
 * Hela rundan (?runda=1; rorelse.ts rundaAv): vilan till skon och sedan första kortet till alla sju platserna i en
 * tagning, i spelets ordning, med dockans egna rörelser som de är och en exakt stillhet vid skon efter varje. Den spelas
 * och spelas in som en rörelse med en del per klipp. Ändringar och takt hör till en plats i taget och finns inte här, och
 * inget sparas. Inte tillsammans med en grundrörelse på prov.
 */
const RUNDA = query.get('runda') === '1' && !PROV;
/** Rundan med stillheten vid skon (?stillhet=1): tagningen som ska bli film och klippas. Utan den går rundan i ett svep. */
const STILLA = RUNDA && query.get('stillhet') === '1';
/**
 * Rundans små egna rörelser och blinkning (?liv=1; rorelse.ts medRundliv): av tills Jakob har sett dem. ?liv=1 är alla
 * delarna (RUNDANS_LIV), ?liv=andning,blinkning bara de (för den som granskar en del för sig), och ?fro=<tal> slumpens
 * frö (förval 1): samma frö ger samma tagning.
 */
const rundlivUr = (text: string | null, fro: number): Liv | undefined => { const delar = !RUNDA || !text || text === '0' ? [] : text === '1' ? [...RUNDANS_LIV] : RUNDANS_LIV.filter(d => text.split(',').includes(d)); return delar.length ? {fro: Math.round(fro) || 1, delar} : undefined; };
/**
 * Vid livebordet en hel sekvens i en tagning (?sekvens=vantan-1,p7,p4,p2,vantan-2, namnen efter lyft-<docka>-; rorelse.ts
 * sekvens): rörelserna efter varandra från vila till vila, och korten som har lagts ligger kvar. ?sekvens=1 är väntan 1,
 * dockans alla lyfta givar närmast skon först, som en dealer ger dem (dockval.ts helaSekvensen), och väntan 2.
 */
const SEKVENS: string[] | null = (() => { const text = LIVEBORD ? query.get('sekvens') : null; if (!text) return null;
  if (text === '1') return helaSekvensen(FINNS, DOCKA, STANDARD);
  const lista = text.split(',').filter(Boolean), saknas = lista.filter(x => !/^[a-z0-9][a-z0-9-]*$/.test(x) || !FINNS.has(`lyft-${DOCKA}-${x}`));
  if (!lista.length || saknas.length) { provFel.push(`Sekvensen tar ${ORD.namn}s rörelser lyfta ur filmen, som vantan-1,p7,p4: ${saknas.join(', ') || 'listan är tom'} finns inte.`); return null; } return lista; })();
/** Platsen han bad om (?plats=), förval 4. */
const ONSKAD = GIVAR[Number(query.get('plats'))] ? Number(query.get('plats')) : 4;
/** Vid livebordet: platsen vars lyfta giv visas, den han bad om eller den närmaste dockan har (dockval.ts lyftPlats). */
const LYFT = LIVEBORD && !PROVGIV && !SEKVENS ? lyftPlats(FINNS, DOCKA, ONSKAD, query.has('plats')) : null;
if (LIVEBORD && !PROVGIV && !SEKVENS && !LYFT) provFel.push(`${ORD.namn} har inga givar lyfta ur filmen än.`);
if (LYFT?.rad) inteSa.push(LYFT.rad);
/** Platsen kortet ges till (varje plats har sin egen rörelse och sina egna sparade ändringar). */
const PLATS = LYFT?.plats ?? ONSKAD;
/** Vid livebordet: rörelsen som spelas, ?giv eller dockans lyfta giv till platsen (eller sekvensens namn). */
const LIVEGIV = LIVEBORD ? SEKVENS ? `sekvens-${SEKVENS.join('-')}` : PROVGIV ?? `lyft-${DOCKA}-p${PLATS}` : null;
const EGEN = LIVEGIV ? {vila: '', giv: LIVEGIV, egen: true, namn: `live-${LIVEGIV}`} : grundFor(DOCKA as Standarddocka, PLATS);
const NAMN = RUNDA ? `runda-c1-${DOCKA}` : LIVEBORD ? EGEN.namn : PROV ? `prov-p${PLATS}` : EGEN.namn, SPARAS = `/standarddocka/rorelser/${NAMN}.json`, RUTOR = `/standarddocka/rorelser/${NAMN}.rutor.json`;
const PLATSER = [1, 2, 3, 4, 5, 6, 7];
const KAMERANAMN = (k: Kamera) => { const plats = kameransPlats(k); return LIVEBORD && k === 'spel' ? 'kameran' : plats ? `plats-${plats}` : ({film: 'gamla-kameran', sida: 'sidan', topp: 'uppifran', fri: 'fri'} as Record<string, string>)[k]; };
if (provFel.length) { visaFel(provFel.join(' ')); await new Promise(() => {}); } // sidan stannar här, med felet synligt
const laddarText = (vad: string) => { $('#laddar').firstChild!.textContent = `Laddar ${vad} …`; };
const sek = (t: number) => t.toFixed(2).replace('.', ',') + ' s';

type Visa = 'bord' | 'stol' | 'platser';
type Klipp = {fil: string; rutor: number; bytes: number};
type Api = {ready: boolean; setTime(t: number): void; setKamera(k: Kamera): void; nara(vad: 'hogerHand' | 'vansterHand' | 'kort' | 'ansikte', fran?: V3): void; ansikte(former: Ansikte | null): void; state(): unknown; addChange(a: Partial<Andring> & {led: Led}): string; slapp(id: string): Andring | null; removeChange(id: string): void; undo(): void; save(skrivOver?: boolean): Promise<unknown>; visa(vad: Visa, på: boolean): void; kula(led: Led): {x: number; y: number};
  tillSparat(): void; tillGrund(): void; fart(del: number, ganger: number): void; liv(delar: Livsdel[], fro?: number): void; spelaIn(kameror: Kamera[], fran: number, till: number, val?: Inspelningsval): Promise<Klipp[]>; granskaGrund(): unknown;
  uttryck(namn: Uttrycksnamn | null, styrka?: number, nar?: {fran: number; till?: number; in?: number; ut?: number}): unknown; uttrycksserie(namn?: Uttrycksnamn[], fran?: number, per?: number): {skyltar: Skylt[]; langd: number}};
/** En text i filmens bild från en tid till en annan (filmens sekunder; i en stilla inspelning från inspelningens början). */
type Skylt = {fran: number; till: number; text: string};
/**
 * Det en inspelning kan ta utöver kamerorna och delarna: `namn` är klippets namn i stället för rörelsens (kameran och
 * dockan läggs till), `stilla` sekunder spelar in dockan stilla där tidslinjen står medan bara uttrycken går (från 0),
 * `skyltar` skriver en text i bilden, och `foljAnsiktet` låter den fria kameran följa ansiktet i varje ruta, så många
 * meter från dess mitt (som nara('ansikte', från)), så att en min syns nära också medan han rör sig.
 */
type Inspelningsval = {namn?: string; stilla?: number; skyltar?: Skylt[]; foljAnsiktet?: V3};
declare global { interface Window { editor: Api } }
const api: Api = {ready: false} as Api; window.editor = api;

const hämta = async <X>(url: string): Promise<X> => { const r = await fetch(url, {cache: 'no-store'}); if (!r.ok) throw Error(`${url}: ${r.status}`); return r.json() as Promise<X>; };

// ---- data ----------------------------------------------------------------------------------------------------
laddarText('rörelserna');
/** Det sparade lagret som text, som det låg när sidan laddades ('' om inget): före Spara jämförs filen med det. */
const lasSparat = () => fetch(SPARAS, {cache: 'no-store'}).then(r => r.status === 200 ? r.text() : ''); // 204: inget sparat ännu
const [plan, andra, sparadText] = await Promise.all([
  hämta<Plan>('/blackjack-dealer/placements/default.json'),
  hämta<Motion>(`/blackjack-dealer/dealer3d/data/${SEKVENS ? `lyft-${DOCKA}-${SEKVENS[0]}` : PROVGIV ?? EGEN.giv}.json`), // finns: FINNS är prövad ovan
  PROV || RUNDA ? '' : lasSparat(),
]);
/** Platsen en lyft giv går till (fältet `to`, P<plats>.C1), eller null för en väntan. */
const platsFor = (m: Motion) => Number(/^P(\d)\./.exec([m.to ?? []].flat()[0] ?? '')?.[1]) || null;
/** Vid livebordet: platsen den lyfta given går till, eller null för en väntan och en sekvens. */
const GIVPLATS = LIVEBORD ? SEKVENS ? null : platsFor(andra) : PLATS;
/** Sekvensens rörelser, i sin ordning (den första är `andra`). */
const SEKVENSRORELSER = SEKVENS ? await Promise.all(SEKVENS.map(async (x, i) => { const namn = `lyft-${DOCKA}-${x}`, rorelse = i ? await hämta<Motion>(`/blackjack-dealer/dealer3d/data/${namn}.json`) : andra; return {namn, rorelse, plats: platsFor(rorelse)}; })) : null;
// En giv på prov utan vila i adressen börjar i vilan för den docka den är ritad för (rorelse.ts vilanFor).
// Rundan: vilan till skon och dockans egen giv till var och en av platserna, i spelets ordning.
const RUNDGIVAR = RUNDA ? await Promise.all(RUNDANS_PLATSER.map(async plats => { const namn = grundFor(DOCKA as Standarddocka, plats).giv; return {plats, namn, rorelse: await hämta<Motion>(`/blackjack-dealer/dealer3d/data/${namn}.json`)}; })) : [];
const GRUND = RUNDA ? [EGEN.vila, ...RUNDGIVAR.map(g => g.namn)] : SEKVENSRORELSER ? SEKVENSRORELSER.map(x => x.namn) : LIVEGIV ? [LIVEGIV] :[PROVVILA ?? (PROVGIV ? vilanFor(andra.doll) : EGEN.vila), PROVGIV ?? EGEN.giv];
const forsta = LIVEGIV ? andra : await hämta<Motion>(`/blackjack-dealer/dealer3d/data/${GRUND[0]}.json`);
const FORVAL: Sparad = RUNDA ? {namn: 'Hela rundan: kort 1 till alla sju platserna', om: `A1 till A2.3 och sedan första kortet till plats ${RUNDANS_PLATSER.join(', ')}, i en tagning.`, grund: GRUND, andringar: []}
  : LIVEGIV ? {namn: `${LIVEGIV} vid livebordet`, om: `${GRUND.join(', ')} från vilan till vilan, som ${GRUND.length > 1 ? 'de är, efter varandra' : 'den är'}.`, grund: GRUND, andringar: []}
  : {namn: `Vilan, skon och given till plats ${PLATS} kort 1`, om: `A1 till A2.3 (${GRUND[0]}) och sedan given från A2.3 till plats ${PLATS} kort 1 och tillbaka (${GRUND[1]}). Ändringarna läggs ovanpå grundrörelserna.`, grund: GRUND, andringar: []};
const foljd: Foljd = RUNDA ? rundaAv({namn: GRUND[0], rorelse: forsta}, RUNDGIVAR, STILLA) : SEKVENSRORELSER ? sekvens(SEKVENSRORELSER) : LIVEGIV ? ensam(andra, GIVPLATS ?? PLATS) : sattIhop(forsta, andra, PLATS);
// Ett sparat lager gäller bara de grundrörelser det sparades på: ändringarnas tider och farten per del hör till dem. Hör
// det till andra (grundrörelserna har bytts ut), eller har det fel (det kan skrivas för hand: rorelse.ts lagretsFel),
// läggs det inte på; det står kvar i filen tills han själv trycker Spara.
const sammaGrund = (g: readonly string[] | undefined) => !!g && g.length === GRUND.length && g.every((n, i) => n === GRUND[i]);
const sparadFil: Sparad | null = (() => { if (!sparadText) return null; try { return JSON.parse(sparadText) as Sparad; } catch { return null; } })();
const aldreSparat = sparadFil && Array.isArray(sparadFil.grund) && !sammaGrund(sparadFil.grund) ? sparadFil : null;
const lagretFel = sparadText && !aldreSparat ? (sparadFil ? lagretsFel(sparadFil, langd(foljd), foljd.delar.length) : ['filen är inte giltig JSON']) : [];
if (lagretFel.length) console.warn('Det sparade lagret har fel och används inte:', lagretFel);
const sparad: Sparad = sparadFil && !aldreSparat && !lagretFel.length ? {...FORVAL, ...sparadFil, grund: GRUND} : structuredClone(FORVAL);
if (RUNDA) sparad.liv = rundlivUr(query.get('liv'), Number(query.get('fro')));
/** Filen som den låg när sidan laddades, eller som den här sidan sparade den senast. */
let kandText = sparadText;
// Takten: farten per del. `tid` och DUR är filmens tid (det tidslinjen visar); ändringarna, blicken och rutorna räknas i
// grundrörelsens tid, som tak.grund(tid) ger.
// Förvalet är Jakobs takt (1 s, 1,2 s och 0,8 s) på tiden då något rör sig; en fart han själv har satt gäller före den
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
// Standarden och dockan står alltid i adressen: sidan laddas om vid samma standard, och dockan byter den aldrig. Ett tomt
// värde tar bort ordet.
const medVal = (val: Record<string, string>) => { const q = new URLSearchParams({uppsattning: UPPSATTNING, docka: DOCKA, plats: String(PLATS), kamera, ...(UTSEENDE === 'nyckel' ? {utseende: UTSEENDE} : {}), ...(RUNDA ? {runda: '1'} : {}), ...(STILLA ? {stillhet: '1'} : {}), ...(RUNDA && sparad.liv ? {liv: livText(sparad.liv), fro: String(sparad.liv.fro)} : {}), ...val});
  if (!q.get('runda')) for (const k of ['liv', 'fro', 'stillhet']) q.delete(k);
  for (const [k, v] of [...q]) if (!v) q.delete(k); return q.toString(); };
/** Rundans små rörelser som de står i adressen: 1 för alla delarna, annars delarnas namn. */
const livText = (liv: Liv) => liv.delar.length === RUNDANS_LIV.length ? '1' : liv.delar.join(',');
const scen: Scen = await byggScen(canvas, plan, foljd.hip, stallning(foljd, 0, []), laddarText, UTSEENDE, DOCKA, andra.doll, UPPSATTNING);
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
/** Punkten han ser mot i vilan; vid livebordet ingen (null): där är blicken rörelsens egen hela tiden, dealerns ur filmen. */
const blickKamera = (): V3 | null => LIVEBORD ? null : blickLas ?? kameraVy(blickMot(), plan, UPPSATTNING).pos;
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

/** Ansiktsformer på prov, från ett verktyg (window.editor.ansikte): läggs över rutans ansikte i bilden tills de tas bort, för den som vill se en form på modellen. */
let provansikte: Ansikte | null = null;
/**
 * Uttrycken i ansiktet (rorelse.ts UTTRYCK och medUttryck), ovanpå rörelsen och bara i bilden: de sparas inte och rör
 * inte rörelsens punkter. `lagda` ligger i filmens tid (window.editor.uttryck med en tid, eller uttrycksserie); `hallna`
 * är de han har valt i panelen eller ett verktyg har satt utan tid, i klockans sekunder (urTid), så att ett uttryck han
 * väljer tonas in och det förra ut också när rörelsen står still. Under en stilla inspelning går de lagda på
 * `uttrycksklocka` i stället för tidslinjen.
 */
let lagda: LagtUttryck[] = [], hallna: LagtUttryck[] = [], uttrycksklocka: number | null = null, visatAnsikte: Ansikte | null = null;
const urTid = () => performance.now() / 1000;
function medAnsiktet(f: Frame): Frame { const klocka = urTid(); hallna = hallna.filter(u => u.till > klocka);
  const m = medUttryck(medUttryck(f, lagda, uttrycksklocka ?? tid), hallna, klocka); return provansikte ? {...m, a: {...m.a, ...provansikte}} : m; }
/** Ett hållet uttryck tonas in eller ut just nu: bilden ritas om i varje ruta tills det står still. */
const tonas = () => { const klocka = urTid(); return hallna.some(u => klocka < u.fran + u.in || u.till < Infinity); };
/**
 * Väljer ett uttryck att hålla (null eller 'neutral': inget). `mjukt` tonar det in och de förra ut, med uttryckets egna
 * tider (en blinkning blinkar en gång och är sedan borta); annars är det på genast, för ett verktyg som tar en bild.
 */
function hall(namn: Uttrycksnamn | null, styrka = 1, mjukt = false) {
  const klocka = urTid();
  if (!mjukt) hallna = []; else for (const u of hallna) if (u.till === Infinity) u.till = klocka + u.ut;
  if (namn && namn !== 'neutral') hallna.push(lagUttryck(namn, styrka, mjukt ? klocka : -Infinity, mjukt && namn === 'blinkning' ? undefined : Infinity));
  visaUttryck();
}
/** Knapparna för uttrycken i panelen: det som hålls är valt. */
function visaUttryck() { const pa = new Set(hallna.filter(u => u.till === Infinity).map(u => u.namn));
  document.querySelectorAll<HTMLButtonElement>('#uttryck button').forEach(b => b.classList.toggle('vald', b.dataset.uttryck === 'neutral' ? !pa.size : pa.has(b.dataset.uttryck as Uttrycksnamn))); }
function stall() { const grundtid = tak.grund(tid), r = stallningOchStopp(foljd, grundtid, sparad.andringar, blickKamera(), sparad.liv, granser, tak); nu = r.frame; stoppNu = r.stopp; const visad = medAnsiktet(nu); visatAnsikte = visad.a ?? null; scen.pose(visad, foljd.hip);
  // En sekvens: korten som redan har lagts ligger kvar på sina platser (rorelse.ts sekvens).
  if (foljd.sekvens) scen.lagda(foljd.sekvens.lagda.filter(x => grundtid * foljd.fps >= x.ruta - 1e-6).map(x => x.kort));
  visaStopp(); }
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
let förra = 0, stillaKvar = 0, omstart = false, antalHallna = 0;
function steg(now: number) {
  if (spelar) { const dt = Math.min(0.1, (now - förra) / 1000);
    if (stillaKvar > 0) { stillaKvar -= dt; if (stillaKvar <= 0 && omstart) { omstart = false; stillaKvar = SLINGA.borjan; setTime(0); } }
    else { const t = tid + dt * fart; if (t < DUR) setTime(t); else { setTime(DUR); if (slinga) { stillaKvar = SLINGA.slut; omstart = true; } else spela(false); } } }
  else if (!inspelning && (tonas() || hallna.length !== antalHallna)) { stall(); visa(); } // ett uttryck tonas in eller ut medan rörelsen står still
  antalHallna = hallna.length; förra = now; requestAnimationFrame(steg);
}
function spela(på: boolean) { spelar = på; stillaKvar = 0; omstart = false; $('#spela').textContent = på ? '❚❚ Paus' : '▶ Spela'; if (på && tid >= DUR - 1e-6) tid = 0; }

// ---- kamerorna ---------------------------------------------------------------------------------------------------
function setKamera(k: Kamera) {
  kamera = k;
  if (k !== 'fri') { scen.setKamera(k); const dir = new T.Vector3(); camera.getWorldDirection(dir); orbit.target.copy(camera.position).addScaledVector(dir, k === 'topp' ? 2.1 : k === 'sida' ? camera.position.distanceTo(new T.Vector3(...kameraVy('sida', plan, UPPSATTNING).mot)) : 1.95); orbit.update(); }
  document.querySelectorAll<HTMLButtonElement>('#kameror button').forEach(b => b.classList.toggle('vald', b.dataset.kamera === k)); ram(); rita();
}
/** Spelets bild som en ram i fönstret, när kameran är en plats vid bordet (plats 4 är spelets egen). */
function ram() { const r = scen.filmRam(), box = $('#ram'), plats = kameransPlats(kamera); box.style.display = plats && !inspelning ? 'block' : 'none'; Object.assign(box.style, {left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'});
  if (plats) box.firstElementChild!.textContent = plats === 4 ? (LIVEBORD ? 'Livebordets bild' : 'Spelets bild (plats 4)') : `Bilden från plats ${plats}`; }
/**
 * Kameran nära en hand eller kortet som de står nu, för den som granskar fingrarna: den fria kameran `fran` meter från
 * handens mitt (förvalet snett uppifrån spelarnas sida), riktad mot den. 'ansikte' är nära ansiktet, för den som granskar
 * en blinkning eller en min: utan `fran` står kameran 0,42 m bort åt det håll han ser, så att ansiktet syns rakt framifrån
 * också när han ser ned mot skon.
 */
type Nara = 'hogerHand' | 'vansterHand' | 'kort' | 'ansikte';
function nara(vad: Nara, fran?: V3) {
  const v = (p: number[]) => new T.Vector3(p[0], p[1], p[2]), hand = vad === 'kort' || vad === 'ansikte' ? null : nu[vad === 'hogerHand' ? 'R' : 'L'];
  // Ansiktets mitt: strax under linjen mellan ögonen (ögonens leder), eller för en modell utan dem framför huvudets led.
  const ogon = ['eyeL', 'eyeR'].map(n => scen.figure.root.getObjectByName(n)?.getWorldPosition(new T.Vector3())).filter((p): p is T.Vector3 => !!p);
  const ansikte = () => ogon.length ? ogon.reduce((s, p) => s.add(p), new T.Vector3()).multiplyScalar(1 / ogon.length).add(new T.Vector3(0, -0.03, 0)) : scen.bone('Head').add(new T.Vector3(0, 0.05, 0.08));
  const mal = hand ? v(hand.w).add(v(hand.p[9])).multiplyScalar(0.5) : vad === 'kort' ? v(nu.card.c) : ansikte();
  const franNu = fran ? v(fran) : vad === 'ansikte' ? v(nu.g).sub(mal).normalize().multiplyScalar(0.42) : new T.Vector3(0, 0.2, 0.36);
  scen.setKamera('spel'); // spelets bildvinkel, inte den förra kamerans (sidans eller uppifrån)
  kamera = 'fri'; camera.position.copy(mal).add(franNu); camera.up.set(0, 1, 0); camera.lookAt(mal); orbit.target.copy(mal); orbit.update(); scen.storlek();
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
/** Rundans klipplista med måtten (rorelse.ts klipplista), räknad en gång för de små rörelser som är på; null utanför rundan. */
let rundlista: ReturnType<typeof klipplista> | undefined;
const rundlistan = () => rundlista === undefined ? rundlista = klipplista(foljd, DOCKA, sparad.liv) : rundlista;
/** Hur många rutor regeln som lyfter armbågarna över bordets kant ändrade (armar.ts lyftArmar); satt när bordet har kommit. */
let armarVridna = 0;
/** Fröet för rundans små egna rörelser: adressens, eller det senast slumpade. */
let rundfro = sparad.liv?.fro ?? 1;
/** Prövar att tagningen går att klippa, som den spelas nu, och säger det i statusraden om den inte gör det. */
function provaRundan() { rundlista = undefined; const m = rundlistan()?.matt, mm = (n: number) => String(n).replace('.', ',');
  rundvarning = STILLA && m && !m.ren ? ` Obs: den här tagningen är inte ren att klippa. Inom en stillhet rör sig dockan upp till ${mm(m.storstaSkillnad)} mm, och i en skarv hoppar den upp till ${mm(m.storstaHopp)} mm.${armarVridna ? ` Regeln som lyfter armbågarna över bordets kant ändrade ${armarVridna} rutor, eftersom ${DOCKA === 'kvinna' ? 'kvinnans' : 'mannens'} rörelser annars går genom kanten: där den behövs nära ett ankare spiller den över stillheten.` : ''}` : ''; visaStatus(); }
/**
 * Rundans små egna rörelser och blinkning på eller av (rorelse.ts medRundliv), med slumpens frö. De läggs på direkt, och
 * adressen följer med, så att länken och en omladdning ger samma tagning. Sparas inte.
 */
function sattRundliv(delar: readonly Livsdel[], fro = rundfro) {
  sparad.liv = rundlivUr(delar.join(',') || null, fro); if (sparad.liv) rundfro = sparad.liv.fro; // fröet står kvar när krysset tas bort och sätts igen
  const q = new URLSearchParams(location.search); q.delete('liv'); q.delete('fro'); if (sparad.liv) { q.set('liv', livText(sparad.liv)); q.set('fro', String(sparad.liv.fro)); } history.replaceState(null, '', `?${q}`);
  provaRundan(); visaRundliv(); stall(); handtagTill(); rita();
}
/** Krysset och knappen för rundans små rörelser, och en rad om vad fröet gav. */
function visaRundliv() { const ruta = document.querySelector<HTMLInputElement>('#rundliv'), slumpa = document.querySelector<HTMLButtonElement>('#rundliv-slumpa'), om = document.querySelector<HTMLElement>('#rundliv-om'); if (!ruta || !slumpa || !om) return;
  const l = rundlivet(foljd, sparad.liv), platser = (rader: NonNullable<typeof l>) => rader.map(x => x.plats).filter(Boolean).join(', ');
  ruta.checked = !!l; slumpa.disabled = !l; om.style.display = l ? '' : 'none';
  if (l) { const blick = l.filter(x => x.blickMotSpelaren), finger = l.filter(x => x.fingerLyfter), min = l.filter(x => x.min);
    om.textContent = `Frö ${sparad.liv!.fro}: ${ORD.han} blinkar i ${l.filter(x => x.blinkarVidRuta !== null).length} av ${l.length} klipp${blick.length ? `, ser upp mot spelaren efter kortet till plats ${platser(blick)}` : ''}${min.length ? `, har en liten min i given till plats ${platser(min)}` : ''}${finger.length ? `, och ett finger lyfter på handen som ligger fri i given till plats ${platser(finger)}` : ''}. I varje klipp andas ${ORD.han} in en gång, väger över några millimeter och rör huvudet lätt. Allt är borta i ankaren, så klippen möts som förut.`; } }
function visaStatus() { const s = $('#status'), omAldre = oanvant();
  // Hela rundan: vad den är, i stället för en plats sparade läge; den sparas inte.
  if (RUNDA) { s.className = rundvarning ? 'osparat' : ''; $<HTMLButtonElement>('#spara').disabled = true; const vanster = RUNDGIVAR.filter(g => g.rorelse.marke?.hander === 'vanster').map(g => g.plats);
    s.textContent = `Hela rundan: vilan till skon och sedan första kortet till plats ${RUNDANS_PLATSER.join(', ')}, ${STILLA ? `med ${sek(STILLHET.efter + STILLHET.fore)} stilla vid skon efter varje kort, där filmen sedan klipps (tagningen som ska bli film)` : 'i ett svep, som klippen spelas efter varandra'}.${vanster.length ? ` Plats ${vanster.join(' och ')} ges med vänsterhanden ensam, de andra med handbyte.` : ''}${sparad.liv ? ` Med små egna rörelser${sparad.liv.delar.includes('blinkning') ? ' och blinkning' : ''} (frö ${sparad.liv.fro}).` : ''} Här ändras och sparas inget: det görs på en plats i taget.${rundvarning}`; return; }
  // Spelar platsen ännu de äldre rörelserna (ingen egen giv för dockan där än), sägs det först.
  const lanad = PROV || EGEN.egen ? '' : `Plats ${PLATS} spelar ännu den äldre rörelsen, ritad för en annan kropp än ${DOCKA === 'kvinna' ? 'kvinnans' : 'mannens'}. `;
  s.className = osparat ? 'osparat' : sparadKl ? 'bra' : '';
  // (givens märke först: vänsterhanden ensam eller handbyte, och vilken version; Jakob 2026-11-26: "det måste markeras")
  s.textContent = markeText(andra, GIVPLATS ?? PLATS) + lanad + (LIVEBORD ? `${ORD.namn} spelar ${GRUND.length > 1 ? `${GRUND.map(rorelsensOrd).join(', ')} efter varandra i en tagning, var och en som den är` : `${rorelsensOrd(GRUND[0])} som den är`}, från vilan till vilan i rörelsens egen takt, med den riktiga dealerns blick och min.${foljd.sekvens ? ` Korten som har lagts ligger kvar. Där rörelserna möts hoppar dockan högst ${Math.max(0, ...foljd.sekvens.skarvar.map(x => x.mm)).toString().replace('.', ',')} mm.` : ''}${andra.doll && andra.doll !== DOCKA ? ` Rörelsen är lyft för ${dockord(andra.doll).namn}, inte för ${ORD.namn}.` : ''}${armarVridna ? ` Regeln som lyfter armbågarna över bordets kant ändrade ${armarVridna} rutor.` : ''} Det du drar i syns men sparas inte.`
    : PROV ? `På prov: ${GRUND.join(' och ')}. Sparas inte.` : sparar ? 'Sparar …' : osparat ? `Ändrat – inte sparat ännu.${omAldre ? ` ${omAldre}; Spara skriver över det.` : ''}` : sparadKl ? `Sparat kl. ${sparadKl}.${sparadVarning}` : omAldre ? `${omAldre}. Det står kvar tills du trycker Spara.` : sparadFil ? 'Allt är sparat.' : 'Inget sparat ännu.');
  if ((sparadVarning && !osparat) || omAldre) s.className = 'osparat';
  $<HTMLButtonElement>('#spara').disabled = PROV || sparar;
  $<HTMLButtonElement>('#till-sparat').disabled = !osparat; $<HTMLButtonElement>('#till-grund').disabled = ärGrund(); }

/** Vad som kan spelas in: hela rörelsen, en del, eller given (kortet ut och handen tillbaka i samma film). Värdet är första och sista delen. */
const OMFANG = (): {varde: string; text: string; namn: string}[] => { const d = tak.delar, sist = d.length - 1, l = (a: number, b: number) => sek(d[b].till - d[a].fran);
  const slug = (s: string) => s.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-');
  // Hela rundan: allt i en film (utan del i filmens namn), eller ett klipp för sig, med klippets namn (a23-p7c1-a23).
  if (foljd.runda) { const k = foljd.runda.klipp; return [{varde: `0-${sist}`, text: `Hela rundan (${l(0, sist)})`, namn: ''}, ...d.map((x, i) => ({varde: `${i}-${i}`, text: `Bara ${x.namn.toLowerCase()} (${l(i, i)})`, namn: k[i].namn.toLowerCase().replace(/\./g, '').replace(/>/g, '-')}))]; }
  return [{varde: `0-${sist}`, text: `Hela rörelsen (${l(0, sist)})`, namn: 'hela'}, ...(sist ? d.map((x, i) => ({varde: `${i}-${i}`, text: `Bara ${x.namn.toLowerCase()} (${l(i, i)})`, namn: slug(x.namn)})) : []),
    ...(sist >= 2 ? [{varde: `1-${sist}`, text: `Given: kortet ut och handen tillbaka (${l(1, sist)})`, namn: 'given'}] : [])]; };
/**
 * Delarna, i panelen och på tidslinjen, som de är med farten som gäller. I panelen en rad var: klick hoppar dit, och
 * längden går att skriva om (sekunder), vilket ändrar delens fart.
 */
function visaDelar() {
  const ul = $('#delar'); ul.replaceChildren();
  tak.delar.forEach((d, i) => { const li = document.createElement('li'), nr = document.createElement('b'), namn = document.createElement('span'), längd = document.createElement('input'), s = document.createElement('small'), fart = tak.fart[i];
    const grundlängd = tak.spann[i].till - tak.spann[i].fran;
    nr.textContent = `${i + 1}.`; namn.textContent = d.namn; li.title = `Börjar vid ${sek(d.fran)}. Grundrörelsen tar ${sek(grundlängd)} här${tak.forval ? '; tiden är förvalet (1 s, 1,2 s och 0,8 s)' : ''}.`;
    längd.type = 'number'; längd.step = '0.1'; längd.min = (grundlängd / FART.mest).toFixed(1); längd.max = (grundlängd / FART.minst).toFixed(1); längd.value = (d.till - d.fran).toFixed(2); längd.title = 'Hur många sekunder delen ska ta. Skriv ett nytt tal för att göra den fortare eller långsammare.';
    längd.dataset.del = String(i);
    // Hela rundan: takten är fast, och raden säger klippets rutor i tagningen.
    if (foljd.runda) { const k = foljd.runda.klipp[i]; längd.disabled = true; längd.title = 'Rundans takt är fast. Farten ändras på en plats i taget.';
      li.title = `${i ? markeText(RUNDGIVAR[i - 1].rorelse, RUNDGIVAR[i - 1].plats) : ''}Klippet ${k.namn}: ruta ${k.forsta}–${k.sista}.${k.kortetLigger === null ? '' : ` Kortet ligger från ruta ${k.kortetLigger}.`} ${Han} står stilla vid skon från ruta ${k.stillaFran}.`; }
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
// Vid livebordet är en plats dockans lyfta giv dit (de finns bara till några platser), och väntan har två knappar för sig.
document.querySelectorAll<HTMLButtonElement>('#malplatser button[data-plats]').forEach(b => { const plats = Number(b.dataset.plats); b.classList.toggle('vald', !RUNDA && plats === (LIVEBORD ? GIVPLATS : PLATS));
  b.onclick = () => { if (RUNDA || plats !== PLATS || (LIVEBORD && GIVPLATS !== plats)) location.search = medVal({plats: String(plats), runda: '', giv: ''}); }; });
// Vilka som finns läses ur listan (FINNS): en knapp utan rörelse är avstängd och säger varför.
if (LIVEBORD) { const lyft = (b: HTMLButtonElement, giv: string, vad: string) => { const ja = FINNS.has(giv); b.disabled = !ja; b.title = ja ? `${ORD.namn}: ${vad}, lyft ur filmen av den riktiga dealern` : `${ORD.namn} har ingen ${vad} lyft ur filmen än.`; };
  document.querySelectorAll<HTMLButtonElement>('#malplatser button[data-plats]').forEach(b => lyft(b, `lyft-${DOCKA}-p${b.dataset.plats}`, `giv till plats ${b.dataset.plats}`));
  document.querySelectorAll<HTMLButtonElement>('#malplatser button[data-vantan]').forEach(b => { const giv = `lyft-${DOCKA}-vantan-${b.dataset.vantan}`; lyft(b, giv, `väntan ${b.dataset.vantan}`); b.classList.toggle('vald', !SEKVENS && GRUND[0] === giv);
    b.onclick = () => { if (SEKVENS || GRUND[0] !== giv) location.search = medVal({giv}); }; });
  // Hela sekvensen: väntan 1, alla dockans lyfta givar närmast skon först och väntan 2 i en tagning, med korten kvar på bordet.
  const hela = document.querySelector<HTMLButtonElement>('#hela-sekvensen'); if (hela) { hela.classList.toggle('vald', !!SEKVENS); hela.disabled = helaSekvensen(FINNS, DOCKA, STANDARD).length < 2; hela.onclick = () => { if (!SEKVENS) location.search = medVal({sekvens: '1'}); }; }
  for (const x of document.querySelectorAll<HTMLElement>('#hela-rundan, [data-kamera=film]')) x.style.display = 'none'; }
document.querySelectorAll<HTMLElement>('.bara-live').forEach(x => { x.style.display = LIVEBORD ? '' : 'none'; });
// Hela rundan i en tagning (?runda=1): ett eget val under platserna.
{ const b = document.querySelector<HTMLButtonElement>('#hela-rundan'); if (b) { b.classList.toggle('vald', RUNDA); b.onclick = () => { if (!RUNDA) location.search = medVal({runda: '1'}); }; } }
// Dockorna: bara standardens egna (uppsattning.ts dockor), och ett byte av docka byter aldrig standard; standarden väljs i
// studions meny. Vid livebordet följer det han tittar på med till den andra dockan när den har det (hela sekvensen, väntan
// med samma nummer), annars platsen eller den närmaste den har en lyft giv till.
{ const ruta = $('#dockor'), visas = !SEKVENS && PROVGIV ? /^lyft-[a-z0-9]+-vantan-(\d+)$/.exec(PROVGIV)?.[1] : undefined;
  ruta.title = LIVEBORD ? 'Dockorna efter de två riktiga dealrarna i filmen av livebordet. Deras rörelser är lyfta ur filmen och spelas som de är; här sparas inget.' : 'Mannen och kvinnan har samma skelett. Var och en spelar sina egna rörelser och har sina egna sparade ändringar.';
  const tillDockan = (docka: string): Record<string, string> => !LIVEBORD ? {} : query.get('sekvens') === '1' && SEKVENS ? {sekvens: '1'}
    : visas && FINNS.has(`lyft-${docka}-vantan-${visas}`) ? {giv: `lyft-${docka}-vantan-${visas}`} : {plats: String(lyftPlats(FINNS, docka, PLATS, false)?.plats ?? PLATS)};
  for (const docka of STANDARD.dockor) { const b = document.createElement('button'); b.className = 'bred'; b.dataset.docka = docka; b.textContent = dockord(docka).namn; b.classList.toggle('vald', docka === DOCKA);
    b.onclick = () => { if (docka !== DOCKA) location.search = medVal({docka, ...tillDockan(docka)}); }; ruta.append(b); } }
// Rubriken och hjälptexten efter dockan som visas (namnet, och hon eller han), raden om standarden som gäller (inne i studion:
// att den väljs i menyn), och raderna om ord i adressen som inte passade.
{ $('#panel h1').textContent = `${ORD.namn} vid bordet`;
  document.querySelectorAll<HTMLElement>('[data-ord]').forEach(x => { const ord = x.dataset.ord as 'han' | 'honom' | 'hans' | 'Han'; x.textContent = ord === 'Han' ? Han : ORD[ord]; });
  $('#kamera-tips').textContent = `Dra i bilden för att vrida runt ${ORD.honom}, rulla för att komma närmare. ${LIVEBORD ? `${Han} tittar dit den riktiga dealern tittade i filmen.` : `${Han} tittar in i kameran på plats 4 när ${ORD.han} inte följer kortet.`}`;
  $('#standard').textContent = window.self !== window.top ? `${STANDARD.namn}, vald i studions meny (${VALETS_NAMN}).` : `${STANDARD.namn}.`;
  const inte = $('#inte-sa'); inte.textContent = inteSa.join(' '); inte.style.display = inteSa.length ? '' : 'none'; }
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
  if (LIVEBORD) throw Error('Vid livebordet sparas inget: de lyfta rörelserna spelas som de är.');
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
/** Bilden med en text nere till vänster (vit på en mörk ruta, 6 % av bildens höjd), för en film med namnet i bild: där ligger bordet eller axlarna, inte ansiktet. */
async function medSkylt(bild: Blob, text: string): Promise<Blob> {
  const b = await createImageBitmap(bild), yta = new OffscreenCanvas(b.width, b.height), g = yta.getContext('2d')!, h = Math.round(b.height * 0.06), luft = Math.round(h * 0.45), y = b.height - luft - (h + luft);
  g.drawImage(b, 0, 0); g.font = `600 ${h}px "Segoe UI", system-ui, sans-serif`; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(12, 14, 18, 0.62)'; g.fillRect(luft, y, g.measureText(text).width + 2 * luft, h + luft); g.fillStyle = '#fff'; g.fillText(text, 2 * luft, y + (h + luft) / 2);
  return yta.convertToBlob({type: 'image/png'});
}
/**
 * Spelar in rörelsen från delen `forst` till och med delen `sist` (0 är den första) som en film per kamera, i filmens
 * storlek, med farten som gäller och utan handtag. Varje ruta ritas för sig och skickas till editorns server, som lägger
 * filmen i standarddocka/klipp/ (en ny inspelning med samma namn skriver över den förra). Blicken står fast som den är när
 * inspelningen börjar, så att det är samma rörelse från varje kamera. Med `val` (Inspelningsval) ett eget namn, dockan
 * stilla medan bara uttrycken i ansiktet går, och text i bilden. Esc avbryter.
 */
async function spelaIn(kameror: Kamera[], forst: number, sist: number, val: Inspelningsval = {}): Promise<Klipp[]> {
  if (inspelning) return []; spela(false); kameror = kameror.map(k => somKamera(k) ?? 'spel');
  if (val.namn !== undefined && !/^[a-z0-9][a-z0-9-]*$/.test(val.namn)) throw Error(`Klippets namn ${val.namn} går inte: små bokstäver, siffror och bindestreck.`);
  // Stilla: dockan står där tidslinjen står, och bara uttrycken går, på sin egen klocka från 0.
  const stilla = val.stilla && val.stilla > 0 ? Math.round(val.stilla * foljd.fps) : 0;
  const a = tak.delar[forst], b = tak.delar[sist]; if (!stilla && (!a || !b || sist < forst)) throw Error('Det finns ingen sådan del att spela in.');
  // I rundan är det klippens egna rutor (ett klipp slutar på sin stillhets sista ruta, rutan före nästa klipps första).
  const [fran, till] = stilla ? [0, stilla - 1] : foljd.runda ? [foljd.runda.klipp[forst].forsta, foljd.runda.klipp[sist].sista] : [Math.round(a.fran * foljd.fps), Math.round(b.till * foljd.fps)], antal = (till - fran + 1) * kameror.length;
  const delnamn = OMFANG().find(o => o.varde === `${forst}-${sist}`)?.namn ?? `del-${forst + 1}-${sist + 1}`;
  const före = {tid, kamera, pos: camera.position.clone(), kvat: camera.quaternion.clone(), mot: orbit.target.clone()}, klara: Klipp[] = [], text = $('#laddar'), status = $('#inspela-status');
  const post = async <X>(url: string, body: BodyInit | null): Promise<X> => { const r = await fetch(url, {method: 'POST', body}); if (!r.ok) throw Error(`Inspelningen stannade: ${(await r.text()).slice(0, 300)}`); return r.json() as Promise<X>; };
  // Klippets namn: rörelsen (på prov: grundrörelsernas namn), delen, kameran och dockan, så att mannens och kvinnans
  // klipp inte skriver över varandra. Hela rundan heter runda-c1 och har ingen del i namnet; med rundans små egna
  // rörelser på slutar namnet på -liv, så att tagningen med dem inte skriver över den utan.
  // Vid livebordet live-<rörelsen>, så att inget av standardens klipp skrivs över.
  // (en annan kropp på prov, ?modell=, får sitt namn i klippet: live-<rörelsen>-modell-<namnet>)
  const modell = LIVEGIV && /^[a-z0-9_]+$/.test(query.get('modell') ?? '') ? `-modell-${query.get('modell')!.replace(/_/g, '-')}` : '';
  const rorelse = RUNDA ? (STILLA ? 'runda-c1' : 'runda-c1-flyt') : LIVEGIV ? `live-${LIVEGIV}${modell}` : PROV ? `prov-${PROVVILA ? `${PROVVILA}-` : ''}${GRUND[1]}` : `a1-a23-p${PLATS}c1`, livnamn = RUNDA && sparad.liv ? '-liv' : '';
  const stam = val.namn ?? (stilla ? `${rorelse}-stilla` : delnamn ? `${rorelse}-${delnamn}` : rorelse);
  const skylt = (t: number) => val.skyltar?.find(s => t >= s.fran && t < s.till)?.text ?? '';
  // Panelen, tidslinjen, kameran och pilarna står still under inspelningen: inget han rör ändrar klippet medan det görs.
  const stang = (pa: boolean) => { for (const s of ['#panel', '#botten']) document.querySelector<HTMLElement>(s)!.inert = pa; orbit.enabled = !pa; flytta.enabled = !pa; };
  const lås = blickKamera(); blickLas = lås ? [lås[0], lås[1], lås[2]] : null; inspelning = {avbryt: false}; välj(null); stang(true); handtagTill(); ram(); text.style.display = 'grid'; status.className = 'tips'; status.textContent = '';
  let id: string | null = null, gjorda = 0;
  try {
    scen.filmstorlek(true);
    for (const k of kameror) {
      if (k !== 'fri') scen.setKamera(k);
      id = (await post<{id: string}>('/inspelning/start', JSON.stringify({namn: `${stam}-${KAMERANAMN(k)}-${DOCKA}${UTSEENDE === 'nyckel' ? '-nyckel' : ''}${livnamn}`, fps: foljd.fps}))).id;
      for (let i = fran; i <= till; i++) {
        if (inspelning.avbryt) break;
        if (stilla) uttrycksklocka = i / foljd.fps; else tid = i / foljd.fps;
        stall(); if (val.foljAnsiktet && k === 'fri') nara('ansikte', val.foljAnsiktet); const ord = skylt(i / foljd.fps); await post(`/inspelning/${id}/ruta`, ord ? await medSkylt(await scen.bild(), ord) : await scen.bild()); gjorda++;
        text.firstChild!.textContent = `Spelar in ${kameror.length > 1 ? `kamera ${kameror.indexOf(k) + 1} av ${kameror.length}, ` : ''}bild ${gjorda} av ${antal} … (Esc avbryter)`;
      }
      if (inspelning.avbryt) break;
      klara.push(await post<Klipp>(`/inspelning/${id}/klar`, null)); id = null;
    }
  } finally {
    if (id) await fetch(`/inspelning/${id}/avbryt`, {method: 'POST'}).catch(() => {});
    const avbruten = inspelning.avbryt; inspelning = null; blickLas = null; uttrycksklocka = null; stang(false); scen.filmstorlek(false); text.style.display = 'none';
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
// Rundans små egna rörelser och blinkning: ett kryss, och en knapp som lägger dem på andra ställen (ett nytt frö).
{ const ruta = document.querySelector<HTMLInputElement>('#rundliv'), slumpa = document.querySelector<HTMLButtonElement>('#rundliv-slumpa');
  if (ruta) ruta.onchange = () => sattRundliv(ruta.checked ? RUNDANS_LIV : []); if (slumpa) slumpa.onclick = () => sattRundliv(sparad.liv?.delar ?? RUNDANS_LIV, 1 + Math.floor(Math.random() * 9999)); visaRundliv(); }
// Uttrycken i ansiktet: en knapp per uttryck (tonas in, och det förra ut), styrkan, och kameran nära ansiktet.
{ const knappar = document.querySelector<HTMLElement>('#uttryck'), styrka = document.querySelector<HTMLInputElement>('#uttryck-styrka'), styrkaText = document.querySelector<HTMLElement>('#uttryck-styrka-text');
  const visaStyrka = () => { if (styrka && styrkaText) styrkaText.textContent = `${Math.round(Number(styrka.value) * 100)} %`; };
  if (knappar) for (const n of UTTRYCKEN) { const b = document.createElement('button'); b.dataset.uttryck = n; b.textContent = UTTRYCK[n].text; knappar.append(b);
    b.onclick = () => { const pa = hallna.some(u => u.namn === n && u.till === Infinity); hall(pa ? null : n, Number(styrka?.value ?? 1), true); }; }
  if (styrka) styrka.oninput = () => { visaStyrka(); const u = hallna.find(x => x.till === Infinity); if (u) { u.styrka = Number(styrka.value); stall(); rita(); } };
  const naraKnapp = document.querySelector<HTMLButtonElement>('#nara-ansiktet'); if (naraKnapp) naraKnapp.onclick = () => { nara('ansikte'); ritaNu(); };
  visaStyrka(); visaUttryck(); }
if (RUNDA) { document.querySelectorAll<HTMLElement>('.bara-plats').forEach(x => { x.style.display = 'none'; });
  const tips = document.querySelector('#delar-tips'); if (tips) tips.textContent = STILLA ? `Varje del är ett klipp: ${sek(STILLHET.fore)} stilla vid skon med tomt bord, rörelsen, och ${sek(STILLHET.efter)} stilla med kortet kvar på sin plats. Filmen klipps mellan två delar, där kortet försvinner från bordet. Takten är fast här.` : 'Varje del är ett klipp, och de spelas i ett svep. Kortet ligger kvar tills nästa del börjar; i spelet ritar spelet korten som ligger. Takten är fast här.'; }
const bord = await scen.bord;
// Armarna över bordskanten: grundrörelsen rättas en gång när bordet (och därmed dess kant) är på plats.
laddarText('armarna över bordskanten'); await new Promise(r => setTimeout(r, 0));
const armar = lyftArmar(foljd, scen, bord);
// Hela rundan ska gå att klippa: varje stillhet exakt och ingen skarv med hopp, också efter regeln ovan. Den jämnar ut sin
// vridning över tiden, så där en dockas rörelser behöver den nära ett ankare spiller den över stillheten och skarven.
// Det rättas inte här (det hör till grundrörelserna eller regeln); det sägs i statusraden och i klipplistan (matt.ren).
// Mätt på rutorna som de spelas, med de små egna rörelserna när de är på (provaRundan).
armarVridna = armar.rutorVridna; provaRundan();
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
  // De små egna rörelserna: på en plats de fem i panelen (sparas med rörelsen), i hela rundan rundans egna (RUNDANS_LIV).
  liv: (delar: Livsdel[], fro?: number) => { if (RUNDA) sattRundliv(delar, fro); else sattLiv(delar, fro); ritaNu(); },
  // Ansiktsformer på prov ({eyeBlinkLeft: 1, …}; null tar bort dem): bara i bilden, för den som vill se en form på modellen.
  ansikte: (former: Ansikte | null) => { provansikte = former; ritaNu(); },
  // Ett namngivet uttryck (rorelse.ts UTTRYCK; null tar bort alla): utan tid hålls det i bilden genast, med en tid
  // ({fran, till?, in?, ut?}, filmens sekunder) läggs det på tidslinjen och tonas in och ut, också i en inspelning.
  uttryck: (namn: Uttrycksnamn | null, styrka = 1, nar?: {fran: number; till?: number; in?: number; ut?: number}) => {
    if (namn !== null && !UTTRYCK[namn]) throw Error(`Inget uttryck heter ${namn}. De som finns: ${UTTRYCKEN.join(', ')}.`);
    if (namn === null) { lagda = []; hall(null); } else if (nar) lagda.push(lagUttryck(namn, styrka, nar.fran, nar.till, nar)); else hall(namn, styrka);
    ritaNu(); return {hallna: hallna.map(u => ({namn: u.namn, styrka: u.styrka})), lagda};
  },
  // Alla uttryck (eller de nämnda) ett i taget på tidslinjen, `per` sekunder vart från `fran`, i stället för de lagda; skyltarna är deras namn.
  uttrycksserie: (namn?: Uttrycksnamn[], fran = 0, per = 1.5) => { const s = uttrycksserie(namn, fran, per); lagda = s.lagda; ritaNu(); return {skyltar: s.skyltar, langd: s.langd}; },
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
    return {namn: NAMN, uppsattning: UPPSATTNING, docka: DOCKA, sekvens: foljd.sekvens ? {rorelser: GRUND, skarvar: foljd.sekvens.skarvar, lagda: foljd.sekvens.lagda.map(x => ({ruta: x.ruta, c: x.kort.c}))} : null, handledGrader: {ritad: wrist, begard: wristAsked}, vridning: {underarm: twist, handled: wristTwist, vridben: scen.figure.about.forearmTwistBones}, fingrarFranPunkternaMm: fingrar, handledFranPunktenMm: handled, armbageFranPunktenMm: armbage, axelFranPunktenMm: axel, plats: PLATS, grund: GRUND, tid, grundtid, langd: DUR, fart: tak.fart, forvaldTakt: tak.forval, kamera, kameraLage: p(camera.position), spelar, vald, osparat, andringar: sparad.andringar, delar: tak.delar, grunddelar: foljd.delar, skarv: foljd.skarv, platser: bord, stol: scen.stol, armar, synligt, fel,
      dockansEgna: EGEN.egen, sparasSom: NAMN, lagretsFel: lagretFel, bildvinkel: Math.round(camera.fov * 100) / 100, sparar, kortetsUtseende: scen.kortet(),
      // I läget Vrida: åt vilket håll ringarnas x (den som vrider handen kring underarmen) pekar i världen.
      lage, ringensX: lage === 'vrida' && vald ? p(new T.Vector3(1, 0, 0).applyQuaternion(dragpunkt.quaternion)) : null, axelLeder: {hoger: p(scen.bone('RightArm')), vanster: p(scen.bone('LeftArm'))},
      blick: {mot: blickMot(), foljerKortet: Math.round(blickenFoljer(foljd, grundtid, tak.spelad) * 100) / 100, tider: foljd.blick, punkt: nu.g},
      // Hela rundan (?runda=1): klipplistan, med skarvarna och stillheten mätta på rutorna som de spelas (med de små egna
      // rörelserna när de är på); annars null. `rundliv`: vad de små rörelserna gör i varje klipp, null när de är av.
      runda: rundlistan(), rundliv: rundlivet(foljd, sparad.liv),
      // De små egna rörelserna som är på, ansiktet i rutan som visas (formernas vikter; null i vila) och formerna dockans modell har.
      liv: sparad.liv ?? null, ansikte: visatAnsikte, ansiktsformer: scen.figure.about.faceShapes,
      // Uttrycken: det som visas nu (det senast lagda som ligger vid tiden, annars det som hålls), de lagda och de hållna.
      uttryck: {nu: uttryckVid(lagda, uttrycksklocka ?? tid)?.namn ?? hallna.find(u => u.till === Infinity)?.namn ?? null, lagda, hallna: hallna.map(u => ({namn: u.namn, styrka: u.styrka})), finns: UTTRYCKEN},
      hoft: {rorelsen: foljd.hip, mannen: p(hips), skillnadMm: Math.round(hips.distanceTo(new T.Vector3(...foljd.hip)) * 1000)},
      leder: {hogerHand: p(scen.bone('RightHand')), vansterHand: p(scen.bone('LeftHand')), hogerArmbage: p(scen.bone('RightForeArm')), vansterArmbage: p(scen.bone('LeftForeArm')), huvud: p(scen.bone('Head')), hogerLar: p(scen.bone('RightUpLeg')), hogerKna: p(scen.bone('RightLeg')), hogerFot: p(scen.bone('RightFoot'))},
      malHogerHand: nu.R.w, malVansterHand: nu.L.w, kort: nu.card.c, vikter: sparad.andringar.map(a => ({id: a.id, vikt: vikt(a, grundtid, tak.ut)})), aldreSparat: aldreSparat ? aldreSparat.grund ?? [] : null,
      // Vad spärren höll emot vid tiden som visas (led, vad som tog emot, hur mycket, och raden i bilden).
      sparr: {klar: !!granser, stopp: stoppNu, matt: granser && (({bal, huvud, armar: a}) => ({balensHojd: [bal.y0, bal.y0 + (bal.skivor.length - 1) * bal.dy].map(mm), skivor: bal.skivor.length, huvud: {c: huvud.c.map(mm), r: mm(huvud.r)},
        armar: Object.fromEntries((['R', 'L'] as const).map(s => [s, {axel: a[s].axel.map(mm), over: mm(a[s].over), under: mm(a[s].under), tjockUnder: a[s].tjockUnder.map(mm)}]))}))(granser.matt)}};
  },
});
api.ready = true;
