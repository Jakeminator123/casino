"""Steg 12 i Blender: en dockas yta som kopia att måla hos Meshy, och den målade bilden lagd på dockan själv.

Dockan (Danilos, Frasses eller en annan standarddocka ur scen/bygg_docka.py) är en enda yta med ett material och en
ytkarta (MPFB:s UVMap: bålen, huvudet, händerna och fötterna i var sin ö; tänderna en egen liten ö, ögongloberna och
brynen har ingen egen plats och står alla i hörnet (0, 0)). Ansiktets färger är hörnfärger på det enda materialet
(ANSIKTE i scen/bygg_docka.py). Därför:

kopia  Ytan i en egen kopia utan skelett, former och hörnfärger, ställd som personen står i den främre vyn (armarna lika
       långt ut, handflatorna framåt), så att Meshy ser samma figur i modellen och i bilderna. Brynen och tänderna tas
       bort (målningen hamnar då på huden under brynen, och tänderna syns inte), och varje ögonglob får en egen ö i den
       tomma delen av kartan (OGON_OAR), projicerad framifrån, så att ögat inte är ett hål i ansiktet och dess målning får
       en plats. Ytkartan är annars dockans egen: bilden Meshy målar på den (enable_original_uv) passar dockan som den är.
       Ställningen ändrar inte kartan, så bilden passar också dockan i vila.
lagg   Den målade bilden läggs på dockan själv, med skelett, fingrar, vridben och ansiktsformer orörda, och skrivs som en
       ny fil (dockan skrivs aldrig över). Materialet blir en bild utan hörnfärger: brynen tar kartan av huden under sig
       (de rör sig med brynformerna och visar personens bryn), ögonen sina öar (Meshys målning, eller med --egna-ogon
       dockans egna färger målade i öarna), och tänderna och munhålan målas i dockans egna färger i bilden.

blender -b --python-exit-code 1 --python steg/12-ny-yta/yta.py -- kopia docka.glb vy-fram.png kopia.glb
blender -b --python-exit-code 1 --python steg/12-ny-yta/yta.py -- lagg docka.glb bild.png ut.glb [--egna-ogon] [--normal n.png]

Rapporten skrivs bredvid utfilen (<ut>.json). Den främre vyn mäts för armarnas vinkel (ARMVINKEL nedan om den inte går).
"""
import ast
import hashlib
import json
import math
import os
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

ROOT = next(p for p in Path(__file__).resolve().parents if (p / "auto_avatar.py").is_file())
SIDOR = ("Right", "Left")
# Var ögongloberna får sina öar i ytkartan (Blenders u, v; v uppåt): den tomma rutan ovanför vänstra armen i MPFB:s
# karta (u 0–0,19, v 0,87–1). Höger öga (dealerns) först.
OGON_OAR = {"R": (0.02, 0.92, 0.06), "L": (0.10, 0.92, 0.06)}  # u0, v0, sida
ARMVINKEL = 10.0  # grader under vågrätt, om den främre vyn inte går att mäta (Tomasz flervy-vy-0: ärmens mittlinje 9)


def ansikte():
    """ANSIKTE ur scen/bygg_docka.py (färgerna står där och bara där), läst utan att köra skriptet."""
    src = (ROOT / "scen" / "bygg_docka.py").read_text(encoding="utf-8")
    for node in ast.parse(src).body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", None) == "ANSIKTE" for t in node.targets):
            return ast.literal_eval(node.value)
    raise SystemExit("ANSIKTE saknas i scen/bygg_docka.py")


def ladda(glb):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    body = max((o for o in bpy.context.scene.objects if o.type == "MESH" and o.find_armature() == arm),
               key=lambda o: len(o.data.vertices))
    if arm.animation_data:
        arm.animation_data.action = None
    for pb in arm.pose.bones:
        for c in pb.constraints:
            c.mute = True
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    return arm, body


def delar(body):
    """Varje ytas del efter hörnfärgen: hud, vitan, iris, pupill, bryn, munhala, lappar, tander."""
    farger = ansikte()["farg"]
    me = body.data
    attr = me.color_attributes[0]
    c = np.empty(len(attr.data) * 4)
    attr.data.foreach_get("color", c)
    c = c.reshape(-1, 4)[:, :3]
    if attr.domain == "POINT":  # glTF har en färg per hörn i filen; importen kan lägga den på punkterna
        vi = np.empty(len(me.loops), dtype=np.int64)
        me.loops.foreach_get("vertex_index", vi)
        c = c[vi]
    namn = list(farger)
    F = np.array([farger[n] for n in namn])
    first = np.empty(len(me.polygons), dtype=np.int64)
    me.polygons.foreach_get("loop_start", first)
    d = np.linalg.norm(c[first][:, None, :] - F[None], axis=2)
    k = d.argmin(1)
    if d[np.arange(len(k)), k].max() > 0.02:
        raise SystemExit("en yta har en färg som inte står i ANSIKTE: dockan är inte byggd av scen/bygg_docka.py")
    return np.array(namn)[k]


def ogon_uv(body, del_av):
    """Varje ögonglob i sin ö (OGON_OAR), projicerad framifrån (-Y) i dockans eget rum. Samma för kopian och dockan."""
    me = body.data
    uv = me.uv_layers.active.data
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    ut = {}
    ogon = [p for p in me.polygons if del_av[p.index] in ("vitan", "iris", "pupill")]
    for sida, tecken in (("R", -1), ("L", 1)):
        polys = [p for p in ogon if tecken * co[list(p.vertices)].mean(0)[0] > 0]
        vs = np.unique([v for p in polys for v in p.vertices])
        mitt = (co[vs].min(0) + co[vs].max(0)) / 2  # globens mitt (hörnen ligger tätare fram, vid iris och pupill)
        r = float(np.ptp(co[vs], axis=0).max() / 2)
        u0, v0, s = OGON_OAR[sida]
        for p in polys:
            for li in p.loop_indices:
                x, _, z = co[me.loops[li].vertex_index] - mitt
                # bildens vänster är dealerns höger: u växer med +X (dealerns vänster), som en bild av ansiktet framifrån
                uv[li].uv = (u0 + s * (0.5 + x / (2 * r)), v0 + s * (0.5 + z / (2 * r)))
        ut[sida] = {"ytor": len(polys), "mitt_m": np.round(mitt, 4).tolist(), "radie_mm": round(r * 1000, 2), "o": [u0, v0, s]}
    return ut


def vinkel_ur_vyn(vy):
    """Armarnas vinkel under vågrätt i den främre vyn: ärmens mittlinje mellan handen och bålen (bildens alfa, eller
    det som inte är vit bakgrund), en rät linje genom varje kolumns mitt."""
    img = bpy.data.images.load(str(vy))
    W, H = img.size
    px = np.array(img.pixels[:]).reshape(H, W, 4)[::-1]
    bpy.data.images.remove(img)
    mask = px[:, :, 3] > 0.5 if px[:, :, 3].min() < 0.5 else px[:, :, :3].mean(2) < 0.92
    rows = np.nonzero(mask.any(1))[0]
    cols = np.nonzero(mask.any(0))[0]
    hojd = rows.max() - rows.min()
    mittx = (cols.min() + cols.max()) / 2
    ut = []
    for kant in (-1, 1):
        yttre = cols.min() if kant < 0 else cols.max()
        bal = mittx + kant * 0.17 * hojd  # bålens kant ungefär (axlarnas halva bredd)
        xs = np.arange(yttre - kant * 0.12 * hojd, bal, -kant)  # från handleden in mot bålen
        pts = [(x, np.nonzero(mask[:, int(x)])[0].mean()) for x in xs if mask[:, int(x)].any()]
        if len(pts) < 10:
            return ARMVINKEL, []
        x, y = np.array(pts).T
        k = np.polyfit(abs(x - mittx), y, 1)[0]
        ut.append(math.degrees(math.atan(k)))
    v = float(np.mean(ut))
    return (v if 0 < v < 60 else ARMVINKEL), [round(x, 1) for x in ut]


def vrid(arm, pb, axel, grader):
    ax = (arm.matrix_world.inverted().to_3x3() @ Vector(axel)).normalized()
    head = pb.head.copy()
    pb.matrix = Matrix.Translation(head) @ Matrix.Rotation(math.radians(grader), 4, ax) @ Matrix.Translation(-head) @ pb.matrix
    bpy.context.view_layer.update()


def varld(arm, pb, tail=False):
    return np.array(arm.matrix_world @ (pb.tail if tail else pb.head))


def stall_som_vyn(arm, vinkel):
    """Armarna i bildens plan, `vinkel` under vågrätt, och handflatorna framåt."""
    B = {b.name: b for b in arm.pose.bones}
    ut = {}
    for side, s in (("Right", -1), ("Left", 1)):
        a, h = varld(arm, B[side + "Arm"]), varld(arm, B[side + "Hand"])
        d0 = (h - a) / np.linalg.norm(h - a)
        d1 = np.array([s * math.cos(math.radians(vinkel)), 0.0, -math.sin(math.radians(vinkel))])
        ax = np.cross(d0, d1)
        g = math.degrees(math.acos(float(np.clip(d0 @ d1, -1, 1))))
        if np.linalg.norm(ax) > 1e-6:
            vrid(arm, B[side + "Arm"], ax, g)
        # handflatans normal (bort från handflatan) mot framåt (-Y), kring armens nya riktning
        w = varld(arm, B[side + "Hand"])
        f = varld(arm, B[side + "HandMiddle1"]) - w
        f /= np.linalg.norm(f)
        t = varld(arm, B[side + "HandThumb2"]) - w
        t -= (t @ f) * f
        t /= np.linalg.norm(t)
        palm = np.cross(t, f) if side == "Right" else np.cross(f, t)
        a, h = varld(arm, B[side + "Arm"]), varld(arm, B[side + "Hand"])
        d = (h - a) / np.linalg.norm(h - a)
        p = palm - (palm @ d) * d
        mal = np.array([0.0, -1.0, 0.0]) - d[1] * d
        p /= np.linalg.norm(p)
        mal /= np.linalg.norm(mal)
        vr = math.degrees(math.atan2(float(np.cross(p, mal) @ d), float(p @ mal)))
        # Vridningen läggs som i en arm: underarmen vrider högst 90 grader, fördelad på vridbenen (en tredjedel och två
        # tredjedelar, som figure-model.ts), och resten tar axeln. Handen behåller sin vridning när vridbenen vrids.
        fa = max(-90.0, min(90.0, vr))
        if abs(vr - fa) > 1e-3:
            vrid(arm, B[side + "Arm"], d, vr - fa)
        e = varld(arm, B[side + "Hand"]) - varld(arm, B[side + "ForeArm"])
        e /= np.linalg.norm(e)
        vrid(arm, B[side + "Hand"], e, fa)
        hand = B[side + "Hand"].matrix.copy()
        for n, andel in ((1, 1 / 3), (2, 2 / 3)):
            if f"{side}ForeArmTwist{n}" in B:
                vrid(arm, B[f"{side}ForeArmTwist{n}"], e, fa * andel)
        B[side + "Hand"].matrix = hand
        bpy.context.view_layer.update()
        ut[side] = {"armen_flyttad_grader": round(g, 1), "vriden_i_axeln_grader": round(vr - fa, 1),
                    "vriden_i_underarmen_grader": round(fa, 1)}
    return ut


def sha(path):
    with open(path, "rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def kopia(glb, vy, ut):
    arm, body = ladda(glb)
    del_av = delar(body)
    rap = {"docka": glb.name, "docka_sha256": sha(glb), "vy": vy.name, "vy_sha256": sha(vy), "yta_py_sha256": sha(__file__),
           "ytor_per_del": {}}
    for k in np.unique(del_av):
        rap["ytor_per_del"][str(k)] = int((del_av == k).sum())
    rap["ogon"] = ogon_uv(body, del_av)
    vinkel, matt = vinkel_ur_vyn(vy)
    rap["armvinkel_ur_vyn_grader"] = {"vald": round(vinkel, 1), "matt_bildens_vanster_hoger": matt}
    rap["stallning"] = stall_som_vyn(arm, vinkel)
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    me.transform(body.matrix_world)
    p = np.array([v.co for v in me.vertices])
    flytt = Vector((-(p[:, 0].min() + p[:, 0].max()) / 2, -(p[:, 1].min() + p[:, 1].max()) / 2, -p[:, 2].min()))
    me.transform(Matrix.Translation(flytt))  # mitt över origo med fötterna på golvet
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    bort = [f for f in bm.faces if del_av[f.index] in ("bryn", "tander")]
    bmesh.ops.delete(bm, geom=bort, context="FACES")
    bm.to_mesh(me)
    bm.free()
    while me.color_attributes:
        me.color_attributes.remove(me.color_attributes[0])
    for layer in [l for l in me.uv_layers if l != me.uv_layers.active]:
        me.uv_layers.remove(layer)
    if me.shape_keys:
        raise SystemExit("kopian fick former")
    mat = bpy.data.materials.new("yta")
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.6, 0.6, 0.6, 1)
    me.materials.clear()
    me.materials.append(mat)
    o = bpy.data.objects.new("yta_kopia", me)
    bpy.context.scene.collection.objects.link(o)
    for x in list(bpy.context.scene.objects):
        if x is not o:
            bpy.data.objects.remove(x, do_unlink=True)
    uv = np.empty(len(me.loops) * 2)
    me.uv_layers.active.data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    co = np.array([v.co for v in me.vertices])
    rap.update(horn=len(me.vertices), ytor=len(me.polygons), trianglar=int(sum(len(p.vertices) - 2 for p in me.polygons)),
               uv_inom_0_1=bool(((uv >= 0) & (uv <= 1)).all()), langd_m=round(float(np.ptp(co[:, 2])), 3),
               bredd_m=round(float(np.ptp(co[:, 0])), 3))
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    ny = ut.with_suffix(".ny.glb")
    bpy.ops.export_scene.gltf(filepath=str(ny), export_format="GLB", use_selection=True, export_animations=False,
                              export_yup=True, export_image_format="AUTO")
    os.replace(ny, ut)
    rap["kopia_sha256"] = sha(ut)
    ut.with_suffix(".json").write_text(json.dumps(rap, indent=1, ensure_ascii=False), encoding="utf-8")
    print("KOPIA", json.dumps(rap, ensure_ascii=False))


def bryn_uv(body, del_av):
    """Brynens hörn tar kartan av huden närmast under sig (interpolerad i hudens yta), så att de visar målningen där."""
    me = body.data
    co = [v.co.copy() for v in me.vertices]
    hud = [p for p in me.polygons if del_av[p.index] in ("hud", "lappar")]
    trad = BVHTree.FromPolygons(co, [tuple(p.vertices) for p in hud])
    uv = me.uv_layers.active.data
    langst = 0.0
    n = 0
    for p in me.polygons:
        if del_av[p.index] != "bryn":
            continue
        for li in p.loop_indices:
            v = me.loops[li].vertex_index
            loc, _, fi, dist = trad.find_nearest(co[v])
            q = hud[fi]
            w = poly_3d_calc([co[k] for k in q.vertices], loc)
            uv[li].uv = sum((uv[l].uv * wk for l, wk in zip(q.loop_indices, w)), Vector((0.0, 0.0)))
            langst = max(langst, dist)
            n += 1
    return {"horn": n, "langst_till_huden_mm": round(langst * 1000, 2)}


def till_srgb(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(np.maximum(c, 0), 1 / 2.4) - 0.055)


def mala(px, W, H, me, polys, farg_per_yta):
    """Fyller ytornas trianglar i kartan (bildens punkter, rad 0 nederst som Blenders bild) med en färg per yta."""
    uv = me.uv_layers.active.data
    fyllda = 0
    for p in polys:
        c = farg_per_yta(p)
        q = [Vector((uv[li].uv.x * W, uv[li].uv.y * H)) for li in p.loop_indices]
        for k in range(1, len(q) - 1):
            a, b, d = q[0], q[k], q[k + 1]
            x0, x1 = int(max(0, min(a.x, b.x, d.x) - 1)), int(min(W - 1, max(a.x, b.x, d.x) + 1))
            y0, y1 = int(max(0, min(a.y, b.y, d.y) - 1)), int(min(H - 1, max(a.y, b.y, d.y) + 1))
            if x1 < x0 or y1 < y0:
                continue
            X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            den = (b.y - d.y) * (a.x - d.x) + (d.x - b.x) * (a.y - d.y)
            if abs(den) < 1e-12:
                continue
            l1 = ((b.y - d.y) * (X - d.x) + (d.x - b.x) * (Y - d.y)) / den
            l2 = ((d.y - a.y) * (X - d.x) + (a.x - d.x) * (Y - d.y)) / den
            inne = (l1 >= -0.02) & (l2 >= -0.02) & (1 - l1 - l2 >= -0.02)  # lite utanför: inga glipor mellan ytorna
            ys, xs = np.nonzero(inne)
            px[ys + y0, xs + x0, :3] = c
            fyllda += len(ys)
    return fyllda


def lagg(glb, bild, ut, egna_ogon=False, normal=None):
    arm, body = ladda(glb)
    me = body.data
    del_av = delar(body)
    farger = ansikte()["farg"]
    rap = {"docka": glb.name, "docka_sha256": sha(glb), "bild": bild.name, "bild_sha256": sha(bild)}
    rap["ogon"] = ogon_uv(body, del_av)
    rap["bryn"] = bryn_uv(body, del_av)
    img = bpy.data.images.load(str(bild))
    W, H = img.size
    px = np.empty(W * H * 4, np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(H, W, 4)
    # Tänderna och munhålan i dockans egna färger (Meshy såg inga tänder, och munnens insida syns bara när den öppnas).
    malas = ["tander", "munhala"] + (["vitan", "iris", "pupill"] if egna_ogon else [])
    rap["malat_i_bilden"] = {}
    for vad in malas:
        polys = [p for p in me.polygons if del_av[p.index] == vad]
        rap["malat_i_bilden"][vad] = mala(px, W, H, me, polys, lambda p, v=vad: till_srgb(farger[v]))
    malad = bpy.data.images.new(ut.stem + "_yta", W, H, alpha=False)
    malad.pixels.foreach_set(px.ravel())
    malad.filepath_raw = str(ut.with_name(ut.stem + "_yta.png"))
    malad.file_format = "PNG"
    malad.pack()
    bpy.data.images.remove(img)
    mat = bpy.data.materials.new("dealer_yta")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = malad
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.6
    if normal:
        nimg = bpy.data.images.load(str(normal))
        nimg.colorspace_settings.name = "Non-Color"
        ntex = nt.nodes.new("ShaderNodeTexImage")
        ntex.image = nimg
        nmap = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
        nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
        rap["normal"] = normal.name
    me.materials.clear()
    me.materials.append(mat)
    while me.color_attributes:  # färgerna står nu i bilden
        me.color_attributes.remove(me.color_attributes[0])
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = arm
    ny = ut.with_suffix(".ny.glb")
    bpy.ops.export_scene.gltf(filepath=str(ny), export_format="GLB", use_selection=True, export_animations=False,
                              export_image_format="AUTO")
    os.replace(ny, ut)
    rap.update(ut=ut.name, ut_sha256=sha(ut), bildens_storlek=[W, H], egna_ogon=egna_ogon,
               former=len(me.shape_keys.key_blocks) - 1 if me.shape_keys else 0, ben=len(arm.data.bones))
    ut.with_suffix(".json").write_text(json.dumps(rap, indent=1, ensure_ascii=False), encoding="utf-8")
    print("LAGG", json.dumps(rap, ensure_ascii=False))


if __name__ == "__main__":
    a = sys.argv[sys.argv.index("--") + 1:]
    if a[0] == "kopia":
        kopia(Path(a[1]).resolve(), Path(a[2]).resolve(), Path(a[3]).resolve())
    elif a[0] == "lagg":
        nor = Path(a[a.index("--normal") + 1]).resolve() if "--normal" in a else None
        lagg(Path(a[1]).resolve(), Path(a[2]).resolve(), Path(a[3]).resolve(), "--egna-ogon" in a, nor)
    else:
        raise SystemExit("okänt: " + a[0])
