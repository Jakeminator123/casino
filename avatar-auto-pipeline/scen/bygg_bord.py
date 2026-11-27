"""Bygger standardbordet, vår klon av ett riktigt livebord mätt på film, procedurellt ur scen/standard.yaml (meter, Z upp).

Kör:  blender -b --python-exit-code 1 --python scen/bygg_bord.py [-- --med-bricka]
Ut:   assets/bord/standardbord_live.blend och assets/bord/standardbord_live.glb
      (med --med-bricka assets/bord/standardbord_live_bricka.blend/.glb)
Allt mått kommer ur standard.yaml (ur spelets LIVE i ../blackjack-dealer/src/table-live.ts) – ändra där, inte här.

Filten är livebordets halvcirkel. Rullen är livebordets (mätt: en låg läderrulle som står på filtens kant) och går runt
bågen och rakt längs kanten mot dealern; bakom kanten vid dealerns högra sida ramar den in en hylla, som livebordets.
Skon, lådan för använda kort, insatsmärkena och kortplatserna står där livebordet har dem, med vårt utseende (filt,
sarg, rullens läder, ben och färger). Skon är deras
(sko nedan): en lång klar låda, öppen upptill, med en klar ram i fronten, och kortleken liggande på en bädd som
stiger bakåt, nästa kort i frontens fönster med ryggen utåt; och en lös klar bit plant på filten framför (sko_los_bit).
I lådan för använda kort ligger en korthög med ryggen upp. Livebordet har ingen markerbricka; med --med-bricka läggs
vår (markerbricka i standard.yaml) in vid dealerkanten som ett tillägg.
Origo ligger på golvet under dealerkanten.
"""
import math, os, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _bpy_hjalp import *  # noqa: F401,F403  (bpy, bmesh, Vector, STD, ...)

MED_BRICKA = '--med-bricka' in sys.argv  # vår markerbricka, ett tillägg (livebordet har ingen)
for _a in sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []:
    if _a != '--med-bricka':
        raise SystemExit('okänt val %s: bygg_bord.py tar bara --med-bricka; måtten står i standard.yaml' % _a)

ASSETS = ROOT / 'assets' / 'bord'
TEX = ASSETS / 'texturer'
KORT = ASSETS / 'kort'
FZ = STD['filt_z']
B = STD['bord']
print('bygg_bord livebordet: filtens radie %.4f, djup %.3f%s' % (B['radie'], B['djup'], ', med vår markerbricka' if MED_BRICKA else ''))


def prism(name, pts, z0, z1, col, mat, uvscale=1.0):
    bm = bmesh.new(); vs = [bm.verts.new((x, y, z0)) for x, y in pts]
    f = bm.faces.new(vs)
    if f.normal.z > 0:
        f.normal_flip()
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    top = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top, vec=(0, 0, z1 - z0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    lay = bm.loops.layers.uv.verify()
    for fc in bm.faces:  # sidor: u längs konturen ungefär via atan, topp/botten planärt
        for l in fc.loops:
            co = l.vert.co
            if abs(fc.normal.z) > 0.5:
                l[lay].uv = (co.x / uvscale, co.y / uvscale)
            else:
                l[lay].uv = ((co.x + co.y) / uvscale, co.z / uvscale)
    return obj_from_bm(name, bm, col, mat)


def felt_sheet(name, pts, z, col, mat):
    bm = bmesh.new(); vs = [bm.verts.new((x, y, z)) for x, y in pts]
    f = bm.faces.new(vs)
    if f.normal.z < 0:
        f.normal_flip()
    bmesh.ops.triangulate(bm, faces=[f], quad_method='BEAUTY', ngon_method='BEAUTY')
    uv_planar(bm)
    return obj_from_bm(name, bm, col, mat)


def band(name, pts, z0, z1, grow, col, mat):
    """Remsa längs konturen, utflyttad `grow` meter (för mässingslinjen)."""
    n = len(pts); bm = bmesh.new(); lo, hi = [], []
    for i in range(n):
        a, b, c = Vector(pts[i-1]), Vector(pts[i]), Vector(pts[(i+1) % n])
        t = (c - a).normalized(); nrm = Vector((t.y, -t.x))  # utåt för moturs kontur
        p = b + nrm * grow
        lo.append(bm.verts.new((p.x, p.y, z0))); hi.append(bm.verts.new((p.x, p.y, z1)))
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, col, mat)


def _bage():
    """Filtens båge kring standard.yaml bord.mitt: vinklarna där den möter dealerkanten (Y = 0) på höger och vänster sida,
    i varvet höger, spelarkanten, vänster."""
    cx, cy = B['mitt']; R = B['radie']
    a = math.asin(max(-1.0, min(1.0, cy / R)))  # bågen möter kanten strax bakom sin vidaste punkt
    return cx, cy, -a, -math.pi + a


def outline(grow=0.0, notch=None):
    """Filten: en cirkelbåge med den mätta radien (plus `grow`, för sargen under rullen) och den raka dealerkanten vid
    Y = 0, eventuellt med brickans urtag."""
    n = B['kontur_bagsteg']; cx, cy, t0, t1 = _bage(); r = B['radie'] + grow
    pts = [(cx + r * math.cos(t0 + (t1 - t0) * i / n), cy + r * math.sin(t0 + (t1 - t0) * i / n)) for i in range(n + 1)]
    pts[0] = (pts[0][0], 0.0); pts[-1] = (pts[-1][0], 0.0)  # ändarna exakt i kanten
    if notch:
        x0, x1, s1 = notch['x0'], notch['x1'], notch['s1']
        pts += [(x0, 0.0), (x0, -s1), (x1, -s1), (x1, 0.0)]
    return pts, n


def _sektion(hojd=1.0, P=24):
    """Rullens sektion (bord.vadderad_kant): två halva ellipser kring en mitt bredd/2 ut från filtens kant, i filtens nivå;
    (ut, upp) i meter. `hojd` krymper den på höjden (hyllans ram ligger 1 mm under rullen där de möts, så att ytorna inte
    blandas)."""
    rl = B['vadderad_kant']; w = rl['bredd']
    return [(w / 2 + w / 2 * math.cos(a), hojd * (rl['over_filt'] if math.sin(a) > 0 else rl['under_filt']) * math.sin(a))
            for a in (2 * math.pi * j / P for j in range(P))]


def _svep(name, vag, sluten, col, mat, hojd=1.0):
    """Rullen svept längs vägen `vag` (punkter (X, Y) på dess insida, i filtens nivå): sektionen når ut åt vänster om
    färdriktningen, och i varje hörn ligger den längs bisektrisen (geringen), så att två raka sträckor möts i ett snitt."""
    sek = _sektion(hojd); P = len(sek); n = len(vag); bm = bmesh.new(); rings = []
    for i in range(n):
        p = Vector(vag[i])
        fore = Vector(vag[i - 1]) if (i > 0 or sluten) else None
        efter = Vector(vag[(i + 1) % n]) if (i < n - 1 or sluten) else None
        nor = []
        for a, b in ((fore, p), (p, efter)):
            if a is not None and b is not None:
                d = (b - a).normalized(); nor.append(Vector((-d.y, d.x)))
        m = (nor[0] + nor[-1]).normalized(); s = 1.0 / max(0.3, m.dot(nor[0]))
        rings.append([bm.verts.new((p.x + m.x * o * s, p.y + m.y * o * s, FZ + h)) for o, h in sek])
    for i in range(n if sluten else n - 1):
        r0, r1 = rings[i], rings[(i + 1) % n]
        for j in range(P):
            bm.faces.new((r0[j], r0[(j + 1) % P], r1[(j + 1) % P], r1[j]))
    if not sluten:
        bm.faces.new(rings[0]); bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.verts.index_update()
    lay = bm.loops.layers.uv.verify(); langs = 0.0; u = []
    for i in range(n):
        if i:
            langs += (Vector(vag[i]) - Vector(vag[i - 1])).length
        u.append(langs)
    for f in bm.faces:  # läderns textur: u längs vägen, v runt sektionen
        for lp in f.loops:
            k = lp.vert.index; i, j = k // P, k % P
            lp[lay].uv = (u[i] if i < n else 0.0, j / P * 0.25)
    ob = obj_from_bm(name, bm, col, mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def hylla_matt():
    """Hyllan bakom kanten mot dealern (bord.hylla): ramens insida X vänster och höger, Y fram (rullens bortre sida längs
    kanten) och bak."""
    w = B['vadderad_kant']['bredd']; hy = B['hylla']
    return hy['vanster_inre'], hy['hoger_yttre'] - w, w, hy['bak_yttre'] - w


def rail(col, mat):
    """Rullen runt filten: längs bågen och rakt längs kanten mot dealern, en sluten slinga med samma sektion; och hyllans
    ram bakom kanten vid dealerns högra sida, vars vänstra sida är bågens ände som går rakt bakåt."""
    pts, _ = outline()
    slinga = _svep('bord_vaddering', pts, True, col, mat)  # bågen höger -> spelarna -> vänster, sedan kanten tillbaka
    x0, x1, y0, y1 = hylla_matt(); w = B['vadderad_kant']['bredd']
    ram = _svep('bord_hylla_ram', [(x0, w / 2), (x0, y1), (x1, y1), (x1, w / 2)], False, col, mat, hojd=0.95)
    return slinga, ram


def cylinder(name, loc, r0, r1, h, col, mat, seg=48, axis='Z'):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=h)
    ob = obj_from_bm(name, bm, col, mat)
    if axis == 'Y':
        ob.rotation_euler = (math.radians(90), 0, 0)
    ob.location = loc
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def box(name, size, loc, col, mat, rot_z=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts); uv_planar(bm)
    ob = obj_from_bm(name, bm, col, mat); ob.location = loc; ob.rotation_euler = (0, 0, rot_z); return ob


# ---------------------------------------------------------------- kort
def card_mesh(name, cell, back_cell, cols=13, rows=5):
    K = STD['kort']; w, l, t, rc = K['bredd'], K['langd'], K['tjocklek'], K['hornradie']
    bm = bmesh.new()
    vs = [bm.verts.new(v) for v in ((-w/2, -l/2, 0), (w/2, -l/2, 0), (w/2, l/2, 0), (-w/2, l/2, 0))]
    f = bm.faces.new(vs)
    bmesh.ops.bevel(bm, geom=vs, offset=rc, segments=4, affect='VERTICES')
    bm.faces.ensure_lookup_table(); face = bm.faces[0]
    r = bmesh.ops.extrude_face_region(bm, geom=[face])
    top = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top, vec=(0, 0, t))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    lay = bm.loops.layers.uv.verify()
    def cell_uv(c, co, flip):
        cx, cy = c % cols, c // cols
        u = (co.x / w + 0.5); v = (co.y / l + 0.5)
        if flip:
            u = 1 - u
        return ((cx + u) / cols, 1 - (cy + 1 - v) / rows)
    for fc in bm.faces:
        for lp in fc.loops:
            if fc.normal.z > 0.5:
                lp[lay].uv = cell_uv(cell, lp.vert.co, False); fc.material_index = 0
            elif fc.normal.z < -0.5:
                lp[lay].uv = cell_uv(back_cell, lp.vert.co, True); fc.material_index = 0
            else:
                lp[lay].uv = (0.0005, 0.9995); fc.material_index = 1  # kant: vit
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return me


# ---------------------------------------------------------------- skon
# Livebordets sko som filmen visar den (mätt i live-bj 2026-11-27; måtten i standard.yaml sko, ur spelets
# LIVE.shoe): en lång klar låda, öppen upptill, med väggarnas överkant rakt från frontens topp till ryggens. Fronten är en
# klar ram som lutar bakåt från fotens främre kant, med ett fönster där nästa kort syns och fingret tar det; nedtill är
# den öppen, där kortet dras ut under den. Inne i skon ligger kortleken på en bädd som stiger bakåt, varje kort lutat
# som fronten och med långsidan tvärs skon, ryggen utåt; bakom leken en klar kloss som håller den. Klar plast syns på
# sina kanter: varje kant får en ljus list (AKRYL_KANT), och kortbuntens kanter är randiga som en hög kort.
AKRYL_KANT = 0.0012       # antaget: listernas halva bredd, så att den klara plasten syns som i filmen (ljusa kanter)
RAM = dict(sida=0.0035, t=0.003)  # antaget: frontramens sidolister innanför väggarna och dess tjocklek
KLOSS = 0.045             # antaget: den klara klossen bakom leken, längs bädden (filmen visar en klar kloss med ett hjul)
LEK_RAND = 0.015          # buntens randmönster går igen var 15:e mm längs bädden


def _klar(name, alpha, color=(0.92, 0.95, 1.0, 1), rough=0.03):
    m = pbr(name, color, rough=rough)
    m.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = alpha
    try:
        m.surface_render_method = 'BLENDED'
    except AttributeError:
        m.blend_method = 'BLEND'
    return m


def _rand_material():
    """Kortbuntens kant: vita kortkanter med en mörkare skarv var 1,4 mm och lite olika ljusa däremellan, så att bunten
    läses som kort på kant (en bild i 4 x 64 punkter över LEK_RAND, packad i filen så att glb:n bär den)."""
    img = bpy.data.images.get('kortkant_rander') or bpy.data.images.new('kortkant_rander', 4, 64)
    px = []
    for j in range(64):
        g = 0.58 if j % 6 == 0 else 0.93 - 0.06 * ((j * 37) % 5) / 4
        px += [g, g * 0.98, g * 0.94, 1.0] * 4
    img.pixels = px; img.pack()
    m = pbr('kortbunt_rander', rough=0.7)
    t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Closest'
    m.node_tree.links.new(t.outputs[0], m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    return m


def _listverk(name, segs, col, mat, r=AKRYL_KANT):
    """Tunna fyrkantiga lister längs sträckor (a, b): klar plasts ljusa kanter."""
    bm = bmesh.new()
    for a, b in segs:
        a, b = Vector(a), Vector(b); d = b - a
        if d.length < 1e-6:
            continue
        u = d.normalized(); o = u.cross(Vector((0, 0, 1)))
        o = o.normalized() if o.length > 1e-6 else Vector((1, 0, 0)); p = u.cross(o).normalized()
        ring = [o * r + p * r, -o * r + p * r, -o * r - p * r, o * r - p * r]
        va = [bm.verts.new(a + q) for q in ring]; vb = [bm.verts.new(b + q) for q in ring]
        for i in range(4):
            j = (i + 1) % 4; bm.faces.new((va[i], va[j], vb[j], vb[i]))
        bm.faces.new(va[::-1]); bm.faces.new(vb)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, col, mat)


def sko(c_sko, m_card, back_cell):
    """Livebordets sko (se ovan). Ger ingenting: den flyttas aldrig."""
    K = STD['kort']; sk = STD['sko']
    front = Vector(sk['fot_fram']); yawb = math.radians(sk['yaw_bakat'])
    ax = Vector((math.cos(yawb), math.sin(yawb), 0)); side = Vector((-ax.y, ax.x, 0)); up = Vector((0, 0, 1))
    lean = math.radians(sk['platta_lutning_grader']); bed = math.radians(sk['badd_lutning_grader'])
    hf, hb, ln, wd = sk['hojd_fram'], sk['hojd_bak'], sk['langd'], sk['bredd']
    uf = hf / math.tan(lean); wt = 0.003
    P = lambda u, v, h: front + ax * u + side * v + up * h
    m_klar = _klar('sko_akryl', 0.05)  # så klar att kortleken syns genom två väggar; kanterna (m_kant) visar plasten
    m_kant = _klar('sko_akryl_kant', 0.55, (0.97, 0.98, 1.0, 1), rough=0.15)
    m_rand = _rand_material()
    kanter = []

    def skiva(name, pts, tjock, mat):
        """En klar skiva: polygonen pts (världens punkter, i ett plan) och lika stor tjock bakom sig (vektor)."""
        bm = bmesh.new(); a = [bm.verts.new(p) for p in pts]; b = [bm.verts.new(p + tjock) for p in pts]
        bm.faces.new(a); bm.faces.new(b[::-1])
        for i in range(len(pts)):
            j = (i + 1) % len(pts); bm.faces.new((a[i], a[j], b[j], b[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return obj_from_bm(name, bm, c_sko, mat)

    # huset: sidoväggarna (profilen: foten, ryggen, överkanten rakt från frontens topp), botten och ryggen; öppet upptill
    prof = [(0.0, 0.0), (ln, 0.0), (ln, hb), (uf, hf)]
    skiva('sko_vagg_nara', [P(u, 0, h) for u, h in prof], side * wt, m_klar)
    skiva('sko_vagg_bortre', [P(u, wd, h) for u, h in prof], -side * wt, m_klar)
    skiva('sko_botten', [P(0, 0, 0), P(ln, 0, 0), P(ln, wd, 0), P(0, wd, 0)], up * wt, m_klar)
    skiva('sko_rygg', [P(ln, 0, 0), P(ln, wd, 0), P(ln, wd, hb), P(ln, 0, hb)], -ax * wt, m_klar)
    for v in (0.0, wd):
        kanter += [(P(0, v, 0), P(ln, v, 0)), (P(ln, v, 0), P(ln, v, hb)), (P(ln, v, hb), P(uf, v, hf)), (P(uf, v, hf), P(0, v, 0))]
    kanter += [(P(0, 0, 0), P(0, wd, 0)), (P(ln, 0, 0), P(ln, wd, 0)), (P(ln, 0, hb), P(ln, wd, hb)), (P(uf, 0, hf), P(uf, wd, hf))]

    # fronten: en ram i frontens plan (s uppför den från fotens framkant), sidolister och en överlist; nedtill öppen
    S = ax * math.cos(lean) + up * math.sin(lean); N = -ax * math.sin(lean) + up * math.cos(lean)
    F = lambda s, v: front + S * s + side * v
    s_top = hf / math.sin(lean); s_kort = sk['fonster_lyft'] / math.sin(lean) + K['bredd'] + 0.002   # fönstrets överkant, 2 mm över kortet
    v0, v1 = wt + RAM['sida'], wd - wt - RAM['sida']
    for nm, pts in (('sko_front_nara', [F(0, wt), F(0, v0), F(s_top, v0), F(s_top, wt)]), ('sko_front_bortre', [F(0, v1), F(0, wd - wt), F(s_top, wd - wt), F(s_top, v1)]),
                    ('sko_front_topp', [F(s_kort, v0), F(s_kort, v1), F(s_top, v1), F(s_top, v0)])):
        skiva(nm, pts, -N * RAM['t'], m_klar)
    kanter += [(F(s_kort, v0), F(s_kort, v1)), (F(0, v0), F(s_kort, v0)), (F(0, v1), F(s_kort, v1))]

    # bädden: från kortets underkant framtill, stigande bakåt till ryggen, 3 mm tjock under sin yta
    Bd = ax * math.cos(bed) + up * math.sin(bed)
    u_b0 = sk['fonster_lyft'] / math.tan(lean); h_b0 = sk['fonster_lyft']
    run = (ln - wt - u_b0) / math.cos(bed)
    b0, b1 = P(u_b0, wt, h_b0), P(u_b0, wd - wt, h_b0)
    skiva('sko_badd', [b0, b1, b1 + Bd * run, b0 + Bd * run], -up * 0.003, m_klar)
    kanter += [(b0, b1), (b0, b0 + Bd * run), (b1, b1 + Bd * run)]

    # kortleken: de fem främsta korten som egna objekt (dragbara), resten som en bunt längs bädden. Kortets kortsida
    # (meshens X) uppför fronten och långsidan (Y) tvärs skon, ryggen utåt. Egen mesh med ryggen på båda sidor: den heter
    # inte kort_*, eftersom editorn (standarddocka/editor/scen.ts) döljer bordets lösa kort med det namnet.
    mes = card_mesh('sko_kortrygg', back_cell, back_cell); mes.materials.append(m_card); mes.materials.append(m_rand)
    ac = Vector(sk['fonsterkort_kortsida']).normalized(); lg = Vector(sk['fonsterkort_langsida']).normalized()
    nrm = ac.cross(lg)
    if nrm.dot(ax) > 0:  # normalen ska peka ut ur skon (framåt), med bevarad högerhandad matris (det=+1)
        lg = -lg; nrm = -nrm
    rot = Matrix((ac, lg, nrm)).transposed().to_4x4()
    step = Bd * (K['tjocklek'] / math.sin(lean - bed))   # nästa kort: lika tjockt bakom, med underkanten på bädden
    c0 = Vector(sk['fonsterkort_mitt'])
    for k in range(5):
        ob = bpy.data.objects.new(f'sko_kort_{k+1}', mes); c_sko.objects.link(ob)
        ob.matrix_world = Matrix.Translation(c0 + step * k) @ rot @ Matrix.Rotation(math.pi, 4, 'Y')  # baksidan utåt
        ob['dragbart'] = True
    langd = sk['lek_langd']; ncards = int(round(langd / step.length)); depth = langd - 5 * step.length
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(K['bredd'], K['langd'], 1), verts=bm.verts)
    for v in bm.verts:  # skjuv: varje kort ligger lika långt bakom det förra längs bädden
        k = v.co.z + 0.5; v.co.z = 0
        v.co = rot.to_3x3() @ v.co + Bd * (step.length * 5 + depth * k)
    lay = bm.loops.layers.uv.verify()
    for f in bm.faces:  # ränderna längs bädden: v är sträckan bakåt, så att varje rand ligger som kortens kanter
        for lp in f.loops:
            lp[lay].uv = (0.5, (lp.vert.co @ Bd) / LEK_RAND)
    bunt = obj_from_bm('sko_kortbunt', bm, c_sko, m_rand); bunt.location = c0
    bunt['kort'] = ncards

    # klossen bakom leken: klar, lika stor som ett kort, längs bädden
    k0 = c0 + Bd * langd; hx, hy = ac * (K['bredd'] / 2), lg * (K['langd'] / 2 + 0.002)
    yta = [k0 - hx - hy, k0 + hx - hy, k0 + hx + hy, k0 - hx + hy]
    skiva('sko_kloss', yta, Bd * KLOSS, m_klar)
    kanter += [(a, b) for a, b in zip(yta, yta[1:] + yta[:1])] + [(p, p + Bd * KLOSS) for p in yta]

    # den lösa klara biten som ligger plant på filten framför skon; kortet som dras ut glider över den
    lb = [Vector((p[0], p[1], FZ)) for p in STD['los_bit']['horn']]
    skiva('sko_los_bit', lb, up * 0.003, m_klar)
    kanter += [(a + up * 0.003, b + up * 0.003) for a, b in zip(lb, lb[1:] + lb[:1])]
    _listverk('sko_kanter', kanter, c_sko, m_kant)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0  # inga .blend1-kopior
    sc = bpy.context.scene; sc.unit_settings.system = 'METRIC'; sc.unit_settings.length_unit = 'METERS'
    top = coll('standardbord'); c_bord = coll('bord', top); c_sko = coll('sko', top); c_bricka = coll('markerbricka', top)
    c_mark = coll('markeringar', top); c_lek = coll('kortlek', top); c_giv = coll('exempelgiv', top)

    m_felt = pbr('filt', hexcol(B['filtfarg_srgb']), rough=0.95, maps={'nor': TEX/'filt_nor_gl_2k.jpg', 'rough': TEX/'filt_rough_2k.jpg', 'diff': TEX/'filt_diff_2k.jpg'},
                 tile=(B.get('texturer_skala_m') or {}).get('filt', [0.40, 0.40])[0], tint=(hexcol(B['filtfarg_srgb']), 1.3))
    m_wood = pbr('tra_valnot', maps={'diff': TEX/'tra_diff_2k.jpg', 'nor': TEX/'tra_nor_gl_2k.jpg', 'rough': TEX/'tra_rough_2k.jpg'}, tile=1.8)
    m_leather = pbr('lader_brun', maps={'diff': TEX/'lader_diff_2k.jpg', 'nor': TEX/'lader_nor_gl_2k.jpg', 'rough': TEX/'lader_rough_2k.jpg'}, tile=0.4)
    m_brass = pbr('massing', (0.78, 0.6, 0.3, 1), rough=0.3, metal=1.0)
    m_gold = pbr('markering_guld', hexcol(B['markeringsfarg_srgb']), rough=0.6)
    m_acryl = pbr('kassering_akryl', (0.9, 0.95, 1.0, 1), rough=0.05)
    m_acryl.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.3
    try:
        m_acryl.surface_render_method = 'BLENDED'
    except AttributeError:
        m_acryl.blend_method = 'BLEND'
    m_tray = pbr('bricka_svart', (0.015, 0.015, 0.015, 1), rough=0.5)
    m_edge = pbr('kortkant', (0.92, 0.91, 0.88, 1), rough=0.6)
    m_card = pbr('kort', rough=0.35)
    nt = m_card.node_tree; ti = tex_node(nt, KORT/'kortatlas.png'); ti.interpolation = 'Cubic'
    nt.links.new(ti.outputs[0], nt.nodes['Principled BSDF'].inputs['Base Color'])

    tr = STD['markerbricka'] if MED_BRICKA else None  # livebordet har ingen bricka; --med-bricka lägger vår
    urtag = tr['urtag'] if tr else None
    pts, narc = outline(notch=urtag)
    felt = felt_sheet('bord_filt', pts, FZ, c_bord, m_felt)
    sg = B['sarg']
    # sargen når ut under rullen, som ligger utanför filten runt bågen och bakom kanten mot dealern, och under hyllan
    w = B['vadderad_kant']['bredd']; ut = outline(w)[0]; xv, xh = ut[-1][0], ut[0][0]  # rullens yttre ändar längs kanten
    prism('bord_sarg', outline(w, notch=urtag)[0], FZ + sg['underkant'], FZ + sg['underlagg'], c_bord, m_wood)
    prism('bord_sarg_kant', [(xv, 0.0), (xh, 0.0), (xh, w), (xv, w)], FZ + sg['underkant'], FZ + sg['underlagg'], c_bord, m_wood)
    hx0, hx1, hy0, hy1 = hylla_matt()
    prism('bord_hylla_sarg', [(hx0 - w, 0.0), (hx1 + w, 0.0), (hx1 + w, hy1 + w), (hx0 - w, hy1 + w)], FZ + sg['underkant'], FZ + sg['underlagg'], c_bord, m_wood)
    felt_sheet('bord_hylla_filt', [(hx0, hy0 * 0.9), (hx1, hy0 * 0.9), (hx1, hy1), (hx0, hy1)], FZ, c_bord, m_felt)
    band('bord_massingslinje', pts, FZ + sg['massingslinje'][0], FZ + sg['massingslinje'][1], 0.0008, c_bord, m_brass)
    rail(c_bord, m_leather)
    lg = B['ben']; legh = FZ + sg['underkant'] - lg['platta_hojd']
    for sx in (-1, 1):
        cylinder(f'bord_ben_{"v" if sx < 0 else "h"}', (sx * lg['x'], -lg['s'], lg['platta_hojd'] + legh / 2), lg['radie_fot'], lg['radie_topp'], legh, c_bord, m_wood)
        cylinder(f'bord_benplatta_{"v" if sx < 0 else "h"}', (sx * lg['x'], -lg['s'], lg['platta_hojd'] / 2), lg['platta_radie'], lg['platta_radie'], lg['platta_hojd'], c_bord, m_brass)

    # ---- markerbricka: låda nedsänkt i urtaget, chips på kant i rader längs Y (livebordet har ingen; bara med --med-bricka)
    if tr is not None:
        x0, x1, s0, s1, dep = tr['x0'], tr['x1'], tr['s0'], tr['s1'], tr['djup']; wall = 0.004
        box('bricka_botten', (x1 - x0, s1 - s0, 0.004), ((x0 + x1) / 2, -(s0 + s1) / 2, FZ - dep), c_bricka, m_tray)
        for nm, sz, lc in (('bricka_vagg_v', (wall, s1 - s0, dep), (x0 + wall/2, -(s0+s1)/2, FZ - dep/2)),
                           ('bricka_vagg_h', (wall, s1 - s0, dep), (x1 - wall/2, -(s0+s1)/2, FZ - dep/2)),
                           ('bricka_vagg_fram', (x1 - x0, wall, dep), ((x0+x1)/2, -s1 + wall/2, FZ - dep/2)),
                           ('bricka_vagg_bak', (x1 - x0, wall, dep), ((x0+x1)/2, -s0 - wall/2, FZ - dep/2))):
            box(nm, sz, lc, c_bricka, m_tray)
        rim = tr.get('kant_bredd', 0.007)
        box('bricka_ram_v', (rim, s1 - s0 + rim, 0.0028), (x0 - rim/2 + 0.001, -(s0 + s1 + rim)/2, FZ + 0.0009), c_bricka, m_brass)
        box('bricka_ram_h', (rim, s1 - s0 + rim, 0.0028), (x1 + rim/2 - 0.001, -(s0 + s1 + rim)/2, FZ + 0.0009), c_bricka, m_brass)
        box('bricka_ram_fram', (x1 - x0 + 2*rim, rim, 0.0028), ((x0+x1)/2, -s1 - rim/2 + 0.001, FZ + 0.0009), c_bricka, m_brass)
        box('bricka_ram_bak', (x1 - x0 + 2*rim, rim, 0.0028), ((x0+x1)/2, -s0 - rim/2, FZ + 0.0009), c_bricka, m_brass)
        chipcol = {5: (0.55, 0.03, 0.03, 1), 25: (0.02, 0.32, 0.08, 1), 100: (0.02, 0.02, 0.02, 1), 500: (0.3, 0.05, 0.42, 1), 1000: (0.85, 0.55, 0.05, 1)}
        rows = tr['rad_valorer']; pitch = (x1 - x0 - 2 * wall) / len(rows); cr, chh = tr['chip_radie'], tr['chip_hojd']
        nchips = 20; L = nchips * chh
        for i, v in enumerate(rows):
            x = x0 + wall + pitch * (i + 0.5); s_end = s1 - wall - 0.002
            m = pbr(f'chip_{v}', chipcol[v], rough=0.4)
            cylinder(f'bricka_rad_{i+1:02d}_{v}', (x, -(s_end - L / 2), FZ - 0.002 - cr), cr, cr, L, c_bricka, m, seg=32, axis='Y')

    # ---- markeringar: guldram runt varje kortplats, där korten landar (platser), vridna som de låg (yaw_kort); det tredje
    # kortet, som landar ovanpå de två första, får ingen egen ram.
    K = STD['kort']; mg, lw = K['markering']['marginal'], K['markering']['linjebredd']
    PL = STD['platser']
    vridning = lambda pid: math.radians(PL[pid]['yaw_kort'])
    for pid, p in PL.items():
        if pid.endswith('.C3'):
            continue
        cx, cy = p['pos'][0], p['pos'][1]; hw, hl = K['bredd']/2 + mg, K['langd']/2 + mg; vr = vridning(pid)
        vrid = lambda q: (cx + (q[0]-cx)*math.cos(vr) - (q[1]-cy)*math.sin(vr), cy + (q[0]-cx)*math.sin(vr) + (q[1]-cy)*math.cos(vr))
        bm = bmesh.new()
        outer = [vrid(q) for q in [(cx-hw, cy-hl), (cx+hw, cy-hl), (cx+hw, cy+hl), (cx-hw, cy+hl)]]
        inner = [vrid(q) for q in [(cx-hw+lw, cy-hl+lw), (cx+hw-lw, cy-hl+lw), (cx+hw-lw, cy+hl-lw), (cx-hw+lw, cy+hl-lw)]]
        vo = [bm.verts.new((x, y, FZ + 0.0002)) for x, y in outer]; vi = [bm.verts.new((x, y, FZ + 0.0002)) for x, y in inner]
        for k in range(4):
            bm.faces.new((vo[k], vo[(k+1) % 4], vi[(k+1) % 4], vi[k]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces:
            if f.normal.z < 0:
                f.normal_flip()
        ob = obj_from_bm('markering_' + pid, bm, c_mark, m_gold); ob['plats'] = pid
    if 'bet_ringar' in STD:  # våra ringar där livebordets insatsmärken är
        br = STD['bet_ringar']; rr, blw = br['radie'], br['linjebredd']
        for bid, bp in br['platser'].items():
            bx, by = bp[0], bp[1]; bm = bmesh.new(); seg = 48
            vo = [bm.verts.new((bx + (rr + blw/2)*math.cos(2*math.pi*i/seg), by + (rr + blw/2)*math.sin(2*math.pi*i/seg), FZ + 0.0002)) for i in range(seg)]
            vi = [bm.verts.new((bx + (rr - blw/2)*math.cos(2*math.pi*i/seg), by + (rr - blw/2)*math.sin(2*math.pi*i/seg), FZ + 0.0002)) for i in range(seg)]
            for i in range(seg):
                j = (i + 1) % seg
                bm.faces.new((vo[i], vo[j], vi[j], vi[i]))
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            for fc in bm.faces:
                if fc.normal.z < 0:
                    fc.normal_flip()
            ob = obj_from_bm('markering_bet_' + bid, bm, c_mark, m_gold); ob['bet'] = bid

    # ---- kortlek: 52 kort + baksida (atlas 13 x 5, rad 5 = baksida)
    suits, ranks = ['S', 'H', 'D', 'C'], ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    back_cell = 4 * 13
    meshes = {}
    for j, s in enumerate(suits):
        for i, r in enumerate(ranks):
            me = card_mesh(f'kort_{s}{r}', j * 13 + i, back_cell); me.materials.append(m_card); me.materials.append(m_edge)
            meshes[s + r] = me
            ob = bpy.data.objects.new(f'kort_{s}{r}', me); c_lek.objects.link(ob)
            ob.location = (-1.3 + i * 0.07, 1.0 + j * 0.1, 0.0005)  # på golvet bakom bordet, utanför bild
            ob['kort'] = s + r
    meb = card_mesh('kort_baksida', back_cell, back_cell); meb.materials.append(m_card); meb.materials.append(m_edge)

    # ---- sko: livebordets som filmen visar den (sko ovan)
    sko(c_sko, m_card, back_cell)

    # ---- kassering
    ks = STD['kassering']; w, d, h = ks['yttermatt']; t = ks['vaggtjocklek']; fm = Vector(ks['fot_mitt']); yk = math.radians(ks['yaw'])
    kparts = [('botten', (w, d, t), (0, 0, t/2)), ('vagg_v', (t, d, h), (-w/2 + t/2, 0, h/2)), ('vagg_h', (t, d, h), (w/2 - t/2, 0, h/2)),
              ('vagg_fram', (w, t, h), (0, -d/2 + t/2, h/2)), ('vagg_bak', (w, t, h), (0, d/2 - t/2, h/2))]
    for nm, sz, off in kparts:
        o = Vector(off); o.rotate(Matrix.Rotation(yk, 3, 'Z'))
        box('kassering_' + nm, sz, fm + o, c_bord, m_acryl, rot_z=yk)
    if ks.get('kort_hog'):  # de använda korten ligger plant i lådan, ryggen upp, långsidan längs lådans djup
        hh = ks['kort_hog']; hog = box('kassering_korthog', (K['bredd'], K['langd'], hh), fm + Vector((0, 0, t + hh / 2)), c_bord, _rand_material(), rot_z=yk)
        lay = hog.data.uv_layers.active.data
        for poly in hog.data.polygons:
            for li in poly.loop_indices:
                lay[li].uv = (0.5, hog.data.vertices[hog.data.loops[li].vertex_index].co.z / LEK_RAND)
        ob = bpy.data.objects.new('kassering_overst', meb); c_bord.objects.link(ob)
        ob.location = fm + Vector((0, 0, t + hh)); ob.rotation_euler = (0, 0, yk)

    # ---- exempelgiv: ett kort per C1 och dealerns två (länkade kopior = instanser)
    demo = {'P1.C1': 'HA', 'P2.C1': 'S10', 'P3.C1': 'D7', 'P4.C1': 'CK', 'P5.C1': 'H5', 'P6.C1': 'SQ', 'P7.C1': 'D9', 'D.C1': 'C8'}
    for pid, card in demo.items():
        p = PL[pid]; ob = bpy.data.objects.new('giv_' + pid, meshes[card]); c_giv.objects.link(ob)
        ob.location = (p['pos'][0], p['pos'][1], FZ + 0.0002); ob['plats'] = pid; ob.rotation_euler = (0, 0, vridning(pid))
    ob = bpy.data.objects.new('giv_D.C2', meb); c_giv.objects.link(ob)
    p = PL['D.C2']; ob.location = (p['pos'][0], p['pos'][1], FZ + 0.0002 + K['tjocklek']); ob.rotation_euler = (0, math.pi, vridning('D.C2'))

    # ---- origo-markör och anteckning
    em = bpy.data.objects.new('ORIGO_golv_under_dealerkant', None); top.objects.link(em); em.empty_display_type = 'ARROWS'; em.empty_display_size = 0.2
    em['standard'] = 'scen/standard.yaml'; em['axlar'] = '+X dealerns vanster, +Y bakat (spelarna pa -Y), +Z upp, meter'
    if MED_BRICKA:
        em['med_bricka'] = 'vår markerbricka, ett tillägg: livebordet har ingen'

    ASSETS.mkdir(parents=True, exist_ok=True)
    namn = 'standardbord_live_bricka' if MED_BRICKA else 'standardbord_live'
    bpy.ops.file.make_paths_relative() if bpy.data.filepath else None
    bpy.ops.wm.save_as_mainfile(filepath=str(ASSETS / (namn + '.blend')), relative_remap=True)
    bpy.ops.file.make_paths_relative(); bpy.ops.wm.save_mainfile()
    # glb: kortleken bakom bordet följer med; modifierare tillämpas. Den skrivs under ett annat namn och byts in hel, så
    # att editorn (som läser standardbord_live.glb) aldrig får en halv fil.
    ny, glb = ASSETS / (namn + '.ny.glb'), ASSETS / (namn + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(ny), export_format='GLB', export_apply=True, export_yup=True)
    for forsok in range(40):
        try:
            os.replace(ny, glb); break
        except PermissionError:  # Windows: någon läser den gamla filen just nu
            time.sleep(0.25)
    else:
        raise SystemExit('kunde inte byta in %s (filen är upptagen); den nya ligger i %s' % (glb, ny))
    print('BYGGT', ASSETS / namn, *(['med-bricka'] if MED_BRICKA else []))


main()
