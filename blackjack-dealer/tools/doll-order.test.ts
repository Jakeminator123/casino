// Skyddar: hans domar och val – en dockfilm beställs från A2.3 och planens Handbyte väljer aldrig (Jakob 2026-11-25); nypet A2.1 ger till plats 1 och 2 (Jakob 2026-11-26: "plats ett ska få nyp"). Kontrakten – dockans sida erbjuder från A2.1 det som beställningen gör därifrån, och ett stängt kort vägras av båda.
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
import {placeFrom} from '../dealer3d/page/lay.ts';

const REPO = fileURLToPath(new URL('../', import.meta.url));
type Plan = {targets: Record<string, {intent: {pass: boolean; endSide: 'BACK' | 'FRONT'}}>};

/** A root with his plan as it is saved, changed by `edit`: all the tool reads before anything is made. */
async function rootWith(edit: (plan: Plan) => void) {
  const root = await mkdtemp(path.join(tmpdir(), 'doll-order-'));
  const plan = JSON.parse(await readFile(path.join(REPO, 'placements', 'default.json'), 'utf8')) as Plan;
  edit(plan);
  await mkdir(path.join(root, 'placements'), {recursive: true});
  await writeFile(path.join(root, 'placements', 'default.json'), JSON.stringify(plan));
  return {root, plan};
}

test('a deal is ordered from A2.3 whatever the plan says of handbyte', async () => {
  for (const pass of [false, true]) {
    const {root} = await rootWith((p) => { p.targets['P5.C1'].intent.pass = pass; });
    try {
      const made = dollOrderPlan(root, {dealer: 'paow', place: 'P5.C1'});
      assert.equal(made.entry, 'A2.3');
      assert.equal(made.notation, 'A2.3 - A3P5C1');
      assert.match(made.film, /^docka-paow-2-3-p5c1-bestalld-/);
      assert.match(made.title, /dockans sparade rörelse/);
    } finally { await rm(root, {recursive: true, force: true}); }
  }
});

test('A2.1 is ordered only when asked for, seats 1 and 2 too, and a card laid closed is refused', async () => {
  const {root} = await rootWith((p) => { p.targets['P5.C1'].intent.pass = true; p.targets['D.C1'].intent.endSide = 'BACK'; });
  try {
    // asked for: from A2.1, though the plan says handbyte
    const pinch = dollOrderPlan(root, {dealer: 'paow', place: 'P5.C1', entry: 'A2.1'});
    assert.equal(pinch.entry, 'A2.1');
    assert.equal(pinch.notation, 'A2.1 - A3P5C1');
    // seats 1 and 2 from the pinch, her left arm over her resting right hand as in her films (Jakob 2026-11-26)
    for (const place of ['P1.C1', 'P1.C2', 'P2.C1', 'P2.C2']) assert.equal(dollOrderPlan(root, {dealer: 'paow', place, entry: 'A2.1'}).notation, `A2.1 - A3${place.replace('.', '')}`);
    // a card laid closed is never turned in her fingers: refused from A2.1, and from A2.3 laid closed
    assert.throws(() => dollOrderPlan(root, {dealer: 'paow', place: 'D.C1', entry: 'A2.1'}), /går inte från A2\.1/);
    assert.equal(dollOrderPlan(root, {dealer: 'paow', place: 'D.C1'}).side, 'BACK');
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('the doll lab offers from A2.1 the places the order makes from it', async () => {
  for (const side of ['BACK', 'FRONT'] as const) {
    const {root, plan} = await rootWith((p) => { p.targets['D.C1'].intent.endSide = side; });
    try {
      for (const place of Object.keys(plan.targets)) {
        const lab = placeFrom('A2.1', place, 'paow', plan), shown = !!lab && !('none' in lab);
        let ordered = true; try { dollOrderPlan(root, {dealer: 'paow', place, entry: 'A2.1'}); } catch { ordered = false; }
        assert.equal(shown, ordered, `${place} (${side === 'BACK' ? 'D.C1 stängt' : 'D.C1 öppet'}): dockans sida ${shown ? 'ger' : 'vägrar'}, beställningen ${ordered ? 'ger' : 'vägrar'}`);
      }
      assert.equal(!!placeFrom('A2.1', 'D.C1', 'paow', plan) && !('none' in placeFrom('A2.1', 'D.C1', 'paow', plan)!), side === 'FRONT');
    } finally { await rm(root, {recursive: true, force: true}); }
  }
});
