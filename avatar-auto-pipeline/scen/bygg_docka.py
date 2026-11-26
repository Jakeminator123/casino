"""Standarddockan: MPFB2 (CC0-kropp) + Mixamo-namngivet skelett (52 kropps-/handben + 16 ansiktsben under Head),
ARKit-kompatibla shape keys för ansiktsuttryck, egna IK-kontroller, ledgränser och exportnamn som dealer3d kräver.

Bygger två grunddockor med 100 % identiskt skelett/bennamn så alla rörelser kan återanvändas:
  - standarddocka_kvinna.blend / .glb
  - standarddocka_man.blend / .glb

Kräver MPFB2 som Blender-tillägg i användarprofilen (bl_ext.user_default.mpfb).
Kör (utan --factory-startup, annars laddas inte tillägget):
    blender -b --python-exit-code 1 --python scen/bygg_docka.py [-- --kon kvinna|man|bada]
"""
import argparse, gzip, json, math, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _bpy_hjalp import *  # noqa
import addon_utils
import numpy as np
from gemensamt.riggverktyg import sikta_ben, tvaled_ik, SIDOR, KRAVDA_BEN, satt_rotation_varld, hand_axlar
from gemensamt.sokvagar import BYGGRAPPORTER, slask

OUT = ROOT / 'assets' / 'docka'
D = STD['docka']; FZ = STD['filt_z']

addon_utils.enable('bl_ext.user_default.mpfb', default_set=False)
from bl_ext.user_default.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.user_default.mpfb.services.targetservice import TargetService  # noqa: E402
from bl_ext.user_default.mpfb.services.locationservice import LocationService  # noqa: E402

ANSIKTSBEN = [
    'jaw', 'eye.L', 'eye.R',
    'orbicularis03.L', 'orbicularis03.R', 'orbicularis04.L', 'orbicularis04.R',
    'oculi01.L', 'oculi01.R', 'oculi02.L', 'oculi02.R',
    'oris01', 'oris05', 'risorius03.L', 'risorius03.R',
]

# ARKit-mappning från MPFB:s inbyggda uttrycks-targets (caucasian + mouth):
# (arkit_namn, [(target_relpath, weight)], split_lr: None | 'L' | 'R')
ARKIT_KARTA = [
    ('eyeBlinkLeft', [('expression/units/caucasian/eye-left-closure.target.gz', 1.0)], None),
    ('eyeBlinkRight', [('expression/units/caucasian/eye-right-closure.target.gz', 1.0)], None),
    ('eyeWideLeft', [('expression/units/caucasian/eye-left-opened-up.target.gz', 1.0)], None),
    ('eyeWideRight', [('expression/units/caucasian/eye-right-opened-up.target.gz', 1.0)], None),
    ('eyeSquintLeft', [('expression/units/caucasian/eye-left-slit.target.gz', 1.0)], None),
    ('eyeSquintRight', [('expression/units/caucasian/eye-right-slit.target.gz', 1.0)], None),
    ('browDownLeft', [('expression/units/caucasian/eyebrows-left-down.target.gz', 1.0)], None),
    ('browDownRight', [('expression/units/caucasian/eyebrows-right-down.target.gz', 1.0)], None),
    ('browInnerUp', [('expression/units/caucasian/eyebrows-left-inner-up.target.gz', 1.0),
                     ('expression/units/caucasian/eyebrows-right-inner-up.target.gz', 1.0)], None),
    ('browOuterUpLeft', [('expression/units/caucasian/eyebrows-left-extern-up.target.gz', 1.0)], None),
    ('browOuterUpRight', [('expression/units/caucasian/eyebrows-right-extern-up.target.gz', 1.0)], None),
    ('jawOpen', [('expression/units/caucasian/mouth-open.target.gz', 1.0)], None),
    ('mouthSmileLeft', [('expression/units/caucasian/mouth-corner-puller.target.gz', 1.0)], 'L'),
    ('mouthSmileRight', [('expression/units/caucasian/mouth-corner-puller.target.gz', 1.0)], 'R'),
    ('mouthFrownLeft', [('expression/units/caucasian/mouth-depression.target.gz', 1.0)], 'L'),
    ('mouthFrownRight', [('expression/units/caucasian/mouth-depression.target.gz', 1.0)], 'R'),
    ('mouthPucker', [('expression/units/caucasian/mouth-pursing.target.gz', 1.0)], None),
    ('mouthFunnel', [('expression/units/caucasian/mouth-protusion.target.gz', 1.0)], None),
    ('mouthPressLeft', [('expression/units/caucasian/mouth-compression.target.gz', 1.0)], 'L'),
    ('mouthPressRight', [('expression/units/caucasian/mouth-compression.target.gz', 1.0)], 'R'),
    ('mouthUpperUpLeft', [('expression/units/caucasian/mouth-elevation.target.gz', 1.0)], 'L'),
    ('mouthUpperUpRight', [('expression/units/caucasian/mouth-elevation.target.gz', 1.0)], 'R'),
    ('mouthLowerDownLeft', [('expression/units/caucasian/mouth-eversion.target.gz', 1.0)], 'L'),
    ('mouthLowerDownRight', [('expression/units/caucasian/mouth-eversion.target.gz', 1.0)], 'R'),
    ('mouthStretchLeft', [('expression/units/caucasian/mouth-retraction.target.gz', 1.0)], 'L'),
    ('mouthStretchRight', [('expression/units/caucasian/mouth-retraction.target.gz', 1.0)], 'R'),
    ('mouthDimpleLeft', [('mouth/mouth-dimples-in.target.gz', 1.0)], 'L'),
    ('mouthDimpleRight', [('mouth/mouth-dimples-in.target.gz', 1.0)], 'R'),
    ('noseSneerLeft', [('expression/units/caucasian/nose-left-elevation.target.gz', 1.0)], None),
    ('noseSneerRight', [('expression/units/caucasian/nose-right-elevation.target.gz', 1.0)], None),
]


def las_target(path: Path):
    deltas = {}
    with gzip.open(path, 'rt', encoding='utf-8') as fh:
        for line in fh:
            parts = line.split()
            if len(parts) == 4 and not parts[0].startswith('#'):
                deltas[int(parts[0])] = (float(parts[1]), -float(parts[3]), float(parts[2]))
    return deltas


def bygg_en(kon: str):
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for dblock in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.actions):
        for item in list(dblock):
            if item.users == 0:
                dblock.remove(item)

    sc = bpy.context.scene
    col = coll('standarddocka')
    is_man = (kon == 'man')
    LANGD = 1.75 if is_man else D['langd_staende']
    sw_mal = 0.3660 if is_man else float(np.linalg.norm(np.array(D['axel_hoger']) - np.array(D['axel_vanster'])))
    ht_mal = float((D['axel_hoger'][2] + D['axel_vanster'][2]) / 2 - D['hoft'][2])

    # ---------------------------------------------------------------- 1. kropp + måttpassning + skelett
    macro = TargetService.get_default_macro_info_dict()
    macro.update({
        'gender': 1.0 if is_man else 0.0,
        'age': 0.5,
        'muscle': 0.55 if is_man else 0.5,
        'weight': 0.5,
        'proportions': 0.5,
        'height': 0.5,
    })
    body = HumanService.create_human(scale=0.1, macro_detail_dict=macro, feet_on_ground=True)

    def _koord():
        me = body.data; n = len(me.vertices); base = np.empty(n * 3); me.vertices.foreach_get('co', base); co = base.reshape(n, 3).copy()
        if me.shape_keys:
            ref = me.shape_keys.reference_key
            for kb in me.shape_keys.key_blocks:
                if kb == ref or kb.value == 0:
                    continue
                a = np.empty(n * 3); kb.data.foreach_get('co', a); r = np.empty(n * 3); kb.relative_key.data.foreach_get('co', r)
                co += kb.value * (a - r).reshape(n, 3)
        return co

    _grp = {g.index: g.name for g in body.vertex_groups}
    _idx = {}
    for v in body.data.vertices:
        for ge in v.groups:
            _idx.setdefault(_grp[ge.group], []).append(v.index)

    def matt():
        co = _koord(); c = lambda n: co[_idx[n]].mean(axis=0)
        kropp = co[_idx['body']] if 'body' in _idx else co
        H = kropp[:, 2].max() - kropp[:, 2].min()
        rs, re_, rh, ls = c('joint-r-shoulder'), c('joint-r-elbow'), c('joint-r-hand'), c('joint-l-shoulder')
        hip = (c('joint-r-upper-leg') + c('joint-l-upper-leg')) / 2
        return {'H': H, 'ua': np.linalg.norm(rs - re_), 'fa': np.linalg.norm(re_ - rh), 'sw': np.linalg.norm(rs - ls), 'ht': (rs + ls)[2] / 2 - hip[2]}

    tdir = Path(LocationService.get_mpfb_data('targets'))
    TGT = {
        'ua': 'arms/measure-upperarm-length',
        'fa': 'arms/measure-lowerarm-length',
        'sw': 'torso/measure-shoulder-dist',
        'ht1': 'torso/measure-napetowaist-dist',
        'ht2': 'torso/measure-waisttohip-dist',
    }
    m0 = matt(); eff = {}
    for k, t in TGT.items():
        for d in ('incr', 'decr'):
            sk = TargetService.load_target(body, str(tdir / f'{t}-{d}.target.gz'), weight=1.0, name=f'fit-{k}-{d}')
            mk = 'ht' if k.startswith('ht') else k
            eff[(k, d)] = matt()[mk] - m0[mk]; sk.value = 0.0

    mal_m = {'ua': D['over_arm'], 'fa': D['underarm'], 'sw': sw_mal, 'ht': ht_mal}
    m1 = m0; vikter = {}
    for _ in range(5):
        s_est = LANGD / float(m1['H'])
        for k in TGT:
            for d in ('incr', 'decr'):
                body.data.shape_keys.key_blocks[f'fit-{k}-{d}'].value = 0.0
        vikter = {}
        for k in ('ua', 'fa', 'sw'):
            diff = mal_m[k] / s_est - m0[k]; d = 'incr' if diff > 0 else 'decr'; e = eff[(k, d)]
            w = float(min(1.0, max(0.0, diff / e))) if abs(e) > 1e-6 else 0.0
            body.data.shape_keys.key_blocks[f'fit-{k}-{d}'].value = w; vikter[f'{TGT[k]}-{d}'] = round(w, 3)
        diff_ht = mal_m['ht'] / s_est - m0['ht']; d = 'incr' if diff_ht > 0 else 'decr'
        e1, e2 = eff[('ht1', d)], eff[('ht2', d)]
        w1 = float(min(1.0, max(0.0, (diff_ht * 0.5) / e1))) if abs(e1) > 1e-6 else 0.0
        rem = diff_ht - w1 * e1
        w2 = float(min(1.0, max(0.0, rem / e2))) if abs(e2) > 1e-6 else 0.0
        if rem > w2 * e2 and w1 < 1.0 and abs(e1) > 1e-6:
            w1 = float(min(1.0, max(0.0, (diff_ht - w2 * e2) / e1)))
        body.data.shape_keys.key_blocks[f'fit-ht1-{d}'].value = w1; vikter[f'{TGT["ht1"]}-{d}'] = round(w1, 3)
        body.data.shape_keys.key_blocks[f'fit-ht2-{d}'].value = w2; vikter[f'{TGT["ht2"]}-{d}'] = round(w2, 3)
        m1 = matt()
    print(f'PASSNING ({kon})', {k: round(float(v), 4) for k, v in m0.items()}, '->', {k: round(float(v), 4) for k, v in m1.items()}, vikter)

    rig = HumanService.add_builtin_rig(body, 'mixamo')
    TargetService.bake_targets(body)
    for o in (body, rig):
        for c in o.users_collection:
            c.objects.unlink(o)
        col.objects.link(o)
    body.name = 'docka_kropp'; rig.name = 'docka_rigg'; rig.data.name = 'docka_rigg'
    rig['standarddocka'] = True
    rig['kon'] = kon

    # Spara MakeHuman-vertexindex före MASK så både ansiktsvikter och blendshapes träffar exakt rätt
    mh_attr = body.data.attributes.new('mh_idx', 'INT', 'POINT')
    mh_attr.data.foreach_set('value', np.arange(len(body.data.vertices), dtype=np.int32))

    # Läs in ansiktsbenens vikter innan MASK (dras av från mixamorig:Head så summan = 1,0)
    rigs_dir = Path(LocationService.get_mpfb_data('rigs')) / 'standard'
    rig_def = json.loads((rigs_dir / 'rig.default.json').read_text(encoding='utf-8'))
    weights_def = json.loads((rigs_dir / 'weights.default.json').read_text(encoding='utf-8'))['weights']
    head_vg = body.vertex_groups.get('mixamorig:Head') or body.vertex_groups.get('Head')
    for fbone in ANSIKTSBEN:
        vg = body.vertex_groups.new(name=fbone)
        for vi, wval in weights_def.get(fbone, []):
            if vi >= len(body.data.vertices) or wval <= 1e-5:
                continue
            vg.add([vi], float(wval), 'REPLACE')
            if head_vg:
                try:
                    cur_hw = head_vg.weight(vi)
                except RuntimeError:
                    cur_hw = 0.0
                if cur_hw > 0.0:
                    nw = max(0.0, cur_hw - float(wval))
                    if nw > 1e-5:
                        head_vg.add([vi], nw, 'REPLACE')
                    else:
                        head_vg.remove([vi])

    # Beräkna ansiktsbenens rest-positioner i body-lokala koordinater (före MASK)
    co_pre = np.empty(len(body.data.vertices) * 3)
    body.data.vertices.foreach_get('co', co_pre)
    co_pre = co_pre.reshape(-1, 3)

    def _mpfb_pt(spec):
        if spec.get('strategy') == 'CUBE' and spec.get('cube_name') in _idx:
            return Vector(co_pre[_idx[spec['cube_name']]].mean(axis=0))
        if spec.get('strategy') == 'VERTEX' and spec.get('vertex_index') is not None:
            return Vector(co_pre[int(spec['vertex_index'])])
        dp = spec['default_position']
        return Vector((dp[0], -dp[2], dp[1])) * 0.1

    ansikts_geometri = {}
    for fbone in ANSIKTSBEN:
        info = rig_def[fbone]
        h_pt = _mpfb_pt(info['head'])
        t_pt = _mpfb_pt(info['tail'])
        if (t_pt - h_pt).length < 1e-4:
            t_pt = h_pt + Vector((0, -0.02, 0))
        ansikts_geometri[fbone] = (h_pt, t_pt)

    # Ta bort hjälpgeometri via MASK
    bpy.context.view_layer.objects.active = body
    for m in list(body.modifiers):
        if m.type == 'MASK':
            with bpy.context.temp_override(object=body, active_object=body):
                bpy.ops.object.modifier_apply(modifier=m.name)

    # ---------------------------------------------------------------- 2. namn: utan mixamorig:, neck med litet n
    for b in rig.data.bones:
        if b.name.startswith('mixamorig:'):
            b.name = b.name[len('mixamorig:'):]
    rig.data.bones['Neck'].name = 'neck'

    # ---------------------------------------------------------------- 3. skala till doll.ts STANDARD
    def head_pos(n):
        return rig.matrix_world @ rig.data.bones[n].head_local

    s = LANGD / float(m1['H'])
    bpy.ops.object.select_all(action='DESELECT')
    for o in (rig, body):
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    was_child = body.parent == rig
    if was_child:
        mwb = body.matrix_world.copy(); body.parent = None; body.matrix_world = mwb
    rig.scale = (s, s, s); body.scale = (s, s, s); body.location = body.location * s
    bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if was_child:
        body.parent = rig; body.matrix_parent_inverse = rig.matrix_world.inverted()
    for m in body.modifiers:
        if m.type == 'ARMATURE':
            m.object = rig
    ua = (head_pos('RightArm') - head_pos('RightForeArm')).length
    fa = (head_pos('RightForeArm') - head_pos('RightHand')).length
    langd = max(v.co.z for v in body.data.vertices) - min(v.co.z for v in body.data.vertices)

    # ---------------------------------------------------------------- 3b. ARKit-kompatibla Shape Keys på slutliga meshen
    n_post = len(body.data.vertices)
    mh_indices = np.empty(n_post, dtype=np.int32)
    body.data.attributes['mh_idx'].data.foreach_get('value', mh_indices)
    mh_to_post = {int(mh_i): post_i for post_i, mh_i in enumerate(mh_indices)}
    base_co = np.empty(n_post * 3)
    body.data.vertices.foreach_get('co', base_co)
    base_co = base_co.reshape(n_post, 3)

    basis_sk = body.shape_key_add(name='Basis', from_mix=False)
    rig_world_scale = 0.1 * s
    feather = 0.015  # 1,5 cm mjuk övergång över mittlinjen för L/R-munnycklar
    for ar_name, srcs, split_lr in ARKIT_KARTA:
        delta = np.zeros((n_post, 3), dtype=np.float32)
        for rel, wgt in srcs:
            tpath = tdir / rel
            if not tpath.exists():
                continue
            for mh_vi, (dx, dy, dz) in las_target(tpath).items():
                pi = mh_to_post.get(mh_vi)
                if pi is not None:
                    delta[pi, 0] += dx * rig_world_scale * wgt
                    delta[pi, 1] += dy * rig_world_scale * wgt
                    delta[pi, 2] += dz * rig_world_scale * wgt
        if split_lr == 'L':
            mask = np.clip((base_co[:, 0] + feather) / (2 * feather), 0.0, 1.0)[:, None]
            delta *= mask
        elif split_lr == 'R':
            mask = np.clip((-base_co[:, 0] + feather) / (2 * feather), 0.0, 1.0)[:, None]
            delta *= mask
        kb = body.shape_key_add(name=ar_name, from_mix=False)
        kb.value = 0.0
        kb.data.foreach_set('co', (base_co + delta).reshape(-1))
    body.data.attributes.remove(body.data.attributes['mh_idx'])

    # ---------------------------------------------------------------- 4. extra ben: headfront, ansiktsben, IK-mål och polar
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    eb = rig.data.edit_bones
    hb = eb['Head']
    hf = eb.new('headfront'); hf.head = hb.head + Vector((0, -0.10, 0.06)); hf.tail = hf.head + Vector((0, -0.04, 0)); hf.parent = hb; hf.use_deform = False

    # Ansiktsben (barn till Head, deformerande)
    for fbone in ANSIKTSBEN:
        h_pt, t_pt = ansikts_geometri[fbone]
        fb = eb.new(fbone)
        fb.head = h_pt * s
        fb.tail = t_pt * s
        fb.parent = hb
        fb.use_deform = True

    root = eb.new('rot'); root.head = (0, 0, 0); root.tail = (0, 0.25, 0); root.use_deform = False
    eb['Hips'].parent = root
    for k, side in SIDOR.items():
        suf = '.' + k
        h = eb[side + 'Hand']; ik = eb.new('IK_hand' + suf); ik.head = h.head.copy(); ik.tail = h.tail.copy(); ik.roll = h.roll; ik.parent = root; ik.use_deform = False
        e = eb[side + 'ForeArm']; out = 1 if side == 'Left' else -1
        pol = eb.new('pol_armbage' + suf); pol.head = e.head + Vector((0.35 * out, 0.30, -0.15)); pol.tail = pol.head + Vector((0, 0.05, 0)); pol.parent = root; pol.use_deform = False
        f = eb[side + 'Foot']; ikf = eb.new('IK_fot' + suf); ikf.head = f.head.copy(); ikf.tail = f.tail.copy(); ikf.roll = f.roll; ikf.parent = root; ikf.use_deform = False
        kn = eb[side + 'Leg']; pk = eb.new('pol_kna' + suf); pk.head = kn.head + Vector((0, -0.5, 0)); pk.tail = pk.head + Vector((0, -0.05, 0)); pk.parent = root; pk.use_deform = False
    bpy.ops.object.mode_set(mode='POSE')
    pbs = rig.pose.bones

    def bend_axis(pb, framat):
        b = pb.bone; m = (rig.matrix_world.to_3x3() @ b.matrix_local.to_3x3())
        ydir = m.col[1].normalized(); a = ydir.cross(framat).normalized()
        loc = m.inverted() @ a
        i = 0 if abs(loc.x) >= abs(loc.z) else 2
        return i, (1 if loc[i] > 0 else -1)

    def gangjarn(pb, framat, maxgrader):
        i, sg = bend_axis(pb, framat)
        pb.lock_ik_y = True
        for j, ax in ((0, 'x'), (2, 'z')):
            if j == i:
                setattr(pb, f'use_ik_limit_{ax}', True)
                lo, hi = (0, maxgrader) if sg > 0 else (-maxgrader, 0)
                setattr(pb, f'ik_min_{ax}', math.radians(lo)); setattr(pb, f'ik_max_{ax}', math.radians(hi))
            else:
                setattr(pb, f'lock_ik_{ax}', True)
        return i, sg

    def limit(pb, x, y, z):
        c = pb.constraints.new('LIMIT_ROTATION'); c.owner_space = 'LOCAL'; c.name = 'ledgrans'
        for ax, v in (('x', x), ('y', y), ('z', z)):
            setattr(c, f'use_limit_{ax}', True); setattr(c, f'min_{ax}', math.radians(-v)); setattr(c, f'max_{ax}', math.radians(v))

    gransinfo = {}
    for k, side in SIDOR.items():
        suf = '.' + k
        c = pbs[side + 'ForeArm'].constraints.new('IK'); c.name = 'IK'; c.target = rig; c.subtarget = 'IK_hand' + suf
        c.pole_target = rig; c.pole_subtarget = 'pol_armbage' + suf; c.chain_count = 2
        cr = pbs[side + 'Hand'].constraints.new('COPY_ROTATION'); cr.name = 'IK_rot'; cr.target = rig; cr.subtarget = 'IK_hand' + suf
        c2 = pbs[side + 'Leg'].constraints.new('IK'); c2.name = 'IK'; c2.target = rig; c2.subtarget = 'IK_fot' + suf
        c2.pole_target = rig; c2.pole_subtarget = 'pol_kna' + suf; c2.chain_count = 2
        gransinfo[side + 'ForeArm'] = gangjarn(pbs[side + 'ForeArm'], Vector((0, -1, 0)), 150)
        gransinfo[side + 'Leg'] = gangjarn(pbs[side + 'Leg'], Vector((0, 1, 0)), 150)
        for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
            for n in (1, 2, 3):
                limit(pbs[f'{side}Hand{f}{n}'], 100, 25, 100)
    for n in ('Spine', 'Spine1', 'Spine2'):
        limit(pbs[n], 30, 25, 25)
    limit(pbs['neck'], 35, 40, 30); limit(pbs['Head'], 35, 45, 30)
    limit(pbs['jaw'], 35, 5, 10)
    for ebone in ('eye.L', 'eye.R'):
        limit(pbs[ebone], 30, 5, 35)
    rig['ik_kontroller'] = 'IK_hand.R/L, pol_armbage.R/L, IK_fot.R/L, pol_kna.R/L under benet "rot"'

    for k, side in SIDOR.items():
        for leg in (side + 'ForeArm', side + 'Leg'):
            best = None
            for ang in range(-180, 180, 5):
                pbs[leg].constraints['IK'].pole_angle = math.radians(ang); bpy.context.view_layer.update()
                err = ((rig.matrix_world @ pbs[leg].matrix).translation - (rig.matrix_world @ pbs[leg].bone.matrix_local).translation).length
                if best is None or err < best[0]:
                    best = (err, ang)
            pbs[leg].constraints['IK'].pole_angle = math.radians(best[1])

    # ---------------------------------------------------------------- 5. material: neutral grå docka
    mat = pbr('docka_neutral', (0.62, 0.6, 0.58, 1), rough=0.6)
    body.data.materials.clear(); body.data.materials.append(mat)
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o not in (body,) and o.parent == rig:
            bpy.data.objects.remove(o, do_unlink=True)

    for c in [c for p in pbs for c in p.constraints if c.name in ('IK', 'IK_rot')]:
        c.influence = 0.0
    bpy.context.view_layer.update()

    # ---------------------------------------------------------------- 6. sittande vila (Action "sitt_vila")
    hoft = Vector(D['hoft'])
    rig.location = (hoft.x, hoft.y, 0.0)
    bpy.context.view_layer.update()
    for p in pbs:
        p.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    uplegs_mid = ((rig.matrix_world @ pbs['RightUpLeg'].matrix).translation + (rig.matrix_world @ pbs['LeftUpLeg'].matrix).translation) / 2
    hips = pbs['Hips']
    mw_h = rig.matrix_world @ hips.matrix
    mw_h.translation += hoft - uplegs_mid
    hips.matrix = rig.matrix_world.inverted() @ mw_h
    bpy.context.view_layer.update()
    for side in ('Right', 'Left'):
        sikta_ben(rig, pbs[side + 'UpLeg'], Vector((0, -1, -0.12))); bpy.context.view_layer.update()
        sikta_ben(rig, pbs[side + 'Leg'], Vector((0, 0.22, -1))); bpy.context.view_layer.update()
        sikta_ben(rig, pbs[side + 'Foot'], Vector((0, -1, -0.35))); bpy.context.view_layer.update()
    vh = Vector(D['vilohand_handled']); fw = Vector(D['vilohand_framat'])
    for side, sg in (('Right', 1), ('Left', -1)):
        mal = Vector((vh.x * sg if sg > 0 else -vh.x + 2 * hoft.x, vh.y, vh.z))
        sh = (rig.matrix_world @ pbs[side + 'Arm'].matrix).translation
        pol = sh + Vector((0.5 * (-1 if side == 'Right' else 1), 0.4, -0.6))
        el, ok = tvaled_ik(sh, mal, pol, ua, fa)
        sikta_ben(rig, pbs[side + 'Arm'], el - sh); bpy.context.view_layer.update()
        sikta_ben(rig, pbs[side + 'ForeArm'], mal - el); bpy.context.view_layer.update()
        f = Vector((fw.x * sg, fw.y, fw.z)); sikta_ben(rig, pbs[side + 'Hand'], f); bpy.context.view_layer.update()
    act = bpy.data.actions.new('sitt_vila'); rig.animation_data_create(); rig.animation_data.action = act
    for p in pbs:
        p.keyframe_insert('location', frame=1)
        p.keyframe_insert('rotation_quaternion' if p.rotation_mode == 'QUATERNION' else 'rotation_euler', frame=1)
    for p in pbs:
        for c in p.constraints:
            if c.name in ('IK', 'IK_rot'):
                c.keyframe_insert('influence', frame=1)
    act.use_fake_user = True

    # ---------------------------------------------------------------- 7. mått + räckvidd
    W = lambda n: (rig.matrix_world @ pbs[n].matrix).translation.copy()
    skuld = {'hoger': W('RightArm'), 'vanster': W('LeftArm')}
    mal = {
        'sko_fonsterkort': Vector(STD['sko']['fonsterkort_mitt']),
        'D.C1': Vector(STD['platser']['D.C1']['pos']),
        'P1.C1': Vector(STD['platser']['P1.C1']['pos']),
        'P7.C1': Vector(STD['platser']['P7.C1']['pos']),
    }
    lift = Vector((0, 0, STD['rackviddstest']['handled_over_kort']))
    rack = {}
    for nm, p in mal.items():
        t = p + (lift if nm != 'sko_fonsterkort' else Vector())
        rad = {}
        for sn, spos in skuld.items():
            dd = (t - spos).length
            behov = None
            for steg in range(0, 61):
                th = D['mest_lutning_rad'] * steg / 60
                ax = Vector((0, 0, 1)).cross(t - hoft); ax = ax.normalized() if ax.length > 1e-6 else Vector((1, 0, 0))
                sp = hoft + (Matrix.Rotation(th, 3, ax) @ (spos - hoft))
                if (t - sp).length <= ua + fa:
                    behov = round(math.degrees(th), 1); break
            rad[sn] = {'avstand_axel_handled_m': round(dd, 4), 'nar_utan_lutning': dd <= ua + fa, 'marginal_m': round(ua + fa - dd, 4),
                       'lutning_som_behovs_grader': behov}
        rack[nm] = rad
    rapport = {
        'kon': kon,
        'kalla': 'MPFB 2.0.18 (CC0-tillgångar) + mixamo-skelett + 16 ansiktsben + ARKit-shapekeys, bygg_docka.py',
        'mpfb_passning_vikter': vikter,
        'skalfaktor_fran_mpfb': round(s, 4), 'langd_staende_m': round(langd, 4),
        'over_arm_m': round(ua, 4), 'underarm_m': round(fa, 4), 'mal_over_arm': D['over_arm'], 'mal_underarm': D['underarm'],
        'axelbredd_led_m': round((skuld['hoger'] - skuld['vanster']).length, 4),
        'axelbredd_mal_m': round(sw_mal, 4),
        'axlar_sittande': {k: [round(c, 4) for c in v] for k, v in skuld.items()},
        'hoft_till_axel_m': round(skuld['hoger'].z - hoft.z, 4), 'hoft_till_axel_spelet_m': round(ht_mal, 4),
        'hoft_led_mitt': [round(c, 4) for c in hoft], 'rackvidd_arm_m': round(ua + fa, 4), 'rackvidd': rack,
        'ben': len(rig.data.bones), 'deformerande': sum(1 for b in rig.data.bones if b.use_deform),
        'ansiktsben': ANSIKTSBEN,
        'shapekeys': [k.name for k in body.data.shape_keys.key_blocks] if body.data.shape_keys else [],
        'kravda_ben_saknas': [n for n in KRAVDA_BEN if n not in rig.data.bones],
        'gangjarn': {k: {'lokal_axel': 'XZ'[0 if v[0] == 0 else 1], 'tecken': v[1]} for k, v in gransinfo.items()},
    }
    (slask('bygge', BYGGRAPPORTER) / f'docka-rapport-{kon}.json').write_text(json.dumps(rapport, indent=1, ensure_ascii=False), encoding='utf-8')
    print(f'RAPPORT ({kon})', json.dumps({k: rapport[k] for k in ('kon', 'langd_staende_m', 'over_arm_m', 'underarm_m', 'axelbredd_led_m', 'hoft_till_axel_m', 'ben', 'deformerande', 'kravda_ben_saknas')}, ensure_ascii=False))

    bpy.ops.object.mode_set(mode='OBJECT')
    for p in pbs:
        p.custom_shape = None
    for o in list(bpy.data.objects):
        if o not in (body, rig):
            bpy.data.objects.remove(o, do_unlink=True)
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    blend_kon = OUT / f'standarddocka_{kon}.blend'
    glb_kon = OUT / f'standarddocka_{kon}.glb'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_kon))
    bpy.ops.export_scene.gltf(filepath=str(glb_kon), export_format='GLB', export_apply=True, export_animations=True,
                              export_yup=True, use_selection=False)
    for f in OUT.glob('*.blend1'):
        os.remove(f)
    print('BYGGT', blend_kon)


ap = argparse.ArgumentParser()
ap.add_argument('--kon', choices=['kvinna', 'man', 'bada'], default='bada')
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
for kon in (['kvinna', 'man'] if args.kon == 'bada' else [args.kon]):
    bygg_en(kon)
