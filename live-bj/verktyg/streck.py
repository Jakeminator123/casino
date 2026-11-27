# Makes a film of the measurements alone: the dealer as a stick figure (body, arms, both hands with fingers, the head's
# direction, the eyes with lids and gaze), beside the table picture it was measured from, so that the eye can judge the
# pattern of movement without the rest of the picture.
#   python -I live-bj/verktyg/streck.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt <ut.mp4> <from second> <to second> [--bara]
# --bara leaves the film out and writes the stick figure only. The film it writes shows a real person unless --bara is
# given, and stays on this computer either way (rutor/ is not in Git). Needs ffmpeg on the path.
import sys, json, os, glob, math, subprocess
import numpy as np, cv2

W, H = 864, 486
BONES = [(11, 12), (11, 13), (13, 15), (12, 14), (14, 16), (11, 23), (12, 24)]
FINGERS = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [0, 17, 18, 19, 20], [5, 9, 13, 17]]


def figure(entry, scale, sign):
    pic = np.full((H, W, 3), (38, 22, 30), np.uint8)
    p = lambda q: (int(round(q[0] * scale)), int(round(q[1] * scale)))
    if entry['pose']:
        pts = entry['pose']['image']
        for a, b in BONES:
            cv2.line(pic, p(pts[a]), p(pts[b]), (210, 210, 210), 3, cv2.LINE_AA)
        for i in (11, 12, 13, 14, 15, 16):
            cv2.circle(pic, p(pts[i]), 5, (0, 200, 255), -1, cv2.LINE_AA)
    for side, colour in (('L', (255, 170, 60)), ('R', (90, 230, 90))):
        hand = entry['hands'].get(side)
        if hand:
            for chain in FINGERS:
                for a, b in zip(chain, chain[1:]):
                    cv2.line(pic, p(hand['image'][a]), p(hand['image'][b]), colour, 2, cv2.LINE_AA)
    face = entry['face']
    if face:
        f = face['points']
        nose, brow, chin = np.array(f['nose']), np.array(f['brow']), np.array(f['chin'])
        size = float(np.linalg.norm(brow - chin))
        centre = (brow + chin) / 2
        cv2.ellipse(pic, p(centre), (int(size * 0.42 * scale), int(size * 0.6 * scale)), float(face['turn'][2]), 0, 360, (210, 210, 210), 2, cv2.LINE_AA)
        cv2.line(pic, p(centre), p(centre + (nose - centre) * 2.2), (0, 200, 255), 2, cv2.LINE_AA)   # where the nose points
        b = face['blend']
        for eye, a, c, up, down, iris in (('R', 'eyeR_out', 'eyeR_in', 'lidR_up', 'lidR_down', 'irisR'), ('L', 'eyeL_in', 'eyeL_out', 'lidL_up', 'lidL_down', 'irisL')):
            mid = (np.array(f[a]) + np.array(f[c])) / 2
            wide = float(np.linalg.norm(np.array(f[a]) - np.array(f[c])))
            gap = float(np.linalg.norm(np.array(f[up]) - np.array(f[down])))
            cv2.ellipse(pic, p(mid), (max(int(wide * 0.5 * scale), 2), max(int(gap * 0.5 * scale), 1)), 0, 0, 360, (255, 255, 255), 1, cv2.LINE_AA)
            cv2.circle(pic, p(f[iris]), 2, (0, 0, 255), -1, cv2.LINE_AA)
        # the eyes large, in the corner: lids and gaze as MediaPipe scores them
        for k, (blink, side_in, side_out) in enumerate((('eyeBlinkRight', 'eyeLookInRight', 'eyeLookOutRight'), ('eyeBlinkLeft', 'eyeLookOutLeft', 'eyeLookInLeft'))):
            cx, cy = W - 150 + k * 80, 70
            lid = 1 - min(max(b[blink], 0), 1)
            cv2.ellipse(pic, (cx, cy), (30, max(int(18 * lid), 1)), 0, 0, 360, (255, 255, 255), 2, cv2.LINE_AA)
            gx = (b[side_in] - b[side_out]) * (1 if k == 0 else 1) * 18
            gy = (b['eyeLookDownLeft'] - b['eyeLookUpLeft']) * 12
            if lid > 0.35:
                cv2.circle(pic, (int(cx + gx), int(cy + gy * lid)), 7, (0, 0, 255), -1, cv2.LINE_AA)
        cv2.putText(pic, f"nick {face['turn'][0]:+.0f}  vrid {face['turn'][1]:+.0f}  lut {face['turn'][2]:+.0f}", (W - 250, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1, cv2.LINE_AA)
    cv2.putText(pic, f"{entry['t']:.2f} s   {sign or ''}", (12, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2, cv2.LINE_AA)
    return pic


def main():
    args = [a for a in sys.argv[1:] if a != '--bara']
    bare = '--bara' in sys.argv
    film, source_file, measures, out, t0, t1 = args[0], args[1], args[2], args[3], float(args[4]), float(args[5])
    source = json.load(open(source_file, encoding='utf-8'))
    crop = source['crop']
    phases = os.path.join(os.path.dirname(os.path.abspath(source_file)), 'faser.json')
    spans = json.load(open(phases, encoding='utf-8'))['spans'] if os.path.exists(phases) else []
    entries = []
    for name in sorted(glob.glob(os.path.join(measures, 'rorelse-*.json'))):
        data = json.load(open(name, encoding='utf-8'))
        if data['to'] >= t0 and data['from'] <= t1:
            entries += [e for e in data['frames'] if t0 <= e['t'] <= t1]
            rate = data['fps']
    if not entries:
        sys.exit('nothing measured between those seconds')
    scale = W / crop['width']
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    width = W if bare else 2 * W
    pipe = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{width}x{H}', '-r', str(rate), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', out], stdin=subprocess.PIPE)
    cap = cv2.VideoCapture(film)
    cap.set(cv2.CAP_PROP_POS_FRAMES, entries[0]['f'])
    at = entries[0]['f']
    for e in entries:
        sign = next((s['sign'] for s in spans if s['from'] <= e['t'] < s['to']), None)
        drawn = figure(e, scale, sign)
        if not bare:
            if e['f'] < at:   # a new stretch that begins before where the reading stands cannot happen; a later one is sought
                continue
            if e['f'] - at > 600:
                cap.set(cv2.CAP_PROP_POS_FRAMES, e['f'])
                at = e['f']
            while at < e['f']:
                cap.grab()
                at += 1
            ok, full = cap.read()
            at += 1
            if not ok:
                break
            pic = cv2.resize(full[crop['y']:crop['y'] + crop['height'], crop['x']:crop['x'] + crop['width']], (W, H), interpolation=cv2.INTER_AREA)
            drawn = np.hstack([pic, drawn])
        pipe.stdin.write(drawn.tobytes())
    pipe.stdin.close()
    pipe.wait()
    cap.release()
    print(out, len(entries), 'frames', round(len(entries) / rate, 1), 's')


main()
