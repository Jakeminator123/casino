# avatar-auto-pipeline

Blender-skripten bakom standarddockan och standardscenen (en kvinna och en man med samma skelett, bordet, stolen,
korten och skon), och vägen från 1–8 foton av en person till en riggad 3D-dealer (bilder från gpt-image-2, delar och
riggning hos Meshy, montering och export i Blender). Rotens `AGENTS.md` gäller; här står bara det som är eget för den
här mappen. Mapparna och alla kommandon står i `README-SV.md`; skelettet, lederna och hur en dealer anpassas i
`new_docka.md`.

- **Vägarna har en källa:** `vagar.json` säger vilka delar en dealerdocka byggs av, vilka alternativ som finns, de
  färdiga vägarna (Version 1 är det `auto_avatar.py` kör i dag) och vad som går ihop. `VAGAR.md` är en utskrift och
  ändras aldrig för hand: `python -I vagar.py` kontrollerar filen mot koden och skriver den, och kontrollen före push
  gör det när något inte stämmer. Ett nytt steg eller alternativ skrivs in i `vagar.json` i samma ändring.
- **Måtten har en källa:** spelets kod i `../blackjack-dealer` (kameran, bordet, kortet, skon, kortplatserna och
  dockornas mått). `scen/standard.yaml` är de talen i Blenders koordinater, skriven av `python scen/gen_standard.py`,
  och ändras aldrig för hand: ändra i spelet eller i `gen_standard.py` och kör om.
- **Skelettet är ett.** Bennamnen är de som `../blackjack-dealer/dealer3d/src/figure-model.ts` letar efter. En dealer
  byter kropp, ansikte, hud och kläder, aldrig skelett eller bennamn, så att varje rörelse fungerar på varje docka.
- **Allt som ändrar scenen eller en docka är ett skript** (`scen/`, `verktyg/`). En ändring gjord för hand i Blender
  förs in i skriptet, annars försvinner den vid nästa bygge.
- **Pengar:** en körning från foton kostar Meshy-krediter (cirka 95) och OpenAI-bilder. Starta ingen betald körning
  utan Jakobs ord; `--dry-run` och steg som körs lokalt är gratis. Betalda jobb sparar kvitton så att en omstart inte
  betalar två gånger: radera aldrig ett kvitto för att börja om.
- **Nycklar:** `OPENAI_API_KEY` och `MESHY_API_KEY` står i `.env` här (mall: `.env.example`).
- **Personerna i `input/` är framställda, inte riktiga människor** (Jakob 2026-11-27, om mappen han lade in: Tomasz,
  Amara, Malik och de andra, tre bilder var): deras bilder får gå till tjänsterna vägen använder. Ett foto av en
  riktig person är privat: det stannar på datorn och delas aldrig, och går in i `input/` bara på hans ord.
- **Det som görs här:** `output/<namn>/` är körningens arbetsmapp, `assets/` (bord, dockor, stol) och `qc/`
  (kontrollbilder) byggs av skripten. Inget av det går in i Git. Det Jakob ska döma visas som ett prov
  (`../blackjack-dealer/assets/proofs/<namn>/`), med originalen i provets mapp `original/`.
- **Köra:** Python-miljön är `.venv/` här (`requirements.txt`). Blender hittas via `BLENDER_EXE`, PATH eller sin
  vanliga installationsmapp, och dockorna kräver tillägget MPFB 2. Jakob startar en dealer från foton med
  `STARTA avatar.cmd`; en agent kör `.\.venv\Scripts\python.exe auto_avatar.py --name <namn>`.
