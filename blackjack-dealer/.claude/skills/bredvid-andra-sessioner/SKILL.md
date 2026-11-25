---
name: bredvid-andra-sessioner
description: Använd i dealer-repot när flera chattar eller underagenter arbetar i samma repo samtidigt - innan en fil ändras, en gren eller ett arbetsträd görs, en ny modul under src/ importeras, eller headless Chrome, grafikkortet eller många testarbetare används. Gäller varje chatt som inte är huvudagenten, och huvudagenten när den delar ut arbete.
---

# Arbeta bredvid andra chattar

Huvudagenten är chatten Jakob arbetar med; den committar och pushar. Vem som äger vilka filer står i
[`HANDOFF.md`](../../../HANDOFF.md), "Vem äger vad"; reglerna i [`AGENTS.md`](../../../AGENTS.md), "Git och
samarbete", "Labbservern" och "Kod". Här står bara var det står.

## Reglerna som oftast bryts

1. **En skribent per fil.** Säg till huvudagenten vilka filer du tar innan du ändrar dem, och lämna över med en
   fillista; bara huvudagenten committar och pushar (AGENTS, "Git och samarbete").
2. **Arbeta i repot på `main`;** en gren eller ett extra träd bara när ett uppdrag måste isoleras.
3. **Labbservern lämnar ut arbetsträdets filer,** så en halvfärdig fil syns genast i Jakobs flik, och en ny modul
   under `src/` skrivs i `SCRIPTS` först (DRIFT, "Labbservern och fliken"; `tools/lab-modules.test.ts`).
4. **Starta ingen egen labbserver och stoppa aldrig en server via processnamn eller port** (AGENTS, "Labbservern").
5. **Headless Chrome och grafikkortet under det delade låset,** en körning i taget, och högst fyra render- eller
   testarbetare på hela datorn (AGENTS, "Labbservern" och "Kod").
6. **Det du gör på Jakobs ord säger du till huvudagenten,** med fillistan; ett prov som väntar på hans dom blir ett
   kort i Beslut genom huvudagenten.
7. **Betalt utanför Beställ** rapporteras till huvudagenten med belopp (AGENTS, "Det som skyddar Jakob").
8. **Tillfälligt arbete i slasken;** bilder och filmer som kan användas ligger i `assets/` med en roll (DRIFT,
   "Slasken och städning").
