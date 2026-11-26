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
  editor/       editorn i webbläsaren: mannen vid bordet, en tidslinje att spela och dra i, kameror, och handtag på
                händer, armbågar och blick som blir ändringar ovanpå grundrörelserna
    server.ts   editorns egen server (bara den här datorn, port 4320); lämnar ut sidan, modellerna och rörelserna
    editor.ts   sidan: tidslinjen, kamerorna, handtagen, Spara
    scen.ts     scenen: bordet, stolen och mannen i spelets mått, ljuset, kortet, kamerorna
    rorelse.ts  rörelsen: grundrörelser efter varandra, skarven utjämnad, ändringarna ovanpå, vem som håller kortet
    armar.ts    regeln att underarmarna går över bordets kant (armbågen vrids ut och upp)
  rorelser/     det editorn sparar: <namn>.json (vilka grundrörelser, blicken, ändringarna) och <namn>.rutor.json
                (hela rörelsen ruta för ruta i dockans format, skriven vid Spara)
  STARTA editorn.cmd   dubbelklicka för att starta editorn och öppna den i webbläsaren
```

Editorn startas med dubbelklick på `STARTA editorn.cmd`, eller från casino-mappen med
`node standarddocka/editor/server.ts --oppna`, och öppnas på `http://127.0.0.1:4320/standarddocka/editor/`. Den visar
följden A1 → A2.3 → plats 4 kort 1 → tillbaka (grundrörelserna `till-ankare-2-3-c` och
`giv-fran-2-3-p4c1-naturlig-cykel-a-paow` ur `../blackjack-dealer/dealer3d/data/`, som aldrig ändras härifrån).

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
- Dockans kropp kan redan följa en sparad giv med fingrarna i `blackjack-dealer`s scen
  (`dealer3d/src/figure-model.ts`), men den vyn är inte den Jakob vill arbeta i.
- Jakob om den första arbetsvyn: "Ser ganska bra ut nu"; brickan ut i kanten, händerna och stolen är rättade efter
  hans anteckningar och väntar på hans dom.
- Editorn finns (`editor/`) med den första följden: mannen gör Paows rörelser A1 → A2.3 → plats 4 kort 1 → tillbaka
  (6,9 s, 209 rutor) vid det närmare bordet. Blicken går mot den valda kameran i vilan, följer kortet under given och
  går tillbaka; kortet följer handen som håller det; underarmarna hålls minst 1 cm över bordets kant av en automatisk
  regel (utan den gick höger underarm genom kanten i 116 av 209 rutor). Händer, armbågar och blick går att dra i, och
  ändringarna sparas i `rorelser/`. Den öppnar i Lägre kamera (10 grader ned).
- Känt i editorn: i vilan står armbågarna utvinklade, eftersom rörelserna är gjorda för Paows kropp och ett bord vars
  kant låg 15 cm längre bort (en egen vila för det närmare bordet behövs); bålen lutar som Paows, 16 cm i given;
  huvudet vrids högst 40 grader, så blicken ser lite låg ut; skons främsta kort visar sin vita framsida när kortet
  har lämnat skon (Blender visar baksidan); filten är mörkare än i Blenders bilder; vilan i den första delen är den
  äldre vita dockans, inte den `scen/vy.py` lägger mannen i. Editorn och `scen/vy.py` ställer upp scenen var för sig
  (stolen, vilan, kamerorna): de ska läsa samma tal ur en fil.
- Provat och bedömt av Jakob: bordet 15 cm närmare dealern räcker för att det ska nå magen och skon stå helt på
  bordet. Att luta bordet mot kameran är struket.

## Nästa steg

1. Vyn: Jakob dömer arbetsvyn (bordets kant och bricka, vilan, kamerans vinkel), och den rättas tills han är nöjd.
2. Jakob dömer den första följden i editorn. En egen vila för det närmare bordet, så att armbågarna inte står ut.
3. Ett fristående prov av metoden "3D-rendering görs om till film" (Jakob 2026-11-26): den nakna dockan gör A1 →
   A2.3 på 2–3 sekunder, filmad ur editorn genom spelets kamera och stolarnas kameror, och klippen görs om till en
   riktig person av en filmmodell med en bild av utseendet. Editorn behöver stolarnas kameror och ett sätt att spela
   in ett klipp. Betalda körningar bara på Jakobs ord.
4. Rörelserna en i taget, tills var och en är riktigt bra, och sättet att föra över dem till en annan kropp.
5. Kvinnan, på samma skelett och med samma rörelser.
6. Ordningen i mapparna (Jakob 2026-11-26): det som bygger standarden (måttfilen, bordet, dockorna, stolen och
   deras byggskript i `../avatar-auto-pipeline/scen/`, `verktyg/`, `rorelser/` och `assets/`) flyttar hit, så att
   `../avatar-auto-pipeline/` bara gör en dealer från foton på den här standarden.

## Plockas in när Jakob är nöjd

Här skrivs varje sak som ska in i `../blackjack-dealer/` eller `../avatar-auto-pipeline/`, med vad den är och vart den
ska.

- Bordet: valet `--kant-bak D` i `../avatar-auto-pipeline/scen/bygg_bord.py` (finns redan där och skriver
  `assets/bord/standardbord_nara.*`; det vanliga bygget är oförändrat). När Jakob är nöjd: kanten närmare in i
  spelets mått (`../blackjack-dealer/src/table-lens.ts`, och därmed `standard.yaml`), och rättningarna (brickan
  nedsänkt i dealerkanten med sin bakvägg som bordets kant, sargen hel under brickan, rullens rundade ändar, brickans
  rännor) blir standardbordets.
