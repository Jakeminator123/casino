# casino

Jakobs repo för en blackjackdealer: filmad, och ritad i 3D. Publikt på `github.com/Jakeminator123/casino`. Jakob äger
allt här och är inte programmerare: svara på svenska, slutsatsen först, och förklara val i vanliga ord.

Läs `PROJEKTET.md` först: vad projektet är till för, kedjan från bild till film och varför varje mapp finns. Den här
filen gäller i hela repot och i alla verktyg (Cursor, Claude Code, Codex; `CLAUDE.md` importerar den bara). Varje
projektmapp har en kort `AGENTS.md` med det som bara gäller där; den går före vid konflikt. Ett anrop direkt mot en
modells API läser ingenting själv: skicka med den här filen och projektets.

## Mapparna

| Mapp | Vad det är | Läs |
| --- | --- | --- |
| `blackjack-dealer/` | Spelet, studion i webbläsaren (ingången till hela repot), dockornas rörelsekod (`dealer3d/`) och måtten som allt annat läser. | `README.md`, `STATUS.md` |
| `standarddocka/` | Editorn där dockorna (Danilo, Frasse och persondockorna) spelar sina lyfta rörelser vid livebordet och filmas, filmens efterarbete och Jakobs domar. | `README.md`, `DOMAR.md` |
| `avatar-auto-pipeline/` | Blender-skripten som bygger dockorna, livebordet och stolen, och vägen från bilder av en person till en ny dealer (`python ny_dealer.py <person>`). Python. | `README-SV.md` |
| `live-bj/` | Mätning av de riktiga dealrarnas rörelser, blick och kameravinklar ur en blackjackfilm. Filmen och rutorna ur den går aldrig in i Git eller i ett prov; bara måttfilerna i `data/` och verktygen. Mäter med Python-miljön i `blackjack-dealer/tools/python/`. | mappens README |
| `slask/` | Tillfälligt arbete. Git har bara verktyget `slask.ts`. | nedan |
| `inbox/` | Korta lappar mellan chattar som arbetar samtidigt. Git har bara verktyget `inbox.ts`. | nedan |
| `.claude/skills/` | Ett arbetsmoment per skill (beställa film, granska en rörelse, avsluta ett arbete). Läs den som gäller innan du börjar. | `SKILL.md` |
| `.githooks/` | Kontrollen före push. | nedan |

De två mätta dealrarna har arbetsnamn (Jakob 2026-11-27): Danilo (den första, ung och smal; stilen `kameran`) och
Frasse (den andra, med skägg; stilen `bordet`). Samma namn bär våra två dockor med deras kroppsmått, stil och rörelser
och vårt eget ansikte. Projekten lånar av varandra med relativa sökvägar (`../blackjack-dealer/...`) i stället för att
kopiera. Kommer en mapp till eller försvinner ändras tabellen i samma steg.

## Det som skyddar Jakob

Det här är de enda hårda reglerna. Allt annat i repot är arbetssätt och får ändras när det hindrar.

1. **Pengar.** Inget betalt anrop (Runway, Meshy, OpenAI, RunPod) utan hans ord. Undantaget är fullmakten för
   filmbeställningar i `blackjack-dealer/AGENTS.md`.
2. **Nätet.** Ingen deploy, uppladdning eller radering hos Vercel utan hans ord; ett ja gäller den gången.
3. **Hemligheter.** Nycklar står bara i en `.env` som Git ignorerar. De skrivs aldrig ut, loggas eller läggs i en annan
   fil.
4. **Repot är publikt.** Media, 3D-modeller och foton av personer går aldrig in i Git. Det köpta kortspelspaketet
   ligger utanför repot (mappen `kortspelspaket-arkiv` bredvid det, Jakob 2026-11-27) och läggs aldrig tillbaka i Git.
5. **Hans domar och hans data.** Det han har dömt, valt eller sparat (domar, kortplanen, hans anteckningar, hans
   sparade klipp) skrivs aldrig över och raderas aldrig utan hans ord.
6. **Betald och godkänd media** raderas bara på hans ord.

## Arbetssätt

- **Ändra fritt.** Kod, mått, byggskript och rörelser får ändras utan att fråga, i alla mappar (Jakob 2026-11-26: "DU
  får ändra ALLT"). Säg kort i svaret vad som ändrades.
- **Rätta orsaken.** Ett fel rättas där det uppstår, inte med en lapp ovanpå, ett nytt förbud eller en ny spärr.
- **Visa i stället för att fråga.** Det han ska ta ställning till visas i bild eller film.
- **En oberoende domare när han är borta** (Jakob 2026-11-27: "sätt en extern bild- och videogranskare som får agera
  domare i stället för mig när jag är borta"). Ett resultat som ska visas för honom (en film, en figur, en rörelse, en
  bild) döms först av en granskare som inte har gjort det och bara får resultatet och hans egna domar, inte
  tillverkarens rapport. Den dömer som han, med ögat och strängt, hellre Inte bra än kanske; ett Inte bra går tillbaka
  till den som gjorde det. Svaret till Jakob säger vad domaren sa, märkt som inte hans ord, och hans egen dom ersätter
  det. Hur: skillen `doma`.
- **Git sköter agenten.** Jakob använder inte Git. När arbetet är kontrollerat: committa dina egna filer med ett kort
  meddelande om vad och varför, och pusha till `main`. Ingen force-push och ingen `--no-verify`.
- **Kontrollen före push** (`.githooks/pre-push`, installeras en gång per utcheckning med `node .githooks/check.ts
  --install`) stoppar hemligheter, `.env`-filer, media, filer över 5 MB och sökvägar till en viss dator, och kör
  testerna i de projekt som har ändrats. `node .githooks/check.ts` kör samma kontroll i förväg, med `--alla` över varje
  fil Git har. Är den röd rättas orsaken.
- **Tester** skrivs bara för det som ska bestå: publiceringsskyddet, spelets regler, hans domar, beställningarna och
  kontrakten. Ett rött test som inte skyddar något av det är ett gammalt test och tas bort; säg vilket i svaret.
- **Städa i samma steg.** Ta bort det ändringen gjorde överflödigt (kod som inget anropar, ersatta filer, egna
  tillfälliga filer) och rätta dokumenten som ändringen gjorde fel. Säg med en rad i svaret vad som städades.
- **Dokument.** En sak står på ett ställe och beskriver det som gäller nu; historien står i Git. Regler här och i
  projektets `AGENTS.md`, kartan och körningen i projektets README, läget i `STATUS.md` där det finns.
- **Inget gammalt lagras** (Jakob 2026-11-27: "så inte skit lagras"). Ett verktyg lägger aldrig undan en äldre version,
  en kopia eller en lista över det som är borta i en mapp som Git har. Ett register pekar bara på det som finns; tas en
  fil bort tas raden om den bort i samma steg. Undantaget är hans domar: domen om en borttagen film står kvar i
  `blackjack-dealer/data/motions-removed.jsonl`.
- **Riktningar räknas från dealerns kropp, inte från kameran** (Jakob 2026-11-27: "det är viktigt vad som är vad";
  "jag omnämner ofta höger och vänster utifrån dealerns egna kropp ... så att dealerns vänsterhand är närmast skon"). I
  kod, data, filnamn och dokument är höger och vänster (R och L, Right och Left i skelettet) alltid dealerns egna: skon
  står vid hans vänster, och i bilden från spelarnas sida är hans vänster till höger. Det som räknas från den som tittar
  skrivs ut: "i bilden", "bildens vänster". Fram är från dealern mot spelarna, bak mot hans rygg, upp och ned från
  filten (i koden +x dealerns vänster, +y upp, +z fram). Handens sidor heter handrygg och handflata. Kortet har en
  framsida och en rygg, två långkanter och två kortkanter, och det ligger plant eller står på högkant (Jakob: "högkant
  och långkant kan bli begrepp om korten också"). En fil heter efter vad den visar, inte efter ett verktygs egna ord
  som front och back.
- **Platserna: 0 är dealern, 1 är närmast skon** (Jakob 2026-11-27: "Till vänster om dealern är ju egentligen seat 1",
  "spelare 0 är dealer"). Plats 0 är dealern (D i koden), plats 1–7 spelarna: plats 1 vid dealerns vänster närmast
  skon, sedan medurs sett uppifrån till plats 7 vid hans höger. Given går 1 till 7 och sist dealern. **Bytet är
  beslutat men inte gjort:** i kod, data och filnamn räknas platserna ännu från bildens vänster (dagens plats 7 är
  närmast skon) tills allt byts i ett steg. Skriv till dess "dagens plats n" eller "nya plats n", aldrig bara ett
  nummer, när platsen inte är 4.
- **Ingen viss dator.** Repot ska gå att klona till valfri mapp: ingen kod eller text pekar på en användare eller en
  disk. Media följer inte med Git, så det som bara finns på en dator får inte vara något koden kräver.

## Måtten och rörelseschemat

- Måtten har en källa, koden: kameran, bordet, skon och kortplatserna i `blackjack-dealer/src/table-live.ts`, kortet
  i `src/space.ts`, dockornas mått i `blackjack-dealer/dealer3d/src/doll.ts` och en persons i
  `avatar-auto-pipeline/personer/<person>.json`, rörelsernas takt i lyftfilerna `dealer3d/data/lyft-*.json`. Ett mått
  ändras där, aldrig i ett dokument.
- **Livestandarden är den enda standarden** (Jakob 2026-11-27: "helt övergå till det som är klonat", "enbart utgå från
  vy/vinkel/riktningar/storlekar och annat som fanns i videon"): kameran, bordet, skon, korten och kortplatserna som
  de är mätta ur filmen av livebordet, och rörelserna lyfta ur samma film. En annan vy för spelet får läggas ovanpå
  senare; den ändrar aldrig måtten.
- `MATT.md` i roten skriver ut alla mått, vinklar, kortplatser, höjder och takter bredvid det som är mätt på ett
  riktigt livebord (`live-bj/data/`). Den ändras aldrig för hand: `node matt.ts` skriver den, och kontrollen före push
  skriver om den och säger till när den inte stämmer.
- Rörelseschemat står i `standarddocka/rorelsekatalog.json`: ankarena (en bild som klipp börjar och slutar i: A1,
  A2.3, handbytet A2M, A3PnCm), stadierna (vad dealern gör: VILA, REDO, GIV, TILLBAKA …, vart och ett med hemankare,
  grundklipp och varianter) och rörelserna (klippen), med vilka som finns och vilka som saknas. En ny rörelse skrivs in
  där.

## Tillfälligt och producerat

- Arbetsfiler, försök och hjälpskript ligger i `slask/<projekt>/<uppgift>/`, aldrig bland koden. Ta bort din mapp när
  du är klar. Det som har stått orört i tre timmar raderas av `node slask/slask.ts stada` (servern i `blackjack-dealer`
  kör den själv), så lägg aldrig något där som ska finnas kvar.
- Det som produceras (filmer, bilder, modeller, renderingar) raderas som regel (Jakob 2026-11-25). Kvar blir bara det
  som väntar på hans dom, i ett prov (`blackjack-dealer/assets/proofs/<namn>/`, med originalen i provets mapp
  `original/`), och det han har godkänt eller som spelet använder, i projektets mediemapp. Underkänt, bortvalt och
  ersatt raderas genast av den som gjorde det; inget läggs undan för säkerhets skull.
- Var allt lagras står i kartan `lager.ts` i roten: varje mapp med media eller producerat, dess slag, projekt, register,
  läsare och om det går att göra om gratis. En ny sådan mapp skrivs in där i samma steg (testet
  `blackjack-dealer/tools/lager.test.ts` håller kartan mot `.gitignore`).
- **Radera med verktyget, inte för hand:** `node blackjack-dealer/tools/lager-remove.ts <sak>` visar frågan och
  följden, och `--ja --vem <namn>` raderar från disken utan papperskorg, bara på hans ord eller ett uppdrag som säger
  det. Kvittot säger vem som raderade. Hans klick i studions Biblioteket och Prov går samma väg, och det skyddade kräver
  hans andra klick.

## Sökningen

`.gitignore` och `.ignore` i roten är de enda ignore-filerna för sökningen. `.ignore` döljer det Git har men ingen
sökning ska vada igenom (maskindata, rörelsernas rutor, filmregistret). En tom sökträff betyder därför inte att filen
saknas: läs den med sin sökväg. En ny mapp med maskindata eller stora filer läggs in där i samma steg.

Vad en agent inte får läsa alls står för sig, lika i `.claude/settings.json` (Claude Code) och `.cursorignore` (Cursor):
nycklarna, hans foton i `private/`, modeller och andra binärer, och filmen av livebordet. Egna filmer får flyttas dit de
ska visas; en film under `live-bj/` flyttas och kopieras aldrig. Inställningen i `.claude/` ändrar bara Jakob själv.

## Flera chattar och underagenter

- Flera chattar kan arbeta i samma utcheckning samtidigt. Kör `node inbox/inbox.ts` när du börjar och före en commit,
  och säg vilka filer du tar med `node inbox/inbox.ts skriv <namn> "<text>"`; ta bort lappen med `klar` när arbetet är
  pushat. I Cursor sköter hookarna i `.cursor/hooks.json` det. En fil en annan chatt har tagit rör du inte, och en chatt
  i taget pushar.
- Rendering i Blender och headless Chrome körs en i taget, under låset
  `slask/blackjack-dealer/gpu-och-headless.lock` (skapa det, skriv vem du är, ta bara bort ditt eget). Blender körs
  utan fönster (`blender -b`); rör aldrig ett Blender-fönster som redan är öppet.
- En underagent får ett uppdrag som bär det den behöver: målet, filerna, reglerna, hur arbetet kontrolleras och vad som
  ska rapporteras. Parallella underagenter får skilda filer. Svaret tillbaka är kort.
- Spara tokens utan att sänka kvaliteten: sök fram stället innan du läser, läs avsnitt i stället för hela filer, och ta
  en ny chatt för en ny större uppgift.
