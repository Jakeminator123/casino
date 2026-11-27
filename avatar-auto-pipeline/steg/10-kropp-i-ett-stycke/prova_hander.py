"""Ett hårdare fingerprov än steg 05:s (12 grader per led), för vilken riggad dealer som helst: en knuten hand och ett nyp.

- Knuten hand: varje fingerled, tummens med, böjs 60 grader in mot handflatan.
- Nyp: pekfingret böjs (35, 45 och 30 grader) och tummen vrids och böjs tills dess topp når pekfingrets.
Böjningen räknas i handens egen ram, ur benen som spelet läser den (figure-model.ts): framåt från handleden mot
långfingrets knoge, tummens sida och handflatan som tummen x framåt (höger hand) eller framåt x tummen (vänster). Leden böjs
kring axeln vinkelrätt mot benet och handflatans normal, så att samma ställning blir samma på varje docka oavsett hur
lederna är rullade.

Mätt i varje ställning: hur många hörn av ett finger som ligger inne i ett annat fingers hud (fingrar som smälter ihop),
hur mycket handens kanter töjs och trycks ihop (huden följer eller rivs), och i nypet glappet mellan tummens och
pekfingrets hud.

blender -b --python steg/10-kropp-i-ett-stycke/prova_hander.py -- docka.glb ut.json
Funktionerna (handram, knyt, nyp, matt) används också av den som renderar ställningarna.
"""

import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector, kdtree

DIGITS = ("Thumb", "Index", "Middle", "Ring", "Pinky")
SIDES = ("Right", "Left")


def ben(arm):
    return {b.name.split(":")[-1]: b for b in arm.pose.bones}


def _varld(arm, pb, tail=False):
    return np.array(arm.matrix_world @ (pb.tail if tail else pb.head))


def handram(arm, side):
    """Handleden, framåt och handflatans normal (bort från handflatan), ur benen i den ställning de står nu."""
    B = ben(arm)
    w = _varld(arm, B[side + "Hand"])
    f = _varld(arm, B[side + "HandMiddle1"]) - w
    f /= np.linalg.norm(f)
    t = _varld(arm, B[side + "HandThumb2"]) - w
    t -= (t @ f) * f
    t /= np.linalg.norm(t)
    palm = np.cross(t, f) if side == "Right" else np.cross(f, t)
    return w, f, palm / np.linalg.norm(palm)


def vrid(arm, pb, axis_world, grader):
    """Vrider ett posebens kring sitt huvud och en axel i världen."""
    ax = (arm.matrix_world.inverted().to_3x3() @ Vector(axis_world)).normalized()
    head = pb.head.copy()
    pb.matrix = Matrix.Translation(head) @ Matrix.Rotation(math.radians(grader), 4, ax) @ Matrix.Translation(-head) @ pb.matrix
    bpy.context.view_layer.update()


def boj(arm, side, digit, vinklar, palm):
    B = ben(arm)
    for j, g in zip((1, 2, 3), vinklar):
        pb = B[f"{side}Hand{digit}{j}"]
        y = _varld(arm, pb, True) - _varld(arm, pb)
        axis = np.cross(y, palm)
        if np.linalg.norm(axis) < 1e-9 or not g:
            continue
        vrid(arm, pb, axis / np.linalg.norm(axis), g)


def vila(arm):
    for pb in arm.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()


def knyt(arm, side, grader=60):
    _, _, palm = handram(arm, side)
    for digit in DIGITS:
        boj(arm, side, digit, (grader, grader, grader), palm)


def nyp(arm, side):
    """Pekfingret böjt, tummen vriden och böjd tills topparna möts (sökt i ett rutnät, bara med benen)."""
    w, f, palm = handram(arm, side)
    boj(arm, side, "Index", (35, 45, 30), palm)
    B = ben(arm)
    target = _varld(arm, B[side + "HandIndex3"], True)
    t1 = B[side + "HandThumb1"]
    keep = {n: B[f"{side}HandThumb{n}"].matrix_basis.copy() for n in (1, 2, 3)}
    skins = [m for o in bpy.context.scene.objects if o.type == "MESH" for m in o.modifiers if m.type == "ARMATURE"]
    for m in skins:  # sökningen läser bara benen: huden räknas inte om för varje försök
        m.show_viewport = False
    best = None
    for swing in range(-90, 91, 10):
        for curl1 in range(0, 61, 10):
            for curl2 in range(0, 61, 10):
                for n in (1, 2, 3):
                    B[f"{side}HandThumb{n}"].matrix_basis = keep[n].copy()
                bpy.context.view_layer.update()
                vrid(arm, t1, palm, swing)
                boj(arm, side, "Thumb", (curl1, curl2, curl2 * 0.8), palm)
                d = float(np.linalg.norm(_varld(arm, B[side + "HandThumb3"], True) - target))
                if best is None or abs(d - 0.012) < best[0]:
                    best = (abs(d - 0.012), swing, curl1, curl2, d)
    for n in (1, 2, 3):
        B[f"{side}HandThumb{n}"].matrix_basis = keep[n].copy()
    _, s0, c10, c20, _ = best  # finare runt det bästa
    for swing in np.arange(s0 - 8, s0 + 8.1, 2):
        for curl1 in np.arange(max(0, c10 - 8), c10 + 8.1, 2):
            for curl2 in np.arange(max(0, c20 - 8), c20 + 8.1, 2):
                for n in (1, 2, 3):
                    B[f"{side}HandThumb{n}"].matrix_basis = keep[n].copy()
                bpy.context.view_layer.update()
                vrid(arm, t1, palm, swing)
                boj(arm, side, "Thumb", (curl1, curl2, curl2 * 0.8), palm)
                d = float(np.linalg.norm(_varld(arm, B[side + "HandThumb3"], True) - target))
                if abs(d - 0.012) < best[0]:
                    best = (abs(d - 0.012), float(swing), float(curl1), float(curl2), d)
    for n in (1, 2, 3):
        B[f"{side}HandThumb{n}"].matrix_basis = keep[n].copy()
    for m in skins:
        m.show_viewport = True
    bpy.context.view_layer.update()
    _, swing, curl1, curl2, d = best
    vrid(arm, t1, palm, swing)
    boj(arm, side, "Thumb", (curl1, curl2, curl2 * 0.8), palm)
    return {"tumme_sving_grader": swing, "tumme_bojning_grader": [curl1, curl2, round(curl2 * 0.8)],
            "topparnas_ben_mm": round(d * 1000, 1)}


def _hud(mesh):
    ev = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = ev.data
    p = np.empty((len(me.vertices), 3)); me.vertices.foreach_get("co", p.ravel())
    n = np.empty((len(me.vertices), 3)); me.vertex_normals.foreach_get("vector", n.ravel())
    M = np.array(ev.matrix_world)
    return p @ M[:3, :3].T + M[:3, 3], n @ M[:3, :3].T


def fingrarnas_horn(mesh, side):
    """Varje fingers hörn: de där fingrets tre leder tillsammans väger minst 0,5."""
    idx = {g.name.split(":")[-1]: g.index for g in mesh.vertex_groups}
    out = {d: [] for d in DIGITS}
    hand = []
    want = {idx[f"{side}Hand{d}{j}"]: d for d in DIGITS for j in (1, 2, 3) if f"{side}Hand{d}{j}" in idx}
    palm = idx.get(side + "Hand")
    for v in mesh.data.vertices:
        s = {}
        h = 0.0
        for g in v.groups:
            if g.group in want:
                s[want[g.group]] = s.get(want[g.group], 0) + g.weight
                h += g.weight
            elif g.group == palm:
                h += g.weight
        if h > 0.3:
            hand.append(v.index)
        if s:
            d, wsum = max(s.items(), key=lambda kv: kv[1])
            if wsum >= 0.5:
                out[d].append(v.index)
    return {d: np.array(v, int) for d, v in out.items()}, np.array(hand, int)


def _kanter(mesh, hand):
    e = np.empty((len(mesh.data.edges), 2), int); mesh.data.edges.foreach_get("vertices", e.ravel())
    inside = np.zeros(len(mesh.data.vertices), bool); inside[hand] = True
    return e[inside[e].all(axis=1)]


def matt(mesh, side, rest, fingers, edges, par=None):
    """Hörn inne i ett annat fingers hud (minst 1 mm bakom ytan vid dess närmaste hörn, inom 6 mm), och kanternas
    töjning mot vilan."""
    pos, nor = _hud(mesh)
    trees = {}
    for d, ids in fingers.items():
        if len(ids):
            kd = kdtree.KDTree(len(ids))
            for k, i in enumerate(ids):
                kd.insert(pos[i], k)
            kd.balance()
            trees[d] = kd
    inne = {}
    pairs = par or [(a, b) for i, a in enumerate(DIGITS) for b in DIGITS[i + 1:]]
    for a, b in pairs:
        if a not in trees or b not in trees:
            continue
        n = 0
        for src, dst in ((a, b), (b, a)):
            ids_d = fingers[dst]
            for i in fingers[src]:
                co, k, dist = trees[dst].find(pos[i])
                if dist < 0.006 and (pos[i] - np.array(co)) @ nor[ids_d[k]] < -0.001:
                    n += 1
        if n:
            inne[f"{a}-{b}"] = n
    lr = np.linalg.norm(rest[edges[:, 0]] - rest[edges[:, 1]], axis=1)
    lp = np.linalg.norm(pos[edges[:, 0]] - pos[edges[:, 1]], axis=1)
    ok = lr > 1e-6
    ratio = lp[ok] / lr[ok]
    return {"horn_inne_i_annat_finger": inne, "summa_inne": int(sum(inne.values())),
            "kanter_toj_99_procent": round(float(np.percentile(ratio, 99)), 3), "kanter_toj_max": round(float(ratio.max()), 3),
            "kanter_tryck_1_procent": round(float(np.percentile(ratio, 1)), 3),
            "kanter_over_1_5": int((ratio > 1.5).sum()), "kanter_under_0_5": int((ratio < 0.5).sum()), "kanter": int(len(ratio))}


def glapp(mesh, side, fingers):
    """Kortaste avståndet mellan tummens och pekfingrets hud i nypet (hörn inne i varandra räknas i matt())."""
    pos, _ = _hud(mesh)
    t, i = fingers["Thumb"], fingers["Index"]
    kd = kdtree.KDTree(len(i))
    for k, v in enumerate(i):
        kd.insert(pos[v], k)
    kd.balance()
    return round(min(kd.find(pos[v])[2] for v in t) * 1000, 1)


def ladda(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path), merge_vertices=True)
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    mesh = next(o for o in bpy.context.scene.objects if o.type == "MESH" and o.find_armature() == arm)
    return arm, mesh


def prova(path):
    arm, mesh = ladda(path)
    vila(arm)
    rest, _ = _hud(mesh)
    rep = {"docka": Path(path).name}
    for side in SIDES:
        fingers, hand = fingrarnas_horn(mesh, side)
        edges = _kanter(mesh, hand)
        r = {"fingrarnas_horn": {d: int(len(v)) for d, v in fingers.items()}, "vila": matt(mesh, side, rest, fingers, edges)}
        vila(arm); knyt(arm, side, 60)
        r["knuten_60"] = matt(mesh, side, rest, fingers, edges)
        vila(arm); n = nyp(arm, side)
        n.update(matt(mesh, side, rest, fingers, edges, par=[("Thumb", "Index"), ("Index", "Middle")]))
        n["glapp_tumme_pekfinger_mm"] = glapp(mesh, side, fingers)
        r["nyp"] = n
        vila(arm)
        rep[side] = r
    return rep


if __name__ == "__main__":
    a = sys.argv[sys.argv.index("--") + 1:]
    rep = prova(Path(a[0]).resolve())
    Path(a[1]).write_text(json.dumps(rep, indent=1, ensure_ascii=False), encoding="utf-8")
    print("PROV", json.dumps(rep, ensure_ascii=False))
