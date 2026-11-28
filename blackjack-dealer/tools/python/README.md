# Python-miljön

MediaPipe och OpenCV körs i Python. Miljön här används av domarens underlag (`domare.py`, genom
`node tools/domare-underlag.ts`; användningen står överst i skriptet), av mätningen i `../live-bj/` och av
personens bilder i `../avatar-auto-pipeline/`. Kör alltid med `-I` (isolerat läge).

## Sätta upp den

Python 3.13 (skripten kördes i 3.13.11). En gång per utcheckning, från `blackjack-dealer/`:

```
py -3.13 -m venv tools/python/.venv
tools/python/.venv/Scripts/python.exe -m pip install -r tools/python/requirements.txt
```

`requirements.txt` är `pip freeze` ur miljön skripten kördes i: samma versioner ger samma bildpunkter. `.venv/` och
`models/` är Git-ignorerade.

## Modellfilerna

För stora för Git. Lägg dem i `tools/python/models/` eller i en mapp som miljövariabeln `DEALER_MODELS` pekar på, och
kontrollera dem mot SHA-256 (adressernas `latest` kan ha flyttats).

| Fil | Källa (MediaPipe) | SHA-256 |
| --- | --- | --- |
| `hand_landmarker.task` | `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task` | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |
| `face_landmarker.task` | `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task` | `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` |
| `pose_landmarker_heavy.task` | `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task` | `64437af838a65d18e5ba7a0d39b465540069bc8aae8308de3e318aad31fcbc7b` |
