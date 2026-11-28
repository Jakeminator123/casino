# System: kontrakten koden bygger på

Format, register och gränssnitt som flera delar delar. Bara det som gäller; varför står i commitmeddelandena. Slå upp
rubriken du behöver.

## Format och koordinater

| Vad | Värde | Källa |
| --- | --- | --- |
| Standardens bild (dockfilm, stillbild, beställning, efterarbete) | 1728 × 972 | `bild` i `src/standard.ts` (`LIVE_CAMERA.film` i `src/table-live.ts`) |
| Klippbankens och kortplanens bild | bankens 1764 × 1174, planens 1762 × 1174; film-x = plan-x × 1763/1761 | `FILM` i `src/plan-lens.ts`; `VIEWS.native` i `src/placement-model.ts`; `planToFilm` i `src/card-plan.ts`; `readRgb` i `tools/order-images.ts` vägrar annan storlek |
| Bildfrekvens | dockornas rörelser och editorns filmer 30/s; WAN 3 30/s, Kling 24/s; banken behåller varje films takt | `fps` i rörelsen; `source.fps`, `fpsOf` i `src/game-film.ts` |
| Bordskanten | vid livebordet dealerkantens mitt (`LIVE.edge`), i bilden den rad där kameran ser den; i bankens bild rad 831,5 | `setupCamera` i `src/scene3d-geometry.ts`; `data/scene-contract.json`, `edgeCheck` i `src/film-after.ts` |
| Grönt | ingen fast färg: nyckeln läser varje rutas hörn | shadern i `src/scene3d-film.ts`; `../standarddocka/verktyg/lagg-pa-bord.ts` |
| Order-id, klipp-id | `<dealer>-<steg>-<plats>-<nn>`; klipp `<order-id>-<tagning>` | `nextId` i `tools/order-store.ts`; `clipIdOf` i `tools/register-order.ts` |

Bildpixlar räknas från övre vänstra hörnet med y nedåt; normaliserad bildrymd har `u` åt höger och `v` uppåt i `[0,1]`.
Originalmätningar och referenshashar bevaras; en adapter konverterar vid en uttrycklig systemgräns. Rutor räknas från
0, ark och filnamn från 1.

## Standarden: livebordet

Livestandarden (rotens `AGENTS.md`): ett riktigt livebord mätt på film i `../live-bj/` och kopierat hit, så att inget
läser `../live-bj/` när det körs. Måtten står i `src/table-live.ts` (`LIVE`, `LIVE_CAMERA`), kortet och vektorerna i
`src/space.ts`, och `STANDARD` i `src/standard.ts` är det som allt som spelar in, beställer, redigerar och visar läser;
den kopierar inga mått. Varje tal säger hur säkert det är (mätt, skattat, slutlett, antaget). Talen står utskrivna i
`../MATT.md`, och `tools/standard.test.ts` håller dem.

| Del | Vad | Källa |
| --- | --- | --- |
| Världen | livebordets linsvärld i meter: x mot bildens höger (dealerns vänster), y upp med filten på 0, z mot spelarna, kameran rakt över origo | `src/table-live.ts` |
| Kameran | brännvidd, lutning nedåt, rullning och höjd över filten, mätta ur korten på filten; bilden 1728 × 972 | `LIVE_CAMERA`, `liveFrame`, `liveSee`, `liveOnFelt` |
| Bordet | en halvcirkel med rak kant mot dealern; rullen runt bågen och längs kanten mot dealern, och hyllan bakom kanten vid dealerns höger | `LIVE.felt`, `LIVE.rail`, `LIVE.shelf`; `STANDARD.bord` |
| Kortet | ett verkligt kort, 63 × 88 mm, 0,3 mm tjockt, hörn 3,5 mm | `CARD` i `src/space.ts` |
| Kortplatserna | där korten först låg stilla, i meter med sin vinkel; dagens platser räknas från bildens vänster | `LIVE.cards`; `STANDARD.kortplatser()`, `liveCardHeading` |
| Insatserna | de mätta insatsmärkena, och våra ringar kring dem | `LIVE.betMarks`; `BET` i `src/standard.ts` |
| Skon, lådan och den lösa biten | en klar sko, en klar låda för använda kort vid dealerns höger och en lös klar bit framför skon; ingen markerbricka | `LIVE.shoe`, `liveShoePose`, `liveShoeCard`; `LIVE.box`, `liveBox`; `LIVE.clearPiece` |
| Dealern | hur de två riktiga dealrarna sitter (axlarna, axelbredden, ögonens höjd), en per stil | `LIVE.dealer` |
| Dockorna | Danilo (stilen `kameran`), Frasse (`bordet`) och persondockorna | `LIVE_DOLLS` i `dealer3d/src/doll.ts`; `STANDARD.dockor` |

**Vem följer den:** dockornas rörelser och editorn i `../standarddocka/`, inspelningen och varje beställning, bordet i
Blender (`../avatar-auto-pipeline/scen/standard.yaml`, skriven ur den här filen), 3D-scenen (kameran `setupCamera` i
`src/scene3d-geometry.ts`, bordet `tableUnder` i `src/scene3d-table.ts`, kortplatserna och ringarna `setupSpots` och
`setupBets`, skon och lådan `liveProps` i `src/game3d-props.ts`) och spelet (`createLayout` i `src/game-table.ts`:
spelets kort på de mätta platserna genom kameran).

Tre lager (Jakob 2026-11-25: "grunden måste vara densamma"):

- **Standarden** (inspelningen) är de fasta måtten ovan: dockan, inspelningen, scenens grund och varje beställd film
  utgår från den.
- **Spelvyn** är hur spelet ramar in bilden: en inramning för dator och en för mobil (zoom, lutning och vridning från
  filmkamerans egen plats, så att filmen förblir exakt). Den sparas på Jakobs klick och gäller alla utseenden:
  `data/play-view-live.json` (`spelvyFil` i `src/standard.ts`), `src/play-view.ts`, `tools/play-view-store.ts`,
  `/api/play-view`. Utan fil gäller `STANDARD.spelvy`.
- **Utseendet** läggs ovanpå och sparas som ett förval (`data/scene-presets/`, `tools/scene-preset-store.ts`; Casino
  spelar `casino`): rum, duk och filtfärg, bordets storlek, hur korten ritas och kamerans flytt. Ett utseende bär egen
  inramning bara när han har slagit på "Egen inramning i det här utseendet".

Lagren, sist vinner: scenens grund (`DEFAULTS` i `src/scene3d-view.ts`) → spelvyns Dator → utseendets nycklar →
adressens nycklar (`lookState` i `src/game-look.ts`, `effective` i `studio/lib/scene-presets.ts`); på en telefon gäller
alltid spelvyns Mobil. Reglagen och deras gränser står i `studio/lib/scene-keys.ts`. Ett utseende ändrar aldrig
standardens mått och har ingen egen kamera: scenens kamera är alltid livebordets, i verkliga meter med skalan 1.
Nyckeln `lins` (Standard eller Bred lins) väljer bara hur de ritade kortens storlek räknas (`cardGrow` i
`src/card-plan.ts`). Ett utseende eller en adress med äldre nycklar (`scale`, `lens`, `tableModel` med flera) läses
utan dem (`RETIRED_KEYS` i `src/game-look.ts` och `studio/lib/scene-keys.ts`).

**Kortens form i spelet.** Inspelningen och beställningarna har alltid ett verkligt kort. Hur spelets kort ritas är
utseendets: nyckeln `cardTaper`, 0,80–0,96 med hans 87 % som förval för djup i bordet (2026-11-17, 2026-11-18;
`CARD_TAPER` i `src/card-plan.ts`).

## 3D-scenen

Fristående TypeScript-moduler som webbläsaren läser direkt (typavskalade av servern), three.js 0.180.0 via
importkartan, ingen bundler. `/scene3d.html` har alla reglage; `/game.html` bygger samma scen utan panel. En ny modul
under `src/` skrivs först in i `SCRIPTS` i `tools/lab-routes.ts`, sedan omstart, sist importen (`tools/lab-modules.test.ts`).

- **Lagren**, bakifrån: rummet (`data/scene-rooms.json`), bordet och rekvisitan, filmen (nycklad mot rutans egen gröna
  och projicerad från filmkameran, `src/scene3d-film.ts`; egen ruta med `motion.frame`), de ritade korten och ljuset.
  Ljuset kommer ur rummet, inga målade sken; duken han vill ha är `assets/scene/table.png`. Jakob 2026-11-17: bordet
  från en backad kamera är "fruktansvärt fult".
- **Läget** är `SceneState` (`scene.set({...})`, samma ord i adressen); förvalen i `DEFAULTS` i `src/scene3d-view.ts`.
  Varje nyckel står som data i `studio/lib/scene-keys.ts`, märkt D (bör nå spelaren) eller U (utvecklarens
  kalibrering). Förvalen han sade ja till 2026-11-13: ljuset utjämnat mellan filmer (`filmEven`), liv i överkroppen
  (`dealerLife`), kopparna i relingen, filmerna i filmad fart (`filmTempo` 1). Utseendena som följer med studion står
  i `studio/lib/scene-presets.ts`.
- **Gränssnittet** för spelsidan är `createScene` i dealermeter (x tvärs bordet, s från dealerkanten, y upp).
- **Filmkön** (`players.play`): en ny kedja börjar när delen på skärmen är klar, `cut` byter direkt. `diagnos=1`
  (`src/game-diagnosis.ts`) skriver webbläsaren, senaste fel och köns läge på bilden.
- **Filmkameran** är livebordets (`setupCamera`); rummets bilder är komponerade för kontraktets kamera
  (`cameraFromContract`, `data/scene-contract.json`). Filmens bildmått och rullning hör till kameran (`FilmCamera`
  `frame` och `roll`), också i shaderkoden (`FILM_PX` och `FRAME_FIX`).
- **Föremålen:** skon, lådan och korten i dem ritas ur måtten (`liveProps` i `src/game3d-props.ts`) och läggs med
  `scene.addProp`. Jakobs äldre modeller från Meshy står namngivna med SHA-256 i `data/props.json`; originalen ligger
  inte i repot.

## Spelet

`game/` är Scouts blackjackkärna, förd hit oförändrad i sak (regler, sko, slump med journal, signaler;
`game/provenance.json` per fil). Den importerar aldrig från `src/`. `game/seats.ts` är enda översättningen från Scouts
boxar 0–6: allt annat räknar plats 1–7. `game/session.ts` är en lokal enspelarsession; servern håller en per bord,
och kopian kör motorn i sidan (`cloud/studio/game-local.ts`). Hålkortets valör lämnar aldrig servern före vändningen.

- **Gränsen:** kärnan äger regler, kortvärden, hålkortet och pengar; presentationen (`src/game-view.ts`, regissören,
  filmen, scenen) räknar inga kortvärden och ändrar inget saldo (`tools/game-session.test.ts`,
  `tools/game-view.test.ts`).
- **Spelets bank** (`judgedBank` i `src/game-director.ts`): bara tagningar med dom, utan `review.labOnly` och inte
  arkiverade; utan `?trad=` bara träd med läget `spelas`. Saknas en film: retur till vila via `READY>IDLE`, kortet med
  filmen i `STAND_IN_FILM`, en plats från ett annat ankare vid skon enligt `SEAT_HUB`; luckorna står i
  `window.game.gaps`. Utan filmer visas bordet, skon och korten utan dealer (`players.still`). Efter en giv väljs en
  retur med handen som lade kortet (`motion.releaseHand`). Dealerns första kort (D.C1) ligger stängt och D.C2 öppet
  (Jakob 2026-11-24).
- **Dela ut går före väntande vilor** (Jakob 2026-11-23): vilan som visas spelas klart och ingången är nästa film
  (`tools/game-film.test.ts`).
- **På en telefon** täcker markerna och konsolen aldrig bordet, också liggande, och filmen före spelet ligger i mitten
  (Jakob 2026-11-14, 2026-11-17; `placeConsole` i `src/game-page.ts`).

## Ritade kort

- **Kortet** är ett verkligt kort (`CARD` i `src/space.ts`), med bordets rygg och framsidor ur kortatlasen i
  `../avatar-auto-pipeline/assets/bord/kort/`. I editorns nyckelutseende är dockans kort ett spårkort, gul rygg (röd
  med vit kant med `--rygg rod`) och vit framsida med turkos ram och ett märke, så att filmmodellen ser det och
  efterarbetet hittar det. Efterarbetet tar bort det och ritar vårt eget kort ur dockans tal genom livebordets kamera,
  slätt och lika stort hela filmen (`../standarddocka/verktyg/lagg-pa-bord.ts --docka`; Jakob 2026-11-27: inget "rött
  överlägg", ryggen "ska i och för sig vara mönstrat röd"). Kortet är rent tills efterarbetet; valören ritas när
  rundan spelas.
- **En linje för korten** (Jakob 2026-11-13): ritade kort hela vägen, en storlek (`cardScale` 1,2 = ett verkligt kort),
  en brytare i spelet. Överlägg i handen (`cardInHand`) är av i grunden (2026-11-19, 2026-11-24).
- **Klippbankens filmer** har ett kort utan valör, gul rygg och blå framsida med märken (`CARD_RGB` och `CARD_MARK` i
  `src/placement-model.ts`, `layCard` i `tools/order-images.ts`), och ett kortspår per klipp
  (`assets/tracking/<klipp>/card-track.json`, `node tools/track-card.ts <klipp>`). Scenen ritar ett riktigt kort där,
  med filmens kort nycklat bort, när fyrhörningen är trolig. Planens kort: `planCardQuad` i `src/card-plan.ts` är enda
  regeln, ett verkligt kort genom `TABLE_LENS` (`src/plan-lens.ts`).

## Kortplanen

Kvar av den äldre dealerns värld (`STATUS.md`). `placements/default.json` är Jakobs plan: 16 kort (P1–P7 och D, två var) och D.C3, i klippbankens bild och läst genom
bankens kamera (`src/plan-lens.ts`), som ingenting spelar in, beställer eller visar genom. Den skrivs bara av honom
(`tools/placement-store.ts`, `If-Match` mot revisionen). Formen och `validatePlan` i `src/placement-model.ts`:
geometri per `native`/`portrait` (bara `native` läses); `angle` grader medurs; `intent.grip` `PINCH` (A2.1) eller
`DRAG` (A2.2), `turnAt` `AIR` eller `PLACE`; de övriga fälten i `intent` läses bara av receptets text
(`tools/order-store.ts`). Kortets form är inte planens, och en fil med de äldre fälten `perspective`, `shoe` och
`reviewed` läses och sparas utan dem. Kortplatserna vid livebordet är de mätta (`LIVE.cards`), inte planens.
`node tools/media-audit.ts --fit --write` mäter bilder och filmer mot planen (`data/media-fit.json`).

## Klippbank och nodnotation

Rundor räknas av `resolveRound` i `src/clip-graph.ts` och spelas likadant i studion, 3D-scenen och spelet. Noderna är ankarposer: `IDLE` (A1), `READY`
(A2.1), `READY-B` (A2.2), `READY-C` (A2.3), ett landningsankare per kort (`P4.C1`, `D.C2`), `AWAY` (utan dealer),
`REVEAL(D.C1)`. Varje klipp är en kant `A>B`; en runda är kanter i följd:

```text
IDLE>READY | READY>P1.C1 | P1.C1>READY | READY>D.C1 | D.C1>READY | READY>P1.C2 | P1.C2>READY | READY>D.C2 | D.C2>IDLE
```

- `@<klipp-id>` efter en kant låser en tagning. Banken räknas ur `data/clip-jobs.json` och filmregistret; rundan byggs
  av noderna som finns, utan förval (Jakob 2026-11-17).
- **Ankarregeln och skarvregeln:** en retur som börjar på landningsankaret passar varje tagning av given; en retur som
  börjar på en ruta ur ett givklipp passar bara det, som klipps där (`first.frame.index`, `motion.landingFrame`).
- **En film per plats** är förval: kort 2 spelar kort 1:s film med det ritade kortet flyttat, när det slutar på samma
  sida (Jakob 2026-11-11, 2026-11-19).
- **Vilan** är korta `IDLE>IDLE`-klipp, spelade från ruta 3 till tre rutor före slutet; `pickIdle` väljer med viktad
  slump (aldrig samma två i rad, två lugna och en gest). Godkända vilor går in i slingan av sig själva (2026-11-14).
- **Domar** i tagningens `review`: Primär (`acceptedAs: "MAIN"`), Godkänd, Variant, Underkänd, anteckning; skrivna bara
  av Granska (`tools/review-store.ts`, `If-Match` mot revisionen). Utan Primär spelas stegets godkända filmer i tur
  (Jakob 2026-11-24). En preliminär dom (`node tools/review-put.ts`) är aldrig `MAIN`, har `userAccepted: false` och
  blocket `provisional`, väntar inte i hans kö, och hans beslut tar bort den. Arkiverad (`review.archived {by, at,
  where}`) spelas aldrig och går inte till kopian; ingen fil flyttas.
- **Träd och kompositioner** (den äldre dealerns, kvar i koden tills de tas bort med bankens register; `STATUS.md`):
  ett träd (`data/dealer-trees.json`, `src/dealer-trees.ts`) är en uppsättning händer, ankare med en A1;
  `tools/dealer-tree.ts` lägger varje film i trädet vars ankare är dess första och sista bild. Ett träds A1 kan
  förgrena sig till flera ankare vid skon (`ways`, var och en spelbar som ett träd med `?trad=<id>`), och Gör primär
  sänker bara det samma träd spelar (`primaryMates`). En komposition (`data/dealer-compositions.json`,
  `src/composition.ts`) lägger ihop träd med andelar, lån av steg och `tempo` 1–2 (Jakob 2026-11-23), och spelas med
  `?komposition=<id>`. Omkring tre namngivna träd per dealer, resten löst material (2026-11-21); träd med olika händer
  får sättas samman, och en sådan spelas bara när han väljer den (2026-11-24).

## Register

- **Filmregistret** är ensam källa för en films klassning och Jakobs beslut: en post per film och tagning i
  `data/motions.jsonl`, läst och skriven bara genom `tools/register-store.ts`, med arbetskopian i SQLite under
  `.runtime/register/`. En skrivning mot äldre revision nekas (409). En film som tas bort tar sina poster med sig;
  domen står kvar i `data/motions-removed.jsonl`, och `sweep --dry` visar poster vars film saknas. Hand, pose, sida,
  spelstatus, mål och variant hålls isär; okänt är `null`/`UNKNOWN`. Original ligger i
  `assets/motions/<klipp>/source.mp4`; en rättad version har egen hash och pekar på originalet.
- **Bildregistret** `data/media-roles.json` ger varje bild av en dealer en roll och ett tillstånd (`gäller`,
  `kandidat`, `ersatt`, `arkiverad`), som bara Jakob väljer (2026-11-18); varje ändring får en rad i `stateBy`
  (`tools/media-roles.ts`, `GET /api/media`). Klipp byggda på en äldre bild märks (`studio/lib/lineage.ts`).

## Beställningen: vad som skickas

Till Runway går exakt text, modell, längd och format, första bild, oftast sista bild och ibland en referensfilm; inget
annat. En order är `data/orders/<id>.json` (formen i `src/order-model.ts`): stegen i `STEPS`, korten i `SEAT_TARGETS`,
modellerna i `MODELS`, tagningarnas gång i `TAKE_FLOW` (GODKÄND → LAGD → KLAR → HÄMTAD → EFTERARBETAD → MÄTT →
GRANSKAD → INFÖRD; OSÄKER läggs aldrig om). Förvalen kommer ur stegets enda recept (`data/order-methods.json`,
`recipeFor` i `src/order-methods.ts`), texten ur `promptFor` i `src/order-prompts.ts` (`TEMPLATE_VERSION`; en order
återges med sin egen version). En godkänd order ändras aldrig (`approval.orderSha256`). Bilder och kvitton:
`assets/orders/<id>/`; priser och tak: `data/order-policy.json`. Orderns bilder har standardens mått (`ORDER_PICTURE`),
och efterarbetet (`tools/film-after.ts`) skalar filmen till standardens bild; vid livebordet mäts varken det gröna,
kanten eller landningen (`notMeasured` i `after.json`). En äldre order kan bära `uppsattning: "live"`; inget annat
värde tas.

**Ett prov för en person som inte är dealer än** (en person blir dealer först när Jakob har dömt hans filmer, skillen
`ny-dealer`): `node tools/order-new.ts --person <namn> GIV-2.3 P4.C1 --reference <dockfilm>`. Ordern har `person` (id
och namn) i stället för `dealer`, referensfilmen är dockans film (med `doll`), och styrbilden är personens bild av
filmens första ruta, registrerad med filmen (`styrbilder` i `data/rendered-references.json`,
`tools/doll-reference-put.ts --person`), som `keyframe` vid sekund 0. Modellen gör om filmen (`edits` i `MODELS`:
Aleph 2, `/v1/video_to_video`), utan första och sista bild, längd eller upplösning; priset är 28 krediter per påbörjad
sekund av dockans film (`priceOf`), och texten är `personPrompt`. Bara titel och tagningar ändras i utkastet, och
`tools/register-order.ts` för inte in filmen i någon bank.

**Ett anrop utanför Beställ** (`node tools/runway-api.ts place <anrop.json>`): `{name, what, endpoint, body,
expectCredits}`, där en fil i `body` skrivs `"$file:<sökväg>"`. Anropet står i liggaren
`.runtime/runway-api/ledger.json` innan det skickas, inom taken i `data/order-policy.json` (`OrderMandate` i
`src/order-model.ts`), och ett namn tas en enda gång. Så läggs stillbilderna och filmerna som
`../avatar-auto-pipeline/ny_dealer.py` skriver.

## Dockan

Dockorna i `dealer3d/` sitter vid livebordet: Danilo och Frasse, byggda efter de två riktiga dealrarna i filmen
(stilarna `kameran` och `bordet`), och persondockorna, byggda på deras grund ur en persons bilder
(`dealer3d/src/persondockor.ts`, skriven av `../avatar-auto-pipeline/ny_dealer.py`). Alla har samma skelett, med de
bennamn `dealer3d/src/figure-model.ts` letar efter; måtten står i `dealer3d/src/doll.ts` (`LIVE_DOLLS`) och mäts på
modellen med `dealer3d/tools/docka-matt.ts`.

- **Rörelserna** är lyfta ur filmen av livebordet: `dealer3d/tools/lyft-till-docka.ts` lägger lyften i
  `../live-bj/data/lyft/` på varje docka i dess stil, i livebordets linsvärld. I `dealer3d/data/` är
  `lyft-<docka>-till-bytet.json` givens gemensamma första halva (A2.3 till handbytet A2M, `ankare-byte-<docka>.json`),
  `lyft-<docka>-bytet-p<n>.json` och `-bytet-p<n>c2.json` den andra halvan per plats och kort (till kortplatsen och hem
  till A2.3), och `lyft-<docka>-p<n>.json` och `-p<n>c2.json` hela given; `lyft-<docka>-vantan-<n>.json` är en väntan i
  vilan, `-till-skon` och `-hem` vägen mellan vilan och skon, och `ankare-vila-<docka>.json` (A1) och
  `ankare-skon-<docka>.json` (A2.3) ankarena. Det råa lyftet är sanningen om var händerna är; det som är vårt eget står
  i verktygets huvud och i rörelsens `made`, som också säger vilken av filmens givar rörelsen kommer ur. Filerna skrivs
  aldrig för hand. Kontrollen är `dealer3d/tools/lyft-kolla.ts` och testet `dealer3d/tests/lyft-till-docka.test.ts`.
- **Formatet**, per ruta: armarna `R` och `L` (axel `s`, armbåge `e`, handled `w`, `k`, 21 punkter `p` per hand),
  huvudet `h`, blicken `g`, huvudets eget mål `hv`, minen `a` och kortet `card` (mitt `c`, långsida `l`, framsidans
  normal `n`); rörelsen bär `fps`, `frameCount`, `hip`, `ankare` och i `made.times` händelsernas rutor.
- **Rörelseschemat** står i `../standarddocka/rorelsekatalog.json` och visas i Karta.
- **Editorn** (`../standarddocka/editor/`) spelar rörelserna som de är och filmar dem genom livebordets kamera eller en
  plats kamera (`../standarddocka/verktyg/titta.ts`). En dockfilm förs in i `data/rendered-references.json` av
  huvudagenten, med nytt id varje gång (`tools/doll-reference-put.ts`, läst där klippet ligger i
  `../standarddocka/klipp/`, med `--kamera`).

## Tal

Spelet har inget tal: det dealern säger står i chatten (`src/game-chat.ts`), och varje film spelas utan ljud. Görs ett
tal igen: Scoutgamings renderer har ett avsiktligt lås som vi inte går förbi, och munnen i realtid görs av en egen
körare ur öppen källkod (2026-11-17), aldrig med en köpt läppmodell (2026-11-24). Kvar tills inget läser dem:
`src/speech-lines.ts` och `data/speech.json`.

## Ordlista och gräns mot Scout

Orden Jakob ser står i studions ordlista (`studio/lib/words.ts`); de följer hans ord, och sidornas ord rättas efter
den (Jakob 2026-11-17).

| Ord | Betydelse |
| --- | --- |
| Ankare | En ställning som klipp börjar och slutar i (rörelseschemat); i klippbanken rutan i bankens bild som filmer börjar och slutar på (Jakob 2026-11-12). |
| A1, A2.1, A2.2, A2.3, A2M, A3PnCm | Vila (`IDLE`); nyp i skons fönster (`READY`, `PINCH`); handen över kortet, släp (`READY-B`, `DRAG`); båda händerna vid skon (`READY-C`); handbytet, kortet på kant mellan händerna; där kortet har landat, plats n, kort m. Alltid A och numret, aldrig en bokstav efter; en vinkel från stol 2 skrivs S2-A2.2 (Jakob 2026-11-21). |
| Ingång, utgång, hon kommer, hon går | A1 till ett A2; tillbaka till A1; `AWAY>IDLE`; `IDLE>AWAY`. |
| Riktning, lutning, perspektiv | Kortets tre mått, med en normal 0°, 0°, 87 % (Jakob 2026-11-12). |
| `LH`, `RH` | Dealerns anatomiska vänster och höger. |
| `BACK`, `EDGE`, `FRONT` | Observerad kortsida mot kameran; `CLOSED`/`OPEN` är bara etiketter. |
| `TAKE`, `PASS`, `TURN`, `LAND`, `RELEASE` | Ta kortet, handbyte, vända, landning, släpp: olika händelser och rutor. |

Dagens plats 1 är bildens vänster (dealerns höger), plats = Scouts box + 1; given börjar på dagens plats 7 och går mot
plats 1, sedan dealern. Bytet till plats 1 närmast skon är beslutat men inte gjort (rotens `AGENTS.md`). Scoutgaming
äger regler, slump, kortvärden och händelser; inget ändras där härifrån, och ingen spelmotor skrivs här utom `game/`.
`P4.C2` är ingen körtids-id: vid split krävs hand-id, och Scout behåller kortets id (dragnumret). Filmkoden importerar
från `game/`, aldrig tvärtom.

## Återbruk

Görans material (Jakobs fristående blackjack-studio) används inte: grundbilden är gjord ur ett foto utan noterat
tillstånd. Fritt att återbruka därifrån: regelmotorn, pengar, spelare, möbler, panoramarummen och Poly Havens texturer
(CC0). En fil som hämtas från en läsreferens registreras i `data/manifest.json` med hash och ursprung.
