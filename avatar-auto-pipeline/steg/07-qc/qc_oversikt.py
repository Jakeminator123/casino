"""QC-renderingar av en riggad dealer-GLB i vila (A-pose), körs i Blender.

blender -b --python steg/07-qc/qc_oversikt.py -- dealer.glb utmapp [samples=48]
Skriver helkropp-fram.png, helkropp-34.png, ansikte.png, handled-hoger.png, handled-vanster.png
samt qc.json (kamerapunkter, mått).
"""
import bpy, sys, json, math
import numpy as np
from mathutils import Vector
from pathlib import Path

a = sys.argv[sys.argv.index("--") + 1:]
src, out = Path(a[0]), Path(a[1])
samples = int(a[2]) if len(a) > 2 else 48
out.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "OPTIX"
    prefs.get_devices()
    optix_devs = [d for d in prefs.devices if d.type == "OPTIX"]
    if optix_devs:
        for d in prefs.devices:
            d.use = d in optix_devs
        sc.cycles.device = "GPU"
except Exception:
    sc.cycles.device = "CPU"
sc.cycles.samples = samples
sc.cycles.use_denoising = True
sc.view_settings.view_transform = "AgX"
sc.render.image_settings.file_format = "PNG"
w = bpy.data.worlds.new("W")
sc.world = w
w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.36, 0.39, 0.41, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
for name, loc, power, size in (("Key", (-2.2, -3.0, 2.6), 900, 2.0), ("Fill", (2.6, -2.4, 1.6), 350, 2.5),
                               ("Rim", (0.5, 3.0, 2.8), 500, 1.5)):
    L = bpy.data.lights.new(name, "AREA")
    L.energy, L.size = power, size
    o = bpy.data.objects.new(name, L)
    sc.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector((0, 0, 1.2)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()

bpy.ops.import_scene.gltf(filepath=str(src))
arm = next(o for o in sc.objects if o.type == "ARMATURE")
meshes = [o for o in sc.objects if o.type == "MESH" and o.find_armature() == arm]
for o in sc.objects:
    if o.type == "MESH" and o not in meshes:
        o.hide_render = True
bones = {b.name.split(":")[-1]: b for b in arm.data.bones}
mw = arm.matrix_world


def bh(n, tail=False):
    b = bones[n]
    return mw @ (b.tail_local if tail else b.head_local)


pts = np.vstack([np.array([o.matrix_world @ v.co for v in o.data.vertices]) for o in meshes])
lo, hi = pts.min(0), pts.max(0)
H = float(hi[2] - lo[2])

cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
sc.collection.objects.link(cam)
sc.camera = cam
tgt = bpy.data.objects.new("T", None)
sc.collection.objects.link(tgt)
tc = cam.constraints.new("TRACK_TO")
tc.target, tc.track_axis, tc.up_axis = tgt, "TRACK_NEGATIVE_Z", "UP_Y"
info = {"langd_m": round(H, 3)}


def shot(name, loc, look, lens, res=(900, 1200)):
    sc.render.resolution_x, sc.render.resolution_y = res
    cam.data.lens = lens
    cam.location = Vector(loc)
    tgt.location = Vector(look)
    bpy.context.view_layer.update()
    sc.render.filepath = str(out / name)
    bpy.ops.render.render(write_still=True)
    info[name] = {"kamera": [round(x, 3) for x in loc], "mal": [round(x, 3) for x in look], "lens": lens}


mid = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2))
shot("helkropp-fram.png", (mid.x, mid.y - 3.0, mid.z + 0.05), mid, 50)
ang = math.radians(35)
shot("helkropp-34.png", (mid.x + 3.0 * math.sin(ang), mid.y - 3.0 * math.cos(ang), mid.z + 0.05), mid, 50)
head = bh("Head")
top = Vector((head.x, head.y, hi[2]))
face = (head + top) / 2 + Vector((0, 0, -0.02))
ang = math.radians(18)
shot("ansikte.png", (face.x + 0.75 * math.sin(ang), face.y - 0.75 * math.cos(ang), face.z + 0.03), face, 85, (900, 900))
for side, fn in (("Right", "handled-hoger.png"), ("Left", "handled-vanster.png")):
    wrist = bh(side + "Hand")
    tip = bh(side + "HandMiddle3", tail=True) if side + "HandMiddle3" in bones else bh(side + "Hand", True)
    c = wrist * 0.5 + tip * 0.5
    axis = (tip - wrist).normalized()
    out_dir = Vector((1 if side == "Left" else -1, 0, 0))
    loc = c + Vector((0, -0.58, 0.10)) + out_dir * 0.24 - axis * 0.05
    shot(fn, tuple(loc), c, 85, (900, 900))
(out / "qc.json").write_text(json.dumps(info, indent=1, ensure_ascii=False), encoding="utf-8")
print("QC", json.dumps(info, ensure_ascii=False))
