# Cuts everything the two dealers do into pieces and sorts the pieces into kinds: a card out of the shoe to a seat or
# to himself (with its parts: to the shoe, the grip, back, the handover, out, home), cards into the box for used cards,
# waiting, and the rest grouped by what the hands do. One catalogue per style, to be the list of moves to draw.
#   python -I live-bj/verktyg/rorelser.py live-bj/data live-bj/matt
# Reads data/monster.json (every hand move), faser.json, scen.json and the measurements per frame; never the film.
# Writes data/rorelser.json. Built on the hands, the places on the table and the game's signs. What needs the card
# itself (which side is up, the turning of his own card) is left open until the card's track is laid beside it.
#
# Where a hand is: the point between its thumb tip and index tip, laid on the felt in metres, against the shoe's
# mouth, the box, the seats' marks and the table's arc (data/scen.json). Seats are numbered 1 to 7 from the picture's
# left, which is the dealer's right.
import sys, json, os, glob, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from monster import Stretch, smooth, runs, stats, sign_at, SWAP   # noqa: E402
from stil import Camera, NAMES                                    # noqa: E402

OWN, PLAYERS = 0.33, 0.36       # metres from the arc's centre: nearer than OWN is in front of the dealer, beyond PLAYERS the players' cards
STILL = 1.5                     # seconds both hands lie still before it is called waiting
FILM_FPS = 60


def main():
    data_dir, measures = sys.argv[1], sys.argv[2]
    read = lambda name: json.load(open(os.path.join(data_dir, name), encoding='utf-8'))
    spans, pattern, scene = read('faser.json')['spans'], read('monster.json'), read('scen.json')
    cam = Camera(scene['camera'])
    mouth = np.mean(scene['things']['sko']['mouthMetres'], axis=0)
    box = np.mean(scene['things']['slaskbox']['footMetres'], axis=0)
    centre = np.array(scene['table']['arc']['centreM'])
    edge = scene['table']['dealerEdgeM']
    seats = [math.degrees(math.atan2(x - centre[0], centre[1] - y)) for x, y in scene['seatsUiM']]

    def place(p, hand):
        """The name of the place on the table where a point on the felt lies. Only the left hand goes to the shoe: the
        cards of the seats at the dealer's far left lie a hand's breadth from the shoe's mouth, and the right hand lays them."""
        if np.isnan(p).any():
            return None
        if hand == 'L' and np.linalg.norm(p - mouth) < 0.16:
            return 'shoe'
        if np.linalg.norm(p - box) < 0.22 or (p[0] < -0.42 and p[1] > 1.3):
            return 'box'
        r = float(np.linalg.norm(p - centre))
        if p[1] > edge + 0.03:   # it cannot lie on the felt behind the felt's edge: the hand is lifted, and where over the table is not known
            return 'lifted'
        if r >= PLAYERS:
            angle = math.degrees(math.atan2(p[0] - centre[0], centre[1] - p[1]))
            if hand == 'L' and angle > seats[-1] + 12:
                return 'shoe'
            return f'seat {1 + int(np.argmin([abs(angle - s) for s in seats]))}'
        if abs(p[0]) <= 0.16:
            return 'own cards'
        return 'toward the shoe' if p[0] > 0 else 'toward the box'

    stretches = []
    for name in sorted(glob.glob(os.path.join(measures, 'rorelse-*.json'))):
        raw = json.load(open(name, encoding='utf-8'))
        st = Stretch(raw)
        st.grip, st.speed = {}, {}
        for s, w, e in (('L', 15, 13), ('R', 16, 14)):
            wrist, elbow = smooth(st.pose[:, w], 5), smooth(st.pose[:, e], 5)
            tips = np.array([np.mean([f['hands'][s]['image'][4][:2], f['hands'][s]['image'][8][:2]], axis=0) if s in f['hands'] else [np.nan, np.nan] for f in raw['frames']])
            along = (wrist - elbow) / (np.linalg.norm(wrist - elbow, axis=1, keepdims=True) + 1e-9)
            guess = wrist + along * 0.33 * np.nanmedian(st.width)          # where the fingers are when the hand itself was not found: a hand's length past the wrist
            st.grip[s] = cam.plane(np.where(np.isnan(tips), guess, tips), 0.0)
            st.speed[s] = np.concatenate([[0], np.linalg.norm(np.diff(wrist, axis=0), axis=1) * st.fps / np.nanmedian(st.width)])
        st.signs = np.array([sign_at(spans, t) for t in st.t])
        st.found = (st.hand['L']['found'].astype(float) + st.hand['R']['found'].astype(float)) / 2
        stretches.append(st)
    where = lambda t: next((st for st in stretches if st.t[0] - 1e-6 <= t <= st.t[-1] + 1e-6), None)
    index = lambda st, t: int(np.clip(np.searchsorted(st.t, t - 1e-6), 0, len(st.t) - 1))

    def at(hand, t):
        st = where(t)
        if st is None:
            return None
        k = index(st, t)
        return place(np.nanmedian(st.grip[hand][max(k - 1, 0):k + 2], axis=0), hand)

    def clean(t0, t1):
        """Clean enough to measure: the body found all through, the hands in at least four frames of five, and not at a stretch's very end."""
        st = where(t0)
        if st is None or where(t1) is not st:
            return False
        a, b = index(st, t0), index(st, t1)
        return bool(a > 3 and b < len(st.t) - 4 and not np.isnan(st.pose[a:b + 1, 15:17]).any() and st.found[a:b + 1].mean() >= 0.8)

    frame = lambda t: int(round(t * FILM_FPS))
    result = {'about': 'Everything the measured dealers do, cut into pieces and sorted into kinds, written by verktyg/rorelser.py. One catalogue per style (data/stil-<style>.json), not per person. '
                       'from and to are seconds of the film, from_frame and to_frame its frames (60 a second). L and R are the dealer\'s own left and right; seats are 1 to 7 from the picture\'s left, the dealer\'s right. '
                       'Places: shoe, box (for used cards), own cards (in front of him), toward the shoe and toward the box (the felt beside his own cards), seat N (the players\' cards), behind the edge (off the felt, at his body). '
                       'clean says whether the piece is measured well enough to draw from. Built on the hands, not the card: which side of a card is up, and the turning of his own card, are not told apart here. '
                       'Kinds: card from the shoe to a seat (the left hand pulls it, the right hand lays it); card from the shoe, left hand alone (his own cards in the rounds checked by eye, and also any card whose laying '
                       'by the right hand was not found, so its count is too high and the seats\' too low); cards into the box (the right hand lifted to the box\'s opening); waiting (both hands still 1.5 s or more); '
                       'the other kinds are named after where the hands go and are not yet checked by eye.',
              'styles': {}}
    for dealer, style in NAMES.items():
        d = pattern['dealers'][dealer]
        moves = [dict(m) for m in d['events']['hand_moves']]
        for m in moves:
            m['start'], m['end'] = at(m['hand'], m['from_t']), at(m['hand'], m['to_t'])
        shoe_zone = d['shoe']['zone']
        if '--visa' in sys.argv:   # the moves of a stretch of seconds, with the places they were given: for checking against the film
            a, b = float(sys.argv[sys.argv.index('--visa') + 1]), float(sys.argv[sys.argv.index('--visa') + 2])
            for m in moves:
                if a <= m['from_t'] <= b:
                    st = where(m['from_t'])
                    g0, g1 = st.grip[m['hand']][index(st, m['from_t'])], st.grip[m['hand']][index(st, m['to_t'])]
                    print(f"{m['from_t']:8.2f}-{m['to_t']:8.2f} {m['hand']} {m['seconds']:.2f} s len {m['length']:.2f}  {m['start']} {np.round(g0, 2).tolist()} -> {m['end']} {np.round(g1, 2).tolist()}  wrist {m['from']} -> {m['to']}")
        used = set()
        pieces = []

        # A card out of the shoe: the left hand's pull is the anchor.
        for bi, back in enumerate(moves):
            if back['hand'] != 'L' or back.get('from_zone') != shoe_zone:
                continue
            ti = next((i for i in range(bi - 1, -1, -1) if moves[i]['hand'] == 'L'), None)
            reach = moves[ti] if ti is not None and moves[ti].get('to_zone') == shoe_zone and back['from_t'] - moves[ti]['to_t'] < 3 else None
            # The right hand lays it if it sets off for a seat as the left hand comes in; else the left hand has laid it itself.
            carry_i = next((i for i, n in enumerate(moves) if n['hand'] == 'R' and id(n) not in used and back['to_t'] - 0.3 <= n['from_t'] <= back['to_t'] + 0.4 and n['end'] and n['end'].startswith('seat')
                            and not (n['start'] or '').startswith('seat')), None)
            if carry_i is not None:
                carry, by = moves[carry_i], 'left pulls, right lays'
            else:
                carry, by = back, 'left alone'
            start = reach['from_t'] if reach else back['from_t']
            end = carry['to_t'] if carry else back['to_t']
            home = None
            if carry is not None and carry is not back:
                home = next((n for n in moves[carry_i + 1:] if n['hand'] == 'R' and n['from_t'] - carry['to_t'] < 2.5), None)
            # Laid by the left hand and not on a seat: in the rounds checked by eye these are his own cards, but a card whose
            # laying by the right hand was not found also lands here, so it is not called his own until the card's track says so.
            target = carry['end'] if carry['end'] and carry['end'].startswith('seat') else 'not on a seat'
            piece = {'kind': 'card from the shoe', 'to': target, 'hands': by, 'from': round(start, 3), 'to_t': round(end, 3), 'from_frame': frame(start), 'to_frame': frame(end),
                     'seconds': round(end - start, 3), 'begins': 'left hand already at the shoe' if reach is None else f"left hand at {reach['start'] or 'unknown'}", 'sign': back['sign'],
                     'parts': {'to_shoe_s': reach['seconds'] if reach else None, 'at_shoe_s': round(back['from_t'] - reach['to_t'], 3) if reach else None, 'back_s': back['seconds'],
                               'right_sets_off_after_left_arrives_s': round(carry['from_t'] - back['to_t'], 3) if carry is not None and carry is not back else None,
                               'lay_s': carry['seconds'] if carry is not None and carry is not back else None, 'lay_length': carry['length'] if carry is not None and carry is not back else None,
                               'hand_stays_at_card_s': carry['stay'] if carry is not None else None,
                               'right_home_s': home['seconds'] if home else None, 'right_home_to': home['end'] if home else None},
                     'clean': clean(start, end)}
            pieces.append(piece)
            used.update(id(x) for x in (reach, back, carry, home) if x is not None)

        # Cards into the box: the right hand lifted to the box's opening.
        rest = [m for m in moves if id(m) not in used]
        groups, current = [], []
        for m in rest:   # what is left, in bursts: a new burst after half a second without a move
            if current and m['from_t'] - max(x['to_t'] for x in current) > 0.5:
                groups.append(current)
                current = []
            current.append(m)
        if current:
            groups.append(current)
        for g in groups:
            t0, t1 = g[0]['from_t'], max(x['to_t'] for x in g)
            if where(t0) is None or where(t1) is not where(t0):
                continue
            visited = []
            for m in g:
                for p in (m['start'], m['end']):
                    if p and (not visited or visited[-1] != f"{m['hand']} {p}"):
                        visited.append(f"{m['hand']} {p}")
            ends = [m['end'] for m in g if m['end']]
            seats_touched = sorted({p for m in g for p in (m['start'], m['end']) if p and p.startswith('seat')})
            into_box = any(m['hand'] == 'R' and m['end'] == 'box' and m['to'][1] < 510 for m in g)
            longest = max(m['length'] for m in g)
            if into_box:
                kind = 'cards into the box'
            elif len(seats_touched) >= 3:
                kind = 'a sweep over several seats'
            elif seats_touched and 'own cards' in ends:
                kind = 'between a seat and his own cards'
            elif seats_touched:
                kind = 'a reach to a seat and back' if longest >= 0.6 else 'a small move at a seat'
            elif 'own cards' in ends or any(m['start'] == 'own cards' for m in g):
                kind = 'at his own cards'
            elif any(p in ('box',) for p in ends):
                kind = 'the right hand out to the box side'
            elif longest < 0.6:
                kind = 'a small shift of the hands'
            else:
                kind = 'other'
            pieces.append({'kind': kind, 'from': round(t0, 3), 'to_t': round(t1, 3), 'from_frame': frame(t0), 'to_frame': frame(t1), 'seconds': round(t1 - t0, 3), 'hands': ''.join(sorted({m['hand'] for m in g})),
                           'moves': len(g), 'path': visited[:12], 'sign': g[0]['sign'], 'clean': clean(t0, t1)})

        # Waiting: both hands still.
        inside = (lambda t: t < SWAP[0]) if dealer == 'A' else (lambda t: t > SWAP[1])
        for st in stretches:
            own = np.array([inside(t) for t in st.t])
            for a, b in runs((st.speed['L'] < 0.15) & (st.speed['R'] < 0.15) & own):
                if (b - a) / st.fps < STILL:
                    continue
                t0, t1 = float(st.t[a]), float(st.t[b - 1])
                pieces.append({'kind': 'waiting', 'from': round(t0, 3), 'to_t': round(t1, 3), 'from_frame': frame(t0), 'to_frame': frame(t1), 'seconds': round(t1 - t0, 3),
                               'left_at': at('L', (t0 + t1) / 2), 'right_at': at('R', (t0 + t1) / 2), 'sign': st.signs[(a + b) // 2], 'clean': clean(t0, t1)})
        pieces.sort(key=lambda p: p['from'])

        kinds = {}
        for p in pieces:
            key = p['kind'] if p['kind'] != 'card from the shoe' else ('card from the shoe, left hand alone' if p['to'] == 'not on a seat' else 'card from the shoe to a seat')
            kinds.setdefault(key, []).append(p)
        summary = {}
        for key, ps in sorted(kinds.items(), key=lambda kv: -len(kv[1])):
            entry = {'count': len(ps), 'clean': sum(1 for p in ps if p['clean']), 'seconds': stats([p['seconds'] for p in ps])}
            if key.startswith('card from the shoe'):
                entry['by'] = {h: sum(1 for p in ps if p['hands'] == h) for h in sorted({p['hands'] for p in ps})}
                entry['parts'] = {part: stats([p['parts'][part] for p in ps if isinstance(p['parts'][part], (int, float))]) for part in ('to_shoe_s', 'at_shoe_s', 'back_s', 'right_sets_off_after_left_arrives_s', 'lay_s', 'lay_length', 'hand_stays_at_card_s', 'right_home_s')}
                entry['begins'] = {b: sum(1 for p in ps if p['begins'] == b) for b in sorted({p['begins'] for p in ps})}
                if key.endswith('to a seat'):
                    entry['per_seat'] = {s: {'count': len(q), 'seconds': stats([p['seconds'] for p in q]), 'lay_s': stats([p['parts']['lay_s'] for p in q if p['parts']['lay_s']])}
                                         for s in sorted({p['to'] for p in ps}) for q in [[p for p in ps if p['to'] == s]]}
            if key == 'waiting':
                entry['hands_at'] = {k: v for k, v in sorted(((f"L {p['left_at']} | R {p['right_at']}", sum(1 for q in ps if q['left_at'] == p['left_at'] and q['right_at'] == p['right_at'])) for p in ps), key=lambda kv: -kv[1])}
            summary[key] = entry
        result['styles'][style] = {'measured_seconds': d['seconds'], 'kinds': summary, 'pieces': pieces}
        print(f'{style}: {len(pieces)} pieces;', {k: (v['count'], v['seconds']['median'] if v['seconds'] else None) for k, v in summary.items()})
    with open(os.path.join(data_dir, 'rorelser.json'), 'w', encoding='utf-8') as f:
        json.dump(result, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
