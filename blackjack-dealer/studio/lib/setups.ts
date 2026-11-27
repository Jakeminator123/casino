// The live table's clone (the new standard since Jakob 2026-11-27, src/uppsattning.ts "live") beside the former standard
// ("forra"), for Mått's part Livebordet (components/measures/SetupCompare.tsx), Jakob 2026-11-27: "klona vår setup mot
// videons och kunna jämföra". "Ours" below is the former standard. Both are read at run time from the code itself, as
// the server hands it out (the doll lab's modules: src/table-lens.ts for ours, src/table-live.ts for the clone,
// dealer3d/src/world.ts and doll.ts for the card places of the standard doll's table, and the card plan), so the page
// shows what holds now and is no second source. Nothing of the real film: the clone is our own copy of its measures.
//
// The common frame of the drawing: metres on the felt, from the middle of each table's edge toward the dealer, x toward
// the picture's right (the dealer's left), z toward the players. Ours is the standard doll's table (its edge
// DOLL_TABLE.edgeBack behind the game's) through the game's view (PLAY_LENS, the standard doll's films); the clone is
// LIVE through its own camera.
/* eslint-disable @typescript-eslint/no-explicit-any -- the modules are read at run time, typed by hand where used */

export type Pt = [number, number];
export type Px = { x: number; y: number };
export type Camera = { foot: Pt; height: number; pitchDeg: number; rollDeg: number; hFovDeg: number; vFovDeg: number; focalPx: number; width: number; height_px: number; toEdge: number };
export type Setup = {
  name: string;
  /** The felt's outline, closed. */
  felt: Pt[];
  feltDepth: number; feltWidth: number; feltRadius: number;
  cards: { id: string; at: Pt; corners: Pt[] }[];
  shoe: { foot: Pt[]; length: number; width: number; backHeight: number; frontHeight: number; plateLeanDeg: number; angleDeg: number; mouth: Pt };
  box: Pt[] | null;
  tray: Pt[] | null;
  betMarks: Pt[];
  camera: Camera;
  /** The same things as the camera draws them, in its own picture's pixels. */
  picture: { width: number; height: number; felt: Px[]; edge: Px[]; cards: { id: string; quad: Px[] }[]; shoe: Px[][]; box: Px[] | null };
};

const D = 180 / Math.PI;
type V3 = [number, number, number];
const load = (path: string): Promise<any> => import(/* webpackIgnore: true */ /* turbopackIgnore: true */ path);

/** Samples of a circle's arc from angle a to b (radians), as points on the felt. */
const arc = (cx: number, cz: number, r: number, a: number, b: number, n = 64): V3[] =>
  Array.from({ length: n + 1 }, (_, i) => { const t = a + ((b - a) * i) / n; return [cx + r * Math.cos(t), 0, cz + r * Math.sin(t)]; });
const hfov = (focal: number, width: number) => 2 * Math.atan(width / 2 / focal) * D;
const angleToEdge = (back: V3) => Math.atan2(-back[2], back[0]) * D;

export async function readSetups(): Promise<{ ours: Setup; live: Setup }> {
  const [lens, liveMod, world, doll, planResponse] = await Promise.all([
    load("/src/table-lens.ts"), load("/src/table-live.ts"), load("/dealer3d/src/world.ts"), load("/dealer3d/src/doll.ts"), fetch("/dealer3d/plan"),
  ]);
  if (!planResponse.ok) throw new Error("Kortplanen kunde inte läsas.");
  const plan = await planResponse.json();
  return { ours: oursFrom(lens, world, doll, plan), live: liveFrom(lens, liveMod) };
}

function oursFrom(L: any, world: any, doll: any, plan: any): Setup {
  const kant: V3 = world.dealerEdge(L.TABLE_LENS), edgeZ = kant[2] - L.DOLL_TABLE.edgeBack, O: V3 = [kant[0], 0, edgeZ];
  const flat = (p: V3): Pt => [p[0] - O[0], p[2] - O[2]];
  const eye = L.filmEye(L.PLAY_LENS), see = (p: V3): Px | null => L.see(eye, p);
  const R = L.DOLL_TABLE.depth, half = L.TABLE_TOP.halfWidth;
  // The standard doll's felt: a half circle (a half oval where depth and half width differ) with its straight edge at the doll's edge.
  const outline: V3[] = Array.from({ length: 65 }, (_, i) => { const t = (Math.PI * i) / 64; return [O[0] + half * Math.cos(t), 0, O[2] + R * Math.sin(t)]; });
  const spots: { id: string; at: V3 }[] = world.spots(plan, L.TABLE_LENS);
  const cards = spots.map((s) => ({ id: s.id, at: s.at, corners: L.cardCorners(s.at, doll.dollCardYaw(s.id, s.at, L.TABLE_LENS)) as V3[] }));
  const pose = L.shoePose(L.TABLE_LENS, L.dollShoe(L.TABLE_LENS)), S = L.SHOE;
  const f: V3 = pose.front, b: V3 = pose.back, w: V3 = pose.far, len = pose.footLength;
  const along = (p: V3, k: number, d: V3): V3 => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];
  const foot: V3[] = [f, along(f, len, b), along(along(f, len, b), S.width, w), along(f, S.width, w)];
  const top: V3[] = foot.map((p, i) => [p[0], i === 1 || i === 2 ? S.backHeight : S.frontHeight, p[2]]);
  const mouth = along(f, S.width / 2, w);
  const T = L.TRAY;
  const tray: V3[] = [[O[0] + T.x0, 0, O[2] + T.s0], [O[0] + T.x1, 0, O[2] + T.s0], [O[0] + T.x1, 0, O[2] + T.s1], [O[0] + T.x0, 0, O[2] + T.s1]];
  const F = L.FILM;
  return {
    name: "Förra standarden",
    felt: [...outline, outline[0]].map(flat), feltDepth: R, feltWidth: 2 * half, feltRadius: R,
    cards: cards.map((c) => ({ id: c.id, at: flat(c.at), corners: c.corners.map(flat) })),
    shoe: { foot: foot.map(flat), length: S.length, width: S.width, backHeight: S.backHeight, frontHeight: S.frontHeight, plateLeanDeg: S.plateLean * D, angleDeg: angleToEdge(b), mouth: flat(mouth) },
    box: null, tray: tray.map(flat), betMarks: [],
    camera: { foot: flat([0, 0, 0]), height: L.PLAY_LENS.height, pitchDeg: L.PLAY_LENS.pitch * D, rollDeg: 0, hFovDeg: hfov(L.PLAY_LENS.focalPx, F.width), vFovDeg: hfov(L.PLAY_LENS.focalPx, F.height), focalPx: L.PLAY_LENS.focalPx, width: F.width, height_px: F.height, toEdge: -edgeZ },
    picture: picture(F.width, F.height, see, outline, [[O[0] - half, 0, O[2]], [O[0] + half, 0, O[2]]], cards, [foot, top], null),
  };
}

function liveFrom(L: any, M: any): Setup {
  const S = M.LIVE, O: V3 = S.edge, flat = (p: V3): Pt => [p[0] - O[0], p[2] - O[2]];
  const see = (p: V3): Px | null => M.liveSee(p);
  const { centre, radius, edgeZ } = S.felt;
  const a0 = Math.asin(Math.max(-1, Math.min(1, (edgeZ - centre[2]) / radius)));
  const outline = arc(centre[0], centre[2], radius, a0, Math.PI - a0);
  const ids = Object.keys(S.cards);
  const cards = ids.map((id) => ({ id, at: S.cards[id].at as V3, corners: M.liveCardCorners(id) as V3[] }));
  const sh = S.shoe, near: V3 = sh.foot.towardPlayers, back: V3 = sh.foot.back, byDealer: V3 = sh.foot.byDealer;
  const fourth: V3 = [back[0] + byDealer[0] - near[0], 0, back[2] + byDealer[2] - near[2]];
  const foot: V3[] = [near, back, fourth, byDealer];
  const top: V3[] = [[near[0], sh.frontHeight, near[2]], [back[0], sh.backHeight, back[2]], [fourth[0], sh.backHeight, fourth[2]], [byDealer[0], sh.frontHeight, byDealer[2]]];
  const pose = M.liveShoePose(sh), mouth: V3 = [near[0] + (byDealer[0] - near[0]) / 2, 0, near[2] + (byDealer[2] - near[2]) / 2];
  const [nl, nr, fr] = S.box.foot as V3[], box: V3[] = [nl, nr, fr, [nl[0] + fr[0] - nr[0], 0, nl[2] + fr[2] - nr[2]]];
  const C = S.camera;
  const half = S.felt.widthAtEdge / 2;
  return {
    name: "Livebordet",
    felt: [...outline, outline[0]].map(flat), feltDepth: S.felt.depth, feltWidth: S.felt.widthAtEdge, feltRadius: radius,
    cards: cards.map((c) => ({ id: c.id, at: flat(c.at), corners: c.corners.map(flat) })),
    shoe: { foot: foot.map(flat), length: sh.length, width: sh.width, backHeight: sh.backHeight, frontHeight: sh.frontHeight, plateLeanDeg: sh.plateLean * D, angleDeg: angleToEdge(pose.back), mouth: flat(mouth) },
    box: box.map(flat), tray: null, betMarks: (S.betMarks as V3[]).map(flat),
    camera: { foot: flat([0, 0, 0]), height: C.height, pitchDeg: C.pitch * D, rollDeg: C.roll * D, hFovDeg: hfov(C.focalPx, C.film.width), vFovDeg: hfov(C.focalPx, C.film.height), focalPx: C.focalPx, width: C.film.width, height_px: C.film.height, toEdge: -O[2] },
    picture: picture(C.film.width, C.film.height, see, outline, [[O[0] - half, 0, O[2]], [O[0] + half, 0, O[2]]], cards, [foot, top], box),
  };
}

function picture(width: number, height: number, see: (p: V3) => Px | null, outline: V3[], edge: V3[], cards: { id: string; corners: V3[] }[], shoe: V3[][], box: V3[] | null): Setup["picture"] {
  const all = (ps: V3[]) => ps.map(see).filter((p): p is Px => !!p);
  return {
    width, height,
    felt: all(outline), edge: all(edge),
    cards: cards.map((c) => ({ id: c.id, quad: all(c.corners) })).filter((c) => c.quad.length === 4),
    shoe: shoe.map(all), box: box ? all(box) : null,
  };
}

/** Seat n's first card, and the dealer's first, in both: the places to compare (ours P4.C1 against the clone's P4.C1). */
export const COMPARED_CARDS = ["P1.C1", "P2.C1", "P3.C1", "P4.C1", "P5.C1", "P6.C1", "P7.C1", "D.C1"] as const;
