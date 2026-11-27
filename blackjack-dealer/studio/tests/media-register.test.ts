// Skyddar: publiceringsskyddet – Materials register pekar bara på filer i repot, aldrig på en viss dators disk.
// The register is in Git and the repo is public: an entry with a whole path would name one computer, and the lab would
// open that file. Run: node --test "studio/tests/media-register.test.ts"
import test from "node:test";
import assert from "node:assert/strict";
import { isInside, validateRegister } from "../lib/media.ts";

const withPath = (path: string) => ({ schemaVersion: 1, dealers: { vera: { name: "Vera", entries: [{ id: "vera-bild", role: "keystone", name: "En bild", path }] } }, measures: [] });

test("a file under assets/ or output/ is accepted", () => {
  for (const path of ["assets/dealers/vera/keystone.png", "output/vera/bild-01.png"]) {
    assert.ok(isInside(path), path);
    assert.deepEqual(validateRegister(withPath(path)).errors, [], path);
  }
});

test("a path on one computer's disk, or one that climbs out of the repo, is refused", () => {
  for (const path of ["C:/exempel/bild.png", "D:/exempel/mapp/bild.png", "/c/exempel/bild.png", "assets/../../bild.png", "../bild.png", "data/media-roles.json"]) {
    assert.equal(isInside(path), false, path);
    assert.ok(validateRegister(withPath(path)).errors.some((error) => /sökvägen ska ligga under assets\/ eller output\//.test(error)), path);
  }
});
