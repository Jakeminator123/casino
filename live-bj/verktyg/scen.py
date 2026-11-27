# Measures the fixed things of the live table and the camera that films it: the empty table, the felt's outline and the
# wooden rail, the shoe, the discard box, the cut card, the places where cards and bets lie, and from the resting cards
# (poker size, 63.5 x 88.9 mm) the camera's focal length, tilt, roll and height over the felt, with the mapping between
# the picture and the table's surface in metres.
#   python -I live-bj/verktyg/scen.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/data/scen.json [--givar live-bj/data/givar.json] [--ark live-bj/rutor/kontroll/kort-scen.jpg]
# Reads the film's keyframes only (one about every six seconds, through ffmpeg). Writes data/scen.json and the empty
# table pictures matt/bord-<era>.png that verktyg/kort.py subtracts (they show the film, so they stay in matt/, outside
# Git). --givar adds the card places from the landings kort.py found; --ark draws the fixed things over the empty table.
# All pixels are those of the table picture (data/kalla.json, crop); metres are on the felt: x to the picture's right,
# y away from the camera, the origin on the felt straight under the camera.
#
# The picture is now and then zoomed by the streamer by a few per cent about its middle; every frame is first brought
# back to the unzoomed picture (picture() below, used by kort.py too), measured on the page's flat colour beside it.
import sys, os, json, subprocess
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = np.array([39, 22, 19])           # the web page's flat colour beside the picture (BGR)
ERAS = [('A', 0.0, 485.0), ('B', 485.0, 1e9)]   # dealer A with red card backs, dealer B with blue; the discard box moves between them
CARD = (0.0635, 0.0889)                 # poker size; bridge is 0.057 x 0.089
BRIDGE = (0.057, 0.089)
SHARE = 0.15                            # the empty table: per pixel, the frame at this share of the brightness order

# Read by eye off the empty table pictures with a 10-pixel grid (the slask tool grid.py): the outlines of the things
# that do not move. Each is checked against every keyframe below.
FIXED = {
    'sko': {'about': 'the shoe: its foot on the felt (front corner by the dealer, front corner toward the players, back corner), the top of its back, and the tilted front plate where the next card shows',
            'foot': [[1207, 587], [1250, 620], [1449, 596]], 'back_top': [[1408, 483], [1461, 506]], 'front_plate': [[1241, 539], [1276, 533], [1250, 620], [1207, 587]],
            'outline': [[1207, 587], [1241, 539], [1408, 483], [1461, 506], [1449, 596], [1250, 620]],
            'mouth': [[1164, 599], [1191, 594], [1236, 626], [1209, 629]]},
    'slaskbox': {'about': 'the clear box for used cards, standing on the felt at the dealer\'s right: its outline and its foot on the felt',
                 'outline': [[315, 470], [349, 449], [404, 449], [418, 565], [395, 593], [332, 594]], 'foot': [[332, 594], [395, 593], [418, 565]]},
}
SEATS_UI = [[358, 722], [484, 797], [657, 843], [863, 858], [1070, 843], [1242, 797], [1368, 722]]   # the game's round seat and bet rings, seat 1 at the picture's left
TEMPLATES = {'sko': (1150, 470, 1480, 640), 'slaskbox': (290, 430, 440, 610), 'filt-text': (600, 590, 860, 700), 'rail-left': (170, 640, 330, 900), 'rail-right': (1420, 640, 1580, 900)}


def picture(full, crop):
    """The table picture of a full film frame, brought back to the unzoomed size when the streamer has zoomed: the zoom
    is about the picture's middle, and its size is read off where the page's flat colour ends left and right."""
    x, y, w, h = crop['x'], crop['y'], crop['width'], crop['height']
    # only the columns round the two edges, every tenth row: the zoom is at most a few per cent
    cols = np.r_[0:x + 120, x + w - 120:full.shape[1]]
    band = np.abs(full[300:900:10, cols].astype(np.int16) - PAGE).sum(axis=2)
    page = np.ones(full.shape[1], bool)
    page[cols] = (band < 14).mean(axis=0) > 0.9
    page[x + 120:x + w - 120] = False
    inside = np.where(~page[: x + w // 2])[0]
    left = int(inside.min()) if len(inside) else x
    right_part = np.where(~page[x + w // 2:])[0]
    right = x + w // 2 + int(right_part.max()) + 1 if len(right_part) else x + w
    width = right - left
    if abs(width - w) <= 5 and abs(left - x) <= 3:   # the edge columns are blended, so a few pixels either way are no zoom
        return full[y:y + h, x:x + w], 1.0
    s = width / w
    cx, cy = x + (w - 1) / 2, y + (h - 1) / 2
    M = np.array([[s, 0, cx - s * cx + x * s], [0, s, cy - s * cy + y * s]], np.float32)   # picture pixel -> film pixel
    return cv2.warpAffine(full, M, (w, h), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP), round(s, 4)


def era_of(t):
    return next(name for name, a, b in ERAS if a <= t < b)


# ---- the camera -------------------------------------------------------------------------------------------------------

def rotation(tilt, roll):
    """Rows: the camera's x (right), y (down) and z (forward) in table coordinates (x right, y away, z up)."""
    x = np.array([1.0, 0, 0])
    z = np.array([0, np.cos(tilt), -np.sin(tilt)])
    y = np.cross(z, x)
    c, s = np.cos(roll), np.sin(roll)
    return np.array([c * x + s * y, -s * x + c * y, z])


def project(P, cam):
    R = rotation(cam['tilt'], cam['roll'])
    Pc = (np.asarray(P, float) - [0, 0, cam['height']]) @ R.T
    return np.stack([cam['cx'] + cam['f'] * Pc[:, 0] / Pc[:, 2], cam['cy'] + cam['f'] * Pc[:, 1] / Pc[:, 2]], 1)


def homography(cam):
    """3x3 from felt metres (x, y, 1) to picture pixels."""
    R = rotation(cam['tilt'], cam['roll'])
    K = np.array([[cam['f'], 0, cam['cx']], [0, cam['f'], cam['cy']], [0, 0, 1]])
    t = -R @ np.array([0, 0, cam['height']])
    return K @ np.column_stack([R[:, 0], R[:, 1], t])


def to_felt(H, uv):
    p = cv2.perspectiveTransform(np.asarray(uv, np.float64).reshape(-1, 1, 2), np.linalg.inv(H)).reshape(-1, 2)
    return p


def to_pixels(H, xy):
    return cv2.perspectiveTransform(np.asarray(xy, np.float64).reshape(-1, 1, 2), H).reshape(-1, 2)


def card_corners(cards, w, l):
    """cards: n x 3 (x, y, turn); corners in the order the picture's quads are kept (see oriented())."""
    loc = np.array([[-w / 2, -l / 2], [w / 2, -l / 2], [w / 2, l / 2], [-w / 2, l / 2]])
    c, s = np.cos(cards[:, 2])[:, None], np.sin(cards[:, 2])[:, None]
    X = cards[:, :1] + loc[None, :, 0] * c - loc[None, :, 1] * s
    Y = cards[:, 1:2] + loc[None, :, 0] * s + loc[None, :, 1] * c
    return np.stack([X.ravel(), Y.ravel(), np.zeros(X.size)], 1)


def levenberg(p, fun, iters=80):
    lam, r = 1e-3, fun(p)
    J = None
    for _ in range(iters):
        J = np.empty((len(r), len(p)))
        for j in range(len(p)):
            d = 1e-6 * max(1.0, abs(p[j]))
            q = p.copy()
            q[j] += d
            J[:, j] = (fun(q) - r) / d
        A, g = J.T @ J, J.T @ r
        while True:
            step = np.linalg.solve(A + lam * np.diag(np.diag(A) + 1e-12), -g)
            r2 = fun(p + step)
            if r2 @ r2 < r @ r:
                p, r, lam = p + step, r2, lam * 0.3
                break
            lam *= 10
            if lam > 1e9:
                return p, r, J
        if np.abs(step).max() < 1e-10:
            break
    return p, r, J


def fit_camera(quads, size, free_width=False, cx=863.5, cy=485.5, start=None):
    """All cards lie on one plane and have one size: fits focal length, tilt, roll and height together with every card's
    place and turn on the felt, to the cards' corners in the picture. Cards that do not fit are dropped, a few at a time."""
    quads = [np.asarray(q, float) for q in quads]
    if start is None:   # a coarse search for focal length and tilt by how alike and how right-angled the cards come out
        best = None
        for f in np.arange(800, 3001, 100):
            for tilt in np.radians(np.arange(6, 60, 2.0)):
                cam = {'f': f, 'tilt': tilt, 'roll': 0.0, 'height': 1.0, 'cx': cx, 'cy': cy}
                H = homography(cam)
                errs, aspects = [], []
                for q in quads:
                    P = to_felt(H, q)
                    sides = [np.linalg.norm(P[(k + 1) % 4] - P[k]) for k in range(4)]
                    aspects.append(min(sides[0] + sides[2], sides[1] + sides[3]) / max(sides[0] + sides[2], sides[1] + sides[3]))
                    for k in range(4):
                        u, v = P[(k + 1) % 4] - P[k], P[k - 1] - P[k]
                        errs.append(np.dot(u, v) / np.linalg.norm(u) / np.linalg.norm(v))
                e = np.sqrt(np.mean(np.square(errs))) + np.std(aspects)
                if best is None or e < best[0]:
                    best = (e, f, tilt)
        start = {'f': best[1], 'tilt': best[2], 'roll': 0.0, 'height': 1.0}
        H = homography({**start, 'cx': cx, 'cy': cy})
        longs = []
        for q in quads:
            P = to_felt(H, q)
            longs.append(max(np.linalg.norm(P[1] - P[0]) + np.linalg.norm(P[3] - P[2]), np.linalg.norm(P[2] - P[1]) + np.linalg.norm(P[0] - P[3])) / 2)
        start['height'] = size[1] / np.median(longs)
    cam0 = {**start, 'cx': cx, 'cy': cy}
    H = homography(cam0)
    model_sign = np.sign(cv2.contourArea(card_corners(np.zeros((1, 3)), 1, 2)[:, :2].astype(np.float32), oriented=True))
    ordered, cards = [], []
    for q in quads:
        P = to_felt(H, q)
        if np.sign(cv2.contourArea(P.astype(np.float32), oriented=True)) != model_sign:
            q, P = q[::-1].copy(), P[::-1].copy()
        if np.linalg.norm(P[1] - P[0]) > np.linalg.norm(P[2] - P[1]):   # side 0-1 is the short side
            q, P = np.roll(q, -1, axis=0), np.roll(P, -1, axis=0)
        e = P[1] - P[0]
        ordered.append(q)
        cards.append([*P.mean(0), np.arctan2(e[1], e[0])])
    quads, cards = ordered, np.array(cards)
    p = np.concatenate([[cam0['f'], cam0['tilt'], cam0['roll'], cam0['height'], size[0]], cards.ravel()])
    keep_all = np.ones(len(quads), bool)
    dropped = []
    for _ in range(6):
        Q = np.vstack(quads)

        def residual(p):
            cam = {'f': p[0], 'tilt': p[1], 'roll': p[2], 'height': p[3], 'cx': cx, 'cy': cy}
            w = p[4] if free_width else size[0]
            return (project(card_corners(p[5:].reshape(-1, 3), w, size[1]), cam) - Q).ravel()
        p, r, J = levenberg(p, residual)
        per = np.sqrt((r.reshape(-1, 4, 2) ** 2).sum(2).mean(1))
        keep = per < max(2.5 * np.median(per), 1.0)
        if keep.all():
            break
        dropped += [np.asarray(q).mean(0).round(1).tolist() for q, k in zip(quads, keep) if not k]
        quads = [q for q, k in zip(quads, keep) if k]
        p = np.concatenate([p[:5], p[5:].reshape(-1, 3)[keep].ravel()])
    cols = [j for j in range(len(p)) if free_width or j != 4]
    Jc = J[:, cols]
    cov = np.linalg.inv(Jc.T @ Jc) * (r @ r) / max(1, len(r) - len(cols))
    sd = np.zeros(len(p))
    sd[cols] = np.sqrt(np.diag(cov))
    cam = {'f': p[0], 'tilt': p[1], 'roll': p[2], 'height': p[3], 'cx': cx, 'cy': cy}
    return {'camera': cam, 'width': p[4] if free_width else size[0], 'sd': {'f': sd[0], 'tilt': sd[1], 'roll': sd[2], 'height': sd[3], 'width': sd[4]},
            'rms': float(np.sqrt(np.mean(r ** 2))), 'cards': p[5:].reshape(-1, 3), 'quads': quads, 'dropped': dropped, 'perCard': per}


# ---- the film's keyframes ---------------------------------------------------------------------------------------------

def keyframes(film):
    """(seconds, full frame) for every keyframe, read through ffmpeg without decoding the frames between."""
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', film],
                         capture_output=True, text=True, stdin=subprocess.DEVNULL).stdout
    times = sorted(float(a) for a, b in (line.split(',')[:2] for line in out.split() if ',' in line) if 'K' in b)
    proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-skip_frame', 'nokey', '-i', film, '-an', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'],
                            stdout=subprocess.PIPE, stdin=subprocess.DEVNULL)
    size = 1920 * 1080 * 3
    for t in times:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        yield t, np.frombuffer(buf, np.uint8).reshape(1080, 1920, 3)
    proc.stdout.close()
    proc.wait()


def card_masks(pic, bg):
    """What differs from the empty table, and what is white like a card's face (shared with kort.py)."""
    hsv = cv2.cvtColor(pic, cv2.COLOR_BGR2HSV)
    diff = np.abs(pic.astype(np.int16) - bg.astype(np.int16)).sum(axis=2)
    white = (hsv[:, :, 1] < 60) & (hsv[:, :, 2] > 150)
    return diff, hsv, white


def edge_quad(gray, quad):
    """Moves a rough quad's four sides onto the strongest step in the picture, to a tenth of a pixel, and returns the
    corners where the sides meet (a card's rounded corners do not count)."""
    lines = []
    for k in range(4):
        a, b = quad[k], quad[(k + 1) % 4]
        d = (b - a) / np.linalg.norm(b - a)
        n = np.array([-d[1], d[0]])
        pts = []
        for s in np.linspace(0.2, 0.8, 15):
            p = a + (b - a) * s
            offs = np.arange(-6, 6.01, 0.5)
            xy = (p[None] + offs[:, None] * n[None]).astype(np.float32)
            prof = cv2.remap(gray, xy[:, 0].reshape(1, -1), xy[:, 1].reshape(1, -1), cv2.INTER_LINEAR).ravel()
            g = np.abs(np.gradient(prof))
            i = int(np.argmax(g))
            if i == 0 or i == len(g) - 1 or g[i] < 8:
                continue
            den = g[i - 1] - 2 * g[i] + g[i + 1]
            pts.append(p + (offs[i] + (0.5 * (g[i - 1] - g[i + 1]) / den if den else 0) * 0.5) * n)
        if len(pts) < 6:
            return None
        lines.append(cv2.fitLine(np.array(pts, np.float32), cv2.DIST_HUBER, 0, 0.01, 0.01).ravel())
    out = []
    for k in range(4):
        (ax, ay, ax0, ay0), (bx, by, bx0, by0) = lines[k - 1], lines[k]
        A = np.array([[ax, -bx], [ay, -by]])
        if abs(np.linalg.det(A)) < 1e-6:
            return None
        s = np.linalg.solve(A, [bx0 - ax0, by0 - ay0])[0]
        out.append([ax0 + s * ax, ay0 + s * ay])
    return np.array(out)


def lone_cards(pic, bg):
    """Cards lying alone and face up on the felt, as quads with sub-pixel corners: a blob that differs from the empty
    table, is mostly white, has four straight sides and nearly fills them."""
    diff, hsv, white = card_masks(pic, bg)
    fg = ((diff > 50) * 255).astype(np.uint8)
    fg[:560] = 0
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    found = []
    for c in cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0]:
        area = cv2.contourArea(c)
        if not 1200 <= area <= 9000:
            continue
        hull = cv2.convexHull(c)
        if area / cv2.contourArea(hull) < 0.94:
            continue
        m = np.zeros(fg.shape, np.uint8)
        cv2.drawContours(m, [c], -1, 1, -1)
        if white[m > 0].mean() < 0.45:
            continue
        approx = cv2.approxPolyDP(hull, 0.04 * cv2.arcLength(hull, True), True).reshape(-1, 2).astype(float)
        if len(approx) != 4:
            continue
        rough = outline_quad(c, approx)
        if rough is None or not 1.0 <= cv2.contourArea(rough.astype(np.float32)) / area <= 1.08:
            continue
        q = edge_quad(pic[:, :, 1].astype(np.float32), rough)
        if q is None or np.abs(q - rough).max() > 3:
            continue
        found.append(q)
    return found


def outline_quad(contour, approx):
    """Four corners from a blob's outline: a line through the middle of each side, the lines met (past the rounding)."""
    pts = contour.reshape(-1, 2).astype(np.float64)
    idx = sorted(int(np.argmin(((pts - q) ** 2).sum(1))) for q in approx)
    lines = []
    for k in range(4):
        a, b = idx[k], idx[(k + 1) % 4]
        seg = pts[a:b + 1] if a <= b else np.vstack([pts[a:], pts[:b + 1]])
        if len(seg) < 8:
            return None
        seg = seg[int(len(seg) * 0.2):int(len(seg) * 0.8) + 1]
        lines.append(cv2.fitLine(seg.astype(np.float32), cv2.DIST_HUBER, 0, 0.01, 0.01).ravel())
    out = []
    for k in range(4):
        (ax, ay, ax0, ay0), (bx, by, bx0, by0) = lines[k - 1], lines[k]
        A = np.array([[ax, -bx], [ay, -by]])
        if abs(np.linalg.det(A)) < 1e-6:
            return None
        s = np.linalg.solve(A, [bx0 - ax0, by0 - ay0])[0]
        out.append([ax0 + s * ax, ay0 + s * ay])
    return np.array(out)


def track(frames, bgs, name, box):
    """Where a fixed thing's patch of the empty table is found in each keyframe (normalised correlation, 25 px around)."""
    x0, y0, x1, y1 = box
    out = []
    for t, pic in frames:
        ref = bgs[era_of(t)]
        tpl = ref[y0:y1, x0:x1]
        m = 25
        area = pic[max(0, y0 - m):y1 + m, max(0, x0 - m):x1 + m]
        res = cv2.matchTemplate(area, tpl, cv2.TM_CCOEFF_NORMED)
        _, score, _, at = cv2.minMaxLoc(res)
        out.append({'t': round(t, 2), 'dx': at[0] - (x0 - max(0, x0 - m)), 'dy': at[1] - (y0 - max(0, y0 - m)), 'score': round(float(score), 3)})
    return out


def felt_outline(bg, H):
    """The felt's outline in the empty table: the large wine-red region under the dealer's edge."""
    hsv = cv2.cvtColor(bg, cv2.COLOR_BGR2HSV)
    # the felt is more saturated and lighter than the floor around the table; the beige rail lies between them
    felt = ((hsv[:, :, 0] >= 160) & (hsv[:, :, 1] > 185) & (hsv[:, :, 2] > 35)).astype(np.uint8)
    felt[:543] = 0
    felt = cv2.morphologyEx(felt, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(felt)
    m = ((lab == lab[780, 863]) * 255).astype(np.uint8)     # the part that holds the table's middle
    cs = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0]
    c = max(cs, key=cv2.contourArea)
    # The felt is convex (a rounded front and a straight dealer's edge): the printed text, the game's badges and the
    # shoe's shadow bite into the colour region, so the outline is its convex hull, and the edge points are those of
    # the colour region that lie on the hull.
    hull = cv2.convexHull(c)
    pts = c.reshape(-1, 2).astype(np.float64)
    on = np.array([cv2.pointPolygonTest(hull, (float(x), float(y)), True) for x, y in pts]) < 2.5   # inside counts positive
    m[:] = 0
    cv2.fillPoly(m, [hull], 255)
    return hull.reshape(-1, 2), pts[on]


def rail_outline(bg):
    """The wooden (padded) rail around the felt: the light beige band, as its outer and inner outline."""
    hsv = cv2.cvtColor(bg, cv2.COLOR_BGR2HSV)
    beige = ((hsv[:, :, 0] >= 5) & (hsv[:, :, 0] <= 25) & (hsv[:, :, 1] > 25) & (hsv[:, :, 1] < 140) & (hsv[:, :, 2] > 110)).astype(np.uint8)
    beige[:540] = 0
    beige = cv2.morphologyEx(beige, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(beige)
    big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return ((lab == big) * 255).astype(np.uint8)


CUT_ZONE = (300, 560, 520, 680)   # x0, y0, x1, y1: where the red cut card lies, before the discard box


def cut_card(pic, H):
    """The red cut card in its zone, as a quad (sub-pixel), its middle in metres and its sides in millimetres."""
    x0, y0, x1, y1 = CUT_ZONE
    hsv = cv2.cvtColor(pic[y0:y1, x0:x1], cv2.COLOR_BGR2HSV)
    red = (cv2.inRange(hsv, (0, 110, 110), (6, 255, 255)) | cv2.inRange(hsv, (168, 110, 110), (180, 255, 255)))
    red = cv2.morphologyEx(red, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    cs = [c for c in cv2.findContours(red, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0] if cv2.contourArea(c) > 600]
    if not cs:
        return None
    c = max(cs, key=cv2.contourArea)
    hull = cv2.convexHull(c)
    if cv2.contourArea(c) / cv2.contourArea(hull) < 0.9:
        return None
    approx = cv2.approxPolyDP(hull, 0.04 * cv2.arcLength(hull, True), True).reshape(-1, 2).astype(float)
    if len(approx) != 4:
        return None
    q = outline_quad(c, approx)
    if q is None:
        return None
    q = q + [x0, y0]
    m = to_felt(H, q)
    sides = sorted([np.linalg.norm(m[(k + 1) % 4] - m[k]) for k in range(4)])
    return {'quad': q.round(1).tolist(), 'm': m.mean(0).round(4).tolist(), 'shortMm': round(float(np.mean(sides[:2])) * 1000, 1), 'longMm': round(float(np.mean(sides[2:])) * 1000, 1)}


def felt_shape(H, hull, edge_px):
    """The felt in metres: the dealer's straight edge, and a circle through the rounded edge (fitted, what lies off
    dropped, fitted again: the game's badges and names nick the outline here and there)."""
    edge_m = to_felt(H, edge_px)
    top = edge_px[:, 1] < edge_px[:, 1].min() + 20
    edge_y = float(np.median(edge_m[top, 1]))
    hull_m = to_felt(H, hull.astype(float))
    arc = edge_m[(edge_m[:, 1] < edge_y - 0.05) & (edge_px[:, 1] < 960)]
    for _ in range(4):
        centre, radius, rms = circle_fit(arc)
        off = np.abs(np.linalg.norm(arc - centre, axis=1) - radius)
        arc = arc[off < max(0.01, 2.5 * np.median(off))]
    centre, radius, rms = circle_fit(arc)
    return {'edgeY': edge_y, 'centre': centre, 'radius': radius, 'rms': rms, 'hullM': hull_m, 'points': len(arc)}


def circle_fit(xy):
    A = np.column_stack([2 * xy[:, 0], 2 * xy[:, 1], np.ones(len(xy))])
    b = (xy ** 2).sum(1)
    (a, c, d), *_ = np.linalg.lstsq(A, b, rcond=None)
    r = np.sqrt(d + a * a + c * c)
    return np.array([a, c]), r, np.sqrt(np.mean((np.linalg.norm(xy - [a, c], axis=1) - r) ** 2))


def main():
    args = [a for a in sys.argv[1:]]
    option = lambda name: args[args.index(name) + 1] if name in args else None
    film, source_file, out = args[:3]
    source = json.load(open(source_file, encoding='utf-8'))
    crop, runs = source['crop'], source['runs']
    root = os.path.dirname(os.path.dirname(os.path.abspath(source_file)))
    matt = os.path.join(root, 'matt')
    os.makedirs(matt, exist_ok=True)

    frames, zooms = [], []
    for t, full in keyframes(film):
        if not any(r['from'] <= t <= r['to'] for r in runs):
            continue
        pic, s = picture(full, crop)
        frames.append((t, pic.copy()))
        zooms.append((round(t, 2), s))
    print(len(frames), 'keyframes in the clean stretches;', sum(1 for _, s in zooms if s != 1.0), 'zoomed', flush=True)

    # The empty table per era: per pixel, the frame at SHARE of the brightness order (cards, shirts and hands are brighter).
    bgs = {}
    for name, a, b in ERAS:
        stack = np.stack([p for t, p in frames if a <= t < b and dict(zooms)[round(t, 2)] == 1.0])
        lum = stack.astype(np.int16).sum(axis=3)
        k = max(1, int(len(stack) * SHARE))
        idx = np.argpartition(lum, k, axis=0)[k]
        bgs[name] = np.take_along_axis(stack, idx[None, :, :, None].repeat(3, axis=3), axis=0)[0]
        cv2.imwrite(os.path.join(matt, f'bord-{name}.png'), bgs[name])
        print('empty table', name, 'from', len(stack), 'keyframes', flush=True)

    # The camera, from the cards that lie alone and face up in the keyframes.
    quads = []
    for t, pic in frames:
        quads += lone_cards(pic, bgs[era_of(t)])
    fit = fit_camera(quads, CARD)
    fit_w = fit_camera(quads, CARD, free_width=True, start={k: fit['camera'][k] for k in ('f', 'tilt', 'roll', 'height')})
    fit_b = fit_camera(quads, BRIDGE, start={k: fit['camera'][k] for k in ('f', 'tilt', 'roll', 'height')})
    # How much the answer moves when the cards are drawn again with replacement (honest spread, not the formal one).
    rng = np.random.default_rng(1)
    boot = []
    for _ in range(30):
        pick = rng.integers(0, len(fit['quads']), len(fit['quads']))
        b = fit_camera([fit['quads'][i] for i in pick], CARD, start={k: fit['camera'][k] for k in ('f', 'tilt', 'roll', 'height')})
        boot.append([b['camera']['f'], np.degrees(b['camera']['tilt']), np.degrees(b['camera']['roll']), b['camera']['height']])
    boot = np.array(boot)
    cam = fit['camera']
    H = homography(cam)
    print(f"camera from {len(fit['quads'])} cards (dropped {len(fit['dropped'])}): f {cam['f']:.0f} px, tilt {np.degrees(cam['tilt']):.2f} deg, roll {np.degrees(cam['roll']):.2f}, height {cam['height']:.3f} m, rms {fit['rms']:.2f} px", flush=True)
    print(f"free card width {fit_w['width'] * 1000:.1f} mm (rms {fit_w['rms']:.2f}); bridge size rms {fit_b['rms']:.2f}", flush=True)

    # The things that should not move: where their patch is found in each keyframe.
    stays = {}
    for name, box in TEMPLATES.items():
        moves = track(frames, bgs, name, box)
        good = [m for m in moves if m['score'] > 0.6]
        off = [m for m in good if abs(m['dx']) > 2 or abs(m['dy']) > 2]
        stays[name] = {'box': list(box), 'keyframes': len(moves), 'matched': len(good), 'movedMoreThan2px': len(off),
                       'largestShift': max([max(abs(m['dx']), abs(m['dy'])) for m in good], default=None),
                       'whenMoved': [[m['t'], m['dx'], m['dy']] for m in off][:40]}
        # and between the eras: the first era's empty table searched in the last one's
        x0, y0, x1, y1 = box
        a, b = bgs[ERAS[0][0]], bgs[ERAS[-1][0]]
        res = cv2.matchTemplate(b[y0 - 25:y1 + 25, x0 - 25:x1 + 25], a[y0:y1, x0:x1], cv2.TM_CCOEFF_NORMED)
        _, sc, _, at = cv2.minMaxLoc(res)
        stays[name]['betweenEras'] = {'dx': at[0] - 25, 'dy': at[1] - 25, 'score': round(float(sc), 3)}
        print(name, 'matched', len(good), 'of', len(moves), 'moved', len(off), 'between eras', stays[name]['betweenEras'], flush=True)

    # The felt and the rail, in pixels and in metres.
    era0 = ERAS[-1][0]
    hull, edge_px = felt_outline(bgs[era0], H)
    simple = hull
    shape = felt_shape(H, hull, edge_px)
    edge_y, centre, radius, arc_rms, hull_m = shape['edgeY'], shape['centre'], shape['radius'], shape['rms'], shape['hullM']
    # The felt's rounded edge is a circle on the table only if the camera is right: a second, independent check of
    # the camera from the cards (and of the card size that set its scale).
    check = {'poker 63.5 mm (chosen)': shape['rms'],
             f"free width {fit_w['width'] * 1000:.1f} mm": felt_shape(homography(fit_w['camera']), hull, edge_px)['rms'],
             'bridge 57 mm': felt_shape(homography(fit_b['camera']), hull, edge_px)['rms']}
    print('felt edge as a circle, rms mm:', {k: round(v * 1000, 1) for k, v in check.items()}, flush=True)
    rail = rail_outline(bgs[era0])
    rail_c = max(cv2.findContours(rail, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea).reshape(-1, 2)

    def felt_point(uv):
        return [round(float(v), 4) for v in to_felt(H, [uv])[0]]

    def line_m(a, b):
        p = to_felt(H, [a, b])
        return round(float(np.linalg.norm(p[1] - p[0])), 3)

    things = {}
    for name, d in FIXED.items():
        e = {k: v for k, v in d.items()}
        e['footMetres'] = [felt_point(p) for p in d['foot']]
        things[name] = e
    things['sko']['footLength'] = line_m(*FIXED['sko']['foot'][1:3])
    things['sko']['footWidth'] = line_m(*FIXED['sko']['foot'][0:2])
    things['sko']['mouthMetres'] = [felt_point(p) for p in FIXED['sko']['mouth']]
    things['slaskbox']['footWidth'] = line_m(*FIXED['slaskbox']['foot'][0:2])
    things['slaskbox']['footDepth'] = line_m(*FIXED['slaskbox']['foot'][1:3])
    cuts = [(t, cut_card(pic, H)) for t, pic in frames]
    seen = [(t, c) for t, c in cuts if c]
    if seen:
        mid = np.median([c['m'] for _, c in seen], axis=0)
        still = [c for _, c in seen if np.linalg.norm(np.array(c['m']) - mid) < 0.01]
        things['skarkort'] = {'about': 'the red cut card, lying on the felt before the discard box when it is out of the shoe: seen in these keyframes',
                              'keyframesSeen': len(seen), 'keyframes': len(cuts), 'firstSeen': seen[0][0], 'lastSeen': seen[-1][0],
                              'outline': np.median([c['quad'] for c in still], axis=0).round(1).tolist(), 'm': mid.round(4).tolist(),
                              'sizeMm': [round(float(np.median([c['shortMm'] for c in still])), 1), round(float(np.median([c['longMm'] for c in still])), 1)],
                              'within1cm': len(still)}
        things['skarkort']['foot'] = things['skarkort']['outline']

    result = {
        'about': 'The fixed things of the live table and its camera, written by verktyg/scen.py from the keyframes of video/kalla.mp4. '
                 'Pixels are those of the table picture (data/kalla.json, crop), origin top left. Metres lie on the felt: x to the picture\'s right, '
                 'y away from the camera, origin on the felt straight under the camera; the camera stands at height metres over it. '
                 'feltToPixel is the 3x3 that takes (x, y, 1) in metres to pixels; its inverse goes back.',
        'picture': {'width': crop['width'], 'height': crop['height'], 'zoomedKeyframes': [[t, s] for t, s in zooms if s != 1.0]},
        'emptyTable': {name: {'from': a, 'to': min(b, 1040.0), 'file': f'matt/bord-{name}.png'} for name, a, b in ERAS},
        'camera': {
            'focalPx': round(cam['f'], 1), 'principalPoint': [cam['cx'], cam['cy']],
            'tiltDeg': round(float(np.degrees(cam['tilt'])), 2), 'rollDeg': round(float(np.degrees(cam['roll'])), 2), 'heightM': round(cam['height'], 4),
            'fovDeg': {'horizontal': round(float(np.degrees(2 * np.arctan(crop['width'] / 2 / cam['f']))), 1), 'vertical': round(float(np.degrees(2 * np.arctan(crop['height'] / 2 / cam['f']))), 1)},
            'spread': {'how': 'the fit repeated 30 times on the cards drawn again with replacement (bootstrap): standard deviation',
                       'focalPx': round(float(boot[:, 0].std()), 1), 'tiltDeg': round(float(boot[:, 1].std()), 3), 'rollDeg': round(float(boot[:, 2].std()), 3), 'heightM': round(float(boot[:, 3].std()), 4)},
            'cards': len(fit['quads']), 'droppedCards': fit['dropped'], 'rmsPx': round(fit['rms'], 3),
            'cardSize': {'poker 63.5 x 88.9 mm': round(fit['rms'], 3), 'bridge 57 x 89 mm': round(fit_b['rms'], 3),
                         'widthWhenFree mm': round(fit_w['width'] * 1000, 2), 'widthWhenFreeSd mm': round(fit_w['sd']['width'] * 1000, 2),
                         'focalWhenFreePx': round(fit_w['camera']['f'], 1), 'rmsWhenFree': round(fit_w['rms'], 3)},
            'feltToPixel': H.round(6).tolist(),
        },
        'table': {
            'about': 'the felt: a half circle with a straight dealer\'s edge; the shoe and the discard box stand on its two corners, so its width at the '
                     'dealer\'s edge is the circle\'s chord there. Measured on the empty table of the last era.',
            'feltOutlinePx': simple.tolist(),
            'feltOutlineM': hull_m.round(4).tolist(),
            'dealerEdgeM': round(edge_y, 4), 'feltFrontFromCameraM': round(float(centre[1] - radius), 3),
            'widthAtDealerEdgeM': round(float(2 * np.sqrt(max(0.0, radius ** 2 - (centre[1] - edge_y) ** 2))), 3),
            'depthM': round(float(edge_y - (centre[1] - radius)), 3),
            'arc': {'centreM': [round(float(v), 4) for v in centre], 'radiusM': round(float(radius), 4), 'rmsM': round(float(arc_rms), 4),
                    'centreBehindDealerEdgeM': round(float(centre[1] - edge_y), 4), 'points': shape['points'],
                    'rmsMmWithOtherCameras': {k: round(v * 1000, 2) for k, v in check.items()}},
            'cameraToDealerEdgeM': {'alongFelt': round(edge_y, 3), 'straight': round(float(np.hypot(edge_y, cam['height'])), 3)},
            'railOutlinePx': cv2.approxPolyDP(rail_c.reshape(-1, 1, 2).astype(np.int32), 2.0, True).reshape(-1, 2).tolist(),
            'railNote': 'the rail is raised over the felt, so its pixels are not mapped to metres',
        },
        'things': things,
        'seatsUiPx': SEATS_UI, 'seatsUiM': [felt_point(p) for p in SEATS_UI],
        'stays': stays,
    }
    if option('--givar'):
        result['places'] = places(json.load(open(option('--givar'), encoding='utf-8')))
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=1)
    print('wrote', out, flush=True)
    if option('--ark'):
        draw_sheet(bgs, result, option('--ark'))


def places(givar):
    """The card places: the landings of the dealt cards, gathered per place (kort.py names the place of each)."""
    by = {}
    for g in givar['cards']:
        if g.get('to') and g['to'].get('place'):
            by.setdefault(g['to']['place'], []).append(g['to'])
    out = {}
    for name, land in sorted(by.items()):
        px = np.array([l['px'] for l in land])
        m = np.array([l['m'] for l in land if l.get('m')])
        out[name] = {'landings': len(land), 'px': np.median(px, 0).round(1).tolist(), 'pxSpread': px.std(0).round(1).tolist(),
                     'm': np.median(m, 0).round(4).tolist() if len(m) else None, 'mSpread': m.std(0).round(4).tolist() if len(m) else None}
    return out


def draw_sheet(bgs, result, path):
    H = np.array(result['camera']['feltToPixel'])
    pic = bgs[ERAS[-1][0]].copy()
    cv2.polylines(pic, [np.array(result['table']['feltOutlinePx'], np.int32)], True, (0, 255, 255), 2, cv2.LINE_AA)
    cv2.polylines(pic, [np.array(result['table']['railOutlinePx'], np.int32)], True, (0, 160, 255), 1, cv2.LINE_AA)
    for name, d in result['things'].items():
        cv2.polylines(pic, [np.array(d['outline'], np.int32)], True, (255, 255, 0), 2, cv2.LINE_AA)
        cv2.polylines(pic, [np.array(d['foot'], np.int32)], False, (0, 255, 0), 2, cv2.LINE_AA)
        if 'mouth' in d:
            cv2.polylines(pic, [np.array(d['mouth'], np.int32)], True, (255, 0, 255), 2, cv2.LINE_AA)
    # a 10 cm grid on the felt
    for x in np.arange(-1.2, 1.21, 0.1):
        p = to_pixels(H, [[x, 0.9], [x, 2.6]])
        cv2.line(pic, tuple(np.int32(p[0])), tuple(np.int32(p[1])), (90, 90, 90), 1, cv2.LINE_AA)
    for y in np.arange(0.9, 2.61, 0.1):
        p = to_pixels(H, [[-1.2, y], [1.2, y]])
        cv2.line(pic, tuple(np.int32(p[0])), tuple(np.int32(p[1])), (90, 90, 90), 1, cv2.LINE_AA)
    arc = result['table']['arc']
    ang = np.linspace(0, 2 * np.pi, 200)
    circ = to_pixels(H, np.column_stack([arc['centreM'][0] + arc['radiusM'] * np.cos(ang), arc['centreM'][1] + arc['radiusM'] * np.sin(ang)]))
    ok = circ[:, 1] > 500
    for a, b in zip(circ[:-1][ok[:-1] & ok[1:]], circ[1:][ok[:-1] & ok[1:]]):
        cv2.line(pic, tuple(np.int32(a)), tuple(np.int32(b)), (255, 0, 0), 2, cv2.LINE_AA)
    for k, p in enumerate(result['seatsUiPx']):
        cv2.circle(pic, tuple(p), 6, (0, 0, 255), -1)
        cv2.putText(pic, str(k + 1), (p[0] + 8, p[1]), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
    for name, d in (result.get('places') or {}).items():
        p = tuple(int(v) for v in d['px'])
        cv2.drawMarker(pic, p, (255, 255, 255), cv2.MARKER_CROSS, 18, 2)
        cv2.putText(pic, name, (p[0] + 6, p[1] - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    cv2.imwrite(path, pic, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print('drew', path)


if __name__ == '__main__':
    main()
