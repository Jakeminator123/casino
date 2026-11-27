# Status

Läget och nästa steg per bana. Ersätt det som inte längre gäller; historien står i Git.

## Läget (2026-11-27)

- **Standarden är Livestandarden:** kameran, bordet, skon, korten och kortplatserna klonade ur filmen av ett riktigt
  livebord (`src/table-live.ts`, måtten i `../MATT.md`). Den förra standarden står kvar som ett val i menyn tills den
  tas bort (bestämt, inte gjort; planen i `../PROJEKTET.md`, Dit vi går).
- **Den äldre dealern är arkiverad** utanför repot (mappen `casino-arkiv-paow-och-forra` bredvid repot: media,
  register och kod), och koden som bara fanns för henne är borta. Hans domar på borttagna filmer står i
  `data/motions-removed.jsonl`. Ingen dealer är förvald: spelet och studion visar tomma lägen.
- **Dockorna är Danilo och Frasse,** med kroppens mått, stil och rörelser ur mätningen av de två riktiga dealrarna
  (`dealer3d/src/doll.ts`, `../live-bj/data/`). Rörelserna lyfts ur filmen med `dealer3d/tools/lyft-till-docka.ts` (ur
  `../live-bj/data/lyft/`) till `dealer3d/data/lyft-<docka>-*.json`: givar från ankaret vid skon (A2.3) och tillbaka
  dit, vägarna till skon och hem, och två väntor. `dealer3d/tools/lyft-kolla.ts` spärrar ryck och fel, och med
  `--ansikte` jämför den dockans huvud i den ritade filmen med dealerns, mätt med samma ansiktsnät
  (`../live-bj/verktyg/lyft.py dockhuvud`).
- **Danilos giv till plats 4 är godkänd av domaren** som jämför med det riktiga klippet (sjunde försöket: huvudet böjs
  som dealerns, blicken har inga påhittade mål, kortet står på kant i bytet och läggs under pekfingret). Givarna till
  de andra platserna och Frasses givar är inte godkända.
- **Den första filmen vid livebordet** (provet `sju-bilder-vid-livebordet-20261127`): Tomasz ger ett kort till plats 4,
  gjord som Jakob valde i Beslut. Nio rutor ur dockans giv i nyckelfärgerna görs om till personen (GPT Image 2.6),
  Kling 4 gör filmen mellan dem, och dealern skärs ut och läggs på vårt bord med vår egen sko
  (`../standarddocka/verktyg/lagg-pa-bord.ts --kortfarger --egen-sko --hall`). 131 krediter. Receptet står i skillen
  `runway` (elfte provet), anropen i provets `original/anrop/`. Jakobs dom: Nja, se Nästa steg.
- **En giv mellan fasta bilder, för hand i Runways app** (2026-11-27, tolfte provet i skillen `runway`). Tomasz i
  Frasses ställning vid livebordet, med tre ankarbilder: A2.3, A3P4C1 och A2.3 med kortet kvar. Den första gjordes av
  dockans förlaga och hans foton, och de andra som ändringar av den. Två klipp går mellan bilderna: given och handen
  hem. Klippens första och sista ruta ligger på bilderna, så de går att sätta ihop i schemats ordning. 49 krediter av
  appens. Filmerna finns bara bland Runways tillgångar (inget prov på datorn).
  Domarens dom (inte Jakobs) föll på Inte bra med medel säkerhet. Skarvarna håller för kropp, händer och huvud;
  det som återstår är ett svagt blink i ljus och skärpa i första rutan efter skarven. Givklippet fäller filmen.
  Kortet vänds inte av handen: det byter från rygg till framsida plant under fingrarna (ruta 43–48). Vänsterhanden
  släpper kortet, går tillbaka till det och hänger som en klo innan den når skon (ruta 36–80). Kortet byter också
  valör mellan de två ankarna med kort. En andra tagning av given i WAN 3.0 i Frasses takt (2 s) dömdes också Inte
  bra: kortet vändes i skons mynning, inte av handen. Domarna fälldes utan MediaPipe och utan extern domare, eftersom
  ingen av dem finns i molnet. Nästa steg för vägen står under Nästa steg, punkt 1.
- **Studion** (`http://127.0.0.1:4319/studio/`): Start, Karta med Schemat (rundan, kortplatserna och rörelseschemat för
  Danilo och Frasse), Granska med Prov, Beslut, Beställ, Dockan (editorn i `../standarddocka/`), Avatarer, Mått och
  Biblioteket. Regeln "Studion visar, den förklarar inte" (`AGENTS.md`) är genomförd på Schemat, Start, Mått, Beställ,
  Ljud, Avatarer och Beslut.
- **Avatarvägen** (`../avatar-auto-pipeline/`, `vagar.json`): Tomasz egen figur med dockans händer insatta i ärmen
  (steg 14, huden ur hans egen hand), en docka byggd på hans mått, och dockans huvud i hans form (steg 13). Ingen av dem
  behövs för en film som görs av stillbilder: där är dockan bara förlaga för ställningen, och utseendet kommer ur
  bilderna av personen.
- **Spelet** ritar vid livebordet bordet, skon och korten men ingen dealer, eftersom ingen film är godkänd där.
- **Pengar** (2026-11-27): Runway 146 krediter kvar kl. 14.40 (han fyller på), Meshy 363. Den externa domaren (OpenAI)
  har kostat 3,06 USD det senaste dygnet; verktygets tak är 5. Hans ord för eftermiddagen 2026-11-27: en budget på 3 000
  Runway-krediter ("Var resonable, men ja - du får 3000. Men om allt förbrukas inom några timmar så ska det ha kommit
  igenom granskningarna ... eller du ha bra anledning"), och OpenAI för den externa domaren. Om Meshy och RunPod
  kryssade han både ja och "inga av dem": de används inte förrän han har sagt vilket.

## Pågår (2026-11-27, eftermiddag)

En ny huvudagent tog över kl. 14 efter den chatt som gjorde arbetet till och med den första filmen. Jakobs ord för
arbetet: färre spretiga och överlappande projekt, allt mer centralstyrt, gammalt bort "ganska så grovt", och "ett
generiskt sätt att få en pipeline för en helt och hållet ny dealer" ur bilder (skelett, leder, handens och ansiktets
punkter med MediaPipe och SAM 3D), riggad med rörelserna ur filmen av livebordet. Hans val samma dag: den förra
standarden bort helt (också mannen och kvinnan och de ritade givarna), de ersatta proven och figurerna ut ur repot,
kortspelspaketet ut ur repot till skrivbordet, och en helt ny person som första prov på vägen (Kenji Nakamura, vald av
agenten: en man som de två dealrarna, och en skjorta som inte krockar med det gröna i inspelningen).

Fem arbeten går samtidigt; det som är klart står under Läget när det har tagits in:

- **Förra standarden bort ur koden**, på grenen `forra-standarden-bort` i ett eget worktree bredvid repot.
- **Ny dealer ur bilder, gjort:** ett kommando, `python ny_dealer.py <person>` i `../avatar-auto-pipeline/`, mäter
  personen ur bilderna (SAM 3D Body och MediaPipe: kroppens leder, handens 21 punkter, ansiktsnätet), skriver måtten
  som en datafil (`personer/<person>.json`), bygger dockan på Danilos eller Frasses grund, lägger in den bland
  dockorna ur datafilen (`dealer3d/src/persondockor.ts`, inget kodblock per person), löser de lyfta rörelserna för
  den, filmar given och förbereder anropen. Kenji Nakamura är den första: hans kropp låg inom mätningens osäkerhet
  från Danilos, så dockan är Danilos kropp med Kenjis huvud. Mot facit (Tomasz figur) träffar mätningen armarna inom
  1 cm och axlar och bål inom 2,5 cm; handens längd mäts fel (5,7 cm) och tas inte in. Provet
  `kenji-ny-dealer-ur-bilder-20261127`.
- **Kenjis första två filmer** (187 krediter med de nio stillbilderna; originalen i provets `original/`), dömda av
  domaren, inte av Jakob: Kling 4 ur nio stillbilder **Nja** (samma man hela vägen och bra händer, men kortet bärs
  högt i luften, takten är Klings egen, 3,0 s mot dockans 2,2, och huvudet rycker i ruta 0–2); Aleph 2 över dockfilmen
  **Inte bra** (kortet försvinner i bytet och ansiktet blir yngre mot slutet). Orsakerna i receptet: tre nästan
  likadana stillbilder där dockan står still vid skon, och bilder efter landningen med kortet på lite olika ställen.
  Verktyget väljer nu rutorna efter rörelsens egna händelser, och bilderna efter landningen görs ur sista bilden.
- **Givens rörelse efter hans Nja, gjort:** kortet landar där den riktiga dealern lade det (0,6 mm och 0° från
  målet) och rättas inte till på filten (förut vreds det 21° och gled 21 mm, det han såg); kortplatsen stämde och är
  inte ändrad. Given är delad vid handbytet, ankaret A2M: `lyft-<docka>-till-bytet` för alla platser och
  `lyft-<docka>-bytet-p4` till platsen och hem, identiska med hela given ruta för ruta. Tummen är lyftets egen.
  Kortets storlek: dockans kort är livefilmens inom 1–2 bildpunkter; kortet i Kling-filmen han dömde var 4–9 %
  mindre per kant, och rättas av att vi ritar kortet själva.
- **Domaren om den rättade given** (bredvid det riktiga klippet; domarens ord): **Nja**, inte ännu bra nog att filma
  en person efter. Kortet står med kanten mot kameran i handbytet och hänger sedan i ett hörn av fingertoppen; hos
  dealern står det med ryggen mot kameran och bärs under handen. Pekfingret ligger i fel hörn och glider över kortet
  innan det lyfter. Vänsterhanden står som en klo vid skon. Kortets vinkel och fingret rättas nu; nästa film
  beställs först när det är gjort.
- **Filmens efterarbete:** kortet ritas av oss, och takten blir ett verktyg (provet `efter-nja-eget-kort-och-takt-20261127`).
- **Lagret är gjort:** de sex ersatta proven, figurerna som föll, den förra standardens 43 klipp och ett orderutkast
  som aldrig lades ligger i arkivet `casino-arkiv-paow-och-forra` bredvid repot (rader i dess förteckning), och
  kortspelspaketet i `kortspelspaket-arkiv` bredvid repot. Inget är raderat. Repot gick från 3,2 till 1,9 GB.

Det den förra chatten visste som inte stod någonstans:

- **Takten i fil 10 och 11** gjordes med ett slaskskript som är raderat: varje stillbild paras med den filmruta som
  liknar den mest, och filmen läses rakt mellan de paren (dockans ruta 0, 24, 27, 38, 45, 65 låg nära filmruta 0, 13,
  27, 40, 55, 72). Det blir nu ett verktyg.
- **Tomasz som docka fördes aldrig in** bland livedockorna. Måtten som var framräknade: axlarna 0,3119 m isär, överarm
  0,2685, underarm 0,2667, räckvidd 0,5202, handen mannens gånger 1,026, bålen 0,3941, halsen [0, 0,155, 0,0281],
  huvudet [0, 0,2713, 0,0362] med radie 0,1327, modellen `standarddocka_tomasz_dockhander.glb`, Danilos stil. Med
  persondockor ur en datafil blir det en fil för honom, inte ett kodblock.
- **Meshy för handens hud** (10 krediter) är förberett men inte kört; kommandot står i `vagar.json` under
  dockans händer i armen.
- **Danilo och Frasse har olika kalibrering av huvudet:** Danilo mot ansiktsnätets kurva, Frasse räknat från vilan.
- **Förslaget för nästa betalda film** (cirka 190 krediter för en ren jämförelse): A) Kling 4 med första bild, sju
  mellanbilder och sista bild, mellanbilderna jämnt i dockans tid (var åttonde ruta), 3 s som kortas till dockans 2,2;
  B) Aleph 2 över dockfilmen i nyckelutseendet med startbilden som styrbild, som går exakt i dockans takt. Vinnaren får
  de andra platserna och sedan två spelarkameror. Minst 1 000 krediter hålls i reserv för omtag.
- **Inaktuella dokument** (rättas när den förra standarden är borta): `../standarddocka/README.md`, `README.md` och
  `docs/SYSTEM.md` här, skillarna `ny-dealer`, `bestalla-film`, `granska-film`, `granska-rorelse` och
  `publicera-kopian` (den äldre dealerns flöde), och skillen `runway` som listar Aleph 2 först fast han valde stillbilder.
- **Där den förra chatten gick fel, med egna ord:** den arbetade ur en sammanfattning av en lång chatt, hade hans svar
  i Beslut fel i timmar, och lagade utskärningen i fyra vändor i stället för att stanna och rätta orsaken.

## Nästa steg

I den här ordningen om han inte säger annat.

1. **Filmen, efter hans Nja** (hans ord står i `../standarddocka/DOMAR.md`, sist):
   - **Kedjan av ankarbilder genom en hel runda** (tolfte provet i skillen `runway`). Givarna går mellan fasta bilder,
     i rundans ordning (`rundaAv`, platserna 7 till 1 i dagens numrering) och spelets klippgraf
     (`src/clip-graph.ts`: READY > Pn.C1 > READY).
     - För första kortet till sju platser behövs 15 bilder per person och kamera: A2.3, sju A3PnC1 och sju A2.3 med
       kortet kvar. Det är ungefär 60 krediter.
     - Det behövs också 14 klipp, och vändningen kräver mer än första och sista bild.
     - Nästa prov är en giv med handbytet (A2M, med kortets rygg upp) som en egen bild, eller Kling 4 med första och
       sista bild och dockans film som referensfilm.
   - **Vändningen ska gå fort.** Kling lägger stillbilderna jämnt i tiden, så sträckan där bilderna ligger tätast
     (bytet och vändningen) blev upp till sex gånger långsammare än dockans. Fil 10 och 11 i provet prövar att ge varje
     del dockans takt i efterhand, med hela rutor och med de överhoppade rutorna inblandade som rörelseoskärpa. Till
     nästa film: färre bilder kring bytet, eller samma efterarbete som ett verktyg.
   - **Kortet ritas av oss, inte färgas om:** ryggen mönstrat röd, framsidan vit, i livevyns storlek, och det ska komma
     ut ur skons mynning under fingrarna. Omfärgningen av spårkortet syns som ett rött överlägg och lämnar fläckar.
   - **Kortet ska inte läggas till rätta i slutet.** Verktyget styr i dag kortet till kortplatsens exakta läge och
     vinkel. Mät i filmen av livebordet var och i vilken vinkel dealern lägger kortet (plats 4 först), rätta
     kortplatsens koordinater om de inte stämmer, och låt kortet landa så.
   - **En överlämning för alla platser.** Handbytet framför dealern är samma vart kortet än ska: dela given där, i
     skon till bytet (ett klipp för alla platser) och bytet till platsen och hem (ett per plats). Handbytet står som
     förslag till ankare i rörelseschemat och är inte prövat.
   - Tummen när pekfingret ligger på kortet, och vänsterhanden plant vid skon.
2. **Den förra standarden bort** (steg 6 till 9 i planen i `../PROJEKTET.md`): menyvalet och dess kod, de ritade
   givarna, det förra bordets mått och koden för kopian på nätet; sedan resten av arkivflytten (skriptet ligger i
   arkivmappen).
3. **Platserna numreras om** i ett steg: plats 1 närmast skon (`../AGENTS.md`). I dag räknas de från bildens vänster
   överallt i kod, data och studion.
4. **Studion:** Granska och Prov, editorns egen text på Dockan och Biblioteket är inte genomgångna; sedan färre sidor
   för en enda standard.
5. **Fler givar och kameror:** de andra platserna, spelarnas kameror, Frasse (hans huvud är inte kalibrerat mot
   ansiktsnätet) och väntornas blick. Alla sju kameror görs först när en film från en kamera har fått hans ja.

## Väntar på Jakob

- **En film till, sedan dömer han.** Kortet `sju-bilder-vid-livebordet` i Beslut besvarade han 2026-11-27 kl. 15.08
  med Ja och orden "Ok, så om du menar att vi skapar större kort och möjligen annat, gör en video till! Sedan kanske
  vi kan döma efter det!", och i Prov märkte han filmen 01 och jämförelsen 08 Inte bra. Nästa film görs alltså med
  rättningarna (kortets storlek mätt mot livefilmen, eget ritat kort, snabb vändning, landningen), och han dömer den.
  Kortet `tomasz-gor-danilos-giv` (Nej) står kvar tills flera kameror prövas igen.
- **Hans egen dom på proven från 2026-11-27** (Granska, Prov). En oberoende domare dömde dem i hans ställe (fältet
  `domare` i provets `proof.json`, märkt som inte hans); hans dom ersätter domarens.
  - Domaren Bra: `kartan-over-schemat-20261127`, `studion-i-roten-20261127`, `skon-med-liggande-kort-20261127`,
    `hela-filmen-indelad-20261127` och `ansikte-ur-framstalld-film-20261127`.
  - Domaren Bra men den externa domaren Inte bra: `lyftet-troget-filmen-20261127` (Danilos giv, sjunde försöket) och
    `tomasz-med-dockans-hander-20261127`. Den externa ser inte det riktiga klippet och fäller att handen "pekar" på
    kortet och att blicken inte är på skon.
  - Domaren Nja: `sju-bilder-vid-livebordet-20261127` (den externa Inte bra), `tomasz-dockan-pa-hans-matt-20261127`
    och `studion-mindre-text-20261127`.
  - Domaren Inte bra, ersatta av proven ovan och flyttade till arkivet på hans ord 2026-11-27:
    `danilo-frasse-i-editorn-20261127`, `danilo-frasse-rorelser-20261127`, `meshy-provet-20261127`,
    `tomasz-pa-danilos-grund-20261127`, `tomasz-ansikte-20261127` och `hander-hunyuan-mot-meshy-20261127`.
  - Inte dömda av någon: `biblioteket-20261127`, `scen-ratt-film-20261127` och `livebordet-i-spelet-20261127`.
  - Dömda av honom: `livebordet-klonat-20261127` och `danilo-frasse-kroppar-20261127` Bra,
    `dealerns-handled-20261127` Inte bra, `runway-3d-20261127` ("meshy/vår docka bäst") och
    `tomasz-gor-danilos-giv-20261127` Nej.
- **Blicken vid skon.** Hans dom 2026-11-26 säger att blicken i ankaret vid skon är på skon. Vid livebordet står skon
  63° åt sidan från dealerns huvud. Danilo ser mot bordets mitt när han drar kortet, och Frasse vrider huvudet 29° mot
  skon. Dockorna följer de riktiga. Vill han ha blicken på det handen gör är det Frasses stil som ska användas.
- **Avaturn-figuren** gör han själv (en agent kan inte skapa kontot): de tre bilderna i
  `../avatar-auto-pipeline/output/tomasz-avaturn/` laddas upp på avaturn.me, och den hämtade GLB-filen läggs i samma
  mapp.
- **Git-historien.** Ett namn och ett användarnamn är borta ur filerna men står kvar i historien: antingen skrivs
  historien om på hans ord, eller görs repot privat.
- **RunPod för mätningen.** Livefilmens rutor mäts på den här datorns processor, eftersom filmen aldrig får lämna
  datorn. Om de ska få mätas på hans hyrda maskin är hans beslut. Han frågade 2026-11-27: "kan vi inte köra tyngre
  jobb med GPU-krävande och jättetunga jobb på min runpod? Eller är det för jobbigt att sätta upp?" Det går för vårt
  eget material (`../live-bj/verktyg/sam_runpod.ts`, några kronor per körning); för livefilmen krävs hans ord.
- **Meshy och RunPod i eftermiddag.** Han kryssade OpenAI, Meshy, RunPod och "inga av dem" på samma fråga. Vilket
  gäller för Meshy och RunPod?

## Kända brister

- `lyft-kolla` är inte grön: fingrar i kortet och kortet utan stöd i några rutor, armen in i bålen (Danilos giv till
  plats 7 och Frasses givar), och huvudspärrar i Danilos giv till plats 2 och Frasses till plats 1.
- Utskärningen (`../standarddocka/verktyg/lagg-pa-bord.ts`): kortet som dras ur skon har en fläck under fingertoppen i
  tre rutor, och handens skugga faller inte på skon.
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
