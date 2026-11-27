// Reads the game's own measures out of blackjack-dealer's code and writes them as one JSON file: the numbers that
// scen/gen_standard.py turns into scen/standard.yaml. It only reads. The game is found beside this project in the
// repo (../blackjack-dealer), never by a path to one computer.
//   node scen/las_spelet.ts <out.json>
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const game = path.resolve(import.meta.dirname, '..', '..', 'blackjack-dealer');
const load = (file: string) => import(pathToFileURL(path.join(game, file)).href);
const out = process.argv[2];
if (!out) { console.error('Skriv så här: node scen/las_spelet.ts <utfil.json>'); process.exit(1); }

// The film's standard: the lens, the card, the shoe, the plan's card places, the seats' eyes and the dolls.
const lensFile = await load('src/table-lens.ts');
const world = await load('dealer3d/src/world.ts');
const doll = await load('dealer3d/src/doll.ts');
const body = await load('dealer3d/src/body.ts');
const plan = JSON.parse(readFileSync(path.join(game, 'placements', 'default.json'), 'utf8'));
const lens = lensFile.TABLE_LENS, eye = lensFile.filmEye(lens);
const seatEyes: Record<number, unknown> = {};
for (let seat = 1; seat <= 7; seat++) { try { seatEyes[seat] = world.seatEye(seat, plan, lens); } catch (error) { seatEyes[seat] = String(error); } }
// The play view (table-lens.ts PLAY_LENS, Jakob 2026-11-26): the camera the standard doll is filmed through, at seat 4,
// and the same view from every other seat (table-lens.ts seatView).
const playEye = lensFile.filmEye(lensFile.PLAY_LENS), firstCards = world.spots(plan, lens), fourth = firstCards.find((s: any) => s.id === 'P4.C1');
const playSeatEyes: Record<number, unknown> = {};
for (let seat = 1; seat <= 7; seat++) { const own = firstCards.find((s: any) => s.id === `P${seat}.C1`);
  playSeatEyes[seat] = own && fourth ? (seat === 4 ? playEye : lensFile.seatView(playEye, own.at, fourth.at, world.dealerEdge(lens))) : `The plan has no first card for seat ${seat}.`; }
const shoePose = lensFile.shoePose(lens, lensFile.SHOE), planShoe = lensFile.planPixel(plan.shoe.native);
const measures = (d: any) => ({upperArm: d.upperArm, forearm: d.forearm, reach: d.reach, hipBelowFelt: d.hipBelowFelt, mostLean: d.mostLean, mostTwist: d.mostTwist});
const spelet = {
  lens, fittedLens: world.filmLens(), FILM: lensFile.FILM, CARD: lensFile.CARD, SHOE: lensFile.SHOE, DOLL_TABLE: lensFile.DOLL_TABLE,
  filmEye: eye, dealerEdge: world.dealerEdge(lens), playLens: lensFile.PLAY_LENS, playEye, playSeatEyes,
  targets: Object.fromEntries(Object.entries(plan.targets).map(([id, t]: [string, any]) => [id, t.geometry.native])),
  planShoe: plan.shoe, spots: world.spots(plan, lens), seatEyes,
  shoePose, shoeCard: lensFile.shoeCard(shoePose, lensFile.SHOE), shoeAtPlan: lensFile.onPlane(eye, planShoe.x, planShoe.y),
  standard: {measures: {...measures(doll.STANDARD), place: doll.STANDARD.place}, frame: doll.dollFrame(lens, doll.STANDARD)},
  paow: {measures: {...measures(doll.PAOW), place: doll.PAOW.place.kind, behindEdge: doll.PAOW.place.behindEdge}, frame: doll.dollFrame(lens, doll.PAOW)},
  restingHand: body.restingHand(lens), ASSUMED: world.ASSUMED,
};

// The tables: the game's standard table and BORD-02, the tray, the chips and the bet rings.
const bord02 = await load('src/scene3d-bord02.ts');
const table = await load('src/scene3d-table.ts');
const optional = (file: string) => load(file).catch((error: unknown) => ({failed: String(error)}));
const gameProps = await optional('src/game3d-props.ts'), sceneProps = await optional('src/scene3d-props.ts'), chips = await optional('src/game3d-chips.ts');
const geometry = await load('src/scene-geometry.ts');
const scale = bord02.bord02Scale(table.tableUnder({source: 'lens'}, 1));
const notch = gameProps.trayNotch ? gameProps.trayNotch() : null;
const bord = {
  scale, BORD02: bord02.BORD02, BASE: table.BASE, TABLE: table.TABLE, REAL_TABLE: table.REAL_TABLE, PRINT: table.PRINT,
  outline: bord02.bord02Outline(scale).points, outlineNotched: notch ? bord02.bord02Outline(scale, notch).points : null, notch,
  TRAY_PLACE: gameProps.TRAY_PLACE ?? gameProps.failed, TRAY: sceneProps.TRAY ?? sceneProps.failed,
  CHIP_RADIUS: chips.CHIP_RADIUS ?? chips.failed, CHIP_HEIGHT: chips.CHIP_HEIGHT, BET: geometry.BET,
};

// The live table's set-up beside the standard (src/table-live.ts, measured on film): scen/standard.yaml livebord, built
// by scen/bygg_bord.py --live. Its own lens world: the live camera straight over the origin.
const liveFile = await load('src/table-live.ts');
const live = {
  LIVE: liveFile.LIVE, frame: liveFile.liveFrame(), shoePose: liveFile.liveShoePose(), shoeCard: liveFile.liveShoeCard(), box: liveFile.liveBox(),
};

writeFileSync(out, JSON.stringify({spelet, bord, live}, null, 1));
console.log(`Spelets mått lästa: ${Object.keys(spelet.targets).length} kortplatser, linsen ${lens.height.toFixed(4)} m över filten.`);
