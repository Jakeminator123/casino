"""Måttöverlägg på toppvyn (ortografisk kamera 'topp' ur standard.yaml). Pillow, inte Blender.
Användning: python verktyg/qc_topp_matt.py qc/bord_topp.png qc/bord_topp_matt.png"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent; sys.path.insert(0, str(ROOT))
from gemensamt import standard as S
std = S.load(); cam = std['kameror']['topp']; sc = cam['ortho_skala']; cx, cy = cam['pos'][0], cam['pos'][1]
im = Image.open(sys.argv[1]).convert('RGB'); W, H = im.size; g = ImageDraw.Draw(im)
P = lambda x, y: ((x - cx) / sc * W + W / 2, H / 2 - (y - cy) / sc * W)
Y0 = (255, 230, 0); C = (255, 0, 255); T = (0, 0, 0)
def dim(a, b, txt, off=(0, 0), col=Y0):
    pa, pb = P(*a), P(*b); g.line([pa, pb], fill=col, width=2)
    for p in (pa, pb):
        g.ellipse([p[0]-3, p[1]-3, p[0]+3, p[1]+3], fill=col)
    m = ((pa[0]+pb[0])/2 + off[0], (pa[1]+pb[1])/2 + off[1]); g.text(m, txt, fill=T)
b = std['bord']
dim((-b['radie'], -b['axel_s']), (b['radie'], -b['axel_s']), f"bredd {b['bredd']:.3f} m", (-40, 4))
dim((0.0, -b['fram_s']), (0.0, -b['bak_s']), f"djup {b['djup']:.3f} m", (6, 60))
o = P(0, 0); g.line([o[0]-15, o[1], o[0]+15, o[1]], fill=(255, 0, 0), width=2); g.line([o[0], o[1]-15, o[0], o[1]+15], fill=(255, 0, 0), width=2)
g.text((o[0]+6, o[1]+4), 'origo (dealerkant), +X ->, +Y upp', fill=(200, 0, 0))
for pid, p in std['platser'].items():
    if pid.endswith('C1') or pid.startswith('D'):
        q = P(p['pos'][0], p['pos'][1]); g.ellipse([q[0]-4, q[1]-4, q[0]+4, q[1]+4], outline=C, width=2)
        g.text((q[0]-30, q[1]+14 if pid.startswith('P') else q[1]-26), f"{pid} ({p['pos'][0]:+.3f}, {p['pos'][1]:+.3f})", fill=T)
sk = std['sko']; dim(sk['fot_fram'][:2], sk['fot_bak'][:2], f"sko {sk['langd']} m, yaw {sk['yaw_bakat']:.1f}°", (-30, -22), (0, 200, 255))
tr = std['markerbricka']; dim((tr['x0'], 0.03), (tr['x1'], 0.03), f"bricka {tr['x1']-tr['x0']:.2f} m", (-30, -18), (0, 220, 0))
d = std['docka']; q = P(*d['hoft'][:2]); g.rectangle([q[0]-5, q[1]-5, q[0]+5, q[1]+5], outline=(255, 120, 0), width=2); g.text((q[0]+8, q[1]-6), f"dockans höft (Y {d['hoft'][1]:+.2f})", fill=T)
g.text((8, 8), 'standard.yaml: topp ortografisk, 1 px = %.2f mm' % (sc / W * 1000), fill=T)
im.save(sys.argv[2]); print('ok', sys.argv[2])
