// Tittar på en rörelse i editorn utan fönster: stillbilder ur valda kameror vid valda tider, med editorns egna mått, eller
// en inspelning. För en agent som ska granska en rörelse eller göra ett klipp; Jakob använder editorn själv.
//
//   node standarddocka/verktyg/titta.ts --ut <mapp> [--plats 4] [--kamera lag,plats7,sida] [--tider 0,1.5,3.2]
//        Stillbilder: <kamera>-<sekunder>.png (bara bilden, utan panelen) och lage.json med editorns state() vid varje
//        tid (händernas, armbågarnas och kortets lägen i meter, vilken del, blicken, armarnas luft över bordskanten, fel).
//   node standarddocka/verktyg/titta.ts --spela-in hela|given|<första>-<sista> [--plats 4] [--kamera film,plats1,plats7]
//        Filmar genom editorn (delarna räknas från 0; given är kortet ut och handen tillbaka): klippen hamnar i
//        standarddocka/klipp/, och deras namn skrivs ut.
//   Gemensamt: [--fart 0:1.5,1:1.2]  farten för en del, utan att spara     [--utan platser,stol,bord]  dölj det
//              [--spara]  som knappen Spara: skriver om rorelser/<namn>.json och dess .rutor.json ur det som står i
//                         filen (efter att ändringar har skrivits in i den för hand)
//              [--kulor]  visa handtagen     [--panel]  hela fönstret med panelen     [--storlek 1600x1000]     [--port 4321]
//              [--utseende nyckel]  rena färger på bakgrund, bord och kort (editor/scen.ts), för film där dealern ska skiljas ut
//   Kameror: lag (lägre), film (spelets, plats 4), plats1 … plats7, sida, topp. Tider är filmens sekunder.
//
// Startar en egen editorserver för körningen och ett headless Chrome under det delade låset för grafikkortet
// (../slask/blackjack-dealer/gpu-och-headless.lock; väntar högst tre minuter på det), och stänger allt efter sig.
import {spawn} from 'node:child_process';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromePath} from '../../blackjack-dealer/tools/lab-look.ts';

const arg = (name: string, fallback?: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const flag = (name: string) => process.argv.includes(name);
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), LOCK = path.join(ROOT, 'slask/blackjack-dealer/gpu-och-headless.lock');
const PORT = Number(arg('--port', '4321')), plats = Number(arg('--plats', '4')), [W, H] = arg('--storlek', '1600x1000')!.split('x').map(Number);
const kameror = arg('--kamera', 'lag')!.split(',').filter(Boolean), tider = arg('--tider', '0')!.split(',').map(Number), ut = arg('--ut'), spelaIn = arg('--spela-in');
const fart = (arg('--fart', '') ?? '').split(',').filter(Boolean).map(x => x.split(':').map(Number)), utan = (arg('--utan', '') ?? '').split(',').filter(Boolean);
if (!spelaIn && !ut) throw Error('Säg vart bilderna ska: --ut <mapp>, eller --spela-in hela|given|<första>-<sista>.');
if (![PORT, plats, W, H, ...tider].every(Number.isFinite) || plats < 1 || plats > 7) throw Error('--plats tar 1–7, och --tider, --storlek och --port tar tal.');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Låset: skapas exklusivt, med vem som har det; väntar på den som har det.
await mkdir(path.dirname(LOCK), {recursive: true});
for (let i = 0; ; i++) {
  try { await writeFile(LOCK, `standarddocka/verktyg/titta.ts, plats ${plats}, ${new Date().toISOString()}\n`, {flag: 'wx'}); break; }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST' || i >= 90) throw Error(`Låset ${LOCK} är upptaget: ${await readFile(LOCK, 'utf8').catch(() => '?')}`); await sleep(2000); }
}
const server = spawn(process.execPath, [path.join(ROOT, 'standarddocka/editor/server.ts'), '--port', String(PORT)], {stdio: 'ignore', windowsHide: true});
const profile = await mkdtemp(path.join(tmpdir(), 'standarddocka-chrome-'));
const chrome = spawn(chromePath(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11', `--window-size=${W},${H}`, 'about:blank'], {stdio: 'ignore', windowsHide: true});
let ws: WebSocket | undefined;
try {
  let port = 0; for (let i = 0; i < 80 && !port; i++) { await sleep(250); port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')).split(/\r?\n/)[0]) || 0; }
  if (!port) throw Error('Chrome startade inte.');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method: 'PUT'})).json() as {webSocketDebuggerUrl: string};
  ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise<void>((ok, fel) => { ws!.onopen = () => ok(); ws!.onerror = () => fel(Error('DevTools svarade inte.')); });
  let nr = 0; const väntar = new Map<number, {ok(v: any): void; fel(e: Error): void}>();
  ws.onmessage = e => { const m = JSON.parse(String(e.data)), v = väntar.get(m.id); if (!v) return; väntar.delete(m.id); if (m.error) v.fel(Error(JSON.stringify(m.error))); else v.ok(m.result); };
  const cdp = (method: string, params: object = {}) => new Promise<any>((ok, fel) => { const id = ++nr; väntar.set(id, {ok, fel}); ws!.send(JSON.stringify({id, method, params})); });
  const kör = async (kod: string) => { const r = await cdp('Runtime.evaluate', {expression: kod, awaitPromise: true, returnByValue: true}); if (r.exceptionDetails) throw Error(`${kod.slice(0, 90)}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`); return r.result.value; };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Page.navigate', {url: `http://127.0.0.1:${PORT}/standarddocka/editor/?plats=${plats}&kamera=${kameror[0]}${flag('--kulor') ? '' : '&kulor=0'}${arg('--utseende') === 'nyckel' ? '&utseende=nyckel' : ''}`});
  for (let i = 0; ; i++) { await sleep(500); if (await kör('!!(window.editor && window.editor.ready)').catch(() => false)) break; if (i > 240) throw Error(`Editorn blev inte klar: ${await kör('document.querySelector("#fel").textContent').catch(() => '?')}`); }
  for (const [del, ganger] of fart) await kör(`window.editor.fart(${del}, ${ganger})`);
  for (const vad of utan) await kör(`window.editor.visa(${JSON.stringify(vad)}, false)`);
  if (flag('--spara')) console.log(`Sparat: ${JSON.stringify(await kör('window.editor.save()'))}`);

  if (spelaIn) {
    const antal = await kör('window.editor.state().delar.length'), [forst, sist] = spelaIn === 'hela' ? [0, antal - 1] : spelaIn === 'given' ? [1, antal - 1] : spelaIn.split('-').map(Number);
    const klipp = await kör(`window.editor.spelaIn(${JSON.stringify(kameror)}, ${forst}, ${sist})`);
    console.log(JSON.stringify({klipp, fel: await kör('window.editor.state().fel')}, null, 1));
  } else {
    await mkdir(ut!, {recursive: true}); const lage: Record<string, unknown> = {};
    for (const k of kameror) for (const t of tider) {
      await kör(`window.editor.setKamera(${JSON.stringify(k)}); window.editor.setTime(${t})`); await sleep(120);
      const r = await kör('(() => { const r = document.querySelector("#yta").getBoundingClientRect(); return {x: r.left, y: r.top, width: r.width, height: r.height}; })()');
      const png = await cdp('Page.captureScreenshot', flag('--panel') ? {format: 'png'} : {format: 'png', clip: {...r, scale: 1}});
      await writeFile(path.join(ut!, `${k}-${t.toFixed(2)}.png`), Buffer.from(png.data, 'base64'));
      if (k === kameror[0]) lage[t.toFixed(2)] = await kör('(() => { const s = window.editor.state(); delete s.platser; delete s.stol; delete s.skarv; return s; })()');
    }
    await writeFile(path.join(ut!, 'lage.json'), JSON.stringify(lage, null, 1));
    console.log(`${kameror.length * tider.length} bilder och lage.json i ${ut}`);
  }
  await cdp('Browser.close').catch(() => {});
} finally {
  try { ws?.close(); } catch { /* redan stängd */ }
  chrome.kill(); server.kill(); await sleep(800);
  await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 400}).catch(() => {});
  await rm(LOCK, {force: true});
}
