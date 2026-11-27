// Schemat's picture laid out (SchemaGraph.tsx): the anchors as boxes from left to right in the order a round goes, the motions
// as curves between them with their names, a motion from an anchor back to it as a loop over the box. Only where the known
// anchors stand is written here (PLATS: column and row); an anchor the catalogue gains, or one a motion names that no list has,
// goes in the spare row at the bottom by itself, and every motion is drawn from its own from and to. Pure, no DOM.
//
// The curves: between two neighbours in a row (no box between them) one going right bows up and one going left bows down, a
// second one more; over a box in between they go under the row, the longer the deeper; between rows they bow a little to the
// left of their way. A name sits on its curve's middle and is moved off the others and off the boxes.

/** Where the known anchors stand: [column, row]. Row 1 is the round's row, 0 above it, 2 under it. */
export const PLATS: Record<string, [number, number]> = {
  A1S: [0, 1],
  A1: [1, 1],
  "A2.3": [2, 1],
  A2M: [3, 0],
  A3PnCm: [4, 1],
  A3DCm: [4, 2],
  A1V: [5, 1],
};

export const NODE = { w: 156, h: 62 };
const COL = 272, X0 = 104, ROW_Y = [118, 352, 566], SPARE_Y = 742, PAD = 28;
const LOOP_GAP = 8;

export type LayoutNode = { id: string; x: number; y: number; spare: boolean };
export type LayoutEdge = {
  id: string; from: string; to: string; loop: boolean;
  /** The curve (an SVG path) and where its name sits. */
  d: string; label: { x: number; y: number };
};
export type Layout = { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number; spareY: number | null };

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

export function schemaLayout(anchors: readonly { id: string }[], motions: readonly { id: string; franAnkare: string | null; tillAnkare: string | null }[], size: LabelSize): Layout {
  // The boxes: the known in their place, the others in the spare row in the catalogue's order.
  const nodes: LayoutNode[] = [];
  let spare = 0;
  for (const a of anchors) {
    const at = PLATS[a.id];
    if (at) nodes.push({ id: a.id, x: X0 + at[0] * COL, y: ROW_Y[at[1]], spare: false });
    else nodes.push({ id: a.id, x: X0 + spare++ * (NODE.w + 40), y: SPARE_Y, spare: true });
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rowOf = (n: LayoutNode) => (n.spare ? 9 : PLATS[n.id][1]);

  // The curves, in the catalogue's order; parallel ones (same pair and way) step out.
  const edges: LayoutEdge[] = [];
  const count = new Map<string, number>();
  const nth = (key: string) => { const k = count.get(key) ?? 0; count.set(key, k + 1); return k; };
  const loops = new Map<string, number>(), stacked = new Map<string, number>();
  // The widest name looped on each box: the loops' legs go up beside all of them.
  const widest = new Map<string, number>();
  for (const m of motions) if (m.franAnkare && m.franAnkare === m.tillAnkare) widest.set(m.franAnkare, Math.max(widest.get(m.franAnkare) ?? 0, size(m.id).w));
  const curve: P[] = [];
  const paths = new Map<string, (ox: number, oy: number) => string>();
  for (const m of motions) {
    const a = m.franAnkare ? byId.get(m.franAnkare) : undefined, b = m.tillAnkare ? byId.get(m.tillAnkare) : undefined;
    if (!a || !b) continue;
    if (a === b) {
      // Stacked over the box, each name over the one before: a leg goes up beside the names under it, in to its name, and
      // out of it down to the box again.
      const k = loops.get(a.id) ?? 0, used = stacked.get(a.id) ?? 0, { w, h } = size(m.id);
      loops.set(a.id, k + 1);
      stacked.set(a.id, used + h + LOOP_GAP);
      const top = a.y - NODE.h / 2, ly = top - 22 - used - h / 2, r = 6;
      const dx = Math.min(NODE.w / 2 - 4, (widest.get(a.id) ?? w) / 2 + r + 2 + 4 * k);
      paths.set(m.id, (ox, oy) => {
        const x = a.x + ox, t = top + oy, y = ly + oy;
        return `M ${x - dx} ${t - 1} V ${y + r} Q ${x - dx} ${y} ${x - dx + r} ${y} H ${x - w / 2} M ${x + w / 2} ${y} H ${x + dx - r} Q ${x + dx} ${y} ${x + dx} ${y + r} V ${t - 4}`;
      });
      edges.push({ id: m.id, from: a.id, to: b.id, loop: true, d: "", label: { x: a.x, y: ly } });
      continue;
    }
    const sameRow = rowOf(a) === rowOf(b) && !a.spare;
    const between = sameRow && nodes.some((n) => n !== a && n !== b && !n.spare && rowOf(n) === rowOf(a) && n.x > Math.min(a.x, b.x) && n.x < Math.max(a.x, b.x));
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    let c: P;
    if (sameRow && between) {
      const k = nth(`under|${a.id}|${b.id}`), span = Math.round(Math.abs(b.x - a.x) / COL);
      c = { x: mid.x, y: mid.y + 2 * (96 + 40 * (span - 1) + 40 * k) };
    } else if (sameRow) {
      const right = b.x > a.x, k = nth(`${a.id}|${b.id}`);
      c = { x: mid.x, y: mid.y + 2 * (right ? -1 : 1) * (54 + 40 * k) };
    } else {
      const k = nth(`${a.id}|${b.id}`), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const off = 26 + 38 * k; // to the left of the way
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
        if (A.e.loop && B.e.loop) B.e.label.y -= up * push * 2;
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

  // The picture's size: the boxes, the names and the curves, with a margin.
  const ys = [...nodes.map((n) => n.y - NODE.h / 2), ...labels.map((l) => l.e.label.y - l.h / 2), ...curve.map((p) => p.y)];
  const ye = [...nodes.map((n) => n.y + NODE.h / 2), ...labels.map((l) => l.e.label.y + l.h / 2), ...curve.map((p) => p.y)];
  const top = Math.min(...ys) - PAD, bottom = Math.max(...ye) + PAD;
  const right = Math.max(...nodes.map((n) => n.x + NODE.w / 2), ...labels.map((l) => l.e.label.x + l.w / 2), ...curve.map((p) => p.x)) + PAD;
  const left = Math.min(...nodes.map((n) => n.x - NODE.w / 2), ...labels.map((l) => l.e.label.x - l.w / 2), ...curve.map((p) => p.x)) - PAD;
  // Shift so that the picture starts at 0, 0.
  const dx = -left, dy = -top;
  for (const n of nodes) { n.x += dx; n.y += dy; }
  for (const e of edges) { e.d = paths.get(e.id)!(dx, dy); e.label = { x: e.label.x + dx, y: e.label.y + dy }; }
  return { nodes, edges, width: Math.ceil(right + dx), height: Math.ceil(bottom + dy), spareY: spare ? SPARE_Y + dy : null };
}
