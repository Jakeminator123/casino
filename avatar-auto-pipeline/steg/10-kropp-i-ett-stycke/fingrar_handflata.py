"""Fingerleder för en hand som inte ligger med handflatan nedåt i T-läget: Runways kroppar har handflatan framåt i A-posen.

Steg 05 (fingrar_apose.fit_fingers) vrider varje hand kring Blenders framåtaxel (Y) in i T-läget och väntar sig att
handflatan då pekar nedåt och tummen framåt: fingrarnas silhuett läses uppifrån i den ramen, lederna läggs mitt i
fingrets tjocklek längs ramens 'upp', och varje leds rullning (align_roll) pekar 'upp'. En hand med handflatan framåt
ligger på kant i den ramen. Då blir 'upp' handens bredd och varje led böjs i handens plan, åt sidan, i stället för in
mot handflatan; så böjde sig fingrarna i snabbprovet (runway-3d-20261127): ledernas Z-axel stod 72-80 grader från handens
normal, där Meshy-dockans står 12-22.

Här vrids handen också kring sin egen längd: handens plan mäts (minsta axeln i handens hörn), och av de två sätt
handflatan kan vändas nedåt väljs det där tummen hamnar först och kortast, som fingersteget räknar dem. Sedan körs samma
fit_fingers med den ramen. Ramen byts bara under anropet, så Meshy-vägen (bygg_fingrar_apose.py) är som förut.
"""

import numpy as np

import fingrar_apose
from fingerrigg import hand_chains, world_vertices

RAPPORT = {}


def _handens_horn(mesh, side):
    slots = {i for i, s in enumerate(mesh.material_slots) if s.name.casefold().startswith("handpar")}
    vertices = np.unique([v for p in mesh.data.polygons if p.material_index in slots for v in p.vertices])
    xyz = world_vertices(mesh)
    return xyz, vertices[side * xyz[vertices, 0] > 0]


def handram(arm, mesh, tag, side):
    """Ramen som för T-läget (handen längs side*X, handflatan nedåt, tummen mot -Y) till handen där den ligger."""
    xyz, idx = _handens_horn(mesh, side)
    palm = next(b for b in arm.data.bones if b.name.split(":")[-1] == tag + "Hand")
    wrist = np.array(arm.matrix_world @ palm.head_local)
    d = xyz[idx].mean(0) - wrist  # samma längdriktning som fit_fingers
    d /= np.linalg.norm(d)
    pts = xyz[idx] - xyz[idx].mean(0)
    n = np.linalg.svd(pts, full_matrices=False)[2][2]
    n = n - (n @ d) * d
    n /= np.linalg.norm(n)
    best = None
    for sign in (1, -1):
        z = sign * n
        x = side * d
        R = np.column_stack((x, np.cross(z, x), z))
        local = (xyz[idx] - wrist) @ R + wrist
        try:
            chains = hand_chains(local, side)
        except ValueError:
            continue
        reach = side * (chains[:, -1, 0] - wrist[0])  # fingertopparnas räckvidd ut från handleden, i T-läget
        score = reach[4] - reach[0]  # tummen kortare än lillfingret när tummen är först
        if best is None or score > best[0]:
            best = (score, R, sign)
    if best is None:
        raise ValueError(f"{tag}: hittar inte fem fingrar i handens silhuett åt något håll.")
    score, R, sign = best
    vinkel = float(np.degrees(np.arccos(abs(n @ np.array([0.0, 0.0, 1.0])))))
    RAPPORT[tag] = {"handryggens_normal": np.round(sign * n, 3).tolist(), "normal_fran_lodlinjen_grader": round(vinkel, 1),
                    "tummen_kortare_an_lillfingret_m": round(float(score), 4)}
    return R


def fit_fingers_handflata(arm, mesh):
    """fingrar_apose.fit_fingers med handens egen ram (handflatan nedåt i T-läget) i stället för en vridning kring Y."""
    frames = {side: handram(arm, mesh, tag, side) for tag, side in (("Right", -1), ("Left", 1))}
    original = fingrar_apose._rot_y
    fingrar_apose._rot_y = lambda side, d: frames[side]
    try:
        fingrar_apose.fit_fingers(arm, mesh)
    finally:
        fingrar_apose._rot_y = original
    RAPPORT["leder"] = rullning(arm)
    return RAPPORT


def rullning(arm):
    """Vinkeln mellan varje första fingerleds Z-axel (dit leden böjs ifrån) och handryggens normal, per hand."""
    out = {}
    for tag in ("Right", "Left"):
        normal = np.array(RAPPORT.get(tag, {}).get("handryggens_normal", (0, 0, 0)), float)
        if not normal.any():
            continue
        m3 = np.array(arm.matrix_world.to_3x3())
        vinklar = {}
        for digit in fingrar_apose.DIGITS:
            bone = next(b for b in arm.data.bones if b.name.split(":")[-1] == f"{tag}Hand{digit}1")
            z = m3 @ np.array(bone.matrix_local.to_3x3())[:, 2]
            vinklar[digit] = round(float(np.degrees(np.arccos(np.clip(abs(z @ normal) / np.linalg.norm(z), -1, 1)))), 1)
        out[tag] = vinklar
    return out
