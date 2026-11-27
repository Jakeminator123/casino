# Projektet: idén, kedjan och varför varje mapp finns

Det här dokumentet förklarar vad casino-repot är till för och hur delarna hänger ihop. Reglerna för den som arbetar
här står i [`AGENTS.md`](AGENTS.md), måtten i [`MATT.md`](MATT.md) och hur man startar i [`README.md`](README.md).
Skrivet 2026-11-27 efter Jakobs egen beskrivning. Det som ännu avgörs av prov står sist, och dokumentet rättas när ett
prov har gett besked.

## Målet

En blackjackdealer som ser ut som en verklig människa, **sedd från varje spelares plats**: samma kvalitet som en
framställd 2D-film visar, men från minst sju vinklar runt bordet, så att flera spelare kan sitta bredvid varandra och
var och en ser dealern från sitt håll (Jakob 2026-11-27: "att kunna se samma kvalitet som i 2D-videorna från olika
vinklar ... i alla fall 7 vinklar och gärna så andra spelare kan sitta bredvid runt bj-bordet. DET är målet").

En enskild film från en vinkel är i stort löst. Det olösta är att lyfta kvaliteten till flera vinklar: en 2D-film
visar en enda vy, och 3D-figurerna når inte filmernas kvalitet. Vägarna som har prövats eller ligger nära:

- **Sju filmer av samma rörelse.** Dockan spelar rörelsen en gång och filmas genom sju kameror; filmmodellen gör en
  film av personen ur var och en. Rörelsen är densamma i alla sju, eftersom den kommer ur samma docka. Den vägen föll
  tidigare på att dockans rörelser var onaturliga och att filmmodellen kopierade dem exakt. Med rörelser lyfta ur
  riktiga dealrar blir samma egenskap en styrka: det som kopieras är en människas rörelse.
- **Bilder i stället för en hel film som förlaga** (Jakobs idé): ge filmmodellen bara några ögonblick ur dockans
  rörelse, till exempel var åttonde ruta, omgjorda till personen av en bildmodell, och låt den göra övergångarna
  själv. Prövat en gång som en kedja av fyra bilder i tre skilda klipp (`tomasz-runda-20261126`): rörelsen blev
  mänsklig men stannade upp vid varje bild. Alla bilderna i en och samma film prövas i `atta-bilder-20261127`.
- **Många kameror runt en figur** (den väg som tidigare kom närmast: 120 kameror runt en docka som hade fått sitt
  utseende av bilder på en person). Inte i det här repot.
- **3D-figuren direkt i spelet.** Ger varje vinkel gratis, men kvaliteten räcker inte i dag.

## Idén

Korta filmklipp av en person som ger kort, väntar och gör upp rundan, spelade i ett blackjackspel.

Filmerna görs av filmmodeller som arbetar i 2D (hos Runway), eftersom kvaliteten på en framställd film av en person är
mycket högre än något vi har fått ur en riggad 3D-figur (Jakob 2026-11-27: "kvaliteten från de 2D-genererade klippen på
personerna är extremt mycket bättre än vad jag hittills sett kunnat bli riggat"). Men en filmmodell som bara får en
text gör inte samma rörelse två gånger, träffar inte kortplatserna och håller inte takten. Därför styrs den av en
**docka**: en 3D-figur som spelar rörelsen exakt, i en uppmätt miljö, genom en bestämd kamera. Filmmodellen gör om
dockans film till en film av personen och följer den ruta för ruta.

## Vad dockan är

Dockan är **en visuell standard att förhålla sig till** (Jakobs ord), på samma sätt som ett bord som senare kan kläs
med material. Den bär det som ska vara lika varje gång:

- **Måtten:** bordet, skon, kortet, kortplatserna och kamerorna.
- **Rörelserna:** varje giv och varje väntan, så bra de går att göra, inspelade och bevarade så att de kan spelas igen.
- **Schemat:** vilka ställningar klippen börjar och slutar i (ankarena), så att klippen går att sätta ihop.

Dockan behöver inte likna någon. Där en persons egen 3D-figur finns och håller måttet kan den spela samma rörelser i
dockans ställe, eftersom alla figurer delar samma skelett. Men varje person behöver sina **egna inspelningar**: filmen
av Tomasz görs för Tomasz.

## Kedjan

| Steg | Vad som händer | Var |
| --- | --- | --- |
| 1. Personen | Några bilder av en person. De tio som ligger i `avatar-auto-pipeline/input/` är framställda, inga riktiga människor. | `avatar-auto-pipeline/` |
| 2. Rörelsen | Dockan spelar en rörelse vid bordet. Rörelsen är ritad av kod, eller lyft ur en film av en riktig dealer. | `blackjack-dealer/dealer3d/`, `live-bj/` |
| 3. Inspelningen | Dockan filmas i 3D-miljön genom spelets kamera, en gång per spelarplats (sju kameror). | `standarddocka/` |
| 4. Personens bilder vid bordet | Rutor ur dockans film görs om till personen av en bildmodell: där klippet börjar och där det slutar. | `blackjack-dealer/` |
| 5. Filmen | En filmmodell gör om dockans film till en film av personen. Det betalda steget. | `blackjack-dealer/` |
| 6. Granskningen | Jakob dömer filmen. Det han godkänner får en roll; resten raderas. | studion i `blackjack-dealer/` |
| 7. Utskärningen | Personen skärs ut ur filmen mot ren färg. | `standarddocka/`, `blackjack-dealer/` |
| 8. Spelet | Den utskurna filmen läggs vid bordet i en miljö, och spelets kort ritas ovanpå filmens kort. | `blackjack-dealer/` |

## Varför varje mapp finns

| Mapp | Dess uppgift i kedjan |
| --- | --- |
| `blackjack-dealer/` | **Spelet, studion och beställningarna.** Här står måttens källa (kameran, bordet, kortet, kortplatserna), koden som ritar dockans rörelser (`dealer3d/`), vägen för att beställa och bokföra filmer hos Runway, studion där Jakob granskar och dömer, och spelet där klippen spelas. |
| `standarddocka/` | **Verkstaden för rörelser.** Editorn där en rörelse spelas upp, justeras och filmas, verktygen som mäter den, och Jakobs domar om hur dockan, bordet och rörelserna ska vara (`DOMAR.md`). Rörelseschemat står i `rorelsekatalog.json`. |
| `avatar-auto-pipeline/` | **Figurerna och föremålen.** Skripten som bygger dockornas kroppar, bordet, skon och stolen efter måtten, och vägen från bilder av en person till en 3D-figur på vårt skelett. Vilka vägar som finns och vad som går ihop står i `vagar.json`. |
| `live-bj/` | **Facit från verkligheten.** Mätning av två riktiga dealrar vid ett livebord ur en film: takt, hållning, blick, hur bordet och kameran är ställda, och rörelser lyfta ruta för ruta. Filmen och bilderna stannar på datorn; bara talen går vidare. Härifrån kommer de två nya dockorna Danilo och Frasse och det klonade bordet. |
| `kortspelspaket/` | **Vid sidan.** Ett köpt paket med inspelade rörelser. Det prövades som grund och är inte det. |
| `slask/`, `inbox/` | Tillfälligt arbete, och lappar mellan chattar som arbetar samtidigt. |
| `MATT.md`, `matt.ts` | Alla mått på ett ställe, utskrivna ur koden bredvid det som är mätt på livebordet. |

## Det som är bestämt

- **Filmerna är målet, dockan är medlet.** Det spelaren ser är en film av en person. Dockan syns inte.
- **En standard i botten, utseendet ovanpå.** Mått, kameror och rörelser är fasta; bakgrund, duk, ljus och kortens
  utseende läggs på efteråt och ändrar aldrig måtten.
- **Alla figurer delar ett skelett,** så att en rörelse fungerar på varje docka. Kropparnas mått får skilja.
- **Rörelserna ska komma från verkligheten där det går.** Att finputsa en ritad giv gav en skillnad som syntes i talen
  men inte för ögat (provet `naturlig-giv-20261127`). Därför klonas ett riktigt livebord och två riktiga dealrars
  rörelser. Det som klonas är mått och rörelse, aldrig en verklig persons utseende.
- **Livestandarden är den enda standarden** (Jakob 2026-11-27: "jag skulle vilja helt övergå till det som är klonat
  totalt", "det är nu vi ska sätta en standard på riktigt"): livebordets kamera, bord, sko, kort och kortplatser, som
  de är mätta ur filmen (`blackjack-dealer/src/table-live.ts`), gäller för all inspelning, beställning och visning,
  också i spelet. Den förra standarden och den äldre dealern Paow tas ur projektet: hennes material arkiveras utanför
  repot ("vi arkiverar till skrivbordet"), och de ritade givarnas kod behålls och riktas mot livebordet. Beslutat
  2026-11-27; tills det är gjort finns den förra standarden kvar som ett val i menyn.
- **Platser och riktningar har en standard** (Jakob 2026-11-27): plats 0 är dealern, plats 1 den närmast skon vid hans
  vänster, sedan runt till plats 7. Höger och vänster är dealerns egna. Regeln står i `AGENTS.md`.
- **En persons figur byggs på den docka vars rörelser den ska spela** (Jakob 2026-11-27): rörelserna kommer från
  Danilo och Frasse, och deras dockor är grunden för personens.
- **Jakob dömer med ögat.** Kontrollerna säger var det är värt att titta; de avgör inte om något är bra.

## Dit vi går

Målbilden för hur projektet ska vara ordnat, skriven 2026-11-27 efter Jakobs fråga ("kanske kan vissa funktioner slås
ihop eller övertas av andra?"). Den säger riktningen; det som är gjort står i mapparnas README och i Git.

**En av varje.**

| I dag | Dit vi går |
| --- | --- |
| Två standarder för bord och kamera, valda i menyn | En: Livestandarden. Inget val. |
| Platserna räknade från bildens vänster | Plats 0 är dealern, plats 1 närmast skon; riktningar från dealerns kropp. |
| En äldre dealer med egna filmer, träd, register och beställningssätt | Arkiverad utanför repot. Personerna framåt är de framställda (Tomasz och de andra). |
| Tre ställen där något väntar på hans dom (Granska, Beslut, mappar i slasken) | Ett: provet, med sina original i samma mapp. Biblioteket, Granska och Beslut läser samma svar på frågan om han har sagt sitt. |
| Tre sätt att radera (hans klick, gallringen med papperskorg, slaskens städning) | Ett verktyg, för hans klick och en agents kommando, som säger följden först. |
| Flera register som pekar på filmer och bilder | Ett filmregister: vilken rörelse, vilken kamera, vilken person, hans dom. |
| Kartan som ett handskrivet träd per dealer | Schemat (ankare, rörelser, stadier) är kartan; filmerna hängs på schemats rörelser. |
| Dockan visad av tre program (editorn, Filmverkstadens inspelning, kortpaketets visare) | Editorn visar dockan överallt. |
| Studion förklarar sig i text på varje sida | Studion visar saken: bild, film, docka, karta. Orden står i Ordlistan. |

**Verkstäderna.** Dockans värld ligger i dag i tre projekt: kroppen byggs i `avatar-auto-pipeline/scen/`, rörelserna
ritas och lyfts i `blackjack-dealer/dealer3d/`, och editorn och schemat ligger i `standarddocka/`. Målet är fyra
verkstäder och ett spel, var och en med en uppgift:

| Verkstad | Uppgift | Tar över från |
| --- | --- | --- |
| Mätningen | mäta det riktiga bordet och de riktiga dealrarna | `live-bj/` |
| Dockan | kroppen, rörelserna, schemat och editorn | `standarddocka/`, `blackjack-dealer/dealer3d/`, `avatar-auto-pipeline/scen/` |
| Personen | från bilder till en figur och ett utseende | resten av `avatar-auto-pipeline/` |
| Filmen | beställa, hämta, granska och bokföra | beställnings- och granskningsverktygen i `blackjack-dealer/tools/` |
| Spelet och studion | reglerna, bordet i 3D och ingången till allt | `blackjack-dealer/` |

En mapp flyttas inte förrän dess innehåll är rensat: en flytt ändrar varje sökväg i kod, skills och dokument, och görs
en verkstad i taget när inget annat arbete pågår i den.

**Ordningen.**

1. Den äldre dealern arkiveras och den förra standarden tas bort; verktygen som bara fanns för dem går med.
2. Platserna numreras om i det som är kvar, i ett steg.
3. Studion görs om för en standard: färre sidor och mindre text.
4. Det som är dubbelt slås ihop enligt tabellen.
5. Mapparna ordnas efter verkstäderna.

## Vad proven har visat hittills

- **Filmmodellen följer dockan nästan ruta för ruta,** så dockans stelhet följer med in i filmen. Tider i texten
  ändrade inget, och en docka som liknar personen gav ingen synlig skillnad i filmen: utseendet kom ur bilderna
  (`kling-tider-20261127`, en tagning per sätt).
- **Riktiga dealrar bromsar in i handbytet,** till 6–8 % av toppfarten, men rör sig annars hela tiden; dockan stannade
  flera gånger till och höll den fria handen blickstilla. Bålen börjar samtidigt med handen.
- **En kamera framifrån ger svagt djup.** MediaPipe lägger en led 4–11 cm fel i djupled; SAM 3D Body två till fyra
  gånger bättre (prövat på vår egen dockfilm).
- **Kortet kan ritas ur dockans tal** i stället för att letas upp i bilden: där filmen följer dockan ligger kortet
  1–2 mm rätt och flackar inte. Det går sämre där filmmodellen själv har ritat kortet fel (`kortbyte-20261127`).
- **De första filmerna av en lyft rörelse dömde Jakob inte bra** (Tomasz som gör Danilos giv, Aleph 2, 2026-11-27):
  utseendet glömdes efter hand, han var skakig, blicken gick uppåt, och vänsterhanden gjorde något den riktiga dealern
  inte gör. Det sista stod i vårt eget verktyg, som lade den förra standarddockans giv ovanpå filmens rörelse.
  Mätningarna (kortet inom en bildpunkt, takten rätt) sa ingenting om något av det. Sedan dess döms ett resultat av en
  oberoende domare innan det visas för honom.
- **Smårycken i en lyft rörelse kommer ur vårt eget verktyg, inte ur dealern** (mätt 2026-11-27 på Danilos giv till
  plats 4). Dockans huvud sjönk 41 mm där dealerns sjönk 4, eftersom bålen lutades ruta för ruta för att armen skulle
  nå. Högerhanden hoppade 2–3 cm på en enda ruta, där en rättning slogs på. Blicken och fingrarna, mätta ruta för ruta
  i ett ansikte på 135 bildpunkter, är mest brus: den råa blicken byter håll 18 gånger per sekund. Dockan ska följa
  rörelsen, inte mätningens brus, och en filmmodell följer varje sådant hopp.
- **En spärr ska mäta bilden, inte talen bakom den** (2026-11-27). Två försök av given föll på att huvudet vreds 32°
  mot skon och knyckte, fast spärren sa att huvudet följde dealerns inom en grad. Spärren läste rörelsens fil; editorn
  tappade huvudets eget mål när den blandade två rutor, så i bilden följde huvudet blicken. Det syntes först när
  dockans ritade film mättes med samma ansiktsnät som den riktiga dealern (`live-bj/verktyg/lyft.py dockhuvud`).
  Blickens mål mot skon och kortplatsen var dessutom vårt eget påhitt: de riktiga dealrarna drar kortet utan att se på
  skon, som står 63° åt sidan.
- **Två kameror ger samma man i samma ögonblick,** sett i stillbilder från livebordets kamera och från plats 7. Det
  säger att vägen med flera kameror kan hålla, inte att filmerna är bra.
- **En hel sekvens i en tagning föll:** ansiktet gled och det kom till kort som inte fanns. En giv i taget håller
  bättre, och scenen behöver alla kort som dealern rör.
- **Några stillbilder i stället för en film som förlaga** (Kling 4 med sju mellanbilder): rörelsen stannar inte vid
  bilderna och kortet landar rätt, men takten blir filmmodellens egen.
- **Klipp som börjar och slutar på samma ankarbilder går att sätta ihop** (2026-11-27, tolfte provet i skillen
  `runway`). Den första bilden av personen görs av dockans förlaga, och resten som ändringar av den, så att person,
  ljus och bakgrund blir desamma. Varje klipp får två av dem som första och sista bild. Klippens kanter låg på bilderna
  inom komprimeringens brus, och domaren såg inget hopp i kroppen i skarven. Det klippet gör mellan bilderna är
  däremot filmmodellens eget: i den billigaste vändes kortet inte av handen. Därför är schemat med ankare och klipp
  bärande, medan modellen och förlagan för rörelsen avgör om rörelsen blir bra.
- **Ansiktets miner går att mäta ur en framställd närbild** av en framställd person. De riktiga dealrarna gjorde dem
  helt enkelt inte medan de gav kort.
- **En färdig figur som formas om till en annan dockas skelett får sträckta, trasiga händer** (Jakob: "skitdåligt").
  Skelettet stämde på 0 mm; ögat fällde den ändå.
- **Ett utseende målat på en annan mans docka blir inte personen** (`meshy-provet-20261127`, domarens dom, inte
  Jakobs: Inte bra). Meshy målade Tomasz hud, hår och skjorta på Danilos docka med skelett, fingrar och ansiktsformer
  orörda, men formen är kvar: ett smalt, yngre ansikte med hans färger, och en skjorta som sitter som hud. Likheten
  sitter i formen: först huvudets form, sedan kroppens mått, sist kläderna som egna delar. En kropp i ett stycke ur
  flera vyer hos Meshy fick ihopvuxna fingrar och utsmetat ansikte, och läggs ned.
- **En större person löses med kroppens mått, inte med en annan mans kropp.** Rörelsen är var händerna, fingrarna och
  blicken är i rummet; armarna räknas om för personens egna axlar och armlängder, och sitsen väljs så att han når utan
  att luta sig. En docka med Tomasz mått byggs som Danilos byggdes ur en mätt dealer.
- **Av 3D-figurerna är Meshy-vägen bäst på likhet,** men händerna är dess svaga del: en hand som sätts på i
  efterhand får handledens led inne i ärmen, och rättningen ovanpå det dömde Jakob Inte bra ("om vi har leder innan i
  dockan, varför lägga på ett lager till"). En kropp i ett stycke med egna händer böjs rätt vid handleden men har
  slätare händer (`hander-hunyuan-mot-meshy-20261127`). Ett ansikte som rör sig prövas.

## Det som är öppet och avgörs av prov

- **Gör dockan det den riktiga dealern gör?** För Danilos giv till plats 4: ja, enligt domaren som jämför med det
  riktiga klippet (sjunde försöket 2026-11-27: huvudet, blicken, bytet med kortet på kant och hur kortet läggs följer
  dealern). Den externa domaren, som bara ser dockan, fäller att handen "pekar" på kortet och att blicken inte är på
  skon. Den första filmen av den given är gjord med sju stillbilder i Kling 4 (`sju-bilder-vid-livebordet-20261127`,
  Jakobs dom väntar). Kvar i rörelsen: vänstern vid skon, tummen när pekfingret ligger på kortet, de andra platserna,
  och Frasse, vars huvud inte är kalibrerat mot ansiktsnätet än.
- **Håller sju filmer av samma rörelse ihop?** Två kameror gav samma man i samma ögonblick. Alla sju görs först när
  rörelsen är rätt och en film från en kamera har fått Jakobs ja.
- **Händerna har var sin tid.** I filmen börjar vänsterhanden ofta nästa kort medan högern går hem. Hela filmen är
  indelad per hand (`live-bj/data/segment.json`), och rörelseschemat har ett läge per hand, bryggor för det oväntade
  och handbytet som förslag till nytt ankare. Inget av det är prövat som rörelse i dockan än.
- **Övergången till den klonade uppsättningen** är gjord i editorn, i spelet (bordet, skon och korten ritas; ingen
  dealer, eftersom ingen film är godkänd där än) och i beställningarna, som säger vilken uppsättning de gäller. Kvar:
  Scen ska aldrig visa en film under en annan uppsättnings kamera (rättas), och Dockan i Filmverkstadens inspelning
  följer inte menyns val.
- **Hur räknas platserna?** I dag 1–7 från bildens vänster. Jakob har föreslagit att plats 1 blir den närmast skon,
  som på ett riktigt bord (där börjar given i filmen); det avgörs av vad bytet rör.
- **Hur många inspelningar per person behövs?** Varje person behöver egna filmer, för varje rörelse och varje kamera.
  Sju kameror gånger alla rörelser gånger alla personer blir många betalda filmer; vilka kameror och rörelser som
  verkligen behövs är inte bestämt.
- **Vilka rörelser utöver första kortet?** Andra kortet och fler, kortet till dealern själv, väntan, korten in. De
  står som saknade i rörelseschemat.
- **Korten ovanpå filmen** ska byggas om efter dockans tal. Det gamla överlägget står kvar tills det nya bär.
- **Ska någon 3D-figur visas direkt i spelet,** utan film? I så fall behöver den ett rörligt ansikte och bättre
  händer. I dag är svaret nej: filmerna är mycket bättre.
- **Slutmålet för spelet.** Uppspelningen av klippen i en miljö med bakgrund och bord började i projekten dealer och
  Scoutgaming. Här finns den som studion och spelet i `blackjack-dealer/`, där allt prövas och godkänns. Om det som
  ska lämnas vidare är de färdiga klippen, spelet, eller båda, är Jakobs att säga.
