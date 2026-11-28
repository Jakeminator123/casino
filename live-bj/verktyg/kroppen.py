"""The two dealers' bodies out of the live table's film, for a figure with their build instead of an average man's
(Jakob 2026-11-28: "att vi ska göra om dockan som liknar youtubevideon"). Only numbers come out: the frames and the
dealer's outline stay under rutor/ and are deleted when the numbers are written.

  PY live-bj/verktyg/kroppen.py rutor <film> <kalla.json> <matt-mapp> <lyft-mapp> <ut-mapp under live-bj/rutor/> [--per 2]
      Key frames in the waits (both hands lying still on the felt), --per per wait piece, the face most nearly turned to
      the camera and 1.5 s apart: cut out of the film as mat.py reads it, <ut-mapp>/t<ms>.png, and <ut-mapp>/lista.json
      (the camera, a box round the dealer, the piece and the second in it, so that our figure can be shown the same).
  PY live-bj/verktyg/kroppen.py docka <lista.json> <dockans bildmapp> <ut-lista.json>
      The same list for our figure playing the same waits through the live table's camera: the picture
      <bildmapp>/lyft-<docka>-vantan-<n>/spel-<sekunden i stycket>.png (standarddocka/verktyg/titta.ts --docka <docka>
      --giv lyft-<docka>-vantan-<n> --kamera spel --storlek 2086x1135: the picture is then the film's, 1728 x 972).
  SAMPY live-bj/verktyg/sam_runpod.py las <sam-mapp> <lista.json> --yta <yta-mapp>
      SAM 3D Body on each list: the joints, and the surface as read and standing in the rest pose.
  PY live-bj/verktyg/kroppen.py matt <lista.json> <sam-mapp> <yta-mapp> <dockans lista.json> <dockans sam-mapp> <dockans yta-mapp> <rapporter> <ut.json>
      The measures (matt below), written to <ut.json> (data/kroppar.json): each with how it is measured and how sure.
      <rapporter> holds bygg_docka.py's reports for today's figures, named docka-rapport-<docka>.json: their true
      measures (bygg_docka.py -- --kon <docka> --namn idag writes them to slask/avatar-auto-pipeline/bygge/; the
      models it writes beside them are thrown away). The frames are read again for the outline, so this runs before
      rutor/ is cleared.

How a body is measured (matt):
  - Scale: SAM's body is moved along the camera's lines of sight (all of it scaled about the camera, so the picture
    stays the same) until the wrists lie 0.04 m over the felt, as the lifted waits hold them. The felt is known from the
    camera (data/scen.json); SAM's own distance is not used.
  - Every measure on SAM's body standing in its rest pose (so the seated posture is out): the shoulder joints apart,
    the arm's parts, the hand and the fingers from its joints; the rounds, the head and the neck on its surface,
    measured the way bygg_docka.py measures our figure (the trunk's rounds round the middle line only).
  - Calibrated on our own figures: SAM reads Danilo's and Frasse's figures in the same waits through the same camera,
    where the truth is bygg_docka.py's own measure; per measure the factor truth / SAM over all those frames (for the
    chin and the eyes over the shoulders a step) is put on the dealer's mean. What SAM gets wrong the same way on both
    falls out; what it gets wrong on clothes does not. osaker is the spread between the dealer's frames and of the
    factor, together. SAM reads nearly the same shape on both dealers: what parts them is mostly the size.
  - The outline: the dealer's against our figure's in the same frame and pose (MediaPipe's person mask), in pixels at
    the same heights: how much wider or narrower he looks, clothes included.
"""
import os, sys, json, math, glob

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
WRIST_OVER_FELT = 0.04   # as lyft.py holds the wrists in a wait
# What a trial figure takes from the film (bygg_docka.py's names). The hips, the legs and the trunk's length are hidden
# behind the table: SAM only guesses them, so the figure keeps its own.
PASSA = ('sw', 'ua', 'fa', 'hand', 'haka', 'huvud_h', 'huvud_b', 'huvud_d', 'hals_omkr', 'brost_omkr', 'midja_omkr', 'ua_omkr', 'fa_omkr', 'handled_omkr')


def wait_pieces(lift_dir):
    for name in sorted(glob.glob(os.path.join(lift_dir, '*-vantan-*.json'))):
        piece = json.load(open(name, encoding='utf-8'))
        yield os.path.splitext(os.path.basename(name))[0], piece


def rutor(film, source_file, measured, lift_dir, out, per=2):
    import numpy as np
    import cv2
    from sam_runpod import box_of, camera_of
    if 'rutor' not in os.path.abspath(out).replace('\\', '/').split('/'):
        sys.exit('the frames are cut out under live-bj/rutor/ only')
    source = json.load(open(source_file, encoding='utf-8'))
    crop = source['crop']
    stretches = [json.load(open(p, encoding='utf-8')) for p in sorted(glob.glob(os.path.join(measured, 'rorelse-*.json')))]
    wanted = []
    for name, piece in wait_pieces(lift_dir):
        t0 = piece['frames'][0]['t']
        scored = sorted(piece['frames'], key=lambda f: abs(f['ansikte'][1]) + abs(f['ansikte'][2]) + 0.3 * abs(f['ansikte'][0]))
        chosen = []
        for f in scored:
            if all(abs(f['t'] - c['t']) >= 1.5 for c in chosen):
                chosen.append(f)
            if len(chosen) == per:
                break
        for f in chosen:
            wanted.append({'t': f['t'], 'piece': name, 'piece_t': round(f['t'] - t0, 3), 'docka': piece['docka'], 'stil': piece['style'], 'ansikte': f['ansikte']})
    os.makedirs(out, exist_ok=True)
    size = (crop['width'], crop['height'])
    plan = []
    cap = cv2.VideoCapture(film)
    for st in stretches:
        mine = []
        for w in wanted:
            k = int(np.argmin([abs(fr['t'] - w['t']) for fr in st['frames']]))
            if abs(st['frames'][k]['t'] - w['t']) < 0.02 and st['frames'][k]['pose']:
                mine.append((st['frames'][k]['f'], k, w))
        if not mine:
            continue
        mine.sort(key=lambda m: m[0])
        needed = {m[0]: m for m in mine}
        cap.set(cv2.CAP_PROP_POS_FRAMES, st['frames'][0]['f'])   # as mat.py reads it: from the stretch's first frame, straight through
        index = st['frames'][0]['f']
        while index <= mine[-1][0]:
            ok, full = cap.read()
            if not ok:
                break
            if index in needed:
                _, k, w = needed[index]
                frame = st['frames'][k]
                ms = int(round(frame['t'] * 1000))
                name = f't{ms:07d}.png'
                cv2.imwrite(os.path.join(out, name), full[crop['y']:crop['y'] + crop['height'], crop['x']:crop['x'] + crop['width']])
                plan.append({'picture': name, 't': frame['t'], 'box': box_of(frame, *size), **{k2: w[k2] for k2 in ('piece', 'piece_t', 'docka', 'stil', 'ansikte')}})
            index += 1
    cap.release()
    plan.sort(key=lambda p: p['t'])
    with open(os.path.join(out, 'lista.json'), 'w', encoding='utf-8') as f:
        json.dump({'about': 'Key frames in the waits for the body\'s measures (kroppen.py rutor): the picture, its time in the film, the box round the dealer, the wait piece and the second in it.',
                   'film': os.path.basename(film), 'camera': camera_of(os.path.join(HERE, '..', 'data', 'scen.json'), size), 'pictures': plan}, f, indent=1)
    print(f'{len(plan)} key frames in {out}: ' + ', '.join(f"{p['docka']} {p['t']:.2f} s" for p in plan))


def docka(listing, pictures, out):
    plan = json.load(open(listing, encoding='utf-8'))
    here = os.path.dirname(os.path.abspath(out))
    entries = []
    for p in plan['pictures']:
        giv = f"lyft-{p['docka']}-{p['piece'].split('-', 1)[1]}"
        name = os.path.join(pictures, giv, f"spel-{p['piece_t']:.2f}.png")
        if not os.path.exists(name):
            sys.exit(f'{name}: missing (titta.ts --docka {p["docka"]} --giv {giv} --kamera spel --tider {p["piece_t"]:.2f} --ut {os.path.join(pictures, giv)})')
        entries.append({**p, 'picture': f"{giv}-{p['piece_t']:.2f}.png", 'file': os.path.relpath(name, here)})
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({**plan, 'about': 'Our figure in the same waits through the live table\'s camera (kroppen.py docka): the same boxes and seconds.', 'pictures': entries}, f, indent=1)
    print(f'{len(entries)} pictures of our figure in {out}')


# ── The measures ─────────────────────────────────────────────────────────────────

def felt_scale(cam, points, names):
    """How much SAM's body is scaled about the camera so that both wrists lie WRIST_OVER_FELT over the felt."""
    import numpy as np
    c, s = math.cos(cam.roll), math.sin(cam.roll)
    k = []
    for side in ('left', 'right'):
        X, Y, Z = points[names.index(f'{side}-wrist')]
        Yr = -s * X + c * Y
        down = Yr * math.cos(cam.t) + Z * math.sin(cam.t)   # how far under the camera the point is, per unit of scale
        k.append((cam.h - WRIST_OVER_FELT) / down)
    return float(np.mean(k)), [round(v, 4) for v in k]


def edges_of(faces):
    """The surface's edges, and per face its three edges (so that a cut can be followed round, face to face)."""
    import numpy as np
    e = np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
    edges, back = np.unique(np.sort(e, axis=1), axis=0, return_inverse=True)
    return edges, back.reshape(3, len(faces)).T


def pieces(cut, face_edges):
    """The cut edges grouped into the separate rings a plane cuts (the trunk, each arm): two cut edges belong together
    when they are sides of one face. Returns a group number per cut edge (in the order of np.nonzero(cut))."""
    import numpy as np
    ids = np.nonzero(cut)[0]
    where = {int(e): i for i, e in enumerate(ids)}
    parent = list(range(len(ids)))

    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    hit = cut[face_edges]
    for a, b in face_edges[hit.sum(axis=1) == 2][hit[hit.sum(axis=1) == 2]].reshape(-1, 2):
        ra, rb = root(where[int(a)]), root(where[int(b)])
        if ra != rb:
            parent[ra] = rb
    return np.array([root(i) for i in range(len(ids))])


def hull_round(q):
    """The convex hull's perimeter round the points q (N x 2): a tape round the cut."""
    import numpy as np
    q = sorted(map(tuple, np.round(q, 6)))
    if len(q) < 3:
        return 0.0
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in q:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(q):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], p) <= 0:
            hi.pop()
        hi.append(p)
    h = np.array(lo[:-1] + hi[:-1])
    return float(np.linalg.norm(h - np.roll(h, 1, axis=0), axis=1).sum())


def standing_measures(V, P, names, surface_edges):
    """The measures of a body standing in the rest pose, the way bygg_docka.py measures our figure (matt there):
    V the surface's corners, P the 70 key points, metres. Returns metres. The rounds of the trunk and the neck are the
    ring round the body's middle line only (an arm hanging close is a ring of its own and is left out)."""
    import numpy as np
    edges, face_edges = surface_edges
    g = lambda n: P[names.index(n)]
    sm, hm = (g('left-shoulder') + g('right-shoulder')) / 2, (g('left-hip') + g('right-hip')) / 2
    up = (sm - hm) / np.linalg.norm(sm - hm)
    lat = g('left-shoulder') - g('right-shoulder'); lat = lat - up * (lat @ up); lat /= np.linalg.norm(lat)
    fwd = np.cross(up, lat)
    eye = (g('left-eye') + g('right-eye')) / 2
    if (g('nose') - eye) @ fwd < 0:
        fwd = -fwd
    local = lambda q: np.stack([(q - sm) @ lat, (q - sm) @ fwd, (q - sm) @ up], axis=-1)   # x his left, y forward, z up, from the shoulders' middle
    C = local(V); E = local(eye); N = local(g('nose')); H = local(hm)
    ea, eb = C[edges[:, 0]], C[edges[:, 1]]

    def level_cut(z, middle_only=False):
        sa, sb = ea[:, 2] - z, eb[:, 2] - z; m = sa * sb < 0
        f = sa[m] / (sa[m] - sb[m]); p = ea[m] + f[:, None] * (eb[m] - ea[m])
        if middle_only:   # the ring that goes round the middle line: the one with points on both sides of it, nearest it
            group = pieces(m, face_edges)
            best = min((g_ for g_ in set(group.tolist()) if p[group == g_][:, 0].min() < 0 < p[group == g_][:, 0].max()),
                       key=lambda g_: np.abs(p[group == g_][:, 0]).min(), default=None)
            p = p[group == best] if best is not None else p[:0]
        return p

    def level_round(z, width):
        p = level_cut(z, True); p = p[np.abs(p[:, 0]) < width]
        return hull_round(p[:, :2]), (np.ptp(p[:, 0]) if len(p) else 0.0), (np.ptp(p[:, 1]) if len(p) else 0.0)

    def limb_round(a, b, t, radius=0.075):
        a, b = local(a), local(b); d = (b - a) / np.linalg.norm(b - a); p0 = a + t * (b - a)
        sa, sb = (ea - p0) @ d, (eb - p0) @ d; m = sa * sb < 0
        f = sa[m] / (sa[m] - sb[m]); pts = ea[m] + f[:, None] * (eb[m] - ea[m])
        pts = pts[np.linalg.norm(pts - p0, axis=1) < radius]
        u = np.cross(d, [0, 0, 1.0]); u /= np.linalg.norm(u); w = np.cross(d, u)
        return hull_round(np.c_[(pts - p0) @ u, (pts - p0) @ w])

    top = C[:, 2].max()
    mid = C[(np.abs(C[:, 0] - N[0]) < 0.004) & (C[:, 1] > E[1] - 0.02) & (C[:, 2] > E[2] - 0.16) & (C[:, 2] < E[2] - 0.07)]
    chin = mid[:, 2].min()
    head = C[(np.linalg.norm(C - E, axis=1) < 0.2)]

    def head_width(start):
        best = 0.0
        for z in np.arange(E[2] + start, top - 0.02, 0.004):
            p = level_cut(z); p = p[np.linalg.norm(p - E, axis=1) < 0.2]
            if len(p) > 3:
                best = max(best, float(np.ptp(p[:, 0])))
        return best

    m = {'sw': np.linalg.norm(g('left-shoulder') - g('right-shoulder')),
         'ua': (np.linalg.norm(g('left-shoulder') - g('left-elbow')) + np.linalg.norm(g('right-shoulder') - g('right-elbow'))) / 2,
         'fa': (np.linalg.norm(g('left-elbow') - g('left-wrist')) + np.linalg.norm(g('right-elbow') - g('right-wrist'))) / 2,
         'hand': (np.linalg.norm(g('left-middle-tip') - g('left-wrist')) + np.linalg.norm(g('right-middle-tip') - g('right-wrist'))) / 2,
         'akromion_b': np.linalg.norm(g('left-acromion') - g('right-acromion')),
         'ht': -H[2], 'hoft_h': H[2] - C[:, 2].min(), 'H': top - C[:, 2].min(),
         'haka': chin, 'ogon': E[2], 'huvud_h': top - chin, 'huvud_b': head_width(0.01), 'huvud_b_over_oronen': head_width(0.035),
         'huvud_d': float(np.ptp(head[head[:, 2] > E[2]][:, 1])),
         'hals_omkr': min(level_round(z, 0.09)[0] for z in np.arange(0.03, chin - 0.01, 0.004))}
    m['brost_omkr'], m['brost_b'], m['brost_d'] = level_round(-0.14, 0.21)
    waist = min((level_round(z, 0.25) + (z,) for z in np.arange(H[2] + 0.10, H[2] + 0.255, 0.01)), key=lambda r: r[0])
    m['midja_omkr'], m['midja_b'], m['midja_d'], m['midja_under_axlarna'] = waist[0], waist[1], waist[2], -waist[3]
    m['hoft_omkr'], m['hoft_b'], m['hoft_d'] = level_round(H[2] - 0.04, 0.25)
    for side in ('left', 'right'):
        s, e, w = g(f'{side}-shoulder'), g(f'{side}-elbow'), g(f'{side}-wrist')
        m[f'ua_omkr_{side}'] = limb_round(s, e, 0.5)
        m[f'fa_omkr_{side}'] = max(limb_round(e, w, t) for t in (0.1, 0.15, 0.2, 0.25, 0.3))
        m[f'handled_omkr_{side}'] = limb_round(e, w, 0.97)
    for k in ('ua_omkr', 'fa_omkr', 'handled_omkr'):
        m[k] = (m.pop(f'{k}_left') + m.pop(f'{k}_right')) / 2
    fingers = {}
    for f in ('thumb', 'index', 'middle', 'ring', 'pinky'):
        chain = [[g(f'{side}-{f}-{j}') for j in ('third-joint', 'second-joint', 'first-joint', 'tip')] for side in ('left', 'right')]
        fingers[f] = float(np.mean([sum(np.linalg.norm(c[i + 1] - c[i]) for i in range(3)) for c in chain]))
    m['fingrar'] = fingers
    return {k: (float(v) if not isinstance(v, dict) else v) for k, v in m.items()}


def outline(picture, box, pixels, names, depth, f_px):
    """The person's outline (MediaPipe's mask) at heights given by the body's own points in the picture: widths in metres
    at the depth of the shoulders' middle."""
    import numpy as np
    import cv2
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions, vision
    models = os.path.join(HERE, '..', '..', 'blackjack-dealer', 'tools', 'python', 'models')
    img = cv2.imread(picture, cv2.IMREAD_COLOR)
    hgt, wid = img.shape[:2]
    x0, y0, x1, y1 = box
    pad = 0.08 * max(x1 - x0, y1 - y0)
    x0, y0, x1, y1 = int(max(0, x0 - pad)), int(max(0, y0 - pad)), int(min(wid, x1 + pad)), int(min(hgt, y1 + pad))
    part = img[y0:y1, x0:x1]
    scale = 1000 / part.shape[0]
    big = cv2.resize(part, (int(part.shape[1] * scale), 1000), interpolation=cv2.INTER_CUBIC)
    with vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(base_options=BaseOptions(model_asset_path=os.path.join(models, 'pose_landmarker_heavy.task')),
                                                                                num_poses=1, output_segmentation_masks=True)) as pl:
        r = pl.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(big, cv2.COLOR_BGR2RGB)))
    if not r.segmentation_masks:
        return None
    small = cv2.resize(r.segmentation_masks[0].numpy_view().astype(np.float32), (part.shape[1], part.shape[0]), interpolation=cv2.INTER_LINEAR) > 0.5
    mask = np.zeros((hgt, wid), np.uint8); mask[y0:y1, x0:x1] = small
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
    if n < 2:
        return None
    mask = lab == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    px = lambda n_: np.asarray(pixels[names.index(n_)])
    sh = (px('left-shoulder') + px('right-shoulder')) / 2; eyes = (px('left-eye') + px('right-eye')) / 2
    per_m = f_px / depth   # pixels per metre at the shoulders' depth

    def width(row):
        row = int(round(row))
        xs = np.nonzero(mask[row])[0] if 0 <= row < hgt else []
        return (xs.max() - xs.min() + 1) / per_m if len(xs) else None
    neck_rows = np.arange(int(eyes[1] + 0.07 * per_m), int(sh[1] - 0.01 * per_m))
    return {'huvud_vid_ogonen': width(eyes[1]), 'huvud_over_ogonen': width(eyes[1] - 0.05 * per_m),
            'hals': min((w for w in (width(r_) for r_ in neck_rows) if w), default=None),
            'axlar': max((w for w in (width(sh[1] + d * per_m) for d in np.arange(-0.03, 0.031, 0.005)) if w), default=None),
            'brost_med_armarna': width(sh[1] + 0.14 * per_m), 'over_bordskanten_med_armarna': width(sh[1] + 0.22 * per_m)}


def edge_away():
    """How far from the camera, along the floor, the felt's edge toward the dealer is (data/uppsattning.json: the trunk's
    middle and how far behind the edge it was taken)."""
    trunk = json.load(open(os.path.join(HERE, '..', 'data', 'uppsattning.json'), encoding='utf-8'))['dealer']['kameran']['trunk']
    return -trunk['shoulders_middle'][2] - trunk['behind_edge_assumed']


def read_side(listing, sam_dir, surface_dir, cam, with_outline=True):
    """Every picture of a list: SAM's joints scaled to the felt, the standing body's measures and the outline."""
    import numpy as np
    plan = json.load(open(listing, encoding='utf-8'))
    here = os.path.dirname(os.path.abspath(listing))
    sam = json.load(open(os.path.join(sam_dir, 'sam.json'), encoding='utf-8'))
    names = [n.lower().replace('_', '-') for n in sam['keypointNames']]
    by_picture = {p['picture']: p for p in sam['pictures']}
    out = []
    for entry in plan['pictures']:
        p = by_picture.get(entry['picture'])
        if not p:
            continue
        k, per_wrist = felt_scale(cam, p['keypoints'], names)
        z = np.load(os.path.join(surface_dir, os.path.splitext(entry['picture'])[0] + '.npz'))
        st = standing_measures(z['standing'].astype(np.float64) * k, z['standing_points'].astype(np.float64) * k, names, edges_of(z['faces']))
        kp = np.asarray(p['keypoints']) * k
        shoulders = (kp[names.index('left-shoulder')] + kp[names.index('right-shoulder')]) / 2
        yr = -math.sin(cam.roll) * shoulders[0] + math.cos(cam.roll) * shoulders[1]
        away, over = -yr * math.sin(cam.t) + shoulders[2] * math.cos(cam.t), cam.h - yr * math.cos(cam.t) - shoulders[2] * math.sin(cam.t)
        row = {'picture': entry['picture'], 't': entry['t'], 'docka': entry['docka'], 'skala': round(k, 4), 'skala_per_handled': per_wrist,
               'sam_avstand_m': round(float(np.linalg.norm(np.asarray(p['keypoints'])[names.index('neck')])), 3), 'axlarnas_djup_m': round(float(shoulders[2]), 4),
               'axlarna_bakom_kanten_m': round(float(away - edge_away()), 3), 'axlarna_over_filten_m': round(float(over), 3), 'staende': st}
        if with_outline:
            row['kontur'] = outline(os.path.join(here, entry.get('file', entry['picture'])), entry['box'], p['pixels'], names, float(shoulders[2]), sam['camera']['focalPx'])
        out.append(row)
    return out, names


def deals_sam():
    """What the lift's SAM reading (data/sam-prov/livebordet-sam.json, key frames of the deals) already says of the bones:
    per dealer the median over his frames as SAM gives it (its own distance), and the arms with the correction SAM needed
    on our own figure (sam-prov/jamforelse.json, benlangder_m.rattelse). The dealers change over at 474-500 s."""
    import numpy as np
    s = json.load(open(os.path.join(HERE, '..', 'data', 'sam-prov', 'livebordet-sam.json'), encoding='utf-8'))
    fix = json.load(open(os.path.join(HERE, '..', 'data', 'sam-prov', 'jamforelse.json'), encoding='utf-8'))['benlangder_m']['rattelse']
    names = [n.lower().replace('_', '-') for n in s['keypointNames']]
    out = {}
    for docka, frames in (('danilo', [p for p in s['pictures'] if p['t'] < 474]), ('frasse', [p for p in s['pictures'] if p['t'] > 500])):
        if not frames:
            continue
        P = np.array([p['keypoints'] for p in frames])
        d = lambda a, b: np.linalg.norm(P[:, names.index(a)] - P[:, names.index(b)], axis=1)
        both = lambda a, b: (d(f'left-{a}', f'left-{b}') + d(f'right-{a}', f'right-{b}')) / 2
        med = lambda v: round(float(np.median(v)), 4)
        out[docka] = {'rutor': len(frames), 'sw': med(d('left-shoulder', 'right-shoulder')), 'ua': med(both('shoulder', 'elbow')), 'fa': med(both('elbow', 'wrist')),
                      'hand': med(both('wrist', 'middle-tip')), 'ua_med_rattelsen': round(med(both('shoulder', 'elbow')) + fix['overarm'], 4),
                      'fa_med_rattelsen': round(med(both('elbow', 'wrist')) + fix['underarm'], 4),
                      'avstand_till_halsen_m': med(np.linalg.norm(P[:, names.index('neck')], axis=1))}
    return out


def matt(listing, sam_dir, surface_dir, doll_listing, doll_sam, doll_surface, reports, out_file):
    import numpy as np
    from stil import Camera
    cam = Camera(json.load(open(os.path.join(HERE, '..', 'data', 'scen.json'), encoding='utf-8'))['camera'])
    dealers, names = read_side(listing, sam_dir, surface_dir, cam)
    dolls, _ = read_side(doll_listing, doll_sam, doll_surface, cam)
    r4 = lambda v: None if v is None else round(float(v), 4)
    result = {'about': 'The two dealers\' bodies out of the live table\'s film (live-bj/verktyg/kroppen.py matt), numbers only. Metres. '
                       'For each dealer: idag is today\'s figure (bygg_docka.py\'s own measure of it), filmen the dealer, hur how it is measured and osaker '
                       'the uncertainty (±). passa is what bygg_docka.py --matt builds a trial figure with. Left and right are the dealer\'s own.',
              'metod': __doc__.split('How a body is measured (matt):')[1].strip(), 'givarnas_sam': deals_sam(), 'dockor': {}}
    ratio_keys = ('sw', 'ua', 'fa', 'hand', 'huvud_h', 'huvud_b', 'huvud_d', 'hals_omkr', 'brost_omkr', 'midja_omkr', 'hoft_omkr', 'ua_omkr', 'fa_omkr', 'handled_omkr', 'ht')
    diff_keys = ('haka', 'ogon')
    truths = {docka: json.load(open(os.path.join(reports, f'docka-rapport-{docka}.json'), encoding='utf-8'))['passat_blev'] for docka in {d['docka'] for d in dolls}}
    # SAM against the truth on our figures, both figures' frames together (they are one body with a few measures
    # changed, and SAM's scale through the felt wanders a few per cent from frame to frame): per measure a factor (or
    # for the chin and the eyes over the shoulders, a step), its mean and its spread
    calib = {}
    for key in ratio_keys + diff_keys:
        c = np.array([(truths[x['docka']][key] - x['staende'][key]) if key in diff_keys else truths[x['docka']][key] / x['staende'][key] for x in dolls])
        calib[key] = (float(np.mean(c)), float(np.std(c)))
    result['kalibrering'] = {k: {'medel': r4(v[0]), 'spridning': r4(v[1]), 'slag': 'steg (m)' if k in diff_keys else 'faktor'} for k, v in calib.items()}
    for docka in sorted({d['docka'] for d in dealers}):
        D = [d for d in dealers if d['docka'] == docka]
        F = [d for d in dolls if d['docka'] == docka]
        rep = truths[docka]
        rows = {}
        for key in ratio_keys + diff_keys:
            d = np.array([x['staende'][key] for x in D]); f = np.array([x['staende'][key] for x in F])
            mean, (c, c_spread) = float(np.mean(d)), calib[key]
            spread = float(np.ptp(d)) / 2 if len(d) > 1 else 0.0
            if key in diff_keys:
                value, how = mean + c, 'SAM on the dealer plus what SAM lacks on our figures'
                unsure = math.hypot(spread, c_spread)
            else:
                value, how = mean * c, 'SAM on the dealer times (the truth / SAM) on our figures'
                unsure = value * math.hypot(spread / mean, c_spread / c)
            rows[key] = {'idag': r4(rep.get(key)), 'filmen': r4(value), 'osaker': r4(unsure), 'sam_dealern': [r4(x) for x in d], 'sam_dockan': [r4(x) for x in f],
                         'sam_fel_pa_dockan': r4(float(np.mean(f)) - rep[key]), 'hur': how}
        for key in ('brost_b', 'brost_d', 'midja_b', 'midja_d', 'midja_under_axlarna', 'hoft_b', 'hoft_d', 'akromion_b', 'huvud_b_over_oronen', 'hoft_h', 'H'):
            d = np.array([x['staende'][key] for x in D]); f = np.array([x['staende'][key] for x in F])
            rows[key] = {'sam_dealern': r4(np.mean(d)), 'sam_dockan': r4(np.mean(f)), 'kvot': r4(np.mean(d) / np.mean(f))}
        rows['fingrar'] = {f_: {'sam_dealern': r4(np.mean([x['staende']['fingrar'][f_] for x in D])), 'sam_dockan': r4(np.mean([x['staende']['fingrar'][f_] for x in F]))}
                           for f_ in ('thumb', 'index', 'middle', 'ring', 'pinky')}
        contour = {}
        for key in ('huvud_vid_ogonen', 'huvud_over_ogonen', 'hals', 'axlar', 'brost_med_armarna', 'over_bordskanten_med_armarna'):
            d = [x['kontur'][key] for x in D if x.get('kontur') and x['kontur'][key]]; f = [x['kontur'][key] for x in F if x.get('kontur') and x['kontur'][key]]
            contour[key] = {'dealern': r4(np.mean(d)) if d else None, 'dockan': r4(np.mean(f)) if f else None, 'kvot': r4(np.mean(d) / np.mean(f)) if d and f else None}
        per_frame = ('t', 'skala', 'skala_per_handled', 'sam_avstand_m', 'axlarnas_djup_m', 'axlarna_bakom_kanten_m', 'axlarna_over_filten_m')
        result['dockor'][docka] = {'passa': {k: rows[k]['filmen'] for k in PASSA},
                                   'kalla': f'live-bj/data/kroppar.json (kroppen.py matt): SAM 3D Body på {len(D)} rutor i väntorna, skalad mot filten och '
                                            f'räknad mot samma läsning av dockan i samma väntor; {", ".join(PASSA)} ur filmen; höften, benen och bålens längd '
                                            'dolda bakom bordet: dockans',
                                   'rutor': [{k: x[k] for k in per_frame} for x in D], 'dockans_rutor': [{k: x[k] for k in per_frame} for x in F],
                                   'matt': rows, 'kontur': contour}
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    print('kalibrering', json.dumps({k: (v['medel'], v['spridning']) for k, v in result['kalibrering'].items()}))
    for docka, r in result['dockor'].items():
        print(docka, json.dumps({k: (v['idag'], v['filmen'], v['osaker']) for k, v in r['matt'].items() if 'filmen' in v}, ensure_ascii=False))
        print(' kontur', json.dumps({k: v['kvot'] for k, v in r['kontur'].items()}))
        print(' skala', [x['skala'] for x in r['rutor']], 'dockan', [x['skala'] for x in r['dockans_rutor']])
    print(out_file)


def main():
    args = sys.argv[1:]
    option = lambda name, default=None: args[args.index(name) + 1] if name in args else default
    plain = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or not args[i - 1].startswith('--'))]
    if not plain:
        sys.exit(__doc__)
    if plain[0] == 'rutor':
        return rutor(*plain[1:6], per=int(option('--per', '2')))
    if plain[0] == 'docka':
        return docka(*plain[1:4])
    if plain[0] == 'matt':
        return matt(*plain[1:9])
    sys.exit(__doc__)


if __name__ == '__main__':
    main()
