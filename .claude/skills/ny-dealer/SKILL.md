---
name: ny-dealer
description: Använd i casino när en ny dealer ska göras ur bilder av en person med avatar-auto-pipeline/ny_dealer.py - måtten ur bilderna, dockan på Danilos eller Frasses grund, de lyfta rörelserna, dockfilmen och rutorna ur den, de betalda anropen till Runway (stillbilder och Kling 4, Aleph 2), en ny omgång, efterarbetet, provet och domen före Jakob - eller när frågan är hur långt en ny dealer har kommit (--lage).
---

# En ny dealer ur bilder

`ny_dealer.py` i `avatar-auto-pipeline/` gör allt som är gratis, från personens bilder till färdiga anrop hos Runway.
Läs skriptets huvud; mapparna och kommandona står i `avatar-auto-pipeline/README-SV.md`. Sökvägar räknas från
casino-roten. Kenji Nakamura är den första personen (proven `kenji-*-20261127`) och Amara Okonkwo den andra
(`amara-ny-dealer-20261128`). Läget står i `blackjack-dealer/STATUS.md`.

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

1. **Måtten** ur bilderna (steg 15: SAM 3D Body och MediaPipes kropp, händer och ansiktsnät) till
   `avatar-auto-pipeline/personer/<person>.json`, bara tal, och en ritning av mätningen. SAM körs bara när dess svar
   saknas i `output/<person>/15-matt-ur-bilder/`.
2. **Dockan,** byggd på dockan för den dealer vars rörelser personen spelar (`--stil kameran`, förval: Danilos;
   `bordet`: Frasses), med bara det som skiljer mer än mätningens osäkerhet: `scen/bygg_docka.py --kon <docka>` i
   Blender utan fönster, under låset `slask/blackjack-dealer/gpu-och-headless.lock`.
3. **Systemet:** dockan mätt på sin modell och skriven i `blackjack-dealer/dealer3d/src/persondockor.ts`, så att den är
   med bland dockorna (`LIVE_DOLLS`), i editorn och i verktygen (`titta.ts --docka <docka>`).
4. **Rörelserna:** de lyfta rörelserna i dockans stil (`lyft-till-docka.ts --docka <docka>`) och kontrollen
   (`lyft-kolla.ts`, svaret i `output/<person>/lyft-kolla.txt`).
5. **Dockfilmen:** givens rörelse (`lyft-<docka>-p<plats>`; `--plats`, förval dagens plats 4; alla sju har en lyft giv)
   filmad genom livebordets kamera i nyckelutseendet, och rutorna ur den: första, sista och rutorna vid rörelsens egna
   händelser, aldrig två där dockan står i samma ställning. Varje ruta får en text om vad dockan gör och hur kortet
   står, ur rörelsens tal (`dockans-rutor.json`).
6. **Anropen,** färdiga men inte lagda, i `anrop/`, med kostnaden och ordningen i `anrop/kostnad.json`: stillbilderna
   (GPT Image 2.6 Sunburst; startbilden ur dockans första ruta och personens bilder, sista bilden och mellanbilderna som
   ändringar av den, och efter landningen som ändringar av sista bilden) och film A, Kling 4 med första bild,
   mellanbilderna och sista bild. Med `--aleph` också film B, Aleph 2 över dockfilmen med startbilden som styrbild.

Utan `--prov` hamnar filmen, rutorna och anropen i `avatar-auto-pipeline/output/<person>/16-dockfilm/`, med
`--prov <provmapp>` i `blackjack-dealer/assets/proofs/<provmapp>/original/`.

### Given som tre klipp mellan ankare (`--ankarklipp`)

Takten och rörelsen kommer ur dockan redan när filmen görs, ansiktet och händerna ur bilderna. Given går mellan
rörelseschemats ankare: A2.3 → A2M (handbytet, `made.times.meet`), A2M → A3PnC1 (kortet ligger och handen ligger kvar,
`made.times.ligger`), A3PnC1 → A2.3 med kortet. Klippen möts i ankarbilderna.

5. **Ankarrutorna och referensfilmerna:** de fyra ankarrutorna med text ur rörelsens tal, och dockans film av varje
   steg (`ref-<nr>-<steg>.mp4`), fylld till 3 s med stillhet i ankarna (Kling 4:s kortaste referensfilm).
6. **Anropen:** ankarbilderna en gång per person och kamera (A2.3 ur dockans ruta och personens bilder, de andra som
   ändringar av den, så att kortet är samma bildpunkter), och tre klipp i Kling 4 med ankarbilderna som första och
   sista bild och stegets referensfilm. `kostnad.json` säger per klipp vilka rutor som är själva steget.
7. **Efterarbetet** (`--steg 7`, gratis, när klippen ligger i `ut/klipp-<nr>.mp4`): stegen tas ur klippens stillhet.
   Filmmodellen gör rörelsen något senare än referensfilmen (Kling 4 0,06–0,08 s), så skriptet mäter förskjutningen i
   varje klipp och hur lik rörelsen är; under 0,85 varnar det, och klippet ska ses på innan det används (klippen som höll
   hade 0,96–0,98; ett klipp där Kling ritade ett extra kort på filten 0,73).
   - **Filmens rutor är klippens egna:** inga upprepas och inga räknas fram. Filmen går i klippens bildtakt (Kling 4: 24
     bilder/s, 53 rutor för dockans 66), och filmruta j är dockans ruta j × 1,25. Att lägga om till 30 bilder/s genom
     att upprepa var femte ruta fällde domaren som "ett jämnt hack sex gånger i sekunden". Säg alltid vilken sorts ruta
     ett tal är; provens bilder märks med dockans ruta, som Spegla och domarna räknar i.
   - Stegen sätts ihop i grönt (`efter/given-i-gront.mp4`) och dealern läggs på vårt bord som en tagning
     (`lagg-pa-bord.ts` med `efter/takt.json`, och skon mätt i handbytets ruta, där ingen hand är vid den):
     `efter/given-pa-bordet.mp4`. `--efter-prov` prövar det med referensfilmerna i klippens ställe.

**Kortets rygg, `--rygg rod`:** med förvalet `spar` har kortet spårkortets gula rygg i dockans film och i ankarbilderna,
och efterarbetet byter den mot vår; det gick inte rent där hand och kort är utsmetade av farten. Med `--rygg rod` är
ryggen den riktiga röda med vit kant, filmmodellen ritar den själv, och efterarbetet ritar bara framsidan
(`lagg-pa-bord.ts --rygg-ur-filmen`). Valet görs i steg 5 och står i omgångens `dockans-rutor.json`.

**En ny tagning av ett klipp, `--om-klipp 1`** (med `--steg 6`): bara det klippets anrop skrivs om, som
`anrop/klipp-<nr>-t<n>.json` med eget namn i liggaren och egen fil, och steg 7 tar den senaste tagningen. Den underkända
tagningens fil tas bort av den som gjorde den (liggaren har kvar vad den kostade).

**Texten säger bara det som syns:** klippets och ankarbildens text beskriver bara de sidor av kortet som kameran ser
där, och säger att kortet som ges är det enda utanför skon. En beskrivning av framsidan i ett klipp där bara ryggen syns
fick Kling 4 att rita ett stort vitt kort på filten genom hela klippet.

## Utseendet och namnet

- `--utseende` är personens utseende i ord för bildmodellen; det sparas i personfilen och står kvar. Det säger också vem
  personen är: börjar det med "a woman …" skrivs texterna till modellerna om henne, med "a man …" om honom, och utan
  det utan kön (`om_personen`). Läs det färdiga anropet innan det läggs.
- Kläder i nyckelfärgens gröna går inte att skära ut: säg då andra kläder i `--utseende` ("… wearing … instead of the
  green top in the photos"). Amaras anrop klär henne i en dealers uniform (vit skjorta, svart väst, fluga); om alla
  dealrar ska bära den är Jakobs att säga.
- Dockan heter efter förnamnet; två personer med samma förnamn skiljs med `--namn`.

## Det betalda

- **Bara huvudagenten lägger anropen,** inom fullmakten (`blackjack-dealer/AGENTS.md`; taken i
  `blackjack-dealer/data/order-policy.json`), och större bara med Jakobs ja. En underagent förbereder och rapporterar
  kostnaden. I en chatt där han inte själv har sagt ja till att betala stoppar behörighetskontrollen anropet, också
  inom fullmakten (2026-11-28): förbered anropen, säg kostnaden och vänta på hans ord.
- Från `blackjack-dealer/`, i ordningen i `kostnad.json`: `node tools/runway-api.ts place <anrop.json>`, sedan
  `node tools/runway-api.ts collect <anropets namn> <fil>`, med resultatet i omgångens `ut/` under det namn nästa anrop
  väntar sig (`kostnad.json` och, med `--ankarklipp`, varje anrops `ut` säger det). `--lage` säger vad som har sitt
  resultat på plats och vad som är kvar att lägga.
- Vad modellerna kan och kostar, och vad proven har visat: skillen `runway`.

## Efterarbetet

- **Filmen i dockans takt:** `node standarddocka/verktyg/i-dockans-takt.ts <film.mp4> --docka <rörelse.json> --bild
  <stillbild.png>@<dockruta> … --takt <takt.json> --ut <film.mp4>`: Kling lägger bilderna i sin egen takt, och
  verktyget parar varje bild med sin dockruta.
- **Dealern på vårt bord:** `node standarddocka/verktyg/lagg-pa-bord.ts <grön film> --platta
  standarddocka/klipp/platta-bord-ensamt.png --ut <film> --egen-sko standarddocka/klipp/platta-bord-med-sko.png --docka
  <rörelse.json> --takt <takt.json>`: vår sko och kortlek, och vårt eget kort ritat ur dockans tal. Verktygens huvud
  säger resten, också hur plattorna görs om.

## En ny omgång

`--omgang v2` lägger filmen, rutorna och anropen i en egen undermapp bredvid den förra, som aldrig skrivs över. En bild
som redan är gjord för samma dockruta i en tidigare omgång (färre än 0,05 % av bildpunkterna skiljer) tas därifrån och
betalas inte igen; `kostnad.json` säger vad jämförelsen fann. En ruta där kortet i handen står med kanten mot kameran
tas inte som stillbild (den närmaste där kortets yta syns tas i stället). Dockans fel blir filmens: ett fel i rörelsen
rättas i lyftet (`lyft-till-docka.ts`), och sedan görs en ny omgång med `--steg 4-6 --omgang <nästa>`.

## Provet och domen

- Provet är `blackjack-dealer/assets/proofs/<provmapp>/`: `proof.json` (`area: "avatarer"`, `title`, `description`, en
  etikett per fil i `labels`), de bilder och filmer han ska se, med en stillbild bredvid varje film, och originalen i
  `original/` (skillen `visa-for-jakob`).
- Det som visas för honom döms först av en oberoende domare (skillen `doma`), och domen står i `proof.json` som
  domarens, inte hans. Ett Inte bra går tillbaka och görs om i en ny omgång.
- En person blir dealer i spelet först när Jakob har dömt hans filmer. Den äldre vägen till en dealer i klippbanken
  (`blackjack-dealer/data/dealers.json`, `tools/produce.ts`) finns kvar i koden men har ingen dealer.
