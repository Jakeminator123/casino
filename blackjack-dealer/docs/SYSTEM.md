# System: kontrakten koden bygger på

Format, register och gränssnitt som flera delar delar. Bara det som gäller; varför står i commitmeddelandena. Slå upp
rubriken du behöver.

## Format och koordinater

| Vad | Värde | Källa |
| --- | --- | --- |
| Bankens ruta (film och ankare) | 1764 × 1174 | `FILM` i `src/table-lens.ts` (Standarden nedan); `readRgb` i `tools/order-images.ts` vägrar annan storlek |
| Uppsättningens ruta | förra standarden 1764 × 1174, livebordet 1728 × 972; en beställning, en dockfilm och en films post säger sin uppsättning, och utan fältet gäller den förra | `bild` i `src/uppsattning.ts`; `uppsattningOf`, `pictureOf` i `src/order-model.ts` |
| Kortplanens ruta | 1762 × 1174; film-x = plan-x × 1763/1761 | `VIEWS.native` i `src/placement-model.ts`; `planPixel` i `src/table-lens.ts` (`planToFilm` i `src/card-plan.ts` ger samma) |
| Bildfrekvens | WAN 3 30/s, Kling 24/s; banken behåller varje films takt | `source.fps`, `fpsOf` i `src/game-film.ts` |
| Bordskanten | rad 831,5; dealerkantens mitt (881,5; 831,5); kroppen slutar på rad 825–831. Livebordets rad är där dess kamera ser dealerkantens mitt | `data/scene-contract.json`; `edgeCheck` i `src/film-after.ts`; `dealerEdgeRow` i `tools/order-images.ts` |
| Grönt | ingen fast färg: nyckeln läser varje rutas hörn | shadern i `src/scene3d-film.ts` |
| Order-id, klipp-id | `<dealer>-<steg>-<plats>-<nn>`; klipp `<order-id>-<tagning>` | `nextId` i `tools/order-store.ts`; `clipIdOf` i `tools/register-order.ts` |

Bildpixlar räknas från övre vänstra hörnet med y nedåt; normaliserad bildrymd har `u` åt höger och `v` uppåt i `[0,1]`.
Originalmätningar och referenshashar bevaras; en adapter konverterar vid en uttrycklig systemgräns.

## Standarden: en kamera, ett bord, ett kort

**Två uppsättningar** (Jakob 2026-11-27: det klonade livebordet är den nya standarden, den förra står kvar som val).
`src/uppsattning.ts` är listan som allt som väljer läser, och den kopierar inga mått:

| Uppsättning | Vad | Källa |
| --- | --- | --- |
| `live`, Livebordet | egen bild 1728 × 972, kameran 18,13° ned och rullad −0,16°, filten en halvcirkel, en klar sko och en låda, kortplatserna i meter med sin lutning, mätta insatsmärken, ingen markerbricka, Danilo och Frasse | `LIVE`, `LIVE_CAMERA` i `src/table-live.ts` |
| `forra`, Förra standarden | tabellen nedan: bankens bild, linsen, ovalen, filmens sko, kortplanens platser, mannen och kvinnan | `src/table-lens.ts`, kortplanen |

- **Förvalen hålls isär.** Valets förval är `live` (`VALETS_FORVAL`: editorn, `titta.ts`, beställningarna och det som
  görs nytt); datats förval är `forra` (`DATATS_FORVAL`): ett träd, en film, en beställning eller ett sparat val utan
  fältet `uppsattning` är förra standardens, så inget som finns skrivs om. Adressordet är `uppsattning=live|forra`
  (editorns äldre `standard` läses som `forra` och skrivs aldrig); i studion heter valet Bord och kamera, eftersom
  "uppsättning" redan betyder en dealers sats ankare.
- **Träden** bär fältet (`TreeDef.uppsattning` i `src/dealer-trees.ts`); en film har det genom trädet den står i, som
  kameran, och en film i inget träd är den förras (`treeSetup`, `filmSetups`). Spelet visar ordets uppsättning, annars
  filmernas: livebordet när ett träd gjort vid det spelas, annars förra standarden med en rad som säger det (`playedCut`,
  `GET /api/trees?spel=1&uppsattning=`). Utan egna filmer visas bordet, skon och korten utan dealer (`players.still`).
- **En film visas aldrig under en annan uppsättnings kamera.** Spärren ligger i scenens dörr för filmer (`guardFilms` i
  `src/scene3d-view.ts`): varje del säger sin films uppsättning (`Part.uppsattning`, utan fält den förra;
  `filmenPassar` i `src/uppsattning.ts`), och en kedja eller en film med en del från en annan uppsättning vägras hel, med
  orsaken i ord (`status().refused`). En film som står i bild när scenen flyttas till en annan uppsättning stannar och
  ritas inte. Spelet sätter fältet ur sitt snitt (`createFilm`, en komposition är den förras), Scen ur träden
  (`partsOf` med `filmSetups`). Scen står vid menyns val: en runda med en film från det andra bordet spelar ingenting
  där, bordet med sin sko och låda (`liveProps`, som spelet) står utan dealer, och en rad säger vems filmerna är och var
  de syns, med en knapp som väljer det bordet. Råfilm visar filmerna som de är. En sida om en viss film (Granska, Karta)
  visar den som den är och säger när den är gjord vid det andra bordet (`FilmTable`), och Kartas "I scenen" öppnar Scen
  vid filmens bord. `tools/uppsattning.test.ts` håller spärren.
- **Scenen** får uppsättningen när den byggs (`SceneData.uppsattning`, `scene.setUppsattning`). Under livebordet gäller
  dess kamera vad linsen än är (`setupCamera` i `src/scene3d-geometry.ts`: bilden och rullningen bärs i kameran, i
  shadern och i vyn, så att den i hemläget är filmkameran bildpunkt för bildpunkt), dess bord (`tableUnder` med
  livebordets halva bredd och djup; halvcirkeln ritas som en halv oval, högst 4 mm från cirkeln), kortplatser och ringar
  (`setupSpots`, `setupBets`), skon och lådan ritade ur måtten (`liveProps` i `src/game3d-props.ts`) och spelets kort
  på de mätta platserna genom dess kamera (`liveLayout` i `src/game-table.ts`). `tools/uppsattning.test.ts` håller det.
- **Spelvyn** har en fil per uppsättning (`spelvyFil`: `data/play-view.json` och `data/play-view-live.json`,
  `tools/play-view-store.ts`); livebordets utgångsläge är dess egen kamera (`spelvy` i `src/uppsattning.ts`).

Förra standarden har tre lager (Jakob 2026-11-25: "grunden måste vara densamma").

- **Standarden** (inspelningen) är de fasta måtten nedan: kameran, bordet, kortet, planens platser, skon och
  markerlådan. Allt utgår från den: dockan, Inspelning, Scens grund och varje beställd film, så att det som produceras
  alltid har samma mått.
- **Spelvyn** är hur spelet ramar in bilden för spelaren: en inramning för dator och en för mobil (zoom, lutning och
  vridning från filmkamerans egen plats, så att filmen förblir exakt). Den sparas en gång, av Jakob i Scen ("Spara som
  spelvy"), och gäller alla utseenden: `data/play-view.json`, `src/play-view.ts`, `tools/play-view-store.ts`,
  `/api/play-view`. Utan fil gäller `PLAY_VIEW` där.
- **Utseendet** läggs ovanpå i Scen när färdigt material sätts ihop, och sparas som ett förval
  (`data/scene-presets/`; Casino spelar förvalet `casino`): rum, bordsmodell, duk och filtfärg, bordets storlek, hur
  korten ritas, markerlåda och sko som modell, kamerans flytt och linsen (nyckeln `lins`: Standard eller Bred lins). Ett
  utseende bär egen inramning bara när han har slagit på "Egen inramning i det här utseendet"; annars följer det
  spelvyn. Vad Scen visar (Inspelningen, Dator eller Mobil) hör till Scen och sparas aldrig med utseendet.

Lagren, sist vinner: scenens grund (`DEFAULTS` i `src/scene3d-view.ts`) → spelvyns Dator → utseendets nycklar →
adressens nycklar (`lookState` i `src/game-look.ts`, `effective` i `studio/lib/scene-presets.ts`); på en telefon gäller
alltid spelvyns Mobil. Reglagen och deras gränser står i `studio/lib/scene-keys.ts`. Ett utseende ändrar aldrig
standardens mått: i Standard är scenens värld verkliga meter och skalan 1, och under Bred lins räknas skalan ur
standarden (`filmCamera` i `src/scene3d-view.ts`, `wideCamera` i `src/scene3d-geometry.ts`). Ett utseende har ingen egen skala och ingen egen kamera: nycklarna `scale`
(Skala k) och `lens` (Dealerns lins) togs bort 2026-11-26, och ett sparat utseende eller en adress som bär dem läses
utan dem (`RETIRED_KEYS` i `src/game-look.ts` och `studio/lib/scene-keys.ts`).

Filmen, dockan, kortplanen, beställningens slutbild och 3D-scenen i Standard delar en kamera, ett bord och ett kort
(Jakob 2026-11-25: "eller detta ska vara en standard ska jag säga"). Talen står en gång, i `src/table-lens.ts`; dockan
anpassar linsen på nytt ur filmen (`filmLens` i `dealer3d/src/world.ts`), och `dealer3d/tests/standard.test.ts` håller
de två lika och planens platser på sina bildpunkter.

| Del | Värde | Källa (`src/table-lens.ts` där inget annat står) |
| --- | --- | --- |
| Bilden | 1764 × 1174; bildpunkternas mitt, origo uppe till vänster | `FILM` |
| Kortet | 63 × 88 mm, 0,3 mm tjockt, hörn 3,5 mm; vid plats 4 nära kanten 84,5 px, 72 px djupt, bortre kanten 96 % av den nära | `CARD`, `SEAT_FOUR_CARD` |
| Linsen | brännvidd 2334 px; synfält 28,2° lodrätt och 41,4° vågrätt; 25,06° ned; 1,110 m över filten; 1,844 m längs filten till dealerkanten (rad 831,5); horisonten ovanför bilden | `TABLE_LENS`; `dealerEdge` i `dealer3d/src/world.ts` |
| Spelets vy | standarddockans filmer tas genom en lägre kamera (Jakob 2026-11-26): samma lins och plats över bordet, 0,58 m över filten och 12° ned. Bankens filmer, planens bildpunkter och skons fot hör fortfarande till linsen ovan; en punkt på bordet räknas till spelets vy med `see(filmEye(PLAY_LENS), punkt)`, och en annan plats kamera med `seatView` | `PLAY_LENS`, `seatView` |
| Bordet | filten är planet y = 0 i verkliga meter, x åt höger, y upp, z mot kameran; kameran står i (0; 1,110; 0) och ser längs −z | `pixelToFelt`, `feltToPixel` |
| Skon | foten fram (1268,1; 895,9) och bak (1666,5; 796,8) px; 0,436 × 0,082 m, 0,131 m hög bak och 0,10 m fram; plåten lutar 51,6°, kortet i fönstret står 22 mm över filten | `SHOE` |
| Markerlådan | försänkt vid dealerkanten: från 0,30 m vänster om bildens mitt till 0,24 m höger om den (slutar före skon), 0,10 m mot spelarna, 0,03 m djup | `TRAY` |
| Bordets form | en halv oval med rak dealerkant: 0,95 m från mitten till filtens kant, 1,15 m djupt (ett verkligt bords; ingen film visar spelarnas kant), sarg 0,10 m; golvet 0,95 m under filten, skivans undersida 0,15 m, två ben 0,58 m från mitten; sargens rulle 10 cm bred | `TABLE_TOP`, `TABLE_BASE`, `TABLE_RAIL` (3D-scenen bygger sitt bord av dem i `src/scene3d-table.ts`, dockan sitt i `dealer3d/src/stage.ts`, som får dem genom `dealer3d/src/world.ts`) |
| Standarddockans bord | lika brett och med samma kortplatser, men en halvmåne: 0,95 m djupt (Jakob 2026-11-26: "mindre äggformat ... mer som en halvmåne"), dealerkanten och markerbrickan 0,23 m bakom spelets kant, där dockan sitter, och skon 8,5 cm längre ut åt dealerns vänster. Bordet och skon ovan är filmernas och gäller de filmer som finns | `DOLL_TABLE`, `dollShoe` (bordets modell byggs av dem i `../avatar-auto-pipeline`, `bygg_bord.py --docka`) |
| Planens ruta | 1762 × 1174; planen sparar `u` och `v` (nerifrån), och `planPixel` ger filmens bildpunkt exakt: x = u × 1763, y = (1 − v) × 1173, samma som `planToFilm` i `src/card-plan.ts` | `planPixel` |

**Vem följer den**

| Vem | Följer | Källa |
| --- | --- | --- |
| Dockan | linsen, bordet, kortet, skon och planens platser. Av dockans sex vyer är Spelets vy förvalet och standarden (Jakob 2026-11-26); Filmens kamera finns kvar för de filmer som finns; Från sidan, Uppifrån, Från spelaren och Nära kortet är till för att titta | `filmLens`, `spots` i `dealer3d/src/world.ts`; `dealer3d/src/stage.ts` |
| Dockans referensfilm | Filmens kamera i bildens storlek, vit docka på grått bord för en filmmodell att följa, 24 rutor/s (verktygets förval är 30) | `dealer3d/tools/render-reference.ts` |
| Beställningens slutbild | kortet där planen säger, genom linsen, ett verkligt kort | `planQuad` i `tools/order-images.ts` |
| Kortplanen | linsen för platsen och storleken, ett verkligt kort | `planCardQuad` i `src/card-plan.ts` |
| 3D-scenen i Standard | filmkameran är linsen i verkliga meter, skalan alltid 1; kortplatser och insatsringar där `pixelToFelt` lägger dem; markerlådan med standardens mått; liggande kort i utseendets form (Kortens form) | `lensCamera` i `src/scene3d-geometry.ts` |
| Spelet i Standard | samma regel som kortplanen, i utseendets form | `createLayout` i `src/game-table.ts` |

Avvikelserna, med flit eller kvar:

- **Kortens form i spelet.** Inspelningen har alltid ett verkligt kort (bortre kanten 96 % av den nära vid plats 4):
  dockan, hennes referensfilm, Inspelning och beställningens slutbild (Jakob 2026-11-26; planens tal för formen läses
  inte längre). Hur spelets liggande och ritade kort ritas är utseendets: nyckeln `cardTaper`, Kortens form i Scen,
  0,80–0,96 med hans 87 % som förval för djup i bordet (2026-11-17, 2026-11-18; `CARD_TAPER` i `src/card-plan.ts`).
  Skillnaden mot inspelningens kort är högst 4 px i de bortre hörnen; de nära hörnen är desamma.
- **Bred lins.** Ett utseende kan välja Bred lins (nyckeln `lins: 'bred'`, levande i Scen och sparad med utseendet;
  Casinos har den, Jakob 2026-11-21): kontraktets äldre vida kamera (`data/scene-contract.json`, brännvidd 886 px) med
  bordets mått räknade ur standarden (Jakob 2026-11-26: Bred lins "som bara kan göras utifrån en standard"; allt i
  `src/scene3d-geometry.ts`). Skalan är hur många av kamerans enheter en verklig meter är tvärs bordet vid dealerkantens
  mitt, räknad genom filmens bildpunkter (1,897; `wideCamera`, aldrig en nyckel); bordets djup och markerlådans djup mot
  spelarna är standardens lagda genom bildpunkterna (`laidDepth`, `trayDeep`); insatsringarna har en regel under båda
  linserna: halva det lagda kortet, ringens radie och 12 mm filt (`ringOffset`). Rummet, filmens plats och vyn behåller
  kontraktets k = 2, eftersom ingen film mäter dem. Korten ritas efter planens äldre plan (`flatQuad`), inte filmens
  lins. Inspelning, dockan och beställningarna följer alltid Standard. Äldre adresser och förval säger `geometri=kontrakt`; ordet läses
  som alias för nyckeln (`linsOfAlias` i `src/card-plan.ts`) och skrivs aldrig.
- **Kortets riktning.** Dockan läser inte ett korts riktning (`angle`) ur planen; alla är 0 i dag.

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
- **Filmkameran** är under linsen Standard bordets lins (`TABLE_LENS`, Ritade kort) och under Bred lins kontraktets
  (`data/scene-contract.json`); `scene.set({lins})` bygger om scenen under den andra kameran utan att sidan laddas om.
  Under livebordet är den livebordets (Standarden ovan). Filmens bildmått och rullning hör till kameran (`FilmCamera`
  `frame` och `roll`), också i shaderkoden (`FILM_PX`, `FRAME_FIX` och `lensRoll` är uniforms som scenen sätter).

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
  kortet med filmen i `STAND_IN_FILM`, en plats från ett annat ankare vid skon enligt `SEAT_HUB` när de fyra filmerna dit
  finns; luckorna står i `window.game.gaps`, också dealerbytet utan film (hon går och kommer). Efter
  en giv väljs en retur med handen som lade kortet (`motion.releaseHand`). Dealerns första kort (D.C1) ligger stängt
  och D.C2 öppet (Jakob 2026-11-24).
- **Dela ut går före väntande vilor** (Jakob 2026-11-23): vilan som visas spelas klart och ingången är nästa film
  (`tools/game-film.test.ts`).
- **På en telefon** täcker markerna och konsolen aldrig bordet, också liggande, och filmen före spelet ligger i mitten
  (Jakob 2026-11-14, 2026-11-17; `placeConsole` i `src/game-page.ts`).

## Ritade kort

**Standardkortet (Jakob 2026-11-26):** kortet i standarddockans editor är standarden, "och finns låsningar och
standarder som säger annat, stryk/radera/ändra det". Det är bordets eget kort ur Blenders modell (63 x 88 mm; ryggen
och framsidorna ur `../avatar-auto-pipeline/assets/bord/kort/`), som editorn i `../standarddocka/` och studions dockvy
ritar i standardrummet (`loadTable` i `dealer3d/src/standard-room.ts`). Standarddockans rörelser och de filmer som görs
av dem utgår från det kortet. Det som står nedan om det gula och blå kortet gäller de filmer som redan finns (Paows)
och de äldre utseendena i dockans scen, tills de är utbytta; ingenting nytt görs med det.

Filmens kort har ingen valör: gult är ryggen (stängt) och blått framsidan (öppet), en sort per sida överallt (Jakob
2026-11-17, 2026-11-20, 2026-11-24). Blå sidan bär rosa kryss och röd prick, gula sidan fylld röd cirkel och rosa kryss
nära kortänden. `CARD_RGB` och `CARD_MARK` i `src/placement-model.ts`; dockan i Inspelning
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
- **En lins som förval** (`LINS` i `src/card-plan.ts`): under Standard ett verkligt kort 63 × 88 mm genom
  `TABLE_LENS` (`src/table-lens.ts`); `planCardQuad` är enda regeln för planens kort, och plan, spel och scen håller
  samma fyrhörning inom en hundradels bildpunkt när de ritar i samma form (`tools/card-plan.test.ts`). Bred lins (Standarden ovan) lever kvar i
  bland annat `createLayout`, `cameraFromContract` och `viewUnder`.
- **En linje för korten** (Jakob 2026-11-13): ritade kort hela vägen, en storlek (`cardScale` 1,2 = ett verkligt kort,
  storlek 1,00 i Efterarbete), en brytare i spelet. Kortmattan är ett val i studion, inte spelets. Överlägg i handen
  (`cardInHand`) är av i grunden; hans val i Scen följer med Använd i Casino (2026-11-19, 2026-11-24). Storleken ändras
  bara i Efterarbete, aldrig i Inspelning.

## Kortplanen

`placements/default.json` är Jakobs plan: 16 kort (P1–P7 och D, två var) och D.C3. Bara Bordet skriver filen, när han
trycker Spara (Jakob 2026-11-11, 2026-11-12); har han ställt in korten där gäller det (2026-11-23). Formen och
`validatePlan` i `src/placement-model.ts`: geometri per `native`/`portrait` (bara `native` läses); `angle` grader medurs;
kortets form är inte planens (ett äldre `perspective` i filen läses och sparas inte längre); `intent.grip` `PINCH`
(A2.1) eller `DRAG` (A2.2), `turnAt` `AIR` eller `PLACE`. Av rörelsen väljs i studion bara sidan dealerns kort ligger
med (`intent.endSide`, Inspelning steg 2; spelarens kort ligger alltid öppet); ingången (A2.1 eller A2.3) är trädets,
inte planens `intent.pass`, och de övriga fälten i `intent` läses bara av receptets text (`tools/order-store.ts`) och
väljs ingenstans (2026-11-25). Planen har inget eget läge för skon och ingen bock för Kontrollerad (2026-11-26): skons
plats är standardens (`SHOE` i `src/table-lens.ts`), och en fil som har fälten `shoe` och `reviewed` läses och sparas
utan dem. En plats flyttas på ett sätt: dra kortet i bilden, piltangenterna eller de två procentfälten.

Bordets del Inspelning är filmens format, där planen ändras och en ny film beställs (Jakob 2026-11-25: "i och med att
videon på själva dealern har ett format så är ju det en standard"; delen hette Kortplan, och i koden och adressen heter
den fortfarande `kortplan`). Den har en bild (Jakob 2026-11-25: "ett och samma läge", "allt i 3d"): dockans 3D-bord i
en ram, med planens kort på filten. Studion skickar sitt utkast till dockans sida, som ritar platserna och lägger given
på nytt; i steg 1 kan kortets plats dras på filten, och sidan svarar med planens egna koordinater. Dockans reglage fästs i studions
högerspalt (elementet `[data-docklabb-styr]`). Orden mellan sidorna (`{docklabb: {...}}`: `ready`, `place`, `entry`,
`plan`, `attach`, `flytta`, `moved`, `saved`, `play`, `film`) står sist i `dealer3d/page/docka.ts`. Kopian på nätet har
ingen docka och visar därför inte Inspelning.

Filmen över dockan (Jakob 2026-11-25: "så man kan jämföra videos som är skapade med tex dockan"): reglaget Filmen i
bildens knapprad lägger kortets film över dockan, i samma ruta och genom samma kamera, och dockans tidslinje driver
filmen. Den syns bara i Filmens kamera i hemläget, eftersom bara den vyn är filmens; där står då filmernas bord (kanten
där filmerna har den) i stället för standardrummets, som ligger närmare dockan. Filmen är trädets egen för kortets
steg, annars den spelet spelar (`cardFilm` i `studio/lib/bordet.ts`); ordet `film` bär adressen, en text och givens
start, slut och fart i filen. `node tools/media-audit.ts --fit --write` mäter bilder och filmer mot planen
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
- **Träd och kompositioner:** ett träd är en uppsättning händer, ankare med en A1 (`data/dealer-trees.json`);
  `tools/dealer-tree.ts` lägger varje film i trädet vars ankare är dess första och sista bild, mätt mot 36 steg
  (`src/dealer-trees.ts`). Trädets A1 kan förgrena sig till flera ankare vid skon (Jakob 2026-11-26): trädets egna
  ankare är dess första gren, den spelet spelar när trädet spelas; `ways` är de övriga grenarna, var och en med eget
  id, namn och läge, som spelet (`?trad=<id>`), kompositionerna och Bordet tar som ett träd. En film på en grens ankare
  vid skon är grenens; en film bara på A1 (vila, tal, hålkort) är trädets och varje grens. Ett ankare med `markOf` är
  samma bild med bara kortets märke ändrat: samma nod. Karta läser ett stegs filmer över trädets eget urval
  (`cutBank`), så att Spelas nu, Primär och Gör primär är trädets egna. Gör primär i Granska sänker också bara det
  samma träd spelar bredvid tagningen (`primaryMates`), aldrig ett annat träds Primär, och Material räknar ett ankare
  med `markOf` som samma nod (`sameNode`). `GET /api/trees` ger varje gren som en egen vy
  (`wayOf`) och trädets vy listan `ways`; `waysOf` och `dealsTo` i `src/dealer-trees.ts` svarar på vilka givar som
  finns till ett kort, från vilken gren. Omkring tre namngivna träd per dealer, löst material för sig (2026-11-21). En komposition (`data/dealer-compositions.json`,
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

**Uppsättningen** (`src/uppsattning.ts`; Jakob 2026-11-27: livebordet är den nya standarden, den förra står kvar som val).
En order, en dockfilm i `data/rendered-references.json` och en films post i `data/motions.jsonl` bär fältet `uppsattning`
bara när det inte är den förra (`uppsattningField`); utan fält gäller den förra, så inget som fanns skrivs om och en
order vid den förra är tecken för tecken vad den var. En ny order görs vid uppsättningen för det den är gjord av: en
dealers order vid hennes ankares (`uppsattning` i `data/dealers.json`, utan fält den förra; Paows), ett prov över en
dockfilm vid filmens. Ett annat ord (`uppsattning` i beställningen) vägras. Bildens mått, kantraden och formen tas ur
uppsättningen: orderns bilder (`pictureOf`), efterarbetet (`tools/film-after.ts` skalar till uppsättningens ruta och mäter
det gröna, kanten och given bara vid den förra, som har den gröna duken) och orden om var kortet ligger
(`placeWords` i `src/order-prompts.ts`, i den förras bildpunkter). Referensfilmer erbjuds bara ur orderns uppsättning
(`referenceCandidates`); den som inte säger någon får den förras.

**Ett prov för en person som inte är dealer än** (huvudagenten på Jakobs principbeslut 2026-11-27: en person blir dealer
först när Jakob har dömt hans filmer, genom skillen `ny-dealer`): `node tools/order-new.ts --person tomasz GIV-2.3 P4.C1
--reference <dockfilm>`. Ordern har ingen `dealer` utan `person` (id och namn), referensfilmen är dockans film som görs
om (med `doll`), och styrbilden är personens bild av filmens första ruta, registrerad med filmen (`styrbilder` i
`data/rendered-references.json`, `tools/doll-reference-put.ts --person`), som `keyframe` vid sekund 0. Modellen gör om
filmen (`edits` i `MODELS`: Aleph 2, `/v1/video_to_video`), utan första och sista bild, längd eller upplösning; priset är
28 krediter per påbörjad sekund av dockans film, uppåt räknat (`priceOf`). Texten är tionde provets med hans utseende i
registrets ord (`personPrompt`). Bara titel och tagningar ändras i utkastet. `tools/register-order.ts` för inte in en sådan
film i någon bank; tagningen hämtas, efterarbetas och granskas som andra.

## Dockan

Dockan i `dealer3d/` är en vit docka i bordets verkliga geometri vars filmer styr beställningarnas rörelse; vit med flit
(Jakob nej till Meshy-modellen av Paow 2026-11-18). En docka per dealer med dealerns mått, naturlig och inte "kuvad"
(2026-11-21, 2026-11-23; `dealer3d/src/doll.ts`).

- En giv beställs från stegets ingång: A2.3 som förval, A2.1 bara när det begärs (`tools/doll-order.ts --fran a2-1`,
  `tools/doll-order.test.ts`). Från A2.1 ger dockan till varje plats, plats 1 och 2 också (Jakob 2026-11-26: "plats
  ett ska få nyp"): vänster arm går över högerhanden som vilar på filten, som i hennes filmer. Ett kort som planen
  lägger stängt vägras från A2.1, eftersom nypet alltid vänder kortet upp (`dealer3d/src/doll-choices.ts`);
  beställningen, dockans sida (`dealer3d/page/lay.ts` placeFrom) och `docka-cykel.ts` vägrar samma kort.
- Sidan ett av dealerns kort ligger med är planens (`intent.endSide`), också i dockans egen sida.
- Standarddockan är grunden: varje grundrörelse (`dealer3d/data/`) läggs på standarddockan och förs över till den valda
  dockan med hennes mått (`dealer3d/page/pose-on-doll.ts`).
- Dockans reglage i Inspelning är till för att pröva och sparas inte (Jakob 2026-11-27: inga äldre versioner eller
  undanlagda kopior); en beställning filmar dockans giv från A2.3 som den läggs utan dem. Från A2.1 ger
  dockan nypets egen rörelse, som inte styrs. En dealers docka ger alltid Naturlig (handens vinkel 17° när
  kortet tas och −30° när det är vänt, `dealer3d/src/natural.ts`; landningen väljs, `dealer3d/src/landing.ts`);
  Standarddockan ger den äldre given.
- Det Inspelning visar är det en beställning filmar (Jakob 2026-11-26: "vattentätt"): en kedja bygger given med
  återgången för både dockans sida och `dealer3d/tools/docka-cykel.ts` (`filmRules`, `filmDeal` och `filmed` i
  `dealer3d/page/natural-lab.ts`; `dealer3d/tests/samma-rorelse.test.ts` håller dem lika ruta för ruta).
  Ett kort som läggs stängt vänds och landas aldrig, och Var kortet vänds, Vändningen börjar och Handens höjd verkar
  inte på det. Reglage som inte kan verka i läget visas inte. Reglagens ändlägen är de
  största värden som går att lägga för alla kort: Kortets fart 150 %, Var kortet vänds 30 % (`ENDS` där). Valen Rörelse,
  Hela given, Vänd vid platsen och raden med rutor i steg 2 togs bort 2026-11-26; Ställning är tre knappar i bildens rad.
- Skons nästa kort står 0,6 mm bakom kortet som dras ut (`dealer3d/src/stage.ts`). Kortets övre ände håller sin
  millimeter över det när kortet glider ut (`two-hand.ts`), och nypets kort bärs aldrig in under plåten
  (`pinch-deal.ts`, `CLEAR.shoe`). Kortet hålls ute ur skon också mellan två rutor, så som sidan ritar det där
  (kvartsrutorna i en film med 24 rutor/s).
- Rutor räknas från 0, ark och filnamn från 1. En dockfilm förs in i `data/rendered-references.json` av huvudagenten,
  med nytt id varje gång (`tools/doll-reference-put.ts`: en körning av `render-reference.ts` eller ett klipp ur editorns
  `../standarddocka/klipp/`, läst där det ligger, med `--uppsattning` och `--kamera`). Mappen läser
  `placements/default.json` men skriver den aldrig.

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
