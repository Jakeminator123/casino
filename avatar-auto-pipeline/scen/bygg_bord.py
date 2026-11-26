"""Bygger standardbordet procedurellt ur scen/standard.yaml (meter, Z upp).

Kör:  blender -b --python-exit-code 1 --python scen/bygg_bord.py
      blender -b --python-exit-code 1 --python scen/bygg_bord.py -- --modell bord-02
      blender -b --python-exit-code 1 --python scen/bygg_bord.py -- --kant-bak 0.15
      blender -b --python-exit-code 1 --python scen/bygg_bord.py -- --docka
Ut:   assets/bord/standardbord.blend och assets/bord/standardbord.glb
      (bord-02 skriver assets/bord/bord_02.blend/.glb så standardfilen inte skrivs över)
Allt mått kommer ur standard.yaml – ändra där, inte här.
Default är spelets tableModel "standard" (oval halv-ellips, rak dealerkant).
BORD-02 är ett behållet labbalternativ via --modell bord-02.

--docka bygger standarddockans bord, det hans och hennes egna rörelser visas vid (Jakob 2026-11-26: halvmånen, skon
längre ut): kanten, filtens djup och skons flytt ur standard.yaml (dockans_bord, ur spelets DOLL_TABLE), utan egna tal.
Det är --kant-bak, --djup, --sko-ut och --sko-fram nedan med de talen, och skriver standardbord_nara23.blend/.glb.

--kant-bak D (meter, standardbordet) är samma bord med kanten på ett annat ställe (../standarddocka): dealerkanten D m närmare dealern
(Y = +D), med raka sidor bakåt från spelarbågen och markerbrickan flyttad med kanten. Skon, korten, kortplatserna,
insatsringarna, benen och kamerorna står kvar där standard.yaml har dem, och origo ligger kvar under den gamla kanten.
Valet rättar också kanten och brickan: brickan sitter nedsänkt ända ute i dealerkanten och dess bakvägg är bordets
kant där dealern sitter, i linje med kanten på båda sidor och med mässingslisten obruten längs hela kanten, i stället
för ett hack som är öppet bakåt; sargen är hel under brickan och når filten; rullen följer sidorna och slutar rundad
vid dealerkanten; brickan har rundade rännor där markerna ligger (rullarna stack annars ut genom brickans botten).
Det skriver assets/bord/standardbord_nara.blend/.glb för 0.15 (bordet de äldre rörelserna visas vid) och
standardbord_nara<cm>.blend/.glb för ett annat avstånd (0.23 är standarddockans, där dockan sitter kvar på kortplanens
plats och kanten kommer till den, Jakob 2026-11-26: bygg det med --docka, så får det också sin form och sin sko);
utan valet byggs allt exakt som förut.

Skon är densamma i alla byggen: kilen ur standard.yaml och framtill en dealerskos frontplatta (sko_front) med en
U-formad öppning, framför skons kort och med springan under (måtten och varför i SKO_FRONT nedan).

Prov av bordets form och skons plats (Jakob 2026-11-26: "mindre äggformat ... mer som en halvmåne", och skon "aningen
längre bort från dealern"), bara för standardbordet och alltid under ett eget namn:
      blender -b --python-exit-code 1 --python scen/bygg_bord.py -- --kant-bak 0.23 --djup 0.95 --sko-ut 0.08 --namn prov_a
--djup D    filtens djup från spelets kant längs mittlinjen (standard.yaml: 1,15); bågen och rullen följer med, halva
            bredden är densamma, och med D lika med halva bredden (0,95) är bågen en halvcirkel.
--sko-ut D  skon med frontplattan, korten och bunten flyttad D m utåt längs sin egen längd (mot sin bakre ände, bort från
            dealerns mitt); kasseringslådan, speglad mot skon, flyttas lika långt åt sitt håll.
--sko-fram D  skon flyttad D m vinkelrätt mot sin längd, ut mot spelarna (dess nära vägg och mynning går före); det är
            riktningen bort från dealerns vänstra axel (längs skon flyttas handen mest åt sidan). Lådan speglad som ovan.
--namn N    skriver assets/bord/standardbord_N.blend/.glb (små bokstäver, siffror, understreck). Krävs med --djup,
            --sko-ut och --sko-fram, så att de modeller som används aldrig skrivs över; namnen nara och nara<cm> hör till
            --kant-bak.
Utan de fyra valen byggs allt som förut.
"""
import bisect, math, os, re, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _bpy_hjalp import *  # noqa: F401,F403  (bpy, bmesh, Vector, STD, ...)

def _valj_modell():
    if '--modell' not in sys.argv:
        return 'standard'
    i = sys.argv.index('--modell')
    if i + 1 >= len(sys.argv):
        raise SystemExit('--modell kräver standard eller bord-02')
    m = sys.argv[i + 1]
    if m not in ('standard', 'bord-02'):
        raise SystemExit('okänd modell: ' + m)
    return m

def _valj_kant_bak():
    if '--kant-bak' not in sys.argv:
        return None
    i = sys.argv.index('--kant-bak')
    try:
        d = float(sys.argv[i + 1])
    except (IndexError, ValueError):
        raise SystemExit('--kant-bak kräver ett tal i meter, till exempel 0.15')
    if not 0.0 <= d <= 0.4:
        raise SystemExit('--kant-bak ska vara mellan 0 och 0,4 m')
    return d


def _valj_tal(namn, lo, hi, exempel):
    if namn not in sys.argv:
        return None
    i = sys.argv.index(namn)
    try:
        d = float(sys.argv[i + 1])
    except (IndexError, ValueError):
        raise SystemExit('%s kräver ett tal i meter, till exempel %s' % (namn, exempel))
    if not lo <= d <= hi:
        raise SystemExit('%s ska vara mellan %s och %s m' % (namn, lo, hi))
    return d


def _valj_namn():
    if '--namn' not in sys.argv:
        return None
    i = sys.argv.index('--namn')
    n = sys.argv[i + 1] if i + 1 < len(sys.argv) else ''
    if not re.fullmatch(r'[a-z0-9_]+', n):
        raise SystemExit('--namn tar små bokstäver, siffror och understreck, till exempel prov_halvcirkel')
    if re.fullmatch(r'nara\d*', n):
        raise SystemExit('namnet %s hör till --kant-bak (standardbord_nara*), som används; välj ett annat' % n)
    return n


MODELL = _valj_modell()
KANT_BAK = _valj_kant_bak()
DJUP = _valj_tal('--djup', 0.6, 1.3, '0.95')       # filtens djup från spelets kant; None = standard.yaml
SKO_UT = _valj_tal('--sko-ut', 0.0, 0.3, '0.08')   # skon utåt längs sin längd; None = där standard.yaml har den
SKO_FRAM = _valj_tal('--sko-fram', 0.0, 0.2, '0.05')  # skon vinkelrätt mot sin längd, mot spelarna
NAMN = _valj_namn()
DOCKA = '--docka' in sys.argv  # standarddockans bord: de fyra talen ur standard.yaml (dockans_bord), inga egna
if DOCKA:
    if MODELL != 'standard' or KANT_BAK is not None or DJUP is not None or SKO_UT is not None or SKO_FRAM is not None or NAMN:
        raise SystemExit('--docka tar inga andra val: måtten står i standard.yaml (dockans_bord)')
    _d = STD['dockans_bord']
    KANT_BAK, DJUP, SKO_UT, SKO_FRAM = _d['kant_bak'], _d['djup'], _d['sko_ut'], _d['sko_fram']
NARA = KANT_BAK is not None  # standarddockans bord: kanten närmare och kanten/brickan rättade
NYA = not DOCKA and (DJUP is not None or SKO_UT is not None or SKO_FRAM is not None)
if NARA and MODELL != 'standard':
    raise SystemExit('--kant-bak gäller bara standardbordet')
if (NYA or NAMN) and MODELL != 'standard':
    raise SystemExit('--djup, --sko-ut, --sko-fram och --namn gäller bara standardbordet')
if NYA and not NAMN:
    raise SystemExit('--djup, --sko-ut och --sko-fram kräver --namn, så att de bord som används inte skrivs över')
if MODELL == 'bord-02':
    if 'bord_02' not in STD:
        raise SystemExit('standard.yaml saknar bord_02')
    mer = dict(STD['bord'])
    mer.update(STD['bord_02'])
    STD['bord'] = mer

ASSETS = ROOT / 'assets' / 'bord'
TEX = ASSETS / 'texturer'
KORT = ASSETS / 'kort'
FZ = STD['filt_z']
B = STD['bord']
if DJUP is not None:  # bågen (outline, rail) läser fram_s; halva bredden är densamma
    B['fram_s'] = DJUP; B['djup'] = DJUP
print('bygg_bord modell=%s typ=%s bredd=%.3f djup=%.3f' % (MODELL, B.get('typ'), B['bredd'], B['djup']))
if NARA:
    print('bygg_bord kant-bak=%.3f (dealerkanten vid Y = +%.3f)' % (KANT_BAK, KANT_BAK))
if SKO_UT is not None or SKO_FRAM is not None:
    print('bygg_bord sko-ut=%.3f sko-fram=%.3f (skon och kasseringslådan speglad)' % (SKO_UT or 0.0, SKO_FRAM or 0.0))


# ---------------------------------------------------------------- kontur (samma som bord02Outline)
def cubic(p, steps):
    out = []
    for i in range(steps):
        t = (i + 1) / steps; u = 1 - t; w = [u*u*u, 3*u*u*t, 3*u*t*t, t*t*t]
        out.append([sum(w[j] * p[j][a] for j in range(4)) for a in (0, 1)])
    return out


def outline(notch=None):
    typ = B.get('typ', 'oval_halvellis')
    n = B['kontur_bagsteg']
    if typ == 'oval_halvellis' or 'dealersida_bezier' not in B:
        a, fr = B.get('halv_bredd', B['radie']), B['fram_s']
        # t = 0 at (+a, 0) = dealerkant höger, t = pi at (-a, 0) = vänster, via spelarkanten (0, fr)
        arc = [[a * math.cos(math.pi * i / n), fr * math.sin(math.pi * i / n)] for i in range(n + 1)]
        if NARA:
            # raka sidor från bågens ändar bak till dealerkanten vid s = -D; urtaget för brickan går från kanten till
            # brickans framkant (brickans bakvägg står i kanten och sargen är hel under den)
            d = -KANT_BAK; side = [[-a, d]]
            if notch:
                side += [[notch['x0'], d], [notch['x0'], notch['s1']], [notch['x1'], notch['s1']], [notch['x1'], d]]
            pts = arc + side + [[a, d]]
        elif notch:
            x0, x1, s1 = notch['x0'], notch['x1'], notch['s1']
            # rak dealerkant från (-a, 0) till (+a, 0) med brickurtag inåt mot spelarna (+s)
            side = [[-a, 0.0], [x0, 0.0], [x0, s1], [x1, s1], [x1, 0.0]]
            pts = arc + side[1:]  # arc slutar redan i (-a, 0)
        else:
            pts = arc
    else:
        R, sh, fr = B['radie'], B['axel_s'], B['fram_s']
        arc = [[R * math.cos(math.pi * i / n), sh if i == n else sh + (fr - sh) * math.sin(math.pi * i / n)] for i in range(n + 1)]
        bz = B['dealersida_bezier']; side = []
        for k in ('vanster_vinge', 'vanster_urtag', 'hoger_urtag', 'hoger_vinge'):
            side += cubic(bz[k], 24)
        side.pop()
        if notch:
            whole = [arc[n]] + side + [arc[0]]
            def s_at(x):
                for i in range(1, len(whole)):
                    (xa, sa), (xb, sb) = whole[i-1], whole[i]
                    if xa <= x <= xb:
                        return sa + (sb - sa) * (x - xa) / (xb - xa) if xb > xa else sa
                return 0
            x0, x1, s1 = notch['x0'], notch['x1'], notch['s1']
            side = [p for p in side if p[0] < x0 - 1e-6] + [[x0, s_at(x0)], [x0, s1], [x1, s1], [x1, s_at(x1)]] + [p for p in side if p[0] > x1 + 1e-6]
        pts = arc + side
    # rensa dubbletter
    clean = []
    for p in pts:
        if not clean or math.dist(p, clean[-1]) > 1e-5:
            clean.append(p)
    if math.dist(clean[0], clean[-1]) < 1e-5:
        clean.pop()
    return [(x, -s) for x, s in clean], n  # -> (X, Y)


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


def rail(col, mat):
    rl = B['vadderad_kant']; n = B['kontur_bagsteg']
    typ = B.get('typ', 'oval_halvellis')
    if typ == 'oval_halvellis' or 'dealersida_bezier' not in B:
        aa, bb = B.get('halv_bredd', B['radie']), B['fram_s']
        def pos_nrm(t):
            x, s = aa * math.cos(t), bb * math.sin(t)
            # utåtriktad normal för ellips
            l = math.hypot(bb * math.cos(t), aa * math.sin(t)) or 1
            return x, s, (bb * math.cos(t)) / l, (aa * math.sin(t)) / l
    else:
        R, sh, fr = B['radie'], B['axel_s'], B['fram_s']; D = fr - sh
        def pos_nrm(t):
            x, s = R * math.cos(t), sh + D * math.sin(t)
            l = math.hypot(D * math.cos(t), R * math.sin(t)) or 1
            return x, s, (D * math.cos(t)) / l, (R * math.sin(t)) / l
    half = rl['bredd'] / 2; P = 24
    if NARA:
        return rail_nara(col, mat, pos_nrm, half, P)
    bm = bmesh.new(); rings = []; lay = None; along = 0.0; prev = None
    for i in range(n + 1):
        t = math.pi * i / n; x, s, nx, ns = pos_nrm(t)
        cx, cs = x - nx * half, s - ns * half
        ring = []
        for j in range(P):
            a = 2 * math.pi * j / P
            r_out = half * math.cos(a); zz = FZ + rl['mitt_over_filt'] + rl['halv_hojd'] * math.sin(a)
            ring.append(bm.verts.new((cx + nx * r_out, -(cs + ns * r_out), zz)))
        rings.append(ring)
    for i in range(n):
        for j in range(P):
            bm.faces.new((rings[i][j], rings[i][(j+1) % P], rings[i+1][(j+1) % P], rings[i+1][j]))
    bm.faces.new(rings[0]); bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    lay = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for lp in f.loops:
            co = lp.vert.co; lp[lay].uv = (math.atan2(-co.y, co.x) * B.get('halv_bredd', B['radie']), (co.z - FZ) * 4)
    ob = obj_from_bm('bord_vaddering', bm, col, mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def rail_nara(col, mat, pos_nrm, half, P):
    """Rullen för --kant-bak: spelarbågen plus de raka sidorna bak till dealerkanten, och ändarna rundade
    (kvartscirkel över `andradie`) ner mot filten i stället för avskurna."""
    rl = B['vadderad_kant']; n = B['kontur_bagsteg']; aa = B.get('halv_bredd', B['radie'])
    D = KANT_BAK; R = rl.get('andradie', 0.05)
    raka = int(math.ceil(D / 0.01)) if D > 0 else 0
    vag = [(aa, -D + D * i / raka, 1.0, 0.0) for i in range(raka)]              # höger sida, bakifrån
    vag += [pos_nrm(math.pi * i / n) for i in range(n + 1)]                       # spelarbågen
    vag += [(-aa, -D * i / raka, -1.0, 0.0) for i in range(1, raka + 1)]          # vänster sida, bakåt
    L = [0.0]
    for p, q in zip(vag, vag[1:]):
        L.append(L[-1] + math.dist(p[:2], q[:2]))
    tot = L[-1]; e0 = 0.003  # spetsen 3 mm innanför kanten, bakom mässingslisten
    ande = [e0 + R * (1 - math.cos(math.pi / 2 * k / 10)) for k in range(11)]  # tätare mot spetsen
    dd = sorted(set([round(d, 7) for d in ande] + [round(tot - d, 7) for d in ande] + [round(l, 7) for l in L if e0 + R < l < tot - e0 - R]))

    def vid(d):
        j = min(max(bisect.bisect_right(L, d) - 1, 0), len(vag) - 2)
        f = (d - L[j]) / ((L[j + 1] - L[j]) or 1.0)
        p = [vag[j][k] + (vag[j + 1][k] - vag[j][k]) * f for k in range(4)]
        ln = math.hypot(p[2], p[3]) or 1.0
        return p[0], p[1], p[2] / ln, p[3] / ln

    bm = bmesh.new(); rings = []
    for d in dd:
        x, s, nx, ns = vid(d)
        e = min(d, tot - d) - e0
        sc = math.sqrt(max(0.0, 1 - ((R - e) / R) ** 2)) if e < R else 1.0
        sc = max(sc, 0.04)  # spetsen: en liten ring som sluts med en yta
        cx, cs = x - nx * half, s - ns * half
        ring = []
        for j in range(P):
            a = 2 * math.pi * j / P
            r_out = half * math.cos(a) * sc
            zz = FZ + (rl['mitt_over_filt'] + rl['halv_hojd'] * math.sin(a)) * sc  # krymper mot filten
            ring.append(bm.verts.new((cx + nx * r_out, -(cs + ns * r_out), zz)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for j in range(P):
            bm.faces.new((rings[i][j], rings[i][(j+1) % P], rings[i+1][(j+1) % P], rings[i+1][j]))
    bm.faces.new(rings[0]); bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    lay = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for lp in f.loops:
            co = lp.vert.co; lp[lay].uv = (math.atan2(-co.y, co.x) * aa, (co.z - FZ) * 4)
    ob = obj_from_bm('bord_vaddering', bm, col, mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def bricka_nara(tr, c_bricka, m_tray, m_brass):
    """Markerbrickan för --kant-bak: botten är rundade rännor, en per rad, där markerna ligger med topparna 2 mm
    under filten som förut. En marker är 3,9 cm hög på kant och den platta botten låg 3 cm ner, så rullarna stack ut
    genom botten. Returnerar brickans djup under filten (sargen får en ficka så djup)."""
    x0, x1, s0, s1 = tr['x0'], tr['x1'], tr['s0'], tr['s1']; wall = 0.004
    rows = tr['rad_valorer']; pitch = (x1 - x0 - 2 * wall) / len(rows); cr = tr['chip_radie']
    rr = pitch / 2                          # rännans radie, rännorna möts i en kam
    z_chip = FZ - 0.002 - cr                # markernas mitt (samma som förut)
    z_kam = z_chip - cr + rr                # rännornas kam: markerna vilar i rännans botten
    z_bot = z_kam - rr - 0.003              # brickans undersida
    h = FZ - z_bot
    box('bricka_botten', (x1 - x0, s1 - s0, 0.003), ((x0 + x1) / 2, -(s0 + s1) / 2, z_bot + 0.0015), c_bricka, m_tray)
    zm = (FZ + z_bot) / 2
    for nm, sz, lc in (('bricka_vagg_v', (wall, s1 - s0, h), (x0 + wall/2, -(s0+s1)/2, zm)),
                       ('bricka_vagg_h', (wall, s1 - s0, h), (x1 - wall/2, -(s0+s1)/2, zm)),
                       ('bricka_vagg_fram', (x1 - x0, wall, h), ((x0+x1)/2, -s1 + wall/2, zm)),
                       ('bricka_vagg_bak', (x1 - x0, wall, h), ((x0+x1)/2, -s0 - wall/2, zm))):
        box(nm, sz, lc, c_bricka, m_tray)
    # rännorna: en halvcirkel per rad, dragen längs Y mellan fram- och bakväggen
    prof = []
    for i in range(len(rows)):
        xc = x0 + wall + pitch * (i + 0.5)
        for k in range(0 if i == 0 else 1, 17):
            t = math.pi + math.pi * k / 16
            prof.append((xc + rr * math.cos(t), z_kam + rr * math.sin(t)))
    bm = bmesh.new(); ya, yb = -(s0 + wall), -(s1 - wall)
    va = [bm.verts.new((x, ya, z)) for x, z in prof]; vb = [bm.verts.new((x, yb, z)) for x, z in prof]
    for k in range(len(prof) - 1):
        bm.faces.new((va[k], va[k+1], vb[k+1], vb[k]))
    bm.faces.ensure_lookup_table()
    if sum(f.normal.z for f in bm.faces) < 0:
        for f in bm.faces:
            f.normal_flip()
    uv_planar(bm)
    obj_from_bm('bricka_rannor', bm, c_bricka, m_tray)
    rim = tr.get('kant_bredd', 0.007)
    box('bricka_ram_v', (rim, s1 - s0 + rim, 0.0028), (x0 - rim/2 + 0.001, -(s0 + s1 + rim)/2, FZ + 0.0009), c_bricka, m_brass)
    box('bricka_ram_h', (rim, s1 - s0 + rim, 0.0028), (x1 + rim/2 - 0.001, -(s0 + s1 + rim)/2, FZ + 0.0009), c_bricka, m_brass)
    box('bricka_ram_fram', (x1 - x0 + 2*rim, rim, 0.0028), ((x0+x1)/2, -s1 - rim/2 + 0.001, FZ + 0.0009), c_bricka, m_brass)
    box('bricka_ram_bak', (x1 - x0 + 2*rim, rim, 0.0028), ((x0+x1)/2, -s0 - rim/2, FZ + 0.0009), c_bricka, m_brass)
    return h


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


# ---------------------------------------------------------------- skons frontplatta
# Jakob 2026-11-26: "se bara till att det blir supertydligt vad som på skon faktiskt är ett kort och inte", "ett litet
# skydd/hölje, så man måste verkligen dra ut ett kort i taget". Förlagan är en vanlig dealersko: en lutande frontplatta
# framför korten med en U-formad öppning nedtill i mitten, där det främsta kortets rygg syns och fingret når kortet, och
# under plattan en springa där kortet dras ut nedåt, ett i taget.
#
# Måtten står i plattans eget plan, i mm: s uppför plattan från skons framkant på filten, v tvärs skon från den nära
# väggen, n ut ur skon vinkelrätt mot plattan. Kortet i skon ligger på n = 1 (spelets shoeCard) med ryggen utåt, så
# plattan står framför det; den har skons lutning, bredd och höjd fram (toppen kapad vid hojd_fram) och ändrar inget
# mått i standard.yaml. Talen är mätta mot dockans rörelser som editorn spelar dem (standarddocka/editor/rorelse.ts:
# vilan till skon och given till plats 1–7, och given 'ren'), med fingrarna som rör (radie 7–8 mm):
SKO_FRONT = dict(
    n0=1.6,    # plattans insida, 0,45 mm framför kortets rygg
    n1=2.9,    # utsidan: plattan är 1,3 mm tjock; fingrarna i redo-ställningen (A2.3) går 0,6 mm från den
    s0=74.0,   # nederkanten, 59 mm över filten: kortet lutar ut medan det dras ned, och först ovanför 74 mm håller det
               # sig innanför 1,6 mm. Under den är springan där kortet går ut (från kortets underkant, 22 mm över filten)
    ub=25.0,   # U-öppningens halva bredd vid nederkanten (50 mm): ringfingret går ned längs dess bortre kant när kortet dras
    ur=20.0,   # bågens radie upptill (40 mm bred), centrerad över kortet
    us=114.0,  # öppningens topp, 2 mm under kortets överkant: lång- och ringfingrets toppar ligger på kortet i öppningen
    rc=8.0,    # de yttre hörnen nedtill rundade: lillfingret går förbi den bortre väggen när kortet dras ut
    topp_list=117.6,  # bakom plattan ovanför korten (kortets överkant s = 116,1) sluts glipan mot locket
)


def sko_front(P, lean, hf, wd, wt, col):
    """Skons frontplatta som objektet sko_front: plattan med U-öppningen, och lister bakom den (vid väggarna och ovanför
    korten) som sluter glipan mellan plattan och skons kropp."""
    F = SKO_FRONT; cl, sl = math.cos(lean), math.sin(lean); mm = 0.001
    W = wd / mm; uv = W / 2

    def topp(n):  # plattans topp kapad vågrätt vid hojd_fram: s där höjden når hf vid avståndet n
        return (hf / mm - n * cl) / sl

    def Q(s, v, n):
        s = topp(n) if s is None else s
        return P(mm * (s * cl - n * sl), mm * v, mm * (s * sl + n * cl))

    def bage(cs, cv, r, a0, a1, steg):
        return [(cs + r * math.cos(math.radians(a0 + (a1 - a0) * i / steg)), cv + r * math.sin(math.radians(a0 + (a1 - a0) * i / steg)))
                for i in range(steg + 1)]

    # U-öppningen: raka ben från nederkanten som tangerar bågen upptill
    sc = F['us'] - F['ur']; ds, dv = F['s0'] - sc, -F['ub']
    tang = math.degrees(math.atan2(dv, ds) + math.acos(F['ur'] / math.hypot(ds, dv)))  # tangeringspunktens vinkel, nära sidan
    s0, rc = F['s0'], F['rc']
    platta = ([(None, 0.0)] + bage(s0 + rc, rc, rc, -90, -180, 8)
              + [(s0, uv - F['ub'])] + bage(sc, uv, F['ur'], tang, -tang, 32) + [(s0, uv + F['ub'])]
              + bage(s0 + rc, W - rc, rc, 180, 90, 8) + [(None, W)])
    hornv = math.degrees(math.asin((wt / mm - rc) / rc))  # där det rundade hörnet når väggens insida
    vagg_n = [(None, 0.0)] + bage(s0 + rc, rc, rc, -90, -180 - hornv, 6) + [(None, wt / mm)]
    vagg_b = [(None, W - wt / mm)] + bage(s0 + rc, W - rc, rc, 180 + hornv, 90, 6) + [(None, W)]
    list_t = [(F['topp_list'], wt / mm), (None, wt / mm), (None, W - wt / mm), (F['topp_list'], W - wt / mm)]

    from mathutils.geometry import tessellate_polygon
    bm = bmesh.new()
    def skiva(kontur, na, nb):  # konturen som skiva mellan na och nb; trianglarna läggs i (s, v), där U:t är en inbuktning
        a = [bm.verts.new(Q(s, v, na)) for s, v in kontur]; b = [bm.verts.new(Q(s, v, nb)) for s, v in kontur]
        for i, j, k in tessellate_polygon([[Vector((topp(nb) if s is None else s, v, 0)) for s, v in kontur]]):
            bm.faces.new((a[i], a[j], a[k])); bm.faces.new((b[k], b[j], b[i]))
        for i in range(len(kontur)):
            j = (i + 1) % len(kontur); bm.faces.new((a[i], a[j], b[j], b[i]))
    skiva(platta, F['n0'], F['n1'])
    for kontur in (vagg_n, vagg_b, list_t):
        skiva(kontur, 0.0, F['n0'])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bm('sko_front', bm, col, pbr('sko_front_svart', (0.015, 0.015, 0.017, 1), rough=0.25))
    ob['matt_mm'] = str({k: v for k, v in F.items()})
    return ob


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
    m_shoe = pbr('sko_svart', (0.02, 0.02, 0.022, 1), rough=0.35)
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

    tr = STD['markerbricka']
    if NARA:  # brickan följer dealerkanten bakåt: dess bakvägg står i den nya kanten
        tr = dict(tr, s0=tr['s0'] - KANT_BAK, s1=tr['s1'] - KANT_BAK, urtag=dict(tr['urtag'], s1=tr['urtag']['s1'] - KANT_BAK))
    pts, narc = outline(notch=tr['urtag'])
    felt = felt_sheet('bord_filt', pts, FZ, c_bord, m_felt)
    sg = B['sarg']
    if NARA:
        # sargen hel under brickan (brickan i en ficka, inte i en öppen skåra genom hela sargen) och upp mot filten,
        # så att ingen springa syns under mässingslisten längs dealerkanten
        ficka = FZ - bricka_nara(tr, c_bricka, m_tray, m_brass) - 0.001
        prism('bord_sarg', outline()[0], FZ + sg['underkant'], ficka, c_bord, m_wood)
        prism('bord_sarg_ficka', pts, ficka, FZ - 0.001, c_bord, m_wood)
    else:
        prism('bord_sarg', pts, FZ + sg['underkant'], FZ + sg['underlagg'], c_bord, m_wood)
    band('bord_massingslinje', outline()[0] if NARA else pts, FZ + sg['massingslinje'][0], FZ + sg['massingslinje'][1], 0.0008, c_bord, m_brass)
    rail(c_bord, m_leather)
    lg = B['ben']; legh = FZ + sg['underkant'] - lg['platta_hojd']
    for sx in (-1, 1):
        cylinder(f'bord_ben_{"v" if sx < 0 else "h"}', (sx * lg['x'], -lg['s'], lg['platta_hojd'] + legh / 2), lg['radie_fot'], lg['radie_topp'], legh, c_bord, m_wood)
        cylinder(f'bord_benplatta_{"v" if sx < 0 else "h"}', (sx * lg['x'], -lg['s'], lg['platta_hojd'] / 2), lg['platta_radie'], lg['platta_radie'], lg['platta_hojd'], c_bord, m_brass)

    # ---- markerbricka: låda nedsänkt i urtaget, chips på kant i rader längs Y
    x0, x1, s0, s1, dep = tr['x0'], tr['x1'], tr['s0'], tr['s1'], tr['djup']; wall = 0.004
    if not NARA:  # med --kant-bak byggs brickan av bricka_nara() ovan
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

    # ---- markeringar: guldram runt varje kortplats (spelet lägger korten rakt: yaw 0)
    K = STD['kort']; mg, lw = K['markering']['marginal'], K['markering']['linjebredd']
    for pid, p in STD['platser'].items():
        cx, cy = p['pos'][0], p['pos'][1]; hw, hl = K['bredd']/2 + mg, K['langd']/2 + mg
        bm = bmesh.new()
        outer = [(cx-hw, cy-hl), (cx+hw, cy-hl), (cx+hw, cy+hl), (cx-hw, cy+hl)]
        inner = [(cx-hw+lw, cy-hl+lw), (cx+hw-lw, cy-hl+lw), (cx+hw-lw, cy+hl-lw), (cx-hw+lw, cy+hl-lw)]
        vo = [bm.verts.new((x, y, FZ + 0.0002)) for x, y in outer]; vi = [bm.verts.new((x, y, FZ + 0.0002)) for x, y in inner]
        for k in range(4):
            bm.faces.new((vo[k], vo[(k+1) % 4], vi[(k+1) % 4], vi[k]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces:
            if f.normal.z < 0:
                f.normal_flip()
        ob = obj_from_bm('markering_' + pid, bm, c_mark, m_gold); ob['plats'] = pid
    if 'bet_ringar' in STD:
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

    # ---- sko: kilen ur standard.yaml med en riktig dealerskos frontplatta framför korten (sko_front ovan)
    sk = STD['sko']; front = Vector(sk['fot_fram']); yawb = math.radians(sk['yaw_bakat'])
    ax = Vector((math.cos(yawb), math.sin(yawb), 0)); side = Vector((-ax.y, ax.x, 0))
    # --sko-ut längs skons längd och --sko-fram vinkelrätt mot spelarna (-side: side pekar mot den bortre väggen, mot
    # dealern): allt som hör till skon flyttas lika långt. Kroppen och frontplattan byggs där standard.yaml har dem och
    # flyttas sedan hela (objektets läge), så att deras hörn fogas ihop exakt som förut.
    sko_flytt = ax * (SKO_UT or 0.0) - side * (SKO_FRAM or 0.0)
    lean = math.radians(sk['platta_lutning_grader']); hf, hb, ln, wd = sk['hojd_fram'], sk['hojd_bak'], sk['langd'], sk['bredd']
    uf = hf / math.tan(lean)   # där plattans topp möter locket
    base_h = sk['fonster_lyft']; wt = 0.004
    def P(u, v, h):  # skons lokala: u bakåt längs axeln, v åt sidan, h upp
        q = front + ax * u + side * v; return (q.x, q.y, q.z + h)
    bm = bmesh.new()
    def quad(a, b, c, d):
        bm.faces.new([bm.verts.new(P(*a)), bm.verts.new(P(*b)), bm.verts.new(P(*c)), bm.verts.new(P(*d))])
    prof = [(0, 0), (ln, 0), (ln, hb), (uf, hf), (0, 0)]
    for v in (0.0, wd - wt):  # sidoväggar: v=0 är nära väggen (fot_fram), v=wd är bortre väggen (pose.far)
        for vv in (v, v + wt):
            bm.faces.new([bm.verts.new(P(u, vv, h)) for u, h in prof[:4]])
    quad((0, 0, 0), (ln, 0, 0), (ln, wd, 0), (0, wd, 0))                                 # botten
    un = base_h / math.tan(lean)  # där nosen möter golvet; golvet börjar där, så att kortet glider ut framför nosen
    quad((un, 0, base_h), (ln, 0, base_h), (ln, wd, base_h), (un, wd, base_h))           # golv i skon
    quad((ln, 0, 0), (ln, wd, 0), (ln, wd, hb), (ln, 0, hb))                             # bakvägg
    quad((uf, 0, hf), (ln, 0, hb), (ln, wd, hb), (uf, wd, hf))                           # lock
    quad((0, 0, 0), (0, wd, 0), (un, wd, base_h), (un, 0, base_h))                       # nos
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    shoe = obj_from_bm('sko_kropp', bm, c_sko, m_shoe)
    sol = shoe.modifiers.new('tjocklek', 'SOLIDIFY'); sol.thickness = 0.003
    skofront = sko_front(P, lean, hf, wd, wt, c_sko)
    if sko_flytt.length > 0:
        shoe.location = sko_flytt; skofront.location = sko_flytt
    # kort i skon: översta korten som egna objekt (dragbara), resten som en bunt. Egen mesh med ryggen på båda sidor;
    # den heter inte kort_*, eftersom editorn (standarddocka/editor/scen.ts) döljer bordets lösa kort med det namnet,
    # och då syntes buntens vita kant i stället för skons rygg.
    mes = card_mesh('sko_kortrygg', back_cell, back_cell); mes.materials.append(m_card); mes.materials.append(m_edge)
    up = Vector(sk['fonsterkort_upp']).normalized(); ac = Vector(sk['fonsterkort_tvars']).normalized(); nrm = ac.cross(up)
    if nrm.dot(ax) > 0:  # normalen ska peka ut ur skon (framåt), med bevarad högerhandad matris (det=+1)
        ac = -ac; nrm = -nrm
    rot = Matrix((ac, up, nrm)).transposed().to_4x4()
    c0 = Vector(sk['fonsterkort_mitt']) + sko_flytt; step = ax * (K['tjocklek'] / math.sin(lean))
    for k in range(5):
        ob = bpy.data.objects.new(f'sko_kort_{k+1}', mes); c_sko.objects.link(ob)
        ob.matrix_world = Matrix.Translation(c0 + step * k) @ rot @ Matrix.Rotation(math.pi, 4, 'Y')  # baksidan utåt
        ob['dragbart'] = True
    ndecks = K['lekar_i_skon']; ncards = ndecks * 52 - 5; depth = ncards * step.length
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(K['bredd'], K['langd'], 1), verts=bm.verts)
    for v in bm.verts:  # skjuv: varje kort förskjuts horisontellt bakåt
        k = v.co.z + 0.5; v.co.z = 0
        v.co = rot.to_3x3() @ v.co + step.normalized() * (step.length * 5 + depth * k)
    bunt = obj_from_bm('sko_kortbunt', bm, c_sko, m_edge); bunt.location = c0
    bunt['kort'] = ncards

    # ---- kassering
    ks = STD['kassering']; w, d, h = ks['yttermatt']; t = ks['vaggtjocklek']; fm = Vector(ks['fot_mitt']); yk = math.radians(ks['yaw'])
    fm = fm + Vector((-sko_flytt.x, sko_flytt.y, 0))  # speglad mot skon: lika långt utåt på dealerns högra sida
    kparts = [('botten', (w, d, t), (0, 0, t/2)), ('vagg_v', (t, d, h), (-w/2 + t/2, 0, h/2)), ('vagg_h', (t, d, h), (w/2 - t/2, 0, h/2)),
              ('vagg_fram', (w, t, h), (0, -d/2 + t/2, h/2)), ('vagg_bak', (w, t, h), (0, d/2 - t/2, h/2))]
    for nm, sz, off in kparts:
        o = Vector(off); o.rotate(Matrix.Rotation(yk, 3, 'Z'))
        box('kassering_' + nm, sz, fm + o, c_bord, m_acryl, rot_z=yk)

    # ---- exempelgiv: ett kort per C1 och dealerns två (länkade kopior = instanser)
    demo = {'P1.C1': 'HA', 'P2.C1': 'S10', 'P3.C1': 'D7', 'P4.C1': 'CK', 'P5.C1': 'H5', 'P6.C1': 'SQ', 'P7.C1': 'D9', 'D.C1': 'C8'}
    for pid, card in demo.items():
        p = STD['platser'][pid]; ob = bpy.data.objects.new('giv_' + pid, meshes[card]); c_giv.objects.link(ob)
        ob.location = (p['pos'][0], p['pos'][1], FZ + 0.0002); ob['plats'] = pid
    ob = bpy.data.objects.new('giv_D.C2', meb); c_giv.objects.link(ob)
    p = STD['platser']['D.C2']; ob.location = (p['pos'][0], p['pos'][1], FZ + 0.0002 + K['tjocklek']); ob.rotation_euler = (0, math.pi, 0)

    # ---- origo-markör och anteckning
    em = bpy.data.objects.new('ORIGO_golv_under_dealerkant', None); top.objects.link(em); em.empty_display_type = 'ARROWS'; em.empty_display_size = 0.2
    em['standard'] = 'scen/standard.yaml'; em['axlar'] = '+X dealerns vanster, +Y bakat (spelarna pa -Y), +Z upp, meter'
    if NARA:
        em['kant_bak'] = KANT_BAK  # dealerkanten vid Y = +kant_bak; origo ligger kvar under standardbordets kant
    if DJUP is not None:
        em['djup'] = DJUP  # filtens djup från spelets kant (standard.yaml har bord.djup)
    if SKO_UT is not None:
        em['sko_ut'] = SKO_UT  # skon och kasseringslådan så långt utåt längs sina längder från standard.yaml:s plats
    if SKO_FRAM is not None:
        em['sko_fram'] = SKO_FRAM  # och så långt vinkelrätt ut mot spelarna

    ASSETS.mkdir(parents=True, exist_ok=True)
    # Ett annat avstånd än 0,15 m får sitt eget namn (standardbord_nara23), så att bordet de äldre rörelserna visas vid står kvar.
    nara_namn = 'standardbord_nara' if not NARA or abs(KANT_BAK - 0.15) < 1e-9 else 'standardbord_nara%d' % round(KANT_BAK * 100)
    namn = 'bord_02' if MODELL == 'bord-02' else ('standardbord_' + NAMN if NAMN else (nara_namn if NARA else 'standardbord'))
    bpy.ops.file.make_paths_relative() if bpy.data.filepath else None
    bpy.ops.wm.save_as_mainfile(filepath=str(ASSETS / (namn + '.blend')), relative_remap=True)
    bpy.ops.file.make_paths_relative(); bpy.ops.wm.save_mainfile()
    # glb: kortleken bakom bordet följer med; modifierare tillämpas. Den skrivs under ett annat namn och byts in hel, så
    # att editorn (som läser standardbord_nara.glb) aldrig får en halv fil.
    ny, glb = ASSETS / (namn + '.ny.glb'), ASSETS / (namn + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(ny), export_format='GLB', export_apply=True, export_yup=True)
    for forsok in range(40):
        try:
            os.replace(ny, glb); break
        except PermissionError:  # Windows: någon läser den gamla filen just nu
            time.sleep(0.25)
    else:
        raise SystemExit('kunde inte byta in %s (filen är upptagen); den nya ligger i %s' % (glb, ny))
    print('BYGGT', ASSETS / namn, 'modell', MODELL, *(['kant-bak', KANT_BAK] if NARA else []),
          *(['djup', DJUP] if DJUP is not None else []), *(['sko-ut', SKO_UT] if SKO_UT is not None else []),
          *(['sko-fram', SKO_FRAM] if SKO_FRAM is not None else []))


main()
