// Jakob's decision on one take, as it is written: the one place for the rule "Primär lowers an earlier Primär on the same
// step of the same tree". Pure: no DOM, no React; the writer comes in as an argument (putDecision in the studio, a fake in the
// tests), and so do the trees. DecisionBar (components/takes, Granska) and "Gör primär" (components/map, through makePrimary)
// both call it, and only from his own click. In the online copy putDecision refuses every write (lib/api.ts), so nothing can be
// written there either.
import type { Graph, Take } from "../../src/clip-graph.ts";
import { primaryMates, type TreeView } from "../../src/dealer-trees.ts";
import type { Decision, DecisionResult } from "./api.ts";
import { takeName } from "./names.ts";
import { storedNote } from "./verdict.ts";

export type Put = (id: string, decision: Decision, note: string, revision: string) => Promise<DecisionResult>;
/** lowered: earlier Primär takes on the edge now plain accepted; failed: those that could not be lowered (still Primär). */
export type Decided = { lowered: string[]; failed: string[] };
/** The dealer's trees as GET /api/trees gives them: each one's cut says which takes it plays (src/dealer-trees.ts primaryMates). */
export type Trees = readonly Pick<TreeView, "tree" | "cut">[];

/**
 * Writes one decision with its note. For Primär, every other Primär on the take's edge in the same tree then becomes plain
 * accepted with its own note kept (one he has archived too: a step has one Primär); a failed lowering is reported in `failed`,
 * not thrown. Without a graph (no bank read yet) nothing is lowered. A take he has archived cannot be made Primär before it is
 * taken back: it cannot play, and the step's playing Primär would be lowered for it. Throws what the first write throws (a 409
 * among them): then nothing else has been written.
 * trees: whose Primär is the same tree's (Jakob 2026-11-26: a Primär in one tree is never touched by a choice in another).
 * Granska gives the dealer's trees over the whole bank's graph (primaryMates); null there, the trees not read yet: nothing is
 * lowered rather than another tree's. Left out where the graph is already the tree's (Karta's cut, makePrimary).
 */
export async function decide(take: Take, decision: Decision, note: string, graph: Graph | null, put: Put, trees?: Trees | null): Promise<Decided> {
  if (!take.revision) throw new Error("Tagningen har ingen post i registret ännu, så beslutet kan inte sparas.");
  if (decision === "MAIN" && take.archived) throw new Error("Tagningen är arkiverad. Ta tillbaka den i Karta först, så kan den bli Primär.");
  await put(take.id, decision, decision === "PENDING" ? "" : note, take.revision);
  const lowered: string[] = [];
  const failed: string[] = [];
  // Only the take's own dealer's Primär is lowered: another dealer's graph has its own takes on the same edge.
  if (decision !== "MAIN" || !graph || graph.dealer !== take.dealer || trees === null) return { lowered, failed };
  const edge = graph.edge[take.edge];
  // Every anchor at the shoe is a take of A2.1's edge, so the edge holds every tree's films: only the take's tree's are its.
  const mate = trees ? primaryMates(trees, take.id) : () => true;
  for (const other of Object.values(graph.takes)) {
    if (other.id === take.id || other.edge !== take.edge || !other.explicitMain || !other.revision || !mate(other.id)) continue;
    const name = takeName(other, edge?.takes);
    try {
      await put(other.id, "ACCEPTED", storedNote(other.motion?.review), other.revision);
      lowered.push(name);
    } catch {
      failed.push(name);
    }
  }
  return { lowered, failed };
}

/** Primär with his stored note kept: "Gör primär" in a step's panel on Karta, over the graph as the tree plays it. */
export function makePrimary(take: Take, graph: Graph, put: Put): Promise<Decided> {
  return decide(take, "MAIN", storedNote(take.motion?.review), graph, put);
}
