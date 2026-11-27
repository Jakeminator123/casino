# Måtten: vårt bord, våra dockor och livebordet

Alla mått på ett ställe: kamerorna, bordet och det som står på det, dockorna och rörelserna, och bredvid dem ett riktigt livebord och två riktiga dealrar mätta på film.

**Den här filen ändras aldrig för hand.** Den skrivs av `node matt.ts` (från repots rot) ur måttens egna källor, och skrivs över nästa gång. `node matt.ts --kolla` säger om den inte längre stämmer med källorna. Ett mått ändras på riktigt där kolumnen Källa säger (oftast `blackjack-dealer/src/table-lens.ts`, se Källorna sist), och sedan körs `node matt.ts` igen. Jakobs domar står i `standarddocka/DOMAR.md`; kolumnen Jakobs dom citerar dem och är aldrig källan till ett tal.

Så läses talen: meter, centimeter, millimeter, grader och sekunder. "Åt sidan" är åt dealerns vänster (bildens höger) med plus, räknat från bordets mitt. "Från kanten" är från bordets kant mot dealern, ut mot spelarna. Skillnad är vårt minus livebordets (i rörelserna dockan minus de två dealrarnas medel), och i procent av det senare. Livebordets tal är mätta av en annan chatt på en film av ett riktigt bord (`live-bj/`) och är preliminära: kameran är inte bekräftad än.

## 1. Kamerorna

Höjden är över filten och avstånden längs filten från kamerans fot (punkten rakt under den). Bildvinkeln är hela bildens, kant till kant. Brännvidden står i bildpunkter, eftersom det är så den är mätt.

| Kamera | Höjd över filten | Lutning nedåt | Bildvinkel i sidled | Bildvinkel i höjdled | Bildens form | Brännvidd | Till bordets kant mot dealern | Till dealerns axlar | Källa | Jakobs dom |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Spelets vy (plats 4): standarddockans filmer | 0,58 m | 12° | 41,4° | 28,2° | 1764 × 1174 bildpunkter (1,5 : 1) | 2334 bildpunkter på 1764 | 2,074 m till dockans bord (1,844 m till spelets kant) | 2,224 m (mannen och kvinnan) | `table-lens.ts PLAY_LENS`; kanten `world.ts dealerEdge`, `table-lens.ts DOLL_TABLE.edgeBack`; axlarna `doll.ts MAN/KVINNA.place.behindEdge` | "Jag tror jag gillar denna kameravinkel som standard faktiskt!" om den lägre kameran (2026-11-26) |
| Inspelningens kamera: bankens filmer (Paow) | 1,11 m | 25,06° | 41,4° | 28,2° | 1764 × 1174 bildpunkter (1,5 : 1) | 2334 bildpunkter på 1764 | 1,844 m till filmernas bord | 2,224 m (Paow) | `table-lens.ts TABLE_LENS`; `world.ts dealerEdge`; `doll.ts PAOW.place.behindEdge` | "inte naturlig utifrån att man skulle spela i casinot" om inspelningens kamera (utan datum) |
| Från sidan (editorn, dealerns högra sida) | 3,05 m | 7,59° | 5,91° | 3,94° | 1764 × 1174 bildpunkter (1,5 : 1), nästan utan perspektiv | — | 24 m åt sidan | 23,99 m | `standarddocka/editor/scen.ts kameraVy('sida'), SIDA` (tolkad ur text) |  |
| Livebordet (mätt på film, preliminärt) | 0,618 m (±0,009) | 18,13° (±0,15) | 67,6° | 41,3° | 1728 × 972 bildpunkter (1,78 : 1) | 1290,3 bildpunkter på 1728 | 1,538 m till livebordets kant | — (inte mätt) | `live-bj/data/scen.json camera, picture, table.dealerEdgeM` |  |
| Skillnad: spelets vy − livebordet | −0,038 m (−6 %) | −6,1° (−34 %) | −26,2° (−39 %) | −13,1° (−32 %) | 1,5 mot 1,78 | — | +0,536 m (+35 %) | — |  |  |

De sju platsernas kameror är spelets vy flyttad till varje plats: lika hög och lika brant, och vriden runt bordet så att spelarens eget första kort hamnar på samma ställe i bilden (`table-lens.ts seatView`, platsernas kort ur `placements/default.json`). "Vriden" är hur mycket kameran är vriden från rakt fram mot dealern, plus mot bildens höger (dealerns vänster).

| Plats | Står åt sidan | Till kantens mitt (spelets kant) | Vriden | Höjd över filten | Lutning nedåt |
| --- | --- | --- | --- | --- | --- |
| 1 | −1,816 m | 2,028 m | 63,3° | 0,58 m | 12° |
| 2 | −1,418 m | 1,908 m | 47,9° | 0,58 m | 12° |
| 3 | −0,803 m | 1,835 m | 26° | 0,58 m | 12° |
| 4 | 0 m | 1,844 m | 0° | 0,58 m | 12° |
| 5 | 0,816 m | 1,819 m | −26,6° | 0,58 m | 12° |
| 6 | 1,459 m | 1,884 m | −50,8° | 0,58 m | 12° |
| 7 | 1,844 m | 2 m | −67,5° | 0,58 m | 12° |

## 2. Bordet och det som står på det

| Sak | Mått | Vårt (standarden) | Livebordet (mätt på film, preliminärt) | Skillnad | Källa | Jakobs dom |
| --- | --- | --- | --- | --- | --- | --- |
| Filten (dockans bord) | djup, från kanten till spelarnas kant | 0,95 m | 0,714 m | +0,236 m (+33 %) | `table-lens.ts DOLL_TABLE.depth`; `scen.json table.depthM` | "mer som en halvmåne"; halvmånen Bra, det 1,15 m djupa Inte bra (2026-11-26) |
|  | bredd längs kanten mot dealern | 1,9 m | 1,459 m | +0,441 m (+30 %) | `table-lens.ts TABLE_TOP.halfWidth` × 2; `scen.json table.widthAtDealerEdgeM` |  |
|  | bredast | 1,9 m | — | — | `table-lens.ts TABLE_TOP.halfWidth` × 2; `scen.json table.widestM` |  |
|  | form | en halvcirkel med rak kant mot dealern, radie 0,95 m | en båge med radie 0,73 m, mitten 1,6 cm bakom kanten (avviker 1,8 mm) | +0,22 m (+30 %) | `table-lens.ts DOLL_TABLE, TABLE_TOP`; `scen.json table.arc` |  |
|  | spelarnas kant från kamerans fot | 1,124 m | 0,824 m | +0,3 m (+36 %) | `world.ts dealerEdge` och `table-lens.ts DOLL_TABLE`; `scen.json table.feltFrontFromCameraM` |  |
|  | sargen (läderrullen) utanför filten | 10 cm | — (sargen står upp från filten och är bara mätt i bildpunkter) | — | `table-lens.ts TABLE_TOP.rail` |  |
| Filmernas bord | djup (gäller filmerna som finns) | 1,15 m |  |  | `table-lens.ts TABLE_TOP.depth` | "mer som en halvmåne"; halvmånen Bra, det 1,15 m djupa Inte bra (2026-11-26) |
| Kanten mot dealern | dockans bords kant bakom spelets kant | 23 cm |  |  | `table-lens.ts DOLL_TABLE.edgeBack` | "Chipbrickan ska också vara så långt in mot dealern": brickan är bordets kant (utan datum) |
| Markerbrickan | bredd längs kanten | 0,54 m, från −0,3 m till 0,24 m åt sidan | — (inte mätt) | — | `table-lens.ts TRAY.x0, x1` | "Chipbrickan ska också vara så långt in mot dealern": brickan är bordets kant (utan datum) |
|  | djup mot spelarna, och hur djupt den är försänkt | 10 cm från kanten; 3 cm ned | — (inte mätt) | — | `table-lens.ts TRAY.s0, s1, depth` |  |
|  | fack och marker | 12 fack; marker 39 mm i diameter och 3,14 mm tjocka |  |  | `standard.yaml markerbricka.ror, chip_radie, chip_hojd` (ur spelets game3d-tray.ts och game3d-chips.ts) |  |
| Skon | längd | 0,436 m | 0,274 m | +0,162 m (+59 %) | `table-lens.ts SHOE.length`; `scen.json things.sko.footLength` (foten på filten) |  |
|  | bredd | 0,082 m | 0,103 m | −0,021 m (−20 %) | `table-lens.ts SHOE.width`; `scen.json things.sko.footWidth` |  |
|  | höjd bak och fram | 0,131 m och 0,1 m | — (bara i bildpunkter) | — | `table-lens.ts SHOE.backHeight, frontHeight` |  |
|  | frontplattans lutning mot filten | 51,6° | — (bara i bildpunkter) | — | `table-lens.ts SHOE.plateLean` |  |
|  | kortet i fönstret, underkanten över filten | 22 mm | — | — | `table-lens.ts SHOE.windowLift` |  |
|  | vinkel mot kanten (bakänden vriden mot dealern) | 23,2° | 15,5° | +7,7° (+49 %) | `table-lens.ts shoePose(TABLE_LENS).back`; `scen.json things.sko.footMetres` (den främre och den bakre hörnan mot spelarna) |  |
|  | mynningens mitt åt sidan | 0,407 m (filmernas sko 0,322 m) | 0,458 m | −0,051 m (−11 %) | `table-lens.ts dollShoe, shoePose`; `uppsattning.json shoe.card_when_drawn.middle` (kortet i den klara fronten) | "aningen längre bort från dealern" om skon (2026-11-26) |
|  | mynningens mitt från kanten | 0,297 m från dockans bords kant (filmernas sko 0,071 m från spelets kant) | 0,097 m | +0,2 m (+206 %) | `table-lens.ts dollShoe, DOLL_TABLE.edgeBack`; `scen.json table.dealerEdgeM`, `uppsattning.json shoe.card_when_drawn.middle` |  |
|  | flyttad på dockans bord | 8 cm ut längs sin längd och 3 cm mot spelarna: 8,5 cm från filmernas |  |  | `table-lens.ts DOLL_TABLE.shoeOut, shoeForward` | "aningen längre bort från dealern" om skon (2026-11-26) |
|  | frontplattan i Blender: öppningen för fingret | 50 mm bred nedtill, 40 mm i bågen, upp till 114 mm uppför plattan | — | — | `bygg_bord.py SKO_FRONT.ub, ur, us` (tolkad ur text) |  |
|  | frontplattan i Blender: nederkant och tjocklek | nederkanten 74 mm uppför plattan (58 mm över filten); plattan 1,3 mm tjock | — | — | `bygg_bord.py SKO_FRONT.s0, n0, n1` (tolkad ur text) |  |
|  | väggarna i Blender | 4 mm | — | — | `bygg_bord.py wt` (tolkad ur text) |  |
| Kortet | bredd × höjd | 63 mm × 88 mm | passar bäst: poker 63,5 × 88,9 mm (fel 0,54 bildpunkter; bridge 57 × 89 mm: 1,57) | −0,5 mm × −0,9 mm | `table-lens.ts CARD`; `scen.json camera.cardSize` | "Våra kort som används i 'standarddocka'-mappens editor är det som ska användas som standard" (2026-11-26) |
|  | bredd när måttet får vara fritt |  | 65,3 mm (±0,26) | −2,3 mm | `scen.json camera.cardSize['widthWhenFree mm']` |  |
|  | tjocklek och hörnradie | 0,3 mm; hörnen 3,5 mm | — | — | `table-lens.ts CARD.thickness, corner` |  |
| Korten i skon | lutning mot filten | 51,6°: de ligger mot frontplattan och lutar som den | — (inte mätt) | — | `table-lens.ts SHOE.plateLean, shoeCard`; Blender lägger dem så (`bygg_bord.py step`) |  |
|  | kortbunten | 8 lekar (antaget) | — | — | `standard.yaml kort.lekar_i_skon` |  |
| Insatsringarna | radie, och ringens mitt framför kortets mitt | 27 mm; 83 mm framför (halva kortet, ringens radie och 12 mm filt) | — (inte mätt) | — | `scene3d-geometry.ts BET, ringOffset` |  |
| Kortplatsernas ram | marginal runt kortet och linjens bredd | 4 mm; 3 mm (antaget) | — (inte mätt) | — | `standard.yaml kort.markering` |  |
| Lådan för använda kort | fotens mått, höjden | 0,08 m × 0,105 m, 0,14 m hög (antaget) | 0,076 m × 0,093 m (foten) | +0,004 m (+5 %) | `standard.yaml kassering.yttermatt`; `scen.json things.slaskbox.footWidth, footDepth` |  |
|  | mitten åt sidan | −0,62 m (antaget, speglad mot skon) | −0,599 m | −0,021 m | `standard.yaml kassering.fot_mitt`; `scen.json things.slaskbox.footMetres` (medel) |  |
| Höjder från golvet | filten över golvet | 0,95 m (Blenders standard.yaml: samma). Två källor säger olika: 3D-scenens rum och sal har golvet 0,92 m under filten | syns inte i bilden, inte mätt | — | `table-lens.ts TABLE_BASE.floor`; `standard.yaml filt_z`; `scene3d-room.ts FLOOR`, `scene3d-hall.ts FLOOR` (tolkade ur text) |  |
|  | bordsskivans undersida över golvet | 0,8 m | syns inte i bilden, inte mätt | — | `table-lens.ts TABLE_BASE.under, floor` |  |
|  | rullens (sargens) överkant över golvet | 0,996 m (46 mm över filten) | syns inte i bilden, inte mätt | — | `table-lens.ts TABLE_RAIL.lift, above; TABLE_BASE.floor` |  |
|  | stolens sits över golvet | 0,66 m (antaget, för den vita dockan) i Blenders standard.yaml; dockans rum sätter stolen under hennes lår när bilden ritas, inget fast tal | syns inte i bilden, inte mätt | — | `standard.yaml stol.sits_z`; `dealer3d/src/standard-room.ts STOOL, seatStool` |  |
|  | spelets kamera över golvet | 1,53 m (1,5 m med 3D-scenens golv) | syns inte i bilden, inte mätt | — | `table-lens.ts PLAY_LENS.height, TABLE_BASE.floor` |  |
|  | inspelningens kamera över golvet | 2,06 m | syns inte i bilden, inte mätt | — | `table-lens.ts TABLE_LENS.height, TABLE_BASE.floor` |  |

**Vår klon av livebordet (i koden).** Livebordet som en andra uppsättning bredvid standarden (`blackjack-dealer/src/table-live.ts LIVE`), i livebordets egen linsvärld (kameran rakt över origo), kopierad ur mätningen (`live-bj/data/uppsattning.json`) och byggd i Blender med `bygg_bord.py --live`. Skillnaden är klonen minus mätningen och ska vara noll; det som inte är mätt är vårt eget mått, märkt antaget.

| Sak | Mått | Klonen (i koden) | Mätt på film | Skillnad | Hur säkert | Källa |
| --- | --- | --- | --- | --- | --- | --- |
| Kameran | höjd över filten | 0,6175 m | 0,6175 m | ±0 m (±0 %) | mätt | `table-live.ts LIVE_CAMERA` |
|  | lutning nedåt; rullning | 18,13°; −0,16° | 18,13°; −0,16° | ±0° | mätt | `table-live.ts LIVE_CAMERA` |
|  | brännvidd och bild | 1290,3 bildpunkter, 1728 × 972 bildpunkter (1,78 : 1) | 1290,3 bildpunkter, 1728 × 972 bildpunkter (1,78 : 1) | ±0 (±0 %) | mätt | `table-live.ts LIVE_CAMERA` |
| Filten | djup; bredd vid kanten mot dealern | 0,714 m; 1,459 m | 0,714 m; 1,459 m | ±0 m (±0 %) | mätt | `table-live.ts LIVE.felt` |
|  | bågens radie; mitten bakom kanten | 0,7295 m; 1,56 cm | 0,7295 m; 1,56 cm | ±0 m (±0 %) | mätt | `table-live.ts LIVE.felt` |
|  | kanten mot dealern från kamerans fot | 1,5375 m | 1,5375 m | ±0 m (±0 %) | mätt | `table-live.ts LIVE.edge` |
| Rullen | bredd utanför filten | 10 cm | — (bara i bildpunkter) | — | antaget (vår) | `table-live.ts LIVE.rail` |
| Skon | fotens längd × bredd | 0,274 m × 0,103 m | 0,274 m × 0,103 m | ±0 m (±0 %) | mätt | `table-live.ts LIVE.shoe` |
|  | fotens tre hörn: största avstånd |  |  | 0 mm | mätt | `table-live.ts LIVE.shoe.foot` |
|  | höjd bak; den klara frontens topp | 0,117 m; 0,061 m | 0,117 m; 0,06 m och 0,062 m (de två topphörnen) | ±0 m (±0 %) | mätt | `table-live.ts LIVE.shoe` |
|  | frontens lutning bakåt från lodrätt | 33,4° | 34° och 32,8° (de två topphörnen) | — | mätt | `table-live.ts LIVE.shoe.plateLean` |
|  | bädden kortleken ligger på: lutning från filten; höjd fram | 13,4°; 3 mm | 13,4°; 3 mm | ±0° | mätt | `table-live.ts LIVE.shoe.bedLean, windowLift` |
|  | korten i skon: hur de ligger | långsidan tvärs skon, kortsidan uppför fronten, lutade som den | ryggens mönster 78 mm tvärs och 52 mm uppför | — | mätt | `table-live.ts liveShoeCard` |
|  | kortleken längs bädden | 0,18 m | — | — | skattat | `table-live.ts LIVE.shoe.deckLength` |
|  | nästa kort i fronten: mitten | 0,458 m åt sidan, 0,098 m från kanten, 2,9 cm över filten | 0,458 m åt sidan, 0,097 m från kanten, 2,9 cm över filten | 1,3 mm | mätt | `table-live.ts liveShoeCard` |
|  | den lösa klara biten framför skon: hörnen, största avstånd |  |  | 0 mm | mätt | `table-live.ts LIVE.clearPiece` |
| Lådan för använda kort | fotens mått; höjden | 0,076 m × 0,093 m; 0,1575 m | 0,076 m × 0,093 m; 0,159 m och 0,156 m | ±0 m (±0 %) | mätt | `table-live.ts LIVE.box` |
|  | mitten åt sidan; från kanten | −0,611 m; 0,035 m |  | hörnen 0 mm | mätt | `table-live.ts liveBox` |
|  | de använda korten | ligger plant, ryggen upp; högen 3 cm | ligger plant, ryggen upp | — | mätt; högen skattad | `table-live.ts LIVE.box.pile` |
| Markerbrickan |  | ingen (vår kan läggas till i Blender som ett tillägg: bygg_bord.py --live --med-bricka) | ingen | — | mätt | `table-live.ts LIVE.tray` |
| Insatsmärkena | sju, största avstånd | plats 4 0,63 m från kanten |  | 0 mm | mätt | `table-live.ts LIVE.betMarks` |
| Kortplatserna | 19 st, största avstånd | dealerns kort 1 0,177 m och plats 4 kort 1 0,512 m från kanten | 19 st | 0 mm | mätt | `table-live.ts LIVE.cards` |
|  | långsidans vridning | 12 mätta, 7 ur den speglade platsen (landningarna var inte eniga) |  |  | mätt; spegelbild | `table-live.ts LIVE.cards[id].turnFrom` |
| Dealern (sitter) | Dealer A, ser i kameran: axlarnas mitt över filten; axelbredd; ögonen | 0,318 m; 0,357 m; 0,509 m | 0,318 m; 0,357 m; 0,509 m | ±0 m (±0 %) | mätt (på ett plan antaget bakom kanten) | `table-live.ts LIVE.dealer.styles.kameran` |
|  | Dealer A, ser i kameran: vänsterhandens grepp vid skon, höjd; från kortets mitt | 4,8 cm; 3,5 cm | 4,8 cm; 3,5 cm | 0 mm | mätt i bilden; höjden slutledd | `table-live.ts LIVE.dealer.styles.kameran.leftAtShoe` |
|  | Dealer B, ser på bordet: axlarnas mitt över filten; axelbredd; ögonen | 0,31 m; 0,348 m; 0,514 m | 0,31 m; 0,348 m; 0,514 m | ±0 m (±0 %) | mätt (på ett plan antaget bakom kanten) | `table-live.ts LIVE.dealer.styles.bordet` |
|  | Dealer B, ser på bordet: vänsterhandens grepp vid skon, höjd; från kortets mitt | 3,7 cm; 4 cm | 3,7 cm; 4 cm | 0 mm | mätt i bilden; höjden slutledd | `table-live.ts LIVE.dealer.styles.bordet.leftAtShoe` |
|  | bålen bakom kanten | 0,2 m (antaget); skattat 0,065 m och 0,158 m |  |  | antaget | `table-live.ts LIVE.dealer.behindEdge` |
| Golvet | filten över golvet; sitsen | 0,95 m (±0,1); 0,67 m | 0,95 m; 0,67 m | ±0 m (±0 %) | slutlett | `table-live.ts LIVE.floor` |

## 3. Var korten hamnar

Kortplatserna i Jakobs kortplan (`placements/default.json`), kortets mitt. P är spelarnas platser och C kortets nummer, D dealerns egna. Läget räknas ur planens bildpunkter genom inspelningens kamera (`world.ts spots`) och står i linsvärlden, i meter: x åt sidan (plus åt dealerns vänster), z i djupled (kameran står i z = 0 och ser mot minus, mot dealern; filten är y = 0). Dockornas bord har samma kortplatser som filmernas, bara vridna mot spelaren (`doll.ts dollCardYaw`, `table-lens.ts DOLL_TABLE.cardsFrom`), och kanten 0,23 m längre bort. Vridningen är kortets långsida från rakt fram, plus åt dealerns vänster.

Bildpunkterna (x; y, origo uppe till vänster) är kortets mitt i bilden 1764 × 1174, genom spelets vy (`table-lens.ts see(filmEye(PLAY_LENS), …)`: standarddockans filmer, samma lins och bildstorlek som inspelningen) och genom inspelningens kamera (`table-lens.ts TABLE_LENS`: bankens ruta, där planen själv står). De räknas om varje gång ur kameran i koden, så de följer med när en vy ändras. "Från kantens mitt" är avståndet från mitten av dockornas bords kant; det jämförs med livebordets platsmärken (spelets ritade märken i bilden, ett per plats, inte kortrutor; `scen.json seatsUiM`).

| Plats | x, åt sidan | z, djupled | Från spelets kant / dockornas bords kant | Från kantens mitt | Vriden: filmernas plan | Vriden: dockornas bord | Bildpunkt, spelets vy | Bildpunkt, inspelningen | Livebordet (mätt på film, preliminärt): märket, åt sidan; från kanten | Skillnad, från kantens mitt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1.C1 | −0,532 m | −1,607 m | 0,236 m / 0,466 m | 0,708 m | 0° (mobilen 21°) | −40° | 147,9; 908 | 236,7; 980,1 | −0,497 m; 0,404 m | +0,067 m (+11 %) |
| P1.C2 | −0,503 m | −1,619 m | 0,225 m / 0,455 m | 0,678 m | 0° (mobilen 21°) | −38,9° | 192,1; 902,4 | 274,8; 971,9 |  |  |
| P2.C1 | −0,357 m | −1,551 m | 0,293 m / 0,523 m | 0,633 m | 0° (mobilen 14°) | −26,9° | 372,6; 935,5 | 437; 1020,5 | −0,335 m; 0,54 m | −0,002 m (−0 %) |
| P2.C2 | −0,325 m | −1,563 m | 0,28 m / 0,51 m | 0,605 m | 0° (mobilen 14°) | −25,1° | 421,3; 929,3 | 479; 1011,5 |  |  |
| P3.C1 | −0,187 m | −1,503 m | 0,341 m / 0,571 m | 0,601 m | 0° (mobilen 7°) | −13,4° | 607,5; 960,5 | 643,5; 1056,9 | −0,171 m; 0,61 m | −0,032 m (−5 %) |
| P3.C2 | −0,152 m | −1,516 m | 0,328 m / 0,558 m | 0,579 m | 0° (mobilen 7°) | −10,9° | 660,2; 953,8 | 689; 1047,1 |  |  |
| P4.C1 | −0,019 m | −1,447 m | 0,397 m / 0,627 m | 0,627 m | 0° (mobilen 0°) | −0,3° | 852,6; 991,6 | 856,6; 1101,4 | 0 m; 0,63 m | −0,003 m (−0 %) |
| P4.C2 | 0,019 m | −1,46 m | 0,384 m / 0,614 m | 0,614 m | 0° (mobilen 0°) | 2,6° | 910,3; 984 | 906,4; 1090,6 |  |  |
| P5.C1 | 0,151 m | −1,503 m | 0,341 m / 0,571 m | 0,591 m | 0° (mobilen −7°) | 13° | 1103,2; 960,5 | 1074; 1056,9 | 0,173 m; 0,608 m | −0,041 m (−7 %) |
| P5.C2 | 0,188 m | −1,516 m | 0,328 m / 0,558 m | 0,589 m | 0° (mobilen −7°) | 16° | 1155,1; 953,8 | 1119,5; 1047,1 |  |  |
| P6.C1 | 0,326 m | −1,551 m | 0,293 m / 0,523 m | 0,616 m | 0° (mobilen −14°) | 26,9° | 1345,8; 935,5 | 1287; 1020,5 | 0,336 m; 0,536 m | −0,017 m (−3 %) |
| P6.C2 | 0,359 m | −1,563 m | 0,28 m / 0,51 m | 0,624 m | 0° (mobilen −14°) | 29,6° | 1389,7; 929,3 | 1326; 1011,5 |  |  |
| P7.C1 | 0,501 m | −1,607 m | 0,236 m / 0,466 m | 0,684 m | 0° (mobilen −21°) | 39,9° | 1571,8; 908 | 1488,2; 980,1 | 0,499 m; 0,398 m | +0,046 m (+7 %) |
| P7.C2 | 0,535 m | −1,619 m | 0,225 m / 0,455 m | 0,702 m | 0° (mobilen −21°) | 42,3° | 1614,2; 902,4 | 1526,3; 971,9 |  |  |
| D.C1 | −0,027 m | −1,681 m | 0,163 m / 0,393 m | 0,394 m | 0° (mobilen 0°) | samma | 846,5; 874,5 | 850,5; 930,3 |  |  |
| D.C2 | 0,027 m | −1,686 m | 0,158 m / 0,388 m | 0,389 m | 0° (mobilen 0°) | samma | 916,5; 872,3 | 912,5; 927 |  |  |
| D.C3 | 0,161 m | −1,688 m | 0,156 m / 0,386 m | 0,418 m | 0° (mobilen 0°) | samma | 1093,1; 871,7 | 1069; 926 |  |  |

Jakobs dom om de vända platserna: "fyrkanter som pekar mot respektive stol" (en fråga, inte en dom än) (2026-11-26).

## 4. Dockorna

Dockornas mått står i `blackjack-dealer/dealer3d/src/doll.ts`: mannen och kvinnan är mätta på sina modeller, Paow och den vita dockan är de äldre som de gamla filmerna och rörelserna gjordes med. "(gissat)" och "(mätt)" är vad doll.ts själv säger om måttet. Ställningarna vid skon (A2.3) och i vilan (A1) är rörelsernas första rutor, som dockans kod ritar dem. De riktiga dealrarna är mätta i bilden, axlarna på ett plan 0,2 m bakom kanten; var de sitter och hur långa armarna är är inte mätt.

| Mått | Mannen | Kvinnan | Paow (äldre) | Vita dockan (äldre) | Dealer A, ser i kameran | Dealer B, ser på bordet | Källa | Jakobs dom |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| överarm (axelled till armbågsled) | 0,279 m | 0,263 m | 0,293 m | 0,29 m | — | — | `doll.ts upperArm` |  |
| underarm (armbåge till handled) | 0,272 m | 0,249 m | 0,275 m | 0,26 m | — | — | `doll.ts forearm` |  |
| armen, axel till handled | 0,551 m | 0,512 m | 0,568 m | 0,55 m | — | — | `doll.ts upperArm + forearm` |  |
| räckvidd innan bålen böjer sig | 0,536 m (gissat) | 0,498 m (gissat) | 0,552 m (gissat) | 0,535 m | — | — | `doll.ts reach` |  |
| handens längd, handled till långfingrets topp | 0,189 m | 0,178 m | 0,179 m | — | — | — | `doll.ts hand.right[12]` |  |
| axelbredd | 0,375 m | 0,337 m | 0,366 m | 0,318 m | 0,357 m | 0,348 m | `doll.ts dollFrame` (axellederna); `stil-*.json metres.shoulder_width_m` (axlarna i bilden) |  |
| axlarnas höjd över filten | 0,29 m | 0,29 m | 0,23 m | 0,349 m | — | — | `doll.ts dollFrame, place.shoulderHeight` | "dockan sitter med axlarna 31 cm över filten" (23 och 27 cm Inte bra) (2026-11-26) |
| höften över golvet | 0,807 m | 0,825 m | 0,672 m | 0,75 m | syns inte i bilden, inte mätt | syns inte i bilden, inte mätt | `doll.ts hipBelowFelt`; `table-lens.ts TABLE_BASE.floor` |  |
| axlarna över golvet | 1,24 m | 1,24 m | 1,18 m | 1,299 m | syns inte i bilden, inte mätt | syns inte i bilden, inte mätt | `doll.ts dollFrame`; `table-lens.ts TABLE_BASE.floor` |  |
| huvudets mitt (mellan hjässa och haka) över filten | 0,524 m | 0,501 m | 0,481 m | 0,542 m | — | — | `doll.ts dollFrame.head (place.head)` |  |
| huvudets mitt över golvet | 1,474 m | 1,451 m | 1,431 m | 1,492 m | syns inte i bilden, inte mätt | syns inte i bilden, inte mätt | `doll.ts dollFrame.head`; `table-lens.ts TABLE_BASE.floor` |  |
| hjässan över filten (huvudets mitt plus radien) | 0,637 m | 0,608 m | 0,599 m | 0,669 m | — | — | `doll.ts dollFrame.head, headRadius` |  |
| ögonen över filten och över golvet | — (bara i modellen) | — (bara i modellen) | — (bara i modellen) | 0,572 m och 1,522 m (antaget i Blenders standard.yaml) | syns inte i bilden, inte mätt | syns inte i bilden, inte mätt | `standard.yaml kameror.dealer_ogon.pos`; mannens och kvinnans ögon är ben i modellerna (eyeL, eyeR) |  |
| axlarna bakom spelets kant | 0,38 m | 0,38 m | 0,38 m | 0,18 m | — | — | `doll.ts place.behindEdge` (den vita: `world.ts ASSUMED.shouldersBehindEdge`) |  |
| axlarna bakom dockans bords kant | 0,15 m | 0,15 m | — | — | — | — | `table-lens.ts DOLL_TABLE.edgeBack` |  |
| höften under filten | 0,143 m | 0,125 m | 0,278 m | 0,2 m | — | — | `doll.ts hipBelowFelt` |  |
| mest lutning framåt | 25° (gissat) | 25° (gissat) | 12° (mätt) | 34,4° | — | — | `doll.ts mostLean` |  |
| mest vridning | 20° (gissat) | 20° (gissat) | 36,1° | 34,4° | — | — | `doll.ts mostTwist` |  |
| huvudets radie | 0,113 m | 0,107 m | 0,118 m | 0,127 m | — | — | `doll.ts dollFrame.headRadius` |  |
| vid skon (A2.3): vänster armbåge | 85,9° | 100,9° | — | — | 161° | 169° | `dealer3d/data/giv-fran-2-3-p4c1-ren-a-*.json frames[0].L`; `stil-*.json trunk.at_the_shoe.elbow_degrees` |  |
| i vilan (A1): vänster armbåge | 94° | 102,9° | — | — | 126° | 150° | `dealer3d/data/till-ankare-2-3-*.json frames[0].L`; `stil-*.json trunk.at_the_shoe.elbow_at_rest_degrees` |  |
| vid skon: bålens vridning | 0° | 0° | — | — | 27,9° | 9,6° | axellinjen i `giv-fran-2-3-p4c1-ren-a-*.json frames[0]`; `stil-*.json trunk.at_the_shoe.trunk_turn_degrees` |  |
| vid skon: axellinjens lutning | 0° | 0° | — | — | −9,5° | −4,2° | som ovan; `stil-*.json trunk.at_the_shoe.shoulder_line_tilt_degrees` |  |
| vid skon: axlarna åt sidan från vilan | 0 m | 0 m | — | — | 0,059 m | 0,001 m | axlarnas mitt, vilan mot skon; `stil-*.json trunk.at_the_shoe.shoulders_sideways_m` |  |

## 5. Rörelserna

Dockans takt är version A av givens koreografi (`koreo-giv.ts KOREO`), 30 rutor i sekunden, från skon (A2.3) till plats 4; editorn spelar rörelserna i Jakobs takt (`rorelse.ts STANDARDTAKT`). De riktiga dealrarnas tal är medianer. Mannens och kvinnans givar har samma rutor.

| Delen | Jakobs dom | Dockan | Dealer A, ser i kameran | Dealer B, ser på bordet | Skillnad (dockan mot dealrarnas medel) | Källa |
| --- | --- | --- | --- | --- | --- | --- |
| Vilan till skon (A1 till A2.3) | "A1 - A2.3 ska ta 1 sekund ungefär" (2026-11-26) | 1 s i editorn (stillheten i ankarna oräknad); rörelsens fil 36 rutor | — | — | — | `rorelse.ts STANDARDTAKT[0]`; `till-ankare-2-3-man.json` |
| Greppet vid skon, tills kortet har lämnat den |  | 5 rutor = 0,17 s | 0,2 s | 0,1 s | +0,02 s (+11 %) | `giv-fran-2-3-p4c1-ren-a-man.json leavesShoe`; `stil-*.json tempo.left_at_shoe_s` |
| Vänsterhanden med kortet till mötet |  | 6 rutor = 0,2 s | 0,47 s | 0,37 s | −0,22 s (−52 %) | `koreo-giv.ts KOREO.framme`; `stil-*.json tempo.left_back_with_card_s` |
| Händerna möts (greppen närmast), räknat från att vänstern är framme |  | ruta 12, 0,03 s efter (nypet i ruta 16) | −0,13 s | −0,13 s | +0,17 s | `koreo-giv.ts KOREO.framme, nyp`, rörelsens fil; `stil-*.json handover.meets_after_left_arrives_s` |
| Högerhanden ut med kortet (nypet till att kortet ligger) |  | 20 rutor = 0,67 s | 0,73 s | 0,67 s | −0,03 s (−5 %) | `koreo-giv.ts KOREO.nyp, ligger`; `stil-*.json tempo.right_out_s` |
| Kortet ut: från skon till att det ligger | "Att ge ett kort ska ta 1.2 sek och återgången 0.8" (2026-11-27) | 36 rutor = 1,2 s (editorn: 1,2 s) | — | — | — | `koreo-giv.ts KOREO.ligger`; `rorelse.ts STANDARDTAKT[1]` |
| Handen hem: från att kortet ligger till ankaret | "Att ge ett kort ska ta 1.2 sek och återgången 0.8" (2026-11-27) | 24 rutor = 0,8 s (editorn: 0,8 s) | 0,8 s | 0,6 s | +0,1 s (+14 %) | `koreo-giv.ts KOREO.ligger, hemma`; `stil-*.json tempo.right_back_s` |
| Vänsterhanden tillbaka till skon efter släppet |  | 14 rutor = 0,47 s | 0,5 s | 0,47 s | −0,02 s (−4 %) | `koreo-giv.ts KOREO.vansterSlapper, vansterHemma`; `stil-*.json tempo.left_to_shoe_s` |
| Vänsterhandens hela tur, skon och åter |  | 31 rutor = 1,03 s | 1,28 s | 1,03 s | −0,12 s (−11 %) | `koreo-giv.ts KOREO.vansterHemma`; `stil-*.json tempo.left_whole_trip_s` |
| Från ett grepp vid skon till nästa, när han ger i följd |  | 60 rutor = 2 s | 1,32 s | 1,12 s | +0,78 s (+64 %) | `koreo-giv.ts KOREO.hemma`; `stil-*.json tempo.grip_to_grip_when_dealing_on_s` |

Nyckelrutorna i version A (`koreo-giv.ts KOREO`); B har samma rutor. Platserna närmast skon ges med vänsterhanden ensam (`koreo-giv.ts ENSAM`): kortet ute ur skon i ruta 8, strax hitom platsen i 18, vänt och på plats i 36 (1,2 s), fingrarna har vilat i 40, hemma i 60 (2 s).

| Ruta | Sekund | Vad som händer |
| --- | --- | --- |
| 2 | 0,07 s | högerhanden lämnar sin plats på filten |
| 8 | 0,27 s | vänstern börjar resa kortet på högkant |
| 11 | 0,37 s | kortet ligger plant vid mötet |
| 14 | 0,47 s | kortet står på högkant |
| 16 | 0,53 s | högerns nyp om kortet är slutet |
| 17 | 0,57 s | vänstern släpper kortet |
| 28 | 0,93 s | kortets fria långsida når filten vid platsen |
| 31 | 1,03 s | vänstern är tillbaka vid skon |
| 32 | 1,07 s | kortet ligger plant, strax före platsen |
| 36 | 1,2 s | kortet är skjutet på plats |
| 40 | 1,33 s | fingrarna har vilat på kortet |
| 60 | 2 s | högerhanden är hemma |

Givens mått. B är Jakobs alternativ (vänds nära platsen) och står där den skiljer från A. Fler versioner i koden: N (ändrar vänsterns båge hem över den raka vägen till 1,5 cm, vänsterns lyft tar (rutor) till 4, högern väntar högst på vänstern (rutor) till 0); de är prov och står inte i tabellen.

| Mått | Version A | Version B | Källa | Jakobs dom |
| --- | --- | --- | --- | --- |
| mötespunkten, kortets mitt från axlarnas mitt | 10 cm åt vänster, 31 cm fram |  | `koreo-giv.ts KOREO.mote` | "mötas mer i mitten av bordet" (2026-11-26) |
| kortets långsida vid mötet (90° är längs kanten) | 90° |  | `koreo-giv.ts KOREO.moteYaw` |  |
| hur högt kortet reses mot filten | 80° |  | `koreo-giv.ts KOREO.rest` |  |
| högern kommer så högt över kortets kant innan den nyper | 2,5 cm |  | `koreo-giv.ts KOREO.ovanfor` |  |
| kortets höjd över filten när det bärs | 5 cm | 7,5 cm | `koreo-giv.ts KOREO.lyft, KOREO_B` | "Superbra, 5/5 för båda" om A och B (2026-11-26) |
| fingertopparna skjuter kortet på plats | 2 cm |  | `koreo-giv.ts KOREO.skjut` |  |
| handen vänds tillbaka minst så mycket när kortet sätts ned | 20° |  | `koreo-giv.ts KOREO.satt` |  |
| vänstern lyfts från kortet | 4 cm |  | `koreo-giv.ts KOREO.vansterUpp` |  |
| vänstern går bakåt längs sig själv | 3 cm |  | `koreo-giv.ts KOREO.vansterBak` |  |
| vänsterns handled sträcks när den släpper | 50° |  | `koreo-giv.ts KOREO.vansterOppna` |  |
| vänsterns båge hem över den raka vägen | 4 cm |  | `koreo-giv.ts KOREO.vansterBage` |  |
| var på vägen svängen mot platsen börjar | 0,12 |  | `koreo-giv.ts KOREO.svang` |  |
| mellan vilka delar av vägen kortet rullas (A) | 0 till 0,55 |  | `koreo-giv.ts KOREO.rull` |  |
| var på vägen rullningen börjar (B) | 0,6 |  | `koreo-giv.ts KOREO.rullB` |  |
| handleden högst från underarmen: vänstern, och högern medan den bär kortet | 40° och 46° |  | `koreo-giv.ts RAK, RAK_H` (tolkade ur text) | "hela handleden ska vridas i maxläge som är onaturligt" (med de vända platserna högst 36°, DOMAR.md 2026-11-26) (utan datum) |
| kortets vändning i handbytet | — (inget eget tal: koden säger "cirka 90 grader" i en kommentar) |  | `koreo-giv.ts K4` | "vänder över kortet cirka 100 grader" (2026-11-26) |

Fart och mönster: dockan räknad ur rutorna i mannens giv A till plats 4 (`blackjack-dealer/dealer3d/data/giv-fran-2-3-p4c1-ren-a-man.json`, ritad av koreo-giv.ts), handledens fart längs filten som de riktiga dealrarnas (de är mätta på ett plan strax över filten, så att lyft inte räknas). Bålen är axlarnas mitt åt sidan, huvudet dess vridning mot blickpunkten; "börjar efter handen" räknas som för dealrarna, när var och en har gått en femtedel av sin väg (minus: före handen). Inom parentes hos dealrarna: det minsta och största måttet där stil-filen har räknat det på mer än en antagen höjd för handen (`at_least`, `at_most`); deras meter är svagare än deras sekunder.

| Mått | Dockan (mannen, A till plats 4) | Dealer A, ser i kameran | Dealer B, ser på bordet | Skillnad (dockan mot dealrarnas medel) | Källa |
| --- | --- | --- | --- | --- | --- |
| Vänsterhanden med kortet, skon till mötet: toppfart | 1,71 m/s | 1,22 m/s (0,91–1,73) | 1,3 m/s (1,03–1,84) | +0,45 m/s (+36 %) | rutorna 0–11 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.left_back_with_card` |
| Vänsterhanden med kortet, skon till mötet: medelfart | 0,85 m/s | 0,64 m/s (0,49–0,82) | 0,73 m/s (0,58–0,96) | +0,16 m/s (+24 %) | rutorna 0–11 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.left_back_with_card` |
| Vänsterhanden med kortet, skon till mötet: vägen | 0,311 m | 0,308 m (0,24–0,4) | 0,272 m (0,21–0,36) | +0,021 m (+7 %) | rutorna 0–11 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.left_back_with_card` |
| Vänsterhanden med kortet, skon till mötet: toppen så långt in i rörelsen | 64 % | 30 % | 30 % | +34 % | rutorna 0–11 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.left_back_with_card` |
| Högerhanden ut med kortet: toppfart | 1 m/s | 1,19 m/s (1,14–1,46) | 0,92 m/s (0,89–0,94) | −0,05 m/s (−5 %) | rutorna 16–36 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.right_out` |
| Högerhanden ut med kortet: medelfart | 0,44 m/s | 0,59 m/s (0,53–0,67) | 0,49 m/s (0,46–0,54) | −0,1 m/s (−19 %) | rutorna 16–36 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.right_out` |
| Högerhanden ut med kortet: vägen | 0,293 m | 0,49 m (0,45–0,55) | 0,388 m (0,37–0,42) | −0,146 m (−33 %) | rutorna 16–36 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.right_out` |
| Högerhanden ut med kortet: toppen så långt in i rörelsen | 35 % | 50 % | 40 % | −10 % | rutorna 16–36 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.right_out` |
| Högerhanden hem: toppfart | 0,76 m/s | 1,69 m/s (1,32–1,81) | 1,12 m/s (1,11–1,14) | −0,64 m/s (−46 %) | rutorna 36–60 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.right_back` |
| Högerhanden hem: medelfart | 0,33 m/s | 0,77 m/s (0,66–0,9) | 0,57 m/s (0,54–0,59) | −0,34 m/s (−50 %) | rutorna 36–60 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.right_back` |
| Högerhanden hem: vägen | 0,267 m | 0,624 m (0,56–0,7) | 0,315 m (0,3–0,36) | −0,202 m (−43 %) | rutorna 36–60 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.right_back` |
| Högerhanden hem: toppen så långt in i rörelsen | 54 % | 60 % | 45 % | +2 % | rutorna 36–60 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.right_back` |
| Vänsterhanden till skon efter släppet: toppfart | 0,64 m/s | 1,26 m/s (0,98–1,61) | 1,01 m/s (0,82–1,33) | −0,5 m/s (−44 %) | rutorna 17–31 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.left_to_shoe` |
| Vänsterhanden till skon efter släppet: medelfart | 0,34 m/s | 0,68 m/s (0,54–0,89) | 0,57 m/s (0,43–0,72) | −0,29 m/s (−46 %) | rutorna 17–31 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.left_to_shoe` |
| Vänsterhanden till skon efter släppet: vägen | 0,157 m | 0,315 m (0,25–0,41) | 0,264 m (0,21–0,33) | −0,132 m (−46 %) | rutorna 17–31 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.left_to_shoe` |
| Vänsterhanden till skon efter släppet: toppen så långt in i rörelsen | 50 % | 45 % | 45 % | +5 % | rutorna 17–31 i `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json speed.left_to_shoe` |
| Handbytet: greppen så nära varandra | 0,042 m | 0,09 m | 0,075 m | −0,04 m (−49 %) | `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json handover` |
| Handbytet: vänsterns toppfart på väg in | 1,71 m/s | 1,26 m/s | 1,32 m/s | +0,42 m/s (+33 %) | `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json handover` |
| Handbytet: högerns toppfart på väg ut | 1 m/s | 0,67 m/s | 0,72 m/s | +0,31 m/s (+44 %) | `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json handover` |
| Handbytet: dalen, kortets hand som långsammast | 0 m/s | 0,09 m/s | 0,09 m/s | −0,09 m/s (−100 %) | `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json handover` |
| Handbytet: dalen som andel av toppen (0 är stopp) | 0 | 0,08 | 0,06 | −0,07 | `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json handover` |
| Handbytet: från topp till topp | 0,53 s | 0,48 s | 0,53 s | +0,03 s (+5 %) | `giv-fran-2-3-p4c1-ren-a-man.json`; `stil-*.json handover` |
| Bålen med högerhanden ut: hur långt åt sidan | 4 mm | 46 mm | 38 mm | −38 mm (−89 %) | rutorna 16–36; `stil-*.json trunk.with_right_out, head.with_right_out` |
| Bålen med högerhanden ut: följer med (över 12 mm) | nej | 88 % av gångerna | 90 % av gångerna | — | rutorna 16–36; `stil-*.json trunk.with_right_out, head.with_right_out` |
| Huvudet med högerhanden ut: hur långt det vrids | 24,2° | 33,1° | 27,6° | −6,1° (−20 %) | rutorna 16–36; `stil-*.json trunk.with_right_out, head.with_right_out` |
| Huvudet med högerhanden ut: börjar efter handen | 0,07 s | 0 s | 0,13 s | +0 s | rutorna 16–36; `stil-*.json trunk.with_right_out, head.with_right_out` |
| Bålen med vänsterhanden till skon: hur långt åt sidan | 4 mm | 22 mm | 30 mm | −22 mm (−86 %) | rutorna 17–31; `stil-*.json trunk.with_left_to_shoe, head.with_left_to_shoe` |
| Bålen med vänsterhanden till skon: följer med (över 12 mm) | nej | 41 % av gångerna | 63 % av gångerna | — | rutorna 17–31; `stil-*.json trunk.with_left_to_shoe, head.with_left_to_shoe` |
| Huvudet med vänsterhanden till skon: hur långt det vrids | 24,5° | 12,7° | 20,4° | +7,9° (+48 %) | rutorna 17–31; `stil-*.json trunk.with_left_to_shoe, head.with_left_to_shoe` |
| Huvudet med vänsterhanden till skon: börjar efter handen | 0,07 s | −0,1 s | 0,03 s | +0,1 s | rutorna 17–31; `stil-*.json trunk.with_left_to_shoe, head.with_left_to_shoe` |
| Huvudets toppfart | 171°/s | 62°/s | 57°/s | +112°/s (+188 %) | huvudet mot blickpunkten i varje ruta; `stil-*.json head.top_degrees_s` |
| Vänsterhanden medan högern går ut: vägen | 0,157 m | 0,215 m | 0,253 m | −0,077 m (−33 %) | rutorna 16–36; `stil-*.json other_hand.left_while_right_goes_out` |
| Vänsterhanden medan högern går ut: medelfart | 0,24 m/s | 0,27 m/s | 0,44 m/s | −0,12 m/s (−33 %) | rutorna 16–36; `stil-*.json other_hand.left_while_right_goes_out` |
| Högerhanden medan vänstern kommer med kortet: vägen | 0,058 m | 0,143 m | 0,187 m | −0,107 m (−65 %) | rutorna 0–11; `stil-*.json other_hand.right_while_left_comes_back` |
| Högerhanden medan vänstern kommer med kortet: medelfart | 0,16 m/s | 0,26 m/s | 0,48 m/s | −0,21 m/s (−57 %) | rutorna 0–11; `stil-*.json other_hand.right_while_left_comes_back` |
| Högerhanden medan vänstern går till skon: vägen | 0,266 m | 0,142 m | 0,16 m | +0,115 m (+76 %) | rutorna 17–31; `stil-*.json other_hand.right_while_left_goes_to_shoe` |
| Högerhanden medan vänstern går till skon: medelfart | 0,57 m/s | 0,37 m/s | 0,37 m/s | +0,2 m/s (+54 %) | rutorna 17–31; `stil-*.json other_hand.right_while_left_goes_to_shoe` |

Blinkningarna och vilan. Dockan blinkar och rör sig i vilan bara med valet "Små egna rörelser och blinkning" i Hela rundan (`rorelse.ts RUNDLIV, BLINK`); grundrörelserna har inget av det.

| Mått | Dockan | Dealer A, ser i kameran | Dealer B, ser på bordet | Skillnad (dockan mot dealrarnas medel) | Källa |
| --- | --- | --- | --- | --- | --- |
| Blinkningar i minuten | 0,6 av klippen får en blinkning; med en giv på 2,03 s 17,7 i minuten | 17,5 | 18,3 | −0,2 (−1 %) | `rorelse.ts RUNDLIV.blinkning`; `stil-*.json blinks.a_minute` |
| En blinkning tar | 0,15 s | 0,13 s | 0,23 s | −0,03 s (−18 %) | `rorelse.ts BLINK`; `stil-*.json blinks.seconds` |
| Vilan: axlarna (dockan: lyftet i ett andetag; dealrarna: spridningen över 2 s) | 2 mm till 4 mm | 0,66 mm | 0,82 mm | — (inte samma mått) | `rorelse.ts RUNDLIV.andning`; `stil-*.json rest.shoulders_slow_mm` |
| Vilan: bålen åt sidan | 3 mm till 7 mm | — | — | — | `rorelse.ts RUNDLIV.kropp.sida` |
| Vilan: huvudet (dockan: blickpunkten vandrar åt sidan och i höjd; dealrarna: näsan) | 25 mm och 15 mm | 2,44 mm | 1,4 mm | — (inte samma mått) | `rorelse.ts RUNDLIV.huvud`; `stil-*.json rest.nose_slow_mm` |
| Vilan: huvudets vridning | — | 0,63° | 0,43° | — | `stil-*.json rest.head_degrees` |
| Vilan: handlederna, vänster och höger | — | 3,6 mm och 2,7 mm | 3 mm och 3 mm | — | `stil-*.json rest.wrist_L_mm, wrist_R_mm` |

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
| A3PnCm | Kortet har landat hos en spelare | H3Pn + V2.3 | plats n (1–7), kort m; handen ligger kvar vid kortet | finns | mannen och kvinnan har kort 1 till varje plats och inget kort 2; Danilo och Frasse har ett lyft kort 2 till var sin plats (GIV-KORT-2). I filmen är vänstern oftast redan på väg med nästa kort i detta ögonblick |
| A3DCm | Kortet har landat hos dealern | H3D + V2.3 | dealerns egna kortplats, kort m | saknas | finns bara för den äldre dockan |
| A2.1 | Nyp i skons fönster | — | ena handen nyper kortet i skons fönster | finns | den äldre dockans (Paow); tas bort med henne |
| A2.2 | Släp | — | handen över kortet i skon | finns | den äldre dockans (Paow); tas bort med henne |

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

I den ordning katalogen har stadierna. "Filerna" är rörelsens filer i `blackjack-dealer/dealer3d/data/` för mannen och kvinnan (`<n>` är plats 1–7, `<docka>` mannen och kvinnan); "Stämmer?" jämför dem med katalogens status. En annan version än A väntas bara där A ges med två händer (fältet `marke` i A:s fil): platserna som ges med vänstern ensam har bara A. Bredvid står samma kategori i indelningen av hela livefilmen (`live-bj/data/segment.json dealrar.<A|B>.kategorier`, mätt på film, preliminärt), hand för hand: hur många stycken och hur länge ett tar (median, och 10–90 % av dem). En kategori kan höra till flera rörelser: GIV är alla kort till en plats, vilket kort det än är.

#### Vila (VILA): hemankare A1, mellan rundorna och medan spelarna tänker

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Grundklippet i vila (VILA-GRUND) | A1 → A1 | stilla, med andning och blinkningar | delvis | — | — (inga filer att leta efter) | höger 43 st, 1,57 s (0,64–7,13); vänster 60 st, 1,27 s (0,63–5,28) | höger 49 st, 2,23 s (0,69–9,94); vänster 48 st, 2,15 s (0,62–6,76) | `VILA` | ställningen finns; andning, små egna rörelser och blinkning finns som ett val som är avstängt |
| Korta varianter i vila (VILA-VARIANT) | A1 → A1 | en liten rörelse och tillbaka: rätta till händerna, en hand mot skon och åter, en blick mot en spelare | delvis | — | — (inga filer att leta efter) | höger 13 st, 5,33 s (1,3–11,83); vänster 22 st, 3,3 s (1,68–6,99) | höger 6 st, 6,55 s (3,18–13,98); vänster 21 st, 3,5 s (1,5–13,03) | `VANTA` | i filmen väntar händerna med små egna rörelser under 5 cm. Danilo och Frasse har två väntor var, lyfta ur filmen: händerna i vilan med dealerns små rörelser, och hans huvud, blick och min. Mannen och kvinnan har ingen |

#### Insatserna läggs (INSATSER): hemankare A1S, från att rundan är uppgjord tills given börjar

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vila medan insatserna läggs (INSATS-VILA) | A1S → A1S | högern utsträckt mot lådan, stilla; blicken i kameran | saknas | — | — (inga filer att leta efter) | höger 43 st, 1,57 s (0,64–7,13); vänster 60 st, 1,27 s (0,63–5,28) | höger 49 st, 2,23 s (0,69–9,94); vänster 48 st, 2,15 s (0,62–6,76) | `VILA` |  |
| Byta viloställe (BYT-VILA) | A1S → A1 | en hand flyttar från en vila till en annan, till exempel högern från sidan till framför kroppen när given börjar, eller vänstern mellan kroppen och skon | saknas | — | — (inga filer att leta efter) | höger 3 st, 0,3 s (0,27–0,38); vänster 5 st, 0,37 s (0,2–1,22) | höger 3 st, 0,47 s (0,28–0,79); vänster 13 st, 0,5 s (0,29–0,99) | `BYT-VILA` |  |
| Svepa bordet (SVEP) | A1S → A2.3 | högern sveper lågt från sidan tvärs över platserna och fram till mötet, där den tar första kortet; vänstern går till skon | saknas | — | — (inga filer att leta efter) | höger 2 st, 1,12 s (1,02–1,21) | — (inte i filmen) | `SVEP` | Jakobs: så börjar given hos den riktiga dealern. I filmen ofta i samma rörelse som första kortet (fältet med_svep på givet) |

#### Redo vid skon (REDO): hemankare A2.3, medan korten delas ut, mellan två kort

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Från vilan till skon (TILL-SKON) | A1 → A2.3 | båda | finns | `till-ankare-2-3-<docka>`: mannen och kvinnan 1 av 1 (2 av 2 filer som väntas) | ja | vänster 41 st, 0,63 s (0,4–0,97) | vänster 45 st, 0,57 s (0,38–0,97) | `TILL-SKON` | Danilos och Frasses är vårt eget, inte lyfta ur filmen |
| Grundklippet vid skon (REDO-GRUND) | A2.3 → A2.3 | stilla och redo, varken spänd eller slapp | delvis | — | — (inga filer att leta efter) | — (ingen kategori i indelningen) | — (ingen kategori i indelningen) | — | finns som stillhet mellan givarna i rundan, inte som eget klipp |
| Från skon tillbaka till vilan (TILL-VILAN) | A2.3 → A1 | båda | delvis | — | — (inga filer att leta efter) | höger 19 st, 0,57 s (0,27–0,88); vänster 22 st, 0,5 s (0,2–0,83) | höger 25 st, 0,37 s (0,21–1,49); vänster 13 st, 0,33 s (0,23–0,49) | `HEM` | takten är bestämd (0,8 s). Finns för Danilo och Frasse, vårt eget och inte lyft ur filmen; mannen och kvinnan har ingen |

#### Ett kort ut (GIV): hemankare A2.3, ett kort går från skon till en spelare eller till dealern

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Första kortet till en spelare (GIV-KORT-1) | A2.3 → A3PnC1 | vänstern drar, högern lägger (plats 6 och 7: vänstern ensam) | finns | `giv-fran-2-3-p<n>c1-ren-<a\|b>-<docka>`: mannen och kvinnan A: plats 1–7, B: plats 1–5 (24 av 24 filer som väntas) | ja | höger 33 st, 0,87 s (0,61–2,03); vänster 3 st, 0,23 s (0,23–0,34) | höger 61 st, 1 s (0,8–2,07); vänster 5 st, 0,37 s (0,17–0,65) | `GIV` | ritad i samma fil som handen hem; rutan där kortet ligger delar dem. Version A finns till alla sju platser, version B till plats 1–5 (plats 6 och 7 ges med vänstern ensam och har bara A). I filmen ges också plats 6 och 7 oftast med handbyte |
| Andra kortet och fler till en spelare (GIV-KORT-2) | A2.3 → A3PnCm | som första kortet | delvis | — | — (inga filer att leta efter) | höger 33 st, 0,87 s (0,61–2,03); vänster 3 st, 0,23 s (0,23–0,34) | höger 61 st, 1 s (0,8–2,07); vänster 5 st, 0,37 s (0,17–0,65) | `GIV` | Jakobs önskan: upp till sju kort per plats. Danilo har kort 2 till dagens plats 2 och Frasse kort 2 till dagens plats 1, lyfta ur filmen; mannen och kvinnan har inget |
| Kort till dealern själv (GIV-EGET) | A2.3 → A3DCm | vänstern drar, högern lägger på dealerns plats; ibland vänstern ensam | saknas | — | — (inga filer att leta efter) | höger 14 st, 0,77 s (0,38–0,86); vänster 4 st, 0,67 s (0,61–0,72) | höger 21 st, 0,73 s (0,43–1,47); vänster 4 st, 0,53 s (0,5–0,57) | `GIV-EGET` | i filmen läggs dealerns kort oftast av högern efter ett handbyte, som en spelares; vänstern ensam är det ovanliga |
| Kortet ur skon till handbytet (SKON-TILL-BYTET) | A2.3 → A2M | vänstern drar kortet ur skon och för det på kant till mötet; högern går fram och tar det | finns | — | nej: katalogen säger finns men har inga filer | vänster 65 st, 0,67 s (0,35–0,97) | vänster 99 st, 0,83 s (0,4–0,97) | `DRA` | första halvan av en giv, ett klipp för alla platser: givens rutor fram till bytet (lyft-<docka>-p4), oförändrade |
| Kortet från handbytet till platsen, och handen hem (GIV-FRAN-BYTET) | A2M → A2.3 | högern för kortet till platsen och lägger det, och går hem; vänstern går tillbaka till skon | delvis | — | — (inga filer att leta efter) | höger 33 st, 0,87 s (0,61–2,03); vänster 3 st, 0,23 s (0,23–0,34) | höger 61 st, 1 s (0,8–2,07); vänster 5 st, 0,37 s (0,17–0,65) | `GIV` | andra halvan av en giv, en per plats: givens rutor från bytet (lyft-<docka>-p4), oförändrade, så att skon till bytet och detta efter varandra är hela given ruta för ruta. Finns till plats 4; de andra platserna saknas (de behöver sitt eget lyft, lagt från samma ankare) |

#### Handen hem (TILLBAKA): hemankare A3PnCm, efter att kortet har landat

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Handen hem till skon (HEM-TILL-SKON) | A3PnCm → A2.3 | handen som lade kortet | finns | `giv-fran-2-3-p<n>c1-ren-<a\|b>-<docka>`: mannen och kvinnan A: plats 1–7, B: plats 1–5 (24 av 24 filer som väntas) | ja | — (ingen kategori i indelningen) | — (ingen kategori i indelningen) | — | andra halvan av givens fil. I filmen går högern hem mellan två kort hos Danilo i 8 av 26 och hos Frasse i 2 av 56 (av de kort hos en spelare som följs av ett nytt kort); se HEM-TILL-BYTET |
| Högern från platsen tillbaka till nästa kort (HEM-TILL-BYTET) | A3PnCm → A2M | högern går från kortet direkt till mötet, medan vänstern redan drar nästa kort ur skon | förslag | — | — (inga filer att leta efter) | höger 33 st, 0,87 s (0,61–2,03); vänster 3 st, 0,23 s (0,23–0,34) | höger 61 st, 1 s (0,8–2,07); vänster 5 st, 0,37 s (0,17–0,65) | `GIV` | så ger Frasse nästan alltid och Danilo oftast, med händerna i otakt (av de kort hos en spelare som följs av ett nytt kort: Frasse 54 av 56, Danilo 18 av 26); Danilo går hem oftare, och det hör till hans stil. Ersätter att båda händerna alltid går hem mellan korten |
| Handen hem direkt till vilan (HEM-TILL-VILAN) | A3PnCm → A1 | båda | saknas | — | — (inga filer att leta efter) | höger 19 st, 0,57 s (0,27–0,88); vänster 22 st, 0,5 s (0,2–0,83) | höger 25 st, 0,37 s (0,21–1,49); vänster 13 st, 0,33 s (0,23–0,49) | `HEM` | efter rundans sista kort; vänstern går ofta hem samtidigt |
| Rätta till ett kort (RATTA) | A3PnCm → A3PnCm | en liten rörelse vid kortet som ligger | saknas | — | — (inga filer att leta efter) | — (inte i filmen) | höger 2 st, 0,28 s (0,27–0,3) | `RATTA` |  |

#### Dealerns egna kort (DEALERNS TUR): hemankare A1, när spelarna är klara: dealern drar sina kort

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vända sitt eget kort (VAND-EGET) | A1 → A1 | en hand | saknas | — | — (inga filer att leta efter) | — (ingen kategori i indelningen) | — (ingen kategori i indelningen) | — | finns inte i filmen: livebordet ger dealerns kort med framsidan upp, utan hålkort. Ritas efter vårt eget spel om det behövs |

#### Mot spelaren (SPELARENS TUR): hemankare A1V, när en spelare ska välja

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Peka på spelaren som ska agera (PEKA) | A1V → A1V (över plats n) | snabbt, med hela handen öppen mot platsen och tillbaka | saknas | — | — (inga filer att leta efter) | höger 1 st, 1,23 s (1,23–1,23) | — (inte i filmen) | `PEKA` | Jakobs önskan. Nästan inte i filmen: där visar spelets skylt vems tur det är, och dealern ser i kameran. Ritas med högerns väg mot platsen ur givet som förlaga |

#### Rundan görs upp (AVSLUT): hemankare A1, marker betalas ut och tas in, korten samlas in

| Rörelse | Från → till | Händerna | Status | Filerna | Stämmer? | Danilo (dealer A) | Frasse (dealer B) | Kategorin i indelningen | Anteckning |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Betala ut marker till en spelare (MARKER-UT) | A1 → A1 (över plats n) | en hand från brickan till platsen och tillbaka | saknas | — | — (inga filer att leta efter) | — (ingen kategori i indelningen) | — (ingen kategori i indelningen) | — | inte mätt: livebordet har inga marker (de är spelets grafik), så rörelsen får ritas efter vårt eget bord |
| Ta in marker från en spelare (MARKER-IN) | A1 → A1 (över plats n) | en hand ut till platsen och tillbaka till brickan | saknas | — | — (inga filer att leta efter) | — (ingen kategori i indelningen) | — (ingen kategori i indelningen) | — | inte mätt: livebordet har inga marker (de är spelets grafik), så rörelsen får ritas efter vårt eget bord |
| Korten in i lådan (KORT-IN) | A1 → A1S | högern samlar korten från platserna och de egna (vänstern hjälper), lyfter dem till lådans öppning och lägger dem där, och vilar sedan åt sidan | saknas | — | — (inga filer att leta efter) | höger 11 st, 4,47 s (1,8–8,43); vänster 6 st, 4,37 s (1,97–7,03) | höger 12 st, 5,73 s (0,65–9,13); vänster 10 st, 2,62 s (0,32–3,81) | `KORT-IN` | en enda rörelse i filmen: insamlingen och lådan hör ihop |

**Rörelser som delar filer.**

- GIV-KORT-1 och HEM-TILL-SKON pekar på samma filer (`giv-fran-2-3-p<n>c1-ren-<a|b>-<docka>`): de är ritade i en fil, och rutan där kortet ligger (`rests` i filen) delar dem. I de 24 filer som finns: Första kortet till en spelare i rutorna 0–36 (1,2 s), Handen hem till skon i rutorna 36–60 (0,8 s).

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

- Skons lutning: skon står plant på filten; bara frontplattan lutar (51,6°, `table-lens.ts SHOE.plateLean`). Korten i skon har ingen egen lutning: de ligger mot plattan och lutar som den.
- Kortets vändning i handbytet har inget eget tal i koden: koreo-giv.ts säger "cirka 90 grader" i en kommentar, och Jakob sa "cirka 100 grader".
- Handledens gräns 36 grader i DOMAR.md är ett resultat på de vända platserna, inte ett tal i koden; koden håller handen inom RAK och RAK_H (koreo-giv.ts, ovan).
- Livebordets sko: kortleken ligger på en bädd som stiger bakåt, och korten lutar bakåt som fronten med långsidan tvärs skon (mätt om 2026-11-27; förut stod de nästan upprätt). Bara kortlekens längd längs bädden är skattad: den krymper när korten delas ut (`table-live.ts LIVE.shoe`). Sargen (rullen) är bara mätt i bildpunkter. Livebordet har ingen markerbricka; platsmärkena är spelets ritade knappar i bilden.
- Livebordets dealrar: hur långt bakom kanten de sitter är antaget (0,2 m; skattat 0,07–0,16 m), och armarnas längd går inte att mäta (dockans egna används).
- Livebordet: golvet syns inte i bilden; filtens och sitsens höjd över golvet är slutledda ur dealrarnas ögon när de står, inte mätta.
- Mannens och kvinnans ögon har ingen höjd i koden: ögonen är ben i modellerna (eyeL, eyeR i .glb-filerna), och närmast i koden är huvudets mitt. Blenders kamera dealer_ogon i standard.yaml är antagen, för den vita dockan.
- Stolens höjd: dockans rum sätter stolen under hennes lår när bilden ritas (standard-room.ts seatStool), så den har inget fast tal; det enda talet är standard.yaml:s antagna sits för den vita dockan. Golvet står olika: 0,95 m under filten i standarden (table-lens.ts TABLE_BASE.floor, dockans rum och Blender) och 0,92 m i 3D-scenens rum och sal (scene3d-room.ts och scene3d-hall.ts FLOOR).
- Antaget, inte mätt (`avatar-auto-pipeline/scen/standard.yaml`, skrivet av gen_standard.py): stolen, lådan för använda kort, kortbunten i skon, kortplatsernas ram, spelarnas platser och Blenders extra kameror (dealerns ögon, händerna, hela bordet, uppifrån).
- Dockornas räckvidd, mest lutning och mest vridning är gissade (doll.ts säger det själv i `about`).
- Blenders `standard.yaml` har ingen docka för mannen och kvinnan: dess `docka` är den vita dockan (doll.ts STANDARD) flyttad till Paows plats.
- Sidokamerans tal står två gånger, i editorns `standarddocka/editor/scen.ts` och i Blenders `scen/vy.py`; matt.ts läser scen.ts.
- Dockan blinkar inte och andas inte i grundrörelserna; det finns bara som valet i Hela rundan (rorelse.ts RUNDLIV), avstängt tills Jakob har sett det (DOMAR.md).

## Källorna

Det verktyget läste. "kod" är importerat som programmet självt använder det; "text" är tolkat ur filens text, därför att namnet inte exporteras eller filen inte går att importera i Node, och går sönder om skrivsättet ändras (då blir raden tom eller nämns här); "data" är en JSON-fil.

| Fil | Hur | Läst |
| --- | --- | --- |
| `blackjack-dealer/src/table-lens.ts` | kod | ja |
| `blackjack-dealer/dealer3d/src/world.ts` | kod | ja |
| `blackjack-dealer/dealer3d/src/doll.ts` | kod | ja |
| `standarddocka/DOMAR.md` | text (bara citaten i kolumnen Jakobs dom) | ja |
| `blackjack-dealer/placements/default.json` | data | ja |
| `avatar-auto-pipeline/scen/standard.yaml` | text (rad för rad: det antagna och det som bara Blender har) | ja |
| `blackjack-dealer/src/scene3d-geometry.ts` | kod | ja |
| `blackjack-dealer/dealer3d/src/koreo-giv.ts` | kod | ja |
| `blackjack-dealer/dealer3d/src/koreo-giv.ts` | text (KOREO_B och de andra versionerna, RAK och RAK_H: de exporteras inte) | ja |
| `standarddocka/editor/rorelse.ts` | kod | ja |
| `live-bj/data/scen.json` | data | ja |
| `live-bj/data/stil-kameran.json` | data | ja |
| `live-bj/data/stil-bordet.json` | data | ja |
| `standarddocka/editor/scen.ts` | text (sidokameran: filen importerar three.js) | ja |
| `live-bj/data/uppsattning.json` | data | ja |
| `avatar-auto-pipeline/scen/bygg_bord.py` | text (SKO_FRONT och skons väggar: står bara där) | ja |
| `blackjack-dealer/src/scene3d-room.ts, scene3d-hall.ts` | text (FLOOR: exporteras inte) | ja |
| `blackjack-dealer/src/table-live.ts` | kod | ja |
| `blackjack-dealer/dealer3d/data/giv-fran-2-3-p4c1-ren-a-man.json` | data | ja |
| `blackjack-dealer/dealer3d/data/till-ankare-2-3-man.json` | data | ja |
| `blackjack-dealer/dealer3d/data/giv-fran-2-3-p4c1-ren-a-kvinna.json` | data | ja |
| `blackjack-dealer/dealer3d/data/till-ankare-2-3-kvinna.json` | data | ja |
| `standarddocka/rorelsekatalog.json` | data | ja |
| `live-bj/data/segment.json` | data | ja |
| `blackjack-dealer/dealer3d/data/<katalogens filer>` | data (bara huvudet: fps, frameCount, rests) | ja |
