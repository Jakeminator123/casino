"""Brygga Blender -> dealer3d: skriver standarddockans mått och en Action till dealer3d:s rörelse-JSON (samma fält som
dealer3d/data/*.json: frames[].L/R.{s,e,w,k,p[21]}, h, g, card; meter i filmlinsens värld, three.js y upp).

Kör:
  blender -b <fil.blend> --python-exit-code 1 --python verktyg/blender_till_dealer3d.py -- --action NAMN --ut ut.json
"""
import argparse, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
from gemensamt import standard as S  # noqa: E402
from gemensamt.riggverktyg import Ram, FINGRAR, SIDOR  # noqa: E402

ap = argparse.ArgumentParser(); ap.add_argument('--action', required=True); ap.add_argument('--ut', required=True)
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:])
STD = S.load(); ram = Ram(STD); sc = bpy.context.scene
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o.get('standarddocka'))
act = bpy.data.actions[a.action]; rig.animation_data_create(); rig.animation_data.action = act
if act.slots:
    rig.animation_data.action_slot = act.slots[0]
pbs = rig.pose.bones; MW = rig.matrix_world
r = lambda v: [round(x, 4) for x in ram.till_lins(v)]
H = lambda n: (MW @ pbs[n].head)
T = lambda n: (MW @ pbs[n].tail)
kort = bpy.data.objects.get('kort_i_hand')
f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
frames = []
for fr in range(f0, f1 + 1):
    sc.frame_set(fr)
    out = {}
    for k, side in SIDOR.items():
        p = [H(side + 'Hand')]
        for fname, idx in FINGRAR:
            p += [H(f'{side}Hand{fname}1'), H(f'{side}Hand{fname}2'), H(f'{side}Hand{fname}3'), T(f'{side}Hand{fname}3')]
        out[k] = {'s': r(H(side + 'Arm')), 'e': r(H(side + 'ForeArm')), 'w': r(H(side + 'Hand')), 'k': 1, 'p': [r(q) for q in p]}
    hc = (H('Head') + T('Head')) / 2
    fw = (T('headfront') - H('headfront')).normalized()
    out['h'] = r(hc); out['g'] = r(hc + fw * 1.3)
    if kort is not None:
        m = kort.matrix_world.to_3x3(); lv, nv = m.col[1].normalized(), m.col[2].normalized()
        out['card'] = {'c': r(kort.matrix_world.translation), 'l': [round(lv.x, 4), round(lv.z, 4), round(-lv.y, 4)],
                       'n': [round(nv.x, 4), round(nv.z, 4), round(-nv.y, 4)], 'id': 0}
    frames.append(out)
sc.frame_set(f0)
hip = (H('RightUpLeg') + H('LeftUpLeg')) / 2
D = STD['docka']
meta = json.loads(act.get('dealer3d_meta', '{}'))
doc = {k: v for k, v in meta.items() if k in ('film', 'pose', 'places', 'to', 'beats', 'pace', 'leavesShoe')}
doc.update({
    'about': f'Standarddockan (avatar-rorelser, Blender) – Action {a.action}' + (f", ur {act.get('dealer3d_kalla')}" if act.get('dealer3d_kalla') else '') + '. Skriven av verktyg/blender_till_dealer3d.py.',
    'doll': 'standard-blender', 'fps': sc.render.fps, 'frameCount': len(frames), 'hip': r(hip),
    'dollMeasures': {'upperArm': round((H('RightArm') - H('RightForeArm')).length, 4), 'forearm': round((H('RightForeArm') - H('RightHand')).length, 4),
                     'reach': round((H('RightArm') - H('RightForeArm')).length + (H('RightForeArm') - H('RightHand')).length, 4),
                     'hipBelowFelt': round(STD['filt_z'] - hip.z, 4), 'shoulders': [r(H('RightArm')), r(H('LeftArm'))],
                     'neck': r(H('neck')), 'head': r((H('Head') + T('Head')) / 2), 'headRadius': D['huvud_radie']},
    'frames': frames,
})
Path(a.ut).parent.mkdir(parents=True, exist_ok=True)
Path(a.ut).write_text(json.dumps(doc, ensure_ascii=False), encoding='utf-8')
print('SKREV', a.ut, len(frames), 'bildrutor')
