"""SAM 3D Body tried on a hired machine at RunPod, on our own figure's film, where the true numbers are known: does it
give the depth that the MediaPipe lift (lyft.py) lacks? live-bj/README.md, "Djup ur SAM 3D Body", says how the trial is
run again and what it gave. One file with three uses; sam_runpod.ts hires the machine and sends this file there.

  python3 sam_runpod.py serve
      On the hired machine only (sam_runpod.ts starts it; the standard library alone). Sets SAM 3D Body up: its code
      from GitHub, the packages its body model needs (not the person detector or the field-of-view estimator: the box
      and the lens are given), DINOv3's code for torch.hub, and the checkpoint from Hugging Face with HF_TOKEN. Meanwhile
      it answers on port 8000, every call carrying the run's own secret in the header X-Sam-Prov:
        GET /status                the stage (code, packages, dinov3, model, ready or failed) and the setup log's tail
        PUT /in/<name>             a file into /work/in
        POST /job {"cmd": [...]}   a command started in /work; GET /job/<id>?from=<byte> its state and log
        GET /out/<path>            a file out of /work/out
  PY live-bj/verktyg/sam_runpod.py ruta <the figure's own numbers>
      The box around the figure in its film, x0,y0,x1,y1 in pixels: its own joints through the play lens, with room.
  PY live-bj/verktyg/sam_runpod.py jamfor <sam.json> <the figure's own numbers> <the film measured by mat.py --ensam> <ut.json>
      SAM against the truth joint by joint in the camera's frame (sideways, height, depth): as the model gives it, with
      one scale and one shift fitted over the whole film, and only moved so that the trunk stands where it truly does
      (what the lift is given); beside it the MediaPipe lift of `lyft.py prov` on the same frames. Also how steady the
      arm's bones are from frame to frame, how near the camera each wrist is said to be against its shoulder (what
      lyft.py takes from MediaPipe as `nearer`), the time a frame took, and what the machine cost (the liggare.json
      that sam_runpod.ts keeps beside sam.json).

SAM_PROV_WORK moves serve's /work, for trying the service on this computer (the setup then stops at nvidia-smi).

PY is blackjack-dealer/tools/python/.venv/Scripts/python.exe -I. The camera's frame is SAM's: metres, x to the
picture's right, y down, z into the picture, the camera at 0. The figure's own numbers are in the lens world (x to the
picture's right, y up with the felt at 0, z toward the player); the play lens (blackjack-dealer/src/table-lens.ts
PLAY_LENS, read by docka.py play_lens) turns one into the other.
"""
import os, sys, json, math

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 8000
SAM_ZIP = 'https://codeload.github.com/facebookresearch/sam-3d-body/zip/refs/heads/main'
DINOV3_ZIP = 'https://codeload.github.com/facebookresearch/dinov3/zip/refs/heads/main'
CHECKPOINT = 'facebook/sam-3d-body-dinov3'
# What the body model imports at inference (sam_3d_body and DINOv3's hub code), read from the two repositories'
# sources and INSTALL.md / requirements.txt on 2026-11-27. The detector (detectron2), MoGe and SAM 3 are left out.
PACKAGES = ['roma', 'pytorch-lightning', 'yacs', 'omegaconf', 'timm', 'einops', 'opencv-python-headless', 'braceexpand',
            'huggingface_hub', 'ftfy', 'regex', 'scikit-learn', 'submitit', 'termcolor', 'torchmetrics', 'scikit-image', 'pandas']


# ── On the hired machine ─────────────────────────────────────────────────────────

def serve():
    import hmac, http.server, subprocess, threading, time, urllib.parse, urllib.request, zipfile, re, shutil, importlib
    secret = os.environ.pop('SAM_PROV_SECRET')
    hf = os.environ.pop('HF_TOKEN', '')
    os.environ.pop('SAM_PROV_SERVER', None)          # what started this; the commands below inherit no secret
    work = os.environ.get('SAM_PROV_WORK', '/work')
    sam = os.environ.setdefault('SAM_3D_BODY', os.path.join(work, 'sam-3d-body'))
    torch_home = os.environ.setdefault('TORCH_HOME', os.path.join(work, 'torch'))
    for d in ('in', 'out'):
        os.makedirs(os.path.join(work, d), exist_ok=True)
    log_file = os.path.join(work, 'setup.log')
    state = {'stage': 'starting', 'failed': None, 'began': time.time(), 'jobs': {}}
    lock = threading.Lock()

    def hide(text):
        for value in (secret, hf):
            if value:
                text = text.replace(value, '***')
        return text

    def note(text):
        with lock, open(log_file, 'a', encoding='utf-8') as f:
            f.write(hide(text) + '\n')

    def run(cmd):
        note('$ ' + ' '.join(cmd))
        with open(log_file, 'a', encoding='utf-8') as f:
            code = subprocess.call(cmd, stdout=f, stderr=subprocess.STDOUT, cwd=work)
        if code:
            raise RuntimeError(f'{os.path.basename(cmd[0])} {cmd[1] if len(cmd) > 1 else ""} ended with {code}')

    def unzip(url, target):
        """A GitHub branch as a zip (the image has no git), unpacked to target; the zip's comment is the commit."""
        archive = target + '.zip'
        urllib.request.urlretrieve(url, archive)
        with zipfile.ZipFile(archive) as z:
            top = z.namelist()[0].split('/')[0]
            z.extractall(os.path.dirname(target))
            commit = z.comment.decode('ascii', 'replace')
        shutil.move(os.path.join(os.path.dirname(target), top), target)
        os.remove(archive)
        note(f'{url} -> {target}, commit {commit}')

    def setup():
        try:
            state['stage'] = 'gpu'
            run(['nvidia-smi', '--query-gpu=name,memory.total,memory.free,driver_version', '--format=csv'])
            import torch
            note(f'python {sys.version.split()[0]}, torch {torch.__version__}, cuda {torch.cuda.is_available()}, cpus {os.cpu_count()}')
            state['stage'] = 'code'
            if not os.path.isdir(sam):
                unzip(SAM_ZIP, sam)
            state['stage'] = 'packages'
            frozen = subprocess.run([sys.executable, '-m', 'pip', 'freeze'], capture_output=True, text=True).stdout
            pins = [line for line in frozen.splitlines() if re.match(r'(?i)^(torch|torchvision|torchaudio|numpy)==', line)]
            with open(os.path.join(work, 'pins.txt'), 'w') as f:
                f.write('\n'.join(pins) + '\n')
            note('kept as they are: ' + ', '.join(pins))
            run([sys.executable, '-m', 'pip', 'install', '--no-cache-dir', '--progress-bar', 'off', '-c', os.path.join(work, 'pins.txt'), *PACKAGES])
            state['stage'] = 'dinov3'
            hub = os.path.join(torch_home, 'hub')
            target = os.path.join(hub, 'facebookresearch_dinov3_main')   # torch.hub's own cache name: it is used as it is, with no call to GitHub's API
            if not os.path.isdir(target):
                os.makedirs(hub, exist_ok=True)
                unzip(DINOV3_ZIP, target)
            state['stage'] = 'model'
            importlib.invalidate_caches()
            from huggingface_hub import snapshot_download
            where = os.path.join(sam, 'checkpoints', 'sam-3d-body-dinov3')
            tic = time.time()
            snapshot_download(CHECKPOINT, local_dir=where, token=hf or None)
            for root, _, files in os.walk(where):
                for name in files:
                    p = os.path.join(root, name)
                    if '.cache' not in p:
                        note(f'{os.path.relpath(p, where)} {os.path.getsize(p) / 1e6:.1f} MB')
            note(f'checkpoint in {time.time() - tic:.0f} s')
            state['stage'] = 'ready'
            note(f'READY after {time.time() - state["began"]:.0f} s')
        except BaseException as e:   # noqa: BLE001 - the stage and the reason are what the caller needs
            state['failed'] = hide(f'{type(e).__name__}: {e}')
            state['stage'] = 'failed'
            note('FAILED ' + state['failed'])

    def tail(path, start=None, most=6000):
        if not os.path.exists(path):
            return '', 0
        size = os.path.getsize(path)
        with open(path, 'rb') as f:
            f.seek(max(0, size - most) if start is None else min(start, size))
            return hide(f.read().decode('utf-8', 'replace')), size

    safe = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]*$')

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def reply(self, code, body, kind='application/json'):
            data = body if isinstance(body, bytes) else json.dumps(body).encode()
            self.send_response(code)
            self.send_header('Content-Type', kind)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def allowed(self):
            if hmac.compare_digest(self.headers.get('X-Sam-Prov', '').encode(), secret.encode()):
                return True
            self.reply(403, {'error': 'forbidden'})
            return False

        def do_GET(self):
            if not self.allowed():
                return
            url = urllib.parse.urlsplit(self.path)
            parts = [p for p in url.path.split('/') if p]
            if parts == ['status']:
                log, _ = tail(log_file)
                return self.reply(200, {'stage': state['stage'], 'failed': state['failed'], 'seconds': round(time.time() - state['began']), 'log': log,
                                        'jobs': {k: {'done': j['proc'].poll() is not None, 'code': j['proc'].returncode} for k, j in state['jobs'].items()}})
            if len(parts) == 2 and parts[0] == 'job' and parts[1] in state['jobs']:
                job = state['jobs'][parts[1]]
                start = int(urllib.parse.parse_qs(url.query).get('from', ['0'])[0])
                log, size = tail(job['log'], start)
                return self.reply(200, {'done': job['proc'].poll() is not None, 'code': job['proc'].returncode, 'log': log, 'size': size})
            if len(parts) >= 2 and parts[0] == 'out' and all(safe.match(p) for p in parts[1:]):
                path = os.path.join(work, *parts)
                if os.path.isfile(path):
                    with open(path, 'rb') as f:
                        return self.reply(200, f.read(), 'application/octet-stream')
            return self.reply(404, {'error': 'not found'})

        def do_PUT(self):
            if not self.allowed():
                return
            parts = [p for p in urllib.parse.urlsplit(self.path).path.split('/') if p]
            if len(parts) != 2 or parts[0] != 'in' or not safe.match(parts[1]):
                return self.reply(404, {'error': 'not found'})
            left = int(self.headers.get('Content-Length', '0'))
            with open(os.path.join(work, 'in', parts[1]), 'wb') as f:
                while left > 0:
                    chunk = self.rfile.read(min(left, 1 << 20))
                    if not chunk:
                        break
                    f.write(chunk)
                    left -= len(chunk)
            return self.reply(200, {'saved': parts[1]})

        def do_POST(self):
            if not self.allowed():
                return
            if urllib.parse.urlsplit(self.path).path != '/job':
                return self.reply(404, {'error': 'not found'})
            body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', '0'))) or b'{}')
            cmd = [sys.executable if c == 'PYTHON' else str(c) for c in body.get('cmd', [])]
            if not cmd:
                return self.reply(400, {'error': 'no cmd'})
            key = str(len(state['jobs']) + 1)
            path = os.path.join(work, f'job-{key}.log')
            with open(path, 'w', encoding='utf-8') as f:
                f.write('$ ' + ' '.join(cmd) + '\n')
            out = open(path, 'a', encoding='utf-8')
            state['jobs'][key] = {'proc': subprocess.Popen(cmd, stdout=out, stderr=subprocess.STDOUT, cwd=work), 'log': path}
            return self.reply(200, {'job': key})

    threading.Thread(target=setup, daemon=True).start()
    http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()


# ── At home: the box and the comparison ─────────────────────────────────────────

def lens():
    """The play lens as docka.py reads it out of table-lens.ts: height, tilt (radians), focal length, picture's middle."""
    sys.path.insert(0, HERE)
    from docka import play_lens
    cam, _ = play_lens()
    return cam


def to_camera(cam, p):
    """Lens world (x right, y up, z toward the player) to the camera's frame (x right, y down, z into the picture)."""
    import numpy as np
    p = np.asarray(p, float)
    c, s = math.cos(cam.t), math.sin(cam.t)
    dx, dy, dz = p[..., 0], p[..., 1] - cam.h, p[..., 2]
    return np.stack([dx, -(dy * c - dz * s), -dy * s - dz * c], axis=-1)


def from_camera(cam, q):
    import numpy as np
    q = np.asarray(q, float)
    c, s = math.cos(cam.t), math.sin(cam.t)
    x, y, z = q[..., 0], q[..., 1], q[..., 2]
    return np.stack([x, -y * c - z * s + cam.h, y * s - z * c], axis=-1)


def pixels(cam, q):
    import numpy as np
    q = np.asarray(q, float)
    return np.stack([cam.cx + cam.f * q[..., 0] / q[..., 2], cam.cy + cam.f * q[..., 1] / q[..., 2]], axis=-1)


TIPS = (4, 8, 12, 16, 20)            # MediaPipe's hand: the thumb's, index's, middle, ring and little finger's tips
FINGERS = ('thumb', 'index', 'middle', 'ring', 'pinky')   # SAM's (MHR70) names for the same five: right-thumb-tip and so on


def truth_points(truth):
    """Per joint name, the figure's own points per frame in the lens world."""
    import numpy as np
    frames = truth['frames']
    out = {f'{side}.{j}': np.array([f[side][j] for f in frames], float) for side in 'RL' for j in 'sew'}
    out['h'] = np.array([f['h'] for f in frames], float)
    for side in 'RL':
        for n, tip in enumerate(TIPS):
            out[f'{side}.t{n}'] = np.array([f[side]['p'][tip] if f[side].get('p') else [np.nan] * 3 for f in frames], float)
    return out


def ruta(truth_file):
    import numpy as np
    cam, truth = lens(), json.load(open(truth_file, encoding='utf-8'))
    pts = truth_points(truth)
    head = pts['h']
    every = np.concatenate([v for v in pts.values()] + [head + [0, 0.14, 0], head + [0.1, 0, 0], head - [0.1, 0, 0]], axis=0)
    every = every[~np.isnan(every).any(axis=1)]
    px = pixels(cam, to_camera(cam, every))
    (x0, y0), (x1, y1) = px.min(axis=0), px.max(axis=0)
    room = 0.15 * max(x1 - x0, y1 - y0)
    box = [max(0, x0 - room), max(0, y0 - room), min(2 * cam.cx, x1 + room), min(2 * cam.cy, y1 + room)]
    print(','.join(str(int(round(v))) for v in box))


def sam_index(names):
    """The joints compared, as SAM's 70 key points name them."""
    plain = [n.lower().replace('-', '_').replace(' ', '_') for n in names]
    find = lambda name: plain.index(name)
    index = {}
    for side, word in (('R', 'right'), ('L', 'left')):
        index[f'{side}.s'], index[f'{side}.e'], index[f'{side}.w'] = find(f'{word}_shoulder'), find(f'{word}_elbow'), find(f'{word}_wrist')
        for n, finger in enumerate(FINGERS):
            index[f'{side}.t{n}'] = find(f'{word}_{finger}_tip')
    index['ears'] = (find('left_ear'), find('right_ear'))
    return index


GROUPS = (('axlar', ('R.s', 'L.s')), ('armbagar', ('R.e', 'L.e')), ('handleder', ('R.w', 'L.w')), ('huvud', ('h',)),
          ('fingertoppar', tuple(f'{s}.t{n}' for s in 'RL' for n in range(5))))
BODY = ('R.s', 'L.s', 'R.e', 'L.e', 'R.w', 'L.w', 'h')


def errors(got, real, keys):
    """Median of the error's three parts and of its length, and the worst tenth's length, in cm, over the frames and joints given."""
    import numpy as np
    e = np.concatenate([got[k] - real[k] for k in keys if k in got], axis=0)
    e = e[~np.isnan(e).any(axis=1)]
    if not len(e):
        return None
    d = np.linalg.norm(e, axis=1)
    cm = lambda v: round(float(v) * 100, 1)
    return {'sidled': cm(np.median(np.abs(e[:, 0]))), 'hojd': cm(np.median(np.abs(e[:, 1]))), 'djup': cm(np.median(np.abs(e[:, 2]))),
            'median': cm(np.median(d)), 'samsta_tiondel': cm(np.percentile(d, 90)), 'djup_samsta_tiondel': cm(np.percentile(np.abs(e[:, 2]), 90)), 'punkter': int(len(e))}


def motion_only(got, real, keys):
    """The same after taking each joint's own constant offset away: how well the joint's movement through the film is followed."""
    import numpy as np
    moved = {}
    for k in keys:
        if k in got:
            e = got[k] - real[k]
            moved[k] = got[k] - np.nanmean(e, axis=0)
    return errors(moved, real, keys)


def fitted(got, real):
    """One scale and one shift for the whole film, fitted on the body's joints (least squares), applied to every point."""
    import numpy as np
    P = np.concatenate([got[k] for k in BODY], axis=0)
    Q = np.concatenate([real[k] for k in BODY], axis=0)
    ok = ~(np.isnan(P).any(axis=1) | np.isnan(Q).any(axis=1))
    P, Q = P[ok], Q[ok]
    pm, qm = P.mean(axis=0), Q.mean(axis=0)
    s = float(((P - pm) * (Q - qm)).sum() / ((P - pm) ** 2).sum())
    t = qm - s * pm
    return {k: s * v + t for k, v in got.items()}, s, t


def bones(points, scale=1.0):
    import numpy as np
    out = {}
    for side in 'RL':
        for name, a, b in (('overarm', 's', 'e'), ('underarm', 'e', 'w')):
            d = np.linalg.norm(points[f'{side}.{a}'] - points[f'{side}.{b}'], axis=1) * scale
            d = d[~np.isnan(d)]
            out[f'{side}.{name}'] = {'medel': round(float(d.mean()), 3), 'min': round(float(d.min()), 3), 'max': round(float(d.max()), 3), 'spridning': round(float(d.std()), 3)}
    return out


def table(rows):
    head = f"{'':28s} {'sidled':>7s} {'hojd':>6s} {'djup':>6s} {'median':>7s} {'samsta 10 %':>11s}"
    lines = [head]
    for label, r in rows:
        lines.append(f'{label:28s} ' + ('-' if r is None else f"{r['sidled']:7.1f} {r['hojd']:6.1f} {r['djup']:6.1f} {r['median']:7.1f} {r['samsta_tiondel']:11.1f}"))
    return '\n'.join(lines)


def ledger(sam_file):
    """The machines the run's folder paid for (sam_runpod.ts writes liggare.json beside sam.json), if it is there."""
    book = os.path.join(os.path.dirname(os.path.abspath(sam_file)), 'liggare.json')
    if not os.path.exists(book):
        return None
    pods = json.load(open(book, encoding='utf-8'))['pods']
    return {'maskiner': [{k: p.get(k) for k in ('gpu', 'cloud', 'perHour', 'created', 'minutes', 'usd')} for p in pods],
            'minuter': round(sum(p.get('minutes') or 0 for p in pods), 2), 'usd_skattat': round(sum(p.get('usd') or 0 for p in pods), 4)}


def jamfor(sam_file, truth_file, measured, out_file):
    import glob
    import numpy as np
    sys.path.insert(0, HERE)
    from lyft import lift, HAND_AT_SHOE, HAND_AT_CARD
    from monster import smooth
    cam = lens()
    sam, truth = json.load(open(sam_file, encoding='utf-8')), json.load(open(truth_file, encoding='utf-8'))
    real_world = truth_points(truth)
    n_truth = len(truth['frames'])
    # The frames SAM read: their number is in the picture's name (r000.png is frame 0).
    shots = sorted(sam['pictures'], key=lambda p: p['picture'])
    frames = [int(''.join(ch for ch in os.path.basename(p['picture']) if ch.isdigit())) for p in shots]
    assert all(0 <= k < n_truth for k in frames), frames
    real = {k: to_camera(cam, v[frames]) for k, v in real_world.items()}
    index = sam_index(sam['keypointNames'])
    kp = np.array([p['keypoints'] for p in shots], float)       # frames x 70 x 3, the camera's frame
    seen_px = np.array([p['pixels'] for p in shots], float)
    got = {k: kp[:, i] for k, i in index.items() if k != 'ears'}
    got['h'] = kp[:, list(index['ears'])].mean(axis=1)            # the head's middle: halfway between the ears
    # Did SAM find the figure at all: its own 2D points against the figure's true joints through the lens.
    found = {}
    for k in ('R.s', 'L.s', 'R.e', 'L.e', 'R.w', 'L.w'):
        found[k] = round(float(np.median(np.linalg.norm(seen_px[:, index[k]] - pixels(cam, real[k]), axis=1))), 1)
    sam_fit, scale, shift = fitted(got, real)
    # What the lift is given: where the trunk sits. SAM moved, unscaled, so that its shoulders' middle over the film is the true one.
    trunk = np.nanmean(np.concatenate([real['R.s'], real['L.s']]) - np.concatenate([got['R.s'], got['L.s']]), axis=0)
    sam_trunk = {k: v + trunk for k, v in got.items()}
    # The MediaPipe lift of lyft.py prov, on the same film and the same frames.
    raw = json.load(open(sorted(glob.glob(os.path.join(measured, 'rorelse-*.json')))[0], encoding='utf-8'))
    n = min(len(raw['frames']), n_truth)
    felt = {s: {j: np.array([[f[s][j][0], -f[s][j][2], f[s][j][1]] for f in truth['frames'][:n]]) for j in 'sew'} for s in 'LR'}
    away = float(np.mean([felt[s]['s'][:, 1].mean() for s in 'LR']))
    upper = float(np.mean([np.linalg.norm(felt[s]['s'] - felt[s]['e'], axis=1).mean() for s in 'LR']))
    fore = float(np.mean([np.linalg.norm(felt[s]['e'] - felt[s]['w'], axis=1).mean() for s in 'LR']))
    held = {'L': {k: HAND_AT_SHOE for k in range(max(truth['leavesShoe'] - 3, 0), truth['leavesShoe'] + 1)}, 'R': {k: HAND_AT_CARD for k in range(truth['rests'] - 1, min(truth['rests'] + 3, n))}}
    lifted = lift(cam, raw, 0, n - 1, away, upper, fore, edge=-truth['hip'][2] - 0.15, held=held)
    as_lens = lambda p: [p[0], p[2], -p[1]]
    mp_all = {f'{s}.{j}': np.array([as_lens(g[s][j]) for g in lifted]) for s in 'RL' for j in 'sew'}
    mp_all['h'] = np.array([as_lens(g['h']) for g in lifted])
    for s in 'RL':
        for m, tip in enumerate(TIPS):
            mp_all[f'{s}.t{m}'] = np.array([as_lens(g[s]['p'][tip]) if g[s]['p'] is not None else [np.nan] * 3 for g in lifted])
    mp = {k: to_camera(cam, v[frames]) for k, v in mp_all.items()}
    mp_fit, mp_scale, _ = fitted(mp, real)
    report = {}
    for label, pts in (('sam_ra', got), ('sam_passad', sam_fit), ('sam_balen_given', sam_trunk), ('mediapipe_lyftet', mp), ('mediapipe_lyftet_passat', mp_fit)):
        report[label] = {name: errors(pts, real, keys) for name, keys in GROUPS}
        report[label]['per_led'] = {k: errors(pts, real, (k,)) for k in BODY}
        report[label]['bara_rorelsen'] = {name: motion_only(pts, real, keys) for name, keys in GROUPS}
    # How much nearer the camera each wrist and elbow is than its shoulder, along the felt: what lift() takes from MediaPipe as nearer.
    along = lambda q: -from_camera(cam, q)[..., 2]
    world = np.array([f['pose']['world'] for f in raw['frames'][:n]], float)
    mp_away = -world[:, :, 1] * math.sin(cam.t) + world[:, :, 2] * math.cos(cam.t)
    nearer = {}
    for side, (s_i, e_i, w_i) in (('L', (11, 13, 15)), ('R', (12, 14, 16))):
        truth_sw = along(real[f'{side}.s']) - along(real[f'{side}.w'])
        truth_se = along(real[f'{side}.s']) - along(real[f'{side}.e'])
        sam_sw = along(got[f'{side}.s']) - along(got[f'{side}.w'])
        sam_se = along(got[f'{side}.s']) - along(got[f'{side}.e'])
        mp_sw = smooth(mp_away[:, s_i] - mp_away[:, w_i], 5)[frames]
        mp_se = smooth(mp_away[:, s_i] - mp_away[:, e_i], 5)[frames]
        cm = lambda v: round(float(np.median(np.abs(v))) * 100, 1)
        nearer[side] = {'handled_mot_axel': {'sam': cm(sam_sw - truth_sw), 'mediapipe': cm(mp_sw - truth_sw), 'sant_omfang_cm': [round(float(truth_sw.min()) * 100, 1), round(float(truth_sw.max()) * 100, 1)]},
                        'armbage_mot_axel': {'sam': cm(sam_se - truth_se), 'mediapipe': cm(mp_se - truth_se)}}
    world_bones = {}
    for side, (s_i, e_i, w_i) in (('L', (11, 13, 15)), ('R', (12, 14, 16))):
        for name, a, b in (('overarm', s_i, e_i), ('underarm', e_i, w_i)):
            d = np.linalg.norm(world[frames, a] - world[frames, b], axis=1)
            world_bones[f'{side}.{name}'] = {'medel': round(float(d.mean()), 3), 'min': round(float(d.min()), 3), 'max': round(float(d.max()), 3), 'spridning': round(float(d.std()), 3)}
    seconds = [p['seconds'] for p in shots]
    result = {
        'about': 'SAM 3D Body (sam-3d-body-dinov3, the body model only, the box and the play lens given) on our own figure\'s film, against the figure\'s own numbers, '
                 'written by live-bj/verktyg/sam_runpod.py jamfor. Errors in cm in the camera\'s frame: sidled x, hojd y, djup z (along the line of sight); median over frames and joints, '
                 'and the worst tenth. sam_ra is as the model gives it; sam_passad after one scale and one shift fitted over the whole film on the body\'s joints; sam_balen_given only moved (not scaled) so that '
                 'its shoulders\' middle over the film is the true one, which is what the lift is given. mediapipe_lyftet is lyft.py\'s lift '
                 '(the prov: it is given the figure\'s true trunk distance and arm lengths) on the same frames. bara_rorelsen takes each joint\'s own constant offset away first. huvud is the head\'s '
                 'middle (SAM: halfway between its ears; the lift: 9 cm behind the eyes). fingertoppar are the five tips of each hand (MediaPipe\'s 4, 8, 12, 16, 20).',
        'facit': os.path.basename(truth_file), 'facit_about': truth.get('about'), 'frames': frames,
        'hittad_px': found, 'hittad_about': 'median pixels between SAM\'s own 2D points and the figure\'s true joints through the lens',
        'passning': {'sam_skala': round(scale, 4), 'sam_flytt_m': [round(float(v), 3) for v in shift], 'sam_balen_flytt_m': [round(float(v), 3) for v in trunk], 'mediapipe_skala': round(mp_scale, 4)},
        **report,
        'benlangder_m': {'sant': bones({k: v for k, v in real.items()}), 'sam_ra': bones(got), 'sam_passad': bones(got, scale), 'mediapipe_egen_kropp': world_bones,
                         'about': 'per frame upper arm (shoulder to elbow) and forearm (elbow to wrist): mean, least, most and spread; mediapipe_egen_kropp is MediaPipe\'s world landmarks, the input the lift starts from'},
        'narmare_cm': nearer, 'narmare_about': 'median error of how much nearer the camera, along the felt, the wrist (and the elbow) is than its shoulder: lyft.py takes this from MediaPipe as nearer',
        'tid': {'sekunder_per_ruta_median': round(float(np.median(seconds)), 2), 'sekunder_per_ruta_max': round(float(np.max(seconds)), 2), 'laddning_s': sam.get('loadSeconds'),
                'hela_korningen_s': sam.get('wallSeconds'), 'kort': sam.get('device'), 'topp_mib': sam.get('peakMiB'), 'rutor': len(shots)},
        'index': {k: v for k, v in index.items()},
        'kostnad': ledger(sam_file),
    }
    os.makedirs(os.path.dirname(os.path.abspath(out_file)), exist_ok=True)
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    print(f"{len(frames)} frames; SAM's 2D points from the true joints (px, median): {found}")
    print(f"scale fitted: SAM {scale:.3f}, shift {np.round(shift, 3).tolist()} m; MediaPipe lift {mp_scale:.3f}")
    for label in report:
        print(f'\n{label}\n' + table([(name, report[label][name]) for name, _ in GROUPS]))
        print('  bara rorelsen, djup: ' + ', '.join(f"{name} {r['djup']}" for name, r in report[label]['bara_rorelsen'].items() if r))
    print('\nnearer (cm, median error):', json.dumps(nearer, ensure_ascii=False))
    print('bones (m):', json.dumps(result['benlangder_m'], ensure_ascii=False))
    print('time:', json.dumps(result['tid'], ensure_ascii=False))
    print(out_file)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] == 'serve':
        return serve()
    if sys.argv[1] == 'ruta':
        return ruta(sys.argv[2])
    if sys.argv[1] == 'jamfor':
        return jamfor(*sys.argv[2:6])
    sys.exit(__doc__)


if __name__ == '__main__':
    main()
