// Skyddar: kontrakten och hans val – studions val Bord och kamera har källans förval (livebordet) och bara källans två
// värden, ett ord som inte är ett av dem väljer inget, och ordet går med till spelet i Casino.
// Run: node --test "studio/tests/uppsattning-val.test.ts"
import { test } from "node:test";
import assert from "node:assert/strict";
import { UPPSATTNING, UPPSATTNINGAR, VALETS_FORVAL } from "../../src/uppsattning.ts";
import { ADRESSORD, CHOICES, chooseUppsattning, otherTableLine, withUppsattning } from "../lib/uppsattning-val.ts";
import { gameSrc, readCasino } from "../lib/casino.ts";

test("the choice has the source's default and only the source's two set-ups, with their names", () => {
  assert.equal(chooseUppsattning(null, null), VALETS_FORVAL);
  assert.equal(VALETS_FORVAL, "live", "Jakob 2026-11-27: the live table is the new standard");
  assert.deepEqual(CHOICES.map((c) => c.id), [...UPPSATTNINGAR]);
  assert.deepEqual(CHOICES.map((c) => c.namn), UPPSATTNINGAR.map((id) => UPPSATTNING[id].namn));
  assert.deepEqual(CHOICES.map((c) => c.kort), UPPSATTNINGAR.map((id) => UPPSATTNING[id].kort), "the short words are the source's too");
  // The address's word goes first, then the memory; a word that names no set-up chooses nothing.
  assert.equal(chooseUppsattning("forra", "live"), "forra");
  assert.equal(chooseUppsattning(null, "forra"), "forra");
  assert.equal(chooseUppsattning("gammal", "inget"), VALETS_FORVAL);
  assert.equal(chooseUppsattning("standard", null), "forra", "the editor's older word is the former standard, as the source reads it");
  for (const word of ["live", "forra", "standard", "x", "", null]) assert.ok(UPPSATTNINGAR.includes(chooseUppsattning(word, null)));
});

test("Scen says in his words why a table shows no dealer, with the source's names, and nothing when every film fits", () => {
  assert.deepEqual(otherTableLine("Paow", "live", ["forra", "forra"]), {
    text: "Paows filmer är gjorda vid Förra standarden. Välj Förra under Standard i menyn för att se dem här.",
    table: "forra",
  });
  assert.equal(otherTableLine("Paow", "forra", ["forra", "forra"]), null);
  assert.equal(otherTableLine("Paow", "live", []), null, "a round without films refuses nothing");
  assert.equal(otherTableLine("Frasse", "forra", ["live"])?.text, "Frasses film är gjord vid Livestandarden. Välj Live under Standard i menyn för att se den här.");
  assert.match(otherTableLine("Paow", "live", ["live", "forra", "live"])!.text, /^En av rundans 3 filmer är gjord vid Förra standarden\./);
});

test("the word goes to the pages that read it, and is no look key in Casino", () => {
  assert.equal(withUppsattning("/standarddocka/editor/?docka=man", "forra"), `/standarddocka/editor/?docka=man&${ADRESSORD}=forra`);
  const look = readCasino(new URLSearchParams(`forval=casino&${ADRESSORD}=forra`));
  assert.deepEqual(look.ignored, [], "the Casino view's own address may carry the word");
  assert.match(gameSrc(look, "live"), new RegExp(`[?&]${ADRESSORD}=live(&|$)`));
  assert.doesNotMatch(gameSrc(look, null), new RegExp(`${ADRESSORD}=`), "without a choice the game's address is as before");
});
