# Måtten: Livestandarden, Danilo och Frasse

Alla mått på ett ställe: kameran, bordet och det som står på det, var korten hamnar, dockorna och rörelserna, var och en bredvid det som är mätt på filmen av ett riktigt livebord och två riktiga dealrar (`live-bj/`).

**Den här filen ändras aldrig för hand.** Den skrivs av `node matt.ts` (från repots rot) ur måttens egna källor, och skrivs över nästa gång. `node matt.ts --kolla` säger om den inte längre stämmer med källorna. Ett mått ändras på riktigt där kolumnen Källa säger (oftast `blackjack-dealer/src/table-live.ts`, se Källorna sist), och sedan körs `node matt.ts` igen. Jakobs domar står i `standarddocka/DOMAR.md`; kolumnen Jakobs dom citerar dem och är aldrig källan till ett tal.

Så läses talen: meter, centimeter, millimeter, grader och sekunder. "Åt sidan" är åt dealerns vänster (bildens höger) med plus, räknat från kamerans fot. "Från kanten" är från bordets kant mot dealern, ut mot spelarna. Skillnaden är koden minus det mätta och ska vara noll där koden är kopierad ur mätningen; det som inte är mätt är vårt eget mått, märkt antaget. Mätningen är preliminär: kameran är inte bekräftad än.

## 1. Kameran

Höjden är över filten och avstånden längs filten från kamerans fot (punkten rakt under den). Bildvinkeln är hela bildens, kant till kant. Brännvidden står i bildpunkter, eftersom det är så den är mätt. Spelet, dockans editor, inspelningen och varje beställning ser genom den här kameran.

| Mått | Koden | Mätt på film (preliminärt) | Skillnad | Hur säkert | Källa |
| --- | --- | --- | --- | --- | --- |
| höjd över filten | 0,6175 m | 0,6175 m | ±0 m (±0 %) | mätt | `table-live.ts LIVE_CAMERA.height` |
| lutning nedåt | 18,13° | 18,13° | ±0° | mätt | `table-live.ts LIVE_CAMERA.pitch` |
| rullning | −0,16° | −0,16° | ±0° | mätt | `table-live.ts LIVE_CAMERA.roll` |
| brännvidd | 1290,3 bildpunkter | 1290,3 bildpunkter | ±0 (±0 %) | mätt | `table-live.ts LIVE_CAMERA.focalPx` |
| bildvinkel i sidled och höjdled | 67,6° och 41,3° |  |  | mätt | `table-live.ts LIVE_CAMERA` |
| bilden | 1728 × 972 bildpunkter (1,78 : 1) | 1728 × 972 bildpunkter (1,78 : 1) | — | mätt | `table-live.ts LIVE_CAMERA.film` |
| kanten mot dealern från kamerans fot | 1,5375 m | 1,5375 m | ±0 m (±0 %) | mätt | `table-live.ts LIVE.edge` |

## 2. Bordet och det som står på det

Livebordet i koden (`blackjack-dealer/src/table-live.ts LIVE`), i kamerans linsvärld (kameran rakt över origo), kopierat ur mätningen (`live-bj/data/uppsattning.json`) och byggt i Blender av `avatar-auto-pipeline/scen/bygg_bord.py`.

| Sak | Mått | Koden | Mätt på film (preliminärt) | Skillnad | Hur säkert | Källa | Jakobs dom |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Filten | djup; bredd vid kanten mot dealern | 0,714 m; 1,459 m | 0,714 m; 1,459 m | ±0 m (±0 %) | mätt | `table-live.ts LIVE.felt` |  |
|  | bågens radie; mitten bakom kanten | 0,7295 m; 1,56 cm | 0,7295 m; 1,56 cm | ±0 m (±0 %) | mätt | `table-live.ts LIVE.felt` |  |
| Rullen | bredd utanför filten; rullens topp över filten; dess yttre sida under filtens nivå | 6,5 cm; 21 mm; 15 mm | 6,5 cm; 21 mm; 15 mm (1,4 bildpunkter fel) | ±0 m (±0 %) | mätt (höjden svagt) | `table-live.ts LIVE.rail` |  |
| Hyllan bakom kanten, vid dealerns höger | högra sidans ytterkant i sidled; bakre sidan bakom kanten | −0,403 m; 0,332 m | −0,403 m; 0,332 m | ±0 m (±0 %) | mätt | `table-live.ts LIVE.shelf` |  |
| Skon | fotens längd × bredd | 0,274 m × 0,103 m | 0,274 m × 0,103 m | ±0 m (±0 %) | mätt | `table-live.ts LIVE.shoe` |  |
|  | fotens tre hörn: största avstånd |  |  | 0 mm | mätt | `table-live.ts LIVE.shoe.foot` |  |
|  | höjd bak; den klara frontens topp | 0,117 m; 0,061 m | 0,117 m; 0,06 m och 0,062 m (de två topphörnen) | ±0 m (±0 %) | mätt | `table-live.ts LIVE.shoe` |  |
|  | frontens lutning bakåt från lodrätt | 33,4° | 34° och 32,8° (de två topphörnen) | — | mätt | `table-live.ts LIVE.shoe.plateLean` |  |
|  | bädden kortleken ligger på: lutning från filten; höjd fram | 13,4°; 3 mm | 13,4°; 3 mm | ±0° | mätt | `table-live.ts LIVE.shoe.bedLean, windowLift` |  |
|  | korten i skon: hur de ligger | långsidan tvärs skon, kortsidan uppför fronten, lutade som den | ryggens mönster 78 mm tvärs och 52 mm uppför | — | mätt | `table-live.ts liveShoeCard` |  |
|  | kortleken längs bädden | 0,18 m | — | — | skattat | `table-live.ts LIVE.shoe.deckLength` |  |
|  | nästa kort i fronten: mitten | 0,458 m åt sidan, 0,098 m från kanten, 2,9 cm över filten | 0,458 m åt sidan, 0,097 m från kanten, 2,9 cm över filten | 1,3 mm | mätt | `table-live.ts liveShoeCard` |  |
|  | den lösa klara biten framför skon: hörnen, största avstånd |  |  | 0 mm | mätt | `table-live.ts LIVE.clearPiece` |  |
| Lådan för använda kort | fotens mått; höjden | 0,076 m × 0,093 m; 0,1575 m | 0,076 m × 0,093 m; 0,159 m och 0,156 m | ±0 m (±0 %) | mätt | `table-live.ts LIVE.box` |  |
|  | mitten åt sidan; från kanten | −0,611 m; 0,035 m |  | hörnen 0 mm | mätt | `table-live.ts liveBox` |  |
|  | de använda korten | ligger plant, ryggen upp; högen 3 cm | ligger plant, ryggen upp | — | mätt; högen skattad | `table-live.ts LIVE.box.pile` |  |
| Skärkortet | mitten åt sidan; från kanten | −0,574 m; 0,133 m |  |  | mätt | `table-live.ts LIVE.cutCard` |  |
| Markerbrickan |  | ingen (vår kan läggas till i Blender som ett tillägg: bygg_bord.py --med-bricka) | ingen | — | mätt | `table-live.ts LIVE.tray` |  |
| Insatsmärkena | sju, största avstånd | plats 4 0,63 m från kanten |  | 0 mm | mätt | `table-live.ts LIVE.betMarks` |  |
|  | ringen runt märket: radie | 27 mm | — (spelets ritade knappar) | — | antaget (vår) | `standard.ts BET` |  |
| Kortet | bredd × höjd | 63 mm × 88 mm | passar bäst: poker 63,5 × 88,9 mm (fel 0,54 bildpunkter) | −0,5 mm × −0,9 mm | mätt | `space.ts CARD`; `scen.json camera.cardSize` | "Våra kort som används i 'standarddocka'-mappens editor är det som ska användas som standard" (2026-11-26) |
|  | tjocklek och hörnradie | 0,3 mm; hörnen 3,5 mm | — | — | antaget (ett riktigt kort) | `space.ts CARD.thickness, corner` |  |
|  | kortbunten i Blender | 8 lekar | — | — | antaget | `standard.yaml kort.lekar_i_skon` |  |
| Golvet | filten över golvet; sitsen | 0,95 m (±0,1); 0,67 m | 0,95 m; 0,67 m | ±0 m (±0 %) | slutlett | `table-live.ts LIVE.floor` |  |

## 3. Var korten hamnar

Kortplatserna (`table-live.ts LIVE.cards`), kortets mitt. P är spelarnas platser och C kortets nummer, D dealerns egna. Platserna räknas i dag från bildens vänster: plats 1 längst till vänster i bilden, vid dealerns höger. Vridningen är kortets långsida från tvärs kanten som mätningen har den: "mätt" där landningarna var eniga, annars den speglade platsens. Bildpunkten (x; y, origo uppe till vänster) är kortets mitt i bilden 1728 × 972 genom kameran (`table-live.ts liveSee`). Avståndet är koden mot mätningen (`uppsattning.json card_places`).

| Plats | Åt sidan | Från kanten | Från kantens mitt | Vriden | Landningar | Bildpunkt | Mot mätningen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D.C1 | −0,027 m | 0,177 m | 0,179 m | 4,8° (mätt) | 18 | 839,5; 627,6 | 0 mm |
| D.C2 | 0,024 m | 0,193 m | 0,194 m | 177,7° (mätt) | 18 | 884,4; 633,4 | 0 mm |
| D.C3 | −0,027 m | 0,181 m | 0,183 m | 3,5° (mätt) | 11 | 839,7; 628,9 | 0 mm |
| P1.C1 | −0,421 m | 0,319 m | 0,528 m | 128,7° (spegel av P7.C1) | 6 | 461; 682,8 | 0 mm |
| P1.C2 | −0,373 m | 0,322 m | 0,493 m | 136° (mätt) | 5 | 505,6; 684,2 | 0 mm |
| P1.C3 | −0,37 m | 0,321 m | 0,49 m | 124,9° (spegel av P7.C3) | 3 | 508,8; 683,9 | 0 mm |
| P2.C1 | −0,296 m | 0,41 m | 0,506 m | 150° (spegel av P6.C1) | 3 | 560,1; 725,8 | 0 mm |
| P2.C2 | −0,299 m | 0,42 m | 0,516 m | 149,9° (spegel av P6.C2) | 2 | 555,4; 730,8 | 0 mm |
| P3.C1 | −0,094 m | 0,44 m | 0,45 m | 166,1° (spegel av P5.C1) | 3 | 764,8; 741,6 | 0 mm |
| P4.C1 | 0,015 m | 0,512 m | 0,513 m | 177,7° (mätt) | 11 | 879,8; 781,9 | 0 mm |
| P4.C2 | 0,044 m | 0,473 m | 0,475 m | 179° (mätt) | 9 | 909,9; 759,4 | 0 mm |
| P5.C1 | 0,158 m | 0,497 m | 0,522 m | 13,9° (mätt) | 6 | 1034,8; 773,6 | 0 mm |
| P5.C2 | 0,18 m | 0,454 m | 0,488 m | 12,4° (mätt) | 4 | 1053,2; 749,5 | 0 mm |
| P6.C1 | 0,292 m | 0,433 m | 0,522 m | 30° (mätt) | 14 | 1166,4; 739 | 0 mm |
| P6.C2 | 0,297 m | 0,387 m | 0,488 m | 30,1° (mätt) | 11 | 1161,3; 715,8 | 0 mm |
| P6.C3 | 0,295 m | 0,377 m | 0,479 m | 30° (som P6.C1) | 3 | 1156,8; 711,4 | 0 mm |
| P7.C1 | 0,426 m | 0,307 m | 0,525 m | 51,3° (mätt) | 14 | 1267,1; 679,9 | 0 mm |
| P7.C2 | 0,416 m | 0,261 m | 0,491 m | 44° (spegel av P1.C2) | 11 | 1244,7; 660,8 | 0 mm |
| P7.C3 | 0,461 m | 0,264 m | 0,531 m | 55,1° (mätt) | 5 | 1287,2; 661,8 | 0 mm |

## 4. Dockorna

Dockornas mått står i `blackjack-dealer/dealer3d/src/doll.ts`: Danilo och Frasse har kroppens mått och stil ur mätningen av de två dealrarna och vårt eget ansikte. De riktiga dealrarna är mätta i bilden, axlarna på ett plan antaget bakom kanten; armarnas längd går inte att mäta (dockans egna används).

| Mått | Danilo | Frasse | Kenji | Danilo (dealer A, ser i kameran) | Frasse (dealer B, ser på bordet) | Källa |
| --- | --- | --- | --- | --- | --- | --- |
| överarm; underarm | 0,279 m; 0,272 m | 0,279 m; 0,272 m | 0,279 m; 0,272 m | — | — | `doll.ts upperArm, forearm` |
| räckvidd innan bålen böjer sig | 0,536 m | 0,536 m | 0,536 m | — | — | `doll.ts reach` |
| handens längd, handled till långfingrets topp | 0,189 m | 0,189 m | 0,189 m | — | — | `doll.ts hand.right[12]` |
| axelbredd | 0,357 m | 0,348 m | 0,357 m | 0,357 m | 0,348 m | `doll.ts dollFrame`; `table-live.ts LIVE.dealer.styles.*.shoulderWidth` |
| axlarnas mitt över filten | 0,318 m | 0,31 m | 0,318 m | 0,318 m | 0,31 m | `doll.ts place.shoulderHeight`; `table-live.ts LIVE.dealer.styles.*.shouldersMiddle` |
| ögonen över filten | — (ben i modellen) | — (ben i modellen) | — (ben i modellen) | 0,509 m | 0,514 m | `table-live.ts LIVE.dealer.styles.*.eyesOverFelt` |
| huvudets mitt över filten; radien | 0,55 m; 0,112 m | 0,535 m; 0,104 m | 0,556 m; 0,117 m | — | — | `doll.ts dollFrame.head, headRadius` |
| axlarna bakom kanten | 0,2 m | 0,2 m | 0,2 m | 0,2 m (antaget; skattat 0,07 m) | 0,2 m (antaget; skattat 0,16 m) | `doll.ts place.behindEdge`; `table-live.ts LIVE.dealer.behindEdge` |
| höften under filten | 0,115 m | 0,123 m | 0,115 m | — | — | `doll.ts hipBelowFelt` |
| mest lutning framåt; mest vridning | 25°; 20° | 25°; 20° | 25°; 20° | — | — | `doll.ts mostLean, mostTwist` |
| vänsterhandens grepp vid skon: höjd över filten | — | — | — | 4,8 cm | 3,7 cm | `table-live.ts LIVE.dealer.styles.*.leftAtShoe` |

## 5. Rörelserna

Dockornas rörelser, lyfta ur livebordets film och lagda på dockans kropp (`blackjack-dealer/dealer3d/tools/lyft-till-docka.ts`), en fil per rörelse i `blackjack-dealer/dealer3d/data/`. Takten ur varje fils huvud: greppet vid skon tills kortet lämnar den, kortet ut tills det ligger, och handen hem. Jakobs dom om takten: "Att ge ett kort ska ta 1.2 sek och återgången 0.8" (2026-11-27).

| Rörelsen | Till | Hela | Greppet vid skon | Kortet ut | Handen hem |
| --- | --- | --- | --- | --- | --- |
| lyft-danilo-bytet-p4 | P4.C1 | 37 rutor = 1,23 s | 0 s | 0,47 s | 0,73 s |
| lyft-danilo-hem | — | 44 rutor = 1,47 s | — | — | — |
| lyft-danilo-p2 | P2.C2 | 106 rutor = 3,53 s | 1,13 s | 0,87 s | 1,5 s |
| lyft-danilo-p4 | P4.C1 | 66 rutor = 2,2 s | 0,73 s | 0,7 s | 0,73 s |
| lyft-danilo-p7 | P7.C1 | 76 rutor = 2,53 s | 0,8 s | 0,9 s | 0,8 s |
| lyft-danilo-till-bytet | — | 30 rutor = 1 s | 0,73 s | — | — |
| lyft-danilo-till-skon | — | 26 rutor = 0,87 s | — | — | — |
| lyft-danilo-vantan-1 | — | 140 rutor = 4,67 s | — | — | — |
| lyft-danilo-vantan-2 | — | 123 rutor = 4,1 s | — | — | — |
| lyft-frasse-bytet-p4 | P4.C1 | 63 rutor = 2,1 s | 0 s | 1,4 s | 0,67 s |
| lyft-frasse-hem | — | 48 rutor = 1,6 s | — | — | — |
| lyft-frasse-p1 | P1.C2 | 74 rutor = 2,47 s | 0,37 s | 0,73 s | 1,33 s |
| lyft-frasse-p4 | P4.C1 | 83 rutor = 2,77 s | 0,5 s | 1,57 s | 0,67 s |
| lyft-frasse-p7 | P7.C1 | 53 rutor = 1,77 s | 0,4 s | 0,73 s | 0,6 s |
| lyft-frasse-till-bytet | — | 21 rutor = 0,7 s | 0,5 s | — | — |
| lyft-frasse-till-skon | — | 28 rutor = 0,93 s | — | — | — |
| lyft-frasse-vantan-1 | — | 177 rutor = 5,9 s | — | — | — |
| lyft-frasse-vantan-2 | — | 177 rutor = 5,9 s | — | — | — |
| lyft-kenji-bytet-p4 | P4.C1 | 37 rutor = 1,23 s | 0 s | 0,47 s | 0,73 s |
| lyft-kenji-hem | — | 44 rutor = 1,47 s | — | — | — |
| lyft-kenji-p2 | P2.C2 | 106 rutor = 3,53 s | 1,13 s | 0,87 s | 1,5 s |
| lyft-kenji-p4 | P4.C1 | 66 rutor = 2,2 s | 0,73 s | 0,7 s | 0,73 s |
| lyft-kenji-p7 | P7.C1 | 76 rutor = 2,53 s | 0,8 s | 0,9 s | 0,8 s |
| lyft-kenji-till-bytet | — | 30 rutor = 1 s | 0,73 s | — | — |
| lyft-kenji-till-skon | — | 26 rutor = 0,87 s | — | — | — |
| lyft-kenji-vantan-1 | — | 140 rutor = 4,67 s | — | — | — |
| lyft-kenji-vantan-2 | — | 123 rutor = 4,1 s | — | — | — |

De riktiga dealrarnas takt, medianer (inom parentes det minsta och största där stil-filen har räknat det på mer än en antagen höjd för handen):

| Delen | Danilo (dealer A, ser i kameran) | Frasse (dealer B, ser på bordet) | Källa |
| --- | --- | --- | --- |
| Greppet vid skon, tills kortet har lämnat den | 0,2 s | 0,1 s | `stil-*.json tempo.left_at_shoe_s` |
| Vänsterhanden med kortet till mötet | 0,47 s | 0,37 s | `stil-*.json tempo.left_back_with_card_s` |
| Händerna möts, räknat från att vänstern är framme | −0,13 s | −0,13 s | `stil-*.json handover.meets_after_left_arrives_s` |
| Högerhanden ut med kortet | 0,73 s | 0,67 s | `stil-*.json tempo.right_out_s` |
| Högerhanden hem | 0,8 s | 0,6 s | `stil-*.json tempo.right_back_s` |
| Vänsterhanden tillbaka till skon efter släppet | 0,5 s | 0,47 s | `stil-*.json tempo.left_to_shoe_s` |
| Från ett grepp vid skon till nästa, när han ger i följd | 1,32 s | 1,12 s | `stil-*.json tempo.grip_to_grip_when_dealing_on_s` |
| En blinkning | 0,13 s | 0,23 s | `stil-*.json blinks.seconds` |

## 6. Rörelsekatalogen

Rörelseschemat som `standarddocka/rorelsekatalog.json` har det: det ändras där, inte här.

- **Läge.** Var en hand är, inte en hel bild: H för höger hand och V för vänster (dealerns egna händer; dealerns höger är till vänster i bilden), följt av samma siffror som ankarena: 1 vila, 2 skon, 3 ett kort på bordet, 4 lådan för använda kort. H1 är högern i vila, V2.3 vänstern vid skon, H3P4 högern vid kortet på plats 4.
- **Ankare.** En bild, inte en tid: en bestämd ställning där dockan står stilla, och som varje film börjar och slutar exakt i. Ett ankare är ett läge för varje hand (A2.3 = H1 + V2.3). Det är där två klipp kan sättas ihop, och där spelet kan välja vad som kommer härnäst. A står för ankare. Ett ankare kostar en bild per dealer och kamera, så de ska vara få: ett nytt läggs bara till där spelet måste kunna stanna och välja väg.
- **Rörelse.** Ett klipp: en rörelse från ett ankare till ett ankare (ofta tillbaka till samma). Heter efter vad dealern gör. Inuti klippet har händerna var sin tidslinje, som i filmen: vänstern kan ta nästa kort medan högern lägger det förra.
- **Stadium.** Vad dealern håller på med i spelet just nu: VILA, REDO, GIV, TILLBAKA och så vidare. Ett stadium har ett hemankare och en uppsättning klipp som får spelas medan spelet är där: ett grundklipp och varianter. VILA är till exempel ett grundklipp på ungefär en sekund i A1 och ett antal korta klipp som alla börjar och slutar i A1.
- **Schemat.** Ankarena är noderna, klippen är strecken mellan dem, och stadiet säger vilka streck som hör ihop. En runda är en väg genom schemat, skriven med streck som förut: A1 - A2.3 - A3P4C1 - A2.3 - A1.
- **Brygga.** En kort rörelse som dockan gör själv, utan förlaga: från ankarets läge till där ett lyft stycke börjar, eller därifrån tillbaka. Den gör klippet aningen längre men låter oss lyfta det bästa stycket även när dealern började lite vid sidan av ankaret.
- **Det som inte härmas.** Det dealern gör som inte ska härmas (sköta skon, en oväntad gest): dockan väntar då i sitt läge tills dealern börjar nästa stycke som börjar i samma läge, den mest lika starten (Jakob 2026-11-27).

### Lägena per hand

Var en hand är när ett klipp börjar och slutar. Bredvid: hur många gånger och hur länge sammanlagt handen står stilla i läget hos de riktiga dealrarna (`live-bj/data/segment.json dealrar.<A|B>.lagen`).

| Läge | Hand | Namn | Var | I ankarena | Status | Danilo (dealer A) | Frasse (dealer B) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | höger | Vila framför | högern vilar på filten framför kroppen, vid eller bredvid de egna korten | A1, A1V, A2.3 | finns | 36 stopp, 114 s | 28 stopp, 144 s |
| H1S | höger | Vila åt sidan | högern utsträckt åt sidan på filten, mot lådan för använda kort: så vilar båda dealrarna medan insatserna läggs | A1S | saknas | 5 stopp, 40 s | 11 stopp, 74 s |
| H2M | höger | Vid mötet | högern framme vid kortet i vänsterns hand, mitt framför dealern och en bit åt skon (Danilos och Frasses: högern i handbytets ruta i given till plats 4, pekfingret på kortets övre kant och tummen mot dess sida) | A2M | finns | 3 stopp, 13 s | 3 stopp, 1 s |
| H3Pn | höger | Vid kortet på plats n | högern kvar vid kortet den just lagt på plats n (1–7) | A3PnCm | finns | 12 stopp, 12 s | 17 stopp, 5 s |
| H3D | höger | Vid dealerns egna kort | högern vid kortet den just lagt på dealerns egen plats, eller vilar där medan spelarna väljer | A3DCm | saknas | 19 stopp, 26 s | 30 stopp, 31 s |
| H4 | höger | Vid lådan | högern lyft vid lådan för använda kort, med korten | — | saknas | 3 stopp, 2 s | 2 stopp, 1 s |
| V1 | vänster | Vila framför | vänstern vilar på filten framför kroppen | A1, A1S | finns | 48 stopp, 118 s | 22 stopp, 14 s |
| V1S | vänster | Vila mot skon | vänstern vilar mellan kroppen och skon, där den också lämnar kortet i handbytet: så väntar båda dealrarna medan spelarna väljer | A1V, A2M | saknas | 12 stopp, 43 s | 39 stopp, 199 s |
| V2.3 | vänster | Vid skon | vänstern vid skons front, redo att ta kortet | A2.3, A3PnCm, A3DCm | finns | 57 stopp, 74 s | 43 stopp, 67 s |
| V3D | vänster | Vid dealerns egna kort | vänstern vid kortet den lagt på dealerns egen plats, när den ger det ensam | — | saknas | 14 stopp, 15 s | 10 stopp, 9 s |
| V3Pn | vänster | Vid kortet på plats n | vänstern vid kortet på en plats nära skon (6 och 7), när den ger ensam (dockans vänsterhandsgiv till plats 6 och 7 slutar här) | — | finns | 6 stopp, 6 s | 5 stopp, 8 s |

### Ankarena

| Ankare | Namn | Höger + vänster | Var händerna är | Status | Anteckning |
| --- | --- | --- | --- | --- | --- |
| A1 | Vila | H1 + V1 | båda händerna vilar på filten framför dealern, blicken mot kameran | finns |  |
| A1S | Vila under insatserna | H1S + V1 | högern utsträckt mot lådan, vänstern framför kroppen (Frasse: mot skon), blicken mot kameran | förslag | filmens vanligaste stillhet mellan rundorna; svepet över bordet börjar här när given börjar |
| A1V | Väntan medan spelarna väljer | H1 + V1S | högern framför kroppen, vänstern mot skon | förslag | filmens vanligaste stillhet mitt i rundan, hos båda dealrarna |
| A2.3 | Redo vid skon | H1 + V2.3 | vänstern vid skons mynning, högern redo framför dealern, blicken på skon | finns | Danilos och Frasses är tagna ur filmen: kroppen, vänstern, huvudet och blicken där dealern har dem när vänstern är vid skon i en giv till plats 4 (dealern ser där inte på skon: huvudet böjt mot bordet, vridet några grader mot skon). Givarna börjar och slutar här |
| A2M | Handbytet | H2M + V1S | båda händerna vid kortet mitt framför dealern, vänstern håller det och högern tar det | finns | Danilos och Frasses är tagna ur filmen: rutan där kortet byter hand i given till plats 4, oförändrad (kortet på kant mellan händerna, vänstern i dess ena ände och högerns pekfinger på dess övre kant; kroppen, huvudet och blicken som dealerns). Skon till bytet slutar och bytet till platsen börjar här, samma ställning vart kortet än ska (Jakob 2026-11-27: en universell överlämning). Vänstern är här på väg tillbaka mot skon, inte i vila. Skarven när korten ges i följd: i filmen nästan stannar kortets hand här (6–8 % av toppfarten), och högern går oftast direkt från ett kort till nästa i stället för hem (av de kort hos en spelare som följs av ett nytt kort: Frasse 54 av 56, Danilo 18 av 26). Då behövs två klipp per kort (HEM-TILL-BYTET och GIV-FRAN-BYTET) i stället för ett för varje par av platser |
| A3PnCm | Kortet har landat hos en spelare | H3Pn + V2.3 | plats n (1–7), kort m; handen ligger kvar vid kortet | finns | Danilo och Frasse har ett lyft kort 2 till var sin plats (GIV-KORT-2). I filmen är vänstern oftast redan på väg med nästa kort i detta ögonblick |
| A3DCm | Kortet har landat hos dealern | H3D + V2.3 | dealerns egna kortplats, kort m | saknas | finns bara för den äldre dockan |

Båda händerna stilla samtidigt hos de riktiga dealrarna, de åtta vanligaste paren av lägen (en hel bild; de vanligaste är kandidaterna till ankare):

| Höger + vänster | Ankare | Danilo (dealer A) | Frasse (dealer B) |
| --- | --- | --- | --- |
| H1 + V1S | A1V | 6 gånger, 28,7 s | 19 gånger, 64 s |
| H1 + V2.3 | A2.3 | 13 gånger, 24,3 s | 10 gånger, 52,1 s |
| H1S + V1S | — | — | 10 gånger, 74 s |
| H1 + V1 | A1 | 14 gånger, 37,8 s | 2 gånger, 0,8 s |
| H2 + V2.3 | — | 11 gånger, 25,2 s | — |
| H1S + V1 | A1S | 6 gånger, 25,1 s | — |
| H3D + V1 | — | 5 gånger, 3,3 s | 12 gånger, 9,9 s |
| H1 + V3Pn | — | 4 gånger, 4,4 s | 4 gånger, 7,1 s |

### Rörelserna, stadium för stadium

I den ordning katalogen har stadierna. "Filerna" är rörelsens lyft i `blackjack-dealer/dealer3d/data/` (katalogens fält `lyfta`); "Stämmer?" jämför dem med katalogens status. Bredvid står samma kategori i indelningen av hela livefilmen (`live-bj/data/segment.json dealrar.<A|B>.kategorier`, mätt på film, preliminärt), hand för hand: hur många stycken och hur länge ett tar (median, och 10–90 % av dem). En kategori kan höra till flera rörelser: GIV är alla kort till en plats, vilket kort det än är.

#### Vila (VILA): hemankare A1, mellan rundorna och medan spelarna tänker

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Grundklippet i vila (VILA-GRUND) | A1 → A1 | stilla, med andning och blinkningar | delvis | — | — (inga lyft att leta efter) | höger 43 st, 1,57 s (0,64–7,13); vänster 60 st, 1,27 s (0,63–5,28) | höger 49 st, 2,23 s (0,69–9,94); vänster 48 st, 2,15 s (0,62–6,76) | `VILA` | ställningen finns; andning, små egna rörelser och blinkning finns som ett val som är avstängt |
| Korta varianter i vila (VILA-VARIANT) | A1 → A1 | en liten rörelse och tillbaka: rätta till händerna, en hand mot skon och åter, en blick mot en spelare | delvis | `lyft-danilo-vantan-1`, `lyft-danilo-vantan-2`, `lyft-frasse-vantan-1`, `lyft-frasse-vantan-2` | ja | höger 13 st, 5,33 s (1,3–11,83); vänster 22 st, 3,3 s (1,68–6,99) | höger 6 st, 6,55 s (3,18–13,98); vänster 21 st, 3,5 s (1,5–13,03) | `VANTA` | i filmen väntar händerna med små egna rörelser under 5 cm. Danilo och Frasse har två väntor var, lyfta ur filmen: händerna i vilan med dealerns små rörelser, och hans huvud, blick och min. |

#### Insatserna läggs (INSATSER): hemankare A1S, från att rundan är uppgjord tills given börjar

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vila medan insatserna läggs (INSATS-VILA) | A1S → A1S | högern utsträckt mot lådan, stilla; blicken i kameran | saknas | — | — (inga lyft att leta efter) | höger 43 st, 1,57 s (0,64–7,13); vänster 60 st, 1,27 s (0,63–5,28) | höger 49 st, 2,23 s (0,69–9,94); vänster 48 st, 2,15 s (0,62–6,76) | `VILA` |  |
| Byta viloställe (BYT-VILA) | A1S → A1 | en hand flyttar från en vila till en annan, till exempel högern från sidan till framför kroppen när given börjar, eller vänstern mellan kroppen och skon | saknas | — | — (inga lyft att leta efter) | höger 3 st, 0,3 s (0,27–0,38); vänster 5 st, 0,37 s (0,2–1,22) | höger 3 st, 0,47 s (0,28–0,79); vänster 13 st, 0,5 s (0,29–0,99) | `BYT-VILA` |  |
| Svepa bordet (SVEP) | A1S → A2.3 | högern sveper lågt från sidan tvärs över platserna och fram till mötet, där den tar första kortet; vänstern går till skon | saknas | — | — (inga lyft att leta efter) | höger 2 st, 1,12 s (1,02–1,21) | — (inte i filmen) | `SVEP` | Jakobs: så börjar given hos den riktiga dealern. I filmen ofta i samma rörelse som första kortet (fältet med_svep på givet) |

#### Redo vid skon (REDO): hemankare A2.3, medan korten delas ut, mellan två kort

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Från vilan till skon (TILL-SKON) | A1 → A2.3 | båda | finns | `lyft-danilo-till-skon`, `lyft-frasse-till-skon` | ja | vänster 41 st, 0,63 s (0,4–0,97) | vänster 45 st, 0,57 s (0,38–0,97) | `TILL-SKON` | Danilos och Frasses är vårt eget, inte lyfta ur filmen |
| Grundklippet vid skon (REDO-GRUND) | A2.3 → A2.3 | stilla och redo, varken spänd eller slapp | delvis | — | — (inga lyft att leta efter) | — (ingen kategori i indelningen) | — (ingen kategori i indelningen) | — | finns som stillhet mellan givarna i rundan, inte som eget klipp |
| Från skon tillbaka till vilan (TILL-VILAN) | A2.3 → A1 | båda | delvis | `lyft-danilo-hem`, `lyft-frasse-hem` | ja | höger 19 st, 0,57 s (0,27–0,88); vänster 22 st, 0,5 s (0,2–0,83) | höger 25 st, 0,37 s (0,21–1,49); vänster 13 st, 0,33 s (0,23–0,49) | `HEM` | takten är bestämd (0,8 s). Finns för Danilo och Frasse, vårt eget och inte lyft ur filmen |

#### Ett kort ut (GIV): hemankare A2.3, ett kort går från skon till en spelare eller till dealern

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Första kortet till en spelare (GIV-KORT-1) | A2.3 → A3PnC1 | vänstern drar, högern lägger (plats 6 och 7: vänstern ensam) | finns | `lyft-danilo-p4`, `lyft-danilo-p7`, `lyft-frasse-p4`, `lyft-frasse-p7` | ja | höger 33 st, 0,87 s (0,61–2,03); vänster 3 st, 0,23 s (0,23–0,34) | höger 61 st, 1 s (0,8–2,07); vänster 5 st, 0,37 s (0,17–0,65) | `GIV` | lyft i samma fil som handen hem; rutan där kortet ligger delar dem. I filmen ges också plats 6 och 7 oftast med handbyte |
| Andra kortet och fler till en spelare (GIV-KORT-2) | A2.3 → A3PnCm | som första kortet | delvis | `lyft-danilo-p2`, `lyft-frasse-p1` | ja | höger 33 st, 0,87 s (0,61–2,03); vänster 3 st, 0,23 s (0,23–0,34) | höger 61 st, 1 s (0,8–2,07); vänster 5 st, 0,37 s (0,17–0,65) | `GIV` | Jakobs önskan: upp till sju kort per plats. Danilo har kort 2 till dagens plats 2 och Frasse kort 2 till dagens plats 1, lyfta ur filmen |
| Kort till dealern själv (GIV-EGET) | A2.3 → A3DCm | vänstern drar, högern lägger på dealerns plats; ibland vänstern ensam | saknas | — | — (inga lyft att leta efter) | höger 14 st, 0,77 s (0,38–0,86); vänster 4 st, 0,67 s (0,61–0,72) | höger 21 st, 0,73 s (0,43–1,47); vänster 4 st, 0,53 s (0,5–0,57) | `GIV-EGET` | i filmen läggs dealerns kort oftast av högern efter ett handbyte, som en spelares; vänstern ensam är det ovanliga |
| Kortet ur skon till handbytet (SKON-TILL-BYTET) | A2.3 → A2M | vänstern drar kortet ur skon och för det på kant till mötet; högern går fram och tar det | finns | `lyft-danilo-till-bytet`, `lyft-frasse-till-bytet` | ja | vänster 65 st, 0,67 s (0,35–0,97) | vänster 99 st, 0,83 s (0,4–0,97) | `DRA` | första halvan av en giv, ett klipp för alla platser: givens rutor fram till bytet (lyft-<docka>-p4), oförändrade |
| Kortet från handbytet till platsen, och handen hem (GIV-FRAN-BYTET) | A2M → A2.3 | högern för kortet till platsen och lägger det, och går hem; vänstern går tillbaka till skon | delvis | `lyft-danilo-bytet-p4`, `lyft-frasse-bytet-p4` | ja | höger 33 st, 0,87 s (0,61–2,03); vänster 3 st, 0,23 s (0,23–0,34) | höger 61 st, 1 s (0,8–2,07); vänster 5 st, 0,37 s (0,17–0,65) | `GIV` | andra halvan av en giv, en per plats: givens rutor från bytet (lyft-<docka>-p4), oförändrade, så att skon till bytet och detta efter varandra är hela given ruta för ruta. Finns till plats 4; de andra platserna saknas (de behöver sitt eget lyft, lagt från samma ankare) |

#### Handen hem (TILLBAKA): hemankare A3PnCm, efter att kortet har landat

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Handen hem till skon (HEM-TILL-SKON) | A3PnCm → A2.3 | handen som lade kortet | finns | `lyft-danilo-p2`, `lyft-danilo-p4`, `lyft-danilo-p7`, `lyft-frasse-p1`, `lyft-frasse-p4`, `lyft-frasse-p7` | ja | — (ingen kategori i indelningen) | — (ingen kategori i indelningen) | — | andra halvan av givens fil. I filmen går högern hem mellan två kort hos Danilo i 8 av 26 och hos Frasse i 2 av 56 (av de kort hos en spelare som följs av ett nytt kort); se HEM-TILL-BYTET |
| Högern från platsen tillbaka till nästa kort (HEM-TILL-BYTET) | A3PnCm → A2M | högern går från kortet direkt till mötet, medan vänstern redan drar nästa kort ur skon | förslag | — | — (inga lyft att leta efter) | höger 33 st, 0,87 s (0,61–2,03); vänster 3 st, 0,23 s (0,23–0,34) | höger 61 st, 1 s (0,8–2,07); vänster 5 st, 0,37 s (0,17–0,65) | `GIV` | så ger Frasse nästan alltid och Danilo oftast, med händerna i otakt (av de kort hos en spelare som följs av ett nytt kort: Frasse 54 av 56, Danilo 18 av 26); Danilo går hem oftare, och det hör till hans stil. Ersätter att båda händerna alltid går hem mellan korten |
| Handen hem direkt till vilan (HEM-TILL-VILAN) | A3PnCm → A1 | båda | saknas | — | — (inga lyft att leta efter) | höger 19 st, 0,57 s (0,27–0,88); vänster 22 st, 0,5 s (0,2–0,83) | höger 25 st, 0,37 s (0,21–1,49); vänster 13 st, 0,33 s (0,23–0,49) | `HEM` | efter rundans sista kort; vänstern går ofta hem samtidigt |
| Rätta till ett kort (RATTA) | A3PnCm → A3PnCm | en liten rörelse vid kortet som ligger | saknas | — | — (inga lyft att leta efter) | — (inte i filmen) | höger 2 st, 0,28 s (0,27–0,3) | `RATTA` |  |

#### Dealerns egna kort (DEALERNS TUR): hemankare A1, när spelarna är klara: dealern drar sina kort

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vända sitt eget kort (VAND-EGET) | A1 → A1 | en hand | saknas | — | — (inga lyft att leta efter) | — (ingen kategori i indelningen) | — (ingen kategori i indelningen) | — | finns inte i filmen: livebordet ger dealerns kort med framsidan upp, utan hålkort. Ritas efter vårt eget spel om det behövs |

#### Mot spelaren (SPELARENS TUR): hemankare A1V, när en spelare ska välja

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Peka på spelaren som ska agera (PEKA) | A1V → A1V (över plats n) | snabbt, med hela handen öppen mot platsen och tillbaka | saknas | — | — (inga lyft att leta efter) | höger 1 st, 1,23 s (1,23–1,23) | — (inte i filmen) | `PEKA` | Jakobs önskan. Nästan inte i filmen: där visar spelets skylt vems tur det är, och dealern ser i kameran. Ritas med högerns väg mot platsen ur givet som förlaga |

#### Rundan görs upp (AVSLUT): hemankare A1, marker betalas ut och tas in, korten samlas in

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Betala ut marker till en spelare (MARKER-UT) | A1 → A1 (över plats n) | en hand från brickan till platsen och tillbaka | saknas | — | — (inga lyft att leta efter) | — (ingen kategori i indelningen) | — (ingen kategori i indelningen) | — | inte mätt: livebordet har inga marker (de är spelets grafik), så rörelsen får ritas efter vårt eget bord |
| Ta in marker från en spelare (MARKER-IN) | A1 → A1 (över plats n) | en hand ut till platsen och tillbaka till brickan | saknas | — | — (inga lyft att leta efter) | — (ingen kategori i indelningen) | — (ingen kategori i indelningen) | — | inte mätt: livebordet har inga marker (de är spelets grafik), så rörelsen får ritas efter vårt eget bord |
| Korten in i lådan (KORT-IN) | A1 → A1S | högern samlar korten från platserna och de egna (vänstern hjälper), lyfter dem till lådans öppning och lägger dem där, och vilar sedan åt sidan | saknas | — | — (inga lyft att leta efter) | höger 11 st, 4,47 s (1,8–8,43); vänster 6 st, 4,37 s (1,97–7,03) | höger 12 st, 5,73 s (0,65–9,13); vänster 10 st, 2,62 s (0,32–3,81) | `KORT-IN` | en enda rörelse i filmen: insamlingen och lådan hör ihop |

### Bryggorna

| Brygga | Namn | Vad | Regel |
| --- | --- | --- | --- |
| BRYGGA-IN | In i ett lyft stycke | från mitten av ankarets läge till där dealerns stycke börjar | dockans egen mjuka rörelse, 0,5 m/s och minst 0,2 s; ingen under 3 cm |
| BRYGGA-UT | Ut ur ett lyft stycke | från där dealerns stycke slutar till mitten av ankarets läge | som BRYGGA-IN |
| VANTA-IN | Vänta in nästa liknande start | där dealern gör något som inte härmas står dockan kvar i läget hon var i, tills dealern börjar nästa stycke som börjar i samma läge | börjar nästa stycke i ett annat läge: en BRYGGA-IN dit |
| SVEP-IN | Svepet som väg in i given | från vilan under insatserna (A1S) går högern över bordet till första kortet | rörelsen SVEP; i filmen ofta ihopväxt med första kortet |

### Det som inte härmas

| Kategori | Namn | Vad | Danilo (dealer A) | Frasse (dealer B) |
| --- | --- | --- | --- | --- |
| SKON | Sköta skon | båda händerna vid skon: fylla på eller byta kortlek | höger 10 st, 1,02 s (0,26–4,95); vänster 16 st, 0,82 s (0,18–2,18) | — (inte i filmen) |
| ANNAT | Annat | en rörelse som inte passar någon av rörelserna ovan: handen upp till ansiktet eller kroppen, en hand som går ut från vilan och tillbaka utan att göra något med korten, skärkortet | höger 10 st, 0,9 s (0,52–4,18); vänster 12 st, 0,45 s (0,24–0,79) | höger 5 st, 1,23 s (0,79–5,09); vänster 5 st, 0,5 s (0,38–0,71) |

## 7. Det som inte har något mått i kod än

- Livebordets sko: kortleken ligger på en bädd som stiger bakåt, och korten lutar bakåt som fronten med långsidan tvärs skon. Bara kortlekens längd längs bädden är skattad: den krymper när korten delas ut (`table-live.ts LIVE.shoe`). Rullen är bara mätt i bildpunkter. Livebordet har ingen markerbricka; insatsmärkena är spelets ritade knappar i bilden.
- Dealrarna: hur långt bakom kanten de sitter är antaget (0,2 m; skattat 0,07–0,16 m), och armarnas längd går inte att mäta (dockans egna används).
- Golvet syns inte i bilden; filtens och sitsens höjd över golvet är slutledda ur dealrarnas ögon när de står, inte mätta.
- Danilos och Frasses ögon har ingen höjd i koden: ögonen är ben i modellerna (eyeL, eyeR i .glb-filerna), och närmast i koden är huvudets mitt.
- Antaget, inte mätt (`avatar-auto-pipeline/scen/standard.yaml`, skrivet av gen_standard.py): stolen, kortbunten i skon, kortplatsernas ram och Blenders extra kameror.
- Dockornas räckvidd, mest lutning och mest vridning är gissade (doll.ts säger det själv i `about`).

## Källorna

Det verktyget läste. "kod" är importerat som programmet självt använder det; "text" är tolkat ur filens text, därför att namnet inte exporteras eller filen inte går att importera i Node, och går sönder om skrivsättet ändras (då blir raden tom eller nämns här); "data" är en JSON-fil.

| Fil | Hur | Läst |
| --- | --- | --- |
| `blackjack-dealer/src/table-live.ts` | kod | ja |
| `blackjack-dealer/src/space.ts` | kod | ja |
| `blackjack-dealer/src/standard.ts` | kod | ja |
| `blackjack-dealer/dealer3d/src/doll.ts` | kod | ja |
| `standarddocka/DOMAR.md` | text (bara citaten i kolumnen Jakobs dom) | ja |
| `avatar-auto-pipeline/scen/standard.yaml` | text (rad för rad: det antagna och det som bara Blender har) | ja |
| `live-bj/data/scen.json` | data | ja |
| `live-bj/data/stil-kameran.json` | data | ja |
| `live-bj/data/stil-bordet.json` | data | ja |
| `live-bj/data/uppsattning.json` | data | ja |
| `live-bj/data/reling.json` | data | ja |
| `blackjack-dealer/dealer3d/data/lyft-*.json` | data (bara huvudet: fps, frameCount, leavesShoe, rests, to) | ja |
| `standarddocka/rorelsekatalog.json` | data | ja |
| `live-bj/data/segment.json` | data | ja |
