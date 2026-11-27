# Jakobs domar om standarddockan

Hans egna ord om bilderna, filmerna och rörelserna han har sett, med datum. De är måttet en bild eller en rörelse
prövas mot innan den visas för honom, och de ändras bara av honom: en ny dom skrivs in här med datum och hans ord, och
en dom han har ändrat sig om ersätts. Hur mappen är byggd och läget står i `README.md`.

- **Startläget är vilan (A1).** "Sitter inte i 'vila/A1' som jag trodde alla startpositioner skulle": varje bild och
  varje rörelse börjar med båda händerna i vila på filten, inte med händerna i luften.
- **Blenders bord gillar han, men det ska vara helt mot dealern.** "Bordet här gillar jag, men är i grunden fel som
  standardbord då det har som ett bortfall runt magen, vilket kanske beror på att markerbrickan ska vara där, som då i
  så fall nu skulle vara instoppat i bordet": ingen urgröpning mot magen, och markerbrickan nedsänkt inne i bordet.
- **Markerbrickan följer bordet.** "Markerhållaren har inte förskjutits bak", "markerbrädan har inte gått bak som
  bordet": när bordet kommer närmare dealern ligger brickan vid dealerns kant.
- **Markerbrickan är bordets kant mot dealern.** Om den första arbetsvyn: "Chipbrickan ska också vara så långt in mot
  dealern, i bordet, att det faktiskt också är det som är 'gränsen' och slutet på bordet som vetter mot dealerns
  mage": ingen remsa filt mellan brickan och kanten; brickans dealersida är bordets kant där dealern sitter.
- **Händerna vilar på filten, inte i den.** "Händerna går in lite i bordet": ingen del av en hand under filtens yta,
  och det ska synas att handen ligger på bordet.
- **Armarna går aldrig genom bordets kant.** "En 'karm' finns som gör att armen från dealern går igenom karmen ungefär
  vid armbågen av framför allt dealerns egna högerarm och vänsterarm": underarmarna går över kanten.
- **Högerhanden tar emot kortet med tummen, utan att handleden vrids i maxläge.** "Dealerns egna högerarm [är] för
  vriden, med andra ord så ska standarden vara att dennes högerarm ska med hjälp av tummen ta emot kortet som sedan
  skjuts och vänds över än att hela handleden ska vridas i maxläge som är onaturligt" (han såg det kring ruta 27 i
  given till plats 4).
- **Inga hack i rörelsen.** "Är som ett litet hack i filmen på 50/120, som försöker kompensera för att fingrarna inte
  är på rätt sida": fingrarna ska vara på rätt sida av kortet från början, så att inget rättas till mitt i.
- **En dockas arm får inte se konstig ut i en bild han ska döma** ("Paows arm är helt konstig" om en stillbild tagen
  med den äldre, handritade given): visa dockan i vilan eller i den rörelse som faktiskt används.
- **Kamerans vinkel.** Inspelningens kamera ser dealern uppifrån, och "vinkeln [är] inte naturlig utifrån att man
  skulle spela i casinot. Dock om vi kan vinkla ned vyn till när man ska spela så går detta å andra sidan": vyn
  spelaren får ska vara mer framifrån än inspelningens, och blicken mot kameran.
- **Spelets vy är den lägre kameran (2026-11-26).** Om bilden genom den lägre kameran: "Jag tror jag gillar denna
  kameravinkel som standard faktiskt! Men ska vi sätta denna standard måste vi se till att allt hänger med, så att vi
  inte bara ändrar en kameravinkel här och sedan kommer det inte följa med i de led som har med .glb-/3d/andra mappars
  standarder och/eller andra kameror som filmar från andra platser". Och att insatsringen på plats 4 inte ska brytas
  av bilden. Talen står på ett ställe, `PLAY_LENS` i `../blackjack-dealer/src/table-lens.ts` (0,58 m över filten,
  12 grader ned), och allt läser dem därifrån: editorn, de sju platsernas kameror (`seatView`), och Blenders standard
  (`../avatar-auto-pipeline/scen/standard.yaml`, `spelvy` och kamerorna `spel` och `spel_plats_N`). En ny kamera läggs
  aldrig in som egna tal i en mapp.
- **I vilan ser han in i kameran (2026-11-26).** "A1 [ska] alltid ha avataren som tittar mot kameran … mot P4:as kamera
  för tillfället."
- **Vid skon ser han på skon (2026-11-26).** Om givarna till sju platser, som börjar och slutar vid skon: "Nja. Detta är
  ju inte A1 som dessa startar på. Denna är ju A2.3, därför ska dockans blick riktas mot skon när den går från skon och
  skjuter ut kortet, men också återvända till samma ställe med samma blick. En annan sak hade varit om han skulle
  återvända till A1. I övrigt bra!" Blicken är alltså mot kameran bara i vilan (A1). I A2.3 är den på kortet i skons
  mynning, under given på kortet, och tillbaka på skon när handen är det.
- **Takten (2026-11-27).** "Jag vill ändra standarddockans tid för att ge kort. Att ge ett kort ska ta 1.2 sek och
  återgången 0.8. Det bör passa bättre för övrigt." Alltså: från vilan till skon cirka 1 s, kortet ut (från skon till
  att det ligger) 1,2 s, och handen tillbaka (till skon eller till vilan) 0,8 s. Det är rörelsens tid; stillastående i
  ett ankare räknas inte in. Bakgrund: 2026-11-26 satte han "A1 - A2.3 ska ta 1 sekund ungefär", "respektive utgivning
  är max 1 sekund och tillbakagången ... ca 0,6 sekunder", och gav A och B till plats 4 i den takten 5/5.
- **Handen vid skon är redo medan den andra ger (2026-11-26).** "Dealerns hand som för ut kortet ur skon liksom lyfts upp
  och spänns medan den andra [handen] faktiskt delar ut kortet", i alla givarna. Och: "dockan ska inte vara avspänd vid
  skon i REDO/A2.3". Handen som tog kortet ur skon går alltså tillbaka till sin redo-ställning vid skon och håller den
  lugnt medan den andra handen lägger kortet: varken lyft och spänd i luften, eller slapp.
- **Vilan ska se avslappnad ut (2026-11-26).** "I A1/VILA-position ska han se mer avslappnad och naturlig ut med blicken
  mot P4."
- **Skons kort ska synas som kort (2026-11-26).** Kortens rygg får vara som den är, men "se bara till att det blir
  supertydligt vad som på skon faktiskt är ett kort och inte", gärna med "ett litet skydd/hölje, så man måste verkligen
  dra ut ett kort i taget": en riktig dealerskos frontplatta med en halvmåneformad öppning för fingret.
- **Varianter (2026-11-26).** "Det ultimata hade varit ett system där man har ca 5 unika givar till respektive plats",
  med egna små rörelser för huvud, kropp och andra armen.
- **Allt börjar i A1.** "Rörelserna måste kunna läggas in i hela det system med A1 som allt börjar på": varje rörelse
  går mellan två ankare (A1 vilan, A2.3 handen vid skon) och börjar och slutar stilla i dem, så att klippen kan läggas
  efter varandra i spelets träd.
- **Det en kropp inte kan ska inte gå (2026-11-26).** Om en armbåge dragen in i bålen i editorn: "Sånna här rörelser
  ska ju bara inte gå", de "borde vara blockerade". Det han drar i hålls inom vad en kropp kan: ingen arm genom bålen
  eller bordet, ingen led bortom sitt läge.
- **Studions dockvy ska vara editorns (2026-11-26).** Om standarddockan i studions dockvy med det äldre bordet och den
  äldre kameran: "Vi ska ha in vy/vinkel och allt det andra från 'standarddockan'-mappens mini-blender". Inte bara
  kroppen ska in i studion, utan "rätt vy" och "allting som har med hur vi i framtiden ska försöka att skapa såna här
  klipp".
- **Mannen och kvinnan äger alla rörelser (2026-11-26).** "Jag skulle dock vilja, om det går, att vi har som en
  grund-3D-mesh-avatar som är en man och en kvinna som i alla fall äger alla rörelser. Jag förstår att det är svårt
  att anpassa unikt för respektive dealer som 'avatar-auto-pipeline' skapar, men fan, det ska kunna gå." Rörelserna
  ritas för standarddockornas egna kroppar, och en dealer från pipelinen ska kunna göra dem: den byggs på samma
  skelett, så att bara kroppens mått skiljer.
- **Målet (2026-11-26).** "Skapa eller sätt in så man kan sätta in en av våra standarddockor i 'Bordet'. Alltså välja
  en standarddealer som är en docka. Sedan ska den få bra rörelser enligt så som vi vill ha det." Och: "Sedan vill jag
  se en manlig standarddocka på ett blackjackbord där allt faktiskt fungerar och där rörelserna är smidiga och
  naturliga."
- **Händer och kort hör ihop (2026-11-26).** "Se till att vi får till en väldigt bra och effektiv symmetri med händer
  och kort." Om rutan där kortet läggs på plats 4 (handen knuten kring kortet, kortet på högkant): "vad gör dealern
  ens? Förstår skripten att vi faktiskt byter hand?" Det ska synas vad varje hand gör: vänsterhanden drar kortet ur
  skon, högerhanden tar det i ett öppet grepp, vänder det och lägger det, utan knuten hand och utan kort på högkant.
- **Kortets vändning (2026-11-26).** Två gånger om givar han fick se: "kortet vänds åt fel håll". Hans beskrivning:
  "Dealerns vänstra hand trycker ut kortet. Dealerns högra hand (vänster från kamera) tar emot det med sin tumme ned
  och vänder över kortet cirka 100 grader i nyckelvridningsrotation medan armen förs mot P4C1 typ. Du kan också,
  vilket vi kan prova, att skapa en annan version när kortet på smart/enkelt vis vänds över när kortet är väldigt
  nära där det ska landa också som alternativ." Om var händerna möts: "Låt alla möten mellan handen som drar fram
  kort och det som tar emot mötas mer i mitten av bordet kanske?" Så läses det, mätt på två lärofilmer av dealrar som
  ger ur en sko: vänsterhanden drar ut kortet plant och reser det på högkant med framsidan mot dealern; högerhanden
  kommer med handryggen upp och nyper kortets övre kant ovanifrån, fingertopparna på ryggen och tummen pekande nedåt
  längs framsidan ("tumme ned" är alltså inte tummen under ett plant kort); den rullar kortet framåt, bort från
  dealern, med en utåtvridning av underarmen på cirka 90–100 grader, så att framsidan är uppe före halva vägen;
  sedan bärs kortet plant och lågt, sätts ned plant, skjuts någon centimeter på plats och släpps. Vänsterhanden
  stannar vid skon. "Utan kort på högkant" ovan gäller ett kort som ställs eller blir stående vid platsen, inte
  resningen i bytet. Alternativet: samma grepp, men rullningen sker först strax före platsen. Riktiga dealrar byter
  hand vid skons mynning och ger på cirka en halv sekund; mötet mer mot mitten och takten är hans val.
- **Standardkortet är editorns (2026-11-26).** "Våra kort som används i 'standarddocka'-mappens editor är det som ska
  användas som standard, och finns låsningar och standarder som säger annat, stryk/radera/ändra det." Kortet är
  bordets eget (Blenders kort, 63 x 88 mm), i editorn och i studions dockvy.
- **Skon och korten flyttas inte in (2026-11-26).** "Tänk på att sko och korten måste inte skjutas in såsom t.ex.
  bordet eller annat såsom markerbricka behöver": bordets kant och brickan kommer till dockan; skon, korten och
  kortplatserna står kvar.
- **Sitthöjden (2026-11-26).** Av fyra höjder i vilan dömde han axlarna 23 och 27 cm över filten Inte bra, 31 cm
  "okej" i spelets vy och Bra från sidan, och 35 cm Bra från sidan men Inte bra i spelets vy (huvudet klipps):
  dockan sitter med axlarna 31 cm över filten. Om 31 cm: "i denna position som ser 'okej' ut så ska väl händerna mer
  vara i samma riktning som underarmarna väl?": i vilan pekar handen som underarmen, inte vinklad i handleden. Om
  bilden uppifrån: "bordet ser lite för tillspetsat ut väl?"
- **Bordet är en halvmåne och skon står längre ut (2026-11-26).** "Vad sägs om vi gör det mindre äggformat så att
  toppen inte används lika mycket, utan att det blir mer som en halvmåne", och skon "aningen längre bort från dealern
  så att dealern ... inte ska behöva sitta så otroligt ihopklämd till skon". Av tre bord dömde han det 1,15 m djupa
  Inte bra ("okej vi fimpar dena då") och halvmånen Bra: bordet är 0,95 m djupt (en halvcirkel) och skon står 8,5 cm
  längre ut åt dealerns vänster. Om samma bilder: "kortet från skon finns nu på 2 ställen": rörelsens kort ligger där
  skon står, aldrig på skons förra plats. Talen står i `DOLL_TABLE` i `../blackjack-dealer/src/table-lens.ts`.
- **Kortplatserna vända mot varje spelare (2026-11-26, en fråga, inte en dom än).** "Dessa markörer för korten, de ska
  väl vridas så att respektive spelare, givet att man inte sitter just mittemot, ska kunna få korten mot sig? Osäker
  på om detta förändrar någonting". På dockornas bord prövas platserna vridna mot sin spelare (plats 4 rakt, de yttre
  mest), i bild uppifrån och från plats 1, innan givarna till de sex andra platserna ritas; given till plats 4 berörs
  inte. Hans kortplan (`../blackjack-dealer/placements/default.json`) har vinkeln 0 på alla platser i filmernas ruta
  och 21 grader på de yttre i mobilens; filmernas plan ändras inte av det här. Senare samma dag: "Om given skulle
  göras så att kortet läggs i fyrkanter som pekar mot respektive stol. Skulle det då kanske göra att vissa givar
  hamnar mer rätt?" Ja: prövat samma dag är dockornas bord byggt med spelarnas ramar vända mot sin spelare (långsidan
  längs linjen från dealern genom platsen; plats 4 rakt, de yttersta 40 grader, dealerns egna rakt), och givarna
  lägger kortet så. Handleden står då högst 36 grader från underarmen på varje plats (förut 60 och 69 på plats 6 och
  7). Hans svar på provet `givar-sju-platser-20261126` samma dag gällde blicken vid skon och slutade "I övrigt bra!";
  de vända platserna nämnde han inte för sig (agentens läsning: de står kvar). Hur de tas bort igen står i README,
  Nästa steg.
- **A och B (2026-11-26).** Om mannens giv till plats 4, version A (vänds på vägen) och B (vänds vid platsen):
  "Superbra, 5/5 för båda faktiskt! Kanon skulle ju vara att ha båda uppsättningarna, men så de skulle kunna dela
  till alla spelare och upp till 7 kort för respektive spelare/seat så att säga på ett eller annat sätt. Så gärna A
  och B." Båda ritas till alla platser; fler kort per plats är nästa steg (README).
- **Vänsterhandsgiven och märkningen (2026-11-26).** Om givarna till alla sju platser: "Vänsterhanden är fine, men det
  måste liksom markeras så man vet att dessa skiljer sig från tvåhandsutdelningen bara." Om att kortet sätts ned kring
  sin långsida i stället för plant: "långsida/plant, samma där – senare kommer detta vara beroende på om spelaren på
  platsen eller spelaren på annan plats ska få kortet visat för sig." Varje giv bär därför ett märke (fältet `marke` i
  rörelsens fil: vilken hand, hur kortet vänds, hur det sätts ned), och editorns statusrad säger det. Agentens läsning:
  båda sätten att sätta ned kortet ska finnas som märkta varianter, och vilket som används väljs senare efter vem som
  ska se kortet.
- **Sju kort ur de två givarna (2026-11-26).** "Det där med att alla 7 kort kan ges utifrån dessa två utdelningar är
  fantastiskt, men se till att det inte glöms bort och att du lyckas med det logiska kring detta, hur dessa två kan
  faktiskt sys ihop inbördes mellan givar till spelare." Det är nästa steg och står överst i README, med logiken.
- **Ansiktet (2026-11-26, en önskan).** "Dock undrar jag om vi kanske ska lägga på det som kanske kan göra lite
  uttryck ... som blinkningar och ansiktsgester": dockorna har ansiktsformerna och ögonens leder. I hela rundan finns
  de som ett val, avstängt tills han har sett det ("Små egna rörelser och blinkning": en andning, en liten
  viktförskjutning, en blinkning, i några givar en blick upp mot spelaren med ett svagt leende), alltid noll i varje
  klipps början och slut (README, Hela rundan).
- **Inte trångt framför dealern (2026-11-26).** "Tänk på att du med fördel kan skjuta fram både sko/kort och dess
  placeringar om du skjuter fram dealern. Annars kanske det liksom blir för trångt?" När dockan och bordet kommer
  närmare varandra ska händerna i vilan, brickan, dealerns egna kort och skon fortfarande ha plats: ingen hand vilar
  på en kortplats.
- **Närmare bordet (2026-11-26).** Om dockan i vilan sedd uppifrån: "skulle man inte kunna skjuta in dockorna aningen
  till mot bordet". Och om att inget känns bättre: rörelserna "känns inte så harmoniska", och "låsningar finns i
  gamla sparade filer". Det gamla (Paows mått, det äldre bordets kant, lappar ovanpå) är orsaken; det rättas i
  dockans egna mått och egna rörelser, inte med en lapp till.
- **Mannen och kvinnan delar grund (2026-11-26).** "Kanske kan mannen och kvinnliga dockan i alla fall ha en någorlunda
  grund så man inte behöver jobba dubbelt för grundposer": en ställning eller en rörelse görs en gång och gäller båda.
  Om vilan: "mannen och kvinnan har aningen för utsträckta armbågar kanske".
- **Handen som bär kortet får inte se spänd ut (2026-11-26).** Om kvinnan i given till plats 4: "hennes högerhand ser
  spänd och stiff ut i mitten av videon".
- **Skons frontplatta (2026-11-26).** "Bra, men inte helt. Jag vill att frontplattan ska ha en liten mynning längst
  upp. Samt kanske inte området som omgärdar kanten på kortets rygg ska vara vitt. Kan misstas för kortets tunna sida,
  eller ännu värre att det misstas för att det vita är något annat, såsom kanske karmen på skon."
- **Dockans fel syns i filmen.** Om första filmen av dockan omgjord till en person: "det [är] mycket viktigt att dockan
  vi använder är väldigt bra med sina givar, så ett litet typ hack som sker omkring ruta 50/51 faktiskt syns i denna
  film". Filmmodellen följer dockan ruta för ruta och rättar ingenting: en rörelse filmas först när den är ren.
- **Struket (2026-11-26).** Att luta bordet mot kameran: "Vi skiter i lutning av bordet".

## Livebordet, Danilo och Frasse (2026-11-27)

Samma dygn som den klonade uppsättningen blev den nya standarden. Domarna gäller dockorna vid livebordet, deras lyfta
rörelser och filmerna som görs av dem.

- **Den klonade uppsättningen är den nya standarden.** "Det nya bordet, sko, alltihopa ska bli den nya standarden
  överallt." "Jag skulle vilja helt övergå till det som är klonat totalt." Den förra står kvar som ett val. I casinot
  vill han dessutom ha en vy som går att ställa in, "liknande som det var tidigare".
- **Rörelserna är de riktiga dealrarnas, inte den gamla dockans.** Om vänsterhanden som lyftes framför bröstet vid
  handbytet, i dockan och i filmen av Tomasz: "Detta är en rörelse som youtubedealern inte gör. Detta är definitivt en
  kvarleva från gamla dockan eller förra standarddockans rörelsemönster och inte en kopia av det skelett/rigg/rörelser
  och annat som kommer från de nya dealrarna." Händerna ska vara där filmens är; inget i en lyft rörelse får komma ur
  de ritade givarna.
- **Inga mikrorörelser.** Om filmerna av Tomasz som gör Danilos giv: "han var liksom lite skakig på grund av, jag vet
  inte, att för små mikrorörelser kommer med?"
- **Blicken mot kameran, inte uppåt.** "Känns som att han tittar uppåt, men uppåt och inte mot kameran, som om dockan
  delvis utgår ifrån en gammal standarddocka som hade en annan vy som kamera."
- **Skons kort ligger.** "Kortskon som används är också med stående kort och inte det som youtubefilmen har, dvs
  liggandes."
- **Personens utseende får inte glömmas.** Om samma filmer: "allteftersom glömdes utseendet på Tomasz". Han tror att
  personens egen riggade figur som förlaga hjälper filmmodellen att hålla det.
- **Händerna har var sin tid.** "Om man kollar på videon så kan ibland dealerns vänsterhand börja ta ut kort eller annat
  medan dennes högerhand återgår till vila. Det skulle kunna bli någon form av ny feature som gör att vi inte får så
  konstiga vänsterhänder vid tillbakagång till just typ A2.n."
- **Bryggor och nya rörelser.** Rörelser som ska in: "ta in kort till slasken", "svepa bordet som riktiga dealern gör i
  klippen" och att "snabbt, med hela handen kunna peka på den som ska agera". Och: "om andra oväntade gester görs, så
  ska dockan inte behöva härma just den sekvensen just då, utan vänta in youtubedealerns nästa och mest liknande start
  för t.ex. 'P4C2'-start eller 'VILA'"; bryggorna får göra klippen "aningen längre".
- **En persons figur byggs på den docka vars rörelser den ska spela.** "Den docka som är skapad utifrån [Danilo och
  Frasse] och som vi arbetat med hela tiden [är] grunden för den docka av Tomasz som ska göras." Men Tomasz formad om
  till Danilos skelett, med händer som sträcktes, dömde han "skitdåligt".
- **Handleden.** Om rättningen ovanpå den påsatta handen: Inte bra. "Men om vi har leder innan i dockan varför lägga på
  ett lager till. Vinkeln här är lite fel på hur armen går från tröjan också."
- **En domare när han är borta.** "Sätt en extern bild- och videogranskare som får agera domare i stället för mig när
  jag är borta, så att [en figur med trasiga händer] kan ses att det är skitdåligt." Hur det går till: skillen `doma`.
