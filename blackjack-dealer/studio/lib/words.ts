// The studio's words, gathered in one table (Jakob 2026-11-12: "gather all the systems' words and different names into one
// common one"; 2026-11-17: the glossary must follow how he uses the words). Each entry is one thing: the one Swedish word the
// studio uses for it (his most settled word where he has one), one line of what it is and where he sees it, the other words
// he himself uses for the same thing (sager, shown as "Säger också"), and the names it has in code, files and documents
// (aven, "Kallas också"). Every name leads to one entry only (kept by hand: no test holds it). The anchors' settled words are
// Jakob's own and docs/SYSTEM.md "Ordlista och gräns mot Scout"; the rest is checked against the code and
// registers it names. The words for the studio itself (Studion, Ramen, Menyn, Vy, Bildytan, Servern) are his of 2026-11-25:
// "labbet" is no longer a word of its own, it is one of the names that lead to Studion. The table says what holds now
// (2026-11-28): a word for something that is gone is taken out, and where he still meets the word (Standarddockan,
// Filmverkstaden, A2.1) its line says what it was and what holds instead. The menu's "Ordlista" shows the
// table (components/shell/Glossary.tsx) and the bot reads it through
// lib/guide.ts, so no text here may carry a machine path, a local address or a name the copy blocks. Data and one search, no DOM.

export type WordGroup = "Ankare och platser" | "Rörelser och filmer" | "Kortet" | "Dockor och bilder" | "Efter filmen" | "Omdömen" | "Studion och vyerna";
export const WORD_GROUPS: readonly WordGroup[] = ["Ankare och platser", "Rörelser och filmer", "Kortet", "Dockor och bilder", "Efter filmen", "Omdömen", "Studion och vyerna"];

export type Word = {
  /** The one word a person sees in the studio. */
  ord: string;
  /** What it is, and where he sees it, in one line. */
  betyder: string;
  /** Jakob's own other words for the same thing ("Säger också"), so that he finds it whichever word he looks for. */
  sager: readonly string[];
  /** Other names for the same thing in code, files, documents and earlier talk ("Kallas också"). */
  aven: readonly string[];
  grupp: WordGroup;
};

/**
 * The anchors of the older film bank (src/clip-graph.ts) as Granska's names write them: the code inside a step
 * ("A2.1 → A3P4C1") and the name on its own (lib/names.ts takes both from here). The dolls' anchors are the motion
 * scheme's (Schemat); of these only A1 and A2.3 are theirs, and A2.3's entry below says what A2.1 and A2.2 were. They go
 * with the bank, and names.ts's reader with them, not here alone.
 */
export const ANCHOR_WORDS = {
  IDLE: { code: "A1", name: "A1 vila" },
  READY: { code: "A2.1", name: "A2.1 nyp" },
  "READY-B": { code: "A2.2", name: "A2.2 hand över" },
  "READY-C": { code: "A2.3", name: "A2.3 två händer" },
  AWAY: { code: "Borta", name: "Borta" },
  "REVEAL(D.C1)": { code: "DC1 upp", name: "DC1 upp" },
  // The films made before 2026-11-24 turn the card at D.C2, where the hole card lay then (src/clip-graph.ts OLDER_REVEAL_EDGE).
  "REVEAL(D.C2)": { code: "DC2 upp", name: "DC2 upp" },
} as const;

export const WORDS: readonly Word[] = [
  // ── Anchors and places ──
  { grupp: "Ankare och platser", ord: "Ankare", betyder: "En bestämd ställning där dockan står stilla och som varje klipp börjar och slutar exakt i, så att klippen går att sätta ihop: rutorna i Schemat. Ett ankare är ett läge för varje hand; i A2.3 vilar högern och vänstern är vid skon. Ankarena är få: ett nytt läggs bara där spelet måste kunna stanna och välja väg.", sager: [], aven: ["anchor", "läge", "H1", "V2.3"] },
  { grupp: "Ankare och platser", ord: "A1 vila", betyder: "Ankare 1: dealern vilar med båda händerna på filten. Varje runda börjar och slutar här.", sager: ["ankare 1"], aven: ["IDLE", "VILA", "Keystone 1 (gammalt namn)"] },
  { grupp: "Ankare och platser", ord: "A2.3 redo vid skon", betyder: "Ankare 2.3: högern vilar på filten och vänstern är vid skon. Varje giv börjar här, och handen kommer hem hit. A2.1 (nypet) och A2.2 (släpet) var den förra dealerns lägen vid skon; dockorna har bara A2.3.", sager: ["ankare 2.3"], aven: ["A2.3 två händer", "READY-C", "REDO", "A2.1 nyp", "A2.2 släp"] },
  { grupp: "Ankare och platser", ord: "A3P4C1", betyder: "Ankare 3: bilden där ett kort har landat, skriven ihop med plats och kort. A3P4C1 är ankare 3, plats 4, kort 1; dealerns egna heter A3DC1, A3DC2 och A3DC3. I Schemat står de som A3PnCm och A3DCm.", sager: ["A3", "ankare 3", "A3P2C1", "ankare 3, player 2, card 1"], aven: ["A3PnCm", "A3DCm", "landningsbild", "slutbildsankare"] },
  { grupp: "Ankare och platser", ord: "Plats och kort", betyder: "P1–P7 är spelarnas platser och C1 och C2 deras två kort: P4C1 är plats 4, första kortet. Platserna räknas ännu från bildens vänster, så dagens plats 7 är närmast skon. Beslutat men inte gjort: plats 1 närmast skon och plats 0 för dealern.", sager: [], aven: ["P4.C1", "dagens plats", "nya plats", "box 3 i Scout (box = plats − 1)", "kortplats", "placeringsnyckel"] },
  { grupp: "Ankare och platser", ord: "Dealerns kort", betyder: "DC1 (hålkortet, hans första kort, med ryggen upp tills det vänds), DC2 (öppet) och DC3, ett tredje kort som en runda kan ha.", sager: ["hålkortet"], aven: ["D.C1", "D.C2", "D.C3"] },
  { grupp: "Ankare och platser", ord: "Skon", betyder: "Den svarta lådan med korten, vid dealerns vänstra hand och till höger i bilden, med livebordets mått. Kortet dras ut genom skons mynning.", sager: [], aven: ["SHOE", "skobild"] },
  // ── Motions and films ──
  { grupp: "Rörelser och filmer", ord: "Rörelse", betyder: "Ett klipp från ett ankare till ett ankare, ofta tillbaka till samma, som heter efter vad dealern gör: en pil i Schemat. Inne i klippet har händerna var sin tidslinje, som i filmen: vänstern kan ta nästa kort medan högern lägger det förra.", sager: [], aven: ["steg", "kant", "edge", "READY>P4.C1"] },
  { grupp: "Rörelser och filmer", ord: "Stadium", betyder: "Vad dealern håller på med i spelet just nu: Vila, Insatserna läggs, Redo vid skon, Ett kort ut, Handen hem och de andra. Ett stadium har ett hemankare och de rörelser som får spelas medan spelet är där. I Schemat är de raden över bilden, med hur många av stadiets rörelser dockan har.", sager: [], aven: ["stadier"] },
  { grupp: "Rörelser och filmer", ord: "Lyft", betyder: "En rörelse tagen ur Youtubefilmen av en riktig dealer och lagd på dockans egen kropp: Danilos och Frasses givar, väntor och vägarna mellan vilan och skon. En persons docka spelar dem räknade om för sina egna axlar och armar. I Schemat: lyft.", sager: ["lyft ur filmen", "lyftet"], aven: ["lyfta"] },
  { grupp: "Rörelser och filmer", ord: "Brygga", betyder: "En kort rörelse som dockan gör själv, från ankarets läge till där ett lyft stycke börjar, eller därifrån tillbaka: klippet blir aningen längre men det bästa stycket kan lyftas även när dealern började lite vid sidan av ankaret.", sager: [], aven: ["BRYGGA-IN", "BRYGGA-UT"] },
  { grupp: "Rörelser och filmer", ord: "Härmas inte", betyder: "Det dealern gör som dockan inte ska göra efter: sköta skon, en oväntad gest. Dockan väntar då i sitt läge tills dealern börjar nästa stycke som börjar i samma läge.", sager: [], aven: ["SKON (sköta skon)", "ANNAT"] },
  { grupp: "Rörelser och filmer", ord: "Runda", betyder: "En väg genom schemat, skriven med streck: A1 - A2.3 - A3P4C1 - A2.3 - A1. Schemat visar en överst, och Spela i Dockan spelar hela vägen.", sager: [], aven: ["round", "sekvens", "kedja"] },
  { grupp: "Rörelser och filmer", ord: "Till skon", betyder: "Rörelsen från vilan till skon: A1 → A2.3.", sager: [], aven: ["Ingång", "ENTRY", "TILL-SKON", "IDLE>READY"] },
  { grupp: "Rörelser och filmer", ord: "Giv", betyder: "Rörelsen där ett kort går från skon ut till sin plats och handen kommer hem: A2.3 → A3P4C1 → A2.3. Den är delad vid handbytet, i en första halva som är lika till alla platser och en andra halva per plats och kort.", sager: ["utgiven", "dela ut"], aven: ["DEAL", "GIV", "utdelning"] },
  { grupp: "Rörelser och filmer", ord: "Handen hem", betyder: "Rörelsen där handen går tillbaka från kortet på bordet till skon: A3P4C1 → A2.3. I dockans giv ligger den i samma klipp som given.", sager: ["tillbakagången", "retreat", "retur"], aven: ["RETURN", "TILLBAKA", "HEM-TILL-SKON", "P4.C1>READY"] },
  { grupp: "Rörelser och filmer", ord: "Till vilan", betyder: "Rörelsen från skon tillbaka till vilan, utan kort: A2.3 → A1.", sager: [], aven: ["Utgång", "exit", "TILL-VILAN", "READY>IDLE"] },
  { grupp: "Rörelser och filmer", ord: "Vilan", betyder: "Rörelserna A1 → A1 där dealern vilar: ett lugnt grundklipp och korta varianter som slumpas in emellan. Dockornas väntor är lyfta ur filmen.", sager: ["grundloopen", "väntan"], aven: ["IDLE>IDLE", "idle-loopen", "gester", "väntorna"] },
  { grupp: "Rörelser och filmer", ord: "Hålkortets vändning", betyder: "Rörelsen där dealern vänder upp sitt hålkort från vila och handen går tillbaka till vila.", sager: [], aven: ["HALKORT", "VAND-EGET", "DC1 upp", "IDLE>REVEAL(D.C1)"] },
  { grupp: "Rörelser och filmer", ord: "Inspelningen", betyder: "Steg 3 i kedjan: dockan filmas vid livebordet, genom livebordets kamera eller från spelarnas sju platser, i rena färger som går att skära ut. Det görs i Dockans editor, och filmen heter dockfilmen.", sager: [], aven: ["dockfilmen", "dockans film", "Inspelning"] },
  { grupp: "Rörelser och filmer", ord: "Tagning", betyder: "En filmad version av ett klipp från filmmodellen. Ett klipp kan tas om och har då flera tagningar; en av dem spelas.", sager: [], aven: ["take", "jobb", "job", "omtagning"] },
  { grupp: "Rörelser och filmer", ord: "Film", betyder: "En videofil: dockfilmen, en film av en person från filmmodellen, eller Youtubefilmen.", sager: ["klipp", "video"], aven: [] },
  // ── The card ──
  { grupp: "Kortet", ord: "Spårkortet", betyder: "Kortet i dockans film, i färger som filmmodellen och efterarbetet känner igen: gul rygg, och vit framsida i en turkos ram med ett rosa märke i ett hörn. Med röd rygg (röd med vit kant) ritar filmmodellen ryggen själv, också i farten. I den färdiga filmen ligger vårt kort över det.", sager: [], aven: ["Gult och blått kort", "gult kort", "röd rygg", "märke", "BACK", "FRONT"] },
  { grupp: "Kortet", ord: "Vändning", betyder: "Kortet vänds en gång, från rygg till framsida, så att framsidan kommer upp mot spelaren. I dockans giv vänds det i högerhanden efter handbytet, som den riktiga dealern gör.", sager: ["vända kortet"], aven: ["TURN"] },
  { grupp: "Kortet", ord: "Handbyte", betyder: "Bytet mellan händerna i en giv: vänstern drar kortet ur skon och reser det på kant, och högern tar det och lägger det på platsen. Ankaret A2M är ställningen mitt i bytet, och given är delad där.", sager: ["bytet"], aven: ["A2M", "Handbytet", "PASS"] },
  { grupp: "Kortet", ord: "Släpp", betyder: "När handen släpper kortet på platsen; i dockans giv är det högern.", sager: [], aven: ["RELEASE"] },
  { grupp: "Kortet", ord: "Landningsruta", betyder: "Rutan i en film där kortet just har landat. Märkt Landning under filmen i Granska.", sager: [], aven: ["landingFrame", "startsOn"] },
  // ── Dolls and pictures ──
  { grupp: "Dockor och bilder", ord: "Docka", betyder: "En 3D-figur som spelar rörelsen exakt vid livebordet, så att filmmodellen kan göra om dockans film till en film av en person. Dockorna är Danilo och Frasse, efter de två riktiga dealrarna i Youtubefilmen, och en per person som är mätt ur sina bilder (Kenji, Amara): grunddockan, Danilos eller Frasses, med de mått som skiljer. Dockan syns i Dockan och filmas därifrån; i den färdiga filmen syns den inte.", sager: ["avatar", "grunddockan"], aven: ["dealerns docka", "persondocka", "persondockorna"] },
  { grupp: "Dockor och bilder", ord: "Standarddockan", betyder: "Den förra standardens docka: mannen och kvinnan med ritade givar. Den är borta sedan 2026-11-27, och dockorna är nu Danilo, Frasse och persondockorna. Bara namnet lever kvar: mappen med dockornas editor heter fortfarande standarddocka och dockornas modeller börjar med det namnet, och mannens modell står kvar för att jämföra mätningen av en figur.", sager: ["standarddocka", "man/kvinna"], aven: ["mannen", "kvinnan"] },
  { grupp: "Dockor och bilder", ord: "Ankarbild", betyder: "En stillbild av personen i en av dockans ställningar (redo vid skon, handbytet, kortet lagt, hemma igen), gjord av bildmodellen ur dockans ruta. Klippen görs mellan ankarbilderna, så att de går ihop.", sager: [], aven: ["ankarbilder", "stillbild", "anchor.png", "Dealerns bild"] },
  { grupp: "Dockor och bilder", ord: "Referensfilm", betyder: "En film som skickas med till filmmodellen som förlaga för rörelsen, oftast dockfilmen av samma klipp: filmmodellen följer den nära.", sager: [], aven: ["reference"] },
  // ── After the film ──
  { grupp: "Efter filmen", ord: "Utskärningen", betyder: "Steg 7 i kedjan, efterarbetet på en film från filmmodellen, gratis och på minuter: dealern skärs ut ur det gröna och läggs på vårt bord med vår sko, filmen får dockans takt där den behöver, och vårt kort ritas i hans hand efter dockans tal.", sager: ["efterarbetet", "post", "efterlaborering", "efter konstruktion"], aven: [] },
  { grupp: "Efter filmen", ord: "Vårt kort", betyder: "Kortet vi ritar själva i stället för filmmodellens, i rätt storlek och på rätt plats: i utskärningen i dealerns hand och på platsen efter dockans tal, och i spelet ritar spelet sina spelkort över filmens (brytaren Ritade kort i spelets Miljö).", sager: ["vårt eget kort", "överlägg", "overlay"], aven: ["Ritat kort", "Ritade kort", "Renderade kort", "kort=hand"] },
  // ── Verdicts ──
  { grupp: "Omdömen", ord: "Primär ★", betyder: "Tagningen som spelas först i sitt steg. Bara Jakob väljer den.", sager: ["primär tagning"], aven: ["MAIN", "acceptedAs MAIN", "explicitMain"] },
  { grupp: "Omdömen", ord: "Godkänd ✓", betyder: "Godkänd rakt av: tagningen kan spelas.", sager: [], aven: ["ACCEPTED", "rakt godkänd", "userAccepted"] },
  { grupp: "Omdömen", ord: "Variant ◆", betyder: "Godkänd som omväxling: visas bredvid och spelas när en runda väljer den eller inget annat finns.", sager: [], aven: ["VARIANT", "acceptedAs VARIANT"] },
  { grupp: "Omdömen", ord: "Väntar ○", betyder: "Ingen dom än: tagningen är ogranskad eller inte klar.", sager: [], aven: ["PENDING", "ogranskad", "ej dömd"] },
  { grupp: "Omdömen", ord: "Underkänd ✕", betyder: "Tagningen spelas aldrig.", sager: [], aven: ["REJECTED", "avvisad"] },
  { grupp: "Omdömen", ord: "Domaren", betyder: "En granskare som inte har gjort arbetet och dömer det i ditt ställe innan du ser det, med ögat och strängt: Bra, Nja eller Inte bra. I Prov står den som Domaren, och en domare från en annan modell som Extern domare; i Filmer är en domares chip streckat. Din dom ersätter deras.", sager: [], aven: ["granskare", "granskaragenten", "Extern domare", "av granskare"] },
  { grupp: "Omdömen", ord: "Dömd åt dig", betyder: "En dom som huvudagenten och en granskare satt åt Jakob på hans uppdrag: streckad, med åt dig. Väntar inte på honom; hans beslut ersätter den.", sager: [], aven: ["provisional", "review-put", "Dömda åt dig"] },
  // ── The studio and its views ──
  { grupp: "Studion och vyerna", ord: "Studion", betyder: "Allt du ser i webbläsaren, och ingången till hela projektet: menyn till vänster och vyerna, från dockan till spelet. Startas med ett dubbelklick på STARTA studion i projektets mapp.", sager: ["labbet", "nya labbet", "studiosidan", "ingången"], aven: ["Dealer Studio"] },
  { grupp: "Studion och vyerna", ord: "Start", betyder: "Studions första sida: kedjan från bild till film med den verkstad som gör varje steg, en ruta per verkstad, och det som väntar på din dom.", sager: ["startsidan", "navet"], aven: [] },
  { grupp: "Studion och vyerna", ord: "Kedjan", betyder: "Vägen från bild till film, åtta steg på Start: 1 personen (tre bilder, och personens docka efter måtten ur dem), 2 rörelsen (dockan spelar rörelserna lyfta ur Youtubefilmen), 3 inspelningen (dockan filmas vid livebordet), 4 bilderna (rutor ur dockans film görs om till personen, betalt), 5 filmen (en filmmodell gör klippen mellan bilderna med dockans film som förlaga, betalt), 6 granskningen (domaren dömer först, sedan du), 7 utskärningen (personen läggs på vårt bord med vårt kort) och 8 spelet. På Start med verkstaden som gör varje steg.", sager: ["kedjan från bild till film"], aven: [] },
  { grupp: "Studion och vyerna", ord: "Verkstad", betyder: "En del av projektet med en egen uppgift i kedjan, en ruta på startsidan: Avatarer, Dockan, Beställ, Granska, Mått och de andra. Dockan har ett eget program som studion startar när du öppnar den.", sager: ["delprojekt", "underapp"], aven: [] },
  { grupp: "Studion och vyerna", ord: "Dockan", betyder: "Vyn med dockornas editor: Danilo, Frasse och persondockorna spelar sina lyfta rörelser vid livebordet och filmas därifrån. Studion startar editorn när du öppnar vyn.", sager: ["editorn", "dockans editor", "docklabbet"], aven: ["dockans labb"] },
  { grupp: "Studion och vyerna", ord: "Mått", betyder: "Vyn med alla mått på ett ställe, lästa ur koden varje gång: kamerorna, bordet och det som står på det, var korten hamnar, dockorna och rörelserna, bredvid livebordet.", sager: ["måtten"], aven: ["MATT.md"] },
  { grupp: "Studion och vyerna", ord: "Biblioteket", betyder: "Vyn med allt som lagras i projektet, per slag: filmer, figurer, bord, prov, det som väntar på din dom och resten, med storlek, var det används och om det går att göra om gratis. Det du raderar där (och i Prov) är borta från datorn på riktigt; det skyddade kräver ett andra klick.", sager: ["lagringen", "radera på riktigt"], aven: ["kartan över lagringen", "lager.ts"] },
  { grupp: "Studion och vyerna", ord: "Livebordet", betyder: "Bordet i Youtubefilmen: ett riktigt blackjackbord med två riktiga dealrar efter varandra, som här är dockorna Danilo och Frasse. Vårt bord är en kopia av det, med samma mått (kameran, bordet, skon, korten och kortplatserna) och vårt eget utseende; det är vår enda standard. Bilden ur filmen visas bara i Spegla, där vårt bord ligger över det riktiga; allt annat använder bara talen.", sager: ["liveboardet", "Livestandarden", "videons bord", "klonen", "det riktiga bordet"], aven: ["live-bj", "livestandard"] },
  { grupp: "Studion och vyerna", ord: "Youtubefilmen", betyder: "Filmen från Youtube av livebordet, 17 minuter med två dealrar, som kameran, bordet, korten och dealrarnas rörelser är mätta ur. Den ligger bara på Jakobs dator och går aldrig till nätet, ett prov eller Git. Den ses i Spegla.", sager: ["youtubeklippet", "videon", "källan", "filmen av livebordet"], aven: [] },
  { grupp: "Studion och vyerna", ord: "Vår vy", betyder: "I Spegla: det vi själva gör av samma giv genom samma kamera, dockans inspelning eller en film av en person (Kenji), väljs överst.", sager: ["vår"], aven: [] },
  { grupp: "Studion och vyerna", ord: "Spegla", betyder: "Vyn där Youtubefilmens bordsbild och Vår vy av samma giv ligger på varandra i samma bild och samma takt: vår ruta mot filmens sekund för den, som lyftet har den. Draget mellan Youtubefilmen och Vår vy gör den ena genomskinlig, ett drag över bilden delar den med filmen till vänster, och Bredvid lägger dem sida vid sida. Spela, halv och kvarts fart, en ruta i taget med pilarna, och slingan; de tre märkena över tidslinjen är handen vid skon, bytet och kortet som ligger. Rörelserna är de givar som har ett lyft och en inspelning. Bara på Jakobs dator; nås från Start, menyn, Mått och Dockan.", sager: ["spegling", "jämföra med videon", "lägga över filmen"], aven: [] },
  { grupp: "Studion och vyerna", ord: "Ramen", betyder: "Det som omger bilden i varje vy: menyn, rubrikraden, panelerna och knapparna. En snyggare studio är en snyggare ram; bildytan i mitten har sin egen kod.", sager: [], aven: ["skalet", "shell"] },
  { grupp: "Studion och vyerna", ord: "Menyn", betyder: "Spalten till vänster: vyerna i kedjans ordning (Start, Avatarer, Dockan, Karta, Beställ, Granska, Casino, Mått, Spegla, Biblioteket), Beslut och Ordlista, och längst ner om servern svarar.", sager: [], aven: ["rail", "sidomenyn"] },
  { grupp: "Studion och vyerna", ord: "Vy", betyder: "En sida i menyn: Start, Avatarer, Dockan, Karta, Beställ, Granska, Casino, Mått, Spegla, Biblioteket och Beslut. Ljud nås från startsidan.", sager: [], aven: ["view"] },
  { grupp: "Studion och vyerna", ord: "Bildytan", betyder: "Det i mitten av en vy, det sidan leder med: en film, dockan, schemat eller spelet.", sager: [], aven: ["stage"] },
  { grupp: "Studion och vyerna", ord: "Servern", betyder: "Programmet i bakgrunden som STARTA studion startar: det lämnar ut studion, startar dockans editor när dess vy öppnas, sparar det du ändrar och läser banken. Pricken längst ner i menyn visar om den svarar.", sager: [], aven: ["labbservern", "preview"] },
  { grupp: "Studion och vyerna", ord: "Vid sidan", betyder: "Det som ligger bredvid arbetet, längst ner på startsidan: Ljud (marker, kort, rum och musik, en egen sida med eget utseende).", sager: ["sidorna bredvid"], aven: ["Ljud"] },
  { grupp: "Studion och vyerna", ord: "Avatarer", betyder: "Vyn med vägarna från bilder av en person till en docka på vårt skelett, steg för steg: Version 1 (den som körs i dag) skild från de prövade och tänkta, vad varje steg kostar och vad som finns för varje person; delarna med sina alternativ; och föremålen vid bordet (bordet, skon, stolen, korten, markerlådan) i 3D. Inget där startar en körning.", sager: ["avatarerna", "guiden", "wizard"], aven: ["avatar-auto-pipeline", "vägarna", "Modeller (3D-modellerna, förut en egen sida)"] },
  { grupp: "Studion och vyerna", ord: "Föremål och material", betyder: "Avatarers del med det som står vid bordet: bordet, skon, stolen, korten och markerlådan, och de färdiga modellerna att vrida i 3D. De hör till scenen, inte till dockan.", sager: ["föremålen", "stolen"], aven: ["props"] },
  { grupp: "Studion och vyerna", ord: "3D-sidan", betyder: "Utvecklarens sida för spelets 3D-scen med alla reglage (rum, ljus, kort, kamera …). Den har ingen knapp i menyn.", sager: [], aven: ["scene3d.html", "3D-labbet"] },
  { grupp: "Studion och vyerna", ord: "Kopian", betyder: "Den låsta studion på nätet: samma vyer och spelet, men inget går att ändra, och det som behöver Jakobs dator (Avatarer, Dockan, Beställ, Mått, Spegla, Biblioteket och Beslut) finns inte där.", sager: ["sajten"], aven: ["snapshot", "den låsta kopian", "Vercel"] },
  { grupp: "Studion och vyerna", ord: "Boten", betyder: "Den som svarar i Fråga på kopian: svarar om dealerprojektet med källa, och kan göra ett svar till ett önskemål till Jakob.", sager: [], aven: ["Fråga"] },
  { grupp: "Studion och vyerna", ord: "Önskemål", betyder: "På kopian: önskemål, frågor och felrapporter till Jakob, med status och hans svar.", sager: [], aven: [] },
  { grupp: "Studion och vyerna", ord: "Standarden", betyder: "De fasta måtten som allt utgår från, och det finns bara en: livebordets, bordet i Youtubefilmen, som vårt bord är en kopia av. Kameran, bordet, skon, kortet och kortplatserna har filmens mått; dockan, inspelningen, spelet och varje beställd film följer dem. Utseendet läggs ovanpå och ändrar aldrig måtten. Den förra standarden (det förra bordet och kameran, mannen och kvinnan och den äldre dealern Paow) är borta sedan 2026-11-27.", sager: ["grunden", "fasta mått", "standard", "valet av bord", "vilket bord"], aven: ["förra standarden"] },
  { grupp: "Studion och vyerna", ord: "Spelvyn", betyder: "Hur spelet ramar in bilden för spelaren: en inramning för dator och en för mobil (zoom och vridning), lite mer utzoomad än livebordets kamera så att hela bordet får plats. Den gäller alla utseenden utom ett förval som har en egen.", sager: ["spelvy", "det spelaren ser"], aven: [] },
  { grupp: "Studion och vyerna", ord: "Utseende", betyder: "Det som läggs ovanpå standarden i spelet: rum, bord och duk, hur korten ritas, markerlåda och sko som modell, och linsen. Ett sparat utseende är ett förval. Det ändrar aldrig måtten.", sager: [], aven: ["look"] },
  { grupp: "Studion och vyerna", ord: "Bred lins", betyder: "Ett val i utseendet: en äldre, vidare kamera där bordet, markerlådan och insatsringarna blir större nära dealern. Standard är filmens egen lins. Casino visar vilken lins som gäller; dockan och filmerna följer alltid Standard.", sager: ["lins"], aven: ["geometri=kontrakt"] },
  { grupp: "Studion och vyerna", ord: "Förval", betyder: "En sparad look för spelets 3D-scen: Basgrund, Levande, Rumsstudien och de som är sparade. Casino börjar i förvalet Casino, och ett annat väljs där.", sager: ["profilval"], aven: ["preset", "Basgrund", "Levande", "Rumsstudien", "forval="] },
  { grupp: "Studion och vyerna", ord: "3D", betyder: "Spelets scen i 3D: bordet i ett rum med ljus och kamera, där filmen spelas. Casino och 3D-sidan visar den.", sager: [], aven: ["scene3d", "3D-scenen"] },
  { grupp: "Studion och vyerna", ord: "Filmverkstaden", betyder: "Den förra vyn där filmerna gjordes, med delarna Inspelning, Kön, Scen, Råfilm och Efterarbete. Den är borta sedan 2026-11-27, liksom Material, Jämför och Protokoll: dockan filmas nu i Dockan, beställningarna ligger i Beställ och förvalen spelas i Casino.", sager: ["Bordet", "Scen & bord"], aven: ["Scen", "Råfilm", "Material", "Jämför", "Protokoll"] },
  { grupp: "Studion och vyerna", ord: "Kön", betyder: "Beställs lista med beställningarnas utkast och det som är skickat. Ett utkast godkänns där och läggs hos Runway. Finns inte i kopian.", sager: [], aven: [] },
  { grupp: "Studion och vyerna", ord: "Karta", betyder: "Vyn med Schemat, dockornas rörelseschema.", sager: [], aven: ["nodkartan", "nodträdet"] },
  { grupp: "Studion och vyerna", ord: "Schemat", betyder: "Karta, Schemat: dockans rörelser på en skärm. Överst en runda som en väg, där det som saknas är rött och Spela i Dockan spelar hela rundan; sedan kortplatserna, där en grön ruta har en giv (lyft, klipp eller film); sist hela schemat: ankarena är rutorna i den ordning en runda går och rörelserna pilarna mellan dem. Det dockan har är helt, med en hel prick när rörelsen finns och en halv när den finns delvis; det den saknar syns först med Visa det som saknas (streckat; prickat i mässing är ett förslag). Raden över bilden är stadierna, som lyfter fram sina rörelser. Ett klick på en pil öppnar rörelsen, med knappar till Dockan. I en telefon är schemat en lista, ankare för ankare.", sager: ["rörelseschemat", "översikten"], aven: ["rörelsekatalogen", "schema"] },
  { grupp: "Studion och vyerna", ord: "Hel och halv prick", betyder: "I Schemat, vid en rörelse dockan har: en hel grön prick betyder att rörelsen finns, en halv att den bara finns delvis (en del av den är gjord, eller bara som stillhet i rundan). En rörelse utan prick, streckad, saknas för dockan; prickad i mässing är ett förslag som inte är prövat.", sager: ["grön prick", "halv prick"], aven: [] },
  { grupp: "Studion och vyerna", ord: "Granska", betyder: "Vyn där du dömer, i två delar: Filmer, tagningarna en i taget och stort (under Alla också de som är dömda åt dig), och Prov, provmapparna ur arbetet.", sager: [], aven: [] },
  { grupp: "Studion och vyerna", ord: "Prov", betyder: "Granskas del Prov: provmapparna ur arbetet, nyast först, med filmer och bilder som väntar på din dom. Domarens dom står på provet, märkt som inte din. Bra, Inte bra och Kommentera under film, bild och prov är din åsikt; huvudagenten svarar under.", sager: ["inte granskad"], aven: ["proof", "kontaktark", "provmapp"] },
  { grupp: "Studion och vyerna", ord: "Placering", betyder: "Var korten ligger på bordet: livebordets kortplatser, mätta ur Youtubefilmen, som dockan och Mått läser. Spelet läser ännu den förra kortplanen, som är din och inte ändras i studion.", sager: [], aven: ["placeringsplanen", "kortplanen"] },
  { grupp: "Studion och vyerna", ord: "Beställ", betyder: "Vyn med beställningarna hos Runway: kön, och för en beställning det som skickas och dess godkännande. Finns inte i kopian.", sager: [], aven: [] },
  { grupp: "Studion och vyerna", ord: "Beställning", betyder: "En order på en film eller bild: bilder, text, modell och antal tagningar. När den är godkänd ändras den aldrig. Agenterna godkänner själva upp till 500 krediter per beställning och högst 2 500 per dygn; större frågar dig. Det här skickas säger bara till när något hindrar ett godkännande.", sager: ["order"], aven: ["utkast", "fullmakten"] },
  { grupp: "Studion och vyerna", ord: "Casino", betyder: "Vyn där spelet spelas: blackjack med spelmotorn, marker och reglage, i valt förval.", sager: ["spelet", "blackjacken"], aven: ["game.html"] },
  { grupp: "Studion och vyerna", ord: "Beslut", betyder: "Det som väntar på Jakobs svar: ett kort per sak med en bild; han svarar med en knapp och en anteckning. Finns inte i kopian.", sager: [], aven: ["decisions.json"] },
];

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * The words a search finds, best first: the entry one of whose names is exactly what was typed ("steg" is Rörelse, not
 * every word that says steg), then the words holding the search as typed, with its å, ä and ö, and last those found only
 * with the marks left out ("platt" finds "plätt"; "kön" finds Kön, then the other words that say Kön, and only then Skon
 * and Utskärningen's "konstruktion"). Within each: the word itself, then one of Jakob's own other words, then a name in
 * code and documents, then the meaning. Case does not count; an empty search gives all.
 */
export function findWords(query: string, words: readonly Word[] = WORDS): Word[] {
  const typed = query.trim().toLowerCase();
  const q = fold(typed);
  if (!q) return [...words];
  const has = (names: readonly string[]) => names.some((a) => fold(a).includes(q));
  const exact = (w: Word) => [w.ord, ...w.sager, ...w.aven].some((a) => fold(a) === q);
  const tier = (w: Word) => (exact(w) ? 0 : fold(w.ord).includes(q) ? 1 : has(w.sager) ? 2 : has(w.aven) ? 3 : fold(w.betyder).includes(q) ? 4 : 5);
  const asTyped = (w: Word) => [w.ord, ...w.sager, ...w.aven, w.betyder].some((a) => a.toLowerCase().includes(typed));
  const score = (w: Word) => {
    const t = tier(w);
    return t === 0 ? 0 : (asTyped(w) ? 0 : 5) + t;
  };
  return words.filter((w) => tier(w) < 5).sort((a, b) => score(a) - score(b));
}
