// Skyddar: kontraktet för dockans editor (standarddocka/editor/dockval.ts) – valet av standard är ett val (Jakob 2026-11-27):
// vid en standard visas bara dess dockor och dockan byter aldrig bord, ett ord som inte passar ger standardens förvalda docka
// och en rad på vanlig svenska (aldrig ett tekniskt fel), en adress utan ordet låter dockan välja sitt bord (verktygen och
// dokumenten skriver ?docka=man), och hela sekvensen vid livebordet går närmast skon först, ur läget och inte ur numret.
//   node --test tools/editor-dockval.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {dockord, dockval, fransSkon, helaSekvensen, lyftPlats, rorelsensOrd} from '../../standarddocka/editor/dockval.ts';
import {UPPSATTNING, VALETS_FORVAL} from '../src/uppsattning.ts';

const live = UPPSATTNING.live, forra = UPPSATTNING.forra;

test('a word that does not fit gives the standard\'s own default doll and a plain line, never an error', () => {
  // the doll fits: no line
  assert.deepEqual(dockval('live', 'frasse'), {uppsattning: 'live', docka: 'frasse', rad: ''});
  assert.deepEqual(dockval('forra', 'kvinna'), {uppsattning: 'forra', docka: 'kvinna', rad: ''});
  // a doll of the other standard: the standard stays, its default doll is shown, and the line names both in his words
  const man = dockval('live', 'man');
  assert.equal(man.uppsattning, 'live'); assert.equal(man.docka, live.dockor[0]);
  assert.equal(man.rad, `Mannen sitter vid ${forra.namn}. Här visas ${dockord(live.dockor[0]).namn}.`);
  const danilo = dockval('forra', 'danilo');
  assert.equal(danilo.uppsattning, 'forra'); assert.equal(danilo.docka, forra.dockor[0]); assert.equal(danilo.rad, `Danilo sitter vid ${live.namn}. Här visas Mannen.`);
  // an unknown doll, an unknown standard
  assert.equal(dockval('live', 'xyz').docka, live.dockor[0]); assert.match(dockval('live', 'xyz').rad, /^Det finns ingen docka som heter ”xyz”\. Här visas /);
  const bred = dockval('bred', null); assert.equal(bred.uppsattning, VALETS_FORVAL); assert.equal(bred.rad, `Det finns ingen standard som heter ”bred”. Här visas ${UPPSATTNING[VALETS_FORVAL].namn}.`);
  // what he reads carries no address words or file names
  for (const v of [man, danilo, bred, dockval('live', 'xyz'), dockval('forra', 'frasse')]) assert.doesNotMatch(v.rad, /\?|=|docka=|uppsattning|\.json/, v.rad);
});

test('without the word the doll chooses its table, and with no words the choice\'s default with its first doll', () => {
  assert.deepEqual(dockval(null, 'man'), {uppsattning: 'forra', docka: 'man', rad: ''});
  assert.deepEqual(dockval(null, 'kvinna'), {uppsattning: 'forra', docka: 'kvinna', rad: ''});
  assert.deepEqual(dockval(null, 'frasse'), {uppsattning: 'live', docka: 'frasse', rad: ''});
  assert.deepEqual(dockval(null, null), {uppsattning: VALETS_FORVAL, docka: UPPSATTNING[VALETS_FORVAL].dockor[0], rad: ''});
  assert.deepEqual(dockval('standard', ''), {uppsattning: 'forra', docka: 'man', rad: ''}, 'the older word, and an empty doll');
  assert.deepEqual(dockval(null, 'Frasse'), {uppsattning: 'live', docka: 'frasse', rad: ''}, 'a doll written with a capital');
  // the names and how she or he is said
  assert.deepEqual([dockord('man').namn, dockord('kvinna').namn, dockord('danilo').namn], ['Mannen', 'Kvinnan', 'Danilo']);
  assert.deepEqual([dockord('kvinna').han, dockord('kvinna').honom, dockord('kvinna').hans], ['hon', 'henne', 'hennes']);
  assert.deepEqual([dockord('frasse').han, dockord('man').honom], ['han', 'honom']);
});

test('at the live table a seat without a lifted deal shows the nearest one, and only says so when he asked for the seat', () => {
  const finns = new Set(['lyft-frasse-p1', 'lyft-frasse-p4', 'lyft-frasse-p7', 'lyft-frasse-vantan-1', 'lyft-danilo-p2']);
  assert.deepEqual(lyftPlats(finns, 'frasse', 4, true), {plats: 4, rad: ''});
  assert.deepEqual(lyftPlats(finns, 'frasse', 2, true), {plats: 1, rad: 'Frasse har ingen giv till plats 2 lyft ur filmen än. Här visas given till plats 1.'});
  assert.deepEqual(lyftPlats(finns, 'frasse', 6, false), {plats: 7, rad: ''});
  assert.equal(lyftPlats(finns, 'nisse', 4, true), null);
  assert.deepEqual([rorelsensOrd('lyft-danilo-p4'), rorelsensOrd('lyft-frasse-vantan-2'), rorelsensOrd('lyft-danilo-p4-troget3')], ['given till plats 4', 'väntan 2', 'lyft-danilo-p4-troget3']);
});

test('the whole sequence deals nearest the shoe first, by where the places lie, as the dealer in the film does', () => {
  // the order comes from the distance to the shoe in the standard's own measures, not from the numbers
  const shoe = live.sko.front, far = (p: number) => { const at = live.kortplatser().find(k => k.id === `P${p}.C1`)!.at; return Math.hypot(at[0] - shoe[0], at[2] - shoe[2]); };
  const order = fransSkon([1, 2, 3, 4, 5, 6, 7], live);
  for (let i = 1; i < order.length; i++) assert.ok(far(order[i - 1]) <= far(order[i]), `${order[i - 1]} före ${order[i]}`);
  // today the shoe stands at the dealer's left, by seat 7 (the picture's right)
  assert.equal(order[0], 7); assert.equal(order.at(-1), 1);
  const finns = new Set(['lyft-danilo-p2', 'lyft-danilo-p4', 'lyft-danilo-p7', 'lyft-danilo-vantan-1', 'lyft-danilo-vantan-2']);
  assert.deepEqual(helaSekvensen(finns, 'danilo', live), ['vantan-1', 'p7', 'p4', 'p2', 'vantan-2']);
  assert.deepEqual(helaSekvensen(new Set(['lyft-frasse-p1']), 'frasse', live), ['p1']);
});
