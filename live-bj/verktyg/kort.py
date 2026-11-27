# Finds every playing card on the live table in every second frame of the clean stretches, with plain image analysis
# (no trained model): its four corners, its middle, the direction of its long side, face or back up, and whether it
# lies still or is on its way. Follows each card from when it leaves the shoe until it is collected.
#   python -I live-bj/verktyg/kort.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/data/scen.json live-bj/matt [--steg 2] [--del 0/3] [--bara 87.5]
#   python -I live-bj/verktyg/kort.py samla live-bj/matt live-bj/data/givar.json
#   python -I live-bj/verktyg/kort.py rita live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/data/scen.json live-bj/matt <ut.jpg> <sekund> [<sekund> ...]
# The first form writes matt/kort-<start>.json per stretch (same frames as verktyg/mat.py: f is the film frame, t the
# second); --del i/n lets n runs share the stretches, --bara takes one stretch by its start. samla gathers the dealt
# cards of all stretches into data/givar.json. rita draws what was found over the film's frames into one sheet (it
# shows the film, so it stays in rutor/, outside Git). Needs data/scen.json and the empty tables from verktyg/scen.py,
# and uses the dealer's arms from matt/rorelse-<start>.json (verktyg/mat.py) when they are there.
#
# How: the empty table is subtracted; what is left and is white (a face) or patterned red or blue (a back) is a card
# candidate. The camera is known (scen.json), so every card on the felt is one rectangle of 63.5 x 88.9 mm with a place
# and a turn: hypotheses are made at the right-angled corners of each blob's outline on the felt, kept when the
# rectangle is filled by card pixels, has felt outside at least two sides and a darker line along its edges (that is
# what parts cards lying edge to edge), and then held from frame to frame. A card that is lifted (in the dealer's hand)
# is no longer a rectangle on the felt; it shows as a loose blob of card colour near the hands (MediaPipe's hands from
# mat.py). Most cards go straight from the shoe into the hand, so leaving the shoe is read as card colour at the shoe's
# mouth, and each card that then shows up on the felt is paired with the latest such moment before it.
import sys, os, json, glob, math
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from scen import picture, to_felt, to_pixels, CARD, ERAS   # noqa: E402

ROI = (150, 535, 1620, 972)     # x0, y0, x1, y1 in the picture: the felt and the hands over it
W, L = CARD
INSET, BORDER, OUT = 0.006, 0.0025, 0.004   # metres: inside samples, the white border of a back, the outside samples
LOST_LINK = 1.6                 # seconds a card may be out of sight in the hand and still keep its id
MOUTH_PX = 250                  # card-coloured pixels at the shoe's mouth that mean a card is coming out
STILL_MM = 2.0                  # a card that moves less than this between frames lies still
GONE = 0.2                      # seconds a resting card may be missing (and not under a hand) before it counts as moved away


class Felt:
    def __init__(self, scen):
        self.H = np.array(scen['camera']['feltToPixel'])
        self.Hi = np.linalg.inv(self.H)
        self.edge = scen['table']['dealerEdgeM']
        self.arc = np.array(scen['table']['arc']['centreM'])
        self.seats = np.array(scen['seatsUiM'])
        self.mouth = np.array(scen['things']['sko']['mouth'], float)
        self.mouth_mid = self.mouth.mean(0)
        self.outline = np.array(scen['table']['feltOutlinePx'], np.float32).reshape(-1, 1, 2)

    def on_felt(self, xy):
        """Whether a point on the felt (metres) lies inside the felt's outline, at least 1 cm in."""
        uv = self.px([xy[:2]])[0]
        return cv2.pointPolygonTest(self.outline, (float(uv[0]), float(uv[1])), True) > 8

    def px(self, xy):
        return to_pixels(self.H, xy)

    def m(self, uv):
        return to_felt(self.H, uv)

    def quad(self, card):
        x, y, psi = card
        c, s = math.cos(psi), math.sin(psi)
        loc = np.array([[-W / 2, -L / 2], [W / 2, -L / 2], [W / 2, L / 2], [-W / 2, L / 2]])
        return loc @ np.array([[c, s], [-s, c]]) + [x, y]

    def place(self, xy):
        """dealer, or seat 1..7 (seat 1 at the picture's left), by the angle round the table's arc centre."""
        x, y = xy
        if self.edge - y < 0.30 and abs(x) < 0.35:
            return 'dealer'
        ang = lambda p: math.atan2(p[1] - self.arc[1], p[0] - self.arc[0])
        a = ang((x, y))
        k = int(np.argmin([abs(a - ang(s)) for s in self.seats]))
        return f'seat{k + 1}'


def _local_samples():
    """Sample points in a card's own frame (metres, x along the short side, y along the long side): 48 inside, and per
    side 8 just inside the edge (where a back has its white border) and 8 just outside it."""
    gx, gy = np.meshgrid(np.linspace(-W / 2 + INSET, W / 2 - INSET, 6), np.linspace(-L / 2 + INSET, L / 2 - INSET, 8))
    pts = [np.column_stack([gx.ravel(), gy.ravel()])]
    for k, (a, b) in enumerate([((-1, -1), (1, -1)), ((1, -1), (1, 1)), ((1, 1), (-1, 1)), ((-1, 1), (-1, -1))]):
        a, b = np.array(a) * [W / 2, L / 2], np.array(b) * [W / 2, L / 2]
        n = [np.array([0, -1]), np.array([1, 0]), np.array([0, 1]), np.array([-1, 0])][k]
        line = a + (b - a) * np.linspace(0.15, 0.85, 8)[:, None]
        pts.append(line - n * BORDER)
        pts.append(line + n * OUT)
        pts.append(line)
    return np.vstack(pts)


LOCAL = _local_samples()          # 48 inner, then side k: 8 in, 8 out, 8 on the edge (k = 0..3)


def look(mask, pts):
    """The mask's value at picture points (ROI coordinates); points outside count as 0. pts: (..., 2)."""
    p = np.round(pts).astype(np.int32)
    ok = (p[..., 0] >= 0) & (p[..., 1] >= 0) & (p[..., 0] < mask.shape[1]) & (p[..., 1] < mask.shape[0])
    v = np.zeros(p.shape[:-1], bool)
    v[ok] = mask[p[..., 1][ok], p[..., 0][ok]] > 0
    return v


class Frame:
    """The masks of one picture, in ROI coordinates."""
    def __init__(self, pic, bg, static, arms):
        x0, y0, x1, y1 = ROI
        roi, ref = pic[y0:y1, x0:x1], bg[y0:y1, x0:x1]
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        d = cv2.absdiff(roi, ref)
        diff = cv2.transform(d.astype(np.float32), np.ones((1, 3), np.float32))
        fg = (diff > 45) & ~static
        self.white = fg & (cv2.inRange(hsv, (0, 0, 141), (180, 69, 255)) > 0) & ~arms
        self.blue = fg & (cv2.inRange(hsv, (95, 41, 71), (135, 255, 255)) > 0)
        self.red = fg & (cv2.inRange(hsv, (166, 60, 121), (178, 255, 255)) > 0)   # the red back; skin lies at 179-20
        cardish = (self.white | self.blue | self.red).astype(np.uint8)
        cardish = cv2.morphologyEx(cardish, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        # fill the small holes (pips, letters) but not the inside of a ring (the game's bet rings are white rings)
        filled = cardish.copy()
        cs, hier = cv2.findContours(cardish, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hier is not None:
            for c, hh in zip(cs, hier[0]):
                if hh[3] >= 0 and cv2.contourArea(c) < 900:
                    cv2.drawContours(filled, [c], -1, 1, -1)
        self.card = filled
        self.fg = fg
        self.arms = arms
        self.gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        # one picture of bits for the scoring: 1 card, 2 white, 4 back pattern
        self.bits = (filled | (self.white.astype(np.uint8) << 1) | ((self.blue | self.red).astype(np.uint8) << 2)).astype(np.uint8)


def scores(felt, fr, cards):
    """How well cards on the felt at (x, y, turn) are borne out by the picture, many at once. Per card: the share of
    the inside that is card, white, or back pattern; per side the share just outside that is not card; and the share
    of the white border just inside the edge."""
    cards = np.asarray(cards, float).reshape(-1, 3)
    c, s = np.cos(cards[:, 2]), np.sin(cards[:, 2])
    X = cards[:, None, 0] + LOCAL[None, :, 0] * c[:, None] - LOCAL[None, :, 1] * s[:, None]
    Y = cards[:, None, 1] + LOCAL[None, :, 0] * s[:, None] + LOCAL[None, :, 1] * c[:, None]
    px = felt.px(np.stack([X.ravel(), Y.ravel()], 1)) - [ROI[0], ROI[1]]
    p = np.round(px).astype(np.int32)
    ok = (p[:, 0] >= 0) & (p[:, 1] >= 0) & (p[:, 0] < fr.bits.shape[1]) & (p[:, 1] < fr.bits.shape[0])
    b = np.zeros(len(p), np.uint8)
    b[ok] = fr.bits[p[ok, 1], p[ok, 0]]
    g = np.zeros(len(p), np.float32)
    g[ok] = fr.gray[p[ok, 1], p[ok, 0]]
    b = b.reshape(len(cards), -1)
    g = g.reshape(len(cards), -1)
    inner = b[:, :48]
    cover = (inner & 1).astype(bool).mean(1)
    white = (inner & 2).astype(bool).mean(1)
    back = (inner & 4).astype(bool).mean(1)
    sides = b[:, 48:].reshape(len(cards), 4, 3, 8)
    outside = 1 - (sides[:, :, 1] & 1).astype(bool).mean(2)            # n x 4
    border = (sides[:, :, 0] & 2).astype(bool).mean((1, 2))
    # an edge is darker than the card just inside it: the felt, or the thin shadow where two cards meet
    gs = g[:, 48:].reshape(len(cards), 4, 3, 8)
    edge = np.clip((gs[:, :, 0] - gs[:, :, 2]).mean(2) / 40.0, 0, 1)   # n x 4
    return cover, white, back, outside, border, edge


def accept_all(sc, strict=True):
    """Face up, face down, or None per card for scores()."""
    cover, white, back, outside, border, edge = sc
    good_sides = (outside > 0.6).sum(1)
    out = []
    for i in range(len(cover)):
        if cover[i] < (0.9 if strict else 0.7):
            out.append(None)
            continue
        face = 'up' if white[i] >= 0.45 else 'down' if back[i] >= 0.45 and border[i] >= 0.3 else None
        if strict and good_sides[i] < 2:
            face = None
        out.append(face)
    return out


def value(sc):
    cover, _, _, outside, _, edge = sc
    return cover * 2 + np.sort(outside, 1)[:, -2:].mean(1) + 0.25 * np.sort(outside, 1)[:, :2].mean(1) + 0.6 * edge.mean(1)


def best_near(felt, fr, card, reach_mm, turn_deg, steps):
    """The best pose for a card near where it was: a grid of shifts and turns, scored at once."""
    sh = np.linspace(-reach_mm, reach_mm, steps) / 1000
    tu = np.radians(np.linspace(-turn_deg, turn_deg, max(3, steps // 2 * 2 - 1)))
    dx, dy, da = np.meshgrid(sh, sh, tu, indexing='ij')
    cand = np.asarray(card, float) + np.stack([dx.ravel(), dy.ravel(), da.ravel()], 1)
    sc = scores(felt, fr, cand)
    i = int(np.argmax(value(sc)))
    return cand[i], tuple(v[i:i + 1] for v in sc)


def hypotheses(felt, contour):
    """Card rectangles at the right-angled corners of a blob's outline on the felt."""
    m = felt.m(contour.reshape(-1, 2).astype(float) + [ROI[0], ROI[1]])
    poly = cv2.approxPolyDP((m * 10000).astype(np.int32).reshape(-1, 1, 2), 30, True).reshape(-1, 2) / 10000.0   # 3 mm
    n = len(poly)
    if n < 3:
        return []
    area = cv2.contourArea((poly * 10000).astype(np.float32), oriented=True)
    out = []
    for i in range(n):
        v, a, b = poly[i], poly[i - 1], poly[(i + 1) % n]
        da, db = a - v, b - v
        la, lb = np.linalg.norm(da), np.linalg.norm(db)
        if la < 0.012 or lb < 0.012:
            continue
        ua, ub = da / la, db / lb
        cosang = float(np.dot(ua, ub))
        if abs(cosang) > 0.34:     # 90 +- 20 degrees
            continue
        cross = ua[0] * ub[1] - ua[1] * ub[0]
        if (cross > 0) == (area > 0):   # a concave corner
            continue
        # the two directions made exactly square, split evenly
        bis = (ua + ub) / np.linalg.norm(ua + ub)
        perp = np.array([-bis[1], bis[0]])
        d1 = (bis + perp * (1 if np.dot(perp, ua) > 0 else -1)) / math.sqrt(2)
        d2 = (bis - perp * (1 if np.dot(perp, ua) > 0 else -1)) / math.sqrt(2)
        for s1, s2 in ((W, L), (L, W)):
            mid = v + d1 * s1 / 2 + d2 * s2 / 2
            long_dir = d2 if s2 == L else d1
            psi = math.atan2(long_dir[1], long_dir[0]) - math.pi / 2   # the card's own y axis is its long side
            out.append(np.array([mid[0], mid[1], psi]))
    return out


def refine(felt, fr, card):
    """Small shifts and turns that put a card's sides on the outline of the card pixels: 3 mm and 3 degrees, then 1."""
    c1, _ = best_near(felt, fr, card, 3, 3, 5)
    return best_near(felt, fr, c1, 1, 1, 3)


def same(a, b, mm=20, deg=20):
    d = math.hypot(a[0] - b[0], a[1] - b[1]) * 1000
    t = abs((math.degrees(a[2] - b[2]) + 90) % 180 - 90)
    return d < mm and t < deg


def arm_mask(entry, shape):
    """The dealer's sleeves from MediaPipe's body (mat.py): upper arm and forearm, not the hand."""
    m = np.zeros(shape, np.uint8)
    if not entry or not entry.get('pose'):
        return m.astype(bool)
    p = entry['pose']['image']
    off = np.array([ROI[0], ROI[1]])
    for a, b, wid in ((11, 13, 0.55), (12, 14, 0.55), (13, 15, 0.5), (14, 16, 0.5)):
        A, B = np.array(p[a][:2]) - off, np.array(p[b][:2]) - off
        n = np.linalg.norm(B - A)
        if n < 1:
            continue
        t = int(max(12, wid * n))
        if b in (15, 16):              # over the cuff, not over the fingers that hold a card: the line's round
            B = A + (B - A) * (1.03 - t / 2 / n)   # end reaches t/2 past its end point
        cv2.line(m, tuple(np.int32(A)), tuple(np.int32(B)), 1, t)
    return m.astype(bool)


def measure(cap, source, scen, felt, bgs, statics, run, step, out, matt):
    fps, crop = source['fps'], source['crop']
    first, last = round(run['from'] * fps), round(run['to'] * fps)
    pose = {}
    rp = os.path.join(matt, f"rorelse-{run['from']:07.2f}.json")
    if os.path.exists(rp):
        pose = {e['f']: e for e in json.load(open(rp, encoding='utf-8'))['frames']}
    cap.set(cv2.CAP_PROP_POS_FRAMES, first)
    frames, cards, lost, next_id = [], {}, {}, [1]
    shape = (ROI[3] - ROI[1], ROI[2] - ROI[0])
    # the shoe's mouth and the exit plate before it, a little grown: a card pulled out shows here as card colour
    mouth = np.zeros(shape, np.uint8)
    cv2.fillPoly(mouth, [np.int32(felt.mouth - [ROI[0], ROI[1]])], 1)
    mouth = cv2.dilate(mouth, np.ones((31, 31), np.uint8)).astype(bool) & ~statics[ERAS[0][0]]

    def new_card(xy, t, face, kind):
        cid = next_id[0]
        next_id[0] += 1
        cards[cid] = {'id': cid, 'pose': np.array(xy, float), 'face': face, 'first': t, 'last': t, 'seen': t, 'still': 0, 'path': [], 'faces': [],
                      'rest': None, 'from': None, 'gone': None, 'kind': kind}
        return cid

    for index in range(first, last + 1):
        ok, full = cap.read()
        if not ok:
            break
        if (index - first) % step:
            continue
        t = round(index / fps, 3)
        pic, zoom = picture(full, crop)
        era = next(name for name, a, b in ERAS if a <= t < b)
        fr = Frame(pic, bgs[era], statics[era], arm_mask(pose.get(index), shape))
        hp = (pose.get(index) or {}).get('hands') or {}
        hands = np.array([q[:2] for h in hp.values() for q in h['image']]) if hp else []
        entry = {'f': index, 't': t, 'cards': [], 'loose': []}
        if zoom != 1.0:
            entry['zoom'] = zoom
        at_mouth = int((fr.white & mouth).sum()), int(((fr.blue | fr.red) & mouth).sum())
        if sum(at_mouth) > 0:
            entry['mouth'] = list(at_mouth)     # pixels of face white and of back pattern at the shoe's mouth
        explained = np.zeros(shape, np.uint8)
        seen_now = set()
        off = np.array([ROI[0], ROI[1]])
        # 1. the cards known from before: still there, moved, hidden under a hand, or gone
        live = [cid for cid, c in cards.items() if c['gone'] is None]
        if live:
            sc_all = scores(felt, fr, [cards[cid]['pose'] for cid in live])
            faces_now = accept_all(sc_all, strict=False)
        for k, cid in enumerate(live):
            c = cards[cid]
            face = faces_now[k]
            good = face is not None and sc_all[0][k] >= 0.95 and (sc_all[3][k] > 0.7).sum() >= 2
            if good and c['still'] >= 3 and len(frames) % 5:
                r = c['pose']                      # lies still and fits: no search this frame
            elif face is not None:
                r, sc = refine(felt, fr, c['pose'])
                face = accept_all(sc, strict=False)[0] or face
            else:
                # not where it was: pushed along the felt? look further round it
                r, sc = best_near(felt, fr, c['pose'], 24, 12, 9)
                face = accept_all(sc, strict=False)[0]
                if face is not None:
                    r, sc = refine(felt, fr, r)
                    face = accept_all(sc, strict=False)[0] or face
            if face is not None:
                moved = math.hypot(*(r[:2] - c['pose'][:2])) * 1000
                c['pose'] = np.array(r, float)
                c['still'] = c['still'] + 1 if moved < STILL_MM else 0
                c['face'] = face
                c['last'] = t
                seen_now.add(cid)
                q = felt.px(felt.quad(r)) - off
                cv2.fillConvexPoly(explained, np.int32(np.round(q)), 1)
                continue
            # hidden by a hand? then the felt there is not card, but not empty felt either
            q = felt.px(felt.quad(c['pose'])) - off
            covered = look(fr.fg, q.mean(0, keepdims=True))[0] or fr.arms[np.clip(int(q[:, 1].mean()), 0, shape[0] - 1), np.clip(int(q[:, 0].mean()), 0, shape[1] - 1)]
            if c['rest'] is not None and covered and sc_all[0][k] > 0.2 and t - c['last'] < 3.0:
                cv2.fillConvexPoly(explained, np.int32(np.round(q)), 1)
                continue
            if t - c['last'] >= (GONE if c['rest'] is not None else 0.1):
                lost[cid] = (t, c['rest'] is not None)   # lifted, or pushed: may come back in the next seconds
                c['gone'] = t
        # two live cards on one spot are one card: the younger goes
        live = sorted(cid for cid in seen_now)
        for i, a in enumerate(live):
            for b in live[i + 1:]:
                if b in seen_now and a in seen_now and (same(cards[a]['pose'], cards[b]['pose'], 20, 20)
                                                        or math.hypot(*(cards[a]['pose'][:2] - cards[b]['pose'][:2])) < 0.015):
                    seen_now.discard(b)
                    cards[b]['gone'] = t
                    cards[b]['dropped'] = True
        # 2. new rectangles in what is not yet explained
        rest = (fr.card & (1 - cv2.dilate(explained, np.ones((5, 5), np.uint8)))).astype(np.uint8)
        found = []
        for cont in cv2.findContours(rest, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0]:
            if cv2.contourArea(cont) < 350:
                continue
            hyps = []
            hs = hypotheses(felt, cont)
            if hs:
                sc = scores(felt, fr, hs)
                vals = value(sc)
                for hcard, face, v in zip(hs, accept_all(sc), vals):
                    if face:
                        hyps.append((v, hcard, face))
            hyps.sort(key=lambda h: -h[0])
            kept = []
            for v, hcard, face in hyps:
                if any(same(hcard, k[1], 12, 12) for k in kept):
                    continue
                kept.append((v, hcard, face))
            bx, by, bw, bh = cv2.boundingRect(cont)
            for v, hcard, face in kept[:6]:
                r, _ = refine(felt, fr, hcard)
                if not felt.on_felt(r):
                    continue
                q = felt.px(felt.quad(r)) - [ROI[0], ROI[1]]
                qx, qy, qw, qh = cv2.boundingRect(np.int32(np.round(q)))
                qx, qy = max(qx, 0), max(qy, 0)
                m = np.zeros((qh + 2, qw + 2), np.uint8)
                cv2.fillConvexPoly(m, np.int32(np.round(q - [qx, qy])), 1)
                m = m[:max(0, min(qh + 2, shape[0] - qy)), :max(0, min(qw + 2, shape[1] - qx))]
                win = (slice(qy, qy + m.shape[0]), slice(qx, qx + m.shape[1]))
                fresh = int((m & rest[win] & (1 - explained[win])).sum())
                if fresh < 0.25 * max(1, int(m.sum())):
                    continue
                explained[win] |= m
                found.append((r, face))
            # what is card-coloured here but no rectangle: a card in the hand, or a card seen edge-on while it turns
            win = (slice(by, by + bh), slice(bx, bx + bw))
            left = np.zeros((bh, bw), np.uint8)
            cv2.drawContours(left, [cont - [bx, by]], -1, 1, -1)
            left &= rest[win] & (1 - explained[win])
            area = int(left.sum())
            if area > 350:
                ys, xs = np.nonzero(left)
                wf = fr.white[win][ys, xs].mean()
                bf = (fr.blue[win][ys, xs] | fr.red[win][ys, xs]).mean()
                mid = np.array([xs.mean() + bx + ROI[0], ys.mean() + by + ROI[1]])
                by_hand = len(hands) == 0 or np.linalg.norm(hands - mid, axis=1).min() < 90
                if (wf > 0.5 or fr.blue[win][ys, xs].mean() > 0.4) and by_hand:
                    rect = cv2.minAreaRect(np.column_stack([xs, ys]).astype(np.float32))
                    entry['loose'].append({'mid': [round(float(mid[0]), 1), round(float(mid[1]), 1)], 'area': area,
                                           'face': 'up' if wf > bf else 'down', 'box': [round(rect[1][0], 1), round(rect[1][1], 1), round(rect[2], 1)]})
        # 3. a new rectangle is a card seen again (lifted a moment ago) or a new card
        for r, face in found:
            match = None
            here = felt.px([r[:2]])[0]
            if any(same(r, cards[cid]['pose'], 30, 30) for cid in seen_now):
                continue                              # a card already accounted for this frame
            for cid, c in cards.items():
                if c['gone'] is None and cid not in seen_now and same(r, c['pose'], 30, 30):
                    match = cid
            near_shoe = np.linalg.norm(here - felt.mouth_mid) < 110
            if match is None:
                # a card pushed along the felt (close by), or lifted a moment ago and put down again (further off);
                # a fresh card back up at the shoe's mouth is a new card unless the lifted one was right there
                def reach(cid):
                    if near_shoe and face == 'down':
                        return 60
                    return 90 if lost[cid][1] else 500
                dist = {cid: np.linalg.norm(np.array(cards[cid]['path'][-1][1:3]) - here) for cid in lost if cards[cid]['path']}
                recent = [cid for cid in dist if t - lost[cid][0] < LOST_LINK and dist[cid] < reach(cid)]
                if recent:
                    pushed = [cid for cid in recent if lost[cid][1]]
                    match = min(pushed, key=lambda cid: dist[cid]) if pushed else max(recent, key=lambda cid: lost[cid][0])
                    del lost[match]
                    cards[match]['gone'] = None
            if match is None:
                match = new_card(r, t, face, 'card')
                cards[match]['from'] = 'sko' if (near_shoe and face == 'down') else None
            c = cards[match]
            c['pose'], c['face'], c['last'] = r, face, t
            seen_now.add(match)
        # 4. bookkeeping: each card's path, faces, and its first rest
        for cid in seen_now:
            c = cards[cid]
            q = felt.px(felt.quad(c['pose']))
            mid = q.mean(0)
            long_px = (q[2] + q[3]) / 2 - (q[0] + q[1]) / 2
            still = c['still'] >= 3
            entry['cards'].append({'id': cid, 'corners': q.round(1).tolist(), 'mid': mid.round(1).tolist(), 'm': [round(float(v), 4) for v in c['pose'][:2]],
                                   'dir': round(math.degrees(math.atan2(long_px[1], long_px[0])), 1), 'turnM': round(math.degrees(c['pose'][2]) % 180, 1),
                                   'face': c['face'], 'state': 'still' if still else 'moving'})
            c['path'].append([t, round(float(mid[0]), 1), round(float(mid[1]), 1), c['face'][0]])
            c['faces'].append((t, c['face']))
            if still and c['rest'] is None and c['still'] >= int(0.4 * fps / step):
                c['rest'] = {'t': round(t - c['still'] * step / fps, 3), 'px': mid.round(1).tolist(), 'm': [round(float(v), 4) for v in c['pose'][:2]],
                             'place': felt.place(c['pose'][:2]), 'face': c['face']}
        # loose blobs near a lifted card carry its path while it is in the hand
        for cid, (when, rested) in list(lost.items()):
            if t - when >= LOST_LINK:
                del lost[cid]
                continue
            c = cards[cid]
            if not c['path'] or rested:
                continue
            last = np.array(c['path'][-1][1:3])
            near = [l for l in entry['loose'] if np.linalg.norm(np.array(l['mid']) - last) < 160]
            if near:
                l = min(near, key=lambda l: np.linalg.norm(np.array(l['mid']) - last))
                l['id'] = cid
                c['path'].append([t, l['mid'][0], l['mid'][1], l['face'][0] + '?'])
                c['faces'].append((t, l['face']))
        frames.append(entry)

    # A card that left the shoe and was lost in the hand, and a card that showed up elsewhere soon after without a
    # past, are one card: the shoe's cards are paired with such newcomers in turn (the dealer deals one at a time).
    rename = {}
    newcomers = sorted((c for c in cards.values() if c['from'] is None and not c.get('dropped') and c['rest'] is not None), key=lambda c: c['first'])
    for d in sorted((c for c in cards.values() if c['from'] == 'sko' and c['rest'] is None and not c.get('dropped')), key=lambda c: c['first']):
        for n in newcomers:
            if n['id'] in rename or n['first'] <= d['first'] or n['first'] - d['last'] > LOST_LINK + 1.0:
                continue
            if n['path'] and n['path'][0][0] <= d['last']:
                continue
            rename[n['id']] = d['id']
            d['path'] += n['path']
            d['faces'] += n['faces']
            d['rest'], d['last'], d['gone'] = n['rest'], n['last'], n['gone']
            n['mergedInto'] = d['id']
            break
    for e in frames:
        for c in e['cards'] + e['loose']:
            if c.get('id') in rename:
                c['id'] = rename[c['id']]
    # Most cards are lifted straight out of the shoe and are no rectangle on the felt until they land. What shows is
    # card colour at the shoe's mouth: each such moment is a card leaving, and each card that shows up on the felt
    # without a past is paired with the latest one before it (the dealer deals one card at a time).
    events, cur = [], None
    # what shows there all the time (the next card's back in the shoe's window) is the stretch's median
    base = np.median(np.array([e.get('mouth', [0, 0]) for e in frames] or [[0, 0]]), axis=0)
    for e in frames:
        w, b = np.maximum(np.array(e.get('mouth', [0, 0])) - base, 0)
        if w + b >= MOUTH_PX:
            if cur and e['t'] - cur['end'] <= 0.2:
                cur['end'], cur['w'], cur['b'] = e['t'], cur['w'] + w, cur['b'] + b
            else:
                cur = {'start': e['t'], 'end': e['t'], 'w': w, 'b': b, 'used': False}
                events.append(cur)
    for c in sorted((c for c in cards.values() if c['rest'] is not None and not c.get('dropped') and not c.get('mergedInto')), key=lambda c: c['first']):
        if c['from'] == 'sko':
            c['left'] = c['first']
            continue
        cand = [ev for ev in events if not ev['used'] and c['first'] - 3.0 <= ev['end'] <= c['first'] + 0.1]
        if not cand:
            continue
        ev = cand[-1]
        ev['used'] = True
        c['from'], c['left'], c['atMouth'] = 'sko', ev['end'], ev['start']
        back = ev['b'] / max(1, ev['w'] + ev['b']) > 0.3
        c['faces'] = [(ev['end'], 'down' if back else 'up')] + c['faces']
        # its way through the air: the loose blobs between the mouth and where it showed up, nearest first
        last = felt.mouth_mid
        hand_path = []
        for e in frames:
            if ev['end'] < e['t'] < c['first'] and e['loose']:
                l = min(e['loose'], key=lambda l: np.linalg.norm(np.array(l['mid']) - last))
                if np.linalg.norm(np.array(l['mid']) - last) < 200 and 'id' not in l:
                    l['id'] = c['id']
                    hand_path.append([e['t'], l['mid'][0], l['mid'][1], l['face'][0] + '?'])
                    c['faces'].append((e['t'], l['face']))
                    last = np.array(l['mid'])
        c['path'] = [[ev['end'], round(float(felt.mouth_mid[0]), 1), round(float(felt.mouth_mid[1]), 1), 'd' if back else 'u']] + hand_path + c['path']
    out_cards = []
    for cid, c in sorted(cards.items()):
        if c.get('mergedInto'):
            continue
        faces = c['faces']
        backs = [tt for tt, f in faces if f == 'down']
        ups = [tt for tt, f in faces if f == 'up']
        turned = bool(backs and ups and min(ups) > min(backs))
        rec = {'id': cid, 'first': c['first'], 'last': c['last'], 'from': c['from'], 'left': c.get('left'), 'atMouth': c.get('atMouth'),
               'firstFace': faces[0][1] if faces else None, 'rest': c['rest'], 'turned': turned, 'collected': c['gone'], 'path': c['path']}
        if c.get('dropped'):
            rec['duplicate'] = True     # was the same card as an older id on the same spot
        if turned:
            last_back = max(tt for tt in backs if tt < min(tt2 for tt2 in ups if tt2 > min(backs)))
            first_up = min(tt for tt in ups if tt > last_back)
            rec['seenBackThenUp'] = [last_back, first_up]
        out_cards.append(rec)
    name = os.path.join(out, f"kort-{run['from']:07.2f}.json")
    with open(name, 'w', encoding='utf-8') as f:
        json.dump({'about': 'Playing cards found by verktyg/kort.py in every second frame. Pixels are those of the table picture (data/kalla.json, crop); m is metres on the felt '
                            '(data/scen.json). Per frame: cards with id, corners (four, in order round the card), mid, dir (the long side\'s direction in the picture, degrees), '
                            'turnM (the long side on the felt, degrees), face up or down, state still or moving; loose: card-coloured blobs that are no rectangle on the felt '
                            '(a card in the hand, or turning), with the id of the card they are taken for. cards: per id the path [t, x, y, face] (a ? marks a loose blob), '
                            'where it came from, where it first lay still (rest), whether it was turned face up on the way and between which seconds, and when it was collected.',
                   'from': run['from'], 'to': run['to'], 'fps': fps / step, 'width': crop['width'], 'height': crop['height'], 'frames': frames, 'cards': out_cards},
                  f, separators=(',', ':'))
    seen = sum(1 for e in frames if e['cards'])
    print(f"{run['from']:8.2f}-{run['to']:8.2f}: {len(frames)} frames, {len(out_cards)} card ids, frames with a card {seen}, from the shoe {sum(1 for c in out_cards if c['from'])}, "
          f"came to rest {sum(1 for c in out_cards if c['rest'])}, turned {sum(1 for c in out_cards if c['turned'])}", flush=True)


def statics_for(scen, bgs):
    """What is never a loose card: the shoe (all but its mouth) and the discard box, grown a little."""
    out = {}
    shape = (ROI[3] - ROI[1], ROI[2] - ROI[0])
    off = np.array([ROI[0], ROI[1]])
    for name in bgs:
        m = np.zeros(shape, np.uint8)
        for thing in ('sko', 'slaskbox'):
            cv2.fillPoly(m, [np.int32(np.array(scen['things'][thing]['outline']) - off)], 1)
        m = cv2.dilate(m, np.ones((15, 15), np.uint8))
        mouth = np.zeros(shape, np.uint8)
        cv2.fillPoly(mouth, [np.int32(np.array(scen['things']['sko']['mouth']) - off)], 1)
        out[name] = (m & (1 - mouth)).astype(bool)
    return out


def load(scen_file, source_file):
    scen = json.load(open(scen_file, encoding='utf-8'))
    root = os.path.dirname(os.path.dirname(os.path.abspath(scen_file)))
    bgs = {name: cv2.imread(os.path.join(root, d['file'])) for name, d in scen['emptyTable'].items()}
    return scen, Felt(scen), bgs, statics_for(scen, bgs)


def main_measure(args):
    film, source_file, scen_file, out = args[:4]
    rest = args[4:]
    option = lambda name, default: rest[rest.index(name) + 1] if name in rest else default
    step = int(option('--steg', '2'))
    part, parts = [int(v) for v in option('--del', '0/1').split('/')]
    only = option('--bara', None)
    source = json.load(open(source_file, encoding='utf-8'))
    scen, felt, bgs, statics = load(scen_file, source_file)
    os.makedirs(out, exist_ok=True)
    runs = sorted(source['runs'], key=lambda r: r['from'] - r['to'])
    cap = cv2.VideoCapture(film)
    for n, run in enumerate(runs):
        if only is not None and abs(run['from'] - float(only)) > 0.01:
            continue
        if only is None and n % parts != part:
            continue
        measure(cap, source, scen, felt, bgs, statics, run, step, out, out)
    cap.release()


def main_collect(args):
    matt, out = args[:2]
    dealt, counts = [], {'stretches': 0, 'frames': 0, 'framesWithCard': 0, 'ids': 0}
    for name in sorted(glob.glob(os.path.join(matt, 'kort-*.json'))):
        d = json.load(open(name, encoding='utf-8'))
        counts['stretches'] += 1
        counts['frames'] += len(d['frames'])
        counts['framesWithCard'] += sum(1 for e in d['frames'] if e['cards'])
        counts['ids'] += len(d['cards'])
        kept = []
        for c in sorted(d['cards'], key=lambda c: c['first']):
            if not c['rest'] or c.get('duplicate'):
                continue
            # one card taken twice: a second id whose resting place is within 15 mm of one still lying there
            if any(math.dist(k['rest']['m'], c['rest']['m']) < 0.015 and (k['collected'] is None or k['collected'] > c['rest']['t']) for k in kept):
                counts['twiceTaken'] = counts.get('twiceTaken', 0) + 1
                continue
            kept.append(c)
        for c in kept:
            left = c.get('left')
            dealt.append({'stretch': d['from'], 'id': c['id'], 'from': c['from'] or 'unseen', 'left': left, 'landed': c['rest']['t'],
                          'duration': round(c['rest']['t'] - left, 3) if left is not None else None,
                          'to': {'place': c['rest']['place'], 'px': c['rest']['px'], 'm': c['rest']['m']}, 'face': c['rest']['face'],
                          'turned': c['turned'], 'seenBackThenUp': c.get('seenBackThenUp', c.get('turnWindow')), 'collected': c['collected'],
                          'alreadyThere': c['first'] - d['from'] < 0.1})
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'about': 'Every card verktyg/kort.py saw come to rest on the table, per stretch (its start in seconds) and id. from is sko when the card was seen '
                            'leaving the shoe\'s mouth (as a card on the felt, or as card colour at the mouth in the 3 s before it showed up), unseen when not. left '
                            'and landed are seconds of the film (left: the card is out of the mouth; landed: it first lies still); duration is landed - left. to is '
                            'where it first lay still (place: dealer or seat 1-7, seat 1 at the picture\'s left; px in the table picture, m on the felt). turned is '
                            'true when it was seen back up first (at the mouth or on the felt) and face up later; seenBackThenUp the second it was last seen back up and the second it was '
                            'first seen face up: the turn lies between, hidden by the hand and the blur, and the second sighting is often the card already lying on its place (in kameran-mitten-plats-4 the face shows 5 frames before it). collected is when it was taken away (null when the stretch ended first). Stretches the cards were already lying '
                            'in when they began give cards that landed at the stretch\'s first second without a left.',
                   'counts': counts, 'cards': dealt}, f, indent=1)
    new = [g for g in dealt if not g['alreadyThere']]
    print(out, len(dealt), 'cards that came to rest,', len(new), 'of them landed inside a stretch;', sum(1 for g in new if g['from'] == 'sko'), 'seen leaving the shoe;',
          sum(1 for g in new if g['turned']), 'turned;', counts)


def main_draw(args):
    film, source_file, scen_file, matt, out = args[:5]
    seconds = [float(s) for s in args[5:]]
    source = json.load(open(source_file, encoding='utf-8'))
    scen = json.load(open(scen_file, encoding='utf-8'))
    files = [json.load(open(f, encoding='utf-8')) for f in sorted(glob.glob(os.path.join(matt, 'kort-*.json')))]
    cap = cv2.VideoCapture(film)
    tiles = []
    for s in seconds:
        data = next((d for d in files if d['from'] <= s <= d['to']), None)
        if data is None:
            print(f'{s} s is not in a measured stretch')
            continue
        entry = min(data['frames'], key=lambda e: abs(e['t'] - s))
        cap.set(cv2.CAP_PROP_POS_FRAMES, entry['f'])
        ok, full = cap.read()
        pic, _ = picture(full, source['crop'])
        pic = pic.copy()
        for thing in ('sko', 'slaskbox'):
            cv2.polylines(pic, [np.int32(scen['things'][thing]['outline'])], True, (255, 255, 0), 2, cv2.LINE_AA)
        cv2.polylines(pic, [np.int32(scen['things']['sko']['mouth'])], True, (255, 0, 255), 2, cv2.LINE_AA)
        cv2.polylines(pic, [np.int32(scen['table']['feltOutlinePx'])], True, (0, 255, 255), 1, cv2.LINE_AA)
        for c in entry['cards']:
            q = np.array(c['corners'])
            col = (0, 255, 0) if c['state'] == 'still' else (0, 140, 255)
            cv2.polylines(pic, [np.int32(np.round(q * 4))], True, col, 2, cv2.LINE_AA, shift=2)
            a = (q[0] + q[1]) / 2
            b = (q[2] + q[3]) / 2
            cv2.arrowedLine(pic, tuple(np.int32(a)), tuple(np.int32(b)), (255, 0, 0), 2, cv2.LINE_AA, tipLength=0.3)
            cv2.putText(pic, f"{c['id']}{'v' if c['face'] == 'down' else ''}", (int(q[:, 0].max()) + 3, int(q[:, 1].min()) + 12), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
        for l in entry['loose']:
            p = tuple(np.int32(l['mid']))
            cv2.circle(pic, p, 10, (0, 0, 255), 2, cv2.LINE_AA)
            if 'id' in l:
                cv2.putText(pic, str(l['id']) + '?', (p[0] + 12, p[1]), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
        cv2.putText(pic, f"{entry['t']:.2f} s", (12, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 255), 3, cv2.LINE_AA)
        x0, y0, x1, y1 = ROI
        tiles.append(pic[y0 - 60:y1, x0:x1])
    cap.release()
    cols = 2 if len(tiles) > 1 else 1
    while len(tiles) % cols:
        tiles.append(np.zeros_like(tiles[0]))
    sheet = np.vstack([np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)])
    if sheet.shape[1] > 2400:
        sheet = cv2.resize(sheet, None, fx=2400 / sheet.shape[1], fy=2400 / sheet.shape[1], interpolation=cv2.INTER_AREA)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    cv2.imwrite(out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(out, sheet.shape[1], 'x', sheet.shape[0])


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'samla':
        main_collect(a[1:])
    elif a and a[0] == 'rita':
        main_draw(a[1:])
    else:
        main_measure(a)
