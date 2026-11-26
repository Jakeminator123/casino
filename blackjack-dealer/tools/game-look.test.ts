// Skyddar: kontrakten, hans domar och val – spelet läser utseendet som studion skriver det, linsen han sparat spelas, och äldre länkar läses.
// The look game.html is played with from the studio (src/game-look.ts): its copy of the key catalogue against the studio's
// own (studio/lib/scene-keys.ts), the address and preset reading, and the game's own words that share a name with a key.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BUILT_BLUR, BUILT_ROOMS, KEYS, NAME_LIMIT, PRESET_NAME, RETIRED_KEYS, ROOM_ID, decode, fits, lookState, presetFrom, readLook, type KeyKind} from '../src/game-look.ts';
import {BUILT_BLUR as STUDIO_BLUR, BUILT_ROOMS as STUDIO_ROOMS, RETIRED_KEYS as STUDIO_RETIRED, ROOM_ID as STUDIO_ROOM_ID, SCENE_KEYS, checkValue, decodeValue, type KeySpec} from '../studio/lib/scene-keys.ts';
import {NAME_LIMIT as STUDIO_NAME_LIMIT, PRESET_NAME as STUDIO_PRESET_NAME, SHIPPED, effective} from '../studio/lib/scene-presets.ts';
import {DEFAULTS} from '../src/scene3d-view.ts';
import {cardsChoice} from '../src/game-film.ts';
import {OWN_WORDS} from '../src/game-own.ts';

const params = (text: string) => new URLSearchParams(text);
const kindOf = (s: KeySpec): KeyKind => {
  switch (s.kind) {
    case 'switch': return {kind: 'switch'};
    case 'slider': return {kind: 'slider', min: s.min, max: s.max};
    case 'choice': return s.open ? {kind: 'choice', options: s.options.map(o => o.value), open: true} : {kind: 'choice', options: s.options.map(o => o.value)};
    case 'set': return {kind: 'set', options: s.options.map(o => o.value)};
    case 'text': return {kind: 'text', maxLength: s.maxLength};
  }
};

test('the copy of the key catalogue is the studio\'s: every key of the scene, same kind, range and choices', () => {
  assert.deepEqual(Object.keys(KEYS).sort(), Object.keys(DEFAULTS).sort(), 'every key of the scene, no other');
  assert.deepEqual(Object.keys(KEYS).sort(), SCENE_KEYS.map(s => s.key).sort());
  for (const s of SCENE_KEYS) assert.deepEqual(KEYS[s.key], kindOf(s), s.key);
  assert.deepEqual(BUILT_ROOMS, STUDIO_ROOMS.map(r => r.value));
  assert.deepEqual(BUILT_BLUR, STUDIO_BLUR);
  assert.equal(String(ROOM_ID), String(STUDIO_ROOM_ID));
  assert.equal(String(PRESET_NAME), String(STUDIO_PRESET_NAME));
  assert.equal(NAME_LIMIT, STUDIO_NAME_LIMIT);
});

test('values are checked and read as the studio checks and reads them', () => {
  const rooms = [...BUILT_ROOMS, 'panorama', 'la', 'skog'];
  const samples: unknown[] = [true, false, 0, 1, -1, 0.5, 2.6, 3, 361, -60, -61, NaN, 'all', 'none', 'trim,arc', 'trim, nope', '', 'salong', 'la', 'okand', 'ok rum', 'SCOUT GAMING', 'x'.repeat(29), 'rad\nbrytning', 'A', '10', 'lean', null];
  for (const s of SCENE_KEYS) {
    for (const value of samples) {
      assert.equal(fits(KEYS[s.key], value, rooms), checkValue(s, value, rooms) === null, `${s.key} ${JSON.stringify(value)}`);
      assert.equal(fits(KEYS[s.key], value), checkValue(s, value) === null, `${s.key} ${JSON.stringify(value)} without rooms`);
      if (typeof value === 'string') assert.deepEqual(decode(KEYS[s.key], value, rooms), decodeValue(s, value, rooms), `${s.key} "${value}"`);
    }
    for (const text of ['1', '0', 'true', 'false', '0.25', '-8', '']) assert.deepEqual(decode(KEYS[s.key], text, rooms), decodeValue(s, text, rooms), `${s.key} "${text}"`);
  }
});

test('the address: the preset, the keys that fit, the keys that do not, and the game\'s own words left alone', () => {
  const rooms = [...BUILT_ROOMS, 'panorama', 'la'];
  assert.deepEqual(readLook(params(''), rooms), {asked: null, forval: null, keys: {}, ignored: []});
  assert.deepEqual(readLook(params('forval=levande&dust=0.8&room=la&sway=1&table=casino-ab12&tema=scout&inbaddad=1'), rooms),
    {asked: 'levande', forval: 'levande', keys: {dust: 0.8, room: 'la', sway: true}, ignored: []});
  assert.deepEqual(readLook(params('forval=Inte%20ett%20namn&dust=4&room=skog&zoom=x'), rooms), {asked: 'Inte ett namn', forval: null, keys: {}, ignored: ['dust', 'room', 'zoom']});
  // tray=built keeps the built tray, fan=<px> is the cards' fan step: neither is a scene key, neither is named
  assert.deepEqual(readLook(params('tray=built&fan=24'), rooms), {asked: null, forval: null, keys: {}, ignored: []});
  assert.deepEqual(readLook(params('tray=0&fan=1'), rooms), {asked: null, forval: null, keys: {tray: false, fan: true}, ignored: []});
  // the last value of a word wins, as in the studio's readAddress
  assert.deepEqual(readLook(params('dust=9&dust=0.3'), rooms).keys, {dust: 0.3});
  assert.deepEqual(readLook(params('dust=9&dust=0.3'), rooms).ignored, []);
});

test('a preset as the lab hands it out: its state kept, a key that does not fit dropped and named', async () => {
  const file = JSON.parse(await readFile('data/scene-presets/levande.json', 'utf8'));
  assert.deepEqual(presetFrom({preset: file}), {state: file.state, dropped: []});
  assert.deepEqual(presetFrom({preset: {state: {dust: 0.5, glow: 1, zoom: 9}}}), {state: {dust: 0.5}, dropped: ['glow', 'zoom']});
  for (const answer of [null, {}, {preset: null}, {preset: {state: []}}, {error: 'Det finns inget förval med det namnet.'}]) assert.equal(presetFrom(answer), null);
});

test('the lens is a key of the look (Bred lins, Jakob 2026-11-21 and 2026-11-25): saved with it, and read from a look saved before the key', () => {
  const casino = {schemaVersion: 1, name: 'casino', label: 'Casino', about: 'Casinos sparade visning, vald i Scen & bord.', state: {room: 'panorama', pitch: -8, zoom: 0.84, format: 'fill'}, updatedAt: '2026-11-19T17:14:04.461Z'};
  assert.deepEqual(presetFrom({preset: casino}), {state: casino.state, dropped: []}, 'no lens named: Standard, the scene\'s default');
  assert.deepEqual(presetFrom({preset: {...casino, state: {...casino.state, lins: 'bred'}}}), {state: {...casino.state, lins: 'bred'}, dropped: []}, 'the key as it is saved now');
  // a file from before the key carries the lens beside the state, as geometri=kontrakt: the same look
  assert.deepEqual(presetFrom({preset: {...casino, geometri: 'kontrakt', revision: null}}), {state: {...casino.state, lins: 'bred'}, dropped: []});
  assert.deepEqual(presetFrom({preset: {...casino, geometri: 'lins'}}), {state: {...casino.state, lins: 'standard'}, dropped: []});
  assert.equal(presetFrom({preset: {...casino, state: {...casino.state, lins: 'standard'}, geometri: 'kontrakt'}})?.state.lins, 'standard', 'the key goes before the older word');
  for (const geometri of ['bred', 'constructor', 1, null]) assert.equal(presetFrom({preset: {...casino, geometri}})?.state.lins, undefined, String(geometri));
  assert.deepEqual(presetFrom({preset: {...casino, state: {...casino.state, lins: 'vid'}}}), {state: casino.state, dropped: ['lins']}, 'a value the key does not have is dropped and named');
});

test('a look has no scale and no camera of its own: the retired keys are read past in the game and in the studio alike', () => {
  assert.deepEqual([...RETIRED_KEYS].sort(), [...STUDIO_RETIRED].sort());
  for (const key of RETIRED_KEYS) { assert.equal(key in KEYS, false, key); assert.equal(key in DEFAULTS, false, key); }
  // Casino's look as it was saved until 2026-11-26, and an old link: the look without them, and nothing said on the page
  assert.deepEqual(presetFrom({preset: {state: {room: 'panorama', scale: 2, lens: 'estimate'}}}), {state: {room: 'panorama'}, dropped: []});
  assert.deepEqual(readLook(params('forval=casino&scale=2&lens=estimate&dust=0.5')), {asked: 'casino', forval: 'casino', keys: {dust: 0.5}, ignored: []});
});

test('the lens the game plays: the address\'s, else the look\'s, else Standard; the older address word is an alias', () => {
  const blurOf = () => 11, bred = {room: 'panorama', lins: 'bred'} as const;
  const played = (address: string, preset: object | null) => lookState(DEFAULTS, preset, readLook(params(address)).keys, blurOf).lins ?? DEFAULTS.lins;
  assert.equal(DEFAULTS.lins, 'standard');
  assert.equal(played('forval=casino&table=casino', bred), 'bred', 'the plain Casino link plays the saved Bred lins');
  assert.equal(played('forval=casino&lins=standard', bred), 'standard', 'Prova i Casino with Standard keeps Standard');
  assert.equal(played('forval=casino&lins=bred', {room: 'panorama'}), 'bred', 'Prova i Casino with Bred lins');
  assert.equal(played('forval=casino', {room: 'panorama'}), 'standard', 'a look that names no lens is Standard');
  // links written before the key: geometri=kontrakt is Bred lins, geometri=lins Standard, anything else no word
  assert.equal(played('forval=casino&geometri=lins', bred), 'standard'); assert.equal(played('forval=casino&geometri=kontrakt', {room: 'panorama'}), 'bred');
  assert.equal(played('forval=casino&geometri=annat', bred), 'bred'); assert.equal(played('geometri=kontrakt&table=prov', null), 'bred', 'without a look too');
  assert.equal(played('forval=casino&geometri=kontrakt&lins=standard', bred), 'standard', 'the key goes before the older word');
  assert.deepEqual(readLook(params('geometri=kontrakt')).ignored, []); assert.deepEqual(readLook(params('geometri=annat')).ignored, []);
  assert.deepEqual(readLook(params('lins=vid')).ignored, ['lins']);
  // the film before the game (cloud/studio/gate.ts TRAILER_HOME) names neither a look nor a lens: Standard, as before
  assert.equal(played('intro=noir-3&room=monaco&roomLife=1&table=casino&dealer=paow', null), 'standard');
});

test('the look over the game: a preset is a whole look, keys alone lie over the game\'s own', () => {
  const blurOf = (room: string) => ({panorama: 5, la: 4, hall: 11}[room] ?? 11);
  for (const p of SHIPPED) assert.deepEqual(lookState(DEFAULTS, p.state, {}, blurOf), effective(DEFAULTS, p.state), `${p.name} as the Scen view shows it`);
  // a key the preset leaves out is the scene's default, also where the game sets its own (tray, cards, format)
  const bare = lookState(DEFAULTS, {dust: 0.4}, {zoom: 1.1}, blurOf);
  assert.deepEqual([bare.dust, bare.zoom, bare.tray, bare.cards, bare.format, bare.room], [0.4, 1.1, DEFAULTS.tray, DEFAULTS.cards, DEFAULTS.format, DEFAULTS.room]);
  // over a preset the keys stay as written, as in the Scen view; alone a room brings its own blur
  assert.equal(lookState(DEFAULTS, SHIPPED[0].state, {room: 'hall'}, blurOf).blur, 5);
  assert.deepEqual(lookState(DEFAULTS, null, {room: 'hall'}, blurOf), {room: 'hall', blur: 11});
  assert.deepEqual(lookState(DEFAULTS, null, {room: 'la', blur: 2}, blurOf), {room: 'la', blur: 2});
  assert.deepEqual(lookState(DEFAULTS, null, {}, blurOf), {});
});

test('the game\'s own words are never read as a look', () => {
  // None of them is a key of the scene, and among them are the words the Casino view writes into the frame for itself
  // (studio/lib/casino.ts gameSrc; dealer, which it adds).
  assert.deepEqual(OWN_WORDS.filter(word => word in KEYS), []);
  for (const word of ['table', 'inbaddad', 'dealer']) assert.ok(OWN_WORDS.includes(word), `${word} is the game's own word`);
  // the lens's older word is an alias of the look's key lins (readLook), so an address that has only it does ask for a look
  assert.equal(OWN_WORDS.includes('geometri'), false);
});

test('the drawn cards and her lines: the game draws cards unless the player or a look says off; tal=av keeps her silent', () => {
  const rooms = [...BUILT_ROOMS], blurOf = () => 11;
  // cards is the scene's own key: ?cards=0 (a link or a recording writes it) turns the drawn cards off, over a preset too.
  assert.deepEqual(readLook(params('cards=0'), rooms).keys, {cards: false});
  assert.equal(lookState(DEFAULTS, {cards: true}, {cards: false}, blurOf).cards, false);
  assert.equal(lookState(DEFAULTS, null, {}, blurOf).cards, undefined, 'without a look the game keeps its own (on)');
  // who decides (cardsChoice in src/game-film.ts, which the page asks): the address, then the look, then the player's memory,
  // then on
  assert.equal(cardsChoice({}).cards, true, 'on when nobody says otherwise');
  assert.equal(cardsChoice({memory: 'off'}).cards, false, 'the player turned them off');
  assert.equal(cardsChoice({preset: false, memory: 'on'}).cards, false, 'a look says off over the memory');
  assert.equal(cardsChoice({address: true, preset: false, memory: 'off'}).cards, true, 'the address first');
  assert.equal(cardsChoice({address: false}).cards, false);
  // tal: repliker (the default) or av; anything else is not used.
  assert.equal(DEFAULTS.tal, 'repliker');
  assert.deepEqual(readLook(params('tal=av'), rooms).keys, {tal: 'av'});
  assert.deepEqual(readLook(params('tal=ja'), rooms).ignored, ['tal']);
});
