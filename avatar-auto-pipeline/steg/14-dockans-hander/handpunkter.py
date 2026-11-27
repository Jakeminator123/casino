"""Handens 21 punkter (MediaPipe Hand Landmarker) i en eller flera bilder, för steg 14 (hudbilder.py).

Körs med Python-miljön som har MediaPipe (../blackjack-dealer/tools/python/.venv) och dess modell
(../blackjack-dealer/tools/python/models/hand_landmarker.task); hudbilder.py anropar det själv:
    python handpunkter.py --modell hand_landmarker.task --ut punkter.json bild1.png [bild2.png ...]
Skriver {bild: [[x, y, z], ...]} med x och y i bildens andelar (0-1, y nedåt), i MediaPipes ordning (0 handleden, 1-4
tummen, 5-8 pekfingret, 9-12 långfingret, 13-16 ringfingret, 17-20 lillfingret; varje finger från knogen till toppen);
en bild utan hand får null."""
import argparse, json
from pathlib import Path

import mediapipe as mp
from mediapipe.tasks.python import BaseOptions, vision

ap = argparse.ArgumentParser()
ap.add_argument('--modell', required=True)
ap.add_argument('--ut', required=True)
ap.add_argument('bilder', nargs='+')
a = ap.parse_args()
opt = vision.HandLandmarkerOptions(base_options=BaseOptions(model_asset_path=a.modell), num_hands=1,
                                   min_hand_detection_confidence=0.2, min_hand_presence_confidence=0.2)
ut = {}
with vision.HandLandmarker.create_from_options(opt) as hl:
    for b in a.bilder:
        res = hl.detect(mp.Image.create_from_file(b))
        ut[Path(b).name] = [[p.x, p.y, p.z] for p in res.hand_landmarks[0]] if res.hand_landmarks else None
Path(a.ut).write_text(json.dumps(ut), encoding='utf-8')
print('HANDPUNKTER', {k: (len(v) if v else None) for k, v in ut.items()})
