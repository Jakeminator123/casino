# Status

Läget och nästa steg per bana. Ersätt det som inte längre gäller; historien står i Git.

## Läget (2026-11-27, kväll)

- **En standard: livebordet.** Kameran, bordet, skon, korten och kortplatserna är klonade ur filmen av ett riktigt
  livebord (`src/table-live.ts`, kortet i `src/space.ts`, det allt läser i `src/standard.ts`; måtten i `../MATT.md`).
  Den förra standarden är borta ur koden sedan 2026-11-27, på Jakobs ord ("Förra standarden helt"): det förra bordet
  och kameran, menyvalet, mannen, kvinnan och Paow med de ritade givarna, och studions sidor Filmverkstaden, Material,
  Jämför och Protokoll. Det ligger i arkivet `casino-arkiv-paow-och-forra` bredvid repot. Hans domar på borttagna
  filmer står i `data/motions-removed.jsonl`.
- **Kvar av det förra** (ett eget steg, se Nästa steg): kortplanens värld (`src/plan-lens.ts`, `card-plan.ts`,
  `placements/default.json`), den äldre dealerns beställningsväg och träd (`dealer-trees`, `order-images`) och bankens
  register. Hans filer där är orörda.
- **Dockorna är Danilo och Frasse** (byggda på de två riktiga dealrarna i filmen) och persondockor som byggs på dem
  (`dealer3d/src/doll.ts`, `dealer3d/src/persondockor.ts`). Rörelserna lyfts ur filmen med
  `dealer3d/tools/lyft-till-docka.ts` (ur `../live-bj/data/lyft/`) till `dealer3d/data/lyft-<docka>-*.json`: givar från
  ankaret vid skon (A2.3) och tillbaka dit, vägarna till skon och hem, och två väntor. `dealer3d/tools/lyft-kolla.ts`
  spärrar ryck och fel.
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
    **Bra**, bra nog att filma en person efter, med en anmärkning för vänsterhanden vid skon.
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
- **Kenji Nakamura är den första nya dealern** (provet `kenji-ny-dealer-ur-bilder-20261127`). Hans kropp låg inom
  mätningens osäkerhet från Danilos, så dockan är Danilos kropp med Kenjis huvud.
  - Första omgången (187 krediter): Kling 4 ur nio stillbilder jämnt i tiden fick domarens **Nja** (samma man hela
    vägen och bra händer; kortet bars högt i luften, takten var Klings egen och huvudet ryckte i början), och Aleph 2
    över dockfilmen **Inte bra** (kortet försvann i bytet och ansiktet blev yngre). Domarens ord, inte Jakobs.
  - Andra omgången (139 krediter): tio stillbilder valda där något händer i rörelsen, och Kling 4. Rörelsen den
    filmades efter hade kortet hängande i fingertoppen och är ersatt; filmen ligger kvar i provets `original/v2/`.
  - Tredje omgången (129 krediter), efter den rörelse domaren dömde Bra: filmen i provet,
    `05-kenji-ger-ett-kort-vid-livebordet.mp4`, i dockans takt på vårt bord med vår sko och vårt eget kort. Kvar i
    den enligt den som gjorde utskärningen: ett litet rosa streck under pekfingret i ruta 8–9 och en svag skuggkant
    runt axlarna i ruta 30, båda ur hur filmmodellen ritade. Handen går hem tidigare än dockans.
- **Efterarbetet är två verktyg** i `../standarddocka/verktyg/`: `i-dockans-takt.ts` parar varje stillbild med sin
  filmruta och läser filmen i Danilos takt med hela rutor (valet `--oskarpa`, som blandar filmrutor, gav dubbla
  fingrar och en rand runt axlarna och används inte), och `lagg-pa-bord.ts` skär ut dealern, lägger
  honom på vårt bord med vår sko (`--egen-sko`) och ritar vårt eget kort ur dockans tal (`--docka`, `--takt`): mönstrad
  röd rygg, vit framsida, livevyns storlek, ut genom skons mynning. Dealerns färger mäts i filmen själv, så
  utskärningen gäller vilken skjorta som helst (den antog först en blå och tog bort bitar av Kenjis grå). Provet `efter-nja-eget-kort-och-takt-20261127`
  visar det på filmen av Tomasz som han dömde.
- **En giv mellan fasta bilder, för hand i Runways app** (en annan session, tolfte provet i skillen `runway`): Tomasz i
  Frasses ställning med tre ankarbilder och två klipp mellan dem. Skarvarna håller; givklippet föll hos domaren (kortet
  vändes inte av handen). 49 krediter av appens. Filmerna finns bara bland Runways tillgångar.
- **Studion** (`http://127.0.0.1:4319/studio/`): Start, Avatarer, Dockan (editorn i `../standarddocka/`), Karta med
  Schemat, Beställ (`/bestall/`), Granska med Prov, Casino, Mått, Biblioteket och Beslut.
- **Spelet** ritar vid livebordet bordet, skon och korten men ingen dealer, eftersom ingen film är godkänd där.
- **Lagret:** de sex ersatta proven, figurerna som föll, den förra standardens klipp och ett orderutkast som aldrig
  lades ligger i arkivet bredvid repot, och kortspelspaketet i `kortspelspaket-arkiv` bredvid repot. Inget är raderat.
  Repot gick från 3,2 till 1,9 GB.
- **Pengar** (2026-11-27 kl. 17.20): Runway 4 691 krediter kvar. Av hans budget på 3 000 för eftermiddagen ("Var
  resonable, men ja - du får 3000 ...") är 455 använda, alla på Kenjis tre omgångar. Meshy 363, orört. Den externa
  domaren (OpenAI) har ett tak på 5 USD per tolv timmar i verktyget.

## Nästa steg

I den här ordningen om han inte säger annat.

1. **Hans dom på Kenjis film** (kortet `kenji-ger-ett-kort` i Beslut). Hans ord var "gör en video till! Sedan kanske
   vi kan döma efter det". Kortet `sju-bilder-vid-livebordet` med det svaret står kvar i Beslut; det tas ut när han har
   sett den nya filmen.
2. **Rörelsen:** vänsterhanden platt på skons kort (kräver att vänsterns handled vid skon mäts om i filmen; ett
   försök gjorde de andra givarna sämre och togs bort), tummens form när fingret ligger på kortet, pekfingret som går
   genom kortet i två rutor under handen, och högerhanden som går fram och tillbaka före bytet där dealerns ligger
   kvar och väntar. Bytet till de andra platserna saknas: de behöver sina lyft lagda från samma ankare A2M.
3. **Kedjan av ankarbilder genom en hel runda** (tolfte provet i skillen `runway`): givarna mellan fasta bilder i
   rundans ordning (`rundaAv`, platserna 7 till 1 i dagens numrering) och spelets klippgraf (`src/clip-graph.ts`).
   För första kortet till sju platser behövs 15 bilder per person och kamera och 14 klipp. Nästa prov där är en giv
   med handbytet (A2M) som en egen bild.
4. **Det sista av den äldre dealern bort:** kortplanens värld, hennes beställningsväg och träd, bankens register,
   labbsidan `pages/scene3d.html` och grönskärmsresterna i `src/film-after.ts`. Död kod i editorn: RUNDA och sparandet
   i `editor.ts`, GIVAR och `grundFor` i `rorelse.ts`, `kropp.ts`. I `../avatar-auto-pipeline/scen/bygg_docka.py`:
   kvinnan och `--kon bada` bort, och sitsen tagen per docka ur `standard.yaml` (kräver en Blender-körning för att se).
5. **Platserna numreras om** i ett steg: plats 1 närmast skon (`../AGENTS.md`). I dag räknas de från bildens vänster
   överallt i kod, data och studion.
6. **Studion:** Granska, Prov, editorns egen text på Dockan och Biblioteket är inte genomgångna.
7. **Fler givar, kameror och personer:** de andra platserna, spelarnas kameror, Frasse (hans huvud är inte kalibrerat
   mot ansiktsnätet), väntornas blick, och nästa person genom `ny_dealer.py`. Alla sju kameror görs först när en film
   från en kamera har fått hans ja.

## Väntar på Jakob

- **Kenjis film** (provet `kenji-ny-dealer-ur-bilder-20261127`, kortet `kenji-ger-ett-kort` i Beslut), och provet
  `efter-nja-eget-kort-och-takt-20261127` (filmen av Tomasz som han dömde, med vårt eget kort och i dockans takt;
  inte dömt av någon domare).
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
