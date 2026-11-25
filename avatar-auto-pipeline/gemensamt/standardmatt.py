"""Gemensamma standardmått för avatarbygget.

Alla tal här gäller oavsett person, frisyr och kläder. Skript som behöver ett bildformat,
en marginal, ett snitt eller en kroppsproportion hämtar det härifrån i stället för att
hårdkoda egna siffror. Kroppsmåtten uttrycks som andelar av kroppslängden och mäts mot
den faktiska geometrin, så samma värden fungerar för en lång man och en kort kvinna.
"""

from pathlib import Path

import numpy as np

# ---------------------------------------------------------------- referensbilder (OpenAI)
# Aldrig "auto": ett stående porträttformat tvingar in T-posens armar i bildkanten.
BILDFORMAT = {"portratt": "1024x1024", "t-pose": "1024x1024", "hogerhand": "1024x1024"}
VIT_TROSKEL = 40            # summerad RGB-skillnad mot vit bakgrund som räknas som figur
TPOSE_MIN_SIDOMARGINAL = 0.04   # andel av bildbredden, per sida, utanför fingertopparna
TPOSE_MIN_HOJDMARGINAL = 0.025  # andel av bildhöjden ovanför hjässan och under sulorna
TPOSE_ARMSPANN = (0.88, 1.12)   # armspann / kroppslängd i bilden (vuxen människa ≈ 1,0)
TPOSE_ARMHOJD = (0.10, 0.32)    # bredaste raden, räknat nedåt från hjässan, andel av längden
TPOSE_OMFORSOK = 2              # extra bildgenereringar om måtten inte håller
TPOSE_KANTSKYDD = 0.005         # rå bild: figuren får inte nudda kanten (avkapade fingrar)
TPOSE_MARGINAL_MAL = 0.08       # normaliserad bild: vit marginal runt figurens största mått

TPOSE_UTZOOMNING = (
    " IMPORTANT FRAMING: the camera is further back. Square 1:1 image. The full arm span from "
    "left fingertips to right fingertips must fit with at least 8 percent pure white margin on "
    "both the left and the right image edge, and the crown and soles at least 5 percent from "
    "the top and bottom edges. Do not shorten, bend or fold the arms or hands to fit."
)

# ---------------------------------------------------------------- kroppen i 3D
KROPPSLANGD_M = 1.80        # mållängd när en modell normaliseras
HANDLANGD = (0.095, 0.125)  # handled → långfingertopp, andel av kroppslängd (norm ≈ 0,108)
HANDLANGD_NORM = 0.108
HUVUDHOJD = (0.11, 0.15)    # haka → hjässa, andel av kroppslängd (norm ≈ 0,13)
HALSSNITT = 0.853           # halsens snitt på helkroppen, andel av längden från sulan
HALSSNITT_FONSTER = (0.825, 0.90)
HALS_BREDDKVOT = (0.6, 1.6)  # tillåten breddskillnad mellan huvudets och kroppens halskant
HUVUDSNITT_BYST = 0.455     # snitt i en Meshy-byst (porträtt), andel från bystens botten
HUVUDSNITT_LUTNING = 0.22
HANDSNITT_HAND = 0.08       # snitt i en Meshy-hand, andel från handledens ände


def _silhuett(path):
    from PIL import Image

    with Image.open(path) as im:
        rgb = np.asarray(im.convert("RGB")).astype(np.int16)
    mask = (255 * 3 - rgb.sum(axis=2)) > VIT_TROSKEL
    # Ta bort enstaka brusprickar: en rad/kolumn räknas först när den har några figurpixlar.
    rows = np.flatnonzero(mask.sum(axis=1) >= 3)
    cols = np.flatnonzero(mask.sum(axis=0) >= 3)
    if not len(rows) or not len(cols):
        raise ValueError(f"Ingen figur mot vit bakgrund i {Path(path).name}.")
    return mask, rows, cols


def matt_tpose(path):
    """Mät T-posebildens marginaler, armspann/längd och armarnas höjd."""
    mask, rows, cols = _silhuett(path)
    h, w = mask.shape
    top, bottom, left, right = rows[0], rows[-1], cols[0], cols[-1]
    langd = bottom - top + 1
    spann = right - left + 1
    bredd_per_rad = mask[top:bottom + 1].sum(axis=1)
    armrad = int(np.argmax(bredd_per_rad))
    return {
        "fil": Path(path).name,
        "bild_px": [int(w), int(h)],
        "figur_px": {"hojd": int(langd), "armspann": int(spann)},
        "armspann_per_langd": round(float(spann / langd), 3),
        "marginal": {
            "vanster": round(float(left / w), 3), "hoger": round(float((w - 1 - right) / w), 3),
            "topp": round(float(top / h), 3), "botten": round(float((h - 1 - bottom) / h), 3),
        },
        "armhojd_fran_hjassan": round(float(armrad / langd), 3),
    }


def kontrollera_tpose(path, ra=False):
    """Returnera (godkänd, mått, fel) för en T-posebild.

    ra=True gäller bilden direkt från bildtjänsten: den måste ha hela figuren innanför
    kanten och rätt proportioner, men marginalen rättas sedan av normalisera_tpose.
    """
    m = matt_tpose(path)
    fel = []
    w, h = m["bild_px"]
    sida = TPOSE_KANTSKYDD if ra else TPOSE_MIN_SIDOMARGINAL
    hojd = TPOSE_KANTSKYDD if ra else TPOSE_MIN_HOJDMARGINAL
    if w != h and not ra:
        fel.append(f"bilden är {w}×{h}, inte kvadratisk")
    if min(m["marginal"]["vanster"], m["marginal"]["hoger"]) < sida:
        fel.append("för liten sidomarginal vid fingertopparna")
    if min(m["marginal"]["topp"], m["marginal"]["botten"]) < hojd:
        fel.append("hjässa eller sulor ligger mot bildkanten")
    lo, hi = TPOSE_ARMSPANN
    if not lo <= m["armspann_per_langd"] <= hi:
        fel.append(f"armspann/längd {m['armspann_per_langd']} utanför {lo}–{hi}")
    lo, hi = TPOSE_ARMHOJD
    if not lo <= m["armhojd_fran_hjassan"] <= hi:
        fel.append("armarna är inte vågräta i axelhöjd")
    m["godkand"] = not fel
    m["fel"] = fel
    return not fel, m, fel


def normalisera_tpose(src, dst, storlek=1024):
    """Centrera figuren på en vit kvadrat med standardmarginal, utan att förvränga den.

    Bildtjänsten fyller ofta bredden trots instruktionen. Figuren skalas likformigt så att
    dess största mått (oftast armspannet) täcker 1 - 2 * TPOSE_MARGINAL_MAL av bilden.
    """
    from PIL import Image

    _, rows, cols = _silhuett(src)
    with Image.open(src) as im:
        rgb = im.convert("RGB")
    pad = 6
    box = (max(cols[0] - pad, 0), max(rows[0] - pad, 0),
           min(cols[-1] + pad + 1, rgb.width), min(rows[-1] + pad + 1, rgb.height))
    figur = rgb.crop(box)
    skala = storlek * (1 - 2 * TPOSE_MARGINAL_MAL) / max(figur.size)
    figur = figur.resize((round(figur.width * skala), round(figur.height * skala)), Image.LANCZOS)
    # Bakgrunden är sällan exakt vit. Nästan vita pixlar sätts till vitt, så att ingen
    # synlig ruta uppstår runt det beskurna partiet på den vita kvadraten.
    arr = np.asarray(figur).copy()
    arr[(255 * 3 - arr.astype(np.int16).sum(axis=2)) <= VIT_TROSKEL] = 255
    figur = Image.fromarray(arr)
    canvas = Image.new("RGB", (storlek, storlek), "white")
    canvas.paste(figur, ((storlek - figur.width) // 2, (storlek - figur.height) // 2))
    tmp = Path(dst).with_suffix(".tmp")
    canvas.save(tmp, format="PNG")
    tmp.replace(dst)
    return matt_tpose(dst)


# ---------------------------------------------------------------- 3D-geometri (glTF, Y upp)
def kroppsmatt(pos):
    """Längd och armspann för en upprätt modell i T-pose (glTF: Y upp, X i sidled)."""
    pos = np.asarray(pos, dtype=float)
    low, high = pos.min(axis=0), pos.max(axis=0)
    langd = high[1] - low[1]
    spann = high[0] - low[0]
    return {"langd": float(langd), "armspann": float(spann),
            "armspann_per_langd": float(spann / langd) if langd else 0.0}


def handled(pos, sida, langd=None, steg=None):
    """Hitta handleden längs en vågrät arm som den smalaste tvärsnittet nära handen.

    sida = +1 för modellens +X-arm, -1 för -X-armen. Returnerar handledens X-koordinat.
    Sökfönstret är 6–16 % av kroppslängden innanför fingertopparna. Där ligger handleden
    hos alla vuxna; ärmslut och kavajmudd ger bredare tvärsnitt och väljs därför inte.
    """
    pos = np.asarray(pos, dtype=float)
    low, high = pos.min(axis=0), pos.max(axis=0)
    langd = langd or (high[1] - low[1])
    spets = high[0] if sida > 0 else low[0]
    x = pos[:, 0] * sida
    tip = spets * sida
    steg = steg or langd * 0.004
    narmast, langst = tip - langd * 0.16, tip - langd * 0.06
    kanter = np.arange(narmast, langst + steg, steg)
    bast, bast_area = None, np.inf
    for a, b in zip(kanter[:-1], kanter[1:]):
        skiva = pos[(x >= a) & (x < b)]
        if len(skiva) < 8:
            continue
        # Armens tvärsnitt: bara punkter nära armens egen mitt, inte kroppen eller låren.
        mitt = np.median(skiva[:, 1:], axis=0)
        nara = skiva[np.linalg.norm(skiva[:, 1:] - mitt, axis=1) < langd * 0.08]
        if len(nara) < 8:
            continue
        area = np.ptp(nara[:, 1]) * np.ptp(nara[:, 2])
        if area < bast_area:
            bast, bast_area = (a + b) / 2, area
    if bast is None:
        bast = tip - langd * HANDLANGD_NORM
    return float(bast * sida), float(spets)


def halssnitt(pos, langd=None):
    """Halssnittets höjd som andel av längden, mätt i halsens smala del.

    Ett fast snitt (0,853) hamnade på vissa kroppar i trapetsmuskeln, där kroppen är
    0,30 m bred. Huvudets halskant sträcktes då 2,3 gånger på bredden och bildade
    flikar. Här söks halsens smalaste tvärsnitt mellan 84 och 92 % av längden, och
    snittet läggs på den lägsta nivån nedanför där bredden högst är 20 % större.
    """
    pos = np.asarray(pos, dtype=float)
    low, high = pos.min(axis=0), pos.max(axis=0)
    langd = langd or (high[1] - low[1])
    mitt = np.median(pos[pos[:, 1] > low[1] + 0.8 * langd][:, 0])
    kolumn = pos[np.abs(pos[:, 0] - mitt) < 0.12 * langd]
    nivaer = np.arange(0.80, 0.92, 0.0025)
    bredd = []
    for f in nivaer:
        skiva = kolumn[np.abs(kolumn[:, 1] - (low[1] + f * langd)) < 0.002 * langd]
        bredd.append(np.ptp(skiva[:, 0]) if len(skiva) > 8 else np.inf)
    bredd = np.array(bredd)
    fonster = (nivaer >= 0.84) & (nivaer <= 0.92)
    if not np.isfinite(bredd[fonster]).any():
        return HALSSNITT, None
    smalast = int(np.flatnonzero(fonster)[np.argmin(bredd[fonster])])
    grans = 1.2 * bredd[smalast]
    val = smalast
    while val > 0 and nivaer[val - 1] >= HALSSNITT_FONSTER[0] and bredd[val - 1] <= grans:
        val -= 1
    return float(nivaer[val]), float(bredd[val] / langd)


def kontrollera_proportioner(pos):
    """Sammanfatta längd, armspann och handlängd för en statisk T-posemodell."""
    m = kroppsmatt(pos)
    hander = {}
    for namn, sida in (("plusX", 1), ("minusX", -1)):
        led, spets = handled(pos, sida, m["langd"])
        hander[namn] = round(abs(spets - led) / m["langd"], 3)
    m["handlangd_per_langd"] = hander
    fel = []
    if not 0.88 <= m["armspann_per_langd"] <= 1.12:
        fel.append("armspannet avviker från kroppslängden")
    for namn, andel in hander.items():
        if not HANDLANGD[0] <= andel <= HANDLANGD[1]:
            fel.append(f"handlängd {namn} {andel} utanför {HANDLANGD}")
    m["fel"] = fel
    m["godkand"] = not fel
    return {k: (round(v, 4) if isinstance(v, float) else v) for k, v in m.items()}


def testbild_tpose(storlek=1024):
    """En ritad T-pose som klarar kontrollen, för enhetstester utan bildtjänst."""
    from PIL import Image, ImageDraw

    bild = Image.new("RGB", (storlek, storlek), "white")
    rita = ImageDraw.Draw(bild)
    a, b = int(storlek * 0.15), int(storlek * 0.85)
    mitt = storlek // 2
    rita.rectangle((mitt - storlek // 20, a, mitt + storlek // 20, b), fill=(40, 60, 80))
    arm = a + int((b - a) * 0.18)
    rita.rectangle((a, arm, b, arm + storlek // 40), fill=(200, 150, 120))
    return bild
