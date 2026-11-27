"""Steg 12, ansiktet: närbilden av personens ansikte läggs på ansiktsdelen av dockans nya bild, inpassad efter ansiktets
punkter (gratis, lokalt).

Meshy målar ansiktet ur helkroppsvyerna, där det bara är några tiotal bildpunkter brett, så det blir suddigt. Närbilden
(steg 1:s head-ref.png) har samma ansikte i hundratals punkter. Den läggs på så här:

1. Dockan med Meshys bild (yta.py lagg) renderas rakt framifrån med en ortografisk kamera, och MediaPipe (steg 09:s
   punkter.py) läser ansiktets 468 punkter i den bilden och i närbilden.
2. Punkterna i dockans bild delas i trianglar (Delaunay), och varje triangel i närbilden förs till sin triangel i
   dockans bild (styckvis affin passning): närbildens ögon, näsa, mun och bryn hamnar där dockans är.
3. Varje bildpunkt i dockans karta som hör till en yta framåt i ansiktet (också ögongloberna i sina öar) får sin plats
   i den främre bilden ur ytans läge i vila, och därmed sin färg ur närbilden. Den blandas in mjukt: fullt inne i
   ansiktet, tonat mot ansiktets kant (TONA av ansiktets bredd) och mot ytor som vänder sig bort från kameran (VANDER).
   Närbildens färger förs till Meshys medelfärg i samma område först, så att ingen kant syns mot resten av huvudet.
Håret, öronen och halsen står kvar som Meshy målade dem. Formen är dockans egen: bara färgen byts.

blender -b --factory-startup --python-exit-code 1 --python steg/12-ny-yta/narbild.py -- docka_med_yta.glb bas.png narbild.png ut.png [--arbete mapp]
docka_med_yta.glb är yta.py laggs utfil (dess karta har ögonöarna och brynen på huden), bas.png bilden den lades med.
Rapporten blir <ut>.json, och arbetsmappen (förval bredvid ut) får den främre bilden och punkterna.
"""
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.geometry import delaunay_2d_cdt

sys.path.insert(0, str(Path(__file__).resolve().parent))
from yta import ladda, sha  # noqa: E402

ROT = Path(__file__).resolve().parents[2]
MP = ROT.parent / "blackjack-dealer" / "tools" / "python"
PUNKTER = ROT / "steg" / "09-ansikte" / "punkter.py"
BILD = 1024          # den främre bildens storlek
FALT = 0.30          # den främre bildens bredd i meter (huvudet med håret)
TONA = 0.10          # tonas in över så stor del av ansiktets bredd innanför dess kant
VANDER = (0.25, 0.6)  # ytans normal mot kameran: ingen närbild under 0,25, full över 0,6
PUNKTER_MED = range(468)  # utan irisarna (dockans målade iris ska inte styra var närbildens hamnar)


def rendera_fram(body, ut):
    """Huvudet rakt framifrån, ortografiskt, i plant ljus; returnerar kamerans mitt (x, z)."""
    me = body.data
    M = np.array(body.matrix_world)
    co = np.array([v.co for v in me.vertices]) @ M[:3, :3].T + M[:3, 3]
    hojd = co[:, 2].max()
    huvud = co[co[:, 2] > hojd - 0.25]
    cx = float((huvud[:, 0].min() + huvud[:, 0].max()) / 2)
    cz = float(hojd - 0.13)
    sc = bpy.context.scene
    cam = bpy.data.objects.new("fram", bpy.data.cameras.new("fram"))
    sc.collection.objects.link(cam)
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = FALT
    cam.matrix_world = Matrix.Translation((cx, float(co[:, 1].min()) - 1.0, cz)) @ Matrix.Rotation(math.pi / 2, 4, "X")
    sc.camera = cam
    sc.render.engine = "BLENDER_WORKBENCH"
    sh = sc.display.shading
    sh.light = "FLAT"
    sh.color_type = "TEXTURE"
    sc.view_settings.view_transform = "Standard"
    sc.render.resolution_x = sc.render.resolution_y = BILD
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = str(ut)
    bpy.ops.render.render(write_still=True)
    return cx, cz


def till_bild(p, cx, cz):
    """Världens (x, z) till den främre bildens punkter (x åt höger, y nedåt)."""
    return np.stack(((p[..., 0] - cx) / FALT * BILD + BILD / 2, (cz - p[..., 2]) / FALT * BILD + BILD / 2), -1)


def punkter(bilder, arb):
    py = MP / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    ut = arb / "punkter.json"
    r = subprocess.run([os.environ.get("MEDIAPIPE_PYTHON", str(py)), str(PUNKTER), "--modell", str(MP / "models" / "face_landmarker.task"),
                        "--ut", str(ut), *map(str, bilder)], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        raise SystemExit("punkter.py föll:\n" + r.stdout[-2000:] + r.stderr[-2000:])
    d = json.loads(ut.read_text(encoding="utf-8"))
    out = []
    for b in bilder:
        lm = d.get(Path(b).name)
        if not lm:
            raise SystemExit(f"inget ansikte i {Path(b).name}")
        out.append(np.array(lm)[:, :2])
    return out


def pixlar(path):
    img = bpy.data.images.load(str(path))
    W, H = img.size
    px = np.empty(W * H * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(H, W, 4)[::-1].copy(), W, H  # rad 0 överst, som bilden


def trianglar_i_bilden(p_d):
    """Delaunay i dockans bild; trianglarna som index i punkterna."""
    v, _, f, orig, _, _ = delaunay_2d_cdt([Vector((float(x), float(y))) for x, y in p_d], [], [], 0, 1e-6)
    karta = [o[0] if o else -1 for o in orig]
    return np.array([[karta[i] for i in t] for t in f if len(t) == 3 and all(karta[i] >= 0 for i in t)])


def indexkarta(p_d, tris):
    """Vilken triangel varje punkt i den främre bilden ligger i (-1 utanför)."""
    idx = np.full((BILD, BILD), -1, np.int32)
    for k, t in enumerate(tris):
        a, b, c = p_d[t]
        x0, x1 = int(max(0, min(a[0], b[0], c[0]))), int(min(BILD - 1, max(a[0], b[0], c[0]) + 1))
        y0, y1 = int(max(0, min(a[1], b[1], c[1]))), int(min(BILD - 1, max(a[1], b[1], c[1]) + 1))
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        l1, l2, l3 = bary(np.stack((X, Y), -1), a, b, c)
        inne = (l1 >= -1e-6) & (l2 >= -1e-6) & (l3 >= -1e-6)
        ys, xs = np.nonzero(inne)
        idx[ys + y0, xs + x0] = k
    return idx


def bary(P, a, b, c):
    den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    l1 = ((b[1] - c[1]) * (P[..., 0] - c[0]) + (c[0] - b[0]) * (P[..., 1] - c[1])) / den
    l2 = ((c[1] - a[1]) * (P[..., 0] - c[0]) + (a[0] - c[0]) * (P[..., 1] - c[1])) / den
    return l1, l2, 1 - l1 - l2


def kant_avstand(P, hull):
    """Kortaste avståndet från punkterna till polygonens kant."""
    d = np.full(len(P), np.inf)
    for i in range(len(hull)):
        a, b = hull[i], hull[(i + 1) % len(hull)]
        ab = b - a
        t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1)
        d = np.minimum(d, np.linalg.norm(P - (a + t[:, None] * ab), axis=1))
    return d


def konvext_holje(p):
    p = sorted(map(tuple, p))
    def halva(pts):
        h = []
        for q in pts:
            while len(h) >= 2 and (h[-1][0] - h[-2][0]) * (q[1] - h[-2][1]) - (h[-1][1] - h[-2][1]) * (q[0] - h[-2][0]) <= 0:
                h.pop()
            h.append(q)
        return h
    lo, hi = halva(p), halva(p[::-1])
    return np.array(lo[:-1] + hi[:-1])


def smoothstep(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def main(docka, bas, narbild, ut, arb):
    arb.mkdir(parents=True, exist_ok=True)
    arm, body = ladda(docka)
    fram = arb / "fram.png"
    cx, cz = rendera_fram(body, fram)
    lm_d, lm_n = punkter([fram, narbild], arb)
    N, Wn, Hn = pixlar(narbild)
    p_d = lm_d[list(PUNKTER_MED)] * BILD
    p_n = lm_n[list(PUNKTER_MED)] * np.array([Wn, Hn])
    tris = trianglar_i_bilden(p_d)
    idx = indexkarta(p_d, tris)
    hull = konvext_holje(p_d)
    bredd = float(np.ptp(p_d[:, 0]))

    # dockans karta: varje triangel (i vila) rastreras i kartan, med läge och normal per bildpunkt
    T, W, H = pixlar(bas)
    T = T[::-1]  # tillbaka till Blenders ordning (rad 0 nederst), som kartan räknas i
    me = body.data
    if hasattr(me, "calc_loop_triangles"):
        me.calc_loop_triangles()
    M = np.array(body.matrix_world)
    co = np.array([v.co for v in me.vertices]) @ M[:3, :3].T + M[:3, 3]
    uv = np.empty(len(me.loops) * 2)
    me.uv_layers.active.data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    nya = np.zeros((H, W, 3), np.float32)
    vikt = np.zeros((H, W), np.float32)
    framat = np.array([0.0, -1.0, 0.0])
    antal = 0
    for lt in me.loop_triangles:
        vs = np.array(lt.vertices)
        P3 = co[vs]
        n = np.cross(P3[1] - P3[0], P3[2] - P3[0])
        if np.linalg.norm(n) < 1e-12:
            continue
        n /= np.linalg.norm(n)
        f = float(n @ framat)
        if f < VANDER[0]:
            continue
        P2 = till_bild(P3, cx, cz)
        if all(not (0 <= x < BILD and 0 <= y < BILD) or idx[int(y), int(x)] < 0 for x, y in P2):
            continue  # helt utanför ansiktet
        q = uv[list(lt.loops)] * np.array([W, H])
        x0, x1 = int(max(0, q[:, 0].min())), int(min(W - 1, q[:, 0].max() + 1))
        y0, y1 = int(max(0, q[:, 1].min())), int(min(H - 1, q[:, 1].max() + 1))
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        l1, l2, l3 = bary(np.stack((X, Y), -1), q[0], q[1], q[2])
        inne = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)
        if not inne.any():
            continue
        ys, xs = np.nonzero(inne)
        w = np.stack((l1[inne], l2[inne], l3[inne]), 1)
        pr = w @ P2  # platsen i den främre bilden
        ix = np.clip(pr[:, 0].astype(int), 0, BILD - 1)
        iy = np.clip(pr[:, 1].astype(int), 0, BILD - 1)
        k = idx[iy, ix]
        ok = k >= 0
        if not ok.any():
            continue
        t = tris[k[ok]]
        a, b, c = p_d[t[:, 0]], p_d[t[:, 1]], p_d[t[:, 2]]
        den = (b[:, 1] - c[:, 1]) * (a[:, 0] - c[:, 0]) + (c[:, 0] - b[:, 0]) * (a[:, 1] - c[:, 1])
        P = pr[ok]
        m1 = ((b[:, 1] - c[:, 1]) * (P[:, 0] - c[:, 0]) + (c[:, 0] - b[:, 0]) * (P[:, 1] - c[:, 1])) / den
        m2 = ((c[:, 1] - a[:, 1]) * (P[:, 0] - c[:, 0]) + (a[:, 0] - c[:, 0]) * (P[:, 1] - c[:, 1])) / den
        m3 = 1 - m1 - m2
        pn = m1[:, None] * p_n[t[:, 0]] + m2[:, None] * p_n[t[:, 1]] + m3[:, None] * p_n[t[:, 2]]
        # bilinjär läsning i närbilden
        x = np.clip(pn[:, 0] - 0.5, 0, Wn - 1.001)
        y = np.clip(pn[:, 1] - 0.5, 0, Hn - 1.001)
        xi, yi = x.astype(int), y.astype(int)
        fx, fy = (x - xi)[:, None], (y - yi)[:, None]
        farg = (N[yi, xi, :3] * (1 - fx) * (1 - fy) + N[yi, xi + 1, :3] * fx * (1 - fy)
                + N[yi + 1, xi, :3] * (1 - fx) * fy + N[yi + 1, xi + 1, :3] * fx * fy)
        a_kant = smoothstep(kant_avstand(P, hull), 0, TONA * bredd)
        a_vand = smoothstep(np.full(len(P), f), *VANDER)
        yy, xx = ys[ok] + y0, xs[ok] + x0
        nya[yy, xx] = farg
        vikt[yy, xx] = np.maximum(vikt[yy, xx], a_kant * a_vand)
        antal += 1
    # färgerna: närbildens medel i området förs till Meshys (i samma bildpunkter, där vikten är stor)
    sel = vikt > 0.5
    flytt = T[..., :3][sel].mean(0) - nya[sel].mean(0)
    nya = np.clip(nya + flytt, 0, 1)
    T[..., :3] = T[..., :3] * (1 - vikt[..., None]) + nya * vikt[..., None]
    del nya
    img = bpy.data.images.new(ut.stem, W, H, alpha=True)
    img.pixels.foreach_set(T.ravel())
    img.filepath_raw = str(ut)
    img.file_format = "PNG"
    img.save()
    rap = {"docka": docka.name, "bas": bas.name, "bas_sha256": sha(bas), "narbild": narbild.name, "narbild_sha256": sha(narbild),
           "punkter": len(p_d), "trianglar_i_ansiktet": int(len(tris)), "ytor_med_narbild": antal,
           "bildpunkter_med_narbild": int((vikt > 0).sum()), "bildpunkter_helt": int((vikt > 0.99).sum()),
           "farg_flyttad": np.round(flytt, 4).tolist(), "ansiktets_bredd_px": round(bredd, 1), "ut": ut.name, "ut_sha256": sha(ut)}
    ut.with_suffix(".json").write_text(json.dumps(rap, indent=1, ensure_ascii=False), encoding="utf-8")
    print("NARBILD", json.dumps(rap, ensure_ascii=False))


if __name__ == "__main__":
    a = sys.argv[sys.argv.index("--") + 1:]
    ut = Path(a[3]).resolve()
    arb = Path(a[a.index("--arbete") + 1]).resolve() if "--arbete" in a else ut.parent / (ut.stem + "-arbete")
    main(Path(a[0]).resolve(), Path(a[1]).resolve(), Path(a[2]).resolve(), ut, arb)
