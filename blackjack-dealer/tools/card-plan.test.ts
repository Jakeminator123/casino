// Skyddar: kontrakten, hans domar och val – inspelningen ritar alltid ett riktigt kort, och planen, spelet och scenen ritar samma kort med standardens mått, i den form och under den lins han valt.
// The card plan drawn in the real perspective (src/card-plan.ts): on "Plant bord" each card is a real card through the table's
// lens at its own place (size and place), as the recording always has it (Jakob 2026-11-26); the game draws it in the look's
// Kortens form (CARD_TAPER, one keystone rule for every card); the plan's own rule elsewhere. Needs no media; the plan is the
// model's start proposal (with seat 4's and the dealer's first cards where placements/default.json had them on 2026-11-17),
// so the test holds after Jakob saves his.
// Run: node --test tools/card-plan.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGETS, defaultPlan, planQuad, toPixels, validatePlan, type PlacementPlan } from '../src/placement-model.ts';
import { TABLE_LENS, quadMeasure, realCardQuad, type Pixel } from '../src/table-lens.ts';
import { CARD_TAPER, filmToPlan, planCardQuad, planToFilm, screenMeasure, throughLens } from '../src/card-plan.ts';
import { planQuad as orderQuad } from './order-images.ts';
import { readFile } from 'node:fs/promises';
import { VIEWS, quad } from '../src/placement-model.ts';
import { CARD, FILM, SEAT_FOUR_CARD, cardCorners, feltToPixel, inFrame, lensForFocal, pixelToFelt, planPixel, type Lens, type Vec3 } from '../src/table-lens.ts';
import { LINS, PLAN_CARD_SIZE, cardGrow, cardPlace, keystone, linsOfAlias, planCardAt, planCardFrom, planShape } from '../src/card-plan.ts';
import { planScene, poseAt, restingQuad, sceneOf, type CardTrack } from '../src/card-overlay.ts';
import { placedCards } from '../src/game-film.ts';
import { createLayout, slotLabel, type Slot, type TableCards } from '../src/game-table.ts';
import { BET, betSpots, cameraFromContract, cardSpots, edgeRowOf, filmPixel, filmToTable, lensCamera, ringOffset, solveCamera, spotToScene, viewUnder, type FilmCamera } from '../src/scene3d-geometry.ts';

const near = (a: number, b: number, tolerance: number, what: string) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} is not within ${tolerance} of ${b}`);
const plan = (): PlacementPlan => { const p = defaultPlan(); validatePlan(p); return p; };
/** The plan drawn card by card (its table taken off "Plant bord"). */
const cardByCard = (p: PlacementPlan): PlacementPlan => ({ ...p, tableProjection: { ...p.tableProjection, mode: 'individual', heading: 0 } });
/** A real card at the plan's place through the real camera, in plan pixels: the size and place every value must keep. */
const realOf = (p: PlacementPlan, id: string) => realCardQuad(planToFilm(toPixels(p.targets[id].geometry.native, 'native')), 0, 1, TABLE_LENS)!.map(filmToPlan);
const same = (a: Pixel, b: Pixel, what: string) => { near(a.x, b.x, 1e-6, `${what} x`); near(a.y, b.y, 1e-6, `${what} y`); };

test('on "Plant bord" every card is a real card (grow 1) through the table lens at its own place; Kortens form at 96 % is that card', () => {
  const p = plan();
  assert.equal(throughLens(p, 'native'), true);
  for (const id of TARGETS) {
    assert.deepEqual(planCardQuad(p, id, 'native'), realOf(p, id), id);
    assert.deepEqual(planCardQuad(p, id, 'native', TABLE_LENS, CARD_TAPER.max), realOf(p, id), `${id} at 96 %`);
    near(quadMeasure(realOf(p, id)).taper, 0.956, 0.01, `${id} taper`);
  }
  // a card's size follows from its place: the plan's own width draws nothing on the real perspective
  const wider = structuredClone(p); wider.targets['P4.C1'].geometry.native.width *= 1.5; wider.targets['P2.C1'].geometry.native.width *= 0.5;
  assert.deepEqual(planCardQuad(wider, 'P2.C1', 'native'), planCardQuad(p, 'P2.C1', 'native'));
  // nearer the dealer the cards grow against the plan's old plane, as the 3D lane measured (dealer3d, 2026-11-17)
  const grows = (id: string) => quadMeasure(planCardQuad(p, id, 'native')).near / quadMeasure(planQuad(p, id, 'native')).near;
  assert.ok(grows('D.C1') > grows('P4.C1') + 0.15, `the dealer's card grows more than seat 4's: ${grows('D.C1')}`);
});

// placements/default.json on 2026-11-17: seat 4's and the dealer's first card, with seat 4's
// stored taper (0.87 since 11 Nov, his plan's shape), and the near edge the real camera gives the dealer's card (75.1 px).
const HIS = { 'P4.C1': { u: 0.4858844998096943, v: 0.06106632779165577 }, 'D.C1': { u: 0.48239636570130606, v: 0.2097186700767263 } };
const his = (): PlacementPlan => {
  const p = plan();
  for (const [id, at] of Object.entries(HIS)) Object.assign(p.targets[id].geometry.native, at, { angle: 0 });
  p.targets['P4.C1'].geometry.native.taper = 0.87;
  return p;
};

test('Kortens form is only the shape: at every value every card keeps the real camera\'s near edge, depth and place', () => {
  for (const v of [undefined, CARD_TAPER.max, 0.91, CARD_TAPER.chosen, CARD_TAPER.min]) {
    const p = his();
    for (const id of TARGETS) {
      const q = planCardQuad(p, id, 'native', TABLE_LENS, v), real = realOf(p, id);
      same(q[2], real[2], `${id} at ${v}: near right corner`); same(q[3], real[3], `${id} at ${v}: near left corner`);
      near(q[0].y, real[0].y, 1e-6, `${id} at ${v}: far edge's height`); near(q[1].y, real[1].y, 1e-6, `${id} at ${v}: far edge's height`);
      const m = screenMeasure(q), r = screenMeasure(real);
      near(m.near, r.near, 1e-6, `${id} at ${v}: near edge`);
      assert.ok(m.far <= r.far * 1.005, `${id} at ${v}: the far edge is never wider than a real card's (${m.far} against ${r.far})`);
    }
    // the dealer's cards are as wide at every value: 75.1 px at the dealer's first card
    near(screenMeasure(planCardQuad(p, 'D.C1', 'native', TABLE_LENS, v)).near, 75.1, 0.15, `the dealer's card at ${v}`);
  }
});


// ---- one geometry for the table ----------------------------------------------------------------------------------------------
// The same plan and the same card give the same outline in the lab's card plan, in the game's lying cards, in the drawn card at
// rest and in the 3D scene's projection of its card place, also when the lens or the picture's size is changed. Every plan
// here is built by the test: nothing reads placements/default.json, which is Jakob's and changes when he saves.
const contract = JSON.parse(await readFile('data/scene-contract.json', 'utf8')), EDGE_ROW = edgeRowOf(contract);
/** The tolerance the outlines are held to: a hundredth of a film pixel (1764 x 1174), for every corner. */
const TOLERANCE = 0.01;
const dist = (a: Pixel, b: Pixel) => Math.hypot(a.x - b.x, a.y - b.y);
const outlines = (a: readonly Pixel[], b: readonly Pixel[], what: string, within = TOLERANCE) => { assert.equal(a.length, b.length, what); a.forEach((p, i) => assert.ok(dist(p, b[i]) <= within, `${what}: corner ${i} is ${dist(p, b[i]).toFixed(5)} px off (allowed ${within})`)); };

// A plan as Jakob's is built (seats mirrored about the middle, the dealer's two cards centred, "Plant bord"), with places of the
// test's own; and the same plan drawn card by card ("individual").
function testPlan(heading = 0): PlacementPlan {
  const plan = defaultPlan(), rows = [0.164, 0.131, 0.098, 0.061];
  for (let seat = 1; seat <= 7; seat++) for (const second of [false, true]) {
    const k = Math.abs(seat - 4), u = 0.5 + (seat - 4) * 0.1176 + (second ? 0.0282 : -0.0141), v = rows[3 - k] + (second ? 0.009 : 0);
    Object.assign(plan.targets[`P${seat}.C${second ? 2 : 1}`].geometry.native, {u, v, width: 0.0492, height: 0.0612, taper: 0.87});
  }
  for (const [id, u] of [['D.C1', 0.4824], ['D.C2', 0.5176]] as const) Object.assign(plan.targets[id].geometry.native, {u, v: 0.2097, width: 0.0492, height: 0.0612, taper: 0.87});
  const out: PlacementPlan = {...plan, tableProjection: {mode: 'flat', heading}};
  validatePlan(out); return out;
}
const slotOfTarget = (id: string): Slot => ({owner: id[0] === 'D' ? 'D' : 'P', seat: id[0] === 'D' ? 0 : Number(id[1]), hand: 0, hands: 1, index: Number(id.at(-1)) - 1});
const headingOf = (plan: PlacementPlan) => ((plan.tableProjection?.heading ?? 0) + plan.targets['P4.C1'].geometry.native.angle) * Math.PI / 180;

// The four ways one card of the plan is drawn in the look's Kortens form (`taper`), each in film pixels and in the card's own corner order.
function ways(plan: PlacementPlan, id: string, lens: Lens = TABLE_LENS, taper: number = CARD_TAPER.chosen) {
  const lab = planCardQuad(plan, id, 'native', lens, taper).map(planToFilm);
  const game = createLayout(plan, {lins: 'standard', lens, taper}).quad(slotOfTarget(id));
  const rest = restingQuad(planScene(null, plan, lens, taper), game, 1).quad;
  // the 3D scene: the card place laid on the felt by the scene's film camera (cardSpots, dealer metres), a real card there in the
  // scene's metres, its corners through the scene's own projection (filmPixel), in the look's shape
  const camera = lensCamera(lens, EDGE_ROW), spot = cardSpots(plan, camera).find(s => s.id === id)!;
  const centre = spotToScene(camera, spot.x, spot.s) as Vec3, corners = cardCorners(centre, headingOf(plan)).map(p => filmPixel(camera, p)!);
  const scene = keystone(corners, filmPixel(camera, centre)!.x, planShape(plan, lens, taper));
  return {lab, game, rest, scene};
}

const taperAt = (p: PlacementPlan, taper?: number, id = 'P4.C1') => { const m = screenMeasure(planCardQuad(p, id, 'native', TABLE_LENS, taper)); return m.far / m.near; };
test('Kortens form: seat 4\'s far edge is the chosen share of its near edge, his 87 % the look\'s default, within 80 to 96 %', () => {
  for (const v of [0.91, 0.87, 0.84, CARD_TAPER.min]) near(taperAt(his(), v), v, 0.002, `seat 4 at ${v}`);
  near(taperAt(his(), CARD_TAPER.max), 0.956, 0.002, '96 %: a real card\'s own shape');
  assert.ok(taperAt(his(), CARD_TAPER.chosen, 'P1.C1') < 0.93 && taperAt(his(), CARD_TAPER.chosen, 'D.C1') < 0.93, 'the shape narrows the cards further off too');
  // held to the key's range: wider than a real card is a real card, narrower than 80 % is 80 %
  near(taperAt(his(), 1.2), 0.956, 0.002, 'above 96 %'); near(taperAt(his(), 0.5), CARD_TAPER.min, 0.002, 'below 80 %');
  // his 87 %, the share his plan drew the game's cards with: the look's default, which the game's layout and the drawn card at
  // rest draw with when none is given
  assert.equal(CARD_TAPER.chosen, 0.87);
  for (const id of ['P1.C1', 'P4.C1', 'D.C1']) {
    const his87 = planCardQuad(his(), id, 'native', TABLE_LENS, 0.87).map(planToFilm);
    assert.deepEqual(createLayout(his(), {lins: 'standard'}).quad(slotOfTarget(id)), his87, id);
    outlines(restingQuad(planScene(null, his()), his87, 1).quad, his87, `${id} at rest`);
  }
});

test('the recording always has a real card (Jakob 2026-11-26): Inspelning\'s rule and an order\'s last picture, whatever the plan stores', () => {
  // seat 4's stored taper (his 0.87, a straight one, a very narrow one) and a Bordets perspektiv saved before 2026-11-26
  for (const stored of [0.87, 1.2, 0.5]) for (const perspective of [undefined, 0.84, 0.8]) {
    const p = his(); p.targets['P4.C1'].geometry.native.taper = stored;
    if (perspective !== undefined) (p.tableProjection as Record<string, unknown>).perspective = perspective;
    const what = `seat 4 stores ${stored}, the table ${perspective ?? 'nothing'}`;
    for (const id of TARGETS) {
      assert.deepEqual(planCardQuad(p, id, 'native'), realOf(p, id), `${id}, ${what}: Inspelning`);
      outlines(orderQuad(p, id).map(([x, y]) => ({x, y})), realOf(p, id).map(planToFilm), `${id}, ${what}: an order's last picture`, 1e-9);
    }
    near(taperAt(p), 0.956, 0.002, `${what}: seat 4 is a real card`);
  }
});

test('the default lens is the film\'s own, the one Jakob chose in comparison B; the older word is read as an alias only', () => {
  // Changing this line of src/card-plan.ts is his yes. The card plan, Inspelning and every order always follow 'standard'.
  assert.equal(LINS, 'standard');
  assert.equal(linsOfAlias('lins'), 'standard'); assert.equal(linsOfAlias('kontrakt'), 'bred');
  // the alias knows the two older words and nothing else: not the key's own values, and no name of Object's
  for (const word of ['annat', '', 'bred', 'standard', 'constructor', '__proto__', 'toString', null, undefined, 1]) assert.equal(linsOfAlias(word), null, String(word));
});

test('pixel and metre, in one place: the scene\'s film camera from the lens is the lens', () => {
  const camera = lensCamera(TABLE_LENS, EDGE_ROW), solved = solveCamera(camera);
  assert.equal(camera.scale, 1); assert.equal(camera.source, 'lens');
  assert.ok(Math.abs(solved.pitch - TABLE_LENS.pitch) < 1e-12); assert.ok(Math.abs(solved.edgeDistance - 1.844) < 0.001, `the dealer's edge ${solved.edgeDistance.toFixed(4)} m from the camera`);
  for (const pixel of [{x: 236, y: 980.7}, {x: 856.6, y: 1102.2}, {x: 1489, y: 981}, {x: 850.4, y: 927.6}, {x: 881.5, y: 831.5}, {x: 40, y: 1160}]) {
    const felt = pixelToFelt(pixel)!, table = filmToTable(camera, pixel.x, pixel.y)!;
    assert.ok(Math.hypot(felt[0] - table.x, felt[2] - table.z) < 1e-9 && Math.abs(felt[1]) < 1e-12, 'the scene lays the pixel on the felt where the lens does');
    assert.ok(dist(feltToPixel(felt)!, pixel) < 1e-9, 'and back'); assert.ok(dist(filmPixel(camera, felt)!, pixel) < 1e-9, 'through the scene\'s own projection too');
    const lifted: Vec3 = [felt[0], 0.12, felt[2] - 0.3]; assert.ok(dist(filmPixel(camera, lifted)!, feltToPixel(lifted)!) < 1e-9, 'a point over the felt as well');
  }
  assert.equal(pixelToFelt({x: 800, y: -600}), null, 'above the horizon there is no felt');
  // a card place of the plan lies where the plan's pixel is, in metres, and a bet ring a fixed real distance in front of it
  const plan = testPlan(), spots = cardSpots(plan, camera), edge = -solved.edgeDistance;
  for (const id of ['P1.C1', 'P4.C1', 'P7.C2', 'D.C1']) { const spot = spots.find(s => s.id === id)!, felt = pixelToFelt(planPixel(plan.targets[id].geometry.native))!;
    assert.ok(Math.hypot(spot.x - felt[0], spot.s - (felt[2] - edge)) < 1e-9, id); }
  const bet = betSpots(plan, camera).find(b => b.id === 'P4')!, card = spots.find(s => s.id === 'P4.C1')!;
  // under the lens the ring's offset is the one for a real card (ringOffset: half the card, the ring's radius and BET.clear): the
  // ring lies clear of the card's near edge, where it has always lain under Standard
  const offset = ringOffset(camera, card); near(offset, 0.083, 1e-12, 'the ring\'s offset under the lens');
  assert.ok(Math.abs(bet.s - card.s - offset) < 1e-12 && bet.x === card.x);
  assert.ok(offset - BET.radius - CARD.height / 2 >= 0.01, 'at least a centimetre of felt between a real card and the ring');
});

test('a turn given as the lens reads it comes back as the contract writes it', () => {
  const lens = lensCamera(TABLE_LENS, EDGE_ROW), contract: FilmCamera = {focalPx: 886, horizonRow: 547.8, edgeRow: EDGE_ROW, heightM: 0.493, scale: 2, source: 'contract'};
  const written = viewUnder(contract, lens, {yaw: 9, pitch: 0, dx: 0, dy: 0, dz: 0}), back = viewUnder(lens, contract, written);
  assert.ok(Math.abs(back.yaw - 9) < 1e-9); assert.ok(written.yaw > 22 && written.yaw < 23, `9 degrees under the lens is ${written.yaw.toFixed(2)} as written`);
});

test('the same plan, the same card and the same form: card plan, game, drawn card at rest and the scene\'s projection give one outline', () => {
  for (const [plan, taper] of [[testPlan(), CARD_TAPER.chosen], [testPlan(), 0.9], [testPlan(), CARD_TAPER.max], [testPlan(), CARD_TAPER.min], [testPlan(15), CARD_TAPER.chosen]] as const) for (const id of TARGETS) {
    const w = ways(plan, id, TABLE_LENS, taper), what = `${id} at Kortens form ${taper}, heading ${plan.tableProjection?.heading}`;
    outlines(w.game, w.lab, `game, ${what}`, 1e-9); outlines(w.rest, w.lab, `drawn card at rest, ${what}`); outlines(w.scene, w.lab, `scene, ${what}`);
  }
  // at 96 % the game's card is the recording's: the real card Inspelning and an order draw
  for (const id of TARGETS) outlines(ways(testPlan(), id, TABLE_LENS, CARD_TAPER.max).game, planCardQuad(testPlan(), id, 'native').map(planToFilm), `${id}: the game at 96 % is the recording's card`, 1e-9);
  // and it is the rule the lab had: a real card, 63 x 88 mm, at the card's own place (the outline's sides on the felt)
  const plan = testPlan(), q = planCardQuad(plan, 'P2.C1', 'native').map(planToFilm).map(p => pixelToFelt(p)!), side = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
  assert.ok(Math.abs(side(q[0], q[1]) - CARD.width) < 1e-4 && Math.abs(side(q[1], q[2]) - CARD.height) < 1e-4);
});

test('when the camera changes, all of them change together', () => {
  const plan = testPlan(), lenses: Lens[] = [lensForFocal(SEAT_FOUR_CARD, 1270), lensForFocal(SEAT_FOUR_CARD, 3200), {...TABLE_LENS, height: 1.3}, {...TABLE_LENS, pitch: 0.5, focalPx: 2000}];
  for (const lens of lenses) {
    let moved = 0;
    for (const id of TARGETS) { const w = ways(plan, id, lens, 0.9), what = `${id} under focal ${Math.round(lens.focalPx)}, height ${lens.height.toFixed(2)}`;
      outlines(w.game, w.lab, `game, ${what}`, 1e-9); outlines(w.rest, w.lab, `drawn card at rest, ${what}`); outlines(w.scene, w.lab, `scene, ${what}`);
      moved = Math.max(moved, ...w.lab.map((p, i) => dist(p, ways(plan, id, TABLE_LENS, 0.9).lab[i]))); }
    assert.ok(moved > 2, 'another lens draws another card somewhere on the table');
  }
});

test('when the picture\'s size changes, all of them change together', () => {
  const plan = testPlan();
  // the plan's own view is 1762 wide and the film 1764: one conversion, and the game uses it
  for (const p of [{x: 0, y: 0}, {x: 1761, y: 1173}, {x: 412.3, y: 977.1}]) { assert.ok(dist(planToFilm(p), inFrame(p, FILM, VIEWS.native)) < 1e-9); assert.ok(dist(filmToPlan(planToFilm(p)), p) < 1e-9); }
  for (const frame of [{width: 882, height: 587}, {width: 1762, height: 1174}, {width: 1280, height: 852}, {width: 3528, height: 2348}]) for (const id of ['P1.C1', 'P4.C1', 'P4.C2', 'P7.C1', 'D.C1', 'D.C2']) {
    const w = ways(plan, id), to = (q: Pixel[]) => q.map(p => inFrame(p, frame)), k = (frame.width - 1) / (FILM.width - 1);
    outlines(to(w.game), to(w.lab), `game, ${id} at ${frame.width}`, TOLERANCE * k); outlines(to(w.rest), to(w.lab), `rest, ${id} at ${frame.width}`, TOLERANCE * k); outlines(to(w.scene), to(w.lab), `scene, ${id} at ${frame.width}`, TOLERANCE * k);
    // the card keeps its proportions: its sides against the picture's width are the same in every size
    const wide = (q: Pixel[], width: number) => dist(q[2], q[3]) / (width - 1);
    assert.ok(Math.abs(wide(to(w.game), frame.width) - wide(w.lab, FILM.width)) < 1e-9, `${id}: the near edge is the same share of the picture at ${frame.width}`);
  }
});

test('extra cards, split hands and the dealer\'s third card go the same way: a real card at the place the game makes up', () => {
  const plan = testPlan(), layout = createLayout(plan, {lins: 'standard', taper: 0.9}), shape = planShape(plan, TABLE_LENS, 0.9), scene = planScene(sceneOf(contract), plan, TABLE_LENS, 0.9);
  const slots: Slot[] = [{owner: 'P', seat: 4, hand: 0, hands: 1, index: 2}, {owner: 'P', seat: 4, hand: 0, hands: 1, index: 4}, {owner: 'P', seat: 4, hand: 1, hands: 2, index: 0}, {owner: 'P', seat: 1, hand: 2, hands: 3, index: 1},
    {owner: 'P', seat: 7, hand: 1, hands: 2, index: 3}, {owner: 'D', seat: 0, hand: 0, hands: 1, index: 2}, {owner: 'D', seat: 0, hand: 0, hands: 1, index: 4}];
  for (const slot of slots) {
    const q = layout.quad(slot), at = cardPlace(q, shape)!, what = slotLabel(slot);
    // the look's shape undone, the outline is a card of 63 x 88 mm on the felt, lying as every other card of the table
    const real = q.map(p => ({x: at.place.x + (p.x - at.place.x) / (1 - shape * (Math.max(...q.map(c => c.y)) - p.y)), y: p.y})).map(p => pixelToFelt(p)!), side = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
    assert.ok(Math.abs(side(real[0], real[1]) - CARD.width) < 1e-6 && Math.abs(side(real[1], real[2]) - CARD.height) < 1e-6, `${what} is a real card`);
    assert.ok(Math.abs(at.heading - headingOf(plan)) < 1e-6 && !at.turned && !at.mirrored, `${what} lies as the table's cards lie`);
    // and it is the rule at that place, as a card of the plan has it; the drawn card at rest is the same outline
    outlines(q, planCardFrom(q, shape)!.quad, `${what}, the rule at its place`); outlines(restingQuad(scene, q, 1).quad, q, `${what}, drawn at rest`);
  }
  // the first hand of a split keeps the seat's own place and outline
  outlines(layout.quad({owner: 'P', seat: 4, hand: 0, hands: 2, index: 0}), layout.quad(slotOfTarget('P4.C1')), 'P4.H1.C1', 1e-6);
});

test('card one lies unchanged when card two comes, and after a third card and a split', () => {
  const plan = testPlan(), records = [1, 5, 9, 13].map(shoeDraw => ({shoeDraw, target: 'P4', r: '7', s: 'hearts'}));
  for (const lins of ['bred', 'standard'] as const) {
    const layout = createLayout(plan, {lins}), scene = lins === 'standard' ? planScene(sceneOf(contract), plan) : sceneOf(contract)!;
    const lying = (table: TableCards, cards: number[]) => placedCards(table, records, cards, layout);
    const one = lying({hands: [{seat: 4, cards: [1]}], dealer: []}, [1]), two = lying({hands: [{seat: 4, cards: [1, 5]}], dealer: [3]}, [1, 5]), three = lying({hands: [{seat: 4, cards: [1, 5, 9]}], dealer: [3, 7]}, [1, 5, 9]);
    const split = lying({hands: [{seat: 4, cards: [1, 9]}, {seat: 4, cards: [5, 13]}], dealer: [3, 7]}, [1, 5, 9, 13]);
    assert.equal(one[0].target, 'P4.C1'); assert.deepEqual(two.map(p => p.target), ['P4.C1', 'P4.C2']); assert.deepEqual(split.map(p => p.target), ['P4.H1.C1', 'P4.H2.C1', 'P4.H1.C2', 'P4.H2.C2']);
    assert.deepEqual(two[0].quad, one[0].quad, `${lins}: card one's place when card two lies there too`); assert.deepEqual(three[0].quad, one[0].quad); assert.deepEqual(three[1].quad, two[1].quad, 'and card two when card three comes');
    outlines(split[0].quad, one[0].quad, `${lins}: card one after the split`, 1e-6);
    // what is drawn: the lying card of a later film is the card the dealt one came to rest as, at every card size
    for (const scale of [1, 1.2, 1.65]) {
      const drawn = (p: {quad: Pixel[]}) => restingQuad(scene, p.quad, scale).quad;
      outlines(drawn(two[0]), drawn(one[0]), `${lins}, size ${scale}: card one as drawn`, 0); outlines(drawn(three[0]), drawn(one[0]), `${lins}, size ${scale}`, 0);
      const land = one[0].quad, c = {x: land.reduce((s, p) => s + p.x, 0) / 4, y: land.reduce((s, p) => s + p.y, 0) / 4}, film = [[-41, -36], [41, -36], [41, 36], [-41, 36]].map(([x, y]) => [c.x + x + 6, c.y + y - 4]);
      const track: CardTrack = {width: 1764, height: 1174, edgeWindow: null, restFrom: 20, restQuad: film, frames: Array.from({length: 30}, (_, i) => ({frame: i, side: i < 8 ? 'BACK' as const : 'FRONT' as const, quad: i >= 20 ? film : film.map(([x, y]) => [x + (20 - i) * 9, y - (20 - i) * 6]), edge: null, confidence: 0.9}))};
      outlines(poseAt(track, scene, 25, scale, 12, null, land)!.quad!, drawn(one[0]), `${lins}, size ${scale}: the dealt card at rest is the lying card of the next film`, 1e-6);
    }
  }
});

test('the drawn card by the plan\'s rule: size 1 is the game\'s own outline, another size is that many times a real card at the same place', () => {
  const plan = testPlan(), shape = planShape(plan, TABLE_LENS, 0.9), scene = planScene(sceneOf(contract), plan, TABLE_LENS, 0.9), lab = planCardQuad(plan, 'P2.C1', 'native', TABLE_LENS, 0.9).map(planToFilm), place = cardPlace(lab, shape)!;
  assert.ok(dist(place.place, planToFilm({x: plan.targets['P2.C1'].geometry.native.u * 1761, y: (1 - plan.targets['P2.C1'].geometry.native.v) * 1173})) < 1e-6, 'the outline\'s place is the plan\'s place');
  // from whichever corner the outline is listed, and the other way round, the card is the same card (turned says which corner is its first)
  for (let turn = 0; turn < 4; turn++) for (const mirror of [false, true]) {
    const listed = (mirror ? [lab[1], lab[0], lab[3], lab[2]] : lab).map((_, i, q) => q[(i + turn) % 4]), back = restingQuad(scene, listed, 1);
    assert.equal(back.turned, turn % 2 === 1, `listed from corner ${turn}${mirror ? ', mirrored' : ''}`);
    for (const p of back.quad) assert.ok(lab.some(q => dist(p, q) < TOLERANCE), 'every corner is a corner of the plan\'s outline');
    assert.equal(cardPlace(back.quad, shape)!.turned, false, 'and its first side is one of the card\'s short ones (on the felt; in the picture the long sides are foreshortened)');
  }
  for (const scale of [0.8, 1.2, 1.38, 2]) {
    const q = restingQuad(scene, lab, scale).quad, at = cardPlace(q, shape)!, near = Math.max(...q.map(p => p.y));
    assert.ok(dist(at.place, place.place) < TOLERANCE, `size ${scale}: the card stays on its place`);
    const felt = q.map(p => ({x: at.place.x + (p.x - at.place.x) / (1 - shape * (near - p.y)), y: p.y})).map(p => pixelToFelt(p)!), side = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
    assert.ok(Math.abs(side(felt[0], felt[1]) - CARD.width * scale) < 1e-5 && Math.abs(side(felt[1], felt[2]) - CARD.height * scale) < 1e-5, `size ${scale}: ${scale} times a real card`);
  }
  // a plan drawn card by card has no lens: the outline it is given is the card, enlarged about its middle
  const own = cardByCard(plan), stored = planCardAt(own, own.targets['P3.C1'].geometry.native, 'native').map(planToFilm);
  outlines(stored, quad(own.targets['P3.C1'].geometry.native, 'native').map(planToFilm), 'the plan\'s own rule', 0);
  outlines(restingQuad(planScene(null, own), stored, 1).quad, stored, 'individual, size 1', 1e-9);
  const twice = restingQuad(planScene(null, own), stored, 2).quad; assert.ok(Math.abs(dist(twice[0], twice[1]) - 2 * dist(stored[0], stored[1])) < 1e-9);
});

test('the same settings give the same picture under the lens: a framing written for the contract\'s camera', () => {
  const written = cameraFromContract(contract), camera = lensCamera(TABLE_LENS, EDGE_ROW), rad = Math.PI / 180;
  assert.deepEqual(viewUnder(written, written, {yaw: 12, pitch: -8, dx: 0.1, dy: 0.2, dz: -0.3}), {yaw: 12, pitch: -8, dx: 0.1, dy: 0.2, dz: -0.3});
  const v = viewUnder(camera, written, {yaw: 12, pitch: -8, dx: 0.1, dy: 0.2, dz: -0.3});
  // a turn moves the film frame as far in the picture: the game's lying framing (pitch -8) is 3 degrees under the lens
  assert.ok(Math.abs(camera.focalPx * Math.tan(v.pitch * rad) - written.focalPx * Math.tan(-8 * rad)) < 1e-9); assert.ok(Math.abs(v.pitch + 3.05) < 0.01, `pitch ${v.pitch.toFixed(3)}`);
  assert.ok(Math.abs(camera.focalPx * Math.tan(v.yaw * rad) - written.focalPx * Math.tan(12 * rad)) < 1e-9);
  // a move keeps its length in dealer metres: the contract's world is twice the dealer's
  assert.ok(Math.abs(v.dx - 0.05) < 1e-12 && Math.abs(v.dy - 0.1) < 1e-12 && Math.abs(v.dz + 0.15) < 1e-12);
});

test('Kortens storlek is a share of the plan\'s card in both geometries: the scene\'s default is a real card under the lens', () => {
  assert.equal(cardGrow(PLAN_CARD_SIZE, 'standard'), 1); assert.equal(cardGrow(1.65, 'standard'), 1.65 / PLAN_CARD_SIZE); assert.equal(cardGrow(PLAN_CARD_SIZE, 'bred'), PLAN_CARD_SIZE); assert.equal(cardGrow(2, 'bred'), 2);
  // so the game's card at its default size is the plan's outline in the look's form; at 96 % the real card the studio's Inspelning draws
  const plan = testPlan();
  for (const taper of [CARD_TAPER.chosen, CARD_TAPER.max]) {
    const layout = createLayout(plan, {lins: 'standard', taper}), scene = planScene(sceneOf(contract), plan, TABLE_LENS, taper);
    for (const id of ['P1.C1', 'P4.C1', 'P6.C2', 'D.C2']) outlines(restingQuad(scene, layout.quad(slotOfTarget(id)), cardGrow(PLAN_CARD_SIZE, 'standard')).quad, planCardQuad(plan, id, 'native', TABLE_LENS, taper).map(planToFilm), `${id} at ${taper}`);
  }
  // and by the contract the same setting is the older plan's outline at seat 4 within a twentieth (why 1.2 was the default)
  const older = createLayout(plan, {lins: 'bred'}).quad(slotOfTarget('P4.C1')), drawn = restingQuad(sceneOf(contract)!, older, cardGrow(PLAN_CARD_SIZE, 'bred')).quad, wide = (q: Pixel[]) => Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y);
  near(wide(drawn) / wide(older), 1, 0.05, 'the contract\'s card at 1.2 against the older plan\'s card at seat 4');
});
