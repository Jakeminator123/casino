"""Tre referensbilder för ett-knapptrycksbygget i A-pose (gpt-image-2, images/edits).

Alla inputfoton skickas samtidigt till varje anrop:
  head-ref.png   skarp studio-byst framifrån (huvud, hel hals, axlarnas överkant)
  apose-ref.png  helkropp i A-pose (~42° nedåtvinklade armar, öppna händer), mätt och normaliserad
  hands-ref.png  en öppen HÖGERhand med separerade fingrar (speglas till vänster i bygg_modul)

A-posebilden kontrolleras med silhuettmått innan något Meshy-jobb får starta, och genereras om
(högst APOSE_OMFORSOK gånger, bara bildkostnad) om armarna ligger mot kroppen eller figuren är beskuren.
Nycklar läses tyst ur miljön eller repots .env.local och skrivs aldrig ut.
"""


import sys
from pathlib import Path as _Path
_ROOT = next(
    c for c in [_Path(__file__).resolve().parent, *_Path(__file__).resolve().parents]
    if (c / "auto_avatar.py").is_file()
)
if str(_ROOT / "gemensamt") not in sys.path:
    sys.path.insert(0, str(_ROOT / "gemensamt"))
from sokvagar import add_paths, env_candidates
ROOT = add_paths(_ROOT)

import base64
import io
import json
import os
from contextlib import ExitStack
from pathlib import Path

import numpy as np
import requests
from dotenv import dotenv_values
from PIL import Image, ImageDraw, ImageFont, ImageOps

MODEL = "gpt-image-2"
SIZE = "1024x1024"
APOSE_OMFORSOK = 2
APOSE_MARGINAL = 0.11          # vit marginal runt figurens största mått efter normalisering
APOSE_SPANN = (0.62, 0.95)     # bredd (fingertopp–fingertopp) / längd i bilden; A-pose ≈ 0,75
APOSE_BREDAST = (0.40, 0.60)   # bredaste raden (händerna), andel av längden från hjässan
VIT_TROSKEL = 40

DEFAULT_OUTFIT = (
    "a well-fitted, tailored dark navy long-sleeve button-up dress shirt in matte cotton with visible fabric "
    "weave, sleeves ending exactly at the wrists, shirt tucked into slim dark charcoal trousers with a thin "
    "black leather belt, dark matte leather shoes - classy live-casino dealer smart-casual look"
)

PROMPTS = {
    "head": (
        "Use ALL of these reference photographs of the same real person to create one identity-faithful, "
        "razor-sharp front-facing studio portrait for 3D head reconstruction. Exact likeness: match age, face "
        "shape, eye shape and colour, nose, mouth, ears, facial asymmetry, hairline, hairstyle and hair colour, "
        "facial hair (keep it neatly trimmed and close to the jaw, same style as in the photos) and skin texture. "
        "Neutral relaxed expression, mouth closed, eyes looking straight into the camera, head level. "
        "Framing: the entire head with all hair and both ears, the whole neck clearly visible and uncovered, "
        "jawline free, and only the top of the shoulders at the bottom edge, wearing a plain dark crew-neck "
        "t-shirt with a low round neckline (no collar, nothing covering the neck). ALL hair must be swept cleanly behind the "
        "ears and shoulders or tied back so the entire neck, jawline, collarbone, and t-shirt shoulders remain 100 percent uncovered and hair-free. Face and neck fill the frame. Diffuse even studio light, pure white seamless "
        "background, no glasses, no hat, no jewelry, no lettering."
    ),
    "apose": (
        "Full-body studio photograph of the SAME person as in the reference photos: keep the exact face, "
        "hairstyle, hair colour, facial hair, ears, skin tone and natural body build of this person. Front view, "
        "camera at chest height, straight-on, orthographic-like 85mm look, entire body visible from the top of "
        "the head to the soles of the shoes. Pose: a clean symmetric A-POSE for 3D scanning: standing upright, "
        "feet shoulder-width apart, both arms straight and lowered sideways so that each arm makes a 42-degree "
        "angle with the side of the torso - halfway between arms hanging down and a horizontal T-pose. The "
        "wrists are at the height of the belt/navel and far out to the sides, with a large triangular gap of "
        "white background between each arm and the torso. NOT a T-pose, NOT arms hanging down, shoulders relaxed "
        "and naturally sloping, palms facing forward/slightly inward, hands open, all five fingers on each hand "
        "clearly visible and separated with small gaps. Neutral relaxed face looking straight into the camera, "
        "mouth closed. ALL hair swept cleanly behind the back and shoulders (or tied back) so ZERO hair falls onto the chest, shirt front, collar, or neck. Clothing: {outfit}. Nothing shiny, no jacket, no tie, "
        "no watch, no jewelry, no logos, no glasses, no hat. Pure seamless white studio background, soft even "
        "shadowless lighting, sharp focus, photorealistic, high detail. Composition: the whole figure centred and "
        "small enough that there is a generous white margin of at least 10 percent of the image on all four "
        "sides (above the head, below the shoes, left and right of the hands). Nothing cropped."
    ),
    "hands": (
        "Photorealistic neutral studio reference photograph for generating an isolated 3D hand. The reference "
        "photos show the person: match their skin tone, age, build and hand proportions only. A close-up of ONE "
        "anatomical RIGHT hand, back of the hand toward the viewer, all five short natural fingernails visible, "
        "thumb on the LEFT side of the image, four long fingers pointing up. Flat relaxed splay with narrow but "
        "distinct white gaps around each finger and a wider gap around the thumb. Natural relative finger "
        "lengths. Entire hand and several centimeters of wrist visible with a neat straight wrist base ending "
        "against the white background like a 3D character asset. Hand fills 85% of the image height. Fine "
        "pores, skin creases at the joints, subtle tendons, neutral soft diffuse illumination, straight-on "
        "dorsal view. No sleeve, jewelry, watch, props, text, multiple views, arm beyond the short wrist or other "
        "body parts. A clear unoccluded silhouette suitable for reconstruction."
    ),
}
FILES = {"head": "head-ref.png", "apose": "apose-ref.png", "hands": "hands-ref.png"}
APOSE_UTZOOMNING = (
    " IMPORTANT: the previous attempt failed the automatic check (arms too close to the body, figure cropped "
    "or too large). Zoom out, keep both arms clearly away from the torso at about 42 degrees, and leave wide "
    "white margins on every side."
)


def openai_key():
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        for env_file in env_candidates(ROOT):
            if env_file.is_file():
                val = dotenv_values(env_file, encoding="utf-8-sig").get("OPENAI_API_KEY")
                if val and val.strip():
                    key = val.strip()
                    break
    if not key:
        raise ValueError(f"Referensbilderna kräver OPENAI_API_KEY i miljön eller i {ROOT / '.env'}.")
    return key


def _request(key, photos, prompt):
    with ExitStack() as streams:
        files = []
        for src in photos:
            with Image.open(src) as im:
                mime = Image.MIME[im.format]
            files.append(("image[]", (Path(src).name, streams.enter_context(open(src, "rb")), mime)))
        response = requests.post(
            "https://api.openai.com/v1/images/edits", headers={"Authorization": f"Bearer {key}"}, files=files,
            data={"model": MODEL, "prompt": prompt, "quality": "high", "size": SIZE, "output_format": "png", "n": "1"},
            timeout=(20, 900))
    if not response.ok:
        try:
            detail = response.json().get("error", {}).get("message", "")[:300]
        except Exception:
            detail = ""
        raise RuntimeError(f"Bildtjänsten svarade HTTP {response.status_code}: {detail}")
    content = base64.b64decode(response.json()["data"][0]["b64_json"], validate=True)
    with Image.open(io.BytesIO(content)) as im:
        im.verify()
    return content


def _mask(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    return (765 - a.sum(2)) > VIT_TROSKEL


def matt_apose(path):
    """Silhuettmått för en A-posebild: spann/längd, var bredaste raden ligger, marginaler, armgap."""
    m = _mask(path)
    ys, xs = np.where(m)
    if len(ys) == 0:
        return {"tom": True}
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    H = y1 - y0 + 1
    widths = np.array([np.ptp(np.where(m[y])[0]) if m[y].any() else 0 for y in range(y0, y1 + 1)])

    def runs(y):
        r = m[y].astype(int)
        return int((np.diff(r) == 1).sum() + r[0])

    h, w = m.shape
    return {
        "spann_per_langd": round(float((x1 - x0 + 1) / H), 3),
        "bredast_fran_hjassan": round(float(np.argmax(widths) / H), 3),
        "marginal_v_h_o_u": [round(float(v), 3) for v in (x0 / w, (w - 1 - x1) / w, y0 / h, (h - 1 - y1) / h)],
        "konturer_vid_35_40_procent": [runs(int(y0 + f * H)) for f in (0.35, 0.40)],
    }


def kontrollera_apose(path):
    m = matt_apose(path)
    if m.get("tom"):
        return False, m, ["tom bild"]
    problems = []
    if not APOSE_SPANN[0] <= m["spann_per_langd"] <= APOSE_SPANN[1]:
        problems.append(f"armspann/längd {m['spann_per_langd']} utanför {APOSE_SPANN}")
    if not APOSE_BREDAST[0] <= m["bredast_fran_hjassan"] <= APOSE_BREDAST[1]:
        problems.append(f"händernas höjd {m['bredast_fran_hjassan']} utanför {APOSE_BREDAST}")
    if min(m["marginal_v_h_o_u"]) < 0.005:
        problems.append("figuren nuddar bildkanten")
    if any(r < 3 for r in m["konturer_vid_35_40_procent"]):
        problems.append("armarna ligger mot bålen (inget vitt gap)")
    return not problems, m, problems


def normalisera_apose(src, dst, storlek=1024, marginal=APOSE_MARGINAL):
    im = Image.open(src).convert("RGB")
    m = _mask(src)
    ys, xs = np.where(m)
    crop = im.crop((max(0, xs.min() - 4), max(0, ys.min() - 4), min(im.width, xs.max() + 5), min(im.height, ys.max() + 5)))
    arr = np.asarray(crop).copy()
    arr[arr.min(2) > 238] = 255
    crop = Image.fromarray(arr)
    s = storlek * (1 - 2 * marginal) / max(crop.size)
    crop = crop.resize((round(crop.width * s), round(crop.height * s)), Image.LANCZOS)
    out = Image.new("RGB", (storlek, storlek), "white")
    out.paste(crop, ((storlek - crop.width) // 2, (storlek - crop.height) // 2))
    tmp = Path(dst).with_suffix(".tmp")
    out.save(tmp, format="PNG")
    tmp.replace(dst)


def _save(path, content):
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(content)
    tmp.replace(path)


def ref_sheet(paths, labels, target, title=None):
    tile, pad = 512, 16
    top = 56 if title else 0
    canvas = Image.new("RGB", (len(paths) * (tile + pad) + pad, tile + 60 + top), "#edf0ed")
    draw = ImageDraw.Draw(canvas)
    font = big = ImageFont.load_default()
    for cand in (Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts/segoeui.ttf",
                 Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")):
        if cand.exists():
            font = ImageFont.truetype(str(cand), 22)
            big = ImageFont.truetype(str(cand), 28)
            break
    if title:
        draw.text((pad, 14), title, font=big, fill="#1d2a24")
    for i, (p, label) in enumerate(zip(paths, labels)):
        with Image.open(p) as src:
            img = ImageOps.contain(src.convert("RGB"), (tile, tile))
        x = pad + i * (tile + pad)
        canvas.paste(img, (x + (tile - img.width) // 2, top + 44 + (tile - img.height) // 2))
        draw.text((x, top + 10), label, font=font, fill="#28342f")
    canvas.save(target)


def generate(photos, dest, outfit=None, log=print):
    """Skapar (eller återanvänder) head-ref, apose-ref och hands-ref i dest. Returnerar sökvägar + mått."""
    dest = Path(dest)
    dest.mkdir(parents=True, exist_ok=True)
    photos = [Path(p) for p in photos]
    if not 1 <= len(photos) <= 8:
        raise ValueError("Ange 1–8 foton av samma person.")
    for p in photos:
        with Image.open(p) as im:
            im.verify()
    prompts = dict(PROMPTS)
    prompts["apose"] = prompts["apose"].format(outfit=outfit or DEFAULT_OUTFIT)
    paths = {role: dest / name for role, name in FILES.items()}
    report = {"modell": MODEL, "storlek": SIZE, "kvalitet": "high", "foton": [p.name for p in photos],
              "prompter": prompts, "apose_forsok": []}
    key = None
    for role in ("head", "hands"):
        if paths[role].is_file():
            log(f"Återanvänder {paths[role].name}")
            continue
        key = key or openai_key()
        log(f"Skapar {paths[role].name} ({MODEL}, {SIZE}, high, {len(photos)} foton)")
        _save(paths[role], _request(key, photos, prompts[role]))
    if paths["apose"].is_file() and kontrollera_apose(paths["apose"])[0]:
        log("Återanvänder apose-ref.png")
        report["apose_matt"] = matt_apose(paths["apose"])
    else:
        trials = dest / "apose-forsok"
        trials.mkdir(exist_ok=True)
        chosen = None
        for cand in sorted(trials.glob("forsok*.png")):
            ok, m, prob = kontrollera_apose(cand)
            report["apose_forsok"].append({"fil": cand.name, "ok": ok, "matt": m, "problem": prob})
            if ok:
                chosen = cand
                break
        n0 = len(list(trials.glob("forsok*.png")))
        for attempt in range(n0, n0 + 1 + APOSE_OMFORSOK):
            if chosen:
                break
            key = key or openai_key()
            log(f"Skapar A-posebild (försök {attempt + 1})")
            cand = trials / f"forsok{attempt + 1}.png"
            _save(cand, _request(key, photos, prompts["apose"] + (APOSE_UTZOOMNING if attempt else "")))
            ok, m, prob = kontrollera_apose(cand)
            report["apose_forsok"].append({"fil": cand.name, "ok": ok, "matt": m, "problem": prob})
            log("  A-posemått:", json.dumps(m), "OK" if ok else "; ".join(prob))
            if ok:
                chosen = cand
        if not chosen:
            (dest / "referenser.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
            raise ValueError("A-posebilden klarade inte kontrollen efter omförsök. Inga Meshy-krediter förbrukade.")
        normalisera_apose(chosen, paths["apose"])
        report["apose_vald"] = chosen.name
        report["apose_matt"] = matt_apose(paths["apose"])
    (dest / "referenser.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    return paths, report


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--photos", nargs="+", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--outfit")
    a = ap.parse_args()
    p, _ = generate(a.photos, a.out, a.outfit)
    ref_sheet([p["head"], p["apose"], p["hands"]], ["head-ref.png", "apose-ref.png", "hands-ref.png"], a.out / "ref-3-bilder.png")
    print(json.dumps({k: str(v) for k, v in p.items()}))
