// Skyddar: kontrakten – de två uppsättningarna (livebordet och förra standarden) har allt spelet, editorn och beställningarna
// läser, valets förval är livebordet och datats förval den förra, och ett äldre ord läses rätt.
// src/uppsattning.ts against the measures it points at (src/table-live.ts, src/table-lens.ts) and Jakob's card plan, read only.
//   node --test tools/uppsattning.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADRESSORD, DATATS_FORVAL, UPPSATTNING, UPPSATTNINGAR, VALETS_FORVAL, datatsUppsattning, dockansUppsattning, lasUppsattning, uppsattningAv, valdUppsattning} from '../src/uppsattning.ts';
import {LIVE, LIVE_CAMERA, liveSee} from '../src/table-live.ts';
import {FILM, TABLE_LENS, cardCorners} from '../src/table-lens.ts';
import {FRAMING_LIMITS, PLAY_VIEW} from '../src/play-view.ts';
import {filmPixel, filmToScene, filmToTable, setupBets, setupCamera, setupSpots, solveCamera, tableToFilm} from '../src/scene3d-geometry.ts';
import {createLayout, liveLayout, type Slot} from '../src/game-table.ts';
import {playedCut, type TreeDef} from '../src/dealer-trees.ts';

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

test('the scene\'s film camera under the live table is the measured camera, roll and picture included', () => {
  const c = setupCamera(UPPSATTNING.live), s = solveCamera(c);
  assert.deepEqual(c.frame, LIVE_CAMERA.film); assert.equal(c.roll, LIVE_CAMERA.roll); assert.equal(c.scale, 1);
  near(s.pitch, LIVE_CAMERA.pitch, 1e-12, 'lutningen'); near(-s.edgeDistance, LIVE.edge[2], 1e-9, 'kanten');
  // every card place's corners, a bet mark and a point in the air go to the pixels liveSee gives, and a felt pixel comes back to its point
  const points = [...Object.values(LIVE.cards).flatMap(card => cardCorners(card.at, 0)), ...LIVE.betMarks];
  for (const p of points) {
    const want = liveSee(p)!, felt = tableToFilm(c, p[0], p[2]), seen = filmPixel(c, p)!;
    near(felt.x, want.x, 1e-6, 'x'); near(felt.y, want.y, 1e-6, 'y'); near(seen.x, want.x, 1e-6, 'x'); near(seen.y, want.y, 1e-6, 'y');
    const back = filmToTable(c, want.x, want.y)!, scene = filmToScene(c, want.x, want.y);
    near(back.x, p[0], 1e-9, 'tillbaka x'); near(back.z, p[2], 1e-9, 'tillbaka z'); near(scene[0], p[0], 1e-9, 'scen x'); near(scene[2], p[2], 1e-9, 'scen z');
  }
  const air = liveSee([0.3, 0.25, -1.7])!, held = filmPixel(c, [0.3, 0.25, -1.7])!; near(held.x, air.x, 1e-6, 'luft x'); near(held.y, air.y, 1e-6, 'luft y');
  // the roll is carried: a level line across the felt falls toward the picture's right, about 2.4 px from the middle to the edge
  const middle = tableToFilm(c, 0, -1.6), edgeOfPicture = tableToFilm(c, 1.6 * 0.9 * (LIVE_CAMERA.film.width / 2) / LIVE_CAMERA.focalPx, -1.6);
  assert.ok(edgeOfPicture.y - middle.y > 1.5 && edgeOfPicture.y - middle.y < 3, `rullningen: ${edgeOfPicture.y - middle.y}`);
});

test('under the live table the card places, bet rings and the game\'s lying cards lie where the measurement has them', () => {
  const c = setupCamera(UPPSATTNING.live), edge = LIVE.edge[2], spots = setupSpots(UPPSATTNING.live, c), bets = setupBets(UPPSATTNING.live, c);
  for (const s of spots) { const card = LIVE.cards[s.id]; near(s.x, card.at[0], 1e-9, s.id); near(s.s, card.at[2] - edge, 1e-6, s.id); assert.ok(Number.isFinite(s.turn), s.id); }
  assert.deepEqual(bets.map(b => b.id), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
  bets.forEach((b, i) => { near(b.x, LIVE.betMarks[i][0], 1e-9, b.id); near(b.s, LIVE.betMarks[i][2] - edge, 1e-6, b.id); });
  // each card the game lays at a measured place is a real card there, drawn through the live camera: laid back on the felt by the
  // scene's camera its corners are the card's own
  const layout = createLayout(plan, {uppsattning: 'live'}), slot = (owner: 'P' | 'D', seat: number, index: number, hand = 0, hands = 1): Slot => ({owner, seat, hand, hands, index});
  const slots = [...[1, 2, 3, 4, 5, 6, 7].flatMap(seat => [slot('P', seat, 0), slot('P', seat, 1)]), slot('D', 0, 0), slot('D', 0, 1)];
  for (const sl of slots) {
    const id = `${sl.owner === 'D' ? 'D' : `P${sl.seat}`}.C${sl.index + 1}`, card = LIVE.cards[id], q = layout.quad(sl);
    assert.equal(q.length, 4, id);
    if (!card) continue; // seat 3's second card: the mirrored seat's step (liveLayout)
    const corners = cardCorners(card.at, -(card.turn > 90 ? card.turn - 180 : card.turn) * Math.PI / 180);
    q.forEach((p, i) => { const felt = filmToTable(c, p.x, p.y)!; near(felt.x, corners[i][0], 1e-9, `${id} hörn ${i}`); near(felt.z, corners[i][2], 1e-9, `${id} hörn ${i}`); });
  }
  // seat 3's second card mirrors seat 5's step, and a third card and a split hand step on in metres from the first two
  const p3 = liveLayout(plan).centre(slot('P', 3, 1)), p3first = liveLayout(plan).centre(slot('P', 3, 0)); assert.ok(p3.y < p3first.y && p3.x < p3first.x, 'plats 3:s andra kort');
  const third = liveLayout(plan).centre(slot('P', 4, 2)), second = layout.centre(slot('P', 4, 1)), split = layout.centre(slot('P', 4, 0, 1, 2)), first = layout.centre(slot('P', 4, 0));
  assert.ok(Math.hypot(third.x - second.x, third.y - second.y) > 5, 'tredje kortet'); assert.ok(split.y < first.y, 'delad hand mot dealern');
  // the former standard's layout is untouched by the option (tools/card-plan.test.ts holds it)
  assert.deepEqual(createLayout(plan, {uppsattning: 'forra'}).quad(slot('P', 4, 0)), createLayout(plan).quad(slot('P', 4, 0)));
});

test('the game plays a tree only under its own set-up: without a word the live table when a played tree has it, else the former', () => {
  const tree = (id: string, uppsattning?: 'live'): TreeDef => ({id, name: id, state: 'spelas', root: 'IDLE', anchors: [{entry: `${id}-a1`}], ...(uppsattning ? {uppsattning} : {})});
  const takes = [{id: 'f1', tree: 'forra-tree'}, {id: 'l1', tree: 'live-tree'}, {id: 'borta', tree: null}];
  // today: no tree says a set-up, and the cut is the former standard's as it always was (it says nothing of set-ups)
  const today = playedCut('paow', [tree('forra-tree')], takes.slice(0, 1).concat(takes[2]), () => 'READY');
  assert.equal(today.uppsattning, undefined); assert.deepEqual(today.drop, []);
  const both = [tree('forra-tree'), tree('live-tree', 'live')];
  const auto = playedCut('paow', both, takes, () => 'READY');
  assert.equal(auto.uppsattning, 'live'); assert.deepEqual(auto.played, ['live-tree']); assert.deepEqual(auto.drop.sort(), ['borta', 'f1']);
  const former = playedCut('paow', both, takes, () => 'READY', 'forra');
  assert.equal(former.uppsattning, 'forra'); assert.deepEqual(former.played, ['forra-tree']); assert.deepEqual(former.drop, ['l1']);
  const none = playedCut('paow', [tree('forra-tree')], takes, () => 'READY', 'live');
  assert.equal(none.uppsattning, 'live'); assert.deepEqual(none.played, []); assert.deepEqual(none.setups, ['forra']); assert.deepEqual(none.drop.sort(), ['borta', 'f1', 'l1']);
});
