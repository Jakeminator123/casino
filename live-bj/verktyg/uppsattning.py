# Gathers the live table's whole set-up in one file, in the metres of the game's lens world, so that it can be built
# as a second set-up beside our own: the camera, the felt, the shoe, the box for used cards, where each card lands, how
# the dealer sits and where his hands rest. Each group says whether it is measured, estimated, inferred or assumed.
#   python -I live-bj/verktyg/uppsattning.py live-bj/data live-bj/matt
# Reads data/scen.json, givar.json, monster.json, rorelser.json, stil-*.json and the measurements per frame; never the
# film. Writes data/uppsattning.json. The lens world: x to the picture's right (the dealer's left), y up with the felt
# at 0, z toward the player, the camera straight over the origin. What is cloned is the measures; the room's look, the
# table's print and the people are not.
import sys, json, os, glob, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from monster import Stretch, smooth, runs, stats, SWAP   # noqa: E402
from stil import Camera, NAMES, DOLLS, BEHIND_EDGE, EYE_FULL   # noqa: E402

WRIST_ON_FELT = 0.04   # metres over the felt of the wrist's middle when the hand lies flat on it


def main():
    data_dir, measures = sys.argv[1], sys.argv[2]
    read = lambda name: json.load(open(os.path.join(data_dir, name), encoding='utf-8'))
    scene, dealt, pattern, pieces = read('scen.json'), read('givar.json')['cards'], read('monster.json'), read('rorelser.json')
    cam = Camera(scene['camera'])
    c, table, things = scene['camera'], scene['table'], scene['things']
    edge = table['dealerEdgeM']
    lens = lambda xy, h=0.0: [round(float(xy[0]), 4), round(float(h), 4), round(-float(xy[1]), 4)]
    height_at = lambda px, away: round(float(cam.wall(np.array([px], float), away)[0, 1]), 3)   # how high a point seen at this pixel is, if it stands this far from the camera

    result = {'about': 'The live table\'s set-up in the lens world, written by verktyg/uppsattning.py: metres, x to the picture\'s right (the dealer\'s left), y up with the felt at 0, z toward the player, the camera straight over the origin. '
                       'Each group\'s how begins with measured, estimated, inferred or assumed. What is cloned is the measures and the movement; the room\'s look, the table\'s print and the people are not.',
              'camera': {'how': 'measured from 29 single cards lying on the felt (0.54 pixel a corner), checked by the felt\'s round edge falling on a circle within 1.8 mm. The honest uncertainty: focal length and field of view 5 %, height 2 to 3 cm, tilt 0.3 degrees.',
                         'position': [0.0, c['heightM'], 0.0], 'tilt_down_degrees': c['tiltDeg'], 'roll_degrees': c['rollDeg'], 'roll_note': 'a level line across the felt falls toward the right in the picture by this much',
                         'picture': [scene['picture']['width'], scene['picture']['height']], 'focal_px': c['focalPx'], 'middle_px': c['principalPoint'], 'field_of_view_degrees': c['fovDeg']},
              'felt': {'how': 'measured. A half circle with a straight edge toward the dealer.', 'dealers_edge_z': round(-edge, 4), 'front_z': round(-table['feltFrontFromCameraM'], 4), 'width_at_dealers_edge': table['widthAtDealerEdgeM'],
                       'depth': table['depthM'], 'arc_centre': lens(table['arc']['centreM']), 'arc_radius': table['arc']['radiusM'], 'outline': [lens(p) for p in table['feltOutlineM']],
                       'rail': 'the padded rail round the felt is raised over it and is measured in pixels only (data/scen.json, railOutlinePx)'},
              'floor': {'how': 'inferred, not measured: the floor is never in the picture. When the dealers stand at the table their eyes are 0.63 to 0.69 m over the felt, 0.15 m more than seated; with a grown man\'s eye height '
                               '(1.63 m, give or take 0.07) the felt is about 0.95 m over the floor and the seat about 0.67 m.', 'felt_over_floor': 0.95, 'give_or_take': 0.1, 'seat_over_floor': 0.67, 'the_dealer': 'sits, on a high chair'}}

    # The shoe: a clear box lying on the felt. Its front is a plate that leans back from the foot's two front corners, and
    # the next card shows through it, back out; that is where the finger takes it. What data/scen.json calls the mouth
    # is a separate clear piece lying flat on the felt just before the shoe, not a part of it.
    shoe = things['sko']
    plate = np.array(shoe['mouthMetres'])
    front = [np.array([p[0], p[1], 0.0]) for p in shoe['footMetres'][:2]]                 # by the dealer, toward the players (felt: x, away, up)
    across = (front[1] - front[0]) / np.linalg.norm(front[1] - front[0])
    back = np.array([-across[1], across[0], 0.0])                                         # along the shoe, from its front to its back
    back = back if back[0] > 0 else -back
    tops = []
    for corner, px in zip(front, (shoe['front_plate'][0], shoe['front_plate'][1])):       # the plate's top corner lies on its line of sight, straight back and up from its foot corner
        d = cam.rays(np.array([px], float))[0]
        origin = np.array([0.0, 0.0, cam.h])
        s = float((corner - origin) @ across) / float(d @ across)
        tops.append(origin + s * d)
    lean = [(float((t - c) @ back), float(t[2])) for t, c in zip(tops, front)]            # how far back and how high each top corner is
    card = np.array(front + tops[::-1])
    lens3 = lambda p: [round(float(p[0]), 4), round(float(p[2]), 4), round(-float(p[1]), 4)]
    result['shoe'] = {'how': 'measured where it stands on the felt (corners read by eye, 1 to 2 cm); its back\'s height and its front plate measured from the picture. A clear box: the front is a plate leaning back from the '
                             'foot\'s two front corners.',
                      'foot': [lens(p) for p in shoe['footMetres']], 'foot_note': 'front corner by the dealer, front corner toward the players, back corner', 'foot_length': shoe['footLength'], 'foot_width': shoe['footWidth'],
                      'back_height': height_at(shoe['outline'][3], shoe['footMetres'][2][1]),
                      'front_plate': {'how': 'measured: each top corner taken to lie straight back and up from its foot corner, on its own line of sight. The two corners should agree; where they differ, that is the reading\'s error.',
                                      'corners': [lens3(p) for p in card], 'corners_note': 'foot corner by the dealer, foot corner toward the players, top toward the players, top by the dealer',
                                      'top_height': [round(h, 3) for _, h in lean], 'top_back_from_foot': [round(a, 3) for a, _ in lean], 'lean_back_degrees': [round(math.degrees(math.atan2(a, h)), 1) for a, h in lean],
                                      'length_up_the_slope': [round(math.hypot(a, h), 3) for a, h in lean]},
                      'card_when_drawn': {'how': 'measured: the next card shows through the front plate, back out, and the finger takes it there (dealer, left_hand_at_the_shoe). Its middle is the plate\'s middle; a card is narrower '
                                                 'than the plate (63.5 mm against the foot\'s width), so sideways it is within 2 cm.', 'middle': lens3(card.mean(axis=0)),
                                          'long_side': [round(float(v), 3) for v in lens3((tops[0] - front[0]) / np.linalg.norm(tops[0] - front[0]))], 'long_side_note': 'up the slope, in the lens world'},
                      'clear_piece_before_the_shoe': {'how': 'measured: a separate clear piece lying flat on the felt just before the shoe\'s front (data/scen.json calls it the mouth; it is not the shoe\'s mouth and no card lies on it).',
                                                      'corners': [lens(p) for p in plate], 'middle': lens(plate.mean(axis=0))}}
    grip_place = card.mean(axis=0)
    box = things['slaskbox']
    result['box_for_used_cards'] = {'how': 'measured where it stands (a clear box at the dealer\'s right corner); its height from the picture, two corners.', 'foot': [lens(p) for p in box['footMetres']],
                                    'foot_width': box['footWidth'], 'foot_depth': box['footDepth'], 'height': [height_at(box['outline'][0], box['footMetres'][0][1]), height_at(box['outline'][2], box['footMetres'][2][1])],
                                    'opening': 'open at the top; the right hand is lifted to it with the cards'}
    if 'skarkort' in things:
        result['cut_card'] = {'how': 'measured in the 8 keyframes where it lies out, before the box.', 'middle': lens(things['skarkort']['m']), 'size_mm': things['skarkort']['sizeMm']}
    result['chip_tray'] = {'how': 'measured: there is none. The chips are the game\'s graphics.'}
    result['bet_marks'] = {'how': 'measured: the middle of the game\'s seat buttons, seat 1 at the picture\'s left (the dealer\'s right).', 'seats': [lens(p) for p in scene['seatsUiM']]}

    # Where the cards land: per place, the first, second and third card of a round, from the cards' own tracks.
    tracks = {}
    for name in glob.glob(os.path.join(measures, 'kort-*.json')):
        d = json.load(open(name, encoding='utf-8'))
        tracks[d['from']] = d['frames']
    landings = {}
    for stretch in sorted({g['stretch'] for g in dealt}):
        mine = sorted((g for g in dealt if g['stretch'] == stretch and not g['alreadyThere']), key=lambda g: g['landed'])
        lying = {}    # per place: when the last card landed there, to tell a new round
        count = {}
        for g in mine:
            place = g['to']['place']
            if place not in lying or g['landed'] - lying[place] > 25:
                count[place] = 0
            count[place] += 1
            lying[place] = g['landed']
            turn = None
            for f in tracks.get(stretch, []):
                if g['landed'] <= f['t'] <= g['landed'] + 0.6:
                    hit = next((k for k in f['cards'] if k['id'] == g['id'] and k['state'] == 'still'), None)
                    if hit:
                        turn = hit['turnM']
                        break
            landings.setdefault(place, {}).setdefault(count[place], []).append((g['to']['m'], turn, g['face']))
    places = {}
    for place, by_order in sorted(landings.items()):
        entry = {}
        for order, got in sorted(by_order.items()):
            if order > 3 or len(got) < 2:
                continue
            m = np.array([g[0] for g in got])
            turns = np.radians([g[1] for g in got if g[1] is not None])
            # A card's long side has no head or tail: 10 and 190 degrees are the same lie. The mean is taken on doubled angles.
            mean = complex(np.mean(np.exp(2j * turns))) if len(turns) else None
            entry[f'card_{order}'] = {'landings': len(got), 'middle': lens(np.median(m, axis=0)), 'spread': [round(float(v), 3) for v in m.std(axis=0)],
                                      'long_side_degrees': round(math.degrees(math.atan2(mean.imag, mean.real)) / 2 % 180, 1) if mean is not None else None,
                                      'long_side_agreement': round(abs(mean), 2) if mean is not None else None, 'face_down_share': round(sum(1 for g in got if g[2] == 'down') / len(got), 2)}
        if entry:
            places['himself' if place == 'dealer' else 'seat ' + place[4:]] = entry
    result['card_places'] = {'how': 'measured: where each card first lay still (data/givar.json), counted per place from the first card of a round. long_side_degrees is the long side\'s lie on the felt as verktyg/kort.py gives it '
                                    '(turnM), 0 to 180; long_side_agreement says how well the landings agree on it (1: all the same, under 0.5: do not use it, as where cards overlap in a row). '
                                    'Places with fewer than two landings of an order are left out. Seat 1 is at the picture\'s left.', **places}

    # The dealer: how he sits and where his hands rest, per style.
    stretches = []
    for name in sorted(glob.glob(os.path.join(measures, 'rorelse-*.json'))):
        raw = json.load(open(name, encoding='utf-8'))
        st = Stretch(raw)
        st.grip = {}
        for s, w in (('L', 15), ('R', 16)):
            tips = np.array([np.mean([f['hands'][s]['image'][4][:2], f['hands'][s]['image'][8][:2]], axis=0) if s in f['hands'] else [np.nan, np.nan] for f in raw['frames']])
            st.grip[s] = cam.plane(tips, 0.0)
        st.speed = {s: np.concatenate([[0], np.linalg.norm(np.diff(smooth(st.pose[:, w], 5), axis=0), axis=1) * st.fps / np.nanmedian(st.width)]) for s, w in (('L', 15), ('R', 16))}
        st.eyes_px = np.array([np.mean([e['face']['points'][k] for k in ('eyeR_out', 'eyeR_in', 'eyeL_in', 'eyeL_out')], axis=0) if e['face'] else [np.nan, np.nan] for e in raw['frames']])
        st.chin_px, st.brow_px = (np.array([e['face']['points'][k] if e['face'] else [np.nan, np.nan] for e in raw['frames']]) for k in ('chin', 'brow'))
        stretches.append(st)
    t, sin, cos = cam.t, math.sin(cam.t), math.cos(cam.t)
    result['dealer'] = {}
    for dealer, style in NAMES.items():
        inside = (lambda x: x < SWAP[0]) if dealer == 'A' else (lambda x: x > SWAP[1])
        style_file = read(f'stil-{style}.json')
        rest_head = np.array(pattern['dealers'][dealer]['rest']['head'])
        # The trunk's distance: with a hand lying still on the felt its wrist's place is known, and MediaPipe's own
        # estimate of the body in metres gives the step from that wrist to its shoulder.
        shoulders, upper, fore, widths = {'L': [], 'R': []}, [], [], []
        for st in stretches:
            own = np.array([inside(x) for x in st.t])
            for s, (sh, el, wr) in (('L', (11, 13, 15)), ('R', (12, 14, 16))):
                calm = own & (st.speed[s] < 0.1) & st.hand[s]['found'] & ~np.isnan(st.world[:, sh, 0])
                if calm.sum() < 5:
                    continue
                wrist = cam.plane(st.pose[calm, wr], WRIST_ON_FELT)
                d = st.world[calm, sh] - st.world[calm, wr]                       # x right, y down, z away from the camera, in the camera's own axes
                step = np.stack([d[:, 0], -d[:, 1] * sin + d[:, 2] * cos, -d[:, 1] * cos - d[:, 2] * sin], axis=1)   # sideways, away along the felt, up
                on_felt = cam.plane(st.pose[calm, wr], 0.0)[:, 1] < edge + 0.02    # only while the wrist is seen over the felt, not behind its edge
                shoulders[s].append(np.stack([wrist[:, 0] + step[:, 0], wrist[:, 1] + step[:, 1], WRIST_ON_FELT + step[:, 2]], axis=1)[on_felt])
                upper.append(np.linalg.norm(st.world[calm, sh] - st.world[calm, el], axis=1))
                fore.append(np.linalg.norm(st.world[calm, el] - st.world[calm, wr], axis=1))
            ok = own & ~np.isnan(st.world[:, 11, 0])
            widths.append(np.linalg.norm(st.world[ok, 11] - st.world[ok, 12], axis=1))
        est = {s: np.median(np.concatenate(shoulders[s]), axis=0) for s in 'LR' if shoulders[s]}
        scale = style_file['posture']['shoulder_width_m'] / float(np.median(np.concatenate(widths)))   # MediaPipe's body is an average one: brought to this dealer's own shoulder width
        behind = float(np.mean([est[s][1] for s in est]) - edge) if est else None
        posture = style_file['posture']
        # The body's measures that one camera from the front can give: with the head level and turned to the camera,
        # the chin, the top of the forehead and the shoulders as heights at the trunk's distance. Nothing of the face.
        chin, brow, line = [], [], []
        for st in stretches:
            level = np.array([inside(x) for x in st.t]) & (np.abs(st.head[:, 0] - rest_head[0]) < 5) & (np.abs(st.head[:, 1] - rest_head[1]) < 8) & (np.abs(st.head[:, 2] - rest_head[2]) < 5)
            if level.sum():
                chin.append(cam.wall(st.chin_px[level], edge + BEHIND_EDGE)[:, 1])
                brow.append(cam.wall(st.brow_px[level], edge + BEHIND_EDGE)[:, 1])
                line.append(cam.wall(st.mid[level], edge + BEHIND_EDGE)[:, 1])
        chin, brow, line = (float(np.nanmedian(np.concatenate(v))) for v in (chin, brow, line))
        body = {'how': 'measured through the camera at the trunk\'s assumed distance, with the head level and turned to the camera; nothing of the face. chin_to_forehead_top is between two points of the face\'s outline; '
                       'chin_to_crown is that with a quarter added for the skull over the forehead (estimated). chin_over_shoulder_line is how far the chin is over the line between the shoulder joints: the neck and the jaw together. '
                       'The waist and the hips are hidden by the table and cannot be measured. No stretch shows an arm from the side, so the arm\'s parts cannot be measured either (arm gives what can be said).',
                'shoulder_width': posture['shoulder_width_m'], 'chin_to_forehead_top': round(brow - chin, 3), 'chin_to_crown': round((brow - chin) * 1.25, 3), 'chin_over_shoulder_line': round(chin - line, 3),
                'eyes_over_shoulder_line': round(posture['eyes_over_felt_m'] - posture['shoulders_over_felt_m'], 3), 'waist': None, 'hips': None}
        sh_x = float(np.nanmedian(np.concatenate([cam.wall(st.mid[np.array([inside(x) for x in st.t])], edge + BEHIND_EDGE)[:, 0] for st in stretches])))
        waits = [p for p in pieces['styles'][style]['pieces'] if p['kind'] == 'waiting' and p['clean']]
        combos = {}
        for p in waits:
            st = next(s for s in stretches if s.t[0] - 1e-6 <= p['from'] <= s.t[-1] + 1e-6)
            a, b = np.searchsorted(st.t, p['from']), np.searchsorted(st.t, p['to_t'])
            combos.setdefault((p['left_at'], p['right_at']), []).append((p['seconds'], np.nanmedian(st.grip['L'][a:b + 1], axis=0), np.nanmedian(st.grip['R'][a:b + 1], axis=0)))
        resting = []
        for (la, ra), got in sorted(combos.items(), key=lambda kv: -sum(g[0] for g in kv[1]))[:4]:
            left, right = np.nanmedian([g[1] for g in got], axis=0), np.nanmedian([g[2] for g in got], axis=0)
            resting.append({'times': len(got), 'seconds_in_all': round(sum(g[0] for g in got), 1), 'left_called': la, 'right_called': ra,
                            'left_grip': lens(left) if not np.isnan(left).any() and la != 'lifted' else None, 'right_grip': lens(right) if not np.isnan(right).any() and ra != 'lifted' else None})
        at_shoe = []
        for m in pattern['dealers'][dealer]['events']['hand_moves']:
            if m['hand'] == 'L' and m.get('to_zone') == pattern['dealers'][dealer]['shoe']['zone']:
                st = next((s for s in stretches if s.t[0] - 1e-6 <= m['to_t'] <= s.t[-1] + 1e-6), None)
                if st is not None:
                    g = st.grip['L'][min(np.searchsorted(st.t, m['to_t']), len(st.t) - 1)]
                    if not np.isnan(g).any():
                        at_shoe.append(g)
        at_shoe = np.array(at_shoe)
        lifted = None
        near = None
        if len(at_shoe):   # laid on the felt the grip falls behind the shoe's front: where on its line of sight is it nearest the card in the front plate
            seen = np.median(at_shoe, axis=0)
            origin, target = np.array([0.0, 0.0, cam.h]), np.array([seen[0], seen[1], 0.0])
            d = (target - origin) / np.linalg.norm(target - origin)
            near = origin + float((grip_place - origin) @ d) * d
            lifted = round(float(near[2]), 3)
        result['dealer'][style] = {
            'docka': DOLLS[style], 'sits': True, 'body': body,
            'trunk': {'how': 'the heights and the width are measured through the camera with the trunk taken ' + f'{BEHIND_EDGE} m behind the felt\'s edge (assumed); behind_edge_estimated is an estimate of that distance from the '
                             'frames where a hand lies still on the felt: the wrist\'s place is then known, and MediaPipe\'s own metres of the body give the step from the wrist to the shoulder. Its depth is the weakest part of it: read it as give or take 0.1 m.',
                      'shoulders_middle': [round(sh_x, 3), posture['shoulders_over_felt_m'], round(-(edge + BEHIND_EDGE), 3)], 'shoulder_width': posture['shoulder_width_m'], 'eyes_over_felt': posture['eyes_over_felt_m'],
                      'behind_edge_assumed': BEHIND_EDGE, 'behind_edge_estimated': round(behind, 3) if behind is not None else None,
                      'shoulder_height_by_that_estimate': round(float(np.mean([est[s][2] for s in est])), 3) if est else None},
            'arm': {'how': 'estimated, and likely too short: MediaPipe\'s own metres of the body, brought to this dealer\'s shoulder width; the median over the frames with a hand at rest. At rest the arms point toward the camera, '
                           'and what points in depth comes out short. Read them as at least this long; a grown man\'s are about 0.30 and 0.26.',
                    'upper_arm': round(float(np.median(np.concatenate(upper))) * scale, 3), 'forearm': round(float(np.median(np.concatenate(fore))) * scale, 3)},
            'hands_at_rest': {'how': 'measured: the point between the thumb\'s tip and the index finger\'s, laid on the felt, in the waits (both hands still 1.5 s or more), the four commonest by time. '
                                     'A hand called lifted is off the felt and has no place here. The first is this style\'s rest.', 'places': resting},
            'left_hand_at_the_shoe': {'how': 'measured where it is seen, inferred how high: the same point at the end of the left hand\'s reach to the shoe, where the finger takes the card. Laid on the felt it falls behind the '
                                             'shoe\'s front, so the fingertips are lifted: grip_at_the_front is the point on its line of sight nearest the card in the front plate, and off_the_card how far from the card\'s middle that is.',
                                      'reaches': int(len(at_shoe)), 'grip_laid_on_the_felt': lens(np.median(at_shoe, axis=0)) if len(at_shoe) else None, 'spread': [round(float(v), 3) for v in at_shoe.std(axis=0)] if len(at_shoe) else None,
                                      'height_at_the_front': lifted, 'grip_at_the_front': lens3(near) if near is not None else None, 'off_the_card': round(float(np.linalg.norm(near - grip_place)), 3) if near is not None else None}}
    with open(os.path.join(data_dir, 'uppsattning.json'), 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=1)
    print(json.dumps({k: v for k, v in result.items() if k not in ('about', 'felt', 'camera')}))


main()
