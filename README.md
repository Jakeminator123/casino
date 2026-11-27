# casino

En blackjackdealer till Jakobs blackjackspel: filmad, och ritad i 3D. Repot är publikt; media, 3D-modeller och nycklar
följer inte med Git. Idén, kedjan och varför varje mapp finns står i [`PROJEKTET.md`](PROJEKTET.md).

| Mapp | Vad det är | Starta |
| --- | --- | --- |
| [`blackjack-dealer/`](blackjack-dealer/README.md) | Spelet, studion i webbläsaren och 3D-dockans rörelsekod. | `npm start` i mappen (studion på `http://127.0.0.1:4319`) |
| [`standarddocka/`](standarddocka/README.md) | Editorn där standarddockans rörelser spelas, justeras och filmas. | `STARTA editorn.cmd` |
| [`avatar-auto-pipeline/`](avatar-auto-pipeline/README-SV.md) | Blender-skripten som bygger dockan och bordet, och vägen från foton till en riggad dealer. | `STARTA avatar.cmd` |
| [`live-bj/`](live-bj/README.md) | Mätning av riktiga dealrars rörelser, blick och kamera ur en film från ett livebord. | verktygen i `live-bj/verktyg/` |
| [`kortspelspaket/`](kortspelspaket/README.md) | Ett köpt animationspaket och en visare för det. Ligger vid sidan. | `STARTA visaren.cmd` |

Alla mått, vinklar och kortplatser står samlade i [`MATT.md`](MATT.md), som skrivs ut ur koden med `node matt.ts`.

Node 24 och, för Blender-skripten, Python med miljön i `avatar-auto-pipeline/.venv/`. Reglerna för den som arbetar här,
människa eller agent, står i [`AGENTS.md`](AGENTS.md).
