# standarddocka

Arbetsbänken där standarddockan görs färdig: en man och en kvinna med samma skelett, vid spelets bord, i Blenders vy
genom spelets kamera, med rörelser som är riktigt bra. När Jakob är nöjd plockas delarna in i `../blackjack-dealer/`
och `../avatar-auto-pipeline/`. Reglerna står i `AGENTS.md`.

## Mappar

```
standarddocka/
  AGENTS.md     regler
  README.md     den här filen: läget, nästa steg och det som ska plockas in
  scen/         skripten som sätter ihop vyn i Blender
    vy.py       arbetsvyn: bordet med kanten närmare, mannen i vilan (A1) på stolen, händerna på filten och blicken
                mot kameran; ställningen, stolen och blicken är tal och steg överst i filen
  vy/           den senaste arbetsvyn, skriven av scen/vy.py (varje körning skriver över den förra): vy.blend
                (dubbelklicka för att öppna scenen i Blender), bilderna och mätningen; går inte in i Git
  editor/       editorn i webbläsaren: mannen vid bordet, en tidslinje att spela och dra i, kameror (också från de
                sju platserna), handtag på händer, armbågar och blick som blir ändringar ovanpå grundrörelserna,
                återställning och inspelning av klipp
    server.ts   editorns egen server (bara den här datorn, port 4320); lämnar ut sidan, modellerna och rörelserna,
                tar emot det som sparas och gör film av inspelningens bilder (FFmpeg)
    editor.ts   sidan: tidslinjen, kamerorna, handtagen, Spara, Återställ, Spela in
    scen.ts     scenen: bordet, stolen och dockan (mannen eller kvinnan) i spelets mått, ljuset, kortet, kamerorna
    rorelse.ts  rörelsen: grundrörelser efter varandra, skarven utjämnad, ändringarna ovanpå, vem som håller kortet
    armar.ts    regeln att underarmarna går över bordets kant (armbågen vrids ut och upp)
  verktyg/      för agenter, utan fönster (hur de används: skillen granska-rorelse, ../.claude/skills/granska-rorelse/)
    titta.ts    stillbilder ur valda kameror vid valda tider, med editorns mått, eller en inspelning; kör editorn i
                ett headless Chrome under det delade låset
    mat.ts      mäter en rörelse ruta för ruta mot vad en hand och ett kort kan göra: fingrar i kortet eller filten,
                kortet utan stöd, plötsliga vändningar, ryck, hopp på en ruta, landningen; ingen webbläsare. `--alla`
                är spärren före en inspelning: alla sju platser, en rad var, och rött om någon har ett finger genom
                kortet eller i filten, kortet utan stöd, ett hörn under filten, ett hopp eller en sned landning
  rorelser/     det editorn sparar, en rörelse per kortplats: a1-a23-p<plats>c1.json (vilka grundrörelser, blicken,
                farten per del, ändringarna) och a1-a23-p<plats>c1.rutor.json (hela rörelsen ruta för ruta i dockans
                format, skriven vid Spara)
  klipp/        filmerna Spela in gör: <rörelse>-<del>-<kamera>.mp4 (1764 x 1174, 30 bilder i sekunden); en ny
                inspelning med samma namn skriver över den förra; går inte in i Git
  STARTA editorn.cmd   dubbelklicka för att starta editorn och öppna den i webbläsaren
```

Editorn startas med dubbelklick på `STARTA editorn.cmd`, eller från casino-mappen med
`node standarddocka/editor/server.ts --oppna`, och öppnas på `http://127.0.0.1:4320/standarddocka/editor/`. Den visar
följden A1 → A2.3 → kort 1 på en plats → tillbaka: grundrörelserna `till-ankare-2-3-c` och Paows giv till den platsen
(`giv-fran-2-3-p<plats>c1-…-paow`, listan `GIVAR` i `editor/editor.ts`) ur `../blackjack-dealer/dealer3d/data/`, som
aldrig ändras härifrån. Platsen väljs med knapparna "Kortet ges till plats" (eller `?plats=1…7`, förval 4), och varje
plats har sina egna sparade ändringar.

- **Kameror:** spelets vy sedd från plats 1–7 (plats 4 är förvalet), från sidan, uppifrån, fri, och den gamla kameran
  för jämförelse. Spelets vy är den lägre kameran som Jakob valde som standard 2026-11-26: 0,58 m över filten, 12
  grader ned, samma lins som förut (`PLAY_LENS` i `../blackjack-dealer/src/table-lens.ts`); de andra platsernas kameror
  räknas ur den med `seatView`. I vilan ser han in i kameran på plats 4: ansiktet vrids ända fram mot den, med ett lyft
  som är satt efter bild (`BLICK_LYFT` i `editor/scen.ts`). En plats kamera är spelets egen regel
  (`seatEye` i `../blackjack-dealer/dealer3d/src/world.ts`); plats 4 är spelets kamera.
- **Dockan:** mannen eller kvinnan (knapparna "Dockan", eller `?docka=kvinna`). De har samma skelett och en rörelse är
  händernas, armarnas och blickens lägen i rummet, så båda gör samma rörelser och delar det som sparas.
- **Återställ:** "Tillbaka till det sparade" kastar det som inte är sparat, "Återställ till grundrörelsen" tar bort alla
  ändringar. Båda går att ångra (Ctrl+Z), och inget skrivs förrän Spara. Det sparade ligger i Git, så en äldre sparad
  version går alltid att hämta tillbaka.
- **Takt:** förvalet är Jakobs takt (`AGENTS.md`): vilan till skon 1 s, kortet ut 1 s, handen tillbaka 0,6 s, räknat
  på tiden då något rör sig; stillheten i ankaret klipps bort (`STANDARDTAKT` och `taktFor` i `editor/rorelse.ts`).
  Varje del i listan "Rörelsen består av" visar sina sekunder; ett nytt tal gör delen fortare eller långsammare (en
  fjärdedel till fyra gånger grundrörelsens fart), jämnt genom delen. En egen fart sparas med rörelsen, följer med i
  inspelningen och i rutorna, och Återställ går tillbaka till förvalet. Ändringarna sitter kvar i samma ögonblick av
  rörelsen när farten ändras.
- **Små egna rörelser:** fem slag som slås på var för sig och läggs ovanpå rörelsen utan att ändra den: han andas,
  huvudet rör sig lätt, en kort blick mot en spelare, ett finger lyfter på en hand som vilar, och kroppen väger över.
  "Slumpa om" lägger dem på andra ställen; samma frö ger samma rörelser. De är noll i varje dels början och slut, så
  att klippen fortfarande möts i ankaren, och sparas med rörelsen (`liv` i filen; `medLiv` i `editor/rorelse.ts`).
- **Blicken** är rörelsens egen: i vilan ser han rakt fram, mot spelaren på plats 4 i ögonhöjd, vilken kamera som än
  är vald, så att två klipp som möts har samma huvud.
- **Spara mäter armarna** på den färdiga rörelsen, med ändringarna i, skriver måtten i rutornas fält `armar` och säger
  till om en underarm går genom bordets kant.
- **En grundrörelse på prov:** `?giv=<namn>` och `?vilan=<namn>` (eller `--giv`, `--vilan` i verktygen) spelar och mäter
  en annan fil ur `../blackjack-dealer/dealer3d/data/` i stället för platsens, utan det sparade lagret och utan att
  kunna spara. För den som gör om en grundrörelse.
- **Nyckelfärger:** med `?utseende=nyckel` i adressen (eller `--utseende nyckel` i `verktyg/titta.ts`) ritas scenen för
  film där dealern ska skiljas ut i efterhand: bakgrunden blå och utan golv, bordet och markerbrickan gröna utan
  tryck, kasseringslådan borta, och korten i spårfärger. Färgerna står i `NYCKEL` i `editor/scen.ts`. Inspelade klipp
  får då `-nyckel` sist i namnet.
- **Spela in:** hela rörelsen, en del av den eller given (kortet ut och handen tillbaka i samma film), från den valda
  kameran eller från alla sju platserna i ett svep, utan kulor och pilar. Blicken står fast under inspelningen, så att det är samma rörelse från varje kamera. Filmerna hamnar i
  `klipp/`. Kräver FFmpeg på datorn (`ffmpeg` i sökvägen, eller miljövariabeln `FFMPEG`).

En ändring i `editor/server.ts` gäller först när servern har startats om: stäng fönstret den körs i och starta igen
(en server som en agent har startat utan fönster stoppas med sitt process-id, efter att `/vem` har svarat
"standarddockans editor").

Arbetsvyn körs från den här mappen (Blender 5.3, utan fönster; bygger bordet själv om det saknas):

```text
blender -b --factory-startup --python-exit-code 1 --python scen/vy.py
```

Bilderna (`vy_film`, `vy_lag`, `vy_hel`, `vy_sida`, `vy_arm_nara`, `vy_bak`, `vy_nara`, och `vy_hand_fram` och
`vy_hand_sida` med kameran i filtens plan), mätningen (`vy_matt.json`) och scenen (`vy.blend`) hamnar i `vy/` här.
`-- --vyer film lag` renderar bara några, `-- --skala 0.5` mindre bilder.

Mappen lånar det som redan finns i stället för att kopiera det:

| Vad | Var |
| --- | --- |
| Måtten (kamera, bord, kort, sko, markerbricka, kortplatser) | `../blackjack-dealer/src/table-lens.ts`, som Blender läser genom `../avatar-auto-pipeline/scen/standard.yaml` |
| Dockorna, bordet och stolen som modeller, och skripten som bygger dem | `../avatar-auto-pipeline/assets/` och `../avatar-auto-pipeline/scen/` |
| Rörelserna som finns (givarna) och koden som gör dem | `../blackjack-dealer/dealer3d/` |

## Läget (2026-11-26)

- Mannen och kvinnan finns som riggade modeller med fingrar och ansikte (`../avatar-auto-pipeline/assets/docka/`).
- Bordet, skon, korten, markerbrickan och stolen finns som Blender-modeller byggda ur måtten.
- Arbetsvyn finns (`scen/vy.py`). Bordets dealerkant ligger 15 cm närmare, och markerbrickan sitter nedsänkt ända
  ute i den: brickans bakvägg är bordets kant där han sitter, i linje med kanten på båda sidor. Mannen sitter i vilan
  (A1): höften 0,278 m under filten (Paows), axlarna 0,38 m bakom spelets kant, båda händerna på filten framför
  brickan, 30 cm isär, med fingrarna lätt böjda. Handflatan och varje finger vilar 1–2 mm över filten och ingenting
  ligger under den (mätt per finger i `vy_matt.json`). Armbågarna hänger 9 cm bakom kanten, armarna går över brickan
  och kanten med minst 4 mm luft, och blicken är mot kameran. Stolen är 6 cm lägre och flyttad 7 cm fram under honom,
  så att han sitter på sitsen (5 cm till ryggstödet); fötterna hänger strax framför fotringen. Ingen del av honom går
  igenom bordet eller stolen, utom att låren trycker ned dynan 5 mm. Bilden `vy_lag` är en lägre kamera från
  spelarens håll (10 grader ned i stället för 25) att jämföra med spelets.
- Studions dockvy i `blackjack-dealer` (Bordets Inspelning och `/dealer3d/docka`) ritar sedan 2026-11-26
  standarddockans kropp i den vita figurens ställe: kvinnan som förval, mannen med `?figur=man`, den vita figuren med
  `?figur=vit` eller där modellen inte är byggd (`dealer3d/page/docka.ts`, `dealer3d/src/figure-model.ts`). Rummet,
  bordet och kameran där är fortfarande de äldre; se "Plockas in" nedan.
- Skon har en frontplatta med en rundad öppning (`sko_front`, måtten i `SKO_FRONT` i
  `../avatar-auto-pipeline/scen/bygg_bord.py`): kortets rygg syns i öppningen, kortet dras nedåt och ut genom springan
  under plattan, och nästa kort visar ryggen när ett har gått. Springan är hög (59 mm över filten) eftersom givarna
  lutar ut kortet tidigt; den blir lägre först när kortet glider längre platt.
- Jakob om den första arbetsvyn: "Ser ganska bra ut nu"; brickan ut i kanten, händerna och stolen är rättade efter
  hans anteckningar och väntar på hans dom.
- Editorn finns (`editor/`) med den första följden: mannen gör Paows rörelser A1 → A2.3 → plats 4 kort 1 → tillbaka
  (6,9 s, 209 rutor) vid det närmare bordet. Blicken går mot den valda kameran i vilan, följer kortet under given och
  går tillbaka; kortet följer handen som håller det; underarmarna hålls minst 1 cm över bordets kant av en automatisk
  regel (utan den gick höger underarm genom kanten i 116 av 209 rutor). Händer, armbågar och blick går att dra i, och
  ändringarna sparas i `rorelser/`. Den öppnar i Lägre kamera (10 grader ned), som Jakob gillar och vill fila på senare.
- Editorn har också givarna till alla sju platserna, kamerorna från de sju platserna, återställning och inspelning
  (Jakob 2026-11-26). Kontrollerat i en egen webbläsare: alla sju givar laddar utan fel och underarmarna hålls över
  kanten i varje ruta; givarna till plats 1, 2, 6 och 7 är inte granskade med ögat ruta för ruta, och i given till
  plats 7 går armen tätt över eller genom skon. Från plats 1 och 7 syns att scenen saknar rum bakom bordet (bara golv).
- Tre första klipp ligger i `klipp/`: vilan till skon (A1 → A2.3, 3,0 s) från plats 4, 1 och 7, och given till plats 4
  (4,0 s) genom spelets kamera.
- Rörelserna granskas en per agent med skillen `granska-rorelse` (Jakob 2026-11-26: en svärm av agenter får granska
  småsakerna, som att fingrarna kommer rätt med kortet och att kortet rör sig trovärdigt). Första mätningen med
  `verktyg/mat.ts`, inte granskad med ögat: i given till plats 4 går pekfingret genom kortet kring 4,2 s och kortet är
  utan stöd i 32 rutor; i given till plats 7 ligger lillfingret 1 cm i filten kring 4,2 s och vänster handled är böjd
  77 grader. Rörelserna är ritade med regler, inte simulerade, och det behålls: det som skärps är reglerna för grepp,
  vändning och släpp i `../blackjack-dealer/dealer3d/src/`, på det granskningen visar.
- Granskningen av de sju givarna (2026-11-26, sju agenter, rapporterna i `../slask/standarddocka/granska-p1` …
  `granska-p7`) fann inget som editorns lager kan rätta: felen sitter i reglerna som ritar givarna
  (`../blackjack-dealer/dealer3d/src/`), framför allt greppet när högerhanden tar emot kortet, vändningen och släppet.
  På Jakobs ord görs de om där, som nya val och nya grundrörelser (`giv-fran-2-3-p<n>c1-ren-a-paow`), med hans takt
  (kortet ut högst 1 s, handen tillbaka cirka 0,6 s) och med handen vid skon redo: varken lyft och spänd eller slapp.
  Tills de är inne är givarna editorn spelar de gamla i en snabbare takt, och spärren `verktyg/mat.ts --alla` är röd
  på alla sju platserna (finger genom kortet och kortet utan stöd): inget av dem ska filmas för en betald film.
- Känt i editorn: i vilan står armbågarna utvinklade, eftersom rörelserna är gjorda för Paows kropp och ett bord vars
  kant låg 15 cm längre bort (en egen vila för det närmare bordet behövs); bålen lutar som Paows, 16 cm i given;
  filten är mörkare än i Blenders bilder; vilan i den första delen är den
  äldre vita dockans, inte den `scen/vy.py` lägger mannen i. Editorn och `scen/vy.py` ställer upp scenen var för sig
  (stolen, vilan, kamerorna): de ska läsa samma tal ur en fil.
- Provat och bedömt av Jakob: bordet 15 cm närmare dealern räcker för att det ska nå magen och skon stå helt på
  bordet. Att luta bordet mot kameran är struket.

## Nästa steg

1. Vyn: Jakob dömer arbetsvyn (bordets kant och bricka, vilan, kamerans vinkel), och den rättas tills han är nöjd.
2. Jakob dömer den första följden i editorn. En egen vila för det närmare bordet, så att armbågarna inte står ut.
3. Provet "dockans film görs om till en person" (Jakob 2026-11-26), med en provperson: en man, vars tre bilder
   (porträtt, helfigur, halvfigur) ligger hos Jakob utanför repot och aldrig går in i Git. Dockan är förlagan för
   rörelsen och bilderna för utseendet; personen behöver aldrig bli en 3D-modell för det här. Modellerna, fälten och
   priserna står i skillen `runway` (`../.claude/skills/runway/SKILL.md`). Jakob gjorde samma sak för hand i Runways
   app (Aleph 2) 2026-11-24 och det gick "skitbra". Förslaget, som väntar på hans ord (inget betalas utan det), är fyra
   steg, där nästa tas först när han har dömt det förra:
   1. Ankare: rutan i vilan (A1) och rutan vid skon (A2.3) ur dockans film från plats 4, omgjorda till personen med
      en bildmodell och hans bilder. Han dömer om det är personen och om händerna ligger rätt.
   2. Aleph 2: klippen A1 → A2.3 (3,0 s) och A2.3 → plats 4 → A2.3 (4,0 s) var för sig, med ankarna som styrbilder
      först och sist. Visar utseendet, kortgreppet och om två klipp möts utan skarv i samma ankare.
   3. Samma två klipp med Kling 4 (första och sista bild, dockans film som referensfilm, det sätt Paows givar är
      gjorda med), och det andra klippet med Gemini Omni 1.2 som billig jämförelse.
   4. Vinnaren från plats 1 och 7, med egna ankare för de kamerorna.

   Första omgången är körd (hans "kör igång" 2026-11-26, 345 krediter) och väntar på hans dom i studion, provet
   `docka-till-person-20261126`. Underlaget ligger i `../slask/standarddocka/granska/docka-till-person-1/`, en mapp per
   sätt med anropet och resultatet, och `OVERSIKT.md`: given till plats 4 (4 s) genom spelets kamera, omgjord med Aleph 2
   och en styrbild, Aleph 2 och bara en text, Kling 4 som redigerare med hans tre bilder, och Gemini Omni 1.2 med hans
   tre bilder (stoppad av Runways innehållsgranskning). Agentens läsning: Aleph 2 med styrbild följer dockan nästan ruta
   för ruta och behåller bordet; Kling 4 kan klä dockan direkt ur bilderna (hans fråga), men tar då bakgrunden ur dem
   och lägger kortet med baksidan upp. Lärdomarna står i skillen `runway`. Hans dom: "Mycket bra", och att ett hack i
   dockans giv kring ruta 50–51 syns i filmen (`verktyg/mat.ts` pekar ut samma ögonblick: ryck i höger handled vid
   4,67 s).

   Andra omgången är körd (218 krediter) och väntar på hans dom, provet `docka-till-person-2-20261126`, med underlaget
   i `../slask/standarddocka/granska/docka-till-person-2/`: vilan till skon som eget klipp med styrbild först och sist
   möter given i ankaret nästan utan skarv; och hans udda prov, en färdig film skickad in igen för att bli
   "mer naturlig", gav samma rörelse tillbaka med hacket kvar. Kvar att pröva: plats 1 och 7, kort med spårfärger och
   en bakgrund i nyckelfärg (se nedan), och Kling 4 med dockans film som lös förlaga.

   Inför nästa omgång: takten är editorns förval och blicken rörelsens egen (ovan). Kvar: ett klipp till filmmodellen
   måste vara minst 2 s (Aleph 2) eller 3 s (Kling 4), så rörelser på 1 s filmas flera efter varandra i en längre film
   (Aleph 2 tar 30 s och fem styrbilder) med en kort stillhet i ankaret mellan varje, och styckas där. Det kräver
   följder i editorn: flera givar efter varandra, också fler kort till samma plats (samma rörelse med landningspunkten
   flyttad) och varianter av en giv (annan vändning och landning ur givarnas regler, och ett eget frö för de små
   rörelserna). De byggs när de nya grundrörelserna finns.

   Tredje omgången är körd (213 krediter) och väntar på hans dom, provet `docka-till-person-3-20261126`, med underlaget
   i `../slask/standarddocka/granska/docka-till-person-3/`. Kling 4 med hans ord "gör dealerns rörelser mindre stela"
   gav nästan samma rörelse och gjorde om korten till riktiga spelkort. Nyckelfärgerna håller: dockans giv inspelad
   med editorns utseende `nyckel` (blå bakgrund, grönt bord utan tryck, spårkort med gul rygg och vit framsida innanför
   en ljusblå ram med en rosa prick) kom tillbaka från Aleph 2 med färgerna rena, och dealern, korten och skon går att
   skilja ut och bordet att byta med skuggorna kvar. Det är alltså en möjlig väg att filma dealern utan bord och låta
   spelet rita bordet; då måste spelets bord ritas genom exakt samma kamera som filmen. Spårkortets färger här är ett
   första förslag och inte spelets spårkort (`../blackjack-dealer/dealer3d/src/card-marks.ts`, gult och blått med kryss
   och prick): vilket som blir standard är Jakobs val.

   Kamerans höjd är avgjord (Jakob 2026-11-26): den lägre kameran är spelets vy och standarden för de här filmerna
   (`AGENTS.md`, provet `spelets-vy-20261126`). Den följs av editorn, de sju platsernas kameror och Blenders standard
   (`../avatar-auto-pipeline/scen/standard.yaml`, som `scen/vy.py` läser sin lägre vy ur). Det som inte har följt med
   än: bilderna i `vy/` är från före bytet (skriptet körs om när skon är ombyggd), och spelet självt ritar sina kort
   och sitt bord genom den gamla kameran tills de nya filmerna tas in där; då räknas kortplatsernas bildpunkter ur
   samma punkter på bordet genom spelets vy (`see(filmEye(PLAY_LENS), punkt)`). En film går inte att luta om i
   efterhand, så bordet spelet ritar måste gå genom exakt den här kameran.

   En tagning per sätt (hans regel i `bestalla-film`). Skattat ur prislistan 2026-11-26: cirka 800 krediter för allt
   (ankarna 100–250, Aleph 195, jämförelsen 205, plats 1 och 7 cirka 220). Anropen läggs som prov genom
   `../blackjack-dealer/tools/runway-api.ts place`, som bokför dem. Tre kameror bredvid varandra i en och samma film
   är ett senare försök: inget belägger att det ger samma ansikte i alla tre. Hela målet, 40 rörelser från 7 kameror à
   4 s, är med Alephs pris cirka 31 000 krediter per omgång och dealer; därför görs plats 4 färdig först.
4. Rörelserna en i taget, tills var och en är riktigt bra, och sättet att föra över dem till en annan kropp. Den
   första hela följden ska sluta i vilan: i dag slutar den vid skon (A2.3), och en återgång från kortplatsen direkt
   till A1 (Jakob 2026-11-23: sista given går direkt till A1) finns inte som dockrörelse.
5. Kvinnan: hon finns som val i editorn och gör samma rörelser. Kvar är att se henne ruta för ruta (smalare axlar och
   kortare armar ger andra vinklar i armbågen) och en egen vila för hennes kropp.
6. Ansiktet: båda modellerna har 30 ansiktsformer (blinkning, ögonbryn, mun, käke, efter ARKits namn) och leder för
   ögon och käke, men inget styr dem än och en rörelses rutor har inget fält för ansiktet. Nästa steg är en blinkning
   och ögon som följer blicken som en av de små egna rörelserna; minspel därutöver gör filmmodellen ur personens bilder.
7. Ordningen i mapparna (Jakob 2026-11-26): det som bygger standarden (måttfilen, bordet, dockorna, stolen och
   deras byggskript i `../avatar-auto-pipeline/scen/`, `verktyg/`, `rorelser/` och `assets/`) flyttar hit, så att
   `../avatar-auto-pipeline/` bara gör en dealer från foton på den här standarden. Väntar på svaret från den
   utomstående granskare Jakob har gett hela upplägget till (rörelser till en annan kropp, film eller realtid, sju
   platser, kameran, editorn eller Blender, mappordningen).

Lovat Jakob, inte gjort (2026-11-26): kvinnan bredvid mannen i Blenders vy; en gemensam uppställningsfil som både
`scen/vy.py` och `editor/scen.ts` läser; filtens
färg som ett val i `../avatar-auto-pipeline/scen/bygg_bord.py`; och en mätning i bild av hans iakttagelse att uppvända
kort på bordet ser bredare ut än kortet i skon (båda byggs 63 x 88 mm).

## Plockas in när Jakob är nöjd

Här skrivs varje sak som ska in i `../blackjack-dealer/` eller `../avatar-auto-pipeline/`, med vad den är och vart den
ska.

- Standarddockan i stället för den äldre dockan (Jakob 2026-11-26: "Se till att vi använder denna nya standarddocka för
  allt som syns i också 'blackjack-dealer'", och att den gamla Paow-dockan ersätts "på bäst lämpade sätt"). Vägen är
  att ersätta, inte att ha två dockor bredvid varandra, i den här ordningen:
  1. Gjort: studions dockvy ritar standarddockans kropp (ovan).
  2. De nya givarna (`…-ren-a-paow`) blir de som editorn och studion spelar, när spärren är grön på alla sju.
  3. Standarddockans egna mått in i `../blackjack-dealer/dealer3d/src/doll.ts` (i dag antagna mått för `standard` och
     Paows från SAM 3D Body), och givarna ritade om för dem. Först då kan dockan `paow`, hennes sparade standarder
     (`dealer3d/standard/`) och de äldre grundrörelserna tas bort: tills dess är alla givar ritade för hennes kropp,
     och hennes godkända filmer är gjorda av dem.
  4. Studions dockvy får det närmare bordet, skon med frontplattan och spelets vy, och det editorn här har som studion
     saknar (takten per del, de små egna rörelserna, inspelningen från sju platser). Då är editorn en vy i studion och
     den här mappen bara arbetsbänken.
  5. En dealer från foton (till exempel provpersonen) blir en post i studion vars filmer görs av dockans klipp och
     personens egna styrbilder; personen behöver ingen egen 3D-modell för det. Pipelinen i `../avatar-auto-pipeline/`
     som gör en 3D-dealer från foton riggar i dag med Meshys skelett; ska en sådan dealer göra dockans rörelser som
     3D-figur måste den riggas om till standardskelettet (samma lednamn), och det är inte byggt.

- Bordet: valet `--kant-bak D` i `../avatar-auto-pipeline/scen/bygg_bord.py` (finns redan där och skriver
  `assets/bord/standardbord_nara.*`; det vanliga bygget är oförändrat). När Jakob är nöjd: kanten närmare in i
  spelets mått (`../blackjack-dealer/src/table-lens.ts`, och därmed `standard.yaml`), och rättningarna (brickan
  nedsänkt i dealerkanten med sin bakvägg som bordets kant, sargen hel under brickan, rullens rundade ändar, brickans
  rännor) blir standardbordets.
