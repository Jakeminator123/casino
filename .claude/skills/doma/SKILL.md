---
name: doma
description: Använd i casino när ett resultat ska visas för Jakob som något att döma (en film, en figur, en rörelse, en bild av en person eller en docka) och en oberoende domare ska döma det först i hans ställe, eller när en domare sätts in medan han är borta. Gäller underlaget (tools/domare-underlag.ts), checklistan med hans ord, domen i två delar, var domen förs in, trohet mot förlagan och kalibreringen. Inte rutgranskningen av en beställd film i sig (granska-film) eller en rörelses lager (granska-rorelse).
---

# Döma i Jakobs ställe

Kommandon körs från `blackjack-dealer/`; sökvägar räknas från casino-roten. Regeln står i rotens `AGENTS.md` ("En
oberoende domare när han är borta"); här står hur det går till.

## Vem som dömer

- Domaren är en annan än den som gjorde resultatet: en underagent som får provmappen eller filmen, den här skillen,
  `standarddocka/DOMAR.md` och hans anteckningar (`node tools/proof-notes.ts`), men inte tillverkarens rapport.
  Provets `description` läses bara för att veta vad provet säger sig visa; den är inget belägg.
- Domaren dömer med ögat, som han: strängt, och hellre Inte bra än kanske för en film eller figur av en person.
  Måtten säger var det är värt att titta, de avgör inte.
- En beställd film från Runway rutgranskas enligt `granska-film`. Domen fälls med checklistan här.

## Underlaget

```
node tools/domare-underlag.ts <provmapp | film.mp4 | bild.png> [--bara a.mp4,b.png] [--delar 2x1] [--utan-matt] [--ut <mapp>]
```

Verktyget skriver till `slask/blackjack-dealer/domare/<prov>/`, med `underlag.txt` som samlar allt. Det betalar inget
och ändrar inget av det det läser. Mätningen är `live-bj/verktyg/mat.py --ensam` (MediaPipe), och den Python-miljö som
beskrivs i `blackjack-dealer/tools/python/README.md`. Det tar ungefär en minut per 100 rutor i 1080p.

- Per film: `blad-NN.png` med var tredje ruta i hel bild. Där filmer ligger bredvid varandra (2×1, 2×2, 3×2) hittas
  delarna av verktyget själv, och `--delar` rättar det. För varje del (figur) finns `del-k/ansiktet-over-tiden.png`
  (ansiktet vid 0, 25, 50, 75 och 100 % av filmen) och `del-k/narbild-{ansiktet,hogerhanden,vansterhanden}-NN.png`
  (varannan ruta där något händer). En röd ram är ett ryck, en orange ett finger med fel längd och en blå en hand som
  inte hittas fast handleden syns. `titta-har.txt` innehåller måtten.
- En stor bild delas i bitar i full storlek (`bilder/`), så att inget döms på en förminskad kopia.
- Läs i den här ordningen: `titta-har.txt`, bladen, `ansiktet-over-tiden.png`, närbilderna där måtten pekar, och sist
  provets egna bilder i full storlek. Döm aldrig på bladen ensamma. Kortets trasiga kanter i `atta-bilder-20261127`
  syntes bara i närbilderna.
- Vad måtten fångar (prövat 2026-11-27):
  - Ett ansikte som glider fångas av ögat i `ansiktet-over-tiden.png`, inte av formtalen. I `tomasz-gor-danilos-giv`
    blev Tomasz dockan, fast formtalen ändrades mindre än 5 %.
  - Darr ("lite skakig") visar högpassen per punkt. MediaPipes eget brus är ungefär en bildpunkt, så talet säger något
    först bredvid en annan del eller film i samma storlek. Filmerna av Danilos lyfta giv darrade i huvudet ungefär dubbelt
    så mycket (0,4–0,5 % av axelbredden) som Kling-filmerna av den ritade dockan (0,2–0,3 %).
  - Blicken mäts svagt (huvudets vinkel och irisens höjd i ögat). Döm den på närbilderna i vilan, mot var kameran står.
  - Händerna: verktyget flaggar en hand som tappas medan handleden syns, och fingrar som ändrar längd mot varandra.
    Titta där. Antalet fingrar och leder räknas med ögat.

## Den externa domaren

En andra röst kommer från en modell hos en annan leverantör (OpenAI), på Jakobs ord 2026-11-27 ("ja kör
openai_api_key som jag lagt i roten nu"). Den används alltid för det som visas för honom som film eller figur av en
person, och för skärmbilder av studion bara när det behövs. Varje anrop kostar pengar.

```
node tools/extern-domare.ts <provmapp> [--bilder a.png,b.png] [--torr]
```

- Kommandot skickar högst sex bilder ur underlaget och provet, nedskalade, och checklistan nedan. Svaret kommer i
  domens form (dom, skäl med fil och ruta, det den skulle rätta, säkerhet) och skrivs till `extern-dom.json` i
  underlaget. `--torr` visar vad som skulle skickas och vad det kostar.
- **Vad den aldrig får se:** något under `live-bj/` (filmen av riktiga dealrar, rutor ur den och
  jämförelsefilmerna), hans foton (`private/`), nycklar, sökvägar eller hans namn. Skriptet vägrar sådana filer och
  skriver "ägaren" i stället för hans namn. Den får bara se dockor och framställda personer.
- **Taket:** högst 0,50 USD per prov och 5 USD under tolv timmar. Kostnaden räknas före anropet i värsta fall och
  efteråt ur svarets tokenräkning och prislistan. Varje anrop skrivs i `.runtime/extern-domare/liggare.jsonl`.
  Modellen och priserna står överst i skriptet; läs OpenAIs modellsida och prislista innan de ändras.
- Nyckeln (`OPENAI_API_KEY`) läses av skriptet ur miljön eller ur `.env.local`. Ingen läser filen eller skriver ut
  nyckeln. Saknas nyckeln, eller nekas anropet, står domen på domaren ensam, och det sägs i domen.
- Domen som förs in är domarens. Den externa rösten står bredvid den. Är de oense står båda kvar, och provet märks
  oenigt: det är då Jakob behöver titta först.

## Trohet mot förlagan

- En **lyft** rörelse (Danilos och Frasses, ur filmen av riktiga dealrar) är en trogen kopia av en verklig giv. Den
  döms bredvid förlagan: gör dockan, och filmen av den, det den riktiga dealern gör? Exempel: vänsterhanden som lyftes
  framför bröstet i ruta 52 var "en kvarleva från gamla dockan", och skon med stående kort var fel mot filmens
  liggande kort.
- En **ritad** rörelse (standarddockans givar) är det generella mönstret som ska "byggas på, förbättras" (Jakob
  2026-11-27). Den döms på om den ser mänsklig och riktig ut, inte på om den är identisk med en viss giv i filmen.
- Den riktiga dealern ses bara på den här datorn. Jämförelsefilmerna ligger i `live-bj/rutor/jamfor/`. Underlag
  ur dem görs med `--ut` inne i `live-bj/rutor/` (Git har inte den mappen), och verktyget vägrar annars. Rutor ur det
  riktiga klippet hamnar aldrig i ett prov, i `assets/`, i Git eller hos en tjänst, och inte heller hos den externa
  domaren. Troheten döms därför bara av domaren på datorn.

## Vad Jakob fäller på

Hans egna ord, med datum, ur anteckningarna i Prov och ur `DOMAR.md`:

- **Samma person hela filmen.** "allteftersom glömdes utseendet på Tomasz" (2026-11-27). Jämför ansiktet i första,
  mittersta och sista rutan. Ett ansikte som blir dockans (målade bryn, plast), yngre eller äldre fäller filmen.
- **Inget skak.** "han var liksom lite skakig på grund av ... att för små mikrorörelser kommer med?" (2026-11-27).
- **Blicken.** I vilan in i kameran, vid skon på skon och kortet (DOMAR). "Känns som att han tittar uppåt, men ... inte
  mot kameran" (2026-11-27) fäller filmen.
- **Händerna.** En trasig hand fäller allt: "skitdåligt" (en figur i vila med en vriden, skrynklig handled). Fel är
  också ett krås eller en krage vid handleden ("om vi har leder innan i dockan varför lägga på ett lager till"), en
  hand som svävar som en klo, en spänd hand ("som om hon spänner handen", 2026-11-23), en andra hand som är "för stel
  ... gör ingenting" och en "konstig spretig hand" på väg hem. Det gäller även en hand som hänger framför bröstet utan
  underarm, händer som går i varandra och fingrar genom kortet eller filten.
- **Kroppen.** Ingen arm genom bordets kant och inga ben genom sargen. I vilan avslappnad, inte med armbågarna utåt
  (DOMAR). Det en kropp inte kan ska inte gå.
- **Kortet.** Det tas ur skon och vänds av handen, aldrig "av tom luft" eller "osynligt stoff". Det byter inte sida
  "utan någon egentlig anledning" och "ska ... inte flyttas sista rutorna". Det ska vara ett slätt kort med samma storlek
  hela filmen, aldrig ett tryckt, vikt, spetsigt eller dubbelt kort, och inga fler kort än dockan har. Ett kort med en
  färgad kant från det gröna fäller också.
- **Skon** ska vara som förlagans ("kortskon som används är också med stående kort och inte det som youtubefilmen
  har, dvs liggandes").
- **Stelhet.** "rörelserna är stela, känns inte naturliga" (2026-11-26). Filmmodellen kopierar dockan ruta för ruta, så
  dockans fel syns i filmen ("ett litet typ hack ... faktiskt syns i denna film").
- **En skillnad måste synas.** "samma ju" (2026-11-27) om ett prov där bara talen skilde. Och: "huvudrörelser är inte
  samma sak som ansiktsrörelser".

Det han **inte** fäller: det som ska vara en neutral standard. Dockan är "en visuell standard att förhålla sig till"
och behöver inte likna någon. Bordets färg och material läggs på senare ("en standard i botten, utseendet ovanpå").
En skyltdocka, en grå filt eller ett bord utan material döms på sin funktion: mått, proportioner, att den sitter rätt,
att uttrycken går att läsa och att rörelsen stämmer. Hans Bra betyder ofta "bra nog att bygga vidare på" ("Bra nog
att kunna testa vidare från"). Det han berömmer: "Superbra, 5/5" (given A och B), "på riktigt skitbra" (dockans film
gjord till en person) och "svinbra variant" (en fri giv med levande händer).

## Domen

Domen skrivs i två delar, och varje påstående anger fil och ruta eller sekund:

- **(a) Domen som han skulle fälla den:** Bra, Nja eller Inte bra, med de tre tyngsta skälen och hur säker domaren är
  (hög, medel, låg).
- **(b) Det jag skulle rätta:** domarens fynd utöver det. Här får strängheten stå kvar utan att sänka domen.

Ett Inte bra går tillbaka till den som gjorde resultatet, med fil och rutor, och svaret till Jakob säger vad domaren
sa. Underlaget för ett Inte bra flyttas till `slask/blackjack-dealer/granska/domaren/<prov>/` så att den som rättar
ser rutorna. Resten av domarens slaskmapp tas bort.

## Föra in domen

- **Prov** (`blackjack-dealer/assets/proofs/<namn>/proof.json`, och ett prov i `slask/.../granska/<namn>/prov/` på
  samma sätt): `verdicts` får en dom per film eller bild som provet visar som resultat. Bra blir `ok` (Användbar), Nja
  `remarks` (Med anmärkningar) och Inte bra `failed` (Underkänd). Utan en `takes`-lista blir just de filerna provets
  tagningar med en bricka (`studio/lib/verdict.ts`). Fältet `domare` bär orden:
  `{"av": "...", "dag": "...", "dom": "Inte bra", "skal": [...], "ratta": [...], "sakerhet": "...", "extern": {...} | null, "oenig": false, "obs": "Domarens ord, inte Jakobs; hans dom ersätter den."}`.
  `extern` är den externa domarens `extern-dom.json`, och `oenig` är sant när de två domarna har fällt olika domar.
  Studion visar brickan, men ännu inte orden i `domare`.
  Inget annat i `proof.json` ändras: inte rubrik, text, etiketter, tagningar eller hans anteckningar.
- **Beställd film:** granskarens dom förs in enligt `granska-film` (Föra in). En preliminär dom med
  `node tools/review-put.ts` får bara huvudagenten ge, och bara där han har lämnat över domen.
- Hans egen dom ersätter alltid domarens.

## Kalibreringen

Domaren prövades blint 2026-11-27 på tolv prov, före hans domar. I de fem prov han fällde, eller fällde i chatten,
fällde domaren också, med samma huvudskäl. Domaren var aldrig snällare än han. Den var strängare i fyra prov (Nja mot
hans Bra), där den dömde utseendet hos det som ska vara neutralt. Den missade tre saker han såg: skakigheten, blicken
uppåt och skon och vänsterhanden som inte var trogna förlagan. Därför står de nu i checklistan och i underlaget. En ny
domare börjar med att läsa hans senaste anteckningar och lägger till det han fäller som inte står här.
