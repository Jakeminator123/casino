---
name: granska-rorelse
description: Använd i standarddocka när en av dockans rörelser ska granskas eller rättas - en giv till en plats, vilan till skon, en återgång - om fingrarna och kortet hänger ihop, om kortet rör sig trovärdigt, om händer, armar och blick följer Jakobs domar. Gäller också när flera agenter granskar var sin rörelse samtidigt. Verktygen standarddocka/verktyg/mat.ts och titta.ts och det sparade lagret i standarddocka/rorelser/.
---

# Granska en av dockans rörelser

Sökvägar räknas från casino-roten. Läs först `standarddocka/DOMAR.md`: Jakobs domar är måttet. Jakob
2026-11-26: agenterna granskar "småsaker", till exempel att "giv till plats 7 ska få rätt vändningar av kort så att
fingrar kommer rätt med kort", och att "fysik av typ kort och annat faktiskt görs så det är trovärdigt".

## Vad en rörelse är

- **Grundrörelsen** ligger i `blackjack-dealer/dealer3d/data/<namn>.json`: lägen i meter, ruta för ruta (axel, armbåge,
  handled, 21 punkter per hand, huvud, blick, kortets mitt, långsida och framsida). Den ändras aldrig härifrån. Den är
  ritad med regler, inte simulerad: koden i `blackjack-dealer/dealer3d/src/` lägger greppet och de fria fingrarna
  (`natural.ts`), vändningen i handen (`turn-in-hand.ts`), landningen (`landing.ts`) och håller fingrarna inom vad en
  hand kan (`hand-rule.ts`). Kortet följer handen som håller det; det har ingen egen fysik.
- **Lagret** ligger i `standarddocka/rorelser/a1-a23-p<plats>c1.json` (för en dockas egna rörelser
  `a1-a23-p<plats>c1-<docka>.json`): farten per del (`fart`) och ändringarna (`andringar`) ovanpå grundrörelsen. Det är
  det enda som ändras. En ändring:

  ```json
  {"id": "p7-hand-1", "tid": 4.1, "led": "hogerHand", "flytt": [0, 0.01, 0], "vrid": null, "varar": 0.4}
  ```

  `tid` är sekunder i grundrörelsens tid: den tid `mat.ts` skriver "i lagret" bredvid filmens (och `lage.json` kallar
  grundtid). Den är inte filmens tid, eftersom takten klipper stillheten och ändrar farten: ta tiden "i lagret" ur
  mätningen. `led` är `hogerHand`, `vansterHand`, `hogerArmbage`, `vansterArmbage` eller `blick`; höger och vänster är
  dealerns egna. `flytt` är meter: x mot bildens höger (dealerns vänster), y upp från filten, z mot spelarna. `vrid` är en
  vridning kring handleden som kvaternion `[x, y, z, w]` med längden 1 och gäller bara en hand. `varar` är hur många
  sekunder av filmen ändringen tonas in och ut åt varje håll. Ett lager med fel (en felstavad led, en vridning som inte
  har längden 1, en tid utanför rörelsen) används inte: `mat.ts` och editorn säger vad som är fel.
- **Rutorna** (`….rutor.json`) är hela den ändrade rörelsen och skrivs av editorn. Efter en ändring för hand i lagret
  skrivs de om med `node standarddocka/verktyg/titta.ts --plats <n> --spara --ut <din mapp>`; skriv dem aldrig själv.
  `--spara` stannar med ett fel om lagret har fel eller hör till en äldre grundrörelse.

## Gången

1. **Mät:** `node standarddocka/verktyg/mat.ts --plats <n> [--docka man|kvinna]` (förval mannen, som i editorn). Den
   prövar varje ruta, också den första och den sista, och slutar med tiderna som är värda att titta på: filmens
   sekunder (det `titta.ts --tider` tar) och bredvid dem tiden i lagret (det en ändring skrivs med). Ingen webbläsare,
   inget lås. Raden SPÄRR säger det som inte får finnas i en rörelse som filmas: ett lager med fel, en giv som inte
   börjar och slutar i sitt ankare, ett ben som ändrar längd, en handled utom räckvidd eller en hand mer än 50 grader
   från underarmen, en fingerled bortom sitt läge, ett finger i filten eller genom kortet (också i skon), handflatan i
   filten, kortet utan stöd eller med ett hörn under filten, ett hopp eller ryck (farten byter tvärt) i en handled,
   armbåge, fingertopp, kortet, huvudet eller blicken, och en sned landning. Utskriften säger också vad den inte ser.
   `--alla` prövar alla sju platserna och slutar rött om någon har en spärr, och med
   `--giv-monster giv-fran-2-3-p#c1-<namn>` prövas nya grundrörelser i stället för platsernas.
   **Mät också kroppen:** `node standarddocka/verktyg/kropp.ts --plats <n> [--docka kvinna]` (eller `--alla`, `--runda`)
   stegar editorn 60 gånger per sekund och säger om modellens axlar, armbågar eller handleder hoppar från rörelsens
   punkter: det `mat.ts` inte ser, och det Jakob ser som att det "hackar till". Tar det delade låset.
2. **Titta:** kör
   `node standarddocka/verktyg/titta.ts --ut slask/standarddocka/granska-p<n> --plats <n> --kamera lag,sida,topp,plats<n> --tider <tiderna>`.
   Läs bilderna. `lage.json` bär editorns mått vid varje tid, bland annat armarnas luft över bordskanten (`armar`) och
   hur långt kroppens leder ligger från rörelsens punkter (`fingrarFranPunkternaMm`, `armbageFranPunktenMm`). Fingrarna
   och greppet syns bara i närbild: kamerorna `narahoger`, `naravanster` och `narakort` står nära handen eller kortet i
   varje bild (`--nara-fran x,y,z` flyttar dem, till exempel `-0.3,0.1,0` från hans högra sida).
   Högst ett dussin bilder per körning: verktyget väntar på det delade låset, och andra väntar på dig.
3. **Döm** varje märkt sak och det ögat ser mot listan nedan. Ett tal är ingen dom: ett finger 3 mm "i kortet" kan vara
   ett grepp som ser rätt ut, och en rörelse utan märkningar kan se stel ut.
4. **Rätta det lagret kan.** En ändring per fel, så liten som räcker, med ett `id` som börjar med platsen. Mät och titta
   igen. Blev det inte bättre tas ändringen bort.
5. **Rapportera** (nedan), och ta bort din mapp i slasken.

## Vad som granskas

- **Ankaren:** en del börjar och slutar stilla i sitt ankare: båda händerna i vila på filten (A1), eller vid skon (A2.3).
- **Greppet:** kortet sitter mellan tummen och ett finger på var sin sida, eller glider på filten under ett finger.
  Aldrig löst i luften bredvid handen, och inget finger genom det. Fingrarna är på rätt sida av kortet från början, så
  att inget rättas till mitt i.
- **Vändningen:** handen vänder kortet, en gång, med underarm och handled. Kortet byter aldrig sida mellan två rutor, och
  högerhanden tar emot det med tummen utan att handleden vrids i maxläge.
- **Släppet och landningen:** kortet går ned på en kant eller ett hörn, tippar och faller den sista biten på ungefär den
  tid tyngdkraften ger (`mat.ts` jämför). Det ligger sedan plant på planens plats och flyttas inte "sista rutorna".
- **Händerna:** vilar på filten, inte i den. Inga fingrar i varandra eller bortom vad ett finger kan. Handen som inte
  bär kortet gör något naturligt; den är inte stel eller spänd.
- **Armarna:** underarmarna går över bordets kant, aldrig genom kanten, markerbrickan eller skon. Titta från sidan.
- **Inga hack:** farten ändras mjukt. De häftigaste rycken i `mat.ts` är värda en bild strax före och strax efter.
- **Blicken:** mot kameran i vilan (A1), på skon vid skon (A2.3), på kortet medan det är på väg, och tillbaka på skon.
- **Bålen:** lutar inte mer än räckvidden kräver.

## Vad lagret kan och inte kan

- **Kan:** flytta en hand (kortet följer den hand som håller det, och armbågen går halva vägen med), vrida en hand kring
  handleden, flytta en armbåge, flytta blicken, och ändra farten för en del.
- **Kan inte:** böja ett enskilt finger, ändra hur kortet sitter i handen eller när det släpps, eller röra bålen. Det
  rapporteras som "kräver", med regeln det hör till i `blackjack-dealer/dealer3d/src/`. Ändra inte koden där, inte
  grundrörelserna och inte editorn: det avgör Jakob med huvudagenten.

## Flera agenter samtidigt

- En agent per rörelse. Den skriver bara i sin egen `standarddocka/rorelser/a1-a23-p<n>c1[-<docka>].json` och sin egen mapp
  `slask/standarddocka/granska-p<n>/`.
- Ingen commit, ingen push och inget betalt anrop av en underagent. Den som delade ut arbetet committar de ändrade
  filerna i `standarddocka/rorelser/`, efter att ha kört `mat.ts` på var och en.
- Det Jakob ska se avgör huvudagenten: säg i rapporten vilka tider som visar felet eller rättningen bäst.

## Rapporten

Kort, på svenska, bara det som efterfrågas:

- per fynd: tiden i sekunder, vad som är fel, belägget (talet ur `mat.ts` eller bildens namn), och antingen
  "rättat: <ändringen>" eller "kräver: <regeln och vad som behöver ändras>";
- det som mättes och såg rätt ut, i en rad;
- det som är osäkert;
- filerna som ändrades.
