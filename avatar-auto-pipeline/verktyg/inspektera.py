#!/usr/bin/env python3
"""Dumpa en .glb eller .blend till JSON: objekt, benhierarki, mesh-statistik och actions.

AI ser inte 3D-filer direkt; den här texten är till för att en agent ska kunna läsa riggen.

Kör med en separat headless Blender. Öppna aldrig en fil som redan är öppen i en
Blender-session (rör inte den process som visar scenen):

  blender -b --python verktyg/inspektera.py -- output/<namn>/06-dealer-export/<namn>-dealer-apose.glb
  blender -b --python verktyg/inspektera.py -- fil.blend --out rapport.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def argv_after_dashdash():
    if "--" in sys.argv:
        return sys.argv[sys.argv.index("--") + 1 :]
    return []


def parse_args(args):
    src = None
    out = None
    i = 0
    while i < len(args):
        if args[i] in ("--out", "-o") and i + 1 < len(args):
            out = Path(args[i + 1])
            i += 2
            continue
        if not str(args[i]).startswith("-") and src is None:
            src = Path(args[i])
        i += 1
    return src, out


def v3(p):
    return [round(float(p[0]), 5), round(float(p[1]), 5), round(float(p[2]), 5)]


def world_bound(obj):
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    xs, ys, zs = zip(*[(c.x, c.y, c.z) for c in corners])
    return {"min": v3((min(xs), min(ys), min(zs))), "max": v3((max(xs), max(ys), max(zs)))}


def load(path: Path):
    path = path.resolve()
    if not path.is_file():
        raise FileNotFoundError(path)
    suffix = path.suffix.lower()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if suffix in {".blend"}:
        bpy.ops.wm.open_mainfile(filepath=str(path), load_ui=False)
    elif suffix in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(path))
    elif suffix in {".fbx"}:
        bpy.ops.import_scene.fbx(filepath=str(path))
    else:
        raise ValueError(f"Stöder .blend, .glb, .gltf och .fbx – inte {suffix}")
    return path


def dump_armature(obj):
    arm = obj.data
    bones = []
    for bone in arm.bones:
        parent = bone.parent.name if bone.parent else None
        # head/tail i objektets rum, sedan till världskoordinater
        head = obj.matrix_world @ bone.head_local
        tail = obj.matrix_world @ bone.tail_local
        bones.append({
            "namn": bone.name,
            "foralder": parent,
            "huvud": v3(head),
            "svans": v3(tail),
            "langd_m": round((tail - head).length, 5),
        })
    roten = [b.name for b in arm.bones if b.parent is None]
    return {
        "objekt": obj.name,
        "ben": len(bones),
        "rötter": roten,
        "hierarki": bones,
    }


def dump_mesh(obj):
    mesh = obj.data
    mat = [s.name for s in obj.material_slots if s.material]
    keys = []
    if mesh.shape_keys:
        keys = [k.name for k in mesh.shape_keys.key_blocks]
    return {
        "objekt": obj.name,
        "hornen": len(mesh.vertices),
        "kanter": len(mesh.edges),
        "ytor": len(mesh.polygons),
        "material": mat,
        "shapekeys": keys,
        "bound": world_bound(obj),
    }


def action_fcurves(action):
    # Blender 5.x uses layered actions (layers/strips/channelbags); older versions have action.fcurves.
    if hasattr(action, "fcurves") and not getattr(action, "is_action_layered", False):
        return list(action.fcurves)
    curves = []
    for layer in getattr(action, "layers", []):
        for strip in getattr(layer, "strips", []):
            for bag in list(getattr(strip, "channelbags", []) or []):
                curves.extend(list(getattr(bag, "fcurves", []) or []))
    return curves


def dump_action(action):
    fcurves = action_fcurves(action)
    fr = action.frame_range
    kanaler = set()
    for fc in fcurves:
        path = fc.data_path
        if '["' in path:
            kanaler.add(path.split('["', 1)[1].split('"]', 1)[0])
        else:
            kanaler.add(path)
    kanaler = sorted(kanaler)
    return {
        "namn": action.name,
        "start": float(fr[0]),
        "slut": float(fr[1]),
        "fcurves": len(fcurves),
        "kanaler_urval": kanaler[:40],
        "kanaler_antal": len(kanaler),
        "layered": bool(getattr(action, "is_action_layered", False)),
    }


def inspect(path: Path):
    path = load(path)
    sc = bpy.context.scene
    armatures = [dump_armature(o) for o in bpy.data.objects if o.type == "ARMATURE"]
    meshes = [dump_mesh(o) for o in bpy.data.objects if o.type == "MESH"]
    actions = [dump_action(a) for a in bpy.data.actions]
    nla = []
    for obj in bpy.data.objects:
        if not obj.animation_data or not obj.animation_data.nla_tracks:
            continue
        tracks = []
        for tr in obj.animation_data.nla_tracks:
            strips = [{"namn": s.name, "action": s.action.name if s.action else None,
                       "start": float(s.frame_start), "slut": float(s.frame_end)}
                      for s in tr.strips]
            tracks.append({"namn": tr.name, "strips": strips})
        nla.append({"objekt": obj.name, "spar": tracks})
    return {
        "fil": str(path),
        "blender": bpy.app.version_string,
        "scen": {
            "namn": sc.name,
            "ruta_start": int(sc.frame_start),
            "ruta_slut": int(sc.frame_end),
            "fps": int(sc.render.fps),
        },
        "objekt": [{"namn": o.name, "typ": o.type, "position": v3(o.matrix_world.translation)}
                   for o in bpy.data.objects],
        "armaturer": armatures,
        "mesh": meshes,
        "actions": actions,
        "nla": nla,
        "sammanfattning": {
            "objekt": len(bpy.data.objects),
            "armaturer": len(armatures),
            "ben": sum(a["ben"] for a in armatures),
            "mesh": len(meshes),
            "shapekeys": sum(len(m["shapekeys"]) for m in meshes),
            "actions": len(actions),
            "nla_objekt": len(nla),
        },
    }


def main():
    src, out = parse_args(argv_after_dashdash())
    if src is None:
        raise SystemExit("Ange en .glb eller .blend efter --")
    data = inspect(src)
    text = json.dumps(data, ensure_ascii=False, indent=2)
    if out is None:
        out = src.with_suffix(src.suffix + ".inspektion.json")
    out = out.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    s = data["sammanfattning"]
    print(f"Skrev {out}")
    print(f"Ben: {s['ben']}  Actions: {s['actions']}  Mesh: {s['mesh']}  Shapekeys: {s['shapekeys']}")


if __name__ == "__main__":
    main()
