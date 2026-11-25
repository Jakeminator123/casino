
## Ett knapptryck: A-pose 4K dealer-avatar (`auto_avatar.py`)

Från 1–8 foton av samma person till en riggad dealer-GLB, QC-blad och en kort rörelsefilm, utan handpåläggning:

```powershell
python pipeline/auto_avatar.py --photos p1.jpg p2.jpg p3.jpg --name kim --out C:\Avatarer\kim
```

Eller dra fotona (eller en fotomapp) till [Auto avatar.cmd](../Auto%20avatar.cmd). Flaggor: `--outfit "<engelsk klädbeskrivning>"` (skjortan måste vara tydligt icke-hudfärgad, standard är mörkblå skjorta och mörka byxor), `--no-video`, `--seconds 6`, `--samples 48`, `--refs-only` (stannar efter referensbilderna så att inga Meshy-krediter används).

| Steg | Skript | Resultat i `--out` |
| --- | --- | --- |
| 1. Tre referenser, gpt-image-2 `images/edits` 1024² high, alla foton i varje anrop | [apose_referenser.py](apose_referenser.py) | `referenser/head-ref.png`, `apose-ref.png` (silhuettkontroll + normalisering, högst 2 gratis omförsök i bildtjänsten), `hands-ref.png`, `ref-3-bilder.png` |
| 2. Meshy 7.1 image-to-3d 4K PBR parallellt: huvud, A-pose-kropp (`pose_mode: a-pose`), högerhand | [meshy_enbild.py](meshy_enbild.py) | `meshy/{huvud,kropp,hand}/` (≈ 3 × 30 krediter) |
| 3. Huvudmodul (snitt mitt i halsens hudband ovanför kragen), speglat handpar, montering | [montera_apose.py](montera_apose.py), [bygg_modul.py](bygg_modul.py) | `montage/<namn>-apose.glb`, `montering.json`, `latt-4k.glb` (180 000 trianglar, 4K-texturer kvar) |
| 4. Meshy Auto-Rigging, fingerben, hals-/axelvikter, smal handled, dealer-export | [meshy_rigg.py](meshy_rigg.py), [bygg_fingrar_apose.py](bygg_fingrar_apose.py), [fixa_handleder.py](fixa_handleder.py), [exportera_dealer.py](exportera_dealer.py) | `<namn>-dealer-apose.glb` + `.json` (56 ben, 30 fingerben, `saknas_for_dealer`) (5 krediter) |
| 5. QC och rörelse | [qc_oversikt.py](qc_oversikt.py), [animera_dealer.py](animera_dealer.py) | `resultat-oversikt.png`, `rorelse/<namn>-ror-sig.mp4` (1280×720, 24 fps), `rorelse/<namn>-apose-med-rorelse.glb`, `rorelse-strip.png` |

Alla betalda jobb sparar kvitton (`korning.json`, `riggjobb.json`). En omstart återupptar samma jobb och startar aldrig ett nytt för samma bild. `auto-avatar.json` samlar Meshy-saldo före och efter, tider per steg, ben, trianglar, GLB-storlek och texturupplösningar.
