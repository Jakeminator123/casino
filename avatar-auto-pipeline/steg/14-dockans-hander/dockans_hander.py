"""Steg 14: en dealers figur får dockans händer, insatta i skjortans manschett (Jakob 2026-11-27: "varför kan vi inte i
så fall bara kapa vid armen", och om den påsatta handen: "om vi har leder innan i dockan varför lägga på ett lager till").

En framställd hand (Meshy, Hunyuan) har fingrarnas form men är inte byggd för att böjas; dockans hand (MPFB, 30
fingerleder) är det. Figuren behåller sin kropp, sitt huvud och sina kläder, och får dockans hand i ärmen, som en riktig
hand i en skjortärm:

1. Figurens händer tas bort: handens yta (materialet Handpar) och skarvarna vid handlederna (Skarvar). Det som var
   handens vikt på ärmen läggs på underarmen, så att manschetten följer underarmen stelt.
2. Ärmen mäts som ett rör: mittlinjen genom två snitt (det konvexa höljet, 1,5–3,5 och 8–11 cm före ärmens slut), och
   manschettens kant där rörets yta slutar vara tyg (kroppens egen hud börjar, hudfärgad i kroppens bild med samma prov
   som steg 3, eller tyget tar slut). Där skärs ärmen av med ett plant snitt tvärs armen, så att kanten blir rak och
   kroppens egen hud ur manschetten går.
3. Handleden: figurens egen led (benet <Sida>Hand) flyttas till ärmens mittlinje, så att handen sitter mitt i ärmen och
   går ut ur den i ärmens riktning. Ärmen är längre än armen (manschetten räcker förbi handleden, som en skjortärm gör
   när armen hänger), och en hand som böjs inne i manschetten tar den med sig: ärmens underarmsdel trycks därför ihop
   längs armen, jämnt från armbågen, tills manschetten slutar --glapp innanför leden. Armens längd och leder är figurens
   egna (en längre underarm än överarm vore inte en människas), så editorn skalar honom som förut.
4. Dockans hand tas med en bit underarm (--stump bakom leden) och sätts in med en vridning, en skalning och en flytt:
   dockans handled på figurens, dockans underarm längs ärmen, och handflatan vriden kring underarmen dit figurens
   handflata pekade. Skarven, stumpens kant, ligger alltså inne i ärmen, och leden strax utanför manschetten. Skalan är
   figurens egen hand: avståndet från handleden till långfingrets topp, medel av båda händerna, mot dockans. En
   stumpdel som skulle gå genom ärmens tyg dras in mot underarmens mitt (bara inne i ärmen, där den inte syns).
   Med --hud formas handen först efter personens (forma: handflatan bredare, fingrarna tjockare, lederna kvar).
5. Dockans hand sys ihop längs sina UV-sömmar (glTF delar hörnen där) och delas en gång (subdivision, vikterna följer,
   högst fyra ben per hörn), så att den är slät på nära håll. Huden: med --hud personens hand ur hudbilder.py, lagd
   inpassad efter handens 21 punkter (projicera) och bakad till en egen bild på handens karta (baka); med --meshy-bild
   Meshys målning av dockans hand (meshy_kopia.py); annars en jämn ton ur figurens förra hand.
6. Handens och fingrarnas ben byts mot dockans, flyttade på samma sätt (samma namn), och dockans vikter följer med
   hörnen: inget andra lager och ingen lagning ovanpå. Underarmarna får vridben med steg 6:s vridben.py innan handen
   kommer in med dockans egna, och manschettens kant stängs mot handleden med en stel ring (lapp).
7. Exporten som steg 9, och kontrollen: handleden böjs 60 grader åt båda håll och vrids 80 grader åt båda håll
   (new_docka.md 7.1b); för varje ställning räknas hörn som ligger inne i ärmen i vila och går ut genom tyget, och hur
   mycket manschettens kanter töjs.

    blender -b --factory-startup --python-exit-code 1 --python steg/14-dockans-hander/hudbilder.py -- \
        figur.glb docka.glb hands-ref.png <hud>
    blender -b --factory-startup --python-exit-code 1 --python steg/14-dockans-hander/dockans_hander.py -- \
        figur.glb docka.glb ut.glb [--hud <hud>] [--meshy-bild <png>] [--glapp 0.008] [--stump 0.035] [--skala <tal>]
Figuren är en riggad dealer med Mixamo-ben och en påsatt hand (Version 1: assets/docka/standarddocka_<namn>.glb),
dockan en grunddocka (assets/docka/standarddocka_danilo.glb eller _frasse.glb). Rapporten blir <ut>.json. Med en hud bakas
den i Cycles: kör under det delade låset, som allt som renderar.
"""
import argparse, json, math, os, sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROT = Path(__file__).resolve().parents[2]          # avatar-auto-pipeline
sys.path.insert(0, str(ROT / 'gemensamt'))
from sokvagar import add_paths                     # noqa: E402
add_paths(ROT)
import vridben                                      # noqa: E402  (steg 06)

SIDOR = ('Right', 'Left')
FINGRAR = ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')
HUD = lambda c: (c[..., 0] > c[..., 2] + 0.06) & (c[..., 0] > 0.45)   # som steg 3 (montera_apose.py): hud i sRGB
KANT_DJUP_M = 0.003    # manschettens kantring så långt in i ärmen
KANT_LUFT_M = 0.003    # och så långt utanför huden (handleden är oval och vrids under ringen)


def las_args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('figur'); ap.add_argument('docka'); ap.add_argument('ut')
    ap.add_argument('--glapp', type=float, default=0.008, help='leden så här långt utanför manschetten (m)')
    ap.add_argument('--stump', type=float, default=0.035, help='dockans underarm så här långt bakom leden (m)')
    ap.add_argument('--skala', type=float, default=None, help='handens skala mot dockans; förval figurens egen hand')
    ap.add_argument('--delning', type=int, default=1, help='subdivision av dockans hand (0 = ingen)')
    ap.add_argument('--hud', default=None, help='mappen från hudbilder.py: huden ur personens hand och handens form')
    ap.add_argument('--utan-form', action='store_true', help='dockans hand som den är, utan bredden och tjockleken ur --hud')
    ap.add_argument('--meshy-bild', default=None, help='huden ur Meshy (meshy_kopia.py + steg 12) på dockans egen karta, '
                                                       'i stället för bilderna i --hud')
    ap.add_argument('--bildstorlek', type=int, default=2048, help='hudens bild (bildpunkter per sida)')
    return ap.parse_args(a)


def tps(fran, till, lam=1e-3):
    """En mjuk avbildning i planet (thin plate spline, phi = r^2 log r) som för punkterna `fran` till `till`."""
    fran = np.asarray(fran, float); till = np.asarray(till, float)
    s = float(np.linalg.norm(fran - fran.mean(0), axis=1).mean()) or 1.0
    c = fran.mean(0)
    P = (fran - c) / s
    n = len(P)

    def phi(r):
        with np.errstate(divide='ignore', invalid='ignore'):
            return np.where(r > 0, r * r * np.log(r), 0.0)
    K = phi(np.linalg.norm(P[:, None] - P[None], axis=-1)) + lam * np.eye(n)
    Q = np.hstack([np.ones((n, 1)), P])
    A = np.zeros((n + 3, n + 3)); A[:n, :n] = K; A[:n, n:] = Q; A[n:, :n] = Q.T
    W = np.linalg.solve(A, np.vstack([till, np.zeros((3, 2))]))

    def f(X):
        Xn = (np.asarray(X, float) - c) / s
        return phi(np.linalg.norm(Xn[:, None] - P[None], axis=-1)) @ W[:n] + np.hstack([np.ones((len(Xn), 1)), Xn]) @ W[n:]
    return f


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- hjälp
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


def koord(o):
    co = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', co); return co.reshape(-1, 3)


def varld(o, co=None):
    co = koord(o) if co is None else co
    M = np.array(o.matrix_world); return co @ M[:3, :3].T + M[:3, 3]


def leder(arm):
    M = arm.matrix_world
    return {b.name: np.array(M @ b.head_local) for b in arm.data.bones}


def vikter(o):
    """{gruppnamn: vikt per hörn}"""
    namn = {g.index: g.name for g in o.vertex_groups}
    W = {n: np.zeros(len(o.data.vertices)) for n in namn.values()}
    for v in o.data.vertices:
        for g in v.groups:
            W[namn[g.group]][v.index] = g.weight
    return W


def enhet(v):
    return v / np.linalg.norm(v)


def rot_mellan(a, b):
    """Den kortaste vridningen som för riktningen a till b (3x3)."""
    a, b = enhet(a), enhet(b); v = np.cross(a, b); c = float(a @ b); s = float(np.linalg.norm(v))
    if s < 1e-9:
        return np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]]) / s
    return np.eye(3) + s * K + (1 - c) * K @ K


def rot_kring(axel, vinkel):
    return np.array(Matrix.Rotation(vinkel, 3, Vector(enhet(axel))))


def handram(J, sida):
    """Handleden, framåt (mot långfingrets knoge) och handflatans normal (åt det håll handflatan vetter)."""
    w = J[sida + 'Hand']; f = enhet(J[sida + 'HandMiddle1'] - w)
    t = J[sida + 'HandThumb2'] - w; t = enhet(t - (t @ f) * f)
    palm = np.cross(t, f) if sida == 'Right' else np.cross(f, t)
    return w, f, enhet(palm), t


def materialhorn(o):
    """Materialens namn, materialet per yta, ytan per hörnhörna (loop) och hörnet per loop."""
    me = o.data
    mats = [s.material.name if s.material else '' for s in o.material_slots]
    mi = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get('material_index', mi)
    lt = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get('loop_total', lt)
    lv = np.empty(len(me.loops), np.int64); me.loops.foreach_get('vertex_index', lv)
    return mats, mi, np.repeat(np.arange(len(me.polygons)), lt), lv


def basfargsbild(mat):
    """Bilden som ger materialets grundfärg (glTF-importens Principled BSDF)."""
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            kö = [l.from_node for l in n.inputs['Base Color'].links]
            while kö:
                x = kö.pop(0)
                if x.type == 'TEX_IMAGE' and x.image:
                    return x.image
                kö += [l.from_node for i in x.inputs for l in i.links]
    return None


def farg_per_horn(o, material):
    """Medelfärgen (sRGB) i materialets bild per hörn, ur hörnens UV; NaN där materialet inte finns."""
    me = o.data
    mats, mi, lpoly, lv = materialhorn(o)
    k = mats.index(material)
    img = basfargsbild(o.material_slots[k].material)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(h, w, 4)
    uv = np.empty(len(me.loops) * 2); me.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
    sel = mi[lpoly] == k
    x = (np.floor(uv[sel, 0] * w).astype(int)) % w; y = (np.floor(uv[sel, 1] * h).astype(int)) % h
    c = px[y, x, :3]
    summa = np.zeros((len(me.vertices), 3)); n = np.zeros(len(me.vertices))
    np.add.at(summa, lv[sel], c); np.add.at(n, lv[sel], 1)
    ut = np.full((len(me.vertices), 3), np.nan); ok = n > 0; ut[ok] = summa[ok] / n[ok, None]
    return ut, c


def ta_bort_ytor(o, ytor):
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in np.nonzero(ytor)[0]], context='FACES')
    lösa = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=lösa, context='VERTS')
    bm.to_mesh(o.data); bm.free(); o.data.update()


def ror(P, d):
    """Mitten och radien av ett snitt genom ett rör längs d: det konvexa höljets tyngdpunkt och omkrets / 2 pi."""
    b1 = enhet(np.cross(d, [0.0, 0.0, 1.0]) if abs(d[2]) < 0.9 else np.cross(d, [1.0, 0.0, 0.0])); b2 = np.cross(d, b1)
    Q = np.stack([P @ b1, P @ b2], 1)
    Q = Q[np.lexsort((Q[:, 1], Q[:, 0]))]
    kr = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in Q:
        while len(lo) >= 2 and kr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in Q[::-1]:
        while len(up) >= 2 and kr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    h = np.array(lo[:-1] + up[:-1]); hn = np.roll(h, -1, axis=0)
    cr = h[:, 0] * hn[:, 1] - hn[:, 0] * h[:, 1]; A = cr.sum() / 2
    cx = ((h[:, 0] + hn[:, 0]) * cr).sum() / (6 * A); cy = ((h[:, 1] + hn[:, 1]) * cr).sum() / (6 * A)
    langs = float((P @ d).mean())
    omkrets = float(np.linalg.norm(hn - h, axis=1).sum())
    return cx * b1 + cy * b2 + langs * d, omkrets / (2 * math.pi)


# ---------------------------------------------------------------- formen, huden och manschettens kant
def forma(XD, WD, JD, d_arm, skala_ur, rap):
    """Dockans hand formad efter personens (hudbilder.py, form.json): handflatan bredare tvärs handen (från handens
    mittlinje, avtagande mot handleden) och fingrarna tjockare runt sina ben. Lederna står kvar, så greppet är dockans."""
    s_b = float(np.clip(skala_ur['handflatans_bredd'], 1.0, 1.35))
    s_f = float(np.clip(skala_ur['fingrarnas_tjocklek'], 1.0, 1.35))
    s_t = float(np.clip(skala_ur['tummens_tjocklek'], 1.0, 1.35))
    MD = np.array(d_arm.matrix_world)
    D = np.zeros_like(XD)
    for s in SIDOR:
        w, f, palm, t = handram(JD, s)
        L = float(np.linalg.norm(JD[s + 'HandMiddle1'] - w))
        k = smoothstep(0.15, 0.6, ((XD - w) @ f) / L)
        D += (WD[s + 'Hand'] * (s_b - 1) * k * ((XD - w) @ t))[:, None] * t
        for fi in FINGRAR:
            for j in (1, 2, 3):
                n = f'{s}Hand{fi}{j}'
                b = d_arm.data.bones[n]
                h = np.array(d_arm.matrix_world @ b.head_local); y = enhet(MD[:3, :3] @ np.array(b.matrix_local)[:3, 1])
                q = XD - h; vinkel = q - np.outer(q @ y, y)
                D += (WD[n] * ((s_t if fi == 'Thumb' else s_f) - 1))[:, None] * vinkel
    rap['form'] = {'handflatans_bredd': round(s_b, 3), 'fingrarnas_tjocklek': round(s_f, 3), 'tummens_tjocklek': round(s_t, 3),
                   'matt': skala_ur}
    return XD + D


def projicera(bit, d_me, XD, JD, hud, rap):
    """Var på bilderna varje hörn i dockans hand hamnar: handryggen på förlagan, handflatan på den förra handens bild.
    Dockans hörn läggs i samma kamera som dockans bild i hudbilder.py, och en mjuk avbildning (tps) genom handens 21
    punkter för dockans bild till personens. Vänster hand speglas till höger (dockan är spegelsymmetrisk) och får samma
    bild. Hörnets normal avgör hur mycket som tas från handryggen och från handflatan. Läggs som UV-kartor på kopian."""
    pj = json.loads((hud / 'punkter.json').read_text(encoding='utf-8'))
    andel, storlek, kameror = pj['punkter_andel'], pj['storlek'], pj['kameror']
    forlaga = next(k for k in andel if k not in ('forra-flata.png', 'forra-rygg.png', 'docka-rygg.png', 'docka-flata.png'))
    m0 = (JD['RightHand'] + JD['LeftHand']) / 2; mn = enhet(JD['LeftHand'] - JD['RightHand'])
    vanster = np.linalg.norm(XD - JD['LeftHand'], axis=1) < np.linalg.norm(XD - JD['RightHand'], axis=1)
    P = XD.copy(); P[vanster] -= 2 * np.outer((P[vanster] - m0) @ mn, mn)
    N = np.empty(len(d_me.data.vertices) * 3); d_me.data.vertex_normals.foreach_get('vector', N)
    N = N.reshape(-1, 3) @ np.array(d_me.matrix_world)[:3, :3].T
    N[vanster] -= 2 * np.outer(N[vanster] @ mn, mn)
    palm = handram(JD, 'Right')[2]
    uv = {}
    for namn, docka_bild, bild in (('rygg', 'docka-rygg.png', forlaga), ('flata', 'docka-flata.png', 'forra-flata.png')):
        k = kameror[docka_bild]
        mitt, x, y, sk, n = np.array(k['mitt']), np.array(k['x']), np.array(k['y']), k['skala_m'], k['storlek']
        Pd = np.array(andel[docka_bild])[:, :2] * np.array(storlek[docka_bild])
        Pi = np.array(andel[bild])[:, :2] * np.array(storlek[bild])
        f = tps(Pd, Pi)
        d = P - mitt
        q = f(np.stack([(d @ x / sk + 0.5) * n, (0.5 - d @ y / sk) * n], -1))
        W, H = storlek[bild]
        uv[namn] = np.stack([q[:, 0] / W, 1 - q[:, 1] / H], -1)
        rap.setdefault('huden', {})[namn] = {'bild': 'hud-rygg.png' if namn == 'rygg' else 'hud-flata.png',
                                             'punkternas_fel_efter_avbildningen_px': round(float(np.abs(f(Pd) - Pi).max()), 2)}
    vikt = smoothstep(-0.25, 0.25, N @ -palm)
    lv = np.empty(len(bit.data.loops), np.int64); bit.data.loops.foreach_get('vertex_index', lv)
    for namn, varden in (('proj_rygg', uv['rygg']), ('proj_flata', uv['flata']), ('proj_vikt', np.stack([vikt, vikt], -1))):
        lager = bit.data.uv_layers.new(name=namn)
        lager.data.foreach_set('uv', varden[lv].astype(np.float32).ravel())


def projicera_meshy(bit, XD, JD, rap):
    """Meshys bild är målad på dockans högra hand i dockans egen karta: höger hand tar sin egen karta, vänster sin
    spegelbilds (närmaste ytan på höger hand, speglad, och där hörnet närmast), så att båda händerna får samma hud."""
    from mathutils.kdtree import KDTree
    me = bit.data
    m0 = (JD['RightHand'] + JD['LeftHand']) / 2; mn = enhet(JD['LeftHand'] - JD['RightHand'])
    spegla = lambda P: P - 2 * np.outer((P - m0) @ mn, mn)
    uv = np.empty(len(me.loops) * 2); me.uv_layers[0].data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
    ut = uv.copy()
    polys = [(p.index, list(p.loop_indices), list(p.vertices)) for p in me.polygons]
    mitt = np.array([XD[v].mean(0) for _, _, v in polys])
    hoger = np.linalg.norm(mitt - JD['RightHand'], axis=1) < np.linalg.norm(mitt - JD['LeftHand'], axis=1)
    kd = KDTree(int(hoger.sum()))
    hidx = np.nonzero(hoger)[0]
    for k, i in enumerate(hidx):
        kd.insert(Vector(mitt[i]), k)
    kd.balance()
    for i in np.nonzero(~hoger)[0]:
        _, loops, verts = polys[i]
        _, k, _ = kd.find(Vector(spegla(mitt[i][None])[0]))
        _, hl, hv = polys[hidx[k]]
        for l, v in zip(loops, verts):
            j = int(np.argmin(np.linalg.norm(XD[hv] - spegla(XD[v][None])[0], axis=1)))
            ut[l] = uv[hl[j]]
    for namn, varden in (('proj_rygg', ut), ('proj_flata', ut), ('proj_vikt', np.ones_like(ut))):
        lager = me.uv_layers.new(name=namn)
        lager.data.foreach_set('uv', varden.astype(np.float32).ravel())
    rap['huden'] = {'meshy': 'dockans egen karta, vänster hand speglad'}


def baka(bit, bilder, utbild, storlek, rap):
    """Huden bakas till en egen bild på handens egen karta (MPFB:s öar, jämnt skalade efter ytan och packade så att de
    fyller bilden): bilderna läggs genom kartorna från projicera() och blandas efter normalen (Cycles, Emit)."""
    me = bit.data
    bas = me.uv_layers[0]
    me.uv_layers.active = bas; bas.active_render = True
    bpy.ops.object.select_all(action='DESELECT'); bit.select_set(True); bpy.context.view_layer.objects.active = bit
    bpy.context.scene.tool_settings.use_uv_select_sync = True
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=True, margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')
    bilder = {n: bpy.data.images.load(str(p), check_existing=True) for n, p in bilder.items()}
    mal = bpy.data.images.new('Dockhand_hud', storlek, storlek, alpha=False)
    mat = bpy.data.materials.new('Dockhand_bakning'); mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear()
    ut = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission')
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    for namn, ingang in (('rygg', 'B'), ('flata', 'A')):
        tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bilder[namn]; tx.extension = 'EXTEND'
        uvn = nt.nodes.new('ShaderNodeUVMap'); uvn.uv_map = 'proj_' + namn
        nt.links.new(uvn.outputs['UV'], tx.inputs['Vector'])
        nt.links.new(tx.outputs['Color'], [i for i in mix.inputs if i.name == ingang and i.type == 'RGBA'][0])
    vn = nt.nodes.new('ShaderNodeUVMap'); vn.uv_map = 'proj_vikt'
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(vn.outputs['UV'], sep.inputs[0])
    nt.links.new(sep.outputs['X'], mix.inputs['Factor'])
    nt.links.new([o for o in mix.outputs if o.type == 'RGBA'][0], em.inputs['Color'])
    nt.links.new(em.outputs[0], ut.inputs['Surface'])
    malnod = nt.nodes.new('ShaderNodeTexImage'); malnod.image = mal
    malnod_uv = nt.nodes.new('ShaderNodeUVMap'); malnod_uv.uv_map = bas.name
    nt.links.new(malnod_uv.outputs['UV'], malnod.inputs['Vector'])
    nt.nodes.active = malnod
    me.materials.clear(); me.materials.append(mat)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 1; sc.cycles.device = 'CPU'
    sc.render.bake.margin = 24; sc.render.bake.use_clear = True
    bpy.ops.object.select_all(action='DESELECT'); bit.select_set(True); bpy.context.view_layer.objects.active = bit
    bpy.ops.object.bake(type='EMIT')
    mal.filepath_raw = str(utbild); mal.file_format = 'PNG'; mal.save()
    for n in ('proj_rygg', 'proj_flata', 'proj_vikt'):
        me.uv_layers.remove(me.uv_layers[n])
    rap['huden']['bakad'] = {'bild': str(Path(utbild).name), 'storlek': storlek}
    return mal


def lapp(t_me, bit, ram, rap):
    """Manschettens kant stängs mot handleden: en ring från snittets kant in till strax utanför huden (KANT_LUFT_M),
    KANT_DJUP_M in i ärmen, så att man inte ser in i ärmen. Ringen är stel med manschetten (kantens egna vikter); en ring
    som följde huden reste sig som ett tält när handen böjdes. Tyget är manschettens (kantens egen bild). Ger ringens
    ytor."""
    me = t_me.data
    XB = varld(bit)
    ytor = [list(p.vertices) for p in bit.data.polygons]
    bvh = BVHTree.FromPolygons([Vector(p) for p in XB], ytor)
    Mw = np.array(t_me.matrix_world); Mi = np.linalg.inv(Mw)
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    uvl = bm.loops.layers.uv.active; dl = bm.verts.layers.deform.verify()
    fore = len(bm.faces)
    for s in SIDOR:
        R0 = ram[s]; a = R0['axel']; J = R0['J']; plan = R0['plan']
        varld_co = lambda v: Mw[:3, :3] @ np.array(v.co) + Mw[:3, 3]
        kant = [e for e in bm.edges if e.is_boundary and all(
            abs((varld_co(v) - J) @ a - plan) < 0.0015 and np.linalg.norm(np.cross(varld_co(v) - J, a)) > 0.02 for v in e.verts)]
        inre, radier = {}, []
        for v in {v for e in kant for v in e.verts}:
            p = varld_co(v); c = J + a * (plan - KANT_DJUP_M)
            r = p - J; r -= (r @ a) * a; r /= np.linalg.norm(r)
            hit = bvh.ray_cast(Vector(c), Vector(r), 0.1)
            if hit[0] is None:
                continue
            q = c + r * min(hit[3] + KANT_LUFT_M, float(np.linalg.norm(np.cross(p - J, a))) - 0.001)
            nv = bm.verts.new(Vector(Mi[:3, :3] @ q + Mi[:3, 3]))
            for k, w in v[dl].items():
                nv[dl][k] = w
            inre[v] = nv; radier.append(hit[3])
        ny = 0; tyg_uv = None
        for e in kant:
            v0, v1 = e.verts
            if v0 not in inre or v1 not in inre:
                continue
            gammal = e.link_faces[0]
            f = bm.faces.new([v0, v1, inre[v1], inre[v0]])
            f.material_index = gammal.material_index
            f.normal_update()
            if np.array(f.normal) @ (Mi[:3, :3] @ a) < 0:
                f.normal_flip()
            if tyg_uv is None:      # en enda punkt i manschettens tyg för hela ringen: en jämn färg, inga ränder
                langst_in = min(gammal.loops, key=lambda l: (varld_co(l.vert) - J) @ a)
                tyg_uv = langst_in[uvl].uv.copy()
            for l in f.loops:
                l[uvl].uv = tyg_uv
            ny += 1
        rap.setdefault('manschettens_kant', {})[s] = {'snittets_kanter': len(kant), 'ytor': ny, 'hudens_radie_mm_min_max': [round(min(radier) * 1000, 1), round(max(radier) * 1000, 1)] if radier else None}
    bm.verts.index_update(); bm.faces.index_update()
    efter = len(bm.faces)
    bm.to_mesh(me); bm.free(); me.update()
    return set(range(fore, efter))


# ---------------------------------------------------------------- bygget
def main():
    args = las_args()
    figur, docka, utfil = Path(args.figur).resolve(), Path(args.docka).resolve(), Path(args.ut).resolve()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    t_arm, t_me = importera(figur)
    d_arm, d_me = importera(docka)
    JT, JD = leder(t_arm), leder(d_arm)
    rap = {'figur': figur.name, 'docka': docka.name, 'glapp_m': args.glapp, 'stump_m': args.stump, 'delning': args.delning}

    # figurens hand: handleden, framåt, handflatan och avståndet till långfingrets topp (för skalan)
    XT = varld(t_me); WT = vikter(t_me)
    XD = varld(d_me); WD = vikter(d_me)

    def topp(X, W, J, s):
        mid = sum(W.get(f'{s}HandMiddle{j}', 0) for j in (1, 2, 3)) >= 0.5
        return float(np.linalg.norm(X[mid] - J[s + 'Hand'], axis=1).max())
    t_topp = {s: topp(XT, WT, JT, s) for s in SIDOR}
    d_topp = {s: topp(XD, WD, JD, s) for s in SIDOR}
    skala = args.skala or float(np.mean([t_topp[s] / d_topp[s] for s in SIDOR]))
    rap['skala'] = {'handled_till_langfingrets_topp_figur_m': {s: round(t_topp[s], 4) for s in SIDOR},
                    'dockan_m': {s: round(d_topp[s], 4) for s in SIDOR}, 'skala': round(skala, 4),
                    'satt': 'given' if args.skala else 'figurens hand, medel av båda'}
    t_ram = {s: handram(JT, s) for s in SIDOR}

    # 1. figurens händer bort: Handpar och skarvarna vid handlederna (kroppens egen hud ur manschetten tas av snittet i 2)
    mats, mi, _, _ = materialhorn(t_me)
    hand_farg = farg_per_horn(t_me, 'Handpar')[1]
    hudton = np.median(hand_farg, axis=0)
    me = t_me.data
    yta_mitt = np.zeros((len(me.polygons), 3)); me.polygons.foreach_get('center', yta_mitt.ravel())
    M = np.array(t_me.matrix_world); yta_mitt = yta_mitt @ M[:3, :3].T + M[:3, 3]
    nara = np.min([np.linalg.norm(yta_mitt - JT[s + 'Hand'], axis=1) for s in SIDOR], axis=0) < 0.10
    matnamn = np.array(mats, dtype=object)[mi]
    bort = (matnamn == 'Handpar') | ((matnamn == 'Skarvar') & nara)
    rap['ytor_borttagna'] = {'handpar': int((matnamn == 'Handpar').sum()), 'skarvar_vid_handlederna': int(((matnamn == 'Skarvar') & nara).sum())}
    ta_bort_ytor(t_me, bort)
    XT = varld(t_me); WT = vikter(t_me)
    farg, _ = farg_per_horn(t_me, 'Kropp')

    # handens vikt på ärmen läggs på underarmen: manschetten följer underarmen stelt
    flyttade = {}
    for s in SIDOR:
        hn = [s + 'Hand'] + [f'{s}Hand{f}{j}' for f in FINGRAR for j in (1, 2, 3)]
        h = sum(WT.get(n, 0) for n in hn)
        idx = np.nonzero(h > 0)[0]
        g_fa = t_me.vertex_groups[s + 'ForeArm']
        for i in idx:
            g_fa.add([int(i)], float(min(1.0, WT[s + 'ForeArm'][i] + h[i])), 'REPLACE')
        for n in hn:
            if n in t_me.vertex_groups:
                t_me.vertex_groups[n].remove([int(i) for i in idx])
        flyttade[s] = int(len(idx))
    rap['arms_horn_med_handvikt_lagd_pa_underarmen'] = flyttade
    WT = vikter(t_me)

    # 2. ärmen mäts som ett rör och skärs av rakt där tyget slutar
    ror_ = {}
    for s in SIDOR:
        e, w0 = JT[s + 'ForeArm'], JT[s + 'Hand']
        d0 = enhet(w0 - e)
        fa = WT[s + 'ForeArm']
        arm_horn = (fa > 0.5) & (np.linalg.norm(np.cross(XT - e, d0), axis=1) < 0.09) & ((XT - e) @ d0 > 0)
        alfa = (XT - e) @ d0
        a_slut = float(np.percentile(alfa[arm_horn], 99.5))
        # ärmens mittlinje: två snitt genom ärmens yttre rör (det konvexa höljet, så att manschettens inåtvända kant och
        # hur tätt hörnen sitter inte drar mitten), 1,5–3,5 cm och 8–11 cm före ärmens slut
        cA, rA = ror(XT[arm_horn & (alfa > a_slut - 0.035) & (alfa < a_slut - 0.015)], d0)
        cB, _ = ror(XT[arm_horn & (alfa > a_slut - 0.11) & (alfa < a_slut - 0.08)], d0)
        axel = enhet(cA - cB)
        # manschettens kant: ett plant snitt tvärs ärmen där ärmens yttre rör slutar vara tyg, alltså där kroppens egen
        # hud börjar (hudfärgad i kroppens bild, samma prov som steg 3) eller tyget tar slut; allt bortom det går, och
        # kanten blir rak
        radn = np.linalg.norm(np.cross(XT - cA, axel), axis=1); al_n = (XT - cA) @ axel
        yttre = arm_horn & (radn > rA - 0.006) & (al_n > -0.02) & (al_n < 0.06) & np.isfinite(farg).all(1)
        hud = yttre & HUD(np.nan_to_num(farg))
        tyg = yttre & ~HUD(np.nan_to_num(farg))
        if tyg.sum() < 8:
            raise ValueError(f'Hittar ingen manschett vid {s}Hand.')
        snitt = min(float(np.percentile(al_n[hud], 5)) if hud.sum() >= 3 else np.inf, float(np.percentile(al_n[tyg], 98))) - 0.001
        ror_[s] = (cA + axel * snitt, axel, rA, d0)
    Mi = np.linalg.inv(np.array(t_me.matrix_world))
    bm = bmesh.new(); bm.from_mesh(me)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    regioner = {}
    for s in SIDOR:  # båda ärmarnas ytor väljs innan något snitt ändrar hörnens nummer
        c0, axel, rA, _ = ror_[s]
        i_region = (WT[s + 'ForeArm'] > 0.05) & (np.linalg.norm(np.cross(XT - c0, axel), axis=1) < 0.09) & ((XT - c0) @ axel > -0.06)
        regioner[s] = [f for f in bm.faces if all(i_region[v.index] for v in f.verts)]
    for s in SIDOR:
        c0, axel, rA, _ = ror_[s]
        region = regioner[s]
        geom = list({x for f in region for x in (*f.verts, *f.edges)}) + region
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector(Mi[:3, :3] @ c0 + Mi[:3, 3]),
                               plane_no=Vector(enhet(Mi[:3, :3] @ axel)), clear_outer=True)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(me); bm.free(); me.update()
    XT = varld(t_me); WT = vikter(t_me)

    # 3. leden till ärmens mitt, och ärmen ihoptryckt till strax innanför leden
    ram = {}
    Mi = np.linalg.inv(np.array(t_me.matrix_world))
    for s in SIDOR:
        e, w0 = JT[s + 'ForeArm'], JT[s + 'Hand']
        c0, axel, rA, d0 = ror_[s]
        fa = WT[s + 'ForeArm']
        # leden: figurens handled flyttad till ärmens mittlinje
        J = c0 + axel * ((w0 - c0) @ axel)
        plan = (c0 - J) @ axel                        # manschettens plan relativt leden, längs ärmen
        delta = max(0.0, plan + args.glapp)
        # ärmen trycks ihop längs ärmen, jämnt från armbågen: armbågen står still, manschetten flyttas delta in
        a_e = (e - J) @ axel; a_v = (XT - J) @ axel
        rad = np.linalg.norm(np.cross(XT - J, axel), axis=1)
        frac = np.clip((a_v - a_e) / (plan - a_e), 0, 1)
        vikt = np.clip(fa, 0, 1)
        rör = (frac > 0) & (rad < 0.12) & (vikt > 0)
        flytt = -delta * (frac * vikt)[:, None] * axel[None, :]
        XT[rör] += flytt[rör]
        ram[s] = {'J': J, 'axel': axel, 'c0': c0 - delta * axel, 'plan': plan - delta, 'w0': w0, 'e': e}
        rap.setdefault('leden', {})[s] = {
            'armens_radie_vid_manschetten_mm': round(rA * 1000, 1),
            'figurens_led_flyttad_till_armens_mitt_mm': round(float(np.linalg.norm(J - w0)) * 1000, 1),
            'armens_riktning_mot_figurens_underarm_grader': round(math.degrees(math.acos(min(1, abs(float(axel @ d0))))), 1),
            'manschetten_fore_mm_utanfor_leden': round(plan * 1000, 1),
            'armen_ihoptryckt_mm': round(delta * 1000, 1),
            'armens_del_ihoptryckt_procent': round(delta / (plan - a_e) * 100, 1),
            'manschetten_efter_mm_fore_leden': round(-(plan - delta) * 1000, 1),
            'horn_flyttade': int(rör.sum())}
    me.vertices.foreach_set('co', (XT @ Mi[:3, :3].T + Mi[:3, 3]).ravel()); me.update()

    # 4. dockans hand: urval, flytt, skala
    bitar = {}
    for s in SIDOR:
        R0 = ram[s]
        dw, de = JD[s + 'Hand'], JD[s + 'ForeArm']
        dax = enhet(dw - de)
        _, _, dpalm, _ = handram(JD, s)
        R1 = rot_mellan(dax, R0['axel'])
        # handflatan vriden kring underarmen dit figurens handflata pekade
        _, _, tpalm, _ = t_ram[s]
        a = R0['axel']
        p1 = R1 @ dpalm; p1 = enhet(p1 - (p1 @ a) * a); p2 = enhet(tpalm - (tpalm @ a) * a)
        phi = math.atan2(float(np.cross(p1, p2) @ a), float(p1 @ p2))
        R = rot_kring(a, phi) @ R1
        A = np.eye(4); A[:3, :3] = skala * R; A[:3, 3] = R0['J'] - skala * R @ dw
        R0.update(R=R, A=A)
        hd = WD[s + 'Hand'] + sum(WD.get(f'{s}Hand{f}{j}', 0) for f in FINGRAR for j in (1, 2, 3))
        armv = hd + sum(WD.get(s + n, 0) for n in ('ForeArm', 'ForeArmTwist1', 'ForeArmTwist2'))
        al = (XD - dw) @ dax
        radd = np.linalg.norm(np.cross(XD - dw, dax), axis=1)
        val = (armv > 0.5) & (al > -args.stump / skala) & (radd < 0.25)   # hela handen, tummens topp med
        bitar[s] = val
        rap.setdefault('handen', {})[s] = {'handflatan_vriden_kring_armen_grader': round(math.degrees(phi), 1),
                                           'dockans_underarm_mot_armen_grader': round(math.degrees(math.acos(min(1, float(R1 @ dax @ a)))), 2)}

    hud = Path(args.hud).resolve() if args.hud else None
    form = json.loads((hud / 'form.json').read_text(encoding='utf-8'))['skala'] if hud and not args.utan_form else None
    XDs = forma(XD, WD, JD, d_arm, form, rap) if form else XD

    # en kopia av dockans yta med båda händerna, utan former och utan dockans armatur
    bpy.ops.object.select_all(action='DESELECT')
    bit = d_me.copy(); bit.data = d_me.data.copy(); bpy.context.scene.collection.objects.link(bit)
    bit.parent = None; bit.matrix_world = Matrix.Identity(4)
    if bit.data.shape_keys:
        bit.shape_key_clear()
    for m in list(bit.modifiers):
        bit.modifiers.remove(m)
    meshy = Path(args.meshy_bild).resolve() if args.meshy_bild else None
    if meshy:
        projicera_meshy(bit, XD, JD, rap)
        hudbilder = ({'rygg': meshy, 'flata': meshy}, meshy.with_name('hud-bakad-meshy.png'))
    elif hud:
        projicera(bit, d_me, XD, JD, hud, rap)
        hudbilder = ({'rygg': hud / 'hud-rygg.png', 'flata': hud / 'hud-flata.png'}, hud / 'hud-bakad.png')
    else:
        hudbilder = None
    XB = XDs.copy()
    for s in SIDOR:
        A = ram[s]['A']
        XB[bitar[s]] = XDs[bitar[s]] @ A[:3, :3].T + A[:3, 3]
    bit.data.vertices.foreach_set('co', XB.ravel()); bit.data.update()
    bm = bmesh.new(); bm.from_mesh(bit.data); bm.verts.ensure_lookup_table()
    behåll = np.zeros(len(XB), bool)
    for s in SIDOR:
        behåll |= bitar[s]
    bm.faces.ensure_lookup_table()
    bort_f = [f for f in bm.faces if not all(behåll[v.index] for v in f.verts)]
    bmesh.ops.delete(bm, geom=bort_f, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    # glTF delar hörnen längs UV-sömmarna; de sys ihop igen (UV:n står kvar per hörn i ytan), annars öppnar delningen
    # nedan sömmarna till sprickor över handflatan och handleden
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bm.to_mesh(bit.data); bm.free(); bit.data.update()

    # stumpen inne i ärmen: det som skulle gå genom tyget dras in mot armens mitt (bara bakom manschetten)
    kropp_ytor = [list(p.vertices) for p in me.polygons]
    XT = varld(t_me)
    bvh = BVHTree.FromPolygons([Vector(p) for p in XT], kropp_ytor)
    XB = koord(bit)
    indragna = {s: 0 for s in SIDOR}
    for i, p in enumerate(XB):
        for s in SIDOR:
            R0 = ram[s]
            a = R0['axel']; al = (p - R0['J']) @ a
            if not (-args.stump - 0.01 < al < R0['plan'] + 0.002) or np.linalg.norm(p - R0['J']) > 0.12:
                continue
            centrum = R0['J'] + a * al; r = p - centrum; rn = float(np.linalg.norm(r))
            if rn < 1e-6:
                continue
            hit = bvh.ray_cast(Vector(centrum), Vector(r / rn), 0.2)
            if hit[0] is not None and hit[3] < rn + 0.0025:
                XB[i] = centrum + r / rn * max(0.004, hit[3] - 0.0025)
                indragna[s] += 1
    bit.data.vertices.foreach_set('co', XB.ravel()); bit.data.update()
    rap['stumpens_horn_indragna_i_armen'] = indragna

    # 5. en delning, så att handen är slät på nära håll (vikterna följer med)
    if args.delning:
        bpy.context.view_layer.objects.active = bit; bit.select_set(True)
        sub = bit.modifiers.new('delning', 'SUBSURF'); sub.levels = sub.render_levels = args.delning
        sub.boundary_smooth = 'PRESERVE_CORNERS'; sub.uv_smooth = 'NONE'
        bpy.ops.object.modifier_apply(modifier=sub.name)
        # delningen blandar grannarnas vikter: högst fyra ben per hörn igen, som glTF bär dem
        bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
        bit.select_set(False)

    # 5. huden: personens hand ur bilderna (--hud), annars en jämn ton ur figurens förra hand
    hudbild = baka(bit, *hudbilder, args.bildstorlek, rap) if hudbilder else None
    mat = bpy.data.materials.new('Dockhand'); mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    if hudbild:
        tx = mat.node_tree.nodes.new('ShaderNodeTexImage'); tx.image = hudbild
        mat.node_tree.links.new(tx.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        lin = np.where(hudton <= 0.04045, hudton / 12.92, ((hudton + 0.055) / 1.055) ** 2.4)
        bsdf.inputs['Base Color'].default_value = (*lin.tolist(), 1.0)
        rap['hudton_srgb'] = [round(float(x), 3) for x in hudton]
        rap['hudton_hex'] = '#' + ''.join(f'{int(round(float(x) * 255)):02x}' for x in hudton)
    bsdf.inputs['Roughness'].default_value = 0.55
    bit.data.materials.clear(); bit.data.materials.append(mat)
    # samma UV- och färglager som figuren, så att sammanfogningen inte lämnar svarta färger
    if t_me.data.uv_layers and bit.data.uv_layers:
        bit.data.uv_layers[0].name = t_me.data.uv_layers.active.name
    for ca in t_me.data.color_attributes:
        if ca.name not in bit.data.color_attributes:
            nca = bit.data.color_attributes.new(ca.name, ca.data_type, ca.domain)
            n = len(nca.data); nca.data.foreach_set('color', np.ones(n * 4))

    # 6. handens och fingrarnas ben byts mot dockans, flyttade på samma sätt
    MTi = np.linalg.inv(np.array(t_arm.matrix_world)); MD = np.array(d_arm.matrix_world)
    dben = {b.name: (np.array(b.matrix_local), b.length, b.parent.name if b.parent else None) for b in d_arm.data.bones}
    bpy.ops.object.select_all(action='DESELECT'); t_arm.select_set(True); bpy.context.view_layer.objects.active = t_arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = t_arm.data.edit_bones
    for s in SIDOR:
        R0 = ram[s]
        fe = eb[s + 'ForeArm']
        fe.tail = Vector((MTi @ np.append(R0['J'], 1))[:3])
        namn = [s + 'Hand'] + [f'{s}Hand{f}{j}' for f in FINGRAR for j in (1, 2, 3)]
        for n in namn:
            Ml, L, par = dben[n]
            N = MTi @ R0['A'] @ MD @ Ml
            rot = N[:3, :3] / skala
            u, _, vt = np.linalg.svd(rot); rot = u @ vt
            Q = np.eye(4); Q[:3, :3] = rot; Q[:3, 3] = N[:3, 3]
            b = eb.get(n) or eb.new(n)
            b.use_connect = False
            b.matrix = Matrix(Q.tolist()); b.length = float(L * skala)
            b.parent = eb[par] if par in eb else fe
            b.use_deform = True
    bpy.ops.object.mode_set(mode='OBJECT')
    J2 = leder(t_arm)
    rap['handleden_utanfor_manschetten_mm'] = {s: round(float((J2[s + 'Hand'] - ram[s]['c0']) @ ram[s]['axel']) * 1000, 1) for s in SIDOR}
    rap['underarmen_m_fore_efter'] = {s: [round(float(np.linalg.norm(ram[s]['w0'] - ram[s]['e'])), 4),
                                          round(float(np.linalg.norm(J2[s + 'Hand'] - J2[s + 'ForeArm'])), 4)] for s in SIDOR}

    # vridbenen (steg 6) på figurens ärm, innan dockans hand kommer in med sina egna
    rap['vridben'] = vridben.lagga_till(t_arm, t_me)

    # manschettens kant stängs mot handleden
    kantytor = lapp(t_me, bit, ram, rap)

    # dockans hand in i figuren, med dockans vikter
    n_fore = len(t_me.data.vertices)
    bpy.ops.object.select_all(action='DESELECT')
    bit.select_set(True); t_me.select_set(True); bpy.context.view_layer.objects.active = t_me
    bpy.ops.object.join()
    bort_g = [g.name for g in t_me.vertex_groups if g.name not in t_arm.data.bones]
    for g in bort_g:
        t_me.vertex_groups.remove(t_me.vertex_groups[g])
    bpy.ops.object.material_slot_remove_unused()
    rap['horn'] = {'figuren_utan_hander': n_fore, 'dockans_hander': len(t_me.data.vertices) - n_fore}
    rap['material'] = [s.material.name for s in t_me.material_slots]

    # 7. kontrollen före exporten
    rap['kontroll'] = kontroll(t_arm, t_me, n_fore, ram, kantytor)

    for o in list(bpy.data.objects):
        if o not in (t_arm, t_me):
            bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action='DESELECT'); t_arm.select_set(True); t_me.select_set(True)
    bpy.context.view_layer.objects.active = t_arm
    ny = utfil.with_suffix('.ny.glb')
    bpy.ops.export_scene.gltf(filepath=str(ny), export_format='GLB', use_selection=True, export_animations=False,
                              export_image_format='AUTO')
    os.replace(ny, utfil)
    txt = json.dumps(rap, indent=1, ensure_ascii=False, default=lambda x: x.tolist() if hasattr(x, 'tolist') else str(x))
    utfil.with_suffix('.json').write_text(txt, encoding='utf-8')
    print('DOCKANS HANDER KLART', utfil)
    print('RAPPORT', json.dumps({k: rap[k] for k in ('skala', 'leden', 'handleden_utanfor_manschetten_mm', 'kontroll')}, ensure_ascii=False))


def kontroll(arm, mesh, n_fore, ram, kantytor=()):
    """Handleden böjd 60 grader åt båda håll och vriden 80 grader åt båda håll (en tredjedel på Twist1, två tredjedelar på
    Twist2 och hela på handen, new_docka.md 7.1b). Räknar hörn ur dockans hand som ligger utanför ärmens tyg bakom
    manschetten (går igenom), och hur mycket manschettens kanter (de 4 cm närmast kanten) töjs mot vilan."""
    me = mesh.data
    E = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
    fig_ytor = [list(p.vertices) for p in me.polygons if p.index not in kantytor and all(v < n_fore for v in p.vertices)]
    # kantringens inre hörn följer huden och töjs med flit; de räknas inte till manschetten
    ringens = {v for p in me.polygons if p.index in kantytor for v in p.vertices} - {v for f in fig_ytor for v in f}

    def hud():
        ev = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        return varld(mesh, koord(ev))

    def nollstall():
        for pb in arm.pose.bones:
            pb.matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()

    def vrid(pb, axel, grader):
        ax = (arm.matrix_world.inverted().to_3x3() @ Vector(axel)).normalized()
        h = pb.head.copy()
        pb.matrix = Matrix.Translation(h) @ Matrix.Rotation(math.radians(grader), 4, ax) @ Matrix.Translation(-h) @ pb.matrix
        bpy.context.view_layer.update()

    arm.data.pose_position = 'POSE'
    nollstall(); vila = hud()
    ut = {}
    for s in SIDOR:
        R0 = ram[s]; a = R0['axel']
        J = leder(arm)
        _, f, palm, _ = handram(J, s)
        hand = np.arange(n_fore, len(vila))
        hand = hand[np.linalg.norm(vila[hand] - J[s + 'Hand'], axis=1) < 0.3]
        alv = (vila - J[s + 'Hand']) @ a
        radv = np.linalg.norm(np.cross(vila - J[s + 'Hand'], a), axis=1)
        mans = np.arange(n_fore)[(alv[:n_fore] > R0['plan'] - 0.04) & (alv[:n_fore] < R0['plan'] + 0.01) & (radv[:n_fore] < 0.09)]
        mm = np.zeros(len(vila), bool); mm[mans] = True; mm[list(ringens)] = False
        mk = E[mm[E].all(1)]
        l0 = np.linalg.norm(vila[mk[:, 0]] - vila[mk[:, 1]], axis=1)
        r = {}
        for namn, fn in (('bojd_mot_handflatan_60', lambda pb: vrid(pb['Hand'], np.cross(f, palm), 60)),
                         ('bojd_mot_handryggen_60', lambda pb: vrid(pb['Hand'], np.cross(f, palm), -60)),
                         ('vriden_80', lambda pb: [vrid(pb[k], a, g) for k, g in (('ForeArmTwist1', 80 / 3), ('ForeArmTwist2', 160 / 3), ('Hand', 80))]),
                         ('vriden_minus_80', lambda pb: [vrid(pb[k], a, g) for k, g in (('ForeArmTwist1', -80 / 3), ('ForeArmTwist2', -160 / 3), ('Hand', -80))])):
            nollstall()
            fn({k: arm.pose.bones[s + k] for k in ('Hand', 'ForeArmTwist1', 'ForeArmTwist2')})
            X = hud()
            bvh = BVHTree.FromPolygons([Vector(p) for p in X[:n_fore]], fig_ytor)
            igenom = 0; djup = 0.0
            for i in hand:
                p = X[i]; al = (p - J[s + 'Hand']) @ a
                # bara hörn som ligger inne i ärmen i vila (stumpen och handleden bakom manschetten): går ett av dem ut
                # genom tyget är det en genomstick; fingrar som böjs bakåt utanför ärmen är det inte
                if alv[i] >= R0['plan'] - 0.001 or not (al < R0['plan'] - 0.001 and al > R0['plan'] - 0.06):
                    continue
                c = J[s + 'Hand'] + a * al; rv = p - c; rn = float(np.linalg.norm(rv))
                if rn < 1e-6:
                    continue
                hit = bvh.ray_cast(Vector(c), Vector(rv / rn), 0.2)
                if hit[0] is not None and hit[3] < rn - 0.0005:
                    igenom += 1; djup = max(djup, rn - hit[3])
            l1 = np.linalg.norm(X[mk[:, 0]] - X[mk[:, 1]], axis=1)
            kv = l1 / np.maximum(l0, 1e-9)
            r[namn] = {'hand_horn_genom_armen': igenom, 'djupast_utanfor_tyget_mm': round(djup * 1000, 1),
                       'manschettens_kanter_toj_max_procent': round(float(np.abs(kv - 1).max()) * 100, 2),
                       'manschettens_kanter_toj_p99_procent': round(float(np.percentile(np.abs(kv - 1), 99)) * 100, 2)}
        r['hand_horn_inne_i_armen_i_vila'] = int((alv[hand] < R0['plan'] - 0.001).sum()); r['manschettens_kanter'] = int(len(mk))
        ut[s] = r
    nollstall()
    arm.data.pose_position = 'REST'
    return ut


if __name__ == '__main__':
    main()
