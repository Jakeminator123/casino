"""Hjälpfunktioner när huvud och händer sys fast på kroppen.

Själva monteringen är montera_apose.assemble_apose.
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

import numpy as np

from bygg_modul import Mesh, clip
from bygg import bridge

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

def attach(body, donor, frame, level, slope, tip, gap, body_atlas, donor_atlas, limits=(0.4, 2.5), warp_frac=0.22):
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
        raise ValueError("Joint proportions differ too much. Check the pose and the cut positions.")
    extent = np.ptp(part.pos[:, 1]) * warp_frac
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
