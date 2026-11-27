"""Gör en dealer-redo GLB: bennamn utan 'mixamorig:' och 'Neck' -> 'neck' (dealer3d/src/figure-model.ts letar efter
RightArm, RightForeArm, RightHand, RightUpLeg, RightLeg, RightFoot (+Left), neck, Head, headfront), och två vridben i
varje underarm som standarddockorna (vridben.py, new_docka.md 7.1b; huden i vila mäts oförändrad).
blender -b --python steg/06-dealer-export/exportera_dealer.py -- avatar-rigg.glb namn-dealer-apose.glb [--utan-vridben]"""
import bpy, sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import vridben

a = sys.argv[sys.argv.index("--") + 1:]
src, dst = Path(a[0]).resolve(), Path(a[1]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(src))
arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
mesh = next(o for o in bpy.context.scene.objects if o.type == "MESH" and o.find_armature() == arm)
for o in list(bpy.context.scene.objects):
    if o.type == "MESH" and o is not mesh:
        bpy.data.objects.remove(o)
renamed = {}
for b in arm.data.bones:
    new = b.name.split(":")[-1]
    if new == "Neck":
        new = "neck"
    if new != b.name:
        renamed[b.name] = new
        b.name = new
twist = {"hoppade_over": "--utan-vridben"} if "--utan-vridben" in a else vridben.lagga_till(arm, mesh)
need = [f"{s}{p}" for s in ("Right", "Left") for p in ("Arm", "ForeArm", "Hand", "UpLeg", "Leg", "Foot")] + ["neck", "Head", "headfront"]
names = {b.name for b in arm.data.bones}
missing = [n for n in need if n not in names]
mw = arm.matrix_world
rep = {"ben": len(names), "omdopta": len(renamed), "saknas_for_dealer": missing,
       "fingerben": sorted(n for n in names if any(k in n for k in ("Thumb", "Index", "Middle", "Ring", "Pinky"))),
       "vridben": twist}
for side in ("Left", "Right"):
    vg = mesh.vertex_groups[side + "Hand"]
    rep[f"{side}Hand_horn_vikt_over_0_6"] = sum(1 for v in mesh.data.vertices for g in v.groups if g.group == vg.index and g.weight > 0.6)
    rep[f"{side}Arm_led_m"] = [round(x, 3) for x in (mw @ arm.data.bones[side + "Arm"].head_local)]
bpy.ops.object.select_all(action="DESELECT"); arm.select_set(True); mesh.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(dst), export_format="GLB", use_selection=True, export_animations=False,
                          export_image_format="AUTO")
dst.with_suffix(".json").write_text(json.dumps(rep, indent=1, ensure_ascii=False), encoding="utf-8")
print("DEALER", json.dumps(rep, ensure_ascii=False))
