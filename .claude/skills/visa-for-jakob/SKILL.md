---
name: visa-for-jakob
description: Använd i blackjack-dealer när något ska visas för Jakob eller ett svar skrivas till honom - en sida i studion (127.0.0.1:4319), ett prov, en film han ska döma, en fråga som väntar på hans svar - eller när studion han ser ska byggas om. Gäller länkar till studion, provmappar i assets/proofs/, kort i Beslut (data/decisions.json), hans anteckningar och hur svaret till honom skrivs.
---

# Visa Jakob något

Kommandon körs från `blackjack-dealer/`; sökvägar räknas från casino-roten.

## Studion

- Studion på `http://127.0.0.1:4319/studio/` är den lokala sajten (Jakob 2026-11-17, 2026-11-23); han visas sidor där,
  inte lösa provsidor eller filer i slasken.
- `node tools/preview.ts --open "<sida>"` visar sidan i den nyaste öppna fliken (flera flikar får vara öppna, Jakob
  2026-11-25), och `node tools/preview.ts --ensure` körs före en länk. Öppna aldrig studions adress med
  `Start-Process` eller `start`; en agents egen sida öppnas med `?robot=1`.
- Studion byggs på plats med `npm --prefix studio run build`; bygg inte medan en annan chatts halvfärdiga filer ligger i
  `blackjack-dealer/studio/`. Serverns omstart (`--restart`) är huvudagentens.

## Det han ska döma

- **Prov:** en provmapp `assets/proofs/<namn>/` med `proof.json` (`title`, `description`, `takes`), visad i Granska, Prov
  (`/studio/granska/?prov=<namn>`). Granskarens omdöme är en bricka; hans egen dom är aldrig förifylld.
- **Beslut:** ett kort i `blackjack-dealer/data/decisions.json` bara för ett prov (film, bild) som väntar på hans dom
  (2026-11-21); teknik och arbetssätt frågas i chatten. Kortet tas ut när svaret är utfört. Bara sidan skriver hans svar.
- **Det han väntar på** läggs också i `blackjack-dealer/STATUS.md`, under "Väntar på Jakob", tills det är besvarat.
- En stillbild bredvid varje film, eftersom filmer kan se utfrätta ut i hans flik. Ett nytt utseende för alla, till
  exempel läpparna, visas i spelets storlek och i rörelse och kräver hans ja; granskarnas poäng räcker inte
  (2026-11-17). Hans godkända `paow-tal-blackjack-sv-04` rörs inte.
- Text räcker inte för honom: visa i Karta eller spelet, i spelets storlek.
- Ett fel på hans telefon läses med hans skärmbild av sidan med `?diagnos=1`; en headless-inspelning visar inte vad en
  telefon gör, och felet kallas inte rättat efter en inspelning.

## Hans ord

- Läs hans anteckningar i Prov före varje svar: `node tools/proof-notes.ts` visar det olästa, `--answer <nr> "<text>"`
  svarar och `--read <nr>` markerar läst.
- Läs korten i Beslut: fältet `answer` bär hans val och anteckning.

## Svaret

Formen står i `blackjack-dealer/AGENTS.md`, "Svar till Jakob": svenska, slutsatsen först, aningen kortare än vanligt, punktform, procent och poäng,
det verifierade skilt från det skattade, och antalet aktiva underagenter sist. Han talar helst med huvudagenten: en
annan chatt som han inte själv skriver i lämnar sitt svar dit.
