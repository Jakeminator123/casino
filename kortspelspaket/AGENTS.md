# kortspelspaket

Ett köpt animationspaket, Card Games Animation Pack av The Mighty Cat (Jakob köpte det 2026-11-26), och en visare för
det i webbläsaren. Rotens `AGENTS.md` gäller; här står bara det som är eget för den här mappen. Vad paketet innehåller,
kartan och hur visaren startas står i `README.md`; läget och vägen framåt i `OVERLAMNING.md`.

- **Det köpta går aldrig in i Git.** Paketet är licensierat: det får användas i det Jakob gör, inte spridas som det
  är. Allt uppackat ligger i `paket/`, som Git ignorerar, och inget ur det kopieras till en mapp som Git har, inte
  heller en enstaka animation, figur, textur eller paketets readme.
- **`paket/` ändras aldrig för hand.** `node kortspelspaket/packa-upp.ts [--fran <mapp>]` tömmer mappen och packar upp
  de tre köpta filerna igen, så det som görs där försvinner.
- **`sekvenser.json` är Jakobs.** Bitarna han klipper ut i visaren är namn och tider, inget ur paketet: filen går in
  i Git, och det han har sparat där skrivs inte över.
- **Mappen ligger vid sidan** (Jakob 2026-11-27: paketet "är lite by the side, och har inte så mycket med det vi gör
  nu"). Den 26:e prövades tanken att bygga rörelserna utifrån paketets skelett; den vilar. Standarddockans rörelser
  ritas av koden i `../blackjack-dealer/dealer3d/` och mäts mot riktiga dealrar (`../live-bj/`), inte mot paketet.
  Inget lyfts härifrån in i de andra mapparna utan hans ord.
- **Bordsvyn lånar, den kopierar inte.** Spelets bord, kamera och rum kommer ur `../blackjack-dealer/`
  (`src/table-lens.ts`, `dealer3d/src/standard-room.ts`) och modellerna ur `../avatar-auto-pipeline/assets/`. Det som
  är paketets eget (dess bord, var den som sitter är) står i `visa/bord.ts`.
- **Hans domar** om bordet, vyn, takten och händerna gäller här också: `../standarddocka/DOMAR.md`.
- **Köra:** visaren har en egen liten server (`node kortspelspaket/visa/server.ts`, port 4330, bara den här datorn;
  Jakob startar den med `STARTA visaren.cmd`) och lånar three.js ur `../blackjack-dealer/node_modules/`.
  `node kortspelspaket/verktyg/titta.ts` tar bilder av visaren utan fönster.
