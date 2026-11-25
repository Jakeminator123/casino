"""Fit five three-joint chains to each spread, palm-down hand of the modular T-pose."""

import bpy
import numpy as np
from mathutils import Vector

DIGITS = ("Thumb", "Index", "Middle", "Ring", "Pinky")


def world_vertices(obj, evaluated=False):
    source = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()) if evaluated else obj
    points = np.empty((len(source.data.vertices), 3), np.float32)
    source.data.vertices.foreach_get("co", points.ravel())
    transform = np.array(source.matrix_world)
    return points @ transform[:3, :3].T + transform[:3, 3]


def tips_in_silhouette(cloud):
    # Outward coordinate spans 0..1. Angles sweep across the fingers from thumb to pinky.
    palm = cloud[np.abs(cloud[:, 0] - 0.32) < 0.025]
    origin = np.array([0.32, (palm[:, 1].min() + palm[:, 1].max()) / 2])
    radial = cloud[:, :2] - origin
    length = np.linalg.norm(radial, axis=1)
    angle = np.degrees(np.arctan2(radial[:, 1], radial[:, 0]))
    degrees = np.arange(-110, 111)
    bin_id = np.rint(angle).astype(int) - degrees[0]
    inside = (bin_id >= 0) & (bin_id < len(degrees))
    envelope = np.zeros(len(degrees))
    np.maximum.at(envelope, bin_id[inside], length[inside])
    occupied = envelope > 0
    envelope = np.interp(degrees, degrees[occupied], envelope[occupied])
    smooth = np.convolve(np.pad(envelope, 2, mode="edge"), np.ones(5) / 5, mode="valid")
    candidates = [
        i
        for i in range(1, len(smooth) - 1)
        if smooth[i] >= smooth[i - 1] and smooth[i] > smooth[i + 1] and smooth[i] > 0.33
    ]
    ranked = []
    for i in candidates:
        left = next((j for j in range(i - 1, -1, -1) if smooth[j] > smooth[i]), 0)
        right = next((j for j in range(i + 1, len(smooth)) if smooth[j] > smooth[i]), len(smooth) - 1)
        prominence = smooth[i] - max(smooth[left : i + 1].min(), smooth[i : right + 1].min())
        if prominence > 0.026:
            ranked.append((prominence, i))
    peaks = sorted(i for _, i in sorted(ranked, reverse=True)[:5])
    if len(peaks) != 5 or min(np.diff(peaks)) < 6:
        raise ValueError(
            "Högerhandsreferensen måste visa fem särade fingrar. Kontrollera handens GLB ovanifrån."
        )
    tips = []
    for i in peaks:
        part = np.abs(angle - degrees[i]) <= 4
        cap = part & (length > length[part].max() - 0.016)
        tips.append(cloud[cap].mean(axis=0))
    return np.array(tips)


def hand_chains(points, side):
    local = points.copy()
    local[:, 0] *= side
    start = local[:, 0].min()
    extent = np.ptp(local[:, 0])
    wrist = local[local[:, 0] < start + 0.04 * extent]
    origin = (wrist.max(0) + wrist.min(0)) / 2
    origin[0] = start
    local = (local - origin) / extent
    tips = tips_in_silhouette(local)
    chains = []
    for digit, tip in zip(DIGITS, tips):
        if digit == "Thumb":
            base = np.array([0.15, 0.29 * tip[1]])
        else:
            base = np.array([0.46 if digit == "Pinky" else 0.50, 0.76 * tip[1]])
        joints = []
        for fraction in (0, 0.45, 0.76):
            xy = base + fraction * (tip[:2] - base)
            dist = np.linalg.norm(local[:, :2] - xy, axis=1)
            sample = local[dist < max(0.032, np.partition(dist, 12)[12] + 0.001)]
            z = np.mean(np.quantile(sample[:, 2], (0.08, 0.92)))
            joints.append([*xy, z])
        chain = np.array([*joints, tip]) * extent + origin
        chain[:, 0] *= side
        chains.append(chain)
    return np.array(chains)


def smoothstep(t):
    x = np.clip(t, 0, 1)
    return x * x * (3 - 2 * x)


def influences(points, chains):
    distance, along = [], []
    lengths = np.linalg.norm(np.diff(chains, axis=1), axis=2)
    for chain, span in zip(chains, lengths):
        vectors = np.diff(chain, axis=0)
        offset = points[:, None, :] - chain[None, :-1, :]
        projections = (offset * vectors).sum(axis=2) / span**2
        closest = offset - np.clip(projections, 0, 1)[:, :, None] * vectors
        cost = np.linalg.norm(closest, axis=2)
        best = cost.argmin(axis=1)
        row = np.arange(len(points))
        distance.append(cost[row, best])
        along.append(np.r_[0, np.cumsum(span)[:-1]][best] + projections[row, best] * span[best])
    distance = np.array(distance).T
    # Inside a web, two digits influence the same skin. A hard Voronoi border stretches it.
    sigma = np.median(lengths[:, 0]) * 0.15
    squared = distance**2
    affinity = np.exp(-(squared - squared.min(axis=1, keepdims=True)) / (2 * sigma**2))
    affinity /= affinity.sum(axis=1, keepdims=True)
    weights = np.zeros((len(points), 16))
    for i, span in enumerate(lengths):
        gates = [
            smoothstep(0.5 + (along[i] - center) / width)
            for center, width in zip(np.r_[0, np.cumsum(span)[:-1]], span * [0.9, 1.1, 1.0])
        ]
        envelope = 1 - smoothstep((distance[:, i] / span[0] - 0.40) / 0.42)
        groups = np.column_stack((gates[0] - gates[1], gates[1] - gates[2], gates[2]))
        weights[:, 1 + 3 * i : 4 + 3 * i] = groups * (affinity[:, i] * envelope)[:, None]
    weights[:, 0] = 1 - weights[:, 1:].sum(axis=1)
    return weights


def fit_fingers(arm, mesh):
    xyz = world_vertices(mesh)
    slots = {i for i, s in enumerate(mesh.material_slots) if s.name.casefold().startswith("handpar")}
    vertices = np.unique([v for p in mesh.data.polygons if p.material_index in slots for v in p.vertices])
    if len(vertices) < 200:
        raise ValueError("Den separata handytan saknas i den riggade GLB-filen.")
    arm_inverse = arm.matrix_world.inverted_safe()
    plans = []
    for tag, side in (("Right", -1), ("Left", 1)):
        palm = next(b for b in arm.data.bones if b.name.split(":")[-1] == tag + "Hand")
        indices = vertices[side * xyz[vertices, 0] > 0]
        plans.append(
            (palm.name, [b.name for b in palm.children_recursive], indices, hand_chains(xyz[indices], side))
        )
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for name, old, _, chains in plans:
        for child in reversed(old):
            arm.data.edit_bones.remove(arm.data.edit_bones[child])
        palm = arm.data.edit_bones[name]
        palm.tail = arm_inverse @ Vector(chains[2, 0])
        for digit, chain in zip(DIGITS, chains):
            parent = palm
            for j in range(3):
                bone = arm.data.edit_bones.new(name + digit + str(j + 1))
                bone.head = arm_inverse @ Vector(chain[j])
                bone.tail = arm_inverse @ Vector(chain[j + 1])
                bone.parent = parent
                bone.use_connect = j > 0
                bone.align_roll(arm_inverse.to_3x3() @ Vector((0, 0, 1)))
                parent = bone
    bpy.ops.object.mode_set(mode="OBJECT")
    for name, old, indices, chains in plans:
        palm = mesh.vertex_groups[name]
        forearm = mesh.vertex_groups[name.replace("Hand", "ForeArm")]
        side = -1 if name.endswith("RightHand") else 1
        wrist_x = side * (arm.matrix_world @ arm.data.bones[name].head_local).x
        hand_length = np.ptp(xyz[indices, 0])
        outward = side * xyz[:, 0]
        wrist_mix = smoothstep(0.5 + (outward - wrist_x) / (0.31 * hand_length))
        old_groups = {g.index for g in mesh.vertex_groups if g.name in old}
        # Preserve old influences at the seam by moving obsolete finger weights onto the palm.
        for vert in mesh.data.vertices:
            previous = sum(g.weight for g in vert.groups if g.group in old_groups)
            if previous:
                palm.add([vert.index], previous, "ADD")
        for child in old:
            if child in mesh.vertex_groups:
                mesh.vertex_groups.remove(mesh.vertex_groups[child])
        handles = [
            palm,
            *(mesh.vertex_groups.new(name=name + digit + str(j)) for digit in DIGITS for j in (1, 2, 3)),
            forearm,
        ]
        # Equal rest positions on different material/UV islands must follow the same wrist rotation.
        band = np.flatnonzero(
            (outward > wrist_x - 0.24 * hand_length)
            & (outward < outward[indices].min() + 0.08 * hand_length)
        )
        for group in list(mesh.vertex_groups):
            group.remove(band.tolist())
        for vert in band:
            palm.add([int(vert)], float(wrist_mix[vert]), "REPLACE")
            forearm.add([int(vert)], float(1 - wrist_mix[vert]), "REPLACE")
        for group in list(mesh.vertex_groups):
            group.remove(indices.tolist())
        weights = influences(xyz[indices], chains)
        weights = np.column_stack((weights, weights[:, 0] * (1 - wrist_mix[indices])))
        weights[:, 0] *= wrist_mix[indices]
        for vert, w in zip(indices, weights):
            strongest = np.argsort(w)[-4:]
            total = w[strongest].sum()
            for j in strongest:
                if w[j] > 0:
                    handles[j].add([int(vert)], float(w[j] / total), "REPLACE")
        # Meshy's forearm weights may also disagree across a UV split outside the cut itself.
        wrist = np.array(arm.matrix_world @ arm.data.bones[name].head_local)
        near = np.flatnonzero(np.linalg.norm(xyz - wrist, axis=1) < 0.44 * hand_length)
        positions = np.rint(xyz[near] * 1e6).astype(np.int64)
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
