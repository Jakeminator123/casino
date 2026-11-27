# live-bj

En riktig dealers arbete vid ett livebord, mätt ur en film från YouTube: kroppen, händerna, huvudet, blicken, korten och
kameran. Måtten är förlaga för dockans rörelser i `../standarddocka/` och `../blackjack-dealer/dealer3d/`. Rotens
[AGENTS.md](../AGENTS.md) gäller; här står bara det som är eget för mappen. Kartan, körningen och det som är uppmätt
står i [README.md](README.md).

## Det som skyddar Jakob här

- **Filmen mäts bara.** Filmen (`video/`), rutor och ark ur den (`rutor/`) och måtten per ruta (`matt/`) finns bara på
  datorn och går aldrig in i Git, i `../blackjack-dealer/assets/` eller i ett prov. In i Git går verktygen (`verktyg/`)
  och de små sammanställningarna i tal (`data/`).
- **Personerna i filmen är riktiga människor.** Ingen bild av dem visas utanför den här datorn, och deras utseende
  används aldrig som förlaga för en dealer. Det vi tar med oss är rörelsen i tal.

## Arbeta här

- **Python** körs med miljön i `../blackjack-dealer/tools/python/` (dess README säger hur den och modellfilerna görs),
  alltid med `-I`. `live-bj/.venv` är bara nedladdaren.
- **Läs filmen rakt igenom.** Att hoppa i filmen ruta för ruta tar tio gånger så lång tid och all datorns kraft; ett
  verktyg som bara behöver en remsa av bilden låter `ffmpeg` skära ut den (så gör `verktyg/faser.py`).
- **Bara de rena partierna mäts.** Streamaren zoomar och lägger saker över bilden; `data/kalla.json` säger vilka
  sekunder som är orörda och var bordsbilden sitter, och alla verktyg läser den.
- **Kontrollera med ögat.** Ett mått som ska användas ritas först över filmens rutor (`verktyg/titta.py`) eller som
  streckfigur bredvid filmen (`verktyg/streck.py`).
