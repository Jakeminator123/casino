# Drift, anslutningar och återbruk

Rutiner som görs i dag, på vilken dator repot än ligger. Slå upp ett avsnitt (sök på rubriken), läs inte hela. Läget
och ägarna står i HANDOFF och i banornas lägesfiler (`docs/lage/`), beslut per film i filmregistret
(`data/motions.jsonl`), Jakobs besked i [BESKED](BESKED.md).

## Repot och ansvar

- Repot är mappen `dealer`, utcheckad från `https://github.com/Jakeminator123/dealer.git` (publikt, källförvaring,
  ingen publicerad sida). Verktygen räknar sina sökvägar från repots rot; slasken och byggträdet ligger bredvid.
- Scoutgaming (`Jakeminator123/scoutgaming`) och det tidigare projektet snyggare-dealer (i arkivet utanför repot) är
  bara läsreferenser; projektet är frikopplat (BESKED, "Frikopplat från Scoutgaming") och ändrar inget där.
- Huvudagenten är chatten Jakob arbetar med: den äger commits, taggar och push. Underagenter och andra chattar
  lämnar över en fillista. Vad som kräver Jakobs uttryckliga ord står i AGENTS, "Det som skyddar Jakob".

## Git och kontroller

Avslutningsrutinen för färdiga egna ändringar (Jakob har godkänt den): uttrycklig staging av egna filer → commit →
`npm run check` (hela sviten, en gång) → vanlig push → verifierad fjärr-SHA. Ingen bakgrundsbevakare och ingen
automatisk commit. En push är skild från deploy, mediauppladdning och generering.

- Aktivera en gång per checkout: `npm run hooks:install` (vägrar skriva över en annan hooksPath).
- `.githooks/pre-push` granskar hela intervallet av nya commits, även känsliga filer som lagts till och sedan tagits
  bort. Lokala media/env-mappar, binärt material, filer över 5 MiB och vissa tokenmönster stoppar push.
  Mönsterkontrollen är ett extra skydd, ingen garanti att alla hemligheter upptäcks; granska alltid diffen.
- Testerna avser exakt den commit som pushas. Öppna filer i arbetsmappen stoppar aldrig en push (BESKED, "Rensa bort
  regler och låsningar som blockerar"): har commiten ett grönt körkvitto (högst 6 timmar) går pushen direkt, annars
  ställer kontrollen byggträdet `../dealer-bygg` bredvid repot på commiten och kör `npm run check` där. Finns trädet
  inte skriver kontrollen ut kommandot som gör det. Det som stoppar är ett fynd i de utgående commitarna eller ett rött
  test på just den commiten.
- Sviten är de testfiler `test`-skriptet i `package.json` namnger, läst ur commiten (`tools/*.test.ts`,
  `studio/tests/*.test.ts` och dockans); en ny testfil där körs utan att skrivas in. Högst fyra arbetare, utan Runway,
  media, FFmpeg eller deploy. Node: samma huvudversion som i `package.json`. GitHub kör ingen kontroll (BESKED, "Inget
  körs hos GitHub").
- **Push medan andra skriver:** en vanlig `git push` från huvudträdet går också med andras öppna filer. `node
  tools/push-clean.ts [<commit>] --trad <mapp> [--dry-run]` behövs bara för en annan commit än HEAD eller en
  torrkörning; verktyget skriver ut sina steg och loggar i `push-logg` bredvid trädet. Båda använder samma byggträd
  och vägrar huvudträdet, ett annat repos träd och ett byggträd som inte är rent. Det som pushas är incheckade
  commits, aldrig någons öppna filer.
- **Testerna läser Jakobs arbetsfiler som de är incheckade:** kortplanen och oincheckade utkast i `data/orders/` tas ur
  HEAD med `tools/committed.ts`, så att rött i huvudträdet är ett verkligt fel och inte hans osparade arbete.
- **Agentinställningarna** i `.claude/settings.json` gäller bara Claude Code med `dealer` som arbetsyta: nekad läsning
  av modeller, film, ljud, arkiv och låsfiler, och läsvakten (AGENTS, "Läs först"; en kodfil över 100 KB nekas
  också). Sökningens motsvarighet för alla verktyg är `.ignore` och `.cursorignore`.
- **Rött:** stoppa och rätta orsaken (AGENTS, "Regler och spärrar"). **Gult:** åtgärda, eller skriv en kvarvarande
  begränsning kort i `docs/BRISTER.md`.
- Känd Node-varning: `stripTypeScriptTypes` (`forBrowser` i `tools/lab-routes.ts`) är ett experimentellt API; varningen
  står kvar synlig, och kompatibiliteten utreds när API:t eller Node ändras.
- **Grenar och taggar:** en kortlivad gren slås ihop i `main` och tas bort, lokalt och på GitHub. Ett läge som ska gå att
  komma tillbaka till får en tagg på den pushade commiten (satt på utcheckad HEAD, aldrig flyttad); det som ligger
  utanför Git kopieras då SHA-256-jämfört till arkivet utanför repot. De två återställningsbara versionerna hittills
  har taggarna `fore-struktur` och `aterstallningsbar-version-2`.
- Tak har bara HANDOFF, lägesfilerna och AGENTS (`tools/handoff.test.ts`); hur sidorna är uppställda bestämmer den som
  skriver.

## Labbservern och fliken

- `START.cmd` kör `node tools/preview.ts --open`: servern på `http://127.0.0.1:4319` startas vid behov i ett eget
  fönsterlöst processträd (TEMP och TMP på `.runtime/tmp`). `STATUS.cmd` och `STOPP.cmd` frågar och stoppar
  via kontrollkanalen; `--restart` byter server utan att fliken stängs; `--ensure` startar den utan att röra en flik.
- Sidorna i `pages/` och `game/page/` lämnas ut på sina rotadresser (`/scene3d.html`, `/sound.html`, `/props.html`,
  `/game.html`) via `PAGES` i `tools/lab-routes.ts`; `/` och `/lab.html` leder till studion.
- **Servern lämnar ut arbetsträdet, och bara modulerna i sin lista** (`SCRIPTS` i `tools/lab-routes.ts`, läst när
  servern startar), så en halvfärdig fil syns direkt i Jakobs flik. En ny modul under `src/`: filen på plats, raden i
  listan, omstart (`--restart`, huvudagenten, i en lucka utan tagning), sist importen; annars ger modulen 404 och varken
  spelet eller Scen laddar. `node --test tools/lab-modules.test.ts` säger vilken modul som saknas.
- **En inspelning säger varje nyckel som kan ändras** i tagningens adress (`filmEven`, `filmTempo`, `dealerLife`, `cups`,
  `cards`), eftersom scenens förval kan ändras samma dag.
- **En labbflik:** varje labbsida håller en ström mot servern (`/tab/events`); den nyaste är labbfliken och en äldre
  stänger sig. `node tools/preview.ts --open "<sida>"` återanvänder den öppna fliken; öppna aldrig labbadressen med
  `Start-Process` eller `start`.
- **Studion byggd ur det incheckade:** `node tools/studio-from-commit.ts [<commit>] --trad <byggträdet> [--ut <mapp>]`
  bygger commiten (förval `main`) i byggträdet och byter in den i huvudträdets `studio/out` först när bygget lyckats;
  `studio/out/bygge.json` säger vilken commit som visas. Loggar i `studio-logg` bredvid trädet; servern startas inte om.
- **En titt på labbsidor:** `node tools/lab-look.ts <lista.json> <utmapp> [--vad "<vad>"] [--vem <namn>]` tar en
  skärmbild per sida i en egen headless Chrome (port 9591, `robot=1`, aldrig i Jakobs flik), under det delade låset
  `gpu-och-headless.lock` i slasken (regeln i [TAL](TAL.md), "Så skickas ett jobb"); den väntar högst 20 minuter på
  låset. Chrome hittas genom `CHROME` eller de vanliga installationsvägarna, och profilerna ligger i slasken. Listan
  trycker bara på det som ställer vyn, aldrig det som sparar.

## Anslutningar och miljö

| Anslutning | Gäller |
| --- | --- |
| GitHub connector och CLI | Kontot `Jakeminator123`; repot är publikt sedan 2026-11-10. CLI och connector har var sin inloggning. |
| Runway connector | Workspace `Jakob`, ID `67037521`. Inloggning och skrivschema kontrolleras var för sig: modellistan från `whoami` visar inte att klienten kan skicka modellens parametrar. |
| Runway MCP-server | `https://mcp.runwayml.com/mcp`, appkontots krediter. Namnet och inloggningen är varje klients egna. `https://dev.runwayml.com/mcp/claude` är utvecklarportalen, inte för generering. |
| Direkt API | När MCP-inloggningen saknas (BESKED, "API-nyckeln"): klienten `tools/runway-api.ts` (`lagg` och `hamta` för en order i Beställ, genom kvittoverktyget; `place` och `collect` för ett prov utanför Beställ; `org` för saldot) och dess enda liggare `.runtime/runway-api/ledger.json`, som `tools/order-import.ts` läser. Taken är `data/order-policy.json`:s. `RUNWAY_API_KEY` i den Git-ignorerade `.env.local`, developer-projektets krediter, en annan pott än appkontots. Kling 4 och sedan 2026-11-23 WAN 3 (`wan3`: första och sista bild i `promptImage` med `position`, `ratio: auto_1080p`, `audio: false`; ger bankens 1764 × 1174 utan ljud, 20 krediter per s). |

- Saknar klientens MCP-schema Kling 4 eller `referenceVideos`: använd det direkta API:t eller en klient som har dem
  (`whoami` och det faktiska schemat först), med ett enda godkänt anrop genom samma `order-put begin/placed` (`--via
  mcp` eller `--via api`). Spara task-id direkt, gör aldrig en automatisk omtagning, och kopiera inga
  OAuth-uppgifter mellan klienterna.
- Mellanbilder finns i [Klings API-kontrakt](https://docs.dev.runwayml.com/openapi.json) men inte i `generate_video`-schemat
  här; skicka dem inte som referensbilder. Vilken modell en film har läses i dess kvitto, inte i filnamnet. Modellråd:
  handbokens §3.8. Runways Dev-plugin (dokumentation och priser,
  ingen generering) är föreslagen men inte installerad.
- Nycklar skrivs aldrig i Git, manifest, dokument eller loggar. Blob-, databas- och andra inloggningsuppgifter kopieras
  inte utan ett konkret integrationsbehov.
- `.env.local` laddas inte automatiskt: kör verktyget med `node --env-file=.env.local <verktyg.ts>`.
  `DEALER_SCRATCH_ROOT` och `DEALER_REMOTE_GENERATION_ENABLED` läses inte av någon kod; slasken flyttas med
  `DEALER_SLASK`, och spärren för generering är `enabled` i `data/order-policy.json`.

## Filmbeställning

Ett jobb är en handling mellan två ankare (ankarregeln och skarvregeln i SYSTEM). Vägen för en ny dealer:
[löpande bandet](../tools/dealer-line.md); hur en beställning komponeras: [handboken](../tools/film-prompting.md); hur
den läggs och hämtas: [beställningsagenten](../tools/order-clerk.md); granskningen: [film-review](../tools/film-review.md).
Vad som skickades och hur det gick: studions Protokoll (`node tools/order-ledger.ts`).

- **En väg: Beställ.** Utkast i `data/orders/<id>.json`, godkänt med Jakobs klick eller av huvudagenten på hans uppdrag
  (`tools/order-approve.ts`) inom `data/order-policy.json`, lagt och hämtat av en beställningsagent. Betalda anrop
  utanför Beställ rapporteras till huvudagenten med belopp (AGENTS, "Det som skyddar Jakob").
- **Kvitton från äldre vägar** (`data/clip-jobs.json`) är källbevis och står kvar; ett osäkert anrop
  beställs aldrig om, och `request.lock` eller SUBMITTING tas aldrig bort.
- **Inkorgen:** en tagning från en order förs in med `review.inbox: true` och spelas bara där steget saknar annan film
  tills Jakob har dömt den. Filmen ligger på ett ställe, `assets/motions/<klipp>/source.mp4`: posten med rollen film i
  `data/media-roles.json` pekar dit, och ingen kopia görs under `assets/films/`.

### Lärdomar som gäller

Det som gäller själva beställningen står i handboken och beställningsagentens instruktion; här det som rör banken.

- **Givar slutar på sitt ankare** (sista rutan 17–47 px från landningsankaret vid kvartsstorlek), så att returer från
  ankarbilden passar alla tagningar.
- **Skarvar:** varje klipp har ljusare grönt i sina första rutor och ett nivåhopp i de två sista; klipp tre rutor in och
  två före slutet. Frysta rutor inne i rörelser räknas vid granskning.
- **Helkropp:** in- och utgång beställs med en ritad ljusare grön bordsskiva ("flat cut-out shape with no depth"), som
  målas i bakgrundens grönt efteråt; en verklig stående ruta som slutbild låser hennes storlek, och helkroppsfilmen har
  egen ruta (`motion.frame`, SYSTEM).
- **Ansiktsuttryck** går inte med text, men med grundrutan där bara ansiktet bytts, spelad dit och baklänges tillbaka.
- **Båda händerna** går att få om slutbilden inte låser vilken hand som lade kortet; i givfilmerna har texten hittills
  sagt att den andra handen vilar.
- **Föremål** som inte finns i första bilden växer fram ur filten; en mugg måste finnas i bilden från början.
- **Kostnad för en hel dealer:** skattat cirka 5 000 krediter för en uppsättning med ett utdelningssätt (16 kort och
  omtagningar); Paow hade 2026-11-13 kostat cirka 5 400 utan att vara färdig (räknat ur kvittona).

## Den låsta kopian på nätet

Studion som låst kopia: allt går att läsa och spela, inget går att ändra, och inga kostnader visas. Det är den enda
sidan på nätet (BESKED, "En sida på nätet"); gamla labbet, dess Vercel-projekt och Blob-lager är raderade, och äldre
register bär adresser dit som inte längre svarar (det sista kvittot finns i Git-historiken).

- **Adress:** `https://dealer-lake.vercel.app`, den enda produktionsadressen för `dealer-studio`, med dörrarna `/casino`
  (spelet ensamt) och `/trailer` (filmen före spelet, sedan Paows casino). Lösenordet skrivs inte ut här. Vilken commit
  kopian bär säger `/meta.json`; läget står i [lägesfilen](lage/spelet.md).
- **Vercel:** team `jakeminator123s-projects` (Pro), projekt `dealer-studio`, utan Git-koppling: varje version läggs upp
  färdigbyggd. Projektets och teamets id står bara i `.runtime/studio-deploy/.vercel/project.json` (utanför Git).
- **Blob:** `dealer-studio-media`, public, `arn1`. Storens id står bara i kvittot och skrivs inte i repot: objekten
  heter efter sitt innehåll (`studio/<sha256>.<ext>`), och med id:t går varje film att hämta utan lösenord. Ett objekt
  skrivs aldrig över. Låset hämtar filmen med webbläsarens intervall (Range) och svarar privat
  (`DEALER_MEDIA_MODE=proxy`, förvalet i `cloud/studio/gate.ts`); omskrivning till Blob används inte, eftersom Vercels
  CDN då lämnade samma första 1 000 byte till varje fråga.
- **Låset:** `DEALER_LOSEN` (flera lösenord skiljs med komma) och `DEALER_KAKNYCKEL` (48 slumptecken, aldrig nedskrivna),
  Production, känsliga. Nytt lösenord: `vercel env rm DEALER_LOSEN production` och `printf '<ord>' | vercel env add
  DEALER_LOSEN production`, båda med `--cwd .runtime/studio-deploy`, sedan en ny deploy; gamla inloggningar slutar gälla.
- **Lösenord för bara spelet:** `DEALER_LOSEN_SPEL`, satt på samma sätt; ordet skrivs inte i repot. Det öppnar `/casino`
  och `/trailer` och det de läser (`GAME_HOME` och `TRAILER_HOME` i `cloud/studio/gate.ts`); studion, andra sidor och
  boten leder tillbaka till spelet. Ett ord i båda variablerna öppnar allt; att byta variabeln avslutar bara spelets
  inloggningar. Kontrollen prövar det med `DEALER_LOSEN_SPEL_PROV=<ordet>` framför kommandot.
- **Ett fel som bara syns på en telefon:** be om en skärmbild av `/trailer?diagnos=1` eller `/casino?diagnos=1`; sidan
  skriver webbläsaren, förlorad bildyta, senaste fel och filmköns läge (SYSTEM, "Filmkön"). En headless-inspelning
  visar inte vad en telefon gör.
- **Öppen utan lösenord** (BESKED, "Kopian är öppen för läsning"): `DEALER_OPPEN=allt` öppnar hela kopian för läsning,
  `spel` bara dörrarna, annat eller ingen variabel låser (`openOf` i `cloud/studio/gate.ts`). Boten och önskemålslådan
  kräver alltid hela kopians lösenord, och varje svar bär `X-Robots-Tag: noindex, nofollow`. Den står på `allt`. Låsa
  igen: `vercel env rm DEALER_OPPEN production --cwd .runtime/studio-deploy` och en ny deploy. Kontrollen får veta vad
  den ska vänta sig med `DEALER_OPPEN_PROV=allt` (eller `spel`).
- **Boten** följer med utan `BOT_BLOB_TOKEN`: den svarar att den saknar lagring och kostar inget. Att slå på den är
  Jakobs beslut.
- **Vad som går upp** (BESKED, "Media på nätet"): det spelet spelar för varje dealer i `casino.dealers` i
  `data/studio-release.json`, scenens egna filmer och filmen före spelet (gruppen `ingång`). Urvalet görs i `pickTakes`
  (`tools/studio-freeze.ts`), och bygget stannar om kopian skulle välja en annan tagning än labbet. `variants` tar med
  spelets oanvända varianter när han väljer det. Kartans runda, övriga tagningar och provmapparna stannar på datorn,
  och trailerproven hålls ute med `blocked.folders` (BESKED, "Trailrar hålls utanför kopian").
  Munlapparna (`data/speech-patches.json`) följer med när deras filer stämmer mot registret.
- **Tillståndet ligger utanför Git, i Jakobs utcheckning:** `.runtime/studio-deploy/` (länken, `build.json`,
  `media-plan.json`, trädet som läggs upp), `.runtime/studio-blob/.env.local` (storens nyckel och inget annat) och
  `.runtime/studio-blob/studio-media.json` (kvittot med varje films Blob-adress). Kvittot hör aldrig hemma i Git: repot
  är publikt, och adresserna skulle öppna varje film utan lösenord. `BLOB_READ_WRITE_TOKEN` i utcheckningens egen
  `.env.local` hör till talbanan och används aldrig här; `tools/sync-studio-media.ts` vägrar den. Kör aldrig `vercel
  blob …` eller `vercel env …` i repots rot.

### Publicera igen från en nyare commit

Bara på Jakobs uttryckliga ord (BESKED, "En publicering görs bara på hans uttryckliga ord").

```
node tools/publish-studio.ts --worktree <rent träd>                          planen; inget körs
DEALER_LOSEN_PROV=<ordet> node tools/publish-studio.ts --worktree <rent träd> --kor
```

Planen visar commit, arbetskopia och stegen, och `--kor` kör dem: bygget av `origin/main` (eller `--commit <ref>`) i det
valda rena trädet med en egen labbserver på 4341, uppladdning av det som är nytt, deploy och kontrollen utifrån.
Labbservern på 4319 startas och stoppas aldrig. Samma träd gäller för planen och körningen, och inget annat bygge körs
i det under tiden. `--kor --bara-bygge` bygger bara lokalt; `--utan-deploy` laddar upp men lägger inte ut. En första publicering tar cirka 40 minuter, en senare med få nya filmer cirka 6.

**Det som ska finnas på plats** (verktyget stannar med ett besked om något saknas):

- Körningen görs från Jakobs utcheckning, med koden pushad till `origin/main`; utcheckningens ocommittade filer kommer
  aldrig med.
- Länken `.runtime/studio-deploy/.vercel/project.json` (gjord med `vercel link --yes --project dealer-studio --scope
  jakeminator123s-projects --cwd .runtime/studio-deploy`), eller `VERCEL_ORG_ID` och `VERCEL_PROJECT_ID`.
- `.runtime/studio-blob/.env.local` och kvittot `studio-media.json`.
- Vercel CLI inloggad i teamet (`vercel whoami` ger `jakeminator0`), labbservern på 4319 igång (utan den lämnas
  mediefiler som Paows bild i dealermenyn ute) och porten 4341 ledig. Botens kunskap byggs bara ur det här repots
  egna filer; Scoutgaming behöver inte vara utcheckat.
- `DEALER_LOSEN_PROV=<ordet>` för kontrollen med lösenordet; utan den prövas bara att allt är låst.

**När ett steg stannar halvvägs** står kopian på nätet kvar som den var, utom efter deployen:

- *Arbetskopian är inte ren:* bevara ändringarnas ägares arbete innan något flyttas; kassera aldrig okända ändringar.
- *Bygget stannar:* läs beskedet. En maskinsökväg eller ett spärrat namn rättas av filens ägare; "Klippbanken ändrades
  medan kopian byggdes" betyder kör igen.
- *Uppladdningen bryts:* kör igen; det som redan ligger i storen skickas inte på nytt.
- *Något svarar redan på 4341:* stoppa det med dess egen nyckel, `node -e
  "fetch('http://127.0.0.1:4341/stop',{method:'POST',headers:{'x-dealer-token':require('<rent träd>/.runtime/preview.json').token}})"`.
  Stoppa aldrig något på port eller processnamn.
- *Deployen stannar:* `vercel deploy --prebuilt --prod --yes --scope jakeminator123s-projects --cwd .runtime/studio-deploy`.
- *Kontrollen efter deployen faller:* `vercel rollback --scope jakeminator123s-projects --cwd .runtime/studio-deploy`
  (eller `vercel promote <adress>`), och läs vad som föll innan nästa försök.

- **Taket för Blob** är `limits.blobBytes` i `data/studio-release.json` (2,2 GB). Över taket stannar bygget innan något
  laddas upp; höj det först när tabellen visar vad som har vuxit.
- **En ny store** görs bara på hans ord (BESKED, "Media på nätet"). Skapa den i teamet (public, `arn1`); flytta det gamla
  kvittot, `progress.json` och `.env.local` till en egen mapp under `.runtime/` och behåll dem (en rollback behöver den
  gamla storen); lägg den nya nyckeln ensam i `.runtime/studio-blob/.env.local`; kör planen, ett provbygge med `--kor
  --bara-bygge` och sedan `--kor`, alla med `--store store_<id>`. Den gamla storen står orörd tills han säger att den ska bort; den kostar lagring så länge den
  finns, och objekt som en senare kopia inte visar ligger kvar i den.
- Provbygge utan publicering: `node tools/build-studio-snapshot.ts --prov` och `node tools/serve-studio-snapshot.ts
  --prov` (port 4330, påhittat lösenord).
- Ta bort kopian (på Jakobs ord): `vercel project rm dealer-studio` och `vercel blob delete-store <storens id ur
  kvittot>`, båda med `--scope jakeminator123s-projects`.
- **Kostnad:** lagringen cirka 0,04 USD i månaden ur Pro-planens månadskredit; trafiken ingår i Pro-planens CDN (1 TB),
  och en runda i Casino läser cirka 150 MB film.

## Slasken och städning

- **Slasken** är `../slask/dealer` bredvid repot (`DEALER_SLASK` flyttar den), för tillfälligt arbete, en mapp per
  uppgift: ark, provrenderingar, Chrome-profiler, låset. Allt där är tillfälligt: `npm run stada` raderar det som är
  äldre än 7 dygn (`-- --torr` listar bara, `-- --dygn N` ändrar gränsen), och labbservern kör den när den startar.
  Inget arkiv och ingen liggare. Det som ska sparas läggs i `assets/` med en roll i `data/media-roles.json`, eller i Git.
- **`.runtime/`** är repots eget maskinläge, Git-ignorerat och ägt av verktygen: SQLite-kopiorna, Runway-API:ts
  liggare och uppladdningscache, testkvitton, labbserverns temp (`.runtime/tmp`), loggar och gallringens papperskorg
  (`.runtime/papperskorg`).
- Andra tillfälliga filer går till systemets vanliga TEMP. Ändra inte global TEMP eller PATH och skapa inga
  junctions. Gallring av media: [lokal arbetsplats](../tools/local-work.md).
- **Vad en mapp i `assets/` eller `output/` är och om något använder den:** `node tools/media-audit.ts [--json]
  [<mapp>]` (bara läsning) ger per sak användningen `spelas`, `visas`, `referens`, `bara registrerad` eller `okänd`, med
  fil och fält. Den är ett underlag: kontrollera också aktiva prov och hans anteckningar före radering.
- **Om en bild eller film passar dagens regler:** `node tools/media-audit.ts --fit [--write]` mäter kortet mot
  `planCardQuad` och ett viloankare mot `data/dealer-standard.json`; `--write` sparar svaret i `data/media-fit.json`,
  som Material visar. Kör om när planen, linsen eller ett ankare ändras. Hans tillstånd ändras aldrig av mätningen.
- **Arkivet utanför repot** bär originalen (V6 och Pamela, 2026-11-23) och det tidigare projektet, med hash; poster i
  `data/manifest.json` med `archived` säger var, och `npm run verify` hoppar över dem. En arkivflytt kopierar utan att
  följa junctions, jämför antal, byte och SHA-256 och läser tillbaka; källan raderas först efter ett separat
  godkännande, och ett befintligt arkiv skrivs aldrig över.
- **Filmregistret städar sig självt:** en film som gallras (`node tools/media-thin.ts`) tar sina poster och tagningar
  ur registret, och deras rader ur `data/clip-jobs.json`. `node tools/register.ts sweep --dry` visar poster vars film
  inte längre finns på disken, och `sweep` tar dem; ett träd utan filmer under `assets/motions/` rörs aldrig. Domen
  på en borttagen post (Jakobs, eller en given åt honom) står kvar som en rad i `data/motions-removed.jsonl`, och
  posten tas tillbaka ur Git.
- Registren och körkvittona är JSON. Filmregistret är en textfil i Git (`data/motions.jsonl`) med en arbetskopia i
  SQLite under `.runtime/register/`, som byggs om ur texten (SYSTEM, "Ett rörelseregister och tydliga bevis"). Ett
  återbyggbart SQLite-index samlar sökning och spårbarhet ([evidens](../tools/evidence.md)). Ingen produktionsdatabas
  är skapad.

## Molnmiljö

En kopia av repot i en molnmiljö (en molnagent eller en annan sandlåda ur GitHub) har inga media och kanske fel Node:
där går bara de tester som klarar sig utan media, och ingenting döms där. Ingen sådan miljö är uppsatt för dealer. Den
som sätter upp en behöver Node 24.22.3 och `npm ci` (hashkontrollen `npm run verify` kräver dessutom registrerad
media); kopiera aldrig hela `.env.local` dit.
