// Skyddar: kontrakten – standarden: dockans lins är bordets lins, och planens platser ligger där planen säger.
// The standard: one camera, one table, one card (docs/SYSTEM.md, "Standarden"). The lens written down in src/table-lens.ts
// (TABLE_LENS, through which the card plan, the orders' last picture and the 3D scene's Standard draw) is the one the doll
// fits anew from the film at run time (dealer3d/src/world.ts filmLens), and every place of Jakob's plan lies on the doll's
// felt where the plan's own pixel says. A contract: it reads the saved plan as it is, so it holds when a card is moved.
//   node --test dealer3d/tests/standard.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TABLE_LENS, filmEye, planPixel, see} from '../../src/table-lens.ts';
import {filmLens, spots, type Plan} from '../src/world.ts';

const plan = JSON.parse(readFileSync(new URL('../../placements/default.json', import.meta.url), 'utf8')) as Plan;

test('dockans lins är bordets lins: anpassningen ur filmen ger talen som står i src/table-lens.ts', () => {
  const fitted = filmLens();
  assert.equal(fitted.focalPx, TABLE_LENS.focalPx, 'the focal length the fit chooses is the one written down');
  // a billionth of a radian is two millionths of a pixel at the picture's edge; a billionth of a metre is nothing on the felt
  assert.ok(Math.abs(fitted.pitch - TABLE_LENS.pitch) < 1e-9, `pitch: fitted ${fitted.pitch}, written ${TABLE_LENS.pitch}`);
  assert.ok(Math.abs(fitted.height - TABLE_LENS.height) < 1e-9, `height: fitted ${fitted.height}, written ${TABLE_LENS.height}`);
});

test('varje plats i planen ligger på dockans filt där planens egen bildpunkt säger, sedd genom bordets lins', () => {
  const ids = Object.keys(plan.targets), laid = spots(plan, filmLens()), eye = filmEye(TABLE_LENS);
  assert.ok(ids.length > 0, 'the plan has card places');
  assert.deepEqual(laid.map(s => s.id).sort(), [...ids].sort(), 'every place of the plan lies on the felt (the horizon is above the picture)');
  for (const spot of laid) {
    assert.ok(Math.abs(spot.at[1]) < 1e-9, `${spot.id} lies on the felt`);
    const want = planPixel(plan.targets[spot.id].geometry.native), seen = see(eye, spot.at);
    assert.ok(seen, `${spot.id} is in front of the film camera`);
    const off = Math.hypot(seen.x - want.x, seen.y - want.y);
    assert.ok(off < 0.01, `${spot.id}: the doll's place shows at (${seen.x.toFixed(3)}, ${seen.y.toFixed(3)}), the plan's pixel is (${want.x.toFixed(3)}, ${want.y.toFixed(3)}): ${off.toFixed(4)} px apart`);
  }
});
