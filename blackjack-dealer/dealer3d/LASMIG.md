# dealer3d: dealern som verklig geometri

3D-banans arbetsmapp: en vit docka i bordets verkliga geometri, vars filmer styr beställningarnas rörelse. Överlämningen
är banans lägesfil; resten är uppslag: slå upp ett avsnitt (sök på rubriken), läs inte hela. Jakobs besked om dockan:
[BESKED](../docs/BESKED.md), "Dockan".

## Överlämning

**Läget.**
- **En dockfilm görs i ett steg**, från Kortplans steg 3 eller med `node tools/doll-order.ts <dealer> <P5.C1|D.C2> [--dry]`:
  ingången ur planen, giv och återgång (`tools/docka-cykel.ts`), filmen (`tools/render-reference.ts`, under GPU-låset),
  referensen och utkastet i Kön. Inget godkänns och inget betalas där.
- **A2.1 byggs på dockans ben:** `src/pinch-deal.ts` ger giv och återgång från ankaret (`data/ankare-2-1-paow.json`, ruta
  0 ur Paows avlästa giv 11, med hash) till varje plats; vänster hand bär kortet ensam och vänder upp det i fingrarna på
  vägen. Docklabbet, `docka-cykel.ts --from A2.1` och `doll-order.ts` använder den. På kontaktark (inte sett av Jakob):
  P3–P7 cirka 4/5; 2,5–3,6 s med återgången, längre än hans 1,3 s ut och 0,8 s åter.
- **Planens val följer dockan:** en källa, `src/doll-choices.ts`, som Kortplans steg 2 (`MotionPanel`), Bordets ankare,
  docklabbet och `doll-order.ts` läser. Handbyte måste där platsen ligger till höger om hennes högra axel (x < −0,213 m:
  P1 och P2; från A2.1 skulle vänster arm gå över hennes vilande högra hand) och där kortet läggs stängt (D.C1).
  Reglaget är då låst med skälet i klartext; planen skrivs inte om. Handbyte går inte: ingenstans än. **Spela
  kortbanan** spelar dockans giv till kortet i Ställ dockan.
- **Kortet bär Kortplans kryss och cirkel**, också i dockans filmer (`src/card-marks.ts`); referensfilmer sparade före
  2026-11-24 visar ett omärkt kort.
- **Dealerns kort** (D.C1–D.C3, `Steer.side`, `docka-cykel.ts --sida`): planens sida, som `doll-order.ts` ger dockan;
  stängt skjuts kortet med baksidan upp och vänds aldrig.
- **Givarna från A2.3:** gällande docka är **svep24d** (`data/giv-fran-2-3-p<n>-grepp-svep-d.json` för P1–P5 och
  `-p4c2-`, id `docka-2-3-p<n>c1-svep24d` i `data/rendered-references.json`); pilot 02 till plats 4 har Jakobs ja.
  Givarnas läge: [film](../docs/lage/film.md).
- **En tagning görs om genom dockan**, aldrig med förra tagningen som referensfilm (den kopieras inom en pixel), och
  varje kort har sin egen dockfilm (grannplatsens film lägger kortet på grannplatsen).

**Nästa steg, i ordning.**
1. P7.C1 från A2.3 (Jakob: "Det måste fixas"): vändningen "I handen" (`src/turn-in-hand.ts`) är rättad för P7, men
   hans `standard/paow-p7c1.json` ger vändningen 12 rutor och den behöver 20. Han sparar om den; skriv inte över den.
2. Dockfilmerna svep24d till P1–P3 och P5 granskas oberoende ([film](../docs/lage/film.md)).
3. Plats 1 (och 2): en kropp som kan resa sig och luta sig över bordet (en ny led i `src/body.ts`).
4. Höger hand under rullningen sluter sig till en ring om kortets kortsida (`gripBend` 0,6): prova ett plattare grepp.
5. Svepet (flera kort i en film): `tools/deal-film.ts --beats` tar i dag ett kort.
6. Studion: en dockfilm beställs bara från GIV-2.3 (`BordetView` dollTarget; `tools/order-routes.ts` skickar inte
   ingången); varningen `sideClash` (DollPanel, NewFilm) dubblar planens sida som `doll-order.ts` nu lägger; dockan som
   EN yta i Kortplan (`DollNote` en rad, `MotionPanel` hopfälld när dockan är vägen, dealerns kort in i `dollWay`).
7. `data/giv-avlast-*.json` (utom `-p4`, som `tools/pose-film.ts` läser) och `data/giv-fran-2-1-*-avlast-*.json` läses
   inte av någon kod.
8. SAM-dockan (Jakobs ja): se **SAM-dockan**.

**Väntar på Jakob.** Inget utanför Beslut.

**Fällor.**
- Headless Chrome bara under GPU-låset, en körning i taget. Banan skriver bara i `dealer3d/` och i slasken.
- Titta på arket och närbilden i full storlek innan ett tal skickas vidare: "inom gränserna" har inte räckt.
- Kling tar efter dockans fel: grepp, stopp, glidning och kortets storlek.
- Första bilden i en beställning är ankaret (A2.3, `assets/anchors/paow-ankare-2-3-d/anchor.png`), aldrig dockans ruta.
- Verktyget räknar rutor från 0, arken och filnamnen från 1. En levererad film görs inte om under samma namn; dockans
  filmer förs in i `data/rendered-references.json` av huvudagenten, med ett nytt id varje gång.
- Datafilerna bär sina platser (`places`), så den som spelar dem läser inte `placements/default.json`; `deal-film.ts`
  gör det (en ny datafil tar Jakobs sparade plan i det träd den läggs i).
- Mappen läser `placements/default.json` (skriver aldrig) och `src/placement-model.ts`, använder repots låsta `three`
  och `sharp`, och rör inget annat i repot.

## Vad som finns

| Fil | Vad |
| --- | --- |
| `../src/table-lens.ts` | **Bordets lins**: en fysisk kamera för bankens bild (1764 × 1174) i verkliga meter (`TABLE_LENS`), `realCardQuad` (ett verkligt korts fyra hörn vid en plats) och `shoeCardQuad` (kortet i skons fönster); skon `SHOE`. Kortplanen ritas med den (`src/card-plan.ts`). |
| `src/camera.ts` | Linsfamiljen `lensForFocal` (alla linser som ger kortet vid plats 4 dess storlek och form) och vad en lins gör av en sträcka i bilden. Ren räkning. |
| `src/world.ts` | Det filmen visar (`MEASURED`) och det som antas (`ASSUMED`); `filmLens()`, linsen som ritar hennes kropp i verklig storlek (lika med `TABLE_LENS`); planens kortplatser; stolarnas ögon (`seatEye`: varje stol ser sitt eget första kort som bankens kamera ser plats 4:s). Ren räkning. |
| `src/capture.ts` | **En verklig giv lagd i rummet:** händernas 21 punkter och kroppens leder ur en film, satta under linsen punkt för punkt, kortet ur filmens kortspår med sin hållna ände vid fingrarna; `joints` och `LIMITS` säger vad arm och hand kan göra; `moved`, `loosened`, `turnBetween`, `throughShoe`. Ren räkning. |
| `data/giv-avlast-p4.json` | Den avlästa enhandsgiven från A2.1 som tal (120 rutor: kortet, båda armarna, händernas punkter i meter), skriven av `tools/lift.ts`; `tools/pose-film.ts` läser den. |
| `src/pinch-deal.ts`, `data/ankare-2-1-paow.json` | **Given från A2.1 på dockans ben:** `pinchDeal` tar ankarets ställning och en plats och ger giv och återgång; kroppen lutar och vrider sig dit armen inte når (`reachFrom`), höger hand vilar på filten. Ren räkning. |
| `src/doll-choices.ts` | **Vad dockan kan göra med planens kort**, en källa för Kortplans val och dockan; `dollIntent` och `dollEntry` ger planens rörelse och ingång som dockan följer dem. Ren räkning. |
| `src/real-deal.ts` | **En riktig dealers tvåhandsgiv som tal:** åtta kort, för varje kort tio ögonblick i sekunder och de två punkter på filten där händerna byter, avlästa ur en film av ett riktigt bord. Bara tal lämnar den filmen. |
| `src/two-hand.ts` | **Tvåhandsgiven från pose 2.3** i den riktiga dealerns takt: kortet ut ur skon, fört till höger hand, rest på kortsidan, fällt framåt i luften, sänkt och skjutet de sista 4 cm; `startOnAnchor` lägger höger hand där ankarbilden har den. Filens huvud säger vad som är avläst och vad som är modell. |
| `src/hand-pose.ts` | En hand som stel form i sina egna axlar: ställd, vriden, fingrarna böjda i sina leder (benen behåller längden), tummen mot en punkt, och `track` (ett värde genom nycklar utan översläng). |
| `data/giv-fran-2-3-p5.json`, `-p5-langsam.json`, `-p4.json` | Tvåhandsgiven som tal sidan spelar (plats 5 i hennes takt och långsamt med `pace`; plats 4, 90 rutor, 3,0 s). `card.id` är kortet i spel, `laid` de som ligger, `beats` varje korts ögonblick i rutor. Skrivna av `tools/deal-film.ts`. |
| `data/giv-fran-2-3-p4-f.json` med flera `-f` | Version -f: ett kort var, 90 rutor, 3,0 s; varje fil bär sina platser (`places`) och sitt `pace`. |
| `tools/deal-film.ts` | Lägger tvåhandsgiven (`--to P5.C1`, `--seconds`, `--lead`, `--right-at`, `--beats`), skriver datafilen och skriver ut slagen, ledernas gränser, om en hand går genom skon och vad bankens kamera ser av kortet. |
| `tools/deal-check.ts` | En lagd giv ruta för ruta: kortets flytt och vridning, framsidan och storleken i bankens kamera, vänster hand från kortet, höger armbåge och underarmen mot siktlinjen. |
| `tools/pose-film.ts`, `data/till-ankare-2-3.json`, `data/till-ankare-2-3-c.json` | Dockan från vila till pose 2.3 och stilla där (samma format som `giv-*.json`): förlagefilmen till ett ankare. Handens form och vila ur `data/giv-avlast-p4.json`; vägen, lutningen och blicken är modell. Sista rutan är tvåhandsgivens start. |
| `src/deal.ts`, `src/body.ts` | Den första, handritade given (pensionerad som förlaga; kvar för jämförelse) och dess skelett, löst ur var händerna ska vara (`standing`, `solveBody`, `arm`); tar en docka (`src/doll.ts`), annars standarddockan. |
| `src/doll.ts`, `tools/doll-pose.ts`, `tools/doll-still.ts`, `tools/docka-sam.py`, `tools/docka-mat.ts`, `tools/docka-jamfor.ts` | Dockorna och verktygen som gör dem: se **Dockorna**. |
| `src/natural.ts`, `src/hand-rule.ts`, `src/landing.ts`, `src/turn-in-hand.ts`, `src/return-cycle.ts` | Naturlig ställning, handregeln, landningen, vändningen "I handen" och återgången: se **Dockorna**. |
| `src/stage.ts` | Ritningen i three.js: bord, sko, kort med två sidor och dockan, sedda genom flera ögon. Utseenden `room`, `plain` (vit docka på grått, för en förlagefilm) och `bare` (bara dockan på genomskinligt). |
| `src/figure-model.ts` | En riggad modell (GLB med skelett) på dockans plats, ställd ur samma leder; se **Kvar**. |
| `page/` | Sidan. `?motion=<namn>` spelar en rörelse ur `data/`; `?model=1` den riggade modellen (`/model.glb`, `shoot.ts --model`); `?eyes=1,4` ögon (stol 1–7, `film` för bankens kamera, `runt35`/`runt-35` bankens kamera buren 35° runt dealern); `?to=P4.C1`, `?look=plain` eller `bare`, `?tags=0`, `?t=1.9`, `?play=1`, `?docka=paow`. Docklabbet: `page/docka.ts`, `docka.html`. |
| `tools/prov-sam.py`, `tools/prov-lay.ts`, `tools/prov-shoot.ts`, `src/prov-card.ts`, `page/prov.html`, `page/prov.ts` | **Provet en giv, två stolar**: SAM 3D Body över en film (kroppsyta och 70 leder per ruta, i SAM-appens egen Python, under GPU-låset), lagd i rummet (`--source sam` eller `pack`) till `.runtime/3d-prov/scene/<källa>.json`, visad och inspelad huvudlöst. Paketets filer och SAM:s utdata ligger bara i `.runtime/3d-prov/`. |
| `../tools/python/landmarks.py` | En film ruta för ruta med MediaPipe: händernas och kroppens punkter som JSON (mellanlager utanför Git). |
| `tools/lift.ts`, `src/read-hand.ts` | Lägger en films punkter i rummet med filmens kortspår och skriver `data/<namn>.json` med vad som mättes; `--frames 0,93` bara givens rutor, `--hand paow` dockans egna händer (vänsterhanden nyper kortets hållna ände och släpper till den lästa handen när kortet läggs), `--to`, `--loose 1`. |
| `data/giv-avlast-paow-*.json` | Paows egna givar från A2.1, en per film; 11:s ruta 0 är ankaret A2.1. Gjorda med `node dealer3d/tools/lift.ts --marks <landmarks.py-utdata> --track assets/tracking/<film>/card-track.json --frames 0,<sista> --hand paow --out dealer3d/data/<namn>.json`. |
| `tools/measure.ts` | Kalibreringen som tal: linserna, ett verkligt kort mot planens kontur, kortet i skon, stolarnas ögon. |
| `tools/shoot.ts` | Spelar in sidan utan labbserver (egen filserver, headless Chrome med egen profil och port, en PNG per tidpunkt); `--doll paow`. Under låset. |
| `tests/card-marks.test.ts` | Märkena på kortets två sidor, som Kortplan, dockan och beställningen ritar dem. Utan media och webbläsare. |

## Den avlästa given: mätt och modell

- **Mätt ur filmen** (alla 120 rutor): händernas 21 punkter i bilden, handens vridning och fingrarnas böjning, axlar,
  armbågar och öron, och kortets fyra hörn med vilken sida kameran ser.
- **Modell:** hur långt bort den delande handleden är (fäst i kortet i skon och i filten där kortet läggs, buren jämnt
  däremellan); handens storlek ur högerhanden (1,37 gånger MediaPipes); axlarna på ett klot kring höften, armens ben
  med fasta längder, armbågen under axeln; kortets lutning i djup ur förkortningen; blicken (`stage.ts`).
- **Utfall** (`tools/lift.ts`): lederna inom gränserna, kortets mitt 0,9 bildpunkter från filmens (högst 44 där det
  lämnar skon), samma sida som spåret i alla rutor, den hållna änden 29 mm från tumme och pekfinger (högst 38).
- **Slagen från A2.1** (30 rutor/s): nyp 0–23, bär i luften 23–50, nyckelvridning 50–56 (kortet på kant ruta 53–55,
  lågt), lägg 60–80, skjut sista biten 80–95, vila 96–119. Handflatan ser aldrig uppåt; handen vänds en gång, i luften.
- **Vändningen är en vridning** (`turnBetween`): kortet vrids kring en axel i jämn takt från sista rutan där baksidan
  syns väl till första där framsidan gör det, med den hållna änden vid fingrarna.
- **Flyttad giv** (`moved`, `lift.ts --to`): handen och kortet burna i sidled och svängda kring greppet; arm och kropp
  är modell. Plats 6 och 7 faller: handen går genom skon (`throughShoe`).
- **Högerhanden släppt fri** (`loosened`, `lift.ts --loose 1`): en modell, inte en avläsning; handen ligger som i
  filmen igen fyra rutor efter att kortet ligger.

## Det som är mätt och det som är antaget

- **Mätt på filmen** (paow-giv-2-1-p4-11-01): kortet vid plats 4 (nära kant 84,5, bortre 77,5, djup 72 bildpunkter);
  kortets mitt i sju rutor (kortspåret); kortet i skons fönster (51,0 × 92,2); dealerkantens rad 831,5 (kontraktet).
- **Läst för ögat, ±10 bildpunkter:** axlar, pupiller, hjässa och haka på ankaret `paow-nyp-ung-1`; skons fot.
- **Antaget:** verkliga mått (knogar 76 mm, kavajens axlar 400 mm, pupiller 62 mm), skons form (frontplattan lutad
  58°), kortets höjd över filten under given och hur handen släpper kortet.

## Linserna

- **Planens kort och dealerns kropp hör till två linser.** Planens avsmalning 0,87 hör till brännvidd cirka 800
  bildpunkter, och under den vore hon dubbelt så stor som en människa (kontraktets k = 2). Linsen som ritar henne i
  verklig storlek har brännvidd 2334 bildpunkter (bildvinkel 28,2°, lutning 25,1°, 1,110 m över filten, 1,844 m från
  dealerkanten); skons fot blir då 0,451 m och kortet i skons fönster 0,94 av ett verkligt kort.
- **Under kroppens lins** är planens kort rätt vid plats 4 (0,97) och för små närmare dealern: plats 3 och 5 × 1,04,
  2 och 6 × 1,11, 1 och 7 × 1,19, dealerns kort × 1,34. Kortet i nypet (A2.1) är 8–13 % för långt.
- Kortplanen ritas med verkligt perspektiv (`realCardQuad`, `planCardQuad` i `src/card-plan.ts`) på Jakobs ja, i
  verklig storlek: 84,5 bildpunkter i nära kant vid plats 4. Från bankens kamera ligger 3D-kortet där filmens kort
  ligger (test).

## Dockorna

`src/doll.ts`: en docka är ett namn och mått: armarnas längder, räckvidd, hur långt hon får böja och vrida sig, höften
under filten, var lederna står i bankens bild och hur långt bakom bordskanten (`place`), armbågarnas håll
(`elbowPoles`, i vilan `elbowAtRest`; `elbowPolesAt` för en ställning), en egen hand (`hand`: formen i ankaret, när hon
bär ett kort och i vilan) och formerna scenen ritar (`shape`). `about` säger om varje mått är mätt (och på vad) eller
gissat. `src/body.ts` och `src/stage.ts` tar en docka; utan en är det `standard`.

- **`standard`**: den gamla `src/body.ts` tal; inga egna poler, ingen egen hand, 0,18 m
  bakom bordskanten.
- **`paow`**: rättad mot ankare 2.3, vilan och hennes givar till plats 4 och 1, lästa med SAM 3D Body. Hon sitter
  0,38 m bakom bordskanten (händerna mot filten och kortet i skon säger det) och är en tiondel större än standard
  (axellederna 366 mm isär, armarna 0,293 och 0,275 m). Armbågarna nedåt och lite utåt i givarna, utåt och fram i
  vilan; handen hennes egen. Midjan, höfterna och hållningen är gissade. Inte dömd av Jakob; provet
  `assets/proofs/docka-paow-ratt-20261123/`.
- **Avvikelser kvar** (`tools/docka-jamfor.ts`, medel per led i bildpunkter): ankare 2.3 och given till plats 4 20,
  given till plats 1 25, vilan 5. Huvudet följer inte hennes (upp till 39 i landningen); höger armbåge i given till
  plats 1 ligger 68–79 fel mitt i svepet; i ankare 2.3 är hon vriden 13° och lutad 4° medan rörelsen börjar rak.
- **Välja docka**: sidan `?docka=paow`, inspelaren `tools/shoot.ts --doll paow`. En rörelse som bär `doll` (från
  `doll-pose.ts`) ritas med den dockan utan val, också av `tools/render-reference.ts`.
- **Räckvidd**: med handen närmast platsen når paow alla 17 platser inom 9°; med höger hand säte
  1–5 och dealerns platser. Säte 6 kräver 10,7–11,4°, säte 7 når hon inte.
- **Känd avvikelse:** standarddockans vila: höger hand inom 3 px från vilobilden i `data/dealer-standard.json`, vänster
  15 px längre in (marginalen 8 px). Får stå tills vidare.

### Verktygen

- `tools/docka-sam.py` läser stillbilder med SAM 3D Body (i SAM-checkoutens egen Python, `../sam-3d-body` bredvid
  repot eller `SAM_3D_BODY`; lokalt grafikkort, under låset) och skriver alla 127 leder med namn och föräldrar, 70
  punkter och ytan.
- `tools/docka-mat.ts --sam <mapp> [--behind-edge <m>]` lägger läsningen i scenens meter och skriver måtten bredvid
  dockans, och i `handsOnFelt` hur långt bakom kanten händerna säger att hon sitter.
- `tools/docka-jamfor.ts --sam <mapp> --motion <rörelse.json>` ställer dockan bredvid henne led för led vid samma
  ögonblick (bildpunkter och cm, fingrarnas böjning).
- `tools/doll-pose.ts --motion <giv.json> --doll paow --out <fil.json>` ställer en rörelse på en annan docka: kortet
  står kvar, hon vrider och lutar sig (högst `--most-lean`, 9°) där en handled är utom räckhåll, armbågarna löses mot
  dockans poler och händerna blir hennes; ingen del går under filten. En docka utan egna poler eller hand ställs som
  förut (`--elbow forearm`, `--hands motion`). Kvittot ger lutning, handledens flytt och handens lägsta punkt per ruta.
- `tools/hand-check.ts --platser` eller `<rörelse.json> --rutor` mäter handens fel; `tools/docka-hand.ts` passar
  vänsterhanden mot MediaPipe.
- SAM-läsningarna av Paow följde inte med från den äldre slasken; måtten ur dem står i `src/doll.ts`.

### Skon

`SHOE` i `src/table-lens.ts` är rättad efter filmens sko (prov `assets/proofs/docka-sko-ratt-20261123/`): kortets hörn i
fönstret 0–7 px från filmens; bakre foten 38 och bortre bakhörnet 29 står kvar (bildens sko är inte ritad med linsen).
Lagrade rörelser i `data/` och `standard/` är lagda med den gamla skon (`SHOE_LAID_BEFORE_20261123`); testerna lägger
dem igen med den (`Pace.shoe`, `layDeal({shoe})`, `deal-film.ts --shoe laid-before-20261123`), allt nytt läggs med
`SHOE`. Labbet lägger alltid levande med `SHOE`; posefilmernas kort flyttas in i fönstret när de visas
(`cardInFilmsShoe`).

### Vändningen vid platsen

Givet för paow (receptet svep24d, i datafilens `pace`, plus `deal-film.ts --turn-near 0.7`, `wait=14` i `--shared` och
`--grip-yaw -20`, sedan `doll-pose.ts --doll paow`): kortet förs plant 70 % av vägen innan det vänds, och handen ligger
i underarmens förlängning så att handleden vrider kortet som en nyckel. Till plats 3: armbågen 142–153°, handleden böjd
högst 17°, kortet på kant 15 cm framför kanten; till plats 4 armen rak. Utan de valen lägger koden standarddockans
rörelse byte för byte. Inte gjort: plats 1, 2, 5 och P4.C2, och en kropp som lutar sig mot säte 6 och 7. Prov
`assets/proofs/docka-paow-vandning-20261123/`; Jakob: "Bättre, men inte än" (BESKED, "Dockan").

### Vänsterarmen vid skon

- **Fingrarna** (`PAOW.hand.left`): topparna 0,1 px från hennes; pek-, lång- och ringfingret vilar på kortet och böjer
  mot handflatan i alla leder (pek 45/30/20°, lång 16/36/24°). Lillfingret lyfts bakåt vid knogen, som hennes.
- **Handbytet** (bara paow, bara i receptet): `swing=40` i `--shared` (`TWO_HAND.shared.swing`) ger handleden 28–34°,
  fri från skons platta, högerhanden synlig. Dockans handled ligger då 20–45 px längre in än hennes vid handbytet. SAM
  läser hennes vänsterhand fel i flera rutor; att lita på är ankaret, p3-02 ruta 04–12 och p3-03 ruta 08.
- Prov `assets/proofs/docka-paow-vansterarm-20261123/`. Inte gjort: övriga platser, och fingrarnas grepp i vändningen
  (hon nyper kortets hörn mellan tumme och pekfinger; dockan har bara pekfingertoppen på kortet).

### Naturlig ställning

Valet Rörelse i docklabbet: **Naturlig** (förval för Paow) och **Som förut** (kvar tills Jakob säger ja; standarddockan
har bara den). Allt läggs levande med filmens sko; Som förut är den gamla takten lagd, aldrig en lagrad fil. En sparad
standard läggs ur sitt `lab.recipe` och `lab.steer` i det val den sparades i (filen orörd); sparad i Naturlig får den
`lab.naturlig` {knobs, bodyShare}. Under Kroppen, bara i Naturlig: axlar upp och fram (cm), armbåge ut (°); texten
säger "kroppen tar X % av styrningen". Med Leder på eller i Nära kortet: en ring där varje fingertopp rör kortet och en
rad om vilka fingrar och var.

- **Koden:** `page/natural-lab.ts` (`layNatural`, `moveNatural`, `withReturn`, `quickReturn`, `humaneMotion` sist);
  `page/lay.ts` `natural: true` kör `naturalPace`; `page/lab-stage.ts` `setGrips`, `touching`; `src/natural.ts`
  (handbytet i `NATURAL.change`, greppet, kroppen, armbågen; kvitto per ruta; av som förval: `flatHand` och
  `steerOut`).
- **Handens vinkel på kortet** (BESKED, "Handens vinkel"): 17° när högerhanden tar kortet och −30° när det är vänt och
  läggs (`NATURAL_GRIP_YAW_TAKE`, `NATURAL_GRIP_YAW`), mjukt över vändningen (`two-hand.ts gripYawEnd`); två reglage.
  Gäller där värdet är tomt (`null`); ett sparat värde är en vinkel hela vägen. `docka-cykel.ts --en-vinkel`: −30°
  hela vägen.
- **Vänsterhanden vid skon i Naturlig** (bara paow; `doll.ts hand.natural`, `naturalDoll`): passad mot MediaPipe på
  ankare 2.3 (3,3 px medel), raka fingrar, lillfingret lyft, handleden böjd 42°.
- **Hans P5.C1** (`standard/paow-p5c1.json`, Som förut): händerna i varandra (−16 mm), tummen 45 mm från kortet;
  Naturlig orörd: 10 mm och 7,7 mm. Hans standard vinner där den finns. Dockfilmerna `docka-paow-2-3-p5c1-naturlig-a`
  och `-cykel-a`: Jakob "Rätt", men högerhanden för vriden vid nedsläppet; -b (`--flat-hand`) är inte sedd av honom.
- **Gör inte om**: tummen under kortet mitt emot pekfingret; tummen runt kanten (`chainTo` böjer bara i tummens plan);
  djupare grepp utan lyft (pekfingret genom kortet); armbågen med tak 1,2 rad.
- **Kortets fart** (BESKED, "Snabbare: bara händerna med kortet"; `lay.ts` `Steer.cardTempo`, svepen upp till omkring
  230 %): förval 100 %; om 200 % ska vara förval väntar på Jakob. Filmmodellens kortaste film är 3 s, så en kortare
  referens får ett stillastående slut.
- **Kvar, i ordning:** ramen i studion (sidan efter ramens storlek, duken i filmens format); tummen i rullgivarna (D.C1,
  D.C3, P6.C1, P7.C1); vändningen till P7.C1; inbäddat läge, kontraktstester och prov i `assets/proofs/`. Labbets
  kamera är 1764 × 1174, kortplanen och dockans stillbild 1762 × 1174.

### Ingång och återgång

**Giv från** A2.3 (förval) eller A2.1 (`src/pinch-deal.ts`, avstängd för P1 och P2 med skälet); A2.2 är avstängd
(ingen ställning är läst ur ankarbilden). **Giv / Giv och återgång** (förval Giv): återgången är `natural-lab.ts
withReturn`, samma som `tools/docka-cykel.ts` (`src/return-cycle.ts`; från A2.1 lyfts vänsterhanden). Standardernas
namn: `standard/<docka>-<plats>.json` är A2.3, `<docka>-a2-1-<plats>.json` A2.1 (`a2-2` hålls för A2.2); filen bär
`lab.from`, och med återgången `lab.back`.

### Landningen

Valet Landning, bara i Naturlig: högerhandens slutpose vid det lagda kortet (BESKED, "Handens landning ska gå att
välja"). Förvalen i `src/landing.ts` (`LANDINGS`: id, svensk etikett och en engelsk mening för beställningen): `lang`
(förval, handen som förut), `pek`, `pek-lang`, `toppar` (topparna mot kortets mitt), `platt`. Egen: fem reglage ovanpå
ett förval. Sparas som `lab.landing` {id och det han ändrat}; utan fältet är det `lang`, och `lang` utan reglage ändrar
ingen siffra. Handen kommer in från två rutor före beat g till rutan kortet ligger, står still
och går ut under lyftet; armbågen löses om, och en led som skulle gå ned i kortet lyfts (kvittot `liftedMm`, labbet
varnar).

### Fingrarna

`src/hand-rule.ts`: människans gränser (`LIMITS`), vad som bryts i en hand (`handFaults`: led, ben, fingrar i varandra,
grannar ur ordning, mer böjt än grannen, i kortet, i filten) och regeln (`humaneMotion`): de fria fingrarna följer
grannen (`FOLLOW`) gånger hur långt handleden är från ankaret, lyfts vid knogen ur filten och till handflatans sida om
kortet, jämnat över rutorna (högst 0,1 per ruta) och noll där handleden står som i första rutan. Tummen, pek- och
långfingret, handlederna och kortet är orörda; Som förut och standarddockan går aldrig genom regeln. Filmer gjorda före
regeln görs om med `--fingrar-som-forut`. Kvar: de hållande fingrarnas fel (pekfingrets knoge 33–41° i sidled,
långfingret över pekfingret, 5–9 mm mellan tumme och pekfinger); handen på sidan i filten på P7.C1, D.C1 och D.C3.
Bilder: `assets/proofs/docka-fingrar-20261123/`.

### Vändning "I handen"

`src/turn-in-hand.ts`, valet i docklabbet (`lab.turn`), `tools/docka-cykel.ts --vandning i-handen`; förvalet är "Som
förut". Höger hand tar kortet när vänster har släppt det, tumme under och två fingertoppar på baksidan, och vrider det
cirka 125° med underarm och handled; där det ska ligga ställs det på kanten och fälls, och fingrarna släpper vid cirka
60° från plant. Svagt: de sista ~60° faller kortet fritt (4–5 rutor) och handen rullar tillbaka. Nästa: mjukare släpp,
ett reglage för handledens vridning, renderade remsor.

### Dockan i studion

Bakgrunden under korten i Kortplan: SYSTEM, "Kortplanen"; dockans bild kommer ur `doll-still.ts` (vila: första rutan i
`till-ankare-2-3-c.json` på dockan, 1762 × 1174), under låset. Docklabbet och Dockans filmer ligger i Kortplans steg 2
(BESKED, "Ett ställe för dockan"): väljaren Planen | Ställ dockan | Dockans filmer, `?lage=docka` (`&del=filmer`), i
`studio/components/bordet/DollPanel.tsx`. Labbet säger `{docklabb:{saved}}` när en standard sparas; steg 3 sparar en
giv ur dockans standard (`tools/doll-order.ts`; texten får kortets fart-meningen när farten inte är 100 %), "Utan
dockan" ger receptets utkast. Filmer och bilden `docka-paow` gjorda med dockan före rättelsen 2026-11-23 görs om under
nytt namn.

### SAM-dockan

Jakobs ja; inte byggd. Modellfilen i SAM-checkouten (`checkpoints/sam-3d-body-dinov3/assets/mhr_model.pt`) är en riggad
modell: 127 leder med föräldrar och viloläge, en yta med 18 439 hörn och hudvikter, 45 formtal; en sparad läsning ger
ledernas vridningar utan att SAM körs igen. `Doll.skeleton` är typat men tomt. Saknas: (1) ytan och vikterna till
något scenen ritar (`SkinnedMesh` eller en GLB som `src/figure-model.ts` ställer); (2) hennes storlek och plats (SAM
gissar henne 8 % för liten; ställs som `paow`, 0,38 m bakom kanten); (3) en omställning från rörelsens få leder till
hela skelettet; (4) vänsterhandens fingertoppar, som SAM lägger 13–16 px för långt ut vid skon; (5) den förblir vit.

## Köra

```
node --test dealer3d/tests/card-marks.test.ts
tools/python/.venv/Scripts/python.exe -I tools/python/landmarks.py <film.mp4> <punkter.json>
node dealer3d/tools/lift.ts --marks <punkter.json> --track assets/tracking/<klipp>/card-track.json --out dealer3d/data/<namn>.json
node dealer3d/tools/deal-film.ts --to P4.C1 --seconds 3 --right-at 1180,887,83 --beats 4,15,20,36,22,45,58,66 --meet 1 --single 1 --roll 1 --hand-over-yaw 180 --carry 0.045 --turned-at 0.01 --tuck 300 --push 0.004 --out dealer3d/data/<namn>.json
node dealer3d/tools/deal-check.ts dealer3d/data/<namn>.json
node dealer3d/tools/shoot.ts --out <mapp> --motion giv-fran-2-3-p4-f --eyes 1,4 --film 30 0 2.9667 --size 1920x640
node dealer3d/tools/shoot.ts --out <mapp> --eyes film --look plain --tags 0 --film 24 0 4 --size 1764x1174
node dealer3d/tools/measure.ts
```

`--beats` är rutor från 0 för ut, ute, höger tar, kant, vänster släpper, framsidan, i filten, ligger; plats 1–3 även
`--real-take 1 --body <sida,vridning,framåt>`.

Filma en vit docka från bankens kamera i en ny utdatamapp (Chrome, FFmpeg och ffprobe installerade):

```powershell
node dealer3d/tools/render-reference.ts --motion dealer3d/data/giv-fran-2-3-p4-f.json --out <slasken>/p4-referens-ny --closeup 17,20,22,24 --crop 560:440:760:560
```

Inspelningen tar och släpper GPU-låset och spelar in 30 rutor/s i 1764 × 1174 med egen Chrome-profil och filserver.
`--eye 1` väljer stol 1, `--seconds` ersätter rörelsens längd, `--sheet` arkets rutnummer från 1. Utdata: MP4, ark,
slutruta och ett kvitto (frysta indata, kodens SHA, kamera, verktygsversioner, format, filernas SHA-256). Upprepa med
`rorelse.json` (`--motion`), `kortplan.json` (`--plan`) och `renderkvitto.json`; `ofullstandig.txt` markerar en
avbruten körning, och en ny körning behöver en ny mapp. Lås först vid direkt användning av `shoot.ts`. Mellanrutorna
rensas när filmen är kontrollerad (`--keep-frames` behåller dem); kör `npm run media:status` efter städning.

### En giv och retur i samma cykel

En dockfilm med giv och återgång till valfri plats, lagd som Docklabbet lägger den (Naturlig, eller Jakobs sparade
standard för docka, ingång och plats i det val han sparade den i):

```powershell
node dealer3d/tools/docka-cykel.ts --to P5.C1 --out dealer3d/data/<ny>.json [--from A2.1] [--doll paow] [--no-standard] [--flat-hand] [--landning pek] [--kortets-fart 200]
```

- `--from` är ingången (A2.3 utan; A2.1 vägrar P1 och P2), `--no-standard` lägger platsen som om ingen standard fanns,
  `--flat-hand` lägger högerhanden plan vid nedsläppet (bara Naturlig), `--sam-hand --recipe-grip-yaw
  --fingrar-som-forut --en-vinkel` lägger Naturlig som före 2026-11-23, `--sida` och `--vandning i-handen` som ovan;
  cykelns flaggor är `return-cycle.ts`:s. Det styrda i en Naturlig standard går ut under återgången, så att sista rutan
  är den första.
- Kortets fart är standardens (100 % utan); `--kortets-fart <procent>` lägger en annan, och då tar `natural-lab.ts`
  `quickReturn` återgången: handen som lade kortet går tillbaka lika många gånger fortare, blicken och den fria handen
  i sin egen takt (`return-cycle.ts` `gazeReadyFrom`, `freeLeft`).
- Landningen är standardens `lab.landing` (utan den `lang`); `--landning <id>` tar ett förval. Verktyget skriver raden
  `landning <id>` och kvittot `made.landed`.

Med en egen giv (P4.C2 med H:s takt och C2:s plats; `--contact-grip landing` håller pekfingret vid kortet till
landning; C2 tar 180° handbyte, annan vinkel avvisas):

```powershell
node dealer3d/tools/deal-film.ts --to P4.C2 --seconds 4 --beats 4,15,20,36,22,45,58,70 --right-at 1180,887,83 --meet 1 --push 0.004 --single 1 --carry 0.045 --turned-at 0.01 --roll 1 --tuck 300 --contact-grip landing --out <ny-giv.json>
node dealer3d/tools/return-cycle.ts <ny-giv.json> <ny-cykel.json> --hold 76 --ready 116 --duration 4 --lift 0.022
node dealer3d/tools/render-reference.ts --motion <ny-cykel.json> --out <ny-mapp> --seconds 4 --fps 24
```

Cykelverktyget bevarar given till och med ruta 76, lyfter handen 22 mm och återgår till exakt startrutan från 116;
kortet ligger kvar och källans SHA-256 följer med; utfilen måste vara ny. För kort retur, ett kort som inte ligger plant
och stilla och armar som inte når avvisas; punkterna rör sig högst 2 m/s. Granska filmen före betald generering.

## Kvar

- **Standarddockans startställning**: posefilmen `data/till-ankare-2-3-c.json` håller den gamla skons kort (29,7 mm
  fel); labbet flyttar kortet när den visas. En ny posefilm med rätt sko görs under nytt namn. Ingångsfilmen är
  standarddockans; `doll-pose.ts` på den slutar där paow-givarna börjar, men ingen film är gjord av den.
- **"Ihoptryckt"** (skattat, inte rättat): linsen passades med henne 0,18 m bakom bordskanten, dockan står 0,38 m
  bakom; från andra kameror än filmens sitter hon därför cirka 8 cm för lågt.
- Dockan är vit med flit: en modell som liknar Paow kan läcka sitt utseende in i filmen.
- **Jakobs Meshy-modell vid bordet** (`src/figure-model.ts`, `?model=1`, `shoot.ts --model <fil.glb>`, armarnas leder
  per bild i `ruta.json`): ett utseendeprov, ingen förlaga (BESKED: nej till Meshy-modellen av Paow). Riggen har inga
  fingerben, så kortet svävar bredvid en platt hand.
- Kling 4 genom Runway tar dockans film som referensfilm med första och sista bild, och inget av dockans utseende följer
  med (`assets/proofs/giv-forlagefilm-2/`). Den kopierar dockans fel lika troget, så en förlagefilm håller kortet i
  handen tills det ligger, har ett verkligt korts storlek i varje ruta och står på kant en gång, mitt på vägen.
- **En annan vinkel**: dockans giv filmad från stolens öga (`shoot.ts --eyes 1 --look plain`) styr rörelsen; hur
  filmen görs från en stol: [FILMMODELLER](../docs/FILMMODELLER.md), "Vinklar, 3D och Runways lista".
- Två datorer som delar en giv (händelse, kortplats, `DEAL_VERSION`, starttid) är inte byggt.
