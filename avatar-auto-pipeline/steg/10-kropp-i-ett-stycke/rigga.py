"""Steg 10b: kroppen i ett stycke sätts på en färdig dockas skelett, utan Meshys rigg (gratis).

1. Kroppen (steg 10a, förenklad med steg 03:s forenkla_4k.py) skalas och flyttas till dockans längd och läge: fötterna på
   golvet, samma höjd, bålen mitt över dockans.
2. Armbågen och handleden läggs i kroppens egen arm: armbågen mitt i armen där dockans armbåge är, handleden mitt i
   handledens smalaste tvärsnitt av hud innanför handen (dockans handled ligger där dess egen arm var, inte kroppens).
3. Vikterna förs över från dockans närmaste yta (Blenders Data Transfer), högst fyra ben per hörn.
4. Fingrarna sätts med steg 05:s fit_fingers, i handens egen ram (fingrar_handflata.py: handflatan framåt i A-posen).
5. Ytan mjukas som i steg 05 (bygg_fingrar.soften_avatar_materials), och filen skrivs som steg 05:s riggfil (Neck med
   stort N), så att steg 05:s eget fingerprov (bygg_fingrar.verify, varje led 12 grader) och steg 06 tar den som den är.

blender -b --python steg/10-kropp-i-ett-stycke/rigga.py -- kropp-latt.glb docka.glb avatar-rigg.glb
Dockan är en färdig dealer med 56 ben och fingrar (assets/docka/standarddocka_tomasz.glb). Rapporten blir rigg.json
bredvid utfilen, och fingerprovet hudvikter.json.
"""

import sys
from pathlib import Path as _Path
_ROOT = next(
    c for c in [_Path(__file__).resolve().parent, *_Path(__file__).resolve().parents]
    if (c / "auto_avatar.py").is_file()
)
if str(_ROOT / "gemensamt") not in sys.path:
    sys.path.insert(0, str(_ROOT / "gemensamt"))
from sokvagar import add_paths
ROOT = add_paths(_ROOT)
sys.path.insert(0, str(_Path(__file__).resolve().parent))

import json
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector

import bygg_fingrar
from fingerrigg import world_vertices
from fingrar_handflata import fit_fingers_handflata


def _bort(obj):
    bpy.data.objects.remove(obj, do_unlink=True)


def _band(P, lo, hi, H, x0=None):
    m = (P[:, 2] > P[:, 2].min() + lo * H) & (P[:, 2] < P[:, 2].min() + hi * H)
    if x0 is not None:
        m &= np.abs(P[:, 0] - x0) < 0.12 * H
    return P[m]


def placera(body, donor):
    """Skala och flytta kroppen till dockans längd och läge (fötterna på golvet, bålen över dockans)."""
    P, Q = world_vertices(body), world_vertices(donor)
    hp, hq = np.ptp(P[:, 2]), np.ptp(Q[:, 2])
    s = hq / hp
    tp = _band(P, 0.5, 0.7, hp, np.median(P[:, 0]))
    tq = _band(Q, 0.5, 0.7, hq, np.median(Q[:, 0]))
    t = np.array([np.median(tq[:, 0]) - s * np.median(tp[:, 0]), np.median(tq[:, 1]) - s * np.median(tp[:, 1]),
                  Q[:, 2].min() - s * P[:, 2].min()])
    body.data.transform(Matrix.Translation(Vector(t)) @ Matrix.Scale(s, 4) @ body.matrix_world)
    body.matrix_world = Matrix.Identity(4)
    body.data.update()
    return {"skala": round(float(s), 5), "flytt_m": np.round(t, 4).tolist(), "langd_m": round(float(hq), 4)}


def _skiva(P, mitt, riktning, halv, radie):
    rel = P - mitt
    along = rel @ riktning
    radial = np.linalg.norm(rel - np.outer(along, riktning), axis=1)
    return (np.abs(along) < halv) & (radial < radie)


def smalast(P, hand, near, elbow, d):
    """Mitten av det smalaste tvärsnittet av bara hud (handens yta), från handens början och 5 cm ut längs d."""
    rel = P - elbow
    along = rel @ d
    radial = np.linalg.norm(rel - np.outer(along, d), axis=1)
    near = near & (radial < 0.07)
    start = along[hand & near].min()
    e1 = np.cross(d, [0.0, 0.0, 1.0]); e1 /= np.linalg.norm(e1)
    e2 = np.cross(d, e1)
    rows = []
    for a in np.arange(start + 0.004, start + 0.05, 0.003):
        m = near & (np.abs(along - a) < 0.003)
        if m.sum() < 12 or hand[m].mean() < 0.95:
            continue
        q = P[m] - P[m].mean(0)
        rows.append((a, np.ptp(q @ e1) * np.ptp(q @ e2), P[m].mean(0)))
    if not rows:
        raise ValueError("hittar ingen handled av hud.")
    area = np.array([r[1] for r in rows])
    area = np.convolve(np.pad(area, 1, mode="edge"), np.ones(3) / 3, mode="valid")  # ett tvärsnitt är brusigt
    k = int(np.argmin(area))
    return rows[k][2], rows[k][0] - start


def lagg_leder(arm, body):
    """Armbågen och handleden mitt i kroppens egen arm (se modulens text, punkt 2)."""
    P = world_vertices(body)
    mw, inv = arm.matrix_world, arm.matrix_world.inverted()
    slots = {i for i, s in enumerate(body.material_slots) if s.name.casefold().startswith("handpar")}
    hand = np.zeros(len(P), bool)
    for p in body.data.polygons:
        if p.material_index in slots:
            hand[list(p.vertices)] = True
    rep, nya = {}, {}
    for side, sgn in (("Right", -1), ("Left", 1)):
        b = {k: arm.data.bones[side + k] for k in ("Arm", "ForeArm", "Hand")}
        elbow, wrist = np.array(mw @ b["ForeArm"].head_local), np.array(mw @ b["Hand"].head_local)
        d = (wrist - elbow) / np.linalg.norm(wrist - elbow)
        near = sgn * P[:, 0] > 0
        # Armbågen: mitten av armens tvärsnitt där dockans armbåge är (bara sidled, inte längs armen).
        m = near & _skiva(P, elbow, d, 0.006, 0.07)
        c = P[m].mean(0)
        new_elbow = elbow + (c - elbow) - ((c - elbow) @ d) * d
        # Handleden: mitten av det smalaste tvärsnittet av hud innanför handen, längs kroppens egen underarm (två varv:
        # underarmens riktning räknas om från den nya handleden).
        new_wrist, fran = smalast(P, hand, near, new_elbow, d)
        new_wrist, fran = smalast(P, hand, near, new_elbow, (new_wrist - new_elbow) / np.linalg.norm(new_wrist - new_elbow))
        nya[side] = (new_elbow, new_wrist)
        rep[side] = {"armbage_flyttad_mm": round(float(np.linalg.norm(new_elbow - elbow) * 1000), 1),
                     "handled_flyttad_mm": round(float(np.linalg.norm(new_wrist - wrist) * 1000), 1),
                     "handled_fran_handens_borjan_mm": round(float(fran * 1000), 1)}
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    for side, (e, w) in nya.items():
        e, w = inv @ Vector(e), inv @ Vector(w)
        eb[side + "Arm"].tail = e
        eb[side + "ForeArm"].head = e
        eb[side + "ForeArm"].tail = w
        eb[side + "Hand"].head = w
    bpy.ops.object.mode_set(mode="OBJECT")
    return rep


def for_over_vikter(body, donor, arm):
    for g in donor.vertex_groups:
        body.vertex_groups.new(name=g.name)
    mod = body.modifiers.new("vikter", "DATA_TRANSFER")
    mod.object = donor
    mod.use_vert_data = True
    mod.data_types_verts = {"VGROUP_WEIGHTS"}
    mod.vert_mapping = "POLYINTERP_NEAREST"
    mod.layers_vgroup_select_src = "ALL"
    mod.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    body.parent = arm
    body.matrix_parent_inverse = arm.matrix_world.inverted()
    am = body.modifiers.new("Armature", "ARMATURE")
    am.object = arm
    utan = sum(1 for v in body.data.vertices if not v.groups)
    return {"horn_utan_vikt": utan, "grupper": len(body.vertex_groups)}


def main(src, docka, dst):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(docka))
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    donor = next(o for o in bpy.context.scene.objects if o.type == "MESH" and o.find_armature() == arm)
    if any("ForeArmTwist" in b.name for b in arm.data.bones):
        raise ValueError("Dockan har redan vridben: ta den utan (steg 6 lägger dem efter att armbågen och handleden flyttats).")
    for o in [o for o in bpy.context.scene.objects if o.type == "MESH" and o is not donor]:
        _bort(o)
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(src), merge_vertices=True)
    new = [o for o in bpy.context.scene.objects if o not in before]
    body = max((o for o in new if o.type == "MESH"), key=lambda o: len(o.data.vertices))
    for o in new:
        if o is not body:
            _bort(o)
    body.parent = None
    rep = {"docka": Path(docka).name, "kropp": Path(src).name, "ben": len(arm.data.bones)}
    rep["placering"] = placera(body, donor)
    rep["vikter"] = for_over_vikter(body, donor, arm)
    donor_mesh = donor.data
    _bort(donor)
    bpy.data.meshes.remove(donor_mesh)
    body.name = body.data.name = Path(dst).stem
    # Dockans material försvann med dess yta; kroppens behåller namnen utan Blenders .001 (Kropp, Huvud, Handpar, Skarvar).
    for m in [m for m in bpy.data.materials if m.users == 0]:
        bpy.data.materials.remove(m)
    for slot in body.material_slots:
        base = slot.material.name.rsplit(".", 1)[0]
        if slot.material.name != base and base not in bpy.data.materials:
            slot.material.name = base
    rep["leder"] = lagg_leder(arm, body)
    rep["fingrar"] = fit_fingers_handflata(arm, body)
    # Steg 05:s riggfil har Neck med stort N; steg 06 döper om den till neck för spelet.
    if "neck" in arm.data.bones:
        arm.data.bones["neck"].name = "Neck"
        if "neck" in body.vertex_groups:
            body.vertex_groups["neck"].name = "Neck"
    bygg_fingrar.soften_avatar_materials(body)
    bpy.ops.object.select_all(action="DESELECT")
    for o in (arm, body):
        o.select_set(True)
    tmp = dst.with_name(dst.stem + ".partial.glb")
    bpy.ops.export_scene.gltf(filepath=str(tmp), export_format="GLB", use_selection=True, export_animations=False,
                              export_image_format="AUTO")
    tmp.replace(dst)
    rep["ben_efter"] = len(arm.data.bones)
    dst.with_name("rigg.json").write_text(json.dumps(rep, indent=1, ensure_ascii=False, default=float), encoding="utf-8")
    print("RIGG", json.dumps(rep, ensure_ascii=False, default=float))
    bygg_fingrar.verify(dst)
    print("FINGERPROV", dst.with_name("hudvikter.json"))


if __name__ == "__main__":
    a = sys.argv[sys.argv.index("--") + 1:]
    main(Path(a[0]).resolve(), Path(a[1]).resolve(), Path(a[2]).resolve())
