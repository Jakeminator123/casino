"""Gemensamma bpy-hjälpare för scen-skripten (läser scen/standard.yaml via gemensamt/standard.py)."""
import math, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
import bpy, bmesh
from mathutils import Vector, Matrix
from gemensamt import standard as S

STD = S.load()


def hexcol(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    lin = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (*[lin(v) for v in c], 1.0)


def coll(name, parent=None):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    p = parent or bpy.context.scene.collection
    if c.name not in [x.name for x in p.children]:
        p.children.link(c)
    return c


def obj_from_bm(name, bm, collection, mat=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if mat:
        me.materials.append(mat) if isinstance(mat, bpy.types.Material) else [me.materials.append(m) for m in mat]
    ob = bpy.data.objects.new(name, me); collection.objects.link(ob); return ob


def tex_node(nt, path, noncolor=False):
    n = nt.nodes.new('ShaderNodeTexImage')
    img = bpy.data.images.load(str(path), check_existing=True)
    if noncolor:
        img.colorspace_settings.name = 'Non-Color'
    n.image = img; return n


def pbr(name, color=(0.8, 0.8, 0.8, 1), rough=0.5, metal=0.0, maps=None, tile=1.0, tint=None, spec=0.5):
    """maps: {'diff','nor','rough'} filvägar; tile: meter per texturruta (objektets UV i meter)."""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bs.outputs[0], out.inputs[0])
    bs.inputs['Base Color'].default_value = color; bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    if maps:
        uv = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (1 / tile, 1 / tile, 1 / tile); nt.links.new(uv.outputs['UV'], mp.inputs[0])
        if 'diff' in maps:
            d = tex_node(nt, maps['diff']); nt.links.new(mp.outputs[0], d.inputs[0])
            if tint:
                mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
                mix.inputs['Factor'].default_value = 1.0
                bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(d.outputs[0], bw.inputs[0])
                gain = nt.nodes.new('ShaderNodeMath'); gain.operation = 'MULTIPLY'; gain.inputs[1].default_value = tint[1]
                nt.links.new(bw.outputs[0], gain.inputs[0])
                nt.links.new(gain.outputs[0], mix.inputs[6]); mix.inputs[7].default_value = tint[0]
                nt.links.new(mix.outputs[2], bs.inputs['Base Color'])
            else:
                nt.links.new(d.outputs[0], bs.inputs['Base Color'])
        if 'rough' in maps:
            r = tex_node(nt, maps['rough'], True); nt.links.new(mp.outputs[0], r.inputs[0]); nt.links.new(r.outputs[0], bs.inputs['Roughness'])
        if 'nor' in maps:
            n = tex_node(nt, maps['nor'], True); nm = nt.nodes.new('ShaderNodeNormalMap')
            nt.links.new(mp.outputs[0], n.inputs[0]); nt.links.new(n.outputs[0], nm.inputs['Color']); nt.links.new(nm.outputs[0], bs.inputs['Normal'])
    return m


def uv_planar(bm, scale=1.0, axes=(0, 1)):
    lay = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for l in f.loops:
            co = l.vert.co; l[lay].uv = (co[axes[0]] / scale, co[axes[1]] / scale)


def look_at(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def make_cameras(collection, names=None):
    cams = {}
    res = STD['lins']['bild_px']
    for name, c in STD['kameror'].items():
        if names and name not in names:
            continue
        cd = bpy.data.cameras.new('kam_' + name)
        if c['typ'] == 'ortografisk':
            cd.type = 'ORTHO'; cd.ortho_scale = c['ortho_skala']
        else:
            cd.lens = c['brannvidd_mm']; cd.sensor_width = STD['lins']['sensor_mm']; cd.sensor_fit = 'HORIZONTAL'
        cd.clip_start = 0.01; cd.clip_end = 50
        ob = bpy.data.objects.new('kam_' + name, cd); collection.objects.link(ob)
        ob.location = c['pos']; look_at(ob, c['mal']); cams[name] = ob
    bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = res
    return cams
