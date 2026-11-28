# standarddocka

Dockornas arbetsbänk vid livebordet: Danilo och Frasse, deras rörelser lyfta ur filmen av livebordet och editorn där Jakob
spelar och filmar dem. Rotens `AGENTS.md` gäller; här står bara det som är eget för den här mappen. Kartan och körningen
står i `README.md`.

- **Måttet är `DOMAR.md`.** Läs den innan en rörelse, en ställning eller en bild ändras, och pröva resultatet mot den
  innan det visas för honom. En ny dom skrivs in där med datum och hans ord.
- **Rörelserna avgör.** En rörelse är klar först när den är riktigt bra genom livebordets kamera. Den granskas och rättas
  med skillen `granska-rorelse`.
- **Rörelserna ändras inte från editorn.** De lyfts ur filmen av `../blackjack-dealer/dealer3d/tools/lyft-till-docka.ts`
  och ligger i `../blackjack-dealer/dealer3d/data/`; editorn spelar dem som de är och sparar inget.
- **Mappen lånar, den kopierar inte.** Måtten kommer ur `../blackjack-dealer/src/table-live.ts` (genom
  `../blackjack-dealer/src/standard.ts`), dockorna ur `../blackjack-dealer/dealer3d/src/doll.ts`, modellerna och
  byggskripten ur `../avatar-auto-pipeline/`. Ett mått eller en kamera skrivs aldrig in här som egna tal.
- **Det han ska se** visas som ett prov i studion (`../blackjack-dealer/assets/proofs/<namn>/`, sidan Granska). Hans
  anteckningar läses med `node tools/proof-notes.ts` från `../blackjack-dealer/`.
- **`klipp/`** (editorns inspelningar) skrivs över vid nästa körning och går inte in i Git.
