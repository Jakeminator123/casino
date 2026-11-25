"""Naturlig sittande dealer-rörelse för en dealer-GLB från auto_avatar (A-pose, Mixamo-ben, fingrar).

blender -b --python pipeline/animera_dealer.py -- dealer.glb utmapp namn [sekunder=6] [samples=48] [preview|film]

Ger <namn>-apose-med-rorelse.glb (bakad rörelse, öppnas direkt), <namn>-ror-sig.mp4 (1280×720, 24 fps)
och strip/ med sex rutor. Rörelsekurvorna är skrivna för 8 s och skalas till vald längd.
"""
import bpy, sys, math, json, subprocess, shutil
import numpy as np
from mathutils import Vector, Matrix, Euler
from pathlib import Path

a = sys.argv[sys.argv.index("--") + 1:]
src, out, NAME = Path(a[0]), Path(a[1]), a[2]
SECONDS = float(a[3]) if len(a) > 3 else 6.0
SAMPLES = int(a[4]) if len(a) > 4 else 48
mode = a[5] if len(a) > 5 else "film"
out.mkdir(parents=True, exist_ok=True)
assert mode in ("preview", "film")

FPS = 24
FRAMES = int(round(SECONDS * FPS))
TS = 8.0 / SECONDS  # kurvorna nedan är definierade över 8 s
STRIP = sorted({1, *[int(round(1 + i * (FRAMES - 1) / 5)) for i in range(1, 6)]})

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
sc.cycles.samples = SAMPLES if mode == "film" else min(SAMPLES, 32)
sc.cycles.use_denoising = True
try:
    if sc.cycles.device == "GPU":
        sc.cycles.denoiser = "OPTIX"
except Exception:
    pass
sc.view_settings.view_transform = "AgX"
sc.render.fps = FPS
sc.frame_start = 1
sc.frame_end = FRAMES
sc.render.resolution_x = 1280
sc.render.resolution_y = 720
sc.render.image_settings.file_format = "PNG"
sc.render.film_transparent = False
sc.render.use_persistent_data = True

# Varm studiomiljö
w = bpy.data.worlds.new("W")
sc.world = w
w.use_nodes = True
bg = w.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.42, 0.36, 0.30, 1)
bg.inputs[1].default_value = 0.45
for name, loc, power, size, col in (
    ("Key", (-2.0, -3.2, 2.5), 850, 2.2, (1.00, 0.92, 0.80)),
    ("Fill", (2.8, -2.2, 1.5), 280, 2.8, (0.95, 0.93, 0.98)),
    ("Rim", (0.4, 3.2, 2.6), 420, 1.6, (1.00, 0.95, 0.88)),
):
    L = bpy.data.lights.new(name, "AREA")
    L.energy = power
    L.size = size
    L.color = col
    o = bpy.data.objects.new(name, L)
    sc.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector((0, 0, 1.05)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()

bpy.ops.import_scene.gltf(filepath=str(src))
arm = next(o for o in sc.objects if o.type == "ARMATURE")
meshes = [o for o in sc.objects if o.type == "MESH" and o.find_armature() == arm]
for o in list(sc.objects):
    if o.type == "MESH" and o not in meshes:
        o.hide_render = True
mesh = meshes[0]
bones = {b.name.split(":")[-1]: b.name for b in arm.data.bones}
# dealer-GLB har 'neck' i stället för 'Neck'
if "neck" in bones and "Neck" not in bones:
    bones["Neck"] = bones["neck"]


def P(n):
    return arm.pose.bones[bones[n]]

# Keyframa i quaternion så glTF får rena rotationsspår.
for pb in arm.pose.bones:
    pb.rotation_mode = "QUATERNION"


def upd():
    bpy.context.view_layer.update()


def W(n):
    return arm.matrix_world @ P(n).head


def verts():
    dg = bpy.context.evaluated_depsgraph_get()
    out_ = []
    for o in meshes:
        e = o.evaluated_get(dg)
        me = e.to_mesh()
        m = np.array(o.matrix_world)
        co = np.empty((len(me.vertices), 3))
        me.vertices.foreach_get("co", co.ravel())
        out_.append(co @ m[:3, :3].T + m[:3, 3])
        e.to_mesh_clear()
    return np.vstack(out_)


def aim(n, t):
    pb = P(n)
    head = pb.head.copy()
    d = (pb.tail - pb.head).normalized()
    q = d.rotation_difference(Vector(t).normalized())
    pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ pb.matrix
    upd()


bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="POSE")
# Sittande dealerhållning (samma som sittande.py)
aim("Spine", (0, -0.10, 1))
aim("Spine1", (0, -0.08, 1))
aim("Spine2", (0, -0.04, 1))
aim("Neck", (0, -0.02, 1))
aim("Head", (0, 0.03, 1))
for side, s in (("Left", 1), ("Right", -1)):
    aim(side + "UpLeg", (s * 0.10, -1, -0.04))
    aim(side + "Leg", (0, 0.12, -1))
    aim(side + "Foot", (0, -1, -0.45))
    aim(side + "Arm", (s * 0.22, -0.80, -0.62))
    aim(side + "ForeArm", (-s * 0.22, -1, -0.12))
    aim(side + "Hand", (-s * 0.18, -1, -0.22))
    for dg in ("Thumb", "Index", "Middle", "Ring", "Pinky"):
        for j, k in ((1, 0.25), (2, 0.55), (3, 0.75)):
            n = f"{side}Hand{dg}{j}"
            if n in bones:
                pb = P(n)
                d = (pb.tail - pb.head).normalized()
                aim(n, d + Vector((0, 0, -k)) * (0.6 if dg == "Thumb" else 1))
bpy.ops.object.mode_set(mode="OBJECT")
upd()

p = verts()
hips = np.array(W("Hips"))
pelvis = p[(np.abs(p[:, 0] - hips[0]) < 0.18) & (p[:, 1] > hips[1] - 0.12) & (p[:, 2] < hips[2] + 0.05)]
seat_z = 0.50
arm.location.z += seat_z - float(pelvis[:, 2].min())
upd()
p = verts()
hand_ids = {}
for side in ("Left", "Right"):
    vg = [g for g in mesh.vertex_groups if g.name.split(":")[-1].startswith(side + "Hand")]
    idx = {x.index for x in vg}
    ids = {v.index for v in mesh.data.vertices for g in v.groups if g.group in idx and g.weight > 0.3}
    hand_ids[side] = np.array(sorted(ids))
hands = np.vstack([p[hand_ids[s]] for s in hand_ids])
table_z = float(hands[:, 2].min()) - 0.003
torso = p[(p[:, 2] > hips[2] + 0.15) & (p[:, 2] < hips[2] + 0.45) & (np.abs(p[:, 0]) < 0.2)]
front_y = float(torso[:, 1].min()) - 0.03


def box(name, loc, dim, color, rough=0.6):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = dim
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    o.data.materials.append(m)
    return o


box("Bord filt", (0.05, front_y - 0.50, table_z - 0.02), (2.2, 1.3, 0.04), (0.012, 0.10, 0.04), 0.95)
box("Bordskant", (0, front_y - 1.10, table_z - 0.01), (1.8, 0.06, 0.06), (0.16, 0.08, 0.04), 0.4)
box("Pall sits", (hips[0], hips[1] + 0.03, seat_z - 0.03), (0.42, 0.40, 0.06), (0.10, 0.09, 0.08), 0.5)
box("Pall ben", (hips[0], hips[1] + 0.03, (seat_z - 0.06) / 2), (0.06, 0.06, seat_z - 0.06), (0.18, 0.16, 0.14), 0.3)
box("Golv", (0, -0.3, -0.01), (8, 8, 0.02), (0.09, 0.08, 0.07), 0.85)
box("Bakgrund", (0, 1.8, 1.4), (8, 0.06, 3.6), (0.20, 0.16, 0.13), 0.95)
mid = p[hand_ids["Right"]]
tipc = mid[np.argmin(mid[:, 1])]
bpy.ops.mesh.primitive_plane_add(size=1, location=(float(tipc[0]) + 0.02, float(tipc[1]) + 0.06, table_z + 0.0005))
card = bpy.context.object
card.name = "Kort"
card.scale = (0.063, 0.088, 1)
cm = bpy.data.materials.new("Kort")
cm.use_nodes = True
cm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.93, 0.93, 0.90, 1)
card.data.materials.append(cm)

# Snapshot av sittandes vilopose (matrix_basis)
sit = {pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones}

# IK-mål för högerhandens dealer-gest (bakas till benrörelse före GLB-export).
rh_rest = (arm.matrix_world @ P("RightHand").head).copy()
ik_tgt = bpy.data.objects.new("IK-hogerhand", None)
sc.collection.objects.link(ik_tgt)
ik_tgt.empty_display_size = 0.04
ik_tgt.location = rh_rest
# Kortets plats som gestens riktning
card_loc = Vector(card.location)
peak = rh_rest + Vector((0.03, -0.10, 0.14))
# Dra lite mot kortet
peak = peak.lerp(Vector((card_loc.x, card_loc.y, rh_rest.z + 0.09)), 0.35)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="POSE")
ik = P("RightHand").constraints.new("IK")
ik.target = ik_tgt
ik.chain_count = 3
ik.use_rotation = False
bpy.ops.object.mode_set(mode="OBJECT")
upd()

# Hitta ett bra lokalt böjled för fingrarna: testa vilken axel som flyttar
# fingertoppen mest mot handflatan när vi lägger på en liten rotation.
curl_axis = {}
palm_n = (P("RightHand").tail - P("RightHand").head).normalized()
# Ungefärlig handflatenormal: korsprodukt av handens längd och "åt tummen"
try:
    thumb = (P("RightHandThumb3").tail - P("RightHand").head).normalized()
    palm_n = (P("RightHand").tail - P("RightHand").head).cross(thumb).normalized()
except Exception:
    palm_n = Vector((0, -1, 0))
for side in ("Left", "Right"):
    for dg in ("Thumb", "Index", "Middle", "Ring", "Pinky"):
        for j in (1, 2, 3):
            n = f"{side}Hand{dg}{j}"
            if n not in bones:
                continue
            pb = P(n)
            base = sit[pb.name].copy()
            tip0 = pb.tail.copy()
            best = ("X", 1.0, 0.0)
            for ax in ("X", "Y", "Z"):
                for sgn in (1.0, -1.0):
                    pb.matrix_basis = base @ Matrix.Rotation(math.radians(20 * sgn), 4, ax)
                    upd()
                    tip = pb.tail.copy()
                    # Vill böja in mot handflatan / inåt (negativ Z ungefär).
                    score = (tip0 - tip).z  # fingertoppen sjunker = bra grepp/böj vid sittande
                    if score > best[2]:
                        best = (ax, sgn, score)
            pb.matrix_basis = base
            curl_axis[n] = (best[0], best[1])
upd()


def envelope(t, points):
    if t <= points[0][0]:
        return points[0][1]
    if t >= points[-1][0]:
        return points[-1][1]
    for (t0, v0), (t1, v1) in zip(points, points[1:]):
        if t0 <= t <= t1:
            u = 0 if t1 <= t0 else (t - t0) / (t1 - t0)
            u = u * u * (3 - 2 * u)
            return v0 + (v1 - v0) * u
    return points[-1][1]


def add_rot(name, rx=0, ry=0, rz=0):
    pb = P(name)
    extra = Euler((math.radians(rx), math.radians(ry), math.radians(rz)), "XYZ").to_matrix().to_4x4()
    pb.matrix_basis = sit[pb.name] @ extra


def add_curl(name, deg):
    if name not in curl_axis:
        return
    ax, sgn = curl_axis[name]
    pb = P(name)
    pb.matrix_basis = sit[pb.name] @ Matrix.Rotation(math.radians(deg * sgn), 4, ax)


def pose_at(frame):
    t = (frame - 1) / FPS * TS
    breath = 0.5 * (1 - math.cos(2 * math.pi * t / 4.0))
    # Huvud: tittar in i kameran, vänder mot "spelarna" höger/vänster, mjuk nick.
    yaw = envelope(t, [
        (0.0, -4.0), (1.3, -2.0), (2.6, 14.0), (3.6, 12.0),
        (4.7, -3.0), (5.7, -14.0), (6.7, -11.0), (8.0, -3.5),
    ])
    pitch = envelope(t, [
        (0.0, 3.0), (1.4, 4.0), (2.4, 6.0), (3.4, 3.0),
        (4.5, 8.0), (5.3, 3.5), (6.5, 5.0), (8.0, 3.0),
    ])
    # Andning + lätt dealerlutning
    add_rot("Spine", rx=-1.0 * breath, rz=0.4 * math.sin(2 * math.pi * t / 8.0))
    add_rot("Spine1", rx=-1.2 * breath)
    add_rot("Spine2", rx=-1.8 * breath, ry=yaw * 0.08)
    add_rot("Neck", rx=pitch * 0.35 - 0.6 * breath, ry=yaw * 0.35)
    add_rot("Head", rx=pitch * 0.65, ry=yaw * 0.65)
    # Axlar följer andningen mjukt, utan att kollapsa
    add_rot("LeftShoulder", rx=-1.2 * breath, rz=0.8 * breath)
    add_rot("RightShoulder", rx=-1.2 * breath, rz=-0.8 * breath)

    # Höger hand: lyfter i en lugn dealer-gest och sveper mot kortet.
    gest = envelope(t, [
        (0.0, 0.0), (2.0, 0.0), (3.3, 0.45), (4.4, 1.0),
        (5.4, 0.85), (6.6, 0.25), (8.0, 0.05),
    ])
    # Vänster arm vilar, andas bara lite.
    add_rot("LeftArm", rx=-1.0 * breath, ry=0.4)
    add_rot("LeftForeArm", rx=0.6 * breath)
    add_rot("LeftHand", rx=2.0 + 1.5 * math.sin(2 * math.pi * t / 6.5), rz=1.0)
    # Höger arm styrs av IK-målet, så vi inte gissar lokala euleraxlar.
    ik_tgt.location = rh_rest.lerp(peak, gest)

    # Fingrar: vänster lätt liv, höger öppnas i gesten och sluts milt mot kortet.
    open_r = envelope(t, [
        (0.0, 0.0), (2.2, 0.0), (3.6, 0.7), (4.6, 1.0),
        (5.5, 0.35), (6.6, 0.15), (8.0, 0.0),
    ])
    fidget = 0.5 * (1 + math.sin(2 * math.pi * t / 5.0))
    for dg, w in (("Index", 1.0), ("Middle", 1.05), ("Ring", 0.95), ("Pinky", 0.85), ("Thumb", 0.55)):
        for j, amt in ((1, 8.0), (2, 12.0), (3, 10.0)):
            # Negativ curl = räta ut från sittandes viloböj
            add_curl(f"RightHand{dg}{j}", -amt * w * open_r + (2.0 if dg != "Thumb" else 1.0) * math.sin(t * 2.2 + j))
            add_curl(f"LeftHand{dg}{j}", 3.0 * w * fidget * (0.6 if j == 1 else 1.0) * math.sin(t * 1.7 + hash(dg) % 5))
    upd()


# Keyframe: alla rörliga ben varje ruta så andning och gester interpoleras exakt
movable = [
    "Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
    "LeftShoulder", "RightShoulder", "LeftArm", "RightArm",
    "LeftForeArm", "RightForeArm", "LeftHand", "RightHand",
]
for side in ("Left", "Right"):
    for dg in ("Thumb", "Index", "Middle", "Ring", "Pinky"):
        for j in (1, 2, 3):
            n = f"{side}Hand{dg}{j}"
            if n in bones:
                movable.append(n)

arm.animation_data_create()
act = bpy.data.actions.new(NAME + "Rorelse")
arm.animation_data.action = act

ik_driven = {bones[n] for n in ("RightArm", "RightForeArm", "RightHand") if n in bones}
for f in range(1, FRAMES + 1):
    sc.frame_set(f)
    pose_at(f)
    ik_tgt.keyframe_insert(data_path="location", frame=f)
    for n in movable:
        if n not in bones:
            continue
        pb = P(n)
        if pb.name in ik_driven:
            continue
        pb.keyframe_insert(data_path="rotation_quaternion", frame=f)
        pb.keyframe_insert(data_path="location", frame=f)
        pb.keyframe_insert(data_path="scale", frame=f)
# Mjuk interpolation (Blender 5 har f-curves i layered action-channelbags)
def action_fcurves(action):
    fcs = []
    for layer in getattr(action, "layers", []):
        for strip in getattr(layer, "strips", []):
            for bag in getattr(strip, "channelbags", []):
                fcs.extend(bag.fcurves)
    return fcs
for fc in action_fcurves(act):
    for kp in fc.keyframe_points:
        kp.interpolation = "BEZIER"
        kp.handle_left_type = "AUTO_CLAMPED"
        kp.handle_right_type = "AUTO_CLAMPED"

# Kamera: halvbild, ansikte + händer + grönt bord
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = 55
tgt = bpy.data.objects.new("T", None)
sc.collection.objects.link(tgt)
tc = cam.constraints.new("TRACK_TO")
tc.target = tgt
tc.track_axis = "TRACK_NEGATIVE_Z"
tc.up_axis = "UP_Y"
# Titta mot bröst/ansikte och högerhanden vid bordet
look = Vector((0.00, front_y + 0.04, table_z + 0.38))
cam.location = Vector((0.52, -1.58, table_z + 0.74))
tgt.location = look
cam.data.lens = 48

# --- Rendera kontaktremsa ---
strip_dir = out / "strip"
strip_dir.mkdir(exist_ok=True)
if mode == "preview":  # i filmläget tas kontaktremsan ur den färdiga MP4:n i stället
    for f in STRIP:
        sc.frame_set(f)
        sc.render.filepath = str(strip_dir / f"ruta-{f:03d}.png")
        bpy.ops.render.render(write_still=True)

# Baka IK till visuella pose-nycklar så GLB-filen bär med sig gesten.
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode="POSE")
bpy.ops.pose.select_all(action="SELECT")
try:
    bpy.ops.nla.bake(
        frame_start=1,
        frame_end=FRAMES,
        only_selected=True,
        visual_keying=True,
        clear_constraints=True,
        bake_types={"POSE"},
        step=1,
    )
except Exception as e:
    print("BAKE_WARN", e)
bpy.ops.object.mode_set(mode="OBJECT")

# Exportera animerad GLB (avatar + bord + kort, så den går att öppna direkt)
# Inga lampor behövs i filen.
for o in list(sc.objects):
    o.select_set(o.type in {"ARMATURE", "MESH"} and not o.hide_render)
bpy.context.view_layer.objects.active = arm
glb = out / f"{NAME}-apose-med-rorelse.glb"
export_kw = dict(filepath=str(glb), export_format="GLB", use_selection=True,
                 export_animations=True, export_image_format="AUTO")
# Blender 5-varianter av animationsflaggan
for key, val in (("export_animation_mode", "ACTIONS"), ("export_nla_strips", False)):
    if key in bpy.ops.export_scene.gltf.get_rna_type().properties:
        export_kw[key] = val
bpy.ops.export_scene.gltf(**export_kw)

# Film: H.264 MP4 via Blenders ffmpeg, plus PNG-sekvens som reserv.
if mode == "film":
    seq = out / "rutor"
    seq.mkdir(exist_ok=True)
    sc.render.filepath = str(seq / "ruta-")
    sc.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(animation=True)
    mp4 = out / f"{NAME}-ror-sig.mp4"
    # Försök system-ffmpeg först (lättare CRF-kontroll), annars lämna PNG-sekvensen.
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        cmd = [ffmpeg, "-y", "-framerate", str(FPS), "-i", str(seq / "ruta-%04d.png"),
               "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
               "-movflags", "+faststart", str(mp4)]
        print("FFMPEG", " ".join(cmd))
        subprocess.check_call(cmd)
    else:
        sc.render.filepath = str(out / f"{NAME}-ror-sig")
        sc.render.image_settings.file_format = "FFMPEG"
        sc.render.ffmpeg.format = "MPEG4"
        sc.render.ffmpeg.codec = "H264"
        sc.render.ffmpeg.constant_rate_factor = "HIGH"
        sc.render.ffmpeg.gopsize = FPS
        bpy.ops.render.render(animation=True)
    rep_note = str(mp4) if mp4.exists() else "missing-mp4"
    print("MP4", rep_note, mp4.stat().st_size if mp4.exists() else 0)

rep = {
    "mode": mode,
    "frames": FRAMES,
    "fps": FPS,
    "seconds": FRAMES / FPS,
    "samples": sc.cycles.samples,
    "glb": str(glb),
    "glb_bytes": glb.stat().st_size if glb.exists() else 0,
    "curl_axis": {k: list(v) for k, v in curl_axis.items()},
    "bordshojd_m": round(table_z, 3),
}
(out / "anim.json").write_text(json.dumps(rep, indent=1, ensure_ascii=False), encoding="utf-8")
print("ANIM", json.dumps({k: rep[k] for k in rep if k != "curl_axis"}, ensure_ascii=False))
