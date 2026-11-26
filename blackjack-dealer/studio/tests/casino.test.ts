// Skyddar: kontrakten, hans domar och val – Casinots adress, spelet i ramen och Scen läser samma utseende, och det han sparat med Bred lins spelas så.
// The Casino view's addresses (studio/lib/casino.ts). Run: node --test "studio/tests/casino.test.ts"
// The game page's side, reading the same address, is tested in tools/game-look.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS } from "../../src/scene3d-view.ts";
import { readLook } from "../../src/game-look.ts";
import { cardsChoice, cardWords } from "../../src/game-film.ts";
import { CASINO_TABLE, casinoAddress, casinoSearch, gameSrc, readCasino, scenHref } from "../lib/casino.ts";
import { CASINO_PRESET, SHIPPED, effective, presetInForm, readAddress, savedState } from "../lib/scene-presets.ts";

const params = (text: string) => new URLSearchParams(text);

test("Casino keeps explicit card, tempo and diagnosis choices in its address and the actual game frame", () => {
  const input = params("forval=levande&table=carry-ab&kort=liggande&cardBack=dark&cardFace=paper&dealTempo=1.12&diagnos=1");
  const look = readCasino(input);
  assert.deepEqual(look.ignored, []);
  const canonical = params(casinoSearch(look));
  const frame = new URL(gameSrc(readCasino(canonical)), "http://127.0.0.1:4319").searchParams;
  for (const word of ["kort", "cardBack", "cardFace", "dealTempo", "diagnos"]) {
    assert.equal(canonical.get(word), input.get(word), `${word} survives URL normalization`);
    assert.equal(frame.get(word), input.get(word), `${word} reaches game.html`);
  }
  assert.deepEqual(cardsChoice({kort: frame.get("kort")}), {cards: true, carry: "film"});
  assert.deepEqual(cardWords(frame), {back: "dark", face: "paper"});
  assert.equal(frame.get("table"), "carry-ab");
  assert.equal(frame.get("inbaddad"), "1");
  assert.deepEqual(look.patch, {}, "playback choices are not stored as scene controls");
});

test("Casino accepts supported playback choices and rejects unknown or out-of-range values", () => {
  for (const [word, values] of Object.entries({kort: ["hand", "matt", "liggande"], cardBack: ["film", "dark"], cardFace: ["film", "paper"], dealTempo: ["1", "1.15"], diagnos: ["0", "1"]})) {
    for (const value of values) {
      const look = readCasino(params(`${word}=${value}`));
      assert.deepEqual(look.ignored, []);
      assert.equal(new URL(gameSrc(look), "http://localhost").searchParams.get(word), value);
    }
  }
  for (const [word, values] of Object.entries({kort: ["unknown"], cardBack: ["red"], cardFace: ["dark"], dealTempo: ["", "NaN", "Infinity", "0.9", "1.16"], diagnos: ["true", "2"]})) {
    for (const value of values) {
      const look = readCasino(params(`${word}=${value}`));
      assert.deepEqual(look.ignored, [word]);
      assert.equal(new URL(gameSrc(look), "http://localhost").searchParams.has(word), false);
    }
  }
  const look = readCasino(params("kort=liggande&dealTempo=1.12&diagnos=1&cardFace=paper&unknown=yes"));
  assert.deepEqual(look.ignored, ["unknown"]);
  const scene = new URL(scenHref(look), "http://localhost");
  scene.searchParams.delete("lage");
  assert.deepEqual(readAddress(scene.searchParams), {forval: "casino", patch: {}, ignored: []}, "game controls are not sent to a scene that does not implement them");
});

test("the view's address: the saved Casino preset and table when none is named", () => {
  assert.deepEqual(readCasino(params("")), { forval: "casino", patch: {}, ignored: [], table: CASINO_TABLE });
  assert.deepEqual(readCasino(params("forval=levande&dust=0.8&sway=0&table=casino-k3x9qa")), { forval: "levande", patch: { dust: 0.8, sway: false }, ignored: [], table: "casino-k3x9qa" });
  // a table the lab server would refuse, an unknown word and a value out of range
  assert.deepEqual(readCasino(params("forval=rumsstudien&table=Mitt%20bord&glow=1&dust=4")), { forval: "rumsstudien", patch: {}, ignored: ["glow", "dust"], table: CASINO_TABLE });
});

test("a look goes round: the view's address, the game's frame and the Scen view read the same look", () => {
  const look = { forval: "rumsstudien", patch: { dust: 0.25, lamp: 0.8, felt: "vin", marks: "trim,arc", cards: false, yaw: -12.5 }, table: "casino-abc123" };
  assert.deepEqual(readCasino(params(casinoSearch(look).slice(1))), { ...look, ignored: [] });
  const game = new URL(gameSrc(look), "http://127.0.0.1:4319").searchParams;
  assert.deepEqual(readLook(game), { asked: "rumsstudien", forval: "rumsstudien", keys: look.patch, ignored: [] });
  const at = new URL(scenHref(look), "http://127.0.0.1:4319").searchParams;
  assert.equal(at.get("lage"), "scen", "Bordet's Scen");
  at.delete("lage");
  assert.deepEqual(readAddress(at), { forval: "rumsstudien", patch: look.patch, ignored: [] });
});

test("the lens is a key of the look: Casino, the game in the frame, Scen and Prova i Casino carry lins like any other key", () => {
  const lab = "http://127.0.0.1:4319";
  for (const lins of ["standard", "bred"] as const) {
    const look = readCasino(params(`forval=levande&cardHand=standard&pitch=-12&zoom=0.95&lins=${lins}`));
    assert.deepEqual(look, { forval: "levande", patch: { lins, cardHand: "standard", pitch: -12, zoom: 0.95 }, ignored: [], table: CASINO_TABLE });
    // Kalibrera i Scen: the same look, the lens among its keys in the catalogue's order
    const scen = new URL(scenHref(look), lab);
    assert.equal(scen.search, `?lage=scen&forval=levande&lins=${lins}&cardHand=standard&zoom=0.95&pitch=-12`);
    scen.searchParams.delete("lage");
    assert.deepEqual(readAddress(scen.searchParams), { forval: "levande", patch: look.patch, ignored: [] });
    // the game in the frame reads it as a key of the look (src/game-look.ts)
    const frame = new URL(gameSrc(look), lab);
    assert.equal(frame.searchParams.get("lins"), lins);
    assert.deepEqual(readLook(frame.searchParams).keys, look.patch);
    // Prova i Casino from Scen: the Casino with Scen's preset and the keys that differ from it, the lens with them
    assert.deepEqual(readCasino(new URL(casinoAddress(look.forval, look.patch), lab).searchParams), look);
  }
  assert.deepEqual(readCasino(params("lins=kontrakt")).ignored, ["lins"], "only the two lenses");
});

test("the lens's older word in an address is read as the key lins, never named as unknown, and written as lins", () => {
  const lab = "http://127.0.0.1:4319";
  for (const [word, lins, other] of [["kontrakt", "bred", "standard"], ["lins", "standard", "bred"]] as const) {
    const look = readCasino(params(`forval=levande&dust=0.4&geometri=${word}`));
    assert.deepEqual(look, { forval: "levande", patch: { dust: 0.4, lins }, ignored: [], table: CASINO_TABLE });
    const written = params(casinoSearch(look));
    assert.equal(written.get("lins"), lins); assert.equal(written.has("geometri"), false);
    const frame = new URL(gameSrc(look), lab).searchParams;
    assert.equal(frame.has("geometri"), false);
    assert.equal(readLook(frame).keys.lins, lins);
    assert.equal(new URL(scenHref(look), lab).searchParams.get("lins"), lins);
    assert.deepEqual(readAddress(params(`forval=levande&geometri=${word}`)), { forval: "levande", patch: { lins }, ignored: [] });
    // the address's own lins goes first, in the studio as in the game
    assert.deepEqual(readAddress(params(`geometri=${word}&lins=${other}`)).patch, { lins: other });
    assert.equal(readLook(params(`geometri=${word}&lins=${other}`)).keys.lins, other);
  }
  // a value that is neither of the two is no word at all, as before
  assert.deepEqual(readAddress(params("forval=levande&geometri=annat")), { forval: "levande", patch: {}, ignored: [] });
  assert.deepEqual(readCasino(params("geometri=annat")), { forval: CASINO_PRESET, patch: {}, ignored: [], table: CASINO_TABLE });
});

test("a preset in the older form reads with its lens in the state; the new form is left as it is", () => {
  const state = { room: "panorama", pitch: -8 } as const, rest = { schemaVersion: 1 as const, name: CASINO_PRESET, label: "Casino", about: "", updatedAt: "2026-11-21T10:00:00.000Z", shipped: false, revision: '"1"' };
  // as a server started before 2026-11-26 answers Casino's look saved with Bred lins
  const bred = presetInForm({ ...rest, state, geometri: "kontrakt" });
  assert.deepEqual(bred, { ...rest, state: { ...state, lins: "bred" } });
  assert.equal("geometri" in bred, false);
  assert.deepEqual(presetInForm({ ...rest, state, geometri: "lins" }), { ...rest, state }, "Standard is the scene's default: no key");
  assert.deepEqual(presetInForm({ ...rest, state: { ...state, lins: "standard" as const }, geometri: "kontrakt" }).state.lins, "standard", "the state's own lens goes first");
  assert.deepEqual(presetInForm({ ...rest, state: { ...state, lins: "bred" as const } }), { ...rest, state: { ...state, lins: "bred" } });
  assert.deepEqual(presetInForm({ ...rest, state, geometri: "annat" }), { ...rest, state });
});

test("a look saved with Bred lins plays Bred lins in the frame and opens with Bred lins in Scen; the address's lens goes over it", () => {
  const lab = "http://127.0.0.1:4319";
  // Använd i Casino saves what differs from the scene's DEFAULTS (useSceneEditor saveAs, savedState): Bred lins is lins=bred,
  // Standard no key
  const scen = effective(DEFAULTS, SHIPPED[0].state);
  const saved = savedState({ ...scen, lins: "bred" }, DEFAULTS, false);
  assert.equal(saved.lins, "bred");
  assert.equal(savedState(scen, DEFAULTS, false).lins, undefined, "saved with Standard: no key");
  for (const form of [{ state: saved }, presetInForm({ state: SHIPPED[0].state, geometri: "kontrakt" })]) {
    // the rail's Casino (no words): the frame names no lens, so the game plays the preset's
    const plain = readCasino(params(""));
    const frame = new URL(gameSrc(plain), lab).searchParams;
    assert.equal(frame.has("lins"), false);
    assert.equal(effective(effective(DEFAULTS, form.state), readLook(frame).keys).lins, "bred");
    // Kalibrera i Scen opens Casino's look, and Scen lays the preset's whole state over the defaults
    const at = new URL(scenHref(plain), lab).searchParams;
    at.delete("lage");
    const asked = readAddress(at);
    assert.equal(asked.forval, CASINO_PRESET);
    assert.equal(effective(effective(DEFAULTS, form.state), asked.patch).lins, "bred");
    // Prova i Casino with Standard over that look: the key in the address, which the game reads over the preset's
    const trial = readCasino(new URL(casinoAddress(CASINO_PRESET, { lins: "standard" }), lab).searchParams);
    assert.equal(effective(effective(DEFAULTS, form.state), readLook(new URL(gameSrc(trial), lab).searchParams).keys).lins, "standard");
  }
});
