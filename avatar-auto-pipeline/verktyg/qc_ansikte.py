"""Renderar närbilds-QC av ansiktsuttryck (ARKit shape keys + ansiktsben) för en standarddocka.
Steg 1 (Blender): blender -b --factory-startup --python-exit-code 1 --python verktyg/qc_ansikte.py -- --docka <blend> --ut <png>
Steg 2 (Python+Pillow): python verktyg/qc_ansikte.py --slahop <png>
"""
import argparse, math, sys
from pathlib import Path

if '--slahop' in sys.argv:
    from PIL import Image, ImageDraw
    ut = Path(sys.argv[sys.argv.index('--slahop') + 1]).resolve()
    tags = ['neutral', 'blink_brows', 'smile_talk']
    imgs = [(tag, Image.open(ut.parent / f'_tmp_{ut.stem}_{tag}.png').convert('RGB')) for tag in tags]
    strip = Image.new('RGB', (640 * len(imgs), 720))
    g = ImageDraw.Draw(strip)
    for idx, (tag, im) in enumerate(imgs):
        strip.paste(im, (idx * 640, 0))
        g.rectangle([idx * 640 + 8, 8, idx * 640 + 260, 32], fill=(20, 20, 20))
        g.text((idx * 640 + 14, 14), f"{ut.stem}: {tag}", fill=(255, 255, 255))
    strip.save(ut)
    for tag in tags:
        (ut.parent / f'_tmp_{ut.stem}_{tag}.png').unlink(missing_ok=True)
    print('OK_ANSIKTE', ut)
else:
    import bpy
    ROOT = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / 'scen'))
    from _bpy_hjalp import *  # noqa
    ap = argparse.ArgumentParser()
    ap.add_argument('--docka', required=True)
    ap.add_argument('--ut', required=True)
    a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:])
    ut = Path(a.ut).resolve(); ut.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    with bpy.data.libraries.load(str(Path(a.docka).resolve()), link=False) as (src, dst):
        dst.collections = [c for c in src.collections if c == 'standarddocka']
        dst.actions = list(src.actions)
    sc = bpy.context.scene
    for c in dst.collections:
        sc.collection.children.link(c)
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o.get('standarddocka'))
    body = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent == rig)
    act = bpy.data.actions.get('sitt_vila')
    if act:
        rig.animation_data_create(); rig.animation_data.action = act
        if act.slots:
            rig.animation_data.action_slot = act.slots[0]
    sc.frame_set(1); bpy.context.view_layer.update()
    hc = (rig.matrix_world @ rig.pose.bones['Head'].head + rig.matrix_world @ rig.pose.bones['Head'].tail) / 2
    w = bpy.data.worlds.new('qc_v'); w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.08, 0.08, 0.09, 1)
    sc.world = w
    lc = coll('qc_ansikte_ljus')
    for nm, loc, sz, en in (('key', (0.4, -0.7, hc.z + 0.35), 0.7, 35), ('fill', (-0.5, -0.6, hc.z + 0.1), 0.8, 16)):
        ld = bpy.data.lights.new(nm, 'AREA'); ld.size = sz; ld.energy = en
        ob = bpy.data.objects.new(nm, ld); lc.objects.link(ob); ob.location = loc; look_at(ob, hc)
    cd = bpy.data.cameras.new('kam_ansikte'); cd.lens = 85.0; cd.sensor_width = 36.0; cd.clip_start = 0.01
    cam = bpy.data.objects.new('kam_ansikte', cd); lc.objects.link(cam)
    cam.location = (hc.x + 0.06, hc.y - 0.62, hc.z + 0.03)
    look_at(cam, (hc.x, hc.y - 0.05, hc.z + 0.01))
    sc.camera = cam
    for e in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            sc.render.engine = e; break
        except TypeError:
            continue
    sc.render.resolution_x, sc.render.resolution_y = 640, 720
    sc.view_settings.view_transform = 'AgX' if 'AgX' in [x.identifier for x in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
    poses = [
        ('neutral', {}, {}),
        ('blink_brows', {'eyeBlinkLeft': 1.0, 'eyeBlinkRight': 0.85, 'browInnerUp': 0.75, 'mouthPressLeft': 0.5, 'mouthPressRight': 0.5}, {}),
        ('smile_talk', {'mouthSmileLeft': 0.85, 'mouthSmileRight': 0.85, 'jawOpen': 0.55, 'browOuterUpLeft': 0.5, 'browOuterUpRight': 0.5}, {'jaw': (math.radians(-12), 0, 0), 'eye.L': (0, 0, math.radians(-10)), 'eye.R': (0, 0, math.radians(-10))}),
    ]
    kb = body.data.shape_keys.key_blocks
    for tag, sk_vals, bone_rots in poses:
        for k in kb:
            k.value = 0.0
        for kn, val in sk_vals.items():
            if kn in kb:
                kb[kn].value = val
        for bname in ('jaw', 'eye.L', 'eye.R'):
            if bname in rig.pose.bones:
                rig.pose.bones[bname].rotation_mode = 'XYZ'
                rig.pose.bones[bname].rotation_euler = bone_rots.get(bname, (0.0, 0.0, 0.0))
        bpy.context.view_layer.update()
        p = ut.parent / f'_tmp_{ut.stem}_{tag}.png'
        sc.render.filepath = str(p)
        bpy.ops.render.render(write_still=True)
