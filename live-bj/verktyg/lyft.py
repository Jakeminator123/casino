# Lifts a deal out of a film into the room, in the form our own figure's moves have: per frame both arms (shoulder,
# elbow, wrist and the hand's 21 points), the head, where he looks and the card, in metres of the lens world.
#   python -I live-bj/verktyg/lyft.py giv live-bj/data live-bj/matt live-bj/data/lyft [--sam <sam.json>] [--fri]     the three deals of each style: the middle seat, far left, far right
#        (--fri holds no wrist to a known height, to see with kanda what the depth alone gives; written elsewhere, never to data/lyft)
#   python -I live-bj/verktyg/lyft.py prov <our figure's film measured by mat.py --ensam> <the figure's own numbers per frame> [--sam <sam.json>] [--sam-ben] [--ut <json>]
#   python -I live-bj/verktyg/lyft.py rita <a lifted deal> live-bj/data/uppsattning.json <ut.png>
#   python -I live-bj/verktyg/lyft.py kanda <a folder of lifted pieces> live-bj/data/uppsattning.json [--ut <json>]     the lifts against the table's known points
# prov lifts our own figure's film the same way and says how far the lift lies from the figure's true numbers: that is
# how much a lifted deal can be trusted (on those films: each joint within 4 to 10 cm in median, nearly all of it in
# depth; sideways and in height within 1 to 3 cm). rita draws a lifted deal from above and from the side on the table's
# outline, with no film in it. Reads measurements only, never a film.
#
# --sam gives the depth SAM 3D Body read in key frames of the same film (verktyg/sam_runpod.py las; README, "Djup ur SAM
# 3D Body"): in those frames how much nearer the camera the elbow and the wrist are than the shoulder comes from SAM,
# drawn straight between two of them, and MediaPipe still gives where each joint is seen; giv does so only in a piece SAM
# read through (sam_covers), says which in the field djup, and holds no wrist at the shoe there. giv then also takes the arms'
# lengths from SAM (per dealer, the median over his key frames, with what SAM lacks on our figure added back:
# data/sam-prov/jamforelse.json, benlangder_m.rattelse); prov keeps the figure's own unless --sam-ben. Without --sam the
# lift is the one MediaPipe alone gives.
#
# How one camera gives a room. Every point seen lies somewhere on a line from the camera. The shoulders are put where
# the trunk is taken to sit; an elbow is then where its line is an upper arm's length from the shoulder, and a wrist
# where its line is a forearm's length from the elbow. Each has two such places, a near and a far one; the pair that
# keeps the arm over the table and moves least from frame to frame is taken, for the whole deal at once. The hand's
# points are MediaPipe's own hand in metres, turned into the room and hung on the wrist. The lens world: x to the
# picture's right, y up with the felt at 0, z toward the player, the camera over the origin.
import sys, json, os, glob, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from monster import Stretch, smooth, SWAP        # noqa: E402
from stil import Camera, NAMES, DOLLS, EYE_FULL   # noqa: E402

UPPER, FORE = 0.30, 0.26     # metres: a grown man's upper arm and forearm, joint to joint (assumed for the live dealers)
HAND_AT_SHOE, HAND_AT_CARD = 0.10, 0.06   # metres over the felt of the wrist as the fingers take the card on the shoe's front, and as they set a card down on the felt
SMOOTH = 20.0                 # how much a metre of jump between two frames costs against a metre of the arm lying wrong
# A metre off SAM's depth in a frame it read, and between two such frames (at most SAM_GAP apart), against MediaPipe's 1:
# tried on our figure's film from 2 to 200 (README, "Djup ur SAM 3D Body"); from 5 up SAM's own errors start to show.
SAM_KEY, SAM_BETWEEN, SAM_GAP = 5.0, 2.0, 10
SAM_USE = (True, False, True)  # which of nearer SAM gives: the elbow against the shoulder, the wrist against the elbow (not used by lift_arm), the wrist against the shoulder


def on_ray(cam, px, centre, length):
    """The two places on the pixel's line that are this far from the centre (felt coordinates: x, away, up); the nearest
    place on the line twice where the line passes farther off than that."""
    d = cam.rays(np.array([px], float))[0]
    d = d / np.linalg.norm(d)
    origin = np.array([0.0, 0.0, cam.h])
    b = float(d @ (centre - origin))
    c = float((centre - origin) @ (centre - origin)) - length * length
    root = math.sqrt(max(b * b - c, 0.0))
    return [origin + (b - root) * d, origin + (b + root) * d]


def along_ray(cam, px, away):
    """The points on the pixel's line at these distances along the felt (felt coordinates: x, away, up)."""
    d = cam.rays(np.array([px], float))[0]
    return np.array([0.0, 0.0, cam.h]) + (np.asarray(away, float) / d[1])[:, None] * d


def cheapest(price, places):
    """One place per frame out of each frame's row of places: the run that costs least, a step between two frames
    costing SMOOTH for each metre."""
    best, back = price[0], []
    for k in range(1, len(price)):
        step = best[:, None] + SMOOTH * np.linalg.norm(places[k - 1][:, None, :] - places[k][None, :, :], axis=2)
        back.append(step.argmin(axis=0))
        best = step.min(axis=0) + price[k]
    j = int(best.argmin())
    chosen = [j]
    for came in reversed(back):
        j = int(came[j])
        chosen.append(j)
    chosen.reverse()
    return np.array([places[k][chosen[k]] for k in range(len(price))])


def eased(cam, px, points):
    """The chosen places step along their lines, a rung at a time; the distance is evened out over a quarter of a second
    and each point put back on its own line, so that it still lies where it was seen."""
    away = smooth(points[:, 1], 7)
    return np.array([along_ray(cam, px[k], [away[k]])[0] for k in range(len(points))])


def lift_arm(cam, shoulder, elbow_px, wrist_px, upper, fore, edge, nearer, held, trust=None):
    """One arm through a run of frames: the elbows and wrists in felt coordinates. The wrist is placed first, somewhere
    on its line: within the arm's reach of the shoulder, over the felt, at the height it is known to have in the frames
    of held (frame: metres over the felt), and as much nearer the camera than the shoulder as MediaPipe's own body has
    it. Then the elbow on its line, an upper arm from the shoulder and a forearm from the wrist. nearer is, per frame,
    how much nearer the camera MediaPipe has the elbow than the shoulder, the wrist than the elbow and the wrist than the
    shoulder: too rough to place a joint by, but it tells near from far. trust is, per frame and like nearer, what a
    metre off it costs: 1 for MediaPipe's, more where it is SAM's."""
    n = len(shoulder)
    trust = np.ones((n, 3)) if trust is None else trust
    grid = np.arange(0.5, shoulder[:, 1].max() + 0.15, 0.012)
    places, price = [], []
    for k in range(n):
        w = along_ray(cam, wrist_px[k], grid)
        reach = np.linalg.norm(w - shoulder[k], axis=1)
        p = 60 * np.maximum(0, reach - (upper + fore)) + 60 * np.maximum(0, 0.015 - w[:, 2]) + 4 * np.maximum(0, w[:, 2] - 0.30)
        if not np.isnan(nearer[k]).any():
            p += trust[k][2] * np.abs((shoulder[k][1] - w[:, 1]) - nearer[k][2])
        if k in held:
            p += 25 * np.abs(w[:, 2] - held[k])
        places.append(w)
        price.append(p)
    wrist = eased(cam, wrist_px, cheapest(price, places))
    grid = np.arange(shoulder[:, 1].min() - upper - 0.05, shoulder[:, 1].max() + upper + 0.05, 0.012)
    places, price = [], []
    for k in range(n):
        e = along_ray(cam, elbow_px[k], grid)
        over_table = e[:, 1] < edge                               # an elbow over the felt cannot be under it; one behind the edge can hang at his side
        p = 12 * np.abs(np.linalg.norm(e - shoulder[k], axis=1) - upper) + 12 * np.abs(np.linalg.norm(e - wrist[k], axis=1) - fore) + 40 * np.maximum(0, np.where(over_table, 0.02, -0.25) - e[:, 2])
        if not np.isnan(nearer[k]).any():
            p += trust[k][0] * np.abs((shoulder[k][1] - e[:, 1]) - nearer[k][0])
        places.append(e)
        price.append(p)
    return eased(cam, elbow_px, cheapest(price, places)), wrist


def hand_points(cam, world, wrist):
    """MediaPipe's own hand in metres (x right, y down, z away, in the camera's axes) turned into felt coordinates and hung on the wrist."""
    sin, cos = math.sin(cam.t), math.cos(cam.t)
    d = np.asarray(world, float) - np.asarray(world[0], float)
    return wrist + np.stack([d[:, 0], -d[:, 1] * sin + d[:, 2] * cos, -d[:, 1] * cos - d[:, 2] * sin], axis=1)


def sam_depth(sam_file, cam):
    """SAM 3D Body's answer (verktyg/sam_runpod.py las) per frame, by its time in milliseconds: for each arm the nearer
    of lift_arm (how much nearer the camera, along the felt, the elbow is than the shoulder, the wrist than the elbow and
    the wrist than the shoulder) and the upper arm's and forearm's lengths. SAM's points are in the camera's frame; each
    is put on its own line of sight through this camera at the distance SAM gives, so the camera's tilt and roll are
    this camera's."""
    data = json.load(open(sam_file, encoding='utf-8'))
    names = [n.lower().replace('-', '_') for n in data['keypointNames']]
    out = {}
    for pic in data['pictures']:
        q = np.array(pic['keypoints'], float)
        px = np.stack([cam.cx + cam.f * q[:, 0] / q[:, 2], cam.cy + cam.f * q[:, 1] / q[:, 2]], axis=1)
        felt = np.array([0.0, 0.0, cam.h]) + q[:, 2:3] * cam.rays(px)
        said = {}
        for side, word in (('L', 'left'), ('R', 'right')):
            s, e, w = (felt[names.index(f'{word}_{j}')] for j in ('shoulder', 'elbow', 'wrist'))
            said[side] = {'nearer': np.array([s[1] - e[1], e[1] - w[1], s[1] - w[1]]), 'upper': float(np.linalg.norm(s - e)), 'fore': float(np.linalg.norm(e - w))}
        out[int(round(pic['t'] * 1000))] = said
    return out


def with_sam(nearer, said):
    """nearer and what a metre off it costs, per frame: SAM's in the frames it read (said[k] not None), drawn straight
    between two of them at most SAM_GAP frames apart, MediaPipe's elsewhere. SAM_USE says which of the three are taken."""
    nearer, trust = nearer.copy(), np.ones(nearer.shape)
    use = np.array(SAM_USE, bool)
    keys = [k for k, s in enumerate(said) if s is not None]
    for k0, k1 in zip(keys, keys[1:]):
        if k1 - k0 <= SAM_GAP:
            for k in range(k0 + 1, k1):
                f = (k - k0) / (k1 - k0)
                nearer[k, use], trust[k, use] = ((1 - f) * said[k0]['nearer'] + f * said[k1]['nearer'])[use], SAM_BETWEEN
    for k in keys:
        nearer[k, use], trust[k, use] = said[k]['nearer'][use], SAM_KEY
    return nearer, trust


def sam_bones(sam, spans, correction):
    """The upper arm and forearm, both sides, median over SAM's key frames inside the spans (seconds), with what SAM lacks
    on our figure added back; None where there are too few."""
    said = [v[side] for ms, v in sam.items() if any(a <= ms / 1000 <= b for a, b in spans) for side in 'LR']
    if len(said) < 10:
        return None
    return (float(np.median([s['upper'] for s in said])) + correction.get('overarm', 0.0), float(np.median([s['fore'] for s in said])) + correction.get('underarm', 0.0), len(said) // 2)


def eyes_at_rest(files, faser, dealer):
    """The eyes' own look (degrees sideways and down, as lift() counts them) in the betting phases, where both dealers
    mostly look into the camera (README) and where the head's rest is taken (monster.py): taken away like the head's, so
    that a dealer who looks into the camera is lifted looking into it. MediaPipe scores a dealer's resting eyes as partly
    looking down (bordet: 18 degrees)."""
    spans = [(s['from'], s['to']) for s in faser['spans'] if s['sign'] in ('place your bets', 'last bets', 'bets accepted')]
    side, down = [], []
    for raw in files.values():
        for f in raw['frames']:
            if f['face'] and (f['t'] < SWAP[0] if dealer == 'A' else f['t'] > SWAP[1]) and any(a <= f['t'] <= b for a, b in spans):
                bl = f['face']['blend']
                side.append(EYE_FULL * ((bl['eyeLookOutLeft'] - bl['eyeLookInLeft']) + (bl['eyeLookInRight'] - bl['eyeLookOutRight'])) / 2)
                down.append(EYE_FULL * (bl['eyeLookDownLeft'] - bl['eyeLookUpLeft']))
    return (float(np.median(side)), float(np.median(down))) if side else (0.0, 0.0)


def lift(cam, raw, a, b, trunk_away, upper, fore, edge, rest_head=(0.0, 0.0), held=None, sam=None, rest_eyes=(0.0, 0.0)):
    """Frames a..b of one measured stretch, lifted. Returns per frame a dict in felt coordinates. held gives, per arm, the
    frames (counted from a) where the wrist's height over the felt is known; sam, SAM's depth by frame time (sam_depth);
    rest_head and rest_eyes, the head's angles and the eyes' look (degrees) when the dealer looks into the camera."""
    held = held or {'L': {}, 'R': {}}
    frames = raw['frames'][a:b + 1]
    read = [sam.get(int(round(f['t'] * 1000))) for f in frames] if sam else None
    pose = np.array([[p[:2] for p in f['pose']['image']] for f in frames])
    pose = np.stack([smooth(pose[:, i], 3) for i in range(pose.shape[1])], axis=1)
    out = [{} for _ in frames]
    arms = {}
    for side, (s, e, w) in (('L', (11, 13, 15)), ('R', (12, 14, 16))):
        on_wall = cam.wall(pose[:, s], trunk_away)
        shoulder = np.stack([on_wall[:, 0], np.full(len(frames), trunk_away), on_wall[:, 1]], axis=1)
        world = np.array([f['pose']['world'] for f in frames])                       # x right, y down, z away, in the camera's axes
        away = -world[:, :, 1] * math.sin(cam.t) + world[:, :, 2] * math.cos(cam.t)   # along the felt
        nearer = np.stack([smooth(away[:, s] - away[:, e], 5), smooth(away[:, e] - away[:, w], 5), smooth(away[:, s] - away[:, w], 5)], axis=1)
        trust = None
        if read:
            nearer, trust = with_sam(nearer, [r[side] if r else None for r in read])
        elbow, wrist = lift_arm(cam, shoulder, pose[:, e], pose[:, w], upper, fore, edge, nearer, held[side], trust)
        arms[side] = (shoulder, elbow, wrist)
    for k, f in enumerate(frames):
        for side in 'LR':
            shoulder, elbow, wrist = arms[side]
            hand = f['hands'].get(side)
            out[k][side] = {'s': shoulder[k], 'e': elbow[k], 'w': wrist[k], 'p': hand_points(cam, hand['world'], wrist[k]) if hand else None, 'seen': bool(hand)}
        eyes = np.mean([f['face']['points'][key] for key in ('eyeR_out', 'eyeR_in', 'eyeL_in', 'eyeL_out')], axis=0) if f['face'] else np.mean([pose[k, 2], pose[k, 5]], axis=0)
        on_wall = cam.wall(np.array([eyes]), trunk_away - 0.02)[0]
        head = np.array([on_wall[0], trunk_away + 0.07, on_wall[1]])       # the head's middle is taken 9 cm behind the eyes
        out[k]['h'] = head
        look = None
        if f['face']:   # where he looks: the head's turn and nod from rest, plus the eyes' own, as a line from the head to the felt or to the camera
            bl = f['face']['blend']
            turn = math.radians(f['face']['turn'][1] - rest_head[1] + EYE_FULL * ((bl['eyeLookOutLeft'] - bl['eyeLookInLeft']) + (bl['eyeLookInRight'] - bl['eyeLookOutRight'])) / 2 - rest_eyes[0])
            down = math.radians(f['face']['turn'][0] - rest_head[0] + EYE_FULL * (bl['eyeLookDownLeft'] - bl['eyeLookUpLeft']) - rest_eyes[1])
            to_camera = np.array([0.0, 0.0, cam.h]) - head
            flat = math.atan2(to_camera[0], -to_camera[1])
            dip = math.atan2(-to_camera[2], math.hypot(to_camera[0], to_camera[1]))
            ang, low = flat + turn, dip + down
            d = np.array([math.sin(ang) * math.cos(low), -math.cos(ang) * math.cos(low), -math.sin(low)])
            reach = head[2] / -d[2] if d[2] < -0.05 else np.linalg.norm(to_camera)
            look = head + d * min(reach, 2.5)
        out[k]['g'] = look
    return out


def to_lens(p):
    return None if p is None else [round(float(p[0]), 4), round(float(p[2]), 4), round(-float(p[1]), 4)]


def face_shapes():
    """The face shapes our own figure has, by ARKit's names: read from the script that builds the figure, not written here."""
    import re
    text = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'avatar-auto-pipeline', 'scen', 'bygg_docka.py'), encoding='utf-8').read()
    block = text[text.index('ARKIT_KARTA = ['):]
    return re.findall(r"^    \('([A-Za-z]+)',", block[:block.index('\n]')], flags=re.M)


def faces(raw, a, b, shapes):
    """Per frame the face's shapes as MediaPipe scores them, 0 to 1, for the shapes our figure has; null where the face
    was not found. Evened over three frames, a tenth of a second, to take the flutter off; not the blinks, which are no
    longer than that themselves."""
    frames = raw['frames'][a:b + 1]
    table = np.array([[f['face']['blend'].get(s, np.nan) if f['face'] else np.nan for s in shapes] for f in frames], float)
    even = smooth(table, 3)
    for j, s in enumerate(shapes):
        if s.startswith('eyeBlink'):
            even[:, j] = table[:, j]
    return [None if np.isnan(table[k]).all() else {s: round(float(even[k, j]), 3) for j, s in enumerate(shapes) if not np.isnan(even[k, j])} for k in range(len(frames))]


GAZE_NOTE = ('g is counted from the live table\'s camera (data/scen.json): the line from the head to it, turned by the head\'s and the eyes\' own turn from how they are in the betting '
             'phases, where both dealers mostly look into the camera. blick says where the gaze ends: kameran (within 20 degrees of the line to the camera; in the waits the dealers look 8 to 18 degrees '
             'over it, likely at a screen above it), skon, plats <n>, egna korten, bordet or annat; blick_grader is its angle from the line to the camera.')
FACE_NOTE = ('a is the face per frame: the shapes our own figure has, by ARKit\'s names, as MediaPipe\'s Face Landmarker scores them, 0 to 1 (null where the face was not found); evened over a tenth of a second, the blinks left as they are. '
             'Left and right are the dealer\'s own. It is the expression that is carried, not the face\'s form. data/stil-*.json, face, says which shapes carry something on a face this small and which are flutter.')


def prov(folder, truth_file, sam_file=None, sam_lengths=False, out=None):
    """Our own figure's film lifted like a live deal, against the figure's true numbers."""
    from docka import play_lens
    cam, _ = play_lens()
    truth = json.load(open(truth_file, encoding='utf-8'))
    raw = json.load(open(sorted(glob.glob(os.path.join(folder, 'rorelse-*.json')))[0], encoding='utf-8'))
    n = min(len(raw['frames']), len(truth['frames']))
    real = {s: {j: np.array([[f[s][j][0], -f[s][j][2], f[s][j][1]] for f in truth['frames'][:n]]) for j in 'sew'} for s in 'LR'}   # felt coordinates
    away = float(np.mean([real[s]['s'][:, 1].mean() for s in 'LR']))
    upper = float(np.mean([np.linalg.norm(real[s]['s'] - real[s]['e'], axis=1).mean() for s in 'LR']))
    fore = float(np.mean([np.linalg.norm(real[s]['e'] - real[s]['w'], axis=1).mean() for s in 'LR']))
    held = {'L': {k: HAND_AT_SHOE for k in range(max(truth['leavesShoe'] - 3, 0), truth['leavesShoe'] + 1)}, 'R': {k: HAND_AT_CARD for k in range(truth['rests'] - 1, min(truth['rests'] + 3, n))}}
    sam = sam_depth(sam_file, cam) if sam_file else None
    lengths = 'the figure\'s own'
    if sam and sam_lengths:
        upper, fore, _ = sam_bones(sam, [(0.0, 1e9)], {})
        lengths = 'SAM\'s, uncorrected'
    got = lift(cam, raw, 0, n - 1, away, upper, fore, edge=-truth['hip'][2] - 0.15, held=held, sam=sam)
    print(f'trunk {away:.3f} m from the camera, upper arm {upper:.3f}, forearm {fore:.3f} ({lengths}); held: the left wrist {HAND_AT_SHOE} m up as the card leaves the shoe, the right {HAND_AT_CARD} m up as the card comes to rest '
          f"(the figure's true heights there: {real['L']['w'][truth['leavesShoe'], 2]:.3f} and {real['R']['w'][truth['rests'], 2]:.3f})"
          + (f'; SAM\'s depth in {sum(1 for f in raw["frames"][:n] if int(round(f["t"] * 1000)) in sam)} of {n} frames' if sam else ''))
    result = {}
    for s in 'LR':
        for j, name in (('s', 'shoulder'), ('e', 'elbow'), ('w', 'wrist')):
            mine = np.array([g[s][j] for g in got])
            err = mine - real[s][j]
            dist = np.linalg.norm(err, axis=1)
            true_speed = np.linalg.norm(np.diff(real[s][j], axis=0), axis=1) * raw['fps']
            my_speed = np.linalg.norm(np.diff(smooth(mine, 5), axis=0), axis=1) * raw['fps']
            cm = lambda v: round(float(v) * 100, 1)
            result[f'{s} {name}'] = {'median': cm(np.median(dist)), 'worst_tenth': cm(np.percentile(dist, 90)), 'sideways': cm(np.median(np.abs(err[:, 0]))), 'depth': cm(np.median(np.abs(err[:, 1]))),
                                     'depth_worst_tenth': cm(np.percentile(np.abs(err[:, 1]), 90)), 'height': cm(np.median(np.abs(err[:, 2]))), 'top_speed_true': round(float(true_speed.max()), 2), 'top_speed_lifted': round(float(my_speed.max()), 2)}
            print(f"{s} {name:8s} off by median {np.median(dist) * 100:5.1f} cm, worst tenth {np.percentile(dist, 90) * 100:5.1f} cm; sideways {np.median(np.abs(err[:, 0])) * 100:4.1f}, in depth {np.median(np.abs(err[:, 1])) * 100:4.1f}, "
                  f"in height {np.median(np.abs(err[:, 2])) * 100:4.1f} cm; top speed true {true_speed.max():.2f} lifted {my_speed.max():.2f} m/s; path true {true_speed.sum() / raw['fps']:.2f} lifted {my_speed.sum() / raw['fps']:.2f} m")
    if out:
        with open(out, 'w', encoding='utf-8') as f:
            json.dump({'about': 'lyft.py prov: our figure\'s film lifted like a live deal, against its own numbers; cm in felt coordinates (sideways, depth along the felt, height). '
                                f'Arms {lengths}; SAM\'s depth from {os.path.basename(sam_file) if sam_file else "nowhere (MediaPipe alone)"}.', 'upper': round(upper, 3), 'fore': round(fore, 3), 'joints': result}, f, indent=1)


def kanda(lift_dir, setup_file, out=None):
    """The lifted pieces against what is known of the live table (data/uppsattning.json), in cm of the lens world
    (sideways x, height y, depth z): the left hand's grip (between the thumb's and the index finger's tips) where the card
    leaves the shoe against the grip at the shoe's front; the right hand's grip where the card comes to rest against the
    card's own middle as the card's track saw it lie; in the waits, how high the grips are over the felt they lie on; and
    how often a wrist is under the felt."""
    setup = json.load(open(setup_file, encoding='utf-8'))
    grip = lambda hand: np.mean([hand['p'][4], hand['p'][8]], axis=0) if hand['p'] else np.array(hand['w'])
    cm = lambda v: [round(float(x) * 100, 1) for x in v]
    result = {}
    for name in sorted(glob.glob(os.path.join(lift_dir, '*.json'))):
        piece = json.load(open(name, encoding='utf-8'))
        frames, row = piece['frames'], {}
        low = [f[s]['w'][1] for f in frames for s in 'LR']
        row['handled_under_filten_andel'] = round(sum(1 for v in low if v < -0.005) / len(low), 3)
        if piece.get('kind') == 'waiting':
            heights = [grip(f[s])[1] for f in frames for s in 'LR' if f[s]['p']]
            row['greppets_hojd_cm'] = round(float(np.median(heights)) * 100, 1)
        else:
            k = piece['leavesShoe']
            row['vid_skon_cm'] = cm(grip(frames[k]['L']) - np.array(setup['dealer'][piece['style']]['left_hand_at_the_shoe']['grip_at_the_front']))
            seen = next((f for f in frames[max(0, piece['rests'] - 3):] if f['card']['seen']), None)
            if seen:
                row['vid_kortet_cm'] = cm(grip(frames[piece['rests']]['R']) - np.array(seen['card']['c']))
        result[os.path.basename(name)] = row
    for name, row in result.items():
        print(name, json.dumps(row))
    if out:
        with open(out, 'w', encoding='utf-8') as f:
            json.dump({'about': kanda.__doc__.strip().replace('\n    ', ' '), 'pieces': result}, f, indent=1)
    return result


def rita(lift_file, setup_file, out):
    """A lifted deal seen from above and from the side, on the table's own outline: no film in it."""
    import cv2
    deal, setup = json.load(open(lift_file, encoding='utf-8')), json.load(open(setup_file, encoding='utf-8'))
    scale, w, top_h, side_h = 900, 1500, 800, 330
    pic = np.full((top_h + side_h, w, 3), 26, np.uint8)
    top = lambda p: (int(w / 2 + p[0] * scale), int(60 + (p[2] + 1.85) * scale))          # x to the right, the dealer at the top, the player at the bottom
    side = lambda p: (int(120 + (p[2] + 1.85) * scale * 1.4), int(top_h + side_h - 40 - p[1] * scale * 1.4))   # the dealer at the left, up is up
    line = lambda pts, colour, width=1, closed=False, view=top: cv2.polylines(pic, [np.array([view(p) for p in pts], np.int32).reshape(-1, 1, 2)], closed, colour, width, cv2.LINE_AA)
    line(setup['felt']['outline'], (150, 60, 110), 2, True)
    line(setup['shoe']['foot'], (255, 255, 0), 2, True)
    line(setup['shoe']['front_plate']['corners'], (255, 255, 0), 1, True)
    line(setup['box_for_used_cards']['foot'], (255, 255, 0), 2, True)
    for name, place in setup['card_places'].items():
        if name != 'how' and 'card_1' in place:
            cv2.drawMarker(pic, top(place['card_1']['middle']), (120, 120, 120), cv2.MARKER_TILTED_CROSS, 14, 1, cv2.LINE_AA)
    cv2.line(pic, side([0, 0, -1.85]), side([0, 0, -0.75]), (150, 60, 110), 2, cv2.LINE_AA)                    # the felt, from the side
    cv2.line(pic, side([0, 0, setup['felt']['dealers_edge_z']]), side([0, -0.06, setup['felt']['dealers_edge_z']]), (150, 60, 110), 2, cv2.LINE_AA)
    frames = deal['frames']
    for hand, colour in (('L', (255, 170, 60)), ('R', (90, 230, 90))):
        for view in (top, side):
            line([f[hand]['w'] for f in frames], colour, 2, view=view)
            line([f[hand]['e'] for f in frames], tuple(int(c * 0.55) for c in colour), 1, view=view)
        for k in (0, deal['leavesShoe'], deal['rests'], len(frames) - 1):
            f = frames[k]
            for view in (top, side):
                cv2.line(pic, view(f[hand]['s']), view(f[hand]['e']), (200, 200, 200), 1, cv2.LINE_AA)
                cv2.line(pic, view(f[hand]['e']), view(f[hand]['w']), (200, 200, 200), 1, cv2.LINE_AA)
                cv2.circle(pic, view(f[hand]['w']), 6, colour, -1, cv2.LINE_AA)
            cv2.putText(pic, str(k), (top(f[hand]['w'])[0] + 8, top(f[hand]['w'])[1] - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.5, colour, 1, cv2.LINE_AA)
    seen = [f['card']['c'] for f in frames if f['card']['seen']]
    if seen:
        cv2.drawMarker(pic, top(seen[-1]), (0, 220, 255), cv2.MARKER_SQUARE, 18, 2, cv2.LINE_AA)
    for k, (text, colour) in enumerate(((f"{deal['style']}, {deal['to']}: {deal['frameCount']} rutor, kortet ur skon i ruta {deal['leavesShoe']}, ligger i ruta {deal['rests']}", (230, 230, 230)),
                                        ('Uppifran (dealern upptill) och fran sidan (dealern till vanster). Vanster handled bla, hoger gron, armbagar morkare; kortets landning gul ruta.', (170, 170, 170)))):
        cv2.putText(pic, text, (16, 26 + 24 * k), cv2.FONT_HERSHEY_SIMPLEX, 0.58, colour, 1, cv2.LINE_AA)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    cv2.imwrite(out, pic)
    print(out)


def main():
    option = lambda name: sys.argv[sys.argv.index(name) + 1] if name in sys.argv else None
    if sys.argv[1] == 'prov':
        return prov(sys.argv[2], sys.argv[3], option('--sam'), '--sam-ben' in sys.argv, option('--ut'))
    if sys.argv[1] == 'rita':
        return rita(sys.argv[2], sys.argv[3], sys.argv[4])
    if sys.argv[1] == 'kanda':
        return kanda(sys.argv[2], sys.argv[3], option('--ut'))
    data_dir, measures, out_dir = sys.argv[2], sys.argv[3], sys.argv[4]
    read = lambda name: json.load(open(os.path.join(data_dir, name), encoding='utf-8'))
    scene, pieces, pattern, setup = read('scen.json'), read('rorelser.json'), read('monster.json'), read('uppsattning.json')
    cam = Camera(scene['camera'])
    edge = scene['table']['dealerEdgeM']
    sam = sam_depth(option('--sam'), cam) if option('--sam') else None
    free = '--fri' in sys.argv   # no wrist held to a known height: what the depth alone gives, for lyft.py kanda (never into data/lyft)
    correction = read(os.path.join('sam-prov', 'jamforelse.json'))['benlangder_m']['rattelse'] if sam else {}
    SAM_NOTE = (' The elbows\' and wrists\' depth is SAM 3D Body\'s, read on this computer in key frames (verktyg/sam_runpod.py; README, "Djup ur SAM 3D Body") '
                'and drawn straight between them; MediaPipe gives where each joint is seen.') if sam else ''
    files = {}
    for name in glob.glob(os.path.join(measures, 'rorelse-*.json')):
        raw = json.load(open(name, encoding='utf-8'))
        files[(raw['from'], raw['to'])] = raw
    cards = {}
    for name in glob.glob(os.path.join(measures, 'kort-*.json')):
        raw = json.load(open(name, encoding='utf-8'))
        cards[raw['from']] = raw
    os.makedirs(out_dir, exist_ok=True)
    shapes = face_shapes()
    for dealer, style in NAMES.items():
        behind = setup['dealer'][style]['trunk']['behind_edge_estimated'] or setup['dealer'][style]['trunk']['behind_edge_assumed']
        rest_head = pattern['dealers'][dealer]['rest']['head']
        rest_eyes = eyes_at_rest(files, read('faser.json'), dealer)
        print(f'{style}: the eyes at rest look {rest_eyes[0]:.1f} degrees out and {rest_eyes[1]:.1f} down; taken away from the gaze')
        upper, fore, arms = UPPER, FORE, f'an upper arm of {UPPER} m and a forearm of {FORE} m (assumed)'
        armar = {'overarm': UPPER, 'underarm': FORE, 'kalla': 'antaget: en vuxen mans'}
        measured_arms = sam_bones(sam, [(p['from'], p['to_t']) for p in pieces['styles'][style]['pieces']], correction) if sam else None
        if measured_arms:
            upper, fore, count = measured_arms
            arms = f'an upper arm of {upper:.3f} m and a forearm of {fore:.3f} m (SAM 3D Body\'s median over {count} key frames, with what it lacks on our own figure added)'
            armar = {'overarm': round(upper, 3), 'underarm': round(fore, 3), 'kalla': f'skattat: SAM 3D Body, median över {count} nyckelrutor, med det SAM saknar på vår docka lagt till (data/sam-prov/jamforelse.json, benlangder_m.rattelse)',
                     'mannens': [0.279, 0.272]}
            print(f'{style}: arms {upper:.3f} and {fore:.3f} m from SAM')
        DEPTH_SAM = 'SAM 3D Body: armbågarnas och handledernas djup mot axeln i nyckelrutorna (data/sam-prov/livebordet-sam.json), rakt emellan; MediaPipe ger var lederna syns'
        DEPTH_MP = 'MediaPipe: dess egen kropps djup avgör nära och fjärran längs synlinjen; armarnas längder håller'
        look = lambda frames: [dict(f, **dict(zip(('blick', 'blick_grader'), where_looks(f['h'], f['g'], cam.h, setup)))) for f in frames]
        # Two waits: both hands lying on the felt, four to seven seconds, the longest first. The wrists are held to the felt.
        waits = sorted((p for p in pieces['styles'][style]['pieces'] if p['kind'] == 'waiting' and p['clean'] and 4 <= p['seconds'] <= 7 and p['left_at'] not in (None, 'lifted') and p['right_at'] not in (None, 'lifted')),
                       key=lambda p: -p['seconds'])[:2]
        for number, piece in enumerate(waits, 1):
            raw = next(r for (a, b), r in files.items() if a - 1e-6 <= piece['from'] and piece['to_t'] <= b + 1e-6)
            t = np.array([f['t'] for f in raw['frames']])
            a, b = int(np.searchsorted(t, piece['from'])), min(int(np.searchsorted(t, piece['to_t'])), len(t) - 1)
            if any(f['pose'] is None for f in raw['frames'][a:b + 1]):
                continue
            on_felt = {} if free else {k: 0.04 for k in range(b - a + 1)}
            use = sam if sam and sam_covers(sam, raw['frames'][a:b + 1]) else None
            got = lift(cam, raw, a, b, edge + behind, upper, fore, edge, rest_head, {'L': on_felt, 'R': on_felt}, use, rest_eyes)
            expression = faces(raw, a, b, shapes)
            frames = look([{'t': round(float(t[a + k]), 3), 'R': {j: to_lens(g['R'][j]) for j in 'sew'} | {'p': [to_lens(q) for q in g['R']['p']] if g['R']['p'] is not None else None},
                            'L': {j: to_lens(g['L'][j]) for j in 'sew'} | {'p': [to_lens(q) for q in g['L']['p']] if g['L']['p'] is not None else None},
                            'h': to_lens(g['h']), 'g': to_lens(g['g']), 'a': expression[k], 'card': None} for k, g in enumerate(got)])
            shoulders = np.mean([[f['R']['s'], f['L']['s']] for f in frames], axis=(0, 1))
            result = {'about': f'A wait by a real dealer of the style {style} (both hands lying still on the felt), lifted out of the live table\'s film by verktyg/lyft.py into the lens world of data/uppsattning.json. '
                               'The same fields as the lifted deals, without a card. Both wrists are held 0.04 m over the felt.' + (f' The arms are held to {arms}.' + (SAM_NOTE if use else ' The depth is MediaPipe\'s: SAM has not read this piece.') if sam else '') + ' ' + GAZE_NOTE + ' ' + FACE_NOTE,
                      'style': style, 'docka': DOLLS[style], 'kind': 'waiting', 'djup': DEPTH_SAM if use else DEPTH_MP, 'armar': armar, 'left_at': piece['left_at'], 'right_at': piece['right_at'], 'film_seconds': [frames[0]['t'], frames[-1]['t']], 'fps': raw['fps'], 'frameCount': len(frames),
                      'hip': [round(float(shoulders[0]), 4), round(float(shoulders[1]) - 0.47, 4), round(float(shoulders[2]), 4)], 'hip_note': 'assumed: 0.47 m under the shoulders\' middle; the hips are hidden behind the table', 'frames': frames}
            name = os.path.join(out_dir, f'{style}-vantan-{number}.json')
            with open(name, 'w', encoding='utf-8') as f:
                json.dump(result, f, separators=(',', ':'))
            print(f"{name}: {len(frames)} frames, {frames[0]['t']:.2f}-{frames[-1]['t']:.2f} s, left at {piece['left_at']}, right at {piece['right_at']}, face found in {sum(1 for f in frames if f['a'])}")
        deals = [p for p in pieces['styles'][style]['pieces'] if p['kind'] == 'card from the shoe' and p['clean'] and p['card'] and p['hands'] == 'left pulls, right lays' and p['parts']['to_shoe_s']]
        seats = sorted({int(p['to'].split()[1]) for p in deals if p['to'].startswith('seat')})
        if not seats:
            continue
        wanted = {'mitten': min(seats, key=lambda s: abs(s - 4)), 'vanster': min(seats), 'hoger': max(seats)}   # as the picture shows them: left is the dealer's right
        for label, seat in wanted.items():
            group = [p for p in deals if p['to'] == f'seat {seat}']
            typical = float(np.median([p['seconds'] for p in group]))

            def apart(p):
                """How far the right hand's grip is from the card when the card comes to rest: the deal where the hand really set it down."""
                r = next(r for (a, b), r in files.items() if a - 1e-6 <= p['from'] and p['to_t'] <= b + 1e-6)
                f = min(r['frames'], key=lambda f: abs(f['t'] - p['card']['lies_still']))
                if 'R' not in f['hands']:
                    return 9.0
                grip = cam.plane(np.array([np.mean([f['hands']['R']['image'][4][:2], f['hands']['R']['image'][8][:2]], axis=0)]), 0.0)[0]
                target = piece_target(setup, seat)
                return float(np.hypot(grip[0] - target[0], -grip[1] - target[2]))
            usual = [p for p in group if abs(p['seconds'] - typical) < 0.6] or group
            piece = min(usual, key=apart)
            raw = next(r for (a, b), r in files.items() if a - 1e-6 <= piece['from'] and piece['to_t'] <= b + 1e-6)
            t = np.array([f['t'] for f in raw['frames']])
            home = piece['parts']['right_home_s'] or 0.6
            a, b = int(np.searchsorted(t, piece['from'] - 0.2)), min(int(np.searchsorted(t, piece['to_t'] + home + 0.3)), len(t) - 1)
            if any(f['pose'] is None for f in raw['frames'][a:b + 1]):
                continue
            at = lambda second: int(np.argmin(np.abs(t[a:b + 1] - second)))
            out_k, rest_k = at(piece['card']['out_of_the_mouth']), at(piece['card']['lies_still'])
            # (the wrists held: the right at the card's height where it comes to rest; the left at the shoe's assumed height
            # where the card leaves it, only where SAM gives no depth, since the shoe is being measured anew)
            use = sam if sam and sam_covers(sam, raw['frames'][a:b + 1]) else None
            held = {'L': {}, 'R': {}} if free else {'L': {} if use else {k: HAND_AT_SHOE for k in range(max(out_k - 3, 0), out_k + 1)}, 'R': {k: HAND_AT_CARD for k in range(max(rest_k - 1, 0), min(rest_k + 3, b - a + 1))}}
            got = lift(cam, raw, a, b, edge + behind, upper, fore, edge, rest_head, held, use, rest_eyes)
            expression = faces(raw, a, b, shapes)
            track = cards.get(raw['from'])
            shown = {}
            if track:   # the card where the card's own track saw it lying or moving on the felt
                for f in track['frames']:
                    for c in f['cards']:
                        if abs(c['m'][0] - piece_target(setup, seat)[0]) < 0.12 and abs(-c['m'][1] - piece_target(setup, seat)[2]) < 0.12:
                            shown.setdefault(round(f['t'], 3), c)
            frames = []
            for k, g in enumerate(got):
                when = round(float(t[a + k]), 3)
                holder = 'L' if when < piece['card']['out_of_the_mouth'] + piece['parts']['back_s'] else 'R'
                grip = g[holder]['p']
                c = shown.get(when) if when >= piece['card']['lies_still'] - 0.1 else None
                if c is not None:
                    turn = math.radians(c['turnM'])
                    card = {'c': [round(c['m'][0], 4), 0.0005, round(-c['m'][1], 4)], 'l': [round(math.sin(turn), 4), 0, round(math.cos(turn), 4)], 'n': [0, 1 if c['face'] == 'up' else -1, 0], 'seen': True}
                elif when < piece['card']['out_of_the_mouth']:
                    card = {'c': setup['dealer'][style]['left_hand_at_the_shoe']['grip_at_the_front'], 'l': None, 'n': None, 'seen': False}
                else:
                    card = {'c': to_lens(np.mean([grip[4], grip[8]], axis=0)) if grip is not None else to_lens(g[holder]['w']), 'l': None, 'n': None, 'seen': False}
                frames.append({'t': when, 'R': {j: to_lens(g['R'][j]) for j in 'sew'} | {'p': [to_lens(q) for q in g['R']['p']] if g['R']['p'] is not None else None},
                               'L': {j: to_lens(g['L'][j]) for j in 'sew'} | {'p': [to_lens(q) for q in g['L']['p']] if g['L']['p'] is not None else None},
                               'h': to_lens(g['h']), 'g': to_lens(g['g']), 'a': expression[k], 'card': card})
            frames = look(frames)
            index = lambda second: int(np.argmin([abs(f['t'] - second) for f in frames]))
            shoulders = np.mean([[f['R']['s'], f['L']['s']] for f in frames], axis=(0, 1))
            result = {'about': f'A deal by a real dealer of the style {style}, lifted out of the live table\'s film by verktyg/lyft.py into the lens world of data/uppsattning.json (metres: x to the picture\'s right, y up with the felt at 0, '
                               'z toward the player). The same fields as our own figure\'s moves: per frame R and L (the dealer\'s own right and left) with s shoulder, e elbow, w wrist and p the hand\'s 21 points in MediaPipe\'s order '
                               '(null where the hand was not found), h the head\'s middle, g the point he looks at (null where the face was not found), card with its middle c, its long side l and its normal n. '
                               'The card is seen only where it lies on the felt (seen true); before that c is the grip of the hand taken to hold it and l and n are null. '
                               f'One camera gives no depth: the shoulders are put {behind} m behind the felt\'s edge (estimated), the arms are held to {arms}, and the hip is assumed.'
                               + ((SAM_NOTE + ' The left wrist is not held at the shoe.') if use else (' The depth is MediaPipe\'s: SAM has not read this piece.' if sam else '')) + ' '
                               'verktyg/lyft.py prov says how far such a lift lies from the truth on our own figure\'s film. ' + GAZE_NOTE + ' ' + FACE_NOTE,
                      'style': style, 'docka': DOLLS[style], 'djup': DEPTH_SAM if use else DEPTH_MP, 'armar': armar, 'to': f'seat {seat}', 'seat_note': 'seats are 1 to 7 from the picture\'s left, the dealer\'s right', 'film_seconds': [frames[0]['t'], frames[-1]['t']], 'fps': raw['fps'], 'frameCount': len(frames),
                      'leavesShoe': index(piece['card']['out_of_the_mouth']), 'rests': index(piece['card']['lies_still']), 'hands': piece['hands'],
                      'hip': [round(float(shoulders[0]), 4), round(float(shoulders[1]) - 0.47, 4), round(float(shoulders[2]), 4)], 'hip_note': 'assumed: 0.47 m under the shoulders\' middle; the hips are hidden behind the table',
                      'frames': frames}
            name = os.path.join(out_dir, f'{style}-{label}-plats-{seat}.json')
            with open(name, 'w', encoding='utf-8') as f:
                json.dump(result, f, separators=(',', ':'))
            wrists = np.array([f['R']['w'] for f in frames])
            print(f"{name}: {len(frames)} frames, {frames[0]['t']:.2f}-{frames[-1]['t']:.2f} s, card out at frame {result['leavesShoe']}, lies at {result['rests']}; right wrist height {wrists[:, 1].min():.3f}-{wrists[:, 1].max():.3f} m, "
                  f"hands found L {sum(1 for f in frames if f['L']['p'])} R {sum(1 for f in frames if f['R']['p'])}, card seen in {sum(1 for f in frames if f['card']['seen'])}")


def piece_target(setup, seat):
    return setup['card_places'][f'seat {seat}']['card_1']['middle']


def sam_covers(sam, frames):
    """Whether SAM read a piece through: a key frame within five frames of each end and none more than SAM_GAP apart.
    A piece it read only partly is lifted by MediaPipe alone, so that each piece has one depth."""
    keys = [k for k, f in enumerate(frames) if int(round(f['t'] * 1000)) in sam]
    return bool(keys) and keys[0] <= 5 and keys[-1] >= len(frames) - 6 and all(b - a <= SAM_GAP for a, b in zip(keys, keys[1:]))


NEAR_CAMERA = 20.0   # degrees: a gaze this near the line to the camera is marked as at the camera


def where_looks(h, g, cam_h, setup):
    """Where a lifted gaze ends, in words, and its angle (degrees) from the line to the live table's camera: 'kameran'
    within NEAR_CAMERA of it; on the felt 'skon' (within 15 cm of where the card is drawn), 'plats <n>' or 'egna korten'
    (within 12 cm of that place's first card) or 'bordet'; 'annat' for the rest (over the felt, away from the camera)."""
    if h is None or g is None:
        return None, None
    h, g = np.array(h), np.array(g)
    a, c = g - h, np.array([0.0, cam_h, 0.0]) - h
    deg = math.degrees(math.acos(float(np.clip(a @ c / np.linalg.norm(a) / np.linalg.norm(c), -1, 1))))
    if deg <= NEAR_CAMERA:
        return 'kameran', round(deg, 1)
    if g[1] > 0.02:
        return 'annat', round(deg, 1)
    flat = lambda p: math.hypot(g[0] - p[0], g[2] - p[2])
    if flat(setup['shoe']['card_when_drawn']['middle']) < 0.15:
        return 'skon', round(deg, 1)
    places = [(flat(v['card_1']['middle']), 'egna korten' if k == 'himself' else 'plats ' + k.split()[1]) for k, v in setup['card_places'].items() if isinstance(v, dict) and 'card_1' in v]
    near = min(places) if places else (9, '')
    return (near[1] if near[0] < 0.12 else 'bordet'), round(deg, 1)


if __name__ == '__main__':
    main()
