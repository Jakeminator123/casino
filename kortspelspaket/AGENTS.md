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

## Grenen och arbetsträdet

Projektet ligger på grenen `kortspelspaket` tills Jakob säger att det ska in i `main`, i ett eget arbetsträd (`git
worktree`) bredvid huvudmappen, så att ingen annan chatts arbete byter gren. Arbeta i arbetsträdet, inte i huvudmappen.
`main` hämtas in i grenen med en vanlig merge när bordsvyn behöver spelets senaste mått (aldrig en rebase: grenen är
pushad). Det Git inte har lånar visarens server ur huvudmappen (de byggda modellerna av bordet och pallen);
`blackjack-dealer/node_modules` installeras i arbetsträdet med `npm ci` där, för three.js och för testerna som
kontrollen före push kör.

## Bordsvyn lånar, den kopierar inte

Spelets bord, kamera och rum kommer ur `../blackjack-dealer/` (`src/table-lens.ts`, `dealer3d/src/standard-room.ts`)
och modellerna ur `../avatar-auto-pipeline/assets/`, som standarddockans editor gör. Ett mått eller en kamera för
spelets bord skrivs aldrig in här; det som är paketets eget (dess bord 80 cm högt, var den som sitter är) står i
`visa/bord.ts` och är mätt ur rörelserna.

## Köra

- Visaren har en egen liten server (`node kortspelspaket/visa/server.ts`, port 4330, bara den här datorn). Jakob
  startar den med `STARTA visaren.cmd`, som också packar upp paketet första gången.
- three.js lånas ur `../blackjack-dealer/node_modules/` som standarddockans editor gör; finns det inte där (en ny
  utcheckning utan `npm install`) hämtar sidan samma version från jsDelivr. Typerna kontrolleras med rotens
  `tsconfig.json`.
- Blender kan läsa paketets FBX-filer utan fönster (`blender -b`); rör aldrig ett Blender-fönster som redan är öppet.
- Inga betalda anrop (Meshy, Runway) med paketets filer utan Jakobs ord.
