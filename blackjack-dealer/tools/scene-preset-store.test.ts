// Skyddar: hans domar och val, kontrakten – hans utseenden sparas bara mot senaste revisionen, de medföljande skrivs aldrig över, äldre filer läses.
// Offline tests for the presets of the 3D scene (tools/scene-preset-store.ts) and the three that ship in data/scene-presets/.
// Every write goes to a temporary copy; the checkout's own presets and room register are only read.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, readdir, rm, copyFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {scenePresetStore} from './scene-preset-store.ts';
import {DEFAULTS} from '../src/scene3d-view.ts';
import {FRAMING_KEYS, readPlayView} from '../src/play-view.ts';
import {RECORDING, SHIPPED, effective, hasOwnFraming, matchPreset, savedState, shownState} from '../studio/lib/scene-presets.ts';

const base = os.tmpdir();
async function temp(t: {after(fn: () => Promise<void>): void}) {
  const root = await mkdtemp(path.join(base, 'scene-presets-')); t.after(() => rm(root, {recursive: true, force: true}));
  await mkdir(path.join(root, 'data/scene-presets'), {recursive: true});
  await copyFile('data/scene-rooms.json', path.join(root, 'data/scene-rooms.json'));
  for (const p of SHIPPED) await copyFile(`data/scene-presets/${p.name}.json`, path.join(root, `data/scene-presets/${p.name}.json`));
  return root;
}
const fails = (status: number) => (error: unknown) => (error as {status?: number}).status === status;
const mine = {label: 'Kväll i skogen', about: 'Prov', state: {room: 'skog', dust: 0.8, felt: 'vin', cards: true}};

test('Casino is an editable saved look, protected against deletion and stale writes', async t => {
  const store = scenePresetStore(await temp(t));
  const first = await store.save('casino', mine, undefined);
  const second = await store.save('casino', {...mine, state:{...mine.state,cards:false}}, first.preset.revision);
  assert.equal((await store.load('casino')).preset.state.cards,false);
  await assert.rejects(store.save('casino',mine,first.preset.revision),fails(409));
  await assert.rejects(store.remove('casino',second.preset.revision),fails(403));
});

test('the lens is saved with the look as the key lins; a file in the older form loads with it and is written in the new form', async t => {
  const root = await temp(t), store = scenePresetStore(root), file = path.join(root, 'data/scene-presets/casino.json');
  const fields = ['schemaVersion', 'name', 'label', 'about', 'state', 'updatedAt'];
  // Casino's file as it stood before 2026-11-21: no word, which means Standard
  const before = {schemaVersion: 1, name: 'casino', label: 'Casino', about: 'Casinos sparade visning, vald i Scen & bord.', state: {room: 'panorama', roomShift: 'shimmer', blur: 5, tray: true, cards: true, pitch: -8, zoom: 0.84, format: 'fill'}, updatedAt: '2026-11-19T17:14:04.461Z'};
  await writeFile(file, JSON.stringify(before, null, 2) + '\n');
  assert.deepEqual((await store.load('casino')).preset.state, before.state);
  // Casino's file as Använd i Casino wrote it with Bred lins until 2026-11-26: the word beside the state
  await writeFile(file, JSON.stringify({...before, geometri: 'kontrakt'}, null, 2) + '\n');
  const old = (await store.load('casino')).preset;
  assert.deepEqual(old.state, {...before.state, lins: 'bred'}); assert.equal('geometri' in old, false);
  const listed = (await store.list()).presets.find(p => p.name === 'casino')!;
  assert.equal(listed.state.lins, 'bred', 'the list the Casino view and the copy read'); assert.equal('geometri' in listed, false);
  // what the studio sends from Scen with Bred lins chosen (studio/components/scene-editor/useSceneEditor.tsx saveAs): the key in the state
  const bred = await store.save('casino', {label: before.label, about: before.about, state: old.state}, old.revision);
  assert.equal(bred.preset.state.lins, 'bred');
  const written = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(Object.keys(written), fields); assert.equal(written.state.lins, 'bred');
  // a request in the older form is kept in the new one
  const aliased = await store.save('casino', {label: before.label, about: before.about, state: before.state, geometri: 'kontrakt'}, bred.preset.revision);
  assert.deepEqual(Object.keys(JSON.parse(await readFile(file, 'utf8'))), fields); assert.equal(aliased.preset.state.lins, 'bred');
  // and with Standard: no key, the same state as the file before
  const standard = await store.save('casino', {label: before.label, about: before.about, state: before.state}, aliased.preset.revision);
  assert.deepEqual(standard.preset.state, before.state);
  assert.deepEqual(Object.keys(JSON.parse(await readFile(file, 'utf8'))), Object.keys(before));
  await assert.rejects(store.save('casino', {...mine, geometri: 'bred'}, standard.preset.revision), (e: unknown) => fails(400)(e) && /geometri ska vara lins eller kontrakt/.test((e as Error).message));
  await assert.rejects(store.save('casino', {...mine, state: {...mine.state, lins: 'kontrakt'}}, standard.preset.revision), (e: unknown) => fails(400)(e) && /lins känner inte till "kontrakt"/.test((e as Error).message));
});

test('the three shipped presets: in the checkout, read-only, and exactly what the brief says', async () => {
  const store = scenePresetStore(process.cwd()), {presets, problems} = await store.list();
  assert.deepEqual(problems, []);
  assert.deepEqual(presets.filter(p => p.shipped).map(p => p.name), ['basgrund', 'levande', 'rumsstudien']);
  for (const p of SHIPPED) {
    const file = JSON.parse(await readFile(`data/scene-presets/${p.name}.json`, 'utf8'));
    assert.deepEqual(file, p, `${p.name}.json is SHIPPED in studio/lib/scene-presets.ts`);
  }
  const [basgrund, levande, rumsstudien] = SHIPPED.map(p => effective(DEFAULTS, p.state));
  // basgrund's room is the register's panorama, with its blur, a room the game has
  const vegas = JSON.parse(await readFile('data/scene-rooms.json', 'utf8')).rooms.find((r: {id: string}) => r.id === 'panorama');
  assert.equal(vegas.blur, basgrund.blur); assert.equal(vegas.game, true);
  // levande: basgrund plus the look Jakob remembers, the camera leaning without swaying (Jakob 2026-11-13); rumsstudien:
  // levande plus the room study's table
  assert.deepEqual({...levande, mode: basgrund.mode, focus: basgrund.focus, dust: basgrund.dust, clock: basgrund.clock}, basgrund);
  assert.deepEqual([levande.mode, levande.sway, levande.focus, levande.dust, levande.clock], ['lean', false, 'follow', 0.6, true]);
  assert.deepEqual({...rumsstudien, surface: levande.surface, base: levande.base, shadowAbove: levande.shadowAbove, lamp: levande.lamp}, levande);
  assert.deepEqual([rumsstudien.surface, rumsstudien.base, rumsstudien.shadowAbove, rumsstudien.lamp], ['photo', 'legs', 0, 0.5]);
});

test('a look is shown with the play view\'s Dator unless it names a framing of its own (Jakob 2026-11-25)', () => {
  const dator = {zoom: 0.9, pitch: -9.5, yaw: 2}, mobil = {zoom: 1.4, pitch: -5, yaw: 0}, [basgrund, , rumsstudien] = SHIPPED;
  const whole = effective(DEFAULTS, basgrund.state, dator);
  assert.deepEqual([whole.zoom, whole.pitch, whole.yaw], [dator.zoom, dator.pitch, dator.yaw]);
  assert.equal(whole.room, 'panorama'); assert.equal(effective(DEFAULTS, basgrund.state).zoom, DEFAULTS.zoom, 'without a play view, the scene\'s own');
  const mine = effective(DEFAULTS, {...basgrund.state, zoom: 1.2, pitch: -3}, dator);
  assert.deepEqual([mine.zoom, mine.pitch, mine.yaw], [1.2, -3, dator.yaw], 'the look\'s own keys go first, the rest is the play view\'s');
  // Visa: Dator as the look is, Mobil always the play view's Mobil, Inspelningen the film's own frame; the format is Visa's
  assert.deepEqual(shownState(mine, 'fill', mobil), {...mine, format: 'fill'});
  assert.deepEqual(shownState(mine, 'mob', mobil), {...mine, ...mobil, format: 'mob'});
  assert.deepEqual(shownState(mine, 'desk', mobil), {...mine, ...RECORDING, format: 'desk'});
  // the look on the play view is the shipped one whatever Visa says; off the play view, or with another key, it is not
  assert.equal(matchPreset({...whole, format: 'mob'}, DEFAULTS, SHIPPED, undefined, dator)?.name, 'basgrund');
  assert.equal(matchPreset(effective(DEFAULTS, rumsstudien.state, dator), DEFAULTS, SHIPPED, undefined, dator)?.name, 'rumsstudien');
  assert.equal(matchPreset({...whole, zoom: 1.2}, DEFAULTS, SHIPPED, undefined, dator), null);
  assert.equal(matchPreset(whole, DEFAULTS, SHIPPED, undefined, {...dator, pitch: -4}), null, 'under another play view the sliders no longer stand on it');
});

test('what a save keeps: never Visa, and zoom, pitch and yaw only with the look\'s own framing, then all three', async t => {
  const store = scenePresetStore(await temp(t)), dator = readPlayView(null).dator;
  const shown = {...effective(DEFAULTS, {room: 'skog', dust: 0.8}, dator), format: 'mob' as const};
  // following the play view: the look's keys, nothing of the framing or the format
  const follows = savedState(shown, DEFAULTS, false);
  assert.deepEqual(follows, {room: 'skog', dust: 0.8});
  assert.equal(hasOwnFraming(follows), false);
  // with its own framing: all three, also where one is the scene's own (yaw 0), so that a new play view does not move it
  const own = savedState({...shown, zoom: 1.2, pitch: -3, yaw: 0}, DEFAULTS, true);
  assert.deepEqual(own, {room: 'skog', dust: 0.8, zoom: 1.2, pitch: -3, yaw: 0});
  assert.equal('format' in own, false);
  for (const key of FRAMING_KEYS) assert.equal(own[key] !== undefined, true, key);
  // kept by the store as sent, and shown again under another play view: the one follows it, the other keeps its own
  const later = {zoom: 0.8, pitch: -10, yaw: 1};
  const a = (await store.save('folj-spelvyn', {label: 'Följ', state: follows}, undefined)).preset.state;
  const b = (await store.save('egen-inramning', {label: 'Egen', state: own}, undefined)).preset.state;
  assert.deepEqual(a, follows); assert.deepEqual(b, own);
  assert.deepEqual([effective(DEFAULTS, a, later).zoom, effective(DEFAULTS, a, later).pitch], [later.zoom, later.pitch]);
  assert.deepEqual([effective(DEFAULTS, b, later).zoom, effective(DEFAULTS, b, later).pitch, effective(DEFAULTS, b, later).yaw], [1.2, -3, 0]);
});

test('his own preset: saved, listed after the shipped ones, overwritten only against its revision, taken away', async t => {
  const root = await temp(t), store = scenePresetStore(root);
  const made = await store.save('kvall-i-skogen', mine, undefined);
  assert.equal(made.preset.name, 'kvall-i-skogen'); assert.equal(made.preset.shipped, false); assert.match(made.preset.revision, /^"[0-9a-f]{64}"$/);
  assert.ok(!Number.isNaN(Date.parse(made.preset.updatedAt)));
  const text = await readFile(path.join(root, 'data/scene-presets/kvall-i-skogen.json'), 'utf8');
  assert.deepEqual(Object.keys(JSON.parse(text)), ['schemaVersion', 'name', 'label', 'about', 'state', 'updatedAt']);
  assert.ok(text.endsWith('}\n'));
  const {presets} = await store.list();
  assert.deepEqual(presets.map(p => p.name), ['basgrund', 'levande', 'rumsstudien', 'kvall-i-skogen']);
  assert.equal((await store.load('kvall-i-skogen')).preset.revision, made.preset.revision);
  // an existing name: never without the revision, never against an old one
  await assert.rejects(store.save('kvall-i-skogen', mine, undefined), fails(428));
  await assert.rejects(store.save('kvall-i-skogen', mine, '"0"'), fails(409));
  const again = await store.save('kvall-i-skogen', {...mine, state: {dust: 0.2}}, made.preset.revision);
  assert.deepEqual(again.preset.state, {dust: 0.2});
  await assert.rejects(store.remove('kvall-i-skogen', undefined), fails(428));
  await assert.rejects(store.remove('kvall-i-skogen', made.preset.revision), fails(409));
  assert.deepEqual(await store.remove('kvall-i-skogen', again.preset.revision), {name: 'kvall-i-skogen', removed: true});
  await assert.rejects(store.load('kvall-i-skogen'), fails(404));
  await assert.rejects(store.remove('kvall-i-skogen', again.preset.revision), fails(404));
  await assert.rejects(store.save('kvall-i-skogen', mine, again.preset.revision), fails(409)); // gone in the meantime
  assert.deepEqual((await readdir(path.join(root, 'data/scene-presets'))).sort(), ['basgrund.json', 'levande.json', 'rumsstudien.json']); // no temporary file left
});

test('the shipped presets cannot be written or taken away', async t => {
  const root = await temp(t), store = scenePresetStore(root), {preset} = await store.load('basgrund');
  assert.equal(preset.shipped, true);
  await assert.rejects(store.save('basgrund', mine, preset.revision), fails(403));
  await assert.rejects(store.remove('levande', (await store.load('levande')).preset.revision), fails(403));
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'data/scene-presets/basgrund.json'), 'utf8')), SHIPPED[0]);
});

test('every key is checked against the catalogue: unknown keys, values out of range and rooms the scene lacks are refused', async t => {
  const root = await temp(t), store = scenePresetStore(root);
  const refused = async (value: unknown, words: RegExp, name = 'prov') => { await assert.rejects(store.save(name, value, undefined), (e: unknown) => fails(400)(e) && words.test((e as Error).message)); };
  await refused({...mine, state: {dust: 0.8, glitter: 1}}, /okänd nyckel glitter/);
  await refused({...mine, state: {dust: 1.5}}, /dust ska ligga mellan 0 och 1/);
  await refused({...mine, state: {sway: 'yes'}}, /sway ska vara sant eller falskt/);
  await refused({...mine, state: {felt: 'pink'}}, /felt känner inte till "pink"/);
  await refused({...mine, state: {room: 'manen'}}, /room känner inte till "manen"/);
  await refused({...mine, state: {marks: 'rings,stars'}}, /marks känner inte till stars/);
  await refused({...mine, state: {logo: 'x'.repeat(29)}}, /logo får vara högst 28 tecken/);
  await refused({...mine, state: {yaw: Number.NaN}}, /yaw ska vara ett tal/);
  await refused({...mine, state: []}, /state ska vara ett objekt/);
  await refused({...mine, label: ''}, /label ska vara/);
  await refused({...mine, extra: 1}, /okänt fält extra/);
  await refused({...mine, name: 'annat'}, /namnet i förvalet och i adressen skiljer sig/);
  await refused(mine, /a–z/, 'Stora-Bokstäver');
  await assert.rejects(store.load('../placements/default'), fails(400));
  // what the scene has: built rooms, register rooms, marks as a list; a key that has been retired (a look's own scale and
  // camera, 2026-11-26) is left out of what is kept, without an error, so a look saved with one still reads
  const ok = await store.save('prov', {...mine, state: {room: 'dimskog', scale: 2, lens: 'estimate', marks: 'rings,numbers', logo: 'SCOUT', filmWarm: -0.2}}, undefined);
  assert.deepEqual(ok.preset.state, {room: 'dimskog', marks: 'rings,numbers', logo: 'SCOUT', filmWarm: -0.2});
  assert.equal(ok.preset.state.room, 'dimskog');
  await store.save('hall', {...mine, state: {room: 'hall'}}, undefined);
});

test('a broken file is named, not served as a preset', async t => {
  const root = await temp(t), store = scenePresetStore(root);
  await writeFile(path.join(root, 'data/scene-presets/trasig.json'), '{"schemaVersion":1,"label":"x","state":{"dust":9}}');
  await writeFile(path.join(root, 'data/scene-presets/inte-json.json'), '{');
  const {presets, problems} = await store.list();
  assert.deepEqual(presets.map(p => p.name), ['basgrund', 'levande', 'rumsstudien']);
  assert.equal(problems.length, 2);
  await assert.rejects(store.load('trasig'), fails(500));
});
