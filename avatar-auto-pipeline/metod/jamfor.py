"""Render the original body, the head swap and the aligned full-resolution donor."""

import argparse
import json
import sys
import tempfile
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix
from PIL import Image


def review(repo, model, donor, config, output):
    sys.path.insert(0, str(repo / "Jakob/meshy"))
    import hashlib

    from rendera import plate, render_frame, save_review, studio

    if not bpy.app.background:
        raise RuntimeError("Använd en separat Blender-process.")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    base = repo / "Jakob/meshy/jakob.glb"

    def read_mesh(path):
        bpy.ops.import_scene.gltf(filepath=str(path))
        return [o for o in bpy.context.selected_objects if o.type == "MESH"]

    body = read_mesh(base)
    xyz = []
    for o in body:
        p = np.empty((len(o.data.vertices), 3), np.float32)
        o.data.vertices.foreach_get("co", p.ravel())
        T = np.array(o.matrix_world)
        xyz.append(p @ T[:3, :3].T + T[:3, 3])
    v = np.concatenate(xyz)
    lo, hi = v.min(0), v.max(0)
    H = hi[2] - lo[2]
    C = (hi + lo) / 2
    focus = np.median(v[v[:, 2] > hi[2] - 0.14 * H], axis=0)
    focus[2] = hi[2] - 0.093 * H
    scene = bpy.context.scene
    camera = studio(scene, C, H)
    output.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(model.read_bytes()).hexdigest()

    def drop(objects):
        for o in objects:
            bpy.data.objects.remove(o, do_unlink=True)

    with tempfile.TemporaryDirectory() as tmp:
        framefile = Path(tmp) / "frame.png"

        def heads():
            return [
                render_frame(scene, camera, focus, 0.224 * H, H, angle, (440, 440), framefile)
                for angle in (0, 40)
            ]

        old = heads()
        drop(body)
        new_objects = read_mesh(model)
        new = heads()
        full = []
        for angle in (0, 40):
            frame = render_frame(
                scene,
                camera,
                C,
                max(H, (hi[0] - lo[0]) * 1080 / 896) * 1.10,
                H,
                angle,
                (896, 1080),
                framefile,
            )
            save_review(frame, output / f"vy-{angle}.png", digest, angle)
            full.append(frame.resize((448, 540), Image.Resampling.LANCZOS))
        save_review(
            plate(full, ["Huvudbyte · 0°", "Huvudbyte · 40°"]), output / "helkropp.png", digest, "0, 40"
        )
        # Ears, collar and nape remain inside these three crops.
        neck_focus = np.array([0.0, 0.042, 0.683])
        neck = [
            render_frame(scene, camera, neck_focus, 0.208 * H, H, a, (360, 360), framefile)
            for a in (0, 90, 180)
        ]
        save_review(
            plate(neck, ["Hals · 0°", "Hals · 90°", "Hals · 180°"]),
            output / "hals.png",
            digest,
            "0, 90, 180",
        )
        drop(new_objects)
        refs = []
        if donor:
            donor_objects = read_mesh(donor)
            B = np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1.0]])
            T = np.array(json.loads(config.read_text(encoding="utf8"))["matrix"])
            for obj in donor_objects:
                obj.matrix_world = Matrix((B.T @ T @ B).tolist()) @ obj.matrix_world
            refs = heads()
            drop(donor_objects)
        rows = []
        for i, a in enumerate((0, 40)):
            imgs = [old[i], new[i]]
            labels = [f"Första helkroppen · {a}°", f"Huvudbyte · {a}°"]
            if refs:
                imgs.append(refs[i])
                labels.append(f"Groks huvud · {a}°")
            rows.append(plate(imgs, labels))
        out = Image.new("RGB", (rows[0].width, rows[0].height * 2), "#f5f3ef")
        for i, row in enumerate(rows):
            out.paste(row, (0, i * row.height))
        save_review(
            out,
            output / "ansiktsjamforelse.png",
            digest,
            "before / hybrid / optional aligned donor; 0, 40",
        )
        if refs:
            # Compare the skin and hair interior, excluding the neck and clothing.
            # These crops are a render comparison, not an identity score.
            for a, ref, img in zip((0, 40), refs, new):
                d = np.abs(np.asarray(ref, dtype=np.int16) - np.asarray(img, dtype=np.int16))[
                    105:280, 145:295
                ]
                print("Donor/head-swap face crop", a, "mean RGB delta", round(d.mean(), 3), flush=True)
    print("Head swap reviewed", digest, flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for arg in ["repo", "model", "config", "output"]:
        parser.add_argument(arg, type=Path)
    parser.add_argument("--donor", type=Path)
    a = parser.parse_args()
    review(a.repo, a.model, a.donor, a.config, a.output)
