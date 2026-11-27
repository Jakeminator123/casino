// Skyddar: publiceringsskyddet för Youtubefilmen – Spegla strömmar filmen bara på studions server på den här datorn, och
// kopian på nätet kan aldrig få med filmen, rutor ur den eller vägarna dit. Och sambandet mellan dockans ruta och filmens
// sekund som sidan visar: det som lyftet säger, ruta för ruta.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {handleSpegla, tiderFor, LOCAL_HOST, type Probe, type Spegling} from './spegla-routes.ts';
import {safeRelative} from './studio-freeze.ts';
import {PAGES, SCENE_FILES, SCRIPTS, VENDOR} from './lab-routes.ts';
import {START_CHAIN, START_TILES} from '../studio/lib/start.ts';

const BJ = path.resolve(import.meta.dirname, '..');

// ── En egen liten casino-mapp med en film, ett lyft, dockans rörelse, en inspelning och ett prov med en persons film ──
const root = mkdtempSync(path.join(tmpdir(), 'spegla-'));
const put = (rel: string, body: string | Buffer, mtime?: number) => {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), {recursive: true});
  writeFileSync(file, body);
  if (mtime) utimesSync(file, mtime, mtime);
};
const FILM = Buffer.from(Array.from({length: 1000}, (_, i) => i % 251));
const T = 1_800_000_000;
put('live-bj/video/kalla.mp4', FILM);
put('live-bj/data/kalla.json', JSON.stringify({width: 1920, height: 1080, fps: 60, crop: {x: 96, y: 71, width: 1728, height: 972}}));
put('live-bj/data/lyft/kameran-mitten-plats-4.json', JSON.stringify({docka: 'danilo', frames: Array.from({length: 10}, (_, i) => ({t: Math.round((10 + i / 30) * 1000) / 1000}))}));
const rorelse = (docka: string) => JSON.stringify({fps: 30, frameCount: 6, doll: docka, made: {lift: 'live-bj/data/lyft/kameran-mitten-plats-4.json', liftFrom: 6, times: {arrive: 1, meet: 3, ligger: 4}}});
put('blackjack-dealer/dealer3d/data/lyft-danilo-p4.json', rorelse('danilo'), T);
put('blackjack-dealer/dealer3d/data/lyft-kenji-p4.json', rorelse('kenji'), T);
put('standarddocka/klipp/live-lyft-danilo-p4-hela-kameran-danilo.mp4', 'docka', T + 60);
put('blackjack-dealer/assets/proofs/prov-a/original/dockfilm-lyft-kenji-p4-nyckel.mp4', 'nyckel');
for (const name of ['03-dockfilmen-given.mp4', '05-kenji-ger.mp4', '06-samma-i-halv-fart.mp4']) put(`blackjack-dealer/assets/proofs/prov-a/${name}`, name);
// (ett prov vars omgång ligger en mapp ned, där ny_dealer.py --omgang lägger dockfilmen)
put('blackjack-dealer/assets/proofs/prov-b/original/v4/dockfilm-lyft-kenji-p4-nyckel.mp4', 'nyckel');
put('blackjack-dealer/assets/proofs/prov-b/01-kenji-tre-klipp.mp4', 'tre klipp');
const PROBES: Record<string, Probe> = {
  'live-lyft-danilo-p4-hela-kameran-danilo.mp4': {width: 1728, height: 972, fps: 30, frames: 6},
  '03-dockfilmen-given.mp4': {width: 1728, height: 972, fps: 30, frames: 6},
  '01-kenji-tre-klipp.mp4': {width: 1728, height: 972, fps: 30, frames: 6},
  '05-kenji-ger.mp4': {width: 1728, height: 972, fps: 30, frames: 6},
  '06-samma-i-halv-fart.mp4': {width: 1728, height: 972, fps: 30, frames: 12},
};
const probe = async (file: string) => PROBES[path.basename(file)] ?? null;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (!await handleSpegla(req, res, url, {casino: root, probe})) res.writeHead(418).end();
});
await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
const port = (server.address() as {port: number}).port;
test.after(() => { server.close(); rmSync(root, {recursive: true, force: true}); });

/** En fråga till vägarna, med den Host och de huvuden som ges (studions egen Host som förval). */
function ask(p: string, headers: Record<string, string> = {}, method = 'GET'): Promise<{status: number; body: Buffer; headers: http.IncomingHttpHeaders}> {
  return new Promise((done, fail) => {
    const req = http.request({host: '127.0.0.1', port, path: p, method, headers: {host: LOCAL_HOST, ...headers}}, res => {
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => done({status: res.statusCode ?? 0, body: Buffer.concat(chunks), headers: res.headers}));
    });
    req.on('error', fail);
    req.end();
  });
}
const list = async () => JSON.parse((await ask('/api/spegla')).body.toString('utf8')) as Spegling;

test('Youtubefilmen and the recordings are handed out only to the studio on this computer', async () => {
  for (const p of ['/api/spegla', '/api/spegla/film', '/api/spegla/klipp/live-lyft-danilo-p4-hela-kameran-danilo.mp4']) {
    for (const host of ['example.com', 'dealer-lake.vercel.app', '127.0.0.1:4320', 'localhost:4319']) {
      const r = await ask(p, {host});
      assert.equal(r.status, 403, `${p} via ${host}`);
      assert.ok(!r.body.includes(FILM.subarray(0, 64)), 'no byte of the film');
    }
    assert.equal((await ask(p, {'sec-fetch-site': 'cross-site'})).status, 403, `${p} from another site`);
    assert.equal((await ask(p, {'sec-fetch-site': 'same-site'})).status, 403, `${p} from a neighbour site`);
    assert.equal((await ask(p, {}, 'POST')).status, 405);
  }
  assert.equal((await ask('/api/spegla/film', {'sec-fetch-site': 'same-origin'})).status, 200);
});

test('the film streams where it lies, in byte ranges, and nothing outside the folders is reached', async () => {
  const part = await ask('/api/spegla/film', {range: 'bytes=100-199'});
  assert.equal(part.status, 206);
  assert.equal(part.headers['content-range'], `bytes 100-199/${FILM.length}`);
  assert.deepEqual(part.body, FILM.subarray(100, 200));
  assert.deepEqual((await ask('/api/spegla/film', {range: 'bytes=-10'})).body, FILM.subarray(FILM.length - 10));
  assert.equal((await ask('/api/spegla/film', {range: 'bytes=5000-'})).status, 416);
  const whole = await ask('/api/spegla/film');
  assert.equal(whole.status, 200);
  assert.equal(whole.headers['accept-ranges'], 'bytes');
  assert.deepEqual(whole.body, FILM);
  for (const p of ['/api/spegla/klipp/..%2F..%2Flive-bj%2Fvideo%2Fkalla.mp4', '/api/spegla/klipp/live-lyft-x-hela-kameran-x.mp4', '/api/spegla/film%2F..%2Fkalla.json', '/api/spegla/annat'])
    assert.equal((await ask(p)).status, 404, p);
});

test("our frame k is shown against the film's second the lift has for it, and only fresh views are offered", async () => {
  const s = await list();
  assert.deepEqual(s.film, {url: '/api/spegla/film', bredd: 1920, hojd: 1080, fps: 60, ruta: {x: 96, y: 71, bredd: 1728, hojd: 972}});
  assert.equal(s.givar.length, 1, "Kenji's doll on Danilo's lift is a view of Danilo's give, not a give of its own");
  const [g] = s.givar;
  assert.equal(g.namn, 'Danilo, plats 4');
  // ruta k = lyftets ruta 6 + k, efter lyftets sista ruta (9) dess sista
  assert.deepEqual(g.tider, [10.2, 10.233, 10.267, 10.3, 10.3, 10.3]);
  assert.equal(g.lyftetTill, 3);
  assert.deepEqual(g.marken, {skon: 1, bytet: 3, ligger: 4});
  assert.deepEqual(g.var.map(v => v.namn), ['Dockan', 'Kenji 05', 'Kenji 01'], 'the doll film and the half-speed film are not a person in this give; a proof whose round lies one folder down is found too');
  assert.ok(!JSON.stringify(s).includes(root) && !JSON.stringify(s).includes('live-bj'), 'the answer names no folder of the machine and no path into live-bj');
  assert.deepEqual(tiderFor([1, 2, 3], 1, 4), {tider: [2, 3, 3, 3], lyftetTill: 1});
  assert.equal(tiderFor([1, 2, 3], 3, 2), null);

  // A recording older than the motion is not offered; a give with nothing to show is not listed.
  utimesSync(path.join(root, 'standarddocka/klipp/live-lyft-danilo-p4-hela-kameran-danilo.mp4'), T - 60, T - 60);
  assert.deepEqual((await list()).givar[0].var.map(v => v.id), ['prov-a/05-kenji-ger.mp4', 'prov-b/01-kenji-tre-klipp.mp4']);
  for (const [prov, fil] of [['prov-a', '05-kenji-ger.mp4'], ['prov-b', '01-kenji-tre-klipp.mp4']]) {
    PROBES[fil] = {width: 1728, height: 972, fps: 30, frames: 7};
    utimesSync(path.join(root, `blackjack-dealer/assets/proofs/${prov}/${fil}`), T + 1, T + 1);
  }
  assert.deepEqual((await list()).givar, []);
});

test('without the film on the machine there is no film, and its route finds nothing', async () => {
  rmSync(path.join(root, 'live-bj/video/kalla.mp4'));
  assert.equal((await list()).film, null);
  assert.equal((await ask('/api/spegla/film')).status, 404);
});

// ── Kopian på nätet ───────────────────────────────────────────────────────────────────────────────────────────────
const sources = (dir: string, ext = /\.(?:ts|tsx|mjs|js)$/): string[] => readdirSync(path.join(BJ, dir), {withFileTypes: true, recursive: true})
  .filter(e => e.isFile() && ext.test(e.name)).map(e => path.join(e.parentPath, e.name)).filter(f => !f.includes(`${path.sep}node_modules${path.sep}`));

test('the online copy can never carry Youtubefilmen, frames of it or the routes to it', () => {
  // The copy takes files only inside blackjack-dealer/ (studio-freeze safeRelative, build-studio-snapshot localFile): the film lies outside.
  for (const p of ['../live-bj/video/kalla.mp4', 'assets/../../live-bj/video/kalla.mp4', '..\\live-bj\\video\\kalla.mp4']) assert.equal(safeRelative(p), false, p);
  const served = [...Object.values(SCRIPTS), ...Object.values(VENDOR), ...Object.values(PAGES), ...SCENE_FILES];
  for (const p of served) assert.ok(safeRelative(p) && !/live-bj|spegla/i.test(p), `the copy's own files: ${p}`);
  // The build, the media upload and the lock never ask for Spegla or name the film.
  const FILM_OR_ROUTE = /\/api\/spegla|live-bj[\\/]+(?:video|rutor|matt)|kalla\.mp4/i;
  for (const file of [path.join(BJ, 'tools/build-studio-snapshot.ts'), path.join(BJ, 'tools/studio-freeze.ts'), path.join(BJ, 'tools/sync-studio-media.ts'), ...sources('cloud')])
    assert.doesNotMatch(readFileSync(file, 'utf8'), FILM_OR_ROUTE, path.relative(BJ, file));
  // The studio's own code, which the copy is built from, never names the film's or the recordings' addresses or a path into
  // the film and its frames: the page gets the addresses from the local server's answer.
  for (const file of [...sources('studio/app'), ...sources('studio/components'), ...sources('studio/lib')])
    assert.doesNotMatch(readFileSync(file, 'utf8'), /\/api\/spegla\/|live-bj[\\/]+(?:video|rutor|matt)|kalla\.mp4/i, path.relative(BJ, file));
  // In the copy the page is an empty state, and the menu and the start page leave it out.
  assert.match(readFileSync(path.join(BJ, 'studio/app/spegla/page.tsx'), 'utf8'), /if \(isSnapshot\)\s*return/);
  assert.match(readFileSync(path.join(BJ, 'studio/components/shell/Rail.tsx'), 'utf8'), /LOCAL_ONLY[^\n]*"\/spegla\/"/);
  for (const t of [...START_TILES, ...START_CHAIN.flatMap(s => s.where)].filter(t => t.href === '/spegla/')) assert.equal(t.localOnly, true, t.name);
  assert.ok(statSync(path.join(BJ, 'tools/spegla-routes.ts')).isFile());
});
