// Skyddar: hans domar och val – vems dom det är, dömt åt honom är aldrig hans, och kön är bara det ingen har dömt.
// Verdicts of takes (studio/lib/verdict.ts). Run: node --test studio/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGraph, type BankData, type BankJob } from "../../src/clip-graph.ts";
import { DECISIONS, NOTE_LIMIT as STORE_LIMIT, applyChange, applyProvisional } from "../../tools/review-store.ts";
import { NOTE_LIMIT, type Decision } from "../lib/api.ts";
import { FOR_YOU, SAID_WITHOUT_NOTE, VERDICTS, VERDICT_LABEL, VERDICT_SIGN, awaitingJakob, chosenDecision, judgedForJakob, provisionalChip, provisionalOf, provisionalWords, reviewStamp, storedNote, verdictOf, verdictPhrase } from "../lib/verdict.ts";

type R = Record<string, unknown>;
const take = (review: R | null, extra: R = {}) => ({
  stage: "DONE" as const,
  decision: String(review?.decision ?? "PENDING"),
  variant: review?.acceptedAs === "VARIANT",
  explicitMain: review?.acceptedAs === "MAIN",
  motion: review ? { review } : null,
  ...extra,
});
const jakob = "Jakob 2026-11-11: Det ser bra ut.";
// a verdict's chip shows its own label and sign; which words and signs they are is the studio's to say
const chip = (verdict: (typeof VERDICTS)[number]) => ({ label: VERDICT_LABEL[verdict], sign: VERDICT_SIGN[verdict] });

test("the five verdicts and whose word it is", () => {
  for (const table of [VERDICT_LABEL, VERDICT_SIGN]) {
    const said = VERDICTS.map((v) => table[v]);
    assert.ok(said.every((s) => s.trim()), "every verdict has its word and its sign");
    assert.equal(new Set(said).size, VERDICTS.length, "no two verdicts look alike");
  }
  assert.deepEqual(verdictOf(take({ decision: "ACCEPTED", acceptedAs: "MAIN", userAccepted: true, userReview: jakob })), { verdict: "primar", byJakob: true, ...chip("primar"), detail: null, provisional: false });
  assert.equal(verdictOf(take({ decision: "ACCEPTED", userAccepted: true, userReview: jakob })).verdict, "godkand");
  assert.equal(verdictOf(take({ decision: "ACCEPTED", acceptedAs: "VARIANT", userAccepted: true, userReview: jakob })).verdict, "variant");
  assert.equal(verdictOf(take({ decision: "PENDING", userAccepted: false })).verdict, "vantar");
  assert.equal(verdictOf(take(null)).verdict, "vantar");
  assert.equal(verdictOf(take({})).verdict, "vantar");
  assert.deepEqual(verdictOf(take({ decision: "REJECTED", userAccepted: false, userReview: jakob })), { verdict: "underkand", byJakob: true, ...chip("underkand"), detail: null, provisional: false });
  // A reviewer's decision: no userAccepted / no words of Jakob's.
  assert.equal(verdictOf(take({ decision: "ACCEPTED" })).byJakob, false);
  assert.equal(verdictOf(take({ decision: "REJECTED" })).byJakob, false);
  assert.equal(verdictOf(take({ decision: "ACCEPTED", acceptedAs: "VARIANT", userAccepted: false })).byJakob, false);
  // Secondary: set aside, with his words about its faults when he gave it.
  assert.deepEqual(verdictOf(take({ decision: "SECONDARY", userAccepted: false, userReview: "Jakob 2026-11-10: dålig." })), { verdict: "underkand", byJakob: true, ...chip("underkand"), detail: "sekundär", provisional: false });
  // Not finished.
  assert.deepEqual(verdictOf(take(null, { stage: "ORDERED" })), { verdict: "vantar", byJakob: false, ...chip("vantar"), detail: "renderas", provisional: false });
  assert.equal(verdictOf(take(null, { stage: "FAILED" })).detail, "misslyckad");
});

test("the chosen button", () => {
  assert.equal(chosenDecision(take({ decision: "ACCEPTED", acceptedAs: "MAIN" })), "MAIN");
  assert.equal(chosenDecision(take({ decision: "ACCEPTED", acceptedAs: "VARIANT" })), "VARIANT");
  assert.equal(chosenDecision(take({ decision: "ACCEPTED" })), "ACCEPTED");
  assert.equal(chosenDecision(take({ decision: "REJECTED" })), "REJECTED");
  assert.equal(chosenDecision(take({ decision: "PENDING" })), null);
  assert.equal(chosenDecision(take({ decision: "SECONDARY" })), null);
});

test("the stored note is his words only, checked against the review store itself", () => {
  assert.equal(storedNote({ userReview: jakob }), "Det ser bra ut.");
  assert.equal(storedNote({}), "");
  assert.equal(storedNote(null), "");
  assert.equal(reviewStamp({ userReview: jakob }), "Jakob 2026-11-11");
  // Every decision saved without a note writes words that are not a note.
  for (const decision of DECISIONS.filter((d) => d !== "PENDING")) {
    const review = applyChange({}, { decision, note: "" }, "2026-11-12");
    assert.equal(storedNote(review), "", decision);
    assert.ok(SAID_WITHOUT_NOTE.includes(String(review.userReview).replace(/^Jakob 2026-11-12: /, "")), decision);
  }
  const kept = applyChange({}, { decision: "ACCEPTED", note: "Bra hand." }, "2026-11-12");
  assert.equal(storedNote(kept), "Bra hand.");
  // The lowered Primär keeps its note: storedNote of the old record, saved again as a plain approval.
  const main = applyChange({}, { decision: "MAIN", note: "Den bästa." }, "2026-11-11");
  const lowered = applyChange(main, { decision: "ACCEPTED", note: storedNote(main) }, "2026-11-12");
  assert.equal(lowered.userReview, "Jakob 2026-11-12: Den bästa.");
  assert.equal(lowered.acceptedAs, undefined);
});

test("the studio's decisions are the store's", () => {
  const ours: Decision[] = ["MAIN", "ACCEPTED", "VARIANT", "REJECTED", "PENDING"];
  for (const d of ours) assert.ok((DECISIONS as readonly string[]).includes(d), d);
  assert.equal(NOTE_LIMIT, STORE_LIMIT);
});

test("a verdict judged for him: its own chip and words, never Jakob's, never a pressed button of his, and not waiting for him", () => {
  const by = "huvudagenten och en oberoende granskare";
  const mandate = 'Jakob 2026-11-13: "bedöm de sista filmerna, för jag måste sova."';
  const prov = (decision: "ACCEPTED" | "VARIANT" | "REJECTED", before: R = { decision: "PENDING", inbox: true, userAccepted: false }) =>
    applyProvisional(before, { decision, by, mandate, note: "Ren landning." }, "2026-11-13T03:00:00.000Z") as R;
  const ok = verdictOf(take(prov("ACCEPTED")));
  assert.deepEqual(ok, { verdict: "godkand", byJakob: false, ...chip("godkand"), detail: null, provisional: true });
  assert.equal(verdictOf(take(prov("VARIANT"))).verdict, "variant");
  assert.equal(verdictOf(take(prov("VARIANT"))).provisional, true);
  const bad = verdictOf(take(prov("REJECTED")));
  assert.deepEqual([bad.verdict, bad.byJakob, bad.provisional], ["underkand", false, true]);
  // the chip: the verdict's own label with the note "åt dig" (Granska's "Dömda åt dig"), never a look of his own
  assert.deepEqual(provisionalChip(ok), { label: VERDICT_LABEL.godkand, note: FOR_YOU });
  assert.deepEqual(provisionalChip(bad), { label: VERDICT_LABEL.underkand, note: FOR_YOU });
  for (const v of [ok, verdictOf(take(prov("VARIANT"))), bad]) {
    const own = verdictPhrase({ verdict: v.verdict, provisional: false });
    assert.ok(verdictPhrase(v).endsWith(FOR_YOU) && !own.includes(FOR_YOU), `${verdictPhrase(v)} / ${own}: judged for him reads so; his own does not`);
  }
  assert.notEqual(verdictPhrase(ok), verdictPhrase(bad));
  // The tooltip: who, when, under which words of his, and that his decision replaces it; nothing says it waits.
  const words = provisionalWords(ok, provisionalOf(prov("ACCEPTED") as never)), plain = provisionalWords(bad);
  // the day and his words with it as he reads them: day and month, never the stored date
  for (const part of [by, "13 nov", 'Jakob 13 nov: "bedöm de sista filmerna, för jag måste sova."', FOR_YOU]) assert.ok(words.includes(part), `the tooltip names ${part}: ${words}`);
  assert.doesNotMatch(words, /\d{4}-\d{2}-\d{2}/);
  assert.ok(plain.includes(FOR_YOU) && !plain.includes(by) && !plain.includes(mandate), "without the block it names neither who nor his words");
  const notHis = plain.slice(plain.indexOf(". ") + 2);
  assert.ok(notHis.trim() && words.endsWith(notHis), "both end with the same words that it is not his own verdict and his replaces it");
  for (const said of [words, verdictPhrase(ok), verdictPhrase(bad)]) assert.doesNotMatch(said, /väntar|preliminär/i);
  // Not his note, not his stamp, no button of his pressed.
  assert.equal(storedNote(prov("ACCEPTED") as never), "");
  assert.equal(reviewStamp(prov("ACCEPTED") as never), null);
  assert.equal(chosenDecision(take(prov("ACCEPTED"))), null);
  assert.equal(chosenDecision(take(prov("REJECTED"))), null);
  assert.deepEqual(provisionalOf(prov("ACCEPTED") as never), { by, at: "2026-11-13T03:00:00.000Z", mandate, note: "Ren landning." });
  // His word wins over a block left behind; his decision through the store removes it anyway.
  assert.equal(provisionalOf({ ...prov("ACCEPTED"), userReview: jakob } as never), null);
  assert.equal(verdictOf(take(applyChange(prov("ACCEPTED"), { decision: "ACCEPTED", note: "" }, "2026-11-13"))).provisional, false);
  assert.equal(verdictOf(take(applyChange(prov("ACCEPTED"), { decision: "ACCEPTED", note: "" }, "2026-11-13"))).byJakob, true);

  // The queue (Jakob 2026-11-13: "Med andra ord vill jag inte se en sån här lista när jag är tillbaka!"): a take
  // judged for him, approved or rejected, does not wait for him; judgedForJakob lists exactly those.
  const job = (id: string, from: string, to: string, kind: string): BankJob => ({ id, kind, target: null, from, to, model: "wan3", duration: 4, ratio: "auto_1080p", audio: false, promptText: "", first: {}, purpose: "" });
  const bank: BankData = {
    jobs: [job("a-deal-01", "READY", "P4.C1", "DEAL"), job("a-deal-02", "READY", "P4.C1", "DEAL"), job("a-deal-03", "READY", "P4.C1", "DEAL"), job("a-deal-04", "READY", "P4.C1", "DEAL")],
    motions: {
      "a-deal-01": { source: { frames: 120 }, review: { decision: "PENDING" } },
      "a-deal-02": { source: { frames: 120 }, review: prov("ACCEPTED") },
      "a-deal-03": { source: { frames: 120 }, review: prov("REJECTED") },
      "a-deal-04": { source: { frames: 120 }, review: { decision: "REJECTED" } },
    },
  };
  const graph = buildGraph(bank);
  assert.deepEqual(awaitingJakob(graph).map((t) => t.id), ["a-deal-01"]);
  assert.deepEqual(judgedForJakob(Object.values(graph.takes)).map((t) => t.id).sort(), ["a-deal-02", "a-deal-03"]);
});

test("the queue is the unjudged takes; one judged by him and one judged for him are not in it", () => {
  const job = (id: string): BankJob => ({ id, kind: "DEAL", target: null, from: "READY", to: "P4.C1", model: "wan3", duration: 4, ratio: "auto_1080p", audio: false, promptText: "", first: {}, purpose: "" });
  const forHim = applyProvisional({ decision: "PENDING", inbox: true }, { decision: "ACCEPTED", by: "huvudagenten och en oberoende granskare", mandate: "Jakob 2026-11-13: godkänn allt.", note: "Ren giv." }, "2026-11-13T16:00:00.000Z");
  const bank: BankData = {
    jobs: [job("unjudged-01"), job("his-01"), job("for-him-01")],
    motions: {
      "unjudged-01": { source: { frames: 120 }, review: { decision: "PENDING", inbox: true } },
      "his-01": { source: { frames: 120 }, review: { decision: "ACCEPTED", userAccepted: true, userReview: jakob } },
      "for-him-01": { source: { frames: 120 }, review: forHim },
    },
  };
  const graph = buildGraph(bank);
  assert.deepEqual(awaitingJakob(graph).map((t) => t.id), ["unjudged-01"]);
  assert.deepEqual(judgedForJakob(Object.values(graph.takes)).map((t) => t.id), ["for-him-01"]);
  // His decision on it replaces the verdict judged for him: his own, and still not waiting.
  bank.motions!["for-him-01"] = { source: { frames: 120 }, review: applyChange(forHim, { decision: "REJECTED", note: "" }, "2026-11-14") };
  const after = buildGraph(bank);
  assert.deepEqual(judgedForJakob(Object.values(after.takes)), []);
  assert.deepEqual(awaitingJakob(after).map((t) => t.id), ["unjudged-01"]);
  // A reset of it makes it wait again, without the verdict judged for him.
  bank.motions!["for-him-01"] = { source: { frames: 120 }, review: applyChange(forHim, { decision: "PENDING", note: "" }, "2026-11-14") };
  assert.deepEqual(awaitingJakob(buildGraph(bank)).map((t) => t.id), ["unjudged-01", "for-him-01"]);
});
