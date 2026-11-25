// Offline tests for the clip-bank graph: the bank's model, how a round resolves to films between the anchors, and that Jakob's
// verdicts hold (a rejected or archived film never plays, his Primär and approved films do, the inbox waits). No network, media or ffmpeg.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {motionRegister} from './register-store.ts';
import * as graph from '../src/clip-graph.ts';
import type {BankData, BankJob, MotionRecord} from '../src/clip-graph.ts';
import {inTurn, type Beat} from '../src/game-director.ts';
import {INITIAL_TARGETS as PLAN_TARGETS} from '../src/placement-model.ts';
import {applyChange} from './review-store.ts';

const sha = 'a'.repeat(64), ready = {file: {path: 'assets/motions/paow-p4-c1-color-control-01/start.png', sha256: sha}};
const video = (id: string) => `assets/motions/${id}/source.mp4`;
function job(id: string, from: string, to: string, extra: Partial<BankJob> = {}): BankJob {
  const deal = from === 'READY';
  return {id, kind: deal ? 'DEAL' : 'RETURN', target: (deal ? to : from).replace(/^\w+\((.+)\)$/, '$1'), from, to, model: 'wan3', duration: deal ? 4 : 3, ratio: 'auto_1080p', audio: false,
    promptText: 'fixture', first: ready, last: {file: {path: `assets/anchors/${id}/anchor.png`, sha256: sha}}, purpose: 'fixture', ...extra};
}
const from = (clip: string, index: number) => ({first: {frame: {video: video(clip), videoSha256: sha, index}}});
const done = (decision = 'PENDING', extra: MotionRecord = {}): MotionRecord => ({source: {fps: 30, frames: 120, sha256: sha}, review: {decision}, motion: {physicalEndSide: 'FRONT'}, ...extra});
// Complete chains for P4.C1 and P1.C1, two P7.C1 deals and nothing else; one P4 deal rejected, one P7 deal an accepted variant.
function bank(): BankData {
  const jobs = [
    job('paow-p4-c1-return-ready-calm-01', 'RELEASE(P4.C1)', 'READY', from('paow-p4-c1-source-turn', 80)),
    job('paow-p4-c1-deal-calm-01', 'READY', 'RELEASE(P4.C1)'),
    job('paow-p4-c1-plan-deal-01', 'READY', 'RELEASE(P4.C1)'),
    job('paow-p1-c1-plan-deal-01', 'READY', 'LAND(P1.C1)'),
    job('paow-p7-c1-plan-deal-01', 'READY', 'LAND(P7.C1)'),
    job('paow-p4-c1-plan-deal-02', 'READY', 'RELEASE(P4.C1)'),
    job('paow-p1-c1-plan-deal-02', 'READY', 'LAND(P1.C1)'),
    job('paow-p7-c1-plan-deal-02', 'READY', 'LAND(P7.C1)'),
    job('paow-p4-c1-plan-return-ready-01', 'LAND(P4.C1)', 'READY', {...from('paow-p4-c1-plan-deal-02', 105), last: {file: {path: 'assets/anchors/paow-ready-p4-c1-plan-01/anchor.png', sha256: sha}}}),
    job('paow-p4-c1-plan-return-idle-01', 'LAND(P4.C1)', 'IDLE', from('paow-p4-c1-plan-deal-02', 105)),
    job('paow-p1-c1-plan-return-ready-01', 'LAND(P1.C1)', 'READY', from('paow-p1-c1-plan-deal-02', 112)),
    job('paow-p1-c1-plan-return-idle-01', 'LAND(P1.C1)', 'IDLE', from('paow-p1-c1-plan-deal-02', 112)),
  ];
  const motions: Record<string, MotionRecord> = Object.fromEntries(jobs.map(j => [j.id, done()]));
  motions['paow-p4-c1-plan-deal-01'] = done('REJECTED');
  motions['paow-p1-c1-plan-deal-01'] = done('SECONDARY');
  motions['paow-p7-c1-plan-deal-02'] = done('ACCEPTED', {review: {decision: 'ACCEPTED', acceptedAs: 'VARIANT', userAccepted: true}});
  for (const j of jobs.filter(j => j.kind === 'RETURN')) motions[j.id].source!.frames = 90;
  return {budget: {maximumCredits: 1500}, jobs, motions,
    receipts: Object.fromEntries(jobs.map(j => [j.id, {status: 'SUCCEEDED', estimatedCredits: j.duration * 20}])),
    media: Object.fromEntries(jobs.map(j => [j.id, {video: video(j.id), first: null, last: null}]))};
}

test('the bank is 54 edges on the placement plan\'s cards; a card is reached from READY and left towards a hub, nothing else is a clip', () => {
  assert.deepEqual(graph.TARGETS, PLAN_TARGETS);
  const g = graph.buildGraph({});
  assert.deepEqual([g.summary.total, g.summary.byStatus.MISSING], [54, 54]);
  assert.deepEqual(g.edges.filter(e => e.optional).map(e => e.id), ['READY>D.C3', 'D.C3>READY', 'D.C3>IDLE', graph.OLDER_REVEAL_EDGE]);
  for (const bad of ['P1.C1>P2.C1', 'IDLE>P4.C1', 'READY>READY', 'READY', 'READY>P4.C1>IDLE', 'READY-B>READY-B', 'READY>READY-B']) assert.equal(graph.parseEdge(bad), null, bad);
  for (const bad of ['P8.C1', 'P4.C3', 'P0.C1', '', null]) assert.equal(graph.parseNode(bad), null);
  // Only the hole card is turned, and only from rest; she comes to the table from AWAY and leaves to it, from and to rest only.
  assert.deepEqual([graph.parseEdge('vila > reveal(dc1)')!.base, graph.parseEdge('vila > reveal(dc2)')!.base, graph.parseEdge('REVEAL(D.C1)>READY')?.base], [graph.REVEAL_EDGE, graph.OLDER_REVEAL_EDGE, 'IDLE>READY']);
  assert.deepEqual([graph.parseEdge('borta > vila')!.base, graph.parseEdge('IDLE>AWAY')!.base, graph.parseEdge('REVEAL(D.C1)>AWAY')?.base], [graph.ARRIVE_EDGE, graph.LEAVE_EDGE, graph.LEAVE_EDGE]);
  for (const bad of ['READY>REVEAL(D.C1)', 'D.C1>REVEAL(D.C1)', 'AWAY>READY', 'READY>AWAY', 'P4.C1>AWAY', 'AWAY>P4.C1', 'AWAY>AWAY', 'AWAY>REVEAL(D.C1)']) assert.equal(graph.parseEdge(bad), null, bad);
  assert.equal(graph.parseNode('REVEAL(P4.C1)'), null);
});

test('the main take follows the verdicts: a rejected take is never chosen, an accepted variant is offered beside the main take, a Primär overrides', () => {
  const g = graph.buildGraph(bank()), deal = g.edge['READY>P4.C1'];
  assert.deepEqual(g.unplaced, []);
  // Among unreviewed takes the one with its own returns wins, cut where they begin.
  assert.deepEqual([deal.main?.id, deal.main?.landingFrame], ['paow-p4-c1-plan-deal-02', 105]);
  assert.deepEqual(deal.takes.map(t => graph.takeRole(deal, t)), ['OTHER', 'REJECTED', 'MAIN']);
  assert.equal(g.edge['P4.C1>READY'].main?.id, 'paow-p4-c1-plan-return-ready-01', 'the return that starts on the main deal');
  const p7 = g.edge['READY>P7.C1'];
  assert.deepEqual([p7.main?.id, p7.variants.map(t => t.id)], ['paow-p7-c1-plan-deal-01', ['paow-p7-c1-plan-deal-02']]);
  // An explicit main (Primär) and landing frame in the motion record override the derived ones.
  const data = bank();
  data.motions!['paow-p4-c1-deal-calm-01'].review!.acceptedAs = 'MAIN'; data.motions!['paow-p4-c1-deal-calm-01'].motion!.landingFrame = 96;
  const marked = graph.buildGraph(data).edge['READY>P4.C1'].main;
  assert.deepEqual([marked?.id, marked?.landingFrame], ['paow-p4-c1-deal-calm-01', 96]);
  // Returns that disagree about the landing frame are reported instead of silently averaged.
  data.jobs!.push(job('paow-p4-c1-plan-return-idle-02', 'LAND(P4.C1)', 'IDLE', from('paow-p4-c1-plan-deal-02', 108)));
  const conflict = graph.buildGraph(data).takes['paow-p4-c1-plan-deal-02'];
  assert.deepEqual([conflict.landingConflict, conflict.landingFrame], [true, 105]);
});

test('a take is only playable once it is finished; unfinished, failed and rejected work never plays', () => {
  const stage = (status: string | undefined, motion?: MotionRecord) => graph.buildGraph({jobs: [job('paow-p2-c1-plan-deal-01', 'READY', 'LAND(P2.C1)')],
    receipts: status ? {'paow-p2-c1-plan-deal-01': {status}} : {}, motions: motion ? {'paow-p2-c1-plan-deal-01': motion} : {}}).edge['READY>P2.C1'];
  assert.equal(stage(undefined).status, 'PREPARED');
  for (const s of ['SUBMITTING', 'PENDING', 'RUNNING', 'THROTTLED']) assert.equal(stage(s).status, 'ORDERED');
  assert.deepEqual([stage('FAILED').status, stage('FAILED').main], ['MISSING', null]);
  assert.equal(stage('SUCCEEDED').status, 'UNREVIEWED');
  assert.equal(stage('SUCCEEDED', done('ACCEPTED')).status, 'ACCEPTED');
  assert.deepEqual([stage('SUCCEEDED', done('REJECTED')).status, stage('SUCCEEDED', done('REJECTED')).main], ['REJECTED', null]);
  // The public site has no receipts: a registered motion alone proves the clip exists.
  assert.equal(stage(undefined, done()).status, 'UNREVIEWED');
});

test('every job is accounted for: a take on a model edge, an experiment beside the model, or named in unplaced; nothing is dropped silently', () => {
  const data = bank(), before = graph.buildGraph(data).summary;
  const loop = {...job('paow-ready-b-shoe-plate-01', 'READY-B', 'READY-B'), kind: 'IDLE', target: null};
  data.jobs!.push(loop, {...loop, id: 'paow-ready-b-shoe-plate-02'}, job('paow-odd-01', 'LAND(P1.C1)', 'LAND(P2.C1)'), job('paow-p9-01', 'READY', 'LAND(P9.C1)'));
  data.motions!['paow-ready-b-shoe-plate-01'] = done('REJECTED'); data.motions!['paow-ready-b-shoe-plate-02'] = done();
  data.derived = [{id: 'paow-bad-cut-01', from: 'READY-B', to: 'DRAWN', clip: 'paow-old-01', frames: [50, 10]} as never];
  const g = graph.buildGraph(data);
  // The 54 edges and their counts are untouched; experiments are counted on their own, with the same take logic.
  assert.deepEqual({...g.summary, experiments: null, credits: null}, {...before, experiments: null, credits: null});
  assert.deepEqual(g.experiments.map(e => e.id), ['READY-B>READY-B', 'P1.C1>P2.C1', 'READY>LAND(P9.C1)']);
  assert.equal(g.edge['READY-B>READY-B'].main?.id, 'paow-ready-b-shoe-plate-02');
  assert.deepEqual(g.unplaced.map(u => u.id), ['paow-bad-cut-01']);
  // An experiment can be played in a chain, but only under a name the graph knows.
  assert.deepEqual(graph.resolveRound(g, [{from: 'READY-B', to: 'READY-B'}, {from: 'READY-B', to: 'NOWHERE'}]).map(s => [s.take?.id ?? null, s.gap]), [['paow-ready-b-shoe-plate-02', 'LOCAL_ONLY'], [null, 'INVALID']]);
  data.jobs!.push({...loop}, {...loop, id: ''}, null as never);
  const odd = graph.buildGraph(data);
  assert.equal(odd.unplaced.length, 4);
  assert.equal(Object.keys(odd.takes).length + odd.unplaced.length, data.jobs!.length + data.derived.length);
  assert.equal(Object.values(odd.takes).filter(t => !odd.edge[t.edge].takes.includes(t)).length, 0);
});

test('a round is a chain of model edges: each step starts where the one before ended, from rest and back to rest', () => {
  assert.equal(graph.formatSequence(graph.roundSequence({seats: ['P2', 'P1']})),
    'IDLE>READY | READY>P1.C1 | P1.C1>READY | READY>P2.C1 | P2.C1>READY | READY>D.C1 | D.C1>READY | READY>P1.C2 | P1.C2>READY | READY>P2.C2 | P2.C2>READY | READY>D.C2 | D.C2>IDLE');
  assert.deepEqual(graph.roundSequence({seats: [], dealer: false}), []);
  // A seat dealt from READY-B goes through rest around it; the hole card's turn and the third dealer card start from rest (rest with the card turned is rest).
  const hubs = {'P6.C1': 'READY-B'}, pose = (node: string) => node === graph.REVEAL_NODE ? 'IDLE' : node;
  for (const options of [{seats: graph.SEATS}, {seats: graph.SEATS, thirdDealerCard: true}, {seats: ['P3'], cards: 1}, {seats: graph.SEATS, hubs}, {seats: ['P6'], dealer: false, hubs},
    {seats: ['P5', 'P6', 'P7'], reveal: true, thirdDealerCard: true, hubs}, {seats: ['P4'], reveal: true}] as graph.RoundOptions[]) {
    const steps = graph.roundSequence(options);
    steps.forEach((s, i) => { assert.ok(s, 'a model edge'); assert.equal(s.from, i ? pose(steps[i - 1].to) : 'IDLE'); });
    assert.equal(pose(steps.at(-1)!.to), 'IDLE', JSON.stringify(options));
  }
  assert.ok(!graph.roundSequence({seats: ['P4']}).some(e => e.kind === 'REVEAL'), 'the hole card is turned only when the round asks for it');
  // A round without that seat, an empty map, and a map that names no READY variant are the round as it always was.
  const round = (options: graph.RoundOptions) => graph.formatSequence(graph.roundSequence(options));
  for (const options of [{seats: ['P2', 'P1']}, {seats: graph.SEATS.filter(s => s !== 'P6'), reveal: true, thirdDealerCard: true}, {seats: ['P4'], dealer: false, cards: 1}])
    for (const other of [hubs, {}, {'P4.C1': 'READY'}, {'P4.C1': 'IDLE'}, {'P4.C1': 'READY-'}, {'D.C1': 'nonsense'}] as Record<string, string>[])
      assert.equal(round({...options, hubs: other}), round(options), JSON.stringify([options, other]));
  assert.equal(graph.dealHub('P6.C2', hubs), 'READY-B', "the second card follows the seat's first"); assert.equal(graph.dealHub('D.C2', {'D.C1': 'READY-B'}), 'READY', 'the hole card keeps its own film');
  assert.equal(graph.wantedSide('D.C1'), 'BACK'); assert.equal(graph.wantedSide('D.C1', false), 'FRONT'); assert.equal(graph.wantedSide('D.C2'), 'FRONT');
});

test('a round resolves to one take per step, cuts each deal at its landing frame and marks gaps; a pinned rejected take never plays', () => {
  const g = graph.buildGraph(bank());
  const segments = graph.resolveRound(g, graph.roundSequence({seats: ['P1', 'P4'], dealer: false, cards: 1}));
  assert.deepEqual(segments.map(s => [s.id, s.take?.id ?? s.gap, s.start, s.end]), [
    ['IDLE>READY', 'MISSING', 0, null],
    ['READY>P1.C1', 'paow-p1-c1-plan-deal-02', 0, 112],
    ['P1.C1>READY', 'paow-p1-c1-plan-return-ready-01', 0, null],
    ['READY>P4.C1', 'paow-p4-c1-plan-deal-02', 0, 105],
    ['P4.C1>IDLE', 'paow-p4-c1-plan-return-idle-01', 0, null],
  ]);
  assert.deepEqual(segments.flatMap(s => s.notes), []);
  // A pinned deal without its own returns: the return is still played, with the seam named.
  const pinned = graph.resolveRound(g, [{from: 'READY', to: 'P4.C1', take: 'paow-p4-c1-deal-calm-01'}, {from: 'P4.C1', to: 'READY'}]);
  assert.deepEqual([pinned[0].end, pinned[1].take?.id], [null, 'paow-p4-c1-plan-return-ready-01']); assert.match(pinned[1].notes[0], /Skarv/);
  // A pinned variant is played; a pinned take that is rejected falls back to the main take, with a note.
  assert.equal(graph.resolveRound(g, [{from: 'READY', to: 'P7.C1', take: 'paow-p7-c1-plan-deal-02'}])[0].take?.id, 'paow-p7-c1-plan-deal-02');
  const refused = graph.resolveRound(g, [{from: 'READY', to: 'P4.C1', take: 'paow-p4-c1-plan-deal-01'}])[0];
  assert.equal(refused.take?.id, 'paow-p4-c1-plan-deal-02'); assert.ok(refused.notes.length);
  // Unknown edges, broken chains and unfinished work never throw.
  const odd = graph.resolveRound(g, [{from: 'P1.C1', to: 'P2.C1'}, {from: 'READY', to: 'P7.C1'}, {from: 'P7.C1', to: 'IDLE'}, {from: 'READY', to: 'D.C1'}]);
  assert.deepEqual(odd.map(s => s.gap), ['INVALID', null, 'MISSING', 'MISSING']); assert.equal(odd[3].side, 'BACK');
  // Without local media (public site) a finished take is a named gap, not a broken player.
  const remote = bank(); remote.media = {}; remote.receipts = {};
  assert.equal(graph.resolveRound(graph.buildGraph(remote), [{from: 'READY', to: 'P4.C1'}])[0].gap, 'LOCAL_ONLY');
  // The hole card wants a closed take; an open one is used with a warning rather than hidden.
  const hole = bank(); hole.jobs!.push(job('paow-d-c1-plan-deal-01', 'READY', 'LAND(D.C1)')); hole.motions!['paow-d-c1-plan-deal-01'] = done();
  assert.match(graph.resolveRound(graph.buildGraph(hole), [{from: 'READY', to: 'D.C1'}])[0].notes.join(' '), /rundan vill ha stängt/);
  assert.deepEqual(graph.resolveRound(graph.buildGraph(hole), [{from: 'READY', to: 'D.C1'}], {holeCardDown: false})[0].notes.filter(n => /vill ha/.test(n)), []);
});

test('a READY variant\'s takes play only on its own steps: a round through READY-B uses that pose\'s takes, the deal cut where its return begins', () => {
  const data = bank(), b = (id: string, from: string, to: string, extra: Partial<BankJob>) => job(id, from, to, {target: null, ...extra});
  data.jobs!.push(b('paow-entry-01', 'IDLE', 'READY', {kind: 'ENTRY'}), b('paow-exit-01', 'READY', 'IDLE', {kind: 'RETURN'}),
    b('paow-ready-b-entry-01', 'IDLE', 'READY-B', {kind: 'ENTRY'}), b('paow-ready-b-exit-01', 'READY-B', 'IDLE', {kind: 'RETURN'}),
    job('paow-p6-c1-readyb-deal-01', 'READY-B', 'LAND(P6.C1)', {kind: 'DEAL', target: 'P6.C1'}),
    job('paow-p6-c1-readyb-return-01', 'LAND(P6.C1)', 'READY-B', from('paow-p6-c1-readyb-deal-01', 100)));
  for (const j of data.jobs!.slice(-6)) { data.motions![j.id] = done('ACCEPTED'); data.media![j.id] = {video: video(j.id)}; data.receipts![j.id] = {status: 'SUCCEEDED'}; }
  const g = graph.buildGraph(data), hubs = {'P6.C1': 'READY-B'};
  const ids = (segments: graph.Segment[]) => segments.map(s => [s.id, s.take?.id ?? s.gap]);
  const segments = graph.resolveRound(g, graph.roundSequence({seats: ['P4', 'P6'], dealer: false, cards: 1, hubs}));
  assert.deepEqual(ids(segments), [['IDLE>READY', 'paow-entry-01'], ['READY>P4.C1', 'paow-p4-c1-plan-deal-02'], ['P4.C1>IDLE', 'paow-p4-c1-plan-return-idle-01'],
    ['IDLE>READY-B', 'paow-ready-b-entry-01'], ['READY-B>P6.C1', 'paow-p6-c1-readyb-deal-01'], ['P6.C1>READY-B', 'paow-p6-c1-readyb-return-01'], ['READY-B>IDLE', 'paow-ready-b-exit-01']]);
  assert.deepEqual(segments.flatMap(s => s.notes), [], 'no broken chain, no seam');
  assert.deepEqual([segments[4].end, segments[4].cut], [100, 'FRAME']);
  // The plain steps never play a take of READY-B: a round without the map is as it was before those takes came.
  const plain = graph.roundSequence({seats: ['P4', 'P1'], dealer: false, cards: 1});
  assert.deepEqual(ids(graph.resolveRound(g, plain)).slice(1), ids(graph.resolveRound(graph.buildGraph(bank()), plain)).slice(1));
  assert.equal(graph.resolveRound(g, [{from: 'READY', to: 'P6.C1'}])[0].gap, 'MISSING', 'a card with only a READY-B deal has none from READY');
  delete data.media!['paow-ready-b-exit-01'];
  data.jobs = data.jobs!.filter(j => j.id !== 'paow-ready-b-exit-01');
  assert.equal(graph.resolveRound(graph.buildGraph(data), [{from: 'READY-B', to: 'IDLE'}])[0].gap, 'MISSING', 'the plain exit does not stand in for the exit from READY-B');
});

test('anchor rule: a return from the landing anchor follows every take of the deal that ends on that anchor, never one of another anchor', () => {
  const anchor = {file: {path: 'assets/anchors/paow-p2-c1-plan-land-01/anchor.png', sha256: sha}}, id = (name: string) => `paow-p2-c1-plan-${name}`;
  const jobs = [job(id('deal-01'), 'READY', 'LAND(P2.C1)', {last: anchor}), job(id('deal-02'), 'READY', 'LAND(P2.C1)', {last: anchor}),
    job(id('return-ready-01'), 'LAND(P2.C1)', 'READY', {first: anchor}), job(id('return-idle-01'), 'LAND(P2.C1)', 'IDLE', {first: anchor})];
  const build = () => graph.buildGraph({jobs, motions: Object.fromEntries(jobs.map(j => [j.id, done()])), media: Object.fromEntries(jobs.map(j => [j.id, {video: video(j.id)}]))});
  const g = build(), back = g.takes[id('return-ready-01')];
  for (const deal of [g.takes[id('deal-01')], g.takes[id('deal-02')]]) {
    assert.equal(graph.returnFits(back, deal), true);
    assert.deepEqual(graph.returnsOf(g, deal), {frame: [], anchor: [back, g.takes[id('return-idle-01')]]});
  }
  for (const take of [undefined, id('deal-01')]) {
    const [deal, home] = graph.resolveRound(g, [{from: 'READY', to: 'P2.C1', take}, {from: 'P2.C1', to: 'IDLE'}]);
    assert.deepEqual([deal.take?.id, deal.end, deal.cut, home.take?.id, [...deal.notes, ...home.notes]], [take ?? id('deal-02'), null, 'END', id('return-idle-01'), []]);
  }
  // Where a return was cut from one frame of one deal clip, it fits only that take; a pinned pair that does not fit names its seam.
  jobs.push(job(id('return-ready-02'), 'LAND(P2.C1)', 'READY', from(id('deal-01'), 101)));
  const mixed = build(), cut = mixed.takes[id('return-ready-02')];
  assert.deepEqual([graph.returnFits(cut, mixed.takes[id('deal-01')]), graph.returnFits(cut, mixed.takes[id('deal-02')])], [true, false]);
  assert.match(graph.resolveRound(mixed, graph.parseSequence(`READY>P2.C1@${id('deal-02')} | P2.C1>READY@${id('return-ready-02')}`).steps)[1].notes.join(' '), /Skarv/);
  // Deals that end on another landing anchor have their own returns, never crosswise.
  const other = {file: {path: 'assets/anchors/paow-p2-c1-plan-land-b-01/anchor.png', sha256: 'b'.repeat(64)}};
  jobs.push({...job('paow-p2-c1-drawn-deal-01', 'DRAWN', 'LAND(P2.C1)', {last: other}), kind: 'DEAL', target: null},
    {...job('paow-p2-c1-plan-return-idleb-01', 'LAND(P2.C1)', 'IDLE-B', {first: other}), kind: 'RETURN', target: null});
  const both = build(), dealB = both.takes['paow-p2-c1-drawn-deal-01'], homeB = both.takes['paow-p2-c1-plan-return-idleb-01'];
  assert.deepEqual([graph.returnFits(homeB, dealB), graph.returnFits(homeB, both.takes[id('deal-02')]), graph.returnFits(both.takes[id('return-idle-01')], dealB)], [true, false, false]);
  assert.match(graph.resolveRound(both, [{from: 'READY', to: 'P2.C1'}, {from: 'P2.C1', to: 'IDLE-B'}])[1].notes.join(' '), /annat landningsankare/);
});

test('a one-way deal whose last picture is a round trip\'s cut frame (endsOn) is continued by that film\'s return, and only by it', () => {
  const range = (id: string, from: string, to: string, kind: string, frames: [number, number], clip: string) => ({id, kind, from, to, clip, frames});
  // The one-way deal ends on frame 126 of the round trip, whose return starts on 127.
  const trip = 'paow-giv-2-2-p4-01-01', deal = `${trip}-deal`, back = `${trip}-return-ready-b`, oneWay = 'paow-giv-2-2-p4-04-01', other = 'paow-giv-2-2-p4-05-01', plain = 'paow-giv-2-2-p4-06-01';
  const short = {fps: 30, frames: 178, sha256: sha};
  const data: BankData = {jobs: [oneWay, other, plain].map(id => job(id, 'READY-B', 'P4.C1', {kind: 'DEAL', target: 'P4.C1'})),
    derived: [range(deal, 'READY-B', 'P4.C1', 'DEAL', [0, 126], trip), range(back, 'P4.C1', 'READY-B', 'RETURN', [127, 177], trip)],
    motions: {[deal]: done('PENDING', {source: short}), [back]: done('ACCEPTED', {source: short, motion: {startsOn: {clip: deal, frame: 127}}}), [oneWay]: done('PENDING', {motion: {endsOn: {clip: trip, frame: 126}}}), [other]: done('PENDING', {motion: {endsOn: {clip: trip, frame: 120}}}), [plain]: done('PENDING')},
    media: {[deal]: {video: video(trip)}, [back]: {video: video(trip)}, [oneWay]: {video: video(oneWay)}, [other]: {video: video(other)}, [plain]: {video: video(plain)}}};
  const g = graph.buildGraph(data), fits = (id: string) => graph.returnFits(g.takes[back], g.takes[id]);
  assert.deepEqual(g.unplaced, []);
  assert.deepEqual([fits(oneWay), fits(other), fits(plain), fits(deal)], [true, false, false, true]);
});

test('the real bank: every take placed in its dealer\'s graph on the edge it names, and a whole round always gets a take or a named gap', async () => {
  const file = JSON.parse(await readFile('data/clip-jobs.json', 'utf8')), motions: Record<string, MotionRecord> = {};
  for (const [id, post] of motionRegister(process.cwd()).posts()) motions[id] = post as MotionRecord;
  const owner = graph.dealersOf(file), mine = <T extends {id: string}>(list?: T[]) => (list ?? []).filter(x => owner[x.id] === graph.DEALER);
  for (const dealer of new Set(Object.values(owner))) assert.deepEqual(graph.buildGraph({jobs: file.jobs, derived: file.derived, edits: file.edits, motions}, {dealer}).unplaced, [], dealer);
  const g = graph.buildGraph({jobs: file.jobs, derived: file.derived, edits: file.edits, budget: file.budget, motions}), f = g.summary.films;
  const all = [...mine<BankJob>(file.jobs), ...mine<BankJob>(file.derived)];
  assert.ok(all.length > 0, 'the bank has takes of the first dealer');
  assert.equal(Object.keys(g.takes).length, all.length + mine(file.edits).length);
  // The numbers move as films arrive; what holds is how they add up.
  assert.deepEqual([g.summary.total, g.edges.length, f.mode, f.total, f.done + f.missing, f.candidates + f.flaws], [54, 58, 'SEAT', 33, f.total, f.done]);
  for (const job of all) {
    const take = g.takes[job.id], ref = graph.parseEdge(`${job.from}>${job.to}`), edge = g.edge[take.edge];
    assert.ok(edge.takes.includes(take), job.id);
    if (ref) { assert.equal(take.edge, ref.base, job.id); assert.equal(edge.experiment, false, job.id); assert.equal(take.kind, edge.kind, job.id); assert.equal(take.hub, ref.hub, job.id); }
    else assert.ok(g.experiments.includes(edge), job.id);
    // A return that starts on a frame of another film was cut out of a deal.
    if (take.kind === 'RETURN' && take.startsOn?.clip && g.takes[take.startsOn.clip]) assert.equal(g.takes[take.startsOn.clip].kind, 'DEAL', job.id);
  }
  assert.ok(!g.experiments.some(e => /REVEAL/.test(e.id)), 'the turns of the hole card are takes of the model');
  for (const edit of mine<{id: string; source: {clip: string}}>(file.edits)) assert.equal(g.takes[edit.id].edge, g.takes[edit.source.clip].edge, edit.id);
  for (const j of mine<BankJob>(file.jobs)) if (j.playbackSpeed) assert.equal(g.takes[j.id].speed, j.playbackSpeed, j.id);
  for (const s of graph.resolveRound(g, graph.roundSequence({seats: graph.SEATS, reveal: true, thirdDealerCard: true}))) {
    assert.ok(s.take || s.gap, s.id); assert.ok(s.why in graph.WHY_LABEL, s.id); assert.equal(s.why === 'GAP', !s.take, s.id);
    if (s.edge?.shares) { assert.equal(s.film?.id, s.edge.shares, s.id); if (s.take) assert.ok(s.film!.takes.includes(s.take), s.id); }
  }
});

test('a corrected copy is a further take of its source\'s edge that the source\'s returns follow; a copy of nothing is named; a film\'s speed is its own, within reason', () => {
  const data = bank(), source = 'paow-p1-c1-plan-deal-02';
  data.edits = [{id: `${source}-edit-01`, source: {clip: source, sha256: sha}, model: 'aleph2', promptText: 'One correction only.', purpose: 'grip'}, {id: 'orphan-edit-01', source: {clip: 'no-such-clip'}}];
  data.jobs!.push(job('paow-p1-c1-plan-deal-slow-01', 'READY', 'LAND(P1.C1)', {duration: 8, playbackSpeed: 2}), job('paow-p1-c1-plan-deal-odd-01', 'READY', 'LAND(P1.C1)', {playbackSpeed: 40}));
  data.media = {...data.media, [`${source}-edit-01`]: {video: video(`${source}-edit-01`)}};
  const g = graph.buildGraph(data), copy = g.takes[`${source}-edit-01`], original = g.takes[source];
  assert.deepEqual([copy.edge, copy.editOf, copy.job.model, copy.stage, copy.landingFrame], [original.edge, source, 'aleph2', 'DONE', original.landingFrame]);
  assert.equal(graph.returnFits(Object.values(g.takes).find(r => r.startsOn?.clip === source)!, copy), true);
  // Unreviewed it is current work; once rejected it is folded away like any other.
  assert.equal(graph.isCurrent(g.edge['READY>P1.C1'], copy), true);
  data.motions = {...data.motions, [copy.id]: done('REJECTED')}; const after = graph.buildGraph(data); assert.equal(graph.isCurrent(after.edge['READY>P1.C1'], after.takes[copy.id]), false);
  assert.deepEqual(g.unplaced.map(u => u.id), ['orphan-edit-01']); assert.equal(g.edges.length, 58);
  assert.deepEqual([g.takes['paow-p1-c1-plan-deal-slow-01'].speed, g.takes['paow-p1-c1-plan-deal-odd-01'].speed, original.speed, copy.speed], [2, 1, 1, 1]);
});

// ── One film per seat ───────────────────────────────────────────────────────
// A small bank built here, so the counts do not move with the real job file.
function seatBank(): BankData {
  const jobs = [job('entry-01', 'IDLE', 'READY', {kind: 'ENTRY', target: null}), job('p4-deal-01', 'READY', 'LAND(P4.C1)'), job('p4-back-ready-01', 'LAND(P4.C1)', 'READY', from('p4-deal-01', 100)),
    job('p4-back-idle-01', 'LAND(P4.C1)', 'IDLE', from('p4-deal-01', 100)), job('p1-deal-01', 'READY', 'LAND(P1.C1)'), job('p4-second-01', 'READY', 'LAND(P4.C2)'), job('hole-deal-01', 'READY', 'LAND(D.C1)')];
  const decisions: Record<string, string> = {'p4-back-ready-01': 'ACCEPTED', 'p4-back-idle-01': 'SECONDARY', 'p1-deal-01': 'REJECTED'};
  return {jobs, motions: Object.fromEntries(jobs.map(j => [j.id, done(decisions[j.id] ?? 'PENDING', j.id === 'hole-deal-01' ? {motion: {physicalEndSide: 'BACK'}} : {})])), media: Object.fromEntries(jobs.map(j => [j.id, {video: video(j.id)}]))};
}

test('one film per seat: a second card plays the first card\'s films where it lies, the dealer\'s cards keep their own, and only needed films are counted', () => {
  assert.deepEqual(['P4.C1', 'P4.C2', 'D.C1', 'D.C2', 'D.C3'].map(t => graph.filmCard(t)), ['P4.C1', 'P4.C1', 'D.C1', 'D.C2', 'D.C3']);
  const g = graph.buildGraph(seatBank()), f = g.summary.films;
  // 3 hub films, the turn of the hole card, her coming and leaving, three per seat, and both dealer cards on their own: 3 + 1 + 2 + 7 × 3 + 3 + 3.
  assert.deepEqual([g.mode, f.total], ['SEAT', 33]); assert.ok(!f.required.some(id => /P\d\.C2|D\.C3/.test(id))); assert.ok(f.required.includes('IDLE>REVEAL(D.C1)'));
  for (const seat of graph.SEATS) for (const [own, first] of [[`READY>${seat}.C2`, `READY>${seat}.C1`], [`${seat}.C2>READY`, `${seat}.C1>READY`], [`${seat}.C2>IDLE`, `${seat}.C1>IDLE`]]) assert.equal(g.edge[own].shares, first);
  for (const id of ['READY>D.C2', 'D.C2>READY', 'D.C2>IDLE', 'READY>D.C3', 'READY>P4.C1', 'IDLE>READY']) assert.equal(g.edge[id].shares, null, id);
  assert.deepEqual([f.done, f.missing], [5, 28], 'missing: nothing playable, a rejected film included');
  const card = graph.buildGraph(seatBank(), {mode: 'CARD'});
  assert.ok(card.edges.every(e => e.shares === null)); assert.equal(card.summary.films.total, 54);
  // The second card's steps keep their own name and play the seat's films, moved to its place and cut as for the first.
  const places = {'P4.C1': {x: 850, y: 1100}, 'P4.C2': {x: 890, y: 1084}, 'D.C1': {x: 800, y: 700}, 'D.C2': {x: 848, y: 700}};
  const round = graph.resolveRound(g, graph.parseSequence('READY>P4.C1 | P4.C1>READY | READY>P4.C2 | P4.C2>IDLE').steps, {places});
  assert.deepEqual(round.map(s => [s.film?.id, s.take?.id, s.shift]), [['READY>P4.C1', 'p4-deal-01', null], ['P4.C1>READY', 'p4-back-ready-01', null], ['READY>P4.C1', 'p4-deal-01', {x: 40, y: -16}], ['P4.C1>IDLE', 'p4-back-idle-01', {x: 40, y: -16}]]);
  assert.deepEqual([round[2].end, round[2].cut], [round[0].end, round[0].cut]); assert.ok(round.every(s => s.notes.length === 0));
  // The hole card plays its own film, unshifted; a seat whose only film is rejected, or that has none, is a gap for both its cards.
  const dealer = graph.resolveRound(g, graph.parseSequence('READY>D.C1 | READY>P1.C2 | READY>P2.C2').steps, {places});
  assert.deepEqual(dealer.map(s => [s.film?.id, s.take?.id ?? null, s.shift, s.gap]), [['READY>D.C1', 'hole-deal-01', null, null], ['READY>P1.C1', null, null, 'REJECTED'], ['READY>P2.C1', null, null, 'MISSING']]);
});

test('a second card plays its own approved deal and return, and the seat\'s film when either is rejected, archived, missing or does not fit', () => {
  const data = seatBank(), deal = 'p4-second-01', back = 'p4-second-back-01';
  data.jobs!.push(job(back, 'P4.C2', 'READY', from(deal, 101)));
  data.motions![deal] = done('ACCEPTED', {review: {decision: 'ACCEPTED', acceptedAs: 'MAIN'}});
  data.motions![back] = done('ACCEPTED'); data.media![back] = {video: video(back)};
  const steps = [{from: 'READY', to: 'P4.C2'}, {from: 'P4.C2', to: 'READY'}], round = graph.resolveRound(graph.buildGraph(data), steps);
  assert.deepEqual(round.map(s => [s.take?.id, s.film?.id, s.shift]), [[deal, 'READY>P4.C2', null], [back, 'P4.C2>READY', null]]);
  assert.equal(round[0].end, 101); assert.ok(round.every(s => !s.notes.length && !s.gap));
  assert.deepEqual(graph.resolveRound(graph.buildGraph(data), [{...steps[0], take: 'p4-deal-01'}, steps[1]]).map(s => [s.take?.id, s.why]), [['p4-deal-01', 'LOCKED'], ['p4-back-ready-01', 'SHARED']]);
  for (const mode of ['rejected', 'archived', 'missing', 'wrong frame', 'wrong hub', 'wrong hand']) {
    const changed: BankData = {...data, jobs: [...data.jobs!], motions: {...data.motions}, media: {...data.media}};
    if (mode === 'rejected') changed.motions![deal] = done('REJECTED');
    if (mode === 'archived') changed.motions![back] = done('ACCEPTED', {review: {decision: 'ACCEPTED', archived: {by: 'Jakob', at: '2026-11-18T00:00:00Z'}}});
    if (mode === 'missing') changed.media![deal] = {video: null};
    if (mode === 'wrong frame') changed.jobs![changed.jobs!.length - 1] = job(back, 'P4.C2', 'READY', from('another-deal', 101));
    if (mode === 'wrong hub') changed.jobs![changed.jobs!.length - 1] = job(back, 'P4.C2', 'READY-B', from(deal, 101));
    if (mode === 'wrong hand') { changed.motions![deal] = done('ACCEPTED', {motion: {releaseHand: 'LH'}}); changed.motions![back] = done('ACCEPTED', {motion: {releaseHand: 'RH'}}); }
    assert.deepEqual(graph.resolveRound(graph.buildGraph(changed), steps).map(s => s.take?.id), ['p4-deal-01', 'p4-back-ready-01'], mode);
  }
});

test('the turn of the hole card is a needed film of its own: a rejected turn never plays, and the round goes on from rest', () => {
  const bare = graph.buildGraph({}).edge[graph.REVEAL_EDGE];
  assert.deepEqual([bare.status, bare.experiment, bare.shares], ['MISSING', false, null]);
  const data: BankData = {jobs: [{...job('turn-01', 'IDLE', 'REVEAL(D.C1)'), kind: 'REVEAL', target: 'D.C1', duration: 4}, job('entry-01', 'IDLE', 'READY', {kind: 'ENTRY', target: null})],
    motions: {'turn-01': done('REJECTED'), 'entry-01': done()}, media: {'turn-01': {video: video('turn-01')}, 'entry-01': {video: video('entry-01')}}};
  const steps = [{from: 'IDLE', to: 'REVEAL(D.C1)'}, {from: 'IDLE', to: 'READY'}];
  assert.equal(graph.resolveRound(graph.buildGraph(data), steps)[0].take, null, 'a rejected turn never plays');
  data.motions!['turn-01'] = done('ACCEPTED');
  const g = graph.buildGraph(data), [turn, entry] = graph.resolveRound(g, steps);
  assert.deepEqual([g.experiments, g.unplaced, turn.take?.id, entry.take?.id, entry.notes], [[], [], 'turn-01', 'entry-01', []]);
  assert.ok(g.summary.films.required.includes(graph.REVEAL_EDGE));
});

// ── Primär ──────────────────────────────────────────────────────────────────
// Seat 4: the deal Jakob accepted is continued only by variants, while the return he accepted outright was cut from an older deal.
// A READY-B deal and the hole card stand beside them. marks: 'MAIN' (Primär), 'VARIANT' or a decision.
function primaryBank(marks: Record<string, string> = {}): BankData {
  const jobs = [job('entry-01', 'IDLE', 'READY', {kind: 'ENTRY', target: null}), job('p4-deal-01', 'READY', 'LAND(P4.C1)'), job('p4-deal-02', 'READY', 'LAND(P4.C1)'), job('p4-readyb-deal-01', 'READY-B', 'LAND(P4.C1)'),
    job('p4-back-ready-01', 'LAND(P4.C1)', 'READY', from('p4-deal-01', 96)), job('p4-back-ready-02', 'LAND(P4.C1)', 'READY', from('p4-deal-02', 104)), job('p4-back-idle-01', 'LAND(P4.C1)', 'IDLE', from('p4-deal-02', 104)),
    job('hole-open-01', 'READY', 'LAND(D.C1)'), job('hole-closed-01', 'READY', 'LAND(D.C1)'), job('hole-back-idle-01', 'LAND(D.C1)', 'IDLE', from('hole-open-01', 90))];
  const marked: Record<string, string> = {'p4-deal-02': 'ACCEPTED', 'p4-readyb-deal-01': 'ACCEPTED', 'p4-back-ready-01': 'ACCEPTED', 'p4-back-ready-02': 'VARIANT', 'p4-back-idle-01': 'VARIANT', 'hole-closed-01': 'ACCEPTED', ...marks};
  const review = (mark = 'PENDING') => mark === 'MAIN' || mark === 'VARIANT' ? {decision: 'ACCEPTED', acceptedAs: mark} : {decision: mark};
  return {jobs, motions: Object.fromEntries(jobs.map(j => [j.id, done('PENDING', {review: review(marked[j.id]), motion: {physicalEndSide: j.id === 'hole-closed-01' ? 'BACK' : 'FRONT'}})])),
    media: Object.fromEntries(jobs.map(j => [j.id, {video: video(j.id)}]))};
}
const played = (round: graph.Segment[]) => round.map(s => [s.id, s.take?.id ?? null, s.why, s.end, s.cut]);
const P4_TRIP = graph.parseSequence('READY>P4.C1 | P4.C1>READY').steps;

test('a Primär return plays right after a deal, and the deal before it is the one it was cut from, cut on its frame', () => {
  assert.deepEqual(played(graph.resolveRound(graph.buildGraph(primaryBank()), P4_TRIP)), [['READY>P4.C1', 'p4-deal-02', 'MAIN', 104, 'FRAME'], ['P4.C1>READY', 'p4-back-ready-02', 'MAIN', null, null]]);
  const g = graph.buildGraph(primaryBank({'p4-back-ready-01': 'MAIN'})), round = graph.resolveRound(g, P4_TRIP);
  assert.equal(g.edge['READY>P4.C1'].main?.id, 'p4-deal-02', 'the accepted deal stays the main deal: rank comes first');
  assert.deepEqual(played(round), [['READY>P4.C1', 'p4-deal-01', 'FITS_PRIMARY_RETURN', 96, 'FRAME'], ['P4.C1>READY', 'p4-back-ready-01', 'PRIMARY', null, null]]);
  assert.deepEqual(round.flatMap(s => s.notes), []);
  // A Primär to READY does not move the deal before a return to IDLE.
  assert.deepEqual(played(graph.resolveRound(g, graph.parseSequence('READY>P4.C1 | P4.C1>IDLE').steps)), [['READY>P4.C1', 'p4-deal-02', 'MAIN', 104, 'FRAME'], ['P4.C1>IDLE', 'p4-back-idle-01', 'MAIN', null, null]]);
  // The second card of the seat plays the seat's Primär return too, after the deal it continues.
  const places = {'P4.C1': {x: 850, y: 1100}, 'P4.C2': {x: 890, y: 1084}};
  assert.deepEqual(played(graph.resolveRound(g, graph.parseSequence('READY>P4.C2 | P4.C2>READY').steps, {places})).map(s => s[1]), ['p4-deal-01', 'p4-back-ready-01']);
});

test('a step plays its approved films in turn, each with its own return; a Primär locks it (Jakob 2026-11-24)', () => {
  const beats: Beat[] = [{kind: 'DEAL', step: {from: 'READY', to: 'P4.C1'}, own: null, lying: []}, {kind: 'RETURN', step: {from: 'P4.C1', to: 'READY'}, own: null, lying: []}];
  const takeAt = (g: graph.Graph, r: number) => { const deal = inTurn(g, beats[0], beats[1], () => r); return played(graph.resolveRound(g, [deal.step!, beats[1].step!])).map(s => s[1]); };
  const both = graph.buildGraph(primaryBank({'p4-deal-01': 'ACCEPTED'}));
  assert.deepEqual(takeAt(both, 0), ['p4-deal-02', 'p4-back-ready-02'], 'random 0: the bank\'s own choice');
  assert.deepEqual(takeAt(both, 0.99), ['p4-deal-01', 'p4-back-ready-01'], 'the other approved deal, and the return cut from it');
  assert.deepEqual(takeAt(graph.buildGraph(primaryBank()), 0.99), ['p4-deal-02', 'p4-back-ready-02'], 'a deal that waits for a verdict takes no turn');
  assert.deepEqual(takeAt(graph.buildGraph(primaryBank({'p4-deal-01': 'ACCEPTED', 'p4-deal-02': 'MAIN'})), 0.99), ['p4-deal-02', 'p4-back-ready-02'], 'Primär locks the step');
});

test('two Primär takes that do not fit both play: the deal to its own landing frame, and the seam is named', () => {
  const round = graph.resolveRound(graph.buildGraph(primaryBank({'p4-deal-02': 'MAIN', 'p4-back-ready-01': 'MAIN'})), P4_TRIP);
  assert.deepEqual(played(round), [['READY>P4.C1', 'p4-deal-02', 'PRIMARY', 104, 'FRAME'], ['P4.C1>READY', 'p4-back-ready-01', 'PRIMARY', null, null]]);
  assert.deepEqual(round[0].notes, []); assert.match(round[1].notes.join(' '), /^Skarv/);
});

// Jakob (2026-11-13): the return must be the arm that is out. The Primär deal lays the card with the left hand, the Primär return was
// cut from a deal whose right hand laid it, and the deal's own return is accepted.
function handBank(back: string = 'VARIANT', hands: Record<string, string> = {'p4-deal-01': 'RH', 'p4-deal-02': 'LH'}): BankData {
  const data = primaryBank({'p4-deal-02': 'MAIN', 'p4-back-ready-01': 'MAIN', 'p4-back-ready-02': back});
  for (const [id, hand] of Object.entries(hands)) data.motions![id] = {...data.motions![id], motion: {...data.motions![id].motion, takeHand: 'LH', releaseHand: hand}};
  return data;
}
test('after a deal the return comes back with the hand that laid the card: a Primär return of the other hand gives way to the deal\'s own', () => {
  const g = graph.buildGraph(handBank());
  assert.deepEqual(['p4-deal-01', 'p4-deal-02', 'p4-back-ready-01', 'p4-back-ready-02'].map(id => g.takes[id].releaseHand), ['RH', 'LH', 'RH', 'LH'], 'a return has the hand of the deal it was cut from');
  const round = graph.resolveRound(g, P4_TRIP);
  assert.deepEqual(played(round), [['READY>P4.C1', 'p4-deal-02', 'PRIMARY', 104, 'FRAME'], ['P4.C1>READY', 'p4-back-ready-02', 'FITS_DEAL', null, null]]);
  assert.ok(round[1].notes.length, 'the Primär that gave way is named');
  // With no return of the right hand, the Primär of the other hand plays and the fault is said.
  const lone = graph.resolveRound(graph.buildGraph(handBank('REJECTED')), P4_TRIP);
  assert.equal(lone[1].take?.id, 'p4-back-ready-01'); assert.match(lone[1].notes.join(' '), /^Fel hand/);
  // The same hand, or a hand that is not known, leaves Primär as it was: it plays and the seam is named.
  for (const hands of [{'p4-deal-01': 'LH', 'p4-deal-02': 'LH'}, {}]) {
    const same = graph.resolveRound(graph.buildGraph(handBank('VARIANT', hands)), P4_TRIP);
    assert.deepEqual(played(same)[1], ['P4.C1>READY', 'p4-back-ready-01', 'PRIMARY', null, null], JSON.stringify(hands)); assert.match(same[1].notes.join(' '), /^Skarv/);
  }
});

test('a take the round names beats Primär, on the return and on the deal', () => {
  const g = graph.buildGraph(primaryBank({'p4-back-ready-01': 'MAIN'})), round = (text: string) => graph.resolveRound(g, graph.parseSequence(text).steps);
  assert.deepEqual(played(round('READY>P4.C1 | P4.C1>READY@p4-back-ready-02')), [['READY>P4.C1', 'p4-deal-02', 'MAIN', 104, 'FRAME'], ['P4.C1>READY', 'p4-back-ready-02', 'LOCKED', null, null]]);
  const named = round('READY>P4.C1@p4-deal-02 | P4.C1>READY');
  assert.deepEqual(played(named), [['READY>P4.C1', 'p4-deal-02', 'LOCKED', 104, 'FRAME'], ['P4.C1>READY', 'p4-back-ready-01', 'PRIMARY', null, null]]); assert.match(named[1].notes.join(' '), /^Skarv/);
  assert.deepEqual(played(graph.resolveRound(graph.buildGraph(primaryBank({'p4-deal-02': 'MAIN'})), [{from: 'READY', to: 'P4.C1', take: 'p4-deal-01'}])), [['READY>P4.C1', 'p4-deal-01', 'LOCKED', 96, 'FRAME']]);
});

test('a READY-B start is unaffected by a Primär return after it, and the closed hole card is never traded for a deal the Primär continues', () => {
  const steps = graph.parseSequence('READY-B>P4.C1 | P4.C1>READY').steps, plain = graph.resolveRound(graph.buildGraph(primaryBank()), steps);
  const marked = graph.resolveRound(graph.buildGraph(primaryBank({'p4-back-ready-01': 'MAIN'})), steps), deal = (s: graph.Segment) => [s.take?.id, s.why, s.start, s.end, s.cut, s.notes];
  assert.deepEqual(deal(marked[0]), deal(plain[0])); assert.equal(marked[0].take?.id, 'p4-readyb-deal-01');
  assert.deepEqual([marked[1].take?.id, marked[1].why], ['p4-back-ready-01', 'PRIMARY']); assert.match(marked[1].notes.join(' '), /^Skarv/);
  // The hole card stays closed: the Primär return was cut from an open deal, so the closed deal plays and the seam is said.
  const hole = graph.buildGraph(primaryBank({'hole-back-idle-01': 'MAIN'})), last = graph.parseSequence('READY>D.C1 | D.C1>IDLE').steps;
  const closed = graph.resolveRound(hole, last);
  assert.deepEqual(played(closed), [['READY>D.C1', 'hole-closed-01', 'MAIN', null, null], ['D.C1>IDLE', 'hole-back-idle-01', 'PRIMARY', null, null]]);
  assert.equal(closed[0].side, 'BACK'); assert.match(closed[1].notes.join(' '), /^Skarv/);
  // Dealt open, the deal the Primär return continues may play.
  const open = graph.resolveRound(hole, last, {holeCardDown: false});
  assert.deepEqual(played(open), [['READY>D.C1', 'hole-open-01', 'FITS_PRIMARY_RETURN', 90, 'FRAME'], ['D.C1>IDLE', 'hole-back-idle-01', 'PRIMARY', null, null]]); assert.deepEqual(open.flatMap(s => s.notes), []);
});

test('the main deal: among equals, the one a Primär return continues; rank and a Primär deal still come first', () => {
  const main = (marks: Record<string, string>) => { const g = graph.buildGraph(primaryBank(marks)); return [g.edge['READY>P4.C1'].main?.id, g.edge['P4.C1>READY'].main?.id]; };
  assert.deepEqual(main({'p4-deal-02': 'PENDING'}), ['p4-deal-02', 'p4-back-ready-02']);
  assert.deepEqual(main({'p4-deal-02': 'PENDING', 'p4-back-ready-01': 'MAIN'}), ['p4-deal-01', 'p4-back-ready-01']);
  assert.deepEqual(main({'p4-back-ready-01': 'MAIN'}), ['p4-deal-02', 'p4-back-ready-01']);
  assert.deepEqual(main({'p4-deal-01': 'MAIN', 'p4-back-ready-02': 'MAIN'}), ['p4-deal-01', 'p4-back-ready-02']);
});

// ── Idle ────────────────────────────────────────────────────────────────────
function idleBank(): BankData {
  const frame0 = {frame: {video: video('paow-idle-ready-entry-01'), videoSha256: sha, index: 0}}, idle = (id: string) => job(id, 'IDLE', 'IDLE', {kind: 'IDLE', target: null, first: frame0, last: frame0});
  const jobs = [idle('paow-idle-loop-01'), idle('paow-idle-breath-b-01'), idle('paow-idle-smile-01'), idle('paow-idle-coffee-01'), idle('paow-idle-stretch-01'), idle('paow-idle-glance-01')];
  return {jobs, media: Object.fromEntries(jobs.map(j => [j.id, {video: video(j.id)}])), motions: {
    'paow-idle-loop-01': done(), 'paow-idle-breath-b-01': done('PENDING', {motion: {idle: {calm: true, weight: 10, label: 'andning'}}}), 'paow-idle-smile-01': done(),
    'paow-idle-coffee-01': done('PENDING', {motion: {idle: {onRequest: true}}}), 'paow-idle-stretch-01': done('REJECTED')}}; // the glance film has no record yet
}

test('the round\'s idle film is the calmest, and his acceptance still wins', () => {
  assert.equal(graph.buildGraph(idleBank()).edge['IDLE>IDLE'].main?.id, 'paow-idle-loop-01');
  const chosen = idleBank(); chosen.motions!['paow-idle-smile-01'] = done('ACCEPTED');
  assert.equal(graph.buildGraph(chosen).edge['IDLE>IDLE'].main?.id, 'paow-idle-smile-01');
});

test('the idle picker: never the same clip twice in a row, two calm clips before each gesture, nothing rejected or on request, nothing hurried', () => {
  const g = graph.buildGraph(idleBank()), takes = g.edge['IDLE>IDLE'].takes, pick = (played: string[], random: number) => graph.pickIdle(takes, played, random)!.take.id;
  const loop = 'paow-idle-loop-01', breath = 'paow-idle-breath-b-01', smile = 'paow-idle-smile-01', glance = 'paow-idle-glance-01';
  const played: string[] = [], seen = new Set<string>(); let seed = 7;
  for (let i = 0; i < 600; i++) { seed = (seed * 16807) % 2147483647; const next = pick(played, seed / 2147483647); assert.notEqual(next, played.at(-1)); played.push(next); seen.add(next); }
  assert.deepEqual([...seen].sort(), [breath, glance, loop, smile].sort(), 'the rejected stretch and the coffee on request never come by chance');
  for (let i = 0; i < played.length; i++) if (![loop, breath].includes(played[i])) { const before = played.slice(Math.max(0, i - 2), i); assert.ok(before.length === 2 && before.every(id => [loop, breath].includes(id)), `gesture at ${i} after ${before.join(',')}`); }
  const shown = played.filter(id => ![loop, breath].includes(id));
  assert.equal(shown.length, 200); assert.ok(shown.every((id, i) => i === 0 || id !== shown[i - 1]), 'never the same gesture twice running while another is left');
  assert.equal(graph.pickIdle([], [], 0.5), null); assert.equal(graph.pickIdle(takes.filter(t => t.id === 'paow-idle-stretch-01'), [], 0.5), null);
  assert.equal(graph.IDLE_RULE.exitRate, 1, 'played out as filmed: nothing in a round is hurried from the start (Jakob 2026-11-13)');
});

// ── Dealers ─────────────────────────────────────────────────────────────────
// A second dealer's takes share the file: Jakob's word on the second's (a Primär, an accepted deal) would win on the first's edges
// if the two ever mixed. The second's derived take and corrected copy name no dealer: they are the second's by their film.
const SECOND = 'ada', secondReady = {file: {path: 'assets/anchors/ada-ready-01/anchor.png', sha256: sha}};
function twoDealers(): BankData {
  const data = bank(), second = (id: string, from: string, to: string, extra: Partial<BankJob> = {}) => job(id, from, to, {dealer: SECOND, first: secondReady, ...extra});
  const theirs = [second('ada-p4-c1-plan-deal-01', 'READY', 'LAND(P4.C1)'), second('ada-p4-c1-plan-return-ready-01', 'LAND(P4.C1)', 'READY', from('ada-p4-c1-plan-deal-01', 90)), second('ada-p1-c1-plan-deal-01', 'READY', 'LAND(P1.C1)')];
  data.jobs!.push(...theirs);
  data.derived = [{id: 'ada-p4-c1-plan-deal-01-cut', kind: 'DEAL', from: 'READY', to: 'LAND(P4.C1)', clip: 'ada-p4-c1-plan-deal-01', frames: [0, 80]}];
  data.edits = [{id: 'ada-p1-c1-plan-deal-01-edit-01', source: {clip: 'ada-p1-c1-plan-deal-01', sha256: sha}, model: 'aleph2', promptText: 'A corrected copy.', purpose: 'fixture'}];
  data.motions!['ada-p4-c1-plan-deal-01'] = done('ACCEPTED', {review: {decision: 'ACCEPTED', acceptedAs: 'MAIN'}});
  data.motions!['ada-p4-c1-plan-return-ready-01'] = done('ACCEPTED', {review: {decision: 'ACCEPTED', acceptedAs: 'MAIN'}});
  data.motions!['ada-p1-c1-plan-deal-01'] = done('ACCEPTED');
  for (const id of [...theirs.map(j => j.id), 'ada-p1-c1-plan-deal-01-edit-01']) { data.receipts![id] = {status: 'SUCCEEDED', estimatedCredits: 80}; data.media![id] = {video: video(id)}; }
  data.media!['ada-p4-c1-plan-deal-01-cut'] = {video: video('ada-p4-c1-plan-deal-01')};
  return data;
}

test('two dealers share the job file but never a graph; a take without a dealer field is the first dealer\'s', () => {
  const data = twoDealers(), owner = graph.dealersOf(data), first = graph.DEALER;
  assert.deepEqual([owner['paow-p4-c1-plan-deal-02'], owner['ada-p4-c1-plan-deal-01'], owner['ada-p4-c1-plan-deal-01-cut'], owner['ada-p1-c1-plan-deal-01-edit-01']], [first, SECOND, SECOND, SECOND]);
  const mine = graph.buildGraph(data), ada = graph.buildGraph(data, {dealer: SECOND});
  assert.deepEqual([mine.unplaced, ada.unplaced], [[], []]);
  assert.deepEqual(Object.keys(ada.takes).sort(), ['ada-p1-c1-plan-deal-01', 'ada-p1-c1-plan-deal-01-edit-01', 'ada-p4-c1-plan-deal-01', 'ada-p4-c1-plan-deal-01-cut', 'ada-p4-c1-plan-return-ready-01']);
  assert.ok(!Object.keys(mine.takes).some(id => id.startsWith('ada-')), 'none of the second dealer\'s takes in the first\'s graph');
  // The second dealer's own graph: the Primär plays at seat 4 and the accepted deal at seat 1; nothing of the first's fills the gaps.
  assert.deepEqual(graph.resolveRound(ada, graph.parseSequence('READY>P4.C1 | P4.C1>READY | READY>P1.C1 | P1.C1>READY').steps).map(s => [s.take?.id ?? null, s.why, s.gap]),
    [['ada-p4-c1-plan-deal-01', 'PRIMARY', null], ['ada-p4-c1-plan-return-ready-01', 'PRIMARY', null], ['ada-p1-c1-plan-deal-01', 'MAIN', null], [null, 'GAP', 'MISSING']]);
  assert.equal(graph.resolveRound(ada, [{from: 'READY', to: 'P4.C1', take: 'paow-p4-c1-plan-deal-02'}])[0].take?.id, 'ada-p4-c1-plan-deal-01', 'the first dealer\'s take cannot play here');
  assert.deepEqual(Object.keys(graph.buildGraph(data, {dealer: 'nobody'}).takes), []);
});

test('a second dealer\'s take, even one Jakob made Primär, does not move the first dealer\'s main take, round or counts', () => {
  const alone = graph.buildGraph(bank()), mixed = graph.buildGraph(twoDealers()), steps = graph.roundSequence({seats: graph.SEATS, reveal: true});
  const mains = (g: graph.Graph) => [...g.edges, ...g.experiments].map(e => [e.id, e.main?.id ?? null, e.status, e.variants.map(t => t.id), e.inProgress]);
  const round = (g: graph.Graph) => graph.resolveRound(g, steps).map(s => [s.id, s.take?.id ?? null, s.why, s.start, s.end, s.cut, s.gap, s.notes]);
  assert.deepEqual(mains(mixed), mains(alone)); assert.deepEqual(round(mixed), round(alone)); assert.deepEqual(mixed.summary, alone.summary);
});

// ── The inbox ───────────────────────────────────────────────────────────────
// A take from an order (tools/register-order.ts) comes in with review.inbox: it may not push aside anything Jakob has seen.
const inbox = (extra: MotionRecord = {}): MotionRecord => done('PENDING', {...extra, review: {decision: 'PENDING', inbox: true}});
function inboxBank(): BankData {
  const data = primaryBank(), add = (j: BankJob, record: MotionRecord) => { data.jobs!.push(j); data.motions![j.id] = record; data.media![j.id] = {video: video(j.id)}; };
  add(job('p4-deal-03', 'READY', 'LAND(P4.C1)'), inbox());                                                         // a new deal beside the accepted one
  add(job('p4-back-ready-03', 'LAND(P4.C1)', 'READY', from('p4-deal-03', 100)), inbox());                          // its own return
  add(job('p4-back-idle-02', 'LAND(P4.C1)', 'IDLE', from('p4-deal-02', 110)), inbox());                            // continues the main deal, where only a variant does today
  add(job('p7-deal-01', 'READY', 'LAND(P7.C1)'), inbox());                                                         // the only film of its step
  return data;
}

test('a take in the inbox ranks below a variant and plays only where its step has no other film; it is current work, not a leftover', () => {
  const before = graph.buildGraph(primaryBank()), g = graph.buildGraph(inboxBank()), mains = (x: graph.Graph) => x.edges.filter(e => e.main).map(e => [e.id, e.main!.id, e.status]);
  const order = (id: string) => g.edges.findIndex(e => e.id === id);
  assert.deepEqual(mains(g), [...mains(before), ['READY>P7.C1', 'p7-deal-01', 'UNREVIEWED']].sort((a, b) => order(a[0]) - order(b[0])), 'every main take Jakob has seen stays');
  assert.equal(g.edge['P4.C1>IDLE'].main?.id, 'p4-back-idle-01', 'the variant stays, although the new return continues the main deal');
  assert.deepEqual([g.takes['p4-deal-02'].landingFrame, g.takes['p4-deal-02'].landingConflict], [104, false], 'a new return does not move where the main deal is cut');
  const steps = graph.roundSequence({seats: ['P4', 'P7'], dealer: false}), was = graph.resolveRound(before, steps).map(s => s.take?.id ?? null);
  assert.deepEqual(graph.resolveRound(g, steps).map(s => s.take?.id ?? null), was.map((id, i) => steps[i].to === 'P7.C1' || steps[i].to === 'P7.C2' ? 'p7-deal-01' : id));
  // A round that names the new takes plays them; unnamed, the return after the new deal is still one Jakob has seen, the seam named.
  assert.deepEqual(played(graph.resolveRound(g, graph.parseSequence('READY>P4.C1@p4-deal-03 | P4.C1>READY@p4-back-ready-03').steps)).map(s => s[1]), ['p4-deal-03', 'p4-back-ready-03']);
  const after = graph.resolveRound(g, graph.parseSequence('READY>P4.C1@p4-deal-03 | P4.C1>READY').steps)[1];
  assert.equal(after.take?.id, 'p4-back-ready-02'); assert.match(after.notes.join(' '), /Skarv/);
  for (const id of ['p4-deal-03', 'p4-back-ready-03', 'p4-back-idle-02']) assert.ok(graph.isCurrent(g.edge[g.takes[id].edge], g.takes[id]), id);
});

test('Jakob\'s decision takes a take out of the inbox, and it then ranks as any other', () => {
  const data = inboxBank(), decide = (id: string, decision: 'ACCEPTED' | 'VARIANT' | 'REJECTED' | 'PENDING') => { data.motions![id] = {...data.motions![id], review: applyChange(data.motions![id].review, {decision, note: ''}, '2026-11-12') as MotionRecord['review']}; };
  decide('p4-back-idle-02', 'PENDING'); assert.equal(data.motions!['p4-back-idle-02'].review?.inbox, true, 'a reset is no decision');
  decide('p4-back-idle-02', 'ACCEPTED'); decide('p4-deal-03', 'REJECTED');
  assert.deepEqual([data.motions!['p4-back-idle-02'].review?.inbox, data.motions!['p4-deal-03'].review?.inbox], [undefined, undefined]);
  const g = graph.buildGraph(data);
  assert.equal(g.edge['P4.C1>IDLE'].main?.id, 'p4-back-idle-02', 'accepted and continuing the main deal');
  assert.deepEqual([g.edge['READY>P4.C1'].main?.id, g.takes['p4-deal-03'].decision], ['p4-deal-02', 'REJECTED']);
});

test('the idle picker leaves a take in the inbox alone while other idle films exist', () => {
  const data = idleBank(); data.motions!['paow-idle-new-01'] = inbox({motion: {idle: {calm: true, weight: 1000}}});
  data.jobs!.push(job('paow-idle-new-01', 'IDLE', 'IDLE', {kind: 'IDLE', target: null, first: data.jobs![0].first, last: data.jobs![0].last})); data.media!['paow-idle-new-01'] = {video: video('paow-idle-new-01')};
  const g = graph.buildGraph(data), takes = g.edge['IDLE>IDLE'].takes;
  assert.equal(g.edge['IDLE>IDLE'].main?.id, 'paow-idle-loop-01');
  const seen: string[] = []; for (let i = 0; i < 200; i++) seen.push(graph.pickIdle(takes, seen, (i * 37 % 100) / 100)!.take.id);
  assert.ok(!seen.includes('paow-idle-new-01'));
  assert.equal(graph.pickIdle(takes.filter(t => t.inbox), [], 0.5)?.take.id, 'paow-idle-new-01', 'alone it plays');
});

test('a film from an order enters as frames of its own clip, waiting in the inbox; its fixed copy is a corrected copy that plays as one film', () => {
  const clip = 'paow-giv-p4-01', deal = `${clip}-deal`, back = `${clip}-return-ready`, fix = `${clip}-fix-1`, fixDeal = `${fix}-deal`, fixBack = `${fix}-return-ready`;
  const record = (frames: number, extra: MotionRecord = {}) => inbox({source: {fps: 24, frames}, ...extra}), d = {dealer: 'paow', model: 'kling-4'};
  const data: BankData = {jobs: [], derived: [{id: deal, kind: 'DEAL', from: 'READY', to: 'P4.C1', clip, frames: [0, 99], ...d}, {id: back, kind: 'RETURN', from: 'P4.C1', to: 'READY', clip, frames: [100, 167], ...d},
    {id: fixDeal, kind: 'DEAL', from: 'READY', to: 'P4.C1', clip: fix, frames: [0, 99], ...d, editOf: deal}, {id: fixBack, kind: 'RETURN', from: 'P4.C1', to: 'READY', clip: fix, frames: [100, 165], ...d, editOf: back}],
    motions: {[deal]: record(168), [back]: record(168, {motion: {startsOn: {clip: deal, frame: 100}}}), [fixDeal]: record(166), [fixBack]: record(166, {motion: {startsOn: {clip: deal, frame: 100}}})},
    media: {[deal]: {video: video(clip)}, [back]: {video: video(clip)}, [fixDeal]: {video: video(fix)}, [fixBack]: {video: video(fix)}}};
  assert.deepEqual(Object.keys(graph.buildGraph(data, {dealer: SECOND}).takes), [], 'none of it is another dealer\'s');
  const g = graph.buildGraph(data, {dealer: 'paow'}), t = g.takes;
  assert.deepEqual([g.unplaced, t[deal].inbox, t[deal].landingFrame, t[fixDeal].editOf, t[fixBack].editOf], [[], true, 100, deal, back]);
  for (const [r, d] of [[back, deal], [back, fixDeal], [fixBack, deal], [fixBack, fixDeal]]) assert.ok(graph.returnFits(t[r], t[d]), `${r} after ${d}`);
  assert.deepEqual(graph.resolveRound(g, graph.parseSequence(`READY>P4.C1@${fixDeal} | P4.C1>READY@${fixBack}`).steps).map(s => [s.take?.id, s.video, s.start, s.end, s.cut, s.notes.length]),
    [[fixDeal, video(fix), 0, 100, 'FRAME', 0], [fixBack, video(fix), 100, null, null, 0]]);
  for (const id of [deal, back, fixDeal, fixBack]) assert.ok(graph.isCurrent(g.edge[t[id].edge], t[id]), id);
});

// ── The archive ─────────────────────────────────────────────────────────────
// Jakob archives a take by hand (review.archived, tools/review-store.ts): out of play, kept in the graph with its verdict.
const archivedBy = {by: 'Jakob', at: '2026-11-18T01:00:00.000Z', where: 'Karta'};
test('an archived take never plays: the step falls back on its next take by the same rule, a round that names it too, and his Primär mark stays on it', () => {
  const data = bank();
  data.motions!['paow-p4-c1-plan-deal-02'].review = {decision: 'ACCEPTED', acceptedAs: 'MAIN', userAccepted: true, archived: archivedBy};
  const g = graph.buildGraph(data), deal = g.edge['READY>P4.C1'], gone = g.takes['paow-p4-c1-plan-deal-02'];
  assert.deepEqual([gone.archived, graph.playable(gone), gone.explicitMain, deal.takes.includes(gone)], [true, false, true, true], 'out of play, his verdict untouched, still listed');
  // Nothing is chosen in its place: the next take by the graph's own rule plays, and no take is made Primär.
  assert.equal(deal.main?.id, 'paow-p4-c1-deal-calm-01'); assert.equal(deal.takes.some(t => t.explicitMain && graph.playable(t)), false);
  const [locked] = graph.resolveRound(g, [{from: 'READY', to: 'P4.C1', take: 'paow-p4-c1-plan-deal-02'}]);
  assert.equal(locked.take?.id, 'paow-p4-c1-deal-calm-01'); assert.match(locked.notes.join(' '), /paow-p4-c1-plan-deal-02/, 'a note names the take that cannot play');
  for (const s of graph.resolveRound(g, graph.roundSequence({seats: ['P4', 'P1'], dealer: false, cards: 1}))) assert.notEqual(s.take?.id, 'paow-p4-c1-plan-deal-02', s.id);
  assert.equal(graph.pickIdle([{...gone, idle: {weight: 20, calm: true, onRequest: false, label: '', cut: true}}], [], 0.5), null, 'the rest never picks an archived film');
});

test('a step whose only films are archived has no film: it is missing, not rejected, and its seat\'s second card has none either', () => {
  const data = bank();
  for (const id of ['paow-p7-c1-plan-deal-01', 'paow-p7-c1-plan-deal-02']) data.motions![id].review = {...data.motions![id].review, archived: archivedBy};
  const g = graph.buildGraph(data), e = g.edge['READY>P7.C1'];
  assert.deepEqual([e.main, e.variants, e.status, e.takes.length], [null, [], 'MISSING', 2]);
  assert.deepEqual(graph.resolveRound(g, [{from: 'READY', to: 'P7.C1'}, {from: 'READY', to: 'P7.C2'}]).map(s => [s.take, s.gap]), [[null, 'MISSING'], [null, 'MISSING']]);
  assert.equal(g.summary.films.missing, graph.buildGraph(bank()).summary.films.missing + 1, 'the count of missing films follows');
  // A rejected film beside the archived ones is still what the step says of itself.
  data.motions!['paow-p7-c1-plan-deal-01'].review = {decision: 'REJECTED'};
  assert.equal(graph.resolveRound(graph.buildGraph(data), [{from: 'READY', to: 'P7.C1'}])[0].gap, 'REJECTED');
});

test('an archived return neither follows a deal nor decides where it is cut while another return can', () => {
  const data = bank();
  data.jobs!.push(job('paow-p4-c1-plan-return-idle-02', 'LAND(P4.C1)', 'IDLE', from('paow-p4-c1-plan-deal-02', 108)));
  data.motions!['paow-p4-c1-plan-return-idle-02'] = done('ACCEPTED'); data.media!['paow-p4-c1-plan-return-idle-02'] = {video: video('paow-p4-c1-plan-return-idle-02')};
  for (const id of ['paow-p4-c1-plan-return-ready-01', 'paow-p4-c1-plan-return-idle-01']) data.motions![id].review = {decision: 'ACCEPTED', archived: archivedBy};
  const g = graph.buildGraph(data), deal = g.takes['paow-p4-c1-plan-deal-02'];
  assert.deepEqual([deal.landingFrame, deal.landingConflict, graph.returnsOf(g, deal).frame.map(t => t.id)], [108, false, ['paow-p4-c1-plan-return-idle-02']]);
  assert.equal(g.edge['P4.C1>IDLE'].main?.id, 'paow-p4-c1-plan-return-idle-02');
  // With every return of the deal archived, the frame they were cut on is still known: the deal is not played past its landing.
  data.motions!['paow-p4-c1-plan-return-idle-02'].review = {decision: 'ACCEPTED', archived: archivedBy};
  const none = graph.buildGraph(data);
  assert.deepEqual([none.takes['paow-p4-c1-plan-deal-02'].landingFrame, graph.returnsOf(none, none.takes['paow-p4-c1-plan-deal-02']), none.edge['P4.C1>IDLE'].main], [105, {frame: [], anchor: []}, null]);
});
