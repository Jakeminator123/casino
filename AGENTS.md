# casino

Jakobs repo för en blackjackdealer: filmad, och ritad i 3D. Publikt på `github.com/Jakeminator123/casino`. Jakob äger
allt här och är inte programmerare: svara på svenska, slutsatsen först, och förklara val i vanliga ord.

Den här filen gäller i hela repot och i alla verktyg (Cursor, Claude Code, Codex; `CLAUDE.md` importerar den bara).
Varje projektmapp har en kort `AGENTS.md` med det som bara gäller där; den går före vid konflikt. Ett anrop direkt mot
en modells API läser ingenting själv: skicka med den här filen och projektets.

## Mapparna

| Mapp | Vad det är | Läs |
| --- | --- | --- |
| `blackjack-dealer/` | Spelet, studion i webbläsaren och 3D-dockans rörelsekod (`dealer3d/`). Här står måtten för kamera, bord, kort och kortplatser som allt annat läser. | `README.md`, `STATUS.md` |
| `standarddocka/` | Editorn där standarddockans rörelser spelas, justeras och filmas, och verktygen som mäter dem. | `README.md`, `DOMAR.md` |
| `avatar-auto-pipeline/` | Blender-skripten som bygger standarddockan, bordet och stolen, och vägen från foton till en riggad dealer. Python. | `README-SV.md` |
| `kortspelspaket/` | Ett köpt animationspaket och en visare för det. Ligger vid sidan (Jakob 2026-11-27): det är inte grunden för dockans rörelser och inte ett facit att mäta mot. | `README.md`, `OVERLAMNING.md` |
| `live-bj/` | Mätning av en riktig dealers rörelser, blick och kameravinklar ur en blackjackfilm. Filmen och rutorna ur den går aldrig in i Git eller i ett prov; bara de små måttfilerna i `data/` och verktygen. De två mätta dealrarna har arbetsnamn (Jakob 2026-11-27): Danilo (den första, ung och smal; stilen `kameran`) och Frasse (den andra, med skägg; stilen `bordet`). Namnen är också namnen på två nya dockor hos oss, med kroppens mått, stil och rörelser ur mätningen och vårt eget ansikte. Mäter med Python-miljön i `blackjack-dealer/tools/python/`. | mappens README |
| `slask/` | Tillfälligt arbete. Git har bara verktyget `slask.ts`. | nedan |
| `inbox/` | Korta lappar mellan chattar som arbetar samtidigt. Git har bara verktyget `inbox.ts`. | nedan |
| `.claude/skills/` | Ett arbetsmoment per mapp (beställa film, granska en rörelse, avsluta ett arbete). Läs den som gäller innan du börjar. | `SKILL.md` |
| `.githooks/` | Kontrollen före push. | nedan |

Projekten lånar av varandra med relativa sökvägar (`../blackjack-dealer/...`) i stället för att kopiera. Kommer en mapp
till eller försvinner ändras tabellen i samma steg.

## Det som skyddar Jakob

Det här är de enda hårda reglerna. Allt annat i repot är arbetssätt och får ändras när det hindrar.

1. **Pengar.** Inget betalt anrop (Runway, Meshy, OpenAI, RunPod) utan hans ord. Undantaget är fullmakten för
   filmbeställningar i `blackjack-dealer/AGENTS.md`.
2. **Nätet.** Ingen deploy, uppladdning eller radering hos Vercel utan hans ord; ett ja gäller den gången.
3. **Hemligheter.** Nycklar står bara i en `.env` som Git ignorerar. De skrivs aldrig ut, loggas eller läggs i en annan
   fil.
4. **Repot är publikt.** Media, 3D-modeller, foton av personer och det köpta paketet går aldrig in i Git.
5. **Hans domar och hans data.** Det han har dömt, valt eller sparat (domar, kortplanen, hans anteckningar, hans
   sparade klipp) skrivs aldrig över och raderas aldrig utan hans ord.
6. **Betald och godkänd media** raderas bara på hans ord.

## Arbetssätt

- **Ändra fritt.** Kod, mått, byggskript och rörelser får ändras utan att fråga, i alla mappar (Jakob 2026-11-26: "DU
  får ändra ALLT"). Säg kort i svaret vad som ändrades.
- **Rätta orsaken.** Ett fel rättas där det uppstår, inte med en lapp ovanpå, ett nytt förbud eller en ny spärr.
- **Visa i stället för att fråga.** Det han ska ta ställning till visas i bild eller film.
- **Git sköter agenten.** Jakob använder inte Git. Spara filerna, och när arbetet är kontrollerat: committa dina egna
  filer med ett kort meddelande om vad och varför, och pusha till `main`. Ingen force-push och ingen `--no-verify`.
- **Kontrollen före push** (`.githooks/pre-push`, installeras en gång per utcheckning med
  `node .githooks/check.ts --install`) stoppar hemligheter, `.env`-filer, media och filer över 5 MB, och kör testerna i
  de projekt som har ändrats. `node .githooks/check.ts` kör samma kontroll i förväg. Är den röd rättas orsaken.
- **Tester** skrivs bara för det som ska bestå: publiceringsskyddet, spelets regler, hans domar, beställningarna och
  kontrakten. Ett rött test som inte skyddar något av det är ett gammalt test och tas bort; säg vilket i svaret.
- **Städa i samma steg.** Ta bort det ändringen gjorde överflödigt (kod som inget anropar, ersatta filer, egna
  tillfälliga filer) och rätta dokumenten som ändringen gjorde fel. Säg med en rad i svaret vad som städades.
- **Dokument.** En sak står på ett ställe och beskriver det som gäller nu; historien står i Git. Regler här och i
  projektets `AGENTS.md`, kartan och körningen i projektets README, läget i `STATUS.md` där det finns.
- **Inget gammalt lagras** (Jakob 2026-11-27: "så inte skit lagras"). Ett verktyg lägger aldrig undan en äldre version,
  en kopia eller en lista över det som är borta i en mapp som Git har: historien står i Git. Ett register pekar bara
  på det som finns; tas en fil bort tas raden om den bort i samma steg.
- **Höger och vänster är dealerns egna** (Jakob 2026-11-27: "det är viktigt vad som är vad"). I kod, data, filnamn
  och dokument betyder höger och vänster (R och L, Right och Left i skelettet) alltid dealerns egen höger och vänster;
  dealerns höger är till vänster i bilden. Det som räknas från den som tittar skrivs ut: "i bilden", "bildens vänster".
  Platserna 1–7 räknas från bildens vänster, alltså från dealerns höger. En fil som visar en sida heter efter vad den
  visar (handrygg, handflata), inte efter ett verktygs egna ord som front och back.
- **Ingen viss dator.** Repot ska gå att klona till valfri mapp: ingen kod eller text pekar på en användare eller en
  disk. Media följer inte med Git, så det som bara finns på en dator får inte vara något koden kräver.

## Måtten och rörelseschemat

- Måtten har en källa: koden (kameran, bordet, kortet och kortplatserna i `blackjack-dealer/src/table-lens.ts`,
  dockornas mått i `blackjack-dealer/dealer3d/src/doll.ts`, takten i `dealer3d/src/koreo-giv.ts`). Ett mått ändras
  där, aldrig i ett dokument.
- `MATT.md` i roten är en utskrift av alla mått, vinklar, kortplatser, höjder och takter på ett ställe, bredvid det som
  är mätt på ett riktigt livebord (`live-bj/data/`). Läs den för att se ett mått. Den ändras aldrig för hand:
  `node matt.ts` skriver den, och kontrollen före push skriver om den och säger till när den inte stämmer.
- Rörelseschemat står i `standarddocka/rorelsekatalog.json`: ankarena (en bild som klipp börjar och slutar i: A1,
  A2.3, A3PnCm), stadierna (vad dealern gör: VILA, REDO, GIV, TILLBAKA …, vart och ett med hemankare, grundklipp och
  varianter) och rörelserna (klippen), med vilka som finns och vilka som saknas. En ny rörelse skrivs in där.

## Tillfälligt och producerat

- Arbetsfiler, försök och hjälpskript ligger i `slask/<projekt>/<uppgift>/`, aldrig bland koden. Ta bort din mapp när
  du är klar. Det som har stått orört i tre timmar raderas av `node slask/slask.ts stada` (servern i `blackjack-dealer`
  kör den själv), så lägg aldrig något där som ska finnas kvar.
- Det som produceras (filmer, bilder, modeller, renderingar) raderas som regel (Jakob 2026-11-25). Kvar blir bara det
  som väntar på hans dom, i projektets granskning eller i `slask/<projekt>/granska/<namn>/`, och det han har godkänt
  eller som spelet använder, i projektets mediemapp. Underkänt, bortvalt och ersatt raderas genast av den som gjorde
  det; inget läggs undan för säkerhets skull.

## Sökningen

`.gitignore` och `.ignore` i roten är de enda ignore-filerna. `.ignore` döljer för sökningen det Git har men ingen
sökning ska vada igenom (maskindata, rörelsernas rutor, filmregistret). En tom sökträff betyder därför inte att filen
saknas: läs den med sin sökväg. En ny mapp med maskindata eller stora filer läggs in där i samma steg.

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
