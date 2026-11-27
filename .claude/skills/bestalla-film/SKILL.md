---
name: bestalla-film
description: Använd i blackjack-dealer när en film eller stillbild ska beställas hos Runway, från önskemål till utkast, godkännande, att lägga och hämta tagningen, efterarbete och mått, eller när en beställning som föll ska förklaras. Gäller Bordet och Beställ, data/orders/, order-new, order-approve, order-put, order-collect, runway-api, film-after och valet av modell, bilder och referensfilm. Inte granskningen (granska-film) eller en hel ny dealer (ny-dealer).
---

# Beställa en film eller stillbild

Kommandon körs från `blackjack-dealer/`; sökvägar räknas från casino-roten. Texterna står i
`blackjack-dealer/src/order-prompts.ts`, recepten per steg i `blackjack-dealer/data/order-methods.json`, taken, fullmakten
och priserna i `blackjack-dealer/data/order-policy.json`. Upprepa dem inte; ändra dem där.

## Jakobs ramar

- Betalt bara inom fullmakten (`blackjack-dealer/AGENTS.md`, "Det som skyddar Jakob här"); läs saldot före en omgång.
- **Bara sätt som håller, och en pilot först** (2026-11-24): `node tools/verdicts-per-method.ts paow` räknar sätten ur
  hans domar, inte granskarens poäng. Godkännandet släpper EN pilot av ett oprövat sätt och inget som föll.
- **En ändring och en tagning per metodprov, två tagningar per klipp** när metoden är vald, en tredje bara om båda
  faller; varje omgång granskas oberoende i full upplösning före nästa, och kostnaden sägs efteråt (2026-11-12,
  2026-11-13, 2026-11-18).
- **Färre val** (2026-11-18): ankaret och platsen; resten är stegets recept, och Beställ visar exakt text och bilder som
  går till Runway (2026-11-21). Texten ändras i mallen efter vad proven visar, aldrig för hand (2026-11-17).
- **Klicket är kön** (2026-11-13): en godkänd order läggs utan att han säger till. Paows träd fylls med kommandon, en giv
  per kort och plats tills trädet är fullt (2026-11-21).
- **Underlag** (2026-11-12): bara tagningar han har godkänt rakt av. Astrids och Kevins stående material används inte.
- **Givarna** (2026-11-23): naturlig rörelse före dockans ("var inte extremt nitsk med dockans rörelse"); snabbare än
  förgångarna och inte kopior, men bara händerna med kortet skyndas; cirka 1,3 s ut och 0,8 s tillbaka; giv och
  återgång i samma film, och sista given går direkt till A1 utan att passera A2. Plats 6 och 7 som 1–5: vänster arm tar
  ut kortet, höger tar emot och vänder upp. Fria givar är varianter med namn ("kan man inte frångå bara lite?"). En
  nästan bra film görs om "bara litegranna" (2026-11-24). Ingen A3-bild behövs (2026-11-24).
- **Filmens lins (Standard)** gäller för nya filmer, aldrig Bred lins; före en massbeställning en godkänd helgiv med rätt
  hand och tempo (2026-11-19, då jämförelse B).

## Vägen

1. **Utkast:** Bordet, Inspelning steg 3, eller `node tools/order-new.ts paow "A2.3 - A3P4C2"`; där metoden gäller
   `node tools/produce.ts paow --draft`; med dockans film `node tools/doll-order.ts paow P5.C1` (alltid från A2.3;
   `--fran a2-1` för nypet, som vägras där dockan inte kan göra det; planens Handbyte väljer ingenting, 2026-11-25). Ett
   avsteg från receptet är ett namngivet undantag i utkastets anteckningar.
2. **Godkänn:** `node tools/order-approve.ts <id> --mandate "<uppdraget, på vems ord>"` upp till 500 krediter; större
   bara med hans klick eller `--jakob "<hans ord och datum>"`. Hashen fryses: en ändring är en ny order.
3. **Lägg:** `node tools/order-put.ts check <id>`; ladda upp bilderna (MCP `init_upload`, PUT, `complete_upload`);
   `order-put.ts begin <id> <n>` före anropet; anropa exakt det `begin` skriver ut, med `confirmRepeat: true` från
   tagning 2; sedan genast `placed <id> <n> <taskId> <saldo> --via mcp`, eller `failed` med felet ordagrant. Inget svar:
   skriv inget, tagningen är OSÄKER och läggs aldrig om. Utan MCP: `node --env-file=.env.local tools/runway-api.ts lagg
   <id>` och `hamta <id>` (liggaren `blackjack-dealer/.runtime/runway-api/ledger.json`).
4. **Hämta:** `get_task` var 60–120 s, högst 25 minuter; `node tools/order-collect.ts <id> <n> --url '<adress>'`, sedan
   `status … HÄMTAD`. Originalet `take-<n>/source.*` ändras aldrig.
5. **Efterarbeta:** `node tools/film-after.ts <id> <n>` (modellen väljer behandlingen; annan form än första bilden
   vägras). Stillbild: stegen i `blackjack-dealer/tools/python/README.md` och `blackjack-dealer/tools/still-after.ts`.
6. **Mät:** kortets storlek inom ±10 % från skon till bordet, landat inom 5 px från planen, vilken hand som lade det,
   `node tools/flip-axis.ts <klipp>` och `dealCheck` i `after.json`. Det som ligger utanför märks, döljs aldrig.
7. **Granska** (skillen `granska-film`) och för in: `node tools/order-bring.ts <id> <n>` till bankens inkorg och Material;
   en tur och retur delas av sig själv (`--split <ruta>` när ingen säker ruta finns).

Signerade adresser läggs i en skriptfil i slasken, aldrig i `node -e`, `data/` eller `assets/`. Högst två ffmpeg.

## Modellerna

Vad Runway har i dag (alla modeller, fält, gränser och listpriser, och var det färska står): skillen `runway`. Här står
det vi beställer med och vad proven har visat.

| Modell | Till | Kostar (krediter) |
| --- | --- | --- |
| Kling 4 (`kling-4`, i API:t `kling_4`) | givar med dockans film som referens, returer, helfigur (16:9, två delar), redigering från en annan stol | 1080p med en referensfilm lika lång som filmen: 22,56 per s till 2026-11-30, sedan 28,2 (11,28, sedan 14,1, per s ut plus lika mycket per s av det längre av infilm och utfilm); utan referensfilm 18,8, sedan 23,5. Liggarna b19 och b20 mätte 21,3 |
| WAN 3 (`wan3`) | ingång A1 → A2.1, vila, utgång, hålkortets vändning | 20 per s; 5 per s i 480p för billig sållning |
| Nano Banana Pro | keystone och ankare, som redigering av dealerns egen bild (`@anchor`) | 40 per 4K-bild |

- **Kling 4** kopierar referensfilmens väg, takt, kortets storlek och var kortet står på kant nästan bildpunkt för
  bildpunkt; utseende, sko och var kortet ligger kommer ur bilderna. Referensfilmen ska sluta som sista bilden, och
  blicken måste stå i bilderna. En referens till en annan plats lägger kortet där referensen gör. En avläst dockfilm med
  en text som säger annat föll (fem av sex); en byggd naturlig cykel som "rough guide" höll. Förra tagningen som
  referens ger samma film igen: gör om dockans film i stället.
- **WAN 3** ger bankens ruta i 30 rutor/s; de två sista rutorna mörknar och tas bort i efterarbetet; utan referens ritar
  den ofta ett tryckt spelkort.
- **Färgerna** skiljer (Kling 4 BT.709-märkt, WAN 3 omärkt); scenens `filmEven` jämnar ut skarven efter postens
  `source.model`, så modellen i posten måste stämma.
- **Texten:** bilderna säger vem och var, texten bara rörelsen; en handling per film, positivt formulerad, utan
  bildpunkter eller tider; vändningen i en mening. Så har våra givar gjorts. Klings egen guide för Kling 4 (2026-11-04)
  säger annat om tider: rörelsen beskrivs med en tidsangivelse per moment ("0–2 s: …"), varje bilds och films roll sägs
  ut ("Use @Image1 as the first frame"), och en redigering skrivs "Edit @Video1 …, keep everything else unchanged".
  Runway varnar för att tiderna är anvisningar till modellen, inte klipp som träffar exakt på rutan. Prövat 2026-11-27
  (skillen `runway`, sjunde provet): med dockans film som referens gav tider och utsagda roller samma film som utan,
  för referensfilmen bestämmer takten. Skriv därför utan tider när en referensfilm finns.
- **Andra stolar** (2026-11-18, 2026-11-24): kameran på samma höjd och lutning, bara flyttad. Kling 4 som redigerare
  (`/v1/video_to_video`) med dockans film från stolens öga och stolens ankare som första bild fick hans "Bra".
- **Vila:** WAN 3, 4 s, A1 först och sist och en liten handling i tillägget. En ny uppsättning får vilor lokalt ur den
  gamlas (`blackjack-dealer/tools/python/hands-from-anchor.py`); korta vilor klipps ur en film där hon återvänder till
  A1 ("gillar dessa korta klipp!", `tools/register-derived.ts --frames`).
- **Föll, gör inte om:** hela rundan i en tagning (0 av 7, cirka 3 500 krediter); Kling 3.0 4K (ingen skärpevinst);
  Kling 3.0 Motion Control (ingen sista bild); en mellanbild i Kling 4; Aleph som rättare; en stängd giv till en
  spelarplats; handbyte i given utan referens; en ny person i en annans bankruta.
- **En ny modell:** en post i `MODELS` (`blackjack-dealer/src/order-model.ts`), ett pris i orderpolicyn, ett efterarbete i
  `TREATMENTS` (`blackjack-dealer/src/film-after.ts`) och en pilot.
