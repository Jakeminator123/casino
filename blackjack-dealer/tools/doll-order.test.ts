// Skyddar: hans domar och val – en dockfilm beställs från A2.3 och planens Handbyte väljer aldrig (Jakob 2026-11-25).
// node --test tools/doll-order.test.ts
// What the doll's order is made from (an order's contract): the pose is the step's own, A2.3 unless A2.1 is asked for.
// The plan's "Handbyte" never chooses it (Jakob 2026-11-25: a deal the guide showed from A2.3 was drafted from A2.1 for
// every card whose plan said no handbyte).
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {dollOrderPlan} from './doll-order.ts';

const REPO = fileURLToPath(new URL('../', import.meta.url));
type Plan = {targets: Record<string, {intent: {pass: boolean; endSide: 'BACK' | 'FRONT'}}>};

/** A root with his plan as it is saved, changed by `edit`: all the tool reads before anything is made. */
async function rootWith(edit: (plan: Plan) => void) {
  const root = await mkdtemp(path.join(tmpdir(), 'doll-order-'));
  const plan = JSON.parse(await readFile(path.join(REPO, 'placements', 'default.json'), 'utf8')) as Plan;
  edit(plan);
  await mkdir(path.join(root, 'placements'), {recursive: true});
  await writeFile(path.join(root, 'placements', 'default.json'), JSON.stringify(plan));
  return root;
}

test('a deal is ordered from A2.3 whatever the plan says of handbyte', async () => {
  for (const pass of [false, true]) {
    const root = await rootWith((p) => { p.targets['P5.C1'].intent.pass = pass; });
    try {
      const made = dollOrderPlan(root, {dealer: 'paow', place: 'P5.C1'});
      assert.equal(made.entry, 'A2.3');
      assert.equal(made.notation, 'A2.3 - A3P5C1');
      assert.match(made.film, /^docka-paow-2-3-p5c1-bestalld-/);
      assert.match(made.title, /dockans sparade rörelse/);
    } finally { await rm(root, {recursive: true, force: true}); }
  }
});

test('A2.1 is ordered only when asked for, and refused where the doll cannot make it', async () => {
  const root = await rootWith((p) => { p.targets['P5.C1'].intent.pass = true; p.targets['D.C1'].intent.endSide = 'BACK'; });
  try {
    // asked for: from A2.1, though the plan says handbyte
    const pinch = dollOrderPlan(root, {dealer: 'paow', place: 'P5.C1', entry: 'A2.1'});
    assert.equal(pinch.entry, 'A2.1');
    assert.equal(pinch.notation, 'A2.1 - A3P5C1');
    // seat 1 lies to the right of her right shoulder: her left arm would go over her right hand
    assert.throws(() => dollOrderPlan(root, {dealer: 'paow', place: 'P1.C1', entry: 'A2.1'}), /går inte från A2\.1/);
    // a card laid closed is never turned in her fingers
    assert.throws(() => dollOrderPlan(root, {dealer: 'paow', place: 'D.C1', entry: 'A2.1'}), /går inte från A2\.1/);
    // the same two cards go from A2.3
    assert.equal(dollOrderPlan(root, {dealer: 'paow', place: 'P1.C1'}).entry, 'A2.3');
    assert.equal(dollOrderPlan(root, {dealer: 'paow', place: 'D.C1'}).side, 'BACK');
  } finally { await rm(root, {recursive: true, force: true}); }
});
