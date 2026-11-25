# Löpande bandet: från en bild till en färdig dealer

Den enda vägen för att göra nästa dealer och varje film, med alla format och namn. Slå upp en station eller ett avsnitt
(sök på rubriken), läs inte hela. Detaljerna står där de hör hemma: [handboken](film-prompting.md) (hur en beställning
komponeras, vad som har hållit), [beställningsagentens instruktion](order-clerk.md) (lägga, hämta, efterarbeta, mäta),
[granskningen](film-review.md), `data/dealer-standard.json` (standarden varje ankare följer), `data/order-methods.json`
(metoden per steg), och `docs/lage/film.md` (filmbanans läge). (V) = läst i kod, data eller kvitto; (S) = skattat.

## Den enda vägen, kort

1. Lägg in dealern: en post i `data/dealers.json` och en dealer i `data/media-roles.json` (huvudagenten).
2. Ingångsbild: studions Material, Lägg till bild, roll `ingangsbild`; Jakob väljer.
3. Keystone stående och sittande: Nano Banana Pro 4K med ingångsbilden; Material, roll `keystone`; Jakob sätter `gäller`.
4. Ankare 1: redigering med mallen `tools/texts/ankare-1.txt` (utseende och händer fylls i), efterarbete enligt `tools/order-clerk.md` §5; Jakob `gäller`.
5. Ankare 2.1 och 2.2: Beställ, steg `ANKARE-2.1` och `ANKARE-2.2`, samma efterarbete; Material, Jakob sätter `gäller`.
6. Se vad som saknas för en runda: `node tools/produce.ts <dealer>`, eller blocket "Det här saknas för en runda" i Bordet, Beställ, Kön.
7. Välj metoden efter Jakobs egna domar: `node tools/verdicts-per-method.ts <dealer>`; skriv den i `data/order-methods.json`.
8. Gör utkasten: `node tools/produce.ts <dealer> --draft` (ett prov: `--draft --trial <steg|plats>`), eller i Bordet, Beställ.
9. Godkänn: upp till 500 krediter `node tools/order-approve.ts <id> --mandate "…"`; större bara Jakob, med klicket i Bordet, Beställ, eller `--jakob "<hans ord>"`.
10. Lägg och hämta: en beställningsagent enligt `tools/order-clerk.md` (`tools/order-put.ts`, `tools/order-collect.ts`).
11. Efterarbeta: `node tools/film-after.ts <id> <n>`; en stillbild med `tools/still-after.ts` och `tools/python/`.
12. Granska: en oberoende granskare enligt `tools/film-review.md`; domen in med `node tools/order-put.ts review`.
13. In i banken och Material: `node tools/order-bring.ts <id> <n>`; en tur och retur delas av sig själv och kortspåret görs i samma körning.
14. Jakob dömer i Granska; har han lämnat över domen för vissa filmer: `node tools/review-put.ts` (preliminär dom).
15. Spela en runda: `game.html?dealer=<id>` eller studions Casino; börja om från rad 6 tills listan säger att rundan är klar.

## Vem beslutar

- **Jakob:** klick och domar i studion: i Material vilken bild som `gäller`, i Granska en films dom (Primär, Godkänd,
  Variant, Underkänd). Han kan också godkänna en order själv.
- **Huvudagenten:** godkänner beställningar på hans uppdrag (`approval.by: "huvudagent"` med uppdraget citerat) inom
  `data/order-policy.json`, för in i banken, och sätter en preliminär dom bara när han har lämnat över domen.
- **Beställningsagenten:** lägger exakt det som är godkänt och hämtar det.
- **Granskaren:** en underagent som inte beställde filmen. Föreslår; beslutar bara preliminärt, med huvudagenten och på
  Jakobs uttryckliga ord.

Metoden väljs efter Jakobs domar, inte efter granskarens poäng (`tools/verdicts-per-method.ts`).

## Stationerna

**1. Dealern i registren.** En post i `data/dealers.json` (`id`, `name`, `look`, `films.prefix` = `<id>-`) och en
dealer i `data/media-roles.json`. Utan posten vägrar Beställ ("finns inte i data/dealers.json", `tools/order-store.ts`),
och studions dealerväxel visar henne inte (V). Huvudagenten på Jakobs ord; kostar inget.

**2. Ingångsbild.** Vilken bild som helst av personen. Material, Lägg till bild, roll `ingangsbild`:
`assets/keystones/<dealer>-<namn>/ingangsbild.png|jpg` med `receipt.json`, som `kandidat` (`uploadTarget` i
`studio/lib/media.ts`, `add` i `tools/media-roles.ts`) (V). PNG eller JPEG, högst 40 MB. Jakob väljer.

**3. Keystone, stående och sittande.** Förlagor i hög upplösning på vitt; spelas aldrig; inget steg i Beställ (`STEPS` i
`src/order-model.ts`) (V). Paows: Nano Banana Pro 4K, ingångsbilden som `@woman` och ett ankare som pose, 3584 × 4800
och 4800 × 3584 (V). Material, roll `keystone`, `assets/keystones/<dealer>-<namn>/keystone.png`. Likhet:
`tools/python/identitet.py` och oberoende granskning i full upplösning. Jakob sätter `gäller`. 40 krediter per 4K-bild
(`data/order-policy.json`).

**4. Ankare 1 (vila, nod `IDLE`).** En redigering, inte en ny person i en annans ruta (det gav vaxig hud och för kort
kropp) (V). Nano Banana Pro 4K 4:3 med `@anchor` = ett ankare 1 i bankens ruta (sko, grönt, pose) och `@woman` =
dealerns bild. Texten är mallen `tools/texts/ankare-1.txt`, med platser för kläderna, utseendet och händerna och Paows
ifyllda text som exempel. För en tredje dealer, eller en ny uppsättning av samma, är `@anchor` ett ankare 1 som gäller
(S). Inget steg i Beställ: ordern skrivs för hand och läggs genom Runways verktyg (V). Efterarbete:
[order-clerk.md §5](order-clerk.md). Oberoende granskning, Material (`ankare-1`,
`assets/anchors/<dealer>-<namn>/anchor.png`), Jakob sätter `gäller`. 40 per bild, två bilder.

**5. Ankare 2.1 (nyp, `READY`).** Beställ, steg `ANKARE-2.1`: Nano Banana Pro 4K 4:3, `@anchor` = ankare 1 som gäller,
och texten; ingen posebild, och dockan är posekällan framåt. Två tagningar, 80 krediter. Sedan station 9–12;
stillbilden blir `kandidat` i Material och Jakob sätter `gäller`. Utan posebild är steget oprövat (S).

**5b. Ankare 2.2 (släp, `READY-B`).** Beställ, steg `ANKARE-2.2`: samma modell och `@anchor`; texten lägger handen över
kortet vid skons öppning (S). Bildmodellen ritar om skon varje gång, så det håller bara efter skolagning och lokal
lagning (handboken 3.7) (V). Paows gällande är `paow-ankare-2-2-blick-a` (Material). Från ankare 2.2 ges en plats när
ingången, given, returen och utgången från 2.2 är dömda (`SEAT_HUB` i `src/game-director.ts`, SYSTEM); för Paow plats 6.

**6. Platsens slutbild.** Landningsbilderna är arkiverade (BESKED): giv och återgång i en film behöver ingen. En giv bara
dit slutar på platsens EGEN slutbild (`seatEndOf` i `src/order-model.ts`): en landningsbild som gäller (roll `landning`,
nod `LAND(<plats>)`), annars snittrutan ur dealerns egen film från samma ankare till platsen, där returen Jakob har
godkänt rakt börjar (`cutFrameOf`) (V). En plats med ingetdera beställs utan slutbild. En plats bild står aldrig för en
annan. En snittruta håller bara om dess lagda kort ligger på planens kort (inom 5 bildpunkter, `checkCutFrame` i
`src/cut-frame.ts`): `node tools/order-cut-frames.ts <dealer>` prövar varje snittruta och skriver svaren i
`data/cut-frames.json`, som Material, Bordet och lagret läser; kör det igen när planens kort har flyttats eller nya
filmer har kommit in i banken.

**7. Vad saknas, och med vilken metod.** `node tools/produce.ts <dealer>` (eller Beställs block "Det här saknas för en
runda") räknar de 33 filmerna med samma funktioner som Karta och ger varje steg ett läge i Jakobs ord (V). Metoden per
steg och platsklass (mitten P3–P5, ytter P1, P2, P6, P7, dealerns kort) står i `data/order-methods.json` med status
`gäller`, `prov` eller `saknas` och belägg (V). Välj och ändra en metod efter Jakobs egna domar:
`node tools/verdicts-per-method.ts [dealer]`; godkännandet släpper en pilot av ett oprövat sätt (V).

**8. Komponera i Bordet, Beställ** (`/studio/bordet/?lage=bestall`; `/studio/bestall/` leder dit). En rak linje: välj
steget (som säger ankaret) och kortets plats; allt annat är stegets enda recept i `data/order-methods.json`, visat som
det som kommer att skickas, och ett avsteg görs medvetet under "Receptet · gör ett undantag" (handboken §2). Stegen
står i `STEPS` i `src/order-model.ts`, korten en giv kan gå till i `SEAT_TARGETS`; en giv till hålkortet `D.C1` landar
stängt, som kortplanen säger (V). Från 2.1 och 2.2 är en giv bara dit; från 2.3 (`INGANG-2.3`, `GIV-2.3`) är given giv och
återgång i en film med dockans film som referensfilm (receptet, [läget](../docs/lage/film.md)). Hålkortets vändning
(`HALKORT`, `IDLE>REVEAL(D.C1)`) har bara hålkortet ritat på sina bilder (V). `node tools/produce.ts <dealer> --draft`
gör utkast där metoden gäller, `--draft --trial <steg|plats>` ett provutkast; den godkänner aldrig (V). Utkastet blir
`data/orders/<id>.json` med bilderna i `assets/orders/<id>/`. Texten skrivs av `promptFor` (`src/order-prompts.ts`),
aldrig för hand; vilken mall som gäller står i handboken §2. En order lagrad med en äldre mall återges med sina egna ord.

**9. Godkänn.** Den stående fullmakten (`mandate` i `data/order-policy.json`, BESKED "Stående fullmakt"): en order på
upp till 500 krediter godkänner agenten själv med `node tools/order-approve.ts <id> --mandate "<uppdraget, på vems
ord>"`, högst 2 500 per dygn för agenternas godkännanden och direkta anrop tillsammans. En större order godkänner bara
Jakob: med "Godkänn och lägg i kön" i Beställ, eller med hans ja från chatten, `node tools/order-approve.ts <id>
--jakob "<hans ord och datum>"`. Alla prövas mot taket per order och golvet på saldot. Kostnaden avgörs vid
godkännandet; att lägga ordern frågar inget mer. Hashen fryses i `approval.orderSha256`, och en godkänd order ändras
aldrig (V).

**10. Lägg och hämta.** Beställningsagenten enligt [order-clerk.md §1–4](order-clerk.md):
`node tools/order-put.ts check|begin|placed|failed|status`, uppladdning med `init_upload` och `complete_upload`,
`node tools/order-collect.ts <id> <n> --url '<adress>'`. Ut: `take-<n>/source.mp4|png` (originalet, ändras aldrig),
`fetched.json` och kvittot `receipt.json`, som bara `order-put.ts` skriver (V).

**11. Efterarbeta och mät.** [order-clerk.md §5 och §7](order-clerk.md). Film: `node tools/film-after.ts <id> <n>`
väljer efter modellen och skriver `take-<n>/after.mp4` och `after.json` med måtten; en leverans i annan form än första
bilden vägras (V). Stillbild: `tools/python/grundbild-21.py` passar in, `node tools/still-after.ts <id> <n> --fitted …`
ger `ren.png`, `tools/python/skolagning-21.py` lägger tillbaka skon och `--shoe …` ger `after.png` (V). Python för
MediaPipe: `tools/python/README.md`. Måtten sammanfattas i kvittots MÄTT-not.

**12. Granska och laga.** En oberoende granskare enligt [film-review.md](film-review.md). Domen förs in med
`node tools/order-put.ts review <id> <n> --note "…"` var tagningen än står (från HÄMTAD), med poängen skriven "given 3/5,
returen 1/5" så att Protokoll läser den (`reviewerNote`, `scoresOf` i `studio/lib/ledger.ts`) (V). Lagbara fel:
`node tools/film-fix.ts <film> <fixes.json>` skriver `fixed-<k>.mp4` bredvid originalet, som granskas på nytt
([order-clerk.md §6](order-clerk.md)).

**13. In i banken eller Material.** `node tools/order-bring.ts <id> <n> [--prov <prov-id>] [--inford] [--dry]` tar
`after.mp4` eller `after.png` när de finns (V). En film går genom `tools/register-order.ts` till
`assets/motions/<klipp>/source.mp4` med `generation.json`, en post i filmregistret med `review.inbox: true` och en härledd
tagning i `data/clip-jobs.json`, och en post i Material (`kandidat`, rollen film) pekar på bankens fil, utan kopia. En
stillbild blir `kandidat` i Material under den roll ordern gör. Status INFÖRD sätts när granskarens dom finns på
tagningen (eller med `--inford`) (V). Kortspåret görs i samma körning för en film med kort (`tools/track-card.ts` skriver
`assets/tracking/<klipp>/card-track.json`); går det inte står raden som gör det för hand i svaret.

Tur och retur delas av sig själv i giv och retur, båda i inkorgen. `tools/round-trip-split.ts` tar returens första ruta:
den första som rör sig efter att handen har stått still vid det liggande kortet, så given slutar stilla med kortet på
platsen och returen börjar aldrig innan kortet ligger. Hittas ingen säker ruta förs inget in och kommandot säger varför;
då läser en granskare rutorna, och `--split <ruta>` (går alltid före det funna) anger returens första ruta.
`register-order.ts` skriver vilken hand som tar kortet och vilken som lägger det (`motion.takeHand`,
`motion.releaseHand`), så att rundan väljer en retur med den hand som är ute (`src/clip-graph.ts`) (V).

**14. Jakobs dom.** Granska (`/studio/granska/?dealer=<id>`): Primär, Godkänd, Variant eller Underkänd med hans ord,
skrivet bara i `review` i filmens post (`tools/review-store.ts`). Bilder: Material, `gäller` eller `ersatt`. Karta
(`/studio/karta/`): en Primär per kant, bara hans klick (V). Har han uttryckligen lämnat över domen för vissa filmer:
`node tools/review-put.ts <klipp> <ACCEPTED|VARIANT|REJECTED> --by … --mandate … --note …` sätter en preliminär dom som
spelas som beslutet säger, aldrig blir Primär eller rakt godkänd, inte väntar i hans kö (Granska: Dömda åt dig) och tas
bort av hans eget beslut (V).

**15. Protokoll och handbok.** `node tools/order-ledger.ts` eller vyn Protokoll: en rad per tagning med granskarens poäng
och Jakobs ord, och en rad per metod (V). Den som har provat för in raden på protokollsidan ([film-prov.md](film-prov.md))
och ändrar metoden i `data/order-methods.json` med belägg; ingen dagbok.

**16. Spelet.** `game.html?dealer=paow` eller konsolens Dealer-meny; studions Casino skickar sitt `?dealer=` vidare.
Varje dealer spelar bara sina egna dömda tagningar; ersättare, ankare 2.2 och korten: SYSTEM, "Spelets bank" och
"Ritade kort" (V).

**17. Tal.** En talfilm är en vilotagning där munnen ritas efter ljudet (`node tools/speech.ts`, planen i
`src/speech-plan.ts`, rösterna och replikerna i `data/speech.json`); talfilmer spelas på begäran, inte i vilans slump.
Hela ämnet: [docs/TAL.md](../docs/TAL.md). Banan Tal är stängd; dess filer hålls av huvudagenten
(`docs/lage/spelet.md`).

### Ordningen per dealer, och när hon är färdig

Ankare 1 → ankare 2.1 (och 2.2 när en plats ska ges därifrån) → ingången → vila → en giv till en ytterplats (P1 eller
P7) i metodprov → samma metod till alla platser → returer → dealerns kort, hålkortet och dess vändning → utgången. Färdig
för en runda är hon när produktionslistan säger att de 21 steg en runda kräver är klara; hela banken är 33 filmer
(`summary.films` i `buildGraph`, `src/clip-graph.ts`; SYSTEM, "Klippbank och nodnotation") (V).

## Vad bandet inte kan än

- **Ett tredje eller fjärde kort.** Planen har sexton platser, så ordermodellen vägrar `D.C3` och en plats tredje kort
  (`tools/order-store.ts`: platsen måste finnas i `placements/default.json`) (V). Platsen lägger Jakob själv i Bordets
  Kortplan när modellen har den.
- **Hur hon rör sig** utan att det kostar kortet är en öppen fråga ([film-prov.md](film-prov.md), "Öppna frågor").
- **Helfiguren** (`AWAY>IDLE`, `IDLE>AWAY`) har inget steg i Beställ; receptet är handboken 3.9 (V).
- **Keystone och ankare 1** har inget steg i Beställ; de beställs med handskrivna ordrar eller väljs i Material (V).
- **Retur som egen film till 2.1 och 2.2** (`RETUR-2.1`, `RETUR-2.2`) har ingen metod (`saknas`); `RETUR-1` och
  `RETUR-2.3` är prov (V).
- **Kling 4:s färger** läses som BT.601 fast filmen är BT.709-märkt, så att resultatet blir som de godkända
  tagningarna; en korrekt avkodning är inte avgjord (`tools/film-after.ts`) (V).
- **Ett tryckt spelkort** kan spåraren inte följa; det renderade kortet kräver enfärgat gult eller blått (`is.yellow`,
  `is.blue`, `isPale` i `src/card-track.ts`) (V).
- **Kön** läggs bara när en huvudagentchatt är öppen, och testerna täcker inte filmerna (`docs/BRISTER.md`).

## Regler som kostar pengar när de bryts

Ramen är Jakobs (`docs/BESKED.md`, "Två tagningar per klipp"): en ändring och en tagning per metodprov, två tagningar per
klipp när metoden är vald, varje omgång oberoende granskad innan nästa bygger på den, och kostnaden berättad efter
omgången. Ett osäkert anrop läggs aldrig om ([order-clerk.md §3](order-clerk.md)). 4K-filmmodellen är avstängd. Råden ur
kvittona (en ytterplats först, ändra mot ett recept som har hållit, billig sållning först) står i
[handboken](film-prompting.md) §2 och §5, och det som har fallit på [protokollsidan](film-prov.md), "Det som föll".

## Format och namn

Där en källa bara är text eller ett skript utanför repot står det "inget i repot vägrar": värdet är då en konvention.

| Vad | Värde | Källa (det som avgör) |
|---|---|---|
| Bankens ruta, film och ankare | 1764 × 1174 | `FILM` i `src/scene3d-geometry.ts`; `readRgb` i `tools/order-images.ts` (vägrar annan storlek när en order byggs); `image` i `data/scene-contract.json`. Material varnar bara (`sizeWarning`) |
| Planens ruta (Bordets Kortplan) | 1762 × 1174 | `VIEWS.native` i `src/placement-model.ts`; film-x = plan-x × 1763/1761 (`image.note` i scenkontraktet, `planQuad` i `tools/order-images.ts`). Glöms faktorn: högst 2 px fel vid högerkanten |
| Bildfrekvens | WAN 3: 30/s. Kling 4 och Kling 3.0 4K: 24/s | `film.fps` i `fetched.json`. Banken behåller varje films takt och rutnummer (`source.fps`, `fpsOf` i `src/game-film.ts`, `Part.fps` i `src/scene3d-film.ts`, förval 30). `tools/film-after.ts` behåller leveransens takt |
| WAN 3 levererar | 1764 × 1174 med `ratio: "adaptive"`; H.264, inget ljud; 7 s = 210 rutor; de två sista mörknar | `fetched.json` för `paow-giv-2-1-p4-12`; `MODELS.wan3` |
| Kling 4 levererar | 1764 × 1172, 24/s, 7 s = 169 rutor, H.264, bt709, ljud alltid på; formen följer första bilden | `fetched.json` för `paow-giv-2-1-p4-13`; `MODELS['kling-4']` |
| Film efter efterarbetet | 1764 × 1174, egen takt, inget ljud, grönt på ankarets nivå; WAN 208 av 210 rutor | `TREATMENTS` i `src/film-after.ts`; bankens `source.mp4` är `after.mp4` |
| Codec | H.264 (libx264) CRF 12, preset slow, 4:2:0, utan ljud | `ENCODE` i `tools/film-after.ts`, `ENCODING` i `tools/film-fix.ts`; inget i repot vägrar en annan codec |
| Stillbild från Nano Banana Pro | 4800 × 3584 (4:3, 4K); 3:2 erbjuds inte | kvittonas `source.png`; `STEPS`; verktygets schema |
| Ankare | 1764 × 1174 PNG på grönt; fönsterskon; samma sko, grönt, ton och slutrad för kroppen i alla dealerns ankare | `anchors.mustAgree`, `shoe` i `data/dealer-standard.json` |
| Keystone | Hög upplösning, stående och sittande, på vitt (Paow 3584 × 4800 och 4800 × 3584) | text i `order` i `data/dealer-standard.json`; inget i repot vägrar |
| Grönt | Ingen fast färg: nyckeln läser varje rutas hörn (`keyLo` 0,12, `keyHi` 0,9). Konvention: RGB 0, 237, 44 (Paows ankare) | shadern i `src/scene3d-film.ts`; `SCREEN`, `CORNER` i `src/film-fix.ts`; `anchors.mustAgree` |
| Bordskantsraden | 831,5; kroppen slutar på rad 825–831; inget 10 nivåer mörkare än grönt ovanför | `dealerEdgeImageRow` i scenkontraktet; `FRAME_FIX`; `edgeCheck`, `EDGE` i `src/film-after.ts`; inget i repot vägrar |
| Kortets färger | Baksida gul, framsida blå, båda släta (en platt färg per sida), likaså nästa kort i fönstret; meningen i texten är `PLAIN_CARD` | `card.colours` i standarden; `PLAIN_CARD` i `src/order-prompts.ts`; spårarens `is.yellow`, `is.blue` |
| Kortets storlek | Planens kort (P4 86,6 × 71,8 px); i flykten inom ±10 %; landat inom ±10 % yta och 5 px | `placements/default.json`; ±10 % och 5 px är granskningens regel, inget i repot vägrar |
| Mall | `<sort>-<stil>@<version>`, till exempel `film-giv-kort@…`; Utförlig skrivs utan stil (`film-giv@…`). Vilken mall som gäller: handboken §2 | `templateOf`, `TEMPLATE_VERSION`, `LONG_VERSION`, `PromptInput.version` i `src/order-prompts.ts` |
| Order-id | `<dealer>-<steg>-<plats>-<nn>`, till exempel `paow-giv-2-1-p4-15`, `paow-halkort-02` | `nextId` i `tools/order-store.ts` |
| Klipp-id | `<order-id>-<tagning nn>`; tur och retur ger `…-deal` och `…-return-ready` (eller `-idle`); rättad kopia `…-fix-<k>` | `clipIdOf` i `tools/register-order.ts` |
| Kant och nod | `A>B`; `IDLE` ankare 1, `READY` ankare 2.1 (nyp), `READY-B` ankare 2.2 (släp), `P1.C1` … `P7.C2`, `D.C1`, `D.C2`, `LAND(P4.C1)`, `REVEAL(D.C1)`, `AWAY` | `parseEdge` i `src/clip-graph.ts`; `ANCHOR_NODE`, `edgeOf` i `src/order-model.ts` |
| Orderstatus | UTKAST, GODKÄND (fryst), AVBRUTEN | `OrderStatus` i `src/order-model.ts` |
| Tagningsstatus | GODKÄND → LAGD → KLAR → HÄMTAD → EFTERARBETAD → MÄTT → GRANSKAD (granskarens) → INFÖRD; OSÄKER (läggs aldrig om), MISSLYCKAD, AVBRUTEN | `TAKE_FLOW` i `src/order-model.ts` |
| Domord i banken | Primär (`MAIN`), Godkänd (`ACCEPTED`), Variant (`VARIANT`), Underkänd (`REJECTED`), Väntar (`PENDING`); preliminär dom = `review.provisional`, `userAccepted: false`, i studion "dömd åt dig" (väntar inte i hans kö); `review.inbox` = från en order, inte dömd | `DECISIONS`, `applyProvisional` i `tools/review-store.ts` |
| Bildtillstånd i Material | `kandidat` → `gäller` eller `ersatt`; `gäller` → `ersatt`; en `gäller` per roll, nod och kort | `STATES` i `studio/lib/media.ts`; `CHANGES` i `studio/components/material/state.ts` |
| Filer per order | `data/orders/<id>.json`; `assets/orders/<id>/`: `first.png`, `last.png`, `reference.mp4`, `anchor.png`, `receipt.json`; `take-<n>/`: `source.*`, `fetched.json`, `after.*`, `after.json`, `fixed-<k>.*` | `src/order-model.ts`; `tools/order-collect.ts`; `tools/film-after.ts` |
| Filer i banken | `assets/motions/<klipp>/source.mp4`, `generation.json`; posten i filmregistret (`data/motions.jsonl`); `assets/tracking/<klipp>/card-track.json` | `tools/register-order.ts`; `tools/track-card.ts`; `tools/order-bring.ts` |
| Pris och tak | Prislistan, taket per order och den stående fullmakten (`askAbove` 500 per order, `perDayCredits` 2 500 per dygn) i orderpolicyn; värsta kostnaden prövas vid godkännandet. Läs saldo före beställning. | `data/order-policy.json`; `tools/order-mandate.ts` |
