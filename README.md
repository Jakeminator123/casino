# casino

En blackjackdealer till Jakobs blackjackspel: filmad, och ritad i 3D. Repot är publikt; media, 3D-modeller och nycklar
följer inte med Git. Idén, kedjan och varför varje mapp finns står i [`PROJEKTET.md`](PROJEKTET.md), reglerna för den
som arbetar här, människa eller agent, i [`AGENTS.md`](AGENTS.md).

## Starta

Dubbelklicka på **`STARTA studion.cmd`** här i roten (eller kör `node start.ts`). Studion öppnas på
`http://127.0.0.1:4319/studio/` och är ingången till hela repot: startsidan visar kedjan från bild till film och en
ruta per verkstad. Studion går i bakgrunden utan fönster och startar dockans editor själv första gången den visas (en
som redan går startas inte igen). `node start.ts stoppa` stoppar studion och de verkstäder den har startat,
`node start.ts status` säger om den går. Första gången på en ny dator installeras paketen och studion byggs (några
minuter).

| Mapp | Vad det är | I studion | Ensam |
| --- | --- | --- | --- |
| [`blackjack-dealer/`](blackjack-dealer/README.md) | Spelet, studion i webbläsaren och dockornas rörelsekod. | Start, Karta, Beställ, Granska, Casino, Biblioteket | `npm start` i mappen |
| [`standarddocka/`](standarddocka/README.md) | Editorn där dockorna spelar sina lyfta rörelser vid livebordet och filmas. | Dockan | `STARTA editorn.cmd` |
| [`avatar-auto-pipeline/`](avatar-auto-pipeline/README-SV.md) | Blender-skripten som bygger dockorna och bordet, och vägen från bilder av en person till en ny dealer. | Avatarer | `STARTA avatar.cmd` |
| [`live-bj/`](live-bj/README.md) | Mätning av riktiga dealrars rörelser, blick och kamera ur en film från ett livebord. | Mått, Spegla | verktygen i `live-bj/verktyg/` |

Alla mått, vinklar och kortplatser står i [`MATT.md`](MATT.md), utskrivna ur koden med `node matt.ts`; studions sida
Mått visar samma tal, lästa ur koden varje gång (`node matt.ts --json`). Allt som lagras utanför Git står i kartan
[`lager.ts`](lager.ts): `node lager.ts` visar hur mycket som ligger var och vad registren pekar på som saknas, och
studions **Biblioteket** (`/studio/bibliotek/`) visar samma karta och raderar på riktigt, med samma verktyg som en
agent (`AGENTS.md`).

Node 24 och, för Blender-skripten, Python med miljön i `avatar-auto-pipeline/.venv/`.
