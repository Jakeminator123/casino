// Reads the game's own measures out of blackjack-dealer's code and writes them as one JSON file: the numbers that
// scen/gen_standard.py turns into scen/standard.yaml. It only reads. The game is found beside this project in the
// repo (../blackjack-dealer), never by a path to one computer.
//   node scen/las_spelet.ts <out.json>
// The standard is the live table (src/table-live.ts, measured on a film of a real table), the card is src/space.ts's,
// the bet ring src/standard.ts's, the chips the game's, and the dolls Danilo and Frasse (dealer3d/src/doll.ts).
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const game = path.resolve(import.meta.dirname, '..', '..', 'blackjack-dealer');
const load = (file: string) => import(pathToFileURL(path.join(game, file)).href);
const out = process.argv[2];
if (!out) { console.error('Skriv så här: node scen/las_spelet.ts <utfil.json>'); process.exit(1); }

const live = await load('src/table-live.ts'), space = await load('src/space.ts'), standard = await load('src/standard.ts');
const chips = await load('src/game3d-chips.ts'), doll = await load('dealer3d/src/doll.ts');
const LIVE = live.LIVE;
// The dolls that sit at the live table, by the names of the dealers they are made after (LIVE.dealer.styles).
const dolls: Record<string, unknown> = {};
for (const [style, d] of Object.entries(LIVE.dealer.styles) as [string, {name: string}][]) {
  const own = doll.LIVE_DOLLS?.[d.name] ?? doll[d.name.toUpperCase()];
  if (!own) throw Error(`dealer3d/src/doll.ts har ingen docka ${d.name} (livebordets stil ${style}).`);
  dolls[d.name] = {style, upperArm: own.upperArm, forearm: own.forearm, reach: own.reach, mostLean: own.mostLean, mostTwist: own.mostTwist,
    hipBelowFelt: own.hipBelowFelt, behindEdge: own.place.behindEdge, x: own.place.x, shoulderHeight: own.place.shoulderHeight};
}
const dump = {
  LIVE, frame: live.liveFrame(), shoePose: live.liveShoePose(), shoeCard: live.liveShoeCard(), box: live.liveBox(),
  CARD: space.CARD, BET: standard.BET, CHIP_RADIUS: chips.CHIP_RADIUS, CHIP_HEIGHT: chips.CHIP_HEIGHT, dolls,
};
writeFileSync(out, JSON.stringify(dump, null, 1));
console.log(`Spelets mått lästa: livebordet, ${Object.keys(LIVE.cards).length} kortplatser, kameran ${LIVE.camera.height} m över filten, dockorna ${Object.keys(dolls).join(' och ')}.`);
