# new_docka – standarddockan

Standarddockan och standardscenen: syftet, vägen från spelets mått till en byggd docka, koordinaterna, måtten i korthet, dockorna, skelettet och lederna, bryggan mot `blackjack-dealer`s docka, hur en dealer anpassas, valen och varför, licenserna och det som återstår.

Reglerna står i `AGENTS.md`, mapparna och kommandona i `README-SV.md`. Måtten har en källa, spelets kod i `../blackjack-dealer` (livebordet i `src/table-live.ts`, kortet i `src/space.ts`, dockorna i `dealer3d/src/doll.ts`); `scen/standard.yaml` är de talen i Blenders koordinater, skriven av `scen/gen_standard.py`. Talen i det här dokumentet är en läsbar bild av måttfilen som den stod 2026-11-27: skiljer de sig gäller måttfilen.

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

Det finns **två vägar** som möts i samma standardscen och samma skelett. Alla sätt att bygga en docka, del för del, och vad som går ihop står i `VAGAR.md` (skriven ur `vagar.json`).

### 3.1 Ny väg: standardscenen (det vi bygger nu)

| Steg | Vad | Kommando |
| --- | --- | --- |
| A. Läs spelet | `scen/las_spelet.ts` läser spelets kod i `../blackjack-dealer`, och `scen/gen_standard.py` skriver `scen/standard.yaml` med källan på varje rad. Måttfilen ändras aldrig för hand. | `python scen/gen_standard.py` |
| B. Bygg bordet | Procedurellt ur YAML: livebordet (filten en halvcirkel, rullen, sargen, benen), skon, lådan för använda kort, 52 kort, kortplatsernas markeringar och insatsringarna, utan markerbricka; `-- --med-bricka` lägger vår markerbricka vid kanten (`standardbord_live_bricka.*`). | `blender -b --factory-startup --python-exit-code 1 --python scen/bygg_bord.py` |
| C. Bygg dockorna | MPFB 2.0.18: grunddockorna kvinna och man med identiskt skelett och människans mått, och på mannens grund dockorna med mätta mått (Danilo, Frasse, Tomasz och personerna i `personer/`; avsnitt 6). Utan `--kon` byggs kvinnan och mannen, `-- --kon <docka>` bygger en. Kräver MPFB, därför inte `--factory-startup`. `-- --namn N` skriver `standarddocka_<docka>_N.*` (prov) i stället för de modeller som används. | `blender -b --python-exit-code 1 --python scen/bygg_docka.py` |
| D. Bygg stolen | Meshy-stol skalad till `stol.sits_z` / `sits_mitt`. | `blender -b --factory-startup --python-exit-code 1 --python scen/bygg_stol.py` |
| E. Importera en rörelse | dealer3d-JSON → Blender-Action på en docka. | se avsnitt 8 |
| F. QC | Rendera fasta kameror, måttöverlägg, kontroll mot spelets kortpixlar. | se avsnitt 9 |
| G. Katalog + klipp | En rad i `rorelser/katalog.yaml` per rörelse (`id`, `namn`, `langd_s` 2–20, `seat`, `status`). En rörelse = en Action. Rendera 2–20 s. | headless `blender -b --python …` |
| H. Valfri filmförädling | Runway Aleph / Luma / Kling / Act-Two, med 3D-klippet som rörelsestyrning. **Bara med Jakobs ja** (betalt). | – |

### 3.2 Gamla vägen: avatar-auto-pipeline steg 01–08 (från foton)

Skripten i `steg/` bygger en **specifik dealer från fotografier** via Meshy, inte grunddockan. Använd dem när en verklig person ska in – och behåll sedan **samma Mixamo-skelett** så Actions från standarddockan kan återanvändas.

| Steg | Mapp | Roll |
| --- | --- | --- |
| 01 | `steg/01-referenser/` | Gör tre referensbilder ur fotona med gpt-image-2: huvudet framifrån, kroppen i A-pose och en öppen högerhand (`apose_referenser.py`). |
| 02 | `steg/02-meshy-delar/` | Meshy image-to-3D för huvud, händer och kropp var för sig (`meshy_enbild.py`, `rendera_vyer.py`). **Betalt – kräver Jakobs ja.** |
| 03 | `steg/03-montering/` | Montera delarna i A-pose, rensa bröstkorg, förenkla 4K-mesh (`montera_apose.py`, `clean_kropp_chest.py`, `forenkla_4k.py`, …). Händerna behåller sin egen handled och skarven läggs inne i ärmen (`HANDLED_IN`); förr vidgades handleden till ärmens mått. |
| 04 | `steg/04-rigg/` | Meshy Auto-Rig (`meshy_rigg.py`). **Betalt – kräver ja.** |
| 05 | `steg/05-fingrar-handleder/` | Bygg fingerrigg, rensa vikter och gör handleden ren (`fixa_handleder.py`): handens vidgning från monteringen räknas tillbaka, handleden går in i ärmen, hudremsan vid manschetten och skarven färgas som ärmen. |
| 06 | `steg/06-dealer-export/` | Exportera dealer-A-pose som GLB som dealer3d kan läsa, med två vridben i varje underarm (`vridben.py`, 7.1b; huden i vila mäts oförändrad). |
| 07 | `steg/07-qc/` | QC-översikt (helkropp, ansikte, handleder). |
| 08 | `steg/08-film/` | Animera dealern i en filmscen (`animera_dealer.py`). Ny standardscen ska användas i stället för ad hoc-bord. |
| 09 | `steg/09-ansikte/` | Prov, körs för hand: en färdig dealer får standarddockans 30 ansiktsformer på sitt eget huvud, ögonleder med en glob per öga och käkleden (`ansikte.py`); munnen skärs upp. |
| 10 | `steg/10-kropp-i-ett-stycke/` | Prov, körs för hand: en kropp ur Runway (Hunyuan 3D 3.1 Pro) med hand och arm i ett stycke blir en docka utan påsatta händer. Meshy-huvudet sys på och händerna märks som Handpar (`montera_huvud.py`), skelett och vikter lånas av en färdig docka, armbågen och handleden läggs i kroppens egen arm och fingrarna sätts med steg 5:s `fit_fingers` i handens egen ram (`rigga.py`, `fingrar_handflata.py`: handflatan pekar framåt i Hunyuans A-pose). `prova_hander.py` knyter handen och nyper på vilken dealer som helst. |
| 11 | `steg/11-pa-dockans-grund/` | Prov, körs för hand: en färdig dealer sätts på en grunddockas skelett (Danilo eller Frasse), led för led, så att han spelar dockans rörelser utan skalning (`pa_grund.py`). Armar, ben och fingrar vrids och sträcks ben för ben till dockans leder och längder, bålen och handflatan formas mjukt genom lederna, huvudet flyttas utan att formas om, och ytan binds till dockans armatur med sina egna vikter; fingrarna behåller sin egen krökning i vila. |

Körning via `auto_avatar.py` / `STARTA avatar.cmd`. Nycklar i `.env`. Betalda steg sparar kvitton i stegmappen. Steg
12–15 och `ny_dealer.py` (en ny dealer ur bilder, en rad) står i `README-SV.md`.

Rekommenderad hybrid för en namngiven dealer: börja med grunddockan (väg 3.1) för proportioner och skelett, använd fotostegen bara för **ansikte/hud och kläder**, inte för att byta skelett.

---

## 4. Koordinatsystem

Allt i Blender och i `standard.yaml` är **meter, Z upp, högerhänt**.

| | Värde | Källa |
| --- | --- | --- |
| Origo | Golvet rakt under dealerkantens mitt (s = 0) | `LIVE.edge` i `src/table-live.ts` |
| +X | Dealerns vänster = bildens höger sett från spelarna (samma x som livebordets linsvärld) | konvention, dokumenterad i YAML-huvudet |
| +Y | Bakåt, från spelarna mot dealerns rygg. Spelarna står på −Y. Blenders Front-vy (från −Y) ser dealern framifrån | YAML-huvudet |
| +Z | Upp | YAML-huvudet |
| Filtens Z | 0,95 m, slutlett: golvet syns aldrig i filmen (±0,1 m) | `LIVE.floor` |
| Bordets (x, s) | X = x, Y = −s. s = 0 är dealerkanten, s ökar mot spelarna | YAML-huvudet |
| Yaw | Grader moturs sett ovanifrån, 0 = längs +X | YAML-huvudet |

Omräkning från livebordets linsvärld (three.js, Y upp, kameran i (0, h, 0) tittar mot −z):

```
X = x
Y = −(z − dealerkant_lins_z) = −(z + 1,5375)
Z = y + 0,95
```

Riktningar: `(x, −z, y)`. Kod: `gemensamt/riggverktyg.py` (`Ram`). `dealerkant_lins_z = −1,5375` ur `LIVE.edge`.

---

## 5. Mått och standarder

Varje tal i `scen/standard.yaml` har `# källa: fil (namn)` eller `# antaget:` + motivering. **Spelet vinner.**

### 5.1 Filmkamera (livebordets kamera, hela världen räknas ur den)

| Mått | Värde | Källa |
| --- | --- | --- |
| Bild | 1728 × 972 px | `LIVE_CAMERA.film` |
| Brännvidd | 26,8812 mm på 36 mm sensor (sensor_fit HORIZONTAL) | härlett: `focal_px / bild_bredd * 36`; focal_px 1290,3 ur `LIVE_CAMERA`, mätt ur 29 kort på filten |
| Höjd över filten | 0,6175 m | `LIVE_CAMERA` |
| Lutning | 18,13° nedåt; rullningen −0,16° tas inte med i Blender | `LIVE_CAMERA` |
| Position i standardkoordinater | (0, −1,5375, 1,5675), mål (0, 0,3484, 0,95) | `liveFrame()` |
| Kontroll | Spelets kortpixlar hamnar mitt i Blenders kort | `verktyg/qc_kontroll_film.py` |

Övriga kameror (bilden 1728 × 972 om inget annat sägs, alla antagna): `dealer_ogon` (Danilos ögon 9 cm framför axlarnas plan i den mätta höjden, tittar på plats 4, 24 mm); `hander` (85 mm närbild från spelarsidan); `hel` (35 mm QC); `topp` (ortografisk, skala 2,3 m).

### 5.2 Bordet

Livebordet, mätt på filmen: en halvcirkel med rak kant mot dealern (bågen en cirkel inom 1,8 mm), radie 0,7295 m med mitten 1,56 cm bakom kanten, 1,459 m brett längs kanten och 0,714 m djupt (`LIVE.felt`). Rullen utanför bågen, sargen, benen, färgerna och texturerna är vårt utseende. Spelets 3D-scen bygger samma bord (`tableUnder` i `src/scene3d-table.ts`, `STANDARD.bord`).

### 5.3 Filt, rulle, sarg, bricka, marker

| Del | Mått | Källa |
| --- | --- | --- |
| Filt Z | 0,95 m | `LIVE.floor` (slutlett) |
| Rulle bredd | 0,10 m | antaget (vår), `LIVE.rail` |
| Rulle mitt över filt | 0,012 m | `LIVE.rail.section` |
| Rulle halv höjd | 0,034 m | `LIVE.rail.section` |
| Sarg underkant | −0,16 m relativt filt | antaget (vår) |
| Mässingslist | [−0,002, 0,005] m | antaget (vår) |
| Ben | x = ±0,58 m, s = 0,25 m | antaget (vårt) |
| Filtfärg, markeringsfärg | `#134232`, `#d8b665` | antaget (vår) |
| Markerbricka | livebordet har ingen; vår med `--med-bricka`: x −0,30…+0,24 m, s 0…0,10 m, djup 0,03 m, mässingsram 7 mm, 12 rader rör, chip radie 0,0195 m och höjd 0,003145 m | `markerbricka` i `standard.yaml`; `game3d-chips.ts` |
| Kortmarkering | 4 mm marginal, 3 mm linje runt kortplatserna | antaget, för att kortet ska synas inne i ramen |

### 5.4 Kort

| Mått | Värde | Källa |
| --- | --- | --- |
| Bredd × längd × tjocklek | 63 × 88 × 0,3 mm | `CARD` i `src/space.ts` |
| Hörnradie | 3,5 mm | `CARD` |
| Lekar i skon | 8 (antaget; vanlig kasinosko 6–8) | antaget |

### 5.5 Kortplatser P1–P7 och D

Mittpunkter på filten för varje kortplats står under `platser` i `scen/standard.yaml`, med kortets vridning (`yaw_kort`). Källa: `LIVE.cards` i `src/table-live.ts`: där korten först låg stilla i filmen, vinkeln mätt där landningarna är eniga och annars spegelbilden av samma kort på den speglade platsen. Platserna räknas ännu från bildens vänster: P1 längst till vänster i bilden (dealerns höger), P7 närmast skon. Korten ligger 0,18–0,51 m framför dealerkanten.

### 5.6 Insatsringar (bet)

| Mått | Värde | Källa |
| --- | --- | --- |
| Mitt | livebordets insatsmärken, plats 1 till vänster i bilden | `LIVE.betMarks` |
| Radie | 0,027 m | `BET` i `src/standard.ts` |
| Linjebredd | 3 mm | antaget, samma som kortmarkering |

P1…P7: P1 (−0,4967, −0,4040, 0,95) … P4 (0,0004, −0,6301, 0,95) … P7 (0,4991, −0,3983, 0,95).

### 5.7 Sko

Dealerns sko på bildens högra sida (dealerns vänster): en lång klar låda, öppen upptill, med en klar ram i fronten som lutar bakåt och ett fönster där nästa kort syns med ryggen utåt; kortleken ligger på en bädd som stiger bakåt. Källa: `LIVE.shoe`, `liveShoePose()`, `liveShoeCard()`.

| Mått | Värde |
| --- | --- |
| Längd × bredd (foten) | 0,274 × 0,103 m |
| Höjd bak / fram | 0,117 / 0,061 m |
| Frontens lutning | 56,6° från filten |
| Bäddens lutning | 13,4° |
| Fönsterlyft | 0,003 m |
| Fotens främre hörn mot spelarna | (0,4521, −0,1531, 0,95) |
| Yaw bakåt | 15,512° |
| Fönsterkortets mitt | (0,4577, −0,0981, 0,9787) – där handen tar |
| Kortleken | 0,18 m längs bädden (skattat: åtta lekar) |
| Översta 5 korten | egna objekt `sko_kort_1…5` (`dragbart`, meshen `sko_kortrygg` med ryggen utåt); resten en bunt |
| Lös bit | en klar bit som ligger plant på filten framför skon; kortet som dras ut glider över den (`LIVE.clearPiece`) |

### 5.8 Kassering

Mätt: en klar låda vid dealerns högra hörn, öppen upptill, med de använda korten liggande med ryggen upp (`LIVE.box`, `liveBox()`): mitt (−0,6115, −0,0351, 0,95), yaw 2,14°, yttermått 76 × 93 × 157,5 mm; väggarna 4 mm akryl (antaget).

### 5.9 Dealerposition och stol

Dealrarna i filmen sitter på en hög stol (`LIVE.dealer`). Hur djupt bakom kanten de sitter syns svagt framifrån: 0,2 m är antaget. Armarna går inte att mäta; dockornas egna används.

| Mått | Danilo (stilen kameran) | Frasse (stilen bordet) | Källa |
| --- | --- | --- | --- |
| Överarm / underarm | 0,279 / 0,272 m | 0,279 / 0,272 m | `DANILO`, `FRASSE` i `doll.ts` |
| Räckvidd axel→handled | 0,536 m | 0,536 m | samma |
| Axlarnas mitt | (0,0330, 0,2005, 1,2680) | (0,0460, 0,2005, 1,2600) | `LIVE.dealer` |
| Axelbredd | 0,357 m | 0,348 m | `LIVE.dealer` |
| Axlar över filten | 0,318 m | 0,31 m | `doll.ts` |
| Höft under filten | 0,1146 m | 0,1226 m | `doll.ts` |
| Ögon över filten | 0,509 m | 0,514 m | `LIVE.dealer` |

Måttfilens `docka`-block är Danilos plats och mått, där `bygg_docka.py` ställer dockan.

Stolen syns inte i filmen. `sits_z` 0,67 m (slutlett: `LIVE.floor.seatOverFloor`); antaget: `sits_mitt` (0,0330, 0,28) så att höftleden hamnar över sitsens främre del, sits 0,42 × 0,40 m, ryggstöd 0,35 m, fotstöd Z 0,22 m. Stolen är Meshy-modellen, skalad i `bygg_stol.py`.

### 5.10 Räckvidd

`rackviddstest.mal`: skons fönsterkort, D.C1, P1.C1, P7.C1. Handleden ska hamna 0,02 m över kortet (antaget). Där armen inte når lutar dockan bålen (`lyft-till-docka.ts` i `blackjack-dealer/dealer3d/tools/`).

---

## 6. Dockorna

Två grunddockor med **100 % identiskt skelett och samma bennamn**, så att alla Actions kan återanvändas rakt av. Motor: **MPFB 2.0.18** (CC0-tillgångar) + Mixamo-inbyggt skelett, namn utan `mixamorig:`-prefix, `neck` med litet n.

Måtten är en människas för kön och längd: MPFB:s egen kropp för könet och längden, och där den avviker flyttad till medlet i ANSUR II (US Army 2012, personer av samma kön och längd ±2 cm). Talen och källorna står i `MATT` i `scen/bygg_docka.py`; bygget skriver vad det blev i `docka-rapport-<namn>.json` (slasken, `bygge/`).

| | Kvinna | Man |
| --- | --- | --- |
| Fil | `assets/docka/standarddocka_kvinna.blend/.glb` | `assets/docka/standarddocka_man.blend/.glb` |
| MPFB `gender` | 0,0 | 1,0 |
| Stående längd | 1,65 m | 1,75 m |
| Axelleder isär | 0,337 m (akromion 368 mm, ANSUR 368) | 0,375 m, MPFB:s egen (akromion 418 mm, ANSUR 415) |
| Överarm / underarm (leder) | 0,263 / 0,249 m | 0,279 / 0,272 m |
| Armarnas omkrets: underarm som tjockast / handled / överarm mitt | 255 / 150 / 285 mm | 290 / 170 / 320 mm |
| Hand / fot | 182 / 249 mm | 193 / 271 mm |
| Höftled → axelleder (lodrätt) | 0,463 m, MPFB:s egen | 0,483 m |
| Höftled / knäled över golvet | 0,851 / 0,459 m, MPFB:s egna | 0,903 / 0,490 m |
| Huvudets bredd | 142 mm, MPFB:s egen | 152 mm |

Passningen sker med MPFB-targets, alla mått tillsammans (de rör varandra, och allt följer skalningen till längden): armarnas längd (`arms/measure-upperarm-length`, `measure-lowerarm-length`), armarnas tjocklek (underarmens tvärsnitt med `arms/*-lowerarm-scale-depth` och `-scale-vert`, handleden med `hands/measure-wrist-circ`, överarmen med `arms/measure-upperarm-circ`; `-scale-horiz` förlänger underarmen och används inte), händerna och fötterna, kvinnans axlar (`torso/measure-shoulder-dist`), och mannens ben (`legs/measure-upperleg-height`, `measure-lowerleg-height`), bål (`torso/measure-napetowaist-dist`), hals (`neck/measure-neck-height`, som tar det benen lämnar så att huvudet behåller sin storlek) och huvudets bredd (`head/head-scale-horiz`). Omkretsen mäts som ett måttband (konvext hölje) i ett snitt genom huden vinkelrätt mot benet.

**Danilo och Frasse** (`standarddocka_danilo` och `standarddocka_frasse`, `--kon danilo|frasse`) är två män med mått mätta
på dealrar i en film (`live-bj/data/uppsattning.json`, `dealer.kameran.body` och `dealer.bordet.body`), med samma skelett,
ansiktsformer och ansikte (7.8) som standarddockorna. Bara måtten följer med, inget av personernas utseende. Kroppen börjar
som mannens och får hans armar, händer, fötter, ben, bål och hals (därför samma rörelser), och det som mättes: axellederna
isär 0,357 / 0,348 m (`torso/measure-shoulder-dist`) och hakan till hjässan 0,228 / 0,210 m, skattad (`head/head-scale-vert`
och `-scale-depth` lika, bredden med `head/head-scale-horiz` i samma förhållande, så att ansiktet bara blir mindre). Halsen
är mannens (hakan 0,133 m över axelledernas linje, `neck/measure-neck-height`), inte filmens 0,063 / 0,089 m: den mättes på
en sittande dealer genom en kamera som ser 18 grader nedåt, med händerna på bordet, axlarna lyfta och huvudet framåt, så den
är hållning och synvinkel och hör hemma i rörelsen (dockans huvud och axlar ställs per ruta); byggda så såg båda ut att sakna
hals. Midjan och höften syntes inte: mannens, Danilos 4 och 3 % smalare (`torso/measure-waist-circ`, `measure-hips-circ`).
Längden följer av delarna (1,747 / 1,729 m), och måtten passas i meter med mannens skala.

**Tomasz** (`standarddocka_tomasz_matt`, `--kon tomasz_matt`) är en framställd person byggd på samma sätt efter sina egna
mått, mätta på hans figur ur Version 1 och hans bilder bredvid mannen (`verktyg/mat_figur.py`), med kläder och hår
avdragna: axellederna 0,39 m isär, bröstet, midjan, höften och halsen större (`torso/measure-bust-circ`,
`measure-waist-circ`, `measure-hips-circ`, `neck/measure-neck-circ`), huvudet 0,241 m högt och 0,160 m brett, och käken
bredare (`cheek/*-cheek-volume`, `chin/chin-bones`). Armarna, händerna och bålens och halsens längd är mannens: de mättes
inom en till två centimeter från hans, lika mycket som Meshys leder genom ärmarna är osäkra. Längden (1,760 m) följer av
delarna; figurens storlek är ett antagande (1,80 m med skor och hår). Midjan nådde 0,858 av 0,930 m (målet fullt ut).
`standarddocka_tomasz_matt_form` är samma docka med huvudet i hans ansiktes form (steg 13, prov).

**En person ur sina bilder** (`personer/<person>.json`, steg 15; Kenji: `--kon kenji`) byggs på Danilos eller Frasses
docka, den vars rörelser han spelar, med bara det som skiljer mer än mätningens osäkerhet (`ny_dealer.py`, `README-SV.md`).

Kläder finns inte på grunddockan (naken mesh för QC). Se avsnitt 10.

---

## 7. Skelett, leder, IK och ansikte

**81 ben totalt**, varav **71 deformerande**: 77 som förut och två vridben i varje underarm (7.1b). Hierarki (föräldern inom parentes där det hjälper). Längder nedan är kvinnans / mannens, ur byggena.

### 7.1 Kropp och ben (Mixamo-namn, utan prefix)

| Ben | Förälder | Längd (m) | Roll |
| --- | --- | --- | --- |
| rot | – | – | Rot; IK-kontroller hänger här. Deformerar inte. |
| Hips | rot | 0,124 / 0,090 | Höft / pelvis |
| Spine, Spine1, Spine2 | Hips → … | 0,106 / 0,122 / 0,148 och 0,107 / 0,140 / 0,223 | Ryggrad till axelgördel |
| neck | Spine2 | 0,064 / 0,062 | Nacke (`neck` med litet n, som dealer3d) |
| Head | neck | 0,192 / 0,214 | Huvud |
| Left-/RightShoulder | Spine2 | 0,123 / 0,130 och 0,142 / 0,137 | Nyckelben |
| Left-/RightArm | Shoulder | 0,263 / 0,279 | Överarm |
| Left-/RightForeArm | Arm | 0,249 / 0,272 | Underarm |
| Left-/RightForeArmTwist1, Twist2 | ForeArm | 0,083 / 0,091 var | Vridben i underarmen (7.1b) |
| Left-/RightHand | ForeArm | 0,079 / 0,083 | Handlov |
| Left-/RightUpLeg | Hips | 0,395 / 0,417 | Lår |
| Left-/RightLeg | UpLeg | 0,390 / 0,420 | Underben |
| Left-/RightFoot | Leg | 0,153 / 0,157 | Fot |
| Left-/RightToeBase | Foot | 0,056 / 0,058 | Tå |

### 7.1b Vridben i underarmen

En underarm som vrids mer än cirka 60 grader på `ForeArm` nyper huden vid armbågen (omkretsen vid armbågen 288 → 230 mm vid 100 grader hos mannen), eftersom hela underarmen vrids som en stel del mot överarmen. Därför har varje underarm två vridben, `RightForeArmTwist1`/`Twist2` och `LeftForeArmTwist1`/`Twist2`:

- Barn till `ForeArm`, längs den med dess egen rullning (samma riktning och samma lokala axlar): `Twist1` från en tredjedel till två tredjedelar av underarmen, `Twist2` från två tredjedelar till handleden. Deras lokala Y är underarmens längd; de tar bara rullning kring den (X och Z låsta, ±120 grader).
- Underarmens hud är delad efter läget längs underarmen (u = 0 vid armbågen, 1 vid handleden): bara `ForeArm` vid armbågen, `ForeArm` och `Twist1` lika vid u = 0,25, bara `Twist1` vid u = 0,5, `Twist1` och `Twist2` lika vid u = 0,75, bara `Twist2` vid handleden; handens egna vikter är orörda. Högst fyra ben per hörn, summan 1.
- I vila, och så länge vridbenen inte vrids, är huden exakt som utan dem (mätt: högst 0,0002 mm), så en kod som inte känner dem och vrider `ForeArm` ställer dockan som förut.
- En kod som känner dem böjer `ForeArm` utan rullning, lägger en tredjedel av rullningen på `Twist1`, två tredjedelar på `Twist2` och hela på handen: då fördelas vridningen jämnt längs underarmen till två tredjedelar vid handleden, och den sista tredjedelen tas över handleden där handens vikter tar vid (vid 100 grader: omkretsen vid armbågen 286 mm, högst 4 % mindre längs underarmen). Med halva rullningen på `Twist1` och hela på `Twist2` blir den jämn ända till handleden.
- Kod som mäter underarmens hud efter det ben som väger tyngst ska räkna `ForeArm`, `ForeArmTwist1` och `ForeArmTwist2` som underarmen.

### 7.2 Fingrar (båda händer, tre leder vardera)

Per hand, alla med förälder `*Hand` för länk 1 och sedan kedja 1→2→3:

| Ben | Längd kvinna / man (m) |
| --- | --- |
| *HandThumb1 / 2 / 3 | 0,030 / 0,036 / 0,028 och 0,032 / 0,038 / 0,029 |
| *HandIndex1 / 2 / 3 | 0,025 / 0,023 / 0,027 och 0,027 / 0,024 / 0,028 |
| *HandMiddle1 / 2 / 3 | 0,033 / 0,027 / 0,027 och 0,035 / 0,029 / 0,028 |
| *HandRing1 / 2 / 3 | 0,029 / 0,024 / 0,026 och 0,031 / 0,026 / 0,028 |
| *HandPinky1 / 2 / 3 | 0,021 / 0,015 / 0,020 och 0,022 / 0,016 / 0,021 |

### 7.3 Ansiktsben under Head (16 st, inklusive headfront)

Alla har `Head` som förälder. `headfront` läses inte längre av spelet (sedan 2026-11-26), men bryggan (`verktyg/`) och exportens kontroll använder den (7.6); de övriga 15 är MPFB-ansiktsben för mimik tillsammans med shape keys.

| Ben | Roll |
| --- | --- |
| headfront | Referens framåt på huvudet (bryggan och exportens kontroll) |
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
| ForeArmTwist1 / Twist2 | 0 (låst) | ±120 | 0 (låst) | Bara rullning kring underarmen (7.1b) |
| Fingerleder (Thumb/Index/Middle/Ring/Pinky 1–3) | ±100 | ±25 | ±100 | |
| Spine, Spine1, Spine2 | ±30 | ±25 | ±25 | |
| neck | ±35 | ±40 | ±30 | |
| Head | ±35 | ±45 | ±30 | |
| jaw | ±35 | ±5 | ±10 | |
| eye.L / eye.R | ±30 | ±5 | ±35 | |

`mest_lutning_rad` / `mest_vridning_rad` = 0,436 / 0,349 rad (25° / 20°) ur `doll.ts` (Danilo och Frasse) beskriver spelets tillåtna bållutning och bålvridning, inte Blender-constraintarna.

### 7.6 Bennamn mot dealer3d

dealer3d (`figure-model.ts`) kräver exakt dessa exportnamn, **utan** `mixamorig:`-prefix, och `Hips` ovanför båda axlarna:

`Hips`, `RightArm`, `LeftArm`, `RightForeArm`, `LeftForeArm`, `RightHand`, `LeftHand`, `RightUpLeg`, `LeftUpLeg`, `RightLeg`, `LeftLeg`, `RightFoot`, `LeftFoot`, `neck`, `Head`.

`headfront` läses inte längre av spelet (sedan 2026-11-26), men bryggan (`verktyg/dealer3d_till_blender.py`, `verktyg/blender_till_dealer3d.py`) använder den, och exportens kontroll kräver den (`KRAVDA_BEN` i `gemensamt/riggverktyg.py`, steg 06). Vår docka uppfyller listan. Vridben, fingrar för en hel hand, ögonen (`eye.L`/`eye.R`) och ansiktsformerna används av spelet när de finns.

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

### 7.8 Ansiktets utseende: ögon, bryn, läppar och mun

Så att blicken, leendet och brynen syns i spelets vy (Jakob 2026-11-27). Allt står i `ANSIKTE` i `scen/bygg_docka.py`;
skelettet, bennamnen, ansiktsformerna och kroppens mått är desamma som utan det.

- **Färgerna är hörnfärger** (färgattributet `farg`, ett värde per ythörn) på dockans enda material, så att modellen
  förblir en mesh med ett material, i glTF en enda primitiv med `COLOR_0` (three.js läser den som vertexfärg). Flera
  material hade blivit flera primitiver, och `dealer3d/tools/modell.ts` läser bara den första.
- **Ögonen:** en glob per öga, vikt 1 på `eye.L`/`eye.R`, med mitten i benets huvud (MPFB:s ögonklot ligger 0,1–0,6 mm
  därifrån) och dess radie (mannen 16,2 mm, kvinnan 15,3 mm). Irisen och pupillen är ringar kring polen rakt fram, dit
  `figure-model.ts` räknar att ögat ser i vila, så de följer benet när blicken vrids.
- **Brynen:** en tunn yta 0,6 mm utanför huden över varje öga; varje hörn är bundet till huden under sig, med hudens
  vikter och ansiktsformer interpolerade, så brynet följer `browInnerUp`, `browOuterUp*` och `browDown*`.
- **Munnen:** munhålan och läpparna efter MPFB:s egna masker på UV (`mpfb_inside-mouth.jpg`, `mpfb_lips.jpg`): munhålan
  mörk, läpparna något mörkare och varmare än huden. MPFB:s tänder (hjälpgeometri som `jawOpen` och `jaw` redan flyttar)
  står kvar; tungan gör det inte, eftersom `jawOpen` knappt flyttar den.
- **Det som saknas för tal och ett riktigt leende:** munformer för ljud (visem; `mouthClose`, `mouthRoll*`,
  `mouthShrug*` och en tunga saknas, 7.7) och kinder som lyfts i ett leende (`cheekSquint*`). Det som finns
  (`mouthSmile*`, `eyeSquint*`, `mouthUpperUp*`, `jawOpen`) kan blandas av rörelsen till ett större leende.

---

## 8. Bryggan dealer3d ↔ Blender

dealer3d sparar rörelser som JSON (till exempel `dealer3d/data/lyft-danilo-p4.json`), i **livebordets linsvärld**.

| Fält | Innehåll |
| --- | --- |
| `fps`, `frameCount` | Bildtakt (30) och antal bildrutor |
| `hip` | Dockans höft, linsvärld (m) |
| `frames[i].L`, `.R` | Vänster/höger arm: `s` axel, `e` armbåge, `w` handled, `k`, `p` 21 handpunkter i MediaPipe-ordning |
| `frames[i].h`, `.g`, `.hv` | Huvudets mitt; blickpunkt; huvudets eget mål |
| `frames[i].a` | Minen |
| `frames[i].card` | Kortet: `c` mitt, `l` långsida, `n` normal |

```text
# dealer3d → Blender
blender -b assets/docka/standarddocka_danilo.blend --python-exit-code 1 --python verktyg/dealer3d_till_blender.py -- --in <rörelse.json> [--namn NAMN] [--spara fil.blend] [--naturlig-hand]

# Blender → dealer3d
blender -b <fil.blend> --python-exit-code 1 --python verktyg/blender_till_dealer3d.py -- --action NAMN --ut ut.json
```

`--naturlig-hand` vrider handflatan nedåt vid nedsläpp (annars kan greppet se «klamt» ut, som i den tidiga p5c1-retargeten).

Retargeting (`dealer3d_till_blender.py`):

- Placerar `Hips` på källans `hip` (Danilos 0,2 m bakom kanten).
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

1. **Proportioner.** Utgå från Danilos eller Frasses docka, den vars rörelser dealern ska spela: personens mått ur bilderna i en personfil (`personer/<person>.json`, steg 15, `ny_dealer.py`) eller en nyckel i `MATT` i `bygg_docka.py`, och bygg om. Ändra inte bennamn. Kontrollera att `over_arm`, `underarm` och räckvidd fortfarande når P1, P7 och skon – eller dokumentera avvikelsen och kompensera med lutning (högst dockans `mest_lutning_rad` i `doll.ts`).
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
| MPFB2 + Mixamo-ben | Rigify, eller Meshy-rig som grund | dealer3d och Mixamo-biblioteket förväntar `RightArm` / `RightForeArm` / `neck` / `Head`. Rigify har andra namn och skulle kräva en ständig omnamningsbrygga. MPFB ger mätbara proportioner och CC0-kropp. |
| Två kön, ett skelett | En docka, eller unikt skelett per dealer | Actions återanvänds. Kön är mesh + mått, inte en ny rig. |
| Livebordet, mätt på film, som enda bord | Ett eget ritat bord | Rörelserna är lyfta ur filmen av samma bord: kameran, kortplatserna och skon måste vara filmens för att händerna ska hamna där kortet ligger. |
| Rörelser lyfta ur film av riktiga dealrar | Ren text-till-rörelse, eller givar ritade med regler | Handen ska hamna där kortet ska ligga, och rörelsen ska vara en människas (`../live-bj/`, `lyft-till-docka.ts`). AI-motion (Meshy Text to Motion, Kimodo, …) är bra utkast för vila/andning, sällan tillräckligt för en giv. |
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
- Vägen från foton (steg 01–08) är inte kopplad till standardscenen: steg 08 bygger sitt eget bord. Dealern från foton i dag är Tomasz (`output/tomasz/`, 2026-11-26, steg 1–7 utan film).
- Texturerna, korten och kortatlasen i `assets/bord/` hämtades för hand; adresserna står i `kallor.json` men inget skript hämtar dem eller bygger atlasen. Stolens råfil är betald och finns bara på datorn där den beställdes. På en annan dator kan bordet och stolen därför inte byggas förrän filerna finns där.
- Blenders vila `sitt_vila` (`SITT` i `bygg_docka.py`) står ännu med axlarna 0,38 m bakom kanten och handlederna framför en markerbricka, inte på Danilos plats i måttfilens `docka`-block (0,2 m). Se 5.9.
- Knogarnas läge: i MPFB:s skelett sitter långfingrets knoge 107 mm från handleden hos mannen (100 hos kvinnan), mot en människas 86–95 mm; handflatan är lång och fingrarnas leder sitter för långt ut. Inte rättat.
- Rullen, sargen, benen, kläder och flera kameror (`dealer_ogon`, `hander`, `hel`, `topp`) är antagna; golvets höjd och sitsen är slutledda, inte mätta.
- 22 ARKit-nycklar saknas (avsnitt 7.7).
- Skon är byggd efter måtten på livebordets klara sko, inte en fotograferad skormodell.
- Överföringen av en rörelse från blackjack-dealers docka är grov: i provet med given till plats 5 sträcker dockan armen rak, lutar sig djupt och pekar fingrarna rakt ned (`--naturlig-hand` vänder handflatan nedåt). Bryggan sätter handleden över kortets mitt, medan blackjack-dealers docka når kortet med fingrarna.
- Rendering på laptopen är långsam för längre klipp.
- Inget Blender-MCP i vardagen ännu.
