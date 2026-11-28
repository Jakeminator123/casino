# Avatar Auto-Pipeline

Tre saker i en mapp, med samma skelett i botten:

1. **Standardscenen och dockorna** i Blender: livebordet (bordet, kameran, korten och skon mätta på filmen av ett
   riktigt livebord) och dockorna Danilo, Frasse och persondockorna på samma skelett.
2. **En ny dealer ur bilder** (`ny_dealer.py`): personens bilder blir en docka vid livebordet som spelar de lyfta
   rörelserna, med de betalda anropen för hans film färdiga.
3. **En dealer från foton** (Version 1, `auto_avatar.py`): 1–8 foton till en riggad 3D-dealer i A-pose hos Meshy.

Reglerna står i `AGENTS.md`, dockorna, skelettet och lederna i `new_docka.md`, och varje väg del för del i `VAGAR.md`.

## Mappar

```
avatar-auto-pipeline/
  AGENTS.md, README-SV.md, new_docka.md   regler; mappar och körning; dockorna och skelettet
  vagar.json                 vägarna att bygga en docka, del för del, och vad som går ihop (källan; ändras för hand)
  vagar.py, VAGAR.md         vagar.py kontrollerar vagar.json mot koden och skriver VAGAR.md (--kolla, --val)
  scen/                      standardscenen
    standard.yaml            alla mått, skrivna ur spelets kod av gen_standard.py (las_spelet.ts läser koden åt den)
    bygg_bord.py             livebordet, korten, skon och lådan för använda kort
    bygg_docka.py            dockorna med MPFB: Danilo, Frasse, tomasz_matt och personerna i personer/
    bygg_stol.py             stolen, skalad till måtten; meshy_stol.py beställer råfilen (betalt)
    qc_render.py             kontrollbilder genom de fasta kamerorna
  verktyg/                   bryggan mot blackjack-dealers docka, inspektion, kontrollbilder, mat_figur.py
  gemensamt/                 delad kod: standard.py, riggverktyg.py (spelet ↔ Blender), sokvagar.py; standardmatt.py
                             och blenderstudio.py hör till Version 1
  metod/                     grundfunktioner för mesh och GLB
  ny_dealer.py               en ny dealer ur bilder, en rad
  personer/<namn>.json       en persons mått ur bilderna, bara tal (i Git)
  steg/01-referenser … 08-film   Version 1, ett skript per steg (VAGAR.md)
  steg/09-ansikte/, 12-ny-yta/, 13-form-ur-figur/, 14-dockans-hander/   prov, se nedan
  steg/15-matt-ur-bilder/    en persons mått ur sina bilder (ny_dealer.py steg 1)
  STARTA avatar.cmd, Auto avatar.cmd, starta_avatar.ps1, auto_avatar.py   startar Version 1
  input/<namn>/, output/<namn>/   bilderna av en person; allt en körning skapar
  assets/, qc/               det som byggs och laddas ned, och kontrollbilderna (inte i Git)
  .env, .venv/               nycklar (kopiera från .env.example) och Python-miljön (requirements.txt)
```

Tillfälligt arbete ligger i `../slask/avatar-auto-pipeline/<uppgift>/` (spelets mått som JSON i `matt/`,
byggrapporter i `bygge/`); verktygen skapar mapparna själva.

## Standardscenen och dockorna

Kräver Blender 5.3 (`blender` i PATH, `BLENDER_EXE` eller sin vanliga installationsmapp), tillägget MPFB 2 för dockorna
och Node 24 för måtten. Allt körs från den här mappen, alltid i en egen Blender utan fönster (`-b`).

```text
.\.venv\Scripts\python.exe scen/gen_standard.py                                                     måtten ur spelet
blender -b --factory-startup --python-exit-code 1 --python scen/bygg_bord.py                       livebordet (standardbord_live.*)
blender -b --factory-startup --python-exit-code 1 --python scen/bygg_bord.py -- --med-bricka       samma bord med vår markerbricka (standardbord_live_bricka.*)
blender -b --python-exit-code 1 --python scen/bygg_docka.py -- --kon <docka>                       en docka (MPFB, därför utan --factory-startup)
blender -b --factory-startup --python-exit-code 1 --python scen/bygg_stol.py                       stolen
```

- Livebordet är filten (en halvcirkel), rullen runt den och hyllan bakom kanten, skon, lådan, insatsmärkena och
  kortplatserna i vårt utseende, utan markerbricka. Talen står i spelets kod och kommer hit genom `standard.yaml`;
  ändras ett mått där körs `gen_standard.py` om och det som beror på det byggs om.
- `--kon` tar `danilo`, `frasse`, `tomasz_matt` eller en person i `personer/` (som `kenji`); utan `--kon` säger skriptet
  vilka dockor som finns. `--namn N` skriver `standarddocka_<docka>_N.*` i stället för de modeller som används.
  `--kon man` bygger grunden bara som jämförelse för `verktyg/mat_figur.py`.
- Danilo och Frasse med kroppen ur filmen (på prov, 2026-11-28): `../live-bj/verktyg/kroppen.py` mäter dealrarnas
  kroppar ur livebordets film till `../live-bj/data/kroppar.json` (hur står i `../live-bj/README.md`), och
  `bygg_docka.py -- --kon danilo --namn film --matt ../live-bj/data/kroppar.json` bygger en provdocka med de måtten över
  dockans egna (`standarddocka_danilo_film.*`); dockan som används står kvar. En provdocka får dra MPFB:s reglage till
  dubbla utslaget (`VIKT_MAX`), eftersom axlarna ur filmen är smalare än reglagets minsta.
- En docka efter en persons figur (Tomasz): figuren ur Version 1 och mannen mäts på samma sätt, och det som skiljer dem
  mer än mätningens osäkerhet skrivs av i `MATT` i `bygg_docka.py` (`MATT['tomasz_matt']`):

  ```text
  blender -b --factory-startup --python verktyg/mat_figur.py -- <ut.json> tomasz=assets/docka/standarddocka_tomasz.glb man=assets/docka/standarddocka_man.glb --ogon tomasz=<höger x,y,z>,<vänster x,y,z>
  blender -b --python-exit-code 1 --python scen/bygg_docka.py -- --kon tomasz_matt
  ```

Det som byggs hamnar i `assets/` och går inte in i Git. Tre saker där kan inte göras om med ett kommando och måste
finnas på datorn innan bordet och stolen byggs (licenserna i `assets/bord/LICENSER.md`):

| Filer | Varifrån |
| --- | --- |
| `assets/bord/texturer/` (filt, trä, läder) | Poly Haven, CC0. Adresserna står i `assets/bord/texturer/kallor.json`. |
| `assets/bord/kort/` (52 kort, baksidan, kortatlasen) | Wikimedia Commons, CC0. Adresserna står i `assets/bord/kort/kallor.json`. |
| `assets/meshy/stol_meshy_ra.glb` | Meshy, betald (30 krediter 2026-11-25, kvittot i `assets/meshy/meshy-logg.json`). |

## Kontroll

Bilder genom de fasta kamerorna (`film` är livebordets kamera), och en textdump av en modell som en agent kan läsa:

```text
blender -b --factory-startup --python-exit-code 1 --python scen/qc_render.py -- --bord assets/bord/standardbord_live.blend --kameror topp film --ut qc --tagg bord
blender -b --factory-startup --python-exit-code 1 --python scen/qc_render.py -- --bord assets/bord/standardbord_live.blend --docka assets/docka/standarddocka_danilo.blend --extra assets/stol/dealerstol.blend --action sitt_vila --bildruta 1 --kameror film hel --tagg docka_danilo
blender -b --python-exit-code 1 --python verktyg/inspektera.py -- assets/docka/standarddocka_danilo.glb
```

| Verktyg (vanlig Python, Pillow och numpy) | Vad det visar |
| --- | --- |
| `verktyg/qc_kontroll_film.py <render.png> <ut.png>` | Spelets egna bildpunkter för kort och sko över en rendering: de ska ligga mitt i Blenders kort. |
| `verktyg/qc_topp_matt.py qc/bord_topp.png qc/bord_topp_matt.png` | Måtten ritade på vyn uppifrån. |
| `verktyg/qc_kort_matt.py` | Kortens verkliga mått i scenen (först i Blender, sedan på bilden; se filens huvud). |
| `verktyg/qc_sida_vid_sida.py` | En rörelse ur blackjack-dealers docka bredvid samma rörelse på standarddockan. |
| `verktyg/qc_ansikte.py` | Ansiktets uttryck. |

## Rörelser

Rörelseschemat står i `../standarddocka/rorelsekatalog.json`, och rörelserna själva (lyfta ur filmen) i
`../blackjack-dealer/dealer3d/data/`. Bryggan för en rörelse till en Blender-Action på dockans skelett och tillbaka:

```text
blender -b assets/docka/standarddocka_danilo.blend --python-exit-code 1 --python verktyg/dealer3d_till_blender.py -- --in <rörelse.json> [--namn NAMN] [--spara fil.blend] [--naturlig-hand]
blender -b <fil.blend> --python-exit-code 1 --python verktyg/blender_till_dealer3d.py -- --action NAMN --ut ut.json
```

## En ny dealer ur bilder

Gratis och lokalt; Kenji var den första och Amara den andra. Personens tre bilder i `input/<person>/` (`1-portratt`,
`2-helfigur`, `3-halvfigur`):

```text
..\blackjack-dealer\tools\python\.venv\Scripts\python.exe -I ny_dealer.py <person> [--stil kameran|bordet] [--utseende "<på engelska>"] [--prov <provmapp>] [--aleph] [--ankarklipp]
```

Stegen (`--steg 1-6`; `--lage` säger bara vad som finns och vad som saknas): 1 måtten ur bilderna (steg 15: SAM 3D Body
och MediaPipe) till `personer/<person>.json`; 2 dockan, byggd på dockan vars rörelser personen spelar (Danilos för
`kameran`, Frasses för `bordet`), med bara det som skiljer mer än mätningens osäkerhet; 3 dockan skriven i
`../blackjack-dealer/dealer3d/src/persondockor.ts`, så att den är med i editorn och verktygen; 4 de lyfta rörelserna och
kontrollen; 5 givens dockfilm genom livebordets kamera och rutorna ur den; 6 anropen hos Runway, färdiga men inte lagda,
med kostnaden (`anrop/kostnad.json`). `--ankarklipp` gör given som tre klipp mellan rörelseschemats ankare, med steg 7
som efterarbete, och `--omgang v2` lägger en ny omgång bredvid den förra. Hela gången, de betalda anropen och
efterarbetet står i skillen `ny-dealer` och i skriptets huvud.

Skalan är SAM:s egen kroppsform, eftersom en framställd bild inte har något av känd storlek; felet mot ett facit och
varför handen inte tas in står i `steg/15-matt-ur-bilder/personmatt.py`.

## Proven (steg 09, 12, 13 och 14)

Fyra steg som är på prov. Hur och varför, och hela kedjan av kommandon, står i varje skripts huvud. Steg 09, 12 och 14
använder ansiktets eller handens punkter ur MediaPipe-miljön i `../blackjack-dealer/tools/python/.venv`, och det som
renderar körs under låset `../slask/blackjack-dealer/gpu-och-headless.lock`.

- **09, ett ansikte som rör sig** (gratis): en färdig dealer-GLB får standarddockans 30 ansiktsformer, ögonleder med en
  glob per öga och käkleden `jaw`, med hans eget huvud, UV och texturer kvar.

  ```text
  blender -b --factory-startup --python-exit-code 1 --python steg/09-ansikte/ansikte.py -- assets/docka/standarddocka_tomasz.glb assets/docka/standarddocka_tomasz_ansikte.glb
  ```

- **12, en ny yta på vår docka** (betalt, 10 Meshy-krediter; `--dry-run` är gratis): Meshy målar personens utseende ur
  1–4 vyer på en kopia av dockans yta, närbilden av ansiktet läggs på ansiktsdelen (`narbild.py`), och bilden läggs på
  dockan själv (`yta.py lagg`), så att skelettet, fingrarna och ansiktsformerna står orörda.

  ```text
  .venv\Scripts\python.exe -I steg/12-ny-yta/meshy_ny_yta.py assets/docka/standarddocka_danilo.glb output/<namn>/12-ny-yta --vy <fram.png> --vy <bak.png> [--dry-run]
  ```

- **13, dockans huvud i personens form** (gratis): punkterna i tre vyer, en mjuk passning och en försiktig dragning mot
  hans yta, med ansiktsformerna, lederna och ytkartan kvar. Provet är `tomasz-dockan-pa-hans-matt-20261127`.

  ```text
  blender -b --python-exit-code 1 --python steg/13-form-ur-figur/form.py -- assets/docka/standarddocka_tomasz_matt.blend assets/docka/standarddocka_tomasz.glb assets/docka/standarddocka_tomasz_matt_form.glb
  ```

- **14, dockans händer i personens ärm** (gratis): en färdig dealer behåller kropp, huvud och kläder men får dockans
  händer med deras fingerleder och vikter, insatta i skjortans manschett, med huden ur hans egen hand (först
  `hudbilder.py`). Den betalda vägen för huden (10 Meshy-krediter, `--dry-run` gratis) målar en kopia av dockans högra
  hand efter förlagan (`meshy_kopia.py`).

  ```text
  blender -b --factory-startup --python-exit-code 1 --python steg/14-dockans-hander/dockans_hander.py -- assets/docka/standarddocka_tomasz.glb assets/docka/standarddocka_danilo.glb assets/docka/standarddocka_tomasz_dockhander.glb --hud output/tomasz/14-dockans-hander
  ```

## En dealer från foton (Version 1)

1. En gång: kopiera `.env.example` till `.env` och fyll i `OPENAI_API_KEY` och `MESHY_API_KEY`.
2. Lägg 1–8 foton av samma person i `input\<namn>\`. Skjortan ska vara tydligt icke-hudfärgad; förval är mörkblå skjorta
   och mörka byxor (`--outfit` för annat).
3. Dubbelklicka på `STARTA avatar.cmd` (eller kör `.\starta_avatar.ps1 -Name <namn>`).

```powershell
.\.venv\Scripts\python.exe auto_avatar.py --name <namn> --dry-run
```

`--dry-run` är en gratis kontroll utan OpenAI- eller Meshy-anrop. Andra flaggor: `--from-step N`, `--only-step N`,
`--no-video`, `--refs-only`, `--samples 24`. En körning kostar Meshy-krediter (cirka 95) och OpenAI-bilder. Betalda jobb
sparar ett kvitto i stegmappen (`referenser.json`, `korning.json`, `riggjobb.json`), så en omstart med `--from-step 5`
eller `--only-step 7` betalar inte två gånger; radera dem inte.

| Fil i `output/<namn>/` | Betydelse |
| --- | --- |
| `06-dealer-export\<namn>-dealer-apose.glb` | Den riggade avataren (skelett och kropp, A-pose). |
| `08-film\<namn>-apose-med-rorelse.glb` | Samma avatar med bord, pall, kort och bakad sittande rörelse. |
| `07-qc\resultat-oversikt.png` | Kvalitetsblad (helkropp, ansikte, handleder). |
| `08-film\<namn>-ror-sig.mp4` | Rörelsefilmen, när den har renderats klart. |
