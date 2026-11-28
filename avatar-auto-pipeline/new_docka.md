# new_docka – dockorna

Dockorna som de byggs i dag: syftet, koordinaterna, dockorna, skelettet och lederna, bryggan mot `blackjack-dealer`s
docka, hur en dealer anpassas, valen, licenserna och bristerna. Reglerna står i `AGENTS.md`, mapparna och kommandona i
`README-SV.md`. Måtten har en källa, spelets kod i `../blackjack-dealer`; `scen/standard.yaml` är de talen i Blenders
koordinater, och `../MATT.md` skriver ut dem bredvid det som är mätt på filmen.

---

## 1. Syfte

Dockan är grunden och filmen ett lager ovanpå. Dockorna delar ett skelett och spelar de rörelser som är lyfta ur filmen
av livebordet (`../standarddocka/`, `../blackjack-dealer/dealer3d/data/`), genom livebordets kamera. En filmmodell gör
sedan dockans film till en film av en person, men **rörelsen ska redan stämma i 3D**: en ren text-till-film-prompt i
stället för 3D-grunden tappar precisionen vid bordet. Vad Jakob menar med standarddockan och grunddockan står i
`../standarddocka/DOMAR.md` (Dockan och kroppen).

---

## 2. Mappar och körning

Mapparna, kommandona och det som måste finnas på datorn innan något byggs står i `README-SV.md`.

---

## 3. Vägarna

Tre vägar möts i samma standardscen och samma skelett; alla sätt att bygga en docka, del för del, står i `VAGAR.md`
(skriven ur `vagar.json`).

- **Standardscenen och dockorna:** `scen/gen_standard.py` skriver `standard.yaml` ur spelets kod, och `bygg_bord.py`,
  `bygg_docka.py` och `bygg_stol.py` bygger bordet, dockorna och stolen ur den. Kontrollen i avsnitt 9.
- **En ny dealer ur bilder** (`ny_dealer.py`): personens mått ur bilderna (steg 15) blir en docka byggd på Danilos eller
  Frasses, som spelar de lyfta rörelserna.
- **Version 1** (steg 01–08, `auto_avatar.py`): en dealer från foton hos Meshy, med Meshys Mixamo-skelett omdöpt till
  spelets namn. Steg 09, 12, 13 och 14 är prov som för över delar mellan den och dockan.

För en namngiven dealer: börja med dockan för proportioner och skelett, och använd fotostegen bara för ansikte, hud och
kläder, aldrig för att byta skelett.

---

## 4. Koordinatsystem

Allt i Blender och i `standard.yaml` är **meter, Z upp, högerhänt** (huvudet i `standard.yaml` säger detsamma):

| | Värde |
| --- | --- |
| Origo | Golvet rakt under dealerkantens mitt (`LIVE.edge` i `src/table-live.ts`) |
| +X | Dealerns vänster = bildens höger sett från spelarna (samma x som livebordets linsvärld) |
| +Y | Bakåt, från spelarna mot dealerns rygg; spelarna står på −Y, och Blenders Front-vy ser dealern framifrån |
| +Z | Upp; filten på 0,95 m (`LIVE.floor`, slutlett) |
| Bordets (x, s) | X = x, Y = −s; s = 0 är dealerkanten och ökar mot spelarna |
| Yaw | Grader moturs sett ovanifrån, 0 = längs +X |

Från livebordets linsvärld (three.js, Y upp, kameran i (0, h, 0) mot −z): `X = x`, `Y = −(z + 1,5375)`, `Z = y + 0,95`,
och riktningar `(x, −z, y)`. Koden är `gemensamt/riggverktyg.py` (`Ram`).

---

## 5. Mått och standarder

Varje tal i `scen/standard.yaml` har `# källa: fil (namn)` eller `# antaget:` med motivering, och **spelet vinner**.
Kameran, bordet, skon, lådan, kortet, kortplatserna, insatsmärkena och dockornas mått står med källa i `../MATT.md`.
Det Blender lägger till som är vårt eget och antaget står i `gen_standard.py`: sargen, mässingslisten, benen, färgerna,
kortplatsernas markering (marginal och linje), åtta lekar i skon, vår markerbricka (`--med-bricka`, livebordet har
ingen), stolens sits och rygg (sitsens höjd är slutledd ur `LIVE.floor`), kamerorna utöver `film` (`dealer_ogon`,
`hander`, `hel`, `topp`) och räckviddstestets mål (`rackviddstest`: skons fönsterkort, D.C1, P1.C1, P7.C1). Där armen
inte når lutar dockan bålen (`lyft-till-docka.ts`).

---

## 6. Dockorna

Dockorna har **100 % identiskt skelett och samma bennamn**, så att varje rörelse går på varje docka, och samma grund:
mannen. Motor: **MPFB 2** (CC0) med Mixamo-namnat skelett, namn utan `mixamorig:`-prefix, `neck` med litet n.

- **Grunden, mannen** (`--kon man`, bara som figuren `verktyg/mat_figur.py` mäter en person bredvid): MPFB:s kropp för
  en man på 1,75 m, och där den avviker flyttad till medlet i ANSUR II (män av samma längd ±2 cm). Talen och källorna
  står i `MATT` i `scen/bygg_docka.py`, och bygget skriver vad det blev i `docka-rapport-<namn>.json` (slasken,
  `bygge/`). Passningen sker med MPFB-targets för alla mått tillsammans (armarnas längd och tjocklek, händerna,
  fötterna, benen, bålen, halsen och huvudets bredd; `-scale-horiz` förlänger underarmen och används inte), och
  omkretsen mäts som ett måttband i ett snitt genom huden vinkelrätt mot benet.
- **Danilo och Frasse** (`--kon danilo|frasse`) har mannens kropp, armar, händer, ben och hals, och det som mättes på
  dealrarna i filmen (`live-bj/data/uppsattning.json`): axellederna isär och huvudets höjd, så att ansiktet bara blir
  mindre. Halsen är mannens: filmens mättes på en sittande dealer med lyfta axlar och huvudet framåt, så den är hållning
  och hör hemma i rörelsen, och dockor byggda med den såg ut att sakna hals. Midjan och höften syntes inte. Bara måtten
  följer med, inget av personernas utseende; ansiktet är dockans (7.8). En provdocka med kroppen mätt ur filmen byggs
  med `--matt ../live-bj/data/kroppar.json` (`README-SV.md`).
- **Tomasz** (`--kon tomasz_matt`) är en framställd person byggd på samma sätt efter sina egna mått, mätta på hans figur
  ur Version 1 bredvid mannen med kläder och hår avdragna (axlarna, bröstet, midjan, höften, halsen, huvudet och
  käken). `standarddocka_tomasz_matt_form` är samma docka med huvudet i hans ansiktes form (steg 13, prov).
- **En person ur sina bilder** (`personer/<person>.json`, steg 15; Kenji och Amara) byggs på Danilos eller Frasses
  docka, den vars rörelser personen spelar, med bara det som skiljer mer än mätningens osäkerhet (`ny_dealer.py`).

Dockorna har inga kläder (naken mesh för kontrollen); se avsnitt 10.

---

## 7. Skelett, leder, IK och ansikte

**81 ben totalt**, varav **71 deformerande**: 77 kropps-, hand- och ansiktsben (med rot och IK) och två vridben i varje
underarm (7.1b). Längderna nedan är mannens, ur bygget.

### 7.1 Kropp och ben (Mixamo-namn, utan prefix)

| Ben | Förälder | Längd (m) | Roll |
| --- | --- | --- | --- |
| rot | – | – | Rot; IK-kontrollerna hänger här. Deformerar inte. |
| Hips | rot | 0,090 | Höft |
| Spine, Spine1, Spine2 | Hips → … | 0,107 / 0,140 / 0,223 | Ryggrad till axelgördel |
| neck | Spine2 | 0,062 | Nacke (`neck` med litet n, som dealer3d) |
| Head | neck | 0,214 | Huvud |
| Left-/RightShoulder | Spine2 | 0,142 / 0,137 | Nyckelben |
| Left-/RightArm | Shoulder | 0,279 | Överarm |
| Left-/RightForeArm | Arm | 0,272 | Underarm |
| Left-/RightForeArmTwist1, Twist2 | ForeArm | 0,091 var | Vridben i underarmen (7.1b) |
| Left-/RightHand | ForeArm | 0,083 | Handled |
| Left-/RightUpLeg, Leg, Foot, ToeBase | Hips → … | 0,417 / 0,420 / 0,157 / 0,058 | Lår, underben, fot, tå |

### 7.1b Vridben i underarmen

En underarm som vrids mer än cirka 60 grader på `ForeArm` nyper huden vid armbågen (omkretsen 288 → 230 mm vid 100
grader hos mannen), eftersom hela underarmen vrids som en stel del. Därför har varje underarm två vridben,
`RightForeArmTwist1`/`Twist2` och `LeftForeArmTwist1`/`Twist2`:

- Barn till `ForeArm`, längs den med dess egen rullning: `Twist1` från en tredjedel till två tredjedelar av underarmen,
  `Twist2` från två tredjedelar till handleden. Deras lokala Y är underarmens längd; de tar bara rullning kring den (X
  och Z låsta, ±120 grader).
- Underarmens hud är delad efter läget längs underarmen (u = 0 vid armbågen, 1 vid handleden): bara `ForeArm` vid
  armbågen, `ForeArm` och `Twist1` lika vid u = 0,25, bara `Twist1` vid 0,5, `Twist1` och `Twist2` lika vid 0,75, bara
  `Twist2` vid handleden; handens egna vikter är orörda. Högst fyra ben per hörn, summan 1.
- I vila, och så länge vridbenen inte vrids, är huden exakt som utan dem (mätt: högst 0,0002 mm), så kod som inte
  känner dem och vrider `ForeArm` ställer dockan som förut.
- Kod som känner dem böjer `ForeArm` utan rullning, lägger en tredjedel av rullningen på `Twist1`, två tredjedelar på
  `Twist2` och hela på handen: vridningen fördelas jämnt till två tredjedelar vid handleden, och den sista tredjedelen
  tas över handleden (vid 100 grader: omkretsen vid armbågen 286 mm, högst 4 % mindre längs underarmen). Med halva
  rullningen på `Twist1` och hela på `Twist2` blir den jämn ända till handleden.
- Kod som mäter underarmens hud efter det ben som väger tyngst räknar `ForeArm`, `ForeArmTwist1` och `ForeArmTwist2`
  som underarmen.

### 7.2 Fingrar (båda händer, tre leder vardera)

Länk 1 har förälder `*Hand`, sedan kedjan 1 → 2 → 3. Längder (m): `*HandThumb1/2/3` 0,032 / 0,038 / 0,029,
`*HandIndex1/2/3` 0,027 / 0,024 / 0,028, `*HandMiddle1/2/3` 0,035 / 0,029 / 0,028, `*HandRing1/2/3` 0,031 / 0,026 /
0,028, `*HandPinky1/2/3` 0,022 / 0,016 / 0,021.

### 7.3 Ansiktsben under Head (16 st, inklusive headfront)

Alla har `Head` som förälder. `headfront` (en referens framåt på huvudet) läses inte av spelet, men bryggan och
exportens kontroll använder den (7.6). De övriga 15 är MPFB:s ansiktsben för minen, tillsammans med ansiktsformerna:
`jaw` (käken), `eye.L`/`eye.R` (blicken), `oculi01/02.L/R` (ögonlock), `orbicularis03/04.L/R` (ögats ringmuskel),
`oris01`, `oris05` (munnen) och `risorius03.L/R` (mungiporna).

### 7.4 IK-kontroller (deformerar inte, förälder `rot`)

`IK_hand.L/R`, `pol_armbage.L/R`, `IK_fot.L/R`, `pol_kna.L/R`. Arm-IK: kedja 2 på `ForeArm`, poltarget `pol_armbage`,
handen `COPY_ROTATION` från `IK_hand`; ben-IK: kedja 2 på `Leg`, poltarget `pol_kna`. **IK står på 0 (av)**, så att
dealer3d-retargeting och inbakade Actions inte slåss med den; slå på den när du poserar för hand.

### 7.5 Ledgränser

Lokala `LIMIT_ROTATION`-constraints (`ledgrans`) och IK-gångjärn, i grader, symmetriskt ± om inget annat sägs (källa
`scen/bygg_docka.py`):

| Led | X | Y | Z | Kommentar |
| --- | --- | --- | --- | --- |
| ForeArm, Leg (IK-gångjärn) | 0…150 på böjaxeln, övriga låsta | | | Armbågen och knät böjs bara åt ett håll |
| ForeArmTwist1 / Twist2 | 0 (låst) | ±120 | 0 (låst) | Bara rullning kring underarmen (7.1b) |
| Fingerleder | ±100 | ±25 | ±100 | |
| Spine, Spine1, Spine2 | ±30 | ±25 | ±25 | |
| neck | ±35 | ±40 | ±30 | |
| Head | ±35 | ±45 | ±30 | |
| jaw | ±35 | ±5 | ±10 | |
| eye.L / eye.R | ±30 | ±5 | ±35 | |

Spelets tillåtna bållutning och bålvridning (`mostLean`, `mostTwist` i `doll.ts`) är spelets, inte Blenders.

### 7.6 Bennamn mot dealer3d

dealer3d (`figure-model.ts`) kräver exakt dessa namn, **utan** `mixamorig:`-prefix, och `Hips` ovanför båda axlarna:
`Hips`, `RightArm`, `LeftArm`, `RightForeArm`, `LeftForeArm`, `RightHand`, `LeftHand`, `RightUpLeg`, `LeftUpLeg`,
`RightLeg`, `LeftLeg`, `RightFoot`, `LeftFoot`, `neck`, `Head`. Bryggan (`verktyg/dealer3d_till_blender.py`,
`verktyg/blender_till_dealer3d.py`) använder `headfront`, och exportens kontroll kräver den (`KRAVDA_BEN` i
`gemensamt/riggverktyg.py`, steg 06). Vridben, fingrar för en hel hand, ögonen och ansiktsformerna används av spelet
när de finns.

### 7.7 30 ARKit shape keys – och vad som saknas

Från MPFB:s uttrycks-targets, namngivna enligt ARKit. Utöver `Basis`: `eyeBlinkLeft/Right`, `eyeWideLeft/Right`,
`eyeSquintLeft/Right`, `browDownLeft/Right`, `browInnerUp`, `browOuterUpLeft/Right`, `jawOpen`, `mouthSmileLeft/Right`,
`mouthFrownLeft/Right`, `mouthPucker`, `mouthFunnel`, `mouthPressLeft/Right`, `mouthUpperUpLeft/Right`,
`mouthLowerDownLeft/Right`, `mouthStretchLeft/Right`, `mouthDimpleLeft/Right`, `noseSneerLeft/Right`.

ARKit har 52; **22 saknas**: `eyeLookDown/In/Out/Up` (8 st; blicken styrs av `eye.L/R`), `cheekPuff`,
`cheekSquintLeft/Right`, `mouthClose`, `mouthLeft`, `mouthRight`, `mouthRollLower/Upper`, `mouthShrugLower/Upper`,
`jawForward`, `jawLeft`, `jawRight` (`jaw`-benet täcker öppningen) och `tongueOut`. Det räcker för blink, bryn, leende,
trut och käke, men är inte en full ansiktsrigg.

### 7.8 Ansiktets utseende: ögon, bryn, läppar och mun

Så att blicken, leendet och brynen syns i spelets vy (Jakob 2026-11-27). Allt står i `ANSIKTE` i `scen/bygg_docka.py`;
skelettet, bennamnen, ansiktsformerna och kroppens mått är desamma som utan det.

- **Färgerna är hörnfärger** (attributet `farg`) på dockans enda material, så att modellen förblir en mesh med ett
  material, i glTF en primitiv med `COLOR_0`: flera material hade blivit flera primitiver, och
  `dealer3d/tools/modell.ts` läser bara den första.
- **Ögonen:** en glob per öga med vikt 1 på `eye.L`/`eye.R`, mitten i benets huvud och dess radie (mannen 16,2 mm).
  Irisen och pupillen är ringar kring polen rakt fram, dit `figure-model.ts` räknar att ögat ser i vila, så de följer
  benet när blicken vrids.
- **Brynen:** en tunn yta 0,6 mm utanför huden över varje öga, med varje hörn bundet till huden under sig (hudens vikter
  och ansiktsformer), så att brynet följer `browInnerUp`, `browOuterUp*` och `browDown*`.
- **Munnen:** munhålan mörk och läpparna något mörkare och varmare än huden, efter MPFB:s egna masker på UV. MPFB:s
  tänder står kvar; tungan gör det inte, eftersom `jawOpen` knappt flyttar den.
- **Det som saknas för tal och ett riktigt leende:** munformer för ljud (`mouthClose`, `mouthRoll*`, `mouthShrug*` och
  en tunga, 7.7) och kinder som lyfts (`cheekSquint*`). `mouthSmile*`, `eyeSquint*`, `mouthUpperUp*` och `jawOpen` kan
  blandas till ett större leende.

---

## 8. Bryggan dealer3d ↔ Blender

dealer3d sparar rörelser som JSON (till exempel `dealer3d/data/lyft-danilo-p4.json`) i **livebordets linsvärld**:

| Fält | Innehåll |
| --- | --- |
| `fps`, `frameCount` | Bildtakt (30) och antal rutor |
| `hip` | Dockans höft, linsvärld (m) |
| `frames[i].L`, `.R` | Vänster och höger arm: `s` axel, `e` armbåge, `w` handled, `k`, `p` 21 handpunkter i MediaPipe-ordning |
| `frames[i].h`, `.g`, `.hv` | Huvudets mitt; blickpunkten; huvudets eget mål |
| `frames[i].a` | Minen |
| `frames[i].card` | Kortet: `c` mitt, `l` långsida, `n` normal |

Kommandona står i `README-SV.md` (Rörelser). `dealer3d_till_blender.py` placerar `Hips` på källans `hip`, riktar
`Spine/Spine1/Spine2` mot axelmitten och axellinjen, låter axlarna följa med framåt vid lång sträckning, siktar
`neck/Head` mot `h` och blicken `g`, använder armbågen `e` som poltarget, fördelar ungefär 55 % av handledens vridning
längs `ForeArm` och ställer `hand_axlar` med rätt tecken (`R = +1`, `L = −1`). `--naturlig-hand` vrider handflatan
nedåt vid nedsläpp. Kraven: handleden över rätt kortplats, kortets normal upp, ingen axel ur led och bålen inte genom
bordskanten. Omräkningen sköts av `gemensamt/riggverktyg.py`.

---

## 9. Kontroll

Kommandona står i `README-SV.md` (Kontroll). Det som bedöms är bilder: kontrollbilder genom de fasta kamerorna, där
`film` är livebordets kamera, och spelets egna bildpunkter ritade över renderingen (de ska ligga mitt i Blenders kort).
En modell som en agent ska förstå dumpas till text med `verktyg/inspektera.py`. Kontrollbilderna renderas med EEVEE.
Längre filmer renderas bättre på den stationära datorn (RTX 3060); laptopen tar ungefär 20–30 s per ruta i Cycles på
processorn.

---

## 10. Hur en dealer anpassas

Grundregeln: **samma skelett, byt det som syns**. Då fungerar alla rörelser utan ny retargeting.

1. **Proportioner.** Utgå från Danilos eller Frasses docka, den vars rörelser dealern spelar: personens mått i en
   personfil (`personer/<person>.json`, steg 15) eller en nyckel i `MATT` i `bygg_docka.py`, och bygg om. Ändra inte
   bennamn. Kontrollera att räckvidden når P1, P7 och skon, eller låt dockan luta bålen (högst `mostLean` i `doll.ts`).
2. **Ansikte och hud från foton.** Ta fram ett huvud med steg 01–03 (eller steg 12 och 13) och byt huvudets mesh och
   textur på dockan. Behåll `Head` och ansiktsbenen och överför vikterna från riggen; ansiktsformerna kan behöva
   projiceras om. Originalfotona stannar på datorn, i `input/<namn>/`.
3. **Kläder som egna mesh**, bundna till samma armatur (vikter överförda från kroppen), aldrig inbakade i kroppen: då
   går de att byta utan att förstöra vikterna. Därför är dockan naken.
4. **Hår och tillbehör:** egna objekt, på samma rig eller med child-of mot ett ben (`Head`, `RightHand` …).
5. **Rörelser:** samma rörelser för alla. Når en giv inte kortplatsen rättas det i skript, aldrig genom att skriva över
   en godkänd rörelse.
6. **Export till dealer3d:** samma GLB-kontrakt (bennamnen i 7.6). Pröva en känd rörelse tur och retur med bryggan.

Betalda steg hos Meshy och Runway bara med Jakobs ja.

---

## 11. Tekniska val och varför

| Val | Mot | Varför |
| --- | --- | --- |
| Procedurellt bord, kort, sko och bricka | Meshy eller färdiga modeller | Exakta mått och upprepbarhet: en millimeter fel på ett kort syns i filmen. Meshy vinner där formen är organisk och måtten lösa, därför är **stolen** det enda Meshy-objektet. |
| MPFB 2 med Mixamo-ben | Rigify, eller Meshys rigg som grund | dealer3d väntar sig `RightArm`, `RightForeArm`, `neck`, `Head`; Rigify har andra namn. MPFB ger mätbara proportioner och en CC0-kropp. |
| Ett skelett för alla dockor | Ett eget skelett per dealer | Rörelserna återanvänds: en dealer är mått och yta, inte en ny rigg. |
| Livebordet, mätt på film, som enda bord | Ett eget ritat bord | Rörelserna är lyfta ur filmen av samma bord, så kameran, kortplatserna och skon måste vara filmens för att händerna ska hamna där kortet ligger. |
| Rörelser lyfta ur film av riktiga dealrar | Text-till-rörelse, eller givar ritade med regler | Handen ska hamna där kortet ska ligga, och rörelsen ska vara en människas (`../live-bj/`, `lyft-till-docka.ts`). Genererade rörelser duger som utkast för vila och andning, sällan för en giv. |
| Filmmodellen efter 3D | Text-till-film i stället för 3D | Filmmodellen gör hud och ljus fotografiska med vårt klipp som rörelsestyrning (vilka modeller: skillen `runway`). |
| Blender utan fönster | Att styra ett öppet Blender | Säkrare: ett verktyg kopplas aldrig till fönstret där någon redan tittar. |

---

## 12. Licenser

| Tillgång | Licens |
| --- | --- |
| MPFB 2.0.18, kropp och targets | CC0 |
| Kortframsidor, 52 st (Wikimedia Commons, Dmitry Fomin, SVG English pattern; PNG 360×540) | CC0 1.0, kontrollerade 2026-11-25; adress per fil i `assets/bord/kort/kallor.json` |
| Kortbaksida | Egen, fri |
| Filt (Poly Haven «Scuba Suede»), trä («American Walnut Veneer»), läder («Brown Leather») | CC0 (https://polyhaven.com/license) |
| Mixamo-klipp, om de används | Adobe förbjuder omdistribution av råfiler och att träna AI på dem; egna rörelser påverkas inte. |
| Meshy-stolen | Meshys villkor för den betalda uppgiften; råfilen i `assets/meshy/`. |

Detaljerna för texturerna och kortatlasen står i `assets/bord/LICENSER.md`. Atlasen är 13 × 5 rutor (A–K ×
spader, hjärter, ruter, klöver och baksidan), 315 × 440 bildpunkter per kort (5 bildpunkter per mm).

---

## 13. Meshy-logg

Varje anrop loggas i `assets/meshy/meshy-logg.json` (saldo före och efter) bredvid råfilen: det är kvittot.
`scen/meshy_stol.py` beställer inget när råfilen finns och kräver `--betala`. Det enda anropet för scenen är
dealerstolen 2026-11-25: en text-to-3D med meshy-7.1, preview 20 och refine 10 = 30 krediter (saldo 596 → 566; task
preview `01a213fd-c334-71bd-93f2-fbcb2166bf4f`, refine `01a213fe-be63-7336-b4fd-0097f771171a`).

---

## 14. Kända brister

- Rörelserna som saknas står i rörelseschemat (`../standarddocka/rorelsekatalog.json`).
- Dockornas kropp är en medelmans med två av dealerns mått, inte dealerns (Jakobs ord i `../standarddocka/DOMAR.md`).
- Dockorna saknar kläder (medvetet); nästa steg är skjorta, väst och byxor som egna mesh på samma rigg.
- Version 1 (steg 01–08) är inte kopplad till standardscenen: steg 08 bygger sitt eget bord.
- Texturerna, korten och kortatlasen i `assets/bord/` hämtades för hand (adresserna i `kallor.json`, men inget skript
  hämtar dem), och stolens betalda råfil finns bara på datorn där den beställdes, så på en annan dator kan bordet och
  stolen inte byggas förrän filerna finns där.
- Blenders vila `sitt_vila` (`SITT` i `bygg_docka.py`) står med axlarna 0,38 m bakom kanten och handlederna framför en
  markerbricka, inte på dockans plats i `standard.yaml` (`docka`, 0,2 m).
- Knogarnas läge: i MPFB:s skelett sitter långfingrets knoge 107 mm från handleden hos mannen, mot en människas 86–95 mm;
  handflatan är lång och fingrarnas leder sitter för långt ut. Inte rättat.
- Sargen, benen, hyllans botten, stolen och kamerorna utöver `film` är antagna, rullens höjd är bara svagt mätt, och
  golvets och sitsens höjd är slutledda.
- 22 ARKit-former saknas (7.7).
- Skon är byggd efter måtten på livebordets klara sko, inte en fotograferad modell.
- Bryggan från blackjack-dealers docka är grov: den sätter handleden över kortets mitt, medan dealer3d:s docka når
  kortet med fingrarna, så armen sträcks, bålen lutar och fingrarna pekar ned (`--naturlig-hand` vänder handflatan).
