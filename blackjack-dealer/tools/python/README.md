# Python-skripten

Det som behöver MediaPipe eller OpenCV körs i Python, eftersom repots TypeScript inte har dem. Samma miljö mäter
livebordet (`../live-bj/`). Slå upp ett avsnitt, läs inte hela.

| Skript | Vad det gör | Används i |
| --- | --- | --- |
| `domare.py` | Domarens underlag för en film eller en stor bild: blad med var tredje ruta, och per figur (också i filmer lagda bredvid varandra) skakighet, ryck, ansiktets form över tiden, blicken och fingrarnas längd, med närbilder av ansiktet och händerna där något händer. Mäter med `live-bj/verktyg/mat.py --ensam`. Körs genom `node tools/domare-underlag.ts`. | Domaren (skillen doma) |

Användning står överst i skriptet. Kör alltid med `-I` (isolerat läge), från projektets mapp.

## Miljön

Python 3.13 (miljön skripten kördes i hade 3.13.11). En gång per checkout:

```
py -3.13 -m venv tools/python/.venv
tools/python/.venv/Scripts/python.exe -m pip install -r tools/python/requirements.txt
```

`requirements.txt` är `pip freeze` ur den miljö skripten kördes i;
skripten själva importerar bara `numpy`, `cv2` (OpenCV 5.0) och `mediapipe`. Samma versioner behövs för samma pixlar.
`.venv/` och `models/` här är Git-ignorerade.

## Modellerna

Modellfilerna är för stora för Git (upp till 37 MB). Lägg dem i `tools/python/models/`, eller peka miljövariabeln
`DEALER_MODELS` på en mapp som har dem. SHA-256 är de filer som användes; kontrollera en nedladdad fil mot dem.

| Fil | Källa | SHA-256 |
| --- | --- | --- |
| `hand_landmarker.task` | MediaPipe, `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task` | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |
| `face_landmarker.task` | MediaPipe, `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task` | `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` |
| `pose_landmarker_heavy.task` | MediaPipe, `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task` | `64437af838a65d18e5ba7a0d39b465540069bc8aae8308de3e318aad31fcbc7b` |
| `face_detection_yunet_2023mar.onnx` | OpenCV Zoo, `models/face_detection_yunet/` | `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4` |
| `face_recognition_sface_2021dec.onnx` | OpenCV Zoo, `models/face_recognition_sface/` | `0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79` |

Adresserna ovan är MediaPipes och OpenCV Zoos publicerade; `latest` kan ha flyttats sedan dess, därför
kontrollsummorna.
