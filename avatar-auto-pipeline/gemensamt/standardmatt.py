"""Gemensamma standardmått för avatarbygget.

Alla tal här gäller oavsett person, frisyr och kläder. Skript som behöver ett
snitt eller en kroppsproportion hämtar det härifrån. Måtten är andelar av
kroppslängden och mäts mot geometrin.
"""


import numpy as np

# ---------------------------------------------------------------- 3D-geometri (glTF, Y upp)
HANDLANGD = (0.095, 0.125)  # handled till långfingertopp, andel av kroppslängden
HALSSNITT = 0.853           # reserv om halsens smala del inte går att mäta, andel från sulan
HALSSNITT_FONSTER = (0.825, 0.90)
HALS_BREDDKVOT = (0.6, 1.6)  # tillåten breddskillnad mellan huvudets och kroppens halskant
HUVUDSNITT_BYST = 0.455     # snitt i en Meshy-byst, andel från bystens botten
HUVUDSNITT_LUTNING = 0.22
HANDSNITT_HAND = 0.08       # snitt i en Meshy-hand, andel från handledens ände


def kroppsmatt(pos):
    """Längd och bredd för en upprätt modell (glTF: Y upp, X i sidled)."""
    pos = np.asarray(pos, dtype=float)
    low, high = pos.min(axis=0), pos.max(axis=0)
    langd = high[1] - low[1]
    spann = high[0] - low[0]
    return {"langd": float(langd), "armspann": float(spann),
            "armspann_per_langd": float(spann / langd) if langd else 0.0}


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
