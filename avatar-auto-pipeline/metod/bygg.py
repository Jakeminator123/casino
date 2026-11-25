"""Klipper en mesh, syr en skarv och skriver GLB. Monteringen anropar de här funktionerna."""

import copy
import json
import struct
from collections import defaultdict
from dataclasses import dataclass
import numpy as np
from gltf import Asset

# Y is up in glTF. The plane rises towards the nape, above the donor's shirt collar.
SLOPE = 0.40
CENTER_XZ = np.array([0.0, -0.042])
TAU = 2 * np.pi


@dataclass
class Mesh:
    pos: np.ndarray
    nor: np.ndarray
    uv: np.ndarray
    faces: np.ndarray


def unit(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-10)


def clip(mesh, level, above, slope=SLOPE):
    s = mesh.pos[:, 1].astype(float) + slope * mesh.pos[:, 2] - level
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
    result = Mesh(
        np.vstack((mesh.pos, add_p))[used],
        np.vstack((mesh.nor, add_n))[used],
        np.vstack((mesh.uv, add_uv))[used],
        index[faces],
    )
    return result, ordered_ring(result.pos, index[np.array(pairs)])


def angle(pos):
    xz = pos[:, [0, 2]] - CENTER_XZ
    return np.arctan2(xz[:, 0], xz[:, 1]) % TAU


def ordered_ring(pos, segments):
    # Walk actual cut edges; coincident UV-split vertices denote the same physical seam.
    def key(i):
        return tuple(np.rint(pos[i, [0, 2]] * 1e6).astype("i8"))

    links, ids = defaultdict(set), {}
    for i, j in segments:
        a, b = key(i), key(j)
        ids.setdefault(a, i)
        ids.setdefault(b, j)
        if a != b:
            links[a].add(b)
            links[b].add(a)
    if any(len(adj) != 2 for adj in links.values()):
        raise ValueError("Neck boundary is not a ring")
    start = min(links, key=lambda k: abs(np.arctan2(pos[ids[k], 0], pos[ids[k], 2] - CENTER_XZ[1])))
    keys = [start]
    previous, curr = start, next(iter(links[start]))
    while curr != start:
        keys.append(curr)
        (following,) = links[curr] - {previous}
        previous, curr = curr, following
    if len(keys) != len(links):
        raise ValueError("Cut includes multiple disconnected contours")
    loop = np.asarray([ids[k] for k in keys])
    if np.median(np.diff(np.unwrap(angle(pos[loop])))) < 0:
        loop = np.r_[loop[0], loop[:0:-1]]
    return loop


def vertex_colors(atlas, uv):
    xy = np.mod(uv, 1) * [atlas.shape[1], atlas.shape[0]] - 0.5
    x0, y0 = np.floor(xy).astype(int).T
    fx, fy = (xy - np.floor(xy)).T[:, :, None]
    h, w = atlas.shape[:2]
    a = atlas[y0 % h, x0 % w] * (1 - fx) + atlas[y0 % h, (x0 + 1) % w] * fx
    b = atlas[(y0 + 1) % h, x0 % w] * (1 - fx) + atlas[(y0 + 1) % h, (x0 + 1) % w] * fx
    c = ((1 - fy) * a + fy * b) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def bridge(body, lower, head, upper, body_atlas, head_atlas):
    pos = np.vstack((body.pos[lower], head.pos[upper]))
    nor = np.vstack((body.nor[lower], head.nor[upper]))
    color = np.vstack(
        (vertex_colors(body_atlas, body.uv[lower]), vertex_colors(head_atlas, head.uv[upper]))
    )
    n, m = len(lower), len(upper)
    # Choose the shortest, outward-facing triangulation of the two edge loops.
    # A greedy angular zipper can invert tiny facets where an edge doubles back.
    lo = np.r_[np.arange(n), 0][:, None]
    hi = np.r_[np.arange(m), 0][None, :] + n

    def cost(a, b, c):
        normal = np.cross(pos[b] - pos[a], pos[c] - pos[a])
        outward = (unit(normal) * unit(nor[a] + nor[b] + nor[c])).sum(axis=2)
        longest = np.maximum.reduce(
            np.broadcast_arrays(
                np.linalg.norm(pos[b] - pos[a], axis=2),
                np.linalg.norm(pos[c] - pos[b], axis=2),
                np.linalg.norm(pos[a] - pos[c], axis=2),
            )
        )
        return (longest / 0.01) ** 2 + 2 * (1 - outward) + 10000 * (outward <= 0)

    lower_cost = cost(lo[:-1], lo[1:], hi)
    upper_cost = cost(lo, hi[:, 1:], hi[:, :-1])
    score = np.full((n + 1, m + 1), np.inf)
    advance_lower = np.zeros((n + 1, m + 1), dtype=bool)
    score[0, 0] = 0
    for i in range(n + 1):
        for j in range(m + 1):
            if i == j == 0:
                continue
            a = score[i - 1, j] + lower_cost[i - 1, j] if i else np.inf
            b = score[i, j - 1] + upper_cost[i, j - 1] if j else np.inf
            advance_lower[i, j] = a <= b
            score[i, j] = min(a, b)
    i, j = n, m
    faces = []
    while i or j:
        if advance_lower[i, j]:
            i -= 1
            faces.append((i % n, (i + 1) % n, n + j % m))
        else:
            j -= 1
            faces.append((i % n, n + (j + 1) % m, n + j % m))
    return Mesh(pos, unit(nor), color, np.array(faces))


class Export:
    def __init__(self):
        self.data = bytearray()
        self.g = {
            "asset": {"version": "2.0", "generator": "Jakob / local head swap"},
            "scene": 0,
            "scenes": [{"nodes": [0]}],
            "nodes": [{"name": "Jakob", "mesh": 0}],
            "meshes": [{"name": "Jakob", "primitives": []}],
            "materials": [],
            "textures": [],
            "images": [],
            "samplers": [],
            "bufferViews": [],
            "accessors": [],
            "buffers": [],
        }

    def view(self, content, target=None):
        self.data.extend(b"\0" * (-len(self.data) % 4))
        v = {"buffer": 0, "byteOffset": len(self.data), "byteLength": len(content)}
        if target:
            v["target"] = target
        self.g["bufferViews"].append(v)
        self.data.extend(content)
        return len(self.g["bufferViews"]) - 1

    def material(self, source, name):
        textures = self.g["textures"]
        offset = len(textures)
        sampler_base = len(self.g["samplers"])
        self.g["samplers"].extend(copy.deepcopy(source.g.get("samplers", [])))
        image_base = len(self.g["images"])
        for i, image in enumerate(source.g["images"]):
            self.g["images"].append(
                {
                    "mimeType": image["mimeType"],
                    "bufferView": self.view(source.image_data(i)),
                    "name": f"{name} {i + 1}",
                }
            )
        for texture in source.g["textures"]:
            tex = copy.deepcopy(texture)
            tex["source"] += image_base
            if "sampler" in tex:
                tex["sampler"] += sampler_base
            textures.append(tex)
        mat = copy.deepcopy(source.mat)
        mat["name"] = name
        for container, key in [
            (mat["pbrMetallicRoughness"], "baseColorTexture"),
            (mat["pbrMetallicRoughness"], "metallicRoughnessTexture"),
            (mat, "normalTexture"),
        ]:
            container[key]["index"] += offset
        self.g["materials"].append(mat)

    def array(self, a, tag):
        idx = tag == "INDICES"
        a = np.ascontiguousarray(a, dtype="<u4" if idx else "<f4")
        data = {
            "bufferView": self.view(a.tobytes(), 34963 if idx else 34962),
            "componentType": 5125 if idx else 5126,
            "count": a.size if idx else len(a),
            "type": "SCALAR" if idx else f"VEC{a.shape[1]}",
        }
        if tag == "POSITION":
            data.update(min=a.min(0).tolist(), max=a.max(0).tolist())
        self.g["accessors"].append(data)
        return len(self.g["accessors"]) - 1

    def mesh(self, mesh, material, colored=False):
        attr = {
            key: self.array(values, key)
            for key, values in [
                ("POSITION", mesh.pos),
                ("NORMAL", mesh.nor),
                ("COLOR_0" if colored else "TEXCOORD_0", mesh.uv),
            ]
        }
        prim = {
            "attributes": attr,
            "indices": self.array(mesh.faces, "INDICES"),
            "material": material,
            "mode": 4,
        }
        self.g["meshes"][0]["primitives"].append(prim)

    def write(self, path):
        self.data.extend(b"\0" * (-len(self.data) % 4))
        self.g["buffers"] = [{"byteLength": len(self.data)}]
        hdr = json.dumps(self.g, separators=(",", ":"), ensure_ascii=False).encode()
        hdr += b" " * (-len(hdr) % 4)
        with path.open("wb") as f:
            f.write(
                struct.pack("<4sIIII", b"glTF", 2, 28 + len(hdr) + len(self.data), len(hdr), 0x4E4F534A)
            )
            f.write(hdr)
            f.write(struct.pack("<II", len(self.data), 0x004E4942))
            f.write(self.data)
