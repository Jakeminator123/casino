# avatar-auto-pipeline – arbetsregler

Två saker med samma skelett i botten. Standarddockan och standardscenen i Blender: en kvinna och en man med samma
skelett, vid spelets bord med spelets kamera, kort och sko; grunden som varje dealers docka i `blackjack-dealer`
anpassas från (Jakob 2026-11-25, 2026-11-26). Och en dealer från foton: från 1–8 foton av en person till en riggad
3D-dealer i A-pose (GLB) med QC-bilder och en kort rörelsefilm, med referensbilder från gpt-image-2, delar och riggning
hos Meshy och montering, fingrar, handleder, export, QC och film i Blender. `casino/AGENTS.md` gäller också; den här
filen går före vid konflikt. Jakob äger projektet och är inte programmerare: svara på svenska, slutsatsen först.

Mapparna och alla kommandon står i `README-SV.md`; skelettet, lederna, bryggan och hur en dealer anpassas i
`new_docka.md`.

## Standarden

- Måtten har en källa: spelets kod i `../blackjack-dealer` (kameran, bordet, kortet, skon, markerlådan, kortplatserna
  och dockornas mått). `scen/standard.yaml` är de talen i Blenders koordinater, skriven av
  `python scen/gen_standard.py`. Den ändras aldrig för hand: ändra i spelet eller i `gen_standard.py` och kör om.
  Ett tal som spelet inte har står som `antaget` med sin motivering.
- Skelettet är ett: bennamnen som `blackjack-dealer/dealer3d/src/figure-model.ts` letar efter (utan `mixamorig:`,
  `neck` med litet n, `headfront`). En dealer byter kropp, ansikte, hud och kläder, aldrig skelett eller bennamn, så
  att varje rörelse fungerar på varje docka.
- Allt som ändrar scenen eller en docka är ett skript (`scen/`, `verktyg/`). En ändring gjord för hand i Blender förs
  in i skriptet, annars försvinner den vid nästa bygge.
- Blender körs utan fönster (`blender -b`) i en egen process. Rör aldrig ett Blender-fönster som redan är öppet och
  avbryt inte en rendering som pågår. Skripten sätter `save_version = 0`, så inga `.blend1` skapas.

## Köra

- Python-miljön är `.venv/` i den här mappen (`requirements.txt`). Blender hittas via `BLENDER_EXE`, PATH eller sin
  vanliga installationsmapp. Dockorna kräver tillägget MPFB 2 i Blender, måtten Node 24.
- Standardscenen: kommandona står i `README-SV.md`.
- En dealer från foton: Jakob startar med `STARTA avatar.cmd` (frågar efter mappen under `input/`). En agent kör
  `.\.venv\Scripts\python.exe auto_avatar.py --name <namn>`; `--dry-run` provar foton, Blender och mappar gratis, och
  `--from-step N`, `--only-step N`, `--refs-only` och `--no-video` styr vad som körs.
- Foton i `input/<namn>/`, allt som körningen gör i `output/<namn>/`. Inget av det går in i Git.

## Nycklar och pengar

- `OPENAI_API_KEY` och `MESHY_API_KEY` står i `.env` här (mall: `.env.example`, med tomma värden). Nycklarna skrivs
  aldrig ut, loggas eller skrivs in i någon annan fil; Meshys MCP-server i `casino/.cursor/mcp.json` läser samma `.env`.
- En körning från foton kostar Meshy-krediter (cirka 95) och OpenAI-bilder; stolen kostade 30 krediter
  (`scen/meshy_stol.py`). Starta ingen betald körning eller ett betalt anrop (Meshy, OpenAI, en filmmodell) utan Jakobs
  ord; gratis torrkörningar och steg som körs lokalt går bra. Betalda jobb sparar kvitton, så en omstart betalar inte
  två gånger: radera aldrig ett kvitto för att börja om.

## Det som produceras

- `assets/` (bord, dockor, stol) och `qc/` (kontrollbilder, inspektionsdumpar) byggs av skripten och går inte in i
  Git. I Git står bara licenserna, källornas adresser och Meshy-kvittot.
- `output/<namn>/` är arbetsmappen och tillfällig. Det Jakob ska döma (dealer-GLB:n, QC-bladet, filmen) läggs i
  `../slask/avatar-auto-pipeline/granska/<namn>/` och står där tills han har dömt: godkänt flyttas dit
  `blackjack-dealer` ska använda det, underkänt raderas (`casino/AGENTS.md`, "Det som produceras").
- Tillfälligt arbete i `../slask/avatar-auto-pipeline/<uppgift>/`, aldrig i den här mappen. Verktygen hittar dit med
  `gemensamt/sokvagar.py` (`slask`), som också skriver mappens lapp.
- Original och foton av en person är privata: de stannar på datorn och delas aldrig.

## Kod

- Från foton är körningen A-pose, ett steg i taget. Delad hjälp ligger i `montera.py`, `metod/bygg.py` och
  `fingerrigg.py`.
- Ingen kod eller text pekar på en viss dator, användare eller disk: spelet hittas som `../blackjack-dealer`, slasken
  som `../slask/avatar-auto-pipeline`.
- Jakob kan arbeta i den här mappen samtidigt med en annan chatt eller ett annat verktyg: fråga honom innan du ändrar
  kod här, och rör aldrig någon annans ocommittade filer.
- Projektet har inga automatiska tester; kontrollen före push (`casino/.githooks`) stoppar ändå hemligheter, `.env`,
  media och stora filer.
