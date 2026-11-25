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
pages/          sidorna bredvid studion: 3D-sidan (scene3d.html), Ljud (sound.html), Modeller (props.html) och Grafik (kortlandning.html)
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
| `npm start` | startar servern på `http://127.0.0.1:4319` utan fönster och visar studion i en flik; bygger studion om den saknas |
| `npm run status`, `npm run stop` | frågar och stoppar servern; `node tools/preview.ts --open "<sida>"` visar en sida i den nyaste öppna fliken (flera flikar får vara öppna samtidigt), `--restart` byter server |
| `npm --prefix studio run build` | bygger studion på plats till `studio/out/` |
| `npm test` | kärnans tester, offline och utan media |
| `npm run hooks:install`, `npm run check` | installerar kontrollen före push för hela casino-repot; kör den på de commits som ska ut |
| `npm run verify` | jämför registrerade filer med sin hash i `data/manifest.json` (kräver media) |
| `npm run stada` | raderar projektets del av slasken som är äldre än sju dygn, utom `granska/` (`-- --torr` listar bara); `node ../slask/slask.ts` visar hela slasken |
| `npm run gallra`, `npm run media:status` | plan för vad i `assets/` som raderas (servern utför den säkra nivån själv när den startar); översikt över lagringen |

Serverns adresser står i `tools/lab-routes.ts`; utan media på datorn visar studion och spelet inga filmer.

## Studion

[Studion](http://127.0.0.1:4319/studio/) är allt i webbläsaren och öppnar på Bordet. Den har två lager:

- **Ramen** (menyn, rubrikraden, panelerna, knapparna) är Next.js, React och Tailwind. Färger och mått står i
  `studio/app/globals.css`, menyn i `studio/components/shell/Rail.tsx` och byggstenarna i `studio/components/ui/`
  (provsida: `/studio/ui/`). En ändring syns efter `npm --prefix studio run build` och en omladdning.
- **Bildytan** i mitten är annan kod, som ramens stil inte når: filmspelaren (`studio/components/player/`), scenen
  (three.js, `src/scene3d-*.ts`), dockan (`dealer3d/page/docka.html` i en ram) och spelet (`game/page/game.html` i en
  ram). Sidorna bredvid (Ljud, Modeller, Grafik) är egna HTML-sidor i `pages/`.

Orden står i studions Ordlista (`studio/lib/words.ts`). Vyerna:

- **Bordet** är den enda vyn av bordet (Jakob 2026-11-17, 2026-11-19): **Inspelning**, filmens format (dockan vid bordet
  med kortplanens kort, skon och markerlådan genom filmens kamera), i tre steg (var kortet landar; hur det kommer dit;
  beställ), **Kön** (godkännande och Protokoll), **Scen** (en runda i 3D-scenen), **Råfilm** och **Efterarbete** (korten
  och markerna över filmen). I koden och adressen heter Inspelning `kortplan`, sitt gamla namn (`?lage=kortplan`).
  Inspelning har en bild (Jakob 2026-11-25: "ett och samma läge", "allt i 3d"): dockans 3D-bord i en ram
  (`dealer3d/page/docka.html`), med planens kort på filten och utkastet synligt direkt; dockans reglage står i studions högerspalt under steg 2. Spara skriver bara `placements/default.json`;
  dockans rörelse sparas med Spara som standard (`dealer3d/standard/`).
- **Karta**: dealerns träd, varje stegs Primär och sekundära filmer, kompositionerna och talet.
- **Granska**: Filmer (Jakobs domar) och Prov (provmapparna under `assets/proofs/`, `?prov=<mapp>`).
- **Material** (vilka bilder som gäller), **Lipsync** (hur munnen görs, skrivskyddad), **Casino** (spelet med vald look).
- I foten **Beslut** (det som väntar på Jakobs svar), **Ordlista**, och sidorna Ljud, Modeller och Grafik (prov).
  **Jämför** nås från en tagning. Det som hör ihop är en knapp, och Casino i menyn är samma spel som spelet (2026-11-17).
- En vy för alla skärmar: en mobilvy härleds ur samma kort och lins. Paow står först; en pausad dealer visas bara när en
  adress nämner den (Jakob 2026-11-18).

Kopian på nätet (`dealer-lake.vercel.app`) har samma meny utan Lipsync och utan sparning, och i stället för Beslut
Önskemål och boten.

## Var fakta ligger

- `data/motions.jsonl`: filmregistret, en post per film och tagning med Jakobs dom; läses och skrivs genom
  `tools/register-store.ts`, med en SQLite-kopia under `.runtime/register/` (`node tools/register.ts get <id>`).
- `data/clip-jobs.json`: klippbankens ankare, jobb och härledda tagningar.
- `data/orders/<id>.json`: beställningarna; `data/order-methods.json` receptet per steg; `data/order-policy.json` taken,
  fullmakten och priserna.
- `data/dealers.json` och `data/media-roles.json`: vilka dealers som finns och vilka bilder som gäller.
- `data/dealer-trees.json`, `data/dealer-compositions.json`: träden och kompositionerna i Karta.
- `data/decisions.json`: korten i Beslut; bara sidan skriver hans svar (`tools/decision-store.ts`).
- `data/proof-notes.json`: hans ord om proven; `node tools/proof-notes.ts` visar det olästa, `--answer <nr> "<text>"`
  svarar och `--read <nr>` markerar läst.
- `data/rendered-references.json`: dockans filmer; `data/speech.json`, `data/speech-patches.json` och `data/lipsync.json`:
  talet.
- `data/manifest.json`: filernas ursprung och SHA-256.
- `data/scene-presets/<namn>.json`: utseendena (förvalen) i Scen; Casino spelar `casino`. `data/play-view.json`:
  spelvyn, inramningen för dator och mobil som gäller alla utseenden; bara Scen skriver den (`tools/play-view-store.ts`).
- `placements/default.json`: Jakobs kortplan (16 kort och D.C3), sparad från Bordet.

Media (`assets/`), `.runtime/`, `.env*` och `private/` är lokala och Git-ignorerade.
