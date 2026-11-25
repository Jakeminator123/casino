# Status

Läget och nästa steg per bana. Ersätt det som inte längre gäller; historien står i Git.

## Läget

- **Datorn:** Jakob började om här 2026-11-25; det på den stationära kopieras inte hit, utom en enskild godkänd fil han
  ber om. I `assets/` ligger bara det som hämtades ur Blob samma dag (258 filer, cirka 1,2 GB, varje fil kontrollerad mot
  sin SHA-256): Paows filmer som kopian spelade och de bra filmerna i nodträdet som Blob hade, rummen, introfilmen och
  brickan. 205 av Paows 356 bra eller spelade tagningar har sin film här; 151 fanns bara på den stationära (50 talfilmer,
  70 givar, 5 returer och vilor). Registren i Git beskriver fortfarande banken som den var där, med hans domar; alla kort
  i Beslut är besvarade. Nätdelen vilar; kopian på nätet står på `c9d006d` från 2026-11-20, och Blob (`dealer-studio-media`)
  har kvar cirka 1,3 GB som inget använder: äldre utgåvors filmer, Pamelas filmer och provfilmer.
- **Dealern** är Paow, med de tatuerade händerna (Jakob 2026-11-24: "vi ska köra enbart med hennes nya händer och de
  tatuerade klippen"). Pamela och V6 är arkiverade utanför repot (2026-11-20, 2026-11-23).
- **Film:** metoden som håller (2026-11-23): giv och återgång i en film, Kling 4, 4 s, första bild A2.3
  (`paow-ankare-2-3-d`), sista bild samma med kortet på platsen, dockans byggda film som referens. Från A2.1
  (`paow-nyp-tatuerad`) underkände han fem av sex givar 2026-11-24 ("MÅSTE FINNAS METODFEL"). A2.2 och
  landningsbilderna (A3) är arkiverade (2026-11-23, 2026-11-24).
- **Karta:** fyra träd: Tatuerad (spelas, skjuter kortet från A2.3, 22 av 36 steg), Tatuerad nyp (byggs, nyper från
  A2.1), Casino och Ingången (vilar). Kompositionen `tatuerad-skjut-nyp` binder de två tatuerade (2026-11-24).
- **Kort:** ett kort per sida med märkena överallt; kortplanen i verkligt perspektiv genom B-linsen, som spelet och
  scenen följer. Det styva kortet utan vit kant har hans ja i Scen (2026-11-23).
- **Labbet och studion:** Bordet är labbvyn och dockan Kortplans steg 2. Bordet BORD-02 är ett labbprov ("skitbra" som
  alternativ, 2026-11-20) som spelet inte slår på före hans ja.
- **Spelet** spelar trädet Tatuerad med nödlösningar där film saknas (`STAND_IN_FILM`, `SEAT_HUB`). Realtidsmunnen
  (storlek F) har hans ja men når 12–13 rutor/s på hans RTX 3060 mot 24. Den neutrala munnen gäller Paows repliker utom
  blackjack (`paow-tal-blackjack-sv-04`, hans dom). Trailern är pausad (2026-11-17).
- **3D-dockan:** en dockfilm görs i ett steg (`node tools/doll-order.ts paow P5.C1`); givarna från A2.3 följer dockan
  svep24d, given från A2.1 `dealer3d/src/pinch-deal.ts`. Jakob 2026-11-23: "Jag gillar verkligen docklabbet!"

## Nästa steg

0. **Registren** (Jakob 2026-11-25, en egen chatt): hänvisningar till media som varken finns här eller i Blob, och allt
   om Pamela, tas bort ur registren; när en filmpost går står hans dom kvar som en rad i `data/motions-removed.jsonl`.
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
6. **Labbet och studion:** färre val, det uppenbart dubbla bort först; sidornas ord efter ordlistan; fler register in i
   SQLite som filmregistret (2026-11-23).

## Väntar på Jakob

- En beställning behöver ankarbilderna, som bara finns på den stationära: ska just de godkända filerna kopieras hit
  (A1 `paow-vila-tatuerad`, A2.3 `paow-ankare-2-3-d`, A2.1 `paow-nyp-tatuerad` och dockans referensfilmer), eller ska
  nya göras?
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
