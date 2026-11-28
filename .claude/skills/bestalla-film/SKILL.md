---
name: bestalla-film
description: Använd i blackjack-dealer när en film eller stillbild ska beställas hos Runway, från utkast till godkännande, att lägga och hämta tagningen, efterarbete och mått, eller när en beställning som föll ska förklaras. Gäller Beställ, data/orders/, order-new, order-approve, order-put, order-collect, runway-api (lagg, hamta, place, collect), film-after och valet av modell, bilder och referensfilm. Inte granskningen (granska-film) eller en hel ny dealer ur bilder (ny-dealer).
---

# Beställa en film eller stillbild

Kommandon körs från `blackjack-dealer/`; sökvägar räknas från casino-roten. Texterna står i `src/order-prompts.ts`,
recepten per steg i `data/order-methods.json`, taken, fullmakten och priserna i `data/order-policy.json`: ändra dem där,
upprepa dem inte. Vilken modell, vilka fält och vad proven har visat: skillen `runway`.

## Jakobs ramar

- Betalt bara inom fullmakten (`blackjack-dealer/AGENTS.md`, "Det som skyddar Jakob här"), och betalda anrop lägger
  bara huvudagenten. Läs saldot före en omgång (`node tools/runway-api.ts org`).
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
  "Beställningen: vad som skickas".

## Två vägar

- **Ett anrop utanför Beställ**, den väg en ny persons film går i dag: `avatar-auto-pipeline/ny_dealer.py` skriver
  anropen färdiga (skillen `ny-dealer`), och andra prov skrivs som `{ name, what, endpoint, body, expectCredits }`.
  Lägg med `node tools/runway-api.ts place <anrop.json>` (`--jakob "<hans ord och datum>"` över fullmakten), läs läget
  gratis med `task <namn>` och hämta med `collect <namn> <fil>`. Anropet står i liggaren
  (`.runtime/runway-api/ledger.json`) innan det skickas.
- **En order i Beställ** (`/studio/bestall/`, `data/orders/<id>.json`, med utkast, godkännande och tagningar, nedan).
  För en person som inte är dealer finns ett prov över dockans film (`--person`, Aleph 2 med styrbilden vid sekund 0);
  det sättet gav Jakobs Nej vid livebordet (skillen `runway`). Recepten i `data/order-methods.json` och vägen för en
  dealer i klippbanken (`node tools/order-new.ts <dealer> <steg>`, `tools/produce.ts`) gäller en dealer i
  `data/dealers.json`, som i dag har ingen.

## Vägen för en order

1. **Utkast:** dockans film in med `node tools/doll-reference-put.ts ../standarddocka/klipp/<klipp>.mp4 --id
   docka-<namn> --from READY-C --to P4.C1 --doll danilo --kamera kameran` (eller `plats-7`), hans styrbild av filmens
   första ruta med `--id <film> --person <namn> --styrbild <bild> --utseende "<orden>"`, sedan `node tools/order-new.ts
   --person <namn> GIV-2.3 P4.C1 --reference <film>`. `--dry` visar utkastet utan att skriva det. Ett avsteg från
   receptet är ett namngivet undantag i utkastets anteckningar. Ett sådant prov förs inte in i någon bank.
2. **Godkänn:** `node tools/order-approve.ts <id> --mandate "<uppdraget, på vems ord>"` inom fullmakten; större bara
   med hans klick eller `--jakob "<hans ord och datum>"`. Hashen fryses: en ändring är en ny order.
3. **Lägg:** `node tools/order-put.ts check <id>`; ladda upp bilderna (MCP `init_upload`, PUT, `complete_upload`);
   `order-put.ts begin <id> <n>` före anropet; anropa exakt det `begin` skriver ut, med `confirmRepeat: true` från
   tagning 2; sedan genast `placed <id> <n> <taskId> <saldo> --via mcp`, eller `failed` med felet ordagrant. **Inget
   svar: skriv inget. Tagningen är OSÄKER och läggs aldrig om.** Utan MCP: `node tools/runway-api.ts lagg <id>` och
   `hamta <id>`; `lagg` tar bara Kling 4 och WAN 3, inte Aleph 2 än.
4. **Hämta:** `get_task` var 60–120 s, högst 25 minuter; `node tools/order-collect.ts <id> <n> --url '<adress>'`,
   sedan `status … HÄMTAD`. Originalet `take-<n>/source.*` ändras aldrig.
5. **Efterarbeta:** `node tools/film-after.ts <id> <n>` skalar filmen till standardens bild (modellen väljer
   behandlingen, `TREATMENTS` i `src/film-after.ts`; annan form än första bilden vägras). Vid livebordet mäts varken
   det gröna, kanten eller landningen (`notMeasured` i `after.json`): filmen granskas med ögat. En stillbild
   efterarbetas inte av något verktyg. En film i nyckelfärger får dockans takt och läggs på vårt bord med
   `standarddocka/verktyg/i-dockans-takt.ts` och `lagg-pa-bord.ts` (skillen `ny-dealer`, "Efterarbetet").
6. **Granska** (skillen `granska-film`) och visa det som ett prov (skillen `visa-for-jakob`). Det som ligger utanför
   märks, döljs aldrig.

Signerade adresser läggs i en skriptfil i slasken, aldrig i `node -e`, `data/` eller `assets/`, och skrivs aldrig i
repot. Högst två ffmpeg.

## Fällorna

- **Texten:** bilderna säger vem och var, texten bara rörelsen; en handling per film, positivt formulerad, utan
  bildpunkter eller tider; vändningen i en mening. Det som syns i klippet och inget annat (skillen `runway`).
- **Färgerna** skiljer mellan modellerna (Kling 4 BT.709-märkt, WAN 3 omärkt); scenens `filmEven` jämnar ut skarven
  efter postens `source.model`, så modellen i posten måste stämma.
- **Föll, gör inte om:** hela rundan i en tagning (0 av 7, cirka 3 500 krediter); Kling 3.0 4K (ingen skärpevinst);
  Kling 3.0 Motion Control (ingen sista bild); en mellanbild som referensbild i Kling 4 (MCP:s `generate_video` har
  inga mellanbilder; API:ts `"middle"` håller); Aleph som rättare; en stängd giv till en spelarplats; handbyte i given
  utan referens; en ny person i en annans bankruta. Det som föll i proven över dockans film står i skillen `runway`.
- **En ny modell:** en post i `MODELS` (`src/order-model.ts`), ett pris i orderpolicyn, ett efterarbete i `TREATMENTS`
  (`src/film-after.ts`) och en pilot.
