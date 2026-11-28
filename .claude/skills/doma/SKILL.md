---
name: doma
description: Använd i casino när ett resultat ska visas för Jakob som något att döma (en film, en figur, en rörelse, en bild av en person eller en docka) och en oberoende domare ska döma det först i hans ställe, eller när en domare sätts in medan han är borta. Gäller underlaget (tools/domare-underlag.ts), checklistan med hans ord, domen i två delar, var domen förs in, trohet mot förlagan och kalibreringen. Inte rutgranskningen av en beställd film i sig (granska-film) eller en rörelses lager (granska-rorelse).
---

# Döma i Jakobs ställe

Regeln står i rotens `AGENTS.md` ("En oberoende domare när han är borta") och hans domar i `standarddocka/DOMAR.md`;
här står hur det går till. Kommandon körs från `blackjack-dealer/`; sökvägar räknas från casino-roten.

## Vem som dömer

- Domaren är en annan än den som gjorde resultatet: en underagent som får provmappen eller filmen, den här skillen,
  `standarddocka/DOMAR.md` och hans anteckningar (`node tools/proof-notes.ts`), men inte tillverkarens rapport.
  Provets `description` säger bara vad provet säger sig visa; den är inget belägg.
- Domaren dömer med ögat, som han: strängt, och hellre Inte bra än kanske för en film eller figur av en person.
  Måtten säger var det är värt att titta; de avgör inte.
- En beställd film från Runway rutgranskas enligt `granska-film`; domen fälls med checklistan här.

## Underlaget

```
node tools/domare-underlag.ts <provmapp | film.mp4 | bild.png> [--bara a.mp4,b.png] [--delar 2x1] [--utan-matt] [--ut <mapp>]
```

Verktyget skriver till `slask/blackjack-dealer/domare/<prov>/`, där `underlag.txt` samlar allt, och betalar och ändrar
inget. Det mäter med `live-bj/verktyg/mat.py --ensam` (MediaPipe) i Python-miljön i `blackjack-dealer/tools/python/`,
ungefär en minut per 100 rutor i 1080p.

- Per film `blad-NN.png` med var tredje ruta i hel bild. Filmer bredvid varandra (2×1, 2×2, 3×2) delas av verktyget,
  och `--delar` rättar det. Per del (figur) `del-k/ansiktet-over-tiden.png` (ansiktet vid 0, 25, 50, 75 och 100 %) och
  `del-k/narbild-{ansiktet,hogerhanden,vansterhanden}-NN.png`. En röd ram är ett ryck, en orange ett finger med fel
  längd, en blå en hand som inte hittas fast handleden syns. `titta-har.txt` har måtten.
- En stor bild delas i bitar i full storlek (`bilder/`), så att inget döms på en förminskad kopia.
- **Läs i den här ordningen:** `titta-har.txt`, bladen, `ansiktet-over-tiden.png`, närbilderna där måtten pekar, och
  sist provets egna bilder i full storlek. Döm aldrig på bladen ensamma: kortets trasiga kanter i provet med åtta
  stillbilder ur dockan (`atta-bilder-20261127`) syntes bara i närbilderna.

Vad måtten fångar och inte (prövat 2026-11-27):

- Ett ansikte som glider fångas av ögat i `ansiktet-over-tiden.png`, inte av formtalen: i `tomasz-gor-danilos-giv`
  blev Tomasz dockan, fast formtalen ändrades mindre än 5 %.
- Darr ("lite skakig") visar högpassen per punkt. MediaPipes eget brus är ungefär en bildpunkt, så talet säger något
  först bredvid en annan del eller film: jämför en person med en person och en docka med en docka (dockans släta
  ansikte mäts brusigt). Huvudets darr i filmerna har legat på 0,2–0,5 % av axelbredden.
- Blicken mäts svagt: huvudets vinkel och irisens höjd i ögat, där rakt fram är ungefär 0,45 och under 0,40 betyder
  att han ser upp. I `tomasz-gor-danilos-giv` låg dockan bredvid redan på 0,34–0,43, så blicken uppåt kom från dockan.
  Döm blicken på närbilderna i vilan, mot var kameran står.
- Händerna: verktyget flaggar en hand som tappas medan handleden syns, och fingrar som ändrar längd mot varandra.
  Antalet fingrar och leder räknas med ögat.

## Den externa domaren

En andra röst från en modell hos en annan leverantör (OpenAI), på Jakobs ord 2026-11-27 ("ja kör openai_api_key som
jag lagt i roten nu"). Den används alltid för det som visas för honom som film eller figur av en person, och för
skärmbilder av studion bara när det behövs. Varje anrop kostar pengar.

```
node tools/extern-domare.ts <provmapp> [--bilder a.png,b.png] [--torr]
```

- Kommandot skickar högst sex nedskalade bilder ur underlaget och provet, och avsnittet "Vad Jakob fäller på" nedan som
  checklista. Svaret (dom, skäl med fil och ruta, det den skulle rätta, säkerhet) skriver det själv in i provets
  `proof.json` (`domare.extern` och `oenig`; en tidigare extern dom blir `extern_forra`) och i `extern-dom.json`, så
  skriv inte `proof.json` medan det körs. `--torr` visar vad som skulle skickas och vad det kostar.
- Den ser bara de bilder den får: välj de avgörande med `--bilder` när kommandots val missar dem (filmen där felet syns,
  `ansiktet-over-tiden.png` för den längsta filmen). Där en docka ligger bredvid en streckfigur eller förlaga väljer
  kommandot den sista delen, vilket inte alltid är resultatet.
- **Vad den aldrig får se:** något under `live-bj/` (filmen av riktiga dealrar, rutor ur den och jämförelsefilmerna),
  hans foton (`private/`), nycklar, sökvägar eller hans namn. Skriptet vägrar sådana filer och skriver "ägaren" i
  stället för hans namn. Den får bara se dockor och framställda personer.
- **Taket:** högst 0,50 USD per prov och 5 USD under tolv timmar, räknat före anropet i värsta fall och efteråt ur
  svarets tokenräkning och prislistan. Varje anrop skrivs i `.runtime/extern-domare/liggare.jsonl`. Modellen och
  priserna står överst i skriptet; läs OpenAIs modellsida och prislista innan de ändras.
- Nyckeln (`OPENAI_API_KEY`) läses av skriptet ur miljön eller ur `.env.local`; ingen läser filen eller skriver ut
  nyckeln. Saknas nyckeln, eller nekas anropet, står domen på domaren ensam, och det sägs i domen.
- Domen som förs in är domarens, med den externa rösten bredvid. Är de oense står båda kvar och provet märks oenigt:
  det är då Jakob behöver titta först.

## Trohet mot förlagan

- Dockornas rörelser (Danilos, Frasses och persondockornas) är lyfta ur filmen av riktiga dealrar och döms bredvid
  förlagan: gör dockan, och filmen av den, det den riktiga dealern gör?
- Den riktiga dealern ses bara på den här datorn. Jämförelsefilmerna ligger i `live-bj/rutor/jamfor/`; underlag ur dem
  görs med `--ut` inne i `live-bj/rutor/` (Git har inte den mappen), och verktyget vägrar annars. Rutor ur det riktiga
  klippet hamnar aldrig i ett prov, i `assets/`, i Git, hos en tjänst eller hos den externa domaren, så troheten döms
  bara av domaren på datorn.

## Vad Jakob fäller på

Hans egna ord, med datum; alla hans domar står i `standarddocka/DOMAR.md`.

- **Samma person hela filmen.** "allteftersom glömdes utseendet på Tomasz" (2026-11-27). Jämför ansiktet i första,
  mittersta och sista rutan. Ett ansikte som blir dockans (målade bryn, plast), yngre eller äldre fäller filmen.
- **Inget skak.** "han var liksom lite skakig på grund av ... att för små mikrorörelser kommer med?" (2026-11-27),
  värst i huvudet.
- **Blicken.** I vilan in i kameran, vid skon på skon och kortet. "Känns som att han tittar uppåt, men ... inte mot
  kameran" (2026-11-27) fäller filmen.
- **Händerna.** En trasig hand fäller allt: "skitdåligt" (en figur i vila med en vriden, skrynklig handled). Fel är
  också ett krås eller en krage vid handleden ("om vi har leder innan i dockan varför lägga på ett lager till"), en
  hand som svävar som en klo, en spänd hand ("som om hon spänner handen", 2026-11-23), en andra hand som är "för stel
  ... gör ingenting", en "konstig spretig hand" på väg hem, en hand som hänger framför bröstet utan underarm, händer
  som går i varandra och fingrar genom kortet eller filten.
- **Kroppen.** Ingen arm genom bordets kant och inga ben genom sargen. I vilan avslappnad, inte med armbågarna utåt.
  Det en kropp inte kan ska inte gå.
- **Kortet.** Det tas ur skon och vänds av handen, aldrig "av tom luft" eller "osynligt stoff". Det byter inte sida
  "utan någon egentlig anledning" och "ska ... inte flyttas sista rutorna". Det är ett slätt kort med samma storlek hela
  filmen, aldrig ett tryckt, vikt, spetsigt eller dubbelt kort, och inga fler kort än dockan har. Ett kort med en
  färgad kant från det gröna fäller också.
- **Skon** ska vara som förlagans ("kortskon som används är också med stående kort och inte det som youtubefilmen
  har, dvs liggandes").
- **Stelhet.** "rörelserna är stela, känns inte naturliga" (2026-11-26). Filmmodellen kopierar dockan ruta för ruta, så
  dockans fel syns i filmen ("ett litet typ hack ... faktiskt syns i denna film").
- **En skillnad måste synas.** "samma ju" (2026-11-27) om ett prov där bara talen skilde. Och: "huvudrörelser är inte
  samma sak som ansiktsrörelser".

Det han **inte** fäller: det som ska vara en neutral standard. Dockan är "en visuell standard att förhålla sig till"
och behöver inte likna någon, och bordets färg och material läggs på senare ("en standard i botten, utseendet ovanpå").
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
sa. Underlaget sparas inte ("så inte skit lagras"): den som ska rätta kör `node tools/domare-underlag.ts <prov>` själv.
Domaren tar bort sin slaskmapp när domen är införd.

## Föra in domen

- **Prov** (`blackjack-dealer/assets/proofs/<namn>/proof.json`, och ett prov i `slask/.../granska/<namn>/prov/` på
  samma sätt): `verdicts` får en dom per film eller bild som provet visar som resultat: Bra blir `ok` (Användbar), Nja
  `remarks` (Med anmärkningar) och Inte bra `failed` (Underkänd). Utan en `takes`-lista blir just de filerna provets
  tagningar med en bricka (`studio/lib/verdict.ts`). Fältet `domare` bär orden:
  `{"av": "...", "dag": "...", "dom": "Inte bra", "sakerhet": "...", "skal": [...], "ratta": [...], "extern": {...} | null, "oenig": false, "obs": "Domarens ord, inte Jakobs; hans dom ersätter den."}`.
  `extern` skriver `tools/extern-domare.ts` (se ovan); där den inte har dömt är `extern` null och `extern_obs` säger
  varför. Domaren på datorn rör inte de fälten när den skriver om sina egna ord, och fältet pekar inte på något
  underlag. Studion visar brickan och domarens skäl. Inget annat i `proof.json` ändras: inte rubrik, text, etiketter,
  tagningar eller hans anteckningar.
- **Beställd film:** granskarens dom förs in enligt `granska-film` (Föra in). En preliminär dom med
  `node tools/review-put.ts` får bara huvudagenten ge, och bara där han har lämnat över domen.
- Hans egen dom ersätter alltid domarens.

## Kalibreringen

Prövat blint 2026-11-27 på tolv prov, nio av dem dömda av honom. Domaren höll med honom i fem, var strängare i fyra
(den dömde utseendet hos det som ska vara neutralt) och aldrig snällare, men missade skakigheten, blicken uppåt och att
skon och vänsterhanden inte var trogna förlagan; därför står de i checklistan. Den externa domaren höll med i fyra, var
strängare i tre och snällare i två, båda gångerna utan de avgörande bilderna: i `dealerns-handled` fick den inte krået
vid bordet, och i `danilo-frasse-i-editorn` fick den streckfigurens ansikte i stället för dockans. Med domarens
bildval vände den i ett av tre oeniga prov. Den är ett andra par ögon, bara på de bilder domaren väljer. En ny domare
börjar med hans senaste anteckningar och lägger till det han fäller som inte står här.
