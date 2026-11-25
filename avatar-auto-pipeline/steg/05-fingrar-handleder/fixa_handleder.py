"""Lokal avsmalning av den uppblåsta handledshuden på den riggade A-pose-avataren.

Orsak: montera.attach() skalade donatorhandens handledsöppning till skjortmanschettens
ytterdiameter. Här smalnas bara Handpar- och Skarvar-hörnen av mot naturlig
handledstjocklek och tucks in under manschetten. Ben, vikter, UV och 4K-texturer orörda.

blender -b --python pipeline/fixa_handleder.py -- avatar-rigg.glb utmapp

Generell: mäter skarven och den naturliga handleden per sida på riggens egna ben (Meshy riggar
alltid till 1,8 m, så millimetergränserna gäller oavsett persons proportioner) och smalnar bara av.
"""
import bpy, sys, json, math
import numpy as np
from mathutils import Vector
from pathlib import Path

a = sys.argv[sys.argv.index("--") + 1:]
src, out = map(Path, a[:2])
out.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "OPTIX"
    prefs.get_devices()
    optix_devs = [d for d in prefs.devices if d.type == "OPTIX"]
    if optix_devs:
        for d in prefs.devices:
            d.use = d in optix_devs
        sc.cycles.device = "GPU"
except Exception:
    sc.cycles.device = "CPU"
sc.cycles.samples = 32
sc.cycles.use_denoising = True
sc.view_settings.view_transform = "AgX"
w = bpy.data.worlds.new("W")
sc.world = w
w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.32, 0.36, 0.38, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
for name, loc, power, size in (
    ("Key", (-2.2, -3.0, 2.6), 900, 2.0),
    ("Fill", (2.6, -2.4, 1.6), 350, 2.5),
    ("Rim", (0.5, 3.0, 2.8), 500, 1.5),
):
    L = bpy.data.lights.new(name, "AREA")
    L.energy = power
    L.size = size
    o = bpy.data.objects.new(name, L)
    sc.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector((0, 0, 1.2)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()

bpy.ops.import_scene.gltf(filepath=str(src))
arm = next(o for o in sc.objects if o.type == "ARMATURE")
mesh = next(o for o in sc.objects if o.type == "MESH" and o.find_armature() == arm)
for o in sc.objects:
    if o.type == "MESH" and o is not mesh:
        o.hide_render = True
        o.hide_viewport = True

bones = {b.name.split(":")[-1]: b for b in arm.data.bones}
mw = arm.matrix_world
mm = np.array(mesh.matrix_world)
R, t = mm[:3, :3], mm[:3, 3]
inv = np.linalg.inv(mm)

co = np.empty((len(mesh.data.vertices), 3), dtype=np.float64)
mesh.data.vertices.foreach_get("co", co.ravel())
world = co @ R.T + t
original = world.copy()

nmat = max(len(mesh.data.materials), 1)
mat_names = [m.name if m else f"slot{i}" for i, m in enumerate(mesh.data.materials)]
votes = np.zeros((len(world), nmat), dtype=np.int32)
mesh.data.calc_loop_triangles()
tris = np.empty((len(mesh.data.loop_triangles), 3), dtype=np.int32)
mat_idx = np.empty(len(mesh.data.loop_triangles), dtype=np.int32)
mesh.data.loop_triangles.foreach_get("vertices", tris.ravel())
mesh.data.loop_triangles.foreach_get("material_index", mat_idx)
for tri, mi in zip(tris, mat_idx):
    votes[tri, mi] += 1
vert_mat = votes.argmax(axis=1)
vert_mat[votes.sum(axis=1) == 0] = -1
tri_is_body = np.array([mat_names[i].startswith("Kropp") if i >= 0 else False for i in mat_idx])
tri_is_seam = np.array([mat_names[i].startswith("Skarvar") if i >= 0 else False for i in mat_idx])
touches_body = np.zeros(len(world), dtype=bool)
touches_seam = np.zeros(len(world), dtype=bool)
if tri_is_body.any():
    touches_body[tris[tri_is_body]] = True
if tri_is_seam.any():
    touches_seam[tris[tri_is_seam]] = True
is_hand = np.array([mat_names[i].startswith("Handpar") if i >= 0 else False for i in vert_mat])
is_seam = np.array([mat_names[i].startswith("Skarvar") if i >= 0 else False for i in vert_mat])
is_body = np.array([mat_names[i].startswith("Kropp") if i >= 0 else False for i in vert_mat])
# Flytta ALDRIG hörn som delas med Kropp-manschetten (annars rivs sågtandshål i ärmslutet).
editable = (is_hand | is_seam) & ~touches_body

# UV + basfärg så vi kan hitta det vita manschetffodret (Kropp-textur).
uvs = np.zeros((len(world), 2), dtype=np.float64)
uv_count = np.zeros(len(world), dtype=np.int32)
uv_layer = mesh.data.uv_layers.active
if uv_layer:
    for loop in mesh.data.loops:
        uvs[loop.vertex_index] += uv_layer.data[loop.index].uv
        uv_count[loop.vertex_index] += 1
    hit = uv_count > 0
    uvs[hit] /= uv_count[hit][:, None]

colors = np.full((len(world), 3), np.nan)
for i, mat in enumerate(mesh.data.materials):
    if not mat or not mat.node_tree:
        continue
    imgs = [n.image for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image]
    if not imgs:
        continue
    img = next((im for im in imgs if im.name.endswith(" 1") or "Color" in im.name), None)
    if img is None:
        img = max(imgs, key=lambda im: im.size[0] * im.size[1])
    mask = vert_mat == i
    if not mask.any():
        continue
    wimg, himg = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(himg, wimg, img.channels)
    u = np.clip(np.mod(uvs[mask, 0], 1.0), 0, 1 - 1e-6)
    v = np.clip(np.mod(uvs[mask, 1], 1.0), 0, 1 - 1e-6)
    x = (u * wimg).astype(np.int32)
    y = (v * himg).astype(np.int32)
    colors[mask] = px[y, x, :3]
lum = np.nanmean(colors, axis=1)
is_white = (
    np.isfinite(lum)
    & (lum > 0.48)
    & (np.abs(colors[:, 0] - colors[:, 2]) < 0.20)
    & (colors[:, 1] > 0.40)
    & ~(colors[:, 0] > colors[:, 2] + 0.08)
)
print("VITA_HORN", int(np.nansum(is_white)), "KROPP_VITA", int(np.sum(is_body & is_white)))


def bone_head(name):
    return np.array(mw @ bones[name].head_local, dtype=np.float64)


def smoothstep(x):
    t = np.clip(x, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def slice_stats(along, radial_uv, mask, a0, a1, step=0.003):
    rows = []
    for a in np.arange(a0, a1, step):
        m = mask & (along >= a) & (along < a + step)
        if m.sum() < 8:
            continue
        uv = radial_uv[m]
        rows.append((a + step / 2, uv.mean(0), np.ptp(uv[:, 0]), np.ptp(uv[:, 1]), int(m.sum())))
    return rows


def profile_rows(along, radial, radial_uv, mask, a0, a1, step=0.004):
    out_rows = []
    for a in np.arange(a0, a1, step):
        m = mask & (along >= a) & (along < a + step)
        if m.sum() < 8:
            continue
        uv = radial_uv[m]
        out_rows.append({
            "along_mm": round(float((a + step / 2) * 1000), 1),
            "n": int(m.sum()),
            "radie_median_mm": round(float(np.median(radial[m]) * 1000), 2),
            "bredd_mm": round(float(np.ptp(uv[:, 0]) * 1000), 2),
            "tjocklek_mm": round(float(np.ptp(uv[:, 1]) * 1000), 2),
        })
    return out_rows


report = {"kalla": str(src), "sidor": {}}
new_world = world.copy()
look_at = {}

for side, sign in (("Left", 1), ("Right", -1)):
    hand = bone_head(side + "Hand")
    elbow = bone_head(side + "ForeArm")
    axis = hand - elbow
    axis = axis / np.linalg.norm(axis)
    rel = world - hand
    along = rel @ axis
    e1 = np.cross(axis, np.array([0.0, 0.0, 1.0]))
    if np.linalg.norm(e1) < 1e-6:
        e1 = np.cross(axis, np.array([1.0, 0.0, 0.0]))
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(axis, e1)
    e2 /= np.linalg.norm(e2)
    # Begränsa till den här armen så inte bålen räknas med.
    radial_vec = rel - np.outer(along, axis)
    radial = np.linalg.norm(radial_vec, axis=1)
    arm_near = (along > -0.12) & (along < 0.22) & (radial < 0.10)

    seam_along = along[is_seam & arm_near]
    hand_along = along[is_hand & arm_near]
    if len(seam_along) < 20 or len(hand_along) < 50:
        raise SystemExit(f"{side}: hittar inte skarv/hand ({len(seam_along)} skarv, {len(hand_along)} hand)")
    seam = float(np.median(seam_along))
    # Naturlig handled: smalaste Handpar-tvärsnittet 15–50 mm utanför skarven, innan handflatan vidgas.
    cand = []
    for a in np.arange(seam + 0.015, seam + 0.055, 0.003):
        m = is_hand & arm_near & (along >= a) & (along < a + 0.003)
        if m.sum() < 20:
            continue
        uv = np.column_stack((radial_vec[m] @ e1, radial_vec[m] @ e2))
        cand.append((a + 0.0015, np.ptp(uv[:, 0]), np.ptp(uv[:, 1]), int(m.sum())))
    if not cand:
        raise SystemExit(f"{side}: hittar ingen naturlig handledszon")
    # Välj minsta bredd (inte första slumpträffen).
    natural, nat_w, nat_t, nat_n = min(cand, key=lambda r: r[1] + 0.35 * r[2])
    # Lite extra smalt så den går in rent under manschetten, men inte unsunt smal.
    target_w = nat_w * 0.98
    target_t = nat_t * 0.98

    # Hitta manschettkanten där Kropp möter Skarvar så att övergången börjar mjukt från 0 där.
    cuff_rim = touches_body & touches_seam & arm_near
    rim_along = float(np.median(along[cuff_rim])) if cuff_rim.any() else seam
    a_start = rim_along + 0.001
    a0 = max(seam + 0.005, rim_along + 0.006)
    a1 = natural
    ramp_in = smoothstep((along - a_start) / max(a0 - a_start, 1e-4))
    ramp_out = 1.0 - smoothstep((along - a0) / max(a1 - a0, 1e-4))
    w_shrink = np.where(along <= a_start, 0.0, np.where(along <= a0, ramp_in, np.where(along < a1, ramp_out, 0.0)))
    # Dra bara in Handpar milt (2.5 mm) så inget sticker ut genom manschettväggen.
    w_tuck = np.where(
        (along > rim_along + 0.003) & (along < seam + 0.026) & ~touches_seam,
        1.0 - smoothstep((along - (rim_along + 0.003)) / 0.023),
        0.0,
    )

    move = editable & arm_near & ((w_shrink > 1e-4) | (w_tuck > 1e-4))
    # Skala mot skivans eget centrum så axeln inte glider i sidled.
    uv = np.column_stack((radial_vec @ e1, radial_vec @ e2))
    # Per-hörn: interpolera aktuell skivbredd från närliggande hand/skarv-hörn.
    band = editable & arm_near & (along > seam - 0.03) & (along < a1 + 0.01)
    step = 0.003
    slices = []
    for a in np.arange(seam - 0.02, a1 + 0.006, step):
        m = band & (along >= a) & (along < a + step)
        if m.sum() < 8:
            continue
        slices.append((a + step / 2, uv[m].mean(0), np.ptp(uv[m, 0]), np.ptp(uv[m, 1])))
    if len(slices) < 3:
        raise SystemExit(f"{side}: för få skivor att skala ({len(slices)})")
    sa = np.array([s[0] for s in slices])
    scn = np.array([s[1] for s in slices])
    sw = np.array([s[2] for s in slices])
    st = np.array([s[3] for s in slices])

    def lerp_at(x, xp, fp):
        return np.interp(x, xp, fp)

    cen = np.column_stack((lerp_at(along, sa, scn[:, 0]), lerp_at(along, sa, scn[:, 1])))
    cur_w = np.clip(lerp_at(along, sa, sw), 1e-4, None)
    cur_t = np.clip(lerp_at(along, sa, st), 1e-4, None)
    sx = 1.0 + w_shrink * (target_w / cur_w - 1.0)
    sy = 1.0 + w_shrink * (target_t / cur_t - 1.0)
    # Begränsa så vi aldrig blåser upp, bara smalnar av.
    sx = np.minimum(sx, 1.0)
    sy = np.minimum(sy, 1.0)

    new_uv = cen + (uv - cen) * np.column_stack((sx, sy))
    tucked_along = np.maximum(along - 0.0025 * w_tuck, rim_along + 0.001)
    shifted = (
        hand
        + np.outer(tucked_along, axis)
        + np.outer(new_uv[:, 0], e1)
        + np.outer(new_uv[:, 1], e2)
    )
    new_world[move] = shifted[move]

    # Vitt manschettfoder vid ärmslutet: tucks in i ärmen så den uppblåsta
    # vita kanten försvinner under den blå manschetten i stället för att synas som en ring.
    # Ljust manschettfoder (varmvit/ljus insida) — inte den mörkblå tygytan (lum ~0.18).
    sat = np.nanmax(colors, axis=1) - np.nanmin(colors, axis=1)
    lining = is_body & ~touches_seam & arm_near & np.isfinite(lum) & (lum > 0.72) & (sat < 0.12) & (along > seam - 0.045) & (along < seam + 0.020) & (radial < 0.085)
    w_lin = 1.0 - smoothstep(np.abs(along - seam) / 0.032)
    w_lin = np.where(lining, np.clip(w_lin, 0, 1), 0.0)
    lin_move = lining & (w_lin > 1e-4)
    if lin_move.any():
        new_along = along - 0.018 * w_lin
        new_scale = 1.0 - 0.10 * w_lin
        lining_pos = hand + np.outer(new_along, axis) + radial_vec * new_scale[:, None]
        new_world[lin_move] = lining_pos[lin_move]
    n_lin = int(lin_move.sum()) if lin_move.any() else 0

    # Mät efteråt
    rel2 = new_world - hand
    along2 = rel2 @ axis
    rad2_vec = rel2 - np.outer(along2, axis)
    rad2 = np.linalg.norm(rad2_vec, axis=1)
    uv2 = np.column_stack((rad2_vec @ e1, rad2_vec @ e2))
    report["sidor"][side] = {
        "skarv_mm": round(seam * 1000, 1),
        "naturlig_handled_mm": round(natural * 1000, 1),
        "mal_bredd_mm": round(target_w * 1000, 2),
        "mal_tjocklek_mm": round(target_t * 1000, 2),
        "naturlig_bredd_mm": round(nat_w * 1000, 2),
        "naturlig_tjocklek_mm": round(nat_t * 1000, 2),
        "horn_flyttade": int(move.sum()),
        "foder_horn_flyttade": n_lin,
        "max_flytt_mm": round(float(np.linalg.norm(new_world[move] - world[move], axis=1).max()) * 1000, 2),
        "fore": profile_rows(along, radial, uv, editable & arm_near, seam - 0.02, a1 + 0.02),
        "efter": profile_rows(along2, rad2, uv2, editable & arm_near, seam - 0.03, a1 + 0.02),
    }
    # Kameramål: manschettkant + handled, lite ut från armens framsida.
    cuff = hand + axis * seam
    look_at[side] = {
        "center": cuff + axis * 0.025,
        "axis": axis,
        "e1": e1,
        "e2": e2,
        "sign": sign,
    }

# Skriv tillbaka till meshen
local = (np.c_[new_world, np.ones(len(new_world))] @ inv.T)[:, :3]
mesh.data.vertices.foreach_set("co", local.astype(np.float32).ravel())
mesh.data.update()
# Uppdatera normaler så normalmapparna fortfarande ligger rätt i belysningen.
bpy.context.view_layer.objects.active = mesh
mesh.select_set(True)
bpy.ops.object.shade_smooth()
try:
    mesh.data.calc_normals()
except Exception:
    pass
mesh.data.update()

# --- Kameror och före/efter-bilder ---
# Före-bilderna renderas från en kopia av originalkoordinaterna via shape? Enklare:
# vi har redan flyttat meshen. Därför renderade vi inte före först.
# Lösning: spara efter-koordinater, skriv tillbaka original, rendera före, skriv efter, rendera efter.
after_local = local.copy()
before_local = (np.c_[original, np.ones(len(original))] @ inv.T)[:, :3]

cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.type = "PERSP"
cam.data.lens = 85
tgt = bpy.data.objects.new("T", None)
sc.collection.objects.link(tgt)
tc = cam.constraints.new("TRACK_TO")
tc.target = tgt
tc.track_axis = "TRACK_NEGATIVE_Z"
tc.up_axis = "UP_Y"
sc.render.resolution_x = 1000
sc.render.resolution_y = 1000
sc.render.image_settings.file_format = "PNG"
sc.render.film_transparent = False


def set_coords(arr):
    mesh.data.vertices.foreach_set("co", arr.astype(np.float32).ravel())
    mesh.data.update()
    bpy.context.view_layer.update()


def aim_wrist(side):
    info = look_at[side]
    c = Vector(info["center"].tolist())
    axis = Vector(info["axis"].tolist())
    # 3/4 bakifrån/utifrån, som den befintliga närbilden: lite från sidan och framför.
    # e1 pekar ungefär horisontellt i tvärsnittet. Välj en vy mot ryggsidan av handen.
    side_vec = Vector(info["e1"].tolist()) * (1.0 if side == "Left" else -1.0)
    up = Vector((0, 0, 1))
    # Kameran står snett framför handleden, lite utåt och lite ovanför.
    offset = -axis * 0.08 + side_vec * 0.16 + Vector((0, -0.28, 0.10))
    # Justera så vi faktiskt tittar på handledens baksida.
    cam.location = c + offset
    tgt.location = c
    bpy.context.view_layer.update()


def shot(name):
    sc.render.filepath = str(out / name)
    bpy.ops.render.render(write_still=True)


# Före
set_coords(before_local)
for side, fn in (("Left", "fore-vanster.png"), ("Right", "fore-hoger.png")):
    aim_wrist(side)
    shot(fn)

# Efter
set_coords(after_local)
for side, fn in (("Left", "efter-vanster.png"), ("Right", "efter-hoger.png")):
    aim_wrist(side)
    shot(fn)

# Exportera fixad rigg (vila, inga animationer) med samma inställningar som dealer-exporten.
arm.select_set(True)
mesh.select_set(True)
bpy.context.view_layer.objects.active = arm
glb = out / "avatar-rigg-handledfix.glb"
bpy.ops.export_scene.gltf(
    filepath=str(glb),
    export_format="GLB",
    use_selection=True,
    export_animations=False,
    export_image_format="AUTO",
)
report["ut_glb"] = str(glb)
report["ut_bytes"] = glb.stat().st_size
(out / "fix.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
print("FIX", json.dumps({k: report[k] for k in report if k != "sidor"} | {
    "sidor": {s: {k: v[k] for k in v if k not in ("fore", "efter")} for s, v in report["sidor"].items()}
}, ensure_ascii=False))
