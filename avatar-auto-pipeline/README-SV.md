# Avatar Auto-Pipeline

Två saker i en mapp, med samma skelett i botten:

1. **Standarddockan och standardscenen** i Blender: en kvinna och en man med samma skelett, vid spelets bord, med
   spelets kamera, kort och sko. Det är grunden som varje dealers docka i `blackjack-dealer` anpassas från.
2. **En dealer från foton**: från 1–8 foton av en person till en riggad 3D-dealer i A-pose, med kvalitetsbilder.

Reglerna står i `AGENTS.md`. Skelettet, lederna, bryggan mot `blackjack-dealer` och hur en dealer anpassas står i
`new_docka.md`.

## Mappar

```
avatar-auto-pipeline/
  AGENTS.md                  regler
  README-SV.md               den här filen: mappar och körning
  new_docka.md               standarddockan: skelett, leder, bryggan, anpassning, val och brister
  scen/                      standardscenen
    standard.yaml            alla mått, skrivna ur spelets kod (ändras aldrig för hand)
    gen_standard.py          skriver standard.yaml; las_spelet.ts läser spelets kod åt den
    bygg_bord.py             bordet, korten, skon och markerlådan ur måtten
    bygg_docka.py            standarddockorna (kvinna och man) med MPFB
    bygg_stol.py             stolen, skalad till måtten; meshy_stol.py beställer råfilen (betalt)
    qc_render.py             kontrollbilder genom de fasta kamerorna
  verktyg/                   bryggan mot blackjack-dealers docka, inspektion och kontrollbilder
  rorelser/katalog.yaml      rörelsekatalogen: vad som ska finnas och hur långt det har kommit
  gemensamt/                 delad kod: standard.py läser standard.yaml, riggverktyg.py räknar om mellan spelet och
                             Blender, sokvagar.py hittar projektet och slasken; standardmatt.py (kroppens andelar)
                             och blenderstudio.py hör till vägen från foton
  assets/                    det som byggs och laddas ned: bord, dockor, stol (inte i Git, se nedan)
  qc/                        kontrollbilder och inspektionsdumpar (inte i Git)

  STARTA avatar.cmd          en dealer från foton: enklaste sättet att starta
  Auto avatar.cmd            dra foton till den här filen
  starta_avatar.ps1, auto_avatar.py   styr stegen
  steg/01-referenser … 08-film       ett skript per steg
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
blender -b --factory-startup --python-exit-code 1 --python scen/bygg_bord.py                       spelets standardbord
blender -b --factory-startup --python-exit-code 1 --python scen/bygg_bord.py -- --modell bord-02   BORD-02
blender -b --factory-startup --python-exit-code 1 --python scen/bygg_bord.py -- --kant-bak 0.15    standardbordet med dealerkanten 15 cm närmare dealern och brickan nedsänkt i bordet (egna filer, standardbord_nara.*; bordet de äldre rörelserna visas vid i ../standarddocka)
blender -b --factory-startup --python-exit-code 1 --python scen/bygg_bord.py -- --docka            standarddockans bord (standardbord_nara23.*), det dockornas egna rörelser visas vid: en halvmåne (0,95 m djup), kanten 23 cm närmare dockan och skon 8 cm längre ut och 3 cm längre fram; talen står i spelets kod (DOLL_TABLE i ../blackjack-dealer/src/table-lens.ts) och kommer hit genom standard.yaml (dockans_bord). Spelarnas kortplatser ligger där vända mot sin spelare (dockans_bord.kort_mot_spelaren: ramen och exempelkortet längs platsens riktning_mot_dealer; dealerns egna rakt). Andra former prövas med --djup, --sko-ut, --sko-fram och --namn (står i skriptets huvud). Med --kant-bak och --docka är sargen urtagen underifrån där dealern sitter, så att bordet där bara tar 5 cm under filten och låren går fria (KNAN i skriptet)
blender -b --python-exit-code 1 --python scen/bygg_docka.py                                        dockorna (MPFB, därför utan --factory-startup) med människans mått; -- --kon man|kvinna bygger en, -- --namn N skriver standarddocka_<kön>_N.* i stället för de modeller som används
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

Bilder genom de fasta kamerorna (`film` är spelets egen kamera), och en textdump av en modell som en agent kan läsa:

```text
blender -b --factory-startup --python-exit-code 1 --python scen/qc_render.py -- --kameror topp film --ut qc --tagg bord
blender -b --factory-startup --python-exit-code 1 --python scen/qc_render.py -- --docka assets/docka/standarddocka_kvinna.blend --extra assets/stol/dealerstol.blend --action sitt_vila --bildruta 1 --kameror film hel --tagg docka_kvinna
blender -b --python-exit-code 1 --python verktyg/inspektera.py -- assets/docka/standarddocka_kvinna.glb
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
blender -b assets/docka/standarddocka_kvinna.blend --python-exit-code 1 --python verktyg/dealer3d_till_blender.py -- --in <rörelse.json> [--namn NAMN] [--spara fil.blend] [--naturlig-hand]
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

Ingen dealer från foton finns i mappen i dag: provdealern Rosalina raderades 2026-11-26.

Om något avbryts kan du fortsätta utan att betala om: `--from-step 5` eller `--only-step 7`. Hoppa över filmen med `--no-video`. Betalda jobb sparar ett kvitto i stegmappen: `referenser.json`, `korning.json` och `riggjobb.json`. En omstart använder samma kvitto. Radera dem inte.
