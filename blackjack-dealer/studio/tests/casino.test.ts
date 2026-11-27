// Skyddar: kontrakten, hans domar och val – Casinots adress och spelet i ramen läser samma utseende.
// The Casino view's addresses (studio/lib/casino.ts). Run: node --test "studio/tests/casino.test.ts"
// The game page's side, reading the same address, is tested in tools/game-look.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readLook } from "../../src/game-look.ts";
import { cardsChoice, cardWords } from "../../src/game-film.ts";
import { CASINO_TABLE, casinoSearch, gameSrc, readCasino } from "../lib/casino.ts";

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
});

test("the view's address: the saved Casino preset and table when none is named", () => {
  assert.deepEqual(readCasino(params("")), { forval: "casino", patch: {}, ignored: [], table: CASINO_TABLE });
  assert.deepEqual(readCasino(params("forval=levande&dust=0.8&sway=0&table=casino-k3x9qa")), { forval: "levande", patch: { dust: 0.8, sway: false }, ignored: [], table: "casino-k3x9qa" });
  // a table the lab server would refuse, an unknown word and a value out of range
  assert.deepEqual(readCasino(params("forval=rumsstudien&table=Mitt%20bord&glow=1&dust=4")), { forval: "rumsstudien", patch: {}, ignored: ["glow", "dust"], table: CASINO_TABLE });
});

test("a look goes round: the view's address and the game's frame read the same look", () => {
  const look = { forval: "rumsstudien", patch: { dust: 0.25, lamp: 0.8, felt: "vin", marks: "trim,arc", cards: false, yaw: -12.5 }, table: "casino-abc123" };
  assert.deepEqual(readCasino(params(casinoSearch(look).slice(1))), { ...look, ignored: [] });
  const game = new URL(gameSrc(look), "http://127.0.0.1:4319").searchParams;
  assert.deepEqual(readLook(game), { asked: "rumsstudien", forval: "rumsstudien", keys: look.patch, ignored: [] });
});

