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
    vy.py       arbetsvyn: bordet med kanten närmare, mannen i vilan (A1) på stolen, händerna platt på filten och
                blicken mot kameran; ställningen och blicken är tal och steg överst i filen
```

Arbetsvyn körs från den här mappen (Blender 5.3, utan fönster; bygger bordet själv om det saknas):

```text
blender -b --factory-startup --python-exit-code 1 --python scen/vy.py
```

Bilderna (`vy_film`, `vy_lag`, `vy_hel`, `vy_sida`, `vy_arm_nara`, `vy_bak`, `vy_nara`), mätningen (`vy_matt.json`)
och scenen (`vy.blend`) hamnar i `../slask/standarddocka/vy/`. `-- --vyer film lag` renderar bara några, `-- --skala 0.5`
mindre bilder.

Mappen lånar det som redan finns i stället för att kopiera det:

| Vad | Var |
| --- | --- |
| Måtten (kamera, bord, kort, sko, markerbricka, kortplatser) | `../blackjack-dealer/src/table-lens.ts`, som Blender läser genom `../avatar-auto-pipeline/scen/standard.yaml` |
| Dockorna, bordet och stolen som modeller, och skripten som bygger dem | `../avatar-auto-pipeline/assets/` och `../avatar-auto-pipeline/scen/` |
| Rörelserna som finns (givarna) och koden som gör dem | `../blackjack-dealer/dealer3d/` |

## Läget (2026-11-26)

- Mannen och kvinnan finns som riggade modeller med fingrar och ansikte (`../avatar-auto-pipeline/assets/docka/`).
- Bordet, skon, korten, markerbrickan och stolen finns som Blender-modeller byggda ur måtten.
- Arbetsvyn finns (`scen/vy.py`): bordets dealerkant 15 cm närmare, hel från sida till sida, med markerbrickan
  nedsänkt bakom en remsa filt på 3 cm. Mannen sitter i vilan (A1): höften 0,278 m under filten (Paows), axlarna
  0,38 m bakom spelets kant, stolen lika mycket lägre, båda händerna platt på filten framför brickan och 30 cm
  isär, armbågarna 8 cm bakom kanten och underarmarna minst 4 mm över bordet, blicken mot kameran. Ingen del av
  honom går igenom bordet; låren har 11 cm luft under sargen och magen 12,5 cm till kanten. Bilden `vy_lag` är en
  lägre kamera från spelarens håll (10 grader ned i stället för 25) att jämföra med spelets.
- Dockans kropp kan redan följa en sparad giv med fingrarna i `blackjack-dealer`s scen
  (`dealer3d/src/figure-model.ts`), men den vyn är inte den Jakob vill arbeta i.
- Väntar på Jakobs dom: provet `standarddocka-vy-20261126` i studion (arbetsvyn genom spelets kamera och genom den
  lägre, hela miljön, från sidan, bakifrån och händerna nära). Känt i bilden: han sitter långt fram på stolens sits.
- Provat och bedömt av Jakob: bordet 15 cm närmare dealern räcker för att det ska nå magen och skon stå helt på
  bordet. Att luta bordet mot kameran är struket.

## Nästa steg

1. Vyn: Jakob dömer arbetsvyn (bordets kant och bricka, vilan, kamerans vinkel), och den rättas tills han är nöjd.
2. Rörelserna in i den vyn: en giv som finns görs om till en rörelse på dockans skelett och renderas som film här.
3. Rörelserna en i taget, tills var och en är riktigt bra.
4. Kvinnan, på samma skelett och med samma rörelser.

## Plockas in när Jakob är nöjd

Här skrivs varje sak som ska in i `../blackjack-dealer/` eller `../avatar-auto-pipeline/`, med vad den är och vart den
ska.

- Bordet: valet `--kant-bak D` i `../avatar-auto-pipeline/scen/bygg_bord.py` (finns redan där och skriver
  `assets/bord/standardbord_nara.*`; det vanliga bygget är oförändrat). När Jakob är nöjd: kanten närmare in i
  spelets mått (`../blackjack-dealer/src/table-lens.ts`, och därmed `standard.yaml`), och rättningarna (hel dealerkant
  med brickan nedsänkt bakom en remsa, sargen hel under brickan, rullens rundade ändar, brickans rännor) blir
  standardbordets.
