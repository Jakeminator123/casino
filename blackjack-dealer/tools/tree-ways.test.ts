// Skyddar: spelets regler – spelet spelar samma filmer när ett träds sätt att dela ut är grenar av ett träd (Jakob 2026-11-26).
// What the game plays when a tree's ways of dealing are ways of one tree instead of trees of their own (Jakob 2026-11-26:
// "Tatuerad och Tatuerad nyp så att säga blir en och samma"; spelet får inte ändras i tysthet). Över dagens register och bank,
// utan media: registret som det står (en gren i trädet, data/dealer-trees.json ways) mot samma register med varje gren som ett
// eget träd, som det stod före sammanslagningen. Spelet utan trädord, varje träd för sig (?trad=) och varje komposition ska få
// exakt samma filmer; en gren för sig (?trad=<gren>) får dessutom bara trädets gemensamma filmer på A1 (vila, tal, hålkort).
// Run: node --test tools/tree-ways.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compositionView} from '../src/composition.ts';
import {wayTree, type TreeRegister} from '../src/dealer-trees.ts';
import {cutOf, readCompositions} from './dealer-composition.ts';
import {gameCut, treeCut, treeWorld} from './dealer-tree.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const register = JSON.parse(readFileSync(path.join(ROOT, 'data/dealer-trees.json'), 'utf8')) as TreeRegister;
/** The register with every way of a tree as a tree of its own, as the trees stood before 2026-11-26. */
const split: TreeRegister = {...register, dealers: Object.fromEntries(Object.entries(register.dealers).map(([dealer, d]) => [dealer, {
  trees: d.trees.flatMap(t => [{...t, ways: undefined}, ...(t.ways ?? []).map(w => { const {wayOf: _of, ...tree} = wayTree(t, w); return tree; })]),
}]))};
const sorted = (ids: readonly string[]) => [...ids].sort();
const AT_REST = new Set(['IDLE', 'REVEAL(D.C1)', 'REVEAL(D.C2)']);

for (const [dealer, d] of Object.entries(register.dealers)) {
  const ways = d.trees.flatMap(t => (t.ways ?? []).map(w => w.id));

  test(`${dealer}: the game without a tree word and each tree alone play the same films with the ways in their tree`, async () => {
    const [a, b] = [await gameCut(dealer, split), await gameCut(dealer, register)];
    assert.deepEqual([b.hub, sorted(b.played), sorted(b.own), sorted(b.drop)], [a.hub, sorted(a.played), sorted(a.own), sorted(a.drop)], 'spelet utan trädord');
    for (const t of d.trees) {
      const [x, y] = [await treeCut(dealer, t.id, split), await treeCut(dealer, t.id, register)];
      assert.ok(x && y, t.id);
      assert.deepEqual([y.hub, sorted(y.own), sorted(y.drop)], [x.hub, sorted(x.own), sorted(x.drop)], `?trad=${t.id}`);
    }
  });

  test(`${dealer}: a way alone plays its own films, and of its tree's only those on A1`, async () => {
    const {takes} = await treeWorld(dealer, register), byId = new Map(takes.map(t => [t.id, t]));
    for (const id of ways) {
      const [x, y] = [await treeCut(dealer, id, split), await treeCut(dealer, id, register)];
      assert.ok(x && y, id);
      assert.equal(y.hub, x.hub, `?trad=${id}`);
      const before = new Set(x.own), more = y.own.filter(t => !before.has(t));
      assert.deepEqual(x.own.filter(t => !y.own.includes(t)), [], `${id}: no film of its own is lost`);
      for (const t of more) assert.ok([byId.get(t)!.from, byId.get(t)!.to].every(n => AT_REST.has(n)), `${id}: ${t} is one of the tree's films on A1`);
    }
  });

  test(`${dealer}: every composition plays the same films with the ways in their tree`, async () => {
    const [a, b] = [await treeWorld(dealer, split), await treeWorld(dealer, register)];
    for (const def of readCompositions(ROOT).dealers[dealer]?.compositions ?? []) {
      const [x, y] = [cutOf(dealer, compositionView(def, a.views, a.takes), a.takes), cutOf(dealer, compositionView(def, b.views, b.takes), b.takes)];
      const shape = (c: typeof x) => ({home: c.home, drop: sorted(c.drop), trees: c.trees.map(t => ({tree: t.tree, hub: t.hub, share: t.share, rest: t.rest, shoe: t.shoe, own: sorted(t.own)}))});
      assert.deepEqual(shape(y), shape(x), def.id);
    }
  });
}
