---
name: granska-rorelse
description: Använd i standarddocka när en av dockornas lyfta rörelser ska granskas eller rättas - en giv till en plats, delarna vid handbytet, vägen till skon och hem, en väntan - om fingrarna och kortet hänger ihop, om kortet rör sig trovärdigt, om händer, armar, huvud och blick följer den riktiga dealern och Jakobs domar. Gäller också när flera agenter granskar var sin rörelse samtidigt. Verktygen lyft-kolla.ts och lyft-till-docka.ts i blackjack-dealer/dealer3d/tools/, och titta.ts och kropp.ts i standarddocka/verktyg/.
---

# Granska en av dockornas rörelser

Sökvägar räknas från casino-roten. Läs först `standarddocka/DOMAR.md`: Jakobs domar är måttet. Jakob
2026-11-26: agenterna granskar "småsaker", till exempel att "giv till plats 7 ska få rätt vändningar av kort så att
fingrar kommer rätt med kort", och att "fysik av typ kort och annat faktiskt görs så det är trovärdigt".

## Vad en rörelse är

- **Rörelserna** är lyfta ur filmen av livebordet och lagda på en docka (Danilo, Frasse eller en persons docka):
  `blackjack-dealer/dealer3d/data/lyft-<docka>-*.json`, med ankarena i `ankare-vila-<docka>.json` (A1),
  `ankare-skon-<docka>.json` (A2.3) och `ankare-byte-<docka>.json` (handbytet, A2M). Given finns hel
  (`lyft-<docka>-p<plats>`) och delad vid handbytet (`lyft-<docka>-till-bytet` för alla platser,
  `lyft-<docka>-bytet-p4` till platsen och hem). Fälten: lägen i meter ruta för ruta i livebordets linsvärld (axel,
  armbåge, handled, 21 punkter per hand, huvud, blick, kortets mitt, långsida och framsida), och i `made` hur rörelsen är
  gjord, med händelsernas rutor i `made.times`.
- **De görs av ett verktyg:** `blackjack-dealer/dealer3d/tools/lyft-till-docka.ts` ur lyften i `live-bj/data/lyft/`. Det
  råa lyftet är sanningen om var händerna är; det som är vårt eget (ankarena, bryggorna till och från dem, rättningar vid
  en kontakt, bålens lutning där armen inte når, blicken, armbågen) står i verktygets huvud och i rörelsens `made`.
  Filerna skrivs aldrig för hand.
- **Editorn spelar dem som de är** och sparar inget. Ett fel rättas där det uppstår: i `lyft-till-docka.ts`, eller i
  lyftet (`live-bj/verktyg/lyft.py`), och rörelserna görs om med `node dealer3d/tools/lyft-till-docka.ts --alla` (från
  `blackjack-dealer/`).

## Gången

1. **Mät** (från `blackjack-dealer/`): `node dealer3d/tools/lyft-kolla.ts dealer3d/data/<rörelse>.json`. Utan filer
   prövas alla. Raden SPÄRR säger det som inte får finnas: ett ben som ändrar längd, en handled utom räckvidd eller mer
   än 50 grader från underarmen, ett finger i filten, i kortet eller genom det (också i skon), handflatan i filten, ett
   kortets hörn under filten, en arm i bålen, kortet utan stöd, ett kort som vänds för fort, ett hopp eller ryck, första
   och sista rutan utanför ankaret, en landning utanför målet, och handen för långt från lyftet. Bredvid står
   skakigheten, rycken och blicken i vilan mot dealerns.
   **Huvudet som det syns:** filma rörelsen (`titta.ts --docka <docka> --giv <rörelse> --spela-in hela --kamera spel`),
   mät dockans huvud med ansiktsnätet (`python -I live-bj/verktyg/lyft.py dockhuvud <filmen> <ansikte.json>`, Python-miljön
   i `blackjack-dealer/tools/python/`) och lägg till `--ansikte <ansikte.json>` i `lyft-kolla.ts`.
   **Kroppen:** `node standarddocka/verktyg/kropp.ts --docka <docka> --plats <n>` stegar editorn 60 gånger per sekund och
   säger om modellens axlar, armbågar eller handleder hoppar från rörelsens punkter, det Jakob ser som att det "hackar
   till". Tar det delade låset.
2. **Titta:** `node standarddocka/verktyg/titta.ts --docka <docka> --plats <n> --ut slask/standarddocka/granska-<rörelse>
   --kamera spel,sida,topp --tider <sekunder>` (eller `--giv <rörelse>` för en annan rörelse än platsens giv). Läs
   bilderna. `lage.json` bär editorns mått vid varje tid. Fingrarna och greppet syns bara i närbild: kamerorna
   `narahoger`, `naravanster` och `narakort` (`--nara-fran x,y,z` flyttar dem), och `naraansikte` för blicken.
   Högst ett dussin bilder per körning: verktyget väntar på det delade låset, och andra väntar på dig.
3. **Döm** varje märkt sak och det ögat ser mot listan nedan, och mot förlagan (skillen `doma`, "Trohet mot förlagan"):
   gör dockan det den riktiga dealern gör? Den riktiga dealern ses bara på den här datorn. Ett tal är ingen dom: ett
   finger 3 mm "i kortet" kan vara ett grepp som ser rätt ut, och en rörelse utan märkningar kan se stel ut.
4. **Rätta orsaken** i verktyget eller lyftet, gör om rörelserna, och mät och titta igen. Blev det inte bättre tas
   ändringen bort.
5. **Rapportera** (nedan), och ta bort din mapp i slasken.

## Vad som granskas

- **Ankarena:** en rörelse börjar och slutar stilla i sitt ankare: vilan (A1), redo vid skon (A2.3) eller handbytet
  (A2M). Samma ställning i slutet av en rörelse och i början av nästa.
- **Greppet:** kortet sitter mellan tummen och ett finger på var sin sida, eller glider på filten under ett finger.
  Aldrig löst i luften bredvid handen, och inget finger genom det.
- **Vändningen:** handen vänder kortet, en gång, med underarm och handled. Kortet byter aldrig sida mellan två rutor.
- **Landningen:** kortet ligger sedan plant där handen lade det och flyttas inte "sista rutorna".
- **Händerna:** vilar på filten, inte i den. Inga fingrar i varandra eller bortom vad ett finger kan. Handen som inte
  bär kortet gör det dealern gör; den är inte stel eller spänd.
- **Armarna:** underarmarna går över bordets kant, aldrig genom kanten eller skon. Titta från sidan.
- **Inga hack:** farten ändras mjukt. De häftigaste rycken i `lyft-kolla.ts` och `kropp.ts` är värda en bild strax före
  och strax efter.
- **Huvudet och blicken** som dealerns i samma ruta. I vilan in i kameran, enligt `DOMAR.md`.
- **Bålen:** lutar inte mer än räckvidden kräver.

## Flera agenter samtidigt

- En agent per rörelse, och var och en med sin egen mapp `slask/standarddocka/granska-<rörelse>/`.
- `lyft-till-docka.ts` gör om alla rörelser: bara den som har fått uppdraget att rätta ändrar verktyget eller lyftet.
  De andra rapporterar vad som krävs.
- Ingen commit, ingen push och inget betalt anrop av en underagent. Den som delade ut arbetet committar, efter att ha
  kört `lyft-kolla.ts` på alla rörelser.
- Det Jakob ska se avgör huvudagenten: säg i rapporten vilka tider som visar felet eller rättningen bäst.

## Rapporten

Kort, på svenska, bara det som efterfrågas:

- per fynd: ruta eller sekund, vad som är fel, belägget (talet ur `lyft-kolla.ts` eller `kropp.ts`, eller bildens namn),
  och antingen "rättat: <ändringen>" eller "kräver: <var orsaken sitter och vad som behöver ändras>";
- det som mättes och såg rätt ut, i en rad;
- det som är osäkert;
- filerna som ändrades.
