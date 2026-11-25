"""Prepare the high-detail donor mesh in Blender, retaining per-corner UVs."""

import hashlib
import json
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix


def prepare(source, config, out, target=245000):
    # bpy initializes Blender's bundled bmesh module in standalone Python.
    import bmesh

    if not bpy.app.background:
        raise RuntimeError("Run in a disposable background Blender process")
    if hashlib.sha256(source.read_bytes()).hexdigest() != config["donor_sha256"]:
        raise ValueError("The fitted transform belongs to a different donor GLB")
    transform = np.array(config["matrix"])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source), merge_vertices=True)
    obj = next(o for o in bpy.context.scene.objects if o.type == "MESH")
    b2g = np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1.0]], float)
    obj.data.transform(Matrix((b2g.T @ transform @ b2g).tolist()) @ obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.bisect_plane(
        bm,
        geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
        dist=1e-8,
        plane_co=(0, 0, 0.675),
        plane_no=(0, -0.4, 1),
        clear_inner=True,
    )
    before = len(bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    print("Cropped donor faces", before, flush=True)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("Head detail budget", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = min(1.0, target / before)
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mesh = obj.data
    mesh.calc_loop_triangles()
    coords = np.empty((len(mesh.vertices), 3), np.float32)
    mesh.vertices.foreach_get("co", coords.ravel())
    loop_ids = np.empty(len(mesh.loops), np.int32)
    mesh.loops.foreach_get("vertex_index", loop_ids)
    normals = np.empty((len(mesh.loops), 3), np.float32)
    mesh.corner_normals.foreach_get("vector", normals.ravel())
    uv = np.empty((len(mesh.loops), 2), np.float32)
    mesh.uv_layers.active.uv.foreach_get("vector", uv.ravel())
    uv[:, 1] = 1 - uv[:, 1]
    # glTF permits one UV and normal per vertex. Split at UV/normal seams only.
    keys = np.column_stack([loop_ids, uv.view(np.int32), normals.view(np.int32)])
    _, first, remap = np.unique(keys, axis=0, return_index=True, return_inverse=True)
    triangles = np.empty((len(mesh.loop_triangles), 3), np.int32)
    mesh.loop_triangles.foreach_get("loops", triangles.ravel())
    pos = coords[loop_ids[first]] @ b2g[:3, :3].T
    nor = normals[first] @ b2g[:3, :3].T
    np.savez_compressed(
        out,
        pos=pos.astype("f4"),
        nor=nor.astype("f4"),
        uv=uv[first],
        faces=remap[triangles].astype("u4"),
        body_sha256=config["body_sha256"],
        donor_sha256=config["donor_sha256"],
    )
    print("Prepared", len(triangles), "triangles", len(first), "glTF vertices", flush=True)


if __name__ == "__main__":
    source, config, out = sys.argv[1:4]
    prepare(Path(source), json.loads(Path(config).read_text(encoding="utf8")), Path(out))
