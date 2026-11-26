"""Dealerns stol: Meshy-modellen (assets/meshy/stol_meshy_ra.glb, text-to-3D, kvittot i assets/meshy/meshy-logg.json)
skalad och placerad exakt enligt standard.yaml (stol.sits_z, stol.sits_mitt). Sitsens höjd mäts med en stråle uppifrån.
Kör: blender -b --factory-startup --python-exit-code 1 --python scen/bygg_stol.py
Ut:  assets/stol/dealerstol.blend och .glb, och stol-rapport.json i slaskens bygge/
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _bpy_hjalp import *  # noqa
from gemensamt.sokvagar import BYGGRAPPORTER, slask

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
src = ROOT / 'assets' / 'meshy' / 'stol_meshy_ra.glb'
bpy.ops.import_scene.gltf(filepath=str(src))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in bpy.context.scene.objects:
    o.select_set(o in meshes)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
for o in list(bpy.context.scene.objects):
    if o != ob and o.type != 'MESH':
        o.select_set(False)
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.context.scene.objects):
    if o != ob:
        bpy.data.objects.remove(o, do_unlink=True)
ob.name = 'dealerstol'
co = [v.co for v in ob.data.vertices]
mn = Vector((min(c.x for c in co), min(c.y for c in co), min(c.z for c in co))); mx = Vector((max(c.x for c in co), max(c.y for c in co), max(c.z for c in co)))
ctr = (mn + mx) / 2
for v in ob.data.vertices:
    v.co -= Vector((ctr.x, ctr.y, mn.z))
ob.data.update()
size = mx - mn
# sitsen: högsta träff i stolens främre halva (ryggstödet sitter bak)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
hits = []
for fy in (-0.30, -0.20, -0.10, 0.0):
    for fx in (-0.15, 0.0, 0.15):
        o = Vector((fx * size.x, fy * size.y, size.z + 1)); ok, loc, *_ = bpy.context.scene.ray_cast(dg, o, Vector((0, 0, -1)))
        if ok:
            hits.append(loc.z)
hits.sort(); seat_raw = hits[len(hits) // 2] if hits else size.z * 0.6
st = STD['stol']; s = st['sits_z'] / seat_raw
ob.scale = (s, s, s); bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
bpy.ops.object.transform_apply(scale=True)
ob.location = (st['sits_mitt'][0], st['sits_mitt'][1] + 0.05, 0.0)
ob['kalla'] = 'Meshy text-to-3D meshy-7.1 (preview+refine, 30 krediter), skalad till standard.yaml stol.sits_z'
rap = {'ra_storlek_m': [round(x, 3) for x in size], 'sits_ra_z': round(seat_raw, 4), 'skala': round(s, 4),
       'storlek_efter_m': [round(x * s, 3) for x in size], 'sits_z': st['sits_z'], 'placering': list(ob.location)}
out = ROOT / 'assets' / 'stol'; out.mkdir(parents=True, exist_ok=True)
(slask('bygge', BYGGRAPPORTER) / 'stol-rapport.json').write_text(json.dumps(rap, indent=1), encoding='utf-8')
c = coll('dealerstol'); bpy.context.scene.collection.objects.unlink(ob) if ob.name in bpy.context.scene.collection.objects else None
for uc in list(ob.users_collection):
    uc.objects.unlink(ob)
c.objects.link(ob)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'dealerstol.blend'))
bpy.ops.export_scene.gltf(filepath=str(out / 'dealerstol.glb'), export_format='GLB')
print('STOL', json.dumps(rap))
