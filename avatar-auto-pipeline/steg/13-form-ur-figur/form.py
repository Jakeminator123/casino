"""Steg 13: dockans eget huvud i personens form (gratis, lokalt).

Domaren över den nya ytan på Danilos docka (2026-11-27, inte Jakob): "Danilos huvud med hans hud målad på"; det som gör
dockan till personen är först huvudets form. Formen finns i personens egen figur ur Version 1 (Meshy-huvudet, det som
liknar honom mest), men den figuren har inga ansiktsformer, inga ögonleder och påsatta händer. Här vänds det: dockans
huvud, med samma hörn, samma ytkarta, samma ansiktsformer och samma leder, flyttas till hans form. Inget sätts på.

1. Punkterna: båda huvudena renderas framifrån och 30 grader snett åt var sida, och MediaPipe (steg 09:s punkter.py)
   läser ansiktets 478 punkter i varje bild; varje punkt skjuts tillbaka in i sin modell (en stråle från kameran), så att
   den blir ett läge på ytan. En punkt blir ett par: medlet av vyerna där den träffade båda huvudena. Ögonspringans och
   läpparnas inre kant är inte med (se OGONSPRINGA).
2. Passningen: en likformig passning (vridning, flytt och storlek) för hans punkter till dockans huvud, så att huvudet
   står kvar där det står och har den storlek bygget gav det (scen/bygg_docka.py efter hans mått); par som efter den
   ligger långt ifrån varandra tas inte med. Sedan en mjuk passning (thin plate spline, som steg 09 men mjukare) som
   flyttar dockans punkter till hans; ett par som den inte når tas bort och den görs om. Den läggs på dockans hörn i full
   styrka där huden hör till huvudet (vikten på Head och ansiktets ben) och tonas ut över halsen med huvudets vikt.
3. Dragningen: hörnen i ansiktet (innanför ansiktets kant i hans punkter, framåtvända) dras en del av vägen (DRAG) mot
   hans yta, högst DRAG_MAX, och dragningen jämnas ut över dockans nät. Ögonen och munnen dras inte (ögonlocken och
   läpparna ska mötas som förut i en blinkning och en stängd mun), och inte håret: utanför ansiktets kant formas
   huvudet bara av passningen, eftersom hans hjässa är hår, en volym dockan saknar.
4. Det som följer med: ansiktsformerna är skillnader mot grundformen på samma hörn och står kvar som dockans egna
   (vridna med passningens lutning, som steg 09 gör, rev de munnen när den öppnades: hans läppar är tunnare och
   lutningen skiftar för fort där; prövat 2026-11-27). Ögongloberna flyttas hela som ögonlocken framför dem, och locken
   och huden närmast ögat följer globen stelt, så att dockans ögonspringa behålls i hans ögas läge och blinkningen sluter
   ögat som förut. Brynen och tänderna följer passningen där de är och huden närmast dem, och ansiktets ben (käken,
   ögonen, ögonlocken, munnen) flyttas med passningen. Skelettet i övrigt, vikterna, ytkartan och hörnfärgerna är orörda.
5. Kontrollen: hur mycket av ögongloben som syns i en full blinkning och av munhålan i en stängd mun, före och efter
   (strålar framifrån), och hur nära ögonlocken kommer ögongloben.

Öronen formas bara av passningen (MediaPipe har inga punkter där), och halsen och kroppen är dockans.

    blender -b --python-exit-code 1 --python steg/13-form-ur-figur/form.py -- docka.blend figur.glb ut.glb [--arbete mapp]
docka.blend är dockans bygge (scen/bygg_docka.py skriver det bredvid GLB:n), figur.glb personens figur med skelett
(Version 1). ut.glb och ut.blend skrivs; rapporten blir <ut>.json. Renderingen kräver grafikkortet: den som kör tar
låset ../slask/blackjack-dealer/gpu-och-headless.lock först. MediaPipe-miljön är steg 09:s
(../blackjack-dealer/tools/python/.venv)."""
import argparse, json, math, os, subprocess, sys, time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

ROT = Path(__file__).resolve().parents[2]
MP = ROT.parent / 'blackjack-dealer' / 'tools' / 'python'
PUNKTER = ROT / 'steg' / '09-ansikte' / 'punkter.py'
MM = 0.001
INST = {
    'kamera_avstand': 0.6, 'lins_mm': 85.0, 'sensor_mm': 36.0, 'bild_px': 1024,
    'vyer_grader': (0, -30, 30),        # framifrån och snett åt var sida (kring huvudets lodräta axel)
    'tps_lambda': 5e-4,                 # passningens mjukhet (steg 09:s 2e-5 vecklade huden mellan närliggande punkter)
    'tps_rest_mm': 3.0,                 # ett par som passningen inte når närmare än så tas bort
    'oga_stelt': (1.3, 2.0),            # ögonlocken följer globen stelt ut till 1,3 globradier, tonat till passningen vid 2
    'bort_om_fel_mm': 4.0,              # ett par längre ifrån efter den likformiga passningen (eller 3 x medianen) tas inte med
    'drag': 0.6, 'drag_max_mm': 5.0,    # dragningen mot hans yta: andelen av vägen och mest
    'drag_inom_mm': 10.0,               # bara där hans yta är så nära efter passningen
    'ogon_fri_mm': (17.0, 27.0),        # ingen dragning närmare ögats mitt än 17 mm, full från 27
    'mun_fri_mm': (9.0, 18.0),          # ingen dragning närmare läpparnas linje än 9 mm, full från 18
    'kant_tona': 0.10,                  # dragningen tonas in över så stor del av ansiktets bredd innanför dess kant
    'jamna_varv': 12,
    'lutning': (0.75, 1.35),            # passningens lutning hålls inom detta längs varje axel (som steg 09)
    'vrid_former': False,               # formerna vrids inte med passningens lutning (vriden rev munnen när den öppnades)
}
IRIS = set(range(468, 478))
OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150,
        136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
INRE_LAPP = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 95, 88, 178, 87, 14, 317, 402, 318, 324]
# Ögonspringans kant (som steg 09) och läpparnas inre kant är inte med i passningen: hans är målade på en yta, dockans
# är ögonlockets kant på en glob och läppen som viker in i munnen, så de ligger olika djupt. Med i passningen lämnade
# locken globen (blinkningen slöt inte ögat) och munhålan stack fram som en mörk prick på underläppen (prövat
# 2026-11-27). Ögat och munnen får läge och storlek av punkterna runt dem.
OGONSPRINGA = {33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
               263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466}
INRE_KANT = set(INRE_LAPP)


def las_args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('docka'); ap.add_argument('figur'); ap.add_argument('ut')
    ap.add_argument('--arbete', default=None)
    ap.add_argument('--drag', type=float, default=None, help=f'andelen av vägen mot hans yta (förval {INST["drag"]}; 0: bara passningen)')
    py = MP / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    ap.add_argument('--mp-python', default=os.environ.get('MEDIAPIPE_PYTHON', str(py)))
    ap.add_argument('--mp-modell', default=str(MP / 'models' / 'face_landmarker.task'))
    return ap.parse_args(a)


# ---------------------------------------------------------------- hjälp
def varld(o, co=None):
    if co is None:
        me = o.data; co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    M = np.array(o.matrix_world); return co @ M[:3, :3].T + M[:3, 3]


def trianglar(me):
    me.calc_loop_triangles()
    t = np.empty(len(me.loop_triangles) * 3, np.int64); me.loop_triangles.foreach_get('vertices', t); return t.reshape(-1, 3)


def vikt(o, namn):
    w = np.zeros(len(o.data.vertices)); g = o.vertex_groups.get(namn)
    if g is not None:
        for v in o.data.vertices:
            for ge in v.groups:
                if ge.group == g.index:
                    w[v.index] = ge.weight
    return w


def bvh(co, tris):
    return BVHTree.FromPolygons([Vector(c) for c in co], [tuple(int(x) for x in t) for t in tris], all_triangles=True)


class TPS:
    """Mjuk passning R3 -> R3: f(x) = A0 + x A1 + Σ W_i |x - X_i| (som steg 09)."""

    def __init__(s, X, Y, lam):
        n = len(X); K = np.linalg.norm(X[:, None] - X[None], axis=2)
        P = np.hstack([np.ones((n, 1)), X]); L = np.zeros((n + 4, n + 4))
        L[:n, :n] = K + lam * np.eye(n); L[:n, n:] = P; L[n:, :n] = P.T
        rhs = np.zeros((n + 4, 3)); rhs[:n] = Y
        sol = np.linalg.solve(L, rhs); s.W, s.A, s.X = sol[:n], sol[n:], X

    def __call__(s, x, bit=4000):
        return np.vstack([np.linalg.norm(x[i:i + bit, None] - s.X[None], axis=2) @ s.W + s.A[0] + x[i:i + bit] @ s.A[1:]
                          for i in range(0, len(x), bit)]) if len(x) else np.zeros((0, 3))

    def jac(s, x, bit=2000):
        ut = []
        for i in range(0, len(x), bit):
            d = x[i:i + bit, None] - s.X[None]; r = np.linalg.norm(d, axis=2)[..., None] + 1e-12
            ut.append(np.einsum('mnb,na->mab', d / r, s.W) + s.A[1:].T[None])
        return np.concatenate(ut) if ut else np.zeros((0, 3, 3))


def likform(X, Y):
    mx, my = X.mean(0), Y.mean(0); A, B = X - mx, Y - my
    U, S, Vt = np.linalg.svd(A.T @ B); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(Vt.T @ U.T))
    R = Vt.T @ D @ U.T; s = (S * np.diag(D)).sum() / (A ** 2).sum()
    return s, R, my - s * R @ mx


def inuti(p, poly):
    x, y = p[:, 0], p[:, 1]; ut = np.zeros(len(p), bool); n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        korsar = ((y1 > y) != (y2 > y)) & (x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1)
        ut ^= korsar
    return ut


def avstand_kant(p, poly):
    d = np.full(len(p), np.inf)
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]; ab = b - a
        t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1); d = np.minimum(d, np.linalg.norm(p - (a + t[:, None] * ab), axis=1))
    return d


def mjuk(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- 1. punkterna
def huvudets_mitt(o, huvudvikt):
    co = varld(o); hv = co[huvudvikt > 0.5]
    return np.array([(hv[:, 0].min() + hv[:, 0].max()) / 2, hv[:, 1].min() + 0.09, hv[:, 2].min() + 0.45 * np.ptp(hv[:, 2])])


def kamera(mitt, grader):
    rz = Matrix.Rotation(math.radians(grader), 3, 'Z')
    loc = Vector(mitt) + rz @ Vector((0, -(INST['kamera_avstand'] + 0.09), 0))
    return {'loc': loc, 'rot': rz @ Euler((math.pi / 2, 0, 0)).to_matrix()}


def rendera(o, kam, fil, farg):
    sc = bpy.context.scene; cam = sc.camera
    cam.matrix_world = Matrix.Translation(kam['loc']) @ kam['rot'].to_4x4()
    for x in sc.objects:
        x.hide_render = x.type == 'MESH' and x is not o
    sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = farg
    sc.render.resolution_x = sc.render.resolution_y = INST['bild_px']; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = str(fil)
    bpy.ops.render.render(write_still=True)


def stral(kam, u, v):
    k = INST['sensor_mm'] / INST['lins_mm']
    return kam['loc'], (kam['rot'] @ Vector(((u - 0.5) * k, (0.5 - v) * k, -1.0))).normalized()


def punkter_3d(lm, kam, tree, alltid=()):
    """Punkterna på ytan; en stråle som bara snuddar ytan räknas inte, utom för punkterna i `alltid` (ansiktets kant)."""
    ut = np.full((len(lm), 3), np.nan)
    for i, (u, v, _) in enumerate(lm):
        o, d = stral(kam, u, v); loc, nor, fi, _ = tree.ray_cast(o, d)
        if loc is not None and (abs(nor.dot(d)) > 0.25 or i in alltid):
            ut[i] = loc
    return ut


# ---------------------------------------------------------------- huvudet
def main():
    A = las_args()
    if A.drag is not None:
        INST['drag'] = A.drag
    utfil = Path(A.ut).resolve(); utfil.parent.mkdir(parents=True, exist_ok=True)
    arb =Path(A.arbete).resolve() if A.arbete else ROT.parent / 'slask' / 'avatar-auto-pipeline' / f'form-{utfil.stem}'
    arb.mkdir(parents=True, exist_ok=True)
    rap = {'docka': str(Path(A.docka).resolve()), 'figur': str(Path(A.figur).resolve()), 'ut': str(utfil), 'installningar': INST}

    bpy.ops.wm.open_mainfile(filepath=str(Path(A.docka).resolve()))
    d_arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    d_me = next(o for o in bpy.data.objects if o.type == 'MESH' and o.find_armature() == d_arm)
    d_arm.data.pose_position = 'REST'
    fore = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(Path(A.figur).resolve()))
    nya = [o for o in bpy.data.objects if o not in fore]
    t_arm = next(o for o in nya if o.type == 'ARMATURE')
    t_me = next(o for o in nya if o.type == 'MESH' and o.find_armature() == t_arm)
    for o in nya:
        if o not in (t_arm, t_me):
            bpy.data.objects.remove(o)
    t_arm.data.pose_position = 'REST'
    if t_arm.animation_data:
        t_arm.animation_data.action = None
    bpy.context.view_layer.update()
    sc = bpy.context.scene
    cam = bpy.data.objects.new('kam13', bpy.data.cameras.new('kam13')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = INST['lins_mm']; cam.data.sensor_width = INST['sensor_mm']; cam.data.sensor_fit = 'AUTO'

    # -- dockan: huden (största sammanhängande delen), ögongloberna, brynen och tänderna; huvudets vikt
    me = d_me.data; N = len(me.vertices)
    dco = varld(d_me); dtri = trianglar(me)
    kanter = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get('vertices', kanter); kanter = kanter.reshape(-1, 2)
    far = np.arange(N)
    def f(x):
        while far[x] != x:
            far[x] = far[far[x]]; x = far[x]
        return x
    for a, b in kanter:
        ra, rb = f(a), f(b)
        if ra != rb:
            far[ra] = rb
    del_av = np.array([f(i) for i in range(N)]); hud_rot = np.bincount(del_av).argmax(); hud = del_av == hud_rot
    oga = {s: vikt(d_me, f'eye.{s}') > 0.99 for s in ('L', 'R')}
    huvudben = {b.name for b in d_arm.data.bones if b.name == 'Head' or (b.parent and b.parent.name == 'Head')}
    hw = np.zeros(N)
    for n in huvudben:
        hw += vikt(d_me, n)
    hw = np.clip(hw, 0, 1)
    ovr = ~hud & ~oga['L'] & ~oga['R']  # brynen och tänderna
    rap['docka_delar'] = {'horn': N, 'hud': int(hud.sum()), 'ogonglober': int(oga['L'].sum() + oga['R'].sum()), 'bryn_och_tander': int(ovr.sum()),
                          'huvudets_horn': int((hw > 0.99).sum()), 'tonade_over_halsen': int(((hw > 0) & (hw <= 0.99)).sum())}
    t_hw = vikt(t_me, 'Head'); tco = varld(t_me); ttri = trianglar(t_me.data)

    # -- 1. punkterna i tre vyer
    me.color_attributes.active_color = me.color_attributes.get('farg') or me.color_attributes[0]
    mitt_d, mitt_t = huvudets_mitt(d_me, hw), huvudets_mitt(t_me, t_hw)
    bilder, kameror = [], []
    for g in INST['vyer_grader']:
        kd, kt = kamera(mitt_d, g), kamera(mitt_t, g)
        bd, bt = arb / f'docka-{g:+d}.png', arb / f'figur-{g:+d}.png'
        rendera(d_me, kd, bd, 'VERTEX'); rendera(t_me, kt, bt, 'TEXTURE')
        bilder += [bd, bt]; kameror.append((g, kd, kt, bd, bt))
    pj = arb / 'punkter.json'
    r = subprocess.run([A.mp_python, str(PUNKTER), '--modell', A.mp_modell, '--ut', str(pj), *map(str, bilder)], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit('punkter.py föll:\n' + r.stdout[-2000:] + r.stderr[-2000:])
    lm = json.loads(pj.read_text(encoding='utf-8'))
    d_tree = bvh(dco, dtri[hud[dtri[:, 0]] | oga['L'][dtri[:, 0]] | oga['R'][dtri[:, 0]]]); t_tree = bvh(tco, ttri)
    X, Y, vy_av, idx_av = [], [], [], []
    fram = {}
    for g, kd, kt, bd, bt in kameror:
        if not lm.get(bd.name) or not lm.get(bt.name):
            rap.setdefault('vyer_utan_ansikte', []).append(g); continue
        Pd, Pt = punkter_3d(lm[bd.name], kd, d_tree), punkter_3d(lm[bt.name], kt, t_tree)
        if g == 0:
            fram = {'d': Pd, 't': Pt, 'oval': punkter_3d(lm[bt.name], kt, t_tree, alltid=set(OVAL))[OVAL]}
        ok = ~np.isnan(Pd).any(1) & ~np.isnan(Pt).any(1); ok[list(IRIS | OGONSPRINGA | INRE_KANT)] = False
        X.append(Pd[ok]); Y.append(Pt[ok]); vy_av += [g] * int(ok.sum()); idx_av += list(np.nonzero(ok)[0])
    if not fram:
        raise SystemExit('inget ansikte framifrån')
    X, Y = np.concatenate(X), np.concatenate(Y); vy_av, idx_av = np.array(vy_av), np.array(idx_av)
    # samma punkt i flera vyer blir ett par (medlet av vyerna där båda träffade): MediaPipe lägger en punkt några
    # millimeter olika i olika vyer, och en passning genom alla tre vecklade huden mellan dem (prövat 2026-11-27)
    unika = np.unique(idx_av)
    X = np.array([X[idx_av == i].mean(0) for i in unika]); Y = np.array([Y[idx_av == i].mean(0) for i in unika])
    vyer_per_punkt = np.array([(idx_av == i).sum() for i in unika]); idx_av = unika
    s, R, tr = likform(Y, X)  # hans punkter till dockans huvud
    Yd = Y @ (s * R).T + tr
    fel = np.linalg.norm(Yd - X, axis=1); gran = max(INST['bort_om_fel_mm'] * MM, 3 * np.median(fel))
    # en punkt som är långt ifrån efter den likformiga passningen är ett fel i läsningen, inte formen: ta bort, passa om
    ok = fel < gran
    s, R, tr = likform(Y[ok], X[ok]); Yd = Y @ (s * R).T + tr; fel = np.linalg.norm(Yd - X, axis=1); ok = fel < gran
    tps = TPS(X[ok], Yd[ok], INST['tps_lambda'])
    for _ in range(3):  # en punkt som den mjuka passningen inte når är en läsning som säger emot grannarna: bort, passa om
        rest_alla = np.full(len(X), np.inf); rest_alla[ok] = np.linalg.norm(tps(X[ok]) - Yd[ok], axis=1)
        if rest_alla[ok].max() <= INST['tps_rest_mm'] * MM:
            break
        ok &= rest_alla <= INST['tps_rest_mm'] * MM; tps = TPS(X[ok], Yd[ok], INST['tps_lambda'])
    rest = np.linalg.norm(tps(X[ok]) - Yd[ok], axis=1)
    rap['punkter'] = {'par': int(len(X)), 'anvanda': int(ok.sum()), 'vyer_per_punkt': {int(k): int((ok & (vyer_per_punkt == k)).sum()) for k in (1, 2, 3)},
                      'hans_storlek_mot_dockans': round(float(1 / s), 4),
                      'formskillnad_mm_median_p90_max': [round(float(np.median(fel[ok]) / MM), 2), round(float(np.percentile(fel[ok], 90) / MM), 2),
                                                         round(float(fel[ok].max() / MM), 2)],
                      'tps_rest_mm_median_max': [round(float(np.median(rest) / MM), 3), round(float(rest.max() / MM), 3)]}
    print('PUNKTER', json.dumps(rap['punkter']))

    # -- 2. passningen på dockans hörn, tonad med huvudets vikt
    berord = hw > 0
    flytt = np.zeros((N, 3)); flytt[berord] = (tps(dco[berord]) - dco[berord]) * hw[berord, None]
    ogonflytt = {}; stelt = np.zeros(N)
    for sida in ('L', 'R'):
        # ögongloberna flyttas hela, som ögonlocken framför dem flyttas i medel, och locken och huden närmast ögat följer
        # globen stelt (tonat till passningen längre ut): dockans ögonspringa behålls i hans ögas läge. Följde locken
        # passningen fullt drogs de isär kring den fasta globen och ögonen såg uppspärrade ut (prövat 2026-11-27).
        E = dco[oga[sida]].mean(0); r_ = np.linalg.norm(dco[oga[sida]] - E, axis=1).max()
        lock = hud & (np.linalg.norm(dco - E, axis=1) < 1.3 * r_) & ((E[1] - dco[:, 1]) > 0.3 * r_)
        ogonflytt[sida] = flytt[lock].mean(0); flytt[oga[sida]] = ogonflytt[sida]
        a_ = 1 - mjuk(np.linalg.norm(dco - E, axis=1) / r_, *INST['oga_stelt'])
        nara = (hud | ovr) & (a_ > 0)
        flytt[nara] = (1 - a_[nara, None]) * flytt[nara] + a_[nara, None] * ogonflytt[sida]
        stelt = np.maximum(stelt, np.where(nara, a_, 0))
    J = np.repeat(np.eye(3)[None], N, 0)
    if berord.any():
        Jb = tps.jac(dco[berord]); U_, S_, Vt_ = np.linalg.svd(Jb)
        Jb = U_ @ (np.clip(S_, *INST['lutning'])[..., None] * Vt_)
        k_ = (hw * (1 - stelt))[berord, None, None]  # där locken följer globen stelt vrids formerna inte heller
        J[berord] = np.eye(3) + k_ * (Jb - np.eye(3))
    if not INST['vrid_former']:
        J[:] = np.eye(3)
    ny = dco + flytt

    # -- 3. dragningen mot hans yta, i ansiktet
    t_dock = tco @ (s * R).T + tr; t_tree_d = bvh(t_dock, ttri)
    oval = fram['oval'] @ (s * R).T + tr  # ansiktets kant i hans bild framifrån, i dockans rum
    oval2 = oval[~np.isnan(oval).any(1)][:, [0, 2]]
    if len(oval2) < 20:
        raise SystemExit(f'ansiktets kant: bara {len(oval2)} av {len(OVAL)} punkter träffade hans yta')
    bredd = np.ptp(oval2[:, 0])
    ogon_ny = {sd: ny[oga[sd]].mean(0) for sd in ('L', 'R')}
    lapp = fram['d'][INRE_LAPP]; lapp = tps(lapp[~np.isnan(lapp).any(1)])
    nor = np.empty(N * 3); me.vertices.foreach_get('normal', nor); nor = nor.reshape(-1, 3) @ np.array(d_me.matrix_world)[:3, :3].T
    kand = np.nonzero(hud & (hw > 0.99) & (nor[:, 1] < -0.2))[0]
    p2 = ny[kand][:, [0, 2]]
    m = inuti(p2, oval2) * mjuk(avstand_kant(p2, oval2), 0, INST['kant_tona'] * bredd)
    do = np.min([np.linalg.norm(ny[kand] - ogon_ny[sd], axis=1) for sd in ('L', 'R')], axis=0)
    m *= mjuk(do / MM, *INST['ogon_fri_mm'])
    dl = np.min(np.linalg.norm(ny[kand][:, None] - lapp[None], axis=2), axis=1) if len(lapp) else np.full(len(kand), 1.0)
    m *= mjuk(dl / MM, *INST['mun_fri_mm'])
    drag = np.zeros((N, 3)); avst = []
    for j, v in enumerate(kand):
        if m[j] <= 0:
            continue
        q, _, _, d = t_tree_d.find_nearest(Vector(ny[v]))
        if q is None or d > INST['drag_inom_mm'] * MM:
            continue
        vec = (np.array(q) - ny[v]) * INST['drag'] * m[j]; L = np.linalg.norm(vec)
        if L > INST['drag_max_mm'] * MM:
            vec *= INST['drag_max_mm'] * MM / L
        drag[v] = vec; avst.append(d)
    grannar = [[] for _ in range(N)]
    for a, b in kanter:
        grannar[a].append(b); grannar[b].append(a)
    rorlig = np.zeros(N, bool); rorlig[kand] = True
    for _ in range(INST['jamna_varv']):  # jämnas ut över nätet (bara bland ansiktets hörn; kanten mot resten står på noll)
        nyd = drag.copy()
        for v in kand:
            g = grannar[v]
            if g:
                nyd[v] = 0.5 * drag[v] + 0.5 * drag[g].mean(0)
        drag = nyd * rorlig[:, None]
    # brynen och tänderna: passningen där de själva är (den är mjuk, så de följer huden under sig), och dragningen som
    # huden närmast dem dras, vägd efter avståndet (en enda närmaste hudpunkt gav hackiga, sönderslitna bryn)
    kd = KDTree(int(hud.sum()))
    hudi = np.nonzero(hud)[0]
    for j, v in enumerate(hudi):
        kd.insert(dco[v], j)
    kd.balance()
    for v in np.nonzero(ovr)[0]:
        nara = kd.find_n(dco[v], 8); w = np.array([1 / max(d, 1e-4) for _, _, d in nara])
        drag[v] = (w[:, None] * drag[hudi[[j for _, j, _ in nara]]]).sum(0) / w.sum()
    ny = dco + flytt + drag
    Ld = np.linalg.norm(drag, axis=1); Lf = np.linalg.norm(flytt, axis=1)
    rap['flytt'] = {'passningen_mm_median_p95_max_i_huvudet': [round(float(np.median(Lf[hw > 0.99]) / MM), 2), round(float(np.percentile(Lf[hw > 0.99], 95) / MM), 2),
                                                               round(float(Lf[hw > 0.99].max() / MM), 2)],
                    'dragningen': {'horn': int((Ld > 1e-5).sum()), 'mm_median_max': [round(float(np.median(Ld[Ld > 1e-5]) / MM), 2) if (Ld > 1e-5).any() else 0,
                                                                                    round(float(Ld.max() / MM), 2)],
                                   'hans_yta_mm_median_innan': round(float(np.median(avst) / MM), 2) if avst else None}}

    # -- 4. formerna, grundformen och benen
    Minv = np.linalg.inv(np.array(d_me.matrix_world)[:3, :3])
    kb = me.shape_keys.key_blocks; ref = kb[0]
    bas = np.empty(N * 3); ref.data.foreach_get('co', bas); bas = bas.reshape(-1, 3)
    M3 = np.array(d_me.matrix_world)[:3, :3]
    nybas = bas + (flytt + drag) @ Minv.T
    former = {}
    for k in kb:
        if k == ref:
            continue
        c = np.empty(N * 3); k.data.foreach_get('co', c); D = (c.reshape(-1, 3) - bas) @ M3.T
        Dn = np.einsum('nab,nb->na', J, D)
        k.data.foreach_set('co', (nybas + Dn @ Minv.T).ravel()); former[k.name] = D
    ref.data.foreach_set('co', nybas.ravel()); me.vertices.foreach_set('co', nybas.ravel()); me.update()
    bpy.context.view_layer.objects.active = d_arm
    for o in bpy.context.selected_objects:
        o.select_set(False)
    d_arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    AM = np.array(d_arm.matrix_world); AMi = np.linalg.inv(AM[:3, :3])
    flyttade = {}
    for eb in d_arm.data.edit_bones:
        if eb.name == 'Head' or not (eb.parent and eb.parent.name == 'Head'):
            continue
        for del_ in ('head', 'tail'):
            p = AM[:3, :3] @ np.array(getattr(eb, del_)) + AM[:3, 3]
            if eb.name in ('eye.L', 'eye.R'):
                q = p + (ogon_ny[eb.name[-1]] - dco[oga[eb.name[-1]]].mean(0))
            else:
                q = tps(p[None])[0]
            setattr(eb, del_, Vector(AMi @ (q - AM[:3, 3])))
            if del_ == 'head':
                flyttade[eb.name] = round(float(np.linalg.norm(q - p) / MM), 2)
    bpy.ops.object.mode_set(mode='OBJECT')
    rap['ben_flyttade_mm'] = flyttade

    # -- 5. kontrollen: blinkningen och munnen, före och efter
    def synligt(co_v, mal, radie, mot, n=9):
        """Andelen strålar framifrån (ett rutnät i en ellips kring `mal`) som först träffar trianglarna `mot` och inte
        den övriga huden."""
        tr_h = bvh(co_v, dtri[hud_t & ~mot]); tr_m = bvh(co_v, dtri[mot]); riktning = Vector((0, 1.0, 0)); traff = alla = 0
        for a in np.linspace(-1, 1, n):
            for b in np.linspace(-1, 1, n):
                if a * a + b * b > 1:
                    continue
                o = Vector((mal[0] + radie[0] * a, mal[1] - 0.2, mal[2] + radie[1] * b)); alla += 1
                lh = tr_h.ray_cast(o, riktning); lm_ = tr_m.ray_cast(o, riktning)
                if lm_[0] is not None and (lh[0] is None or lm_[3] < lh[3] - 1e-5):
                    traff += 1
        return round(traff / max(alla, 1), 3)
    hud_t = hud[dtri[:, 0]]
    farg = me.color_attributes.get('farg'); mork = np.zeros(len(dtri), bool)
    if farg is not None and farg.domain == 'CORNER':  # munhålan (och iris, pupill, bryn): dockans mörka hörnfärger
        c = np.empty(len(farg.data) * 4); farg.data.foreach_get('color', c); c = c.reshape(-1, 4)[:, :3].mean(1)
        lt = np.empty(len(me.loop_triangles) * 3, np.int64); me.loop_triangles.foreach_get('loops', lt)
        mork = c[lt.reshape(-1, 3)].mean(1) < 0.1
    mun0 = fram['d'][[13, 14]].mean(0)
    kontroll = {}
    for namn_, co_v, Dk, mm_ in (('fore', dco, former, mun0), ('efter', varld(d_me, nybas), {k: np.einsum('nab,nb->na', J, v) for k, v in former.items()},
                                                                tps(mun0[None])[0])):
        rad = {}
        for sida, form in (('L', 'eyeBlinkLeft'), ('R', 'eyeBlinkRight')):
            E = co_v[oga[sida]].mean(0); r_ = np.linalg.norm(co_v[oga[sida]] - E, axis=1).max(); glob = oga[sida][dtri[:, 0]]
            rad[f'oga_{sida}_synligt_oppet'] = synligt(co_v, E, (0.45 * r_, 0.3 * r_), glob)
            rad[f'oga_{sida}_synligt_blinkning'] = synligt(co_v + Dk[form], E, (0.45 * r_, 0.3 * r_), glob)
            lock = hud & (np.linalg.norm(co_v - E, axis=1) < 1.3 * r_) & ((E[1] - co_v[:, 1]) > 0.3 * r_)
            rad[f'oga_{sida}_locken_utanfor_globen_mm_min'] = round(float((np.linalg.norm(co_v[lock] - E, axis=1) - r_).min() / MM), 2)
        if mork.any() and not np.isnan(mm_).any():
            rad['munhalan_synlig_stangd'] = synligt(co_v, mm_, (0.012, 0.003), mork & hud_t)
            rad['munhalan_synlig_jawOpen'] = synligt(co_v + Dk['jawOpen'], mm_, (0.012, 0.006), mork & hud_t)
        kontroll[namn_] = rad
    rap['kontroll'] = kontroll
    print('KONTROLL', json.dumps(kontroll))

    # -- spara: figuren bort, dockan som .blend och .glb (samma inställningar som bygget)
    for o in (t_me, t_arm, cam):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)  # figurens nät, bilder och material
    d_arm.data.pose_position = 'POSE'  # som bygget sparade den (vilan sitt_vila)
    blend = utfil.with_suffix('.blend')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    tmp = utfil.with_name(utfil.stem + '.ny.glb')
    bpy.ops.export_scene.gltf(filepath=str(tmp), export_format='GLB', export_apply=True, export_animations=True, export_yup=True, use_selection=False)
    for _ in range(40):
        try:
            os.replace(tmp, utfil); break
        except PermissionError:
            time.sleep(0.25)
    rap['ben'] = len(d_arm.data.bones); rap['former'] = len(kb) - 1
    utfil.with_suffix('.json').write_text(json.dumps(rap, indent=1, ensure_ascii=False), encoding='utf-8')
    print('FORMAD', utfil)


main()
