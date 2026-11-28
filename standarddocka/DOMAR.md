# Jakobs domar om dockorna

Hans egna ord om bilderna, filmerna och rörelserna han har sett, med datum, ordnade efter sak. De är måttet en rörelse,
en bild eller en film prövas mot innan den visas för honom, och de ändras bara av honom: en ny dom skrivs in under sin
sak med datum och hans ord, och en dom han har ändrat sig om ersätts av den nya. Domarna om det som är borta (den förra
standardens bord och kamera, mannen och kvinnan, de ritade givarna) står i Git. Läget står i
`../blackjack-dealer/STATUS.md`.

## Målet

- **Alla rörelser ur filmen, och givar till alla platser (2026-11-28).** "Huvudsaken är ju att vi kan få in alla
  rörelser hämtade ur Youtubefilmerna. Men också utifrån det mönstret och system vi använder, kunna skapa
  delningssekvenser till alla platser. När vi har modellen för detta så kan vi skapa vilken dealer som helst. Då kan vi
  också ändra vinkeln på kameran när allt ska spelas in."
- **Dealrar som redan är gjorda räddas inte (2026-11-28).** "Försök inte rädda dealers som skapats om det är lättare att
  jobba på annat sätt såsom att skapa en ny eller liknande då målet är en generisk metod för att skapa nya och inte att
  få till just dessa dealers. Dock är ju målet att få till en fungerande dealer som ska kunna spelas in på Runway med
  filmerna."
- **En ny dealer ur bilder (2026-11-27).** "Jag vill ha ett sätt där jag kan lägga in bilder och skapa skelett och även
  datapunkter för hand och ansikte ... På bästa sätt vill jag få fram hela innanmätet av en ny dealer": ett generiskt
  sätt, där dealern "till allra största del är ett resultat av alla de rörelsesekvenser som vi nu har tagit in", och
  där filmerna granskas av den externa domaren under arbetet.
- **Filmer med ett skäl (2026-11-27).** "försök ha en anledning med att skapa filmerna nu. Vi vill hitta 'the magic
  sauce' för att sedan kunna massproducera, inte innan."

## Standarden och bordet

- **Livebordet är standarden, och bara det (2026-11-27).** "Det nya bordet, sko, alltihopa ska bli den nya standarden
  överallt." "Vi byter standard till att i princip enbart utgå från vy/vinkel/riktningar/storlekar och annat som fanns i
  videon (man ska sedan kunna spela vårt casino/blackjack i annan vinkel, men det kan ändras sedan när man väl har allt
  på plats vad det gäller den nya standarden för det mesta)." Och: "Liveboardet i min värld är det som ursprungligen
  filmades med alla vinklar, kort, sko, dealer och allt så som kom från live-bj." Måtten är filmens; utseendet runt
  bordet (rummet, väggen bakom dealern) är vårt eget och neutralt. I casinot vill han ha en vy som går att ställa in,
  "liknande som det var tidigare".
- **Spegla mot filmen, och namn som inte förväxlas (2026-11-27).** "Jag vill kunna banne mig spegla vår
  vy/bord/dealer/kort/kameravinkel etc mot youtubeklippet varifrån det kommer!" Och: "jag känner verkligen att återigen
  en ihopblandning av saker skett - namn, vänster och höger, standarddocka, livevy och eller annat". Studion har en
  sida där vår bild ligger över filmens.
- **Studions dockvy är editorns (2026-11-26).** "Vi ska ha in vy/vinkel och allt det andra från 'standarddockan'-mappens
  mini-blender": rätt vy och "allting som har med hur vi i framtiden ska försöka att skapa såna här klipp".
- **Editorns bild ska gå att läsa (2026-11-28).** Om en bild ur editorn: "det är som två kort som syns ... mycket
  förvirrande, jag ser inte leder för knogarna eller tumme eller andra fingrar ... Vyn känns typ som att det är en bred
  lins/3d också vid zoomning. Korten ska ju också vara aningen elastiska för att efterlikna vissa smådelar".
- **Vår markerbricka, när den läggs till, är bordets kant mot dealern (2026-11-26).** "Chipbrickan ska också vara så
  långt in mot dealern, i bordet, att det faktiskt också är det som är 'gränsen' och slutet på bordet som vetter mot
  dealerns mage": ingen remsa filt mellan brickan och kanten. Livebordet har ingen bricka.

## Dockan och kroppen

- **Vad standarddockan är (2026-11-28).** "En standarddocka i min mening är bara någonting som innehar alla rörelser, men
  utifrån rätt bord, kort. Men också i den vinkel som finns på youtubevideorna." Danilo och Frasse "är de riktiga
  personerna på och från youtubefilmerna. Med andra ord ska deras kroppar och annat stämma, givet att vi t.ex. kört SAM
  3D på dessa personer." Det ersätter att mannen och kvinnan ägde alla rörelser (2026-11-26).
- **En grunddocka och en rörelsesamling (2026-11-28).** "om vi har fler dealers så kommer ju väl de olika dealers ha
  olika anatomier och så vidare. Därav dels min tanke med en enda grunddocka som skalar [skrivet 'sallar'; kan också
  vara 'samlar'] och bär alla rörelser, som är plockad från olika dealers. Men då måste ju saker och ting kunna
  'generaliseras'?" Det är alltså en grunddocka och en samling rörelser, som får komma från olika dealrar (Danilo,
  Frasse och senare fler); varje rörelse börjar och slutar i samma ankare, och dockan skalas efter personen. Senare
  samma dag: "Är också nu standarddockan en enda docka. Denna docka har en grunduppsättning med rörelser som alla av dem
  finns i mitt system av och i 'Karta'?" Att Danilo och Frasse i dag är två dockor med var sin uppsättning är läget,
  inte målet.
- **Grunddockan bär bara rörelserna (2026-11-28).** På frågan om ett prov med dockan klädd som dealern: "grunddockan
  ska bara inneha rörelserna som de skapade avatarerna ska kunna få." Inget sådant prov görs; utseendet hör till
  personen.
- **Samma uppbyggnad i dockan och i en persons docka (2026-11-28).** "Dockan och de skapade avatarerna - har de samma
  typ av struktur? Alltså t.ex. de har lika många leder, lika många datapunkter, lika många - allt liksom?" Så är det
  byggt: alla dockor görs av samma skript med samma skelett och samma namn på benen
  (`../avatar-auto-pipeline/scen/bygg_docka.py`), varje hand har samma 21 punkter, och rörelsernas filer har samma
  form. Det som skiljer är måtten och huden.
- **Kroppen ska vara dealerns, inte en medelmans (2026-11-27 och 2026-11-28).** "varför skapas våra avatarer utifrån en
  standard som inte är just det som ska följa alla mått från Danilo och Frasse så att säga?" Om den tjocka dockan:
  "kanske det blir fel av bara farten då den känns riktigt klumpig". Och 2026-11-28: "Är de verkligen bra, eller ska det
  vara skelett eller andra typer av 3d-figurer istället?", och med tre bilder ur editorn: "våra dockor som ska anpassas
  utefter rörelserna ... är helt enkelt inte bra nog som du ser på bilderna." I dag har dockorna dealerns leder och
  lyfta rörelser, men en medelmans kropp med två av dealerns mått. Funnet samma kväll: provdockor med kroppen mätt ur
  filmen (provet `dockans-kropp-ur-filmen-20261128`, inte dömt av honom) skiljer bara några centimeter från dagens
  dockor, och Danilo och Frasse ett par procent från varandra.
- **En ny persons docka (2026-11-28).** En ny person får "en anpassad docka, men jag tror att händerna i stort sett ska
  vara desamma", och "alla de rörelser som finns in och från youtube-modellen ... insegmenterade utifrån
  youtubefilmerna, men inplacerade smart i vårat rörelseschema/noder/ankare".
- **En persons docka byggs på dockan vars rörelser den spelar (2026-11-27).** "Den docka som är skapad utifrån [Danilo
  och Frasse] och som vi arbetat med hela tiden [är] grunden för den docka av Tomasz som ska göras." Tomasz formad om
  till Danilos skelett, med händer som sträcktes: "skitdåligt".
- **Inget lager ovanpå lederna (2026-11-27).** Om rättningen ovanpå den påsatta handen, Inte bra: "Men om vi har leder
  innan i dockan varför lägga på ett lager till. Vinkeln här är lite fel på hur armen går från tröjan också."
- **Det en kropp inte kan ska inte gå (2026-11-26).** Om en armbåge dragen in i bålen: "Sånna här rörelser ska ju bara
  inte gå", de "borde vara blockerade": ingen arm genom bålen eller bordet, ingen led bortom sitt läge.
- **Ansiktet (2026-11-26, en önskan).** "Dock undrar jag om vi kanske ska lägga på det som kanske kan göra lite uttryck
  ... som blinkningar och ansiktsgester": ett val, avstängt tills han har sett det, och noll i varje klipps början och
  slut.

## Rörelserna

- **Rörelserna är de riktiga dealrarnas (2026-11-27).** Om vänsterhanden som lyftes framför bröstet vid handbytet:
  "Detta är en rörelse som youtubedealern inte gör. Detta är definitivt en kvarleva från gamla dockan eller förra
  standarddockans rörelsemönster och inte en kopia av det skelett/rigg/rörelser och annat som kommer från de nya
  dealrarna." Händerna ska vara där filmens är.
- **Allt börjar i ett ankare (2026-11-26).** "Rörelserna måste kunna läggas in i hela det system med A1 som allt börjar
  på", och "Sitter inte i 'vila/A1' som jag trodde alla startpositioner skulle": varje rörelse går mellan två ankare
  (vilan A1, handen vid skon A2.3, handbytet A2M) och börjar och slutar stilla i dem, aldrig med händerna i luften, så
  att klippen kan läggas efter varandra.
- **Varianter (2026-11-26).** "Det ultimata hade varit ett system där man har ca 5 unika givar till respektive plats",
  med egna små rörelser för huvud, kropp och andra armen.
- **Märk det som skiljer (2026-11-26).** Om en giv med vänsterhanden ensam: "Vänsterhanden är fine, men det måste liksom
  markeras så man vet att dessa skiljer sig från tvåhandsutdelningen bara." Om att kortet sätts ned kring sin långsida
  eller plant: "senare kommer detta vara beroende på om spelaren på platsen eller spelaren på annan plats ska få kortet
  visat för sig." En variant bär ett märke (`marke` i rörelsens fil).
- **Upp till sju kort per plats (2026-11-26).** "upp till 7 kort för respektive spelare/seat så att säga", och "se till
  att det inte glöms bort och att du lyckas med det logiska kring detta, hur dessa två kan faktiskt sys ihop inbördes
  mellan givar till spelare."
- **Händerna har var sin tid (2026-11-27).** "Om man kollar på videon så kan ibland dealerns vänsterhand börja ta ut kort
  eller annat medan dennes högerhand återgår till vila", en "ny feature som gör att vi inte får så konstiga
  vänsterhänder vid tillbakagång till just typ A2.n". Om vänstern som drar nästa kort innan det förra ligger: "det
  svåra (osäker på om det ens ska göras)".
- **Bryggor och nya rörelser (2026-11-27).** Rörelser som ska in: "ta in kort till slasken", "svepa bordet som riktiga
  dealern gör i klippen" och att "snabbt, med hela handen kunna peka på den som ska agera". Och: "om andra oväntade
  gester görs, så ska dockan inte behöva härma just den sekvensen just då, utan vänta in youtubedealerns nästa och mest
  liknande start för t.ex. 'P4C2'-start eller 'VILA'"; bryggorna får göra klippen "aningen längre".
- **Var klippet hör hemma ska synas (2026-11-27).** "Osäker på var i nodträdet/hur denna sammanlänkas med andra
  noder/träd/karta".
- **Spåra kort och händer i filmen (2026-11-28).** "Kan du sätta en agent på youtubefilmerna, denne ska försöka att
  hitta och spåra korten och händerna vid rörelseövergångar såsom A2M samt där korten vrids och vänds och framförallt
  till platserna. Sedan där kan vi se exakt vad som faktiskt sker med korten och händerna".

## Händerna och handbytet

- **Händerna vilar på filten, inte i den (2026-11-26).** "Händerna går in lite i bordet": ingen del av en hand under
  filten, och det ska synas att handen ligger på bordet.
- **Armarna går aldrig genom bordets kant (2026-11-26).** "En 'karm' finns som gör att armen från dealern går igenom
  karmen ungefär vid armbågen av framför allt dealerns egna högerarm och vänsterarm": underarmarna går över kanten.
- **Vilan är avslappnad (2026-11-26).** "I A1/VILA-position ska han se mer avslappnad och naturlig ut med blicken mot
  P4." Om dockorna i vilan: "aningen för utsträckta armbågar kanske", och "så ska väl händerna mer vara i samma riktning
  som underarmarna väl?": handen pekar som underarmen, inte vinklad i handleden.
- **Handen vid skon är redo (2026-11-26).** "Dealerns hand som för ut kortet ur skon liksom lyfts upp och spänns medan
  den andra [handen] faktiskt delar ut kortet", och "dockan ska inte vara avspänd vid skon i REDO/A2.3": handen som tog
  kortet ur skon håller sin redo-ställning lugnt medan den andra lägger kortet, varken lyft och spänd eller slapp.
- **Handen som bär kortet är inte spänd (2026-11-26).** "hennes högerhand ser spänd och stiff ut i mitten av videon".
- **Det ska synas vad varje hand gör (2026-11-26).** "Se till att vi får till en väldigt bra och effektiv symmetri med
  händer och kort." Om en ruta där handen var knuten kring kortet och kortet stod på högkant vid platsen: "vad gör
  dealern ens? Förstår skripten att vi faktiskt byter hand?"
- **Högern tar kortet med tummen, utan att handleden vrids i maxläge (2026-11-26).** "så ska standarden vara att dennes
  högerarm ska med hjälp av tummen ta emot kortet som sedan skjuts och vänds över än att hela handleden ska vridas i
  maxläge som är onaturligt".
- **Kortets vändning (2026-11-26).** Två gånger: "kortet vänds åt fel håll". Hans beskrivning: "Dealerns vänstra hand
  trycker ut kortet. Dealerns högra hand (vänster från kamera) tar emot det med sin tumme ned och vänder över kortet
  cirka 100 grader i nyckelvridningsrotation medan armen förs mot P4C1 typ." Som alternativ en version där "kortet på
  smart/enkelt vis vänds över när kortet är väldigt nära där det ska landa". Och: "Låt alla möten mellan handen som drar
  fram kort och det som tar emot mötas mer i mitten av bordet kanske?" Hur filmens dealer gör står i nästa punkt, och
  den gäller.
- **Så gör dealern handbytet (2026-11-27).** "Jag ser att dealern i youtube har tummen som visas och vi har hans
  pekfinger." "Nu ser jag det! Det är alltså youtubekillen som med sin vänstra hands tumme viker upp kortet så det böjs
  lite grann. Där har vi det!" I filmen, ruta för ruta: högern ligger platt på filten vid kanten och väntar; vänstern
  skjuter kortet plant fram till högerns fingertoppar och reser det på kant med tummen, så att det buktar en aning;
  högern tar det nedifrån och bär det under handflatan. På platsen håller dealern kortet med tummen och handen platt och
  lågt, inte med ett pekande finger, och vänsterhanden ligger på skons kort.
- **Tummen (2026-11-27).** Om högern på kortet vid plats 4 i Danilos lyfta giv: "Något är nog med tummen, annars ser ju
  iaf detta bra ut."

## Kortet och skon

- **Standardkortet är editorns (2026-11-26).** "Våra kort som används i 'standarddocka'-mappens editor är det som ska
  användas som standard, och finns låsningar och standarder som säger annat, stryk/radera/ändra det." Kortet är
  bordets eget, i editorn och i studion.
- **Kortet ur skon (2026-11-28).** "Korten som kommer ut från skon tror jag vår studio visar fel eller gamla mått av.
  Youtubekorten är större och inkluderar det omgärdande vita av kortet, som också kan ha förblandats med kortens kanter
  som syns längre upp i skon." Funnet samma kväll: editorn ritade ett rött kort utan vit kant, fast bordets kort har
  mönstrad rygg med vit kant (rättat).
- **En kortrygg per film (2026-11-27).** "Dock fladdrar gult och rött som kortrygg. Är detta för vi har kortrygg som rött
  och gult blandat? Detta bör vara en bugg, eller att vi inte enats om vilket kort som ska användas." Kortryggen "ska i
  och för sig vara mönstrat röd". Varje bild som styr en film visar samma rygg: röd i en film som visas som den är,
  spårkortets gula (nyckelutseendet) bara i en inspelning som ska skäras ut.
- **Inget överlägg på kortet (2026-11-27).** "Varför är det så att korten som dras ifrån den nya skon redan här har ett
  rött överlägg?"
- **Kortet läggs inte till rätta av sig självt (2026-11-27).** "Kortet läggs sedan ned, och ska inte automatiskt läggas
  i rätt vinkel bara för det inte kom exakt rätt; försök i stället få kortet (med livevyns storlek av kortet) till
  koordinater som kanske måste mätas på nytt."
- **Kortet sitter i en hand hela vägen (2026-11-27).** Om Kenjis film: "det kan ändå inte flyga upp till högra". Om
  filmen med eget kort: "Varför åker kortet upp nära bytet? Tror inte det har de dimensioner som på youtubevideon ...
  de vrids upp av/med hjälp av andra handen."
- **Kortet finns på ett ställe (2026-11-26).** "kortet från skon finns nu på 2 ställen": rörelsens kort ligger där skon
  står, aldrig någon annanstans.
- **Skons kort ligger, och syns som kort.** "Kortskon som används är också med stående kort och inte det som
  youtubefilmen har, dvs liggandes." (2026-11-27) Och: "se bara till att det blir supertydligt vad som på skon faktiskt
  är ett kort och inte" (2026-11-26).
- **Kortplatsernas ramar (2026-11-28).** "vår studio/dockan har dels konstigt utplacerade kvadratiska rektanglar för
  kortens positioner." Ramarna är inte tryckta på filmens bord: de visar var dealrarna lade kort 1 och kort 2, och går
  att dölja i editorn.

## Blicken

- **I vilan in i kameran (2026-11-26).** "A1 [ska] alltid ha avataren som tittar mot kameran … mot P4:as kamera för
  tillfället." Och 2026-11-27: "Känns som att han tittar uppåt, men uppåt och inte mot kameran, som om dockan delvis
  utgår ifrån en gammal standarddocka som hade en annan vy som kamera."
- **Vid skon på skon (2026-11-26).** "Detta är ju inte A1 som dessa startar på. Denna är ju A2.3, därför ska dockans
  blick riktas mot skon när den går från skon och skjuter ut kortet, men också återvända till samma ställe med samma
  blick. En annan sak hade varit om han skulle återvända till A1." Blicken är mot kameran bara i vilan; i A2.3 är den på
  kortet i skons mynning, under given på kortet, och tillbaka på skon när handen är det.

## Takten och smårycken

- **Takten (2026-11-27).** "Att ge ett kort ska ta 1.2 sek och återgången 0.8." Från vilan till skon cirka 1 s ("A1 -
  A2.3 ska ta 1 sekund ungefär", 2026-11-26). Det är rörelsens tid; stillastående i ett ankare räknas inte. Det ersatte
  2026-11-26:s högst 1 s ut och 0,6 s tillbaka.
- **Takten är dealerns (2026-11-27).** "Vad menar du med dockans takt? Varför inte följa takten från och som den Danilo
  eller Frasse hade." En lyft giv spelas i dealerns takt ruta för ruta: säg "Danilos takt", inte "dockans".
- **Filmen går i dockans takt (2026-11-27).** "om det nu är så att vi av någon schematisk anledning ska köra vår video
  snabbare än den docka som finns (varför?), så vet jag inte vad det tjänar till". Om Kenjis film: "Tempot är konstigt
  också."
- **Vändningen går fort (2026-11-27).** "Varför saktas det in så mycket när kortet ska vändas? Just vändningen ska gå,
  eller skulle jag vilja testa, snabbt", gärna med lite oskärpa, "men för den delen ska inte något bli slarvigt".
- **Inga småryck, värst i huvudet (2026-11-27).** "han var liksom lite skakig på grund av, jag vet inte, att för små
  mikrorörelser kommer med?" Och: "få bort de allra värsta smårycken som fanns i till exempel huvud var det
  framförallt. Men jag vet att det har skett kring handen också". Dockan följer dealerns rörelse, inte mätningens brus:
  huvud och axlar är lika stilla som hans, handens fart är en jämn kurva, och blicken hålls på ett mål och vrids mjukt
  till nästa.
- **Inga hack (2026-11-26).** "Är som ett litet hack i filmen på 50/120, som försöker kompensera för att fingrarna inte
  är på rätt sida": fingrarna är på rätt sida av kortet från början, så att inget rättas till mitt i.
- **Dockans fel syns i filmen (2026-11-26).** "det [är] mycket viktigt att dockan vi använder är väldigt bra med sina
  givar, så ett litet typ hack som sker omkring ruta 50/51 faktiskt syns i denna film". Filmmodellen följer dockan ruta
  för ruta och rättar ingenting: en rörelse filmas först när den är ren.

## Filmerna av personer

- **Samma person hela filmen (2026-11-27).** "allteftersom glömdes utseendet på Tomasz". Han tror att personens egen
  riggade figur som förlaga hjälper filmmodellen att hålla det.
- **Docka, avstånd och standard ska kunna visas (2026-11-27).** "Är inte denna Thomas också kanske lite med fel typer av
  docka/avstånd/standarder i stort ... VET du det?": kortets storlek, kameran, bordet och vilken docka som spelar ska
  kunna visas med tal.

## Hans domar på proven

- **Beslut "Tomasz gör Danilos giv från två kameror: är det samma man?": Nej (2026-11-27).** Skälen är de ovan:
  utseendet som glömdes, smårycken, blicken uppåt, skons stående kort och vänsterhanden framför bröstet.
- **`sju-bilder-vid-livebordet-20261127`, Tomasz ger ett kort till plats 4: Nja (2026-11-27).** "Ser på den där filmen
  och tycker nja också." Skälen: vändningen som saktades in, det röda överlägget, filmen i en annan takt än dockan och
  kortet som lades till rätta (orden ovan). Om handen: "Möter inte dealerns högra hand kortet ... så skyfflas ju kortet
  upp, och det är ju fantastiskt." Och: "Försökte vi att skapa som en universell överlämning med detta parti när händerna
  möts?" Filmen (01) och jämförelsen med dockan (08) märkte han Inte bra, och i Beslut: "Ok, så om du menar att vi
  skapar större kort och möjligen annat, gör en video till!": kortet var för litet.
- **`efter-nja-eget-kort-och-takt-20261127`: Bra, 3,5 till 4 av 5 (2026-11-27).** "Bra ... klippet är 3.5/5 eller
  4/5." Det han frågade står ovan (dealerns takt, kortet som åkte upp nära bytet, var klippet hör hemma, om dockan och
  måtten är rätt). Dessutom förloras han "pyttelite" efter handbytet, och han undrar om vändningen är en vridning kring
  kortets mitt.
- **`kenji-ny-dealer-ur-bilder-20261127`: Inte bra (2026-11-27).** I Prov Inte bra på provet, filmen (06) och dockfilmen
  (03), som han först skrev "Kan vara bra.." om; domaren hade dömt dockans rörelse Bra och filmen Nja. Om en arbetsfil:
  den "ser bra ut fast man ser liksom att någon typ av överläggningsgrej ligger vid händerna". Om filmen: "Tempot är
  konstigt också", och "Är kanske också inte bordet lite lågt eller händerna för typ korta i förhållande för att få
  kortkontakt." I Beslut: "Nej men livebordet. Vad är det ens? Fingrarna når inte kortet heller.. Fel kameravinkel mm".
  Funnet: kameran är filmens, och det han ser som fel vinkel är vårt utseende (en slät grå vägg bakom dealern); den
  riktiga dealern lägger handen platt på kortet där dockan pekade med ett finger, och hans vänsterhand ligger på skons
  kort där dockans svävade som en klo.
- **`amara-ny-dealer-20261128`: okej (2026-11-28).** "Amara vart okej, men är inte den som var den bästa från
  gårdagen." Den bästa är Kenji.

## Domaren

- **En domare när han är borta (2026-11-27).** "Sätt en extern bild- och videogranskare som får agera domare i stället
  för mig när jag är borta, så att [en figur med trasiga händer] kan ses att det är skitdåligt." Hur det går till:
  skillen `doma`.
- **En bild han ska döma visar det som används (2026-11-26).** "Paows arm är helt konstig", om en stillbild med en äldre,
  ritad giv: visa dockan i vilan eller i en rörelse som används.

## Öppna frågor

- **Står eller sitter dealrarna? (2026-11-28)** "På youtubefilmerna tror jag att de står och inte sitter. Jag tror inte
  stol finns." Funnet: mätningen säger att de sitter på en hög stol (`../live-bj/data/uppsattning.json`, `floor`: ögonen
  0,15 m lägre än när de står), och vid grannborden syns stolsryggar; filmens stol syns inte bakom dealern, vår gör.
  Hans att avgöra.
- **Mer film (2026-11-28).** "Om jag skulle kanske ordna mer videomaterial som finns, men där det kommer skilja aningen i
  vinkel, vy, dealer och lite annat. Kan man ändå försöka att använda materialet?", med "3 nya dealers" som kan "ta
  rörelser till de andra platserna på bordet".
