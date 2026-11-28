# Projektet: idén, kedjan och varför varje mapp finns

Vad casino-repot är till för och hur delarna hänger ihop. Reglerna står i [`AGENTS.md`](AGENTS.md), måtten i
[`MATT.md`](MATT.md), hur man startar i [`README.md`](README.md) och läget i
[`blackjack-dealer/STATUS.md`](blackjack-dealer/STATUS.md). Dokumentet rättas när ett prov har gett besked.

## Målet

En blackjackdealer som ser ut som en verklig människa, **sedd från varje spelares plats**: samma kvalitet som en
framställd 2D-film, men från minst sju vinklar runt bordet, så att flera spelare kan sitta bredvid varandra och var och
en ser dealern från sitt håll (Jakob 2026-11-27: "att kunna se samma kvalitet som i 2D-videorna från olika vinklar ...
i alla fall 7 vinklar och gärna så andra spelare kan sitta bredvid runt bj-bordet. DET är målet").

En film från en vinkel är i stort löst; det olösta är flera vinklar. Vägen vi går är **sju filmer av samma rörelse**:
dockan spelar rörelsen en gång och filmas genom sju kameror, och filmmodellen gör en film av personen ur var och en.
Filmmodellen kopierar dockans rörelse exakt, och eftersom rörelserna är lyfta ur riktiga dealrar är det en människas
rörelse som kopieras. En 3D-figur direkt i spelet skulle ge varje vinkel gratis, men når inte filmernas kvalitet i dag.

## Idén

Korta filmklipp av en person som ger kort, väntar och gör upp rundan, spelade i ett blackjackspel. Filmerna görs av
filmmodeller i 2D (hos Runway), eftersom en framställd film av en person är mycket bättre än något vi har fått ur en
riggad 3D-figur (Jakob 2026-11-27: "kvaliteten från de 2D-genererade klippen på personerna är extremt mycket bättre än
vad jag hittills sett kunnat bli riggat"). Men en filmmodell som bara får en text gör inte samma rörelse två gånger,
träffar inte kortplatserna och håller inte takten. Därför styrs den av en **docka**: en 3D-figur som spelar rörelsen
exakt, vid det uppmätta bordet, genom en bestämd kamera. Filmmodellen gör om dockans film till en film av personen och
följer den ruta för ruta.

## Vad dockan är

Dockan är **en visuell standard att förhålla sig till** (Jakobs ord): "En standarddocka i min mening är bara någonting
som innehar alla rörelser, men utifrån rätt bord, kort. Men också i den vinkel som finns på youtubevideorna" (Jakob
2026-11-28). Den bär det som ska vara lika varje gång:

- **Måtten:** bordet, skon, kortet, kortplatserna och kamerorna, klonade ur filmen av ett riktigt livebord.
- **Rörelserna:** varje giv och varje väntan, lyfta ur samma film och sparade så att de kan spelas igen.
- **Schemat:** vilka ställningar klippen börjar och slutar i (ankarena), så att klippen går att sätta ihop.

Danilo och Frasse är de två riktiga dealrarna i filmen, och deras dockor ska ha deras kroppar. En persons docka byggs
på en av dem och spelar samma rörelser, räknade om för personens axlar och armar, eftersom alla figurer delar samma
skelett. Men varje person behöver sina **egna inspelningar**.

## Kedjan

| Steg | Vad som händer | Var |
| --- | --- | --- |
| 1. Personen | Tre bilder av en person (porträtt, helfigur, halvfigur). De i `avatar-auto-pipeline/input/` är framställda, inga riktiga människor. | `avatar-auto-pipeline/` |
| 2. Personens docka | Personen mäts ur bilderna (kroppens leder, handens och ansiktets punkter) och får en docka efter måtten, byggd på Danilos eller Frasses. | `avatar-auto-pipeline/` |
| 3. Rörelsen | Dockan spelar rörelserna som är lyfta ur filmen av de riktiga dealrarna, räknade om för personens egna axlar och armar. | `blackjack-dealer/dealer3d/`, `live-bj/` |
| 4. Inspelningen | Dockan filmas vid livebordet genom livebordets kamera eller en spelarplats, i rena färger som går att skära ut. | `standarddocka/` |
| 5. Personens bilder vid bordet | Rutor ur dockans film, valda där något händer i rörelsen, görs om till personen av en bildmodell. Betalt. | `avatar-auto-pipeline/`, `blackjack-dealer/` |
| 6. Filmen | En filmmodell gör filmen mellan bilderna, med dockans film som referens. Betalt. | `blackjack-dealer/` |
| 7. Efterarbetet | Filmen får dockans takt, personen skärs ut och läggs på vårt bord med vår sko, och kortet ritas av oss ur dockans tal. | `standarddocka/` |
| 8. Domen | En oberoende domare dömer först, sedan Jakob. Det han godkänner får en roll; resten raderas. | studion i `blackjack-dealer/` |
| 9. Spelet | De godkända klippen spelas vid bordet i spelet. | `blackjack-dealer/` |

Steg 2 till 5 och anropen för steg 6 körs med ett kommando, `python ny_dealer.py <person>` i `avatar-auto-pipeline/`.

## Varför varje mapp finns

| Mapp | Dess uppgift i kedjan |
| --- | --- |
| `blackjack-dealer/` | **Spelet, studion och beställningarna.** Måttens källa (kameran, bordet, kortet, kortplatserna), koden som spelar dockornas rörelser (`dealer3d/`), beställningen och bokföringen av filmer hos Runway, studion där Jakob granskar och dömer, och spelet där klippen spelas. |
| `standarddocka/` | **Verkstaden för rörelser.** Editorn där en rörelse spelas och filmas, verktygen som mäter den, efterarbetet, och Jakobs domar om dockan, bordet och rörelserna (`DOMAR.md`). Rörelseschemat står i `rorelsekatalog.json`. |
| `avatar-auto-pipeline/` | **Figurerna och föremålen.** Skripten som bygger dockornas kroppar, bordet, skon och stolen efter måtten, och vägen från bilder av en person till en docka på vårt skelett. Vilka vägar som finns står i `vagar.json`. |
| `live-bj/` | **Facit från verkligheten.** Mätning av två riktiga dealrar vid ett livebord ur en film: takt, hållning, blick, bordet och kameran, och rörelser lyfta ruta för ruta. Filmen och bilderna stannar på datorn; bara talen går vidare. |
| `slask/`, `inbox/` | Tillfälligt arbete, och lappar mellan chattar som arbetar samtidigt. |
| `MATT.md`, `matt.ts` | Alla mått på ett ställe, utskrivna ur koden bredvid det som är mätt på livebordet. |

## Det som är bestämt

- **Filmerna är målet, dockan är medlet.** Det spelaren ser är en film av en person; dockan syns inte.
- **Livestandarden är den enda standarden** (regeln i `AGENTS.md`): livebordets kamera, bord, sko, kort och
  kortplatser gäller för all inspelning, beställning och visning, också i spelet. Bakgrund, duk, ljus och kortens
  utseende läggs ovanpå och ändrar aldrig måtten.
- **Rörelserna kommer från verkligheten.** Att finputsa en ritad giv gav en skillnad som syntes i talen men inte för
  ögat. Det som klonas är mått och rörelse, aldrig en verklig persons utseende.
- **Rörelserna först, och en metod för alla dealrar** (Jakob 2026-11-28: "huvudsaken är ju att vi kan få in alla
  rörelser hämtade ur Youtubefilmerna", och "kunna skapa delningssekvenser till alla platser. När vi har modellen för
  detta så kan vi skapa vilken dealer som helst"). Dealrar som redan är gjorda räddas inte; målet är en generisk metod.
  Orden står i `standarddocka/DOMAR.md`.
- **En grunddocka och en rörelsesamling** (Jakob 2026-11-28: "en enda grunddocka som ... bär alla rörelser, som
  är plockad från olika dealers"). Rörelserna får komma från olika dealrar, Danilo, Frasse och senare fler ur mer
  film. Det går för att en rörelse sparas som var händerna, fingrarna, huvudet och kortet är över bordet, inte som en
  viss kropps leder, och för att varje rörelse börjar och slutar i samma ankare. En persons docka är grunddockan
  skalad efter personen, med samma händer. Alla figurer delar ett skelett.
- **Platser och riktningar** (Jakob 2026-11-27): plats 0 är dealern, plats 1 den närmast skon vid hans vänster, sedan
  runt till plats 7; höger och vänster är dealerns egna. Regeln, och att bytet inte är gjort i koden än, står i
  `AGENTS.md`.
- **Jakob dömer med ögat.** Kontrollerna säger var det är värt att titta; de avgör inte om något är bra. En oberoende
  domare dömer före honom.

## Dit vi går

Riktningen; läget står i `STATUS.md`.

1. **Alla rörelser ur filmen.** Givarna till alla sju platser, kort 1 och kort 2, finns sedan 2026-11-28: en gemensam
   första halva till handbytet och en andra halva per plats och kort. Kvar: givarna där vänstern ger ensam, dealerns
   egna kort, korten in i lådan, svepet, väntan under insatserna och en ordnare som spelar en runda i spelets ordning.
   Danilo och Frasse är i dag två dockor med var sin uppsättning; de blir en grunddocka med en samling, där varje
   rörelse säger vilken dealer den kommer från.
2. **Det sista av den äldre dealerns flöde bort:** kortplanens värld (`src/plan-lens.ts`, kortplanen), hennes
   beställningsväg och träd, och bankens register.
3. **Platserna och namnen rättas i ett steg:** plats 1 närmast skon, stilarna `kameran` och `bordet` efter dealrarna,
   och `standarddocka`, som inte längre är en enda docka.
4. **En av varje:** ett filmregister (vilken rörelse, kamera och person, och hans dom), ett ställe där något väntar på
   hans dom (provet, med sina original), och ett sätt att radera (`lager-remove.ts`, som säger följden först).
5. **Studion visar saken** (bild, film, docka, karta; orden i Ordlistan): Granska, Prov, Dockan och Biblioteket gås
   igenom.
6. **Fyra verkstäder och ett spel,** var och en med en uppgift:

| Verkstad | Uppgift | Tar över från |
| --- | --- | --- |
| Mätningen | mäta det riktiga bordet och de riktiga dealrarna | `live-bj/` |
| Dockan | kroppen, rörelserna, schemat och editorn | `standarddocka/`, `blackjack-dealer/dealer3d/`, `avatar-auto-pipeline/scen/` |
| Personen | från bilder till en figur och ett utseende | resten av `avatar-auto-pipeline/` |
| Filmen | beställa, hämta, granska och bokföra | beställnings- och granskningsverktygen i `blackjack-dealer/tools/` |
| Spelet och studion | reglerna, bordet i 3D och ingången till allt | `blackjack-dealer/` |

En mapp flyttas inte förrän dess innehåll är rensat: en flytt ändrar varje sökväg i kod, skills och dokument, och görs
en verkstad i taget när inget annat arbete pågår i den.

## Det proven har visat

Slutsatserna som styr arbetet; proven själva står i Git och i skillen `runway`.

- **Filmmodellen följer dockan nästan ruta för ruta,** så dockans fel följer med in i filmen. Utseendet kommer ur
  bilderna av personen, inte ur dockan.
- **En mätning säger inte att något är bra.** Kortet inom en bildpunkt och rätt takt sa ingenting om det Jakob fällde
  (glömt utseende, skakighet, blicken, en vänsterhand som inte var dealerns). Därför dömer en domare med ögat.
- **En spärr mäter bilden, inte talen bakom den:** dockans ritade film mäts med samma ansiktsnät som den riktiga
  dealern (`live-bj/verktyg/lyft.py dockhuvud`).
- **Dockan följer rörelsen, inte mätningens brus.** Smårycken kom ur vårt eget verktyg, och den råa blicken byter håll
  18 gånger per sekund; en filmmodell följer varje sådant hopp.
- **Riktiga dealrar rör sig hela tiden** och bromsar bara in i handbytet (till 6–8 % av toppfarten); bålen börjar
  samtidigt med handen. De drar kortet utan att se på skon, och de gör inga miner medan de ger kort.
- **SAM 3D Body ger djupet** två till fyra gånger bättre än MediaPipe, som lägger en led 4–11 cm fel i djupled.
- **Kortet ritas ur dockans tal** i efterarbetet: där filmen följer dockan ligger det 1–2 mm rätt och flackar inte.
- **En giv i taget håller;** en hel sekvens i en tagning gled i ansiktet och fick kort som inte fanns. Scenen behöver
  alla kort som dealern rör.
- **Klipp mellan samma ankarbilder går att sätta ihop** utan synligt hopp, men rörelsen mellan bilderna är
  filmmodellens egen. Schemat är bärande; förlagan och modellen avgör om rörelsen blir bra.
- **Handbytet A2M som egen bild** får handen att vända kortet genom kanten.
- **Samma giv från en annan vinkel går,** med livefilmen som referensfilm och ankarbilder från spelarens plats.
  Referensfilmen klipps inte, och alla klipp har samma upplösning. Två kameror ger samma man i samma ögonblick.
- **Några stillbilder som förlaga** ger en rörelse som inte stannar vid bilderna och ett kort som landar rätt, men
  takten blir filmmodellens egen.
- **Likheten sitter i formen:** först huvudets form, sedan kroppens mått, sist kläderna. Ett utseende målat på en annan
  mans docka blir inte personen, en färdig figur som formas om till en annan dockas skelett får trasiga händer, och en
  hand som sätts på i efterhand dömde Jakob Inte bra.
- **En större eller mindre person löses med kroppens mått,** inte med en annan mans kropp. Sitsen är dealerns för
  alla: når armen inte skjuts axeln fram högst 9 cm och bålen lutas.
- **Bandet går för en ny person utan handpåläggning** (Amara, 2026-11-28), men dockorna blir nästan samma docka:
  kön, längd, händer och kroppsform tas inte ur bilderna.

## Det som är öppet och avgörs av prov

- **Gör dockan det den riktiga dealern gör?** Givarna till alla platser är nya och inte dömda; läget per giv står i
  `STATUS.md`. Kvar i rörelsen: vänsterhanden vid skon, tummen när fingret ligger på kortet, och Frasses huvud, som
  inte är kalibrerat mot ansiktsnätet.
- **Dockans kropp.** Kroppen ska vara dealerns, inte en medelmans (Jakob: den tjocka dockan "känns riktigt klumpig"),
  och om en persons docka ska få personens kön, längd och kroppsform avgörs av en film av personen.
- **Håller sju filmer av samma rörelse ihop?** Alla sju görs först när rörelsen är rätt och en film från en kamera har
  fått Jakobs ja.
- **Händerna har var sin tid.** I filmen börjar vänsterhanden ofta nästa kort medan högern går hem. Filmen är indelad
  per hand (`live-bj/data/segment.json`), men inget av det är prövat som rörelse i dockan än.
- **Hur många inspelningar per person behövs?** Sju kameror gånger alla rörelser gånger alla personer blir många
  betalda filmer; vilka som verkligen behövs är inte bestämt.
- **Korten ovanpå filmen i spelet** ska ritas ur dockans tal. Det gamla överlägget står kvar tills det nya bär.
- **Ska någon 3D-figur visas direkt i spelet,** utan film? Då behöver den ett rörligt ansikte och bättre händer. I dag
  är svaret nej.
- **Slutmålet för spelet.** Studion och spelet i `blackjack-dealer/` är där allt prövas och godkänns. Om det som ska
  lämnas vidare är de färdiga klippen, spelet eller båda är Jakobs att säga.
