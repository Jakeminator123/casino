# blackjack-dealer – arbetsregler

En filmad dealer till Jakobs blackjackspel: korta filmklipp mellan fasta ankare, spelade i studion, i 3D-scenen och i
spelet. Målet (Jakob 2026-11-13): "nu ska vi skapa en bättre version av blackjackspelet", i studion. Projektet står på
egna ben, frikopplat från Scoutgaming (2026-11-23). Det här gäller utöver [casino-repots AGENTS.md](../AGENTS.md) (språk, Git,
slasken, tokens, datorerna, alla verktyg), som inte upprepas här; vid konflikt går den här filen före.

## Läs först

1. casino-repots [AGENTS.md](../AGENTS.md), 2. den här filen, 3. [STATUS.md](STATUS.md) (läget, nästa steg, det som
väntar på Jakob).

Allt annat slås upp när arbetet kräver det: [`README.md`](README.md) (mapparna, körningen, registren),
[`docs/SYSTEM.md`](docs/SYSTEM.md) (kontrakten) och en skill i `../.claude/skills/<namn>/SKILL.md` för ett arbetsmoment:
`ny-dealer`, `bestalla-film`, `granska-film`, `visa-for-jakob`, `avsluta-arbete`, `publicera-kopian`. Läs den som gäller
innan du börjar, med sökvägen om verktyget inte laddar den själv. Inga tak för dokumentens längd och inga tester av
deras form (Jakob 2026-11-25).

Projektets `.ignore` döljer media, filmregistret och dockans rörelsedata för sökningen. Läs en post i filmregistret med
`node tools/register.ts get <id>`.

## Var kunskap står

- Regler, och Jakobs beslut som är regler, med datum: här. Läget, nästa steg, det som väntar på honom och kända brister
  som spelar roll: `STATUS.md`, där det inaktuella ersätts. Kontrakt: `docs/SYSTEM.md`. Hur något görs: en skill. Fakta
  per film, bild eller körning: registren i `data/` och `placements/`. Vad som hände och varför: commitmeddelandet.
- När hans ord ändrar en regel ändras den där den står, i samma commit. Ett beslut som koden redan förverkligar står med
  datum och hans ord i kodens kommentar.
- Ett prov (film, bild) som väntar på hans dom är ett kort i Beslut (`data/decisions.json`); teknik, publicering och
  arbetssätt frågas i chatten (Jakob 2026-11-21: "Sånt här ska den inte ha att göra med alls!").

## Jakobs riktning

- **En väg för varje sak, färre val** (2026-11-24): "det är för mycket val, för komplicerat i onödan"; "klara
  självklara vägar för allt", också när det tränger undan gamla klipp eller vägar.
- **Labbet först** (2026-11-11): prov och effekter görs i labbet; spelet får bara det han har godkänt där.
- **Filmerna först** (2026-11-17): "filmerna är det vi först måste få rätt"; kortens och markernas utseende ändras bara
  i Bordets läge Efterarbete.
- **Fria händer med ansvar** (2026-11-14): "Du har fria privilegier och kör på. men se till att dokumentera coh städa".
- **Rensa bort det som blockerar** (2026-11-23): en regel står här eller i en skill bara om den är hans daterade ord eller
  skyddar honom; annat en agent har skrivit är råd och stryks när det hindrar. Efter ett fel rättas orsaken, utan nytt
  förbud, test eller spärr.
- **Städa hårt** (2026-11-17, 2026-11-19, 2026-11-25): "det mesta som inte används ska raderas", "Var inte konservativ".
- **Korta dokument** (2026-11-23, 2026-11-25): en sak på ett ställe, det som gäller nu.
- **Huvudagenten orkestrerar** (2026-11-13, 2026-11-23): delar ut arbete, granskar, slår ihop, committar och svarar
  honom. 3D-banan arbetar avskilt i `dealer3d/` och lämnar till huvudagenten (2026-11-17), med samma standard som allt
  övrigt (2026-11-23).

## Det som skyddar Jakob

- **Betald generering** inom den stående fullmakten i `data/order-policy.json` (Jakob 2026-11-25: "en rimlig fullmakt
  för budget och beställningar som inte ska vara hårt satt mer än att 'stora' beställningar ska valideras med mig"): en
  agent godkänner själv upp till 500 krediter per beställning och högst 2 500 per dygn; större frågar honom först.
  Taket 2 000 per order står mot misstag (2026-11-17); påfyllning gör bara han. Meshy bara på hans eget ja; en
  provkväll på hans RunPod högst 5 USD, med besked till honom före start (2026-11-17). Betalt utanför Beställ
  rapporteras till huvudagenten med belopp.
- **Deploy, mediauppladdning, databasändring och integration i Scoutgaming** bara på hans uttryckliga ord; ett ja gäller
  den gången (2026-11-18). Nätdelen vilar sedan 2026-11-25.
- **Domarna är hans** (2026-11-13): domar i Granska och Material och valet av Primär sätts bara av honom; en tagning han
  har dömt rörs aldrig. Har han uttryckligen lämnat över domen för vissa filmer dömer huvudagenten och en oberoende
  granskare i hans ställe (`node tools/review-put.ts`): märkt som inte hans, utan kö ("Med andra ord vill jag inte se en
  sån här lista när jag är tillbaka!"), och hans beslut ersätter den.
- **Planen och bilderna är hans:** `placements/default.json` skrivs bara av Bordet när han trycker Spara (2026-11-11);
  vilken bild som gäller väljer han i Material, och ingen knapp raderar betald media (2026-11-18).
- **Original och referenser** arkiveras med hash utanför repot och raderas aldrig; ändra aldrig en referenshash för att
  dölja en avvikelse.
- **Läsreferenser:** Scoutgaming och det tidigare projektet snyggare-dealer; inga länkar eller beroenden dit, och en fil
  som hämtas därifrån registreras i `data/manifest.json`. Undantaget är spelmotorn i `game/` (2026-11-11).
- **Personer:** hans foto som förlaga ligger i `private/referenser/` och går bara till bildmodellen (2026-11-17); den
  riktiga dealerns film och en YouTube-referens mäts bara och går aldrig in i Git, `assets/` eller ett prov (2026-11-18).
  Signerade adresser från Runway skrivs aldrig i repot.

## Det som produceras

Jakob 2026-11-25: "alt skit som produceras ska som regel raderas". Allt en agent eller modell gör medan den arbetar
(renderingar, försök, nedladdningar, Runway-leveranser som ingen har granskat) är tillfälligt. Kvar blir bara:

1. Det han har godkänt (Primär, Godkänd, Variant, ankare; varianterna är han "rädd för att förlora", 2026-11-21) eller
   som spelet, studion eller en öppen beställning använder: i `assets/` med en roll i `data/media-roles.json`, lokalt;
   till Blob på Vercel först när han säger till.
2. Det som väntar på hans dom: i Granska, ett kort i Beslut eller i `../slask/blackjack-dealer/granska/<namn>/`.

Allt annat raderas: det han underkänner eller själv tar bort, prov utan kort, leveranser som stannade på vägen och
granskares förslag som inte gavs på hans uppdrag, om inget öppet orderutkast eller kort pekar på det. Radering går via
papperskorgen `.runtime/papperskorg/` (14 dygn).

Det sker av sig självt: labbservern kör `node tools/media-thin.ts --auto` när den startar (planen, nivån säkert och
papperskorgens dagar äldre än 14 dygn; logg i `.runtime/gallring.log`). Nivån säkert är regeln ovan: det han, en
granskare på hans uppdrag eller en granskare utan det har underkänt, lösa filmer som inte är dömda bra och inte väntar
på honom, äldre talfilmer där en nyare spelas, leveranser som aldrig blev en post och prov utan kort, med Runways
leveranser, och byteidentiska filer som blir en fil. Bara efterarbetets kopior är förslag på hans ord
(`--kor --grupp <namn>`). `npm run gallra` visar planen (`.runtime/gallring/`). Spärren skyddar det spelet har,
roller, original, referenser, noir-samlingen, filmen före spelet, det Beslut eller en öppen order nämner, det som väntar
i Granska och allt yngre än tre dygn. `npm run media:status` skriver en översikt över lagringen och raderar
inget. `npm run stada` raderar det i slasken som är äldre än sju dygn men lämnar `granska/` orörd.

## Slasken och `.runtime/`

- Tillfälligt arbete i `../slask/blackjack-dealer/<uppgift>/` (eller där `DEALER_SLASK` pekar), en mapp per uppgift;
  ta bort din mapp när du är klar. Det som ska finnas kvar flyttas till `assets/` med en roll, eller in i Git.
- `.runtime/` är verktygens: databaserna, liggarna, loggarna, labbserverns tillfälliga filer och papperskorgen.

## Labbservern

- `npm start` startar labbet på `http://127.0.0.1:4319` och öppnar fliken; `npm run status` och `npm run stop` frågar
  och stoppar. En sida visas i den öppna fliken med `node tools/preview.ts --open "<sida>"`; före en länk till Jakob
  `node tools/preview.ts --ensure`. Omladdning, navigering och skärmbilder görs utan att fråga.
- Stoppa servern bara med `npm run stop`, aldrig via processnamn eller port; rör inte andra projekts servrar. Servern
  lämnar ut arbetsträdet, så en halvfärdig fil syns genast i Jakobs flik; den läser `tools/` och modullistan en gång, så
  en ändring där gäller efter `node tools/preview.ts --restart` (huvudagenten).
- Headless Chrome och grafikkortet under det delade låset `gpu-och-headless.lock` i slasken: skapa det exklusivt, skriv
  vem du är, ta bara bort ditt eget. En körning i taget; den som startar ett fönster stänger det.

## Git och samarbete

- Arbeta i repots vanliga utcheckning på `main`; en gren eller ett eget träd bara när ett arbete uttryckligen måste
  isoleras, och det slås sedan ihop eller tas bort.
- Huvudagenten är chatten Jakob arbetar med: den committar och pushar. Underagenter och andra chattar skriver bara i
  egna filer, säger vilka de tar och lämnar över med en fillista. En skribent per fil. Jakobs plan, domar och
  orderutkast skrivs aldrig över.
- Kontrollen före push: `npm run hooks:install` installerar casino-repots `.githooks/pre-push` för hela repot. Den
  stoppar hemligheter, `.env`-filer (utom `.env.example` med tomma värden), media och filer över 5 MB i de utgående
  commitarna och kör `npm test` i de projekt som har ändrats. `npm run check` kör samma sak före en push. Inget
  byggträd, inga kvitton, inget studiobygge ur commit: studion byggs på plats med `npm --prefix studio run build`, och
  `npm start` bygger den om den saknas. Inget körs hos GitHub (2026-11-18).
- Avsluta enligt skillen `avsluta-arbete`. Ingen force-push, ingen `--no-verify`, ingen automatisk commit.

## Tester

Jakob frågade 2026-11-25 hur tester skapas och efterlevs. Så här:

- Nya tester bara för det som ska bestå: publiceringsskyddet, spelets regler, hans domar och val, beställningarna
  (godkännande, kredittak) och kontrakten. Inga tester av dokumentens form eller av hur kod eller text ser ut.
- Ändrar en ändring ett beteende som ett test låser, ändras eller tas testet bort i samma ändring; skyddet sänks aldrig
  för att få grönt. Rött stoppar: utred orsaken.
- Allt ska vara grönt utan media på datorn. Testerna täcker inte filmerna; de bedöms med ögat.

## Kod

- Ny kod i TypeScript; undantaget är `tools/python/`, som kräver MediaPipe. Node 24 enligt `package.json`.
- Högst fyra render- eller testarbetare samtidigt. Verifiera med en körning eller de berörda testfilerna; hela sviten
  körs av kontrollen.

## Svar till Jakob

- Svenska, slutsatsen först, kort, men varje fråga han ställer får sitt svar. Punktform, procent och poäng (4/5).
- Skilj det verifierade från det skattade. Säg vad som återstår och vad som hindrar att arbetet stängs.
- Läs hans anteckningar i Prov med `node tools/proof-notes.ts` före svaret. En stillbild bredvid varje film han ska döma.
- Avsluta med antalet aktiva underagenter.
