import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildGraph, resolveRound, type BankData, type Segment} from '../src/clip-graph.ts';
import {readRelease, releaseDealers, namedAssets, engineSource, forEngine, ENGINE_ENTRY, ENGINE_CRYPTO, blockedName, blockedPath, redactText, scrub, findLeaks, findTextLeaks, pickTakes, pickProofs, freezeBank, graphShape, safeRelative, objectName, type Proof, type Release} from './studio-freeze.ts';
import {snapshotMaterial} from './studio-material.ts';
import {type GameCut} from '../src/dealer-trees.ts';

const release: Release = readRelease(JSON.parse(readFileSync(new URL('../data/studio-release.json', import.meta.url), 'utf8')));
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
/** Steps as played: per step the take, the frames and the film. */
const played = (round: Segment[]) => round.map(s => ({id: s.id, take: s.take?.id ?? null, start: s.start, end: s.end, video: s.video, gap: s.gap}));

test('the frozen Material view only names published stills and explicitly selected proof files', () => {
  const first = 'assets/motions/paow-a/first.webp', last = 'assets/motions/paow-a/last.webp';
  const video = 'assets/motions/paow-a/source.mp4', local = 'D:/private/unreleased.png';
  const proofVideo = 'assets/proofs/paow-prov/compare.mp4', omitted = 'assets/proofs/paow-prov/hidden.png';
  const privateProof = 'assets/proofs/private-other/available.png', shared = 'assets/proofs/common/table.png';
  const cut = (id: string, dealer = 'paow') => ({id, from: 'IDLE', to: 'READY', clip: id, frames: [0, 12] as [number, number], dealer});
  const bank: BankData = {
    derived: [cut('paow-a'), cut('ada-local', 'ada')],
    media: {'paow-a': {first, last, video, track: local}, 'ada-local': {first: local}},
  };
  const proof = (id: string, files: Proof['files']): Proof => ({id, files, title: local, description: local,
    labels: {}, verdicts: {}, updatedAt: null, chapters: null, fps: 24});
  const proofs = [proof('paow-prov', [
    {name: 'compare.mp4', path: proofVideo, kind: 'video', bytes: 2},
    {name: 'hidden.png', path: omitted, kind: 'image', bytes: 2},
    {name: 'available.png', path: privateProof, kind: 'image', bytes: 2},
  ]), proof('common', [{name: 'table.png', path: shared, kind: 'image', bytes: 2}])];
  const published = new Map([first, video, local, proofVideo, privateProof, shared].map(path => [path, 64]));
  const answer = snapshotMaterial(bank, proofs, ['paow', 'ada'], published);
  assert.deepEqual(answer.dealers.map(d => d.entries.map(e => e.served)), [[first, proofVideo, shared], [shared]]);
  assert.equal(answer.dealers[1].films, undefined, 'a machine path does not count as published bank media');
  assert.equal(answer.revision, null, 'nothing can be saved against the copy');
  assert.ok(answer.dealers.flatMap(d => d.entries).every(e => e.usedBy.length === 0 && e.source === undefined));
  assert.ok([last, omitted, privateProof, local].every(path => !JSON.stringify(answer).includes(path)));
  assert.deepEqual(findLeaks(answer, release, 'api/media.json'), []);
});

test('the register is read strictly, with Jakob\'s choices: no variants and no proof folder go up (2026-11-21)', () => {
  assert.equal(release.variants, false, 'the variants the game never chooses stay on the computer until he says otherwise');
  assert.deepEqual(release.proofs, [], 'no proof folder goes up');
  assert.ok(release.blocked.folders.length && release.blocked.names.length);
  assert.throws(() => readRelease({...release, schemaVersion: 2}));
  assert.throws(() => readRelease({...release, paow: 'ja'}));
  assert.throws(() => readRelease({...release, variants: undefined}));
  assert.throws(() => readRelease({...release, proofs: [{id: 'a', why: ''}]})); // a proof goes up only with a reason
  assert.throws(() => readRelease({...release, proofs: [{id: 'a', why: 'x', files: ['../b.mp4']}]}));
});

// ── The block list ──────────────────────────────────────────────────────────
const rules = {blocked: {folders: ['trailer*'], names: ['Göran', 'Astrid', 'Kevin']}};

test('blocked folders and names are found in any spelling, and only as whole words', () => {
  assert.equal(blockedPath('assets/proofs/trailer-noir/x.png', rules), 'mapp trailer*');
  assert.equal(blockedPath('assets/proofs/hel-runda/kevin-p4.mp4', rules), 'namn Kevin');
  assert.equal(blockedPath('assets/proofs/paow-kavaj/3-keystone-vila.png', rules), null);
  for (const text of ['en gammal hederlig Astrid-film', 'GÖRAN sa', 'goran']) assert.ok(blockedName(text, rules), text);
  for (const text of ['Kevinsson', 'Ada']) assert.equal(blockedName(text, rules), null, text);
});

test('a take or proof the rule picks but the block list stops is refused, not quietly skipped', () => {
  const bank = fixture();
  bank.jobs!.push({...bank.jobs![0], id: 'kevin-p4-c1-deal-01'});
  bank.motions!['kevin-p4-c1-deal-01'] = bank.motions!['paow-p4-c1-deal-01'];
  bank.media!['kevin-p4-c1-deal-01'] = {video: 'assets/motions/kevin-p4-c1-deal-01/source.mp4'};
  const picked = pickTakes(bank, 'paow', {...release, ...rules});
  assert.deepEqual(picked.refused.map(r => r.id), ['kevin-p4-c1-deal-01']);
  assert.ok(!picked.picked.some(p => p.id.startsWith('kevin')));
  const proof = (id: string): Proof => ({id, title: id, description: '', labels: null, verdicts: null, updatedAt: null, chapters: null, fps: 30, files: [{name: 'a.mp4', path: `assets/proofs/${id}/a.mp4`, kind: 'video', bytes: 1}]});
  const all = [proof('ada-film'), proof('trailer-noir'), proof('ren'), proof('paow-kavaj')];
  // the route's text is clean, the proof.json on disk names Göran: still refused
  const raw = new Map([['ren', '{"tool": "made with Göran"}']]);
  const wanted = {...release, ...rules, proofs: [{id: 'ada-film', why: 'x'}, {id: 'trailer-noir', why: 'x'}, {id: 'ren', why: 'x'}, {id: 'saknas', why: 'x'}]};
  const out = pickProofs(all, raw, wanted);
  assert.deepEqual(out.proofs.map(p => p.id), ['ada-film']);
  assert.deepEqual(out.refused.map(r => r.id).sort(), ['ren', 'saknas', 'trailer-noir']);
  // Paow off: her proof is left out
  const off = pickProofs(all, new Map(), {...wanted, paow: false, proofs: [{id: 'paow-kavaj', why: 'x'}]});
  assert.deepEqual(off.proofs, []);
  // a file list narrows a proof; a file it names that does not exist is refused
  assert.equal(pickProofs(all, new Map(), {...wanted, proofs: [{id: 'ada-film', why: 'x', files: ['b.mp4']}]}).refused.length, 1);
});

// ── Texts ───────────────────────────────────────────────────────────────────
test('costs, blocked names and machine paths leave the texts; his stamp stays', () => {
  assert.equal(redactText('Jakob 2026-11-11: Bra. Det kan gå tillbaka till Astrid. Ta den.', rules), 'Jakob 2026-11-11: Bra. Ta den.');
  assert.equal(redactText('Jakob 2026-11-11: Det kan gå tillbaka till Astrid.', rules), 'Jakob 2026-11-11: …');
  assert.equal(redactText('Low-resolution probe (784×522, 6 s, 30 credits). Seen by the agent.', rules), 'Low-resolution probe. Seen by the agent.');
  assert.equal(redactText('Kostnad: cirka 590 krediter (skattat). Film 1 duger.', rules), 'Film 1 duger.');
  assert.equal(redactText('Se C:\\Users\\jakem\\x.png och /Users/someone/y.png', rules), 'Se … och …');
  assert.deepEqual(findTextLeaks('new URL(e,"x:/") https://example.com/a', rules), [], 'a URL is no path of this machine');
  for (const real of ['root=D:/x/y', '"C:\\\\Users\\\\jakem"', 'e?s=i:/höjd/i.test(a):"D:/dealer-scratch/tmp"', 'file:///C:/Users/jakem/x'])
    assert.deepEqual(findTextLeaks(real, rules), ['lokal sökväg'], real);
});

test('scrub drops forbidden keys anywhere and findLeaks finds what is left', () => {
  const dirty = {a: {estimatedCredits: 60, b: [{budget: {maximumCredits: 1}, ok: 'Ada'}]}, requestedAt: 'x', note: 'It cost 60 credits.'};
  assert.deepEqual(scrub(dirty, rules), {a: {b: [{ok: 'Ada'}]}, note: '…'});
  assert.deepEqual(findLeaks(scrub(dirty, rules), rules), []);
  const leaks = findLeaks({x: [{taskId: 'abc'}], y: 'D:/a/b', z: 'Kevin', w: '$5'}, rules);
  assert.equal(leaks.length, 4);
});

// ── The frozen clip bank ────────────────────────────────────────────────────
// A deal and a return that starts from the deal's landing picture, which lies at a path of this machine: the frozen bank
// must hide the path and still let the return follow the deal (returnFits compares the two paths).
function fixture(): BankData & Record<string, any> {
  const landing = 'D:/private/anchors/p4-landing.png', ready = {file: {path: 'assets/anchors/ready.png', sha256: 'b'.repeat(64)}};
  const job = (id: string, kind: string, from: string, to: string, first: object, last: object, purpose: string) =>
    ({id, kind, target: 'P4.C1', from, to, model: 'wan3', duration: 3, ratio: 'auto_1080p', audio: false, promptText: 'Locked camera.', first, last, purpose});
  return {
    schemaVersion: 1, readable: true, budget: {maximumCredits: 5000},
    jobs: [job('paow-p4-c1-deal-01', 'DEAL', 'READY', 'P4.C1', ready, {file: {path: landing}}, 'The deal to seat 4. Ordered after two probes (35 + 40 app credits).'),
      job('paow-p4-c1-return-ready-01', 'RETURN', 'P4.C1', 'READY', {file: {path: landing}}, ready, 'Back to the shoe.')],
    derived: [], edits: [],
    motions: {
      'paow-p4-c1-deal-01': {source: {fps: 30, frames: 90, provider: 'Runway MCP server (app account credits)'}, review: {decision: 'ACCEPTED', userAccepted: true, userReview: 'Jakob 2026-11-11: Bra. Det kan gå tillbaka till Astrid.'}},
      'paow-p4-c1-return-ready-01': {source: {fps: 30, frames: 60}, review: {decision: 'PENDING'}},
    },
    receipts: {'paow-p4-c1-deal-01': {status: 'SUCCEEDED', estimatedCredits: 60, requestedAt: '2026-11-10T21:43:47Z', completedAt: '2026-11-10T21:45:32Z', output: {bytes: 1, fps: 30, frames: 90, width: 1764, height: 1174}}},
    media: {
      'paow-p4-c1-deal-01': {video: 'assets/motions/paow-p4-c1-deal-01/source.mp4', first: 'assets/motions/paow-p4-c1-deal-01/first.png', last: null, track: null, overrides: null},
      'paow-p4-c1-return-ready-01': {video: 'assets/motions/paow-p4-c1-return-ready-01/source.mp4', first: null, last: null, track: null, overrides: null},
    },
    revisions: {'paow-p4-c1-deal-01': '"abc"', 'paow-p4-c1-return-ready-01': '"def"'},
  };
}

test('the frozen bank has no cost or private field and decides exactly as the lab', () => {
  const bank = fixture();
  const before = JSON.stringify(bank);
  const shown = new Map([
    ['assets/motions/paow-p4-c1-deal-01/source.mp4', 'assets/motions/paow-p4-c1-deal-01/source.mp4'],
    ['assets/motions/paow-p4-c1-return-ready-01/source.mp4', 'assets/motions/paow-p4-c1-return-ready-01/source.mp4'],
  ]);
  const frozen = freezeBank(bank, shown, new Set(['paow-p4-c1-deal-01', 'paow-p4-c1-return-ready-01']), {...release, ...rules}, digest);
  assert.equal(JSON.stringify(bank), before, 'the lab answer is not changed');
  assert.deepEqual(findLeaks(frozen, rules), []);
  const text = JSON.stringify(frozen);
  for (const word of ['estimatedCredits', 'budget', 'maximumCredits', 'requestedAt', 'completedAt', 'credits', 'D:/', 'Astrid', '"abc"']) assert.ok(!text.includes(word), word);
  assert.deepEqual(frozen.revisions, {}, 'no revision: nothing can be saved against the copy');
  assert.equal(frozen.motions!['paow-p4-c1-deal-01'].review!.userReview, 'Jakob 2026-11-11: Bra.');
  // the landing path is a token, the same on both sides
  const token = (frozen.jobs![0].last as {file: {path: string}}).file.path;
  assert.match(token, /^lokal\/[a-f0-9]{16}\.png$/);
  assert.equal((frozen.jobs![1].first as {file: {path: string}}).file.path, token);
  const live = buildGraph(bank), copy = buildGraph(frozen);
  assert.deepEqual(graphShape(copy), graphShape(live));
  const steps = [{from: 'READY', to: 'P4.C1'}, {from: 'P4.C1', to: 'READY'}];
  assert.deepEqual(played(resolveRound(copy, steps)), played(resolveRound(live, steps)));
});

test('a take that is not picked keeps its verdict but shows no film', () => {
  const bank = fixture();
  const shown = new Map([['assets/motions/paow-p4-c1-return-ready-01/source.mp4', 'assets/motions/paow-p4-c1-return-ready-01/source.mp4']]);
  const frozen = freezeBank(bank, shown, new Set(['paow-p4-c1-deal-01']), {...release, ...rules}, digest);
  assert.equal(frozen.media!['paow-p4-c1-return-ready-01'].video, null);
  assert.equal(frozen.motions!['paow-p4-c1-return-ready-01'].review!.decision, 'PENDING');
});

test('the game decides what goes up: what it plays goes up, a take that waits for Jakob stays, and a dealer outside the Casino has none', () => {
  const bank = fixture();
  const out = pickTakes(bank, 'paow', {...release, ...rules});
  assert.deepEqual(out.picked, [{id: 'paow-p4-c1-deal-01', group: 'spel'}]);
  assert.deepEqual(out.left.map(l => l.id), ['paow-p4-c1-return-ready-01']);
  const off = pickTakes(bank, 'paow', {...release, ...rules, casino: {on: false, dealers: []}});
  assert.deepEqual([off.picked, off.left.length], [[], 2]);
});

test('a variant the game never chooses itself goes up only with variants on', () => {
  const bank = fixture(), variant = {decision: 'ACCEPTED', acceptedAs: 'VARIANT', userAccepted: true};
  bank.jobs!.push({...bank.jobs![0], id: 'paow-p4-c1-deal-02'});
  bank.motions!['paow-p4-c1-deal-02'] = {source: {fps: 30, frames: 90}, review: variant};
  bank.media!['paow-p4-c1-deal-02'] = {video: 'assets/motions/paow-p4-c1-deal-02/source.mp4'};
  assert.ok(!pickTakes(bank, 'paow', {...release, ...rules}).picked.some(p => p.id === 'paow-p4-c1-deal-02'), 'beside the accepted deal: the game never plays it');
  assert.deepEqual(pickTakes(bank, 'paow', {...release, ...rules, variants: true}).picked.find(p => p.id === 'paow-p4-c1-deal-02'), {id: 'paow-p4-c1-deal-02', group: 'variant'});
});

test('a take Jakob has archived is never picked: its film does not go up, whatever its verdict, and the copy still decides as the lab', () => {
  const bank = fixture(), archived = {by: 'Jakob', at: '2026-11-18T01:00:00.000Z', where: 'Karta'}, rule = {...release, ...rules, variants: true};
  bank.motions!['paow-p4-c1-return-ready-01'].review = {decision: 'ACCEPTED', by: 'huvudagent'} as never;
  // A second deal he accepted outright and a variant, both of which the game could play, and both archived; the step plays the first deal.
  for (const [id, review] of [['paow-p4-c1-deal-02', {decision: 'ACCEPTED', userAccepted: true, archived}], ['paow-p4-c1-deal-03', {decision: 'ACCEPTED', acceptedAs: 'VARIANT', userAccepted: true, archived}]] as [string, object][]) {
    bank.jobs!.push({...bank.jobs![0], id}); bank.motions![id] = {source: {fps: 30, frames: 90}, review}; bank.media![id] = {video: `assets/motions/${id}/source.mp4`};
  }
  const graph = buildGraph(bank), steps = [{from: 'READY', to: 'P4.C1'}], round = resolveRound(graph, steps);
  const out = pickTakes(bank, 'paow', rule);
  assert.deepEqual(out.picked.map(p => p.id), ['paow-p4-c1-deal-01', 'paow-p4-c1-return-ready-01']);
  assert.deepEqual(out.left, [{id: 'paow-p4-c1-deal-02', why: 'arkiverad'}, {id: 'paow-p4-c1-deal-03', why: 'arkiverad'}]);
  // The frozen bank lists them without a film, with the field, so the copy's graph leaves them out of play as the lab's does.
  const shown = new Map([['assets/motions/paow-p4-c1-deal-01/source.mp4', 'assets/motions/paow-p4-c1-deal-01/source.mp4']]);
  const frozen = freezeBank(bank, shown, new Set(out.picked.map(p => p.id)), rule, digest), copy = buildGraph(frozen);
  assert.deepEqual([frozen.media!['paow-p4-c1-deal-02'].video, frozen.media!['paow-p4-c1-deal-03'].video, copy.takes['paow-p4-c1-deal-02'].archived], [null, null, true]);
  assert.deepEqual(played(resolveRound(copy, steps)), played(round));
  assert.deepEqual(findLeaks(frozen, rule), [], 'who archived it and when is no cost, path or blocked name');
});

test('a dealer tree that is not played sends no film up, though the game would play it uncut', () => {
  const bank = fixture(), rule = {...release, ...rules}, yes = {decision: 'ACCEPTED', userAccepted: true};
  bank.motions!['paow-p4-c1-return-ready-01'].review = {decision: 'ACCEPTED', by: 'huvudagent'} as never;
  const tat = [['paow-tat-p4-deal-01', 'DEAL', 'READY-C', 'P4.C1', 'P4.C1'], ['paow-tat-vila-01', 'IDLE', 'IDLE', 'IDLE', undefined]] as const;
  for (const [id, kind, from, to, target] of tat) { bank.jobs!.push({...bank.jobs![0], id, kind, from, to, target} as never); bank.motions![id] = {source: {fps: 30, frames: 90}, review: yes} as never; bank.media![id] = {video: `assets/motions/${id}/source.mp4`}; }
  const tatIds = tat.map(t => t[0]), casino = ['paow-p4-c1-deal-01', 'paow-p4-c1-return-ready-01'];
  assert.ok(tatIds.every(id => pickTakes(bank, 'paow', rule).picked.some(p => p.id === id)), 'uncut, the tree would go up');
  const cut: GameCut = {schemaVersion: 1, dealer: 'paow', played: ['casino'], hub: 'READY', own: casino, drop: tatIds};
  const out = pickTakes(bank, 'paow', rule, cut);
  assert.deepEqual(out.picked.map(p => p.id).sort(), [...casino].sort());
  assert.ok(tatIds.every(id => out.left.some(l => l.id === id)));
  const frozen = freezeBank(bank, new Map(out.picked.map(p => [`assets/motions/${p.id}/source.mp4`, `assets/motions/${p.id}/source.mp4`])), new Set(out.picked.map(p => p.id)), rule, digest, {paow: cut});
  assert.ok(tatIds.every(id => (frozen.media![id]?.video ?? null) === null));
});

test('the presets and the game are switches of their own, and the game names only dealers the copy carries', () => {
  for (const d of release.casino.dealers) assert.ok(releaseDealers(release).includes(d), `${d} is carried`);
  assert.ok(!releaseDealers({paow: false}).includes('paow'), 'a dealer switched off is not carried');
  assert.throws(() => readRelease({...release, presets: 'ja'}));
  assert.throws(() => readRelease({...release, casino: {on: true, dealers: []}}));
  assert.throws(() => readRelease({...release, paow: false, casino: {on: true, dealers: ['paow']}}), /paow är avslagen/);
  assert.throws(() => readRelease({...release, casino: undefined}));
});

// ── Paths of the output ─────────────────────────────────────────────────────
test('the output writer takes only plain relative paths, and an uploaded object only a hash and a known type', () => {
  for (const good of ['studio/index.html', 'assets/motions/x/first.webp']) assert.equal(safeRelative(good), true, good);
  for (const bad of ['', '/etc/x', '../x', 'a/../b', 'a//b', 'a\\b', 'C:/x', 'a\0b']) assert.equal(safeRelative(bad), false, JSON.stringify(bad));
  assert.equal(objectName('a'.repeat(64), 'assets/motions/x/source.mp4'), `studio/${'a'.repeat(64)}.mp4`);
  assert.throws(() => objectName('xyz', 'a.mp4'));
  assert.throws(() => objectName('a'.repeat(64), 'a.exe'));
});

test('the files a module names by a plain path are found; a path built at run time or leaving the folder is not', () => {
  const text = "const a = 'assets/scene/table.png', b = \"assets/props/tray.glb\", c = `assets/scene/thumbs/room-${id}.jpg`;\n" +
    "load('assets/scene/table.png'); load('assets/../secret.png'); load('assets/x.exe'); load('data/x.json');";
  assert.deepEqual(namedAssets(text), ['assets/props/tray.glb', 'assets/scene/table.png']);
});

// ── The game in the copy ────────────────────────────────────────────────────
test("the engine's modules are game/ and the two of cloud/studio, under /engine/, with no blocked name or Node module left", () => {
  assert.equal(engineSource('/engine/game/rng.js'), 'game/rng.ts');
  assert.equal(engineSource(ENGINE_ENTRY), 'cloud/studio/game-local.ts');
  for (const other of ['/engine/cloud/studio/lock.js', '/engine/game/../tools/x.js', '/engine/game/sub/x.js', '/game-page.js']) assert.equal(engineSource(other), null, other);
  assert.throws(() => forEngine("import {readFile} from 'node:fs';", '/engine/game/rng.js'), /node:fs/);
  // whole-line comments go (their lines stay, empty)
  assert.equal(forEngine("// ported from Kevin's croupier\nexport const x = 1;", '/engine/game/round.js'), '\nexport const x = 1;');
  for (const name of readdirSync(new URL('../game/', import.meta.url)).filter(n => n.endsWith('.ts'))) {
    const text = forEngine(readFileSync(new URL(`../game/${name}`, import.meta.url), 'utf8'), `/engine/game/${name.replace(/\.ts$/, '.js')}`);
    assert.deepEqual(findTextLeaks(text, release), [], name);
  }
});

test('the shim of node:crypto hashes as Node does, and fills more than one call of random bytes', async () => {
  const shim = await import('../cloud/studio/node-crypto.ts');
  const node = await import('node:crypto');
  for (let n = 0; n < 300; n += 37) {
    const bytes = node.randomBytes(n);
    assert.equal(shim.createHash('sha256').update(bytes).digest('hex'), node.createHash('sha256').update(bytes).digest('hex'), `length ${n}`);
  }
  const many = shim.randomFillSync(new Uint8Array(70000));
  assert.ok(many.subarray(0, 65536).some(x => x !== 0) && many.subarray(65536).some(x => x !== 0), 'more than one call of getRandomValues');
});

/** The engine's folder as the copy ships it (every module from ENGINE_ENTRY on, made ready as the build does), in a temp folder. */
async function engineFolder(): Promise<{dir: string; url: (address: string) => string}> {
  const {mkdtemp, mkdir, writeFile} = await import('node:fs/promises');
  const {tmpdir} = await import('node:os');
  const {join, dirname} = await import('node:path');
  const {pathToFileURL} = await import('node:url');
  const {forBrowser} = await import('./lab-routes.ts');
  const dir = await mkdtemp(join(tmpdir(), 'studio-engine-'));
  await writeFile(join(dir, 'package.json'), '{"type":"module"}');
  const queue = [ENGINE_ENTRY], seen = new Set<string>();
  while (queue.length) {
    const address = queue.shift()!;
    if (seen.has(address)) continue;
    seen.add(address);
    const source = engineSource(address);
    assert.ok(source, `outside the engine: ${address}`);
    const text = forEngine(forBrowser(readFileSync(new URL(`../${source}`, import.meta.url), 'utf8')), address);
    for (const m of text.matchAll(/\b(?:import|export)\s*(?:[\w$*{}\s,]+?from\s*)?(['"])([^'"\n]+)\1/g)) queue.push(new URL(m[2], 'http://copy' + address).pathname);
    const file = join(dir, ...address.slice(1).split('/'));
    await mkdir(dirname(file), {recursive: true});
    await writeFile(file, text);
  }
  assert.ok(seen.has(ENGINE_CRYPTO) && seen.has('/engine/game/session.js'), [...seen].join(' '));
  return {dir, url: (address: string) => pathToFileURL(join(dir, ...address.slice(1).split('/'))).href};
}

test('the engine as the copy ships it plays a round, refuses a stale command and a lab shoe, and shuffles as game/ does', async () => {
  const {rm} = await import('node:fs/promises');
  const folder = await engineFolder();
  try {
    const local = await import(folder.url(ENGINE_ENTRY));
    const answer = local.localEngine();
    const at = (p: string) => new URL(p, 'https://kopian.example/game.html');
    const first = answer('GET', at('/api/game?table=bord-1'), null);
    assert.equal(first.status, 200);
    assert.equal(first.body.view.shoe.source, 'secure');
    let ver = first.body.ver, n = 0, state = first.body;
    const send = (command: Record<string, unknown>) => {
      const out = answer('POST', at('/api/game/command?table=bord-1'), JSON.stringify({...command, requestId: `r${++n}`, expectedVersion: ver}));
      assert.equal(out.status, 200, JSON.stringify(out.body));
      ver = out.body.ver; state = out.body;
      return out.body;
    };
    send({op: 'start', bets: [{seat: 4, main: 25}]});
    for (let i = 0; i < 12 && state.view.round?.phase !== 'settled'; i++) {
      const r = state.view.round, v = state.view;
      if (r.phase === 'insurance') send({op: 'insurance', roundId: v.roundId, take: false});
      else if (state.legalActions.includes('stand')) send({op: 'act', action: 'stand', seat: r.activeSeat, handIndex: r.active, roundId: v.roundId, turnSeq: v.turnSeq});
      else break;
    }
    assert.equal(state.view.round.phase, 'settled');
    assert.equal(answer('POST', at('/api/game/command?table=bord-1'), JSON.stringify({op: 'start', bets: [{seat: 4, main: 25}], requestId: 'gammal', expectedVersion: 0})).status, 409);
    assert.equal(answer('POST', at('/api/game/new?table=bord-1'), JSON.stringify({shoe: {mode: 'stacked', seed: 'x', cards: []}})).status, 403, 'no lab shoe in the copy');
    // the seeded shoe of game/rng.ts draws the same cards through the shim (its HMAC copies a hash in progress), with the same proof
    const copyRng = await import(folder.url('/engine/game/rng.js')), labRng = await import('../game/rng.ts');
    const draw = (m: typeof labRng) => { const rng = m.createRng({mode: 'seeded', seed: 'kopian', allowDeterministic: true}); return {order: rng.shuffle([...Array(52).keys()]), proof: rng.proof()}; };
    assert.deepEqual(draw(copyRng), draw(labRng));
  } finally {
    await rm(folder.dir, {recursive: true, force: true});
  }
});
