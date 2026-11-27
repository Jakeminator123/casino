"""Steg 12: en ny yta på vår egen docka hos Meshy (Retexture), betald, med kvitto och återupptagning.

Meshy målar en ny bild på en modell vi skickar, efter 1–4 vyer av personen (framifrån först), och behåller modellens
egen ytkarta (enable_original_uv). Bilden som kommer tillbaka passar då dockans karta, och läggs på dockan själv med
yta.py lagg: skelettet, fingrarna, vridbenen och ansiktsformerna står orörda, och dockan spelar sina rörelser som förut.

Vad som skickas, och varför inte hela dockan: dockan (scen/bygg_docka.py) är en yta med ett material och MPFB:s karta,
men ögongloberna och brynen har ingen egen plats i kartan (alla deras hörn står i (0, 0)), tänderna har en egen liten ö,
och ansiktets färger är hörnfärger. Skickas hela dockan målar Meshy ögonen och brynen i samma hörn, ser skelettet,
ansiktsformerna och hörnfärgerna, och får en figur i sittande eller A-ställning medan vyerna visar personen med armarna
ute. Därför gör yta.py kopia en kopia av bara ytan: utan skelett, former och hörnfärger, ställd som personen i den främre
vyn, utan bryn och tänder (målningen hamnar på huden under brynen), och med en egen ö per ögonglob i kartans tomma hörn.
Kartan är i övrigt dockans egen, så bilden passar dockan i vila.

  .venv/Scripts/python.exe -I steg/12-ny-yta/meshy_ny_yta.py assets/docka/standarddocka_danilo.glb <mapp> \
      --vy output/<namn>/01-vyer/vy-0.png --vy output/<namn>/01-vyer/vy-1.png [--dry-run] [--task-id ID]

--dry-run gör kopian (gratis, Blender utan fönster) och skriver ut vad som skulle skickas, hur stort och vad det kostar,
utan att läsa nyckeln eller anropa Meshy. --kopia skickar en färdig kopia i stället för hela dockan, till exempel bara
handen (steg 14, meshy_kopia.py). Kvittot är <mapp>/ny-yta.json; en omstart med samma kopia, vyer och
inställningar betalar inte igen, och ett jobb som kan ha startats återupptas med --task-id. Radera aldrig kvittot.
Meshys adresser (med signatur) skrivs aldrig i en fil.
"""

import sys
from pathlib import Path as _Path
_ROOT = next(
    c for c in [_Path(__file__).resolve().parent, *_Path(__file__).resolve().parents]
    if (c / "auto_avatar.py").is_file()
)
if str(_ROOT / "gemensamt") not in sys.path:
    sys.path.insert(0, str(_ROOT / "gemensamt"))
from sokvagar import add_paths
ROOT = add_paths(_ROOT)

import argparse
import base64
import io
import json
import math
import struct
import subprocess
import time
from pathlib import Path

import numpy as np
from filelock import FileLock
from PIL import Image
from meshy_enbild import TERMINAL_FAILURE, api_get, digest, download, get_key, intact, model_info, outputs, store, submit

ENDPOINT = "https://api.meshy.ai/openapi/v1/retexture"
# meshy-7: flera vyer kräver meshy-7 eller meshy-n1, och n1 gör ansikten mjukare, bara 2K och ingen PBR (docs.meshy.ai
# /en/api/models). 4K kostar som 2K. PBR (normal, grovhet) kostar inget extra och kan läggas på senare.
SETTINGS = {
    "ai_model": "meshy-7",
    "enable_original_uv": True,
    "enable_pbr": True,
    "texture_resolution": "4k",
    "target_formats": ["glb"],
}
PRIS = {"2k": 10, "4k": 10, "8k": 15}  # https://docs.meshy.ai/en/api/pricing, läst 2026-11-27
GRANS_MODELL = 100_000_000  # data-URI för modellen (docs.meshy.ai/en/api/retexture)
GRANS_BILD = 20_000_000
YTA = Path(__file__).with_name("yta.py")


def blender_exe():
    from auto_avatar import blender_executable  # samma sökning som stegen 3–8
    return blender_executable()


def gor_kopia(docka, vy, kopia):
    """yta.py kopia, om kopian saknas eller gäller en annan docka eller vy (gratis, lokalt)."""
    info = kopia.with_suffix(".json")
    if kopia.is_file() and info.is_file():
        rap = json.loads(info.read_text(encoding="utf-8"))
        if (rap.get("docka_sha256") == digest(docka) and rap.get("vy_sha256") == digest(vy)
                and rap.get("yta_py_sha256") == digest(YTA) and rap.get("kopia_sha256") == digest(kopia)):
            return rap
    cmd = [str(blender_exe()), "-b", "--factory-startup", "--python-exit-code", "1", "--python", str(YTA), "--",
           "kopia", str(docka), str(vy), str(kopia)]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if res.returncode:
        raise RuntimeError("yta.py kopia misslyckades:\n" + "\n".join((res.stdout + res.stderr).splitlines()[-20:]))
    return json.loads(info.read_text(encoding="utf-8"))


def datauri_langd(n, mime):
    return len("data:" + mime + ";base64,") + 4 * math.ceil(n / 3)


def vybild(path):
    data = path.read_bytes()
    with Image.open(io.BytesIO(data)) as im:
        if im.format not in ("PNG", "JPEG", "WEBP"):
            raise ValueError(f"{path.name}: Meshy tar PNG, JPEG eller WebP.")
        if min(im.size) < 32:
            raise ValueError(f"{path.name}: minst 32 bildpunkter per sida.")
        return data, Image.MIME[im.format], list(im.size)


def uv_ur_glb(path):
    """Alla TEXCOORD_0 i en GLB (glTF:s v nedåt), som en mängd avrundad till 1e-4."""
    b = path.read_bytes()
    jl = struct.unpack("<I", b[12:16])[0]
    gl = json.loads(b[20:20 + jl])
    binar = b[20 + jl + 8:]
    ut = []
    for mesh in gl["meshes"]:
        for p in mesh["primitives"]:
            if "TEXCOORD_0" not in p["attributes"]:
                continue
            a = gl["accessors"][p["attributes"]["TEXCOORD_0"]]
            v = gl["bufferViews"][a["bufferView"]]
            if a["componentType"] != 5126:
                raise ValueError("ytkartan är inte flyttal")
            off = v.get("byteOffset", 0) + a.get("byteOffset", 0)
            stride = v.get("byteStride") or 8
            raw = np.frombuffer(binar, np.uint8, count=stride * (a["count"] - 1) + 8, offset=off)
            idx = np.arange(a["count"])[:, None] * stride + np.arange(8)[None]
            ut.append(raw[idx].copy().view(np.float32).reshape(-1, 2))
    uv = np.vstack(ut)
    return {tuple(x) for x in np.round(uv.astype(float), 4)}


def uv_kontroll(kopia, modell):
    a, b = uv_ur_glb(kopia), uv_ur_glb(modell)
    return {"kopians_punkter": len(a), "meshys_punkter": len(b), "meshys_i_kopians": round(len(b & a) / max(1, len(b)), 4),
            "kopians_i_meshys": round(len(a & b) / max(1, len(a)), 4)}


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("docka", type=Path)
    parser.add_argument("mapp", type=Path)
    parser.add_argument("--vy", type=Path, action="append", required=True, help="1–4 vyer, framifrån först")
    parser.add_argument("--task-id")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--kopia", type=Path, help="en färdig kopia (med sin .json bredvid) i stället för yta.py kopia, "
                                                    "till exempel bara handen ur steg 14 (meshy_kopia.py)")
    args = parser.parse_args()
    if not 1 <= len(args.vy) <= 4:
        parser.error("1–4 vyer (--vy), framifrån först.")
    docka = args.docka.resolve()
    vyer = [v.resolve() for v in args.vy]
    folder = args.mapp.resolve()
    folder.mkdir(parents=True, exist_ok=True)
    receipt = folder / "ny-yta.json"
    kopia = args.kopia.resolve() if args.kopia else folder / "kopia.glb"
    with FileLock(str(folder / ".meshy.lock"), timeout=0):
        record = json.loads(receipt.read_bytes()) if receipt.exists() else None
        if record and record.get("task_id"):
            if not kopia.is_file() or digest(kopia) != record["input"]["kopia_sha256"]:
                raise ValueError("Kvittot har ett jobb men kopian det skickade saknas eller är ändrad.")
            rap = json.loads(kopia.with_suffix(".json").read_text(encoding="utf-8"))
        elif args.kopia:
            rap = json.loads(kopia.with_suffix(".json").read_text(encoding="utf-8"))
            if rap.get("kopia_sha256") != digest(kopia) or rap.get("docka_sha256") != digest(docka):
                raise ValueError("Kopian stämmer inte med sin rapport eller med dockan: gör om den.")
        else:
            rap = gor_kopia(docka, vyer[0], kopia)
        bilder = [vybild(v) for v in vyer]
        modell_bytes = kopia.stat().st_size
        signature = {
            "endpoint": ENDPOINT,
            "settings": SETTINGS,
            "input": {
                "docka": docka.name, "docka_sha256": rap["docka_sha256"], "kopia_sha256": digest(kopia),
                "vyer": [{"fil": v.name, "sha256": digest(v), "storlek": b[2]} for v, b in zip(vyer, bilder)],
            },
        }
        if record and any(record.get(k) != v for k, v in signature.items()):
            raise ValueError("Mappen hör till en annan kopia, andra vyer eller andra inställningar: välj en ny mapp.")
        record = record or {**signature, "status": "NEW", "assets": {}}
        if args.task_id and record.get("task_id") not in (None, args.task_id):
            raise ValueError("Angivet jobb-ID skiljer sig från det sparade jobbet.")
        storlek = {
            "model_url": {"fil": kopia.name, "byte": modell_bytes, "data_uri_tecken": datauri_langd(modell_bytes, "application/octet-stream"),
                          "trianglar": model_info(kopia)["triangles"], "grans_byte": GRANS_MODELL},
            "multiview_image_urls": [{"fil": v.name, "byte": len(b[0]), "typ": b[1], "storlek": b[2],
                                      "data_uri_tecken": datauri_langd(len(b[0]), b[1]), "grans_byte": GRANS_BILD}
                                     for v, b in zip(vyer, bilder)],
        }
        if modell_bytes > GRANS_MODELL or any(len(b[0]) > GRANS_BILD for b in bilder):
            raise ValueError("Kopian eller en vy är större än Meshy tar som data-URI.")
        kostnad = PRIS[SETTINGS["texture_resolution"]]
        if args.dry_run:
            print(json.dumps({"skulle_skicka": {"POST": ENDPOINT, **SETTINGS, **storlek}, "kostnad_krediter": kostnad,
                              "kopian": {k: rap.get(k) for k in ("trianglar", "horn", "langd_m", "bredd_m", "uv_inom_0_1",
                                                                  "armvinkel_ur_vyn_grader", "stallning", "ytor_per_del")},
                              "kvitto": str(receipt), "status": record.get("status")}, indent=1, ensure_ascii=False))
            return
        if record.get("complete") and all(intact(folder, a) for a in record["assets"].values()):
            print("Redan klar: bilden finns och stämmer med kvittot.", flush=True)
            return
        key = get_key()
        if args.task_id and not record.get("task_id"):
            api_get(args.task_id, key, ENDPOINT)
            record.update(task_id=args.task_id, status="PENDING")
            store(receipt, record)
        if not record.get("task_id"):
            if record.get("status") == "SUBMITTING":
                raise RuntimeError("Jobbet kan ha startat. Återuppta med Meshys jobb-ID och --task-id.")
            extra = {**SETTINGS, "multiview_image_urls": [
                "data:" + b[1] + ";base64," + base64.b64encode(b[0]).decode("ascii") for b in bilder]}
            submit(kopia.read_bytes(), "application/octet-stream", record, receipt, key,
                   endpoint=ENDPOINT, field="model_url", settings=extra)
        previous = None
        while True:
            data = api_get(record["task_id"], key, ENDPOINT)
            state = (data["status"], data.get("progress"))
            if state != previous:
                print("Meshy ny yta", *state, flush=True)
                previous = state
            if state[0] == "SUCCEEDED":
                break
            if state[0] in TERMINAL_FAILURE:
                record.update(status=state[0], consumed_credits=data.get("consumed_credits"))
                store(receipt, record)
                raise RuntimeError(f"Jobbet avslutades med {state[0]}.")
            time.sleep(10)
        record.update(status="SUCCEEDED", consumed_credits=data.get("consumed_credits"), complete=False)
        store(receipt, record)
        for role, stem, url in outputs(data):
            current = record["assets"].get(role)
            if current and intact(folder, current):
                continue
            path, details = download(url, folder / stem, model=(role == "model"))
            record["assets"][role] = {"file": path.relative_to(folder).as_posix(), "bytes": path.stat().st_size,
                                      "sha256": digest(path), **details}
            store(receipt, record)
        if "model" in record["assets"]:
            record["uv_kontroll"] = uv_kontroll(kopia, folder / record["assets"]["model"]["file"])
        record["complete"] = True
        store(receipt, record)
        print("Klar:", json.dumps({k: record.get(k) for k in ("consumed_credits", "uv_kontroll")}, ensure_ascii=False),
              *sorted(a["file"] for a in record["assets"].values()), flush=True)


if __name__ == "__main__":
    main()
