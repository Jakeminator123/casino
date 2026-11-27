// Schemat's picture laid out (SchemaGraph.tsx): the anchors as boxes from left to right in the order a round goes, the motions
// as curves between them with their names, the motions from an anchor back to it as one label over the box. Only where the
// known anchors stand is written here (PLATS: column and row); an anchor the catalogue gains, or one a motion names that no
// list has, goes in a spare row at the bottom by itself, and every motion is drawn from its own from and to. The picture is
// only what is shown: its size is the boxes and curves given. Pure, no DOM.
//
// The curves, so that they do not cross: between two neighbours in a row one going right bows up and one going left bows down,
// a second one further; over a box in between, one going right goes over the row and one going left under it, as far out as the
// boxes between need; between rows they bow a little to the left of their way. A name sits on its curve's middle and is moved
// off the others and off the boxes.

/** Where the known anchors stand: [column, row]. Row 1 is the round's row, 0 above it, 2 under it. */
export const PLATS: Record<string, [number, number]> = {
  A1S: [0, 1],
  A1: [1, 1],
  "A2.3": [2, 1],
  A2M: [3, 0],
  A3PnCm: [4, 1],
  A3DCm: [3, 2],
  A1V: [5, 1],
};

export const NODE = { w: 172, h: 66 };
const COL = 286, X0 = 110, ROW_Y = [120, 360, 590], SPARE_Y = 780, PAD = 24;

export type LayoutNode = { id: string; x: number; y: number; spare: boolean };
export type LayoutEdge = {
  id: string; from: string; to: string; loop: boolean;
  /** The curve (an SVG path) and where its name sits. */
  d: string; label: { x: number; y: number };
};
export type Layout = { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number };

type P = { x: number; y: number };
const quad = (a: P, c: P, b: P, t: number): P => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });

/** Where the line from a box's middle toward p leaves the box (with a little room for the arrow). */
function edgeOf(n: P, p: P, room = 3): P {
  const dx = p.x - n.x, dy = p.y - n.y;
  if (!dx && !dy) return n;
  const hw = NODE.w / 2 + room, hh = NODE.h / 2 + room;
  const s = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  return { x: n.x + dx * s, y: n.y + dy * s };
}

/** The label sizes the layout keeps apart (SchemaGraph measures the same way). */
export type LabelSize = (id: string) => { w: number; h: number };
export type LayoutMotion = { id: string; franAnkare: string | null; tillAnkare: string | null };

export function schemaLayout(anchors: readonly { id: string }[], motions: readonly LayoutMotion[], size: LabelSize): Layout {
  // The boxes: the known in their place, the others in the spare row in the catalogue's order.
  const nodes: LayoutNode[] = [];
  let spare = 0;
  for (const a of anchors) {
    const at = PLATS[a.id];
    if (at) nodes.push({ id: a.id, x: X0 + at[0] * COL, y: ROW_Y[at[1]], spare: false });
    else nodes.push({ id: a.id, x: X0 + spare++ * (NODE.w + 48), y: SPARE_Y, spare: true });
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rowOf = (n: LayoutNode) => (n.spare ? 9 : PLATS[n.id][1]);

  const edges: LayoutEdge[] = [];
  const count = new Map<string, number>();
  const nth = (key: string) => { const k = count.get(key) ?? 0; count.set(key, k + 1); return k; };
  const curve: P[] = [];
  const paths = new Map<string, (ox: number, oy: number) => string>();
  const loopTop = new Map<string, number>(); // how far over a box its loop's name reaches
  for (const m of motions) {
    const a = m.franAnkare ? byId.get(m.franAnkare) : undefined, b = m.tillAnkare ? byId.get(m.tillAnkare) : undefined;
    if (!a || !b || a !== b) continue;
    // A loop: its name hangs over the box on two legs, up from the box on the left and down into it on the right.
    const { w, h } = size(m.id), top = a.y - NODE.h / 2, ly = top - 22 - h / 2, dx = Math.min(NODE.w / 2 - 16, w / 2 - 18);
    loopTop.set(a.id, 22 + h);
    paths.set(m.id, (ox, oy) => {
      const x = a.x + ox, t = top + oy, y = ly + oy + h / 2;
      return `M ${x - dx} ${t - 1} V ${y} M ${x + dx} ${y} V ${t - 4}`;
    });
    edges.push({ id: m.id, from: a.id, to: b.id, loop: true, d: "", label: { x: a.x, y: ly } });
  }
  for (const m of motions) {
    const a = m.franAnkare ? byId.get(m.franAnkare) : undefined, b = m.tillAnkare ? byId.get(m.tillAnkare) : undefined;
    if (!a || !b || a === b) continue;
    const sameRow = rowOf(a) === rowOf(b) && !a.spare;
    const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
    const between = sameRow ? nodes.filter((n) => n !== a && n !== b && !n.spare && n.x > lo && n.x < hi && Math.abs(n.y - a.y) < 1) : [];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    let c: P;
    if (sameRow && between.length) {
      // Over the boxes between: right goes over the row, left under it, far enough out to clear every box (and loop) on the way,
      // and the boxes above or below it within reach.
      const right = b.x > a.x, k = nth(`over|${right}`), half = (hi - lo) / 2;
      const clear = (n: LayoutNode) => {
        const f = 1 - ((n.x - mid.x) / half) ** 2;
        if (f <= 0.05) return 0;
        const reach = right ? a.y - n.y + NODE.h / 2 + (loopTop.get(n.id) ?? 0) + 26 : n.y - a.y + NODE.h / 2 + 26;
        return reach / f;
      };
      const near = nodes.filter((n) => !n.spare && n.x > lo - NODE.w / 2 && n.x < hi + NODE.w / 2 && n !== a && n !== b && (right ? n.y <= a.y : n.y >= a.y));
      const depth = Math.max(110 + 46 * k, ...near.map(clear));
      c = { x: mid.x, y: mid.y + 2 * (right ? -depth : depth) };
    } else if (sameRow) {
      const right = b.x > a.x, k = nth(`${a.id}|${b.id}`);
      c = { x: mid.x, y: mid.y + 2 * (right ? -1 : 1) * (58 + 44 * k) };
    } else {
      const k = nth(`${a.id}|${b.id}`), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const off = 28 + 40 * k; // to the left of the way
      c = { x: mid.x + (dy / len) * off * 2, y: mid.y - (dx / len) * off * 2 };
    }
    const s = edgeOf(a, c), e = edgeOf(b, c, 6);
    for (let t = 0; t <= 1; t += 0.1) curve.push(quad(s, c, e, t));
    paths.set(m.id, (ox, oy) => `M ${s.x + ox} ${s.y + oy} Q ${c.x + ox} ${c.y + oy} ${e.x + ox} ${e.y + oy}`);
    edges.push({ id: m.id, from: a.id, to: b.id, loop: false, d: "", label: quad(s, c, e, 0.5) });
  }

  // The names kept apart: from each other and from the boxes, moved up or down, a few rounds.
  const boxes = nodes.map((n) => ({ x: n.x, y: n.y, w: NODE.w + 8, h: NODE.h + 8 }));
  const labels = edges.map((e) => ({ e, ...size(e.id) }));
  const over = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
  for (let round = 0; round < 60; round++) {
    let moved = false;
    for (let i = 0; i < labels.length; i++) {
      const A = labels[i], a = { ...A.e.label, w: A.w + 6, h: A.h + 4 };
      for (let j = i + 1; j < labels.length; j++) {
        const B = labels[j], b = { ...B.e.label, w: B.w + 6, h: B.h + 4 };
        if (!over(a, b)) continue;
        const push = ((a.h + b.h) / 2 - Math.abs(a.y - b.y)) / 2 + 1, up = a.y <= b.y ? -1 : 1;
        if (!A.e.loop) A.e.label.y += up * push;
        if (!B.e.loop) B.e.label.y -= up * push;
        moved = true;
      }
      if (A.e.loop) continue;
      for (const box of boxes) {
        if (!over(a, box)) continue;
        const up = A.e.label.y <= box.y ? -1 : 1;
        A.e.label.y = box.y + up * ((box.h + a.h) / 2 + 1);
        moved = true;
      }
    }
    if (!moved) break;
  }

  // The picture's size: the boxes, the names and the curves, with a margin; then everything moved to start at 0, 0.
  const xs = [...nodes.flatMap((n) => [n.x - NODE.w / 2, n.x + NODE.w / 2]), ...labels.flatMap((l) => [l.e.label.x - l.w / 2, l.e.label.x + l.w / 2]), ...curve.map((p) => p.x)];
  const ys = [...nodes.flatMap((n) => [n.y - NODE.h / 2, n.y + NODE.h / 2]), ...labels.flatMap((l) => [l.e.label.y - l.h / 2, l.e.label.y + l.h / 2]), ...curve.map((p) => p.y)];
  const left = Math.min(...xs) - PAD, top = Math.min(...ys) - PAD, dx = -left, dy = -top;
  for (const n of nodes) { n.x += dx; n.y += dy; }
  for (const e of edges) { e.d = paths.get(e.id)!(dx, dy); e.label = { x: e.label.x + dx, y: e.label.y + dy }; }
  return { nodes, edges, width: Math.ceil(Math.max(...xs) + PAD + dx), height: Math.ceil(Math.max(...ys) + PAD + dy) };
}
