"""Fingerben för A-pose: samma metod som fingerrigg.fit_fingers, men varje hand vrids först
in i T-posens kanoniska läge (handen längs ±X, handflatan nedåt) kring handleden, fingerkedjorna
anpassas där och vrids sedan tillbaka. Körs i Blender:
  blender -b --python pipeline/bygg_fingrar_apose.py -- riggad.glb avatar-rigg.glb
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

import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

import fingerrigg
from fingerrigg import DIGITS, hand_chains, influences, smoothstep, world_vertices


def _rot_y(side, d):
    """Rotation kring Blenders Y (framåtaxeln) som för (side,0,0) till d (projicerad i XZ)."""
    d = np.array([d[0], 0.0, d[2]]); d /= np.linalg.norm(d)
    a = np.arctan2(d[2], d[0] * side)  # vinkel från ±X mot +Z
    a = a * side
    c, s = np.cos(a), np.sin(a)
    # Rotation kring +Y med vinkel -a i Blender (x,z)-planet: R @ (side,0,0) = d
    R = np.array([[c, 0, -s], [0, 1, 0], [s, 0, c]])
    if np.linalg.norm(R @ np.array([side, 0, 0]) - d) > 1e-6:
        R = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    assert np.linalg.norm(R @ np.array([side, 0, 0]) - d) < 1e-6
    return R


RAPPORT = {}


def fit_fingers(arm, mesh):
    xyz_world = world_vertices(mesh)
    slots = {i for i, s in enumerate(mesh.material_slots) if s.name.casefold().startswith("handpar")}
    vertices = np.unique([v for p in mesh.data.polygons if p.material_index in slots for v in p.vertices])
    if len(vertices) < 200:
        raise ValueError("Den separata handytan saknas i den riggade GLB-filen.")
    arm_inverse = arm.matrix_world.inverted_safe()
    plans = []
    for tag, side in (("Right", -1), ("Left", 1)):
        palm = next(b for b in arm.data.bones if b.name.split(":")[-1] == tag + "Hand")
        indices = vertices[side * xyz_world[vertices, 0] > 0]
        wrist = np.array(arm.matrix_world @ palm.head_local)
        # Handens längdriktning: från handleden till handytans tyngdpunkt.
        d = xyz_world[indices].mean(0) - wrist
        R = _rot_y(side, d)
        xyz = (xyz_world - wrist) @ R + wrist  # kanoniskt T-läge för den här sidan
        chains = hand_chains(xyz[indices], side)
        chains_world = (chains - wrist) @ R.T + wrist
        RAPPORT[tag] = {"handvinkel_under_horisontal_grader": round(float(np.degrees(np.arcsin(-d[2] / np.linalg.norm(d)))), 1)}
        plans.append((palm.name, [b.name for b in palm.children_recursive], indices, chains_world, R, wrist, xyz))
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for name, old, _, chains, R, wrist, _ in plans:
        for child in reversed(old):
            arm.data.edit_bones.remove(arm.data.edit_bones[child])
        palm = arm.data.edit_bones[name]
        palm.tail = arm_inverse @ Vector(chains[2, 0])
        up = Vector(R @ np.array([0.0, 0.0, 1.0]))
        for digit, chain in zip(DIGITS, chains):
            parent = palm
            for j in range(3):
                bone = arm.data.edit_bones.new(name + digit + str(j + 1))
                bone.head = arm_inverse @ Vector(chain[j])
                bone.tail = arm_inverse @ Vector(chain[j + 1])
                bone.parent = parent
                bone.use_connect = j > 0
                bone.align_roll(arm_inverse.to_3x3() @ up)
                parent = bone
    bpy.ops.object.mode_set(mode="OBJECT")
    for name, old, indices, chains, R, wrist_pt, xyz in plans:
        palm = mesh.vertex_groups[name]
        forearm = mesh.vertex_groups[name.replace("Hand", "ForeArm")]
        side = -1 if name.endswith("RightHand") else 1
        wrist_x = side * wrist_pt[0]
        hand_length = np.ptp(xyz[indices, 0])
        outward = side * xyz[:, 0]
        wrist_mix = smoothstep(0.5 + (outward - wrist_x) / (0.31 * hand_length))
        # Bara hörn nära den här armen räknas (i A-pose når låren annars samma "utåt"-intervall).
        near_arm = np.linalg.norm(xyz[:, [1, 2]] - wrist_pt[[1, 2]], axis=1) < 0.9 * hand_length
        old_groups = {g.index for g in mesh.vertex_groups if g.name in old}
        for vert in mesh.data.vertices:
            previous = sum(g.weight for g in vert.groups if g.group in old_groups)
            if previous:
                palm.add([vert.index], previous, "ADD")
        for child in old:
            if child in mesh.vertex_groups:
                mesh.vertex_groups.remove(mesh.vertex_groups[child])
        handles = [palm, *(mesh.vertex_groups.new(name=name + digit + str(j)) for digit in DIGITS for j in (1, 2, 3)),
                   forearm]
        band = np.flatnonzero((outward > wrist_x - 0.24 * hand_length)
                              & (outward < outward[indices].min() + 0.08 * hand_length) & near_arm)
        for group in list(mesh.vertex_groups):
            group.remove(band.tolist())
        for vert in band:
            palm.add([int(vert)], float(wrist_mix[vert]), "REPLACE")
            forearm.add([int(vert)], float(1 - wrist_mix[vert]), "REPLACE")
        for group in list(mesh.vertex_groups):
            group.remove(indices.tolist())
        weights = influences(xyz_world_of(mesh)[indices], chains)
        weights = np.column_stack((weights, weights[:, 0] * (1 - wrist_mix[indices])))
        weights[:, 0] *= wrist_mix[indices]
        for vert, w in zip(indices, weights):
            strongest = np.argsort(w)[-4:]
            total = w[strongest].sum()
            for j in strongest:
                if w[j] > 0:
                    handles[j].add([int(vert)], float(w[j] / total), "REPLACE")
        xyzw = xyz_world_of(mesh)
        near = np.flatnonzero(np.linalg.norm(xyzw - wrist_pt, axis=1) < 0.44 * hand_length)
        positions = np.rint(xyzw[near] * 1e6).astype(np.int64)
        order = np.lexsort(positions.T)
        runs = np.r_[0, np.flatnonzero((np.diff(positions[order], axis=0) != 0).any(axis=1)) + 1, len(near)]
        for first, last in zip(runs, runs[1:]):
            if last - first < 2:
                continue
            ids = near[order[first:last]].tolist()
            totals = {}
            for i in ids:
                for g in mesh.data.vertices[i].groups:
                    totals[g.group] = totals.get(g.group, 0) + g.weight
            for group_id in totals:
                mesh.vertex_groups[group_id].remove(ids)
            strongest = sorted(totals, key=totals.get, reverse=True)[:4]
            total = sum(totals[i] for i in strongest)
            for group_id in strongest:
                mesh.vertex_groups[group_id].add(ids, totals[group_id] / total, "REPLACE")
    bpy.context.view_layer.update()


_cache = {}


def xyz_world_of(mesh):
    if mesh.name not in _cache:
        _cache[mesh.name] = world_vertices(mesh)
    return _cache[mesh.name]
