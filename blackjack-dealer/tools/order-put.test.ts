// Skyddar: beställningarna – en tagning läggs exakt en gång, och bara för en godkänd och oförändrad beställning; godkännandet hålls av fullmakten, dygnstaket och saldot.
// The receipt writer (tools/order-put.ts) keeps exactly-once: requestedAt before the call, the task id after, a begun
// take never begun again, nothing for an order that is not approved or has changed since, files checked against their hash.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm, copyFile, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { orderStore } from './order-store.ts';
import { committedText } from './committed.ts';
import { placedFromCommand, receiptMatchesOrder, receipts, reviewFromCommand } from './order-put.ts';
import { placedThrough } from './register-order.ts';
import {orderHash} from './order-store.ts';
import { approvalWords, type Approval } from '../src/order-model.ts';

const base = os.tmpdir();

async function approved(t: { after(fn: () => Promise<void>): void }) {
  const root = await mkdtemp(path.join(base, 'order-put-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ['data', 'placements', 'assets/anchors/a']) await mkdir(path.join(root, dir), { recursive: true });
  for (const file of ['data/order-policy.json', 'data/order-methods.json']) await copyFile(file, path.join(root, file));
  // A made-up dealer: the repo's own register of dealers is never read.
  await writeFile(path.join(root, 'data/dealers.json'), JSON.stringify({ schemaVersion: 1, dealers: [{ id: 'vera', name: 'Vera', look: 'a made-up test dealer', films: { prefix: 'vera-' }, shoe: '2.1', paused: null }] }));
  const policyFile = path.join(root, 'data/order-policy.json');
  const policy = JSON.parse(await readFile(policyFile, 'utf8'));
  const writeMandate = (mandate: Record<string, unknown>) => writeFile(policyFile, JSON.stringify({...policy, mandate: {id: 'test-staende', ...mandate}}));
  let instant = '2026-11-12T22:00:00Z';
  const setTime = (at: string) => { instant = at; };
  const now = () => new Date(instant);
  await writeFile(path.join(root, 'placements/default.json'), committedText('placements/default.json')); // his plan as committed, not as he last saved it (tools/committed.ts)
  const png = await sharp({ create: { width: 1764, height: 1174, channels: 3, background: { r: 0, g: 237, b: 44 } } }).png().toBuffer();
  await writeFile(path.join(root, 'assets/anchors/a/anchor.png'), png);
  await writeFile(path.join(root, 'data/clip-jobs.json'), '{"jobs": []}');
  await writeFile(path.join(root, 'data/media-roles.json'), JSON.stringify({ schemaVersion: 1, measures: [], dealers: {
    vera: { name: 'Vera', entries: [{ id: 'vera-vila', role: 'ankare-1', name: 'Vila', path: 'assets/anchors/a/anchor.png', node: 'IDLE', state: 'gäller' }] },
  } }));
  const store = orderStore(root, { now });
  const draft = await store.create({ dealer: 'vera', step: 'ANKARE-2.1', takes: 2, id: 'prov-ett' });
  const r = receipts(root, { now });
  await assert.rejects(r.begin('prov-ett', 1), /inte godkänd/);
  await store.approve('prov-ett', draft.revision);
  return { root, r, store, setTime, writeMandate };
}


test('a summary correction preserves submitted hashes and cannot disguise changed generation inputs', async t => {
  const {root, r, store} = await approved(t);
  const {order: before} = await store.load('prov-ett');
  await r.begin('prov-ett', 1);
  const receiptBefore = await r.read('prov-ett');
  const next = await r.amendSummary('prov-ett', 'Gör en tydligare beskriven ankarebild.', 'Rätta visningstext utan att ändra beställningen.');
  assert.notEqual(orderHash(next), orderHash(before));
  assert.equal(receiptMatchesOrder(next, orderHash(before)), true);
  assert.deepEqual(await r.read('prov-ett'), receiptBefore, 'submitted receipt is byte-equivalent data');
  assert.deepEqual(next.prompt, before.prompt);
  assert.deepEqual(next.pictures, before.pictures);
  const corrupt = structuredClone(next);
  corrupt.generation.params.resolution = 'changed';
  corrupt.approval!.orderSha256 = orderHash(corrupt);
  assert.equal(receiptMatchesOrder(corrupt, orderHash(before)), false, 'rehashing changed inputs is not a summary correction');
  await r.placed('prov-ett', 1, 'original-task');
  assert.equal((await r.read('prov-ett'))!.orderSha256, orderHash(before));
  const original = JSON.parse(await readFile(path.join(root, 'assets/orders/prov-ett', `order-${orderHash(before)}.json`), 'utf8'));
  assert.deepEqual(original, before);
});

type BeginResult =
  | {ok: true; status: string}
  | {ok: false; status: number; message: string};

const beginProbe = `
  const [moduleUrl, id] = process.argv.slice(1);
  const root = process.cwd();
  if (!/(?:^|[\\\\/])order-put-[^\\\\/]+$/.test(root)) throw Error('A receipt probe needs its fixture.');
  const {receipts} = await import(moduleUrl);
  process.once('message', async () => {
    let result;
    try {
      const {take} = await receipts(root, {now: () => new Date('2026-11-12T22:00:00Z')}).begin(id, 1);
      result = {ok: true, status: take.status};
    } catch (error) {
      result = {ok: false, status: error.status, message: error.message};
    }
    process.send({result}, () => process.disconnect());
  });
  process.send({ready: true});
`;

// The IPC barrier starts independent Node processes together, after both have loaded the real receipt writer.
async function beginProcesses(root: string, ids: string[]): Promise<BeginResult[]> {
  const moduleUrl = new URL('./order-put.ts', import.meta.url).href;
  const env = {...process.env};
  delete env.NODE_TEST_CONTEXT;
  const probes = ids.map(id => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', beginProbe, moduleUrl, id], {
      cwd: root, env, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    let result: BeginResult | undefined;
    let output = '';
    child.stderr?.on('data', data => { output = (output + String(data)).slice(-4000); });
    child.on('error', error => { output += error.message; });
    child.on('message', message => { const reply = (message as {result?: BeginResult}).result; if (reply) result = reply; });
    const ready = new Promise<void>(resolve => {
      child.once('message', message => { if ((message as {ready?: boolean}).ready) resolve(); });
    });
    const closed = new Promise<{code: number | null; result?: BeginResult; output: string}>(resolve => {
      child.once('close', code => resolve({code, result, output}));
    });
    return {child, ready, closed};
  });
  const stop = () => {
    for (const {child} of probes) if (child.exitCode === null && child.signalCode === null) child.kill();
  };
  const timeout = setTimeout(stop, 15000);
  try {
    await Promise.race([
      Promise.all(probes.map(probe => probe.ready)),
      ...probes.map(probe => probe.closed.then(({code, output}) => {
        throw new Error('Receipt probe exited before ready (' + code + '). ' + output);
      })),
    ]);
    for (const {child} of probes) child.send('begin');
    const completed = await Promise.all(probes.map(probe => probe.closed));
    return completed.map(({code, result, output}) => {
      assert.equal(code, 0, output);
      assert.ok(result, output);
      return result;
    });
  } finally {
    clearTimeout(timeout);
    stop();
    await Promise.all(probes.map(probe => probe.closed));
  }
}

test('requestedAt before, task id after, and a begun take is never begun again', async (t) => {
  const { root, r } = await approved(t);
  const check = await r.check('prov-ett');
  assert.deepEqual(check.files.map((f) => [f.name, f.mimeType, f.tag, f.goesAs]), [['anchor.png', 'image/png', 'anchor', 'referenceImage']]);
  const begun = await r.begin('prov-ett', 1);
  assert.equal(begun.take.status, 'OSÄKER');
  assert.equal(begun.take.requestedAt, '2026-11-12T22:00:00.000Z');
  assert.equal(begun.request.tool, 'generate_image');
  assert.equal(begun.request.args.model, 'nano-banana-pro');
  assert.equal(begun.request.args.confirmRepeat, undefined);
  await assert.rejects(r.begin('prov-ett', 1), /aldrig igen/);
  await assert.rejects(r.begin('prov-ett', 3), /1–2/);
  await assert.rejects(r.placed('prov-ett', 2, 'task-0000-1111'), /kör begin först/);
  await assert.rejects(r.placed('prov-ett', 1, 'b90b9362-7a13-4b80-b498-c324f02c41f8', 17804, 'app' as never), /api eller mcp/);
  const placed = await r.placed('prov-ett', 1, 'b90b9362-7a13-4b80-b498-c324f02c41f8', 17804, 'api');
  assert.equal(placed.take.status, 'LAGD');
  assert.equal(placed.take.creditsRemainingAfter, 17804);
  // The channel the call went through is kept in the take (review of PR 1, 2026-11-21), and the bank says it from there;
  // a take without it says "kanal okänd", never MCP by default.
  assert.equal((placed.take as { via?: string }).via, 'api');
  assert.equal(placedThrough(placed.take as never).provider, 'Runway developer API');
  assert.equal(placedThrough({ via: 'mcp' }).provider, 'Runway MCP server (app account credits)');
  assert.equal(placedThrough({}).endpoint, 'kanal okänd');
  await assert.rejects(r.placed('prov-ett', 1, 'b90b9362-7a13-4b80-b498-c324f02c41f9'), /redan task-id/);
  assert.equal((await r.begin('prov-ett', 2)).request.args.confirmRepeat, true);
  await r.failed('prov-ett', 2, 'model_unavailable');
  await assert.rejects(r.begin('prov-ett', 2), /MISSLYCKAD/);
  // Forward only; HÄMTAD keeps the file and its hash.
  await assert.rejects(r.advance('prov-ett', 1, 'HÄMTAD'), /--file/);
  await writeFile(path.join(root, 'assets/orders/prov-ett/tagning-1.png'), 'png');
  const fetched = await r.advance('prov-ett', 1, 'HÄMTAD', { file: 'assets/orders/prov-ett/tagning-1.png' });
  assert.equal(fetched.take.file, 'assets/orders/prov-ett/tagning-1.png');
  assert.equal(fetched.take.sha256?.length, 64);
  await assert.rejects(r.advance('prov-ett', 1, 'KLAR'), /bakåt/);
  const receipt = JSON.parse(await readFile(path.join(root, 'assets/orders/prov-ett/receipt.json'), 'utf8'));
  assert.deepEqual(receipt.takes.map((x: { take: number; status: string }) => [x.take, x.status]), [[1, 'HÄMTAD'], [2, 'MISSLYCKAD']]);
  assert.deepEqual(receipt.takes[0].history.map((h: { status: string }) => h.status), ['OSÄKER', 'LAGD', 'HÄMTAD']);
});

test('placed rejects invalid balances before changing the receipt', async (t) => {
  const { root, r } = await approved(t);
  const id = 'prov-ett', task = 'b90b9362-7a13-4b80-b498-c324f02c41f8';
  await r.begin(id, 1);
  const file = path.join(root, 'assets/orders', id, 'receipt.json');
  const before = await readFile(file);
  for (const balance of [NaN, Infinity, -1, '2904', true]) {
    await assert.rejects(r.placed(id, 1, task, balance as number), /saldo/i);
    assert.deepEqual(await readFile(file), before);
  }
  for (const args of [[task, '--credits', '2904'], [task, '--credits'], ['--credits', '2904'], [task, '2904', 'extra'],
    [task, ''], [task, 'NaN'], [task, 'Infinity'], [task, '-1'], []]) {
    await assert.rejects(async () => placedFromCommand(root, id, 1, args), /saldo/i);
    assert.deepEqual(await readFile(file), before);
  }
  const saved = await placedFromCommand(root, id, 1, [task, '2904']);
  assert.deepEqual([saved.take.status, saved.take.taskId, saved.take.creditsRemainingAfter], ['LAGD', task, 2904]);
  await r.begin(id, 2);
  assert.equal((await placedFromCommand(root, id, 2, [task])).take.creditsRemainingAfter, null);
});

test('the reviewer\'s verdict is kept beside a take from HÄMTAD on without moving its state, and the protocol reads it', async (t) => {
  const { root, r } = await approved(t);
  await r.begin('prov-ett', 1);
  await assert.rejects(r.review('prov-ett', 1, 'Oberoende granskare: 3/5'), /OSÄKER: granskarens dom förs in först när filmen är hämtad/);
  await r.placed('prov-ett', 1, 'b90b9362-7a13-4b80-b498-c324f02c41f8');
  await assert.rejects(r.review('prov-ett', 1, 'Oberoende granskare: 3/5'), /LAGD/);
  await assert.rejects(r.review('prov-ett', 2, 'x'), /inte lagd/);
  await writeFile(path.join(root, 'assets/orders/prov-ett/tagning-1.png'), 'png');
  await r.advance('prov-ett', 1, 'HÄMTAD', { file: 'assets/orders/prov-ett/tagning-1.png' });
  await r.advance('prov-ett', 1, 'INFÖRD', { note: 'förd in före granskningen' });
  await assert.rejects(r.review('prov-ett', 1, '  '), /--note/);
  const kept = await r.review('prov-ett', 1, 'Oberoende granskare: given 2,5/5, returen 1/5 möjlig variant.');
  assert.equal(kept.take.status, 'INFÖRD', 'the state does not move');
  assert.deepEqual(kept.take.review, { at: '2026-11-12T22:00:00.000Z', note: 'Oberoende granskare: given 2,5/5, returen 1/5 möjlig variant.' });
  assert.deepEqual(kept.take.history.map((h) => h.status), ['OSÄKER', 'LAGD', 'HÄMTAD', 'INFÖRD'], 'no step is added');
  const { reviewerNote, scoresOf } = await import('../studio/lib/ledger.ts');
  const receipt = JSON.parse(await readFile(path.join(root, 'assets/orders/prov-ett/receipt.json'), 'utf8'));
  assert.deepEqual(scoresOf(reviewerNote(receipt.takes[0].history, receipt.takes[0].review)), { score: 2.5, deal: 2.5, back: 1 });
  // A later GRANSKAD note is newer than the one kept beside, and the other way round.
  assert.equal(reviewerNote([{ at: '2026-11-13T01:00:00Z', status: 'GRANSKAD', note: 'Oberoende granskare: 4/5' }], { at: '2026-11-12T22:00:00Z', note: 'Oberoende granskare: 1/5' }), 'Oberoende granskare: 4/5');
  assert.equal(reviewerNote([{ at: '2026-11-12T21:00:00Z', status: 'GRANSKAD', note: 'Oberoende granskare: 4/5' }], { at: '2026-11-12T22:00:00Z', note: 'Oberoende granskare: 1/5' }), 'Oberoende granskare: 1/5');
});

test('review evidence binds actual after-work bytes and rejects changed, duplicate or foreign proof without replacing the verdict', async (t) => {
  const { root, r } = await approved(t);
  await r.begin('prov-ett', 1);
  await r.placed('prov-ett', 1, 'b90b9362-7a13-4b80-b498-c324f02c41f8');
  const prefix = 'assets/orders/prov-ett/take-1/';
  await mkdir(path.join(root, prefix, 'review'), {recursive: true});
  const file = async (name: string, bytes: string) => {
    const relative = prefix + name;
    await writeFile(path.join(root, relative), bytes);
    return {path: relative, sha256: createHash('sha256').update(bytes).digest('hex')};
  };
  const original = await file('source.png', 'original'), film = await file('after.png', 'after-worked');
  const report = await file('review/review.md', 'independent review'), image = await file('review/proof.png', 'proof pixels');
  await r.advance('prov-ett', 1, 'HÄMTAD', {file: original.path});
  const evidence = {film, files: [report, image]};
  const saved = await r.review('prov-ett', 1, 'Variant 4/5, local evidence', evidence);
  assert.deepEqual(saved.take.review?.evidence, evidence);
  assert.equal(saved.take.status, 'HÄMTAD');
  assert.equal(saved.take.sha256, original.sha256, 'download identity stays separate from the reviewed version');
  const receiptPath = path.join(root, 'assets/orders/prov-ett/receipt.json');
  const before = await readFile(receiptPath, 'utf8');
  for (const invalid of [
    {film: {...film, sha256: '0'.repeat(64)}, files: [report]},
    {film, files: [{...report, sha256: '0'.repeat(64)}]},
    {film, files: [{...report, path: prefix + 'review/missing.md'}]},
    {film, files: [{...report, path: prefix + '../take-2/review.md'}]},
    {film, files: [{...report, path: report.path.replace('take-1', 'take-2')}]},
    {film, files: [{...report, path: report.path.replace('prov-ett', 'another-order')}]},
    {film, files: [report, report]},
    {film, files: [report, {...report, path: report.path.replace('review.md', 'REVIEW.md')}]},
    {film, files: [film]},
    {film, files: [{...report, path: prefix + 'review/.env'}]},
    {film, files: [{...report, path: prefix + 'review/private/report.md'}]},
    {film, files: [{...report, path: prefix + 'review/trailing.'}]},
    {film, files: [{...report, path: prefix + 'review/with%escape.md'}]},
    {film, files: []},
    {film, files: Array.from({length: 33}, () => report)},
  ]) {
    await assert.rejects(r.review('prov-ett', 1, 'must not replace', invalid), /Granskningsunderlag/);
    assert.equal(await readFile(receiptPath, 'utf8'), before);
  }
  // Even a canonical lexical path cannot read proof from another take through a directory junction.
  const elsewhere = path.join(root, 'elsewhere');
  await mkdir(elsewhere);
  await writeFile(path.join(elsewhere, 'proof.md'), 'independent review');
  await symlink(elsewhere, path.join(root, prefix, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(r.review('prov-ett', 1, 'must not replace', {film, files: [{...report, path: prefix + 'linked/proof.md'}]}), /länk lämnar/);
  assert.equal(await readFile(receiptPath, 'utf8'), before);
  await symlink(path.join(root, prefix, 'review'), path.join(root, prefix, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(r.review('prov-ett', 1, 'must not replace', {film, files: [report, {...report, path: prefix + 'alias/review.md'}]}), /samma verkliga fil/);
  assert.equal(await readFile(receiptPath, 'utf8'), before);
  const packet = path.join(root, 'packet.json');
  await writeFile(packet, JSON.stringify(evidence));
  for (const args of [
    ['--note', 'new note', '--evidence=packet.json'],
    ['--note', '--evidence', 'packet.json'],
    ['--note', 'new note', '--evidence'],
    ['--note', 'new note', '--note', 'another note'],
    ['--note', 'new note', '--evidence', 'packet.json', '--evidence', 'packet.json'],
  ]) {
    await assert.rejects(reviewFromCommand(root, 'prov-ett', 1, args), /flagga|saknar|mer än en gång/);
    assert.equal(await readFile(receiptPath, 'utf8'), before, 'CLI argument errors leave the complete receipt byte-identical');
  }
  const fromCLI = await reviewFromCommand(root, 'prov-ett', 1, ['--note', 'CLI review', '--evidence', 'packet.json']);
  assert.deepEqual(fromCLI.take.review?.evidence, evidence);
  // A new note alone must not silently inherit evidence for an earlier review.
  const replaced = await r.review('prov-ett', 1, 'Later note without proof');
  assert.equal(replaced.take.review?.evidence, undefined);
});

test('a GRANSKAD note replaces older review evidence, but a later INFÖRD status preserves the review', async (t) => {
  const { root, r, setTime } = await approved(t);
  const id = 'prov-ett', prefix = `assets/orders/${id}/take-1/`;
  await r.begin(id, 1);
  await r.placed(id, 1, 'b90b9362-7a13-4b80-b498-c324f02c41f8');
  await mkdir(path.join(root, prefix), {recursive: true});
  const save = async (name: string, bytes: string) => {
    const file = prefix + name;
    await writeFile(path.join(root, file), bytes);
    return {path: file, sha256: createHash('sha256').update(bytes).digest('hex')};
  };
  const evidence = {film: await save('source.png', 'film bytes'), files: [await save('review.md', 'proof bytes')]};
  await r.advance(id, 1, 'HÄMTAD', {file: evidence.film.path});
  await r.advance(id, 1, 'MÄTT');
  setTime('2026-11-12T22:01:00Z');
  await r.review(id, 1, 'Older review', evidence);

  setTime('2026-11-12T22:02:00Z');
  await r.advance(id, 1, 'GRANSKAD', {note: 'New review without evidence'});
  const graded = (await r.read(id))!.takes[0];
  const { reviewerNote } = await import('../studio/lib/ledger.ts');
  assert.equal(graded.status, 'GRANSKAD');
  assert.equal(reviewerNote(graded.history, graded.review), 'New review without evidence');
  assert.deepEqual(graded.review, {at: graded.history.at(-1)!.at, note: 'New review without evidence'});

  setTime('2026-11-12T22:03:00Z');
  const fresh = await r.review(id, 1, 'Review with new evidence', evidence);
  const imported = await r.advance(id, 1, 'INFÖRD', {note: 'Införd i banken'});
  assert.equal(imported.take.status, 'INFÖRD');
  assert.deepEqual(imported.take.review, fresh.take.review);
  assert.deepEqual(imported.take.review?.evidence, evidence);
});

test('nothing is placed for an order that changed after approval or whose picture changed on disk', async (t) => {
  const { root, r } = await approved(t);
  const file = path.join(root, 'data/orders/prov-ett.json');
  const order = JSON.parse(await readFile(file, 'utf8'));
  await writeFile(file, JSON.stringify({ ...order, takes: 1 }, null, 2));
  await assert.rejects(r.begin('prov-ett', 1), /ändrats efter godkännandet/);
  await writeFile(file, JSON.stringify(order, null, 2));
  await writeFile(path.join(root, 'assets/orders/prov-ett/anchor.png'), 'other');
  await assert.rejects(r.begin('prov-ett', 1), /inte den godkända filen/);
});

test('the main agent approves on Jakob\'s mandate with the same checks; check takes it only with the mandate; a draft can be set aside', async (t) => {
  const { root, store } = await approved(t);
  const { approveCommand } = await import('./order-approve.ts');
  const draft = await store.create({ dealer: 'vera', step: 'ANKARE-2.1', takes: 2, id: 'prov-tva' });
  await assert.rejects(approveCommand(root, ['prov-tva', '--mandate', ' ']), /Använd/);
  const out = await approveCommand(root, ['prov-tva', '--mandate', 'Jakob 2026-11-13: beställ lämpliga filmer automatiskt utan mitt godkännande'], { now: () => new Date('2026-11-12T22:00:00Z') });
  const approval = out.approval as { by: string; mandate: string; orderSha256: string };
  assert.deepEqual([approval.by, approval.mandate], ['huvudagent', 'Jakob 2026-11-13: beställ lämpliga filmer automatiskt utan mitt godkännande']);
  assert.match(String((out.day as { words: string }).words), /^Agenterna i dag: .+ krediter med den här/);
  const { order } = await store.load('prov-tva');
  assert.equal(order.approval!.orderSha256, (await import('./order-store.ts')).orderHash(order), 'the hash frozen as for his click');
  assert.equal(draft.order.id, 'prov-tva');
  const r = receipts(root);
  assert.equal((await r.check('prov-tva')).order.approval!.by, 'huvudagent');
  // Without its mandate the approval is refused: by the order check and by check.
  const file = path.join(root, 'data/orders/prov-tva.json');
  const value = JSON.parse(await readFile(file, 'utf8'));
  delete value.approval.mandate;
  await writeFile(file, JSON.stringify(value, null, 2));
  await assert.rejects(r.check('prov-tva'), /uppdrag/);
  await assert.rejects(r.begin('prov-tva', 1), /uppdrag/);
  // Set aside with why: AVBRUTEN, the reason kept; an approved order cannot be set aside.
  await store.create({ dealer: 'vera', step: 'ANKARE-2.1', takes: 2, id: 'prov-tre' });
  const aside = await approveCommand(root, ['prov-tre', '--set-aside', 'Långa textens metodprov körs inte (huvudagenten 2026-11-13).']);
  assert.equal(aside.status, 'AVBRUTEN');
  assert.match(String((aside.setAside as { why: string }).why), /körs inte/);
  await assert.rejects(approveCommand(root, ['prov-ett', '--set-aside', 'x']), /godkänd/);
});

// Jakob 2026-11-25: the agents approve up to askAbove on their own; a larger order is his, by his click or by his yes from
// the chat with his words; perDayCredits holds what agents approve and call directly in a day, never his own approvals.
test('the standing mandate: a larger order needs Jakob, his yes from the chat is his, and the agents\' day holds only them', async (t) => {
  const { root, store, setTime, writeMandate } = await approved(t);
  const { approveCommand } = await import('./order-approve.ts');
  const on = (day: string) => { setTime(`${day}T10:00:00Z`); return { now: () => new Date(`${day}T10:00:00Z`) }; };
  const draft = (id: string) => store.create({ dealer: 'vera', step: 'ANKARE-2.1', takes: 2, id });
  const cost = (await draft('prov-stor')).order.cost.worstTotal, half = Math.floor(cost / 2);
  await writeMandate({ askAbove: cost - 1, perDayCredits: cost * 10 });
  await assert.rejects(approveCommand(root, ['prov-stor', '--mandate', 'pilot för plats 4'], on('2026-11-25')), /Jakob avgör\. Han klickar i Beställ, eller så förs hans ja från chatten in med node tools\/order-approve\.ts prov-stor --jakob/);
  await assert.rejects(approveCommand(root, ['prov-stor', '--jakob', ' ']), /Använd/);
  const his = await approveCommand(root, ['prov-stor', '--jakob', 'Jakob 2026-11-25: "ja, kör den"'], on('2026-11-25'));
  const approval = his.approval as Approval;
  assert.deepEqual([approval.by, approval.at, approval.mandate], ['jakob', '2026-11-25T10:00:00.000Z', 'Jakob 2026-11-25: "ja, kör den"']);
  assert.equal(his.day, undefined, 'his yes is not counted against the agents');
  assert.equal(approvalWords(approval), 'Godkänd av Jakob i chatten');
  assert.equal((await receipts(root).check('prov-stor')).order.approval!.by, 'jakob');

  // What the main agent approves counts against the day, and the day holds only the agents.
  await writeMandate({ askAbove: cost, perDayCredits: cost + half });
  for (const id of ['prov-agent', 'prov-agent-2', 'prov-imorgon']) await draft(id);
  const first = await approveCommand(root, ['prov-agent', '--mandate', 'pilot för plats 4'], on('2026-11-25'));
  assert.deepEqual([(first.day as { before: number }).before, (first.day as { after: number }).after], [0, cost]);
  await assert.rejects(approveCommand(root, ['prov-agent-2', '--mandate', 'pilot för plats 5'], on('2026-11-25')), /ryms inte i agenternas/);
  assert.equal((await store.list()).policy?.mandateBudget?.spentToday, cost, 'his click and his yes are not the agents\'');
  await store.approve('prov-agent-2', (await store.load('prov-agent-2')).revision);
  // A new day starts empty; a direct call through the API key that day counts too.
  await mkdir(path.join(root, '.runtime/runway-api'), { recursive: true });
  await writeFile(path.join(root, '.runtime/runway-api/ledger.json'), JSON.stringify({ orders: [{ name: 'prov', requestedAt: '2026-11-26T09:00:00Z', expectCredits: half }] }));
  const next = await approveCommand(root, ['prov-imorgon', '--mandate', 'pilot för plats 6'], on('2026-11-26'));
  assert.deepEqual([(next.day as { before: number }).before, (next.day as { after: number }).after], [half, half + cost]);
});

// Two approvals at once (two chats, or a chat and a direct call) each read the agents' day: under the ledger's lock only
// one of them can take the credits that are left.
test('two approvals by the main agent at once never both fit in what is left of the agents\' day', async (t) => {
  const { root, store, setTime, writeMandate } = await approved(t);
  const { approveCommand } = await import('./order-approve.ts');
  setTime('2026-11-25T10:00:00Z');
  const day = { now: () => new Date('2026-11-25T10:00:00Z') };
  const cost = (await store.create({ dealer: 'vera', step: 'ANKARE-2.1', takes: 2, id: 'prov-a' })).order.cost.worstTotal;
  await store.create({ dealer: 'vera', step: 'ANKARE-2.1', takes: 2, id: 'prov-b' });
  await writeMandate({ askAbove: cost, perDayCredits: cost + Math.floor(cost / 2) });
  const both = await Promise.allSettled(['prov-a', 'prov-b'].map((id) => approveCommand(root, [id, '--mandate', 'pilot för plats 4'], day)));
  assert.deepEqual(both.map((b) => b.status).sort(), ['fulfilled', 'rejected']);
  assert.match(String((both.find((b) => b.status === 'rejected') as PromiseRejectedResult).reason), /ryms inte i agenternas/);
});

// The policy's floor is held against the developer project's balance: the policy's own reading, or a newer one from a take
// placed through the API key. Runway's MCP app has a pot of its own and never stands in for it.
test('the balance an approval is held against is the API key\'s pot, never the MCP app\'s', async (t) => {
  const { r, store, setTime } = await approved(t);
  const policy = (await store.list()).balance?.credits;
  setTime('2026-11-27T10:00:00Z');
  await r.begin('prov-ett', 1);
  await r.placed('prov-ett', 1, 'b90b9362-7a13-4b80-b498-c324f02c41f8', 17, 'mcp');
  assert.equal((await store.list()).balance?.credits, policy, 'the MCP app\'s pot is not this balance');
  await r.begin('prov-ett', 2);
  await r.placed('prov-ett', 2, 'b90b9362-7a13-4b80-b498-c324f02c41f9', 5000, 'api');
  assert.equal((await store.list()).balance?.credits, 5000);
});

test('a lock left by an interrupted process refuses a new start and remains in place', async t => {
  const {root, r} = await approved(t);
  const lock = path.join(root, '.runtime/order-start.lock');
  const abandoned = 'fixture: previous process exited before removing its lock';
  await mkdir(path.dirname(lock), {recursive: true});
  await writeFile(lock, abandoned, {flag: 'wx'});
  const [blocked] = await beginProcesses(root, ['prov-ett']);
  assert.ok(!blocked.ok, JSON.stringify(blocked));
  assert.equal(blocked.status, 409);
  assert.match(blocked.message, /startas just nu/);
  assert.equal(await r.read('prov-ett'), null);
  assert.equal(await readFile(lock, 'utf8'), abandoned);
});
