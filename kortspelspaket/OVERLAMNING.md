# Överlämning: paketets rörelser till standarddockan

För den agent som tar paketet vidare in i arbetet med standarddockan (Jakob 2026-11-26: "en rejäl överlämning" som "en
agent på main skulle kunna använda sig av"). Läs `AGENTS.md` här först; vad paketet innehåller, visaren och vägen i
fyra steg står i `README.md` och upprepas inte här. Skriven 2026-11-26; stryk det som inte längre stämmer.

## Läget

- Allt ligger i `main`, i den här mappen. Det köpta är uppackat i `paket/` på Jakobs stationära dator (Git har det
  inte; `node kortspelspaket/packa-upp.ts` gör om det ur de tre köpta filerna i Hämtade filer).
- Visaren (`STARTA visaren.cmd`, port 4330) visar paketets egen figur, en robotkatt, vid spelets bord. Det är bevisat i
  bild att paketets mått passar vårt bord. Standarddockans man och kvinna kan väljas i stället för katten och spelar
  då alla 66 rörelserna omräknade till sitt skelett (`visa/docka.ts`; `README.md`, "Dockan i paketets rörelser"). Det
  är ett prov i visaren: inget är gjort i dockans egna verktyg (editorn, studion, Blender).
- Jakob har sett bordsvyn och pekat på felen (nedan). Han vill ha två spår: katterna vid bordet arbetas vidare här, och
  rörelserna förs över till dockorna av den som äger dem.

## Uppdraget

Steg 1 i `README.md`, "Vägen": standarddockans man gör en utklippt giv (giv 3, till plats 4, 10,7–13,8 s i
`AS_Blackjack_Dealer_DealCard`) vid bordet i spelets vy, så att Jakob kan se den bredvid dockans egen ritade giv och
döma. Hur det görs väljer den som äger dockan. Två vägar:

- **Vinklar:** paketets leder översätts till dockans (tabellen nedan) och rörelsen blir ett klipp på dockans skelett.
  Prövad i visaren (`visa/docka.ts`, mätt med `verktyg/mat-docka.ts`): handlederna hamnar 3 cm från paketets figurs,
  i sidled, och handlederna är 3–5 cm längre isär än kattens när kortet byter hand. Händerna måste alltså styras mot
  varandra och mot bordet för att given ska hålla för hans domar. Kortets byte av hand (`visa/kort.ts`) är inte heller
  ett grepp: kortet glider 5–8 cm och vrids 64–84 grader på 0,16 s mellan två uträknade lägen, lika hos katten. Det
  ska i stället byta hand först när högerns tumme och pekfinger är framme, och stå stilla i bytet.
- **Lägen** (inte prövad): paketets leder räknas om till det dockans egen kod redan tar emot (axel, armbåge, handled, handens 21
  punkter, blick; `../blackjack-dealer/dealer3d/src/figure-model.ts`, `pose`), skalade till dockans kropp. Då ställer
  dockans kod kroppen, och hans domar om händer på filten och armar över kanten kan prövas som för en ritad giv.

## Så läses en rörelse

- Filerna: `paket/fbx/CardGamesAnimationPack/Animations/AS_*.FBX`, en per rörelse (samma filer finns under
  `paket/unity/Assets/`). 30 bilder per sekund, 89 led, alla fingrar med tre leder och ett mellanhandsben.
- Enheten är centimeter, z är upp, och den som sitter är vänd mot minus y. Till meter med y upp: `(x, z, -y) / 100`.
- Läget bärs av två led: `root` (cirka 95 cm från ramens mitt, med en liten vridning) och `pelvis` under den. Höften
  hamnar omkring (2, 115, 54): 115 cm från mitten, 54 cm över golvet. Alla andra led bara vrids.
- Paketets bord: skivan 78 cm över golvet (fingrarnas leder ligger 80–81 cm över golvet i vilan; vid 78 ligger
  figurens fingrar på filten, vid 80 sjunker de ner i den), plan, utan upphöjd kant och utan nedsänkt bricka. Vid spelets bord läggs den skivan på filten (y = 0) och dealerns höft 15 cm bakom dockbordets kant; talen och
  uträkningen står i `visa/bord.ts` (`PACK`, `DEALER_BEHIND`).
- I three.js: `FBXLoader` läser filerna. Paketets figur har `root` som en grupp som reser figuren (z upp till y upp),
  inte som ett led, så rotens rörelse måste läggas in i höftens innan rörelsen spelas (`fit` i `visa/visa.ts`).
- Blender läser FBX-filerna utan fönster (`blender -b`); det är inte prövat här.
- En viss ruta i bild: `http://127.0.0.1:4330/kortspelspaket/visa/?vy=bord&kamera=topp&spelare=nej&t=12.7`,
  eller som fil med `node kortspelspaket/verktyg/titta.ts` (`README.md`, Kartan).

## Leden: paketet mot dockan

Paketets skelett är Unreals standardskelett, dockans har Mixamo-namn (`../avatar-auto-pipeline/new_docka.md`, avsnitt
7). Paren är prövade i `visa/docka.ts`, där tabellen `PAR` är den som gäller: ryggen följer `spine_02`, `spine_04` och
`spine_05`, nacken `neck_01`, och underarmens vridning läggs på dockans vridben. `_l` och `_r` är figurens egen vänster
och höger.

| Paketet | Dockan | Att tänka på |
| --- | --- | --- |
| `pelvis` | `Hips` | Bär också läget |
| `spine_01` … `spine_05` | `Spine`, `Spine1`, `Spine2` | Fem led blir tre: vridningarna slås ihop |
| `neck_01`, `neck_02` | `neck` | Två blir ett |
| `head` | `Head` | |
| `clavicle_l/r` | `LeftShoulder`, `RightShoulder` | |
| `upperarm_l/r` | `LeftArm`, `RightArm` | `upperarm_twist_*` har ingen motsvarighet |
| `lowerarm_l/r` | `LeftForeArm`, `RightForeArm` | |
| `lowerarm_twist_02`, `_01` | `ForeArmTwist1`, `Twist2` | Kontrollera ordningen: i paketet ligger `_01` närmast handleden |
| `hand_l/r` | `LeftHand`, `RightHand` | |
| `thumb_01–03`, `index_01–03`, `middle_`, `ring_`, `pinky_` | `HandThumb1–3`, `HandIndex1–3`, `HandMiddle`, `HandRing`, `HandPinky` | `*_metacarpal_*` har ingen motsvarighet |
| `thigh`, `calf`, `foot`, `ball` | `UpLeg`, `Leg`, `Foot`, `ToeBase` | |

Utan motsvarighet i dockan: `ik_*`, `interaction`, `center_of_mass` och vridbenen i lår, vad och överarm. Dockans
ansiktsben, IK-kontroller och `rot` rörs inte av paketet. Vilan skiljer sig (olika armvinkel, olika lokala axlar), så
vinklar kan inte kopieras rakt av: varje led behöver sin omräkning mellan de två vilställningarna.

## Blackjackdealerns giv i tal

Mätt i paketets eget skelett (inte kattens kropp), med höften ställd som i bordsvyn. Läget är högerhandens yttersta
pekfingerled när handen är längst ut, i dockans linsvärld (meter; x åt dealerns vänster, z mot spelarna).

| Bit | Händerna ute | Längst ut | Fingerleden (x, z) | Närmaste kortplats (x, z) |
| --- | --- | --- | --- | --- |
| Giv 1 | 1,57–4,63 s | 4,00 s | −0,47, −1,75 | P1.C1 −0,53, −1,61: 15 cm innanför |
| Giv 2 | 6,20–9,20 s | 8,20 s | −0,41, −1,42 | P2.C1 −0,36, −1,55: 13 cm bortom, vid insatsringen |
| Giv 3 | 10,83–13,73 s | 12,73 s | 0,00, −1,43 | P4.C1 −0,02, −1,45: på platsen |
| Giv 4 | 15,40–18,40 s | 17,13 s | 0,32, −1,45 | P6.C1 0,33, −1,55: 10 cm bortom, vid insatsringen |
| Giv 5 | 19,97–23,00 s | 21,93 s | 0,49, −1,73 | P7.C1 0,50, −1,61: 12 cm innanför |

Varje giv börjar med att vänster hand sträcker sig ut till en sko vid dealerns vänstra sida (längst ut cirka 0,4 s in
i biten) och för kortet in mot mitten, där höger hand tar det (cirka 1,4 s in) och lägger det; i `visa/kort.ts` räknas
de tiderna ur rörelsen och ett kort följer händerna. Mellan givarna ligger båda händerna
stilla i vilan i cirka 1,6 s. Vilan: handlederna 30 cm framför höften, 22–27 cm åt var sida.

## Det som skiljer mot Jakobs domar

Hans domar står i `../standarddocka/DOMAR.md`. Mot dem:

- Given går ur en sko vid dealerns vänstra sida, med vänster hand som drar och höger som lägger, som hans dom säger
  (sett i bild 2026-11-26). Rörelsen har inget kort och ingen sko: de finns bara i visaren.
- En giv tar cirka tre sekunder; hans takt är högst en sekund ut och 0,6 tillbaka.
- Fem platser i en båge, inte sju, och bara plats 4 träffas på korten.
- I bordsvyn sjönk kattens händer ner i filten, och spelarnas armar går genom den vadderade kanten och låren in i
  sargen (hans bilder 2026-11-26: "allt är inte kanon"). Händerna är rättade (figuren stod 2 cm för lågt). Armarna och
  låren beror på paketets plana bord och längre kropp (186 cm), inte på rörelserna; det rättas inte med att flytta
  figuren utan med att händerna styrs efter vårt bord.

## Regler som följer med

- Inget ur `paket/` kopieras till en mapp Git har, inte heller en enstaka rörelse. En omräknad rörelse är inte paketet,
  men är media och går inte heller in i Git.
- `sekvenser.json` är Jakobs: det han har sparat skrivs inte över.
- Inga betalda anrop (Meshy, Runway) med paketets filer utan hans ord.
