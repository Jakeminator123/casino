"""Steg 15: en persons mått ur sina egna bilder, gratis och här på datorn (Jakob 2026-11-27: "lägga in bilder och skapa
skelett och även datapunkter för hand och ansikte ... leder och MediaPipe ... SAM 3D").

Läser personens mapp i input/ (1-portratt, 2-helfigur, 3-halvfigur; en bild som saknas hoppas över) och skriver
personens mått som en datafil som Git har, bara tal och inga bilder: personer/<person>.json.
  - Kroppen: lederna och längderna i meter ur SAM 3D Body på helfiguren och halvfiguren (sam_bild.py, i SAM:s egen
    miljö ../sam-3d-body/.venv), och huvudets höjd, bredd och läge ur SAM:s yta (en kropp utan hår).
  - Händerna: 21 punkter per hand ur MediaPipe Hand Landmarker där händerna syns, och handens längd, bredd och
    fingrarnas längder ur SAM:s hand i meter.
  - Ansiktet: 478 punkter ur MediaPipe Face Landmarker på porträttet, och ansiktets mått (ögonen, kinderna, käken,
    hakan) i meter med irisen som skala.
  - Dockan: vilken dealers rörelser personen spelar (--stil, förval kameran: Danilos) och de mått dockan byggs med:
    grunddockans (Danilos eller Frasses, ur scen/bygg_docka.py MATT) utom där personen skiljer sig mer än mätningens
    osäkerhet.
Varje tal säger hur det är mätt och hur säkert det är: mätt (ur bilden, med osäkerheten), skattat (ur ett mätt tal och en
regel) eller antaget (inget i bilden säger det). En framställd bild har ingen skala: metrarna är SAM:s egen kroppsform
(dess skala och form för en människa som ser ut så), prövad mot mannens och Danilos kända mått, och irisen (11,7 mm) i
ansiktet.

Körs med MediaPipes miljö (../blackjack-dealer/tools/python/.venv), från avatar-auto-pipeline/:
    ..\\blackjack-dealer\\tools\\python\\.venv\\Scripts\\python.exe -I steg/15-matt-ur-bilder/matt_ur_bilder.py <person>
        [--namn <docka>] [--stil kameran|bordet] [--ritning <png>] [--facit <nyckel i MATT>]
--namn är dockans namn (små bokstäver; förval förnamnet ur mappens namn), --ritning ritar mätningen över bilderna (skelettet,
handens och ansiktets punkter), --facit jämför med ett mått i MATT som är mätt på annat sätt (tomasz_matt: hans 3D-figur).
Arbetet (MediaPipes punkter och SAM:s svar med ytan) ligger i output/<person>/15-matt-ur-bilder/; SAM körs bara om
dess svar saknas där (1-2 minuter per bild på processorn).
"""
import argparse, json, math, os, re, subprocess, sys, time
from pathlib import Path

import numpy as np
import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions, vision

ROT = Path(__file__).resolve().parents[2]          # avatar-auto-pipeline
CASINO = ROT.parent
MODELLER = Path(os.environ.get('DEALER_MODELS') or CASINO / 'blackjack-dealer' / 'tools' / 'python' / 'models')
SAM = Path(os.environ.get('SAM_3D_BODY') or CASINO.parent / 'sam-3d-body').resolve()
SAMPY = SAM / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
BILDER = {'portratt': 'porträttet', 'helfigur': 'helfiguren', 'halvfigur': 'halvfiguren'}
IRIS_M = 0.0117      # irisens synliga bredd hos en vuxen, 11,7 mm (spridning ±0,5 mm): ansiktets skala
# SAM:s armar läggs inte till med rättelsen ur dockans film (live-bj/data/sam-prov/jamforelse.json: överarmen 0,4 och
# underarmen 1,9 cm kortare än dockans, i en giv med böjda armar): på Tomasz stillbilder gav den armarna 1,2-1,3 cm för
# långa mot facit, utan den 0,8 och -0,6 cm. Osäkerheten per mått är minst felet mot facit (personmatt.KALIBRERING).

# ---------------------------------------------------------------------------------------------------------- bilderna

ap = argparse.ArgumentParser()
ap.add_argument('person')
ap.add_argument('--namn', default=None)
ap.add_argument('--stil', choices=['kameran', 'bordet'], default='kameran')
ap.add_argument('--ritning', default=None)
ap.add_argument('--facit', default=None)
ap.add_argument('--ut', default=None, help='personens datafil (förval personer/<person>.json)')
a = ap.parse_args()
IN = ROT / 'input' / a.person
if not IN.is_dir():
    sys.exit(f'{IN} finns inte: lägg personens bilder i input/{a.person}/')
NAMN = a.namn or re.split(r'[^a-z0-9]', a.person.lower())[0]
if not re.fullmatch(r'[a-z][a-z0-9]*', NAMN):
    sys.exit('--namn tar små bokstäver och siffror, till exempel kenji')
ARB = ROT / 'output' / a.person / '15-matt-ur-bilder'
ARB.mkdir(parents=True, exist_ok=True)
bilder = {}
for f in sorted(IN.iterdir()):
    for k in BILDER:
        if k in f.stem.lower() and f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp'):
            bilder[k] = f
if not bilder:
    sys.exit(f'inga bilder i {IN} (namnen ska innehålla portratt, helfigur eller halvfigur)')
print('BILDER', {k: v.name for k, v in bilder.items()}, flush=True)
las = {k: cv2.imread(str(v), cv2.IMREAD_COLOR) for k, v in bilder.items()}
storlek = {k: (b.shape[1], b.shape[0]) for k, b in las.items()}

# ---------------------------------------------------------------------------------------------------------- MediaPipe

def mp_bild(k):
    return mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(las[k], cv2.COLOR_BGR2RGB))


kropp, mask, hander, ansikte = {}, {}, {}, {}
with vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODELLER / 'pose_landmarker_heavy.task')), num_poses=1,
        output_segmentation_masks=True)) as pl:
    for k in las:
        r = pl.detect(mp_bild(k))
        if r.pose_landmarks:
            w, h = storlek[k]
            kropp[k] = np.array([[p.x * w, p.y * h, p.visibility] for p in r.pose_landmarks[0]])
            mask[k] = r.segmentation_masks[0].numpy_view()[..., 0] > 0.5 if r.segmentation_masks else None
with vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODELLER / 'hand_landmarker.task')), num_hands=2,
        min_hand_detection_confidence=0.2, min_hand_presence_confidence=0.2)) as hl:
    for k in las:
        if k == 'portratt' or k not in kropp:
            continue
        r = hl.detect(mp_bild(k))
        w, h = storlek[k]
        for lm in r.hand_landmarks:
            p = np.array([[q.x * w, q.y * h, q.z * w] for q in lm])
            # sidan ur kroppens handleder (MediaPipes egen handedness räknar med en spegelvänd bild): 15 hans vänstra, 16 hans högra
            sida = 'vanster' if np.linalg.norm(p[0, :2] - kropp[k][15, :2]) < np.linalg.norm(p[0, :2] - kropp[k][16, :2]) else 'hoger'
            hander.setdefault(k, {})[sida] = p
with vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODELLER / 'face_landmarker.task')), num_faces=1,
        min_face_detection_confidence=0.3, min_face_presence_confidence=0.3)) as fl:
    for k in las:
        r = fl.detect(mp_bild(k))
        if r.face_landmarks:
            w, h = storlek[k]
            ansikte[k] = np.array([[q.x * w, q.y * h, q.z * w] for q in r.face_landmarks[0]])
print('MEDIAPIPE kroppen', list(kropp), 'händerna', {k: list(v) for k, v in hander.items()}, 'ansiktet', list(ansikte), flush=True)

# ---------------------------------------------------------------------------------------------------------- SAM 3D Body

def ruta(k):
    """Rutan kring personen: kroppens punkter och masken, med marginal (SAM läser det som är i rutan)."""
    w, h = storlek[k]
    xs, ys = list(kropp[k][:, 0]), list(kropp[k][:, 1])
    if mask.get(k) is not None:
        yy, xx = np.nonzero(mask[k])
        if len(xx):
            xs += [xx.min(), xx.max()]; ys += [yy.min(), yy.max()]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    m = 0.06 * max(x1 - x0, y1 - y0)
    return [float(max(0, x0 - m)), float(max(0, y0 - m)), float(min(w - 1, x1 + m)), float(min(h - 1, y1 + m))]


sam_bilder = [k for k in ('helfigur', 'halvfigur') if k in kropp]
if sam_bilder and any(not (ARB / f'{k}.json').exists() for k in sam_bilder):
    if not SAMPY.exists():
        sys.exit(f'SAM 3D Body saknas ({SAMPY}): sätt upp den som live-bj/README.md "Djup ur SAM 3D Body" säger')
    lista = ARB / 'sam-lista.json'
    lista.write_text(json.dumps({'bilder': [{'namn': k, 'fil': str(bilder[k]), 'ruta': ruta(k)} for k in sam_bilder]}), encoding='utf-8')
    t0 = time.time()
    subprocess.run([str(SAMPY), '-I', str(Path(__file__).with_name('sam_bild.py')), str(lista), str(ARB)], check=True)
    print(f'SAM {time.time() - t0:.0f} s', flush=True)
sam = {k: json.loads((ARB / f'{k}.json').read_text(encoding='utf-8')) for k in sam_bilder if (ARB / f'{k}.json').exists()}
yta = {k: np.load(ARB / f'{k}.yta.npy').astype(np.float64) for k in sam}

# ---------------------------------------------------------------------------------------------------------- måtten

r4 = lambda x: round(float(x), 4)
enhet = lambda v: v / np.linalg.norm(v)


def tal(varde, hur, sakerhet, osaker=None, **mer):
    """Ett mått: värdet (meter), hur det är mätt, hur säkert (mätt, skattat, antaget) och osäkerheten (meter, ±)."""
    t = {'varde': r4(varde), 'sakerhet': sakerhet, 'hur': hur}
    if osaker is not None:
        t['osaker'] = r4(osaker)
    t.update(mer)
    return t


def kroppsram(P):
    """Kroppens egna axlar i kamerans ram: upp (höften till axlarna), hans vänster och fram (mot kameran)."""
    sm = (P['left-shoulder'] + P['right-shoulder']) / 2
    hm = (P['left-hip'] + P['right-hip']) / 2
    upp = enhet(sm - hm)
    vanster = P['left-shoulder'] - P['right-shoulder']; vanster = enhet(vanster - upp * (vanster @ upp))
    fram = np.cross(upp, vanster)
    if fram @ (P['nose'] - P['neck']) < 0:
        fram = -fram
    return sm, hm, upp, vanster, fram


per_bild = {}
for k, s in sam.items():
    P = {n: np.array(p) for n, p in zip(s['punktnamn'], s['punkter'])}
    V = yta[k]
    sm, hm, upp, vanster, fram = kroppsram(P)
    d = lambda x, y: float(np.linalg.norm(P[x] - P[y]))
    m = {'sw': d('left-shoulder', 'right-shoulder'),
         'ua': (d('left-shoulder', 'left-elbow') + d('right-shoulder', 'right-elbow')) / 2,
         'fa': (d('left-elbow', 'left-wrist') + d('right-elbow', 'right-wrist')) / 2,
         'ua_lr': [d('right-shoulder', 'right-elbow'), d('left-shoulder', 'left-elbow')],
         'fa_lr': [d('right-elbow', 'right-wrist'), d('left-elbow', 'left-wrist')],
         'ht': float((sm - hm) @ upp), 'hals': float((P['neck'] - sm) @ upp),
         'hoft_b': d('left-hip', 'right-hip'), 'akromion_b': d('left-acromion', 'right-acromion')}
    # huvudet ur ytan: hjässan högst upp, hakan hudens lägsta punkt på mittlinjen under munnen (som bygg_docka.py matt():
    # högst 2 cm bakom ögonens mitt), bredden i vågräta snitt från 3,5 cm över ögonen (öronens överkant når brynen, så
    # lägre snitt mäter öronen; ANSUR:s huvudbredd är skallens, över öronen)
    ogon = (P['left-eye'] + P['right-eye']) / 2
    rel = V - ogon
    u, x, f = rel @ upp, rel @ vanster, rel @ fram
    nara = np.linalg.norm(rel, axis=1) < 0.2
    hjassa = u[nara].max()
    mitt = nara & (np.abs(x - (P['nose'] - ogon) @ vanster) < 0.006) & (f > -0.02) & (u < -0.07) & (u > -0.17)
    haka = u[mitt].min() if mitt.any() else float('nan')
    huv = nara & (u > 0.035) & (u < hjassa - 0.02)
    bredd = max((np.ptp(x[huv & (np.abs(u - z) < 0.004)]) if (huv & (np.abs(u - z) < 0.004)).sum() > 3 else 0) for z in np.arange(0.035, hjassa - 0.02, 0.004))
    djup = np.ptp(f[nara & (u > 0)])
    m.update({'huvud_h': float(hjassa - haka), 'huvud_b': float(bredd), 'huvud_djup': float(djup),
              'ogon_over_axlar': float((ogon - sm) @ upp), 'haka_over_axlar': float(haka + (ogon - sm) @ upp),
              'hjassa_over_ogon': float(hjassa), 'ogon_avstand': d('left-eye', 'right-eye')})
    if k == 'helfigur':
        uu = V @ upp
        m['langd'] = float(uu.max() - uu.min())
    # handen ur SAM: handleden till långfingrets topp, knogarna (pek till lill) och fingrarna knogen till toppen
    for sida, pre in (('hoger', 'right'), ('vanster', 'left')):
        led = lambda fing, n: P[f'{pre}-{fing}-{n}']
        fingrar = {}
        for fing in ('thumb', 'index', 'middle', 'ring', 'pinky'):
            kedja = [led(fing, 'third-joint'), led(fing, 'second-joint'), led(fing, 'first-joint'), led(fing, 'tip')]
            fingrar[fing] = float(sum(np.linalg.norm(kedja[i + 1] - kedja[i]) for i in range(3)))
        m[f'hand_{sida}'] = {'langd': float(np.linalg.norm(led('middle', 'tip') - P[f'{pre}-wrist'])),
                             'knogar_b': float(np.linalg.norm(led('index', 'third-joint') - led('pinky', 'third-joint'))),
                             'handflata': float(np.linalg.norm(led('middle', 'third-joint') - P[f'{pre}-wrist'])), 'fingrar': fingrar}
    # håret: hjässan på SAM:s yta mot överkanten av personens siluett (MediaPipes mask) i samma bild
    if mask.get(k) is not None:
        fl = s['brannvidd_px']; w, h = storlek[k]
        top = V[np.argmax(V @ upp)]
        rad_hjassa = fl * top[1] / top[2] + h / 2
        kol = int(round(fl * top[0] / top[2] + w / 2))
        kolumn = mask[k][:, max(0, kol - 3):kol + 4].any(axis=1)
        rad_har = int(np.argmax(kolumn)) if kolumn.any() else None
        if rad_har is not None:
            m['har_over_hjassan'] = float((rad_hjassa - rad_har) * top[2] / fl)
    per_bild[k] = m

if not per_bild:
    sys.exit('SAM läste ingen bild: kroppens mått saknas')


def medel(nyckel):
    v = [per_bild[k][nyckel] for k in per_bild if nyckel in per_bild[k] and not math.isnan(per_bild[k][nyckel])]
    return (float(np.mean(v)), float(np.ptp(v)) / 2 if len(v) > 1 else None, v)


matt = {}
kalla_sam = ' och '.join(BILDER[k] for k in per_bild)
sys.path.insert(0, str(Path(__file__).parent))
from personmatt import GRUND_FOR_STIL, KALIBRERING, PASSAS, grundens_matt   # noqa: E402  (talen ur bygg_docka.py MATT, utan Blender)
osakerhet = lambda nyckel, minst, spridning: max(minst, spridning or 0, KALIBRERING['fel'].get(nyckel, 0))
for nyckel, namn, osak_min in (('sw', 'axellederna isär', 0.01), ('ua', 'överarmen, axelled till armbågsled', 0.01),
                               ('fa', 'underarmen, armbågsled till handled', 0.012), ('hals', 'nacken (SAM:s punkt neck) över axellederna', 0.01),
                               ('huvud_h', 'hakan till hjässan (yta utan hår)', 0.008), ('huvud_b', 'huvudets bredd från 3,5 cm över ögonen (yta utan hår)', 0.006),
                               ('huvud_djup', 'huvudets djup (yta)', 0.008), ('ogon_over_axlar', 'ögonens mitt över axellederna', 0.01),
                               ('haka_over_axlar', 'hakan över axellederna', 0.01), ('ogon_avstand', 'ögonen isär (SAM:s punkter)', 0.004),
                               ('hoft_b', 'höftlederna isär', 0.012), ('akromion_b', 'akromion till akromion (axlarnas yttre ben)', 0.012)):
    v, spridning, alla = medel(nyckel)
    matt[nyckel] = tal(v, f'SAM 3D Body på {kalla_sam}: {namn}', 'mätt', osakerhet(nyckel, osak_min, spridning), per_bild=[r4(x) for x in alla])
if 'helfigur' in per_bild:
    matt['ht'] = tal(per_bild['helfigur']['ht'], 'SAM 3D Body på helfiguren (stående): höftledernas mitt till axelledernas, längs bålen (höftlederna syns inte genom byxorna)',
                     'mätt', osakerhet('ht', 0.015, None))
    matt['langd'] = tal(per_bild['helfigur']['langd'], 'SAM 3D Body på helfiguren: ytans höjd från hälen till hjässan, utan skor och hår', 'mätt', 0.03)
har = [per_bild[k]['har_over_hjassan'] for k in per_bild if 'har_over_hjassan' in per_bild[k]]
if har:
    matt['har'] = tal(np.mean(har), 'håret över hjässan: siluettens överkant (MediaPipe) mot hjässan på SAM:s yta, i samma bild', 'skattat', max(0.008, np.ptp(har) / 2), per_bild=[r4(x) for x in har])

hand_matt = {}
for sida in ('hoger', 'vanster'):
    hs = [per_bild[k][f'hand_{sida}'] for k in per_bild]
    hand_matt[sida] = {'langd': tal(np.mean([h['langd'] for h in hs]), f'SAM 3D Body på {kalla_sam}: handleden till långfingrets topp', 'mätt', 0.01),
                       'knogar_b': tal(np.mean([h['knogar_b'] for h in hs]), 'pekfingrets till lillfingrets knoge (lederna, utan hud)', 'mätt', 0.008),
                       'handflata': tal(np.mean([h['handflata'] for h in hs]), 'handleden till långfingrets knoge', 'mätt', 0.008),
                       'fingrar': {f: r4(np.mean([h['fingrar'][f] for h in hs])) for f in ('thumb', 'index', 'middle', 'ring', 'pinky')}}
matt['hand'] = tal((hand_matt['hoger']['langd']['varde'] + hand_matt['vanster']['langd']['varde']) / 2,
                   'handens längd, höger och vänster i medel (SAM)', 'mätt', 0.01)

# MediaPipes händer: punkterna i bildens andelar och fingrarnas längder mot handflatan (handleden till långfingrets knoge)
FING = {'tummen': (1, 2, 3, 4), 'pek': (5, 6, 7, 8), 'lang': (9, 10, 11, 12), 'ring': (13, 14, 15, 16), 'lill': (17, 18, 19, 20)}
mp_hander = {}
for k, hs in hander.items():
    w, h = storlek[k]
    for sida, p in hs.items():
        flata = np.linalg.norm(p[9, :2] - p[0, :2])
        mp_hander.setdefault(sida, []).append({'bild': bilder[k].name,
                                               'punkter': [[round(float(q[0] / w), 4), round(float(q[1] / h), 4), round(float(q[2] / w), 4)] for q in p],
                                               'fingrar_mot_handflatan': {n: round(float(sum(np.linalg.norm(p[i[j + 1], :2] - p[i[j], :2]) for j in range(3)) / flata), 3) for n, i in FING.items()},
                                               'bredd_mot_handflatan': round(float(np.linalg.norm(p[5, :2] - p[17, :2]) / flata), 3)})

# Ansiktet ur porträttet: 478 punkter, skalan ur irisen
ans = None
ak = 'portratt' if 'portratt' in ansikte else next(iter(ansikte), None)
if ak:
    F = ansikte[ak]
    iris_px = (np.linalg.norm(F[469, :2] - F[471, :2]) + np.linalg.norm(F[474, :2] - F[476, :2])) / 2
    s = IRIS_M / iris_px
    ogon_mitt = (F[468, :2] + F[473, :2]) / 2
    upp2 = enhet(F[10, :2] - F[152, :2])
    dd = lambda i, j: float(np.linalg.norm(F[i, :2] - F[j, :2]) * s)
    ans_matt = {'pupiller_isar': tal(dd(468, 473), 'pupillernas mitt isär (MediaPipe 468-473), irisen som skala', 'mätt', 0.003),
                'kinder_b': tal(dd(234, 454), 'ansiktets bredd vid kindbenen (234-454)', 'mätt', 0.006),
                'kak_b': tal(dd(172, 397), 'käkens bredd vid käkvinkeln (172-397)', 'mätt', 0.006),
                'haka_till_ogon': tal(float((ogon_mitt - F[152, :2]) @ upp2 * s), 'hakan (152) till ögonens mitt, längs ansiktet', 'mätt', 0.005),
                'panna_till_haka': tal(dd(10, 152), 'pannans överkant vid hårfästet (10) till hakan (152)', 'mätt', 0.006),
                'mun_b': tal(dd(61, 291), 'munnens bredd (61-291)', 'mätt', 0.003),
                'nasa_b': tal(dd(129, 358), 'näsvingarna (129-358)', 'mätt', 0.003)}
    # huvudets form: ansiktets bredd mot höjd och ögonens läge mellan hakan och hårfästet (andelar, utan skala)
    form = {'bredd_mot_hojd': round(ans_matt['kinder_b']['varde'] / ans_matt['panna_till_haka']['varde'], 3),
            'kak_mot_kinder': round(ans_matt['kak_b']['varde'] / ans_matt['kinder_b']['varde'], 3),
            'ogon_andel_fran_hakan': round(ans_matt['haka_till_ogon']['varde'] / ans_matt['panna_till_haka']['varde'], 3)}
    if mask.get(ak) is not None:   # siluettens överkant (håret) över ögonen
        kolumn = mask[ak][:, int(ogon_mitt[0]) - 3:int(ogon_mitt[0]) + 4].any(axis=1)
        if kolumn.any():
            ans_matt['har_topp_over_ogon'] = tal(float((ogon_mitt[1] - np.argmax(kolumn)) * s), 'siluettens överkant (håret) över ögonens mitt, irisen som skala', 'mätt', 0.006)
    ref = F[:, :3] - np.array([ogon_mitt[0], ogon_mitt[1], F[168, 2]])
    ans = {'bild': bilder[ak].name, 'skala': {'iris_px': round(float(iris_px), 2), 'meter_per_px': float(f'{s:.4e}'),
                                              'antagande': f'irisens synliga bredd {IRIS_M * 1000} mm (vuxen, ±0,5 mm)'},
           'matt': ans_matt, 'form': form,
           'punkter': {'om': 'MediaPipe Face Landmarker, 478 punkter (468-477 irisarna), i meter med irisen som skala, från ögonens mitt: x åt bildens höger, y nedåt, z mot kameran negativt (MediaPipes z i samma skala)',
                       'p': np.round(ref * s, 4).tolist()}}
    # samma mått ur SAM bredvid, där de finns (ögonen isär)
    ans['mot_sam'] = {'ogon_isar_sam': matt['ogon_avstand']['varde'], 'pupiller_isar_iris': ans_matt['pupiller_isar']['varde']}

# ---------------------------------------------------------------------------------------------------------- dockan

grund = GRUND_FOR_STIL[a.stil]
gm = grundens_matt(grund)
passa, jamfort = {}, {}
for k in PASSAS:
    if k not in matt:
        continue
    v, o = matt[k]['varde'], matt[k]['osaker']
    g = gm.get(k)
    skillnad = None if g is None else v - g
    tar = g is None or abs(skillnad) > o
    jamfort[k] = {'person': v, 'grund': None if g is None else r4(g), 'osaker': o, 'skillnad': None if skillnad is None else r4(skillnad),
                  'tas': 'personens' if tar else 'grundens (skillnaden inom osäkerheten)'}
    if tar:
        passa[k] = v
docka = {'namn': NAMN, 'stil': a.stil, 'grund': grund, 'passa': passa, 'jamfort_med_grunden': jamfort,
         'modell': f'standarddocka_{NAMN}.glb',
         'om': f'{NAMN} byggs på {grund}s docka (stilen {a.stil}: {grund}s rörelser): {grund}s mått (scen/bygg_docka.py MATT) utom de '
               f'som skiljer sig mer än mätningens osäkerhet, som tas ur mätningen ovan. Ansiktet är dockans eget.'}

# ---------------------------------------------------------------------------------------------------------- facit

facit = None
if a.facit:
    fm = grundens_matt(a.facit)
    facit = {'nyckel': a.facit, 'om': f'scen/bygg_docka.py MATT[{a.facit!r}], mätt på annat sätt (se dess kalla)',
             'matt': {k: {'bilderna': matt[k]['varde'], 'facit': r4(fm[k]), 'fel_cm': round((matt[k]['varde'] - fm[k]) * 100, 1)}
                      for k in ('sw', 'ua', 'fa', 'hand', 'ht', 'huvud_h', 'huvud_b') if k in matt and fm.get(k) is not None}}

# ---------------------------------------------------------------------------------------------------------- skriv

ut = {'person': a.person, 'docka': docka,
      'om': 'Personens mått ur sina egna bilder (avatar-auto-pipeline/steg/15-matt-ur-bilder/matt_ur_bilder.py), bara tal. Meter. '
            'sakerhet: mätt (ur bilden; osaker är ±), skattat (ur ett mätt tal och en regel), antaget. Skalan: SAM 3D Body:s egen '
            'kroppsform för kroppen och händerna, irisen för ansiktet; en framställd bild har ingen känd storlek.',
      'bilder': {k: {'fil': v.name, 'storlek': list(storlek[k])} for k, v in bilder.items()},
      'skala': {'kroppen': 'SAM 3D Body:s egen kroppsform (skala och form för en människa som ser ut så); kameran skattad av SAM',
                'ansiktet': f'irisen {IRIS_M * 1000} mm', 'prov': 'längden mot en vuxen man (1,75 m) och lederna mot mannens och Danilos'},
      'kroppen': matt, 'per_bild': {k: {n: (r4(v) if isinstance(v, float) else v) for n, v in m.items() if not n.startswith('hand_') and n not in ('ua_lr', 'fa_lr')}
                                     | {'ua_lr': [r4(x) for x in m['ua_lr']], 'fa_lr': [r4(x) for x in m['fa_lr']]} for k, m in per_bild.items()},
      'leder_sam': {k: {'om': 'SAM 3D Body:s 70 punkter, kamerans ram (meter, x åt bildens höger, y nedåt, z in i bilden), från axellederna mitt',
                        'namn': sam[k]['punktnamn'],
                        'p': np.round(np.array(sam[k]['punkter']) - (np.array(sam[k]['punkter'][5]) + np.array(sam[k]['punkter'][6])) / 2, 4).tolist()} for k in sam},
      'hander': {'sam': hand_matt, 'mediapipe': mp_hander,
                 'om': 'SAM:s hand i meter; MediaPipes 21 punkter (0 handleden, 1-4 tummen, 5-8 pek, 9-12 lång, 13-16 ring, 17-20 lill) i bildens andelar, hans egen höger och vänster'},
      'ansiktet': ans, 'facit': facit}
fil = Path(a.ut) if a.ut else ROT / 'personer' / f'{a.person}.json'
fil.parent.mkdir(parents=True, exist_ok=True)
if fil.exists():   # utseendet i ord (ny_dealer.py --utseende) står kvar när måtten mäts om
    gammal = json.loads(fil.read_text(encoding='utf-8'))
    if gammal.get('utseende'):
        ut['utseende'] = gammal['utseende']
fil.write_text(json.dumps(ut, ensure_ascii=False, indent=1), encoding='utf-8')
print('SKREV', fil.relative_to(CASINO) if fil.is_relative_to(CASINO) else fil, flush=True)
print('MATT', json.dumps({k: v['varde'] for k, v in matt.items()}, ensure_ascii=False))
print('DOCKAN', json.dumps({'grund': grund, 'passa': passa}, ensure_ascii=False))
if facit:
    print('FACIT', json.dumps(facit['matt'], ensure_ascii=False))

# ---------------------------------------------------------------------------------------------------------- ritningen

if a.ritning:
    KANTER = [(11, 12), (11, 13), (13, 15), (12, 14), (14, 16), (11, 23), (12, 24), (23, 24), (23, 25), (25, 27), (24, 26), (26, 28)]
    HK = [(0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8), (5, 9), (9, 10), (10, 11), (11, 12), (9, 13), (13, 14), (14, 15), (15, 16), (13, 17), (0, 17), (17, 18), (18, 19), (19, 20)]
    rutor = []
    for k in ('portratt', 'helfigur', 'halvfigur'):
        if k not in las:
            continue
        b = las[k].copy()
        if k in sam:   # SAM:s leder (gula), dess punkter i bilden
            P2 = np.array(sam[k]['punkter_i_bilden']); nm = sam[k]['punktnamn']; ix = {n: i for i, n in enumerate(nm)}
            for x, y in [('left-shoulder', 'right-shoulder'), ('left-shoulder', 'left-elbow'), ('left-elbow', 'left-wrist'), ('right-shoulder', 'right-elbow'),
                         ('right-elbow', 'right-wrist'), ('left-shoulder', 'left-hip'), ('right-shoulder', 'right-hip'), ('left-hip', 'right-hip'),
                         ('left-hip', 'left-knee'), ('left-knee', 'left-ankle'), ('right-hip', 'right-knee'), ('right-knee', 'right-ankle'), ('neck', 'nose')]:
                cv2.line(b, tuple(int(v) for v in P2[ix[x]]), tuple(int(v) for v in P2[ix[y]]), (0, 215, 255), 3, cv2.LINE_AA)
            for p in P2[:21]:
                cv2.circle(b, (int(p[0]), int(p[1])), 4, (0, 215, 255), -1, cv2.LINE_AA)
        elif k in kropp and k != 'portratt':   # MediaPipes kropp (gröna) där SAM inte läste (porträttets axlar är utanför bilden)
            for x, y in KANTER:
                cv2.line(b, tuple(int(v) for v in kropp[k][x, :2]), tuple(int(v) for v in kropp[k][y, :2]), (80, 200, 80), 2, cv2.LINE_AA)
        for sida, p in hander.get(k, {}).items():   # händerna (blå höger, röd vänster: hans egna)
            c = (255, 120, 0) if sida == 'hoger' else (60, 60, 255)
            for x, y in HK:
                cv2.line(b, tuple(int(v) for v in p[x, :2]), tuple(int(v) for v in p[y, :2]), c, 2, cv2.LINE_AA)
            for q in p:
                cv2.circle(b, (int(q[0]), int(q[1])), 3, c, -1, cv2.LINE_AA)
        if k in ansikte:
            for q in ansikte[k][:468]:
                cv2.circle(b, (int(q[0]), int(q[1])), 1, (240, 240, 240) if k != 'portratt' else (60, 60, 60), -1)
            for q in ansikte[k][468:]:
                cv2.circle(b, (int(q[0]), int(q[1])), 2, (0, 0, 255), -1)
        rutor.append(b)
    h = min(r.shape[0] for r in rutor)
    rutor = [cv2.resize(r, (int(r.shape[1] * h / r.shape[0]), h)) for r in rutor]
    cv2.imwrite(a.ritning, np.concatenate(rutor, axis=1))
    print('RITNING', a.ritning)
