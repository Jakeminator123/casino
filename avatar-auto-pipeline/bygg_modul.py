"""Cut a neck or wrist opening in an upright, static GLB from Meshy."""

import argparse
import sys
from pathlib import Path

import numpy as np

_here = Path(__file__).resolve().parent
for _cand in (_here / "metod", _here.parent / "Jakob/huvudbyte/metod", _here.parent / "avatar/Jakob/huvudbyte/metod"):
    if _cand.is_dir():
        sys.path.insert(0, str(_cand))
        break
import bygg as _bygg
from bygg import Export, Mesh, clip
from gltf import Asset

_ordered_ring = _bygg.ordered_ring


def _main_contour_ring(pos, segments):
    """Som bygg.ordered_ring, men tål hår, ärmar och lösa delar som snittet också korsar.

    Ett snitt genom hals eller handled kan träffa flera konturer, till exempel en page eller
    långt hår. Då behålls den minsta slutna konturen som omsluter modellens mittaxel (halsen
    eller armen). Övriga konturer blir öppna kanter på hårslingor och sys inte ihop.
    """
    try:
        return _ordered_ring(pos, segments)
    except ValueError:
        pass
    segments = [tuple(s) for s in segments if len(s) == 2]
    key = lambda i: tuple(np.rint(pos[i, [0, 2]] * 1e6).astype("i8"))
    parent = {}

    def find(a):
        while parent.setdefault(a, a) != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for i, j in segments:
        parent[find(key(i))] = find(key(j))
    groups = {}
    for n, (i, j) in enumerate(segments):
        groups.setdefault(find(key(i)), []).append(n)
    axis = np.median(pos[:, [0, 2]], axis=0)
    candidates = []
    for members in groups.values():
        sub = [segments[n] for n in members]
        if len(sub) < 6:
            continue
        try:
            loop = _ordered_ring(pos, sub)
        except ValueError:
            continue
        xy = pos[loop][:, [0, 2]]
        x, y = xy[:, 0] - axis[0], xy[:, 1] - axis[1]
        area = 0.5 * abs(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))
        crossings = ((y > 0) != (np.roll(y, -1) > 0)) & (
            x + (0 - y) * (np.roll(x, -1) - x) / np.where(np.roll(y, -1) == y, 1e-12, np.roll(y, -1) - y) > 0)
        candidates.append((not bool(np.sum(crossings) % 2), area, -len(loop), loop))
    if not candidates:
        raise ValueError("Snittet bildar ingen sluten kontur. Kontrollera snittnivån.")
    # Först konturer som omsluter mittaxeln, bland dem den minsta (halsen innanför håret).
    candidates.sort(key=lambda c: (c[0], c[1] if not c[0] else -c[1]))
    return candidates[0][3]


_bygg.ordered_ring = _main_contour_ring


def build(source, output, part, fraction, slope):
    if source.resolve() == output.resolve():
        raise ValueError("Choose a separate output file for the cut mesh.")
    asset = Asset(source)
    graph = asset.g
    node = graph["nodes"][0]
    if (
        len(graph["nodes"]) != 1
        or node.get("mesh") != 0
        or len(graph["meshes"]) != 1
        or len(graph["meshes"][0]["primitives"]) != 1
        or not np.allclose(node.get("matrix", np.eye(4).ravel()), np.eye(4).ravel())
        or any(key in node for key in ("translation", "rotation", "scale", "skin"))
        or graph.get("animations")
    ):
        raise ValueError("Expected one upright static Meshy mesh with its original axes.")
    if not 0 < fraction < 1:
        raise ValueError("The cut fraction must lie between zero and one.")
    heights = asset.pos[:, 1] + slope * asset.pos[:, 2]
    level = heights.min() + fraction * np.ptp(heights)
    cropped, ring = clip(Mesh(asset.pos, asset.nor, asset.uv, asset.faces), level, True, slope)
    rim = cropped.pos[ring]
    cropped.pos -= (rim.min(axis=0) + rim.max(axis=0)) / 2

    result = Export()
    name = "Huvud" if part == "huvud" else "Hand"
    result.g["asset"]["generator"] = "avatar / bygg_modul"
    result.g["meshes"][0]["name"] = name
    result.material(asset, name)
    result.mesh(cropped, 0)
    if part == "handpar":
        # Two nodes instance one surface and atlas. The reflected node has opposite handedness.
        x = cropped.pos[:, 0]
        offset = float(max(abs(x.min()), abs(x.max())) + np.ptp(x) * 0.06)
        result.g["nodes"] = [
            {"name": "Hand.R", "mesh": 0, "translation": [-offset, 0, 0]},
            {"name": "Hand.L", "mesh": 0, "translation": [offset, 0, 0], "scale": [-1, 1, 1]},
        ]
        result.g["scenes"][0]["nodes"] = [0, 1]
    else:
        result.g["nodes"][0]["name"] = name
    output.parent.mkdir(parents=True, exist_ok=True)
    tmp = output.with_suffix(".tmp")
    result.write(tmp)
    tmp.replace(output)
    print(f"{output.name}: {len(cropped.faces)} triangles per instance, {len(ring)} rim vertices")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("part", choices=("huvud", "handpar"))
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--cut", type=float, help="Cut fraction from the bottom (standard per part).")
    parser.add_argument("--slope", type=float, help="Rise towards the rear per depth unit.")
    args = parser.parse_args()
    from standardmatt import HANDSNITT_HAND, HUVUDSNITT_BYST, HUVUDSNITT_LUTNING
    cut = args.cut if args.cut is not None else (HUVUDSNITT_BYST if args.part == "huvud" else HANDSNITT_HAND)
    slope = args.slope if args.slope is not None else (HUVUDSNITT_LUTNING if args.part == "huvud" else 0)
    build(args.source, args.output, args.part, cut, slope)
