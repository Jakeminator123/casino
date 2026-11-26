# new_docka – standarddockan

Standarddockan och standardscenen: syftet, vägen från spelets mått till en byggd docka, koordinaterna, måtten i korthet, dockorna, skelettet och lederna, bryggan mot `blackjack-dealer`s docka, hur en dealer anpassas, valen och varför, licenserna och det som återstår.

Reglerna står i `AGENTS.md`, mapparna och kommandona i `README-SV.md`. Måtten har en källa, spelets kod i `../blackjack-dealer`; `scen/standard.yaml` är de talen i Blenders koordinater, skriven av `scen/gen_standard.py`. Talen i det här dokumentet är en läsbar bild av måttfilen som den stod 2026-11-26: skiljer de sig gäller måttfilen.

---

## 1. Syfte och mål

Målet är en **riggad 3D-dealer** som kan återanvändas i projektet `blackjack-dealer`:

1. Bygg en **neutral grunddocka** (kvinna och man, samma skelett) i en **standardscen** som följer spelets kamera, bord, kort och sko.
2. Programmera ungefär **40 rörelser** (till exempel *giv till spelare 5*) som Blender-Actions på det skelettet.
3. Rendera varje rörelse till ett trovärdigt klipp på **2–20 sekunder**, med kort, händer och sittplatser på rätt ställe.
4. **Valfritt:** förädla klippet i en filmmodell (Runway Aleph, Luma, Kling Motion Control, Act-Two, Wan Animate) så att ljus, hud och bakgrund känns mer levande – men **rörelsen ska redan stämma i 3D**. Byt inte ut 3D-grunden mot en ren text-till-film-prompt; då försvinner precisionen vid bordet.

Dockan är grunden. Filmen är ett lager ovanpå.

---

## 2. Mappar och körning

Mapparna, kommandona och det som måste finnas på datorn innan något byggs står i `README-SV.md`. Tillfälligt arbete ligger i casino-repots slask (`../slask/avatar-auto-pipeline/<uppgift>/`), aldrig i den här mappen.

---

## 3. Pipelinen steg för steg

Det finns **två vägar** som möts i samma standardscen och samma skelett.

### 3.1 Ny väg: standardscenen (det vi bygger nu)

| Steg | Vad | Kommando |
| --- | --- | --- |
| A. Läs spelet | `scen/las_spelet.ts` läser spelets kod i `../blackjack-dealer`, och `scen/gen_standard.py` skriver `scen/standard.yaml` med källan på varje rad. Måttfilen ändras aldrig för hand. | `python scen/gen_standard.py` |
| B. Bygg bordet | Procedurellt ur YAML: filt, rulle, sarg, ben, bricka, sko, kassering, 52 kort, markeringar, insatsringar. Default är spelets ovala standardbord. | `blender -b --factory-startup --python-exit-code 1 --python scen/bygg_bord.py` |
| C. Alternativt bord | Njurformat BORD-02 (labb/utseende), skrivs till `assets/bord/bord_02.*` så standardfilen inte skrivs över. | samma, plus `-- --modell bord-02` |
| D. Bygg dockorna | MPFB 2.0.18, kvinna + man, identiskt skelett. Kräver MPFB, därför inte `--factory-startup`. | `blender -b --python-exit-code 1 --python scen/bygg_docka.py` |
| E. Bygg stolen | Meshy-stol skalad till `stol.sits_z` / `sits_mitt`. | `blender -b --factory-startup --python-exit-code 1 --python scen/bygg_stol.py` |
| F. Importera en rörelse | dealer3d-JSON → Blender-Action på standarddockan. | se avsnitt 8 |
| G. QC | Rendera fasta kameror, måttöverlägg, kontroll mot spelets kortpixlar. | se avsnitt 9 |
| H. Katalog + klipp | En rad i `rorelser/katalog.yaml` per rörelse (`id`, `namn`, `langd_s` 2–20, `seat`, `status`). En rörelse = en Action. Rendera 2–20 s. | headless `blender -b --python …` |
| I. Valfri filmförädling | Runway Aleph / Luma / Kling / Act-Two, med 3D-klippet som rörelsestyrning. **Bara med Jakobs ja** (betalt). | – |

### 3.2 Gamla vägen: avatar-auto-pipeline steg 01–08 (från foton)

Skripten i `steg/` bygger en **specifik dealer från fotografier** via Meshy, inte grunddockan. Använd dem när en verklig person ska in – och behåll sedan **samma Mixamo-skelett** så Actions från standarddockan kan återanvändas.

| Steg | Mapp | Roll |
| --- | --- | --- |
| 01 | `steg/01-referenser/` | Gör A-pose-referenser ur inskickade foton (`apose_referenser.py`). |
| 02 | `steg/02-meshy-delar/` | Meshy image-to-3D för huvud, händer och kropp var för sig (`meshy_enbild.py`, `rendera_vyer.py`). **Betalt – kräver Jakobs ja.** |
| 03 | `steg/03-montering/` | Montera delarna i A-pose, rensa bröstkorg, förenkla 4K-mesh (`montera_apose.py`, `clean_kropp_chest.py`, `forenkla_4k.py`, …). |
| 04 | `steg/04-rigg/` | Meshy Auto-Rig (`meshy_rigg.py`). **Betalt – kräver ja.** |
| 05 | `steg/05-fingrar-handleder/` | Bygg fingerrigg, rätta handleder, rensa vikter. |
| 06 | `steg/06-dealer-export/` | Exportera dealer-A-pose som GLB som dealer3d kan läsa. |
| 07 | `steg/07-qc/` | QC-översikt (helkropp, ansikte, handleder). |
| 08 | `steg/08-film/` | Animera dealern i en filmscen (`animera_dealer.py`). Ny standardscen ska användas i stället för ad hoc-bord. |

Körning via `auto_avatar.py` / `STARTA avatar.cmd`. Nycklar i `.env`. Betalda steg sparar kvitton i stegmappen.

Rekommenderad hybrid för en namngiven dealer: börja med grunddockan (väg 3.1) för proportioner och skelett, använd fotostegen bara för **ansikte/hud och kläder**, inte för att byta skelett.

---

## 4. Koordinatsystem

Allt i Blender och i `standard.yaml` är **meter, Z upp, högerhänt**.

| | Värde | Källa |
| --- | --- | --- |
| Origo | Golvet rakt under dealerkantens mitt (`dealerEdge`, s = 0) | `dealer3d/src/world.ts dealerEdge(TABLE_LENS)` |
| +X | Dealerns vänster = bildens höger sett från spelarna (samma x som spelets linsvärld) | konvention, dokumenterad i YAML-huvudet |
| +Y | Bakåt, från spelarna mot dealerns rygg. Spelarna står på −Y. Blenders Front-vy (från −Y) ser dealern framifrån | YAML-huvudet |
| +Z | Upp | YAML-huvudet |
| Filtens Z | 0,95 m | `scene3d-table.ts BASE.floor` (scenens golv ligger 0,95 m under filten) |
| Bordets (x, s) | X = x, Y = −s. s = 0 är dealerkanten, s ökar mot spelarna | samma för ovalen och BORD-02 |
| Yaw | Grader moturs sett ovanifrån, 0 = längs +X | YAML-huvudet |

Omräkning från spelets linsvärld (three.js, Y upp, filmkameran i (0, h, 0) tittar mot −z):

```
X = x
Y = −(z − dealerEdge.z) = −(z + 1,843773)
Z = y + 0,95
```

Riktningar: `(x, −z, y)`. Kod: `gemensamt/riggverktyg.py` (`Ram`). `dealerkant_lins_z = −1,8437725961` ur `world.ts`.

---

## 5. Mått och standarder

Varje tal i `scen/standard.yaml` har `# källa: fil (namn)` eller `# antaget:` + motivering. **Spelet vinner.**

### 5.1 Filmkamera (en lins, hela världen räknas ur den)

| Mått | Värde | Källa |
| --- | --- | --- |
| Bild | 1764 × 1174 px | `table-lens.ts FILM` |
| Brännvidd | 47,6327 mm på 36 mm sensor (sensor_fit HORIZONTAL) | härlett: `focal_px / bild_bredd * 36`; focal_px 2334 ur `table-lens.ts TABLE_LENS` |
| Höjd över filten | 1,1099955533 m ≈ 1,11 m | `TABLE_LENS` |
| Lutning | 0,4373194932 rad = 25,057° nedåt | `TABLE_LENS` |
| Position i standardkoordinater | (0, −1,8438, 2,0600), mål (0, 0,5305, 0,9500) | `filmEye` = spelare 4 |
| Kontroll | Spelets kortpixlar hamnar mitt i Blenders kort (`qc/bord_film_kontroll.png`) | `verktyg/qc_kontroll_film.py` |

Övriga kameror (alla 1764 × 1174 och 47,63 mm om inget annat sägs): `spelare_1`–`spelare_7` ur `world.ts seatEye()`; `dealer_ogon` (antaget, 24 mm, 9 cm framför huvudets mitt); `hander` (antaget, 85 mm närbild); `hel` (antaget, 35 mm QC); `topp` (ortografisk, skala 2,3 m, antaget).

### 5.2 Bord – vad som faktiskt är standard i blackjack-dealer

Spelet skiljer standarden från utseendet (`blackjack-dealer/docs/SYSTEM.md`, Standarden: «En standard i botten, utseendet ovanpå»):

- **Standarden** är fasta mått: kamera, filtplan, kort, sko, bricka (TRAY flyttad till `table-lens.ts` / återexporterad från `world.ts`).
- **Bordets form** är utseende (`tableModel` i `scene3d-view.ts`, scen-presets). Default är oförändrat `tableModel: 'standard'`.
- Det finns **inget BORD-03**. Casino-presetet `data/scene-presets/casino.json` sätter inte `tableModel` och ärver därför `'standard'`.

**Bordet som byggs som förval är ovalen**, inte BORD-02. BORD-02 (njurformat, vingar bakåt till Y = +0,24 m) finns kvar som `bord_02` / `--modell bord-02`.

| | Standard (default) | BORD-02 (labb) | Dockans Kortplan-bord |
| --- | --- | --- | --- |
| Nyckel | `tableModel: 'standard'` | `tableModel: 'bord-02'` | `dealer3d/src/stage.ts` (sedan `9e440db`, «Kortplan får en bild: dockans 3D-bord») |
| Form | Halv-ellips, **rak dealerkant vid s = 0**, inga vingar | Njurformat, vingar bakåt till Y = +0,24 m, Bézier-urtag | Halvcirkel, också **rak dealerkant** |
| Bredd × djup | 1,90 × 1,15 m (`TABLE.a*2`, `REAL_TABLE.depth`) | 1,92 × 1,296 m | Radie 1,02 m → 2,04 × 1,02 m |
| Rulle | 0,10 m längs spelarbågen | 0,062 m | 0,12 m |
| Filtfärg | `#134232` (`FELTS.green[0]`) | `#215343` | – |
| Ben | x = ±0,58 m, s = 0,25 m (`BASE.legX/legZ`) | x = ±0,48 m, s = 0,29 m | – |
| Golv under filt | 0,95 m | samma i vår scen (BORD-02-källans 75 cm används inte) | 0,90 m (`stage.ts`) |
| Kommentar | `TABLE.b = 0,60 m` är kontraktets kortare bord; under filmlinsen används 1,15 m | Inte spelets default | Visuellt nära ovalen men inte samma kontur |

Källa standardoval: `scene3d-table.ts` `TABLE` / `REAL_TABLE` (under linsen, `tableUnder`). Källa BORD-02: `scene3d-bord02.ts`. Rulle på standardbordet: `TABLE.rail` 0,10 m; sektion `CORE[1] = 0,012`, `halv_hojd = 0,034` (`scene3d-table.ts`). Hyllan bakom dealerkanten (`SHELF`) är avstängd som standard (labb 2026-11-13).

### 5.3 Filt, rulle, sarg, bricka, marker

| Del | Mått | Källa |
| --- | --- | --- |
| Filt Z | 0,95 m | `BASE.floor` |
| Rulle bredd | 0,10 m (standard) | `TABLE.rail` |
| Rulle mitt över filt | 0,012 m | `scene3d-table.ts CORE[1]` |
| Rulle halv höjd | 0,034 m | `RAIL.top − CORE[1]` |
| Sarg underkant | −0,16 m relativt filt | kommentar i `scene3d-table.ts`; `BASE.under = −0,15` |
| Mässingslist | [−0,002, 0,005] m | `scene3d-table.ts BEAD` |
| Bricka (TRAY) | x −0,30…+0,24 m, s 0…0,10 m, djup 0,03 m | `scene3d-props.ts` (officiell standard, även i `table-lens.ts` / `world.ts`) |
| Mässingsram | 7 mm i filtnivå | `game3d-tray.ts` |
| Rör | 12 rader (värden 5, 5, 25, 25, 100, 100, 500, 1000, 500, 100, 25, 5) | `game3d-tray.ts TRAY_ROWS` (`TRAY.tubes = 11` i props – vi följer de 12 raderna) |
| Chip | radie 0,0195 m, höjd 0,003145 m | `game3d-chips.ts` |
| Markeringsfärg | `#d8b665` | `scene3d-table.ts GOLD` |
| Kortmarkering | 4 mm marginal, 3 mm linje (antaget) runt P1–P7 C1/C2 och D.C1–C3 | antaget, för att kortet ska synas inne i ramen |

### 5.4 Kort

| Mått | Värde | Källa |
| --- | --- | --- |
| Bredd × längd × tjocklek | 63 × 88 × 0,3 mm | `table-lens.ts CARD` |
| Hörnradie | 3,5 mm | `CARD` |
| Lekar i skon | 8 (antaget; vanlig kasinosko 6–8). 8 × 52 × 0,3 mm = 0,125 m bunt | antaget |

Korten ligger rakt (`yaw_kort = 0`, placements angle 0). Givexempel i bordet: ett kort per C1 plus dealerns två.

### 5.5 Kortplatser P1–P7 och D

Mittpunkter på filten för varje kortplats (P1–P7 med två kort var, dealerns tre) står under `platser` i `scen/standard.yaml`. Källa: `dealer3d/src/world.ts spots(placements/default.json, TABLE_LENS)`, alltså Jakobs sparade plan sedd genom filmens lins. Från en höft 0,38 m bakom kanten ligger spelarnas första kort 0,74–0,80 m bort och dealerns kort 0,54–0,56 m.


Observation: korten ligger 0,16–0,40 m framför dealerkanten, medan ovalens spelarkant är 1,15 m bort. Filmens kortplan sitter tätare mot dealern än på ett typiskt kasinobord. Vi följer spelet.

### 5.6 Insatsringar (bet)

| Mått | Värde | Källa |
| --- | --- | --- |
| Offset framför C1, mot spelarna | 0,083 m | `scene3d-geometry.ts BET.real` |
| Radie | 0,027 m | `BET.radius` |
| Linjebredd | 3 mm | antaget, samma som kortmarkering |

P1…P7: P1 (−0,5321, −0,3195, 0,95) … P4 (−0,0190, −0,4800, 0,95) … P7 (0,5007, −0,3195, 0,95).

### 5.7 Sko

Dealerns sko på bildens högra sida (dealerns vänster). Källa: `table-lens.ts SHOE`, pose `shoePose(TABLE_LENS)`, fönsterkort `shoeCard()`.

| Mått | Värde |
| --- | --- |
| Längd × bredd | 0,436 × 0,082 m |
| Höjd bak / fram | 0,131 / 0,100 m |
| Platta | 51,60° |
| Fönsterlyft | 0,022 m |
| Fot fram / bak / mitt | (0,3382, −0,1086, 0,95) / (0,7390, 0,0630, 0,95) / (0,5386, −0,0228, 0,95) |
| Yaw bakåt | 23,180° |
| Fönsterkortets mitt | (0,3625, −0,0536, 1,0071) – där handen tar |
| Översta 5 korten | egna objekt `sko_kort_1…5` (`dragbart`, meshen `sko_kortrygg` med ryggen utåt); resten en bunt (8 lekar) |
| Frontplatta | `sko_front`: 1,3 mm tunn platta 1,6 mm framför plattans plan (framför kortet), samma lutning, nederkant 59 mm över filten; U-öppning 50 mm bred nedtill, 40 mm i bågen, topp 2 mm under kortets överkant; under den springan där kortet dras ut. Inget mått i `standard.yaml` ändras; talen och varför i `SKO_FRONT` i `scen/bygg_bord.py` |

`v` löper i [0, bredd] från den nära väggen (`fot_fram`). Skokorten har skala (1, 1, 1) – inte speglad. Kortplanens skopunkt `(0,3872, 0,0658, 0,95)` ur `placements/default.json` är en planmarkör, inte skons fot.

### 5.8 Kassering

Finns **inte** i spelet. Speglad mot skon på dealerns höger: mitt (−0,62, −0,03, 0,95), yaw −23,18°, yttermått 80 × 105 × 140 mm, 4 mm akryl (allt antaget).

### 5.9 Dealerposition och stol

| Mått | Standarddockan (vår sittposition) | Paow (uppmätt ur film, SAM 3D Body) | Källa |
| --- | --- | --- | --- |
| Överarm / underarm | 0,290 / 0,260 m | 0,293 / 0,275 m | `doll.ts STANDARD` / `doll.ts PAOW` |
| Räckvidd axel→handled | 0,535 m | 0,552 m | samma |
| Höft under filt | 0,20 m → höft Z = 0,75 m | 0,278 m → höft Z = 0,672 m | STANDARD / PAOW |
| Axlar bakom kant | **0,38 m** (Y = +0,38) | 0,38 m | **PAOW**, inte gamla ASSUMED 0,18 m (som hamnade i BORD-02:s vingar) |
| Höft | (−0,0152, 0,3800, 0,7500) | (−0,0159, 0,3800, 0,6720) | `dollFrame` X/Z + PAOW Y |
| Höger / vänster axel | (−0,1743, 0,38, 1,2989) / (0,1438, 0,38, 1,2989) | (−0,1989, 0,38, 1,1796) / (0,1672, 0,38, 1,1796) | härlett / PAOW |
| Vilohand handled | (−0,1671, 0,0540, 0,9720) | – | `body.ts restingHand` |

**Avståndet till bordet.** 0,38 m är avståndet från bordskanten till axellederna. Med en bål som är drygt 0,2 m djup blir det ungefär 0,26 m luft mellan magen och kanten, och det syns bara från sidan: filmens kamera ser henne rakt framifrån. För Paow är måttet läst ur hennes filmer (överarmarna hänger, underarmarna pekar fram och händerna vilar vid kanten) och kan inte ändras utan att filmerna görs om, eftersom hon, skon och korten ligger på bestämda ställen i bilden. För standarddockan och för en ny dealer är avståndet ett val: sitter hon närmare böjer hon armarna mer och lutar sig mindre, och varken skon eller kortplatserna behöver flyttas. Valet är Jakobs och inte gjort (2026-11-26).

Stolen syns inte i filmen (spelet har inga ben). Våra antagna mått: `sits_z` 0,66 m (höftleden ca 9 cm över sitsen), `sits_mitt` (−0,0152, 0,46) så höften hamnar över sitsens främre del, sits 0,42 × 0,40 m, ryggstöd 0,35 m, fotstöd Z 0,22 m. Stolen är Meshy-modellen, skalad i `bygg_stol.py`.

Spelarplatser (antaget; spelet har inga spelarkroppar): på linjen från dealerns höft genom C1/C2-mitten, 0,30 m utanför ovalens kant. P4:s stol ungefär (0,021, −1,450), yaw 91°.

### 5.10 Räckvidd

`rackviddstest.mal`: skons fönsterkort, D.C1, P1.C1, P7.C1. Handleden ska hamna 0,02 m över kortet (`world.ts ASSUMED knuckleLift`). Standardräckvidd 0,535 m räcker till alla dessa punkter från höften vid Y = +0,38 m (längsta C1 är P1/P7, ca 0,80 m från höften; axel–handled 0,535 plus bålens lutning och axelns förskjutning).

---

## 6. Dockorna

Två grunddockor med **100 % identiskt skelett och samma bennamn**, så att alla Actions kan återanvändas rakt av. Motor: **MPFB 2.0.18** (CC0-tillgångar) + Mixamo-inbyggt skelett, namn utan `mixamorig:`-prefix, `neck` med litet n.

| | Kvinna | Man |
| --- | --- | --- |
| Fil | `assets/docka/standarddocka_kvinna.blend/.glb` | `assets/docka/standarddocka_man.blend/.glb` |
| MPFB `gender` | 0,0 | 1,0 |
| Stående längd | 1,70 m (YAML `langd_staende`, antaget så att sittande axlar/huvud stämmer) | 1,75 m |
| Axelbredd (led) | 0,318 m (avståndet mellan STANDARD-axlarna) | 0,366 m |
| Överarm / underarm | båda passade till 0,290 / 0,260 m | samma mål |
| Bålhöjd höft→axel | båda passade till 0,549 m | samma mål |

Passningen sker med MPFB-mått-targets: `arms/measure-upperarm-length`, `measure-lowerarm-length`, `torso/measure-shoulder-dist`, `measure-napetowaist-dist` + `measure-waisttohip-dist`. Ett tidigare fel (för kort bål, «ihopsjunken») rättades genom att fördela de 2,8 cm som saknades över de två bål-targets.

Kläder finns inte på grunddockan (naken mesh för QC). Se avsnitt 10.

---

## 7. Skelett, leder, IK och ansikte

**77 ben totalt**, varav **67 deformerande**. Hierarki (föräldern inom parentes där det hjälper). Längder nedan är kvinnans, ur `qc/inspektion/standarddocka_kvinna_glb.json`.

### 7.1 Kropp och ben (Mixamo-namn, utan prefix)

| Ben | Förälder | Längd (m) | Roll |
| --- | --- | --- | --- |
| rot | – | – | Rot; IK-kontroller hänger här. Deformerar inte. |
| Hips | rot | 0,117 | Höft / pelvis |
| Spine, Spine1, Spine2 | Hips → … | 0,116 / 0,135 / 0,146 | Ryggrad till axelgördel |
| neck | Spine2 | 0,065 | Nacke (`neck` med litet n, som dealer3d) |
| Head | neck | 0,059 | Huvud |
| Left-/RightShoulder | Spine2 | 0,113 / 0,122 | Nyckelben |
| Left-/RightArm | Shoulder | 0,290 | Överarm (passad till STANDARD) |
| Left-/RightForeArm | Arm | 0,260 | Underarm |
| Left-/RightHand | ForeArm | 0,040 | Handlov |
| Left-/RightUpLeg | Hips | 0,375 | Lår |
| Left-/RightLeg | UpLeg | 0,382 | Underben |
| Left-/RightFoot | Leg | 0,132 | Fot |
| Left-/RightToeBase | Foot | 0,132 | Tå |

### 7.2 Fingrar (båda händer, tre leder vardera)

Per hand, alla med förälder `*Hand` för länk 1 och sedan kedja 1→2→3:

| Ben | Längd kvinna (m) |
| --- | --- |
| *HandThumb1 / 2 / 3 | 0,028 / 0,033 / 0,033 |
| *HandIndex1 / 2 / 3 | 0,024 / 0,021 / 0,021 |
| *HandMiddle1 / 2 / 3 | 0,031 / 0,025 / 0,025 |
| *HandRing1 / 2 / 3 | 0,027 / 0,023 / 0,023 |
| *HandPinky1 / 2 / 3 | 0,019 / 0,014 / 0,014 |

### 7.3 Ansiktsben under Head (16 st, inklusive headfront)

Alla har `Head` som förälder. `headfront` krävs av dealer3d; de övriga 15 är MPFB-ansiktsben för mimik tillsammans med shape keys.

| Ben | Roll |
| --- | --- |
| headfront | Referens framåt på huvudet (dealer3d-krav) |
| jaw | Käke |
| eye.L, eye.R | Ögon (blick; kompletterar saknade eyeLook-shape keys) |
| oculi01.L/R, oculi02.L/R | Ögonring / ögonlock |
| orbicularis03.L/R, orbicularis04.L/R | Ögats ringmuskel |
| oris01, oris05 | Mun |
| risorius03.L/R | Mungipor |

### 7.4 IK-kontroller (deformerar inte, förälder `rot`)

`IK_hand.L/R`, `pol_armbage.L/R`, `IK_fot.L/R`, `pol_kna.L/R`.

- Arm-IK: kedja 2 på `ForeArm`, poltarget `pol_armbage`, handen `COPY_ROTATION` från `IK_hand`.
- Ben-IK: kedja 2 på `Leg`, poltarget `pol_kna`.
- **IK-constraintarna står på 0 (av) som standard**, så att dealer3d-retargeting och inbakade Actions inte slåss med IK. Slå på dem när du poserar för hand.

### 7.5 Ledgränser

Lokala `LIMIT_ROTATION`-constraints (`ledgrans`), plus IK-gångjärn. Värden i grader, symmetriskt ± om inget annat sägs. Källa: `scen/bygg_docka.py`.

| Led | X | Y | Z | Kommentar |
| --- | --- | --- | --- | --- |
| ForeArm (IK-gångjärn) | 0…150° på böjaxeln, övriga låsta, Y låst | | | Armbågen böjs bara åt ett håll, max 150° |
| Leg (IK-gångjärn) | samma, max 150° | | | Knä |
| Fingerleder (Thumb/Index/Middle/Ring/Pinky 1–3) | ±100 | ±25 | ±100 | |
| Spine, Spine1, Spine2 | ±30 | ±25 | ±25 | |
| neck | ±35 | ±40 | ±30 | |
| Head | ±35 | ±45 | ±30 | |
| jaw | ±35 | ±5 | ±10 | |
| eye.L / eye.R | ±30 | ±5 | ±35 | |

`mest_lutning_rad` / `mest_vridning_rad` = 0,6 rad ≈ 34° ur `doll.ts STANDARD` beskriver spelets tillåtna bållutning, inte Blender-constraintarna.

### 7.6 Bennamn mot dealer3d

dealer3d (`figure-model.ts`) kräver exakt dessa exportnamn, **utan** `mixamorig:`-prefix:

`RightArm`, `LeftArm`, `RightForeArm`, `LeftForeArm`, `RightHand`, `LeftHand`, `RightUpLeg`, `LeftUpLeg`, `RightLeg`, `LeftLeg`, `RightFoot`, `LeftFoot`, `neck`, `Head`, `headfront`.

Vår docka uppfyller listan. Fingrar och ansiktsben är utöver kraven och stör inte.

### 7.7 30 ARKit shape keys – och vad som saknas

Från MPFB:s inbyggda uttrycks-targets, namngivna enligt ARKit. Utöver `Basis`:

`eyeBlinkLeft/Right`, `eyeWideLeft/Right`, `eyeSquintLeft/Right`, `browDownLeft/Right`, `browInnerUp`, `browOuterUpLeft/Right`, `jawOpen`, `mouthSmileLeft/Right`, `mouthFrownLeft/Right`, `mouthPucker`, `mouthFunnel`, `mouthPressLeft/Right`, `mouthUpperUpLeft/Right`, `mouthLowerDownLeft/Right`, `mouthStretchLeft/Right`, `mouthDimpleLeft/Right`, `noseSneerLeft/Right`.

ARKit-setet har typiskt 52 blendshapes. **22 saknas** (MPFB hade ingen bra käll-target, eller blick sköts av ben):

| Saknas | Varför det går an / vad som fattas |
| --- | --- |
| `eyeLookDown/In/Out/Up` Left+Right (8 st) | Blicken styrs av `eye.L/R`-benen i stället |
| `cheekPuff`, `cheekSquintLeft/Right` | Ingen kindpuff/-kisar |
| `mouthClose`, `mouthLeft`, `mouthRight` | Munstängning / förskjutning i sidled |
| `mouthRollLower/Upper`, `mouthShrugLower/Upper` | Läpprullning och shrug |
| `jawForward`, `jawLeft`, `jawRight` | Käkens skjuv – `jaw`-benet täcker öppning |
| `tongueOut` | Ingen tunga |

Tillräckligt för blink, bryn, leende, trut och käke i ett dealerkort. Inte en full face-capture-rig.

---

## 8. Bryggan dealer3d ↔ Blender

dealer3d sparar rörelser som JSON (till exempel `dealer3d/data/giv-fran-2-3-p5c1-naturlig-cykel-paow.json`), i **linsvärlden**.

| Fält | Innehåll |
| --- | --- |
| `fps`, `frameCount` | Bildtakt (ofta 30) och antal bildrutor |
| `hip` | Dockans höft, linsvärld (m) |
| `frames[i].L`, `.R` | Vänster/höger arm: `s` axel, `e` armbåge, `w` handled, `k`, `p` 21 handpunkter i MediaPipe-ordning |
| `frames[i].h`, `.g` | Huvudets mitt; blickpunkt |
| `frames[i].card` | Kortet: `c` mitt, `l` långsida, `n` normal, `id` |

```text
# dealer3d → Blender
blender -b assets/docka/standarddocka_kvinna.blend --python-exit-code 1 --python verktyg/dealer3d_till_blender.py -- --in <rörelse.json> [--namn NAMN] [--spara fil.blend] [--naturlig-hand]

# Blender → dealer3d
blender -b <fil.blend> --python-exit-code 1 --python verktyg/blender_till_dealer3d.py -- --action NAMN --ut ut.json
```

`--naturlig-hand` vrider handflatan nedåt vid nedsläpp (annars kan greppet se «klamt» ut, som i den tidiga p5c1-retargeten).

Retargeting (`dealer3d_till_blender.py`):

- Placerar `Hips` på källans `hip` (Y = 0,38 m bakom kanten för Paow).
- Riktar `Spine/Spine1/Spine2` mot källans axelmitt och axellinje.
- Låter `RightShoulder/LeftShoulder` följa med framåt vid lång sträckning.
- Siktar `neck/Head` mot `h` och blick `g`.
- Använder dealer3d:s armbåge `e` som poltarget.
- Fördelar ungefär 55 % av handledens vridning (pronation/supination) längs `ForeArm`.
- Ställer `hand_axlar` med rätt tecken (`R = +1`, `L = −1`).

Före/efter för p5c1: `qc/p5c1_f63_fore_efter.png`. Kvalitetskrav: handleden över rätt kortplats, kortets normal upp, ingen axelurled, bålen inte genom bordskanten.

Omräkning linsvärld ↔ Blender sköts av `gemensamt/riggverktyg.py`.

---

## 9. Kontroll

Kommandona och verktygen står i `README-SV.md` (Kontroll). Det som bedöms är bilder: kontrollbilder genom de fasta kamerorna, där `film` är spelets egen kamera, och spelets egna bildpunkter ritade över renderingen (de ska ligga mitt i Blenders kort). En modell som en agent ska förstå dumpas till text med `verktyg/inspektera.py`: ben, hierarki, mått och rörelser.

Kontrollbilderna renderas med EEVEE. Längre filmer renderas bättre på den stationära datorn (RTX 3060); laptopen tar ungefär 20–30 s per ruta i Cycles på processorn.

---

## 10. Hur man anpassar en specifik dealer

Grundregeln: **samma skelett, byta det som syns**. Då fungerar alla 40 Actions utan omretargeting.

1. **Proportioner.** Utgå från kvinna eller man. Justera MPFB-mått (längd, axelbredd, arm, bål, midja) i en kopia av `bygg_docka.py` eller en egen YAML-profil, och bygg om. Ändra inte bennamn. Kontrollera att `over_arm`, `underarm` och räckvidd fortfarande når P1, P7 och skon – eller dokumentera avvikelsen och kompensera med lutning (max ca 0,6 rad enligt STANDARD).
2. **Ansikte och hud från foton.** Använd steg 01–03 för att ta fram ett huvud (Meshy eller fotogrammetri), och byt huvudets *mesh och textur* på grunddockan. Behåll `Head` och ansiktsbenen; oversampla vikter från den befintliga riggen. Shape keys kan behöva omprojektion. Originalfoton stannar på datorn, i `input/<namn>/`.
3. **Kläder som separata mesh.** Jacka, skjorta, byxor, skor modelleras eller köps som egna objekt, binds till **samma armatur** (data transfer / weights från kroppen). Kläder ska inte bakas in i kroppsmeshen: då blir det svårt att byta outfit och lätt att förstöra vikter. Grunddockan är naken just för den uppdelningen.
4. **Hår, accessoarer, bricka/klocka.** Egna objekt, samma rig eller child-of mot lämpligt ben (`Head`, `RightHand`, …).
5. **Rörelser.** Återanvänd katalogen. Justera bara om räckvidden skiljer sig så att en given inte når C1 – då i skript, inte som tyst överskrivning av en godkänd Action.
6. **Export till dealer3d.** Samma GLB-kontrakt (bennamn enligt avsnitt 7.6). Testa en känd rörelse tur och retur med bryggan.

Betalda Meshy-/Runway-steg bara med Jakobs ja.

---

## 11. Tekniska val och varför

| Val | Mot | Varför vi valde så |
| --- | --- | --- |
| Procedurellt bord, kort, sko, bricka, chips | Meshy eller färdiga modeller | Exakta mått och upprepbarhet. En millimeter fel på ett kort syns i filmlinsen. Meshy vinner när formen är organisk och måtten lösa – därför är **stolen** det enda Meshy-objektet. |
| MPFB2 + Mixamo-ben | Rigify, eller Meshy-rig som grund | dealer3d och Mixamo-biblioteket förväntar `RightArm` / `RightForeArm` / `neck` / `headfront`. Rigify har andra namn och skulle kräva en ständig omnamningsbrygga. MPFB ger mätbara proportioner och CC0-kropp. |
| Två kön, ett skelett | En docka, eller unikt skelett per dealer | Actions återanvänds. Kön är mesh + mått, inte en ny rig. |
| Höft Y = 0,38 m (Paow) även på ovalen | Gamla ASSUMED 0,18 m | 0,18 m stack in i BORD-02:s vingar. På ovalen finns inga vingar, men 0,38 m är den uppmätta dealerpositionen ur film och den dealer3d använder för Paow-rörelser. Vi behåller den. |
| Ovalen som byggt default, BORD-02 som alternativ | Bygga bara BORD-02, eller Kortplan-halvcirkeln | Spelets `tableModel` default är `'standard'`. Halvcirkeln i Kortplan är en förenklad visning, inte måttstandarden. |
| Skriptad giv först, mocap som komplement | Ren text-till-rörelse | Handen ska hamna där kortet ska ligga. AI-motion (Meshy Text to Motion, Kimodo, …) är bra utkast för vila/andning, sällan tillräckligt för en giv. |
| Mocap-rekommendation | – | Filma en giv med kroppen tydlig (Rokoko Vision, QuickMagic, DeepMotion, ev. Tencent FlowHMR lokalt). Retargeta till standarddockan. Räkna med extra arbete på händer och kortkontakt. Mixamo-biblioteket är bra för vila, inte för casino-givar. |
| Filmförädling efter 3D | Text-till-film som ersätter 3D | Kling 3.0 Motion Control / Wan Animate / Runway Act-Two (och Aleph/Luma när de används som stil-lager) får hud och ljus att kännas fotografiska, **med vårt klipp som rörelsestyrning**. Act-Two i stillbildsläge hittar på egen kamerarörelse – använd hellre vårt klipp som character video om kameran ska vara låst. |
| Headless Blender, inte GUI-MCP i vardagen | Styra Jakobs öppna Blender | Säkrare. En MCP mot Blender får bara kopplas till en avsedd instans, aldrig till fönstret där någon redan tittar. |

---

## 12. Licenser

| Tillgång | Licens |
| --- | --- |
| MPFB 2.0.18, kropp och targets | CC0 (MPFB:s tillgångar) |
| Kortframsidor, 52 st (Wikimedia Commons, Dmitry Fomin, SVG English pattern; PNG 360×540) | **CC0 1.0**, kontrollerade via Commons extmetadata 2026-11-25. Url per fil i `assets/bord/kort/kallor.json` |
| Kortbaksida | Egen, fri |
| Filt-struktur (Poly Haven «Scuba Suede»), trä («American Walnut Veneer»), läder («Brown Leather») | **CC0** (https://polyhaven.com/license) |
| Mixamo-klipp, om de används | Adobe förbjuder omdistribution av råfiler och att träna AI/ML på innehållet. Egna Actions vi skriptar påverkas inte. |
| Meshy-stolen | Meshy-ToS för den uppgiften vi betalade; råfil i `assets/meshy/`. Inte mer än stolen. |
| Spelets mått och källkod | Tillhör blackjack-dealer-projektet; vi läser dem och anger fil och namn som källa. |

Detaljer för bordstexturer och kortatlas: `assets/bord/LICENSER.md`. Atlasen är 13×5 rutor (A–K × spader/hjärter/ruter/klöver/baksida), 315×440 px per kort (5 px/mm).

---

## 13. Meshy-logg

Varje anrop loggas i `assets/meshy/meshy-logg.json` (saldo före/efter), bredvid råfilen: det är kvittot. Inga nya anrop utan Jakobs ja; `scen/meshy_stol.py` beställer inget när råfilen finns och kräver `--betala`.

2026-11-25 (Europe/Stockholm): **en** text-to-3D för dealerstolen, meshy-7.1, preview 20 + refine 10 = **30 krediter**, saldo **596 → 566**. Task preview `01a213fd-c334-71bd-93f2-fbcb2166bf4f`, refine `01a213fe-be63-7336-b4fd-0097f771171a`, båda SUCCEEDED (19:35–19:37). Prompt ungefär: hög blackjack-dealerpall, mörkbrun lädersits, låg rygg, svart metall, fotring. Skon, korten, chipsen och bordet byggs procedurellt.

Provdealern Rosalina, gjord från foton (cirka 95 krediter), raderades 2026-11-26 på Jakobs ord, med sina kvitton.

---

## 14. Kända brister och nästa steg

- Rörelsekatalogen är inte fylld med ~40 färdiga, godkända klipp. Nästa stora arbete efter standardscenen.
- Grunddockan saknar kläder (medvetet). Nästa steg: skjorta/väst/byxor som separata mesh på samma rig.
- Vägen från foton (steg 01–08) är inte kopplad till standardscenen: steg 08 bygger sitt eget bord. Ingen dealer från foton finns kvar: provdealern Rosalina raderades 2026-11-26.
- Texturerna, korten och kortatlasen i `assets/bord/` hämtades för hand; adresserna står i `kallor.json` men inget skript hämtar dem eller bygger atlasen. Stolens råfil är betald och finns bara på datorn där den beställdes. På en annan dator kan bordet och stolen därför inte byggas förrän filerna finns där.
- Vilan (`sitt_vila`) håller händerna i luften framför magen; i spelets filmer vilar händerna på filten vid bordskanten.
- Standarddockans avstånd till bordet är inte valt: måttfilen sätter henne på Paows uppmätta 0,38 m med blackjack-dealers antagna armar (0,29 och 0,26 m), och blackjack-dealers egen standarddocka står på antagna 0,18 m. Se 5.9.
- Kortplans «dockans 3D-bord» är en halvcirkel r = 1,02 m, inte ovalen 1,90 × 1,15 m. Vi följer ovalen i Blender; avvikelsen är värd att känna till när man jämför med Kortplan.
- `TABLE.b = 0,60 m` i spelets kontrakt skiljer sig från `REAL_TABLE.depth = 1,15 m` under linsen. Vi bygger det som filmen ser (1,15 m).
- Kassering, en del rull-/bensmått, kläder och flera kameror (`dealer_ogon`, `hander`, `hel`, `topp`) är antagna.
- 22 ARKit-nycklar saknas (avsnitt 7.7).
- Skon är en funktionell låda, inte en fotograferad skormodell.
- Överföringen av en rörelse från blackjack-dealers docka är grov: i provet med given till plats 5 sträcker dockan armen rak, lutar sig djupt och pekar fingrarna rakt ned (`--naturlig-hand` vänder handflatan nedåt). Bryggan sätter handleden över kortets mitt, medan blackjack-dealers docka når kortet med fingrarna.
- Rendering på laptopen är långsam för längre klipp.
- Inget Blender-MCP i vardagen ännu.
- blackjack-dealers docka i studion ritas ännu som cylindrar och kulor; standarddockans kropp är inte inkopplad där.
