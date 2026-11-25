"""Rensa hals och huvud från axel- och armvikter i en Mixamo-rigg (körs i Blender).

Meshys automatiska riggning lägger ofta största delen av halsbasens hud på nyckelbenen
(LeftShoulder/RightShoulder) och nästan inget på Neck. När armarna fälls ner drar
nyckelbenen då ut halsens sidor till breda flikar. Steget nedan är generellt och mäts
mot riggens egna benpositioner:

1. Innanför halsens radie och ovanför bröstkorgen tas axel- och armvikter bort mjukt
   och flyttas till Spine2 (nedtill) och Neck (upptill).
2. Mellan Neck och Head byggs en mjuk övergång, så halsen böjs utan skarv. Haka och
   ansikte framför halsen behåller sina huvudvikter.
3. Alla vikter normaliseras till summan 1.
"""

import numpy as np

STRIP = ("LeftShoulder", "RightShoulder", "LeftArm", "RightArm")


def _smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def rensa_halsvikter(arm, model):
    bones = {b.name.split(":")[-1]: b for b in arm.data.bones}
    need = ("Spine2", "Neck", "Head", *STRIP)
    if any(n not in bones for n in need):
        return {"hoppade_over": "saknar ben: " + ", ".join(n for n in need if n not in bones)}
    world = np.array(arm.matrix_world)

    def head(name):
        return (world @ np.r_[np.array(bones[name].head_local), 1.0])[:3]

    spine2, neck, skull = head("Spine2"), head("Neck"), head("Head")
    span = abs(head("LeftArm")[0] - head("RightArm")[0])
    r_in, r_out = 0.17 * span, 0.34 * span
    groups = {}
    for name in need:
        full = bones[name].name
        group = model.vertex_groups.get(full) or model.vertex_groups.new(name=full)
        groups[name] = group.index
    index_name = {v: k for k, v in groups.items()}
    strip_ids = {groups[n] for n in STRIP}

    m = np.array(model.matrix_world)
    co = np.empty((len(model.data.vertices), 3), np.float64)
    model.data.vertices.foreach_get("co", co.ravel())
    pos = co @ m[:3, :3].T + m[:3, 3]

    lateral = np.abs(pos[:, 0] - neck[0])
    inside = 1 - _smooth((lateral - r_in) / (r_out - r_in))
    rise = _smooth((pos[:, 2] - spine2[2]) / (0.5 * (neck[2] - spine2[2])))
    strip = inside * rise
    to_neck = _smooth((pos[:, 2] - spine2[2]) / (neck[2] - spine2[2]))
    top = skull[2] + 0.35 * (skull[2] - neck[2])
    head_share = _smooth((pos[:, 2] - neck[2]) / (top - neck[2]))
    face = (pos[:, 1] < neck[1] - 0.6 * r_in) & (pos[:, 2] > neck[2])
    candidates = np.flatnonzero((strip > 1e-4) | ((pos[:, 2] < top) & (lateral < r_out)))

    moved = 0.0
    changed = 0
    for i in candidates:
        vertex = model.data.vertices[int(i)]
        weights = {g.group: g.weight for g in vertex.groups if g.weight > 0}
        if not weights:
            continue
        before = dict(weights)
        removed = 0.0
        for gid in list(weights):
            if gid in strip_ids:
                cut = weights[gid] * strip[i]
                weights[gid] -= cut
                removed += cut
        if removed > 0:
            weights[groups["Neck"]] = weights.get(groups["Neck"], 0) + removed * to_neck[i]
            weights[groups["Spine2"]] = weights.get(groups["Spine2"], 0) + removed * (1 - to_neck[i])
            moved += removed
        if lateral[i] < r_out and not face[i] and pos[i, 2] < top:
            h, n = weights.get(groups["Head"], 0.0), weights.get(groups["Neck"], 0.0)
            total = h + n
            if total > 0:
                blend = inside[i]
                weights[groups["Head"]] = (1 - blend) * h + blend * total * head_share[i]
                weights[groups["Neck"]] = (1 - blend) * n + blend * total * (1 - head_share[i])
        weights = {g: w for g, w in weights.items() if w > 1e-4}
        total = sum(weights.values())
        weights = {g: w / total for g, w in weights.items()}
        if any(abs(weights.get(g, 0) - before.get(g, 0)) > 1e-5 for g in set(weights) | set(before)):
            changed += 1
            for g in set(before) - set(weights):
                model.vertex_groups[g].remove([int(i)])
            for g, w in weights.items():
                model.vertex_groups[g].add([int(i)], float(w), "REPLACE")
    return {
        "andrade_horn": changed,
        "flyttad_axelvikt": round(float(moved), 2),
        "halsradie_m": [round(float(r_in), 4), round(float(r_out), 4)],
        "grupper": {index_name[g]: g for g in groups.values()},
    }


def halsrapport(arm, model):
    """Andel av vikterna per ben i halsbandet, för före/efter-mätning."""
    bones = {b.name.split(":")[-1]: b for b in arm.data.bones}
    world = np.array(arm.matrix_world)
    neck = (world @ np.r_[np.array(bones["Neck"].head_local), 1.0])[:3]
    skull = (world @ np.r_[np.array(bones["Head"].head_local), 1.0])[:3]
    m = np.array(model.matrix_world)
    co = np.empty((len(model.data.vertices), 3), np.float64)
    model.data.vertices.foreach_get("co", co.ravel())
    pos = co @ m[:3, :3].T + m[:3, 3]
    names = {g.index: g.name.split(":")[-1] for g in model.vertex_groups}
    report = {}
    for label, lo, hi in (("halsbas", neck[2] - 0.04, neck[2] + 0.02), ("ovre_hals", neck[2] + 0.02, skull[2])):
        sel = np.flatnonzero((pos[:, 2] > lo) & (pos[:, 2] < hi) & (np.abs(pos[:, 0] - neck[0]) < 0.12))
        total = {}
        for i in sel:
            for g in model.data.vertices[int(i)].groups:
                total[names[g.group]] = total.get(names[g.group], 0) + g.weight
        s = sum(total.values()) or 1
        report[label] = {k: round(v / s, 3) for k, v in sorted(total.items(), key=lambda kv: -kv[1])[:6]}
    return report


def flytta_axelleder(arm, model, max_flytt=0.08):
    """Flytta överarmens led (LeftArm/RightArm) till det anatomiska axelledsläget.

    Meshys rigg lägger ofta överarmens led långt ut i ärmen. När armen fälls ner står
    då axelpartiet kvar som en bred hylla ("Hulk-axlar"). Leden placeras här vid
    armhålans insida, mätt mot bålens bredd strax under armen, och i armens höjdcentrum.
    Viloposen ändras bara för skelettet; ytan ligger kvar exakt där den var.
    """
    import bpy
    from mathutils import Vector

    bones = {b.name.split(":")[-1]: b for b in arm.data.bones}
    if any(side + part not in bones for side in ("Left", "Right") for part in ("Arm", "Shoulder")):
        return {"hoppade_over": True}
    world = np.array(arm.matrix_world)
    inverse = np.linalg.inv(world)
    m = np.array(model.matrix_world)
    co = np.empty((len(model.data.vertices), 3), np.float64)
    model.data.vertices.foreach_get("co", co.ravel())
    pos = co @ m[:3, :3].T + m[:3, 3]
    targets, report = {}, {}
    for side, sign in (("Left", 1), ("Right", -1)):
        joint = (world @ np.r_[np.array(bones[side + "Arm"].head_local), 1.0])[:3]
        lateral = (pos[:, 0] - 0.0) * sign
        # Bröstkorgens sida under armhålan (14–20 cm under leden), där T-posens armhålsväv
        # inte längre är med. Leden ska ligga strax innanför bålens kant.
        chest = pos[(pos[:, 2] < joint[2] - 0.14) & (pos[:, 2] > joint[2] - 0.20) & (lateral > 0)
                    & (lateral < abs(joint[0]))]
        if len(chest) < 20:
            continue
        torso = np.percentile(chest[:, 0] * sign, 98)
        x = torso - 0.025
        slab = pos[(np.abs(pos[:, 0] * sign - x) < 0.012) & (np.abs(pos[:, 2] - joint[2]) < 0.12)]
        if len(slab) < 20:
            continue
        z = (np.percentile(slab[:, 2], 5) + np.percentile(slab[:, 2], 95)) / 2
        y = (np.percentile(slab[:, 1], 5) + np.percentile(slab[:, 1], 95)) / 2
        target = np.array([x * sign, y, z])
        shift = target - joint
        if np.linalg.norm(shift) > max_flytt:
            shift *= max_flytt / np.linalg.norm(shift)
        if np.linalg.norm(shift) < 0.003:
            continue
        targets[bones[side + "Arm"].name] = joint + shift
        report[side] = {"fran_m": np.round(joint, 3).tolist(), "till_m": np.round(joint + shift, 3).tolist(),
                        "flytt_mm": round(float(np.linalg.norm(shift) * 1000), 1)}
    if not targets:
        return report
    view = bpy.context.view_layer
    previous = view.objects.active
    for obj in view.objects:
        obj.select_set(False)
    arm.select_set(True)
    view.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for name, target in targets.items():
        local = (inverse @ np.r_[target, 1.0])[:3]
        edit = arm.data.edit_bones[name]
        tail = edit.tail.copy()
        edit.head = Vector(local)
        edit.tail = tail  # underarmens led ligger kvar
        if edit.parent is not None and not edit.use_connect:
            edit.parent.tail = Vector(local)
    bpy.ops.object.mode_set(mode="OBJECT")
    view.objects.active = previous
    return report
