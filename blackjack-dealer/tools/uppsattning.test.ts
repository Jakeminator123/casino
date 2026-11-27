// Skyddar: kontrakten – de två uppsättningarna (livebordet och förra standarden) har allt spelet, editorn och beställningarna
// läser, valets förval är livebordet och datats förval den förra, och ett äldre ord läses rätt.
// src/uppsattning.ts against the measures it points at (src/table-live.ts, src/table-lens.ts) and Jakob's card plan, read only.
//   node --test tools/uppsattning.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADRESSORD, DATATS_FORVAL, UPPSATTNING, UPPSATTNINGAR, VALETS_FORVAL, datatsUppsattning, dockansUppsattning, lasUppsattning, uppsattningAv, valdUppsattning} from '../src/uppsattning.ts';
import {LIVE, LIVE_CAMERA} from '../src/table-live.ts';
import {FILM, TABLE_LENS} from '../src/table-lens.ts';
import {FRAMING_LIMITS, PLAY_VIEW} from '../src/play-view.ts';

const plan = (() => { const f = JSON.parse(readFileSync(new URL('../placements/default.json', import.meta.url), 'utf8')); return f.plan ?? f; })();
const edgeRow = JSON.parse(readFileSync(new URL('../data/scene-contract.json', import.meta.url), 'utf8')).keyFigures.dealerEdgeImageRow.value as number;
const underlag = {plan, edgeRow};
const near = (a: number, b: number, eps: number, what: string) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} mot ${b}`);

test('the choice\'s default is the live table, the data\'s the former standard, and the older word standard is the former', () => {
  assert.equal(VALETS_FORVAL, 'live'); assert.equal(DATATS_FORVAL, 'forra'); assert.equal(ADRESSORD, 'uppsattning');
  assert.deepEqual([...UPPSATTNINGAR].sort(), ['forra', 'live']);
  assert.equal(lasUppsattning('live'), 'live'); assert.equal(lasUppsattning('forra'), 'forra'); assert.equal(lasUppsattning('standard'), 'forra');
  for (const word of [null, undefined, '', 'Live', 'bred', 7]) assert.equal(lasUppsattning(word), null, String(word));
  assert.equal(uppsattningAv(null).id, 'live'); assert.equal(uppsattningAv('standard').id, 'forra');
  // what has no field was made under the former; a chooser with no word takes the live table, a doll takes its own table
  assert.equal(datatsUppsattning(undefined), 'forra'); assert.equal(datatsUppsattning('live'), 'live');
  assert.equal(valdUppsattning(null), 'live'); assert.equal(valdUppsattning(null, 'man'), 'forra'); assert.equal(valdUppsattning(null, 'kvinna'), 'forra');
  assert.equal(valdUppsattning(null, 'danilo'), 'live'); assert.equal(valdUppsattning('forra', 'danilo'), 'forra'); assert.equal(valdUppsattning('standard'), 'forra');
  assert.equal(dockansUppsattning('frasse'), 'live'); assert.equal(dockansUppsattning('paow'), null);
});

test('each set-up has everything the game reads: picture, camera, edge, card places with their lie, bet marks, shoe, table, play view and dolls', () => {
  for (const id of UPPSATTNINGAR) {
    const u = UPPSATTNING[id], at = `${id}`;
    assert.equal(u.id, id); assert.ok(u.namn && u.om, at);
    assert.ok(Number.isInteger(u.bild.width) && Number.isInteger(u.bild.height) && u.bild.width > u.bild.height, at);
    for (const v of [u.kamera.focalPx, u.kamera.pitch, u.kamera.roll, u.kamera.height, u.kamera.centre.x, u.kamera.centre.y]) assert.ok(Number.isFinite(v), at);
    // the optical axis meets the picture in its middle: the scene's film camera takes it so
    near(u.kamera.centre.x, (u.bild.width - 1) / 2, 1e-9, `${at} mitt x`); near(u.kamera.centre.y, (u.bild.height - 1) / 2, 1e-9, `${at} mitt y`);
    const edge = u.kant(underlag); assert.equal(edge[1], 0, at); assert.ok(edge[2] < -1, at);
    const cards = u.kortplatser(underlag), ids = new Set(cards.map(c => c.id));
    for (const need of ['D.C1', 'D.C2', ...[1, 2, 3, 4, 5, 6, 7].map(s => `P${s}.C1`)]) assert.ok(ids.has(need), `${at} saknar ${need}`);
    for (const c of cards) {
      assert.ok(Number.isFinite(c.heading) && c.at[1] === 0 && c.at[2] > edge[2], `${at} ${c.id}`);
      // each card place is in the picture, below the dealer's edge, and a pixel goes back to the same point on the felt
      const px = u.see(c.at)!; assert.ok(px.x > 0 && px.x < u.bild.width && px.y > 0 && px.y < u.bild.height, `${at} ${c.id} i bilden`);
      const back = u.onFelt(px)!; near(back[0], c.at[0], 1e-9, `${at} ${c.id} x`); near(back[2], c.at[2], 1e-9, `${at} ${c.id} z`);
    }
    const bets = u.insatser(underlag);
    assert.deepEqual(bets.map(b => b.seat), [1, 2, 3, 4, 5, 6, 7], at);
    // seat 1 at the picture's left (the dealer's right), and every mark nearer the players than its seat's first card
    for (let i = 1; i < 7; i++) assert.ok(bets[i].at[0] > bets[i - 1].at[0], `${at} plats ${i + 1}`);
    for (const b of bets) assert.ok(b.at[2] > cards.find(c => c.id === `P${b.seat}.C1`)!.at[2], `${at} insats ${b.seat}`);
    assert.ok(u.sko.footLength > 0.05 && u.sko.front[2] > edge[2], at);
    assert.ok(u.bord.halfWidth > 0.5 && u.bord.depth > 0.5 && u.bord.rail > 0, at);
    for (const f of [u.spelvy.dator, u.spelvy.mobil]) for (const k of ['zoom', 'pitch', 'yaw'] as const) assert.ok(f[k] >= FRAMING_LIMITS[k][0] && f[k] <= FRAMING_LIMITS[k][1], `${at} ${k}`);
    assert.ok(u.dockor.length >= 2, at);
  }
});

test('the live table is table-live.ts itself and the former standard table-lens.ts itself: nothing is copied', () => {
  const live = UPPSATTNING.live, forra = UPPSATTNING.forra;
  assert.equal(live.bild, LIVE_CAMERA.film); assert.equal(live.kamera.roll, LIVE_CAMERA.roll); assert.equal(live.kant(), LIVE.edge);
  for (const c of live.kortplatser()) assert.equal(c.at, LIVE.cards[c.id].at, c.id);
  assert.deepEqual(live.insatser().map(b => b.at), LIVE.betMarks);
  assert.deepEqual([...live.dockor], ['danilo', 'frasse']); assert.equal(live.bord.form, 'halvcirkel');
  assert.equal(forra.bild, FILM); assert.equal(forra.kamera.focalPx, TABLE_LENS.focalPx); assert.equal(forra.kamera.roll, 0);
  assert.deepEqual(forra.spelvy, {dator: PLAY_VIEW.dator, mobil: PLAY_VIEW.mobil}); assert.deepEqual([...forra.dockor], ['man', 'kvinna']);
  // the former's places are the card plan's: each lies where its point of the bank's picture shows the felt
  for (const c of forra.kortplatser(underlag)) { const n = plan.targets[c.id].geometry.native, px = forra.see(c.at)!; near(px.x, n.u * (FILM.width - 1), 1e-6, c.id); near(px.y, (1 - n.v) * (FILM.height - 1), 1e-6, c.id); }
  // the former's edge comes from the contract's row and needs it
  assert.throws(() => forra.kant(), /dealerEdgeImageRow/);
  near(forra.see(forra.kant(underlag))!.y, edgeRow, 1e-6, 'kanten');
});
