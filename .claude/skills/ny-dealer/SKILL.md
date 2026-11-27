---
name: ny-dealer
description: Använd i casino när en ny dealer ska göras ur bilder av en person med avatar-auto-pipeline/ny_dealer.py - måtten ur bilderna, dockan på Danilos eller Frasses grund, de lyfta rörelserna, dockfilmen och rutorna ur den, de betalda anropen till Runway (stillbilder och Kling 4, Aleph 2), en ny omgång, efterarbetet, provet och domen före Jakob - eller när frågan är hur långt en ny dealer har kommit (--lage).
---

# En ny dealer ur bilder

`ny_dealer.py` i `avatar-auto-pipeline/` gör allt som är gratis, från personens bilder till färdiga anrop hos Runway.
Läs skriptets huvud; mapparna och kommandona står i `avatar-auto-pipeline/README-SV.md`. Sökvägar räknas från
casino-roten. Kenji Nakamura är den första personen (proven `kenji-ny-dealer-ur-bilder-20261127`, de tre första
omgångerna; `kenji-tre-klipp-mellan-ankarbilder-20261127`, den fjärde, gjord med `--ankarklipp`; och
`kenji-rod-rygg-tre-klipp-20261127`, den femte, med `--ankarklipp --rygg rod` efter att dockans handbyte hade rättats).

## Före

- Personens tre bilder i `avatar-auto-pipeline/input/<person>/` (`1-portratt`, `2-helfigur`, `3-halvfigur`). Personerna
  där är framställda; ett foto av en riktig person går in bara på Jakobs ord (`avatar-auto-pipeline/AGENTS.md`).
- Blender med MPFB 2, FFmpeg, Node, SAM 3D Body i sin egen miljö (steg 15:s huvud) och MediaPipe-miljön
  `blackjack-dealer/tools/python/.venv`, som skriptet körs med från `avatar-auto-pipeline/`:

  ```text
  ..\blackjack-dealer\tools\python\.venv\Scripts\python.exe -I ny_dealer.py <person> [--stil kameran|bordet] [--utseende "<på engelska>"] [--prov <provmapp>] [--aleph]
  ```

## Stegen, gratis och på datorn

`--steg 3-6` börjar om efter dockan och `--steg 5` filmar om. `--lage` säger bara vad som finns, vad som saknas och vad
nästa betalda steg kostar.

1. **Måtten** ur bilderna (steg 15: SAM 3D Body och MediaPipes kropp, handens 21 punkter och ansiktsnätet) till
   `avatar-auto-pipeline/personer/<person>.json`, bara tal, och en ritning av mätningen över bilderna. SAM körs bara när
   dess svar saknas i `output/<person>/15-matt-ur-bilder/`.
2. **Dockan,** byggd på dockan för den dealer vars rörelser personen spelar (`--stil kameran`, förval: Danilos;
   `bordet`: Frasses), med bara det som skiljer mer än mätningens osäkerhet: Blender utan fönster,
   `scen/bygg_docka.py --kon <docka>`, under låset `slask/blackjack-dealer/gpu-och-headless.lock`.
3. **Systemet:** dockan mätt på sin modell och skriven i `blackjack-dealer/dealer3d/src/persondockor.ts`. Då är den med
   bland dockorna (`LIVE_DOLLS`), i editorn och i verktygen (`titta.ts --docka <docka>`).
4. **Rörelserna:** de lyfta rörelserna i dockans stil (`blackjack-dealer/dealer3d/tools/lyft-till-docka.ts --docka
   <docka>`, till `dealer3d/data/lyft-<docka>-*.json` och `ankare-*-<docka>.json`) och kontrollen (`lyft-kolla.ts`,
   svaret i `output/<person>/lyft-kolla.txt`).
5. **Dockfilmen:** givens rörelse (`lyft-<docka>-p<plats>`; `--plats`, förval dagens plats 4) filmad med editorn
   (`standarddocka/verktyg/titta.ts`) genom livebordets kamera i nyckelutseendet, och rutorna ur den: första, sista och
   rutorna vid rörelsens egna händelser, aldrig två där dockan står i samma ställning. Varje ruta får en text om vad
   dockan gör och hur kortet står, ur rörelsens tal (`dockans-rutor.json`).
6. **Anropen,** färdiga men inte lagda, i `anrop/`, med kostnaden och ordningen i `anrop/kostnad.json`: stillbilderna
   (GPT Image 2.6 Sunburst; startbilden ur dockans första ruta och personens tre bilder, sista bilden och mellanbilderna
   som ändringar av den, och efter landningen som ändringar av sista bilden) och film A, Kling 4 med första bild,
   mellanbilderna och sista bild. Med `--aleph` också film B, Aleph 2 över dockfilmen med startbilden som styrbild.

### Given som tre klipp mellan ankare (`--ankarklipp`)

Nästa sätt efter Jakobs Inte bra på Kenjis filmer ("Tempot är konstigt", "Fingrarna når inte kortet"): takten och
rörelsen ur dockan redan när filmen görs, ansiktet och händerna ur bilderna. Given går mellan rörelseschemats ankare:
A2.3 → A2M (handbytet, `made.times.meet`), A2M → A3PnC1 (kortet har landat och handen ligger kvar, `made.times.ligger`),
A3PnC1 → A2.3 med kortet. Klippen möts i ankarbilderna.

5. **Ankarrutorna och referensfilmerna:** givens dockfilm, de fyra ankarrutorna med text ur rörelsens tal (kortets sida
   mot kameran, höjd, lutning, vilken hand som håller det och om den är en näve med tummen på kortet), och dockans film
   av varje steg (`ref-<nr>-<steg>.mp4`), fylld till 3 s med stillhet i ankarna före och efter (Kling 4 tar en
   referensfilm på 3–31 s, 24–60 bilder/s, minst 700 bildpunkter per sida).
6. **Anropen:** ankarbilderna en gång per person och kamera (A2.3 ur dockans ruta och personens bilder; A2.3 med kortet
   som en ändring av A2.3 där dockans kort ligger; A3PnC1 som en ändring av A2.3 med kortet, så att kortet är samma
   bildpunkter och kortplatsen syns i bilden som ändras; A2M som en ändring av A2.3), och tre klipp i Kling 4
   (`/v1/image_to_video`, `promptImage` med `first` och `last`, `referenceVideos` med stegets referensfilm, 3 s,
   `auto_1080p`). En ankarbild som redan är gjord för samma dockruta i en tidigare omgång tas därifrån. `kostnad.json`
   säger per klipp vilka rutor av det levererade klippet som är själva steget.
7. **Efterarbetet** (`--steg 7`, gratis, när klippen ligger i `ut/klipp-<nr>.mp4`): stegen tas ur klippens stillhet,
   där klippet gör rörelsen. Filmmodellen gör den något senare än referensfilmen (Kling 4 0,06–0,08 s, 2026-11-27), så
   skriptet mäter förskjutningen i varje klipp (rörelsen ruta för ruta mot referensfilmens) och säger hur lik rörelsen
   är; under 0,85 varnar det, och klippet ska ses på innan det används (klippen som höll hade 0,96–0,98, och klippet
   där Kling ritade ett extra kort på filten 0,73).
   - **Filmens rutor är klippens egna:** inga upprepas och inga räknas fram. Filmen går i klippens bildtakt (Kling 4:
     24 bilder/s, 53 rutor för dockans 66), och filmruta j är dockans ruta j × 1,25. Att lägga om till 30 bilder/s
     genom att upprepa var femte ruta fällde domaren som "ett jämnt hack sex gånger i sekunden". Säg alltid vilken
     sorts ruta ett tal är; provens bilder märks med dockans ruta, som Spegla och domarna räknar i.
   - Stegen sätts ihop i grönt (`efter/given-i-gront.mp4`), och dealern läggs på vårt bord, hela given som en tagning
     (`lagg-pa-bord.ts` med plattorna, `efter/takt.json` som säger vilken dockruta varje filmruta är, och skon mätt i
     handbytets ruta, där ingen hand är vid den): `efter/given-pa-bordet.mp4`.
   - `--efter-prov` prövar det med referensfilmerna i klippens ställe.

**Kortets rygg, `--rygg rod`:** med förvalet (`spar`) har kortet spårkortets gula rygg i dockans film och i
ankarbilderna, och efterarbetet byter den mot vår. Det gick inte rent där hand och kort är utsmetade av farten, ur skon
till bytet (Kenjis fjärde omgång, dömd fyra gånger). Med `--rygg rod` är ryggen kortets riktiga röda med vit kant, så
att filmmodellen ritar ryggen själv, och efterarbetet ritar bara framsidan, som bär valören (`lagg-pa-bord.ts
--rygg-ur-filmen`). Valet görs i steg 5 och står i omgångens `dockans-rutor.json`; steg 6 och 7 läser det där.

**En ny tagning av ett klipp, `--om-klipp 1`** (med `--steg 6`): när ett levererat klipp inte håller skrivs bara det
klippets anrop om, som `anrop/klipp-<nr>-t<n>.json` med eget namn i liggaren och egen fil (`ut/klipp-<nr>-t<n>.mp4`).
Ankarbilderna och de andra klippen rörs inte, och steg 7 tar den senaste tagningen av varje klipp. Den underkända
tagningens fil tas bort av den som gjorde den (liggaren har kvar vad den kostade). Se på varje levererat klipp innan
efterarbetet: steg 7 säger hur lik klippets rörelse är dockans, och ett tal långt under de andra (0,73 mot 0,96–0,97)
var ett påhittat föremål i bilden.

**Texten säger bara det som syns.** Klippets och ankarbildens text beskriver bara de sidor av kortet som kameran ser
där (ur omgångens rörelse), och säger att kortet som ges är det enda utanför skon. En beskrivning av framsidan i ett
klipp där bara ryggen syns fick Kling 4 att rita ett stort vitt kort på filten genom hela klippet.

Utan `--prov` hamnar filmen, rutorna och anropen i `avatar-auto-pipeline/output/<person>/16-dockfilm/`, med
`--prov <provmapp>` i `blackjack-dealer/assets/proofs/<provmapp>/original/`. `--utseende` är personens utseende i ord för
bildmodellen och står sedan kvar i personfilen.

## Det betalda

- **Bara huvudagenten lägger anropen,** inom fullmakten (`blackjack-dealer/AGENTS.md`, "Det som skyddar Jakob här"; taken i
  `blackjack-dealer/data/order-policy.json`). Större bara med Jakobs ja. En underagent förbereder och rapporterar
  kostnaden.
- Från `blackjack-dealer/`, i ordningen i `kostnad.json`: `node tools/runway-api.ts place <anrop.json>`, sedan
  `node tools/runway-api.ts collect <anropets namn> <fil>`. Varje bild sparas i omgångens `ut/` med det namn nästa anrop
  väntar sig (`start.png`, `sista.png`, `mellan-NN.png`), och för film A skalad till 1728 × 972 som `k-start.png`,
  `k-NN.png` och `k-sista.png`. Med `--ankarklipp` säger varje anrop själv var resultatet sparas (`"ut"`), och
  ankarbilderna skalas likadant till `k-<namn>.png` bredvid. `--lage` säger hur många anrop som har sitt resultat på
  plats och vad som är kvar att lägga.
- Vad modellerna kan och kostar, och vad proven har visat: skillen `runway` (trettonde provet är Kenjis).

## Efterarbetet

- **Filmen i dockans takt:** `node standarddocka/verktyg/i-dockans-takt.ts <film.mp4> --docka <rörelse.json> --bild
  <stillbild.png>@<dockruta> … --takt <takt.json> --ut <film.mp4>`. Kling lägger bilderna i sin egen takt; verktyget
  parar varje bild med sin dockruta.
- **Dealern på vårt bord:** `node standarddocka/verktyg/lagg-pa-bord.ts <grön film> --platta
  standarddocka/klipp/platta-bord-ensamt.png --ut <film> --egen-sko standarddocka/klipp/platta-bord-med-sko.png --docka
  <rörelse.json> --takt <takt.json>`: vår sko och kortlek, och vårt eget kort ritat ur dockans tal. Verktygens huvud
  säger resten, också hur plattorna görs om.

## En ny omgång

`--omgang v2` lägger filmen, rutorna och anropen i en egen undermapp bredvid den förra, som aldrig skrivs över, och
anropen får omgångens namn. Är en bild redan gjord för samma dockruta i en tidigare omgång (bild mot bild, färre än
0,05 % av bildpunkterna skiljer) tas den därifrån och betalas inte igen, var för sig; `kostnad.json` säger vad jämförelsen
fann. En ruta där kortet i handen står med kanten mot kameran tas inte som stillbild (den närmaste där kortets yta syns tas
i stället). Dockans fel blir filmens: ett fel i rörelsen
rättas i lyftet (`lyft-till-docka.ts`), och sedan görs en ny omgång med `--steg 4-6 --omgang <nästa>`.

## Provet och domen

- Provet är `blackjack-dealer/assets/proofs/<provmapp>/`: `proof.json` (`area: "avatarer"`, `title`, `description`, en
  etikett per fil i `labels`), de bilder och filmer han ska se, med en stillbild bredvid varje film, och originalen i
  `original/` (skillen `visa-for-jakob`).
- Det som visas för honom döms först av en oberoende domare (skillen `doma`), och domen står i `proof.json` som
  domarens, inte hans. Ett Inte bra går tillbaka och görs om i en ny omgång.
- En person blir dealer i spelet först när Jakob har dömt hans filmer. Den äldre vägen till en dealer i klippbanken
  (`blackjack-dealer/data/dealers.json`, `tools/produce.ts`, beställningar per steg) finns kvar i koden men har ingen
  dealer.
