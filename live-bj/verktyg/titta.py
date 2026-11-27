# Draws what verktyg/mat.py measured over the film's own frames, so that the eye can tell whether the points sit on the
# dealer: the body's lines, both hands, the eyes and the mouth, and the corners that were painted over.
#   python -I live-bj/verktyg/titta.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt <ut.jpg> <sekund> [<sekund> ...] [--bara]
# Writes one sheet with a picture per second asked for. --bara draws the points on black, without the film.
# The sheet shows a real person and stays on this computer (rutor/ is not in Git).
import sys, json, os, glob
import numpy as np, cv2

BONES = [(11, 12), (11, 13), (13, 15), (12, 14), (14, 16), (11, 23), (12, 24), (23, 24), (0, 7), (0, 8)]
FINGERS = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [0, 17, 18, 19, 20], [5, 9, 13, 17]]
BEHIND = [(0.0, 0.0, 0.324, 0.355), (0.747, 0.0, 1.0, 0.34)]


def draw(pic, entry, w, h):
    p = lambda q: (int(round(q[0])), int(round(q[1])))
    for a, b, c, d in BEHIND:
        cv2.rectangle(pic, (int(a * w), int(b * h)), (int(c * w), int(d * h)), (90, 90, 90), 2)
    if entry['pose']:
        pts = entry['pose']['image']
        for a, b in BONES:
            cv2.line(pic, p(pts[a]), p(pts[b]), (0, 255, 255), 3, cv2.LINE_AA)
        for i in (11, 12, 13, 14, 15, 16):
            cv2.circle(pic, p(pts[i]), 7, (0, 200, 255), -1, cv2.LINE_AA)
    for side, colour in (('L', (255, 160, 0)), ('R', (0, 255, 0))):
        hand = entry['hands'].get(side)
        if hand:
            pts = hand['image']
            for chain in FINGERS:
                for a, b in zip(chain, chain[1:]):
                    cv2.line(pic, p(pts[a]), p(pts[b]), colour, 2, cv2.LINE_AA)
            cv2.putText(pic, side, (p(pts[0])[0] + 8, p(pts[0])[1] + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.9, colour, 2, cv2.LINE_AA)
    if entry['face']:
        for name, q in entry['face']['points'].items():
            cv2.circle(pic, p(q), 4 if name.startswith('iris') else 2, (0, 0, 255) if name.startswith('iris') else (255, 255, 255), -1, cv2.LINE_AA)
        nod, turn, tilt = entry['face']['turn']
        b = entry['face']['blend']
        text = f"nod {nod:+.0f} turn {turn:+.0f} tilt {tilt:+.0f}  blink {max(b['eyeBlinkLeft'], b['eyeBlinkRight']):.2f}  down {b['eyeLookDownLeft']:.2f}"
        cv2.putText(pic, text, (12, h - 16), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(pic, f"{entry['t']:.2f} s", (12, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 255), 3, cv2.LINE_AA)


def main():
    args = [a for a in sys.argv[1:] if a != '--bara']
    bare = '--bara' in sys.argv
    film, source_file, measures, out = args[:4]
    seconds = [float(s) for s in args[4:]]
    source = json.load(open(source_file, encoding='utf-8'))
    crop, fps = source['crop'], source['fps']
    files = [json.load(open(f, encoding='utf-8')) for f in sorted(glob.glob(os.path.join(measures, 'rorelse-*.json')))]
    cap = cv2.VideoCapture(film)
    tiles = []
    for s in seconds:
        data = next((d for d in files if d['from'] <= s <= d['to']), None)
        if data is None:
            print(f'{s} s is not in a measured stretch')
            continue
        entry = min(data['frames'], key=lambda e: abs(e['t'] - s))
        cap.set(cv2.CAP_PROP_POS_FRAMES, entry['f'])
        ok, full = cap.read()
        pic = full[crop['y']:crop['y'] + crop['height'], crop['x']:crop['x'] + crop['width']].copy()
        if bare:
            pic[:] = 0
        draw(pic, entry, crop['width'], crop['height'])
        tiles.append(cv2.resize(pic, (960, 540), interpolation=cv2.INTER_AREA))
    cap.release()
    cols = 2 if len(tiles) > 1 else 1
    while len(tiles) % cols:
        tiles.append(np.zeros_like(tiles[0]))
    sheet = np.vstack([np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)])
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    cv2.imwrite(out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(out, sheet.shape[1], 'x', sheet.shape[0])


main()
