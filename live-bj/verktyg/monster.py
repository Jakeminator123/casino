# Turns what verktyg/mat.py measured into the dealer's pattern of movement: every move of each hand (from where, to
# where, how long, how fast), where the hands stop, every blink, every time the eyes are lowered, every turn of the head,
# how the body follows a reach, and how still he is when nothing happens. One set of numbers per dealer.
#   python -I live-bj/verktyg/monster.py live-bj/data/kalla.json live-bj/data/faser.json live-bj/matt live-bj/data/monster.json
# Reads the measurements only, never the film. Lengths are given in pixels of the table picture and in shoulder widths
# (the dealer's own, in the picture), so that they can be carried over to a figure of another size. A stopping place
# is where the wrist stops, a hand's length short of what the fingers touch; only the shoe's is named.
import sys, json, os, glob, math
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

SWAP = (474.0, 500.0)        # seconds: dealer A leaves and dealer B sits down; nothing in between is counted
FAST, SLOW = 1.0, 0.35       # a hand's move begins above FAST shoulder widths a second and ends under SLOW
SHORTEST = 0.25              # shoulder widths: a shorter move is a shift of the hand, not a move
ZONE = 0.24                  # shoulder widths: stops nearer each other than this are one stopping place
BLINK_LONGEST = 0.4          # seconds: eyes closed or lowered longer than this is a look down, not a blink
HEAD_DOWN = 12.0             # degrees of nod below the resting head beyond which no blink is counted
HEAD_FAST, HEAD_SLOW, HEAD_LEAST = 30.0, 10.0, 6.0   # degrees a second and degrees


def smooth(x, k=5):
    """Moving mean over k frames that skips the holes."""
    x = np.asarray(x, float)
    flat = x.reshape(len(x), -1)
    ok = ~np.isnan(flat)
    kernel = np.ones(k)
    out = np.empty_like(flat)
    for c in range(flat.shape[1]):
        total = np.convolve(np.where(ok[:, c], flat[:, c], 0.0), kernel, 'same')
        count = np.convolve(ok[:, c].astype(float), kernel, 'same')
        out[:, c] = np.where(count > 0, total / np.maximum(count, 1), np.nan)
    return out.reshape(x.shape)


def rolling(x, half, q):
    """The q-th percentile of x in a window of half frames to each side."""
    pad = np.pad(x, half, constant_values=np.nan)
    with np.errstate(all='ignore'):
        return np.nanpercentile(sliding_window_view(pad, 2 * half + 1), q, axis=1)


def runs(mask):
    """Start and end (exclusive) of every unbroken run of true."""
    edges = np.diff(np.concatenate([[0], mask.astype(np.int8), [0]]))
    return list(zip(np.where(edges == 1)[0], np.where(edges == -1)[0]))


def angle(a, b, c):
    """The angle at b in degrees."""
    u, v = a - b, c - b
    cos = (u * v).sum(axis=-1) / (np.linalg.norm(u, axis=-1) * np.linalg.norm(v, axis=-1) + 1e-9)
    return np.degrees(np.arccos(np.clip(cos, -1, 1)))


def stats(values, digits=2):
    v = np.asarray([x for x in values if x is not None and not (isinstance(x, float) and math.isnan(x))], float)
    if not len(v):
        return None
    return {'n': int(len(v)), 'median': round(float(np.median(v)), digits), 'p10': round(float(np.percentile(v, 10)), digits), 'p90': round(float(np.percentile(v, 90)), digits)}


class Stretch:
    def __init__(self, data):
        fr = data['frames']
        self.fps = data['fps']
        self.t = np.array([e['t'] for e in fr])
        nan2, nan3 = [np.nan, np.nan], [np.nan] * 3
        self.pose = np.array([[p[:2] for p in e['pose']['image']] if e['pose'] else [nan2] * 33 for e in fr])
        self.world = np.array([e['pose']['world'] if e['pose'] else [nan3] * 33 for e in fr])
        self.head = np.array([e['face']['turn'] if e['face'] else nan3 for e in fr])     # nod, turn, tilt in degrees
        self.blend = lambda key: np.array([e['face']['blend'][key] if e['face'] else np.nan for e in fr])
        point = lambda name: np.array([e['face']['points'][name] if e['face'] else nan2 for e in fr])
        gap = lambda up, down, a, b: np.linalg.norm(point(up) - point(down), axis=1) / np.linalg.norm(point(a) - point(b), axis=1)
        self.opening = (gap('lidR_up', 'lidR_down', 'eyeR_out', 'eyeR_in') + gap('lidL_up', 'lidL_down', 'eyeL_out', 'eyeL_in')) / 2
        self.hand = {}
        for side in 'LR':
            pts = np.array([[p[:2] for p in e['hands'][side]['image']] if side in e['hands'] else [nan2] * 21 for e in fr])
            size = np.linalg.norm(pts[:, 0] - pts[:, 9], axis=1)
            self.hand[side] = {'found': ~np.isnan(pts[:, 0, 0]), 'pinch': np.linalg.norm(pts[:, 4] - pts[:, 8], axis=1) / size,
                               'open': np.linalg.norm(pts[:, [8, 12, 16, 20]] - pts[:, [0]], axis=2).mean(axis=1) / size}
        self.width = np.linalg.norm(self.pose[:, 11] - self.pose[:, 12], axis=1)          # shoulder width in the picture
        self.mid = (self.pose[:, 11] + self.pose[:, 12]) / 2
        self.tilt = np.degrees(np.arctan2(self.pose[:, 11, 1] - self.pose[:, 12, 1], self.pose[:, 11, 0] - self.pose[:, 12, 0]))   # plus: his left shoulder lower


def sign_at(spans, t):
    for s in spans:
        if s['from'] <= t < s['to']:
            return s['sign']
    return None


def hand_moves(st, side, unit):
    wrist = smooth(st.pose[:, 15 if side == 'L' else 16], 5)
    step = np.linalg.norm(np.diff(wrist, axis=0), axis=1) * st.fps / unit       # shoulder widths a second
    speed = np.concatenate([[0], np.nan_to_num(step)])
    moves = []
    for a, b in runs(speed > SLOW):
        if speed[a:b].max() < FAST:
            continue
        a0, b1 = max(a - 1, 0), min(b, len(speed) - 1)
        path = wrist[a0:b1 + 1]
        if np.isnan(path).any():
            continue
        chord = path[-1] - path[0]
        dist = float(np.linalg.norm(chord))
        if dist / unit < SHORTEST:
            continue
        normal = np.array([-chord[1], chord[0]]) / (dist + 1e-9)
        off = (path - path[0]) @ normal                # sideways from the straight line; minus is up in the picture when moving right
        lift = float((path[0, 1] + (path[-1, 1] - path[0, 1]) * np.linspace(0, 1, len(path)) - path[:, 1]).max())   # highest point above the straight line, in pixels
        peak = int(np.argmax(speed[a0:b1 + 1]))
        moves.append({'hand': side, 'from_t': round(float(st.t[a0]), 3), 'to_t': round(float(st.t[b1]), 3), 'seconds': round(float(st.t[b1] - st.t[a0]), 3),
                      'from': [round(float(v), 1) for v in path[0]], 'to': [round(float(v), 1) for v in path[-1]], 'length': round(dist / unit, 3),
                      'top_speed': round(float(speed[a0:b1 + 1].max()), 2), 'top_at': round(peak / max(len(path) - 1, 1), 2),
                      'lift': round(lift / unit, 3), 'bend': round(float(np.abs(off).max()) / (dist + 1e-9), 3)})
    return moves


def blinks_and_lowered(st, base_open, rest_nod):
    opening = st.opening
    limit = 0.55 * np.maximum(rolling(opening, int(4 * st.fps), 80), 0.6 * base_open)
    low = np.nan_to_num(opening, nan=1.0) < limit
    for a, b in runs(~low):   # a lid that flickers open for a frame or three is still the same closing
        if 0 < a and b < len(low) and b - a <= 3 and not np.isnan(opening[a:b]).all() and np.nanmax(opening[a:b]) < 0.8 * limit[a] / 0.55:
            low[a:b] = True
    blinks, lowered = [], []
    for a, b in runs(low):
        seconds = (b - a) / st.fps
        if a == 0 or b == len(low):
            continue
        if seconds <= BLINK_LONGEST:
            if not st.head[a, 0] - rest_nod > HEAD_DOWN:   # with the head bowed the lids hide the eyes anyway, and a blink cannot be told from a glance
                blinks.append({'t': round(float(st.t[a]), 3), 'seconds': round(seconds, 3)})
        else:
            nod = st.head[:, 0]
            lowered.append({'from_t': round(float(st.t[a]), 3), 'to_t': round(float(st.t[b - 1]), 3), 'seconds': round(seconds, 3),
                            'nod': round(float(np.nanmedian(nod[a:b]) - np.nanmedian(nod[max(a - 15, 0):a])), 1)})
    return blinks, lowered, low


def head_moves(st):
    head = smooth(st.head, 5)
    rate = np.concatenate([[0], np.nan_to_num(np.linalg.norm(np.diff(head[:, :2], axis=0), axis=1) * st.fps)])   # nod and turn together, degrees a second
    moves = []
    for a, b in runs(rate > HEAD_SLOW):
        if rate[a:b].max() < HEAD_FAST or a == 0 or np.isnan(head[a - 1]).any() or np.isnan(head[b - 1]).any():
            continue
        change = head[b - 1] - head[a - 1]
        if np.linalg.norm(change[:2]) < HEAD_LEAST:
            continue
        moves.append({'from_t': round(float(st.t[a - 1]), 3), 'to_t': round(float(st.t[b - 1]), 3), 'seconds': round(float(st.t[b - 1] - st.t[a - 1]), 3),
                      'nod': round(float(change[0]), 1), 'turn': round(float(change[1]), 1), 'tilt': round(float(change[2]), 1), 'top_speed': round(float(rate[a:b].max()), 1)})
    return moves


def zones_of(points, weights, unit):
    """Stops nearer each other than ZONE shoulder widths become one place; the heaviest first."""
    zones = []
    for i in np.argsort(-np.asarray(weights)):
        p = np.asarray(points[i], float)
        hit = next((z for z in zones if np.linalg.norm(z['sum'] / z['weight'] - p) < ZONE * unit), None)
        if hit is None:
            hit = {'sum': np.zeros(2), 'weight': 0.0, 'members': []}
            zones.append(hit)
        hit['sum'] += p * weights[i]
        hit['weight'] += weights[i]
        hit['members'].append(int(i))
    return zones


def main():
    source = json.load(open(sys.argv[1], encoding='utf-8'))
    spans = json.load(open(sys.argv[2], encoding='utf-8'))['spans']
    folder, out = sys.argv[3], sys.argv[4]
    stretches = [Stretch(json.load(open(f, encoding='utf-8'))) for f in sorted(glob.glob(os.path.join(folder, 'rorelse-*.json')))]
    result = {'about': 'The dealer\'s pattern of movement, written by verktyg/monster.py from the measurements of verktyg/mat.py. Lengths in shoulder widths of the dealer in the picture (unit_px) unless a name ends in _px; '
                       'times in seconds of the film; L and R are the dealer\'s own left and right; pixels are those of the table picture (data/kalla.json). turn plus is the head turned toward the picture\'s side given in head_turn_plus.',
              'stretches': len(stretches), 'dealers': {}}
    for dealer, inside in (('A', lambda t: t < SWAP[0]), ('B', lambda t: t > SWAP[1])):
        own = []
        for st in stretches:   # a stretch that crosses the change of dealer is cut there
            keep = np.array([inside(t) for t in st.t])
            if keep.sum() > 30:
                part = Stretch.__new__(Stretch)
                part.fps = st.fps
                for key in ('t', 'pose', 'world', 'head', 'opening', 'width', 'mid', 'tilt'):
                    setattr(part, key, getattr(st, key)[keep])
                part.hand = {s: {k: v[keep] for k, v in st.hand[s].items()} for s in 'LR'}
                look = {key: st.blend(key)[keep] for key in ('eyeLookDownLeft', 'eyeLookUpLeft', 'eyeLookInLeft', 'eyeLookOutLeft', 'eyeLookInRight', 'eyeLookOutRight', 'jawOpen', 'mouthSmileLeft', 'mouthSmileRight')}
                part.look = look
                own.append(part)
        if not own:
            continue
        cat = lambda get: np.concatenate([get(st) for st in own])
        seconds = sum(len(st.t) for st in own) / own[0].fps
        unit = float(np.nanmedian(cat(lambda st: st.width)))
        signs = [np.array([sign_at(spans, t) for t in st.t]) for st in own]
        all_signs = np.concatenate(signs)
        base_open = float(np.nanpercentile(cat(lambda st: st.opening), 90))
        head_all = cat(lambda st: st.head)
        rest_head = np.nanmedian(head_all[np.isin(all_signs, ['place your bets', 'last bets', 'bets accepted'])], axis=0) if np.isin(all_signs, ['place your bets', 'last bets', 'bets accepted']).sum() > 60 else np.nanmedian(head_all, axis=0)
        nose_side = cat(lambda st: st.pose[:, 0, 0] - st.mid[:, 0])
        ok = ~np.isnan(nose_side) & ~np.isnan(head_all[:, 1])
        turn_sign = float(np.corrcoef(nose_side[ok], head_all[ok, 1])[0, 1])

        moves, blinks, lowered, heads, low_masks = [], [], [], [], []
        for st in own:
            for side in 'LR':
                moves += hand_moves(st, side, unit)
            b, l, low = blinks_and_lowered(st, base_open, float(rest_head[0]))
            blinks += b
            lowered += l
            low_masks.append(low)
            heads += head_moves(st)
        moves.sort(key=lambda m: m['from_t'])
        for m in moves:
            m['sign'] = sign_at(spans, m['from_t'])

        # Where the hands stop: the end of every move, weighed by how long the hand then stays.
        ends = [m['to'] for m in moves]
        stay = []
        for k, m in enumerate(moves):
            later = next((n for n in moves[k + 1:] if n['hand'] == m['hand']), None)
            m['stay'] = round(min(later['from_t'] - m['to_t'], 30.0), 3) if later and later['from_t'] - m['to_t'] < 30 else None
            stay.append((m['stay'] or 0.2) + 0.2)
        zones = zones_of(ends, stay, unit) if moves else []
        zone_list = []
        for z in zones:
            centre = z['sum'] / z['weight']
            zone_list.append({'id': len(zone_list), 'at': [round(float(v), 1) for v in centre], 'name': None, 'arrivals': len(z['members']),
                              'L': sum(1 for i in z['members'] if moves[i]['hand'] == 'L'), 'R': sum(1 for i in z['members'] if moves[i]['hand'] == 'R'),
                              'stay': stats([moves[i]['stay'] for i in z['members']])})
            for i in z['members']:
                moves[i]['to_zone'] = zone_list[-1]['id']
        for k, m in enumerate(moves):   # where a move starts is where that hand's move before it ended
            earlier = next((n for n in reversed(moves[:k]) if n['hand'] == m['hand'] and m['from_t'] - n['to_t'] < 30), None)
            m['from_zone'] = earlier['to_zone'] if earlier else None

        # How the body follows a hand: the shoulders' middle, their tilt and the head, against where each wrist is.
        mid, width, tilt = cat(lambda st: st.mid), cat(lambda st: st.width), cat(lambda st: st.tilt)
        wrist = {'L': cat(lambda st: st.pose[:, 15]), 'R': cat(lambda st: st.pose[:, 16])}
        elbow = {'L': cat(lambda st: angle(st.world[:, 11], st.world[:, 13], st.world[:, 15])), 'R': cat(lambda st: angle(st.world[:, 12], st.world[:, 14], st.world[:, 16]))}
        raise_ = {'L': cat(lambda st: angle(st.world[:, 23], st.world[:, 11], st.world[:, 13])), 'R': cat(lambda st: angle(st.world[:, 24], st.world[:, 12], st.world[:, 14]))}
        still = np.concatenate([np.concatenate([[False], np.linalg.norm(np.diff(smooth(st.pose[:, 15], 5), axis=0), axis=1) * st.fps / unit < 0.15]) &
                                np.concatenate([[False], np.linalg.norm(np.diff(smooth(st.pose[:, 16], 5), axis=0), axis=1) * st.fps / unit < 0.15]) for st in own])
        rest = still & np.isin(all_signs, ['place your bets', 'last bets'])
        rest = rest if rest.sum() > 60 else still
        rest_mid, rest_tilt, rest_width = np.nanmedian(mid[rest], axis=0), float(np.nanmedian(tilt[rest])), float(np.nanmedian(width[rest]))
        reach = {}
        for side in 'LR':
            out_x = (wrist[side][:, 0] - rest_mid[0]) / unit                 # how far to the picture's right of the resting middle the wrist is
            bins = {}
            for lo, hi in ((-9, -1.4), (-1.4, -0.9), (-0.9, -0.4), (-0.4, 0.4), (0.4, 0.9), (0.9, 1.4), (1.4, 9)):
                pick = (out_x >= lo) & (out_x < hi) & ~np.isnan(mid[:, 0])
                if pick.sum() < 20:
                    continue
                bins[f'{lo} to {hi}'] = {'frames': int(pick.sum()), 'shoulders_side': round(float(np.nanmedian(mid[pick, 0] - rest_mid[0]) / unit), 3), 'shoulders_down': round(float(np.nanmedian(mid[pick, 1] - rest_mid[1]) / unit), 3),
                                         'shoulder_tilt': round(float(np.nanmedian(tilt[pick]) - rest_tilt), 1), 'shoulder_width': round(float(np.nanmedian(width[pick]) / rest_width), 3),
                                         'head_turn': round(float(np.nanmedian(head_all[pick, 1]) - rest_head[1]), 1), 'head_nod': round(float(np.nanmedian(head_all[pick, 0]) - rest_head[0]), 1),
                                         'head_tilt': round(float(np.nanmedian(head_all[pick, 2]) - rest_head[2]), 1), 'elbow': round(float(np.nanmedian(elbow[side][pick])), 0), 'upper_arm_from_body': round(float(np.nanmedian(raise_[side][pick])), 0)}
            reach[side] = bins

        # Stillness: how much the head and the shoulders drift while both hands lie still, over two seconds at a time.
        drift = {'nose': [], 'shoulders': [], 'head_degrees': []}
        offset = 0
        for st in own:
            mask = still[offset:offset + len(st.t)]
            offset += len(st.t)
            for a, b in runs(mask):
                for s in range(a, b - 60, 60):
                    drift['nose'].append(float(np.nanstd(st.pose[s:s + 60, 0], axis=0).mean() / unit))
                    drift['shoulders'].append(float(np.nanstd(st.mid[s:s + 60], axis=0).mean() / unit))
                    drift['head_degrees'].append(float(np.nanstd(st.head[s:s + 60, :2], axis=0).mean()))

        # Eyes and head by what the game shows.
        low_all = np.concatenate(low_masks)
        down = cat(lambda st: st.look['eyeLookDownLeft'])
        by_sign = {}
        for sign in sorted(set(s for s in all_signs if s)):
            pick = all_signs == sign
            if pick.sum() < 90:
                continue
            secs = pick.sum() / own[0].fps
            count = sum(1 for b in blinks if sign_at(spans, b['t']) == sign)
            by_sign[sign] = {'seconds': round(float(secs), 1), 'blinks_a_minute': round(count / secs * 60, 1), 'eyes_lowered_share': round(float(low_all[pick].mean()), 3),
                             'head_nod': stats(head_all[pick, 0] - rest_head[0], 1), 'head_turn': stats(head_all[pick, 1] - rest_head[1], 1),
                             'hands_still_share': round(float(still[pick].mean()), 3)}
        # The trip to the shoe and how the head and the eyes go with the hands. The shoe's place is where only the left
        # hand stops, far out to his left, most often.
        low_at = lambda t: any(l['from_t'] <= t <= l['to_t'] for l in lowered)

        def company(group):
            """For a group of hand moves: how often the head moves with it and how much later it starts, and the eyes."""
            if not group:
                return None
            lags = []
            for m in group:
                near = [h['from_t'] - m['from_t'] for h in heads if abs(h['from_t'] - m['from_t']) < 0.7]
                if near:
                    lags.append(min(near, key=abs))
            return {'moves': len(group), 'seconds': stats([m['seconds'] for m in group]), 'head_moves_with_it_share': round(len(lags) / len(group), 3), 'head_starts_after_hand': stats(lags),
                    'eyes_lowered_at_start_share': round(sum(low_at(m['from_t']) for m in group) / len(group), 3), 'eyes_lowered_at_arrival_share': round(sum(low_at(m['to_t'] + 0.1) for m in group) / len(group), 3),
                    'blink_at_start_share': round(sum(any(abs(b['t'] - m['from_t']) < 0.3 for b in blinks) for m in group) / len(group), 3)}

        shoe = None
        candidates = [z for z in zone_list if z['R'] == 0 and z['at'][0] > rest_mid[0] + unit]
        if candidates:
            zone = max(candidates, key=lambda z: z['arrivals'])
            zone['name'] = 'shoe'
            to_shoe = [m for m in moves if m['hand'] == 'L' and m.get('to_zone') == zone['id']]
            from_shoe = [m for m in moves if m['hand'] == 'L' and m.get('from_zone') == zone['id']]
            trips = []
            for m in to_shoe:
                back = next((n for n in from_shoe if 0 <= n['from_t'] - m['to_t'] < 3), None)
                if back:
                    trips.append((m['seconds'], back['from_t'] - m['to_t'], back['seconds']))
            between = np.diff(sorted(m['to_t'] for m in to_shoe))
            shoe = {'zone': zone['id'], 'wrist_px': zone['at'], 'trips': len(trips), 'out': stats([t[0] for t in trips]), 'grip': stats([t[1] for t in trips]), 'back': stats([t[2] for t in trips]),
                    'whole': stats([sum(t) for t in trips]), 'grip_to_grip': stats(between[between < 6]),
                    'right_hand_moving_meanwhile_share': round(sum(any(n['hand'] == 'R' and n['from_t'] < m['to_t'] and n['to_t'] > m['from_t'] for n in moves) for m in to_shoe) / max(len(to_shoe), 1), 3),
                    'to_shoe': company(to_shoe), 'from_shoe': company(from_shoe)}
        right = {'out': company([m for m in moves if m['hand'] == 'R' and m['length'] >= 0.6 and m['to'][1] > m['from'][1] + 0.08 * unit]),      # ends nearer the camera
                 'back': company([m for m in moves if m['hand'] == 'R' and m['length'] >= 0.6 and m['to'][1] < m['from'][1] - 0.08 * unit])}
        wide = [h for h in heads if abs(h['turn']) >= 15]
        wide_turns = {'count': len(wide), 'seconds': stats([h['seconds'] for h in wide]), 'degrees': stats([abs(h['turn']) for h in wide], 1),
                      'blink_at_start_share': round(sum(any(abs(b['t'] - h['from_t']) < 0.3 for b in blinks) for h in wide) / max(len(wide), 1), 3)}

        gaps = np.diff([b['t'] for b in blinks])
        gaps = gaps[(gaps > 0) & (gaps < 30)]
        near_move = sum(1 for b in blinks if any(abs(b['t'] - m['from_t']) < 0.3 for m in moves) or any(abs(b['t'] - h['from_t']) < 0.3 for h in heads))
        long_moves = [m for m in moves if m['length'] >= 0.6]
        result['dealers'][dealer] = {
            'seconds': round(seconds, 1), 'unit_px': round(unit, 1), 'head_turn_plus': 'right' if turn_sign > 0 else 'left', 'rest': {'shoulders_middle_px': [round(float(v), 1) for v in rest_mid], 'shoulder_tilt': round(rest_tilt, 1),
            'head': [round(float(v), 1) for v in rest_head], 'wrist_L_px': [round(float(v), 1) for v in np.nanmedian(wrist['L'][rest], axis=0)], 'wrist_R_px': [round(float(v), 1) for v in np.nanmedian(wrist['R'][rest], axis=0)],
            'elbow_L': round(float(np.nanmedian(elbow['L'][rest])), 0), 'elbow_R': round(float(np.nanmedian(elbow['R'][rest])), 0)},
            'blinks': {'count': len(blinks), 'a_minute': round(len(blinks) / seconds * 60, 1), 'seconds': stats([b['seconds'] for b in blinks], 3), 'between': stats(gaps, 2),
                       'double_share': round(float((gaps < 0.6).mean()), 3) if len(gaps) else None, 'at_a_move_share': round(near_move / max(len(blinks), 1), 3)},
            'eyes_lowered': {'count': len(lowered), 'share_of_time': round(float(low_all.mean()), 3), 'seconds': stats([l['seconds'] for l in lowered], 2), 'nod_with_it': stats([l['nod'] for l in lowered], 1)},
            'head_moves': {'count': len(heads), 'a_minute': round(len(heads) / seconds * 60, 1), 'seconds': stats([h['seconds'] for h in heads], 2), 'degrees': stats([math.hypot(h['nod'], h['turn']) for h in heads], 1),
                           'top_speed': stats([h['top_speed'] for h in heads], 0)},
            'hand_moves': {'count': len(moves), 'L': sum(1 for m in moves if m['hand'] == 'L'), 'R': sum(1 for m in moves if m['hand'] == 'R'),
                           'long': {'count': len(long_moves), 'seconds': stats([m['seconds'] for m in long_moves]), 'length': stats([m['length'] for m in long_moves]), 'top_speed': stats([m['top_speed'] for m in long_moves]),
                                    'top_at': stats([m['top_at'] for m in long_moves]), 'lift': stats([m['lift'] for m in long_moves], 3), 'bend': stats([m['bend'] for m in long_moves], 3)}},
            'shoe': shoe, 'right_hand': right, 'wide_head_turns': wide_turns,
            'stillness': {k: stats(v, 4) for k, v in drift.items()}, 'by_sign': by_sign, 'reach': reach, 'zones': zone_list,
            'events': {'hand_moves': moves, 'blinks': blinks, 'eyes_lowered': lowered, 'head_moves': heads}}
        d = result['dealers'][dealer]
        print(f"dealer {dealer}: {seconds:.0f} s, shoulder width {unit:.0f} px, {len(moves)} hand moves ({len(long_moves)} long), {len(blinks)} blinks ({d['blinks']['a_minute']} a minute), "
              f"{len(lowered)} looks down ({d['eyes_lowered']['share_of_time']:.0%} of the time), {len(heads)} head moves, {len(zone_list)} stopping places")
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(result, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
