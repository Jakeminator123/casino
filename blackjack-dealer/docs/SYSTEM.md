# System och koordinater

Kontrakten koden bygger på: scenen, spelet, koordinaterna, kortplanen, registren, beställningen och klippbanken.
Slå upp ett avsnitt (sök på rubriken), läs inte hela. Engelska systemord, svensk förklaring.

## 3D-scenen (`scene3d.html`)

Fristående TypeScript-moduler som webbläsaren läser direkt (typavskalade av `tools/preview.ts`), three.js 0.180.0 via
importmappen, ingen bundler. `scene3d.html` har alla reglage; `game.html` bygger samma scen utan panel.

| Lager, bakifrån | Vad | Fil |
| --- | --- | --- |
| Rum | Salong, 360°-panoraman ur rumsregistret, plåten (`assets/scene/room.png`) som kuliss och spelhallen (`BuiltRoom`). Halv upplösning, oskarpt efter avstånd. | `src/scene3d-room.ts`, `src/scene3d-hall.ts` |
| Bord och rekvisita | Filten är en platt bild uppifrån (linjer, kortrutor, insatsringar, logga); reling och sarg är geometri. Rekvisita ritas före filmen så att händerna hamnar överst: markerbrädet försänkt (`TRAY`, `table.build(edgeZ, scale, notch)`), föremål med `scene.addProp`, skon som föremål (`?sko=3d`, `loadShoe` i `src/game3d-props.ts`; `scene.hideFilm` lämnar filmens sko oritad). | `src/scene3d-table.ts`, `src/scene3d-props.ts`, `src/scene3d-rail.ts` |
| Film | Nycklas mot rutans egen gröna nivå (övre och nedre vänstra hörnet) och projiceras från filmkameran på ett lodrätt plan vid bordets bakkant och på bordsskivan. Egen ruta: `motion.frame = {scale, anchor, layer, shadow}` (`Part.frame`); punkten (881,5; 831,5), dealerkantens mitt, ligger på `anchor`, och `layer: "BEHIND_TABLE"` ritar henne bakom bordskanten (`behindFrom`, `frameAt`). När hon går backar kameran (`exitView`). Ett andra kortspår (`card-track-grip.json`, `film` och `held` per ruta) spelas med `?spar=grepp`. En del med munlapp (`Part.mouth`) spelas i takt 1. | `src/scene3d-film.ts`, `src/scene3d-mouth.ts`, `src/scene3d-exit.ts` |
| Renderade kort | Se Ritade kort. | `src/scene3d-deal.ts`, `src/card-overlay.ts`, `src/scene3d-matte.ts` |
| Ljus och bild | Fläktskuggan över film, bord och rekvisita (`lit`), rummets ljus längs hennes kontur (`wrap`), vykamera, oskärpa, fokus och slutkomposit. | `src/scene3d-light.ts`, `src/scene3d-view.ts` |

### Scenens nycklar

Scenens läge är `SceneState` (`scene.set({...})`, samma ord i adressen, till exempel `?room=skog&dust=0.7&ui=0`);
förvalen står i `DEFAULTS` i `src/scene3d-view.ts`. Varje nyckel står som data i `studio/lib/scene-keys.ts` (grupp,
etikett, reglage, hjälprad), märkt D (bör nå spelaren) eller U (utvecklarens kalibrering). Utöver dem:

- Rummen: `data/scene-rooms.json` (`readRegister`: bild med hash och källa, oskärpa, ljus, vridning, spegling, luft,
  rumsljud, `game`). Spelets meny visar bara rum med `game: true`; ett nytt rum prövas i labbet först. Sfären visar
  bilden spegelvänd om inte `mirror` säger annat; bordets fotoyta speglar rummet med samma vridning (`ROOM_TURN` 0).
- `tableModel: bord-02` är bordet BORD-02 (`src/scene3d-bord02.ts`); `cloth`, `felt`, `base`, `cups` och hyllan gäller
  bara standardbordet. Materialens kartor är lokal media (`data/scene-materials.json`).
- `roomLife` lägger filmer med folk på rummets sfär (`ROOM_LIFE` i `src/scene3d-room.ts`). En omgjord film får nytt
  namn (`-2`): kopian låter webbläsaren behålla en film ett dygn.
- `tal` (`repliker` eller `av`): talfilm med ljud, eller bara text i chatten. Inramningen per skärm: `format: fill`,
  `FRAMING` i `src/game-page.ts`.

### Scenens gränssnitt för spelsidan

`createScene(canvas, host, data)` i `src/scene3d-view.ts`, i dealermeter (x tvärs bordet, s från dealerkanten mot
spelarna, y upp från filten): `scene.spots()` ger kortplatser och insatsringar som filmkameran lägger dem (läs dem i
rekvisitans `build`; de flyttar sig med lins och skala), `project(x, s, y)` skärmpunkt och punkter per meter,
`pick(clientX, clientY)` punkten på filten, `onFrame(fn)` ett anrop per ruta, och `addProp({group, build(edgeZ,
scale)})` och `lit(material)` för rekvisita.

### Filmkön

`players.play(delar, {loop, cut, onPart, onEnd, onError})`, `hurry(fart)` och `preload(sökvägar)`. En del är `{path,
start, end, rate, track, cards, frame, fps, sound, model, rest, mouth, effect}` (`effect`: `FilmEffect` i
`src/clip-graph.ts`); `scene.mouth` läser lappar i förväg och loggar varje replik. En ny kedja börjar när delen på
skärmen är klar (klipp passar bara ihop i ändarna), `cut` byter direkt, och den gamla rutan ligger kvar tills den nya
finns. Varje del söker till sin första ruta och startas när den är ritad (reservtimer 50 ms).

- En start som webbläsaren nekar (`NotAllowedError`): en film som skulle höras startas tyst och sidan säger repliken
  med eget ljud ([TAL](TAL.md)); nekas den tyst också startas den i besökarens nästa tryck (`touched`). `wake()`
  startar det som står när sidan syns igen. Potten håller 8 element, 5 på pekskärm.
- `diagnos=1` (`src/game-diagnosis.ts`, `players.diagnosis()`; kopians dörrar bär ordet vidare) skriver webbläsaren,
  förlorad bildyta, senaste fel och köns läge på bilden.

### Filmkameran

Filmkameran läses ur `data/scene-contract.json` i `src/scene3d-geometry.ts` (varje tal bär sin grund i
`basisLegend`, `src/scene-geometry.ts`); med geometrin `lens` är den bordets lins (`lensCamera`, Ritade kort). Från
filmkamerans plats är bilden filmen pixel för pixel; vridning och zoom är exakta, förflyttning ett närmevärde som
bryter vid ungefär en stols avstånd. Hemvyns referens (klipp 1 vid 2,9 s, 1764 × 1174):
`assets/proofs/bakgrund-3d-referens/`. Gränser: planens kamera tänjer dealern vid bildkanten när vyn vrids; skalan k är
skattad (1,8–2,5); filmens sko kan inte läggas bakom något utan egen matt; dealern är ett platt utklipp; sko och lyft
arm korsar bordskantsraden 831,5.

### Studion

`studio/` är labbet (Next.js, vyerna i README), byggt till `studio/out/` (`npm --prefix studio run build`) och utlämnat
under `/studio/` av `tools/studio-files.ts`. De rena modulerna (`clip-graph`, `placement-model`, `card-overlay`,
`card-track`) byggs in; 3D-scenen läses i körtid från servern (`labModule` i `studio/lib/lab.ts`) med samma
importkarta, så att sidan har en three.js. Typerna: `npm --prefix studio run types`; läs `studio/AGENTS.md` före
ändringar.

- **En dealer i taget:** växeln överst (`data/dealers.json`) väljer vems tagningar vyerna läser (`buildGraph(bank,
  {dealer})` i `studio/lib/bank.ts`): `?dealer=` först, sedan en tagning adressen nämner, sedan minnet
  (`studio.dealer.2`), annars `DEALER` i `src/clip-graph.ts` (Paow). Scen visar det en annan dealer har som luckor;
  Casino och spelsidan spelar aldrig en annan dealers film.
- **Casino** (`/studio/game/`) bär spelets adressval vidare till spelet i ramen: `diagnos=0|1`,
  `kort=hand|liggande|matt`, `cardBack=film|dark`, `cardFace=film|paper`, `dealTempo=1…1.15` och `geometri`; ogiltiga
  värden redovisas som okända (`studio/lib/casino.ts`). `trad=<id>` spelar bara trädets filmer och de som inget träd
  äger (`src/dealer-trees.ts` treePlay, `GET /api/trees?dealer=&trad=`). Kopians Casino skickar inte ordet.

## Spelet

`game/` är Scouts blackjackkärna, förd hit oförändrad i sak (regler, sko med bränt kort och skärkort, slump med
journal, signaler); `game/provenance.json` anger Scout-fil, commit, blob och avvikelse per fil. Ren TypeScript utan
DOM som aldrig importerar från `src/`. Scouts boxar 0–6 finns bara i kärnan: `game/seats.ts` är den enda
översättningen, allt utanför räknar platser 1–7 (plats 1 kamerans vänster). `game/session.ts` är en lokal
enspelarsession i minnet: saldo, `requestId` (samma svar vid omsändning), `expectedVersion`, svar med signaler och vy.
Skon är `secure` som förval; `seeded` och `stacked` (förutbestämda kort, bara labb) syns som `view.shoe.source`.

Labbservern håller en session per bordsnamn (`?table=<namn>`, annars `main`): `GET /api/game`, `POST /api/game/command`
(`start`, `act`, `insurance`, `collect`) och `POST /api/game/new`; i kopian kör sidan motorn själv
(`cloud/studio/game-local.ts`). Hålkortets valör lämnar aldrig servern före vändningen. Signalerna är Scouts
(`speak`, `deal`, `reveal`, `turn`, `settle`, `idle`); `deal` och `reveal` bär `shoeDraw`, `total`, `soft` och
`natural`/`blackjack`, så att sidan aldrig räknar kortvärden. Vinsten når saldot vid `collect`. Egenhet i Scouts
kärna: `outcome` i `settle` räknar in försäkringens utbetalning.

### Gränsen mellan kärnan och presentationen

Kärnan och sessionen äger regler, sko, slump, kortvärden, hålkortet och pengar: saldot ändras bara i
`session.command`, och en runda avräknas en gång (en andra `collect` nekas). Presentationen (sidan, `src/game-view.ts`,
overlayen, regissören, filmen och scenen) räknar inga kortvärden, väljer inget utfall och ändrar inget saldo; varje kort
den ritar är motorns kort på sin `shoeDraw` (labbets `cardRank`/`cardSuit` används aldrig i spelet). En summa visas
när dess kort har landat och följer sin hand genom en split (`shownFor`). Kontrollerna frågar `mayAsk` (också
`window.game.controls`); `collect` skickas en gång (`collector`); en omladdad sida tar fasen ur motorns läge
(`stageOf`). Sessionen är en spelare: flera platser är inte flera spelare. Hållet av `tools/game-session.test.ts` och
`tools/game-view.test.ts`.

### Spelets bank

- Spelet spelar bara tagningar med dom, Jakobs eller en preliminär (`judgedBank` i `src/game-director.ts`), utom en
  talfilm (`motion.idle.onRequest`), som slumpen aldrig väljer. En nödlösning (`motion.stopgap`) spelas bara där samma
  dealer saknar annan dömd tagning på kanten. Ett labbprov med `review.labOnly: true` ingår aldrig förrän Jakobs eget
  godkännande, Variant eller Primär. Utan `?trad=` spelas bara träd med läget `spelas` (`data/dealer-trees.json`,
  `gameCut` i `tools/dealer-tree.ts`); kopians frusna bank får samma snitt.
- En retur till vila som saknar film spelas som returen till skon och utgången (`READY>IDLE`). Ett kort vars giv saknar
  film ges med filmen i `STAND_IN_FILM` (per dealer; dealerns andra kort med första kortets film). Dealerns tredje och
  fjärde kort läggs utan hand. Det ett steg inte kan spela står i stegets `gaps` (`play()` i `src/game-film.ts`,
  `window.game.gaps`). Dealerbytet (`swap()`) spelar bara dömda filmer.
- **Giv från ankare 2.2:** `SEAT_HUB` i `src/game-director.ts` är kartan per dealer över platser som ges från 2.2
  (`READY-B`) i stället för 2.1; i dag Paows plats 6 (`dealPose`; `dealAnchor` i `studio/lib/orders.ts`). Den gäller
  bara när `IDLE>READY-B`, `READY-B>P6.C1`, `P6.C1>READY-B` och `READY-B>IDLE` är dömda; kedjan går via vila, och
  platsens första kort står för hela platsen. Rundbyggaren (`roundSequence({..., hubs})`), produktionslistan och Karta
  räknar likadant (`hubDeals`). I Bordet väljer kortets handbyte ankaret (`wishAnchor` i `studio/lib/bordet.ts`): med
  handbyte går given och returerna från A2.3; den förvalda rundan (`roundFor`) stannar på spelets ankare tills banken har
  kortets filmer från A2.3 åt båda hållen (`hasRound`, `gameLine`).
- Efter en giv väljs en retur av samma hand som lade kortet (`motion.releaseHand`); finns ingen spelas den andra med en
  anteckning.
- Repliker (`src/speech-lines.ts`) och munlappar över filmerna (`placeLines` i `src/speech-patch.ts`): [TAL](TAL.md),
  "Hur spelet väljer en replik" och "Munlagret".

### Ritade kort

Filmens egna kort har ingen valör: gult är ryggen och blått framsidan, med märken (BESKED, "Kortet"). Färgerna står i
`CARD_RGB` i `src/placement-model.ts`, märkets mått i `CARD_MARK` (andelar av kortets bredd), och `cardMark` lägger
märket genom kortets perspektiv. Labbet (`CardMark`), dockan (`dealer3d/src/card-marks.ts`) och beställningens bild
(`layCard` i `tools/order-images.ts`, orderns `drawn.mark`) ritar samma märken; texten säger dem bara när bilden visar
dem (`markSeen`, `prompt.faceMark`; `backMarkSeen`, `prompt.backMark`).

Kortspåret `assets/tracking/<klipp>/card-track.json` (`node tools/track-card.ts <klipp>`) säger läge, vridning och sida i
varje ruta, och scenen ritar ett riktigt kort där (`cardMethod: 'scene'`, förval), under filmen, med filmens kort
nycklat bort så att fingrarna ligger över; filmens kort är bara en markör, och dess gula eller blå fläckar om minst 50
bildpunkter utanför skofönstret målas över. Varje kort kan bära sitt värde: `{shoeDraw, target, r, s, faceDown}`
(`cardRecord`/`cardFace` i `src/card-overlay.ts`). `assets/tracking/<klipp>/overrides.json` med `{"cardInFront":
[{"from": 72, "to": 78, "note": "…"}]}` lägger kortet framför handen i de rutorna. Spåraren (`src/card-track.ts`) följer
markörregeln: filmtypen avgör vad som kan synas (en giv vänder en gång, en retur visar en sida, ingång och vila har
inget utdelat kort), och fynd som strider mot det stryks. `node tools/card-coverage.ts --all` mäter hur mycket av
filmens kort som syns utanför skofönstret (`coverage.json` bredvid spåret). **Ett kortformat** (BESKED, "Kortet"):
planens kort är standard och allt annat anpassar sig; en ny film ska ha kortet i standardstorlek (`scaleNeeded` nära
1,2 i `coverage.json`, Kortskala 1,0 är planens kort i `data/scene-contract.json`). Planens kortrutor passar ett plan
(1,1 px); händer, sko och modellens kort är cirka dubbelt så stora (k ≈ 2, skattat).

| Del av filmkortet | RGB | Hex |
| --- | --- | --- |
| Gul rygg | 241, 216, 0 | `#f1d800` |
| Blå framsida | 0, 130, 218 | `#0082da` |
| Rosa kryss (X) | 255, 120, 200 | `#ff78c8` |
| Röd prick | 225, 30, 35 | `#e11e23` |

- Kortet ritas för den ruta som visas (`requestVideoFrameCallback`), inte efter filmelementets klocka.
- Ett kort ritas bara när fyrhörningen är ett troligt kort (`plausible` i `src/card-overlay.ts`): hörnen åt samma håll
  utan att korsa varandra, högst 180 bildpunkter (roten ur ytan), längsta sidan högst 3,6 gånger roten, perspektivet
  högst 3. En ruta utan troligt kort behåller det senaste i högst tre rutor (`HOLD`).
- Kortet i handen böjs högst en tjugondel av vägen till ögat, mätt på den yta det ligger på. Kontaktskuggan läggs bara
  under bordskanten och långt från kortets försvinningslinje.
- Ett spår märkt `hand: false` håller inte kortet i handen: filmens kort färgas om på plats medan hon bär det
  (`src/scene3d-matte.ts`), och det ritade tar över tolv rutor innan kortet ligger (`EASE`).
- Ett kort som ligger sedan en tidigare film ritas i den storlek det givna kortet vilade i. Ett kort utan post i spelet
  visar ryggen (`cardFace` i `src/card-overlay.ts`, `dealt`). Hålkortets valör och dealerns summa visas när kortets
  framsida syns i vändningsfilmen.
- **En geometri för bordet** (`TABLE_GEOMETRY` i `src/card-plan.ts`; `geometri=lins` eller `geometri=kontrakt` på
  varje sida som visar scenen). Förvalet är `lens`; `contract` (äldre `flatQuad` och kamera, 886 px, k = 2) behålls för
  gamla prov. Med `lens`:
  - `planCardAt` (`src/card-plan.ts`): ett verkligt kort, 63 × 88 mm, genom `TABLE_LENS`, för planens platser
    (`planCardQuad`) och spelets egna (`src/game-table.ts`).
  - `planScene` (`src/card-overlay.ts`): det ritade kortets vila; `planCardFrom` läser var en kontur ligger på filten
    (`cardPlace`). Storleken är en andel av planens kort (`cardGrow`): 1,2 är ett verkligt kort.
  - `lensCamera` (`src/scene3d-geometry.ts`): linsen som filmkamera i verkliga meter, så att kortplatser, ringar,
    marker och bord delar kamera med korten (`viewUnder`).
  - Bildpunkter och bordets meter: `pixelToFelt` och `feltToPixel` i `src/table-lens.ts`, i bankens bildpunkter
    (1764 × 1174); annan storlek med `inFrame`, planens vy (1762 bred) med `planToFilm`. `tools/card-plan.test.ts`
    håller plan, spel, vilande kort och scenen till samma fyrhörning inom en hundradels bildpunkt.
  - Runt korten: rummet genom kontraktets kamera (`roomSeen`); bordet 1,15 m djupt (`REAL_TABLE`, `tableUnder`);
    insatsringen en korthalva, ringens radie och 12 mm framför kortets mitt (`BET.real`, `ringOffset`; ring 54 mm,
    marker 39 mm); trycket i ordningen dealerns kort, logga, båge, text, platsernas kort (`REAL_PRINT`); vyn vrids
    kring filmkamerans lodlinje (`aimAt` i `src/game-page.ts`).
  - Scens val Standard / Bred lins visar linsen respektive det äldre perspektivet. Kontraktets väg lever kvar i
    grenen `contract` i `createLayout` (`src/game-table.ts`), `cameraFromContract` och `DEALER_LENS_ESTIMATE`
    (`src/scene3d-view.ts`; `cameraFromContract` behövs också av Modeller, `tools/scene-material.ts` och rummets
    kamera), `viewUnder`, `cardGrow`, `PLAN_CARD_SIZE`, `BET.offset`, `tableUnder`, `draw` (`src/scene3d-table.ts`),
    `updateView`, `TOTAL_LEFT` och `aimAt`; allt det ersätts innan vägen tas bort. Med flit kvar på den äldre regeln:
    `restingQuad`s kontraktsgren med `sceneOf` (för `tools/card-coverage.ts` och kortsättet `film`,
    `src/scene3d-cards.ts`) och `tools/placement-backdrop.ts`.
- **En linje för korten** (BESKED, "En linje för korten"): det ritade kortet hela vägen, också i handen (`CARRY` i
  `src/card-overlay.ts`, bärsättet `object`, `kort=hand`), med filmens kort omfärgat under (`UNDER`, förval); skons
  fönster lämnas åt matten och hud orörd. `cardBack=film`/`cardFace=film` visar filmens färger, `cardBack=dark` och
  `cardFace=paper` färgar om också kortet i handen (`cardWords` i `src/game-film.ts`). `kort=liggande` lämnar filmens
  kort i handen och tonar fram det ritade när kortet lägger sig (`restFade`, `restShare`); `kort=matt` visar filmens
  kort omfärgat i handen. Storleken är en överallt (`cardScale` 1,2). Ordningen (`cardsChoice` i `src/game-film.ts`):
  adressens ord (`cards=0|1`, `kort`), sedan spelarens val i menyn Miljö, annars på. Scen och labbsidorna följer samma
  linje (`carryOf` i `src/scene3d-deal.ts`). Med skomodellen ritas det givna kortet två rutor efter att det lämnat skon
  (`leavesShoe`). Sätten jämförda: Prov `kort-tre-satt`.

### Givens slag och kortplatser

`src/game-director.ts` gör signalerna till slag, ett per kant i klippbanken (vila till sko en gång, retur mellan
korten, hålkortet vänds från vila). `src/game-table.ts` ger varje kort en plats: planens två platser per plats, sedan en
solfjäder i steg om 24 px (plats 5: 16, plats 7: 12; `game.html?fan=<px>` prövar ett annat), splittade händer 66 px mot
dealern, och dealerns tredje kort där dess film lägger det (1069, 926 i filmpixlar).

### Spelsidan

`game.html` (`src/game-page.ts`) bygger scenen med `createScene`, håller insatserna före given, skickar kommandon och
spelar svaret: `src/game-film.ts` löser stegets slag med `resolveRound`, lägger kedjan i filmkön med kortspår och
kortval och spelar vilan (`pickIdle`) däremellan. `src/game-view.ts` gör motorns läge till det som visas. Overlayen
(`src/game-overlay.ts`, `game.css`) är HTML över canvasen: ringarnas träffytor, markerstaplar, summor, utfall och
konsolen; den visar vad den får och rapporterar tryck. Markerna i ringarna är föremål i scenen (`src/game3d-chips.ts`):
husets marker ur markerstudien (`src/chip-material.ts`) i verklig storlek (39 mm), släppta
6 cm ovanför sin plats; kan modulen inte läsas ritar overlayen platta marker. Inramningen är liggande (lutad 8°, zoom
0,84) eller stående (zoom 1,55, lutad 4,4°, plats 2–6 i bild, vriden mot platsen som har turen); ett sidledsdrag vrider
vyn.

- **Konsolen** följer Scouts spelkonsol (panel längs nederkanten, knappen Dela ut / Ny runda längst ut; ett otillåtet
  val lämnar sin plats tom). På en telefon täcker den aldrig bordet (BESKED, "Spelet på telefon"): `placeConsole`
  märker scenen `tall` (en remsa på 150 px under `#picture`) eller `side` (en spalt på 172 px till höger under 540 px
  höjd, `FRAMING.sideBelow`). Teman: `game.html?tema=noir|scout|smaragd|bordeaux|midnatt` (noir förval).
- **Panelerna** (`src/game-panel.ts`): Miljö väljer rum (`assets/scene/thumbs/`, `roomShift`), Dealer byter dealer
  (`film.swap`: hon går, bordet står tomt, en ny kommer), Musik väljer spår (`MUSIC`, `sound.music`). Allt ljud är tyst
  tills spelaren slår på det. Chatten (`src/game-chat.ts`; `?chatt=0` tar bort den) är en attrapp som inte skickar
  något.

### Sko och markerbricka som GLB

Jakobs modeller ur Meshy ligger som original under `assets/props/source/`, namngivna med SHA-256 i `data/props.json`.
`node tools/prop-glb.ts <id>` gör dem scenfärdiga (glesare nät, normaler med brytvinkel 40°, texturer 1024 px, bordet
2048, storlek i meter och origo under föremålet): en vanlig GLB utan Draco, meshopt eller KTX2 i
`assets/props/<id>.glb`, med kvitto. Krav på en ny fil: Y upp, mynning eller långsida mot +Z, PBR-material,
inga inbakade skuggor. `src/game3d-props.ts` läser den med three:s `GLTFLoader` (`/vendor/loaders/`), materialen genom
`scene.lit`, och lägger den med `scene.addProp`. Brickan ligger försänkt vid dealerns kant (`scene.notch`), 0,105 m
djup. Provet `game.html?bricka=hus` (`src/game3d-tray.ts`) har husets marker på högkant i tolv rader (`TRAY_ROWS`,
`rowFor`): en förlorad insats bärs in i sin rad (`chips.send`), en vinst ut till en stapel bredvid (`chips.pay`). Skon
visas inte i spelet: filmens sko ligger kvar tills dess pixlar kan maskas bort.

### En film före spelet

`src/game-intro.ts` (`game.html?intro=noir-3`, kopians dörr `/trailer`): en startruta (Spela, Hoppa över) före allt
annat; filmen hämtas vid trycket, spelas med ljud och tonar över i spelet i dess skala och mitt (`introLayout`). Sista
rutan är spelets bild i rummet Monaco med rörelse (`room=monaco&roomLife=1`). Vilan hålls på första rutan tills hon
talar (`rest({hold})` i `src/game-film.ts`), rummets film är av till 0,4 s före slutet (`onLead`), och svajet
(`dealerLife`) tonas in efteråt. Filmen (`film-2.mp4`) och startrutan ligger i `assets/films/intro/noir-3/` med kvitto;
en omgjord film får nytt namn, och filmen spelas in på nytt när spelets vilobild ändras.

### Ljud och Modeller

Ljud (`pages/sound.html`, `src/sound.ts`): markernas klirr, kortens ljud, bakgrundsljud per miljö och fyra
musikspår, syntetiserade i webbläsaren utan ljudfiler (`createSound()`, `MUSIC`, `music(track)`, `set({music})`;
`LEVEL.musicDbA` −38). Modeller (`pages/props.html`, `src/props-lab.ts`) är ett sidospår som inte rör spelet: sko,
bricka och bord i egna utseenden; "Med dealer och rum" (`src/props-stage.ts`, för en post i `data/props.json` med
`stage`) ställer spelets vilofilm bakom bordsmodellen.

## Koordinater

Höjd ökar uppåt. Bildpixlar (planens och filmernas mätningar) räknas från övre vänstra hörnet med y nedåt.
Originalmätningar och referenshashar bevaras; en adapter konverterar vid en uttrycklig systemgräns.

Normaliserad **bildrymd**: `u` åt höger, `v` uppåt, båda i `[0,1]`; `(0,0)` är nedersta vänstra pixelcentrum och
`(1,1)` översta högra. För `W×H`:

```text
x_px = u × (W − 1)        u = x_px / (W − 1)
y_px = (1 − v) × (H − 1)  v = 1 − y_px / (H − 1)
```

Native centrum `(0.5,0.5)` ger `(880.5,586.5)` före avrundning; native-punkten `(820,1026)` blir `(820/1761,147/1173)`.
Utsnitt med `left/top/width/height` beskriver pixelkanter, inte denna konvention. Bordets plan och 3D-kameran har egna
kalibreringar; bildrymden är inget perspektivmått.

### Kortplanen

Jakobs kortplan, sparad från Bordets Kortplan, är `placements/default.json`; vyprofiler och pixelkonvertering i
`src/placement-model.ts`. Geometri lagras per `native`/`portrait` (`portrait` godtas av `validatePlan` men läses inte);
hand, sida och material hålls skilda från geometrin. Standardplatser börjar `reviewed=false`. `angle` är grader medurs
i bildens y-ned-rymd; `width`/`height` är andelar av vyns pixelcentrumspann; `taper` formar konturen och bevisar ingen
kalibrerad projektion.

- `tableProjection`: `mode: flat | individual` och `heading` i grader (`-90,-45,-15,0,15,45,90`); plant bord med 0° är
  standard och räknas från P4.C1. Äldre schema-v1-filer utan fältet godtas.
- `perspective` (0,80–0,96, valfritt) är reglaget Perspektiv och bara kortens form: varje kort har den verkliga
  kamerans storlek och plats (`TABLE_LENS`), och den bortre kanten ritas smalare kring kortets mittlinje (0,956 är ett
  verkligt korts egen form). Utan fältet gäller plats 4:s `taper`. Regeln är `planShape` och `keystone` i
  `src/card-plan.ts`; spelet läser den bara med geometrin `lens`.
- `intent`: `grip` är `PINCH` (nyp i skons fönster, A2.1; standard) eller `DRAG` (fingertopparna på kortet, släp längs
  filten, A2.2); `turnAt` är `AIR` (standard) eller `PLACE` och gäller bara när `turn` är sant. `validatePlan` fyller i
  standardvärdena för äldre filer. Sekvensen skriver `DRAG(LH,BACK)` och `TURN(LH,BACK>FRONT,PLACE)`.
- I Bordet: tekniker `TECHNIQUES`, Kortstorlek för alla kort `scaleCards` (0,50–2,50), kortet i skons fönster gult
  (`SHOE_CARD`); böjning och glans i Efterarbete (grundmaterialet 0,14 och 0,35). Allt når disken först med Spara.
- **Bakgrunden** (BESKED, "Dockan per dealer"): under korten ligger scenens bord i hemvyn med filmen dold, den valda
  dealerns vita docka i vila (`dealer3d/src/doll.ts`; standarddockan för en dealer utan egen) och bankens sko; annat val
  i adressen (`bakgrund=docka-standard` eller en films id). `node tools/placement-backdrop.ts` bygger en bild per docka,
  `assets/lab/placement-backdrop/docka-<docka>.jpg`, med `receipt.json`, och körs om när bordet, skon, standarden eller
  en docka ändras.

Rörelsernas bindning till planen använder `placementRef`, `sceneProfileId` och `viewProfileId`, inga x/y-tal i
sekvenssträngen. Film och overlay använder samma uppslag och samma resize/crop/letterbox-offset. Ordningen i en planerad
sekvens är inga uppmätta filmannoteringar; noder eller dokument får inte hitta på saknade mätningar.

## Ordlista och gräns mot Scout

Orden Jakob ser står i studions ordlista (`studio/lib/words.ts`, Ordlista i menyns fot). Här står kontraktets koder och
gränsen mot Scout; där båda har samma ord säger de samma sak.

| Ord | Betydelse |
| --- | --- |
| Ingångsbild, keystone, ankare | Ingångsbild: vilken bild som helst av personen. Keystone: förlagor i hög upplösning på vitt, stående och sittande; spelas aldrig. Ankare: rutan i bankens format (1764×1174, grönt, bankens sko) som filmer börjar och slutar på. Om ankaret tas ur en video av keystonen (hans ord) eller redigeras som stillbild (Paows, löpande bandet station 4–5b) har han inte avgjort. |
| Ankare 1, 2.1, 2.2, 2.3, A3PnCm | Vila (`IDLE`); nyp i skons fönster (`READY`, `grip: PINCH`); handen över kortet i skons öppning, släp (`READY-B`, `grip: DRAG`); båda händerna vid skon (`READY-C`); slutbilden vid plats n, kort m (A3P4C1). Skrivs A1, A2.1, A2.2, A2.3, aldrig med en bokstav efter; en vinkel från plats 2 skrivs S2-A2.2. Äldre namn: Keystone 1/2, variant A/B, VILA/REDO, REDO B. |
| Ingång, utgång, hon kommer, hon går | Ingång: ankare 1 till 2.1 eller 2.2 (`IDLE>READY`, `IDLE>READY-B`). Utgång: tillbaka till ankare 1 (`READY>IDLE`, `READY-B>IDLE`; stegen `UTGANG` och `UTGANG-2.2`). Hon går: reser sig och lämnar bordet (`IDLE>AWAY`); hon kommer: kommer in och sätter sig (`AWAY>IDLE`). |
| Riktning, lutning, perspektiv | Kortets tre mått: vart kortsidan pekar på bordet; hur mycket kortet reser sig (0° = plant; inget reglage); hur mycket smalare den bortre kanten är. |
| `IDLE`, `READY` | Vila respektive redo. VILA/REDO är alias. |
| `LH`, `RH` | Dealerns anatomiska vänster/höger, oberoende av bildspegling. |
| `BACK`, `EDGE`, `FRONT` | Observerad fysisk kortsida mot kameran. |
| `CLOSED`, `OPEN` | Visuell etikett: rygg respektive framsida; ersätter inte bevis på fysisk sida. |
| `HIDDEN`, `REVEALED` | Vad Scoutmotorn låter spelaren se. En filmvändning ändrar inte detta. |
| `TAKE`, `PASS`, `TURN` | Ta kortet, överlämna samma kort mellan händer, vända kortet. PASS är inte TURN. |
| `LAND`, `RELEASE`, `RETURN(IDLE)` | Landning (kortet når bordet), släpp (fingrarna lämnar kortet; returen börjar där) och återgång; olika rutor. `LAND(<plats>)` är också noden för platsens landningsbild (roll `landning` i Material), som en giv bara dit slutar på och en retur börjar på (`landingOf` i `src/order-model.ts`). |
| `P4.C2`, `D.C2`, `VAR03` | Placeringsnycklar och rörelsevariant. |

P1–P7 och D, två kortplatser vardera: 14 spelarkort och två dealerkort. Platsnumrering och utdelningsordning följer
Scout: plats 1 är kamerans vänster, plats = Scouts box + 1, given börjar på plats 7 och går mot plats 1, sedan dealern,
och det dolda kortet sist. Koordinaterna är Jakobs placeringsplan.

Scoutgaming äger regler, slump, kortvärden och händelser; inget ändras där härifrån, och ingen spelmotor skrivs i
dealer utom den avskilda i `game/` (AGENTS, "Det som skyddar Jakob"). `P4.C2` är inte kortets runtime-ID: vid split
krävs hand-ID, och Scout behåller kortinstansens ID (dragnumret i skon). Filmkoden importerar från `game/`, aldrig
tvärtom.

Sekvenssträngens form: `P4.C2@VAR03 | TAKE(LH,BACK) > LAND(BACK) > RELEASE(LH) > RETURN(IDLE)`. Överlappande
PASS/TURN beskrivs med faktiska intervall. Färgbyte eller passage genom kantläge bevisar ensam ingen vändning; en
författad etikett går inte före sammanhängande källbevis.

## Ett rörelseregister och tydliga bevis

- Filmregistret är ensam källa för rörelsens klassning och beslut: en post per film och tagning. Hand, pose, fysisk
  sida, spelstatus, mål och variant hålls separata.
- Registret läses och skrivs bara genom `tools/register-store.ts`. Git bär textfilen `data/motions.jsonl`: en post per
  rad, sorterad på id, nycklarna i postens egen ordning. Arbetskopian är SQLite under `.runtime/register/`, ombyggd ur
  texten när de skiljer sig; varje skrivning uppdaterar båda under samma lås. Revisionen är postens hash, och en
  skrivning mot en äldre revision nekas (409). En oläslig rad gör hela registret oläsbart (422 med raden).
- En film som tas bort tar sina tagningar med sig och deras rader i `data/clip-jobs.json`; domen (Jakobs eller en åt
  honom, `forHim`) står kvar som en rad i `data/motions-removed.jsonl`. Arkivering är en flagga i posten, ingen
  borttagning. `node tools/register.ts get <id>` läser en post; `sweep --dry` visar poster vars film saknas på disken.
- Nya original ligger i `assets/motions/<clip-id>/source.mp4`. En korrigerad version har egen hash och relation till
  originalet; inga kopior per godkännandestatus.
- `KEYFRAME` är en källruta. `ANCHOR` är en utpekad källruta för grepp, kantläge, kontakt, släpp eller vila: källhash
  och rutnummer. Saknad kunskap är `null`/`UNKNOWN`, inte uppskattade tider.
- Bevisgrund `MEASURED/OBSERVED/REPORTED/HYPOTHESIS/UNKNOWN` skiljs från beslut `PENDING/ACCEPTED/REJECTED`. Rörelse,
  mask och geometri, scen och Scoutanslutning bedöms var för sig.
- Maskkontrakt: CLOSED RGB `[255,255,0]`, OPEN `[0,0,255]`, bakgrund `[0,0,0]`, förlustfri mask, kontur separat. MP4 är
  visningsmaterial, ingen exakt färgmask, och en författad maskfärg bevisar inte originalets kortsida.
- Genererad gul eller blå färg kan vara fel trots en fysisk vändning: bedöm rörelsen först och märk BACK/EDGE/FRONT ur
  sammanhängande källrutor; editorns gul = BACK, blå = FRONT, rosa är en separat maskhjälp.
- Filmgranskningen stegar ±1 ruta i klippets fps (`clip` och `frame` i adressen); en sekvensruta mappas via sin
  frysta tidslinje innan den anges som råfilmens ruta.
- Rörelseregistret äger besluten, katalogerna refererar till dem, media är filer med hashreferenser.

## Beställningen: vad som skickas

Till Runway går exakt textprompt, modell, längd och format samt bilder: första bild, oftast sista bild, ibland en
referensfilm; planen ger målkortets hörn i sista bilden. Labbskärmbilden, placerings-JSON, nodkartan och 3D-materialet
skickas aldrig, och en ändring i editorn beställer ingenting. Rosa i en källfilm hjälper att hitta kortytan och avgör
inte vilken sida som syns; kortmaterialet ritas ovanpå filmen och bakas aldrig in. Studions beställningar är
`data/orders/<id>.json` (formen i `src/order-model.ts`):

- En giv bär sina val i `motion`: `hand` (handen som tar kortet ur skon), `pass` (handbyte, bara vänster till höger),
  `side` (BACK stängt, FRONT öppet; `turn` följer av sidan) och `flipAxis`: `AT_PLACE` (vänd vid platsen; förval när
  planen säger `PLACE`, `defaultFlip`), `FREE` (handleden vrider över kortet på vägen) eller `LONG_EDGE` (kortet rullas
  kring långsidan); orden i `FLIP_LABEL` och `FLIP_ABOUT`. Ett val som inte gäller lagras inte (`flipAxis` null).
- Förvalen kommer ur stegets recept (`recipeFor`, `data/order-methods.json`); planen ger bara det receptet lämnar åt
  Kortplan, och ett handbyte är aldrig förval (`fromPlan` säger om valen är planens). `crossesBody` säger om kortet
  landar mer än ett halvt kort till vänster om hennes mitt (P1–P3). "Alla sju" gör ett utkast per plats med samma
  `group`.
- Texten skrivs av `promptFor` i `src/order-prompts.ts` (mallen i `TEMPLATE_VERSION`, handbokens §2; en order återges
  med sin egen version; orden i `SAY`), samma funktion som visar texten före utkastet, i stilen `prompt.style`: Kort
  (förval), Minimal eller Utförlig (utan `style`: Utförlig).
- En retur är en egen film från platsens landningsbild (`LAND(<plats>)`) till ett ankare, och en giv kan beställas bara
  dit (`step.shape: ONE_WAY`). En Kling 4-order kan bära en referensfilm ur banken (`reference`, kopierad med hash; en
  annan dealers film är tillåten och namngiven), och kortets storlek kan provas per order (`motion.cardScale`).
- Ett filmsteg har receptets modell, längd och tagningar som förval men kan beställas med varje modell i `MODELS` som
  tar första och sista bild (`modelsFor`, `paramsOf`); en ny modell är en post i `MODELS` och ett pris i
  `data/order-policy.json`.
- Ett utkast följer det ankare som gäller i Material (`picture.replaced` säger vad bilden var). En stillbild
  (ANKARE-2.1, ANKARE-2.2) går ut med ankaret och texten, utan posebild. En godkänd beställning ändras aldrig. En hel
  bild av en annan dealer i ett utkast stoppar godkännandet.
- Prompt och bildhashar står i jobbet i `data/clip-jobs.json` och i filmens post; bilderna och kvittot i
  `assets/motions/<clip-id>/`. Protokollet räknas, aldrig för hand: `node tools/order-ledger.ts` och vyn Protokoll
  (`GET /api/orders/ledger`, `studio/lib/ledger.ts`). Granskarens dom förs in med `order-put.ts review`, och
  `tools/order-bring.ts` för en levererad tagning till bankens inkorg och Material.
- Metoden per steg och platsklass står i `data/order-methods.json` (`gäller`, `prov`, `saknas`; `src/order-methods.ts`).
  Produktionslistan (`node tools/produce.ts <dealer>`, Bordets Beställ, `GET /api/production`) säger per steg vad som
  spelas, vad som är på väg, om en runda kräver det och dess metod, och gör utkast där metoden gäller (`--draft`; aldrig
  ett godkännande). Stegen står i `STEPS` i `src/order-model.ts`, bland dem hålkortets giv (`D.C1`), dess vändning
  (`HALKORT`, `IDLE>REVEAL(D.C1)`) och utgångarna (`UTGANG`, `UTGANG-2.2`). Hela vägen: [löpande
  bandet](../tools/dealer-line.md).

## Material: tillstånd och vad som bygger på vad

`data/media-roles.json` ger varje bild en roll (`studio/lib/media.ts`) och kan ge den ett tillstånd: `gäller`,
`kandidat`, `ersatt` eller `arkiverad` (utan tillstånd: kandidat). Jakob väljer för hand i Material, för den valda
dealern (`studio/components/material/state.ts`, skrivet av `setState` i `tools/media-roles.ts` mot registrets
revision): en bild som görs gällande ersätter de andra på samma plats (roll, nod och kort; en keystone också samma
hållning); en arkiverad bild lämnar listorna men stannar i registret. Varje ändring får en rad i `stateBy` (vem, när,
var); ett verktyg eller en agent anger `who` och `where`, så att inget ser ut som hans. Bilden väljs bara i Material,
Primär bara i Karta.

Vad som bygger på vad (`studio/lib/lineage.ts`, `GET /api/media`, `lineage`): varje tagning spåras till bilderna dess
första och sista bild gjordes av (jobbfilens `first`/`last`, en beställnings `pictures[].from.entry`, eller samma
sha256). En tagning vars bild inte längre gäller märks som äldre i Karta och Material och spelas som förut tills Jakob
väljer annat. Bara ett led: en bild med `builtOn` märks "från äldre keystone", men dess klipp märks inte för det.

## Klippbank och nodnotation

Klippbankens rundor (`resolveRound` i `src/clip-graph.ts`) spelas i studion, i 3D-scenen och i spelet; sekvenssträngar
och nodvy är presentation av samma metadata, aldrig en andra motor, och nodvyn fastställer inte en källfilms händelser.
Vyn **Karta** (`/studio/karta/`) visar nodträdet och per steg vad spelet spelar där, Primär och de sekundära filmerna,
och hur spelet använder varje film (`usesOf` i `studio/lib/primaries.ts`). Utan Primär föreslås den bästa tagning Jakob
godkänt; Primär sätts bara med hans klick. Underkända, ogranskade och ersatta tagningar finns i Granska. Noderna är
ankarposer: `IDLE`, `READY` och ett landningsankare per kort (`P4.C1`, `D.C2`). Varje klipp är en kant `A>B` med en
handling; en runda är kanter i följd:

```text
IDLE>READY | READY>P1.C1 | P1.C1>READY | READY>D.C1 | D.C1>READY | READY>P1.C2 | P1.C2>READY | READY>D.C2 | D.C2>IDLE
```

- Banken är 54 kanter: 16 kort × giv, retur till READY och retur till IDLE, samt `IDLE>READY`, `READY>IDLE`,
  `IDLE>IDLE`, `AWAY>IDLE`, `IDLE>AWAY` och `IDLE>REVEAL(D.C1)`, hålkortets vändning (dealerns första kort). `AWAY` är
  bilden utan dealer; filmen där hon går beställs med bara första bild, och dess sista rutor ger rutan filmen där hon
  kommer börjar på. Hålkortets vändning går från vila till vila (`REVEAL(D.C1)` är vila med kortet uppvänt) och spelas
  från ruta 3 till tre rutor före slutet. `D.C3` är tre valfria kanter, och `IDLE>REVEAL(D.C2)` en fjärde (äldre filmer;
  ingen runda ber om dem). `@<klipp-id>` efter en kant låser en tagning. `LAND(P4.C1)`/`RELEASE(P4.C1)` och VILA/REDO
  läses som samma noder.
- READY kan ha namngivna varianter (`READY-B`): `READY-B>P4.C1` är en tagning av `READY>P4.C1` med annan startpose,
  spelad bara när rundan skriver den så. Jobb med andra noder bildar gruppen Experiment.
- Kartan är presentation, inget eget statusregister: `src/clip-graph.ts` räknar grafen ur `data/clip-jobs.json`,
  lokala kvitton och filmregistret och läser om var fjärde sekund. Huvudtagning är godkänd före ogranskad, och bland
  lika den senaste med en passande retur. Underkända väljs aldrig. `review.acceptedAs: "MAIN"` går före härledningen;
  `"VARIANT"` visas bredvid och väljs först när ingen annan spelbar tagning finns.
- **Ankarregeln och skarvregeln:** en retur vars första bild är en fil (landningsankaret) passar varje tagning av
  given, som spelas till sin sista ruta. En retur vars första bild är en ruta ur ett visst givklipp passar bara den
  tagningen, som klipps vid den rutan (`first.frame.index`; `motion.landingFrame` går före). Efter en Primär är
  returens huvudtagning den som skarvar mot givens. `resolveRound` räknar intervallen och visar saknade kanter som
  luckor.
- **Bygg en runda** (`studio/components/round/RoundPicker.tsx`; `parseEdge`, `nextSteps` i `studio/lib/rounds.ts`): ett
  steg utan film läggs inte till, en skriven väg med ett sådant steg spelas med en lucka, och spelets nödlösningar har
  rundan inte.
- En härledd tagning är rutorna A–B ur ett klipp: `"derived": [{id, kind, from, to, clip, frames: [A, B]}]` i
  jobbfilen. En rättad kopia (`"edits": [{id, source: {clip}, model, promptText, purpose}]`) är ännu en tagning av
  källklippets kant. `playbackSpeed: 2` spelar tagningen i dubbel fart (rutnumren är filens), och
  `source-reversed.mp4` bredvid filmen ger "Spela baklänges".
- **En film per plats** är förval (Karta med `?filmer=kort` visar en per kort): platsens andra kort spelar platsens
  filmer med det ritade kortet flyttat planens avstånd C1→C2 (varning över 50 px). Kort 2 delar film bara när det
  slutar på samma sida som kort 1 (`filmCard`), så dealerns stängda `D.C2` har egna filmer; banken behöver 33 filmer
  (6 utan kort, 7 platser × 3, `D.C1` × 3, `D.C2` × 3). `buildGraph(data, {mode})` sätter `edge.shares` och
  `summary.films`, och `resolveRound(…, {places})` ger steget `film` och `shift`.
- **Vilan** är korta klipp på `IDLE>IDLE` som börjar och slutar på samma bild, spelade från ruta 3 till tre rutor före
  slutet. `pickIdle` i `src/clip-graph.ts` väljer nästa med viktad slump: aldrig samma två gånger i rad, två lugna och
  sedan en gest (`calmBetweenGestures`), aldrig underkända klipp eller klipp på begäran, inte någon av de senaste
  gesterna (`gestureMemory` 7, per film). Dela ut går före väntande vilor: vilan som visas spelas klart och
  ingångsfilmen, hämtad redan vid insatsen, är nästa (`tools/game-film.test.ts`). Klippets del: `motion.idle = {weight,
  calm, onRequest, label, cut}`; utan uppgift är ett klipp med `-idle-loop-` i namnet lugnt (vikt 20) och övriga gester
  (vikt 3). Rundans `IDLE>IDLE`-steg spelar det lugnaste klippet, om inte ett är märkt `MAIN`.
- En vilofilm kan be scenen om en effekt: `motion.effect = {kind: "room-flash", room, at, seconds, mono}` (`effectOf`,
  `Part.effect`). En variant med effekt är en egen post som pekar på samma film.
- **Domar** sätts i tagningen: Primär (`acceptedAs: "MAIN"`, spelas i första hand på sin kant, också en retur direkt
  efter en giv; två primära som inte passar ihop spelas båda med en skarvnotis; bara en låst tagning `@id` och kravet
  på kortsida går före; skälet i `why`, orden i `WHY_LABEL`), Godkänn, Variant, Underkänn och en anteckning. `PUT
  /api/clip-bank/review/<id>` skriver bara `review` i postens register (`decision`, `acceptedAs`, `userReview` med
  datum, `userAccepted`), med eget ursprung och `If-Match` mot revisionen (`tools/review-store.ts`). Inget skrivs vid
  inläsning, och en tagning utan post kan inte beslutas.
- **En preliminär dom** (`node tools/review-put.ts`, `applyProvisional`) sätts bara där Jakob har lämnat över domen
  (BESKED, "Domar åt honom, och ingen kö"): `decision` `ACCEPTED` (eventuellt `acceptedAs: "VARIANT"`, aldrig `MAIN`)
  eller `REJECTED`; `userAccepted: false`, ingen `userReview`, `inbox` borttagen och ett block `provisional {by, at,
  mandate, note}`. Den väntar inte i hans kö (`awaitingJakob` i `studio/lib/verdict.ts`); hans nästa beslut tar bort
  blocket, och en tagning med hans dom tar inte emot en preliminär.
- **Arkivera** (Kartans stegpanel; Ta tillbaka under Arkiverade): `PUT /api/clip-bank/archive/<id>` med `{archived:
  true|false}` sätter eller tar bort `review.archived {by, at, where}` med samma skydd som en dom (`saveArchive`); inget
  verktyg skriver fältet i hans namn, domen står kvar och ingen fil flyttas. En arkiverad tagning spelas aldrig och
  räknas inte (`playable`, `judgedBank`), går inte upp till kopian, och en arkiverad Primär lämnar steget utan Primär.
- En post kan bära `motion.takeHand` och `motion.releaseHand` (`LH`, `RH`): handen som tar kortet ur skon och handen som
  lägger det, eller på en retur handen som kommer tillbaka; en retur utan uppgift ärver givens (`releaseHand` i
  `src/clip-graph.ts`). `tools/register-order.ts` skriver dem ur beställningens `motion.hand` och `motion.pass`.
- En talfilm är en vilotagning på begäran (`motion.idle.onRequest`) med ett block `speech` (`line`, `language`, `text`,
  `voice`, `soundStartsAtSeconds`, `soundEndsAtSeconds`); `src/speech-lines.ts` väljer den för en replik eller ett
  chattsvar.
- Labbservern lämnar därutöver bara ut `/api/clip-bank` och `/api/proofs`, `source.mp4`, `source-reversed.mp4`,
  `first.png` och `last.png` för klipp i jobbfilen, spårfilerna under `assets/tracking/<klipp>/`, mp4, png och json
  under `assets/proofs/`, och three.js som `/vendor/three.module.js` och `/vendor/three.core.js`, inget annat ur
  `node_modules`.
- **Vyn Prov** (`/studio/prov/?prov=<mapp>`) är granskningsrummet för provmapparna. `proof.json` får bära `title`,
  `description`, `labels`, `chapters`, `verdicts` (per fil: `ok`, `remarks`, `failed` eller `unreviewed`) och `takes`:
  provets gjorda filmer och bilder; allt annat är underlag. Bara en tagning bär en omdömesbricka, granskarens
  (Användbar, Med anmärkningar, Underkänd), annars "Väntar på granskaragenten", aldrig Jakobs (`proofVerdict` i
  `studio/lib/verdict.ts`); utan `verdicts` läses brickan ur etikettens ord. Jakobs Bra / Inte bra och kommentar:
  `data/proof-notes.json`.

## Återbruk och införande

Jakobs fristående blackjack-studio (`local-studio/blackjack-studio`, "Göran"): Görans grundbild är gjord ur ett
uppladdat foto utan noterat tillstånd, så hans projekt, klipp, kortlägen och ankare används inte, och inte heller
trä-casinobilden `c7ef9e9c`. Fritt att återbruka: `blackjack/` (regelmotor), `money/`, `players/`, `scene/furniture.ts`,
`panorama-room.ts`, `atmosphere.ts`, miljöerna Las Vegas och Los Angeles och Poly Havens texturer (CC0,
`material-sources.json`). Ett namn i äldre material kopplas till verifierad filhash och proveniens innan identitet
antas; nya läsningar ur arkivet registreras, och inga gamla `node_modules` eller junctions importeras.
