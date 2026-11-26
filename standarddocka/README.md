# standarddocka

Arbetsbänken där standarddockan görs färdig: en man och en kvinna med samma skelett, vid spelets bord, i Blenders vy
genom spelets kamera, med rörelser som är riktigt bra. När Jakob är nöjd plockas delarna in i `../blackjack-dealer/`
och `../avatar-auto-pipeline/`. Reglerna står i `AGENTS.md`.

## Mappar

```
standarddocka/
  AGENTS.md     regler
  README.md     den här filen: läget, nästa steg och det som ska plockas in
  scen/         skripten som sätter ihop vyn i Blender: bordet, dockan, stolen, kameran, ställningen och blicken
```

Mappen lånar det som redan finns i stället för att kopiera det:

| Vad | Var |
| --- | --- |
| Måtten (kamera, bord, kort, sko, markerbricka, kortplatser) | `../blackjack-dealer/src/table-lens.ts`, som Blender läser genom `../avatar-auto-pipeline/scen/standard.yaml` |
| Dockorna, bordet och stolen som modeller, och skripten som bygger dem | `../avatar-auto-pipeline/assets/` och `../avatar-auto-pipeline/scen/` |
| Rörelserna som finns (givarna) och koden som gör dem | `../blackjack-dealer/dealer3d/` |

## Läget (2026-11-26)

- Mannen och kvinnan finns som riggade modeller med fingrar och ansikte (`../avatar-auto-pipeline/assets/docka/`).
- Bordet, skon, korten, markerbrickan och stolen finns som Blender-modeller byggda ur måtten.
- I Blenders vy sitter dockan 38 cm från bordskanten med händerna i luften, och blicken är inte ställd.
- Dockans kropp kan redan följa en sparad giv med fingrarna i `blackjack-dealer`s scen (provet
  `standarddocka-man-bord-20261126` i studion), men den vyn är inte den Jakob vill arbeta i.
- Provat och bedömt av Jakob: bordet 15 cm närmare dealern räcker för att det ska nå magen och skon stå helt på
  bordet. Att luta bordet mot kameran är struket.

## Nästa steg

1. Vyn: mannen vid bordet i Blender genom spelets kamera, med händerna på filten, blicken mot kameran och bordet
   närmare. Bordets kant och markerbricka rättas tills Jakob är nöjd med bilden.
2. Rörelserna in i den vyn: en giv som finns görs om till en rörelse på dockans skelett och renderas som film här.
3. Rörelserna en i taget, tills var och en är riktigt bra.
4. Kvinnan, på samma skelett och med samma rörelser.

## Plockas in när Jakob är nöjd

Inget än. Här skrivs varje sak som ska in i `../blackjack-dealer/` eller `../avatar-auto-pipeline/`, med vad den är och
vart den ska.
