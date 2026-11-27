---
name: avsluta-arbete
description: Använd i blackjack-dealer när ett arbete är färdigt och ska in i Git - tester, städning, dokumentation, staging, commit, kontrollen före push, push och kontroll av fjärren - eller när en push har stannat (rött i kontrollen, "Try running Pull first" i Cursor). Gäller också en underagent eller en annan chatt som arbetar bredvid andra och lämnar sitt arbete till huvudagenten.
---

# Avsluta ett arbete

Kommandon körs från `blackjack-dealer/`. Git-reglerna i stort står i `AGENTS.md` (casino-roten), "Arbetssätt";
här är ordningen.

## En underagent eller en annan chatt

- Säg till huvudagenten vilka filer du tar innan du ändrar dem; en skribent per fil. Rör inte andras filer, grenar eller
  träd.
- Kör inga Git-kommandon som ändrar tillståndet (commit, stash, checkout, reset, push) om uppdraget inte säger det.
- Lämna över med en fillista: vad som ändrades, kontrollens resultat och det som är osäkert. Ett prov som väntar på
  Jakobs dom blir ett kort i Beslut genom huvudagenten; betalt arbete rapporteras med belopp.

## Huvudagenten

1. Vänta in eller stoppa egna underagenter. Bevara Jakobs plan, domar och orderutkast.
2. **Kontrollera:** kör de berörda testfilerna (`node --test <fil>`). Rött stoppar, och granskas innan det
   följs (rotens `AGENTS.md`, "Arbetssätt"): skyddar testet något som ska bestå rättas orsaken och skyddet sänks
   aldrig; annars är det ett gammalt test som tas bort i samma ändring och nämns i svaret.
3. **Städa:** ta bort det ändringen gjorde överflödigt (kod som inget anropar, ersatta filer, döda sökvägar) och egna
   mappar i slasken. Efter mediearbete: `npm run gallra` och `node ../lager.ts`.
4. **Dokumentera, nerifrån och upp:** kommentaren i koden, `blackjack-dealer/README.md` om en mapp eller ett kommando
   ändrats, `blackjack-dealer/docs/SYSTEM.md` om ett kontrakt ändrats, `blackjack-dealer/AGENTS.md` om hans ord ändrat
   en regel, och `blackjack-dealer/STATUS.md`, där det inaktuella ersätts.
5. **Commit:** stagea egna filer med namn (aldrig `git add -A` när andra arbetar), ett kort meddelande om vad och
   varför.
6. **Push:** `npm run check` och sedan `git push`. Kontrollen (`npm run hooks:install` en gång per utcheckning)
   stoppar hemligheter, `.env`-filer, media, filer över 5 MB och sökvägar till en viss dator (en disk, en användares
   mapp, en server) i varje blob de utgående commitarna har, och kör `npm test` i de projekt som ändrats. En rättelse i
   en senare commit räcker inte: en commit som aldrig har pushats görs om lokalt. `node ../.githooks/check.ts --alla`
   prövar hela trädet som det ligger, nya filer också, före en commit. Läs fjärrens SHA efteråt
   (`git rev-parse origin/main`).
7. Ingen force-push, ingen `--no-verify`. "Try running Pull first" i Cursor betyder att kontrollen före push blev röd:
   läs varför i stället för att dra.

En push är skild från deploy, mediauppladdning och betald generering, som kräver Jakobs ord.
