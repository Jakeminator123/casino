# standarddocka

Dockornas arbetsbänk vid livebordet: Danilo och Frasse (efter de två riktiga dealrarna i filmen av livebordet), deras
rörelser lyfta ur filmen, editorn där de spelas och filmas, och rörelseschemat. Reglerna står i `AGENTS.md`, Jakobs domar i
`DOMAR.md`. Måtten (kameran, bordet, skon, kortplatserna) står i `../blackjack-dealer/src/table-live.ts`, dockorna i
`../blackjack-dealer/dealer3d/src/doll.ts` och deras rörelser i `../blackjack-dealer/dealer3d/data/lyft-<docka>-*.json`
(gjorda av `../blackjack-dealer/dealer3d/tools/lyft-till-docka.ts` ur `../live-bj/data/lyft/`).

## Mappar

```
standarddocka/
  AGENTS.md            regler
  DOMAR.md             Jakobs domar om dockan, bordet, vyn, takten och rörelserna: måttet allt prövas mot
  rorelsekatalog.json  rörelseschemat: ankarena, stadierna och rörelserna, med vilka som finns och vilka som saknas;
                       visas i studion under Karta, Schemat
  editor/              editorn i webbläsaren: Danilo eller Frasse vid livebordet genom dess kamera, en tidslinje att
                       spela, kameror (också från de sju platserna), uttrycken i ansiktet och inspelning av klipp
    server.ts          editorns egen server (bara den här datorn, port 4320): sidan, modellerna, rörelserna och listan
                       över dem; gör film av inspelningens bilder (FFmpeg)
    editor.ts          sidan: tidslinjen, kamerorna, uttrycken, Spela in
    dockval.ts         vilken docka sidan visar ur adressen, platsen och hela sekvensen (närmast skon först); ren kod
                       (testet ../blackjack-dealer/tools/editor-dockval.test.ts)
    scen.ts            scenen: dockan i rummet, kortet och kamerorna (livebordets och platsernas)
    rum.ts             rummet: livebordet ur Blender (avatar-auto-pipeline/assets/bord/standardbord_live.glb), stolen
                       under honom och ljuset
    rorelse.ts         rörelsen: en lyft rörelse som den är (`ensam`), flera efter varandra med korten kvar
                       (`sekvens`), takten och uttrycken i ansiktet (`UTTRYCK`, `medUttryck`)
    armar.ts, kropp.ts regeln att underarmarna går över bordets kant, och spärren som håller en ställning inom vad en
                       kropp kan
  verktyg/             för agenter, utan fönster (skillen granska-rorelse)
    titta.ts           stillbilder ur valda kameror vid valda tider, eller en inspelning; `--docka danilo|frasse`,
                       `--plats`, `--giv`, `--sekvens`; kör editorn i ett headless Chrome under det delade låset
    kropp.ts           hur dockans kropp ritas genom en rörelse (axlar, armbågar, handleder och fingrar mot rörelsens
                       punkter), genom titta.ts
    lagg-pa-bord.ts    lägger en dealer filmad i utseendet nyckel på vårt eget bord
  klipp/               editorns inspelningar; går inte in i Git
```

## Köra

- Editorn: `node standarddocka/editor/server.ts --oppna` (Jakob: `STARTA editorn.cmd`), sidan
  `http://127.0.0.1:4320/standarddocka/editor/?docka=danilo&plats=4`. Studions sida Dockan visar den.
- Rörelserna görs om ur lyftet: `node dealer3d/tools/lyft-till-docka.ts --alla` och prövas med
  `node dealer3d/tools/lyft-kolla.ts` (från `../blackjack-dealer/`).
- Bilder att granska: `node standarddocka/verktyg/titta.ts --ut <mapp> --docka frasse --plats 4 --kamera spel,sida`.
