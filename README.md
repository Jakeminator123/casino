# casino

En blackjackdealer till Jakobs blackjackspel: filmad, och ritad i 3D. Repot är publikt; media, 3D-modeller och nycklar
följer inte med Git. Idén, kedjan och varför varje mapp finns står i [`PROJEKTET.md`](PROJEKTET.md).

## Starta

Dubbelklicka på **`STARTA studion.cmd`** här i roten (eller kör `node start.ts`). Studion öppnas på
`http://127.0.0.1:4319/studio/` och är ingången till hela repot: startsidan visar kedjan från bild till film och har en
ruta per verkstad. Dockans editor och kortpaketets visare öppnas inne i studion, och studion startar deras servrar själv
första gången deras sida öppnas (en som redan går startas inte igen). Studion går i bakgrunden utan fönster;
`node start.ts stoppa` stoppar den och de verkstäder den har startat, `node start.ts status` säger om den går. Första
gången på en ny dator installeras paketen och studion byggs (några minuter).

| Mapp | Vad det är | I studion | Ensam |
| --- | --- | --- | --- |
| [`blackjack-dealer/`](blackjack-dealer/README.md) | Spelet, studion i webbläsaren och 3D-dockans rörelsekod. | Filmverkstaden, Granska, Karta, Material, Casino | `npm start` i mappen |
| [`standarddocka/`](standarddocka/README.md) | Editorn där standarddockans rörelser spelas, justeras och filmas. | Dockan | `STARTA editorn.cmd` |
| [`avatar-auto-pipeline/`](avatar-auto-pipeline/README-SV.md) | Blender-skripten som bygger dockan och bordet, och vägen från foton till en riggad dealer. | | `STARTA avatar.cmd` |
| [`live-bj/`](live-bj/README.md) | Mätning av riktiga dealrars rörelser, blick och kamera ur en film från ett livebord. | Mått (bara talen) | verktygen i `live-bj/verktyg/` |
| [`kortspelspaket/`](kortspelspaket/README.md) | Ett köpt animationspaket och en visare för det. Ligger vid sidan. | Kortpaketet (från startsidan) | `STARTA visaren.cmd` |

Alla mått, vinklar och kortplatser står samlade i [`MATT.md`](MATT.md), som skrivs ut ur koden med `node matt.ts`;
studions sida Mått visar samma tal, lästa ur koden varje gång (`node matt.ts --json`).

Node 24 och, för Blender-skripten, Python med miljön i `avatar-auto-pipeline/.venv/`. Reglerna för den som arbetar här,
människa eller agent, står i [`AGENTS.md`](AGENTS.md).
