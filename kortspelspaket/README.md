# kortspelspaket

Card Games Animation Pack av The Mighty Cat: 66 inspelade rörelser (motion capture) för dealer och spelare vid ett
kortbord. Det är inget spel utan rörelser att lägga på en 3D-figur, samma 66 i tre format. Regler för mappen står i
`AGENTS.md`.

## Starta

Dubbelklicka `STARTA visaren.cmd`. Första gången packas paketet upp ur Hämtade filer (cirka 1 GB, några sekunder);
sedan öppnas visaren i webbläsaren på `http://127.0.0.1:4330/kortspelspaket/visa/`. Stäng fönstret för att stänga den.

Visaren har två lägen, valda med knapparna överst:

- **Utställningen** ställer upp paketets Unity-demo (`Demo_CardGames.unity`) som den är: sex golv i en rad, en figur per
  rörelse som spelar den om och om igen, och demots kamera. Ett klick på en rad eller en figur går fram till den, och
  "Visa bara den valda" döljer de andra.
- **Blackjackbordet** sätter paketets figur vid spelets bord: en dealer och en spelare på var och en av de sju
  platserna, i samma rum som standarddockans editor visar (bordet, skon, brickan, ljuset) och med spelets kamera. Ett
  klick på en figur väljer den, och ett klick på en rörelse i listan låter den spela den: en dealerrörelse går alltid
  till dealern, en spelarrörelse till den valda spelaren (är dealern vald: spelaren på plats 4). En prick i listan visar
  vad som spelas just nu. Kamerorna är Spelets vy (bara dealern, som i spelet), Hela bordet, Från sidan och Uppifrån,
  och bilden går att vrida med musen. "Spelare" visar alla sju, tre (plats 2, 4 och 6) eller inga. Reglaget "Bordet"
  flyttar bordet upp eller ner i den här vyn, för att pröva vilken höjd som passar rörelserna; ett dubbelklick ställer
  det på spelets höjd. Det ändrar inga mått i spelet. "Kort" visar korten i blackjackdealerns giv: ett kort per giv
  kommer ur skon, följer vänsterhanden in, byter till högerhanden och blir liggande där handen släpper det. Paketet har
  inga kort; de läggs till av visaren (`visa/kort.ts`), efter händernas egna rörelser.

Väljaren "Bord" i bordsvyn har tre bord (`visa/paketbord.ts` bygger de två egna i kod; adressen
`&bordslag=spel|paket|stort`):

- **spelets**: standarddockans bord, som i editorn.
- **paketets, fem platser**: bordet paketet kom med, efter måtten i Unreal-filen: en plan halvmåne 189 x 102,5 cm på
  smala ben. Kortplatserna ligger där de fem givarna landar och spelarna sitter mitt för dem (plats 3 och 5 finns inte),
  55–71 cm isär. Giv 5 landar vid skons nos.
- **större, sju platser**: en plan halv ellips 2,6 x 1,0 m med sju platser 58 cm isär. Given träffar plats 3, 4 och 5,
  landar cirka 30 cm för kort för plats 2 och 6, och plats 1 och 7 får ingen: paketets giv når bara fem ställen.

Dealern, filtens höjd, brickan, skon och spelets vy är desamma vid alla tre; de andra kamerorna flyttas så att hela det
valda bordet ryms, och reglaget "Bordet" flyttar det valda bordet. De egna borden är plana, utan vadderad kant och
sarg, så armarna vilar på skivan och låren går fria.

Listan till vänster har rörelserna i grupper med sin längd, och reglaget nertill stegar genom den valda rörelsen.
Rörelserna laddas fyra i taget (cirka en halv minut för alla); bordet och det som spelas vid det kommer först.

### Klippa ut en bit

En lång rörelse består ofta av flera: dealerns giv är fem givar efter varandra. Ställ reglaget där biten ska börja och
tryck "Börjar här", ställ det där den ska sluta och tryck "Slutar här": biten spelas då om och om igen. Ge den ett namn
och tryck "Spara biten", så står den under sin rörelse i listan; ett klick där spelar den, krysset tar bort den, och
"Hela rörelsen" spelar allt igen. Bitarna sparas i `sekvenser.json` (namn och tider, inget ur paketet).

Alla 66 rörelser är redan delade i sina naturliga bitar (2026-11-26, av en agent med `verktyg/mat.ts`): 161 bitar i 62
rörelser. De fyra rena väntrörelserna (`Poker_Dealer_Card_Idle_01` och `Idle_01`–`03`) har inga. Dealerns bitar är
kontrollerade mot bilder; spelarnas (Bonus, CCG, Reaktioner) mot streckgubbar, så ett tjugotal av deras namn är
tolkningar (en cigarett, ett glas, "händerna till ansiktet"). Ett namn som är fel tas bort med krysset och sparas om.
"Höger" och "vänster" i namnen är figurens egna.

## Paketet vid spelets bord

Det här är mätt ur rörelserna och syns i bordsvyn:

- Rörelserna är inspelade vid ett bord vars skiva ligger 78 cm över golvet, med den som sitter cirka 115 cm från
  bordets mitt. Ställs den skivan på spelets filt och dealerns höft där standarddockans är (15 cm bakom bordets kant),
  vilar dealerns händer på filten strax framför brickan, som standarddockans. (Fingrarnas leder ligger 80–81 cm över
  golvet i vilan; med skivan vid 80 sjönk fingrarna ner i filten, prövat i bild.)
- Bordet paketet kom med (`SM_GamblingTable` i Unreal-delen) är en halvmåne 189 x 102,5 cm med grön filt, smala svarta
  ben och en kortmaskin mitt på den raka kanten, och stolen är 40 x 40 x 92 cm. Måtten är modellens gränslåda, som står
  okomprimerad i filen, och formen syns i filens inbäddade miniatyrbild; hörnpunkterna är komprimerade och gick inte att
  läsa, så benens platser och skivans tjocklek är antagna. I paketets demobana sitter figuren 22–30 cm utanför den raka
  kanten.
- Sju spelare av figurens storlek får knappt plats vid spelets bord. Kortplatserna ligger 16 grader isär sedda från
  dealerns kant, vilket ger 32 cm mellan stolarna; spelarna sitter därför glesare än sina kort (24 grader, 48 cm), vända
  mot dem, och sitter ändå axel mot axel. Bordet är 1,9 m brett; ett riktigt bord för sju är drygt två meter.
- Spelarnas armar går genom bordets vadderade kant, som ligger 3,4 cm över filten: paketets bord är plant. Sänks bordet
  med reglaget kommer armarna över kanten, men då svävar händerna över filten. Det går inte att få båda med en höjd.
- Blackjackdealerns giv (24,7 s) är fem givar på cirka tre sekunder, med en och en halv sekunds vila emellan. Det är en
  giv ur en sko vid dealerns vänstra sida, sett i bild 2026-11-26: vänster hand sträcker sig ut till skon och drar
  kortet, för det in mot mitten, höger hand tar det där och lägger det. Det är samma ordning som Jakobs dom om given
  (`../standarddocka/AGENTS.md`: "vänsterhanden drar kortet ur skon, högerhanden tar det"). Paketets sko har stått där
  spelets står: vänsterhandens fingrar når fram till skons mynning på några centimeter när. De fem korten hamnar i en
  båge som följer spelets kortplatser: på plats 4, cirka 10 cm bortom korten på plats 2 och 6 (vid insatsringen), och
  10–15 cm innanför plats 1 och 7 (talen står i `OVERLAMNING.md`).
- Figuren (och Unreals docka, som rörelserna är gjorda för) är 186 cm lång, längre än standarddockan, så huvudet når
  högre i spelets vy.
- Rörelserna har inga kort, marker eller andra saker: bara kroppen. Korten i blackjackgiven lägger visaren till, och
  i pokerdealerns giv ur maskin (`To_Players_From_Machine_01`), som har samma mönster: vänster hand hämtar kortet på
  samma ställe till vänster om dealern.
- De tre blackjackspelarna gör samma fem saker i samma ordning: knackar i bordet (ett kort till), vinkar av (stannar),
  dubblar (en insats till och ett finger), delar (två fingrar) och lägger sin insats. Det är spelets egna val, färdiga
  som rörelser.
- Kort läggs också i `To_Players_01` och `_02` (ur leken i vänster hand), `Reveal_Cards_01` och `_FromMachine_01`
  (floppen och två kort till) och `RevealHouseCard_01` och `_02` (husets kort vänds); tiderna står som bitar i listan.

## Från figur till person (prov)

Jakobs idé 2026-11-26: skicka figurens rörelse som film till en filmmodell hos Runway tillsammans med en bild av en
person, och få tillbaka personen som gör rörelsen. Första provet (WAN 3.0 i 480p, 20 krediter): kattens giv 3 i spelets
vy med kort (4 s, filmad med `verktyg/titta.ts --film`) och bilden av provpersonen vid bordet. Personen följer kattens
rörelse i samma takt och bildutsnitt, och kortet går ur skon, från hand till hand och ner på platsen. Filmerna, bilden
och anropet ligger i `../slask/kortspelspaket/granska/katt-till-person-1/` och väntar på hans dom. Hur det görs, vad
det kostar och vad de andra sätten ger står i skillen `runway` (`../.claude/skills/runway/SKILL.md`); ett betalt anrop
läggs med `node tools/runway-api.ts place` från `../blackjack-dealer/`, och bara på hans ord.

## Vägen

Riktningen (Jakob 2026-11-26, `AGENTS.md`): bygga utifrån paketets rörelser och lyfta in det som behövs hit. Varje steg
slutar i något han ser i visaren, och nästa börjar inte förrän han har sagt sitt om det. Inget steg är gjort än.

Han vill ha två spår (2026-11-26): här arbetas katterna vid bordet vidare (kort, bord och det andra på plats), och
rörelserna förs över till dockorna av den som äger dem, med `OVERLAMNING.md` som underlag.

1. **En människa i stället för katten.** Standarddockans man får paketets skelett och sitter vid bordet i spelets vy
   och gör en utklippt giv (giv 3, till plats 4). Det visar om en inspelad giv ser bättre ut på vår docka än den
   ritade, och hur fingrarna håller. Lånas: dockans kropp ur `../avatar-auto-pipeline/`.
2. **Given som spelet behöver den.** Paketets giv går ur skon som spelets, men tar tre sekunder och når fem platser;
   spelets ska gå till var och en av de sju platserna, högst en sekund ut och 0,6 tillbaka, och börja och sluta i vilan
   (A1) eller vid skon (A2.3). Den byggs av utklippta bitar som snabbas upp och styrs till platsen. Det här steget
   avgör om vägen håller.
3. **En ny dealer på samma skelett.** Avatar-pipelinen bygger nästa dealer på paketets skelett, så att hon kan alla
   rörelser utan att något görs om. Då lyfts pipelinen in.
4. **Studion och filmerna.** Dockans film blir film av en person, och klippen läggs i spelets träd. Då lyfts det som
   behövs ur `../blackjack-dealer/` in.

Håller inte steg 1 eller 2 för hans domar är paketet ändå en förebild att rita efter: hur en dealer faktiskt rör sig.

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
  tillbaka till vila emellan (se "Paketet vid spelets bord").
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
| `visa/server.ts` | Visarens server: läser Unity-scenen, lämnar ut figuren, rörelserna, sidan och det bordsvyn lånar, och sparar bitarna |
| `visa/index.html`, `visa/visa.ts` | Visarens sida (three.js): listan, de två lägena, reglaget och bitarna |
| `visa/bord.ts` | Bordsvyn: figurerna på sina platser vid spelets bord, pallarna, kamerorna och bordets höjd |
| `visa/paketbord.ts` | De egna borden för paketets figurer: formen, platserna, kortplatserna, brickan och skon |
| `visa/kort.ts` | Korten i blackjackdealerns giv: när kortet dras ur skon, byter hand och släpps räknas ur rörelsen, och kortet följer händerna |
| `verktyg/mat.ts` | Mäter en rörelse utan webbläsare: `node kortspelspaket/verktyg/mat.ts <AS_namn>` ger föreslagna bitar, händernas hållpunkter med grepp och en tidslinje; `--alla` alla 66 med en rad per bit; `--sparade` mäter bitarna i `sekvenser.json`; `--bilder <mapp>` ritar varje bit som streckgubbar, utan grafikkort och lås |
| `verktyg/titta.ts` | Tar bilder av visaren utan fönster, för en agent som ska se vad en ändring gjorde: `node kortspelspaket/verktyg/titta.ts slask/kortspelspaket/<uppgift> topp=vy=bord,kamera=topp,t=12.7` (visaren ska vara igång; sidans fel skrivs ut). Med `--film --fran <s> --till <s>` blir det en film (MP4) av rörelsen mellan de tiderna, utan listan och knapparna; `--bredd` och `--hojd` ger måtten |
| `sekvenser.json` | De utklippta bitarna: per rörelse ett namn och två tider i sekunder |
| `OVERLAMNING.md` | Underlaget för den agent som för över paketets rörelser till standarddockan: hur en rörelse läses, leden mot dockans, givens tal och det som skiljer mot Jakobs domar |
| `STARTA visaren.cmd` | Packar upp vid behov och startar visaren |

Bordsvyn lånar utan att kopiera: spelets mått och kamera (`../blackjack-dealer/src/table-lens.ts`), standardrummet
(`../blackjack-dealer/dealer3d/src/standard-room.ts`), kortplanen (`../blackjack-dealer/placements/default.json`) och
de byggda modellerna av bordet och pallen (`../avatar-auto-pipeline/assets/`, som inte finns i Git: på en dator där de
inte är byggda säger sidan det och visar figurerna utan bord).

Adressen kan välja vad som visas, för den som vill peka på en viss bild:
`?vy=bord&kamera=spel|runt|sida|topp&bordslag=spel|paket|stort&spelare=7|3|nej&kort=nej&bord=<cm>&rorelse=<AS_namn>&t=<sekunder>`
(med `t` står rörelsen stilla där; `bord` är reglagets värde, minus är ner), `&kam=x_y_z_x_y_z_vinkel` ställer en
egen kamera för en närbild (läget, punkten den ser mot och bildvinkeln), och `&ren=1` visar bara scenen, utan listan
och knapparna.

`paket/` går aldrig in i Git (`AGENTS.md`). På en annan dator: lägg de tre filerna i Hämtade filer och dubbelklicka
`STARTA visaren.cmd`, eller kör `node kortspelspaket/packa-upp.ts --fran <mapp>` med mappen där de ligger.
