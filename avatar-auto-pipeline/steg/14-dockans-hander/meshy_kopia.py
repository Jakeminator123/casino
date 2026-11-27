"""Steg 14, betald väg för huden: en kopia av bara dockans högra hand att måla hos Meshy (steg 12:s meshy_ny_yta.py
med --kopia), gratis att göra.

Kopian är dockans högra hand med en bit underarm (samma urval som steg 14 sätter in), utan skelett, former och
hörnfärger, med dockans egen ytkarta (MPFB:s, så att bilden Meshy målar med enable_original_uv passar dockans hand som
den är), ställd som handen i vyn: handryggen framåt (-Y, Meshys framsida), fingrarna uppåt. Vyn är förlagan ur steg 1
(en öppen högerhand bakifrån). Bilden som kommer tillbaka läggs på båda händerna med dockans_hander.py --meshy-bild
(vänster hand speglad).

    blender -b --factory-startup --python-exit-code 1 --python steg/14-dockans-hander/meshy_kopia.py -- \
        docka.glb vy.png kopia.glb
    .venv/Scripts/python.exe -I steg/12-ny-yta/meshy_ny_yta.py docka.glb <mapp> --kopia kopia.glb --vy vy.png --dry-run
Rapporten (kopia.json) har det meshy_ny_yta.py läser: dockans, vyns och kopians kontrollsummor, trianglar och hörn.
"""
import hashlib, json, os, sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix

STUMP_M = 0.06


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def enhet(v):
    return v / np.linalg.norm(v)


def main():
    a = sys.argv[sys.argv.index('--') + 1:]
    docka, vy, ut = (Path(x).resolve() for x in a[:3])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(docka))
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    me = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.find_armature() == arm)
    arm.data.pose_position = 'REST'
    J = {b.name: np.array(arm.matrix_world @ b.head_local) for b in arm.data.bones}
    w = J['RightHand']; f = enhet(J['RightHandMiddle1'] - w)
    t = J['RightHandThumb2'] - w; t = enhet(t - (t @ f) * f)
    palm = enhet(np.cross(t, f))
    dax = enhet(w - J['RightForeArm'])
    vg = {g.index: g.name for g in me.vertex_groups}
    X = np.empty(len(me.data.vertices) * 3); me.data.vertices.foreach_get('co', X)
    M = np.array(me.matrix_world); X = X.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
    armv = np.zeros(len(X))
    for v in me.data.vertices:
        armv[v.index] = sum(g.weight for g in v.groups if vg[g.group].startswith('Right') and ('Hand' in vg[g.group] or 'ForeArm' in vg[g.group]))
    behall = (armv > 0.5) & ((X - w) @ dax > -STUMP_M)
    for o in list(bpy.context.scene.objects):
        if o is not me:
            bpy.data.objects.remove(o)
    if me.data.shape_keys:
        me.shape_key_clear()
    for m in list(me.modifiers):
        me.modifiers.remove(m)
    me.parent = None
    me.vertex_groups.clear()
    for ca in list(me.data.color_attributes):
        me.data.color_attributes.remove(ca)
    # handryggen framåt (-Y), fingrarna uppåt (+Z), handleden i origo
    R = np.stack([np.cross(f, -palm), palm, f], 0)      # rader: x, y, z i kopians rum (y = handflatan, bakåt)
    Y = (X - w) @ R.T
    me.matrix_world = Matrix.Identity(4)
    me.data.vertices.foreach_set('co', Y.ravel()); me.data.update()
    bm = bmesh.new(); bm.from_mesh(me.data); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[fc for fc in bm.faces if not all(behall[v.index] for v in fc.verts)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(me.data); bm.free(); me.data.update()
    uv = np.empty(len(me.data.loops) * 2); me.data.uv_layers[0].data.foreach_get('uv', uv)
    co = np.empty(len(me.data.vertices) * 3); me.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    bpy.ops.object.select_all(action='DESELECT'); me.select_set(True); bpy.context.view_layer.objects.active = me
    ny = ut.with_suffix('.ny.glb')
    bpy.ops.export_scene.gltf(filepath=str(ny), export_format='GLB', use_selection=True, export_animations=False,
                              export_skins=False, export_morph=False)
    os.replace(ny, ut)
    rap = {'docka': docka.name, 'docka_sha256': sha(docka), 'vy': vy.name, 'vy_sha256': sha(vy), 'meshy_kopia_py_sha256': sha(__file__),
           'kopia_sha256': sha(ut), 'horn': len(me.data.vertices), 'trianglar': int(sum(len(p.vertices) - 2 for p in me.data.polygons)),
           'uv_inom_0_1': bool(((uv >= 0) & (uv <= 1)).all()), 'langd_m': round(float(np.ptp(co[:, 2])), 3),
           'bredd_m': round(float(np.ptp(co[:, 0])), 3), 'stallning': 'högra handen, handryggen framåt (-Y), fingrarna uppåt'}
    ut.with_suffix('.json').write_text(json.dumps(rap, indent=1, ensure_ascii=False), encoding='utf-8')
    print('KOPIA', json.dumps(rap, ensure_ascii=False))


main()
