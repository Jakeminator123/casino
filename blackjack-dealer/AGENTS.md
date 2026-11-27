# blackjack-dealer

En filmad dealer till Jakobs blackjackspel: korta filmklipp mellan fasta ankare, spelade i studion, i 3D-scenen och i
spelet. Rotens [AGENTS.md](../AGENTS.md) gäller; här står bara det som är eget för den här mappen. Läs sedan
[STATUS.md](STATUS.md) (läget, nästa steg, det som väntar på Jakob). Kartan och kommandona står i
[README.md](README.md), kontrakten och standardens mått i [docs/SYSTEM.md](docs/SYSTEM.md), och varje arbetsmoment har
en skill i `../.claude/skills/`: `ny-dealer`, `bestalla-film`, `granska-film`, `visa-for-jakob`, `avsluta-arbete`,
`publicera-kopian`, `runway` och `doma`.

## Det som skyddar Jakob här

- **Fullmakten för filmbeställningar** (`data/order-policy.json`, Jakob 2026-11-25): en agent godkänner själv upp
  till 500 krediter per beställning och högst 2 500 per dygn; större frågar honom först. Taket 2 000 per order står
  mot misstag, och påfyllning gör bara han. Meshy och hans RunPod bara på hans eget ja.
- **Deploy, uppladdning och databasändring** bara på hans uttryckliga ord, och ett ja gäller den gången. Nätdelen
  vilar sedan 2026-11-25.
- **Domarna är hans.** Domar i Granska och Material och valet av Primär sätts bara av honom, och en tagning han har
  dömt rörs inte. Har han lämnat över domen för vissa filmer dömer huvudagenten och en oberoende granskare i hans
  ställe (`node tools/review-put.ts`), märkt som inte hans, och hans beslut ersätter den.
- **Kortplanen är hans.** `placements/default.json` skrivs bara av Bordet när han trycker Spara.
- **Original och referenser** raderas aldrig, och en referenshash ändras aldrig för att dölja en avvikelse.
- **Personer.** Hans foto som förlaga (`private/referenser/`) går bara till bildmodellen. En riktig dealers film
  eller en YouTube-referens mäts bara och går aldrig in i Git, `assets/` eller ett prov. Signerade adresser från
  Runway skrivs aldrig i repot.
- **Gallringen** (`node tools/media-thin.ts`, som servern kör när den startar) tar aldrig det spelet spelar, det som
  har en roll, original, referenser, det som väntar i Granska eller Beslut, ett provs original, eller något yngre än tre
  dygn. Den raderar utan hans klick, så det den tar går till papperskorgen `.runtime/papperskorg/` och ligger där i 14
  dygn.
- **Radera på riktigt, ett verktyg** (Jakob 2026-11-27: "direkt faktiskt raderar saker på riktigt"): `tools/lager-remove.ts`
  tar en sak ur kartan (`../lager.ts`) från disken utan papperskorg, och kvittot i `.runtime/cleanup/` säger vem som
  raderade. Hans klick i Biblioteket och i Prov går dit (vägen `/api/lager/radera`); en agent kör
  `node tools/lager-remove.ts <sak>` för frågan och lägger till `--ja --vem <namn>` för raderingen, bara på hans ord eller
  ett uppdrag som säger det. Frågan säger följden; det spelet spelar, det som har en roll, det betalda och det som väntar
  på hans dom kräver hans andra klick. Aldrig erbjudet: det Git har (också inne i en mapp med media), hans domar och
  anteckningar, Beslut, kortplanen, hans sparade val, liggarna, indata till ett bygge och livebordets film. Ett obesvarat
  kort i Beslut, ett träd i Karta, en munlapp, en beställning som pågår eller ett lås vägrar raderingen. Att flytta ut
  något ur repot till ett arkiv på hans ord är något annat: `node tools/media-thin.ts --ta-bort <id> --varfor "<hans ord>"
  --arkiv <mapp utanför repot>`.

## Riktningen

- **En väg för varje sak, färre val** (2026-11-24): "det är för mycket val, för komplicerat i onödan". Det som finns
  dubbelt blir en sak, också när det tränger undan gamla klipp eller vägar.
- **En standard i botten, utseendet ovanpå** (2026-11-25). Kameran, bordet, kortet, kortplatserna, skon och
  markerlådan har fasta mått (`docs/SYSTEM.md`, Standarden) som dockan, inspelningen och varje beställd film utgår
  från. Bakgrund, duk, ljus och kortens utseende läggs ovanpå i Scen och ändrar aldrig måtten.
- **Studion först** (2026-11-11): prov och effekter görs i studion; spelet får bara det han har godkänt där.
- **Filmerna först** (2026-11-17): "filmerna är det vi först måste få rätt".
- **Vanlig svenska i studion** (2026-11-25): filnamn och verktygsnamn visas inte för honom. Orden för studions delar
  står i dess Ordlista (`studio/lib/words.ts`).
- **Studion visar, den förklarar inte** (2026-11-27): "Se till att inte så fruktansvärt mycket text och skit finns i
  studion som läggs in av oklara anledningar", "den är så ful". En sida leder med saken själv: bilden, filmen, dockan,
  kartan. En rubrik och högst en rad under; en ruta har ett namn och ett tal eller ett läge, ingen beskrivning.
  Förklaringar står i Ordlistan. Ingen lägger löpande text på en sida för att beskriva sin egen funktion.
- **Städa hårt** (2026-11-17, 2026-11-25): "det mesta som inte används ska raderas", "Var inte konservativ".

## Arbeta här

- **Var saker står:** läget och det som väntar på honom i `STATUS.md`, där det inaktuella ersätts. Ett prov (film,
  bild) som väntar på hans dom är ett kort i Beslut (`data/decisions.json`); teknik och arbetssätt frågas i chatten.
- **Servern:** `npm start` startar den på `http://127.0.0.1:4319` och öppnar studion; `npm run stop` stoppar den
  (aldrig via processnamn eller port). Den lämnar ut arbetsträdet, så en halvfärdig fil syns genast i Jakobs flik:
  lämna trädet fungerande efter varje ändring. En ändring i `tools/` gäller efter `node tools/preview.ts --restart`.
  En agents egen sida öppnas med `?robot=1`.
- **Studion byggs på plats** med `npm --prefix studio run build`, efter en typkontroll
  (`studio/node_modules/.bin/tsc --noEmit -p studio`). Ett bygge och en omstart stör andra chattar: säg det i
  inkorgen först.
- **Kod:** TypeScript (Node 24); undantaget är `tools/python/`. Testerna ska vara gröna utan media på datorn; de
  täcker inte filmerna, som bedöms med ögat.
- **Svar till Jakob:** läs hans anteckningar i Prov med `node tools/proof-notes.ts` före svaret, skilj det
  verifierade från det skattade, och lägg en stillbild bredvid varje film han ska döma.
