// SAM 3D Body on a hired machine at RunPod, for the trial in live-bj/README.md ("Djup ur SAM 3D Body"): the body model
// needs an NVIDIA card, and this computer has none. Hires the cheapest card that is enough, sets the model up there,
// sends the pictures and blackjack-dealer/dealer3d/tools/docka-sam.py, runs it, brings sam.json home and destroys the
// machine. sam_runpod.py is what runs on the machine (serve) and what compares the answer with the truth (jamfor).
//
//   node live-bj/verktyg/sam_runpod.ts lista                     the balance and the account's machines (none is touched)
//   node live-bj/verktyg/sam_runpod.ts kor <ut-mapp> <bild.png> ... --box x0,y0,x1,y1 [--focal 2334]
//        [--facit <giv.json> --reserv <bild.png> --reserv-box x0,y0,x1,y1]   if SAM does not find the figure, one picture of a person to see that the model works
//        [--hogst-per-timme 0.35] [--minuter 90] [--tak 3]                 the most a card may cost an hour, and the ceilings for all runs together
//   node live-bj/verktyg/sam_runpod.ts stang <ut-mapp>           destroys every machine this tool started (from the ledger) that is still there
//
// The keys are read from the key file in the repository's root (RUNPOD_API_KEY, HF_TOKEN) inside this script and are
// never printed, logged or written: every line printed goes through hide(). HF_TOKEN goes to the hired machine as an
// environment variable, since the model's checkpoint is gated; the machine is destroyed afterwards. The machine's own
// service answers only calls that carry a secret made for the run.
//
// Money and time: the ledger <ut-mapp>/liggare.json keeps every machine started, its price an hour and its minutes. All
// runs together get at most --minuter (90) of machine time and --tak (3) USD; a run's machine is destroyed at its share of
// that time by a timer here, by a guard process started beside it (vakt, which survives this one), and in finally when
// anything fails. One machine at a time, no storage volume, nothing done to a machine this tool did not start.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {parseEnv} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PLAY_LENS, filmEye, see} from '../../blackjack-dealer/src/table-lens.ts';

const SELF = fileURLToPath(import.meta.url), HERE = path.dirname(SELF), CASINO = path.resolve(HERE, '..', '..');
const KEY_FILE = path.join(CASINO, '.env.local');
const SERVER = path.join(HERE, 'sam_runpod.py');
const READER = path.join(CASINO, 'blackjack-dealer', 'dealer3d', 'tools', 'docka-sam.py');
const API = 'https://api.runpod.io/v2';
// PyTorch's own small image (3.4 GB): Python 3.11 as sam-3d-body's INSTALL.md asks, and PyTorch 2.7.1, the least DINOv3 asks.
const IMAGE = 'pytorch/pytorch:2.7.1-cuda12.6-cudnn9-runtime', CUDA = '12.6';
const NAME = 'casino-sam-prov';
const PORT = 8000;
const NOT_FOUND_PX = 60;   // SAM's own 2D joints further than this from the figure's (median): it did not find the figure

class Halt extends Error {}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let runpodKey = '', hfToken = '', secret = '';
const hide = (text: string) => [runpodKey, hfToken, secret].filter(v => v.length > 6).reduce((t, v) => t.split(v).join('***'), String(text));
const say = (text: string) => console.log(hide(text));

function keys() {
  if (runpodKey) return;
  if (!existsSync(KEY_FILE)) throw new Halt('Nyckelfilen i repots rot saknas.');
  const env = parseEnv(readFileSync(KEY_FILE, 'utf8'));
  runpodKey = env.RUNPOD_API_KEY ?? '';
  hfToken = env.HF_TOKEN ?? '';
  if (!runpodKey) throw new Halt('RUNPOD_API_KEY saknas i nyckelfilen.');
}

type Answer = {status: number; ok: boolean; json: any; text: string};
async function api(method: string, route: string, body?: unknown, timeoutMs = 60000): Promise<Answer> {
  keys();
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(API + route, {method, headers: {Authorization: `Bearer ${runpodKey}`, 'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs)});
      const text = await r.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
      if (r.status === 429 && attempt < 5) { await sleep(1000 * Number(r.headers.get('retry-after') ?? 5)); continue; }
      return {status: r.status, ok: r.ok, json, text: hide(text).slice(0, 400)};
    } catch (e) {
      if (method === 'POST' || attempt >= 4) throw e;   // a create is never sent twice blindly
      await sleep(3000);
    }
  }
}

/** A machine in one line: never its environment, which holds the run's secrets. */
const brief = (p: any) => `${p.id} "${p.name}" ${p.status} ${p.gpu?.id ?? p.cpu?.id ?? '-'} ${p.cloud ?? ''} ${p.cost ?? '?'} USD/h${p.createdAt ? ` skapad ${p.createdAt}` : ''}`;

async function pods(): Promise<any[]> {
  const all: any[] = [];
  let cursor = '';
  for (let page = 0; page < 20; page++) {
    const r = await api('GET', `/pods${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
    if (!r.ok) throw new Halt(`Listan över maskiner: ${r.status} ${r.text}`);
    all.push(...(r.json?.pods ?? []));
    if (!r.json?.pagination?.hasNextPage) break;
    cursor = r.json.pagination.nextCursor;
  }
  return all;
}

async function balance(): Promise<number | null> {
  const r = await api('GET', '/billing/balance');
  if (!r.ok) { say(`  saldot gick inte att läsa: ${r.status} ${r.text}`); return null; }
  return r.json?.balanceAmount ?? null;
}

async function lista() {
  const b = await balance();
  say(`Saldo: ${b ?? '?'} USD`);
  const all = await pods();
  say(`Maskiner på kontot: ${all.length}`);
  for (const p of all) say(`  ${brief(p)}`);
}

// ── The ledger ────────────────────────────────────────────────────────────────

type Entry = {id: string; name: string; gpu: string; cloud: string; perHour: number; created: string; ended?: string; minutes?: number; usd?: number; how?: string};
type Ledger = {about: string; pods: Entry[]};
const ledgerFile = (out: string) => path.join(out, 'liggare.json');
const readLedger = (out: string): Ledger => existsSync(ledgerFile(out)) ? JSON.parse(readFileSync(ledgerFile(out), 'utf8'))
  : {about: 'Varje maskin som live-bj/verktyg/sam_runpod.ts har hyrt hos RunPod: pris i timmen, minuter och kostnad (pris gånger tid, skattad).', pods: []};
const saveLedger = (out: string, book: Ledger) => { mkdirSync(out, {recursive: true}); writeFileSync(ledgerFile(out), JSON.stringify(book, null, 1) + '\n'); };
const minutesOf = (e: Entry) => e.minutes ?? (Date.now() - Date.parse(e.created)) / 60000;
const usdOf = (e: Entry) => e.usd ?? e.perHour * minutesOf(e) / 60;

/** Destroys a machine this tool started, and makes sure it is gone. */
async function terminate(id: string): Promise<boolean> {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const r = await api('DELETE', `/pods/${id}`);
      if (r.ok || r.status === 404) {
        const after = await api('GET', `/pods/${id}`);
        if (after.status === 404 || after.json?.status === 'TERMINATED') return true;
      } else say(`  stängningen: ${r.status} ${r.text}`);
    } catch (e) { say(`  stängningen: ${(e as Error).message}`); }
    await sleep(5000);
  }
  return false;
}

function closeEntry(out: string, id: string, how: string) {
  const book = readLedger(out), e = book.pods.find(p => p.id === id);
  if (!e || e.ended) return e;
  e.ended = new Date().toISOString();
  e.minutes = Math.round((Date.parse(e.ended) - Date.parse(e.created)) / 600) / 100;
  e.usd = Math.round(e.perHour * e.minutes / 60 * 10000) / 10000;
  e.how = how;
  saveLedger(out, book);
  return e;
}

// ── A run ───────────────────────────────────────────────────────────────────

function options(argv: string[]) {
  const named: Record<string, string> = {}, plain: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) named[argv[i].slice(2)] = argv[++i];
    else plain.push(argv[i]);
  }
  return {named, plain};
}

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

/** How far SAM's own 2D shoulders, elbows and wrists lie from the figure's true ones through the play lens (median pixels). */
function foundPx(sam: any, facitFile: string): number {
  const truth = JSON.parse(readFileSync(facitFile, 'utf8')), eye = filmEye(PLAY_LENS);
  const names: string[] = sam.keypointNames.map((n: string) => n.toLowerCase().replace(/[- ]/g, '_'));
  const d: number[] = [];
  for (const pic of sam.pictures) {
    const frame = truth.frames[Number(path.basename(pic.picture).replace(/\D/g, ''))];
    for (const [side, word] of [['R', 'right'], ['L', 'left']]) for (const [j, joint] of [['s', 'shoulder'], ['e', 'elbow'], ['w', 'wrist']]) {
      const i = names.indexOf(`${word}_${joint}`), p = frame && see(eye, frame[side][j]);
      if (i >= 0 && p) d.push(Math.hypot(pic.pixels[i][0] - p.x, pic.pixels[i][1] - p.y));
    }
  }
  return median(d);
}

async function kor(argv: string[]) {
  const {named, plain} = options(argv);
  const [out, ...pictures] = plain;
  const box = named.box, focal = Number(named.focal ?? 2334);
  const perHourMax = Number(named['hogst-per-timme'] ?? 0.35), minutesMax = Number(named.minuter ?? 90), usdMax = Number(named.tak ?? 3);
  if (!out || !pictures.length || !/^\d+(\.\d+)?(,\d+(\.\d+)?){3}$/.test(box ?? '')) throw new Halt('Använd: kor <ut-mapp> <bild.png> ... --box x0,y0,x1,y1 (se överst i filen).');
  for (const p of [...pictures, READER, SERVER, ...(named.reserv ? [named.reserv] : [])]) if (!existsSync(p)) throw new Halt(`${p} finns inte.`);
  keys();
  if (!hfToken) throw new Halt('HF_TOKEN saknas i nyckelfilen; modellen är spärrad utan den.');
  mkdirSync(out, {recursive: true});
  const book = readLedger(out);
  const usedMin = book.pods.reduce((s, e) => s + minutesOf(e), 0), usedUsd = book.pods.reduce((s, e) => s + usdOf(e), 0);
  const leftMin = minutesMax - usedMin;
  say(`Tidigare körningar: ${usedMin.toFixed(1)} min, ${usedUsd.toFixed(3)} USD. Kvar: ${leftMin.toFixed(1)} min och ${(usdMax - usedUsd).toFixed(3)} USD.`);
  if (leftMin < 25) throw new Halt('Mindre än 25 minuter kvar av maskintiden: ingen ny maskin.');
  const before = await balance();
  say(`Saldo före: ${before ?? '?'} USD`);
  const existing = await pods();
  say(`Maskiner på kontot före: ${existing.length}${existing.length ? ' (rörs inte)' : ''}`);
  for (const p of existing) say(`  ${brief(p)}`);
  const mine = existing.filter(p => String(p.name).startsWith(NAME) && p.status !== 'TERMINATED');
  if (mine.length) throw new Halt(`En maskin från det här verktyget finns redan (${mine.map(p => p.id).join(', ')}): stäng den först med stang.`);

  // The cheapest NVIDIA card with at least 8 GB that has stock, in either cloud.
  const cards: {id: string; cloud: string; price: number; memory: number; stock: string}[] = [];
  for (const cloud of ['COMMUNITY', 'SECURE']) {
    const r = await api('GET', `/catalog/gpus?include=AVAILABILITY&product=POD&cloud=${cloud}&minCudaVersion=${CUDA}`);
    if (!r.ok) { say(`  korten i ${cloud}: ${r.status} ${r.text}`); continue; }
    for (const g of r.json?.gpus ?? []) {
      const price = g.price?.[cloud.toLowerCase()];
      if (g.manufacturer === 'NVIDIA' && g.memory >= 8 && g.memory <= 48 && g.availability && g.availability !== 'NONE' && price > 0 && price <= perHourMax)
        cards.push({id: g.id, cloud, price, memory: g.memory, stock: g.availability});
    }
  }
  cards.sort((a, b) => a.price - b.price || b.memory - a.memory);
  const affordable = cards.filter(c => usedUsd + c.price * leftMin / 60 <= usdMax);
  say(`Kort som räcker, billigast först: ${affordable.slice(0, 8).map(c => `${c.id} ${c.cloud} ${c.price} USD/h ${c.memory} GB (${c.stock})`).join('; ') || 'inga'}`);
  if (!affordable.length) throw new Halt(`Inget NVIDIA-kort med minst 8 GB för högst ${perHourMax} USD i timmen har lediga maskiner just nu.`);

  secret = randomBytes(24).toString('hex');
  const name = `${NAME}-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;
  let pod: any = null, card: (typeof affordable)[number] | null = null;
  for (const c of affordable.slice(0, 8)) {
    const body = {
      name, image: IMAGE, gpu: {id: c.id, count: 1, minCudaVersion: CUDA, minRamPerGpu: 15}, cloud: c.cloud, disk: 40, ports: [`${PORT}/http`],
      env: {SAM_PROV_SECRET: secret, HF_TOKEN: hfToken, SAM_PROV_SERVER: readFileSync(SERVER).toString('base64'), MOMENTUM_ENABLED: '0',
            SAM_3D_BODY: '/work/sam-3d-body', TORCH_HOME: '/work/torch', PYTHONUNBUFFERED: '1', HF_HUB_DISABLE_TELEMETRY: '1'},
      entrypoint: ['bash', '-c'],
      cmd: ['mkdir -p /work && printf %s "$SAM_PROV_SERVER" | base64 -d > /work/sam_runpod.py && exec "$(command -v python3.11 || command -v python3)" -u /work/sam_runpod.py serve'],
    };
    let r: Answer;
    try { r = await api('POST', '/pods', body, 120000); }
    catch (e) {   // unknown whether it was made: look before anything else is tried
      await sleep(10000);
      pod = (await pods()).find(p => p.name === name) ?? null;
      if (pod) { card = c; break; }
      throw new Halt(`Beställningen av maskinen fick inget svar (${(e as Error).message}), och ingen maskin med namnet finns.`);
    }
    if (r.ok && r.json?.id) { pod = r.json; card = c; break; }
    say(`  ${c.id} (${c.cloud}) gick inte: ${r.status} ${r.text.slice(0, 200)}`);
    if ([401, 402, 403, 413, 422].includes(r.status)) break;
  }
  if (!pod || !card) throw new Halt('Ingen maskin gick att få.');
  const began = Date.now(), id: string = pod.id;
  const perHour = Number(pod.cost ?? card.price);
  book.pods.push({id, name, gpu: card.id, cloud: card.cloud, perHour, created: new Date(began).toISOString()});
  saveLedger(out, book);
  const deadline = began + (leftMin - 2) * 60000;
  const guard = spawn(process.execPath, [SELF, 'vakt', out, id, String(deadline)], {detached: true, stdio: 'ignore', windowsHide: true});
  guard.unref();
  const mins = () => `${((Date.now() - began) / 60000).toFixed(1)} min`;
  say(`Maskin ${id}: ${card.id} (${card.cloud}), ${perHour} USD/h. Stängs senast ${new Date(deadline).toLocaleTimeString('sv-SE')} (vakten: process ${guard.pid}).`);
  let closing: Promise<void> | null = null;
  const close = (how: string) => closing ??= (async () => {
    const gone = await terminate(id);
    const e = closeEntry(out, id, how);
    say(gone ? `Maskin ${id} förstörd efter ${e?.minutes} min: cirka ${e?.usd} USD.` : `VARNING: maskin ${id} gick inte att förstöra; kör stang.`);
  })();
  const timer = setTimeout(() => { say('Tiden är slut: maskinen stängs.'); void close('tiden slut').finally(() => process.exit(3)); }, deadline - Date.now());
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(signal, () => { void close('avbruten').finally(() => process.exit(130)); });

  try {
    if (perHour > perHourMax) throw new Halt(`Maskinen kostar ${perHour} USD/h, mer än ${perHourMax}.`);
    // 1. The machine up.
    let last = '';
    for (;;) {
      const r = await api('GET', `/pods/${id}`);
      const status = r.json?.status ?? `http ${r.status}`;
      if (status !== last) { say(`${mins()} maskinen: ${status}`); last = status; }
      if (status === 'RUNNING') break;
      if (status === 'TERMINATED' || status === 'ERROR') throw new Halt(`Maskinen: ${status}.`);
      if (Date.now() - began > 25 * 60000) throw new Halt('Maskinen kom inte igång på 25 minuter.');
      await sleep(10000);
    }
    // 2. The model set up.
    const base = `https://${id}-${PORT}.proxy.runpod.net`;
    const call = (method: string, route: string, body?: BodyInit, kind?: string) =>
      fetch(base + route, {method, body, headers: {'X-Sam-Prov': secret, ...(kind ? {'Content-Type': kind} : {})}, signal: AbortSignal.timeout(95000)});
    let stage = '', state: any = null;
    for (;;) {
      state = null;
      try { const r = await call('GET', '/status'); if (r.status === 200) state = await r.json(); } catch { /* not up yet */ }
      if (state && state.stage !== stage) { say(`${mins()} igångsättningen: ${state.stage}`); stage = state.stage; }
      if (state?.stage === 'ready') break;
      if (state?.stage === 'failed') { say(state.log); throw new Halt(`Igångsättningen föll: ${state.failed}`); }
      if (Date.now() - began > 50 * 60000) { if (state) say(state.log); throw new Halt('Modellen var inte på plats efter 50 minuter.'); }
      await sleep(15000);
    }
    say(String(state.log).split('\n').filter((l: string) => !/^\s*(Requirement already|Collecting|Downloading|Using cached|Installing|Attempting|Found existing|Uninstalling|Successfully uninstalled)/.test(l)).slice(-14).join('\n'));
    // 3. The reader and the pictures over.
    const send = async (file: string, as: string) => {
      const r = await call('PUT', `/in/${as}`, readFileSync(file), 'application/octet-stream');
      if (!r.ok) throw new Halt(`Uppladdningen av ${as}: ${r.status}`);
    };
    await send(READER, 'docka-sam.py');
    for (const p of pictures) await send(p, path.basename(p));
    say(`${mins()} uppe: docka-sam.py och ${pictures.length} bilder`);
    // 4. The run, and its answer home.
    const job = async (folder: string, names: string[], around: string) => {
      const cmd = ['PYTHON', '-I', '-B', '/work/in/docka-sam.py', `/work/out/${folder}`, ...names.map(n => `/work/in/${n}`), '--box', around, '--focal', String(focal)];
      const r = await call('POST', '/job', JSON.stringify({cmd}), 'application/json');
      if (!r.ok) throw new Halt(`Körningen startade inte: ${r.status}`);
      const {job: key} = await r.json() as {job: string};
      let from = 0;
      for (;;) {
        await sleep(5000);
        let j: any;
        try { const q = await call('GET', `/job/${key}?from=${from}`); if (!q.ok) continue; j = await q.json(); } catch { continue; }
        if (j.log) { process.stdout.write(hide(j.log)); from = j.size; }
        if (j.done) { if (j.code !== 0) throw new Halt(`docka-sam.py slutade med ${j.code}.`); break; }
        if (Date.now() > deadline - 3 * 60000) throw new Halt('Tiden räcker inte för körningen.');
      }
      const got = await call('GET', `/out/${folder}/sam.json`);
      if (!got.ok) throw new Halt(`sam.json kom inte hem: ${got.status}`);
      const text = await got.text();
      writeFileSync(path.join(out, `${folder}.json`), text);
      say(`${mins()} ${path.join(out, `${folder}.json`)}`);
      return JSON.parse(text);
    };
    const sam = await job('sam', pictures.map(p => path.basename(p)), box!);
    if (named.facit) {
      const px = foundPx(sam, named.facit);
      say(`SAM:s egna 2D-leder från dockans sanna (axlar, armbågar, handleder): ${px.toFixed(1)} bildpunkter i median.`);
      if (px > NOT_FOUND_PX && named.reserv) {
        say('SAM hittade inte dockan: en bild av en person, för att se att modellen fungerar.');
        await send(named.reserv, path.basename(named.reserv));
        const extra = await job('reserv', [path.basename(named.reserv)], named['reserv-box'] ?? box!);
        say(`Reserven: ${extra.pictures.length} bild, återprojektion ${extra.pictures[0]?.reprojectionMaxPx} px.`);
      }
    }
  } finally {
    clearTimeout(timer);
    await close('klar');
    try {
      const left = (await pods()).filter(p => String(p.name).startsWith(NAME) && p.status !== 'TERMINATED');
      say(left.length ? `VARNING: kvar från det här verktyget: ${left.map(brief).join('; ')}` : 'Ingen maskin från det här verktyget finns kvar på kontot.');
      const after = await balance();
      say(`Saldo efter: ${after ?? '?'} USD${before != null && after != null ? ` (skillnad ${(before - after).toFixed(4)} USD; saldot kan släpa)` : ''}`);
      const bill = await api('GET', `/billing/pods?podId=${id}&bucketSize=hour&lastN=3`);
      if (bill.ok) say(`Fakturerat för maskinen hittills: ${bill.json?.metadata?.totals?.totalAmount ?? '?'} USD (kan släpa)`);
    } catch (e) { say(`Efterkontrollen: ${(e as Error).message}`); }
  }
}

/** Beside a run: sleeps until the run's deadline and destroys its machine if it is still there. */
async function vakt(out: string, id: string, deadline: number) {
  while (Date.now() < deadline) {
    await sleep(Math.min(30000, Math.max(1000, deadline - Date.now())));
    try {
      const r = await api('GET', `/pods/${id}`);
      if (r.status === 404 || r.json?.status === 'TERMINATED') return;
    } catch { /* keep watching */ }
  }
  if (await terminate(id)) closeEntry(out, id, 'vakten');
}

async function stang(out: string) {
  const book = readLedger(out), live = new Map((await pods()).map(p => [p.id, p]));
  for (const e of book.pods) {
    const p = live.get(e.id);
    if (p && p.status !== 'TERMINATED') {
      say(`Stänger ${brief(p)}`);
      say((await terminate(e.id)) ? '  förstörd' : '  gick inte');
    }
    closeEntry(out, e.id, 'stang');
  }
  say(`Liggaren: ${readLedger(out).pods.map(e => `${e.id} ${e.gpu} ${e.minutes} min ${e.usd} USD`).join('; ') || 'tom'}`);
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === 'lista') await lista();
  else if (command === 'kor') await kor(rest);
  else if (command === 'stang') await stang(rest[0]);
  else if (command === 'vakt') await vakt(rest[0], rest[1], Number(rest[2]));
  else throw new Halt('Använd: lista, kor, stang (se överst i filen).');
  process.exit(0);
} catch (e) {
  console.error(hide(e instanceof Halt ? e.message : `${(e as Error).stack ?? e}`));
  process.exit(1);
}
