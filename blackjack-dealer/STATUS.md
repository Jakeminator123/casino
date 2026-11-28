# Status

Läget och nästa steg per bana. Ersätt det som inte längre gäller; historien står i Git.

## Läget (2026-11-28)

- **En standard: livebordet.** Kameran, bordet, skon, korten och kortplatserna är klonade ur filmen av ett riktigt
  livebord (`src/table-live.ts`, kortet i `src/space.ts`, det allt läser i `src/standard.ts`; måtten i `../MATT.md`).
  Den förra standarden är borta ur koden sedan 2026-11-27, på Jakobs ord ("Förra standarden helt"): det förra bordet
  och kameran, menyvalet, mannen, kvinnan och Paow med de ritade givarna, och studions sidor Filmverkstaden, Material,
  Jämför och Protokoll. Det ligger i arkivet `casino-arkiv-paow-och-forra` bredvid repot. Hans domar på borttagna
  filmer står i `data/motions-removed.jsonl`.
- **Kvar av det förra** (ett eget steg, se Nästa steg): kortplanens värld (`src/plan-lens.ts`, `card-plan.ts`,
  `placements/default.json`), den äldre dealerns beställningsväg och träd (`dealer-trees`, `order-images`) och bankens
  register. Hans filer där är orörda. Allt det räknar i bankens bild, 1764 × 1174, och två ställen i spelet läser
  den ännu: rummet bakom bordet ställs med kameran i `data/scene-contract.json`, och skons fönster som förval
  (`SHOE_BOX` i `src/scene3d-matte.ts`) står i bankens bildpunkter. Det som filmar, efterarbetar och tar emot en ny
  dealer läser bara livebordets mått (granskat 2026-11-28; `../avatar-auto-pipeline/scen/standard.yaml` stämde rad
  för rad med koden).
- **Dockorna är Danilo och Frasse** (byggda på de två riktiga dealrarna i filmen) och persondockor som byggs på dem
  (`dealer3d/src/doll.ts`, `dealer3d/src/persondockor.ts`). Rörelserna lyfts ur filmen med
  `dealer3d/tools/lyft-till-docka.ts` (ur `../live-bj/data/lyft/`) till `dealer3d/data/lyft-<docka>-*.json`: givar från
  ankaret vid skon (A2.3) och tillbaka dit, vägarna till skon och hem, och två väntor. `dealer3d/tools/lyft-kolla.ts`
  spärrar ryck och fel.
- **Spegla i studion** (`/studio/spegla/`, i menyn efter Mått och som knapp i Dockan): Youtubefilmens bordsbild och
  vår vy ligger på varandra ruta för ruta, med ett drag mellan dem, en delad bild och ett läge bredvid. Filmen
  strömmas ur `../live-bj/` av den lokala servern och kopieras aldrig; `tools/spegla-routes.test.ts` håller den borta
  från kopian på nätet. Dockans ruta paras med filmens tid ur lyftets egna data. Det är så en rörelse, ett bord och
  en kamera prövas mot källan (Jakob 2026-11-27: "Jag vill kunna spegla vår vy/bord/dealer/kort/kameravinkel mot
  youtubeklippet"). Förstoringar bredvid varandra ligger i `../live-bj/rutor/jamfor/` (bara på datorn).
- **Bordet och rummet som filmens:** relingen är mätt ur filmen (`../live-bj/verktyg/reling.py`): 6,5 cm bred, inte
  de antagna 10, och rullen går också längs dealerns kant, med en hylla bakom vid hans högra sida. Vår reling ligger
  på filmens inom 4 bildpunkter. Spelets 3D-kant, editorns armregel och spärr läser samma tal (`LIVE.rail`). Linjen
  bakom dealern var kanten på editorns golv och är borta. Plattorna för efterarbetet ligger i
  `../standarddocka/klipp/platta-bord-ensamt.png` och `platta-bord-med-sko.png`.
- **Händerna som dealerns, pågår.** Det Jakob såg i speglingen: dealern håller kortet med tummen (dockan pekade med
  pekfingret, vår egen regel), och i bytet ligger högern kvar platt på filten medan vänstern skjuter kortet plant
  fram till dess fingertoppar och reser det på kant med tummen. Det är nu byggt i `dealer3d/tools/lyft-till-docka.ts`.
  Domaren dömer nu i tre gångers förstoring ruta för ruta, med lägen i bildpunkter (domarens ord). Sjunde domen,
  efter åtta vändor: **Nja, nära Bra**, och en film av en person efter rörelsen "har nu ett skäl". Det som stämmer:
  högern platt, sluten och stilla till bytet, kortet finns i varje ruta och är dolt i näven, tummen ligger kvar på
  kortets hörn tills handen går hem, kortets väg ur skon är jämn, och given till dagens plats 2 lägger rätt kort.
  Filmen som sedan gjordes (Kenjis fjärde omgång, nedan) visade vad som är kvar i rörelsen: i bytet gick kortet från
  stående till dolt på två rutor utan att en hand syntes ta det. Nionde vändan lät högern ta kortet in under handen
  och tummen vända det, med en lösare hand på det lagda kortet. Åttonde domen på den: **Nja**, och en ny film har
  "inte ännu" ett skäl. Tagningen (ruta 26–31) kan en kamera följa och landningen ligger inom 10 bildpunkter, men
  kortet försvinner in i näven på en ruta (31→32; dealerns syns lutande i handen till ruta 33), det står som ett blad
  på 100 bildpunkter över handen i vändningen (36–38; dealerns är en strimma på 30), handen öppnar sig på väg hem där
  dealern håller en lös näve till ruta 65, och kortet står rakt upp i bytet där dealerns lutar. Frasses giv till
  plats 4 har samma fel i ruta 22. Tionde och elfte vändan rättade lutningen, den lösa näven hem och vändningen (lågt
  under handen kring kortets långkant, tummen ned först när kortet ligger plant; tiden stämmer med dealerns). Nionde
  domen: **Inte bra**, fortfarande inget skäl för en film: kortet ligger bredvid handen i ruta 31–33 och hoppar
  sedan 145 mm in under näven på en ruta, och vilan i ruta 0 blev en näve där dealerns hand ligger platt. Domaren
  föreslog en spärr i `lyft-kolla.ts` som prövar att kortet följer den hållande handen från bytet till att det ligger
  plant. Tolfte vändan byggde spärren (den slog till i alla givar) och lät kortet bäras i högerhandens eget grepp:
  det går jämnt in i handen över ruta 30–35, och vilan i ruta 0 är en platt hand. Tionde domen: **Nja**, "ett steg
  kvar": bytet och fällningen kan en kamera nu följa, men kortet hoppar 51 mm när det läggs under tummen (ruta
  39→40), och kortets vita framsida syns under fingrarna i ruta 34–39 där dealerns är dolt. Trettonde vändan tog
  bort hoppet (tummen tar kortet i ruta 38, 9–15 mm per ruta) och tätade två hål i spärren. Elfte domen: **Nja, bra
  nog för en film** för given till dagens plats 4: inget kort står ensamt, hoppar eller försvinner, och kortet
  sitter i handen från bytet till landningen. Filmen gjordes (femte omgången, nedan). Kvar enligt båda domarna:
  kortet bärs under fingrarna på lillfingersidan och kommer fram vid tummen, där dealerns ligger vid tummen hela
  vägen; givarna till dagens plats 7 reser kortet som ett stort kort framför näven. Fjortonde vändan lade kortet på
  tumsidan från bytet till platsen (bara rutorna 32–39 ändrade) och tog bort resningen. Tolfte domen: **Nja**, ett
  nytt klipp har ett skäl; kvar är att kortet syns stort bredvid näven i ruta 33–35 där dealerns nästan är dolt under
  handen, och står som en kant på 100 bildpunkter genom tummen i ruta 36–37. En femtonde vända (kortet under
  handflatan vid tummen) avbröts halvfärdig när datorn startade om hårt 2026-11-28 och togs bort på Jakobs ord:
  fjortonde vändan är den som gäller, och ingen film är gjord efter den. Dockans huvud är cirka 12 % smalare än
  dealerns och nickar mindre.
- **Visningsfilmen** (för Jakobs chef): provet `visning-for-chefen-20261127` (67 s, den riktiga dealern syns bara som
  mätt streckfigur), och en version med Youtubefilmen som bara ligger på datorn
  (`../live-bj/rutor/visning/visning-med-youtubefilmen.mp4`). Inte dömd av någon domare.
- **Dockans kropp är inte dealerns** (`../avatar-auto-pipeline/scen/bygg_docka.py`, `MATT`). Av dealerns egna mått
  bär Danilos och Frasses dockor två: axelledernas avstånd och huvudets höjd (skattad). Armarnas längd och tjocklek,
  händerna, bålen, halsen och benen är en medelmans (samma kropp som den förra standarddockans man), och midjan och
  höften är en gissning (Danilo 3–4 % smalare). Det är därför dockan ser ut som den gamla och känns klumpig (Jakob
  2026-11-27: "varför skapas våra avatarer utifrån en standard som inte är just det som ska följa alla mått från
  Danilo och Frasse"). Rörelsen är dealerns; kroppen ska bli det. Granskat 2026-11-28:
  - Armarna är 0,279 och 0,272 m på båda dockorna. Filmen skattar Danilos till 0,266 och 0,219 och Frasses till
    0,228 och 0,195 (genom en kamera, osäkert i djupled och därför inte intaget), och lyften räknar med SAM:s 0,289
    och 0,279.
  - Hur långt bakom bordskanten dealern sitter är antaget: 0,2 m för båda (`LIVE.dealer.behindEdge`). Skattningen ur
    filmen är 0,065 m för Danilo och 0,158 för Frasse. Genom livebordets kamera hamnar axlarna på samma bildpunkter
    vilket som gäller; från de andra platsernas kameror gör det skillnad, för Danilo upp till 13,5 cm.
  - I Blender står dockans vila kvar på mannens gamla plats (`SITT` i `bygg_docka.py`: 0,38 m bakom kanten). Editorn
    ställer dockan själv i varje ruta, så filmerna berörs inte, men dockans egen vila och räckviddsrapport stämmer inte.
- **Given efter hans Nja** (Danilos giv till dagens plats 4):
  - Kortet landar där den riktiga dealern lade det (0,2 mm och 0° från målet) och rättas inte till på filten. Förut
    vreds det 21° och gled 21 mm under fingret; det var det han såg. Kortplatsen stämde med filmen och är inte ändrad.
  - Given är delad vid handbytet, ankaret A2M: `lyft-<docka>-till-bytet` (för alla platser) och
    `lyft-<docka>-bytet-p4` (till platsen och hem). Halvorna efter varandra är identiska med hela given.
  - Kortet står i bytet med ryggen mot kameran, viks in under högerhanden och vänds där, som hos dealern. Att det
    stod med kanten mot kameran och sedan hängde i fingertoppen var vårt eget påhitt, och det var där de första
    filmerna av Kenji gick fel.
  - Pekfingret följer kortet ned, ligger i dess bortre hörn (till höger i bilden) och lyfter rakt upp. Tummen är
    lyftets egen. `lyft-kolla.ts` har spärrar mot kort som läggs till rätta på filten och kort som rör sig utan fingret.
  - Domaren dömde given fyra gånger bredvid det riktiga klippet (domarens ord, inte Jakobs): tre Nja och till sist
    **Bra**, bra nog att filma en person efter, med en anmärkning för vänsterhanden vid skon. **Jakobs egen dom på
    dockfilmen av den rörelsen (Kenjis docka) samma kväll: Inte bra**, och om dockan: "den känns riktigt klumpig".
    Domaren var alltså för snäll: den jämför rörelsen med klippet men fäller inte dockans kropp och händer.
- **Kortets storlek.** Dockans kort genom livebordets kamera är livefilmens kort inom 1–2 bildpunkter (72 × 52 mot
  73 × 53). Kortet i Kling-filmen han dömde var 4–9 % mindre per kant: filmmodellen ritar det själv. Det rättas av att
  vi ritar kortet.
- **En ny dealer ur bilder, med ett kommando:** `python ny_dealer.py <person>` i `../avatar-auto-pipeline/`. Det mäter
  personen ur de tre bilderna (SAM 3D Body lokalt och MediaPipe: kroppens leder, handens 21 punkter, ansiktsnätet),
  skriver måtten som en datafil (`personer/<person>.json`), bygger dockan på Danilos eller Frasses grund, lägger in
  den bland dockorna, löser de lyfta rörelserna för den, filmar given i nyckelfärgerna, väljer rutor efter rörelsens
  egna händelser och förbereder anropen till Runway. Allt till och med anropen är gratis; huvudagenten lägger de
  betalda. Mot facit (Tomasz figur) träffar mätningen armarna inom 1 cm och axlar och bål inom 2,5 cm; handens längd
  mäts fel och tas inte in.
- **Amara Okonkwo är den andra nya dealern, och den första kvinnan** (2026-11-28, provet `amara-ny-dealer-20261128`).
  Stegen 1–5 gick utan handpåläggning på sex minuter: måtten, dockan, systemet, nio rörelser och dockfilmen. Dockan
  spelar allt den kan i en tagning (väntan, till skon, givarna till dagens plats 7, 4 och 2, hem, väntan: 19 s),
  filmad från de sju platserna. Kontrollen ger samma spärrar som för Danilo och Kenji, inga nya.
  - **Det bandet inte anpassar:** hennes docka är Danilos kropp med 1,8 cm kortare underarm och smalare huvud. Av sex
    mått som kan tas in tas bara de som skiljer mer än mätningens osäkerhet (0,6–2,4 cm). Kön, längd (hon mättes till
    1,665 m, dockan står 1,747), händer, hals och kroppens volym tas aldrig ur bilderna, och sitsen är dealerns för
    alla: en mindre person lutar sig i stället för att sitta närmare.
  - **Rättat i `ny_dealer.py`:** texterna till bild- och filmmodellen sa "the man" och "his" om alla; de skrivs nu
    efter vem `--utseende` säger att personen är, eller utan kön. `--utseende` sparas vilket steg som än körs, en
    plats utan lyft giv ger ett svar som säger vilka som finns, två personer med samma förnamn krockar inte längre
    tyst, och Kling 4 räknas utan rabatten när den har gått ut (2026-11-30).
  - **Filmen av henne är förberedd men inte beställd** (238 krediter: fyra ankarbilder 34, tre klipp 204). Hennes
    bilder visar en grön tröja, som inte går att skära ut ur det gröna; anropen klär henne därför i en dealers
    uniform (vit skjorta, svart väst, fluga), som Malik bär i piloten från 2026-11-26
    (`../avatar-auto-pipeline/input/malik-traore/malik-giv-alla.mp4`, gjord på den förra standarden). Det betalda
    anropet stoppades av behörighetskontrollen i chatten och väntar på hans ord.
- **Kenji Nakamura är den första nya dealern** (provet `kenji-ny-dealer-ur-bilder-20261127`). Hans kropp låg inom
  mätningens osäkerhet från Danilos, så dockan är Danilos kropp med Kenjis huvud.
  - Första omgången (187 krediter): Kling 4 ur nio stillbilder jämnt i tiden fick domarens **Nja** (samma man hela
    vägen och bra händer; kortet bars högt i luften, takten var Klings egen och huvudet ryckte i början), och Aleph 2
    över dockfilmen **Inte bra** (kortet försvann i bytet och ansiktet blev yngre). Domarens ord, inte Jakobs.
  - Andra omgången (139 krediter): tio stillbilder valda där något händer i rörelsen, och Kling 4. Rörelsen den
    filmades efter hade kortet hängande i fingertoppen och är ersatt; filmen ligger kvar i provets `original/v2/`.
  - **Jakobs dom 2026-11-27 kl. 17.47: Inte bra** på hela provet, på filmen (06, halv fart av 05) och på dockfilmen
    (03). Hans dom ersätter domarnas. Film 11 och 15 lades i provet efter hans dom och är inte dömda av honom.
  - Tredje omgången, efter den rörelse domaren dömde Bra, gjord på två sätt som ligger bredvid varandra i provet
    (film 15 är film 05 med mellanrutor räknade ur rörelsen, så att början inte hackar; inte dömd):
    - **Film 05, mellan tio stillbilder (Kling 4, 129 krediter)**, lagd i Danilos takt efteråt, på vårt bord med vår
      sko och vårt kort. Domaren: **Nja**; den externa domaren Inte bra på en tidigare version. Samma man hela vägen,
      mänskliga händer och ett helt kort i varje ruta. Jakob 2026-11-27: "Tempot är konstigt också", och händerna får
      inte kontakt med kortet ("det kan ändå inte flyga upp till högra"). Orsaken: händerna är filmmodellens egen
      rörelse mellan bilderna, kortet ritas efter dockans tal, och takten trycks in efteråt (draget ur skon blir slow
      motion och bytet tre gånger för fort; rutor upprepas, så början hackar).
    - **Film 11, ruta för ruta efter dockans film (Aleph 2, 56 krediter):** exakt Danilos takt, men domaren: **Inte
      bra**. Ansiktet går sönder och blir yngre, vänsterhanden blir dockans plast, och spårkortets gula lämnar flagor
      vid fingrarna.
    - Domarens råd för nästa film: takten ur dockans film och ansiktet och händerna ur stillbilderna i samma anrop,
      och vårt kort lagt där filmens fingertoppar är, ruta för ruta.
  - **Fjärde omgången, tre klipp mellan fyra ankarbilder** (238 krediter; provet
    `kenji-tre-klipp-mellan-ankarbilder-20261127`, `python ny_dealer.py kenji-nakamura --ankarklipp`): fyra stillbilder
    av Kenji i dockans ställningar vid det nya bordet (redo vid skon, handbytet, kortet lagt, hemma igen), och tre
    klipp i Kling 4 mellan dem, vart och ett med dockans film av samma steg som referensfilm.
    - **Det som nu är mätt:** Kling följer dockans rörelse till 96–98 % och gör den 0,06–0,08 s senare; klippen
      börjar och slutar i ankarbilderna, så de går ihop. Filmen är 2,2 s som dockans giv, utan att takten trycks in
      efteråt. Näven med tummen på kortet finns hos en riktig person, och det är samma man hela filmen.
    - **Domarens första dom: Inte bra** (domarens ord, inte Jakobs), på tre saker: kortet satt inte i en hand genom
      bytet, vårt ritade kort låg över fingrarna med flagor av filmmodellens kort, och takten hackade (klippen i 24
      bilder/s var omlagda till 30 genom att var femte ruta upprepades).
    - **Rättat i efterarbetet, gratis, och dömt om tre gånger (Inte bra varje gång):** filmen går i klippens egna
      rutor (24 bilder/s, inga upprepade); vårt kort följer filmens kort på vägen till platsen (dolt i näven, framsidan
      upp när det läggs); manschetten och ansiktets kanter är hela. Det som inte gick att få rent är kortet i farten,
      ur skon till bytet: handen och det gula spårkortet är där utsmetade i varandra. Utskuret blev vårt kort prickigt
      med hål, och omfärgat en laxrosa klump utan mönster. Provet visar den sista versionen, med domarens ord om den.
    - **Slutsatsen om kortet:** nästa film görs med kortets rygg röd med vit kant redan i dockans film och i
      ankarbilderna (`ny_dealer.py --ankarklipp --rygg rod`), så att filmmodellen ritar ryggen själv, också i farten,
      och efterarbetet bara ritar framsidan när kortet ligger (`lagg-pa-bord.ts --rygg-ur-filmen`).
    - **Kvar, och bara rättbart i rörelsen och med nya klipp:** bytet (Kling ritade ett kort som står ensamt och
      flyger in i näven, som dockan), handen som öppnar sig på en ruta på väg hem, en hårt knuten näve på det lagda
      kortet (dockans fingrar var knutna), och blicken som inte går till skon.
  - **Femte omgången, röd kortrygg och rättat handbyte** (306 krediter: 238 och en omtagning av första klippet på
    68; provet `kenji-rod-rygg-tre-klipp-20261127`, i Spegla "Kenji 5"). Gjord när rörelsedomaren efter trettonde
    vändan sa att en film har ett skäl.
    - **Domaren: Nja, klart bättre än den förra** (domarens ord, inte Jakobs). Kortet är ett och samma riktiga kort
      med röd rygg och vit kant, under fingrarna ur skon och i en hand genom hela bytet: vänstern reser det,
      högerns fingertoppar tar det nedifrån och högern bär det under handflatan, "det han själv såg hos den riktiga
      dealern". Samma man hela filmen, lugnt huvud, tummen på kortets hörn, handen öppnar sig över tre rutor, takten
      Danilos 2,2 s utan hack.
    - **Kvar i filmen (kräver rättad rörelse och ett nytt klipp):** kortet syns aldrig vändas. Det ligger under
      nävens fingrar i ruta 34–35, syns inte i 36 och dyker upp under tummen på nävens andra sida i 38. Näven på
      kortet är hårt knuten, och blicken går inte till skon. Fjortonde vändan på rörelsen är gjord sedan dess
      (kortet bärs vid tummen hela vägen, som dealerns); inget klipp är beställt efter den.
    - **Den externa domaren (OpenAI): Inte bra,** så provet är märkt oenigt och Jakob behöver titta själv. Dess
      tyngsta skäl är samma som domarens: vändningen går inte att läsa som ett grepp (ryggen försvinner under
      fingrarna och framsidan kommer fram ute vid tummen). Det andra är tumtoppen, som blir gulgrön och utsmetad när
      handen lyfts (efterarbetets). Det tredje gäller spårkortets turkosa ram i den gröna jämförelsebilden, som inte
      finns i filmen.
    - **Rättat i efterarbetet efter domarens första dom (gratis):** hacket och den mörka fläcken vid tummen på det
      lagda kortet (den rosa tummen togs för kortets rygg, tummens skugga på filmens kort behölls som en grå fläck,
      och vårt kort passades inte in mot tumsidan), skuggkopiorna av framsidan där kortet stannar, prickarna i handens
      kant när handen lyfts, och en svart kil i armhålan. Kvar: den gulgröna tumtoppen i farten och några småfel
      vid tummen (ett påbörjat försök avbröts av omstarten 2026-11-28 och togs bort med femtonde vändan).
    - **Lärdomen om texten:** första klippets text beskrev också kortets framsida, som aldrig syns där, och Kling
      ritade den som ett stort vitt kort på filten genom hela klippet. Verktyget säger nu bara det som syns i varje
      klipp, och mäter hur lik klippets rörelse är dockans (0,73 mot 0,96 avslöjade det påhittade kortet).
- **Efterarbetet är två verktyg** i `../standarddocka/verktyg/`: `i-dockans-takt.ts` parar varje stillbild med sin
  filmruta och läser filmen i Danilos takt med hela rutor (för filmer gjorda mellan stillbilder utan referensfilm;
  valet `--oskarpa`, som blandar filmrutor, gav dubbla fingrar och en rand runt axlarna och används inte), och
  `lagg-pa-bord.ts` skär ut dealern, lägger honom på vårt bord med vår sko (`--egen-sko`) och ritar vårt eget kort ur
  dockans tal (`--docka`, `--takt`): mönstrad röd rygg, vit framsida, livevyns storlek, ut genom skons mynning.
  Dealerns färger och hudens ton mäts i filmen själv, så utskärningen gäller vilken skjorta och person som helst, och
  bordet läses ur måtten (`table-live.ts`), så den gäller det nya bordet. Vårt kort läggs där filmens kort är, också
  när det är suddigt av farten, och fingrarna ligger över det. Provet `efter-nja-eget-kort-och-takt-20261127` visar
  det förra läget på filmen av Tomasz som han dömde.
- **En giv mellan fasta bilder, för hand i Runways app** (en annan session, tolfte och fjortonde provet i skillen
  `runway`). Filmerna finns bara bland Runways tillgångar.
  - Tolfte provet: Tomasz i Frasses ställning, med tre ankarbilder och två klipp mellan dem. Skarvarna håller, men
    kortet vändes inte av handen.
  - Fjortonde provet: en ny person ur ett foto som Jakob skickade, med handbytet A2M som egen bild:
    A2.3 → A2M → A3P4C1 → A2.3. Nu rullade handen kortet genom kanten, och det var samma kort hela vägen.
  - Samma giv gick att göra från dagens plats 5 med Kling 4 och livefilmen som referensfilm.
  - Domaren fällde båda: kortet stod stilla före vändningen, vänsterhanden låg kvar på filten, och ett klipp blev i 480p.
- **Studion** (`http://127.0.0.1:4319/studio/`): Start, Avatarer, Dockan (editorn i `../standarddocka/`), Karta med
  Schemat, Beställ (`/bestall/`), Granska med Prov, Casino, Mått, Biblioteket och Beslut.
- **Spelet** ritar vid livebordet bordet, skon och korten men ingen dealer, eftersom ingen film är godkänd där.
- **Lagret:** de sex ersatta proven, figurerna som föll, den förra standardens klipp och ett orderutkast som aldrig
  lades ligger i arkivet bredvid repot, och kortspelspaketet i `kortspelspaket-arkiv` bredvid repot. Inget är raderat.
  Repot gick från 3,2 till 1,9 GB. Städat 2026-11-28 (`node lager.ts`: "Allt registren pekar på finns här"): 32
  gamla inspelningar av dockan och den förra standardens kvinna är raderade från disken (de gick att göra om
  gratis; mannen och kvinnan togs bort på hans ord 2026-11-27), den förra standardens bord är flyttade till
  arkivet, och Danilos och Frasses rörelser är inspelade på nytt, så att Spegla visar dockans vy igen.
- **Pengar** (2026-11-28 kl. 16.48): Runway 4 091 krediter kvar; inget är använt den 28 november. Av hans budget
  på 3 000 för arbetet ("Var resonable, men ja - du får 3000 ...") är 1 055 använda, alla på Kenjis fem omgångar
  (187, 139, 129 + 56, 238 och 238 + 68). Meshy 363, orört. Den externa domaren (OpenAI) har ett tak på 5 USD per
  tolv timmar i verktyget. Ett betalt anrop i en ny chatt går inte igenom förrän han har sagt ja i den chatten,
  också inom fullmakten.

## Nästa steg

I den här ordningen om han inte säger annat.

**Han har sagt annat 2026-11-28:** "huvudsaken är ju att vi kan få in alla rörelser hämtade ur Youtubefilmerna. Men
också utifrån det mönstret och system vi använder, kunna skapa delningssekvenser till alla platser. När vi har
modellen för detta så kan vi skapa vilken dealer som helst", och "Försök inte rädda dealers som skapats ... målet är
en generisk metod". Därför går punkt 7 först, i den här ordningen:

- **Givarna till alla sju platser, kort 1 och kort 2 (pågår).** En modell som följer schemat: en gemensam första
  halva (A2.3 till handbytet A2M, den avstämda), och en andra halva per plats och kort (A2M till kortplatsen och hem
  till A2.3). Källan är filmens egen giv till platsen där dealern har en där högern lägger kortet (Danilo dagens
  plats 2, 4, 6 och 7; Frasse 1, 4, 5, 6 och 7), annars den närmaste platsens giv riktad om. Varje rörelse säger
  vilket. Domarens fynd i dagens givar rättas i modellen: vänstern tillbaka till skon efter bytet, och samma
  fingrar och samma kort i skons mynning i varje skarv.
- **Givarna där vänstern ger ensam.** Så ges de flesta korten nära skon, och alla dealerns egna (Danilo 12 gånger,
  Frasse 16). Kräver sin egen ordning för kortet i vänsterhanden; ger dealerns egna kort.
- **Sedan** korten in i lådan, svepet och väntorna, och en ordnare som spelar en runda i spelets ordning.
- Punkt 1 görs inte för Kenjis skull: vändningen rättas i dockan som en del av modellen, och ett nytt klipp beställs
  för den person som då är aktuell.

1. **Vändningen i rörelsen, och sedan ett nytt klipp av Kenjis giv.** Sättet är funnet och prövat (Kenjis fjärde
   och femte omgång, se Läget): fyra ankarbilder med röd kortrygg och tre klipp i Kling 4 med dockans film av varje
   steg som referensfilm (`ny_dealer.py --ankarklipp --rygg rod`), och efterarbetet i steg 7. Kling kopierar dockan
   till 96–98 %, så det som är kvar rättas i dockan först:
   - **Kortet vid tummen (dockans ruta 33–38):** kortet bärs med ryggen upp vid tummen, är dolt en ruta och kommer
     fram som en låg strimma under tumtoppen, som dealerns, i stället för att ligga under fingrarna på ena sidan av
     näven och dyka upp på den andra. Samma arbetssätt som förut: dockan bredvid källfilmen i tre gångers förstoring
     för varje ruta, regeln bakom det som skiljer rättas i `dealer3d/tools/lyft-till-docka.ts`, och en domare som
     inte har gjort ändringen mäter i bildpunkter. Domaren avgör när ett nytt klipp har ett skäl.
   - Sedan, betalt och med skäl: bara det klipp vars rörelse har ändrats (`--steg 5`, sedan `--steg 6 --om-klipp
     2`, 68 krediter), när ankarrutorna 29 och 43 står kvar. Efterarbetet är gratis och gör filmen på minuter.
   - **Handen på det lagda kortet och blicken:** filmens näve är hårdare än dealerns lösa, låga hand, och blicken
     går inte till skon när kortet dras. Båda är dockans (fingrarna i ruta 40–57 och huvudet i ruta 15–24).
   - **Vid nästa hela omgång:** ta bort det rosa märket ur spårkortets framsida (det hamnar under tummen och används
     inte), och ta då också bort det gula spårkortet och vägen utan referensfilm (stillbilder och Kling 4 utan
     referensfilm, Aleph 2), som gav hans Inte bra: en väg för varje sak.
   - **Dockans kropp.** Axlarnas bredd är dealerns, men armarnas längd, bålen och kroppens volym är
     kroppsgeneratorns egna (se Läget), så dockan är tjockare än Danilo (Jakob: "den tjocka dockan ... känns riktigt
     klumpig"). Måtten och volymen ska komma ur filmen eller personens bilder: SAM 3D Body ger kroppsformen och
     djupet (Danilos lyft har SAM:s djup, Frasses bara MediaPipes). I samma steg avgörs hur långt bakom kanten
     dealern sitter (antaget 0,2 m), dockans vila i Blender (`SITT`), och om en persons docka ska få personens kön,
     längd och kroppsform. Filten kan få filmens ton senare.
   - Hans dom på de förra filmerna är Inte bra. Korten `kenji-ger-ett-kort` och `sju-bilder-vid-livebordet` ("gör
     en video till") står kvar i Beslut tills en film har gått igenom domaren.
2. **Rörelsen:** vänsterhanden platt på skons kort (kräver att vänsterns handled vid skon mäts om i filmen; ett
   försök gjorde de andra givarna sämre och togs bort), tummens form när fingret ligger på kortet, pekfingret som går
   genom kortet i två rutor under handen, och högerhanden som går fram och tillbaka före bytet där dealerns ligger
   kvar och väntar. Bytet till de andra platserna saknas: de behöver sina lyft lagda från samma ankare A2M.
3. **Kedjan av ankarbilder genom en hel runda** (tolfte och fjortonde provet i skillen `runway`): givarna går mellan
   fasta bilder i rundans ordning (`rundaAv`, platserna 7 till 1 i dagens numrering) och spelets klippgraf
   (`src/clip-graph.ts`). Handbytet som egen bild är prövat och får handen att vända kortet. Görs när punkt 1 har
   gett en giv som håller.
   - Ankarbilderna görs som ändringar av A2.3: kortplatsen målas in före ändringen, och A2.3 med kortet klistras
     in.
   - Samma referensfilm, med ankarbilder från spelarnas kameror, ger samma rörelse från alla sju platserna. Klipp inte
     i referensfilmen, och gör alla klipp i samma upplösning.
4. **Det sista av den äldre dealern bort:** kortplanens värld, hennes beställningsväg och träd, bankens register,
   labbsidan `pages/scene3d.html` och grönskärmsresterna i `src/film-after.ts`. Död kod i editorn: RUNDA och sparandet
   i `editor.ts`, GIVAR och `grundFor` i `rorelse.ts`, `kropp.ts`. I `../avatar-auto-pipeline/scen/bygg_docka.py`:
   sitsen tagen per docka ur `standard.yaml` (`SITT`, kräver en Blender-körning för att se). Gjort 2026-11-28: kvinnan
   och `--kon bada` är borta ur byggskriptet (Danilos bygge gav samma rapport före och efter), de fallna vägarna steg
   10 och 11 och den äldre rörelsekatalogen i `../avatar-auto-pipeline/` likaså, och `titta.ts` har inte längre rundan
   och den gamla kameran. Mannens modell står kvar som jämförelse för mätningen av en figur.
5. **Namnen och platserna rättas i ett steg** (Jakob 2026-11-27: "återigen en ihopblandning av saker ... namn,
   vänster och höger, standarddocka, livevy"). Det som förväxlas i dag:
   - Platserna räknas från bildens vänster överallt i kod, data och studion; plats 1 ska vara närmast skon
     (`../AGENTS.md`).
   - Lyftfilernas `hoger`, `vanster` och `mitten` (`../live-bj/data/lyft/kameran-hoger-plats-7.json`) är bildens
     sidor, inte dealerns: "hoger" är platsen vid dealerns vänster, närmast skon.
   - Stilarna heter `kameran` (Danilo) och `bordet` (Frasse), samma ord som kameran och bordet: i
     `../live-bj/data/`, `dealer3d/src/doll.ts` och `ny_dealer.py --stil`. De ska heta som dealrarna.
   - Mappen `../standarddocka/` och modellernas förled `standarddocka_` gäller Danilo, Frasse och personerna; ingen
     standarddocka finns kvar.
   - "Livebordet" sägs både om bordet i Youtubefilmen och om vår kopia av det, och "dockans takt" om Danilos takt.
6. **Studion:** Granska, Prov, editorns egen text på Dockan och Biblioteket är inte genomgångna.
7. **Fler givar, kameror och personer.** Ungefär en fjärdedel av en hel runda finns som rörelse i dag: väntan,
   vägen till skon och hem, och tre givar per dealer (kort 1 till dagens plats 7 och 4, och kort 2 till dagens
   plats 2 för Danilo och 1 för Frasse), med handbytet delat bara till plats 4. Inget efter spelarnas kort finns.
   Filmen har mer än som är lyft (granskat 2026-11-28 ur `../live-bj/data/segment.json` och `rorelser.json`): 28
   rena givar till spelare för Danilo och 49 för Frasse, dealerns egna kort 11 och 16 gånger, korten in i lådan 12
   och 14, svepet 2 och 1. Det som krävs, i ordning:
   - **Fler givar till spelarna.** `../live-bj/verktyg/lyft.py` väljer i dag tre givar per dealer (mitten, och
     bildens båda sidor); urvalet vidgas till alla platser och kort 1 och 2. Filmens mätning finns redan i
     `../live-bj/matt/`. Filnamnet `lyft-<docka>-p<plats>` bär inte kortets nummer, så kort 1 och 2 till samma plats
     skriver över varandra: rättas med platsbytet (punkt 5). Varje plats behöver sin granskning: reglerna i
     `lyft-till-docka.ts` är avstämda mot en enda förlaga, Danilos giv till plats 4, och de andra givarna bryter mot
     spärrarna redan i dag.
   - **Handbytet till alla platser** (`bytet-p<n>` klipps bara ur given till mitten), och klippet från kortet
     direkt till nästa byte, som är det vanliga i filmen (Frasse 54 av 56 gånger).
   - **Dealerns egna kort:** `lyft.py` lyfter bara till en spelarplats och `lyft-till-docka.ts` letar `seat (\d)`.
     Kortplatserna D.C1–C3 finns.
   - **Korten in i lådan:** en ruta bär i dag ett enda kort (`Frame.card`), så det kräver ett nytt format i lyftet,
     editorn och scenen. Lådan är mätt.
   - **Svepet, och väntan** under insatserna och medan spelarna väljer (ankarena A1S och A1V finns inte än).
   - **En ordnare i spelets ordning** (kort 1 till alla, dealerns kort, kort 2 till alla, fler kort, korten in).
     Editorns hela sekvens spelar i dag det som finns, närmast skon först: 19 s för Danilo och persondockorna, 21 s
     för Frasse.
   - **Ritas själva, eftersom filmen inte har dem:** vända hålkortet, marker, och peka (en gång i filmen).
   - **Kamerorna:** plats 4 är livebordets och är mätt. De andra sex är räknade: samma kamera vriden kring
     bordskantens mitt till platsens insatsruta. Editorn filmar en tagning genom alla sju (`titta.ts --sekvens 1
     --kamera …`, gjort för Amara). Alla sju som film av en person görs först när en film från en kamera har fått
     hans ja.
   - **Frasse:** huvudet är inte kalibrerat mot ansiktsnätet, och stilen `bordet` är aldrig körd för en person.
     Väntornas blick.

## Väntar på Jakob

- **Amaras docka** (`amara-ny-dealer-20261128`): domarens dom är **Inte bra** (domarens ord, inte Jakobs; den externa
  domaren kördes inte, eftersom provet visar en docka). Skälen gäller grundrörelserna, inte Amara: i given till
  dagens plats 2 hänger vänsterhanden i luften framför bröstet i en sekund efter bytet (sekvensens ruta 350–380;
  kortare i givarna till dagens plats 7 och 4), blicken går nedåt i andra väntan (465–555), och vänsterhandens
  fingrar rycker på en ruta i skarvarna vid skon (239→240, 304→305, 409→410). Det som håller: kortet dras, reses,
  tas och vänds av händerna i alla tre givar, och från de sex andra platsernas kameror syns inget fel som inte syns
  genom livebordets. Jakob har sett provet ("Amara vart okej, men är inte den som var den bästa från gårdagen").
  Hennes film (238 krediter) är förberedd och inte beställd; han har sagt att dealrar som redan är gjorda inte ska
  räddas, så den beställs inte.
- **Kenjis filmer.** I Spegla heter de "Kenji 1" till "Kenji 5", den äldsta först.
  - `kenji-ny-dealer-ur-bilder-20261127` (de tre första omgångerna, Kenji 1–3): hans dom Inte bra, kortet
    `kenji-ger-ett-kort` i Beslut besvarat nej.
  - `kenji-tre-klipp-mellan-ankarbilder-20261127` (fjärde omgången, Kenji 4): fälld av domaren fyra gånger och
    ersatt av den femte. Den väntar inte på hans dom; den kan flyttas till arkivet på hans ord.
  - `kenji-rod-rygg-tre-klipp-20261127` (femte omgången, Kenji 5): domarens Nja. Det är den han ska se, och den han
    dömer när efterarbetets småfel vid tummen är rättade och vändningen har fått sitt nya klipp.
  - `efter-nja-eget-kort-och-takt-20261127` (filmen av Tomasz som han dömde, med vårt eget kort och i dockans takt)
    är inte dömt av någon domare.
- **Meshy och RunPod.** På frågan om andra betalda tjänster kryssade han OpenAI, Meshy, RunPod och "inga av dem".
  OpenAI används för den externa domaren; Meshy och RunPod används inte förrän han har sagt vilket som gäller. Han
  frågade samma dag om tunga jobb kan köras på hans RunPod: det går för vårt eget material
  (`../live-bj/verktyg/sam_runpod.ts`, några kronor per körning); för livefilmen krävs hans ord, eftersom den aldrig
  får lämna datorn.
- **Hans egen dom på proven från 2026-11-27** (Granska, Prov). En oberoende domare dömde dem i hans ställe (fältet
  `domare` i provets `proof.json`, märkt som inte hans); hans dom ersätter domarens.
  - Domaren Bra: `kartan-over-schemat-20261127`, `studion-i-roten-20261127`, `skon-med-liggande-kort-20261127`,
    `hela-filmen-indelad-20261127` och `ansikte-ur-framstalld-film-20261127`.
  - Domaren Bra men den externa domaren Inte bra: `lyftet-troget-filmen-20261127` (Danilos giv, sjunde försöket; given
    är ändrad sedan dess) och `tomasz-med-dockans-hander-20261127`.
  - Domaren Nja: `tomasz-dockan-pa-hans-matt-20261127` och `studion-mindre-text-20261127` (studion är ändrad sedan dess).
  - Inte dömda av någon: `biblioteket-20261127`, `scen-ratt-film-20261127` och `livebordet-i-spelet-20261127`.
  - Dömda av honom: `livebordet-klonat-20261127` och `danilo-frasse-kroppar-20261127` Bra,
    `dealerns-handled-20261127` Inte bra, `runway-3d-20261127` ("meshy/vår docka bäst"),
    `tomasz-gor-danilos-giv-20261127` Nej, och i `sju-bilder-vid-livebordet-20261127` filmen 01 och jämförelsen 08
    Inte bra.
- **Blicken vid skon.** Hans dom 2026-11-26 säger att blicken i ankaret vid skon är på skon. Vid livebordet står skon
  63° åt sidan från dealerns huvud. Danilo ser mot bordets mitt när han drar kortet, och Frasse vrider huvudet 29° mot
  skon. Dockorna följer de riktiga. Vill han ha blicken på det handen gör är det Frasses stil som ska användas.
- **Avaturn-figuren** gör han själv (en agent kan inte skapa kontot): de tre bilderna i
  `../avatar-auto-pipeline/output/tomasz-avaturn/` laddas upp på avaturn.me, och den hämtade GLB-filen läggs i samma
  mapp.
- **Git-historien.** Ett namn och ett användarnamn är borta ur filerna men står kvar i historien: antingen skrivs
  historien om på hans ord, eller görs repot privat.

## Kända brister

- `lyft-kolla` är inte grön: fingrar i kortet och kortet utan stöd i några rutor, armen in i bålen, och huvudspärrar i
  Danilos giv till dagens plats 2 och Frasses till dagens plats 1.
- En persons docka är alltid en mans kropp i grunddockans längd, också för en kvinna (se Läget, Amara).
- `ny_dealer.py` filmar bara de platser som har en lyft giv (dagens 2, 4 och 7 i Danilos stil; 1, 4 och 7 i
  Frasses), och texterna om vinkeln gäller bara livebordets kamera.
- Spegla visar en inspelning av dockan bara när filen är nyare än rörelsens fil. Skrivs rörelsefilerna om med samma
  innehåll (en återställning ur Git räcker) blir varje inspelning för gammal tills den görs om.
- 7 av 19 kortplatser har inte sin mätta vridning, eftersom landningarna i filmen inte var eniga; de tar en speglad
  plats vridning (`src/table-live.ts`).
- Vänsterhanden står som en klo vid skon i lyften, och tummen är tunn och spetsig när fingret ligger på kortet.
- Danilo och Frasse har olika kalibrering av huvudet: Danilo mot ansiktsnätets kurva, Frasse räknat från vilan.
- En persons docka har grunddockans ansikte och händer; huvudet är inte kalibrerat mot ansiktsnätet per person.
- Tomasz finns inte som persondocka: hans mått är mätta på hans 3D-figur (`MATT['tomasz_matt']` i `bygg_docka.py`),
  inte ur bilderna, och hans fil i `personer/` är inte skriven.
- Kling 4 ger 24 bilder per sekund, minst 3 sekunder och sin egen takt, och kan göra en enstaka ruta där hela bilden
  skalas (`--hall` håller den).
- Den externa domaren ser inte det riktiga klippet, så den fäller det den riktiga dealern faktiskt gör.
- Spelet låser sig när ett svar går förlorat ("The session is at version N") tills sidan laddas om.
- Kön läggs bara när en huvudagentchatt är öppen (`tools/order-watch.ts`), och fullmaktens dagstak räknar bara den här
  utcheckningens liggare.
- Ingen granskare kan höra: ljud bedöms av Jakob.

Önskemål, inget beställt (2026-11-11, 2026-11-13): ett tredje och fjärde dealerkort, mer rörelse i kropp, huvud och
högerarm när dealern delar ut, kaffe ur en mugg i bilden, en animation på bordet, marker som dealern tar och betalar,
insamling av korten, en andra spelarfigur.
