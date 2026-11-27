# blackjack-dealer

En filmad dealer till Jakobs blackjackspel: två kort till sju spelare och dealern, med trovärdig utdelning. Rörelserna
är korta filmklipp mellan fasta ankare (vila, redo, kortets plats) i en klippbank; en runda är en väg genom klippen,
och samma rundor spelas i studion, i 3D-scenen och i spelet. Dealern heter Paow. Filmerna beställs hos Runway och
dockan i `dealer3d/` styr deras rörelse. Projektet är mappen `blackjack-dealer` i det publika repot
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
src/            den delade motorn: 3D-scen, klippgraf, kort, kortplan, beställningar, tal
dealer3d/       dockan: bordets verkliga geometri, givar som tal och dockans filmer
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
| `npm run gallra`, `npm run media:status` | plan för vad i `assets/` som raderas (servern utför den säkra nivån själv när den startar, till papperskorgen); översikt över lagringen. På Jakobs ord: `node tools/media-thin.ts --ta-bort <id> --varfor "<hans ord>" [--arkiv <mapp>]` |
| `node ../lager.ts` | kartan över allt som lagras i hela casino-repot: storlek per ställe och slag, vad inget pekar på och vad registren pekar på som saknas (`--json` som data). Radering på riktigt, med frågan och spärrarna: `tools/lager-remove.ts`, från Biblioteket |

Serverns adresser står i `tools/lab-routes.ts`, och vägarna till resten av casino-repot i `tools/casino-routes.ts`
(verkstädernas servrar, måtten ur `../matt.ts --json`, avatarernas vägar); utan media på datorn visar studion och
spelet inga filmer.

## Studion

[Studion](http://127.0.0.1:4319/studio/) är allt i webbläsaren och ingången till hela casino-repot (Jakob 2026-11-27): den
öppnar på Start, med kedjan från bild till film och en ruta per verkstad. Verkstäder med en egen server (dockans editor
i `../standarddocka/`, kortpaketets visare i `../kortspelspaket/`) visas inne i studion med menyn kvar
(`studio/components/workshop/`); servern startar deras servrar som sina egna barn första gången vyn öppnas, och
stoppar dem när den själv stoppas. En som redan svarar på sin port (`/vem`) startas inte igen. Den har två lager:

- **Ramen** (menyn, rubrikraden, panelerna, knapparna) är Next.js, React och Tailwind. Färger och mått står i
  `studio/app/globals.css`, menyn i `studio/components/shell/Rail.tsx` och byggstenarna i `studio/components/ui/`
  (provsida: `/studio/ui/`). En ändring syns efter `npm --prefix studio run build` och en omladdning.
- **Bildytan** i mitten är annan kod, som ramens stil inte når: filmspelaren (`studio/components/player/`), scenen
  (three.js, `src/scene3d-*.ts`), dockan (`dealer3d/page/docka.html` i en ram) och spelet (`game/page/game.html` i en
  ram). Ljud är en egen HTML-sida i `pages/`, nådd från Start.

Orden står i studions Ordlista (`studio/lib/words.ts`). Menyn följer kedjan: Start, Avatarer, Dockan, Filmverkstaden, Granska,
Karta, Material, Casino, Mått och Biblioteket. Under dealerväxeln (med Standarddockan under rubriken Docka) står valet
**Standard**: Live eller Förra, alltså Livestandarden eller Förra standarden (namnen ur `src/uppsattning.ts`;
`studio/lib/uppsattning-val.ts`, `studio/components/shell/Setup*.tsx`): ett val för hela studion, ihågkommet i webbläsaren,
förvalt Live, och `?uppsattning=` i en adress väljer. Dockan skickar ordet till editorn,
Casino till spelet (`studio/lib/casino.ts` gameSrc), och Mått märker det valda. Filmverkstaden bygger Scen under valet med
dess egen spelvy (Spara som spelvy sparar mot det valda, `/api/play-view?uppsattning=`) och spelar där bara filmer som är
gjorda vid vald standard (annars bordet utan dealer och en rad som säger varför; `docs/SYSTEM.md`), och en ny beställning bär valet
(`studio/lib/new-film.ts` draftBody; beställningen görs där, eller säger varför inte). Beställningarnas bilder visas i sin
egen form (bildens mått, annars orderns uppsättnings, `shapeOf` i `studio/lib/orders.ts`). Dockan i Inspelning står ännu
vid förra standardens bord. Vyerna:

- **Start** (`/studio/`, `studio/components/start/`, innehållet i `studio/lib/start.ts`): det som väntar på hans dom,
  kedjan med verkstaden för varje steg, en ruta per verkstad och det som ligger vid sidan (Kortpaketet, Lipsync, Ljud).
  En gammal Scen-adress (`/?runda=…`) leder fortfarande till Filmverkstadens Scen.
- **Avatarer** (`/studio/avatarer/`, `studio/components/avatars/`): en guide över `../avatar-auto-pipeline/vagar.json`
  (`studio/lib/avatars.ts`, genom `GET /api/vagar`). Vägarna med Version 1 för sig och stegen med kostnad och vad som
  finns i `output/<person>/`; Delarna med alternativen och reglerna; Föremål och material med de färdiga modellerna i
  3D (`studio/components/avatars/ModelView.tsx`). Startar ingen körning.
- **Dockan** (`/studio/dockan/`): standarddockans editor i en ram; ord i adressen går vidare till editorn
  (`/studio/dockan/?uppsattning=live`). **Kortpaketet** (`/studio/kortpaketet/`) på samma sätt.
- **Mått** (`/studio/matt/`): `../MATT.md`:s text, läst ur koden varje gång (`studio/lib/measures.ts`), utan filnamn och
  källkolumner; delen Vårt bord och livebordet (`?del=livebordet`, `studio/lib/setups.ts`) räknar standarden och klonen
  ur `src/table-lens.ts` och `src/table-live.ts` i webbläsaren: uppifrån, genom var sin kamera, i tal, och de lyfta
  dealrarnas filmer ur provet `danilo-frasse-i-editorn-20261127`.
- **Filmverkstaden** (hette Bordet till 2026-11-27; adressen är kvar, `/studio/bordet/`) är den enda vyn av bordet (Jakob 2026-11-17, 2026-11-19): **Inspelning**, filmens format (dockan vid bordet
  med kortplanens kort, skon och markerlådan genom filmens kamera), i tre steg (var kortet landar; hur det kommer dit;
  beställ), **Kön** (godkännande och Protokoll), **Scen** (en runda i 3D-scenen), **Råfilm** och **Efterarbete** (korten
  och markerna över filmen). I koden och adressen heter Inspelning `kortplan`, sitt gamla namn (`?lage=kortplan`).
  Inspelning har en bild (Jakob 2026-11-25: "ett och samma läge", "allt i 3d"): dockans 3D-bord i en ram
  (`dealer3d/page/docka.html`), med planens kort på filten och utkastet synligt direkt; dockans reglage står i studions högerspalt under steg 2. Spara skriver bara `placements/default.json`;
  dockans reglage är till för att pröva och sparas inte: en beställning filmar dockans giv utan dem.
- **Karta**: dealerns träd, valda i en lista överst (Alla träd, träden, kompositionerna). Ett träd ritas med sina bilder och
  36 steg; ett träd med flera sätt att dela ut från samma A1 (Tatuerad: A2.3 och nypet från A2.1) har en grenväljare. Ett steg
  visar sina filmer som spelet spelar dem i just det trädet (Primär, sekundära, Gör primär), och talet ligger på A1. Alla träd
  (`?trad=alla`) är nätet: A1, grenarna till ankarna vid skon (i dag A2.1 och A2.3) och stegen under dem, med sök, "bara där de skiljer sig" och
  Sätt ihop till en komposition. Koden: `studio/components/map/`, träden ur `GET /api/trees` (`tools/dealer-tree.ts`).
- **Granska**: Filmer (Jakobs domar) och Prov (provmapparna under `assets/proofs/`, `?prov=<mapp>`). Ett prov visar den
  oberoende domarens dom skild från hans egen (`domare` i `proof.json`, `studio/components/proofs/DomarePanel.tsx`): dess
  bricka, skälen, det den skulle rätta och den externa rösten; där de två är oense märks provet och står först i sitt
  område. Radera provet raderar från disken med Bibliotekets fråga (`studio/components/bibliotek/RaderaFraga.tsx`).
- **Biblioteket** (`/studio/bibliotek/`, `studio/components/bibliotek/`, `studio/lib/bibliotek.ts`): allt som lagras i
  casino-repot ur kartan `../lager.ts` (`tools/lager-routes.ts`: `/api/lager`, `/api/lager/fraga`, `/api/lager/radera`,
  `/api/lager/fil`), per slag, med storlek, var det används, vad som väntar på hans dom och vad som går att göra om
  gratis; överst hur mycket som ligger var och hur mycket som inget pekar på. En enhet öppnas med sin användning och en
  miniatyr (modeller i 3D); livebordets film och bilder bara som storlek och antal. Radera tar den från disken
  (`tools/lager-remove.ts`); `?slag=`, `?enhet=` och `?fraga=` i adressen väljer.
- **Material** (vilka bilder som gäller), **Casino** (spelet med vald look), och från Start **Lipsync** (hur munnen
  görs, skrivskyddad) och Ljud.
- **Spelet vid livebordet** (`/game.html?uppsattning=live`; utan ord livebordet när ett träd gjort vid det spelas, annars
  förra standarden med en rad som säger det, `src/game-page.ts`): livebordets kamera, bord, sko, låda, kortplatser och
  ringar, och spelets kort på de mätta platserna (`src/game-table.ts` liveLayout, `src/game3d-props.ts` liveProps). Utan
  godkända filmer vid livebordet visas bordet utan dealer. Uppsättningen och dess regler: `docs/SYSTEM.md`, Standarden.
- I foten **Beslut** (det som väntar på Jakobs svar) och **Ordlista**.
  **Jämför** nås från en tagning. Det som hör ihop är en knapp, och Casino i menyn är samma spel som spelet (2026-11-17).
- En vy för alla skärmar: en mobilvy härleds ur samma kort och lins. Paow står först; en pausad dealer visas bara när en
  adress nämner den (Jakob 2026-11-18).

Kopian på nätet (`dealer-lake.vercel.app`) har samma meny utan Lipsync och utan sparning, och i stället för Beslut
Önskemål och boten.

## Var fakta ligger

- `data/motions.jsonl`: filmregistret, en post per film och tagning med Jakobs dom; läses och skrivs genom
  `tools/register-store.ts`, med en SQLite-kopia under `.runtime/register/` (`node tools/register.ts get <id>`).
- `data/clip-jobs.json`: klippbankens ankare, jobb och härledda tagningar.
- `data/orders/<id>.json`: beställningarna, var och en gjord för en uppsättning (fältet `uppsattning`, utan fält den förra
  standarden); `data/order-methods.json` receptet per steg; `data/order-policy.json` taken, fullmakten och priserna.
- `data/dealers.json` och `data/media-roles.json`: vilka dealers som finns och vilka bilder som gäller.
- `data/dealer-trees.json`, `data/dealer-compositions.json`: träden och kompositionerna i Karta.
- `data/decisions.json`: korten i Beslut; bara sidan skriver hans svar (`tools/decision-store.ts`).
- `data/proof-notes.json`: hans ord om proven; `node tools/proof-notes.ts` visar det olästa, `--answer <nr> "<text>"`
  svarar och `--read <nr>` markerar läst.
- `data/rendered-references.json`: dockans filmer, med uppsättning, kamera och en styrbild per person
  (`tools/doll-reference-put.ts`); `data/speech.json`, `data/speech-patches.json` och `data/lipsync.json`:
  talet.
- `data/manifest.json`: filernas ursprung och SHA-256.
- `data/scene-presets/<namn>.json`: utseendena (förvalen) i Scen; Casino spelar `casino`. `data/play-view.json`:
  spelvyn, inramningen för dator och mobil som gäller alla utseenden; bara Scen skriver den (`tools/play-view-store.ts`).
- `placements/default.json`: Jakobs kortplan (16 kort och D.C3), sparad från Bordet.

Media (`assets/`), `.runtime/`, `.env*` och `private/` är lokala och Git-ignorerade.
