// The play view (src/play-view.ts) and its store (tools/play-view-store.ts): the one framing of the game for every look,
// written only on Jakob's click and against the revision last read.   node --test tools/play-view.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {FRAMING_LIMITS, MOBILE_BELOW, PLAY_VIEW, framingFor, readFraming, readPlayView, sameFraming, validatePlayView} from '../src/play-view.ts';
import {KEYS} from '../src/game-look.ts';
import {playViewStore} from './play-view-store.ts';

const fails = (status: number) => (error: unknown) => (error as {status?: number}).status === status;

test('the framing\'s limits are the scene keys\' own, so a saved play view is always a view the scene can show', () => {
  for (const key of ['zoom', 'pitch', 'yaw'] as const) {
    const k = KEYS[key]; assert.equal(k.kind, 'slider');
    if (k.kind === 'slider') assert.deepEqual([k.min, k.max], [...FRAMING_LIMITS[key]], key);
  }
  for (const f of [PLAY_VIEW.dator, PLAY_VIEW.mobil]) assert.equal(validatePlayView({dator: f, mobil: f}).errors.length, 0);
});

test('a page always gets a framing: what does not hold up falls back, number by number, on the game\'s own', () => {
  for (const broken of [null, undefined, 1, 'x', [], {}, {view: null}, {dator: 'x', mobil: []}]) assert.deepEqual(readPlayView(broken), PLAY_VIEW, JSON.stringify(broken));
  const mine = {schemaVersion: 1, dator: {zoom: 0.9, pitch: -9.5, yaw: 0}, mobil: {zoom: 1.4, pitch: -5, yaw: 2}, updatedAt: '2026-11-26T00:00:00.000Z'};
  assert.deepEqual(readPlayView(mine), mine, 'the file as it is');
  assert.deepEqual(readPlayView({view: {...mine, revision: '"abc"'}}), mine, 'the server\'s answer');
  // one number outside its limits, or no number, is the fallback's; the rest of the framing is kept
  assert.deepEqual(readPlayView({dator: {zoom: 99, pitch: -9.5, yaw: 'x'}}).dator, {zoom: PLAY_VIEW.dator.zoom, pitch: -9.5, yaw: PLAY_VIEW.dator.yaw});
  assert.deepEqual(readFraming({zoom: NaN, pitch: Infinity}, {zoom: 1, pitch: 2, yaw: 3}), {zoom: 1, pitch: 2, yaw: 3});
});

test('Dator on a stage as wide as a computer\'s, Mobil on a phone held upright', () => {
  assert.equal(framingFor(PLAY_VIEW, 1440 / 900), PLAY_VIEW.dator); assert.equal(framingFor(PLAY_VIEW, 844 / 390), PLAY_VIEW.dator, 'a phone on its side is Dator');
  assert.equal(framingFor(PLAY_VIEW, 390 / 694), PLAY_VIEW.mobil); assert.equal(framingFor(PLAY_VIEW, MOBILE_BELOW), PLAY_VIEW.dator); assert.equal(framingFor(PLAY_VIEW, MOBILE_BELOW - 0.001), PLAY_VIEW.mobil);
  assert.ok(sameFraming({zoom: 0.84, pitch: -8, yaw: 0}, {zoom: 0.84 + 1e-9, pitch: -8, yaw: 0})); assert.ok(!sameFraming(PLAY_VIEW.dator, PLAY_VIEW.mobil));
});

test('only a whole play view within the limits is saved', () => {
  const ok = {dator: {zoom: 0.84, pitch: -9.7, yaw: 0}, mobil: {zoom: 1.55, pitch: -4.4, yaw: 0}};
  assert.deepEqual(validatePlayView(ok), {view: {schemaVersion: 1, ...ok}, errors: []});
  for (const bad of [null, [], {}, {dator: ok.dator}, {...ok, mobil: {zoom: 1.55, pitch: -4.4}}, {...ok, dator: {...ok.dator, zoom: 3}}, {...ok, dator: {...ok.dator, pitch: '−8'}}, {...ok, extra: 1}, {...ok, dator: {...ok.dator, dx: 0.1}}, {...ok, schemaVersion: 2}])
    assert.equal(validatePlayView(bad).view, null, JSON.stringify(bad));
  assert.match(validatePlayView({...ok, dator: {...ok.dator, zoom: 3}}).errors.join(' '), /dator\.zoom ska vara ett tal 0\.45 till 2\.5/);
});

test('the store: no file is the game\'s own framings; a save is made against the revision last read and never by a page that has not read', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'spelvy-')); t.after(() => rm(root, {recursive: true, force: true}));
  const store = playViewStore(root), file = path.join(root, 'data/play-view.json');
  const empty = await store.load();
  assert.deepEqual(empty.view, {...PLAY_VIEW, revision: null});
  const mine = {dator: {zoom: 0.84, pitch: -9.7, yaw: 0}, mobil: {zoom: 1.55, pitch: -4.4, yaw: 0}};
  await assert.rejects(store.save(mine, '"old"'), fails(409), 'a revision for a file that is not there');
  await assert.rejects(store.save({...mine, dator: {zoom: 9, pitch: 0, yaw: 0}}, undefined), fails(400));
  const first = await store.save(mine, undefined);
  assert.deepEqual([first.view.dator, first.view.mobil], [mine.dator, mine.mobil]); assert.ok(first.view.revision && first.view.updatedAt);
  assert.deepEqual(Object.keys(JSON.parse(await readFile(file, 'utf8'))), ['schemaVersion', 'dator', 'mobil', 'updatedAt'], 'the file holds the view and nothing else');
  assert.deepEqual((await store.load()).view, first.view);
  await assert.rejects(store.save(mine, undefined), fails(428), 'a page that has not read the view');
  await assert.rejects(store.save(mine, '"other"'), fails(409), 'a page that read an older view');
  const second = await store.save({...mine, dator: {...mine.dator, pitch: -8}}, first.view.revision!);
  assert.equal(second.view.dator.pitch, -8); assert.notEqual(second.view.revision, first.view.revision);
  // a file that does not hold up is said, not papered over: the studio is told, and the game falls back by itself (readPlayView)
  await mkdir(path.dirname(file), {recursive: true}); await writeFile(file, '{"dator": 1}');
  await assert.rejects(store.load(), fails(500));
});
