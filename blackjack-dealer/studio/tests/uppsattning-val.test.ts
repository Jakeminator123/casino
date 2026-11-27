// Skyddar: kontrakten och hans val – studions val Bord och kamera har källans förval (livebordet) och bara källans två
// värden, ett ord som inte är ett av dem väljer inget, och ordet går med till spelet i Casino.
// Run: node --test "studio/tests/uppsattning-val.test.ts"
import { test } from "node:test";
import assert from "node:assert/strict";
import { UPPSATTNING, UPPSATTNINGAR, VALETS_FORVAL } from "../../src/uppsattning.ts";
import { ADRESSORD, CHOICES, chooseUppsattning, withUppsattning } from "../lib/uppsattning-val.ts";
import { gameSrc, readCasino } from "../lib/casino.ts";

test("the choice has the source's default and only the source's two set-ups, with their names", () => {
  assert.equal(chooseUppsattning(null, null), VALETS_FORVAL);
  assert.equal(VALETS_FORVAL, "live", "Jakob 2026-11-27: the live table is the new standard");
  assert.deepEqual(CHOICES.map((c) => c.id), [...UPPSATTNINGAR]);
  assert.deepEqual(CHOICES.map((c) => c.namn), UPPSATTNINGAR.map((id) => UPPSATTNING[id].namn));
  // The address's word goes first, then the memory; a word that names no set-up chooses nothing.
  assert.equal(chooseUppsattning("forra", "live"), "forra");
  assert.equal(chooseUppsattning(null, "forra"), "forra");
  assert.equal(chooseUppsattning("gammal", "inget"), VALETS_FORVAL);
  assert.equal(chooseUppsattning("standard", null), "forra", "the editor's older word is the former standard, as the source reads it");
  for (const word of ["live", "forra", "standard", "x", "", null]) assert.ok(UPPSATTNINGAR.includes(chooseUppsattning(word, null)));
});

test("the word goes to the pages that read it, and is no look key in Casino", () => {
  assert.equal(withUppsattning("/standarddocka/editor/?docka=man", "forra"), `/standarddocka/editor/?docka=man&${ADRESSORD}=forra`);
  const look = readCasino(new URLSearchParams(`forval=casino&${ADRESSORD}=forra`));
  assert.deepEqual(look.ignored, [], "the Casino view's own address may carry the word");
  assert.match(gameSrc(look, "live"), new RegExp(`[?&]${ADRESSORD}=live(&|$)`));
  assert.doesNotMatch(gameSrc(look, null), new RegExp(`${ADRESSORD}=`), "without a choice the game's address is as before");
});
