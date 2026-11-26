// Skyddar: spelets regler, hans domar och val – ett träd räknar och visar bara talfilmer som spelet spelar i trädet och som finns på datorn, aldrig ett annat träds, en arkiverad eller en annan röst.
// studio/lib/tree-talk.ts: a tree's talk on Karta (Jakob 2026-11-23: the talk films "ska väl rimligen in i nodträdet"), on
// made-up data. Per line the film the game plays in the tree, from the tree's own talk films and those of no tree (as the
// game's cut keeps them, src/dealer-trees.ts cutBank), never another tree's; a count of its own beside the 36 steps.
// Run from the repo root: node --test "studio/tests/tree-talk.test.ts"
import test from "node:test";
import assert from "node:assert/strict";
import type { SpeechTake } from "../../src/speech-lines.ts";
import { treeTalk, type TalkRegister } from "../lib/tree-talk.ts";

const register: TalkRegister = {
  dealers: { paow: { language: "sv" } },
  names: { placebets: "Insatser", goodluck: "Lycka till", dealerplays: "Dealern spelar", hej: "Chatt, hälsning" },
  lines: { sv: { placebets: "Lägg era insatser, tack.", goodluck: "Lycka till!" } },
  chat: { sv: { hej: "Hej och välkommen!", dealerplays: "Dealern spelar." } },
};
const take = (id: string, line: string, extra: Partial<SpeechTake> & { voice?: string; archived?: boolean } = {}): SpeechTake & { archived?: boolean } => ({
  id,
  dealer: "paow",
  decision: "ACCEPTED",
  stage: "DONE",
  fps: 24,
  frames: 70,
  media: { video: `assets/motions/${id}/source.mp4` },
  motion: { speech: { line, language: "sv", text: `${line} sagt`, voice: extra.voice ?? "Paow" } },
  ...extra,
});

test("a tree plays its own talk films and those of no tree, never another tree's", () => {
  const takes = [take("paow-tal-placebets-sv-01", "placebets"), take("paow-tal-placebets-sv-02", "placebets"), take("paow-tal-goodluck-sv-01", "goodluck"), take("paow-tal-hej-sv-01", "hej")];
  const trees: Record<string, string | null> = { "paow-tal-placebets-sv-01": "casino", "paow-tal-placebets-sv-02": "tatuerad", "paow-tal-goodluck-sv-01": "casino", "paow-tal-hej-sv-01": null };
  const treeOf = (id: string) => trees[id] ?? null;
  const casino = treeTalk(register, "paow", "casino", takes, takes, treeOf);
  assert.equal(casino.lines.find((l) => l.key === "placebets")?.clip, "paow-tal-placebets-sv-01", "the newer take is the other tree's");
  assert.equal(casino.lines.find((l) => l.key === "hej")?.clip, "paow-tal-hej-sv-01", "a take of no tree is kept");
  assert.deepEqual([casino.have, casino.total, casino.takes], [3, 4, 3]);
  const tattooed = treeTalk(register, "paow", "tatuerad", takes, takes, treeOf);
  assert.equal(tattooed.lines.find((l) => l.key === "placebets")?.clip, "paow-tal-placebets-sv-02");
  assert.equal(tattooed.lines.find((l) => l.key === "goodluck")?.clip, null, "the Casino's film is not the tattooed tree's: the game shows the text");
  assert.equal(tattooed.lines.find((l) => l.key === "goodluck")?.text, "Lycka till!", "a line without a film keeps the register's text");
  assert.deepEqual([tattooed.have, tattooed.total], [2, 4]);
});

// A tree's talk is every way's of it (Jakob 2026-11-26: one A1, ways to A2.1 and A2.3), and a film whose file is not on this
// machine is no film here (2026-11-26: Tatuerad said "Tal 25/25" with none of the 25 on the disk).
test("a way plays its tree's talk; a talk film without its file here is not counted and is said so", () => {
  const here = take("paow-tal-placebets-tat-sv-01", "placebets"), far = { ...take("paow-tal-goodluck-tat-sv-01", "goodluck"), media: { video: null } };
  const treeOf = (id: string) => (id.includes("-tat-") ? ["tatuerad", "tatuerad-nyp"] : null);
  const way = treeTalk(register, "paow", "tatuerad-nyp", [here, far], [here, far], treeOf);
  assert.equal(way.lines.find((l) => l.key === "placebets")?.clip, "paow-tal-placebets-tat-sv-01", "the tree's film is the way's too");
  const goodluck = way.lines.find((l) => l.key === "goodluck");
  assert.deepEqual([goodluck?.clip, goodluck?.noFile], ["paow-tal-goodluck-tat-sv-01", true]);
  assert.deepEqual([way.have, way.noFile, way.total], [1, 1, 4]);
  assert.equal(treeTalk(register, "paow", "casino", [here, far], [here, far], treeOf).have, 0, "never another tree's");
});

test("only the game's voice is played and never an archived take; the count holds the tree's talk films that are not archived", () => {
  const all = [take("paow-tal-goodluck-sv-01", "goodluck", { voice: "Jessica" }), take("paow-tal-goodluck-sv-02", "goodluck", { archived: true }), take("paow-tal-goodluck-sv-03", "goodluck", { decision: "REJECTED" })];
  const talk = treeTalk(register, "paow", "casino", all, all, () => "casino");
  const line = talk.lines.find((l) => l.key === "goodluck")!;
  assert.equal(line.clip, null);
  assert.equal(line.takes, 2, "Jessica's and the rejected take count; the archived does not");
  assert.equal(talk.takes, 2);
});
