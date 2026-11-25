"""Lätt riggkopia med full texturupplösning: bara geometrin decimeras, alla texturer behåller sin
upplösning (4K BaseColor/Normal, 2K Metallic/Roughness).

Budgeten fördelas per del (material) i stället för jämnt över hela meshen. Annars äter ett tätt
Meshy-huvud (hår och skägg kan ge 4–5 miljoner trianglar) hela budgeten och kropp och fingrar
decimeras sönder. Decimeringen görs i redigeringsläget på en del i taget, så skarvarna mot
grannarna (Skarvar-materialet) ligger kvar orörda och inga hål uppstår.

blender -b --python pipeline/forenkla_4k.py -- in.glb ut.glb [trianglar=180000]
"""
import json
import sys
from pathlib import Path

import bmesh
import bpy

SHARES = {"Huvud": 0.40, "Kropp": 0.38, "Handpar": 0.20}  # resten (Skarvar) behålls

args = sys.argv[sys.argv.index("--") + 1:]
src, dst = Path(args[0]).resolve(), Path(args[1]).resolve()
budget = int(args[2]) if len(args) > 2 else 180000
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(src), merge_vertices=True)
objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
before = sum(len(o.data.polygons) for o in objects)


def per_material(obj):
    counts = {}
    for p in obj.data.polygons:
        name = obj.material_slots[p.material_index].name if obj.material_slots else ""
        counts[name] = counts.get(name, 0) + 1
    return counts


def boundary_edges(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    n = sum(1 for e in bm.edges if e.is_boundary)
    bm.free()
    return n


report = {"fore": before, "budget": budget, "delar": {}}
for obj in objects:
    bpy.context.view_layer.objects.active = obj
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-7)
    bm.to_mesh(obj.data)
    bm.free()
    counts = per_material(obj)
    report["kantlinjer_fore"] = report.get("kantlinjer_fore", 0) + boundary_edges(obj)
    parts = {i: s.name for i, s in enumerate(obj.material_slots)
             if any(s.name.startswith(k) for k in SHARES)}
    if not parts:
        mod = obj.modifiers.new("Rig copy", "DECIMATE")
        mod.ratio = min(1, budget / before)
        mod.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=mod.name)
        report["metod"] = "jämn"
        continue
    report["metod"] = "per del"
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_mode(type="FACE")
    for index, name in parts.items():
        share = next(v for k, v in SHARES.items() if name.startswith(k))
        n = counts.get(name, 0)
        ratio = min(1.0, share * budget / max(n, 1))
        report["delar"][name] = {"fore": n, "kvot": round(ratio, 4)}
        if ratio >= 1:
            continue
        bpy.ops.mesh.select_all(action="DESELECT")
        obj.active_material_index = index
        bpy.ops.object.material_slot_select()
        bpy.ops.mesh.decimate(ratio=ratio)
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.quads_convert_to_tris()
    bpy.ops.object.mode_set(mode="OBJECT")
    for name, n in per_material(obj).items():
        report["delar"].setdefault(name, {})["efter"] = n
    report["kantlinjer_efter"] = report.get("kantlinjer_efter", 0) + boundary_edges(obj)
for im in bpy.data.images:
    print("TEXTUR", im.name, tuple(im.size))
tmp = dst.with_name(dst.stem + ".partial.glb")
bpy.ops.export_scene.gltf(filepath=str(tmp), export_format="GLB", export_animations=False,
                          export_image_format="JPEG", export_jpeg_quality=92)
tmp.replace(dst)
report["efter"] = sum(len(o.data.polygons) for o in objects)
dst.with_name(dst.stem + "-forenkling.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
print("TRIANGLAR fore", before, "efter", report["efter"], json.dumps(report, ensure_ascii=False))
