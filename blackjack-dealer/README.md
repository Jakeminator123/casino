# blackjack-dealer

En filmad dealer till Jakobs blackjackspel: två kort till sju spelare och dealern, med trovärdig utdelning. Rörelserna
är korta filmklipp mellan fasta ankare; en runda är en väg genom klippen, och samma rundor spelas i studion, i
3D-scenen och i spelet. Filmerna beställs hos Runway och styrs av dockorna i `dealer3d/` (Danilo, Frasse och
persondockorna), vars rörelser är lyfta ur filmen av ett riktigt livebord. Det gamla repot Jakeminator123/dealer står
kvar som arkiv.

Reglerna står i [AGENTS.md](AGENTS.md), läget i [STATUS.md](STATUS.md), kontrakten i [docs/SYSTEM.md](docs/SYSTEM.md)
och arbetsmomenten som skills i `../.claude/skills/`.

## Mapparna

```
AGENTS.md STATUS.md README.md   regler, läge, karta (CLAUDE.md importerar AGENTS.md åt Claude Code)
docs/SYSTEM.md  kontrakten: format, standarden, scenen, spelet, korten, klippbanken, beställningen, dockan
studio/         studion: Jakobs arbetsyta i webbläsaren (Next.js), byggd till studio/out/
pages/          sidorna bredvid studion: 3D-sidan (scene3d.html) och Ljud (sound.html)
game/           spelmotorn (Scouts regler, oförändrade i sak) och spelsidan i game/page/
src/            den delade motorn: standarden (livebordet), 3D-scen, klippgraf, kort, beställningar
dealer3d/       dockorna: deras mått (src/), de lyfta rörelserna (data/) och verktygen som gör och prövar dem (tools/)
tools/          kommandon, servern (preview.ts), Python-skripten (tools/python/) och testerna (*.test.ts)
cloud/          studions låsta kopia på nätet: låset och boten
data/           registren (nedan)
placements/     Jakobs kortplan
assets/         lokal media, inte i Git
.runtime/       verktygens eget på datorn (databaser, liggare, loggar, papperskorgen), inte i Git
```

Sidorna har kvar sina adresser (`/scene3d.html`, `/game.html` …). Tillfälligt arbete ligger i
`../slask/blackjack-dealer/`.

## Köra

Alla `npm`- och `node`-kommandon körs från den här mappen. Node 24.22.3 (Volta; `package.json` kräver `>=24.22.3 <25`,
`node -p process.version`);
`npm ci` om beroenden saknas, och `npm --prefix studio ci` för studion.

| Kommando | Gör |
| --- | --- |
| `npm start` | startar servern på `http://127.0.0.1:4319` utan fönster och visar studion i en flik; bygger studion om den saknas (rotens `node start.ts` gör samma sak) |
| `npm run status`, `npm run stop` | frågar och stoppar servern; `node tools/preview.ts --open "<sida>"` visar en sida i den nyaste öppna fliken, `--restart` byter server |
| `npm --prefix studio run build` | bygger studion på plats till `studio/out/` |
| `npm test` | kärnans tester, offline och utan media |
| `npm run hooks:install`, `npm run check` | installerar kontrollen före push för hela casino-repot; kör den på de commits som ska ut |
| `npm run verify` | jämför registrerade filer med sin hash i `data/manifest.json` (kräver media) |
| `npm run stada` | raderar projektets del av slasken som inte har ändrats på tre timmar, utom `granska/` (`-- --torr` listar bara); `node ../slask/slask.ts` visar hela slasken |
| `npm run gallra` | plan för vad i `assets/` som raderas (servern utför den säkra nivån själv när den startar, till papperskorgen) |
| `node ../lager.ts` | kartan över allt som lagras i casino-repot: storlek per ställe och slag, vad inget pekar på, vad som väntar på hans dom och vad registren pekar på som saknas (`--json` som data) |
| `node tools/lager-remove.ts <sak> [--ja --vem <namn>]` | frågan före en radering och följden; `--ja` raderar från disken utan papperskorg. Samma verktyg som Radera i Biblioteket och Prov |

Serverns adresser står i `tools/lab-routes.ts`, och vägarna till resten av casino-repot i `tools/casino-routes.ts`
(verkstädernas servrar, måtten ur `../matt.ts --json`, avatarernas vägar). Utan media på datorn visar studion och
spelet inga filmer.

## Studion

[Studion](http://127.0.0.1:4319/studio/) är ingången till hela casino-repot. Verkstäder med en egen server (dockans
editor i `../standarddocka/`) visas inne i studion med menyn kvar (`studio/components/workshop/`); servern startar dem
som sina egna barn första gången vyn öppnas och stoppar dem när den själv stoppas, och en som redan svarar på sin port
(`/vem`) startas inte igen. Två lager:

- **Ramen** (menyn, rubrikraden, panelerna, knapparna) är Next.js, React och Tailwind: färger och mått i
  `studio/app/globals.css`, menyn i `studio/components/shell/Rail.tsx`, byggstenarna i `studio/components/ui/`
  (provsida `/studio/ui/`). En ändring syns efter bygget och en omladdning.
- **Bildytan** i mitten är annan kod, som ramens stil inte når: filmspelaren (`studio/components/player/`), dockans
  editor i en ram, scenen (three.js, `src/scene3d-*.ts`) och spelet (`game/page/game.html` i en ram).

Menyn följer kedjan: Start, Avatarer, Dockan, Karta, Beställ, Granska, Casino, Mått, Spegla och Biblioteket, och i
foten Beslut och Ordlista (`studio/lib/words.ts`). En standard gäller överallt, livebordet, så studion har inget val
av bord.

- **Start** (`studio/components/start/`, innehållet i `studio/lib/start.ts`): det som väntar på hans dom, kedjan med
  verkstaden för varje steg, en ruta per verkstad och Ljud.
- **Avatarer** (`studio/components/avatars/`, `studio/lib/avatars.ts`, `GET /api/vagar`): vägarna i
  `../avatar-auto-pipeline/vagar.json` med steg, kostnad och vad som finns i `output/<person>/`, delarna, och de färdiga
  modellerna i 3D. Startar ingen körning.
- **Dockan**: editorn ur `../standarddocka/` i en ram; ord i adressen går vidare (`/studio/dockan/?docka=frasse&plats=4`).
- **Karta**: dockornas rörelseschema ur `../standarddocka/rorelsekatalog.json`, för den valda dockan: en runda med det
  som saknas i rött och Spela i Dockan, kortplatserna, och ankarena, rörelserna och stadierna som en bild
  (`studio/components/schemat/`, `studio/lib/schemat.ts`, `GET /api/schema` i `tools/schema-routes.ts`).
  `node tools/schema-routes.ts` skriver ut där katalogen och filerna inte säger samma sak.
- **Beställ** (`studio/components/order/`): beställningarna hos Runway, kön, och en order att godkänna och skicka.
- **Granska**: Filmer (Jakobs domar) och Prov (`assets/proofs/<mapp>/`, `?prov=<mapp>`). Ett prov visar den oberoende
  domarens dom skild från hans egen (`domare` i `proof.json`, `studio/components/proofs/DomarePanel.tsx`); där de är
  oense står provet först. Radera provet raderar från disken med Bibliotekets fråga.
- **Casino** (`/studio/game/`, samma spel som `/game.html`): spelet vid livebordet med vald look
  (`src/game-page.ts`, `createLayout` i `src/game-table.ts`, `liveProps` i `src/game3d-props.ts`). Utan godkända
  filmer visas bordet utan dealer.
- **Mått**: `../MATT.md`:s tal, lästa ur koden varje gång (`studio/lib/measures.ts`).
- **Spegla** (`studio/components/spegla/`, `studio/lib/spegla.ts`): Youtubefilmens bordsbild och vår vy av samma giv på
  varandra i 1728 × 972 och i takt, halvt om halvt, delad eller bredvid. Vår vy är dockans inspelning
  (`../standarddocka/klipp/live-lyft-<docka>-p<n>-hela-kameran-<docka>.mp4`, nyare än lyftet) eller en persons film ur
  ett prov. `tools/spegla-routes.ts` (`/api/spegla`) strömmar filmen där den ligger, bara på den här datorn;
  `tools/spegla-routes.test.ts` håller den borta från kopian.
- **Biblioteket** (`studio/components/bibliotek/`, `studio/lib/bibliotek.ts`): allt som lagras i casino-repot ur
  `../lager.ts` (`tools/lager-routes.ts`: `/api/lager`, `/api/lager/fraga`, `/api/lager/radera`, `/api/lager/fil`), per
  slag, med små bilder som servern gör i `.runtime/miniatyrer/`. En sak öppnas med bilden stor, var den används och hans
  ord; livebordets film bara som storlek. Kartan och raderingen körs i en egen process, så att servern aldrig står
  still. `?slag=`, `?enhet=` och `?fraga=` i adressen väljer.
- **Beslut** i foten: det som väntar på Jakobs svar.
- En vy för alla skärmar: mobilvyn härleds ur samma kort och kamera. Dealerväxeln visar dealrarna i
  `data/dealers.json` (ingen dealer är namngiven i koden, `studio/lib/dealer.ts`); utan dealer finns ingen växel, och
  dockorna är inga dealrar. En pausad dealer visas bara när en adress nämner den (Jakob 2026-11-18).

Kopian på nätet (`dealer-lake.vercel.app`) har samma meny utan sparning och utan det som bara går på hans dator, och i
stället för Beslut Önskemål och boten (skillen `publicera-kopian`).

## Var fakta ligger

- `data/motions.jsonl`: filmregistret, en post per film och tagning med Jakobs dom; läses och skrivs genom
  `tools/register-store.ts`, med en SQLite-kopia under `.runtime/register/` (`node tools/register.ts get <id>`).
- `data/orders/<id>.json`: beställningarna; `data/order-methods.json` receptet per steg; `data/order-policy.json` taken,
  fullmakten och priserna. Anrop utanför Beställ står i liggaren `.runtime/runway-api/ledger.json`.
- `data/decisions.json`: korten i Beslut; bara sidan skriver hans svar (`tools/decision-store.ts`).
- `data/proof-notes.json`: hans ord om proven (`node tools/proof-notes.ts`).
- `data/rendered-references.json`: dockans filmer, med kamera och en styrbild per person
  (`tools/doll-reference-put.ts`).
- `dealer3d/data/`: dockornas lyfta rörelser och ankare (`lyft-<docka>-*.json`, `ankare-*-<docka>.json`), skrivna av
  `dealer3d/tools/lyft-till-docka.ts`; persondockorna i `dealer3d/src/persondockor.ts`, skrivna av
  `../avatar-auto-pipeline/ny_dealer.py`.
- `data/manifest.json`: filernas ursprung och SHA-256.
- `data/scene-presets/<namn>.json`: utseendena (förvalen); Casino spelar `casino`. `data/play-view-live.json`:
  spelvyn, inramningen för dator och mobil som gäller alla utseenden (`tools/play-view-store.ts`).
- Den äldre dealerns flöde, kvar tills det tas bort (`STATUS.md`): `data/clip-jobs.json` (klippbanken),
  `data/dealers.json` och `data/media-roles.json` (dealrarna och deras bilder), `data/dealer-trees.json` och
  `data/dealer-compositions.json` (träd och kompositioner, `?trad=`, `?komposition=`), `placements/default.json`
  (Jakobs kortplan, läst genom `src/plan-lens.ts`), och `data/speech.json` med den tomma `data/speech-patches.json`.

Media (`assets/`), `.runtime/`, `.env*` och `private/` är lokala och Git-ignorerade.
