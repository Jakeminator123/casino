"""Ansiktets 478 punkter (MediaPipe Face Landmarker) i en eller flera bilder, för steg 09 (ansikte.py).

Körs med Python-miljön som har MediaPipe (../blackjack-dealer/tools/python/.venv) och dess modell
(../blackjack-dealer/tools/python/models/face_landmarker.task); ansikte.py anropar det själv:
    python punkter.py --modell face_landmarker.task --ut punkter.json bild1.png [bild2.png ...]
Skriver {bild: [[x, y, z], ...]} med x och y i bildens andelar (0-1, y nedåt) och z som MediaPipe ger det; en bild utan
ansikte får null."""
import argparse, json
from pathlib import Path

import mediapipe as mp
from mediapipe.tasks.python import BaseOptions, vision

ap = argparse.ArgumentParser()
ap.add_argument('--modell', required=True)
ap.add_argument('--ut', required=True)
ap.add_argument('bilder', nargs='+')
a = ap.parse_args()
opt = vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=a.modell), num_faces=1,
                                   min_face_detection_confidence=0.3, min_face_presence_confidence=0.3)
ut = {}
with vision.FaceLandmarker.create_from_options(opt) as fl:
    for b in a.bilder:
        res = fl.detect(mp.Image.create_from_file(b))
        ut[Path(b).name] = [[p.x, p.y, p.z] for p in res.face_landmarks[0]] if res.face_landmarks else None
Path(a.ut).write_text(json.dumps(ut), encoding='utf-8')
print('PUNKTER', {k: (len(v) if v else None) for k, v in ut.items()})
