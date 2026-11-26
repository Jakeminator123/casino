# standarddocka

Arbetsbänken där standarddockan görs färdig: en man och en kvinna med samma skelett, vid spelets bord, i Blenders vy
genom spelets kamera, med rörelser som är riktigt bra. När Jakob är nöjd plockas delarna in i `../blackjack-dealer/`
och `../avatar-auto-pipeline/`. Reglerna står i `AGENTS.md`.

## Mappar

```
standarddocka/
  AGENTS.md     regler
  README.md     den här filen: läget, nästa steg och det som ska plockas in
  scen/         skripten som sätter ihop vyn i Blender
    vy.py       arbetsvyn: bordet med kanten närmare, mannen i vilan (A1) på stolen, händerna på filten och blicken
                mot kameran; ställningen, stolen och blicken är tal och steg överst i filen
  vy/           den senaste arbetsvyn, skriven av scen/vy.py (varje körning skriver över den förra): vy.blend
                (dubbelklicka för att öppna scenen i Blender), bilderna och mätningen; går inte in i Git
  editor/       editorn i webbläsaren: mannen vid bordet, en tidslinje att spela och dra i, kameror (också från de
                sju platserna), handtag på händer, armbågar och blick som blir ändringar ovanpå grundrörelserna,
                återställning och inspelning av klipp
    server.ts   editorns egen server (bara den här datorn, port 4320); lämnar ut sidan, modellerna och rörelserna,
                tar emot det som sparas och gör film av inspelningens bilder (FFmpeg)
    editor.ts   sidan: tidslinjen, kamerorna, handtagen, Spara, Återställ, Spela in
    scen.ts     scenen: dockan (mannen eller kvinnan) i standardrummet (bordet, stolen och ljuset ur
                ../blackjack-dealer/dealer3d/src/standard-room.ts, samma som studions dockvy ritar), kortet, kamerorna
    rorelse.ts  rörelsen: grundrörelser efter varandra (dockans egna där de finns), skarven, takten, ändringarna
                ovanpå, vem som håller kortet, och kontrollen av ett sparat lager (`lagretsFel`)
    armar.ts    regeln att underarmarna går över bordets kant (armbågen vrids ut och upp), och kroppens mått tagna
                på dockans hud (bålen som skivor, huvudet, axellederna, armens tjocklek) för spärren
    kropp.ts    spärren: det han drar i hålls inom vad en kropp kan (ingen arm genom bålen, huvudet eller bordet,
                ingen hand i filten eller bortom armens räckvidd, armbågen och handleden inom sina lägen); ren kod
  verktyg/      för agenter, utan fönster (hur de används: skillen granska-rorelse, ../.claude/skills/granska-rorelse/)
    titta.ts    stillbilder ur valda kameror vid valda tider, med editorns mått, eller en inspelning; närbilder av en
                hand eller kortet (kamerorna narahoger, naravanster, narakort; de spelas inte in); `--andring '<json>'`
                lägger en ändring före bilderna utan att spara den; `--kor` räknar ett uttryck i sidan och skriver
                svaret; `--spara` skriver om det sparade ur filen innan farten, de små rörelserna och ändringarna
                läggs på, och stannar med ett fel om lagret inte kan användas; ett ogiltigt namn i `--giv` eller
                `--vilan` ger ett fel. Kör editorn i ett headless Chrome under det delade låset, som
                `../blackjack-dealer/tools/lab-look.ts` tar det (väntar högst tre minuter; ett lås äldre än 20 minuter
                är kvar efter en körning som dog och tas över)
    mat.ts      mäter en rörelse ruta för ruta, räknad som editorn spelar den (takten, ändringarna, de små
                rörelserna, blicken mot spelets kamera, spärren), utan webbläsare. Varje tid står i filmens sekunder
                och bredvid "i lagret", grundrörelsens sekunder (det en ändrings `tid` tar), och takten som mättes
                står överst. `--docka man|kvinna` (förval mannen). `--alla` är spärren före en inspelning: alla sju
                platser, en rad var, och rött om något av det här finns: ett lager med fel; en giv som inte börjar
                och slutar i sitt ankare, eller en vila som inte slutar i sitt (inom 0,5 mm); ett ben (överarm,
                underarm, fingerben) som ändrar längd; en handled utom armens räckvidd; en hand mer än 50 grader
                från underarmen (mer än kroppen ritar); en fingerled bortom sitt läge; ett finger i filten eller
                genom kortet (också i skon); handflatan i filten; kortet utan stöd eller med ett hörn under filten;
                ett hopp eller ett ryck (fartens ändring som vektor) i en handled, armbåge, fingertopp, kortet,
                huvudet eller blicken, i alla rutor och med ankaret stilla före och efter; en sned landning.
                Utskriften säger också vad mätningen inte ser (dockans egen kropp, armarna mot kanten och brickan,
                låren och stolen, hur det ser ut)
  rorelser/     det editorn sparar, en rörelse per kortplats: a1-a23-p<plats>c1.json (vilka grundrörelser, blicken,
                farten per del, ändringarna), för en dockas egna rörelser a1-a23-p<plats>c1-<docka>.json, och
                <namn>.rutor.json (hela rörelsen ruta för ruta i dockans format, med kroppens mått, skriven vid
                Spara). Ett lager som hör till en annan grundrörelse än den som spelas, eller som har fel (en
                felstavad led, en vridning som inte har längden 1, en tid utanför rörelsen), används inte, och sidan
                säger vad; mappen finns först när något har sparats
  klipp/        filmerna Spela in gör: <rörelse>-<del>-<kamera>-<docka>[-nyckel].mp4, på prov
                prov-[<vilan>-]<given>-<del>-<kamera>-<docka>.mp4 (1764 x 1174, 30 bilder i sekunden); en ny
                inspelning med samma namn skriver över den förra; går inte in i Git
  STARTA editorn.cmd   dubbelklicka för att starta editorn och öppna den i webbläsaren
```

Editorn startas med dubbelklick på `STARTA editorn.cmd`, eller från casino-mappen med
`node standarddocka/editor/server.ts --oppna`, och öppnas på `http://127.0.0.1:4320/standarddocka/editor/`. Den visar
följden A1 → A2.3 → kort 1 på en plats → tillbaka, ur `../blackjack-dealer/dealer3d/data/`. Dockans egna rörelser
spelas där de finns (tabellen `EGNA` i `editor/rorelse.ts`, en rad per docka och plats; i dag mannen på plats 4:
`till-ankare-2-3-man` och `giv-fran-2-3-p4c1-ren-a-man`). Annars spelas de äldre (`till-ankare-2-3-c` och Paows giv
till platsen, listan `GIVAR` där), och statusraden säger att platsen ännu spelar en rörelse ritad för en annan
kropp. Platsen väljs med knapparna "Kortet ges till plats" (eller `?plats=1…7`, förval 4), och varje plats har sina
egna sparade ändringar.

- **Kameror:** spelets vy sedd från plats 1–7 (plats 4 är förvalet), från sidan, uppifrån, fri, och den gamla kameran
  för jämförelse. Spelets vy är den lägre kameran som Jakob valde som standard 2026-11-26: 0,58 m över filten, 12
  grader ned, samma lins som förut (`PLAY_LENS` i `../blackjack-dealer/src/table-lens.ts`); de andra platsernas kameror
  räknas ur den med `seatView`. I vilan ser han in i kameran på plats 4: dockans kod riktar linjen mellan hans ögon
  mot blickpunkten (`../blackjack-dealer/dealer3d/src/figure-model.ts`). Höften står stilla på stolen och ryggen tar
  lutningen och vridningen när han når ut över bordet. En plats kamera är spelets egen regel
  (`seatEye` i `../blackjack-dealer/dealer3d/src/world.ts`); plats 4 är spelets kamera. Sidokameran är Blenders `sida`
  i `scen/vy.py` (samma siktlinje och en lika bred bild, 2,5 m): Blenders är ortografisk, och editorns står åtta gånger
  längre bort med smal vinkel, så att perspektivet nästan är borta (talen står i både `vy.py` och `editor/scen.ts`).
- **Dockan:** mannen eller kvinnan (knapparna "Dockan", eller `?docka=kvinna`). De har samma skelett, och där de
  spelar samma grundrörelser delar de det som sparas; en dockas egna rörelser har sitt eget sparade lager. Underarmarna
  har två vridben var (`ForeArmTwist1` och `2`): underarmens vridning fördelas på dem, en tredjedel och två
  tredjedelar, upp till 100 grader och mjukt mot 120, så att huden vrids längs underarmen och inte nyps vid armbågen
  (`../blackjack-dealer/dealer3d/src/figure-model.ts`; `?vridben=0`, eller `--utan-vridben` i `verktyg/titta.ts`,
  vrider som förut, för att jämföra). Armarnas tjocklek mäts på hela underarmens hud, vridbenens med (`editor/armar.ts`).
- **Ändringarna:** en hands ändringar läggs ihop och läggs på en gång, så ordningen de gjordes i spelar ingen roll,
  och det han ser är det som sparas, mäts och spelas in. "Hur länge ändringen varar" är filmens sekunder åt varje håll;
  blicken och greppet tonas i spelad tid, så inget hoppar där stillheten mellan två delar klipps bort. Kortet följer
  en ändrad hand bara mellan skon och landningen (greppet tonas in och ut över 0,25 s) och ligger alltid på sin
  plats när det har lagts. Kulorna står där lederna faktiskt är; en armbågsändring läggs på armbågens cirkel när han
  släpper, och en som inte syns (en armbåge dragen längs armen, som kroppen inte läser) tas bort. Ringarna som vrider en
  hand står efter handen: den ena vrider kring underarmen, de andra kring handleden. Ett drag inom 0,1 s från en
  ändring av samma led ändrar den i stället för att lägga en ny bredvid. Ctrl+Z mitt i ett drag ångrar inget.
- **Kortet** som delas är bordets eget när bordets modell ger ett, med bildens överkant åt kortets långsida (som
  studions kort), så att det ligger som Blenders kort på platsen; kortets långsida räknas åt samma håll i varje ruta, så
  att bilden aldrig vänds ett halvt varv på en ruta. I dag är bordets exempelkort en grupp av två delar, som
  `loadTable` i `../blackjack-dealer/dealer3d/src/standard-room.ts` inte tar, så editorn ritar sitt enkla kort (vit
  framsida, röd rygg); `state().kortetsUtseende` säger vilket.
- **Uppspelningen** stannar när en kula väljs eller ett drag börjar, så att draget görs i rutan som syns. Slingan står
  0,8 s i slutet och 0,4 s i början innan den börjar om, så att steget från skon till vilan syns som en omstart och
  inte som ett ryck.
- **Spärren** (Jakob 2026-11-26: "Sånna här rörelser ska ju bara inte gå"): det han drar i stannar vid kroppen,
  bordet och vad en led kan, och en rad överst i bilden säger vad som tog emot, till exempel "Höger armbåge kan inte gå
  längre in: kroppen är i vägen." När han släpper sparas ändringen som det som faktiskt blev, så att nästa drag börjar
  där armen står. Spärren gäller bara det han ändrar: grundrörelsen utan ändringar är ruta för ruta som förut, och det
  den själv gör är tillåtet. Kroppens mått tas på mannens eller kvinnans egen hud när sidan laddas. Det sparade går
  genom samma spärr. `window.editor.granskaGrund()` säger var grundrörelsen själv bryter mot gränserna (till för den
  som ritar om den), och `state().sparr` vad spärren gjorde vid tiden som visas. Handen hålls högst 50 grader från
  underarmen, samma gräns som kroppen ritas med (`WRIST` i `../blackjack-dealer/dealer3d/src/figure-model.ts`), så att
  hand, fingrar och kort räknas ur samma hand; en armbåge stannar där handen inte kan böjas mer. Den täcker inte
  vridningen kring underarmen, karmen, brickans väggar, låren eller stolen.
- **Återställ:** "Tillbaka till det sparade" kastar det som inte är sparat, "Återställ till grundrörelsen" tar bort alla
  ändringar. Båda går att ångra (Ctrl+Z), och inget skrivs förrän Spara. Det sparade ligger i Git, så en äldre sparad
  version går alltid att hämta tillbaka.
- **Takt:** förvalet är Jakobs takt (`AGENTS.md`): vilan till skon 1 s, kortet ut 1 s, handen tillbaka 0,6 s, räknat
  på tiden då något rör sig; stillheten i ankaret klipps bort (`STANDARDTAKT` och `taktFor` i `editor/rorelse.ts`).
  Varje del i listan "Rörelsen består av" visar sina sekunder; ett nytt tal gör delen fortare eller långsammare (en
  fjärdedel till fyra gånger grundrörelsens fart), jämnt genom delen. Ett tomt fält eller 0 ändrar inget, och ett tal
  utanför det delen kan ta ger ett besked vid fältet om vad den blev. En egen fart sparas med rörelsen, följer med i
  inspelningen och i rutorna, och Återställ går tillbaka till förvalet. Ändringarna sitter kvar i samma ögonblick av
  rörelsen när farten ändras. En del som redan är i hans takt (dockans egna rörelser) spelas som den är, och den
  klippta stillheten får aldrig dölja mer än 1 mm glid.
- **Små egna rörelser:** fem slag som slås på var för sig och läggs ovanpå rörelsen utan att ändra den: han andas,
  huvudet rör sig lätt, en kort blick mot en spelare, ett finger lyfter på en hand som vilar, och kroppen väger över.
  "Slumpa om" lägger dem på andra ställen; samma frö ger samma rörelser. De är noll i varje dels början och slut, så
  att klippen fortfarande möts i ankaren, och sparas med rörelsen (`liv` i filen; `medLiv` i `editor/rorelse.ts`).
- **Blicken** är rörelsens egen: i vilan ser han rakt fram, mot spelaren på plats 4 i ögonhöjd, vilken kamera som än
  är vald, så att två klipp som möts har samma huvud.
- **Spara** ser först efter om filen har ändrats sedan sidan laddades (i en annan flik eller av en agent), och om det
  som ligger sparat inte används (det hör till en äldre rörelse eller har fel). Då frågas han i vanliga ord, med valen
  "Ladda om sidan", "Spara ändå" och "Låt bli", och inget skrivs förrän han väljer. Ett sparande i taget: knappen är
  avstängd medan det pågår, och servern skriver samma fil en gång i taget, var gång under ett eget tillfälligt namn.
  Lagret prövas innan det skrivs. Spara mäter också armarna på den färdiga rörelsen, med ändringarna i, skriver
  måtten i rutornas fält `armar` och säger till om en underarm går genom bordets kant.
- **En grundrörelse på prov:** `?giv=<namn>` och `?vilan=<namn>` (eller `--giv`, `--vilan` i verktygen) spelar och mäter
  en annan fil ur `../blackjack-dealer/dealer3d/data/` i stället för platsens, utan det sparade lagret och utan att
  kunna spara. En giv på prov utan vila börjar i vilan för den docka den är ritad för. Ett namn som inte är ett namn
  på en grundrörelse ger ett fel i stället för platsens vanliga rörelse. För den som gör om en grundrörelse.
- **Nyckelfärger:** med `?utseende=nyckel` i adressen (eller `--utseende nyckel` i `verktyg/titta.ts`) ritas scenen för
  film där dealern ska skiljas ut i efterhand: bakgrunden blå och utan golv, bordet och markerbrickan gröna utan
  tryck, kasseringslådan borta, och korten i spårfärger. Färgerna står i `NYCKEL` i `editor/scen.ts`. Inspelade klipp
  får då `-nyckel` sist i namnet.
- **Spela in:** hela rörelsen, en del av den eller given (kortet ut och handen tillbaka i samma film), från den valda
  kameran eller från alla sju platserna i ett svep, utan kulor och pilar. Blicken står fast under inspelningen, så
  att det är samma rörelse från varje kamera, och panelen, tidslinjen och kameran går inte att röra medan den pågår
  (Esc avbryter). Filmerna hamnar i `klipp/`, med dockan i namnet. Kräver FFmpeg på datorn (`ffmpeg` i sökvägen,
  eller miljövariabeln `FFMPEG`).
- **För verktygen:** `window.editor` (uppräkningen överst i `editor/editor.ts`). `state()` har utöver lägena bland
  annat `sparr` (vad spärren höll emot), `handledGrader` (handledens vinkel som kroppen ritade den och som rutan bad
  om), `lagretsFel`, `aldreSparat`, `dockansEgna`, `sparasSom`, `bildvinkel`, `sparar`, `kortetsUtseende`, `lage` och
  `ringensX` (i läget Vrida: ringens axel längs underarmen) och `axelLeder`. `slapp(id)` gör med en ändring det som
  händer när han släpper musen. `save()` stannar med sidans fråga som fel, så att ett verktyg aldrig skriver över i
  tysthet; `save(true)` skriver över.

En ändring i `editor/server.ts` gäller först när servern har startats om: stäng fönstret den körs i och starta igen
(en server som en agent har startat utan fönster stoppas med sitt process-id, efter att `/vem` har svarat
"standarddockans editor").

Arbetsvyn körs från den här mappen (Blender 5.3, utan fönster; bygger bordet själv om det saknas):

```text
blender -b --factory-startup --python-exit-code 1 --python scen/vy.py
```

Bilderna (`vy_film`, `vy_lag`, `vy_hel`, `vy_sida`, `vy_arm_nara`, `vy_bak`, `vy_nara`, och `vy_hand_fram` och
`vy_hand_sida` med kameran i filtens plan), mätningen (`vy_matt.json`) och scenen (`vy.blend`) hamnar i `vy/` här.
`-- --vyer film lag` renderar bara några, `-- --skala 0.5` mindre bilder.

Mappen lånar det som redan finns i stället för att kopiera det:

| Vad | Var |
| --- | --- |
| Måtten (kamera, bord, kort, sko, markerbricka, kortplatser) | `../blackjack-dealer/src/table-lens.ts`, som Blender läser genom `../avatar-auto-pipeline/scen/standard.yaml` |
| Dockorna, bordet och stolen som modeller, och skripten som bygger dem | `../avatar-auto-pipeline/assets/` och `../avatar-auto-pipeline/scen/` |
| Rörelserna som finns (givarna) och koden som gör dem | `../blackjack-dealer/dealer3d/` |

## Läget (2026-11-26)

- **Dockorna:** mannen (1,75 m) och kvinnan (1,65 m) har en människas mått, passade mot mätningar av människor av samma
  kön och längd (ANSUR II): längder, armarnas tjocklek, händer och fötter. Underarmarna har två vridben var, så att
  huden inte nyps när handen vrids; skelettet har 81 ben och de äldre benens namn är oförändrade. De byggs av
  `../avatar-auto-pipeline/scen/bygg_docka.py` (talen i `MATT`; skelettet står i `new_docka.md`). Känt: knogarna sitter
  1–2 cm för långt ut från handleden, som i MPFB:s eget skelett.
- **Bordet:** dockornas bord är en halvmåne (Jakob 2026-11-26), 1,90 m brett och 0,95 m djupt, med dealerkanten och
  markerbrickan 23 cm bakom spelets kant, skon 8,5 cm längre ut åt dealerns vänster och ett urtag för låren under
  sargen. De fyra talen står på ett ställe, `DOLL_TABLE` i `../blackjack-dealer/src/table-lens.ts`: modellen
  `standardbord_nara23` byggs av dem (`bygg_bord.py --docka`) och rörelserna tar skons plats ur `dollShoe`. Editorn
  och studions dockvy visar det bordet för en rörelse ritad för `man` eller `kvinna` (`bordFor` i `editor/scen.ts`);
  de äldre rörelserna (Paows docka) visas vid `standardbord_nara` tills de är utbytta, och då tas det bordet och
  `standardbord` bort. Känt: skon står 2,6 cm från läderrullen och dess bakre halva ligger utanför spelets bild; med
  bara 3 cm mot spelarna i stället (två tal i `DOLL_TABLE`) står den nästan hel i bild, med nästan lika fri arm.
- **Skon** har en frontplatta med en rundad öppning (`sko_front`, måtten i `SKO_FRONT` i `bygg_bord.py`): kortets rygg
  syns i öppningen, kortet dras nedåt och ut genom springan under plattan, och nästa kort visar ryggen.
- **Så sitter de:** axlarna 0,38 m bakom spelets kant; mannen 0,29 m över filten och kvinnan 0,31 (`HOJD` i
  `../blackjack-dealer/dealer3d/tools/docka-standard.ts`: så högt som spelets bild rymmer, högst de 0,31 Jakob dömde;
  den nya mannens hals och huvud är 3 cm högre än den kropp han dömde). Blenders egen vila (`SITT` i `bygg_docka.py`)
  står kvar på 0,31 med den äldre höften och ska följa mannens `place` i `doll.ts`.
- **Så ställs kroppen efter rörelsens punkter** (`../blackjack-dealer/dealer3d/src/figure-model.ts`): höften står
  stilla och ryggen böjs, armbågen böjs i modellens eget gångjärn, underarmens vridning läggs på vridbenen (fullt upp
  till 100 grader), huvudet riktar linjen mellan ögonen mot blickpunkten, och en hand som slår i handledens gräns
  (50 grader) vrids tillbaka hel med fingrarna.
- **Mannens egna rörelser** (dockan `man` i `../blackjack-dealer/dealer3d/src/doll.ts`, mätt på modellen av
  `dealer3d/tools/docka-standard.ts`): ankaret vid skon (`ankare-2-3-man`), vilan till skon (`till-ankare-2-3-man`)
  och första kortet till plats 4 och 5 (`giv-fran-2-3-p4c1-ren-a-man`, `-p5c1-`), ritade av
  `dealer3d/tools/ren-givar.ts` med koreografin i `dealer3d/src/koreo-giv.ts`. Given är Jakobs beskrivning, läst mot
  två lärofilmer av riktiga dealrar (`AGENTS.md`, Kortets vändning): vänstern drar kortet plant till mötet mitt
  framför honom och reser det på högkant med framsidan mot dealern, högern nyper dess övre kant ovanifrån med tummen
  ned längs framsidan och rullar det framåt, bär det och lägger det. Version A vänder direkt efter bytet; version B
  (`giv-fran-2-3-p4c1-prov-b-man`) bär kortet på högkant och vänder vid platsen. Takten är hans: kortet ligger efter
  1,0 s och handen är hemma 0,6 s senare. `givRegler` i `ren-giv.ts` mäter bytet, den öppna handen, kortet i handen,
  kroppen och vridningen och sparar talen i filen (`made.checked`); en giv med röd spärr skrivs bara under provnamn.
  Känt i version A: kortet läggs ned kring sin ena långsida i stället för att sättas ned plant, och det vrids 46
  grader i sitt plan på en ruta när det lämnar skon.
- **Editorn** (`editor/`): mannen eller kvinnan gör vilan → skon → kort 1 på en plats → tillbaka, med dockans egna
  rörelser där de finns (tabellen `EGNA` i `editor/rorelse.ts`, en rad per docka och plats) och annars de äldre,
  ritade för Paows docka. De äldre givarna är röda i `verktyg/mat.ts` på alla sju platser (finger genom kortet, kort
  utan stöd, hopp) och ska inte filmas. Kvinnan spelar mannens rörelser tills hon har egna.
- **Studion** (`../blackjack-dealer`): Standarddockan är en ingång i Bordet, i spelets vy med samma rum som editorn
  (`dealer3d/src/standard-room.ts`), och dockvyn hittar mannens givar på filnamnet. För en plats utan ritad giv visar
  den plats 4 med en rad om det.
- **Känt i editorn:** smalbenen lutar 4,6 grader framåt i editorn och studion men 11 grader bakåt i Blender; att rätta
  det kräver att stolens regel (`seatStool` i `standard-room.ts`) mäter lårens undersida bara på låren, annars tar den
  fötterna och sänker stolen till golvet. Kortet som ritas är editorns enkla (röd rygg, vit framsida): bordets
  exempelkort är en grupp med två delar och `loadTable` tar bara en mesh. Editorn och `scen/vy.py` ställer upp scenen
  var för sig (stolen, vilan, kamerorna); sidokamerans tal står därför två gånger.

## Nästa steg

1. Jakobs dom över mannens giv: provet `giv-man-20261126` i studions Granska (filmerna genom spelets vy, A och B till
   plats 4 och A till plats 5) med kortet `mannens-giv-vandningen` i Beslut. Det han väljer och det han säger ser fel ut
   ändras i `koreo-giv.ts` och gäller då alla platser.
2. Alla sju platser: `node dealer3d/tools/ren-givar.ts --docka man --alla --koreo a` från `../blackjack-dealer/` ritar
   första kortet till varje plats; en grön giv skrivs under mannens namn och en röd bara på prov. Plats 4 och 5 är
   gröna. Det som spärrade 2026-11-26: plats 1 och 2 högerhanden hoppar i två rutor och underarmen går 13–15 mm under
   bordets kant; plats 3 kortet hoppar i en ruta; plats 6 bålen vid sitt tak (25 grader lutning, 20 vridning) och
   handleden 60 grader; plats 7 armen räcker inte. Riktiga dealrar ger de två platserna närmast skon med
   vänsterhanden ensam. Varje ny grön giv får en rad i `EGNA` i `editor/rorelse.ts`; studion hittar filen själv.
3. Kvinnan: hon har en egen kropp men spelar mannens rörelser. Först i `doll.ts`: `--skriv` lägger blocket KVINNA
   före `DOLLS`, och `DOLLS` ska få `kvinna: KVINNA`. Sedan, från `../blackjack-dealer/`:
   `node dealer3d/tools/docka-standard.ts --docka kvinna --skriv`,
   `node dealer3d/tools/ren-givar.ts --docka kvinna --ankare --vila` och
   `node dealer3d/tools/ren-givar.ts --docka kvinna --plats 4 --koreo a`, och en rad i `EGNA` per giv.
4. Det som saknas för en hel runda: andra kortet till en plats, dealerns egna kort, och en återgång från kortplatsen
   direkt till vilan (Jakob 2026-11-23: sista given går direkt till A1). I studions Bordet ska platsknapparna visa
   vilka platser som har en ritad giv, och Jakob har bett om att slippa be en agent: en knapp som ritar en giv till
   alla platser är ett förslag, inte byggt.
5. Kortplatserna vända mot varje spelare (`AGENTS.md`, hans fråga 2026-11-26): pröva i bild uppifrån och från plats 1
   innan givarna till de yttre platserna görs färdiga.
6. Blenders vila (`SITT` i `bygg_docka.py`) efter mannens nya plats (axlarna 0,29 m, höften 0,1426 m under filten,
   handlederna i vilan 0,034 och 0,033 m över filten), och smalbenen (ovan).

7. Provet "dockans film görs om till en person" (Jakob 2026-11-26), med en provperson: en man, vars tre bilder
   (porträtt, helfigur, halvfigur) ligger hos Jakob utanför repot och aldrig går in i Git. Dockan är förlagan för
   rörelsen och bilderna för utseendet; personen behöver aldrig bli en 3D-modell för det här. Modellerna, fälten och
   priserna står i skillen `runway` (`../.claude/skills/runway/SKILL.md`). Jakob gjorde samma sak för hand i Runways
   app (Aleph 2) 2026-11-24 och det gick "skitbra". Förslaget, som väntar på hans ord (inget betalas utan det), är fyra
   steg, där nästa tas först när han har dömt det förra:
   1. Ankare: rutan i vilan (A1) och rutan vid skon (A2.3) ur dockans film från plats 4, omgjorda till personen med
      en bildmodell och hans bilder. Han dömer om det är personen och om händerna ligger rätt.
   2. Aleph 2: klippen A1 → A2.3 (3,0 s) och A2.3 → plats 4 → A2.3 (4,0 s) var för sig, med ankarna som styrbilder
      först och sist. Visar utseendet, kortgreppet och om två klipp möts utan skarv i samma ankare.
   3. Samma två klipp med Kling 4 (första och sista bild, dockans film som referensfilm, det sätt Paows givar är
      gjorda med), och det andra klippet med Gemini Omni 1.2 som billig jämförelse.
   4. Vinnaren från plats 1 och 7, med egna ankare för de kamerorna.

   Första omgången är körd (hans "kör igång" 2026-11-26, 345 krediter) och väntar på hans dom i studion, provet
   `docka-till-person-20261126`, där filmerna och bilderna ligger (`../blackjack-dealer/assets/proofs/`): given till
   plats 4 (4 s) genom spelets kamera, omgjord med Aleph 2 och en styrbild, Aleph 2 och bara en text, och Kling 4 som
   redigerare med hans tre bilder; Gemini Omni 1.2 med hans tre bilder stoppades av Runways innehållsgranskning.
   Agentens läsning: Aleph 2 med styrbild följer dockan nästan ruta för ruta och behåller bordet; Kling 4 kan klä
   dockan direkt ur bilderna (hans fråga), men tar då bakgrunden ur dem och lägger kortet med baksidan upp. Lärdomarna
   står i skillen `runway`. Hans dom: "Mycket bra", och att ett hack i dockans giv kring ruta 50–51 syns i filmen
   (`verktyg/mat.ts` pekade ut samma ögonblick, ett ryck i höger handled).

   Andra omgången är körd (218 krediter) och väntar på hans dom, provet `docka-till-person-2-20261126`: vilan till skon som eget klipp med styrbild först och sist
   möter given i ankaret nästan utan skarv; och hans udda prov, en färdig film skickad in igen för att bli
   "mer naturlig", gav samma rörelse tillbaka med hacket kvar. Kvar att pröva: plats 1 och 7, kort med spårfärger och
   en bakgrund i nyckelfärg (se nedan), och Kling 4 med dockans film som lös förlaga.

   Inför nästa omgång: takten är editorns förval och blicken rörelsens egen (ovan). Kvar: ett klipp till filmmodellen
   måste vara minst 2 s (Aleph 2) eller 3 s (Kling 4), så rörelser på 1 s filmas flera efter varandra i en längre film
   (Aleph 2 tar 30 s och fem styrbilder) med en kort stillhet i ankaret mellan varje, och styckas där. Det kräver
   följder i editorn: flera givar efter varandra, också fler kort till samma plats (samma rörelse med landningspunkten
   flyttad) och varianter av en giv (annan vändning och landning ur givarnas regler, och ett eget frö för de små
   rörelserna). De byggs när de nya grundrörelserna finns.

   Tredje omgången är körd (213 krediter) och väntar på hans dom, provet `docka-till-person-3-20261126`. Kling 4 med hans ord "gör dealerns rörelser mindre stela"
   gav nästan samma rörelse och gjorde om korten till riktiga spelkort. Nyckelfärgerna håller: dockans giv inspelad
   med editorns utseende `nyckel` (blå bakgrund, grönt bord utan tryck, spårkort med gul rygg och vit framsida innanför
   en ljusblå ram med en rosa prick) kom tillbaka från Aleph 2 med färgerna rena, och dealern, korten och skon går att
   skilja ut och bordet att byta med skuggorna kvar. Det är alltså en möjlig väg att filma dealern utan bord och låta
   spelet rita bordet; då måste spelets bord ritas genom exakt samma kamera som filmen. Spårkortets färger här är ett
   första förslag och inte spelets spårkort (`../blackjack-dealer/dealer3d/src/card-marks.ts`, gult och blått med kryss
   och prick): vilket som blir standard är Jakobs val.

   Kamerans höjd är avgjord (Jakob 2026-11-26): den lägre kameran är spelets vy och standarden för de här filmerna
   (`AGENTS.md`, provet `spelets-vy-20261126`). Den följs av editorn, de sju platsernas kameror och Blenders standard
   (`../avatar-auto-pipeline/scen/standard.yaml`, som `scen/vy.py` läser sin lägre vy ur). Bilderna `vy_film`, `vy_lag`,
   `vy_hel` och `vy_nara` i `vy/` är gjorda om med spelets vy och skons frontplatta; de övriga där är från före
   bytet. Det som inte har följt med än: spelet självt ritar sina kort
   och sitt bord genom den gamla kameran tills de nya filmerna tas in där; då räknas kortplatsernas bildpunkter ur
   samma punkter på bordet genom spelets vy (`see(filmEye(PLAY_LENS), punkt)`). En film går inte att luta om i
   efterhand, så bordet spelet ritar måste gå genom exakt den här kameran.

   En tagning per sätt (hans regel i `bestalla-film`). Skattat ur prislistan 2026-11-26: cirka 800 krediter för allt
   (ankarna 100–250, Aleph 195, jämförelsen 205, plats 1 och 7 cirka 220). Anropen läggs som prov genom
   `../blackjack-dealer/tools/runway-api.ts place`, som bokför dem. Tre kameror bredvid varandra i en och samma film
   är ett senare försök: inget belägger att det ger samma ansikte i alla tre. Hela målet, 40 rörelser från 7 kameror à
   4 s, är med Alephs pris cirka 31 000 krediter per omgång och dealer; därför görs plats 4 färdig först.
8. Rörelserna en i taget, tills var och en är riktigt bra, och sättet att föra över dem till en annan kropp. Den
   första hela följden ska sluta i vilan: i dag slutar den vid skon (A2.3), och en återgång från kortplatsen direkt
   till A1 (Jakob 2026-11-23: sista given går direkt till A1) finns inte som dockrörelse.
9. Ansiktet: båda modellerna har 30 ansiktsformer (blinkning, ögonbryn, mun, käke, efter ARKits namn) och leder för
   ögon och käke, men inget styr dem än och en rörelses rutor har inget fält för ansiktet. Nästa steg är en blinkning
   och ögon som följer blicken som en av de små egna rörelserna; minspel därutöver gör filmmodellen ur personens bilder.
10. Ordningen i mapparna (Jakob 2026-11-26): det som bygger standarden (måttfilen, bordet, dockorna, stolen och
   deras byggskript i `../avatar-auto-pipeline/scen/`, `verktyg/`, `rorelser/` och `assets/`) flyttar hit, så att
   `../avatar-auto-pipeline/` bara gör en dealer från foton på den här standarden. Väntar på svaret från den
   utomstående granskare Jakob har gett hela upplägget till (rörelser till en annan kropp, film eller realtid, sju
   platser, kameran, editorn eller Blender, mappordningen).

Lovat Jakob, inte gjort (2026-11-26): kvinnan bredvid mannen i Blenders vy; en gemensam uppställningsfil som både
`scen/vy.py` och `editor/scen.ts` läser; filtens
färg som ett val i `../avatar-auto-pipeline/scen/bygg_bord.py`; och en mätning i bild av hans iakttagelse att uppvända
kort på bordet ser bredare ut än kortet i skon (båda byggs 63 x 88 mm).

## Plockas in när Jakob är nöjd

Här skrivs varje sak som ska in i `../blackjack-dealer/` eller `../avatar-auto-pipeline/`, med vad den är och vart den
ska.

- Standarddockan i stället för den äldre dockan (Jakob 2026-11-26: "Se till att vi använder denna nya standarddocka för
  allt som syns i också 'blackjack-dealer'", och att den gamla Paow-dockan ersätts "på bäst lämpade sätt"). Vägen är
  att ersätta, inte att ha två dockor bredvid varandra, i den här ordningen:
  1. Gjort: studions dockvy ritar standarddockans kropp (ovan).
  2. Standarddockans egna mått in i `../blackjack-dealer/dealer3d/src/doll.ts` (i dag antagna mått för `standard` och
     Paows från SAM 3D Body), som dockorna `man` och `kvinna` mätta på modellerna, och givarna ritade för dem med
     `dealer3d/src/ren-giv.ts`. Mannen och kvinnan delar ankare, regler och val, så att en grundställning görs en
     gång (Jakob 2026-11-26: "så man inte behöver jobba dubbelt för grundposer"); bara måtten skiljer. De givarna blir
     de som editorn och studion spelar, när spärren är grön och varje plats är sedd med ögat. Först då kan dockan
     `paow`, hennes sparade standarder (`dealer3d/standard/`) och de äldre grundrörelserna tas bort: tills dess är
     givarna ritade för hennes kropp, och hennes godkända filmer är gjorda av dem.
  3. Studions dockvy (Bordets Inspelning) får editorns scen. Gjort 2026-11-26: spelets vy, det närmare bordet, skon
     med frontplattan, brickan, stolen och ljuset (standardrummet, ovan). Kvar: blicken mot kameran, armarna över
     kanten, och det editorn här har som studion saknar (takten per del, de små egna rörelserna,
     inspelningen från sju platser). Jakob 2026-11-26 om studions dockvy: "Vi ska ha in vy/vinkel och allt det andra
     från 'standarddockan'-mappens mini-blender", och att det gäller allt som har med hur klippen ska göras framöver.
     Då är editorn en vy i studion och den här mappen bara arbetsbänken.
  4. En dealer från foton (till exempel provpersonen) blir en post i studion vars filmer görs av dockans klipp och
     personens egna styrbilder; personen behöver ingen egen 3D-modell för det. Pipelinen i `../avatar-auto-pipeline/`
     som gör en 3D-dealer från foton riggar i dag med Meshys skelett; ska en sådan dealer göra dockans rörelser som
     3D-figur måste den riggas om till standardskelettet (samma lednamn), och det är inte byggt.

- Bordet: valet `--kant-bak D` i `../avatar-auto-pipeline/scen/bygg_bord.py` (finns redan där och skriver
  `assets/bord/standardbord_nara.*`; det vanliga bygget är oförändrat). När Jakob är nöjd: kanten närmare in i
  spelets mått (`../blackjack-dealer/src/table-lens.ts`, och därmed `standard.yaml`), och rättningarna (brickan
  nedsänkt i dealerkanten med sin bakvägg som bordets kant, sargen hel under brickan, rullens rundade ändar, brickans
  rännor) blir standardbordets.
