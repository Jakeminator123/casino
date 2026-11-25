// The doll lab tells the studio where a place was moved on the felt in the plan's own words (dealer3d/page/docka.ts,
// `moved`: u and v of placements/default.json, 'image-normalized-bottom-up'), and the studio writes them into its draft of
// the plan. These hold that a place read off the plan comes back as the same u and v, and that a point moved on the felt
// is where the plan then lays the place.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filmLens, spots, type Plan} from '../src/world.ts';
import {planPoint} from '../page/lay.ts';

const plan = JSON.parse(readFileSync(new URL('../../placements/default.json', import.meta.url), 'utf8')) as Plan & {space?: string};
const lens = filmLens();

test('every place of the plan comes back as its own u and v', () => {
  assert.equal(plan.space, 'image-normalized-bottom-up');
  const all = spots(plan, lens);
  assert.equal(all.length, Object.keys(plan.targets).length);
  for (const s of all) {
    const back = planPoint(s.at, lens), g = plan.targets[s.id].geometry.native;
    assert.ok(back, s.id);
    assert.ok(Math.abs(back.u - g.u) < 1e-9 && Math.abs(back.v - g.v) < 1e-9, `${s.id}: ${JSON.stringify(back)} is not ${g.u}, ${g.v}`);
  }
});

test('a place moved on the felt lies where it was moved to once its u and v are in the plan', () => {
  const four = spots(plan, lens).find(s => s.id === 'P4.C1')!, to: [number, number, number] = [four.at[0] + 0.05, 0, four.at[2] - 0.03];
  const uv = planPoint(to, lens)!, moved = structuredClone(plan);
  Object.assign(moved.targets['P4.C1'].geometry.native, uv);
  const again = spots(moved, lens).find(s => s.id === 'P4.C1')!;
  assert.ok(Math.hypot(again.at[0] - to[0], again.at[1] - to[1], again.at[2] - to[2]) < 1e-9, JSON.stringify(again.at));
  assert.ok(uv.u > plan.targets['P4.C1'].geometry.native.u, 'toward image right is a larger u');
  assert.ok(uv.v > plan.targets['P4.C1'].geometry.native.v, 'away from the camera is a larger v (bottom up)');
});
