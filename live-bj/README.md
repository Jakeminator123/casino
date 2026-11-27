# live-bj

En riktig dealers arbete vid ett livebord, mätt ur en film: hur händerna rör sig, var de vilar, hur kroppen följer med,
vart han tittar, hur ofta han blinkar, hur korten går från skon till bordet och hur kameran står. Talen är förlaga för
dockans rörelser. Reglerna för mappen står i [AGENTS.md](AGENTS.md).

Filmen är `https://www.youtube.com/watch?v=OKSnPf75PeU` (17 min 20 s, 1920×1080, 60 rutor i sekunden): en
skärminspelning av ett bord med en fast kamera och två dealers efter varandra (bytet sker vid 474–500 s).

## Kartan

| Var | Vad | I Git |
| --- | --- | --- |
| `verktyg/` | Verktygen nedan. Användningen står överst i varje fil. | ja |
| `data/` | De små sammanställningarna i tal: `kalla.json` (bordsbildens ruta och de rena partierna), `faser.json` (spelets skyltar genom filmen och rundorna), `monster.json` (varje handrörelse, blinkning och huvudrörelse per dealer; en rad på 230 KB, läs den med sin sökväg), `scen.json` (kameran och bordets fasta saker), `stil-kameran.json` och `stil-bordet.json` (vardera dealerns sätt att ge, i meter, grader och sekunder: det dockan läser), `rorelser.json` (allt de gör, i stycken och slag). | ja |
| `video/` | Filmen, `kalla.mp4`. | nej |
| `matt/` | Måtten per ruta, en fil per rent parti (`rorelse-<start>.json`). Görs om med `mat.py`. | nej |
| `rutor/` | Ark och filmer att titta på: `oversikt/` (hela filmen i små rutor), `kontroll/` (måtten ritade över filmen), `streck-*.mp4`. | nej |
| `.venv/` | Nedladdaren `yt-dlp`. | nej |

## Körningen, i ordning

Allt körs från repots rot. `PY` är `blackjack-dealer/tools/python/.venv/Scripts/python.exe -I`.

| Steg | Kommando | Ger |
| --- | --- | --- |
| Hämta filmen | `live-bj/.venv/Scripts/yt-dlp --no-playlist --js-runtimes node -f 299 -o "live-bj/video/kalla.%(ext)s" <adressen>` | `video/kalla.mp4`, utan ljud. Miljön görs med `python -m venv live-bj/.venv` och `pip install yt-dlp`. Ingen inloggning behövdes. |
| Hitta bordsbilden | `PY live-bj/verktyg/ram.py live-bj/video/kalla.mp4 live-bj/data/kalla.json` | Bildens ruta i skärminspelningen och de 18 partier (876 av 1040 s) där den visas orörd. |
| Läs skyltarna | `PY live-bj/verktyg/faser.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/data/faser.json` | Vilken skylt som stod när ("Dealing", "Make your decision" ...) och rundorna. Tar 5 minuter. |
| Mät dealern | `PY live-bj/verktyg/mat.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt --del 0/5` (fem körningar, `0/5` till `4/5`) | Kroppen, båda händerna och ansiktet i varannan ruta. Tar 40 minuter med fem körningar bredvid varandra. |
| Räkna ut mönstret | `PY live-bj/verktyg/monster.py live-bj/data/kalla.json live-bj/data/faser.json live-bj/matt live-bj/data/monster.json` | Varje handrörelse, blinkning, sänkt blick och huvudrörelse, och sammanställningen per dealer. |
| Skriv stilarna | `PY live-bj/verktyg/stil.py live-bj/data live-bj/matt` | `data/stil-kameran.json` och `data/stil-bordet.json`: takten, fartkurvorna, handbytet, bålen, huvudet, blicken, blinkningarna, vilan, den andra handen och greppet, med hur varje tal är mätt. Behöver `data/scen.json`. |
| Dela upp i stycken | `PY live-bj/verktyg/rorelser.py live-bj/data live-bj/matt` (`--visa <a> <b>` skriver ut handrörelserna mellan två sekunder med platserna de fick) | `data/rorelser.json`: varje stycke med slag, rutor, händer och om det är rent nog att rita efter. |
| Titta på måtten | `PY live-bj/verktyg/titta.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt live-bj/rutor/kontroll/<namn>.jpg <sekund> ...` | Ett ark med måtten ritade över filmens rutor. |
| Streckfigur | `PY live-bj/verktyg/streck.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt live-bj/rutor/streck-<a>-<b>.mp4 <a> <b>` | En film med dealern som streckfigur bredvid bordsbilden; `--bara` ger bara figuren. |

## Det som är uppmätt: dealern

Två dealers, A (404 s mätta) och B (446 s). I stilfilerna heter de efter sitt sätt, inte efter personen: A är
`kameran` (söker kameran, lutar bålen mot skon) och B är `bordet` (snabbare, stilla bål, blicken på bordet). Talen här
är medianer ur `data/monster.json`; en axelbredd är dealerns egen i bilden (264 och 257 bildpunkter) och är 0,36 och
0,35 m räknat genom kameran i `data/scen.json`. Samma tal i meter, med hur säkra de är, står i `data/stil-*.json`.

**Tekniken.** Vänsterhanden hämtar varje kort ur skon och drar det plant över filten in mot mitten; högerhanden tar
över där och lägger det. Vänsterhanden gör nästan bara turen skon och åter, högerhanden gör det mesta av resten
(lägger, vänder, samlar in, betalar ut). Mötet sker en halv till tre fjärdedels axelbredd till vänster om hans mitt,
inte vid skons mynning.

| Vad | A | B |
| --- | --- | --- |
| Vänsterhanden till skon | 0,50 s | 0,47 s |
| Greppet vid skon | 0,20 s | 0,10 s |
| Vänsterhanden tillbaka med kortet | 0,47 s | 0,37 s |
| Hela turen till skon och åter | 1,28 s (0,84–2,03) | 1,03 s (0,83–2,04) |
| Från ett grepp vid skon till nästa, när han ger i följd | 1,32 s | 1,12 s |
| Högerhanden ut över bordet (lång rörelse framåt) | 0,73 s | 0,67 s |
| Högerhanden tillbaka | 0,80 s | 0,60 s |
| Högerhanden rör sig medan vänstern sträcker sig mot skon | 64 % av turerna | 94 % |

**Spelarens kort och hans egna.** Ett kort till en spelare går via högerhanden: vänstern drar, högern lägger på 0,5 s
(0,7 axelbredder) och är hemma igen på 0,5–0,8 s. Hela stycket, från att vänstern lämnar sin plats till att kortet
ligger, tar 1,9 s (A) och 1,5 s (B). Sina egna kort lägger han med vänsterhanden ensam, direkt ur skon och utan byte,
på 1,0–1,2 s (sett i bild i de rundor som är kontrollerade; räkningen i `data/rorelser.json` är för hög för det slaget
och för låg för platserna tills kortets eget spår är inlagt).

**Handbytet** är en verklig inbromsning, ingen flygande växling. Greppen är som närmast en kortlängd från varandra
(9,0 och 7,5 cm): de håller i var sin ände. Handen som har kortet går från vänsterns toppfart (1,8 m/s) ned till
0,1 m/s och upp till högerns (0,8–0,9 m/s) på en halv sekund. Det är mätt på handlederna; fingrarna och kortet rör sig
lite till, så kortets egen fart i bytet är högre än så.

**Fartkurvan.** Vänstern till skon är en jämn klocka med toppen mitt i. Tillbaka med kortet är den sned: toppen kommer
efter en fjärdedel av vägen och resten är en lång inbromsning mot mötet. Högern ut är bred och flack, med en medelfart
på 0,46–0,48 m/s.

**Bålen börjar med handen.** När bålen följer med (i 41–62 % av turerna till skon, i nio av tio när högern lägger ut
ett kort) börjar den samtidigt med handen, inom några hundradelar i median, och flyttar sig 2–5 cm i sidled.

**Handen som inte ger står nästan aldrig still**, och greppet lever: avståndet tumme till pekfinger ändras tre gånger
så mycket under ett bärande som i vila.

**Handens rörelse.** En lång rörelse (över 0,6 axelbredder) tar 0,63 s (A) och 0,57 s (B), är 0,8 axelbredder lång och
når som mest 3 axelbredder i sekunden. Farten är störst mitt i rörelsen (46 % in): mjuk start och lika mjukt stopp.
Handen går lågt, nästan utan lyft (0,02 axelbredder över den raka linjen), och i en svag båge (9 % av sträckan åt
sidan).

**Kroppen följer handen.** När vänsterhanden är vid skon (A) har axlarna flyttat sig 0,16 axelbredder dit, axellinjen
lutar 10 grader, bålen är vriden så att axlarna ser 12 % smalare ut, armen är nästan rak (161 grader i armbågen mot 126
i vilan) och huvudet är vridet 20 grader mot skon. B sitter närmare skon och når den utan att flytta bålen: bara
huvudet följer med, 15 grader. När högerhanden går över till platserna på hans vänstra sida lutar axlarna 17 grader och
huvudet vrids 46 grader (A).

**Vilan.** Medan insatserna läggs ligger högerhanden utsträckt åt sidan på filten, nära lådan för använda kort, och
vänsterhanden framför kroppen. Med båda händerna stilla rör sig näsan ändå 0,003–0,005 axelbredder (ett par
millimeter) och huvudet en halv grad över två sekunder: stilla, men aldrig fryst.

**Huvudet** rör sig 21–24 gånger i minuten; en rörelse är 19–21 grader och tar 0,6–0,7 s, som fortast 60 grader i
sekunden. En större vridning (över 15 grader) är 24–34 grader och tar 0,7–0,9 s. Vid drygt hälften av turerna till
skon rör sig huvudet med, och då börjar det i regel 0,15 s före handen på vägen dit och 0,1 s efter på vägen tillbaka.

**Blicken.** A har blicken sänkt 26 % av tiden, B 54 %; en blick ned varar 0,9–1,0 s (upp till 2–3 s). A ser upp i
kameran när han sträcker sig mot skon (ögonen sänkta i 17 % av greppen) och ned när kortet läggs; B ser på bordet
genom hela given (65–76 %). I "Last bets" och "Bets accepted" ser båda mest i kameran.

**Blinkningarna.** 17,5 (A) och 18,3 (B) i minuten. En blinkning varar 0,13 s (A) och 0,23 s (B). De kommer ojämnt:
1,6–1,8 s emellan i median men ofta 8–10 s, och var tionde är en dubbelblinkning. A blinkar gärna just när en rörelse
börjar (36 % av blinkningarna, 21 % av sträckningarna mot skon börjar med en), B nästan aldrig (10 %). Blinkningar med
huvudet nedböjt räknas inte, eftersom de inte går att skilja från en blick ned.

**Mot dockans takt.** Jakobs takt för standarddockan (`../standarddocka/DOMAR.md`, 2026-11-27) är kortet ut på 1,2 s
och handen tillbaka på 0,8 s. De här två dealerna är snabbare i varje led (0,4–0,7 s) men delar arbetet på två händer
som rör sig samtidigt, så ett kort i följd tar 1,1–1,3 s från grepp till grepp. Takten är hans val; talen här säger
bara hur det ser ut vid ett riktigt bord.

## Det som är uppmätt: stycken och slag

`data/rorelser.json` delar allt de gör i stycken (148 hos `kameran`, 201 hos `bordet`), med första och sista ruta,
händer, var det börjar och om det är rent nog att rita efter. Slagen i den första versionen:

| Slag | kameran | bordet | Längd | Läge |
| --- | --- | --- | --- | --- |
| Kort ur skon till en plats (vänstern drar, högern lägger) | 16 | 25 | 1,9 / 1,5 s | Säkert där det är funnet; för få hittas |
| Kort ur skon, vänstern ensam | 42 | 47 | 1,2 / 1,0 s | Hans egna kort i de kontrollerade rundorna, plus de kort där högerns läggning inte hittades |
| Väntan (båda händerna stilla minst 1,5 s) | 20 | 36 | 3,8 / 4,6 s | Säkert |
| Korten in i lådan | 10 | 7 | 2,2 / 4,2 s | Säkert att handen går dit; början av stycket är ungefärlig |
| Vid sina egna kort | 37 | 39 | 0,8 / 0,6 s | Inte kontrollerat i bild: här ligger vändningen av hans eget kort och rättningar |
| Mellan en plats och sina egna kort, svep över flera platser, sträckning till en plats | 11 | 34 | 1,4–4,6 s | Inte kontrollerat i bild |

Dockan har i dag vilan till skon, första kortet till var och en av sju platser, och handen tillbaka. Nytt för den är
alltså: kortet till sig själv med vänsterhanden, korten in i lådan, svepet över bordet, det som görs vid de egna korten
och väntan med händerna på olika ställen. Det som kräver kortet självt (vilken sida som är upp, vändningen av hans
eget kort, och säkra antal per plats) väntar på kortets spår.

## Så mäts det

- **Dealern skiljs från dealerna vid borden bakom** genom att deras hörn av bilden målas över innan kroppen söks.
- **Händerna** är små i bilden och söks därför i en ruta kring kroppens handled, **ansiktet** i en ruta kring näsan.
- **Vänster och höger** är alltid dealerns egna. Skon står till vänster om honom, alltså till höger i bilden.
- **Längder** ges i bildpunkter i bordsbilden (1728×972) och i dealerns egen axelbredd i bilden, så att de går att föra
  över till en figur av en annan storlek.
- **Meter** räknas genom kameran i `data/scen.json`. En kamera ger inget djup, så en höjd eller ett avstånd antas för
  varje del och står i stilfilen: handleden 5 cm över filten, axlar och huvud 20 cm bakom filtens kant mot dealern.
  Kameran står lågt, så en hand som är lyft hamnar för långt bort när den läggs på filten; sidled håller på en tiondel
  när, djupled är det svagaste.
- **Var en hand är** avgörs av punkten mellan tummens och pekfingrets toppar, lagd på filten. Platserna längst till
  vänster om dealern ligger en handsbredd från skons mynning; bara vänsterhanden räknas som vid skon.
- **Spelets gränssnitt ligger över bilden.** När händerna ligger bakom skylten eller knapparna mitt i bilden hittas de
  sämre; det syns som luckor i måtten och ska inte läsas som rörelse.
