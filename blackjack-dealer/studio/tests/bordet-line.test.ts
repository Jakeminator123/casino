// Skyddar: beställningarna – det Bordets rad visar är det som beställs och kostar; hans eget klick stängs aldrig av fullmakten.
// Bordet's step 2 and 3 for one card from A2.3 and one from A2.1: the anchor the films go from (the guide tree's, Tatuerad's
// A2.3 or Tatuerad nyp's A2.1; A2.3 where no tree is read), the card's three films, the five marks, and that the
// row tells the truth: the step, the first and the last picture, the reference film, the length, the price and the text the
// row shows are the ones the store's preview freezes. Also the reference rule for the dummy's films of A2.3 → A3P4C2 (a film
// made again comes first; a deal bara dit never takes a round trip), step 2 and the motion's steps from the tree's anchor,
// and the ordering block's state. And that no row is a dead end (Jakob 2026-11-23: rensa bort regler och låsningar som
// blockerar): the reference film is a choice the store takes both ways, a deal to a seat without an end
// picture is offered without one, a film without a recipe is ordered with a model and a length chosen on the row, and what
// truly cannot be sent says what to do. The lab is a temporary copy; Jakob's plan (placements/default.json) is only read.
// Run: node --test "studio/tests/bordet-line.test.ts"
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { orderRoutes } from "../../tools/order-routes.ts";
import { TEXTURE } from "../../tools/order-images.ts";
import { LANDS_LABEL, modelFor, modelsFor, openEndWords, readCutChecks, stepOf, type BankFacts, type MandateBudget, type OrdersAnswer, type RenderedReference } from "../../src/order-model.ts";
import { NO_RECIPE, methodFor, recipeWords, referenceAbsent, referenceByRule } from "../../src/order-methods.ts";
import type { Intent } from "../../src/placement-model.ts";
import { MARK_NAMES, NOT_FROM_HERE, NO_LENGTH, NO_MODEL, orderBody, type FilmWish, type RowChoice, filmRow, hasRound, referenceOwner, referenceRole, roundFor, stepTwoSummary, treeAnchor } from "../lib/bordet.ts";
import { dealAnchor, orderingState } from "../lib/orders.ts";
import { motionSteps } from "../lib/placement.ts";

const repo = path.resolve(import.meta.dirname, "../..");
const base = os.tmpdir();
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

// The dummy's films A2.3 → A3P4C2 as data/rendered-references.json lists them (in that order, laid with the right hand):
// the two earlier ones and svep24d, made again after them.
const P4C2_FILMS = [["docka-2-3-p4c2-h24-omgrepp", 4], ["docka-2-3-p4c2-h24-cykel", 4], ["docka-2-3-p4c2-svep24d", 3]] as const;
const film = (id: string, edge: string, seconds: number, more: Partial<RenderedReference> = {}): RenderedReference => ({ id, edge, path: `assets/references/docka/${id}/source.mp4`, sha256: sha(Buffer.from(`docka ${id}`)), seconds, lays: "RH", check: null, ...more });

test("the reference rule: the film made again comes first, and a deal bara dit never takes a round trip", () => {
  const step = stepOf("GIV-2.3")!, model = modelFor(step, "kling-4");
  const want = { dealer: "paow", step, target: "P4.C2", model, lays: "RH" as const };
  const chosen = (films: RenderedReference[], shape: "ONE_WAY" | "ROUND_TRIP" = "ONE_WAY") => referenceByRule({ rendered: films }, "renderad", { ...want, shape })?.take ?? null;
  const listed = P4C2_FILMS.map(([id, s]) => film(id, "READY-C>P4.C2", s));
  // svep24d is listed after h24-cykel: it comes first.
  assert.equal(chosen(listed), "docka-2-3-p4c2-svep24d");
  // A film that goes back to its anchor (its register says ROUND_TRIP) is no reference for a deal bara dit, even listed last;
  // a round trip may take it.
  const cycle = film("docka-2-3-p4c2-h24-cykel", "READY-C>P4.C2", 4, { shape: "ROUND_TRIP" });
  assert.equal(chosen([film("docka-2-3-p4c2-svep24d", "READY-C>P4.C2", 3), cycle]), "docka-2-3-p4c2-svep24d");
  assert.equal(chosen([cycle]), null, "a deal bara dit waits rather than take a round trip");
  assert.equal(chosen([cycle], "ROUND_TRIP"), "docka-2-3-p4c2-h24-cykel");
  // A one-hand film is no reference for the two-hand deal (the right hand lays the card).
  assert.equal(chosen([film("docka-2-3-p4c2-svep24d", "READY-C>P4.C2", 3, { lays: "LH" })]), null);
  // And a round trip takes only a dummy's film that itself goes there and back (review of PR 1, 2026-11-21): the one-way
  // svep24d listed last is no reference for it, and without a round-trip film the step waits.
  assert.equal(chosen([cycle, film("docka-2-3-p4c2-svep24d", "READY-C>P4.C2", 3)], "ROUND_TRIP"), "docka-2-3-p4c2-h24-cykel");
  assert.equal(chosen([film("docka-2-3-p4c2-svep24d", "READY-C>P4.C2", 3)], "ROUND_TRIP"), null);
});

test("step 2 and the card's films: from the anchor of the guide's tree, never from the plan's handbyte", () => {
  // The anchor is the tree's anchor at the shoe (Tatuerad A2.3, Tatuerad nyp A2.1), and A2.3 where no tree is read.
  assert.equal(treeAnchor({ hub: "READY-C" }), "2.3");
  assert.equal(treeAnchor({ hub: "READY" }), "2.1");
  assert.equal(treeAnchor({ hub: "READY-B" }), "2.2");
  assert.equal(treeAnchor(null), "2.3");
  // Step 2's header names the same anchor as step 3, and the side the card lies with; never the plan's grip or handbyte.
  assert.equal(stepTwoSummary("P4.C2", "2.3", "FRONT"), `A2.3 · ${LANDS_LABEL.FRONT}`);
  assert.equal(stepTwoSummary("P4.C1", "2.1", "BACK"), `A2.1 · ${LANDS_LABEL.BACK}`);
  assert.equal(stepTwoSummary("shoe", "2.3", null), "Välj ett kort");
  // What is sent: only the exceptions the form shows for the row's shape and reference film (review of PR 1, 2026-11-21).
  const hidden = { duration: 5, cardScale: 1.1, end: "paow-a3-p4-x" };
  const oneWay = orderBody("paow", { step: "GIV-2.1", target: "P4.C1" }, hidden, { shape: "ONE_WAY", reference: true })!;
  assert.deepEqual([oneWay.duration, oneWay.cardScale, oneWay.end], [undefined, undefined, "paow-a3-p4-x"], "bara dit with a reference film: the end picture only");
  const trip = orderBody("paow", { step: "GIV-2.1", target: "P4.C1" }, hidden, { shape: "ROUND_TRIP", reference: false })!;
  assert.deepEqual([trip.duration, trip.cardScale, trip.end], [5, 1.1, undefined], "a round trip without a reference film: the length and the card's size");
  // The round stays the game's until the bank has the A2.3 films both ways.
  assert.equal(roundFor("P4.C2", "paow"), "A2.1 - A3P4C2 - A2.1");
  assert.equal(roundFor("P4.C2", "paow", "2.3"), "A2.3 - A3P4C2 - A2.3");
  const take = (decision: string) => ({ takes: [{ hub: "READY-C", decision }] });
  const graph = (back: string) => ({ edge: { "READY>P4.C2": take("ACCEPTED"), "P4.C2>READY": take(back) }, experiments: [] }) as never;
  assert.equal(hasRound(graph("ACCEPTED"), "P4.C2", "2.3"), true);
  assert.equal(hasRound(graph("REJECTED"), "P4.C2", "2.3"), false);
  assert.equal(hasRound(null, "P4.C2", "2.3"), false);
  // The motion's steps from the anchor the films go from, whatever grip and handbyte the plan still holds: from A2.3 never
  // A2.2 or the grip "Släp", and always a handbyte; from A2.1 a pinch and no handbyte.
  const intent: Intent = { takeHand: "LH", startSide: "BACK", endSide: "FRONT", pass: false, turn: true, grip: "DRAG", turnAt: "AIR", flipAxis: "FREE" };
  const said = motionSteps("P4.C2", intent, "2.3").steps;
  assert.equal(said[0].label, "A2.3");
  assert.equal(said.find((s) => s.id === "take")?.label, "Drar ut");
  assert.ok(said.some((s) => s.id === "pass"), "from A2.3 the card changes hands");
  const noDrag = (steps: { label: string; detail: string }[]) => steps.every((s) => !/A2\.2/.test(`${s.label} ${s.detail}`) && s.label !== "Släp");
  assert.ok(noDrag(said), JSON.stringify(said));
  const pinch = motionSteps("P4.C1", { ...intent, pass: true }, "2.1").steps;
  assert.deepEqual([pinch[0].label, pinch.find((s) => s.id === "take")?.label, pinch.some((s) => s.id === "pass")], ["A2.1", "Nyp", false]);
});

test("the ordering block's state in one line", () => {
  const mandate = { id: "test-staende", askAbove: 500, perDayCredits: 2500 };
  const budget = (status: MandateBudget["status"], spentToday = 0): MandateBudget => ({ status, mandate: status === "missing" ? null : mandate, at: "2026-11-25T13:00:00Z", spentToday, available: Math.max(0, 2500 - spentToday) });
  const policy = { enabled: true, minBalance: 100, balance: { credits: 5000, at: "", source: "" }, mandateBudget: budget("active", 400) } as unknown as NonNullable<OrdersAnswer["policy"]>;
  const answer = (p: Partial<typeof policy> | null) => ({ policy: p ? { ...policy, ...p } : null, balance: null });
  assert.deepEqual(orderingState(null).open, false);
  assert.match(orderingState(answer(null)).words, /kunde inte läsas/);
  assert.match(orderingState(answer({ enabled: false })).words, /avstängda/);
  assert.match(orderingState(answer({ balance: { credits: 100, at: "", source: "" } })).words, /nere vid golvet/);
  // Jakob 2026-11-25: the line says what the agents may do on their own today; it never closes his own click.
  assert.deepEqual(orderingState(answer({})), { open: true, words: "Agenterna godkänner själva upp till 500 krediter per beställning; större frågar Jakob. Kvar i dag: 2 100 av 2 500." });
  assert.deepEqual(orderingState(answer({ mandateBudget: budget("active", 2500) })).open, true);
  assert.deepEqual(orderingState(answer({ mandateBudget: budget("missing") })), { open: true, words: "Agenterna har ingen fullmakt i beställningsreglerna: bara Jakob godkänner." });
  assert.doesNotMatch(orderingState(answer(null)).words + orderingState(answer({ enabled: false })).words, /order-policy/);
});

test("Bordet's rows for a card from A2.3 and one from A2.1 say what the store's preview freezes", async (t) => {
  const root = await mkdtemp(path.join(base, "bordet-line-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ["data", "placements", "assets/anchors/paow-bild"]) await mkdir(path.join(root, dir), { recursive: true });
  for (const file of ["data/order-policy.json", "data/dealers.json", "data/order-methods.json"]) await copyFile(path.join(repo, file), path.join(root, file));
  // The recipe of the deal from A2.3 as this test follows it, fixed here: bara dit, 3 s, template 14, ending on the seat's
  // own end picture. The recipe in force (giv och återgång in one film since 2026-11-24) is compared row against store for
  // every card in studio/tests/line-same.test.ts, so a change of it does not change what this test compares.
  const methods = JSON.parse(await readFile(path.join(root, "data/order-methods.json"), "utf8"));
  Object.assign(methods.methods.find((m: { id: string }) => m.id === "giv-2.3"), { template: 14, seconds: 3, shape: "ONE_WAY", lastPicture: "platsens-slutbild" });
  await writeFile(path.join(root, "data/order-methods.json"), JSON.stringify(methods, null, 2));
  // The plan's places as they are (read from his plan, written only into this temporary lab), its motions fixed here: seat
  // 4's second card with handbyte, every other card without.
  const plan = JSON.parse(await readFile(path.join(repo, "placements/default.json"), "utf8"));
  for (const [card, target] of Object.entries(plan.targets as Record<string, { intent: object }>)) target.intent = { takeHand: "LH", startSide: "BACK", endSide: card === "D.C2" ? "BACK" : "FRONT", pass: card === "P4.C2", turn: card !== "D.C2", grip: "PINCH", turnAt: "AIR", flipAxis: "FREE" };
  await writeFile(path.join(root, "placements/default.json"), JSON.stringify(plan, null, 2) + "\n");
  // Material: Paow's four anchors, seat 4's first card's landing picture for the left hand, and A3P4C2 for the right hand
  // (the hand that lays the card after the handbyte). One small picture serves them all.
  const still = "assets/anchors/paow-bild/anchor.png";
  await writeFile(path.join(root, still), await sharp({ create: { width: 1764, height: 1174, channels: 3, background: { r: 0, g: 236, b: 45 } } }).png().toBuffer());
  const entries = [
    ...([["ankare-1", "IDLE"], ["ankare-2.1", "READY"], ["ankare-2.2", "READY-B"], ["ankare-2.3", "READY-C"]] as const).map(([role, node]) => ({ id: `paow-${role}`, role, name: role, path: still, node, state: "gäller" })),
    { id: "paow-landning-p4-c1", role: "landning", name: "A3P4C1", path: still, node: "LAND(P4.C1)", card: "P4.C1", state: "gäller" },
    { id: "paow-a3-p4c2-rh", role: "landning", name: "A3P4C2", path: still, node: "LAND(P4.C2)", card: "P4.C2", hand: "RH", state: "gäller" },
  ];
  await writeFile(path.join(root, "data/media-roles.json"), JSON.stringify({ schemaVersion: 1, dealers: { paow: { name: "Paow", entries } }, measures: [] }, null, 2) + "\n");
  await writeFile(path.join(root, "data/clip-jobs.json"), JSON.stringify({ jobs: [], derived: [] }));
  await writeFile(path.join(root, "data/cut-frames.json"), JSON.stringify({ frames: [] }));
  // The dummy's films: the three to A3P4C2 from A2.3 as the register lists them, and the pinch to seat 4 from A2.1.
  const rendered = [...P4C2_FILMS.map(([id, s]) => film(id, "READY-C>P4.C2", s)), film("docka-giv-p4-4", "READY>P4.C1", 3.967, { lays: undefined })];
  for (const r of rendered) {
    await mkdir(path.join(root, path.dirname(r.path)), { recursive: true });
    await writeFile(path.join(root, r.path), Buffer.from(`docka ${r.id}`));
  }
  await writeFile(path.join(root, "data/rendered-references.json"), JSON.stringify({ schemaVersion: 1, about: "test", films: rendered }));
  // The bank's real card, which the store draws on a return's last picture (TEXTURE in tools/order-images.ts), copied into
  // the lab where this checkout has media: a return's preview is compared there, and only its row where it has none.
  const textured = existsSync(path.join(repo, TEXTURE.image));
  if (textured) {
    await mkdir(path.join(root, path.dirname(TEXTURE.image)), { recursive: true });
    await copyFile(path.join(repo, TEXTURE.image), path.join(root, TEXTURE.image));
  }

  let origin = "";
  const handle = { fn: null as null | ReturnType<typeof orderRoutes> };
  const server = http.createServer(async (req, res) => { if (!(await handle.fn!(req, res, new URL(req.url ?? "/", origin)))) res.writeHead(404).end(); });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  handle.fn = orderRoutes({ root, origin, now: () => new Date("2026-11-18T02:00:00Z") });
  t.after(() => new Promise<void>((done) => server.close(() => done())));
  const call = async (method: string, address: string, body?: unknown) => {
    const response = await fetch(origin + address, { method, headers: { origin, ...(body === undefined ? {} : { "content-type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, json: await response.json() };
  };

  // The page's facts, from GET /api/orders as Bordet has them.
  const all = (await call("GET", "/api/orders")).json as OrdersAnswer;
  const bank: BankFacts = { jobs: [], derived: [], motions: {}, rendered: all.rendered, cutChecks: readCutChecks({ frames: [] }) };
  const shown = entries.map((e) => ({ ...e, served: e.path }));
  const rowOf = (wish: FilmWish, choice?: RowChoice) => filmRow("paow", wish, all.methods!, all.policy, { bank, entries: shown, plan: all.plan ?? null, dealers: all.dealers, marks: all.marks, choice });
  const words = (row: ReturnType<typeof rowOf>) => Object.fromEntries(row.marks.map((m) => [m.name, `${m.ready ? "" : "✗ "}${m.words}`]));
  const previewOf = (row: ReturnType<typeof rowOf>) => call("POST", "/api/orders/preview", row.body);

  // Seat 4's second card from A2.3 (the tree Tatuerad), its first from A2.1 (Tatuerad nyp).
  for (const [card, from] of [["P4.C2", "2.3"], ["P4.C1", "2.1"]] as const) {
    // (the card's three films from that anchor: the deal, the return to the same anchor and the return to A1)
    const wishes = ([`GIV-${from}`, `RETUR-${from}`, "RETUR-1"] as FilmWish["step"][]).map((step) => ({ step, target: card }));
    const rows = wishes.map((w) => rowOf(w));
    for (const row of rows) assert.deepEqual(row.marks.map((m) => m.name), [...MARK_NAMES], `${row.key}: the five marks in their order`);
    const [deal, back, rest] = rows;
    // The deal can be ordered: the row says what the preview freezes.
    assert.ok(deal.orderable, `${deal.key}: ${deal.why}`);
    assert.equal(deal.why, null);
    const preview = await call("POST", "/api/orders/preview", deal.body);
    assert.equal(preview.status, 200, `${deal.key}: ${preview.json.error}`);
    const o = preview.json.orders[0];
    const picture = (goesAs: string) => o.pictures.find((p: { goesAs: string }) => p.goesAs === goesAs)?.from?.entry ?? null;
    assert.equal(o.step.key, deal.wish.step, `${deal.key}: the step`);
    assert.equal(o.step.shape, deal.resolved.shape, `${deal.key}: bara dit`);
    assert.equal(picture("startFrame"), `paow-ankare-${from}`, `${deal.key}: the first picture is the anchor the films go from`);
    assert.equal(picture("endFrame"), deal.resolved.end?.kind === "LANDNING" ? deal.resolved.end.entry.id : null, `${deal.key}: the last picture`);
    assert.deepEqual(o.reference.clips, [deal.reference!.take], `${deal.key}: the reference film`);
    assert.equal(o.generation.model, deal.resolved.model!.id, `${deal.key}: the model`);
    assert.equal(o.generation.params.duration, deal.resolved.seconds, `${deal.key}: the length`);
    assert.equal(o.cost.total, deal.cost, `${deal.key}: the price`);
    assert.equal(o.prompt.text, deal.text, `${deal.key}: the text, word for word`);
    assert.equal(words(deal).Text, `${o.prompt.text.trim().split(/\s+/).length} ord`);
    // The deal says what has been tried with its recipe in plain words, never a status.
    assert.match(deal.tried, /^prövat i \d+ beställning(ar)?$/, `${deal.key}: ${deal.tried}`);
    // The returns are listed too, and none of them is a dead end (changed 2026-11-23): a row that lacks something says what
    // to do, never only that it cannot be ordered.
    for (const r of [back, rest]) {
      assert.doesNotMatch(`${r.why} ${r.recipe} ${r.tried} ${r.marks.map((m) => m.words).join(" ")}`, /kan inte beställas/, `${r.key}: what to do, not only a stop`);
      assert.doesNotMatch(recipeWords(methodFor(all.methods!, r.wish.step, card), card), /bara given|tur och retur/, `${r.key}: a return is no deal`);
      if (r.wish.step === "RETUR-1") {
        // The return to rest has a recipe (a trial, 2026-11-23): the row is sent as it stands, from the card's landing
        // picture, and the store's preview is the row's.
        assert.ok(r.orderable && r.why === null && r.cost !== null, `${r.key}: ${r.why}`);
        if (!textured) continue;
        const made = await previewOf(r);
        assert.equal(made.status, 200, `${r.key}: ${made.json.error}`);
        assert.equal(made.json.orders[0].cost.total, r.cost, `${r.key}: the price`);
        if (r.text) assert.equal(made.json.orders[0].prompt.text, r.text, `${r.key}: the text, word for word`);
        continue;
      }
      assert.ok(!r.orderable && r.body === null && r.cost === null && r.why, `${r.key}: listed, something is missing`);
      assert.equal((await call("POST", "/api/orders/preview", { dealer: "paow", step: r.wish.step, target: card })).status, 400, `${r.key}: the store asks for the same`);
      if (r.wish.step === "RETUR-2.3") {
        // The return to A2.3 continues an approved deal on its frozen last picture, which the command finds (StepDef.off).
        assert.equal(r.why, NOT_FROM_HERE);
        assert.equal(words(r).Text, "✗ beställs med kommandot");
        assert.notEqual(r.recipe, NO_RECIPE, "its recipe is shown as it is");
        continue;
      }
      // A return without a recipe: nothing is preselected, so the row asks for the model and then the length, and with
      // both chosen it is ordered and the store's preview is the row's.
      assert.deepEqual([r.recipe, r.tried, r.said, r.why], [NO_RECIPE, NO_RECIPE, null, NO_MODEL]);
      assert.deepEqual([words(r).Text, words(r).Pris, words(r).Referensfilm], ["✗ ingen modell vald", "✗ ingen modell vald", "ingen"]);
      const model = modelsFor(stepOf(r.wish.step)!).find((m) => !m.off && m.durations)!;
      assert.equal(rowOf(r.wish, { model: model.id }).why, NO_LENGTH, `${r.key}: a model, no length yet`);
      const chosen = rowOf(r.wish, { model: model.id, duration: model.durations![0] });
      assert.ok(chosen.orderable && chosen.why === null, `${chosen.key}: ${chosen.why}`);
      if (!textured) continue;
      const made = await previewOf(chosen);
      assert.equal(made.status, 200, `${chosen.key}: ${made.json.error}`);
      assert.deepEqual([made.json.orders[0].generation.model, made.json.orders[0].generation.params.duration, made.json.orders[0].cost.total], [model.id, model.durations![0], chosen.cost], `${chosen.key}: the model, the length and the price`);
      if (chosen.text) assert.equal(made.json.orders[0].prompt.text, chosen.text, `${chosen.key}: the text, word for word`);
    }
    // The reference film is a choice (2026-11-23): the recipe's rule finds the doll's film, and the row is ordered with it
    // or without. The store takes both, and its draft says what departs from the recipe.
    assert.equal(deal.ruled?.take, deal.reference!.take, `${deal.key}: the rule's film goes unless he says otherwise`);
    assert.equal(referenceOwner(deal.reference!), "dockans film");
    const without = rowOf(deal.wish, { reference: null });
    assert.ok(without.orderable && without.why === null && without.reference === null, `${without.key}: ${without.why}`);
    assert.equal(without.ruled?.take, deal.reference!.take, "the way back to the recipe's film stays in sight");
    assert.equal(words(without).Referensfilm, "ingen");
    assert.equal(without.body?.reference, null);
    const plain = await previewOf(without);
    assert.equal(plain.status, 200, `${without.key}: ${plain.json.error}`);
    assert.equal(plain.json.orders[0].reference.status, "INGEN", `${without.key}: no reference film goes`);
    assert.match(plain.json.orders[0].notes.join(" "), /ingen referensfilm fast receptet vill ha en/, "the draft names the exception");
    assert.deepEqual([plain.json.orders[0].generation.params.duration, plain.json.orders[0].cost.total, plain.json.orders[0].prompt.text], [without.resolved.seconds, without.cost, without.text], `${without.key}: the length, the price and the text`);
    assert.doesNotMatch(without.text!, /video 1/i, "the text names no film that is not sent");
    if (card === "P4.C2") {
      // From A2.3: A2.3 → A3P4C2, the right hand's A3, the dummy's film made last, 3 s, 64 credits.
      assert.deepEqual(rows.map((r) => r.line), ["A2.3 → A3P4C2", "A3P4C2 → A2.3", "A3P4C2 → A1"]);
      assert.deepEqual({ ...words(deal), Text: "" }, { "Första bild": "A2.3", Slutbild: "A3P4C2", Referensfilm: "dockan", Text: "", Pris: "64 krediter" });
      assert.equal(deal.reference!.take, "docka-2-3-p4c2-svep24d");
      assert.equal(deal.recipe, "Kling 4 · 1080p · 3 s · bara given, slutar på A3P4C2 · höger hand vänder kortet och lägger det · referensfilm: dockan");
      assert.deepEqual([o.motion.grip, o.motion.hand, o.motion.pass, o.motion.flipAxis], ["TWO_HANDS", "LH", true, "FREE"]);
      // The return from the right hand's A3: its first picture is there; it waits for its recipe.
      assert.equal(words(back)["Första bild"], "A3P4C2");
      // The deal from A2.3 is written with template 14 since 2026-11-23 (Jakob: "naturlig primärt, så var inte extremt nitsk
      // med dockans rörelse"): the doll's film is a rough guide, her natural movement first.
      assert.match(deal.text!, /Video 1 shows only the movement, as a rough guide/);
      // New in round two (2026-11-21): "Utan slutbild", what the command's --no-end makes, is a choice of the row where the
      // seat has an end picture, with the command's note; the row says the text and the price the store freezes for it.
      const open = filmRow("paow", deal.wish, all.methods!, all.policy, { bank, entries: shown, plan: all.plan ?? null, dealers: all.dealers, marks: all.marks, choice: { end: null } });
      assert.ok(open.orderable, `${open.key}: ${open.why}`);
      assert.ok(open.resolved.ownEnd && open.resolved.open, "the seat has its end picture, and he chose none");
      assert.equal(words(open).Slutbild, "ingen, A3P4C2 görs efteråt");
      assert.match(open.recipe, /· bara given, utan slutbild ·/, "the recipe line names no picture that is not sent");
      assert.equal(open.body?.end, null);
      const openPreview = await call("POST", "/api/orders/preview", open.body);
      assert.equal(openPreview.status, 200, openPreview.json.error);
      const shownOpen = openPreview.json.orders[0];
      assert.ok(!shownOpen.pictures.some((p: { goesAs: string }) => p.goesAs === "endFrame"), "no last picture");
      assert.equal(shownOpen.prompt.text, open.text, "the open deal's text, word for word");
      assert.doesNotMatch(open.text!, /last frame/);
      assert.ok(shownOpen.notes.join(" ").includes(openEndWords("P4.C2")), "the command's note");
      assert.equal(shownOpen.cost.total, open.cost);
      // A paused dealer gets nothing new (data/dealers.json, his word): the same deal cannot be ordered for her, and says why.
      const pausedDealers = all.dealers?.map((d) => (d.id === "paow" ? { ...d, paused: "Jakob: inget nytt beställs" } : d));
      const paused = filmRow("paow", deal.wish, all.methods!, all.policy, { bank, entries: shown, plan: all.plan ?? null, dealers: pausedDealers, marks: all.marks });
      assert.ok(!paused.orderable && paused.body === null && paused.cost === null, `${paused.key}: not orderable while paused`);
      assert.match(paused.why ?? "", /^Paow är pausad: inget nytt beställs/);
      // What the text says of the doll's film, for the choice in sight: a rough guide with template 14's short text.
      assert.equal(referenceRole(deal.resolved), "grov vägledning, naturlig rörelse går före");
      assert.equal(referenceRole({ ...deal.resolved, style: "MINIMAL" }), "rörelsen följer filmen");
    } else {
      // From A2.1, the anchor the game deals the card from too, laid by the left hand.
      assert.equal(dealAnchor("paow", card), "2.1");
      assert.deepEqual(rows.map((r) => r.line), ["A2.1 → A3P4C1", "A3P4C1 → A2.1", "A3P4C1 → A1"]);
      assert.deepEqual({ ...words(deal), Text: "", Pris: "" }, { "Första bild": "A2.1", Slutbild: "A3P4C1", Referensfilm: "dockan", Text: "", Pris: "" });
      assert.equal(deal.reference!.take, "docka-giv-p4-4");
      assert.equal(o.motion.pass, false);
      assert.doesNotMatch(deal.recipe, /höger hand/);
      assert.match(deal.text!, /she moves like the dealer in video 1, with the same timing/, "template 12: the text says she follows the film");
    }
  }
  // A seat with no end picture yet stops no deal (Jakob 2026-11-23: rensa bort regler och låsningar som blockerar). Seat 6 has no end picture and no film of the doll's here: the deal from A2.3 (the right hand lays the
  // card) is ready as it stands, with nothing chosen. The row says that neither a last picture nor a reference film goes,
  // and the store makes the same draft from the line alone, whose text names no last frame.
  const far = rowOf({ step: "GIV-2.3", target: "P6.C1" });
  assert.ok(far.orderable && far.why === null && !far.chosen, `${far.key}: ${far.why}`);
  assert.ok(far.resolved.open && !far.resolved.ownEnd, "open because the seat has no end picture, not by a choice");
  assert.deepEqual(far.body, { dealer: "paow", step: "GIV-2.3", target: "P6.C1" }, "the line and nothing else: no choice is sent");
  assert.deepEqual([words(far).Slutbild, words(far).Referensfilm], ["ingen, A3P6C1 görs efteråt", "går utan"]);
  assert.match(far.recipe, /· bara given, utan slutbild ·/);
  assert.doesNotMatch(far.recipe, /slutar på/, "the recipe line names no picture that is not sent");
  assert.deepEqual(far.notes, [`Varken slutbild eller referensfilm går med (${referenceAbsent("renderad", { card: true })}): bara första bilden och texten säger vart kortet ska.`]);
  const sent = await previewOf(far);
  assert.equal(sent.status, 200, `${far.key}: ${sent.json.error}`);
  const farOrder = sent.json.orders[0];
  assert.deepEqual(farOrder.pictures.map((p: { goesAs: string }) => p.goesAs).filter((g: string) => g !== "referenceImage"), ["startFrame"], "only the first picture goes");
  assert.equal(farOrder.reference.status, "INGEN");
  assert.ok(farOrder.notes.join(" ").includes(openEndWords("P6.C1")), "the draft says that it goes without a last picture, and how the seat's A3 is made");
  assert.match(farOrder.notes.join(" "), /Varken sista bild eller referensfilm går med: bara första bilden och texten säger vart kortet ska \(plats 6\)\./);
  assert.match(farOrder.notes.join(" "), /ingen referensfilm: dockan har ingen film till platsen som passar/);
  assert.doesNotMatch(farOrder.prompt.text, /last frame|last picture|video 1/i);
  assert.deepEqual([farOrder.prompt.text, farOrder.cost.total], [far.text, far.cost], "the text and the price are the row's");
  // The return from that seat starts in the last frame of the deal there: it waits for that deal, which is no fault of the
  // row's. Said as waiting, in plain words, and the store asks for the same picture.
  const backModel = modelsFor(stepOf("RETUR-1")!).find((m) => !m.off && m.durations)!;
  const farBack = rowOf({ step: "RETUR-1", target: "P6.C1" }, { model: backModel.id, duration: backModel.durations![0] });
  assert.ok(!farBack.orderable && farBack.body === null && farBack.waits, `${farBack.key}: waits for its deal`);
  assert.equal(farBack.why, "väntar på A3P6C1: returen börjar i sista rutan av given dit, och A3P6C1 görs ur den");
  assert.deepEqual(farBack.marks.filter((m) => m.waits).map((m) => [m.name, m.words]), [["Första bild", "väntar på A3P6C1"], ["Text", "väntar på bilderna"]]);
  assert.match((await call("POST", "/api/orders/preview", { dealer: "paow", step: "RETUR-1", target: "P6.C1" })).json.error, /Ingen landningsbild gäller/);
  // A missing anchor is a true stop: nothing can be sent without the first picture, and that is a fault, not a wait.
  const noAnchor = filmRow("paow", { step: "GIV-2.3", target: "P4.C2" }, all.methods!, all.policy, { bank, entries: shown.filter((e) => e.role !== "ankare-2.3"), plan: all.plan ?? null, dealers: all.dealers, marks: all.marks });
  assert.ok(!noAnchor.orderable && !noAnchor.waits);
  assert.equal(noAnchor.why, "ingen bild gäller för A2.3: gör en gällande i Material");
  // And a price outside the frame: no price, no order.
  const noPrice = filmRow("paow", { step: "GIV-2.3", target: "P4.C2" }, all.methods!, { ...all.policy, prices: [] }, { bank, entries: shown, plan: all.plan ?? null, dealers: all.dealers, marks: all.marks });
  assert.ok(!noPrice.orderable && !noPrice.waits);
  assert.match(noPrice.why ?? "", /^ramen \(data\/order-policy\.json\) har inget pris/);
});
