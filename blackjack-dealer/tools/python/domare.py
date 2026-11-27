# The judge's material (skillen doma): what a reviewer who cannot play a film needs in order to see it as Jakob does.
# A film gets a sheet of every third frame whole, and for each figure in it (each panel, where films are laid side by
# side) the measures that show what the eye sees in motion and a still does not: shaking (the wrists, the fingertips
# and the head moving to and fro between frames while the motion at large is calm), the face drifting in shape from
# the first frame to the last, where he looks, and whether the hands keep their bones' lengths; then enlarged crops of
# the face and of each hand for every second frame where something happens, and the face at five moments side by side.
# A large picture is cut into full-size pieces, so that nothing is judged on a shrunk copy.
# The measuring itself is live-bj/verktyg/mat.py --ensam (MediaPipe body, hands and face), run once per panel.
#   python -I tools/python/domare.py film <film.mp4> <ut> [--delar auto|CxR] [--steg 1] [--utan-matt]
#   python -I tools/python/domare.py bild <bild.png> <ut>
# Writes in <ut>: blad-NN.png, del-<k>/ (mat/, narbild-<del>-NN.png, ansiktet-over-tiden.png), matt.json, titta-har.txt.
# The measures say where to look; they never judge. R and L are the figure's own right and left, as in mat.py.
import sys, os, json, math, subprocess
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
MAT = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'live-bj', 'verktyg', 'mat.py'))
SHEET_W = 2000          # a sheet's width in pixels: wide enough to see, small enough to be read whole
TILE = 220              # a crop's side on the close-up sheets
CALM = 0.6              # a point moving less than this share (%) of the shoulder width per frame is calm
SHAKE = 1.0             # a point that turns back by more than this share (%) of the shoulder width shakes (MediaPipe's
                        # own noise on a still point is about a third of it at 1080 lines; compare a panel with the doll's)
FINGER_FLAG = 0.25      # a finger more than 25 % longer or shorter than its own median (against the palm) is marked
FINGERS = {'tummen': [1, 2, 3, 4], 'pekfingret': [5, 6, 7, 8], 'långfingret': [9, 10, 11, 12], 'ringfingret': [13, 14, 15, 16], 'lillfingret': [17, 18, 19, 20]}
CROP_CAP = 160          # at most this many frames of close-ups per panel
SIDE = {'R': 'högerhanden', 'L': 'vänsterhanden'}
WRIST = {'R': 16, 'L': 15}   # MediaPipe's body points for the figure's own right and left wrist


def text(img, s, x, y, scale=0.6, color=(255, 255, 255)):
    cv2.putText(img, s, (x, y), cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 0, 0), 3, cv2.LINE_AA)
    cv2.putText(img, s, (x, y), cv2.FONT_HERSHEY_SIMPLEX, scale, color, 1, cv2.LINE_AA)


def save(path, img):
    ok, buf = cv2.imencode('.png', img)
    if not ok:
        raise SystemExit(f'kunde inte skriva {path}')
    buf.tofile(path)


def read_picture(path):
    data = np.fromfile(path, dtype=np.uint8)
    return cv2.imdecode(data, cv2.IMREAD_COLOR)


# ── Panels ──────────────────────────────────────────────────────────────────
LAYOUTS = [(2, 1), (3, 1), (1, 2), (2, 2), (3, 2), (4, 1)]


def panels_of(cols, rows, w, h):
    pw, ph = w // cols, h // rows
    return [(c * pw, r * ph, pw, ph) for r in range(rows) for c in range(cols)]


def seam_at(gray, x=None, y=None):
    """How much more the picture jumps across a straight line than beside it (the median over the samples): about 1
    inside one film, much more where two films meet. A band of one colour (a gutter) counts as a clear seam."""
    ratios = []
    for g in gray:
        g = g.astype(np.float32)
        if x is None:
            g, x_ = g.T, y
        else:
            x_ = x
        step = lambda k: float(np.mean(np.abs(g[:, k] - g[:, k - 1]))) if 1 <= k < g.shape[1] else float('nan')
        band = g[:, max(0, x_ - 2):x_ + 2]
        if float(np.std(band)) < 4:
            ratios.append(99.0)
            continue
        beside = np.nanmean([step(k) for k in (x_ - 4, x_ - 3, x_ - 2, x_ + 2, x_ + 3, x_ + 4)])
        ratios.append(step(x_) / max(beside, 0.5))
    return float(np.median(ratios)) if ratios else 1.0


def likeness(gray, boxes):
    """How alike the panels are in structure (the lowest correlation between any two), on small edge pictures."""
    worst = 1.0
    for g in gray:
        small = []
        for x, y, w, h in boxes:
            p = cv2.resize(g[y:y + h, x:x + w], (64, 36), interpolation=cv2.INTER_AREA).astype(np.float32)
            p = cv2.GaussianBlur(p, (3, 3), 0)
            p -= p.mean()
            small.append(p / (np.linalg.norm(p) or 1))
        for i in range(len(small)):
            for j in range(i + 1, len(small)):
                worst = min(worst, float((small[i] * small[j]).sum()))
    return worst


def find_layout(samples, w, h):
    """Films laid side by side in equal panels: every line between them a seam, or panels alike and the lines jumpy."""
    if not samples:
        return (1, 1)
    gray = [cv2.cvtColor(s, cv2.COLOR_BGR2GRAY) for s in samples]
    found = (1, 1)
    for cols, rows in LAYOUTS:
        pw, ph = w / cols, h / rows
        if not 0.45 <= pw / ph <= 2.6:
            continue
        lines = [seam_at(gray, x=int(round(c * w / cols))) for c in range(1, cols)] + [seam_at(gray, y=int(round(r * h / rows))) for r in range(1, rows)]
        alike = likeness(gray, panels_of(cols, rows, w, h))
        if (min(lines) > 3 or (alike > 0.6 and min(lines) > 1.8)) and cols * rows > found[0] * found[1]:
            found = (cols, rows)
    return found


def where(box, w, h, cols, rows):
    x, y, pw, ph = box
    if cols * rows == 1:
        return 'hela bilden'
    across = ['vänster', 'mitten', 'höger'] if cols == 3 else ['vänster', 'höger'] if cols == 2 else [f'kolumn {k + 1}' for k in range(cols)]
    down = ['övre', 'undre'] if rows == 2 else ['']
    c, r = int(round(x / pw)), int(round(y / ph))
    return ' '.join(s for s in [down[r] if rows > 1 else '', across[c] if cols > 1 else ''] if s) + f' (x {x}–{x + pw - 1}, y {y}–{y + ph - 1})'


# ── Reading the film ────────────────────────────────────────────────────────
def first_pass(path, every):
    """Counts the frames, keeps every `every`-th one (half the sheet wide, as JPEG) for the sheet, and a few whole ones
    for finding the panels."""
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    guess = max(1, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
    kw = min(w, SHEET_W // 2)
    kh = int(round(kw * h / w))
    want = set(int(round(k * (guess - 1) / 7)) for k in range(8))
    small, samples, n = [], [], 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if n % every == 0:
            small.append((n, cv2.imencode('.jpg', cv2.resize(frame, (kw, kh), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 93])[1]))
        if n in want:
            samples.append(frame)
        n += 1
    cap.release()
    return fps, w, h, n, small, samples


def sheets(small, w, h, panels, out, fps):
    """Every kept frame whole, left to right and down: three across, or two where the frame is wide or holds several films."""
    cols = 3 if w / h < 2 and panels == 1 else 2
    tw = SHEET_W // cols
    th = int(round(tw * h / w))
    band = 24   # a strip above each frame for its number, clear of the film's own labels
    rows = max(1, min(6, 1900 // (th + band)))
    per = cols * rows
    names = []
    for s in range(0, len(small), per):
        part = small[s:s + per]
        img = np.full(((th + band) * math.ceil(len(part) / cols), tw * cols, 3), 24, np.uint8)
        for k, (n, jpg) in enumerate(part):
            r, c = divmod(k, cols)
            y0 = r * (th + band) + band
            img[y0:y0 + th, c * tw:(c + 1) * tw] = cv2.resize(cv2.imdecode(jpg, cv2.IMREAD_COLOR), (tw, th), interpolation=cv2.INTER_AREA)
            text(img, f'ruta {n}  {n / fps:.2f} s', c * tw + 6, y0 - 6, 0.55)
        name = f'blad-{len(names) + 1:02d}.png'
        save(os.path.join(out, name), img)
        names.append(f'{name}: ruta {part[0][0]}–{part[-1][0]}')
    return names


# ── Measuring (mat.py) and the measures ─────────────────────────────────────
def run_mat(film, fps, frames, boxes, out, step):
    jobs = []
    for k, (x, y, w, h) in enumerate(boxes, 1):
        d = os.path.join(out, f'del-{k}', 'mat')
        os.makedirs(d, exist_ok=True)
        src = os.path.join(out, f'del-{k}', 'kalla.json')
        st = os.stat(film)
        said = json.dumps({'film': os.path.abspath(film), 'storlek': st.st_size, 'andrad': int(st.st_mtime), 'steg': step, 'fps': fps,
                           'crop': {'x': x, 'y': y, 'width': w, 'height': h}, 'runs': [{'from': 0, 'to': round(frames / fps, 3)}]})
        # the same panel of the same film (same size and time, so a film replaced under the same name is measured anew)
        # measured before: its measures are used again (the slow part)
        if os.path.exists(src) and open(src, encoding='utf-8').read() == said and any(f.startswith('rorelse-') for f in os.listdir(d)):
            continue
        with open(src, 'w', encoding='utf-8') as f:
            f.write(said)
        jobs.append(subprocess.Popen([sys.executable, '-I', MAT, film, src, d, '--steg', str(step), '--ensam'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True))
    for k, job in enumerate(jobs, 1):
        said, _ = job.communicate()
        if job.returncode:
            raise SystemExit(f'mat.py stannade för del {k}:\n{said[-2000:]}')
    data = []
    for k in range(1, len(boxes) + 1):
        d = os.path.join(out, f'del-{k}', 'mat')
        files = sorted(f for f in os.listdir(d) if f.startswith('rorelse-'))
        with open(os.path.join(d, files[0]), encoding='utf-8') as f:
            data.append(json.load(f))
    return data


def arr(frames, get):
    out = np.full((len(frames), 2), np.nan)
    for i, e in enumerate(frames):
        p = get(e)
        if p is not None:
            out[i] = p[:2]
    return out


def pct(v, q):
    v = v[np.isfinite(v)]
    return float(np.percentile(v, q)) if v.size else float('nan')


def shake(track, scale):
    """Per frame, in % of the shoulder width: to and fro (the point turns back from one frame to the next: the smaller of
    the two steps where they point more than 107 degrees apart, else 0), a jump (a step four times the steps around
    it), and the speed over five frames. Smooth motion never turns back between two frames except where it stops."""
    n = len(track)
    fro, jump, speed = np.full(n, np.nan), np.zeros(n), np.full(n, np.nan)
    steps = np.full(n, np.nan)
    for i in range(1, n):
        d = track[i] - track[i - 1]
        if np.all(np.isfinite(d)):
            steps[i] = float(np.hypot(*d)) / scale * 100
    for i in range(1, n - 1):
        d1, d2 = track[i] - track[i - 1], track[i + 1] - track[i]
        if np.all(np.isfinite(d1)) and np.all(np.isfinite(d2)):
            a, b = float(np.hypot(*d1)), float(np.hypot(*d2))
            cos = float(np.dot(d1, d2)) / (a * b) if a and b else 1.0
            fro[i] = min(a, b) / scale * 100 if cos < -0.3 else 0.0
    for i in range(1, n):
        around = steps[max(1, i - 5):i].tolist() + steps[i + 1:i + 6].tolist()
        around = [s for s in around if np.isfinite(s)]
        if np.isfinite(steps[i]) and len(around) >= 3:
            usual = float(np.median(around))
            if steps[i] > 3.0 and steps[i] > 4 * usual:
                jump[i] = steps[i]
    for i in range(2, n - 2):
        v = track[i + 2] - track[i - 2]
        if np.all(np.isfinite(v)):
            speed[i] = float(np.hypot(*v)) / 4 / scale * 100
    return fro, jump, speed


def runs_of(flags, gap=0):
    """Consecutive runs of True as (first, last), joining runs that are at most `gap` apart."""
    out = []
    for i, f in enumerate(flags):
        if not f:
            continue
        if out and i - out[-1][1] <= gap + 1:
            out[-1][1] = i
        else:
            out.append([i, i])
    return [tuple(r) for r in out]


def fmt_runs(runs, frames):
    return ', '.join(f'{frames[a]}' if a == b else f'{frames[a]}–{frames[b]}' for a, b in runs) or 'inga'


def measure(data, fps):
    fr = data['frames']
    n = len(fr)
    fno = [e['f'] for e in fr]
    pose = lambda i: (lambda e: e['pose']['image'][i] if e['pose'] else None)
    shoulders = [math.dist(e['pose']['image'][11][:2], e['pose']['image'][12][:2]) for e in fr if e['pose']]
    eyes = [math.dist(e['face']['points']['eyeR_out'], e['face']['points']['eyeL_out']) for e in fr if e['face']]
    scale = float(np.median(shoulders)) if shoulders else (float(np.median(eyes)) * 3.8 if eyes else data['width'] * 0.25)
    res = {'rutor': n, 'axelbredd_px': round(scale, 1),
           'hittat': {'kroppen': sum(1 for e in fr if e['pose']), 'ansiktet': sum(1 for e in fr if e['face']),
                      'högerhanden': sum(1 for e in fr if 'R' in e['hands']), 'vänsterhanden': sum(1 for e in fr if 'L' in e['hands'])}}
    # Shaking: head, wrists and fingertips.
    tracks = {'huvudet': arr(fr, lambda e: e['face']['points']['nose'] if e['face'] else (e['pose']['image'][0] if e['pose'] else None))}
    for s in 'RL':
        tracks[f'{SIDE[s]}s handled'] = arr(fr, lambda e, s=s: e['hands'][s]['image'][0] if s in e['hands'] else (e['pose']['image'][WRIST[s]] if e['pose'] else None))
        tracks[f'{SIDE[s]}s pekfinger'] = arr(fr, lambda e, s=s: e['hands'][s]['image'][8] if s in e['hands'] else None)
        tracks[f'{SIDE[s]}s tumme'] = arr(fr, lambda e, s=s: e['hands'][s]['image'][4] if s in e['hands'] else None)
    jit, spikes, speeds = {}, [], {}
    for name, t in tracks.items():
        fro, jump, speed = shake(t, scale)
        speeds[name] = speed
        seen = fro[np.isfinite(fro)]
        calm = fro[(speed < CALM) & np.isfinite(fro)]
        jit[name] = {'fram_och_tillbaka_%_av_rutorna': round(100 * float(np.mean(seen > SHAKE)), 1) if seen.size else None,
                     'storlek_95': round(pct(seen, 95), 2) if seen.size else None,
                     'i_lugn_%_av_rutorna': round(100 * float(np.mean(calm > SHAKE)), 1) if calm.size else None, 'rutor': int(seen.size)}
        for i in np.where(np.nan_to_num(fro) > 2 * SHAKE)[0]:
            spikes.append({'ruta': fno[i], 'i': int(i), 'var': name, 'slag': 'fram och tillbaka', 'storlek': round(float(fro[i]), 2), 'lugn': bool(np.nan_to_num(speed[i], nan=99) < CALM)})
        for i in np.where(jump > 0)[0]:
            spikes.append({'ruta': fno[i], 'i': int(i), 'var': name, 'slag': 'hopp', 'storlek': round(float(jump[i]), 2), 'lugn': False})
    res['skakighet'] = jit
    # Fine trembling: each point against its own mean over five frames (a high-pass). MediaPipe's own noise is about a
    # pixel, so this says something only against another panel or film (the doll beside it, or a film made another
    # way). Aleph's films of the lifted deal trembled in the head 0.4-0.5 % of the shoulder width, Kling's of the drawn
    # doll 0.2-0.3 % (2026-11-27, where Jakob saw "lite skakig"); whether from the motion or the model those proofs
    # cannot tell. A doll's blank face is measured noisily: compare a doll with a doll, a person with a person.
    def highpass(t, k=5):
        out = []
        for i in range(k // 2, len(t) - k // 2):
            w = t[i - k // 2:i + k // 2 + 1]
            if np.all(np.isfinite(w)):
                out.append(float(np.hypot(*(t[i] - w.mean(axis=0)))))
        return np.array(out)
    trem = {}
    for name, t in (('huvudet', tracks['huvudet']), ('axeln', arr(fr, lambda e: e['pose']['image'][12] if e['pose'] else None)),
                    ('högra handleden', arr(fr, lambda e: e['pose']['image'][16] if e['pose'] else None)), ('vänstra handleden', arr(fr, lambda e: e['pose']['image'][15] if e['pose'] else None))):
        h = highpass(t)
        if h.size:
            trem[name] = {'median_%': round(float(np.median(h)) / scale * 100, 2), '90_%': round(pct(h, 90) / scale * 100, 2), 'median_px': round(float(np.median(h)), 2)}
    res['darr'] = trem
    spikes.sort(key=lambda s: -s['storlek'])
    res['ryck'] = spikes[:40]
    # The face's shape: proportions against the eye span, start against end, on frames where he looks about ahead.
    def shape(e):
        p = e['face']['points']
        eye = math.dist(p['eyeR_out'], p['eyeL_out']) or 1
        return {'näsa–haka': math.dist(p['nose'], p['chin']) / eye, 'panna–haka': math.dist(p['brow'], p['chin']) / eye,
                'munnens bredd': math.dist(p['mouthR'], p['mouthL']) / eye, 'högra ögats bredd': math.dist(p['eyeR_out'], p['eyeR_in']) / eye,
                'vänstra ögats bredd': math.dist(p['eyeL_in'], p['eyeL_out']) / eye, 'ansiktets storlek mot axlarna': eye / scale}
    faced = [(i, e) for i, e in enumerate(fr) if e['face']]
    if len(faced) >= 6:
        # only frames where the head is turned about as at the start, so that a turn is not taken for a new face
        turn = np.array([e['face']['turn'] for _, e in faced])
        first = turn[:max(3, len(turn) // 7)]
        nod0, yaw0 = float(np.median(first[:, 0])), float(np.median(first[:, 1]))
        ahead = [(i, e) for (i, e), t in zip(faced, turn) if abs(t[1] - yaw0) < 10 and abs(t[0] - nod0) < 10]
        if len(ahead) < 9:
            ahead = faced
        k = max(3, len(ahead) // 7)
        windows = {'början': ahead[:k], 'mitten': ahead[len(ahead) // 2 - k // 2:len(ahead) // 2 - k // 2 + k], 'slutet': ahead[-k:]}
        med = {w: {key: float(np.median([shape(e)[key] for _, e in win])) for key in shape(ahead[0][1])} for w, win in windows.items()}
        res['ansiktet'] = {'rutor_som_jamfors': {w: [fno[win[0][0]], fno[win[-1][0]]] for w, win in windows.items()},
                           'andring_mitten_%': {key: round((med['mitten'][key] / med['början'][key] - 1) * 100, 1) for key in med['början']},
                           'andring_slutet_%': {key: round((med['slutet'][key] / med['början'][key] - 1) * 100, 1) for key in med['början']}}
        # Where he looks, and blinks.
        look, blinks = [], []
        for i, e in faced:
            b, t, p = e['face']['blend'], e['face']['turn'], e['face']['points']
            eyes_off = max(b.get(f'eyeLook{d}{s}', 0) for d in ('Up', 'Down', 'In', 'Out') for s in ('Left', 'Right'))
            down = (b.get('eyeLookDownLeft', 0) + b.get('eyeLookDownRight', 0)) / 2
            blink = (b.get('eyeBlinkLeft', 0) + b.get('eyeBlinkRight', 0)) / 2
            # the iris's height in the opening between the lids: 0 at the upper lid, 1 at the lower; about 0.45 straight
            # ahead, less when he looks up (Jakob 2026-11-27 on film 1: "tittar uppåt, men ... inte mot kameran")
            gaps = [(p[f'iris{s}'][1] - p[f'lid{s}_up'][1]) / (p[f'lid{s}_down'][1] - p[f'lid{s}_up'][1]) for s in 'RL' if p[f'lid{s}_down'][1] - p[f'lid{s}_up'][1] > 2]
            iris = float(np.mean(gaps)) if gaps else None
            toward = abs(t[1]) < 10 and abs(t[0]) < 12 and eyes_off < 0.4 and blink < 0.5 and (iris is None or 0.40 <= iris <= 0.6)
            look.append({'ruta': fno[i], 'nick': round(t[0], 1), 'vrid': round(t[1], 1), 'ogon_bort': round(eyes_off, 2), 'ned': round(down, 2), 'blink': round(blink, 2),
                         'iris': round(iris, 2) if iris is not None else None, 'mot_kameran': toward})
            blinks.append(blink > 0.5)
        per_s = []
        step = max(1, int(round(fps / 2)))
        for a in range(0, len(look), step):
            part = look[a:a + step]
            irises = [p['iris'] for p in part if p['iris'] is not None]
            per_s.append({'ruta': part[0]['ruta'], 'vrid': round(float(np.median([p['vrid'] for p in part])), 1), 'nick': round(float(np.median([p['nick'] for p in part])), 1),
                          'ned': round(float(np.median([p['ned'] for p in part])), 2), 'iris': round(float(np.median(irises)), 2) if irises else None,
                          'mot_kameran_%': round(100 * sum(p['mot_kameran'] for p in part) / len(part))})
        res['blicken'] = {'mot_kameran_%': round(100 * sum(p['mot_kameran'] for p in look) / len(look)), 'blinkningar': len(runs_of(blinks)),
                          'per_halv_sekund': per_s}
    # The hands: bone lengths in the hand's own metres, and hands that are lost while the wrist is seen.
    hands = {}
    for s in 'RL':
        got = [(i, e['hands'][s]) for i, e in enumerate(fr) if s in e['hands']]
        lost = [bool(e['pose'] and e['pose']['image'][WRIST[s]][3] > 0.6 and s not in e['hands']) for e in fr]
        info = {'saknas_fast_handleden_syns': fmt_runs(runs_of(lost, gap=1), fno)}
        if len(got) >= 5:
            # each finger's length from its knuckle to its tip (the thumb from its root), as its share of the five
            # fingers' mean, in the hand's own metres: a hand drawn right keeps these shares whatever it does
            def lengths(h):
                w = h['world']
                each = [sum(math.dist(w[c[k]], w[c[k + 1]]) for k in range(len(c) - 1)) for c in FINGERS.values()]
                mean = sum(each) / len(each) or 1e-6
                return [v / mean for v in each]
            L = np.array([lengths(h) for _, h in got])
            med = np.median(L, axis=0)
            dev = np.abs(L / np.where(med > 0, med, 1) - 1)
            flagged = [got[j][0] for j in np.where(dev.max(axis=1) > FINGER_FLAG)[0]]
            worst = {name: round(float(np.max(dev[:, k])) * 100) for k, name in enumerate(FINGERS)}
            span = np.array([math.dist(h['image'][0][:2], h['image'][9][:2]) / scale for _, h in got])
            jumps = [got[j][0] for j in range(1, len(got)) if got[j][0] - got[j - 1][0] <= 2 and abs(span[j] / span[j - 1] - 1) > 0.25]
            info.update({'fingrarnas_langd_varierar_%': round(float(np.median(np.std(L, axis=0) / np.where(med > 0, med, 1))) * 100, 1),
                         'storsta_avvikelse_%': worst,
                         'finger_mer_an_25_%_fel': fmt_runs(runs_of([i in flagged for i in range(n)], gap=1), fno),
                         'handens_storlek_hoppar': ', '.join(str(fno[i]) for i in jumps) or 'inga'})
            info['_flag_i'] = flagged
        hands[SIDE[s]] = info
    res['händerna'] = hands
    # Where something happens: the wrists moving, and every jolt.
    act = np.nanmax(np.vstack([np.nan_to_num(speeds[f'{SIDE[s]}s handled']) for s in 'RL']), axis=0)
    top = pct(act, 95)
    active = act > max(0.35 * top, CALM) if np.isfinite(top) else np.zeros(n, bool)
    for sp in spikes:
        active[max(0, sp['i'] - 6):sp['i'] + 7] = True
    segs = [(max(0, a - 6), min(n - 1, b + 6)) for a, b in runs_of(active, gap=8)] or [(0, n - 1)]   # a still film: all of it
    res['delar_dar_nagot_hander'] = fmt_runs(segs, fno)
    return res, segs, scale, spikes


# ── Close-ups ───────────────────────────────────────────────────────────────
def smooth(track, k=7):
    out = track.copy()
    n = len(track)
    for i in range(n):
        win = track[max(0, i - k // 2):i + k // 2 + 1]
        good = win[np.all(np.isfinite(win), axis=1)]
        out[i] = good.mean(axis=0) if len(good) else np.nan
    idx = np.arange(n)
    for d in range(2):
        ok = np.isfinite(out[:, d])
        if ok.any():
            out[:, d] = np.interp(idx, idx[ok], out[ok, d])
    return out


def boxes_for(data, scale):
    fr = data['frames']
    face_c = arr(fr, lambda e: np.mean(list(e['face']['points'].values()), axis=0) if e['face'] else None)
    # the face's size: its height from the forehead to the chin, or its width at the eyes, whichever shows more (a turned head is narrow)
    sizes = [max(3.2 * math.dist(e['face']['points']['eyeR_out'], e['face']['points']['eyeL_out']), 1.7 * math.dist(e['face']['points']['brow'], e['face']['points']['chin'])) for e in fr if e['face']]
    out = {'ansiktet': (smooth(face_c), float(np.median(sizes)) if sizes else 0.45 * scale)}
    for s in 'RL':
        c = arr(fr, lambda e, s=s: np.mean(np.array(e['hands'][s]['image'])[:, :2], axis=0) if s in e['hands'] else None)
        wr = arr(fr, lambda e, s=s: e['pose']['image'][WRIST[s]] if e['pose'] and e['pose']['image'][WRIST[s]][3] > 0.3 else None)
        c = np.where(np.isfinite(c), c, wr)
        spans = [np.ptp(np.array(e['hands'][s]['image'])[:, :2], axis=0).max() for e in fr if s in e['hands']]
        out[SIDE[s]] = (smooth(c), (1.7 * float(np.median(spans))) if spans else 0.5 * scale)
    return out


def close_ups(film, datas, segs_all, scales, flags_all, boxes, out):
    """Second pass over the film: crops of the face and each hand, every second frame in the parts where something happens."""
    plan = {}
    for k, (data, segs) in enumerate(zip(datas, segs_all)):
        idx = sorted(set(i for a, b in segs for i in range(a, b + 1, 2)))
        stride = 2
        while len(idx) > CROP_CAP:
            stride += 1
            idx = sorted(set(i for a, b in segs for i in range(a, b + 1, stride)))
        plan[k] = {data['frames'][i]['f']: i for i in idx}
        # the face at five moments, whatever the parts
        faced = [i for i, e in enumerate(data['frames']) if e['face']] or list(range(len(data['frames'])))
        plan.setdefault(('fem', k), {data['frames'][faced[int(round(q * (len(faced) - 1)))]]['f']: faced[int(round(q * (len(faced) - 1)))] for q in (0, 0.25, 0.5, 0.75, 1)})
    want = set()
    for v in plan.values():
        want |= set(v)
    geo = [boxes_for(d, s) for d, s in zip(datas, scales)]
    tiles = {k: {part: [] for part in geo[k]} for k in range(len(datas))}
    five = {k: [] for k in range(len(datas))}
    cap = cv2.VideoCapture(film)
    n = 0
    while want:
        ok, frame = cap.read()
        if not ok:
            break
        if n in want:
            for k, (x0, y0, w, h) in enumerate(boxes):
                pic = frame[y0:y0 + h, x0:x0 + w]
                for part, (centre, side) in geo[k].items():
                    for which in ('plan', 'fem'):
                        rows = plan[k] if which == 'plan' else plan[('fem', k)]
                        if n not in rows:
                            continue
                        i = rows[n]
                        size = TILE if which == 'plan' else 360
                        crop = cut(pic, centre[i], side, size)
                        mark = flags_all[k].get((part, i))
                        if mark:
                            cv2.rectangle(crop, (0, 0), (size - 1, size - 1), mark, 4)
                        text(crop, f'{n}', 6, 20, 0.55)
                        if which == 'plan':
                            tiles[k][part].append(crop)
                        elif part == 'ansiktet':
                            five[k].append((n, crop))
        n += 1
    cap.release()
    written = {}
    for k in range(len(datas)):
        d = os.path.join(out, f'del-{k + 1}')
        names = []
        for part, crops in tiles[k].items():
            for s in range(0, len(crops), 40):
                part_crops = crops[s:s + 40]
                rows = math.ceil(len(part_crops) / 8)
                img = np.zeros((rows * TILE, 8 * TILE, 3), np.uint8)
                for j, c in enumerate(part_crops):
                    r, col = divmod(j, 8)
                    img[r * TILE:(r + 1) * TILE, col * TILE:(col + 1) * TILE] = c
                name = f'narbild-{part.replace("å", "a").replace("ä", "a").replace("ö", "o")}-{s // 40 + 1:02d}.png'
                save(os.path.join(d, name), img)
                names.append(name)
        if five[k]:
            img = np.hstack([c for _, c in five[k]])
            save(os.path.join(d, 'ansiktet-over-tiden.png'), img)
            names.append('ansiktet-over-tiden.png (rutor ' + ', '.join(str(f) for f, _ in five[k]) + ')')
        written[k] = names
    return written


def cut(pic, centre, side, size):
    h, w = pic.shape[:2]
    side = int(max(24, min(side, w, h)))
    if not np.all(np.isfinite(centre)):
        return np.full((size, size, 3), 40, np.uint8)
    x0 = int(min(max(centre[0] - side / 2, 0), w - side))
    y0 = int(min(max(centre[1] - side / 2, 0), h - side))
    return cv2.resize(pic[y0:y0 + side, x0:x0 + side], (size, size), interpolation=cv2.INTER_CUBIC)


# ── The words ───────────────────────────────────────────────────────────────
def words(name, fps, n, layout, boxes, w, h, results, sheet_names, crops):
    cols, rows = layout
    out = [f'Underlag för {name}: {n} rutor, {fps:g} rutor i sekunden ({n / fps:.2f} s), {w}×{h}.',
           f'Delar: {cols}×{rows}' + (' (en film)' if cols * rows == 1 else ' (filmer bredvid varandra; ge --delar CxR om det är fel)') + '.',
           'Måtten säger var det är värt att titta. De dömer inte: domen fälls med ögat på rutorna.', '',
           'Blad (var tredje ruta i hel bild): ' + '; '.join(sheet_names), '']
    for k, (res, box) in enumerate(zip(results, boxes)):
        out.append(f'DEL {k + 1}, {where(box, w, h, cols, rows)}')
        g = res['hittat']
        out.append(f'  Hittat i {res["rutor"]} rutor: kroppen {g["kroppen"]}, ansiktet {g["ansiktet"]}, högerhanden {g["högerhanden"]}, vänsterhanden {g["vänsterhanden"]}.')
        sh = ', '.join(f'{k2} {v["fram_och_tillbaka_%_av_rutorna"]} % ({v["i_lugn_%_av_rutorna"]} % i lugn)' for k2, v in res['skakighet'].items() if v['rutor'])
        out.append(f'  Skakighet: andel rutor där punkten vänder tillbaka mer än {SHAKE:g} % av axelbredden: {sh or "inget att mäta"}.')
        if res.get('darr'):
            out.append('  Darr (punkten mot sitt eget medel över fem rutor; median och 90 %, i % av axelbredden; bara jämförbart mot en annan del eller film i samma storlek): '
                       + ', '.join(f'{k2} {v["median_%"]}/{v["90_%"]} ({v["median_px"]} px)' for k2, v in res['darr'].items()) + '.')
        big = res['ryck'][:12]
        out.append('  Ryck och hopp (störst först, % av axelbredden): ' + ('; '.join(f'ruta {r["ruta"]} {r["var"]} {r["slag"]} {r["storlek"]}' + (' i lugn' if r['lugn'] else '') for r in big) or 'inga') + '.')
        if 'ansiktet' in res:
            a = res['ansiktet']
            out.append(f'  Ansiktets form (rutor där huvudet är vridet ungefär som i början; början {a["rutor_som_jamfors"]["början"]}, slutet {a["rutor_som_jamfors"]["slutet"]}), ändring i %:')
            out.append('    mitten: ' + ', '.join(f'{k2} {v:+.1f}' for k2, v in a['andring_mitten_%'].items()))
            out.append('    slutet: ' + ', '.join(f'{k2} {v:+.1f}' for k2, v in a['andring_slutet_%'].items()))
        if 'blicken' in res:
            b = res['blicken']
            out.append(f'  Blicken: mot kameran i {b["mot_kameran_%"]} % av rutorna med ansikte; {b["blinkningar"]} blinkningar.')
            out.append('    per halv sekund (ruta: vridning°, nick°, ögonen ned 0–1, irisens höjd i ögat 0 uppe–1 nere (rakt fram ~0,45, under 0,40 ser upp), mot kameran %): '
                       + '; '.join(f'{p["ruta"]}: {p["vrid"]}, {p["nick"]}, {p["ned"]}, {p["iris"]}, {p["mot_kameran_%"]}' for p in b['per_halv_sekund']))
            out.append('    Blicken mäts svagt: döm den på närbilderna av ansiktet i vilan, mot var kameran står.')
        for side, info in res['händerna'].items():
            line = f'  {side[0].upper() + side[1:]}: saknas fast handleden syns i rutorna {info["saknas_fast_handleden_syns"]}'
            if 'fingrarnas_langd_varierar_%' in info:
                worst = ', '.join(f'{k2} {v}' for k2, v in info['storsta_avvikelse_%'].items())
                line += (f'; fingrarnas längd mot varandra varierar {info["fingrarnas_langd_varierar_%"]} % (median), störst avvikelse i % {worst}; '
                         f'ett finger mer än 25 % fel i rutorna {info["finger_mer_an_25_%_fel"]}; handens storlek hoppar i rutorna {info["handens_storlek_hoppar"]}')
            out.append(line + '.')
        out.append(f'  Där något händer: rutorna {res["delar_dar_nagot_hander"]}.')
        out.append('  Närbilder (varannan ruta där något händer; rött = ryck, orange = fingerben fel, blått = handen saknas): ' + '; '.join(crops.get(k, [])))
        out.append('')
    if len(results) > 1:
        out.append('JÄMFÖRT MELLAN DELARNA (darr, median i % av axelbredden; en docka i en del visar mätningens eget brus):')
        for part in results[0].get('darr', {}):
            vals = [r.get('darr', {}).get(part, {}).get('median_%') for r in results]
            out.append(f'  {part}: ' + ', '.join(f'del {k + 1} {v}' for k, v in enumerate(vals)))
    return '\n'.join(out) + '\n'


def film_main(film, out, layout_arg, step, measured=True):
    os.makedirs(out, exist_ok=True)
    fps, w, h, n, small, samples = first_pass(film, 3)
    layout = tuple(int(v) for v in layout_arg.lower().split('x')) if layout_arg != 'auto' else find_layout(samples, w, h)
    boxes = panels_of(layout[0], layout[1], w, h)
    sheet_names = sheets(small, w, h, len(boxes), out, fps)
    if not measured:   # only the sheets: quick, and enough to lay a film beside its source
        said = f'Underlag för {os.path.basename(film)}: {n} rutor, {fps:g} rutor i sekunden, {w}×{h}; bara blad (--utan-matt).\nBlad: ' + '; '.join(sheet_names) + '\n'
        with open(os.path.join(out, 'titta-har.txt'), 'w', encoding='utf-8') as f:
            f.write(said)
        print(said)
        return
    datas = run_mat(film, fps, n, boxes, out, step)
    results, segs_all, scales, flags_all = [], [], [], []
    for data in datas:
        res, segs, scale, spikes = measure(data, fps)
        flags = {}
        part_of = lambda name: 'ansiktet' if name == 'huvudet' else ('högerhanden' if name.startswith('högerhanden') else 'vänsterhanden')
        for sp in spikes:
            flags[(part_of(sp['var']), sp['i'])] = (0, 0, 255)
        for side, info in res['händerna'].items():
            for i in info.pop('_flag_i', []):
                flags.setdefault((side, i), (0, 140, 255))
            for e_i, e in enumerate(data['frames']):
                if e['pose'] and e['pose']['image'][WRIST['R' if side == 'högerhanden' else 'L']][3] > 0.6 and ('R' if side == 'högerhanden' else 'L') not in e['hands']:
                    flags.setdefault((side, e_i), (255, 120, 0))
        results.append(res)
        segs_all.append(segs)
        scales.append(scale)
        flags_all.append(flags)
    crops = close_ups(film, datas, segs_all, scales, flags_all, boxes, out)
    with open(os.path.join(out, 'matt.json'), 'w', encoding='utf-8') as f:
        json.dump({'film': film, 'fps': fps, 'rutor': n, 'storlek': [w, h], 'delar': list(layout), 'rutor_per_del': [list(b) for b in boxes], 'mått': results}, f, ensure_ascii=False, indent=1)
    said = words(os.path.basename(film), fps, n, layout, boxes, w, h, results, sheet_names, crops)
    with open(os.path.join(out, 'titta-har.txt'), 'w', encoding='utf-8') as f:
        f.write(said)
    print(said)


def picture_main(path, out):
    """A large picture cut into pieces at full size (with a little overlap), so that its details are seen as they are."""
    os.makedirs(out, exist_ok=True)
    img = read_picture(path)
    h, w = img.shape[:2]
    base = os.path.splitext(os.path.basename(path))[0]
    piece = 1300
    if max(w, h) <= 2000:   # a reviewer's picture reader shows this much without shrinking it
        print(f'{base}: {w}×{h}, liten nog att läsas hel.')
        return
    cols, rows = math.ceil(w / piece), math.ceil(h / piece)
    pw, ph = math.ceil(w / cols), math.ceil(h / rows)
    names = []
    for r in range(rows):
        for c in range(cols):
            x0, y0 = max(0, c * pw - 40), max(0, r * ph - 40)
            x1, y1 = min(w, (c + 1) * pw + 40), min(h, (r + 1) * ph + 40)
            name = f'{base}-bit-{r + 1}{c + 1}.png'
            save(os.path.join(out, name), img[y0:y1, x0:x1])
            names.append(f'{name} (x {x0}–{x1}, y {y0}–{y1})')
    print(f'{base}: {w}×{h} i {rows}×{cols} bitar i full storlek: ' + '; '.join(names))


def main():
    sys.stdout.reconfigure(encoding='utf-8')   # -I ignores PYTHONIOENCODING, and the words are Swedish
    if len(sys.argv) < 4 or sys.argv[1] not in ('film', 'bild'):
        raise SystemExit(__doc__ or 'python -I tools/python/domare.py film <film.mp4> <ut> [--delar auto|CxR] [--steg 1] | bild <bild.png> <ut>')
    kind, src, out = sys.argv[1:4]
    rest = sys.argv[4:]
    option = lambda name, default: rest[rest.index(name) + 1] if name in rest else default
    if kind == 'film':
        film_main(src, out, option('--delar', 'auto'), int(option('--steg', '1')), '--utan-matt' not in rest)
    else:
        picture_main(src, out)


main()
