"""Meshy's single-image recipe. Resume the same job and archive its original outputs."""


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

import argparse
import base64
import hashlib
import io
import json
import os
import re
import struct
import subprocess
import time
from pathlib import Path

import requests
from dotenv import dotenv_values
from filelock import FileLock
from PIL import Image

ENDPOINT = "https://api.meshy.ai/openapi/v1/image-to-3d"
SETTINGS = {
    "ai_model": "meshy-7.1",
    "should_texture": True,
    "enable_pbr": True,
    "texture_model": "meshy-7",
    "texture_resolution": "4k",
    "target_formats": ["glb"],
    "alpha_thumbnail": True,
    "multi_view_thumbnails": True,
}
TERMINAL_FAILURE = {"FAILED", "EXPIRED", "CANCELED", "CANCELLED"}


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def store(path, data):
    tmp = path.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
        f.flush()
        os.fsync(f.fileno())
    tmp.replace(path)


def get_key():
    key = os.environ.get("MESHY_API_KEY")
    if not key:
        for env_file in env_candidates(ROOT):
            if env_file.is_file():
                val = dotenv_values(env_file, encoding="utf-8-sig").get("MESHY_API_KEY")
                if val and val.strip():
                    key = val.strip()
                    break
    if not key:
        raise ValueError(f"Saknar MESHY_API_KEY. Lägg in den i {ROOT / '.env'} eller som miljövariabel.")
    return key


def api_get(job, key, endpoint=ENDPOINT):
    if not isinstance(job, str) or not re.fullmatch(r"[A-Za-z0-9-]{10,100}", job):
        raise ValueError("Invalid Meshy task identifier.")
    for attempt in range(5):
        try:
            res = requests.get(
                f"{endpoint}/{job}", headers={"Authorization": f"Bearer {key}"}, timeout=(15, 60)
            )
        except requests.RequestException:
            if attempt == 4:
                raise RuntimeError("Meshy status is temporarily unreachable; rerun to resume.") from None
        else:
            if res.ok:
                data = res.json()
                if data.get("id") != job:
                    raise ValueError("Meshy returned a different task identifier.")
                return data
            if res.status_code != 429 and res.status_code < 500:
                raise RuntimeError(f"Could not read the Meshy task (HTTP {res.status_code}).")
        time.sleep(2**attempt)
    raise RuntimeError("Meshy status is temporarily unavailable; rerun to resume.")


def submit(payload, mime, manifest, receipt, key, *, endpoint=ENDPOINT, field="image_url", settings=SETTINGS):
    manifest["status"] = "SUBMITTING"
    store(receipt, manifest)
    uri = "data:" + mime + ";base64," + base64.b64encode(payload).decode("ascii")
    try:
        res = requests.post(
            endpoint,
            headers={"Authorization": f"Bearer {key}"},
            json={field: uri, **settings},
            timeout=(15, 120),
        )
    except requests.RequestException:
        raise RuntimeError(
            "Submission outcome unknown. Recover the task ID in Meshy and use --task-id."
        ) from None
    if not res.ok:
        if res.status_code in {400, 401, 403, 404, 405, 413, 415, 422, 429}:
            manifest["status"] = "REJECTED"
            store(receipt, manifest)
        raise RuntimeError(
            f"Meshy rejected or could not confirm the submission (HTTP {res.status_code})."
        )
    result = res.json().get("result")
    if not isinstance(result, str) or not re.fullmatch(r"[A-Za-z0-9-]{10,100}", result):
        raise RuntimeError("No usable task ID in the response. Check the task in Meshy before resuming.")
    manifest.update(task_id=result, status="PENDING")
    store(receipt, manifest)
    print("Meshy accepted", result, flush=True)


def model_info(path, *, armature=False):
    with path.open("rb") as f:
        magic, version, size, json_size, kind = struct.unpack("<4sIIII", f.read(20))
        if (magic, version, size, kind) != (b"glTF", 2, path.stat().st_size, 0x4E4F534A):
            raise ValueError("Invalid or incomplete GLB.")
        scene = json.loads(f.read(json_size))
        binary_size, kind = struct.unpack("<II", f.read(8))
        binary_offset = f.tell()
        if kind != 0x004E4942 or binary_offset + binary_size != size:
            raise ValueError("Invalid embedded binary chunk.")
        materials = scene.get("materials", [])
        roles = {}
        for mat in materials:
            pbr = mat.get("pbrMetallicRoughness", {})
            for role, ref in (
                ("base_color", pbr.get("baseColorTexture")),
                ("metallic_roughness", pbr.get("metallicRoughnessTexture")),
                ("normal", mat.get("normalTexture")),
            ):
                if ref:
                    idx = scene["textures"][ref["index"]]["source"]
                    roles.setdefault(idx, set()).add(role)
        textures = []
        for i, img in enumerate(scene.get("images", [])):
            view = scene["bufferViews"][img["bufferView"]]
            f.seek(binary_offset + view.get("byteOffset", 0))
            with Image.open(io.BytesIO(f.read(view["byteLength"]))) as tex:
                textures.append(
                    {"roles": sorted(roles.get(i, [])), "size": list(tex.size), "format": tex.format}
                )
        vertices = triangles = 0
        meshes = scene.get("meshes", [])
        if not meshes and not (armature and scene.get("animations")):
            raise ValueError("GLB contains neither the requested mesh nor an animated armature.")
        for mesh in meshes:
            for part in mesh["primitives"]:
                if part.get("mode", 4) != 4:
                    raise ValueError("Expected triangle topology in Meshy's GLB.")
                pos = part["attributes"]["POSITION"]
                vertices += scene["accessors"][pos]["count"]
                triangles += scene["accessors"][part.get("indices", pos)]["count"] // 3
    return {
        "triangles": triangles,
        "vertices": vertices,
        "meshes": len(meshes),
        "skins": len(scene.get("skins", [])),
        "animations": len(scene.get("animations", [])),
        "embedded_textures": textures,
    }


def download(url, stem, model=False, *, armature=False):
    if not isinstance(url, str) or not url.startswith("https://"):
        raise ValueError(f"Missing HTTPS asset URL for {stem.name}.")
    stem.parent.mkdir(parents=True, exist_ok=True)
    tmp = stem.with_suffix(".part")
    for attempt in range(3):
        try:
            with requests.get(url, stream=True, timeout=(20, 120)) as res:
                res.raise_for_status()
                with tmp.open("wb") as destination:
                    for chunk in res.iter_content(1024 * 1024):
                        destination.write(chunk)
            if model or armature:
                info = model_info(tmp, armature=armature)
                path = stem.with_suffix(".glb")
            else:
                with Image.open(tmp) as im:
                    suffix = {"PNG": ".png", "JPEG": ".jpg", "WEBP": ".webp"}[im.format]
                    info = {"size": list(im.size), "format": im.format}
                    im.verify()
                path = stem.with_suffix(suffix)
            tmp.replace(path)
            return path, info
        except (requests.RequestException, OSError) as exc:
            if attempt == 2:
                raise RuntimeError(
                    f"Could not download {stem.name}: {type(exc).__name__}. Rerun to resume."
                ) from None
            time.sleep(2**attempt)


def outputs(data):
    yield "model", Path("modell"), data.get("model_urls", {}).get("glb")
    views = dict(data.get("thumbnail_urls") or {})
    views.setdefault("front", data.get("thumbnail_url"))
    views["alpha"] = data.get("alpha_thumbnail_url")
    for name in ("front", "right", "back", "left", "alpha"):
        if views.get(name):
            yield f"preview_{name}", Path("meshy-vyer", name), views[name]
    for index, layer in enumerate(data.get("texture_urls") or []):
        for name in ("base_color", "metallic", "roughness", "normal", "emission"):
            if layer.get(name):
                yield f"texture_{index}_{name}", Path("pbr", f"{index}-{name}"), layer[name]


def intact(folder, asset):
    path = folder / asset["file"]
    return path.is_file() and path.stat().st_size == asset["bytes"] and digest(path) == asset["sha256"]


def image_payload(image):
    image_bytes = image.read_bytes()
    with Image.open(io.BytesIO(image_bytes)) as im:
        if im.format not in ("PNG", "JPEG", "WEBP"):
            raise ValueError("Supply a PNG, JPEG or WebP reference photograph.")
        return image_bytes, Image.MIME[im.format], list(im.size)


def run(image, folder, recovery_id, *, settings=SETTINGS, texture_image=None):
    receipt = folder / "korning.json"
    image_bytes, mime, resolution = image_payload(image)
    fingerprint = hashlib.sha256(image_bytes).hexdigest()
    texture_hash = digest(texture_image) if texture_image else None
    if receipt.exists():
        manifest = json.loads(receipt.read_bytes())
        if (manifest["input"]["sha256"] != fingerprint or manifest["settings"] != settings
                or manifest["input"].get("texture_sha256") != texture_hash):
            raise ValueError(
                "The folder already belongs to a different input or recipe; select a new output folder."
            )
    else:
        if any(x.name != ".meshy.lock" for x in folder.iterdir()):
            raise ValueError(
                "Select a fresh output directory or a directory containing this pipeline's receipt."
            )
        try:
            display = Path(os.path.relpath(image, folder)).as_posix()
        except ValueError:  # Different Windows drive.
            display = image.name
        manifest = {
            "endpoint": ENDPOINT,
            "input": {"file": display, "sha256": fingerprint, "size": resolution},
            "settings": settings,
            "assets": {},
            "status": "NEW",
        }
        if texture_hash:
            manifest["input"]["texture_sha256"] = texture_hash
    if recovery_id and manifest.get("task_id") not in (None, recovery_id):
        raise ValueError("The supplied task ID differs from the saved task.")
    if (
        manifest.get("complete")
        and "model" in manifest["assets"]
        and all(intact(folder, a) for a in manifest["assets"].values())
    ):
        print("Verified existing model and exports", flush=True)
        return
    key = get_key()
    if recovery_id and not manifest.get("task_id"):
        api_get(recovery_id, key)
        manifest.update(task_id=recovery_id, status="PENDING")
        store(receipt, manifest)
    if not manifest.get("task_id"):
        if manifest["status"] == "SUBMITTING":
            raise RuntimeError("Prior submission outcome unknown. Supply its Meshy ID with --task-id.")
        request_settings = dict(settings)
        if texture_image:
            texture, texture_mime, _ = image_payload(texture_image)
            request_settings["texture_image_url"] = (
                "data:" + texture_mime + ";base64," + base64.b64encode(texture).decode("ascii")
            )
        submit(image_bytes, mime, manifest, receipt, key, settings=request_settings)
    previous = None
    while True:
        data = api_get(manifest["task_id"], key)
        state = data["status"], data.get("progress", 0)
        if state != previous:
            print(*state, flush=True)
            previous = state
        if state[0] == "SUCCEEDED":
            break
        if state[0] in TERMINAL_FAILURE:
            manifest["status"] = state[0]
            store(receipt, manifest)
            raise RuntimeError("Meshy task ended with status " + state[0])
        time.sleep(12)
    manifest.update(status="SUCCEEDED", consumed_credits=data.get("consumed_credits"), complete=False)
    store(receipt, manifest)
    for role, stem, url in outputs(data):
        current = manifest["assets"].get(role)
        if current and intact(folder, current):
            continue
        path, details = download(url, folder / stem, model=(role == "model"))
        manifest["assets"][role] = {
            "file": path.relative_to(folder).as_posix(),
            "bytes": path.stat().st_size,
            "sha256": digest(path),
            **details,
        }
        store(receipt, manifest)
    manifest["complete"] = True
    store(receipt, manifest)
    model = manifest["assets"]["model"]
    print(
        "Original GLB verified:",
        model["triangles"],
        "triangles,",
        len(manifest["assets"]),
        "exports",
        flush=True,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--task-id", help="Recover a known task for the same image and recipe.")
    parser.add_argument(
        "--blender-python", type=Path, help="Also render the downloaded GLB at 0, 20, 40 and 60 degrees."
    )
    parser.add_argument("--utsnitt", choices=("helkropp", "byst"), default="helkropp")
    parser.add_argument(
        "--jamfor", type=Path, help="Existing GLB for visual comparison at the same angles."
    )
    parser.add_argument("--jamfor-utsnitt", choices=("helkropp", "byst"), default="helkropp")
    args = parser.parse_args()
    if args.jamfor and not args.blender_python:
        parser.error("--jamfor requires --blender-python.")
    if args.blender_python and not args.blender_python.is_file():
        parser.error("The specified Blender Python executable was not found.")
    if args.jamfor and not args.jamfor.is_file():
        parser.error("The comparison GLB was not found.")
    folder = args.output.resolve()
    folder.mkdir(parents=True, exist_ok=True)
    with FileLock(str(folder / ".meshy.lock"), timeout=0):
        run(args.image.resolve(), folder, args.task_id)
        if args.blender_python:
            command = [
                str(args.blender_python),
                "-B",
                str(Path(__file__).with_name("rendera_vyer.py")),
                str(folder / "modell.glb"),
                str(folder / "blender"),
                "--utsnitt",
                args.utsnitt,
            ]
            if args.jamfor:
                command.extend(
                    ["--jamfor", str(args.jamfor.resolve()), "--jamfor-utsnitt", args.jamfor_utsnitt]
                )
            subprocess.run(command, check=True)


if __name__ == "__main__":
    main()
