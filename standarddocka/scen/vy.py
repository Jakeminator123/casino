"""Standarddockans arbetsvy i Blender: mannen i vilan (A1) vid bordet, med stolen under sig, båda händerna platt på
filten och blicken mot kameran, renderad genom spelets kamera (film), en lägre kamera från samma håll (lag) och från
flera håll till.

Kör från standarddocka/ (Blender 5.3, utan fönster):
  blender -b --factory-startup --python-exit-code 1 --python scen/vy.py
  blender -b --factory-startup --python-exit-code 1 --python scen/vy.py -- --vyer film sida --skala 0.5
Ut i ../slask/standarddocka/vy/: vy_<vy>.png (film, lag, hel, sida, arm_nara, bak, nara), vy_matt.json (ledernas
lägen och kontrollerna: händerna mot filten, armarna och låren mot bordet, magen mot kanten, det som går igenom bordet
eller stolen) och vy.blend (scenen att öppna i Blender; IK-kontrollerna är påslagna, så händerna kan dras).
Spelets egna bildpunkter för kort och sko över filmbilden (vanlig Python, från ../avatar-auto-pipeline):
  .venv/Scripts/python.exe verktyg/qc_kontroll_film.py ../slask/standarddocka/vy/vy_film.png ../slask/standarddocka/vy/vy_film_kontroll.png

Bordet är standardbordet med dealerkanten KANT_BAK närmare dealern (../avatar-auto-pipeline/scen/bygg_bord.py
--kant-bak). Skriptet bygger det själv om det saknas, är äldre än byggskriptet eller måtten, eller har en annan kant.
Allt mått kommer ur ../avatar-auto-pipeline/scen/standard.yaml; ställningen och blicken är talen och stegen nedan.
Koordinater som i standard.yaml: meter, +X dealerns vänster, +Y bakåt mot dealern, Z upp, filten vid Z = 0,95,
origo på golvet under standardbordets dealerkant (den flyttade kanten ligger vid Y = +KANT_BAK).
"""
import argparse, json, math, subprocess, sys
from pathlib import Path

HAR = Path(__file__).resolve().parent
PROJEKT = HAR.parent
AVATAR = PROJEKT.parent / 'avatar-auto-pipeline'
UT = PROJEKT.parent / 'slask' / 'standarddocka' / 'vy'
for p in (AVATAR / 'scen', AVATAR):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))
from _bpy_hjalp import *  # noqa: F401,F403  (bpy, bmesh, Vector, Matrix, STD, coll, pbr, look_at, make_cameras)
from mathutils import Quaternion
from mathutils.bvhtree import BVHTree
from gemensamt.riggverktyg import hand_axlar, sikta_ben, SIDOR
from gemensamt.blenderstudio import configure_render_device

FZ = STD['filt_z']
D = STD['docka']

# ================================================================ scenen
KANT_BAK = 0.15                       # dealerkanten så här mycket närmare dealern (m); Jakob 2026-11-26
DOCKA = AVATAR / 'assets' / 'docka' / 'standarddocka_man.blend'
STOL = AVATAR / 'assets' / 'stol' / 'dealerstol.blend'
BORD = AVATAR / 'assets' / 'bord' / 'standardbord_nara.blend'

# ================================================================ ställningen (tal i scenens koordinater)
# Vilan, A1: han sitter rak och lugn med båda händerna platt på filten framför brickan, symmetriskt, som en dealer
# som väntar. Det är startläget för alla rörelser.
# 1. Höften: Paows uppmätta höjd, 0,278 m under filten, så att låren går fria under sargen (0,16 m under filten).
HOFT_UNDER_FILT = STD['docka_paow']['hoft_under_filt']
HOFT_X = D['hoft'][0]                 # dockans mitt i sidled, som i spelet
# 2. Bålen lutar knappt fram; axellederna hamnar så här långt bakom standardbordets kant (som i dag).
BAL_FRAMAT_GRADER = 2.0               # fördelas lika på Spine, Spine1 och Spine2
AXLAR_Y = D['axlar_bakom_kant']       # 0,38
# 3. Stolen: sitsen sänks lika mycket som höften, så att höftleden ligger lika högt över sitsen som förut
#    (standard.yaml: höft 0,75 och sits 0,66). En lägre stol: benen och fotringen under sitsen kortas i samma mån.
STOL_LYFT_ZON = (0.0, 0.50)           # Z där stolen trycks ihop (golvet till sitsens underkant); allt över sänks
# 4. Benen (IK_fot, pol_kna): fotlederna ovanför stolens fotring mellan stolens framben, knäna fram under bordet,
#    fötterna lite nedåt.
FOTLED = {'R': (-0.085, 0.30, 0.25), 'L': (0.055, 0.30, 0.25)}
KNA_POL = {'R': (-0.12, -0.45, 0.60), 'L': (0.09, -0.45, 0.60)}
FOT_RIKTNING = (0.0, -1.0, -0.35)     # framåt och lite ned
# 5. Händerna (IK_hand, pol_armbage): handlederna symmetriskt kring kroppens mitt, HAND_ISAR från mitten (Paows
#    vilande händer ligger vid X -0,16 och +0,14), strax framför brickans främre mässingslist (Y +0,014 med bordets
#    remsa på 3 cm); handflatorna platt ned, fingrarna fram och lite inåt. Höjden justeras sedan så att handens lägsta
#    punkt ligger HAND_OVER_FILT över filten.
HAND_ISAR = 0.15
HANDLED_Y = -0.005
HANDLED = {'R': (HOFT_X - HAND_ISAR, HANDLED_Y, 0.975), 'L': (HOFT_X + HAND_ISAR, HANDLED_Y, 0.975)}
FINGRAR_INAT_GRADER = 12.0            # handen (handled -> knogar) vriden inåt mot mitten
HAND_NED_GRADER = 3.0                 # handryggen lutar knappt ned mot knogarna
FINGER_NED_GRADER = (2.0, 5.0, 9.0)   # fingrarnas tre leder lutar så här mycket ned från vågrätt: platt, avslappnad
FINGRAR_IHOP = 0.7                    # fingrarnas spretning i vila (MPFB) minskas med 70 %
TUMME_INAT_GRADER = 35.0              # tummen pekar fram och så här mycket inåt från handens riktning
TUMME_NED_GRADER = (12.0, 6.0, 6.0)
HAND_OVER_FILT = 0.002
# 6. Armbågarna hänger: planet genom axel, armbåge och handled vrids ARMBAGE_UTAT_GRADER utåt från rakt ned, och
#    sedan 2 grader i taget till (högst 60) tills armen inte går igenom någon del av bordet (skiva, kant, mässingslist,
#    rulle, bricka) och ligger minst ARM_LUFT från den: underarmen vilar över kanten utan att gå igenom.
ARMBAGE_UTAT_GRADER = 20.0
ARM_LUFT = 0.003
# 7. Blicken: huvudet (neck och Head) vänds så att ansiktet ser mot kameran, nacken tar NACKE_ANDEL av vridningen
#    och Head resten; ögonen (eye.L, eye.R) riktas mot kameran. Mot filmens kamera i alla bilder utom 'lag', där han
#    ser mot den lägre kameran (och i vy.blend mot filmens).
NACKE_ANDEL = 0.4

# ================================================================ vyerna
# film och hel är standard.yaml:s kameror; de övriga: (läge, mål, brännvidd mm, ortografisk bredd m eller None)
LINS_MM = STD['lins']['brannvidd_mm']
EGNA_VYER = {
    # spelarens håll som film (samma lins, samma avstånd), men lägre: 10 grader ned i stället för 25, mot bröstet
    'lag': ((0.0, STD['kameror']['film']['pos'][1], 1.53), (0.0, 0.30, 1.15), LINS_MM, None),
    'sida': ((-3.0, 0.05, 1.20), (0.0, 0.05, 0.80), None, 2.5),         # från dealerns höger, golv till huvud
    'arm_nara': ((-0.80, 0.62, 1.07), (-0.22, 0.12, 0.965), 50.0, None), # högerarmen över dealerkanten, bakifrån
    'bak': ((-1.35, 2.05, 1.80), (0.0, 0.12, 0.98), 35.0, None),        # snett bakifrån, över hans högra axel
    'nara': ((0.0, -0.78, 1.38), (-0.01, 0.04, 0.98), 50.0, None),      # händerna, brickan och kanten framifrån
}
BLICK_MOT_EGEN_KAMERA = ('film', 'lag')
ALLA_VYER = ['film', 'lag', 'hel', 'sida', 'arm_nara', 'bak', 'nara']

ap = argparse.ArgumentParser()
ap.add_argument('--vyer', nargs='+', default=ALLA_VYER, choices=ALLA_VYER)
ap.add_argument('--skala', type=float, default=1.0, help='upplösningsskala (1 = spelets 1764 x 1174)')
ap.add_argument('--motor', default='EEVEE', choices=['EEVEE', 'CYCLES'])
ap.add_argument('--utan-bilder', action='store_true', help='bara ställningen, mätningen och vy.blend')
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
upd = lambda: bpy.context.view_layer.update()


# ================================================================ 1. bordet, dockan och stolen
def bygg_bordet():
    print('VY bygger bordet med --kant-bak', KANT_BAK)
    subprocess.run([bpy.app.binary_path, '-b', '--factory-startup', '--python-exit-code', '1', '--python',
                    str(AVATAR / 'scen' / 'bygg_bord.py'), '--', '--kant-bak', str(KANT_BAK)],
                   cwd=str(AVATAR), stdin=subprocess.DEVNULL, check=True, timeout=900)


kallor = [AVATAR / 'scen' / 'bygg_bord.py', AVATAR / 'scen' / 'standard.yaml']
if not BORD.exists() or BORD.stat().st_mtime < max(k.stat().st_mtime for k in kallor):
    bygg_bordet()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.open_mainfile(filepath=str(BORD))
if abs(bpy.data.objects['ORIGO_golv_under_dealerkant'].get('kant_bak', -1.0) - KANT_BAK) > 1e-6:
    bygg_bordet()
    bpy.ops.wm.open_mainfile(filepath=str(BORD))
sc = bpy.context.scene
KANT_Y = KANT_BAK


def lagg_till(fil, namn=None):
    with bpy.data.libraries.load(str(fil), link=False) as (src, dst):
        dst.collections = [c for c in src.collections if namn is None or c == namn]
    for c in dst.collections:
        sc.collection.children.link(c)
    return dst.collections


lagg_till(DOCKA, 'standarddocka')
lagg_till(STOL)
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o.get('standarddocka'))
kropp = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent == rig)
stol = bpy.data.objects['dealerstol']
pbs = rig.pose.bones
MW = rig.matrix_world

HOFT_Z = FZ - HOFT_UNDER_FILT
STOL_SANK = D['hoft'][2] - HOFT_Z     # lika mycket som höften sänks från standard.yaml:s sittande docka
lo, hi = STOL_LYFT_ZON
mi = stol.matrix_world; mi_inv = mi.inverted()
for v in stol.data.vertices:
    p = mi @ v.co
    if p.z >= hi:
        p.z -= STOL_SANK
    elif p.z > lo:
        p.z = lo + (p.z - lo) * (hi - STOL_SANK - lo) / (hi - lo)
    v.co = mi_inv @ p
stol.data.update()


# ================================================================ 2. ställningen
def W(n):
    return (MW @ pbs[n].matrix).translation.copy()


def vrid_varld(pb, q):
    """Vrider benet kring sitt huvud med världsrotationen q."""
    cur = MW @ pb.matrix; h = cur.translation.copy()
    pb.matrix = MW.inverted() @ (Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h) @ cur)
    upd()


def flytta_hoften(mal):
    mitt = (W('RightUpLeg') + W('LeftUpLeg')) / 2
    hips = pbs['Hips']; m = MW @ hips.matrix
    m.translation += Vector(mal) - mitt
    hips.matrix = MW.inverted() @ m
    upd()


def satt_kontroll(namn, pos, rot3=None):
    """Sätter en IK-kontroll (barn till rot) i världen: läge och, om given, rotation."""
    pb = pbs[namn]
    m = Matrix.Translation(Vector(pos)) @ (rot3.to_4x4() if rot3 is not None else (MW @ pb.bone.matrix_local).to_3x3().normalized().to_4x4())
    pb.matrix = MW.inverted() @ m


def handram_vila(sida):
    """Handens ram (framåt, handflata, tvärs) i vila, ur fingrarnas rotleder som i dealer3d (hand_axlar)."""
    s = SIDOR[sida]; b = rig.data.bones
    p = {k: MW @ b[s + n].head_local for k, n in ((0, 'Hand'), (5, 'HandIndex1'), (9, 'HandMiddle1'), (17, 'HandPinky1'))}
    return hand_axlar(p[0], p[5], p[9], p[17], 1.0 if sida == 'R' else -1.0)


def handram_nu(sida):
    s = SIDOR[sida]
    return hand_axlar(W(s + 'Hand'), W(s + 'HandIndex1'), W(s + 'HandMiddle1'), W(s + 'HandPinky1'), 1.0 if sida == 'R' else -1.0)


def handens_mal_rotation(sida):
    """Handens världsrotation: handflatan ned, fingrarna fram (-Y), FINGRAR_INAT_GRADER inåt och HAND_NED_GRADER ned."""
    inat = math.radians(FINGRAR_INAT_GRADER) * (1 if sida == 'R' else -1)   # inåt = mot X = 0
    ned = math.radians(HAND_NED_GRADER)
    fwd = Vector((math.sin(inat), -math.cos(inat), 0.0)) * math.cos(ned) + Vector((0, 0, -math.sin(ned)))
    fwd.normalize()
    palm = Vector((0, 0, -1)); palm = (palm - fwd * palm.dot(fwd)).normalized()
    F_t = Matrix((fwd, palm, palm.cross(fwd))).transposed()
    F_r = handram_vila(sida)
    vila = (MW @ rig.data.bones[SIDOR[sida] + 'Hand'].matrix_local).to_3x3().normalized()
    return F_t @ F_r.transposed() @ vila


def armbagens_pol(sida, handled, utat_grader):
    """Polen för armbågen: rakt ned från linjen axel-handled, vriden utat_grader utåt kring linjen."""
    S = W(SIDOR[sida] + 'Arm'); ax = (Vector(handled) - S).normalized()
    ned = Vector((0, 0, -1)); ned = (ned - ax * ned.dot(ax)).normalized()
    ut = Vector((-1 if sida == 'R' else 1, 0, 0))
    v = math.radians(utat_grader)
    kand = [Quaternion(ax, sg * v) @ ned for sg in (1, -1)]
    riktning = max(kand, key=lambda k: k.dot(ut))
    return (S + Vector(handled)) / 2 + riktning * 0.45


# 2.0 vila, ingen Action, IK på för armar och ben
if rig.animation_data:
    rig.animation_data.action = None
for pb in pbs:
    pb.matrix_basis = Matrix.Identity(4)
for sida, s in SIDOR.items():
    pbs[s + 'ForeArm'].constraints['IK'].influence = 1.0
    pbs[s + 'Hand'].constraints['IK_rot'].influence = 1.0
    pbs[s + 'Leg'].constraints['IK'].influence = 1.0
upd()
# 2.1 höften på plats, 2.2 bålen fram, 2.3 höften i Y så att axlarna hamnar vid AXLAR_Y
flytta_hoften((HOFT_X, AXLAR_Y, HOFT_Z))
for n in ('Spine', 'Spine1', 'Spine2'):
    vrid_varld(pbs[n], Quaternion((1, 0, 0), math.radians(BAL_FRAMAT_GRADER / 3)))
for _ in range(2):
    axlar_y = (W('RightArm').y + W('LeftArm').y) / 2
    hoft = (W('RightUpLeg') + W('LeftUpLeg')) / 2
    flytta_hoften((HOFT_X, hoft.y + AXLAR_Y - axlar_y, HOFT_Z))
# 2.4 benen
for sida, s in SIDOR.items():
    satt_kontroll('IK_fot.' + sida, FOTLED[sida])
    satt_kontroll('pol_kna.' + sida, KNA_POL[sida])
upd()
for sida, s in SIDOR.items():
    sikta_ben(rig, pbs[s + 'Foot'], Vector(FOT_RIKTNING)); upd()
# 2.5 händerna och armbågarna
handled = {k: Vector(v) for k, v in HANDLED.items()}
handrot = {sida: handens_mal_rotation(sida) for sida in SIDOR}
utat = {sida: ARMBAGE_UTAT_GRADER for sida in SIDOR}
for sida in SIDOR:
    satt_kontroll('IK_hand.' + sida, handled[sida], handrot[sida])
    satt_kontroll('pol_armbage.' + sida, armbagens_pol(sida, handled[sida], utat[sida]))
upd()
# 2.6 fingrarna: varje led riktas i världen, fram i fingrets egen riktning (spretningen minskad) och lite ned
def rikta_finger(s, f, kurs, ned_grader):
    for led, ned in zip((1, 2, 3), ned_grader):
        n = math.radians(ned)
        sikta_ben(rig, pbs[f'{s}Hand{f}{led}'], kurs * math.cos(n) + Vector((0, 0, -math.sin(n))))
        upd()


for sida, s in SIDOR.items():
    fram = handram_nu(sida).col[0]; fram = Vector((fram.x, fram.y, 0)).normalized()
    for f in ('Index', 'Middle', 'Ring', 'Pinky'):
        d = (MW @ pbs[f'{s}Hand{f}1'].matrix).to_3x3().col[1]
        kurs = Vector((d.x, d.y, 0)).normalized().lerp(fram, FINGRAR_IHOP).normalized()
        rikta_finger(s, f, kurs, FINGER_NED_GRADER)
    inat = math.radians(TUMME_INAT_GRADER) * (1 if sida == 'R' else -1)
    rikta_finger(s, 'Thumb', Quaternion((0, 0, 1), inat) @ fram, TUMME_NED_GRADER)


# 2.7 handen ned (eller upp) tills dess lägsta punkt ligger HAND_OVER_FILT över filten
def dominerande_ben():
    """Det deformerande ben som väger tyngst i varje hörn (MPFB:s hjälpgrupper som Left/Right/Mid räknas inte)."""
    deform = {b.name for b in rig.data.bones if b.use_deform}
    namn = {g.index: g.name for g in kropp.vertex_groups if g.name in deform}
    ut = []
    for v in kropp.data.vertices:
        best = max((g for g in v.groups if g.group in namn), key=lambda g: g.weight, default=None)
        ut.append(namn[best.group] if best else '')
    return ut


BEN = dominerande_ben()


def kroppens_horn():
    dg = bpy.context.evaluated_depsgraph_get(); ev = kropp.evaluated_get(dg); me = ev.to_mesh()
    co = [kropp.matrix_world @ v.co for v in me.vertices]
    if hasattr(me, 'calc_loop_triangles'):
        me.calc_loop_triangles()
    tris = [tuple(t.vertices) for t in me.loop_triangles]
    ev.to_mesh_clear()
    return co, tris


def hornen_for(co, prefix):
    return [p for p, b in zip(co, BEN) if b.startswith(prefix)]


for _ in range(3):
    co, _t = kroppens_horn()
    for sida, s in SIDOR.items():
        lagst = min(p.z for p in hornen_for(co, s + 'Hand'))
        handled[sida].z += FZ + HAND_OVER_FILT - lagst
        satt_kontroll('IK_hand.' + sida, handled[sida], handrot[sida])
        satt_kontroll('pol_armbage.' + sida, armbagens_pol(sida, handled[sida], utat[sida]))
    upd()
# 2.7b armbågarna utåt tills armarna går fria från bordet (handen står kvar)
def varld_bvh(ob):
    dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); me = ev.to_mesh()
    co = [ob.matrix_world @ v.co for v in me.vertices]
    if hasattr(me, 'calc_loop_triangles'):
        me.calc_loop_triangles()
    tris = [tuple(t.vertices) for t in me.loop_triangles]
    ev.to_mesh_clear()
    return BVHTree.FromPolygons(co, tris, all_triangles=True), co


BORD_BVH = [varld_bvh(o)[0] for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith('kort_')
            and o.users_collection[0].name in ('bord', 'markerbricka')]


def arm_mot_bordet(co, tris, sida):
    """(antal trianglar som går igenom bordet, kortaste avstånd till bordet) för sidans överarm och underarm.
    Avståndet räknas inte för underarmens sista 7 cm före handleden, som vilar mot filten med handen."""
    s = SIDOR[sida]; ben = (s + 'Arm', s + 'ForeArm')
    t = [tr for tr in tris if BEN[tr[0]] in ben]
    arm = BVHTree.FromPolygons(co, t, all_triangles=True)
    igenom = sum(len(arm.overlap(b)) for b in BORD_BVH)
    hl = W(s + 'Hand')
    nara = [co[i] for i in {v for tr in t for v in tr}
            if co[i].y < KANT_Y + 0.08 and co[i].z < FZ + 0.08 and (co[i] - hl).length > 0.07]
    luft = min((b.find_nearest(p)[3] for b in BORD_BVH for p in nara), default=1.0)
    return igenom, luft


for _ in range(25):
    co, tris = kroppens_horn(); klart = True
    for sida in SIDOR:
        igenom, luft = arm_mot_bordet(co, tris, sida)
        if (igenom or luft < ARM_LUFT) and utat[sida] < 60:
            utat[sida] += 2; klart = False
            satt_kontroll('pol_armbage.' + sida, armbagens_pol(sida, handled[sida], utat[sida]))
    upd()
    if klart:
        break


# 2.8 huvudet och ögonen mot kameran
def ansiktet_framat():
    return (MW @ pbs['headfront'].matrix).to_3x3().col[1].normalized()


def ogonen():
    return (W('eye.L') + W('eye.R')) / 2


def rikta_blicken(mal):
    """Huvudet och ögonen mot punkten mal (från hållningen, så att den kan riktas om). Ger kvarvarande fel i grader."""
    for n in ('neck', 'Head', 'eye.L', 'eye.R'):
        pbs[n].matrix_basis = Matrix.Identity(4)
    upd()
    mal = Vector(mal)
    q = ansiktet_framat().rotation_difference((mal - ogonen()).normalized())
    vrid_varld(pbs['neck'], Quaternion().slerp(q, NACKE_ANDEL))
    vrid_varld(pbs['Head'], ansiktet_framat().rotation_difference((mal - ogonen()).normalized()))
    for n in ('eye.L', 'eye.R'):
        vrid_varld(pbs[n], ansiktet_framat().rotation_difference((mal - W(n)).normalized()))
    return math.degrees(ansiktet_framat().angle((mal - ogonen()).normalized()))


def huvudets_vridning():
    return {n: r3([math.degrees(a) for a in pbs[n].matrix_basis.to_euler()]) for n in ('neck', 'Head', 'eye.L', 'eye.R')}


def r3(v):
    return [round(float(x), 4) for x in v]


BLICK = {'film': STD['kameror']['film']['pos'], 'lag': EGNA_VYER['lag'][0]}
blick = {}
for k in ('lag', 'film'):  # filmens sist: den gäller för de övriga bilderna och vy.blend
    fel = rikta_blicken(BLICK[k])
    blick[k] = {'kamera': list(BLICK[k]), 'kvar_fel_grader': round(fel, 2), 'vridning_grader': huvudets_vridning()}


# ================================================================ 3. kontrollen
co, tris = kroppens_horn()
kropp_bvh = BVHTree.FromPolygons(co, tris, all_triangles=True)
stol_bvh, _c = varld_bvh(stol)
sits_z = STD['stol']['sits_z'] - STOL_SANK
sits_in = 0.0  # hur djupt sätet och låren går ned i sitsens dyna (dynan ger efter; några cm är rimligt)
for p, b in zip(co, BEN):
    if b in ('Hips', 'RightUpLeg', 'LeftUpLeg') and p.z < sits_z + 0.05:
        hit = stol_bvh.ray_cast(Vector((p.x, p.y, sits_z + 0.3)), Vector((0, 0, -1)))
        if hit[0] is not None and hit[0].z > p.z:
            sits_in = max(sits_in, hit[0].z - p.z)
genom = {}
hinder = [o for o in bpy.data.objects if o.type == 'MESH' and o is not kropp and not o.name.startswith('kort_')
          and (o.users_collection[0].name in ('bord', 'sko', 'markerbricka', 'exempelgiv') or o is stol)]
for o in hinder:
    bvh, _c = varld_bvh(o)
    par = kropp_bvh.overlap(bvh)
    if par:
        ben = sorted({BEN[tris[a][0]] for a, _b in par})
        genom[o.name] = {'par': len(par), 'ben': ben}
sarg_under = FZ + STD['bord']['sarg']['underkant']
ben_under_bord = [p for p, b in zip(co, BEN) if (b.endswith('UpLeg') or b.endswith('Leg')) and p.y < KANT_Y]
bal = [p for p, b in zip(co, BEN) if b in ('Hips', 'Spine', 'Spine1', 'Spine2') and sarg_under - 0.02 < p.z < FZ + 0.05]
matt = {
    'kant_bak_m': KANT_BAK, 'dealerkant_y': KANT_Y,
    'hoft_led_mitt': r3((W('RightUpLeg') + W('LeftUpLeg')) / 2),
    'axlar': {'hoger': r3(W('RightArm')), 'vanster': r3(W('LeftArm'))},
    'armbagar': {'hoger': r3(W('RightForeArm')), 'vanster': r3(W('LeftForeArm'))},
    'armbage_utat_grader': {'hoger': utat['R'], 'vanster': utat['L']},
    'handleder': {'hoger': r3(W('RightHand')), 'vanster': r3(W('LeftHand'))},
    'knan': {'hoger': r3(W('RightLeg')), 'vanster': r3(W('LeftLeg'))},
    'fotleder': {'hoger': r3(W('RightFoot')), 'vanster': r3(W('LeftFoot'))},
    'ogon': r3(ogonen()),
    'stol_sankt_m': round(STOL_SANK, 4), 'stol_sits_overkant_z': round(sits_z, 4),
    'sitsens_dyna_inpressad_m': round(sits_in, 4),
    'handens_lagsta_over_filt_m': {k: round(min(p.z for p in hornen_for(co, s + 'Hand')) - FZ, 4) for k, s in (('hoger', 'Right'), ('vanster', 'Left'))},
    'luft_lar_till_sargens_underkant_m': round(sarg_under - max(p.z for p in ben_under_bord), 4) if ben_under_bord else None,
    'luft_mage_till_kanten_m': round(min(p.y for p in bal) - KANT_Y, 4) if bal else None,
    'underarmens_lagsta_over_bordet_m': {k: round(min(p.z for p in hornen_for(co, s + 'ForeArm') if p.y < KANT_Y) - FZ, 4)
                                          for k, s in (('hoger', 'Right'), ('vanster', 'Left'))},
    'luft_arm_till_bordet_m': {k: round(arm_mot_bordet(co, tris, sida)[1], 4) for k, sida in (('hoger', 'R'), ('vanster', 'L'))},
    'armbagen_bakom_kanten_m': {k: round(W(s + 'ForeArm').y - KANT_Y, 4) for k, s in (('hoger', 'Right'), ('vanster', 'Left'))},
    'bal_framat_grader': BAL_FRAMAT_GRADER,
    'blick': blick,
    'genom_bord_eller_stol': genom,
}
UT.mkdir(parents=True, exist_ok=True)
(UT / 'vy_matt.json').write_text(json.dumps(matt, indent=1, ensure_ascii=False), encoding='utf-8')
print('VY MATT', json.dumps(matt, ensure_ascii=False))

# ================================================================ 4. ljus, golv och kameror
w = bpy.data.worlds.new('vy_varld'); w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.05, 0.05, 0.055, 1)
sc.world = w
lc = coll('vy_ljus')
for namn, plats, storlek, effekt, sikte in (
        ('tak', (0.0, -0.2, 2.7), 2.2, 300, (0.0, -0.1, 0.95)),
        ('ansikte', (0.7, -1.6, 1.95), 1.2, 90, (0.0, 0.3, 1.35)),
        ('fyll', (-0.9, -1.9, 1.6), 1.5, 50, (0.0, 0.1, 1.0)),
        ('bak', (-0.4, 1.9, 2.2), 1.5, 120, (0.0, 0.35, 1.3))):
    ld = bpy.data.lights.new(namn, 'AREA'); ld.size = storlek; ld.energy = effekt
    ob = bpy.data.objects.new('ljus_' + namn, ld); lc.objects.link(ob); ob.location = plats; look_at(ob, sikte)
golv = bpy.data.meshes.new('golv'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=4); bm.to_mesh(golv); bm.free()
golv.materials.append(pbr('vy_golv', (0.18, 0.17, 0.16, 1), rough=0.8))
lc.objects.link(bpy.data.objects.new('vy_golv', golv))

kc = coll('vy_kameror')
kameror = make_cameras(kc, ['film', 'hel'])
for namn, (plats, sikte, mm, orto) in EGNA_VYER.items():
    cd = bpy.data.cameras.new('kam_' + namn); cd.sensor_width = STD['lins']['sensor_mm']; cd.sensor_fit = 'HORIZONTAL'
    if orto:
        cd.type = 'ORTHO'; cd.ortho_scale = orto
    else:
        cd.lens = mm
    cd.clip_start = 0.01; cd.clip_end = 50
    ob = bpy.data.objects.new('kam_' + namn, cd); kc.objects.link(ob); ob.location = plats; look_at(ob, sikte)
    kameror[namn] = ob
sc.camera = kameror['film']

# ================================================================ 5. bilderna och scenen
if A.motor == 'CYCLES':
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 64; sc.cycles.use_denoising = True
    configure_render_device(sc)
else:
    for e in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            sc.render.engine = e; break
        except TypeError:
            continue
    try:
        sc.eevee.taa_render_samples = 48
    except AttributeError:
        pass
sc.view_settings.view_transform = 'AgX'
bx, by = STD['lins']['bild_px']
sc.render.resolution_x, sc.render.resolution_y = int(bx * A.skala), int(by * A.skala)
if not A.utan_bilder:
    riktad = 'film'
    for namn in A.vyer:
        mot = namn if namn in BLICK_MOT_EGEN_KAMERA else 'film'
        if mot != riktad:
            rikta_blicken(BLICK[mot]); riktad = mot
        sc.camera = kameror[namn]
        sc.render.filepath = str(UT / f'vy_{namn}.png')
        bpy.ops.render.render(write_still=True)
        print('VY RENDERAD', sc.render.filepath)
    if riktad != 'film':
        rikta_blicken(BLICK['film'])
sc.camera = kameror['film']
bpy.ops.wm.save_as_mainfile(filepath=str(UT / 'vy.blend'), relative_remap=True)
print('VY SPARAD', UT / 'vy.blend')
