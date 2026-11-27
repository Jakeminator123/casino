// Skyddar: kontraktet för dockans editor (standarddocka/editor/dockval.ts): ett ord som inte passar ger den förvalda dockan
// och en rad på vanlig svenska (aldrig ett tekniskt fel), och hela sekvensen går närmast skon först, ur läget och inte ur numret.
//   node --test tools/editor-dockval.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {dockord, dockval, fransSkon, helaSekvensen, lyftPlats, rorelsensOrd} from '../../standarddocka/editor/dockval.ts';
import {STANDARD} from '../src/standard.ts';

test('the dolls of the live table, and a word that does not fit gives the default doll and a plain line, never an error', () => {
  assert.deepEqual(dockval('frasse'), {docka: 'frasse', rad: ''});
  assert.deepEqual(dockval('Frasse'), {docka: 'frasse', rad: ''}, 'a doll written with a capital');
  assert.deepEqual(dockval(null), {docka: STANDARD.dockor[0], rad: ''});
  assert.deepEqual(dockval(''), {docka: STANDARD.dockor[0], rad: ''});
  const xyz = dockval('xyz'); assert.equal(xyz.docka, STANDARD.dockor[0]); assert.equal(xyz.rad, `Det finns ingen docka som heter ”xyz”. Här visas ${dockord(STANDARD.dockor[0]).namn}.`);
  assert.doesNotMatch(xyz.rad, /\?|=|docka=|\.json/, 'what he reads carries no address words or file names');
  assert.deepEqual([dockord('danilo').namn, dockord('frasse').han, dockord('frasse').honom], ['Danilo', 'han', 'honom']);
});

test('a seat without a lifted deal shows the nearest one, and only says so when he asked for the seat', () => {
  const finns = new Set(['lyft-frasse-p1', 'lyft-frasse-p4', 'lyft-frasse-p7', 'lyft-frasse-vantan-1', 'lyft-danilo-p2']);
  assert.deepEqual(lyftPlats(finns, 'frasse', 4, true), {plats: 4, rad: ''});
  assert.deepEqual(lyftPlats(finns, 'frasse', 2, true), {plats: 1, rad: 'Frasse har ingen giv till plats 2 lyft ur filmen än. Här visas given till plats 1.'});
  assert.deepEqual(lyftPlats(finns, 'frasse', 6, false), {plats: 7, rad: ''});
  assert.equal(lyftPlats(finns, 'nisse', 4, true), null);
  assert.deepEqual([rorelsensOrd('lyft-danilo-p4'), rorelsensOrd('lyft-frasse-vantan-2'), rorelsensOrd('lyft-danilo-p4-troget3')], ['given till plats 4', 'väntan 2', 'lyft-danilo-p4-troget3']);
});

test('the whole sequence deals nearest the shoe first, by where the places lie, as the dealer in the film does', () => {
  // the order comes from the distance to the shoe in the live table's measures, not from the numbers
  const shoe = STANDARD.sko.front, far = (p: number) => { const at = STANDARD.kortplatser().find(k => k.id === `P${p}.C1`)!.at; return Math.hypot(at[0] - shoe[0], at[2] - shoe[2]); };
  const order = fransSkon([1, 2, 3, 4, 5, 6, 7]);
  for (let i = 1; i < order.length; i++) assert.ok(far(order[i - 1]) <= far(order[i]), `${order[i - 1]} före ${order[i]}`);
  // today the shoe stands at the dealer's left, by today's seat 7 (the picture's right)
  assert.equal(order[0], 7); assert.equal(order.at(-1), 1);
  const finns = new Set(['lyft-danilo-p2', 'lyft-danilo-p4', 'lyft-danilo-p7', 'lyft-danilo-vantan-1', 'lyft-danilo-vantan-2']);
  assert.deepEqual(helaSekvensen(finns, 'danilo'), ['vantan-1', 'p7', 'p4', 'p2', 'vantan-2']);
  assert.deepEqual(helaSekvensen(new Set(['lyft-frasse-p1']), 'frasse'), ['p1']);
});
