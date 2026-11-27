# Python-skripten i efterarbetet

Den egna MuseTalk-köraren finns i [mouth-runner](mouth-runner/README.md). Dess MediaPipe-mask, versionerade munprofil
och källproveniens följer med repot; modellvikter och lokala förberedelser gör det inte. Profilens regressioner körs
inte av `npm test`: kör dem med Pythons standardbibliotek från mappen `mouth-runner/`, med
`python -B -m unittest discover -s tests -v`.

Skripten som beställningen och granskningen ([bestalla-film](../../../.claude/skills/bestalla-film/SKILL.md),
[granska-film](../../../.claude/skills/granska-film/SKILL.md), [ny-dealer](../../../.claude/skills/ny-dealer/SKILL.md)) kör i Python, oftast för att de hittar händer, ögon, axlar eller ansikten med
MediaPipe eller OpenCV:s ansiktsmodeller, som repots TypeScript inte har; resten av efterarbetet är
`tools/film-after.ts` och `tools/still-after.ts`. Slå upp ett avsnitt, läs inte hela.

| Skript | Vad det gör | Används i |
| --- | --- | --- |
| `grundbild-21.py` | Passar en levererad stillbild till bankens ruta mot dealerns ankare 1 (en likformighetsavbildning på händer, axlar, armbågar och ögon) och mäter resultatet. Skriver `<namn>-final.png`, `<namn>-ark.jpg` och `<namn>.json`. | Steg 1 för en stillbild |
| `skolagning-21.py` | Lägger tillbaka bankens egen sko från en platta utan hand och behåller bara dealerns hand ovanpå (`--keep-card` behåller kortet hon rör). | Steg 3 för en stillbild |
| `filmmatt.py` | Mäter en film ruta för ruta: format, grönt, frysta rutor, händer och kropp, färgade kort, landning mot planen (`--seats`, läser `placements/default.json` i repot) och första och sista ruta mot beställningens bilder (`--start`, `--end`). Skriver `<namn>.film.json`. | Händer och kropp per ruta (granska-film) |
| `forlang-plagg.py` | Förlänger ett ljust plagg nedåt i en passad stillbild så att kroppen slutar vid bordets bakkant, bakom armar och händer. Behöver ingen modell. | Kroppen kapad i en stillbild med ljust plagg |
| `identitet.py` | Ansiktslikhet per ruta mot stillbilder av den nya och den gamla dealern, och hur mycket tatueringsbläck handryggarna bär. Kräver `filmmatt.py`:s mått för samma film. | Likhet för en ny dealer (ny-dealer, steg 3) |
| `landmarks.py` | Läser en film ruta för ruta och skriver allt MediaPipe ser av händerna (21 punkter var, i bankens bildpunkter och som en hand i meter) och kroppen (33 punkter) till en JSON-fil. Talen är MediaPipes egna, ojämnade. | En verklig giv lagd i rummet (`dealer3d/tools/lift.ts`) |
| `hands-from-anchor.py` | Lägger händerna ur en ankarbild över händerna i en film, ruta för ruta, och låter varje hand följa sin egen lilla rörelse i filmen. Behöver ingen modell, bara OpenCV och `ffmpeg` på sökvägen. | En vila i en annan uppsättning (nedan) |
| `domare.py` | Domarens underlag för en film eller en stor bild: blad med var tredje ruta, och per figur (också i filmer lagda bredvid varandra) skakighet, ryck, ansiktets form över tiden, blicken och fingrarnas längd, med närbilder av ansiktet och händerna där något händer. Mäter med `live-bj/verktyg/mat.py --ensam`. Körs genom `node tools/domare-underlag.ts`. | Domaren (skillen doma) |

Användning står överst i varje skript. Kör alltid med `-I` (isolerat läge), från projektets mapp:

```
tools/python/.venv/Scripts/python.exe -I tools/python/filmmatt.py <film.mp4> <namn> <utmapp> --start first.png --end last.png
```

## En vila i en annan uppsättning (`hands-from-anchor.py`)

En godkänd vila i en uppsättning blir en vila i en annan utan beställning och utan kostnad: filmens egen rörelse, med
händerna ur den andra uppsättningens ankare 1 (så blev Casinots vilor Tatuerads). Det håller för en film där
händerna ligger stilla på filten och där ankarbilden utanför händerna är filmens första ruta. Samma indata ger samma
fil (SHA-256 lika). Två steg, från projektets mapp; det andra för in filmen i banken som lokalt härledd, i inkorgen, med
ankaret som första och sista bild (`tools/register-derived.ts`, `--dry` säger vad som skulle skrivas):

```
tools/python/.venv/Scripts/python.exe -I tools/python/hands-from-anchor.py assets/anchors/<ankare>/anchor.png assets/motions/<källklipp>/source.mp4 .runtime/<uppgift>/<ut>.mp4 --sheet .runtime/<uppgift>/<ark>.png
node tools/register-derived.ts .runtime/<uppgift>/<ut>.mp4 --id <nytt klipp-id> --source <källklipp> --anchor <ankarets post i Material> --script tools/python/hands-from-anchor.py --operation "<vad som är gjort>"
```

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
