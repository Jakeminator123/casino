# Avatar Auto-Pipeline (Laptop)

Bygger en komplett, riggad 4K dealer-GLB i A-pose + QC-bilder + rörelsefilm utifrån 3 foton av samma person.

## 1. Lägg in API-nycklar (en gång)
Pipelinen behöver två nycklar:
- `OPENAI_API_KEY` (används i steg 1 för referensbilder med `gpt-image-2`)
- `MESHY_API_KEY` (används i steg 2 och 4 för 3D-delar och riggning, totalt ~95 krediter)

Gör så här:
1. Kopiera `.env.example` till `.env` i den här mappen (`C:\Users\jakob\Desktop\casino\avatar-auto-pipeline\.env`).
2. Fyll i dina två nycklar efter `=`.
3. Spara filen. Nycklar skrivs aldrig ut i terminal eller loggar.

## 2. Lägg in 3 foton
Skapa en mapp under `input\`, t.ex. `input\rosalina\`, och lägg in exakt **3 foton** (`foto1.jpg`, `foto2.jpg`, `foto3.jpg`) av samma person (helst tydligt ansikte rakt framifrån samt en bild med överkropp).

## 3. Starta körningen
- **Enklast:** Dubbelklicka på `STARTA avatar.cmd` (öppnar PowerShell 7 med skydd mot att fönstret fryser om man klickar i det).
  - Om du trycker Enter väljs standardmappen under `input\` (t.ex. `rosalina`).
  - Du kan också köra från PowerShell: `.\starta_avatar.ps1 -Name rosalina -Samples 24`
- **Gratis torrkörning (testar foton, imports, Blender och mappar utan kostnad):**
  ```powershell
  .\.venv\Scripts\python.exe auto_avatar.py --name rosalina --dry-run
  ```

## 4. Felsökning och numrerade stegmappar
Varje körning sparar allt i `output\<namn>\` uppdelat i 8 numrerade mappar + `status.json`:

| Steg | Mapp | Innehåll & förhandsvisning | Kostnad |
| --- | --- | --- | --- |
| 1 | `01-referenser\` | `head-ref.png`, `apose-ref.png`, `hands-ref.png`, `ref-3-bilder.png`, `steg.log` | OpenAI bild |
| 2 | `02-meshy-delar\` | `huvud\`, `kropp\`, `hand\` (`modell.glb`, `korning.json`), `meshy-delar-oversikt.png`, `steg.log` | ~90 Meshy-kr |
| 3 | `03-montering\` | `<namn>-apose.glb`, `latt-4k.glb`, `montering-forhandsvisning.png`, `forenkla.log`, `steg.log` | Gratis (lokalt) |
| 4 | `04-rigg\` | `riggjobb\riggad.glb`, `riggjobb.json`, `steg.log` | 5 Meshy-kr |
| 5 | `05-fingrar-handleder\` | `avatar-rigg.glb`, `handled-fix\avatar-rigg-handledfix.glb`, `handled-fix-jamforelse.png`, `steg.log` | Gratis (lokalt) |
| 6 | `06-dealer-export\` | `<namn>-dealer-apose.glb` + `.json`, `steg.log` | Gratis (lokalt) |
| 7 | `07-qc\` | `resultat-oversikt.png`, 5 närbilder/helbilder, `qc.json`, `steg.log` | Gratis (lokalt) |
| 8 | `08-film\` | `<namn>-ror-sig.mp4`, `<namn>-apose-med-rorelse.glb`, `rorelse-strip.png`, `steg.log` | Gratis (lokalt) |

### Återuppta eller köra enstaka steg
Betalda jobb sparar kvitton (`referenser.json`, `korning.json`, `riggjobb.json`). Om något avbryts kan du köra igen utan att betala dubbelt.
- Starta från steg N: `--from-step 5`
- Kör bara steg N: `--only-step 3`
- Hoppa över filmen: `--no-video`
- Bara referensbilder (inga Meshy-krediter): `--refs-only`

## 5. Prestanda på laptopen
Laptopen saknar NVIDIA-GPU (har AMD Radeon Pro 5300M / Intel i7-9750H), så Blenders Cycles-rendering kör på CPU. Det gör framför allt steg 7 (QC) och steg 8 (film) långsammare än på stationära datorn.
- `STARTA avatar.cmd` använder därför `--samples 24` som standard (i stället för 48).
- Vill du testa ännu snabbare, kör med `--samples 12` eller `--no-video`.
