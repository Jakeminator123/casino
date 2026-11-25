// The routes of the view Beställ and of Jakob's verdict in Material (tools/order-routes.ts), run against a temporary
// copy of the data on a real local server: changes only with the revision read, nothing written twice, approval only from
// the lab's own origin and within the policy, nothing changed after approval, files only from the order's folder, nothing
// archived or of another dealer approved, a pilot first, and kandidat → gäller only as Jakob's own click. Pictures are flat
// PNGs in the bank's size; no film is decoded.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { orderRoutes } from './order-routes.ts';
import { defaultPlan } from '../src/placement-model.ts';
import { orderStore, orderHash } from './order-store.ts';
import { MOTIONS_TEXT, motionRegister } from './register-store.ts';
import { mediaRoles } from './media-roles.ts';
import { replacedBy } from '../studio/components/material/state.ts';

const base = os.tmpdir();
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
/** A post of the fixture's register of films and takes (tools/register-store.ts), written whole with its id; its text file is postsFile. */
const post = (root: string, id: string, value: Record<string, unknown>) => { motionRegister(root).put(id, { id, ...value }); };
const postsFile = (root: string) => path.join(root, MOTIONS_TEXT);
// The bank's frame: every picture of an order is in bank pixels.
const picture = (r: number, g: number, b: number) => sharp({ create: { width: 1764, height: 1174, channels: 3, background: { r, g, b } } }).png().toBuffer();

const register = () => ({
  schemaVersion: 1,
  dealers: {
    ada: { name: 'Ada', entries: [
      { id: 'ada-vila', role: 'ankare-1', name: 'Vila', path: 'assets/anchors/ada-vila/anchor.png', node: 'IDLE', state: 'gäller' },
    ] },
    paow: { name: 'Paow', entries: [
      { id: 'paow-vila-ung-2', role: 'ankare-1', name: 'Vila, kandidat 2', path: 'assets/anchors/paow-vila-ung-2/anchor.png', node: 'IDLE', state: 'kandidat' },
      { id: 'paow-vila-ung-1', role: 'ankare-1', name: 'Vila, kandidat 1', path: 'assets/anchors/paow-vila-ung-1/anchor.png', node: 'IDLE', state: 'kandidat' },
      { id: 'paow-vila-kort', role: 'ankare-1', name: 'Vila med kort', path: 'assets/anchors/paow-vila-ung-1/anchor.png', node: 'IDLE', card: 'P4.C1', state: 'kandidat' },
      { id: 'paow-nyp-ny', role: 'ankare-2.1', name: 'Nyp, ny', path: 'assets/anchors/paow-nyp-ny/anchor.png', node: 'READY', state: 'kandidat' },
    ] },
  },
  measures: [],
});

type SaveTransport = { dropNext: boolean; dropped: number; revisions: (string | undefined)[] };

async function lab(t: { after(fn: () => Promise<void> | void): void }, transport?: SaveTransport) {
  const root = await mkdtemp(path.join(base, 'order-routes-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ['data', 'placements']) await mkdir(path.join(root, dir), { recursive: true });
  for (const file of ['data/order-policy.json', 'data/dealers.json', 'data/order-methods.json']) await copyFile(file, path.join(root, file));
  // Every dealer of the lab can be ordered for, and a second, made-up dealer (Ada) beside the real ones, so that two
  // dealers' orders and pictures can be told apart; the pause has a test of its own.
  const dealersFile = path.join(root, 'data/dealers.json');
  const dealerList = JSON.parse(await readFile(dealersFile, 'utf8'));
  dealerList.dealers.unshift({ id: 'ada', name: 'Ada', look: 'a made-up test dealer', films: { prefix: 'ada-' }, shoe: '2.1', paused: null });
  for (const d of dealerList.dealers) d.paused = null;
  await writeFile(dealersFile, JSON.stringify(dealerList));
  // A declared fixture, independent of Jakob's saved or newly committed hand choices.
  await writeFile(path.join(root, 'placements/default.json'), JSON.stringify(defaultPlan()));
  await writeFile(path.join(root, 'data/media-roles.json'), JSON.stringify(register(), null, 2) + '\n');
  await writeFile(path.join(root, 'data/clip-jobs.json'), '{"jobs": []}');
  const files: Record<string, Buffer> = {};
  for (const [name, colour] of [['ada-vila', [0, 237, 44]], ['paow-vila-ung-2', [0, 236, 45]], ['paow-vila-ung-1', [1, 235, 46]], ['paow-nyp-ny', [2, 234, 47]]] as const) {
    await mkdir(path.join(root, 'assets/anchors', name), { recursive: true });
    files[name] = await picture(...colour);
    await writeFile(path.join(root, 'assets/anchors', name, 'anchor.png'), files[name]);
  }
  let origin = '';
  const handle = { fn: null as null | ReturnType<typeof orderRoutes> };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', origin);
    if (transport && req.method === 'POST' && url.pathname === '/api/orders') {
      transport.revisions.push(req.headers['if-match']);
      const end = res.end;
      res.end = (...args: unknown[]) => {
        if (transport.dropNext && res.statusCode === 201) {
          transport.dropNext = false;
          transport.dropped++;
          // The route has persisted the draft and prepared the response. Lose it before clients receive any bytes.
          res.destroy();
          return res;
        }
        return Reflect.apply(end, res, args);
      };
    }
    if (!(await handle.fn!(req, res, url))) res.writeHead(404).end('not mine');
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  // A frame out of a film, for a cut frame as last picture: the test's films are not films, so a test sets what a frame is.
  const frames = { of: null as null | ((source: { path: string; frame?: number }) => Promise<Buffer>) };
  handle.fn = orderRoutes({ root, origin, now: () => new Date('2026-11-12T21:00:00Z'), frame: (source) => (frames.of ? frames.of(source) : Promise.reject(new Error('no film'))) });
  t.after(() => new Promise<void>((done) => server.close(() => done())));
  const request = async (method: string, address: string, options: { body?: unknown; match?: string; from?: string | null } = {}) => {
    const headers: Record<string, string> = {};
    if (options.from !== null) headers.origin = options.from ?? origin;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.match) headers['if-match'] = options.match;
    const response = await fetch(origin + address, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    const type = response.headers.get('content-type') ?? '';
    return { status: response.status, json: type.includes('json') ? await response.json() : null, bytes: type.includes('json') ? null : Buffer.from(await response.arrayBuffer()) };
  };
  async function call(method: string, address: string, options: Parameters<typeof request>[2] = {}) {
    if (method === 'POST' && address === '/api/orders') {
      const preview = await request(method, '/api/orders/preview', options);
      if (preview.status !== 200) return preview;
      return request(method, address, { ...options, match: preview.json.revision });
    }
    return request(method, address, options);
  }
  return { root, origin, call, request, files, frames };
}

test('a stale studio or preview cannot write anything, and the current preview is stored byte for byte', async (t) => {
  const { root, request } = await lab(t);
  const input = [{ dealer: 'paow', step: 'INGANG-2.1' }, { dealer: 'paow', step: 'VILA' }];
  const reg = register();
  reg.dealers.paow.entries[0].state = 'gäller';
  reg.dealers.paow.entries[3].state = 'gäller';
  await writeFile(path.join(root, 'data/media-roles.json'), JSON.stringify(reg));
  const prepared = await request('POST', '/api/orders/preview', { body: input });
  assert.equal(prepared.status, 200);
  assert.equal(existsSync(path.join(root, 'assets/orders')), false, 'a preview writes nothing');
  assert.equal((await request('POST', '/api/orders', { body: input[0] })).status, 428);
  // The recipe changes after the preview, then a picture: each refuses the shown revision.
  const file = path.join(root, 'data/order-methods.json');
  const methods = JSON.parse(await readFile(file, 'utf8'));
  methods.methods.find((m: { step: string }) => m.step === 'INGANG-2.1').takes = 3;
  await writeFile(file, JSON.stringify(methods));
  assert.equal((await request('POST', '/api/orders', { body: input, match: prepared.json.revision })).status, 409);
  const current = await request('POST', '/api/orders/preview', { body: input });
  await writeFile(path.join(root, 'assets/anchors/paow-nyp-ny/anchor.png'), await picture(0, 232, 42));
  assert.equal((await request('POST', '/api/orders', { body: input, match: current.json.revision })).status, 409);
  assert.equal(existsSync(path.join(root, 'data/orders')), false);

  const latest = await request('POST', '/api/orders/preview', { body: input });
  const pictured: Buffer[][] = [];
  for (const order of latest.json.orders) pictured.push(await Promise.all(order.pictures.map(async (pic: { path: string }) => (await request('GET', '/' + pic.path)).bytes!)));
  const saved = await request('POST', '/api/orders', { body: input, match: latest.json.revision });
  assert.equal(saved.status, 201);
  for (const [i, id] of saved.json.made.entries()) {
    const shown = latest.json.orders[i];
    const { order } = (await request('GET', '/api/orders/' + id)).json;
    assert.deepEqual([shown.generation, shown.prompt, shown.takes, shown.cost], [order.generation, order.prompt, order.takes, order.cost]);
    for (const [index, pic] of shown.pictures.entries()) {
      const final = await readFile(path.join(root, order.pictures[index].path));
      assert.deepEqual(pictured[i][index], final);
      assert.equal(pic.sha256, sha(final));
    }
  }
});

test('a save sent twice writes one draft and answers with the same id; another body against the same preview is refused', async (t) => {
  const { root, request } = await lab(t);
  const input = { dealer: 'ada', step: 'VILA' };
  const shown = await request('POST', '/api/orders/preview', { body: input });
  const options = { body: input, match: shown.json.revision };
  const first = await request('POST', '/api/orders', options);
  assert.equal(first.status, 201);
  const files = await readdir(path.join(root, 'data/orders')), folders = await readdir(path.join(root, 'assets/orders'));
  const retry = await request('POST', '/api/orders', options);
  assert.equal(retry.status, 201);
  assert.deepEqual(retry.json.made, first.json.made);
  assert.deepEqual(await readdir(path.join(root, 'data/orders')), files);
  assert.deepEqual(await readdir(path.join(root, 'assets/orders')), folders);
  assert.equal((await request('POST', '/api/orders', { ...options, body: { ...input, takes: 5 } })).status, 409);
});

test('after a saved draft loses its HTTP response the studio retries the same save', async (t) => {
  const transport: SaveTransport = {dropNext: true, dropped: 0, revisions: []};
  const { root, origin } = await lab(t, transport);
  const originalFetch = globalThis.fetch;
  const previousMode = process.env.NEXT_PUBLIC_DEALER_MODE;
  t.after(() => {
    t.mock.restoreAll();
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_DEALER_MODE;
    else process.env.NEXT_PUBLIC_DEALER_MODE = previousMode;
  });
  process.env.NEXT_PUBLIC_DEALER_MODE = 'lab';
  const { createOrder, orderSaveFailure, previewOrder } = await import('../studio/lib/orders.ts');
  t.mock.method(globalThis, 'fetch', (address: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set('origin', origin);
    return originalFetch(new URL(address, origin), { ...init, headers });
  });

  const input = { dealer: 'ada', step: 'VILA' } as const;
  const preview = await previewOrder(input);
  const save = () => createOrder(input, preview.revision);
  await assert.rejects(save, (error: unknown) => {
    assert.equal(orderSaveFailure(error).retrySave, true);
    return true;
  });
  assert.equal(transport.dropped, 1);
  const directory = path.join(root, 'data/orders');
  const files = await readdir(directory);
  assert.equal(files.length, 1, 'the first POST has already written a draft');
  const persisted = JSON.parse(await readFile(path.join(directory, files[0]), 'utf8'));
  const retry = await save();
  assert.deepEqual(transport.revisions, [preview.revision, preview.revision]);
  assert.deepEqual(retry.made, [persisted.id]);
  assert.deepEqual(await readdir(directory), files);
  assert.deepEqual(await readdir(path.join(root, 'assets/orders')), [persisted.id]);
});

test('drafts, changes and approval go through the routes with their guards', async (t) => {
  const { root, call, files } = await lab(t);
  const still = { dealer: 'paow', step: 'ANKARE-2.1', base: 'paow-vila-ung-2', takes: 2 };
  assert.equal((await call('POST', '/api/orders', { body: still, from: 'http://evil.example' })).status, 403);
  assert.equal((await call('POST', '/api/orders', { body: { ...still, id: 'mine' } })).status, 400, 'the page cannot name the id');
  assert.equal((await call('POST', '/api/orders', { body: { ...still, pose: { path: 'C:/x.png' } } })).status, 400, 'nor hand in a picture of its own');
  const made = await call('POST', '/api/orders', { body: still });
  assert.equal(made.status, 201);
  const a = made.json, id = a.order.id;
  const anchor = a.order.pictures.find((p: { name: string }) => p.name === 'anchor.png');
  assert.equal(anchor.sha256, sha(files['paow-vila-ung-2']), 'the picture is copied byte for byte');
  assert.equal(a.order.cost.total, 80);

  // Files: only pictures and films directly in the order's folder.
  for (const bad of [`/assets/orders/${id}/receipt.json`, `/assets/orders/${id}/..%2F..%2Fdata%2Forder-policy.json`, '/assets/orders/../data/order-policy.json', '/assets/orders/x/none.png']) assert.equal((await call('GET', bad)).status, 404, bad);

  // A change needs the revision read; the text is not the page's to write; the cost follows.
  assert.equal((await call('PUT', `/api/orders/${id}`, { body: { takes: 1 } })).status, 428);
  assert.equal((await call('PUT', `/api/orders/${id}`, { body: { takes: 1 }, match: '"x"' })).status, 409);
  assert.equal((await call('PUT', `/api/orders/${id}`, { body: { prompt: 'mine' }, match: a.revision })).status, 400);
  const changed = await call('PUT', `/api/orders/${id}`, { body: { takes: 1 }, match: a.revision });
  assert.equal(changed.status, 200);
  assert.equal(changed.json.order.cost.total, 40);

  // Approval: own origin, revision, then frozen with its hash.
  assert.equal((await call('POST', `/api/orders/${id}/approve`, { match: changed.json.revision, from: null })).status, 403);
  assert.equal((await call('POST', `/api/orders/${id}/approve`)).status, 428);
  const approved = await call('POST', `/api/orders/${id}/approve`, { match: changed.json.revision });
  assert.equal(approved.status, 200);
  assert.equal(approved.json.order.status, 'GODKÄND');
  assert.deepEqual(approved.json.order.approval, { by: 'jakob', at: '2026-11-12T21:00:00.000Z', orderSha256: orderHash(approved.json.order) });
  assert.equal((await call('PUT', `/api/orders/${id}`, { body: { takes: 2 }, match: approved.json.revision })).status, 409, 'nothing changes after approval');
  assert.equal((await call('POST', `/api/orders/${id}/approve`, { match: approved.json.revision })).status, 409);
  assert.equal((await call('GET', '/api/orders')).json.policy.mandateBudget.spentToday, 0, 'his click is not counted against the agents');

  // The policy: beyond the cap per order, or switched off, the approval is refused.
  const policy = JSON.parse(await readFile(path.join(root, 'data/order-policy.json'), 'utf8'));
  await writeFile(path.join(root, 'data/order-policy.json'), JSON.stringify({ ...policy, maxPerOrder: 50 }));
  const second = (await call('POST', '/api/orders', { body: still })).json;
  const refused = await call('POST', `/api/orders/${second.order.id}/approve`, { match: second.revision });
  assert.equal(refused.status, 403);
  assert.match(refused.json.error, /taket per beställning är 50/);
  await writeFile(path.join(root, 'data/order-policy.json'), JSON.stringify({ ...policy, enabled: false }));
  assert.match((await call('POST', `/api/orders/${second.order.id}/approve`, { match: second.revision })).json.error, /avstängda/);

  // A film that waits for its anchors cannot be approved.
  await writeFile(path.join(root, 'data/order-policy.json'), JSON.stringify(policy));
  const film = (await call('POST', '/api/orders', { body: { dealer: 'paow', step: 'INGANG-2.1' } })).json;
  assert.equal(film.shown, 'VÄNTAR');
  const waiting = await call('POST', `/api/orders/${film.order.id}/approve`, { match: film.revision });
  assert.equal(waiting.status, 409);
  assert.match(waiting.json.error, /Väntar på/);
});

test('nothing new is drafted for a paused dealer: neither a preview nor a draft, one seat or several', async (t) => {
  const { root, call, request } = await lab(t);
  const made = await call('POST', '/api/orders', { body: { dealer: 'ada', step: 'VILA' } });
  assert.equal(made.status, 201, 'made before the pause');
  const file = path.join(root, 'data/dealers.json');
  const dealers = JSON.parse(await readFile(file, 'utf8'));
  dealers.dealers.find((d: { id: string }) => d.id === 'ada').paused = 'Jakob 2026-11-12: inget nytt beställs för Ada.';
  await writeFile(file, JSON.stringify(dealers));
  for (const body of [{ dealer: 'ada', step: 'VILA' }, { dealer: 'ada', step: 'GIV-2.1', seats: [{ target: 'P1.C1' }, { target: 'P2.C1' }] }]) {
    const refused = await request('POST', '/api/orders/preview', { body });
    assert.equal(refused.status, 409, JSON.stringify(body));
    assert.match(refused.json.error, /pausad/);
  }
  assert.deepEqual(await readdir(path.join(root, 'data/orders')), [`${made.json.order.id}.json`], 'her draft stays as it was, and nothing new is written');
  assert.equal((await request('POST', '/api/orders/preview', { body: { dealer: 'paow', step: 'ANKARE-2.1', base: 'paow-vila-ung-2' } })).status, 200, 'another dealer is not paused');
});

test("Material: Jakob's verdict goes only from the lab's own origin against the revision, is stamped his, and sets aside only the others of its place", async (t) => {
  const { root, call } = await lab(t);
  const revision = async () => (await mediaRoles(root).answer()).revision!;
  const put = async (id: string, state: string, match?: string, from?: string) => (await call('PUT', `/api/media/${id}/state`, { body: { state }, match, from })).status;
  assert.equal(await put('paow-vila-ung-2', 'gäller'), 428);
  assert.equal(await put('paow-vila-ung-2', 'gäller', await revision(), 'http://evil.example'), 403);
  assert.equal(await put('paow-vila-ung-2', 'okänd', await revision()), 400);
  assert.equal(await put('nobody', 'ersatt', await revision()), 404);
  const ok = await call('PUT', '/api/media/paow-vila-ung-2/state', { body: { state: 'gäller' }, match: await revision() });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.json.replaced.map((e: { id: string }) => e.id), ['paow-vila-ung-1'], 'the candidate with a card on the table is another picture');
  const after = JSON.parse(await readFile(path.join(root, 'data/media-roles.json'), 'utf8')).dealers.paow.entries;
  const by = (id: string) => after.find((e: { id: string }) => e.id === id);
  assert.equal(by('paow-vila-ung-2').state, 'gäller');
  assert.match(by('paow-vila-ung-2').stateBy, /^Jakob \d{4}-\d\d-\d\d \d\d:\d\d: kandidat → gäller \(Material\)$/);
  assert.equal(by('paow-vila-ung-1').state, 'ersatt');
  assert.equal(by('paow-vila-kort').state, 'kandidat');
  assert.equal(await put('paow-vila-kort', 'ersatt', '"old"'), 409, 'a stale revision changes nothing');
  // One picture holds per place: a keystone gives way only to one of its own posture, an anchor seen from a seat only to one from the same seat.
  const keystones = [{ id: 'paow-staende', role: 'keystone', name: 'Stående A', state: 'gäller' }, { id: 'paow-sittande', role: 'keystone', name: 'Sittande A', state: 'gäller' }, { id: 'paow-staende-tatuerad', role: 'keystone', name: 'Stående, tatuerade händer', state: 'kandidat' }, { id: 'paow-sittande-tatuerad', role: 'keystone', name: 'Sittande, tatuerade händer', state: 'kandidat' }] as const;
  assert.equal(replacedBy(keystones, keystones[3]).map((e) => e.id).join(), 'paow-sittande');
  assert.equal(replacedBy(keystones, keystones[2]).map((e) => e.id).join(), 'paow-staende');
  const cameras = [{ id: 'rak', role: 'ankare-2.3', node: 'READY-C', state: 'gäller' }, { id: 'stol-1', role: 'ankare-2.3', node: 'READY-C', state: 'kandidat', seat: 1 }, { id: 'stol-1-b', role: 'ankare-2.3', node: 'READY-C', state: 'gäller', seat: 1 }] as const;
  assert.equal(replacedBy(cameras, cameras[1]).map((e) => e.id).join(), 'stol-1-b');
});

test('an archived source is never approved, through a corrected copy either, and an unreadable archive status stops the approval', async (t) => {
  const { root, call, request } = await lab(t);
  const media = register(), landing = {id: 'paow-landning-p4', role: 'landning', name: 'Landning 4', path: 'assets/anchors/paow-nyp-ny/anchor.png', node: 'LAND(P4.C1)', card: 'P4.C1', state: 'gäller'};
  media.dealers.paow.entries[3].state = 'gäller';
  media.dealers.paow.entries.push(landing);
  await writeFile(path.join(root, 'data/media-roles.json'), JSON.stringify(media));
  const parent = 'paow-original', fixed = `${parent}-fix-1`;
  const film = Buffer.from('a four-second round trip');
  const derived = [parent, fixed].flatMap(clip => [
    {id: `${clip}-deal`, clip, from: 'READY', to: 'P4.C1', frames: [0, 79], ...(clip === fixed ? {editOf: `${parent}-deal`} : {})},
    {id: `${clip}-return`, clip, from: 'P4.C1', to: 'READY', frames: [80, 119], ...(clip === fixed ? {editOf: `${parent}-return`} : {})},
  ]);
  const registry = path.join(root, 'data/clip-jobs.json'), registryData = JSON.stringify({jobs: [], derived});
  await writeFile(registry, registryData);
  for (const clip of [parent, fixed]) {
    const asset = path.join(root, `assets/motions/${clip}/source.mp4`);
    await mkdir(path.dirname(asset), {recursive: true});
    await writeFile(asset, film);
    post(root, clip, {source: {frames: 120, fps: 30, sha256: sha(film)}});
  }
  const posts = postsFile(root), bare = await readFile(posts); // the register with the two films and no verdict
  const input = (reference: string) => ({dealer: 'paow', step: 'GIV-2.1', target: 'P4.C1', reference});
  const pending = await call('POST', '/api/orders', {body: input(`${fixed}-deal`)});
  assert.equal(pending.status, 201, pending.json.error);
  const approve = () => call('POST', `/api/orders/${pending.json.order.id}/approve`, {match: pending.json.revision});

  // Jakob archives the original's return: the corrected copy of it is out too.
  post(root, `${parent}-return`, {review: {archived: {by: 'Jakob', where: 'Karta'}}});
  const blocked = await approve();
  assert.equal(blocked.status, 409, blocked.json.error);
  assert.match(blocked.json.error, /referensfilmen.*arkiverad/i);
  assert.equal((await request('POST', '/api/orders/preview', {body: input(fixed)})).status, 400);
  await writeFile(posts, bare);

  for (const invalid of ['{', '{"jobs": [], "derived": "unreadable"}', null]) {
    if (invalid === null) await rm(registry); else await writeFile(registry, invalid);
    const denied = await approve();
    assert.equal(denied.status, 409, String(invalid));
    assert.match(denied.json.error, /Arkivstatus.*clip-jobs\.json/i);
  }
  await writeFile(registry, registryData);
  await writeFile(posts, '{\n');
  const invalidMotion = await approve();
  assert.equal(invalidMotion.status, 409);
  assert.match(invalidMotion.json.error, /Arkivstatus.*referensfilmen/i);
  // A missing post can mean there has never been a review: with the register readable again, and no post for the takes, it is approved.
  await writeFile(posts, bare);
  await writeFile(registry, JSON.stringify({jobs: [{id: 'unrelated', from: 'IDLE', to: 'READY'}], derived}));
  assert.equal((await approve()).status, 200);
});

test('a bank film that changed since it was measured is not copied, and a cut frame from an archived take is never approved', async (t) => {
  const { root, call, frames } = await lab(t);
  const media = register();
  media.dealers.paow.entries[3].state = 'gäller'; // anchor 2.1, the deal's first picture; seat 4 has no landing picture
  await writeFile(path.join(root, 'data/media-roles.json'), JSON.stringify(media));
  // A reference film of a few bytes with the hash the bank measured, and Paow's round trip to seat 4 whose return Jakob approved.
  const ref = 'ada-p4-c1-plan-deal-02', film = Buffer.from('a film of four seconds'), filmFile = path.join(root, `assets/motions/${ref}/source.mp4`);
  await mkdir(path.dirname(filmFile), { recursive: true });
  await writeFile(filmFile, film);
  const clip = 'paow-giv-2-1-p4-04-01', straight = { decision: 'ACCEPTED', userAccepted: true, userReview: 'Jakob 2026-11-13: Bra retur.' };
  await writeFile(path.join(root, 'data/clip-jobs.json'), JSON.stringify({ jobs: [{ id: ref, from: 'READY', to: 'RELEASE(P4.C1)', duration: 4, dealer: 'ada' }], derived: [
    { id: `${clip}-deal`, from: 'READY', to: 'P4.C1', clip, frames: [0, 108], dealer: 'paow' }, { id: `${clip}-return`, from: 'P4.C1', to: 'READY', clip, frames: [109, 168], dealer: 'paow' }] }));
  post(root, ref, { source: { frames: 120, fps: 30, sha256: sha(film) }, review: straight });
  post(root, clip, { source: { frames: 169, fps: 24 } });
  post(root, `${clip}-return`, { review: straight, motion: { releaseHand: 'LH' } });
  // The cut frame: green, with a blue card where the plan lays seat 4's.
  const quad = (await call('GET', '/api/orders')).json.plan.seats['P4.C1'].quad as [number, number][];
  const [x0, y0, x1, y1] = [Math.min(...quad.map((p) => p[0])), Math.min(...quad.map((p) => p[1])), Math.max(...quad.map((p) => p[0])), Math.max(...quad.map((p) => p[1]))].map(Math.round);
  const frame = await sharp({ create: { width: 1764, height: 1174, channels: 3, background: { r: 0, g: 236, b: 45 } } }).composite([{ input: { create: { width: x1 - x0 + 1, height: y1 - y0 + 1, channels: 3, background: { r: 20, g: 60, b: 200 } } }, left: x0, top: y0 }]).png().toBuffer();
  frames.of = async () => frame;

  const body = { dealer: 'paow', step: 'GIV-2.1', target: 'P4.C1', reference: ref };
  await writeFile(filmFile, 'another film');
  const changed = await call('POST', '/api/orders', { body });
  assert.equal(changed.status, 409, changed.json.error);
  assert.match(changed.json.error, /sha256 skiljer/);
  await writeFile(filmFile, film);
  const made = await call('POST', '/api/orders', { body });
  assert.equal(made.status, 201, made.json.error);
  assert.deepEqual([made.json.order.reference.sha256, made.json.order.pictures[1].from.cut?.clip], [sha(film), clip], 'the film as measured, and the cut frame as last picture');
  const approve = () => call('POST', `/api/orders/${made.json.order.id}/approve`, { match: made.json.revision });
  for (const id of [`${clip}-return`, clip, `${clip}-deal`]) {
    const before = await readFile(postsFile(root));
    post(root, id, { ...(motionRegister(root).get(id) ?? {}), review: { ...straight, archived: { by: 'Jakob', at: '2026-11-18T00:00:00Z', where: 'Karta' } } });
    const blocked = await approve();
    await writeFile(postsFile(root), before);
    assert.equal(blocked.status, 409, id);
    assert.match(blocked.json.error, /snittrutan.*arkiverad/i);
  }
  assert.equal((await approve()).status, 200, 'nothing archived: approved');
});

test("a return to 2.3 starts only on the deal's frozen last picture: one changed on disk, or a candidate that no longer matches it, is refused", async (t) => {
  const { root, call, request, files } = await lab(t);
  const media = register();
  const a3 = { id: 'paow-a3-p4', role: 'landning', name: 'A3P4C1', path: 'assets/anchors/paow-nyp-ny/anchor.png', node: 'LAND(P4.C1)', card: 'P4.C1', hand: 'RH', state: 'kandidat' };
  media.dealers.paow.entries.push({ id: 'paow-ankare-2-3', role: 'ankare-2.3', name: 'Ankare 2.3', path: 'assets/anchors/paow-vila-ung-2/anchor.png', node: 'READY-C', state: 'gäller' }, a3);
  await writeFile(path.join(root, 'data/media-roles.json'), JSON.stringify(media));
  const deal = await call('POST', '/api/orders', { body: { dealer: 'paow', step: 'GIV-2.3', target: 'P4.C1', shape: 'ONE_WAY', end: a3.id, side: 'FRONT', reference: null } });
  assert.equal(deal.status, 201, deal.json.error);
  const approved = await call('POST', `/api/orders/${deal.json.order.id}/approve`, { match: deal.json.revision });
  assert.equal(approved.status, 200, approved.json.error);
  const last = path.join(root, approved.json.order.pictures[1].path);
  const preview = () => request('POST', '/api/orders/preview', { body: { dealer: 'paow', step: 'RETUR-2.3', target: 'P4.C1', base: a3.id, continues: deal.json.order.id } });
  await writeFile(last, files['paow-vila-ung-1']);
  const changed = await preview();
  assert.equal(changed.status, 409);
  assert.match(changed.json.error, /frysta slutbild.*SHA256/);
  await writeFile(last, files['paow-nyp-ny']);
  await writeFile(path.join(root, a3.path), files['paow-vila-ung-1']);
  const candidate = await preview();
  assert.equal(candidate.status, 409);
  assert.match(candidate.json.error, /A3-kandidatens bild stämmer inte/);
});

test("another dealer's picture in an order is named as a problem and cannot be approved", async (t) => {
  const { call } = await lab(t);
  const own = (await call('POST', '/api/orders', { body: { dealer: 'paow', step: 'ANKARE-2.1', base: 'paow-vila-ung-2' } })).json;
  assert.deepEqual([own.owners['anchor.png'].dealer, own.problems], ['paow', []]);
  const mixed = (await call('POST', '/api/orders', { body: { dealer: 'paow', step: 'ANKARE-2.1', base: 'ada-vila' } })).json;
  assert.match(mixed.problems.join(' '), /bilden är Adas, inte Paows/);
  assert.equal((await call('POST', `/api/orders/${mixed.order.id}/approve`, { match: mixed.revision })).status, 409, 'a mix-up cannot be approved');
});

test('Jakob\'s click through the route is always his: a body saying otherwise is not read', async (t) => {
  const { call } = await lab(t);
  const made = (await call('POST', '/api/orders', { body: { dealer: 'paow', step: 'ANKARE-2.1', base: 'paow-vila-ung-2' } })).json;
  const approved = await call('POST', `/api/orders/${made.order.id}/approve`, { match: made.revision, body: { by: 'huvudagent', mandate: 'x' } });
  assert.equal(approved.status, 200);
  assert.deepEqual([approved.json.order.approval.by, approved.json.order.approval.mandate], ['jakob', undefined]);
});

// Jakob 2026-11-24 ("Bara sätt som håller, och en pilot först"): the approval lets ONE order of an untried way through, and
// no second before he himself has judged its film; a way he rejected is refused until the recipe has changed. The same
// answer for his click in Beställ and for the main agent on his mandate.
test('a pilot first: a second order of an untried way waits for Jakob\'s own verdict on the pilot\'s film, and a way that fell is refused', async (t) => {
  const { root, call } = await lab(t);
  const draft = async (more: Record<string, unknown> = {}) => { const made = await call('POST', '/api/orders', { body: { dealer: 'ada', step: 'VILA', ...more } }); assert.equal(made.status, 201, made.json?.error); return made.json; };
  const approve = (o: { order: { id: string }; revision: string }) => call('POST', `/api/orders/${o.order.id}/approve`, { match: o.revision });
  const pilot = await draft(), second = await draft();
  assert.equal((await approve(pilot)).status, 200);

  // The second is refused, by his click and by the main agent alike, and stays a draft.
  const early = await approve(second);
  assert.equal(early.status, 409);
  assert.match(early.json.error, /^En pilot först/);
  await assert.rejects(orderStore(root, { now: () => new Date('2026-11-12T21:00:00Z') }).approve(second.order.id, second.revision, { by: 'huvudagent', mandate: 'Jakob 2026-11-13: beställ lämpliga filmer' }), (error: Error & { status?: number }) => error.status === 409 && error.message === early.json.error);
  assert.equal((await call('GET', `/api/orders/${second.order.id}`)).json.order.status, 'UTKAST');

  // The pilot's film is judged for him, not by him: that does not count.
  const film = `${pilot.order.id}-01`, take = { order: { id: pilot.order.id, take: 1 }, motion: { kind: 'IDLE' } };
  post(root, film, { ...take, review: { decision: 'ACCEPTED', userAccepted: false, provisional: { by: 'en oberoende granskare', at: '2026-11-12T20:00:00Z', mandate: 'Jakob 2026-11-13: domar åt honom', note: 'ser bra ut' } } });
  const forHim = await approve(second);
  assert.equal(forHim.status, 409);
  assert.match(forHim.json.error, /väntar på Jakobs ögon/);

  // He rejects it: the way fell. A changed recipe is another way, and its first order goes through.
  post(root, film, { ...take, review: { decision: 'REJECTED', userReview: 'Jakob 2026-11-12: Hon stirrar rakt fram.' } });
  const fell = await approve(second);
  assert.equal(fell.status, 409);
  assert.match(fell.json.error, /^Sättet föll och beställs inte igen/);
  assert.equal((await approve(await draft({ model: 'kling-4', duration: 4, takes: 1 }))).status, 200, 'the changed recipe\'s pilot');

  // He approves the pilot's film himself: the way holds, and the second order is approved.
  post(root, film, { ...take, review: { decision: 'ACCEPTED', userAccepted: true, userReview: 'Jakob 2026-11-12: Bra.' } });
  assert.equal((await approve(second)).status, 200);
});
