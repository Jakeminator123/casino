"""SAM 3D Body for the lift's depth (lyft.py): reads a person's joints in metres out of key frames of a film, given a
box around the person and the camera. It runs on this computer's processor (no picture leaves it), or for our own
figure's film on a hired machine at RunPod (sam_runpod.ts hires it and sends this file there). live-bj/README.md,
"Djup ur SAM 3D Body", says how it is run, and what the trial on our figure's film and the run on the live table gave.

  SAMPY live-bj/verktyg/sam_runpod.py installera <sam-mapp>
      Sets SAM 3D Body up in <sam-mapp> (../sam-3d-body beside the repository, as dealer3d/tools/docka-sam.py expects
      it; its Python environment <sam-mapp>/.venv, made as the README says): the code from GitHub, DINOv3's code for
      torch.hub, and the checkpoint facebook/sam-3d-body-dinov3 from Hugging Face with HF_TOKEN, read here out of the
      key file in the repository's root and never printed.
  PY live-bj/verktyg/sam_runpod.py rutor <film> <källfil> <mätt-mapp> <ut-mapp> <kamera> [--tider <lyft-mapp>] [--var 5] [--vantan-gles 2] [--tatt 2] [--som <scen.json>]
      The key frames: every --var-th frame of each stretch measured by mat.py (or, with --tider, of each piece lyft.py
      giv lifted: in the waits every --var times --vantan-gles, and with --tatt every frame within that many of the card
      leaving the shoe, the hand-over and the card coming to rest; listed the deals first, then the waits, then the
      denser ones), cut out of the film as mat.py reads it and saved as <ut-mapp>/t<milliseconds>.png, with a box
      around the dealer from MediaPipe's body and hands in that frame, and <ut-mapp>/lista.json with the camera.
      <kamera> is `spelet` (the play lens our figure is filmed through) or a scen.json (the live table's camera).
      --som <scen.json> redraws our figure's frames as that camera's picture (its size, focal length and middle), to
      try SAM at the live picture's scale; only for the trial.
  SAMPY live-bj/verktyg/sam_runpod.py las <ut-mapp> <lista.json> [--tradar 3] [--sort full]
      Reads every picture of the list with the body model and writes <ut-mapp>/sam.json: per picture its time, box,
      the 70 key points in the camera's frame and in the picture, and the seconds it took. On the processor when there
      is no NVIDIA card, at low priority and with --tradar threads (a quarter of the logical processors unless said),
      picking up where it stopped if it is run again. --sort body leaves the hands' own decoder out.
  PY live-bj/verktyg/sam_runpod.py spara <sam.json> <ut.json>
      The answer kept as numbers only (the joints, no pixels, no picture), small enough for data/sam-prov/.
  PY live-bj/verktyg/sam_runpod.py jamfor <sam.json> <the figure's own numbers> <mätt-mapp> <ut.json>
      SAM alone against the truth on our figure's film, joint by joint in the camera's frame (sideways, height, depth):
      as the model gives it, with one scale and one shift fitted over the whole film, and only moved so that the trunk
      stands where it truly does (what the lift is given); beside it the MediaPipe lift of `lyft.py prov` on the same
      frames. Also the arm's bones from frame to frame, what lyft.py takes as `nearer`, the time a frame took, and what a
      hired machine cost (the liggare.json sam_runpod.ts keeps beside sam.json).
  python3 sam_runpod.py serve
      On the hired machine only (sam_runpod.ts starts it): sets SAM 3D Body up there and answers on port 8000, every call
      carrying the run's own secret in the header X-Sam-Prov: GET /status, PUT /in/<name>, POST /job {"cmd": [...]},
      GET /job/<id>?from=<byte>, GET /out/<path>. SAM_PROV_WORK moves its /work, to try it on this computer.

PY is blackjack-dealer/tools/python/.venv/Scripts/python.exe -I; SAMPY is ../sam-3d-body/.venv/Scripts/python.exe -I.
The camera's frame is SAM's: metres, x to the picture's right, y down, z into the picture, the camera at 0. Our
figure's own numbers are in the lens world (x to the picture's right, y up with the felt at 0, z toward the player).
"""
import os, sys, json, math

HERE = os.path.dirname(os.path.abspath(__file__))
CASINO = os.path.dirname(os.path.dirname(HERE))
PORT = 8000
SAM_ZIP = 'https://codeload.github.com/facebookresearch/sam-3d-body/zip/refs/heads/main'
DINOV3_ZIP = 'https://codeload.github.com/facebookresearch/dinov3/zip/refs/heads/main'
CHECKPOINT = 'facebook/sam-3d-body-dinov3'
# What the body model imports at inference (sam_3d_body and DINOv3's hub code), read from the two repositories'
# sources and INSTALL.md / requirements.txt on 2026-11-27. The detector (detectron2), MoGe and SAM 3 are left out.
PACKAGES = ['roma', 'pytorch-lightning', 'yacs', 'omegaconf', 'timm', 'einops', 'opencv-python-headless', 'braceexpand',
            'huggingface_hub', 'ftfy', 'regex', 'scikit-learn', 'submitit', 'termcolor', 'torchmetrics', 'scikit-image', 'pandas']


# ── Setting the model up, here or on the hired machine ──────────────────────────

def unzip(url, target, say):
    """A GitHub branch as a zip (no git needed), unpacked into target; the zip's comment is the commit."""
    import urllib.request, zipfile, shutil, tempfile
    os.makedirs(target, exist_ok=True)
    spare = tempfile.mkdtemp(dir=os.path.dirname(os.path.abspath(target)))
    archive = os.path.join(spare, 'branch.zip')
    urllib.request.urlretrieve(url, archive)
    with zipfile.ZipFile(archive) as z:
        top = z.namelist()[0].split('/')[0]
        z.extractall(spare)
        commit = z.comment.decode('ascii', 'replace')
    for name in os.listdir(os.path.join(spare, top)):
        if not os.path.exists(os.path.join(target, name)):
            shutil.move(os.path.join(spare, top, name), os.path.join(target, name))
    shutil.rmtree(spare)
    say(f'{url} -> {target}, commit {commit}')


def fetch(sam, torch_home, hf, say, stage=lambda name: None):
    """The code, DINOv3's code where torch.hub looks for it (used as it is, with no call to GitHub's API) and the checkpoint."""
    import time, importlib
    stage('code')
    if not os.path.isdir(os.path.join(sam, 'sam_3d_body')):
        unzip(SAM_ZIP, sam, say)
    stage('dinov3')
    target = os.path.join(torch_home, 'hub', 'facebookresearch_dinov3_main')
    if not os.path.isdir(os.path.join(target, 'dinov3')):
        unzip(DINOV3_ZIP, target, say)
    stage('model')
    importlib.invalidate_caches()
    from huggingface_hub import snapshot_download
    where = os.path.join(sam, 'checkpoints', 'sam-3d-body-dinov3')
    tic = time.time()
    snapshot_download(CHECKPOINT, local_dir=where, token=hf or None)
    total = 0
    for root, _, files in os.walk(where):
        for name in files:
            p = os.path.join(root, name)
            if '.cache' not in p:
                total += os.path.getsize(p)
                say(f'{os.path.relpath(p, where)} {os.path.getsize(p) / 1e6:.1f} MB')
    say(f'checkpoint {total / 1e9:.2f} GB in {time.time() - tic:.0f} s')


def hf_token():
    """HF_TOKEN out of the key file in the repository's root; never printed."""
    path = os.path.join(CASINO, '.env.local')
    with open(path, encoding='utf-8') as f:
        for line in f:
            key, _, value = line.strip().partition('=')
            if key.strip() == 'HF_TOKEN' and value.strip():
                return value.strip().strip('"').strip("'")
    sys.exit('HF_TOKEN saknas i nyckelfilen i repots rot.')


def installera(sam):
    sam = os.path.abspath(sam)
    fetch(sam, os.path.join(sam, 'torch'), hf_token(), print)
    size = sum(os.path.getsize(os.path.join(r, n)) for r, _, files in os.walk(sam) for n in files)
    print(f'{sam}: {size / 1e9:.2f} GB in all, the Python environment with it')


# ── On the hired machine ─────────────────────────────────────────────────────────

def serve():
    import hmac, http.server, subprocess, threading, time, urllib.parse, re
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

    def setup():
        try:
            state['stage'] = 'gpu'
            run(['nvidia-smi', '--query-gpu=name,memory.total,memory.free,driver_version', '--format=csv'])
            import torch
            note(f'python {sys.version.split()[0]}, torch {torch.__version__}, cuda {torch.cuda.is_available()}, cpus {os.cpu_count()}')
            state['stage'] = 'packages'
            frozen = subprocess.run([sys.executable, '-m', 'pip', 'freeze'], capture_output=True, text=True).stdout
            pins = [line for line in frozen.splitlines() if re.match(r'(?i)^(torch|torchvision|torchaudio|numpy)==', line)]
            with open(os.path.join(work, 'pins.txt'), 'w') as f:
                f.write('\n'.join(pins) + '\n')
            note('kept as they are: ' + ', '.join(pins))
            run([sys.executable, '-m', 'pip', 'install', '--no-cache-dir', '--progress-bar', 'off', '-c', os.path.join(work, 'pins.txt'), *PACKAGES])
            fetch(sam, torch_home, hf, note, lambda name: state.update(stage=name))
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


# ── Reading the pictures (on the hired machine, or here on the processor) ──────

def las(out, listing, threads=None, kind='full'):
    import time
    began = time.time()
    sam = os.path.abspath(os.environ.get('SAM_3D_BODY') or os.path.join(CASINO, '..', 'sam-3d-body'))
    os.environ.setdefault('TORCH_HOME', os.path.join(sam, 'torch'))
    os.environ.setdefault('MOMENTUM_ENABLED', '0')      # set means off: MHR comes from the checkpoint's own model file
    os.environ['HF_HUB_OFFLINE'] = '1'
    sys.path.insert(0, sam)
    import numpy as np
    import cv2
    import torch
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    if device == 'cpu':
        torch.set_num_threads(int(threads or max(1, (os.cpu_count() or 4) // 4)))
        if os.name == 'nt':   # below normal, so that the computer stays free for the rest
            import ctypes
            kernel = ctypes.windll.kernel32
            kernel.GetCurrentProcess.restype = ctypes.c_void_p
            kernel.SetPriorityClass.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
            kernel.SetPriorityClass(kernel.GetCurrentProcess(), 0x00004000)
    from sam_3d_body import load_sam_3d_body, SAM3DBodyEstimator
    from sam_3d_body.metadata.mhr70 import mhr_names
    if device == 'cpu':   # sam-3d-body sends its batches and a few index tensors to "cuda" by name; on the processor they stay here
        import sam_3d_body.sam_3d_body_estimator as estimator_module
        import sam_3d_body.models.meta_arch.sam3d_body as model_module
        moved = estimator_module.recursive_to
        here_too = lambda x, target, *rest, **named: moved(x, 'cpu' if target == 'cuda' else target, *rest, **named)
        estimator_module.recursive_to = model_module.recursive_to = here_too
        torch.Tensor.cuda = lambda self, *rest, **named: self
    plan = json.load(open(listing, encoding='utf-8'))
    here = os.path.dirname(os.path.abspath(listing))
    cam = plan['camera']
    checkpoint = os.path.join(sam, 'checkpoints', 'sam-3d-body-dinov3')
    model, cfg = load_sam_3d_body(checkpoint_path=os.path.join(checkpoint, 'model.ckpt'), device=device, mhr_path=os.path.join(checkpoint, 'assets', 'mhr_model.pt'))
    if device == 'cpu':   # its backbone runs in bfloat16, which a processor without it does twenty times slower than float32
        model = model.float()
        model.backbone_dtype = torch.float32
    estimator = SAM3DBodyEstimator(model, cfg)
    loaded = time.time() - began
    print(f'LOADED {loaded:.1f}s on {device}' + (f' with {torch.get_num_threads()} threads' if device == 'cpu' else ''), flush=True)
    K = torch.tensor([[[cam['focalPx'], 0, cam['cx']], [0, cam['focalPx'], cam['cy']], [0, 0, 1]]], dtype=torch.float32)
    os.makedirs(out, exist_ok=True)
    answer = os.path.join(out, 'sam.json')
    done = json.load(open(answer, encoding='utf-8'))['pictures'] if os.path.exists(answer) else []   # (also an answer kept by spara: it goes on from that)
    have = {int(round(p['t'] * 1000)) for p in done}

    def save():
        result = {'model': f'{CHECKPOINT}, the body model only, the box and the camera given, inference {kind}', 'camera': cam, 'film': plan.get('film'),
                  'frame': 'metres, the camera\'s frame: x right, y down, z into the picture', 'keypointNames': mhr_names, 'pictures': done,
                  'loadSeconds': round(loaded, 1), 'wallSeconds': round(time.time() - began, 1), 'device': torch.cuda.get_device_name(0) if device == 'cuda' else f'processor, {torch.get_num_threads()} threads',
                  'peakMiB': round(torch.cuda.max_memory_allocated() / 2**20) if device == 'cuda' else None}
        with open(answer + '.tmp', 'w', encoding='utf-8') as f:
            json.dump(result, f, separators=(',', ':'))
        os.replace(answer + '.tmp', answer)

    for entry in plan['pictures']:
        if int(round(entry['t'] * 1000)) in have:
            continue
        bgr = cv2.imread(os.path.join(here, entry.get('file', entry['picture'])), cv2.IMREAD_COLOR)
        if bgr is None or (bgr.shape[1], bgr.shape[0]) != (cam['width'], cam['height']):
            sys.exit(f"{entry['picture']}: not read, or not {cam['width']} x {cam['height']}")
        tic = time.time()
        people = estimator.process_one_image(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), bboxes=np.array([entry['box']], dtype=np.float32), cam_int=K, inference_type=kind)
        if len(people) != 1:
            sys.exit(f"{entry['picture']}: expected one person, got {len(people)}")
        p = people[0]
        shift = np.asarray(p['pred_cam_t'], dtype=np.float64)
        keypoints = np.asarray(p['pred_keypoints_3d'], dtype=np.float64) + shift
        seen = np.asarray(p['pred_keypoints_2d'], dtype=np.float64)[:, :2]
        back = np.stack([cam['focalPx'] * keypoints[:, 0] / keypoints[:, 2] + cam['cx'], cam['focalPx'] * keypoints[:, 1] / keypoints[:, 2] + cam['cy']], axis=-1)
        done.append({'picture': entry['picture'], 't': entry['t'], 'box': entry['box'], 'seconds': round(time.time() - tic, 2), 'camT': np.round(shift, 5).tolist(),
                     'keypoints': np.round(keypoints, 5).tolist(), 'pixels': np.round(seen, 2).tolist(), 'reprojectionMaxPx': round(float(np.abs(back - seen).max()), 3)})
        save()
        print(f"READ {entry['picture']} {done[-1]['seconds']:.2f}s ({len(done)}/{len(plan['pictures'])})", flush=True)
    save()
    print(f'COMPLETE {len(done)} pictures, load {loaded:.1f}s, wall {time.time() - began:.1f}s', flush=True)


def spara(answer, out):
    """SAM's answer kept as numbers only: per picture its time, box, seconds and the 70 key points (0.1 mm); no pixels."""
    data = json.load(open(answer, encoding='utf-8'))
    kept = {k: data.get(k) for k in ('model', 'camera', 'film', 'frame', 'keypointNames', 'loadSeconds', 'wallSeconds', 'device')}
    kept['about'] = 'SAM 3D Body\'s answer (verktyg/sam_runpod.py las), kept by sam_runpod.py spara: the joints and the model\'s numbers, no picture. lyft.py giv --sam reads it.'
    kept['pictures'] = [{'t': p['t'], 'box': p['box'], 'seconds': p['seconds'], 'keypoints': [[round(v, 4) for v in q] for q in p['keypoints']]} for p in sorted(data['pictures'], key=lambda p: p['t'])]
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(kept, f, separators=(',', ':'))
    print(f"{out}: {len(kept['pictures'])} pictures, {os.path.getsize(out) / 1e3:.0f} kB")


# ── The key frames, here ─────────────────────────────────────────────────────────

def play_camera():
    """The play lens as docka.py reads it out of blackjack-dealer/src/table-lens.ts."""
    sys.path.insert(0, HERE)
    from docka import play_lens
    cam, _ = play_lens()
    return cam


def camera_of(name, size):
    """focal length and middle of `spelet` (the play lens) or of a scen.json's camera, with the picture's size."""
    if name == 'spelet':
        c = play_camera()
        return {'focalPx': c.f, 'cx': c.cx, 'cy': c.cy, 'width': size[0], 'height': size[1]}
    c = json.load(open(name, encoding='utf-8'))['camera']
    return {'focalPx': c['focalPx'], 'cx': c['principalPoint'][0], 'cy': c['principalPoint'][1], 'width': size[0], 'height': size[1]}


def box_of(frame, width, height):
    """The dealer's box in the picture: MediaPipe's body (to the hips) and hands, the crown above the nose, and room."""
    import numpy as np
    pose = np.array([p[:2] for p in frame['pose']['image'][:25]], float)
    every = np.concatenate([pose] + [np.array(h['image'], float)[:, :2] for h in frame['hands'].values()])
    (x0, y0), (x1, y1) = every.min(axis=0), every.max(axis=0)
    nose, shoulders = pose[0, 1], (pose[11, 1] + pose[12, 1]) / 2
    y0 = min(y0, nose - 2.2 * (shoulders - nose))
    room = 0.15 * max(x1 - x0, y1 - y0)
    return [round(max(0.0, x0 - room), 1), round(max(0.0, y0 - room), 1), round(min(width - 1.0, x1 + room), 1), round(min(height - 1.0, y1 + room), 1)]


def events(piece):
    """In a lifted deal: the frames where the card leaves the shoe, where the right hand takes it over, and where it rests."""
    frames, out = piece['frames'], [piece['leavesShoe'], piece['rests']]
    for k in range(piece['leavesShoe'] + 1, piece['rests'] + 1):
        r, c = frames[k]['R'], frames[k]['card']['c']
        grip = [(a + b) / 2 for a, b in zip(r['p'][4], r['p'][8])] if r['p'] else r['w']
        if c and max(abs(a - b) for a, b in zip(c, grip)) < 1e-3:
            out.append(k)
            break
    return out


def rutor(film, source_file, measured, out, camera, times=None, every=5, dense=0, like=None, wait_factor=1):
    import glob
    import numpy as np
    import cv2
    source = json.load(open(source_file, encoding='utf-8'))
    crop = source['crop']
    stretches = [json.load(open(p, encoding='utf-8')) for p in sorted(glob.glob(os.path.join(measured, 'rorelse-*.json')))]
    by_ms = {}
    for st in stretches:
        for k, f in enumerate(st['frames']):
            by_ms[int(round(f['t'] * 1000))] = (st, k)
    wanted, order = set(), {}   # order: the deals' frames first, then the waits', then the denser ones
    if times:
        for name in sorted(glob.glob(os.path.join(times, '*.json'))):
            piece = json.load(open(name, encoding='utf-8'))
            ts = [f['t'] for f in piece['frames']]
            deal = 'leavesShoe' in piece
            step = every if deal else every * wait_factor
            for k in set(range(0, len(ts), step)) | {len(ts) - 1}:
                ms = int(round(ts[k] * 1000))
                order[ms] = min(order.get(ms, 9), 0 if deal else 1)
            if dense and deal:
                for k in events(piece):
                    for j in range(max(0, k - dense), min(len(ts), k + dense + 1)):
                        ms = int(round(ts[j] * 1000))
                        order[ms] = min(order.get(ms, 9), 2)
        wanted = set(order)
    else:
        for st in stretches:
            ts = [f['t'] for f in st['frames']]
            wanted |= {int(round(ts[k] * 1000)) for k in range(0, len(ts), every)}
    missing = sorted(ms for ms in wanted if ms not in by_ms or by_ms[ms][0]['frames'][by_ms[ms][1]]['pose'] is None)
    if missing:
        print(f'{len(missing)} key frames without a measured body are left out: {missing[:8]} ...')
    wanted -= set(missing)
    size = (crop['width'], crop['height'])
    cam = camera_of(camera, size)
    if like:   # the frame redrawn as another camera's picture: scaled to its focal length, the middle put on its middle
        other = camera_of(like, size)
        target = (int(round(2 * other['cx'] + 1)), int(round(2 * other['cy'] + 1)))
        s = other['focalPx'] / cam['focalPx']
        new = (int(round(size[0] * s)), int(round(size[1] * s)))
        sx, sy = new[0] / size[0], new[1] / size[1]
        ox, oy = int(round(other['cx'] - ((cam['cx'] + 0.5) * sx - 0.5))), int(round(other['cy'] - ((cam['cy'] + 0.5) * sy - 0.5)))
        moved = lambda x, y: ((x + 0.5) * sx - 0.5 + ox, (y + 0.5) * sy - 0.5 + oy)
        cx, cy = moved(cam['cx'], cam['cy'])
        cam = {'focalPx': round(cam['focalPx'] * (sx + sy) / 2, 3), 'cx': round(cx, 3), 'cy': round(cy, 3), 'width': target[0], 'height': target[1]}
    os.makedirs(out, exist_ok=True)
    plan = []
    cap = cv2.VideoCapture(film)
    for st in stretches:
        mine = sorted((st['frames'][by_ms[ms][1]]['f'], ms) for ms in wanted if by_ms[ms][0] is st)
        if not mine:
            continue
        needed = dict(mine)
        cap.set(cv2.CAP_PROP_POS_FRAMES, st['frames'][0]['f'])    # as mat.py reads it: from the stretch's first frame, straight through
        index = st['frames'][0]['f']
        while index <= mine[-1][0]:
            ok, full = cap.read()
            if not ok:
                break
            if index in needed:
                ms = needed[index]
                frame = st['frames'][by_ms[ms][1]]
                pic = full[crop['y']:crop['y'] + crop['height'], crop['x']:crop['x'] + crop['width']]
                box = box_of(frame, *size)
                if like:
                    small = cv2.resize(pic, new, interpolation=cv2.INTER_AREA)
                    edge = np.median(np.concatenate([pic[0], pic[-1], pic[:, 0], pic[:, -1]]), axis=0)
                    pic = np.empty((target[1], target[0], 3), np.uint8)
                    pic[:] = edge.astype(np.uint8)
                    pic[oy:oy + new[1], ox:ox + new[0]] = small
                    box = [round(v, 1) for v in (*moved(box[0], box[1]), *moved(box[2], box[3]))]
                name = f't{ms:07d}.png'
                cv2.imwrite(os.path.join(out, name), pic)
                plan.append({'picture': name, 't': ms / 1000, 'box': box})
            index += 1
    cap.release()
    plan.sort(key=lambda p: (order.get(int(round(p['t'] * 1000)), 0), p['t']))   # a reading stopped early has the deals whole
    with open(os.path.join(out, 'lista.json'), 'w', encoding='utf-8') as f:
        json.dump({'about': 'Key frames for SAM 3D Body (sam_runpod.py las), written by sam_runpod.py rutor: the picture, its time in the film, the box around the dealer (x0, y0, x1, y1).',
                   'film': os.path.basename(film), 'camera': cam, 'pictures': plan}, f, indent=1)
    count = lambda level: sum(1 for p in plan if order.get(int(round(p['t'] * 1000)), 0) == level)
    print(f"{len(plan)} key frames ({count(0)} in the deals, {count(1)} in the waits, {count(2)} denser round the card's moments) in {out}, "
          f"{cam['width']} x {cam['height']}, focal {cam['focalPx']}, middle {cam['cx']}, {cam['cy']}")


# ── SAM alone against our figure's own numbers ──────────────────────────────────

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
    cam = play_camera()
    sam, truth = json.load(open(sam_file, encoding='utf-8')), json.load(open(truth_file, encoding='utf-8'))
    real_world = truth_points(truth)
    n_truth = len(truth['frames'])
    shots = sorted(sam['pictures'], key=lambda p: p['t'])
    frames = [int(round(p['t'] * truth['fps'])) for p in shots]
    assert all(0 <= k < n_truth for k in frames), frames
    real = {k: to_camera(cam, v[frames]) for k, v in real_world.items()}
    index = sam_index(sam['keypointNames'])
    kp = np.array([p['keypoints'] for p in shots], float)       # frames x 70 x 3, the camera's frame
    seen_px = np.array([p['pixels'] for p in shots], float)
    got = {k: kp[:, i] for k, i in index.items() if k != 'ears'}
    got['h'] = kp[:, list(index['ears'])].mean(axis=1)            # the head's middle: halfway between the ears
    # Did SAM find the figure at all: its own 2D points against the figure's true joints, through the camera it was given.
    lens = sam['camera']
    found = {}
    for k in ('R.s', 'L.s', 'R.e', 'L.e', 'R.w', 'L.w'):
        q = real[k]
        truth_px = np.stack([lens['cx'] + lens['focalPx'] * q[:, 0] / q[:, 2], lens['cy'] + lens['focalPx'] * q[:, 1] / q[:, 2]], axis=-1)
        found[k] = round(float(np.median(np.linalg.norm(seen_px[:, index[k]] - truth_px, axis=1))), 1)
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
    true_bones, sam_bones = bones(real), bones(got)
    correction = {name: round(float(np.mean([true_bones[f'{s}.{name}']['medel'] - sam_bones[f'{s}.{name}']['medel'] for s in 'RL'])), 3) for name in ('overarm', 'underarm')}
    seconds = [p['seconds'] for p in shots]
    result = {
        'about': 'SAM 3D Body (sam-3d-body-dinov3, the body model only, the box and the camera given) on our own figure\'s film, against the figure\'s own numbers, '
                 'written by live-bj/verktyg/sam_runpod.py jamfor. Errors in cm in the camera\'s frame: sidled x, hojd y, djup z (along the line of sight); median over frames and joints, '
                 'and the worst tenth. sam_ra is as the model gives it; sam_passad after one scale and one shift fitted over the whole film on the body\'s joints; sam_balen_given only moved (not scaled) so that '
                 'its shoulders\' middle over the film is the true one, which is what the lift is given. mediapipe_lyftet is lyft.py\'s lift '
                 '(the prov: it is given the figure\'s true trunk distance and arm lengths) on the same frames. bara_rorelsen takes each joint\'s own constant offset away first. huvud is the head\'s '
                 'middle (SAM: halfway between its ears; the lift: 9 cm behind the eyes). fingertoppar are the five tips of each hand (MediaPipe\'s 4, 8, 12, 16, 20). '
                 'benlangder_m.rattelse is what SAM\'s mean upper arm and forearm lack against the figure\'s: lyft.py giv --sam adds it to the live dealers\' bones.',
        'facit': os.path.basename(truth_file), 'facit_about': truth.get('about'), 'kamera': lens, 'frames': frames,
        'hittad_px': found, 'hittad_about': 'median pixels between SAM\'s own 2D points and the figure\'s true joints through the camera SAM was given',
        'passning': {'sam_skala': round(scale, 4), 'sam_flytt_m': [round(float(v), 3) for v in shift], 'sam_balen_flytt_m': [round(float(v), 3) for v in trunk], 'mediapipe_skala': round(mp_scale, 4)},
        **report,
        'benlangder_m': {'sant': true_bones, 'sam_ra': sam_bones, 'sam_passad': bones(got, scale), 'mediapipe_egen_kropp': world_bones, 'rattelse': correction,
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
    print(f"scale fitted: SAM {scale:.3f}, shift {np.round(shift, 3).tolist()} m; MediaPipe lift {mp_scale:.3f}; bones short by {correction}")
    for label in report:
        print(f'\n{label}\n' + table([(name, report[label][name]) for name, _ in GROUPS]))
        print('  bara rorelsen, djup: ' + ', '.join(f"{name} {r['djup']}" for name, r in report[label]['bara_rorelsen'].items() if r))
    print('\nnearer (cm, median error):', json.dumps(nearer, ensure_ascii=False))
    print('time:', json.dumps(result['tid'], ensure_ascii=False))
    print(out_file)


def main():
    args = sys.argv[1:]
    option = lambda name, default=None: args[args.index(name) + 1] if name in args else default
    plain = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or not args[i - 1].startswith('--'))]
    if not plain:
        sys.exit(__doc__)
    if plain[0] == 'serve':
        return serve()
    if plain[0] == 'installera':
        return installera(plain[1])
    if plain[0] == 'las':
        return las(plain[1], plain[2], option('--tradar'), option('--sort', 'full'))
    if plain[0] == 'rutor':
        return rutor(*plain[1:6], times=option('--tider'), every=int(option('--var', '5')), dense=int(option('--tatt', '0')), like=option('--som'), wait_factor=int(option('--vantan-gles', '1')))
    if plain[0] == 'jamfor':
        return jamfor(*plain[1:5])
    if plain[0] == 'spara':
        return spara(plain[1], plain[2])
    sys.exit(__doc__)


if __name__ == '__main__':
    main()
