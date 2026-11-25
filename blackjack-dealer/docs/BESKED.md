# Jakobs besked som gäller

Hans gällande beslut per ämne. Slå upp ett avsnitt när ett beslut är i fråga, läs inte hela. En punkt är ett besked:
rubrik, datum och vad som gäller, på högst två rader; hans egna ord bara där ordalydelsen styr, med hans stavning. Ett
nytt besked skrivs in samma dag under sitt ämne; ett ändrat skrivs om, och en utförd beställning stryks (Git har det
gamla). Det som väntar på hans svar står som kort i Beslut (`data/decisions.json`), inte här.

## Arbetet och dokumenten

- **Målet** (2026-11-13): "nu ska vi skapa en bättre version av blackjackspelet", i studion.
- **En väg för varje sak, färre val** (2026-11-24): "det är för mycket val, för komplicerat i onödan"; "klara
  självklara vägar för allt", också när det "tränger undan gamla klipp eller vägar".
- **Frikopplat från Scoutgaming** (2026-11-23): repot står på egna ben och behöver inget därifrån; inget ändras där.
- **Ett vanligt repo, mindre och enklare** (2026-11-25): generiska instruktioner, "allt mindre och enklare"; det går på
  båda hans datorer, utan datorns sökvägar eller chattnamn, på `main`.
- **Alla verktyg** (2026-11-25): reglerna gäller i Claude Code, Codex, Cursor, andra IDE:er och API-anrop. De står i
  `AGENTS.md` och vanliga filer; ett verktygs egna inställningar är bara extra skydd.
- **Slasken** (2026-11-25): "mer tillfölliga filer raderas som standard": tillfälligt arbete i `../slask/blackjack-dealer`, som
  rensas efter sju dygn (AGENTS, "Slasken och `.runtime/`").
- **Rensa bort regler och låsningar som blockerar** (2026-11-23): en regel står bara om den är hans daterade ord eller
  skyddar honom; efter ett fel rättas orsaken, utan nytt förbud, test eller spärr (AGENTS, "Regler och spärrar").
- **Dokumenten ska vara smidiga** (2026-11-23, 2026-11-25): korta, en sak på ett ställe, och inte lästa i sin helhet
  av varje ny agent; det en commit eller ett register säger står inte i dem.
- **Städa löpande och hårt** (2026-11-17, 2026-11-19, 2026-11-25): "det mesta som inte används ska raderas", "Var inte
  konservativ"; det en ändring gör överflödigt tas bort i samma ändring, efter kontroll av användningen.
- **Tester: en kärna** (2026-11-21): de som skyddar publiceringen, spelets regler, hans domar och val och
  beställningarna. Den lokala sviten körs en gång per push.
- **Inget körs hos GitHub** (2026-11-18): kontrollen är pre-push och `push-clean` på datorn.
- **Det som produceras raderas** (2026-11-25): "alt skit som produceras ska som regel raderas", utom det han ska granska;
  en film han inte godkänner raderas om ingen agent har uppgiften att arbeta om den (papperskorgen, 14 dygn).
- **Aldrig gallrat:** Primär, Godkänd, Variant, ankare och det spelet spelar; varianterna är han "rädd för att
  förlora" (2026-11-21).
- **Den enda vägen** (2026-11-13): en ny dealer och varje film görs längs `tools/dealer-line.md`.
- **Fria händer med ansvar** (2026-11-14): "Du har fria privilegier och kör på. men se till att dokumentera coh städa".
- **Ordlistan följer hans ord** (2026-11-17), och sidornas ord rättas efter den.
- **Huvudagenten orkestrerar** (2026-11-13, 2026-11-23): delar ut arbete till underagenter och andra chattar,
  granskar, slår ihop, committar och svarar honom. Han talar helst med den, men öppnar andra chattar när han vill.
- **3D-banan** (2026-11-17): arbetar avskilt i `dealer3d/` och lämnar sitt arbete till huvudagenten.
- **Spara tokens** (2026-11-18): en underagent bara för det han har beställt, mekaniskt arbete till en mindre modell,
  en rapport till huvudagenten per färdig sak.
- **Överlämningen** (2026-11-18): `HANDOFF.md` är en startsida med tak; motsägelser rättas.
- **Svaren till honom:** korta, i punktform, med procent och poäng; en stillbild bredvid varje film han ska döma.
- **Den riktiga dealerns film** (2026-11-18): den mäts bara och går aldrig in i Git, `assets/` eller ett prov.

## Labbet och studion

- **Labbet först** (2026-11-11): prov och effekter hör hemma i labbet; spelet får bara det han har godkänt där.
- **Ett labb** (2026-11-17, 2026-11-23): studion på `http://127.0.0.1:4319/studio/` är den lokala sajten; han visas
  sidor där, inte lösa provsidor.
- **Bordet (Scen & bord) är den enda labbvyn** (2026-11-17, 2026-11-19): plan, scen och beställning i en vy, allt
  ändras i högerspalten; "Fortsätt standarlisera och förenkla allt i denna riktning."
- **En beställning ska gå att kontrollera** (2026-11-17, 2026-11-21): varje steg visar sin slutbild, och Beställ visar
  exakt texten och referenserna som går till Runway.
- **Färre val när en film beställs** (2026-11-18): från vilket ankare och till vilken plats; resten är stegets recept
  (`data/order-methods.json`), och texten säger varje sak en gång.
- **Paows träd fylls med kommandon** (2026-11-21): en giv per kort och spelare tills trädet är fullt.
- **Kort i Beslut bara för provmaterial** (2026-11-21): ett kort bär en film eller bild han ska döma; teknik,
  publicering och arbetssätt frågas i chatten: "Sånt här ska den inte ha att göra med alls!"
- **Överlägg i handen** (2026-11-19, 2026-11-24): av i grunden; hans val i Scen följer in i Casinot. Korten på
  bordet behålls.
- **Efterarbetet för sig, efter filmerna** (2026-11-17): "filmerna är det vi först måste få rätt"; kortens och
  markernas utseende ändras bara i Bordets läge Efterarbete.
- **Grafiken på kortet** (2026-11-23): det som läggs på kortets rygg och framsida på kortmodellens spår; han vill se den
  mot alla filmer (`/kortlandning.html`) och "ett bra system med grafiken".
- **Styvt kort i handen, utan vit kant** (2026-11-23): Scen ritar kortet med en storlek från handen till bordet; Casinot
  bara när hans val i Scen är på.
- **Kortets efterarbete görs i förväg per film** (2026-11-17): spelet målar inte kortet medan filmen spelas; det ritade
  kortet är "något procent större än kortet".
- **Karta med Primära** (2026-11-17): nodträdet följs, med Primär och högst tre sekundära filmer per steg.
- **Rundan byggs av noderna** (2026-11-17): egna vägar ur de noder som finns, inga förval.
- **Menyn** (2026-11-17): det som hör ihop är en knapp; Casino från labbet är samma Casino.
- **Val för hand i Material** (2026-11-18): han gör vilken bild som helst gällande, lägger den åt sidan, arkiverar och
  tar tillbaka; klipp byggda på en äldre bild mörkas. Betald media raderas aldrig från en knapp.
- **Hans kommentarer i Prov** (2026-11-18) läses med `node tools/proof-notes.ts` före varje svar till honom.
- **Inget dubbelt för mobilen, ingen Pamela av sig själv** (2026-11-18): en vy; en mobilvy härleds ur samma kort och
  lins. Paow står först; en pausad dealer visas bara när en adress nämner den.

## Domar, beställningar och pengar

- **Hans domar är hans** (2026-11-13): domarna i Granska och Material och valet av Primär sätts bara av honom; en
  tagning han har dömt rörs aldrig, och hans beslut ersätter en dom gjord åt honom.
- **Domar åt honom, och ingen kö** (2026-11-13): "Med andra ord vill jag inte se en sån här lista när jag är tillbaka!"
  Huvudagenten och en oberoende granskare dömer i hans ställe (`node tools/review-put.ts`), märkt som inte hans.
- **Betald generering utan hans klick** (2026-11-13): huvudagenten godkänner på hans uppdrag inom
  `data/order-policy.json`, genom Beställ.
- **Stående fullmakt** (2026-11-25): "en rimlig fullmakt för budget och beställningar som inte ska vara hårt satt mer än
  att 'stora' beställningar ska valideras med mig". Upp till 500 krediter per beställning, 2 500 per dygn (`data/order-policy.json`).
- **Bara sätt som håller, och en pilot först** (2026-11-24): "Det ska vara klagklar vilka sätt vi kan använda oss av för
  att producera filmer!" Sätten står i `data/order-methods.json`; ett oprövat sätt får en pilot.
- **Två tagningar per klipp** (2026-11-12, 2026-11-13): en ändring och en tagning per metodprov; två per klipp när
  metoden är vald, en tredje bara om båda faller. Varje omgång granskas oberoende i full upplösning före nästa.
- **Kvalitet före kvantitet** (2026-11-18): en granskad pilot före en serie, och kostnaden sägs efteråt.
- **API-nyckeln** (2026-11-20): beställningar får gå genom nyckeln i `.env.local` när MCP-inloggningen saknas.
- **Taket per beställning är 2 000** (2026-11-17), mot misstag (`data/order-policy.json`); påfyllning gör bara han.
- **Klicket är kön** (2026-11-13): en godkänd order läggs utan att han säger till (`tools/order-clerk.md`).
- **Underlag till nya filmer** (2026-11-12): bara tagningar han har godkänt rakt av, i bankens format. Astrids och
  Kevins stående material används inte.
- **Betalt utanför Beställ:** Meshy bara på hans eget ja; varje betalt anrop utanför Beställ rapporteras till
  huvudagenten med belopp.

## Dealern och ankarna

- **Paow är dealern; Pamela är arkiverad** (2026-11-23): "ingenting ska behöva ha dennes referenser. Vi har en docka som
  används". Hon, V6 och originalen ligger i arkivet utanför repot; hennes filmer på sajten: fråga först.
- **Namnet är Paow** (2026-11-18); hennes utseende är "de yngre och nättare bilderna" (2026-11-12).
- **Ingångsbild och keystone** (2026-11-12): en ny dealer börjar från ingångsbilden, "vilken bild som helst"; av den
  görs keystone, förlagan i hög upplösning, som aldrig spelas.
- **Ett ankare heter alltid A och sitt nummer** (2026-11-21): A1, A2.1, A2.2, A2.3 och A3P2C1 ("Ankare 3, Player 2,
  card 1"), aldrig en bokstav efteråt; register-id:n är id. En kameravinkel skrivs S2-A2.2 (sätet ankaret ses ifrån).
- **Vad ankarna är** (2026-11-12, 2026-11-21): A1 vila, A2.1 nyp i skons fönster, A2.2 enhandsgiv, A2.3 båda händerna
  vid skon före draget, A3 där ett kort har landat, ett per spelare och kort.
- **A2.3 som gäller** (2026-11-23): en riktig filmruta med blicken ned mot kortet (`paow-ankare-2-3-d`); A1 får gå
  direkt till A2.3 (ingången `paow-ingang-2-3-03-01`: "Jättebra!").
- **Släpet med handbyte ges från A2.3** (2026-11-21): vänster hand drar ut kortet och höger lägger det.
- **A2.2 är arkiverad** (2026-11-23): "Ser inte att den används"; Casinots giv till plats 6 börjar där tills den kan
  passas in i de andra träden.
- **Den tatuerade uppsättningen är förstahandsvalet** (2026-11-17, 2026-11-24): "vi ska köra enbart med hennes nya
  händer och de tatuerade klippen"; Casinots filmer prövas in där det går.
- **Tatuerads A2.1 och vilor** (2026-11-23, Beslut): ja till `paow-nyp-tatuerad` (givarna därifrån görs genom dockan)
  och till Casinots vilor med de tatuerade händerna ("Myckert bra").
- **Två träd, bundna i Karta** (2026-11-24): från A2.3 skjuter hon kortet, från A2.1 nyper hon; en komposition ska
  kunna "vikta olika utgivningar" mellan sätten.
- **Träd läggs ihop till en komposition** (2026-11-23): träd och varianter kombineras med andelar; en retur går hem
  till sitt eget A2, med skarv eller kort brygga. Alla vyer ska hänga ihop med träden.
- **Träd med olika händer får sättas samman igen** (2026-11-24): "lossa detta förbud … Återkom med suspekta förbud..";
  Karta säger "olika händer" som upplysning, och en sådan spelas bara när han väljer den.
- **Flera namngivna träd per dealer** (2026-11-21): omkring tre, och löst material för sig som är lätt att radera.
- **Karta får kameran som en dimension** (2026-11-23): börjar på kamera 4, och ett reglage, kanske musens hjul, byter
  till kamera 1–7; en film från en annan stol sparas i sitt träd där.
- **Kartas meny, nivåer och bryggor** (2026-11-23): raden med träd och kompositioner är "ful" och görs om; träden ses
  som nivåer man rullar mellan, och bryggorna går att klicka fram.
- **En film från en annan stol** (2026-11-18, 2026-11-23): kameran har samma höjd och lutning som den i mitten, bara
  flyttad; kortet byter sida efter hur det ses från stolen, "inte tidpunkt".
- **Dealerns första kort ligger stängt** (2026-11-24): D.C1 stängt och D.C2 öppet, som hans plan.
- **Vilorna in, och korta varianter** (2026-11-23, 2026-11-24): vilorna förs in om de inte är dubbletter; korta
  varianter klipps ur en film där hon återvänder till A1 ("gillar dessa korta klipp!").
- **Fart** (2026-11-23): klipp ska kunna spelas i 1,5× eller 2×, sparat i en komposition och som klippets standard.
- **Registren i en databas** (2026-11-23): "Alla .json i tex 'motion' måste in" i SQLite, "självsanerande": tas en
  film bort försvinner dess poster. Filmregistret är flyttat (`node tools/register.ts`).
- **Hans foto som förlaga** (2026-11-17): får skickas till bildmodellen; ligger i `private/referenser/` och läggs
  aldrig i Git, i ett prov eller på sajten.
- **Kortets tre mått** (2026-11-12): riktning, lutning och perspektiv, ställbara "men också ha en normal" (0°, 0°, 87 %).
- **Hela rundan** (2026-11-12): Paow ska kunna spela en hel runda; nödlösningarna ger vika när banken har egna filmer.
- **Förvalen han sade ja till** (2026-11-13): ljuset utjämnat mellan filmer, liv i överkroppen, kopparna i relingen.
- **Mer rörelse när hon delar ut** (2026-11-13): "jag vill i allmänhet att paow rör sin kropp och huvud och SIN högerarm
  aningen mer när HENNES vänsterarm dealar."
- **Returen efter en tvåhandsgiv** (2026-11-13) görs med den hand som är ute (`motion.releaseHand`).
- **Farten** (2026-11-13): filmerna spelas i filmad fart (`filmTempo` 1); en vilogest spelas klart.
- **Vilans slinga** (2026-11-14): godkända vilofilmer går in i slingan av sig själva.
- **Ett tredje och fjärde dealerkort** (2026-11-13) är önskat men inte byggt.
- **Önskemål för senare** (2026-11-11, 2026-11-13; inget beställt): mer av höger arm, kaffe ur en mugg som finns i
  bilden, en animation på bordet, marker som dealern tar och betalar, insamling av korten, en andra spelarfigur.

## Dockan

- **Dockan per dealer** (2026-11-21, 2026-11-23): dealerns mått, naturlig och inte "kuvad"; den valda dealerns docka
  ligger under korten i Kortplan. `ultimate-reality` är bara läsreferens.
- **Dockan rättas mot hennes filmer innan den styr en beställning** (2026-11-23): axlar, fingrar och armbåge som i de
  bra filmerna; SAM-dockan byggs på de mätningarna ("Ja bygg den riktiga SAM-dockan").
- **Dockans vändning längre ut: bättre, men inte än** (2026-11-23): vänster arm mot sko och kort, djupet och avståndet
  till skon stämmer inte. Givarna från A2.3 beställs ändå med dockans film.
- **En sparad rörelse per kort och ankare** (2026-11-23): dockan har en sparad giv per spelare och per ingång (A2.1,
  A2.2, A2.3), med återgången.
- **Handens vinkel: 17° när kortet tas, −30° när det är vänt** (2026-11-23), främst P4.
- **Handens landning ska gå att välja** (2026-11-23): långfingret pekar alltid ned kortet; dockan har förval eller egna
  landningar, så att slutposen inte är samma för alla platser.
- **Händerna fria i givarna** (2026-11-23): överlämningen vid skon är "ihopkrånglat med dealerns överdrivna
  vridningar"; händerna ska frigöras mer.
- **Docklabbet** (2026-11-23): "Jag gillar verkligen docklabbet!" Naturliga ställningar som standard, vridning och
  axlar som reglage, allt "kompatibelt med material skapat".
- **Ett ställe för dockan** (2026-11-23): Kortplan och Docka "känns som typ samma sak"; "EN väg och ETT ställe man
  använder dockan".
- **Dockan från A2.1 görs om, enklare, samma kort** (2026-11-24): de avlästa filmerna var "svindåliga"; inga "dubbla
  BUD MED DOCKORNA OCH KORTBANER": kortbanan kommer ur dockan, och planens val följer det anatomiskt möjliga.
- **Dockan härmar de bästa A2.1-klippen** (2026-11-23): nya filmer ur det gamla materialet genom dockan; han vill själv
  "ta ut de bästa klippen".
- **Dockan framåt** (2026-11-23): en giv tar 2 s som förval, valbart i Docka. För framtiden: A2.2 ur fotot, och dockan
  tar över Siluetten i Scen & bord.
- **3D-labbet har samma standard som allt övrigt** (2026-11-23): "det ska vara och ha samam standard som allt övrigt".
- **Nej till Meshy-modellen av Paow** (2026-11-18); ja till att avlästa leder styr en klädd figur (2026-11-20).

## Filmerna och given

- **Hela trädet från A2.3** (2026-11-23): en giv per plats i trädet Tatuerad; kort 2–7 och dealerns kort återbrukar
  filmer, också mellan träd.
- **Plats 6 och 7** (2026-11-23): samma tvåhandsgiv som plats 1–5 från A2.3: vänster arm tar ut kortet, höger tar emot
  och vänder upp.
- **Naturlig rörelse går före dockans** (2026-11-23): dockans film är en grov ledning ("var inte extremt nitsk med
  dockans rörelse"); vändningen och hennes rörelser får filmen skapa fritt.
- **Kortet vänds av hennes händer** (2026-11-17, 2026-11-23): "ett kort måste vändas av händer och fingrar och ska inte
  kunna vändas av tom luft"; dockan ska ha "mycket bra fog" för hur kortet vänds.
- **Kortplanen i Bordet gäller** (2026-11-23): har han ställt in korten där "så är det ju det som gäller såklart";
  receptet för en A3-bild är ett och samma för varje dealer och plats.
- **Handleden vrider kortet** (2026-11-17): "Oavsett om hon nyper eller släpar ut kortet … måste hon vrida över
  handleden." Den som förklarar en fallen giv läser först vad ordern skickade.
- **Vändningen: sättet är fritt, den ska bli bra** (2026-11-17, 2026-11-18): handleden (`FREE`, förval), nyckeln kring
  långsidan (`LONG_EDGE`) eller ände över ände; rätt sida upp mot spelaren, gult till blått. En vändning är hel.
- **Kortet sitter i fingrarna genom vändningen** (2026-11-18, 2026-11-23): inte "utanpå fingrarna" och inte "för långt
  från fingrarna", också på dockan.
- **Handen vänds en gång, i luften, aldrig i slutet** (2026-11-18); ordningen per ankare: `tools/film-prompting.md` §5.
- **Ingen vit kant på kortet** (2026-11-17, 2026-11-23): "Det sk inte finnas." Kanten tas bort i efterarbetet, synkat så
  att "ingenting vi har idag förstörs"; i en A3-bild fylls den med det blå.
- **En giv är tre sekunder** (2026-11-18, 2026-11-21), en sammanhängande rörelse utan stopp med kortet rest; filmen
  slutar när rörelsen är klar. Bordets gröna är densamma genom filmen.
- **Snabbare: bara händerna med kortet** (2026-11-23): "det är hennes rörelser med kortet som ska gå snabbare"; andra
  armen och huvudet behöver inte skyndas. Som standard.
- **Revansch på nästan bra klipp** (2026-11-23, 2026-11-24): "göra om den, men bara litegranna för att definitivt göra
  den bra". Givens tid: cirka 1,3 s ut och 0,8 s tillbaka.
- **Nya filmer: snabbare och bättre, inte kopior** (2026-11-23): de ska "gå snabbare är förgångaran" och inte vara
  "helt likadana".
- **Giv och återgång i samma film** (2026-11-23): återgången klipps ut och sparas i banken automatiskt.
- **Sista given går direkt till vila** (2026-11-23): från det lagda kortet "återgå till A1-vila direkt" och "inte
  passera A2.'n' över huvud taget".
- **Högerhanden vid nedsläppet** (2026-11-23): inte "så vriden vid nedsläpp"; givarna till plats 1–5, kort 1, med
  återgång fick "Ja, alla håller" i Beslut.
- **Fria givar är varianter med namn** (2026-11-23): "kan man inte frångå bara lite?"; varianter på lek (kortet kastat,
  rättat leende) byggs in när de godkänns. Andra handen ska arbeta.
- **Flera kameravinklar ur samma film** (2026-11-18): en sidovinkel görs ur bankens film i Runways videoredigerare (35 %
  och 70 % åt sidan, också speglat), inte av en ny tagning; först ett labbprov där två vinklar binds ihop.
- **Givens sex steg från A2.1** (2026-11-13): Nyp, Dra, För fram, Vrid, Vänd upp, Lägg; i A2.1 håller tumme och
  pekfinger i det gula kortet, inte i skons kant.
- **Kortet ur skon** (2026-11-12): "Ett kort ska tas som det ser ut i skon … Sedan ska handen vrida kortet."
- **Fria händer med beställningstexterna** (2026-11-17): huvudagenten skriver om dem efter vad proven visar.
- **Landningsbilderna är arkiverade** (2026-11-24): giv och återgång i en film behöver ingen A3-bild; plats 6 ges utan
  sista bild.
- **V6 är arkiverad** (2026-11-20) i arkivet utanför repot; ingen referens "att dö för".
- **Trailern är pausad** (2026-11-17): inget beställs och inget byts i trailern tills han säger till.

## Kortet

- **Gul rygg, blå framsida** (2026-11-17, 2026-11-20): gult är ryggen (stängt), blått framsidan (öppet), utan vit kant.
- **Märket på blå sidan** (2026-11-20): rosa kryss och röd cirkel, så att filmen inte kan "fuska med vilken sida av
  kortet som syns".
- **Ett kort per sida, överallt** (2026-11-24): gula sidan bär fylld röd cirkel i mitten och rosa kryss nära
  kortänden, "EN OCH SAMMA TYP AV KORT för respektive sida" i Kortplan, på dockan och i beställningen.
- **Rent tills efterarbetet** (2026-11-18): "Du kan behålla SG-ryggen. men so msagt vill jag allt ska vara rent tills
  efterarbete gjörs"; valören ritas när rundan spelas.
- **En linje för korten** (2026-11-13): huvudagenten bestämmer linjen och visar resultatet: ritade kort hela vägen, en
  storlek, en brytare i spelet. Kortmattan: "ja som val i labbet, nej för spelet".
- **Ett kortformat:** kortet på plats 4 är standard och allt annat anpassar sig ("Storleken är inte problemet, utan att
  det finns olika format").
- **Verkligt kort, storlek 1,00** (2026-11-17): "Gör allt enkelt bara. kör vi 1.0"; storleken ändras bara i Efterarbete.
- **Perspektiv ändrar bara kortens form** (2026-11-18): ett värde för alla kort (hans plans 87 % om inget är sparat).
- **Planen är hans** (2026-11-11, 2026-11-12): `placements/default.json` är incheckad på hans ja; bara Bordet skriver
  filen, när han trycker Spara.
- **B-linsen är standard för nya filmer** (2026-11-19); före en massbeställning krävs en godkänd helgiv med rätt hand
  och tempo.
- **Perspektivet som sparat val** (2026-11-19, 2026-11-21): kamerans vinkel och avstånd sparas för Casino med Använd i
  Casino, Bred lins inräknad.
- **Andra kortet** (2026-11-11, 2026-11-19): tills en egen giv finns spelar platsens senare kort första kortets film
  med det ritade kortet flyttat.

## Läpparna och talet

- **Läpparna i realtid är huvudmålet** (2026-11-17), på hans RunPod: "Det är det som är huvudmålet." Replikfilmerna
  kommer i andra hand.
- **Den neutrala munnen är standard för alla Paows repliker** (2026-11-21); avviker formatet från det köraren väntar
  sig ska det stå i klartext (`docs/TAL.md`).
- **Egen körare** (2026-11-17): Scouts renderer har ett avsiktligt lås som vi inte går förbi; en egen körare byggs ur
  öppen källkod. En provkväll på hans pod: högst 5 USD, med besked till honom före start.
- **Munnen** (2026-11-17): storlek F, bara läpparna läggs in, mindre öppning och färre tänder i vanligt tal; provet
  `paow-realtid-mun-6` har hans ja.
- **Inte löst i hans ögon:** mungiporna ("lite som typ clown-mungipor") och överläppen, som "borde bli något större".
- **Hans ja före ett byte av läppar** (2026-11-17): först en jämförelse i spelets storlek och i rörelse; granskarnas
  poäng räcker inte. Hans godkända `paow-tal-blackjack-sv-04` rörs inte.
- **Sättet dokumenteras per dealer** (2026-11-17): vyn Lipsync och `data/lipsync.json`.
- **Munnen ur hennes egen film** (2026-11-17, obyggd): leendefilmen `paow-vila-03-01` som underlag.
- **Talfilmerna in i nodträdet** (2026-11-23, 2026-11-24), gjorda på projektets eget sätt (köraren, med hennes munmått),
  aldrig med en köpt läppmodell.

## Scenen och spelet

- **Naturligt utseende:** ljuset kommer ur rummet, inte målade sken. Duken han vill ha är `assets/scene/table.png`.
- **Looken i Scen** (2026-11-20): förvalet Jakob-1 "är verkligen det bästa", och "Bred lins är vad jag älskar och som
  gör jobbet." Standard är kvar som grund.
- **3D-scenen** (2026-11-17): "fantastiskt"; bordet från backad kamera "fruktansvärt fult"; Monacos bakgrund är bra.
- **Bordet BORD-02** (2026-11-20): "skitbra" som alternativ; ett labbprov som spelet inte slår på före hans ja.
- **Spelet på telefon** (2026-11-14, 2026-11-17): markeröverlägget mindre så att det inte täcker bordet, också
  liggande; filmen före spelet ligger i mitten på en liggande telefon.
- **Görans material** används inte (`docs/SYSTEM.md`, "Återbruk och införande").
- **Dela ut går före köade vilor** (2026-11-23): klickar spelaren Deal efter insatsen "ska de köade viloklippen
  ignoreras", så att A1 → A2.n får företräde.
- **Godkända filmer spelas i tur** (2026-11-24): utan Primär spelar spelet ett stegs godkända filmer med lika chans, och
  returen följer sin giv; Primär låser steget.

## Kopian och nätet

- **En publicering görs bara på hans uttryckliga ord** (2026-11-18): ett ja gäller den publiceringen. "Allt på nätet är
  sekundärt"; `cloud/` står kvar tills han säger annat.
- **En sida på nätet** (2026-11-23): kopian på `dealer-lake.vercel.app`; gamla labbet är raderat.
- **Media på nätet** (2026-11-21): bara det Casinot använder och det som prövas i Scen & bord, i Blob, ett träd per
  dealer från A1; uppladdning på hans ord.
- **Filmdörren står kvar** (2026-11-23): `/trailer`, in via en noir-film till casinot; den läser inget sparat förval.
- **Casinot på nätet visar det som är inställt i studion** (2026-11-21): det sparade med Använd i Casino, efter nästa
  publicering.
- **Kopian är öppen för läsning** (2026-11-14): "Se till att den inte är lösenordsskyddad"; boten och önskemålslådan
  kräver lösenordet.
- **Lösenord** (2026-11-18): i `.env.local`, aldrig i en fil som Git följer.
- **Kopian har samma meny som studion** (2026-11-13).
- **Noirfilmen** (2026-11-21): v4 och klippen den byggts av sparas (`assets/noir/`); den är filmen före spelet och
  ligger för sig på Blob, som gruppen `ingång`.
- **Trailrar hålls utanför kopian** (2026-11-12), utom filmen före spelet; trailerproven är spärrade
  (`data/studio-release.json`).
- **Vercel** (2026-11-12): kopian och botens anrop ligger i hans eget team (`docs/DRIFT.md`).
