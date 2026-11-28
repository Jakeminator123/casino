# Status

Läget och nästa steg. Ersätt det som inte längre gäller; historien står i Git. Jakobs egna ord står i
`../standarddocka/DOMAR.md`, målet och kedjan i `../PROJEKTET.md`, och vad proven med Runway har visat i skillen `runway`.

## Läget (2026-11-28, kväll)

- **En standard: livebordet,** klonat ur Youtubefilmen av ett riktigt livebord: kameran, bordet, skon, korten och
  kortplatserna (`src/table-live.ts`, kortet i `src/space.ts`, det allt läser i `src/standard.ts`; `../MATT.md`). Det
  som filmar, efterarbetar och tar emot en ny dealer läser bara den källan (granskat 2026-11-28). Antaget och inte
  mätt: hur långt bakom bordskanten dealern sitter (0,2 m i koden; mätt samma dag till 18–20 cm), bordets höjd över
  golvet, vridningen på 7 av 20 kortplatser (speglade), och kortplatsen P3.C2 (härledd).
- **Kvar av det förra** (ett eget steg): kortplanens värld (`src/plan-lens.ts`, `card-plan.ts`,
  `placements/default.json`), den äldre dealerns beställningsväg och träd, och bankens register. Det räknar i bankens
  bild, 1764 × 1174, och två ställen i spelet läser den ännu: rummet bakom bordet (`data/scene-contract.json`) och
  skons fönster som förval (`SHOE_BOX` i `src/scene3d-matte.ts`). Hans filer där är orörda.
- **Beslutat 2026-11-28: en grunddocka och en rörelsesamling** ("en enda grunddocka som skalar och bär alla rörelser,
  som är plockad från olika dealers"). I dag är det inte så: Danilo och Frasse är två dockor med var sin uppsättning
  rörelser (`dealer3d/src/doll.ts`), och persondockorna Kenji och Amara byggs på Danilos (`persondockor.ts`).
- **Dockornas kroppar** är en medelmans med två av dealerns mått. Mätta ur filmen med SAM 3D Body
  (`../live-bj/data/kroppar.json`) är dealrarna några centimeter smalare än dockorna (axlarna 33,7 och 32,2 cm mot
  35,7 och 34,8; bröstet 88 och 86 mot 91), nära mätningens osäkerhet, och Danilo och Frasse skiljer sig ett par
  procent. Provdockor med de måtten finns (`standarddocka_danilo_film`, `_frasse_film`, provet
  `dockans-kropp-ur-filmen-20261128`); dockorna som används är inte bytta. Det som gör att dockan ser fel ut är alltså
  inte benens mått: den är naken och skallig, händerna är en medelmans, och axelns yta går sönder när armen sträcks.
- **Givarna finns till alla sju platser, kort 1 och kort 2,** efter en modell: en gemensam första halva
  (`lyft-<docka>-till-bytet`, A2.3 till handbytet A2M) och en andra halva per plats och kort
  (`lyft-<docka>-bytet-p<n>`, `-p<n>c2`); hela given (`lyft-<docka>-p<n>`, `-p<n>c2`) är halvorna efter varandra.
  Källan är filmens egen giv till platsen där dealern har en där högern lägger kortet (Danilo dagens plats 2, 4, 6
  och 7; Frasse 1, 4, 5, 6 och 7), annars den närmaste platsens riktad om (Danilo 1, 3 och 5; Frasse 2 och 3);
  rörelsens `made` säger vilket. `../live-bj/verktyg/lyft.py giv` lyfter alla sådana givar, `dealer3d/tools/
  lyft-till-docka.ts --alla` lägger dem på dockorna, och `lyft-kolla.ts` spärrar ryck och fel (inte grön).
- **Domarens dom på sekvensen med kort 1 till alla platser: Inte bra** (provet `givar-till-alla-platser-20261128`;
  domarens ord, inte Jakobs). Håller: inget hopp i någon skarv, kortet dras, tas, vänds och landar i ramen på alla
  platser, och Danilos takt till plats 4 är förlagans. Fäller: vänsterhanden hänger i luften efter bytet i varje giv
  (förlagan: lågt och rakt tillbaka till skon på sex rutor), höger axel går sönder mot dagens plats 2 och 1, Frasses
  givar till dagens plats 5, 4 och 3 tar en omväg, och i väntorna står händerna på fingertopparna och ansiktet
  blundar och ler. Rättningen pågår, först det Jakob själv såg: ett kort som flög tillbaka till skon i sista rutan,
  två kort på platsen, och delarnas namn i editorn (given går från A2.3 till A2.3, inte från och till vilan).
- **Saknas i samlingen:** givarna där vänstern ger ensam (de flesta nära skon och alla dealerns egna kort: Danilo 12
  gånger i filmen, Frasse 16), korten in i lådan, svepet, och väntan under insatserna och medan spelarna väljer.
  Filmen har inte att vända det dolda kortet eller markerna.
- **Editorn** (`../standarddocka/editor/`, studions sida Dockan) spelar en rörelse eller hela sekvensen och filmar
  genom sju kameror: plats 4 är livebordets och är mätt, de andra sex är räknade ur den. Den ritar bordets eget kort
  (mönstrad rygg med vit kant). Ramarna på filten visar var dealrarna lade kort 1 och 2; de finns inte på filmens
  bord. Stolen syns bakom dockan, vilket filmens inte gör (dealrarna sitter på en hög stol). Jakob 2026-11-28 vill se
  handens leder, en zoom som inte blir vidvinkel, och kort som böjs.
- **En ny dealer ur bilder:** `python ny_dealer.py <person>` i `../avatar-auto-pipeline/` (skillen `ny-dealer`). De
  fria stegen (måtten, dockan, rörelserna, dockfilmen, anropen) går utan handpåläggning på sex minuter; Amara var den
  andra personen (provet `amara-ny-dealer-20261128`). Av sex mått som kan tas in tas bara de som skiljer mer än
  mätningens osäkerhet: Amaras docka är Danilos med 1,8 cm kortare underarm. Kön, längd, händer och kroppsform tas
  inte ur bilderna, och sitsen är dealerns för alla. Texterna till modellerna skrivs efter vem `--utseende` säger att
  personen är.
- **Sättet för en persons film:** fyra ankarbilder och tre klipp i Kling 4 med dockans film av varje steg som
  referensfilm och röd kortrygg (`--ankarklipp --rygg rod`), och efterarbetet i steg 7
  (`../standarddocka/verktyg/lagg-pa-bord.ts`). Kling följer dockan till 96–98 %, så dockans fel blir filmens. Kenjis
  fem omgångar: hans dom på de tre första är Inte bra, den femte har domarens Nja. Kvar i efterarbetet: tumtoppen i
  farten. Amaras film är förberedd (238 krediter) och beställs inte: dealrar som redan är gjorda räddas inte.
- **Studion** (`http://127.0.0.1:4319/studio/`): Start, Avatarer, Dockan, Karta med Schemat, Beställ, Granska med
  Prov, Casino, Mått, Spegla (vår vy över Youtubefilmen ruta för ruta; filmen strömmas och kopieras aldrig),
  Biblioteket och Beslut. Ordlistan är omskriven 2026-11-28. Spelet ritar bordet, skon och korten men ingen dealer.
- **Lagret** är städat 2026-11-28 (`node ../lager.ts`: allt registren pekar på finns): gamla inspelningar och den
  förra standardens kvinna är raderade, dess bord ligger i arkivet `casino-arkiv-paow-och-forra` bredvid repot.
- **Pengar:** Runway 4 091 krediter; inget använt 2026-11-28. Av hans budget på 3 000 för arbetet är 1 055 använda
  (Kenji). Ett betalt anrop i en ny chatt går inte igenom förrän han har sagt ja i den chatten. Meshy 363, orört.
  Den externa domaren (OpenAI) har ett tak på 5 USD per tolv timmar.

## Nästa steg

Jakob 2026-11-28: "huvudsaken är ju att vi kan få in alla rörelser hämtade ur Youtubefilmerna", och "Försök inte rädda
dealers som skapats". I den här ordningen om han inte säger annat.

1. **Domarens fynd i givarna rättas, och döms om:** vänstern lågt och rakt tillbaka till skon efter bytet, höger axel,
   Frasses omväg, väntornas händer och ansikte, och kortet i bytet (reses lågt vid filten, som dealerns).
2. **En grunddocka och en samling.** Gemensamma ankare (A1, A2.3, A2M), och varje rörelse från den dealer som gjorde
   den bäst, med andra som varianter; en lucka hos den ene fylls med den andres riktiga rörelse. Sitsen ska följa
   armlängden när dockan skalas.
3. **Vänstern som ger ensam,** vilket ger dealerns egna kort (kräver sin egen ordning för kortet i vänsterhanden, och
   att `lyft.py` lyfter till dealerns plats). Sedan korten in i lådan (en ruta bär i dag ett enda kort), svepet,
   väntorna, och en ordnare som spelar en runda i spelets ordning.
4. **Dockan:** det som syns (händerna, axelns yta; skjorta, väst och hår om han vill se det), dockans vila i Blender
   (`SITT` i `../avatar-auto-pipeline/scen/bygg_docka.py` står på en äldre plats), och en persons kön, längd och form.
5. **Editorn:** handens leder som visningsläge, zoomen, böjliga kort, ramarna och stolen som filmens.
6. **En persons film med den nya samlingen,** först från en kamera tills han säger ja, sedan alla sju. Första halvan
   av given görs en gång per person och kamera. Betalt, på hans ja.
7. **Det sista av den äldre dealern bort,** och platserna och namnen rättade i ett steg (plats 1 närmast skon;
   lyftfilernas `hoger` och `vanster` är bildens sidor; stilarna `kameran` och `bordet`; mappen `standarddocka`).

## Väntar på Jakob

- **Prov från 2026-11-28:** `givar-till-alla-platser-20261128` (domaren: Inte bra), `dockans-kropp-ur-filmen-20261128`
  (inte dömt; han vill se filmens rutor bredvid, som läggs i `../live-bj/rutor/jamfor/kropp/`), och
  `amara-ny-dealer-20261128` (domaren: Inte bra; han: "okej, men inte den bästa").
- **Frågor från 2026-11-28:** RunPod för SAM 3D på alla rutor (ett tak i kronor, och hans ord om att rutor ur filmen
  får skickas till hans hyrda maskin); om dockan ska kläs som dealern på prov; om ramarna bara ska vara en hjälp i
  editorn och stolen göras som filmens; och mer film (hjälper mest för det filmen saknar: det dolda kortet, markerna,
  fler givar med vänstern).
- **Kenjis filmer:** `kenji-rod-rygg-tre-klipp-20261127` (femte omgången, domarens Nja) är den han ska se;
  `kenji-tre-klipp-mellan-ankarbilder-20261127` är ersatt och kan flyttas till arkivet på hans ord.
- **Prov från 2026-11-27 utan hans dom:** domaren Bra på `kartan-over-schemat-20261127`, `studion-i-roten-20261127`,
  `skon-med-liggande-kort-20261127`, `hela-filmen-indelad-20261127` och `ansikte-ur-framstalld-film-20261127`;
  domarna oense om `lyftet-troget-filmen-20261127` och `tomasz-med-dockans-hander-20261127`; domaren Nja på
  `tomasz-dockan-pa-hans-matt-20261127` och `studion-mindre-text-20261127`; inte dömda: `biblioteket-20261127`,
  `scen-ratt-film-20261127`, `livebordet-i-spelet-20261127`, `efter-nja-eget-kort-och-takt-20261127` och
  `visning-for-chefen-20261127`.
- **Dömda av honom, står kvar som prov:** `livebordet-klonat-20261127` och `danilo-frasse-kroppar-20261127` Bra;
  `dealerns-handled-20261127`, `kenji-ny-dealer-ur-bilder-20261127` och två filmer i
  `sju-bilder-vid-livebordet-20261127` Inte bra; `tomasz-gor-danilos-giv-20261127` Nej; `runway-3d-20261127`
  ("meshy/vår docka bäst").
- **Blicken vid skon.** Hans dom 2026-11-26 säger att blicken vid skon är på skon. Danilo ser mot bordets mitt när
  han drar kortet, och Frasse vrider huvudet 29° mot skon; dockorna följer de riktiga.
- **Meshy,** och **Avaturn-figuren** (han laddar själv upp de tre bilderna i `../avatar-auto-pipeline/output/
  tomasz-avaturn/` på avaturn.me). **Git-historien:** ett namn står kvar i historien; den skrivs om på hans ord, eller
  så görs repot privat.

## Kända brister

- `lyft-kolla` är inte grön för någon docka: fingrar i kortet, kortet utan stöd i några rutor, armen in i bålen.
- Händerna: vänstern är en klo vid skon, tummen är tunn och spetsig, och handens mått är en medelmans.
- Danilos huvud är kalibrerat mot ansiktsnätet, Frasses räknat från vilan; en persons huvud inte alls.
- De nya lyften har MediaPipes djup; SAM har bara läst 70 nyckelrutor, nästan alla Danilos.
- Spegla visar en inspelning av dockan bara när filen är nyare än rörelsens fil, så varje omskrivning av rörelserna
  kräver en ny inspelning.
- Kling 4 ger 24 bilder per sekund, minst 3 sekunder, och kan göra en enstaka ruta där hela bilden skalas (`--hall`).
- Den externa domaren ser inte det riktiga klippet, så den fäller det den riktiga dealern faktiskt gör.
- Spelet låser sig när ett svar går förlorat ("The session is at version N") tills sidan laddas om.
- Fullmaktens dagstak räknar bara den här utcheckningens liggare. Ingen granskare kan höra: ljud bedöms av Jakob.

Önskemål, inget beställt (2026-11-11, 2026-11-13): ett tredje och fjärde dealerkort, kaffe ur en mugg i bilden, en
animation på bordet, marker som dealern tar och betalar, en andra spelarfigur.
