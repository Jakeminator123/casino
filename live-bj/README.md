# live-bj

En riktig dealers arbete vid ett livebord, mätt ur en film: händerna, kroppen, huvudet, blicken, korten och kameran.
Talen är förlaga för dockornas rörelser och för livebordet i koden. Reglerna för mappen står i [AGENTS.md](AGENTS.md).

Filmen är `https://www.youtube.com/watch?v=OKSnPf75PeU` (17 min 20 s, 1920×1080, 60 rutor i sekunden): en
skärminspelning av ett bord med en fast kamera och två dealers efter varandra (bytet sker vid 474–500 s).

**Det som aldrig lämnar datorn:** filmen (`video/`), rutor, ark och filmer ur den (`rutor/`) och måtten per ruta med
bilderna av det tomma bordet (`matt/`). De går aldrig in i Git, ett prov, `../blackjack-dealer/assets/` eller till en
tjänst. SAM 3D Body läser livefilmens rutor här på processorn; den hyrda maskinen hos RunPod tar bara vår egen dockfilm
och vägrar en lista tagen ur livefilmen. Personerna i filmen är riktiga människor: det vi tar med oss är rörelsen i tal.

## Kartan

| Var | Vad | I Git |
| --- | --- | --- |
| `verktyg/` | Verktygen nedan. Användningen står överst i varje fil. | ja |
| `data/` | De små sammanställningarna i tal: `kalla.json` (bordsbildens ruta och de rena partierna), `faser.json` (spelets skyltar genom filmen och rundorna), `monster.json` (varje handrörelse, blinkning och huvudrörelse per dealer; en rad på 230 KB, läs den med sin sökväg), `scen.json` (kameran och bordets fasta saker), `givar.json` (varje kort som landade), `mot-vart-bord.json` (livebordet mot vårt eget i tal), `uppsattning.json` (hela livebordets uppsättning i linsvärldens meter, för att byggas som en andra uppsättning bredvid vår standard), `stil-kameran.json` och `stil-bordet.json` (vardera dealerns sätt att ge, i meter, grader och sekunder: det dockan läser), `rorelser.json` (allt de gör, i stycken och slag), `segment.json` (hela filmen indelad per dealer och per hand, nedan; ett stycke per rad, läs den med sin sökväg), `sam-prov/` (SAM 3D Body: proven på dockans film, svaret för livebordets nyckelrutor i tal och lyften mot bordets kända punkter, nedan), `kroppar.json` (dealrarnas kroppar i tal, `verktyg/kroppen.py`). | ja |
| `video/` | Filmen, `kalla.mp4`. | nej |
| `matt/` | Måtten per ruta, en fil per rent parti (`rorelse-<start>.json`, `kort-<start>.json`), och det tomma bordet (`bord-A.png`, `bord-B.png`). Görs om med `mat.py`, `kort.py` och `scen.py`. | nej |
| `rutor/` | Ark och filmer att titta på: `oversikt/` (hela filmen i små rutor), `kontroll/` (måtten ritade över filmen), `segment/` (indelningens tidslinje och ett blad per kategori), `streck-*.mp4`. | nej |
| `.venv/` | Nedladdaren `yt-dlp`. | nej |

## Körningen

Allt körs från repots rot. `PY` är `blackjack-dealer/tools/python/.venv/Scripts/python.exe -I` (miljön och
modellfilerna: `../blackjack-dealer/tools/python/README.md`), och `SAMPY` är `../sam-3d-body/.venv/Scripts/python.exe -I`.

**Att göra om allt från filmen**, i den här ordningen: hämta filmen, `ram.py`, `faser.py`, `mat.py` (fem körningar), `scen.py`,
`kort.py` (per parti, sedan `samla`), `scen.py` en gång till med `--givar` så att kortplatserna kommer med, `reling.py`,
`monster.py`, `stil.py`, `rorelser.py`, `uppsattning.py`, `lyft.py giv`, och sist `segment.py dela`, som läser lyften.
Bara `ram.py`, `faser.py`, `mat.py`, `scen.py` och `kort.py` läser filmen; `matt/` (160 MB) görs om på ungefär en timme,
och de andra läser bara `matt/` och `data/` och tar sekunder. Ändras ett verktyg tidigare i kedjan körs de senare om.
Finns `matt/` kvar behövs filmen bara för att titta (`titta.py`, `streck.py`, `overlagg.py`). `docka.py` och
`overlagg.py` står vid sidan av kedjan.

| Steg | Kommando | Ger |
| --- | --- | --- |
| Hämta filmen | `live-bj/.venv/Scripts/yt-dlp --no-playlist --js-runtimes node -f 299 -o "live-bj/video/kalla.%(ext)s" <adressen>` | `video/kalla.mp4`, utan ljud. Nedladdaren görs med `python -m venv live-bj/.venv` och `pip install yt-dlp`; ingen inloggning. |
| Hitta bordsbilden | `PY live-bj/verktyg/ram.py live-bj/video/kalla.mp4 live-bj/data/kalla.json` | Bildens ruta i skärminspelningen och de 18 partier (876 av 1040 s) där den visas orörd. |
| Läs skyltarna | `PY live-bj/verktyg/faser.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/data/faser.json` | Vilken skylt som stod när ("Dealing", "Make your decision" ...) och rundorna. 5 minuter. |
| Mät bordet och kameran | `PY live-bj/verktyg/scen.py` (användningen står överst i filen) | `data/scen.json`: kameran ur 29 ensamma kort, filten, skon, lådan, skärkortet, platsernas märken och var korten landar, i bildpunkter och meter på filten; det tomma bordet i `matt/bord-A.png` och `bord-B.png`. |
| Mät relingen | `PY live-bj/verktyg/reling.py live-bj/data/scen.json live-bj/data/reling.json [--ark live-bj/rutor/kontroll/reling.jpg]` | `data/reling.json`: rullen runt filten och längs kanten mot dealern (bredd, höjd över och under filtens nivå), och hyllan vid dealerns höger, mätt mot filmens kontur på det tomma bordet. En minut. |
| Hitta korten | `PY live-bj/verktyg/kort.py` (användningen står överst i filen) | `matt/kort-<start>.json` (varje kort i varannan ruta: hörn, riktning, sida upp, stilla eller på väg) och `data/givar.json` (varje kort som landade: när det lämnade skon, när och var det låg still, om det vändes). |
| Mät dealern | `PY live-bj/verktyg/mat.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt --del 0/5` (fem körningar, `0/5` till `4/5`) | Kroppen, båda händerna och ansiktet i varannan ruta. 40 minuter med fem körningar bredvid varandra. |
| Räkna ut mönstret | `PY live-bj/verktyg/monster.py live-bj/data/kalla.json live-bj/data/faser.json live-bj/matt live-bj/data/monster.json` | Varje handrörelse, blinkning, sänkt blick och huvudrörelse, och sammanställningen per dealer. |
| Skriv stilarna | `PY live-bj/verktyg/stil.py live-bj/data live-bj/matt` | `data/stil-kameran.json` och `data/stil-bordet.json`: takten, fartkurvorna, handbytet, bålen, huvudet, blicken, blinkningarna, vilan, den andra handen och greppet, med hur varje tal är mätt. |
| Dela upp i stycken | `PY live-bj/verktyg/rorelser.py live-bj/data live-bj/matt` (`--visa <a> <b>` skriver ut handrörelserna mellan två sekunder) | `data/rorelser.json`: varje stycke med slag, rutor, händer och om det är rent nog att rita efter. |
| Dela in per hand | `PY live-bj/verktyg/segment.py dela live-bj/data live-bj/matt` (`--visa <a> <b>` skriver ut styckena mellan två sekunder), sedan `PY live-bj/verktyg/segment.py rita live-bj/data <mapp>` och `PY live-bj/verktyg/segment.py blad live-bj/data live-bj/matt live-bj/video/kalla.mp4 live-bj/rutor/segment` | `data/segment.json` (nedan). `rita` ritar tidslinjen och tabellerna ur talen ensamma, för ett prov; `blad` lägger rutor ur filmen bredvid, bara i `rutor/segment/`. En minut; läser `lyft/` för höjderna och för vad som redan är lyft, så den körs om efter `lyft.py`. |
| Mät dockan | `PY live-bj/verktyg/mat.py <dockans film> <dess källfil> <mapp> --steg 1 --ensam`, sedan `PY live-bj/verktyg/docka.py <mapp> <ut.json> [<dockans egna tal per ruta>]` | Dockans film mätt på samma sätt och mot dockans egna tal i `../blackjack-dealer/dealer3d/data/lyft-*.json`: hur väl mätningen hittar det som är känt. Källfilen är som `data/kalla.json`, med ett parti för hela filmen. Körs i slasken; inget sparas här. |
| Samla uppsättningen | `PY live-bj/verktyg/uppsattning.py live-bj/data live-bj/matt` | `data/uppsattning.json`: kameran, filten, skon, lådan, kortplatserna, hur dealern sitter och var händerna vilar, i linsvärldens meter (x åt bildens höger, y upp med filten på 0, z mot spelaren), varje grupp märkt mätt, skattad, slutledd eller antagen. Det som klonas är måtten och rörelsen, inte lokalens utseende, bordets tryck eller personerna. |
| Djup ur SAM 3D Body | `PY live-bj/verktyg/sam_runpod.py rutor ...`, sedan `SAMPY live-bj/verktyg/sam_runpod.py las ...` (hela raderna under "Djup ur SAM 3D Body" nedan) | Lederna i meter i nyckelrutorna av de lyfta styckena, lästa här på processorn; rutorna raderas efteråt. Tar timmar. |
| Kroppens mått | `PY live-bj/verktyg/kroppen.py rutor live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt live-bj/data/lyft live-bj/rutor/kropp`, dockan i samma väntor med `standarddocka/verktyg/titta.ts` (`kroppen.py docka` säger hur), `SAMPY live-bj/verktyg/sam_runpod.py las <sam-mapp> <lista.json> --yta <yta-mapp>` för dealrarna och för dockan, sedan `PY live-bj/verktyg/kroppen.py matt ...` (användningen står överst i filen) | `data/kroppar.json`: Danilos och Frasses kroppar (axlar, armar och deras tjocklek, hand, hals, huvudets höjd, bredd och djup, bröst, midja) ur SAM 3D Body på fyra rutor per dealer i väntorna, skalade så att händerna ligger på filten och räknade mot samma läsning av vår docka i samma väntor; konturen mot dockans i samma ruta; och `passa`, det `../avatar-auto-pipeline/scen/bygg_docka.py --matt` bygger en provdocka med. SAM läser nästan samma form på båda dealrarna: det som skiljer dem är mest storleken. Höften, benen och bålens längd är dolda. Rutorna i `rutor/kropp/` raderas när talen är skrivna. Tar en halvtimme. |
| Lyft givar | `PY live-bj/verktyg/lyft.py giv live-bj/data live-bj/matt live-bj/data/lyft --sam live-bj/data/sam-prov/livebordet-sam.json` (utan `--sam` MediaPipe ensam; `prov <dockans mätta film> <dockans egna tal> [--sam <svar>]` prövar lyftet mot facit, `kanda <mapp med lyft> live-bj/data/uppsattning.json` mot bordets kända punkter, `rita <lyft> live-bj/data/uppsattning.json <ut.png>` ritar ett lyft uppifrån och från sidan; sedan `huvud live-bj/data live-bj/matt live-bj/data/lyft` lägger huvudets egna vinklar i lyften; `dockhuvud <dockans film genom livebordets kamera> <ut.json>` mäter dockans huvud i bilden med samma ansiktsnät, för `lyft-kolla.ts --ansikte`) | `data/lyft/<stil>-<mitten, vanster eller hoger>-plats-<n>.json`: de tre givar per stil som lyftes först (till mitten och bildens två yttersta platser), och `<stil>-plats-<n>-kort-<m>.json` för varje annan kortplats (kort 1 eller 2 på en plats) som filmen har en ren giv till där vänstern drar och högern lägger: det vanliga stycket i längd där handen verkligen lade kortet. Vilket kort det är avgör kortplatsen kortet landade närmast (fältet `landed`, ur `data/givar.json`). Alla i dockans eget rörelseformat (per ruta båda armarna med axel, armbåge, handled och handens 21 punkter, huvudet, blickpunkten (huvud och ögon), huvudets egna vinklar utan ögonen `huvud` (nick, vridning, tippning i grader från vilan där dealern ser in i kameran, hårt jämnade) och punkten huvudet vetter mot `hv`, ansiktsnätets egna vinklar mot kameran `ansikte` (inte från vilan, lätt jämnade: det en bild av honom visar), kortet och minen `a`: de ansiktsformer dockans modell har, 0–1), i uppsättningens meter. Dessutom två väntestycken per stil, `<stil>-vantan-<n>.json`. Vilka ansiktsformer som bär något på ett ansikte som är 135 bildpunkter högt står i stilfilerna under `face`. |
| Lägg lyften på dockorna | `node dealer3d/tools/lyft-till-docka.ts --alla`, sedan `node dealer3d/tools/lyft-kolla.ts` (båda från `blackjack-dealer/`) | Danilos och Frasses rörelser, `../blackjack-dealer/dealer3d/data/lyft-<docka>-*.json`, och ankarena de börjar och slutar i: givarna redo vid skon (`ankare-skon-<docka>.json`, A2.3, ur filmen), väntorna i vilan (`ankare-vila-<docka>.json`, A1), och vägarna mellan dem (`lyft-<docka>-till-skon.json` och `-hem.json`, vårt eget). Det råa lyftet är sanningen om var händerna är: handlederna i filmens bild, huvudets vinklar (`huvud`, med ögonen som bär resten av blicken) och tiden är lyftets ruta för ruta (jämnade lugnt i stillhet och lätt i rörelse), kortet följer händerna (på högkant med ryggen mot kameran mellan händerna i bytet, i högern vikt bakåt in under handen så att framsidan kommer upp, fram framför fingret när handen lägger det, och pekfingret i kortets bortre hörn till höger i bilden tills det lyfter rakt upp), och inget kommer ur den förra standarddockans koreografi. Vårt eget är dockans mått, vilan (händerna plant på filten), de märkta bryggorna mellan vilan och lyftet (`made.faser`), högerns form medan den väntar platt på filten och medan den håller kortet som en knuten hand med tummen på det och handledens djup längs kamerans synlinje (det ett lyft inte vet), rättningar vid en kontakt (högst 2 cm), blicken (ett mål per stycke) och högerns väg böjd så att kortet landar där den riktiga dealerns kort låg (lyftets kort när det först ligger); kortet ligger där handen lägger det, i den vinkel det kom, och läggs inte till rätta på filten. Varje giv är två klipp med handbytet som ankare (`ankare-byte-<docka>.json`, A2M): skon till bytet (`lyft-<docka>-till-bytet.json`, stilens giv till mitten fram till bytet, samma för alla platser) och bytet till platsen och hem, ett per kortplats (`lyft-<docka>-bytet-p<n>.json` för kort 1 och `-bytet-p<n>c2.json` för kort 2, plats 1–7 i dagens numrering), som efter varandra är hela given (`lyft-<docka>-p<n>.json` och `-p<n>c2.json`) ruta för ruta. Bytet till en plats görs ur dealerns egen giv dit, annars ur den giv vars kortplats ligger närmast, riktad om (`riktaOm`: tiden efter vägens längd, handen vriden med kortets långsida, huvudet mot platsen); kroppen, högern och kortet går från exakt A2M mjukt in i den givens rörelse, vänstern går tillbaka till skon och ligger där, och kortet läggs på kortplatsen. `made.kalla` säger källan, om den är filmens egen giv eller riktad om, hur långt landningen flyttades och hur tiden ändrades. Kontrollen mäter varje handled mot lyftet, kortets landning mot målet (och att det inte vrids eller glider under fingret på filten), armen mot bålen, skakigheten, rycken i huvud, axlar, handleder, blick och fingrar mot dealerns, huvudets tre vinklar (sväng och största steg per ruta) mot dealerns, och blicken i vilan. Görs om när ett lyft eller skon ändras. |
| Lägg vårt bord över deras | `PY live-bj/verktyg/overlagg.py <stillbild> <vårt bord genom deras kamera, med alfa> <punkter.json> live-bj/data/scen.json <ut.jpg> [live-bj/data/mot-vart-bord.json]` | Vårt bord och vår docka halvgenomskinliga över en stillbild ur filmen, borden kant mot kant, och skillnaderna i tal. Bilden av vårt bord och `punkter.json` ritas av editorns sida och ligger i slasken. |
| Titta på måtten | `PY live-bj/verktyg/titta.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt live-bj/rutor/kontroll/<namn>.jpg <sekund> ...` | Ett ark med måtten ritade över filmens rutor. |
| Streckfigur | `PY live-bj/verktyg/streck.py live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt live-bj/rutor/streck-<a>-<b>.mp4 <a> <b>` | En film med dealern som streckfigur bredvid bordsbilden; `--bara` ger bara figuren. |

## Djup ur SAM 3D Body

SAM 3D Body (`facebook/sam-3d-body-dinov3`) läser en persons leder i meter ur en bild, given en ruta kring personen och
kamerans brännvidd och bildmitt (`verktyg/sam_runpod.py las`). Uppsättningen ligger utanför repot i `../sam-3d-body/`
(koden, modellen 2,8 GB och Python-miljön, 4,1 GB i allt). En gång (Python 3.13; `HF_TOKEN` i `.env.local` i roten,
med tillgång till den spärrade modellen hos Hugging Face):

```
py -3.13 -m venv ../sam-3d-body/.venv
../sam-3d-body/.venv/Scripts/python.exe -m pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision
../sam-3d-body/.venv/Scripts/python.exe -m pip install roma pytorch-lightning yacs omegaconf timm einops opencv-python-headless braceexpand huggingface_hub ftfy regex scikit-learn submitit termcolor torchmetrics scikit-image pandas
SAMPY live-bj/verktyg/sam_runpod.py installera ../sam-3d-body
```

**Livebordet**, här på datorn: 259 nyckelrutor ur de tio först lyfta styckena (givarna var femte lyftruta, väntan var
tionde och tätare kring kortets ögonblick); 70 är lästa, kamerans tre givar hela, och svaret står i
`data/sam-prov/livebordet-sam.json`, utan bilder. Fältet `djup` i varje lyft säger om det har SAM:s djup eller
MediaPipes. Att ta upp läsningen där den stoppades (cirka 190 rutor, 1–3 timmar; rutorna i slasken raderas när svaret
är sparat):

```
PY live-bj/verktyg/sam_runpod.py rutor live-bj/video/kalla.mp4 live-bj/data/kalla.json live-bj/matt slask/live-bj/sam/live live-bj/data/scen.json --tider live-bj/data/lyft --var 5 --vantan-gles 2 --tatt 2
mkdir -p slask/live-bj/sam/live-sam && cp live-bj/data/sam-prov/livebordet-sam.json slask/live-bj/sam/live-sam/sam.json
SAMPY live-bj/verktyg/sam_runpod.py las slask/live-bj/sam/live-sam slask/live-bj/sam/live/lista.json --tradar 3
PY live-bj/verktyg/sam_runpod.py spara slask/live-bj/sam/live-sam/sam.json live-bj/data/sam-prov/livebordet-sam.json
PY live-bj/verktyg/lyft.py giv live-bj/data live-bj/matt live-bj/data/lyft --sam live-bj/data/sam-prov/livebordet-sam.json
PY live-bj/verktyg/lyft.py kanda live-bj/data/lyft live-bj/data/uppsattning.json --ut live-bj/data/sam-prov/kanda-efter.json
```

`las` går med låg prioritet, tar upp där den slutade och läser givarnas rutor först. En ruta tar 49 s med tre trådar när
datorn är ledig, 1–2 minuter när andra arbetar; modellen körs i float32 (i bfloat16 tog en ruta 11 minuter).
`lyft.py giv --sam` tar SAM:s djup bara i ett stycke som SAM har läst igenom (`sam_covers`), så varje lyft har ett djup.

**Dockans prov**, där facit finns (mätningen och rutorna i slasken, läsningen på en hyrd maskin, betald: bara på Jakobs
ord; `RUNPOD_API_KEY` i `.env.local`):

```
PY live-bj/verktyg/mat.py <filmen> <källfil> slask/live-bj/sam/matt --steg 1 --ensam
PY live-bj/verktyg/sam_runpod.py rutor <filmen> <källfil> slask/live-bj/sam/matt slask/live-bj/sam/docka spelet --var 1
PY live-bj/verktyg/sam_runpod.py rutor <filmen> <källfil> slask/live-bj/sam/matt slask/live-bj/sam/docka-som-live spelet --var 1 --som live-bj/data/scen.json
node live-bj/verktyg/sam_runpod.ts kor slask/live-bj/sam/korning slask/live-bj/sam/docka/lista.json slask/live-bj/sam/docka-som-live/lista.json
PY live-bj/verktyg/sam_runpod.py jamfor slask/live-bj/sam/korning/docka.json <facit> slask/live-bj/sam/matt live-bj/data/sam-prov/jamforelse.json
PY live-bj/verktyg/lyft.py prov slask/live-bj/sam/matt <facit> --sam live-bj/data/sam-prov/docka-var5-som-livebordet.json --ut live-bj/data/sam-prov/lyft-prov-med-sam.json
```

Källfilen till `mat.py` och `rutor` är som `data/kalla.json`: hela filmen som ett parti. `kor` hyr det billigaste
NVIDIA-kortet med minst 8 GB för högst 0,35 USD i timmen och förstör maskinen efteråt; liggaren i ut-mappen håller alla
körningar under 90 minuter och 3 USD sammanlagt, och `--torr` gör allt utom att hyra. De två körningarna på dockan
2026-11-27 kostade 0,03 USD.

## Hur säker mätningen är

- **En kamera ger inget djup.** Handledens fart och väg räknas på två sätt, lagd på ett plan 5 cm över filten (för högt
  när handen lyfts eller går i djupled) och tvärs synlinjen (för lågt då); stilfilerna ger båda och deras geometriska
  medel. Prövat på dockans filmer, där facit finns (`docka.py`): den bästa skattningen hamnade inom en tredjedel.
  Fartkurvans form och sekunderna är väl mätta. Axlar och huvud läggs på ett upprätt plan 20 cm bakom filtens kant och
  håller på en tiondel när.
- **Lyftet** sätter axlarna där bålen antas sitta, lägger armbågen och handleden på sina synlinjer så att armens längder
  håller, låser handleden i höjd där kortet tas ur skon och där det läggs, och låter MediaPipe avgöra nära och fjärran.
  Mot dockans facit: varje led 4–11 cm fel i median, nästan allt i djupled (sidled och höjd 1–3 cm), den sämsta
  tiondelen upp till 20 cm för högerarmen, och farten för låg (0,6–0,9 av den sanna toppfarten). Använd lyften för
  bålens, axlarnas och huvudets rörelse och för handens väg i sidled och höjd; djupet är en skattning.
- **SAM 3D Body** på dockan, med bålen given: 1,7–5,0 cm fel i djupled i median, mot MediaPipe-lyftets 4,5–18 cm;
  genom lyftet gick högerns handled från 9,7 till 5,0 cm och armbågen från 9,3 till 3,6 cm (`sam-prov/jamforelse*.json`,
  `lyft-prov-*.json`). Vikten för SAM:s djup är 5 (`lyft.py`, `SAM_KEY`): från 5 och uppåt syns SAM:s egna fel. SAM:s
  överarm blir 0,4 och underarm 1,9 cm för korta (`--sam` lägger tillbaka det), och SAM:s axeldjup gjorde lyftet sämre,
  så axlarna står kvar på ett plan. Mot bordets kända punkter (`lyft.py kanda`) gick högerns grepp där kortet läggs från
  6,9 till 5,2 cm fel i djupled.
- **MediaPipe på dockan:** handleden hamnar 14–40 bildpunkter från dockans sanna, blinkningar går inte att mäta på en
  docka utan iris, och ett kort stopp kan missas.
- **Korten på bordet** hittas säkert (inget av cirka 62 missades i 16 slumpade rutor; ungefär vart åttonde funnet kort
  är en extra rektangel i en tät solfjäder). **Kortet i handen** syns bara i 23 % av rutorna mellan sko och bord, så
  vändningen ges som ett fönster, och kortets fart i handbytet går inte att få.
- **Fingrarna:** handen är 40–55 bildpunkter; måtten säger att greppet lever, inte ledernas vinklar. Munnen öppnas
  nästan aldrig. Höften, midjan och armens delar är dolda eller går inte att mäta framifrån. Bålens avstånd bakom kanten
  är skattat (0,07 och 0,16 m), och bålens lutning framåt syns inte i lyften.
- **Det som inte går att avgöra:** höjden över filten utom i de lyfta givarna; kortets nummer där kortet inte sågs landa;
  händerna när spelets knappar ligger över dem (luckor i måtten, inte rörelse); om ett stopp vid en plats är en
  rättning eller en pekning; och blicken mer noga än åt vilket håll huvudet är vänt och om ögonen är sänkta.
- **Inte kontrollerat i bild:** slagen vid dealerns egna kort, svepen och sträckningarna i `rorelser.json`. I
  `segment.json` är svepet, korten in, dealerns kort, SKON och ANNAT sedda i bild i några fall var; PEKA och RATTA är
  för få.
- **Kända fel i måtten:** partierna 25–35 s och 41–47 s är inzoomade 0,6–2 % utan att `ram.py` ser det; `scen.py` och
  `kort.py` rättar det, `mat.py` inte (1–2 bildpunkter fel vid händerna). Kortlekens längd i skon är läst i två rutor,
  och den krymper när korten delas ut.
- **Så läses talen:** vänster och höger är dealerns egna (skon står vid hans vänster, till höger i bilden), men
  platserna P1–P7 räknas från bildens vänster. Längder står i bildpunkter i bordsbilden (1728×972) och i dealerns egen
  axelbredd i bilden, så att de går att föra över till en figur av en annan storlek; meter räknas genom kameran i
  `data/scen.json`. Var en hand är avgörs av punkten mellan tummens och pekfingrets toppar, lagd på filten; bara
  vänsterhanden räknas som vid skon. Dealern skiljs från dealrarna vid borden bakom genom att deras hörn målas över, och
  händerna och ansiktet söks i en ruta kring handleden och näsan.

## Det som är uppmätt, i korthet

Talen står i `data/` (medianer i `monster.json`, meter och hur säkra de är i `stil-*.json`) och, bredvid koden, i
`../MATT.md`.

- **Två dealers:** A (404 s mätta) är stilen `kameran` (söker kameran, lutar bålen mot skon), B (446 s) stilen `bordet`
  (snabbare, stilla bål, blicken på bordet). Jakobs arbetsnamn för dockorna på stilarna är Danilo och Frasse (fältet
  `docka`); ur mätningen tas kroppens mått, hållningen och rörelsen, aldrig utseendet.
- **Tekniken:** vänstern hämtar varje kort ur skon och drar det plant över filten in mot mitten; högern tar över och
  lägger det. Mötet ligger 0,11 / 0,14 m åt dealerns vänster och 0,16 / 0,11 m fram från kanten, inte vid skon.
  Handbytet är en verklig inbromsning (handen med kortet ned till 0,09 m/s), med greppen en kortlängd isär. Fingrarna
  tar kortet mitt på ryggen, cirka 3 cm över filten, och drar det ut under skons front. Det `scen.json` kallar `mouth`
  är inte skons mynning utan en lös genomskinlig bit som ligger plant framför skon.
- **Händerna i otakt:** vänstern väntar inte vid skon utan griper nästa kort när det förra ligger (0,0 / 0,1 s i
  median). Frasse går nästan aldrig hem mellan korten (54 av 56), Danilo 8 av 26 gånger (`segment.json`, `otakt`).
- **Dealerns egna kort** ges oftast som en spelares, med handbyte och högern som lägger (14 och 21 gånger, mot vänstern
  ensam 4 och 4); `rorelser.json` räknar dem som vänsterns, eftersom det letar efter högern bara på platserna. Bordet ger
  dealerns kort med framsidan upp, utan hålkort.
- **Kroppen följer handen:** bålen börjar med handen och flyttar sig 2–5 cm i sidled. När A:s vänster är vid skon är
  bålen vriden så att axlarna ser 12 % smalare ut, och huvudet vridet 20° dit; B når skon utan att flytta bålen, med
  huvudet 15°. Högern rör sig medan vänstern sträcker sig mot skon i 64 % (A) och 94 % (B) av turerna. Huvudet rör sig
  21–24 gånger i minuten. Handen som inte ger står nästan aldrig still, och i
  vilan rör sig näsan ett par millimeter och huvudet en halv grad över två sekunder: stilla, men aldrig fryst.
- **Blicken och blinkningarna:** A har blicken sänkt 26 % av tiden och ser upp i kameran när han sträcker sig mot skon,
  B 54 % och ser på bordet genom hela given; båda ser mest i kameran medan insatserna läggs. 17,5 och 18,3 blinkningar i
  minuten, ojämnt, var tionde dubbel.
- **Bordet och kameran:** kameran är räknad ur 29 ensamma kort (0,54 bildpunkters fel per hörn) och kontrollerad mot
  filtens rundade kant (1,8 mm fel över 1234 punkter); korten är pokerkort (63,5 × 88,9 mm). Dealern sitter på en hög
  stol, som syns vid dealerbytet. Golvet syns aldrig: att filten står cirka 0,95 m över golvet (± 0,1) och sitsen
  0,67 m är en slutledning ur ögonhöjden när de står.
- **`segment.json`** delar hela filmen per dealer och per hand (höger, vänster, och huvudet med blicken), i filmens
  rutor (60 i sekunden), med kategorin ur rörelseschemat (`../standarddocka/rorelsekatalog.json`; reglerna i
  `verktyg/segment.py`), plats och kort där det går att säga (D är dealern), handens läge i början och slutet, och hur
  säker indelningen är (`syns`, `saker`; 84–90 % av styckena är säkra). `lagen`, `bada_stilla` och `overgangar` ger
  lägena per hand, `for_ritade_rorelser` delarna av en giv med handbyte, och `att_lyfta` och `basta` det en hel runda
  behöver, i ordning, med de bästa styckena och bryggorna.

## Kvar att göra

- Fler lyft, i den ordning `att_lyfta` säger: dealerns kort, väntan, svepet och korten in.
- SAM:s djup för bordets givar och väntestyckena: läsningen tas upp där den stoppades (ovan), sedan `lyft.py giv --sam`.
- Låta `ram.py` se inzoomningen (smala kontrollrutor intill bildens kant) och köra om `mat.py` för de två partierna.
