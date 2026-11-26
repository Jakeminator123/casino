// Skyddar: hans domar och val, publiceringsskyddet – det han sparar i Scen med Använd i Casino spelas i Casino och på nätet.
// Casino's saved look (studio/lib/casino.ts, studio/lib/scene-presets.ts CASINO_PRESET) as the game in the Casino's frame and
// the copy on the net play it: what Använd i Casino saves (the lens, the card in her hand) is what the plain Casino plays. Read
// from the files as they stand; no media, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULTS} from '../src/scene3d-view.ts';
import {lookState, presetFrom, readLook} from '../src/game-look.ts';
import {cardsChoice} from '../src/game-film.ts';
import {trackFolder} from '../src/card-overlay.ts';
import {gameSrc, readCasino} from '../studio/lib/casino.ts';
import {BASE, CASINO_PRESET, validatePreset} from '../studio/lib/scene-presets.ts';
import {findLeaks, readRelease, scrub} from './studio-freeze.ts';

const basgrund = JSON.parse(readFileSync(`data/scene-presets/${BASE}.json`, 'utf8'));

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
