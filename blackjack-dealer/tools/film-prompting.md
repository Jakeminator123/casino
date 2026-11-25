# Handbok: så komponeras en filmbeställning

Hur en beställning sätts ihop (bilder, referensfilm, text, modell, längd, tagningar) och vad som har hållit och fallit.
Slå upp ett avsnitt (sök på rubriken eller §-numret), läs inte hela. Ingången är [dealer-line.md](dealer-line.md);
[order-clerk.md](order-clerk.md) lägger beställningen, [film-review.md](film-review.md) granskar filmen, och
omgångarna står på protokollsidan [film-prov.md](film-prov.md).

**Märkning.** (V) = verifierat: läst i källan, liggaren, kvittot eller sett i rutor. (S) = skattat, inte prövat. Källtyp:
*Tillverkare*, *Praktiker* (namngiven, utan prov), *Hörsägen*. **Jakobs dom avgör**; där granskaren dömde annorlunda står
båda.

## Slutsats

1. **Bilderna säger vem och var, texten bara rörelsen.** Inget om hennes utseende; platsen i ord utan bildpunkter.
2. **En handling per film, ett kort, få led.** Vändningen sägs med en mening, en gång.
3. **Positivt formulerat, inga förbud.** Inga "not/never/without".
4. **En rörelse låses med en bild eller en referensfilm, inte med ord.**
5. **Allt som syns i en bild eller film följer med.** Fel sko, en annan dealers hand, ett föremål: modellen kopierar det.
6. **Två tagningar sållar, de avgör inget.** En metod blir regel först efter fler tagningar (§5).
7. **Jakob dömer kortet, granskaren måtten.** Han underkänner för kortets färg och vändning, ett tryckt eller gult kort
   i slutet och stelhet; ett kort som skjuts längs filten har han godkänt (`p1-04`) (V).
8. **Vilka sätt som håller räknas, de skrivs inte här.** `node tools/verdicts-per-method.ts` listar per steg vilka sätt
   (recept, modell, mall, tur och retur, slag av referensfilm) som håller, föll eller är oprövade, ur hans domar i
   banken och hans ja i Beslut (`beslut` i `data/order-methods.json`; `--tagningar` visar filmerna, `--alla` äldre
   mallar). Godkännandet släpper en pilot av ett oprövat sätt och ingen till förrän han har dömt dess film; ett sätt som
   föll godkänns inte förrän receptet är ändrat (`src/order-ways.ts`).

## 1. Reglerna med belägg

| Regel | Starkaste källa (Tillverkare, V) | Vårt eget belägg |
|---|---|---|
| 1 Bilderna bär vem och var | Runway Gen-4: "Focus on describing the motion, rather than the input image"; Alibaba: "Prompt = Motion + Camera movement"; Kling: "The prompt explains how the video moves between them" | b6 (127 ord, utseendet onämnt) användbar; men Jakobs bästa giv `paow-giv-2-1-p4-04` har mall 3 med utseende och förbud, 377 ord (V). Domarna bekräftar inte regeln; tillverkarnas råd står |
| 2 En handling, få led | Alibaba: "Keep actions simple and short", "One clip = one continuous shot"; Runway: "Avoid overly complex prompts" | Hela rundan i en tagning: 0 av 7, cirka 3 500 krediter. `paow-giv-p4` (åtta led på 7 s) vände kortet två gånger (V) |
| 3 Inga förbud | Runway: "Negative phrasing is not supported"; Kling 4: "Negative prompts can increase the likelihood of errors" | `paow-giv-p4`: åtta förbud, minst tre hände ändå (V); godkända givar per stil visar inget samband |
| 4 Bild eller film låser rörelsen | Kling 4: referensfilm för "moves and … timing in @Video1"; WAN 3: "to replicate … action choreography" | Kling 4 med bankens tur och retur till samma plats höll i b6, b17, b19, b20; referens till fel plats lägger kortet där referensen lägger det (b19 P7) (V) |
| 5 Bilden följer med | Runway I2V: "Visual artifacts … may be intensified" | Posebildens öppna sko ritades i båda tagningarna (ankare 2.2); en annan dealers referens tappar Paows tatuering i snabb rörelse (V) |
| 6 Två tagningar sållar | Jakob: två tagningar per klipp, en tredje om båda faller (BESKED, "Domar, beställningar och pengar") | Två lika metoder med 50 % lyckade ger 2–0 mot 0–2 av slump i ungefär 1 fall av 8 (S) |

**Där källorna säger emot varandra (V):** Klings egna exempel har förbud trots rådet; WAN:s promptomskrivare vill både
betona förändringen och beskriva kläder och bakgrund; Gen-4.5 sägs klara sekvenser, Gen-4 vill ha enkelhet; Google
säger för stillbilder "Be Hyper-Specific" med det oönskade sagt positivt. Runway säger att Seedance 2.5 tar nyckelbilder
och referenser samtidigt; vårt verktygs schema säger att bara `kling-4` tar första och sista bild med referensfilm.
Schemat gäller.

## 2. Formeln

**En rak linje.** Den som beställer väljer dealern, steget (som säger ankaret) och, för en film med kort, platsen och
kortet. Allt annat är stegets ENDA recept i `data/order-methods.json` (modell, upplösning, sekunder, tagningar, stil och
mall, form, vändning, regeln för referensfilmen, var sista bilden kommer ifrån), läst genom `recipeFor` i
`src/order-methods.ts`. Lagret fyller i receptet (`tools/order-store.ts`); Bordets rad, Ny beställning och
produktionslistan visar samma sak ur samma funktioner, och `studio/tests/line-same.test.ts` håller raden och lagret lika.
Det ett utkast säger emot receptet är ett medvetet undantag ("Receptet · gör ett undantag"), som utkastets anteckningar
nämner. Ett steg utan metod har inget förval, och där receptets regel inte hittar någon referensfilm beställs inget.
Stegen i `STEPS` (`src/order-model.ts`) säger bara vad en film går mellan, aldrig hur den beställs.

En beställning är en ren funktion av linjen och undantagen: samma val ger samma bilder, text, modell och kostnad. Texten
skrivs aldrig för hand; ändras den, ändras mallen och versionen räknas upp. Orden står i `SAY` i `src/order-prompts.ts`
(`TEMPLATE_VERSION` 12; en order återges med sin egen version, så äldre ord står kvar i `SAY.v6`, `SAY.v8` och
`SAY.v11`; mall 13–16 i `SAY.v13`–`SAY.v16`, se 3.5 och 3.8); reglerna och recepten står här. Kort är receptets stil,
Minimal Jakobs prov, Utförlig (mall 3) bara för jämförelse. Skiljer orden sig från reglerna här, rättas orden. Format,
filer och priser: [dealer-line.md](dealer-line.md), "Format och namn".

**Märket på kortet.** Filmkortets rygg är gul (stängt kort), framsidan blå (öppet kort), och varje sida bär sina märken
(BESKED, "Kortet"; färgerna och måtten i SYSTEM, "Ritade kort": `CARD_RGB`, `CARD_MARK`). Lagret ritar dem på
beställningens bild (`layCard` i `tools/order-images.ts`). Siffrorna står aldrig i en filmtext: texten säger bara "small
pink cross" och "small red dot", och bara när bilden visar märket: `markSeen` läser bildens egna punkter (också en A3
och en snittruta) och sparar `prompt.faceMark`, och Kort och Minimal säger då "its face is solid blue with a small pink
cross in the middle and a small red dot in one corner, as the last frame shows it"; för gula sidan `backMarkSeen`,
`prompt.backMark`: "with a filled red circle in the middle and a small pink cross near one end, as the first frame shows
it in the shoe's window". Utan märke i bilden är texten ord för ord som förut med samma version. Prövat (Prov
`paow-ankare-2-3-b`): kortet ligger till slut med märkena som i sista bilden; i handen ritas krysset större, och märket
hindrar inte färgbyte (V).

GIV-2.3 med KORT har en fast kortändevändning sedan mall 11: ett uttryckligt val av LONG_EDGE eller AT_PLACE avvisas före
sparning; MINIMAL låter referensfilmen beskriva vändningen. Den frysta placeringsplanens avsikt behålls separat.

**Varje sak sägs en gång** (Jakob: inga "dubbla typer av meningar"). I texten, för varje kombination linjen tillåter:
- skrivs ett ämne i en mening (kameran, referensfilmen, greppet ur skon, vändningen, läggningen, vägen tillbaka, den
  vilande handen, blicken, kortets utseende);
- sägs ett tillstånd i en bisats: vilken sida som är upp, "as in the last frame" och "as in the first frame" högst en
  gång i texten, "palm down" högst en gång på vägen dit och en gång tillbaka;
- står fem ord eller fler i följd inte två gånger, utom där samma sak NÄMNS två gånger;
- säger två meningar inte emot varandra, och ingen mening står två gånger.

Ett tillägg säger bara det mallen inte redan säger. Inget verktyg prövar ett tillägg, så den som skriver ett läser
först stegets text (skickade tillägg har både upprepat mallen och haft förbud och tidsangivelser). I studion visas bredvid ett val bara valets namn; rörelsen beskrivs bara av texten som skickas.

| Del | Kommer från valet | Regel |
|---|---|---|
| Första bild | Steget: ankaret det börjar på (1, 2.1, 2.2 eller 2.3), det som gäller i Material; en retur börjar på platsens landningsbild | Hel verklig ruta i bankens format, samma grönt, sko och ton som sista bilden |
| Sista bild | Receptets `lastPicture`. En giv bara dit slutar på PLATSENS EGEN slutbild (`seatEndOf` i `src/order-model.ts`): landningsbilden där en gäller, annars snittrutan, sista rutan i given i dealerns egen tur och retur från samma ankare till platsen, vars retur Jakob har godkänt rakt och som är lagd med samma hand (`cutFrameOf`; lagret tar rutan, prövar att kortet ligger på planens och sätter tillbaka skon ur ankare 1; den nya given bär `endsOn`). En plats med ingetdera beställs utan sista bild (förval: första bilden, den öppna givens text och referensfilmen; platsens A3 görs ur filmens sista ruta); en plats bild står aldrig för en annan. Övriga steg: ankaret de slutar på | Exakt samma kort som första bilden plus det enda som delas ut |
| Mellanbild | Ingen i vårt MCP | En extra referensbild är ingen tidsatt mellanbild (b1b, b4 läste den som start, slut eller följd) (V). Runways API för `kling_4` har mellanbilder (3.8); de kräver ett eget prov |
| Referensfilm | Receptets regel (`referenceByRule` i `src/order-methods.ts`, det enda stället som väljer): dockans film till platsen först (`data/rendered-references.json`), annars en film ur banken av samma steg till samma plats | Bara `kling-4`; obruten, 3–30 s, samma kortföljd och plats som sista bilden, rakt godkänd av Jakob, lagd med samma hand, för en giv bara dit given ensam; aldrig en arkiverad tagning; ytterplatserna bara dockans film; meningen `SAY.reference`. Samma kontroll som en levererad giv körs på den (`checkReference` i `src/deal-check.ts`): kortet på kant före vändningen eller större än ett verkligt kort erbjuds inte först |
| Text | Steg, plats; sidan ur planen; handen ur receptet (från A2.1 en hand, handen vid skon, inget handbyte som förval; från A2.3 två händer: vänster tar ut kortet, höger tar emot och vänder); vändningen ur receptet, ingen väljer den | Skelettet nedan |
| Modell, längd | Receptet. Med referensfilm filmens egen längd i hela sekunder ("with the same timing"), annars receptets; en giv bara dit 3 s, det kortaste Kling 4 tar (3–30 s; WAN 3 2–30 s). En riktig dealer lägger ett kort var 0,75–0,9 s | Tabellen nedan |
| Tagningar | 1 per metodprov, 2 per klipp när metoden är vald | En tredje bara om båda faller |

**Textens skelett, i denna ordning (film):** 1 `SAY.camera` ("Locked camera, one continuous shot."). 2 Med referensfilm
`SAY.reference`. 3 Handlingen i en mening, handen pekad ut genom var den är (`SAY.handAtShoe`), med platsen i ord
(`whereShort`). 4 Vändningen, bara om kortet landar öppet: exakt en av `turnAtPlace`, `turnOnTheWay`, `rollOnTheWay`
(§3.3). 5 Vägen tillbaka, bara i tur och retur (`backPinch`, `backDrag`). 6 Andra handen (`otherRests`). 7 Kortet
(`oneCardMoves`). 8 Jakobs tillägg, en positiv mening.

**Står aldrig i en filmtext:** utseende, kläder, hår; förbud eller "not/no/never/without"; bildpunkter; tidsangivelser
(WAN läser dem som scenlista, S); en andra handling; samma tillstånd två gånger. Så kort som skelettet tillåter
(recepttexterna i mall 12 är 36–267 ord). Den enda teckengräns linjen håller är tilläggets 600 tecken (`EXTRA_LIMIT`).

Receptens modell och längd står i `data/order-methods.json`; tabellen säger varför, med rörelsens längd mätt ruta för
ruta i 172 filmer (median och spann, V).

| Steg | Receptet | s | Varför |
|---|---|---|---|
| Ingång 1 → 2.1, 1 → 2.2 | WAN 3, 1080p | 4 | Ger bankens ruta direkt; 4K gav ingen skärpa. Rörelsen 3,6–3,9 s |
| Ingång 1 → 2.3 | Kling 4, 1080p, dockans film, mall 14 | 3 | Referensens längd; stillheten i slutet kommer ur referensen |
| Giv bara dit från 2.1, 2.2 | Kling 4, 1080p, referensfilm | 3 | Filmen följer referensens takt |
| Giv från 2.3 (GIV-2.3) | Kling 4, giv och återgång i en film, mall 15 | 4 | Jakobs ja (gäller) |
| Giv tur och retur (undantag) | Kling 4 eller WAN 3 | 7 från 2.1, 6 från 2.2 | Rörelsen fyller filmen; i Paows bank tar given 4,1 s och returen 2,7 s av 7 |
| Vändningen som egen film | Prov: WAN 3 och Kling 4 | 3 | Oprövat |
| Retur som egen film | RETUR-2.3 och RETUR-1: Kling 4, mall 13 (`SAY.v13`), prov; till 2.1 och 2.2 ingen metod | 3 | Kort väg, kort film |
| Utgång 2.1 → 1, 2.2 → 1 | WAN 3, 1080p | 4 | Rörelsen 3,6–3,8 s |
| Hålkortet | WAN 3, 1080p | 5 | Rörelsen 4,2–4,8 s |
| Vila | WAN 3, 1080p | 4 | Samma bild först och sist; 0,4 s stilla i var ände är skarven texten ber om |
| Stillbild (ankare, landning) | Nano Banana Pro, 4K, 4:3 | – | Redigerar dealerns egen bild (`@anchor`) efter texten, utan posebild |

De givar Jakob har godkänt tar cirka 4 s; om 3 s är för snabbt är hans smak, och en längre giv är en längre
referensfilm. En sekund till kostar cirka 21 krediter per film (Kling 4, 1080p). Billig sållning: WAN 3 i 480p, 5
krediter per s (`data/order-policy.json`). Kling 3.0 4K beställs inte (`MODELS['kling-3-4k'].off`: ingen skärpevinst,
172 krediter mot 80). Seedance 2.5 i 1080p kostar 68 per s plus 34 per s referensfilm: en 7 s giv går över taket 400.

## 3. Recept per steg

Orden står i `SAY`; här står vad som har hållit och varför. Takeförkortning: `p4-11` = `paow-giv-2-1-p4-11`.

### 3.1 Ingång: ankare 1 → 2.1 och → 2.2
- Orden: `SAY.reach['2.1']` eller `['2.2']`, `SAY.eyes`, `SAY.otherRests`; WAN 3, 1080p, 4 s, två tagningar. Blicken är
  med för att Jakob saknade den ("hon rör inte blicken"). Recepten till och från 2.2 bär tillägget om det enfärgade
  kortet i fönstret, recepten till och från 2.1 inte. Ingången till 2.3: `SAY.reach['2.3']` och `SAY.eyesStay`.
- Har hållit: `paow-ingang-2-1-01` (Variant) och `-02` (Godkänd, "bra men tråkig") (V).
- Har fallit: båda rörde fönstrets ram före kortet; troligen geometrin (S). Ordet "rim" är struket.

### 3.2 Giv med nyp från ankare 2.1
- **Med referensfilm (det som har hållit):** Kling 4, referens = en rakt godkänd film **till samma plats**. Höll: b6,
  b17, b19, b20, `p4-11` (Jakob: "Tack!"), `p1-08` t2; föll: referens till annan plats (b19 P1, P7) (V). En referens från
  en annan startpose (`p2-03`, ett släp) lade kortet framför skon och sköt det till platsen; Jakob godkände (V).
- **Vad referensen bär (nio tagningar, V):** väg, takt, kortets skenbara storlek och var kortet är på kant kommer ur
  referensen; utseende, sko och var kortet ligger ur bilderna. Till P1 vände modellen kortet där referensen visar det på
  kant, i svingen ur fönstret, och bar det 15–30 % för stort: referensen väljs efter vad den visar (S). Handen läggs om i
  slutet när sista bildens hand inte är referensens.
- Risk: en annan dealers film som referens läcker hennes hand in (V). Studion stoppar bara hela bilder av en annan
  dealer; en annan dealers film som referens tillåter Jakob (order-clerk §3).
- **Utan referens:** `p4-04` (mall 3, rullas kring långsidan) är Jakobs Primär fast kortet lyfts och växer cirka 21 %;
  `p1-06` (WAN 3, fri vändning) Primär; `p1-04` godkänd fast kortet sköts cirka 790 px (V).
- Bankens givar vänder kortet i luften, inte vid platsen (V).
- **Avläst dockfilm mot en text som säger något annat** (sex givar från det tatuerade A2.1, mall 12): Jakob underkände
  fem av sex ("MÅSTE FINNAS METODFEL"). Kling följde dockan inom några rutor, inte texten (lyft till axelhöjd, lagt
  före platsen och skjutet, lagt gult och vänt efteråt), och där text och docka sade olika färg bytte kortet färg utan
  vändning; rutmåtten fångade inget. Det som har hållit: en BYGGD naturlig cykel, lika lång som filmen, som "rough
  guide" med en text som beskriver samma rörelse, eller ingen dockfilm alls. Se dockfilmen som kontaktark före ordern,
  och visa Jakob en pilot i spelstorlek före resten.

### 3.3 Vändningen vid platsen (Jakobs sex steg)
Nyp, Dra, För fram, Vrid, Vänd upp, Lägg: kortet ligger gult upp hela vägen och vänds först vid platsen. Av 22
tagningar vände fyra vid platsen; ledande är referensfilm till samma plats med vändningen i texten (`p1-08`, 2 av 2;
t2 godkänd) (V). Metodregistret beställer i dag varje giv bara dit med Kling 4, kort text, 3 s och referensfilm, alla
med status `prov`; där receptet lämnar vändningen till planen är förvalet fri vändning (`defaultFlip`), eftersom planen
säger "i luften" på alla 16 kort (V).

**Vändning A, "tummen lyfter, kortet fälls över"** (Jakobs skiss, `SAY.turnAtPlace`; S, oprövad som bild): kortets
långsidor mot spelaren; tummen glider in under den inre långsidan och lyfter den, underarmen roterar utåt, den yttre
långsidan ligger kvar som gångjärn; kortet står på kant med tummen på den blå sidan och fälls över, tummen följer med
ned på framsidan.

**Vändning B, nyckelvridningen, giltig.** Jakob: "Båda dessa två sätt är giltiga […] Huvudsaken är att rätt sida kommer
upp mot spelaren och att korten har symetriskt samma storkel som de rimligen borde ha […] och att det är gult till blått
som görs." Belägget är nio bra vändningar i full upplösning (V):
1. Korta filmer med en handling var: given bara dit och returen som egen film.
2. Kortet hålls i sin kortända mellan tumme och fingrar, den breda sidan mot kameran.
3. Hand och kort vänds tillsammans, en gång, kring kortets långa axel: gult smalnar till en tunn ljus kant i 2–5 rutor
   och blått öppnar sig.
4. Handen stannar vriden tills kortet ligger; handflatan pekar aldrig uppåt när kortet läggs.
5. Kortet syns slätt redan i första bilden (att det hjälper är S).
6. Texten säger det kameran ser ("the broad yellow back is seen, then the thin pale edge, then the broad plain blue
   face") (S).

En platt handrygg över kortet är aldrig slutet på en vändning (Jakob). **Metoder i den ordning de prövas:** 0
referensfilm till samma plats och vändningen i texten (Kling 4, ledande); 1 text i en giv bara dit; 2 vändningen som
egen film mellan stillbilderna Före och Efter (kräver en ny nod i banken); 3 referensfilm av Jakobs egen hand (3.8); 4
renderat kort (hjälper bara med rätt hand). En metod går vidare om minst 1 av 4 tagningar vänder kortet en gång vid
platsen så som en hand kan, med kortet inom ±10 % (film-review §3–4).

### 3.4 Giv med släp från ankare 2.2 (stängt kort)
- Orden: `SAY.slideOut`, `SAY.dragBack`, `SAY.stopFlat`, `SAY.backDrag` (sidan som är upp sägs i släpet). Tur och retur
  med WAN 3, 6 s höll till P1 (cirka 7 av 9); föll till P4 och P7 (0 av 2 var) (V). Pröva P1 först.
- **Öppet, bara dit med referens:** Kling 4, sista bild snittrutan ur en godkänd tur och retur, referensen ett rakt
  godkänt släp till samma plats: 2 av 2 användbara med anmärkningar till P4 (kortet vänds genom kantläget som i
  referensen, läggs 0–1 px från sista bilden; turkos kring kanten, kortet växer på släpet) (V). Bara P4 är prövat.
- Förutsättning: ett ankare 2.2 som gäller (i dag `paow-ankare-2-2-blick-a`). Med fönsterskon, öppet kort och vändning
  vid platsen: P4 och P6 Variant men med tryckt kort, P6 enfärgat när tillägget om enfärgat kort står i ordern.

### 3.5 Retur
- **I samma film som given:** Jakob har godkänt 16 av 21 returer och underkänt dem för kortet (gult kort som dyker upp,
  tryckt kort). Hans dom gäller: returen i tur och retur håller, också med en knytnäve i brösthöjd.
- **Som egen film** (`RETUR-2.1`, `-2.2`, `-1`): från landningsbilden till ankaret, orden `SAY.liftOff` och `SAY.glideTo`.
  En film som startar på en annan films ruta skiftar cirka 5 nivåer i ton (V); därför en stillbild som första bild.
  RETUR-2.3 och RETUR-1 har recept med mall 13 (`SAY.v13`). Returen till 2.3 (Kling 4, 3 s, prov): `SAY.liftOffRight` och
  `SAY.glideBeside`; första provet föll på vägen ("glides back low over the felt" blev en hand som stryker över bordet),
  och nästa byter bara den meningen mot en kort, rak väg till skon ([film-prov.md](film-prov.md)).

### 3.6 Vila
- Orden: `SAY.rest` plus en liten handling som tillägg: `takes one slow, deep breath`, `smiles briefly`, `nods once`,
  `straightens her back`, `taps her fingers once on the felt`. WAN 3, 4 s, första och sista bild = ankare 1. Tillägget
  säger handlingen, inte när: mallen säger redan att hon står stilla den sista halva sekunden.
- Jakob godkände alla åtta (`paow-vila-01` rakt, 02–08 som Variant). Granskaren fällde mest för munnen; "her lips stay
  together as the corners of her mouth lift a little" gav leendet med stängda läppar (`paow-vila-10`), men ett andetag
  togs ändå med öppen mun (V).
- En ny uppsättning med samma kropp och kläder får sina vilor lokalt ur den gamlas, utan beställning:
  `tools/python/hands-from-anchor.py` lägger den nya A1-bildens händer över filmens och flyttar dem med varje hands egen
  rörelse; håller där händerna ligger still (Jakobs ja). En vila ur text beställs bara för en ny rörelse, och texten
  nämner då bara ansiktet: ord om bordet, spelarna eller händerna lägger WAN 3 in i bilden.
- Korta vilor ur EN film: kommer hon tillbaka till A1 mitt i filmen klipps den där till två vilor
  (`node tools/register-derived.ts ... --frames <a>-<b>`, `sourceFrames`). Det håller med två mycket små
  ansiktsrörelser och "Halfway through she is exactly as in the first frame again and holds still" emellan.

### 3.7 Stillbilder: ankare 2.1, 2.2, landningsbild
Nano Banana Pro, 4K, 4:3, `referenceImages` `@anchor` (dealerns egen bild) och texten; ingen posebild, och dockan är
posekällan framåt. Detaljerat får det vara, men det oönskade sägs positivt ("one card", inte "no second card"). Orden:
`SAY.still*`, `STANDARD_STILL` och `SAY.stillChange` (vad handen gör).

```
This is an edit of the picture @anchor. Keep everything in @anchor exactly as it is: the framing and camera, the flat chroma-green background and table, the black card shoe at the right with the yellow card in its window, and the woman's face, hair, clothes, build and her hand at the left of the picture. Change only her hand nearest the shoe: it rests at the blue card lying flat on the felt in front of her, the tips of her forefinger and middle finger on the card's edge nearest her, the wrist raised above the knuckles and the thumb free beside the card. [STANDARD_STILL] There is one card on the felt and one in the shoe, each the size and shape of the card in the window.
```
- Exemplet är **landningsbilden** (S, oprövad): `@anchor` = ankare 1 med kortet ritat där planen säger; efteråt ritas
  kortet om ur planen och skon tas från ankare 1 (`tools/python/skolagning-21.py`, order-clerk §5).
- **Ankare 2.1:** `paow-ankare-2-1` t1 godkänd, t2 underkänd (dubbla kort); ordern hade en posebild (V).
- **Ankare 2.2:** 1 av 6 tagningar, och bara efter lagning; bildmodellen ritade om skon varje gång (V). Lagningen:
  skolagningen (ankare 1:s sko och kort i fönstret), `fillDark` och lokala lagningar. Oprövat: en ruta ur en film som
  börjar på ankare 2.1. En runda kan dela en plats från ankare 2.2 (`SEAT_HUB`, SYSTEM).

### 3.8 Referensfilm, Motion Control och Jakobs egen hand
`RUNWAY_DEALER.md` (Jakobs externa genomgång) är råd, inte orderinstruktion; Beställ, mallarna och Jakobs val gäller.
Modellstöd i dokumentationen är inte samma sak som ett fält i vår anslutning. Hand, grepp och mål kommer från ordern.

| Problem | Möjligt prov, inte nytt förval | Kontroll före provet |
| --- | --- | --- |
| Landning/släpp på fel plats | Kling 4: start, kontaktbild, slut | API `kling_4` har upp till åtta mellanbilder; vårt MCP `kling-4` bara start/slut och referenser |
| Onaturlig handbana | Kort verklig giv som rörelsereferens, Kling 4 mot befintligt recept | Rätt plats och samma kameraperspektiv; en referens garanterar inte följsamhet |
| Alternativ rörelsemodell | Seedance 2.5 (MCP `seedance-2.5`, API `seedance2_5`) | Referensläge och start/slut-läge är olika kontrakt; byt inte bara modell-id i Kling-ordern |
| Enkel blick/vila | Gen-4.5 (MCP `gen-4.5`, API `gen4.5`) | Inte belagt bättre på kortgrepp |

Runways [Seedance-guide](https://runway.com/resources/seedance-2-5-prompt-guide) ger varje referens en uttrycklig roll;
ta den strukturen, inte flerscensupplägget. [API-kontraktet](https://docs.dev.runwayml.com/api.md) och
[OpenAPI](https://docs.dev.runwayml.com/openapi.json) styr tillåtna kombinationer; färsk `whoami` och verktygsschemat
styr vad vår klient kan skicka. Ändra en sak mot en känd giv; mät enligt `film-review.md`.

**Mallarna efter 12** (en order skrivs med receptets mall utan att säga något; annars `--mall <n>` per order):
- **Mall 14** (receptet för INGANG-2.3): mall 12 ord för ord utom två meningar i Kort. `SAY.reference` säger att video 1
  är en grov ledning, händerna samma väg vid ungefär samma ögonblick, och att hon framför allt rör sig naturligt (Jakob:
  dockans filmer "lite lite robotliknande"; BESKED); video 1 visar bara rörelsen. Ingången till 2.3 säger att den andra
  handen slutar platt på filten framför henne (`paow-ankare-2-3-c`). Den minimala texten skrivs med mall 12.
- **Mall 15** (receptet för GIV-2.3, giv och återgång i en film, 4 s): mall 14 plus tre meningar: handen plan över
  kortet med rak handled när det kommer ned, tillbaka lågt med handflatan ned, ett gult kort i skons fönster hela tiden.
  Dockans film med plan hand (`docka-cykel.ts --flat-hand`). Kvar: vändningen görs med en hand kring långsidan, och
  fingret glider över kortet på vägen tillbaka.
- **Mall 16** (stängt kort från A2.3, `--mall 16`): andra handen lägger fingertopparna plant på kortet och skjuter det
  med gula sidan upp, och kortet beskrivs bara som gult; öppna kort är mall 15 ord för ord. Utfall: gult i alla rutor,
  kortet 0 px från planen (V).

**Kort rörelse, stilla slut.** Ändra inte receptet för befintliga ordrar. `tools/film-after.ts` föreslår en kortning i
`after.json.stillAnchorTail` bara om minst 0,4 s i slutet ligger inom två färgsteg per kanal från både slutankaret och
den första stilla rutan (hela bilden jämförs). Förslaget klipper inget: behåll originalet, gör en härledd film med
rutmappning, uppdatera kortspår och domarrutor och granska skarven.

**Kling 3.0 Motion Control** (V): en karaktärsbild och en rörelsefilm, 3–30 s, en person med hela överkroppen, obruten.
Vårt verktyg ger **ingen sista bild** (`kling-3-motion-control` tar inte `endFrame`). Provet b1a: kortet genomskinligt,
skons fönster tomt, landning 73 px fel. **En annan dealers film driver inte Paows ankare via Motion Control;** den kan
driva hennes rörelse som referensfilm i Kling 4 med första och sista bild (3.2). Act-Two finns inte i vårt verktyg.

**Jakobs egen hand med telefonen** är bättre när ingen godkänd bankfilm visar rörelsen och ingen annan dealer ska in
(S): telefonen på stativ, låst och liggande där bankens kamera står; en låda som sko till höger; ett kort med gul
baksida och blå framsida; matt slät duk, jämnt ljus framifrån, lång svart ärm, inga ringar; andra handen platt.
Verkligt tempo (uppsnabbad ultrarapid föll, V); börja och sluta i ankarets pose, en obruten tagning på 4–8 s till
orderns plats, flera tagningar. Risk: Jakobs hand läcker in.

### 3.9 Helfigur: hon kommer in och sätter sig, hon reser sig och går
Beställ har inget steg för den; Paows par (552 krediter) gjordes så (`assets/motions/paow-table-arrive-wide-01/`,
`paow-table-leave-wide-01/`):
1. Den breda ramen: 2088 × 1174 i halv skala, dealerkantens mitt i (1044, 656) (`motion.frame`, SYSTEM).
2. Tre stillbilder utan bildmodell: tom ram med en ljusare grön skiva, ankare 1 i halv skala utan sko, och den stående
   keystonen med ögonen 165,5 px över de sittande.
3. Varje film är två delar som möts i den stående bilden: in = går in + sätter sig; ut = reser sig + går ut.
4. Kling 4, 1080p, 16:9, första och sista bild, kort text utan förbud, 3–6 s per del; ljudet tas bort.
5. Texten säger vart hon går och att hon är lika hög hela vägen ("the same height as in the last image the whole way"),
   och skivan som "the flat lighter green rectangle"; skivan målas efteråt i varje rutas bakgrundsgröna.
6. Sätter sig: "brings both hands forward, close to her body".
7. Delarna sätts ihop i den stående bilden; posten får `motion.frame` med `layer: "BEHIND_TABLE"`.

## 4. Felsökning

| Fel | Sett i (V) | Trolig orsak (S) | Ändring |
|---|---|---|---|
| Kortet vänds två gånger, eller tillbaka | `paow-giv-p4` t1, `p4-07`, `p5-01` | Vändningen i flera led | En mening, "once"; lås med bild eller referens |
| Färgbyte utan kantruta, fel färg i slutet | `p1-05`, `p1-08` t2 retur, `p4-13`, `p4-07` | Kortet visas tidigt och vänds tillbaka, eller vänds utan synlig kant | Referens till samma plats och vändningen vid platsen |
| Gult kort kvar | `p1-07` t2 (Jakob: "back" kan läsas som undersidan) | Ordet "back" | Sidorna sägs bara med färg och vilken som är uppåt (mall 6) |
| Kortet kapas när det läggs ned | `p1-08` t1 | Okänd | Omtagning |
| Tryckt spelkort i stället för enfärgat | `p4-09`, omgång 3, `p4-12`, `p3-01`, `p7-03`, `p7-05` | Modellen fyller i en kortframsida | `SAY.colours`; går inte att laga, spåraren följer det inte |
| Kortet läggs framför henne, handen når inte ytterplatsen | Omgång 3 och 3b: P1, P2, P6, P7 0 av 8 | "to its place" utan plats | Platsen i ord (mall 5) |
| Slutbildens kort dyker upp av sig självt | `p1-03`, `p2-02`, `p7-02` | Handen når inte dit | Som ovan |
| Kortet läggs före platsen och skjuts dit | `p1-04`, `p2-03`, `p4-14` t2 | Vändning i luften; referens från en annan startpose | Inget fel i sig (Jakob godkände `p1-04` och `p2-03`); ange sträckan |
| Kortet växer eller krymper | `p4-04` +21 %, `p3-02` +47–70 %, b17 1,5× | Kortet lyfts mot kameran | Lågt längs filten; mät ±10 %; inte lagbart |
| Hon lutar sig långt ut | `p1-05`, `p1-06` | Ytterplatsen långt bort | Handbyte från P1–P3 (oprövat) |
| Hon är stel | `p4-09`, `p4-12`, `p5-03` | `SAY.otherRests` håller allt annat stilla (S) | Öppen fråga (film-prov.md) |
| Knytnäve i brösthöjd på returen | `paow-giv-p4` t1, `p4-04` | Retur i samma film | Jakob godkänner ändå; ingen ändring |
| Fingertopp på fönstrets ram | Ingångarna | Geometrin | Ordet "rim" struket |
| Skon flyttad eller fel sko (stillbild) | Ankare 2.2 | Bildmodellen ritar om skon | Skolagningen och lokal lagning (3.7) |
| Kroppen kapad, skon omritad (stillbild) | 12–40 rader ovanför bordsraden | Bildmodellen | `tools/still-after.ts` (fyll-morkt), `tools/python/skolagning-21.py`; `tools/python/forlang-plagg.py` för ett ljust plagg |
| Ett andra kort | Hel runda, ankare 2.1 t2, `p7-01` | Flera kort, bilderna stämmer inte | Ett kort per film; samma kort i första och sista bild |
| Ansiktet mjuknar, tatueringar suddas | Kling 4; 4K-ingången | Modellen | WAN 3 för vila och ingång |
| Grönt glider eller pulserar | WAN på 6 s; Kling 4 i 30 s | Långa filmer, olika grönt | Kort film; samma grönt i bilderna; `level` |
| Hopp eller scenbyte | Kling 4 i 30 s | Klings scenindelning | Kort film, "one continuous shot" |
| Ett grått bord ritas under kanten och står kvar (en hand lyfts) | WAN 3, 4 av 10 filmer där en hand lyfts | Okänd | Känd risk; en ny tagning av samma order har varit ren. Läs film-afters anteckning ("kropp slutar … sista" långt under 831) och mät under kanten innan filmen förs in |
| Den hämtade filmen är en förhandsfil (låg bitrate) | Rapporterat för Seedance (cirka 1 Mbit/s); våra hämtningar: WAN 3 15–19, Kling 4 5,1–6,6 Mbit/s | Uppgiftens svar pekar på en förhandsfil (S) | Räkna bitraten efter varje hämtning (`file.bytes` × 8 / sekunder ur `fetched.json`, eller `ffprobe`); nära 1 Mbit/s: hämta ur listan över senaste generationer (`list_recent`) |

## 5. Prov och protokoll

- **En ändring per order**, mot en namngiven jämförelse som har hållit, med samma bilder och längd; ordens titel säger
  vad som ändrades. En tagning per metodprov, två per klipp när metoden är vald (BESKED, "Två tagningar per klipp").
- **En ytterplats först:** pröva P1 och P7 innan en metod beställs till alla (omgång 3 och 3b: 12 av 14 föll, 1 960
  krediter, V). Att skilja 25 % från 75 % lyckade kräver 6–8 tagningar (S).
- **Granskning:** först den automatiska kontrollen (`src/deal-check.ts`, `dealCheck` i `after.json`): det Jakob fäller på
  synen (färgbyte utan kantläge, vänt tillbaka, på kant en gång till, fel sida upp, lagt gult och vänt efteråt, ett
  kort långt från ett verkligt korts storlek, fel plats, tryck, ett andra kort) fäller tagningen före granskaren; det
  granskaren mäter och han inte fäller på (ljus kant, kortet glider utan finger, hopp sist, stilla start) är
  anmärkningar. Sedan oberoende granskare enligt [film-review.md](film-review.md), poäng 0–5 per del. För en giv alltid:
  ett kort? vänds det en gång, och var? lämnar kortet filten eller fingrarna före platsen? storleken ±10 %? enfärgat
  hela vägen? går handen tillbaka lågt?
- **Jakobs dom** skrivs bara av honom i Granska (`review` i filmens post); citera hans ord, skriv inte om dem.
- Den som provar förlänger tabellerna i [film-prov.md](film-prov.md) (håller, oavgjort, föll, med belägg per metod);
  ingen dagbok, en ersatt rad skrivs om. Metoden som beställs per steg står i `data/order-methods.json`.

**Regler för en giv med referensfilm:**

1. Väg, takt, kortets storlek i handen och ögonblicket på kant kommer ur referensfilmen; vem hon är, skon och var kortet
   ligger ur bilderna (3.2). En referens väljs efter vad den visar och mäts innan den används.
2. Från ankare 2.1: nyp, bär i luften, nyckelvridning mitt på vägen, lägg, skjut sista biten under fingertopparna, vila
   med fingertopparna kvar. Handen vänds en gång, i luften, aldrig i slutet.
3. Från ankare 2.2 släpas kortet plant, tas i kanten och vänds först nära platsen.
4. Referensfilmen ska sluta som sista bilden (handens sida och fingrarna på kortet), annars hittar Kling på slutet;
   arket över det som skickas visar referensens sista ruta bredvid sista bilden.
5. Blicken måste stå i ankaret och i sista bilden: referensfilmen styr den vilande handen men inte huvudet.
6. Att kortet glider lite efter att fingrarna har släppt är en anmärkning och inget fall; det den automatiska
   kontrollen fäller står i `src/deal-check.ts`.

**Oprövat:** referensfilm eller handbyte till plats 6; retur som egen film till ankare 1, 2.1 och 2.2; vändningen som
egen film; ankare 2.2 som ruta ur en film; referensfilm av Jakobs hand; renderat kort i vändningens rutor.

## 6. Källor

Tillverkare, lästa 2026-11-13:
- Runway: [Gen-4 Video Prompting Guide](https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide),
  [Image to Video Prompting Guide](https://help.runwayml.com/hc/en-us/articles/48324313115155-Image-to-Video-Prompting-Guide),
  [Prompting Guide](https://academy.runwayml.com/prompt-guide),
  [Gen-4.5](https://help.runwayml.com/hc/en-us/articles/46974685288467-Creating-with-Gen-4-5),
  [Kling 3.0 Motion Control](https://help.runwayml.com/hc/en-us/articles/50280558448147-Creating-with-Kling-3-0-Motion-Control),
  [Act-Two](https://help.runwayml.com/hc/en-us/articles/42311337895827-Performance-Capture-with-Act-Two),
  [Seedance 2.5](https://help.runwayml.com/hc/en-us/articles/53542207042323-Creating-with-Seedance-2-5),
  [API-prislista](https://docs.dev.runwayml.com/guides/pricing/); verktygen `generate_video` och `generate_image`
  (modelltabell, `endFrame`, `referenceVideos`, `ratio`).
- Kling: [Kling 4.0 User Guide](https://kling.ai/quickstart/kling-4-model-user-guide),
  [multiple keyframes](https://kling.ai/blog/kling-4-multiple-keyframes-guide),
  [start and end frames](https://kling.ai/quickstart/ai-video-start-end-frames),
  [Motion Control](https://kling.ai/quickstart/motion-control-user-guide).
- Alibaba: [Wan 3.0 video generation](https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-guide),
  [Video generation prompt guide](https://www.alibabacloud.com/help/en/model-studio/text-to-video-prompt),
  [Wan2.1 `prompt_extend.py`](https://raw.githubusercontent.com/Wan-Video/Wan2.1/main/wan/utils/prompt_extend.py).
- Google: [Gemini image generation, Best Practices](https://aistudio.google.com/docs/image-generation).
- Hörsägen: [Cliprise, Kling 3 Motion Control guide](https://www.cliprise.app/learn/guides/model-guides/kling-3-motion-control-complete-guide).
- Våra: kvitton `assets/orders/*/receipt.json`; protokollet `node tools/order-ledger.ts`; Prov `paow-plats-4-som-mall`,
  `paow-kavaj-filmer`, `paow-samma-film`, `hel-runda-i-en-tagning`; Jakobs domar i `data/motions.jsonl`.
