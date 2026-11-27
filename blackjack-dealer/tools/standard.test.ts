// Skyddar: kontrakten – standarden (livebordet) har allt spelet, editorn och beställningarna läser, pekar på måtten i
// src/table-live.ts utan att kopiera dem, och spelets kort, kortplatser och insatsringar ligger där mätningen har dem.
// src/standard.ts against the measures it points at (src/table-live.ts) and the scene's camera built from it.
//   node --test tools/standard.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BET, STANDARD} from '../src/standard.ts';
import {LIVE, LIVE_CAMERA, liveSee} from '../src/table-live.ts';
import {cardCorners} from '../src/space.ts';
import {FRAMING_LIMITS, PLAY_VIEW} from '../src/play-view.ts';
import {filmPixel, filmToScene, filmToTable, setupBets, setupCamera, setupSpots, solveCamera, tableToFilm} from '../src/scene3d-geometry.ts';
import {createLayout, type Slot} from '../src/game-table.ts';

const plan = (() => { const f = JSON.parse(readFileSync(new URL('../placements/default.json', import.meta.url), 'utf8')); return f.plan ?? f; })();
const near = (a: number, b: number, eps: number, what: string) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} mot ${b}`);

test('the standard has everything the game reads: picture, camera, edge, card places with their lie, bet marks, shoe, table, play view and dolls', () => {
  const u = STANDARD;
  assert.equal(u.namn, 'Livestandarden'); assert.ok(u.om);
  assert.ok(Number.isInteger(u.bild.width) && Number.isInteger(u.bild.height) && u.bild.width > u.bild.height);
  for (const v of [u.kamera.focalPx, u.kamera.pitch, u.kamera.roll, u.kamera.height, u.kamera.centre.x, u.kamera.centre.y]) assert.ok(Number.isFinite(v));
  // the optical axis meets the picture in its middle: the scene's film camera takes it so
  near(u.kamera.centre.x, (u.bild.width - 1) / 2, 1e-9, 'mitt x'); near(u.kamera.centre.y, (u.bild.height - 1) / 2, 1e-9, 'mitt y');
  const edge = u.kant(); assert.equal(edge[1], 0); assert.ok(edge[2] < -1);
  const cards = u.kortplatser(), ids = new Set(cards.map(c => c.id));
  for (const need of ['D.C1', 'D.C2', ...[1, 2, 3, 4, 5, 6, 7].map(s => `P${s}.C1`)]) assert.ok(ids.has(need), `saknar ${need}`);
  for (const c of cards) {
    assert.ok(Number.isFinite(c.heading) && c.at[1] === 0 && c.at[2] > edge[2], c.id);
    // each card place is in the picture, below the dealer's edge, and a pixel goes back to the same point on the felt
    const px = u.see(c.at)!; assert.ok(px.x > 0 && px.x < u.bild.width && px.y > 0 && px.y < u.bild.height, `${c.id} i bilden`);
    const back = u.onFelt(px)!; near(back[0], c.at[0], 1e-9, `${c.id} x`); near(back[2], c.at[2], 1e-9, `${c.id} z`);
  }
  const bets = u.insatser();
  assert.deepEqual(bets.map(b => b.seat), [1, 2, 3, 4, 5, 6, 7]);
  // seat 1 at the picture's left (the dealer's right), and every mark nearer the players than its seat's first card
  for (let i = 1; i < 7; i++) assert.ok(bets[i].at[0] > bets[i - 1].at[0], `plats ${i + 1}`);
  for (const b of bets) assert.ok(b.at[2] > cards.find(c => c.id === `P${b.seat}.C1`)!.at[2], `insats ${b.seat}`);
  assert.ok(u.sko.footLength > 0.05 && u.sko.front[2] > edge[2]);
  assert.ok(u.bord.halfWidth > 0.5 && u.bord.depth > 0.5 && u.bord.rail > 0);
  for (const f of [u.spelvy.dator, u.spelvy.mobil]) for (const k of ['zoom', 'pitch', 'yaw'] as const) assert.ok(f[k] >= FRAMING_LIMITS[k][0] && f[k] <= FRAMING_LIMITS[k][1], k);
  assert.deepEqual(PLAY_VIEW.dator, u.spelvy.dator); assert.deepEqual(PLAY_VIEW.mobil, u.spelvy.mobil);
  assert.equal(u.spelvyFil, 'data/play-view-live.json');
});

test('the standard is table-live.ts itself: nothing is copied, and the dolls at it are Danilo and Frasse', () => {
  const u = STANDARD;
  assert.equal(u.bild, LIVE_CAMERA.film); assert.equal(u.kamera.roll, LIVE_CAMERA.roll); assert.equal(u.kant(), LIVE.edge);
  for (const c of u.kortplatser()) assert.equal(c.at, LIVE.cards[c.id].at, c.id);
  assert.deepEqual(u.insatser().map(b => b.at), LIVE.betMarks);
  assert.deepEqual([...u.dockor], ['danilo', 'frasse']);
  for (const c of u.kortplatser()) assert.deepEqual(u.see(c.at), liveSee(c.at), c.id);
});

test('the scene\'s film camera is the measured camera, roll and picture included', () => {
  const c = setupCamera(STANDARD), s = solveCamera(c);
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

test('the card places, bet rings and the game\'s lying cards lie where the measurement has them', () => {
  const c = setupCamera(STANDARD), edge = LIVE.edge[2], spots = setupSpots(STANDARD, c), bets = setupBets(STANDARD, c);
  for (const s of spots) { const card = LIVE.cards[s.id]; near(s.x, card.at[0], 1e-9, s.id); near(s.s, card.at[2] - edge, 1e-6, s.id); assert.ok(Number.isFinite(s.turn), s.id); }
  assert.deepEqual(bets.map(b => b.id), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
  bets.forEach((b, i) => { near(b.x, LIVE.betMarks[i][0], 1e-9, b.id); near(b.s, LIVE.betMarks[i][2] - edge, 1e-6, b.id); near(b.radius, BET.radius, 1e-12, b.id); });
  // each card the game lays at a measured place is a real card there, drawn through the live camera: laid back on the felt by the
  // scene's camera its corners are the card's own
  const layout = createLayout(plan), slot = (owner: 'P' | 'D', seat: number, index: number, hand = 0, hands = 1): Slot => ({owner, seat, hand, hands, index});
  const slots = [...[1, 2, 3, 4, 5, 6, 7].flatMap(seat => [slot('P', seat, 0), slot('P', seat, 1)]), slot('D', 0, 0), slot('D', 0, 1)];
  for (const sl of slots) {
    const id = `${sl.owner === 'D' ? 'D' : `P${sl.seat}`}.C${sl.index + 1}`, card = LIVE.cards[id], q = layout.quad(sl);
    assert.equal(q.length, 4, id);
    if (!card) continue; // a seat's second card the measurement lacks: the mirrored seat's step (createLayout)
    const corners = cardCorners(card.at, -(card.turn > 90 ? card.turn - 180 : card.turn) * Math.PI / 180);
    q.forEach((p, i) => { const felt = filmToTable(c, p.x, p.y)!; near(felt.x, corners[i][0], 1e-9, `${id} hörn ${i}`); near(felt.z, corners[i][2], 1e-9, `${id} hörn ${i}`); });
  }
  // a third card and a split hand step on in metres from the first two
  const third = layout.centre(slot('P', 4, 2)), second = layout.centre(slot('P', 4, 1)), split = layout.centre(slot('P', 4, 0, 1, 2)), first = layout.centre(slot('P', 4, 0));
  assert.ok(Math.hypot(third.x - second.x, third.y - second.y) > 5, 'tredje kortet'); assert.ok(split.y < first.y, 'delad hand mot dealern');
});

test('on a phone held upright the table shows seats 2–6 whole: their rings and cards inside the picture\'s width', () => {
  // Standing, the film's width is the picture's at zoom 1 (src/scene3d-geometry.ts viewFovDeg), so the zoom shows the middle 1/zoom of it.
  const u = STANDARD, half = u.bild.width / 2 / u.spelvy.mobil.zoom, mid = (u.bild.width - 1) / 2;
  for (const seat of [2, 3, 4, 5, 6]) {
    const ring = LIVE.betMarks[seat - 1], edges = [ring[0] - BET.radius, ring[0] + BET.radius].map(x => liveSee([x, 0, ring[2]])!.x);
    const cards = ['C1', 'C2'].flatMap(c => LIVE.cards[`P${seat}.${c}`] ? cardCorners(LIVE.cards[`P${seat}.${c}`].at, 0).map(p => liveSee(p)!.x) : []);
    for (const x of [...edges, ...cards]) assert.ok(Math.abs(x - mid) < half, `plats ${seat}: ${x.toFixed(0)} px, synligt ${(mid - half).toFixed(0)}–${(mid + half).toFixed(0)}`);
  }
});
