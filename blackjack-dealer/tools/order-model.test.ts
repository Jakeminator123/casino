// Skyddar: beställningarna – godkännandet är hans eller fullmaktens, kredittaken håller, inget arkiverat går med.
// Offline tests for the order model (src/order-model.ts): the checkout's orders hold, the exact call per take, the cost
// from the price table, the policy and the standing mandate, the hash an approval freezes, and nothing archived or judged
// only for Jakob taken as his. No media needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { committedFiles } from './committed.ts';
import { createHash } from 'node:crypto';
import {
  archivedReferenceIds, STEPS, agentSpentOn, canonical, checkPolicy, costOf, cutFrameOf, dayOf, groupBudget, hashInput, isArchived,
  mandateBudgetOf, mandateRefusal, priceOf, referenceCandidates, requestOf, seatEndOf, stepOf, validateOrder,
  type BankFacts, type Order, type Policy,
} from '../src/order-model.ts';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const policy = async () => JSON.parse(await readFile('data/order-policy.json', 'utf8')) as Policy;
async function drafts(): Promise<Order[]> {
  const out: Order[] = [];
  // The orders the repo holds: a draft of Jakob's that is not committed yet is his, and the lab judges it (tools/committed.ts).
  for (const file of committedFiles('data/orders').filter((f) => f.endsWith('.json'))) out.push(JSON.parse(await readFile(file, 'utf8')));
  return out;
}

test('the checkout: every order file holds, and an approved one is Jakob\'s, or the main agent\'s on his mandate, and unchanged since', async () => {
  for (const order of await drafts()) {
    assert.deepEqual(validateOrder(order).errors, [], order.id);
    assert.equal(order.prompt.sha256, sha(order.prompt.text), order.id);
    if (order.approval) {
      assert.equal(order.status, 'GODKÄND', order.id);
      assert.ok(order.approval.by === 'jakob' || (order.approval.by === 'huvudagent' && !!order.approval.mandate), `${order.id}: Jakob's, or the main agent's on his mandate`);
      assert.equal(order.approval.orderSha256, sha(hashInput(order)), `${order.id}: unchanged since the approval`);
    } else if (order.status === 'AVBRUTEN') {
      // Set aside (tools/order-approve.ts --set-aside): kept as it was, with who set it aside and why.
      assert.ok(order.setAside && typeof order.setAside.why === 'string' && order.setAside.why.length > 0, `${order.id}: set aside with a reason`);
    } else assert.equal(order.status, 'UTKAST', order.id);
    assert.ok(!JSON.stringify(order).includes('_jwt'), `${order.id}: no signed address in data/`);
    assert.ok(!JSON.stringify(order).includes('preview'), `${order.id}: no stand-in preview`);
    // Nothing of another dealer goes out: a picture from the register or the bank's anchors and films is the dealer's own,
    // but an older still's cut figure of an arm at the shoe.
    const own = (id: string) => id.startsWith(`${order.dealer}-`);
    for (const p of order.pictures) {
      const bank = /^assets\/(?:anchors|motions)\/([^/]+)\//.exec(p.from?.path ?? '')?.[1];
      if ((p.from?.entry && !own(p.from.entry)) || (bank && !own(bank))) assert.ok(p.cut && p.name === 'pose-figure.png', `${order.id}: ${p.name}`);
    }
  }
});

test('the exact call per take: pictures by name, nothing the tool does not take, confirmRepeat from take 2', () => {
  const order = {
    generation: { provider: 'runway-app', tool: 'generate_video', model: 'kling-4', params: { resolution: '1080p', duration: 4 } },
    pictures: [
      { name: 'first.png', goesAs: 'startFrame' }, { name: 'last.png', goesAs: 'endFrame' }, { name: 'middle.png', goesAs: 'referenceImage' },
    ],
    reference: { status: 'INGEN', why: '' },
    prompt: { text: 'T' },
  } as unknown as Order;
  assert.deepEqual(requestOf(order, 1), { tool: 'generate_video', args: { model: 'kling-4', promptText: 'T', resolution: '1080p', duration: 4, startFrame: { url: '$file:first.png' }, endFrame: { url: '$file:last.png' }, referenceImages: [{ url: '$file:middle.png' }] } });
  assert.equal(requestOf(order, 2).args.confirmRepeat, true);
  const still = { ...order, generation: { provider: 'runway-app', tool: 'generate_image', model: 'nano-banana-pro', params: { ratio: '4:3', imageSize: '4K' } }, pictures: [{ name: 'anchor.png', goesAs: 'referenceImage', tag: 'anchor' }, { name: 'pose.png', goesAs: 'referenceImage', tag: 'pose' }] } as unknown as Order;
  assert.deepEqual(requestOf(still, 1).args, { model: 'nano-banana-pro', promptText: 'T', ratio: '4:3', imageSize: '4K', referenceImages: [{ url: '$file:anchor.png', tag: 'anchor' }, { url: '$file:pose.png', tag: 'pose' }], count: 1 });
});

test('cost from the price table, with the worst case where the listed price is higher; no price, no order', async () => {
  const { prices } = await policy();
  assert.deepEqual(priceOf({ model: 'kling-4', params: { resolution: '1080p', duration: 7 } }, prices)?.perTake, 150, '21,3 × 7 = 149,1, rounded up');
  assert.deepEqual(costOf({ model: 'kling-4', params: { resolution: '1080p', duration: 4 } }, 2, prices), { perTake: 86, total: 172, worstPerTake: 94, worstTotal: 188, basis: priceOf({ model: 'kling-4', params: { resolution: '1080p', duration: 4 } }, prices)!.basis });
  assert.equal(costOf({ model: 'wan3', params: { resolution: '1080p', duration: 4 } }, 1, prices)?.total, 80);
  assert.equal(costOf({ model: 'nano-banana-pro', params: { imageSize: '4K' } }, 2, prices)?.total, 80);
  assert.equal(costOf({ model: 'nano-banana-pro', params: { imageSize: '1K' } }, 1, prices), null, 'no price, no order');
  // Input film beyond the film's own length (a revansch sends two films): priced per input second, or not priced at all.
  const withInput = [{ model: 'kling-4', resolution: '1080p', perSecond: 21.3, listedPerSecond: 23.5, perInputSecond: 11.28, listedPerInputSecond: 14.1, source: 's' }];
  const two = priceOf({ model: 'kling-4', params: { resolution: '1080p', duration: 3 } }, withInput, 6.04);
  assert.deepEqual([two?.perTake, two?.worstPerTake], [99, 114], '3 × 21,3 + 3,04 × 11,28 = 98,2; 3 × 23,5 + 3,04 × 14,1 = 113,4');
  assert.equal(priceOf({ model: 'kling-4', params: { resolution: '1080p', duration: 3 } }, withInput.map(({ perInputSecond: _i, listedPerInputSecond: _l, ...p }) => p), 6.04), null, 'without the input rate the take cannot be priced');
});

test('the policy: switch, cap per order, floor on the balance; the worst case counts', async () => {
  // The limits are Jakob's and move; the arithmetic is tested on fixed ones.
  const p = { ...(await policy()), enabled: true, maxPerOrder: 400, minBalance: 2000 };
  const order = { cost: { perTake: 86, total: 172, worstPerTake: 94, worstTotal: 188, basis: '' } };
  assert.equal(checkPolicy(order, p, 17884).ok, true);
  assert.match(checkPolicy(order, { ...p, enabled: false }, 17884).refusals[0], /avstängda/);
  assert.match(checkPolicy({ cost: { ...order.cost, worstTotal: 401 } }, p, 17884).refusals.join(' '), /taket per beställning är 400/);
  assert.match(checkPolicy(order, p, 2100).refusals.join(' '), /golvet 2000/);
  // 23:30 UTC on the 12th is the 13th in Stockholm.
  assert.equal(dayOf('2026-11-12T23:30:00Z'), '2026-11-13');
});

// Jakob 2026-11-25: the agents approve on their own up to askAbove per order, a larger one is his, and perDayCredits is a
// safety net over what agents approve and call directly in a day. His own approvals are neither counted nor held.
test('the standing mandate: the agent alone up to askAbove, larger only Jakob, and a day of the agents', () => {
  const mandate = { id: 'test-staende', askAbove: 500, perDayCredits: 1000 };
  const cost = (worstTotal: number) => ({ perTake: worstTotal, total: worstTotal, worstPerTake: worstTotal, worstTotal, basis: '' });
  const by = (who: 'jakob' | 'huvudagent', at: string, worstTotal: number, more: Record<string, unknown> = {}) =>
    ({ approval: { by: who, at, orderSha256: 'x', mandate: 'm' }, cost: cost(worstTotal), status: 'GODKÄND' as const, ...more });
  const orders = [
    by('huvudagent', '2026-11-25T08:00:00Z', 300),
    by('huvudagent', '2026-11-24T22:30:00Z', 100), // 23.30 Swedish time: yesterday
    by('jakob', '2026-11-25T09:00:00Z', 1500), // his: not counted
    by('huvudagent', '2026-11-25T10:00:00Z', 200, { outside: { ledger: 'x' } }), // a call already made, counted as that call
    { approval: null, cost: cost(400), status: 'UTKAST' as const },
  ];
  const calls = [
    { requestedAt: '2026-11-25T11:00:00Z', expectCredits: 91 },
    { requestedAt: '2026-11-25T11:05:00Z', expectCredits: 91, cost: 80 },
    { requestedAt: '2026-11-25T11:10:00Z', expectCredits: 91, error: '400 bad request' },
    { requestedAt: '2026-11-25T11:15:00Z', expectCredits: 150, order: { id: 'x', take: 1 } }, // its order's
    { requestedAt: '2026-11-25T11:20:00Z', expectCredits: 900, jakob: 'Jakob 2026-11-25: kör' }, // his yes
  ];
  assert.equal(agentSpentOn(orders, calls, '2026-11-25'), 300 + 91 + 80);
  const at = '2026-11-25T12:00:00Z', budget = mandateBudgetOf(mandate, orders, calls, at);
  assert.deepEqual([budget.status, budget.spentToday, budget.available], ['active', 471, 529]);
  assert.equal(mandateRefusal(budget, 500), null);
  assert.match(mandateRefusal(budget, 501)!, /Jakob avgör/);
  const later = mandateBudgetOf(mandate, [...orders, by('huvudagent', '2026-11-25T11:30:00Z', 400)], calls, at);
  assert.ok(mandateRefusal(later, 200), '200 more does not fit in the agents\' 1 000 today (871 used)');
  // The next day starts empty.
  assert.equal(mandateBudgetOf(mandate, orders, calls, '2026-11-25T23:30:00Z').available, 1000);
  // No mandate, or one that cannot be read, leaves the agents nothing; the API key's ledger unread is the same.
  assert.equal(mandateBudgetOf(undefined, orders, calls, at).status, 'missing');
  assert.equal(mandateBudgetOf({ id: 'x', startsAt: '2026-11-24T04:50:00Z' }, orders, calls, at).status, 'unreadable');
  assert.equal(mandateBudgetOf(mandate, orders, null, at).status, 'unreadable');
  assert.match(mandateRefusal(mandateBudgetOf(undefined, orders, calls, at), 10)!, /bara Jakob godkänner/);
  // The check for an agent counts the day; Jakob's check has no day and no mandate.
  const p = { enabled: true, maxPerOrder: 2000, minBalance: 0 };
  assert.deepEqual(checkPolicy({ cost: cost(100) }, p, 7000, budget).day, { before: 471, after: 571, of: 1000 });
  assert.equal(checkPolicy({ cost: cost(1500) }, p, 7000, budget).ok, false);
  assert.deepEqual([checkPolicy({ cost: cost(1500) }, p, 7000).ok, checkPolicy({ cost: cost(1500) }, p, 7000).day], [true, undefined]);
});

test('the policy file holds a standing mandate the agents can read', async () => {
  const p = await policy();
  const budget = mandateBudgetOf(p.mandate, [], [], new Date().toISOString(), p.timeZone);
  assert.equal(budget.status, 'active', 'data/order-policy.json: mandate {id, askAbove, perDayCredits}');
  assert.ok(budget.mandate!.askAbove <= budget.mandate!.perDayCredits);
});

test('a group of drafts against the limits: what all cost and how many fit above the floor', async () => {
  const p = { ...(await policy()), enabled: true, maxPerOrder: 400, minBalance: 2000 };
  const cost = costOf({ model: 'wan3', params: { resolution: '1080p', duration: 6 } }, 2, p.prices)!;
  const seven = groupBudget(cost, 7, p, 17884);
  assert.deepEqual([seven.total, seven.worstTotal, seven.fitBalance, seven.overPerOrder], [1680, 1680, 7, false]);
  assert.equal(groupBudget({ total: 300, worstTotal: 450 }, 2, p, 17884).overPerOrder, true);
  assert.equal(groupBudget(cost, 7, p, 2600).fitBalance, 2, 'two of seven above the floor of 2 000');
});

test('the hash covers everything but approval and status, whatever the key order', () => {
  const order = { schemaVersion: 1, id: 'x', takes: 1, prompt: { text: 'T' }, pictures: [], status: 'UTKAST', approval: null } as unknown as Order;
  const approved = { ...order, status: 'GODKÄND', approval: { by: 'jakob', at: '2026-11-12T22:00:00Z', orderSha256: 'a'.repeat(64) } } as Order;
  assert.equal(hashInput(approved), hashInput(order));
  assert.notEqual(hashInput({ ...order, takes: order.takes + 1 }), hashInput(order));
  assert.notEqual(hashInput({ ...order, prompt: { ...order.prompt, text: order.prompt.text + ' ' } }), hashInput(order));
  assert.equal(canonical({ b: 1, a: [{ d: 2, c: 3 }] }), canonical({ a: [{ c: 3, d: 2 }], b: 1 }));
});

test('a reference cannot send an archived segment through corrected copies, without archiving through the edit in reverse', () => {
  const archive = {review: {archived: {by: 'Jakob'}}};
  const source = {id: 'whole', from: 'READY', to: 'P4.C1', duration: 4};
  const bank: BankFacts = {
    jobs: [source, {...source, id: 'other-source'}],
    derived: [
      {id: 'live-segment', clip: source.id, from: 'READY', to: 'P4.C1', frames: [0, 89]},
      {id: 'retired-segment', clip: source.id, from: 'P4.C1', to: 'READY', frames: [90, 119]},
    ],
    edits: [
      {id: 'fixed-again', source: {clip: 'fixed'}},
      {id: 'fixed', source: {clip: source.id}},
      {id: 'other-fixed', source: {clip: 'other-source'}},
      {id: 'cycle-a', source: {clip: 'cycle-b'}},
      {id: 'cycle-b', source: {clip: 'cycle-a'}},
    ],
    motions: {'retired-segment': archive, 'other-fixed': archive, 'cycle-a': archive},
  };
  const want = {dealer: 'paow', step: stepOf('GIV-2.1')!, target: 'P4.C1'};
  assert.ok(referenceCandidates({...bank, motions: {}}, want).some(candidate => candidate.film === 'fixed'));
  assert.deepEqual(referenceCandidates(bank, want).map(candidate => candidate.film), ['other-source']);
  assert.deepEqual([...archivedReferenceIds(bank)].sort(), ['cycle-a', 'cycle-b', 'fixed', 'fixed-again', 'live-segment', 'other-fixed', 'retired-segment', 'whole']);
});

test('an archived take gives no last frame, whether its return or the whole film is archived', () => {
  const straight = { decision: 'ACCEPTED', userAccepted: true, userReview: 'Jakob 2026-11-13: bra' };
  const clip = 'paow-giv-2-1-p4-04-01';
  const bank: BankFacts = {
    derived: [{ id: `${clip}-deal`, from: 'READY', to: 'P4.C1', clip, frames: [0, 108], dealer: 'paow' }, { id: `${clip}-return`, from: 'P4.C1', to: 'READY', clip, frames: [109, 168], dealer: 'paow' }],
    motions: { [`${clip}-return`]: { review: straight } },
  };
  const end = (from: BankFacts) => seatEndOf([], from, { dealer: 'paow', step: stepOf('GIV-2.1')!, target: 'P4.C1', hand: 'LH' });
  assert.equal(end(bank)?.kind, 'SNITTRUTA');
  const archivedReturn = { ...bank, motions: { [`${clip}-return`]: { review: { ...straight, archived: { by: 'Jakob', where: 'Karta' } } } } };
  assert.equal(isArchived(archivedReturn, `${clip}-return`), true);
  assert.equal(end(archivedReturn), null);
  assert.equal(end({ ...bank, motions: { ...bank.motions, [clip]: { review: { archived: { by: 'Jakob' } } } } }), null, 'the whole film archived');
});

test('a cut frame by rule comes from a return Jakob approved himself: a variant, one judged in his place, a rejected one or another dealer\'s is left out', () => {
  const cut = (clip: string, at: number, dealer = 'paow') => [
    { id: `${clip}-deal`, kind: 'DEAL', from: 'READY', to: 'P4.C1', clip, frames: [0, at] as [number, number], dealer },
    { id: `${clip}-return`, kind: 'RETURN', from: 'P4.C1', to: 'READY', clip, frames: [at + 1, 168] as [number, number], dealer },
  ];
  const review = (decision: string, extra: Record<string, unknown> = {}) => ({ review: { decision, userAccepted: decision !== 'REJECTED', userReview: 'Jakob 2026-11-13: Bra.', ...extra } });
  const bank: BankFacts = {
    derived: [...cut('p4-a', 108), ...cut('p4-c', 93), ...cut('p4-d', 100), ...cut('p4-e', 97), ...cut('ada-p4', 90, 'ada')],
    motions: {
      'p4-a-return': review('ACCEPTED', { acceptedAs: 'MAIN' }),
      'p4-c-return': review('ACCEPTED', { acceptedAs: 'VARIANT' }),
      'p4-d-return': { review: { decision: 'ACCEPTED', userAccepted: false, provisional: { by: 'huvudagent' } } },
      'p4-e-return': review('REJECTED'),
      'ada-p4-return': review('ACCEPTED'),
    },
  };
  const step = STEPS.find((s) => s.key === 'GIV-2.1')!;
  assert.deepEqual(cutFrameOf(bank, { dealer: 'paow', step, target: 'P4.C1' }).map((c) => [c.clip, c.frame]), [['p4-a', 108]]);
});
