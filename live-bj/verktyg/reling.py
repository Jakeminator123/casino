# Measures the live table's padded rail round the felt's arc through the camera scen.py measured. The rail is raised, so
# its pixels do not lie on the felt; it is measured as a shape instead: a roll whose section is an ellipse standing on the
# felt's edge (its inner side at the felt's arc, its outer side `width` metres out, its middle `lift` over the felt and
# its top `top` over the felt), drawn through the camera, and its outline in the picture compared with the film's along
# rays out from the felt's edge. The shape whose outline lies closest is the measurement; the leftover in pixels, and
# how much worse the neighbouring shapes fit, say how sure it is.
#   python -I live-bj/verktyg/reling.py live-bj/data/scen.json live-bj/data/reling.json [--ark live-bj/rutor/kontroll/reling.jpg]
# Reads the empty table pictures matt/bord-A.png and bord-B.png (scen.py writes them; they show the film, so they stay
# outside Git), and writes data/reling.json (numbers only). --ark draws the film's rail outline and the measured one over
# the empty table. Frame: the live table's lens world as blackjack-dealer/src/table-live.ts has it: metres, x to the
# picture's right (the dealer's left), y up from the felt, z toward the camera, the camera straight over the origin.
import sys, os, json
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
MATT = os.path.join(HERE, '..', 'matt')
STEPS = 48   # the ellipse's points round its section


def camera(scen):
    c = scen['camera']; p, r = np.radians(c['tiltDeg']), np.radians(c['rollDeg'])
    s, k, cr, sr = np.sin(p), np.cos(p), np.cos(r), np.sin(r)
    up0 = np.array([0, k, -s])
    return {'f': c['focalPx'], 'c': np.array(c['principalPoint'], float), 'pos': np.array([0, c['heightM'], 0]), 'fw': np.array([0, -s, -k]),
            'right': np.array([cr, -up0[1] * sr, -up0[2] * sr]), 'up': np.array([sr, up0[1] * cr, up0[2] * cr])}


def see(cam, P):
    """Points (n x 3) of the lens world to pixels (n x 2), as table-live.ts liveSee."""
    d = P - cam['pos']; z = d @ cam['fw']
    return np.column_stack([cam['c'][0] + cam['f'] * (d @ cam['right']) / z, cam['c'][1] - cam['f'] * (d @ cam['up']) / z])


def beige(pic):
    """The rail's light leather, as scen.py rail_outline finds it."""
    hsv = cv2.cvtColor(pic, cv2.COLOR_BGR2HSV)
    m = ((hsv[:, :, 0] >= 5) & (hsv[:, :, 0] <= 25) & (hsv[:, :, 1] > 25) & (hsv[:, :, 1] < 140) & (hsv[:, :, 2] > 95)).astype(np.uint8)
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))


def on_arc(felt, t, out, y):
    """Points round the arc at angles t (0 toward the camera, positive toward the picture's right), `out` metres outside
    the felt's edge and `y` over the felt (arrays of the same length)."""
    R = felt['radius'] + out
    return np.column_stack([felt['centre'][0] + R * np.sin(t), y, felt['centre'][1] + R * np.cos(t)])


def section(shape, n=STEPS):
    """The roll's section, round the ellipse: (out from the felt's edge, over the felt). Its middle lies width/2 out on
    the felt; it rises `above` over the felt and reaches `below` under it (an upper and a lower half ellipse)."""
    a = np.linspace(0, 2 * np.pi, n, endpoint=False); w = shape['width']
    return w / 2 + w / 2 * np.cos(a), np.where(np.sin(a) > 0, shape['above'], shape['below']) * np.sin(a)


def roll_mask(cam, felt, shape, t, size):
    """The roll drawn through the camera as a filled mask: the solid between each two neighbouring sections."""
    o, y = section(shape); n = len(o)
    rings = [see(cam, on_arc(felt, np.full(n, a), o, y)) for a in t]
    m = np.zeros(size, np.uint8)
    for r0, r1 in zip(rings, rings[1:]):
        cv2.fillConvexPoly(m, cv2.convexHull(np.round(np.vstack([r0, r1]) * 8).astype(np.int32)), 1, cv2.LINE_8, 3)
    return m


def run_along(mask, start, end, n=500):
    """Along the picture's ray from `start` (on the felt's edge) toward `end`: where the first masked run begins and ends, in
    pixels from the start. None where there is none, or where the run leaves the picture."""
    h, w = mask.shape; t = np.linspace(0, 1, n); pts = start + (end - start) * t[:, None]; L = float(np.linalg.norm(end - start))
    inside = (pts[:, 0] >= 0) & (pts[:, 0] <= w - 1) & (pts[:, 1] >= 0) & (pts[:, 1] <= h - 1)
    v = np.zeros(n, bool); ix = np.round(pts[inside]).astype(int); v[inside] = mask[ix[:, 1], ix[:, 0]] > 0
    on = np.flatnonzero(v)
    if not len(on):
        return None
    i0 = i1 = on[0]
    while i1 + 1 < n and v[i1 + 1]:
        i1 += 1
    if i1 + 1 >= n or not inside[i1 + 1]:
        return None
    return t[i0] * L, t[i1] * L


def brightness(pic):
    return cv2.cvtColor(pic, cv2.COLOR_BGR2HSV)[:, :, 2].astype(np.float32)


def film_edges(bright, mask, start, end, n=500):
    """The film's rail along one ray: its leather (mask) gives the run, and the outer edge is where the brightness falls
    the most at the run's end (within 8 pixels of it: the shaded outer face fades into the dark floor or the table's side
    below it, and the steepest fall is the edge, half way down). Pixels from the start, or None."""
    r = run_along(mask, start, end, n)
    if r is None:
        return None
    L = float(np.linalg.norm(end - start)); d = (end - start) / L; k = np.arange(0, L, 0.5)
    pts = (start + d * k[:, None]).astype(np.float32)
    v = cv2.remap(bright, pts[:, 0:1], pts[:, 1:2], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).ravel()
    w = np.exp(-0.5 * (np.arange(-4, 5) / 2.0) ** 2)
    v = np.convolve(np.pad(v, 4, mode='edge'), w / w.sum(), 'valid')
    g = np.gradient(v); win = (k > r[1] - 8) & (k < r[1] + 8)
    if not win.any():
        return None
    i = np.flatnonzero(win)[np.argmin(g[win])]
    return r[0], float(k[i])


def rays(cam, felt, t, reach=0.3):
    """For each angle: the picture's ray from the felt's edge outward (start, end in pixels)."""
    z0 = np.zeros(len(t))
    return see(cam, on_arc(felt, t, z0, z0)), see(cam, on_arc(felt, t, z0 + reach, z0))


def outline(mask, starts, ends):
    return [run_along(mask, a, b) for a, b in zip(starts, ends)]


def on_plane(cam, px, lift):
    """The point a pixel shows on the level plane `lift` metres over the felt (as table-live.ts liveOnFelt)."""
    a = (px[0] - cam['c'][0]) / cam['f']; b = -(px[1] - cam['c'][1]) / cam['f']
    d = cam['fw'] + cam['right'] * a + cam['up'] * b
    return cam['pos'] + d * (lift - cam['pos'][1]) / d[1]


def straight(cam, shape, x, z, out):
    """A straight stretch of the rail seen through the camera: its section standing at (x, z) on the felt's level and
    reaching out along `out` (a level unit vector), as pixels."""
    o, y = section(shape, 360)
    return see(cam, np.column_stack([x + out[0] * o, y, z + out[1] * o]))


# Read by eye off the empty table pictures with a 10-pixel grid, as scen.py's FIXED: the tray behind the dealer's edge at
# his right, framed by the rail. Its right side's outer edge (a line toward the dealer, two points), its back's far edge
# (the top of the frame against the dark behind it, at the tray's middle).
TRAY = {'right_side': [[600, 480], [559, 545]], 'back_top': [575, 480], 'left_side': [[360, 480], [290, 545]]}
EDGE_COLUMNS = list(range(620, 761, 10)) + list(range(1000, 1181, 10))   # where the bar along the dealer's edge stands free in both eras


def column_edges(bright, x, y0=532, y1=578):
    """The bar along the dealer's edge in one column: its top (the steepest rise from the dark behind it) and its foot on
    the felt (the steepest fall), in pixels."""
    v = bright[y0:y1, x - 2:x + 3].mean(1); g = np.gradient(v); mid = (y1 - y0) // 2
    return y0 + float(np.argmax(g[:mid])), y0 + mid + float(np.argmin(g[mid:]))


def main(argv):
    scen_path, out_path = argv[0], argv[1]
    ark = argv[argv.index('--ark') + 1] if '--ark' in argv else None
    scen = json.load(open(scen_path, encoding='utf-8')); cam = camera(scen); arc = scen['table']['arc']
    felt = {'centre': (arc['centreM'][0], -arc['centreM'][1]), 'radius': arc['radiusM']}; edge = -scen['table']['dealerEdgeM']
    pics = {k: cv2.imread(os.path.join(MATT, f'bord-{k}.png')) for k in 'AB'}
    size = pics['A'].shape[:2]

    # The rail round the arc: the film's outline along rays every 1.5 degrees, where both eras agree (the game's badges,
    # names and the shoe cover it here and there), and the shapes that fit it.
    t = np.radians(np.arange(-87, 88, 1.5)); s, e = rays(cam, felt, t)
    film = {k: [film_edges(brightness(p), beige(p), a, b) for a, b in zip(s, e)] for k, p in pics.items()}
    keep = [i for i in range(len(t)) if all(film[k][i] and film[k][i][0] < 15 and film[k][i][1] > 40 for k in 'AB') and abs(film['A'][i][1] - film['B'][i][1]) <= 3]
    seen = np.array([(film['A'][i][1] + film['B'][i][1]) / 2 for i in keep]); sk, ek = s[keep], e[keep]
    T = np.radians(np.linspace(-89, 89, 179))
    def miss(shape):
        o = outline(roll_mask(cam, felt, shape, T, size), sk, ek)
        return np.array([np.nan if r is None else r[1] for r in o]) - seen
    fits = []
    for w in np.arange(0.058, 0.0721, 0.001):
        for above in np.arange(0.006, 0.0331, 0.003):
            for below in np.arange(0.003, 0.0241, 0.003):
                shape = {'width': round(float(w), 4), 'above': round(float(above), 4), 'below': round(float(below), 4)}
                d = miss(shape); ok = ~np.isnan(d)
                if ok.sum() >= 0.9 * len(seen):
                    fits.append((float(np.sqrt(np.mean(d[ok] ** 2))), shape))
    fits.sort(key=lambda f: f[0]); best_rms, best = fits[0]
    near = [f[1] for f in fits if f[0] <= best_rms + 0.3]
    d = miss(best); print(f'rail: width {best["width"]} m, above {best["above"]} m, below {best["below"]} m; {best_rms:.2f} px rms over {len(seen)} rays', flush=True)

    # The bar along the dealer's edge, if it is the same rail: its top against the film's in free columns.
    cols = []
    for x in EDGE_COLUMNS:
        a, b = (column_edges(brightness(pics[k]), x) for k in 'AB')
        if abs(a[0] - b[0]) > 2 or abs(a[1] - b[1]) > 2:
            continue
        foot = on_plane(cam, (x, (a[1] + b[1]) / 2), 0.0); px = straight(cam, best, foot[0], edge, (0, -1))
        cols.append([x, round((a[0] + b[0]) / 2, 1), round(float(px[:, 1].min()), 1), round((a[1] + b[1]) / 2, 1), round(float(see(cam, np.array([[foot[0], 0, edge]]))[0][1]), 1)])
    top_miss = np.array([c[1] - c[2] for c in cols]); foot_miss = np.array([c[3] - c[4] for c in cols])
    print(f'dealer\'s edge: the same rail\'s top {np.mean(top_miss):+.1f} px (rms {np.sqrt(np.mean(top_miss ** 2)):.1f}) from the film\'s over {len(cols)} columns; its foot {np.mean(foot_miss):+.1f} px', flush=True)

    # The tray: its right side's outer edge and its back's far edge, found as the same rail whose outline falls on the reads.
    rs = np.array(TRAY['right_side'], float); mid = rs.mean(0); zr = on_plane(cam, mid, best['above'] / 2)[2]
    right = min(np.arange(-0.5, -0.3, 0.001), key=lambda xo: abs(straight(cam, best, xo - best['width'], zr, (1, 0))[:, 0].max() - mid[0]))
    bt = TRAY['back_top']; xb = on_plane(cam, bt, best['above'])[0]
    back = min(np.arange(0.2, 0.45, 0.001), key=lambda b: abs(straight(cam, best, xb, edge - (b - best['width']), (0, -1))[:, 1].min() - bt[1]))
    ls = np.array(TRAY['left_side'], float); left = float(np.mean([on_plane(cam, p, best['above'] / 2)[0] for p in ls]))
    print(f'tray: right side out to x {right:.3f}, back {back:.3f} m behind the dealer\'s edge; left side near x {left:.3f}', flush=True)

    result = {
        'about': 'The live table\'s padded rail and the tray behind the dealer\'s edge, measured through the camera of scen.json on the empty table '
                 '(matt/bord-A.png and bord-B.png) by verktyg/reling.py. The rail\'s section is two half ellipses on a middle width/2 out from '
                 'the felt\'s edge at the felt\'s level: it reaches `width` out, rises `above` over the felt and its outer side turns in `below` '
                 'under the felt\'s level. It is found as the shape whose outline, drawn through the camera, lies closest to the film\'s along rays '
                 'out from the felt\'s edge (the film\'s outer edge is where the brightness falls the most at the leather\'s end). Metres; '
                 'pixels are the table picture\'s.',
        'rail': {'width': best['width'], 'above': best['above'], 'below': best['below'], 'rmsPx': round(best_rms, 2), 'maxPx': round(float(np.nanmax(np.abs(d))), 1),
                 'rays': len(seen), 'within03Px': {k: [min(n[k] for n in near), max(n[k] for n in near)] for k in ('width', 'above', 'below')},
                 'perRay': [[round(float(np.degrees(t[i])), 1), round(float(seen[j]), 1), round(float(seen[j] + d[j]), 1) if not np.isnan(d[j]) else None] for j, i in enumerate(keep)],
                 'note': 'perRay: degrees round the arc (0 toward the camera, positive toward the picture\'s right), the film\'s outer edge and the '
                         'measured shape\'s, in pixels out from the felt\'s edge along the ray. The film\'s leather begins 3 to 8 pixels out: a dark '
                         'seam between the felt and the rail.'},
        'dealersEdge': {'about': 'the same rail straight along the dealer\'s edge, its inner side at the felt\'s edge: its top seen from the front against the '
                                 'film\'s, per column x: the film\'s top, the rail\'s top, the film\'s foot, the felt\'s edge (pixels)',
                        'columns': cols, 'topMissPx': round(float(np.mean(top_miss)), 1), 'footMissPx': round(float(np.mean(foot_miss)), 1)},
        'tray': {'about': 'a tray behind the dealer\'s edge at his right (the picture\'s left), framed by the same rail; its floor is dark like the felt. '
                          'right: the outer edge of its right side (x); back: the outer edge of its back, metres behind the dealer\'s edge; left: its '
                          'left side, near the arc\'s end (x). Read by eye (TRAY in reling.py), 1 to 2 cm.',
                 'readPx': TRAY, 'right': round(float(right), 3), 'back': round(float(back), 3), 'left': round(left, 3)},
    }
    with open(out_path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('written', out_path)

    if ark:
        pic = pics['B'].copy()
        for k, colour in (('A', (0, 160, 255)), ('B', (255, 255, 0))):
            for j, i in enumerate(keep):
                r = film[k][i]; u = (e[i] - s[i]) / np.linalg.norm(e[i] - s[i])
                cv2.circle(pic, tuple(np.round(s[i] + u * r[1]).astype(int)), 2, colour, -1, cv2.LINE_AA)
        m = roll_mask(cam, felt, best, T, size)
        cs = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0]
        cv2.drawContours(pic, cs, -1, (0, 255, 0), 1, cv2.LINE_AA)
        for c in cols:
            cv2.circle(pic, (c[0], int(round(c[2]))), 2, (0, 255, 0), -1)
        os.makedirs(os.path.dirname(os.path.abspath(ark)), exist_ok=True)
        cv2.imwrite(ark, pic)
        print('drawn', ark)


if __name__ == '__main__':
    main(sys.argv[1:])
