"""Snabb förhandsvisning (PNG) av monterad/förenklad statisk GLB för steg 03-montering.

blender -b --python forhandsvisning_montering.py -- in.glb ut.png [samples=10]
"""
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
src, dst = Path(args[0]).resolve(), Path(args[1]).resolve()
samples = int(args[2]) if len(args) > 2 else 10
dst.parent.mkdir(parents=True, exist_ok=True)

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
sc.render.resolution_x = 768
sc.render.resolution_y = 960
sc.render.image_settings.file_format = "PNG"

w = bpy.data.worlds.new("W")
sc.world = w
w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.36, 0.39, 0.41, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 0.65

bpy.ops.import_scene.gltf(filepath=str(src))
meshes = [o for o in sc.objects if o.type == "MESH"]
if not meshes:
    raise RuntimeError(f"Inga mesh-objekt hittades i {src}")

pts = np.vstack([np.array([o.matrix_world @ v.co for v in o.data.vertices]) for o in meshes])
lo, hi = pts.min(0), pts.max(0)
mid = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2))
h = max(float(hi[2] - lo[2]), 0.5)

for name, loc, power, size in (
    ("Key", (-2.0, -2.8, 2.4), 900, 2.0),
    ("Fill", (2.4, -2.2, 1.5), 350, 2.5),
    ("Rim", (0.5, 2.8, 2.6), 500, 1.5),
):
    L = bpy.data.lights.new(name, "AREA")
    L.energy, L.size = power, size
    o = bpy.data.objects.new(name, L)
    sc.collection.objects.link(o)
    o.location = Vector(loc)
    o.rotation_euler = (mid - o.location).to_track_quat("-Z", "Y").to_euler()

cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = 50
ang = math.radians(20)
dist = h * 1.75
cam.location = Vector((mid.x + dist * math.sin(ang), mid.y - dist * math.cos(ang), mid.z + 0.04 * h))
tgt = bpy.data.objects.new("T", None)
sc.collection.objects.link(tgt)
tgt.location = mid
tc = cam.constraints.new("TRACK_TO")
tc.target, tc.track_axis, tc.up_axis = tgt, "TRACK_NEGATIVE_Z", "UP_Y"

sc.render.filepath = str(dst)
bpy.ops.render.render(write_still=True)
print("PREVIEW", dst)
