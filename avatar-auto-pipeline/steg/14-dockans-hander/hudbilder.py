"""Steg 14, hudens bilder: underlaget för huden och formen på dockans hand, ur personens egen hand (gratis, lokalt).

1. Bilderna: handryggen är förlagan ur steg 1 (output/<namn>/01-referenser/hands-ref.png, en öppen högerhand bakifrån
   med naglar, knogar och ådror); handflatan är den förra handens (Meshy-handen i Version 1) egen bild, renderad rakt
   framifrån handflatan utan ljus. Dockans högra hand renderas på samma sätt bakifrån och framifrån, och den förra handen
   bakifrån, för att mäta.
2. Punkterna: handens 21 punkter (MediaPipe, handpunkter.py) i var och en av bilderna. Dockans punkter och bildens är
   samma leder, så steg 14 kan lägga bilden på dockans hand inpassad efter lederna (dockans_hander.py --hud).
3. Tonen: bakgrunden i bilderna fylls med närmaste hud (så att fingrarnas sidor inte får vit bakgrund), och båda
   bilderna jämkas till ansiktets hudton (medianen av huvudets hudfärgade bild), handflatan något ljusare.
4. Formen: handens bredd över knogarna och fingrarnas tjocklek, var för sig mot handens längd (handleden till
   långfingrets topp), mätta likadant i förlagan, den förra handen och dockans hand; kvoten förlaga mot docka blir
   skalan som dockans_hander.py formar handen med.

    blender -b --factory-startup --python-exit-code 1 --python steg/14-dockans-hander/hudbilder.py -- \
        figur.glb docka.glb hands-ref.png <mapp>
Skriver <mapp>/hud-rygg.png, hud-flata.png, punkter.json, form.json och bilderna den mätte i. Renderar (under det
delade låset, som allt som renderar).
"""
import argparse, json, math, os, subprocess, sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

ROT = Path(__file__).resolve().parents[2]          # avatar-auto-pipeline
MP = ROT.parent / 'blackjack-dealer' / 'tools' / 'python'
STORLEK = 1024
SKALA_M = 0.26                                      # bildens bredd i meter
PALM_LJUSARE = 1.05                                 # handflatan något ljusare än handryggen


def las_args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('figur'); ap.add_argument('docka'); ap.add_argument('forlaga'); ap.add_argument('mapp')
    py = MP / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    ap.add_argument('--mp-python', default=os.environ.get('MEDIAPIPE_PYTHON', str(py)))
    ap.add_argument('--mp-modell', default=str(MP / 'models' / 'hand_landmarker.task'))
    return ap.parse_args(a)


def enhet(v):
    return v / np.linalg.norm(v)


def importera(path):
    fore = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    nya = [o for o in bpy.data.objects if o not in fore]
    arm = next(o for o in nya if o.type == 'ARMATURE')
    me = next(o for o in nya if o.type == 'MESH' and o.find_armature() == arm)
    for o in nya:
        if o not in (arm, me):
            bpy.data.objects.remove(o)
    arm.data.pose_position = 'REST'
    if arm.animation_data:
        arm.animation_data.action = None
    return arm, me


def leder(arm):
    return {b.name: np.array(arm.matrix_world @ b.head_local) for b in arm.data.bones}


def handram(J, s):
    """Handleden, framåt, handflatans normal (åt det håll handflatan vetter) och tummens sida."""
    w = J[s + 'Hand']; f = enhet(J[s + 'HandMiddle1'] - w)
    t = J[s + 'HandThumb2'] - w; t = enhet(t - (t @ f) * f)
    palm = np.cross(t, f) if s == 'Right' else np.cross(f, t)
    return w, f, enhet(palm), t


def kamera(w, f, palm, sida_av):
    """En ortografisk kamera rakt mot handryggen (sida_av='rygg') eller handflatan, fingrarna uppåt i bilden. Ger
    kameraobjektet och en funktion från världen till bildpunkter (x åt höger, y nedåt)."""
    mitt = w + f * 0.085
    z = -palm if sida_av == 'rygg' else palm             # från kameran mot motivet är -z
    y = f
    x = np.cross(y, z)
    cam = bpy.data.objects.get('kamera') or bpy.data.objects.new('kamera', bpy.data.cameras.new('kamera'))
    if cam.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = SKALA_M; cam.data.clip_start = 0.01; cam.data.clip_end = 2
    M = np.eye(4); M[:3, 0], M[:3, 1], M[:3, 2], M[:3, 3] = x, y, z, mitt + z * 0.5
    cam.matrix_world = Matrix(M.tolist())
    bpy.context.scene.camera = cam

    def till_bild(P):
        d = P - mitt
        return np.stack([(d @ x / SKALA_M + 0.5) * STORLEK, (0.5 - d @ y / SKALA_M) * STORLEK], -1)
    return cam, {'mitt': mitt.tolist(), 'x': x.tolist(), 'y': y.tolist(), 'skala_m': SKALA_M, 'storlek': STORLEK}, till_bild


def behall_ytor(o, horn):
    """Tar bort alla ytor som har ett hörn utanför `horn` (en mask per hörn)."""
    bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[fc for fc in bm.faces if not all(horn[v.index] for v in fc.verts)], context='FACES')
    bm.to_mesh(o.data); bm.free(); o.data.update()


def rendera(path, ljus):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO' if ljus else 'FLAT'
    sc.display.shading.color_type = 'SINGLE' if ljus else 'TEXTURE'
    sc.display.shading.single_color = (0.78, 0.62, 0.55)
    sc.display.shading.show_shadows = False; sc.display.shading.show_cavity = ljus
    sc.display.shading.background_type = 'VIEWPORT'
    sc.display.shading.background_color = (1, 1, 1)
    sc.view_settings.view_transform = 'Standard'
    sc.render.film_transparent = False
    sc.render.resolution_x = sc.render.resolution_y = STORLEK
    sc.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def bild_las(path):
    img = bpy.data.images.load(str(path), check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1, :, :3].copy()     # rad 0 överst, sRGB 0-1


def bild_skriv(path, a):
    h, w, _ = a.shape
    img = bpy.data.images.new(Path(path).stem, w, h, alpha=False)
    img.pixels.foreach_set(np.concatenate([a[::-1], np.ones((h, w, 1), np.float32)], -1).astype(np.float32).ravel())
    img.filepath_raw = str(path); img.file_format = 'PNG'; img.save()
    bpy.data.images.remove(img)


def bakgrund(a, kant=0):
    """Bakgrunden (vit eller nästan vit, utan färg) som en mask, vidgad `kant` bildpunkter in över handens kant (där
    huden blandas med bakgrunden och fotots ljuskanter ligger)."""
    m = (a.min(-1) > 0.90) & (a.max(-1) - a.min(-1) < 0.06)
    for _ in range(kant):
        p = np.pad(m, 1)
        m = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return m


def fyll(a, mask):
    """Fyller det maskade med närmaste omgivande färg (pyramid: medel av det kända, nedåt och sedan uppåt)."""
    nivaer = [(a * ~mask[..., None], (~mask).astype(np.float32))]
    while min(nivaer[-1][1].shape) > 2:
        c, v = nivaer[-1]
        h, w = (c.shape[0] // 2) * 2, (c.shape[1] // 2) * 2
        c2 = c[:h, :w].reshape(h // 2, 2, w // 2, 2, 3).sum((1, 3)); v2 = v[:h, :w].reshape(h // 2, 2, w // 2, 2).sum((1, 3))
        nivaer.append((c2, v2))
    c, v = nivaer[-1]
    fylld = c / np.maximum(v, 1e-6)[..., None]
    for c, v in nivaer[-2::-1]:
        upp = np.repeat(np.repeat(fylld, 2, 0), 2, 1)
        upp = np.pad(upp, ((0, c.shape[0] - upp.shape[0]), (0, c.shape[1] - upp.shape[1]), (0, 0)), mode='edge')
        for ax in (0, 1):                               # mjukt uppåt, utan rutor
            p = np.pad(upp, [(2, 2) if i == ax else (0, 0) for i in range(3)], mode='edge')
            upp = sum(np.take(p, range(k, k + upp.shape[ax]), axis=ax) for k in range(5)) / 5
        kand = v > 0
        fylld = np.where(kand[..., None], c / np.maximum(v, 1e-6)[..., None], upp)
    return np.where(mask[..., None], fylld, a)


def lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def hud_i_bild(a):
    return (a[..., 0] > a[..., 1]) & (a[..., 1] > a[..., 2]) & (a[..., 0] - a[..., 2] > 0.10) & (a[..., 0] > 0.40)


def ansiktets_ton(me):
    """Medianen (sRGB) av huvudets hudfärgade bild, i huvudets ytor."""
    mats = [s.material.name if s.material else '' for s in me.material_slots]
    k = mats.index('Huvud')
    mat = me.material_slots[k].material
    img = None
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            ko = [l.from_node for l in n.inputs['Base Color'].links]
            while ko and img is None:
                x = ko.pop(0)
                if x.type == 'TEX_IMAGE' and x.image:
                    img = x.image
                ko += [l.from_node for i in x.inputs for l in i.links]
    w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(h, w, 4)[..., :3]
    d = me.data
    mi = np.empty(len(d.polygons), np.int64); d.polygons.foreach_get('material_index', mi)
    lt = np.empty(len(d.polygons), np.int64); d.polygons.foreach_get('loop_total', lt)
    lpoly = np.repeat(np.arange(len(d.polygons)), lt)
    uv = np.empty(len(d.loops) * 2); d.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)[mi[lpoly] == k]
    c = px[(np.floor(uv[:, 1] * h).astype(int)) % h, (np.floor(uv[:, 0] * w).astype(int)) % w]
    return np.median(c[hud_i_bild(c)], axis=0)


def matt(a, P):
    """Handens längd (handleden till långfingrets topp), bredden över knogarna i silhuetten (från pekfingrets knoge och
    lillfingrets ut till bakgrunden, längs linjen mellan dem) och fingrarnas tjocklek mitt på närmaste fingerled, i
    bildpunkter."""
    bg = bakgrund(a)
    h, w = bg.shape

    def ut_till_kant(p, d):
        d = d / np.linalg.norm(d)
        for s in np.arange(0, 400, 0.5):
            q = p + d * s
            x, y = int(round(q[0])), int(round(q[1]))
            if not (0 <= x < w and 0 <= y < h) or bg[y, x]:
                return q
        return p + d * 400
    L = float(np.linalg.norm(P[12] - P[0]))
    d = P[5] - P[17]
    bredd = float(np.linalg.norm(ut_till_kant(P[5], d) - ut_till_kant(P[17], -d)))
    fingrar = {}
    leder = {'tumme': ((2, 3), (3, 4)), 'pekfinger': ((5, 6), (6, 7)), 'langfinger': ((9, 10), (10, 11)),
             'ringfinger': ((13, 14), (14, 15)), 'lillfinger': ((17, 18), (18, 19))}
    for namn, par in leder.items():
        bredder = []
        for i0, i1 in par:          # mitt på närmaste och mellersta leden; ett mått som går in i grannfingret räknas inte
            m = (P[i0] + P[i1]) / 2; r = P[i1] - P[i0]; n = np.array([-r[1], r[0]])
            b = float(np.linalg.norm(ut_till_kant(m, n) - ut_till_kant(m, -n)))
            if b < 0.18 * L:
                bredder.append(b / L)
        fingrar[namn] = round(float(np.mean(bredder)), 4) if bredder else None
    return {'langd_px': round(L, 1), 'bredd_over_knogarna_per_langd': round(bredd / L, 4), 'fingrarnas_tjocklek_per_langd': fingrar}


def main():
    A = las_args()
    figur, docka, forlaga, mapp = (Path(x).resolve() for x in (A.figur, A.docka, A.forlaga, A.mapp))
    mapp.mkdir(parents=True, exist_ok=True)
    rap = {'figur': figur.name, 'docka': docka.name, 'forlaga': forlaga.name}
    kameror = {}

    # den förra handen (figurens Handpar, höger): handflatan och handryggen, utan ljus
    bpy.ops.wm.read_factory_settings(use_empty=True)
    arm, me = importera(figur)
    ton = ansiktets_ton(me)
    rap['ansiktets_ton_srgb'] = np.round(ton, 3).tolist()
    J = leder(arm); w, f, palm, t = handram(J, 'Right')
    d = me.data
    mats = [s.material.name if s.material else '' for s in me.material_slots]
    hand = np.zeros(len(d.vertices), bool)
    co = np.empty(len(d.vertices) * 3); d.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    M = np.array(me.matrix_world); X = co @ M[:3, :3].T + M[:3, 3]
    for p in d.polygons:
        if mats[p.material_index] == 'Handpar':
            hand[list(p.vertices)] = True
    hand &= np.linalg.norm(X - w, axis=1) < 0.3
    behall_ytor(me, hand)
    for sida_av, namn in (('flata', 'forra-flata.png'), ('rygg', 'forra-rygg.png')):
        _, kameror[namn], _ = kamera(w, f, palm, sida_av)
        rendera(mapp / namn, ljus=False)

    # dockans högra hand, med ljus (för punkterna) bakifrån och framifrån
    bpy.ops.wm.read_factory_settings(use_empty=True)
    arm, me = importera(docka)
    J = leder(arm); w, f, palm, t = handram(J, 'Right')
    vg = {g.index: g.name for g in me.vertex_groups}
    armv = np.zeros(len(me.data.vertices))
    for v in me.data.vertices:
        armv[v.index] = sum(g.weight for g in v.groups if vg[g.group].startswith('Right') and ('Hand' in vg[g.group] or 'ForeArm' in vg[g.group]))
    behall_ytor(me, armv > 0.5)
    if me.data.shape_keys:
        me.shape_key_clear()
    for sida_av, namn in (('rygg', 'docka-rygg.png'), ('flata', 'docka-flata.png')):
        _, kameror[namn], _ = kamera(w, f, palm, sida_av)
        rendera(mapp / namn, ljus=True)

    # punkterna
    bilder = [forlaga, mapp / 'forra-flata.png', mapp / 'forra-rygg.png', mapp / 'docka-rygg.png', mapp / 'docka-flata.png']
    pj = mapp / 'punkter.json'
    r = subprocess.run([A.mp_python, '-I', str(Path(__file__).with_name('handpunkter.py')), '--modell', A.mp_modell, '--ut', str(pj),
                        *[str(b) for b in bilder]], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode:
        raise SystemExit('handpunkter.py föll:\n' + r.stdout + r.stderr)
    punkter = json.loads(pj.read_text(encoding='utf-8'))
    saknas = [k for k, v in punkter.items() if not v]
    if saknas:
        raise SystemExit(f'MediaPipe hittade ingen hand i {saknas}')
    storlekar = {}
    for b in bilder:
        a = bild_las(b); storlekar[b.name] = [a.shape[1], a.shape[0]]
    punkter_px = {k: np.array(v)[:, :2] * np.array(storlekar[k]) for k, v in punkter.items()}
    (mapp / 'punkter.json').write_text(json.dumps({'punkter_andel': punkter, 'storlek': storlekar, 'kameror': kameror},
                                                  ensure_ascii=False), encoding='utf-8')

    # formen: förlagan, den förra handen och dockan, mätta likadant bakifrån
    form = {'forlaga': matt(bild_las(forlaga), punkter_px[forlaga.name]),
            'forra_handen': matt(bild_las(mapp / 'forra-rygg.png'), punkter_px['forra-rygg.png']),
            'dockan': matt(bild_las(mapp / 'docka-rygg.png'), punkter_px['docka-rygg.png'])}
    fo, do = form['forlaga'], form['dockan']
    ft, dt = fo['fingrarnas_tjocklek_per_langd'], do['fingrarnas_tjocklek_per_langd']
    kvot = [ft[k] / dt[k] for k in ('pekfinger', 'langfinger', 'ringfinger', 'lillfinger') if ft[k] and dt[k]]
    form['skala'] = {
        'handflatans_bredd': round(fo['bredd_over_knogarna_per_langd'] / do['bredd_over_knogarna_per_langd'], 3),
        'fingrarnas_tjocklek': round(float(np.mean(kvot)), 3) if kvot else 1.0, 'fingrar_matta': len(kvot),
        'tummens_tjocklek': round(ft['tumme'] / dt['tumme'], 3) if ft['tumme'] and dt['tumme'] else 1.0}
    (mapp / 'form.json').write_text(json.dumps(form, indent=1, ensure_ascii=False), encoding='utf-8')
    rap['form'] = form

    # huden: bakgrunden fylld med närmaste hud, och tonen jämkad till ansiktets
    for kalla, ut, faktor in ((forlaga, 'hud-rygg.png', 1.0), (mapp / 'forra-flata.png', 'hud-flata.png', PALM_LJUSARE)):
        a = bild_las(kalla)
        bg = bakgrund(a, kant=8)
        hud = hud_i_bild(a) & ~bg
        med = np.median(a[hud], axis=0)
        g = lin(ton) / np.maximum(lin(med), 1e-4) * faktor
        a = srgb(lin(fyll(a, bg)) * g).astype(np.float32)
        bild_skriv(mapp / ut, a)
        rap.setdefault('tonen', {})[ut] = {'bildens_hud_srgb': np.round(med, 3).tolist(), 'forstarkning_linjar': np.round(g, 3).tolist()}
    (mapp / 'hudbilder.json').write_text(json.dumps(rap, indent=1, ensure_ascii=False), encoding='utf-8')
    print('HUDBILDER KLAR', json.dumps(rap, ensure_ascii=False))


if __name__ == '__main__':
    main()
