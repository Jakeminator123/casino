# standarddocka

Arbetsbänken för standarddockan: en man och en kvinna med samma skelett, vid spelets bord genom spelets kamera, och
editorn där Jakob själv spelar upp och justerar en rörelse. Rotens `AGENTS.md` gäller; här står bara det som är eget
för den här mappen. Kartan, körningen, läget och nästa steg står i `README.md`.

- **Måttet är `DOMAR.md`.** Där står Jakobs egna ord om bordet, vyn, blicken, takten, händerna och kortet. Läs den
  innan en rörelse, en ställning eller en bild ändras, och pröva resultatet mot den innan det visas för honom. En ny
  dom skrivs in där med datum och hans ord.
- **Rörelserna avgör.** En rörelse är klar först när den är riktigt bra i spelets vy. Den granskas och rättas med
  skillen `granska-rorelse` (`../.claude/skills/granska-rorelse/SKILL.md`) och verktygen i `verktyg/`.
- **Grundrörelserna ändras inte från editorn.** De ritas av koden i `../blackjack-dealer/dealer3d/` och ligger i dess
  `data/`. Det Jakob drar i editorn sparas ovanpå dem i `rorelser/`, och han kan alltid gå tillbaka till grunden.
- **Mappen lånar, den kopierar inte.** Måtten kommer ur `../blackjack-dealer/src/table-lens.ts`, modellerna och
  byggskripten ur `../avatar-auto-pipeline/`, rörelsekoden ur `../blackjack-dealer/dealer3d/`. Ett mått eller en
  kamera skrivs aldrig in här som egna tal.
- **En väg för varje sak.** Det gamla (Paows docka, hennes sparade standarder, de äldre grundrörelserna) tas bort i
  samma steg som standarddockans egna rörelser har tagit över, inte tidigare och inte senare.
- **Det han ska se** visas som ett prov i studion (`../blackjack-dealer/assets/proofs/<namn>/` med `proof.json`,
  sidan Granska), eftersom det är där han tittar. Hans anteckningar läses med `node tools/proof-notes.ts` från
  `../blackjack-dealer/`.
- **Det som görs här:** `vy/` (Blenders aktuella bild av scenen) och `klipp/` (editorns inspelningar) skrivs över vid
  nästa körning och går inte in i Git. Annat arbete i `../slask/standarddocka/<uppgift>/`.
- **Köra:** editorn har en egen liten server (`node standarddocka/editor/server.ts`, port 4320, bara den här datorn;
  Jakob startar den med `STARTA editorn.cmd`) och lånar three.js ur `../blackjack-dealer/node_modules/`. Blenders
  Python-miljö är `../avatar-auto-pipeline/.venv/`.
