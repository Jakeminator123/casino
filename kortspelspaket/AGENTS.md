# kortspelspaket – arbetsregler

Ett köpt animationspaket, Card Games Animation Pack av The Mighty Cat (Jakob köpte det 2026-11-26), uppackat och
visat. `casino/AGENTS.md` gäller också; den här filen går före vid konflikt. Jakob äger projektet och är inte
programmerare: svara på svenska, slutsatsen först.

Vad paketet innehåller, kartan och hur visaren startas står i `README.md`.

## Det köpta går aldrig in i Git

- Repot är publikt och paketet är licensierat: det får användas i det Jakob gör, inte spridas som det är. Därför
  ligger allt uppackat i `paket/`, som Git ignorerar (`.gitignore` här), och inget ur det kopieras till en mapp som
  Git har, inte heller en enstaka animation, figur, textur eller paketets readme.
- Källan är de tre köpta filerna (`CardGamesAnimationPack.zip`, `CardGamesAnimPack-600.unitypackage` och
  `CardGameAnimPack55.zip`, i Hämtade filer). `node kortspelspaket/packa-upp.ts [--fran <mapp>]` tömmer `paket/` och
  packar upp dem igen, så `paket/` ändras aldrig för hand: det som görs där försvinner vid nästa uppackning.
- Det som görs av paketet (en animation omräknad till standarddockan, en film, en bild) är inte paketet: det följer
  rotens regler för det som produceras, och media går inte heller in i Git.
- `sekvenser.json` (bitarna Jakob klipper ut i visaren) är namn och tider, inget ur paketet: den går in i Git, och det
  han har sparat där skrivs inte över eller tas bort utan hans ord.

## Riktningen: en grund som prövas

Jakob 2026-11-26, om paketet vid spelets bord: det "har ju faktiskt potential", "att vi liksom bygger allt utifrån
dessa rörelser", och "sedan kan vi ta in alla saker till detta projekt i stället för tvärtom": avatar-pipelinen
"anpassas så att de sätts samman utefter dessa avatar-katter", och "hela den där studion/blackjack-dealer-projektet.
Då skulle man bara kunna lyfta in saker". Han lät agenten avgöra formen ("jag låter dig avgöra faktiskt"), och den
blev en mapp i casino, inte ett nytt repo: bordet, måtten, dockorna och studion finns redan här och kan lånas utan att
kopieras, och en mapp kan lyftas ut till ett eget repo med sin historia den dag det behövs, medan två repon är svåra
att slå ihop.

- Grunden är paketets skelett (Unreals standardskelett) och dess rörelser: en figur som har det skelettet kan spela
  varje rörelse utan att något räknas om.
- Det är en väg som prövas, steg för steg (`README.md`, "Vägen"). De andra projekten arbetar vidare som förut tills
  ett steg här är bevisat i bild och Jakob har sagt sitt.
- Det som lyfts in lyfts in ett i taget och bara när ett steg behöver det. Så länge något bara lånas ägs det av mappen
  det ligger i; när det lyfts in ägs det här och tas bort därifrån i samma steg.
- Inget gammalt följer med av sig självt: sparade standarder, lappar och rörelser ritade för en annan kropp lyfts inte
  in (hans ord i `../standarddocka/AGENTS.md`: "låsningar finns i gamla sparade filer"). Hans domar om bordet, vyn,
  takten och händerna gäller här också; de står där.

## Bordsvyn lånar, den kopierar inte

Spelets bord, kamera och rum kommer ur `../blackjack-dealer/` (`src/table-lens.ts`, `dealer3d/src/standard-room.ts`)
och modellerna ur `../avatar-auto-pipeline/assets/`, som standarddockans editor gör. Ett mått eller en kamera för
spelets bord skrivs aldrig in här; det som är paketets eget (dess bord 78 cm högt, var den som sitter är) står i
`visa/bord.ts` och är mätt ur rörelserna.

## Köra

- Visaren har en egen liten server (`node kortspelspaket/visa/server.ts`, port 4330, bara den här datorn). Jakob
  startar den med `STARTA visaren.cmd`, som också packar upp paketet första gången.
- three.js lånas ur `../blackjack-dealer/node_modules/` som standarddockans editor gör; finns det inte där (en ny
  utcheckning utan `npm install`) hämtar sidan samma version från jsDelivr. Typerna kontrolleras med rotens
  `tsconfig.json`.
- Sökningen ser inte `paket/` (`.ignore` här): läs en fil där med sin sökväg.
- Se själv vad en ändring gjorde innan den visas för Jakob: `node kortspelspaket/verktyg/titta.ts` tar bilder av
  visaren utan fönster, under det delade låset för headless Chrome (`../blackjack-dealer/AGENTS.md`, "Servern").
  Bilderna är arbete och läggs i `../slask/kortspelspaket/<uppgift>/`.
- Arbetet görs i huvudmappen på `main`, utan gren och eget träd (Jakob frågade 2026-11-26 och lät agenten föreslå):
  mappen delar inga filer med de andra projekten, så inget krockar, och det som görs finns genast för de andra. Ett
  försök (en annan bordshöjd, fler platser) är ett reglage eller ett val i visaren, inte en gren, och det ändrar aldrig
  spelets mått.
- Blender kan läsa paketets FBX-filer utan fönster (`blender -b`); rör aldrig ett Blender-fönster som redan är öppet.
- Inga betalda anrop (Meshy, Runway) med paketets filer utan Jakobs ord.
