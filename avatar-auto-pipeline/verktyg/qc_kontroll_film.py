"""QC (vanlig Python med Pillow + numpy, inte Blender). Ritar spelets egna pixlar/ledpunkter genom filmlinsen över en Blender-rendering.
Användning: python verktyg/qc_kontroll_film.py <render.png> <ut.png> (README-SV.md, Kontroll)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from gemensamt.standard import spelets_dump
d = spelets_dump()['spelet']
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); k = im.width / d['FILM']['width']; g = ImageDraw.Draw(im)
def mark(x, y, c, r=7):
    x, y = x * k, y * k; g.ellipse([x-r, y-r, x+r, y+r], outline=c, width=2); g.line([x-r-4, y, x+r+4, y], fill=c); g.line([x, y-r-4, x, y+r+4], fill=c)
for s in d['spots']:
    mark(s['pixel']['x'], s['pixel']['y'], (255, 0, 255)); g.text((s['pixel']['x']*k+9, s['pixel']['y']*k-14), s['id'], fill=(255, 0, 255))
for nm in ('front', 'back'):
    p = d['SHOE']['foot'][nm]; mark(p['x'], p['y'], (0, 255, 255)); g.text((p['x']*k+9, p['y']*k+4), 'sko ' + nm, fill=(0, 255, 255))
g.line([0, 831.5*k, im.width, 831.5*k], fill=(255, 255, 0)); g.text((8, 831.5*k - 14), 'dealerkant rad 831,5 (spelet)', fill=(255, 255, 0))
g.text((8, 8), 'Magenta/cyan = spelets egna pixlar (placements/default.json, SHOE.foot). Ska ligga mitt i Blenders kort/skofot.', fill=(255, 255, 255))
im.save(dst)
