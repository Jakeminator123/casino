# Lays our own table and figure, drawn through the live table's camera, half see-through over a still of the live
# table's film, with the live table's edge, shoe, box and seats drawn as lines, so that the eye sees how the two tables
# differ; and writes the same differences as numbers.
#   python -I live-bj/verktyg/overlagg.py <still.png> <our table through their camera.png, with alpha> <punkter.json> live-bj/data/scen.json <ut.jpg> [<ut.json>]
# The picture of our table and punkter.json (our card places, shoe, tray, edges and figure in metres of the lens world
# and in pixels of this picture) are drawn by the editor's side; they lie in the slask and are not kept. The sheet shows
# a real person and stays on this computer (rutor/ is not in Git). The numbers go to data/mot-vart-bord.json.
# Metres: the lens world, x to the picture's right, y up with the felt at 0, z toward the player, the camera over the origin.
import sys, json, os, math
import numpy as np, cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stil import Camera   # noqa: E402

THEIRS, OURS = (255, 255, 0), (0, 220, 255)   # cyan for the live table's lines, yellow for ours
BODY = [('docka_axel_hoger', 'docka_axel_vanster'), ('docka_axel_hoger', 'docka_armbage_hoger'), ('docka_armbage_hoger', 'docka_handled_hoger'), ('docka_axel_vanster', 'docka_armbage_vanster'),
        ('docka_armbage_vanster', 'docka_handled_vanster')]


def legend(pic, lines):
    """The explanation on a dark strip under the picture, so that it does not lie over the game's own text."""
    strip = np.full((34 * len(lines) + 12, pic.shape[1], 3), 24, np.uint8)
    for k, (text, colour) in enumerate(lines):
        cv2.putText(strip, text, (16, 30 + 34 * k), cv2.FONT_HERSHEY_SIMPLEX, 0.66, colour, 1, cv2.LINE_AA)
    return np.vstack([pic, strip])


def main():
    still, ours_file, points_file, scene_file, out = sys.argv[1:6]
    numbers = sys.argv[6] if len(sys.argv) > 6 else None
    base = cv2.imread(still)
    ours = cv2.imread(ours_file, cv2.IMREAD_UNCHANGED)
    points, scene = json.load(open(points_file, encoding='utf-8')), json.load(open(scene_file, encoding='utf-8'))
    alpha = (ours[:, :, 3:4].astype(np.float32) / 255) * 0.55
    pic = (base.astype(np.float32) * (1 - alpha) + ours[:, :, :3].astype(np.float32) * alpha).astype(np.uint8)
    line = points['linjer']
    cam = Camera(scene['camera'])
    edge_theirs, edge_ours = scene['table']['dealerEdgeM'], -points['punkter']['dealerkant_mitt']['lins_m'][2]

    def draw(pic, shift):
        """Their things as they are, and ours moved this many metres toward the camera (0: as the editor drew them)."""
        poly = lambda pts, colour, closed=True, width=2: cv2.polylines(pic, [np.round(np.array(pts, float)).astype(np.int32).reshape(-1, 1, 2)], closed, colour, width, cv2.LINE_AA)
        seen = lambda m: cam.pixel(m[0], -m[2] - shift, m[1])
        mark = lambda p, colour, kind, size=18: cv2.drawMarker(pic, (int(round(p[0])), int(round(p[1]))), colour, kind, size, 2, cv2.LINE_AA)
        poly(scene['table']['feltOutlinePx'], THEIRS)
        for name in ('sko', 'slaskbox'):
            poly(scene['things'][name]['outline'], THEIRS)
        poly(scene['things']['sko']['front_plate'], THEIRS, width=3)
        for p in scene['seatsUiPx']:
            cv2.circle(pic, (int(p[0]), int(p[1])), 14, THEIRS, 2, cv2.LINE_AA)
        for place in scene['places'].values():
            mark(place['px'], THEIRS, cv2.MARKER_TILTED_CROSS, 16)
        poly([seen(m) for m in line['dealerkant']['lins_m']], OURS, closed=False)
        poly([seen(m) for m in line['sko_framande']['lins_m']], OURS)
        poly([seen(m) for m in line['bricka_yttre']['lins_m']], OURS, width=1)
        for seat in range(1, 8):
            mark(seen(points['punkter'][f'kortplats_P{seat}.C1']['lins_m']), OURS, cv2.MARKER_CROSS)
            poly([seen(m) for m in line[f'insatsring_P{seat}']['lins_m']], OURS, width=1)
        mark(seen(points['punkter']['kortplats_D.C1']['lins_m']), OURS, cv2.MARKER_CROSS)
        if shift:   # the figure as lines, since the drawn picture of it cannot be moved
            for a, b in BODY:
                cv2.line(pic, tuple(int(round(v)) for v in seen(points['punkter'][a]['lins_m'])), tuple(int(round(v)) for v in seen(points['punkter'][b]['lins_m'])), OURS, 3, cv2.LINE_AA)
            cv2.circle(pic, tuple(int(round(v)) for v in seen(points['punkter']['docka_ogon_mitt']['lins_m'])), 9, OURS, 3, cv2.LINE_AA)

    draw(pic, 0.0)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    cv2.imwrite(out, legend(pic, [('Livebordet: filtens kant, sko, lada, platsernas marken (ringar) och dar korten landar (kryss).', THEIRS),
                                  ('Vart bord och var docka genom samma kamera, ritade halvgenomskinligt: kanten mot dealern, bricka, sko, kortplatser (plus), insatsringar.', OURS)]), [cv2.IMWRITE_JPEG_QUALITY, 90])
    edge_to_edge = base.copy()
    draw(edge_to_edge, edge_ours - edge_theirs)
    second = os.path.splitext(out)[0] + '-kant-mot-kant.jpg'
    cv2.imwrite(second, legend(edge_to_edge, [('Livebordet som det ar.', THEIRS),
                                              (f'Vart bord flyttat {edge_ours - edge_theirs:.2f} m mot kameran, sa att kanterna mot dealern ligger pa varandra. Dockan som streck: ogon, axlar, armbagar, handleder.', OURS)]),
                [cv2.IMWRITE_JPEG_QUALITY, 90])
    print(out, second)
    if not numbers:
        return

    # The same in numbers. Theirs are felt metres (x right, y away from the camera); ours the lens world (z = minus that y).
    lens = lambda key: points['punkter'][key]['lins_m']
    table, cam, our_cam = scene['table'], scene['camera'], points['kameror']['var_spel']
    edge_theirs, edge_ours = table['dealerEdgeM'], -lens('dealerkant_mitt')[2]
    front_ours = -lens('framkant_mitt_filtens_slut')[2]
    our_width = abs(line['dealerkant']['lins_m'][0][0] - line['dealerkant']['lins_m'][-1][0])
    mouth_theirs = np.mean(scene['things']['sko']['footMetres'][:2], axis=0)   # the foot of the shoe's front plate, where the card comes out
    mouth_ours = np.mean([lens('sko_mynning_nere_nara'), lens('sko_mynning_nere_bortre')], axis=0)
    seats_theirs = [scene['places'][f'seat{k}']['m'] for k in range(1, 8) if f'seat{k}' in scene['places']]
    r = lambda v, n=3: round(float(v), n)
    result = {
        'about': 'The live table against our own, written by verktyg/overlagg.py from data/scen.json and the editor\'s points of our table. Metres. from_dealers_edge is how far in front of the edge toward the dealer a thing '
                 'lies on the felt; sideways is to the picture\'s right, the dealer\'s left. The cameras are compared as they stand; the tables edge against edge.',
        'camera': {'theirs': {'height_over_felt': cam['heightM'], 'tilt_down_degrees': cam['tiltDeg'], 'field_of_view_sideways_degrees': cam['fovDeg']['horizontal'], 'to_dealers_edge_along_felt': r(edge_theirs)},
                   'our_play_view': {'height_over_felt': our_cam['heightM'], 'tilt_down_degrees': our_cam['pitchDeg'], 'field_of_view_sideways_degrees': r(2 * math.degrees(math.atan(our_cam['width'] / 2 / our_cam['focalPx'])), 1),
                                     'to_dealers_edge_along_felt': r(edge_ours)}},
        'felt': {'theirs': {'shape': 'half circle', 'width_at_dealers_edge': table['widthAtDealerEdgeM'], 'depth': table['depthM'], 'radius': table['arc']['radiusM']},
                 'ours': {'width_at_dealers_edge': r(our_width), 'depth': r(edge_ours - front_ours)}},
        'dealers_own_cards': {'theirs_from_dealers_edge': r(edge_theirs - scene['places']['dealer']['m'][1]), 'ours_from_dealers_edge': r(edge_ours + lens('kortplats_D.C1')[2])},
        'players_cards_middle_seat': {'theirs_from_dealers_edge': r(edge_theirs - scene['places']['seat4']['m'][1]) if 'seat4' in scene['places'] else None, 'ours_from_dealers_edge': r(edge_ours + lens('kortplats_P4.C1')[2])},
        'bet_marks_middle_seat': {'theirs_from_dealers_edge': r(edge_theirs - scene['seatsUiM'][3][1]), 'ours_from_dealers_edge': r(edge_ours + lens('insatsring_P4_mitt')[2])},
        'seats_spread_sideways': {'theirs_bet_marks': [r(scene['seatsUiM'][0][0]), r(scene['seatsUiM'][-1][0])], 'ours_bet_rings': [r(lens('insatsring_P1_mitt')[0]), r(lens('insatsring_P7_mitt')[0])],
                                  'theirs_cards_land': [r(min(s[0] for s in seats_theirs)), r(max(s[0] for s in seats_theirs))], 'ours_card_places': [r(lens('kortplats_P1.C1')[0]), r(lens('kortplats_P7.C1')[0])]},
        'shoe_front': {'theirs': {'sideways': r(mouth_theirs[0]), 'from_dealers_edge': r(edge_theirs - mouth_theirs[1])}, 'ours': {'sideways': r(mouth_ours[0]), 'from_dealers_edge': r(edge_ours + mouth_ours[2])},
                       'theirs_foot': {'length': scene['things']['sko']['footLength'], 'width': scene['things']['sko']['footWidth']}},
        'figure': {'ours': {'eyes_over_felt': r(lens('docka_ogon_mitt')[1]), 'eyes_behind_dealers_edge': r(-lens('docka_ogon_mitt')[2] - edge_ours),
                            'shoulders_over_felt': r(np.mean([lens('docka_axel_hoger')[1], lens('docka_axel_vanster')[1]])), 'shoulder_width': r(abs(lens('docka_axel_hoger')[0] - lens('docka_axel_vanster')[0]))},
                   'theirs': 'see posture in data/stil-kameran.json and data/stil-bordet.json'},
    }
    with open(numbers, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=1)
    print(json.dumps({k: v for k, v in result.items() if k != 'about'}))


main()
