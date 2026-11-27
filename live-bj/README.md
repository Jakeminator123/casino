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
| `data/` | De små sammanställningarna i tal: `kalla.json` (bordsbildens ruta och de rena partierna), `faser.json` (spelets skyltar genom filmen och rundorna), `monster.json` (varje handrörelse, blinkning och huvudrörelse per dealer; en rad på 230 KB, läs den med sin sökväg), `scen.json` (kameran och bordets fasta saker), `givar.json` (varje kort som landade), `mot-vart-bord.json` (livebordet mot vårt eget i tal), `uppsattning.json` (hela livebordets uppsättning i linsvärldens meter, för att byggas som en andra uppsättning bredvid vår standard), `stil-kameran.json` och `stil-bordet.json` (vardera dealerns sätt att ge, i meter, grader och sekunder: det dockan läser), `rorelser.json` (allt de gör, i stycken och slag), `segment.json` (hela filmen indelad per dealer och per hand, nedan; ett stycke per rad, läs den med sin sökväg), `sam-prov/` (SAM 3D Body: proven på dockans film, svaret för livebordets nyckelrutor i tal och lyften mot bordets kända punkter, nedan). | ja |
| `video/` | Filmen, `kalla.mp4`. | nej |
| `matt/` | Måtten per ruta, en fil per rent parti (`rorelse-<start>.json`). Görs om med `mat.py`. | nej |
| `rutor/` | Ark och filmer att titta på: `oversikt/` (hela filmen i små rutor), `kontroll/` (måtten ritade över filmen), `segment/` (indelningens tidslinje och ett blad per kategori med rutor ur filmen), `streck-*.mp4`. | nej |
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
| Dela in per hand | `PY live-bj/verktyg/segment.py dela live-bj/data live-bj/matt` (`--visa <a> <b>` skriver ut styckena mellan två sekunder), sedan `PY live-bj/verktyg/segment.py rita live-bj/data <mapp>` och `PY live-bj/verktyg/segment.py blad live-bj/data live-bj/matt live-bj/video/kalla.mp4 live-bj/rutor/segment` | `data/segment.json`: hela filmen per dealer och hand (nedan). `rita` ritar tidslinjen och tabellerna ur talen ensamma, för ett prov; `blad` lägger rutor ur filmen bredvid, bara i `rutor/segment/`. Tar en minut; läser `lyft/` för höjderna och för vad som redan är lyft, så den körs om efter `lyft.py`. |
| Mät dockan | `PY live-bj/verktyg/mat.py <dockans film> <dess källfil> <mapp> --steg 1 --ensam`, sedan `PY live-bj/verktyg/docka.py <mapp> <ut.json> [<dockans egna tal per ruta>]` | Dockans film mätt på samma sätt, och mot dockans egna tal i `../blackjack-dealer/dealer3d/data/giv-*.json`: hur väl mätningen hittar det som är känt. Källfilen är som `data/kalla.json`: filmens storlek, rutor i sekunden och ett parti för hela filmen. Körs i slasken; inget sparas här. |
| Samla uppsättningen | `PY live-bj/verktyg/uppsattning.py live-bj/data live-bj/matt` | `data/uppsattning.json`: kameran, filten, skon, lådan, var varje kort landar och hur det ligger, hur dealern sitter och var händerna vilar, i linsvärldens meter (x åt bildens höger, y upp med filten på 0, z mot spelaren). Varje grupp säger om den är mätt, skattad, slutledd eller antagen. Det som klonas är måtten och rörelsen, inte lokalens utseende, bordets tryck eller personerna. |
| Djup ur SAM 3D Body | `PY live-bj/verktyg/sam_runpod.py rutor ...`, sedan `SAMPY live-bj/verktyg/sam_runpod.py las ...` (hela raden under "Djup ur SAM 3D Body" nedan) | Lederna i meter i nyckelrutorna av de lyfta styckena, lästa här på processorn; rutorna raderas efteråt. Tar timmar. |
| Lyft givar | `PY live-bj/verktyg/lyft.py giv live-bj/data live-bj/matt live-bj/data/lyft --sam live-bj/data/sam-prov/livebordet-sam.json` (utan `--sam` MediaPipe ensam; `prov <dockans mätta film> <dockans egna tal> [--sam <svar>]` prövar lyftet mot facit, `kanda <mapp med lyft> live-bj/data/uppsattning.json` mot bordets kända punkter, `rita <lyft> live-bj/data/uppsattning.json <ut.png>` ritar ett lyft uppifrån och från sidan; sedan `huvud live-bj/data live-bj/matt live-bj/data/lyft` lägger huvudets egna vinklar i lyften; `dockhuvud <dockans film genom livebordets kamera> <ut.json>` mäter dockans huvud i bilden med samma ansiktsnät, för `lyft-kolla.ts --ansikte`) | `data/lyft/<stil>-<mitten, vanster eller hoger>-plats-<n>.json`: tre givar per stil i dockans eget rörelseformat (per ruta båda armarna med axel, armbåge, handled och handens 21 punkter, huvudet, blickpunkten (huvud och ögon), huvudets egna vinklar utan ögonen `huvud` (nick, vridning, tippning i grader från vilan där dealern ser in i kameran, hårt jämnade) och punkten huvudet vetter mot `hv`, ansiktsnätets egna vinklar mot kameran `ansikte` (inte från vilan, lätt jämnade: det en bild av honom visar), kortet och minen `a`: de ansiktsformer dockans modell har, 0–1), i uppsättningens meter. Dessutom två väntestycken per stil, `<stil>-vantan-<n>.json`. Vilka ansiktsformer som bär något på ett ansikte som är 135 bildpunkter högt står i stilfilerna under `face`. |
| Lägg lyften på dockorna | `node dealer3d/tools/lyft-till-docka.ts --alla`, sedan `node dealer3d/tools/lyft-kolla.ts` (båda från `blackjack-dealer/`) | Danilos och Frasses rörelser, `../blackjack-dealer/dealer3d/data/lyft-<docka>-*.json`, och ankarena de börjar och slutar i: givarna redo vid skon (`ankare-skon-<docka>.json`, A2.3, ur filmen), väntorna i vilan (`ankare-vila-<docka>.json`, A1), och vägarna mellan dem (`lyft-<docka>-till-skon.json` och `-hem.json`, vårt eget). Det råa lyftet är sanningen om var händerna är: handlederna i filmens bild, huvudets vinklar (`huvud`, med ögonen som bär resten av blicken) och tiden är lyftets ruta för ruta (jämnade lugnt i stillhet och lätt i rörelse), kortet följer händerna (på kant mellan händerna i bytet, i högern mellan pekfingret och tummen och tippat ned på platsen), och inget kommer ur den förra standarddockans koreografi. Vårt eget är dockans mått, vilan (händerna plant på filten), de märkta bryggorna mellan vilan och lyftet (`made.faser`), den pekande högerhanden medan kortet är under fingret och handledens djup längs kamerans synlinje (det ett lyft inte vet), rättningar vid en kontakt (högst 2 cm), blicken (ett mål per stycke) och högerns väg böjd så att kortet landar där den riktiga dealerns kort låg (lyftets kort när det först ligger); kortet ligger där handen lägger det, i den vinkel det kom, och läggs inte till rätta på filten. Givet till plats 4 delas också i handbytet: ankaret `ankare-byte-<docka>.json` (A2M), skon till bytet (`lyft-<docka>-till-bytet.json`, samma för alla platser) och bytet till platsen och hem (`lyft-<docka>-bytet-p4.json`), som efter varandra är hela given ruta för ruta. Kontrollen mäter varje handled mot lyftet, kortets landning mot målet (och att det inte vrids eller glider under fingret på filten), armen mot bålen, skakigheten, rycken i huvud, axlar, handleder, blick och fingrar mot dealerns, huvudets tre vinklar (sväng och största steg per ruta) mot dealerns, och blicken i vilan. Görs om när ett lyft eller skon ändras. |
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
ligger, tar 1,9 s (A) och 1,5 s (B). Sina egna kort får han oftast som en spelare, med handbyte och
högern som lägger (14 och 21 gånger mot vänstern ensam 4 och 4 i `data/segment.json`, sett i bild vid 140,5 och
750,3 s); `data/rorelser.json` räknar dem som vänsterns ensam, eftersom det letar efter högern bara på platserna.

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

Samma tal står i `data/mot-vart-bord.json`. Skon är en lång genomskinlig låda, cirka 0,27 × 0,10 m i foten, öppen
upptill och 0,12 m hög i ryggen; väggarnas överkant går rakt ned till frontens topp, 6 cm över filten. Fronten är en
klar ram som lutar 33–34 grader bakåt från lodrätt (de två topphörnen), med ett fönster där nästa kort syns. Kortleken
ligger på en bädd som stiger 13 grader bakåt (från 3 mm över filten framtill), och varje kort lutar som fronten med
långsidan tvärs skon: ryggens mönster är 78 mm tvärs och 52 mm uppför. Därför syns det främsta kortets rygg som en
lutande yta snett uppifrån, och kortleken som ett långt vitt block längs bädden (0,14 m vid 62 s, 0,23 m vid 600 s).
Fingrarna tar kortet mitt på ryggen, cirka 3 cm över filten, och drar det nedåt och ut under fronten, plant över filten
mot bordets mitt. Det `data/scen.json` kallar `mouth` är inte skons mynning utan en lös genomskinlig bit som ligger plant
på filten strax framför skon; kortet glider ut över den. Hörnen, bädden och kortets rygg är lästa för ögat i rutor där
skon står fri (`scen.py`, `FIXED`), och kortet, bädden och ryggens topp går ihop med kameran inom 1–3 bildpunkter (högst 4 mm). Lådan för använda
kort är 8 × 9 cm i foten och 0,16 m hög, och korten ligger plant i den med ryggen upp, en hög på 2–5 cm; bordet har
ingen markerbricka (markerna är spelets grafik). Allt står still genom filmen.

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
| Kort ur skon till honom själv | 12 | 16 | 2,2 / 2,0 s | Kortet säkert, alla sagda av det; handen inte: oftast lägger högern efter ett handbyte (indelningen per hand nedan) |
| Kort ur skon, vart syns inte | 18 | 6 | 1,0 / 1,5 s | Varken kortet eller en läggning hittades |
| Väntan (båda händerna stilla minst 1,5 s) | 20 | 36 | 3,8 / 4,6 s | Säkert |
| Korten in i lådan | 10 | 7 | 2,2 / 4,2 s | Säkert att handen går dit; början av stycket är ungefärlig |
| Vid sina egna kort | 37 | 39 | 0,8 / 0,6 s | Inte kontrollerat i bild: här ligger vändningen av hans eget kort och rättningar |
| Mellan en plats och sina egna kort, svep över flera platser, sträckning till en plats | 11 | 34 | 1,4–4,6 s | Inte kontrollerat i bild |

Dockan har i dag vilan till skon, första kortet till var och en av sju platser, och handen tillbaka. Nytt för den är
alltså: kortet till sig själv med vänsterhanden, korten in i lådan, svepet över bordet, det som görs vid de egna korten
och väntan med händerna på olika ställen. Vändningen av hans eget kort finns inte: bordet ger dealerns kort med
framsidan upp, utan hålkort (indelningen nedan).

## Det som är uppmätt: hela filmen per hand

`data/segment.json` delar hela filmen per dealer och **per hand**: höger hand, vänster hand och huvudet med blicken har
var sitt spår, eftersom händerna i filmen har var sin tidslinje. Varje stycke har start- och slutruta (filmens egen, 60
i sekunden) och sekunder, en kategori ur rörelseschemat (`../standarddocka/rorelsekatalog.json`), plats och kort där
det går att säga (P1–P7 från bildens vänster, D dealern själv, C1, C2 …), handens läge där det börjar och slutar, och
hur säker indelningen är (`syns`: andelen rutor där handen hittades; `saker`: hog, mellan, lag, eller kant där stycket
börjar eller slutar vid ett partis kant). 84–90 % av styckena är säkra.

**Så delas det.** Ett spår delas där handen står still minst 0,2 s, där vänstern griper i skon och där ett kort kommer
till ro under handen (kortets eget spår i `givar.json`; den hand som är närmast kortet då lade det). Mellan två sådana
ställen är det en rörelse, och ett stopp är VILA (minst 0,6 s), VANTA (med små egna rörelser) eller STOPP (kortare, en
del av arbetet). Rörelsens kategori kommer ur vad som händer: kortet som läggs (GIV, GIV-EGET), kortet som lämnar skon
(DRA), korten som tas bort (KORT-IN) och högern vid skon (SKON); annars ur var den börjar och slutar, så att varje
stycke börjar och slutar där namnet säger:

- **HEM** börjar någon annanstans än i handens vila (vid ett kort, vid skon, vid lådan) och slutar i den eller vid de
  egna korten; samma väg får alltid samma namn, och ut och tillbaka till samma ställe är aldrig hem. Från en vila
  till en annan är **BYT-VILA**. En rörelse som stannar inom 15 cm från där den började, där handen väntar (vilan, de
  egna korten, vänstern vid skon), hör till väntan runt den: **VANTA**.
- **TILL-SKON** slutar vid skon och börjar någon annanstans. **SVEP** går tvärs över minst två platser på högst 2 s,
  utan att börja eller sluta vid ett kort. **PEKA** går till en plats utan att lägga eller ta ett kort, och tillbaka
  på högst 2,5 s. **KORT-IN** är allt från första kortet som tas in till lådan, med stopp under 6 s emellan.
- En hand uppe vid ansiktet eller bröstet minst en kvarts sekund (som lagd på filten hamnar långt bakom bordet) är
  **ANNAT**, liksom en hand som går ut och tillbaka till samma ställe utan att göra något med korten.
- Högerns väg ut från vilan, och ett stopp under 1,5 s innan den tar kortet, hör till **GIV**.

Kortens nummer räknas per plats i rundan, bara bland kort som landar medan spelet ger.

| Kategori | Hand | Danilo (`kameran`) | Frasse (`bordet`) |
| --- | --- | --- | --- |
| GIV: kortet till en spelare | höger | 33 st, 0,87 s (0,61–2,03) | 61 st, 1,00 s (0,80–2,07) |
| GIV | vänster ensam | 3 st | 5 st |
| GIV-EGET: kortet till dealern själv | höger, efter handbyte | 14 st, 0,77 s (0,38–0,86) | 21 st, 0,73 s (0,43–1,47) |
| GIV-EGET | vänster ensam | 4 st | 4 st |
| DRA: vänstern drar kortet till handbytet | vänster | 65 st, 0,67 s (0,35–0,97) | 99 st, 0,83 s (0,40–0,97) |
| TILL-SKON | vänster | 41 st, 0,63 s | 45 st, 0,57 s |
| HEM | höger / vänster | 19 / 22 st, 0,57 / 0,50 s | 25 / 13 st, 0,37 / 0,33 s |
| BYT-VILA | höger / vänster | 3 / 5 st | 3 / 13 st |
| KORT-IN: korten in i lådan | höger / vänster | 11 / 6 st, 4,5 / 4,4 s | 12 / 10 st, 5,7 / 2,6 s |
| SVEP: över bordet innan given | höger | 2 egna | 5 som går rakt in i första kortet |
| PEKA: handen mot en plats utan kort | höger | 1 st | – |
| RATTA: rätta till ett kort | höger | – | 2 st |
| SKON: sköter skon (härmas inte) | höger / vänster | 10 / 16 st | – |
| ANNAT (härmas inte) | höger / vänster | 10 / 12 st | 5 / 5 st |
| VILA / VANTA | höger | 43 / 13 st, 1,6 / 5,3 s | 49 / 6 st, 2,2 / 6,6 s |
| VILA / VANTA | vänster | 60 / 22 st, 1,3 / 3,3 s | 48 / 21 st, 2,2 / 3,5 s |

Sett i bild (`rutor/segment/blad-*.jpg`): svepet går lågt från vilan vid lådan tvärs över platserna till mötet när
given börjar (136,9 och 430,4 s); korten in samlas med båda händerna och läggs i lådan med högern (164–169 s); ANNAT är
till exempel handen till örat (114,6–118,7 s); SKON är påfyllningen av skon (262–285 s). Dealerns eget kort ges
oftast som en spelares, med handbyte och högern som lägger (sett vid 140,5 och 750,3 s). Att peka på spelaren som ska
välja finns nästan inte: då står spelets skylt i bild, och dealern ser i kameran (40–46 % av tiden) med händerna i vila.
Av högerns KORT-IN når 7 av 11 (Danilo) och 7 av 12 (Frasse) lådan i mätningen; resten slutar vid kanten av ett mätt
parti eller där handen inte syns.

**Lägena per hand.** Ett ankare är ett läge för varje hand (A1 = H1 + V1, A2.3 = H1 + V2.3, A3PnCm = H3Pn + V2.3);
lägena och vad de betyder står i rörelseschemat. `lagen` ger per dealer var varje läge ligger på filtens plan, hur
många stopp och hur många sekunder; `bada_stilla` vilka par av lägen händerna står i samtidigt (kandidaterna till
ankare: hos båda dealrarna är H1 + V1S, högern framför kroppen och vänstern mot skon, en vanlig väntan mitt i rundan,
och H1S + V1 eller V1S, högern utsträckt mot lådan, vilan under insatserna); `overgangar` hur många rörelser som går
från ett läge till ett annat, per hand.

**Händerna i otakt, och de två dealrarnas stil.** De två skiljer sig här, och det hör till deras stil. Allt räknas
över samma kort: de som högern lägger hos en spelare och som följs av ett nytt kort (rundans sista kort är inte med;
`otakt.bas`). Frasse går nästan aldrig hem mellan korten: efter 54 av 56 går högern direkt till nästa kort. Danilo gör
det oftast men inte alltid: 18 av 26, och 8 gånger går han hem först (5 av dem tar vänstern nästa kort innan högern är
hemma). I ögonblicket högern lägger kortet drar vänstern redan nästa ur skon (Danilo 17 av 26, Frasse 35 av 56) eller
står vid skon med det (5 och 18). Vänsterns nästa grepp kommer 0,0 s (Danilo) och 0,1 s (Frasse) efter att kortet
ligger, i median. `otakt` har talen.

**Talen för den ritade given** (`for_ritade_rorelser`): delarna av ett kort med handbyte, median och 10–90 %, där
båda händerna syns, per dealer och plats för plats. Vänstern lämnar skon och händerna möts efter 0,33 / 0,27 s,
greppen är närmare än 13 cm i 0,1 s, kortet ligger 0,58 / 0,63 s efter mötet, hela kortet tar 0,90 / 0,87 s. Mötet
ligger 0,11 / 0,14 m åt dealerns vänster och 0,16 / 0,11 m fram från bordskanten. Blicken följer kortet till platsen
(mot skon för P5–P7, mot lådan för P1–P2, ned för P4 och dealern). Höjderna kommer bara ur de lyfta givarna
(`lyft/`, SAM:s djup): handlederna 4–10 cm över filten vid bytet, högerns handled som högst 6–7 cm på väg till
platsen. Jämfört med den ritade given (`../blackjack-dealer/dealer3d/src/koreo-giv.ts`, KOREO) är kortet inte rest på
högkant vid bytet och greppen är inte 9–11 cm upp, och vänstern väntar inte vid skon tills nästa klipp: den griper
nästa kort när det förra ligger.

**Att lyfta härnäst** (`att_lyfta`) är det en hel kortrunda behöver, i ordning: första och andra kortet till varje
plats, dealerns kort, väntan med båda händerna stilla, peka, svep, korten in, handen hem och vänstern till skon, med
det bästa stycket ur filmen för varje (händerna syns, stilla före och efter, inget oväntat runt omkring). För en giv
börjar klippet där vänstern tar kortet i skon och slutar där kortet ligger. `basta` har de två bästa per kategori,
plats och kort, med bryggorna: dockans egen rörelse från lägets mitt till styckets början och från dess slut, vid
0,5 m/s. `ersattningar` säger för varje stycke som inte ska härmas i vilket läge dockan väntar och vilket stycke hon
väntar in. Platser som redan har ett lyft står sist.

**Det som inte går att avgöra ur mätningen:** höjden över filten utom i de lyfta givarna; kortets nummer där kortet
inte sågs landa (C saknas); händerna när spelets knappar ligger över dem (under "Make your decision", `syns` lågt);
om ett stopp vid en plats är en rättning eller en pekning; och blicken mer noga än åt vilket håll huvudet är vänt och
om ögonen är sänkta.

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
  sidled och höjd; djupet är en skattning. Där SAM 3D Body har läst rutorna tar lyftet djupet därifrån (nedan).
- **Samma mätning på dockan.** MediaPipe hittar också dockan: kroppen i varje ruta, händerna i de flesta, ansiktet i
  två av tre. Handleden hamnar 14–40 bildpunkter från dockans sanna handled, och blinkningar går inte att mäta på en
  docka utan iris (den mäter sex blinkningar på två sekunder där det inte finns någon). Ett kort stopp kan missas: på
  mannens film hittas ett nästan-stopp där dockans egna tal har tre.
- **Var en hand är** avgörs av punkten mellan tummens och pekfingrets toppar, lagd på filten. Platserna längst till
  vänster om dealern ligger en handsbredd från skons front; bara vänsterhanden räknas som vid skon.
- **Spelets gränssnitt ligger över bilden.** När händerna ligger bakom skylten eller knapparna mitt i bilden hittas de
  sämre; det syns som luckor i måtten och ska inte läsas som rörelse.

## Djup ur SAM 3D Body

SAM 3D Body (`facebook/sam-3d-body-dinov3`) läser en persons leder i meter ur en bild, given en ruta kring personen och
kamerans brännvidd och bildmitt (`verktyg/sam_runpod.py las`). Livefilmens rutor läses här på datorns processor och
lämnar aldrig datorn. En hyrd maskin hos RunPod (`verktyg/sam_runpod.ts`) används bara för vår egen dockfilm, och den
vägrar en lista tagen ur livefilmen. Talen står i `data/sam-prov/`.

**Prövat på dockan** (2026-11-27), där facit finns: mannen ger ett kort till plats 4
(`../blackjack-dealer/assets/proofs/takt-12-08-20261127/1-mannen-plats-4.mp4`, 61 rutor; facit
`../blackjack-dealer/dealer3d/data/giv-fran-2-3-p4c1-ren-a-man.json`). SAM ensam mot facit, fel i cm i djupled (längs
kamerans synlinje), median och i parentes den sämsta tiondelen (`jamforelse.json`):

| Led | SAM som den ger det | SAM med en skala och en flytt för hela filmen | SAM flyttad så att bålen står där den står (det lyftet får veta) | MediaPipe-lyftet |
| --- | --- | --- | --- | --- |
| Axlar | 13,1 | 3,4 (8,0) | 3,7 (7,9) | 4,9 (8,3) |
| Armbågar | 11,2 | 2,1 (6,6) | 1,8 (6,7) | 4,5 (18,4) |
| Handleder | 14,9 | 3,2 (6,2) | 3,4 (6,0) | 6,1 (19,6) |
| Huvudet | 11,9 | 1,9 (3,3) | 1,9 (3,3) | 18,1 (26,1) |
| Fingertopparna | 16,9 | 5,0 (8,8) | 4,7 (8,4) | 14,0 (24,7) |

- SAM hittar dockan (dess egna punkter i bilden 10–31 bildpunkter från dockans leder). I sidled och höjd är felet
  1–4 cm, som lyftets. Avståndet är en skattning (hela dockan 8–12 cm för långt bort), men formen håller.
- Samma film omritad som livebordets bild (1728 × 972, brännvidd 1290, dockan lika liten som dealrarna;
  `rutor --som`) gav samma sak: 1,7–5,0 cm i djupled med bålen given (`jamforelse-som-livebordet.json`).
- SAM:s armar är stadiga (spridning 1 cm genom filmen), men överarmen blir 0,4 och underarmen 1,9 cm kortare än dockans
  (`benlangder_m.rattelse`); `lyft.py giv --sam` lägger tillbaka det.

**Genom lyftet**, som det skulle gå för dealrarna: dockans film omritad som livebordets bild, SAM i var femte ruta,
`lyft.py prov` med och utan `--sam` (`lyft-prov-utan-sam.json`, `lyft-prov-med-sam.json`). Fel i cm, median och
sämsta tiondel:

| Led | Utan SAM | Med SAM:s djup |
| --- | --- | --- |
| Vänster armbåge | 3,8 (5,0) | 4,5 (8,1) |
| Vänster handled | 7,1 (10,8) | 5,0 (8,6) |
| Höger armbåge (armen som ger) | 9,3 (19,8) | 3,6 (14,4) |
| Höger handled | 9,7 (21,2) | 5,0 (15,5) |

Axlarna är desamma (2,5 och 6,4 cm): de sätts där bålen antas sitta. Vikten för SAM:s djup prövades från 2 till 200
mot MediaPipes 1; från 5 och uppåt börjar SAM:s egna fel synas, så den är 5 (`lyft.py`, `SAM_KEY`).

**På processorn:** 49 s per ruta med tre trådar när datorn är ledig, 1–2 minuter när andra arbetar, och samma leder
som den hyrda maskinen inom 2–5 mm. Modellen körs i float32 här; i bfloat16, som den själv väljer, tog en ruta 11
minuter. Att bara läsa kroppen utan händernas egen avkodare (`--sort body`) gick inte fortare och flyttade lederna 2–3
cm, så hela läsningen används. Uppsättningen ligger utanför repot i `../sam-3d-body/` (koden, modellen 2,8 GB och
Python-miljön, 4,1 GB i allt).

**Livebordet** (2026-11-27, här på processorn). 259 nyckelrutor togs ut ur de tio lyfta styckena: givarna var femte
lyftruta, väntan var tionde och tätare kring kortets ögonblick. Läsningen stoppades kl. 06.46, när datorn behövdes av
andra (processen fick en femtedels kärna och flyttades ut ur minnet). 70 är lästa, kamerans tre givar hela. Talen står i
`data/sam-prov/livebordet-sam.json`, utan bilder; rutorna är raderade.

- **I lyften:** kamerans tre givar (Danilo) har SAM:s djup för armbågar och handleder. Bordets tre givar och alla fyra
  väntestycken står kvar på MediaPipe tills läsningen tas upp igen. Fältet `djup` i varje lyft säger vilket.
  Lederna flyttade sig högst 3–12 cm i kamerans givar.
- **Mot bordets kända punkter** (`lyft.py kanda`; `sam-prov/kanda-fore.json` och `kanda-efter.json`): högerns grepp
  där kortet läggs, kamerans givar, gick från 6,9 till 5,2 cm fel i djupled. Med handlederna fria gick det från 12,4 till
  6,1 cm. Vid skon jämförs inget: skon mäts om.
- **Skon:** i SAM-lyften låses vänsterns handled inte längre på 0,10 m (`HAND_AT_SHOE`, antaget) där kortet lämnar
  skon. I MediaPipe-lyften gör den det fortfarande; det är en höjd, inte skons punkt. Kortets `c` före det lämnar skon
  läses ur `uppsattning.json` och följer med när skon har nya mått och `lyft.py giv` körs igen.
- **Armarna** ur SAM för kamerans dealer: 0,285 och 0,259 m (spridning 0,5 cm över 69 rutor), med dockans rättelse
  0,289 och 0,279 m, bredvid mannens 0,279 och 0,272. Det är en skattning och står i fältet `armar`; bordets dealer har
  de antagna 0,30 och 0,26.
- **Blicken** räknas mot livebordets kamera (0,6175 m, 18,13 grader). Huvudets och nu också ögonens vila, som de är i
  spelskyltarnas rutor där båda mest ser in i kameran, tas bort. MediaPipe läste bordets dealer med blicken 18 grader
  nedåt också där; kamerans dealer 5 grader. I väntan ser båda 8–18 grader över kameran, troligen på en skärm. Varje ruta
  har `blick` (kameran inom 20 grader, skon, plats n, egna korten, bordet, annat) och `blick_grader`.
- **SAM:s axeldjup** (bålens vridning) prövades på dockan och gjorde lyftet sämre: axlarna från 2,5 till 3,7 cm fel,
  högra armbågen från 3,6 till 7,6 cm. Axlarna står därför kvar på ett plan.
- **Skakigheten** när handen står still: handleden flyttar sig 0,3 mm per ruta i median (1,7 mm för nio av tio). Fingertopparna
  flyttar sig 1,9 mm (6,7 mm) och ligger 1,6 mm (4,8 mm) från sin egen jämnade väg. Fingrarna är MediaPipes hand, ojämnad.

**Körs om** från repots rot (`PY` som ovan, `SAMPY` är `../sam-3d-body/.venv/Scripts/python.exe -I`). Uppsättningen en
gång (Python 3.13; `HF_TOKEN` i `.env.local` i roten, med tillgång till den spärrade modellen hos Hugging Face):

```
py -3.13 -m venv ../sam-3d-body/.venv
../sam-3d-body/.venv/Scripts/python.exe -m pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision
../sam-3d-body/.venv/Scripts/python.exe -m pip install roma pytorch-lightning yacs omegaconf timm einops opencv-python-headless braceexpand huggingface_hub ftfy regex scikit-learn submitit termcolor torchmetrics scikit-image pandas
SAMPY live-bj/verktyg/sam_runpod.py installera ../sam-3d-body
```

Livebordet, här på datorn (rutorna i slasken raderas när svaret är sparat). Att ta upp läsningen igen där den
stoppades: lägg det sparade svaret i ut-mappen först, så läser `las` bara resten (cirka 190 rutor, 1–3 timmar):

```
PY live-bj/verktyg/sam_runpod.py rutor live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt slask/live-bj/sam/live live-bj/data/scen.json --tider live-bj/data/lyft --var 5 --vantan-gles 2 --tatt 2
mkdir -p slask/live-bj/sam/live-sam && cp live-bj/data/sam-prov/livebordet-sam.json slask/live-bj/sam/live-sam/sam.json
SAMPY live-bj/verktyg/sam_runpod.py las slask/live-bj/sam/live-sam slask/live-bj/sam/live/lista.json --tradar 3
PY live-bj/verktyg/sam_runpod.py spara slask/live-bj/sam/live-sam/sam.json live-bj/data/sam-prov/livebordet-sam.json
PY live-bj/verktyg/lyft.py giv live-bj/data live-bj/matt live-bj/data/lyft --sam live-bj/data/sam-prov/livebordet-sam.json
PY live-bj/verktyg/lyft.py kanda live-bj/data/lyft live-bj/data/uppsattning.json --ut live-bj/data/sam-prov/kanda-efter.json
```

`las` går med låg prioritet, tar upp där den slutade om den körs igen, och läser givarnas rutor först, sedan
väntans och sist de tätare kring kortets ögonblick. `lyft.py giv --sam` tar SAM:s djup bara i ett stycke som SAM har
läst igenom (`sam_covers`), så varje lyft har ett djup. Dockans prov (mätningen och rutorna i slasken, läsningen på en
hyrd maskin, betald: bara på Jakobs ord; `RUNPOD_API_KEY` i `.env.local`):

```
PY live-bj/verktyg/mat.py <filmen> <källfil> slask/live-bj/sam/matt --steg 1 --ensam
PY live-bj/verktyg/sam_runpod.py rutor <filmen> <källfil> slask/live-bj/sam/matt slask/live-bj/sam/docka spelet --var 1
PY live-bj/verktyg/sam_runpod.py rutor <filmen> <källfil> slask/live-bj/sam/matt slask/live-bj/sam/docka-som-live spelet --var 1 --som live-bj/data/scen.json
node live-bj/verktyg/sam_runpod.ts kor slask/live-bj/sam/korning slask/live-bj/sam/docka/lista.json slask/live-bj/sam/docka-som-live/lista.json
PY live-bj/verktyg/sam_runpod.py jamfor slask/live-bj/sam/korning/docka.json <facit> slask/live-bj/sam/matt live-bj/data/sam-prov/jamforelse.json
PY live-bj/verktyg/lyft.py prov slask/live-bj/sam/matt <facit> --sam live-bj/data/sam-prov/docka-var5-som-livebordet.json --ut live-bj/data/sam-prov/lyft-prov-med-sam.json
```

Källfilen till `mat.py` och `rutor` är som `data/kalla.json`: hela filmen som ett parti. `kor` hyr det billigaste
NVIDIA-kortet med minst 8 GB för högst 0,35 USD i timmen och förstör maskinen efteråt (en klocka, en vaktprocess
bredvid och ett `finally`); liggaren i ut-mappen håller alla körningar under 90 minuter och 3 USD sammanlagt, och
`--torr` gör allt utom att hyra. De två körningarna på dockan 2026-11-27 tog 12 minuter på ett RTX 3070 för 0,13 USD i
timmen: 0,03 USD (`jamforelse.json`, `kostnad`).

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

- Djupet. En kamera ger inget. Farter i meter håller på en tredjedel när, ett lyft 4–11 cm per led. SAM 3D Body gav
  1–5 cm på dockan och ligger i kamerans tre givar, men inte i bordets eller väntan (se ovan).
- Bålens avstånd bakom kanten är skattat (0,07 och 0,16 m), och bålens lutning framåt syns inte i lyften.
- Fingrarna. Handen är 40–55 bildpunkter; måtten säger att greppet lever, inte ledernas vinklar.
- Kortet i handen syns i 23 % av rutorna. Vändningen och kortets fart i handbytet går inte att få.
- Tal. Munnen öppnas nästan aldrig i mätningen.
- Höften, midjan och armens delar är dolda eller går inte att mäta framifrån.
- Partierna 25–35 s och 41–47 s är inzoomade 0,6–2 % utan att `ram.py` ser det; `scen.py` och `kort.py` rättar
  det, `mat.py` inte (punkterna ligger 1–2 bildpunkter fel vid händerna där).
- Kortlekens längd i skon är läst i två rutor; den krymper när korten delas ut.
- Slagen vid dealerns egna kort, svepen och sträckningarna i `rorelser.json` är inte kontrollerade i bild. I
  `segment.json` är svepet, korten in, dealerns kort, SKON och ANNAT sedda i bild i några fall var; PEKA och RATTA är
  för få för att säga mer än att de är sällsynta.

**Kvar att göra:**

- Fler lyft, i den ordning `data/segment.json` säger (`att_lyfta`): kort till plats 5 och 6, dealerns kort, andra
  kortet, väntan, svepet och korten in. Urvalet i `lyft.py` (`giv`) går i dag över styckena i `rorelser.json`.
- Mäta provet `naturlig-giv-20261127` som dockans andra filmer (`mat.py --ensam`, sedan `docka.py`).
- Djup ur SAM 3D Body för bordets givar och väntestyckena: läsningen tas upp där den stoppades (kommandot under
  "Djup ur SAM 3D Body"), sedan `lyft.py giv --sam` igen. Det tar 1–3 timmar på processorn när datorn är fri.
- Låta `ram.py` se inzoomningen (smala kontrollrutor intill bildens kant) och köra om `mat.py` för de två partierna.

**Det som kräver filmen:** allt ovan utom lyften och stilarna. Filmen ligger inte i Git; den hämtas med kommandot
i tabellen, och `matt/` (måtten per ruta, 160 MB) görs om med `mat.py` och `kort.py` på ungefär en timme. Finns
`matt/` kvar på datorn behövs filmen bara för att titta (`titta.py`, `streck.py`, `overlagg.py`).
