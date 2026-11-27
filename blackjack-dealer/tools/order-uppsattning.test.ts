// Skyddar: beställningarna och fullmakten under valet av uppsättning – det som finns hör till den förra standarden och är
// orört, en beställning vid livebordet får livebordets mått, kamera och pris, och ett prov för en person går inte in i en bank.
// The set-up's field on an order, a doll's film and a film's post (src/order-model.ts uppsattningOf), the measures taken from
// the set-up (src/uppsattning.ts) in the order's pictures, the after-work and the place words, Aleph 2 as the model that makes
// a person's film over the doll's (price, mandate, call), a person's trial made by the store in a temporary copy, and the bank
// refusing it. No media needed: pictures are flat PNGs, the doll's film is a few bytes the store only hashes.
//   node --test tools/order-uppsattning.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {
  MODELS, checkPolicy, costOf, mandateBudgetOf, modelFor, modelsFor, personOf, pictureOf, referenceCandidates, requestOf, stepOf,
  uppsattningField, uppsattningOf, validateOrder, type BankFacts, type Order, type Policy, type RenderedReference,
} from '../src/order-model.ts';
import { DATATS_FORVAL, UPPSATTNING } from '../src/uppsattning.ts';
import { FILM } from '../src/table-lens.ts';
import { LIVE_CAMERA } from '../src/table-live.ts';
import { BANK, EDGE, TREATMENTS, edgeRows } from '../src/film-after.ts';
import { BANK_FRAME, W, H, dealerEdgeRow, readRgb } from './order-images.ts';
import { PERSON_TEXT_LIMIT, personPrompt, placeWords, whereShort } from '../src/order-prompts.ts';
import { orderStore } from './order-store.ts';
import { planRegistration } from './register-order.ts';
import { fromApiEntry } from './order-import.ts';
import { committedFiles, committedText } from './committed.ts';
import { defaultPlan } from '../src/placement-model.ts';

const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const policy = async () => JSON.parse(await readFile('data/order-policy.json', 'utf8')) as Policy;
/** The text of the tenth trial's film 1 (2026-11-27), word for word: what a person's trial at the live table sends. */
const TENTH = 'Replace the white mannequin with the real man shown in the guidance image, with the same face, hair and light blue shirt throughout the whole video. Photorealistic face, skin and hands. Keep his movement, the direction of his head and eyes, the position of both hands and every finger, the timing, the table, the clear plastic box, the card shoe, the chair, the background, the camera and the framing exactly as in the input video. Keep the playing card exactly as in the input video: how it is drawn from the shoe, passed between his hands, carried, turned and laid down. The card has a red back and a plain white face with no print: it leaves the shoe with the red back up, is turned over in his hand and lies on the felt with the plain white face up, where the input video lays it. Do not add any card.';
const LOOK = 'the real man shown in the guidance image, with the same face, hair and light blue shirt';

test('what has no field was made at the former standard: every committed order and post, and a doll film without it', async () => {
  assert.equal(DATATS_FORVAL, 'forra');
  assert.equal(uppsattningOf(undefined), 'forra'); assert.equal(uppsattningOf({}), 'forra'); assert.equal(uppsattningOf({ uppsattning: 'live' }), 'live');
  // the field is written only where it is not the former standard, so that what is made there is what it was before
  assert.deepEqual(uppsattningField('forra'), {}); assert.deepEqual(uppsattningField('live'), { uppsattning: 'live' });
  for (const file of committedFiles('data/orders').filter((f) => f.endsWith('.json'))) {
    const order = JSON.parse(committedText(file)) as Order;
    if (order.created < '2026-11-27') { assert.equal(order.uppsattning, undefined, order.id); assert.equal(uppsattningOf(order), 'forra', order.id); }
  }
  for (const line of committedText('data/motions.jsonl').split('\n').filter((l) => l.trim())) {
    const post = JSON.parse(line) as { id?: string; post?: { uppsattning?: unknown }; uppsattning?: unknown };
    assert.equal(uppsattningOf(post.post ?? post), 'forra', String(post.id));
  }
  // a stored order that writes the former standard, or another word, is refused: one way to say it
  const order = JSON.parse(committedText(committedFiles('data/orders').find((f) => f.endsWith('.json'))!)) as Order;
  assert.deepEqual(validateOrder(order).errors, []);
  assert.ok(validateOrder({ ...order, uppsattning: 'forra' }).errors.some((e) => /uppsattning/.test(e)));
  assert.ok(validateOrder({ ...order, uppsattning: 'standard' }).errors.some((e) => /uppsattning/.test(e)));
});

test('the measures come from the set-up: the former standard\'s are the numbers they were, the live table\'s its own', async () => {
  assert.deepEqual(pictureOf({}), { width: 1764, height: 1174 }); assert.equal(pictureOf({}), FILM);
  assert.equal(pictureOf({ uppsattning: 'live' }), LIVE_CAMERA.film); assert.deepEqual(pictureOf({ uppsattning: 'live' }), { width: 1728, height: 972 });
  assert.equal(BANK_FRAME, UPPSATTNING.forra.bild); assert.deepEqual([W, H], [1764, 1174]); assert.equal(BANK, UPPSATTNING.forra.bild);
  // the edge check's rows are the contract's row as they were (832, the body's rows 825–831), and the row is data
  assert.deepEqual(EDGE, { row: 832, darkBy: 10, bodyRows: [825, 831] }); assert.deepEqual(edgeRows(await dealerEdgeRow('.', 'forra')), EDGE);
  const liveRow = await dealerEdgeRow('.', 'live');
  assert.ok(liveRow > 0 && liveRow < 972, `livebordets dealerkant på rad ${liveRow}`);
  // a picture is read in the frame asked for, and another size is refused
  const live = await sharp({ create: { width: 1728, height: 972, channels: 3, background: { r: 9, g: 9, b: 9 } } }).png().toBuffer();
  await assert.rejects(readRgb(live), /1728 × 972, inte bankens ruta 1764 × 1174/);
  assert.equal((await readRgb(live, UPPSATTNING.live.bild)).length, 1728 * 972 * 3);
  // the place words are the former standard's to the pixel, and go by the share of the picture elsewhere
  for (const x of [0, 339.9, 340, 449.9, 450, 539.9, 540, 759.9, 760, 799.9, 800, 960, 960.1, 1180, 1180.1, 1309.9, 1310.1, 1390, 1390.1, 1763]) for (const y of [900, 959.9, 960, 1100]) {
    assert.equal(placeWords({ x, y }, FILM), placeWords({ x, y }), `${x},${y}`); assert.equal(whereShort({ x, y }, FILM), whereShort({ x, y }), `${x},${y}`);
  }
  assert.equal(placeWords({ x: 1728 / 2, y: 972 * 0.9 }, UPPSATTNING.live.bild), placeWords({ x: 1764 / 2, y: 1174 * 0.9 }));
  // Aleph 2's after-work keeps every frame and lifts nothing
  assert.deepEqual({ cut: TREATMENTS['aleph-2'].cutTail, lock: TREATMENTS['aleph-2'].lock }, { cut: 0, lock: false });
});

test('Aleph 2 makes a film over the doll\'s: never Bordet\'s choice, priced per started second, held by the mandate like any other', async () => {
  const p = await policy(), step = stepOf('GIV-2.3')!;
  assert.ok(!modelsFor(step).some((m) => m.id === 'aleph-2'), 'Bordet does not offer it');
  assert.equal(modelFor(step, 'aleph-2'), MODELS['aleph-2']); assert.equal(modelFor(stepOf('ANKARE-2.1')!, 'aleph-2'), null);
  const cost = (seconds: number) => costOf({ model: 'aleph-2', params: {} }, 1, p.prices, seconds)!;
  // the tenth trial's 3,6 s is 112 the dearer way (the ledger drew 84), 15,8 s 448 (it drew 420), the shortest film 56
  assert.deepEqual([cost(3.633).total, cost(3.633).worstTotal, cost(15.767).total, cost(2).total, cost(3).total], [112, 112, 448, 56, 84]);
  // an agent approves it up to 500 credits on its own: 17 s (476) yes, 18 s (504) is Jakob's
  const budget = mandateBudgetOf(p.mandate, [], [], '2026-11-27T12:00:00Z', p.timeZone);
  const at = (seconds: number) => checkPolicy({ cost: cost(seconds) } as Order, p, 100000, budget);
  assert.ok(at(17).ok, at(17).refusals.join(' '));
  assert.ok(!at(18).ok && at(18).refusals.some((r) => /Jakob avgör/.test(r)), 'over the mandate, Jakob decides');
  assert.ok(checkPolicy({ cost: cost(18) } as Order, p, 100000).ok, 'Jakob himself may approve it');
});

/** A person's trial as the store makes it, in a temporary copy: the doll's film at the live table with his guidance picture. */
async function liveLab(t: { after(fn: () => Promise<void> | void): void }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'order-uppsattning-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ['data/orders', 'placements', 'assets/references/docka/docka-danilo-p4']) await mkdir(path.join(root, dir), { recursive: true });
  for (const file of ['data/order-policy.json', 'data/dealers.json', 'data/order-methods.json']) await copyFile(file, path.join(root, file));
  await writeFile(path.join(root, 'placements/default.json'), JSON.stringify(defaultPlan()));
  await writeFile(path.join(root, 'data/media-roles.json'), JSON.stringify({ schemaVersion: 1, dealers: { paow: { name: 'Paow', entries: [] } }, measures: [] }, null, 2) + '\n');
  await writeFile(path.join(root, 'data/clip-jobs.json'), '{"jobs": []}');
  const film = Buffer.from('not a film: the store only hashes it'), picture = await sharp({ create: { width: 1728, height: 972, channels: 3, background: { r: 120, g: 110, b: 100 } } }).png().toBuffer();
  await writeFile(path.join(root, 'assets/references/docka/docka-danilo-p4/source.mp4'), film);
  await writeFile(path.join(root, 'assets/references/docka/docka-danilo-p4/styrbild-tomasz.png'), picture);
  const entry: RenderedReference = { id: 'docka-danilo-p4', edge: 'READY-C>P4.C1', path: 'assets/references/docka/docka-danilo-p4/source.mp4', sha256: sha(film), seconds: 3.633, lays: 'RH', check: null, doll: 'danilo', uppsattning: 'live', camera: 'kameran',
    styrbilder: { tomasz: { path: 'assets/references/docka/docka-danilo-p4/styrbild-tomasz.png', sha256: sha(picture), width: 1728, height: 972, look: LOOK } } };
  await writeFile(path.join(root, 'data/rendered-references.json'), JSON.stringify({ schemaVersion: 1, films: [entry] }));
  return { root, entry, picture, film };
}

test('a person\'s trial at the live table: no dealer, the doll\'s film and his guidance picture, the live table\'s picture, the tenth trial\'s text and price', async (t) => {
  const { root, entry, picture } = await liveLab(t);
  const store = orderStore(root, { now: () => new Date('2026-11-27T06:00:00Z') });
  const { order } = await store.create({ dealer: '', person: 'tomasz', step: 'GIV-2.3', target: 'P4.C1', reference: entry.id, createdBy: 'test' });
  assert.equal(order.id, 'tomasz-giv-2-3-p4-01');
  assert.equal((order as Partial<Order>).dealer, undefined); assert.deepEqual(personOf(order), { id: 'tomasz', name: 'Tomasz' });
  assert.equal(order.uppsattning, 'live'); assert.deepEqual(pictureOf(order), { width: 1728, height: 972 });
  assert.deepEqual(order.pictures.map((p) => [p.name, p.goesAs, p.seconds, p.width, p.height, p.sha256]), [['keyframe.png', 'keyframe', 0, 1728, 972, sha(picture)]]);
  assert.equal(order.reference.status === 'FINNS' && order.reference.doll, 'danilo');
  assert.equal(order.prompt.text, TENTH); assert.ok(order.prompt.text.length <= PERSON_TEXT_LIMIT);
  assert.deepEqual([order.generation.tool, order.generation.model, order.generation.params, order.cost.total, order.cost.worstTotal], ['video_to_video', 'aleph-2', {}, 112, 112]);
  assert.deepEqual(validateOrder(JSON.parse(await readFile(path.join(root, 'data/orders', `${order.id}.json`), 'utf8'))).errors, []);
  // exactly the film, the guidance picture at second 0 and the text go out; take 2 confirms the repeat
  assert.deepEqual(requestOf(order, 1), { tool: 'video_to_video', args: { model: 'aleph-2', promptText: TENTH, videoUri: '$file:reference.mp4', keyframes: [{ uri: '$file:keyframe.png', seconds: 0 }] } });
  assert.equal(requestOf(order, 2).args.confirmRepeat, true);
  // what it cannot be: another set-up, a choice of the motion, a film without his picture, a dealer at the live table
  await assert.rejects(store.create({ dealer: '', person: 'tomasz', step: 'GIV-2.3', target: 'P4.C1', reference: entry.id, uppsattning: 'forra' }), /filmad vid livestandarden/);
  await assert.rejects(store.create({ dealer: '', person: 'tomasz', step: 'GIV-2.3', target: 'P4.C1', reference: entry.id, hand: 'LH' }), /hand väljs inte/);
  await assert.rejects(store.create({ dealer: '', person: 'ada', step: 'GIV-2.3', target: 'P4.C1', reference: entry.id }), /ingen styrbild för ada/);
  await assert.rejects(store.create({ dealer: 'paow', step: 'GIV-2.3', target: 'P4.C1', uppsattning: 'live' }), /inte vid livestandarden/);
  await assert.rejects(store.create({ dealer: 'paow', step: 'GIV-2.3', target: 'P4.C1', model: 'aleph-2' }), /prov för personen/);
  // only its name and takes change, and the price follows the takes
  const revision = `"${sha(await readFile(path.join(root, 'data/orders', `${order.id}.json`), 'utf8'))}"`;
  const changed = await store.change(order.id, { takes: 2 }, revision);
  assert.deepEqual([changed.order.takes, changed.order.cost.total], [2, 224]);
  await assert.rejects(store.change(order.id, { side: 'BACK' }, changed.revision), /ändras inte i ett prov för en person/);
});

test('a person\'s film goes into no bank until he is a dealer, and the live table\'s doll films are offered only at the live table', async (t) => {
  const { root, entry } = await liveLab(t);
  const order = { schemaVersion: 1, id: 'tomasz-prov-01', title: 'prov', person: { id: 'tomasz', name: 'Tomasz' }, uppsattning: 'live', kind: 'FILM', takes: 1, step: { key: 'GIV-2.3', edge: 'READY-C>P4.C1', shape: 'ONE_WAY', cutInto: [] },
    pictures: [], approval: { by: 'huvudagent', at: '2026-11-27T06:00:00Z', orderSha256: '0'.repeat(64), mandate: 'prov' }, status: 'GODKÄND', generation: { model: 'aleph-2' } };
  await writeFile(path.join(root, 'data/orders/tomasz-prov-01.json'), JSON.stringify(order));
  await assert.rejects(planRegistration(root, 'tomasz-prov-01', 1), /prov för Tomasz, som inte är dealer än/);
  const bank: BankFacts = { rendered: [entry] }, step = stepOf('GIV-2.3')!;
  assert.deepEqual(referenceCandidates(bank, { dealer: 'paow', step, target: 'P4.C1' }), [], 'a caller that names no set-up gets the former standard\'s films');
  assert.deepEqual(referenceCandidates(bank, { dealer: 'paow', step, target: 'P4.C1', uppsattning: 'live' }).map((c) => [c.take, c.uppsattning]), [['docka-danilo-p4', 'live']]);
});

test('a call through the API key to Aleph 2 reads as an order: the film it made over, the guidance picture at its second', () => {
  const read = fromApiEntry({ name: 'prov', endpoint: '/v1/video_to_video', body: { model: 'aleph2', videoUri: '$file:../standarddocka/klipp/film.mp4', promptText: TENTH, keyframes: [{ uri: '$file:styrbild.png', seconds: 0 }] },
    files: { '../standarddocka/klipp/film.mp4': { sha256: 'a'.repeat(64) }, 'styrbild.png': { sha256: 'b'.repeat(64) } }, requestedAt: '2026-11-27T04:18:36Z', taskId: 'da3cfe38-a6dd-443d-acbe-293e04480075', cost: 84, delivery: { path: 'ut.mp4', sha256: 'c'.repeat(64) } });
  assert.deepEqual([read.model, read.tool, read.params.keyframes, read.params.referenceVideos, read.pictures?.['styrbild.png']?.sha256], ['aleph-2', 'video_to_video', [{ file: 'styrbild.png', seconds: 0 }], [{ file: '../standarddocka/klipp/film.mp4' }], 'b'.repeat(64)]);
  assert.match(read.how ?? '', /styrbild vid sekund 0/);
});
