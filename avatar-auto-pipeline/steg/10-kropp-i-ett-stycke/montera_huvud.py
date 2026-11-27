"""Steg 10a: Meshy-huvudet sys på en kropp i ett stycke (Runways Hunyuan 3D 3.1 Pro), och kroppens egna händer behålls.

Kroppen ur Runway har hand och arm gjutna i ett stycke, så ingen hand sätts på och ingen skarv finns vid handleden. Huvudet
sys på med monteringens egna medel (steg 03): halsen söks som i montera_apose.assemble_apose (kragen, halsens kvot mot
huvudets kant, halsen smalnas av när den är bredare än huvudets kant) och sys med montera.attach. Hudtonen sätts som i
steg 03: huvudets och kroppens hud mot ansiktsbilden.

Händerna blir en egen del (materialet Handpar, samma textur som kroppen): de hudfärgade hörnen ytterst på armen, bortom ett
plan vinkelrätt mot underarmen. Fingersteget (steg 05, fingrar_apose.fit_fingers) letar efter handen i det materialet,
och forenkla_4k.py ger den samma andel av trianglarna som en påsatt hand.

Runways modell ligger med Z upp och en rotation i noden; den vrids här till glTF:s Y upp med ansiktet mot +Z och läggs med
bålen kring Y-axeln, som en kropp från Meshy.

python -B steg/10-kropp-i-ett-stycke/montera_huvud.py kropp.glb huvud.glb ut.glb [--hudref head-ref.png]
(huvud.glb är steg 03:s delar/huvud.glb; rapporten skrivs bredvid som <ut>.json)
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

import argparse
import copy
import json
from pathlib import Path

import numpy as np

import montera_apose  # noqa: F401  (patchar montera.clip och bygg.ordered_ring som i steg 03)
import montera
from bygg import Export, Mesh, unit
from gltf import Asset
from montera import attach, surface
from montera_apose import (_EditedAsset, _encode_image, _lin_to_srgb, _match_skin_atlas, _sample_srgb, _srgb_to_lin,
                           _target_skin_srgb, underarm)
from standardmatt import HALS_BREDDKVOT, halssnitt

HUD = lambda srgb: (srgb[:, 0] > srgb[:, 2] + 0.06) & (srgb[:, 0] > 0.45)  # steg 03:s hudfärg (montera_apose)


class Utskrift(Export):
    """bygg.Export, men tål ett material utan metall- och normalkarta (Runways har bara färgen) och låter två material
    dela en textur (händerna och kroppen är samma yta)."""

    def material(self, source, name):
        textures, offset = self.g["textures"], len(self.g["textures"])
        sampler_base, image_base = len(self.g["samplers"]), len(self.g["images"])
        self.g["samplers"].extend(copy.deepcopy(source.g.get("samplers", [])))
        for i, image in enumerate(source.g["images"]):
            self.g["images"].append({"mimeType": image["mimeType"], "bufferView": self.view(source.image_data(i)),
                                     "name": f"{name} {i + 1}"})
        for texture in source.g["textures"]:
            tex = copy.deepcopy(texture)
            tex["source"] += image_base
            if "sampler" in tex:
                tex["sampler"] += sampler_base
            textures.append(tex)
        mat = copy.deepcopy(source.mat)
        mat.pop("extensions", None)  # KHR_materials_specular: inte deklarerad i filen; ytan mjukas ändå i steg 05
        mat["name"] = name
        for container, key in ((mat["pbrMetallicRoughness"], "baseColorTexture"),
                               (mat["pbrMetallicRoughness"], "metallicRoughnessTexture"), (mat, "normalTexture")):
            if key in container:
                container[key]["index"] += offset
        self.g["materials"].append(mat)

    def samma_textur(self, index, name):
        mat = copy.deepcopy(self.g["materials"][index])
        mat["name"] = name
        self.g["materials"].append(mat)


def nodmatris(node):
    if "matrix" in node:
        return np.array(node["matrix"], float).reshape(4, 4).T
    x, y, z, w = node.get("rotation", (0, 0, 0, 1))
    r = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    m = np.eye(4)
    m[:3, :3] = r * np.array(node.get("scale", (1, 1, 1)), float)
    m[:3, 3] = node.get("translation", (0, 0, 0))
    return m


def upprest(asset):
    """Kroppens hörn och normaler med nodens rotation, ansiktet mot +Z och bålen kring Y-axeln (som en kropp från Meshy)."""
    node = asset.g["nodes"][0]
    m = nodmatris(node)
    pos = asset.pos.astype(float) @ m[:3, :3].T + m[:3, 3]
    nor = unit(asset.nor.astype(float) @ np.linalg.inv(m[:3, :3]))
    low, high = pos.min(0), pos.max(0)
    H = high[1] - low[1]
    shin = pos[(pos[:, 1] > low[1] + 0.10 * H) & (pos[:, 1] < low[1] + 0.20 * H)]
    feet = pos[pos[:, 1] < low[1] + 0.03 * H]
    front, back = feet[:, 2].max() - np.median(shin[:, 2]), np.median(shin[:, 2]) - feet[:, 2].min()
    vriden = bool(back > front)  # tårna pekar mot -Z: ansiktet åt fel håll
    if vriden:
        pos[:, [0, 2]] *= -1
        nor[:, [0, 2]] *= -1
    torso = pos[(pos[:, 1] > low[1] + 0.5 * H) & (pos[:, 1] < low[1] + 0.7 * H) & (np.abs(pos[:, 0] - np.median(pos[:, 0])) < 0.12 * H)]
    pos -= [(pos[:, 0].min() + pos[:, 0].max()) / 2, 0, np.median(torso[:, 2])]
    return pos.astype(np.float32), nor.astype(np.float32), {"nod": node.get("rotation") or node.get("matrix"),
                                                            "vriden_180": vriden, "langd": round(float(H), 4)}


def halslutning(head):
    """Lutningen som huvudets kant skars med i steg 03 (0,22 eller 0,05), ur kantens plan."""
    edges = np.sort(np.concatenate([head.faces[:, [0, 1]], head.faces[:, [1, 2]], head.faces[:, [2, 0]]]), axis=1)
    uniq, count = np.unique(edges, axis=0, return_counts=True)
    rim = head.pos[np.unique(uniq[count == 1])].astype(float)
    b = np.polyfit(rim[:, 2], rim[:, 1], 1)[0]
    return min((0.22, 0.05), key=lambda s: abs(-b - s))


def del_av(mesh, face_mask):
    faces = mesh.faces[face_mask]
    used = np.unique(faces)
    index = np.full(len(mesh.pos), -1, dtype="i4")
    index[used] = np.arange(len(used))
    return Mesh(mesh.pos[used], mesh.nor[used], mesh.uv[used], index[faces])


def sy_pa_huvud(body_file, head_file, output, skin_ref=None):
    body_asset, head_asset = Asset(body_file), Asset(head_file)
    pos, nor, upp = upprest(body_asset)
    body = Mesh(pos, nor, body_asset.uv, body_asset.faces)
    head = surface(head_asset)
    neck_slope = halslutning(head)
    atlas, head_atlas = body_asset.color(), head_asset.color()
    low, high = body.pos.min(axis=0), body.pos.max(axis=0)
    H = high[1] - low[1]

    # Hudtonen som i steg 03: huvudet och kroppens hud (halsen mäter den) mot ansiktsbilden.
    skin_report = None
    if skin_ref is not None and Path(skin_ref).is_file():
        tgt_skin = _target_skin_srgb(skin_ref)
        if tgt_skin is not None:
            tgt_skin = _lin_to_srgb(_srgb_to_lin(tgt_skin) * 0.91)
            head_atlas, h_info = _match_skin_atlas(head_atlas, tgt_skin, "Huvud")
            k_neck_mask = (body.pos[:, 1] > low[1] + 0.83 * H) & (np.abs(body.pos[:, 0]) < 0.12 * H)
            atlas, k_info = _match_skin_atlas(atlas, tgt_skin, "Kropp", vert_uv=body_asset.uv, vert_mask=k_neck_mask)
            skin_report = {"mal_srgb": np.round(tgt_skin, 3).tolist(), "huvud": h_info, "kropp": k_info}

    # Halsen: samma sökning som montera_apose.assemble_apose (kragen via hudfärgen, sedan den nivå där kroppens
    # halskant och huvudets kant är mest lika breda, och halsen smalnas av om den ändå är bredare).
    original = body.pos.copy()
    neck, neck_width = halssnitt(original, H)
    skin0 = HUD(_sample_srgb(atlas, body_asset.uv))
    krage, best, start = None, None, None
    for lv in np.arange(0.84, 0.91, 0.0025):
        sl = (np.abs(original[:, 1] - (low[1] + lv * H)) < 0.002 * H) & (np.abs(original[:, 0]) < 0.12 * H)
        if sl.sum() < 20:
            continue
        hud = skin0[sl].mean()
        if start is None:
            if hud < 0.97:
                krage = lv
                continue
            start = lv
        if lv > start + 0.025:
            break
        width = np.ptp(original[sl, 0]) / H
        if best is None or width < best[1] - 1e-4:
            best = (lv, width)
    axial_h = head.pos[:, 1] + neck_slope * head.pos[:, 2]
    part_h, upper_h = montera.clip(head, axial_h.min() + np.ptp(axial_h) * 0.004, True, neck_slope)
    pc_h, upper_h = montera.centered_loop(part_h, upper_h)
    part_top = float(part_h.pos[:, 1].max() - pc_h[1])
    part_span = np.ptp(part_h.pos[upper_h][:, [0, 2]], axis=0)
    limits = (0.50, 1.80) if neck_slope < 0.15 else HALS_BREDDKVOT
    montera_apose.NECK_BODY_H = float(H)
    try:
        def ratio_at(level):
            stump, lower = montera.clip(body, low[1] + level * H, False, neck_slope)
            sc, lower = montera.centered_loop(stump, lower)
            scale = (high[1] - sc[1] - H * 0.003) / part_top
            r = np.ptp(stump.pos[lower][:, [0, 2]], axis=0) / (part_span * scale)
            lp = stump.pos[lower]
            depth_ok = (np.ptp(lp[:, 2]) >= 0.038 * H) and (lp[:, 2].max() > 0.005 * H) and (
                abs(lp[:, 0].min() + lp[:, 0].max()) < 0.025 * H) and (np.ptp(lp[:, 0]) < 0.11 * H)
            return r, depth_ok

        neck_ratios = {}
        if krage is not None and best is not None:
            for level in np.arange((start if start is not None else neck) + 0.025, min(neck, start or neck) - 0.0001,
                                   -0.0025):
                try:
                    r, depth_ok = ratio_at(level)
                    if depth_ok:
                        neck_ratios[round(float(level), 4)] = np.round(r, 3).tolist()
                except ValueError:
                    continue
            if neck_ratios:
                neck = min(neck_ratios, key=lambda k: max(abs(np.log(neck_ratios[k]))))
                neck_width = None
        neck_fit = None
        try:
            r, _ = ratio_at(neck)
        except Exception:
            r = None
        if r is not None and np.any(r > 1.05):
            level_y, band = low[1] + neck * H, 0.045 * H
            ring = (np.abs(body.pos[:, 1] + neck_slope * body.pos[:, 2] - level_y) < 0.003 * H) & (
                np.abs(body.pos[:, 0]) < 0.09 * H) & (body.pos[:, 2] > -0.06 * H)
            cx, cz = np.median(body.pos[ring][:, 0]), np.median(body.pos[ring][:, 2])
            f = 1 / np.maximum(r, 1.0)
            p = body.pos.astype(float)
            dx, dz = p[:, 0] - cx, p[:, 2] - cz
            t = np.clip((p[:, 1] + neck_slope * p[:, 2] - (level_y - band)) / band, 0, None)
            t = np.where(t > 1, 1.0, t * t * (3 - 2 * t))
            t = np.where(np.hypot(dx, dz) < 0.09 * H, t, 0.0)
            p[:, 0] = cx + dx * (1 + t * (f[0] - 1))
            p[:, 2] = cz + dz * (1 + t * (f[1] - 1))
            body = Mesh(p.astype(body.pos.dtype), body.nor, body.uv, body.faces)
            neck_fit = {"kvot_fore": np.round(r, 3).tolist(), "kvot_efter": np.round(ratio_at(neck)[0], 3).tolist()}
        body, head, neck_seam = attach(body, head, np.eye(3), low[1] + H * neck, neck_slope, high[1], H * 0.003,
                                       atlas, head_atlas, limits=limits, warp_frac=0.11)
    finally:
        montera_apose.NECK_BODY_H = 0.0

    # Händerna: de hudfärgade hörnen ytterst på armen (som i steg 03), och allt bortom ett plan vinkelrätt mot
    # underarmen strax innanför den första huden, blir delen Handpar.
    skin = HUD(_sample_srgb(atlas, body.uv))
    hand_vertex = np.zeros(len(body.pos), bool)
    hands = {}
    for side in (-1, 1):
        a = underarm(original, side, H)
        d = a["riktning"]
        rel = body.pos - a["axel_punkt"]
        along = rel @ d
        radial = np.linalg.norm(rel - np.outer(along, d), axis=1)
        arm = (radial < 0.09 * H) & (along > a["spets"] - 0.2 * H) & (side * body.pos[:, 0] > 0)
        hud = skin & arm
        if hud.sum() < 500:
            raise ValueError("Hittar ingen hudfärgad hand ytterst på armen.")
        start = float(np.percentile(along[hud], 1.0))
        hand_vertex |= arm & (along >= start)
        hands["hoger" if side == -1 else "vanster"] = {
            "underarm_riktning": np.round(d, 4).tolist(), "hudhorn": int(hud.sum()),
            "handlangd_per_langd": round((float(along[hud].max()) - start) / H, 3)}
    on_hand = hand_vertex[body.faces].all(axis=1)
    rest, hand_part = del_av(body, ~on_hand), del_av(body, on_hand)

    result = Utskrift()
    result.g["asset"]["generator"] = "avatar / steg 10 montera_huvud"
    result.g["nodes"][0]["name"] = result.g["meshes"][0]["name"] = Path(output).stem
    for source, img_arr, name in ((body_asset, atlas, "Kropp"), (head_asset, head_atlas, "Huvud")):
        k_tex = source.mat["pbrMetallicRoughness"]["baseColorTexture"]["index"]
        img_idx = source.g["textures"][k_tex]["source"]
        enc = _encode_image(img_arr, source.g["images"][img_idx].get("mimeType", "image/jpeg"))
        result.material(_EditedAsset(source, {img_idx: enc}), name)
    result.samma_textur(0, "Handpar")
    result.g["materials"].append({"name": "Skarvar", "doubleSided": True,
                                  "pbrMetallicRoughness": {"metallicFactor": 0.0, "roughnessFactor": 0.62}})
    for mesh, material in ((rest, 0), (head, 1), (hand_part, 2), (neck_seam, 3)):
        result.mesh(mesh, material, colored=material == 3)
    output = Path(output)
    tmp = output.with_suffix(".tmp")
    result.write(tmp)
    tmp.replace(output)
    return {"kropp": upp, "halslutning": neck_slope, "halssnitt": round(float(neck), 4),
            "halsbredd_per_langd": neck_width and round(neck_width, 4), "krage_overkant": krage and round(float(krage), 4),
            "halskvoter_per_niva": neck_ratios, "halsanpassning": neck_fit, "hudton": skin_report, "hander": hands,
            "trianglar": {"Kropp": len(rest.faces), "Huvud": len(head.faces), "Handpar": len(hand_part.faces),
                          "Skarvar": len(neck_seam.faces)}}


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("kropp", type=Path)
    ap.add_argument("huvud", type=Path)
    ap.add_argument("ut", type=Path)
    ap.add_argument("--hudref", type=Path, help="Ansiktsbilden ur steg 01 (head-ref.png) som hudtonen sätts efter.")
    a = ap.parse_args()
    rep = sy_pa_huvud(a.kropp, a.huvud, a.ut, a.hudref)
    text = json.dumps(rep, indent=1, ensure_ascii=False, default=float)
    a.ut.with_suffix(".json").write_text(text, encoding="utf-8")
    print(text)
