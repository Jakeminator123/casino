"""Montera ett 4K-huvud och ett separat handpar (från bygg_modul) på en A-pose-kropp från Meshy.

Halsen: samma geometriska smalaste-hals-snitt som montera.assemble.
Händerna: handledssnittet läggs vinkelrätt mot underarmens verkliga 3D-riktning, och snittet
begränsas till en cylinder kring armen (i A-pose skulle ett plant halvrumssnitt annars kapa benen).
Kragen hittas via hudfärg (skjortan ska vara tydligt icke-hudfärgad, standardklädseln är mörkblå).
Användning (pipeline-venv): python -B pipeline/montera_apose.py kropp.glb huvud.glb handpar.glb ut.glb
"""
import json, sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bygg_modul  # noqa: F401  (patchar bygg.ordered_ring)
import bygg
import montera
from bygg_modul import Asset, Export
from bygg import Mesh, unit
from montera import attach, rotate, surface
from standardmatt import HALS_BREDDKVOT, HANDLANGD, halssnitt, kroppsmatt

MASK = {}


def clip_masked(mesh, level, above, slope=bygg.SLOPE):
    """bygg.clip, men hörn utanför armcylindern räknas alltid som 'behåll'."""
    s = mesh.pos[:, 1].astype(float) + slope * mesh.pos[:, 2] - level
    if MASK and not above:
        ax, az, r = MASK["ax"], MASK["az"], MASK["r"]
        far = np.hypot(mesh.pos[:, 0] - ax, mesh.pos[:, 2] - az) > r
        s = np.where(far, -1.0, s)
    inside = s >= 0 if above else s <= 0
    tally = inside[mesh.faces].sum(axis=1)
    extra, cut_faces, pairs, intersections = [], [], [], {}
    base_count = len(mesh.pos)

    def edge_point(a, b):
        edge = tuple(sorted((int(a), int(b))))
        if edge not in intersections:
            a, b = edge
            f = s[a] / (s[a] - s[b])
            pos = mesh.pos[a].astype(float) + f * (mesh.pos[b].astype(float) - mesh.pos[a])
            pos[1] = level - slope * pos[2]
            nor = unit(mesh.nor[a] + f * (mesh.nor[b] - mesh.nor[a]))
            uv = mesh.uv[a] + f * (mesh.uv[b] - mesh.uv[a])
            intersections[edge] = base_count + len(extra)
            extra.append((pos, nor, uv))
        return intersections[edge]

    for face in mesh.faces[(tally > 0) & (tally < 3)]:
        poly, border = [], []
        for a, b in zip(face, np.roll(face, -1)):
            if inside[a]:
                poly.append(a)
            if inside[a] != inside[b]:
                vertex = edge_point(a, b)
                poly.append(vertex)
                border.append(vertex)
        pairs.append(border)
        for i in range(1, len(poly) - 1):
            cut_faces.append((poly[0], poly[i], poly[i + 1]))
    if not cut_faces:
        raise ValueError("The cut plane does not cross the source mesh")
    faces = np.concatenate((mesh.faces[tally == 3], np.asarray(cut_faces)), axis=0)
    used = np.unique(faces)
    index = np.full(base_count + len(extra), -1, dtype="i4")
    index[used] = np.arange(len(used))
    add_p, add_n, add_uv = map(np.asarray, zip(*extra))
    result = Mesh(np.vstack((mesh.pos, add_p))[used], np.vstack((mesh.nor, add_n))[used],
                  np.vstack((mesh.uv, add_uv))[used], index[faces])
    return result, bygg.ordered_ring(result.pos, index[np.array(pairs)])


montera.clip = clip_masked


def rodrigues(a, b):
    a, b = unit(np.asarray(a, float)), unit(np.asarray(b, float))
    v, c = np.cross(a, b), float(a @ b)
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3)
    k = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + k + k @ k / (1 + c)


def underarm(pos, side, H):
    """Fingertopp, underarmens riktning (från armbåge mot hand) och handledens läge längs den."""
    lateral = pos[:, 0] * side
    tip = pos[np.argmax(lateral)]
    shoulder = np.array([side * 0.11 * H, pos[:, 1].min() + 0.81 * H, 0.0])
    d = unit(tip - shoulder)
    for _ in range(3):
        rel = pos - tip
        along = rel @ d
        radial = np.linalg.norm(rel - np.outer(along, d), axis=1)
        sel = pos[(along < -0.10 * H) & (along > -0.24 * H) & (radial < 0.05 * H)]
        if len(sel) < 50:
            break
        c = sel.mean(0)
        _, _, vt = np.linalg.svd(sel - c, full_matrices=False)
        nd = vt[0] if vt[0] @ d > 0 else -vt[0]
        d = unit(nd)
        # Linjen går genom armens mitt: flytta 'tip' så axeln passerar c.
        tip_axis = c + d * ((tip - c) @ d)
    else:
        tip_axis = tip
    rel = pos - tip_axis
    along = rel @ d
    radial = np.linalg.norm(rel - np.outer(along, d), axis=1)
    near = radial < 0.06 * H
    tipv = along[near].max()
    # Smalaste tvärsnittet 6–16 % av längden innanför fingertoppen.
    step = 0.004 * H
    best, best_area = None, np.inf
    for a in np.arange(tipv - 0.16 * H, tipv - 0.06 * H, step):
        m = near & (along >= a) & (along < a + step)
        if m.sum() < 8:
            continue
        q = rel[m] - np.outer(along[m], d)
        e1 = unit(np.cross(d, [0, 0, 1.0])); e2 = np.cross(d, e1)
        area = np.ptp(q @ e1) * np.ptp(q @ e2)
        if area < best_area:
            best, best_area = a + step / 2, area
    return {"axel_punkt": tip_axis, "riktning": d, "spets": tipv, "handled": best}


def assemble_apose(body_file, head_file, hands_file, output):
    body_asset, head_asset, hands_asset = (Asset(p) for p in (body_file, head_file, hands_file))
    body, head, right = map(surface, (body_asset, head_asset, hands_asset))
    if {n.get("name") for n in hands_asset.g["nodes"]} != {"Hand.R", "Hand.L"}:
        raise ValueError("Expected the paired hand module from bygg_modul.")
    atlas = body_asset.color()
    low, high = body.pos.min(axis=0), body.pos.max(axis=0)
    H = high[1] - low[1]
    original = body.pos.copy()
    neck, neck_width = halssnitt(original, H)
    # Skjortkrage: lägg halssnittet ovanför kragen, där tvärsnittet bara är hud, på halsens smalaste nivå.
    colors0 = np.asarray(bygg.vertex_colors(atlas, body_asset.uv), float)[:, :3]
    colors0 = colors0 / (255 if colors0.max() > 1.5 else 1)
    skin0 = (colors0[:, 0] > colors0[:, 2] + 0.06) & (colors0[:, 0] > 0.3)
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
    neck_ratios = {}
    if krage is not None and best is not None:
        # Välj den nivå mellan kragens överkant och halsens smalaste där huvudets hals och kroppens
        # hals är lika breda (kvot närmast 1), så att halsen varken vidgas (kobra) eller nyps ihop.
        def ratio_at(level):
            stump, lower = montera.clip(body, low[1] + level * H, False, 0.22)
            sc, lower = montera.centered_loop(stump, lower)
            axial = head.pos[:, 1] + 0.22 * head.pos[:, 2]
            part, upper = montera.clip(head, axial.min() + np.ptp(axial) * 0.004, True, 0.22)
            pc, upper = montera.centered_loop(part, upper)
            scale = (high[1] - sc[1] - H * 0.003) / (part.pos[:, 1].max() - pc[1])
            return np.ptp(stump.pos[lower][:, [0, 2]], axis=0) / (np.ptp(part.pos[upper][:, [0, 2]], axis=0) * scale)
        for level in np.arange((start if start is not None else neck) + 0.025, min(neck, start or neck) - 0.0001, -0.0025):
            try:
                neck_ratios[round(float(level), 4)] = np.round(ratio_at(level), 3).tolist()
            except ValueError:
                continue
        if neck_ratios:
            lvl = min(neck_ratios, key=lambda k: max(abs(np.log(neck_ratios[k]))))
            neck, neck_width = lvl, None
    # Smalna av kroppens hals/krage mot snittet så att den möter huvudmodulens hals med kvot ~1
    # (annars vidgas huvudets hals nedåt till en tjur-/kobrahals). Mjuk övergång över 5 % av längden.
    neck_fit = None
    try:
        r = np.asarray(ratio_at(neck), float) if krage is not None else None
    except Exception:
        r = None
    if r is not None and np.any(r > 1.02):
        level_y = low[1] + neck * H
        band = 0.05 * H
        ring = (np.abs(body.pos[:, 1] + 0.22 * body.pos[:, 2] - level_y) < 0.003 * H) & (np.abs(body.pos[:, 0]) < 0.12 * H)
        cx, cz = np.median(body.pos[ring][:, 0]), np.median(body.pos[ring][:, 2])
        f = 1 / np.maximum(r, 1.0)
        pos = body.pos.astype(float)
        dx, dz = pos[:, 0] - cx, pos[:, 2] - cz
        t = np.clip((pos[:, 1] + 0.22 * pos[:, 2] - (level_y - band)) / band, 0, None)
        t = np.where(t > 1, 1.0, t * t * (3 - 2 * t))
        near = np.hypot(dx, dz) < 0.11 * H
        t = np.where(near, t, 0.0)
        pos[:, 0] = cx + dx * (1 + t * (f[0] - 1))
        pos[:, 2] = cz + dz * (1 + t * (f[1] - 1))
        body = Mesh(pos.astype(body.pos.dtype), body.nor, body.uv, body.faces)
        neck_fit = {"kvot_fore": np.round(r, 3).tolist(), "kvot_efter": np.round(ratio_at(neck), 3).tolist()}
    report = {"halsanpassning": neck_fit, "krage_overkant": krage and round(float(krage), 4), "halskvoter_per_niva": neck_ratios, "langd_m": round(float(H), 4), "halssnitt": round(neck, 4), "halsbredd_per_langd": neck_width and round(neck_width, 4),
              "handleder": {}}
    body, head, neck_seam = attach(body, head, np.eye(3), low[1] + H * neck, 0.22, high[1], H * 0.003, atlas,
                                   head_asset.color(), limits=HALS_BREDDKVOT)
    pieces = [(head, 1), (neck_seam, 3)]
    arms = {side: underarm(original, side, H) for side in (-1, 1)}
    # Handen = hudfärgade hörn ytterst på armen (skjortans manschett är mörkblå). Snittet läggs
    # vinkelrätt mot underarmen strax innanför manschettkanten; handlängden mäts längs underarmen.
    colors = np.asarray(bygg.vertex_colors(atlas, body_asset.uv), float)[:, :3]
    colors = colors / (255 if colors.max() > 1.5 else 1)
    skin = (colors[:, 0] > colors[:, 2] + 0.06) & (colors[:, 0] > 0.3)
    starts, shares = {}, {}
    for side, a in arms.items():
        d = a["riktning"]
        rel = original - a["axel_punkt"]
        along = rel @ d
        radial = np.linalg.norm(rel - np.outer(along, d), axis=1)
        hand = skin & (radial < 0.09 * H) & (along > a["spets"] - 0.2 * H)
        if hand.sum() < 500:
            raise ValueError("Hittar ingen hudfärgad hand ytterst på armen.")
        starts[side] = float(np.percentile(along[hand], 0.5)) + 0.004 * H
        shares[side] = (float(along[hand].max()) - starts[side]) / H
        a["hand_horn"] = int(hand.sum())
    if abs(shares[-1] - shares[1]) > 0.008:
        shares = dict.fromkeys(shares, min(shares.values()))
    shares = {k: float(np.clip(v, HANDLANGD[0], HANDLANGD[1])) for k, v in shares.items()}
    hand_atlas = hands_asset.color()
    for side, hand in ((-1, right), (1, rotate(right, np.diag([-1, 1, 1])))):
        a = arms[side]
        d = a["riktning"]
        frame_t = np.array([[0, side, 0], [0, 0, 1], [side, 0, 0]], float)
        R = rodrigues([side, 0, 0], d)
        frame = R @ frame_t
        assert np.allclose(frame[:, 1], d, atol=1e-6)
        p0 = a["axel_punkt"]
        cut = float(p0 @ d + starts[side])  # handledssnittet längs underarmen (lokal Y)
        tip = cut + shares[side] * H  # donatorhandens fingertopp, rak handled
        local_axis = p0 @ frame
        MASK.update(ax=float(local_axis[0]), az=float(local_axis[2]), r=0.09 * H)
        try:
            body, fitted, seam = attach(body, hand, frame, cut, 0, tip, H * 0.002, atlas, hand_atlas)
        finally:
            MASK.clear()
        share = (tip - cut) / H
        vinkel = float(np.degrees(np.arccos(abs(d[1]))))
        report["handleder"]["hoger" if side == -1 else "vanster"] = {
            "underarm_riktning": np.round(d, 4).tolist(), "underarm_vinkel_fran_lodlinje_grader": round(vinkel, 1),
            "handlangd_per_langd": round(float(share), 3), "hudhorn_i_handen": a["hand_horn"]}
        if not HANDLANGD[0] <= share <= HANDLANGD[1]:
            raise ValueError(f"Handlängd {share:.3f} av kroppslängden ligger utanför {HANDLANGD}.")
        pieces.extend([(fitted, 2), (seam, 3)])
    result = Export()
    result.g["asset"]["generator"] = "avatar / montera_apose"
    result.g["nodes"][0]["name"] = result.g["meshes"][0]["name"] = Path(output).stem
    for source, name in ((body_asset, "Kropp"), (head_asset, "Huvud"), (hands_asset, "Handpar")):
        result.material(source, name)
    result.g["materials"].append({"name": "Skarvar", "doubleSided": True, "pbrMetallicRoughness": {
        "metallicFactor": 0.0, "roughnessFactor": 0.62}})
    for mesh, material in [(body, 0), *pieces]:
        result.mesh(mesh, material, colored=material == 3)
    tmp = Path(output).with_suffix(".tmp")
    result.write(tmp)
    tmp.replace(output)
    return report


if __name__ == "__main__":
    b, h, hp, out = map(Path, sys.argv[1:5])
    rep = assemble_apose(b, h, hp, out)
    print(json.dumps(rep, indent=1, ensure_ascii=False))
    out.with_name("montering.json").write_text(json.dumps(rep, indent=1, ensure_ascii=False), encoding="utf-8")
