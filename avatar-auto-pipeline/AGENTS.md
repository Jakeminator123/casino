# avatar-auto-pipeline – arbetsregler

Från tre foton av en person till en riggad 3D-dealer i A-pose (GLB) med QC-bilder och en kort rörelsefilm, som
`blackjack-dealer` kan använda. Stegen: referensbilder med gpt-image-2, delar och riggning hos Meshy, montering, fingrar,
handleder, export, QC och film i Blender. `casino/AGENTS.md` gäller också; den här filen går före vid konflikt. Jakob
äger projektet och är inte programmerare: svara på svenska, slutsatsen först.

## Köra

- Python-miljön är `.venv/` i den här mappen (`requirements.txt`). Blender hittas via `BLENDER_EXE`, PATH eller `C:\Program Files\Blender Foundation\`.
- Jakob startar med `STARTA avatar.cmd` (frågar efter mappen under `input/`). En agent kör
  `.\.venv\Scripts\python.exe auto_avatar.py --name <namn>`; `--dry-run` provar foton, Blender och mappar gratis, och
  `--from-step N`, `--only-step N`, `--refs-only` och `--no-video` styr vad som körs. Stegen och mapparna står i
  `README-SV.md`.
- Foton i `input/<namn>/`, allt som körningen gör i `output/<namn>/`. Inget av det går in i Git.

## Nycklar och pengar

- `OPENAI_API_KEY` och `MESHY_API_KEY` står i `.env` här (mall: `.env.example`, med tomma värden). Nycklarna skrivs
  aldrig ut, loggas eller skrivs in i någon annan fil; Meshys MCP-server i `casino/.cursor/mcp.json` läser samma `.env`.
- En körning kostar Meshy-krediter (cirka 95) och OpenAI-bilder. Starta ingen betald körning eller ett betalt
  Meshy-anrop utan Jakobs ord; gratis torrkörningar och steg som körs lokalt går bra. Betalda jobb sparar kvitton, så
  en omstart betalar inte två gånger: radera aldrig ett kvitto för att börja om.

## Det som produceras

- `output/<namn>/` är arbetsmappen och tillfällig. Det Jakob ska döma (dealer-GLB:n, QC-bladet, filmen) läggs i
  `../slask/avatar-auto-pipeline/granska/<namn>/` och står där tills han har dömt: godkänt flyttas dit
  `blackjack-dealer` ska använda det, underkänt raderas (`casino/AGENTS.md`, "Det som produceras").
- Original och foton av en person är privata: de stannar på datorn och delas aldrig.

## Kod

- Jakob kan arbeta i den här mappen samtidigt med en annan chatt eller ett annat verktyg: fråga honom innan du ändrar
  kod här, och rör aldrig någon annans ocommittade filer.
- Projektet har inga automatiska tester; kontrollen före push (`casino/.githooks`) stoppar ändå hemligheter, `.env`,
  media och stora filer.
