"""Export the lightweight body rig with fitted, weighted phalanges on all ten fingers."""

import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Quaternion

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fingerrigg import DIGITS, fit_fingers, world_vertices
from viktrensning import flytta_axelleder, halsrapport, rensa_halsvikter


def verify(rig):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(rig), merge_vertices=True)
    (arm,) = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    (model,) = [
        obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.find_armature() == arm
    ]
    rest = world_vertices(model, evaluated=True)
    bones = {bone.name.split(":")[-1]: bone for bone in arm.pose.bones}
    finger_names = [
        side + "Hand" + digit + str(j) for side in ("Right", "Left") for digit in DIGITS for j in (1, 2, 3)
    ]
    body_names = [
        "Spine",
        "Neck",
        "Head",
        *(
            side + part
            for side in ("Right", "Left")
            for part in ("Arm", "ForeArm", "Hand", "UpLeg", "Leg", "Foot")
        ),
    ]
    selected = {model.vertex_groups[bones[n].name].index: [] for n in finger_names + body_names}
    max_error = 0.0
    for vertex in model.data.vertices:
        max_error = max(max_error, abs(sum(g.weight for g in vertex.groups) - 1))
        for g in vertex.groups:
            if g.group in selected and g.weight > 0.05:
                selected[g.group].append(vertex.index)
    if max_error > 0.002:
        raise ValueError(f"Onormaliserade eller saknade hudvikter. Största fel {max_error}.")
    movements = {}
    for n in finger_names + body_names:
        bone = bones[n]
        indices = selected[model.vertex_groups[bone.name].index]
        scope = "direct"
        if not indices and n in body_names:
            descendants = {
                model.vertex_groups[b.name].index
                for b in bone.children_recursive
                if b.name in model.vertex_groups
            }
            indices = [
                v.index
                for v in model.data.vertices
                if any(g.group in descendants and g.weight > 0.05 for g in v.groups)
            ]
            scope = "descendants"
        if not indices:
            raise ValueError("Tom viktgrupp för " + n)
        bone.rotation_mode = "QUATERNION"
        initial = bone.rotation_quaternion.copy()
        bone.rotation_quaternion = initial @ Quaternion((1, 0, 0), math.radians(12))
        bpy.context.view_layer.update()
        moved = world_vertices(model, evaluated=True)[indices] - rest[indices]
        motion = float(1000 * np.linalg.norm(moved, axis=1).max())
        if motion < 0.05:
            raise ValueError("Leden flyttar inte sin yta: " + n)
        bone.rotation_quaternion = initial
        bpy.context.view_layer.update()
        movements[n] = {
            "vertices_over_5pct": len(indices),
            "weight_scope": scope,
            "maximum_motion_mm": round(motion, 3),
        }
    return_error = float(1000 * np.linalg.norm(world_vertices(model, evaluated=True) - rest, axis=1).max())
    if return_error > 0.01:
        raise ValueError("Riggen återgår inte till viloposen.")
    record = {
        "bones": len(arm.data.bones),
        "tested_finger_bones": len(finger_names),
        "test_angle_degrees": 12,
        "maximum_return_error_mm": return_error,
        "maximum_weight_sum_error": max_error,
        "deformation_tests": movements,
    }
    rig.with_name("hudvikter.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf8")


def soften_avatar_materials(model):
    # Keep the generated detail in the green roughness channel. The original
    # hand atlas is almost uniformly 0.48 and gives skin a hard plastic highlight.
    for slot in model.material_slots:
        material = slot.material
        shader = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
        shader.inputs["IOR"].default_value = 1.4
        shader.inputs["Specular IOR Level"].default_value = 0.26
        for link in list(shader.inputs["Metallic"].links):
            material.node_tree.links.remove(link)
        shader.inputs["Metallic"].default_value = 0.0
        rough = shader.inputs["Roughness"]
        if not rough.is_linked:
            rough.default_value = max(float(rough.default_value), 0.65)
            continue
        separate = rough.links[0].from_node
        source = next(
            (
                link.from_node
                for socket in separate.inputs
                for link in socket.links
                if link.from_node.type == "TEX_IMAGE"
            ),
            None,
        )
        if source is None:
            raise ValueError("Kan inte läsa materialets råhetskarta för " + material.name)
        image = source.image
        pixels = np.empty(len(image.pixels), np.float32)
        image.pixels.foreach_get(pixels)
        green = pixels[1::4]
        np.maximum(green, 0.46 + 0.40 * green, out=green)
        pixels[2::4] = 0.0
        image.pixels.foreach_set(pixels)
        image.update()
        image.pack()


def export(source, output):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source), merge_vertices=True)
    (arm,) = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    (model,) = [
        obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.find_armature() == arm
    ]
    fit_fingers(arm, model)
    neck_before = halsrapport(arm, model)
    neck_fix = rensa_halsvikter(arm, model)
    neck_fix.update(fore=neck_before, efter=halsrapport(arm, model))
    neck_fix["axelleder"] = flytta_axelleder(arm, model)
    output.with_name("halsvikter.json").write_text(json.dumps(neck_fix, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    soften_avatar_materials(model)
    used = {g.group for v in model.data.vertices for g in v.groups if g.weight > 0.01}
    bones = {bone.name.split(":")[-1]: bone for bone in arm.pose.bones}
    fingers = [
        bones[side + "Hand" + digit + str(n)]
        for side in ("Right", "Left")
        for digit in DIGITS
        for n in (1, 2, 3)
    ]
    for bone in fingers:
        if model.vertex_groups[bone.name].index not in used:
            raise ValueError(f"Inga hudvikter för {bone.name}.")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (arm, model):
        obj.select_set(True)
    temp = output.with_name(output.stem + ".partial.glb")
    bpy.ops.export_scene.gltf(
        filepath=str(temp),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_image_format="AUTO",
    )
    temp.replace(output)
    print(f"{len(fingers)} viktade fingerben, {len(arm.data.bones)} ben totalt.")
    verify(output)


if __name__ == "__main__":
    source, output = sys.argv[sys.argv.index("--") + 1 :]
    export(Path(source).resolve(), Path(output).resolve())
