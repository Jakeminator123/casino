# Filmhandbokens omgångar och mallar

Protokollet bakom [handboken](film-prompting.md) §5: vad som håller, är oavgjort och föll, med belägg per metod, och vad
mall 6–9 ändrade. Slå upp ett avsnitt eller sök på omgångens, mallens eller orderns namn; läs inte hela. Reglerna står
i handboken, metoden per steg i `data/order-methods.json`, och Jakobs domar räknas med
`node tools/verdicts-per-method.ts paow` (aldrig för hand här). En ny omgång skrivs som en rad här; det den ändrar i
reglerna skrivs i handboken. Order-id förkortas `p4-11` = `paow-giv-2-1-p4-11`, `vila-09` = `paow-vila-09`,
`2-2-p6-02` = `paow-giv-2-2-p6-02`. Belägg (V) ur kvittona och filmregistret; granskaren · Jakob.

## Det som håller

| Metod | Belägg (V): granskaren · Jakob | Status |
|---|---|---|
| Nyp-giv med referens till samma plats, Kling 4 | b6, b17, b19, b20 2/2; `p4-11` 3/5 · "Tack!"; `p1-08` (vändning vid platsen i texten) 2 av 2 vände vid platsen · t2 godkänd, t1 underkänd ("Kortet kapas"); `p1-05` (fri vändning) 3,5/5 · underkänd (färgbyte) | håller; referensens hand kan läcka in |
| Giv bara dit, Kling 4, första och sista bild, en godkänd giv till samma plats som referens (givprov 1 och 2) | Nyp 2.1 → P4: vänt genom kantläget 4 av 4, granskaren 3 av 4; släp 2.2 → P4: 2 av 2 med anmärkningar (turkos kring kanten, kortet växer på släpet); nyp 2.1 → P1 med referens som visar kortet på kant i svingen: 0 av 2 · Jakob som granskaren | håller till P4; faller till P1 med den referensen; varje levererad giv kontrolleras först (`src/deal-check.ts`) |
| Giv bara dit, Kling 4, dockans film ur en verklig hand som referens, nyp 2.1 → P4 (givprov 2C2–2C5) | Kortet vänds en gång med handleden inom 0,1 s från dockans, lagt 0–4 px från sista bilden; 4/5, 4/5, 3/5, 3/5. Den vilande handens rörelse följer förlagan, huvud och blick inte | håller (1 tagning per variant); kortet bärs 8–22 % för långt; blicken måste stå i bilderna; förlagan ska föra kortet plant ned |
| Fri vändning på vägen (`FREE`), mall 5, P1 (omgång 4) | `p1-06` WAN 3 3/5 · Primär; `p1-04` Kling 4 1,5/5 · godkänd; `p1-05` · underkänd | håller för Jakob vid P1 (2 av 3) |
| Rullas kring långsidan, Kling 4, mall 3 (`p4-04`) | en vändning, kortet +21 %, skjutet 160 px · Primär, "Kanske den bästa!"; returen Primär | Jakobs bästa giv till P4 (1 tagning) |
| Retur i samma film (tur och retur) | 0,5–4/5 · 16 av 21 godkända, två Primär | håller för Jakob |
| Platsen i ord (mall 5) till ytterplatserna | handen når P1 eller P7 i 4 av 5 (omgång 4); utan: 0 av 8 (omgång 3 och 3b) | håller för att nå platsen, inte P7 med WAN 3 |
| Släp från 2.2, WAN 3, stängt, 6 s | P1 cirka 7/9; P4 0/2; P7 0/2 | håller till P1 |
| Ingång 1 → 2.1, WAN 3, 4 s | 3,5/5 · Variant ("hon rör inte blicken") | håller; blicken nu i texten |
| Ingång, Kling 3.0 4K | 3/5 · Godkänd, "bra men tråkig"; ingen skärpevinst, 172 mot 80 krediter | håller utan vinst; beställs inte |
| Vila, WAN 3, 4–5 s | 1–3/5, munnen öppen i 4 av 6 · 8 av 8 godkända, 7 som Variant | håller för Jakob; munnen olöst |
| Vila för en ny uppsättning ur den gamlas vilor, lokalt (`tools/python/hands-from-anchor.py`), ingen kostnad | Tio av Casinots vilor för Tatuerad: åtta 4/5, två Variant 3/5 för slutskarven som källan redan har; 0 px av den gamla handen · "Myckert bra", ja i Beslut | håller där händerna ligger still (flytten högst 12 px, ingen vridning) |
| Korta vilor ur en film (`register-derived.ts --frames`) | `paow-vila-27-01-del2` (nick) · godkänd, "gillar dessa korta klipp!"; `-del1` · underkänd (ljud?); omgång 2 (`paow-vila-29`–`-31`, "Her lips stay closed and her shoulders and torso do not move") · godkända | håller |
| Tatuerat A2.1 ur Tatuerads A1: Kling 4, 4 s, första bild A1 och en målbild som sista bild, ingen referensfilm | Målbilden = förra provets sista ruta med nyphanden förminskad 10 % kring fingertoppen gav `paow-ingang-2-1-tatuerad-01`: 4/5, kortet inom 2 px och 2° · ja i Beslut. En riktig film som referens bär med sig sina händer | håller: ankaret `paow-nyp-tatuerad` är filmens sista ruta |
| Ankare 2.1, Nano Banana Pro, med posearm | 4/5 och 2/5 · t1 godkänd, t2 underkänd | höll (1 av 2); utan posebild oprövat |
| Ansiktsuttryck genom redigerad stillbild i grundrutan | `mcp/spegla.sh` (DRIFT till `f6f68ef`) | håller |

## Där granskaren och Jakob dömde olika

Hans dom gäller.

| Tagning | Granskaren (eller beställarens mått) | Jakob |
|---|---|---|
| `p1-04` Kling 4, P1, fri vändning | 1,5/5: tappat framför skon, skjutet cirka 790 px | "riktigt bra" |
| `p1-05` Kling 4 med referens, P1 | 3,5/5, bäst i omgång 4 | underkänd: "Här ändrar kortet färg ungefär halvvägs." |
| `p2-03` Kling 4, referens från ankare 2.2 | lagt framför skon, skjutet cirka 725 px | "det håller helt klart" |
| `p4-08` kort text, WAN 3, P4 | 1,5/5: gult blir blått utan kantruta | "Dena funkar!" |
| `p4-10` minimal text, Kling 4 | 1/5: snurr på kant, en andra rullning | "Ja, det här var bra." |
| `paow-giv-p4` t2, mall 3, Kling 4 | 2,5/5 | "Denna är bra" |
| `p4-12` stängd giv, WAN 3 | 3/5, bäst i omgång 2 | underkänd: gult kort kvar till plats fyra |
| `p4-14` t2 stängd giv, WAN 3 | 3,5/5 | underkänd: gult till gult |
| `2-2-p6-01` släp till P6, WAN 3 | faller (tryckt kort) | given Variant ("kan vara roliga och bra att ha"); returen underkänd |
| Givprov 2C, renderad vit docka som referens | 2/5 (dockans fel kopierade: glidning, kortet 25–35 % för stort) | "C nyp ser bra ut!" |
| Returerna i tur och retur, vilorna | 0,5–4/5 och 1–3/5 | 16 av 21 och 8 av 8 godkända |

## Oavgjort

| Metod | Belägg (V) | Status |
|---|---|---|
| H24: obrutet grepp, låg armbåge, referens i 24 fps; Kling 4, MINIMAL, 3 s | `paow-giv-2-3-p4-h24-03` t1: 4/5, Variant dömd åt Jakob; bevis i `take-1/review/` | orsaken till bättre takt är inte isolerad; ytterplatser och helkedja återstår |
| H24-cykel, P4.C1/C2: giv och låg återgång i samma 4 s, egen dockreferens i 24 fps | C1 `-cykel-01` föll på färger; `-02` giv 3/5, retur 4/5 (blåblekning); C2 `paow-giv-2-3-p4-c2-h24-cykel-01` giv 3/5, retur 4/5 | metodprov; övergången blankt–tryckt kort, ytterplats och hel giv återstår |
| Giv från A2.3 utan sista bild: Kling 4, 3 s, mall 12, dockfilmen svep24d i utdragen takt | P1, P2 4/5; P3, P4.C2 3/5; P5 2/5, föll (kortet 32 px för nära henne). Fingrarna vänder kortet med handleden stilla, som dockan | håller för plats 1–4, dömda åt Jakob; plats 5 behöver en sista bild |
| Retur som egen film till A2.3: Kling 4, 3 s, mall 13, ingen referensfilm | `paow-retur-2-3-p4-01`: 2/5, föll: ändarna och kortet håller, men handen stryker över filten till plats 1 och tillbaka | nästa prov byter bara meningen om vägen ("glides back low over the felt") mot en kort, rak väg till skon |
| Lång, kort eller minimal text | Jakobs godkända givar: Utförlig 2 av 4, Kort 8 av 16, Minimal 1 av 2 | våra domar skiljer inte; handboken §1 står |
| Öppen giv, Kling 4, utan referens | P4: `paow-giv-p4` t2, `p4-04`, `p4-10` godkända, `p4-07`, `paow-giv-p4` t1 underkända; P1 `p1-04` godkänd | oavgjort |
| Vändning vid platsen utan referens, WAN 3 | `p4-08` godkänd; `p3-02` Variant ("Riktigt rolig variant"); `p1-07` t2 underkänd; P7 0 av 2 | oavgjort |
| Giv bara dit med dockans film till P3 och P5 (givprov 2D, 2E) | P3 1/5 (kortet en remsa, det blå bleknar); P5 3/5 (handen lyfts och läggs om, eftersom sista bildens hand inte är dockans slut) | oavgjort; en sista bild vars hand slutar som dockans bör prövas |
| Ny utgångspose (kandidat till A2.3): kortet dras ut på filten, höger hand tar, vänder och lägger; Kling 4 utan referens | Prov `paow-ankare-2-3-b`: tvåbildsvändan 0 av 2 (vänt i brösthöjd eller över bakkanten); hela vändan med posen som mellanbild, 10 s: 3/5, posen passeras där texten ställer den | Jakob har inte dömt |
| Dealerns första kort, WAN 3 (`d-01`) | krymper till hälften och skjuts 63 px · godkänd ("Den är mycket bra.") | oavgjort (en tagning) |
| Vila ur text från en tatuerad A1, WAN 3, 5 s | `paow-vila-20` ja; ord om det som inte syns (bordet, spelarna, händerna) gav spelare och rum; bara ansiktsord: `-25`, `-26` Variant | ersatt av den lokala metoden; `-25` och `-26` inte införda |
| Hålkortet D.C2 från Tatuerads A2.3, stängt, giv och återgång, utanför Beställ | WAN 3 t1 lämnar kortet i luften (3/5); Kling 4 tomt fönster (2/5); WAN 3 t2 med "The card never leaves the felt" först: på filten hela vägen men en hand gör allt (3/5) | inget infört |
| Revansch med förra tagningen som video 2 (`paow-giv-2-3-p4-c2-02-revansch-1`) | samma film igen inom 0,7 px; 0 av 3 rättningar i texten slog igenom; felen kom ur video 1 | underkänd; en revansch rättar dockans film och beställs om ur den |

## Det som föll

| Metod | Belägg (V) | Status |
|---|---|---|
| Stängd giv till en spelarplats | Jakob godkände 1 av 5 (`p5-01`, sedan "gul till gult - kan inte godkänna"); planens spelarkort landar öppna | stängt bara för hålkortet |
| Kort text utan platsen i ord, WAN 3, alla platser (omgång 3 och 3b) | 12 av 14 föll, 1 960 krediter; ytterplatserna 0 av 8 | ersatt av mall 5 |
| WAN 3 till P7 (omgång 4 och 5) | 0 av 3: tryckt kort, kortet tillbaka i skon, ett andra blått kort | faller |
| Nyp-giv med referens till annan plats | b19 P1 med anmärkningar, P7 föll | faller |
| Öppen giv, WAN 3, utan referens, vändning i luften | b6 kortet 2× i luften; `p4-09` tryckt spelkort · underkänd | faller |
| WAN 3 med givprovens texter, utan referensfilm | 0 av 6 (kortet 19–41 % för långt i handen) | faller |
| Handbyte i given, Kling 4, mall 3 (`p1-01`) | 1/5 · underkänd: "Du måste ge AI lite utrymme." | faller (1 tagning) |
| Handbyte i given, WAN 3 utan referensfilm, mall 10 (`p4-16`) | 0 av 2: bytet i brösthöjd, färgbyte i bytet eller av sig självt | handbytet får inget eget undantag från receptet |
| Hela rundan i en tagning | 7 filmer, 0 användbara, cirka 3 500 krediter | faller |
| Mellanbild i Kling 4 | b1b, b4: läses som start, slut eller följd | faller |
| Kling 3.0 Motion Control, en annan dealers film | b1a 44/100; Prov `giv-motion-control` 0,5/5 och 1/5: kortet vänds inte; utan sista bild låses inte kortets storlek, plats eller sida | faller (3 filmer) |
| Avläst dockfilm med "with the same timing" och en text som säger annat | Sex givar från tatuerade A2.1 · fem underkända ("MÅSTE FINNAS METODFEL") | faller (handboken 3.2) |
| Aleph, aleph2, Kling 4 edit, WAN video-till-video, `edit_video` med egen nyckelruta | `paow-samma-film`: ansiktet byts, fönstret töms | faller |
| Ultrarapid som snabbas upp; uttaget baklänges; Seedance 2.5 via MCP (bara en förhandsfil) | DRIFT till `f6f68ef` | faller; för Seedance kanske hämtningen (S, handboken §4) |
| Hopklippta ankare, platt målad kortyta | för litet kort, fingertopp bredvid, tryckt framsida | faller |
| Ny person i en annans bankruta (stillbild, b23) | vaxig hud, kroppen 58 rader för kort | faller; redigera i stället |
| Ankare 2.2 som redigerad stillbild | tre ordrar, 1 av 6 användbar efter lagning (handboken 3.7) | faller utan lagning |
| 4K-filmmodell för skärpa | ingen skärpevinst, 172 mot 80 krediter | faller |
| Bildmodellen flyttar kameran (sidovy) | fyra försök, 160 krediter | faller |

## Mallarna 6–9

Äldre mallars ord står kvar i `SAY.v6` och `SAY.v8` i `src/order-prompts.ts`, så att deras ordrar återges ord för ord.
- **Mall 6:** kortets sidor bara med färg och vilken som är uppåt ("yellow side up", "blue side up"), efter Jakobs ord om
  "baksida". Mot mall 5 i två par gick båda på mall 6 fel vid vändningen; frågan om ordet "back" står öppen.
- **Mall 7:** åter "its back is yellow and its face is blue" (`SAY.colours`); hon rör sig lite medan hon delar ut
  (`SAY.moveOwn`, `SAY.moveBoth`); efter ett handbyte går den arm som är ute tillbaka (`SAY.backPass`); en stängd giv
  från nypet läggs plant framför skon och skjuts (`SAY.layAndSlide`); hålkortets vändning har bara hålkortet på sina
  bilder. Rörelsemeningen rörde henne men förstörde kortet i 15 av 18 tagningar.
- **Mall 8:** tar bort rörelsemeningen; givar slutar åter på "The other hand rests on the felt."
- **Mall 9:** (1) vändningen på vägen är en vridning av handleden i varje öppen giv: kortet hålls i kanten, handleden
  vrids över en gång, handen hålls vriden tills kortet ligger och vänds tom nedåt först då (`SAY.turnOnTheWay`,
  `SAY.layTurned`); `FREE` är i Beställ "Handleden vänder kortet på vägen", `LONG_EDGE` behåller sina ord och får samma
  slut. (2) Ett öppet släp från 2.2 dras längs filten under fingertopparna och tas i kanten på vägen (`SAY.dragTowards`,
  `SAY.takeOnTheWay`; vid handbyte `SAY.handoverDrag`). (3) Kortet är enfärgat, en gång (`SAY.colours`,
  `SAY.oneCardMoves`). En öppen giv som vänds på vägen blir cirka 70 ord längre.

## Lärdomar ur omgång 7–15

- Tillägget "Her eyes follow the card." rör blicken hela given men gör inte kortet bättre (två tagningar till P6).
- Hålkortet stängt med "lägg plant och skjut": 1 av 3 håller (`paow-giv-2-1-d-c2-03` t1). Hålkortets vändning med bara
  hålkortet på bilderna: 2 av 4 (`paow-halkort-04` t2, `paow-halkort-02` Variant). Utgången `paow-utgang-01` håller.
- Vilor med en handling i tillägget (`vila-09`–`-11`): 5 av 6 användbara för granskaren; hon gör ofta mer än beställt
  (blinkar tre gånger, lutar huvudet 16°), och andetaget tas med öppen mun.
- WAN 3 tar ett större steg var femte ruta (ryck i vridningar och armar); att jämna ut det i efterarbetet är oprövat.
- Tryck på en rekvisita (Scout Gaming-koppen) håller delvis, bättre med WAN 3 än Kling 4.
- En lyft hand ger ibland ett ritat grått bord under kanten (handboken §4): vinkningen `vila-19` och fingrarna `vila-15`,
  `vila-18`.
- Givar från 2.2 med släp, WAN 3, öppet: alla tre kort tryckta (omgång 13); tillägget om enfärgat kort (omgång 14, "The
  card is plain, one flat solid yellow from edge to edge on its back and one flat solid blue from edge to edge on its
  face, and the next card in the window is the same plain solid yellow.") gav `2-2-p6-02` enfärgat, Variant och retur
  godkänd; samma text med Kling 4 föll (1/5).
- In och ut ur 2.2, WAN 3, 4 s (omgång 15): ingången 1 av 2 ren, utgången 2 av 2 med rena skarvar; ansiktet är mjukare
  än ankaret vid skarven.
- Plats 6 från 2.1: fjorton tagningar (`paow-giv-2-1-p6-01`–`-10`) föll på samma mönster: kort väg från skon, kortet
  vänds i ett sudd eller byter sida utan kantruta. Oprövat: referensfilm och handbyte; platsen kan flyttas en bit från
  skon i planen.

## Öppna frågor

- **Hur hon rör sig utan att det kostar kortet.** Jakob vill att hon rör kropp, huvud och högerarm mer. Rörelsemeningen
  (mall 7) förstörde kortet; blicken ensam gav inget bättre kort; rörelsen i egna vilofilmer före eller efter given
  håller. Oprövat: en referensfilm där en hand rör sig medan den andra delar ut.
