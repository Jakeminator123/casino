---
name: granska-film
description: Använd i blackjack-dealer när en levererad film eller stillbild från Runway ska granskas innan Jakob dömer den, när en dom ska föras in (order-put review, proof.json, review-put), när en film ska lagas med film-fix, eller när den som beställde behöver starta en oberoende granskare. Gäller rutgranskningen, rapporten, fellistan och vad Jakob fäller på.
---

# Granska en levererad film

Kommandon körs från `blackjack-dealer/`; sökvägar räknas från casino-roten.

Granskaren är en underagent som inte beställde filmen. Bedöm bara det du ser och mäter i rutorna, och var inte
generös: kontaktark har kallat filmer lovande som rutgranskningen sedan fällde. Domen fälls som skillen `doma` säger
(checklistan med Jakobs ord, domen i två delar), och underlaget av rutor, närbilder och mått görs med
`node tools/domare-underlag.ts <film>`. Svara på svenska; ditt sista meddelande
är allt den som startade dig ser. Starta inga underagenter. Ändra inget i repot; skriv bara i dumpmappen i slasken, och
radera rutor och skript efteråt (behåll högst 8 små beskärningar som bevis).

## Underlaget

- **En order i Beställ:** `blackjack-dealer/data/orders/<id>.json`: steget, `motion` (hand, grepp, sida, `flipAxis`),
  bilderna och referensfilmen. Texten `prompt.text` är beställningen. Kvittot och `take-<n>/fetched.json` under
  `assets/orders/<id>/`.
- **Ett anrop utanför Beställ** (en ny person ur `ny_dealer.py`): anropen i omgångens `anrop/` (texten och bilderna som
  gick), dockfilmen och dockans rutor (`dockans-rutor.json`, med vad dockan gör och hur kortet står i varje ruta), i
  provets `original/`.
- Rutor räknas från 0. I nyckelfärgerna är kortets rygg gul och framsidan vit, med turkos ram och magenta märke.

## Det Jakob fäller på

- Kortet tas som det ser ut i skon och handleden vrider det (2026-11-12, 2026-11-17: "Oavsett om hon nyper eller
  släpar ut kortet … måste hon vrida över handleden"). Ett kort som vrider sig mellan stilla fingrar är fel: det
  "ska inte kunna vändas av tom luft" (2026-11-23).
- Vändningen är hel, från rygg till framsida, rätt sida upp mot spelaren, sättet fritt (2026-11-17, 2026-11-18); handen
  vänds en gång, i luften, aldrig i slutet, och står vriden tills kortet ligger; kortet sitter i fingrarna genom
  vändningen.
- Kortet är slätt, en färg per sida, och nästa kort i fönstret likaså; ett tryckt spelkort är fel. Kortet har samma
  storlek i varje film. En giv är en sammanhängande rörelse, och bordets gröna står still genom filmen.
- Så väger han: ett kort som läggs ned och skjuts längs filten är inget fel (ange sträckan); färgbyte utan kantruta på
  vägen fäller han, vid platsen har han godkänt det; ett kort med ryggen upp i slutet fäller han om han inte vet att
  stängt var beställt (säg det); stelhet fäller han.

## Metoden

- **Bilderna före filmen:** första och sista bilden (och mellanbilderna) mot dockans rutor, led för led på båda armarna.
  Fäll underlaget om en led saknas, handens längd avviker mer än 15 % eller hudytan mer än 25 %.
- **Dockfilmen före tagningen:** dockans fel blir filmens. En underarm som pekar mot kameran i dockfilmen blir en arm som
  slutar vid armbågen.
- **Full upplösning:** lägg ut rutorna med ffmpeg (PNG, eller JPEG `-q:v 2`); varje påstående om kortet, fingrarna,
  vändningen och de första och sista 15 rutorna bygger på dem. Skript i filer, aldrig `node -e`; högst två ffmpeg.
- **Mått:** efterarbetets `after.json`; skakighet, ryck, ansikte och händer per ruta med domarens underlag
  (`node tools/domare-underlag.ts`); för en film i banken också `node tools/track-card.ts <klipp>` och
  `node tools/flip-axis.ts <klipp>`.

## Rapporten

Märk varje påstående [M] mätt eller [S] sett.

0. **Dom** på en rad: användbar som huvudtagning, med anmärkningar, möjlig variant (säg som vad) eller inte användbar,
   plus "lagbar" om allt som fäller är lagbart. Förslag med studions ord: Godkänn, Variant eller Underkänn.
1. **Skarvar:** ruta 0 och 3 mot första bilden, sista rutan och antal−3 mot sista bilden; ljusare eller mörkare.
2. **Kortet ruta för ruta:** när det lämnar skon, greppet, landningen, tryck eller ljus kant, blek yta, ett kort som rör
   sig på bordet utan finger (fäller), ett andra kort.
3. **Storleken:** inom ±10 % av medianen från skon till bordet; det landade mot kortet i sista bilden (och dockans kort i
   sista rutan), sidor och yta inom ±10 %, mittpunkten i bildpunkter.
4. **Vändningen:** handleden eller fingrarna, handen kvar vriden, kanten, minst en kantruta, anatomin.
5. **Fingrarna**, 6. **handens väg** (stopp, höjd), 7. **frysta rutor**, bildfrekvens och takten mot dockans,
   8. **grönt** (hörnet x 20–260, y 20–260 över filmen), 9. **allt annat** (ansikte, blick, andra handen, skon, hur
   levande dealern är).

Tur och retur: ange delningsrutan, där fingrarna lämnar kortet. Vila: ruta 3 och antal−4 mot ankaret. Flera tagningar:
rangordna dem. Avsluta med en tabell och poängraden "given 3/5, returen 1/5".

## Fellistan

Varje fel med rutor och plats, LAGBART eller INTE. Lagbart med `node tools/film-fix.ts <film> fixes.json`: `trim` och
`hold` högst 3 rutor, `blend` högst 4, `patch` högst 2 % av bilden, `key`, `level` och `plate` (en vilofilms skärm);
gränserna i `LIMITS` i `blackjack-dealer/src/film-fix.ts`, och en lista över dem vägras hel. En enda ruta som
filmmodellen har ritat fel i en film som läggs på vårt bord hålls med rutan före (`lagg-pa-bord.ts --hall`). Inte
lagbart: en hands eller kropps rörelse, ett kort som byter storlek, färgbyte utan vändning, fingrar genom kortet, fel
plats, ansiktet som glider. Takten är lagbar med `standarddocka/verktyg/i-dockans-takt.ts`. Exempel:

```json
[{"op": "trim", "end": 2, "why": "WAN 3 mörknar i sina två sista rutor"},
 {"op": "hold", "frames": [57, 57], "why": "ruta 57 blinkar, handen står still"}]
```

Domen gäller filmen som den levererades. En lagad kopia (`fixed-<k>.mp4` bredvid originalet, som aldrig ändras) är en
egen film och granskas på nytt.

## Föra in

- Granskarens dom på en order: `node tools/order-put.ts review <id> <n> --note "<domen på en rad>"`.
- Domen på ett prov: i provets `proof.json` som skillen `doma` säger ("Föra in domen").
- En lagad kopia in i banken: `node tools/register-order.ts <id> <n> --fixed <k>`.
- En preliminär dom på en film i banken bara där Jakob uttryckligen har lämnat över domen, av huvudagenten:
  `node tools/review-put.ts <klipp> <ACCEPTED|VARIANT|REJECTED> --by … --mandate … --note …`. Primär väljer bara han.
- Det han ska se läggs fram enligt skillen `visa-for-jakob`.
