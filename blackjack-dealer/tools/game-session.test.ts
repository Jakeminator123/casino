// Skyddar: spelets regler – pengarna i varje utfall, inget dubbelt, hålkortet dolt till vändningen, skon offentlig.
// Session tests for game/session.ts: money over every outcome, idempotency and stale commands, typed refusals, the shoe
// source and its seed, totals on the events, and that the hole card cannot be read or derived before its reveal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, SessionError } from '../game/session.ts';
import type { Session, SessionOptions, Snapshot } from '../game/session.ts';
import { handValue } from '../game/round.ts';
import type { Card } from '../game/round.ts';
import type { SeatDealEvent } from '../game/seats.ts';

const C = (text: string) => ({ r: text.slice(0, -1), s: text.slice(-1) });
const stacked = (cards: string, extra: SessionOptions = {}) => createSession({ shoe: { mode: 'stacked', seed: 'session', cards: cards.split(' ').map(C) }, ...extra });
const err = (code: string, status?: number) => (error: unknown) => error instanceof SessionError && error.code === code && (status === undefined || error.status === status);

function drive(s: Session) {
  let n = 0;
  const send = (cmd: Record<string, unknown>) => s.command({ ...cmd, requestId: `r${++n}`, expectedVersion: s.state().ver });
  return {
    send,
    start: (bets: Array<{ seat: number; main: number; pp?: number; tp?: number }>) => send({ op: 'start', bets }),
    act: (action: string) => { const v = s.state().view, r = v.round!; return send({ op: 'act', action, seat: r.activeSeat, handIndex: r.active, roundId: v.roundId, turnSeq: v.turnSeq }); },
    insurance: (x: Record<string, unknown>) => send({ op: 'insurance', roundId: s.state().view.roundId, ...x }),
    collect: () => send({ op: 'collect', roundId: s.state().view.roundId }),
  };
}
const settleOf = (r: Snapshot) => r.events.find(e => e.type === 'settle') as Extract<Snapshot['events'][number], { type: 'settle' }> | undefined;

// Every object in a result that carries the hole card's identity: its serial, or a rank at its shoe position.
function holeLeaks(value: unknown, hole: { serial: number; shoeDraw: number }): string[] {
  const found: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
    if (!v || typeof v !== 'object') return;
    const o = v as Record<string, unknown>;
    if (o.serial === hole.serial) found.push(`${path} has the hole serial`);
    if (o.shoeDraw === hole.shoeDraw && (o.r != null || (o.card != null && typeof o.card === 'object'))) found.push(`${path} shows a rank at the hole position`);
    for (const [k, x] of Object.entries(o)) walk(x, `${path}.${k}`);
  };
  walk(value, '$');
  return found;
}

test('defaults: balance 1000, Scout limits 5/2000/2000, a secure shoe, no round', () => {
  const state = createSession().state();
  assert.deepEqual([state.ver, state.balance, state.limits, state.view.shoe!.source, state.view.round, state.legalActions], [0, 1000, { min: 5, max: 2000, sideMax: 2000 }, 'secure', null, []]);
});

test('money: win, lose, push, blackjack 3:2 (half chips too) and bust; the stake leaves at the deal', () => {
  const round = (cards: string, actions: string[], main = 10) => {
    const d = drive(stacked(cards));
    let last = d.start([{ seat: 4, main }]);
    assert.equal(last.balance, 1000 - main);
    for (const a of actions) last = d.act(a);
    return [settleOf(last)?.hands[0].outcome, d.collect().balance];
  };
  assert.deepEqual(round('10♠ 10♣ 9♥ 7♦', ['stand']), ['win', 1010]);
  assert.deepEqual(round('10♠ 9♣ 7♥ 10♦', ['stand']), ['lose', 990]);
  assert.deepEqual(round('10♠ 8♣ 8♥ 10♦', ['stand']), ['push', 1000]);
  assert.deepEqual(round('A♠ 8♣ K♥ 9♦', []), ['blackjack', 1015]);
  assert.deepEqual(round('A♠ 8♣ K♥ 9♦', [], 5), ['blackjack', 1007.5]);
  assert.deepEqual(round('10♠ 10♣ 6♥ 7♦ K♠', ['hit']), ['lose', 990]);
});

test('money: insurance on an ace, taken or declined, against a dealer blackjack or not, per seat', () => {
  const run = (cards: string, take: boolean, then: string[] = []) => {
    const d = drive(stacked(cards));
    assert.equal(d.start([{ seat: 4, main: 10 }]).view.round!.phase, 'insurance');
    let r = d.insurance({ take });
    if (take) assert.equal(r.balance, 985);
    for (const a of then) r = d.act(a);
    return { phase: r.view.round!.phase, balance: d.collect().balance };
  };
  assert.deepEqual(run('10♠ K♣ 9♥ A♦', true), { phase: 'settled', balance: 1000 }, 'insurance 5 returns 15, the main bet is lost');
  assert.deepEqual(run('10♠ K♣ 9♥ A♦', false), { phase: 'settled', balance: 990 });
  assert.deepEqual(run('10♠ 6♣ 9♥ A♦', true, ['stand']), { phase: 'settled', balance: 1005 }, 'insurance lost, 19 beats soft 17');
  const s = stacked('10♠ 10♥ 6♣ 9♠ 9♥ A♦'), d = drive(s);
  d.start([{ seat: 2, main: 10 }, { seat: 6, main: 20 }]);
  const r = d.insurance({ seats: [6] });
  assert.equal(r.balance, 1000 - 30 - 10);
  assert.deepEqual(r.view.round!.hands.map(h => [h.seat, h.insured]), [[2, 0], [6, 10]]);
});

test('a ten up-card is peeked: a dealer blackjack settles at the deal without insurance', () => {
  const r = drive(stacked('10♠ A♣ 9♥ K♦')).start([{ seat: 1, main: 10 }]);
  assert.deepEqual([r.view.round!.phase, settleOf(r)!.hands[0].outcome], ['settled', 'lose']);
});

test('a natural is a first-two-cards 21 only: not a split 21 or a three-card 21; the dealer\'s shows at the reveal', () => {
  const deals = (r: Snapshot) => r.events.filter(e => e.type === 'deal') as SeatDealEvent[];
  const reveal = (r: Snapshot) => r.events.find(e => e.type === 'reveal') as Extract<Snapshot['events'][number], { type: 'reveal' }>;
  let r = drive(stacked('A♠ 8♣ K♥ 9♦')).start([{ seat: 4, main: 10 }]);
  assert.deepEqual([r.view.round!.hands[0].natural, reveal(r).blackjack, settleOf(r)!.hands[0].outcome], [true, false, 'blackjack']);
  // Split aces that each draw a ten: two-card 21s, never naturals, paid 1:1.
  const d = drive(stacked('A♠ 10♣ A♥ 6♦ K♦ Q♣ 9♠'));
  d.start([{ seat: 4, main: 10 }]);
  r = d.act('split');
  assert.deepEqual(r.view.round!.hands.map(h => [h.total, h.natural]), [[21, false], [21, false]]);
  assert.deepEqual(settleOf(r)!.hands.map(h => h.outcome), ['win', 'win']);
  const three = drive(stacked('5♠ 8♣ 6♥ 9♦ K♠'));
  three.start([{ seat: 2, main: 10 }]);
  const hit = deals(three.act('hit'))[0];
  assert.deepEqual([hit.total, hit.natural], [21, false]);
  // Dealer blackjack: flagged on the reveal only, never on the hidden deal; the player's natural pushes.
  r = drive(stacked('A♠ A♣ K♥ K♦')).start([{ seat: 4, main: 10 }]);
  assert.deepEqual(deals(r).filter(e => e.to === 'dealer').map(e => [e.faceDown, e.total, e.natural]), [[true, 0, false], [false, 10, false]]);
  assert.deepEqual([reveal(r).blackjack, reveal(r).total, settleOf(r)!.hands[0].outcome], [true, 21, 'push']);
});

test('idempotency: the same requestId and input return the same result once; another input is refused', () => {
  const s = stacked('10♠ 10♣ 9♥ 7♦');
  const start = { op: 'start', bets: [{ seat: 4, main: 10 }], requestId: 'start-1', expectedVersion: 0 };
  const first = s.command(start);
  assert.deepEqual(s.command(structuredClone(start)), first, 'a lost response is safe to resend');
  assert.deepEqual(s.command({ expectedVersion: 0, requestId: 'start-1', bets: [{ main: 10, seat: 4 }], op: 'start' }), first, 'key order does not matter');
  assert.deepEqual([s.state().ver, s.ledger().length, s.state().balance], [1, 1, 990], 'charged once');
  assert.throws(() => s.command({ ...start, bets: [{ seat: 4, main: 20 }] }), err('REQUEST_REUSED', 409));
  const v = s.state().view;
  s.command({ op: 'act', seat: 4, handIndex: 0, action: 'stand', roundId: v.roundId, turnSeq: v.turnSeq, requestId: 'stand-1', expectedVersion: 1 });
  assert.deepEqual(s.command(start), first, 'an old command still replays its stored result after later commands');
  assert.equal(s.state().ver, 2);
});

test('stale expectedVersion (a double click) and stale turn are typed 409 errors that change nothing; no surrender', () => {
  const s = stacked('10♠ 10♣ 9♥ 7♦'), d = drive(s);
  d.start([{ seat: 4, main: 10 }]);
  const before = s.state(), v = before.view;
  assert.throws(() => s.command({ op: 'act', seat: 4, handIndex: 0, action: 'stand', roundId: v.roundId, turnSeq: v.turnSeq, requestId: 'x1', expectedVersion: 0 }), err('STALE_VERSION', 409));
  assert.throws(() => s.command({ op: 'act', seat: 4, handIndex: 0, action: 'stand', roundId: v.roundId, turnSeq: v.turnSeq - 1, requestId: 'x2', expectedVersion: 1 }), err('STALE_COMMAND', 409));
  assert.throws(() => s.command({ op: 'act', seat: 3, handIndex: 0, action: 'stand', roundId: v.roundId, turnSeq: v.turnSeq, requestId: 'x3', expectedVersion: 1 }), err('STALE_COMMAND', 409), 'wrong seat');
  assert.throws(() => s.command({ op: 'act', seat: 4, handIndex: 0, action: 'surrender', roundId: v.roundId, turnSeq: v.turnSeq, requestId: 'x4', expectedVersion: 1 }), err('ILLEGAL_ACTION', 422), 'no surrender, as in Scout');
  assert.deepEqual(s.state(), before);
});

test('typed errors for malformed commands, seats, stakes, balance and shoes, without using randomness', () => {
  const s = createSession({ balance: 20, shoe: { mode: 'seeded', seed: 'errors' } }), d = drive(s);
  assert.throws(() => s.command(null), err('INVALID_COMMAND', 400));
  assert.throws(() => s.command({ op: 'start', expectedVersion: 0 }), err('REQUEST_ID_REQUIRED', 400));
  assert.throws(() => d.send({ op: 'deal' }), err('UNKNOWN_COMMAND', 400));
  for (const seat of [0, 8, 1.5, '3']) assert.throws(() => d.start([{ seat: seat as number, main: 10 }]), err('INVALID_SEAT', 422));
  assert.throws(() => d.start([{ seat: 2, main: 5 }, { seat: 2, main: 5 }]), err('INVALID_SEAT'));
  assert.throws(() => d.start([{ seat: 2, main: 4 }]), err('INVALID_STAKE', 422), 'below Scout minimum 5');
  assert.throws(() => d.start([{ seat: 2, main: 5.5 }]), err('INVALID_STAKE'), 'whole chips');
  assert.throws(() => d.start([{ seat: 2, main: 25 }]), err('INSUFFICIENT_BALANCE', 422));
  assert.throws(() => d.collect(), err('NO_ACTIVE_ROUND', 409));
  assert.equal(s.state().ver, 0);
  // Refused commands drew nothing: the first accepted round deals what a fresh session with the same seed deals.
  const fresh = drive(createSession({ balance: 20, shoe: { mode: 'seeded', seed: 'errors' } })).start([{ seat: 2, main: 10 }]);
  assert.deepEqual(d.start([{ seat: 2, main: 10 }]).view.round!.hands, fresh.view.round!.hands);
  assert.throws(() => createSession({ limits: { min: 100, max: 10 } }), err('INVALID_CONFIG', 400));
  assert.throws(() => createSession({ shoe: { mode: 'stacked', seed: 'x', cards: [{ r: 'Z', s: '♠' }] } }), err('INVALID_SHOE', 400));
  assert.throws(() => createSession({ shoe: { mode: 'magic' } as unknown as SessionOptions['shoe'] }), err('INVALID_SHOE', 400));
});

test('double, split and insurance are refused when the balance cannot cover them', () => {
  let d = drive(stacked('6♠ 7♣ 5♥ 9♦ 10♦', { balance: 15 }));
  d.start([{ seat: 4, main: 10 }]);
  assert.throws(() => d.act('double'), err('INSUFFICIENT_BALANCE', 422));
  d = drive(stacked('10♠ 6♣ 9♥ A♦', { balance: 12 }));
  d.start([{ seat: 4, main: 10 }]);
  assert.throws(() => d.insurance({ take: true }), err('INSUFFICIENT_BALANCE'));
  assert.throws(() => d.insurance({ take: true, seats: [4] }), err('INVALID_COMMAND', 400));
  assert.equal(d.insurance({ take: false }).view.round!.phase, 'decisions');
});

test('side bets: accepted per seat, default 0, settled at the deal', () => {
  const r = drive(stacked('8♥ 9♠ 8♦ 8♣')).start([{ seat: 3, main: 10, pp: 5, tp: 5 }]);
  const seat = r.view.round!.seats.find(x => x.seat === 3)!;
  assert.deepEqual([r.balance, seat.sideLabels, seat.sideReturn], [980, ['Colored Pair 12:1', 'Three of a Kind 30:1'], 220]);
  const plain = drive(stacked('10♠ 10♣ 9♥ 7♦')).start([{ seat: 3, main: 10 }]);
  assert.deepEqual([plain.view.round!.hands[0].pp, plain.view.round!.hands[0].tp, plain.balance], [0, 0, 990]);
});

test('shoe source is public: secure, seeded, or stacked (lab only), and later shoes of a stacked session are seeded', () => {
  assert.equal(createSession({ shoe: { mode: 'seeded', seed: 'a' } }).state().view.shoe!.source, 'seeded');
  const s = stacked('10♠ 10♣ 9♥ 7♦', { balance: 1e6 }), d = drive(s);
  assert.equal(s.state().view.shoe!.source, 'stacked');
  const first = s.state().view.shoe!.id;
  for (let i = 0; i < 200 && s.state().view.shoe!.id === first; i++) {
    d.start([{ seat: 1, main: 5 }]);
    while (s.state().view.round!.phase === 'insurance') d.insurance({ take: false });
    while (s.state().view.round!.phase === 'decisions') d.act('stand');
    d.collect();
  }
  assert.notEqual(s.state().view.shoe!.id, first);
  assert.equal(s.state().view.shoe!.source, 'seeded');
});

test('seeded sessions are reproducible command for command', () => {
  const run = () => {
    const s = createSession({ shoe: { mode: 'seeded', seed: 'repro' } }), d = drive(s), out = [];
    for (let i = 0; i < 5; i++) {
      out.push(d.start([{ seat: 2, main: 10 }, { seat: 5, main: 15 }]));
      while (s.state().view.round!.phase === 'insurance') out.push(d.insurance({ take: false }));
      while (s.state().view.round!.phase === 'decisions') out.push(d.act(s.state().view.round!.hands[s.state().view.round!.active].total < 15 ? 'hit' : 'stand'));
      out.push(d.collect());
    }
    return out;
  };
  assert.deepEqual(run(), run());
});

// Seat 4 is dealt 8♠ 8♥ and splits, seat 2 holds 10♦ 6♣, the dealer's closed first card and 6♦ open beside it; seat 4's
// split-off hand hits to 19 and stands, the first hand doubles to 21, seat 2 hits to 20 and stands, the dealer turns 16
// (or 15) and draws a 2.
const script = (hole: string) => `8♠ 10♦ ${hole} 8♥ 6♣ 6♦ 3♦ 2♣ 9♠ K♥ 4♥ 2♦`;
function playScript(hole: string) {
  const s = stacked(script(hole)), d = drive(s);
  const steps: Array<{ op: string; before: Snapshot; result: Snapshot }> = [];
  const run = (op: string, fn: () => Snapshot) => { const before = s.state(); steps.push({ op, before, result: fn() }); };
  run('start', () => d.start([{ seat: 2, main: 10 }, { seat: 4, main: 10 }]));
  run('split', () => d.act('split'));
  run('hit', () => d.act('hit'));
  run('stand', () => d.act('stand'));
  run('double', () => d.act('double'));
  run('hit', () => d.act('hit'));
  run('stand', () => d.act('stand'));
  return steps;
}

test('deal and reveal events carry the visible total and place of the card, checked against an independent card model', () => {
  const steps = playScript('10♣'), model = new Map<number, Card[][]>(), dealer: Card[] = [];
  const value = (cards: Card[]) => { const { total, soft } = handValue(cards); return { total, soft }; };
  let revealed = false;
  for (const { op, before, result } of steps) {
    if (op === 'split') {
      // The acting hand's second card moves to a new hand right after it; no event carries that move.
      const acting = before.view.round!.hands[before.view.round!.active], hands = model.get(acting.seat)!;
      hands.splice(acting.hand + 1, 0, [hands[acting.hand].pop()!]);
    }
    for (const e of result.events) {
      if (e.type === 'deal' && e.to === 'seat') {
        const hands = model.get(e.seat!) ?? []; model.set(e.seat!, hands);
        (hands[e.hand!] ??= []).push(e.card as Card);
        assert.deepEqual({ total: e.total, soft: e.soft }, value(hands[e.hand!]), `seat ${e.seat} hand ${e.hand} after draw ${e.shoeDraw}`);
        assert.equal(e.cardIndex, hands[e.hand!].length - 1);
      } else if (e.type === 'deal') {
        assert.ok(!e.faceDown || !revealed);
        if (!e.faceDown) dealer.push(e.card as Card);
        assert.deepEqual({ total: e.total, soft: e.soft }, value(dealer), `dealer after draw ${e.shoeDraw}: before the reveal the up-card alone`);
        assert.equal(e.cardIndex, e.faceDown ? 0 : revealed ? dealer.length - 1 : dealer.length, 'the hole card is her first card, the up-card her second');
      } else if (e.type === 'reveal') {
        dealer.unshift(e.card as Card); revealed = true;
        assert.deepEqual({ total: e.total, soft: e.soft, cardIndex: e.cardIndex }, { ...value(dealer), cardIndex: 0 });
      }
    }
  }
  const last = steps.at(-1)!.result.view.round!;
  assert.deepEqual([revealed, last.phase, dealer.map(c => c.r + c.s), last.dealerTotal], [true, 'settled', ['10♣', '6♦', '2♦'], 18]);
  for (const h of last.hands) assert.equal(h.total, handValue(h.cards as Card[]).total);
});

test('before the reveal nothing returned depends on the hole card: two shoes that differ only there give identical results', () => {
  const a = playScript('10♣'), b = playScript('9♣');
  const strip = (r: Snapshot) => { const copy = structuredClone(r); if (copy.view.shoe) copy.view.shoe.commitment = null; return copy; };
  const revealAt = a.findIndex(x => x.result.events.some(e => e.type === 'reveal'));
  assert.equal(revealAt, a.length - 1);
  assert.equal(b.findIndex(x => x.result.events.some(e => e.type === 'reveal')), revealAt);
  for (let i = 0; i < revealAt; i++) assert.deepEqual(strip(b[i].result), strip(a[i].result), `step ${i} (${a[i].op}) is the same whatever the hole card`);
  assert.notDeepEqual(strip(b[revealAt].result), strip(a[revealAt].result), 'the reveal itself differs');
});

test('the hole card (serial, or a rank at its shoe position) is in no result before its reveal', () => {
  for (const [cards, actions] of [['10♠ 10♣ 2♥ 7♦ 5♠', ['hit', 'stand']], ['10♠ 6♣ 9♥ A♦', ['ins', 'stand']], ['10♠ A♣ 9♥ K♦', []]] as Array<[string, string[]]>) {
    const s = stacked(cards), d = drive(s), results = [s.state(), d.start([{ seat: 4, main: 10 }])];
    for (const a of actions) results.push(a === 'ins' ? d.insurance({ take: true }) : d.act(a));
    const settled = results.at(-1)!.view.round!, holeDraw = settled.holeDraw!;
    const hole = settled.dealer.find(c => c.shoeDraw === holeDraw)!;
    assert.ok(hole, 'the settled view shows the hole card');
    const revealAt = results.findIndex(r => r.events.some(e => e.type === 'reveal'));
    assert.ok(revealAt > 0);
    for (let i = 0; i < revealAt; i++) assert.deepEqual(holeLeaks(results[i], hole), [], `${cards}: result ${i}`);
    assert.ok(holeLeaks(results[revealAt], hole).length > 0, 'the scanner does find the card once it is revealed');
  }
});

// ── A whole round as the page plays it (src/game-page.ts: one command per press, a new requestId each time, the version of
// the answer it holds), and the page's mistakes: a press in the wrong phase, a reload in the middle. ──

// Seat 6 is dealt 8♠ 8♥ and splits; its first hand draws 3♣ and doubles to 21 with K♦, the split-off hand draws 10♥ (18) and
// stands. Seat 2 holds 6♦ 5♠ and doubles to 20 with 9♥. The dealer's closed first card is 7♦, 9♣ lies open, and she draws 2♣ to 18.
const ROUND = '8♠ 6♦ 7♦ 8♥ 5♠ 9♣ 3♣ 10♥ K♦ 9♥ 2♣';
const page = (s: Session) => {
  let n = 0, held: Snapshot = s.state();
  const press = (cmd: Record<string, unknown>, from: Snapshot = held) => { held = s.command({ ...cmd, requestId: `press-${++n}`, expectedVersion: from.ver }); return held; };
  const act = (action: string, from: Snapshot = held) => press({ op: 'act', action, seat: from.view.round!.activeSeat, handIndex: from.view.round!.active, roundId: from.view.roundId, turnSeq: from.view.turnSeq }, from);
  return { press, act, reload() { held = s.state(); return held; } };
};

test('one whole round: the deal order, a split, double after split, the dealer\'s turn, one settlement, paid once', () => {
  const s = stacked(ROUND), p = page(s);
  const dealt = p.press({ op: 'start', bets: [{ seat: 2, main: 10 }, { seat: 6, main: 10 }] });
  assert.equal(dealt.balance, 980);
  assert.deepEqual((dealt.events.filter(e => e.type === 'deal') as SeatDealEvent[]).map(e => [e.target, e.card && e.card.r + e.card.s]),
    [['6', '8♠'], ['2', '6♦'], ['hole', null], ['6', '8♥'], ['2', '5♠'], ['dealer', '9♣']], 'seat 6 first, the first card of the dealer closed');
  assert.deepEqual(dealt.legalActions, ['hit', 'stand', 'double', 'split']);
  const split = p.act('split');
  assert.equal(split.balance, 970, 'the split costs one more stake');
  assert.deepEqual(split.view.round!.hands.map(h => [h.seat, h.hand, h.cards.map(c => c.r + c.s)]), [[2, 0, ['6♦', '5♠']], [6, 0, ['8♠', '3♣']], [6, 1, ['8♥', '10♥']]]);
  assert.deepEqual([split.view.round!.activeSeat, split.view.round!.active], [6, 2], 'the split-off hand plays first');
  assert.deepEqual(p.act('stand').legalActions, ['hit', 'stand', 'double'], 'double after split, no re-split of 8♠ 3♣');
  assert.equal(p.act('double').balance, 960);
  const last = p.act('double'), types = last.events.map(e => e.type);
  assert.equal(last.balance, 950, 'every stake, split and double debited, nothing paid yet');
  assert.ok(types.indexOf('reveal') < types.lastIndexOf('deal') && types.lastIndexOf('deal') < types.indexOf('settle'), 'the reveal before the dealer\'s draw, then the settlement');
  assert.deepEqual(settleOf(last)!.hands.map(h => [h.seat, h.handIndex, h.stake, h.returned, h.outcome]), [[2, 0, 20, 40, 'win'], [6, 1, 20, 40, 'win'], [6, 2, 10, 10, 'push']]);
  assert.equal(last.view.round!.dealerTotal, 18);
  const paid = p.press({ op: 'collect', roundId: last.view.roundId });
  assert.deepEqual([paid.view.round, paid.balance], [null, 1040], '950 + 40 + 40 + 10, paid once at collect');
  assert.deepEqual(s.ledger().map(e => [e.op, e.debit, e.credit]), [['start', 20, 0], ['act', 10, 0], ['act', 0, 0], ['act', 10, 0], ['act', 10, 0], ['collect', 0, 90]]);
  assert.throws(() => p.press({ op: 'collect', roundId: last.view.roundId }), err('NO_ACTIVE_ROUND', 409));
  assert.deepEqual([s.state().balance, s.ledger().length], [1040, 6]);
});

test('a press in the wrong phase is a clear no that changes nothing', () => {
  const now = (s: Session) => ({ ...s.state(), ledger: s.ledger().length });
  let n = 0;
  const refused = (s: Session, cmd: Record<string, unknown>, code: string) => {
    const before = now(s);
    assert.throws(() => s.command({ ...cmd, requestId: `wrong-${++n}`, expectedVersion: before.ver }), err(code), `${cmd.op} ${cmd.action ?? ''}`);
    assert.deepEqual(now(s), before, `${cmd.op}: nothing changed, no card drawn`);
  };
  // Insurance offered (an ace up): no action, no collect, no new round; then no insurance twice, no split of unlike cards.
  let s = stacked('10♠ 6♣ 9♥ A♦'); let d = drive(s); d.start([{ seat: 4, main: 10 }]);
  let v = s.state().view;
  refused(s, { op: 'act', action: 'hit', seat: 4, handIndex: 0, roundId: v.roundId, turnSeq: v.turnSeq }, 'ILLEGAL_ACTION');
  refused(s, { op: 'collect', roundId: v.roundId }, 'ROUND_NOT_SETTLED');
  refused(s, { op: 'start', bets: [{ seat: 4, main: 10 }] }, 'ROUND_IN_PROGRESS');
  d.insurance({ take: false }); v = s.state().view;
  refused(s, { op: 'insurance', roundId: v.roundId, take: true }, 'INSURANCE_UNAVAILABLE');
  refused(s, { op: 'act', action: 'split', seat: 4, handIndex: 0, roundId: v.roundId, turnSeq: v.turnSeq }, 'ILLEGAL_ACTION');
  // Settled, not yet collected: no action, no new round; collected: nothing but a new round.
  s = stacked('10♠ 10♣ 9♥ 7♦'); d = drive(s); d.start([{ seat: 4, main: 10 }]); d.act('stand'); v = s.state().view;
  refused(s, { op: 'act', action: 'hit', seat: 4, handIndex: 0, roundId: v.roundId, turnSeq: v.turnSeq }, 'ILLEGAL_ACTION');
  refused(s, { op: 'start', bets: [{ seat: 4, main: 10 }] }, 'ROUND_IN_PROGRESS');
  d.collect();
  refused(s, { op: 'collect', roundId: v.roundId }, 'NO_ACTIVE_ROUND');
  refused(s, { op: 'insurance', roundId: v.roundId, take: false }, 'NO_ACTIVE_ROUND');
  assert.equal(s.state().balance, 1010, 'the one round was paid once');
});

test('a reload in the middle of a round reads the engine\'s state and plays on; nothing is charged or paid twice', () => {
  const s = stacked(ROUND), p = page(s);
  const dealt = p.press({ op: 'start', bets: [{ seat: 2, main: 10 }, { seat: 6, main: 10 }] });
  const split = p.act('split');
  const read = p.reload();
  assert.deepEqual(read, { ...split, events: [] }, 'a reload reads what the last answer said, without its signals');
  assert.equal(read.view.round!.dealer.length, 1, 'the hole card is still closed after the reload');
  assert.throws(() => p.act('stand', dealt), err('STALE_VERSION', 409), 'a request from before the reload');
  p.act('stand'); p.act('double');
  const settled = p.act('double');
  assert.deepEqual([p.reload().view.round!.phase, s.state().balance], ['settled', 950]);
  assert.equal(p.press({ op: 'collect', roundId: settled.view.roundId }).balance, 1040, 'the same balance as the round without a reload');
  assert.throws(() => p.press({ op: 'collect', roundId: settled.view.roundId }, settled), err('STALE_VERSION', 409));
  assert.equal(s.ledger().reduce((a, e) => a - e.debit + e.credit, 1000), 1040);
});
