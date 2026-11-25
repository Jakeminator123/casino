# Dealer – arbetsregler

Här byggs en filmad dealer till Jakobs blackjackspel: korta filmklipp mellan fasta ankare, spelade i studion, i
3D-scenen och i spelet. Projektet är frikopplat från Scoutgaming (Jakob 2026-11-23) och behöver inget därifrån. Jakob
äger projektet; han är inte programmerare, så förklara val i vanliga ord. Repot är ett vanligt repo som fungerar på
vilken dator och i vilket verktyg som helst (Jakob 2026-11-25: Cursor, Claude Code, Codex, andra IDE:er, API): det
som gäller står här och i vanliga filer (`.ignore`, Git-hookar, `npm run`-kommandon); `.cursorignore` och `.claude/`
är extra skydd för sina verktyg. Inga sökvägar till en viss dator och inga namn på chattar i det som gäller.

## Läs först

En ny session läser tre filer innan den börjar, och inget mer (Jakob 2026-11-18):

1. Den här filen.
2. `HANDOFF.md`: startsidan: läget i korthet, nästa steg och pekarna vidare.
3. EN lägesfil, din banas: `docs/lage/<bana>.md` (3D-banan: avsnittet "Överlämning" i `dealer3d/LASMIG.md`).

Saknas något du behöver för att börja är det ett fel i överlämningen: rätta det där i stället för att läsa mer. Allt
annat slås upp när arbetet kräver det, ett avsnitt i taget (sök på rubriken):

- Jakobs besked per ämne i `docs/BESKED.md`, kända brister i `docs/BRISTER.md`.
- `docs/SYSTEM.md` (kontrakt, register, ordlista), `docs/DRIFT.md` (rutiner: Git, kontrollen, labbservern, Runway,
  publicering), `README.md` (mapparna och hur det körs) och instruktionerna i `tools/*.md` (`tools/dealer-line.md` är
  ingången för en ny dealer eller en filmbeställning).
- Ett återkommande arbetsmoment (beställa eller granska en film, visa Jakob något, avsluta och pusha, arbeta bredvid
  andra chattar, en ny dealer, publicera kopian) har en skill i `.claude/skills/<namn>/SKILL.md`: läs den som gäller
  innan du börjar, med sökvägen om verktyget inte laddar den själv.

Sökningen ser inte allt, med avsikt (Jakob 2026-11-18, för att spara tokens): `.ignore` och `.cursorignore` döljer
media, maskindata, filmregistret och dockans rörelsedata. En tom sökträff betyder inte att filen saknas; läs den med
sin sökväg eller med verktyget som äger den. Ett dokument eller register över 32 KB läses i delar: sök upp stället och
läs högst 400 rader åt gången (Claude Code håller det med `.claude/hooks/read-guard.mjs`).

Läs inte för att komma igång: chatthistorik, äldre överlämningar eller Git-historiken. En underagent läser den här
filens regler och det uppdraget namnger, högst tre filer eller avsnitt.

## Var kunskap står

- `HANDOFF.md` högst 120 rader och 900 ord, en lägesfil högst 60 rader och 800 ord (`tools/handoff.test.ts`). Ersätt
  det som inte längre gäller; ingen dagbok.
- Jakobs gällande besked: `docs/BESKED.md`, högst två rader per besked; ett ändrat besked skrivs om. Kända brister:
  `docs/BRISTER.md`.
- Ett prov (film, bild) som väntar på Jakobs dom är ett kort i Beslut (`data/decisions.json`). Andra frågor ställs i
  chatten.
- Kontrakt och format: `docs/SYSTEM.md`. Rutiner och anslutningar: `docs/DRIFT.md`. Hur ett arbetsmoment görs: en
  instruktion i `tools/` bredvid verktygen.
- Fakta per film, bild eller körning: registren (`data/motions.jsonl`, `data/*.json`, `placements/`); dokumenten länkar
  dit. Vad som hände och varför: commitmeddelandet.
- Skriv kort, det som gäller nu, på rätt ställe och en gång (Jakob 2026-11-23); historien står i Git.

## Det som skyddar Jakob

- Media och hemligheter stannar utanför Git: `assets/`, `output/`, `.runtime/`, `.env*` och `private/` är ignorerade,
  och kontrollen stoppar en push som bär sådant. Repot är publikt (`Jakeminator123/dealer`).
- Det som produceras raderas som regel (Jakob 2026-11-25). Kvar i `assets/`, med en roll i `data/media-roles.json`,
  blir bara det han har godkänt (Primär, Godkänd, Variant, ankare, det spelet spelar) och det som väntar på hans dom.
  En film han, eller en granskare på hans uppdrag, underkänner raderas, utom när en agent har uppgiften att arbeta om
  den (ett öppet orderutkast eller ett kort i Beslut pekar på den). Raderingen går via papperskorgen (14 dygn).
- Betald generering inom den stående fullmakten i `data/order-policy.json` (Jakob 2026-11-25): en agent godkänner själv
  upp till 500 krediter per beställning och högst 2 500 per dygn; en större beställning frågar Jakob först. Betalda
  anrop utanför Beställ rapporteras med belopp.
- Deploy, mediauppladdning, databasändring och integration i Scoutgaming bara på Jakobs uttryckliga ord.
- Jakobs domar i Granska och Material, och valet av Primär, är hans: ingen agent sätter eller skriver över dem. Bara när
  han uttryckligen har lämnat över domen för vissa filmer dömer huvudagenten och en oberoende granskare i hans ställe
  (`node tools/review-put.ts`): domen ser aldrig ut som hans, väntar inte i hans kö, syns i Granska under Dömda åt dig,
  och hans eget beslut ersätter den.
- Original och referenser arkiveras med hash utanför repot och raderas aldrig (manifestets `archived` säger var); ändra
  aldrig en referenshash för att dölja en avvikelse.
- Det tidigare projektet (snyggare-dealer) och Scoutgaming är bara läsreferenser: inga länkar, junctions eller beroenden
  dit, och en fil som hämtas därifrån registreras i `data/manifest.json`. Spelregler, slump och kortvärden flyttas inte
  därifrån, utom den fristående spelmotorn i `game/` (Jakob 2026-11-11).

## Regler och spärrar

- En regel står här eller i en skill bara om den är Jakobs ord (daterat i `docs/BESKED.md`) eller skyddar honom
  (ovan). Annat en agent har skrivit är råd och stryks när det hindrar.
- Efter ett fel rättas orsaken: inget nytt förbud, test eller spärrande status (Jakob 2026-11-23).
- När hans ord ändrar en regel ändras den där den står, i samma commit.
- Rött i kontrollen stoppar; utred orsaken. Ett test som bara låser hur kod eller text ser ut i dag stryks när det
  hindrar; skyddet sänks aldrig och ingen referens ändras för att få grönt.

## Slasken och `.runtime/`

- Tillfälligt arbete (renderingar, skärmbilder, granskningsunderlag, försök, hjälpskript i TypeScript) läggs i
  slasken, en mapp per uppgift: `../slask/dealer/<uppgift>/` bredvid repot, eller där `DEALER_SLASK` pekar. Ta bort
  din mapp när du är klar. Allt där raderas efter sju dygn (`npm run stada`, som labbservern också kör när
  den startar). Det som ska finnas kvar flyttas till `assets/` med en roll, eller in i Git.
- `.runtime/` är verktygens eget: databaserna som byggs om ur registren, liggare, testkvitton, loggar, labbserverns
  tillfälliga filer och gallringens papperskorg. Lägg inget eget arbete där.
- Ingen sökväg till en viss dator i kod eller dokument: räkna från repot, eller läs en miljövariabel.

## Labbservern

- `npm start` startar labbet på `http://127.0.0.1:4319` och öppnar fliken; `npm run status` och `npm run stop`
  frågar och stoppar. En sida visas i den öppna fliken med `node tools/preview.ts --open "<sida>"`; före en länk till
  Jakob: `node tools/preview.ts --ensure`.
- Omladdning, navigering och skärmbilder i labbet görs utan att fråga.
- Stoppa servern bara med `npm run stop`, aldrig via processnamn eller port, och rör inte andra projekts servrar.
- Den som startar ett eget headless-fönster stänger det; en körning i taget, eftersom det belastar Jakobs dator.

## Git och samarbete

- Arbeta i repots vanliga utcheckning på `main`, den enda långlivade grenen; en gren eller ett eget träd bara när ett
  arbete uttryckligen behöver isoleras, och den slås sedan ihop i `main` eller tas bort. Byggträdet `../dealer-bygg`
  är bara för kontrollen (DRIFT).
- Huvudagenten är chatten Jakob arbetar med: den committar, taggar och pushar. Underagenter och andra chattar skriver
  bara i egna filer och lämnar över med en fillista. En skribent per fil.
- Checka in färdiga filer direkt, i små commits, så att arbetsträdet oftast är rent.
- Installera kontrollen en gång per utcheckning: `npm run hooks:install` (pre-push kör `tools/publication-check.ts`).
- Avsluta så här, utan att fråga (Jakob använder inte Git själv, 2026-11-25): uttrycklig staging av egna filer,
  commit, `npm run check` (hela sviten, en gång), push och fjärrens SHA. GitHub kör ingen kontroll.
- Ingen force-push, ingen `--no-verify`, ingen filbevakare och ingen automatisk commit av utkast.
- Städa löpande: det som en ändring gör överflödigt (kod som inget anropar, ersatta filer och status, döda sökvägar)
  tas bort i samma ändring, och det nya beteendet beskrivs där det hör hemma. Medier gallras enligt
  `tools/local-work.md`; `npm run media:status` visar läget.

## Kod

- Ny kod skrivs i TypeScript. Undantaget är skripten i `tools/python/`, som kräver MediaPipe.
- Node 24 enligt `package.json` (Volta); kontrollera med `node -p process.version`.
- Högst fyra render- eller testarbetare samtidigt: datorn delas med labbservern och andra chattar.
- Verifiera en ändring med en körning eller de berörda testfilerna, inte hela sviten. Nya tester bara för det som ska
  bestå: kontrakt, spelregler, Jakobs godkända resultat, publiceringsskyddet.

## Svar till Jakob

- Svenska, slutsatsen först, så kort som frågan tillåter, men varje fråga han ställer får sitt svar.
- Punktform, procent och poäng (till exempel 4/5) uppskattas.
- Skilj det som är verifierat från det som är skattat.
- Säg kort vad som återstår och vad som hindrar att arbetet stängs.
- Avsluta med antalet aktiva underagenter.
