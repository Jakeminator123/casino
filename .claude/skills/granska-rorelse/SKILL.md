---
name: granska-rorelse
description: Använd i standarddocka när en av dockornas lyfta rörelser ska granskas eller rättas - en giv till en plats, delarna vid handbytet, vägen till skon och hem, en väntan - om fingrarna och kortet hänger ihop, om kortet rör sig trovärdigt, om händer, armar, huvud och blick följer den riktiga dealern och Jakobs domar. Gäller också när flera agenter granskar var sin rörelse samtidigt. Verktygen lyft-kolla.ts och lyft-till-docka.ts i blackjack-dealer/dealer3d/tools/, och titta.ts i standarddocka/verktyg/.
---

# Granska en av dockornas rörelser

Sökvägar räknas från casino-roten. Läs först `standarddocka/DOMAR.md`: Jakobs domar är måttet. Jakob 2026-11-26:
agenterna granskar "småsaker", till exempel att "giv till plats 7 ska få rätt vändningar av kort så att fingrar kommer
rätt med kort", och att "fysik av typ kort och annat faktiskt görs så det är trovärdigt".

## Rörelserna

Lyfta ur filmen av livebordet och lagda på en docka (Danilo, Frasse eller en persondocka), en fil per rörelse i
`blackjack-dealer/dealer3d/data/`:

| Fil | Rörelsen | Ankarena |
| --- | --- | --- |
| `lyft-<docka>-till-bytet` | kortet ur skon till handbytet, samma för alla platser | A2.3 → A2M |
| `lyft-<docka>-bytet-p<n>`, `-bytet-p<n>c2` | bytet till kort 1 eller kort 2 på dagens plats n, och handen hem | A2M → A2.3 |
| `lyft-<docka>-p<n>`, `-p<n>c2` | hela given: de två delarna efter varandra | A2.3 → A2.3 |
| `lyft-<docka>-till-skon`, `-hem` | ur vilan till skon och tillbaka (vårt eget) | A1 ↔ A2.3 |
| `lyft-<docka>-vantan-<n>` | en väntan i vilan | A1 |

Ankarena står i `ankare-vila-<docka>.json` (A1), `ankare-skon-<docka>.json` (A2.3) och `ankare-byte-<docka>.json`
(A2M). En rörelse har lägen ruta för ruta i livebordets linsvärld (armar, händernas 21 punkter, huvud, blick, kortet),
och `made` säger hur den är gjord: källan (filmens egen giv till platsen eller den närmaste platsens riktad om),
händelsernas rutor (`made.times`) och vad som är vårt eget.

Rörelserna görs av `blackjack-dealer/dealer3d/tools/lyft-till-docka.ts` ur lyften i `live-bj/data/lyft/` och skrivs
aldrig för hand; editorn spelar dem som de är och sparar inget. Det råa lyftet är sanningen om var händerna är, och det
som är vårt eget står i verktygets huvud. Ett fel rättas i verktyget eller i lyftet (`live-bj/verktyg/lyft.py`), och
rörelserna görs om med `node dealer3d/tools/lyft-till-docka.ts --alla` (från `blackjack-dealer/`).

## Gången

1. **Mät** (från `blackjack-dealer/`): `node dealer3d/tools/lyft-kolla.ts dealer3d/data/<rörelse>.json`, utan filer
   alla. Raden SPÄRR säger det som inte får finnas (listan står i verktygets huvud); bredvid står skakigheten, rycken
   och blicken i vilan mot dealerns. **Huvudet som det syns:** filma rörelsen (`titta.ts --docka <docka> --giv
   <rörelse> --spela-in hela --kamera spel`), mät dockans huvud (`python -I live-bj/verktyg/lyft.py dockhuvud <filmen>
   <ansikte.json>`, Python-miljön i `blackjack-dealer/tools/python/`) och lägg till `--ansikte <ansikte.json>`.
2. **Titta:** `node standarddocka/verktyg/titta.ts --docka <docka> --plats <n> --ut slask/standarddocka/granska-<rörelse>
   --kamera spel,sida,topp --tider <sekunder>`, med `--giv <rörelse>` för en annan rörelse än platsens giv och
   `--sekvens p4,p4c2` för flera efter varandra. Läs bilderna; `lage.json` bär editorns mått vid varje tid. Fingrarna
   och greppet syns bara i närbild: kamerorna `narahoger`, `naravanster` och `narakort` (`--nara-fran x,y,z` flyttar
   dem), och `naraansikte` för blicken. Högst ett dussin bilder per körning: verktyget väntar på det delade låset, och
   andra väntar på dig.
3. **Döm** varje märkt sak och det ögat ser mot listan nedan och mot förlagan (skillen `doma`, "Trohet mot förlagan"):
   gör dockan det den riktiga dealern gör? Den riktiga dealern ses bara på den här datorn. Ett tal är ingen dom: ett
   finger 3 mm "i kortet" kan vara ett grepp som ser rätt ut, och en rörelse utan märkningar kan se stel ut.
4. **Rätta orsaken** i verktyget eller lyftet, gör om rörelserna, och mät och titta igen. Blev det inte bättre tas
   ändringen bort.
5. **Rapportera** (nedan), och ta bort din mapp i slasken.

`standarddocka/verktyg/kropp.ts` (modellens leder mot rörelsens punkter) är skrivet för den förra standarden och går
inte att köra innan det har skrivits om.

## Vad som granskas

- **Ankarena:** stilla i början och slutet, och slutet av en del är samma ställning som början av nästa.
- **Handbytet** som dealerns i filmen: högern väntar platt på filten, vänstern för kortet till den och reser det, och
  högern tar det och bär det under handen.
- **Greppet:** kortet mellan tummen och ett finger på var sin sida, eller glidande på filten under ett finger; aldrig
  löst i luften bredvid handen, och inget finger genom det.
- **Vändningen:** handen vänder kortet en gång, med underarm och handled; kortet byter aldrig sida mellan två rutor.
- **Landningen:** kortet ligger plant på kortplatsen där handen lade det, och kvar där, inte flyttat "sista rutorna".
- **Händerna och armarna:** på filten, inte i den; inga fingrar i varandra; handen som inte bär kortet gör det dealern
  gör, inte stel eller spänd; underarmarna över bordets kant, aldrig genom den eller skon (titta från sidan).
- **Farten** ändras mjukt: de häftigaste rycken i `lyft-kolla.ts` är värda en bild strax före och strax efter.
- **Huvudet och blicken** som dealerns i samma ruta; **bålen** lutar inte mer än räckvidden kräver.

## Flera agenter samtidigt

En agent per rörelse, var och en i `slask/standarddocka/granska-<rörelse>/`. `lyft-till-docka.ts` gör om alla
rörelser, så bara den som har fått uppdraget att rätta ändrar verktyget eller lyftet; de andra rapporterar vad som
krävs. En underagent committar, pushar och betalar inget: den som delade ut arbetet committar, efter `lyft-kolla.ts`
på alla rörelser, och avgör vad Jakob ska se (säg vilka tider som visar felet eller rättningen bäst).

## Rapporten

Kort, på svenska, bara det som efterfrågas: per fynd ruta eller sekund, vad som är fel, belägget (talet ur
`lyft-kolla.ts` eller bildens namn) och antingen "rättat: <ändringen>" eller "kräver: <var orsaken sitter och vad som
behöver ändras>"; det som mättes och såg rätt ut, i en rad; det som är osäkert; filerna som ändrades.
