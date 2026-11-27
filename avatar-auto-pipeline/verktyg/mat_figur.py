"""Mäter figurer med vårt skelett (GLB) på samma sätt, så att en person kan läggas bredvid mannen och dockorna: lederna,
huden i snitt (axlarna, bröstet, midjan, höften, armarna, halsen), handen och huvudet (höjden, bredden, djupet, käken,
kindbenen). Så mättes Tomasz till MATT['tomasz_matt'] i scen/bygg_docka.py (provet tomasz-dockan-pa-hans-matt-20261127).

    blender -b --factory-startup --python verktyg/mat_figur.py -- ut.json namn=fil.glb [namn=fil.glb ...]
        [--ogon namn=Rx,Ry,Rz,Lx,Ly,Lz]

Ett snitt är ytans skärning med ett plan, delad i slingor som hänger ihop över trianglarna (hörn på samma ställe slås
ihop, eftersom en GLB delar dem vid ytkartans sömmar), så att bålen, armarna och halsen skiljs åt av formen och inte av
vikterna (Meshys rigg lägger bröstets sidor på armens ben). Omkrets är ett måttband (konvext hölje) runt en slinga.
Ögonen är benen eye.L/eye.R; en figur utan dem får ögonens mitt med --ogon (steg 09 skriver dem, <ut>.json ogon.*.mitt).
Allt är i figurens egen skala: en figur ur bilder har ingen känd storlek, så längden är ett antagande (Meshy-figurerna
byggs 1,80 m med skor och hår). Kläder och hår mäts med: dra av dem innan talen går till MATT.
Bålen mäts i höjder från lederna (bröstet 0,14 m under axellederna, midjan där den är smalast 0,10-0,25 m över
höftlederna, höften 0,04 m under dem), käken 30 och 45 % av vägen från hakan till ögonen framför öronen, som bygget gör."""
import json, sys
import bpy
import numpy as np

Z = np.array([0, 0, 1.0])


def hull(q):
    q = sorted(map(tuple, q))
    if len(q) < 3:
        return 0.0
    def k(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in q:
        while len(lo) >= 2 and k(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(q):
        while len(hi) >= 2 and k(hi[-2], hi[-1], p) <= 0:
            hi.pop()
        hi.append(p)
    h = np.array(lo[:-1] + hi[:-1])
    return float(np.linalg.norm(h - np.roll(h, 1, axis=0), axis=1).sum())


class Yta:
    def __init__(self, co, tris):
        _, forst, inv = np.unique(np.round(co / 5e-5).astype(np.int64), axis=0, return_index=True, return_inverse=True)
        self.co, self.tris = co[forst], inv.reshape(-1)[tris]

    def slingor(self, p, d):
        """Planet genom p med normalen d: slingorna (punkter N x 3), största först."""
        co, T = self.co, self.tris
        s = (co - p) @ d; st = s[T]; korsar = (st.min(1) < 0) & (st.max(1) > 0)
        T, st = T[korsar], st[korsar]
        par = np.stack([st[:, a] * st[:, b] < 0 for a, b in ((0, 1), (1, 2), (2, 0))], 1)
        kanter, lankar = {}, []
        for t, m in zip(T, par):
            ks = [tuple(sorted((int(t[i]), int(t[(i + 1) % 3])))) for i in range(3) if m[i]]
            if len(ks) == 2:
                lankar.append([kanter.setdefault(k_, len(kanter)) for k_ in ks])
        if not kanter:
            return []
        n = len(kanter); far = np.arange(n)
        def f(x):
            while far[x] != x:
                far[x] = far[far[x]]; x = far[x]
            return x
        for u, v in lankar:
            ru, rv = f(u), f(v)
            if ru != rv:
                far[ru] = rv
        ka = np.array(list(kanter.keys())); ia = np.array(list(kanter.values()))
        sa, sb = s[ka[:, 0]], s[ka[:, 1]]; t_ = sa / (sa - sb)
        pts = np.empty((n, 3)); pts[ia] = co[ka[:, 0]] + t_[:, None] * (co[ka[:, 1]] - co[ka[:, 0]])
        rot = np.array([f(x) for x in range(n)])
        return sorted((pts[rot == r] for r in np.unique(rot)), key=len, reverse=True)

    def slinga_nara(self, p, d, q, minst=12):
        """Slingan i planet (p, d) vars mitt ligger närmast punkten q."""
        sl = [x for x in self.slingor(p, d) if len(x) >= minst]
        return min(sl, key=lambda x: np.linalg.norm(x.mean(0) - q)) if sl else None


def i_plan(pts, p, d):
    u = np.cross(d, [0, 0, 1.0]) if abs(d[2]) < 0.9 else np.array([1.0, 0, 0])
    u = u / np.linalg.norm(u); w = np.cross(d, u)
    return np.c_[(pts - p) @ u, (pts - p) @ w]


def mat(fil, ogon=None):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=fil)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    arm.data.pose_position = 'REST'
    if arm.animation_data:
        arm.animation_data.action = None
    bpy.context.view_layer.update()
    J = {b.name: np.array(arm.matrix_world @ b.head_local) for b in arm.data.bones}
    allco, allt, alldom, off = [], [], [], 0
    for o in bpy.data.objects:  # bara huden (det som skelettet böjer), inte importens benformer
        if o.type != 'MESH' or not any(m.type == 'ARMATURE' for m in o.modifiers):
            continue
        me = o.data; n = len(me.vertices)
        co = np.empty(n * 3); me.vertices.foreach_get('co', co); co = co.reshape(n, 3)
        M = np.array(o.matrix_world); co = co @ M[:3, :3].T + M[:3, 3]
        me.calc_loop_triangles()
        t = np.empty(len(me.loop_triangles) * 3, dtype=np.int64); me.loop_triangles.foreach_get('vertices', t)
        gn = {g.index: g.name for g in o.vertex_groups}
        alldom += [max(((ge.weight, gn.get(ge.group, '')) for ge in v.groups), default=(0, ''))[1] for v in me.vertices]
        allco.append(co); allt.append(t.reshape(-1, 3) + off); off += n
    co = np.concatenate(allco); dom = np.array(alldom); Y = Yta(co, np.concatenate(allt))
    z0, z1 = co[:, 2].min(), co[:, 2].max()
    sh = (J['RightArm'] + J['LeftArm']) / 2; hipj = (J['RightUpLeg'] + J['LeftUpLeg']) / 2; mx = sh[0]
    medel = lambda f: float(np.mean([f(s) for s in ('Right', 'Left')]))
    m = {'fil': fil, 'H': z1 - z0, 'axelleder_isar': float(np.linalg.norm(J['RightArm'] - J['LeftArm'])),
         'overarm': medel(lambda s: np.linalg.norm(J[s + 'Arm'] - J[s + 'ForeArm'])),
         'underarm': medel(lambda s: np.linalg.norm(J[s + 'ForeArm'] - J[s + 'Hand'])),
         'hoftled_over_golv': float(hipj[2] - z0), 'knaled_over_golv': medel(lambda s: J[s + 'Leg'][2] - z0),
         'hoftled_till_axelleder': float(sh[2] - hipj[2]), 'hjassa_over_hoftled': float(z1 - hipj[2]),
         'armens_vinkel_fran_lodratt': medel(lambda s: np.degrees(np.arctan2(abs((J[s + 'Hand'] - J[s + 'Arm'])[0]), -(J[s + 'Hand'] - J[s + 'Arm'])[2])))}

    def bal(z):
        sl = Y.slinga_nara(np.array([0, 0, z]), Z, np.array([mx, (sh[1] + hipj[1]) / 2, z]))
        if sl is None:
            return None
        return {'over_hoftled': float(z - hipj[2]), 'omkrets': hull(sl[:, :2]), 'bredd': float(np.ptp(sl[:, 0])),
                'djup': float(np.ptp(sl[:, 1])), 'fram_om_axelleder': float(sh[1] - sl[:, 1].min())}
    bb = []
    for dz in np.arange(0.0, 0.051, 0.005):  # bredden över axlarna (armen med), störst 0-5 cm över axellederna
        sl = Y.slingor(np.array([0, 0, sh[2] + dz]), Z)
        if sl:
            p = np.concatenate(sl); p = p[np.abs(p[:, 0] - mx) < 0.35]; bb.append(float(np.ptp(p[:, 0])))
    m['axlar_hud_bredd'] = max(bb) if bb else None
    m['brost'] = bal(sh[2] - 0.14)
    mid = [x for x in (bal(z) for z in np.arange(hipj[2] + 0.10, hipj[2] + 0.255, 0.01)) if x]
    m['midja'] = min(mid, key=lambda x: x['omkrets']) if mid else None
    p = np.concatenate(Y.slingor(np.array([0, 0, hipj[2] - 0.04]), Z)); p = p[np.abs(p[:, 0] - mx) < 0.25]
    m['hoft'] = {'omkrets': hull(p[:, :2]), 'bredd': float(np.ptp(p[:, 0])), 'djup': float(np.ptp(p[:, 1]))}
    fr = [x['fram_om_axelleder'] for x in (bal(z) for z in np.arange(sh[2] - 0.37, sh[2] - 0.289, 0.01)) if x]
    m['bal_fram_om_axelleder_vid_filten'] = max(fr) if fr else None  # magen i filtens höjd när axlarna är 0,29-0,32 m över den

    def arm_o(a_, b_, t):
        d = (b_ - a_) / np.linalg.norm(b_ - a_); p = a_ + t * (b_ - a_); sl = Y.slinga_nara(p, d, p)
        return None if sl is None or np.linalg.norm(sl.mean(0) - p) > 0.04 else hull(i_plan(sl, p, d))
    nz = lambda v: float(np.mean([x for x in v if x])) if any(v) else None
    m['overarm_omkrets'] = nz([arm_o(J[s + 'Arm'], J[s + 'ForeArm'], 0.5) for s in ('Right', 'Left')])
    m['underarm_omkrets'] = nz([max(arm_o(J[s + 'ForeArm'], J[s + 'Hand'], t) or 0 for t in (0.1, 0.15, 0.2, 0.25, 0.3)) for s in ('Right', 'Left')])
    m['handled_omkrets'] = nz([arm_o(J[s + 'ForeArm'], J[s + 'Hand'], 0.97) for s in ('Right', 'Left')])
    hl, hb = [], []
    for s in ('Right', 'Left'):  # handen: handleden till långfingrets topp på huden, bredden över knogarna
        W = J[s + 'Hand']; tip = co[dom == f'{s}HandMiddle3']
        if len(tip):
            hl.append(float(np.linalg.norm(tip - W, axis=1).max()))
        I1, P1, M1 = J[f'{s}HandIndex1'], J[f'{s}HandPinky1'], J[f'{s}HandMiddle1']
        ax = (M1 - W) / np.linalg.norm(M1 - W); tv = P1 - I1; tv -= ax * (tv @ ax); tv /= np.linalg.norm(tv)
        p = W + ax * np.linalg.norm(M1 - W) * 0.92; sl = Y.slinga_nara(p, ax, p)
        if sl is not None:
            hb.append(float(np.ptp((sl - p) @ tv)))
    m['hand_langd'] = nz(hl); m['hand_bredd_knogar'] = nz(hb)
    eR, eL = (J['eye.R'], J['eye.L']) if 'eye.L' in J else (np.array(ogon[:3]), np.array(ogon[3:]))
    eye = (eR + eL) / 2; m['ogon_isar'] = float(np.linalg.norm(eR - eL))
    nara = co[(np.abs(co[:, 0] - eye[0]) < 0.004) & (co[:, 1] < eye[1] + 0.02) & (co[:, 2] > eye[2] - 0.17) & (co[:, 2] < eye[2] - 0.07)]
    chin = nara[np.argmin(nara[:, 2])]; top = co[np.abs(co[:, 0] - eye[0]) < 0.12][:, 2].max()
    m.update({'haka_over_axelleder': float(chin[2] - sh[2]), 'ogon_over_axelleder': float(eye[2] - sh[2]),
              'haka_till_hjassa': float(top - chin[2]), 'ogon_till_hjassa': float(top - eye[2]), 'haka_till_ogon': float(eye[2] - chin[2])})
    huvud = lambda z: Y.slinga_nara(np.array([0, 0, z]), Z, np.array([eye[0], eye[1] + 0.06, z]))
    br, dj = [], []
    for z in np.arange(eye[2] + 0.03, top - 0.015, 0.004):  # ovanför öronen
        sl = huvud(z)
        if sl is not None:
            br.append(float(np.ptp(sl[:, 0]))); dj.append(float(np.ptp(sl[:, 1])))
    m['huvud_bredd'], m['huvud_djup'] = max(br), max(dj)
    def fram(z, bak):  # bredden framför öronen
        sl = huvud(z)
        p = sl[sl[:, 1] < eye[1] + bak] if sl is not None else []
        return float(np.ptp(p[:, 0])) if len(p) else None
    m['kak_bredd_30'] = fram(chin[2] + 0.30 * (eye[2] - chin[2]), 0.06)
    m['kak_bredd_45'] = fram(chin[2] + 0.45 * (eye[2] - chin[2]), 0.06)
    m['kindben_bredd'] = fram(eye[2] - 0.02, 0.045)
    hs = []
    for z in np.arange(sh[2] + 0.03, chin[2] - 0.01, 0.004):  # halsen där den är smalast
        sl = Y.slinga_nara(np.array([0, 0, z]), Z, np.array([eye[0], chin[1] + 0.06, z]))
        if sl is not None and np.abs(sl[:, 0] - eye[0]).max() < 0.12:
            hs.append((float(np.ptp(sl[:, 0])), hull(sl[:, :2]), float(z - sh[2])))
    if hs:
        b_, o_, z_ = min(hs); m['hals_smalast'] = {'bredd': b_, 'omkrets': o_, 'over_axelleder': z_}
    m['ben'] = len(arm.data.bones)
    r = lambda x: {k: r(v) for k, v in x.items()} if isinstance(x, dict) else round(float(x), 4) if isinstance(x, (float, np.floating)) else x
    return r(m)


if __name__ == '__main__':
    a = sys.argv[sys.argv.index('--') + 1:]
    filer, ogon, i = {}, {}, 1
    while i < len(a):
        if a[i] == '--ogon':
            n, v = a[i + 1].split('='); ogon[n] = [float(x) for x in v.split(',')]; i += 2
        else:
            n, f = a[i].split('=', 1); filer[n] = f; i += 1
    ut = {n: mat(f, ogon.get(n)) for n, f in filer.items()}
    with open(a[0], 'w', encoding='utf-8') as fh:
        json.dump(ut, fh, indent=1, ensure_ascii=False)
    print('MÄTT', a[0])
