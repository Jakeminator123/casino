"""Fit an upright Meshy head and a right-hand donor to a frontal, horizontal T-pose."""

from pathlib import Path

import numpy as np

from bygg_modul import Asset, Export, Mesh, clip
from bygg import bridge
from standardmatt import HALS_BREDDKVOT, HALSSNITT, HANDLANGD, halssnitt, handled, kroppsmatt


def surface(asset):
    return Mesh(asset.pos, asset.nor, asset.uv, asset.faces)


def rotate(mesh, matrix):
    winding = mesh.faces if np.linalg.det(matrix) > 0 else mesh.faces[:, ::-1]
    return Mesh(mesh.pos @ matrix, mesh.nor @ matrix, mesh.uv, winding)


def centered_loop(mesh, indices):
    rim = mesh.pos[indices]
    center = (rim.max(axis=0) + rim.min(axis=0)) / 2
    x, z = (rim - center)[:, [0, 2]].T
    if np.sum(z * np.roll(x, -1) - x * np.roll(z, -1)) < 0:
        indices, x, z = indices[::-1], x[::-1], z[::-1]
    return center, np.roll(indices, -np.argmin(np.abs(np.arctan2(x, z))))


def attach(body, donor, frame, level, slope, tip, gap, body_atlas, donor_atlas, limits=(0.4, 2.5)):
    # The positive local Y axis points out of the body at each joint.
    stump, lower = clip(rotate(body, frame), level, False, slope)
    stump_center, lower = centered_loop(stump, lower)
    axial = donor.pos[:, 1] + slope * donor.pos[:, 2]
    part, upper = clip(donor, axial.min() + np.ptp(axial) * 0.004, True, slope)
    part_center, upper = centered_loop(part, upper)
    scale = (tip - stump_center[1] - gap) / (part.pos[:, 1].max() - part_center[1])
    if scale <= 0:
        raise ValueError("The donor and the body must point in the same direction.")
    part.pos = (part.pos - part_center) * scale
    # Bring both widths together gradually near the opening, keeping the face and fingers intact.
    ratio = np.ptp(stump.pos[lower][:, [0, 2]], axis=0) / np.ptp(part.pos[upper][:, [0, 2]], axis=0)
    if not np.all((ratio > limits[0]) & (ratio < limits[1])):
        raise ValueError("Joint proportions differ too much. Check the T-pose and the cut positions.")
    extent = np.ptp(part.pos[:, 1]) * 0.22
    height = part.pos[:, 1] + slope * part.pos[:, 2]
    t = np.clip(height / extent, 0, 1)
    weight = 1 - t * t * (3 - 2 * t)
    stretch = 1 + weight[:, None] * (ratio - 1)
    dx, dz = (part.pos[:, [0, 2]] * (stretch - 1)).T
    # In coordinates (x, y+slope*z, z) this warp scales the two radial axes.
    dw = -6 * t * (1 - t) / extent
    nx, ny, nz = part.nor.T
    new_x = nx / stretch[:, 0]
    new_z = (nz - slope * ny) / stretch[:, 1]
    new_y = ny - dw * (part.pos[:, 0] * (ratio[0]-1) * new_x + part.pos[:, 2] * (ratio[1]-1) * new_z)
    normals = np.column_stack((new_x, new_y, new_z + slope * new_y))
    part.nor = normals / np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
    part.pos += np.column_stack((dx, -slope * dz, dz)) + stump_center + [0, gap, 0]
    seam = bridge(stump, lower, part, upper, body_atlas, donor_atlas)
    return tuple(rotate(m, frame.T) for m in (stump, part, seam))


def assemble(body_file, head_file, hands_file, output, *, neck=None, wrist=None):
    """Montera kropp, huvud och handpar.

    neck=None lägger halssnittet i halsens smala del (standardmatt.halssnitt). Ett tal
    ger en fast andel av kroppslängden, som standardmatt.HALSSNITT.
    wrist=None placerar handledssnittet vid armens faktiska handled (smalaste tvärsnittet
    nära handen, se standardmatt.handled). Ett tal ger det gamla bråkdelsmåttet från mitten.
    """
    body_asset, head_asset, hands_asset = (Asset(p) for p in (body_file, head_file, hands_file))
    body, head, right = map(surface, (body_asset, head_asset, hands_asset))
    if {n.get("name") for n in hands_asset.g["nodes"]} != {"Hand.R", "Hand.L"}:
        raise ValueError("Expected the paired hand module from bygg_modul.")
    atlas = body_asset.color()
    low, high = body.pos.min(axis=0), body.pos.max(axis=0)
    height = high[1] - low[1]
    center_x = (high[0] + low[0]) / 2
    original_pos = body.pos.copy()
    neck_width = None
    if neck is None:
        neck, neck_width = halssnitt(original_pos, height)
    report = {"kropp": kroppsmatt(original_pos), "halssnitt": round(neck, 4),
              "halsbredd_per_langd": neck_width and round(neck_width, 4), "handleder": {}}
    body, head, neck_seam = attach(body, head, np.eye(3), low[1] + height * neck, 0.22,
                                   high[1], height * 0.003, atlas, head_asset.color(),
                                   limits=HALS_BREDDKVOT)
    pieces = [(head, 1), (neck_seam, 3)]
    if wrist is None:
        # Kroppen är symmetrisk: mät båda handlederna och använd samma handlängd på båda
        # sidor. Skiljer de sig åt har ena sidan oftast fastnat i en ärmkant längre in.
        shares = {}
        for side in (-1, 1):
            wrist_x, tip_x = handled(original_pos, side, height)
            shares[side] = abs(tip_x - wrist_x) / height
        if abs(shares[-1] - shares[1]) > 0.008:
            shares = dict.fromkeys(shares, min(shares.values()))
    hand_atlas = hands_asset.color()
    for side, hand in ((-1, right), (1, rotate(right, np.diag([-1, 1, 1])))):
        frame = np.array([[0, side, 0], [0, 0, 1], [side, 0, 0]])
        tip = high[0] if side == 1 else -low[0]
        if wrist is None:
            cut = tip - shares[side] * height
        else:
            cut = side * center_x + wrist * (tip - side * center_x)
        share = (tip - cut) / height
        report["handleder"]["hoger" if side == -1 else "vanster"] = {
            "snitt_x": round(float(side * cut), 4), "handlangd_per_langd": round(float(share), 3)}
        if not HANDLANGD[0] * 0.8 <= share <= HANDLANGD[1] * 1.25:
            raise ValueError(
                f"Handledssnittet ger handlängd {share:.3f} av kroppslängden. Kontrollera T-posen.")
        body, fitted, seam = attach(body, hand, frame, cut, 0, tip, height * 0.002, atlas, hand_atlas)
        pieces.extend([(fitted, 2), (seam, 3)])
    result = Export()
    result.g["asset"]["generator"] = "avatar / montera"
    result.g["nodes"][0]["name"] = result.g["meshes"][0]["name"] = Path(output).stem
    for source, name in ((body_asset, "Kropp"), (head_asset, "Huvud"), (hands_asset, "Handpar")):
        result.material(source, name)
    result.g["materials"].append({"name": "Skarvar", "doubleSided": True, "pbrMetallicRoughness": {
        "metallicFactor": 0.0, "roughnessFactor": 0.62}})
    for mesh, material in [(body, 0), *pieces]:
        result.mesh(mesh, material, colored=material == 3)
    tmp = output.with_suffix(".tmp")
    result.write(tmp)
    tmp.replace(output)
    return report
