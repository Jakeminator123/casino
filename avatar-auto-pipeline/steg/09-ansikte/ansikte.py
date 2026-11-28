"""Steg 09: ett ansikte som rör sig på en dealer från foton (Jakob 2026-11-27: Tomasz hade inga ansiktsleder och inga
ansiktsformer, och kunde varken blinka, flytta blicken eller le).

Likheten kommer från dealerns eget huvud (form och yta), rörligheten från standarddockan (new_docka.md 7.3, 7.7, 7.8):
1. Ansiktets punkter: båda huvudena renderas rakt framifrån och MediaPipe (punkter.py) läser ansiktets 478 punkter i
   bilderna; varje punkt skjuts tillbaka in i sin modell (en stråle från kameran), så att punkterna blir lägen på ytan.
   På standarddockan tas ögonspringans punkter på ögonlockets kant och munnens inre punkter på läpparna.
2. Passningen: en mjuk passning (thin plate spline, φ(r) = r) som flyttar standarddockans punkter till dealerns, efter
   en likformig passning som sorterar bort de punkter som inte stämmer. Den ställer standarddockans huvud ovanpå
   dealerns, i hans form.
3. Formerna: varje hörn i dealerns ansikte får sin närmaste punkt på standarddockans passade hud, och därmed dess 30
   ansiktsformer (samma namn), vridna och skalade med passningens lutning där (dess Jacobian). Hans yta, UV och texturer
   står kvar; formerna flyttar bara hörnen. Läpparna söks var för sig (överläppen på dockans överläpp, underläppen på
   dess underläpp), så att munnen öppnar sig i stället för att töjas; i de former som inte öppnar dockans mun hålls
   läpparna ihop. Formerna jämnas ut några varv över hans yta och avtar till noll mot sömmen till halsen.
4. Munnen: ytan skärs längs läpparnas linje (en kortaste väg i nätet, mellan mungiporna), läpparna får en kort insida
   och en mörk påse bakom (munhålan), som öppnar sig med munnen.
5. Ögonen (--ogon glob, förval): det målade ögat skärs bort innanför ögonspringan, och en glob per öga läggs bakom,
   på lederna eye.L och eye.R; globens yta visar hans egen målade ögonyta (dess UV pekar dit), så att ögat i vila ser
   ut som förut och irisen följer blicken. Ögonlocken får en insida in till globen, blinkningen är en vridning av
   locken runt globen (som på en människa), och formerna hålls utanför globen.
   Med --ogon yta skärs inget: det målade ögat trycks bakåt när locket sluts. Prövat 2026-11-27: locket når inte över
   ögat, så blinkningen sluter det inte; glob-vägen är den som används.
6. Käken: benet jaw på standarddockans käkled (passad), med standarddockans käkvikter förda till huden som formerna.
   Bara huvudets vikt delas med jaw; alla andra ben, namn, vikter, UV och texturer är orörda.

Allt nytt (globerna, munhålan, insidorna) sitter i hans huvudmaterial, så att modellen har lika många primitiver som
förut (figure-model.ts tar fingrarna ur den sista, och dealer3d/tools/modell.ts läser den första).

    blender -b --python-exit-code 1 --python steg/09-ansikte/ansikte.py -- dealer.glb ut.glb
        [--docka assets/docka/standarddocka_danilo.glb] [--ogon glob|yta] [--arbete <mapp>]
        [--mp-python <python med mediapipe>] [--mp-modell face_landmarker.task]
Arbetsmappen (förval slask/avatar-auto-pipeline/ansikte-<namn>/) får bilderna, punkterna och rapporten ansikte.json;
rapporten skrivs också bredvid ut-filen (<ut>.json). Punkterna där används igen när de är nyare än de två modellerna,
så att en omkörning inte behöver grafikkortet (renderingen sker annars under ../slask/blackjack-dealer/
gpu-och-headless.lock, som den som kör tar). Känt: närbilder visar en lätt tandad läppkant i öppen mun och en tunn
tandad linje i underlockets kant; inga tänder, ingen tunga, ingen glans i ögat; irisen är den som målades på ytan."""
import argparse, heapq, json, math, os, subprocess, sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

ROT = Path(__file__).resolve().parents[2]          # avatar-auto-pipeline
CASINO = ROT.parent
MP = CASINO / 'blackjack-dealer' / 'tools' / 'python'

# MediaPipe-punkterna (Face Landmarker, 478): ögonspringan runt (ytterhörnet, underlocket, innerhörnet, överlocket),
# läpparnas inre kant (över- och underläppen från mungipa till mungipa) och irisarna.
OGA = ([33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
       [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466])
INRE_OVER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]
INRE_UNDER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308]
IRIS = set(range(468, 478))

MM = 0.001
INST = {
    'kamera_avstand': 0.6, 'lins_mm': 85.0, 'sensor_mm': 36.0, 'bild_px': 1024,
    'tps_lambda': 2e-5,                 # passningens mjukhet (meter); större = mjukare, mindre exakt i punkterna
    'bort_om_fel_mm': 4.0,              # en punkt som efter den likformiga passningen ligger längre bort tas inte med
    'tona_mm': (4.0, 12.0),             # formerna i fullt upp till 4 mm från dockans passade hud, inget bortom 12 mm
                                        # (under hakan veckas huden i en stor jawOpen; 6-22 mm prövades och hjälpte inte)
    'lapp_band_mm': 6.0,                # hörn så nära läpparnas linje söker på rätt läpp
    'lapp_insida_mm': 4.0, 'ogon_marginal_mm': 0.3, 'oga_krymp_mm': 0.8,
    'oga_vidga_mm': 0.6,                # springan skärs så här mycket utanför MediaPipes kant, så att inget målat vitt
                                        # blir kvar på lockets kant (det dras annars ned över ögat i en blinkning)
    'jamna_varv': 8,
    'som_mm': 15.0,                     # formerna avtar till noll de sista 15 mm mot sömmen till halsen
    'glob_glapp_mm': 1.0,               # globens radie väljs så att ögonspringans kant ligger så här långt utanför den
}


def las_args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('inn'); ap.add_argument('ut')
    ap.add_argument('--docka', default=str(ROT / 'assets' / 'docka' / 'standarddocka_danilo.glb'))
    ap.add_argument('--ogon', choices=['glob', 'yta'], default='glob')
    ap.add_argument('--arbete', default=None)
    py = MP / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    ap.add_argument('--mp-python', default=os.environ.get('MEDIAPIPE_PYTHON', str(py)))
    ap.add_argument('--mp-modell', default=str(MP / 'models' / 'face_landmarker.task'))
    return ap.parse_args(a)


# ---------------------------------------------------------------- hjälp
def varld(o):
    me = o.data; co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    M = np.array(o.matrix_world); return co @ M[:3, :3].T + M[:3, 3]


def trianglar(me):
    n = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('loop_total', n)
    if not (n == 3).all():
        raise SystemExit('väntade bara trianglar (en GLB ger det)')
    v = np.empty(len(me.polygons) * 3, np.int32); me.polygons.foreach_get('vertices', v)
    return v.reshape(-1, 3)


def vikter(o, namn):
    w = np.zeros(len(o.data.vertices)); g = o.vertex_groups.get(namn)
    if g is not None:
        gi = g.index
        for v in o.data.vertices:
            for ge in v.groups:
                if ge.group == gi:
                    w[v.index] = ge.weight
    return w


def bvh(co, tris):
    return BVHTree.FromPolygons([Vector(c) for c in co], [tuple(int(x) for x in t) for t in tris], all_triangles=True)


def ytfarg(me, tris):
    """Ytornas medelfärg (ljushet) ur färgattributet, eller None."""
    if not me.color_attributes:
        return None
    at = me.color_attributes.get('Color') or me.color_attributes[0]
    c = np.empty(len(at.data) * 4); at.data.foreach_get('color', c); c = c.reshape(-1, 4)[:, :3].mean(1)
    if at.domain == 'CORNER':
        return c.reshape(-1, 3).mean(1)
    return c[tris].mean(1)


def oar(tris, nv):
    """Sammanhängande delar (union-find över trianglarnas hörn); varje hörns del."""
    p = np.arange(nv)

    def f(x):
        while p[x] != x:
            p[x] = p[p[x]]; x = p[x]
        return x
    for a, b, c in tris:
        ra, rb, rc = f(a), f(b), f(c)
        p[rb] = ra; p[f(rc)] = ra
    return np.array([f(i) for i in range(nv)])


def inuti(pts, poly):
    """Ligger punkterna (N×2) inuti polygonen (M×2)? Strålkorsning."""
    x, y = pts[:, 0][:, None], pts[:, 1][:, None]
    x1, y1 = poly[:, 0][None], poly[:, 1][None]; x2, y2 = np.roll(poly[:, 0], -1)[None], np.roll(poly[:, 1], -1)[None]
    kors = ((y1 > y) != (y2 > y)) & (x < (x2 - x1) * (y - y1) / np.where(y2 - y1 == 0, 1e-12, y2 - y1) + x1)
    return kors.sum(1) % 2 == 1


def narmast_pa_polygon(p, poly):
    best, bd = None, 1e9
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]; ab = b - a
        t = np.clip(np.dot(p - a, ab) / max(np.dot(ab, ab), 1e-18), 0, 1); q = a + t * ab; d = np.linalg.norm(p - q)
        if d < bd:
            best, bd = q, d
    return best


def avstand_till_linje(pts, lin):
    """Avståndet (2D) från punkterna till polylinjen."""
    d = np.full(len(pts), 1e9)
    for a, b in zip(lin[:-1], lin[1:]):
        ab = b - a; t = np.clip(((pts - a) @ ab) / max(ab @ ab, 1e-18), 0, 1)
        d = np.minimum(d, np.linalg.norm(pts - (a + t[:, None] * ab), axis=1))
    return d


def krymp(poly, s):
    c = poly.mean(0); r = np.linalg.norm(poly - c, axis=1, keepdims=True)
    return c + (poly - c) * np.maximum(0.05, 1 - s / np.maximum(r, 1e-9))


class TPS:
    """Mjuk passning R3 -> R3: f(x) = A0 + x A1 + Σ W_i |x - X_i|."""

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


# ---------------------------------------------------------------- inläsning
def importera(path):
    fore = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    nya = [o for o in bpy.data.objects if o not in fore]
    arm = next(o for o in nya if o.type == 'ARMATURE')
    mesh = next(o for o in nya if o.type == 'MESH' and o.find_armature() == arm)
    for o in nya:
        if o not in (arm, mesh):
            bpy.data.objects.remove(o)
    arm.data.pose_position = 'REST'
    if arm.animation_data:
        arm.animation_data.action = None
    return arm, mesh


# ---------------------------------------------------------------- 1. punkterna
def kamera_for(mesh):
    co = varld(mesh); hv = co[vikter(mesh, 'Head') > 0.5]
    cx = (hv[:, 0].min() + hv[:, 0].max()) / 2; cz = hv[:, 2].min() + 0.45 * np.ptp(hv[:, 2])
    return {'loc': Vector((cx, hv[:, 1].min() - INST['kamera_avstand'], cz)), 'rot': Euler((math.pi / 2, 0, 0)).to_matrix()}


def rendera_fram(mesh, kam, fil, farg):
    sc = bpy.context.scene
    cam = sc.camera
    cam.matrix_world = Matrix.Translation(kam['loc']) @ kam['rot'].to_4x4()
    for o in sc.objects:
        o.hide_render = o.type == 'MESH' and o is not mesh
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading; sh.light = 'STUDIO'
    sh.color_type = farg
    sc.render.resolution_x = sc.render.resolution_y = INST['bild_px']; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = str(fil)
    bpy.ops.render.render(write_still=True)


def stral(kam, u, v):
    k = INST['sensor_mm'] / INST['lins_mm']
    return kam['loc'], (kam['rot'] @ Vector(((u - 0.5) * k, (0.5 - v) * k, -1.0))).normalized()


def punkter_3d(lm, kam, tree, alltid=()):
    """Punkterna på ytan; en stråle som bara snuddar ytan räknas inte, utom för punkterna i `alltid`."""
    ut = np.full((len(lm), 3), np.nan)
    for i, (u, v, _) in enumerate(lm):
        o, d = stral(kam, u, v); loc, nor, fi, _ = tree.ray_cast(o, d)
        if loc is not None and (abs(nor.dot(d)) > 0.25 or i in alltid):
            ut[i] = loc
    return ut


# ---------------------------------------------------------------- huvudet
def main():
    A = las_args()
    inn, utfil = Path(A.inn).resolve(), Path(A.ut).resolve()
    arb = Path(A.arbete).resolve() if A.arbete else CASINO / 'slask' / 'avatar-auto-pipeline' / f'ansikte-{utfil.stem}'
    arb.mkdir(parents=True, exist_ok=True)
    rap = {'in': str(inn), 'ut': str(utfil), 'docka': str(Path(A.docka).resolve()), 'ogon': A.ogon, 'installningar': INST}

    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    cam = bpy.data.objects.new('kam', bpy.data.cameras.new('kam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = INST['lins_mm']; cam.data.sensor_width = INST['sensor_mm']; cam.data.sensor_fit = 'AUTO'
    sc.world = bpy.data.worlds.new('v'); sc.world.color = (0.35, 0.35, 0.35)
    d_arm, d_me = importera(A.docka)
    t_arm, t_me = importera(inn)
    for o in (t_me, t_arm):
        if not np.allclose(np.array(o.matrix_world), np.eye(4), atol=1e-6):
            raise SystemExit(f'{o.name}: väntade en dealer utan flytt eller vridning (som steg 06 ger)')

    # -- standarddockan: huden (största delen, utan munhålan), dess former och käkvikter
    dco = varld(d_me); dtri = trianglar(d_me.data)
    # GLB:n delar hörnen där UV eller färg byter; hörn på samma ställe räknas som ett för delarna och kanterna
    _, wid = np.unique(np.round(dco / 1e-7).astype(np.int64), axis=0, return_inverse=True); wid = wid.ravel()
    wtri = wid[dtri]
    del_av = oar(wtri, int(wid.max()) + 1)[wid]; storst = np.bincount(del_av).argmax()
    ljus = ytfarg(d_me.data, dtri)
    hud_t = del_av[dtri[:, 0]] == storst
    if ljus is not None:
        hud_t &= ljus > 0.1
    hud_tri = dtri[hud_t]
    if t_me.data.color_attributes:
        at = t_me.data.color_attributes[0]; c = np.empty(len(at.data) * 4); at.data.foreach_get('color', c); c = c.reshape(-1, 4)
        rap['dealerns_farg'] = {'namn': at.name, 'domain': at.domain, 'typ': at.data_type, 'min': np.round(c.min(0), 3).tolist(),
                                'medel': np.round(c.mean(0), 3).tolist()}
    kb = d_me.data.shape_keys.key_blocks; ref = kb[0]
    FORMER = [k.name for k in kb if k != ref]
    bas = np.empty(len(dco) * 3); ref.data.foreach_get('co', bas); bas = bas.reshape(-1, 3)
    M3 = np.array(d_me.matrix_world)[:3, :3]
    DD = np.zeros((len(FORMER), len(dco), 3))
    for i, n in enumerate(FORMER):
        c = np.empty(len(dco) * 3); kb[n].data.foreach_get('co', c); DD[i] = (c.reshape(-1, 3) - bas) @ M3.T
    d_jaw = vikter(d_me, 'jaw')
    aktiv = np.abs(DD).max((0, 2)) > 1e-5
    rap['docka'] = {'horn': len(dco), 'hudens_trianglar': int(hud_t.sum()), 'former': FORMER,
                    'horn_som_formerna_flyttar': int(aktiv.sum())}
    if len(FORMER) != 30:
        raise SystemExit(f'standarddockan har {len(FORMER)} former, väntade 30')

    # -- rendera båda rakt framifrån och läs punkterna
    if d_me.data.color_attributes:
        d_me.data.color_attributes.active_color = d_me.data.color_attributes.get('Color') or d_me.data.color_attributes[0]
    kam_d, kam_t = kamera_for(d_me), kamera_for(t_me)
    bild_d, bild_t = arb / 'fram-docka.png', arb / 'fram-dealer.png'
    pj = arb / 'punkter.json'
    # punkterna från en tidigare körning med samma två modeller används igen (renderingen kräver grafikkortet)
    nya_nog = pj.exists() and pj.stat().st_mtime > max(inn.stat().st_mtime, Path(A.docka).stat().st_mtime)
    rap['punkter_aterbrukade'] = bool(nya_nog)
    r = None
    if not nya_nog:
        rendera_fram(d_me, kam_d, bild_d, 'VERTEX')
        rendera_fram(t_me, kam_t, bild_t, 'TEXTURE')
        r = subprocess.run([A.mp_python, str(Path(__file__).with_name('punkter.py')), '--modell', A.mp_modell, '--ut', str(pj),
                            str(bild_d), str(bild_t)], capture_output=True, text=True)
        if r.returncode:
            raise SystemExit('punkter.py föll:\n' + r.stdout + r.stderr)
    lm = json.loads(pj.read_text(encoding='utf-8'))
    if not lm.get(bild_d.name) or not lm.get(bild_t.name):
        raise SystemExit(f'MediaPipe hittade inget ansikte: {r.stdout if r else pj}')

    tco = varld(t_me); ttri = trianglar(t_me.data)
    d_tree = bvh(dco, hud_tri)
    P_d = punkter_3d(lm[bild_d.name], kam_d, d_tree)
    P_t = punkter_3d(lm[bild_t.name], kam_t, bvh(tco, ttri), alltid=set(OGA[0] + OGA[1] + INRE_OVER + INRE_UNDER) | IRIS)
    # dockans ögonspringa och läppar: huden viker in bakom ögonlocket och in i munnen, så en stråle vid kanten kan gå
    # förbi den; punkten blir i stället det synliga hudhörn (sett från kameran) som ligger närmast strålen
    ogon_d = [np.array(d_arm.matrix_world @ d_arm.data.bones[f'eye.{s}'].head_local) for s in ('L', 'R')]
    allt = bvh(dco, dtri); ko = np.array(kam_d['loc'])
    mun_d = P_d[13] if not np.isnan(P_d[13]).any() else P_d[0]
    hudv = np.unique(hud_tri)
    nara_d = hudv[(np.min([np.linalg.norm(dco[hudv] - e, axis=1) for e in ogon_d], axis=0) < 0.03)
                  | (np.linalg.norm(dco[hudv] - mun_d, axis=1) < 0.035)]
    synlig = []
    for v in nara_d:
        rikt = Vector(dco[v] - ko); loc = allt.ray_cast(Vector(ko), rikt.normalized())[0]
        if loc is not None and (loc - Vector(dco[v])).length < 0.4 * MM:
            synlig.append(v)
    synlig = np.array(synlig, int); horn_d = {}
    for i in [i for o in OGA for i in o] + INRE_OVER + INRE_UNDER:
        o, d = stral(kam_d, *lm[bild_d.name][i][:2]); o, d = np.array(o), np.array(d)
        q = dco[synlig] - o; t = q @ d; vinkel = np.linalg.norm(q - t[:, None] * d, axis=1)
        j = vinkel.argmin()
        P_d[i] = dco[synlig[j]] if vinkel[j] < 2.5 * MM else np.nan
        horn_d[i] = int(synlig[j])
    # vilka former öppnar dockans mun: läpparnas inre kant isär (över minus under, uppåt), mitt på munnen
    par = [(horn_d[a], horn_d[b]) for a, b in zip(INRE_OVER[2:-2], INRE_UNDER[2:-2])]
    oppnar = {n: float(np.mean([(DD[k][a] - DD[k][b])[2] for a, b in par])) for k, n in enumerate(FORMER)}
    rap['munnen_oppnas_mm'] = {n: round(v / MM, 2) for n, v in oppnar.items() if abs(v) > 0.3 * MM}
    ok = ~np.isnan(P_d).any(1) & ~np.isnan(P_t).any(1)
    ok[list(IRIS)] = False
    s, R, tr = likform(P_d[ok], P_t[ok])
    fel = np.linalg.norm(P_d @ (s * R).T + tr - P_t, axis=1)
    gran = max(INST['bort_om_fel_mm'] * MM, 3 * np.nanmedian(fel[ok]))
    ok2 = ok & (fel < gran)
    X, Y = P_d[ok2], P_t[ok2]
    tps = TPS(X, Y, INST['tps_lambda'])
    rest = np.linalg.norm(tps(X) - Y, axis=1)
    rap['punkter'] = {'traffar_docka': int((~np.isnan(P_d).any(1)).sum()), 'traffar_dealer': int((~np.isnan(P_t).any(1)).sum()),
                      'par': int(ok.sum()), 'anvanda': int(ok2.sum()), 'skala_likform': round(float(s), 4),
                      'fel_likform_mm_median': round(float(np.median(fel[ok]) / MM), 2),
                      'fel_tps_mm_median_max': [round(float(np.median(rest) / MM), 3), round(float(rest.max() / MM), 3)]}
    print('PUNKTER', json.dumps(rap['punkter']))

    # dockans hud passad till dealerns huvud (bara det formerna rör, med marginal)
    nara = np.zeros(len(dco), bool)
    lo, hi = dco[aktiv].min(0) - 0.02, dco[aktiv].max(0) + 0.02
    nara = ((dco >= lo) & (dco <= hi)).all(1)
    pass_co = np.zeros_like(dco); pass_co[nara] = tps(dco[nara])
    pass_tri = hud_tri[nara[hud_tri].all(1)]
    # dockans underläpp: det jawOpen för nedåt mer än en tredjedel av hakan
    jo = DD[FORMER.index('jawOpen')][:, 2]; under_d = (jo < 0.33 * jo.min()).astype(float)
    ut_tri = under_d[pass_tri].mean(1) >= 0.5
    trad = {'alla': bvh(pass_co, pass_tri), 'over': bvh(pass_co, pass_tri[~ut_tri]), 'under': bvh(pass_co, pass_tri[ut_tri])}
    tri_av = {'alla': pass_tri, 'over': pass_tri[~ut_tri], 'under': pass_tri[ut_tri]}

    # -- dealerns ansikte: ögonspringorna och läpparnas linje (hans punkter, i världen = hans mesh)
    me = t_me.data
    huvud_mat = next(i for i, m in enumerate(me.materials) if m and m.name.lower().startswith('huvud')) \
        if any(m and m.name.lower().startswith('huvud') for m in me.materials) else None
    cx_t = float(kam_t['loc'].x)
    ogon = {}
    for o in OGA:
        poly3 = P_t[o]
        if np.isnan(poly3).any():
            raise SystemExit('ögonspringan saknar punkter på dealern')
        sida = 'L' if poly3[:, 0].mean() > cx_t else 'R'
        iris = [P_t[i] for i in (468, 473) if not np.isnan(P_t[i]).any() and inuti(P_t[i][[0, 2]][None], poly3[:, [0, 2]])[0]]
        ogon[sida] = {'poly3': poly3, 'poly': poly3[:, [0, 2]], 'pupill': iris[0] if iris else None}
    som_over = np.array([P_t[a] for a in INRE_OVER]); sum_under = np.array([P_t[a] for a in INRE_UNDER])
    if np.isnan(som_over).any() or np.isnan(sum_under).any():
        raise SystemExit('läpparnas inre kant saknar punkter på dealern')
    som = (som_over + sum_under) / 2   # läpparnas linje, från mungipa till mungipa

    # -- hans ursprungliga ögonyta (för globens UV) innan något skärs
    uv_l = me.uv_layers.active
    tuv = np.empty(len(me.loops) * 2); uv_l.data.foreach_get('uv', tuv); tuv = tuv.reshape(-1, 3, 2)
    cen = np.empty(len(me.polygons) * 3); me.polygons.foreach_get('center', cen); cen = cen.reshape(-1, 3)
    nor = np.empty(len(me.polygons) * 3); me.polygons.foreach_get('normal', nor); nor = nor.reshape(-1, 3)
    for sida, E in ogon.items():
        ry = E['poly3'][:, 1].mean()
        fram = (nor[:, 1] < 0.3) & (np.abs(cen[:, 1] - ry) < 0.012)
        kring = np.nonzero(fram & inuti(cen[:, [0, 2]], krymp(E['poly'], -2.5 * MM)))[0]
        E['yta_tri'] = kring; E['yta'] = bvh(tco, ttri[kring])
        if E['pupill'] is None:
            c2 = E['poly'].mean(0); hit = E['yta'].ray_cast(Vector((c2[0], ry - 0.1, c2[1])), Vector((0, 1, 0)))
            E['pupill'] = np.array(hit[0])
        # globen: mitten bakom pupillen (pupillen på globens yta), radien så att springans kant ligger glapp utanför
        best = None
        for rr in np.arange(9.0, 18.01, 0.1) * MM:
            c = E['pupill'] + np.array([0, rr, 0]); g = np.linalg.norm(E['poly3'] - c, axis=1) - rr
            kost = ((g - INST['glob_glapp_mm'] * MM) ** 2).mean() + (100 * min(0, g.min() - 0.1 * MM)) ** 2
            if best is None or kost < best[0]:
                best = (kost, rr, c, g)
        _, E['r'], E['c'], g = best
        E['glapp_mm'] = [round(float(g.min() / MM), 2), round(float(np.median(g) / MM), 2), round(float(g.max() / MM), 2)]
    # dockans ögonmitt, passad, för jämförelse
    for sida, e in zip(('L', 'R'), ogon_d):
        ogon[sida]['dockans_mitt_passad'] = tps(e[None])[0]
    rap['ogon'] = {s: {'radie_mm': round(E['r'] / MM, 2), 'mitt': np.round(E['c'], 4).tolist(), 'glapp_kant_mm_min_median_max': E['glapp_mm'],
                       'dockans_ogonmitt_passad': np.round(E['dockans_mitt_passad'], 4).tolist(),
                       'skillnad_mot_dockans_mm': round(float(np.linalg.norm(E['c'] - E['dockans_mitt_passad']) / MM), 1)}
                   for s, E in ogon.items()}
    print('OGON', json.dumps(rap['ogon']))

    # -- mörk punkt i hans huvudtextur (munhålan)
    mork_uv = morkaste_uv(me.materials[huvud_mat]) if huvud_mat is not None else (0.0, 0.0)
    rap['munhalans_uv'] = [round(x, 4) for x in mork_uv]

    # ---------------------------------------------------------------- 2. skära, sy och lägga till (bmesh)
    for n in ('jaw', 'eye.L', 'eye.R'):
        if t_me.vertex_groups.get(n) is None:
            t_me.vertex_groups.new(name=n)
    gi = {g.name: g.index for g in t_me.vertex_groups}
    n0 = len(me.vertices)
    bm = bmesh.new(); bm.from_mesh(me)
    # hörn som GLB:n delade vid UV-sömmar (samma läge) blir ett i ansiktet, så att läpparna och ögonen kan skäras rent;
    # UV:n står kvar i hörnen (ytornas hörn), och exporten delar dem igen där UV:n byter
    lo_f, hi_f = pass_co[nara].min(0) - 0.015, pass_co[nara].max(0) + 0.015
    svets = [v for v in bm.verts if all(lo_f[i] <= v.co[i] <= hi_f[i] for i in range(3))
             and v.link_faces and all(f.material_index == huvud_mat for f in v.link_faces)]   # bara huvudets yta
    fore_svets = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=svets, dist=1e-7)
    rap['svetsade_horn'] = fore_svets - len(bm.verts)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table(); bm.verts.index_update(); bm.faces.index_update()
    uvl = bm.loops.layers.uv.active; dfl = bm.verts.layers.deform.verify()
    fargl = None
    if me.color_attributes:
        at = me.color_attributes[0]
        lag = bm.loops.layers if at.domain == 'CORNER' else bm.verts.layers
        fargl = (at.domain, (lag.float_color if at.data_type == 'FLOAT_COLOR' else lag.color).get(at.name))
    sort = {}   # ny BMVert -> ('flik', källa) | ('glob', sida) | ('pase_o' | 'pase_u' | 'pase_mitt', (överläpp, underläpp))

    def satt_farg(v_eller_loopar, c):
        if fargl is None or fargl[1] is None:
            return
        if fargl[0] == 'CORNER':
            for l in v_eller_loopar:
                l[fargl[1]] = c
        else:
            v_eller_loopar[fargl[1]] = c

    def flik(kanter, flytta):
        """En kort insida bakom en skuren kant: varje kant får en fyrhörning bakåt, med vikterna från kanten och UV:n
        från ytan strax utanför kanten (hud eller läpp, inte den målade kanten)."""
        nya = {}
        for e in kanter:
            f = e.link_faces[0]
            l = next(l for l in f.loops if l.edge == e); a, b = l.vert, l.link_loop_next.vert
            lc = l.link_loop_next.link_loop_next
            uva, uvb, uvc = l[uvl].uv.copy(), l.link_loop_next[uvl].uv.copy(), lc[uvl].uv.copy()
            fa = fb = None
            if fargl and fargl[0] == 'CORNER' and fargl[1] is not None:
                fa, fb = tuple(l[fargl[1]]), tuple(l.link_loop_next[fargl[1]])
            for v in (a, b):
                if v not in nya:
                    nv = bm.verts.new(flytta(v)); nya[v] = nv; sort[nv] = ('flik', v)
                    for g, w in v[dfl].items():
                        nv[dfl][g] = w
                    if fargl and fargl[0] == 'POINT' and fargl[1] is not None:
                        nv[fargl[1]] = v[fargl[1]]
            try:
                nf = bm.faces.new((b, a, nya[a], nya[b]))
            except ValueError:
                continue
            nf.material_index = f.material_index; nf.smooth = f.smooth
            for lo, uv, fc in zip(nf.loops, (uvb, uva, uvc, uvc), (fb, fa, fa, fb)):
                lo[uvl].uv = uv
                if fc is not None:
                    lo[fargl[1]] = fc
        return nya

    fore_kant = {e for e in bm.edges if len(e.link_faces) == 1}
    # -- ögonen: ytorna innanför ögonspringan, rakt framifrån
    fcen = np.array([f.calc_center_median() for f in bm.faces]); fnor = np.array([f.normal for f in bm.faces])
    for sida, E in ogon.items():
        ry = E['poly3'][:, 1].mean()
        E['bort'] = np.nonzero((fnor[:, 1] < 0.3) & (np.abs(fcen[:, 1] - ry) < 0.012)
                               & inuti(fcen[:, [0, 2]], krymp(E['poly'], -INST['oga_vidga_mm'] * MM)))[0]
        rap['ogon'][sida]['ytor_bort'] = int(len(E['bort']))
        E['bort_ytor'] = [bm.faces[i] for i in E['bort']]   # som ytor, innan något tas bort (indexen flyttar sig)
    if A.ogon == 'glob':
        for sida, E in ogon.items():
            bort = E['bort_ytor']
            rorda = {v for f in bort for v in f.verts}
            bmesh.ops.delete(bm, geom=bort, context='FACES_ONLY')
            losa = [v for v in rorda if not v.link_faces]
            bmesh.ops.delete(bm, geom=losa, context='VERTS')
            rorda = {v for v in rorda if v.is_valid}
            kanter = [e for e in bm.edges if len(e.link_faces) == 1 and e not in fore_kant and all(v in rorda for v in e.verts)]
            # kanten följer springans kurva (högst 0,8 mm flytt, kvar på ytan), i stället för trianglarnas sågtand
            vidgad = krymp(E['poly'], -INST['oga_vidga_mm'] * MM); flyttade = 0
            for v in {v for e in kanter for v in e.verts}:
                p = np.array([v.co.x, v.co.z]); q = narmast_pa_polygon(p, vidgad); d = q - p; L = np.linalg.norm(d)
                if L > 1e-6:
                    q = p + d * min(1.0, 0.8 * MM / L)
                    hit = E['yta'].ray_cast(Vector((q[0], v.co.y - 0.02, q[1])), Vector((0, 1, 0)))[0]
                    v.co = Vector((q[0], hit.y if hit is not None else v.co.y, q[1])); flyttade += 1
            rap['ogon'][sida]['kantens_horn_utjamnade'] = flyttade
            c = Vector(E['c']); rin = E['r'] - INST['ogon_marginal_mm'] * MM

            def mot_globen(v, c=c, rin=rin):   # ända in till globen, också i ögonvrårna där glappet är störst
                d = v.co - c
                return c + d.normalized() * rin if d.length > rin else v.co.copy()
            E['flik'] = flik(kanter, mot_globen)
            E['kanter'] = len(kanter)
            bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    # -- munnen: kortaste vägen längs läpparnas linje, mellan mungiporna, och skär där
    bm.verts.index_update(); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    co_b = np.array([v.co for v in bm.verts])
    nor_b = np.array([v.normal for v in bm.verts])
    sy = float(som[:, 1].mean())
    d2 = avstand_till_linje(co_b[:, [0, 2]], som[:, [0, 2]])
    zon = (d2 < 3 * MM) & (np.abs(co_b[:, 1] - sy) < 0.012) & (nor_b[:, 1] < 0.5)
    zi = np.nonzero(zon)[0]
    start = zi[np.linalg.norm(co_b[zi] - som[0], axis=1).argmin()]; slut = zi[np.linalg.norm(co_b[zi] - som[-1], axis=1).argmin()]
    # hörn som ligger på varandra (UV-sömmar) räknas som ett
    nyckel = {}
    for i in zi:
        nyckel.setdefault(tuple(np.round(co_b[i] / 1e-6).astype(np.int64)), []).append(i)
    dist = {start: 0.0}; fran = {}; hog = [(0.0, start)]; zs = set(zi.tolist())
    while hog:
        dd, i = heapq.heappop(hog)
        if i == slut:
            break
        if dd > dist.get(i, 1e9):
            continue
        v = bm.verts[i]
        grannar = [(e.other_vert(v).index, e) for e in v.link_edges]
        grannar += [(j, None) for j in nyckel.get(tuple(np.round(co_b[i] / 1e-6).astype(np.int64)), []) if j != i]
        for j, e in grannar:
            if j not in zs:
                continue
            if e is None:
                k = 0.0
            else:
                m = (co_b[i] + co_b[j]) / 2
                k = np.linalg.norm(co_b[i] - co_b[j]) * (1 + (avstand_till_linje(m[None, [0, 2]], som[:, [0, 2]])[0] / (0.5 * MM)) ** 2)
            if dd + k < dist.get(j, 1e9):
                dist[j] = dd + k; fran[j] = (i, e); heapq.heappush(hog, (dd + k, j))
    if slut not in fran:
        raise SystemExit('hittade ingen väg längs läpparna')
    vag, kantvag, svetsar = [slut], [], 0
    while vag[-1] != start:
        i, e = fran[vag[-1]]; vag.append(i)
        if e is None:
            svetsar += 1
        else:
            kantvag.append(e)
    vagv = {bm.verts[i] for i in vag}
    bmesh.ops.split_edges(bm, edges=kantvag)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    # läpparnas sida: över eller under linjen (linjens höjd vid hörnets x)
    ordn = np.argsort(som[:, 0]); lx, lz = som[ordn, 0], som[ordn, 2]

    def under_linjen(p):
        return p[2] < np.interp(p[0], lx, lz)
    # läpparnas kanter: kanter med en yta vars båda hörn ligger på vägens lägen
    vagpos = np.array([co_b[i] for i in vag])
    lapp_kanter = []
    for e in bm.edges:
        if len(e.link_faces) != 1 or e in fore_kant:
            continue
        p = np.array([v.co for v in e.verts])
        if np.min(np.linalg.norm(vagpos[None] - p[:, None], axis=2), axis=1).max() < 1e-7:
            lapp_kanter.append(e)
    sida_v = {}
    for e in lapp_kanter:
        f = e.link_faces[0]; u = under_linjen(np.array(f.calc_center_median()))
        for v in e.verts:
            sida_v.setdefault(v, []).append(u)
    lapp_flik = flik(lapp_kanter, lambda v: v.co + Vector((0, INST['lapp_insida_mm'] * MM, 0)))
    # munhålan: en påse bakom läpparnas insidor, från mungipa till mungipa, med överdelen på överläppen och underdelen
    # på underläppen och botten mitt emellan, så att den öppnar sig med munnen och man ser mörker i stället för huvudets
    # insida; i vila är den nästan platt och dold bakom läpparna
    def plats(p):
        return tuple(np.round(np.array(p) / 1e-7).astype(np.int64))
    pa_plats = {}
    for v in sida_v:
        pa_plats.setdefault(plats(v.co), []).append(v)
    kedja = []
    for i in reversed(vag):
        vs = pa_plats.get(plats(co_b[i]), [])
        if not vs:
            continue
        o = [v for v in vs if sum(sida_v[v]) * 2 <= len(sida_v[v])]; u = [v for v in vs if sum(sida_v[v]) * 2 > len(sida_v[v])]
        kedja.append((o[0] if o else vs[0], u[0] if u else vs[0]))
    K = len(kedja) - 1; pase_ytor = []

    def pase_horn(p, kalla_o, kalla_u, vad):
        nv = bm.verts.new(Vector(p)); sort[nv] = (vad, (kalla_o, kalla_u))
        for g, w in kalla_o[dfl].items():
            nv[dfl][g] = w
        return nv
    rad_o, rad_u, botten = [], [], []
    for k, (vo, vu) in enumerate(kedja):
        fo, fu = lapp_flik.get(vo), lapp_flik.get(vu)
        if fo is None or fu is None:
            raise SystemExit('läpparnas insida saknas vid ett hörn av snittet')
        tap = math.sin(math.pi * k / K) if K else 0.0
        if tap < 1e-6:
            n = pase_horn(fo.co + Vector((0, 6 * MM, 0)), vo, vu, 'pase_mitt'); rad_o.append(n); rad_u.append(n)
        else:
            rad_o.append(pase_horn(fo.co + Vector((0, 6 * MM, 4 * MM * tap)), vo, vo, 'pase_o'))
            rad_u.append(pase_horn(fu.co + Vector((0, 6 * MM, -4 * MM * tap)), vu, vu, 'pase_u'))
        botten.append(pase_horn((fo.co + fu.co) / 2 + Vector((0, (6 + 12 * (0.35 + 0.65 * tap)) * MM, 0)), vo, vu, 'pase_mitt'))
    for k in range(K):
        fo0, fo1 = lapp_flik[kedja[k][0]], lapp_flik[kedja[k + 1][0]]; fu0, fu1 = lapp_flik[kedja[k][1]], lapp_flik[kedja[k + 1][1]]
        for kv in ((fo0, fo1, rad_o[k + 1], rad_o[k]), (rad_o[k], rad_o[k + 1], botten[k + 1], botten[k]),
                   (fu1, fu0, rad_u[k], rad_u[k + 1]), (rad_u[k + 1], rad_u[k], botten[k], botten[k + 1])):
            kv = [x for j, x in enumerate(kv) if x not in kv[:j]]
            if len(kv) >= 3:
                try:
                    pase_ytor.append(bm.faces.new(kv))
                except ValueError:
                    pass
    for fc in pase_ytor:
        fc.material_index = huvud_mat; fc.smooth = True
        for l in fc.loops:
            l[uvl].uv = Vector(mork_uv)
    rap['munnen'] = {'vagens_horn': len(vag), 'kanter_skurna': len(kantvag), 'over_uv_somm': svetsar,
                     'lappkanter': len(lapp_kanter), 'bredd_mm': round(float(np.linalg.norm(som[-1] - som[0]) / MM), 1),
                     'pasens_ytor': len(pase_ytor)}
    print('MUNNEN', json.dumps(rap['munnen']))

    # -- globerna
    if A.ogon == 'glob':
        for sida, E in ogon.items():
            E['glob'] = glob(bm, E, sida, tco, ttri, tuv, huvud_mat, uvl, dfl, gi, sort)
    bm.verts.index_update()
    for E in ogon.values():
        E['rim_idx'] = [v.index for v in E.get('flik', {})]
    somm = np.array([v.index for v in sida_v], int)
    # färgen på allt nytt: vitt (globen och munhålan får sin färg ur texturen), insidorna kantens
    for v, (vad, _) in sort.items():
        if vad == 'glob' or vad.startswith('pase'):
            if fargl and fargl[0] == 'POINT':
                satt_farg(v, (1, 1, 1, 1))
            else:
                for f in v.link_faces:
                    satt_farg([l for l in f.loops if l.vert == v], (1, 1, 1, 1))
    bm.to_mesh(me); me.update()
    N = len(me.vertices)
    rap['horn'] = {'fore': n0, 'efter': N}

    # ---------------------------------------------------------------- 3. benen
    bpy.context.view_layer.objects.active = t_arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = t_arm.data.edit_bones; hb = eb['Head']
    jh, jt = tps(np.array([d_arm.matrix_world @ d_arm.data.bones['jaw'].head_local, d_arm.matrix_world @ d_arm.data.bones['jaw'].tail_local]))
    nyben = {'jaw': (jh, jt)}
    for sida, E in ogon.items():
        nyben[f'eye.{sida}'] = (E['c'], E['c'] + np.array([0, -0.075, 0]))
    for n, (h, t) in nyben.items():
        b = eb.get(n) or eb.new(n); b.head = Vector(h); b.tail = Vector(t); b.parent = hb; b.use_deform = True; b.roll = 0
    bpy.ops.object.mode_set(mode='OBJECT')
    rap['nya_ben'] = {n: {'huvud': np.round(h, 4).tolist(), 'svans': np.round(t, 4).tolist()} for n, (h, t) in nyben.items()}

    # ---------------------------------------------------------------- 4. formerna och käkvikterna
    co = varld(t_me); head_w = vikter(t_me, 'Head')
    D = np.zeros((len(FORMER), N, 3)); jawv = np.zeros(N)
    kind = np.zeros(N, np.int8); kalla = np.full(N, -1); kalla2 = np.full(N, -1)
    for v, (vad, k) in sort.items():
        kind[v.index] = 1 if vad == 'flik' else 2 if vad == 'glob' else 3
        if vad == 'flik':
            kalla[v.index] = k.index
        elif vad.startswith('pase'):
            kalla[v.index], kalla2[v.index] = k[0].index, k[1].index
    sida = np.zeros(N, np.int8)   # 1 överläppen, 2 underläppen
    d_lin = avstand_till_linje(co[:, [0, 2]], som[:, [0, 2]])
    band = (d_lin < INST['lapp_band_mm'] * MM) & (np.abs(co[:, 1] - sy) < 0.012) & (co[:, 0] > lx[0] - 3 * MM) & (co[:, 0] < lx[-1] + 3 * MM)
    for i in np.nonzero(band)[0]:
        sida[i] = 2 if under_linjen(co[i]) else 1
    for v, us in sida_v.items():
        sida[v.index] = 2 if sum(us) * 2 > len(us) else 1
    for nv, (vad, k) in sort.items():
        if vad == 'flik' and sida[k.index]:
            sida[nv.index] = sida[k.index]
    lo_t, hi_t = pass_co[nara].min(0) - 0.015, pass_co[nara].max(0) + 0.015
    kand = np.nonzero((kind == 0) & (head_w > 0) & ((co >= lo_t) & (co <= hi_t)).all(1))[0]
    t0, t1 = INST['tona_mm'][0] * MM, INST['tona_mm'][1] * MM
    pre = np.zeros((len(kand), 3)); bar = np.zeros((len(kand), 3)); tri_i = np.zeros((len(kand), 3), int); avst = np.zeros(len(kand))
    for n, i in enumerate(kand):
        vilket = {0: 'alla', 1: 'over', 2: 'under'}[int(sida[i])]
        loc, _, fi, dd = trad[vilket].find_nearest(Vector(co[i]))
        if loc is None:
            avst[n] = 1e9; continue
        t = tri_av[vilket][fi]; w = poly_3d_calc([Vector(pass_co[j]) for j in t], loc)
        tri_i[n] = t; bar[n] = w; pre[n] = (dco[t] * np.array(w)[:, None]).sum(0); avst[n] = dd
    tona = np.clip((t1 - avst) / (t1 - t0), 0, 1); tona = tona * tona * (3 - 2 * tona)
    # huvudet sitter i halsen i en söm (andra material, som inte rör sig): formerna avtar till noll mot den, så att
    # sömmen aldrig glipar (under hakan ligger den nära)
    from mathutils.kdtree import KDTree
    pmat = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('material_index', pmat)
    ploop = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('loop_total', ploop)
    pv = np.empty(len(me.loops), np.int32); me.polygons.foreach_get('vertices', pv)
    rör = np.zeros(N, bool); rör[pv[np.repeat(pmat == huvud_mat, ploop)]] = True
    stilla = np.nonzero(~rör & ((co >= lo_t - 0.03) & (co <= hi_t + 0.03)).all(1))[0]
    som_fade = np.ones(len(kand))
    if len(stilla):
        kd = KDTree(len(stilla))
        for j, i in enumerate(stilla):
            kd.insert(co[i], j)
        kd.balance()
        ds = np.array([kd.find(co[i])[2] for i in kand])
        som_fade = np.clip(ds / (INST['som_mm'] * MM), 0, 1); som_fade = som_fade * som_fade * (3 - 2 * som_fade)
    tona = tona * som_fade
    rap['halssommen'] = {'stilla_horn': int(len(stilla)), 'horn_som_tonas': int((som_fade < 1).sum())}
    J = tps.jac(pre)
    # passningens lutning hålls nära en likformig skalning (0,75-1,35 längs varje axel), så att en form aldrig blåses upp
    # där passningen viker sig (utanför punkterna)
    U_, S_, Vt_ = np.linalg.svd(J); sv = S_[tona > 0]
    J = U_ @ (np.clip(S_, 0.75, 1.35)[..., None] * Vt_)
    rap['lutning'] = {'singularvarden_p5_median_p95': [round(float(np.percentile(sv, 5)), 3), round(float(np.median(sv)), 3),
                                                       round(float(np.percentile(sv, 95)), 3)] if len(sv) else None,
                      'andel_klippta': round(float(((sv < 0.75) | (sv > 1.35)).mean()), 4) if len(sv) else None}
    for k in range(len(FORMER)):
        dm = (DD[k][tri_i] * bar[..., None]).sum(1)
        D[k, kand] = np.einsum('mab,mb->ma', J, dm) * tona[:, None]
    jawv[kand] = (d_jaw[tri_i] * bar).sum(1) * tona
    # formerna jämnas ut över hans yta (grannarnas medel, några varv): dockans grova nät har skarpa övergångar som
    # annars samlas på några få av hans små trianglar och syns som en mörk skåra; snitten (läpparna, ögonen) delar
    # ytan, så de jämnas inte ihop
    ev = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get('vertices', ev); ev = ev.reshape(-1, 2)
    i_k = np.zeros(N, bool); i_k[kand] = True; ev = ev[i_k[ev].all(1)]
    grad = np.bincount(ev.ravel(), minlength=N).astype(float)
    nz = grad > 0
    for k in range(len(FORMER)):
        for _ in range(INST['jamna_varv']):
            s_ = np.zeros((N, 3)); np.add.at(s_, ev[:, 0], D[k, ev[:, 1]]); np.add.at(s_, ev[:, 1], D[k, ev[:, 0]])
            D[k, nz] = 0.5 * D[k, nz] + 0.5 * s_[nz] / grad[nz, None]
    D[:, kand] *= som_fade[None, :, None]   # utjämningen får inte föra rörelse ut i halssömmen
    # läpparna hålls ihop i de former som inte öppnar dockans mun: båda sidor av snittet får sitt medelvärde, och huden
    # intill (inom 3 mm från linjen) tonas mot det; jawOpen och de andra som öppnar munnen behåller var sin läpp
    if len(somm):
        P = co[somm]
        _, grupp = np.unique(np.round(P / 1e-7).astype(np.int64), axis=0, return_inverse=True); grupp = grupp.ravel()
        nb = np.nonzero((kind == 0) & (sida > 0) & (d_lin < 3 * MM))[0]
        nn = np.argmin(np.linalg.norm(co[nb][:, None] - P[None], axis=2), axis=1)
        s_b = np.clip(d_lin[nb] / (3 * MM), 0, 1); s_b = s_b * s_b * (3 - 2 * s_b)
        ihop = []
        for k, n in enumerate(FORMER):
            if abs(oppnar[n]) > 1.5 * MM:
                continue
            ihop.append(n)
            medel = np.zeros((grupp.max() + 1, 3)); np.add.at(medel, grupp, D[k, somm]); medel /= np.bincount(grupp)[:, None]
            D[k, nb] = D[k, nb] * s_b[:, None] + medel[grupp[nn]] * (1 - s_b)[:, None]
        rap['munnen']['halls_ihop_i'] = ihop
    # blinkningen: locken glider runt ögongloben som på en människa, en vridning kring ögats tvärgående axel genom
    # globens mitt. Överlockets kant vrids ned till en femtedel upp i springan, underlockets upp dit; huden ovanför och
    # under följer med allt mindre (överlocket till 9 mm ovanför kanten, underlocket till 5 mm under), och locket lyfts
    # 1 mm från globen när det sluts, så att en halv blinkning (formerna blandas rakt, längs kordan) inte går in i globen.
    # Bortom det tar dockans egen blinkning vid.
    if A.ogon == 'glob':
        sluten = {}
        for s_, E in ogon.items():
            rim = np.array(E['rim_idx'], int)
            if not len(rim):
                continue
            kk = FORMER.index('eyeBlinkLeft' if s_ == 'L' else 'eyeBlinkRight')
            c = E['c']; R = co[rim]; a_, b_ = R[R[:, 0].argmin()], R[R[:, 0].argmax()]
            t = (R[:, 0] - a_[0]) / (b_[0] - a_[0]); ov_r = R[:, 2] > a_[2] + t * (b_[2] - a_[2])
            up, lo_ = rim[ov_r], rim[~ov_r]
            ou, ol = up[np.argsort(co[up, 0])], lo_[np.argsort(co[lo_, 0])]

            def hojd(p):   # vinkeln uppåt sett från globens mitt, i ögats tvärsnitt (y, z)
                return np.arctan2(p[:, 2] - c[2], -(p[:, 1] - c[1]))
            zu = lambda x: np.interp(x, co[ou, 0], co[ou, 2]); zl = lambda x: np.interp(x, co[ol, 0], co[ol, 2])
            vinkel = {}
            for grp, tecken in ((up, 1), (lo_, -1)):
                P = co[grp]; rho = np.linalg.norm(P[:, 1:] - c[1:], axis=1)
                zc = zl(P[:, 0]) + 0.2 * (zu(P[:, 0]) - zl(P[:, 0]))
                mal = np.arcsin(np.clip((zc - c[2]) / rho, -1, 1))
                vinkel[tecken] = (P[:, 0], hojd(P) - mal)   # överlocket: positiv = nedåt
            th_u = lambda x: np.interp(x, *[v[np.argsort(vinkel[1][0])] for v in vinkel[1]])
            th_l = lambda x: np.interp(x, *[v[np.argsort(vinkel[-1][0])] for v in vinkel[-1]])
            omr = np.nonzero(((kind == 0) | (kind == 1)) & (np.linalg.norm(co - c, axis=1) < E['r'] + 0.016))[0]
            ref = co[omr].copy()
            fl_ = kind[omr] == 1; ref[fl_] = co[kalla[omr[fl_]]]   # en insida följer sin kant
            ovan = ref[:, 2] > zl(ref[:, 0]) + 0.5 * (zu(ref[:, 0]) - zl(ref[:, 0]))
            d_up = np.clip((ref[:, 2] - zu(ref[:, 0])) / (9 * MM), 0, 1); d_lo = np.clip((zl(ref[:, 0]) - ref[:, 2]) / (5 * MM), 0, 1)
            w = np.where(ovan, 1 - d_up, 1 - d_lo)
            w *= np.clip(1 - np.maximum(a_[0] - ref[:, 0], ref[:, 0] - b_[0]) / (4 * MM), 0, 1)   # avtar bortom ögonvrårna
            w = w * w * (3 - 2 * w)
            th = np.where(ovan, th_u(ref[:, 0]), th_l(ref[:, 0])) * w
            q = co[omr] - c
            cs, sn = np.cos(-th), np.sin(-th)   # vridning kring x: nedåt för överlocket
            # framåt är -y: en vinkel uppåt mot framåt; vrid (y, z) så att höjdvinkeln minskar med th
            y2 = q[:, 1] * cs + q[:, 2] * sn; z2 = -q[:, 1] * sn + q[:, 2] * cs
            ny_ = np.stack([q[:, 0], y2, z2], 1)
            rad = np.linalg.norm(ny_[:, 1:], axis=1, keepdims=True)
            lyft = 1.0 * MM * np.abs(th) / max(float(np.abs(vinkel[1][1]).max()), 1e-6)
            ny_[:, 1:] *= (rad + lyft[:, None]) / np.maximum(rad, 1e-9)
            vrid = c + ny_ - co[omr]
            D[kk, omr] = vrid + (1 - w)[:, None] * D[kk, omr]
            E['blink_omr'] = omr
            sluten[s_] = {'overlock_horn': int(len(up)), 'underlock_horn': int(len(lo_)),
                          'overlockets_vinkel_grader_max': round(float(np.degrees(vinkel[1][1].max())), 1),
                          'underlockets_vinkel_grader_max': round(float(np.degrees(vinkel[-1][1].max() * -1)), 1)}
        rap['blinkningen_sluter'] = sluten
    # insidorna som sin kant
    fl = np.nonzero(kind == 1)[0]
    D[:, fl] = D[:, kalla[fl]]; jawv[fl] = jawv[kalla[fl]]
    # munhålans påse: överdelen som överläppen, underdelen som underläppen, botten mitt emellan
    pa = np.nonzero(kind == 3)[0]
    D[:, pa] = (D[:, kalla[pa]] + D[:, kalla2[pa]]) / 2; jawv[pa] = (jawv[kalla[pa]] + jawv[kalla2[pa]]) / 2
    # ögonlocken hålls utanför globen i varje form
    if A.ogon == 'glob':
        tryckt = 0
        for E in ogon.values():
            c = E['c']; nar = np.nonzero((kind != 2) & (kind != 3) & (np.linalg.norm(co - c, axis=1) < E['r'] + 0.012))[0]
            vila = np.linalg.norm(co[nar] - c, axis=1); minst = np.minimum(vila, E['r'] + INST['ogon_marginal_mm'] * MM)
            for k in range(len(FORMER)):
                p = co[nar] + D[k, nar]; d = p - c; L = np.linalg.norm(d, axis=1)
                in_ = L < minst
                if in_.any():
                    p[in_] = c + d[in_] / L[in_, None] * minst[in_, None]; D[k, nar] = p - co[nar]; tryckt += int(in_.sum())
        rap['lock_utanfor_globen_hornformer'] = tryckt
        for s_, E in ogon.items():
            rim = np.array(E['rim_idx'], int)
            if not len(rim) or s_ not in rap.get('blinkningen_sluter', {}):
                continue
            kk = FORMER.index('eyeBlinkLeft' if s_ == 'L' else 'eyeBlinkRight')
            R = co[rim]; a_, b_ = R[R[:, 0].argmin()], R[R[:, 0].argmax()]
            t = (R[:, 0] - a_[0]) / (b_[0] - a_[0]); ov_ = R[:, 2] > a_[2] + t * (b_[2] - a_[2])
            F = R + D[kk, rim]; up, lo_ = F[ov_], F[~ov_]
            if len(up) and len(lo_):
                o_ = np.argsort(lo_[:, 0]); zl = np.interp(up[:, 0], lo_[o_, 0], lo_[o_, 2])
                rap['blinkningen_sluter'][s_]['glapp_i_blinkningen_mm'] = round(float((up[:, 2] - zl).max() / MM), 2)
                rap['blinkningen_sluter'][s_]['springan_i_vila_mm'] = round(float(np.ptp(R[:, 2]) / MM), 2)
    else:
        # det målade ögat trycks bakåt när locket sluts
        for sida_n, E in ogon.items():
            inne = (kind == 0) & inuti(co[:, [0, 2]], E['poly']) & (np.abs(co[:, 1] - E['poly3'][:, 1].mean()) < 0.012)
            for k, n in enumerate(FORMER):
                if n == ('eyeBlinkLeft' if sida_n == 'L' else 'eyeBlinkRight'):
                    D[k, inne] = np.array([0, 4 * MM, 0])
                elif n.startswith('eye'):
                    D[k, inne] *= 0.0
    # -- vikterna: huvudets vikt delas med jaw; globerna på sina ögonben
    gj = t_me.vertex_groups['jaw']; gh = t_me.vertex_groups['Head']
    for i in np.nonzero(jawv > 1e-3)[0]:
        h = head_w[i]
        if h <= 0:
            continue
        gj.add([int(i)], float(h * jawv[i]), 'REPLACE')
        if h * (1 - jawv[i]) > 1e-5:
            gh.add([int(i)], float(h * (1 - jawv[i])), 'REPLACE')
        else:
            gh.remove([int(i)])
    rap['kak'] = {'horn_med_kakvikt': int((jawv > 1e-3).sum()), 'horn_helt_pa_kaken': int((jawv > 0.95).sum())}

    # -- formnycklarna, med standarddockans namn
    me = t_me.data
    if me.shape_keys:
        raise SystemExit('dealern har redan formnycklar')
    t_me.shape_key_add(name='Basis', from_mix=False)
    basco = np.empty(N * 3); me.vertices.foreach_get('co', basco); basco = basco.reshape(-1, 3)
    storsta = {}
    for k, n in enumerate(FORMER):
        kbn = t_me.shape_key_add(name=n, from_mix=False); kbn.value = 0.0
        kbn.data.foreach_set('co', (basco + D[k]).ravel())
        L = np.linalg.norm(D[k], axis=1); i = int(L.argmax())
        storsta[n] = {'mm': round(float(L[i] / MM), 2), 'dockans_mm': round(float(np.linalg.norm(DD[k], axis=1).max() / MM), 2),
                      'var': np.round(co[i], 4).tolist(), 'sort': int(kind[i]), 'sida': int(sida[i])}
    rap['former'] = {'namn': FORMER, 'storsta_flytt_mm': storsta, 'horn_med_form': int((np.abs(D).max((0, 2)) > 1e-6).sum()),
                     'avstand_till_dockans_hud_mm_median_p95': [round(float(np.median(avst[avst < 1]) / MM), 2),
                                                                round(float(np.percentile(avst[avst < 1], 95) / MM), 2)]}
    print('FORMER', json.dumps(rap['former']['storsta_flytt_mm']))
    print('LUTNING', json.dumps(rap['lutning']))
    fler = sum(1 for v in me.vertices if sum(1 for g in v.groups if g.weight > 0) > 4)
    rap['horn_med_fler_an_fyra_ben'] = fler

    # ---------------------------------------------------------------- 5. exporten (som steg 06)
    for o in (d_me, d_arm):
        bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action='DESELECT'); t_arm.select_set(True); t_me.select_set(True)
    bpy.context.view_layer.objects.active = t_arm
    ny = utfil.with_suffix('.ny.glb')
    bpy.ops.export_scene.gltf(filepath=str(ny), export_format='GLB', use_selection=True, export_animations=False,
                              export_image_format='AUTO')
    os.replace(ny, utfil)
    rap['ben'] = len(t_arm.data.bones)
    txt = json.dumps(rap, indent=1, ensure_ascii=False, default=lambda x: x.tolist() if hasattr(x, 'tolist') else str(x))
    (arb / 'ansikte.json').write_text(txt, encoding='utf-8'); utfil.with_suffix('.json').write_text(txt, encoding='utf-8')
    print('ANSIKTE KLART', utfil, 'ben', rap['ben'], 'former', len(FORMER))


def morkaste_uv(mat):
    """UV för en mörk fläck i materialets bastextur (för munhålan), ur en nedskalad kopia."""
    bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    img = None
    if bsdf and bsdf.inputs['Base Color'].is_linked:
        n = bsdf.inputs['Base Color'].links[0].from_node
        while n and n.type != 'TEX_IMAGE' and n.inputs and any(i.is_linked for i in n.inputs):
            n = next(i for i in n.inputs if i.is_linked).links[0].from_node
        img = n.image if n and n.type == 'TEX_IMAGE' else None
    if img is None:
        return (0.0, 0.0)
    k = img.copy(); k.scale(256, 256)
    px = np.empty(256 * 256 * 4, np.float32); k.pixels.foreach_get(px); px = px.reshape(256, 256, 4)[:, :, :3].mean(2)
    bpy.data.images.remove(k)
    # medel över 5×5, så att fläcken är jämn
    pad = np.pad(px, 2, mode='edge'); m = sum(pad[i:i + 256, j:j + 256] for i in range(5) for j in range(5)) / 25
    y, x = np.unravel_index(m.argmin(), m.shape)
    return ((x + 0.5) / 256, (y + 0.5) / 256)


def glob(bm, E, sida, tco, ttri, tuv, mat, uvl, dfl, gi, sort):
    """En ögonglob på eye.<sida>, vars yta visar hans egen målade ögonyta: varje hörn får UV:n på ögonytan rakt framför
    sig (i springan, krympt), eller vid springans kant (utanför den, det som locken döljer i vila)."""
    c, r = E['c'], E['r']; f = np.array([0, -1.0, 0]); a = np.array([1.0, 0, 0]); b = np.cross(f, a)
    vink = list(np.linspace(1.5, 70, 36)) + list(np.linspace(74, 178, 16)); varv = 64
    pol = bm.verts.new(Vector(c + f * r)); ringar = []
    for th in vink:
        t = math.radians(th)
        ringar.append([bm.verts.new(Vector(c + r * (math.cos(t) * f + math.sin(t) * (math.cos(p) * a + math.sin(p) * b))))
                       for p in (2 * math.pi * j / varv for j in range(varv))])
    bak = bm.verts.new(Vector(c - f * r))
    alla = [pol] + [v for rr in ringar for v in rr] + [bak]
    ytor = []
    for j in range(varv):
        ytor.append(bm.faces.new((pol, ringar[0][j], ringar[0][(j + 1) % varv])))
    for k in range(1, len(ringar)):
        for j in range(varv):
            ytor.append(bm.faces.new((ringar[k - 1][j], ringar[k][j], ringar[k][(j + 1) % varv], ringar[k - 1][(j + 1) % varv])))
    for j in range(varv):
        ytor.append(bm.faces.new((ringar[-1][j], bak, ringar[-1][(j + 1) % varv])))
    exakt = krymp(E['poly'], -(INST['oga_vidga_mm'] - 0.1) * MM)   # det som syns i vila: hans målade yta rakt framför
    klamp = krymp(E['poly'], INST['oga_krymp_mm'] * MM)            # det locken döljer: färgen strax innanför springan
    ry = E['poly3'][:, 1].min() - 0.05
    tri = ttri[E['yta_tri']]
    # hans textur kan ha en UV-söm genom ögat: varje yta på globen hämtar sin färg ur en enda UV-ö (den dess mitt
    # träffar), så att ingen yta spänner över sömmen och visar det som ligger mellan öarna
    lokal = {v: i for i, v in enumerate(np.unique(tri))}
    oe = oar(np.vectorize(lokal.get)(tri), len(lokal))[np.vectorize(lokal.get)(tri[:, 0])]
    oar_bvh = {k: (np.nonzero(oe == k)[0], bvh(tco, tri[oe == k])) for k in np.unique(oe)}

    def plan(p3):
        """Globens punkt -> punkten på hans ögonyta (rakt framifrån): innanför springan sig själv, utanför den glidande
        in mot färgen strax innanför springan (2 mm bort helt), så att det locken döljer i vila får ögonvitans färg."""
        p = np.array([p3.x, p3.z])
        if inuti(p[None], exakt)[0]:
            return p
        pe, pk = narmast_pa_polygon(p, exakt), narmast_pa_polygon(p, klamp)
        s = min(1.0, np.linalg.norm(p - pe) / (2 * MM)); s = s * s * (3 - 2 * s)
        return pe + (pk - pe) * s

    def uv_i(p, ov=None):
        idx, tr = oar_bvh[ov] if ov is not None else (np.arange(len(tri)), E['yta'])
        loc, _, fi, _ = tr.ray_cast(Vector((p[0], ry, p[1])), Vector((0, 1, 0)))
        if loc is None:
            loc, _, fi, _ = tr.find_nearest(Vector((p[0], E['pupill'][1], p[1])))
        g = idx[fi]; w = poly_3d_calc([Vector(tco[j]) for j in tri[g]], loc)
        return (tuv[E['yta_tri'][g]] * np.array(w)[:, None]).sum(0), oe[g]
    pv = {v: plan(v.co) for v in alla}
    for v in alla:
        v[dfl][gi[f'eye.{sida}']] = 1.0; sort[v] = ('glob', sida)
    cache = {}
    for fc in ytor:
        fc.material_index = mat; fc.smooth = True
        _, ov = uv_i(plan(fc.calc_center_median()))
        for l in fc.loops:
            if (l.vert, ov) not in cache:
                cache[(l.vert, ov)] = uv_i(pv[l.vert], ov)[0]
            l[uvl].uv = Vector(cache[(l.vert, ov)])
    bm.normal_update()
    for fc in ytor:
        if fc.normal.dot(fc.calc_center_median() - Vector(c)) < 0:
            fc.normal_flip()
    return len(alla)


main()
