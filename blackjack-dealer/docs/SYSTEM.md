# System: kontrakten koden bygger på

Format, register och gränssnitt som flera delar delar. Bara det som gäller; varför står i commitmeddelandena. Slå upp
rubriken du behöver.

## Format och koordinater

| Vad | Värde | Källa |
| --- | --- | --- |
| Bankens ruta (film och ankare) | 1764 × 1174 | `FILM` i `src/scene3d-geometry.ts`; `readRgb` i `tools/order-images.ts` vägrar annan storlek |
| Planens ruta (Kortplan) | 1762 × 1174; film-x = plan-x × 1763/1761 | `VIEWS.native` i `src/placement-model.ts`; `planToFilm` i `src/table-lens.ts` |
| Bildfrekvens | WAN 3 30/s, Kling 24/s; banken behåller varje films takt | `source.fps`, `fpsOf` i `src/game-film.ts` |
| Bordskanten | rad 831,5; dealerkantens mitt (881,5; 831,5); kroppen slutar på rad 825–831 | `data/scene-contract.json`; `edgeCheck` i `src/film-after.ts` |
| Grönt | ingen fast färg: nyckeln läser varje rutas hörn | shadern i `src/scene3d-film.ts` |
| Order-id, klipp-id | `<dealer>-<steg>-<plats>-<nn>`; klipp `<order-id>-<tagning>` | `nextId` i `tools/order-store.ts`; `clipIdOf` i `tools/register-order.ts` |

Bildpixlar räknas från övre vänstra hörnet med y nedåt; normaliserad bildrymd har `u` åt höger och `v` uppåt i `[0,1]`.
Originalmätningar och referenshashar bevaras; en adapter konverterar vid en uttrycklig systemgräns.

## 3D-scenen

Fristående TypeScript-moduler som webbläsaren läser direkt (typavskalade av servern), three.js 0.180.0 via
importkartan, ingen bundler. `/scene3d.html` har alla reglage; `/game.html` bygger samma scen utan panel. En ny modul
under `src/` skrivs först in i `SCRIPTS` i `tools/lab-routes.ts`, sedan omstart, sist importen (`tools/lab-modules.test.ts`).

- **Lagren**, bakifrån: rummet (`data/scene-rooms.json`), bordet och rekvisitan, filmen (nycklad mot rutans egen gröna
  och projicerad från filmkameran, `src/scene3d-film.ts`; egen ruta med `motion.frame`), de ritade korten och ljuset.
  Ljuset kommer ur rummet, inga målade sken; duken han vill ha är `assets/scene/table.png`. Jakob 2026-11-17: scenen
  "fantastiskt", bordet från en backad kamera "fruktansvärt fult".
- **Läget** är `SceneState` (`scene.set({...})`, samma ord i adressen); förvalen i `DEFAULTS` i `src/scene3d-view.ts`. Varje
  nyckel står som data i `studio/lib/scene-keys.ts`, märkt D (bör nå spelaren) eller U (utvecklarens kalibrering).
  Förvalen Jakob sade ja till 2026-11-13: ljuset utjämnat mellan filmer (`filmEven`), liv i överkroppen
  (`dealerLife`), kopparna i relingen; filmerna i filmad fart (`filmTempo` 1). Looken Jakob-1 och Bred lins är hans
  val (2026-11-20, `studio/lib/scene-presets.ts`); Använd i Casino sparar Scen-vyn i `data/scene-presets/casino.json`.
- **Gränssnittet** för spelsidan är `createScene` i dealermeter (x tvärs bordet, s från dealerkanten, y upp).
- **Filmkön** (`players.play`): en ny kedja börjar när delen på skärmen är klar, `cut` byter direkt. `diagnos=1`
  (`src/game-diagnosis.ts`) skriver webbläsaren, senaste fel och köns läge på bilden.
- **Filmkameran** läses ur `data/scene-contract.json`; med geometrin `lens` är den bordets lins (Ritade kort).

### Sko och markerbricka som GLB

Jakobs modeller ligger som original under `assets/props/source/`, namngivna med SHA-256 i `data/props.json`.
`node tools/prop-glb.ts <id>` gör dem scenfärdiga: en vanlig GLB utan Draco, meshopt eller KTX2, Y upp, mynning eller
långsida mot +Z, PBR, storlek i meter och origo under föremålet, i `assets/props/<id>.glb` med kvitto.
`src/game3d-props.ts` läser den och lägger den med `scene.addProp`. Skon visas inte i spelet än: filmens sko ligger kvar
tills dess pixlar kan maskas bort.

## Spelet

`game/` är Scouts blackjackkärna, förd hit oförändrad i sak (regler, sko, slump med journal, signaler;
`game/provenance.json` per fil). Den importerar aldrig från `src/`. `game/seats.ts` är enda översättningen från Scouts
boxar 0–6: allt annat räknar plats 1–7. `game/session.ts` är en lokal enspelarsession; servern håller en per bord,
och kopian kör motorn i sidan (`cloud/studio/game-local.ts`). Hålkortets valör lämnar aldrig servern före vändningen.

- **Gränsen:** kärnan äger regler, kortvärden, hålkortet och pengar; presentationen (`src/game-view.ts`, regissören,
  filmen, scenen) räknar inga kortvärden och ändrar inget saldo. Hållet av `tools/game-session.test.ts` och
  `tools/game-view.test.ts`.
- **Spelets bank** (`judgedBank` i `src/game-director.ts`): bara tagningar med dom, utan `review.labOnly` och inte
  arkiverade. Utan `?trad=` spelas bara träd med läget `spelas`. Saknas en film: retur till vila via `READY>IDLE`,
  kortet med filmen i `STAND_IN_FILM`, plats från A2.2 enligt `SEAT_HUB`; luckorna står i `window.game.gaps`. Efter
  en giv väljs en retur med handen som lade kortet (`motion.releaseHand`). Dealerns första kort (D.C1) ligger stängt
  och D.C2 öppet (Jakob 2026-11-24).
- **Dela ut går före väntande vilor** (Jakob 2026-11-23): vilan som visas spelas klart och ingången är nästa film
  (`tools/game-film.test.ts`).
- **På en telefon** täcker markerna och konsolen aldrig bordet, också liggande, och filmen före spelet ligger i mitten
  (Jakob 2026-11-14, 2026-11-17; `placeConsole` i `src/game-page.ts`).

## Ritade kort

Filmens kort har ingen valör: gult är ryggen (stängt) och blått framsidan (öppet), en sort per sida överallt (Jakob
2026-11-17, 2026-11-20, 2026-11-24). Blå sidan bär rosa kryss och röd prick, gula sidan fylld röd cirkel och rosa kryss
nära kortänden. `CARD_RGB` och `CARD_MARK` i `src/placement-model.ts`; Kortplan, dockan
(`dealer3d/src/card-marks.ts`) och beställningens bild (`layCard` i `tools/order-images.ts`) ritar samma märken.
Ingen vit kant (Jakob 2026-11-17, 2026-11-23). Kortet är rent tills efterarbetet; valören ritas när rundan spelas.

| Del | RGB |
| --- | --- |
| Gul rygg | 241, 216, 0 |
| Blå framsida | 0, 130, 218 |
| Rosa kryss | 255, 120, 200 |
| Röd prick | 225, 30, 35 |

- **Kortspåret** `assets/tracking/<klipp>/card-track.json` (`node tools/track-card.ts <klipp>`): läge, vridning och sida
  per ruta. Scenen ritar ett riktigt kort där med filmens kort nycklat bort, och bara när fyrhörningen är trolig.
- **Ett kortformat:** planens kort är standard och allt annat anpassar sig ("Storleken är inte problemet, utan att det
  finns olika format").
- **En geometri** (`TABLE_GEOMETRY` i `src/card-plan.ts`): `lens` är förval, ett verkligt kort 63 × 88 mm genom
  `TABLE_LENS` (`src/table-lens.ts`); `planCardQuad` är enda regeln för planens kort, och plan, spel och scen håller
  samma fyrhörning inom en hundradels bildpunkt (`tools/card-plan.test.ts`). Kontraktets äldre väg (`geometri=kontrakt`)
  lever kvar i bland annat `createLayout`, `cameraFromContract` och `viewUnder`, och med flit i `tools/card-coverage.ts`
  och `tools/placement-backdrop.ts`.
- **En linje för korten** (Jakob 2026-11-13): ritade kort hela vägen, en storlek (`cardScale` 1,2 = ett verkligt kort,
  storlek 1,00 i Efterarbete), en brytare i spelet. Kortmattan är ett val i studion, inte spelets. Överlägg i handen
  (`cardInHand`) är av i grunden; hans val i Scen följer med Använd i Casino (2026-11-19, 2026-11-24). Det styva kortet
  ritas med en storlek från hand till bord (2026-11-23). Storleken ändras bara i Efterarbete, aldrig i Kortplan.

## Kortplanen

`placements/default.json` är Jakobs plan: 16 kort (P1–P7 och D, två var) och D.C3. Bara Bordet skriver filen, när han
trycker Spara (Jakob 2026-11-11, 2026-11-12); har han ställt in korten där gäller det (2026-11-23). Formen och
`validatePlan` i `src/placement-model.ts`: geometri per `native`/`portrait` (bara `native` läses); `angle` grader medurs;
`perspective` 0,80–0,96 ändrar bara kortens form, ett värde för alla (hans 87 %; 2026-11-18); `intent.grip` `PINCH`
(A2.1) eller `DRAG` (A2.2), `turnAt` `AIR` eller `PLACE`. Under korten ligger den valda dealerns docka
(`tools/placement-backdrop.ts`). `node tools/media-audit.ts --fit --write` mäter bilder och filmer mot planen
(`data/media-fit.json`, brickorna i Material) och körs om när plan, lins eller ankare ändras.

## Klippbank och nodnotation

Rundor räknas av `resolveRound` i `src/clip-graph.ts` och spelas likadant i studion, 3D-scenen och spelet. Noderna är
ankarposer: `IDLE` (A1), `READY` (A2.1), `READY-B` (A2.2), `READY-C` (A2.3), ett landningsankare per kort (`P4.C1`,
`D.C2`), `AWAY` (utan dealer), `REVEAL(D.C1)`. Varje klipp är en kant `A>B`; en runda är kanter i följd:

```text
IDLE>READY | READY>P1.C1 | P1.C1>READY | READY>D.C1 | D.C1>READY | READY>P1.C2 | P1.C2>READY | READY>D.C2 | D.C2>IDLE
```

- `@<klipp-id>` efter en kant låser en tagning. Kartan räknas ur `data/clip-jobs.json` och filmregistret. Rundan byggs
  av noderna: egna vägar ur de noder som finns, inga förval (Jakob 2026-11-17).
- **Ankarregeln och skarvregeln:** en retur som börjar på landningsankaret passar varje tagning av given; en retur som
  börjar på en ruta ur ett givklipp passar bara det, som klipps där (`first.frame.index`, `motion.landingFrame`).
- **En film per plats** är förval: kort 2 spelar kort 1:s film med det ritade kortet flyttat, när det slutar på samma
  sida (Jakob 2026-11-11, 2026-11-19). Banken behöver 33 filmer; en runda 21 steg.
- **Vilan** är korta `IDLE>IDLE`-klipp, spelade från ruta 3 till tre rutor före slutet; `pickIdle` väljer med viktad
  slump (aldrig samma två i rad, två lugna och en gest). Godkända vilor går in i slingan av sig själva (2026-11-14).
- **Domar** i tagningens `review`: Primär (`acceptedAs: "MAIN"`), Godkänd, Variant, Underkänd, anteckning; skrivna bara
  av Granska och Karta (`tools/review-store.ts`, `If-Match` mot revisionen). Utan Primär spelas stegets godkända filmer i
  tur (Jakob 2026-11-24). Karta visar Primär och högst tre sekundära per steg (2026-11-17).
- **Preliminär dom** (`node tools/review-put.ts`): aldrig `MAIN`, `userAccepted: false` och blocket `provisional`;
  väntar inte i hans kö, och hans beslut tar bort det.
- **Arkivera** (Karta): `review.archived {by, at, where}`; spelas aldrig, går inte till kopian, ingen fil flyttas.
- **Träd och kompositioner:** ett träd är en uppsättning ankare (`data/dealer-trees.json`); `tools/dealer-tree.ts` lägger
  varje film i trädet vars ankare är dess första och sista bild, mätt mot 36 steg (`src/dealer-trees.ts`). Omkring tre
  namngivna träd per dealer, löst material för sig (2026-11-21). En komposition (`data/dealer-compositions.json`,
  `src/composition.ts`) lägger ihop träd med andelar, lån av steg och `tempo` 1–2 (Jakob 2026-11-23); ett klipp har sin
  egen fart (`tools/clip-speed.ts`). Träd med olika händer får sättas samman; Karta säger det som upplysning, och en sådan
  spelas bara när han väljer den (2026-11-24). Spelet i studion tar `?trad=<id>` eller `?komposition=<id>`.

## Ett rörelseregister och tydliga bevis

- Filmregistret är ensam källa för en films klassning och Jakobs beslut: en post per film och tagning i
  `data/motions.jsonl`, läst och skriven bara genom `tools/register-store.ts`; arbetskopian är SQLite under
  `.runtime/register/`. En skrivning mot äldre revision nekas (409). Läs en post: `node tools/register.ts get <id>`.
- En film som tas bort tar sina poster med sig; domen står kvar i `data/motions-removed.jsonl`. `sweep --dry` visar
  poster vars film saknas. Hand, pose, sida, spelstatus, mål och variant hålls isär; okänt är `null`/`UNKNOWN`.
- Original ligger i `assets/motions/<klipp>/source.mp4`; en rättad version har egen hash och pekar på originalet.

## Material

`data/media-roles.json` ger varje bild en roll och ett tillstånd (`gäller`, `kandidat`, `ersatt`, `arkiverad`), valt av
Jakob i Material (2026-11-18); varje ändring får en rad i `stateBy`, där ett verktyg anger `who` och `where`. Klipp
byggda på en äldre bild märks (`studio/lib/lineage.ts`).

## Beställningen: vad som skickas

Till Runway går exakt text, modell, längd och format, första bild, oftast sista bild och ibland en referensfilm; inget
annat. En order är `data/orders/<id>.json` (formen i `src/order-model.ts`): stegen i `STEPS`, korten i `SEAT_TARGETS`,
modellerna i `MODELS`, tagningarnas gång i `TAKE_FLOW` (GODKÄND → LAGD → KLAR → HÄMTAD → EFTERARBETAD → MÄTT →
GRANSKAD → INFÖRD; OSÄKER läggs aldrig om). Förvalen kommer ur stegets enda recept (`data/order-methods.json`,
`recipeFor` i `src/order-methods.ts`), texten ur `promptFor` i `src/order-prompts.ts` (`TEMPLATE_VERSION`; en order
återges med sin egen version). En godkänd order ändras aldrig (`approval.orderSha256`). Bilder och kvitton:
`assets/orders/<id>/`; priser och tak: `data/order-policy.json`.

## Dockan

Dockan i `dealer3d/` är en vit docka i bordets verkliga geometri vars filmer styr beställningarnas rörelse; vit med flit
(Jakob nej till Meshy-modellen av Paow 2026-11-18). En docka per dealer med dealerns mått, naturlig och inte "kuvad"
(2026-11-21, 2026-11-23; `dealer3d/src/doll.ts`).

- `dealer3d/src/doll-choices.ts` är enda källan för vad dockan kan göra med planens kort; Kortplan, Ställ dockan och
  `tools/doll-order.ts` läser den.
- En sparad rörelse per kort och ankare (2026-11-23): `dealer3d/standard/<docka>-<plats>.json` är A2.3,
  `<docka>-a2-1-<plats>.json` A2.1. Naturlig ställning är förval; handens vinkel 17° när kortet tas och −30° när det
  är vänt (2026-11-23, `dealer3d/src/natural.ts`); landningen väljs (`dealer3d/src/landing.ts`).
- Rutor räknas från 0, ark och filnamn från 1. En dockfilm förs in i `data/rendered-references.json` av huvudagenten,
  med nytt id varje gång. Mappen läser `placements/default.json` men skriver den aldrig.

## Tal och munlappar

En talfilm är en vilotagning på begäran (`motion.idle.onRequest`) med ett block `speech`; `src/speech-lines.ts` väljer den
för en replik. En munlapp (`MouthPatch` i `src/speech-patch.ts`) är en film och en replik som läggs på filmen medan den
spelas (`src/scene3d-mouth.ts`); spelet hittar lapparna i `data/speech-patches.json`, som bara `node tools/speech-patch.ts
register` skriver. Talverktyget (`tools/speech.ts`, register `data/speech.json`) tar bara filmer i 24 rutor/s; färgen
räknas som Chrome läser filmerna (BT.709). Den neutrala munnen är standard för Paows repliker (Jakob 2026-11-21).
Scoutgamings renderer har ett avsiktligt lås som vi inte går förbi; munnen i realtid görs av en egen körare ur öppen
källkod (2026-11-17), aldrig med en köpt läppmodell (2026-11-24).
Fakta per dealer står i `data/lipsync.json` (studions Lipsync); köraren i `tools/python/mouth-runner`.

## Ordlista och gräns mot Scout

Orden Jakob ser står i studions ordlista (`studio/lib/words.ts`); de följer hans ord, och sidornas ord rättas efter
den (Jakob 2026-11-17).

| Ord | Betydelse |
| --- | --- |
| Ingångsbild, keystone, ankare | Ingångsbild: vilken bild som helst av personen. Keystone: förlaga i hög upplösning på vitt, stående och sittande; spelas aldrig. Ankare: rutan i bankens format som filmer börjar och slutar på (Jakob 2026-11-12). |
| A1, A2.1, A2.2, A2.3, A3PnCm | Vila (`IDLE`); nyp i skons fönster (`READY`, `PINCH`); handen över kortet, släp (`READY-B`, `DRAG`); båda händerna vid skon (`READY-C`); där kortet har landat, plats n, kort m. Alltid A och numret, aldrig en bokstav efter; en vinkel från stol 2 skrivs S2-A2.2 (Jakob 2026-11-21). |
| Ingång, utgång, hon kommer, hon går | A1 till ett A2; tillbaka till A1; `AWAY>IDLE`; `IDLE>AWAY`. |
| Riktning, lutning, perspektiv | Kortets tre mått, med en normal 0°, 0°, 87 % (Jakob 2026-11-12). |
| `LH`, `RH` | Dealerns anatomiska vänster och höger. |
| `BACK`, `EDGE`, `FRONT` | Observerad kortsida mot kameran; `CLOSED`/`OPEN` är bara etiketter. |
| `TAKE`, `PASS`, `TURN`, `LAND`, `RELEASE` | Ta kortet, handbyte, vända, landning, släpp: olika händelser och rutor. |

Plats 1 är kamerans vänster, plats = Scouts box + 1; given börjar på plats 7 och går mot plats 1, sedan dealern.
Scoutgaming äger regler, slump, kortvärden och händelser; inget ändras där härifrån, och ingen spelmotor skrivs här utom
`game/`. `P4.C2` är ingen körtids-id: vid split krävs hand-id, och Scout behåller kortets id (dragnumret). Filmkoden
importerar från `game/`, aldrig tvärtom.

## Återbruk och införande

Görans material (Jakobs fristående blackjack-studio) används inte: grundbilden är gjord ur ett foto utan noterat
tillstånd. Fritt att återbruka därifrån: regelmotorn, pengar, spelare, möbler, panoramarummen och Poly Havens texturer
(CC0). En fil som hämtas från en läsreferens registreras i `data/manifest.json` med hash och ursprung.
