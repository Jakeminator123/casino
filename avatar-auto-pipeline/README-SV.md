# Avatar Auto-Pipeline

Två saker i en mapp, med samma skelett i botten:

1. **Standarddockan och standardscenen** i Blender: dockorna Danilo och Frasse på samma skelett, vid livebordet (bordet,
   kameran, korten och skon mätta på filmen av ett riktigt livebord). Det är grunden som varje dealers docka i
   `blackjack-dealer` anpassas från.
2. **En dealer från foton**: från 1–8 foton av en person till en riggad 3D-dealer i A-pose, med kvalitetsbilder.

Reglerna står i `AGENTS.md`. Skelettet, lederna, bryggan mot `blackjack-dealer` och hur en dealer anpassas står i
`new_docka.md`.

## Mappar

```
avatar-auto-pipeline/
  AGENTS.md                  regler
  README-SV.md               den här filen: mappar och körning
  new_docka.md               standarddockan: skelett, leder, bryggan, anpassning, val och brister
  vagar.json                 vägarna för att bygga en docka, del för del, och reglerna för vad som går ihop (källan för guiden; ändras för hand)
  vagar.py, VAGAR.md         vagar.py kontrollerar vagar.json mot koden och skriver VAGAR.md ur den (--kolla, --val); VAGAR.md ändras aldrig för hand
  scen/                      standardscenen
    standard.yaml            alla mått, skrivna ur spelets kod (ändras aldrig för hand)
    gen_standard.py          skriver standard.yaml; las_spelet.ts läser spelets kod åt den
    bygg_bord.py             livebordet, korten, skon och lådan för använda kort ur måtten
    bygg_docka.py            grunddockorna (kvinna och man) och på mannens grund dockorna med mätta mått (Danilo, Frasse, Tomasz, och personerna i personer/) med MPFB
    bygg_stol.py             stolen, skalad till måtten; meshy_stol.py beställer råfilen (betalt)
    qc_render.py             kontrollbilder genom de fasta kamerorna
  verktyg/                   bryggan mot blackjack-dealers docka, inspektion, kontrollbilder och mätning av en figur (mat_figur.py)
  rorelser/katalog.yaml      rörelsekatalogen: vad som ska finnas och hur långt det har kommit
  gemensamt/                 delad kod: standard.py läser standard.yaml, riggverktyg.py räknar om mellan spelet och
                             Blender, sokvagar.py hittar projektet och slasken; standardmatt.py (kroppens andelar)
                             och blenderstudio.py hör till vägen från foton
  assets/                    det som byggs och laddas ned: bord, dockor, stol (inte i Git, se nedan)
  qc/                        kontrollbilder och inspektionsdumpar (inte i Git)

  STARTA avatar.cmd          en dealer från foton: enklaste sättet att starta
  Auto avatar.cmd            dra foton till den här filen
  starta_avatar.ps1, auto_avatar.py   styr stegen
  steg/01-referenser … 08-film       ett skript per steg; 09-ansikte ger en färdig dealer ett rörligt ansikte (prov)
  steg/10-kropp-i-ett-stycke/        en kropp ur Runway med egna händer blir en docka, gratis (prov, körs för hand)
  steg/11-pa-dockans-grund/          en färdig dealer sätts på Danilos eller Frasses skelett, led för led (prov)
  steg/12-ny-yta/                    vår egen docka får en persons utseende som ny yta hos Meshy (prov, betalt)
  steg/13-form-ur-figur/             dockans eget huvud i personens form, ur hans figur, gratis (prov)
  steg/14-dockans-hander/            en färdig dealer får dockans händer insatta i sin ärm, gratis (prov)
  steg/15-matt-ur-bilder/            en persons mått ur sina bilder: SAM 3D Body och MediaPipe, gratis (ny_dealer.py steg 1)
  ny_dealer.py               en ny dealer ur bilder, en rad: måtten, dockan, systemet, rörelserna, dockfilmen och de betalda anropen
  personer/<namn>.json       en persons mått ur bilderna, bara tal (i Git); dockan byggs ur den
  metod/                     grundfunktioner för mesh och GLB
  input/<namn>/              dina foton
  output/<namn>/             allt som en körning skapar
  .env, .venv/               nycklar (kopiera från .env.example) och Python-miljön
```

Tillfälligt arbete ligger i casino-repots slask, `../slask/avatar-auto-pipeline/<uppgift>/`: spelets mått som JSON
(`matt/`), byggrapporter (`bygge/`) och rörelseprov (`rorelser/`). Verktygen skapar mapparna själva.

## Standardscenen och standarddockan

Kräver Blender 5.3 (`blender` i PATH, eller hela sökvägen till programmet), tillägget MPFB 2 i Blender för
dockorna och Node 24 för måtten. Allt körs från den här mappen.

```text
.\.venv\Scripts\python.exe scen/gen_standard.py                                                     måtten ur spelet
blender -b --factory-startup --python-exit-code 1 --python scen/bygg_bord.py                       livebordet (standardbord_live.*): dess filt (halvcirkel, radie 0,73 m), rullen runt filten och hyllan bakom kanten, sko, låda, insatsmärken och kortplatser i vårt utseende, utan markerbricka; talen står i spelets kod (LIVE i ../blackjack-dealer/src/table-live.ts) och kommer hit genom standard.yaml
blender -b --factory-startup --python-exit-code 1 --python scen/bygg_bord.py -- --med-bricka       samma bord med vår markerbricka vid kanten, ett tillägg (standardbord_live_bricka.*)
blender -b --python-exit-code 1 --python scen/bygg_docka.py                                        dockorna (MPFB, därför utan --factory-startup) med människans mått, utan val kvinnan och mannen; -- --kon <docka> bygger en (man, kvinna, danilo, frasse, tomasz_matt, eller en person i personer/ som kenji), -- --namn N skriver standarddocka_<docka>_N.* i stället för de modeller som används
blender -b --factory-startup --python-exit-code 1 --python scen/bygg_stol.py                       stolen
```

Måtten har en källa: spelets kod i `../blackjack-dealer`. Ändras ett mått där körs `gen_standard.py` om och det
som beror på måttet byggs om.

Det som byggs hamnar i `assets/` och går inte in i Git (modeller och bilder). Tre saker där kan ännu inte göras om
med ett kommando och måste finnas på datorn innan bordet och stolen byggs:

| Filer | Varifrån |
| --- | --- |
| `assets/bord/texturer/` (filt, trä, läder) | Poly Haven, CC0. Adresserna står i `assets/bord/texturer/kallor.json`. |
| `assets/bord/kort/` (52 kort, baksidan, kortatlasen) | Wikimedia Commons, CC0. Adresserna står i `assets/bord/kort/kallor.json`. |
| `assets/meshy/stol_meshy_ra.glb` | Meshy, betald (30 krediter 2026-11-25, kvittot i `assets/meshy/meshy-logg.json`). |

Licenserna står i `assets/bord/LICENSER.md`.

## Kontroll

Bilder genom de fasta kamerorna (`film` är livebordets kamera), och en textdump av en modell som en agent kan läsa:

```text
blender -b --factory-startup --python-exit-code 1 --python scen/qc_render.py -- --bord assets/bord/standardbord_live.blend --kameror topp film --ut qc --tagg bord
blender -b --factory-startup --python-exit-code 1 --python scen/qc_render.py -- --bord assets/bord/standardbord_live.blend --docka assets/docka/standarddocka_danilo.blend --extra assets/stol/dealerstol.blend --action sitt_vila --bildruta 1 --kameror film hel --tagg docka_danilo
blender -b --python-exit-code 1 --python verktyg/inspektera.py -- assets/docka/standarddocka_danilo.glb
```

Vanlig Python (Pillow och numpy):

| Verktyg | Vad det visar |
| --- | --- |
| `verktyg/qc_kontroll_film.py <render.png> <ut.png>` | Spelets egna bildpunkter för kort och sko över en rendering: de ska ligga mitt i Blenders kort. |
| `verktyg/qc_topp_matt.py qc/bord_topp.png qc/bord_topp_matt.png` | Måtten ritade på vyn uppifrån. |
| `verktyg/qc_kort_matt.py` | Kortens verkliga mått i scenen (först i Blender, sedan på bilden; se filens huvud). |
| `verktyg/qc_sida_vid_sida.py` | En rörelse ur blackjack-dealers docka bredvid samma rörelse på standarddockan. |
| `verktyg/qc_ansikte.py` | Ansiktets uttryck. |

Rendera alltid i en egen Blender utan fönster (`-b`), aldrig i ett fönster som redan är öppet.

## Rörelser

`rorelser/katalog.yaml` är listan över rörelser som ska finnas (id, namn, längd, plats, status). En rörelse är en
Action på dockans skelett, så samma rörelse fungerar på varje docka som delar skelettet. Rörelser förs mellan
`blackjack-dealer`s docka och Blender med bryggan:

```text
blender -b assets/docka/standarddocka_danilo.blend --python-exit-code 1 --python verktyg/dealer3d_till_blender.py -- --in <rörelse.json> [--namn NAMN] [--spara fil.blend] [--naturlig-hand]
blender -b <fil.blend> --python-exit-code 1 --python verktyg/blender_till_dealer3d.py -- --action NAMN --ut ut.json
```

## En dealer från foton

1. En gång: kopiera `.env.example` till `.env` och fyll i `OPENAI_API_KEY` och `MESHY_API_KEY`. Nycklarna skrivs aldrig ut.
2. Lägg 1–8 foton av samma person i `input\<namn>\`. Skjortan ska vara tydligt icke-hudfärgad. Standard är mörkblå skjorta och mörka byxor (`--outfit` om du vill annat).
3. Dubbelklicka på `STARTA avatar.cmd` (eller kör `.\starta_avatar.ps1 -Name <namn>`).

Gratis kontroll, utan OpenAI- eller Meshy-anrop:

```powershell
.\.venv\Scripts\python.exe auto_avatar.py --name <namn> --dry-run
```

Andra vanliga flaggor: `--from-step N`, `--only-step N`, `--no-video`, `--refs-only`, `--samples 24`.

Blender hittas automatiskt i sin vanliga installationsmapp, i PATH, eller via miljövariabeln `BLENDER_EXE`. En körning kostar Meshy-krediter (cirka 95) plus OpenAI-bilder; starta ingen betald körning utan att du vill det. Betalda jobb sparar kvitton, så en omstart betalar inte två gånger.

Slutfilerna ligger i `output/<namn>/`:

| Fil | Betydelse |
| --- | --- |
| `06-dealer-export\<namn>-dealer-apose.glb` | Den riggade avataren (skelett + kropp, A-pose). Det här är dockan som kan användas vidare. |
| `08-film\<namn>-apose-med-rorelse.glb` | Samma avatar plus bord, pall, kort och bakad sittande rörelse. Öppnas direkt i Blender. |
| `07-qc\resultat-oversikt.png` | Kvalitetsblad (helkropp, ansikte, handleder). |
| `08-film\<namn>-ror-sig.mp4` | Rörelsefilmen, när den har renderats klart. |

Dealern från foton i dag är Tomasz (2026-11-26, steg 1–7 utan film) i `output/tomasz/`; hans dealer-GLB och kontrollblad väntar på Jakobs dom i `../slask/avatar-auto-pipeline/granska/tomasz/`.

Ett ansikte som rör sig (steg 09, på prov sedan 2026-11-27, gratis och lokalt): en färdig dealer-GLB får standarddockans
30 ansiktsformer med samma namn, ögonleder (`eye.L`, `eye.R`) med en glob per öga som visar hans egen målade ögonyta, och
käkleden `jaw`; hans huvud, UV och texturer står kvar, och munnen skärs upp med en mörk munhåla bakom. Hur det görs står
i skriptets huvud. Kräver MediaPipe-miljön i `../blackjack-dealer/tools/python/.venv` (ansiktets punkter):

```text
blender -b --factory-startup --python-exit-code 1 --python steg/09-ansikte/ansikte.py -- assets/docka/standarddocka_tomasz.glb assets/docka/standarddocka_tomasz_ansikte.glb
```

En kropp i ett stycke ur Runway (steg 10, på prov sedan 2026-11-27, gratis och lokalt): Hunyuan-kroppen får personens
Meshy-huvud och sina egna händer, lånar skelettet av en färdig dealer och exporteras med steg 6. Huvudet och skelettet
kommer från en körning genom steg 1–6; kroppen beställs för hand hos Runway. Varje skripts huvud säger hur det gör:

```text
.venv\Scripts\python.exe -B steg/10-kropp-i-ett-stycke/montera_huvud.py kropp.glb output/<namn>/03-montering/delar/huvud.glb <arb>/med-huvud.glb --hudref output/<namn>/01-referenser/head-ref.png
blender -b --python steg/03-montering/forenkla_4k.py -- <arb>/med-huvud.glb <arb>/latt.glb 180000
blender -b --python-exit-code 1 --python steg/10-kropp-i-ett-stycke/rigga.py -- <arb>/latt.glb assets/docka/standarddocka_<namn>.glb <arb>/avatar-rigg.glb
blender -b --python-exit-code 1 --python steg/06-dealer-export/exportera_dealer.py -- <arb>/avatar-rigg.glb assets/docka/standarddocka_<namn>_hunyuan.glb
blender -b --python-exit-code 1 --python steg/10-kropp-i-ett-stycke/prova_hander.py -- assets/docka/standarddocka_<namn>_hunyuan.glb <arb>/prov.json
```

`<arb>` är en arbetsmapp i slasken (`../slask/avatar-auto-pipeline/<uppgift>/`); `rigga.py` skriver också steg 5:s
fingerprov (`hudvikter.json`) bredvid riggen.

En dealer på en grunddockas skelett (steg 11, på prov sedan 2026-11-27, gratis och lokalt): en dealer byggs på den docka
vars rörelser han ska spela. Hans yta (huvud, hud, kläder, ansiktsformer) formas om så att den sitter på Danilos eller
Frasses skelett, och skelettet byts mot dockans: samma leder, armar, axlar och fingerlängder. Då spelar han dockans lyfta
rörelser som de är, och editorn skalar honom inte. Hans fingrar behåller sin egen krökning i vila; huvudet flyttas utan
att formas om. Hur det görs står i skriptets huvud; rapporten (`<ut>.json`) säger hur mycket ytan sträcktes, per kroppsdel:

```text
blender -b --python-exit-code 1 --python steg/11-pa-dockans-grund/pa_grund.py -- assets/docka/standarddocka_tomasz_ansikte.glb assets/docka/standarddocka_danilo.glb assets/docka/standarddocka_tomasz_danilo.glb
```

En ny yta på vår egen docka (steg 12, på prov sedan 2026-11-27, betalt: 10 Meshy-krediter): Meshy målar personens
utseende ur 1–4 vyer (framifrån först) på en kopia av dockans yta och behåller dockans egen ytkarta; närbilden av
ansiktet läggs sedan på ansiktsdelen, inpassad efter ansiktets punkter (gratis, MediaPipe-miljön som steg 09), och
bilden läggs på dockan själv, så att skelettet, fingrarna och ansiktsformerna står orörda. Varför en kopia och inte hela
dockan står i skriptens huvud; `--dry-run` gör kopian och visar vad som skickas och vad det kostar, utan att anropa Meshy:

```text
.venv\Scripts\python.exe -I steg/12-ny-yta/meshy_ny_yta.py assets/docka/standarddocka_danilo.glb output/<namn>/12-ny-yta --vy <fram.png> --vy <bak.png> [--dry-run]
blender -b --factory-startup --python-exit-code 1 --python steg/12-ny-yta/yta.py -- lagg assets/docka/standarddocka_danilo.glb output/<namn>/12-ny-yta/pbr/0-base_color.png <arb>/meshy-ansikte.glb
blender -b --factory-startup --python-exit-code 1 --python steg/12-ny-yta/narbild.py -- <arb>/meshy-ansikte.glb output/<namn>/12-ny-yta/pbr/0-base_color.png output/<namn>/01-referenser/head-ref.png output/<namn>/12-ny-yta/bas-med-narbild.png
blender -b --factory-startup --python-exit-code 1 --python steg/12-ny-yta/yta.py -- lagg assets/docka/standarddocka_danilo.glb output/<namn>/12-ny-yta/bas-med-narbild.png assets/docka/standarddocka_danilo_<namn>_yta.glb
```

En ny dealer ur bilder, en rad (2026-11-27, gratis och lokalt; Kenji var den första): personens tre bilder i `input/<person>/`
blir en docka vid livebordet som spelar de lyfta rörelserna, och de betalda anropen för hans film står färdiga:

```text
..\blackjack-dealer\tools\python\.venv\Scripts\python.exe -I ny_dealer.py <person> [--stil kameran|bordet] [--utseende "<på engelska>"] [--prov <provmapp>]
```

Stegen (`--steg 1-6`, `--lage` säger bara vad som finns och vad som saknas): 1 måtten ur bilderna (steg 15: SAM 3D Body på
hel- och halvfiguren, MediaPipes kropp, händer och ansiktsnät) till `personer/<person>.json`, bara tal, med hur varje tal är
mätt och hur säkert det är; 2 dockan, byggd på den docka vars rörelser personen spelar (Danilos för `kameran`, Frasses för
`bordet`) med bara det som skiljer mer än mätningens osäkerhet (`scen/bygg_docka.py --kon <docka>` läser personfilen
själv); 3 dockan mätt på sin modell och skriven i `../blackjack-dealer/dealer3d/src/persondockor.ts`, så att den är med i
`LIVE_DOLLS`, i editorns dockor och i verktygen; 4 de lyfta rörelserna i stilen på dockan och kontrollen
(`lyft-till-docka.ts --docka`, `lyft-kolla.ts`); 5 givens dockfilm genom livebordets kamera i nyckelutseendet och
rutorna ur den vid rörelsens egna händelser (aldrig två där dockan står stilla i samma ställning), med kortets höjd,
lutning och fingrets läge på det ur rörelsens tal; 6 anropen hos Runway (stillbilderna och Kling 4; Aleph 2 med `--aleph`),
färdiga men inte lagda, med kostnaden (`anrop/kostnad.json`). `--omgang v2` lägger en ny omgång bredvid den förra.
Skalan är SAM:s egen kroppsform: en framställd bild har inget av känd storlek. Felet mot ett facit (Tomasz bilder mot hans
mätta figur: armarna inom 1 cm, huvudet inom 0,5, axlarna 2,2 och bålen 2,4) är en undre gräns för osäkerheten
(`steg/15-matt-ur-bilder/personmatt.py`). Handen tas inte in: SAM:s hand är 5 cm kortare än dockans mätt på samma sätt.

En docka efter en persons mått (2026-11-27, gratis och lokalt): personens figur ur Version 1 och mannen mäts på samma
sätt (lederna, huden i snitt, handen och huvudet), och det som skiljer dem mer än mätningens osäkerhet skrivs av i `MATT`
i `scen/bygg_docka.py`, med kläder och hår avdragna (Tomasz: `MATT['tomasz_matt']`). Ögonens mitt för en figur utan
ögonleder står i steg 09:s rapport (`<ut>.json`, `ogon.*.mitt`). Sedan dockans eget huvud i hans ansiktes form (steg 13,
på prov): punkterna i tre vyer, en mjuk passning och en försiktig dragning mot hans yta, med ansiktsformerna, lederna och
ytkartan kvar; hur och varför står i skriptets huvud. Steg 13 renderar och tar låset `../slask/blackjack-dealer/gpu-och-headless.lock` först:

```text
blender -b --factory-startup --python verktyg/mat_figur.py -- <ut.json> tomasz=assets/docka/standarddocka_tomasz.glb man=assets/docka/standarddocka_man.glb --ogon tomasz=<höger x,y,z>,<vänster x,y,z>
blender -b --python-exit-code 1 --python scen/bygg_docka.py -- --kon tomasz_matt
blender -b --python-exit-code 1 --python steg/13-form-ur-figur/form.py -- assets/docka/standarddocka_tomasz_matt.blend assets/docka/standarddocka_tomasz.glb assets/docka/standarddocka_tomasz_matt_form.glb
```

Provet är `tomasz-dockan-pa-hans-matt-20261127`; hans yta på huvudet i hans form ligger i provets `original/`.

Dockans händer i personens ärm (steg 14, på prov sedan 2026-11-27, gratis och lokalt): en färdig dealer behåller sin
kropp, sitt huvud och sina kläder men får dockans händer, med deras egna fingerleder och vikter, insatta i skjortans
manschett som en hand i en ärm. Hans egen hand och kroppens hud ur manschetten tas bort med ett rakt snitt där tyget
slutar, handleden flyttas till ärmens mitt, ärmen trycks ihop längs underarmen tills manschetten slutar strax innanför
leden, dockans hand sätts in med en bit underarm inne i ärmen, skalad till hans hand, och manschetten stängs mot
handleden med en stel ring. Huden och formen tas ur hans egen hand (`hudbilder.py`): handryggen ur förlagan från steg 1,
handflatan ur den förra handens bild, lagda på dockans hand inpassade efter handens 21 punkter (MediaPipe, samma miljö
som steg 09) och jämkade till ansiktets ton; handflatans bredd och fingrarnas tjocklek mäts i förlagan mot dockans. Hur
det görs och varför står i skriptens huvud; rapporten (`<ut>.json`) säger snittet, flytten, formen, huden och kontrollen
(handleden böjd och vriden, hörn genom tyget, manschettens töjning). Bakningen och bilderna renderar, så de körs under det
delade låset:

```text
blender -b --factory-startup --python-exit-code 1 --python steg/14-dockans-hander/hudbilder.py -- assets/docka/standarddocka_tomasz.glb assets/docka/standarddocka_danilo.glb output/tomasz/01-referenser/hands-ref.png output/tomasz/14-dockans-hander
blender -b --factory-startup --python-exit-code 1 --python steg/14-dockans-hander/dockans_hander.py -- assets/docka/standarddocka_tomasz.glb assets/docka/standarddocka_danilo.glb assets/docka/standarddocka_tomasz_dockhander.glb --hud output/tomasz/14-dockans-hander
```

Den betalda vägen för huden (10 Meshy-krediter) målar en kopia av bara dockans högra hand efter förlagan, med dockans
egen karta, och lägger bilden på båda händerna (`--meshy-bild`); `--dry-run` är gratis:

```text
blender -b --factory-startup --python-exit-code 1 --python steg/14-dockans-hander/meshy_kopia.py -- assets/docka/standarddocka_danilo.glb output/tomasz/01-referenser/hands-ref.png output/tomasz/14-dockans-hander/meshy/kopia.glb
.venv\Scripts\python.exe -I steg/12-ny-yta/meshy_ny_yta.py assets/docka/standarddocka_danilo.glb output/tomasz/14-dockans-hander/meshy --kopia output/tomasz/14-dockans-hander/meshy/kopia.glb --vy output/tomasz/01-referenser/hands-ref.png [--dry-run]
```

Om något avbryts kan du fortsätta utan att betala om: `--from-step 5` eller `--only-step 7`. Hoppa över filmen med `--no-video`. Betalda jobb sparar ett kvitto i stegmappen: `referenser.json`, `korning.json` och `riggjobb.json`. En omstart använder samma kvitto. Radera dem inte.
