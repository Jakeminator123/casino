---
name: ny-dealer
description: Använd i casino när en ny dealer ska göras ur bilder av en person med avatar-auto-pipeline/ny_dealer.py - måtten ur bilderna, dockan på Danilos eller Frasses grund, de lyfta rörelserna, dockfilmen och rutorna ur den, de betalda anropen till Runway (stillbilder och Kling 4, Aleph 2), en ny omgång, efterarbetet, provet och domen före Jakob - eller när frågan är hur långt en ny dealer har kommit (--lage).
---

# En ny dealer ur bilder

`ny_dealer.py` i `avatar-auto-pipeline/` gör allt som är gratis, från personens bilder till färdiga anrop hos Runway.
Läs skriptets huvud; mapparna och kommandona står i `avatar-auto-pipeline/README-SV.md`. Sökvägar räknas från
casino-roten. Kenji Nakamura är den första personen (provet `kenji-ny-dealer-ur-bilder-20261127`).

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
  `k-NN.png` och `k-sista.png`.
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
anropen får omgångens namn. Är dockans första och sista ruta desamma som i den förra omgången tas start- och sista bilden
därifrån och betalas inte igen; `kostnad.json` säger vad jämförelsen fann. Dockans fel blir filmens: ett fel i rörelsen
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
