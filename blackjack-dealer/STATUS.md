# Status

Läget och nästa steg per bana. Ersätt det som inte längre gäller; historien står i Git.

## Läget

- **Datorn:** Jakob började om här 2026-11-25; det på den stationära kopieras inte hit, utom en enskild godkänd fil han
  ber om. I `assets/` ligger bara det som hämtades ur Blob samma dag (258 filer, cirka 1,2 GB, varje fil kontrollerad mot
  sin SHA-256): Paows filmer som kopian spelade och de bra filmerna i nodträdet som Blob hade, rummen, introfilmen och
  brickan. Registren rensades samma dag: det som pekade på media som varken finns här eller i Blob är borta, liksom
  Pamelas och V6:s hashlista i `data/manifest.json` (arkivet har sitt eget kvitto); hans domar på borttagna tagningar
  står i `data/motions-removed.jsonl`. Utan fil här står nu bara det som väntar på honom (nedan), 49 tagningar vars film
  finns i Blob (sekundära och underkända), de låsta beställningarna och ursprungsuppgifter (kvitton, källbilder, scenens
  mätkällor). Alla kort i Beslut är besvarade. Nätdelen vilar; kopian på nätet står på `c9d006d` från 2026-11-20, och
  Blob (`dealer-studio-media`) har kvar cirka 1,3 GB som inget använder: äldre utgåvors filmer, Pamelas filmer och
  provfilmer.
- **Dealern** är Paow, med de tatuerade händerna (Jakob 2026-11-24: "vi ska köra enbart med hennes nya händer och de
  tatuerade klippen"). Pamela och V6 är arkiverade utanför repot (2026-11-20, 2026-11-23).
- **Film:** metoden som håller (2026-11-23): giv och återgång i en film, Kling 4, 4 s, första bild A2.3
  (`paow-ankare-2-3-d`), sista bild samma med kortet på platsen, dockans byggda film som referens. Från A2.1
  (`paow-nyp-tatuerad`) underkände han fem av sex givar 2026-11-24 ("MÅSTE FINNAS METODFEL"). A2.2 och
  landningsbilderna (A3) är arkiverade (2026-11-23, 2026-11-24).
- **Karta:** fyra träd: Tatuerad (spelas, skjuter kortet från A2.3, 21 av 36 steg), Tatuerad nyp (byggs, nyper från
  A2.1), Casino och Ingången (vilar). Kompositionen `tatuerad-skjut-nyp` binder de två tatuerade (2026-11-24).
- **Kort:** ett kort per sida med märkena överallt; kortplanen i verkligt perspektiv genom B-linsen, som spelet och
  scenen följer. Det styva kortet utan vit kant har hans ja i Scen (2026-11-23).
- **Studion:** ramen har neutral grafit och en meny med ett namn per rad (2026-11-25), väntar på hans ord om
  utseendet; flera flikar får vara öppna. Bordet är vyn av bordet. Inspelning (förut Kortplan) har en bild sedan 2026-11-25 ("ett och
  samma läge", "allt i 3d"): dockans 3D-bord med planens kort på filten, och en högerspalt där dockans reglage står
  under steg 2; den platta planen och dess bakade bakgrundsbilder är borta. Ingången (A2.1 eller A2.3) är trädets,
  det spelade trädet som förval; planens Handbyte väljer ingenting. Reglaget Filmen i bildens knapprad lägger kortets
  film över dockan genom samma kamera (2026-11-25); av vyerna är bara Filmens kamera standarden, de andra är till för
  att titta runt. Inspelning rensades 2026-11-26 på hans ord ("Snäpp", "Kontrollerad" "och andra saker"): borta är
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
  eller välja: Bred lins egna tal (steg 9 D), kortets form (87 % i spelet och i beställningens sista bild, ett verkligt
  kort hos dockan), dockans sko (lägre baktill än filmens, 15–17 px), dockans huvud (något högre och smalare än
  hennes) och att dockan inte läser ett korts riktning ur planen. Dockans bord ritar markerlådan som en mörk försänkning
  med standardens mått.
- **Spelet** spelar trädet Tatuerad med nödlösningar där film saknas (`STAND_IN_FILM`, `SEAT_HUB`). Realtidsmunnen
  (storlek F) har hans ja men når 12–13 rutor/s på hans RTX 3060 mot 24. Den neutrala munnen gäller Paows repliker utom
  blackjack (`paow-tal-blackjack-sv-04`, hans dom). Trailern är pausad (2026-11-17).
- **3D-dockan:** en dockfilm görs i ett steg (`node tools/doll-order.ts paow P5.C1`, alltid från A2.3; nypet med
  `--fran a2-1`); givarna från A2.3 följer dockan svep24d, given från A2.1 `dealer3d/src/pinch-deal.ts`. Jakob
  2026-11-23: "Jag gillar verkligen docklabbet!" Dockan är kod (cylindrar och kulor ur mått, inget skelett) och
  rörelserna ledernas lägen i meter; Blender kan inte öppna dem. Paows mått kommer från SAM 3D Body, standarddockans är
  antagna, och varje grundrörelse läggs på standarddockan och förs över till den valda dockan. Sedan 2026-11-26 har
  den vita dockan bäcken, lår, underben och en pall (gissade mått, lika för alla dockor; de syns bara i vyerna runt
  henne, filmens kamera ser henne som förut), och en riggad kropp med fingerben kan stå på den vita dockans plats och
  följa samma leder med fingrarna böjda som dockans (`dealer3d/src/figure-model.ts`, sidans `?model=1`). I Naturlig tar
  högerhanden emot kortet med handryggen upp, pekfingret på kortet och tummen under kanten (2026-11-25: "handrygg syns
  mer och att tummen istället kommer mer under kortet"); handleden vid handbytet böjer nu 11–26° i stället för 25–40°
  på platserna 1–4.

## Nästa steg

0. **Det tatuerade materialet:** ankarna och 37 filmer är återskapade här ur Runway (väntar på Jakob, nedan). Det som
   återstår på den stationära: kopieras det hit eller görs det om? Görs det om tas tagningarnas poster bort med
   `node tools/register.ts remove <id> --why "<text>"`, så att domarna står kvar i `data/motions-removed.jsonl`.
1. **Film:** fyll Tatuerad från A2.3: plats 7 (händerna vände inte kortet) och filmen som vänder upp D.C1 (utkastet
   `paow-halkort-06`). Sedan A2.1 igen med EN pilot som han ser i spelstorlek först. En nästan bra film görs om "bara
   litegranna"; givens tid cirka 1,3 s ut och 0,8 s tillbaka (2026-11-23, 2026-11-24).
2. **3D-dockan:** Paows dockhänder (`PAOW.hand` i `dealer3d/src/doll.ts`, lästa 2026-11-23 ur de äldre ankarna) läses
   om ur de tatuerade ankarna med `dealer3d/tools/docka-hand.ts` när de ligger fast: vänsterhandens lillfinger står
   rakt ut vid A2.3 (knogen 33° åt sidan och 24° bakåt, utanför handregeln), vilket syns från A1 till A2.3 och i varje
   givs första ruta. Dockan från A2.1 görs om, enklare, med kortbanan ur dockan (2026-11-24), och härmar de bästa
   A2.1-klippen, som han själv vill välja (2026-11-23); en giv tar 2 s som förval; händerna fria i givarna;
   handleden i vändningen; P7.C1 (hans `dealer3d/standard/paow-p7c1.json` ger vändningen 12 rutor, den behöver 20: han
   sparar om den); en kropp som lutar sig mot plats 1–2; SAM-dockan ("Ja bygg den riktiga SAM-dockan", 2026-11-23).
3. **Karta:** bryggorna för Tatuerad nyp (A2.1 → A1, A2.1 ↔ A2.3); menyn görs om, träden som nivåer man rullar mellan
   och kameran som en dimension (2026-11-23); kort 3–7 återbrukar bara kort 2.
4. **Spelet:** bara trädet när filmerna finns (lånen stryks), och en hel giv får hans ja i spelstorlek. För talet är
   läpparna i realtid på hans RunPod huvudmålet (2026-11-17), och talfilmerna förs in i nodträdet (2026-11-24). Hans
   idé, obyggd: munnen ur hennes egen leendefilm `paow-vila-03-01`. Mungiporna och överläppen är inte lösta i hans ögon.
5. **Kort:** kortets efterarbete i förväg per film (2026-11-17); grafiken på kortet prövad mot alla filmer
   (2026-11-23, `/kortlandning.html`).
6. **Studion:** färre val, det uppenbart dubbla bort först: Casinos adress `/game/`, och verktygens meddelanden till
   agenter som ännu säger "labbet" (`tools/build-studio-snapshot.ts`, `lab-look.ts`, `media-audit.ts` med flera) liksom
   granskningens sparade text (`studio/lib/verdict.ts`); sidorna bredvid (Ljud, Modeller, Grafik) får
   ramens utseende (ordet "labb" är borta ur dem, 2026-11-26); fler register in i SQLite som filmregistret
   (2026-11-23). Granska: en tagning vars film inte finns på datorn ska inte stå som väntande, och sidan ska säga att
   filmen saknas här.
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
   kvinnans kropp följer dockans rörelser här, med fingrar (provet `docka-kropp-20261126`). Kvar: kroppen som ett val i
   Inspelning (modellen behöver en plats i `assets/` med en roll, och sidan en väg att ladda den); standarddockans
   avstånd till bordet, som är hans val (här antagna 0,18 m, i Blender Paows uppmätta 0,38 m); generiska rörelser som
   varje dealers docka får sin anpassning av, så att en ny docka ärver standarddockans sparade justeringar tills hon
   har egna; och en man som docka här. Paows docka, skon och kortplatserna flyttas inte: filmerna är gjorda efter dem.
   SAM-uppsättningen och Paows avläsningar finns inte på den här datorn.
9. **Bred lins räknad ur standarden** (Jakob 2026-11-25 och 2026-11-26: Bred lins "som bara kan göras utifrån en
   standard"). Byggt 2026-11-26: linsen är nyckeln `lins` i utseendet, spelvyn är en egen sparad standard, Scens
   knappar är Prova i Casino → Använd i Casino → Publicera, och ett utseende har ingen egen skala eller kamera längre
   (Skala k och Dealerns lins är borta; `docs/SYSTEM.md`, Standarden). Kvar är Bred lins egna tal, två steg som aldrig
   blandas och som båda ändrar Casinos bild, så han ser en före- och efterbild innan något av dem går in:
   - **D1, måtten ur standarden.** Skalan räknas vid dealerkanten ur de två linserna genom filmens bildpunkter (1,897 i
     stället för kontraktets 2; `node tools/scene-measure.ts skala` räknar den) och blir aldrig en nyckel. Med den följer:
     insatsringarna får en regel under båda linserna (halva det lagda kortet + radien + 12 mm; `BET` i
     `src/scene3d-geometry.ts`), bordets djup är ett verkligt bords lagt genom bildpunkterna (1,26 enheter mot 1,2 i dag;
     med bara skalan slutar filten ovanför bildens nederkant på en telefon; `tableUnder` i `src/scene3d-table.ts`),
     markerlådan tar skalan tvärs och sitt lagda fotavtryck på djupet, och vyns grader räknas mot en fast enhet i
     stället för mot kontraktets kamera (`viewUnder`, `aimAt` i `src/game-page.ts`). Bordets saker krymper 5,2 % kring
     dealerkantens mitt under Bred lins; korten och Standard rör sig inte. Rummet behåller kontraktets kamera: ingen
     film mäter en kuliss.
   - **D2:** en kortregel under båda linserna (dealerns kort 75 × 57 px i
     stället för 61 × 35 under Bred lins); `flatQuad` i `createLayout` och kontraktets vilande kort går då bort.
   Mätningen som håller Casino på plats: `tools/scene-measure.ts` (sidorna på dator och mobil för `tools/lab-look.ts`,
   och största flytt i bildpunkter mellan två körningar). Nyckeln lins och spelvyn höll varje punkt inom 0,01 bildpunkt;
   det enda som flyttade sig var det som skulle: Casinos råkade sidvridning (0,07°) är borta.
10. **Inspelning: välja film och dra i dockan** (Jakob 2026-11-26). Han vill kunna spela dealerns filmer för kortet,
   träd för träd, mot dockans rörelse (i dag väljer bilden själv en film: trädets egen, annars den spelet spelar,
   `cardFilm` i `studio/lib/bordet.ts`), och kunna dra en hand, en armbåge eller huvudet med musen i stället för bara
   med reglagen. Filmvalet byggs när trädens sammanslagning i Karta är klar (samma natt, en annan chatt); dragningen
   hör till dockans bana och binder musen till de reglage som redan sparas med Spara som standard.

## Väntar på Jakob

- Dockans kropp (2026-11-26): hans ögon på provet `docka-kropp-20261126` (den vita dockan med underkropp och pall,
  och standarddockans kropp med fingrar i samma giv), och två val: om kroppen ska kunna väljas i Inspelning, och hur
  nära bordet standarddockan ska sitta (förslag: axlarna 0,25 m bakom kanten).
- Det som bara finns på den stationära, och som registren behåller tills han har bestämt om det kopieras hit eller görs
  nytt: 82 bra tagningar utan film (Tatuerad 54, varav alla 25 talfilmer, vilan `paow-vila-tat-09-01` och fem delade
  vilor; Casinos och Ingångens 25 talfilmer; 3 utanför träden), ankarnas originalfiler, keystones och hans egna
  bilder, kortets textur, 43 av dockans referensfilmer och spelets fyra munlappar. En beställning behöver texturen och
  dockans filmer.
- Återskapat här ur Runways leveranser (2026-11-25; Runway behåller en leverans cirka fem dygn, och den hämtas gratis
  med uppdragets id): ankarna A1 `paow-vila-tatuerad`, A2.1 `paow-nyp-tatuerad`, A2.3 `paow-ankare-2-3-d`, `-c` och
  `-marke` och stolarnas sex, som rutor ur filmerna, och 37 filmer genom `tools/film-after.ts`: Tatuerad har film
  på disken för 20 av 36 steg, Tatuerad nyp för alla sina 8. Samma rutor som originalen men inte samma filer:
  posterna bär de nya filernas sha256, domarna är orörda, och ursprunget står i `assets/motions/<klipp>/generation.json`
  och ankarnas `receipt.json`.
- Kortet `a21-marke` i Beslut (2026-11-26): A2.1 med kortets märke, kandidaten `paow-nyp-tatuerad-marke` (provet
  `a21-marke-20261126`). Med hans ja får beställningar från A2.1 märkta kort.
- Fem stolfilmer ur Runway utan post och utan dom i `../slask/blackjack-dealer/granska/runway-20261125/` (stol 1,
  stol 2 två, stol 7 två; stol 2 har ingen annan film): döms och förs in, eller raderas. Stol 6:s film väntar i Granska.
- Handbytet: bilderna före och efter i `../slask/blackjack-dealer/granska/handled/` väntar på hans ögon. Fem av hans
  sparade standarder (plats 2 kort 1, plats 4 kort 1, plats 5 båda korten, plats 6 kort 2) bär en handvinkel från det
  gamla greppet och ger handleden 26–59° med det nya; Återställ eller reglaget på 17° och Spara som standard rättar dem
  (11–19°). Bara han sparar dem.
- Hans ögon på spelvyn och linsen i Scen (2026-11-26): gruppen Spelvy (Visa Inspelningen, Dator eller Mobil; Spara
  som spelvy) och Lins under Bord. Spelet utan valt utseende och grundutseendena följer nu spelvyns Dator (9,7°
  lutning i stället för 8°); Jakob-1 och Profilval 1 har kvar sin egen inramning på dator. På mobil gäller alltid
  spelvyns Mobil, så Profilval 1:s egen sidvridning syns inte längre där.
- Korten under Bred lins (steg 9 D2): ska de ritas som filmens egna (dealerns kort 75 × 57 px i stället för 61 × 35)?
  Han svarar när han har sett en före- och efterbild.
- Hans ögon på Inspelningens enda bild (2026-11-25), och ett val: ska kortets form bli en standard? Reglaget Bordets
  perspektiv i Hela bordet står på hans 87 %; på Riktigt kort ritar spelet och beställningens sista bild samma kort som
  dockan och dess referensfilm. Bara han sparar planen.
- Två frågor om det som städades 2026-11-25: om
  egna returfilmer, landningsbilderna (A3) och A2.2 ska bort också ur beställningsmodellen (`tools/landing-make.ts` och
  stegen RETUR och 2.2 lever kvar där för de sparade beställningarnas skull); och om 3D-banans äldre verktyg som kräver
  SAM-uppsättningen på den stationära ska vara kvar (`dealer3d/tools/docka-sam.py`, `docka-mat.ts`, `docka-jamfor.ts`,
  `lift.ts`, `deal-film.ts`, `pose-film.ts`, `doll-pose.ts`, `docka-hand.ts`).
- Trädet Tatuerad har ingen egen film för A2.3 → A3P4C2: de godkända tagningarna dit (`…-p4-c2-h24-cykel-…`,
  `…-p4-c2-stol-…`) ligger inte i trädet, så Inspelning och Scen visar den spelet spelar. Han väljer om de ska in.
- Hans dom på `paow-giv-2-3-d-03-01` och `paow-halkort-05-01` (filmerna finns nu här). På den stationära: den neutrala
  `paow-tal-blackjack-sv-14`, stolsserien (Prov `stolsserien-p4c2-20261124`) och andelarna för skjut och nyp i Karta.

## Kända brister

- Givarna från A2.3 gjordes från ett äldre ankare (blicken åt sidan), så huvudet hoppar mot ingången; en giv utan sista
  bild lägger kortet med vit kant eller fel; dockans vändning görs med fingrarna, inte handleden.
- Kortets märke når inte spåraren och spelets pålägg; Paows givar är 15–37 % för små vid ytterplatserna; det ritade
  kortet hoppar i handen.
- Spelet låser sig när ett svar går förlorat ("The session is at version N") tills sidan laddas om.
- Kön läggs bara när en huvudagentchatt är öppen (`tools/order-watch.ts`); fullmaktens dagstak räknar bara den här
  utcheckningens liggare; `tools/speech.ts` tar inte GPU-låset självt.
- Ingen granskare kan höra: ljud bedöms av Jakob. Kopian är inte prövad på en fysisk telefon.

Önskemål, inget beställt (2026-11-11, 2026-11-13): ett tredje och fjärde dealerkort, mer rörelse i kropp, huvud och
högerarm när hon delar ut, kaffe ur en mugg i bilden, en animation på bordet, marker som dealern tar och betalar,
insamling av korten, en andra spelarfigur.
