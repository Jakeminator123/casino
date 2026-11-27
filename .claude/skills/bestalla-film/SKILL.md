---
name: bestalla-film
description: Använd i blackjack-dealer när en film eller stillbild ska beställas hos Runway, från utkast till godkännande, att lägga och hämta tagningen, efterarbete och mått, eller när en beställning som föll ska förklaras. Gäller Beställ, data/orders/, order-new, order-approve, order-put, order-collect, runway-api (lagg, hamta, place, collect), film-after och valet av modell, bilder och referensfilm. Inte granskningen (granska-film) eller en hel ny dealer ur bilder (ny-dealer).
---

# Beställa en film eller stillbild

Kommandon körs från `blackjack-dealer/`; sökvägar räknas från casino-roten. Texterna står i
`blackjack-dealer/src/order-prompts.ts`, recepten per steg i `blackjack-dealer/data/order-methods.json`, taken, fullmakten
och priserna i `blackjack-dealer/data/order-policy.json`. Upprepa dem inte; ändra dem där.

## Två vägar

- **Ett anrop utanför Beställ:** stillbilderna och filmerna för en ny person, som `avatar-auto-pipeline/ny_dealer.py`
  skriver färdiga (skillen `ny-dealer`), och andra prov på vilken modell som helst. De läggs med
  `node tools/runway-api.ts place <anrop.json>` och hämtas med `node tools/runway-api.ts collect <namn> <fil>`; anropet
  står i liggaren (`.runtime/runway-api/ledger.json`) innan det skickas.
- **En order i Beställ** (`/studio/bestall/`, kön och en order att skicka): `data/orders/<id>.json`, med utkast,
  godkännande och tagningar (nedan). Ett prov för en person över dockans film är en sådan order. Ordervägen för en
  dealer i klippbanken (`node tools/order-new.ts <dealer> <steg>`, `tools/produce.ts`) finns kvar i koden, men
  `data/dealers.json` har ingen dealer.

## Jakobs ramar

- Betalt bara inom fullmakten (`blackjack-dealer/AGENTS.md`, "Det som skyddar Jakob här"); läs saldot före en omgång
  (`node tools/runway-api.ts org`). Betalda anrop lägger huvudagenten.
- **Bara sätt som håller, och en pilot först** (2026-11-24): godkännandet läser sätten ur hans domar
  (`src/order-ways.ts`, `node tools/verdicts-per-method.ts`) och släpper EN pilot av ett oprövat sätt och inget som föll.
- **En ändring och en tagning per metodprov, två tagningar per klipp** när metoden är vald, en tredje bara om båda
  faller; varje omgång granskas oberoende i full upplösning före nästa, och kostnaden sägs efteråt (2026-11-12,
  2026-11-13, 2026-11-18).
- **Färre val** (2026-11-18): resten är stegets recept, och Beställ visar exakt text och bilder som går till Runway
  (2026-11-21). Texten ändras i mallen efter vad proven visar, aldrig för hand (2026-11-17).
- **Klicket är kön** (2026-11-13): en godkänd order läggs utan att han säger till.
- **Underlag** (2026-11-12): bara tagningar han har godkänt rakt av.
- **En standard:** livebordet (`src/standard.ts`, bilden 1728 × 972). Kontraktet: `blackjack-dealer/docs/SYSTEM.md`,
  "Beställningen".

## Vägen för en order

1. **Utkast** för en person som inte är dealer än: dockans film in med `node tools/doll-reference-put.ts
   ../standarddocka/klipp/<klipp>.mp4 --id docka-<namn> --from READY-C --to P4.C1 --doll danilo --kamera kameran` (eller
   `plats-7`), hans styrbild av filmens första ruta med `--id <film> --person <namn> --styrbild <bild> --utseende
   "<orden>"`, sedan `node tools/order-new.ts --person <namn> GIV-2.3 P4.C1 --reference <film>` (Aleph 2, styrbilden vid
   sekund 0, tionde provets text). `--dry` visar utkastet utan att skriva det. Ett avsteg från receptet är ett namngivet
   undantag i utkastets anteckningar. Ett sådant prov förs inte in i någon bank.
2. **Godkänn:** `node tools/order-approve.ts <id> --mandate "<uppdraget, på vems ord>"` inom fullmakten; större
   bara med hans klick eller `--jakob "<hans ord och datum>"`. Hashen fryses: en ändring är en ny order.
3. **Lägg:** `node tools/order-put.ts check <id>`; ladda upp bilderna (MCP `init_upload`, PUT, `complete_upload`);
   `order-put.ts begin <id> <n>` före anropet; anropa exakt det `begin` skriver ut, med `confirmRepeat: true` från
   tagning 2; sedan genast `placed <id> <n> <taskId> <saldo> --via mcp`, eller `failed` med felet ordagrant. Inget svar:
   skriv inget, tagningen är OSÄKER och läggs aldrig om. Utan MCP: `node tools/runway-api.ts lagg <id>` och
   `hamta <id>`; `lagg` tar bara Kling 4 och WAN 3, inte Aleph 2 än.
4. **Hämta:** `get_task` var 60–120 s, högst 25 minuter; `node tools/order-collect.ts <id> <n> --url '<adress>'`, sedan
   `status … HÄMTAD`. Originalet `take-<n>/source.*` ändras aldrig.
5. **Efterarbeta:** `node tools/film-after.ts <id> <n>` skalar filmen till standardens bild (1728 × 972; modellen väljer
   behandlingen, och annan form än första bilden vägras). Vid livebordet mäts varken det gröna, kanten eller
   landningen (`notMeasured` i `after.json`): filmen granskas med ögat. En stillbild efterarbetas inte av något verktyg.
   En film i nyckelfärger får dockans takt och läggs på vårt bord med `standarddocka/verktyg/i-dockans-takt.ts` och
   `lagg-pa-bord.ts` (skillen `ny-dealer`, "Efterarbetet").
6. **Granska** (skillen `granska-film`) och visa det som ett prov (skillen `visa-for-jakob`). Det som ligger utanför
   märks, döljs aldrig.

Signerade adresser läggs i en skriptfil i slasken, aldrig i `node -e`, `data/` eller `assets/`. Högst två ffmpeg.

## Modellerna

Vad Runway har i dag (alla modeller, fält, gränser och listpriser, och var det färska står): skillen `runway`. Här står
det vi beställer med och vad proven har visat.

| Modell | Till | Kostar (krediter) |
| --- | --- | --- |
| Kling 4 (`kling-4`, i API:t `kling_4`) | en film ur stillbilder av personen gjorda ur dockans rutor (första bild, upp till åtta mellanbilder, sista bild, ingen referensfilm); med dockans film som referens; redigering från en annan stol | 1080p med en referensfilm lika lång som filmen: 22,56 per s till 2026-11-30, sedan 28,2 (11,28, sedan 14,1, per s ut plus lika mycket per s av det längre av infilm och utfilm); utan referensfilm 18,8, sedan 23,5 (3 s med mellanbilder: 57). Liggarna b19 och b20 mätte 21,3 |
| WAN 3 (`wan3`) | första och sista bild; billig sållning | 20 per s; 5 per s i 480p |
| Aleph 2 (`aleph-2`, i API:t `aleph2`) | ett prov för en person vid livebordet: dockans film omgjord till honom med styrbilden vid sekund 0 (tionde provet) | 28 per påbörjad sekund av dockans film, minst 56; liggaren drog hela sekunder nedåt (3,6 s: 84), utkastet räknar uppåt (112) |
| GPT Image 2.6 Sunburst (`gpt_image_2_6_sunburst`) | stillbilderna av personen ur dockans rutor, `2560:1440`: startbilden ur rutan och hans bilder, resten som ändringar av den | 10 för startbilden, 8 per ändring (elfte provet) |

- **Kling 4 med stillbilder** följer bilderna och lägger kortet där sista bilden har det, men lägger bilderna i sin egen
  takt; filmen får dockans takt efteråt. Rutor där dockan står i samma ställning får den att hitta på ett eget drag, och
  bilder efter landningen med kortet på olika ställen får kortet att glida: välj rutorna vid rörelsens händelser och gör
  bilderna efter landningen som ändringar av sista bilden (skillen `runway`, trettonde provet).
- **Kling 4 med referensfilm** kopierar referensfilmens väg, takt, kortets storlek och var kortet står på kant nästan
  bildpunkt för bildpunkt; utseende, sko och var kortet ligger kommer ur bilderna. Referensfilmen ska sluta som sista
  bilden, och blicken måste stå i bilderna. En referens till en annan plats lägger kortet där referensen gör. Förra
  tagningen som referens ger samma film igen: gör om dockans film i stället.
- **WAN 3** ger 30 rutor/s; de två sista rutorna mörknar och tas bort i efterarbetet; utan referens ritar den ofta ett
  tryckt spelkort.
- **Färgerna** skiljer (Kling 4 BT.709-märkt, WAN 3 omärkt); scenens `filmEven` jämnar ut skarven efter postens
  `source.model`, så modellen i posten måste stämma.
- **Texten:** bilderna säger vem och var, texten bara rörelsen; en handling per film, positivt formulerad, utan
  bildpunkter eller tider; vändningen i en mening. Klings egen guide för Kling 4 (2026-11-04) säger annat om tider:
  rörelsen beskrivs med en tidsangivelse per moment ("0–2 s: …"), varje bilds och films roll sägs ut ("Use @Image1 as
  the first frame"), och en redigering skrivs "Edit @Video1 …, keep everything else unchanged". Runway varnar för att
  tiderna är anvisningar till modellen, inte klipp som träffar exakt på rutan. Prövat 2026-11-27 (skillen `runway`,
  sjunde provet): med dockans film som referens gav tider och utsagda roller samma film som utan, för referensfilmen
  bestämmer takten. Skriv därför utan tider när en referensfilm finns. Med stillbilder säger texten per ruta hur kortet
  står, ur rörelsens tal.
- **Andra stolar** (2026-11-18, 2026-11-24): kameran på samma höjd och lutning, bara flyttad. Kling 4 som redigerare
  (`/v1/video_to_video`) med dockans film från stolens öga och stolens ankare som första bild fick hans "Bra".
- **Vila:** WAN 3, 4 s, A1 först och sist och en liten handling i texten; korta vilor klipps ur en film som återvänder
  till A1 (Jakob: "gillar dessa korta klipp!").
- **Föll, gör inte om:** hela rundan i en tagning (0 av 7, cirka 3 500 krediter); Kling 3.0 4K (ingen skärpevinst);
  Kling 3.0 Motion Control (ingen sista bild); en mellanbild som referensbild i Kling 4 (MCP:s `generate_video` har
  inga mellanbilder; API:ts `"middle"` håller, skillen `runway`, åttonde provet); Aleph som rättare; en stängd giv till en
  spelarplats; handbyte i given utan referens; en ny person i en annans bankruta.
- **En ny modell:** en post i `MODELS` (`blackjack-dealer/src/order-model.ts`), ett pris i orderpolicyn, ett efterarbete i
  `TREATMENTS` (`blackjack-dealer/src/film-after.ts`) och en pilot.
