// Skyddar: hans domar och val – en sparad standard går aldrig förlorad: ett sparande lägger den förra undan, en återställning raderar inget.
// Jakob 2026-11-26: "en knapp för detta som är lite mer förlåtande om man råkat spara över originalet". The doll lab's routes
// (dealer3d/page/server.ts) in a folder of their own: "Spara som standard" moves the standard it replaces to forra/ first;
// "aterstall" lays standards aside in undanlagda/<when>/ and as each place's one before, deleting nothing; "tillbaka" lets a
// standard and the one before it change places, and takes one laid aside back.
//   node --test dealer3d/tests/standard-undan.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {dollLabRoutes} from '../page/server.ts';

/** A standard as the page saves one, for `name` (paow-p4c1), with `mark` written in it to know it again. */
function motion(name: string, mark: string) {
  const m = /^(\w+)-(?:a2-1-)?(?:p(\d)c(\d)|dc(\d))$/.exec(name)!, place = m[2] ? `P${m[2]}.C${m[3]}` : `D.C${m[4]}`;
  const limb = {s: [0, 1, 0], e: [0, 0.8, 0], w: [0, 0.6, 0], k: 1, p: Array.from({length: 21}, () => [0, 0.6, 0])};
  const frame = {card: {c: [0, 0, 0], l: [0, 0, 1], n: [0, 1, 0]}, L: limb, R: limb, h: [0, 1.4, 0]};
  return {about: mark, doll: m[1], to: [place], fps: 30, frameCount: 2, frames: [frame, frame], hip: [0, 0.5, 0], leavesShoe: 0, folds: 1, rests: 1, edge: [0, 0], lab: {savedAt: '2026-11-23T13:20:01.873Z'}};
}
/** Every file under `dir` with what it says it is (`about`), as relative path → mark. */
function marks(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string) => { for (const n of readdirSync(d)) { const f = path.join(d, n); if (statSync(f).isDirectory()) walk(f); else out.set(path.relative(dir, f).replaceAll('\\', '/'), JSON.parse(readFileSync(f, 'utf8')).about); } };
  walk(dir); return out;
}

async function lab(t: {after: (fn: () => void) => void}) {
  const root = mkdtempSync(path.join(tmpdir(), 'docka-standard-')), folder = path.join(root, 'dealer3d/standard');
  mkdirSync(folder, {recursive: true});
  const server = createServer(), origin = await new Promise<string>(ok => server.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${(server.address() as {port: number}).port}`)));
  const handle = dollLabRoutes({root, origin});
  server.on('request', async (req, res) => { if (!await handle(req, res, new URL(req.url!, origin))) res.writeHead(404).end(); });
  t.after(() => { server.close(); rmSync(root, {recursive: true, force: true}); });
  const ask = async (method: string, at: string, value?: unknown, from = origin) => { const r = await fetch(origin + at, {method, headers: {'Content-Type': 'application/json', Origin: from}, body: value === undefined ? undefined : JSON.stringify(value)}); return {status: r.status, answer: await r.json()}; };
  const put = (name: string, value: unknown) => writeFileSync(path.join(folder, `${name}.json`), JSON.stringify(value));
  const read = (relative: string) => JSON.parse(readFileSync(path.join(folder, relative), 'utf8')).about as string;
  return {folder, ask, put, read};
}

test('ett sparande förlorar aldrig det som låg där: den förra ligger i forra/, och Ta tillbaka byter dem', async t => {
  const {folder, ask, put, read} = await lab(t);
  put('paow-p4c1', motion('paow-p4c1', 'hans original'));
  const first = await ask('PUT', '/dealer3d/standard/paow-p4c1.json', motion('paow-p4c1', 'misstaget'));
  assert.equal(first.status, 200);
  assert.equal(read('paow-p4c1.json'), 'misstaget');
  assert.equal(read('forra/paow-p4c1.json'), 'hans original', 'what lay there is kept as the one before');
  assert.deepEqual(first.answer.forra.map((s: {name: string}) => s.name), ['paow-p4c1']);
  const back = await ask('POST', '/dealer3d/standard/tillbaka', {name: 'paow-p4c1'});
  assert.equal(back.status, 200);
  assert.equal(read('paow-p4c1.json'), 'hans original', 'taken back');
  assert.equal(read('forra/paow-p4c1.json'), 'misstaget', 'and the one taken back from is itself kept');
  assert.deepEqual([...marks(folder).values()].sort(), ['hans original', 'misstaget']);
});

test('en återställning raderar inget: dockans standarder läggs undan i undanlagda/ och som förra, och kan tas tillbaka', async t => {
  const {folder, ask, put, read} = await lab(t);
  put('paow-p4c1', motion('paow-p4c1', 'p4 sparad'));
  put('paow-dc2', motion('paow-dc2', 'dc2 sparad'));
  mkdirSync(path.join(folder, 'forra')); writeFileSync(path.join(folder, 'forra/paow-p4c1.json'), JSON.stringify(motion('paow-p4c1', 'p4 äldre')));
  put('standard-p4c1', motion('standard-p4c1', 'standarddockans'));
  const before = new Set(marks(folder).values());
  const reset = await ask('POST', '/dealer3d/standard/aterstall', {doll: 'paow'});
  assert.equal(reset.status, 200);
  const when = reset.answer.undanlagt.when as string;
  assert.deepEqual(reset.answer.undanlagt.names, ['paow-dc2', 'paow-p4c1']);
  assert.deepEqual(reset.answer.standards.map((s: {name: string}) => s.name), ['standard-p4c1'], 'only the other doll keeps a standard: the default holds for paow');
  const after = marks(folder);
  for (const mark of before) assert.ok([...after.values()].includes(mark), `${mark} is still there`);
  assert.equal(read(`undanlagda/${when}/paow-p4c1.json`), 'p4 sparad');
  assert.equal(read(`undanlagda/${when}/forra/paow-p4c1.json`), 'p4 äldre');
  assert.equal(read('forra/paow-dc2.json'), 'dc2 sparad', 'each laid aside is its place\'s one before');
  const one = await ask('POST', '/dealer3d/standard/tillbaka', {name: 'paow-dc2'});
  assert.equal(one.status, 200); assert.equal(read('paow-dc2.json'), 'dc2 sparad');
  const again = await ask('POST', '/dealer3d/standard/tillbaka', {name: 'paow-dc2'});
  assert.equal(again.status, 200, 'a second press undoes the first: the default again');
  assert.ok(!again.answer.standards.some((s: {name: string}) => s.name === 'paow-dc2')); assert.equal(read('forra/paow-dc2.json'), 'dc2 sparad');
  assert.equal((await ask('POST', '/dealer3d/standard/tillbaka', {name: 'paow-dc2'})).status, 200); assert.equal(read('paow-dc2.json'), 'dc2 sparad');
  const all = await ask('POST', '/dealer3d/standard/tillbaka', {from: when});
  assert.equal(all.status, 200); assert.equal(read('paow-p4c1.json'), 'p4 sparad'); assert.equal(read(`undanlagda/${when}/paow-p4c1.json`), 'p4 sparad', 'the folder keeps its copy');
  for (const mark of before) assert.ok([...marks(folder).values()].includes(mark), `${mark} is still there after taking back`);
});

test('vägarna är smala: bara studions egen sida, bara standardernas namn och mappar', async t => {
  const {ask, put} = await lab(t);
  put('paow-p4c1', motion('paow-p4c1', 'sparad'));
  assert.equal((await ask('POST', '/dealer3d/standard/aterstall', {doll: 'paow'}, 'http://evil.example')).status, 403);
  assert.equal((await ask('POST', '/dealer3d/standard/aterstall', {name: '../paow-p4c1'})).status, 400);
  assert.equal((await ask('POST', '/dealer3d/standard/aterstall', {doll: 'paow', name: 'paow-p4c1'})).status, 400);
  assert.equal((await ask('POST', '/dealer3d/standard/tillbaka', {from: '../../placements'})).status, 400);
  assert.equal((await ask('POST', '/dealer3d/standard/tillbaka', {name: 'paow-p5c1'})).status, 404, 'nothing before to take back');
  assert.equal((await ask('POST', '/dealer3d/standard/aterstall', {doll: 'ingen'})).status, 404);
});
