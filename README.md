# casino

En blackjackdealer till Jakobs blackjackspel: filmad, och ritad i 3D. Repot är publikt; media, 3D-modeller och nycklar
följer inte med Git.

| Mapp | Vad det är | Starta |
| --- | --- | --- |
| [`blackjack-dealer/`](blackjack-dealer/README.md) | Spelet, studion i webbläsaren och 3D-dockans rörelsekod. | `npm start` i mappen (studion på `http://127.0.0.1:4319`) |
| [`standarddocka/`](standarddocka/README.md) | Editorn där standarddockans rörelser spelas, justeras och filmas. | `STARTA editorn.cmd` |
| [`avatar-auto-pipeline/`](avatar-auto-pipeline/README-SV.md) | Blender-skripten som bygger dockan och bordet, och vägen från foton till en riggad dealer. | `STARTA avatar.cmd` |
| [`kortspelspaket/`](kortspelspaket/README.md) | Ett köpt animationspaket och en visare för det. | `STARTA visaren.cmd` |

Node 24 och, för Blender-skripten, Python med miljön i `avatar-auto-pipeline/.venv/`. Reglerna för den som arbetar här,
människa eller agent, står i [`AGENTS.md`](AGENTS.md).
