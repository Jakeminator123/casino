# Cuts the whole live film into pieces per dealer and PER HAND: each hand has its own track (the dealer's own right and
# left), and the head and the eyes a third. Every piece gets a category from the motion schema
# (standarddocka/rorelsekatalog.json), the seat and card where that can be told, the hand's state (lage) at its start
# and end, and how sure the cut is. Then: how often each category comes and how long it lasts, where each hand gathers
# when it is still (its states), how often each state follows each other, how often the hands go out of step (the left
# fetching the next card before the right is home), and which pieces are best to lift, with the bridges they need.
#   python -I live-bj/verktyg/segment.py dela live-bj/data live-bj/matt [--visa <a> <b>]
#   python -I live-bj/verktyg/segment.py rita live-bj/data <ut-mapp>                       the timeline and the tables as pictures, numbers only
#   python -I live-bj/verktyg/segment.py blad live-bj/data live-bj/matt live-bj/video/kalla.mp4 live-bj/rutor/segment
# dela reads data/kalla.json, faser.json, scen.json, givar.json, monster.json, the lifts' film seconds in data/lyft/ and
# the measurements per frame (matt/); never the film. It writes data/segment.json. rita draws from data/segment.json
# alone (no frame of the film), for the studio's proof. blad draws the timeline and a sheet per category with frames of
# the film: those show real people and are written under live-bj/rutor/ only, which Git ignores.
#
# Seats are 1 to 7 from the picture's left, the dealer's right. Frames (ruta) are the film's own, 60 a second; the
# measurements are every other frame. Lengths on the felt are metres in the felt's plane (data/scen.json): x to the
# picture's right, y away from the camera, the dealer's edge at y 1.54.
import sys, json, os, glob, math, collections
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from monster import Stretch, smooth, runs, stats, sign_at, SWAP   # noqa: E402
from stil import Camera, NAMES, DOLLS                             # noqa: E402

FILM_FPS = 60
SLOW, FAST = 0.35, 1.0     # shoulder widths a second: a hand under SLOW is still; a move reaches FAST (as monster.py)
HOLD = 0.2                 # seconds still before it is a stop
REST = 0.6                 # seconds still before a stop is a rest (VILA or VANTA) and not a short stop in the work (STOPP)
SMALL = 0.05               # metres: a move this short between two stops at the same place is a small move of its own
SEAT_R, OWN_R = 0.09, 0.10 # metres from a seat's card place or the dealer's own card place that count as at it
CARD_R = 0.10              # metres from a card lying at a seat that count as at that seat
LAY_NEAR = 0.16            # metres: the hand nearer than this to a card as it comes to rest laid it
EDGE_PAD = 0.03            # metres past the dealer's edge where the hand is off the felt, at his body
HEAD_TURN, HEAD_NOD = 12.0, 12.0   # degrees from the resting head: turned toward a side, bowed toward the table

# The hand's states. A state is where a hand is, not a whole picture: an anchor (A1, A2.3, A3PnCm) is one state per
# hand. The numbers follow the anchors': 1 rest, 2 the shoe, 3 a card on the table, 4 the box for used cards.
STATES = {
    'H': {'framfor': 'H1', 'sidan': 'H1S', 'motskon': 'H2M', 'skon': 'H2', 'plats': 'H3P{n}', 'egna': 'H3D', 'ladan': 'H4', 'kroppen': 'H0'},
    'V': {'framfor': 'V1', 'sidan': 'V1', 'motskon': 'V1S', 'skon': 'V2.3', 'plats': 'V3P{n}', 'egna': 'V3D', 'ladan': 'V4', 'kroppen': 'V0'},
}
STATE_WORDS = {
    'H1': 'högern vilar framför kroppen, vid eller bredvid de egna korten (som i A1 och A2.3)',
    'H1S': 'högern vilar utsträckt åt sidan, mot lådan för använda kort (medan insatserna läggs)',
    'H2M': 'högern mot skon, vid mötet där den tar kortet',
    'H2': 'högern vid skon (bara när skon sköts)',
    'H3Pn': 'högern vid kortet på plats n (som i A3PnCm)',
    'H3D': 'högern vid dealerns egna kort',
    'H4': 'högern vid lådan för använda kort',
    'V1': 'vänstern vilar framför kroppen (som i A1)',
    'V1S': 'vänstern vilar mellan kroppen och skon, där den lämnar kortet i handbytet',
    'V2.3': 'vänstern vid skon, redo att ta kortet (som i A2.3)',
    'V3Pn': 'vänstern vid kortet på plats n (platserna närmast skon, när vänstern ger ensam)',
    'V3D': 'vänstern vid dealerns egna kort (som i A3DCm)',
    'V4': 'vänstern vid lådan för använda kort',
    'H0': 'högern uppe vid kroppen eller ansiktet (härmas inte)',
    'V0': 'vänstern uppe vid kroppen eller ansiktet (härmas inte)',
}
REST_STATES = {'H1', 'H1S', 'V1', 'V1S'}
RESTING_AT_CARDS = {'H3D', 'V3D'}   # where a hand also rests a while: at his own cards
WAIT_STATES = REST_STATES | RESTING_AT_CARDS | {'V2.3'}   # where a hand waits (the left also at the shoe, ready)
BODY_FRAMES = 8                      # measured frames (a quarter second) the found hand must be up at his body before a move counts as going there
WITHIN_REST = 0.15                   # metres: a move that stays this near where it began, where the hand waits, is a small move in the wait (half again at the shoe, where the lifted hand is drawn out on the felt)

CATEGORIES = {   # id: (hands, words)
    'GIV': ('HV', 'kortet till en spelare: handen lägger kortet på plats n (kort m); högern tar det ur vänsterns hand vid mötet, eller vänstern ger ensam'),
    'GIV-EGET': ('HV', 'kortet till dealern själv: handen lägger kortet på dealerns egen plats'),
    'DRA': ('V', 'vänstern tar kortet ur skon och drar det till mötet, där högern tar över; slutar där vänstern stannar igen'),
    'TILL-SKON': ('V', 'vänstern till skon utan kort'),
    'HEM': ('HV', 'handen tillbaka till sitt viloläge från ett annat ställe (ett kort, skon, lådan), utan kort'),
    'BYT-VILA': ('HV', 'handen flyttar från ett viloläge till ett annat, till exempel från sidan till framför kroppen'),
    'PEKA': ('HV', 'handen ut till en plats och åter utan att lägga eller ta ett kort: visar mot spelaren som ska agera, eller rör vid hans kort'),
    'SVEP': ('HV', 'handen sveper över bordet, tvärs över platserna, utan kort'),
    'KORT-IN': ('HV', 'korten samlas in från platserna och de egna och läggs i lådan för använda kort (slasken)'),
    'RATTA': ('HV', 'en liten rörelse vid ett kort som redan ligger: rättar till det'),
    'SKON': ('HV', 'sköter skon: fyller på eller byter kort, med båda händerna vid skon; ska inte härmas i en runda'),
    'ANNAT': ('HV', 'det som inte passar något annat, och handen uppe vid kroppen eller ansiktet: ska inte härmas'),
    'VILA': ('HV', 'handen stilla i ett läge minst 0,6 s'),
    'VANTA': ('HV', 'handen i ett läge minst 0,6 s, med små egna rörelser (under 5 cm)'),
    'STOPP': ('HV', 'ett kort stopp i arbetet, 0,2–0,6 s: greppet vid skon, handen kvar vid kortet'),
}
HEAD_CATEGORIES = {
    'KAMERAN': 'huvudet rakt fram och ögonen uppe: ser i kameran',
    'BORDET': 'ögonen sänkta eller huvudet böjt: ser på bordet',
    'MOT-SKON': 'huvudet vridet mot skon (åt dealerns vänster)',
    'MOT-LADAN': 'huvudet vridet mot lådan och platserna 1–3 (åt dealerns höger)',
    'OKANT': 'ansiktet hittades inte',
}
MOVES = ['GIV', 'GIV-EGET', 'DRA', 'TILL-SKON', 'HEM', 'BYT-VILA', 'PEKA', 'SVEP', 'KORT-IN', 'RATTA', 'SKON', 'ANNAT']
HOLDS = ['VILA', 'VANTA', 'STOPP']


def film_frame(t):
    return int(round(t * FILM_FPS))


class Table:
    """The fixed things of the felt, and the names of the places on it."""

    def __init__(self, scene):
        self.cam = Camera(scene['camera'])
        self.shoe = np.mean(scene['things']['sko']['footMetres'][:2], axis=0)        # the middle of the shoe's front
        self.box = np.mean(scene['things']['slaskbox']['footMetres'], axis=0)
        self.edge = scene['table']['dealerEdgeM']
        self.seats = {int(k[4:]): np.array(v['m']) for k, v in scene['places'].items() if k.startswith('seat')}
        self.own = np.array(scene['places']['dealer']['m'])

    def region(self, p, lying=(), hand='V'):
        """Where a point on the felt is: skon, ladan, framfor (also off the felt at his body), plats, egna, sidan, motskon.
        lying is the cards on the table just then, (seat, point): a hand at one of them is at that seat. Seat 7's cards
        lie a hand's breadth from the shoe, so for the right hand (which never takes a card from the shoe) a card there
        comes first."""
        if p is None or np.isnan(p).any():
            return None, None
        x, y = float(p[0]), float(p[1])
        if hand == 'H':
            near = [(n, float(np.linalg.norm(p - c))) for n, c in lying if n != 'D' and np.linalg.norm(p - c) < CARD_R]
            if near:
                return 'plats', min(near, key=lambda q: q[1])[0]
        if y > 1.9 or y < 0.7:   # lifted high, to his face or chest: laid on the felt it lands far behind him (or, over the camera, in front of the felt)
            return 'kroppen', None
        if np.linalg.norm(p - self.shoe) < 0.16 or (x > 0.40 and y > 1.40):
            return 'skon', None
        if np.linalg.norm(p - self.box) < 0.14 or (x < -0.48 and y > 1.42):
            return 'ladan', None
        if y > self.edge + EDGE_PAD:
            return 'framfor', None
        if y < 1.32:
            near = [(n, float(np.linalg.norm(p - c))) for n, c in lying if n != 'D']
            near = [q for q in near if q[1] < CARD_R] or [(n, float(np.linalg.norm(p - c))) for n, c in self.seats.items() if np.linalg.norm(p - c) < SEAT_R]
            if near:
                return 'plats', min(near, key=lambda q: q[1])[0]
        if np.linalg.norm(p - self.own) < OWN_R:
            return 'egna', None
        if x < -0.28:
            return 'sidan', None
        if x > 0.14:
            return 'motskon', None
        return 'framfor', None


def state_name(hand, region, seat, own_cards_lie):
    """The hand's state from where it is. At the dealer's own place it is H3D/V3D only while his cards lie there."""
    if region is None:
        return None
    if region == 'egna' and not own_cards_lie:
        region = 'framfor'
    return STATES[hand][region].format(n=seat)


def load(data_dir):
    read = lambda name: json.load(open(os.path.join(data_dir, name), encoding='utf-8'))
    return {'source': read('kalla.json'), 'phases': read('faser.json'), 'scene': read('scen.json'), 'cards': read('givar.json')['cards'], 'pattern': read('monster.json'), 'setup': read('uppsattning.json')}


DEALING = ('dealing', 'make your decision')


def dealt(c, spans):
    """A card that came to rest while the game deals: what lands at other times is gathered, not given."""
    return c['landed'] is not None and any(sign_at(spans, c['landed'] + d) in DEALING for d in (-0.5, 0.0, 0.5))


def card_numbers(cards, rounds, spans):
    """Number the cards given per place within each round: C1, C2 ... The round is the game's own (data/faser.json); a
    card outside every round, or in a round the film shows only part of, gets its number marked unsure."""
    out = {}
    given = [c for c in cards if dealt(c, spans)]
    for c in given:
        r = next((r for r in rounds if r['from'] - 1 <= c['landed'] <= r['to'] + 2), None)
        if r is None:
            out[id(c)] = (None, False)
            continue
        same = sorted((d for d in given if d['to']['place'] == c['to']['place'] and r['from'] - 1 <= d['landed'] <= r['to'] + 2), key=lambda d: d['landed'])
        out[id(c)] = (1 + same.index(c), bool(r['whole']))
    return out


def track(raw, table, unit, keep):
    """One stretch, the frames that belong to one dealer: per hand the grip on the felt, the wrist's speed and whether the hand was found."""
    st = Stretch(raw)
    idx = np.where(keep(st.t))[0]
    if len(idx) < 30:
        return None
    frames = [raw['frames'][i] for i in idx]
    out = {'from': raw['from'], 't': st.t[idx], 'f': np.array([e['f'] for e in frames]), 'fps': st.fps, 'head': st.head[idx], 'mid': st.mid[idx], 'hands': {}}
    for s, w, e in (('V', 15, 13), ('H', 16, 14)):
        side = 'L' if s == 'V' else 'R'
        wrist, elbow = smooth(st.pose[idx, w], 5), smooth(st.pose[idx, e], 5)
        tips = np.array([np.mean([f['hands'][side]['image'][4][:2], f['hands'][side]['image'][8][:2]], axis=0) if side in f['hands'] else [np.nan, np.nan] for f in frames])
        along = (wrist - elbow) / (np.linalg.norm(wrist - elbow, axis=1, keepdims=True) + 1e-9)
        guess = wrist + along * 0.33 * np.nanmedian(st.width[idx])      # where the fingers are when the hand itself was not found
        px = smooth(np.where(np.isnan(tips), guess, tips), 3)
        grip = table.cam.plane(px, 0.0)
        speed = np.concatenate([[0.0], np.linalg.norm(np.diff(wrist, axis=0), axis=1) * st.fps / unit])
        still = speed < SLOW
        unknown = np.isnan(speed)
        for a, b in runs(unknown):   # a hole of a few frames inside a stop is still the stop
            if b - a <= 3 and a > 0 and b < len(still) and still[a - 1] and still[b]:
                still[a:b] = True
        out['hands'][s] = {'px': px, 'grip': grip, 'speed': np.nan_to_num(speed, nan=0.0), 'still': still, 'found': st.hand[side]['found'][idx] & ~np.isnan(st.pose[idx, w, 0]),
                           'pose': ~np.isnan(st.pose[idx, w, 0])}
    return out


def main_dela(data_dir, measures):
    d = load(data_dir)
    table = Table(d['scene'])
    spans, rounds, cards = d['phases']['spans'], d['phases']['rounds'], d['cards']
    numbers = card_numbers(cards, rounds, spans)
    decisions = [s['from'] for s in spans if s['sign'] == 'make your decision']
    lifted = []
    for name in sorted(glob.glob(os.path.join(data_dir, 'lyft', '*.json'))):
        head = open(name, encoding='utf-8').read(4000)
        sec = json.loads('{' + head[head.index('"film_seconds"'):head.index(']', head.index('"film_seconds"')) + 1] + '}')['film_seconds'] if '"film_seconds"' in head else None
        if sec:
            lifted.append((os.path.basename(name)[:-5], sec[0], sec[1]))
    files = [json.load(open(n, encoding='utf-8')) for n in sorted(glob.glob(os.path.join(measures, 'rorelse-*.json')))]
    result = {'dealrar': {}, 'decisions': decisions}
    for dealer, style in NAMES.items():
        pat = d['pattern']['dealers'][dealer]
        unit = pat['unit_px']
        keep = (lambda t: t < SWAP[0]) if dealer == 'A' else (lambda t: t > SWAP[1])
        rest_head = np.array(pat['rest']['head'])
        lowered = pat['events']['eyes_lowered']
        tracks = [x for x in (track(raw, table, unit, keep) for raw in files) if x is not None]
        mine = [c for c in cards if dealt(c, spans) and keep(np.array([c['landed']]))[0]]

        pieces = {'H': [], 'V': [], 'huvud': []}
        for tr in tracks:
            t, fps = tr['t'], tr['fps']
            k_of = lambda s: int(np.clip(np.searchsorted(t, s - 1e-6), 0, len(t) - 1))
            inside = lambda s: t[0] <= s <= t[-1]
            # The cards lying on the table in each frame (data/givar.json, this stretch's own).
            here = [c for c in cards if c['landed'] is not None and abs(c['stretch'] - tr['from']) < 0.01]
            spots = [('D' if c['to']['place'] == 'dealer' else int(c['to']['place'][4:]), np.array(c['to']['m']), c['landed'] - 0.1, c['collected'] if c['collected'] is not None else 1e9) for c in here]
            lying = [[(n, m) for n, m, a0, b0 in spots if a0 <= x < b0] for x in t]
            # Who laid each card that came to rest in this stretch: the hand nearest to it as it lies still.
            lay_at = {'H': {}, 'V': {}}
            for c in mine:
                if not inside(c['landed']) or c.get('alreadyThere') or c['landed'] - t[0] < 0.3:
                    continue
                a, b = k_of(c['landed'] - 0.25), k_of(c['landed'] + 0.1)
                best = None
                for s in 'HV':
                    dist = np.linalg.norm(tr['hands'][s]['grip'][a:b + 1] - np.array(c['to']['m']), axis=1)
                    if np.isnan(dist).all():
                        continue
                    m = float(np.nanmin(dist))
                    if best is None or m < best[1]:
                        best = (s, m)
                place = 'D' if c['to']['place'] == 'dealer' else int(c['to']['place'][4:])
                num, sure = numbers.get(id(c), (None, False))
                if best is None or best[1] > LAY_NEAR:
                    continue
                s = best[0]
                a2, b2 = k_of(c['landed'] - 0.35), k_of(c['landed'] + 0.2)
                k = a2 + int(np.argmin(tr['hands'][s]['speed'][a2:b2 + 1]))
                lay_at[s][k] = {'plats': place, 'kort': num, 'kort_saker': sure, 'fran_skon': c['from'] == 'sko', 'ut_ur_skon': c['left'], 'ligger': c['landed']}
            collected = {'H': [], 'V': []}
            for c in cards:
                if c['collected'] is None or not inside(c['collected']):
                    continue
                k = k_of(c['collected'])
                dist = {s: float(np.linalg.norm(tr['hands'][s]['grip'][k] - np.array(c['to']['m']))) for s in 'HV'}
                s = min(dist, key=lambda q: dist[q] if not math.isnan(dist[q]) else 9)
                collected[s].append(k)
            outs = [c['left'] for c in cards if c['from'] == 'sko' and c['left'] is not None and inside(c['left'])]
            # The shoe looked after: the right hand at the shoe (it never deals from there).
            hr = [table.region(p, lying[k], 'H')[0] for k, p in enumerate(tr['hands']['H']['grip'])]
            at_shoe = np.array([r == 'skon' for r in hr])
            shoe_care = np.zeros(len(t), bool)
            for a, b in runs(at_shoe):
                if b - a >= 1.0 * fps:
                    shoe_care[max(a - int(fps), 0):min(b + int(fps), len(t))] = True
            for a, b in runs(~shoe_care):   # gaps under three seconds between two spells are the same spell
                if 0 < a and b < len(t) and (b - a) < 3 * fps:
                    shoe_care[a:b] = True

            # The left hand's grips at the shoe, and the right hand's lays as they are found: a card that was not seen is
            # still a deal when the right hand stops at a seat just after the left was at the shoe, and the other way round.
            v_regions = [table.region(p, lying[k]) for k, p in enumerate(tr['hands']['V']['grip'])]
            v_grips = [float(t[a + int(np.argmin(tr['hands']['V']['speed'][a:b]))]) for a, b in runs(np.array([r[0] == 'skon' for r in v_regions]))]
            h_gives = []
            for s in 'HV':
                h = tr['hands'][s]
                grip, speed = h['grip'], h['speed']
                regions = [table.region(p, lying[k], s) for k, p in enumerate(grip)]
                nodes = []
                for a, b in runs(h['still']):
                    if b - a >= HOLD * fps:
                        nodes.append({'a': a, 'b': b, 'hold': True, 'small': 0, 'events': []})
                points = sorted(set(lay_at[s]) | set(collected[s]))
                if s == 'V':   # the grip at the shoe: the slowest frame of each visit there
                    for a, b in runs(np.array([r[0] == 'skon' for r in regions])):
                        points.append(a + int(np.argmin(speed[a:b])))
                for k in sorted(set(points)):
                    host = next((n for n in nodes if n['a'] <= k < n['b']), None)
                    ev = []
                    if k in lay_at[s]:
                        ev.append(('lagt', lay_at[s][k]))
                    if k in collected[s]:
                        ev.append(('tar in', None))
                    if s == 'V' and regions[k][0] == 'skon':
                        out_now = [o for o in outs if -0.2 <= o - t[k] <= 0.7]
                        ev.append(('grepp', {'kortet_ut': out_now[0] if out_now else None}))
                    if host is not None:
                        host['events'] += ev
                    elif ev and not (ev[0][0] == 'tar in' and len(ev) == 1):
                        nodes.append({'a': k, 'b': k + 1, 'hold': False, 'small': 0, 'events': ev})
                    else:
                        near = min(nodes, key=lambda n: min(abs(n['a'] - k), abs(n['b'] - k)), default=None)
                        if near is not None and min(abs(near['a'] - k), abs(near['b'] - k)) < fps:
                            near['events'] += ev
                nodes.sort(key=lambda n: n['a'])
                # Small moves between two stops at the same place belong to the stop: waiting with small moves of its own.
                merged = []
                for n in nodes:
                    if merged and merged[-1]['hold'] and n['hold'] and not any(e[0] in ('lagt', 'grepp') for e in n['events']):
                        p, q = merged[-1], n
                        gp, gq = np.nanmedian(grip[p['a']:p['b']], axis=0), np.nanmedian(grip[q['a']:q['b']], axis=0)
                        gap = speed[p['b']:q['a']]
                        if np.linalg.norm(gp - gq) < SMALL and (len(gap) == 0 or gap.max() < FAST * 1.5) and (q['a'] - p['b']) < 1.0 * fps:
                            p['b'] = q['b']
                            p['small'] += 1 + q['small']
                            p['events'] += q['events']
                            continue
                    merged.append(n)
                nodes = merged

                def node_state(n):
                    lay = next((e[1] for e in n['events'] if e[0] == 'lagt'), None)
                    if lay is not None:
                        return f"{s}3D" if lay['plats'] == 'D' else f"{s}3P{lay['plats']}"
                    if any(e[0] == 'grepp' for e in n['events']):
                        return 'V2.3'
                    k = n['a'] if not n['hold'] else (n['a'] + n['b']) // 2
                    p = np.nanmedian(grip[n['a']:n['b']], axis=0) if n['hold'] else np.nanmedian(grip[max(k - 1, 0):k + 2], axis=0)
                    reg, seat = table.region(p, lying[k], s)
                    return state_name(s, reg, seat, any(n == 'D' for n, _ in lying[k]))

                def node_point(n):
                    p = np.nanmedian(grip[n['a']:n['b']], axis=0)
                    return None if np.isnan(p).any() else [round(float(p[0]), 3), round(float(p[1]), 3)]

                cuts = [{'a': 0, 'b': 0, 'hold': False, 'edge': True, 'events': [], 'small': 0}] + nodes + [{'a': len(t) - 1, 'b': len(t) - 1, 'hold': False, 'edge': True, 'events': [], 'small': 0}]
                for i, n in enumerate(cuts):
                    if not n.get('edge'):
                        n['state'], n['point'] = node_state(n), node_point(n)
                    else:
                        n['state'], n['point'] = None, None

                def base(a, b, kind):
                    a, b = int(a), int(max(b, a))
                    seen = float(h['found'][a:b + 1].mean()) if b >= a else 0.0
                    return {'hand': s, 'kat': kind, 'fran_s': round(float(t[a]), 3), 'till_s': round(float(t[b]), 3), 'fran_ruta': int(tr['f'][a]), 'till_ruta': int(tr['f'][b]),
                            'sek': round(float(t[b] - t[a]), 3), 'syns': round(seen, 2), '_a': a, '_b': b, '_tr': id(tr)}

                for i in range(len(cuts) - 1):
                    p, q = cuts[i], cuts[i + 1]
                    if p['hold']:
                        kind = 'VILA' if (p['b'] - p['a']) / fps >= REST and p['small'] == 0 else 'VANTA' if (p['b'] - p['a']) / fps >= REST else 'STOPP'
                        if p['state'] in ('H0', 'V0'):   # the hand still at his face or chest: not to be copied
                            kind = 'ANNAT'
                        piece = base(p['a'], p['b'] - 1, kind)
                        piece.update({'fran_lage': p['state'], 'till_lage': p['state'], 'sma_rorelser': p['small'], 'punkt': p['point']})
                        ev = next((e[1] for e in p['events'] if e[0] == 'lagt'), None)
                        if ev:
                            piece.update({'plats': ev['plats'], 'kort': ev['kort']})
                        pieces[s].append(piece)
                    a, b = (p['b'] - 1 if p['hold'] else p['a']), q['a']
                    if b - a < 2:
                        continue
                    piece = base(a, b, None)
                    path = grip[a:b + 1]
                    ok = ~np.isnan(path).any(axis=1)
                    regs = [regions[k] for k in range(a, b + 1)]
                    visited = []
                    for r in regs:
                        name = None if r[0] is None else (f"plats {r[1]}" if r[0] == 'plats' else r[0])
                        if name and (not visited or visited[-1] != name):
                            visited.append(name)
                    lay = next((e[1] for e in q['events'] if e[0] == 'lagt'), None)
                    grip_start = next((e[1] for e in p['events'] if e[0] == 'grepp'), None)
                    took = sum(1 for k in collected[s] if a <= k <= b) + sum(1 for e in q['events'] if e[0] == 'tar in')
                    lateral = float(np.nanmax(path[ok, 0]) - np.nanmin(path[ok, 0])) if ok.any() else 0.0
                    reach = float(np.nanmin(path[ok, 1])) if ok.any() else 9.0
                    net = float(np.linalg.norm(path[ok][-1] - path[ok][0])) if ok.sum() > 1 else 0.0
                    seat_frames = collections.Counter(r[1] for r in regs if r[0] == 'plats')
                    top_seat = seat_frames.most_common(1)[0][0] if seat_frames and seat_frames.most_common(1)[0][1] >= 3 else None
                    start_state, end_state = p.get('state') or '', q.get('state') or ''
                    care = shoe_care[a:b + 1].mean() > 0.3
                    kind, extra = None, {}
                    if care and lay is None and not (s == 'V' and grip_start is not None and grip_start['kortet_ut'] is not None):
                        kind = 'SKON'
                    elif lay is not None:
                        kind = 'GIV-EGET' if lay['plats'] == 'D' else 'GIV'
                        extra = {'plats': lay['plats'], 'kort': lay['kort'], 'kort_saker': lay['kort_saker'], 'kortet_ligger_s': lay['ligger']}
                        if lay['ut_ur_skon'] is not None:
                            extra['kortet_ut_s'] = lay['ut_ur_skon']
                    elif s == 'V' and grip_start is not None and grip_start['kortet_ut'] is not None:
                        kind = 'DRA'
                        extra = {'kortet_ut_s': grip_start['kortet_ut']}
                    elif s == 'V' and grip_start is not None and visited[1:] and any(float(t[a]) <= g1 <= float(t[a]) + 2.5 for g0, g1 in h_gives):
                        kind = 'DRA'
                        extra = {'kortet_sett': False}
                    elif took or (s == 'H' and 'ladan' in visited and any(v.startswith('plats') or v == 'egna' for v in visited)):
                        kind = 'KORT-IN'
                    elif s == 'H' and end_state.startswith('H3P') and any(0.3 <= float(t[b]) - g <= 2.0 for g in v_grips) and sign_at(spans, float(t[b])) in DEALING:
                        kind = 'GIV'
                        extra = {'plats': int(end_state[3:]), 'kort': None, 'kortet_sett': False}
                    elif (s == 'H' and reach < 1.25 and start_state in REST_STATES | RESTING_AT_CARDS and any(-0.5 <= float(t[a]) - g <= 2.0 for g in v_grips)
                          and sign_at(spans, float(t[b])) in DEALING):
                        # out over the seats and back, just after the left hand was at the shoe: a card laid where it was not seen
                        far = path[ok][int(np.argmin(path[ok][:, 1]))]
                        kind = 'GIV'
                        extra = {'plats': min(table.seats, key=lambda n: float(np.linalg.norm(far - table.seats[n]))), 'kort': None, 'kortet_sett': False}
                    elif (s == 'V' and grip_start is not None and visited[1:] and sign_at(spans, float(t[b])) in DEALING and q.get('point')
                          and np.linalg.norm(np.array(q['point']) - table.own) < 0.16):
                        kind = 'GIV-EGET'
                        extra = {'plats': 'D', 'kort': None, 'kortet_sett': False}
                    elif s == 'V' and grip_start is not None and end_state.startswith('V3P') and sign_at(spans, float(t[b])) in DEALING:
                        kind = 'GIV'   # from the shoe straight to a seat beside it, the left hand alone, the card not seen
                        extra = {'plats': int(end_state[3:]), 'kort': None, 'kortet_sett': False}
                    elif (sum(1 for k in range(a, b + 1) if regions[k][0] == 'kroppen' and h['found'][k]) >= BODY_FRAMES
                          or 'H0' in (start_state, end_state) or 'V0' in (start_state, end_state)):
                        kind = 'ANNAT'   # up to his face or chest
                        extra = {'vid_kroppen': True}
                    elif s == 'V' and end_state == 'V2.3' and start_state != 'V2.3':
                        kind = 'TILL-SKON'
                    elif (lateral >= 0.40 and len(set(seat_frames)) >= 2 and start_state[1:3] != '3P' and end_state[1:3] != '3P' and float(t[b] - t[a]) <= 2.0
                          and sign_at(spans, float(t[a])) not in ('take a seat', None)):
                        kind = 'SVEP'
                    elif top_seat is not None and start_state != f'{s}3P{top_seat}':
                        kind = 'PEKA'
                        extra = {'plats': top_seat}
                    elif net < 0.10 and start_state[1:3] in ('3P', '3D') and end_state == start_state:
                        kind = 'RATTA'
                        extra = {'plats': int(start_state[3:]) if start_state[1:3] == '3P' else 'D'}
                    elif (start_state in WAIT_STATES and end_state == start_state and ok.any()
                          and float(np.nanmax(np.linalg.norm(path[ok] - path[ok][0], axis=1))) < (WITHIN_REST * 1.5 if start_state == 'V2.3' else WITHIN_REST)):
                        kind = 'INOM-VILA'   # a small move where the hand waits: becomes part of the wait around it (tidy)
                    elif start_state not in REST_STATES and end_state != start_state and (end_state in REST_STATES or end_state in RESTING_AT_CARDS):
                        kind = 'HEM'   # from somewhere else to where the hand rests; out and back to the same place is not a way home
                    elif start_state in REST_STATES and (end_state in REST_STATES or end_state in RESTING_AT_CARDS) and end_state != start_state:
                        kind = 'BYT-VILA'
                    else:
                        kind = 'ANNAT'
                    if s == 'H' and kind in ('GIV', 'GIV-EGET'):
                        h_gives.append((float(t[a]), float(t[b])))
                    piece.update({'kat': kind, 'fran_lage': p.get('state'), 'till_lage': q.get('state'), 'vag': visited[:8]}, **extra)
                    if kind == 'PEKA':
                        piece['vid_beslut'] = any(-1.5 <= dsec - float(t[a]) <= float(t[b]) - float(t[a]) + 1.0 for dsec in decisions)
                    if kind == 'GIV' and lateral >= 0.5 and len({v for v in visited if v.startswith('plats')}) >= 3 and start_state in ('H1S', 'H1'):
                        piece['med_svep'] = True   # the hand sweeps over the table on its way to the first card
                    if p.get('edge') or q.get('edge'):
                        piece['kant'] = True
                    pieces[s].append(piece)
            # The head and the eyes: a third track.
            hd = tr['head']
            nod, turn = hd[:, 0] - rest_head[0], hd[:, 1] - rest_head[1]
            low = np.array([any(l['from_t'] <= x <= l['to_t'] for l in lowered) for x in t])
            lab = np.where(np.isnan(hd[:, 0]), 'OKANT', np.where(turn > HEAD_TURN, 'MOT-SKON', np.where(turn < -HEAD_TURN, 'MOT-LADAN', np.where(low | (nod > HEAD_NOD), 'BORDET', 'KAMERAN'))))
            short = int(0.25 * fps)
            changed = True
            while changed:   # runs shorter than a quarter second go to the run before
                changed = False
                bounds = [0] + [k for k in range(1, len(lab)) if lab[k] != lab[k - 1]] + [len(lab)]
                for i in range(1, len(bounds) - 1):
                    if bounds[i + 1] - bounds[i] < short:
                        lab[bounds[i]:bounds[i + 1]] = lab[bounds[i] - 1]
                        changed = True
                        break
            bounds = [0] + [k for k in range(1, len(lab)) if lab[k] != lab[k - 1]] + [len(lab)]
            for i in range(len(bounds) - 1):
                a, b = bounds[i], bounds[i + 1] - 1
                pieces['huvud'].append({'hand': 'huvud', 'kat': str(lab[a]), 'fran_s': round(float(t[a]), 3), 'till_s': round(float(t[b]), 3), 'fran_ruta': int(tr['f'][a]), 'till_ruta': int(tr['f'][b]),
                                        'sek': round(float(t[b] - t[a]), 3), 'syns': round(float((~np.isnan(hd[a:b + 1, 0])).mean()), 2), '_a': a, '_b': b, '_tr': id(tr)})

        for s in 'HV':
            pieces[s] = tidy(pieces[s])
        # A hand that goes to the seats or his own cards while the other hand gathers the cards helps gather them.
        for s, o in (('H', 'V'), ('V', 'H')):
            gathering = [q for q in pieces[o] if q['kat'] == 'KORT-IN']
            for p in pieces[s]:
                if p['kat'] in ('PEKA', 'ANNAT', 'HEM', 'RATTA', 'SVEP') and any(v.startswith('plats') or v in ('egna', 'ladan') for v in (p.get('vag') or [])) and any(
                        q['_tr'] == p['_tr'] and min(q['till_s'], p['till_s']) - max(q['fran_s'], p['fran_s']) > 0.5 * p['sek'] for q in gathering):
                    p['kat'] = 'KORT-IN'
                    p.pop('plats', None)
        for s in 'HV':
            pieces[s] = tidy(pieces[s])
        result['dealrar'][dealer] = {'stil': style, 'docka': DOLLS[style], 'pieces': pieces, 'tracks': tracks}
        print(f"{style}: höger {len(pieces['H'])}, vänster {len(pieces['V'])}, huvud {len(pieces['huvud'])} stycken")
    summarize(result, d, lifted, data_dir)


def tidy(ps):
    """Make each piece what its name says. KORT-IN: what lies between two pieces of the collection, six seconds apart or less, is
    the collection too. A small move in a rest is part of the wait (VANTA) around it, not a way home. The right hand's
    setting off from its rest and a short stop before it takes the card belong to the deal (GIV). PEKA out, a short stop
    at the seat and the way back are one gesture, and a longer one is not a pointing. Then the pieces of one gesture
    become one piece."""
    ps = sorted(ps, key=lambda p: p['fran_s'])
    idx_in = [i for i, p in enumerate(ps) if p['kat'] == 'KORT-IN']
    for i, j in zip(idx_in, idx_in[1:]):
        if ps[j]['fran_s'] - ps[i]['till_s'] < 6.0 and ps[i]['_tr'] == ps[j]['_tr']:
            for k in range(i + 1, j):
                if ps[k]['kat'] not in ('GIV', 'GIV-EGET', 'DRA'):
                    ps[k]['kat'] = 'KORT-IN'
    near = lambda p, q: p['_tr'] == q['_tr'] and q['fran_s'] - p['till_s'] < 0.05
    # The setting off: a move out of the rest (and a short stop) right before the deal is the deal's beginning.
    out = []
    for p in ps:
        if p['kat'] in ('GIV', 'GIV-EGET') and out:
            lead = []
            if out[-1]['kat'] in HOLDS and out[-1]['sek'] < 1.5 and len(out) > 1 and near(out[-1], p) and out[-2]['kat'] in ('INOM-VILA', 'BYT-VILA', 'ANNAT') and not out[-2].get('vid_kroppen') and near(out[-2], out[-1]):
                lead = out[-2:]
            elif out[-1]['kat'] in ('INOM-VILA', 'BYT-VILA') and near(out[-1], p):
                lead = out[-1:]
            if lead:
                first = lead[0]
                w = sum(x['sek'] for x in lead) + p['sek']
                p['syns'] = round((sum(x['syns'] * x['sek'] for x in lead) + p['syns'] * p['sek']) / max(w, 1e-6), 2)
                p.update({'fran_s': first['fran_s'], 'fran_ruta': first['fran_ruta'], 'sek': round(p['till_s'] - first['fran_s'], 3), 'fran_lage': first.get('fran_lage'), '_a': first['_a'],
                          'vag': ((first.get('vag') or []) + (p.get('vag') or []))[:8]})
                if any(x.get('kant') for x in lead):
                    p['kant'] = True
                del out[-len(lead):]
        out.append(p)
    ps = out
    # A small move in a rest, and the stops on either side of it in the same place, are one wait.
    for p in ps:
        if p['kat'] == 'INOM-VILA':
            p.update({'kat': 'VANTA', 'sma_rorelser': 1, '_inom': True, 'till_lage': p.get('fran_lage')})
            p.pop('vag', None)
    out = []
    for p in ps:
        q = out[-1] if out else None
        if (q is not None and q['kat'] in HOLDS and p['kat'] in HOLDS and (q.get('_inom') or p.get('_inom')) and near(q, p) and q.get('fran_lage') == p.get('fran_lage')
                and 'plats' not in q and 'plats' not in p):
            sek = round(p['till_s'] - q['fran_s'], 3)
            keep = q if q['sek'] >= p['sek'] else p
            q.update({'till_s': p['till_s'], 'till_ruta': p['till_ruta'], 'sek': sek, '_b': p['_b'], 'kat': 'VANTA' if sek >= REST else 'STOPP', '_inom': True,
                      'sma_rorelser': (q.get('sma_rorelser') or 0) + (p.get('sma_rorelser') or 0) + (0 if p.get('_inom') or q.get('_inom') else 1),
                      'syns': round((q['syns'] * q['sek'] + p['syns'] * p['sek']) / max(q['sek'] + p['sek'], 1e-6), 2), 'punkt': keep.get('punkt')})
            if p.get('kant'):
                q['kant'] = True
            continue
        out.append(p)
    ps = out
    # PEKA out, a short stop at the seat and the way back are one gesture: out and back.
    for i in range(len(ps) - 2):
        p, hold, back = ps[i], ps[i + 1], ps[i + 2]
        if (p['kat'] == 'PEKA' and hold['kat'] in HOLDS and hold['sek'] < 1.0 and back['kat'] in ('HEM', 'RATTA', 'PEKA') and p['_tr'] == hold['_tr'] == back['_tr']
                and hold.get('fran_lage') == p.get('till_lage')):
            hold['kat'] = back['kat'] = 'PEKA'
            hold['plats'] = back['plats'] = p.get('plats')
    out = []
    for p in ps:
        if out and p['kat'] == out[-1]['kat'] == 'PEKA' and p['_tr'] == out[-1]['_tr'] and p['fran_s'] - out[-1]['till_s'] < 0.1 and out[-1].get('plats') == p.get('plats') and out[-1]['sek'] < 2.5:
            q = out[-1]
            q.update({'till_s': p['till_s'], 'till_ruta': p['till_ruta'], 'sek': round(p['till_s'] - q['fran_s'], 3), 'till_lage': p.get('till_lage'), '_b': p['_b'],
                      'syns': round(min(q['syns'], p['syns']), 2)})
            q.pop('sma_rorelser', None)
            q.pop('punkt', None)
            continue
        if out and p['kat'] == out[-1]['kat'] and p['kat'] in ('KORT-IN', 'SKON', 'ANNAT') and p['_tr'] == out[-1]['_tr'] and p['fran_s'] - out[-1]['till_s'] < 0.1:
            q = out[-1]
            w = q['sek'] + p['sek']
            q.update({'till_s': p['till_s'], 'till_ruta': p['till_ruta'], 'sek': round(p['till_s'] - q['fran_s'], 3), 'till_lage': p.get('till_lage'), '_b': p['_b'],
                      'syns': round((q['syns'] * q['sek'] + p['syns'] * p['sek']) / max(w, 1e-6), 2), 'vag': (q.get('vag') or []) + [v for v in (p.get('vag') or []) if not q.get('vag') or v != q['vag'][-1]]})
            q['vag'] = q['vag'][:10]
            q.pop('sma_rorelser', None)
            q.pop('punkt', None)
            if p.get('kant'):
                q['kant'] = True
            continue
        out.append(p)
    for p in out:   # a pointing that lasts is something else
        if p['kat'] == 'PEKA' and p['sek'] > 2.5:
            p['kat'] = 'ANNAT'
            p.pop('plats', None)
            p.pop('vid_beslut', None)
    return out


def summarize(result, d, lifted, data_dir):
    """Counts, states, transitions, the hands out of step, the best pieces to lift with their bridges, and the file."""
    table = Table(d['scene'])
    out = {'om': '', 'begrepp': {}, 'kategorier': {}, 'huvudets_kategorier': HEAD_CATEGORIES, 'lagen': {}, 'dealrar': {}}
    for dealer, r in result['dealrar'].items():
        style = r['stil']
        pieces = r['pieces']
        for s in ('H', 'V', 'huvud'):
            pieces[s].sort(key=lambda p: p['fran_s'])
            for i, p in enumerate(pieces[s]):
                p['id'] = f"{dealer}-{s}-{i + 1}"
        # Where each hand gathers when it is still: the stops grouped by state, the time-weighted middle and spread.
        states = {}
        for s in 'HV':
            for p in pieces[s]:
                if p['kat'] in HOLDS and p.get('punkt') and p.get('fran_lage'):
                    states.setdefault(p['fran_lage'], []).append(p)
        state_table = {}
        for name, ps in sorted(states.items(), key=lambda kv: -sum(p['sek'] for p in kv[1])):
            w = np.array([max(p['sek'], 0.05) for p in ps])
            pts = np.array([p['punkt'] for p in ps])
            centre = np.array([weighted_median(pts[:, 0], w), weighted_median(pts[:, 1], w)])
            spread = float((np.linalg.norm(pts - centre, axis=1) * w).sum() / w.sum())
            state_table[name] = {'mitt_m': [round(float(centre[0]), 3), round(float(centre[1]), 3)], 'spridning_m': round(spread, 3), 'stopp': len(ps), 'sekunder': round(float(w.sum()), 1),
                                 'langsta_s': round(max(p['sek'] for p in ps), 2), 'vila_minst_0_6_s': sum(1 for p in ps if p['kat'] != 'STOPP')}
        # Transitions: from state to state per hand, over the moves (a stop between two moves is the state they meet in).
        trans = {}
        for s in 'HV':
            c = collections.Counter()
            for p in pieces[s]:
                if p['kat'] in MOVES and p['kat'] not in ('ANNAT', 'SKON') and p.get('fran_lage') and p.get('till_lage') and not p.get('kant'):
                    c[(gen(p['fran_lage']), gen(p['till_lage']))] += 1
            trans[s] = {f'{a} -> {b}': n for (a, b), n in c.most_common()}
        # The categories: how often, how long.
        cats = {}
        for s in ('H', 'V', 'huvud'):
            for kind in sorted({p['kat'] for p in pieces[s]}):
                ps = [p for p in pieces[s] if p['kat'] == kind and not p.get('kant')]
                if not ps:
                    continue
                key = f"{kind} {'höger' if s == 'H' else 'vänster' if s == 'V' else 'huvud'}"
                cats[key] = {'antal': len(ps), 'sekunder': stats([p['sek'] for p in ps]), 'summa_s': round(sum(p['sek'] for p in ps), 1), 'syns_median': round(float(np.median([p['syns'] for p in ps])), 2)}
                if kind in ('GIV', 'GIV-EGET', 'PEKA', 'RATTA'):
                    cats[key]['per_plats'] = dict(sorted(collections.Counter(str(p.get('plats')) for p in ps).items()))
                if kind in ('GIV', 'GIV-EGET'):
                    cats[key]['per_kort'] = dict(sorted(collections.Counter(f"C{p.get('kort')}" for p in ps).items()))
                if kind == 'PEKA':
                    cats[key]['vid_beslut'] = sum(1 for p in ps if p.get('vid_beslut'))
        # Both hands still at once: which pair of states (the whole picture, an anchor) and for how long.
        pairs = collections.Counter()
        pair_s = collections.Counter()
        pair_long = collections.Counter()
        windows = []
        for p in pieces['H']:
            if p['kat'] not in HOLDS or not p.get('fran_lage'):
                continue
            for q in pieces['V']:
                if q['_tr'] != p['_tr'] or q['kat'] not in HOLDS or not q.get('fran_lage') or q['till_s'] <= p['fran_s'] or q['fran_s'] >= p['till_s']:
                    continue
                both = min(p['till_s'], q['till_s']) - max(p['fran_s'], q['fran_s'])
                if both >= HOLD:
                    key = f"{gen(p['fran_lage'])} + {gen(q['fran_lage'])}"
                    pairs[key] += 1
                    pair_s[key] += both
                    pair_long[key] = max(pair_long[key], both)
                    if both >= 2.0 and min(p['syns'], q['syns']) >= 0.8 and not p.get('kant') and not q.get('kant'):
                        a0, b0 = max(p['fran_s'], q['fran_s']), min(p['till_s'], q['till_s'])
                        windows.append({'par': key, 'fran_s': round(a0, 3), 'till_s': round(b0, 3), 'fran_ruta': film_frame(a0), 'till_ruta': film_frame(b0), 'sek': round(b0 - a0, 2),
                                        'hoger': p['id'], 'vanster': q['id'], 'sma_rorelser': (p.get('sma_rorelser') or 0) + (q.get('sma_rorelser') or 0)})
        pair_table = {k: {'ganger': n, 'sekunder': round(pair_s[k], 1), 'langsta_s': round(pair_long[k], 2)} for k, n in sorted(pairs.items(), key=lambda kv: -pair_s[kv[0]])}
        best_waits = []
        for key in list(pair_table)[:4]:   # the longest clear wait in each of the four most common pairs
            ws = sorted((w for w in windows if w['par'] == key), key=lambda w: -w['sek'])
            if ws:
                best_waits.append(ws[0])
        # The hands out of step.
        step = out_of_step(pieces)
        decided = at_decisions(pieces, result['decisions'])
        best = pick(pieces, state_table, lifted, dealer, style)
        replace = replacements(pieces, state_table)
        trunk = d['setup']['dealer'][style]['trunk']
        drawn = drawn_numbers(pieces, r['tracks'], table, trunk.get('behind_edge_estimated') or trunk.get('behind_edge_assumed') or 0.2, lift_heights(data_dir, style))
        for s in ('H', 'V', 'huvud'):
            for p in pieces[s]:
                for k in ('_a', '_b', '_tr', '_inom'):
                    p.pop(k, None)
                p['saker'] = 'kant' if p.get('kant') else 'hog' if p['syns'] >= 0.8 else 'mellan' if p['syns'] >= 0.5 else 'lag'
        out['dealrar'][dealer] = {'stil': style, 'docka': DOLLS[style], 'sekunder': d['pattern']['dealers'][dealer]['seconds'], 'kategorier': cats, 'lagen': state_table, 'bada_stilla': pair_table, 'bada_stilla_basta': best_waits, 'overgangar': trans,
                                  'otakt': step, 'vid_beslut': decided, 'for_ritade_rorelser': drawn, 'basta': best, 'ersattningar': replace, 'stycken': {'hoger': pieces['H'], 'vanster': pieces['V'], 'huvud': pieces['huvud']}}
    out['kategorier'] = {k: {'hander': v[0], 'vad': v[1]} for k, v in CATEGORIES.items()}
    out['lagen'] = STATE_WORDS
    out['att_lyfta'] = priority(out, lifted)
    out['om'] = ('Hela livefilmen indelad per dealer och per hand, skriven av verktyg/segment.py ur mätningen (matt/, givar.json, faser.json, scen.json, monster.json); inga bilder. '
                 'hoger och vanster är dealerns egna händer (dealerns höger är till vänster i bilden), huvud är huvudet och blicken. Platserna 1–7 räknas från bildens vänster, D är dealerns egen plats, '
                 'kort är kortets nummer på platsen i rundan (C1, C2 ...). ruta är filmens egen ruta, 60 i sekunden; s är filmens sekunder. lage är handens läge: ett ankare (A1, A2.3, A3PnCm) är ett läge per hand '
                 '(lagen nedan). syns är andelen rutor där handen hittades; saker är hog (minst 0,8), mellan, lag, eller kant där stycket börjar eller slutar vid ett partis kant (början eller slutet okänt). '
                 'Bara de rena partierna är mätta (data/kalla.json), och dealerbytet 474–500 s är inte med. Kategorierna och lägena står i ../standarddocka/rorelsekatalog.json.')
    out['begrepp'] = {
        'stycke': 'en bit av en hands spår: från ett läge till ett läge (en rörelse), eller handen stilla i ett läge (VILA, VANTA, STOPP)',
        'lage': 'var en hand är när ett stycke börjar eller slutar; ett ankare är ett läge för varje hand',
        'otakt': 'vänstern börjar nästa kort innan högern är hemma efter det förra: händerna har var sin tidslinje',
        'brygga': 'en kort rörelse som dockan gör själv, från ett ankarläge till där ett lyft stycke börjar, eller därifrån tillbaka',
        'ersattning': 'där dealern gör något som inte ska härmas (ANNAT, SKON) väntar dockan i sitt läge tills dealern börjar nästa liknande stycke',
    }
    path = os.path.join(data_dir, 'segment.json')
    write(out, path)
    print(path, os.path.getsize(path) // 1024, 'kB')


def weighted_median(values, weights):
    order = np.argsort(values)
    cum = np.cumsum(np.asarray(weights)[order])
    return float(np.asarray(values)[order][int(np.searchsorted(cum, cum[-1] / 2))])


def at_decisions(pieces, decisions):
    """When the game asks a player to choose ("make your decision"): where the head is and what the right hand does in
    the second and a half after. Pointing at the player is what Jakob wants the figure to do then."""
    gaze, right = collections.Counter(), collections.Counter()
    n = 0
    for d0 in decisions:
        tr = next((p['_tr'] for p in pieces['huvud'] if p['fran_s'] <= d0 <= p['till_s']), None)
        if tr is None:
            continue
        n += 1
        for k, v in shares(pieces['huvud'], tr, d0, d0 + 1.5).items():
            gaze[k] += v
        for p in pieces['H']:
            if p['_tr'] == tr and p['fran_s'] < d0 + 1.5 and p['till_s'] > d0 - 0.5:
                right[p['kat']] += 1
    total = sum(gaze.values())
    return {'ganger': n, 'blick_andel': {k: round(v / total, 2) for k, v in gaze.most_common()} if total else {}, 'hogern_gor': dict(right.most_common())}


def lift_heights(data_dir, style):
    """From the lifted deals (data/lyft/, metres, the felt at height 0): how high the hands are at the handover, and how
    high the right wrist and the card go at most on the way to the seat. The only heights there are: one camera gives
    none, and the lifts get theirs from the arms' lengths and SAM 3D Body's depth."""
    out = []
    for name in sorted(glob.glob(os.path.join(data_dir, 'lyft', f'{style}-*-plats-*.json'))):
        lift = json.load(open(name, encoding='utf-8'))
        fr, a, b = lift['frames'], lift['leavesShoe'], lift['rests']
        tip = lambda h: np.mean([h['p'][4], h['p'][8]], axis=0) if h.get('p') else np.array(h['w'])
        k = a + int(np.argmin([np.linalg.norm(tip(f['L']) - tip(f['R'])) for f in fr[a:b + 1]]))
        out.append({'fil': os.path.basename(name), 'handleder_vid_bytet_m': {'vanster': round(fr[k]['L']['w'][1], 3), 'hoger': round(fr[k]['R']['w'][1], 3)},
                    'greppen_vid_bytet_m': round(float(np.mean([tip(fr[k]['L'])[1], tip(fr[k]['R'])[1]])), 3),
                    'hogern_hogst_till_platsen_m': round(max(f['R']['w'][1] for f in fr[k:b + 1]), 3)})
    return out


def shares(head, tr, a, b):
    """The head's categories over a stretch of seconds: their shares of the time."""
    c = collections.Counter()
    for p in head:
        if p['_tr'] == tr:
            both = min(p['till_s'], b) - max(p['fran_s'], a)
            if both > 0:
                c[p['kat']] += both
    total = sum(c.values())
    return {k: v / total for k, v in c.items()} if total > 0 else {}


def drawn_numbers(pieces, tracks, table, behind, heights):
    """What a drawn deal (blackjack-dealer/dealer3d/src/koreo-giv.ts) needs from the film, per dealer: how long each part
    takes, where the hands meet and how high, when the other hand begins its next, where the eyes are in each part, and
    how the deal differs between the seats. Medians and the spread (10-90 %) over every deal where the measure holds."""
    by_tr = {id(tr): tr for tr in tracks}
    H, V, head = pieces['H'], pieces['V'], pieces['huvud']
    mean_h = float(np.median([x['greppen_vid_bytet_m'] for x in heights])) if heights else 0.07
    deals = []
    for i, p in enumerate(H):
        if p['kat'] not in ('GIV', 'GIV-EGET') or p.get('kant'):
            continue
        tr = by_tr[p['_tr']]
        t = tr['t']
        cands = [q for q in V if q['_tr'] == p['_tr'] and q['kat'] == 'DRA' and p['fran_s'] - 2.0 <= q['fran_s'] <= p['till_s'] - 0.15 and q['till_s'] >= p['fran_s']]
        if not cands:
            continue
        q = cands[-1]
        a, b = q['_a'], p['_b']
        gl, gr = tr['hands']['V']['grip'][a:b + 1], tr['hands']['H']['grip'][a:b + 1]
        dist = np.linalg.norm(gl - gr, axis=1)
        if np.isnan(dist).all() or np.nanmin(dist) > 0.2:
            continue
        km = int(np.nanargmin(dist))
        lo = hi = km
        while lo > 0 and dist[lo - 1] < 0.13:
            lo -= 1
        while hi + 1 < len(dist) and dist[hi + 1] < 0.13:
            hi += 1
        k = a + km
        t_meet = float(t[k])
        qi = V.index(q)
        grip = V[qi - 1] if qi > 0 and V[qi - 1]['_tr'] == q['_tr'] and V[qi - 1]['kat'] in HOLDS and V[qi - 1].get('fran_lage') == 'V2.3' else None
        reach = V[qi - 2] if grip is not None and qi > 1 and V[qi - 2]['kat'] == 'TILL-SKON' else (V[qi - 1] if qi > 0 and V[qi - 1]['kat'] == 'TILL-SKON' else None)
        after = [x for x in H[i + 1:i + 4] if x['_tr'] == p['_tr']]
        stay = after[0] if after and after[0]['kat'] in HOLDS else None
        rest = after[1:] if stay is not None else after
        home = rest[0] if rest and rest[0]['kat'] == 'HEM' else None
        chain = rest[0] if rest and rest[0]['kat'] in ('GIV', 'GIV-EGET') else None
        nxt = next((x for x in V[qi + 1:] if x['_tr'] == p['_tr'] and x['kat'] in ('DRA', 'GIV', 'GIV-EGET')), None)
        mid_px = (tr['hands']['V']['px'][k] + tr['hands']['H']['px'][k]) / 2
        at = table.cam.plane(mid_px[None, :], mean_h)[0]
        body = table.cam.wall(tr['mid'][k][None, :], table.edge + behind)[0]
        end_home = home['till_s'] if home else (chain['fran_s'] if chain else p['till_s'])
        deals.append({
            'plats': p.get('plats'), 'kort': p.get('kort'),
            'till_skon_s': reach['sek'] if reach else None,
            'greppet_s': grip['sek'] if grip else 0.0,
            'kortet_ut_efter_greppet_s': round(q['kortet_ut_s'] - q['fran_s'], 3) if q.get('kortet_ut_s') else None,
            'skon_till_bytet_s': round(t_meet - q['fran_s'], 3),
            'bytet_s': round(float(t[a + hi] - t[a + lo]), 3),
            'bytet_till_platsen_s': round(p['till_s'] - t_meet, 3),
            'hogern_ger_sig_av_fore_vanstern_s': round(q['fran_s'] - p['fran_s'], 3),
            'handen_kvar_vid_kortet_s': stay['sek'] if stay else 0.0,
            'hem_s': home['sek'] if home else None,
            'vanstern_tillbaka_efter_bytet_s': round(q['till_s'] - t_meet, 3),
            'vansterns_nasta_grepp_efter_kortet_ligger_s': round(nxt['fran_s'] - p['till_s'], 3) if nxt and nxt['fran_s'] - p['till_s'] < 3 else None,
            'hela_s': round(p['till_s'] - q['fran_s'], 3),
            'bytet_sidled_m': round(float(at[0] - body[0]), 3),
            'bytet_fran_kanten_m': round(float(table.edge - at[1]), 3),
            'bytet_fran_axlarna_m': round(float(table.edge + behind - at[1]), 3),
            'greppen_narmast_m': round(float(np.nanmin(dist)), 3),
            'blick': {'skon_till_bytet': shares(head, p['_tr'], q['fran_s'], t_meet), 'bytet_till_platsen': shares(head, p['_tr'], t_meet, p['till_s']), 'hem': shares(head, p['_tr'], p['till_s'], end_home)},
        })
    parts = ['till_skon_s', 'greppet_s', 'kortet_ut_efter_greppet_s', 'skon_till_bytet_s', 'bytet_s', 'bytet_till_platsen_s', 'handen_kvar_vid_kortet_s', 'hem_s', 'vanstern_tillbaka_efter_bytet_s',
             'hogern_ger_sig_av_fore_vanstern_s', 'vansterns_nasta_grepp_efter_kortet_ligger_s', 'hela_s', 'bytet_sidled_m', 'bytet_fran_kanten_m', 'bytet_fran_axlarna_m', 'greppen_narmast_m']
    gaze = {}
    for part in ('skon_till_bytet', 'bytet_till_platsen', 'hem'):
        c = collections.Counter()
        for x in deals:
            for k2, v in x['blick'][part].items():
                c[k2] += v
        total = sum(c.values())
        gaze[part] = {k2: round(v / total, 2) for k2, v in c.most_common()} if total else {}
    per_seat = {}
    for seat in sorted({str(x['plats']) for x in deals}):
        grp = [x for x in deals if str(x['plats']) == seat]
        per_seat[seat] = {'antal': len(grp), **{part: (stats([x[part] for x in grp]) or {}).get('median') for part in ('hela_s', 'skon_till_bytet_s', 'bytet_till_platsen_s', 'hem_s', 'bytet_sidled_m', 'bytet_fran_kanten_m', 'vansterns_nasta_grepp_efter_kortet_ligger_s')}}
        c = collections.Counter()
        for x in grp:
            for k2, v in x['blick']['bytet_till_platsen'].items():
                c[k2] += v
        per_seat[seat]['blicken_till_platsen'] = max(c, key=c.get) if c else None
    # The left hand alone: its own card and the seats nearest the shoe.
    alone = []
    for i, p in enumerate(V):
        if p['kat'] not in ('GIV', 'GIV-EGET') or p.get('kant') or p.get('fran_lage') != 'V2.3':
            continue
        before = V[i - 1] if i > 0 and V[i - 1]['_tr'] == p['_tr'] and V[i - 1]['kat'] in HOLDS else None
        nxt = V[i + 2] if i + 2 < len(V) and V[i + 1]['kat'] in HOLDS else V[i + 1] if i + 1 < len(V) else None
        alone.append({'plats': p.get('plats'), 'greppet_s': before['sek'] if before else 0.0, 'skon_till_kortet_ligger_s': p['sek'],
                      'kortet_ut_efter_greppet_s': round(p['kortet_ut_s'] - p['fran_s'], 3) if p.get('kortet_ut_s') else None,
                      'tillbaka_s': nxt['sek'] if nxt is not None and nxt['_tr'] == p['_tr'] and nxt['kat'] in ('HEM', 'TILL-SKON') else None,
                      'blick': shares(head, p['_tr'], p['fran_s'], p['till_s'])})
    gaze_alone = collections.Counter()
    for x in alone:
        for k2, v in x['blick'].items():
            gaze_alone[k2] += v
    tot = sum(gaze_alone.values())
    return {
        'giv_med_handbyte': {'antal': len(deals), **{part: stats([x[part] for x in deals], 3 if part.endswith('_m') else 2) for part in parts},
                             'blick_andel': gaze, 'per_plats': per_seat,
                             'hojd': {'om': 'ur de lyfta givarna i data/lyft/ (metrar över filten, SAM:s djup), inte ur hela filmen: en kamera ger ingen höjd', 'givar': heights,
                                      'greppen_vid_bytet_m': stats([x['greppen_vid_bytet_m'] for x in heights], 3), 'handlederna_vid_bytet_m': stats([v for x in heights for v in x['handleder_vid_bytet_m'].values()], 3),
                                      'hogern_hogst_till_platsen_m': stats([x['hogern_hogst_till_platsen_m'] for x in heights], 3)},
                             'bytets_lage_om': f'greppens mitt där händerna är närmast, lagd på ett plan {mean_h:.3f} m över filten (greppens höjd vid bytet i lyften); sidled från dealerns mitt (axlarnas mitt), plus åt dealerns vänster (mot skon); djup fram från bordskanten mot spelarna, och från axlarna som sitter {behind:.3f} m bakom kanten (skattat)'},
        'giv_vanstern_ensam': {'antal': len(alone), 'per_plats': dict(sorted(collections.Counter(str(x['plats']) for x in alone).items())),
                               **{part: stats([x[part] for x in alone]) for part in ('greppet_s', 'kortet_ut_efter_greppet_s', 'skon_till_kortet_ligger_s', 'tillbaka_s')},
                               'blick_andel': {k2: round(v / tot, 2) for k2, v in gaze_alone.most_common()} if tot else {}},
    }


def gen(state):
    """A state with its seat left out, for the tables: H3P4 -> H3Pn."""
    if state and len(state) >= 4 and state[1:3] == '3P':
        return state[:3] + 'n'
    return state


def out_of_step(pieces):
    """After the right hand has laid a card at a seat: does it go home first, or does the left hand fetch the next card
    before the right is home (out of step), or does the right go straight on to take the next card (a chain)?"""
    H = [p for p in pieces['H'] if not p.get('kant')]
    V = [p for p in pieces['V'] if not p.get('kant')]
    res = collections.Counter()
    leads, at_lay = [], collections.Counter()
    examples = []
    last = 0
    for i, p in enumerate(H):
        if p['kat'] != 'GIV':
            continue
        nxt = [q for q in H[i + 1:] if q['_tr'] == p['_tr']][:4]
        home = next((q for q in nxt if q['kat'] == 'HEM'), None)
        chain = next((q for q in nxt[:2] if q['kat'] in ('GIV', 'GIV-EGET')), None)
        this_out = p.get('kortet_ut_s') or p['till_s'] - 1.0
        pull = next((q for q in V if q['_tr'] == p['_tr'] and q['kat'] in ('DRA', 'GIV', 'GIV-EGET') and q['fran_s'] > this_out + 0.3 and q['fran_s'] < p['till_s'] + 3.0), None)
        lv = next((q for q in V if q['_tr'] == p['_tr'] and q['fran_s'] <= p['till_s'] <= q['till_s']), None)
        if not (chain is not None and (home is None or chain['fran_s'] < home['fran_s'])) and (home is None or pull is None):
            last += 1   # the round's last card: no new card follows, so it is left out of the counting
            continue
        at_lay[gen(lv['fran_lage']) if lv and lv['kat'] in HOLDS else f"på väg ({lv['kat']})" if lv else 'okänt'] += 1
        if chain is not None and (home is None or chain['fran_s'] < home['fran_s']):
            res['kedja: högern går direkt till nästa kort utan att gå hem'] += 1
        elif pull['fran_s'] < home['till_s']:
            res['otakt: vänstern tar nästa kort innan högern är hemma'] += 1
            leads.append(home['till_s'] - pull['fran_s'])
            if len(examples) < 8:
                examples.append({'givet': p['id'], 'plats': p.get('plats'), 'hogern_hemma_s': home['till_s'], 'vanstern_borjar_s': pull['fran_s'], 'fore_s': round(home['till_s'] - pull['fran_s'], 2)})
        else:
            res['i takt: vänstern väntar tills högern är hemma'] += 1
    # Every way home of the right hand: does the left move meanwhile?
    homes = [p for p in H if p['kat'] == 'HEM']
    moving = sum(1 for p in homes if any(q['_tr'] == p['_tr'] and q['kat'] in MOVES and q['fran_s'] < p['till_s'] and q['till_s'] > p['fran_s'] for q in V))
    return {'bas': 'korten som högern lägger hos en spelare och som följs av ett nytt kort (inom 3 s); rundans sista kort är inte räknade', 'antal': sum(res.values()),
            'sista_kortet_inte_raknade': last, 'efter_ett_kort_till_en_plats': dict(res), 'vanstern_fore_hogern_hemma_s': stats(leads), 'vanstern_nar_hogern_lagger': dict(at_lay.most_common()),
            'hogern_hem_medan_vanstern_ror_sig': {'hem': len(homes), 'vanstern_ror_sig_samtidigt': moving}, 'exempel': examples}


def pick(pieces, states, lifted, dealer, style):
    """The best pieces per category (and seat and card): the hand seen all the way, starting and ending still in a state,
    nothing unexpected just before, after or in the other hand meanwhile. With the clip's start and end where both hands
    are in a state, and the bridges where they are not."""
    other = {'H': 'V', 'V': 'H'}
    best = {}
    for s in 'HV':
        ps = pieces[s]
        for i, p in enumerate(ps):
            if p['kat'] not in MOVES or p['kat'] in ('ANNAT', 'SKON') or p.get('kant'):
                continue
            before = ps[i - 1] if i > 0 and ps[i - 1]['_tr'] == p['_tr'] else None
            after = ps[i + 1] if i + 1 < len(ps) and ps[i + 1]['_tr'] == p['_tr'] else None
            meanwhile = [q for q in pieces[other[s]] if q['_tr'] == p['_tr'] and q['fran_s'] < p['till_s'] and q['till_s'] > p['fran_s']]
            odd_before = before is not None and before['kat'] in ('ANNAT', 'SKON')
            odd_after = after is not None and after['kat'] in ('ANNAT', 'SKON')
            odd_other = any(q['kat'] in ('ANNAT', 'SKON') for q in meanwhile)
            still_start = before is not None and before['kat'] in HOLDS
            still_end = after is not None and after['kat'] in HOLDS
            score = p['syns'] + 0.25 * still_start + 0.25 * still_end - 0.6 * odd_other - 0.3 * odd_before - 0.3 * odd_after
            if p['kat'] == 'KORT-IN':   # the whole gathering, into the box, is what is wanted
                score += 0.5 * ('ladan' in (p.get('vag') or [])) + 0.2 * (p['sek'] >= 1.5)
            key = (s, p['kat'], p.get('plats'), p.get('kort') if p['kat'] in ('GIV', 'GIV-EGET') else None)
            best.setdefault(key, []).append((score, p, before, after, meanwhile, odd_before, odd_after, odd_other))
    out = []
    for key, cands in best.items():
        cands.sort(key=lambda c: -c[0])
        for score, p, before, after, meanwhile, ob, oa, oo in cands[:2]:
            lift = [n for n, a, b in lifted if n.startswith(style + '-') and a - 0.3 <= p['fran_s'] and p['till_s'] <= b + 0.3]
            entry = {'id': p['id'], 'kat': p['kat'], 'hand': 'höger' if p['hand'] == 'H' else 'vänster', 'plats': p.get('plats'), 'kort': p.get('kort'), 'fran_s': p['fran_s'], 'till_s': p['till_s'],
                     'fran_ruta': p['fran_ruta'], 'till_ruta': p['till_ruta'], 'sek': p['sek'], 'fran_lage': p.get('fran_lage'), 'till_lage': p.get('till_lage'), 'syns': p['syns'], 'poang': round(score, 2),
                     'andra_handen': [q['kat'] for q in meanwhile][:6], 'redan_lyft': lift}
            # Bridges: from the state's middle to where the piece starts, and from where it ends to the state's middle.
            for side, edge_piece, word in (('fore', before, 'fran_lage'), ('efter', after, 'till_lage')):
                st = states.get(p.get(word)) if p.get(word) else None
                pt = (edge_piece or {}).get('punkt') if edge_piece is not None and edge_piece['kat'] in HOLDS else None
                if st and pt:
                    gap = float(np.hypot(pt[0] - st['mitt_m'][0], pt[1] - st['mitt_m'][1]))
                    entry[f'brygga_{side}_m'] = round(gap, 3)
                    entry[f'brygga_{side}_s'] = 0.0 if gap < 0.03 else round(max(0.2, gap / 0.5), 2)
                if (side == 'fore' and ob) or (side == 'efter' and oa):
                    entry[f'ovantat_{side}'] = (before if side == 'fore' else after)['kat']
            if oo:
                entry['ovantat_i_andra_handen'] = True
            # The clip for a deal is both hands: from the left hand's grip at the shoe to the card lying, and the stop after.
            if p['kat'] in ('GIV', 'GIV-EGET') and p['hand'] == 'H':
                pull = [q for q in pieces['V'] if q['_tr'] == p['_tr'] and q['kat'] == 'DRA' and p['fran_s'] - 2.0 <= q['fran_s'] <= p['till_s'] - 0.15 and q['till_s'] >= p['fran_s']]
                a0 = min(p['fran_s'], pull[-1]['fran_s']) if pull else p['fran_s']
                b0 = after['till_s'] if after is not None and after['kat'] in HOLDS and after['sek'] < 1.0 else p['till_s']
                entry.update({'klipp_fran_s': round(a0, 3), 'klipp_till_s': round(b0, 3), 'klipp_fran_ruta': film_frame(a0), 'klipp_till_ruta': film_frame(b0), 'vanstern_drar': pull[-1]['id'] if pull else None})
            out.append(entry)
    out.sort(key=lambda e: (e['kat'], str(e['plats']), str(e['kort']), -e['poang']))
    return out


def replacements(pieces, states):
    """Jakob's rule for what is not to be copied (ANNAT, SKON): the figure waits in the state the hand was in before,
    until the dealer begins the next piece that starts in the same state (the most alike start), with a bridge if that
    next start lies elsewhere."""
    out = []
    for s in 'HV':
        ps = pieces[s]
        for i, p in enumerate(ps):
            if p['kat'] not in ('ANNAT', 'SKON') or p.get('kant'):
                continue
            prev = next((q for q in reversed(ps[:i]) if q['_tr'] == p['_tr'] and q['kat'] not in ('ANNAT', 'SKON')), None)
            wait = prev.get('till_lage') if prev else p.get('fran_lage')
            later = [q for q in ps[i + 1:] if q['_tr'] == p['_tr'] and q['kat'] not in ('ANNAT', 'SKON')]
            same = next((q for q in later if q['kat'] in MOVES and q.get('fran_lage') == wait), None)
            nxt = next((q for q in later if q['kat'] in MOVES), None)
            target = same or nxt
            entry = {'id': p['id'], 'kat': p['kat'], 'hand': 'höger' if s == 'H' else 'vänster', 'fran_s': p['fran_s'], 'till_s': p['till_s'], 'vanta_i': wait}
            if target is not None:
                entry.update({'nasta': target['id'], 'nasta_kat': target['kat'], 'nasta_s': target['fran_s'], 'vantan_s': round(target['fran_s'] - p['fran_s'], 2), 'samma_start': target is same})
                if target is not same and wait in states and target.get('fran_lage') in states:
                    a, b = states[wait]['mitt_m'], states[target['fran_lage']]['mitt_m']
                    gap = float(np.hypot(a[0] - b[0], a[1] - b[1]))
                    entry['brygga_m'], entry['brygga_s'] = round(gap, 3), round(max(0.2, gap / 0.5), 2)
            out.append(entry)
    return out


ROUND_NEEDS = [   # what a whole card round needs, in order: (category, hand, card, why)
    ('GIV', 'H', 1, 'första kortet till varje plats'),
    ('GIV-EGET', None, 1, 'dealerns första kort'),
    ('GIV', 'H', 2, 'andra kortet till varje plats'),
    ('GIV-EGET', None, 2, 'dealerns andra kort'),
    ('VANTA', None, None, 'väntan med båda händerna stilla medan spelarna väljer, och medan insatserna läggs'),
    ('PEKA', 'H', None, 'visa spelaren som ska agera'),
    ('SVEP', 'H', None, 'svepet över bordet innan given'),
    ('KORT-IN', 'H', None, 'korten in i lådan efter rundan'),
    ('HEM', 'H', None, 'högern hem efter sista kortet, medan vänstern redan är vid skon'),
    ('TILL-SKON', 'V', None, 'vänstern från vilan till skon'),
    ('GIV', 'H', 3, 'tredje kortet (spelaren tar ett kort till)'),
]
ROW_KEYS = ('id', 'fran_s', 'till_s', 'fran_ruta', 'till_ruta', 'sek', 'fran_lage', 'till_lage', 'syns', 'klipp_fran_s', 'klipp_till_s', 'klipp_fran_ruta', 'klipp_till_ruta', 'vanstern_drar')


def priority(out, lifted):
    """'Att lyfta härnäst': the best piece for each thing a whole round needs, in the order a round needs them. A seat
    that already has a lifted deal (data/lyft/) goes last, marked."""
    seats_lifted = collections.defaultdict(list)
    for name, a, b in lifted:
        if '-plats-' in name:
            seats_lifted[int(name.rsplit('-', 1)[1])].append(name)
    rows = []
    row = lambda kat, why, doll, e, **extra: {'kat': kat, 'varfor': why, 'docka': doll, 'plats': e.get('plats'), 'kort': e.get('kort'), 'hand': e.get('hand'),
                                              **{k: e[k] for k in ROW_KEYS if k in e}, **{k: e[k] for k in e if k.startswith('brygga') or k.startswith('ovantat')}, **extra}
    for kat, hand, card, why in ROUND_NEEDS:
        cands = []
        for dealer, dd in out['dealrar'].items():
            if kat == 'VANTA':
                for w in dd['bada_stilla_basta'][:2]:
                    cands.append((dealer, dd['docka'], {'id': f"{w['hoger']} + {w['vanster']}", **{k: w[k] for k in ('fran_s', 'till_s', 'fran_ruta', 'till_ruta', 'sek')},
                                                        'fran_lage': w['par'], 'till_lage': w['par'], 'syns': 1.0, 'poang': w['sek']}))
                continue
            for e in dd['basta']:
                if e['kat'] == kat and (not hand or e['hand'] == ('höger' if hand == 'H' else 'vänster')) and (not card or e.get('kort') == card):
                    cands.append((dealer, dd['docka'], e))
        if not cands:
            rows.append({'kat': kat, 'varfor': why, 'kort': card, 'finns_i_filmen': False})
            continue
        if kat == 'GIV':   # one per seat: the best of either dealer
            seats = sorted({e.get('plats') for _, _, e in cands if isinstance(e.get('plats'), int)})
            for n in seats:
                dealer, doll, e = max((c for c in cands if c[2].get('plats') == n), key=lambda c: c[2]['poang'])
                rows.append(row(kat, why, doll, e, redan_lyft=seats_lifted.get(n, []) if card == 1 else []))
            missing = [n for n in range(1, 8) if n not in seats]
            if missing:
                rows.append({'kat': kat, 'varfor': why, 'kort': card, 'saknas_for_platserna': missing, 'finns_i_filmen': False})
        elif kat == 'VANTA':
            for dealer, doll, e in cands:
                rows.append(row(kat, why, doll, e))
        else:
            for dealer, doll, e in sorted(cands, key=lambda c: -c[2]['poang'])[:2]:
                rows.append(row(kat, why, doll, e))
    rows = [r for r in rows if not r.get('redan_lyft')] + [r for r in rows if r.get('redan_lyft')]
    for i, r in enumerate(rows, 1):
        r['ordning'] = i
    return rows


def write(out, path):
    """The file with every piece on its own line, so that it can be read and compared line by line."""
    pieces = {dl: out['dealrar'][dl].pop('stycken') for dl in out['dealrar']}
    text = json.dumps(out, ensure_ascii=False, indent=1).rstrip()
    lines = [text[:-1].rstrip() + ',', ' "stycken": {']
    dls = list(pieces)
    for di, dl in enumerate(dls):
        lines.append(f'  "{dl}": {{')
        keys = list(pieces[dl])
        for ki, key in enumerate(keys):
            lines.append(f'   "{key}": [')
            ps = pieces[dl][key]
            for pi, p in enumerate(ps):
                lines.append('    ' + json.dumps(p, ensure_ascii=False, separators=(',', ':')) + (',' if pi + 1 < len(ps) else ''))
            lines.append('   ]' + (',' if ki + 1 < len(keys) else ''))
        lines.append('  }' + (',' if di + 1 < len(dls) else ''))
    lines += [' }', '}']
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    for dl in dls:
        out['dealrar'][dl]['stycken'] = pieces[dl]


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    cmd = sys.argv[1]
    if cmd == 'dela':
        main_dela(sys.argv[2], sys.argv[3])
        if '--visa' in sys.argv:
            a, b = float(sys.argv[sys.argv.index('--visa') + 1]), float(sys.argv[sys.argv.index('--visa') + 2])
            seg = json.load(open(os.path.join(sys.argv[2], 'segment.json'), encoding='utf-8'))
            rows = []
            for dl, dd in seg['stycken'].items():
                for key, ps in dd.items():
                    for p in ps:
                        if a <= p['fran_s'] <= b:
                            rows.append((p['fran_s'], key, p))
            for t0, key, p in sorted(rows, key=lambda r: (r[1], r[0])):
                print(f"{key:8s} {p['fran_s']:8.2f}-{p['till_s']:8.2f} {p['kat']:10s} {str(p.get('fran_lage')):6s}->{str(p.get('till_lage')):6s} plats {p.get('plats')} kort {p.get('kort')} syns {p['syns']} {p.get('vag', '')}")
    elif cmd == 'rita':
        import segment_rita
        segment_rita.rita(sys.argv[2], sys.argv[3])
    elif cmd == 'blad':
        import segment_rita
        segment_rita.blad(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])


if __name__ == '__main__':
    main()
