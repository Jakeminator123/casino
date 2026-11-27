// Tittar på en rörelse i editorn utan fönster: stillbilder ur valda kameror vid valda tider, med editorns egna mått, eller
// en inspelning. För en agent som ska granska en rörelse eller göra ett klipp; Jakob använder editorn själv.
//
//   node standarddocka/verktyg/titta.ts --ut <mapp> [--plats 4] [--kamera spel,plats7,sida] [--tider 0,1.5,3.2]
//        Stillbilder: <kamera>-<sekunder>.png (bara bilden, utan panelen) och lage.json med editorns state() vid varje
//        tid (händernas, armbågarnas och kortets lägen i meter, vilken del, blicken, armarnas luft över bordskanten, fel).
//   node standarddocka/verktyg/titta.ts --spela-in hela|given|<första>-<sista> [--plats 4] [--kamera spel,plats1,plats7]
//        Filmar genom editorn (delarna räknas från 0; given är kortet ut och handen tillbaka): klippen hamnar i
//        standarddocka/klipp/, och deras namn skrivs ut.
//   node standarddocka/verktyg/titta.ts --spela-in runda [--kamera plats1,plats2,plats3,plats4,plats5,plats6,plats7]
//        Hela rundan i en tagning (vilan till skon och sedan första kortet till plats 7 … 1, med en exakt stillhet vid
//        skon efter varje): en film per kamera, standarddocka/klipp/runda-c1-<kamera>-<docka>[-nyckel].mp4, och
//        klipplistan standarddocka/klipp/runda-c1-<docka>.json (rutor per sekund, antal rutor, och för varje klipp namnet,
//        första och sista rutan, rutan där kortet ligger och rutan där handen är tillbaka; skarvarna och stillheten mätta).
//        --runda visar rundan i stället för en plats också för stillbilder, --kor och --spela-in <första>-<sista>: i ett
//        svep, utan stillheten vid skon, som editorn visar den; --stillhet lägger in stillheten, som i tagningen ovan.
//        --liv [--fro 1] lägger på rundans små egna rörelser och blinkning (editor/rorelse.ts medRundliv; --liv
//        andning,blinkning bara de delarna): filmerna heter då …-liv.mp4 och klipplistan runda-c1-<docka>-liv.json, så
//        att tagningen utan dem står kvar.
//   Gemensamt: [--fart 0:1.5,1:1.2]  farten för en del, utan att spara     [--utan platser,stol,bord,docka,kort,sko]  dölj det
//              [--spara]  som knappen Spara: skriver om rorelser/<namn>.json och dess .rutor.json ur det som står i
//                         filen (efter att ändringar har skrivits in i den för hand), innan --fart, --liv och --andring
//                         läggs på; stannar med ett fel om lagret har fel eller hör till en äldre rörelse
//              [--kulor]  visa handtagen     [--panel]  hela fönstret med panelen     [--storlek 1600x1000]     [--port 4321]
//              [--utseende nyckel]  rena färger på bakgrund, bord och kort (editor/scen.ts), för film där dealern ska skiljas ut
//              [--docka man|kvinna]  förra standardens bord med mannen eller kvinnan (samma rörelse och samma sparade
//                         lager); --uppsattning forra räcker för mannen, och --runda och --vilan väljer det bordet själva
//              [--uppsattning live] [--docka danilo|frasse|<en persons docka, dealer3d/src/persondockor.ts>]  förvalet utan ord: det klonade livebordet genom sin egen kamera
//                         (spel är livebordets, 1728 x 972, och inspelningen görs i den storleken), med Danilo (förval) eller
//                         Frasse. Platsen väljer dockans lyfta giv dit (lyft-<docka>-p<plats>),
//                         --giv lyft-danilo-vantan-1 vilken lyft rörelse som helst; den spelas som den är, från vilan till
//                         vilan i sin egen takt (editor/editor.ts LIVEBORD). Klippen heter live-<rörelsen>-<del>-<kamera>-<docka>
//                         (kameran: kameran, sidan, uppifran, plats-N). Inte med --runda eller --vilan.
//                         --sekvens vantan-1,p7,p4,p2,vantan-2 (namnen efter lyft-<docka>-; 1: väntan 1, alla dockans
//                         lyfta givar närmast skon först och väntan 2) spelar dem efter varandra i en tagning, med korten kvar på bordet
//                         (editor/rorelse.ts sekvens); klippet heter då live-sekvens-<namnen>-hela-<kamera>-<docka>.
//              [--utan-vridben]  underarmens vridning läggs på ForeArm som i en docka utan vridben (för att jämföra)
//              [--bord <namn>] [--modell <namn>]  en modell på prov: standardbord_<namn>.glb eller standarddocka_<namn>.glb
//                         ur avatar-auto-pipeline/assets, för den som bygger om bordet eller dockan
//              [--liv andning,huvud,blick,hand,kropp] [--fro 1]  de små egna rörelserna på, med slumpens frö (utan att spara);
//                         i rundan räcker --liv (alla rundans delar, ansiktets med)
//              [--giv <namn>] [--vilan <namn>]  en grundrörelse på prov (en fil i blackjack-dealer/dealer3d/data, utan .json)
//                         i stället för platsens giv eller vilan till skon, utan det sparade lagret
//              [--andring '<json>']  en ändring som window.editor.addChange tar ({"led": "hogerArmbage", "tid": 1.2,
//                         "flytt": [0.28, 0.05, 0.05]}; tid i filmens sekunder), lagd efter --spara och före bilderna, utan
//                         att sparas; flera gånger för flera ändringar
//              [--kor "<uttryck>"]  räknar ett uttryck i sidan (window.editor …) efter att allt ovan är ställt, och skriver
//                         svaret som JSON; går också utan --ut och --spela-in. Skriv det på en rad: i Windows klipps
//                         argumentet vid första radbrytningen. Ett uttryck i ansiktet vid en tid, också i en inspelning:
//                         --kor "window.editor.uttryck('koncentrerad', 1, {fran: 1.1, till: 2.2})"
//              [--uttryck leende,rynkad-panna:0.5|alla]  stillbilder av ansiktsuttryck (editor/rorelse.ts UTTRYCK, med
//                         styrka efter kolon, förval 1): en bild per uttryck, kamera och tid, <kamera>-<sekunder>-<uttryck>.png
//   Kameror: spel (spelets vy, plats 4: standarden; det äldre namnet lag går också), plats1 … plats7 (samma vy från
//   de andra platserna), sida, topp, och film (den gamla, brantare kameran). Tider är filmens sekunder.
//   Nära en hand eller kortet, för fingrarna: narahoger, naravanster, narakort. Kameran står då --nara-fran x,y,z meter
//   från handens mitt i varje bild (förval 0,0.2,0.36: snett uppifrån spelarnas sida; -0.3,0.1,0 är från hans högra sida).
//   Nära ansiktet, för en blinkning eller en min: naraansikte (förval rakt framifrån, lite underifrån).
//
// Startar en egen editorserver för körningen och ett headless Chrome under det delade låset för grafikkortet
// (../slask/blackjack-dealer/gpu-och-headless.lock, som blackjack-dealer/tools/lab-look.ts takeLock tar det: väntar högst
// tre minuter, och ett lås som är äldre än 20 minuter är kvar efter en körning som dog och tas över), och stänger allt
// efter sig.
import {spawn} from 'node:child_process';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromePath, releaseLock, takeLock} from '../../blackjack-dealer/tools/lab-look.ts';
import {lasUppsattning, valdUppsattning} from '../../blackjack-dealer/src/uppsattning.ts';
import {dockorna} from '../editor/dockval.ts';

const arg = (name: string, fallback?: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const flag = (name: string) => process.argv.includes(name);
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), LOCK = path.join(ROOT, 'slask/blackjack-dealer/gpu-och-headless.lock');
const PORT = Number(arg('--port', '4321')), plats = Number(arg('--plats', '4')), [W, H] = arg('--storlek', '1600x1000')!.split('x').map(Number);
const kameror = arg('--kamera', 'spel')!.split(',').filter(Boolean), tider = arg('--tider', '0')!.split(',').map(Number), ut = arg('--ut'), spelaIn = arg('--spela-in');
const fart = (arg('--fart', '') ?? '').split(',').filter(Boolean).map(x => x.split(':').map(Number)), utan = (arg('--utan', '') ?? '').split(',').filter(Boolean);
const andringar = process.argv.flatMap((x, i) => x === '--andring' ? [JSON.parse(process.argv[i + 1] ?? 'null')] : []);
if (andringar.some(a => !a || typeof a !== 'object' || typeof a.led !== 'string')) throw Error('--andring tar en ändring som JSON med minst "led".');
const kor = arg('--kor'), naraFran = arg('--nara-fran')?.split(',').map(Number), NARA: Record<string, string> = {narahoger: 'hogerHand', naravanster: 'vansterHand', narakort: 'kort', naraansikte: 'ansikte'};
/** Hela rundan i en tagning (editorns ?runda=1) i stället för en plats. */
const runda = spelaIn === 'runda' || flag('--runda');
/** Rundans små egna rörelser (editorns ?liv=): --liv ensam är alla delarna, --liv <delar> bara de; '' när de är av. */
const rundliv = runda && flag('--liv') ? (/^[a-z,]+$/.test(arg('--liv') ?? '') ? arg('--liv')! : '1') : '';
if (!spelaIn && !ut && !kor) throw Error('Säg vart bilderna ska: --ut <mapp>, eller --spela-in hela|given|runda|<första>-<sista>, eller --kor "<uttryck>".');
if (runda && (arg('--giv') || arg('--vilan'))) throw Error('Rundan spelar dockans egna rörelser: den går inte ihop med --giv eller --vilan.');
/**
 * Dockan och uppsättningen (editorns ?docka= och ?uppsattning=, blackjack-dealer/src/uppsattning.ts valdUppsattning): --uppsattning
 * live|forra (standard läses som forra), annars dockans bord (man och kvinna förra standardens, danilo och frasse livebordets),
 * annars livebordet, förvalet. Hela rundan och en vila på prov (--runda, --spela-in runda, --vilan) finns bara vid förra
 * standardens bord och väljer det själva. Dockan utan --docka: Danilo vid livebordet, mannen vid förra standardens.
 */
if (arg('--uppsattning') !== undefined && !lasUppsattning(arg('--uppsattning'))) throw Error(`--uppsattning tar live (förvalet) eller forra, fick ${arg('--uppsattning')}.`);
const uppsattning = valdUppsattning(arg('--uppsattning'), arg('--docka') ?? (runda || arg('--vilan') ? 'man' : null)), livebord = uppsattning === 'live';
const docka = arg('--docka') ?? (livebord ? 'danilo' : 'man');
const LIVEDOCKOR = dockorna('live'); // Danilo, Frasse och en persons docka ur sina bilder (dealer3d/src/persondockor.ts)
if (!['man', 'kvinna', ...LIVEDOCKOR].includes(docka)) throw Error(`--docka tar man, kvinna eller ${LIVEDOCKOR.join(', ')}, fick ${docka}.`);
if (livebord !== LIVEDOCKOR.includes(docka)) throw Error(livebord ? `Vid livebordet sitter ${LIVEDOCKOR.join(', ')}: --docka ${LIVEDOCKOR.join(' eller ')}.` : 'Vid förra standardens bord sitter mannen och kvinnan: --docka man eller kvinna.');
const sekvens = arg('--sekvens');
if (sekvens !== undefined && (!livebord || !/^[a-z0-9][a-z0-9,-]*$/.test(sekvens) || arg('--giv'))) throw Error('--sekvens tar en lista av lyfta rörelser (vantan-1,p2,p4 eller 1), vid livebordet och utan --giv.');
if (livebord && (runda || arg('--vilan'))) throw Error('Vid livebordet spelas en lyft rörelse i taget, från vilan till vilan: inte med --runda, --spela-in runda eller --vilan.');
if (naraFran && (naraFran.length !== 3 || !naraFran.every(Number.isFinite))) throw Error('--nara-fran tar tre tal: x,y,z i meter.');
if (![PORT, plats, W, H, ...tider].every(Number.isFinite) || plats < 1 || plats > 7) throw Error('--plats tar 1–7, och --tider, --storlek och --port tar tal.');
for (const namn of ['--giv', '--vilan', '--bord', '--modell']) { const v = arg(namn); if (v !== undefined && !/^[a-z0-9][a-z0-9_-]*$/.test(v)) throw Error(`${namn} tar ett namn (små bokstäver, siffror, - och _, utan filändelse), fick ${v}.`); }
/** Ansiktsuttrycken att ta stillbilder av: [namn, styrka]; 'alla' läses ur sidan. */
const uttrycksval = (arg('--uttryck', '') ?? '').split(',').filter(Boolean).map(x => { const [namn, s] = x.split(':'); return [namn, s === undefined ? 1 : Number(s)] as [string, number]; });
if (uttrycksval.some(([n, s]) => !/^[a-z][a-z-]*$/.test(n) || !(s >= 0 && s <= 1))) throw Error('--uttryck tar uttryckens namn med komma emellan (alla för alla), och en styrka 0–1 efter kolon: --uttryck leende,rynkad-panna:0.5.');
if (uttrycksval.length && !ut) throw Error('--uttryck är för stillbilder (med --ut). Ett uttryck i en inspelning läggs med --kor "window.editor.uttryck(namn, styrka, {fran, till})".');
if (spelaIn && kameror.some(k => NARA[k])) throw Error('Närbilderna (narahoger, naravanster, narakort, naraansikte) är stillbilder: de spelas inte in. Välj en vanlig kamera för --spela-in.');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Låset: som blackjack-dealer/tools/lab-look.ts tar det (väntar på den som har det, tar över ett som har legat i 20 minuter).
const LASRAD = `standarddocka/verktyg/titta.ts, plats ${plats}, ${new Date().toISOString()}, pid ${process.pid}`;
if (!await takeLock(LOCK, LASRAD, {maxWaitMs: 3 * 60 * 1000, say: rad => console.error(rad)})) throw Error(`Låset ${LOCK} är upptaget: ${await readFile(LOCK, 'utf8').catch(() => '?')}`);
const server = spawn(process.execPath, [path.join(ROOT, 'standarddocka/editor/server.ts'), '--port', String(PORT)], {stdio: 'ignore', windowsHide: true});
const profile = await mkdtemp(path.join(tmpdir(), 'standarddocka-chrome-'));
const chrome = spawn(chromePath(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11', `--window-size=${W},${H}`, 'about:blank'], {stdio: 'ignore', windowsHide: true});
let ws: WebSocket | undefined;
try {
  // (servern ska vara editorns: står något annat på porten, till exempel studions utvecklingsserver, startar vår inte)
  let vem = ''; for (let i = 0; i < 40 && vem !== 'standarddockans editor'; i++) { await sleep(250); vem = await fetch(`http://127.0.0.1:${PORT}/vem`, {signal: AbortSignal.timeout(1500)}).then(r => r.ok ? r.text() : `svar ${r.status}`).catch(() => ''); }
  if (vem !== 'standarddockans editor') throw Error(`Porten ${PORT} ${vem ? 'används av en annan server' : 'svarar inte'}: välj en annan med --port.`);
  let port = 0; for (let i = 0; i < 80 && !port; i++) { await sleep(250); port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')).split(/\r?\n/)[0]) || 0; }
  if (!port) throw Error('Chrome startade inte.');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method: 'PUT'})).json() as {webSocketDebuggerUrl: string};
  ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise<void>((ok, fel) => { ws!.onopen = () => ok(); ws!.onerror = () => fel(Error('DevTools svarade inte.')); });
  let nr = 0; const väntar = new Map<number, {ok(v: any): void; fel(e: Error): void}>();
  ws.onmessage = e => { const m = JSON.parse(String(e.data)), v = väntar.get(m.id); if (!v) return; väntar.delete(m.id); if (m.error) v.fel(Error(JSON.stringify(m.error))); else v.ok(m.result); };
  const cdp = (method: string, params: object = {}) => new Promise<any>((ok, fel) => { const id = ++nr; väntar.set(id, {ok, fel}); ws!.send(JSON.stringify({id, method, params})); });
  const kör = async (kod: string) => { const r = await cdp('Runtime.evaluate', {expression: kod, awaitPromise: true, returnByValue: true}); if (r.exceptionDetails) throw Error(`${kod.slice(0, 90)}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`); return r.result.value; };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Page.navigate', {url: `http://127.0.0.1:${PORT}/standarddocka/editor/?plats=${plats}&kamera=${kameror[0]}${flag('--kulor') ? '' : '&kulor=0'}${arg('--utseende') === 'nyckel' ? '&utseende=nyckel' : ''}&docka=${docka}&uppsattning=${uppsattning}${sekvens ? `&sekvens=${sekvens}` : ''}${arg('--giv') ? `&giv=${arg('--giv')}` : ''}${arg('--vilan') ? `&vilan=${arg('--vilan')}` : ''}${arg('--bord') ? `&bord=${arg('--bord')}` : ''}${arg('--modell') ? `&modell=${arg('--modell')}` : ''}${flag('--utan-vridben') ? '&vridben=0' : ''}${runda ? `&runda=1${spelaIn === 'runda' || flag('--stillhet') ? '&stillhet=1' : ''}${rundliv ? `&liv=${rundliv}&fro=${Number(arg('--fro', '1'))}` : ''}` : ''}`});
  for (let i = 0; ; i++) { await sleep(500); if (await kör('!!(window.editor && window.editor.ready)').catch(() => false)) break; if (i > 240) throw Error(`Editorn blev inte klar: ${await kör('document.querySelector("#fel").textContent').catch(() => '?')}`); }
  // Spara först, ur filen som den står: farten, de små rörelserna och ändringarna nedan sparas aldrig.
  if (flag('--spara')) console.log(`Sparat: ${JSON.stringify(await kör('window.editor.save()'))}`);
  for (const [del, ganger] of fart) await kör(`window.editor.fart(${del}, ${ganger})`);
  for (const vad of utan) await kör(`window.editor.visa(${JSON.stringify(vad)}, false)`);
  if (arg('--liv') && !runda) await kör(`window.editor.liv(${JSON.stringify(arg('--liv')!.split(',').filter(Boolean))}, ${Number(arg('--fro', '1'))})`);
  for (const a of andringar) await kör(`window.editor.addChange(${JSON.stringify(a)})`);

  if (kor) console.log(JSON.stringify(await kör(kor), null, 1));
  if (spelaIn) {
    const antal = await kör('window.editor.state().delar.length'), [forst, sist] = spelaIn === 'hela' || spelaIn === 'runda' ? [0, antal - 1] : spelaIn === 'given' ? [1, antal - 1] : spelaIn.split('-').map(Number);
    const klipp = await kör(`window.editor.spelaIn(${JSON.stringify(kameror)}, ${forst}, ${sist})`) as {fil: string; rutor: number; bytes: number}[];
    console.log(JSON.stringify({klipp, fel: await kör('window.editor.state().fel')}, null, 1));
    // Hela rundan: klipplistan bredvid filmerna, räknad av editorn ur rundan som spelades in (editor/rorelse.ts
    // klipplista), med skarvarna och stillheten mätta på rutorna. Bara när varje film är hel.
    if (spelaIn === 'runda') {
      // Med rundans små egna rörelser på heter filmerna och listan …-liv (editor.ts spelaIn), bredvid tagningen utan dem.
      const lista = await kör('window.editor.state().runda'), docka = arg('--docka') === 'kvinna' ? 'kvinna' : 'man', liv = lista.liv ? '-liv' : '', fil = `standarddocka/klipp/runda-c1-${docka}${liv}.json`;
      if (!klipp.length || klipp.some(k => k.rutor !== lista.rutor)) throw Error(`Inspelningen blev inte hel (${lista.rutor} rutor per film väntades): klipplistan skrevs inte.`);
      await writeFile(path.join(ROOT, fil), JSON.stringify({...lista, filmer: `runda-c1-<kamera>-${docka}[-nyckel]${liv}.mp4 i samma mapp; kameran är plats-1 … plats-7 (plats-4 är spelets vy)`, inspelad: new Date().toISOString()}, null, 1) + '\n');
      console.log(`Klipplistan: ${fil} (${lista.rutor} rutor, ${lista.sekunder} s, ${lista.klipp.length} klipp). Största hoppet i en skarv ${lista.matt.storstaHopp} mm, största skillnaden inom en stillhet ${lista.matt.storstaSkillnad} mm.`);
      // En tagning som inte är ren att klippa (matt.ren) är filmad och listad, men körningen slutar rött och säger varför.
      if (!lista.matt.ren) { console.error(`OBS, filma inte om den här tagningen till en person: ${String(await kör('document.querySelector("#status").textContent')).split('Obs: ')[1] ?? 'tagningen är inte ren att klippa.'}`); process.exitCode = 1; }
    }
  } else if (ut) {
    await mkdir(ut, {recursive: true}); const lage: Record<string, unknown> = {};
    const uttrycken: [string | null, number][] = uttrycksval.some(([n]) => n === 'alla') ? (await kör('window.editor.state().uttryck.finns') as string[]).map(n => [n, 1]) : uttrycksval.length ? uttrycksval : [[null, 1]];
    for (const k of kameror) for (const t of tider) for (const [u, styrka] of uttrycken) {
      await kör(NARA[k] ? `window.editor.setTime(${t}); window.editor.nara(${JSON.stringify(NARA[k])}${naraFran ? `, ${JSON.stringify(naraFran)}` : ''})` : `window.editor.setKamera(${JSON.stringify(k)}); window.editor.setTime(${t})`);
      if (u) await kör(`window.editor.uttryck(${JSON.stringify(u)}, ${styrka})`); await sleep(120);
      const r = await kör('(() => { const r = document.querySelector("#yta").getBoundingClientRect(); return {x: r.left, y: r.top, width: r.width, height: r.height}; })()');
      const png = await cdp('Page.captureScreenshot', flag('--panel') ? {format: 'png'} : {format: 'png', clip: {...r, scale: 1}});
      await writeFile(path.join(ut!, `${k}-${t.toFixed(2)}${u ? `-${u}${styrka !== 1 ? `-${styrka}` : ''}` : ''}.png`), Buffer.from(png.data, 'base64'));
      if (k === kameror[0] && u === uttrycken[0][0]) lage[t.toFixed(2)] = await kör('(() => { const s = window.editor.state(); delete s.platser; delete s.stol; delete s.skarv; return s; })()');
    }
    if (uttrycksval.length) await kör('window.editor.uttryck(null)');
    await writeFile(path.join(ut!, 'lage.json'), JSON.stringify(lage, null, 1));
    console.log(`${kameror.length * tider.length * uttrycken.length} bilder och lage.json i ${ut}`);
  }
  await cdp('Browser.close').catch(() => {});
} finally {
  try { ws?.close(); } catch { /* redan stängd */ }
  chrome.kill(); server.kill(); await sleep(800);
  await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 400}).catch(() => {});
  releaseLock(LOCK, LASRAD);
}
