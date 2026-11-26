// Tar bilder och korta filmer av visaren utan fönster (headless Chrome), för den agent som ska se vad en ändring gjorde
// eller behöver en film av en rörelse.
//   node kortspelspaket/verktyg/titta.ts <mapp> <namn>=<frågan i adressen> [<namn>=<fråga> ...]
//   node kortspelspaket/verktyg/titta.ts slask/kortspelspaket/prov topp=vy=bord,kamera=topp,t=12.7 spel=vy=bord,kamera=spel,t=12.7
//   node kortspelspaket/verktyg/titta.ts <mapp> --film --fran 10.3 --till 14.3 giv3=vy=bord,kamera=spel,spelare=nej
//   --film            varje <namn>=<fråga> blir en film <namn>.mp4 i stället för en bild: rörelsen stegas bild för bild
//                     från --fran till --till (sekunder i den valda rörelsen), utan listan och knapparna (&ren=1)
//   --fps <n>         filmens bildtakt (förval 30, som rörelserna)
//   --bredd, --hojd   bildens mått (förval 1440 x 900)
//   --port <n>        visarens port (förval 4330)
// Frågans delar skiljs med komma i stället för & (Windows kommandotolk klyver en rad vid &). Visaren ska vara igång
// (STARTA visaren.cmd). Varje bild väntar tills bordet och den valda rörelsen har kommit, och sidans fel skrivs ut.
// Chrome och grafikkortet delas med de andra projekten: körningen tar det gemensamma låset
// (../slask/blackjack-dealer/gpu-och-headless.lock, blackjack-dealer/AGENTS.md "Servern") och lämnar det efter sig.
// Filmen görs av FFmpeg (H.264, som de flesta program läser). Bilderna och filmerna är arbete: lägg dem i slasken.
import {spawn, spawnSync} from 'node:child_process';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromePath, releaseLock, takeLock} from '../../blackjack-dealer/tools/lab-look.ts';

const FLAGS = ['--film'], VALUES = ['--port', '--bredd', '--hojd', '--fran', '--till', '--fps'];
const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const PORT = Number(arg('--port') ?? 4330), W = Number(arg('--bredd') ?? 1440), H = Number(arg('--hojd') ?? 900);
const FILM = process.argv.includes('--film'), FROM = Number(arg('--fran') ?? 0), TO = Number(arg('--till') ?? NaN), FPS = Number(arg('--fps') ?? 30);
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const rest = process.argv.slice(2).filter((a, i, all) => !FLAGS.includes(a) && !VALUES.includes(a) && !VALUES.includes(all[i - 1]));
const [out, ...shots] = rest;
if (!out || !shots.length || shots.some(s => !/^[a-z0-9-]+=./.test(s)) || (FILM && !(TO > FROM && FPS >= 1 && FPS <= 60))) {
  console.error('Användning: node kortspelspaket/verktyg/titta.ts <mapp> [--film --fran <s> --till <s>] <namn>=<fråga> [...]'); process.exit(2);
}
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
  // Bildytan får exakt de mått som är begärda (fönstrets egna mått kan skilja några bildpunkter).
  await send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: 1, mobile: false});
  const evaluate = async (expression: string) => ((await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true})).result as {value?: unknown} | undefined)?.value;
  const shoot = async () => Buffer.from((await send('Page.captureScreenshot', {format: 'png'})).data as string, 'base64');
  const folder = path.resolve(ROOT, out), said = (file: string) => path.relative(ROOT, file).split(path.sep).join('/');
  await mkdir(folder, {recursive: true});
  for (const shot of shots) {
    const at = shot.indexOf('='), name = shot.slice(0, at), asked = shot.slice(at + 1).replaceAll(',', '&');
    const query = FILM ? `${asked}&ren=1&t=${FROM}` : asked;
    await send('Page.navigate', {url: `${page}?${query}`});
    // Klar: sidan står i sitt läge, den valda rörelsen har en längd, och varken bordet eller ett fel står uppe till höger.
    let state = '';
    for (let i = 0; i < 120; i++) {
      await sleep(250);
      state = String(await evaluate(`(() => { const l = document.getElementById('laddar')?.textContent ?? 'x', s = document.getElementById('sek')?.textContent ?? '', bord = ${JSON.stringify(query)}.includes('vy=bord'); return (bord ? document.body.classList.contains('bord') && !/bordet|Bygger|Läser/.test(l) : true) && (s.includes('/') || !${JSON.stringify(query)}.includes('rorelse=') && !bord) ? 'klar ' + l : 'väntar ' + l; })()`) ?? '');
      if (state.startsWith('klar')) break;
    }
    await sleep(1500); // kameran flyger fram och skuggorna ritas
    if (!FILM) {
      const file = path.join(folder, `${name}.png`);
      await writeFile(file, await shoot());
      console.log(`${said(file)}  (${state})`);
    } else {
      // Rörelsen stegas med sidans eget reglage, en bild per ruta, och varje ruta tas när sidan har ritat den.
      const frames = path.join(folder, `${name}-rutor`), count = Math.round((TO - FROM) * FPS);
      await rm(frames, {recursive: true, force: true}); await mkdir(frames, {recursive: true});
      for (let i = 0; i < count; i++) {
        await evaluate(`(async () => { const s = document.getElementById('tid'); s.step = 'any'; s.value = '${(FROM + i / FPS).toFixed(4)}'; s.dispatchEvent(new Event('input')); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); })()`);
        await writeFile(path.join(frames, `r${String(i).padStart(4, '0')}.png`), await shoot());
      }
      // Färgerna märks som BT.709, så att filmen ser ut som bilden i webbläsaren (som standarddockans editor gör).
      const file = path.join(folder, `${name}.mp4`);
      const made = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(frames, 'r%04d.png'),
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-movflags', '+faststart', file], {encoding: 'utf8'});
      await rm(frames, {recursive: true, force: true});
      if (made.status !== 0) throw Error(made.error ? `FFmpeg kunde inte köras: ${made.error.message}` : `FFmpeg: ${made.stderr.trim()}`);
      console.log(`${said(file)}  (${count} rutor, ${W} x ${H}, ${FPS} bilder/s; ${state})`);
    }
    for (const error of errors.splice(0)) console.log(`  sidans fel: ${error.split('\n').slice(0, 3).join(' | ')}`);
  }
  socket.close();
} finally {
  chrome.kill(); await sleep(800);
  await rm(profile, {recursive: true, force: true}).catch(() => {});
  releaseLock(LOCK, who);
}
