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
  före det skickas och hålls av taken i `blackjack-dealer/data/order-policy.json`.
- Vem som får betala vad står i projektets `AGENTS.md`. I `standarddocka/` betalas inget utan Jakobs ord.
- Ett anrop kan märkas med rubriken `X-Runway-Tags` (till exempel orderns id); `POST /v1/organization/usage` delar sedan
  upp förbrukningen per märke.

## Läget 2026-11-26

Läst sent den dagen ur sidorna ovan. Priserna är krediter per sekund färdig film om inget annat står.

| Modell | ID | Vad den gör för oss | Gränser | Pris |
| --- | --- | --- | --- | --- |
| Aleph 2.0 (Runway) | `aleph2` | Gör om en film som finns, i bild: `/v1/video_to_video` med `videoUri`, en text (högst 1 000 tecken) och 1–5 styrbilder (`keyframes`) som var och en gäller vid en tid i filmen (`seconds`, `at` 0–1 eller `range`) | In: 2–30 s, högst 30 bilder/s. Ut: infilmens upplösning, högst 1080p. Inget eget fält för en bild av utseendet: utseendet ges som styrbilder. Tillval: `seed`, `outputFormat` (`png_sequence` eller `prores`: förlustfria rutor för nyckelfärgerna; `sdr_rec709_10bit`), `targetAspectRatio` (bygger ut bilden), `contentModeration.publicFigureThreshold: "low"` | 28, minst 56 per körning; `png_sequence` och `prores` +5, `sdr_rec709_10bit` +20 |
| Kling 4.0 | `kling_4` | `/v1/image_to_video`: första bild, upp till 8 mellanbilder och sista bild, bilder av person och stil (`references`, högst 10 med rutorna) och referensfilmer för rörelsen (`referenceVideos`, högst 5). `/v1/video_to_video`: redigerar en källfilm, med rutor (mellan- eller sista bild går utan första), högst 10 bilder och högst 4 referensfilmer | 3–30 s, 720p eller 1080p; filmen följer första bildens form. Referensfilm: 3–31 s, 24–60 bilder/s, minst 700 px per sida, tillsammans högst 30 s. Redigeringens längd är osäker, två sidor säger emot varandra: `assets/inputs.md` och prislistan säger att den följer källan, `api.md` listar `duration` 3–30 | 1080p: 18,8 utan infilm; med infilm 11,28 per s ut plus 11,28 per s av det längre av infilm och utfilm. Rabatt till 2026-11-30 UTC, sedan 23,5 och 14,1 + 14,1. 720p: 12,56 och 7,52 + 7,52 (sedan 15,7 och 9,4 + 9,4) |
| Kling 4.0 Flash | `kling_4_flash` | Som Kling 4 men bara 720p och bara första bild (ingen sista); för billig sållning | 3–20 s; infilm 3–21 s | 9,4; med infilm 6,3 + 6,3; minst 29 |
| Seedance 2.5 | `seedance2_5` | `/v1/video_to_video` med `mode`: `reference` (ny film styrd av infilmen), `edit` (ändrar infilmen på plats; kräver text och `duration: "auto"`, tar ingen `ratio`) eller `extend`. Upp till 30 bilder och 9 filmer som referens. `/v1/image_to_video`: första och sista bild, eller referensbilder (inte båda), ingen referensfilm. `seed`, `outputFormat: "mov"` | 4–30 s, 480p till 4K; infilm minst 480p. `draft: true` ger en billig 480p-förhandsvisning som kan höjas till 1080p inom sju dygn | 1080p: 68 ut plus 34 per s infilm. 720p: 30 + 15. 480p: 20 + 10. Minst 80 |
| Seedance 2.5 Flash | `seedance2_5_flash` | Samma lägen, bara 480p och 720p | 4–30 s | 720p: 20 + 10; minst 52 |
| Gemini Omni 1.2 Flash | `gemini_omni_flash_1.2` | Text, första och sista bild (då inga referensbilder), eller `/v1/video_to_video` med `mode` `reference` (infilm högst 10 s, högst 5 bilder), `edit` (infilm under 10 s, `duration: "auto"`, högst 5 bilder) eller `extend` (infilm högst 30 s, inga bilder) | 3–15 s eller `auto` (förval), 360p till 4K, förval 720p; `edit` och `extend` tar `resolution` i stället för `ratio`; allt som skickas in högst 64 MiB | 1080p: 10, plus 1 per bild och 1 per s infilm. 720p: 7. Minst 6 |
| WAN 3.0 | `wan3` | `/v1/image_to_video`: första och sista bild, eller referenser (inte båda): upp till 10 bilder (`promptImage` utan `position`) och upp till 5 referensfilmer för rörelsen (`referenceVideos`, varje post `{ "type": "video", "uri": … }`); också `referenceAudio` | 2–30 s, 480p till 1080p (`832:480` är 480p i bred bild); med första och sista bild måste `ratio` vara `auto_480p`, `auto_720p` eller `auto_1080p`. Referensfilmer tillsammans högst 15 s och minst 854 x 480 | 1080p 20, 720p 10, 480p 5; referenserna kostar inget extra |
| WAN 3.0 Prime | `wan3_prime` | Samma fält som WAN 3, snabbare | Som WAN 3 | 1080p 28, 720p 14, 480p 6,8 |
| MiniMax H3 Max | `h3_max` | `/v1/image_to_video`: första och sista bild; för billig sållning | 5–15 s, `resolution` 480p eller 768p, ingen `ratio`: formen följer bilden | 480p 5, 768p 8 |
| Act-Two (Runway) | `act_two` | `/v1/character_performance`: en bild eller film av en figur styrs av en film av en person som spelar (ansiktet, och kroppen med `bodyControl`) | 3–30 s; ansiktet måste synas hela tiden | 5 |
| GPT Image 2.6 | `gpt_image_2_6_sunburst`, `gpt_image_2_6_flare` | Bild ur text och upp till 16 bilder som referens (redigering); för ankare och styrbilder | 1K till 4K, 30 mått | 2K i 3:2, hög kvalitet: 8 per bild, plus 1 per referensbild |
| MiniMax H3 Image | `minimax_h3_image` | Bild ur text och upp till 16 referensbilder, som texten pekar på i uppladdningsordning (image 1, image 2); för ankare och styrbilder | 1K till 4K, eller `auto_1k`, `auto_2k`, `auto_4k` | 3–18 per bild |
| Nano Banana Pro | `gemini_image3_pro` | Bild och redigering; den vi har gjort keystone och ankare med | upp till 4K | 20 per bild i 1K och 2K, 40 i 4K |
| Enhance Frame Rate | `enhance_frame_rate` | `/v1/video_upscale`: byter bildtakt, till exempel Kling 4:s 24 bilder/s till 30 | In högst 300 s; `targetFramerate` 24, 25, 30, 48, 50, 60 eller 120 (och 23,98, 29,97, 59,94) | 1 per 2 s infilm |
| 3D ur bild | `trellis_2`, `tripo3d_h3_1`, `hunyuan_3d_3_1_pro` | `/v1/image_to_mesh`: en GLB-modell ur en till åtta bilder. Dokumentationen nämner ingen rigg eller animation | – | Tripo 20 plus tillval, Trellis 25–35, Hunyuan 38 plus 15 per tillval |

Fler finns (Veo 3.1, MiniMax H3, Grok Imagine, HappyHorse, äldre Kling och Seedance, bild- och ljudmodeller,
uppskalning): se `guides/models.md`.

## Dockans film görs om till en person

Det standarddockan behöver: dockan gör rörelsen i 3D, den filmas genom en kamera, och en filmmodell gör om filmen till
en riktig person. Sätten som finns i dag, i den ordning de är värda att pröva:

1. **Aleph 2 med styrbilder.** Dockans film in, och en eller flera rutor ur samma film omgjorda till personen som
   styrbilder (första rutan, sista rutan, och vid behov ögonblicket kortet släpps). Styrbilderna vägleder; de lovar inte
   att fingrarna hamnar exakt.
2. **Kling 4 med första och sista bild och dockans film som referensfilm.** Det sätt givarna till Paow är gjorda med
   (`bestalla-film`).
3. **Kling 4 som redigerare** (`/v1/video_to_video`) med dockans film som källa och personens ankare som första bild.
4. **Gemini Omni 1.2 Flash, `edit`:** under hälften av Alephs pris och bara för filmer under 10 s, men stoppad av
   innehållsgranskningen när foton av en person följde med (2026-11-26).
5. **Seedance 2.5, `edit`:** dyrast (drygt tre gånger Aleph i 1080p); en reserv om de andra tappar utseendet.
6. **WAN 3.0 med figurens film som referensfilm och en bild av personen vid bordet som referensbild:** billigast (5 per
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
  omgjord till en provperson, en tagning per sätt. Det här är agentens läsning; Jakobs dom står i provet
  `docka-till-person-20261126`, där också filmerna och bilderna ligger (`blackjack-dealer/assets/proofs/`).
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
  `docka-till-person-2-20261126`):
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
  `docka-till-person-3-20261126`):
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
- Fjärde provet, 2026-11-26, i `kortspelspaket` (agentens läsning; Jakobs dom väntar, filmerna och anropet ligger i
  `slask/kortspelspaket/granska/katt-till-person-1/`): **WAN 3.0 med en referensfilm och en referensbild**, i 480p.
  In: en 3D-figurs giv som film (paketets robotkatt vid spelets bord med kort, 4 s, 854 x 480, 30 bilder/s) och
  styrbilden av provpersonen vid bordet ur första provet. Ut: personen gör figurens rörelse i samma takt och samma
  bildutsnitt, vid samma bord, och korten följer med (ur skon, från hand till hand, ner på platsen). 20 krediter: en
  femtedel av Aleph 2 för samma längd. Referensfilmen i 832 x 480 föll i kontrollen före anropet, utan kostnad: den ska
  vara minst 854 x 480.
- Femte provet, 2026-11-26, en hel kortrunda i en tagning (agentens läsning; Jakobs dom står i provet
  `tomasz-runda-20261126`, där filmerna ligger): dockans tagning på 15,5 s (vilan till skon och första kortet till sju
  platser, 465 rutor, spelets kamera) genom **Aleph 2**, 420 krediter per tagning (28 gånger 15 hela sekunder).
  - **En lång tagning håller.** Ut kom exakt lika många rutor som in, samma man hela vägen, och korten läggs och
    försvinner där dockans gör det. Filmen styckas efter dockans egen klipplista (`standarddocka/verktyg/stycka.ts`).
    Det är billigare än ett klipp i taget, eftersom en giv på 1,6 s annars kostar minst 56 krediter.
  - **Receptet:** styrbilden för vilan vid sekund 0 och styrbilden för ankaret vid skon vid fyra av stoppen med tomt
    bord (samma bild fyra gånger; `seconds` tar decimaler). Dockans tagning har 0,2 s exakt stillhet före och efter
    varje rörelse, där kortet försvinner: bytet blev rent på en ruta, utan utsmetning.
  - **Styrbilderna låser inte bildpunkterna.** Med bordet i filmen gled hela bilden upp till 4 bildpunkter i höjdled
    över tagningen, olika mycket i olika delar av bilden; det syns som ett litet hopp när klippen spelas i en annan
    ordning. `stycka.ts --rikta` flyttar tillbaka varje klipp. Med grönt överallt gled den högst 2.
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
  `tomasz-runda-20261126`): Jakob dömde dockans rörelse "stela, känns inte naturliga" och mindes att Pamela rörde sig
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
- Det finns ingen Kling 4 Pro (2026-11-26): fyran är Kling 4.0 och den billigare Kling 4.0 Flash (720p). Pro är namn
  på äldre led, Kling 3.0 Pro och Kling O3 Pro.
- Inte prövat hos oss: en hel film från en annan kamera än spelets (styrbilderna för plats 1 finns), Kling 4 med styrbilden som första bild och filmen som lös förlaga
  (det sätt som kan ge en naturligare rörelse än dockans; anropet ligger färdigt i tredje provets mapp), Seedance 2.5
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
- **Runways koppling som gör film i chatten** (`mcp.runwayml.com`) är en annan sak: den beställer och drar krediter.
  En agent beställer bara genom vägarna i `bestalla-film`, där varje anrop bokförs.
