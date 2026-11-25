"""Read interleaved attributes and embedded textures from the two source GLBs."""

import io
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image

TYPES = {5120: "i1", 5121: "u1", 5122: "<i2", 5123: "<u2", 5125: "<u4", 5126: "<f4"}
SIZE = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


class Asset:
    def __init__(self, path):
        self.path = Path(path)
        self.raw = self.path.read_bytes()
        n = struct.unpack_from("<I", self.raw, 12)[0]
        self.g = json.loads(self.raw[20 : 20 + n])
        self.bin = memoryview(self.raw)[28 + n :]
        prim = self.g["meshes"][0]["primitives"][0]
        self.pos = self.access(prim["attributes"]["POSITION"])
        self.nor = self.access(prim["attributes"]["NORMAL"])
        self.uv = self.access(prim["attributes"]["TEXCOORD_0"])
        self.faces = self.access(prim["indices"]).reshape(-1, 3)
        self.mat = self.g["materials"][prim.get("material", 0)]

    def access(self, i):
        a = self.g["accessors"][i]
        v = self.g["bufferViews"][a["bufferView"]]
        c = SIZE[a["type"]]
        t = np.dtype(TYPES[a["componentType"]])
        stride = v.get("byteStride", c * t.itemsize)
        return np.ndarray(
            (a["count"], c),
            dtype=t,
            buffer=self.bin,
            offset=v.get("byteOffset", 0) + a.get("byteOffset", 0),
            strides=(stride, t.itemsize),
        )

    def image_data(self, i):
        img = self.g["images"][i]
        v = self.g["bufferViews"][img["bufferView"]]
        s = v.get("byteOffset", 0)
        return bytes(self.bin[s : s + v["byteLength"]])

    def color(self):
        k = self.mat["pbrMetallicRoughness"]["baseColorTexture"]["index"]
        return np.array(
            Image.open(io.BytesIO(self.image_data(self.g["textures"][k]["source"]))).convert("RGB")
        )
