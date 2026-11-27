# Measures one of our own figure's films with the same yardstick as the live table's film, so that the figure and the
# real dealers can be laid number against number: the right hand's speed through the carry and how often it nearly
# stops, when the trunk and the head set off against the hand, blinks, and what the other hand does.
#   python -I live-bj/verktyg/docka.py <the film's measures, a folder written by mat.py --ensam> <ut.json> [<the figure's own numbers per frame>]
# With the figure's own numbers (blackjack-dealer/dealer3d/data/lyft-*.json, metres in the live table's lens world) it
# also says how well this folder's way of measuring finds what is known: the wrist's place in the picture, and its speed in
# metres laid on a plane over the felt, against the true speed. That is the test of how far the live film's metres hold.
# Our figure is filmed through the live table's camera (blackjack-dealer/src/table-live.ts LIVE_CAMERA, copied from
# data/scen.json), so the camera is read from data/scen.json, not written here.
import sys, json, os, glob
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from monster import Stretch, smooth, runs   # noqa: E402
from stil import Camera, onset, WRIST_LOW   # noqa: E402

NEAR_STOP = 0.25   # a dip under this share of the carry's top speed, between two rises, is a near stop


def live_camera():
    """The camera our figure is filmed through: the live table's (data/scen.json camera), and its felt-to-pixel mapping."""
    cam = json.load(open(os.path.join(HERE, '..', 'data', 'scen.json'), encoding='utf-8'))['camera']
    return Camera(cam), cam['feltToPixel']


def near_stops(speed):
    """How many times the speed falls under NEAR_STOP of its top and rises again, inside the span."""
    low = speed < NEAR_STOP * speed.max()
    return sum(1 for a, b in runs(low) if a > 0 and b < len(low))


def curve(speed):
    return [round(float(x), 2) for x in np.interp(np.linspace(0, 1, 21), np.linspace(0, 1, len(speed)), speed / speed.max())]


def main():
    folder, out = sys.argv[1], sys.argv[2]
    truth = json.load(open(sys.argv[3], encoding='utf-8')) if len(sys.argv) > 3 else None
    cam, to_pixel = live_camera()
    st = Stretch(json.load(open(sorted(glob.glob(os.path.join(folder, 'rorelse-*.json')))[0], encoding='utf-8')))
    n, fps = len(st.t), st.fps
    wrist = {'L': smooth(st.pose[:, 15], 5), 'R': smooth(st.pose[:, 16], 5)}
    low = {s: cam.plane(wrist[s], WRIST_LOW) for s in 'LR'}
    speed = {s: np.concatenate([[0], np.linalg.norm(np.diff(low[s], axis=0), axis=1) * fps]) for s in 'LR'}
    result = {'about': 'One of our own figure\'s films measured like the live table\'s film, written by verktyg/docka.py. Seconds, metres, degrees; L and R are the figure\'s own left and right. '
                       'measured is what MediaPipe sees in the film, laid on a plane ' + f'{WRIST_LOW} m over the felt through the game\'s camera; true is the figure\'s own numbers where they were given.',
              'frames': n, 'fps': fps, 'found': {'body': int((~np.isnan(st.pose[:, 0, 0])).sum()), 'left_hand': int(st.hand['L']['found'].sum()), 'right_hand': int(st.hand['R']['found'].sum()),
                                                'face': int((~np.isnan(st.head[:, 0])).sum())}}
    a, b = 0, n - 1
    if truth:
        frames = truth['frames'][:n]
        a, b = truth['leavesShoe'], truth['rests']
        check = {}
        for s in 'LR':
            real = np.array([f[s]['w'] for f in frames])                                  # x right, y up, z toward the player
            fwd, down = cam.fwd, cam.down                                                  # the true point seen through the camera's own rays
            rel = np.stack([real[:, 0], -real[:, 2], real[:, 1] - cam.h], axis=1)
            depth = rel @ fwd
            px = np.stack([cam.cx + cam.f * rel[:, 0] / depth, cam.cy + cam.f * (rel @ down) / depth], axis=1)
            true_speed = np.concatenate([[0], np.linalg.norm(np.diff(real, axis=0), axis=1) * fps])
            at_height = np.array([cam.plane(wrist[s][k:k + 1], real[k, 1])[0] for k in range(len(real))])
            speed_at_height = np.concatenate([[0], np.linalg.norm(np.diff(at_height, axis=0), axis=1) * fps])
            seen = ~np.isnan(wrist[s][:len(real), 0])
            across = np.concatenate([[0], cam.across(wrist[s][:len(real)], WRIST_LOW) * fps])
            check[s] = {'wrist_height_over_felt_m': [round(float(real[:, 1].min()), 3), round(float(real[:, 1].max()), 3)],
                        'wrist_in_the_picture_error_px': round(float(np.nanmedian(np.linalg.norm(st.pose[:len(real), 15 if s == 'L' else 16] - px, axis=1)[seen])), 1),
                        'true_top_m_s': round(float(true_speed.max()), 3), 'measured_top_m_s': round(float(speed[s][:len(real)].max()), 3), 'measured_top_at_true_height_m_s': round(float(speed_at_height.max()), 3),
                        'true_path_m': round(float(true_speed.sum() / fps), 3), 'measured_path_m': round(float(speed[s][:len(real)].sum() / fps), 3), 'measured_path_at_true_height_m': round(float(speed_at_height.sum() / fps), 3),
                        'measured_across_top_m_s': round(float(np.nanmax(across)), 3), 'measured_across_path_m': round(float(np.nansum(across) / fps), 3),
                        'true_top_in_carry_m_s': round(float(true_speed[a:b + 1].max()), 3), 'measured_top_in_carry_m_s': round(float(speed[s][a:b + 1].max()), 3), 'measured_across_top_in_carry_m_s': round(float(np.nanmax(across[a:b + 1])), 3)}
            if s == 'R':
                carry_true = true_speed[a:b + 1]
                result['right_hand_true'] = {'carry_frames': [a, b], 'seconds': round((b - a) / fps, 3), 'top_m_s': round(float(carry_true.max()), 3), 'mean_m_s': round(float(carry_true.mean()), 3),
                                             'near_stops': near_stops(carry_true), 'speed_share_of_top': curve(carry_true)}
        result['check_against_the_figures_own_numbers'] = {'how': 'error_px is how far MediaPipe\'s wrist lies from the figure\'s true wrist in the picture (median). measured speeds assume the wrist '
                                                                  f'{WRIST_LOW} m over the felt; at_true_height uses the height the figure really has in each frame. The ratio measured to true is how far the live film\'s metres can be trusted.',
                                                           **check}
    carry = speed['R'][a:b + 1]
    result['right_hand_measured'] = {'carry_frames': [a, b], 'top_m_s': round(float(carry.max()), 3), 'mean_m_s': round(float(carry.mean()), 3), 'near_stops': near_stops(carry), 'speed_share_of_top': curve(carry)}
    # the trunk and the head against the right hand, as in stil.py: each at a fifth of its own way
    lo, hi = max(a - 15, 0), min(b + 12, n - 1)
    mid = cam.wall(smooth(st.mid, 5), 2.2)[:, 0]
    h0, _ = onset(wrist['R'][lo:hi + 1, 0])
    follow = {}
    for name, series, least in (('trunk', mid[lo:hi + 1], 0.012), ('head', smooth(st.head[:, 1], 5)[lo:hi + 1], 5.0)):
        ok = ~np.isnan(series)
        p0, size = onset(series) if ok.all() else (None, 0.0)
        follow[name] = {'goes_along': bool(p0 is not None and size >= least), 'size': round(size, 3), 'starts_after_hand_s': round((p0 - h0) / fps, 3) if p0 is not None and h0 is not None and size >= least else None}
    result['with_the_right_hand'] = {'how': 'As in data/stil-*.json: the middle of the shoulders sideways (metres, goes along over 12 mm) and the head\'s turn (degrees, over 5), each start taken at a fifth of its own way.', **follow}
    other = low['L'][a:b + 1]
    step = np.linalg.norm(np.diff(other, axis=0), axis=1)
    result['left_hand_meanwhile'] = {'path_m': round(float(np.nansum(step)), 3), 'still_share_of_the_time': round(float((step * fps < 0.05).mean()), 3)}
    opening = st.opening
    base = np.nanpercentile(opening, 90) if (~np.isnan(opening)).sum() > 10 else np.nan
    closed = np.nan_to_num(opening, nan=1.0) < 0.55 * base if not np.isnan(base) else np.zeros(n, bool)
    result['blinks'] = {'count': sum(1 for x, y in runs(closed) if (y - x) / fps <= 0.4 and x > 0 and y < n), 'eye_opening_seen_in_frames': int((~np.isnan(opening)).sum())}
    still = (speed['L'] < 0.02) & (speed['R'] < 0.02)
    quiet = [(x, y) for x, y in runs(still) if y - x >= 15]
    result['rest'] = {'how': 'Half a second or more with both wrists under 0.02 m/s: the spread of the nose and the shoulders about their mean, millimetres rms.',
                      'windows': len(quiet), 'nose_mm': [round(float(np.sqrt(np.nanmean(np.nansum((cam.wall(st.pose[x:y, 0], 2.2) - np.nanmean(cam.wall(st.pose[x:y, 0], 2.2), axis=0)) ** 2, axis=1))) * 1000), 2) for x, y in quiet],
                      'shoulders_mm': [round(float(np.sqrt(np.nanmean(np.nansum((cam.wall(st.mid[x:y], 2.2) - np.nanmean(cam.wall(st.mid[x:y], 2.2), axis=0)) ** 2, axis=1))) * 1000), 2) for x, y in quiet]}
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=1)
    print(json.dumps({k: v for k, v in result.items() if k != 'about'}))


if __name__ == '__main__':
    main()
