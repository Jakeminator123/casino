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
| `data/` | De små sammanställningarna i tal: `kalla.json` (bordsbildens ruta och de rena partierna), `faser.json` (spelets skyltar genom filmen och rundorna), `monster.json` (varje handrörelse, blinkning och huvudrörelse per dealer; en rad på 230 KB, läs den med sin sökväg), `scen.json` (kameran och bordets fasta saker), `givar.json` (varje kort som landade), `mot-vart-bord.json` (livebordet mot vårt eget i tal), `uppsattning.json` (hela livebordets uppsättning i linsvärldens meter, för att byggas som en andra uppsättning bredvid vår standard), `stil-kameran.json` och `stil-bordet.json` (vardera dealerns sätt att ge, i meter, grader och sekunder: det dockan läser), `rorelser.json` (allt de gör, i stycken och slag). | ja |
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
| Mät bordet och kameran | `PY live-bj/verktyg/scen.py` (användningen står överst i filen) | `data/scen.json`: kameran räknad ur 29 ensamma kort, filten, skon, lådan, skärkortet, platsernas märken och var korten landar, i bildpunkter och i meter på filten. Skriver också det tomma bordet till `matt/bord-A.png` och `bord-B.png`. |
| Hitta korten | `PY live-bj/verktyg/kort.py` (användningen står överst i filen) | `matt/kort-<start>.json` (varje kort i varannan ruta: hörn, riktning, sida upp, stilla eller på väg) och `data/givar.json` (varje kort som landade: när det lämnade skon, när och var det låg still, om det vändes). |
| Mät dealern | `PY live-bj/verktyg/mat.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt --del 0/5` (fem körningar, `0/5` till `4/5`) | Kroppen, båda händerna och ansiktet i varannan ruta. Tar 40 minuter med fem körningar bredvid varandra. |
| Räkna ut mönstret | `PY live-bj/verktyg/monster.py live-bj/data/kalla.json live-bj/data/faser.json live-bj/matt live-bj/data/monster.json` | Varje handrörelse, blinkning, sänkt blick och huvudrörelse, och sammanställningen per dealer. |
| Skriv stilarna | `PY live-bj/verktyg/stil.py live-bj/data live-bj/matt` | `data/stil-kameran.json` och `data/stil-bordet.json`: takten, fartkurvorna, handbytet, bålen, huvudet, blicken, blinkningarna, vilan, den andra handen och greppet, med hur varje tal är mätt. Behöver `data/scen.json`. |
| Dela upp i stycken | `PY live-bj/verktyg/rorelser.py live-bj/data live-bj/matt` (`--visa <a> <b>` skriver ut handrörelserna mellan två sekunder med platserna de fick) | `data/rorelser.json`: varje stycke med slag, rutor, händer och om det är rent nog att rita efter. |
| Mät dockan | `PY live-bj/verktyg/mat.py <dockans film> <dess källfil> <mapp> --steg 1 --ensam`, sedan `PY live-bj/verktyg/docka.py <mapp> <ut.json> [<dockans egna tal per ruta>]` | Dockans film mätt på samma sätt, och mot dockans egna tal i `../blackjack-dealer/dealer3d/data/giv-*.json`: hur väl mätningen hittar det som är känt. Källfilen är som `data/kalla.json`: filmens storlek, rutor i sekunden och ett parti för hela filmen. Körs i slasken; inget sparas här. |
| Samla uppsättningen | `PY live-bj/verktyg/uppsattning.py live-bj/data live-bj/matt` | `data/uppsattning.json`: kameran, filten, skon, lådan, var varje kort landar och hur det ligger, hur dealern sitter och var händerna vilar, i linsvärldens meter (x åt bildens höger, y upp med filten på 0, z mot spelaren). Varje grupp säger om den är mätt, skattad, slutledd eller antagen. Det som klonas är måtten och rörelsen, inte lokalens utseende, bordets tryck eller personerna. |
| Lyft givar | `PY live-bj/verktyg/lyft.py giv live-bj/data live-bj/matt live-bj/data/lyft` (`prov <dockans mätta film> <dockans egna tal>` prövar lyftet mot facit, `rita <lyft> live-bj/data/uppsattning.json <ut.png>` ritar ett lyft uppifrån och från sidan) | `data/lyft/<stil>-<mitten, vanster eller hoger>-plats-<n>.json`: tre givar per stil i dockans eget rörelseformat (per ruta båda armarna med axel, armbåge, handled och handens 21 punkter, huvudet, blickpunkten, kortet och minen `a`: de ansiktsformer dockans modell har, 0–1), i uppsättningens meter. Dessutom två väntestycken per stil, `<stil>-vantan-<n>.json`. Vilka ansiktsformer som bär något på ett ansikte som är 135 bildpunkter högt står i stilfilerna under `face`. |
| Lägg vårt bord över deras | `PY live-bj/verktyg/overlagg.py <stillbild> <vårt bord genom deras kamera, med alfa> <punkter.json> live-bj/data/scen.json <ut.jpg> [live-bj/data/mot-vart-bord.json]` | Vårt bord och vår docka halvgenomskinliga över en stillbild ur filmen, en andra bild med borden kant mot kant, och skillnaderna som tal. Bilden av vårt bord och `punkter.json` ritas av editorns sida och ligger i slasken. |
| Titta på måtten | `PY live-bj/verktyg/titta.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt live-bj/rutor/kontroll/<namn>.jpg <sekund> ...` | Ett ark med måtten ritade över filmens rutor. |
| Streckfigur | `PY live-bj/verktyg/streck.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt live-bj/rutor/streck-<a>-<b>.mp4 <a> <b>` | En film med dealern som streckfigur bredvid bordsbilden; `--bara` ger bara figuren. |

## Det som är uppmätt: dealern

Två dealers, A (404 s mätta) och B (446 s). I stilfilerna heter de efter sitt sätt, inte efter personen: A är
`kameran` (söker kameran, lutar bålen mot skon) och B är `bordet` (snabbare, stilla bål, blicken på bordet). Jakobs
arbetsnamn för de två dockor som byggs på stilarna är Danilo (`kameran`) och Frasse (`bordet`); namnen är påhittade
och står som fältet `docka` i filerna. Dockorna får vårt eget ansikte: det som tas ur mätningen är kroppens mått,
hållningen och rörelsen, aldrig utseendet. Talen här
är medianer ur `data/monster.json`; en axelbredd är dealerns egen i bilden (264 och 257 bildpunkter) och är 0,36 och
0,35 m räknat genom kameran i `data/scen.json`. Samma tal i meter, med hur säkra de är, står i `data/stil-*.json`.

**Tekniken.** Vänsterhanden hämtar varje kort ur skon och drar det plant över filten in mot mitten; högerhanden tar
över där och lägger det. Vänsterhanden gör nästan bara turen skon och åter, högerhanden gör det mesta av resten
(lägger, vänder, samlar in, betalar ut). Mötet sker en halv till tre fjärdedels axelbredd till vänster om hans mitt,
inte vid skon.

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
(9,0 och 7,5 cm): de håller i var sin ände. Handen som har kortet går från vänsterns toppfart (1,3 m/s) ned till
0,09 m/s och upp till högerns (0,7 m/s) på en halv sekund. Det är mätt på handlederna; fingrarna och kortet rör sig
lite till, så kortets egen fart i bytet är högre än så.

**Fartkurvan.** Vänstern till skon är en jämn klocka med toppen mitt i. Tillbaka med kortet är den sned: toppen kommer
efter en fjärdedel av vägen och resten är en lång inbromsning mot mötet. Högern ut är bred och flack. Farterna
(bästa skattning, sann inom en tredjedel): vänstern till skon 1,3 / 1,0 m/s som mest och 0,7 / 0,6 i medel, högern ut
1,2 / 0,9 som mest och 0,6 / 0,5 i medel.

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

## Det som är uppmätt: bordet, kameran och korten

Kameran är räknad ur 29 ensamma kort på filten (0,54 bildpunkters fel per hörn) och kontrollerad oberoende: filtens
rundade kant blir en cirkel på bordet med 1,8 mm fel över 1234 punkter. Korten är pokerkort (63,5 × 88,9 mm).

| | Livebordet | Vår spelvy |
| --- | --- | --- |
| Kamerans höjd över filten | 0,62 m (± 2–3 cm) | 0,58 m |
| Lutning nedåt | 18,1 grader | 12 grader |
| Bildvinkel i sidled | 67,6 grader (± 5 %) | 41,4 grader |
| Kameran till filtens kant mot dealern | 1,54 m | 2,07 m |
| Filten | halvcirkel, radie 0,73 m: 1,46 m bred vid dealerns kant, 0,71 m djup | 1,90 m bred, 1,08 m djup |
| Dealerns egna kort, från hans kant | 0,19 m | 0,39 m |
| Spelarens kort på mittplatsen, från dealerns kant | 0,49 m | 0,63 m |
| Insatsmärket på mittplatsen, från dealerns kant | 0,63 m | 0,71 m |
| Skons front, där kortet kommer ut: i sidled, och från dealerns kant | 0,44 m och 0,10 m | 0,41 m och 0,30 m |
| Platsernas spridning i sidled | ± 0,50 m | ± 0,50 m (−0,53 till +0,50) |
| Dealerns ögon och axlar över filten | 0,51 m och 0,31–0,32 m | 0,545 m och 0,29 m |
| Axelbredd | 0,36 och 0,35 m | 0,375 m |

Samma tal står i `data/mot-vart-bord.json`. Skon är en genomskinlig låda, cirka 0,27 × 0,10 m i foten och 0,12 m hög
i ryggen. Dess front är en platta som lutar bakåt från fotens två främre hörn (6–11 cm hög; de två hörnen är avlästa
olika, så lutningen är osäker, 12–34 grader), och nästa kort syns genom den med baksidan utåt: där tar fingret det,
4–5 cm över filten. Det `data/scen.json` kallar `mouth` är inte skons mynning utan en lös genomskinlig bit som ligger
plant på filten strax framför skon. Lådan för använda kort är 8 × 9 cm i foten och 0,16 m hög, och bordet har ingen
markerbricka (markerna är spelets grafik). Allt står still genom filmen.

**Dealern sitter**, på en hög stol som syns vid dealerbytet. **Golvet syns aldrig**, så bordets höjd över golvet är
inte mätt. En slutledning: när dealerna står upp vid bordet är ögonen 0,63–0,69 m över filten, bara 0,15 m högre än
när de sitter; med en vuxen mans ögonhöjd (1,63 m ± 0,07) ger det filten cirka 0,95 m över golvet (± 0,1) och sitsen
cirka 0,67 m.

**Korten** som ligger på bordet hittas säkert (inget av cirka 62 missades i 16 slumpade rutor; ungefär vart åttonde
funnet kort är en extra rektangel i en tät solfjäder). Kortet i handen syns bara i 23 % av rutorna mellan sko och
bord, så vändningen ges som ett fönster och kortets egen fart i handbytet går inte att få. Från att kortet är ute ur
mynningen tills det ligger still tar det 1,03 / 0,93 s till en plats och 0,83 / 1,17 s till dealern själv.

## Det som är uppmätt: stycken och slag

`data/rorelser.json` delar allt de gör i stycken (148 hos `kameran`, 201 hos `bordet`), med första och sista ruta,
händer, var det börjar och om det är rent nog att rita efter. Vart ett kort gick kommer ur kortets eget spår där det
sågs lämna skon (`target_from`), annars ur händerna.

| Slag | kameran | bordet | Längd | Läge |
| --- | --- | --- | --- | --- |
| Kort ur skon till en plats | 28 | 50 | 2,0 / 1,7 s | Säkert: 25 / 45 sagda av kortet. Högern lägger i 16 / 23, vänstern ensam i 12 / 27 |
| Kort ur skon till honom själv | 12 | 16 | 2,2 / 2,0 s | Säkert: alla sagda av kortet, och alla lagda av vänsterhanden ensam |
| Kort ur skon, vart syns inte | 18 | 6 | 1,0 / 1,5 s | Varken kortet eller en läggning hittades |
| Väntan (båda händerna stilla minst 1,5 s) | 20 | 36 | 3,8 / 4,6 s | Säkert |
| Korten in i lådan | 10 | 7 | 2,2 / 4,2 s | Säkert att handen går dit; början av stycket är ungefärlig |
| Vid sina egna kort | 37 | 39 | 0,8 / 0,6 s | Inte kontrollerat i bild: här ligger vändningen av hans eget kort och rättningar |
| Mellan en plats och sina egna kort, svep över flera platser, sträckning till en plats | 11 | 34 | 1,4–4,6 s | Inte kontrollerat i bild |

Dockan har i dag vilan till skon, första kortet till var och en av sju platser, och handen tillbaka. Nytt för den är
alltså: kortet till sig själv med vänsterhanden, korten in i lådan, svepet över bordet, det som görs vid de egna korten
och väntan med händerna på olika ställen. Vändningen av hans eget kort är inte utskild än; den ligger bland styckena
vid hans egna kort.

## Så mäts det

- **Dealern skiljs från dealerna vid borden bakom** genom att deras hörn av bilden målas över innan kroppen söks.
- **Händerna** är små i bilden och söks därför i en ruta kring kroppens handled, **ansiktet** i en ruta kring näsan.
- **Vänster och höger** är alltid dealerns egna. Skon står till vänster om honom, alltså till höger i bilden.
- **Längder** ges i bildpunkter i bordsbilden (1728×972) och i dealerns egen axelbredd i bilden, så att de går att föra
  över till en figur av en annan storlek.
- **Meter** räknas genom kameran i `data/scen.json`. En kamera ger inget djup, så handledens fart och väg räknas på
  två sätt: lagd på ett plan 5 cm över filten (för högt när handen lyfts eller går i djupled) och tvärs synlinjen (för
  lågt då). Stilfilerna ger båda som gränser och deras geometriska medel som bästa skattning. Sättet är prövat på
  dockans egna filmer, där facit finns (`verktyg/docka.py`): den övre gränsen blev 1,2–2,1 gånger den sanna
  toppfarten, den undre 0,6–0,7 gånger, och den bästa skattningen hamnade inom en tredjedel. Formen på en fartkurva
  och sekunderna är väl mätta; meterna håller alltså på en tredjedel när. Axlar och huvud läggs på ett upprätt plan
  20 cm bakom filtens kant mot dealern och håller på en tiondel när.
- **Lyftet.** En kamera ger inget djup. Axlarna sätts där bålen antas sitta, armbågen och handleden läggs på sina
  synlinjer så att armens längder håller, handleden låses i höjd i rutan där kortet tas ur skon och i rutan där det
  läggs, och MediaPipes egen uppfattning om vad som är närmast kameran avgör mellan nära och fjärran. Prövat på dockans
  två filmer mot facit hamnar varje led 4–11 cm fel i median, nästan allt i djupled (sidled och höjd 1–3 cm), och den
  sämsta tiondelen av rutorna upp till 20 cm för högerarmen. Farten i ett lyft blir för låg (0,6–0,9 av den sanna
  toppfarten), eftersom djupet jämnas. Använd lyften för bålens, axlarnas och huvudets rörelse och för handens väg i
  sidled och höjd; djupet är en skattning.
- **Samma mätning på dockan.** MediaPipe hittar också dockan: kroppen i varje ruta, händerna i de flesta, ansiktet i
  två av tre. Handleden hamnar 14–40 bildpunkter från dockans sanna handled, och blinkningar går inte att mäta på en
  docka utan iris (den mäter sex blinkningar på två sekunder där det inte finns någon). Ett kort stopp kan missas: på
  mannens film hittas ett nästan-stopp där dockans egna tal har tre.
- **Var en hand är** avgörs av punkten mellan tummens och pekfingrets toppar, lagd på filten. Platserna längst till
  vänster om dealern ligger en handsbredd från skons front; bara vänsterhanden räknas som vid skon.
- **Spelets gränssnitt ligger över bilden.** När händerna ligger bakom skylten eller knapparna mitt i bilden hittas de
  sämre; det syns som luckor i måtten och ska inte läsas som rörelse.

## Överlämning

Skrivet 2026-11-27 av agenten som byggde mappen, för den som fortsätter.

**Göra om allt från filmen**, i den här ordningen (kommandona står i tabellen ovan): hämta filmen, `ram.py`,
`faser.py`, `mat.py` (fem körningar), `scen.py`, `kort.py` (per parti, sedan `samla`), `scen.py` en gång till med
`--givar` så att kortplatserna kommer med, `monster.py`, `stil.py`, `rorelser.py`, `uppsattning.py`, `lyft.py giv`.
`stil.py`, `rorelser.py`, `uppsattning.py` och `lyft.py` läser bara måtten i `matt/` och `data/` och tar sekunder;
bara `ram.py`, `faser.py`, `mat.py`, `scen.py` och `kort.py` läser filmen. `docka.py` och `overlagg.py` står vid
sidan av: den första mäter dockans egna filmer, den andra behöver en bild av vårt bord från editorns sida.

**Vad som är källa för vad i `data/`:** `kalla.json` (vilka sekunder som mäts) och `scen.json` (kameran, bordet) är
grunden för allt. `monster.json` bär varje enskild händelse (handrörelse, blinkning, huvudrörelse);
`stil-*.json` är sammanställningen dockan läser; `rorelser.json` är styckena; `givar.json` är kortens egna spår;
`uppsattning.json` är det klonen byggs ur; `lyft/` är rörelser i dockans format. Ändras ett verktyg tidigare i
kedjan körs de senare om.

**Känt svagt:**

- Djupet. En kamera ger inget. Farter i meter håller på en tredjedel när, ett lyft 4–11 cm per led.
- Bålens avstånd bakom kanten är skattat (0,07 och 0,16 m), och bålens lutning framåt syns inte i lyften.
- Fingrarna. Handen är 40–55 bildpunkter; måtten säger att greppet lever, inte ledernas vinklar.
- Kortet i handen syns i 23 % av rutorna. Vändningen och kortets fart i handbytet går inte att få.
- Tal. Munnen öppnas nästan aldrig i mätningen.
- Höften, midjan och armens delar är dolda eller går inte att mäta framifrån.
- Partierna 25–35 s och 41–47 s är inzoomade 0,6–2 % utan att `ram.py` ser det; `scen.py` och `kort.py` rättar
  det, `mat.py` inte (punkterna ligger 1–2 bildpunkter fel vid händerna där).
- Skons frontplatta är avläst med två hörn som inte är överens (se ovan).
- Slagen vid dealerns egna kort, svepen och sträckningarna i `rorelser.json` är inte kontrollerade i bild.

**Kvar att göra:**

- Fler lyft: kortet till honom själv med vänsterhanden, korten in i lådan, väntan på fler ställen. Urvalet står
  i `lyft.py` (`giv`); ett nytt slag är en ny loop över styckena i `rorelser.json`.
- Mäta provet `naturlig-giv-20261127` som dockans andra filmer (`mat.py --ensam`, sedan `docka.py`).
- Djup ur SAM 3D Body, om Jakob låter sätta upp den här: det går in i `lyft.py` som `nearer` (hur mycket närmare
  kameran armbågen är än axeln, handleden än armbågen och handleden än axeln, i meter längs filten, per ruta), som
  i dag kommer ur MediaPipes egen kropp i `lift()`. Pröva först med `lyft.py prov` mot dockans facit.
- Skilja ut vändningen av dealerns eget kort ur styckena "at his own cards".
- Låta `ram.py` se inzoomningen (smala kontrollrutor intill bildens kant) och köra om `mat.py` för de två partierna.

**Det som kräver filmen:** allt ovan utom lyften och stilarna. Filmen ligger inte i Git; den hämtas med kommandot
i tabellen, och `matt/` (måtten per ruta, 180 MB) görs om med `mat.py` och `kort.py` på ungefär en timme. Finns
`matt/` kvar på datorn behövs filmen bara för att titta (`titta.py`, `streck.py`, `overlagg.py`).
