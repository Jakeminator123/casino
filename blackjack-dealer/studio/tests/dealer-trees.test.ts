// Skyddar: spelets regler, kontrakten – ett träd visar och spelar bara sina egna filmer (eller säger var en film lånas ifrån), spelet med ett träd (?trad=) spelar aldrig ett annat träds film, och en bild med bara kortets märke ändrat är samma nod (Jakob 2026-11-26).
// src/dealer-trees.ts: a tree's 36 steps against his measure (Jakob 2026-11-21: "en giv per kort för respektive spelare"),
// each step's state (finns, prov, saknas) and the one number per tree, its ways and its cut, on made-up data: today's register
// changes every time a film is judged.
// Run from the repo root: node --test "studio/tests/dealer-trees.test.ts"
import test from "node:test";
import assert from "node:assert/strict";
import {
  MEASURE_SIZE,
  STRAIGHT_CAMERA,
  cutBank,
  dealsTo,
  markPairs,
  treeList,
  waysOf,
  cameraFromWord,
  cameraMade,
  cameraOf,
  cameraView,
  countWord,
  cutTakes,
  defaultTree,
  filmCamera,
  homeOf,
  measure,
  nodeCode,
  pictureCamera,
  playedCut,
  treeCount,
  unplayedTakes,
  treeGame,
  treeNodes,
  treeSteps,
  treeView,
  type Delivery,
  type TreeDef,
  type TreeEntry,
  type TreeTake,
} from "../../src/dealer-trees.ts";
import { verdictOf } from "../lib/verdict.ts";
import { buildGraph, resolveRound, returnFits, type BankData } from "../../src/clip-graph.ts";
import { nodesOf, treePlay } from "../../src/dealer-trees.ts";
import { hubChain, judgedBank } from "../../src/game-director.ts";

const take = (id: string, from: string, to: string, verdict: TreeTake["verdict"], more: Partial<TreeTake> = {}): TreeTake => ({ id, tree: "t", from, to, verdict, byJakob: true, provisional: false, ...more });
const byId = <T extends { id: string }>(list: readonly T[], id: string): T => {
  const hit = list.find((x) => x.id === id);
  assert.ok(hit, `${id} finns`);
  return hit;
};

test("the measure: 36 steps per anchor at the shoe, in the order a round meets them", () => {
  for (const hub of ["READY", "READY-B", "READY-C"]) {
    const steps = measure(hub);
    assert.equal(steps.length, MEASURE_SIZE);
    assert.equal(new Set(steps.map((s) => s.id)).size, MEASURE_SIZE, "no step twice");
    const kinds = Object.fromEntries(["vila", "ingang", "giv", "retur", "utgang", "halkort"].map((k) => [k, steps.filter((s) => s.kind === k).length]));
    assert.deepEqual(kinds, { vila: 1, ingang: 1, giv: 16, retur: 16, utgang: 1, halkort: 1 });
    assert.deepEqual([steps[0].id, steps[1].id, steps[34].id, steps[35].id], ["IDLE>IDLE", `IDLE>${hub}`, `${hub}>IDLE`, "IDLE>REVEAL(D.C1)"]);
    assert.ok(steps.filter((s) => s.kind === "giv").every((s) => s.from === hub && s.card === s.to), "every deal leaves the tree's anchor for its card");
    assert.ok(steps.filter((s) => s.kind === "retur").every((s) => s.to === hub), "every return goes back to the anchor, not to A1");
    assert.ok(!steps.some((s) => s.card === "D.C3"), "DC3 is not counted");
  }
  // An anchor variant at the shoe is a take of A2.1's edge in the bank's graph.
  assert.equal(byId(measure("READY-C"), "READY-C>P4.C1").edge, "READY>P4.C1");
  assert.equal(byId(measure("READY"), "READY>P4.C1").edge, "READY>P4.C1");
});

test("a step's state: finns, prov or saknas, read from the verdicts and never set", () => {
  const takes: TreeTake[] = [
    take("vila", "IDLE", "IDLE", "godkand"),
    take("vantar-p4c1", "READY-C", "P4.C1", "vantar", { byJakob: false }),
    take("under-p5c1", "READY-C", "P5.C1", "underkand"),
    take("via-p6c1", "READY-B", "P6.C1", "primar"),
    take("gone-p1c1", "READY-C", "P1.C1", "primar", { archived: true }),
    take("own-p3c1", "READY-C", "P3.C1", "godkand"),
    take("via-p3c1", "READY-B", "P3.C1", "godkand"),
    take("via-vantar-p7c1", "READY-B", "P7.C1", "vantar"),
    take("given-p2c1", "READY-C", "P2.C1", "variant", { byJakob: false, provisional: true }),
  ];
  const deliveries: Delivery[] = [{ order: "ord-p4c2", tree: "t", from: "READY-C", to: "P4.C2" }];
  const steps = treeSteps("READY-C", ["READY-B"], takes, deliveries);
  assert.equal(steps.length, MEASURE_SIZE);
  const at = (id: string) => byId(steps, id);

  assert.equal(at("IDLE>IDLE").state, "finns");
  assert.deepEqual([at("READY-C>P4.C1").state, at("READY-C>P4.C1").take], ["prov", "vantar-p4c1"], "a film waiting for his verdict");
  assert.deepEqual([at("READY-C>P4.C2").state, at("READY-C>P4.C2").deliveries], ["prov", ["ord-p4c2"]], "an order delivered, not in the bank");
  assert.equal(at("READY-C>P5.C1").state, "saknas", "only a film judged Inte bra");
  assert.deepEqual([at("READY-C>P6.C1").state, at("READY-C>P6.C1").via], ["finns", "READY-B"], "the other anchor stands in");
  assert.deepEqual([at("READY-C>P1.C1").state, at("READY-C>P1.C1").takes], ["saknas", 0], "an archived take is left out");
  assert.deepEqual([at("READY-C>P3.C1").take, at("READY-C>P3.C1").via], ["own-p3c1", null], "the tree's own film before a stand-in at the same verdict");
  assert.deepEqual(at("READY-C>P3.C1").ids, ["own-p3c1", "via-p3c1"], "the films panel lists the tree's films on the step, its stand-ins' too");
  assert.deepEqual(at("READY-C>P1.C1").ids, [], "not an archived one");
  assert.equal(at("READY-C>P7.C1").state, "saknas", "a stand-in waiting for a verdict does not make the step a trial");
  assert.deepEqual([at("READY-C>P2.C1").state, at("READY-C>P2.C1").byJakob, at("READY-C>P2.C1").provisional], ["finns", false, true], "a verdict given for him counts, marked as not his");
  assert.equal(at("READY-C>IDLE").state, "saknas");

  // The one number: the steps that have a film, of 36.
  assert.deepEqual(treeCount(steps), { have: 4, total: 36 });
  assert.equal(countWord(treeCount(steps)), "4/36");
  assert.equal(countWord(treeCount(treeSteps("READY", [], []))), "0/36");
});

test("a tree that shares another plays its films; the view opens on the tree the game plays", () => {
  const casino: TreeDef = { id: "casino", name: "Casino", state: "spelas", root: "a1", anchors: [{ entry: "a1" }, { entry: "a21" }] };
  const ingangen: TreeDef = { id: "ingangen", name: "Ingången", state: "spelas", root: "a1", anchors: [], shares: "casino" };
  const tatuerad: TreeDef = { id: "tatuerad", name: "Tatuerad", state: "byggs", root: "t1", anchors: [{ entry: "t1" }, { entry: "t23" }] };
  const trees = [tatuerad, ingangen, casino];
  const entries = new Map<string, TreeEntry>([
    ["a1", { id: "a1", role: "ankare", node: "IDLE" }],
    ["a21", { id: "a21", role: "ankare", node: "READY" }],
    ["t1", { id: "t1", role: "ankare", node: "IDLE" }],
    ["t23", { id: "t23", role: "ankare", node: "READY-C" }],
  ]);
  const takes = [take("c-vila", "IDLE", "IDLE", "primar", { tree: "casino" }), take("t-giv", "READY-C", "P4.C1", "godkand", { tree: "tatuerad" })];

  assert.equal(homeOf(ingangen, trees).id, "casino");
  assert.equal(homeOf(casino, trees).id, "casino");
  const views = trees.map((t) => treeView("paow", t, trees, entries, takes));
  const [t, i, c] = views;
  assert.ok(views.every((v) => v.steps.length === MEASURE_SIZE));
  assert.deepEqual([c.count, i.count, t.count], [{ have: 1, total: 36 }, { have: 1, total: 36 }, { have: 1, total: 36 }]);
  assert.equal(i.home, "casino");
  assert.equal(c.hub, "READY");
  assert.equal(t.hub, "READY-C", "a tree is measured from its own anchor at the shoe");
  assert.equal(byId(t.steps, "READY-C>P4.C1").state, "finns");
  assert.equal(byId(c.steps, "READY>P4.C1").state, "saknas", "another tree's film does not count");

  assert.equal(defaultTree(trees)?.id, "casino", "the first tree the game plays that shares none");
  assert.equal(defaultTree([tatuerad])?.id, "tatuerad");
  assert.equal(defaultTree([]), null);
});

test("the tree's nodes: a picture from Material or an empty box, with his short names", () => {
  const tree: TreeDef = { id: "t", name: "T", state: "byggs", root: "a1", anchors: [{ entry: "a1" }, { entry: "a23" }, { entry: "a22" }, { entry: "p4c1" }] };
  const entries = new Map<string, TreeEntry>([
    ["a1", { id: "a1", role: "ankare", node: "IDLE" }],
    ["a23", { id: "a23", role: "ankare", node: "READY-C" }],
    ["a22", { id: "a22", role: "ankare", node: "READY-B" }],
    ["p4c1", { id: "p4c1", role: "landning", card: "P4.C1" }],
    ["l-p5c1", { id: "l-p5c1", role: "landning", card: "P5.C1", builtOn: ["a1", "a23"] }],
    ["l-p6c1", { id: "l-p6c1", role: "landning", card: "P6.C1", builtOn: ["a1", "elsewhere"] }],
    ["l-p7c1", { id: "l-p7c1", role: "landning", card: "P7.C1", builtOn: ["a23"], state: "ersatt" }],
  ]);
  const nodes = treeNodes(tree, entries);
  assert.equal(nodes.length, 1 + 2 + 16 + 1, "A1, two anchors at the shoe, 16 cards, the hole card");
  const at = (n: string) => nodes.find((x) => x.node === n);
  assert.deepEqual(nodes.slice(0, 3).map((n) => [n.code, n.entry]), [["A1", "a1"], ["A2.3", "a23"], ["A2.2", "a22"]], "the first A2.x anchor is the tree's");
  assert.equal(at("P4.C1")?.entry, "p4c1", "the tree's own A3");
  assert.equal(at("P5.C1")?.entry, "l-p5c1", "a landing made from the tree's anchors only");
  assert.equal(at("P6.C1")?.entry, null, "a landing made from another anchor is not this tree's");
  assert.equal(at("P7.C1")?.entry, null, "a replaced landing is not drawn");
  assert.equal(at("P1.C1")?.entry, null, "no picture: an empty box with its name");
  assert.deepEqual([at("P4.C2")?.code, at("D.C1")?.code], ["A3P4C2", "A3DC1"]); assert.ok(at("REVEAL(D.C1)"), "the hole card's turn is a node of the tree");
  assert.equal(treeNodes({ ...tree, anchors: [{ entry: "a1" }] }, entries)[1].node, "READY", "a tree without an anchor at the shoe is measured from A2.1");
  assert.equal(nodeCode("READY-B", 2), "S2-A2.2");
});

// What a step shows (Jakob 2026-11-24 at A3P7C1: no film there "actually deals the card the way the return is"): the views
// showed each step's best film by verdict alone, the game plays a deal with the return cut from it. On made-up films of a tree
// on A2.3 with an A2.2: seat 7 has a rejected deal with an approved return and a newer deal and return that are variants;
// seat 5 two approved pairs; seat 6 an approved pair of the tree's own and one from A2.2, which no game deals the seat
// from any longer; seat 4 a deal that waits and one rejected; seat 3 a rejected deal.
test("a step's shown return continues its shown deal, and both are the films the game plays in the tree", () => {
  type Made = { id: string; clip: string; frames: [number, number]; from: string; to: string; decision?: string; variant?: boolean };
  const pair = (seat: number, word: string, from: string, deal: Partial<Made> = {}, back: Partial<Made> = {}): Made[] => [
    { id: `p${seat}-${word}-deal`, clip: `p${seat}-${word}`, frames: [0, 60], from, to: `P${seat}.C1`, decision: "ACCEPTED", ...deal },
    { id: `p${seat}-${word}-back`, clip: `p${seat}-${word}`, frames: [61, 90], from: `P${seat}.C1`, to: from, decision: "ACCEPTED", ...back },
  ];
  const one = (id: string, from: string, to: string, decision?: string): Made => ({ id, clip: id, frames: [0, 40], from, to, decision });
  const made: Made[] = [
    one("rest", "IDLE", "IDLE", "ACCEPTED"), one("in", "IDLE", "READY-C", "ACCEPTED"), one("out", "READY-C", "IDLE", "ACCEPTED"),
    one("b-in", "IDLE", "READY-B", "ACCEPTED"), one("b-out", "READY-B", "IDLE", "ACCEPTED"),
    ...pair(7, "old", "READY-C", { decision: "REJECTED" }), ...pair(7, "new", "READY-C", { variant: true }, { variant: true }),
    ...pair(5, "a", "READY-C"), ...pair(5, "b", "READY-C"),
    ...pair(6, "own", "READY-C"), ...pair(6, "b", "READY-B"),
    one("p4-waits", "READY-C", "P4.C1"), one("p4-fell", "READY-C", "P4.C1", "REJECTED"), one("p3-fell", "READY-C", "P3.C1", "REJECTED"),
  ];
  const review = (m: Made) => (m.decision ? { review: { decision: m.decision, ...(m.variant ? { acceptedAs: "VARIANT" } : {}), userAccepted: m.decision === "ACCEPTED" } } : {});
  // A return starts on the frame after its deal's last, as a film cut in two does.
  const seam = (m: Made) => (m.id.endsWith("-back") ? { motion: { startsOn: { clip: m.id.replace(/-back$/, "-deal"), frame: m.frames[0] } } } : {});
  const bank = {
    jobs: [], edits: [], derived: made.map(({ id, clip, frames, from, to }) => ({ id, clip, frames, from, to, dealer: "paow" })),
    motions: Object.fromEntries(made.map((m) => [m.id, { ...review(m), ...seam(m) }])),
    media: Object.fromEntries(made.map((m) => [m.id, { video: `assets/motions/${m.clip}/source.mp4` }])),
  } as unknown as BankData;

  // The tree, and every film placed in it with its verdict, as tools/dealer-tree.ts placedTakes gives them.
  const tree: TreeDef = { id: "t", name: "T", state: "byggs", root: "a1", anchors: [{ entry: "a1" }, { entry: "a23" }, { entry: "a22" }] };
  const entries = new Map<string, TreeEntry>([["a1", { id: "a1", role: "ankare", node: "IDLE" }], ["a23", { id: "a23", role: "ankare", node: "READY-C" }], ["a22", { id: "a22", role: "ankare", node: "READY-B" }]]);
  const all = buildGraph(bank, { dealer: "paow" });
  const takes: TreeTake[] = Object.values(all.takes).map((t) => { const [from, to] = nodesOf(t.edge, t.hub), v = verdictOf(t); return { id: t.id, tree: "t", from, to, verdict: v.verdict, byJakob: v.byJakob, provisional: v.provisional }; });
  const view = treeView("paow", tree, [tree], entries, takes, [], bank), plain = treeView("paow", tree, [tree], entries, takes);
  assert.deepEqual([view.hub, view.others], ["READY-C", ["READY-B"]]);

  // The game with this tree, as the page builds it (?trad=t), and what it plays to a card and back to the shoe.
  const cut = { schemaVersion: 1, dealer: "paow", tree: "t", name: "T", home: "t", hub: view.hub, count: view.count, own: takes.map((t) => t.id), drop: [] };
  const game = buildGraph(judgedBank(treePlay(bank, "t", { status: 200, answer: cut }, "Paow").bank), { dealer: "paow" });
  const plays = (steps: { from: string; to: string }[]) => resolveRound(game, steps).map((s) => s.take?.id ?? null);
  const shown = (card: string) => { const deal = view.steps.find((s) => s.kind === "giv" && s.card === card)!, back = view.steps.find((s) => s.kind === "retur" && s.card === card)!; return { deal, back, films: [deal.take, back.take] }; };

  for (const card of ["P5.C1", "P7.C1"]) {
    const { deal, back, films } = shown(card);
    assert.deepEqual(films, plays([{ from: "READY", to: card }, { from: card, to: "READY" }]), `${card}: the view shows the game's deal and return`);
    assert.ok(returnFits(all.takes[back.take!], all.takes[deal.take!]), `${card}: the shown return continues the shown deal`);
  }
  assert.deepEqual(shown("P7.C1").films, ["p7-new-deal", "p7-new-back"], "the variant deal with its own return, not the approved return of a rejected deal");
  assert.deepEqual([shown("P7.C1").back.verdict, shown("P7.C1").back.state], ["variant", "finns"], "the step says the shown film's verdict");
  assert.deepEqual(shown("P5.C1").films, ["p5-b-deal", "p5-b-back"], "among equals the game plays the newest pair");
  // Seat 6 has a pair of the tree's own and one from A2.2. No seat is dealt from another anchor since the tree with A2.2
  // went (SEAT_HUB is empty, 2026-11-26), so the step shows the tree's own pair, as the game plays it.
  const six = shown("P6.C1");
  assert.deepEqual(six.films, plays([{ from: "READY", to: "P6.C1" }, { from: "P6.C1", to: "READY" }]), "P6.C1: the view shows the game's deal and return");
  assert.deepEqual(six.films, ["p6-own-deal", "p6-own-back"]);
  assert.ok(returnFits(all.takes[six.back.take!], all.takes[six.deal.take!]));

  // Only which film is shown changes: every step keeps its state and its films, the shown one first; a step without an approved film is as it was.
  for (const [k, s] of view.steps.entries()) {
    assert.deepEqual([s.state, s.takes, [...s.ids].sort()], [plain.steps[k].state, plain.steps[k].takes, [...plain.steps[k].ids].sort()], s.id);
    if (s.take) assert.equal(s.ids[0], s.take, `${s.id}: the shown film is listed first`);
  }
  assert.deepEqual(view.count, plain.count);
  const at = (id: string) => byId(view.steps, id);
  assert.deepEqual([at("READY-C>P4.C1").state, at("READY-C>P4.C1").take, at("READY-C>P4.C1").verdict], ["prov", "p4-waits", "vantar"], "a film that waits is shown as before");
  assert.deepEqual([at("READY-C>P3.C1").state, at("READY-C>P3.C1").take], ["saknas", null], "a rejected film is not shown");
});

// The game with one tree (?trad=<id>, src/game-page.ts; Jakob 2026-11-23): the contract, on made-up takes. Tree "t" stands on
// A2.3 (READY-C), tree "c" on A2.1; Borta and an older A2.3 attempt are placed in no tree; "x-p1" is another dealer's.
test("one tree in the game: without the word the bank is untouched; with it the tree's takes and the ownerless ones play, never another tree's", () => {
  const take = (id: string, from: string, to: string, dealer = "paow") => ({ id, clip: id, frames: [0, 40] as [number, number], from, to, dealer });
  const derived = [
    take("t-in", "IDLE", "READY-C"), take("t-p1", "READY-C", "P1.C1"), take("t-p1-back", "P1.C1", "READY-C"),
    take("c-in", "IDLE", "READY"), take("c-p1", "READY", "P1.C1"), take("c-rest", "IDLE", "IDLE"), take("c-p6", "READY-B", "P6.C1"),
    take("borta", "IDLE", "AWAY"), take("old-23", "READY-C", "P2.C1"), take("x-p1", "READY", "P1.C1", "nova"),
  ];
  const bank = { jobs: [], edits: [], derived, motions: Object.fromEntries(derived.map((d) => [d.id, { review: { decision: "ACCEPTED" } }])) } as unknown as BankData;
  const before = structuredClone(bank);
  const cut = { schemaVersion: 1, dealer: "paow", tree: "t", name: "Tatuerad", home: "t", hub: "READY-C", count: { have: 3, total: 36 }, own: ["t-in", "t-p1", "t-p1-back"], drop: ["c-in", "c-p1", "c-rest", "c-p6"] };
  const takes = (b: BankData, dealer = "paow") => Object.keys(buildGraph(judgedBank(b), { dealer }).takes).sort();

  const plain = treePlay(bank, null, null, "Paow");
  assert.equal(plain.bank, bank, "without ?trad= the game plays the bank it read");
  assert.equal(plain.line, null);

  const one = treePlay(bank, "t", { status: 200, answer: cut }, "Paow");
  assert.equal(one.line, "Tatuerad 3/36: kort utan film läggs utan hand");
  assert.deepEqual(takes(one.bank), ["borta", "old-23", "t-in", "t-p1", "t-p1-back"], "the tree's takes and the ones no tree owns; none of tree c");
  const graph = buildGraph(judgedBank(one.bank), { dealer: "paow" });
  assert.deepEqual([graph.takes["t-in"].edge, graph.takes["t-p1"].edge, graph.takes["t-p1"].hub], ["IDLE>READY", "READY>P1.C1", null], "the tree's A2.3 is the game's shoe");
  assert.equal(graph.takes["old-23"].hub, "READY-C", "a take of no tree stays as it was");
  assert.deepEqual(takes(one.bank, "nova"), ["x-p1"], "another dealer's takes are not touched");
  assert.deepEqual(bank, before, "the bank read is not changed");

  // An unknown tree, a tree without films, an answer that is no cut (a lab server not yet restarted) or none: as without the word.
  const usual = " Spelet spelar som vanligt, med alla hennes filmer.";
  for (const [word, reply, line] of [
    ["nej", { status: 404, answer: { error: 'paow har inget träd "nej".' } }, `Paow har inget träd "nej".${usual}`],
    ["t", { status: 200, answer: { ...cut, count: { have: 0, total: 36 } } }, `Tatuerad har inga filmer än.${usual}`],
    ["t", { status: 200, answer: { schemaVersion: 1, dealer: "paow", trees: [] } }, `Trädet "t" kunde inte läsas.${usual}`],
    ["t", null, `Trädet "t" kunde inte läsas.${usual}`],
    ["T Ä", null, `"T Ä" är inget träd.${usual}`],
  ] as const) {
    const out = treePlay(bank, word, reply, "Paow");
    assert.equal(out.bank, bank, `${word}: the bank as it is`);
    assert.equal(out.line, line);
  }
});

// The camera as a dimension (Jakob 2026-11-23: Karta starts on "standard-plats 4-kameran", and a control changes to camera
// 1–7): the contract, on a made-up tree. Tree "t" has A1 and A2.3 from the straight camera, and from seat 2 an A2.3 of its own,
// an A2.2 only that seat has and a landing built on its A2.3; one film from seat 2 and one that waits.
test("the camera: a tree is the straight camera's, another seat's pictures and films are that camera's, and an unmade camera is the same tree empty", () => {
  const tree: TreeDef = { id: "t", name: "T", state: "spelas", root: "a1", anchors: [{ entry: "a1" }, { entry: "a23" }, { entry: "s2-a23", seat: 2 }, { entry: "s2-a22", seat: 2 }] };
  const entries = new Map<string, TreeEntry>([
    ["a1", { id: "a1", role: "ankare", node: "IDLE" }],
    ["a23", { id: "a23", role: "ankare", node: "READY-C" }],
    ["s2-a23", { id: "s2-a23", role: "ankare", node: "READY-C" }],
    ["s2-a22", { id: "s2-a22", role: "ankare", node: "READY-B" }],
    ["l-p4c1", { id: "l-p4c1", role: "landning", card: "P4.C1", builtOn: ["a1", "a23"] }],
    ["s2-p2c1", { id: "s2-p2c1", role: "landning", card: "P2.C1", builtOn: ["s2-a23"] }],
  ]);
  assert.deepEqual([undefined, null, "", "0", "8", "2x", "4", "7"].map(cameraFromWord), [4, 4, 4, 4, 4, 4, 4, 7], "an address without a camera, or with no camera's word, is the straight one");
  assert.deepEqual([cameraOf({}), cameraOf({ seat: 2 }), cameraOf(undefined)], [STRAIGHT_CAMERA, 2, STRAIGHT_CAMERA]);
  assert.deepEqual(["a23", "s2-a23", "l-p4c1", "s2-p2c1", "elsewhere"].map((id) => pictureCamera(tree, entries.get(id) ?? { id })), [4, 2, 4, 2, 4], "a landing is seen from the seat of the anchor it is built on");
  assert.equal(filmCamera(tree, [entries.get("a1")!, entries.get("s2-a23")!]), 2, "a film that stands on a seat's picture is that seat's");
  assert.equal(filmCamera(tree, [entries.get("a1")!, entries.get("a23")!]), STRAIGHT_CAMERA);

  const takes: TreeTake[] = [
    take("in", "IDLE", "READY-C", "godkand"),
    take("p4c1", "READY-C", "P4.C1", "primar"),
    take("s2-p2c1", "READY-C", "P2.C1", "godkand", { seat: 2 }),
    take("s2-p3c1", "READY-B", "P3.C1", "godkand", { seat: 2 }),
    take("s2-wait", "READY-C", "P5.C1", "vantar", { seat: 2, byJakob: false }),
  ];
  const view = treeView("paow", tree, [tree], entries, takes);

  // The straight camera: as the tree always was, with nothing of seat 2 in it.
  assert.deepEqual([view.hub, view.others], ["READY-C", []], "an A2.x that only a seat has is not the straight tree's");
  assert.deepEqual(view.count, { have: 2, total: 36 });
  assert.equal(byId(view.steps, "READY-C>P2.C1").state, "saknas", "a film from seat 2 is no film of the straight camera");
  assert.deepEqual(view.nodes.slice(0, 2).map((n) => n.entry), ["a1", "a23"]);
  assert.equal(view.nodes.find((n) => n.node === "P2.C1")?.entry, null);
  assert.equal(cameraView(view, STRAIGHT_CAMERA), view, "camera 4 is the view itself");
  assert.equal(treeView("paow", { ...tree, anchors: tree.anchors.slice(0, 2) }, [tree], entries, takes.slice(0, 2)).cameras, undefined, "a tree with nothing from a seat answers as before");

  // Seat 2: the same tree, with the pictures and films made from there.
  assert.deepEqual(view.cameras?.map((c) => c.seat), [2]);
  const two = cameraView(view, 2), at = (n: string) => two.nodes.find((x) => x.node === n)?.entry;
  assert.deepEqual([two.tree.id, two.hub, two.others], ["t", "READY-C", ["READY-B"]], "measured from the tree's own anchor at the shoe");
  assert.deepEqual([at("IDLE"), at("READY-C"), at("READY-B"), at("P2.C1"), at("P4.C1")], [null, "s2-a23", "s2-a22", "s2-p2c1", null]);
  assert.deepEqual(two.count, { have: 2, total: 36 });
  assert.deepEqual([byId(two.steps, "READY-C>P2.C1").take, byId(two.steps, "READY-C>P3.C1").via, byId(two.steps, "READY-C>P5.C1").state], ["s2-p2c1", "READY-B", "prov"]);
  assert.equal(byId(two.steps, "READY-C>P4.C1").state, "saknas", "the straight camera's film is not seat 2's");
  assert.deepEqual(cameraMade(view, 2), { pictures: 3, films: 2, waiting: 1, first: "s2-a23" });
  assert.deepEqual(cameraMade(view, 4), { pictures: 3, films: 2, waiting: 0, first: "a1" });

  // A camera nothing is made from: the same tree, empty.
  const six = cameraView(view, 6);
  assert.deepEqual(six.nodes.map((n) => n.node), view.nodes.map((n) => n.node), "the same nodes");
  assert.ok(six.nodes.every((n) => n.entry === null) && six.steps.every((s) => s.state === "saknas" && s.take === null));
  assert.deepEqual([six.steps.length, six.count], [MEASURE_SIZE, { have: 0, total: 36 }]);
  assert.deepEqual(cameraMade(view, 6), { pictures: 0, films: 0, waiting: 0, first: null });

  // The game plays the straight camera: a film from a seat is dropped also in its own tree, with or without ?trad=.
  assert.deepEqual(cutTakes("t", takes), { own: ["in", "p4c1"], drop: ["s2-p2c1", "s2-p3c1", "s2-wait"] });
  assert.deepEqual(unplayedTakes([tree], takes), ["s2-p2c1", "s2-p3c1", "s2-wait"]);
  assert.deepEqual(playedCut("paow", [tree], takes, () => "READY-C").own, ["in", "p4c1"]);
});

// Ways (Jakob 2026-11-26: "det enda som skiljer är väl bara att A1 kan förgrena sig till A2.1 eller A2.3"), on a made-up tree:
// "t" deals from A2.3 (and its picture with the card's mark, which holds), and its way "n" from A2.1 on the same A1. The rest
// film stands only on A1, so tools/dealer-tree.ts gives it to both (also).
test("a tree's ways: each way is played and drawn as a tree of its own; the tree's game never plays the way's films", () => {
  const t: TreeDef = { id: "t", name: "T", state: "spelas", root: "a1", anchors: [{ entry: "a1" }, { entry: "a23" }, { entry: "a23m", markOf: "a23" }], ways: [{ id: "n", name: "N", state: "byggs", anchors: [{ entry: "a21" }] }] };
  const entries = new Map<string, TreeEntry>([
    ["a1", { id: "a1", role: "ankare", node: "IDLE", state: "gäller" }],
    ["a23", { id: "a23", role: "ankare", node: "READY-C", state: "arkiverad" }],
    ["a23m", { id: "a23m", role: "ankare", node: "READY-C", state: "gäller" }],
    ["a21", { id: "a21", role: "ankare", node: "READY", state: "gäller" }],
  ]);
  const takes: TreeTake[] = [
    take("rest", "IDLE", "IDLE", "godkand", { tree: "t", also: ["n"] }),
    take("t-in", "IDLE", "READY-C", "godkand", { tree: "t" }),
    take("t-p4", "READY-C", "P4.C1", "godkand", { tree: "t" }),
    take("n-in", "IDLE", "READY", "godkand", { tree: "n" }),
    take("n-p4", "READY", "P4.C1", "godkand", { tree: "n" }),
  ];
  const trees = treeList([t]);
  assert.deepEqual(trees.map((x) => [x.id, x.wayOf ?? null, x.anchors.map((a) => a.entry)]), [["t", null, ["a1", "a23", "a23m"]], ["n", "t", ["a1", "a21"]]]);
  const [main, way] = trees.map((x) => treeView("paow", x, trees, entries, takes));
  assert.deepEqual([main.hub, main.others, way.hub, way.others], ["READY-C", [], "READY", []], "a way is not an anchor that stands in for the tree");
  assert.deepEqual([main.count, way.count], [{ have: 3, total: 36 }, { have: 3, total: 36 }], "the rest is both ways' own");
  assert.equal(byId(main.steps, "READY-C>P4.C1").take, "t-p4");
  assert.equal(byId(way.steps, "READY>P4.C1").take, "n-p4");
  assert.equal(defaultTree(trees)?.id, "t", "a way is never the view's first tree");
  // Inspelning asks the deals to a card, way by way, the game's way first.
  assert.deepEqual(waysOf([main, way], "n").map((v) => v.tree.id), ["t", "n"]);
  assert.deepEqual(dealsTo([main, way], "t", "P4.C1").map((d) => [d.way, d.hub, d.state, d.take]), [["t", "READY-C", "finns", "t-p4"], ["n", "READY", "finns", "n-p4"]]);

  // The game: the tree plays its own films and its rest, never the way's; the way alone plays its films and the shared rest.
  assert.deepEqual(playedCut("paow", trees, takes, (d) => (d.id === "t" ? "READY-C" : "READY")), { schemaVersion: 1, dealer: "paow", played: ["t"], hub: "READY-C", own: ["rest", "t-in", "t-p4"], drop: ["n-in", "n-p4"] });
  assert.deepEqual(cutTakes("n", takes, true), { own: ["rest", "n-in", "n-p4"], drop: ["t-in", "t-p4"] }, "?trad=n");
  assert.deepEqual(cutTakes("n", takes), { own: ["n-in", "n-p4"], drop: ["rest", "t-in", "t-p4"] }, "in a composition the tree brings its own rest");

  // The same picture with the card's mark is the same node: the node shows the one that holds, its films stand on the other.
  assert.deepEqual(markPairs(t), [["a23m", "a23"]]);
  const shoe = main.nodes.find((x) => x.node === "READY-C");
  assert.deepEqual([shoe?.entry, shoe?.state, shoe?.films], ["a23m", "gäller", "a23"]);
  assert.deepEqual(way.nodes.find((x) => x.node === "READY")?.entry, "a21");
});

// The fault in Jakob's picture (2026-11-26): in Tatuerad, A2.3 → A3P6C1 said "Spelas nu: Giv A2.2 02 01", the Casino's film, and
// called the tree's own film "Spelas inte". The tree's view is read over the bank as the game plays the tree (TreeView.cut):
// the Casino's A2.2 chain for seat 6 (SEAT_HUB) is not in it, so the tree's own film is the one that plays, and the panel's
// Primär is never another tree's. Made-up films: tree "c" deals P6C1 from A2.2 (Primär, with its entry and exit), tree "t" from A2.3.
test("a tree's step is read over the tree's own bank: another tree's Primär on the same edge neither plays nor shows", () => {
  type Made = { id: string; from: string; to: string; main?: boolean };
  const made: Made[] = [
    { id: "c-in-b", from: "IDLE", to: "READY-B" }, { id: "c-p6-b", from: "READY-B", to: "P6.C1", main: true }, { id: "c-p6-b-back", from: "P6.C1", to: "READY-B" }, { id: "c-out-b", from: "READY-B", to: "IDLE" },
    { id: "t-in", from: "IDLE", to: "READY-C" }, { id: "t-p6", from: "READY-C", to: "P6.C1" }, { id: "t-p6-back", from: "P6.C1", to: "READY-C" }, { id: "t-out", from: "READY-C", to: "IDLE" },
  ];
  const bank = {
    jobs: [], edits: [], derived: made.map(({ id, from, to }) => ({ id, clip: id, frames: [0, 40], from, to, dealer: "paow" })),
    motions: Object.fromEntries(made.map((m) => [m.id, { review: { decision: "ACCEPTED", userAccepted: true, ...(m.main ? { acceptedAs: "MAIN" } : {}) } }])),
    media: Object.fromEntries(made.map((m) => [m.id, { video: `assets/motions/${m.id}/source.mp4` }])),
  } as unknown as BankData;
  const all = buildGraph(bank, { dealer: "paow" });
  const takes: TreeTake[] = Object.values(all.takes).map((x) => { const [from, to] = nodesOf(x.edge, x.hub), v = verdictOf(x); return { id: x.id, tree: x.id.startsWith("c-") ? "c" : "t", from, to, verdict: v.verdict, byJakob: v.byJakob, provisional: v.provisional }; });
  const c: TreeDef = { id: "c", name: "C", state: "vilar", root: "a1", anchors: [{ entry: "a1" }, { entry: "a22" }] };
  const t: TreeDef = { id: "t", name: "T", state: "spelas", root: "t1", anchors: [{ entry: "t1" }, { entry: "a23" }] };
  const entries = new Map<string, TreeEntry>([["a1", { id: "a1", role: "ankare", node: "IDLE" }], ["a22", { id: "a22", role: "ankare", node: "READY-B" }], ["t1", { id: "t1", role: "ankare", node: "IDLE" }], ["a23", { id: "a23", role: "ankare", node: "READY-C" }]]);
  const view = treeView("paow", t, [c, t], entries, takes, [], bank);
  assert.ok(view.cut, "the view carries its cut");
  assert.deepEqual([byId(view.steps, "READY-C>P6.C1").take, byId(view.steps, "READY-C>P6.C1").via], ["t-p6", null]);

  // In the whole bank the Casino's Primär is on the same edge (every anchor at the shoe is a take of A2.1's edge): the fault.
  assert.ok(all.edge["READY>P6.C1"].takes.some((x) => x.id === "c-p6-b"));
  // Over the tree's bank: only the tree's film is on the edge, no seat is dealt from A2.2, and it is the one that plays.
  const mine = cutBank(bank, { hub: view.hub, ...view.cut! });
  const game = buildGraph(judgedBank(mine), { dealer: "paow" });
  assert.deepEqual(game.edge["READY>P6.C1"].takes.map((x) => x.id), ["t-p6"]);
  assert.equal(hubChain(game, "READY-B", "P6.C1"), null, "the Casino's way to seat 6 from A2.2 is not in the tree's game");
  assert.deepEqual(resolveRound(game, [{ from: "READY", to: "P6.C1" }, { from: "P6.C1", to: "READY" }]).map((s) => s.take?.id), ["t-p6", "t-p6-back"]);
});

// What the game plays decides a stand-in, and what is on this machine decides what is said (Jakob 2026-11-26: the views are
// to say the truth). Tree "t" on A2.3 has an A2.1 of its own whose deal to seat 2 is approved; the game never deals from A2.1
// there, so with the game's graph that film is no film of the step. A film without its file here is said so.
test("a stand-in counts only where the game plays it, and a film whose file is not here is said so", () => {
  const steps = (game: boolean) => {
    const takes: TreeTake[] = [take("in", "IDLE", "READY-C", "godkand"), take("p2-a21", "READY", "P2.C1", "godkand"), take("p3", "READY-C", "P3.C1", "godkand", { film: false }),
      take("talk", "IDLE", "IDLE", "primar", { talk: true }), take("rest-far", "IDLE", "IDLE", "godkand", { film: false }), take("rest", "IDLE", "IDLE", "godkand")];
    const derived = takes.map((x) => ({ id: x.id, clip: x.id, frames: [0, 40], from: x.from, to: x.to }));
    const bank = { jobs: [], edits: [], derived, motions: Object.fromEntries(takes.map((x) => [x.id, { review: { decision: "ACCEPTED", userAccepted: true } }])), media: Object.fromEntries(takes.filter((x) => x.film !== false).map((x) => [x.id, { video: `assets/motions/${x.id}/source.mp4` }])) } as unknown as BankData;
    const g = game ? treeGame(bank, "paow", { hub: "READY-C", own: takes.map((x) => x.id), drop: [] }) : null;
    return treeSteps("READY-C", ["READY"], takes, [], g);
  };
  const [withGame, verdictsOnly] = [steps(true), steps(false)];
  assert.deepEqual([byId(verdictsOnly, "READY-C>P2.C1").state, byId(verdictsOnly, "READY-C>P2.C1").via], ["finns", "READY"], "without the game's graph, as the verdicts say");
  assert.equal(byId(withGame, "READY-C>P2.C1").state, "saknas", "the game never deals seat 2 from A2.1 in this tree");
  assert.deepEqual([byId(withGame, "READY-C>P3.C1").state, byId(withGame, "READY-C>P3.C1").noFile], ["finns", true], "approved, but its file is not here");
  assert.equal(byId(withGame, "IDLE>IDLE").take, "rest", "the rest shows a calm film that is here, not a talk film or one that is not here");
  assert.equal(byId(withGame, "IDLE>IDLE").noFile, undefined);
});
