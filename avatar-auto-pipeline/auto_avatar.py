"""Ett knapptryck: 1–8 foton av en person -> riggad 4K dealer-GLB i A-pose + QC-blad + kort rörelsefilm.

    python auto_avatar.py --name rosalina
    python auto_avatar.py --photos p1.jpg p2.jpg p3.jpg --name kim --out output/kim

Steg (varje steg skriver till egen numrerad mapp under output/<namn>/ och återupptas gratis via kvitton):
  1 (01-referenser)          gpt-image-2 referensbilder: head-ref, apose-ref, hands-ref + ref-3-bilder.png
  2 (02-meshy-delar)         Meshy 7.1 image-to-3d 4K PBR parallellt: huvud, A-pose-kropp, högerhand
  3 (03-montering)           Huvudmodul + speglat handpar, montering + forenkla_4k (180k tris) + förhandsbild
  4 (04-rigg)                Meshy Auto-Rigging (5 kr)
  5 (05-fingrar-handleder)   Fingerben (3×10), hals-/axelvikter, smal handledsfix + före/efter-jämförelse
  6 (06-dealer-export)       Dealer-GLB (mixamorig: bort, Neck -> neck, benkontroll)
  7 (07-qc)                  QC-blad (helkropp fram/3/4, ansikte, båda handlederna)
  8 (08-film)                Sittande dealer-rörelse (MP4 + animerad GLB + bildstrip)

Nycklar (OPENAI_API_KEY, MESHY_API_KEY) läses tyst ur miljön eller .env / .env.local och skrivs aldrig ut.
"""

import argparse
import importlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

import numpy as np
import requests
from dotenv import dotenv_values
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "gemensamt"))
from sokvagar import add_paths  # noqa: E402
add_paths(HERE)
import apose_referenser  # noqa: E402
import bygg_modul  # noqa: E402  (lägger metod/ på sys.path)
import meshy_enbild  # noqa: E402
import meshy_rigg  # noqa: E402
from gltf import Asset  # noqa: E402
from montera_apose import assemble_apose  # noqa: E402
from standardmatt import HANDSNITT_HAND, HUVUDSNITT_BYST, HUVUDSNITT_LUTNING  # noqa: E402

BODY_SETTINGS = {**meshy_enbild.SETTINGS, "should_remesh": False, "pose_mode": "a-pose"}
PART_SETTINGS = dict(meshy_enbild.SETTINGS)
RIG_TRIANGLES = 180000
HUVUDSNITT_FONSTER = (0.345, 0.56)
IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp")

STEP_DIRS = {
    1: "01-referenser",
    2: "02-meshy-delar",
    3: "03-montering",
    4: "04-rigg",
    5: "05-fingrar-handleder",
    6: "06-dealer-export",
    7: "07-qc",
    8: "08-film",
}


def now_iso():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def log(*parts):
    print(time.strftime("%H:%M:%S"), *parts, flush=True)


def key_status(var_name):
    """Returnerar True om nyckeln finns (icke-tom) i miljön eller .env/.env.local. Visar aldrig värdet."""
    val = os.environ.get(var_name)
    if val and val.strip():
        return True, "miljövariabel"
    for env_file in (HERE / ".env", HERE / ".env.local", HERE.parent / ".env", HERE.parent / ".env.local"):
        if env_file.is_file():
            v = dotenv_values(env_file, encoding="utf-8-sig").get(var_name)
            if v and v.strip():
                return True, env_file.name
    return False, None


def blender_executable():
    configured = os.environ.get("BLENDER_EXE")
    if configured:
        p = Path(configured)
        if p.is_file():
            return p
    local_tools = sorted((HERE / "tools").glob("blender*/blender.exe"), reverse=True)
    if local_tools and local_tools[0].is_file():
        return local_tools[0]
    which_b = shutil.which("blender")
    if which_b and Path(which_b).is_file():
        return Path(which_b)
    base = Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Blender Foundation"
    choices = sorted(base.glob("Blender */blender.exe"), reverse=True)
    if choices and choices[0].is_file():
        return choices[0]
    raise ValueError(
        "Hittar inte Blender. Installera Blender, se till att den ligger i PATH "
        "eller under C:\\Program Files\\Blender Foundation\\, eller ange sökvägen i BLENDER_EXE."
    )


SCRIPTS = {
    "clean_kropp_chest.py": HERE / "steg" / "03-montering" / "clean_kropp_chest.py",
    "forenkla_4k.py": HERE / "steg" / "03-montering" / "forenkla_4k.py",
    "forhandsvisning_montering.py": HERE / "steg" / "03-montering" / "forhandsvisning_montering.py",
    "bygg_fingrar_apose.py": HERE / "steg" / "05-fingrar-handleder" / "bygg_fingrar_apose.py",
    "fixa_handleder.py": HERE / "steg" / "05-fingrar-handleder" / "fixa_handleder.py",
    "exportera_dealer.py": HERE / "steg" / "06-dealer-export" / "exportera_dealer.py",
    "qc_oversikt.py": HERE / "steg" / "07-qc" / "qc_oversikt.py",
    "animera_dealer.py": HERE / "steg" / "08-film" / "animera_dealer.py",
}


def blender(script, *args, logfile):
    path = SCRIPTS.get(script)
    if path is None or not path.is_file():
        raise FileNotFoundError(f"Hittar inte Blender-skriptet {script} (förväntat: {path})")
    cmd = [str(blender_executable()), "-b", "--python-exit-code", "1", "--python", str(path), "--",
           *map(str, args)]
    t = time.time()
    Path(logfile).parent.mkdir(parents=True, exist_ok=True)
    with open(logfile, "w", encoding="utf-8", errors="replace") as fh:
        rc = subprocess.run(cmd, stdout=fh, stderr=subprocess.STDOUT).returncode
    if rc:
        tail = Path(logfile).read_text(encoding="utf-8", errors="replace").splitlines()[-25:]
        raise RuntimeError(f"Blender-steget {script} misslyckades (rc={rc}). Slutet av {logfile}:\n" + "\n".join(tail))
    return round(time.time() - t, 1)


def meshy_saldo():
    try:
        r = requests.get("https://api.meshy.ai/openapi/v1/balance",
                         headers={"Authorization": "Bearer " + meshy_enbild.get_key()}, timeout=30)
        return r.json().get("balance") if r.ok else None
    except Exception:
        return None


def huvudsnitt(glb, slope=HUVUDSNITT_LUTNING):
    """Snittnivå i Meshy-bysten: mitten av det rena hudbandet (halsen) direkt ovanför tröjkragen."""
    import bygg
    asset = Asset(glb)
    pos = asset.pos.astype(float)
    h = pos[:, 1] + slope * pos[:, 2]
    lo, span = h.min(), np.ptp(h)
    c = np.asarray(bygg.vertex_colors(asset.color(), asset.uv), float)[:, :3]
    c = c / (255 if c.max() > 1.5 else 1)
    skin = (c[:, 0] > c[:, 2] + 0.06) & (c[:, 0] > 0.3)
    rows = []
    for f in np.arange(0.30, 0.64, 0.005):
        sl = np.abs(h - (lo + f * span)) < 0.004 * span
        if sl.sum() >= 30:
            rows.append((round(float(f), 4), float(skin[sl].mean()), float(np.ptp(pos[sl, 0]) / span)))
    bands, cur = [], []
    for f, frac, _ in rows:
        if frac >= 0.9:
            cur.append(f)
        elif cur:
            bands.append(cur)
            cur = []
    if cur:
        bands.append(cur)
    bands = [b for b in bands if b[-1] - b[0] >= 0.02]
    profil = [[f, round(fr, 3), round(w, 3)] for f, fr, w in rows]
    if not bands:
        # Långt hår runt halsen sänker hudandelen i hela skivan. Hitta då halsen mellan
        # tröjkantens slut och hakans utsprång i Z via sRGB-hud/tyg-separering.
        col = asset.color()
        xy = np.mod(asset.uv, 1) * [col.shape[1], col.shape[0]] - 0.5
        x0 = np.clip(np.round(xy[:, 0]).astype(int), 0, col.shape[1] - 1)
        y0 = np.clip(np.round(xy[:, 1]).astype(int), 0, col.shape[0] - 1)
        srgb = col[y0, x0] / 255.0
        skin_s = (srgb[:, 0] > srgb[:, 2] + 0.06) & (srgb[:, 0] > 0.45)
        dark_cloth = (srgb.max(axis=1) < 0.16) & ((srgb[:, 0] - srgb[:, 2]) < 0.035)
        neck_rows = []
        for f in np.arange(0.28, 0.56, 0.005):
            sl = np.abs(h - (lo + f * span)) < 0.004 * span
            if sl.sum() < 30:
                continue
            sk_sl = sl & skin_s
            n_cloth = int(dark_cloth[sl].sum())
            n_sk = int(sk_sl.sum())
            zmax_sk = float(pos[sk_sl, 2].max()) if n_sk >= 20 else np.nan
            neck_rows.append((round(float(f), 4), n_cloth, n_sk, zmax_sk))
        shirt_hits = [r[0] for r in neck_rows if r[0] <= 0.42 and r[1] >= 40]
        shirt_top = max(shirt_hits) if shirt_hits else 0.325
        ref_z = [r[3] for r in neck_rows if shirt_top + 0.01 <= r[0] <= shirt_top + 0.07 and np.isfinite(r[3])]
        z_neck_ref = float(np.median(ref_z)) if ref_z else 0.18
        chin_hits = [r[0] for r in neck_rows if r[0] >= shirt_top + 0.04 and np.isfinite(r[3]) and r[3] > z_neck_ref + 0.08 * span]
        f_chin = chin_hits[0] if chin_hits else 0.455
        cand = [r for r in neck_rows if max(0.345, shirt_top + 0.020) <= r[0] <= min(0.42, f_chin - 0.03) and r[1] <= 5 and r[2] >= 80]
        if cand:
            # Välj strax ovanför tröjkanten (bevarar både hela halsen och fallande hår).
            chosen = float(np.clip(cand[min(2, len(cand) - 1)][0], *HUVUDSNITT_FONSTER))
            return chosen, {
                "metod": "hals mellan tröjkant och haka (långt hår)",
                "trojkant": round(float(shirt_top), 4),
                "haka": round(float(f_chin), 4),
                "valt": round(chosen, 4),
                "standard": HUVUDSNITT_BYST,
                "profil": profil,
            }
        return HUVUDSNITT_BYST, {"metod": "standard (inget hudband hittat)", "valt": HUVUDSNITT_BYST, "profil": profil}
    band = bands[0]
    chosen = float(np.clip((band[0] + band[-1]) / 2, *HUVUDSNITT_FONSTER))
    return chosen, {"metod": "mitten av halsens hudband ovanför kragen", "band": [band[0], band[-1]],
                    "valt": round(chosen, 4), "standard": HUVUDSNITT_BYST, "profil": profil}


def _font(size):
    for cand in (Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts/segoeui.ttf",
                 Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")):
        if cand.exists():
            return ImageFont.truetype(str(cand), size)
    return ImageFont.load_default()


def sheet(paths, labels, columns, target, title, tile=520, tile_h=None):
    tile_h = tile_h or tile
    rows = (len(paths) + columns - 1) // columns
    head = 64
    canvas = Image.new("RGB", (columns * tile, head + rows * (tile_h + 40)), "#edf0ed")
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 16), title, font=_font(30), fill="#1d2a24")
    font = _font(21)
    for i, (p, label) in enumerate(zip(paths, labels)):
        x, y = (i % columns) * tile, head + (i // columns) * (tile_h + 40)
        with Image.open(p) as src:
            img = ImageOps.contain(src.convert("RGB"), (tile - 16, tile_h - 16))
        canvas.paste(img, (x + (tile - img.width) // 2, y + 36 + (tile_h - 16 - img.height) // 2))
        draw.text((x + 12, y + 6), label, font=font, fill="#28342f")
    Path(target).parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target)


def strip_from_mp4(mp4, target, seconds, n=6):
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return None
    tmp = target.parent / "strip-mp4"
    tmp.mkdir(exist_ok=True)
    frames = []
    for i in range(n):
        t = min(seconds - 0.05, i * seconds / (n - 1))
        f = tmp / f"t{i}.png"
        subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", str(mp4), "-frames:v", "1", str(f)],
                       check=True)
        frames.append((f, f"{t:.1f} s"))
    sheet([f for f, _ in frames], [l for _, l in frames], 3, target, f"Rörelsefilm {mp4.name} – 6 rutor ur MP4:n", 640, 376)
    return target


def safe_name(name):
    s = re.sub(r"[^A-Za-z0-9_-]+", "-", name.strip()).strip("-").lower()
    if not s:
        raise ValueError("Ange ett namn med bokstäver eller siffror.")
    return s


def discover_photos(name):
    folder = HERE / "input" / name
    if not folder.is_dir():
        raise FileNotFoundError(f"Hittar inte fotomappen {folder} och inga --photos angavs.")
    photos = sorted(
        p for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )
    if not photos:
        raise FileNotFoundError(f"Inga bilder ({', '.join(IMAGE_EXTS)}) hittades i {folder}.")
    return photos


class _Tee:
    def __init__(self, orig, fh):
        self.orig = orig
        self.fh = fh

    def write(self, data):
        self.orig.write(data)
        self.fh.write(data)
        return len(data)

    def flush(self):
        self.orig.flush()
        self.fh.flush()


@contextmanager
def step_logger(logfile):
    logfile.parent.mkdir(parents=True, exist_ok=True)
    with open(logfile, "a", encoding="utf-8", errors="replace") as fh:
        fh.write(f"\n=== Körning startad {now_iso()} ===\n")
        old_out, old_err = sys.stdout, sys.stderr
        sys.stdout = _Tee(old_out, fh)
        sys.stderr = _Tee(old_err, fh)
        try:
            yield
        finally:
            sys.stdout = old_out
            sys.stderr = old_err


def _require_file(path, step_num):
    if not Path(path).is_file():
        raise FileNotFoundError(
            f"Saknar förväntad fil från tidigare steg: {path}. "
            f"Kör först steg {step_num} (t.ex. utan --from-step eller med --only-step {step_num})."
        )


def dry_run_check(photos, name, out):
    name = safe_name(name)
    out = Path(out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    step_dirs = {n: out / d for n, d in STEP_DIRS.items()}
    for d in step_dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    log(f"TORRKÖRNING för '{name}' -> {out}")
    log("Inga OpenAI- eller Meshy-anrop görs.")

    photo_info = []
    if not 1 <= len(photos) <= 8:
        raise ValueError(f"Förväntade 1–8 foton, hittade {len(photos)}.")
    for p in photos:
        p = Path(p).resolve()
        if not p.is_file():
            raise FileNotFoundError(f"Saknar foto: {p}")
        with Image.open(p) as im:
            im.verify()
        with Image.open(p) as im:
            photo_info.append({"fil": str(p), "format": im.format, "storlek": list(im.size)})
            log(f"  Foto OK: {p.name} ({im.size[0]}x{im.size[1]} {im.format})")

    keys = {}
    for k in ("OPENAI_API_KEY", "MESHY_API_KEY"):
        ok, src = key_status(k)
        keys[k] = {"satt": ok, "kalla": src}
        log(f"  Nyckel {k}: {'OK (' + src + ')' if ok else 'SAKNAS (lägg i .env)'}")

    modules = [
        "apose_referenser", "bygg_modul", "meshy_enbild", "meshy_rigg",
        "montera_apose", "standardmatt", "montera", "bygg", "gltf",
        "numpy", "requests", "PIL", "dotenv", "filelock",
    ]
    for m in modules:
        importlib.import_module(m)
    log(f"  Python-imports OK ({len(modules)} moduler)")
    missing = [f"{k} -> {v}" for k, v in SCRIPTS.items() if not v.is_file()]
    if missing:
        raise FileNotFoundError("Saknar stegskript:\n" + "\n".join(missing))
    log(f"  Stegskript OK ({len(SCRIPTS)} Blender-skript)")

    b_exe = blender_executable()
    expr = (
        "import bpy, bmesh, mathutils, numpy; "
        "p = bpy.context.preferences.addons['cycles'].preferences; "
        "print('BLENDER_OK', bpy.app.version_string, 'CYCLES_ADDON_OK')"
    )
    res = subprocess.run(
        [str(b_exe), "-b", "--python-exit-code", "1", "--python-expr", expr],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if res.returncode != 0:
        raise RuntimeError(f"Blender headless-test misslyckades (rc={res.returncode}):\n{res.stderr}\n{res.stdout}")
    blender_line = next((l for l in res.stdout.splitlines() if "BLENDER_OK" in l), res.stdout.strip().splitlines()[-1])
    log(f"  Blender OK: {b_exe} -> {blender_line}")

    ffmpeg = shutil.which("ffmpeg")
    log(f"  ffmpeg: {ffmpeg or 'saknas (Blender inbyggd MP4-export används)'}")

    summary = {
        "dry_run": True,
        "timestamp": now_iso(),
        "namn": name,
        "out": str(out),
        "foton": photo_info,
        "nycklar": keys,
        "blender": str(b_exe),
        "blender_check": blender_line,
        "ffmpeg": ffmpeg,
        "stegmappar": {str(k): str(v) for k, v in step_dirs.items()},
    }
    (out / "dry-run.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    for n, d in step_dirs.items():
        (d / "dry-run.log").write_text(
            f"Torrkörning OK {now_iso()}\nSteg {n}: {d.name}\nBlender: {b_exe}\n",
            encoding="utf-8",
        )
    status_file = out / "status.json"
    if not status_file.exists():
        status_data = {
            "namn": name,
            "senast_uppdaterad": now_iso(),
            "dry_run_ok": True,
            "steg": {
                str(n): {"mapp": STEP_DIRS[n], "status": "pending"}
                for n in range(1, 9)
            },
        }
        status_file.write_text(json.dumps(status_data, indent=2, ensure_ascii=False), encoding="utf-8")
    log("TORRKÖRNING KLAR: Allt verifierat utan betalda anrop.")
    return summary


def pipeline(photos, name, out, outfit=None, video=True, seconds=6.0, samples=48,
             refs_only=False, from_step=1, only_step=None):
    t0 = time.time()
    name = safe_name(name)
    out = Path(out).resolve()
    out.mkdir(parents=True, exist_ok=True)

    if only_step is not None:
        steps_to_run = {only_step}
    else:
        steps_to_run = set(range(from_step, 9))
        if refs_only:
            steps_to_run = {s for s in steps_to_run if s <= 1}
        if not video:
            steps_to_run.discard(8)

    step_dirs = {n: out / d for n, d in STEP_DIRS.items()}
    for d in step_dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    rapport_fil = out / "auto-avatar.json"
    status_fil = out / "status.json"
    rep = json.loads(rapport_fil.read_text(encoding="utf-8")) if rapport_fil.exists() else {}
    rep.update(namn=name, foton=[str(Path(p).resolve()) for p in photos], steg_s=rep.get("steg_s", {}))

    if status_fil.exists():
        st = json.loads(status_fil.read_text(encoding="utf-8"))
    else:
        st = {"namn": name, "steg": {str(n): {"mapp": STEP_DIRS[n], "status": "pending"} for n in range(1, 9)}}
    st["namn"] = name
    st["senast_uppdaterad"] = now_iso()

    def save():
        st["senast_uppdaterad"] = now_iso()
        rapport_fil.write_text(json.dumps(rep, indent=2, ensure_ascii=False), encoding="utf-8")
        status_fil.write_text(json.dumps(st, indent=2, ensure_ascii=False), encoding="utf-8")

    def mark_step_start(num):
        st["steg"][str(num)] = {
            "mapp": STEP_DIRS[num],
            "status": "running",
            "startad": now_iso(),
            "log": str(step_dirs[num] / "steg.log"),
        }
        save()

    def mark_step_done(num, key, t_start, outputs=None, previews=None):
        dt = round(time.time() - t_start, 1)
        if dt >= 1 or key not in rep["steg_s"]:
            rep["steg_s"][key] = dt
        st["steg"][str(num)].update({
            "status": "done",
            "klar": now_iso(),
            "tid_s": dt,
            "utdata": [str(x) for x in (outputs or [])],
            "forhandsbilder": [str(x) for x in (previews or [])],
        })
        save()

    def mark_step_failed(num, exc):
        st["steg"][str(num)].update({
            "status": "failed",
            "avbruten": now_iso(),
            "fel": f"{type(exc).__name__}: {exc}",
        })
        save()

    def run_step(num, key, fn):
        if num not in steps_to_run:
            return
        log(f"--- Steg {num}/8: {STEP_DIRS[num]} ---")
        mark_step_start(num)
        t_start = time.time()
        try:
            with step_logger(step_dirs[num] / "steg.log"):
                outputs, previews = fn(step_dirs[num])
            mark_step_done(num, key, t_start, outputs, previews)
        except Exception as exc:
            mark_step_failed(num, exc)
            raise

    # Kända sökvägar mellan stegen
    d1, d2, d3, d4, d5, d6, d7, d8 = (step_dirs[i] for i in range(1, 9))
    refs_paths = {
        "head": d1 / "head-ref.png",
        "apose": d1 / "apose-ref.png",
        "hands": d1 / "hands-ref.png",
    }
    models_paths = {
        "huvud": d2 / "huvud" / "modell.glb",
        "kropp": d2 / "kropp" / "modell.glb",
        "hand": d2 / "hand" / "modell.glb",
    }
    light = d3 / "latt-4k.glb"
    rigged = d4 / "riggjobb" / "riggad.glb"
    fixed_glb = d5 / "handled-fix" / "avatar-rigg-handledfix.glb"
    dealer = d6 / f"{name}-dealer-apose.glb"

    # 1. Referensbilder
    def step1(d):
        refs, refrep = apose_referenser.generate(photos, d, outfit, log=log)
        sheet_path = d / "ref-3-bilder.png"
        apose_referenser.ref_sheet(
            [refs["head"], refs["apose"], refs["hands"]],
            ["head-ref.png (huvud)", "apose-ref.png (A-pose-kropp)", "hands-ref.png (högerhand)"],
            sheet_path,
            f"{name}: autogenererade referenser ({apose_referenser.MODEL})",
        )
        rep["apose_matt"] = refrep.get("apose_matt")
        return [refs["head"], refs["apose"], refs["hands"], d / "referenser.json"], [sheet_path]

    run_step(1, "1_referenser", step1)
    if refs_only and only_step is None:
        log("Referenserna klara:", d1 / "ref-3-bilder.png")
        return rep

    # 2. Meshy (parallellt)
    def step2(d):
        for role, p in refs_paths.items():
            _require_file(p, 1)
        if "meshy_saldo_fore" not in rep:
            rep["meshy_saldo_fore"] = meshy_saldo()
            save()
        log("Meshy-saldo före:", rep["meshy_saldo_fore"])
        jobs = {
            "huvud": (refs_paths["head"], PART_SETTINGS),
            "kropp": (refs_paths["apose"], BODY_SETTINGS),
            "hand": (refs_paths["hands"], PART_SETTINGS),
        }

        def run_job(item):
            role, (img, settings) = item
            folder = d / role
            folder.mkdir(parents=True, exist_ok=True)
            log(f"Meshy {role}: start/återupptag")
            meshy_enbild.run(img, folder, None, settings=settings)
            return role, folder / "modell.glb"

        with ThreadPoolExecutor(3) as pool:
            dict(pool.map(run_job, jobs.items()))
        rep["meshy_krediter_jobb"] = {
            r: json.loads((d / r / "korning.json").read_text(encoding="utf-8")).get("consumed_credits")
            for r in jobs
        }
        previews = []
        front_imgs = [d / r / "meshy-vyer" / "front.png" for r in ("huvud", "kropp", "hand")]
        if all(p.is_file() for p in front_imgs):
            ov = d / "meshy-delar-oversikt.png"
            sheet(front_imgs, ["Huvud (Meshy)", "Kropp A-pose (Meshy)", "Högerhand (Meshy)"], 3, ov,
                  f"{name}: 3D-delar från Meshy")
            previews.append(ov)
        return list(models_paths.values()), previews

    run_step(2, "2_meshy_3x4k", step2)

    # 3. Delar + montering + lätt 4K-kopia + förhandsvisning
    def step3(d):
        for p in models_paths.values():
            _require_file(p, 2)
        delar = d / "delar"
        delar.mkdir(exist_ok=True)
        cut, cutrep = huvudsnitt(models_paths["huvud"])
        rep["huvudsnitt"] = cutrep
        neck_slope = HUVUDSNITT_LUTNING
        bygg_modul.build(models_paths["huvud"], delar / "huvud.glb", "huvud", cut, neck_slope)
        # Om huvudet har hår längs halssnittet (bred kant) ger flack lutning (0.05) en sluten halsögla utan springa
        _ha = bygg_modul.Asset(delar / "huvud.glb")
        _hm = bygg_modul.Mesh(_ha.pos, _ha.nor, _ha.uv, _ha.faces)
        _hh = float(_hm.pos[:, 1].max() - _hm.pos[:, 1].min())
        _ax = _hm.pos[:, 1] + neck_slope * _hm.pos[:, 2]
        _hp, _hu = bygg_modul.clip(_hm, _ax.min() + np.ptp(_ax) * 0.004, True, neck_slope)
        if np.ptp(_hp.pos[_hu, 0]) / max(_hh, 1e-6) > 0.32:
            neck_slope = 0.05
            bygg_modul.build(models_paths["huvud"], delar / "huvud.glb", "huvud", cut, neck_slope)
        bygg_modul.build(models_paths["hand"], delar / "handpar.glb", "handpar", HANDSNITT_HAND, 0)
        kropp_ren = delar / "kropp-ren.glb"
        blender("clean_kropp_chest.py", models_paths["kropp"], kropp_ren, logfile=d / "kropp-rensa.log")
        kropp_in = kropp_ren if kropp_ren.is_file() else models_paths["kropp"]
        full = d / f"{name}-apose.glb"
        rep["montering"] = assemble_apose(kropp_in, delar / "huvud.glb", delar / "handpar.glb", full,
                                          skin_ref=refs_paths["head"] if refs_paths["head"].is_file() else None,
                                          neck_slope=neck_slope)
        (d / "montering.json").write_text(json.dumps(rep["montering"], indent=1, ensure_ascii=False), encoding="utf-8")
        blender("forenkla_4k.py", full, light, RIG_TRIANGLES, logfile=d / "forenkla.log")
        prev = d / "montering-forhandsvisning.png"
        blender("forhandsvisning_montering.py", light, prev, 10, logfile=d / "forhandsvisning.log")
        return [full, light, d / "montering.json"], [prev]

    run_step(3, "3_montering", step3)

    # 4. Rigg
    def step4(d):
        _require_file(light, 3)
        riggjobb = d / "riggjobb"
        meshy_rigg.bind(light, riggjobb)
        rep["meshy_krediter_rigg"] = json.loads((riggjobb / "riggjobb.json").read_text(encoding="utf-8")).get(
            "consumed_credits"
        )
        return [rigged, riggjobb / "riggjobb.json"], []

    run_step(4, "4_rigg", step4)

    # 5. Fingrar + hals-/axelvikter + handledsfix
    def step5(d):
        _require_file(rigged, 4)
        avatar_rig = d / "avatar-rigg.glb"
        blender("bygg_fingrar_apose.py", rigged, avatar_rig, logfile=d / "fingrar.log")
        fixdir = d / "handled-fix"
        blender("fixa_handleder.py", avatar_rig, fixdir, logfile=d / "handled-fix.log")
        rep["handledsfix"] = {
            s: {k: v for k, v in r.items() if k not in ("fore", "efter")}
            for s, r in json.loads((fixdir / "fix.json").read_text(encoding="utf-8"))["sidor"].items()
        }
        previews = []
        wrist_imgs = [fixdir / fn for fn in ("fore-vanster.png", "efter-vanster.png", "fore-hoger.png", "efter-hoger.png")]
        if all(p.is_file() for p in wrist_imgs):
            cmp_sheet = d / "handled-fix-jamforelse.png"
            sheet(wrist_imgs, ["Vänster före", "Vänster efter", "Höger före", "Höger efter"], 2, cmp_sheet,
                  f"{name}: handledsfix före/efter")
            previews.append(cmp_sheet)
        return [avatar_rig, fixed_glb, fixdir / "fix.json"], previews

    run_step(5, "5_fingrar_handleder", step5)

    # 6. Dealer-export
    def step6(d):
        _require_file(fixed_glb, 5)
        blender("exportera_dealer.py", fixed_glb, dealer, logfile=d / "dealer-export.log")
        d_json = json.loads(dealer.with_suffix(".json").read_text(encoding="utf-8"))
        info = meshy_enbild.model_info(dealer, armature=True)
        rep["dealer"] = {
            "glb": str(dealer),
            "bytes": dealer.stat().st_size,
            "MB": round(dealer.stat().st_size / 1e6, 2),
            "ben": d_json["ben"],
            "fingerben": len(d_json["fingerben"]),
            "saknas_for_dealer": d_json["saknas_for_dealer"],
            "trianglar": info.get("triangles"),
            "texturer": info.get("embedded_textures"),
        }
        rep["meshy_saldo_efter"] = meshy_saldo()
        save()
        return [dealer, dealer.with_suffix(".json")], []

    run_step(6, "6_dealer_export", step6)

    # 7. QC
    def step7(d):
        _require_file(dealer, 6)
        _require_file(refs_paths["apose"], 1)
        d_json = json.loads(dealer.with_suffix(".json").read_text(encoding="utf-8"))
        dealer_info = rep.get("dealer") or meshy_enbild.model_info(dealer, armature=True)
        tri = dealer_info.get("triangles") or dealer_info.get("trianglar")
        mb = round(dealer.stat().st_size / 1e6, 2)
        blender("qc_oversikt.py", dealer, d, samples, logfile=d / "qc.log")
        ov = d / "resultat-oversikt.png"
        sheet(
            [d / "helkropp-fram.png", d / "helkropp-34.png", refs_paths["apose"], d / "ansikte.png",
             d / "handled-hoger.png", d / "handled-vanster.png"],
            ["Helkropp framifrån", "Helkropp 3/4", "Referens: apose-ref.png", "Ansikte närbild",
             "Höger handled + fingrar", "Vänster handled + fingrar"],
            3, ov,
            f"{name}: {d_json['ben']} ben ({len(d_json['fingerben'])} fingerben), {tri} trianglar, {mb} MB",
        )
        return [d / "qc.json"], [ov]

    run_step(7, "7_qc", step7)

    # 8. Rörelsefilm
    def step8(d):
        _require_file(dealer, 6)
        blender("animera_dealer.py", dealer, d, name, seconds, samples, "film", logfile=d / "rorelse.log")
        mp4 = d / f"{name}-ror-sig.mp4"
        glb_anim = d / f"{name}-apose-med-rorelse.glb"
        rep["rorelse"] = {
            "mp4": str(mp4),
            "mp4_bytes": mp4.stat().st_size if mp4.exists() else 0,
            "glb": str(glb_anim),
            "sekunder": seconds,
            "samples": samples,
        }
        previews = []
        if mp4.exists():
            strip_path = d / "rorelse-strip.png"
            if strip_from_mp4(mp4, strip_path, seconds):
                previews.append(strip_path)
        return [mp4, glb_anim, d / "anim.json"], previews

    run_step(8, "8_film", step8)

    rep["total_s"] = round(time.time() - t0, 1)
    save()
    summary = {k: rep[k] for k in ("dealer", "meshy_saldo_fore", "meshy_saldo_efter", "total_s") if k in rep}
    log("KLART", json.dumps(summary, ensure_ascii=False))
    return rep


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--photos", nargs="+", type=Path, help="1–8 foton av samma person (annars läses input/<namn>/)")
    ap.add_argument("--name", required=True, help="Namn på avataren (t.ex. rosalina)")
    ap.add_argument("--out", type=Path, help="Utmapp (standard: output/<namn>)")
    ap.add_argument("--outfit", help="Engelsk klädbeskrivning (standard: mörkblå skjorta, mörka byxor). "
                                     "Skjortan måste vara tydligt icke-hudfärgad.")
    ap.add_argument("--no-video", action="store_true", help="Hoppa över steg 8 (rörelsefilmen)")
    ap.add_argument("--seconds", type=float, default=6.0)
    ap.add_argument("--samples", type=int, default=48, help="Cycles samples (på laptop-CPU: prova t.ex. 16–24)")
    ap.add_argument("--refs-only", action="store_true", help="Stanna efter steg 1 (inga Meshy-krediter)")
    ap.add_argument("--from-step", type=int, choices=range(1, 9), default=1, help="Starta från steg N (1–8)")
    ap.add_argument("--only-step", type=int, choices=range(1, 9), help="Kör bara steg N (1–8)")
    ap.add_argument("--dry-run", action="store_true", help="Gratis kontroll: foton, imports, Blender, nycklar och mappar")
    a = ap.parse_args()

    photos = a.photos if a.photos else discover_photos(a.name)
    out = a.out or (HERE / "output" / safe_name(a.name))

    if a.dry_run:
        dry_run_check(photos, a.name, out)
        return
    pipeline(
        photos, a.name, out, a.outfit,
        not a.no_video, a.seconds, a.samples, a.refs_only,
        from_step=a.from_step, only_step=a.only_step,
    )


if __name__ == "__main__":
    main()
