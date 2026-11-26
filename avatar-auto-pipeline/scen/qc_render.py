"""QC-renderingar ur standardscenen. Öppnar bordet, lägger ev. till dockan, sätter ljus och renderar namngivna kameror.

Kör:  blender -b --python-exit-code 1 --python scen/qc_render.py -- --kameror topp film spelare_1 hel --ut qc --tagg bord [--docka assets/docka/standarddocka.blend] [--action NAMN --bildruta 30]
"""
import argparse, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _bpy_hjalp import *  # noqa

ap = argparse.ArgumentParser()
ap.add_argument('--bord', default=str(ROOT / 'assets/bord/standardbord.blend'))
ap.add_argument('--docka', default=None)
ap.add_argument('--extra', nargs='*', default=[], help='fler .blend vars samlingar läggs till (t.ex. stolen)')
ap.add_argument('--action', default=None)
ap.add_argument('--bildruta', type=int, default=None)
ap.add_argument('--kameror', nargs='+', default=['topp', 'film'])
ap.add_argument('--ut', default=str(ROOT / 'qc'))
ap.add_argument('--tagg', default='bord')
ap.add_argument('--skala', type=float, default=1.0, help='upplösningsskala')
ap.add_argument('--motor', default='EEVEE')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
import os
a.docka = os.path.abspath(a.docka) if a.docka else None; a.ut = os.path.abspath(a.ut); a.bord = os.path.abspath(a.bord)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.open_mainfile(filepath=a.bord)
sc = bpy.context.scene
if a.docka:
    with bpy.data.libraries.load(a.docka, link=False) as (src, dst):
        dst.collections = [c for c in src.collections if c in ('standarddocka', 'dealer3d_kort')]
        dst.actions = list(src.actions)
    for c in dst.collections:
        sc.collection.children.link(c)
    if a.action:
        rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o.get('standarddocka'))
        act = bpy.data.actions.get(a.action)
        rig.animation_data_create(); rig.animation_data.action = act
        if act.slots:
            rig.animation_data.action_slot = act.slots[0]
        k = bpy.data.objects.get('kort_i_hand')
        if k and k.animation_data and k.animation_data.action:
            ka = k.animation_data.action
            if ka.slots:
                k.animation_data.action_slot = ka.slots[0]
        sc.frame_start, sc.frame_end = int(act.frame_range[0]), int(act.frame_range[1])
for ex in a.extra:
    with bpy.data.libraries.load(os.path.abspath(ex), link=False) as (src, dst):
        dst.collections = list(src.collections)
    for c in dst.collections:
        sc.collection.children.link(c)
if a.bildruta is not None:
    sc.frame_set(a.bildruta)

# ljus: mjukt tak över bordet + svag fyllnad, grå värld
w = bpy.data.worlds.new('qc_varld'); w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.05, 0.05, 0.055, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
sc.world = w
lc = coll('qc_ljus')
for name, loc, size, energy in (('tak', (0, -0.3, 2.6), 2.0, 260), ('fyll', (0, -2.2, 1.9), 1.5, 70), ('bak', (0, 1.5, 2.2), 1.5, 60)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.size = size; ld.energy = energy
    ob = bpy.data.objects.new('ljus_' + name, ld); lc.objects.link(ob); ob.location = loc; look_at(ob, (0, -0.3, 0.95))
golv = bpy.data.meshes.new('golv'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=4); bm.to_mesh(golv); bm.free()
go = bpy.data.objects.new('qc_golv', golv); lc.objects.link(go)
golv.materials.append(pbr('qc_golv', (0.18, 0.17, 0.16, 1), rough=0.8))

cams = make_cameras(coll('qc_kameror'), a.kameror)
eng = {'EEVEE': ['BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'], 'CYCLES': ['CYCLES']}[a.motor]
for e in eng:
    try:
        sc.render.engine = e; break
    except TypeError:
        continue
if sc.render.engine == 'CYCLES':
    sc.cycles.samples = 48; sc.cycles.use_denoising = True
else:
    try:
        sc.eevee.taa_render_samples = 32
    except AttributeError:
        pass
sc.view_settings.view_transform = 'AgX' if 'AgX' in [x.identifier for x in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
out = Path(a.ut); out.mkdir(parents=True, exist_ok=True)
base = STD['lins']['bild_px']
for name, cam in cams.items():
    sc.camera = cam
    if name == 'topp':
        sc.render.resolution_x = sc.render.resolution_y = int(1600 * a.skala)
    else:
        sc.render.resolution_x, sc.render.resolution_y = int(base[0] * a.skala), int(base[1] * a.skala)
    sc.render.filepath = str(out / f'{a.tagg}_{name}.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERAD', sc.render.filepath, sc.render.engine)
