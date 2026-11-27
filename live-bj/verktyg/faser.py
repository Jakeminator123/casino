# Reads the game's own sign in the middle of the table picture ("PLEASE PLACE YOUR BETS", "DEALING", "MAKE YOUR
# DECISION" ...) five times a second and writes the film's timeline: which sign stood when, and the rounds they make.
#   python -I live-bj/verktyg/faser.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/data/faser.json
# The film is read once, straight through, by ffmpeg, which hands over only the sign's text row. No letters are read:
# a sign is known by how many words it has, how wide it is and whether its bar is green. Reads the film only.
import sys, json, subprocess
import numpy as np

X0, X1, Y0, Y1 = 645, 1083, 484, 502   # the sign's text row in the picture's pixels (data/kalla.json, crop)
RATE = 5                               # looks a second
WORD_GAP = 6                           # empty columns between two words; between two letters there are 2 or 3
HOLD = 1.0                             # a sign shorter than this between two others is a misreading (the mouse pointer) and is dropped


def sign_of(strip):
    grey = strip.astype(np.int32) @ np.array([0.114, 0.587, 0.299])
    cols = np.where((grey > 210).sum(axis=0) > 0)[0]
    if len(cols) < 20:
        return 'none'
    width = int(cols.max() - cols.min())
    gaps = np.diff(cols)
    words = 1 + int((gaps >= WORD_GAP).sum())
    first = int(cols[np.argmax(gaps >= WORD_GAP)] - cols.min()) / width if words > 1 else 1.0   # the first word's share of the width
    green = float(strip[:, :, 1].mean() - strip[:, :, 2].mean()) > 30
    if words == 1 and 60 < width < 100:
        return 'dealing'
    if words == 2 and 135 < width < 170:
        return 'bets accepted'
    if words == 2 and 105 < width < 135:
        return 'dealer wins' if first > 0.47 else 'bets closed'
    if words == 4 and 105 < width < 140:
        return 'last bets'
    if words == 4 and 175 < width < 205:
        return 'take a seat'
    if words == 3 and 175 < width < 205:
        return 'make your decision'
    if words == 4 and 225 < width < 260:
        return 'place your bets'
    if words == 5 and 225 < width < 275:
        return 'make your decision'
    if words == 6 and 265 < width < 310:
        return 'place your bets'
    return f'unknown {words} words {width} wide' + (' green' if green else '')


def main():
    film, source_file, out = sys.argv[1], sys.argv[2], sys.argv[3]
    source = json.load(open(source_file, encoding='utf-8'))
    crop = source['crop']
    sw, sh = X1 - X0, Y1 - Y0
    pipe = subprocess.Popen(['ffmpeg', '-v', 'error', '-threads', '2', '-i', film, '-vf', f"crop={sw}:{sh}:{crop['x'] + X0}:{crop['y'] + Y0},fps={RATE}",
                             '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE)
    seen, n = [], 0   # per look: second and sign, inside the clean stretches only
    while True:
        raw = pipe.stdout.read(sw * sh * 3)
        if len(raw) < sw * sh * 3:
            break
        t = n / RATE
        n += 1
        run = next((k for k, r in enumerate(source['runs']) if r['from'] <= t <= r['to']), None)
        if run is not None:
            seen.append((t, run, sign_of(np.frombuffer(raw, np.uint8).reshape(sh, sw, 3))))

    spans = []   # a sign that stands, within one clean stretch
    for t, run, sign in seen:
        if spans and spans[-1]['run'] == run and spans[-1]['sign'] == sign:
            spans[-1]['to'] = t
        else:
            spans.append({'run': run, 'sign': sign, 'from': t, 'to': t})
    changed = True
    while changed:   # drop a short misreading between two spans, and join what it parted
        changed = False
        for k, s in enumerate(spans):
            short = s['to'] - s['from'] < HOLD
            before = spans[k - 1] if k and spans[k - 1]['run'] == s['run'] else None
            after = spans[k + 1] if k + 1 < len(spans) and spans[k + 1]['run'] == s['run'] else None
            if short and before and after and (s['sign'].startswith('unknown') or s['sign'] == 'none' or before['sign'] == after['sign']):
                before['to'] = s['to']
                del spans[k]
                changed = True
                break
            if before and before['sign'] == s['sign']:
                before['to'] = s['to']
                del spans[k]
                changed = True
                break

    # A round begins when the bets close (bets accepted or bets closed) and ends when the next bets are asked for.
    rounds, current = [], None
    for s in spans:
        if s['sign'] in ('bets accepted', 'bets closed') and current is None:
            current = {'from': s['from'], 'run': s['run'], 'signs': []}
        if current is not None:
            if s['sign'] in ('place your bets', 'take a seat') or s['run'] != current['run']:
                current['to'] = current['signs'][-1]['to']
                current['whole'] = s['run'] == current['run']   # false when the clean stretch ended before the round did
                rounds.append(current)
                current = None
            else:
                current['signs'].append({'sign': s['sign'], 'from': s['from'], 'to': s['to']})
    for r in rounds:
        del r['run']
    for s in spans:
        s['from'], s['to'] = round(s['from'], 2), round(s['to'] + 1 / RATE, 2)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'about': 'The game\'s sign through the film, written by verktyg/faser.py. spans: which sign stood when (seconds of the film, clean stretches only; run is the index in data/kalla.json). '
                            'rounds: from the bets closing to the next bets being asked for.', 'rate': RATE, 'spans': spans, 'rounds': rounds}, f, indent=1)
    total = {}
    for s in spans:
        total[s['sign']] = total.get(s['sign'], 0) + s['to'] - s['from']
    print(len(spans), 'spans,', len(rounds), 'rounds,', sum(1 for r in rounds if r['whole']), 'whole;', {k: round(v, 1) for k, v in sorted(total.items(), key=lambda kv: -kv[1])})


main()
