// Skyddar: hans domar och val – hans Primär visas som hans, och Gör primär sänker den förra med hans ord kvar.
// Karta's films per step (studio/lib/primaries.ts): Primär and its secondary films, what the game plays instead of a Primär,
// and the one write. Run: node --test "studio/tests/primaries.test.ts"
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEALER, buildGraph, type BankData, type BankJob, type ImageRef, type MotionRecord } from "../../src/clip-graph.ts";
import type { Decision } from "../lib/api.ts";
import { gameGraph, makePrimary, stepFilms, withPrimary } from "../lib/primaries.ts";

// ── A small bank: no media files, only the records the graph reads ──
type Review = NonNullable<MotionRecord["review"]>;
type Motion = NonNullable<MotionRecord["motion"]>;
const file = (path: string): ImageRef => ({ file: { path, sha256: path } });
const jakob = (extra: Review = {}): Review => ({ decision: "ACCEPTED", userAccepted: true, userReview: "Jakob 2026-11-12: bra.", ...extra });
type Row = [id: string, from: string, to: string, kind: string, review: Review | null, first?: ImageRef, last?: ImageRef, motion?: Motion & { stopgap?: boolean }];
function bank(rows: Row[], dealer?: string): BankData {
  const jobs: BankJob[] = [];
  const motions: Record<string, MotionRecord> = {};
  const media: BankData["media"] = {};
  const revisions: Record<string, string> = {};
  for (const [id, from, to, kind, review, first = {}, last, motion] of rows) {
    jobs.push({ id, kind, target: null, from, to, model: "wan3", duration: 4, ratio: "auto_1080p", audio: false, promptText: "", first, ...(last ? { last } : {}), purpose: "", ...(dealer ? { dealer } : {}) });
    motions[id] = { source: { frames: 120, fps: 30 }, ...(review ? { review } : {}), ...(motion ? { motion } : {}) };
    media[id] = { video: `assets/motions/${id}/source.mp4` };
    revisions[id] = `"${id}"`;
  }
  return { jobs, motions, media, revisions };
}

const data = bank([
  // Ingång: his own ✓.
  ["paow-idle-ready-entry-01", "IDLE", "READY", "ENTRY", jakob()],
  // P1: a Primär is set; another take he accepted, one rejected and one waiting.
  ["paow-p1-c1-plan-deal-01", "READY", "P1.C1", "DEAL", jakob({ acceptedAs: "MAIN" }), {}, file("L1")],
  ["paow-p1-c1-plan-deal-02", "READY", "P1.C1", "DEAL", jakob(), {}, file("L1b")],
  ["paow-p1-c1-plan-deal-03", "READY", "P1.C1", "DEAL", { decision: "REJECTED", userReview: "Jakob 2026-11-12: nej." }, {}, file("L1c")],
  ["paow-p1-c1-plan-deal-04", "READY", "P1.C1", "DEAL", { decision: "PENDING" }, {}, file("L1d")],
  // P3: the Primär return comes back with the other hand than the deal laid the card with: the game plays another.
  ["paow-p3-c1-plan-deal-01", "READY", "P3.C1", "DEAL", jakob(), {}, file("L3"), { releaseHand: "LH" }],
  ["paow-p3-c1-plan-return-ready-01", "P3.C1", "READY", "RETURN", jakob({ acceptedAs: "MAIN" }), file("L3x"), undefined, { releaseHand: "RH" }],
  ["paow-p3-c1-plan-return-ready-02", "P3.C1", "READY", "RETURN", jakob(), file("L3"), undefined, { releaseHand: "LH" }],
  // P5: the archive deal plays with a variant return; his accepted return continues a variant deal.
  ["paow-p5-c1-arkiv-deal-01", "READY", "P5.C1", "DEAL", jakob(), {}, file("L5a")],
  ["paow-p5-c1-plan-deal-01", "READY", "P5.C1", "DEAL", jakob({ acceptedAs: "VARIANT" }), {}, file("L5v")],
  ["paow-p5-c1-arkiv-return-ready-01", "P5.C1", "READY", "RETURN", jakob({ acceptedAs: "VARIANT" }), file("L5a")],
  ["paow-p5-c1-plan-return-ready-01", "P5.C1", "READY", "RETURN", jakob(), file("L5v")],
  // P7: an exit played backwards (a stopgap) beside a judged exit: the game leaves the stopgap out, and so does the page.
  ["paow-ready-idle-exit-01", "READY", "IDLE", "RETURN", jakob()],
  ["paow-ready-idle-exit-reversed-01", "READY", "IDLE", "RETURN", jakob(), {}, undefined, { stopgap: true }],
]);
const graph = buildGraph(data);
const game = gameGraph(data, DEALER);
const step = (edge: string) => stepFilms(data, graph, game, edge)!;
const ids = (films: { take: { id: string } }[]) => films.map((f) => f.take.id);

test("Primär and beside it the secondary films: approved and not Primär; rejected and waiting takes are in Granska", () => {
  const p1 = step("READY>P1.C1");
  assert.equal(p1.primary?.take.id, "paow-p1-c1-plan-deal-01");
  assert.deepEqual(ids(p1.secondaries), ["paow-p1-c1-plan-deal-02"]);
  assert.equal(p1.elsewhere, 2, "the rejected and the waiting take");
  assert.equal(p1.proposal, null, "with a Primär nothing is proposed");
  assert.deepEqual([p1.primary?.use.kind, p1.primary?.use.word], ["always", "Spelas"]);
  assert.deepEqual([p1.secondaries[0].use.kind, p1.secondaries[0].use.word], ["never", "Spelas inte"]);
  assert.match(p1.secondaries[0].use.detail, /Spelet spelar Giv 01 här/);
  // A stopgap the game has replaced is not among them.
  assert.deepEqual(ids(step("READY>IDLE").secondaries), ["paow-ready-idle-exit-01"]);
  assert.equal(step("READY>IDLE").elsewhere, 1);
});

test("a Primär the game does not play says so, and the film it plays instead says it", () => {
  const back = step("P3.C1>READY");
  assert.deepEqual([back.primary?.take.id, back.primary?.use.word], ["paow-p3-c1-plan-return-ready-01", "Spelas inte"]);
  assert.match(back.primary!.use.detail, /Spelet spelar Retur 02 här \(passar given före\)/);
  assert.deepEqual([back.secondaries[0].take.id, back.secondaries[0].use.word], ["paow-p3-c1-plan-return-ready-02", "Spelas i stället för Primär"]);
  assert.equal(back.secondaries[0].use.kind, "always");
});

test("what a Primär would be: the bank changed in memory only", () => {
  const take = graph.takes["paow-p1-c1-plan-deal-02"];
  const changed = withPrimary(data, graph, take);
  assert.equal(changed.motions!["paow-p1-c1-plan-deal-02"].review?.acceptedAs, "MAIN");
  assert.equal(changed.motions!["paow-p1-c1-plan-deal-01"].review?.acceptedAs, undefined, "the earlier Primär is lowered");
  assert.equal(changed.motions!["paow-p1-c1-plan-deal-01"].review?.decision, "ACCEPTED");
  assert.equal(data.motions!["paow-p1-c1-plan-deal-01"].review?.acceptedAs, "MAIN", "the bank itself is untouched");
});

test("Gör primär: one write for the take, then an earlier Primär on the edge is lowered with its note kept", async () => {
  const calls: [string, Decision, string, string][] = [];
  const put = async (id: string, decision: Decision, note: string, revision: string) => {
    calls.push([id, decision, note, revision]);
    return { id, review: {}, revision };
  };
  const result = await makePrimary(graph.takes["paow-p1-c1-plan-deal-02"], graph, put);
  assert.deepEqual(calls, [
    ["paow-p1-c1-plan-deal-02", "MAIN", "bra.", '"paow-p1-c1-plan-deal-02"'],
    ["paow-p1-c1-plan-deal-01", "ACCEPTED", "bra.", '"paow-p1-c1-plan-deal-01"'],
  ]);
  assert.deepEqual(result, { lowered: ["Giv 01"], failed: [] });
  // Nothing else is written; a failed lowering is reported, not hidden.
  const failing = async (id: string, decision: Decision, note: string, revision: string) => {
    if (decision === "ACCEPTED") throw new Error("409");
    return { id, review: {}, revision };
  };
  assert.deepEqual(await makePrimary(graph.takes["paow-p1-c1-plan-deal-02"], graph, failing), { lowered: [], failed: ["Giv 01"] });
  const once: string[] = [];
  await makePrimary(graph.takes["paow-p5-c1-plan-return-ready-01"], graph, async (id, decision, note, revision) => {
    once.push(id);
    return { id, review: {}, revision };
  });
  assert.deepEqual(once, ["paow-p5-c1-plan-return-ready-01"]);
});
