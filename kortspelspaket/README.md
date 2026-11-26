# kortspelspaket

Card Games Animation Pack av The Mighty Cat: 66 inspelade rörelser (motion capture) för dealer och spelare vid ett
kortbord. Det är inget spel utan rörelser att lägga på en 3D-figur, samma 66 i tre format. Regler för mappen står i
`AGENTS.md`.

## Starta

Dubbelklicka `STARTA visaren.cmd`. Första gången packas paketet upp ur Hämtade filer (cirka 1 GB, några sekunder);
sedan öppnas visaren i webbläsaren på `http://127.0.0.1:4330/kortspelspaket/visa/`. Stäng fönstret för att stänga den.

Visaren ställer upp paketets Unity-demo (`Demo_CardGames.unity`) som den är: sex golv i en rad, en figur per animation
som spelar den om och om igen, och demots kamera. Listan till vänster har rörelserna i grupper med sin längd; ett klick
på en rad eller en figur går fram till den, reglaget nertill stegar genom rörelsen, och "Visa bara den valda" döljer de
andra. Animationerna laddas fyra i taget (cirka en halv minut för alla).

## Vad paketet innehåller

| Grupp | Antal | Vad |
| --- | --- | --- |
| Blackjack | 6 | Dealern ger kort och vänder husets kort (två sätt); tre spelare vid bordet |
| Poker | 18 | Dealern väntar, blandar, ger kort (för hand och ur maskin), visar kort, samlar marker (för hand och med raka) och ger marker; tre spelare |
| Bonus | 11 | Fyra dealer- och sju spelarrörelser utöver grupperna ovan |
| Kortspel (CCG) | 9 | En spelare drar, spelar, kastar och plockar kort, visar handen, dukar upp och av |
| Reaktioner | 22 | Tre spelare som vinner, förlorar, är neutrala eller väntar på de andra |

- Skelettet är Unreals standardskelett (UE5:s Manny och Quinn): 88 ben med alla fingrar, 30 bilder per sekund, och de
  flesta rörelserna är sittande. Dealerns giv i blackjack är 24,7 sekunder: handen går ut till en spelare i taget och
  tillbaka till vila emellan.
- Unity-paketet har också en egen figur, MightyCat_Queen (en vit robotkatt med samma bennamn), med texturer, och
  demoscenen med sina skript (`MightyAnimPlayer.cs` spelar en animation i loop, `MightyDisplay.cs` ställer figurerna i
  rader).
- Unreal-projektet (Unreal Engine 5.5) har samma rörelser som Unreal-tillgångar, Epics provdockor Manny och Quinn, och
  en utställningsbana (`L_Showcase`) med ett enkelt spelbord och en stol. Det öppnas bara i Unreal.

## Kartan

| Sökväg | Vad |
| --- | --- |
| `packa-upp.ts` | Packar upp de tre köpta filerna till `paket/`, som varje program själv lägger dem |
| `paket/fbx/` | De rena animationerna, en FBX-fil per rörelse (ur `CardGamesAnimationPack.zip`) |
| `paket/unity/Assets/` | Ett Unity-projekts `Assets/` (ur `CardGamesAnimPack-600.unitypackage`), med `.meta`-filerna som håller ihop demoscenen; läggs i ett Unity-projekt som det är |
| `paket/unreal/CardGameAnimPack55/` | Unreal-projektet (ur `CardGameAnimPack55.zip`); öppnas med `CardGameAnimPack55.uproject` |
| `visa/server.ts` | Visarens server: läser Unity-scenen och lämnar ut figuren, animationerna och sidan |
| `visa/index.html`, `visa/visa.ts` | Visarens sida (three.js) |
| `STARTA visaren.cmd` | Packar upp vid behov och startar visaren |

`paket/` går aldrig in i Git (`AGENTS.md`). På en annan dator: lägg de tre filerna i Hämtade filer och dubbelklicka
`STARTA visaren.cmd`, eller kör `node kortspelspaket/packa-upp.ts --fran <mapp>` med mappen där de ligger.
