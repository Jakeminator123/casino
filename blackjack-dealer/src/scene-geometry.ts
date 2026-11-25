// Pure geometry for the scene contract: table-plane homography, card projection, a synthetic pinhole camera.
// No I/O. Table frame: millimetres on the felt, X toward image right, Y away from the camera (toward
// the dealer), Z up. Image frame: pixels, origin top left, y down. A homography here always maps
// table millimetres to image pixels and is stored row-major with its last element 1.
export type Pt = {x: number; y: number};
export type Mat3 = number[];
export type Size = {width: number; height: number};
export type CardPose = {x: number; y: number; heading: number}; // centre in mm; heading in degrees, counter-clockwise seen from above
export type Segment = {a: Pt; b: Pt};
export type CardObservation = {id: string; corners: Pt[]; use?: boolean[]; sides?: (Segment | null)[]}; // corners: far-left, far-right, near-right, near-left; sides: far, right, near, left
export type Camera = {focalPx: number; cx: number; cy: number; pitchDeg: number; rollDeg: number; yawDeg: number; heightMm: number; x: number; y: number};
export const CARD_MM: Size = {width: 63, height: 88};
const RAD = Math.PI / 180;

export const mul3 = (a: Mat3, b: Mat3): Mat3 => [0, 1, 2].flatMap(r => [0, 1, 2].map(c => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]));
export function inv3(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m, det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-300) throw Error('Singular 3x3 matrix.');
  return [e * i - f * h, c * h - b * i, b * f - c * e, f * g - d * i, a * i - c * g, c * d - a * f, d * h - e * g, b * g - a * h, a * e - b * d].map(v => v / det);
}
export const normaliseH = (h: Mat3): Mat3 => h.map(v => v / h[8]);
export function applyH(h: Mat3, p: Pt): Pt { const w = h[6] * p.x + h[7] * p.y + h[8]; return {x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w}; }

export function solve(A: number[][], b: number[]): number[] {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; if (Math.abs(M[c][c]) < 1e-300) throw Error('Singular linear system.');
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((row, i) => row[n] / row[i]);
}
// Jacobi rotations; eigenvectors are the columns of `vectors`.
export function symmetricEigen(S: number[][]): {values: number[]; vectors: number[][]} {
  const n = S.length, a = S.map(r => [...r]), v: number[][] = a.map((_, i) => a.map((_, j) => i === j ? 1 : 0));
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0, diag = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i === j) diag += a[i][i] ** 2; else off += a[i][j] ** 2;
    if (off <= 1e-30 * diag) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      if (a[p][q] === 0) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]), t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const x = a[k][p], y = a[k][q]; a[k][p] = c * x - s * y; a[k][q] = s * x + c * y; }
      for (let k = 0; k < n; k++) { const x = a[p][k], y = a[q][k]; a[p][k] = c * x - s * y; a[q][k] = s * x + c * y; }
      for (let k = 0; k < n; k++) { const x = v[k][p], y = v[k][q]; v[k][p] = c * x - s * y; v[k][q] = s * x + c * y; }
    }
  }
  return {values: a.map((r, i) => r[i]), vectors: v};
}

// Normalised DLT for four or more correspondences; maps a point of `from` onto `to`.
export function homographyFromPoints(from: Pt[], to: Pt[]): Mat3 {
  if (from.length < 4 || from.length !== to.length) throw Error('A homography needs four or more point pairs.');
  const norm = (pts: Pt[]) => { const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length, my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const d = pts.reduce((s, p) => s + Math.hypot(p.x - mx, p.y - my), 0) / pts.length || 1, k = Math.SQRT2 / d;
    return {T: [k, 0, -k * mx, 0, k, -k * my, 0, 0, 1] as Mat3, pts: pts.map(p => ({x: (p.x - mx) * k, y: (p.y - my) * k}))}; };
  const a = norm(from), b = norm(to), S = Array.from({length: 9}, () => Array(9).fill(0));
  for (let i = 0; i < from.length; i++) { const {x, y} = a.pts[i], {x: u, y: v} = b.pts[i];
    for (const row of [[-x, -y, -1, 0, 0, 0, u * x, u * y, u], [0, 0, 0, -x, -y, -1, v * x, v * y, v]]) for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) S[r][c] += row[r] * row[c]; }
  const {values, vectors} = symmetricEigen(S); let k = 0; for (let i = 1; i < 9; i++) if (values[i] < values[k]) k = i;
  return normaliseH(mul3(inv3(b.T), mul3(vectors.map(row => row[k]), a.T)));
}

export function cardCorners(pose: CardPose, size: Size = CARD_MM): Pt[] {
  const c = Math.cos(pose.heading * RAD), s = Math.sin(pose.heading * RAD), w = size.width / 2, h = size.height / 2;
  return [[-w, h], [w, h], [w, -h], [-w, -h]].map(([u, v]) => ({x: pose.x + u * c - v * s, y: pose.y + u * s + v * c}));
}
export const projectCard = (H: Mat3, pose: CardPose, size: Size = CARD_MM): Pt[] => cardCorners(pose, size).map(p => applyH(H, p));

// Levenberg-Marquardt with a numeric Jacobian; small problems only.
export function levenbergMarquardt(residuals: (p: number[]) => number[], start: number[], iterations = 200): {p: number[]; residuals: number[]; cost: number; iterations: number} {
  let p = [...start], r = residuals(p), cost = r.reduce((s, v) => s + v * v, 0), lambda = 1e-3, done = 0;
  for (; done < iterations; done++) {
    const n = p.length, m = r.length, J = Array.from({length: m}, () => Array(n).fill(0));
    for (let j = 0; j < n; j++) { const step = 1e-6 * Math.max(1, Math.abs(p[j])), hi = [...p], lo = [...p]; hi[j] += step; lo[j] -= step;
      const a = residuals(hi), b = residuals(lo); for (let i = 0; i < m; i++) J[i][j] = (a[i] - b[i]) / (2 * step); }
    const JtJ = Array.from({length: n}, (_, a) => Array.from({length: n}, (_, b) => { let s = 0; for (let i = 0; i < m; i++) s += J[i][a] * J[i][b]; return s; }));
    const g = Array.from({length: n}, (_, a) => { let s = 0; for (let i = 0; i < m; i++) s += J[i][a] * r[i]; return -s; });
    let improved = false, gain = 0;
    for (let attempt = 0; attempt < 12 && !improved; attempt++) {
      let delta: number[];
      try { delta = solve(JtJ.map((row, a) => row.map((v, b) => a === b ? v * (1 + lambda) + 1e-12 : v)), g); } catch { lambda *= 10; continue; }
      const q = p.map((v, i) => v + delta[i]), rq = residuals(q), cq = rq.reduce((s, v) => s + v * v, 0);
      if (Number.isFinite(cq) && cq < cost) { gain = cost - cq; p = q; r = rq; cost = cq; lambda = Math.max(lambda / 3, 1e-12); improved = true; } else lambda *= 4;
    }
    if (!improved || gain <= 1e-14 * (cost + 1e-12)) break;
  }
  return {p, residuals: r, cost, iterations: done};
}

const rms = (values: number[]) => values.length ? Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length) : 0;
// Residuals of one observed card against a projected quad, in pixels. With measured side segments
// (far, right, near, left; null where hidden) each segment end is held to the projected side line,
// so a partly hidden card still counts for what was seen. Without them the corners are compared.
export function cardResiduals(projected: Pt[], card: CardObservation): number[] {
  if (!card.sides) return projected.flatMap((q, i) => (card.use?.[i] ?? true) ? [q.x - card.corners[i].x, q.y - card.corners[i].y] : []);
  return card.sides.flatMap((side, k) => { if (!side) return []; const a = projected[k], b = projected[(k + 1) % 4], n = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return [side.a, side.b].map(p => ((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)) / n); });
}
function cardReport(H: Mat3, pose: CardPose, card: CardObservation, size: Size) {
  const projected = projectCard(H, pose, size), residuals = cardResiduals(projected, card), measured = [0, 1, 2, 3].map(i => card.sides ? !!card.sides[(i + 3) % 4] && !!card.sides[i] : card.use?.[i] ?? true);
  const cornerErrors = projected.map((q, i) => measured[i] ? Math.hypot(q.x - card.corners[i].x, q.y - card.corners[i].y) : null), seen = cornerErrors.filter((v): v is number => v !== null);
  return {id: card.id, pose, projected, residualRms: rms(residuals), residualMax: residuals.reduce((m, v) => Math.max(m, Math.abs(v)), 0), residualKind: card.sides ? 'distance from measured edge to projected edge' : 'corner offset in x and y',
    cornerErrors, cornerRms: seen.length ? rms(seen) : null, cornerMax: seen.length ? Math.max(...seen) : null};
}

// Best pose of a card of the given size on a known plane for one observed card.
export function fitCardPose(H: Mat3, card: CardObservation, size: Size = CARD_MM) {
  const back = card.corners.map(p => applyH(inv3(H), p)), mid = (a: Pt, b: Pt) => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2}), far = mid(back[0], back[1]), near = mid(back[2], back[3]);
  const start = [(far.x + near.x) / 2, (far.y + near.y) / 2, Math.atan2(far.y - near.y, far.x - near.x) / RAD - 90];
  const fit = levenbergMarquardt(p => cardResiduals(projectCard(H, {x: p[0], y: p[1], heading: p[2]}, size), card), start);
  return cardReport(H, {x: fit.p[0], y: fit.p[1], heading: fit.p[2]}, card, size);
}

// One plane for several cards of known size. The first card fixes the origin at its centre; every
// other card keeps a free position and heading on the table. In the general model (eight numbers)
// the first card also fixes the heading. With `levelRows` the plane is held to six numbers: lines
// along table X stay horizontal in the image (a camera without roll, square to the table edge), and
// the first card's heading becomes free instead. `initial` starts from a known plane and one pose per
// card, in any table frame (for level rows its X must already run level); a start near the answer
// matters, because the fit can otherwise settle in a neighbouring, worse minimum.
export function fitPlane(cards: CardObservation[], options: {levelRows?: boolean; size?: Size; initial?: {H: Mat3; poses: CardPose[]}} = {}) {
  if (!cards.length) throw Error('fitPlane needs at least one card.');
  const size = options.size ?? CARD_MM, level = !!options.levelRows, first = homographyFromPoints(cardCorners({x: 0, y: 0, heading: 0}, size), cards[0].corners);
  const all = cards.flatMap(c => c.corners), cx = all.reduce((s, p) => s + p.x, 0) / all.length, cy = all.reduce((s, p) => s + p.y, 0) / all.length, S = 1000, M = 100;
  const toScaled: Mat3 = [1 / S, 0, -cx / S, 0, 1 / S, -cy / S, 0, 0, 1], fromScaled = inv3(toScaled), mm: Mat3 = [1 / M, 0, 0, 0, 1 / M, 0, 0, 0, 1], head = level ? 7 : 8;
  const unpack = (p: number[]) => ({H: normaliseH(mul3(fromScaled, mul3(level ? [p[0], p[1], p[2], 0, p[3], p[4], 0, p[5], 1] : [...p.slice(0, 8), 1], mm))),
    poses: cards.map((_, i) => i ? {x: p[head - 3 + i * 3] * M, y: p[head - 2 + i * 3] * M, heading: p[head - 1 + i * 3] / RAD} : {x: 0, y: 0, heading: level ? p[6] / RAD : 0})});
  const given = options.initial, turn = given && !level ? given.poses[0].heading : 0, seed = given && {H: reframe(given.H, given.poses[0], turn), poses: given.poses.map(p => reframePose(p, given.poses[0], turn))};
  const h = normaliseH(mul3(toScaled, mul3(seed?.H ?? first, inv3(mm))));
  const start = [...(level ? [h[0], h[1], h[2], h[4], h[5], h[7], (seed?.poses[0].heading ?? 0) * RAD] : h.slice(0, 8)), ...cards.slice(1).flatMap((c, i) => { const p = seed?.poses[i + 1] ?? fitCardPose(first, c, size).pose; return [p.x / M, p.y / M, p.heading * RAD]; })];
  const fit = levenbergMarquardt(p => { const {H, poses} = unpack(p); return cards.flatMap((c, i) => cardResiduals(projectCard(H, poses[i], size), c)); }, start);
  const {H, poses} = unpack(fit.p), parameters = head + 3 * (cards.length - 1);
  return {H, model: level ? 'LEVEL_ROWS' as const : 'GENERAL' as const, cards: cards.map((c, i) => cardReport(H, poses[i], c, size)), residualRms: rms(fit.residuals), residuals: fit.residuals.length, parameters, redundancy: fit.residuals.length - parameters};
}
// Re-express a homography in a rotated and shifted table frame: old = R(rotationDeg) * new + origin.
export function reframe(H: Mat3, origin: Pt, rotationDeg: number): Mat3 { const c = Math.cos(rotationDeg * RAD), s = Math.sin(rotationDeg * RAD); return normaliseH(mul3(H, [c, -s, origin.x, s, c, origin.y, 0, 0, 1])); }
export function reframePose(pose: CardPose, origin: Pt, rotationDeg: number): CardPose { const c = Math.cos(rotationDeg * RAD), s = Math.sin(rotationDeg * RAD), dx = pose.x - origin.x, dy = pose.y - origin.y; return {x: c * dx + s * dy, y: -s * dx + c * dy, heading: pose.heading - rotationDeg}; }

// Synthetic pinhole: camera at (x, y, heightMm) in table millimetres, yaw 0 looks along +Y,
// pitch is degrees below the horizontal, roll turns the image clockwise.
function cameraAxes(cam: Camera) {
  const t = cam.pitchDeg * RAD, y = cam.yawDeg * RAD, r = cam.rollDeg * RAD, turn = (v: number[]) => [v[0] * Math.cos(y) + v[1] * Math.sin(y), -v[0] * Math.sin(y) + v[1] * Math.cos(y), v[2]];
  const right0 = turn([1, 0, 0]), down0 = turn([0, -Math.sin(t), -Math.cos(t)]), forward = turn([0, Math.cos(t), -Math.sin(t)]);
  return {right: right0.map((v, i) => v * Math.cos(r) + down0[i] * Math.sin(r)), down: right0.map((v, i) => -v * Math.sin(r) + down0[i] * Math.cos(r)), forward};
}
export function cameraProject(cam: Camera, p: {x: number; y: number; z: number}): Pt {
  const {right, down, forward} = cameraAxes(cam), d = [p.x - cam.x, p.y - cam.y, p.z - cam.heightMm], dot = (a: number[]) => a[0] * d[0] + a[1] * d[1] + a[2] * d[2];
  return {x: cam.cx + cam.focalPx * dot(right) / dot(forward), y: cam.cy + cam.focalPx * dot(down) / dot(forward)};
}
export function cameraHomography(cam: Camera): Mat3 {
  const {right, down, forward} = cameraAxes(cam), C = [cam.x, cam.y, cam.heightMm], t = [right, down, forward].map(a => -(a[0] * C[0] + a[1] * C[1] + a[2] * C[2]));
  return normaliseH([cam.focalPx * right[0] + cam.cx * forward[0], cam.focalPx * right[1] + cam.cx * forward[1], cam.focalPx * t[0] + cam.cx * t[2],
    cam.focalPx * down[0] + cam.cy * forward[0], cam.focalPx * down[1] + cam.cy * forward[1], cam.focalPx * t[1] + cam.cy * t[2], forward[0], forward[1], t[2]]);
}

// Deterministic noise for uncertainty runs and tests.
export function seededRandom(seed: number) { let s = seed >>> 0; const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {uniform: next, gaussian: () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next())}; }
