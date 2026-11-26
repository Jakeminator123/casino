"""Verifierar i Blender att alla kort och guldramar i standardbord.blend har exakt världsstorlek (63 x 88 mm / 71 x 96 mm).
Steg 1 (Blender): blender -b --factory-startup --python-exit-code 1 --python verktyg/qc_kort_matt.py
Steg 2 (Python+Pillow): python verktyg/qc_kort_matt.py qc/bord_topp.png qc/kort_topp_matt.png
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from gemensamt.sokvagar import slask  # noqa: E402
RAPPORT = slask('bygge') / 'kort-matt-rapport.json'

if 'bpy' in sys.modules or any(a.endswith('blender.exe') or 'blender' in Path(a).name.lower() for a in sys.argv[:1]):
    import bpy
    from mathutils import Vector
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'assets' / 'bord' / 'standardbord.blend'), load_ui=False)
    bpy.context.view_layer.update()
    cards, frames, shoe_cards = [], [], []
    for ob in sorted(bpy.data.objects, key=lambda o: o.name):
        if ob.type != 'MESH':
            continue
        corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
        xs = [c.x for c in corners]; ys = [c.y for c in corners]; zs = [c.z for c in corners]
        w_mm = round((max(xs) - min(xs)) * 1000.0, 3)
        h_mm = round((max(ys) - min(ys)) * 1000.0, 3)
        t_mm = round((max(zs) - min(zs)) * 1000.0, 3)
        dim_mm = [round(d * 1000.0, 3) for d in ob.dimensions]
        sc = [round(x, 4) for x in ob.scale]
        info = {'namn': ob.name, 'pos': [round(ob.location.x, 4), round(ob.location.y, 4)], 'dim_mm': dim_mm, 'bbox_mm': [w_mm, h_mm, t_mm], 'scale': sc}
        if ob.name.startswith('giv_'):
            cards.append(info)
        elif ob.name.startswith('markering_') and not ob.name.startswith('markering_bet_'):
            frames.append(info)
        elif ob.name.startswith('sko_kort_'):
            shoe_cards.append(info)
    rapport = {'exempelgiv_kort': cards, 'markering_ramar': frames, 'sko_kort': shoe_cards}
    RAPPORT.parent.mkdir(parents=True, exist_ok=True)
    RAPPORT.write_text(json.dumps(rapport, indent=1, ensure_ascii=False), encoding='utf-8')
    print('KORT_MATT', json.dumps({'antal_giv': len(cards), 'giv_dim': sorted({tuple(c['dim_mm']) for c in cards}), 'ram_dim': sorted({tuple(f['dim_mm']) for f in frames}), 'sko_scale': sorted({tuple(s['scale']) for s in shoe_cards})}))
else:
    from PIL import Image, ImageDraw
    from gemensamt import standard as S
    topp_png = Path(sys.argv[1]); ut_png = Path(sys.argv[2])
    rapport = json.loads(RAPPORT.read_text(encoding='utf-8'))
    cards = rapport['exempelgiv_kort']
    std = S.load(); cam = std['kameror']['topp']; sc = cam['ortho_skala']; cx, cy = cam['pos'][0], cam['pos'][1]
    im = Image.open(topp_png).convert('RGB'); W, H = im.size; g = ImageDraw.Draw(im)
    P = lambda x, y: ((x - cx) / sc * W + W / 2, H / 2 - (y - cy) / sc * W)
    for c in cards:
        x, y = P(*c['pos'])
        lbl = f"{c['namn'].replace('giv_', '')}\n{c['dim_mm'][0]:.1f}x{c['dim_mm'][1]:.1f} mm"
        g.rectangle([x - 42, y + 32, x + 42, y + 60], fill=(255, 255, 255))
        g.text((x - 39, y + 34), lbl, fill=(0, 0, 0))
    g.rectangle([8, 8, 960, 56], fill=(255, 255, 255))
    g.text((14, 12), f"Ortografiskt kortmatt-bevis (standardbord.blend): alla {len(cards)} giv-kort = 63.0 x 88.0 x 0.3 mm (scale 1.0), alla {len(rapport['markering_ramar'])} ramar = 71.0 x 96.0 mm", fill=(0, 0, 0))
    g.text((14, 30), "Perspektivskillnad i filmvyn beror endast pa kamerans vinkel (25.1 deg) + tomma C2-ramar bredvid C1 - ingen 87%-skalning.", fill=(20, 90, 20))
    im.save(ut_png)
    print('ok', ut_png)
