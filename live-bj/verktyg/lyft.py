# Lifts a deal out of a film into the room, in the form our own figure's moves have: per frame both arms (shoulder,
# elbow, wrist and the hand's 21 points), the head, where he looks and the card, in metres of the lens world.
#   python -I live-bj/verktyg/lyft.py giv live-bj/data live-bj/matt live-bj/data/lyft     the three deals of each style: the middle seat, far left, far right
#   python -I live-bj/verktyg/lyft.py prov <our figure's film measured by mat.py --ensam> <the figure's own numbers per frame>
#   python -I live-bj/verktyg/lyft.py rita <a lifted deal> live-bj/data/uppsattning.json <ut.png>
# prov lifts our own figure's film the same way and says how far the lift lies from the figure's true numbers: that is
# how much a lifted deal can be trusted (on those films: each joint within 4 to 10 cm in median, nearly all of it in
# depth; sideways and in height within 1 to 3 cm). rita draws a lifted deal from above and from the side on the table's
# outline, with no film in it. Reads measurements only, never a film.
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


def lift_arm(cam, shoulder, elbow_px, wrist_px, upper, fore, edge, nearer, held):
    """One arm through a run of frames: the elbows and wrists in felt coordinates. The wrist is placed first, somewhere
    on its line: within the arm's reach of the shoulder, over the felt, at the height it is known to have in the frames
    of held (frame: metres over the felt), and as much nearer the camera than the shoulder as MediaPipe's own body has
    it. Then the elbow on its line, an upper arm from the shoulder and a forearm from the wrist. nearer is, per frame,
    how much nearer the camera MediaPipe has the elbow than the shoulder, the wrist than the elbow and the wrist than the
    shoulder: too rough to place a joint by, but it tells near from far."""
    n = len(shoulder)
    grid = np.arange(0.5, shoulder[:, 1].max() + 0.15, 0.012)
    places, price = [], []
    for k in range(n):
        w = along_ray(cam, wrist_px[k], grid)
        reach = np.linalg.norm(w - shoulder[k], axis=1)
        p = 60 * np.maximum(0, reach - (upper + fore)) + 60 * np.maximum(0, 0.015 - w[:, 2]) + 4 * np.maximum(0, w[:, 2] - 0.30)
        if not np.isnan(nearer[k]).any():
            p += 1.0 * np.abs((shoulder[k][1] - w[:, 1]) - nearer[k][2])
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
            p += 1.0 * np.abs((shoulder[k][1] - e[:, 1]) - nearer[k][0])
        places.append(e)
        price.append(p)
    return eased(cam, elbow_px, cheapest(price, places)), wrist


def hand_points(cam, world, wrist):
    """MediaPipe's own hand in metres (x right, y down, z away, in the camera's axes) turned into felt coordinates and hung on the wrist."""
    sin, cos = math.sin(cam.t), math.cos(cam.t)
    d = np.asarray(world, float) - np.asarray(world[0], float)
    return wrist + np.stack([d[:, 0], -d[:, 1] * sin + d[:, 2] * cos, -d[:, 1] * cos - d[:, 2] * sin], axis=1)


def lift(cam, raw, a, b, trunk_away, upper, fore, edge, rest_head=(0.0, 0.0), held=None):
    """Frames a..b of one measured stretch, lifted. Returns per frame a dict in felt coordinates. held gives, per arm, the
    frames (counted from a) where the wrist's height over the felt is known."""
    held = held or {'L': {}, 'R': {}}
    frames = raw['frames'][a:b + 1]
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
        elbow, wrist = lift_arm(cam, shoulder, pose[:, e], pose[:, w], upper, fore, edge, nearer, held[side])
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
            turn = math.radians(f['face']['turn'][1] - rest_head[1] + EYE_FULL * ((bl['eyeLookOutLeft'] - bl['eyeLookInLeft']) + (bl['eyeLookInRight'] - bl['eyeLookOutRight'])) / 2)
            down = math.radians(f['face']['turn'][0] - rest_head[0] + EYE_FULL * (bl['eyeLookDownLeft'] - bl['eyeLookUpLeft']))
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


FACE_NOTE = ('a is the face per frame: the shapes our own figure has, by ARKit\'s names, as MediaPipe\'s Face Landmarker scores them, 0 to 1 (null where the face was not found); evened over a tenth of a second, the blinks left as they are. '
             'Left and right are the dealer\'s own. It is the expression that is carried, not the face\'s form. data/stil-*.json, face, says which shapes carry something on a face this small and which are flutter.')


def prov(folder, truth_file):
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
    got = lift(cam, raw, 0, n - 1, away, upper, fore, edge=-truth['hip'][2] - 0.15, held=held)
    print(f'trunk {away:.3f} m from the camera, upper arm {upper:.3f}, forearm {fore:.3f} (the figure\'s own); held: the left wrist {HAND_AT_SHOE} m up as the card leaves the shoe, the right {HAND_AT_CARD} m up as the card comes to rest '
          f"(the figure's true heights there: {real['L']['w'][truth['leavesShoe'], 2]:.3f} and {real['R']['w'][truth['rests'], 2]:.3f})")
    for s in 'LR':
        for j, name in (('s', 'shoulder'), ('e', 'elbow'), ('w', 'wrist')):
            mine = np.array([g[s][j] for g in got])
            err = mine - real[s][j]
            dist = np.linalg.norm(err, axis=1)
            true_speed = np.linalg.norm(np.diff(real[s][j], axis=0), axis=1) * raw['fps']
            my_speed = np.linalg.norm(np.diff(smooth(mine, 5), axis=0), axis=1) * raw['fps']
            print(f"{s} {name:8s} off by median {np.median(dist) * 100:5.1f} cm, worst tenth {np.percentile(dist, 90) * 100:5.1f} cm; sideways {np.median(np.abs(err[:, 0])) * 100:4.1f}, in depth {np.median(np.abs(err[:, 1])) * 100:4.1f}, "
                  f"in height {np.median(np.abs(err[:, 2])) * 100:4.1f} cm; top speed true {true_speed.max():.2f} lifted {my_speed.max():.2f} m/s; path true {true_speed.sum() / raw['fps']:.2f} lifted {my_speed.sum() / raw['fps']:.2f} m")


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
    line(setup['shoe']['card_when_drawn']['corners'], (255, 255, 0), 1, True)
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
    if sys.argv[1] == 'prov':
        return prov(sys.argv[2], sys.argv[3])
    if sys.argv[1] == 'rita':
        return rita(sys.argv[2], sys.argv[3], sys.argv[4])
    data_dir, measures, out_dir = sys.argv[2], sys.argv[3], sys.argv[4]
    read = lambda name: json.load(open(os.path.join(data_dir, name), encoding='utf-8'))
    scene, pieces, pattern, setup = read('scen.json'), read('rorelser.json'), read('monster.json'), read('uppsattning.json')
    cam = Camera(scene['camera'])
    edge = scene['table']['dealerEdgeM']
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
        # Two waits: both hands lying on the felt, four to seven seconds, the longest first. The wrists are held to the felt.
        waits = sorted((p for p in pieces['styles'][style]['pieces'] if p['kind'] == 'waiting' and p['clean'] and 4 <= p['seconds'] <= 7 and p['left_at'] not in (None, 'lifted') and p['right_at'] not in (None, 'lifted')),
                       key=lambda p: -p['seconds'])[:2]
        for number, piece in enumerate(waits, 1):
            raw = next(r for (a, b), r in files.items() if a - 1e-6 <= piece['from'] and piece['to_t'] <= b + 1e-6)
            t = np.array([f['t'] for f in raw['frames']])
            a, b = int(np.searchsorted(t, piece['from'])), min(int(np.searchsorted(t, piece['to_t'])), len(t) - 1)
            if any(f['pose'] is None for f in raw['frames'][a:b + 1]):
                continue
            on_felt = {k: 0.04 for k in range(b - a + 1)}
            got = lift(cam, raw, a, b, edge + behind, UPPER, FORE, edge, rest_head, {'L': on_felt, 'R': on_felt})
            expression = faces(raw, a, b, shapes)
            frames = [{'t': round(float(t[a + k]), 3), 'R': {j: to_lens(g['R'][j]) for j in 'sew'} | {'p': [to_lens(q) for q in g['R']['p']] if g['R']['p'] is not None else None},
                       'L': {j: to_lens(g['L'][j]) for j in 'sew'} | {'p': [to_lens(q) for q in g['L']['p']] if g['L']['p'] is not None else None},
                       'h': to_lens(g['h']), 'g': to_lens(g['g']), 'a': expression[k], 'card': None} for k, g in enumerate(got)]
            shoulders = np.mean([[f['R']['s'], f['L']['s']] for f in frames], axis=(0, 1))
            result = {'about': f'A wait by a real dealer of the style {style} (both hands lying still on the felt), lifted out of the live table\'s film by verktyg/lyft.py into the lens world of data/uppsattning.json. '
                               'The same fields as the lifted deals, without a card. Both wrists are held 0.04 m over the felt. ' + FACE_NOTE,
                      'style': style, 'docka': DOLLS[style], 'kind': 'waiting', 'left_at': piece['left_at'], 'right_at': piece['right_at'], 'film_seconds': [frames[0]['t'], frames[-1]['t']], 'fps': raw['fps'], 'frameCount': len(frames),
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
            held = {'L': {k: HAND_AT_SHOE for k in range(max(out_k - 3, 0), out_k + 1)}, 'R': {k: HAND_AT_CARD for k in range(max(rest_k - 1, 0), min(rest_k + 3, b - a + 1))}}
            got = lift(cam, raw, a, b, edge + behind, UPPER, FORE, edge, rest_head, held)
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
                    card = {'c': [round(c['m'][0], 4), 0.0005, round(-c['m'][1], 4)], 'l': [round(math.sin(turn), 4), 0, round(-math.cos(turn), 4)], 'n': [0, 1 if c['face'] == 'up' else -1, 0], 'seen': True}
                elif when < piece['card']['out_of_the_mouth']:
                    card = {'c': setup['dealer'][style]['left_hand_at_the_shoe']['grip_over_the_mouth'], 'l': None, 'n': None, 'seen': False}
                else:
                    card = {'c': to_lens(np.mean([grip[4], grip[8]], axis=0)) if grip is not None else to_lens(g[holder]['w']), 'l': None, 'n': None, 'seen': False}
                frames.append({'t': when, 'R': {j: to_lens(g['R'][j]) for j in 'sew'} | {'p': [to_lens(q) for q in g['R']['p']] if g['R']['p'] is not None else None},
                               'L': {j: to_lens(g['L'][j]) for j in 'sew'} | {'p': [to_lens(q) for q in g['L']['p']] if g['L']['p'] is not None else None},
                               'h': to_lens(g['h']), 'g': to_lens(g['g']), 'a': expression[k], 'card': card})
            index = lambda second: int(np.argmin([abs(f['t'] - second) for f in frames]))
            shoulders = np.mean([[f['R']['s'], f['L']['s']] for f in frames], axis=(0, 1))
            result = {'about': f'A deal by a real dealer of the style {style}, lifted out of the live table\'s film by verktyg/lyft.py into the lens world of data/uppsattning.json (metres: x to the picture\'s right, y up with the felt at 0, '
                               'z toward the player). The same fields as our own figure\'s moves: per frame R and L (the dealer\'s own right and left) with s shoulder, e elbow, w wrist and p the hand\'s 21 points in MediaPipe\'s order '
                               '(null where the hand was not found), h the head\'s middle, g the point he looks at (null where the face was not found), card with its middle c, its long side l and its normal n. '
                               'The card is seen only where it lies on the felt (seen true); before that c is the grip of the hand taken to hold it and l and n are null. '
                               f'One camera gives no depth: the shoulders are put {behind} m behind the felt\'s edge (estimated), the arms are held to an upper arm of {UPPER} m and a forearm of {FORE} m (assumed), and the hip is assumed. '
                               'verktyg/lyft.py prov says how far such a lift lies from the truth on our own figure\'s film. ' + FACE_NOTE,
                      'style': style, 'docka': DOLLS[style], 'to': f'seat {seat}', 'seat_note': 'seats are 1 to 7 from the picture\'s left, the dealer\'s right', 'film_seconds': [frames[0]['t'], frames[-1]['t']], 'fps': raw['fps'], 'frameCount': len(frames),
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


if __name__ == '__main__':
    main()
