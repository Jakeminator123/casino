# Measures the dealer in the film frame by frame with MediaPipe: the body (33 points), both hands (21 points each), and
# the face (head turn, where the eyes look, blinks, the mouth). Only the clean stretches of data/kalla.json are read.
#   python -I live-bj/verktyg/mat.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt [--steg 2] [--del 0/4] [--bara 127.25]
# --steg 2 takes every second frame (30 a second); --del i/n lets n runs of the tool share the stretches; --bara takes
# one stretch by its start. Writes one file per stretch, matt/rorelse-<start>.json. Reads the film only, saves no picture.
# The model files are those of blackjack-dealer/tools/python/models (its README says where they come from).
#
# How the dealer is told from the two dealers at the tables behind him: their corners of the picture are painted over
# before the body is looked for. Hands are small in the picture, so each hand is looked for in a square around the
# body's wrist, and so is the face around the body's nose. All points are written in the picture's own pixels.
import sys, json, os, math
import numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.environ.get('DEALER_MODELS') or os.path.join(HERE, '..', '..', 'blackjack-dealer', 'tools', 'python', 'models')
BEHIND = [(0.0, 0.0, 0.324, 0.355), (0.747, 0.0, 1.0, 0.34)]   # the dealers behind: x0, y0, x1, y1 as shares of the picture
HAND_BOX = 0.19     # side of the square around a wrist, as a share of the picture's width
FACE_POINTS = {'irisR': 468, 'irisL': 473, 'eyeR_out': 33, 'eyeR_in': 133, 'eyeL_in': 362, 'eyeL_out': 263, 'lidR_up': 159, 'lidR_down': 145, 'lidL_up': 386, 'lidL_down': 374,
               'nose': 1, 'chin': 152, 'brow': 10, 'mouth_up': 13, 'mouth_down': 14, 'mouthR': 61, 'mouthL': 291}   # R and L are the dealer's own right and left


def model(name):
    return BaseOptions(model_asset_path=os.path.join(MODELS, name))


def square(cx, cy, side, w, h):
    side = int(min(side, w, h))
    x0 = int(min(max(cx - side / 2, 0), w - side))
    y0 = int(min(max(cy - side / 2, 0), h - side))
    return x0, y0, side


def as_image(bgr):
    return mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)))


def measure(cap, source, run, step, out):
    fps, crop = source['fps'], source['crop']
    x, y, w, h = crop['x'], crop['y'], crop['width'], crop['height']
    first, last = round(run['from'] * fps), round(run['to'] * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, first)
    pose_opt = vision.PoseLandmarkerOptions(base_options=model('pose_landmarker_heavy.task'), running_mode=vision.RunningMode.VIDEO, num_poses=1)
    hand_opt = vision.HandLandmarkerOptions(base_options=model('hand_landmarker.task'), running_mode=vision.RunningMode.IMAGE, num_hands=2,
                                            min_hand_detection_confidence=0.3, min_hand_presence_confidence=0.3)
    face_opt = vision.FaceLandmarkerOptions(base_options=model('face_landmarker.task'), running_mode=vision.RunningMode.IMAGE, num_faces=1,
                                            output_face_blendshapes=True, output_facial_transformation_matrixes=True)
    frames = []
    with vision.PoseLandmarker.create_from_options(pose_opt) as pm, vision.HandLandmarker.create_from_options(hand_opt) as hm, vision.FaceLandmarker.create_from_options(face_opt) as fm:
        for index in range(first, last + 1):
            ok, full = cap.read()
            if not ok:
                break
            if (index - first) % step:
                continue
            pic = full[y:y + h, x:x + w]
            alone = pic.copy()
            for a, b, c, d in BEHIND:
                alone[int(b * h):int(d * h), int(a * w):int(c * w)] = (40, 20, 50)
            pr = pm.detect_for_video(as_image(alone), int((index - first) * 1000 / fps))
            entry = {'f': index, 't': round(index / fps, 3), 'pose': None, 'hands': {}, 'face': None}
            if pr.pose_landmarks:
                pts = pr.pose_landmarks[0]
                entry['pose'] = {'image': [[round(q.x * w, 1), round(q.y * h, 1), round(q.z * w, 1), round(q.visibility, 2)] for q in pts],
                                 'world': [[round(q.x, 4), round(q.y, 4), round(q.z, 4)] for q in pr.pose_world_landmarks[0]]}
                # Hands: every hand found in the square around either wrist, each kept once, then given to the wrist it lies nearest.
                found = []
                for wrist in (15, 16):
                    bx, by, side = square(pts[wrist].x * w, pts[wrist].y * h, HAND_BOX * w, w, h)
                    hr = hm.detect(as_image(alone[by:by + side, bx:bx + side]))
                    for n, hp in enumerate(hr.hand_landmarks):
                        image = [[round(bx + q.x * side, 1), round(by + q.y * side, 1), round(q.z * side, 1)] for q in hp]
                        if all(math.dist(image[0][:2], other['image'][0][:2]) > 0.012 * w or math.dist(image[9][:2], other['image'][9][:2]) > 0.012 * w for other in found):
                            found.append({'image': image, 'world': [[round(q.x, 4), round(q.y, 4), round(q.z, 4)] for q in hr.hand_world_landmarks[n]],
                                          'score': round(hr.handedness[n][0].score, 2), 'said': hr.handedness[n][0].category_name})
                wl, wr = (pts[15].x * w, pts[15].y * h), (pts[16].x * w, pts[16].y * h)
                reach = HAND_BOX * w * 0.6
                best = None   # the pairing of hands to wrists with the least total distance
                for li in [None] + list(range(len(found))):
                    for ri in [None] + list(range(len(found))):
                        if li is not None and li == ri:
                            continue
                        dl = math.dist(found[li]['image'][0][:2], wl) if li is not None else reach
                        dr = math.dist(found[ri]['image'][0][:2], wr) if ri is not None else reach
                        if dl > reach or dr > reach:
                            continue
                        if best is None or dl + dr < best[0]:
                            best = (dl + dr, li, ri)
                if best:
                    if best[1] is not None:
                        entry['hands']['L'] = found[best[1]]
                    if best[2] is not None:
                        entry['hands']['R'] = found[best[2]]
                # The face, in a square around the nose sized by the ears.
                ears = math.dist((pts[7].x * w, pts[7].y * h), (pts[8].x * w, pts[8].y * h))
                bx, by, side = square(pts[0].x * w, pts[0].y * h, max(3.4 * ears, 0.16 * w), w, h)
                fr = fm.detect(as_image(pic[by:by + side, bx:bx + side]))
                if fr.face_landmarks:
                    fp = fr.face_landmarks[0]
                    matrix = np.array(fr.facial_transformation_matrixes[0])[:3, :3]
                    angles = cv2.RQDecomp3x3(matrix / np.cbrt(abs(np.linalg.det(matrix)) or 1.0))[0]
                    entry['face'] = {'turn': [round(float(a), 2) for a in angles],   # degrees: nod (x), turn (y), tilt (z)
                                     'points': {name: [round(bx + fp[i].x * side, 1), round(by + fp[i].y * side, 1)] for name, i in FACE_POINTS.items()},
                                     'blend': {c.category_name: round(c.score, 3) for c in fr.face_blendshapes[0] if c.category_name != '_neutral'}}
            frames.append(entry)
    name = os.path.join(out, f"rorelse-{run['from']:07.2f}.json")
    with open(name, 'w', encoding='utf-8') as f:
        json.dump({'about': 'MediaPipe pose_landmarker_heavy, hand_landmarker and face_landmarker, written by verktyg/mat.py. Pixels are those of the table picture (data/kalla.json, crop); '
                            'world is metres about the hips (pose) or the hand\'s middle (hands), x right, y down, z away from the camera. L and R are the dealer\'s own left and right. '
                            'said is MediaPipe\'s own word for the hand and is not used. Unsmoothed.',
                   'from': run['from'], 'to': run['to'], 'fps': fps / step, 'width': w, 'height': h, 'frames': frames}, f, separators=(',', ':'))
    got = lambda test: sum(1 for e in frames if test(e))
    print(f"{run['from']:8.2f}-{run['to']:8.2f}: {len(frames)} frames, body {got(lambda e: e['pose'])}, left hand {got(lambda e: 'L' in e['hands'])}, right hand {got(lambda e: 'R' in e['hands'])}, face {got(lambda e: e['face'])}", flush=True)


def main():
    film, source_file, out = sys.argv[1], sys.argv[2], sys.argv[3]
    rest = sys.argv[4:]
    option = lambda name, default: rest[rest.index(name) + 1] if name in rest else default
    step = int(option('--steg', '2'))
    part, parts = [int(v) for v in option('--del', '0/1').split('/')]
    only = option('--bara', None)
    source = json.load(open(source_file, encoding='utf-8'))
    os.makedirs(out, exist_ok=True)
    runs = sorted(source['runs'], key=lambda r: r['from'] - r['to'])   # longest first, so that the parts get even shares
    cap = cv2.VideoCapture(film)
    for n, run in enumerate(runs):
        if only is not None and abs(run['from'] - float(only)) > 0.01:
            continue
        if only is None and n % parts != part:
            continue
        measure(cap, source, run, step, out)
    cap.release()


main()
