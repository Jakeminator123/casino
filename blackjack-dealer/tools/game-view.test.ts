// Skyddar: spelets regler – sidan visar motorns kort och pengar, hålkortet stängt till vändningen, bara lagliga knappar.
// The game's view (src/game-view.ts, game-director.ts, game-film.ts): the page shows what the engine does. Every card is the one
// dealt, on its place; totals only as cards land; the hole card closed until its turn; controls only what the phase allows;
// a round is collected once.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession, type Snapshot} from '../game/session.ts';
import {defaultPlan} from '../src/placement-model.ts';
import {createLayout, slotOf, slotLabel, slotFilm} from '../src/game-table.ts';
import {planBeats, cardRecords, lyingAfter, SEAT_HUB} from '../src/game-director.ts';
import {HOLE_CARD, buildGraph, formatSequence, roundSequence} from '../src/clip-graph.ts';
import {cardOptions, createFilm} from '../src/game-film.ts';
import {cardFace, cardRecord} from '../src/card-overlay.ts';
import {createRng} from '../game/rng.ts';
import {tableView, tableCards, cardFaces, shownBy, lineOf, handKey, mayAsk, shownFor, collector, stageOf, DEALER_KEY, type Ask, type PageState, type Shown} from '../src/game-view.ts';
import {handValue, type Card} from '../game/round.ts';

// A stacked lab shoe: the cards in draw order from draw 2 (draw 1 is the burn card). One seat plays, seat 4:
// seat 4 gets K and 6, the dealer's first card is a hidden 10 and her second an open 7, and the next card in the shoe is a 5.
const card = (text: string) => ({r: text.slice(0, -1), s: text.slice(-1)});
const session = (cards: string, balance = 1000) => createSession({balance, shoe: {mode: 'stacked', seed: 'view', cards: cards.split(' ').map(card)}});
let request = 0;
const run = (s: ReturnType<typeof createSession>, command: Record<string, unknown>): Snapshot => s.command({...command, requestId: `r${++request}`, expectedVersion: s.state().ver});
const page = (patch: Partial<PageState> = {}): PageState => ({stage: 'ROUND', busy: false, dealerPlays: false, bets: {}, last: null, chip: 25, balance: 1000, shown: {}, settled: null, line: null, error: null, ...patch});

test('betting: dealing needs a bet the balance and the limits allow', () => {
  const snapshot = session('K♠ 10♣ 6♥ 7♦ 5♦').state();
  assert.equal(tableView(snapshot, page({stage: 'BETTING'})).canDeal, false);
  const laid = tableView(snapshot, page({stage: 'BETTING', bets: {4: [25, 25, 100]}}));
  assert.deepEqual([laid.canDeal, laid.staked, laid.seats[3].amount], [true, 150, 150]);
  assert.equal(tableView(snapshot, page({stage: 'BETTING', bets: {4: [1000, 1000, 100]}})).canDeal, false, 'over the table maximum');
  assert.equal(tableView(snapshot, page({stage: 'BETTING', bets: {4: [500], 5: [500], 6: [25]}})).canDeal, false, 'more than the balance');
});

test('opening deal: totals only as the cards land, the hole card never shown', () => {
  const s = session('K♠ 10♣ 6♥ 7♦ 5♦'), dealt = run(s, {op: 'start', bets: [{seat: 4, main: 10}]}), table = tableCards(dealt);
  const shown = dealt.events.filter(e => e.type === 'deal').map(e => shownBy(e));
  assert.deepEqual(shown.map(x => x && [x.key, x.total]), [[handKey(4, 0), 10], null, [handKey(4, 0), 16], [DEALER_KEY, 7]], 'the closed first card shows nothing of the dealer');
  const records = cardRecords(table, cardFaces(dealt));
  assert.deepEqual(records.find(r => r.shoeDraw === 3), {shoeDraw: 3, target: 'D.C1', r: null, s: null, faceDown: true});
  assert.deepEqual(records.find(r => r.shoeDraw === 5), {shoeDraw: 5, target: 'D.C2', r: '7', s: 'diamonds', faceDown: false});
  assert.ok(!JSON.stringify(dealt).includes('"r":"10"'), 'the ten is not in the answer');
  // While the film plays, the overlay shows what has landed, not what the engine already knows.
  const first = tableView(dealt, page({busy: true, shown: {[handKey(4, 0)]: {total: 10, soft: false, natural: false}}}));
  assert.deepEqual([first.phase, first.seats[3].hands[0].total, first.dealer!.total, first.actions], ['DEALING', 10, null, []]);
  const after = tableView(dealt, page());
  assert.deepEqual([after.phase, after.seats[3].hands[0].total, after.seats[3].turn, after.dealer!.total], ['TURN', 16, true, 7]);
  assert.ok(after.actions.includes('hit') && after.actions.includes('stand'));
});

test('opening deal at seat 6 from anchor 2.2: the game and the lab\'s round builder agree, and without those films it is today\'s chain', () => {
  const s = session('K♠ 10♣ 6♥ 7♦ 5♦'), dealt = run(s, {op: 'start', bets: [{seat: 6, main: 10}]}), table = tableCards(dealt);
  const steps = (beats: ReturnType<typeof planBeats>) => beats.map(b => `${b.step!.from}>${b.step!.to}`).join(' | ');
  assert.equal(steps(planBeats(table, [], dealt.events, () => false, () => true, {}, SEAT_HUB.paow, () => true)), formatSequence(roundSequence({seats: ['P6'], hubs: SEAT_HUB.paow})));
  assert.deepEqual(planBeats(table, [], dealt.events, () => false, () => true, {}, SEAT_HUB.paow, () => false), planBeats(table, [], dealt.events));
  assert.equal(formatSequence(roundSequence({seats: ['P6']})), steps(planBeats(table, [], dealt.events)));
});

test('a hit, the dealer\'s turn and the result: the view shows the engine\'s outcome and the paid balance', () => {
  const s = session('K♠ 10♣ 6♥ 7♦ 5♦'), dealt = run(s, {op: 'start', bets: [{seat: 4, main: 10}]});
  const hit = run(s, {op: 'act', seat: 4, handIndex: 0, action: 'hit', roundId: dealt.view.roundId, turnSeq: dealt.view.turnSeq});
  assert.equal(shownBy(hit.events.find(e => e.type === 'deal')!)!.total, 21);
  // 21 ends the hand: the dealer turns the hole card (17, stands) and the hand wins.
  const reveal = hit.events.find(e => e.type === 'reveal'), settle = hit.events.find(e => e.type === 'settle');
  assert.equal(shownBy(reveal!)!.total, 17);
  const paid = run(s, {op: 'collect', roundId: hit.view.roundId});
  assert.deepEqual([hit.balance, paid.balance], [990, 1010]);
  const done = tableView(hit, page({stage: 'SETTLED', balance: paid.balance, settled: settle as never, line: lineOf(hit.events)}));
  assert.deepEqual([done.phase, done.seats[3].hands[0].outcome, done.seats[3].hands[0].net, done.dealer!.total, done.balance], ['SETTLED', 'win', 10, 17, 1010]);
  assert.equal(cardRecords(tableCards(hit), cardFaces(hit)).find(x => x.shoeDraw === 3)!.r, '10', 'the turned card is open after the step');
});

test('a natural is marked by the engine, not by the overlay', () => {
  const s = session('A♠ 9♣ K♥ 7♦'), dealt = run(s, {op: 'start', bets: [{seat: 4, main: 10}]});
  const last = dealt.events.filter(e => e.type === 'deal' && e.to === 'seat').map(e => shownBy(e)!).pop()!;
  assert.deepEqual([last.natural, last.total], [true, 21]);
  assert.equal(tableView(dealt, page({busy: true, shown: {[last.key]: last}})).seats[3].hands[0].state, 'BLACKJACK');
});

// ── The engine's card is the card the presentation shows, from the signal to the card layer ──
const SUIT_NAME: Record<string, string> = {'♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs'};
// What the card layer prints for a card it has no record of (the lab's own card, scene state cardRank/cardSuit). A game card must never get it.
const LAB_CARD = {rank: 'Q', suit: 'clubs'} as const;
type Move = Extract<Snapshot['events'][number], {type: 'deal' | 'reveal'}>;

test('every card the engine deals is the one shown on its place: seeded rounds with splits, doubles, extra dealer cards and new shoes', () => {
  const s = createSession({balance: 1e7, shoe: {mode: 'seeded', seed: 'identity'}});
  const choice = createRng({mode: 'seeded', seed: 'identity-choices', allowDeterministic: true});
  const layout = createLayout(defaultPlan()), counts = {steps: 0, splits: 0, doubles: 0, dealerExtra: 0, shuffles: 0, moved: 0};
  for (let round = 0; round < 160; round++) {
    const seats = choice.drawWithoutReplacement([1, 2, 3, 4, 5, 6, 7], 1 + choice.int(0, 3));
    let res = run(s, {op: 'start', bets: seats.map(seat => ({seat, main: 10}))}), splitSeat: number | null = null;
    if (res.view.shuffled) counts.shuffles++;
    // As the page: no card lies when a round begins (next() empties the table), and the cards lie where the step's beats left them.
    let lying: number[] = [], hole: {shoeDraw: number; label: string} | null = null;
    const labels = new Map<number, string>();
    for (;;) {
      counts.steps++;
      const table = tableCards(res), records = cardRecords(table, cardFaces(res)), moves = res.events.filter(e => e.type === 'deal' || e.type === 'reveal') as Move[];
      const beats = planBeats(table, lying, res.events), own = beats.filter(b => b.kind === 'DEAL' || b.kind === 'PLACE' || b.kind === 'REVEAL');
      assert.deepEqual(own.map(b => b.own!.shoeDraw), moves.map(e => e.shoeDraw), 'one beat per card, in the engine\'s order');
      assert.deepEqual(planBeats(table, lying, res.events, () => true).filter(b => b.own).map(b => b.own!.shoeDraw), moves.map(e => e.shoeDraw), 'laid without a hand: the same cards in the same order');
      const revealAt = beats.findIndex(b => b.kind === 'REVEAL');
      moves.forEach((e, k) => {
        const beat = own[k], slot = slotOf(table, e.shoeDraw)!, label = slotLabel(slot), at = beats.indexOf(beat);
        assert.equal(beat.own!.label, label);
        if (e.type === 'deal' && e.to === 'seat') assert.deepEqual([slot.owner, slot.seat, slot.hand, slot.index], ['P', e.seat, e.hand, e.cardIndex], `${label}: the engine's seat, hand and place in the hand`);
        else assert.deepEqual([slot.owner, slot.index], ['D', e.cardIndex], `${label}: the dealer's card in its place`);
        const shown = cardFace(cardRecord(records, {shoeDraw: e.shoeDraw}), false, LAB_CARD);
        if (e.type === 'deal' && e.faceDown) {
          hole = {shoeDraw: e.shoeDraw, label};
          assert.equal(label, 'D.C1');
          // Turned in a later step: closed and without a value. Turned in this one (a dealer blackjack at the deal): open in the step's
          // records, which the film module closes for every part before the turn (the test below).
          if (revealAt < 0) assert.deepEqual([shown.back, cardRecord(records, {shoeDraw: e.shoeDraw})!.r], [true, null], 'the hole card lies closed, without a value');
        } else {
          assert.ok(shown.own && !shown.back, `${label}: the engine's card, not the lab's`);
          assert.deepEqual(shown.art, {rank: e.card!.r, suit: SUIT_NAME[e.card!.s]}, `${label}: the card the engine dealt`);
        }
        if (e.type === 'reveal') assert.deepEqual([e.shoeDraw, label], [hole!.shoeDraw, hole!.label], 'the turned card is the card dealt closed, on its place');
        if (e.type === 'deal' && e.to === 'dealer' && e.cardIndex >= 2) counts.dealerExtra++;
        // What the film's beat hands the card layer: its own card where the engine put it, the cards already lying, none still to come.
        const options = cardOptions(beat, table, records, layout) as {shoeDraw?: number; target?: string; placed: {shoeDraw: number; back: boolean}[]; cards: typeof records};
        if (beat.kind !== 'PLACE') assert.deepEqual([options.shoeDraw, options.target], [e.shoeDraw, label]);
        const before = new Set([...lying, ...own.slice(0, k).map(b => b.own!.shoeDraw)]);
        for (const p of options.placed) {
          assert.ok(before.has(p.shoeDraw) && p.shoeDraw !== e.shoeDraw, `${label}: draw ${p.shoeDraw} lies only once it was dealt`);
          const face = cardFace(cardRecord(options.cards, p), p.back, LAB_CARD);
          assert.ok(face.back || face.own, `draw ${p.shoeDraw}: never the lab's card`);
          if (p.shoeDraw === hole?.shoeDraw && (revealAt < 0 || at > revealAt)) assert.equal(face.back, revealAt < 0, 'the hole card lies closed until its turn and open after it');
        }
      });
      lying = lyingAfter(lying, beats);
      // After the step every card on the table lies on its place, and it keeps that place, except where its seat split.
      const onTable = [...table.hands.flatMap(h => h.cards), ...table.dealer];
      assert.deepEqual([...lying].sort((a, b) => a - b), [...onTable].sort((a, b) => a - b), 'what lies is what the engine has on the table');
      for (const draw of onTable) {
        const slot = slotOf(table, draw)!, label = slotLabel(slot), was = labels.get(draw);
        if (was !== undefined && was !== label) { assert.equal(slot.seat, splitSeat, `draw ${draw} moved from ${was} to ${label} without a split`); counts.moved++; }
        labels.set(draw, label);
      }
      const r = res.view.round!;
      if (r.phase === 'settled') break;
      if (r.phase === 'insurance') { splitSeat = null; res = run(s, {op: 'insurance', roundId: res.view.roundId, take: false}); continue; }
      const hand = r.hands[r.active], legal = res.legalActions;
      const action = legal.includes('split') && choice.int(0, 3) > 0 ? 'split' : legal.includes('double') && hand.total >= 9 && hand.total <= 11 ? 'double' : hand.total < 17 ? 'hit' : 'stand';
      if (action === 'split') counts.splits++;
      if (action === 'double') counts.doubles++;
      splitSeat = action === 'split' ? hand.seat : null;
      res = run(s, {op: 'act', seat: r.activeSeat, handIndex: r.active, action, roundId: res.view.roundId, turnSeq: res.view.turnSeq});
    }
    run(s, {op: 'collect', roundId: res.view.roundId});
  }
  for (const [name, count] of Object.entries(counts)) assert.ok(count > 0, `the run exercised ${name} (${count})`);
});

test('seats 1-7 map the same way from the engine to the film\'s place and Scout\'s filmed target; seat 1 lies at the camera\'s left', () => {
  const s = createSession({balance: 1e5, shoe: {mode: 'seeded', seed: 'seats'}}), plan = defaultPlan(), layout = createLayout(plan);
  const dealt = run(s, {op: 'start', bets: [1, 2, 3, 4, 5, 6, 7].map(seat => ({seat, main: 10}))}), table = tableCards(dealt);
  const deals = dealt.events.filter(e => e.type === 'deal' && e.to === 'seat') as Extract<Move, {type: 'deal'}>[];
  assert.equal(deals.length, 14);
  for (const e of deals) {
    const slot = slotOf(table, e.shoeDraw)!;
    assert.deepEqual([slot.seat, e.target, e.family!.split('/')[1], slotLabel(slot), slotFilm(slot) in plan.targets], [e.seat, String(e.seat), `box${e.seat! - 1}`, `P${e.seat}.C${e.cardIndex + 1}`, true], `seat ${e.seat}`);
  }
  const xs = [1, 2, 3, 4, 5, 6, 7].map(seat => layout.centre({owner: 'P', seat, hand: 0, hands: 1, index: 0}).x);
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b));
});

test('a total stays with its hand through a split, and a hand shows none until a card of its own has landed', () => {
  // Four eights to seat 4: 8♠ 8♥ split; the split-off 8♥ draws 8♣ and splits again (8♥ 2♠ and 8♣ 9♠, both stand); then 8♠ draws 8♦
  // and splits a third time (8♠ 3♥ and 8♦ K♠), which moves the two hands to its right one place along.
  const s = session('8♠ 10♣ 8♥ 6♦ 8♦ 8♣ 2♠ 9♠ 3♥ K♠ 4♣ 2♦'), steps: Snapshot[] = [run(s, {op: 'start', bets: [{seat: 4, main: 10}]})];
  const act = (action: string) => { const at = steps.at(-1)!, r = at.view.round!; steps.push(run(s, {op: 'act', seat: 4, handIndex: r.active, action, roundId: at.view.roundId, turnSeq: at.view.turnSeq})); };
  act('split'); act('split'); act('stand'); act('stand'); act('split');
  assert.deepEqual(steps.at(-1)!.view.round!.hands.map(h => h.cards.map(c => c.r + c.s).join(' ')), ['8♠ 3♥', '8♦ K♠', '8♥ 2♠', '8♣ 9♠']);
  // The page through every step: the totals it carries into the step, then each card landing in the film's order.
  let shown: Shown = {}, before: Snapshot = s.state();
  before = {...before, view: {...before.view, round: null}};
  for (const step of steps) {
    const state = page({busy: true, shown: shownFor(shown, before, step)});
    const lying = new Set([...tableCards(before).hands.flatMap(h => h.cards), ...tableCards(before).dealer]);
    const check = (when: string) => tableView(step, state).seats[3].hands.forEach((shownHand, i) => {
      const hand = step.view.round!.hands.filter(h => h.seat === 4)[i], landed = hand.cards.filter(c => lying.has(c.shoeDraw)) as Card[];
      if (shownHand.total !== null) assert.equal(shownHand.total, handValue(landed).total, `${when}, hand ${i} (${landed.map(c => c.r + c.s).join(' ')} landed): the total of its own cards`);
    });
    check(`before the film of step ${steps.indexOf(step)}`);
    for (const e of step.events) {
      const x = shownBy(e); if (!x) continue;
      if (e.type === 'deal' || e.type === 'reveal') lying.add(e.shoeDraw);
      state.shown = {...state.shown, [x.key]: x}; check(`step ${steps.indexOf(step)}, draw ${(e as Move).shoeDraw} landed`);
    }
    shown = state.shown; before = step;
  }
});

// The film module (src/game-film.ts) over a fake film queue that records what it is handed: Paow's films for seat 4 only (the dealer's
// cards are laid without a hand) and a rest film. step() plays one engine answer as the page does and returns the parts played.
type Part = {path: string; rest?: boolean; cards?: unknown};
function fixtureFilm(turned?: string) {
  const jobs = [['in', 'IDLE', 'READY', 'ENTRY'], ['deal', 'READY', 'P4.C1', 'DEAL'], ['back', 'P4.C1', 'READY', 'RETURN'], ['rest-4', 'P4.C1', 'IDLE', 'RETURN'], ['ut', 'READY', 'IDLE', 'RETURN'], ['vila', 'IDLE', 'IDLE', 'IDLE'],
    ...turned ? [['turn', 'IDLE', `REVEAL(${turned})`, 'REVEAL']] : []]
    .map(([id, from, to, kind]) => ({id, kind, target: kind === 'DEAL' ? to : kind === 'REVEAL' ? turned : null, from, to, model: 'wan3', duration: 4, ratio: 'auto_1080p', audio: false, promptText: 'fixture', first: {file: {path: 'assets/anchors/x/anchor.png', sha256: 'a'.repeat(64)}}, purpose: 'fixture', dealer: 'paow'}));
  const bank = {jobs, motions: Object.fromEntries(jobs.map(j => [j.id, {source: {fps: 30, frames: 120, sha256: 'a'.repeat(64)}, review: {decision: 'ACCEPTED'}, motion: j.id === 'vila' ? {idle: {calm: true, weight: 20}} : {physicalEndSide: 'FRONT'}}])),
    receipts: Object.fromEntries(jobs.map(j => [j.id, {status: 'SUCCEEDED'}])), media: Object.fromEntries(jobs.map(j => [j.id, {video: `assets/motions/${j.id}/source.mp4`}]))};
  const parts: Part[][] = []; let end: () => void = () => {};
  const players = {play(list: Part[], options: {onPart?(i: number): void; onEnd?(): void} = {}) { parts.push(list); end = () => options.onEnd?.(); list.forEach((_, i) => options.onPart?.(i)); }, hurry() {}, preload() {}};
  const film = createFilm(players, buildGraph(bank as never, {dealer: 'paow'}), createLayout(defaultPlan()), async () => null, () => 0);
  const step = async (snapshot: Snapshot): Promise<Part[]> => { const table = tableCards(snapshot), from = parts.length;
    const played = film.play(snapshot.events, {table, records: cardRecords(table, cardFaces(snapshot))}); await new Promise(r => setTimeout(r, 0)); end(); await played; await new Promise(r => setTimeout(r, 0));
    return parts.slice(from).flat(); };
  return {film, parts, step};
}

test('the hole card goes to the film closed, and only the step that turns it opens it, after its turn', async () => {
  // K♠ 6♥ against a closed 10♣ and an open 7♦; a hit draws 5♦ to 21, which ends the hand, so the same step turns the hole card (17) and settles.
  const {step} = fixtureFilm();
  const s = session('K♠ 10♣ 6♥ 7♦ 5♦'), dealt = run(s, {op: 'start', bets: [{seat: 4, main: 10}]}), holeDraw = dealt.view.round!.holeDraw!;
  const ten = (part: {cards?: unknown}) => { const c = part.cards as {cards: {shoeDraw: number; r: string | null; faceDown: boolean}[]; placed: {shoeDraw: number; back: boolean}[]};
    return {record: c.cards.find(r => r.shoeDraw === holeDraw), placed: c.placed.find(p => p.shoeDraw === holeDraw)}; };
  for (const part of await step(dealt)) { const {record} = ten(part); if (record) assert.deepEqual([record.r, record.faceDown], [null, true], `${part.path}: the hole card has no value in the deal`); }
  const hit = run(s, {op: 'act', seat: 4, handIndex: 0, action: 'hit', roundId: dealt.view.roundId, turnSeq: dealt.view.turnSeq});
  const played = await step(hit), chain = played.filter(p => !p.rest), after = played.filter(p => p.rest);
  assert.ok(chain.length > 0 && after.length > 0);
  for (const part of chain) {
    const {record, placed} = ten(part);
    assert.deepEqual([record!.r, record!.faceDown, placed!.back], [null, true, true], `${part.path}: before its turn the hole card is closed in the film's cards`);
    assert.ok(!JSON.stringify(part.cards).includes('"r":"10"'), `${part.path}: the ten is nowhere in what the film is handed`);
  }
  const open = ten(after[0]);
  assert.deepEqual([open.record!.r, open.record!.faceDown, open.placed!.back, open.placed!.shoeDraw], ['10', false, false, holeDraw], 'after its turn the same card lies open, on its place');
});

test('the closed card is D.C1, and a film that turns the card at D.C1 turns it when there is one (Jakob 2026-11-24)', async () => {
  // The same round as above, with no film for the turn, with one for D.C1, and with an older one made when the closed card lay at D.C2.
  const round = async (turned?: string) => {
    const {step} = fixtureFilm(turned), s = session('K♠ 10♣ 6♥ 7♦ 5♦'), dealt = run(s, {op: 'start', bets: [{seat: 4, main: 10}]});
    const lying = lyingAfter([], planBeats(tableCards(dealt), [], dealt.events)); await step(dealt);
    const hit = run(s, {op: 'act', seat: 4, handIndex: 0, action: 'hit', roundId: dealt.view.roundId, turnSeq: dealt.view.turnSeq});
    return {dealt, beat: planBeats(tableCards(hit), lying, hit.events).find(b => b.kind === 'REVEAL')!, chain: (await step(hit)).filter(p => !p.rest).map(p => p.path.split('/')[2])};
  };
  const none = await round();
  assert.equal(HOLE_CARD, 'D.C1'); assert.equal(tableCards(none.dealt).dealer.indexOf(none.dealt.view.round!.holeDraw!), 0, 'the engine lays her first card closed');
  assert.deepEqual([none.beat.own!.label, none.beat.step], ['D.C1', {from: 'IDLE', to: 'REVEAL(D.C1)'}], 'the turn asks for the film of the place where the closed card lies');
  assert.deepEqual(none.chain, ['in', 'deal', 'rest-4'], 'no film: the card is turned without a hand');
  assert.deepEqual((await round('D.C1')).chain, ['in', 'deal', 'rest-4', 'turn'], 'a film for D.C1 turns it');
  assert.deepEqual((await round('D.C2')).chain, ['in', 'deal', 'rest-4'], 'a film that turns the card at D.C2 is never played as the turn of D.C1');
});

// ── What the page may ask the engine, and when (src/game-page.ts controls, mayAsk) ──
const ASKS: Ask[] = ['bet', 'take', 'undo', 'clear', 'rebet', 'deal', 'hit', 'stand', 'double', 'split', 'insurance', 'next'];
const allowed = (snapshot: Snapshot, state: PageState) => ASKS.filter(ask => mayAsk(snapshot, state, ask));

test('a control does only what the overlay offers in that phase, however it is reached (a late press, the recorder\'s window.game.controls)', () => {
  const s = session('K♠ 10♣ 6♥ 7♦ 5♦'), idle = s.state(), laid = {4: [25]};
  assert.deepEqual(allowed(idle, page({stage: 'BETTING', bets: laid, last: laid})), ['bet', 'take', 'undo', 'clear', 'deal'], 'betting, chips laid');
  assert.deepEqual(allowed(idle, page({stage: 'BETTING', busy: true, bets: laid, last: laid})), [], 'the deal is sent and its answer awaited: the chips stay as they were sent');
  const dealt = run(s, {op: 'start', bets: [{seat: 4, main: 25}]});
  assert.deepEqual(allowed(dealt, page({busy: true, bets: laid, last: laid})), [], 'the film plays the deal: nothing');
  assert.deepEqual(allowed(dealt, page({bets: laid, last: laid})), ['hit', 'stand', 'double'], 'her turn: the legal actions only');
  const settled = run(s, {op: 'act', seat: 4, handIndex: 0, action: 'stand', roundId: dealt.view.roundId, turnSeq: dealt.view.turnSeq});
  // The page leaves the round's bets laid until Ny runda, so a deal from here would start a round with them.
  assert.deepEqual(allowed(settled, page({stage: 'SETTLED', bets: laid, last: laid})), ['next'], 'settled: only Ny runda');
  const offered = run(session('10♠ 6♣ 9♥ A♦'), {op: 'start', bets: [{seat: 4, main: 10}]});
  assert.deepEqual(allowed(offered, page({bets: {4: [10]}, last: {4: [10]}})), ['insurance'], 'insurance offered: only its answer');
});

test('a reload lays every card where it lay, the hole card closed, and offers the controls of the phase the engine is in', async () => {
  // Seat 4: 10♠ 9♥ (19) against a closed 6♣ and an open A♦: insurance is offered, declined, the hand stands and wins.
  const s = session('10♠ 6♣ 9♥ A♦ 5♦');
  const reload = (snapshot: Snapshot) => ({stage: stageOf(snapshot), asks: allowed(snapshot, page({stage: stageOf(snapshot), balance: snapshot.balance}))});
  const offered = run(s, {op: 'start', bets: [{seat: 4, main: 10}]});
  assert.deepEqual(reload(s.state()), {stage: 'ROUND', asks: ['insurance']});
  const turn = run(s, {op: 'insurance', roundId: offered.view.roundId, take: false});
  assert.deepEqual(reload(s.state()), {stage: 'ROUND', asks: ['hit', 'stand', 'double']});
  const {film, parts} = fixtureFilm(), opened = s.state(), table = tableCards(opened);
  film.set({table, records: cardRecords(table, cardFaces(opened)), lying: [...table.hands.flatMap(h => h.cards), ...table.dealer]});
  await new Promise(r => setTimeout(r, 0));
  const laid = (parts.at(-1)![0].cards as {placed: {shoeDraw: number; back: boolean; target: string}[]; cards: {shoeDraw: number; r: string | null; s: string | null}[]});
  const face = (n: number) => { const c = laid.cards.find(x => x.shoeDraw === n)!; return c.r === null ? 'closed' : `${c.r} ${c.s}`; };
  assert.deepEqual(laid.placed.map(p => [p.target, p.back, face(p.shoeDraw)]), [['P4.C1', false, '10 spades'], ['P4.C2', false, '9 hearts'], ['D.C1', true, 'closed'], ['D.C2', false, 'A diamonds']]);
  run(s, {op: 'act', seat: 4, handIndex: 0, action: 'stand', roundId: turn.view.roundId, turnSeq: turn.view.turnSeq});
  assert.deepEqual(reload(s.state()), {stage: 'SETTLED', asks: ['next']}, 'settled, not yet collected: only Ny runda, which collects');
});

test('the round is collected once, however often the page asks, and a collect whose answer was lost is asked for again', async () => {
  const s = session('10♠ 10♣ 9♥ 7♦'), refused: string[] = [];
  let held: Snapshot = s.state(), n = 0, fail = 0;
  // The page's send (src/game-page.ts): the body is written as the press is made (a new requestId, the version the page holds), the
  // engine answers a moment later; a refusal is shown and the press answered with null.
  const send = (command: Record<string, unknown>) => { const body = {...command, requestId: `c${++n}`, expectedVersion: held.ver};
    return new Promise<Snapshot | null>(resolve => setTimeout(() => { try { resolve(s.command(body)); } catch (error) { refused.push((error as {code: string}).code); resolve(null); } }, 0)); };
  held = (await send({op: 'start', bets: [{seat: 4, main: 10}]}))!;
  held = (await send({op: 'act', seat: 4, handIndex: 0, action: 'stand', roundId: held.view.roundId, turnSeq: held.view.turnSeq}))!;
  const collect = collector(send), roundId = held.view.roundId;
  const [settledAsk, nextAsk] = await Promise.all([collect(roundId), collect(roundId)]);
  assert.deepEqual(refused, [], 'no refusal to show');
  assert.equal(settledAsk?.balance, 1010); assert.deepEqual(nextAsk, settledAsk, 'Ny runda gets the paid round');
  assert.deepEqual(s.ledger().map(e => e.op), ['start', 'act', 'collect'], 'collected once');
  const t = session('10♠ 10♣ 9♥ 7♦'); held = t.state();
  const on = (cmd: Record<string, unknown>) => { held = t.command({...cmd, requestId: `t${++n}`, expectedVersion: held.ver}); return held; };
  on({op: 'start', bets: [{seat: 4, main: 10}]}); on({op: 'act', seat: 4, handIndex: 0, action: 'stand', roundId: held.view.roundId, turnSeq: held.view.turnSeq});
  const again = collector(cmd => { if (fail-- > 0) return Promise.resolve(null); return Promise.resolve(t.command({...cmd, requestId: `t${++n}`, expectedVersion: held.ver})); });
  fail = 1; assert.equal(await again(held.view.roundId), null, 'the answer is lost'); fail = 0;
  assert.equal((await again(held.view.roundId))?.balance, 1010, 'asked again, paid');
});
