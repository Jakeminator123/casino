"""Platta till avslitet brösthår mot den rena skjortytan och byt dess UV till rent skjorttyg (raderar ingen geometri)."""
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
src, dst = Path(args[0]).resolve(), Path(args[1]).resolve()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(src), merge_vertices=True)
obj = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
mesh = obj.data

mat = obj.data.materials[0]
img = None
for n in mat.node_tree.nodes:
    if n.type == "TEX_IMAGE" and n.image:
        if any(lnk.to_socket.name == "Base Color" for out in n.outputs for lnk in out.links):
            img = n.image
            break
if img is None:
    imgs = [n.image for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image]
    img = max(imgs, key=lambda im: im.size[0] * im.size[1])

w_img, h_img, ch = img.size[0], img.size[1], img.channels
buf = np.empty(w_img * h_img * ch, dtype=np.float32)
img.pixels.foreach_get(buf)
px = buf.reshape(h_img, w_img, ch)[:, :, :3]
if img.colorspace_settings.name.lower() == "linear":
    srgb_img = np.where(px <= 0.0031308, px * 12.92, 1.055 * (np.clip(px, 0, 1) ** (1.0 / 2.4)) - 0.055)
else:
    srgb_img = px

n_verts = len(mesh.vertices)
co = np.empty((n_verts, 3), dtype=np.float64)
mesh.vertices.foreach_get("co", co.ravel())

lo, hi = co.min(axis=0), co.max(axis=0)
H = hi[2] - lo[2]
f_z = (co[:, 2] - lo[2]) / H
feet = co[f_z < 0.06]
y_front_sign = -1.0 if len(feet) > 20 and abs(feet[:, 1].min()) >= abs(feet[:, 1].max()) else 1.0

# Sampla sRGB per loop så UV-sömmar aldrig snedvrids
n_loops = len(mesh.loops)
loop_v = np.empty(n_loops, dtype=np.int32)
loop_uv = np.empty(n_loops * 2, dtype=np.float32)
mesh.loops.foreach_get("vertex_index", loop_v)
mesh.uv_layers.active.data.foreach_get("uv", loop_uv)
loop_uv = loop_uv.reshape(n_loops, 2)

ux_l = np.clip((np.mod(loop_uv[:, 0], 1.0) * w_img).astype(int), 0, w_img - 1)
uy_l = np.clip((np.mod(loop_uv[:, 1], 1.0) * h_img).astype(int), 0, h_img - 1)
l_srgb = srgb_img[uy_l, ux_l]

# Aggregera per hörn (sRGB från första/median-loopen, samt om någon loop är hår/hud)
v_srgb = np.zeros((n_verts, 3), dtype=np.float64)
v_cnt = np.zeros(n_verts, dtype=np.int32)
np.add.at(v_srgb, loop_v, l_srgb)
np.add.at(v_cnt, loop_v, 1)
v_srgb[v_cnt > 0] /= v_cnt[v_cnt > 0][:, None]

l_skin = (l_srgb[:, 0] > l_srgb[:, 2] + 0.06) & (l_srgb[:, 0] > 0.56)
l_hair = (l_srgb[:, 0] > l_srgb[:, 2] + 0.03) & (l_srgb[:, 0] > 0.08) & (l_srgb[:, 0] <= 0.56) & ~l_skin
skin_v = np.zeros(n_verts, dtype=bool)
hair_v = np.zeros(n_verts, dtype=bool)
np.logical_or.at(skin_v, loop_v, l_skin)
np.logical_or.at(hair_v, loop_v, l_hair)
hair_v &= ~skin_v

shirt_zone = (f_z > 0.60) & (f_z < 0.74) & (np.abs(co[:, 0]) < 0.14 * H) & ~skin_v & ~hair_v
skip = shirt_zone.sum() < 150
if not skip:
    shirt_srgb = np.median(v_srgb[shirt_zone], axis=0)
    if shirt_srgb[0] > shirt_srgb[2] + 0.04:
        skip = True

if skip:
    print("CLEAN_CHEST skipped")
    dst.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(dst), export_format="GLB", export_animations=False)
    raise SystemExit(0)

far_shirt = np.linalg.norm(v_srgb - shirt_srgb, axis=1) > 0.06
y_fwd = co[:, 1] * y_front_sign
chest_hair_all = hair_v & far_shirt & (f_z > 0.70) & (f_z < 0.855) & (np.abs(co[:, 0]) < 0.17 * H) & (y_fwd > 0.020 * H)

n_neg = int((chest_hair_all & (co[:, 0] < -0.005 * H)).sum())
n_pos = int((chest_hair_all & (co[:, 0] > 0.005 * H)).sum())
if max(n_neg, n_pos) < 150:
    print("CLEAN_CHEST skipped")
    dst.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(dst), export_format="GLB", export_animations=False)
    raise SystemExit(0)

hair_sign = -1.0 if n_neg >= n_pos else 1.0
chest_hair = chest_hair_all & (co[:, 0] * hair_sign > 0.005 * H)
ch_pts = np.flatnonzero(chest_hair)
print(f"CLEAN_CHEST flatten+reUV side={'right(x<0)' if hair_sign < 0 else 'left(x>0)'} verts={len(ch_pts)} shirt_srgb={np.round(shirt_srgb, 3).tolist()}")

clean_front = (f_z > 0.68) & (f_z < 0.855) & (co[:, 0] * hair_sign < -0.004 * H) & (np.abs(co[:, 0]) < 0.19 * H) & (y_fwd > 0.015 * H) & ~hair_v & ~skin_v & ~far_shirt
n_polys = len(mesh.polygons)
p_verts = np.empty(n_polys * 3, dtype=np.int32)
mesh.polygons.foreach_get("vertices", p_verts)
p_verts = p_verts.reshape(n_polys, 3)

clean_tri_idx = np.flatnonzero(clean_front[p_verts].all(axis=1))
if len(clean_tri_idx) > 0:
    tri_cols = v_srgb[p_verts[clean_tri_idx]].mean(axis=1)
    best_ti = clean_tri_idx[int(np.argmin(np.linalg.norm(tri_cols - shirt_srgb, axis=1)))]
    poly_obj = mesh.polygons[best_ti]
    clean_uv_center = np.mean([np.array(mesh.uv_layers.active.data[li].uv) for li in poly_obj.loop_indices], axis=0)
else:
    sz_idx = np.flatnonzero(shirt_zone)
    best_v = sz_idx[int(np.argmin(np.linalg.norm(v_srgb[sz_idx] - shirt_srgb, axis=1)))]
    clean_uv_center = loop_uv[np.flatnonzero(loop_v == best_v)[0]]
px_chk = srgb_img[int((clean_uv_center[1] % 1.0) * h_img), int((clean_uv_center[0] % 1.0) * w_img)]
print(f"CLEAN_CHEST clean_uv_center={np.round(clean_uv_center, 4).tolist()} srgb={np.round(px_chk, 3).tolist()}")

ref_xz = np.column_stack((-co[clean_front, 0], co[clean_front, 2]))
ref_y = co[clean_front, 1]

# Hitta alla hörn som antingen är hår-färgade ELLER sticker ut > 4 mm framför speglade rena bröstet i samma zon!
cand_mask = (f_z > 0.70) & (f_z < 0.855) & (co[:, 0] * hair_sign > 0.005 * H) & (np.abs(co[:, 0]) < 0.18 * H) & (y_fwd > 0.015 * H) & ~skin_v
cand_idx = np.flatnonzero(cand_mask)

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
uv_lay = bm.loops.layers.uv.active

curl_verts = {bm.verts[i] for i in ch_pts}
# Lägg också till utstickande mörka veck i samma (x, f_z)-område (> 4 mm framför rena skjortytan)
for i in cand_idx:
    v = bm.verts[i]
    if v in curl_verts:
        continue
    d2 = (ref_xz[:, 0] - v.co.x) ** 2 + (ref_xz[:, 1] - v.co.z) ** 2
    k = np.argpartition(d2, min(8, len(d2) - 1))[:8]
    w = 1.0 / (np.sqrt(d2[k]) + 1e-4)
    y_mir = float((ref_y[k] * w).sum() / w.sum())
    if v.co.y * y_front_sign > y_mir * y_front_sign + 0.004 * H:
        curl_verts.add(v)

# Expandera 3 ringar på bröstet så mörka veck och randen följer med
for _ in range(3):
    nbrs = {vv for v in curl_verts for e in v.link_edges for vv in e.verts
            if vv not in curl_verts and not skin_v[vv.index] and 0.69 < f_z[vv.index] < 0.855 and y_fwd[vv.index] > 0.015 * H and vv.co.x * hair_sign > 0.003 * H}
    curl_verts |= nbrs
curl_list = list(curl_verts)
curl_faces = list({f for v in curl_verts for f in v.link_faces})

# 1. Tryck ner hela locken exakt mot rena speglade bröstytan
for v in curl_list:
    d2 = (ref_xz[:, 0] - v.co.x) ** 2 + (ref_xz[:, 1] - v.co.z) ** 2
    k = np.argpartition(d2, min(8, len(d2) - 1))[:8]
    w = 1.0 / (np.sqrt(d2[k]) + 1e-4)
    y_mir = float((ref_y[k] * w).sum() / w.sum())
    if v.co.y * y_front_sign > y_mir * y_front_sign:
        v.co.y = y_mir

for _ in range(25):
    bmesh.ops.smooth_vert(bm, verts=curl_list, factor=0.55, use_axis_x=True, use_axis_y=True, use_axis_z=True)

# 2. Tryck bakåtriktade veck-hörn 2 mm inåt så framsidan ligger slät utan Z-fighting
bm.normal_update()
for v in curl_list:
    if (v.normal.y * y_front_sign) < -0.15:
        v.co.y -= 0.002 * y_front_sign

# 3. Ge ALLA loopar på hårlockens faces ren skjort-UV (tar bort både brun färg & 4K-hår-normalmap!)
for f in curl_faces:
    if all(not skin_v[v.index] for v in f.verts):
        for loop in f.loops:
            du = (loop.vert.co.x / H) * 0.015
            dv = ((loop.vert.co.z - lo[2]) / H - 0.76) * 0.015
            loop[uv_lay].uv = (float(clean_uv_center[0] + du), float(clean_uv_center[1] + dv))

bm.normal_update()
bm.to_mesh(mesh)
bm.free()
mesh.update()

dst.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(dst), export_format="GLB", export_animations=False)
print(f"CLEAN_CHEST saved {dst} (smoothed {len(curl_list)} verts, reUV {len(curl_faces)} faces)")
