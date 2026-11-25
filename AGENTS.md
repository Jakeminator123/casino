# casino – Jakobs plattform

Ett publikt Git-repo (`github.com/Jakeminator123/casino`) med flera projekt, ett per mapp. Den här filen gäller alla och
läses i varje session; varje projekt har sina egna regler i sin egen `AGENTS.md`, som gäller när arbetet rör det
projektet och går före den här vid konflikt. Jakob äger allt här och är inte programmerare: svara på svenska,
slutsatsen först, och förklara val i vanliga ord.

## Projekten

| Mapp | Vad det är | Börja med |
| --- | --- | --- |
| `blackjack-dealer/` | En filmad dealer till blackjackspelet: studion i webbläsaren, 3D-dockan och spelmotorn. Började om här 2026-11-25; historiken före dess ligger i arkivet `Jakeminator123/dealer`. | `blackjack-dealer/AGENTS.md` |
| `avatar-auto-pipeline/` | Från foton till en riggad 3D-dealer (gpt-image-2, Meshy, Blender), med egen Python-miljö (`.venv`). Foton i `input/`, resultat i `output/`, nycklar i `.env` och den portabla Blendern i `tools/`: inget av det går in i Git. | `avatar-auto-pipeline/README-SV.md` |

Kommer ett projekt till eller tas ett bort ändras tabellen i samma steg. Läs projektets `AGENTS.md` innan du arbetar i
det, även om ditt verktyg inte laddar den själv.

## Vercel

Nätdelen vilar tills Jakob säger till (2026-11-25). En ingång: teamet `jakeminator123s-projects`; för
`blackjack-dealer` projektet `dealer-studio` (kopian på nätet) och Blob-lagret `dealer-studio-media`. Varje
CLI-kommando får `--scope jakeminator123s-projects` (förvalet läses inte när en agent kör CLI:n), och ett anrop genom
Vercels MCP anger samma team. Länka aldrig ett projekts rot till Vercel. Inget raderas, deployas eller laddas upp utan
Jakobs ord.

## Samma regler i alla verktyg

Det här gäller lika i Cursor, Claude Code, Codex, andra IDE:er och anrop direkt mot en modells API (Jakob
2026-11-25). Därför står allt som gäller i vanliga filer som alla kan läsa: `AGENTS.md` (Claude Code läser den genom
`CLAUDE.md`, som bara importerar den), `.ignore` för sökningen, Git-hookar och projektens kommandon (`npm run ...`).
Inställningar som bara ett verktyg förstår (`.cursorignore`, `.cursor/`, `.claude/settings.json` och hookar där) är
extra skydd ovanpå, aldrig det enda stället en regel står. Ett anrop direkt mot ett API läser ingenting själv: skicka
med den här filen och projektets `AGENTS.md`.

MCP-servrar som bara casino behöver står i `.cursor/mcp.json` här (Meshy, som läser sin nyckel ur
`avatar-auto-pipeline/.env`); i användarens globala inställningar står bara det alla hans projekt behöver. En nyckel
skrivs aldrig in i en inställningsfil, bara i en `.env` som Git ignorerar.

## Spara och Git

- Jakob använder inte Git själv och ska aldrig behöva göra det (2026-11-25). En agent sparar filerna när den ändrar
  dem. När ett arbete är klart och kontrollerat committar agenten sina egna filer med ett kort meddelande om vad och
  varför, och pushar till `main`, utan att fråga. Det som stoppar är en röd kontroll (rätta orsaken) eller det
  projektets `AGENTS.md` säger kräver Jakobs ord (till exempel deploy eller betald generering). Ingen force-push.
- Repot är publikt. `.gitignore` här håller tillbaka hemligheter, media, miljöer och slasken i alla projekt, och
  kontrollen före push (`blackjack-dealer/tools/publication-check.ts`, installerad med `npm run hooks:install` i
  `blackjack-dealer/`) stoppar en push som ändå bär sådant.

## Underagenter och tokens

Jakobs budget delas av alla chattar och underagenter, och kvaliteten får inte bli sämre av att spara (2026-11-25):
- Modell: mycket enkla uppgifter (byta en text på flera ställen, lista filer) körs på Grok 4.7 extra hög, snabb när
  den finns; allt annat på samma eller en bättre modell än huvudagentens, vald av huvudagenten.
- Uppdraget bär det underagenten behöver, inte huvudagentens historik: målet, filerna att läsa och ändra, reglerna som
  gäller, hur arbetet kontrolleras och exakt vad som ska rapporteras.
- Svaret tillbaka är kort och bara det som efterfrågades: vad som ändrades, kontrollens resultat och det som är osäkert.
- Parallella underagenter får skilda filer (en skribent per fil) och var sin leverans; det som beror på ett annat
  resultat väntar på det.
- En ny chatt per större uppgift: en lång chatt skickar om hela historiken vid varje steg, och `AGENTS.md` och
  projektets överlämning gör starten billig.
- Inga stora utskrifter: sök fram stället först, läs avsnitt i stället för hela filer.

## Dokumentation nerifrån och upp

- Varje projekt beskriver sig självt: regler i sin `AGENTS.md`, mappar och körning i sin README. Där är källan;
  tabellen ovan har en rad per projekt och pekar dit.
- En ändring skrivs in närmast där den gjordes: i koden, i mappens README eller i projektets dokument. Ett dokument
  högre upp ändras bara där en rad inte längre stämmer.
- Skriv det som gäller nu, en gång och på rätt ställe; historien står i Git.

## Klart betyder städat och dokumenterat

Jakob ska aldrig behöva be om det. Innan ett arbete som har ändrat filer lämnas:

1. Ta bort det ändringen gjorde överflödigt: kod som inget anropar, ersatta filer, döda sökvägar och egna
   tillfälliga filer. Kontrollera användningen före radering; det som är tveksamt frågas Jakob om i stället.
2. Rätta dokumentationen som ändringen gjorde fel, nerifrån och upp.
3. Har en fil eller mapp tillkommit, försvunnit eller bytt syfte: rätta projektets karta (README), tabellen ovan
   och ignore-filerna (nedan).
4. Säg i svaret vad som städades och vilka dokument som ändrades, eller att inget behövdes.

## Det som produceras

Allt som produceras raderas som regel (Jakob 2026-11-25). Kvar blir det han har godkänt och det som väntar på hans
dom; det han inte godkänner raderas, om ingen agent har uppgiften att arbeta om det. Hur det görs står i projektets
`AGENTS.md`.

## Slasken

- `slask/` här är stället för det som är tillfälligt, framför allt det som produceras (filmer, bilder, 3D-modeller)
  innan Jakob har sagt om det ska sparas (2026-11-25). Det som väntar på hans dom ligger i
  `slask/<projekt>/granska/<namn>/` och står kvar tills han har dömt: godkänt flyttas in i projektet, underkänt raderas.
- Allt annat i slasken är arbetsfiler: `slask/<projekt>/<uppgift>/`, en mapp per uppgift eller verktyg, inga lösa
  filer. Hjälpskript skrivs i TypeScript som projektets kod (Node 24 kör `.ts` direkt). Agenten tar bort sin
  uppgiftsmapp när den är klar; det som ändå blir kvar och är äldre än sju dygn raderas.
- Ett projekts verktyg hittar sin undermapp som `../slask/<projekt>` från projektets rot, eller med en miljövariabel
  (`DEALER_SLASK` i `blackjack-dealer`). Ingen kod eller text pekar på en viss disk eller dator.
- `slask/bygg/` är kontrollens byggträd (en extra utcheckning av repot, med loggarna i `slask/push-logg` och
  `slask/studio-logg`). Den rensas inte efter sju dygn; ett byggträd tas bort med `git worktree remove`.
- Projektens kommandon (`npm start`, `npm test`, `npm run check`) körs från projektets mapp, till exempel
  `blackjack-dealer/`.
- Ett projekt kan ha en egen dold mapp för verktygens tillstånd, som `blackjack-dealer/.runtime/`: databaser som byggs
  om, liggare, loggar och kvitton. Den sköts av verktygen; lägg inget eget arbete där.

## Sökningen och ignore-filerna

- Sökningen ser inte allt, med avsikt. `.ignore` här döljer byggrester, cacher, Python-miljöer, hemligheter och
  avatarprojektets bilder och Blender; ett projekts egen `.ignore` lägger till sitt (i `blackjack-dealer/`: media,
  maskindata och filmregistret). En tom sökträff betyder inte att filen saknas: läs den med sin sökväg.
- En ny mapp med maskindata, byggrester eller stora filer läggs in i ignore-filerna i samma steg, med en kommentar om
  varför och hur den läses.
- `.ignore` är huvudfilen; `.cursorignore` bär bara det Cursor aldrig får läsa (hemligheter, binärer). Cursor låter
  inte agenten skriva `.cursorignore`: föreslå raden för Jakob i stället.

## Datorerna

- Repot klonas till valfri mapp på vilken dator som helst (Jakob har en laptop och en stationär). En sökväg till en
  viss dator, en användare eller en disk (som `C:/Users/<namn>/...` eller `D:/...`) är ett fel som rättas när arbetet
  rör den.
- Media följer inte med Git. Jakob började om 2026-11-25: det som finns på den stationära kopieras inte hit, utom en
  enskild godkänd fil han ber om.
