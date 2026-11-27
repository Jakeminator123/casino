# Finds the live table picture inside the screen recording and the stretches of the film where it is shown as it is:
# the streamer zooms, dims and shrinks the picture now and then, and those stretches cannot be measured with one scale.
#   python -I live-bj/verktyg/ram.py live-bj/video/kalla.mp4 live-bj/data/kalla.json
# Reads the film only. Writes the picture's rectangle and the clean stretches (in seconds of the film) that every other
# tool here reads. A stretch is clean when the browser's frame is where it should be: left of, right of and under the
# picture the screen is the flat colour of the page.
import sys, json
import numpy as np, cv2

STEP = 0.25      # seconds between the frames that are looked at
MARGIN = 0.5     # seconds taken off both ends of a stretch, since a zoom glides in and out
SHORTEST = 4.0   # a shorter stretch is not kept
BOXES = {'left': (300, 900, 20, 80), 'right': (300, 900, 1840, 1900), 'under': (1050, 1076, 300, 800)}   # y0, y1, x0, x1 in the film


def main():
    film, out = sys.argv[1], sys.argv[2]
    cap = cv2.VideoCapture(film)
    fps = cap.get(cv2.CAP_PROP_FPS)
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width, height = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    every = round(STEP * fps)
    samples = []   # per looked-at frame: the mean colour and the spread of each box
    for i in range(0, count):
        if not cap.grab():
            break
        if i % every:
            continue
        _, frame = cap.retrieve()
        row = []
        for y0, y1, x0, x1 in BOXES.values():
            patch = frame[y0:y1, x0:x1].reshape(-1, 3).astype(np.float32)
            row.append(np.concatenate([patch.mean(axis=0), [patch.std()]]))
        samples.append(np.array(row))
    cap.release()
    samples = np.array(samples)                      # frames x boxes x (b, g, r, spread)
    usual = np.median(samples[:, :, :3], axis=0)     # the page's colour in each box, taken from the film as a whole
    spread = np.median(samples[:, :, 3], axis=0)     # and how even it usually is there
    clean = (np.abs(samples[:, :, :3] - usual).sum(axis=2) < 12).all(axis=1) & (np.abs(samples[:, :, 3] - spread) < 6).all(axis=1)
    print('page colour per box', usual.round(1).tolist(), 'spread', spread.round(1).tolist(), 'clean frames', int(clean.sum()), 'of', len(clean))

    # The picture's rectangle: in a clean frame, the columns and rows that are not the page's flat colour at the left box.
    cap = cv2.VideoCapture(film)
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(np.where(clean)[0][len(np.where(clean)[0]) // 2]) * every)
    _, frame = cap.read()
    cap.release()
    page = np.abs(frame.astype(np.int32) - usual[0].astype(np.int32)).sum(axis=2) < 18
    xs = np.where(page[200:1000].mean(axis=0) < 0.5)[0]
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    w = x1 - x0
    h = round(w * 9 / 16)                             # the live picture is 16:9
    # Above and under the picture lie the page's bars, each one flat colour along the row; a row of the picture is not.
    band = frame[:, x0:x1].astype(np.int32)
    flat = (np.abs(band - np.median(band, axis=1, keepdims=True)).sum(axis=2) < 18).mean(axis=1)
    inside = flat < 0.9
    rows = np.where(inside)[0]
    best = max(range(0, height - h + 1), key=lambda y: inside[y:y + h].sum())
    y0 = int(best)

    runs, start = [], None
    for n, ok in enumerate(list(clean) + [False]):
        if ok and start is None:
            start = n
        if not ok and start is not None:
            a, b = start * STEP + MARGIN, (n - 1) * STEP - MARGIN
            if b - a >= SHORTEST:
                runs.append({'from': round(a, 2), 'to': round(b, 2)})
            start = None
    total = sum(r['to'] - r['from'] for r in runs)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'about': 'The live table picture inside the screen recording, written by verktyg/ram.py. crop is x, y, width, height in the film; runs are the stretches in seconds where the picture is shown unzoomed.',
                   'source': 'https://www.youtube.com/watch?v=OKSnPf75PeU', 'file': 'video/kalla.mp4', 'width': width, 'height': height, 'fps': round(fps, 3), 'frameCount': count,
                   'crop': {'x': x0, 'y': y0, 'width': w, 'height': h}, 'runs': runs}, f, indent=1)
    print(f'picture x {x0} y {y0} {w}x{h}; {len(runs)} clean stretches, {total:.0f} of {count / fps:.0f} seconds; rows that look like picture: {rows.min()}..{rows.max()}')


main()
