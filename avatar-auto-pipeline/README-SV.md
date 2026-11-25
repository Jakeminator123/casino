# Avatar Auto-Pipeline

Från några foton av en person till en riggad 3D-dealer i A-pose, med kvalitetsbilder och en kort rörelsefilm.

## Mappstruktur

```
avatar-auto-pipeline/
  STARTA avatar.cmd          ← enklaste sättet att starta
  Auto avatar.cmd            ← dra foton till den här filen
  starta_avatar.ps1
  auto_avatar.py             ← styr alla steg
  README-SV.md
  .env                       ← API-nycklar (kopiera från .env.example)
  .venv/                     ← Python-miljön
  input/<namn>/              ← dina foton
  output/<namn>/             ← allt som en körning skapar
  steg/
    01-referenser/           apose_referenser.py
    02-meshy-delar/          meshy_enbild.py
    03-montering/            montera.py, montera_apose.py, clean_kropp_chest.py, …
    04-rigg/                 meshy_rigg.py
    05-fingrar-handleder/    fixa_handleder.py, finger-skript
    06-dealer-export/        exportera_dealer.py
    07-qc/                   qc_oversikt.py
    08-film/                 animera_dealer.py
  gemensamt/                 delad kod (mått, sökvägar, Blender-studio)
  metod/                     grundfunktioner för mesh och GLB
```

Foton lägger du i `input/<namn>/`. Resultatet hamnar i `output/<namn>/`, uppdelat i samma stegnummer.

## Hur du kör

1. En gång: kopiera `.env.example` till `.env` och fyll i `OPENAI_API_KEY` och `MESHY_API_KEY`. Nycklarna skrivs aldrig ut.
2. Lägg 1–8 foton av samma person i t.ex. `input\rosalina\`.
3. Dubbelklicka på `STARTA avatar.cmd` (eller kör `.\starta_avatar.ps1 -Name rosalina`).

Gratis kontroll, utan OpenAI- eller Meshy-anrop:

```powershell
.\.venv\Scripts\python.exe auto_avatar.py --name rosalina --dry-run
```

Andra vanliga flaggor: `--from-step N`, `--only-step N`, `--no-video`, `--refs-only`, `--samples 24`.

Blender hittas automatiskt i `C:\Program Files\Blender Foundation\`, i PATH, eller via miljövariabeln `BLENDER_EXE`. En körning kostar Meshy-krediter (cirka 95) plus OpenAI-bilder; starta ingen betald körning utan att du vill det. Betalda jobb sparar kvitton, så en omstart betalar inte två gånger.

## Var slutfilerna hamnar

I `output/<namn>/`:

| Fil | Betydelse |
| --- | --- |
| `06-dealer-export\<namn>-dealer-apose.glb` | Den riggade avataren (skelett + kropp, A-pose). Det här är dockan som kan användas vidare. |
| `08-film\<namn>-apose-med-rorelse.glb` | Samma avatar plus bord, pall, kort och bakad sittande rörelse. Öppnas direkt i Blender. |
| `07-qc\resultat-oversikt.png` | Kvalitetsblad (helkropp, ansikte, handleder). |
| `08-film\<namn>-ror-sig.mp4` | Rörelsefilmen, när den har renderats klart. |

För Rosalina finns också `output\rosalina\08-film\rosalina-med-bord.blend`. Det är Blender-scenen med avatar och bord, utan det lösa Icosphere-objektet som tidigare kunde täcka dockan när GLB-filen öppnades. Öppna den filen i Blender om du vill titta på eller justera scenen.

## Återuppta ett steg

Om något avbryts kan du fortsätta utan att betala om: `--from-step 5` eller `--only-step 7`. Hoppa över filmen med `--no-video`.
