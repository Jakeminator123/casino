---
name: publicera-kopian
description: Använd i blackjack-dealer när studions låsta kopia på nätet (dealer-lake.vercel.app, Vercel-projektet dealer-studio) ska publiceras igen, när något ska upp på eller tas bort från kopian, när lösenord eller öppenhet ska ändras, eller när kopian ska kontrolleras. Bara på Jakobs uttryckliga ord; nätdelen vilar sedan 2026-11-25. Gäller publish-studio, data/studio-release.json, Vercel och Blob.
---

# Publicera kopian på nätet

Kommandon körs från `blackjack-dealer/`; sökvägar räknas från casino-roten.

**Nätdelen vilar** (Jakob 2026-11-25). Inget publiceras, laddas upp eller raderas utan hans uttryckliga ord, och ett ja
gäller den publiceringen (2026-11-18). När arbetet startar igen rättas först `blackjack-dealer/tools/publish-studio.ts`
efter dagens repo (casino-repot, kontrollen i `.githooks/`, studion byggd på plats) och prövas med `--kor --bara-bygge`.
Kopian står på `c9d006d` från 2026-11-20; `/meta.json` säger vilken commit den bär.

## Vad kopian är

- Studion som låst kopia: allt går att läsa och spela, inget att ändra, inga kostnader syns, samma meny som studion
  (2026-11-13) utan Lipsync och sparning; Bordet har där bara Scen, Råfilm och Efterarbete, och Beslut byts mot
  Önskemål (`studio/components/shell/Rail.tsx`). Den enda sidan på nätet (2026-11-23): `https://dealer-lake.vercel.app`,
  med dörrarna `/casino` (spelet ensamt) och `/trailer` (filmen före spelet, sedan Paows casino). Casinot visar det som
  är sparat med Använd i Casino i studion (2026-11-21).
- **Vercel:** teamet `jakeminator123s-projects`, projektet `dealer-studio`, utan Git-koppling: varje version läggs upp
  färdigbyggd. Varje CLI-kommando får `--scope jakeminator123s-projects`. Länken ligger bara i
  `blackjack-dealer/.runtime/studio-deploy/`.
- **Blob:** `dealer-studio-media` (public, `arn1`). Objekten heter efter sitt innehåll och skrivs aldrig över; storens id
  och kvittot med varje films adress (`blackjack-dealer/.runtime/studio-blob/`) går aldrig in i Git, eftersom adresserna
  öppnar filmerna utan lösenord. Låset hämtar filmerna åt besökaren (`blackjack-dealer/cloud/studio/gate.ts`).
- **Vad som går upp** (2026-11-21): bara det spelet spelar för varje dealer i `casino.dealers` i
  `blackjack-dealer/data/studio-release.json`, scenens egna filmer och filmen före spelet (gruppen `ingång`, noirfilmen v4).
  Urvalet görs i `blackjack-dealer/tools/studio-freeze.ts`; trailerproven hålls ute (2026-11-12), och taket för Blob är `limits.blobBytes`.

## Låset

- Kopian är öppen för läsning (2026-11-14: "Se till att den inte är lösenordsskyddad"): `DEALER_OPPEN=allt` i Vercel;
  `spel` öppnar bara dörrarna. Boten och önskemålslådan kräver alltid lösenordet.
- Lösenorden står i Vercel som `DEALER_LOSEN` och `DEALER_LOSEN_SPEL` (bara spelet), aldrig i en fil Git följer
  (2026-11-18). Byte: `vercel env rm` och `vercel env add` med `--cwd .runtime/studio-deploy`, sedan en ny deploy.
- Boten följer med utan lagring och kostar inget; att slå på den är Jakobs beslut.

## Publicera

1. Koden pushad till `origin/main`; körningen görs från Jakobs utcheckning med servern igång, och port 4341 ledig.
2. Planen: `node tools/publish-studio.ts --worktree <rent träd>` visar commit och steg; inget körs.
3. Körningen: samma kommando med `--kor` (lösenordet för kontrollen i `DEALER_LOSEN_PROV`). Den bygger, laddar upp det
   nya, lägger ut och kontrollerar utifrån; servern på 4319 rörs aldrig.
4. Faller kontrollen efter deployen: `vercel rollback --scope jakeminator123s-projects --cwd .runtime/studio-deploy` och
   läs vad som föll. Stannar uppladdningen: kör igen; det som redan ligger skickas inte på nytt.
5. Fråga kopian som en ny besökare efteråt, utan sparade val och i telefonstorlek; ett fel på en riktig telefon läses
   med Jakobs skärmbild av `/trailer?diagnos=1`.

Provbygge utan publicering: `node tools/build-studio-snapshot.ts --prov`. En ny store, att ta bort kopian eller dess
Blob: bara på hans ord.
