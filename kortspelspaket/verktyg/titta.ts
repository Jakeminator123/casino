// Tar bilder av visaren utan fönster (headless Chrome), för den agent som ska se vad en ändring gjorde.
//   node kortspelspaket/verktyg/titta.ts <mapp för bilderna> <namn>=<frågan i adressen> [<namn>=<fråga> ...]
//   node kortspelspaket/verktyg/titta.ts slask/kortspelspaket/prov topp=vy=bord,kamera=topp,t=12.7 spel=vy=bord,kamera=spel,t=12.7
// Frågans delar skiljs med komma i stället för & (Windows kommandotolk klyver en rad vid &). Visaren ska vara igång (STARTA visaren.cmd, port 4330; --port för en annan). Varje bild väntar tills bordet och den
// valda rörelsen har kommit. Chrome och grafikkortet delas med de andra projekten: körningen tar det gemensamma låset
// (../slask/blackjack-dealer/gpu-och-headless.lock, blackjack-dealer/AGENTS.md "Servern") och lämnar det efter sig.
// Bilderna är arbete: lägg dem i slasken.
import {spawn} from 'node:child_process';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromePath, releaseLock, takeLock} from '../../blackjack-dealer/tools/lab-look.ts';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const PORT = Number(arg('--port') ?? 4330), W = Number(arg('--bredd') ?? 1440), H = Number(arg('--hojd') ?? 900);
const rest = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--'));
const [out, ...shots] = rest;
if (!out || !shots.length || shots.some(s => !/^[a-z0-9-]+=./.test(s))) { console.error('Användning: node kortspelspaket/verktyg/titta.ts <mapp> <namn>=<fråga> [...]'); process.exit(2); }
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), LOCK = path.join(ROOT, 'slask/blackjack-dealer/gpu-och-headless.lock');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const page = `http://127.0.0.1:${PORT}/kortspelspaket/visa/`;
if (await fetch(`http://127.0.0.1:${PORT}/vem`).then(r => r.text()).catch(() => '') !== 'kortspelspaketets visare') { console.error(`Visaren svarar inte på port ${PORT}: starta den med STARTA visaren.cmd.`); process.exit(1); }

const who = `kortspelspaket/verktyg/titta.ts ${process.pid}`;
if (!await takeLock(LOCK, who)) { console.error('Låset för headless Chrome är upptaget; försök igen om en stund.'); process.exit(1); }
const profile = await mkdtemp(path.join(tmpdir(), 'kortspelspaket-chrome-'));
const chrome = spawn(chromePath(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11', `--window-size=${W},${H}`, 'about:blank'], {stdio: 'ignore', windowsHide: true});
try {
  // Chrome skriver sin port i profilen; sidan nås sedan genom DevTools-protokollet.
  let port = 0;
  for (let i = 0; i < 100 && !port; i++) { await sleep(100); port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')).split('\n')[0]) || 0; }
  if (!port) throw Error('Chrome startade inte.');
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as {type: string; webSocketDebuggerUrl: string}[]).find(t => t.type === 'page');
  if (!target) throw Error('Chrome har ingen sida.');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((ok, fail) => { socket.onopen = () => ok(); socket.onerror = () => fail(Error('Fick ingen kontakt med Chrome.')); });
  let id = 0; const waiting = new Map<number, (result: Record<string, unknown>) => void>();
  // Sidans fel (ett kast, eller console.error) skrivs ut här: annars syns de bara som en bild av fel sak.
  const errors: string[] = [];
  socket.onmessage = e => {
    const m = JSON.parse(String(e.data));
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)!(m.result ?? {}); waiting.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params?.exceptionDetails?.exception?.description ?? m.params?.exceptionDetails?.text ?? 'ett fel'));
    else if (m.method === 'Runtime.consoleAPICalled' && m.params?.type === 'error') errors.push((m.params.args as {value?: unknown; description?: string}[]).map(a => a.description ?? String(a.value)).join(' '));
  };
  const send = (method: string, params: object = {}) => new Promise<Record<string, unknown>>(done => { waiting.set(++id, done); socket.send(JSON.stringify({id, method, params})); });
  await send('Runtime.enable');
  const evaluate = async (expression: string) => ((await send('Runtime.evaluate', {expression, returnByValue: true})).result as {value?: unknown} | undefined)?.value;
  await mkdir(path.resolve(ROOT, out), {recursive: true});
  for (const shot of shots) {
    const at = shot.indexOf('='), name = shot.slice(0, at), query = shot.slice(at + 1).replaceAll(',', '&');
    await send('Page.navigate', {url: `${page}?${query}`});
    // Klar: sidan står i sitt läge, den valda rörelsen har en längd, och varken bordet eller ett fel står uppe till höger.
    let state = '';
    for (let i = 0; i < 120; i++) {
      await sleep(250);
      state = String(await evaluate(`(() => { const l = document.getElementById('laddar')?.textContent ?? 'x', s = document.getElementById('sek')?.textContent ?? '', bord = ${JSON.stringify(query)}.includes('vy=bord'); return (bord ? document.body.className === 'bord' && !/bordet|Bygger/.test(l) : true) && (s.includes('/') || !${JSON.stringify(query)}.includes('rorelse=') && !bord) ? 'klar ' + l : 'väntar ' + l; })()`) ?? '');
      if (state.startsWith('klar')) break;
    }
    await sleep(1500); // kameran flyger fram och skuggorna ritas
    const png = (await send('Page.captureScreenshot', {format: 'png'})).data as string;
    const file = path.resolve(ROOT, out, `${name}.png`);
    await writeFile(file, Buffer.from(png, 'base64'));
    console.log(`${path.relative(ROOT, file).split(path.sep).join('/')}  (${state})`);
    for (const error of errors.splice(0)) console.log(`  sidans fel: ${error.split('\n').slice(0, 3).join(' | ')}`);
  }
  socket.close();
} finally {
  chrome.kill(); await sleep(800);
  await rm(profile, {recursive: true, force: true}).catch(() => {});
  releaseLock(LOCK, who);
}
