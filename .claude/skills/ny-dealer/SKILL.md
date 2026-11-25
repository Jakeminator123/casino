---
name: ny-dealer
description: Använd i blackjack-dealer när en ny dealer ska göras från en bild av en person, eller en ny uppsättning av en dealer som finns (nya ankare, nya händer, nytt utseende), från ingångsbild, keystone och ankare till filmerna för en hel runda. Också när frågan är hur långt en dealer har kommit eller vad som saknas för en runda (produce.ts).
---

# En ny dealer från en bild

Kommandon körs från `blackjack-dealer/`; sökvägar räknas från casino-roten. Varje beställning på vägen följer skillen
`bestalla-film`, varje leverans skillen `granska-film`.

## Vem beslutar

- **Jakob:** vilken bild som gäller i Material och varje films dom i Granska; han kan också godkänna en order själv.
- **Huvudagenten:** lägger in dealern på hans ord, godkänner beställningar inom fullmakten, för in i banken och sätter en
  preliminär dom bara där han har lämnat över domen.
- **Granskaren:** en underagent som inte beställde filmen; föreslår.

## Vägen

1. **Dealern i registren:** en post i `blackjack-dealer/data/dealers.json` (`id`, `name`, `look`, `films.prefix`) och en
   dealer i `blackjack-dealer/data/media-roles.json`. Utan posten vägrar Beställ, och studions växel visar henne inte.
2. **Ingångsbild** (2026-11-12: "vilken bild som helst"): Material, Lägg till bild, roll `ingangsbild`. Ett foto av en
   riktig person som förlaga ligger i `blackjack-dealer/private/` och går bara till bildmodellen.
3. **Keystone,** stående och sittande, i hög upplösning på vitt; spelas aldrig. Nano Banana Pro 4K med ingångsbilden
   som `@woman`; roll `keystone`. Likhet: `blackjack-dealer/tools/python/identitet.py` och en oberoende granskare.
4. **Ankare 1** (vila, `IDLE`): en redigering av ett ankare 1 i bankens ruta med dealerns bild, inte en ny person i en
   annans ruta (det gav vaxig hud och för kort kropp). Texten är mallen `blackjack-dealer/tools/texts/ankare-1.txt`; ordern
   skrivs för hand, och efterarbetet är stillbildens fyra steg (`blackjack-dealer/tools/python/README.md`). Roll `ankare-1`.
5. **Ankare 2.1** (nyp, `READY`): Beställ, steget `ANKARE-2.1`; eller, som för Paows tatuerade A2.1, filmens sista ruta
   ur en Kling 4-film från A1 till en målbild (det höll, 4/5). **Ankare 2.3** (båda händerna vid skon) görs som en riktig
   ruta ur en film från A1, med dockans film som referens och rak bål, aldrig som montage. Ankare 2.2 är arkiverat.
6. **Vad saknas:** `node tools/produce.ts <dealer>` (eller Beställs block "Det här saknas för en runda") räknar de 33
   filmerna med samma funktioner som Karta; metoden per steg står i `blackjack-dealer/data/order-methods.json`.
7. **Filmerna**, i ordning: ingången, vila, en giv till en ytterplats som metodprov, samma metod till alla platser,
   returer, dealerns kort och hålkortets vändning, utgången. Utkast med `node tools/produce.ts <dealer> --draft`.
8. **Jakobs dom** i Granska; spela en runda med `/game.html?dealer=<id>` eller studions Casino, och börja om från steg 6.

Alla bilder blir `kandidat`; bara Jakob sätter `gäller`. Alla ankare till en dealer har samma sko, grönt, ton och
slutrad för kroppen (`blackjack-dealer/data/dealer-standard.json`), i bankens ruta 1764 × 1174.

## Klar

Hon är färdig för en runda när `node tools/produce.ts <dealer>` säger att de 21 steg en runda kräver är klara. Hon
spelar bara sina egna dömda tagningar.

## Det vägen inte kan än

- Keystone och ankare 1 är inga steg i Beställ (`STEPS` i `blackjack-dealer/src/order-model.ts`).
- Ett tredje eller fjärde kort: planen har inte platsen, och ordermodellen vägrar `D.C3` som mål tills Jakob lägger den
  i Inspelning.
- Helfiguren (hon kommer och sätter sig, reser sig och går) har inget steg: Kling 4 i 16:9, två delar per film som möts i
  den stående bilden, med `motion.frame` och `layer: "BEHIND_TABLE"` i posten.
- En ny uppsättning med samma kropp och kläder får sina vilor lokalt ur den gamlas
  (`blackjack-dealer/tools/python/hands-from-anchor.py`), utan beställning.
