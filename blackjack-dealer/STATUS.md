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
  utseendet; flera flikar får vara öppna. Bordet är vyn av bordet. Kortplan har en bild sedan 2026-11-25 ("ett och
  samma läge", "allt i 3d"): dockans 3D-bord med planens kort på filten, och en högerspalt där dockans reglage står
  under steg 2; den platta planen och dess bakade bakgrundsbilder är borta. Ingången (A2.1 eller A2.3) är trädets,
  det spelade trädet som förval; planens Handbyte väljer ingenting. Bordet BORD-02 är ett prov i studion ("skitbra"
  som alternativ, 2026-11-20) som spelet inte slår på före hans ja.
- **Standarden** (2026-11-25, `docs/SYSTEM.md`): en kamera, ett bord och ett kort i `src/table-lens.ts`, och ett test
  som håller dockans kamera vid den. Tre avvikelser står kvar: kortets form (87 % i spelet och i beställningens sista
  bild, ett verkligt kort hos dockan), Casinos bredare kamera, och att dockan inte läser ett korts riktning ur planen.
- **Spelet** spelar trädet Tatuerad med nödlösningar där film saknas (`STAND_IN_FILM`, `SEAT_HUB`). Realtidsmunnen
  (storlek F) har hans ja men når 12–13 rutor/s på hans RTX 3060 mot 24. Den neutrala munnen gäller Paows repliker utom
  blackjack (`paow-tal-blackjack-sv-04`, hans dom). Trailern är pausad (2026-11-17).
- **3D-dockan:** en dockfilm görs i ett steg (`node tools/doll-order.ts paow P5.C1`, alltid från A2.3; nypet med
  `--fran a2-1`); givarna från A2.3 följer dockan svep24d, given från A2.1 `dealer3d/src/pinch-deal.ts`. Jakob
  2026-11-23: "Jag gillar verkligen docklabbet!" Dockan är kod (cylindrar och kulor ur mått, inget skelett) och
  rörelserna ledernas lägen i meter; Blender kan inte öppna dem. Paows mått kommer från SAM 3D Body, standarddockans är
  antagna, och varje grundrörelse läggs på standarddockan och förs över till den valda dockan.

## Nästa steg

0. **Det tatuerade materialet** (väntar på Jakob, nedan): kopieras det hit eller görs det om? Görs det om tas
   tagningarnas poster bort med `node tools/register.ts remove <id> --why "<text>"`, så att domarna står kvar i
   `data/motions-removed.jsonl`.
1. **Film:** fyll Tatuerad från A2.3: plats 7 (händerna vände inte kortet) och filmen som vänder upp D.C1 (utkastet
   `paow-halkort-06`). Sedan A2.1 igen med EN pilot som han ser i spelstorlek först. En nästan bra film görs om "bara
   litegranna"; givens tid cirka 1,3 s ut och 0,8 s tillbaka (2026-11-23, 2026-11-24).
2. **3D-dockan:** dockan från A2.1 görs om, enklare, med kortbanan ur dockan (2026-11-24), och härmar de bästa
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
6. **Studion:** färre val, det uppenbart dubbla bort först: de fem adresserna som bara leder vidare (`/`, `/scen/`,
   `/bestall/`, `/prov/`, `/primara/`), Casinos adress `/game/`, och verktygens meddelanden som ännu säger "labbet";
   sidorna bredvid (Ljud, Modeller, Grafik) får ramens utseende; fler register in i SQLite som filmregistret
   (2026-11-23).
7. **En standard hela vägen** (Jakob 2026-11-25: "detta ska vara en standard"): planens dolda rörelseval (`intent`:
   grepp, var och hur kortet vänds, hand, handbyte) styr ännu receptets text utan att kunna väljas, och tas bort ur plan
   och recept så att rörelsen bara är dockans; dockan läser kortets riktning ur planen; bildstorleken, som fler filer
   ännu skriver själva, hämtas från `src/table-lens.ts`.
8. **Standarddockan i Blender** (Jakob 2026-11-25): standarddockan blir en riggad modell som Blender öppnar (samma
   slags skelett som avatar-auto-pipeline gör), med generiska rörelser som varje dealers docka får sin anpassning av;
   en ny docka ärver då standarddockans sparade justeringar tills hon har egna. SAM-uppsättningen och Paows avläsningar
   finns inte på den här datorn.

## Väntar på Jakob

- Det som bara finns på den stationära, och som registren behåller tills han har bestämt om det kopieras hit eller görs
  nytt: 130 bra eller spelade tagningar utan film (Tatuerad: alla 21 spelade steg, alla 25 talfilmer och 5 av stolarnas
  steg; Tatuerad nyp: alla 8 steg; Casinos och Ingångens talfilmer, 24 av 25; därtill 47 bra som inget steg spelar),
  ankarbilderna (A1 `paow-vila-tatuerad`, A2.1 `paow-nyp-tatuerad`, A2.3 `paow-ankare-2-3-d` med stolarnas sex och
  `paow-ankare-2-3-marke`), keystones och hans egna bilder, kortets textur, 43 av dockans referensfilmer och spelets
  fyra munlappar. En beställning behöver ankarna, texturen och dockans filmer.
- 51 filmer från 20–24 november som Runway ännu hade, hämtade 2026-11-25 till
  `../slask/blackjack-dealer/granska/runway-20261125/` (Runway behåller ett uppdrag cirka fem dygn): bland dem
  Tatuerad nyps ingång och sex givar, A2.3-d:s givar och stolarnas. Ur dem den tatuerade A2.1 och A2.3-d som rutor
  (`rutor/`). Han väljer om de förs in på sina poster.
- Kortet `tatuerat-a21-ny` i Beslut (2026-11-25): en ny A2.1 med tatuerade händer, kandidaten `paow-nyp-tatuerad-2`
  (provet `a21-tatuerad-ny-20261125`).
- Hans ögon på Kortplans enda bild (2026-11-25), och ett val: ska kortets form bli en standard? Reglaget Bordets
  perspektiv i Hela bordet står på hans 87 %; på Riktigt kort ritar spelet och beställningens sista bild samma kort som
  dockan och dess referensfilm. Bara han sparar planen.
- På den stationära: hans dom på `paow-giv-2-3-d-03-01` och `paow-halkort-05-01`, den neutrala
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
