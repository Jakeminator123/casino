# Vägarna: så byggs en dealerdocka

Vägarna för att bygga en dealerdocka, del för del: delarna en docka byggs av, alternativen för varje del, de färdiga vägarna (val som hör ihop och är prövade tillsammans) och reglerna för vad som går ihop. Källan för guiden i studion och för VAGAR.md.

**Den här filen ändras aldrig för hand.** Den skrivs av `vagar.py` ur `vagar.json`, som är källan, och skrivs över nästa gång. Ändra i `vagar.json` och kör sedan, från `avatar-auto-pipeline/`:

```text
.venv/Scripts/python.exe -I vagar.py              kontrollerar vagar.json mot koden och skriver VAGAR.md
.venv/Scripts/python.exe -I vagar.py --kolla      skriver inget; blir röd när något inte stämmer
.venv/Scripts/python.exe -I vagar.py --val kropp=meshy-kropp huvud=mpfb-huvud   vad som går ihop med valen
.venv/Scripts/python.exe -I vagar.py --visa-steg  vad auto_avatar.py kör, läst ur koden
```

## Så läses den

Varje uppgift bär sitt belägg inom parentes: _(kod)_ står i koden: skriptet gör så (vagar.py prövar det där det går); _(körning)_ ur en körnings kvitton och rapporter (output/<namn>/, slasken; inte i Git); _(prov)_ ur ett prov som Jakob har sett (blackjack-dealer/assets/proofs/<namn>/); _(Jakob)_ hans ord eller dom; _(data)_ en mätning eller ett dokument i repot (live-bj/data/, en skill); _(bedömning)_ en bedömning som inte är prövad.

Status: **finns** finns i koden och går att köra; **prövat** prövat i ett prov, men inget steg här kör det som en del av bygget; **tänkt** tänkt, inte gjort; **går inte** går inte att göra i dag (skälet står i hinder).

En regels styrka: **måste** går inte att ändra: så fungerar delarna; **i dag** så är det i dag, eftersom inget skript gör annat; kan ändras med ett nytt steg.

## Skelettet

Skelettet är alltid vårt. En docka byter kropp, ansikte, hud och kläder, aldrig skelett eller bennamn, så att varje rörelse fungerar på varje docka. Vilken väg dockan än byggs, ska den färdiga modellen ha benen som spelet letar efter. _(kod)_

Spelet (`blackjack-dealer/dealer3d/src/figure-model.ts`) kräver: `Hips`, `neck`, `Head`, `RightArm`, `LeftArm`, `RightForeArm`, `LeftForeArm`, `RightHand`, `LeftHand`, `RightUpLeg`, `LeftUpLeg`, `RightLeg`, `LeftLeg`, `RightFoot`, `LeftFoot`. _(kod)_

Används när de finns: vridben: <Sida>ForeArmTwist1 och 2; fingrar: <Sida>Hand<Finger>1–3, för en hel hand; ögon: eye.L och eye.R (eyeL och eyeR i spelet); ansiktsformer: formerna (morph targets) med ARKit-namn. _(kod)_

headfront läses inte längre av spelet (sedan 2026-11-26), men bryggan (verktyg/dealer3d_till_blender.py, verktyg/blender_till_dealer3d.py) använder den, och exportens kontroll kräver den (steg 6 och gemensamt/riggverktyg.py KRAVDA_BEN). _(kod)_

Bordet, stolen och spelets mått hör till scenen, inte till dockan: varje väg använder samma. Måtten skrivs ur spelets kod till scen/standard.yaml.

## Vägarna i korthet

| Väg | Status | Går att köra | Kostnad | Tid |
| --- | --- | --- | --- | --- |
| [Version 1: från foton med Meshy](#version-1-från-foton-med-meshy) | finns | ja | 95 Meshy-krediter (tre delar à 30 och riggen 5) och 3–5 bilder hos OpenAI _(körning)_ | cirka 18 minuter för steg 1–7 på laptopen; filmen i steg 8 till det (inte mätt) _(körning)_ |
| [Standarddockans kropp och ansiktsrigg med personens utseende ovanpå](#standarddockans-kropp-och-ansiktsrigg-med-personens-utseende-ovanpå) | tänkt | nej | gratis, om fotona räcker som de är _(bedömning)_ | okänd _(bedömning)_ |
| [Docka efter en mätt dealer (Danilo, Frasse)](#docka-efter-en-mätt-dealer-danilo-frasse) | finns | ja | gratis _(kod)_ | några minuter per docka (inte mätt) _(bedömning)_ |
| [Docka efter en persons mått (Tomasz)](#docka-efter-en-persons-mått-tomasz) | finns | ja | gratis _(kod)_ | några minuter (inte mätt) _(bedömning)_ |
| [En ny dealer ur bilder, en rad (Kenji, Amara)](#en-ny-dealer-ur-bilder-en-rad-kenji-amara) | finns | ja | gratis _(kod)_ | SAM 5-15 minuter, dockan några minuter, rörelserna och filmen några minuter _(bedömning)_ |

## Delarna och alternativen

### 1. Underlaget

_Vad utgår dockan från?_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **Foton av personen, gjorda till tre referensbilder** (`foton`) | finns _(kod)_ | 1–8 foton av samma person i input/<namn>/ _(kod)_ | en bild av huvudet framifrån med hela halsen; en bild av hela kroppen i A-pose, mätt innan något får beställas hos Meshy; en bild av en öppen högerhand med åtskilda fingrar; klädseln (förval mörkblå skjorta och mörka byxor) _(kod)_ | steg 1; `steg/01-referenser/apose_referenser.py`; gpt-image-2 (images/edits) med alla foton i varje anrop _(kod)_ | 3 bilder i hög kvalitet, 1024 × 1024; A-posebilden görs om högst 2 gånger om armarna eller beskärningen är fel. Priset i dollar sparas inte i kvittot. (OpenAI) _(kod)_ | cirka 6 minuter _(körning)_ |
| **Grundens mått: en man med människans mått för sin längd** (`standardmatt`) | finns _(kod)_ | inget: talen står i skriptet _(kod)_ | längden 1,75 m; armarnas längd och tjocklek, händerna, fötterna, benen och bålen efter ANSUR II; grunden som Danilo, Frasse och varje persons docka byggs på; ingen likhet med en person _(kod)_ | `scen/bygg_docka.py`; MATT['man'] högst upp i skriptet; --kon man bygger honom bara som figuren verktyg/mat_figur.py mäter en person bredvid _(kod)_ | gratis _(kod)_ | ingår i dockans bygge _(kod)_ |
| **En riktig dealers mått, mätta på film** (`matt-ur-film`) | finns _(kod)_ | en mätning av dealern i live-bj/data/uppsattning.json (dealer.<stil>.body); talen avskrivna i MATT i scen/bygg_docka.py (MATT['danilo'], MATT['frasse']); skriptet läser inte mätningen själv _(kod)_ | axellederna isär (Danilo 0,357 m, Frasse 0,348 m); huvudets höjd, hakan till hjässan (0,228 och 0,210 m, skattad); inte halsen: filmens haka över axlarna är hållning och synvinkel, så halsen är mannens; inte armarna, händerna, benen, midjan eller höfterna: de syns inte eller bara bakom bordet, så de är mannens (Danilos midja och höft 4 och 3 % smalare) _(kod)_ | `scen/bygg_docka.py`, `../live-bj/data/uppsattning.json`; --kon danilo eller --kon frasse: mannens kropp med de mätta axlarna och huvudet _(kod)_ | gratis _(kod)_ | ingår i dockans bygge _(kod)_ |
| **En persons mått, mätta på hans egen figur och bilder** (`matt-ur-figur`) | finns _(kod)_ | en figur av personen med vårt skelett (Version 1 ger en, ur hans bilder hos Meshy) och hans bilder; mannen mätt på samma sätt bredvid (verktyg/mat_figur.py); ett antagande om längden: en framställd bild har inget av känd storlek (Meshy-figuren byggs 1,80 m med skor och hår); talen avskrivna i MATT i scen/bygg_docka.py, med kläder och hår avdragna; skriptet läser inte mätningen själv _(kod)_ | axellederna isär, bröstets, midjans, höftens och halsens omkrets, huvudets höjd och bredd och käkens bredd; inte armarnas, händernas och bålens längd när figuren mäts genom ärmar och Meshys leder (en till två centimeter osäkert): de blir mannens om skillnaden är mindre; inte armarnas tjocklek under ärmarna: mannens; ingen likhet i ansiktet: bara huvudets mått _(prov)_ | `verktyg/mat_figur.py`, `scen/bygg_docka.py`; verktyg/mat_figur.py mäter figuren och mannen i snitt genom huden; --kon tomasz_matt bygger dockan med talen _(kod)_ | gratis (figuren finns redan från Version 1) _(kod)_ | mätningen under en minut, dockan några minuter _(bedömning)_ |
| **Foton för utseendet och mått för kroppen** (`foton-och-matt`) | tänkt _(kod)_ | 1–8 foton av personen, minst ett av ansiktet rakt framifrån; kroppens mått: en människas för kön och längd, eller personens egna _(bedömning)_ | likheten ur fotona och kroppen ur måtten _(bedömning)_ | inget skript _(kod)_ | gratis om fotona används som de är; några OpenAI-bilder om en ren närbild av ansiktet görs först _(bedömning)_ | okänd _(bedömning)_ |
| **En persons mått ur sina egna bilder (SAM 3D Body och MediaPipe)** (`matt-ur-bilder`) | finns _(kod)_ | bilder av personen: ett porträtt, en helfigur och en halvfigur (input/<person>/); SAM 3D Body uppsatt bredvid repot (../sam-3d-body, som live-bj/README.md säger) och MediaPipe-miljön (../blackjack-dealer/tools/python/.venv); ett antagande om skalan: en framställd bild har inget av känd storlek, så metrarna är SAM:s egen kroppsform (och irisen, 11,7 mm, i ansiktet) _(kod)_ | kroppens leder och längder i meter (axellederna, armarna, bålen, halsen, längden) och huvudets höjd, bredd och djup ur SAM:s yta; handens 21 punkter per hand (MediaPipe) och SAM:s hand; handen tas inte in i dockan (SAM:s hand är kortare än dockans mätt på samma sätt); ansiktets 478 punkter och mått (ögonen, kinderna, käken, hakan) ur porträttet; per mått hur det är mätt och hur säkert, med felet mot ett facit (Tomasz figur) som undre gräns; bara det som skiljer från grunddockan mer än så tas in; ingen likhet i ansiktet: bara huvudets mått _(prov)_ | `steg/15-matt-ur-bilder/matt_ur_bilder.py`, `steg/15-matt-ur-bilder/sam_bild.py`; ny_dealer.py steg 1 (mappen steg/15-matt-ur-bilder): personer/<person>.json, som scen/bygg_docka.py läser själv (--kon <docka>) _(kod)_ | gratis (allt på den här datorns processor) _(kod)_ | SAM 3D Body 1-4 minuter per bild på processorn, resten under en minut _(körning)_ |

- Foton av personen, gjorda till tre referensbilder: körningen `tomasz-20261126`: Tre foton av Tomasz gav de tre bilderna, A-posebilden på första försöket. _(körning)_
- En riktig dealers mått, mätta på film: provet `danilo-frasse-kroppar-20261127`: Danilo och Frasse bredvid mannen: axlarna 2 och 3 cm smalare, Frasses huvud lite mindre, Danilo lite smalare om midjan. _(prov)_
- En persons mått, mätta på hans egen figur och bilder: provet `tomasz-dockan-pa-hans-matt-20261127`: Tomasz bredare än Danilo i axlarna, bröstet, midjan, halsen och huvudet; armarna lika långa inom mätningens osäkerhet. _(prov)_
- Foton för utseendet och mått för kroppen: hinder: Inget skript tar både foton och mått. _(kod)_
- En persons mått ur sina egna bilder (SAM 3D Body och MediaPipe): provet `kenji-ny-dealer-ur-bilder-20261127`: Kenji: kroppen inom osäkerheten från Danilos, huvudet större. Mot Tomasz facit: armarna inom 1 cm, huvudet inom 0,5 cm, axlarna 2,2 cm smalare och bålen 2,4 cm längre. _(prov)_

### 2. Kroppen

_Vem gör kroppens form?_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **Meshy gör kroppen ur A-posebilden** (`meshy-kropp`) | finns _(kod)_ | A-posebilden ur steg 1 _(kod)_ | personens byggnad och kläder; en yta med 4K-textur, utan skelett; huvudet och händerna i samma yta; Version 1 byter ut dem i steg 3 _(kod)_ | steg 2, 3; `steg/02-meshy-delar/meshy_enbild.py`, `steg/03-montering/clean_kropp_chest.py`, `steg/03-montering/montera_apose.py`; meshy-7.1 bild till 3D i A-pose; sedan plattas brösthåret ut och huvudet och händerna sys på _(kod)_ | 30 krediter (Meshy) _(körning)_ | cirka 2 minuter, samtidigt med huvudet och handen _(körning)_ |
| **Standarddockans kropp (MPFB 2), byggd efter mått** (`mpfb-kropp`) | finns _(kod)_ | måtten; Blender 5.3 med tillägget MPFB 2 _(kod)_ | en naken kropp med en människas proportioner; skelettet och vikterna i samma bygge; fri licens (CC0); ingen likhet med en person _(kod)_ | `scen/bygg_docka.py`; blender -b --python-exit-code 1 --python scen/bygg_docka.py _(kod)_ | gratis _(kod)_ | några minuter per docka (inte mätt) _(bedömning)_ |
| **Runway: Hunyuan 3D 3.1 Pro ur A-posebilden** (`runway-hunyuan`) | prövat _(prov)_ | en A-posebild framifrån (provet tog Tomasz bild ur steg 1) _(prov)_ | hel kropp med kläder, hel också bakifrån; hand och arm i ett stycke: ingen skarv vid handleden; fem åtskilda fingrar, släta och utan naglar, handflatan framåt i A-posen; suddigt ansikte och fel hårfärg; en yta utan skelett: cirka 500 000 trianglar och en textur i 4096 _(prov)_ | inget skript beställer den; provet anropade Runways /v1/image_to_mesh (../.claude/skills/runway/SKILL.md, raden 3D ur bild) _(prov)_ | 38 krediter; 15 till för PBR, för mer än en bild eller för annat antal ytor (Runway) _(data)_ | några minuter (inte mätt) _(bedömning)_ |
| **Meshy gör kroppen i ett stycke ur flera vyer** (`meshy-flervy-kropp`) | prövat _(prov)_ | A-posebilden ur steg 1; 2–4 vyer av personen ur den, framifrån först (Meshys bildmodell; vyn från sidan fick armarna åt fel håll och användes inte) _(prov)_ | kropp, kläder och huvud i ett stycke i T-pose, 200 000 trianglar och en textur i 2K; kläder som är rena fram och bak; fyra fingrar ihopvuxna i varje hand, bara tummen fri: steg 05:s prov hittar inte fem fingrar; ett utsmetat ansikte med en kal rand över hjässan _(prov)_ | inget skript beställer den; provet beställde Meshys multi-image to 3D (meshy-7.1) för hand, ur output/tomasz-flervy/01-vyer/ _(prov)_ | 30 krediter för kroppen och 3 för vyerna (Meshy) _(prov)_ | några minuter (inte mätt) _(bedömning)_ |
| **Runway: Trellis 2 ur A-posebilden** (`runway-trellis`) | prövat _(prov)_ | en A-posebild framifrån _(prov)_ | hel kropp med fem åtskilda men släta fingrar; ansiktet som en vaxmask med utsmetade ögon; en brun fläck på bakhuvudet; en yta utan skelett: cirka 470 000 trianglar och två texturer i 2048 _(prov)_ | inget skript i projektet; provet anropade Runways /v1/image_to_mesh _(prov)_ | 30 krediter (25–35 efter upplösningen) (Runway) _(data)_ | några minuter (inte mätt) _(bedömning)_ |
| **Runway: Tripo ur bild** (`runway-tripo`) | går inte _(prov)_ | en till fyra vyer utan lucka (fram, vänster, bak, höger) _(data)_ | okänt: inte prövat _(bedömning)_ | inget skript _(kod)_ | 30 krediter enligt Runways sidor _(data)_ | okänd _(bedömning)_ |

- Meshy gör kroppen ur A-posebilden: körningen `tomasz-20261126`: Kroppen kostade 30 krediter och var 333 434 trianglar innan steg 3 gjorde en lätt kopia. _(körning)_
- Runway: Hunyuan 3D 3.1 Pro ur A-posebilden: provet `runway-3d-20261127`: Hel kropp med fem åtskilda men släta fingrar och ett suddigt ansikte; sämre än vår docka i ansiktet. _(prov)_
- Meshy gör kroppen i ett stycke ur flera vyer: provet `meshy-provet-20261127`: Duger inte som dealer: fingrarna ihopvuxna och ansiktet utsmetat, sämre än både Tomasz-dockan och Hunyuan-kroppen i samma bilder. _(prov)_
- Runway: Trellis 2 ur A-posebilden: provet `runway-3d-20261127`: Sämst av de tre i ansiktet och bakifrån. _(prov)_
- Runway: Tripo ur bild: provet `runway-3d-20261127`: Gick inte att beställa. _(prov)_
- Runway: Tripo ur bild: hinder: Runway svarar "Unknown task type" med vår nyckel (2026-11-27). _(data)_

### 3. Huvudet och ansiktet

_Var kommer ansiktet ifrån?_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **Meshy gör huvudet ur närbilden av ansiktet** (`meshy-huvud`) | finns _(kod)_ | närbilden av huvudet ur steg 1; en kropp med skjortkrage att sy fast det på vid halsen: Meshys (steg 3) _(kod)_ | bäst likhet av det vi har prövat (Jakobs ord i provet runway-3d-20261127); en yta utan rörliga delar: inga ansiktsformer, inga ögonleder, ingen käke _(körning)_ | steg 2, 3; `steg/02-meshy-delar/meshy_enbild.py`, `steg/03-montering/bygg_modul.py`, `steg/03-montering/montera_apose.py`; halsen hittas på hudbandet ovanför kragen (huvudsnitt i auto_avatar.py) och huvudet sys fast där _(kod)_ | 30 krediter (Meshy) _(körning)_ | samma 2 minuter som kroppen (samtidigt) _(körning)_ |
| **Standarddockans huvud (MPFB)** (`mpfb-huvud`) | finns _(kod)_ | standarddockans kropp: huvudet är en del av samma yta _(kod)_ | ögonleder, käke och ansiktsformer; iris, ögonbryn, läppar och en mun med tänder; ingen likhet med en person _(kod)_ | `scen/bygg_docka.py`; ANSIKTSBEN, ARKIT_KARTA och ANSIKTE i skriptet _(kod)_ | gratis _(kod)_ | ingår i dockans bygge _(kod)_ |
| **Kroppens eget huvud, ur samma bild som kroppen** (`kroppens-eget-huvud`) | prövat _(prov)_ | en kropp ur en bild (Meshy eller Runway) _(prov)_ | ingen skarv vid halsen; sämre likhet än en egen närbild av ansiktet _(prov)_ | Version 1 gör det inte; i provet behöll Runways kroppar sina huvuden _(kod)_ | ingår i kroppen _(prov)_ | ingår i kroppen _(prov)_ |
| **Standarddockans huvud format efter personens ansikte** (`mpfb-format-efter-person`) | prövat _(prov)_ | personens figur med huvud ur Version 1 (Meshy-huvudet, det som liknar honom mest); standarddockans huvud och skelett, byggt efter hans mått; MediaPipe-miljön (steg 09): ansiktets punkter i bilder av båda huvudena _(kod)_ | dockans eget huvud i hans ansiktes form: samma hörn, ytkarta, ansiktsformer och leder; rörligheten kvar: blinkningen sluter ögat och munnen öppnar och stänger som förut; inte hans ögonspringa, öron eller hår: dockans ögonspringa i hans ögas läge, dockans öron, och håret är en volym dockan saknar; hans yta ovanpå med steg 12 (Meshys målning och närbilden) _(prov)_ | `steg/13-form-ur-figur/form.py`; punkterna i tre vyer, en likformig och en mjuk passning, och en försiktig dragning mot hans yta i ansiktet; kommandot står i README-SV.md _(kod)_ | gratis (figuren finns redan från Version 1) _(kod)_ | under en minut _(bedömning)_ |

- Meshy gör huvudet ur närbilden av ansiktet: provet `runway-3d-20261127`: Bredvid Hunyuan och Trellis var Meshy-huvudet det som liknade Tomasz mest. _(prov)_
- Standarddockans huvud (MPFB): provet `dockans-ansikte-20261127`: Ögon som ser, bryn, läppar och mun på provmodellerna; inte dömt än. _(prov)_
- Kroppens eget huvud, ur samma bild som kroppen: provet `runway-3d-20261127`: Hunyuans ansikte blev suddigt med fel hårfärg, Trellis en vaxmask. _(prov)_
- Standarddockans huvud format efter personens ansikte: provet `tomasz-dockan-pa-hans-matt-20261127`: Tomasz-dockans huvud i hans form, med och utan hans yta, bredvid Danilos huvud med hans yta och förlagan; formen skilde 7 mm i median och 15 mm i den tionde delen som skilde mest. _(prov)_

### 4. Händerna

_Behålls kroppens egna händer, eller sätts färdiga händer på?_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **En färdig hand från Meshy, satt på vid manschetten** (`meshy-hand`) | finns _(kod)_ | bilden av en öppen högerhand med åtskilda fingrar ur steg 1; Meshys kropp, med skjortärmar att sätta handen i _(kod)_ | naglar och ådror; samma hand speglad till vänster; en skarv vid handleden som måste lagas (steg 5, fixa_handleder.py) _(prov)_ | steg 2, 3; `steg/02-meshy-delar/meshy_enbild.py`, `steg/03-montering/bygg_modul.py`, `steg/03-montering/montera_apose.py`; handen skärs vid handleden, speglas till ett par och sätts på vinkelrätt mot underarmen _(kod)_ | 30 krediter (Meshy) _(körning)_ | samma 2 minuter som kroppen (samtidigt) _(körning)_ |
| **Standarddockans händer (MPFB)** (`mpfb-hander`) | finns _(kod)_ | standarddockans kropp _(kod)_ | händer i samma yta som kroppen, utan skarv; knogarna sitter för långt ut i handen (new_docka.md, Kända brister) _(kod)_ | `scen/bygg_docka.py`; en del av MPFB-kroppen _(kod)_ | gratis _(kod)_ | ingår i dockans bygge _(kod)_ |
| **Dockans händer insatta i personens ärm** (`dockans-hander-i-armen`) | prövat _(prov)_ | en riggad figur med Mixamo-ben och skjortärmar, med handen som egen del (Version 1: materialet Handpar); en grunddocka med samma skelett (standarddocka_danilo eller _frasse); förlagan ur steg 1 (en öppen högerhand bakifrån) och MediaPipe-miljön (som steg 09) _(kod)_ | dockans hand med dess 30 fingerleder och vikter, oförändrade: knyts och håller kortet som dockan; handleden 8 mm utanför manschetten och skarven 27 mm inne i ärmen: handen böjs och vrids utan att något går genom ärmen; ärmen kortad 3–4 cm längs underarmen när manschetten räcker förbi handleden; armens leder är personens egna; huden ur personens egen hand: handryggen ur förlagan med naglar, knogar och ådror, handflatan ur den förra handens bild, inpassade efter handens 21 punkter och jämkade till ansiktets ton; handflatan bredare efter personens hand (Tomasz 12 %), med lederna kvar; manschetten stängd mot handleden med en stel ring _(prov)_ | `steg/14-dockans-hander/dockans_hander.py`, `steg/14-dockans-hander/hudbilder.py`, `steg/14-dockans-hander/handpunkter.py`; steg 14: handen och skarvarna tas bort, ärmen skärs rakt där tyget slutar, handleden flyttas till ärmens mitt, dockans hand sätts in med en bit underarm, skalad till personens hand, och handens ben byts mot dockans; hudbilder.py mäter handen och gör huden ur förlagan och den förra handens bild _(kod)_ | gratis _(kod)_ | hudbilderna och bygget med bakningen, cirka en och en halv minut _(körning)_ |

- En färdig hand från Meshy, satt på vid manschetten: provet `hander-hunyuan-mot-meshy-20261127`: Naglar, knogar och ådror på nära håll, och nypet går topp mot topp; men handledens led sitter inne i ärmen, så manschetten följer med när handen böjs, och tummen drar ett skinn över handflatan i en knuten hand. I provet runway-3d-20261127 frågade Jakob om handen är påklistrad i efterhand (det är den). _(prov)_
- En färdig hand från Meshy, satt på vid manschetten: Sedan 2026-11-27 behåller handen sin egen handled i monteringen och skarven läggs inne i ärmen (HANDLED_IN i montera_apose.py); prövat på Tomasz delar, men ingen dealer är riggad hos Meshy med den än (dealerns-handled-20261127). _(prov)_
- Standarddockans händer (MPFB): provet `tomasz-med-dockans-hander-20261127`: Tomasz-figuren med Danilos händer knöt handen som Danilos (2 % av kanterna töjda över 1,5 gånger, mot Tomasz-dockans 5–6 %) och höll kortet med topparna 0,4 mm isär (Tomasz-dockans nådde inte kortet). Handleden böjd 60 grader åt båda håll och vriden 80 grader: inga hörn genom ärmen, manschetten stel vid böjning och töjd 8–9 % vid vridning. I Danilos giv vid livebordet hamnar fingrarna högst 11 mm från rörelsens punkter (Tomasz-dockans 41 mm). _(prov)_
- Dockans händer insatta i personens ärm: provet `tomasz-med-dockans-hander-20261127`: Andra vändan: huden ur hans egen hand (naglar, knogar, ådror, ansiktets ton) och handflatan 12 % bredare; knuten hand med tummen utanpå fingrarna: 2 % av kanterna töjda över 1,5 gånger (Danilo 2 %, Tomasz-dockan 3–4 %), nypet 0,3 mm, kortet hålls mellan topparna; handleden böjd och vriden utan hörn genom ärmen, och manschetten stängd mot handleden. Första vändan dömde domaren Nja: grunden håller, men handen hörde inte till honom. _(prov)_
- Dockans händer insatta i personens ärm: Huden kan också målas hos Meshy (10 krediter): meshy_kopia.py gör en kopia av bara dockans högra hand, steg 12:s meshy_ny_yta.py --kopia målar den, och dockans_hander.py --meshy-bild lägger den på båda händerna. Förberett och torrkört, inte betalt. _(kod)_

### 5. Skelettet och riggen

_Vem sätter skelettet och vikterna i kroppen? (Bennamnen är alltid våra, se Skelettet.)_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **Meshy riggar kroppen (Mixamo-skelett)** (`meshy-rigg`) | finns _(kod)_ | en hel kropp i A-pose; en lätt kopia: högst 380 000 trianglar och 100 MB (steg 3 gör en på 180 000) _(kod)_ | Mixamo-ben med prefixet mixamorig:, för en kropp på 1,8 m; vikter för hela kroppen; efter steg 5 och 6: 56 ben, 30 av dem fingerleder _(körning)_ | steg 4; `steg/04-rigg/meshy_rigg.py`; biped, mallen mixamo, med fingrar _(kod)_ | 5 krediter (Meshy) _(körning)_ | cirka 1,5 minuter _(körning)_ |
| **Standarddockans skelett (MPFB med Mixamo-namn)** (`mpfb-rigg`) | finns _(kod)_ | standarddockans kropp _(kod)_ | 81 ben, 71 av dem formar huden; IK-kontroller och ledgränser; ansiktsben: käken och ögonen _(körning)_ | `scen/bygg_docka.py`; i samma bygge som kroppen _(kod)_ | gratis _(kod)_ | ingår i dockans bygge _(kod)_ |

- Meshy riggar kroppen (Mixamo-skelett): körningen `tomasz-20261126`: Riggen kostade 5 krediter; dealern fick 56 ben men inga vridben, inga ögonleder och ingen käke. _(körning)_
- Meshy riggar kroppen (Mixamo-skelett): På kroppen i ett stycke ur flera vyer (meshy-provet-20261127, T-pose, utan steg 3) gav riggen 66 ben med fyra leder per finger, men den når inte nypet (tummens och pekfingrets toppar 33–47 mm isär, Tomasz-dockans 12) och river upp huden över knogarna i en knuten hand, eftersom fingrarna där är ihopvuxna; handleden och armbågen böjde rent. _(prov)_

### 6. Fingrarna och handlederna

_Hur får händerna sina fingerleder?_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **Eget fingersteg: 30 fingerleder efter handens form, och handleden lagad** (`steg5-fingrar`) | finns _(kod)_ | en riggad kropp med Mixamo-ben; handens yta som en egen del (materialet Handpar); fem åtskilda fingertoppar i handens silhuett _(kod)_ | 30 fingerleder, tre per finger, med vikter; halsen och axlarna rensade från felaktiga vikter; handleden dragen in i ärmen så att skarven döljs _(kod)_ | steg 5; `steg/05-fingrar-handleder/bygg_fingrar_apose.py`, `steg/05-fingrar-handleder/fixa_handleder.py`; Meshys egna fingerben byts mot nya, anpassade efter handens silhuett _(kod)_ | gratis _(kod)_ | cirka 3 minuter _(körning)_ |
| **Standarddockans fingerleder (MPFB)** (`mpfb-fingrar`) | finns _(kod)_ | standarddockans kropp och skelett _(kod)_ | 30 fingerleder med ledgränser _(kod)_ | `scen/bygg_docka.py`; i samma bygge som kroppen _(kod)_ | gratis _(kod)_ | ingår i dockans bygge _(kod)_ |

- Eget fingersteg: 30 fingerleder efter handens form, och handleden lagad: provet `dealerns-handled-20261127`: Tomasz handled blev slät, och fingrarna böjer sig som förut; en mörk krage syns vid manschetten när handen böjs mycket. _(prov)_

### 7. Vridben i underarmen

_Ska underarmen kunna vridas utan att huden nyps vid armbågen?_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **Inga vridben** (`inga-vridben`) | finns _(kod)_ | inget _(kod)_ | underarmen vrids som en stel del: huden nyps vid armbågen när den vrids mer än cirka 60 grader (new_docka.md 7.1b) _(kod)_ | steg 6; `steg/06-dealer-export/exportera_dealer.py`; med --utan-vridben; auto_avatar.py skickar inte den flaggan _(kod)_ | gratis _(kod)_ | ingår i exporten _(kod)_ |
| **Två vridben i varje underarm, lagda till i exporten** (`vridben-export`) | finns _(kod)_ | en riggad dealer med ForeArm och Hand _(kod)_ | huden vrids längs hela underarmen; i vila är huden som utan dem (skriptet mäter det) _(kod)_ | steg 6; `steg/06-dealer-export/exportera_dealer.py`, `steg/06-dealer-export/vridben.py`; som standarddockans vridben (new_docka.md 7.1b) _(kod)_ | gratis _(kod)_ | ingår i exporten _(kod)_ |
| **Standarddockans vridben** (`vridben-mpfb`) | finns _(kod)_ | standarddockans kropp och skelett _(kod)_ | två vridben per underarm, med samma delning av huden som exporten _(kod)_ | `scen/bygg_docka.py`; i samma bygge som kroppen _(kod)_ | gratis _(kod)_ | ingår i dockans bygge _(kod)_ |

- Inga vridben: körningen `tomasz-20261126`: Tomasz byggdes innan exporten fick vridben: 56 ben, inga vridben. _(körning)_
- Två vridben i varje underarm, lagda till i exporten: provet `dealerns-handled-20261127`: Tomasz rättade docka (tomasz_handled) fick två vridben i varje underarm; huden i vila är oförändrad. _(prov)_
- Två vridben i varje underarm, lagda till i exporten: Ny 2026-11-27: Tomasz första bygge har inga vridben. _(körning)_

### 8. Ansiktets rörelser

_Ska dockan kunna blinka, le, lyfta brynen och flytta blicken?_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **Inga ansiktsrörelser** (`inget-ansikte`) | finns _(kod)_ | inget _(kod)_ | kan inte blinka, le eller lyfta brynen; blicken följer bara huvudet _(körning)_ | det ett framställt huvud ger _(kod)_ | gratis _(kod)_ | ingen _(kod)_ |
| **Standarddockans ansikte: ansiktsformer, käke och ögonleder** (`mpfb-ansikte`) | finns _(kod)_ | standarddockans huvud och skelett _(kod)_ | 30 ansiktsformer med ARKit-namn: blinkning, bryn, leende, trut och öppen mun; 15 ansiktsben, bland dem käken och båda ögonen; inte en full ansiktsrigg: 22 av ARKit:s 52 former saknas (new_docka.md 7.7) _(kod)_ | `scen/bygg_docka.py`; ARKIT_KARTA, ANSIKTSBEN och ANSIKTE i skriptet _(kod)_ | gratis _(kod)_ | ingår i dockans bygge _(kod)_ |
| **Standarddockans former förda över till ett framställt huvud** (`former-pa-framstallt-huvud`) | prövat _(prov)_ | en färdig dealer med ett framställt huvud (Meshy), med stängd mun och öppna ögon; standarddockans huvud med sina 30 former; ansiktets punkter i båda huvudena (MediaPipe-miljön i ../blackjack-dealer/tools/python/) _(kod)_ | 30 ansiktsformer med standarddockans namn på personens eget huvud: blinkning, lock, bryn, leende och öppen mun; en glob per öga på nya ögonleder (eye.L, eye.R) med personens egen målade iris, och käkleden jaw; munnen uppskuren med en mörk munhåla bakom; inga tänder och ingen tunga; likheten i vila står kvar: huvudets form, UV och texturer är personens _(prov)_ | `steg/09-ansikte/ansikte.py`, `steg/09-ansikte/punkter.py`; körs för hand på en färdig dealer-GLB; hur formerna förs över står i skriptets huvud _(kod)_ | gratis _(kod)_ | några minuter i Blender _(bedömning)_ |

- Inga ansiktsrörelser: körningen `tomasz-20261126`: Inga ansiktsformer och inga ögonleder. _(körning)_
- Standarddockans ansikte: ansiktsformer, käke och ögonleder: provet `dockans-ansikte-20261127`: Blicken, blinkningen, leendet och brynen syns i spelets vy på provmodellerna; inte dömt än. _(prov)_
- Standarddockans former förda över till ett framställt huvud: provet `tomasz-ansikte-20261127`: Tomasz blinkar, sänker locken, flyttar blicken, ler, lyfter brynen och öppnar munnen, och ser ut som förut i vila; leendet syns i spelets vy. Byggt på dockan utan den rättade handleden. _(prov)_

### 9. Kläderna och ytan

_Hur får dockan hud och kläder?_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **Kläder och hud inbakade i ytan, ur bilden** (`inbakad-yta`) | finns _(kod)_ | en kropp ur en bild (Meshy eller Runway); en klädsel där skjortan inte är hudfärgad (förval mörkblå skjorta; --outfit) _(kod)_ | fotolik hud och kläder i 4K; hudtonen jämnad mellan huvudet, händerna och kroppen (steg 3); kläderna går inte att byta utan en ny körning _(kod)_ | steg 1, 2, 3, 5; `steg/01-referenser/apose_referenser.py`, `steg/02-meshy-delar/meshy_enbild.py`, `steg/03-montering/montera_apose.py`, `steg/05-fingrar-handleder/bygg_fingrar.py`; klädseln i bilden, texturen hos Meshy, hudtonen i monteringen och en mattare hud i steg 5 _(kod)_ | ingår i delarna _(kod)_ | ingår i delarna _(kod)_ |
| **Standarddockans neutrala grå hud, utan kläder** (`mpfb-gra`) | finns _(kod)_ | standarddockans kropp _(kod)_ | en yta med ett material och hörnfärger, så att spelet läser modellen som en del; inga kläder _(kod)_ | `scen/bygg_docka.py`; färgerna i ANSIKTE _(kod)_ | gratis _(kod)_ | ingår i dockans bygge _(kod)_ |
| **Kläder som egna delar på samma skelett** (`separata-klader`) | tänkt _(kod)_ | kläder modellerade eller köpta som egna delar; vikter förda över från kroppen _(bedömning)_ | kläder som går att byta utan att bygga om dockan _(bedömning)_ | inget skript (new_docka.md 10.3) _(kod)_ | okänd _(bedömning)_ | okänd _(bedömning)_ |
| **Personens utseende som ny yta på vår egen docka (Meshy, och närbilden på ansiktet)** (`meshy-ny-yta`) | prövat _(prov)_ | vår docka ur scen/bygg_docka.py (dess ytkarta och hörnfärger); 1–4 vyer av personen, framifrån först, i samma ställning (provet: Meshy-vyerna ur A-posebilden); närbilden av ansiktet ur steg 1, för ansiktet; MediaPipe-miljön i ../blackjack-dealer/tools/python/ (ansiktets punkter) _(kod)_ | personens hud, hår och kläder målade på dockans egen karta i 4K; dockans skelett, fingrar, vridben och 30 ansiktsformer orörda, så att den spelar sina rörelser som förut; dockans form: kroppen, händerna och ansiktets form är dockans, och kläderna är målade på huden (ingen krage, tighta byxor, svarta fötter); ansiktet ur närbilden: skarpa drag och personens ögonfärg; Meshys eget ansikte blev suddigt med vita ögon _(prov)_ | `steg/12-ny-yta/meshy_ny_yta.py`, `steg/12-ny-yta/yta.py`, `steg/12-ny-yta/narbild.py`; meshy_ny_yta.py beställer bilden på en kopia av dockans yta (yta.py kopia), narbild.py lägger närbilden på ansiktet och yta.py lagg lägger bilden på dockan; kommandona står i README-SV.md _(kod)_ | 10 krediter (2K eller 4K); ansiktet ur närbilden gratis (Meshy) _(körning)_ | några minuter hos Meshy och några i Blender (inte mätt) _(bedömning)_ |
| **Personens hud och ansikte som textur på standarddockan** (`foto-pa-docka`) | tänkt _(kod)_ | foton av personen; standarddockans kropp och dess UV _(bedömning)_ | personens hudton och ansikte på vår docka _(bedömning)_ | inget skript _(kod)_ | okänd _(bedömning)_ | okänd _(bedömning)_ |

- Kläder som egna delar på samma skelett: hinder: Inga kläder finns. _(kod)_
- Personens utseende som ny yta på vår egen docka (Meshy, och närbilden på ansiktet): provet `meshy-provet-20261127`: Danilos docka fick Tomasz hud, hår, skjorta och byxor och spelade vid livebordet med sina egna händer och sitt skelett; ansiktet är Tomasz färger på Danilos form. Domaren (inte Jakob): Inte bra, en målad docka och inte personen; formen först (huvudet, sedan kroppens bredd), skjortan sist som egen del. _(prov)_
- Personens hud och ansikte som textur på standarddockan: hinder: Hela kroppen ur foton utan Meshy är inte prövat; ansiktet ur en närbild på dockans karta är prövat i meshy-ny-yta (steg/12-ny-yta/narbild.py). _(kod)_

### 10. Exporten

_Hur blir dockan en fil som spelet och editorn läser?_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **Dealer-GLB för spelet (steg 6)** (`dealer-glb`) | finns _(kod)_ | en riggad modell med Meshys Mixamo-ben _(kod)_ | bennamnen utan mixamorig: och Neck som neck; en lista över de ben spelet saknar; output/<namn>/06-dealer-export/<namn>-dealer-apose.glb _(kod)_ | steg 6; `steg/06-dealer-export/exportera_dealer.py`; i Blender _(kod)_ | gratis _(kod)_ | cirka 15 sekunder _(körning)_ |
| **Standarddockans .blend och .glb** (`mpfb-glb`) | finns _(kod)_ | standarddockans bygge _(kod)_ | assets/docka/standarddocka_<kön>.blend och .glb, eller en provmodell bredvid med --namn; en byggrapport i slaskens bygge/ _(kod)_ | `scen/bygg_docka.py`; sist i bygget _(kod)_ | gratis _(kod)_ | ingår i dockans bygge _(kod)_ |

- Dealer-GLB för spelet (steg 6): körningen `tomasz-20261126`: Inget ben saknades; 175 532 trianglar och 26,7 MB. _(körning)_

### 11. Kontrollen

_Hur ser man att dockan blev rätt?_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **Kontrollblad i vila (steg 7)** (`qc-blad`) | finns _(kod)_ | dealer-GLB:n ur steg 6; A-posebilden ur steg 1 _(kod)_ | helkroppen framifrån och snett, ansiktet och båda handlederna, bredvid referensbilden _(kod)_ | steg 7; `steg/07-qc/qc_oversikt.py`; Cycles i Blender _(kod)_ | gratis _(kod)_ | cirka 2,5 minuter _(körning)_ |
| **Bilder genom spelets kameror i standardscenen** (`standardscenens-bilder`) | finns _(kod)_ | dockan som .blend; bordet byggt (scen/bygg_bord.py) _(kod)_ | dockan vid bordet genom spelets kamera och de fasta kamerorna; ansiktets uttryck i närbild; en textdump av ben, mått och rörelser som en agent kan läsa _(kod)_ | `scen/qc_render.py`, `verktyg/qc_ansikte.py`, `verktyg/inspektera.py`; kommandona står i README-SV.md (Kontroll) _(kod)_ | gratis _(kod)_ | några minuter (inte mätt) _(bedömning)_ |
| **Dockans rörelser i standarddockans editor** (`i-editorn`) | finns _(kod)_ | GLB:n som assets/docka/standarddocka_<namn>.glb (bygg_docka.py skriver den där; en figur ur Version 1 kopieras dit för hand); vårt skelett _(kod)_ | givarna och vilan på dealern, genom spelets kamera; vid livebordet: Danilos lyfta rörelser, med modellen så stor att armen blir Danilos _(prov)_ | `../standarddocka/editor/scen.ts`, `../standarddocka/verktyg/titta.ts`; öppnas med ?modell=<namn>; titta.ts --modell <namn> tar stillbilder utan fönster _(kod)_ | gratis _(kod)_ | sekunder _(bedömning)_ |

- Kontrollblad i vila (steg 7): körningen `tomasz-20261126`: Kontrollbladet ligger i slaskens granska/tomasz/ och väntar på Jakobs dom. _(körning)_
- Dockans rörelser i standarddockans editor: provet `kling-tider-20261127`: Tomasz-dockan spelade standarddockans giv i editorn; Tomasz-dockan på hans mått spelade Danilos vila och giv till plats 7 (tomasz-dockan-pa-hans-matt-20261127). _(prov)_

### 12. Rörelserna och filmen

_Vilka rörelser spelar dockan, och blir det en film?_

| Alternativ | Status | Kräver | Ger | Görs av | Kostnad | Tid |
| --- | --- | --- | --- | --- | --- | --- |
| **En sittande rörelse vid ett eget bord (steg 8)** (`steg8-film`) | finns _(kod)_ | dealer-GLB:n ur steg 6 _(kod)_ | en film i 1280 × 720 och 24 bilder per sekund; dealern med bakad rörelse, bord, pall och kort som en GLB; ett eget bord, inte standardscenen _(kod)_ | steg 8; `steg/08-film/animera_dealer.py`; Cycles i Blender _(kod)_ | gratis _(kod)_ | inte mätt; laptopen tar 20–30 sekunder per bild i Cycles (new_docka.md 9), så 6 sekunders film kan ta en timme _(bedömning)_ |
| **Ingen film** (`ingen-film`) | finns _(kod)_ | inget _(kod)_ | dockan utan film _(kod)_ | auto_avatar.py --no-video _(kod)_ | gratis _(kod)_ | ingen _(kod)_ |
| **Standarddockans egna rörelser** (`dockans-rorelser`) | finns _(kod)_ | vårt skelett _(kod)_ | givarna till alla sju platser, vilan och återgången, som Jakob har dömt dem _(prov)_ | `../standarddocka/editor/rorelse.ts`, `verktyg/dealer3d_till_blender.py`; i editorn, och i Blender genom bryggan _(kod)_ | gratis _(kod)_ | sekunder i editorn _(bedömning)_ |
| **Rörelser lyfta ur en riktig dealers film** (`rorelser-ur-film`) | finns _(data)_ | vårt skelett; en lyft giv i live-bj/data/lyft/ _(data)_ | givar som de riktiga dealrarna gör dem: tre per stil, i dockans eget rörelseformat; djupet är en skattning: varje led 4–11 cm fel i median, mest i djupled _(data)_ | `../live-bj/data/lyft/`; lyfta med live-bj/verktyg/lyft.py _(data)_ | gratis _(kod)_ | sekunder _(bedömning)_ |
| **Dockans film görs om till personen hos Runway (Aleph 2, Kling 4, WAN 3)** (`runway-person`) | prövat _(prov)_ | en film av dockan; foton eller en bild av personen _(prov)_ | en filmad person som gör dockans rörelser _(prov)_ | `../blackjack-dealer/tools/order-new.ts`; en beställning i blackjack-dealer (skillen bestalla-film) _(kod)_ | efter filmens längd och modell; hela provet tomasz-runda-20261126 kostade 1 758 krediter (Runway) _(prov)_ | minuter per tagning _(bedömning)_ |

- En sittande rörelse vid ett eget bord (steg 8): Inte körd för Tomasz. _(körning)_
- Standarddockans egna rörelser: provet `givar-sju-platser-20261126`: Standarddockans givar till alla sju platser, för mannen och kvinnan. _(prov)_
- Rörelser lyfta ur en riktig dealers film: Lyftet är prövat mot dockans egna filmer (live-bj/README.md); inte visat för Jakob på en docka än. _(data)_
- Dockans film görs om till personen hos Runway (Aleph 2, Kling 4, WAN 3): provet `tomasz-runda-20261126`: Jakob dömde provet Inte bra: rörelserna blir stela, eftersom Aleph kopierar dockans. _(prov)_

## De färdiga vägarna

En färdig väg är en uppsättning val som hör ihop och är prövade tillsammans. De låsta delarna byts inte en och en; de som får bytas har sina alternativ i tabellen.

### Version 1: från foton med Meshy

**Finns**, körs med `.\.venv\Scripts\python.exe auto_avatar.py --name <namn>` (Jakob: `STARTA avatar.cmd`).

Det auto_avatar.py gör i dag, steg 1–8, oförändrat. Personens utseende ur foton; Meshy gör kroppen, huvudet och handen var för sig, Blender syr ihop dem, Meshy riggar, och egna skript sätter fingrarna, lagar handleden och exporterar. Bäst likhet av det vi har prövat, men inga ansiktsrörelser.

- Kostnad: 95 Meshy-krediter (tre delar à 30 och riggen 5) och 3–5 bilder hos OpenAI _(körning)_
- Tid: cirka 18 minuter för steg 1–7 på laptopen; filmen i steg 8 till det (inte mätt) _(körning)_
- Körningen `tomasz-20261126`: tomasz: bäst ansiktslikhet av allt vi prövat; 56 ben, 30 fingerleder, inga vridben, inga ögonleder, ingen käke och inga ansiktsformer. _(körning)_

| Del | Valet | I vägen |
| --- | --- | --- |
| Underlaget | Foton av personen, gjorda till tre referensbilder | låst |
| Kroppen | Meshy gör kroppen ur A-posebilden | låst |
| Huvudet och ansiktet | Meshy gör huvudet ur närbilden av ansiktet | låst |
| Händerna | En färdig hand från Meshy, satt på vid manschetten | låst |
| Skelettet och riggen | Meshy riggar kroppen (Mixamo-skelett) | låst |
| Fingrarna och handlederna | Eget fingersteg: 30 fingerleder efter handens form, och handleden lagad | låst |
| Vridben i underarmen | Två vridben i varje underarm, lagda till i exporten | får bytas: Inga vridben |
| Ansiktets rörelser | Inga ansiktsrörelser | låst |
| Kläderna och ytan | Kläder och hud inbakade i ytan, ur bilden | låst |
| Exporten | Dealer-GLB för spelet (steg 6) | låst |
| Kontrollen | Kontrollblad i vila (steg 7) | låst |
| Rörelserna och filmen | En sittande rörelse vid ett eget bord (steg 8) | får bytas: Ingen film |

Varför de är låsta: Stegen är skrivna för varandra: steg 3 syr Meshys huvud och hand på Meshys kropp efter hudfärgen och skjortans kant, steg 4 riggar steg 3:s lätta kopia, steg 5 letar handen på materialet som steg 3 ger den, och steg 6–8 tar Meshys Mixamo-ben. Byts en del ut går kedjan sönder. _(kod)_

Vridbenen går bara att välja bort genom att köra steg 6 för hand med --utan-vridben; auto_avatar.py har ingen flagga för det. Filmen väljs bort med --no-video. _(kod)_

Steg för steg:

| Steg | Vad | Skript | Betalt | Kvitto | Tid |
| --- | --- | --- | --- | --- | --- |
| 1 `01-referenser` Referensbilder | gpt-image-2 gör tre bilder ur fotona: huvudet framifrån, hela kroppen i A-pose och en öppen högerhand. A-posebilden mäts och görs om innan något får beställas hos Meshy. | `steg/01-referenser/apose_referenser.py` | 3 bilder; A-posebilden högst 2 gånger till (OpenAI) | `referenser.json` | 343,5 s _(körning)_ |
| 2 `02-meshy-delar` Tre delar hos Meshy | Meshy gör huvudet, kroppen i A-pose och högerhanden, var och en ur sin bild och alla tre samtidigt. | `steg/02-meshy-delar/meshy_enbild.py` | tre jobb à 30 krediter (Meshy) | `korning.json` | 120,8 s _(körning)_ |
| 3 `03-montering` Montering | Huvudet skärs vid halsen och handen vid handleden och speglas till ett par; brösthåret plattas ut; delarna sys ihop med samma hudton (handen med sin egen handled, skarven inne i ärmen), och en lätt kopia på 180 000 trianglar görs för riggen. | `steg/03-montering/bygg_modul.py`, `steg/03-montering/montera_apose.py`, `steg/03-montering/clean_kropp_chest.py`, `steg/03-montering/forenkla_4k.py`, `steg/03-montering/forhandsvisning_montering.py`; med `steg/03-montering/montera.py`, `metod/bygg.py`, `metod/gltf.py`, `gemensamt/standardmatt.py` | gratis |  | 178,4 s _(körning)_ |
| 4 `04-rigg` Riggen hos Meshy | Meshy sätter ett Mixamo-skelett med fingrar i den lätta kopian. | `steg/04-rigg/meshy_rigg.py`; med `steg/02-meshy-delar/meshy_enbild.py` | ett jobb à 5 krediter (Meshy) | `riggjobb.json` | 90,8 s _(körning)_ |
| 5 `05-fingrar-handleder` Fingrar och handleder | Nya fingerben efter handens silhuett (tre per finger), halsens och axlarnas vikter rensas, och handleden görs ren: vidgningen räknas tillbaka, handleden går in i ärmen och skarven färgas som ärmen; före- och efterbilder. | `steg/05-fingrar-handleder/bygg_fingrar_apose.py`, `steg/05-fingrar-handleder/fixa_handleder.py`; med `steg/05-fingrar-handleder/bygg_fingrar.py`, `steg/05-fingrar-handleder/fingrar_apose.py`, `steg/05-fingrar-handleder/fingerrigg.py`, `steg/05-fingrar-handleder/viktrensning.py` | gratis |  | 167 s _(körning)_ |
| 6 `06-dealer-export` Dealer-GLB | Bennamnen blir spelets (utan mixamorig:, Neck som neck), två vridben läggs i varje underarm, och benen som spelet kräver räknas. | `steg/06-dealer-export/exportera_dealer.py`, `steg/02-meshy-delar/meshy_enbild.py`; med `steg/06-dealer-export/vridben.py` | gratis |  | 15,5 s _(körning)_ |
| 7 `07-qc` Kontrollblad | Bilder av dealern i vila: helkroppen framifrån och snett, ansiktet och båda handlederna, samlade på ett blad bredvid referensbilden. | `steg/07-qc/qc_oversikt.py`, `steg/02-meshy-delar/meshy_enbild.py` | gratis |  | 148,6 s _(körning)_ |
| 8 `08-film` Rörelsefilm | En sittande dealer-rörelse vid ett eget bord: film, GLB med bakad rörelse och sex rutor ur filmen. | `steg/08-film/animera_dealer.py` | gratis |  | inte mätt |

Flaggorna:

| Flagga | Gör | Förval | I guiden |
| --- | --- | --- | --- |
| `--name` | dealerns namn; fotona läses ur input/<namn>/ |  | ja |
| `--photos` | 1–8 foton i stället för input/<namn>/ |  | ja |
| `--out` | en annan utmapp än output/<namn>/ |  | nej |
| `--outfit` | klädseln, på engelska; skjortan tydligt icke-hudfärgad |  | ja |
| `--no-video` | hoppar över steg 8 (filmen) |  | ja |
| `--seconds` | filmens längd i sekunder | 6.0 | ja |
| `--samples` | bildkvaliteten i Cycles (laptopen: 16–24) | 48 | ja |
| `--refs-only` | stannar efter steg 1: bara bilderna, inga Meshy-krediter |  | ja |
| `--from-step` | börjar på steg N; kvittona gör att inget betalas två gånger |  | ja |
| `--only-step` | kör bara steg N |  | ja |
| `--dry-run` | gratis kontroll: foton, nycklar, importer, stegskript, Blender och mappar |  | ja |

### Standarddockans kropp och ansiktsrigg med personens utseende ovanpå

**Tänkt**.

Standarddockan som grund, så att allt rör sig, och personen ovanpå: huvudet format efter ansiktets punkter i ett foto och huden och ansiktet ur fotona som textur. Likheten från personen, rörligheten från vår docka. Inte prövat.

- Kostnad: gratis, om fotona räcker som de är _(bedömning)_
- Tid: okänd _(bedömning)_

| Del | Valet | I vägen |
| --- | --- | --- |
| Underlaget | Foton för utseendet och mått för kroppen | låst |
| Kroppen | Standarddockans kropp (MPFB 2), byggd efter mått | låst |
| Huvudet och ansiktet | Standarddockans huvud format efter personens ansikte | låst |
| Händerna | Standarddockans händer (MPFB) | låst |
| Skelettet och riggen | Standarddockans skelett (MPFB med Mixamo-namn) | låst |
| Fingrarna och handlederna | Standarddockans fingerleder (MPFB) | låst |
| Vridben i underarmen | Standarddockans vridben | låst |
| Ansiktets rörelser | Standarddockans ansikte: ansiktsformer, käke och ögonleder | låst |
| Kläderna och ytan | Personens hud och ansikte som textur på standarddockan | låst |
| Exporten | Standarddockans .blend och .glb | låst |
| Kontrollen | Bilder genom spelets kameror i standardscenen | får bytas: Dockans rörelser i standarddockans editor |
| Rörelserna och filmen | Standarddockans egna rörelser | får bytas: Rörelser lyfta ur en riktig dealers film, Dockans film görs om till personen hos Runway (Aleph 2, Kling 4, WAN 3) |

Varför de är låsta: Ansiktsformerna och ögonlederna finns bara på standarddockans huvud, så huvudet måste vara hennes och formas om, inte bytas ut; kroppen, skelettet och ansiktet hör ihop i hennes bygge. _(kod)_

Det som saknas:

- ett skript som formar standarddockans huvud direkt efter ett foto (steg 13 formar det efter personens figur ur Version 1, med formerna kvar)
- en textur av ansiktet och huden ur fotona, lagd på dockans UV
- att bygg_docka.py tar emot mått utifrån (personens egna)
- kläder
_(kod)_

### Docka efter en mätt dealer (Danilo, Frasse)

**Finns**, körs med `blender -b --python-exit-code 1 --python scen/bygg_docka.py -- --kon danilo`.

En standarddocka med kroppens mått ur mätningen av en riktig dealer på film, vårt eget ansikte och rörelserna lyfta ur samma film. Inga foton och ingen Meshy.

- Kostnad: gratis _(kod)_
- Tid: några minuter per docka (inte mätt) _(bedömning)_
- Provet `danilo-frasse-kroppar-20261127`: tre män med samma ansikte och några centimeters skillnad i axlar och huvud; domaren bra, den externa nja (för lika mannen). jakob: bra (2026-11-27). _(prov)_
- Danilo: stilen kameran, måtten i `live-bj/data/uppsattning.json dealer.kameran` _(data)_
- Frasse: stilen bordet, måtten i `live-bj/data/uppsattning.json dealer.bordet` _(data)_

| Del | Valet | I vägen |
| --- | --- | --- |
| Underlaget | En riktig dealers mått, mätta på film | låst |
| Kroppen | Standarddockans kropp (MPFB 2), byggd efter mått | låst |
| Huvudet och ansiktet | Standarddockans huvud (MPFB) | låst |
| Händerna | Standarddockans händer (MPFB) | låst |
| Skelettet och riggen | Standarddockans skelett (MPFB med Mixamo-namn) | låst |
| Fingrarna och handlederna | Standarddockans fingerleder (MPFB) | låst |
| Vridben i underarmen | Standarddockans vridben | låst |
| Ansiktets rörelser | Standarddockans ansikte: ansiktsformer, käke och ögonleder | låst |
| Kläderna och ytan | Standarddockans neutrala grå hud, utan kläder | får bytas: Kläder som egna delar på samma skelett, Personens utseende som ny yta på vår egen docka (Meshy, och närbilden på ansiktet) |
| Exporten | Standarddockans .blend och .glb | låst |
| Kontrollen | Bilder genom spelets kameror i standardscenen | får bytas: Dockans rörelser i standarddockans editor |
| Rörelserna och filmen | Rörelser lyfta ur en riktig dealers film | får bytas: Standarddockans egna rörelser |

Varför de är låsta: Måtten ur filmen kan bara användas av en kropp som byggs efter mått, alltså standarddockans; resten följer med hennes bygge. _(kod)_

Byggd sedan 2026-11-27 (assets/docka/standarddocka_danilo.* och _frasse.*). Ur filmen tas bara axellederna och huvudets höjd, avskrivna i MATT i bygg_docka.py; halsen, armarna (ANSUR II, filmens var skattade och för korta), händerna, benen och bålen är mannens, och midjan och höften syns inte bakom bordet (Danilos 4 och 3 % smalare). Hur långt bakom kanten dealern sitter är en skattning (give or take 0,1 m). _(kod)_

Steg för steg:

| Steg | Vad | Skript | Betalt | Kvitto | Tid |
| --- | --- | --- | --- | --- | --- |
| A Måtten ur spelet | Läser spelets kod och skriver scen/standard.yaml, som bygget läser. `.\.venv\Scripts\python.exe scen/gen_standard.py` | `scen/gen_standard.py`, `scen/las_spelet.ts`; med `gemensamt/standard.py` | gratis |  | inte mätt |
| B Dockan | Mannens MPFB-kropp med dealerns mätta axlar och huvud (MATT danilo eller frasse), samma skelett, vridben, fingrar, ansiktsben, 30 ansiktsformer, ögon, bryn och mun som mannen. `blender -b --python-exit-code 1 --python scen/bygg_docka.py -- --kon danilo` | `scen/bygg_docka.py`; med `scen/_bpy_hjalp.py`, `gemensamt/riggverktyg.py`, `gemensamt/standard.py` | gratis |  | inte mätt |

Flaggorna:

| Flagga | Gör | Förval | I guiden |
| --- | --- | --- | --- |
| `--kon` | danilo eller frasse |  | ja |
| `--namn` | skriver standarddocka_<namn>_<N>.* (en provmodell) i stället för de modeller som används |  | ja |
| `--matt` | en fil med provmått som läggs över dockans egna (../live-bj/data/kroppar.json: dealerns kropp ur filmen); bara med --namn |  | ja |

### Docka efter en persons mått (Tomasz)

**Finns**, körs med `blender -b --python-exit-code 1 --python scen/bygg_docka.py -- --kon tomasz_matt`.

En standarddocka med personens kroppsmått, mätta på hans egen figur ur Version 1 och hans bilder bredvid mannen, vårt eget ansikte och skelett, och rörelserna lyfta ur filmen av en riktig dealer (Danilos), med armarna räknade för hans axlar. Utseendet kommer sist, som en yta eller ur filmens styrbilder. Ingen Meshy i bygget.

- Kostnad: gratis _(kod)_
- Tid: några minuter (inte mätt) _(bedömning)_
- Provet `tomasz-dockan-pa-hans-matt-20261127`: tomasz-dockan och danilos docka bredvid varandra vid livebordet; inte dömd än. _(prov)_

| Del | Valet | I vägen |
| --- | --- | --- |
| Underlaget | En persons mått, mätta på hans egen figur och bilder | låst |
| Kroppen | Standarddockans kropp (MPFB 2), byggd efter mått | låst |
| Huvudet och ansiktet | Standarddockans huvud (MPFB) | får bytas: Standarddockans huvud format efter personens ansikte |
| Händerna | Standarddockans händer (MPFB) | låst |
| Skelettet och riggen | Standarddockans skelett (MPFB med Mixamo-namn) | låst |
| Fingrarna och handlederna | Standarddockans fingerleder (MPFB) | låst |
| Vridben i underarmen | Standarddockans vridben | låst |
| Ansiktets rörelser | Standarddockans ansikte: ansiktsformer, käke och ögonleder | låst |
| Kläderna och ytan | Standarddockans neutrala grå hud, utan kläder | får bytas: Kläder som egna delar på samma skelett, Personens utseende som ny yta på vår egen docka (Meshy, och närbilden på ansiktet) |
| Exporten | Standarddockans .blend och .glb | låst |
| Kontrollen | Dockans rörelser i standarddockans editor | får bytas: Bilder genom spelets kameror i standardscenen |
| Rörelserna och filmen | Rörelser lyfta ur en riktig dealers film | får bytas: Standarddockans egna rörelser |

Varför de är låsta: Måtten kan bara användas av en kropp som byggs efter mått, alltså standarddockans; resten följer med hennes bygge. _(kod)_

Byggd 2026-11-27 (assets/docka/standarddocka_tomasz_matt.*, MATT['tomasz_matt']). Längden är ett antagande (figurens 1,80 m med skor och hår). Huvudet har hans höjd, bredd och käke ur måtten men dockans ansikte; i hans ansiktes form är det steg 13 (assets/docka/standarddocka_tomasz_matt_form.*, på prov). Midjan nådde 86 av 93 cm (MPFB:s midjemål fullt ut); den sitter under bordskanten i filmen. _(körning)_

Steg för steg:

| Steg | Vad | Skript | Betalt | Kvitto | Tid |
| --- | --- | --- | --- | --- | --- |
| A Måtten | Mäter personens figur och mannen på samma sätt (lederna, huden i snitt, handen och huvudet); talen, med kläder och hår avdragna, skrivs av i MATT i bygg_docka.py. `blender -b --factory-startup --python verktyg/mat_figur.py -- <ut.json> tomasz=assets/docka/standarddocka_tomasz.glb man=assets/docka/standarddocka_man.glb --ogon tomasz=<höger x,y,z>,<vänster x,y,z>` | `verktyg/mat_figur.py` | gratis |  | inte mätt |
| B Dockan | Mannens MPFB-kropp med personens axlar, bröst, midja, höft, hals och huvud (MATT tomasz_matt), samma skelett, vridben, fingrar, ansiktsben, 30 ansiktsformer, ögon, bryn och mun som mannen. `blender -b --python-exit-code 1 --python scen/bygg_docka.py -- --kon tomasz_matt` | `scen/bygg_docka.py`; med `scen/_bpy_hjalp.py`, `gemensamt/riggverktyg.py`, `gemensamt/standard.py` | gratis |  | inte mätt |

Flaggorna:

| Flagga | Gör | Förval | I guiden |
| --- | --- | --- | --- |
| `--kon` | nyckeln i MATT: tomasz_matt |  | ja |
| `--namn` | skriver standarddocka_<namn>_<N>.* (en provmodell) i stället för de modeller som används |  | ja |

### En ny dealer ur bilder, en rad (Kenji, Amara)

**Finns**, körs med `python ny_dealer.py <person> [--stil kameran|bordet] [--utseende "<text>"] [--prov <provmapp>]`.

En persons mått ur sina egna bilder (SAM 3D Body och MediaPipe), en docka byggd på den docka vars rörelser personen spelar (Danilos eller Frasses) med det som skiljer, dockan in i spelets och editorns dockor ur en datafil, de lyfta rörelserna lagda på den, givens dockfilm genom livebordets kamera och de betalda anropen färdiga. Ett kommando: ny_dealer.py <person>.

- Kostnad: gratis _(kod)_
- Tid: SAM 5-15 minuter, dockan några minuter, rörelserna och filmen några minuter _(bedömning)_
- Provet `kenji-ny-dealer-ur-bilder-20261127`: kenjis docka bredvid danilos, mätningen över hans bilder och givens dockfilm. jakob: inte bra (2026-11-27). _(prov)_

| Del | Valet | I vägen |
| --- | --- | --- |
| Underlaget | En persons mått ur sina egna bilder (SAM 3D Body och MediaPipe) | låst |
| Kroppen | Standarddockans kropp (MPFB 2), byggd efter mått | låst |
| Huvudet och ansiktet | Standarddockans huvud (MPFB) | får bytas:  |
| Händerna | Standarddockans händer (MPFB) | låst |
| Skelettet och riggen | Standarddockans skelett (MPFB med Mixamo-namn) | låst |
| Fingrarna och handlederna | Standarddockans fingerleder (MPFB) | låst |
| Vridben i underarmen | Standarddockans vridben | låst |
| Ansiktets rörelser | Standarddockans ansikte: ansiktsformer, käke och ögonleder | låst |
| Kläderna och ytan | Standarddockans neutrala grå hud, utan kläder | får bytas: Kläder som egna delar på samma skelett, Personens utseende som ny yta på vår egen docka (Meshy, och närbilden på ansiktet) |
| Exporten | Standarddockans .blend och .glb | låst |
| Kontrollen | Dockans rörelser i standarddockans editor | får bytas: Bilder genom spelets kameror i standardscenen |
| Rörelserna och filmen | Rörelser lyfta ur en riktig dealers film | får bytas: Standarddockans egna rörelser |

Varför de är låsta: Måtten kan bara användas av en kropp som byggs efter mått, alltså standarddockans; resten följer med hennes bygge. _(kod)_

Körd 2026-11-27 för Kenji (personer/kenji-nakamura.json, assets/docka/standarddocka_kenji.*) och 2026-11-28 för Amara (personer/amara-okonkwo.json, assets/docka/standarddocka_amara.*), steg 1–5 utan handpåläggning. Måtten är SAM:s kroppsform; axelbredden är SAM:s minst säkra mått (Kenji och Tomasz nästan lika). Ansiktet är dockans eget; utseendet kommer ur filmens bilder. _(körning)_

Steg för steg:

| Steg | Vad | Skript | Betalt | Kvitto | Tid |
| --- | --- | --- | --- | --- | --- |
| 1 Måtten ur bilderna | SAM 3D Body på helfiguren och halvfiguren, MediaPipe på alla tre (kroppen, händerna, ansiktet): personer/<person>.json och en ritning av mätningen. `python ny_dealer.py <person> --steg 1` | `steg/15-matt-ur-bilder/matt_ur_bilder.py`, `steg/15-matt-ur-bilder/sam_bild.py`; med `steg/15-matt-ur-bilder/personmatt.py` | gratis |  | 700 s _(körning)_ |
| 2 Dockan | Grunddockans kropp (Danilos eller Frasses mått) med det personen skiljer sig i, samma skelett, vridben, fingrar och ansiktsrigg som mannen. `blender -b --python-exit-code 1 --python scen/bygg_docka.py -- --kon <docka>` | `scen/bygg_docka.py`; med `scen/_bpy_hjalp.py`, `gemensamt/riggverktyg.py`, `gemensamt/standard.py` | gratis |  | inte mätt |
| 3 I systemet | Dockan mätt på sin modell och skriven i blackjack-dealer/dealer3d/src/persondockor.ts: med i LIVE_DOLLS, editorn och verktygen. `python ny_dealer.py <person> --steg 3` |  | gratis |  | inte mätt |
| 4 Rörelserna | De lyfta rörelserna i stilen lagda på dockan (lyft-till-docka.ts --docka) och kontrollen (lyft-kolla.ts). `python ny_dealer.py <person> --steg 4` |  | gratis |  | inte mätt |
| 5 Dockfilmen | Givens dockfilm genom livebordets kamera i nyckelutseendet, och var åttonde ruta och första och sista ur den. `python ny_dealer.py <person> --steg 5` |  | gratis |  | inte mätt |
| 6 Anropen | Stillbilderna (GPT Image 2.6) och filmen (Kling 4 med bilderna; Aleph 2 över dockfilmen med --aleph), färdiga men inte lagda, med kostnaden. Med --ankarklipp: fyra ankarbilder och tre klipp i Kling 4 med dockans film av varje steg som referensfilm. `python ny_dealer.py <person> --steg 6` |  | gratis |  | inte mätt |
| 7 Efterarbetet (--ankarklipp) | När klippen är levererade: stegen tas ur stillheten där klippet gör rörelsen (hur mycket senare än dockan mäts i klippet) och sätts ihop till hela given av klippens egna rutor, i klippens bildtakt, och dealern läggs på vårt bord med vår sko och vårt kort (lagg-pa-bord.ts). `python ny_dealer.py <person> --ankarklipp --steg 7` |  | gratis |  | inte mätt |

Flaggorna:

| Flagga | Gör | Förval | I guiden |
| --- | --- | --- | --- |
| `--stil` | vilken dealers rörelser personen spelar: kameran (Danilos, förval) eller bordet (Frasses) |  | ja |
| `--namn` | dockans namn (förval förnamnet ur mappens namn) |  | ja |
| `--utseende` | personens utseende i ord för bildmodellen |  | ja |
| `--plats` | dagens plats för filmens giv (förval 4) |  | ja |
| `--prov` | lägger filmen, rutorna och anropen i ett prov |  | ja |
| `--steg` | ett steg eller ett spann, 1-6 |  | ja |
| `--lage` | säger bara vad som finns och vad som saknas |  | ja |
| `--omgang` | en ny omgång av filmen, rutorna och anropen i en egen undermapp bredvid den förra; start- och sista bilden ur den förra när dockans rutor är desamma |  | ja |
| `--aleph` | förbered också film B, Aleph 2 över dockfilmen |  | ja |
| `--ankarklipp` | given som tre klipp mellan schemats ankare (A2.3, A2M, A3PnC1, A2.3 med kortet): Kling 4 med ankarbilderna som första och sista bild och dockans film av steget som referensfilm; steg 7 är efterarbetet |  | ja |
| `--efter-prov` | steg 7 med referensfilmerna i klippens ställe: efterarbetet prövat utan något betalt |  | nej |
| `--om-klipp` | med --ankarklipp --steg 6: bara en ny tagning av de klippen (till exempel 1 eller 1,3), med eget namn i liggaren och egen fil; steg 7 tar den senaste tagningen av varje klipp |  | nej |
| `--rygg` | med --ankarklipp: kortets rygg i dockans film och i ankarbilderna. rod: kortets riktiga röda med vit kant, som filmmodellen ritar själv, och efterarbetet ritar bara framsidan; spar (förval): spårkortets gula, som efterarbetet byter mot vår rygg |  | nej |

## Reglerna

Guiden erbjuder bara det som går ihop med de val som redan är gjorda, och säger varför resten inte går. Styrkan _i dag_ betyder att ett nytt steg kan ändra det.

### Det som krävs och det som utesluts

| Om du väljer | så | Styrka | Varför | Regel |
| --- | --- | --- | --- | --- |
| Standarddockans ansikte: ansiktsformer, käke och ögonleder | kräver Huvudet och ansiktet: Standarddockans huvud (MPFB) eller Standarddockans huvud format efter personens ansikte; Skelettet och riggen: Standarddockans skelett (MPFB med Mixamo-namn) | måste | Formerna är MPFB:s egna, gjorda för MPFB:s huvud (bygg_docka.py läser dem ur MPFB:s targets), och käken och ögonen är ben i standarddockans skelett. Meshys och Runways huvud är en yta utan former. _(kod)_ | `ansiktsformer-kraver-standarddockans-huvud` |
| Meshy gör huvudet ur närbilden av ansiktet eller Kroppens eget huvud, ur samma bild som kroppen | utesluter Ansiktets rörelser: Standarddockans ansikte: ansiktsformer, käke och ögonleder | måste | MPFB:s former byggs i standarddockans eget bygge och hör till dess huvud. Ett framställt huvud har inga rörliga delar; dit förs formerna över med steg 09 (ansiktsrigg/former-pa-framstallt-huvud). _(kod)_ | `framstallt-huvud-utesluter-ansiktsformer` |
| Standarddockans huvud (MPFB) eller Standarddockans huvud format efter personens ansikte eller Standarddockans händer (MPFB) eller Standarddockans skelett (MPFB med Mixamo-namn) eller Standarddockans vridben eller Standarddockans ansikte: ansiktsformer, käke och ögonleder eller Standarddockans neutrala grå hud, utan kläder eller Personens hud och ansikte som textur på standarddockan eller Standarddockans .blend och .glb | kräver Kroppen: Standarddockans kropp (MPFB 2), byggd efter mått | i dag | Huvudet, händerna, skelettet, vridbenen och ansiktet byggs i samma MPFB-yta och samma bygge (bygg_docka.py); inget skript tar ut dem som lösa delar. Fingerlederna följer handen (regeln dockans-fingrar-foljer-dockans-hand). _(kod)_ | `standarddockans-delar-hor-ihop` |
| Standarddockans fingerleder (MPFB) | kräver Händerna: Standarddockans händer (MPFB) eller Dockans händer insatta i personens ärm | i dag | Dockans 30 fingerleder sitter i dockans hand: i hennes egen kropp, eller med handen insatt i personens ärm (steg 14, prövat på Tomasz figur). _(prov)_ | `dockans-fingrar-foljer-dockans-hand` |
| Dockans händer insatta i personens ärm | kräver Kroppen: Meshy gör kroppen ur A-posebilden; Fingrarna och handlederna: Standarddockans fingerleder (MPFB) | i dag | Steg 14 sätter dockans hand, med dess fingerleder, i en riggad figurs skjortärm där figurens egen hand är en egen del (Version 1:s Handpar); det är prövat på en Meshy-kropp. _(prov)_ | `dockans-hand-i-armen-kraver-figur-med-arm` |
| Standarddockans kropp (MPFB 2), byggd efter mått | utesluter Skelettet och riggen: Meshy riggar kroppen (Mixamo-skelett); Fingrarna och handlederna: Eget fingersteg: 30 fingerleder efter handens form, och handleden lagad | måste | Standarddockans kropp byggs med sitt skelett, sina vikter och fingerleder; en rigg hos Meshy skulle byta bort vridbenen, ansiktsbenen och ledgränserna. _(kod)_ | `standarddockans-kropp-har-eget-skelett` |
| Standarddockans kropp (MPFB 2), byggd efter mått | kräver Underlaget: Grundens mått: en man med människans mått för sin längd eller En riktig dealers mått, mätta på film eller En persons mått, mätta på hans egen figur och bilder eller En persons mått ur sina egna bilder (SAM 3D Body och MediaPipe) eller Foton för utseendet och mått för kroppen | måste | Kroppen byggs efter mått (MATT i bygg_docka.py), inte ur en bild. _(kod)_ | `standarddockans-kropp-kraver-matt` |
| Grundens mått: en man med människans mått för sin längd eller En riktig dealers mått, mätta på film eller En persons mått, mätta på hans egen figur och bilder | kräver Kroppen: Standarddockans kropp (MPFB 2), byggd efter mått | måste | Bara en kropp som byggs efter mått kan använda måtten; Meshy och Runway tar kroppens form ur bilden. _(kod)_ | `matt-kraver-standarddockans-kropp` |
| Meshy gör kroppen ur A-posebilden eller Runway: Hunyuan 3D 3.1 Pro ur A-posebilden eller Runway: Trellis 2 ur A-posebilden eller Runway: Tripo ur bild eller Meshy gör huvudet ur närbilden av ansiktet eller En färdig hand från Meshy, satt på vid manschetten | kräver Underlaget: Foton av personen, gjorda till tre referensbilder | i dag | De görs ur referensbilderna från steg 1: Meshys delar ur var sin bild, Runways kropp i provet ur A-posebilden. _(kod)_ | `kropp-ur-bild-kraver-referenser` |
| En färdig hand från Meshy, satt på vid manschetten | kräver Kroppen: Meshy gör kroppen ur A-posebilden | i dag | Steg 3 sätter Meshys hand vid skjortärmens manschett på Meshys kropp. Att sätta den på standarddockan (new_docka.md 10.2) är tänkt, inte gjort; en kropp ur Runway har egna händer i ett stycke med armen. _(kod)_ | `meshy-hand-kraver-meshys-kropp` |
| Meshy gör huvudet ur närbilden av ansiktet | kräver Kroppen: Meshy gör kroppen ur A-posebilden | i dag | Huvudet sys fast på hudbandet ovanför skjortkragen, på Meshys kropp i steg 3. För Runways kroppar och standarddockan finns ingen väg. _(kod)_ | `meshy-huvud-kraver-kropp-med-krage` |
| En färdig hand från Meshy, satt på vid manschetten | kräver Fingrarna och handlederna: Eget fingersteg: 30 fingerleder efter handens form, och handleden lagad | måste | En påsatt hand ger en skarv vid handleden; steg 5 (fixa_handleder.py) lagar den och sätter fingerlederna i den påsatta handen. _(kod)_ | `pasatt-hand-kraver-handledsfix` |
| Kroppens eget huvud, ur samma bild som kroppen eller Kläder och hud inbakade i ytan, ur bilden | kräver Kroppen: Meshy gör kroppen ur A-posebilden eller Runway: Hunyuan 3D 3.1 Pro ur A-posebilden eller Runway: Trellis 2 ur A-posebilden eller Runway: Tripo ur bild | måste | Det är delar av en kropp som är gjord ur en bild; standarddockan har sina egna. _(kod)_ | `kroppens-egna-delar-kraver-kropp-ur-bild` |
| Meshy riggar kroppen (Mixamo-skelett) | kräver Kroppen: Meshy gör kroppen ur A-posebilden eller Meshy gör kroppen i ett stycke ur flera vyer | i dag | Steg 4 riggar den lätta kopian som steg 3 monterar av Meshys delar. Kroppen ur flera vyer riggades direkt i provet meshy-provet-20261127, men nådde inte nypet. En Runway-kropp i A-pose borde också gå att rigga hos Meshy, men det är inte prövat. _(kod)_ | `meshys-rigg-kraver-meshys-kropp` |
| Personens utseende som ny yta på vår egen docka (Meshy, och närbilden på ansiktet) | kräver Kroppen: Standarddockans kropp (MPFB 2), byggd efter mått | i dag | yta.py läser dockans hörnfärger (ANSIKTE i scen/bygg_docka.py) för ögonen, brynen, tänderna och munnen, och MPFB:s ytkarta med den tomma rutan där ögonöarna läggs. _(kod)_ | `ny-yta-kraver-var-docka` |
| Eget fingersteg: 30 fingerleder efter handens form, och handleden lagad | kräver Skelettet och riggen: Meshy riggar kroppen (Mixamo-skelett) | i dag | Steg 5 tar en riggad modell med Mixamo-ben och byter handens fingerben; standarddockan har sina egna fingerleder. _(kod)_ | `fingersteget-kraver-mixamo-rigg` |
| Dealer-GLB för spelet (steg 6) eller Två vridben i varje underarm, lagda till i exporten | kräver Skelettet och riggen: Meshy riggar kroppen (Mixamo-skelett) | i dag | Steg 6 döper om Meshys Mixamo-ben (mixamorig:, Neck) och lägger vridbenen i den riggen. _(kod)_ | `exporten-kraver-mixamo-ben` |
| Två vridben i varje underarm, lagda till i exporten | kräver Exporten: Dealer-GLB för spelet (steg 6) | måste | Vridbenen läggs till i steg 6, när dealer-GLB:n skrivs. _(kod)_ | `vridben-i-exporten-kraver-exporten` |
| Kontrollblad i vila (steg 7) eller En sittande rörelse vid ett eget bord (steg 8) | kräver Exporten: Dealer-GLB för spelet (steg 6) | i dag | Steg 7 och 8 läser den dealer-GLB som steg 6 skriver. _(kod)_ | `steg-7-och-8-kraver-dealer-glb` |
| Standarddockans former förda över till ett framställt huvud | kräver Huvudet och ansiktet: Meshy gör huvudet ur närbilden av ansiktet eller Kroppens eget huvud, ur samma bild som kroppen | måste | Det är just det alternativet: formerna förda till ett huvud som inte är standarddockans. _(bedömning)_ | `former-pa-framstallt-huvud-kraver-framstallt-huvud` |
| Personens hud och ansikte som textur på standarddockan eller Standarddockans huvud format efter personens ansikte | kräver Underlaget: Foton för utseendet och mått för kroppen eller En persons mått, mätta på hans egen figur och bilder | måste | Personens ansikte och hud kommer ur fotona (direkt, eller genom hans figur ur Version 1), och kroppen ur måtten. _(bedömning)_ | `personens-yta-pa-dockan-kraver-foton` |

### Villkor som modellen själv måste uppfylla

De prövas på modellen, inte på valen. En princip är Jakobs regel för hur valet ska göras.

**Princip: Den färdiga dockan har benen som spelet letar efter (Skelettet ovan), vilken väg den än byggs. _(kod)_** (`skelettet-ar-vart`; gäller alla vägar)

- Prövas: Steg 6 (exportera_dealer.py) och bygg_docka.py räknar upp de ben som saknas; spelet stannar med "The model has no bone …" (figure-model.ts). _(kod)_
- I dag: Version 1 och standarddockan klarar det; Tomasz saknade inget ben. _(körning)_
- Varför: Annars fungerar inga rörelser: varje rörelse är skriven för de bennamnen. _(kod)_
- Källa: AGENTS.md (Skelettet är ett); ../blackjack-dealer/dealer3d/src/figure-model.ts

**Princip: En dealer byggs på den docka vars rörelser han ska spela: på Danilos eller Frasses grund och skelett, med det som skiljer honom, inte med dockans rörelser skalade till hans egen kropp. _(Jakob)_** (`dealern-byggs-pa-dockan-han-ska-spela`; gäller alla vägar)

- Prövas: I editorn (?docka=danilo&modell=<namn>; verktyg/titta.ts skriver lage.json) står hans leder 0 mm från rörelsens punkter: fingrarFranPunkternaMm, handledFranPunktenMm, armbageFranPunktenMm och axelFranPunktenMm. _(prov)_
- I dag: ny_dealer.py bygger personens docka på Danilos eller Frasses grund med hans egna mått och lägger rörelserna på den (vägen En ny dealer ur bilder). Version 1 ger dealern sitt eget skelett, och editorn skalar honom efter armens längd: gårdagens Tomasz missade rörelsens punkter med 40 mm i fingrarna, 11–25 mm i armbågarna och 17 mm i axlarna. En färdig figur formad om led för led till Danilos skelett stod på 0 mm men fick sträckta, trasiga händer (Jakob 2026-11-27: "skitdåligt"), och den vägen är borttagen. _(Jakob)_
- Varför: Rörelserna är lyfta ur filmen och lösta för just dockans ben; en annan kropp som skalas efter armen får andra axlar, armbågar och fingrar, och greppet om kortet flyttar sig. _(bedömning)_
- Källa: Jakob 2026-11-27: "Rörelsemönster och allt ska ju komma från Danilo och Frasse. Men också den docka som är skapad utifrån dem och som vi arbetat med hela tiden är grunden för den docka av Tomasz som ska göras"

**Princip: Behåll kroppens egna händer när fingrarna är åtskilda; sätt på färdiga händer bara när de inte är det. En del byts aldrig ut när kroppen redan har den i användbart skick. _(Jakob)_** (`hander-behalls-nar-fingrarna-ar-atskilda`; gäller En färdig hand från Meshy, satt på vid manschetten)

- Prövas: Fem åtskilda fingertoppar i silhuetten av kroppens egen hand: samma prov som steg 5 redan gör på den påsatta handen (steg/05-fingrar-handleder/fingerrigg.py, tips_in_silhouette: fem toppar minst 6 grader isär, annars felet "måste visa fem särade fingrar"), kört på kroppens hand innan någon hand beställs eller sätts på. _(kod)_
- I dag: Version 1 sätter alltid på en färdig hand: steg 2 beställer handen och steg 3 sätter på den, utan att pröva kroppens egen. _(kod)_
- Varför: Lederna kommer med riggen, så det är inte därför händer sätts på: en framställd kropps händer är ofta en klump utan åtskilda fingrar, som inte går att rigga finger för finger. En påsatt hand ger en skarv vid handleden som måste lagas (steg 5, fixa_handleder.py). I provet runway-3d-20261127 hade Hunyuan-kroppen fem åtskilda fingrar. _(bedömning)_
- Källa: Jakob 2026-11-27: "Antar att vi aldrig ska klistra på händer om det redan finns i alla leder"

**Princip: Samma princip som för händerna, men här finns inget att behålla: ett framställt huvud (Meshy, Runway) är en yta utan rörliga delar. Ansiktsuttryck kräver ansiktsformer eller en ansiktsrigg. Standarddockans huvud har dem från bygget; ett framställt huvud får dem först när standarddockans former förs över (steg 09, prövat på Tomasz 2026-11-27), och då skärs munnen upp och ögonen byts mot globar. Att forma standarddockans huvud efter personens ansikte (MediaPipe ger 478 punkter i ett ansikte) är tänkt och inte prövat. _(Jakob)_** (`uttryck-kraver-former`; gäller Meshy gör huvudet ur närbilden av ansiktet, Kroppens eget huvud, ur samma bild som kroppen, Standarddockans huvud (MPFB), Standarddockans huvud format efter personens ansikte)

- Prövas: Modellen har ansiktsformer (morph targets) och ögonben: spelet läser dem när de finns (figure-model.ts, about.faceShapes). _(kod)_
- I dag: Version 1 har inga (Tomasz: inga former, inga ögonleder, ingen käke); standarddockan har 30 former, käken och ögonen. Tomasz med steg 09 (på prov, körs för hand) har 30 former, ögonleder och käke. _(körning)_
- Varför: Ett framställt huvud är en enda yta med textur: munnen är stängd i bilden det görs ur (steg 1 ber om en stängd mun) och ögonen är en del av ytan, så det finns inget som öppnas eller blinkar. _(kod)_
- Källa: Jakob 2026-11-27: "Men kanske också med ansikte om tillräckligt många datapunkter/leder finns (osäker)"

**En hel kropp i A-pose, som en lätt kopia: högst 380 000 trianglar och en fil under 100 MB. _(kod)_** (`meshys-rigg-granser`; gäller Meshy riggar kroppen (Mixamo-skelett))

- Prövas: meshy_rigg.bind stannar innan något betalas om kopian är för stor; steg 3 gör den på 180 000 trianglar (RIG_TRIANGLES i auto_avatar.py). _(kod)_
- I dag: Version 1 klarar det; Tomasz lätta kopia var 175 532 trianglar. _(körning)_
- Varför: Meshy tar riggens underlag som en data-URI med de gränserna. _(kod)_
- Källa: steg/04-rigg/meshy_rigg.py

**Handens yta är en egen del med materialet Handpar, och den har fem åtskilda fingertoppar. _(kod)_** (`fingersteget-hittar-handen-pa-materialet`; gäller Eget fingersteg: 30 fingerleder efter handens form, och handleden lagad)

- Prövas: fingrar_apose.fit_fingers stannar med "Den separata handytan saknas" när färre än 200 hörn har materialet, och fingerrigg.tips_in_silhouette med "måste visa fem särade fingrar". _(kod)_
- I dag: En påsatt hand får materialet i steg 3. _(kod)_
- Varför: Steget sätter fingerbenen efter handens egen form, och letar därför handen på materialet. _(kod)_
- Källa: steg/05-fingrar-handleder/fingrar_apose.py, fingerrigg.py

**Skjortan är tydligt icke-hudfärgad. _(kod)_** (`montering-kraver-skjorta`; gäller Meshy gör kroppen ur A-posebilden)

- Prövas: Steg 3 hittar kragen och ärmarnas kant på hudfärgen; förvalet är en mörkblå skjorta (--outfit). _(kod)_
- I dag: Förvalet i steg 1 klarar det. _(kod)_
- Varför: Halsen och handlederna skärs där huden börjar. _(kod)_
- Källa: steg/03-montering/montera_apose.py; auto_avatar.py (--outfit)

## Proven och körningarna

| Prov | Slag | Datum | Vad det sa | Jakobs ord | Var |
| --- | --- | --- | --- | --- | --- |
| `tomasz-20261126` Tomasz genom Version 1 | körning | 2026-11-26 | Steg 1–7 körda för 95 Meshy-krediter (saldo 536 till 441): 56 ben, 30 av dem fingerleder, inga vridben, inga ögonleder, ingen käke och inga ansiktsformer; steg 8 (filmen) kördes inte. | inte dömt | `output/tomasz/`, `slask/avatar-auto-pipeline/granska/tomasz/` |
| `runway-3d-20261127` Runways 3D-modeller av Tomasz bredvid vår docka | prov | 2026-11-27 | Hunyuan och Trellis gjorde Tomasz ur samma A-posebild (68 Runway-krediter): fristående modeller utan skelett, med fem åtskilda men släta fingrar och suddigt ansikte; Hunyuan-kroppen gick att sätta på Tomasz-dockans skelett i ett gratisprov. | "meshy/vår docka bäst" (kroppen och ansiktet); "Våra händer /mesy sämst (men är det påklistrat i efterhand?)"; på vårt skelett: "Oklart, men meshy/vi är nog sämt, men de e frågan om saker klistras på i efterhand elelr inte lixom" | `blackjack-dealer/assets/proofs/runway-3d-20261127/`, `blackjack-dealer/assets/proofs/runway-3d-20261127/original/` |
| `dockans-ansikte-20261127` Dockans ansikte: ögon, bryn, läppar och mun | prov | 2026-11-27 | Iris och pupill, ögonbryn, läppar och en mörk mun med tänder på mannen och kvinnan, byggda som provmodeller; blicken, blinkningen, leendet och brynen visade i spelets vy. | inte dömt | `blackjack-dealer/assets/proofs/dockans-ansikte-20261127/` |
| `dealerns-handled-20261127` Ren handled på Meshy-dockan | prov | 2026-11-27 | Tomasz handled rättad gratis i steg 5 (tomasz_handled): vidgningen räknas tillbaka och handleden går drygt en centimeter in i ärmen; kvar är en mörk krage vid manschetten när handen böjs mycket, eftersom handledens led sitter inne i ärmen. Underarmarna fick två vridben var. | Inte bra (2026-11-27): "Men om vi har leder innan i dockan varöfr lägga på ett lager till. Vinkeln här är lite fel på hur armen grå från tröjjann ckså" | `blackjack-dealer/assets/proofs/dealerns-handled-20261127/` |
| `kling-tider-20261127` Tider i texten, och en docka som liknar Tomasz | prov | 2026-11-27 | Tomasz-dockan spelade standarddockans giv i editorn som förlaga till Kling 4; filmen blev inte annorlunda än med standarddockan. | inte dömt | `blackjack-dealer/assets/proofs/kling-tider-20261127/` |
| `tomasz-runda-20261126` Tomasz som dealer: dockans film omgjord till honom | prov | 2026-11-26 | Dockans giv omgjord till Tomasz med Aleph 2 och med WAN 3, lagd på vårt bord; hela provet kostade 1 758 Runway-krediter. | Inte bra (hela provet, 2026-11-26): rörelserna är stela, och Aleph kopierar dockans. | `blackjack-dealer/assets/proofs/tomasz-runda-20261126/` |
| `hander-hunyuan-mot-meshy-20261127` Händerna i rörelse: Hunyuan-kroppen i ett stycke mot Meshy-dockans påsatta händer | prov | 2026-11-27 | Hunyuan-kroppen fick Tomasz Meshy-huvud, Tomasz-dockans skelett och en egen fingerrigg (gratis, för hand; vägen är borttagen): fingrarna böjer sig nu in mot handflatan. I rörelse vann Hunyuan handleden (ingen skarv, ingen krage) och den knutna handen, och vid bordet i spelets vy, där Meshy-dockans manschetter blir mörka krås; Meshy-dockan vann detaljerna på nära håll (naglar, knogar, ådror) och nypet. | inte dömt |  |
| `tomasz-ansikte-20261127` Ett ansikte som rör sig på Tomasz Meshy-huvud | prov | 2026-11-27 | Standarddockans 30 ansiktsformer fördes över till Tomasz Meshy-huvud (steg 09, gratis): han blinkar, sänker locken, flyttar blicken, ler, lyfter och sänker brynen och öppnar munnen, och likheten i vila står kvar. Ögonen är en glob per öga på nya ögonleder med hans egen målade iris, och munnen är uppskuren med en mörk munhåla. Inga tänder, och käkleden rör hakan svagt. | inte dömt | `assets/docka/standarddocka_tomasz_ansikte.glb` |
| `danilo-frasse-kroppar-20261127` Danilo och Frasse: två dockor med de mätta måtten, bredvid mannen | prov | 2026-11-27 | scen/bygg_docka.py --kon danilo och --kon frasse: mannens kropp med axellederna och huvudets höjd ur mätningen på film, vårt eget ansikte (81 ben, 30 ansiktsformer). Axlarna 2 och 3 cm smalare än mannens, Frasses huvud lite mindre, Danilo lite smalare om midjan och höften; halsen, armarna och händerna är mannens. | Bra (hela provet, 2026-11-27) | `blackjack-dealer/assets/proofs/danilo-frasse-kroppar-20261127/`, `assets/docka/standarddocka_danilo.glb`, `assets/docka/standarddocka_frasse.glb` |
| `meshy-provet-20261127` Meshy-provet: kroppen ur flera vyer, Meshys rigg på den, och Tomasz utseende som ny yta på Danilos docka | prov | 2026-11-27 | 48 Meshy-krediter: vyerna 3, kroppen ur två vyer 30, riggen 5 och den nya ytan 10. Kroppen ur flera vyer duger inte som dealer: de fyra fingrarna är ihopvuxna i båda händerna (steg 05:s prov hittar inte fem fingrar) och ansiktet är utsmetat, med en kal rand över hjässan; kläderna är rena fram och bak. Meshys rigg på den (66 ben, fyra leder per finger) når inte nypet (tummens och pekfingrets toppar 33–47 mm isär, Tomasz-dockans 12) och river upp huden över knogarna i en knuten hand. Den nya ytan på Danilos egen docka behåller hans skelett, fingrar, vridben och 30 ansiktsformer: Tomasz hud, hår och kläder målade på Danilos form. Meshys ansikte blev suddigt med vita ögon; närbilden av ansiktet lagd ovanpå (gratis) gav skarpa drag och blå ögon, och den sparades. | inte dömt av honom; domaren: Inte bra (den nya ytan på Danilos docka; domaren, en oberoende granskare, inte Jakob, 2026-11-27): "en målad docka i en tajt dräkt", Danilos smala kropp där Tomasz är bred och "Danilos huvud med hans hud målad på". Det som gör dockan till honom är i den ordningen huvudets form, kroppens bredd och sist skjortan som egen del. |  |
| `tomasz-dockan-pa-hans-matt-20261127` Tomasz-dockan på hans egna mått, bredvid Danilos | prov | 2026-11-27 | scen/bygg_docka.py --kon tomasz_matt (gratis): mannens kropp med Tomasz mått, mätta på hans Meshy-figur och bilder med verktyg/mat_figur.py bredvid mannen, kläder och hår avdragna. Mot Danilo: axellederna 39 cm isär mot 35,7, bröstet 101 cm mot 91 i omkrets, midjan 86 mot 72 (målet 93 nåddes inte), halsen 40 mot 38, huvudet 24,1 cm högt mot 22,8 och 15,8 brett mot 14,7, käken bredare; armarna, händerna och bålens längd lika (Tomasz mättes inom osäkerheten). Med Danilos lutning når han samma handleder (högst 8 mm skillnad), från samma sits; magen har 5,7 cm till kanten mot Danilos 9,0. Steg 13 (gratis) gav dockans huvud hans ansiktes form med ansiktsformerna kvar: blinkningen sluter ögat och munnen öppnar och stänger som förut; ögonspringan, öronen och håret är dockans. | inte dömt | `blackjack-dealer/assets/proofs/tomasz-dockan-pa-hans-matt-20261127/`, `assets/docka/standarddocka_tomasz_matt.glb`, `assets/docka/standarddocka_tomasz_matt_form.glb` |
| `tomasz-med-dockans-hander-20261127` Tomasz figur med dockans händer insatta i ärmen | prov | 2026-11-27 | Steg 14 (gratis): Tomasz figur ur Version 1 fick Danilos händer i manschetten. Den knöt handen som Danilos och höll kortet med topparna 0,4 mm isär; handleden 8 mm utanför manschetten, inga hörn genom ärmen vid böjning och vridning. I Danilos giv hamnar fingrarna högst 11 mm från rörelsens punkter (förut 32–41), armbågarna 5–21 mm och axlarna 16 mm, eftersom det är hans kropp i Danilos rörelse. | inte dömt | `blackjack-dealer/assets/proofs/tomasz-med-dockans-hander-20261127/`, `assets/docka/standarddocka_tomasz_dockhander.glb` |
| `givar-sju-platser-20261126` Standarddockans giv till alla sju platser | prov | 2026-11-26 | Standarddockans egna givar till plats 1–7, för mannen och kvinnan. | "Nja … I övrigt bra!" | `blackjack-dealer/assets/proofs/givar-sju-platser-20261126/` |
| `kenji-ny-dealer-ur-bilder-20261127` Kenji, en ny dealer ur tre bilder | prov | 2026-11-27 | Kenji mätt ur sina tre bilder (SAM 3D Body och MediaPipe): kroppen inom mätningens osäkerhet från Danilos, huvudet större (hakan till hjässan 0,241 m mot 0,228, bredden 0,161 mot 0,153). Dockan byggd på Danilos med hans huvud, Danilos lyfta rörelser lagda på den, och givens dockfilm i nyckelfärgerna med anropen färdiga men inte lagda. | Inte bra (hela provet, filmen 06 och dockfilmen 03, 2026-11-27); om dockfilmen: "Kn vara bra.." | `blackjack-dealer/assets/proofs/kenji-ny-dealer-ur-bilder-20261127/`, `blackjack-dealer/assets/proofs/kenji-ny-dealer-ur-bilder-20261127/original/`, `personer/kenji-nakamura.json` |

## Priserna

Ett pris gäller bara de inställningar som står bredvid; ändras inställningen i koden blir `--kolla` röd.

| Vad | Hos | Krediter | Gäller när | Källa |
| --- | --- | --- | --- | --- |
| bild till 3D med meshy-7.1 och 4K-textur | Meshy | 30 _(körning)_ | `meshy_enbild.SETTINGS` ai_model = "meshy-7.1", should_texture = true, texture_resolution = "4k"; `auto_avatar.BODY_SETTINGS` ai_model = "meshy-7.1", should_texture = true, texture_resolution = "4k"; `auto_avatar.PART_SETTINGS` ai_model = "meshy-7.1", should_texture = true, texture_resolution = "4k" | Tomasz kvitton (consumed_credits 30 per del, output/tomasz/02-meshy-delar/<del>/korning.json); Meshys prislista 2026-10-12: 30 med 2K- eller 4K-textur, 35 med 8K |
| riggning (Mixamo-mall, med fingrar) | Meshy | 5 _(körning)_ | `meshy_rigg.SETTINGS` animation_type = "biped", skeleton_template = "mixamo", include_fingers = true | Tomasz kvitto (consumed_credits 5, output/tomasz/04-rigg/riggjobb/riggjobb.json) |

## Så kontrolleras filen

`vagar.py --kolla` är röd när något av det här inte stämmer:

- varje skript, mapp och datafil som `vagar.json` pekar på finns;
- Version 1 är de steg `auto_avatar.py` kör: nummer, mappar och nycklar, vad varje steg anropar och vilka hjälpskript de importerar, vilka steg som betalar och hos vem, kvittona och flaggorna med sina förval;
- priserna gäller de inställningar koden har, och vägarnas kostnad är summan av stegen och valen;
- standarddockans ansiktsformer, ansiktsben, längder och flaggor är de i `scen/bygg_docka.py`;
- benen spelet kräver är de under Skelettet;
- Danilo och Frasse finns i mätningen `live-bj/data/uppsattning.json`;
- ingen regel säger emot en färdig väg, inte heller när en del som får bytas byts;
- VAGAR.md är det `vagar.py` skriver ur `vagar.json`.

Proven och körningarna ligger inte i Git; saknas de på en dator nämns det bara.
