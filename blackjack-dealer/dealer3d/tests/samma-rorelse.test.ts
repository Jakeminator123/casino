// Skyddar: kontrakten, beställningarna – det Inspelning visar är det en beställning filmar: dockans sida och docka-cykel.ts ger samma rörelse, ruta för ruta.
// What the page shows is what an order films (Jakob 2026-11-26: "everything must be watertight and not unnecessarily
// complicated"). dealer3d/page/docka.ts lays a deal from A2.3 through page/natural-lab.ts filmRules, filmDeal and filmed
// from the state its controls hold, and dealer3d/tools/docka-cykel.ts, which tools/doll-order.ts runs for an order, through
// the same three from the same state; a saved standard is read back by both with natural-lab.ts savedState. These hold
// that the tool's motion for a card is the chain's for the page's state, frame for frame; that a standard as the page
// saves it is laid again to the same motion; and that a card laid closed is not moved by what it does not take (a turn, a
// landing, where and when the turn begins, the hand's height, the whole deal's tempo), whatever a state or a file says.
//   node --test dealer3d/tests/samma-rorelse.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NO_STEER, placeFrom, recipeOf, type PoseFilm, type Steer, type Stored} from '../page/lay.ts';
import {NO_KNOBS, filmDeal, filmed, savedState, type FilmInput} from '../page/natural-lab.ts';
import {landingOf} from '../src/landing.ts';
import {dollNamed} from '../src/doll.ts';
import {filmLens, type Plan} from '../src/world.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8').replace(/^﻿/, ''));
const plan = read('placements/default.json') as Plan, lens = filmLens(), doll = dollNamed('paow');
/** The page's state for a card, nothing moved but what `over` says (docka.ts choose, and a slider's `set`), as the chain's input. */
function input(place: string, over: Partial<Pick<FilmInput, 'steer' | 'knobs' | 'landing' | 'turn'>> = {}): FilmInput {
  const found = placeFrom('A2.3', place) as {recipe: string}, recipe = recipeOf(found.recipe, read(`dealer3d/data/${found.recipe}.json`) as Stored);
  const pose = read(`dealer3d/data/${recipe.poseFilm ?? 'till-ankare-2-3'}.json`) as PoseFilm;
  return {plan, place, recipe, pose, doll, lens, steer: {...NO_STEER} as Steer, knobs: structuredClone(NO_KNOBS), landing: {id: 'lang'}, turn: 'forut', ...over};
}
const shown = (i: FilmInput) => filmed(filmDeal(i), i);
/** The frames as a file has them (what an order films is written as JSON). */
const framesOf = (m: {frames: unknown[]}) => JSON.parse(JSON.stringify(m.frames)) as unknown[];
/** docka-cykel.ts for a card, without his saved standard, with `flags`: the frames it writes. */
function cykel(place: string, flags: string[]) {
  const dir = mkdtempSync(path.join(tmpdir(), 'samma-rorelse-')), out = path.join(dir, 'rorelse.json');
  try { execFileSync(process.execPath, ['dealer3d/tools/docka-cykel.ts', '--to', place, '--out', out, '--doll', 'paow', '--no-standard', ...flags], {cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe']});
    return (JSON.parse(readFileSync(out, 'utf8')) as {frames: unknown[]}).frames; }
  finally { rmSync(dir, {recursive: true, force: true}); }
}

test('docka-cykel.ts filmar det sidan visar: plats 6, kort 2, med kortets fart 130 % och pekfingret på kortet', () => {
  const page = shown(input('P6.C2', {steer: {...NO_STEER, cardTempo: 1.3}, landing: {id: 'pek'}}));
  assert.deepEqual(cykel('P6.C2', ['--kortets-fart', '130', '--landning', 'pek']), framesOf(page.motion));
});

test('en standard som sidan sparar läggs till samma rörelse: plats 4, kort 1, med kortet, kroppen, axeln och landningen flyttade', () => {
  const asked = filmDeal(input('P4.C1')).lab.bodyAsked as [number, number, number];
  const page = shown(input('P4.C1', {steer: {...NO_STEER, turnLater: 4, carry: 0.06, body: [asked[0], asked[1], asked[2] + 10]}, knobs: {...NO_KNOBS, shoulderR: [0, 2]}, landing: {id: 'pek-lang', reach: 1, roll: 10}}));
  // (the lab "Spara som standard" writes, docka.ts: the steering, shoulders, elbows and landing as the chain's rules have them)
  const r = page.rules, lab = JSON.parse(JSON.stringify({steer: r.steer, naturlig: {knobs: r.knobs}, landing: landingOf({id: page.landing!.id, ...page.landing!.shaping})}));
  const s = savedState(lab), again = shown(input('P4.C1', {steer: s.steer, knobs: s.knobs, landing: s.landing, turn: s.turn}));
  assert.deepEqual(framesOf(again.motion), framesOf(page.motion));
});

test('ett stängt kort rörs inte av det det inte tar, och docka-cykel.ts lägger det likadant: dealerns kort 1', () => {
  const closed = {...NO_STEER, side: 'BACK'} as Steer;
  const plain = shown(input('D.C1', {steer: closed}));
  const odd = shown(input('D.C1', {steer: {...closed, turnNear: 0.45, turnLater: 6, carry: 0.08, tempo: 0.6}, landing: {id: 'pek', reach: 2}, turn: 'i-handen'}));
  assert.equal(odd.landing, null, 'no landing is laid on a closed card');
  assert.equal(odd.turn, null, 'no turn is laid on a closed card');
  assert.deepEqual(framesOf(odd.motion), framesOf(plain.motion));
  assert.deepEqual(cykel('D.C1', ['--sida', 'stangt']), framesOf(plain.motion));
});
