# Lokal arbetsplats och städning

Var arbetet görs, hur mediamängden ses och hur oanvänt material raderas. Slå upp ett avsnitt, läs inte hela.

## Arbetsplats

Allt arbete görs i repots mapp `dealer`, på `main` (AGENTS, "Git och samarbete"). Kontrollera rot och Git-remote
först. En gren är en versionspekare, ingen ny kopia av medierna; byt inte gren över någon annans pågående ändringar.
Ett eget arbetsträd bara när ett arbete uttryckligen behöver isoleras. Byggträdet `../dealer-bygg` bredvid repot är
bara för `push-clean.ts` och `studio-from-commit.ts`, som båda kräver `--trad <mapp>`. Ändringar från en annan dator
eller chatt jämförs med main, granskas och testas: merge för en sammanhängande gren, cherry-pick för en avgränsad
commit eller en granskad patch för osparade ändringar. Kopiera inte tillbaka äldre hela filer.

- `assets/`: en kanonisk kopia av material som används eller har en konkret roll; registrera rollen.
- Slasken (`../slask/dealer`, DRIFT, "Slasken och städning"): tillfälliga bilder, filmer och byggen, raderade efter 7
  dygn. Flytta det som ska visas till `assets/` och registrera det. Ingen ny full mediekopia per chatt eller granskare.
- Registren: små sökvägar, hashvärden, domar och kvitton. Spara inte en ny filmkopia per rapport.
- Släpp egna hjälpprocesser och färdiga arbetsträd efter att deras ändringar och nödvändiga filer säkrats.
  Behåll Jakobs aktiva förhandsvisning. Rör aldrig ett annat projekt som en del av den här städningen.

## Översikt och mängd

`npm run media:status` bygger `.runtime/media-status/LASMIG.md` och `status.json` ur befintliga register och filer.
Översikten visar vad de största mapparna är, hur de används, tillfälliga mappar och förändringen sedan föregående
inventering. Den är en återbyggbar rapport, inget nytt register att underhålla. Hårda länkar räknas en gång i
unika filbytes; storlek per sökväg visas separat. Rapporten följer inga junctions och raderar ingenting.

Video tar plats, men en bildserie kan vara mycket större än sin film. `render-reference.ts` tar därför bort
mellanrutorna efter lyckad filmkontroll, kontaktark och slutruta. Filmen, indata, kontaktark, slutruta och kvitto
stannar kvar. `--keep-frames` används bara när rutorna behövs för felsökning. Misslyckade körningar behåller sitt
underlag tills felet har utretts. Spara ett valt resultat och relevanta jämförelser, inte varje omrendering.

Efter mediearbete: flytta och registrera den valda leveransen och kör översikten. Unika original i `assets/` granskas
efter användning, inte efter en åldersgräns (den gäller bara slasken). Det som ska bevaras men inte används kan
flyttas till arkivet utanför repot; flytt är inte en minskning av den totala mängden.

## Automatisk återkoppling från webbläsaren

Lokala labbet registrerar långsamma interaktioner (minst 200 ms) i
`.runtime/interaction-diagnostics/recent.json`. Alla agenter kan läsa dem med
`node tools/interaction-diagnostics.ts`. Läs vid rapporterad tröghet och efter klickprov.
Loggen skiljer väntetid före händelsen, händelsehantering och tid till nästa bild. Sökvägen före
navigeringen, mållänk, studiobyggets SHA och flikens synlighet följer med. Inmatad text, URL-parametrar och
sidinnehåll sparas inte. Högst 200 poster behålls; inget skickas till en extern tjänst.

Detta är felsökningsprov, inte en beräkning av webbplatsens INP eller bevis för orsaken till ett extremvärde.
En siffra i en skärmbild räcker inte för att skylla tiden på menylänken. Återskapa klicket och jämför delarna.
Loggningen laddas efter omladdning; webbläsare utan Event Timing stöder inte insamlingen.

Vercels [Interaction Timing](https://vercel.com/docs/vercel-toolbar/interaction-timing-tool) visar den aktuella
sessionens mätning. Sparade Toolbar-kommentarer kan hämtas med Vercel-anslutningens `list_toolbar_threads`
och `get_toolbar_thread` för projektets verifierade ID. INP-rutan blir inte automatiskt en sådan kommentar.
Nätkopian har inte denna lokala loggning; publicering och extern insamling är separata ändringar.

## Radera oanvänt material

Gallringen (Jakob 2026-11-21: "kan du inte bara fixa upp något bra ang detta?") är ett verktyg i tre nivåer.
`npm run gallra` skriver bara rapporten: `.runtime/gallring/LASMIG.md` och `plan.json`, med varje fil, skälet, storleken
och antalet hårda länkar. `npm run gallra -- --kor` utför nivån **säkert** och inget annat: hans egna Inte bra som
inget pekar på, det som bevisligen går att göra igen, och byteidentiska filer som blir en fil. `--kor --grupp <namn>`
utför EN grupp ur **förslag**, och bara på hans ord om den gruppen. Nivån **blob** är bara förberedd: det som kan
ligga enbart på den nya Blobben när den finns. Spärren (Primär, Godkänd, Variant, det spelet har, roller,
original, referenser, noir-samlingen, filmen före spelet, det Beslut eller en öppen order nämner, och allt yngre än
tre dygn) kontrolleras för varje fil precis innan den rörs. Det som går flyttas först till
`.runtime/papperskorg/<datum>/` och ligger där i 14 dygn (`--tom-korgen` tömmer det äldre); planen gäller
i 24 timmar, sedan görs rapporten om. Kör rapporten efter varje filmomgång och `--kor` när den visar något säkert.

Efter varje avslutad filmbeställning: kör `npm run media:status`, kontrollera roller och referenser och kör
rapporten igen. Bevara källfilm, styrbilder, orderkvitto och valt granskningsbevis. Tillfälliga kopior ligger i
slasken; färdiga filmer och användbara prov ligger i `assets/` med en roll. Rapporten kan köras cykliskt utan
radering; ingen åldersregel får ensam radera unika filmer i `assets/`.

`assets/noir/` är Jakobs samling av noir-filmerna (2026-11-21: "hitta alla noir-filmer och lägga dem i en speciell
mapp"), med `LASMIG.md`: v4 av trailern och det som kom efter, originalet på 30 sekunder och klippen v4 är byggd av.
Det som kom före v4 och alla lätta kopior raderades samma kväll på hans ord. Samlingen bevaras och är inte löst
material; filerna som redan fanns i projektet är hårda länkar dit, så originalen i provet och spelets ingång ligger
kvar. Bygget av v4 läser ljud och typsnitt ur en äldre slask utanför repot (`trailer-2/`), som inte finns i en vanlig
utcheckning.

`media-audit.ts` visar användning men är inte ensam ett raderingstillstånd: exempelvis en gammal Prov-mapp
kan fortfarande visas och ha anteckningar. Kontrollera spelbank, scen, Material, Prov/Beslut, användardomar,
beställningar, referenser och pågående arbete. Referenserna (`data/manifest.json`), duken och plåten i
`assets/scene/` och nu använda original skyddas; det arkiverade står i DRIFT, "Slasken och städning". Spara skälet och
exakta sökvägar.
Unikt material som verifierats oanvänt får raderas enligt Jakobs besked 2026-11-19; arkivera inte allt för att det
en gång kostade krediter. Registren ska samtidigt beskriva att materialet tagits bort, så inga aktiva länkar bryts.

Byteidentiska mediefiler i `assets/` kan dela en och samma fil på disken genom hårda länkar (Jakob 2026-11-20:
"radera" om dubbletterna; båda sökvägarna finns kvar, så inget register ändras). Skriv därför aldrig om en färdig
mediefil på plats: en ny version får ett nytt namn, eller skrivs till en tillfällig fil som sedan byter namn, annars
ändras tvillingen med. Talets filer (`assets/speech/`), originalen och referenserna delar inte fil med något.
En film som gallras bort lämnar en `RADERAD.txt` i sin mapp, och dess poster går ur filmregistret med sina tagningar
(Jakob 2026-11-23); domen på dem står kvar som en rad i `data/motions-removed.jsonl`. Poster vars film har försvunnit på
annat sätt visas av `node tools/register.ts sweep --dry`.

För gamla dubbla arbetskopior finns `node tools/media-dedupe.ts --source <absolut slaskmapp>`.
Förvalet inventerar bara. `--apply` raderar gamla mediekopior först efter SHA-256-jämförelse med en bevarad fil
i projektets `assets/`. Det väljer ingen disk, följer inga länkar, hoppar över källträd och beroenden, skyddar
namngivna sökvägar och processer samt filer yngre än tre dygn. Varje borttagen fil kvitteras under
`.runtime/cleanup/`. Kontrollera först att den valda mappen ägs av detta projekt; verktyget kan inte avgöra
ägarskap åt operatören. Kvittots byteantal är filernas logiska storlek, inte uppmätt frigjort diskutrymme.
