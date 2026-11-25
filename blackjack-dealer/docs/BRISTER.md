# Kända brister

Varje öppen brist en gång: vad som saknas och vad som stänger den. Slå upp ett avsnitt (sök på rubriken), läs inte
hela. En rättad brist stryks; hur den rättades står i commitmeddelandet. Läget per bana: [film](lage/film.md),
[kort](lage/kort.md), [labbet och studion](lage/labbet-och-studion.md), [spelet](lage/spelet.md); Jakobs besked:
[BESKED](BESKED.md).

## Kortet

- **Märket på kortet når inte alla verktyg:** kortspåret (`tools/track-card.ts`), spelets pålägg (`cardFace=paper`) och
  `tools/landing-make.ts` läser bara gult och blått. Märket hindrar inte heller fel i vändningen (färgbyte utan
  kantläge, vit sida, krysset för stort i handen; Prov `paow-ankare-2-3-b`). Stänger: verktygen följer märket.
- **Ritat kort fryser och hoppar i handen** (P7, ruta 73–76: mittpunkten hoppar 29 px mot spårets 9); filmkortet följer
  greppet bättre men har silvergrå yta och mjuk fingerkant (Prov `paow-carry-jitter-20261118`). Stänger: ren färg,
  överlämningen, egna mål och hålkortet granskade i rörelse.
- **Återbrukade andrakort och split kräver ritade kort:** 9 av 16 egna målfilmer finns, sju C2 behöver 39–51 px
  förskjutning, extra kort och split cirka 100 px, och D.C3 och senare saknar filmhand; en blå kant vid fingret står
  kvar, och violett nagellack går inte att skilja från kortets färger. Stänger: egna landningar eller verifierat
  återbruk, sedda i rörelse i båda renderlägena.
- **Forkens hela giv** (Prov `paow-fork-round-review-20261118`) har annan kamera och startpose än A2.3 och tryckt kort;
  den kan inte ersätta bankens klipp direkt.
- **Filmkortet utan giltigt kortspår** (`cardMethod=film`) skyddas, men äldre färgmarkörer kan synas. Stänger:
  verifierade spår och synprov i båda renderlägena.
- **Det ritade kortet i spelet** (`UNDER` i `src/card-overlay.ts`): hålkortet döljs under fingertopparna cirka 0,6 s,
  högra änden har en gulaktig kant, en linje syns när kortet står på kant och fingerkanten är taggig. Stänger: kortets
  efterarbete per film (BESKED, "Kortets efterarbete görs i förväg per film").
- **Kontraktets geometri står kvar bredvid linsens** (`geometri=kontrakt`, för historiska jämförelser): på telefon
  ringen (25 px), insatsbrickan över markerna och tom nedre tredjedel (`FRAMING`); kortsättet `film` står på
  kontraktets kort. Stänger: borttagningen som SYSTEM räknar upp under "Ritade kort", om vägen tillbaka inte behövs.
- **Dealerns två kort överlappar i kortplanen** med 13 px (D.C1 och D.C2 62 px isär, ett kort 75 px brett). Stänger:
  Jakobs val i Kortplan.
- **Kortet i nypet (ankare 2.1) är 8–13 % för långt;** i skons fönster stämmer det. Stänger: nya ankare; inget ankare
  krymps för skons skull.
- **Det ritade kortet i handen** (`cardInHand=1`, Prov `kort-fram-bak-20261120`): i vändningen står kortet kvar brett och
  blir en linje (`settleRaws` i `src/card-track.ts`), papperets ljus hoppar när `cardBase` i `src/scene3d-film.ts` tar
  reservfärgen, och kanten mot fingrarna. Labbprovet `kortprov` (`/scene3d.html?cards=1&cardInHand=1&kortprov=1`) fick
  hans nej; det styva kortet har dess plats i Scen. Stänger: skärpan mot handen och mätningen in i `tools/track-card.ts`.
- **Kortets sidor:** hans ord är rygg och framsida (BESKED, "Gul rygg, blå framsida"), men ordlistan och sidorna säger
  baksida, och mallarna "back" och "face" (`PLAIN_CARD` i `src/order-prompts.ts`). Stänger: ordlistan och sidorna.
- **Paows givar är för små vid ytterplatserna:** 14 av 22 är 15–37 % för små mot kortplanen (brickan "avviker" i
  Material, `data/media-fit.json`). Stänger: nya givar efter filmstandarden; kör `node tools/media-audit.ts --fit
  --write` när planens regel ändras.
- **Planfilen kräver en mobilvy som inget läser:** `validatePlan` (`src/placement-model.ts`) kräver `native` och
  `portrait`, fast spelet bara läser `geometry.native`. Stänger: formatet ändras i ett eget steg, på hans ord.
- **Kanten och spåret:** spåraren följer kortets färg, så en film efterarbetad med `--rim card` behöver ett eget spår;
  det överlagda kortet i vila är kortplanens och följer inte filmens, som sticker ut 3–13 px. Stänger: överlägget görs
  om (BESKED, "Grafiken på kortet").
- **Kvittots `planArea` är 19 % för stor:** `tools/python/filmmatt.py` räknar planens raka rektangel, inte det sidan
  ritar. Stänger: måttet räknas ur samma fyrhörning som sidan.

## Filmerna och banken

- **En giv utan sista bild lägger kortet med vit karm och kan lägga det fel** (6 av 6 sådana, 0 av 50 med sista bild;
  `paow-giv-2-3-p5-02` 32 px fel). Skons vita linje ger en vitkantad gul rygg i handen (9 av 26 med linjen), som i
  Casinos Primär till P6.C1. Stänger: varje giv med sista bild, och `tools/card-rim.ts` på en vitkantad film efter hans ja.
- **Dockans vändning görs med fingrarna:** i dockfilmerna `svep24d` svänger kortet under stilla fingrar, och filmmodellen
  kopierar det; hans regel är att handleden vänder kortet (BESKED, "Handleden vrider kortet"). Stänger: en omgjord
  dockfilm med vriden handled, prövad på en plats först.
- **Dockans kort vrids utan riktigt grepp** (Naturlig på Paow): i handbytet vrids kortet 4–8° per ruta under bara
  vänsterhandens fingertoppar, och rulldelarna P6.C1, P7.C1, D.C1 och D.C3 vänder kortet i luften 10–28 mm från handen
  (BESKED, "Ett kort vänds av händer och fingrar"). Stänger: kortet lyfts först när högerhanden har det.
- **Huvudet hoppar mellan den nya ingången och givarna från A2.3:** givarna och returen är gjorda från
  `paow-ankare-2-3-c` (blicken åt sidan), A2.3 är `paow-ankare-2-3-d` (blicken ned); de äldre filmerna bär brickan
  "äldre A2.3". Stänger: givarna och returen görs om från den nya bilden.
- **Det bandet inte kan än** ([löpande bandet](../tools/dealer-line.md)): keystone och ankare 1 är inga steg i Beställ
  (`STEPS` i `src/order-model.ts`), och D.C4 saknas som eget beställningsmål. Stänger: stegen läggs i ordermodellen.
- **Produktionslistan räknar en bortmätt tagning som på väg:** `tools/produce.ts` räknar en order som på väg tills varje
  tagning är GRANSKAD eller INFÖRD (`IN_FLIGHT`), också en tagning på MÄTT med dom i kvittot. Stänger: en tagning med dom
  i kvittot räknas som avslutad.
- **Kön läggs bara när en huvudagentchatt är öppen:** vakten `node tools/order-watch.ts` lever med chatten som startade
  den. Stänger: en vakt som inte behöver en öppen chatt; ingen väg vald.
- **Händerna byter mellan gamla och nya filmer:** banken har otatuerade, större händer; keystone, ankare 1, A2.2 och
  A2.3 har tatuerade, och att måla tatueringar i färdiga filmer föll (2/5). Stänger: en hel uppsättning ur de tatuerade
  bilderna.
- **Skuggan under armarna** sitter i grundbilden och syns i varje film av Paow; keystonebilderna med tatuerade händer
  saknar den. Stänger: nya ankare och filmer ur dem.
- **Paow ser lite smal ut** (huvudet 8,7 % högre, kroppen inte bredare). Stänger: ingen väg vald.
- **Banken räcker inte till en hel runda med egna filmer:** spelet använder nödlösningar (ersättare, utgången baklänges;
  `src/game-director.ts`); vad som saknas visar `node tools/produce.ts paow`. Stänger: filmerna beställs.
- **Paows Primär för P1C1 → A2.1 spelas aldrig** (fel hand mot given; syns i Karta). Stänger: Jakob byter Primär.
- **23 talfilmers poster i filmregistret pekar på kvitton som är flyttade ut ur repot.** Stänger: posterna pekas om
  eller tas ut.
- **Flera av Paows källor i `data/media-roles.json` pekar på en äldre slask utanför repot.** Stänger: filerna läggs i
  `assets/` och posterna pekas om, eller posterna tas ut.
- **Kling 4:s färger** läses som BT.601 fast filmen är BT.709-märkt; syns inte så länge efterarbetet
  (`tools/film-after.ts`) ger samma bild som de godkända tagningarna. Stänger: en mätning mot en känd färg.
- **Trailern har ingen som lyssnat på den,** och tre nya tagningar av trappan föll (Prov `trailer-noir-3`). Pausad
  (BESKED, "Trailern är pausad").
- **Ingen vy säger vilken plan en bankfilm beställdes mot;** ordern bär det (`pictures[].drawn.plan`, `drawn.as`).
  Stänger: en rad i Karta eller Granska.

## Läpparna och rösten

- **Talverktyget tar inte det delade låset:** `tools/speech.ts` renderar utan GPU-låset (skillen
  `bredvid-andra-sessioner`). Stänger: verktyget tar låset; till dess tas det för hand.
- **Läpparna i bankens repliker** ([TAL](TAL.md), "Kvaliteten"): överläppen står still 9–12 rutor vid stora öppningar,
  tysta pauser talas med öppen mun, och `namn` hörs som "Pau". Stänger: munnen i realtid, huvudmålet.
- **Ingen granskare kan höra:** varje dom över en talfilm eller trailern gäller bara bilden. Stänger: Jakob lyssnar
  själv innan något med ljud skickas vidare.
- **Munnen i realtid når inte realtid på hans dator** (12–13 rutor/s mot 24). Stänger: provkvällen på hans pod, med
  Dockerfilens steg som ett skript, som inte är skrivet.
- **Körarens nya Dockerbygge är inte prövat** (`tools/python/mouth-runner`). Stänger: bygg från den pinnade Dockerfilen
  och jämför samma prov.
- **Rösten:** 25 talfilmer med rösten Jessica spelas inte; Jakobs första röst-id är inte färdigtränat ([TAL](TAL.md),
  "Rösten"). Stänger: bara kontots ägare kan göra träningen klar.
- **Hennes röst på en iPhone är byggd men inte prövad på en telefon** ([TAL](TAL.md), "Rösten på en telefon"). Stänger:
  Jakob prövar, och ett fel läses med `/trailer?diagnos=1` ([DRIFT](DRIFT.md), "Ett fel som bara syns på en telefon");
  en liten ljudfil bredvid varje talfilm tar bort den sena rösten.

## Spelet och scenen

- **Hopp mellan filmer:** bilden står när nästa film inte är färdig; filmerna passar (0 px i 98 % av byten). Kvar: vila
  efter en retur (83 ms), och returerna slutar 2–3 px från vilan och 4–9 nivåer ljusare. Förslag: en retur spelar till
  sin sista ruta (`IDLE_RULE`, `resolveRound` i `src/clip-graph.ts`).
- **Tatuerad som spel** (`?trad=tatuerad`): talfilmen goodluck väntar på hans Godkänn, och ingångsfilmen
  `paow-film-intro-noir-3` slutar på Casinots A1. Stänger: en ingångsfilm på Tatuerads A1.
- **Rummets film** `monaco-liv-2.mp4` har ett litet steg var 8,3 s (0,57 nivåer). Stänger: omkodad under nytt namn, om
  någon ser steget.
- **Filmen före spelet** (`/trailer`): startbilden står still cirka 0,7–0,8 s medan filmen hämtas, sidan slutar rita i
  0,35–0,57 s, och på en stående telefon syns filmens övre kant som en linje. Orsaken är inte funnen.
- **Spelet säger inte när material saknas eller byts:** det står bara i `window.game.gaps` och `?diagnos=1`
  (`src/game-film.ts`). Stänger: filmerna beställs; att visa luckorna är Jakobs val.
- **Ett svar som går förlorat låser spelet:** sidan visar motorns engelska "The session is at version N; reload and
  resend" och nekar varje tryck tills den laddas om; sidan gör ett nytt `requestId` per tryck (`src/game-page.ts`).
  Stänger: sidan sänder om med samma `requestId`, och felet får svensk text.
- **En omladdning i kopian är ett nytt bord** (saldo 1000); avsiktligt, en spelare i minnet. Stänger: spelet sparar
  bordet utanför minnet.
- **Spelet:** 3D-skon klipper handen i givarna, helkroppsfilmerna har ingen sko, utfallsskyltarna ligger över
  insatsbrickorna när alla sju platser spelar, och dubbling och försäkring är inte sedda. Stänger: ett steg var.
- **3D-scenens hemvy** stämmer inte med `assets/proofs/bakgrund-3d-referens/` (medel 0,96, max 168), eftersom filtens
  tryck har flyttat med planen. Stänger: referensen tas om med Jakobs ögon.
- **Profilval 1 kapar toppen av hennes huvud** i 93 % av rutorna. Stänger: ingen väg vald.
- **Reglage för `cardBack` och `cardFace` saknas i Scen;** bara adressens ord. Stänger: två reglage, när efterarbetet
  byggs.

## Labbet och verktygen

- **Materials anteckningar har kvar id:n** (omkring 180 av Paows 233); talfilmernas registrering (`tools/speech.ts`) och
  de gamla anteckningarna är inte omskrivna. Stänger: de skrivs om.
- **Ett nytt orderutkast skriver texten innan bilderna ligger på disk:** med en A3 som sista bild säger texten då att
  blå sidan är omärkt. `refresh` på utkastet rättar texten före ett godkännande. Stänger: verktyget rättas.
- **Klings mellanbilder** finns i Runways API men inte i MCP-schemat (`generate_video`).
- **Startflaggan mäter genomsnittlig bildändring, inte stillastående hand:** använd rutgranskning för tempo.
- **En ordergrupp är inte en filsystemtransaktion:** ett avbrott mitt i gruppen kan lämna några utkast på disk.
  Stänger: en återhämtningsbar gruppjournal, om det ska stödjas.
- **Fullmaktens dagstak räknar bara den här utcheckningens liggare:** godkännandena i `data/orders/` och de direkta
  anropen i `.runtime/runway-api/ledger.json`. En annan klon har en annan liggare, och direkta MCP-anrop utanför Beställ
  räknas inte; de rapporteras med belopp och får aldrig kringgå fullmakten.
- **Borta ur labbet tills det nya har dem:** "Rå | renderad" på en tagning och panelen Vila. Stänger: Bordets läge
  Efterarbete.
- **Sidornas ord:** 72 ställen säger annat än ordlistan. Stänger: ställena rättas efter ordlistan.
- **Inte prövat av en hand:** i Bordet Godkänn i Beställ, Perspektiv med Spara, vybyte med osparade ändringar och att
  läsa in en fil; i Granska Arkivera och Ta tillbaka. Stänger: prövas i en webbläsare.
- **Filmer kan se utfrätta ut i Jakobs flik,** troligen hans skärm. Lägg alltid en stillbild bredvid en film han ska
  döma.
- **Testerna täcker inte filmerna** (BESKED, "Tester: en kärna"). Stänger: visuell verifiering på den verkliga banken.
- **Jakobs GitHub-konto var låst av en betalningsfråga;** det här repot kör inget hos GitHub. Stänger: bara han, under
  Settings, Billing and licensing.
- **Mobilkopians telefonprov återstår:** prövad utan telefon, inte på en fysisk telefon eller med ljud; stående spel
  beskär ytterplatserna, och Material kallar ankare som inte publiceras för saknade. Stänger: telefonprov, och en
  skillnad mellan opublicerat och saknat.
- **Paows ankare 1 visas som "avviker" i Material:** `paow-vila-tatuerad` mäts mot händerna i
  `data/dealer-standard.json`, som inte är mätta på henne. Stänger: ett mått per dealer.
