// Skyddar: kontraktet mellan de lyfta rörelserna (dealer3d/tools/lyft-till-docka.ts) och dockans editor
// (standarddocka/editor/rorelse.ts): en ruta som har huvudets eget mål (hv) och dess tippning (ht) har kvar dem när editorn
// ställer dockan vid en tid mellan två rutor. Utan dem siktar dockans huvud på blicken: så föll fjärde och femte försöket
// av lyftet (2026-11-27) utan att någon spärr såg det.
//   node --test tools/editor-huvud.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {ensam, rutaVid, type Frame} from '../../standarddocka/editor/rorelse.ts';

const limb = (x: number) => ({s: [x, 0.3, -1.7], e: [x, 0.1, -1.5], w: [x, 0.05, -1.3], k: 1, p: Array.from({length: 21}, () => [x, 0.05, -1.25])});
const ruta = (i: number, hv?: number[], ht?: number): Frame => ({card: {c: [0, 0.001, -1], l: [0, 0, 1], n: [0, 1, 0]}, R: limb(-0.2), L: limb(0.2), h: [0, 0.5, -1.65], g: [0.3, 0.2, -0.7],
  ...(hv ? {hv: [i * 0.01, 0.3, 0]} : {}), ...(ht !== undefined ? {ht} : {})} as Frame);

test('a lifted motion\'s head target and tilt survive the editor putting the doll between two frames', () => {
  const frames = Array.from({length: 4}, (_, i) => ruta(i, [1], 2 + i));
  const f = ensam({fps: 30, frameCount: 4, hip: [0, -0.1, -1.7], frames, leavesShoe: 1, rests: 2, edge: [], folds: 2} as never, 4);
  const x = rutaVid(f, 1.5 / 30).frame;
  assert.ok(x.hv, 'hv följer med');
  assert.ok(Math.abs(x.hv![0] - 0.015) < 1e-6, 'hv blandas mellan rutorna');
  assert.ok(x.ht !== undefined && Math.abs(x.ht - 3.5) < 1e-6, 'ht blandas mellan rutorna');
});

test('a motion without a head target has none after the blend (the head then faces where she looks)', () => {
  const frames = Array.from({length: 4}, (_, i) => ruta(i));
  const f = ensam({fps: 30, frameCount: 4, hip: [0, -0.1, -1.7], frames, leavesShoe: 1, rests: 2, edge: [], folds: 2} as never, 4);
  const x = rutaVid(f, 1.5 / 30).frame;
  assert.equal(x.hv, undefined); assert.equal(x.ht, undefined);
});
