"""Create a repeatable four-angle review of an upright textured avatar GLB in Blender."""

import argparse
import hashlib
import json
import tempfile
from pathlib import Path

import bpy
import numpy as np
from PIL import Image
from PIL.PngImagePlugin import PngInfo

from blenderstudio import plate, render_frame, save_review, studio

ANGLES = (0, 20, 40, 60)


def sha(path):
    with path.open("rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def source_sha(path):
    # Git may check out the same source with LF or CRLF.
    source = path.read_text(encoding="utf-8")
    return hashlib.sha256(source.encode("utf-8")).hexdigest()


def rows(top, bottom):
    canvas = Image.new("RGB", (top.width, top.height + bottom.height))
    canvas.paste(top, (0, 0))
    canvas.paste(bottom, (0, top.height))
    return canvas


def render_model(model, framing, frame_file, main_folder, model_hash):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(model))
    scene = bpy.context.scene
    clouds = []
    for obj in scene.objects:
        if obj.type != "MESH":
            continue
        points = np.empty((len(obj.data.vertices), 3), dtype=np.float32)
        obj.data.vertices.foreach_get("co", points.ravel())
        transform = np.asarray(obj.matrix_world)
        clouds.append(points @ transform[:3, :3].T + transform[:3, 3])
    vertices = np.concatenate(clouds)
    low, high = vertices.min(axis=0), vertices.max(axis=0)
    center = (low + high) / 2
    width, _, height = high - low
    camera = studio(scene, center, height)
    head_zone, head_center, head_scale = (
        (0.14, 0.093, 0.224) if framing == "helkropp" else (0.31, 0.25, 0.63)
    )
    head = vertices[vertices[:, 2] > high[2] - head_zone * height]
    focus = (head.min(axis=0) + head.max(axis=0)) / 2
    focus[2] = high[2] - head_center * height
    faces, body_tiles = [], []
    for angle in ANGLES:
        if main_folder is not None:
            full = render_frame(
                scene, camera, center, max(width, height) * 1.10, height, angle, (896, 896), frame_file
            )
            save_review(full, main_folder / f"vy-{angle}.png", model_hash, angle)
            body_tiles.append(full.resize((400, 400), Image.Resampling.LANCZOS))
        faces.append(
            render_frame(
                scene, camera, focus, height * head_scale, height, angle, (384, 384), frame_file
            )
        )
    if main_folder is not None:
        labels = [f"Hel figur · {angle}°" for angle in ANGLES]
        body = rows(plate(body_tiles[:2], labels[:2]), plate(body_tiles[2:], labels[2:]))
        save_review(body, main_folder / "helfigur.png", model_hash, "0, 20, 40, 60")
    return faces


def review(model, output, framing, compare, compare_framing):
    if not bpy.app.background:
        raise RuntimeError("Use a separate background Blender Python process.")
    output.mkdir(parents=True, exist_ok=True)
    receipt = output / "rendering.json"
    setup = {
        "model_sha256": sha(model),
        "framing": framing,
        "angles": list(ANGLES),
        "compare_sha256": sha(compare) if compare else None,
        "compare_framing": compare_framing if compare else None,
        "blender": bpy.app.version_string,
        "script_sha256": source_sha(Path(__file__)),
        "studio_sha256": source_sha(Path(__file__).with_name("blenderstudio.py")),
    }
    earlier = json.loads(receipt.read_bytes()) if receipt.is_file() else {}
    if (
        earlier.get("setup") == setup
        and earlier.get("files")
        and all(
            (output / name).is_file() and sha(output / name) == checksum
            for name, checksum in earlier["files"].items()
        )
    ):
        print("Verified existing four-angle review.")
        return
    with tempfile.TemporaryDirectory(dir=output) as scratch:
        staging = Path(scratch)
        frame_file = staging / "_frame.png"
        faces = render_model(model, framing, frame_file, staging, setup["model_sha256"])
        titles = [f"Enbildsmodellen · {angle}°" for angle in ANGLES]
        primary = plate(faces, titles)
        save_review(primary, staging / "ansikte.png", setup["model_sha256"], "0, 20, 40, 60")
        if compare:
            other = render_model(compare, compare_framing, frame_file, None, setup["compare_sha256"])
            labels = [f"{compare.stem} · {angle}°" for angle in ANGLES]
            meta = PngInfo()
            meta.add_text("ModelSHA256", setup["model_sha256"])
            meta.add_text("ComparisonSHA256", setup["compare_sha256"])
            meta.add_text("ReviewViews", "0, 20, 40, 60")
            rows(primary, plate(other, labels)).save(staging / "jamforelse.png", pnginfo=meta)
        files = {f.name: sha(f) for f in sorted(staging.glob("*.png")) if f != frame_file}
        for filename in files:
            (staging / filename).replace(output / filename)
        # Remove an obsolete review only if it still matches this tool's previous output.
        for filename in earlier.get("files", {}).keys() - files.keys():
            path = output / filename
            if path.parent == output and path.is_file() and sha(path) == earlier["files"][filename]:
                path.unlink()
        report = staging / "rendering.json"
        report.write_text(json.dumps({"setup": setup, "files": files}, indent=2) + "\n", encoding="utf8")
        report.replace(receipt)
    print("Four-angle Blender review complete.", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--utsnitt", choices=("helkropp", "byst"), default="helkropp")
    parser.add_argument("--jamfor", type=Path)
    parser.add_argument("--jamfor-utsnitt", choices=("helkropp", "byst"), default="helkropp")
    args = parser.parse_args()
    review(
        args.model.resolve(),
        args.output.resolve(),
        args.utsnitt,
        args.jamfor.resolve() if args.jamfor else None,
        args.jamfor_utsnitt,
    )
