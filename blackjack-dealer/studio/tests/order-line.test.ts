// Skyddar: beställningarna – en beställnings rad säger vart kortet går, också när den är gjord ur dockans film åt en person.
// A person's order (Tomasz over the doll's film) carries no motion of its own: the card place stands on its reference film.
// Without it the row read "A2.3 → A2.3" for a deal to seat 4. Run: node --test "studio/tests/order-line.test.ts"
import test from "node:test";
import assert from "node:assert/strict";
import { orderLine } from "../lib/orders.ts";

const step = { key: "GIV-2.3", label: "Två händer, ett kort till platsen", edge: "READY-C>P4.C1", shape: "ONE_WAY", cutInto: ["READY-C>P4.C1"], makes: null };
const film = { status: "FINNS", clips: ["x"], path: "x", sha256: "x", seconds: 3, goesTo: "P4.C1", approvedStraight: false, dealer: "docka" };
type Arg = Parameters<typeof orderLine>[0];

test("an order without a motion takes the card place from its reference film", () => {
  const line = orderLine({ step, motion: null, reference: film } as unknown as Arg);
  assert.ok(line?.endsWith("A3P4C1"), `raden ska sluta i kortets plats, den säger ${line}`);
});

test("a motion's own target comes first, and a reference that names no card place adds nothing", () => {
  const medMal = orderLine({ step, motion: { target: "P2.C1" }, reference: film } as unknown as Arg);
  assert.ok(medMal?.endsWith("A3P2C1"), `rörelsens eget mål gäller, raden säger ${medMal}`);
  const utan = orderLine({ step, motion: null, reference: { ...film, goesTo: "READY-C>A1" } } as unknown as Arg);
  assert.ok(utan && !/A3P\d/.test(utan), `en väg är ingen kortplats, raden säger ${utan}`);
});
