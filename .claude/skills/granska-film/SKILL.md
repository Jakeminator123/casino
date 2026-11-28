---
name: granska-film
description: Använd i blackjack-dealer när en levererad film eller stillbild från Runway ska granskas innan Jakob dömer den, när en dom ska föras in (order-put review, proof.json, review-put), när en film ska lagas med film-fix, eller när den som beställde behöver starta en oberoende granskare. Gäller rutgranskningen, rapporten, fellistan och vad Jakob fäller på.
---

# Granska en levererad film

Kommandon körs från `blackjack-dealer/`; sökvägar räknas från casino-roten.

Granskaren är en underagent som inte beställde filmen. Bedöm bara det du ser och mäter i rutorna, och var inte generös:
kontaktark har kallat filmer lovande som rutorna sedan fällde. Domen fälls som skillen `doma` säger, med underlaget ur
`node tools/domare-underlag.ts <film>`. Svara på svenska; ditt sista meddelande är allt den som startade dig ser. Starta
inga underagenter och ändra inget i repot: skriv i en dumpmapp i slasken och radera den efteråt, utom högst 8 små
beskärningar som bevis.

## Underlaget

- **En order i Beställ:** `data/orders/<id>.json` (steget, `motion` med hand, grepp, sida och `flipAxis`, bilderna,
  referensfilmen; `prompt.text` är beställningen), kvittot och `take-<n>/fetched.json` under `assets/orders/<id>/`.
- **Ett anrop utanför Beställ** (en ny person ur `ny_dealer.py`): i provets `original/` anropen i omgångens `anrop/`
  (texten och bilderna som gick), dockfilmen och `dockans-rutor.json` (vad dockan gör och hur kortet står i varje ruta).
- Rutor räknas från 0. I nyckelfärgerna är spårkortets framsida vit med turkos ram och magenta märke, och ryggen gul,
  eller röd med vit kant i en omgång gjord med `--rygg rod`.

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
- **Dockfilmen före tagningen:** dockans fel blir filmens (en underarm som pekar mot kameran blir en arm som slutar vid
  armbågen).
- **Full upplösning:** rutorna ut med ffmpeg (PNG, eller JPEG `-q:v 2`); varje påstående om kortet, fingrarna,
  vändningen och de första och sista 15 rutorna bygger på dem. Skript i filer, aldrig `node -e`; högst två ffmpeg.
- **Mått:** efterarbetets `after.json`, och skakighet, ryck, ansikte och händer per ruta ur domarens underlag.

## Rapporten

Märk varje påstående [M] mätt eller [S] sett. Först **domen** på en rad: användbar som huvudtagning, med anmärkningar,
möjlig variant (som vad) eller inte användbar, plus "lagbar" om allt som fäller är lagbart, och förslaget med studions
ord Godkänn, Variant eller Underkänn. Sedan i ordning: **skarvarna** (ruta 0 och 3 mot första bilden, sista rutan och
antal−3 mot sista bilden; ljusare eller mörkare); **kortet ruta för ruta** (när det lämnar skon, greppet, landningen,
tryck eller ljus kant, blek yta, ett andra kort; ett kort som rör sig på bordet utan finger fäller); **storleken** (inom
±10 % av medianen från skon till bordet; det landade mot kortet i sista bilden och dockans i sista rutan, sidor och yta
inom ±10 %, mittpunkten i bildpunkter); **vändningen** (handleden eller fingrarna, handen kvar vriden, kanten, minst en
kantruta, anatomin); **fingrarna**; **handens väg** (stopp, höjd); **frysta rutor**, bildfrekvens och takten mot
dockans; **det gröna** (hörnet x 20–260, y 20–260 över filmen); **allt annat** (ansikte, blick, andra handen, skon, hur
levande dealern är). Tur och retur: ange delningsrutan, där fingrarna lämnar kortet. Vila: ruta 3 och antal−4 mot
ankaret. Flera tagningar: rangordna dem. Sist en tabell och poängraden "given 3/5, returen 1/5".

## Fellistan

Varje fel med rutor och plats, LAGBART eller INTE. Lagbart med `node tools/film-fix.ts <film> fixes.json`, till exempel
`[{"op": "trim", "end": 2, "why": "WAN 3 mörknar i sina två sista rutor"}]`: `trim` och `hold` högst 3 rutor, `blend`
högst 4, `patch` högst 2 % av bilden, `key`, `level` och `plate` (en vilofilms skärm); gränserna står i `LIMITS` i
`src/film-fix.ts`, och en lista över dem vägras hel. En enda felritad ruta i en film som läggs på vårt bord hålls med
rutan före (`lagg-pa-bord.ts --hall`), och takten lagas med `standarddocka/verktyg/i-dockans-takt.ts`. Inte lagbart: en
hands eller kropps rörelse, ett kort som byter storlek, färgbyte utan vändning, fingrar genom kortet, fel plats,
ansiktet som glider. Domen gäller filmen som den levererades; en lagad kopia (`fixed-<k>.mp4` bredvid originalet, som
aldrig ändras) är en egen film och granskas på nytt.

## Föra in

- Granskarens dom på en order: `node tools/order-put.ts review <id> <n> --note "<domen på en rad>"`; på ett prov: i
  provets `proof.json` som skillen `doma` säger. Det han ska se läggs fram enligt skillen `visa-for-jakob`.
- Klippbanken är tom (`data/dealers.json` har ingen dealer). När den har en: mått med `track-card.ts` och
  `flip-axis.ts`, en lagad kopia in med `register-order.ts <id> <n> --fixed <k>`, och en preliminär dom med
  `review-put.ts`, bara av huvudagenten där Jakob uttryckligen har lämnat över domen; Primär väljer bara han.
