"""Grunddockornas mått för steg 15 utan Blender: MATT ur scen/bygg_docka.py (raderna från `MATT = {` till `PASS_TGT`,
som bara är tal och ordböcker), och vilken grund en stil har. bygg_docka.py går bara att köra i Blender, så det läses här
som text, som vagar.py och live-bj/verktyg/lyft.py läser det.
"""
from pathlib import Path

ROT = Path(__file__).resolve().parents[2]
GRUND_FOR_STIL = {'kameran': 'danilo', 'bordet': 'frasse'}   # en person byggs på dockan vars rörelser den spelar
# Måtten en person får ta ur sina bilder i stället för grundens (bygg_docka.py PASS_TGT har dem): axellederna, armarna,
# bålen och huvudet. Midjan, höften och benen syns inte vid bordet och är grundens. Handen är grundens: SAM:s hand är för
# kort för att vara samma mått som dockans (handleden till långfingrets topp 0,14 m, med fingrarnas leder 0,16, där en
# man har 0,19), och ingen docka har ännu mätts på båda sätten; SAM:s och MediaPipes hand står i personfilen som data.
PASSAS = ('sw', 'ua', 'fa', 'ht', 'huvud_h', 'huvud_b')
# Mätningen mot ett facit: Tomasz bilder (input/tomasz/) mätta med steg 15 (matt_ur_bilder.py tomasz --facit tomasz_matt)
# mot MATT['tomasz_matt'], som är mätt på hans 3D-figur bredvid mannen (2026-11-27). Felet per mått är en undre gräns för
# osäkerheten: ett mått som skiljer sig från grundens mindre än så tas inte ur bilderna. SAM ger axlarna nästan lika för
# Kenji och Tomasz (0,373 och 0,368 m) fast Tomasz är den större: axelbredden är SAM:s minst säkra mått.
KALIBRERING = {'facit': 'tomasz_matt', 'fel': {'sw': 0.022, 'ua': 0.008, 'fa': 0.006, 'ht': 0.024, 'huvud_h': 0.005, 'huvud_b': 0.005}}
# Mannens huvud på hans egen modell (hjässan till hakan, huden på Head, som blackjack-dealer/dealer3d/tools/docka-matt.ts mäter
# den på assets/docka/standarddocka_man.glb, 2 x headRadius): en grund med huvud_b None har mannens bredd i samma förhållande som höjden
# (bygg_docka.py bygg_en).
MANNENS_HUVUD_H = 0.2262


def las_matt() -> dict:
    text = (ROT / 'scen' / 'bygg_docka.py').read_text(encoding='utf-8')
    block = text[text.index('\nMATT = {') + 1:text.index('\nPASS_TGT = {')]
    rum: dict = {}
    exec(compile(block, 'bygg_docka.py (MATT)', 'exec'), {}, rum)   # bara tal: ordböcker och en comprehension över MATT
    return rum['MATT']


def grundens_matt(grund: str) -> dict:
    """Grundens mått i meter, de som går att jämföra med en persons: det som står i dess passa, och för det som står None
    det bygget ger (huvudets bredd ur höjden som mannens)."""
    M = las_matt()
    if grund not in M:
        raise SystemExit(f'{grund} finns inte i scen/bygg_docka.py MATT')
    p = dict(M[grund].get('passa', {}))
    man = M['man']['passa']
    for k, v in man.items():
        p.setdefault(k, v)
    if p.get('huvud_b') is None:
        p['huvud_b'] = man['huvud_b'] * p.get('huvud_h', MANNENS_HUVUD_H) / MANNENS_HUVUD_H
    p.setdefault('huvud_h', MANNENS_HUVUD_H)
    p.setdefault('sw', 0.3753)   # mannens axelleder på hans modell (docka-matt.ts på standarddocka_man.glb; MPFB:s egna)
    return {k: v for k, v in p.items() if isinstance(v, (int, float))}
