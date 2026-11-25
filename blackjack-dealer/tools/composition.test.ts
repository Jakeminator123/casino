// Skyddar: kontrakten, hans domar och val – kompositionen spelar hans andelar, en film följer bara sin bild, högst 2×.
// src/composition.ts, the contract of a composition of node trees (Jakob 2026-11-23): the shares hold over many rounds, a film
// never follows a picture it does not begin on, a return goes home to its own anchor, a tree alone is today's ?trad=, and a tree
// that is not played does not leak into the game. Trees with different hands are put together, and it is said (Jakob
// 2026-11-24). A film's own speed times the round's tempo, never past 2× (Jakob 2026-11-23).
// On made-up trees: the real ones change every time a film is judged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {REVEAL_NODE, buildGraph} from '../src/clip-graph.ts';
import {createSession} from '../game/session.ts';
import {defaultPlan} from '../src/placement-model.ts';
import {createLayout} from '../src/game-table.ts';
import {cardRecords} from '../src/game-director.ts';
import {createFilm, filmRate} from '../src/game-film.ts';
import {cardFaces, tableCards} from '../src/game-view.ts';
import {cutBank, gameBank, playedCut, treeView, unplayedTakes, type TreeDef, type TreeEntry, type TreeTake} from '../src/dealer-trees.ts';
import {assign, checkComposition, compositionPlay, compositionView, createComposer, handsNote, pickFilm, seams, soloComposition, tempoOf, trace, treeBank, weave,
  type BridgeDef, type CompositionDef, type CutTree, type LegBeat, type Move} from '../src/composition.ts';
import {compositionToSave, cutOf} from './dealer-composition.ts';

// ── Made-up trees: Casino (A1, A2.1, everything) and Tatuerad (its own A1 and A2.3, the seats' first cards and the hole card) ──
const SEATS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const casino: CutTree = {tree: 'casino', name: 'Casino', share: 80, hub: 'READY', rest: 'a1', shoe: 'a21', own: []};
const tatuerad: CutTree = {tree: 'tatuerad', name: 'Tatuerad', share: 20, hub: 'READY-C', rest: 'a1t', shoe: 'a23', own: []};
const REST_BRIDGE: BridgeDef = {a: 'a1', b: 'a1t', ab: 'assets/x/dit.mp4', ba: 'assets/x/hem.mp4', seconds: 0.2};
const SHOE_BRIDGE: BridgeDef = {a: 'a21', b: 'a23'};
const spec = (bridges: BridgeDef[], trees: CutTree[] = [casino, tatuerad]) => ({trees, bridges, shares: {}, home: 'casino'});
const can = (tree: string, move: Move) => tree === 'casino' || 'reveal' in move || /^P[1-7]\.C1$/.test(move.deal);
const seeded = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/** One tree's round of some moves as the game plans it (src/game-director.ts planBeats): from rest, each card and back, to rest. */
function leg(moves: readonly Move[]): LegBeat[] {
  const beats: LegBeat[] = [];
  let atShoe = false;
  moves.forEach((move, i) => {
    if ('reveal' in move) { beats.push({kind: 'REVEAL', step: {from: 'IDLE', to: REVEAL_NODE}}); return; }
    const next = moves[i + 1], last = !next || 'reveal' in next;
    if (!atShoe) beats.push({kind: 'ENTRY', step: {from: 'IDLE', to: 'READY'}});
    beats.push({kind: 'DEAL', step: {from: 'READY', to: move.deal}}, {kind: 'RETURN', step: {from: move.deal, to: last ? 'IDLE' : 'READY'}});
    atShoe = !last;
  });
  return beats;
}
/** The moves of a step, each given to a tree, as legs: a run of moves of one tree is one leg; a move of no tree is a card laid without a hand. */
function legsOf(moves: readonly Move[], trees: readonly (string | null)[]) {
  const legs: {tree: string; beats: LegBeat[]}[] = [];
  for (let i = 0; i < moves.length;) {
    let j = i; while (j < moves.length && trees[j] === trees[i]) j++;
    legs.push(trees[i] === null ? {tree: 'casino', beats: moves.slice(i, j).map(() => ({kind: 'PLACE', step: null}))} : {tree: trees[i]!, beats: leg(moves.slice(i, j))});
    i = j;
  }
  return legs;
}
const FIRST_DEAL: Move[] = [...SEATS.map(s => ({deal: `${s}.C1`})), {deal: 'D.C1'}, ...SEATS.map(s => ({deal: `${s}.C1`})), {deal: 'D.C2'}]; // second cards play the seat's film
const SEAT_CARDS: Move[] = SEATS.map(p => ({deal: `${p}.C1`}));

test('andelarna hålls över många rundor: per kort när träden möts vid skon, per omgång kort när de bara möts i vilan', () => {
  let s = spec([REST_BRIDGE, SHOE_BRIDGE]), random = seeded(1), tattooed = 0, cards = 0;
  for (let round = 0; round < 3000; round++) for (const t of assign(s, SEAT_CARDS, can, random)) { cards++; if (t === 'tatuerad') tattooed++; }
  assert.ok(Math.abs(tattooed / cards - 0.2) < 0.015, `Tatuerad fick ${(tattooed / cards * 100).toFixed(1)} % av korten, 20 % var satt`);
  s = spec([REST_BRIDGE]); random = seeded(2); tattooed = 0;
  for (let round = 0; round < 4000; round++) {
    const trees = assign(s, SEAT_CARDS, can, random);
    assert.equal(new Set(trees).size, 1, 'utan brygga vid skon byter handen inte träd mitt i en omgång kort');
    if (trees[0] === 'tatuerad') tattooed++;
  }
  assert.ok(Math.abs(tattooed / 4000 - 0.2) < 0.02, `Tatuerad fick ${(tattooed / 40).toFixed(1)} % av omgångarna, 20 % var satt`);
});

test('en film följer aldrig på en bild den inte börjar på, och kedjan slutar i hemmaträdets vila', () => {
  for (const bridges of [[REST_BRIDGE], [REST_BRIDGE, SHOE_BRIDGE], [SHOE_BRIDGE], []]) {
    const s = spec(bridges), random = seeded(3 + bridges.length);
    for (let round = 0; round < 400; round++) {
      const moves: Move[] = round % 3 === 0 ? FIRST_DEAL : round % 3 === 1 ? [{deal: `P${1 + round % 7}.C1`}] : [{reveal: true}, {deal: 'D.C1'}];
      const woven = weave(s, legsOf(moves, assign(s, moves, can, random))), hops = trace(s, woven);
      assert.deepEqual(woven.breaks, [], 'ingen skarv utan brygga');
      assert.deepEqual(seams(hops, 'a1'), [], 'varje film börjar på bilden före');
      if (hops.length) assert.equal(hops.at(-1)!.to, 'a1');
    }
  }
  // A tree without a return to the shoe from that card goes through rest although the anchors meet.
  const s = spec([REST_BRIDGE, SHOE_BRIDGE]), noReturn = weave(s, legsOf([{deal: 'P1.C1'}, {deal: 'P2.C1'}], ['casino', 'tatuerad']), () => false);
  assert.deepEqual(noReturn.beats.map(b => b.kind), ['ENTRY', 'DEAL', 'RETURN', 'ENTRY', 'DEAL', 'RETURN']);
  assert.deepEqual(seams(trace(s, noReturn), 'a1'), []);
});

test('utan brygga spelar bara hemmaträdet, ett kort som inget träd har läggs utan hand, och en skarv döljs inte', () => {
  const s = spec([]), random = seeded(9);
  for (let round = 0; round < 200; round++) assert.ok(assign(s, FIRST_DEAL, can, random).every(t => t === 'casino'));
  const only = (tree: string, move: Move) => tree === 'tatuerad' && can(tree, move); // only the tree that cannot be reached has films
  assert.deepEqual(assign(s, [{deal: 'P1.C1'}], only, random), [null]);
  assert.deepEqual(weave(s, legsOf([{deal: 'P1.C1'}], [null])).beats.map(b => b.kind), ['PLACE']);
  const forced = weave(s, legsOf([{deal: 'P1.C1'}], ['tatuerad']));
  assert.equal(forced.breaks.length, 2); // to Tatuerad's rest and home again
  assert.equal(seams(trace(s, forced), 'a1').length, 1);
  assert.ok(createComposer({...s}).weave(legsOf([{deal: 'P1.C1'}], ['tatuerad'])).breaks.length >= 2);
});

test('en retur går hem till sitt eget ankare', () => {
  for (const bridges of [[REST_BRIDGE], [REST_BRIDGE, SHOE_BRIDGE]]) {
    const s = spec(bridges), random = seeded(11 + bridges.length), byId = {casino, tatuerad};
    let switched = 0;
    for (let round = 0; round < 500; round++) {
      const woven = weave(s, legsOf(FIRST_DEAL, assign(s, FIRST_DEAL, can, random))), hops = trace(s, woven);
      woven.beats.forEach((b, i) => {
        if (b.kind !== 'RETURN') return;
        const deal = woven.beats[i - 1], tree = byId[woven.tree[i] as 'casino' | 'tatuerad'];
        assert.deepEqual([deal.kind, woven.tree[i - 1], b.step!.from], ['DEAL', woven.tree[i], deal.step!.to], 'returen spelas av trädet som gav kortet, från kortet');
        const hop = hops.find(h => h.beat === i && h.kind === 'RETURN')!;
        assert.ok([tree.shoe, tree.rest].includes(hop.to), `returen slutar på trädets eget ankare, inte ${hop.to}`);
      });
      if (new Set(woven.beats.flatMap((b, i) => b.kind === 'DEAL' ? [woven.tree[i]] : [])).size > 1) switched++;
    }
    assert.ok(switched > 50, 'rundorna blandar de två träden');
  }
});

test('ett träd utan andel lånar bara ut det de andra saknar', () => {
  const s = spec([REST_BRIDGE], [{...tatuerad, share: 100}, {...casino, share: 0}]), random = seeded(21);
  for (let round = 0; round < 100; round++) {
    const trees = assign(s, FIRST_DEAL, can, random);
    FIRST_DEAL.forEach((move, i) => assert.equal(trees[i], 'deal' in move && move.deal.startsWith('D.') ? 'casino' : 'tatuerad'));
    assert.deepEqual(seams(trace(s, weave(s, legsOf(FIRST_DEAL, trees))), 'a1'), []);
  }
});

test('en variants andel: filmen väljs efter sina andelar, och utan andelar väljer banken', () => {
  const random = seeded(31), shares = {'giv-a': 80, 'giv-b': 20};
  let b = 0; for (let i = 0; i < 5000; i++) if (pickFilm(shares, ['giv-a', 'giv-b', 'giv-c'], random()) === 'giv-b') b++;
  assert.ok(Math.abs(b / 5000 - 0.2) < 0.02);
  assert.equal(pickFilm(shares, ['giv-c', 'giv-d'], 0.5), null);
  assert.equal(pickFilm(undefined, ['giv-a'], 0.5), null);
});

// ── The drawn composition, on a made-up register ────────────────────────────
const entries = new Map<string, TreeEntry>([
  ['a1', {id: 'a1', role: 'ankare-1', node: 'IDLE'}], ['a21', {id: 'a21', role: 'ankare-2.1', node: 'READY'}],
  ['a1t', {id: 'a1t', role: 'ankare-1', node: 'IDLE'}], ['a23', {id: 'a23', role: 'ankare-2.3', node: 'READY-C'}],
]);
const defs: TreeDef[] = [
  {id: 'casino', name: 'Casino', state: 'spelas', root: 'a1', anchors: [{entry: 'a1'}, {entry: 'a21'}]},
  {id: 'tatuerad', name: 'Tatuerad', state: 'byggs', root: 'a1t', anchors: [{entry: 'a1t'}, {entry: 'a23'}]},
  {id: 'ingangen', name: 'Ingången', state: 'spelas', root: 'a1', anchors: [{entry: 'a1'}, {entry: 'a21'}], shares: 'casino'},
];
const placed = (id: string, tree: string, from: string, to: string, verdict: TreeTake['verdict'] = 'godkand'): TreeTake => ({id, tree, from, to, verdict, byJakob: true, provisional: false});
const takes: TreeTake[] = [
  placed('c-vila', 'casino', 'IDLE', 'IDLE'), placed('c-in', 'casino', 'IDLE', 'READY'), placed('c-ut', 'casino', 'READY', 'IDLE'),
  placed('c-p1', 'casino', 'READY', 'P1.C1', 'primar'), placed('c-p1-b', 'casino', 'READY', 'P1.C1', 'variant'), placed('c-p1-r', 'casino', 'P1.C1', 'READY'),
  placed('c-d1', 'casino', 'READY', 'D.C1'), placed('c-d1-r', 'casino', 'D.C1', 'READY'), placed('c-p2-x', 'casino', 'READY', 'P2.C1', 'underkand'),
  placed('t-in', 'tatuerad', 'IDLE', 'READY-C'), placed('t-p1', 'tatuerad', 'READY-C', 'P1.C1'), placed('t-p1-r', 'tatuerad', 'P1.C1', 'READY-C'),
  placed('t-p3', 'tatuerad', 'READY-C', 'P3.C1'),
];
const views = defs.map(def => treeView('paow', def, defs, entries, takes));
const both: CompositionDef = {id: 'bada', name: 'Båda', trees: [{tree: 'casino', share: 80}, {tree: 'tatuerad', share: 20}], bridges: [{a: 'a1', b: 'a1t', ab: 'assets/x/dit.mp4', ba: 'assets/x/hem.mp4'}]};

test('kompositionen ritad: en underkänd film täcker inget steg, Primär är stegets film utan andelar, varianternas andelar gäller', () => {
  const view = compositionView(both, views, takes), at = (key: string) => view.steps.find(s => s.key === key)!;
  assert.deepEqual(at('giv:P1.C1').parts.map(p => [p.tree, p.how, p.percent]), [['casino', 'eget', 80], ['tatuerad', 'eget', 20]]);
  assert.deepEqual([at('giv:D.C1').state, at('giv:D.C1').lacking, at('giv:D.C1').reach], ['lanat', ['tatuerad'], 'vila']);
  assert.equal(at('giv:P2.C1').state, 'saknas', 'en underkänd film täcker inget steg');
  assert.deepEqual(at('giv:P1.C1').parts[0].films.map(f => [f.id, f.percent]), [['c-p1', 100], ['c-p1-b', 0]]);
  const shared = compositionView({...both, shares: {'c-p1': 80, 'c-p1-b': 20}}, views, takes).steps.find(s => s.key === 'giv:P1.C1')!;
  assert.deepEqual(shared.parts[0].films.map(f => [f.id, f.percent]), [['c-p1', 80], ['c-p1-b', 20]]);
  // A tree that shares another's films is that tree, once.
  assert.deepEqual(compositionView({id: 'x', name: 'X', trees: [{tree: 'ingangen', share: 1}, {tree: 'casino', share: 1}]}, views, takes).trees.map(t => [t.tree, t.share]), [['casino', 2]]);
});

test('ett ensamt träd är dagens trad: samma bank, samma träd för varje kort, inga bryggor; i en komposition lämnar varje träd ut det andras', () => {
  assert.deepEqual(compositionView(soloComposition(defs[1]), views, takes).trees.map(t => [t.tree, t.percent, t.hub]), [['tatuerad', 100, 'READY-C']]);
  const own = takes.filter(t => t.tree === 'tatuerad').map(t => t.id), drop = takes.filter(t => t.tree === 'casino').map(t => t.id);
  const bank = {jobs: takes.map(t => ({id: t.id, from: t.from, to: t.to})), derived: [{id: 'borta', from: 'READY', to: 'P5.C1'}]};
  assert.deepEqual(treeBank(bank, {trees: [{...tatuerad, share: 100, own}], drop}, 'tatuerad'), cutBank(bank, {hub: 'READY-C', own, drop}));
  const s = {trees: [{...tatuerad, share: 100, own}], bridges: [], shares: {}, home: 'tatuerad'}, moves: Move[] = [{deal: 'P1.C1'}, {deal: 'P3.C1'}];
  assert.deepEqual(assign(s, moves, () => true, seeded(5)), ['tatuerad', 'tatuerad']);
  const beats = leg(moves), woven = weave(s, [{tree: 'tatuerad', beats}]);
  assert.deepEqual([woven.beats, woven.bridges, woven.breaks], [beats, [], []]);
  const two = {trees: [{...casino, own: drop}, {...tatuerad, own}], drop: []};
  assert.deepEqual(treeBank(bank, two, 'casino').jobs!.map(j => j.id), drop);
  assert.deepEqual(treeBank(bank, two, 'tatuerad').jobs!.find(j => j.id === 't-p1'), {id: 't-p1', from: 'READY', to: 'P1.C1'});
  assert.equal(treeBank(bank, two, 'tatuerad').derived!.length, 1, 'en film i inget träd följer med');
});

test('spelet utan trädord: ett träd som inte spelas läcker inte in, en film i inget träd följer med, och kopian på nätet spelar samma snitt', () => {
  const all = [...takes, {id: 'borta', tree: null}], tat = takes.filter(t => t.tree === 'tatuerad').map(t => t.id);
  assert.deepEqual(unplayedTakes(defs, all), tat);
  assert.deepEqual(unplayedTakes(defs.map(d => ({...d, state: 'spelas' as const})), all), []);
  // A tree that is not spelas still plays when a tree that is shares it (Ingången plays the Casino's films).
  assert.deepEqual(unplayedTakes(defs.map(d => d.id === 'casino' ? {...d, state: 'vilar' as const} : d), all), tat);
  const bank = {jobs: all.map(t => ({id: t.id, from: t.id === 'borta' ? 'READY' : (t as TreeTake).from, to: t.id === 'borta' ? 'P5.C1' : (t as TreeTake).to}))};
  assert.deepEqual(gameBank(bank, {status: 200, answer: {schemaVersion: 1, dealer: 'paow', played: ['casino'], drop: tat}}, 'paow').jobs.map(j => j.id), all.map(t => t.id).filter(id => !tat.includes(id)));
  for (const reply of [null, {status: 404, answer: {error: 'x'}}, {status: 200, answer: {trees: []}}]) assert.equal(gameBank(bank, reply, 'paow'), bank, 'utan svar: som i dag');
  // One played tree is the game, exactly as ?trad=<id>.
  const hubOf = (def: TreeDef) => views.find(v => v.tree.id === def.id)!.hub;
  const alone = playedCut('paow', defs.map(d => ({...d, state: d.id === 'tatuerad' ? 'spelas' as const : 'vilar' as const})), all, hubOf);
  const asTrad = {hub: 'READY-C', own: tat, drop: takes.filter(t => t.tree === 'casino').map(t => t.id)};
  assert.deepEqual(gameBank(bank, {status: 200, answer: alone}, 'paow'), cutBank(bank, asTrad), 'som ?trad=tatuerad');
  // The copy on the net has no /api/trees: its frozen bank carries the cut (tools/studio-freeze.ts freezeBank), and the lab's answer goes first.
  const frozen = {...bank, gameCuts: {paow: alone}}, today = playedCut('paow', defs, all, hubOf);
  assert.deepEqual(gameBank(frozen, null, 'paow').jobs, cutBank(bank, asTrad).jobs);
  assert.deepEqual(gameBank(frozen, {status: 200, answer: today}, 'paow').jobs, cutBank(bank, today).jobs);
  assert.equal(gameBank(frozen, null, 'ada'), frozen, 'en annan dealers snitt gäller inte');
});

test('registret: det som inte håller sägs', () => {
  const ids = ['casino', 'tatuerad'];
  assert.deepEqual(checkComposition(both, ids), []);
  for (const bad of [{id: 'Två Träd'}, {trees: [{tree: 'okand', share: 1}]}, {trees: [{tree: 'casino', share: 0}]}, {bridges: [{a: 'a1', b: 'a1t', ab: '../hemligt.mp4'}]},
    {bridges: [{a: 'a1', b: 'a1'}]}, {tempo: 3}, {trees: [{tree: 'casino', share: 1, tempo: 0.5}]}]) assert.ok(checkComposition({...both, ...bad}, ids).length, JSON.stringify(bad));
});

// Jakob 2026-11-24: "lossa detta förbud" (from 2026-11-23 21.10 such trees were not put together: Casino's hands are bare,
// Tatuerad's tattooed). Different hands, another rest picture A1, are said, and the composition is saved.
test('träd med olika händer går att sätta samman, och det sägs; ett träd ensamt går att spara', () => {
  const save = (def: unknown) => compositionToSave(def, views, takes, () => true);
  assert.equal(save(both).ok, true);
  assert.ok(handsNote(compositionView(both, views, takes)));
  assert.equal(handsNote(compositionView(soloComposition(defs[0]), views, takes)), null);
  assert.deepEqual(save({id: 'casino-snabb', name: ' Casino snabb ', trees: [{tree: 'casino', share: 100}], tempo: 2}), {ok: true, def: {id: 'casino-snabb', name: 'Casino snabb', trees: [{tree: 'casino', share: 100}], tempo: 2}});
  assert.equal(save({id: 'casino', name: 'Casino', trees: [{tree: 'casino', share: 100}]}).ok, false, 'an id that is a tree\'s');
});

// Jakob 2026-11-24: "två olika nodträd ... Både från 2.1 och från 2.3", bound together so that one can "vikta olika utgivningar som
// växlar mellan de olika utdelningssätten". The two ways of dealing have the same hands: one A1, another anchor at the shoe.
test('två sätt att dela ut med samma händer: sätts samman utan brygga, nypet lånar av skjutet där det saknar film, och bara den raka kamerans filmer spelas', () => {
  const pictures = new Map<string, TreeEntry>([...entries, ['a21t', {id: 'a21t', role: 'ankare-2.1', node: 'READY'}], ['a23s', {id: 'a23s', role: 'ankare-2.3', node: 'READY-C'}]]);
  const two: TreeDef[] = [
    {id: 'skjut', name: 'Skjut', state: 'byggs', root: 'a1t', anchors: [{entry: 'a1t'}, {entry: 'a23'}, {entry: 'a23s', seat: 2}]},
    {id: 'nyp', name: 'Nyp', state: 'byggs', root: 'a1t', anchors: [{entry: 'a1t'}, {entry: 'a21t'}]},
  ];
  const films: TreeTake[] = [
    placed('s-vila', 'skjut', 'IDLE', 'IDLE'), placed('s-in', 'skjut', 'IDLE', 'READY-C'), placed('s-ut', 'skjut', 'READY-C', 'IDLE'),
    ...SEATS.flatMap(p => [placed(`s-${p}`, 'skjut', 'READY-C', `${p}.C1`), placed(`s-${p}-r`, 'skjut', `${p}.C1`, 'READY-C')]),
    placed('n-in', 'nyp', 'IDLE', 'READY'), placed('n-ut', 'nyp', 'READY', 'IDLE'), placed('n-P4', 'nyp', 'READY', 'P4.C1'), placed('n-P4-r', 'nyp', 'P4.C1', 'READY'),
    {...placed('s2-P4', 'skjut', 'READY-C', 'P4.C1'), seat: 2}, // the same tree from seat 2's camera
  ];
  const drawn = two.map(def => treeView('paow', def, two, pictures, films));
  const def: CompositionDef = {id: 'skjut-nyp', name: 'Skjut + nyp', trees: [{tree: 'skjut', share: 50}, {tree: 'nyp', share: 50}]};
  assert.deepEqual(compositionToSave(def, drawn, films, () => true), {ok: true, def});
  const view = compositionView(def, drawn, films), at = (key: string) => view.steps.find(s => s.key === key)!;
  assert.equal(handsNote(view), null);
  assert.deepEqual([at('giv:P5.C1').state, at('giv:P5.C1').lacking], ['lanat', ['nyp']]);
  // The cut: a film seen from another seat is in no tree's own films and is left out, as ?trad= leaves it out.
  const cut = cutOf('paow', view, films);
  assert.deepEqual(cut.trees.map(t => [t.tree, t.hub, t.own.includes('s2-P4')]), [['skjut', 'READY-C', false], ['nyp', 'READY', false]]);
  assert.deepEqual(cut.drop, ['s2-P4']);
  assert.ok(compositionPlay('skjut-nyp', {status: 200, answer: cut}, 'Paow').cut);
  // The game: the pinch deals only what it has a film for, the push everything else; every film begins on the picture before it.
  const able = (tree: string, move: Move) => tree === 'skjut' ? 'deal' in move && /^P[1-7]\.C1$/.test(move.deal) : 'deal' in move && move.deal === 'P4.C1';
  for (const bridges of [cut.bridges, [{a: 'a23', b: 'a21t'}]]) {
    const s = {trees: cut.trees, bridges, shares: cut.shares, home: cut.home}, random = seeded(24);
    let hit = 0;
    for (let round = 0; round < 1000; round++) {
      const trees = assign(s, SEAT_CARDS, able, random), woven = weave(s, legsOf(SEAT_CARDS, trees));
      trees.forEach((t, i) => assert.ok(t === 'skjut' || (t === 'nyp' && i === 3), `kort ${i + 1} gavs av ${t}`));
      assert.deepEqual([seams(trace(s, woven), 'a1t'), woven.breaks], [[], []]);
      if (assign(s, [{deal: 'P4.C1'}], able, random)[0] === 'nyp') hit++; // a card of its own, from rest: by the share
    }
    assert.ok(Math.abs(hit / 1000 - 0.5) < 0.05, `nypet gav ${(hit / 10).toFixed(1)} % av de ensamma korten till plats 4, 50 % var satt`);
  }
});

test('tempot: trädets går före kompositionens, som går före utseendets, och bara 1 till 2 gäller', () => {
  const of = {tempo: 1.5, trees: [{tree: 'casino'}, {tree: 'tatuerad', tempo: 2}]};
  assert.equal(tempoOf(of, 'tatuerad', 1.2), 2);
  assert.equal(tempoOf(of, 'casino', 1.2), 1.5);
  assert.equal(tempoOf(of, null, 1.2), 1.5, 'en brygga: kompositionens');
  assert.equal(tempoOf({trees: of.trees}, 'casino', 1.2), 1.2);
  assert.equal(tempoOf(null, null, undefined), 1); assert.equal(tempoOf({tempo: 9, trees: []}, null, 1.3), 1.3);
});

// Jakob 2026-11-23: "spela upp dealerklipp i 1.5x eller 2x ... den nya standarden för respektive klipp". A film's own speed is
// the bank's playbackSpeed; the round's tempo is laid on it and never takes it past 2×.
test('farten: filmens egen fart gånger rundans tempo, och tempot aldrig över 2×', () => {
  assert.equal(filmRate(1, 1), 1); assert.equal(filmRate(1, 2), 2); assert.equal(filmRate(1.25, 1.5), 1.875);
  assert.equal(filmRate(2, 2), 2, '2× på filmen och 2× i tempot är 2×, inte 4×'); assert.equal(filmRate(1.5, 1.5), 2);
  assert.equal(filmRate(4, 2), 4, 'en film som själv ska gå fortare än 2× behåller sin fart'); assert.equal(filmRate(0.5, 2), 1);
  assert.equal(filmRate(NaN, NaN), 1);
});

// ── The game's film player with a composition (src/game-film.ts compose) ────
// A made-up bank: Casino deals seat 4 and the dealer's first card from A2.1 and has the rest film; Tatuerad deals seat 4 from
// A2.3 and has nothing else. A fake film queue records the parts it is handed. Tatuerad has a tempo of its own (2×) and its deal
// a speed of its own (1,5×); Casino follows the round (1,5×), and its dealer film has a speed of its own (1,25×).
test('spelet spelar kompositionen: trädens filmer med bryggan emellan, vilan i hemmaträdet, och farten på rundans filmer', async () => {
  const speeds: Record<string, number> = {'t-giv': 1.5, 'c-dealer': 1.25, 'c-vila': 2};
  const job = ([id, from, to, kind]: string[]) => ({id, kind, target: kind === 'DEAL' ? to : null, from, to, model: 'wan3', duration: 4, ratio: 'auto_1080p', audio: false, promptText: 'fixture', first: {file: {path: 'assets/anchors/x/anchor.png', sha256: 'a'.repeat(64)}}, purpose: 'fixture', dealer: 'paow', ...(speeds[id] ? {playbackSpeed: speeds[id]} : {})});
  const mine = [['c-in', 'IDLE', 'READY', 'ENTRY'], ['c-giv', 'READY', 'P4.C1', 'DEAL'], ['c-retur', 'P4.C1', 'READY', 'RETURN'], ['c-hem', 'P4.C1', 'IDLE', 'RETURN'], ['c-ut', 'READY', 'IDLE', 'RETURN'], ['c-vila', 'IDLE', 'IDLE', 'IDLE'],
    ['c-dealer', 'READY', 'D.C1', 'DEAL'], ['c-dealer-retur', 'D.C1', 'READY', 'RETURN'], ['c-dealer-hem', 'D.C1', 'IDLE', 'RETURN']];
  const hers = [['t-in', 'IDLE', 'READY-C', 'ENTRY'], ['t-giv', 'READY-C', 'P4.C1', 'DEAL'], ['t-retur', 'P4.C1', 'READY-C', 'RETURN'], ['t-ut', 'READY-C', 'IDLE', 'RETURN']];
  const jobs = [...mine, ...hers].map(job);
  const bank = {jobs, motions: Object.fromEntries(jobs.map(j => [j.id, {source: {fps: 30, frames: 120, sha256: 'a'.repeat(64)}, review: {decision: 'ACCEPTED'}, motion: j.id === 'c-vila' ? {idle: {calm: true, weight: 20}} : {physicalEndSide: 'FRONT'}}])),
    receipts: Object.fromEntries(jobs.map(j => [j.id, {status: 'SUCCEEDED'}])), media: Object.fromEntries(jobs.map(j => [j.id, {video: `assets/motions/${j.id}/source.mp4`}]))};
  const cut = {trees: [{...tatuerad, share: 100, own: hers.map(j => j[0])}, {...casino, share: 0, own: mine.map(j => j[0])}], drop: [], bridges: [REST_BRIDGE], shares: {}, home: 'casino'};
  const graphs = Object.fromEntries(cut.trees.map(t => [t.tree, buildGraph(treeBank(bank, cut, t.tree) as never, {dealer: 'paow'})]));
  type Part = {path: string; rest?: boolean; rate?: number; absoluteRate?: boolean};
  const parts: Part[][] = []; let end: () => void = () => {};
  const players = {play(list: Part[], options: {onPart?(i: number): void; onEnd?(): void} = {}) { parts.push(list); end = () => options.onEnd?.(); list.forEach((_, i) => options.onPart?.(i)); }, hurry() {}, preload() {}};
  const film = createFilm(players, graphs.casino, createLayout(defaultPlan()), async () => null, () => 0);
  film.compose({composer: createComposer(cut, seeded(41)), graphs});
  film.tempo = {round: () => 1.5, tree: tree => tree === 'tatuerad' ? 2 : null};
  const s = createSession({balance: 1000, shoe: {mode: 'stacked', seed: 'komposition', cards: 'K♠ 7♦ 6♥ 10♣ 5♦'.split(' ').map(text => ({r: text.slice(0, -1), s: text.slice(-1)}))}});
  const dealt = s.command({op: 'start', bets: [{seat: 4, main: 10}], requestId: 'k1', expectedVersion: s.state().ver}), table = tableCards(dealt);
  const playing = film.play(dealt.events, {table, records: cardRecords(table, cardFaces(dealt))});
  await new Promise(r => setTimeout(r, 0)); end(); const {gaps} = await playing; await new Promise(r => setTimeout(r, 0));
  const played = parts.flat(), nameOf = (p: Part) => p.path.split('/').at(-2) === 'x' ? p.path.split('/').at(-1)! : p.path.split('/')[2];
  // Seat 4's two cards are Tatuerad's (the second with the seat's film), the dealer's two are lent by Casino (her second with
  // the film of her first, the game's stand-in); every change of tree goes over the bridge, and the chain ends in Casino's rest.
  const tattooed = ['dit.mp4', 't-in', 't-giv', 't-retur', 't-ut', 'hem.mp4'], lent = ['c-in', 'c-dealer', 'c-dealer-hem'];
  assert.deepEqual(played.filter(p => !p.rest).map(nameOf), [...tattooed, ...lent, ...tattooed, ...lent]);
  assert.deepEqual(gaps.filter(g => g.startsWith('Skarv') || g.includes('börjar på')), [], 'ingen skarv utan brygga');
  const rest = played.at(-1)!;
  assert.ok(rest.rest && rest.path.includes('c-vila') && rest.rate === undefined, 'efter kedjan vilar hon i hemmaträdets vilofilm, som filmad');
  const rateOf = (id: string) => { const p = played.find(x => nameOf(x) === id)!; return [p.rate, p.absoluteRate]; };
  assert.deepEqual(rateOf('t-in'), [2, true], 'trädets tempo');
  assert.deepEqual(rateOf('t-giv'), [2, true], '1,5× på filmen gånger 2× i trädet stannar vid 2×');
  assert.deepEqual(rateOf('c-dealer'), [1.875, true], 'filmens 1,25× gånger rundans 1,5×');
  assert.deepEqual([rateOf('c-in'), rateOf('dit.mp4')], [[undefined, undefined], [undefined, undefined]], 'utan egen fart: kön lägger rundans tempo');
  film.compose(null); assert.equal(film.composing, false);
});

test('spelets ord ?komposition=: träd med olika händer spelas, och det sägs; det som inte kan spelas ger inget snitt', () => {
  const cut = {schemaVersion: 1, dealer: 'paow', id: 'bada', name: 'Båda', trees: [{...casino}, {...tatuerad}], drop: [], bridges: [], shares: {}, home: 'casino', count: {have: 33, own: 22, total: 36}, looks: ['a1', 'a1t']};
  const mixed = compositionPlay('bada', {status: 200, answer: cut}, 'Paow');
  assert.equal(mixed.cut, cut);
  assert.match(mixed.line!, /olika händer/);
  for (const [word, reply] of [['finns-inte', {status: 404, answer: {error: 'x'}}], ['bada', null], ['bada', {status: 200, answer: {...cut, count: {have: 0, own: 0, total: 36}}}]] as const)
    assert.equal(compositionPlay(word, reply as never, 'Paow').cut, null, `${word}: spelet spelar som vanligt`);
});
