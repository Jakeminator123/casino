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
- **Editorn:** en sida i webbläsaren (`editor/`, hans ord 2026-11-26: "mini-blender") där han själv spelar upp en
  rörelse och drar i händer, armbågar och blick. Grundrörelserna i `../blackjack-dealer/dealer3d/data/` ändras aldrig
  härifrån; det han ändrar sparas ovanpå dem i `rorelser/`, och han kan alltid gå tillbaka (hans ord 2026-11-26: "en
  resetknapp så att vi kan återgå till rörelserna som finns, så jag inte ändrar värden som är oåterkalleliga"). Den ska
  gå att hantera ungefär som den tidigare dockan, "men utan onödiga grejer": kortet till var och en av de sju
  platserna, bilden från var och en av dem, farten per del och inspelning av ett klipp.
- **Granskningen:** en rörelse granskas och rättas med skillen `granska-rorelse`
  (`../.claude/skills/granska-rorelse/SKILL.md`) och verktygen i `verktyg/`; flera agenter kan ta var sin rörelse, var
  och en i sin egen fil i `rorelser/`.

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
- **Takten (2026-11-26).** "En ny standard som jag skulle vilja ha för rörelserna med nya standarddockan. A1 - A2.3 ska
  ta 1 sekund ungefär. Sedan ska respektive giv, såsom A2.3 till P4C1 ta 1 sekund ungefär", och senare samma dag:
  "respektive utgivning är max 1 sekund och tillbakagången till A1 och/eller A2.3 eller så ska göras på ca 0,6
  sekunder". Alltså: från vilan till skon cirka 1 s, kortet ut högst 1 s, och handen tillbaka (till skon eller till
  vilan) cirka 0,6 s. Det är rörelsens tid; stillastående i ett ankare räknas inte in.
- **Handen vid skon vilar medan den andra ger (2026-11-26).** "Dealerns hand som för ut kortet ur skon liksom lyfts upp
  och spänns medan den andra [handen] faktiskt delar ut kortet", i alla givarna: handen som tog kortet ur skon ska
  ligga avspänd, inte hänga spänd i luften, medan den andra handen lägger kortet.
- **Allt börjar i A1.** "Rörelserna måste kunna läggas in i hela det system med A1 som allt börjar på": varje rörelse
  går mellan två ankare (A1 vilan, A2.3 handen vid skon) och börjar och slutar stilla i dem, så att klippen kan läggas
  efter varandra i spelets träd.
- **Dockans fel syns i filmen.** Om första filmen av dockan omgjord till en person: "det [är] mycket viktigt att dockan
  vi använder är väldigt bra med sina givar, så ett litet typ hack som sker omkring ruta 50/51 faktiskt syns i denna
  film". Filmmodellen följer dockan ruta för ruta och rättar ingenting: en rörelse filmas först när den är ren.

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
- Undantaget är dockans rörelser (Jakob 2026-11-26, efter granskningen som fann felen i grundrörelserna: "Detta ska
  verkligen få ändras om något annat sägs så är det jag som bestämmer", "du har fulla privilegier för ändringar av
  allt"): koden som ritar givarna (`../blackjack-dealer/dealer3d/src/` och `dealer3d/tools/`) får ändras, och nya
  grundrörelser får skrivas i `../blackjack-dealer/dealer3d/data/`. Det som redan används skrivs inte över: en ny regel
  är ett nytt val bredvid det gamla, och en ny rörelse en ny fil, så att Paows sparade standarder och de grundrörelser
  hennes filmer är gjorda av är som de var. Vad som ändrades i en rörelse sägs kort till Jakob.

## Köra

- Blender körs utan fönster (`blender -b`) i en egen process; rör aldrig ett Blender-fönster som redan är öppet.
  Python-miljön är `../avatar-auto-pipeline/.venv/`.
- Rendering och headless Chrome går under det delade låset `../slask/blackjack-dealer/gpu-och-headless.lock`
  (`blackjack-dealer/AGENTS.md`, "Servern"): en körning i taget.
- Ingen kod eller text pekar på en viss dator: grannprojekten hittas som `../avatar-auto-pipeline` och
  `../blackjack-dealer`.
- Editorn har en egen liten server (`node standarddocka/editor/server.ts`, port 4320, bara den här datorn) och lånar
  three.js ur `../blackjack-dealer/node_modules/`; mappen har inga egna paket. Jakob startar den med
  `STARTA editorn.cmd`. Typerna kontrolleras med rotens `tsconfig.json`.

## Det som produceras

- Arbetsbänkens aktuella vy ligger i `vy/` här (scenen `vy.blend`, bilderna och mätningen som `scen/vy.py` skriver),
  så att Jakob hittar den i mappen och kan öppna scenen i Blender (hans ord 2026-11-26: "varför har vi ens mappen
  'standarddocka' om vi inte ska använda eller jobba där?"). En körning skriver över den förra; inget av det går in i
  Git.
- Klippen som editorns Spela in gör ligger i `klipp/` här, av samma skäl; en ny inspelning med samma namn skriver över
  den förra, och inget av det går in i Git.
- Annat arbete (försök, jämförelser, skärmbilder) i `../slask/standarddocka/<uppgift>/`, med mappens lapp.
- Det Jakob ska se visas som ett prov i studion (`../blackjack-dealer/assets/proofs/<namn>/` med `proof.json`, sidan
  Granska, Prov), eftersom det är där han tittar. Hans domar läses med `node tools/proof-notes.ts` från
  `../blackjack-dealer/`.
- Modeller och scener som byggs här (`.blend`, `.glb`) går inte in i Git; skripten som bygger dem gör det.
- Inga betalda anrop (Meshy, en filmmodell) utan Jakobs ord.
