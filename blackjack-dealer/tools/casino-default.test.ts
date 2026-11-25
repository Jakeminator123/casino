// The Casino's looks against the game's own. The studio's Casino plays game.html in a frame with its saved look casino
// (studio/lib/casino.ts, studio/lib/scene-presets.ts CASINO_PRESET), and game.html lays a preset's whole look over the scene's
// DEFAULTS and the play view's Dator (src/game-look.ts lookState, src/play-view.ts). Opened on its own, game.html sets its own
// look instead (src/game-own.ts GAME_OWN) in the same play view, and Scen's base preset basgrund shows that look: held together
// here, so that a change to the game's look or framing cannot make the three differ without anyone deciding it. Read from the
// files as they stand; no media, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULTS} from '../src/scene3d-view.ts';
import {lookState, presetFrom, readLook} from '../src/game-look.ts';
import {cardsChoice} from '../src/game-film.ts';
import {trackFolder} from '../src/card-overlay.ts';
import {GAME_OWN} from '../src/game-own.ts';
import {readPlayView} from '../src/play-view.ts';
import {CASINO_TABLE, casinoSearch, gameSrc, readCasino} from '../studio/lib/casino.ts';
import {BASE, CASINO_PRESET, SHIPPED, effective, hasOwnFraming, shownState, validatePreset} from '../studio/lib/scene-presets.ts';
import {findLeaks, readRelease, scrub} from './studio-freeze.ts';

const rooms = JSON.parse(readFileSync('data/scene-rooms.json', 'utf8')).rooms as {id: string; blur?: number}[];
const basgrund = JSON.parse(readFileSync(`data/scene-presets/${BASE}.json`, 'utf8'));

test('the game by itself, the game with basgrund and Scen\'s Basgrund on Dator show the same picture under the same play view', () => {
  const blur = rooms.find(r => r.id === GAME_OWN.room)?.blur;
  assert.equal(typeof blur, 'number', `the room ${GAME_OWN.room} has no blur in data/scene-rooms.json`);
  assert.deepEqual(SHIPPED.find(p => p.name === BASE)?.state, basgrund.state, 'the shipped copy in studio/lib/scene-presets.ts');
  // the saved play view, and the game's own framings when the file cannot be read
  for (const view of [readPlayView(JSON.parse(readFileSync('data/play-view.json', 'utf8'))), readPlayView(null)]) {
    // game.html by itself (src/game-page.ts): the scene's DEFAULTS, its own settings and the play view's Dator
    const alone = {...DEFAULTS, ...GAME_OWN, blur, ...view.dator};
    // game.html in the Casino with basgrund: the play view's Dator and the picture filling the stage under the preset
    const casino = lookState(DEFAULTS, presetFrom({preset: {state: basgrund.state}})!.state, {}, () => 11, {...view.dator, format: GAME_OWN.format});
    assert.deepEqual(casino, alone, 'the game in the Casino with basgrund and the game by itself part');
    // Scen's Basgrund, shown on Dator (lib/scene-presets.ts effective and shownState)
    assert.deepEqual(shownState(effective(DEFAULTS, basgrund.state, view.dator), 'fill', view.mobil), alone, 'Scen\'s Basgrund and the game part');
  }
  // the looks that ship follow the play view: no framing and no Visa of their own
  for (const p of SHIPPED) {
    assert.equal(hasOwnFraming(p.state), false, p.name);
    assert.equal(p.state.format, undefined, p.name);
  }
});

test('the Casino opens on its editable saved look and its own table', () => {
  const look = readCasino(new URLSearchParams(''));
  assert.equal(look.forval, CASINO_PRESET);
  assert.deepEqual(look.patch, {});
  assert.equal(look.table, CASINO_TABLE);
  const src = new URL(gameSrc(look), 'http://lab');
  assert.equal(src.pathname, '/game.html');
  assert.equal(src.searchParams.get('forval'), CASINO_PRESET);
  assert.equal(src.searchParams.get('inbaddad'), '1');
  assert.equal(src.searchParams.get('table'), CASINO_TABLE);
  assert.deepEqual([...src.searchParams.keys()].sort(), ['forval', 'inbaddad', 'table'], 'no key of an experiment rides along by default');
});

test('an older Casino address\'s lens word reaches the game in the frame as the key lins, and the Casino writes it so', () => {
  const look = readCasino(new URLSearchParams('geometri=kontrakt&table=prov'));
  assert.deepEqual(look.patch, {lins: 'bred'}); assert.deepEqual(look.ignored, [], 'the older word is read, not named as unknown');
  const src = new URL(gameSrc(look), 'http://lab');
  assert.equal(src.searchParams.get('lins'), 'bred'); assert.equal(src.searchParams.has('geometri'), false); assert.equal(src.searchParams.get('table'), 'prov');
  assert.equal(readLook(src.searchParams).keys.lins, 'bred');
  const own = new URLSearchParams(casinoSearch(look));
  assert.equal(own.get('lins'), 'bred'); assert.equal(own.has('geometri'), false);
  const other = readCasino(new URLSearchParams('geometri=annat'));
  assert.deepEqual(other.patch, {}, 'only the two words the game knows'); assert.deepEqual(other.ignored, []);
  assert.equal(new URL(gameSrc(other), 'http://lab').searchParams.has('lins'), false);
});

test('Använd i Casino with Bred lins: the plain Casino link plays Bred lins, and saved with Standard again it plays Standard', () => {
  // the plain Casino (the rail's Casino, no parameters): its frame names no lens, so the game takes the preset's
  const frame = new URL(gameSrc(readCasino(new URLSearchParams(''))), 'http://lab'), keys = readLook(frame.searchParams).keys;
  assert.equal(frame.searchParams.has('lins'), false);
  const played = (preset: unknown) => lookState(DEFAULTS, presetFrom({preset})!.state, keys, () => 11).lins;
  assert.equal(played({state: {...basgrund.state, lins: 'bred'}}), 'bred', 'saved with Bred lins');
  assert.equal(played({state: basgrund.state}), 'standard', 'saved with Standard: no key, the file as it was');
  assert.equal(played({state: basgrund.state, geometri: 'kontrakt'}), 'bred', 'a file in the older form');
  // Prova i Casino with its own lens plays that lens over the saved one
  const trial = readLook(new URL(gameSrc(readCasino(new URLSearchParams('lins=standard'))), 'http://lab').searchParams).keys;
  assert.equal(lookState(DEFAULTS, presetFrom({preset: {state: {...basgrund.state, lins: 'bred'}}})!.state, trial, () => 11).lins, 'standard');
});

test('the saved lens goes up with the copy: validated, scrubbed and still there, so the Casino on the net plays it', () => {
  const release = readRelease(JSON.parse(readFileSync('data/studio-release.json', 'utf8')));
  assert.equal(release.presets, true, 'the presets go up with the copy (tools/build-studio-snapshot.ts)');
  for (const sent of [{state: {...basgrund.state, lins: 'bred'}}, {state: basgrund.state, geometri: 'kontrakt'}]) {
    const {preset, errors} = validatePreset({schemaVersion: 1, name: CASINO_PRESET, label: 'Casino', about: 'Casinos sparade visning.', ...sent}, CASINO_PRESET);
    assert.deepEqual(errors, []);
    assert.equal(preset!.state.lins, 'bred'); assert.equal('geometri' in preset!, false, 'kept in the form since 2026-11-26');
    // as tools/build-studio-snapshot.ts writes api/scene-presets/<name>.json and the list
    const one = scrub({preset: {...preset!, revision: null}}, release), list = scrub({schemaVersion: 1, presets: [{...preset!, revision: null}], problems: []}, release);
    assert.equal(one.preset.state.lins, 'bred'); assert.equal(list.presets[0].state.lins, 'bred');
    assert.deepEqual(findLeaks(one, release), []); assert.deepEqual(findLeaks(list, release), []);
    assert.equal(lookState(DEFAULTS, presetFrom(one)!.state, readLook(new URLSearchParams('?forval=casino&table=casino&dealer=paow')).keys, () => 11).lins, 'bred');
  }
});

test('the hand overlay set in Scen goes with Använd i Casino: the game draws the card in her hand, on the track Scen draws it on', () => {
  // Använd i Casino saves what differs from DEFAULTS (useSceneEditor saveAs); the plain Casino's frame names no key, so the game takes the preset's
  const {preset, errors} = validatePreset({schemaVersion: 1, name: CASINO_PRESET, label: 'Casino', about: 'Casinos sparade visning.', state: {...basgrund.state, cardInHand: true}}, CASINO_PRESET);
  assert.deepEqual(errors, []);
  const frame = new URL(gameSrc(readCasino(new URLSearchParams(''))), 'http://lab'), keys = readLook(frame.searchParams).keys;
  const carryOf = (state: Record<string, unknown>) => cardsChoice({preset: state.cards as boolean, inHand: lookState(DEFAULTS, state, keys, () => 11).cardInHand}).carry;
  assert.equal(carryOf(presetFrom({preset: {...preset!, revision: null}})!.state), 'object');
  assert.equal(carryOf(presetFrom({preset: {state: basgrund.state}})!.state), 'film', 'without the choice the game keeps its own line');
  // the card in her hand is then the one Scen showed (the stiff card's track); the game's own line reads the stored track as before
  assert.equal(trackFolder(frame.pathname, frame.search, true), trackFolder('/studio/bordet/', '?lage=scen'));
  assert.equal(trackFolder(frame.pathname, frame.search, false), null);
});
