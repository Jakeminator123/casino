# Writes each measured dealer's way of dealing as a style a figure can be given: one small file per dealer, in metres,
# degrees and seconds, with how each number was measured and how far it can be trusted.
#   python -I live-bj/verktyg/stil.py live-bj/data live-bj/matt
# Reads data/kalla.json, faser.json, monster.json (the events), scen.json (the camera) and the measurements per frame;
# never the film. Writes data/stil-kameran.json (the first dealer: seeks the camera, leans toward the shoe) and
# data/stil-bordet.json (the second: quicker, a still trunk, the eyes on the table). The names are the styles', not
# the persons'.
#
# Metres. One camera gives no depth, so a wrist's speed and path are counted two ways, one that is too high when the
# hand lifts or goes in depth (laid on a level plane a little over the felt) and one that is too low then (across the
# line of sight), and the file gives both and their geometric mean as the best. verktyg/docka.py tried this on our own
# figure's films, where the truth is known: the best came within about a third. The shoulders and the head are laid on
# an upright plane behind the dealer's edge of the table.
import sys, json, os, glob, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from monster import Stretch, smooth, runs, stats, sign_at, SWAP   # noqa: E402

NAMES = {'A': 'kameran', 'B': 'bordet'}
WRIST_LOW = 0.05                       # metres over the felt that a wrist is taken to be
BEHIND_EDGE = 0.20                     # metres behind the dealer's edge of the felt where the shoulders are taken to be
EYE_FULL = 30.0                        # degrees the eye has turned when MediaPipe's look score is 1 (an estimate)
BETTING = ['place your bets', 'last bets', 'bets accepted']


class Camera:
    def __init__(self, cam):
        self.f, (self.cx, self.cy), self.h = cam['focalPx'], cam['principalPoint'], cam['heightM']
        self.t = math.radians(cam['tiltDeg'])
        self.fwd, self.down = np.array([0, math.cos(self.t), -math.sin(self.t)]), np.array([0, -math.sin(self.t), -math.cos(self.t)])
        self.roll = 0.0
        to_pixel = np.array(cam['feltToPixel'])
        errors = {}
        for roll in (math.radians(cam['rollDeg']), -math.radians(cam['rollDeg'])):   # which way the roll goes is settled against the file's own mapping
            self.roll = roll
            worst = 0.0
            for x, y in ((-0.5, 1.0), (0.5, 1.0), (0.0, 1.5), (0.6, 1.4), (-0.6, 1.4)):
                q = to_pixel @ np.array([x, y, 1.0])
                got = self.plane(np.array([[q[0] / q[2], q[1] / q[2]]]), 0.0)[0]
                worst = max(worst, float(np.hypot(got[0] - x, got[1] - y)))
            errors[roll] = worst
        self.roll = min(errors, key=errors.get)
        self.check_m = errors[self.roll]

    def rays(self, px):
        x, y = (px[:, 0] - self.cx) / self.f, (px[:, 1] - self.cy) / self.f
        c, s = math.cos(self.roll), math.sin(self.roll)
        x, y = c * x + s * y, -s * x + c * y
        return np.stack([x, np.full_like(x, 0.0), np.zeros_like(x)], axis=1) + y[:, None] * self.down + self.fwd

    def plane(self, px, height):
        """Where the pixels lie on a level plane this high over the felt: x to the picture's right, y away from the camera."""
        d = self.rays(np.asarray(px, float))
        s = (height - self.h) / d[:, 2]
        return np.stack([s * d[:, 0], s * d[:, 1]], axis=1)

    def pixel(self, x, away, height):
        """Where a point is seen: x to the picture's right, away from the camera along the felt, and its height over the felt."""
        rel = np.array([x, away, height - self.h], float)
        depth = float(rel @ self.fwd)
        xn, yn = x / depth, float(rel @ self.down) / depth
        c, s = math.cos(self.roll), math.sin(self.roll)
        return [self.cx + self.f * (c * xn - s * yn), self.cy + self.f * (s * xn + c * yn)]

    def across(self, px, height):
        """The pixels' steps taken as steps across the line of sight, in metres: each step times the distance to the point
        (found on the plane this high over the felt) over the focal length. A step toward or away from the camera is not
        seen this way, so a path comes out too short where plane() makes it too long; the truth lies between the two."""
        px = np.asarray(px, float)
        on = self.plane(px, height)
        depth = on[:, 1] * math.cos(self.t) + (self.h - height) * math.sin(self.t)
        return np.linalg.norm(np.diff(px, axis=0), axis=1) * (depth[1:] + depth[:-1]) / 2 / self.f

    def wall(self, px, away):
        """Where the pixels lie on an upright plane this far from the camera: x to the picture's right, z up from the felt."""
        d = self.rays(np.asarray(px, float))
        s = away / d[:, 1]
        return np.stack([s * d[:, 0], self.h + s * d[:, 2]], axis=1)


def onset(series, share=0.2):
    """Index where the series has gone this share of its way from its first value to its farthest."""
    gone = np.abs(series - series[0])
    if np.isnan(gone).any() or gone.max() <= 0:
        return None, 0.0
    return int(np.argmax(gone >= share * gone.max())), float(gone.max())


def main():
    data_dir, measures = sys.argv[1], sys.argv[2]
    read = lambda name: json.load(open(os.path.join(data_dir, name), encoding='utf-8'))
    spans, pattern, scene = read('faser.json')['spans'], read('monster.json'), read('scen.json')
    cam = Camera(scene['camera'])
    source = read('kalla.json')
    away = scene['table']['dealerEdgeM'] + BEHIND_EDGE   # the dealer's edge of the felt, in metres from under the camera
    stretches = []
    for name in sorted(glob.glob(os.path.join(measures, 'rorelse-*.json'))):
        raw = json.load(open(name, encoding='utf-8'))
        st = Stretch(raw)
        st.wrist = {s: smooth(st.pose[:, i], 5) for s, i in (('L', 15), ('R', 16))}
        st.low = {s: cam.plane(st.wrist[s], WRIST_LOW) for s in 'LR'}
        # The wrist's speed, step by step, three ways: laid on the plane (too fast when the hand lifts or goes in depth),
        # across the line of sight (too slow then), and their geometric mean, which is the one to use.
        st.v = {}
        for s in 'LR':
            most = np.linalg.norm(np.diff(st.low[s], axis=0), axis=1) * st.fps
            least = cam.across(st.wrist[s], WRIST_LOW) * st.fps
            st.v[s] = {'most': most, 'least': least, 'best': np.sqrt(most * least)}
        st.tip = {}   # where the hand holds a card: between the thumb's tip and the index finger's; the wrist where the hand was not found
        for s in 'LR':
            tips = np.array([np.mean([e['hands'][s]['image'][4][:2], e['hands'][s]['image'][8][:2]], axis=0) if s in e['hands'] else [np.nan, np.nan] for e in raw['frames']])
            st.tip[s] = cam.plane(np.where(np.isnan(tips), st.wrist[s], tips), 0.0)
        st.mid_m, st.nose_m = cam.wall(smooth(st.mid, 5), away), cam.wall(smooth(st.pose[:, 0], 5), away)
        st.sh_l, st.sh_r = cam.wall(st.pose[:, 11], away), cam.wall(st.pose[:, 12], away)
        gx = ((st.blend('eyeLookOutLeft') - st.blend('eyeLookInLeft')) + (st.blend('eyeLookInRight') - st.blend('eyeLookOutRight'))) / 2   # plus: toward his left, the picture's right
        gy = st.blend('eyeLookDownLeft') - st.blend('eyeLookUpLeft')
        st.eye = np.stack([gx, gy], axis=1)
        st.signs = np.array([sign_at(spans, t) for t in st.t])
        st.eyes_px = np.array([np.mean([e['face']['points'][k] for k in ('eyeR_out', 'eyeR_in', 'eyeL_in', 'eyeL_out')], axis=0) if e['face'] else [np.nan, np.nan] for e in raw['frames']])
        stretches.append(st)
    where = lambda t: next((st for st in stretches if st.t[0] - 1e-6 <= t <= st.t[-1] + 1e-6), None)
    index = lambda st, t: int(np.clip(np.searchsorted(st.t, t - 1e-6), 0, len(st.t) - 1))

    for dealer, style in NAMES.items():
        d = pattern['dealers'][dealer]
        ev, unit = d['events'], d['unit_px']
        inside = (lambda t: t < SWAP[0]) if dealer == 'A' else (lambda t: t > SWAP[1])
        moves, shoe = ev['hand_moves'], d['shoe']
        to_shoe = [m for m in moves if m['hand'] == 'L' and m.get('to_zone') == shoe['zone']]
        from_shoe = [m for m in moves if m['hand'] == 'L' and m.get('from_zone') == shoe['zone']]
        right_out = [m for m in moves if m['hand'] == 'R' and m['length'] >= 0.6 and m['to'][1] > m['from'][1] + 0.08 * unit]
        right_back = [m for m in moves if m['hand'] == 'R' and m['length'] >= 0.6 and m['to'][1] < m['from'][1] - 0.08 * unit]
        rest_head = np.array(d['rest']['head'])

        def speeds(m):
            st = where(m['from_t'])
            a, b = index(st, m['from_t']), index(st, m['to_t'])
            v = {k: series[a:b] for k, series in st.v[m['hand']].items()}
            if b - a < 3 or np.isnan(v['most']).any() or np.isnan(v['least']).any():
                return None
            return v, st.fps

        def curve(group):
            rows, tops, means, paths = [], {'best': [], 'least': [], 'most': []}, {'best': [], 'least': [], 'most': []}, {'best': [], 'least': [], 'most': []}
            for m in group:
                got = speeds(m)
                if got is None or got[0]['best'].max() <= 0:
                    continue
                v, fps = got
                rows.append(np.interp(np.linspace(0, 1, 21), np.linspace(0, 1, len(v['best'])), v['best'] / v['best'].max()))
                for k in tops:
                    tops[k].append(float(v[k].max()))
                    paths[k].append(float(v[k].sum() / fps))
                    means[k].append(float(v[k].mean()))
            if not rows:
                return None
            rows = np.array(rows)
            three = lambda d, digits=2: {'best': stats(d['best'], digits), 'at_least': stats(d['least'], digits)['median'], 'at_most': stats(d['most'], digits)['median']}
            return {'moves': len(rows), 'time': [round(float(x), 2) for x in np.linspace(0, 1, 21)], 'speed_share_of_top': [round(float(x), 2) for x in np.median(rows, axis=0)],
                    'quarter_low': [round(float(x), 2) for x in np.percentile(rows, 25, axis=0)], 'quarter_high': [round(float(x), 2) for x in np.percentile(rows, 75, axis=0)],
                    'top_m_s': three(tops), 'mean_m_s': three(means), 'path_m': three(paths, 3)}

        # The handover: the left hand comes in with the card, the right hand takes it on.
        # The card is taken to be with the left hand until the two hands are nearest each other, and with the right hand after.
        handover = {'meets_after_left_arrives_s': [], 'hands_apart_m': [], 'dip_share_of_top': [], 'dip_m_s': [], 'top_before_m_s': [], 'top_after_m_s': [], 'top_to_top_s': [], 'curve': []}
        for m in from_shoe:
            st = where(m['from_t'])
            a, b = index(st, m['from_t']), index(st, m['to_t'] + 1.3)
            last = index(st, m['to_t'] + 0.6)
            if b - a < 12 or last <= a + 2:
                continue
            apart = np.linalg.norm(st.tip['L'][a:b + 1] - st.tip['R'][a:b + 1], axis=1)
            vl, vr = st.v['L']['best'][a:b], st.v['R']['best'][a:b]
            if np.isnan(apart).any() or np.isnan(vl).any() or np.isnan(vr).any():
                continue
            k = int(np.argmin(apart[:last - a + 1]))
            if k < 2 or k >= len(vr) - 3:
                continue
            i, j = int(np.argmax(vl[:k])), k + int(np.argmax(vr[k:k + 24]))
            if vr[j] < 0.3 or j <= i:          # the right hand does not carry anything away after this meeting
                continue
            card = np.concatenate([vl[:k], vr[k:]])
            top = max(vl[i], vr[j])
            handover['meets_after_left_arrives_s'].append(float(st.t[a + k] - m['to_t']))
            handover['hands_apart_m'].append(float(apart[k]))
            handover['dip_share_of_top'].append(float(card[i:j + 1].min() / top))
            handover['dip_m_s'].append(float(card[i:j + 1].min()))
            handover['top_before_m_s'].append(float(vl[i]))
            handover['top_after_m_s'].append(float(vr[j]))
            handover['top_to_top_s'].append(float((j - i) / st.fps))
            handover['curve'].append(np.interp(np.linspace(0, 1, 21), np.linspace(0, 1, j - i + 1), card[i:j + 1] / top))
        curves = np.array(handover.pop('curve')) if handover['curve'] else None

        # When the trunk and the head set off, against the hand: each at a fifth of its own way.
        def follow(group, part):
            lags, sizes, moved = [], [], 0
            for m in group:
                st = where(m['from_t'])
                a, b = index(st, m['from_t'] - 0.5), index(st, m['to_t'] + 0.4)
                if b - a < 8:
                    continue
                hand = st.wrist[m['hand']][a:b + 1, 0]
                series = st.mid_m[a:b + 1, 0] if part == 'trunk' else smooth(st.head[:, 1], 5)[a:b + 1]
                h0, _ = onset(hand)
                p0, size = onset(series)
                if h0 is None or p0 is None:
                    continue
                if size < (0.012 if part == 'trunk' else 5.0):   # under 12 mm or 5 degrees it does not go along
                    continue
                moved += 1
                lags.append((p0 - h0) / st.fps)
                sizes.append(size)
            return {'goes_along_share': round(moved / max(len(group), 1), 3), 'starts_after_hand_s': stats(lags), 'size': stats(sizes, 3)}

        # Where he looks: the head's turn and nod from rest, plus the eyes' own.
        def gaze_of(st):
            turn = st.head[:, 1] - rest_head[1] + EYE_FULL * st.eye[:, 0]
            down = st.head[:, 0] - rest_head[0] + EYE_FULL * st.eye[:, 1]
            out = np.full(len(turn), 'away', dtype=object)
            out[(np.abs(turn) < 10) & (down < 8)] = 'camera'
            out[(down >= 8) & (turn <= 12)] = 'table'
            out[turn > 12] = 'shoe side'
            out[np.isnan(turn) | np.isnan(down)] = None
            return out
        for st in stretches:
            st.gaze = gaze_of(st)

        def shares(pick):
            seen = np.concatenate([st.gaze[pick(st)] for st in stretches])
            seen = seen[np.array([g is not None for g in seen], bool)] if len(seen) else seen
            if not len(seen):
                return None
            return {'frames': int(len(seen)), **{k: round(float((seen == k).mean()), 3) for k in ('camera', 'shoe side', 'table', 'away')}}

        def during(group, lead=0.0, tail=0.0, at='span'):
            def pick(st):
                mask = np.zeros(len(st.t), bool)
                for m in group:
                    if where(m['from_t']) is st:
                        a, b = (m['from_t'] - lead, m['to_t'] + tail) if at == 'span' else (m['to_t'] - 0.1, m['to_t'] + 0.2)
                        mask |= (st.t >= a) & (st.t <= b)
                return mask
            return shares(pick)
        mine = lambda st: np.array([inside(t) for t in st.t])
        ahead = []   # how long the eyes have been on the table when the right hand arrives
        for m in right_out:
            st = where(m['from_t'])
            b = index(st, m['to_t'])
            k = b
            while k > 0 and st.gaze[k] == 'table' and st.t[b] - st.t[k] < 3:
                k -= 1
            if st.gaze[b] == 'table':
                ahead.append(float(st.t[b] - st.t[k]))

        # Rest: both hands still while bets are placed. Per two seconds, about the window's own mean.
        rest = {'nose_mm': [], 'nose_slow_mm': [], 'shoulders_mm': [], 'shoulders_slow_mm': [], 'head_degrees': [], 'wrist_L_mm': [], 'wrist_R_mm': [], 'breath_s': []}
        finger_noise = {'pinch': [], 'open': []}
        for st in stretches:
            own = mine(st)
            still = np.ones(len(st.t), bool)
            for s in 'LR':
                still &= np.concatenate([[False], np.linalg.norm(np.diff(st.wrist[s], axis=0), axis=1) * st.fps / unit < 0.15])
            for a, b in runs(still & own):
                for s in range(a, b - 60, 60):
                    win = slice(s, s + 60)
                    rms = lambda series: float(np.sqrt(np.nanmean(np.nansum((series - np.nanmean(series, axis=0)) ** 2, axis=1)))) * 1000
                    rest['nose_mm'].append(rms(cam.wall(st.pose[win, 0], away)))
                    rest['nose_slow_mm'].append(rms(cam.wall(smooth(st.pose[:, 0], 15)[win], away)))
                    rest['shoulders_mm'].append(rms(cam.wall(st.mid[win], away)))
                    rest['shoulders_slow_mm'].append(rms(cam.wall(smooth(st.mid, 15)[win], away)))
                    rest['head_degrees'].append(float(np.nanstd(st.head[win, :2], axis=0).mean()))
                    for side in 'LR':
                        rest[f'wrist_{side}_mm'].append(rms(cam.plane(st.pose[win, 15 if side == 'L' else 16], WRIST_LOW)))
                        for key in finger_noise:
                            v = st.hand[side][key][s:s + 15]
                            if (~np.isnan(v)).sum() >= 10:
                                finger_noise[key].append(float(np.nanpercentile(v, 90) - np.nanpercentile(v, 10)))
                if b - a >= 180:   # six seconds or more: is there a slow, regular rise and fall of the shoulders
                    y = st.mid_m[a:b, 1]
                    y = y - np.polyval(np.polyfit(np.arange(len(y)), y, 1), np.arange(len(y)))
                    power = np.abs(np.fft.rfft(y * np.hanning(len(y)))) ** 2
                    freq = np.fft.rfftfreq(len(y), 1 / st.fps)
                    band = (freq >= 0.12) & (freq <= 0.6)
                    if band.sum() >= 3 and power[band].max() > 4 * np.median(power[band]):
                        rest['breath_s'].append(float(1 / freq[band][np.argmax(power[band])]))

        # The hand that is not dealing, while the other one goes.
        def other(group):
            lengths, still_share = [], []
            for m in group:
                st = where(m['from_t'])
                a, b = index(st, m['from_t']), index(st, m['to_t'])
                v = st.v['R' if m['hand'] == 'L' else 'L']['best'][a:b]
                if len(v) < 2 or np.isnan(v).any():
                    continue
                lengths.append(float(v.sum() / st.fps))
                still_share.append(float((v < 0.05).mean()))
            return {'path_m': stats(lengths, 3), 'mean_m_s': stats([l / m['seconds'] for l, m in zip(lengths, group)], 3), 'still_share_of_the_time': stats(still_share)}

        # The grip while the card is carried: does the hand's shape change, more than it does at rest.
        def grip(group):
            out = {}
            for key in ('pinch', 'open'):
                ranges, rows = [], []
                for m in group:
                    st = where(m['from_t'])
                    a, b = index(st, m['from_t']), index(st, m['to_t'])
                    v = st.hand[m['hand']][key][a:b + 1]
                    ok = ~np.isnan(v)
                    if ok.sum() >= max(6, 0.6 * len(v)):
                        ranges.append(float(np.nanpercentile(v, 90) - np.nanpercentile(v, 10)))
                        rows.append(np.interp(np.linspace(0, 1, 11), np.linspace(0, 1, len(v))[ok], v[ok]))
                noise = float(np.percentile(finger_noise[key], 90)) if len(finger_noise[key]) >= 10 else None
                out[key] = {'change_during_the_carry': stats(ranges, 3), 'change_at_rest_p90': round(noise, 3) if noise else None,
                            'alive_share': round(float(np.mean([r > noise for r in ranges])), 3) if noise and ranges else None,
                            'through_the_carry': [round(float(x), 2) for x in np.median(np.array(rows), axis=0)] if rows else None}
            return out

        # How he sits: the shoulders' and the eyes' height over the felt while both hands are still and the head is level.
        posture = {}
        for label, behind in (('', BEHIND_EDGE), ('_if_10_cm_nearer', BEHIND_EDGE - 0.1), ('_if_10_cm_farther', BEHIND_EDGE + 0.1)):
            sh, ey = [], []
            for st in stretches:
                calm = mine(st) & (np.abs(st.head[:, 0] - rest_head[0]) < 5) & (np.abs(st.head[:, 1] - rest_head[1]) < 8)
                if calm.sum():
                    sh.append(cam.wall(st.mid[calm], scene['table']['dealerEdgeM'] + behind)[:, 1])
                    ey.append(cam.wall(st.eyes_px[calm], scene['table']['dealerEdgeM'] + behind)[:, 1])
            posture['shoulders_over_felt_m' + label] = round(float(np.nanmedian(np.concatenate(sh))), 3)
            posture['eyes_over_felt_m' + label] = round(float(np.nanmedian(np.concatenate(ey))), 3)
        reach = d['reach']['L'].get('1.4 to 9') or d['reach']['L'].get('0.9 to 1.4')
        width_m = float(np.nanmedian(np.concatenate([np.linalg.norm(st.sh_l - st.sh_r, axis=1)[mine(st)] for st in stretches])))
        px_m = width_m / unit
        result = {
            'about': 'One measured dealer\'s way of dealing, written by verktyg/stil.py from data/monster.json, data/scen.json and the measurements per frame. Seconds, degrees and metres. '
                     'Every group of numbers says how it was measured; n is how many moves or windows stand behind a median, p10 and p90 its spread. L and R are the dealer\'s own left and right; '
                     'the shoe stands at his left. The film is 30 measured frames a second, so no time is finer than 0.033 s.',
            'style': style, 'measured_seconds': d['seconds'],
            'kalla': {'film': source['source'], 'stretches_s': [[r['from'], r['to']] for r in source['runs'] if (inside(r['from']) or inside(r['to']))],
                      'note': 'The clean stretches of data/kalla.json in which this dealer works; the change of dealer at ' + f'{SWAP[0]:.0f} to {SWAP[1]:.0f} s is left out.'},
            'enhet': 'Seconds, degrees and metres throughout. Shares are 0 to 1. grip.pinch and grip.open are shares of the hand\'s own size. Nothing is left in shoulder widths; one shoulder width is metres.shoulder_width_m.',
            'metres': {'how': 'From the camera of data/scen.json. One camera gives no depth, so a wrist\'s speed and path are counted two ways. at_most: the wrist laid on a level plane ' + f'{WRIST_LOW} m over the felt, '
                              'which makes a lift of the hand look like a long way in depth. at_least: the picture\'s steps taken as steps across the line of sight, which does not see a move toward or away from the camera. '
                              'best: the geometric mean of the two. Tried on our own figure\'s films, where the truth is known (verktyg/docka.py): at_most came out 1.2 to 2.1 times the true top speed, at_least 0.6 to 0.7 times, '
                              'and best within about a third of it; the same for the paths. So read best as true within a third, and the shapes and the seconds as well measured. '
                              f'The shoulders and the head are laid on an upright plane {BEHIND_EDGE} m behind the dealer\'s edge of the felt; they move sideways and hold within about a tenth.',
                       'camera_check_m': round(cam.check_m, 4), 'shoulder_width_m': round(width_m, 3), 'metres_per_pixel_at_the_shoulders': round(px_m, 5)},
            'posture': {'how': 'He sits (a chair stands behind the table when the dealers change). The shoulders\' middle and the eyes while the head is level and turned to the camera, as height over the felt, '
                               f'taken {BEHIND_EDGE} m behind the dealer\'s edge of the felt; the two other pairs say what 10 cm nearer or farther would give. The camera is {scene["camera"]["heightM"]} m over the felt. '
                               'The floor is not in the picture: the table\'s height over the floor and the seat\'s are not measured.',
                        **posture, 'shoulder_width_m': round(width_m, 3)},
            'tempo': {'how': 'The wrist\'s moves, found by its speed (begins above 1.0 shoulder widths a second, ends under 0.35). Well measured.',
                      'left_to_shoe_s': shoe['out'], 'left_at_shoe_s': shoe['grip'], 'left_back_with_card_s': shoe['back'], 'left_whole_trip_s': shoe['whole'], 'grip_to_grip_when_dealing_on_s': shoe['grip_to_grip'],
                      'right_out_s': d['right_hand']['out']['seconds'], 'right_back_s': d['right_hand']['back']['seconds']},
            'speed': {'how': 'The wrist\'s speed through each move, in 21 steps of the move\'s own time, as a share of that move\'s top speed; the median over the moves, with the quarters. '
                             'top, mean and path each as best, at_least and at_most (see metres.how). The shape and the seconds are well measured; the metres hold within about a third.',
                      'left_to_shoe': curve(to_shoe), 'left_back_with_card': curve(from_shoe), 'right_out': curve(right_out), 'right_back': curve(right_back)},
            'handover': {'how': 'The hands are measured, not the card: the card is taken to be with the left hand until the two hands\' grips are nearest each other, and with the right hand from then on. '
                                'top_before is the left wrist\'s top speed on the way in, top_after the right wrist\'s on the way out, dip the lowest speed of the hand that has the card between those two tops '
                                '(as metres a second, the best estimate of metres.how, and as a share of the higher top: 0 is a full stop, 1 no dip). curve is that speed from the one top to the other in 21 steps. '
                                'On our own figure\'s film this way of measuring found one near stop where the figure\'s own numbers have three, so a short dip can be missed. '
                                'Counted only where the right hand does carry on (over 0.3 m/s) after the meeting. An estimate until the card\'s own track is laid beside it.',
                         **{k: stats(v, 3) for k, v in handover.items()},
                         'curve_time': [round(float(x), 2) for x in np.linspace(0, 1, 21)], 'curve_share_of_top': None if curves is None else [round(float(x), 2) for x in np.median(curves, axis=0)]},
            'trunk': {'how': 'The middle of the shoulders, sideways. Goes along when it moves more than 12 mm; its start and the hand\'s are both taken at a fifth of their own way. '
                             'The hips are hidden behind the table and are not measured. Lean and turn are those of the shoulder line in the picture while the left hand is at the shoe.',
                      'with_left_to_shoe': follow(to_shoe, 'trunk'), 'with_right_out': follow(right_out, 'trunk'),
                      'at_the_shoe': None if not reach else {'shoulders_sideways_m': round(reach['shoulders_side'] * unit * px_m, 3), 'shoulder_line_tilt_degrees': reach['shoulder_tilt'],
                                                             'trunk_turn_degrees': round(math.degrees(math.acos(min(reach['shoulder_width'], 1.0))), 1), 'elbow_degrees': reach['elbow'], 'elbow_at_rest_degrees': d['rest']['elbow_L']}},
            'head': {'how': 'The head\'s turn from MediaPipe\'s face. Goes along when it turns more than 5 degrees; starts compared as for the trunk. Well measured sideways, weaker for the nod.',
                     'with_left_to_shoe': follow(to_shoe, 'head'), 'with_right_out': follow(right_out, 'head'), 'moves_a_minute': d['head_moves']['a_minute'], 'move_degrees': d['head_moves']['degrees'],
                     'move_s': d['head_moves']['seconds'], 'top_degrees_s': d['head_moves']['top_speed'], 'wide_turns': d['wide_head_turns']},
            'gaze': {'how': f'Where he looks, from the head\'s turn and nod (from rest) plus the eyes\' own (MediaPipe\'s look scores, a full score taken as {EYE_FULL:.0f} degrees): camera within 10 degrees sideways and under 8 down; '
                            'table 8 or more down; shoe side more than 12 toward his left, where the shoe stands and the seats on that side lie (so a card laid there counts here, not as table); away the rest. '
                            'The card and the table cannot be told apart without the card\'s place. An estimate: the borders are chosen, not measured.',
                     'all_measured': shares(mine), 'while_dealing_sign': shares(lambda st: mine(st) & (st.signs == 'dealing')), 'while_bets_are_placed': shares(lambda st: mine(st) & np.isin(st.signs, BETTING)),
                     'left_going_to_shoe': during(to_shoe), 'left_at_shoe': during(to_shoe, at='end'), 'left_back_with_card': during(from_shoe), 'right_going_out': during(right_out), 'right_arriving': during(right_out, at='end'),
                     'on_the_table_before_right_arrives_s': stats(ahead), 'eyes_lowered_share_of_time': d['eyes_lowered']['share_of_time'], 'look_down_s': d['eyes_lowered']['seconds']},
            'blinks': {'how': 'The lids\' gap against the eye\'s width; closed up to 0.4 s is a blink. None is counted with the head bowed more than 12 degrees. Checked by eye on a sheet: most are true blinks.',
                       'a_minute': d['blinks']['a_minute'], 'seconds': d['blinks']['seconds'], 'between_s': d['blinks']['between'], 'double_share': d['blinks']['double_share'],
                       'within_0.3_s_of_a_move_starting_share': d['blinks']['at_a_move_share'], 'left_to_shoe_starting_with_a_blink_share': shoe['to_shoe']['blink_at_start_share']},
            'rest': {'how': 'Both hands still for two seconds or more, whatever the game shows; the spread about the mean of each two seconds (rms, millimetres). slow is the same after a half-second mean, which takes away the measuring\'s own flutter '
                            '(about 0.5 pixel, 0.6 mm): trust slow. breath is the period of a regular rise and fall of the shoulders where one stands out, else nothing.',
                     **{k: stats(v, 2) for k, v in rest.items()}},
            'other_hand': {'how': 'What the hand that is not dealing does during the other hand\'s move: its path, its mean speed (the best estimate of metres.how), and the share of the time it is still (under 0.05 m/s).',
                           'right_while_left_goes_to_shoe': other(to_shoe), 'right_while_left_comes_back': other(from_shoe), 'left_while_right_goes_out': other(right_out)},
            'grip': {'how': 'The hand\'s shape during a carry: pinch is thumb tip to index tip, open is the fingertips\' mean distance from the wrist, both against the hand\'s size. change is the largest minus the smallest '
                            'during the carry (the ninth tenth minus the first, so that one wild frame does not count); alive when it is more than nine in ten half-second windows change at rest; through_the_carry is the '
                            'median in 11 steps of the carry\'s time. The hand is 40 to 55 pixels and blurred at top speed, so this says whether the grip lives, not the joints\' angles.',
                     'left_back_with_card': grip(from_shoe), 'right_out': grip(right_out)},
        }
        with open(os.path.join(data_dir, f'stil-{style}.json'), 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=1)
        t = result['trunk']['with_left_to_shoe']
        print(f"{style}: shoulder width {width_m:.3f} m, camera check {cam.check_m * 1000:.1f} mm, to the shoe top {result['speed']['left_to_shoe']['top_m_s']['best']['median']} m/s, trunk goes along {t['goes_along_share']:.0%} "
              f"starting {t['starts_after_hand_s']['median'] if t['starts_after_hand_s'] else None} s after the hand, gaze while dealing {result['gaze']['while_dealing_sign']}")


if __name__ == '__main__':
    main()
