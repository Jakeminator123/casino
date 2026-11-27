# blackjack-dealer

En filmad dealer till Jakobs blackjackspel: två kort till sju spelare och dealern, med trovärdig utdelning. Rörelserna
är korta filmklipp mellan fasta ankare (vila, redo, kortets plats) i en klippbank; en runda är en väg genom klippen,
och samma rundor spelas i studion, i 3D-scenen och i spelet. Filmerna beställs hos Runway och styrs av dockorna i
`dealer3d/` (Danilo, Frasse och persondockorna vid livebordet), vars rörelser är lyfta ur filmen av ett riktigt
livebord. Projektet är mappen `blackjack-dealer` i det publika repot
[Jakeminator123/casino](https://github.com/Jakeminator123/casino); media och hemligheter följer inte med Git, och det
gamla repot Jakeminator123/dealer står kvar som arkiv.

Reglerna står i [AGENTS.md](AGENTS.md), läget i [STATUS.md](STATUS.md), kontrakten i [docs/SYSTEM.md](docs/SYSTEM.md)
och arbetsmomenten som skills i `../.claude/skills/`.

## Mapparna

```
AGENTS.md STATUS.md README.md   regler, läge, karta (CLAUDE.md importerar AGENTS.md åt Claude Code)
docs/SYSTEM.md  kontrakten: format, register, scenen, spelet, korten, klippbanken, ordlistan
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

Sidorna har kvar sina adresser (`/scene3d.html`, `/game.html` …); bara filerna ligger i mappar. Tillfälligt arbete
ligger i casino-repots slask, `../slask/blackjack-dealer/`.

## Köra

Alla `npm`- och `node`-kommandon körs från den här mappen. Node 24.22.3 (Volta; `package.json` kräver `>=24.22.3 <25`,
`node -p process.version`); `npm ci` om beroenden saknas, och `npm --prefix studio ci` för studion.

| Kommando | Gör |
| --- | --- |
| `npm start` | startar servern på `http://127.0.0.1:4319` utan fönster och visar studion i en flik; bygger studion om den saknas (rotens `STARTA studion.cmd` och `node start.ts` gör samma sak, från roten) |
| `npm run status`, `npm run stop` | frågar och stoppar servern; `node tools/preview.ts --open "<sida>"` visar en sida i den nyaste öppna fliken (flera flikar får vara öppna samtidigt), `--restart` byter server |
| `npm --prefix studio run build` | bygger studion på plats till `studio/out/` |
| `npm test` | kärnans tester, offline och utan media |
| `npm run hooks:install`, `npm run check` | installerar kontrollen före push för hela casino-repot; kör den på de commits som ska ut |
| `npm run verify` | jämför registrerade filer med sin hash i `data/manifest.json` (kräver media) |
| `npm run stada` | raderar projektets del av slasken som inte har ändrats på tre timmar, utom `granska/` (`-- --torr` listar bara); `node ../slask/slask.ts` visar hela slasken |
| `npm run gallra` | plan för vad i `assets/` som raderas (servern utför den säkra nivån själv när den startar, till papperskorgen). Ut ur repot till ett arkiv på Jakobs ord: `node tools/media-thin.ts --ta-bort <id> --varfor "<hans ord>" --arkiv <mapp>` |
| `node ../lager.ts` | kartan över allt som lagras i hela casino-repot: storlek per ställe och slag, vad inget pekar på, vad som väntar på hans dom och vad registren pekar på som saknas (`--json` som data) |
| `node tools/lager-remove.ts <sak> [--ja --vem <namn>]` | frågan före en radering (vad som raderas och följden); `--ja` raderar från disken, utan papperskorg, och kvittot säger vem. Samma verktyg och spärrar som Radera i Biblioteket och Prov |

Serverns adresser står i `tools/lab-routes.ts`, och vägarna till resten av casino-repot i `tools/casino-routes.ts`
(verkstädernas servrar, måtten ur `../matt.ts --json`, avatarernas vägar); utan media på datorn visar studion och
spelet inga filmer.

## Studion

[Studion](http://127.0.0.1:4319/studio/) är allt i webbläsaren och ingången till hela casino-repot (Jakob 2026-11-27): den
öppnar på Start, med kedjan från bild till film och en ruta per verkstad. Verkstäder med en egen server (dockans editor
i `../standarddocka/`) visas inne i studion med menyn kvar (`studio/components/workshop/`); servern startar deras
servrar som sina egna barn första gången vyn öppnas, och stoppar dem när den själv stoppas. En som redan svarar på sin port (`/vem`) startas inte igen. Den har två lager:

- **Ramen** (menyn, rubrikraden, panelerna, knapparna) är Next.js, React och Tailwind. Färger och mått står i
  `studio/app/globals.css`, menyn i `studio/components/shell/Rail.tsx` och byggstenarna i `studio/components/ui/`
  (provsida: `/studio/ui/`). En ändring syns efter `npm --prefix studio run build` och en omladdning.
- **Bildytan** i mitten är annan kod, som ramens stil inte når: filmspelaren (`studio/components/player/`), dockans
  editor (`../standarddocka/editor/` i en ram), scenen (three.js, `src/scene3d-*.ts`) och spelet (`game/page/game.html`
  i en ram). Ljud och 3D-sidan (`/scene3d.html`, scenen med alla reglage) är egna HTML-sidor i `pages/`.

Orden står i studions Ordlista (`studio/lib/words.ts`). Menyn följer kedjan: Start, Avatarer, Dockan, Karta, Beställ,
Granska, Casino, Mått, Spegla och Biblioteket, och i foten Beslut och Ordlista. En standard gäller överallt, livebordet
(`src/standard.ts`, `docs/SYSTEM.md`), så studion har inget val av bord. Vyerna:

- **Start** (`/studio/`, `studio/components/start/`, innehållet i `studio/lib/start.ts`): det som väntar på hans dom,
  kedjan med verkstaden för varje steg, en ruta per verkstad och det som ligger vid sidan (Ljud).
- **Avatarer** (`/studio/avatarer/`, `studio/components/avatars/`): en guide över `../avatar-auto-pipeline/vagar.json`
  (`studio/lib/avatars.ts`, genom `GET /api/vagar`). Vägarna med Version 1 för sig och stegen med kostnad och vad som
  finns i `output/<person>/`; Delarna med alternativen och reglerna; Föremål och material med de färdiga modellerna i
  3D (`studio/components/avatars/ModelView.tsx`). Startar ingen körning.
- **Dockan** (`/studio/dockan/`): dockornas editor ur `../standarddocka/` i en ram, startad när vyn öppnas; ord i
  adressen går vidare till editorn (`/studio/dockan/?docka=frasse&plats=4`).
- **Mått** (`/studio/matt/`): `../MATT.md`:s text, läst ur koden varje gång (`studio/lib/measures.ts`), utan filnamn och
  källkolumner, med delarna som en rad knappar överst.
- **Spegla** (`/studio/spegla/`, `studio/components/spegla/`, `studio/lib/spegla.ts`): Youtubefilmens bordsbild och vår vy av
  samma giv på varandra i 1728 x 972 och i takt (vår ruta k mot filmens sekund ur lyftet), halvt om halvt, delad eller
  bredvid; vår vy är dockans inspelning (`../standarddocka/klipp/live-lyft-<docka>-p<n>-hela-kameran-<docka>.mp4`, nyare än
  lyftet) eller en persons film ur ett prov. `tools/spegla-routes.ts` (`/api/spegla`) strömmar filmen där den ligger, bara på
  den här datorn; testet `tools/spegla-routes.test.ts` håller den och vägarna borta från kopian.
- **Karta** (`/studio/karta/`): **Schemat**, dockornas rörelseschema. För den valda dockan en runda som en väg med det
  som saknas i rött och Spela i Dockan, kortplatserna med vad hon har, och rörelseschemat ur
  `../standarddocka/rorelsekatalog.json` som en bild: ankarena i rundans ordning, hennes rörelser som pilar och resten
  bakom Visa det som saknas, stadierna som en rad över. Koden: `studio/components/schemat/`, `studio/lib/schemat.ts`, ur
  `GET /api/schema` (`tools/schema-routes.ts`), som läser katalogen, `../live-bj/data/segment.json` och filerna varje
  gång; `node tools/schema-routes.ts` skriver ut där katalogen och filerna inte säger samma sak.
- **Beställ** (`/studio/bestall/`, `studio/components/order/`): beställningarna hos Runway, kön och en order att
  godkänna och skicka (skillen `bestalla-film`).
- **Granska**: Filmer (Jakobs domar) och Prov (provmapparna under `assets/proofs/`, `?prov=<mapp>`). Ett prov visar den
  oberoende domarens dom skild från hans egen (`domare` i `proof.json`, `studio/components/proofs/DomarePanel.tsx`): dess
  bricka, skälen, det den skulle rätta och den externa rösten; där de två är oense märks provet och står först i sitt
  område. Radera provet raderar från disken med Bibliotekets fråga (`studio/components/bibliotek/RaderaFraga.tsx`).
- **Biblioteket** (`/studio/bibliotek/`, `studio/components/bibliotek/`, `studio/lib/bibliotek.ts`): allt som lagras i
  casino-repot ur kartan `../lager.ts` (`tools/lager-routes.ts`: `/api/lager`, `/api/lager/fraga`, `/api/lager/radera`,
  `/api/lager/fil`), per slag: överst fyra tal, sedan varje sak som en liten bild med namn och storlek (små bilder och
  rutor ur filmerna görs av servern i `.runtime/miniatyrer/`). En sak öppnas med bilden stor (modeller i 3D), var den
  används och hans ord; livebordets film och bilder bara som storlek. Kartan, frågan och raderingen körs i en egen
  process, så att servern aldrig står still; en radering tar saken ur den senaste kartan i stället för att räkna om.
  Radera tar den från disken (`tools/lager-remove.ts`); `?slag=`, `?enhet=` och `?fraga=` i adressen väljer.
- **Casino** (`/studio/game/`): spelet med vald look, samma spel som `/game.html` (2026-11-17), vid livebordet
  (`src/game-page.ts`): livebordets kamera, bord, sko, låda, kortplatser och ringar, och spelets kort på de mätta
  platserna (`createLayout` i `src/game-table.ts`, `liveProps` i `src/game3d-props.ts`). Utan godkända filmer visas bordet utan
  dealer.
- I foten **Beslut** (det som väntar på Jakobs svar) och **Ordlista**. Det som hör ihop är en knapp.
- En vy för alla skärmar: en mobilvy härleds ur samma kort och kamera. Dealerväxeln visar dealrarna i
  `data/dealers.json`, den första som förval (ingen dealer är namngiven i koden, `studio/lib/dealer.ts`); utan dealer
  finns ingen växel, och dockorna är inga dealrar. En pausad dealer visas bara när en adress nämner den (Jakob
  2026-11-18).

Kopian på nätet (`dealer-lake.vercel.app`) har samma meny utan sparning, och i stället för Beslut
Önskemål och boten.

## Var fakta ligger

- `data/motions.jsonl`: filmregistret, en post per film och tagning med Jakobs dom; läses och skrivs genom
  `tools/register-store.ts`, med en SQLite-kopia under `.runtime/register/` (`node tools/register.ts get <id>`).
- `data/clip-jobs.json`: klippbankens ankare, jobb och härledda tagningar.
- `data/orders/<id>.json`: beställningarna; `data/order-methods.json` receptet per steg; `data/order-policy.json` taken,
  fullmakten och priserna. Anrop utanför Beställ står i liggaren `.runtime/runway-api/ledger.json`.
- `data/dealers.json` och `data/media-roles.json`: vilka dealrar som finns och vilka bilder som gäller.
- `data/dealer-trees.json`, `data/dealer-compositions.json`: dealrarnas träd och kompositioner, som spelet läser
  (`?trad=`, `?komposition=`).
- `data/decisions.json`: korten i Beslut; bara sidan skriver hans svar (`tools/decision-store.ts`).
- `data/proof-notes.json`: hans ord om proven; `node tools/proof-notes.ts` visar det olästa, `--answer <nr> "<text>"`
  svarar och `--read <nr>` markerar läst.
- `data/rendered-references.json`: dockans filmer, med kamera och en styrbild per person
  (`tools/doll-reference-put.ts`). `data/speech.json` (replikerna) och den tomma `data/speech-patches.json` står kvar
  tills inget läser dem.
- `dealer3d/data/`: dockornas lyfta rörelser och ankare (`lyft-<docka>-*.json`, `ankare-*-<docka>.json`), skrivna av
  `dealer3d/tools/lyft-till-docka.ts`; persondockorna i `dealer3d/src/persondockor.ts`, skrivna av
  `../avatar-auto-pipeline/ny_dealer.py`.
- `data/manifest.json`: filernas ursprung och SHA-256.
- `data/scene-presets/<namn>.json`: utseendena (förvalen); Casino spelar `casino`. `data/play-view-live.json`:
  spelvyn vid livebordet, inramningen för dator och mobil som gäller alla utseenden (`tools/play-view-store.ts`).
- `placements/default.json`: Jakobs kortplan (16 kort och D.C3) i klippbankens bild, läst genom `src/plan-lens.ts`
  av kontrollerna av bankens filmer och den äldre beställningsvägen.

Media (`assets/`), `.runtime/`, `.env*` och `private/` är lokala och Git-ignorerade.
