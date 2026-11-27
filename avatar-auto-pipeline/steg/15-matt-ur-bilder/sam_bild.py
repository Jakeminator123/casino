"""SAM 3D Body på en persons egna stillbilder (steg 15, matt_ur_bilder.py anropar det själv): kroppens 70 punkter och
hela kroppens yta i meter, ur varje bild för sig, på den här datorns processor. Ingen bild lämnar datorn.

Körs med SAM 3D Body:s egen Python-miljö (../sam-3d-body/.venv bredvid repot, uppsatt som live-bj/README.md "Djup ur
SAM 3D Body" säger; SAM_3D_BODY pekar ut en annan mapp):
    ../sam-3d-body/.venv/Scripts/python.exe -I steg/15-matt-ur-bilder/sam_bild.py <lista.json> <ut-mapp> [--tradar 3]
<lista.json> är {"bilder": [{"namn": ..., "fil": <sökväg>, "ruta": [x0, y0, x1, y1]}]}, rutan kring personen i
bildpunkter (matt_ur_bilder.py tar den ur MediaPipes kropp). Kameran ges inte: en framställd bild har ingen känd
brännvidd, och SAM skattar då sin egen; kroppens mått i meter är SAM:s egen kroppsform (dess skala och form), inte
kamerans. Skriver <ut-mapp>/<namn>.json (punkterna i kamerans ram: meter, x åt bildens höger, y nedåt, z in i bilden;
punkternas namn; kroppsformens tal) och <ut-mapp>/<namn>.yta.npy (ytans hörn, samma ram). En bild som redan är läst
hoppas över.
"""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
CASINO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

ap = argparse.ArgumentParser()
ap.add_argument('lista')
ap.add_argument('ut')
ap.add_argument('--tradar', type=int, default=None)
a = ap.parse_args()

plan = json.load(open(a.lista, encoding='utf-8'))['bilder']
os.makedirs(a.ut, exist_ok=True)
kvar = [b for b in plan if not os.path.exists(os.path.join(a.ut, b['namn'] + '.json'))]
if not kvar:
    print('SAM: alla bilder redan lästa', flush=True)
    sys.exit(0)

borjan = time.time()
sam = os.path.abspath(os.environ.get('SAM_3D_BODY') or os.path.join(CASINO, '..', 'sam-3d-body'))
os.environ.setdefault('TORCH_HOME', os.path.join(sam, 'torch'))
os.environ.setdefault('MOMENTUM_ENABLED', '0')
os.environ['HF_HUB_OFFLINE'] = '1'
sys.path.insert(0, sam)
import numpy as np
import cv2
import torch

enhet = 'cuda' if torch.cuda.is_available() else 'cpu'
if enhet == 'cpu':
    # (som live-bj/verktyg/sam_runpod.py las: låg prioritet, en fjärdedel av processorerna, float32 i stället för bfloat16)
    torch.set_num_threads(int(a.tradar or max(1, (os.cpu_count() or 4) // 4)))
    if os.name == 'nt':
        import ctypes
        k = ctypes.windll.kernel32
        k.GetCurrentProcess.restype = ctypes.c_void_p
        k.SetPriorityClass.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
        k.SetPriorityClass(k.GetCurrentProcess(), 0x00004000)
from sam_3d_body import load_sam_3d_body, SAM3DBodyEstimator
from sam_3d_body.metadata.mhr70 import mhr_names
if enhet == 'cpu':
    import sam_3d_body.sam_3d_body_estimator as em
    import sam_3d_body.models.meta_arch.sam3d_body as mm
    flytta = em.recursive_to
    em.recursive_to = mm.recursive_to = lambda x, mal, *r, **n: flytta(x, 'cpu' if mal == 'cuda' else mal, *r, **n)
    torch.Tensor.cuda = lambda self, *r, **n: self
ck = os.path.join(sam, 'checkpoints', 'sam-3d-body-dinov3')
model, cfg = load_sam_3d_body(checkpoint_path=os.path.join(ck, 'model.ckpt'), device=enhet, mhr_path=os.path.join(ck, 'assets', 'mhr_model.pt'))
if enhet == 'cpu':
    model = model.float()
    model.backbone_dtype = torch.float32
est = SAM3DBodyEstimator(model, cfg)
print(f'SAM laddad på {time.time() - borjan:.0f} s ({enhet})', flush=True)

for b in kvar:
    tic = time.time()
    bgr = cv2.imread(b['fil'], cv2.IMREAD_COLOR)
    if bgr is None:
        sys.exit(f"{b['fil']}: gick inte att läsa")
    folk = est.process_one_image(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), bboxes=np.array([b['ruta']], dtype=np.float32), inference_type='full')
    if len(folk) != 1:
        sys.exit(f"{b['namn']}: väntade en person, fick {len(folk)}")
    p = folk[0]
    t = np.asarray(p['pred_cam_t'], dtype=np.float64)
    kp = np.asarray(p['pred_keypoints_3d'], dtype=np.float64) + t
    yta = np.asarray(p['pred_vertices'], dtype=np.float64) + t
    np.save(os.path.join(a.ut, b['namn'] + '.yta.npy'), yta.astype(np.float32))
    ut = {'bild': os.path.basename(b['fil']), 'ruta': b['ruta'], 'sekunder': round(time.time() - tic, 1),
          'modell': 'facebook/sam-3d-body-dinov3, hela läsningen (kropp och händer), rutan given, kameran skattad av SAM',
          'ram': 'meter, kamerans ram: x åt bildens höger, y nedåt, z in i bilden', 'brannvidd_px': float(np.asarray(p['focal_length']).ravel()[0]),
          'punktnamn': list(mhr_names), 'punkter': np.round(kp, 5).tolist(),
          'punkter_i_bilden': np.round(np.asarray(p['pred_keypoints_2d'], dtype=np.float64)[:, :2], 1).tolist(),
          'skala': np.round(np.asarray(p['scale_params'], dtype=np.float64).ravel(), 5).tolist(),
          'form': np.round(np.asarray(p['shape_params'], dtype=np.float64).ravel(), 5).tolist(), 'horn': int(len(yta))}
    with open(os.path.join(a.ut, b['namn'] + '.json'), 'w', encoding='utf-8') as f:
        json.dump(ut, f)
    print(f"SAM {b['namn']}: {ut['sekunder']} s", flush=True)
print(f'SAM klar på {time.time() - borjan:.0f} s', flush=True)
