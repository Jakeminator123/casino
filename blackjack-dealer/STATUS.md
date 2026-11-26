# Status

Läget och nästa steg per bana. Ersätt det som inte längre gäller; historien står i Git.

## Läget

- **Datorn:** Jakob började om här 2026-11-25; det på den stationära kopieras inte hit, utom en enskild godkänd fil han
  ber om. I `assets/` ligger det tatuerade som hämtades ur Blob eller återskapades ur Runway (382 filer, cirka 0,67 GB,
  varje fil kontrollerad mot sin SHA-256): Tatuerads filmer, ankarna, rummen, introfilmen och brickan. Hans domar på
  borttagna tagningar står i `data/motions-removed.jsonl`. De otatuerade händerna togs bort 2026-11-26 på hans ord
  ("radera alla filmer och referenser till och med de filmer som härrör till och från nodträdet Casino"): trädet Casino
  med 281 poster, helfigursfilmerna in och ut, 144 filmer här (1,1 GB), deras roller och bilder i Material, 97
  beställningar, de fyra munlapparna och kortspåren. Kopian, kontrollerad mot SHA-256, ligger i mappen
  `casino-otatuerad-arkiv` bredvid repots mapp; `innehall.json` där säger vad varje fil är, med träd, steg och dom.
  Registren pekar sedan 2026-11-26 bara på det som finns här (Jakob: "DU får radera typ alla gamla poster eller
  historiska pekare i studion som går till paow:s filmer som inte finns eller tomma reffs"): 56 poster i 48 filmer (alla
  25 talfilmer, 17 vilor och sex givar), 35 bilder och filmer i Material, dockans 43 referensfilmer, 26
  beställningar utan film här och 15 besvarade kort i Beslut vars prov inte finns är borta; domarna på posterna står som
  rader i `data/motions-removed.jsonl`. Utan fil står bara det som väntar på honom (nedan), läppsynkens prov och
  ursprungsuppgifter (kvitton, källbilder, scenens mätkällor). Nätdelen vilar; kopian på nätet står på `c9d006d`
  från 2026-11-20, och Blob (`dealer-studio-media`) har kvar cirka 1,3 GB som inget här använder: äldre utgåvors filmer,
  Pamelas filmer, provfilmer och 49 av Casinos talfilmer.
- **Dealern** är Paow, med de tatuerade händerna (Jakob 2026-11-24: "vi ska köra enbart med hennes nya händer och de
  tatuerade klippen"). Pamela och V6 är arkiverade utanför repot (2026-11-20, 2026-11-23).
- **Film:** metoden som håller (2026-11-23): giv och återgång i en film, Kling 4, 4 s, första bild A2.3
  (`paow-ankare-2-3-d`), sista bild samma med kortet på platsen, dockans byggda film som referens. Från A2.1
  (`paow-nyp-tatuerad`) underkände han fem av sex givar 2026-11-24 ("MÅSTE FINNAS METODFEL"). A2.2 är arkiverad
  (2026-11-23). A2.3:s äldre versioner (a, b, c med blicken åt sidan, utan vit linje), landningsbilderna (A3) och filmerna
  som bara stod på dem är borta sedan 2026-11-26 (Jakob: "om en ny version i bokstavslogiken du har övertar en tidigare
  så ska ju tidigare raderas"); ingen av dem spelades, och kopian ligger i arkivets `aldre-versioner/`.
- **Karta:** ett träd, Tatuerad (spelas), med två grenar från samma A1: A2.3, skjutet (21 av 36 steg, det spelet
  spelar), och A2.1, nypet (`tatuerad-nyp`, byggs, 9 av 36). Trädet Casino med de otatuerade händerna är borta
  (2026-11-26); filmen före spelet står kvar för sig, utan träd. En lista överst väljer ett träd, nätet (Alla träd) eller
  en komposition; `tatuerad-skjut-nyp` bestämmer hur ofta varje gren spelas.
- **Kort:** ett kort per sida med märkena överallt; kortplanen i verkligt perspektiv genom filmens lins (Standard), som spelet och
  scenen följer. Det styva kortet utan vit kant har hans ja i Scen (2026-11-23).
- **Studion:** ramen har neutral grafit och en meny med ett namn per rad (2026-11-25), väntar på hans ord om
  utseendet; flera flikar får vara öppna. Bordet är vyn av bordet. Inspelning (förut Kortplan) har en bild sedan 2026-11-25 ("ett och
  samma läge", "allt i 3d"): dockans 3D-bord med planens kort på filten, och en högerspalt där dockans reglage står
  under steg 2; den platta planen och dess bakade bakgrundsbilder är borta. Ingången (A2.1 eller A2.3) är trädets,
  det spelade trädet som förval; planens Handbyte väljer ingenting. Reglaget Filmen i bildens knapprad lägger kortets
  film över dockan genom Filmens kamera (2026-11-25); av vyerna är Spelets vy förvalet och standarden (2026-11-26),
  Filmens kamera finns kvar för de filmer som finns, och de andra är till för att titta runt. Inspelning rensades 2026-11-26 på hans ord ("Snäpp", "Kontrollerad" "och andra saker"): borta är
  Snäpp, Startförslag, Kontrollerad, Skons läge, valet Giv eller Giv och återgång och dockans eget val av ingång;
  Kortet ligger väljs bara för dealerns kort. Bordet BORD-02 är ett prov i studion ("skitbra" som alternativ,
  2026-11-20) som spelet inte slår på före hans ja.
- **Standarden** (2026-11-25, `docs/SYSTEM.md`): tre lager. I botten inspelningens fasta mått i `src/table-lens.ts`
  (kamera, bord, kort, sko, markerlåda) och planens platser, som dockan, Inspelning, Scens grund och varje beställd film
  utgår från. Över den spelvyn, det spelaren ser: en inramning för dator och en för mobil, sparad en gång i Scen och
  gemensam för alla utseenden (2026-11-26; Dator är Casinos förra inramning, zoom 0,84 och 9,7° lutning). Överst
  utseendet han ställer in i Scen och som Casino visar (rum, bord och duk, kortens ritning, linsen). Bred lins är sedan
  2026-11-26 ett reglage i utseendet (Lins under Bord), levande i Scen och sparat med varje utseende, så Scen öppnar
  Casinos utseende som Casino spelar det. Ett utseende ändrar inte måtten: i Standard är skalan alltid 1. Kvar att rätta
  eller välja: korten under Bred lins (steg 9 D2), dockans sko (lägre baktill än filmens, 15–17 px), dockans huvud (något
  högre och smalare än
  hennes) och att dockan inte läser ett korts riktning ur planen. Dockans bord ritar markerlådan som en mörk försänkning
  med standardens mått.
- **Spelet** spelar trädet Tatuerad med nödlösningar där film saknas (`STAND_IN_FILM`). Realtidsmunnen
  (storlek F) har hans ja men når 12–13 rutor/s på hans RTX 3060 mot 24. Den neutrala munnen gäller alla Paows repliker,
  men talfilmerna finns inte här: de 25 tatuerade fanns bara på den stationära och togs ur registren 2026-11-26 (hans
  dömda blackjack med den gamla munnen låg i trädet Casino och finns i arkivet). Dealerbytet har ingen film sedan
  helfigursfilmerna med de otatuerade händerna togs bort (2026-11-26): spelet hoppar över det och säger att filmen
  saknas. Inga munlappar: alla fyra låg på Casinos filmer. Trailern är pausad (2026-11-17).
- **3D-dockan:** en dockfilm görs i ett steg (`node tools/doll-order.ts paow P5.C1`, alltid från A2.3; nypet med
  `--fran a2-1`); givarna från A2.3 följer dockan svep24d, given från A2.1 `dealer3d/src/pinch-deal.ts`. Jakob
  2026-11-23: "Jag gillar verkligen docklabbet!" Dockan är kod (cylindrar och kulor ur mått, inget skelett) och
  rörelserna ledernas lägen i meter; Blender kan inte öppna dem. Paows mått kommer från SAM 3D Body, standarddockans är
  antagna, och varje grundrörelse läggs på standarddockan och förs över till den valda dockan. Sedan 2026-11-26 har
  den vita dockan bäcken, lår, underben och en pall (gissade mått, lika för alla dockor; de syns bara i vyerna runt
  henne, filmens kamera ser henne som förut), och en riggad kropp med fingerben kan stå på den vita dockans plats och
  följa samma leder med fingrarna böjda som dockans (`dealer3d/src/figure-model.ts`). Dockvyn (Bordets Inspelning och
  `/dealer3d/docka`) ritar så standarddockans kropp, kvinnan som förval (Jakob 2026-11-26: standarddockan "för allt som
  syns"; `?figur=man` mannen, `?figur=vit` eller en dator utan modellen den vita figuren); referensfilmernas inspelning
  ritar den vita figuren som förut (`?model=1` där). Dockvyn ritar också standardrummet runt henne och öppnar i
  spelets vy (Jakob 2026-11-26: "Vi ska ha in vy/vinkel och allt det andra från 'standarddockan'-mappens
  mini-blender"): Blenders bord med kanten 15 cm närmare, skon med frontplattan, brickan, stolen och ljuset, samma
  som editorn i `../standarddocka/` ritar (`dealer3d/src/standard-room.ts`; `?scen=gammal` eller en dator utan
  modellerna ger den äldre scenen; "Filmens kamera" finns kvar som vy för de filmer som finns). Kvar där: blicken mot
  kameran, regeln som håller underarmarna över den närmare kanten, och kortet i skons öppning, som ritas framför
  frontplattan. Vägen till att den äldre dockan tas bort står i
  `../standarddocka/README.md`, "Plockas in". Markerbrickan
  är i rummets utseende en riktig försänkt bricka med mässingsram och marker på standardens plats; referensfilmens
  utseenden ritar ingen bricka, som förut. I Naturlig tar
  högerhanden emot kortet med handryggen upp, pekfingret på kortet och tummen under kanten (2026-11-25: "handrygg syns
  mer och att tummen istället kommer mer under kortet"); handleden vid handbytet böjer nu 11–26° i stället för 25–40°
  på platserna 1–4.

## Nästa steg

0. **Det tatuerade materialet:** ankarna och 37 filmer är återskapade här ur Runway. Det som bara fanns på den
   stationära är borta ur registren (2026-11-26, på hans ord) och görs om här när det behövs: talfilmerna (först en bank
   av en tatuerad vila som finns här), vilorna och dockans referensfilmer (`node tools/doll-order.ts`).
1. **Film:** fyll Tatuerad från A2.3: plats 7 (händerna vände inte kortet) och filmen som vänder upp D.C1 (utkastet
   `paow-halkort-06`). Sedan A2.1 igen med EN pilot som han ser i spelstorlek först. En nästan bra film görs om "bara
   litegranna"; givens tid cirka 1,3 s ut och 0,8 s tillbaka (2026-11-23, 2026-11-24).
2. **3D-dockan:** Paows dockhänder (`PAOW.hand` i `dealer3d/src/doll.ts`, lästa 2026-11-23 ur de äldre ankarna) läses
   om ur de tatuerade ankarna med `dealer3d/tools/docka-hand.ts` när de ligger fast: vänsterhandens lillfinger står
   rakt ut vid A2.3 (knogen 33° åt sidan och 24° bakåt, utanför handregeln), vilket syns från A1 till A2.3 och i varje
   givs första ruta. Dockan från A2.1 görs om, enklare, med kortbanan ur dockan (2026-11-24), och härmar de bästa
   A2.1-klippen, som han själv vill välja (2026-11-23); en giv tar 2 s som förval; händerna fria i givarna;
   handleden i vändningen; P7.C1:s vändning (förvalet 17 rutor, hans undanlagda standard 11); ställningen A2.1, där
   lång-, ring- och lillfingret ligger upp till 34 mm inne i skons kropp redan i första rutan
   (`dealer3d/data/ankare-2-1-paow.json`; lillfingrets topp syns som en vit prick i P7.C1, ruta 16–17); ett stängt nyp
   (dockan lägger inget stängt kort från A2.1, fast hon gjorde det i den otatuerade `paow-giv-2-1-d-01-01`, nu i
   arkivet); en kropp som lutar sig mot
   plats 1–2; SAM-dockan ("Ja bygg den riktiga SAM-dockan", 2026-11-23).
3. **Karta:** bryggorna för nypet (A2.1 → A1, A2.1 ↔ A2.3); kameran som en dimension (2026-11-23); kort 3–7
   återbrukar bara kort 2.
4. **Spelet:** bara trädet när filmerna finns (lånen stryks), och en hel giv får hans ja i spelstorlek. För talet är
   läpparna i realtid på hans RunPod huvudmålet (2026-11-17), och talfilmerna förs in i nodträdet (2026-11-24). Hans
   idé, obyggd: munnen ur hennes egen leendefilm (Tatuerads `paow-vila-tat-03-01`, som bara fanns på den stationära). Mungiporna och överläppen är inte lösta i hans ögon.
5. **Kort:** kortets efterarbete i förväg per film (2026-11-17); grafiken på kortet prövad mot alla filmer
   (2026-11-23, `/kortlandning.html`).
6. **Studion:** färre val, det uppenbart dubbla bort först: Casinos adress `/game/`, och verktygens meddelanden till
   agenter som ännu säger "labbet" (`tools/build-studio-snapshot.ts`, `lab-look.ts`, `media-audit.ts` med flera) liksom
   granskningens sparade text (`studio/lib/verdict.ts`); sidorna bredvid (Ljud, Modeller, Grafik) får
   ramens utseende (ordet "labb" är borta ur dem, 2026-11-26); fler register in i SQLite som filmregistret
   (2026-11-23). Granska: en tagning vars film inte finns på datorn ska inte stå som väntande, och sidan ska säga att
   filmen saknas här. Ur granskningen 2026-11-26 står kvar: sökvägar till en viss disk i `data/` (`media-roles.json`,
   `dealers.json`, `dealer-standard.json`, `order-methods.json`, `scene-contract.json`, `props.json` och två
   beställningar), försäkringen som spelets sida inte visar för sig (händelsen bär den nu som `insurance`), och
   resterna från Scout (loggan i scenen, klippfamiljerna, sidospelen som inte går att lägga, talets läppsynk).
7. **En standard hela vägen** (Jakob 2026-11-25: "detta ska vara en standard"): planens dolda rörelseval (`intent`:
   grepp, var och hur kortet vänds, hand, handbyte) styr ännu receptets text utan att kunna väljas, och tas bort ur plan
   och recept så att rörelsen bara är dockans, med ordlistans ord för dem (Handleden vänder kortet, Som en nyckel, Vänd
   vid platsen) och förvalsplanen i koden, som bara gäller utan fil och har P4.C2 och D.C2 stängda (`defaultPlan` i
   `src/placement-model.ts`); beställningens val Med eller Utan referensfilm och listan med Ingen gör samma sak;
   `SHOE` som plats lever kvar som tre spärrar i `studio/lib/bordet.ts` fast skon inte längre går att välja;
   dockan läser kortets riktning ur planen; bildstorleken och kortets mått, som ett
   tjugotal filer ännu skriver själva (`src/film-after.ts`, `film-fix.ts`, `order-model.ts`, `tools/order-store.ts`,
   `studio/lib/rounds.ts` med flera), hämtas från `src/table-lens.ts`; dockans bord ritar en sko med
   filmens höjd; Scen visar dockan i samma bild som filmen, rummet och bordet, så att Inspelning och Scen blir ett läge.
8. **Standarddockan** (Jakob 2026-11-25, 2026-11-26): byggd i `../avatar-auto-pipeline` som en kvinna och en man med
   samma skelett, som Blender öppnar, med måtten skrivna ur spelets kod (`scen/gen_standard.py`, `scen/bygg_docka.py`);
   kropparna följer dockans rörelser här, med fingrar (provat med mannen i given till plats 4). Hans riktning 2026-11-26: standarddockan ska kunna rörelser som är riktigt bra
   och bära standarden för bordet, korten, skon och kortplatserna, för nästa dealer; Paows docka får vara som den är;
   och bordet ska komma närmare dealern ("skjuta bak bordet litegranna"), med kortplatserna, skon och kameran kvar.
   Det provas med `tableBack` i `dealer3d/src/stage.ts` (sidans `?bordbak=`): 15 cm räcker för att bordet ska nå
   magen och skon stå helt på bordet, och markerbrickan följer då med till dealerns kant. Dockans bord är sedan
   samma natt standardens (halv ellips 1,90 × 1,15 m, sarg, rulle, två ben och golv 0,95 m under filten, måtten ur
   `src/table-lens.ts`). `tableBack` är ett
   prov, ingen standard. Att luta bordet mot kameran provades samma natt och ströks på hans ord ("Vi skiter i lutning
   av bordet"); koden för det är borta. **Arbetet med standarddockan sker från 2026-11-26 i en egen mapp,
   `../standarddocka/`** (hans ord: en tredje mapp där han och dockans chatt arbetar, "sedan när vi är nöjda kan delar
   plockas in" hit och i `../avatar-auto-pipeline`): där görs vyn han vill ha (Blenders, som han tycker är mycket
   bättre än dockans scen här), bordet med kant och bricka, dockans blick mot kameran och rörelserna. Här ändras
   inget mer för standarddockans skull tills det plockas in; det som då ska in står i den mappens README. För Paows
   filmer kan bordskanten bara flyttas på sidorna om henne: kroppen är avklippt där den gamla kanten gick.
   SAM-uppsättningen och Paows avläsningar finns inte på den här datorn.
9. **Bred lins räknad ur standarden** (Jakob 2026-11-25 och 2026-11-26: Bred lins "som bara kan göras utifrån en
   standard"). Byggt 2026-11-26: linsen är nyckeln `lins` i utseendet, spelvyn är en egen sparad standard, Scens
   knappar är Prova i Casino → Använd i Casino → Publicera, och ett utseende har ingen egen skala eller kamera längre
   (Skala k och Dealerns lins är borta; `docs/SYSTEM.md`, Standarden). Bred lins egna tal tas i två steg som aldrig
   blandas och som båda ändrar Casinos bild, så han ser en före- och efterbild innan något av dem går in:
   - **D1, måtten ur standarden: gjord** (Jakobs ja i Beslut 2026-11-26). Under Bred lins räknas skalan vid
     dealerkantens mitt ur de två linserna genom filmens bildpunkter (1,897 i stället för kontraktets 2; `wideCamera` i
     `src/scene3d-geometry.ts`, aldrig en nyckel). Insatsringarna har en regel under båda linserna (halva det lagda
     kortet + radien + 12 mm; `ringOffset`), bordets djup är ett verkligt bords lagt genom bildpunkterna (`tableUnder` i
     `src/scene3d-table.ts`, så att filten når bildens nederkant på en telefon), och markerlådan tar skalan tvärs och sitt
     lagda fotavtryck på djupet (`trayDeep`). Bordets saker är 5,2 % mindre kring dealerkantens mitt och lådan djupare
     mot spelarna; korten, dealern, rummet och Standard står kvar. Rummet, filmens plats och vyn behåller kontraktets
     k = 2: ingen film mäter en kuliss. Hans anteckningar på provet gällde spelvyn, inte linsen: på dator kapas hennes
     hjässa (han vill ha cirka en decimeter mer ovanför henne), och på mobil går plats 1 och 6 inte att spela ("kanske
     tilta mobilen elelr någoting senare", annars "typ såhär för nu").
   - **D2, korten under Bred lins:** en kortregel under båda linserna (dealerns kort 75 × 57 px i
     stället för 61 × 35 under Bred lins); `flatQuad` i `createLayout` och kontraktets vilande kort går då bort. Väntar
     på sin egen före- och efterbild.
   Mätningen som håller Casino på plats: `tools/scene-measure.ts` (sidorna på dator och mobil för `tools/lab-look.ts`,
   och största flytt i bildpunkter mellan två körningar). Nyckeln lins och spelvyn höll varje punkt inom 0,01 bildpunkt;
   det enda som flyttade sig var det som skulle: Casinos råkade sidvridning (0,07°) är borta.
10. **Inspelning: dra i dockan** (Jakob 2026-11-26: "en hand eller kanske armbåge kan dras i en lite annorlunda bana
   eller kanske kunna vrida huvud"). Byggt samma natt: trädet väljs i raden ovanför bilden och avgör varifrån dockan
   ger, vilken film Filmen lägger över henne och vilka filmer steg 3 listar; och varje reglage under steg 2 är mätt
   (lederna flyttas 3–39 cm mellan ändlägena), de som var gamla val är borta och de som inte kan verka i läget visas
   inte (`docs/SYSTEM.md`, Dockan). Kvar: dragningen med musen, som dockans chatt tar; den binds till samma reglage, så
   att det finns en väg och ett sparat värde, genom kedjan i `dealer3d/page/natural-lab.ts`. Kvar i dockans server
   (`dealer3d/page/server.ts`): namnmönstret för en A2.1-standard, som ingenting längre skriver eller läser.

## Väntar på Jakob

- Standarddockan (2026-11-26): mannens nya giv, provet `giv-man-20261126` (Granska, Prov) med kortet
  `mannens-giv-vandningen` i Beslut: version A (kortet vänds direkt efter handbytet) eller B (vänds vid platsen), till
  plats 4, och A till plats 5, med den nya kroppen vid halvmånen i spelets vy. Hans svar avgör vilken vändning som
  ritas till alla sju platser och för kvinnan. Arbetet sker i `../standarddocka/` (läget och nästa steg i dess README)
  och visas för honom som prov härifrån; hans ord står som krav i `../standarddocka/AGENTS.md`.
- Dockans film omgjord till en person (betalda prov, 776 krediter): proven `docka-till-person-20261126` (dömt "Mycket
  bra"), `docka-till-person-2-20261126` och `docka-till-person-3-20261126`; de två sista har var sitt kort i Beslut
  (håller skarven mellan två klipp, och ska dealern filmas i nyckelfärger). Vad som prövades står i
  `../standarddocka/README.md`, Nästa steg.
- Om det som Material behåller utan fil ska kopieras hit från den stationära: hans två bilder av henne, hennes två
  keystones och kortets textur (`assets/cards/kortets-textur.png`), som en ny beställning ritar kortet med. Allt annat
  som bara fanns där är borta ur registren sedan 2026-11-26. Talets nästa replik behöver en bank av en tatuerad vila som
  finns här: `data/speech.json` pekar ännu på `paow-vila-tat-01-01`, som inte gör det.
- Återskapat här ur Runways leveranser (2026-11-25; Runway behåller en leverans cirka fem dygn, och den hämtas gratis
  med uppdragets id): ankarna A1 `paow-vila-tatuerad`, A2.1 `paow-nyp-tatuerad`, A2.3 `paow-ankare-2-3-d`, `-c` och
  `-marke` och stolarnas sex, som rutor ur filmerna, och 37 filmer genom `tools/film-after.ts`: Tatuerad har film
  på disken för 20 av 36 steg, Tatuerad nyp för alla sina 8. Samma rutor som originalen men inte samma filer:
  posterna bär de nya filernas sha256, domarna är orörda, och ursprunget står i `assets/motions/<klipp>/generation.json`
  och ankarnas `receipt.json`.
- Dockans standarder: Paows 15 sparade
  standarder är undanlagda på hans ord (2026-11-26, `dealer3d/standard/undanlagda/2026-11-26-011850/`): förvalet
  gäller på varje plats, och den förra tas tillbaka med Ta tillbaka den förra på dockans sida. Provet
  `nyp-plats-1-2-20261126` visar nypet till plats 1 och 2 bredvid hennes filmer (dockan vänder kortet i luften, hon
  vid platsen).
- Hans ögon på spelvyn och linsen i Scen (2026-11-26): gruppen Spelvy (Visa Inspelningen, Dator eller Mobil; Spara
  som spelvy) och Lins under Bord. Spelet utan valt utseende och grundutseendena följer nu spelvyns Dator (9,7°
  lutning i stället för 8°); Jakob-1 och Profilval 1 har kvar sin egen inramning på dator. På mobil gäller alltid
  spelvyns Mobil, så Profilval 1:s egen sidvridning syns inte längre där.
- Korten under Bred lins (steg 9 D2): ska de ritas som filmens egna (dealerns kort 75 × 57 px i stället för 61 × 35)?
  Han svarar när han har sett en före- och efterbild, gjord som D1:s: headless Chrome mot Casino på dator och mobil, med
  spelets moduler ur två kopior (före och efter) i slaskens `granska/`, mätt som `tools/scene-measure.ts` mäter.
- Två frågor om det som städades 2026-11-25: om
  egna returfilmer, landningsbilderna (A3) och A2.2 ska bort också ur beställningsmodellen (`tools/landing-make.ts` och
  stegen RETUR och 2.2 lever kvar där för de sparade beställningarnas skull); och om 3D-banans äldre verktyg som kräver
  SAM-uppsättningen på den stationära ska vara kvar (`dealer3d/tools/docka-sam.py`, `docka-mat.ts`, `docka-jamfor.ts`,
  `lift.ts`, `deal-film.ts`, `pose-film.ts`, `doll-pose.ts`, `docka-hand.ts`).
- Trädet Tatuerad har ingen egen film för A2.3 → A3P4C2: de godkända tagningarna dit (`…-p4-c2-stol-…`) är stolarnas
  och spelas inte rakt, så Inspelning och Scen visar den spelet spelar. Han väljer om de ska in.
- Hans dom på `paow-giv-2-3-d-03-01` och `paow-halkort-05-01` (filmerna finns här), och andelarna för skjut och nyp i
  Karta.

## Kända brister

- Givarna från A2.3 gjordes från ett äldre ankare (blicken åt sidan), så huvudet hoppar mot ingången; en giv utan sista
  bild lägger kortet med vit kant eller fel; dockans vändning görs med fingrarna, inte handleden.
- Kortets märke når inte spåraren och spelets pålägg; Paows givar är 15–37 % för små vid ytterplatserna; det ritade
  kortet hoppar i handen.
- Spelet låser sig när ett svar går förlorat ("The session is at version N") tills sidan laddas om.
- Kön läggs bara när en huvudagentchatt är öppen (`tools/order-watch.ts`); fullmaktens dagstak räknar bara den här
  utcheckningens liggare; `tools/speech.ts` tar inte GPU-låset självt.
- Ingen granskare kan höra: ljud bedöms av Jakob. Kopian är inte prövad på en fysisk telefon.
- Beställ visar 35 levererade beställningar som "Godkänd, i kön" med trasiga bilder: deras filmer finns här, men
  in-bilderna och kvittona bara på den stationära. Rättas i koden: en beställning med post i filmregistret visas som
  levererad, och en saknad bild som "finns inte här".
- I Bordet med Standarddockan visar platsknapparna inte vilka platser som har en ritad giv: en plats utan giv visar
  plats 4 med en rad om det.

Önskemål, inget beställt (2026-11-11, 2026-11-13): ett tredje och fjärde dealerkort, mer rörelse i kropp, huvud och
högerarm när hon delar ut, kaffe ur en mugg i bilden, en animation på bordet, marker som dealern tar och betalar,
insamling av korten, en andra spelarfigur.
