"""Ren handled på den riggade A-pose-avataren (steg 05, efter fingrarna).

Orsak: montera.attach() i steg 03 vidgade (till 2026-11-27, Tomasz) donatorhandens handledsöppning till
skjortärmens ytterdiameter (en jämn vidgning över handens första 22 %, warp_frac), och skarven (materialet Skarvar)
satt utanför ärmens kant, där också en remsa av kroppens egen hud står kvar. Det blev en uppblåst, hopknycklad
handled. Här rättas det på den riggade modellen, med ben, bennamn, fingrar, UV och texturer orörda:

1. Handens vidgning räknas tillbaka med samma form som attach lade på (kvoten ärm/handled mätt per led i steg 03:s
   egen ram), så att handleden får naturlig tjocklek och en lätt avsmalning mot handen.
2. Handledens början dras in i ärmen (DJUP_IN innanför ärmens kant), så att skarven blir en tratt inne i ärmen;
   mest töjs den dolda delen.
3. Kroppens hudremsa bortom manschetten (Meshys egen handled, kvar efter snittet) får skarvens material, som bara
   har hörnfärg: manschettens färg i kanten och mörkt inne i ärmen. Ytorna byter material; UV och texturer är orörda.
4. Hand/underarmsvikterna för de flyttade hörnen sätts efter deras nya läge med steg 05:s egen regel
   (fingrar_apose: handledsbandet), och det som ligger inne i ärmen som om det låg i ärmens kant, så att tratten
   och handleden därinne följer manschetten; fingrarnas vikter är orörda. Normalerna räknas om för de flyttade
   hörnen, skarvens pekar längs armen (jämnt mörk, inga veck i ljuset), alla andra behåller sina exakt.

En montering efter 2026-11-27 vidgar inte handen och lägger skarven inne i ärmen (montera_apose HANDLED_IN); då
flyttas inget, och bara kanten och skarven färgas (3).

blender -b --python steg/05-fingrar-handleder/fixa_handleder.py -- avatar-rigg.glb utmapp [--utan-bilder]
Skriver utmapp/avatar-rigg-handledfix.glb, fix.json och före/efter-bilder (fore-/efter-hoger|vanster.png).
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

import json
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

from fingrar_apose import _rot_y
from fingerrigg import smoothstep

WARP_FRAC = 0.22      # montera.attach(warp_frac=0.22): hur långt in på handen vidgningen når, andel av handens längd
AVSMALNING = 0.06     # handleden vid öppningen så mycket bredare än handledens smalaste ställe (underarmen vidgas)
DJUP_IN = 0.012       # m: handledens öppning så långt innanför ärmens kant
MORK = 0.10           # ärmens insida vid handleden: andel av manschettens färg

args = sys.argv[sys.argv.index("--") + 1:]
src, out = Path(args[0]).resolve(), Path(args[1]).resolve()
bilder = "--utan-bilder" not in args
out.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(src), merge_vertices=True)
arm = next(o for o in sc.objects if o.type == "ARMATURE")
mesh = next(o for o in sc.objects if o.type == "MESH" and o.find_armature() == arm)
for o in sc.objects:
    if o.type == "MESH" and o is not mesh:
        o.hide_render = o.hide_viewport = True
me = mesh.data
bones = {b.name.split(":")[-1]: b for b in arm.data.bones}
mw = np.array(arm.matrix_world)
mm = np.array(mesh.matrix_world)
inv = np.linalg.inv(mm)
co = np.empty((len(me.vertices), 3)); me.vertices.foreach_get("co", co.ravel())
world = co @ mm[:3, :3].T + mm[:3, 3]
new = world.copy()
n_v = len(world)

# --- Material per hörn, kanter, UV, texturfärg ---
mats = [m.name if m else "" for m in me.materials]
slot = {nm: next(i for i, m in enumerate(mats) if m.startswith(nm)) for nm in ("Kropp", "Skarvar", "Handpar")}
poly_mat = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get("material_index", poly_mat)
loop_v = np.empty(len(me.loops), np.int32); me.loops.foreach_get("vertex_index", loop_v)
loop_tot = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get("loop_total", loop_tot)
loop_poly = np.repeat(np.arange(len(me.polygons)), loop_tot)
loop_mat = poly_mat[loop_poly]
touch = {nm: np.zeros(n_v, bool) for nm in slot}
for nm, k in slot.items():
    touch[nm][loop_v[loop_mat == k]] = True
luv = np.empty((len(me.loops), 2)); me.uv_layers.active.data.foreach_get("uv", luv.ravel())
vuv = np.zeros((n_v, 2)); cnt = np.zeros(n_v)
kl = loop_mat == slot["Kropp"]
np.add.at(vuv, loop_v[kl], luv[kl]); np.add.at(cnt, loop_v[kl], 1); vuv /= np.maximum(cnt, 1)[:, None]


def base_image(mat):
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    todo = [l.from_node for l in bsdf.inputs["Base Color"].links]
    while todo:
        n = todo.pop()
        if n.type == "TEX_IMAGE" and n.image:
            return n.image
        todo += [l.from_node for s in n.inputs for l in s.links]


img = base_image(me.materials[slot["Kropp"]])
iw, ih = img.size
px = np.empty(iw * ih * img.channels, np.float32)
img.pixels.foreach_get(px)
px = px.reshape(ih, iw, img.channels)[..., :3]


def sample(uv):
    return px[(np.clip(uv[:, 1] % 1, 0, 1 - 1e-6) * ih).astype(int), (np.clip(uv[:, 0] % 1, 0, 1 - 1e-6) * iw).astype(int)]


def to_linear(c):
    # 8-bitarsbilder läses som sRGB-värden; hörnfärgen multipliceras linjärt
    return c if img.is_float else np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


kropp_srgb = sample(vuv)
kropp_farg = to_linear(kropp_srgb)

groups = {g.name.split(":")[-1]: g for g in mesh.vertex_groups}


def to_gltf(v):
    return np.array([v[0], v[2], -v[1]])


def to_blender(v):
    return np.array([v[0], -v[2], v[1]])


def rodrigues(a, b):
    # Som montera_apose.rodrigues: vrider enhetsvektorn a till b.
    a, b = a / np.linalg.norm(a), b / np.linalg.norm(b)
    v, c = np.cross(a, b), float(a @ b)
    k = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + k + k @ k / (1 + c)


def hand_mix(points, side, wrist, d5, hand_length):
    """Handens andel i handledsbandet, som fingrar_apose.fit_fingers räknar den."""
    R = _rot_y(side, d5)
    outward = side * (((points - wrist) @ R + wrist)[:, 0])
    return smoothstep(0.5 + (outward - side * wrist[0]) / (0.31 * hand_length))


def slice_width(lx, lz, h, mask, h0, h1):
    m = mask & (h >= h0) & (h < h1)
    if m.sum() < 8:
        return None
    return np.array([np.ptp(lx[m]), np.ptp(lz[m])])


report = {"kalla": str(src), "sidor": {}}
flyttade = np.zeros(n_v, bool)
vcol = np.full((n_v, 3), np.nan)                 # hörnfärg (linjär) för skarven och remsan
remsa_ytor = np.zeros(len(me.loops), bool)       # hörn i kroppens ytor som byter till skarvens material
tratt_n = np.full((len(me.loops), 3), np.nan)     # skarvens normal: längs armen mot handen (jämnt mörk, inga veck)
look_at = {}

for side_name, side in (("Left", 1), ("Right", -1)):
    # Den här armen: nära handens led (skarvmaterialet sitter också vid halsen).
    wrist = np.array(mw[:3, :3] @ np.array(bones[side_name + "Hand"].head_local) + mw[:3, 3])
    pa = (side * world[:, 0] > 0.05) & (np.linalg.norm(world - wrist, axis=1) < 0.30)
    rim = touch["Kropp"] & touch["Skarvar"] & pa
    ring = touch["Skarvar"] & touch["Handpar"] & pa
    hand_v = touch["Handpar"] & pa & ~touch["Skarvar"] | ring
    if rim.sum() < 12 or ring.sum() < 12:
        report["sidor"][side_name] = {"hoppade_over": f"ingen skarv mellan ärm och hand ({int(rim.sum())}/{int(ring.sum())} hörn)"}
        continue
    # Ramen: snittplanets normal är underarmens riktning i steg 03 (montera_apose.underarm).
    p = world[rim | ring]
    c0 = p.mean(0)
    d = np.linalg.svd(p - c0)[2][2]
    if (world[hand_v].mean(0) - c0) @ d < 0:
        d = -d
    d_g = to_gltf(d)
    frame = rodrigues(np.array([side, 0.0, 0.0]), d_g) @ np.array([[0, side, 0], [0, 0, 1], [side, 0, 0]], float)
    ax, az = to_blender(frame[:, 0]), to_blender(frame[:, 2])
    az = az - (az @ d) * d; az /= np.linalg.norm(az)
    ax = np.cross(d, az) * np.sign(np.cross(d, az) @ ax)
    # Origo: ärmkantens mitt (montera.centered_loop: mitten av ytterläget i ramen).
    rel = world[rim] - c0
    cx, cz = (np.ptp(rel @ ax) / 2 + (rel @ ax).min()), (np.ptp(rel @ az) / 2 + (rel @ az).min())
    origin = c0 + cx * ax + cz * az + float(np.median(rel @ d)) * d
    rel = world - origin
    u = rel @ d
    lx, lz = rel @ ax, rel @ az
    rad = np.hypot(lx, lz)
    u_open = float(np.median(u[ring]))
    h = u - u_open
    hand = touch["Handpar"] & pa & (rad < 0.15) & (h > -0.01)
    L = float(np.percentile(h[hand], 99.8))
    extent = WARP_FRAC * L
    W0 = np.array([np.ptp(lx[ring]), np.ptp(lz[ring])])
    Wn = slice_width(lx, lz, h, hand, extent - 0.003, extent + 0.003)
    if Wn is None:
        raise SystemExit(f"{side_name}: hittar ingen handled {extent * 1000:.0f} mm ut på handen")
    ratio = np.maximum(W0 / (Wn * (1 + AVSMALNING)), 1.0)

    # Manschettens kant: där kroppens textur slutar likna ärmen en bit in (vilken färg skjortan än har), räknat
    # utåt längs underarmen.
    sleeve = touch["Kropp"] & ~touch["Skarvar"] & pa & (rad < 0.08) & (u > -0.06) & (u < 0.004)
    ref = np.median(kropp_srgb[sleeve & (u > -0.040) & (u < -0.015)], axis=0)

    def hudlik(c):
        # Hud mot ärmens tyg: varmare (rött mot blått) än ärmen en bit in. Bara ljusare (en knapp) räknas inte.
        return (c[:, 0] - c[:, 2]) - (ref[0] - ref[2]) > 0.08

    likt = ~hudlik(kropp_srgb)
    u_c = 0.0
    for s0 in np.arange(-0.030, 0.003, 0.0015):
        m = sleeve & (u >= s0) & (u < s0 + 0.0015)
        if m.sum() >= 5 and likt[m].mean() < 0.6:
            u_c = s0
            break
    cuff_col = np.median(kropp_farg[sleeve & likt & (u > u_c - 0.02) & (u < u_c)], axis=0)

    # Är handleden redan smal och öppningen redan inne i ärmen (en montering som inte vidgar handen) flyttas inget,
    # men kanten och skarven färgas ändå (3).
    u_rim = float(np.median(u[rim]))
    behov = not (ratio.max() < 1.06 and u_open < u_rim - 0.004)

    # 1+2. Handen: vidgningen tillbaka, och handledens början in i ärmen (DJUP_IN innanför ärmens kant).
    D = u_open - (u_rim - DJUP_IN)
    stub = hand & (h < extent) & behov
    w = 1.0 - smoothstep(h[stub] / extent)
    sx, sz = 1.0 + w * (ratio[0] - 1.0), 1.0 + w * (ratio[1] - 1.0)
    hn = h[stub] - D * (1.0 - np.clip(h[stub] / extent, 0, 1)) ** 2
    new[stub] = origin + np.outer(u_open + hn, d) + np.outer(lx[stub] / sx, ax) + np.outer(lz[stub] / sz, az)
    flyttade |= stub
    # Skarven blir en mörk tratt från ärmens kant (orörd) in till handledens öppning. Skarvhörn som inte sitter ihop
    # med kroppen eller handen (dubbletter längs kanterna) följer det närmaste hörnet på samma andel mellan dem.
    seam_only = touch["Skarvar"] & pa & ~touch["Kropp"] & ~touch["Handpar"] & (rad < 0.1) & behov
    if seam_only.any():
        rim_i, ring_i = np.flatnonzero(rim), np.flatnonzero(ring)
        for v in np.flatnonzero(seam_only):
            a_i = rim_i[np.argmin(np.linalg.norm(world[rim_i] - world[v], axis=1))]
            b_i = ring_i[np.argmin(np.linalg.norm(world[ring_i] - world[v], axis=1))]
            s = np.clip((u[v] - u[a_i]) / max(u[b_i] - u[a_i], 1e-5), 0, 1)
            new[v] = new[a_i] * (1 - s) + new[b_i] * s
        flyttade |= seam_only

    # 3. Kroppens hudremsa bortom manschettens kant (och hud som sticker in i kanten) får skarvens material, som bara
    # har hörnfärg: manschettens färg i kanten, så att ärmen slutar rent vid snittet; skarven mörk som en ärm inuti.
    near_end = touch["Kropp"] & pa & (rad < 0.08) & (u > u_c - 0.016) & (u < u_rim + 0.01)
    remsa = near_end & ((u > u_c - 0.0015) | ~likt)
    ytor = np.unique(loop_poly[remsa[loop_v] & (loop_mat == slot["Kropp"])])
    # Också ytor vars hörn är ärm men vars textur inuti har hud (gränsen i texturen går inte längs kanterna):
    # provet i ytans mitt och halvvägs mot varje hörn.
    nara = np.unique(loop_poly[near_end[loop_v] & (loop_mat == slot["Kropp"])])
    li = np.flatnonzero(np.isin(loop_poly, nara))
    mid = np.zeros((len(me.polygons), 2))
    np.add.at(mid, loop_poly[li], luv[li])
    mid[nara] /= loop_tot[nara, None]
    prov = np.vstack([mid[nara], (luv[li] + mid[loop_poly[li]]) / 2])
    agare = np.r_[nara, loop_poly[li]]
    olik = hudlik(sample(prov))
    ytor = np.union1d(ytor, np.unique(agare[olik]))
    remsa_ytor |= np.isin(loop_poly, ytor)
    remsa_v = np.zeros(n_v, bool)
    remsa_v[loop_v[np.isin(loop_poly, ytor)]] = True
    # Hörnfärgen: hörn som är ärm behåller sin egen texturfärg (ingen synlig gräns), hud blir manschettens färg;
    # närmare snittet lite mörkare.
    tt = np.clip((u - u_c) / max(u_rim - u_c, 1e-4), 0, 1)
    base = np.where(likt[:, None], kropp_farg, cuff_col[None, :])
    vcol[remsa_v] = base[remsa_v] * (1 - 0.25 * tt[remsa_v, None])
    seam_v = touch["Skarvar"] & pa & (rad < 0.1)
    vcol[seam_v & touch["Kropp"]] = cuff_col * 0.35
    d_loc = inv[:3, :3] @ d
    tratt_n[(loop_mat == slot["Skarvar"]) & seam_v[loop_v]] = d_loc / np.linalg.norm(d_loc)
    vcol[seam_v & ~touch["Kropp"]] = cuff_col * MORK
    rest = np.zeros(n_v, bool)
    rest[loop_v[remsa_ytor]] = True
    rest &= ~np.isfinite(vcol[:, 0])
    vcol[rest] = cuff_col

    # Rapport och kameramål.
    rel2 = new - origin
    u2, lx2, lz2 = rel2 @ d, rel2 @ ax, rel2 @ az
    prof = []
    for a0 in np.arange(-0.03, 0.06, 0.006):
        m0 = slice_width(lx, lz, u, hand | (touch["Skarvar"] & pa), a0, a0 + 0.006)
        m1 = slice_width(lx2, lz2, u2, hand, a0, a0 + 0.006)
        prof.append({"u_mm": round((a0 + 0.003) * 1000), "fore_mm": None if m0 is None else (m0 * 1000).round(1).tolist(),
                     "efter_mm": None if m1 is None else (m1 * 1000).round(1).tolist()})
    report["sidor"][side_name] = {
        "kvot_vidgning": ratio.round(3).tolist(), "vidgningens_langd_mm": round(extent * 1000, 1),
        "handled_naturlig_mm": (Wn * 1000).round(1).tolist(), "oppning_fore_mm": (W0 * 1000).round(1).tolist(),
        "manschettkant_u_mm": round(u_c * 1000, 1), "oppning_u_fore_mm": round(u_open * 1000, 1),
        "armkant_u_mm": round(u_rim * 1000, 1), "oppning_u_efter_mm": round((u_rim - DJUP_IN) * 1000, 1),
        "handen_flyttad": behov, "handhorn_flyttade": int(stub.sum()), "ytor_till_skarven": int(len(ytor)),
        "skarvhorn_utan_kant": int(seam_only.sum()),
        "max_flytt_mm": round(float(np.linalg.norm(new[pa] - world[pa], axis=1).max()) * 1000, 1),
        "profil": prof,
    }
    look_at[side_name] = (origin + d * 0.02, d, ax, az)

    # 4. Vikterna i handledsbandet efter det nya läget (fingrar_apose: hand/underarm efter läget längs handen).
    hp = touch["Handpar"] & (side * world[:, 0] > 0)
    d5 = world[hp].mean(0) - wrist
    R5 = _rot_y(side, d5)
    hand_length = float(np.ptp((((world[hp] - wrist) @ R5) + wrist)[:, 0]))
    g_hand, g_fore = groups[side_name + "Hand"], groups[side_name + "ForeArm"]
    moved = np.flatnonzero(flyttade & pa)
    # Det som ligger inne i ärmen räknas som om det låg i ärmens kant, så att tratten och handleden därinne följer
    # manschetten och inte veckas när handen böjs.
    u_new = (new[moved] - origin) @ d
    pos_w = new[moved] + np.outer(np.maximum(u_rim - u_new, 0.0), d)
    mix_new = hand_mix(pos_w, side, wrist, d5, hand_length)
    changed = 0
    for v, m_new in zip(moved, mix_new):
        ws = {g.group: g.weight for g in me.vertices[v].groups}
        wh, wf = ws.get(g_hand.index, 0.0), ws.get(g_fore.index, 0.0)
        tot = wh + wf
        if tot <= 1e-6:
            continue
        nh = tot * float(m_new)
        if abs(nh - wh) < 1e-4:
            continue
        g_hand.add([int(v)], nh, "REPLACE")
        g_fore.add([int(v)], tot - nh, "REPLACE")
        changed += 1
    report["sidor"][side_name]["vikter_andrade"] = changed
del px


def render_setup():
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "OPTIX"
        prefs.get_devices()
        optix = [dv for dv in prefs.devices if dv.type == "OPTIX"]
        if optix:
            for dv in prefs.devices:
                dv.use = dv in optix
            sc.cycles.device = "GPU"
    except Exception:
        sc.cycles.device = "CPU"
    sc.cycles.samples = 32
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = "AgX"
    wo = bpy.data.worlds.new("W")
    sc.world = wo
    wo.use_nodes = True
    wo.node_tree.nodes["Background"].inputs[0].default_value = (0.32, 0.36, 0.38, 1)
    wo.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    for name, loc, power, size in (("Key", (-2.2, -3.0, 2.6), 900, 2.0), ("Fill", (2.6, -2.4, 1.6), 350, 2.5),
                                   ("Rim", (0.5, 3.0, 2.8), 500, 1.5)):
        lt = bpy.data.lights.new(name, "AREA")
        lt.energy, lt.size = power, size
        ob = bpy.data.objects.new(name, lt)
        sc.collection.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = (Vector((0, 0, 1.2)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.lens = 85
    tgt = bpy.data.objects.new("T", None)
    sc.collection.objects.link(tgt)
    tc = cam.constraints.new("TRACK_TO")
    tc.target, tc.track_axis, tc.up_axis = tgt, "TRACK_NEGATIVE_Z", "UP_Y"
    sc.render.resolution_x = sc.render.resolution_y = 1000
    sc.render.image_settings.file_format = "PNG"
    return cam, tgt


def shots(prefix, cam, tgt):
    for side_name, fn in (("Left", "vanster"), ("Right", "hoger")):
        if side_name not in look_at:
            continue
        # Som QC-bilden i steg 07: snett framifrån och utifrån, mot handleden strax utanför ärmen.
        c, d, ax, az = look_at[side_name]
        c = c + d * 0.03
        out_dir = np.array([1.0 if side_name == "Left" else -1.0, 0, 0])
        cam.location = Vector((c + np.array([0, -0.42, 0.08]) + out_dir * 0.18 - d * 0.04).tolist())
        tgt.location = Vector(c.tolist())
        bpy.context.view_layer.update()
        sc.render.filepath = str(out / f"{prefix}-{fn}.png")
        bpy.ops.render.render(write_still=True)


if bilder and look_at:
    cam, tgt = render_setup()
    shots("fore", cam, tgt)

if look_at:
    # Normalerna: de flyttade hörnens räknas om (släta), alla andras står kvar som de var.
    old_n = np.empty((len(me.loops), 3), np.float32)
    me.corner_normals.foreach_get("vector", old_n.ravel())
    cn = me.attributes.get("custom_normal")
    raw = None
    if cn is not None and cn.domain == "CORNER":
        raw = np.empty(len(me.loops) * 2, np.int16)
        cn.data.foreach_get("value", raw)
    local = co.copy()
    local[flyttade] = (np.c_[new[flyttade], np.ones(int(flyttade.sum()))] @ inv.T)[:, :3]
    me.vertices.foreach_set("co", local.astype(np.float32).ravel())
    me.update()
    vn = np.empty((n_v, 3), np.float32)
    me.vertex_normals.foreach_get("vector", vn.ravel())
    sel = flyttade[loop_v]
    old_n[sel] = vn[loop_v[sel]]
    tratt = np.isfinite(tratt_n[:, 0])
    old_n[tratt] = tratt_n[tratt]
    me.normals_split_custom_set(old_n.tolist())
    if raw is not None:
        # Ytor utan något flyttat hörn får tillbaka exakt sina gamla normaler (inte omkodade).
        rorda = np.zeros(len(me.polygons), bool)
        rorda[loop_poly[sel | tratt]] = True
        keep = np.repeat(~rorda[loop_poly], 2)
        cn = me.attributes.get("custom_normal")
        now = np.empty(len(me.loops) * 2, np.int16)
        cn.data.foreach_get("value", now)
        now[keep] = raw[keep]
        cn.data.foreach_set("value", now)
    # Remsans ytor till skarvens material, och hörnfärgen i skarven och remsan (skarvens material har bara den).
    pm = poly_mat.copy()
    pm[np.unique(loop_poly[remsa_ytor])] = slot["Skarvar"]
    me.polygons.foreach_set("material_index", pm)
    colattr = me.color_attributes.get("Color")
    if colattr is None or colattr.domain != "CORNER":
        raise SystemExit("Modellen saknar hörnfärgen 'Color' som skarven färgas med.")
    cols = np.empty((len(me.loops), 4), np.float32)
    colattr.data.foreach_get("color", cols.ravel())
    sel = (pm[loop_poly] == slot["Skarvar"]) & np.isfinite(vcol[loop_v, 0])
    cols[sel, :3] = vcol[loop_v[sel]]
    colattr.data.foreach_set("color", cols.ravel())
    me.update()
    report["ytor_till_skarven"] = int(len(np.unique(loop_poly[remsa_ytor])))

if bilder and look_at:
    shots("efter", cam, tgt)

arm.select_set(True)
mesh.select_set(True)
bpy.context.view_layer.objects.active = arm
glb = out / "avatar-rigg-handledfix.glb"
bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True, export_animations=False,
                          export_image_format="AUTO")
report["ut_glb"] = str(glb)
report["ut_bytes"] = glb.stat().st_size
(out / "fix.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
print("FIX", json.dumps({s: {k: v for k, v in r.items() if k != "profil"} for s, r in report["sidor"].items()}, ensure_ascii=False))
