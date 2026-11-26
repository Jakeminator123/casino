"""QC (vanlig Python med Pillow + numpy, inte Blender). Ritar spelets egna pixlar/ledpunkter genom filmlinsen över en Blender-rendering.
Användning: python verktyg/qc_sida_vid_sida.py <dealer3d.json> <standard.json> <render.png> <bildruta> <ut.png> (README-SV.md, Kontroll)."""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from gemensamt.standard import spelets_dump
sp = spelets_dump()['spelet']
L = sp['lens']; W, H = sp['FILM']['width'], sp['FILM']['height']
p = L['pitch']; f = np.array([0, -math.sin(p), -math.cos(p)]); right = np.array([1.0, 0, 0]); up = np.cross(right, f)
eye = np.array([0, L['height'], 0]); cx, cy = (W - 1) / 2, (H - 1) / 2
def px(q, k=1.0):
    d = np.array(q) - eye; z = d @ f
    return ((cx + L['focalPx'] * (d @ right) / z) * k, (cy - L['focalPx'] * (d @ up) / z) * k)
# kontroll mot spelets pixlar
err = max(math.dist(px(s['at']), (s['pixel']['x'], s['pixel']['y'])) for s in sp['spots'])
CH = [(0,1,2,3,4),(0,5,6,7,8),(0,9,10,11,12),(0,13,14,15,16),(0,17,18,19,20)]
def stick(g, fr, k, col, wid=3):
    for side in 'LR':
        a = fr[side]; pts = [px(a['s'], k), px(a['e'], k), px(a['w'], k)]
        g.line(pts, fill=col, width=wid)
        for ch in CH:
            g.line([px(a['p'][i], k) for i in ch], fill=col, width=1)
    sh = [px(fr['R']['s'], k), px(fr['L']['s'], k)]; g.line(sh, fill=col, width=wid)
    hx, hy = px(fr['h'], k); g.ellipse([hx-12*k*1.33, hy-12*k*1.33, hx+12*k*1.33, hy+12*k*1.33], outline=col, width=2)
    if 'card' in fr:
        cx_, cy_ = px(fr['card']['c'], k); g.rectangle([cx_-4, cy_-4, cx_+4, cy_+4], outline=col)
if __name__ == '__main__':
    orig, std, render, frame, out = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
    A = json.load(open(orig)); B = json.load(open(std))
    R = Image.open(render).convert('RGB'); k = R.width / W
    left = Image.new('RGB', R.size, (28, 30, 34)); gl = ImageDraw.Draw(left)
    for s in sp['spots']:
        x, y = px(s['at'], k); gl.rectangle([x-3, y-3, x+3, y+3], outline=(90, 140, 90))
    fa = A['frames'][frame - 1]; stick(gl, fa, k, (255, 170, 60))
    gl.text((10, 10), f"dealer3d (Paow): {orig.split('/')[-1]}  bildruta {frame}", fill=(255, 255, 255))
    gr = ImageDraw.Draw(R); stick(gr, B['frames'][frame - 1], k, (80, 220, 255), 2)
    for side in 'LR':
        x, y = px(fa[side]['w'], k); gr.ellipse([x-6, y-6, x+6, y+6], outline=(255, 0, 255), width=2)
    gr.text((10, 10), 'Blender standarddocka (render) + cyan = exporterad JSON, magenta = Paows handleder', fill=(255, 255, 255))
    both = Image.new('RGB', (R.width * 2, R.height)); both.paste(left, (0, 0)); both.paste(R, (R.width, 0)); both.save(out)
    print('ok', out, 'projektionsfel mot spelets pixlar (px):', round(err, 3))
