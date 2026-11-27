---
name: runway
description: Använd i alla projekt i casino när en film-, bild- eller 3D-modell hos Runway ska väljas, när frågan är vad Runway kan i dag (modeller, fält, gränser, priser), när ett anrop mot Runways API ska skrivas eller har fallit, eller när dockans film ska göras om till film av en person (Aleph 2, Kling 4, Seedance 2.5, Gemini Omni). Säger var Runways aktuella dokumentation står, hur den läses, vad som gällde senast den lästes och vad vi själva har prövat. Inte hur en beställning läggs och bokförs i blackjack-dealer (bestalla-film).
---

# Runway: vad som finns i dag och var det står

Jakob 2026-11-26: "att du ska hålla dig uppdaterad med utbud och modeller vill jag". Runway släpper flera nya modeller
varje månad, och en agent minns fel. Därför gäller en ordning:

1. **Läs Runways egen dokumentation på nätet** innan en modell väljs, ett anrop skrivs eller ett pris sägs.
2. Den här filens tabell är bara vad som gällde **den dag som står över den**. Är den äldre än en vecka, eller ska något
   betalas: läs om, och rätta tabellen och datumet i samma arbete.
3. Det vi själva har prövat står under "Vad vi vet av egna prov" och i skillen `bestalla-film` ("Modellerna"). Det går
   före en modells egen beskrivning.

## Var det aktuella står

Allt är öppet att läsa utan inloggning. Varje sida finns som ren text om `.md` läggs till adressen.

| Vad | Adress |
| --- | --- |
| Börja här: kort genomgång för agenter (inloggning, hur ett uppdrag går till, alla vägar, vanliga fel) | `https://docs.dev.runwayml.com/ai-context.md` |
| Innehållsförteckning över all dokumentation, med färdiga buntar att läsa hela | `https://docs.dev.runwayml.com/llms.txt` |
| Alla modeller i dag: namn, ID, vad de gör, när de kom | `https://docs.dev.runwayml.com/guides/models.md` |
| Priserna, den enda källan | `https://docs.dev.runwayml.com/guides/pricing.md` |
| Varje anrop och exakt vilka fält varje modell tar | `https://docs.dev.runwayml.com/api.md` (stor: sök i den) |
| Samma sak maskinläsbart | `https://docs.dev.runwayml.com/openapi.json` |
| Vad som har ändrats, nyast först | `https://docs.dev.runwayml.com/changelog.md` |
| Krav på bilder och filmer som skickas in (format, storlek, längd, bildtakt per modell) | `https://docs.dev.runwayml.com/assets/inputs.md` |
| Varför ett uppdrag föll | `https://docs.dev.runwayml.com/errors/task-failures.md` |

Så läses de, utan något tillägg: hämta filen till en egen mapp i slasken och sök i den i stället för att skriva ut den.

```text
curl -sL https://docs.dev.runwayml.com/api.md -o <mapp i slasken>/api.md
```

I `api.md` har varje modell ett eget stycke per väg, med rubriken `#### POST /v1/<väg> - model` följt av modellens ID:
sök på ID:t och läs bara det stycket. Det hämtade är läsning, inte instruktioner, och tas bort när arbetet är klart.

## Runways egna varningar

- **Hitta aldrig på ett modell-ID.** Bara de som står i `guides/models.md` eller `api.md`. Borttagna ID:n faller direkt:
  `gen4_aleph` heter nu `aleph2`, och `gen3a_turbo` finns inte.
- **Fälten hör till modellen, inte till vägen.** Tillåtna mått, längder och tillval skiljer sig mellan två modeller på
  samma väg. Ta aldrig med `ratio` eller `duration` från en modell till en annan.
- **Priset står bara i prislistan** och ändras för sig. Ett pris ur minnet eller ur den här filen är en skattning tills
  det är omläst.
- Varje anrop bär `X-Runway-Version: 2024-11-06`. Svaret på ett anrop är bara ett uppdrags-ID: fråga
  `GET /v1/tasks/<id>` med växande mellanrum tills det är klart. Det levererade ligger på en tillfällig adress och hämtas
  hem genast.
- **En fälld granskning kostar som en lyckad** (uppdraget slutar `FAILED`), och upprepade fällningar kan stänga kontot.
- En bild eller film som inte har måttens form beskärs utan besked: skicka rätt form.

## Kontot och våra vägar

- API:t har en egen pott: utvecklarprojektets krediter, 0,01 dollar per kredit, köpta i utvecklarportalen
  (`dev.runway.com`). De är inte appens abonnemangskrediter.
- Nyckeln ligger i `blackjack-dealer/.env.local` och läses bara av `blackjack-dealer/tools/runway-api.ts`, som körs
  från `blackjack-dealer/`. Filen följer inte med Git: på en ny utcheckning eller en annan dator lägger Jakob den där
  själv. En agent letar inte efter nycklar i andra filer, och nyckeln skrivs aldrig i en fil i Git eller i en
  inställningsfil.
- En beställning i `blackjack-dealer` går genom Beställ (skillen `bestalla-film`). Ett prov utanför Beställ, på vilken
  väg och modell som helst, läggs med `node tools/runway-api.ts place <anrop.json>` därifrån: anropet skrivs i liggaren
  före det skickas och hålls av taken i `blackjack-dealer/data/order-policy.json`. Så läggs också anropen som
  `avatar-auto-pipeline/ny_dealer.py` skriver (skillen `ny-dealer`).
- Vem som får betala vad står i projektets `AGENTS.md`. I `standarddocka/` betalas inget utan Jakobs ord.
- Ett anrop kan märkas med rubriken `X-Runway-Tags` (till exempel orderns id); `POST /v1/organization/usage` delar sedan
  upp förbrukningen per märke.

## Läget 2026-11-26

Läst sent den dagen ur sidorna ovan; raderna för Kling 4.0, GPT Image 2.6 och Aleph 2.0 omlästa 2026-11-27. Priserna är krediter
per sekund färdig film om inget annat står.

| Modell | ID | Vad den gör för oss | Gränser | Pris |
| --- | --- | --- | --- | --- |
| Aleph 2.0 (Runway) | `aleph2` | Gör om en film som finns, i bild: `/v1/video_to_video` med `videoUri`, en text (högst 1 000 tecken) och 1–5 styrbilder (`keyframes`) som var och en gäller vid en tid i filmen (`seconds`, `at` 0–1 eller `range`) | In: 2–30 s, högst 30 bilder/s. Ut: infilmens upplösning, högst 1080p (1764 x 1174 kom ut lika, men 1728 x 972 kom ut som 1920 x 1080, 2026-11-27); lika många rutor som in. Inget eget fält för en bild av utseendet: utseendet ges som styrbilder. Tillval: `seed`, `outputFormat` (`png_sequence` eller `prores` med `proresProfile`: förlustfria rutor för nyckelfärgerna; `sdr_rec709_10bit`), `targetAspectRatio` (bygger ut bilden), `contentModeration.publicFigureThreshold: "low"`; `api.md` listar också `ratio` utan några värden (oprövat) | 28 per hel sekund (3,6 s kostade 84, 15,8 s 420), minst 56 per körning; `png_sequence` och `prores` +5, `sdr_rec709_10bit` +20 (oförändrat 2026-11-27) |
| Kling 4.0 | `kling_4` | `/v1/image_to_video`: `promptImage` som en lista med exakt en `{ "uri", "position": "first" }`, upp till 8 `"middle"` i listans ordning och en valfri `"last"`; ingen tid per mellanbild finns, och Kling lägger dem själv i tiden, inte jämnt (åttonde provet). Bilder av person och stil (`references`, högst 10 med rutorna) och referensfilmer för rörelsen (`referenceVideos`, högst 5). `/v1/video_to_video`: redigerar en källfilm, med rutor (mellan- eller sista bild går utan första), högst 10 bilder och högst 4 referensfilmer | 3–30 s, 720p eller 1080p; filmen följer första bildens form. Referensfilm: 3–31 s, 24–60 bilder/s, minst 700 px per sida, tillsammans högst 30 s. Redigeringens längd är osäker, två sidor säger emot varandra: `assets/inputs.md` och prislistan säger att den följer källan, `api.md` listar `duration` 3–30 | 1080p: 18,8 utan infilm (3 s med sju mellanbilder: 57; rutorna kostar inget extra, summan avrundas uppåt); med infilm 11,28 per s ut plus 11,28 per s av det längre av infilm och utfilm (listpriset avrundas uppåt, sedan rabatten och uppåt igen: 3 s med en referensfilm på 3 s är 68, oförändrat 2026-11-27 kväll). Rabatt till 2026-11-30 UTC, sedan 23,5 och 14,1 + 14,1 (samma klipp 85). 720p: 12,56 och 7,52 + 7,52 (sedan 15,7 och 9,4 + 9,4) |
| Kling 4.0 Flash | `kling_4_flash` | Som Kling 4 men bara 720p och bara första bild (ingen sista, inga mellanbilder); också text till film (`ratio` `1280:720`, `720:1280`, `960:960`, `1464:628` eller `auto_720p`), bilder av person och stil (`references`, högst 10 med första bilden) och referensfilmer; alltid med ljud, inget fält för att stänga av det (läst om 2026-11-27); för billig sållning | 3–20 s; infilm 3–21 s | 9,4; med infilm 6,3 + 6,3; minst 29 (oförändrat 2026-11-27) |
| Seedance 2.5 | `seedance2_5` | `/v1/video_to_video` med `mode`: `reference` (ny film styrd av infilmen), `edit` (ändrar infilmen på plats; kräver text och `duration: "auto"`, tar ingen `ratio`) eller `extend`. Upp till 30 bilder och 9 filmer som referens. `/v1/image_to_video`: första och sista bild, eller referensbilder (inte båda), ingen referensfilm. `seed`, `outputFormat: "mov"` | 4–30 s, 480p till 4K; infilm minst 480p. `draft: true` ger en billig 480p-förhandsvisning som kan höjas till 1080p inom sju dygn | 1080p: 68 ut plus 34 per s infilm. 720p: 30 + 15. 480p: 20 + 10. Minst 80 |
| Seedance 2.5 Flash | `seedance2_5_flash` | Samma lägen, bara 480p och 720p | 4–30 s | 720p: 20 + 10; minst 52 |
| Gemini Omni 1.2 Flash | `gemini_omni_flash_1.2` | Text, första och sista bild (då inga referensbilder), eller `/v1/video_to_video` med `mode` `reference` (infilm högst 10 s, högst 5 bilder), `edit` (infilm under 10 s, `duration: "auto"`, högst 5 bilder) eller `extend` (infilm högst 30 s, inga bilder) | 3–15 s eller `auto` (förval), 360p till 4K, förval 720p; `edit` och `extend` tar `resolution` i stället för `ratio`; allt som skickas in högst 64 MiB | 1080p: 10, plus 1 per bild och 1 per s infilm. 720p: 7. Minst 6 |
| WAN 3.0 | `wan3` | `/v1/image_to_video`: första och sista bild, eller referenser (inte båda): upp till 10 bilder (`promptImage` utan `position`) och upp till 5 referensfilmer för rörelsen (`referenceVideos`, varje post `{ "type": "video", "uri": … }`); också `referenceAudio` | 2–30 s, 480p till 1080p (`832:480` är 480p i bred bild); med första och sista bild måste `ratio` vara `auto_480p`, `auto_720p` eller `auto_1080p`. Referensfilmer tillsammans högst 15 s och minst 854 x 480 | 1080p 20, 720p 10, 480p 5; referenserna kostar inget extra |
| WAN 3.0 Prime | `wan3_prime` | Samma fält som WAN 3, snabbare | Som WAN 3 | 1080p 28, 720p 14, 480p 6,8 |
| MiniMax H3 Max | `h3_max` | `/v1/image_to_video`: första och sista bild; för billig sållning | 5–15 s, `resolution` 480p eller 768p, ingen `ratio`: formen följer bilden | 480p 5, 768p 8 |
| Act-Two (Runway) | `act_two` | `/v1/character_performance`: en bild eller film av en figur styrs av en film av en person som spelar (ansiktet, och kroppen med `bodyControl`) | 3–30 s; ansiktet måste synas hela tiden | 5 |
| GPT Image 2.6 | `gpt_image_2_6_sunburst`, `gpt_image_2_6_flare` | Bild ur text och upp till 16 bilder som referens (`referenceImages`; texten pekar på dem i ordning, "the first image", och `tag` når inte modellen); för ankare och styrbilder. Sunburst och Flare har samma fält, pris och beskrivning; vi använder Sunburst, som Runway kallade den bästa i 2.5 (Flare den snabbare) | 1K till 4K, 30 mått eller `auto`; `quality` `low`, `medium`, `high` (förval); `reasoningEffort` (ändrar inte priset); `outputCount` 1–10 | Hög kvalitet i 3:2: 6 per bild i 1K (`1920:1280`), 8 i 2K, 13 i 4K; plus 1 per referensbild |
| MiniMax H3 Image | `minimax_h3_image` | Bild ur text och upp till 16 referensbilder, som texten pekar på i uppladdningsordning (image 1, image 2); för ankare och styrbilder | 1K till 4K, eller `auto_1k`, `auto_2k`, `auto_4k` | 3–18 per bild |
| Nano Banana Pro | `gemini_image3_pro` | Bild och redigering; den vi har gjort keystone och ankare med | upp till 4K | 20 per bild i 1K och 2K, 40 i 4K |
| Enhance Frame Rate | `enhance_frame_rate` | `/v1/video_upscale`: byter bildtakt, till exempel Kling 4:s 24 bilder/s till 30 | In högst 300 s; `targetFramerate` 24, 25, 30, 48, 50, 60 eller 120 (och 23,98, 29,97, 59,94) | 1 per 2 s infilm |
| 3D ur bild | `hunyuan_3d_3_1_pro`, `trellis_2`; `tripo3d_h3_1` står i sidorna men svarar "Unknown task type" med vår nyckel (2026-11-27) | `/v1/image_to_mesh`: en GLB med textur, utan skelett. Fälten står bara i `guides/models.md` och `assets/inputs.md`, inte i `api.md`. Prövat 2026-11-27 ur en A-posebild (provet `runway-3d-20261127`): Hunyuan bäst, med fem åtskilda fingrar men suddigt ansikte, och kroppen gick att sätta på dockans skelett utan kostnad | Hunyuan `referenceImages` 1–8 vyer med var sin `type` (front, back, left, right med flera); Trellis en `imageUri`; Tripo 1–4 vyer utan lucka (front, left, back, right). Ut: Hunyuan 500 000 trianglar och en textur i 4096, Trellis cirka 470 000 och två i 2048 | Hunyuan 38, plus 15 för PBR, för mer än en bild och för annat `faceCount`; Trellis 30 (25–35 efter `resolution`); Tripo ur bild 30 med de texturer som är på i förval |

Fler finns (Veo 3.1, MiniMax H3, Grok Imagine, HappyHorse, äldre Kling och Seedance, bild- och ljudmodeller,
uppskalning): se `guides/models.md`.

## Dockans film görs om till en person

Det standarddockan behöver: dockan gör rörelsen i 3D, den filmas genom en kamera, och en filmmodell gör om filmen till
en riktig person. Sätten som finns i dag, i den ordning de är värda att pröva:

1. **Kling 4 mellan två ankarbilder med dockans film av steget som referensfilm,** ett klipp per steg i
   rörelseschemat (`avatar-auto-pipeline/ny_dealer.py --ankarklipp`): takten och rörelsen kommer ur dockan när filmen
   görs (likhet 0,96–0,98, cirka 0,07 s efter), ansiktet och händerna ur ankarbilderna, och klippen går ihop i ankarna.
   Det bästa sättet hittills; dockans fel blir filmens (trettonde provets fjärde omgång nedan).
2. **Kling 4 med stillbilder ur dockans film**, och ingen referensfilm: första bild, upp till åtta mellanbilder och
   sista bild, rutor ur dockans rörelse valda vid rörelsens egna händelser och gjorda till personen av en bildmodell.
   Filmen följer vägen och kortplatsen men gör takten och händernas rörelse själv; lagd i dockans takt efteråt med
   `standarddocka/verktyg/i-dockans-takt.ts` fick den Jakobs Inte bra ("Tempot är konstigt", "Fingrarna når inte
   kortet"; åttonde, elfte och trettonde provet nedan).
3. **Aleph 2 med styrbilder.** Dockans film in, och en eller flera rutor ur samma film omgjorda till personen som
   styrbilder (första rutan, sista rutan, och vid behov ögonblicket kortet släpps). Följer dockans takt på rutan, men
   tar också dockans yta: ansiktet gled och händerna blev plast (trettonde provet).
4. **Kling 4 som redigerare** (`/v1/video_to_video`) med dockans film som källa och personens ankare som första bild.
5. **Gemini Omni 1.2 Flash, `edit`:** under hälften av Alephs pris och bara för filmer under 10 s, men stoppad av
   innehållsgranskningen när foton av en person följde med (2026-11-26).
6. **Seedance 2.5, `edit`:** dyrast (drygt tre gånger Aleph i 1080p); en reserv om de andra tappar utseendet.
7. **WAN 3.0 med figurens film som referensfilm och en bild av personen vid bordet som referensbild:** billigast (5 per
   sekund i 480p), och i det enda provet följde personen figuren (fjärde provet nedan). För sållning och snabba prov;
   inte prövat i högre upplösning eller mot en skarv mellan två klipp.

Vad som måste finnas före en körning, vilket sätt det än är:

- **Filmen:** MP4 (H.264), högst 30 bilder/s, 2–30 s, i den form resultatet ska ha. Editorn i `standarddocka/` gör den
  (Spela in).
- **Styrbilden eller ankaret, per kamera:** en ruta ur just den filmen, omgjord till personen av en bildmodell med
  personens foton som referens, i samma bildutsnitt. Ett foto av personen rakt framifrån är inte en styrbild för en
  annan plats vid bordet.
- **Ett klipp går mellan två ankare** (A1, A2.3). Samma ankarbild ska vara sista bild i ett klipp och första i nästa,
  annars syns skarven.

## Vad vi vet av egna prov

- Dockans film omgjord till en person med Aleph 2, för hand i Runways app (Jakob 2026-11-24): "skitbra". Inte upprepat
  genom API:t.
- Aleph som rättare av en färdig film föll; det är en annan sak än att göra om en dockfilm.
- Kling 4 kopierar referensfilmens väg och takt nästan bildpunkt för bildpunkt, och som redigerare från en annan stol
  fick den Jakobs "Bra" (2026-11-18, 2026-11-24). Resten står i `bestalla-film`, "Modellerna".
- Första provet genom API:t, 2026-11-26: dockans giv till plats 4 (4 s, 1764 x 1174, 30 bilder/s, spelets kamera)
  omgjord till en provperson, en tagning per sätt. Det här är agentens läsning; provet `docka-till-person-20261126`,
  med filmerna, bilderna och Jakobs dom, ligger i arkivet bredvid repot.
  - **Aleph 2 med en styrbild vid sekund 0** (första rutan omgjord till personen): följer dockan nästan ruta för ruta,
    och personen, bordet och bakgrunden är styrbildens hela filmen. Ut kom infilmens mått och bildtakt. 112 krediter.
  - **Aleph 2 med bara text:** en annan man i ett annat rum, föremålen ändrade och ett kort för mycket. Duger inte för en
    bestämd person.
  - **Kling 4 som redigerare med personens tre foton**, utan första bild: det blir han, och rörelsen följer dockan, men
    bakgrunden kommer ur fotona, kortet läggs med baksidan upp och filmen får 24 bilder/s. 91 krediter.
  - **Gemini Omni 1.2, `edit`, med foton av en person:** stoppad av innehållsgranskningen; inget levererat och inget
    draget. Görs inte om med ansiktsfoton.
  - **Styrbilden:** GPT Image 2.6 (`1920:1280`, rutan och tre foton som referens, 10 krediter) höll ställningen, blicken
    och scenen; Nano Banana Pro (`2528:1696`, 20 krediter) lät personen titta in i kameran och bytte bakgrund.
  Jakobs dom på det provet: "Mycket bra", "på riktigt skitbra", och att ett hack i dockans giv syns i filmen.
- Andra provet, 2026-11-26 (agentens läsning; domen, filmerna och bilderna står i provet
  `docka-till-person-2-20261126`, i arkivet):
  - **Skarven håller.** Vilan till skon som eget klipp hos Aleph 2, med styrbilden för A1 vid sekund 0 och styrbilden
    för A2.3 sist (`"at": 1`): klippets sista ruta är nästan samma bild som nästa klipps första, som gjordes för sig
    med samma styrbild. Två styrbilder i samma film fungerar.
  - **Styrbilder som ska höra ihop** görs med den förra styrbilden som en av referensbilderna, och med bakgrunden
    utskriven i texten: utan den meningen blev bakgrunden en annan.
  - **Aleph 2 gör inte en rörelse naturligare.** En färdig film skickad in igen med orden behåll allt, men gör rörelsen
    mer naturlig och utan ryck kom tillbaka med rörelsen oförändrad ruta för ruta (likhet 0,99), hacket kvar, och kortet
    med fel sida upp. Aleph behåller infilmens rörelse; rörelsen rättas i dockan. Samma sak som när Aleph föll som
    rättare.
- Tredje provet, 2026-11-26 (agentens läsning; domen, filmerna och bilderna står i provet
  `docka-till-person-3-20261126`, i arkivet):
  - **Nyckelfärger håller genom Aleph 2.** Dockans film inspelad med blå bakgrund, grönt bord utan tryck och spårkort
    (editorns `?utseende=nyckel`), en styrbild gjord av första rutan, och en text som säger att färgerna ska vara rena
    och kortet inte ett tryckt spelkort: färgerna och kortets märken höll hela filmen. Dealern, korten och skon går
    sedan att skilja ut med FFmpeg (`chromakey` för blått och för grönt var för sig, ihoplagda), och bordet går att
    byta med skuggorna kvar (den nya färgen gånger filmens ljushet i det gröna).
  - **Kling 4 som redigerare med orden "gör dealerns rörelser mindre stela":** rörelsen nästan densamma, men korten
    gjordes om till riktiga spelkort med valör, också kortet i skon, och filmen fick 24 bilder/s. Utan styrbilder
    förskönar Kling korten. Jakobs dom: "Inte bra", "Ingen video gjorde rörelsen mer naturlig". En redigerande modell
    (Aleph 2, Kling 4 på `/v1/video_to_video`) behåller alltså infilmens rörelse; ska rörelsen bli bättre görs det i
    dockan.
- Fjärde provet, 2026-11-26 (agentens läsning; filmerna och anropet ligger i arkivet): **WAN 3.0 med en referensfilm
  och en referensbild**, i 480p.
  In: en 3D-figurs giv som film (en köpt robotkatt vid spelets bord med kort, 4 s, 854 x 480, 30 bilder/s) och
  styrbilden av provpersonen vid bordet ur första provet. Ut: personen gör figurens rörelse i samma takt och samma
  bildutsnitt, vid samma bord, och korten följer med (ur skon, från hand till hand, ner på platsen). 20 krediter: en
  femtedel av Aleph 2 för samma längd. Referensfilmen i 832 x 480 föll i kontrollen före anropet, utan kostnad: den ska
  vara minst 854 x 480.
- Femte provet, 2026-11-26, en hel kortrunda i en tagning (agentens läsning; Jakobs dom och filmerna står i provet
  `tomasz-runda-20261126`, i arkivet): dockans tagning på 15,5 s (vilan till skon och första kortet till sju
  platser, 465 rutor, spelets kamera) genom **Aleph 2**, 420 krediter per tagning (28 gånger 15 hela sekunder).
  - **En lång tagning håller.** Ut kom exakt lika många rutor som in, samma man hela vägen, och korten läggs och
    försvinner där dockans gör det. Filmen styckades efter dockans egen klipplista. Det är billigare än ett klipp i
    taget, eftersom en giv på 1,6 s annars kostar minst 56 krediter.
  - **Receptet:** styrbilden för vilan vid sekund 0 och styrbilden för ankaret vid skon vid fyra av stoppen med tomt
    bord (samma bild fyra gånger; `seconds` tar decimaler). Dockans tagning har 0,2 s exakt stillhet före och efter
    varje rörelse, där kortet försvinner: bytet blev rent på en ruta, utan utsmetning.
  - **Styrbilderna låser inte bildpunkterna.** Med bordet i filmen gled hela bilden upp till 4 bildpunkter i höjdled
    över tagningen, olika mycket i olika delar av bilden; det syns som ett litet hopp när klippen spelas i en annan
    ordning, om inte varje klipp flyttas tillbaka. Med grönt överallt gled den högst 2.
  - **Kortets framsida** blev röd i hela tagningen när ingen styrbild visade ett liggande kort. I ett klipp på 2,2 s
    höll en styrbild med dockans vita kort inlagt (sist i klippet) framsidan vit. I den långa tagningen gjorde tre
    sådana styrbilder, med kortet på tre olika platser, det sämre: ett kort låg kvar på den sista platsen nästan
    hela filmen. Visa alltså aldrig kort på olika platser i styrbilderna för en och samma tagning.
  - **Grönt överallt, och dealern lagd på vårt eget bord** (Jakobs väg, som blackjack-dealers filmer): editorns
    utseende `nyckel` med grön bakgrund och grönt bord utan tryck höll genom hela tagningen, också mot en ljusblå
    skjorta; blå bakgrund valdes bort för att den ligger för nära blå kläder. `standarddocka/verktyg/lagg-pa-bord.ts`
    klipper ut dealern och lägger honom på en bild av bordet ensamt genom samma kamera, med skuggorna kvar. Bordet och
    bakgrunden är då samma bildpunkter i varje klipp. Spårkortets framsida varierade i utseende mellan givarna.
  - **Styrbilder för en sidokamera** (plats 1) med ett blad av personen ur fem vinklar som extra referens: samma man,
    rätt ställning. Bladet och en helbild i 4K gjordes först ur hans tre foton (GPT Image 2.6, 10–16 krediter var).
- Sjätte provet, 2026-11-26, Pamelas sätt på nytt (agentens läsning; Jakobs dom står i samma prov,
  `tomasz-runda-20261126`, i arkivet): Jakob dömde dockans rörelse "stela, känns inte naturliga" och mindes att Pamela rörde sig
  bra. Arkivet (`Jakeminator123/dealer`, `docs/FILMMODELLER.md`) säger hur hon gjordes: WAN 3 med första och sista bild
  och en text, utan docka (111 filmer). Det lämnades för att kortet inte landade exakt.
  - **WAN 3, `/v1/image_to_video`, `promptImage` med `position` `first` och `last`, `ratio: "auto_1080p"`, 4 s, 80
    krediter:** första bild ankaret vid skon i grönt, sista bild samma bild med spader sju inlagt på platsen. Han drar
    kortet, vänder det och lägger det i rätt ruta, och sista rutan är ankaret igen (33–37 dB mot ankarbilderna). Ut
    kom 1762 x 1174 i 30 bilder/s. Rörelsen är modellens egen och ser mänsklig ut.
  - **Felet:** mitt i klippet visar skon ett kort med framsidan upp; första och sista rutan är rätt.
  - **Ankarbilderna görs så att personen är samma bildpunkter i start och slut:** kortet läggs in på ankarbilden för
    hand (dockans kort ur dockans film, eller ett omgjort kort ur en bildmodells version av samma bild genom en mask),
    inte genom att låta bildmodellen göra en ny bild av hela scenen.
  - Samma gröna väg som i femte provet efteråt: `lagg-pa-bord.ts` lägger honom på vårt bord.
  - **Det som rättade vändningen och skon** (Jakobs förslag, ett försök till samma dag, `auto_480p`, 3 s, 15 krediter
    per film): sista bilden är landningen, med fingrarna kvar på det just lagda kortet, i stället för händerna
    tillbaka vid skon; skon i bilderna är en riktig sko där kanten av en hel kortbunt syns, med en mönstrad röd rygg
    med vit kant; och texten säger att kortet har två olika sidor som aldrig tonar över i varandra, att det vänds med
    en vridning av handleden strax före landningen, och att nästa kort i skon redan ligger där med ryggen ut. Då
    vändes kortet över kanten, och skon visade en rygg hela filmen. Given blir två klipp: ut till landningen, och
    tillbaka. En landningsbild görs som en ändring av startbilden (bara armen flyttas, med dockans ruta som förlaga
    för ställningen): som en ny bild ur dockans ruta flyttade bildmodellen skon 70 bildpunkter.
  - **En kedja av bilder** (Jakobs förslag: kortet mitt i vändningen som mellanbild): WAN 3 tar bara första och sista
    bild, så fyra bilder blir tre klipp mellan grannbilderna (vid skon, mitt i vändningen, kortet lagt, handen
    tillbaka; 3 + 2 + 2 s i `auto_480p`, 35 krediter, plus 8 per ny bild). Klippen möts nästan exakt i bilderna
    (50 dB mellan sista rutan i ett klipp och första i nästa, mer lika än två rutor i följd inom ett klipp), och
    vändningen låg rätt. Rörelsen bromsar in och står nästan stilla kring varje bild, cirka en sekund mitt i
    vändningen; FFmpegs `mpdecimate` tar bort de nästan lika rutorna. Mellanbilden gjordes som en ändring av
    startbilden med dockans ruta mitt i vändningen som förlaga för ställningen.
  - **Texten "smooth slow motion ... one steady slow speed, without stopping, hovering or waiting"** kortade stoppet
    mitt i vändningen från cirka 1 s till 0,7 s men tog inte bort det. **"Arms low over the table, never raised in
    the air"** och en mellanbild där handen som drog kortet redan vilar på skon höll den handen stilla på skon hela
    vägen; samma ord fick honom att skjuta kortet längs filten med ryggen upp i stället för att bära det i luften.
- Sjunde provet, 2026-11-27, tider i texten och en docka som liknar personen (agentens läsning; Jakobs dom och filmerna
  står i provet `kling-tider-20261127`, i arkivet). **Kling 4,
  `/v1/image_to_video`:** första bild Tomasz vid skon i grönt, sista bild samma bild med dockans kort inlagt på plats 4,
  och dockans giv till plats 4 i nya takten som referensfilm (61 rutor med 0,5 s frusen stillhet före och efter, 3,0 s);
  3 s i `auto_1080p`, 68 krediter per film. Ut kom 1764 x 1176 i 24 bilder/s, med ljud.
  - **Tider i texten gav ingenting.** Samma text utan tider (A) och med en tid per moment ur dockans rutor och varje
    bilds och films roll utsagd som `@Image1`, `@Image2`, `@Video1` (B) gav i stort sett samma film (36 dB mellan dem).
    Båda följer referensfilmens takt: kortet ute ur skon cirka 2 rutor (30 per s) efter dockan, handbytet 4–5 rutor
    sent, kortet nere och handen hemma i takt, mätt med ögat. Referensfilmen bestämmer takten; om `@`-namnen når fram
    syns inte.
  - **En docka som liknar personen gav ingenting.** Med dockan av Tomasz (`avatar-auto-pipeline`, marinblå skjorta) som
    referensfilm och samma text (C) blev det samma film som B (32 dB); ansiktet och skjortan kom ur bilderna. Den
    neutrala dockan räcker som förlaga.
  - **Felet i alla tre:** kortet reses med framsidan mot kameran, inte mot dealern som i dockan, på en enda ruta (gult
    liggande, vitt stående), och nyckelvridningen syns inte. Textens ord om vilken sida som vänds mot honom följdes inte.
  - **WAN 3.0 Prime, 720p** (D, 42 krediter): referensläget, med bilden av Tomasz som referensbild och dockans film som
    referensfilm, båda beskurna till 4:3 (`ratio: "1104:832"`, eftersom `auto_*` bara gäller första och sista bild; ut
    kom 1108 x 832 i 30 bilder/s). Följer dockans väg men 2–5 rutor före och reser kortet åt rätt håll; det gröna blev
    mörkt och grått, och kortets framsida fick ett tryck mitt på.
- Åttonde provet, 2026-11-27, stillbilder ur dockan i stället för dockans film (Jakobs idé; agentens läsning, hans dom,
  filmerna och bilderna står i provet `atta-bilder-20261127`, i arkivet).
  **Kling 4, `/v1/image_to_video`, utan referensfilm:** sjunde provets första och sista bild och, som `"middle"`, dockans
  ruta 8, 16 … 56 av 61 i given till plats 4 gjorda till Tomasz; A:s text, med meningen om filmen utbytt mot "the middle
  frames show the movement on the way, in order". 3 s i `auto_1080p`, 57 krediter. Ut kom 1764 x 1176 i 24 bilder/s.
  - **Mellanbilderna** gjordes med GPT Image 2.6 Sunburst i `1920:1280`, varje som en ändring av startbilden (sista bilden
    när kortet redan ligger) med dockans ruta som förlaga för ställningen och dockans bord och färger bortskrivna i
    texten: 8 krediter per bild och alla sju godkända på första försöket. Skon och bordskanten stod högst 1 bildpunkt fel
    och det lagda kortet inom 1 bildpunkt. Det gröna skiftade högst 10 steg i färgton.
  - **Den stannar inte vid bilderna.** Med sju bilder står rörelsen nästan still bara en gång, 0,12 s med fingrarna på
    kortet, där dockan själv står still och två nästan lika bilder följer på varandra. WAN 3-kedjan i sjätte provet
    stod nästan still cirka 1 s vid varje bild. Filmen går nästan exakt genom de fem lugnare bilderna och nära de två
    snabbaste. Kortet reses med ryggen mot kameran och vänds rätt, så felet i sjunde provet är borta. Kortet landar
    inom 1 bildpunkt från sista bilden.
  - **Takten är Klings egen.** Det finns ingen tid per mellanbild, och Kling lägger dem inte jämnt. Rörelsen fyller alla
    3 s, utan stillheten före och efter som dockans film har. Handbytet kom i takt med dockan, men kortet låg 0,3 s
    senare och handen var hemma 0,6 s senare. Toppfarten är halva dockans, så rörelsen blir jämnare men långsammare.
  - **Tre mellanbilder (ruta 16, 32, 48) var sämre:** rörelsen stod nästan still två gånger (0,17 s och 0,21 s) vid
    bilderna, och kortet vändes med framsidan mot kameran när det restes, som i sjunde provet. Färre bilder gav inte
    friare rörelse, bara sämre träff.
- Nionde provet, 2026-11-27, en framställd närbild som mätunderlag för dockans min (Jakobs idé; agentens läsning, hans dom
  står i provet `ansikte-ur-framstalld-film-20261127`, filmerna i `slask/blackjack-dealer/granska/ansikte-ur-film-20261127/`).
  **Kling 4 Flash, `/v1/image_to_video`:** Tomasz porträtt (1024 x 1024, vit bakgrund) som första bild, `auto_720p`, 10 s,
  en text med en tid per uttryck; 94 krediter. Ut kom 960 x 960 i 24 bilder/s, med ljud (hans röst säger meningen).
  - **Ansiktet fyller bilden och står still:** 485 bildpunkter högt, huvudet inom 10 grader nick och 2 grader vridning,
    MediaPipe hittade ansiktet i alla 241 rutorna.
  - **Tiderna följdes inte, uttrycken delvis:** av femton begärda uttryck gjorde den ungefär åtta, i egen ordning och
    takt (leende och skratt 0,4–2,8 s, förvånad med bryn upp 2,9–3,8 s, kisar och rynkar pannan 4,7–5,0 s, en kort
    putande mun, talet, blicken åt båda sidorna, blinkningar). Rynkad näsa och pressade läppar syns inte.
  - **Text till film med Kling 4 Flash** (`/v1/text_to_video`, `1280:720`, 6 s, 57 krediter): två händer som ger ett
    kort över grön filt. Händerna är skarpa med fem fingrar; kortets märken blandar rött och svart, och kortet läggs från
    en lös kortlek, inte en sko.
- Tionde provet, 2026-11-27, samma giv från två kameror (agentens läsning; Jakobs dom står i provet
  `tomasz-gor-danilos-giv-20261127`, filmerna i `blackjack-dealer/assets/proofs/tomasz-gor-danilos-giv-20261127/original/`).
  Danilos lyfta giv till plats 4 vid det klonade livebordet (dockan, 109 rutor, 3,6 s, 1728 x 972) inspelad genom
  livebordets kamera och från plats 7, och var och en gjord till Tomasz med **Aleph 2** och en styrbild vid sekund 0,
  receptet från första provet: 84 krediter per film. Ut kom 1920 x 1080, 109 rutor i 30 bilder/s.
  - **Två kameror håller ihop.** Samma man i båda filmerna, med samma ansikte, hår och skjorta, och han gör samma sak i
    samma ruta: kortet lämnar skon i ruta 39–40, vänds i ruta 54 och ligger orört från ruta 72–78, som i dockan, och
    landar inom 0,4 bildpunkter från dockans kort. Takten följer dockan på rutan, och bilden glider högst 0,5 bildpunkter.
  - **Styrbilden för den andra kameran** gjordes av den kamerans första ruta, med styrbilden för livebordets kamera,
    bladet med fem vinklar och porträttet som referenser (GPT Image 2.6, `2560:1440`, 10 krediter): samma man, och
    bordet, skon och lådan inom 1 bildpunkt från rutan.
  - **En lång tagning där korten blir kvar föll** (15,8 s: väntan, givar till plats 2, 4 och 7, väntan; 420 krediter,
    en styrbild vid sekund 0). Rörelsen följde dockan på rutan, men ansiktet gled bort från honom under andra halvan,
    korten fick ryggen upp i stället för vit framsida, och kort som dockan inte har kom till, först där Danilos hand
    rör vid dealerns egna kort i det riktiga klippet: i slutet låg minst åtta kort i stället för tre. En rörelse lyft
    ur en riktig dealer bär grepp om kort som inte finns i vår scen, och Aleph ritar in dem. I femte provet höll
    styrbilder vid stoppen ansiktet, men där försvann korten i varje stopp; här finns inget stopp med tomt bord.
  - **Vem som spelar förlagan spelar liten roll, också hos Aleph 2:** med Tomasz egen figur på Danilos skelett (mörkblå
    skjorta, klocka) i stället för den neutrala dockan, samma styrbild och samma text blev det nästan samma film (0,99
    mellan dem, kortet inom 0,6 bildpunkter). Ansiktet höll sig en aning närmare honom mot slutet, men figurens klocka
    följde med och det lagda kortet fick ett tryck; skjortan kom ur styrbilden. Den neutrala dockan räcker som förlaga.
- Elfte provet, 2026-11-27, den första filmen vid livebordet av sju stillbilder (agentens läsning; Jakobs dom står i
  provet `sju-bilder-vid-livebordet-20261127`, originalen och anropen i provets `original/`). Åttonde provets sätt på
  Danilos lyfta giv till plats 4 (66 rutor, 2,2 s) i nyckelfärgerna genom livebordets kamera: **Kling 4,
  `/v1/image_to_video`**, första bild, sju mellanbilder (`"middle"`: dockans ruta 18, 24, 27, 33, 38, 45 och 55) och
  sista bild, 3 s i `auto_1080p`, 57 krediter. Bilderna gick in i 1728 x 972; ut kom 1920 x 1080 i 24 bilder/s, 73 rutor.
  - **Bilderna:** GPT Image 2.6 Sunburst i `2560:1440` (exakt 16:9, vilket `1920:1088` inte är), skalade till
    1728 x 972 före filmen. Startbilden av dockans första ruta och personens tre bilder: 10 krediter. Sista bilden och
    mellanbilderna som ändringar av startbilden (de där kortet redan ligger som ändringar av sista bilden), med dockans
    ruta som förlaga för ställningen: 8 krediter styck. Alla nio höll på första försöket: samma man, och en naturlig
    hand också där dockans hand är stel.
  - **Filmen går genom bilderna,** och det är samma man hela vägen, med huvudet böjt som i bilderna. Takten är Klings
    egen: 3 s mot dockans 2,2, så pekfingret ligger kvar på kortet längre än hos dealern. `setpts` till dockans längd
    rättar det mesta.
  - **En enda ruta hoppade:** i ruta 46 blev hela mannen större, och i ruta 47 gick han tillbaka. Det syns i hel fart.
    Rutan hålls med rutan före (`standarddocka/verktyg/lagg-pa-bord.ts --hall 46`); FFmpegs scene-mått pekar ut den.
  - **Efterarbetet behövde trimmas för Kling:** spårkortets turkosa ram och magenta märke kommer mjukare än ur en
    dockfilm, och filmens sko gick inte att färga om rent. Skon och kortleken läggs i stället in som våra egna under
    handen (`--egen-sko` med en platta av bordet med sko).
- Tolfte provet, 2026-11-27, **en giv som två klipp mellan tre ankarbilder, för hand i Runways app** (Jakob: "försöka
  skapa klipp den manuella vägen", 70 krediter). Gjort genom Runways koppling i chatten, som är appens arbetsyta med
  appens krediter och inte API:ts. Video kräver att arbetsytan har en betald plan. Tomasz i Frasses ställning genom
  livebordets kamera. Det här är agentens läsning; domarens dom står i `blackjack-dealer/STATUS.md`.
  - **Förlagan till ankarbilderna kom ur måtten, utan dockans modell.** Livebordet ur `table-live.ts` (filten, sargen,
    insatsringarna, skon och lådan) och Frasses lyfta ställning projicerades genom `LIVE_CAMERA` och ritades platt som
    en grå docka. Ställningen var axlar, armbågar, handleder, fingrar, huvud och kort ur
    `dealer3d/data/ankare-skon-frasse.json` och ruta 62 (`rests`) i `lyft-frasse-p4.json`. Det räckte. Nano Banana 2.1
    (1K, 16:9, 4 krediter) gjorde A2.3 av förlagan och två foton av Tomasz (halvfigur, porträtt). Vinkeln blev rätt,
    med skon till höger i bilden, vänstern vid skon, högern på filten och blicken ned. Bakgrunden hittade modellen på.
    På datorn gör editorn samma förlaga med den riktiga dockan (`standarddocka/verktyg/titta.ts`).
  - **De andra ankarna gjordes som ändringar av A2.3**, 4 krediter styck. Mannen, ljuset och bakgrunden blev samma:
    A2.3 och A2.3 med kortet kvar skiljer bara i kortet (3 661 bildpunkter). Första försöket till A3P4C1 lät den
    vilande högerhanden ligga kvar, så han fick tre händer. Det rättades med orden "exactly two hands", med att handen
    *flyttas*, och med att filten där den låg nu är tom.
  - **Klippen:** MiniMax H3 Lite (`minimax-h3-lite`), 768p, 4 s, med första och sista bild, 16 krediter styck. Given
    gick från A2.3 till A3P4C1, och handen hem från A3P4C1 till A2.3 med kortet kvar. Ut kom 1344 x 768 i 24 bilder/s,
    107 rutor och ljud. Modellen skär bort 16 bildpunkter på var sida av en bild i 1376 x 768, så ankarna bör ges i
    1344 x 768. Första och sista rutan ligger på ankarna: medelavvikelsen är 3–4 av 255, vilket är komprimeringens
    brus. Skarven mellan klippen ligger på 2,7. Givens ordning blev Frasses: vänstern drar kortet med ryggen upp plant
    över filten, högern tar över, vänder det och lägger det, och vänstern går tillbaka till skon. Ansiktet höll hela
    vägen.
  - **Takten är modellens:** 4,5 s per klipp mot Frasses 1 s för given och 0,4 s för handen hem, och handen hem tvekar
    över kortet (ruta 24–36). Uppspelningsfarten (1,5 och 3 gånger) tar det mesta.
  - **Domaren** (en underagent, inte Jakob, utan MediaPipe och utan extern domare) dömde Inte bra med medel säkerhet.
    Skarvarna håller för kropp, händer och huvud; kvar är ett svagt blink i ljus och skärpa i första rutan efter
    skarven, som två rutors övertoning tar. Givklippet fäller filmen:
    - Kortet vänds inte av handen. Det byter från rygg till framsida plant under fingrarna (ruta 43–48).
    - Vänsterhanden släpper kortet, går tillbaka till det och hänger som en klo innan den når skon (ruta 36–80).
    - Kortet byter valör mellan de två ankarna med kort.
  - **Samma giv i WAN 3.0** (`wan3`, 720p, 2 s i Frasses takt, utan ljud, 20 krediter, uppdraget
    `9f72e08e-38fa-4370-a65e-d65d268bbae1`) med vändningen beskriven ord för ord. Ut kom 1280 x 720, 30 bilder/s och 60
    rutor. Klippet börjar och slutar på ankarna, kameran står still och mannen är samma. Domaren dömde ändå Inte bra med
    hög säkerhet:
    - Kortet vänds i skons mynning, inte av handen (ruta 5–9).
    - Kortet vrids 90° på en ruta (27–28) och byter tryck.
    - Högern bär kortet på högkant med framsidan mot kameran (ruta 33–39).
    - Rutor upprepas ungefär var femte ruta.
  - **Slutsatsen:** första och sista bild räcker för att klippen ska gå ihop, men inte för att få vändningen. Ingen av de
    två billiga modellerna vänder kortet med handen när den bara har ankarna och en text. Det som saknas är en förlaga
    för rörelsen mitt i klippet: en bild vid handbytet med kortets rygg upp (ankaret A2M i schemat, som då delar given i
    två klipp), eller dockans film som referensfilm (Kling 4 tar båda tillsammans med första och sista bild).
  - **Till nästa gång:**
    - Ankaret med kortet kvar görs genom att klistra in kortets bildpunkter ur A3P4C1, inte genom en ändring, så att
      kortet blir exakt samma.
    - Huvudet i A2.3 ska vridas mot skon som Frasses (29°): orden i bilden räckte inte till det.
    - Ankarna ges i klippets egen storlek.
  - **Kostnaden:** 69 krediter, varav fem bilder 20, tre klipp 52 och ihopsättningen 1. Uppdragen ligger bland
    Runways tillgångar: A2.3 `590f63c2-42ca-4c71-956d-e6c743f1e9f0`, A3P4C1
    `e1c973ed-68ed-405b-b432-eb1dbd8351af`, A2.3 med kortet `195733d8-51fd-4ecc-bd63-ba3a60303cb9`, given
    `f0120b8e-84e5-4c8c-99f2-8781b7d7ca53`, handen hem `b4b2b919-e782-4b5c-b843-d46388f59940` och de två ihopsatta
    `cf27f7d7-526e-49db-8fc2-0a024e7f105d`.
- Trettonde provet, 2026-11-27, **en ny person ur `avatar-auto-pipeline/ny_dealer.py`** (provet
  `kenji-ny-dealer-ur-bilder-20261127`, originalen i provets `original/` och `original/v2/`; domarens ord, inte Jakobs):
  Kenji, och Danilos lyfta giv till dagens plats 4 i nyckelfärgerna.
  - **Första omgången, Kling 4:** nio stillbilder jämnt i dockans tid (var åttonde ruta), 3 s, 131 krediter med
    bilderna. Samma man hela vägen och bra händer, men:
    - tre nästan likadana bilder där dockan står still vid skon fick Kling att dra kortet för tidigt och bära det
      lodrätt högt i luften;
    - bilden vid ruta 8 hade huvudet mer böjt än startbilden, så att huvudet ryckte i ruta 0–2;
    - bilderna efter landningen hade kortet på lite olika ställen, så att filmen sköt kortet 18 bildpunkter efter
      landningen;
    - Kling lade bilderna i sin egen takt (3,0 s mot dockans 2,2).
  - **Aleph 2 över samma dockfilm** (56 krediter): exakt dockans takt, men kortet försvann i handbytet, där dockan då
    höll det med kanten mot kameran, och ansiktet blev yngre mot slutet.
  - **Lärdomarna, som står i verktyget:** välj rutorna efter rörelsens händelser och aldrig två där dockan står i samma
    ställning; gör varje bild efter landningen som en ändring av sista bilden; låt texten per ruta säga hur kortet står,
    ur rörelsens tal; lägg filmen i dockans takt efteråt med `standarddocka/verktyg/i-dockans-takt.ts`.
  - **Dockans fel blir filmens:** kortets vinkel i handbytet var vårt eget påhitt och rättades i lyftet (ryggen mot
    kameran, buret under handen).
  - **Andra omgången** (tio stillbilder, 82 krediter, och Kling 4, 57) filmades efter en rörelse där kortet hängde i
    fingertoppen och ersattes av den tredje.
  - **Tredje omgången, Kling 4** (nio nya stillbilder, 72, och filmen, 57), efter den rörelse domaren dömde Bra: filmen
    håller mannen, händerna är mänskliga och kortet syns hela vägen. Domaren: Nja; Jakob om samma film: "Tempot är
    konstigt", och händerna får inte kontakt med kortet. Orsaken är två källor: händerna är Klings egen rörelse mellan
    bilderna, kortet ritas efter dockans tal, och takten trycks in efteråt mellan sex ankare (Kling gick inte genom fyra
    av de tio bilderna: draget ur skon blev slow motion och bytet tre gånger för fort). Att upprepa rutor ger hack, att
    blanda dem ger dubbla fingrar; mellanrutor ur rörelsen (`minterpolate`) är inte dömda.
  - **Tredje omgången, Aleph 2** (56 krediter) över den rättade dockfilmen med tre styrbilder (start vid sekund 0,
    handbytet vid 0,97 och sista bilden med `"at": 1`; en tid över filmens hela sekunder, 2, nekas utan kostnad): exakt
    Danilos takt och inga upprepade rutor, men domaren: Inte bra. Ansiktet går sönder (ett ögonlock sväller i ruta
    16–33) och blir yngre mot slutet trots tre styrbilder, vänsterhanden blir dockans (plastig), och spårkortets gula
    lämnar flagor vid fingrarna. Aleph tar takten och rörelsen ur dockan men också dess yta.
  - **Fjärde omgången, tre klipp mellan fyra ankarbilder** (`ny_dealer.py --ankarklipp`, provet
    `kenji-tre-klipp-mellan-ankarbilder-20261127`, 238 krediter): takten ur dockans film och ansiktet och händerna ur
    stillbilderna i samma anrop.
    - **Ankarbilderna** (GPT Image 2.6 Sunburst, `2560:1440`, 10 + 3 × 8 krediter, alla fyra godkända på första
      försöket): A2.3 ur dockans ruta 0 och personens tre bilder; A2.3 med kortet som en ändring av A2.3; A3P4C1 som
      en ändring av den, med dockans ruta 43 som ställning; A2M som en ändring av A2.3, med ruta 29. Bakgrunden,
      hyllan och relingen skiljer 2–9 av 255 mellan bilderna, den genomskinliga skon 15–28. Texten måste säga det
      bilden visar: klippets text sa "long edge" där dockan ställer kortet på kortkant, och ankarbildens text sa inte
      hur kortet hålls; båda kommer nu ur rörelsens tal. "A closed fist" gav en hårt knuten näve där dealerns är lös.
    - **Klippen:** Kling 4, `/v1/image_to_video`, `promptImage` med `first` och `last` (ankarbilderna i 1728 × 972),
      `referenceVideos` med dockans film av steget fylld till 3,0 s med stillhet i ankarna (30 + 30 + 30, 37 + 15 + 38
      och 33 + 23 + 34 rutor), `duration: 3`, `ratio: "auto_1080p"`: 68 krediter per klipp. Ut kom 1920 × 1080, 24
      bilder/s, 73 rutor, med ljud.
    - **Kling följer referensfilmen:** rörelsens likhet 0,96–0,98 (rörelsen ruta för ruta i bordets del av bilden mot
      referensfilmens) och 0,06–0,08 s senare, i alla tre klippen. Första och sista rutan är ankarbilderna, så
      klippen går ihop. Ett steg klippt på referensfilmens egna tider tappar rörelsens slut: mät förskjutningen
      (`ny_dealer.py --steg 7` gör det).
    - **Bildtakten är 24 och går inte att välja.** Att lägga om till 30 genom att upprepa var femte ruta fällde
      domaren ("ett jämnt hack sex gånger i sekunden"). Filmen sätts ihop av klippens egna rutor: 53 rutor för dockans
      66, filmruta j är dockans ruta j × 1,25.
    - **Dockans fel blir filmens, igen:** i dockan går kortet från stående i bytet till dolt under näven på två
      rutor. Kling ritade då ett kort som står ensamt mellan händerna, bleknar och blir en mörk kant i näven. En
      rörelse en kamera inte kan följa blir ingen film: bytet rättas i lyftet före nästa klipp.
    - **Spårkortet i farten:** Klings gula kort var blekt av rörelseoskärpa (245, 214, 122 mot det skarpa 250, 215,
      60) och låg en till två rutor efter dockans, 6 cm per ruta. Efterarbetet kände först inte igen det och ritade
      vårt kort bredvid handen.
    - **Domaren** (domarens ord, inte Jakobs): Inte bra i fyra versioner av efterarbetet, för bytet, för vårt kort över
      fingrarna och för hacket. Det som höll: samma man, lugnt huvud, vänsterhanden vid skon, och näven med tummen på
      kortet. Det gula spårkortet gick inte att byta ut rent där hand och kort är utsmetade av farten: utskuret blev
      vårt kort prickigt med hål, omfärgat en laxrosa klump.
  - **Femte omgången, röd kortrygg** (`ny_dealer.py --ankarklipp --rygg rod`, provet
    `kenji-rod-rygg-tre-klipp-20261127`, 238 krediter och en omtagning på 68), efter fem vändor på dockans handbyte
    (kortet ligger i handen hela vägen in i näven och läggs utan hopp).
    - **Kortets rygg röd med vit kant redan i dockans film och i ankarbilderna:** Kling 4 ritar då ett riktigt kort,
      också i farten, med handens fingrar över det, och efterarbetet ritar bara framsidan när kortet ligger
      (`lagg-pa-bord.ts --rygg-ur-filmen`). Framsidan är fortfarande spårkortets (vit, turkos ram, rosa märke).
    - **Texten ska bara säga det som syns i klippet.** Första klippets text beskrev också kortets framsida, som aldrig
      syns där, och Kling ritade den som ett stort vitt kort med turkos ram liggande på filten genom hela klippet.
      Verktygets mått fångade det (rörelsens likhet 0,73 mot 0,96–0,97 i de andra). Med bara ryggen beskriven och
      meningen "no other card, sheet or object ever appears on the table" höll omtagningen (likhet 0,96).
    - **Dockans rörelse kopieras, också när den är rätt:** kortet tas av högern mellan händerna, bärs med ryggen upp
      under handen och kommer fram under tummen, som i dockans film. Det dockan gör otydligt blir otydligt: kortet
      bars under fingrarna på ena sidan av näven och kom fram vid tummen på den andra, och i filmen är det borta en
      ruta och dyker upp vänt ("ett hopp, inte en kortkant som tummen vänder").
    - **Domaren** (domarens ord, inte Jakobs): Nja, klart bättre än den fjärde. Kortet är ett och samma riktiga kort
      i en hand ända in i näven. Kvar: vändningen syns inte, näven på det lagda kortet är hårt knuten, och blicken
      går inte till skon.
    - **Spårkortets märke hamnar under tummen.** Framsidans rosa märke sitter i kortets hörn, där dealerns tumme
      ligger, och färgar tummens kant i filmen. Märket används inte av efterarbetet: ta bort det ur framsidan när en
      hel ny omgång görs (dockans utseende i `standarddocka/editor/scen.ts` och bildtexterna i `ny_dealer.py`).
- Fjortonde provet, 2026-11-27, **handbytet som egen ankarbild: A2.3 → A2M → A3P4C1 → A2.3 med kortet**, för hand i
  Runways app med en ny person ur ett foto som Jakob skickade. Fotot gick bara till bildmodellen i Runway, aldrig in i
  Git. Frasses ställning genom livebordets kamera; domarens ord, inte Jakobs.
  - **Förlagorna** ritades platt ur datan: A2M ur `dealer3d/data/ankare-byte-frasse.json`, de andra som i tolfte provet.
    Kortets sida ritades ut (rygg röd och mönstrad, framsida vit). Nano Banana 2.1 gjorde A2.3 ur förlagan och fotot.
    A2M och A3P4C1 gjordes som ändringar av A2.3, 4 krediter styck, och höll på första försöket. Inför A3P4C1 målades
    kortplatsen in i bilden som ändrades; utan den lade modellen kortet framför kameran.
  - **A2.3 med kortet** klistrades ihop av A3P4C1:s bildpunkter, gratis. Där pekfingret låg lagades kortet med sitt
    motsatta hörn, eftersom ett klätt kort är likadant uppochned. Klippet ska vara centrerat på kortet, annars blir
    kanten ett hack.
  - **Tre klipp** gjordes i MiniMax H3 Lite, 4 s, 16 krediter styck: skon till bytet, bytet till platsen och handen
    hem. Alla skarvar ligger på 2,6–2,9 av 255, och i läge under 0,1 bildpunkt.
  - **Vändningen blev rätt.** Kortet dras ur skon med ryggen upp, står på kant i bytet och nyps och rullas av handen
    genom kanten (ruta 136–140 i den ihopsatta filmen). Det är samma kung hela vägen, utan extra kort. Bilden där
    kortet står på kant var det som saknades i tolfte provet.
  - **Domaren: Inte bra (medel).**
    - Takten: kortet står nästan stilla i cirka 3 s före vändningen, och att snabba upp hela klipp gav ryck.
    - Vänsterhanden ligger som en knytnäve mitt på filten medan högern ger, och går till skon först efteråt.
    - Högern är en klo över kortet i ruta 145–148.
  - **Takten rättas gratis** genom att trycka ihop stillheten i stället för att snabba upp hela klipp. Varje ruta får
    en vikt efter rörelsen i handområdet (lägst 0,08, högst 1), och klippen läggs om till Frasses längder (0,75, 1,4
    och 0,7 s). Första och sista rutan behålls. Hela given blev 2,9 s, mot Frasses 2,8.
  - **"Hej John":**
    - `generate_talking_video` ur ankarbilden (2 krediter) talade med svensk röst, men gjorde en närbild i stället för
      bordsbilden.
    - Att redigera ett färdigt klipp med `gemini-omni-1.2-flash` gick inte: en uppladdad film gav "Input asset … was not
      found" tre gånger. Det kostade inget.
  - **Samma giv från en annan vinkel går** (Tomasz, dagens plats 5): `kling-4` med livekamerans klipp som
    referensfilm och ankarbilder från plats 5 som första och sista bild gav samma giv i samma takt, och kopierade också
    felen (57 krediter för 4 s).
    - Att be Nano Banana om en ny vinkel kräver förlagan från den platsen. Utan den kopierade den livekamerans vinkel.
    - Uppdragen för Tomasz: A2.3 `869fc36f-e69e-4c53-b1f9-60bbaac18c72`, A3P4C1
      `ff79f0b2-1933-47fd-ab3a-ea5965abc79a`, given `21f58f76-ab03-46cd-9e36-723a0999faec`, handen hem
      `8ce28f01-9c19-4e92-9aaf-28b54837cf67`.
  - **Kostnaden:**
    - Den nya personen: 62 krediter från livekameran och 87 från plats 5.
    - Tomasz från plats 5: 85.
  - **Uppdragen för den nya personen, från livekameran:**
    - Ankarbilder: A2.3 `dd305997-fb50-467b-b264-3bf0e5230598`, A2M `0b74287a-f543-4c7d-898c-72a6b2e921e7`, A3P4C1
      `dca613fb-7329-4bda-8a81-93070812d553`.
    - Klipp: `11f6fd1f-8e1c-42d1-a91f-890abbdf58e8`, `d436e55d-08e1-472f-9305-e3bc06a639b8`,
      `8d1d194d-92cf-49c2-a82a-9f3305f3df11`.
    - Pratklippet: `728aa504-1498-4800-ac63-5d4f00d1ce86`.
  - **Uppdragen för den nya personen, från plats 5:** A2.3 `901e5090-bce3-44ba-b288-ecc22bd36e65`, A3P4C1
    `aade1ca6-381d-4b23-8558-bfbbe04192da`, given `452ec68b-0839-4c13-bea0-fe0faa7cda9d`, handen hem
    `0ae2eced-9ea5-4cfa-9e83-c49d596f2447`. A2M fick fel ställning och användes inte.
  - **Domaren om plats 5: Inte bra (medel, "kan bli Nja").**
    - Det som håller: given följer livefilmen ruta för ruta i samma takt. Kortet tas ur skon med ryggen upp, står på
      kant och vänds snabbt av handen. Kameran står stilla.
    - Ett ryck i ruta 26–27 kom ur referensfilmen, som var hopklippt just där. Klipp inte i en referensfilm.
    - Handen hem i 480p gav ett slätare och yngre ansikte efter skarven. Gör varje klipp i samma upplösning.
    - Kortets framsida syns inte i luften (ruta 35–37).
    - Bakgrundspersonen fungerar som en skugga men tonar bort mitt i bilden.
- Det finns ingen Kling 4 Pro (2026-11-26): fyran är Kling 4.0 och den billigare Kling 4.0 Flash (720p). Pro är namn
  på äldre led, Kling 3.0 Pro och Kling O3 Pro.
- Inte prövat hos oss: Kling 4 med styrbilden som första bild och filmen som lös förlaga
  (det sätt som kan ge en naturligare rörelse än dockans; anropet ligger färdigt i tredje provets mapp i arkivet), Seedance 2.5
  som redigerare, Act-Two med dockan som den som spelar, och flera kameror bredvid varandra i en och samma film.
- **Korta klipp:** Aleph 2 tar ingen film under 2 s och Kling 4 ingen under 3 s. En rörelse på 1 s filmas därför
  tillsammans med stillheten i ankaret efter den, eller med nästa rörelse, och klipps i ankaret.

## Kopplingar för kodagenter

Ingen av dem behövs för att läsa dokumentationen; den är öppen.

- **Runway Dev-tillägget** är installerat i Claude Code (skills `runway-api:*`, kopplingen `plugin:runway-api:runway-dev`),
  men inloggningen hade gått ut 2026-11-26: Jakob loggar in en gång i webbläsaren, med `/mcp` eller
  `claude mcp login plugin:runway-api:runway-dev` i en terminal. Kopplingen visar vilka modeller projektet får använda
  (`list_projects`, `list_models`) och varför ett uppdrag föll; den gör ingen film. I Cursor: `/add-plugin runway-api`.
  Steg: `https://docs.dev.runwayml.com/guides/plugin.md`; bara kopplingen: `https://dev.runwayml.com/mcp` (`guides/mcp.md`).
- **Runways koppling som gör film i chatten** (`mcp.runwayml.com`) är en annan sak. Den beställer i appens arbetsyta
  och drar appens krediter. En agent beställer genom vägarna i `bestalla-film`, där varje anrop bokförs. Den här
  kopplingen används bara på Jakobs ord och inom den budget han säger (tolfte provet). Där är appens egen lista över
  tillgångar liggaren, och uppdragens id skrivs i provet; signerade adresser skrivs aldrig i repot. I en molnsession
  behöver nätet släppa fram `dnznrvs05pmza.cloudfront.net`, `d2jqrm6oza8nb6.cloudfront.net`, `img.runwayml.com` och
  `runway-datasets.s3.us-east-1.amazonaws.com` för att hämta och ladda upp.
