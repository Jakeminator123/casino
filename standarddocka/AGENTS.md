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

## Jakobs domar som gäller här

Hans egna ord om de första bilderna och filmen (anteckningarna i Prov, 2026-11-26). De är måttet en bild eller en
rörelse prövas mot innan den visas för honom.

- **Startläget är vilan (A1).** "Sitter inte i 'vila/A1' som jag trodde alla startpositioner skulle": varje bild och
  varje rörelse börjar med båda händerna i vila på filten, inte med händerna i luften.
- **Blenders bord gillar han, men det ska vara helt mot dealern.** "Bordet här gillar jag, men är i grunden fel som
  standardbord då det har som ett bortfall runt magen, vilket kanske beror på att markerbrickan ska vara där, som då i
  så fall nu skulle vara instoppat i bordet": ingen urgröpning mot magen, och markerbrickan nedsänkt inne i bordet.
- **Markerbrickan följer bordet.** "Markerhållaren har inte förskjutits bak", "markerbrädan har inte gått bak som
  bordet": när bordet kommer närmare dealern ligger brickan vid dealerns kant.
- **Markerbrickan är bordets kant mot dealern.** Om den första arbetsvyn: "Chipbrickan ska också vara så långt in mot
  dealern, i bordet, att det faktiskt också är det som är 'gränsen' och slutet på bordet som vetter mot dealerns
  mage": ingen remsa filt mellan brickan och kanten; brickans dealersida är bordets kant där dealern sitter.
- **Händerna vilar på filten, inte i den.** "Händerna går in lite i bordet": ingen del av en hand under filtens yta,
  och det ska synas att handen ligger på bordet.
- **Armarna går aldrig genom bordets kant.** "En 'karm' finns som gör att armen från dealern går igenom karmen ungefär
  vid armbågen av framför allt dealerns egna högerarm och vänsterarm": underarmarna går över kanten.
- **Högerhanden tar emot kortet med tummen, utan att handleden vrids i maxläge.** "Dealerns egna högerarm [är] för
  vriden, med andra ord så ska standarden vara att dennes högerarm ska med hjälp av tummen ta emot kortet som sedan
  skjuts och vänds över än att hela handleden ska vridas i maxläge som är onaturligt" (han såg det kring ruta 27 i
  given till plats 4).
- **Inga hack i rörelsen.** "Är som ett litet hack i filmen på 50/120, som försöker kompensera för att fingrarna inte
  är på rätt sida": fingrarna ska vara på rätt sida av kortet från början, så att inget rättas till mitt i.
- **En dockas arm får inte se konstig ut i en bild han ska döma** ("Paows arm är helt konstig" om en stillbild tagen
  med den äldre, handritade given): visa dockan i vilan eller i den rörelse som faktiskt används.
- **Kamerans vinkel.** Inspelningens kamera ser dealern uppifrån, och "vinkeln [är] inte naturlig utifrån att man
  skulle spela i casinot. Dock om vi kan vinkla ned vyn till när man ska spela så går detta å andra sidan": vyn
  spelaren får ska vara mer framifrån än inspelningens, och blicken mot kameran.

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

- Arbetsbänkens aktuella vy ligger i `vy/` här (scenen `vy.blend`, bilderna och mätningen som `scen/vy.py` skriver),
  så att Jakob hittar den i mappen och kan öppna scenen i Blender (hans ord 2026-11-26: "varför har vi ens mappen
  'standarddocka' om vi inte ska använda eller jobba där?"). En körning skriver över den förra; inget av det går in i
  Git.
- Annat arbete (försök, jämförelser, skärmbilder) i `../slask/standarddocka/<uppgift>/`, med mappens lapp.
- Det Jakob ska se visas som ett prov i studion (`../blackjack-dealer/assets/proofs/<namn>/` med `proof.json`, sidan
  Granska, Prov), eftersom det är där han tittar. Hans domar läses med `node tools/proof-notes.ts` från
  `../blackjack-dealer/`.
- Modeller och scener som byggs här (`.blend`, `.glb`) går inte in i Git; skripten som bygger dem gör det.
- Inga betalda anrop (Meshy, en filmmodell) utan Jakobs ord.
