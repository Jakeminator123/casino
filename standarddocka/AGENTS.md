# standarddocka – arbetsregler

Arbetsbänken för standarddockan. Jakob 2026-11-26: "en tredje mapp", "där vi just nu - du och jag - ska jobba med vår
standarddocka. Sedan när vi är nöjda kan delar plockas in till blackjack-dealer och även avatar-pipelinemappen".
`casino/AGENTS.md` gäller också; den här filen går före vid konflikt. Jakob äger projektet och är inte programmerare:
svara på svenska, slutsatsen först, och visa i bild i stället för att fråga.

Läget, nästa steg och det som ska plockas in står i `README.md`.

## Vad som görs här

- **Standarddockan:** en man först, sedan en kvinna, med samma skelett. Hon och han är grunden som nästa dealers docka
  görs av, och bär standarden för bordet, korten, skon och kortplatserna.
- **Vyn:** Blenders bild av dealern vid bordet, genom spelets kamera (stol 4, framifrån). Hans ord: "den mycket bättre
  vyn" än dockans scen i `blackjack-dealer`.
- **Bordet rätt:** kanten ("karmen"), markerbrickan, skon, korten och kortplatserna, och bordet närmare dealern.
- **Blicken:** mot kameran, lite högre än dockan tittar i dag.
- **Rörelserna:** de avgör. En rörelse är klar först när den är riktigt bra i den här vyn.

Struket: att luta bordet mot kameran (hans ord 2026-11-26: "Vi skiter i lutning av bordet").

## Vad mappen lånar och vad den äger

- Den lånar utan att kopiera: måtten (spelets kod i `../blackjack-dealer/src/table-lens.ts`, som
  `../avatar-auto-pipeline/scen/standard.yaml` är skriven ur), de byggda modellerna och byggskripten i
  `../avatar-auto-pipeline/` (bord, dockor, stol), och rörelsekoden i `../blackjack-dealer/dealer3d/`.
- Den äger det som är nytt för standarddockan: hur scenen sätts ihop, ställningar, blick och rörelser, och skripten
  som gör bilderna och filmerna av det.
- Behöver ett byggskript i `../avatar-auto-pipeline/` kunna något nytt (till exempel en bordskant närmare dealern),
  läggs det till där som ett val som inte ändrar det som redan byggs, och skrivs upp under "Plockas in" i README.
- `../blackjack-dealer/` ändras inte härifrån. Det som ska dit skrivs upp under "Plockas in" och förs in när Jakob
  säger att han är nöjd.

## Köra

- Blender körs utan fönster (`blender -b`) i en egen process; rör aldrig ett Blender-fönster som redan är öppet.
  Python-miljön är `../avatar-auto-pipeline/.venv/`.
- Rendering och headless Chrome går under det delade låset `../slask/blackjack-dealer/gpu-och-headless.lock`
  (`blackjack-dealer/AGENTS.md`, "Servern"): en körning i taget.
- Ingen kod eller text pekar på en viss dator: grannprojekten hittas som `../avatar-auto-pipeline` och
  `../blackjack-dealer`.

## Det som produceras

- Arbete (renderingar, försök) i `../slask/standarddocka/<uppgift>/`, med mappens lapp; det går inte in i Git.
- Det Jakob ska se visas som ett prov i studion (`../blackjack-dealer/assets/proofs/<namn>/` med `proof.json`, sidan
  Granska, Prov), eftersom det är där han tittar. Hans domar läses med `node tools/proof-notes.ts` från
  `../blackjack-dealer/`.
- Modeller och scener som byggs här (`.blend`, `.glb`) går inte in i Git; skripten som bygger dem gör det.
- Inga betalda anrop (Meshy, en filmmodell) utan Jakobs ord.
