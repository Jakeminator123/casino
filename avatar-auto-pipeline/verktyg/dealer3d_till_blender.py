"""Brygga dealer3d -> Blender: läser en rörelse-JSON ur blackjack-dealer/dealer3d (ledpunkter i meter per bildruta,
filmlinsens värld) och lägger den på standarddockans rigg som en Blender Action.

Kör:
  blender -b assets/docka/standarddocka.blend --python-exit-code 1 --python verktyg/dealer3d_till_blender.py -- \
      --in <rörelse.json> [--namn ACTIONNAMN] [--spara NAMN.blend] [--naturlig-hand]
Utan --spara hamnar scenen i slaskens rorelser/ (casino/slask/avatar-auto-pipeline/rorelser/NAMN.blend).

Förbättrad retargeting (dockans egna benlängder behålls):
  * höft (hip)     -> dockan placeras på källans höftavstånd (t.ex. Paows 0,38 m bakom kant) så bål/axlar/armbågar stämmer
  * bål (s)        -> Spine/Spine1/Spine2 riktas direkt mot källans axelmitt och axellinje (lutning + vridning + rull)
  * huvud (h, g)   -> neck/Head följer källans huvudposition och blickriktning
  * handled (w)    -> IK-mål, absolut läge på bordet
  * armbåge (e)    -> direkt poltarget från dealer3d (med liten axelkompensation och bål/filt-rensning)
  * underarm       -> ~55 % av handledens vridning (pronation/supination) fördelas mjukt längs ForeArm
  * hand (p, 21p)  -> handram med korrekt tecken (R=+1, L=-1); med --naturlig-hand vrids nedsläppet så handflatan
                      pekar nedåt och kortet hålls naturligt mellan tumme och fingrar istället för pekfinger rakt ned.
"""
import argparse, json, math, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / 'scen'))
import bpy  # noqa: E402
from mathutils import Vector, Matrix, Quaternion  # noqa: E402
from gemensamt import standard as S  # noqa: E402
from gemensamt.riggverktyg import Ram, hand_axlar, sikta_ben, tvaled_ik, satt_rotation_varld, FINGRAR, SIDOR  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--in', dest='inp', required=True)
ap.add_argument('--namn', default=None)
ap.add_argument('--spara', default=None)
ap.add_argument('--behall-hoft', action='store_true', help='behåll dockans egen höftposition i stället för att matcha källans hip')
ap.add_argument('--naturlig-hand', action='store_true', help='jämna ut vertikalt pekfinger-nedsläpp till naturlig handflata-nedåt-pose')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:])
STD = S.load(); ram = Ram(STD); FZ = STD['filt_z']
data = json.loads(Path(a.inp).read_text(encoding='utf-8'))
namn = a.namn or Path(a.inp).stem
frames = data['frames']; fps = int(data.get('fps', 30)); N = len(frames)
sc = bpy.context.scene; sc.render.fps = fps
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o.get('standarddocka'))
pbs = rig.pose.bones; MW = rig.matrix_world
body = next((o for o in bpy.data.objects if o.type == 'MESH' and o.parent == rig), None)
up = bpy.context.view_layer.update

# grundpose = sitt_vila
rig.animation_data_create(); rig.animation_data.action = bpy.data.actions['sitt_vila']
if rig.animation_data.action.slots:
    rig.animation_data.action_slot = rig.animation_data.action.slots[0]
sc.frame_set(1); up()
bas = {p.name: p.matrix_basis.copy() for p in pbs}
rig.animation_data.action = None
for p in pbs:
    for c in p.constraints:
        if c.name in ('IK', 'IK_rot'):
            c.influence = 0.0
if body:
    for m in body.modifiers:
        if m.type == 'ARMATURE':
            m.show_viewport = False
L = lambda v: ram.till_std(v)
W = lambda n: (MW @ pbs[n].matrix).translation.copy()
T_w = lambda n: (MW @ pbs[n].tail).copy()
ua = (W('RightArm') - W('RightForeArm')).length; fa = (W('RightForeArm') - W('RightHand')).length
bas_hip = (W('RightUpLeg') + W('LeftUpLeg')) / 2


def hand_ram_docka(side):
    sg = 1.0 if side == 'Right' else -1.0
    return hand_axlar(W(side + 'Hand'), W(side + 'HandIndex1'), W(side + 'HandMiddle1'), W(side + 'HandPinky1'), sign=sg)


def rotera_kring_huvud(pb, q):
    cur = MW @ pb.matrix; h = cur.translation.copy()
    ny = Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h) @ cur
    pb.matrix = MW.inverted() @ ny


def swing_twist_around(q_diff: Quaternion, axis: Vector) -> Quaternion:
    ax = axis.normalized()
    v = Vector((q_diff.x, q_diff.y, q_diff.z))
    proj = ax * v.dot(ax)
    qt = Quaternion((q_diff.w, proj.x, proj.y, proj.z))
    if qt.magnitude < 1e-6:
        return Quaternion()
    return qt.normalized()


def naturlig_nedslapp_hand(P_orig, w_pos, card_ctr, card_n, weight):
    """Vrider handen mjukt mot handflata-nedåt med naturligt böjda fingrar och kortet mellan tumme/pekfinger."""
    if weight <= 1e-4:
        return P_orig, w_pos
    A0 = hand_axlar(P_orig[0], P_orig[5], P_orig[9], P_orig[17], sign=1.0)
    # Riktning från handled mot kortets mitt i horisontalplanet
    fwd_tgt = Vector((card_ctr.x - w_pos.x, card_ctr.y - w_pos.y, -0.18))
    if fwd_tgt.length < 1e-4:
        fwd_tgt = Vector((0.0, -1.0, -0.2))
    fwd_tgt.normalize()
    # Handflata nedåt (lätt vinklad mot kortets normal)
    palm_tgt = (-Vector((0.0, 0.0, 1.0)) - card_n * 0.25).normalized()
    palm_tgt = (palm_tgt - fwd_tgt * palm_tgt.dot(fwd_tgt)).normalized()
    across_tgt = palm_tgt.cross(fwd_tgt).normalized()
    A_nat = Matrix((fwd_tgt, palm_tgt, across_tgt)).transposed()
    q_rot = (A_nat @ A0.inverted()).to_quaternion()
    q_blend = Quaternion().slerp(q_rot, weight)
    # Lyft handleden något (upp till +2.5 cm) när handen läggs platt så handflatan går fri ovanför filten
    w_ny = w_pos + Vector((0.0, 0.0, 0.024 * weight))
    P_ny = [w_ny + q_blend @ (pt - P_orig[0]) for pt in P_orig]
    # Räta upp extremt nedåtböjt pekfinger/långfinger en smula i lokala handramen så det ser avslappnat ut
    A_cur = hand_axlar(P_ny[0], P_ny[5], P_ny[9], P_ny[17], sign=1.0)
    for fname, idx in FINGRAR:
        if fname == 'Thumb':
            # Tummen under/mot kanten av kortet
            continue
        # Kontrollera om fingret spretar rakt ned relativt handflatan: böj mjukt framåt längs A_cur.col[0] + lätt nedåt
        knuckle = P_ny[idx[0]]
        dir_cur = (P_ny[idx[3]] - knuckle)
        l_tot = sum((P_ny[idx[j]] - P_ny[idx[j - 1]]).length for j in (1, 2, 3))
        if dir_cur.length > 1e-5 and l_tot > 1e-5:
            # Naturlig mjuk båge framåt-nedåt från knogen
            curl_dir = (A_cur.col[0] * 0.85 + A_cur.col[1] * 0.50).normalized()
            segs = [(P_ny[idx[j]] - P_ny[idx[j - 1]]).length for j in (1, 2, 3)]
            for j in (1, 2, 3):
                d_j = (P_ny[idx[j]] - P_ny[idx[j - 1]]).normalized()
                # Stegvis mjukare kurva ut mot spetsen
                d_nat = (A_cur.col[0] * (1.0 - 0.18 * j) + A_cur.col[1] * (0.20 * j)).normalized()
                d_mix = d_j.lerp(d_nat, 0.65 * weight).normalized()
                P_ny[idx[j]] = P_ny[idx[j - 1]] + d_mix * segs[j - 1]
    return P_ny, w_ny


# hand-offset: dockans handben i förhållande till handramen (konstant)
for p in pbs:
    p.matrix_basis = bas[p.name]
up()
OFF = {}
for side in ('Right', 'Left'):
    A = hand_ram_docka(side); Mh = (MW @ pbs[side + 'Hand'].matrix).to_3x3().normalized()
    OFF[side] = A.inverted() @ Mh

f0 = frames[0]
hipP = L(data['hip']) if ('hip' in data and not a.behall_hoft) else bas_hip

act = bpy.data.actions.new(namn); act.use_fake_user = True
rig.animation_data.action = act
meta = {k: v for k, v in data.items() if k != 'frames'}
act['dealer3d_kalla'] = str(Path(a.inp).name); act['dealer3d_meta'] = json.dumps(meta, ensure_ascii=False)[:60000]
kort = None
if any('card' in f for f in frames):
    me = bpy.data.meshes.get('kort_i_hand_mesh')
    if not me:
        me = bpy.data.meshes.new('kort_i_hand_mesh'); K = STD['kort']; w, l = K['bredd'] / 2, K['langd'] / 2
        me.from_pydata([(-w, -l, 0), (w, -l, 0), (w, l, 0), (-w, l, 0)], [], [(0, 1, 2, 3)])
        mt = bpy.data.materials.new('kort_i_hand'); mt.diffuse_color = (0.95, 0.95, 0.95, 1); me.materials.append(mt)
    kc = bpy.data.collections.get('dealer3d_kort') or bpy.data.collections.new('dealer3d_kort')
    if kc.name not in sc.collection.children:
        sc.collection.children.link(kc)
    kort = bpy.data.objects.new('kort_i_hand', me); kc.objects.link(kort); kort.rotation_mode = 'QUATERNION'
    kort.animation_data_create()

ej_nadda = 0
for i, f in enumerate(frames):
    fr = i + 1
    for p in pbs:
        p.matrix_basis = bas[p.name]
    up()

    # --- 1. Höftposition: flytta Hips till hipP (t.ex. Paow Y=+0,38 m, Z=0,672 m)
    hips_pb = pbs['Hips']
    cur_hip = (W('RightUpLeg') + W('LeftUpLeg')) / 2
    mw_h = MW @ hips_pb.matrix
    mw_h.translation += (hipP - cur_hip)
    hips_pb.matrix = MW.inverted() @ mw_h
    up()

    # --- 2. Bål: sikta axelmitt + axellinje direkt mot källans axlar (2 pass för exakt träff)
    shR_tgt = L(f['R']['s']); shL_tgt = L(f['L']['s'])
    mid_tgt = (shR_tgt + shL_tgt) / 2
    line_tgt = shL_tgt - shR_tgt
    for _ in range(2):
        mid_cur = (W('RightArm') + W('LeftArm')) / 2
        line_cur = W('LeftArm') - W('RightArm')
        q_lut = (mid_cur - hipP).rotation_difference(mid_tgt - hipP)
        lc_xy = Vector((line_cur.x, line_cur.y, 0.0))
        lt_xy = Vector((line_tgt.x, line_tgt.y, 0.0))
        q_vr = lc_xy.rotation_difference(lt_xy) if lc_xy.length > 1e-6 and lt_xy.length > 1e-6 else Quaternion()
        q = q_vr @ q_lut
        if q.angle > 1e-5:
            del3 = Quaternion(q.axis, q.angle / 3)
            for n in ('Spine', 'Spine1', 'Spine2'):
                rotera_kring_huvud(pbs[n], del3); up()

    # --- 3. Huvud + blick (h och g)
    mid_cur = (W('RightArm') + W('LeftArm')) / 2
    hc_cur = (W('Head') + T_w('Head')) / 2
    hr_cur = hc_cur - mid_cur
    hr_tgt = L(f['h']) - mid_tgt
    if hr_cur.length > 1e-5 and hr_tgt.length > 1e-5:
        qh = hr_cur.rotation_difference(hr_tgt)
        if qh.angle > 1e-5:
            half = Quaternion(qh.axis, min(qh.angle, 0.8) / 2)
            rotera_kring_huvud(pbs['neck'], half); up(); rotera_kring_huvud(pbs['Head'], half); up()
    if 'g' in f and 'headfront' in pbs:
        g_tgt = L(f['g']) - ((W('Head') + T_w('Head')) / 2)
        fw_cur = (T_w('headfront') - W('headfront'))
        if g_tgt.length > 1e-5 and fw_cur.length > 1e-5:
            qg = fw_cur.normalized().rotation_difference(g_tgt.normalized())
            if qg.angle > 1e-5:
                # måttlig blickvridning på Head
                rotera_kring_huvud(pbs['Head'], Quaternion(qg.axis, min(qg.angle * 0.45, 0.45))); up()

    # --- 4. Armar + armbåge + underarmstvist + händer + fingrar
    card_ctr = L(f['card']['c']) if 'card' in f else None
    card_n = Vector((f['card']['n'][0], -f['card']['n'][2], f['card']['n'][1])).normalized() if 'card' in f else Vector((0, 0, 1))

    for k, side in SIDOR.items():
        arm = f[k]; sh = W(side + 'Arm')
        mal = L(arm['w'])
        P = [L(q_) for q_ in arm['p']]
        sg = 1.0 if side == 'Right' else -1.0

        # Om --naturlig-hand: gör nedsläppet av högerhand på platt kort naturligare
        if a.naturlig_hand and side == 'Right' and card_ctr is not None:
            # Vikta in när indexfingret pekar brant nedåt och kortet vänder uppåt (card_n.z > 0.35)
            idx_dir = (P[8] - P[5]).normalized() if (P[8] - P[5]).length > 1e-5 else Vector((0, 0, -1))
            vert_down = max(0.0, -idx_dir.z)  # 1.0 när pekfingret pekar rakt ned
            card_flat = max(0.0, min(1.0, (card_n.z - 0.35) / 0.50))
            w_nat = min(1.0, vert_down * card_flat * 1.25)
            P, mal = naturlig_nedslapp_hand(P, mal, card_ctr, card_n, w_nat)

        pol = L(arm['e']) + (sh - L(arm['s'])) * 0.35
        # Håll armbågen utanför bålen och över filten
        if side == 'Right' and pol.x > sh.x + 0.04 and (mal.x - sh.x) > 0.08:
            pol.x = min(pol.x, sh.x + 0.04)
        pol.z = max(pol.z, FZ + 0.03)

        el, ok = tvaled_ik(sh, mal, pol, ua, fa); ej_nadda += (not ok)
        sikta_ben(rig, pbs[side + 'Arm'], el - sh); up()
        hand_w = W(side + 'ForeArm')
        sikta_ben(rig, pbs[side + 'ForeArm'], mal - hand_w); up()

        A = hand_axlar(P[0], P[5], P[9], P[17], sign=sg)
        M_hand_tgt = A @ OFF[side]

        # Fördela 55 % av handledens axiella vridning (pronation/supination) längs underarmen
        M_hand_cur = (MW @ pbs[side + 'Hand'].matrix).to_3x3().normalized()
        q_diff = (M_hand_tgt @ M_hand_cur.inverted()).to_quaternion()
        fa_axis = (mal - hand_w).normalized()
        q_tw = swing_twist_around(q_diff, fa_axis)
        if q_tw.angle > 1e-4:
            rotera_kring_huvud(pbs[side + 'ForeArm'], Quaternion(q_tw.axis, q_tw.angle * 0.55)); up()

        satt_rotation_varld(rig, pbs[side + 'Hand'], M_hand_tgt); up()
        for fname, idx in FINGRAR:
            for n in (1, 2, 3):
                d = P[idx[n]] - P[idx[n - 1]]
                if d.length > 1e-6:
                    sikta_ben(rig, pbs[f'{side}Hand{fname}{n}'], d); up()

    for p in pbs:
        p.keyframe_insert('rotation_quaternion' if p.rotation_mode == 'QUATERNION' else 'rotation_euler', frame=fr)
        if p.name == 'Hips':
            p.keyframe_insert('location', frame=fr)
    if kort and 'card' in f:
        c = f['card']; ctr = L(c['c']); ll = Vector((c['l'][0], -c['l'][2], c['l'][1])).normalized(); nn = Vector((c['n'][0], -c['n'][2], c['n'][1])).normalized()
        xx = ll.cross(nn).normalized(); nn = xx.cross(ll).normalized()
        kort.location = ctr; kort.rotation_quaternion = Matrix((xx, ll, nn)).transposed().to_quaternion()
        kort.keyframe_insert('location', frame=fr); kort.keyframe_insert('rotation_quaternion', frame=fr)

for p in pbs:
    for c in p.constraints:
        if c.name in ('IK', 'IK_rot'):
            c.influence = 0.0; c.keyframe_insert('influence', frame=1)
sc.frame_start, sc.frame_end = 1, N
if body:
    for m in body.modifiers:
        if m.type == 'ARMATURE':
            m.show_viewport = True
from gemensamt.sokvagar import slask  # noqa: E402
ut = Path(a.spara) if a.spara else slask('rorelser', 'Rörelser från dealer3d lagda på standarddockan av verktyg/dealer3d_till_blender.py: prov, görs om med samma kommando.') / f'{namn}.blend'
ut.parent.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ut), copy=False)
print('ACTION', namn, 'bildrutor', N, 'fps', fps, 'handled utom räckhåll (bildrutor x händer):', ej_nadda, '->', ut)
