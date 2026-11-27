"""Montera ett 4K-huvud och ett separat handpar (från bygg_modul) på en A-pose-kropp från Meshy.

Halsen mäts med standardmatt.halssnitt.
Händerna: handledssnittet läggs vinkelrätt mot underarmens verkliga 3D-riktning, och snittet
begränsas till en cylinder kring armen (i A-pose skulle ett plant halvrumssnitt annars kapa benen).
Handen behåller sin egen handled och dess början dras in i ärmen (HANDLED_IN); förr vidgades den till ärmens mått.
Kragen hittas via hudfärg (skjortan ska vara tydligt icke-hudfärgad, standardklädseln är mörkblå).
Användning: python -B steg/03-montering/montera_apose.py kropp.glb huvud.glb handpar.glb ut.glb
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

import copy, io, json, sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

import bygg_modul  # noqa: F401  (patchar bygg.ordered_ring)
import bygg
import montera
from bygg_modul import Asset, Export
from bygg import Mesh, unit
from montera import attach, rotate, surface
from standardmatt import HALS_BREDDKVOT, HANDLANGD, halssnitt, kroppsmatt

MASK = {}
NECK_BODY_H = 0.0
# Hur långt in i ärmen handledens början dras, andel av kroppslängden (cirka 14 mm): handen vidgas inte till ärmens
# mått, utan skarven blir en tratt inne i ärmen (montera.attach tuck), som steg 05 färgar mörk.
HANDLED_IN = 0.0075


def _extract_loops(pos, segments):
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
    loops = []
    for members in groups.values():
        sub = [segments[n] for n in members]
        if len(sub) < 6:
            continue
        try:
            loops.append(bygg_modul._ordered_ring(pos, sub))
        except ValueError:
            continue
    return loops


def _cap_secondary_loops(result, other_loops, cap_up=True):
    if not other_loops:
        return result
    pos_l = [result.pos]
    nor_l = [result.nor]
    uv_l = [result.uv]
    face_l = [result.faces]
    cur_n = len(result.pos)
    target_dir = np.array([0.0, 1.0 if cap_up else -1.0, 0.0])
    for oloop in other_loops:
        pts = result.pos[oloop]
        c_pos = pts.mean(axis=0, keepdims=True)
        c_nor = unit(result.nor[oloop].mean(axis=0))
        if np.linalg.norm(c_nor) < 1e-6:
            c_nor = target_dir
        c_uv = result.uv[oloop].mean(axis=0, keepdims=True)
        # Kontrollera lindningsriktning mot +Y/-Y
        v0 = pts - c_pos[0]
        v1 = np.roll(v0, -1, axis=0)
        area_vec = np.cross(v0, v1).sum(axis=0)
        flip = float(area_vec @ target_dir) < 0
        tris = []
        n_ring = len(oloop)
        for i in range(n_ring):
            a, b = int(oloop[i]), int(oloop[(i + 1) % n_ring])
            tris.append((b, a, cur_n) if flip else (a, b, cur_n))
        pos_l.append(c_pos.astype(result.pos.dtype))
        nor_l.append(c_nor[None, :].astype(result.nor.dtype))
        uv_l.append(c_uv.astype(result.uv.dtype))
        face_l.append(np.asarray(tris, dtype=result.faces.dtype))
        cur_n += 1
    return Mesh(np.vstack(pos_l), np.vstack(nor_l), np.vstack(uv_l), np.vstack(face_l))


def clip_masked(mesh, level, above, slope=bygg.SLOPE):
    """bygg.clip, men hörn utanför armcylindern räknas alltid som 'behåll' och sekundära öglor locket-stängs."""
    s = mesh.pos[:, 1].astype(float) + slope * mesh.pos[:, 2] - level
    if MASK and not above:
        ax, az, r = MASK["ax"], MASK["az"], MASK["r"]
        far = np.hypot(mesh.pos[:, 0] - ax, mesh.pos[:, 2] - az) > r
        s = np.where(far, -1.0, s)
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
    result = Mesh(np.vstack((mesh.pos, add_p))[used], np.vstack((mesh.nor, add_n))[used],
                  np.vstack((mesh.uv, add_uv))[used], index[faces])
    segs = index[np.array(pairs)]
    loops = _extract_loops(result.pos, segs)
    if NECK_BODY_H > 0 and not above and not MASK and len(loops) > 1:
        H_b = NECK_BODY_H
        neck_cands = []
        for idx_l, lp in enumerate(loops):
            pts = result.pos[lp]
            xmin, xmax = float(pts[:, 0].min()), float(pts[:, 0].max())
            zmax = float(pts[:, 2].max())
            w = xmax - xmin
            if xmin < -0.015 * H_b and xmax > 0.015 * H_b and zmax > -0.015 * H_b and w < 0.13 * H_b:
                neck_cands.append((len(lp), idx_l))
        if neck_cands:
            neck_cands.sort(reverse=True)
            best_idx = neck_cands[0][1]
            main_loop = loops[best_idx]
            others = [lp for j, lp in enumerate(loops) if j != best_idx]
            result = _cap_secondary_loops(result, others, cap_up=True)
            return result, main_loop
    main_loop = bygg.ordered_ring(result.pos, segs)
    if len(loops) > 1:
        main_set = set(map(int, main_loop))
        others = [lp for lp in loops if len(set(map(int, lp)) & main_set) < len(lp) // 2]
        if others:
            result = _cap_secondary_loops(result, others, cap_up=not above)
    return result, main_loop


montera.clip = clip_masked




class _EditedAsset:
    def __init__(self, base, overrides):
        self._base = base
        self.g = copy.deepcopy(base.g)
        self.mat = copy.deepcopy(base.mat)
        self._overrides = overrides
        for idx, (_, mime) in overrides.items():
            self.g["images"][idx]["mimeType"] = mime

    def image_data(self, i):
        if i in self._overrides:
            return self._overrides[i][0]
        return self._base.image_data(i)


def _sample_srgb(atlas, uv):
    xy = np.mod(uv, 1.0) * [atlas.shape[1], atlas.shape[0]] - 0.5
    x0 = np.clip(np.round(xy[:, 0]).astype(int), 0, atlas.shape[1] - 1)
    y0 = np.clip(np.round(xy[:, 1]).astype(int), 0, atlas.shape[0] - 1)
    return atlas[y0, x0] / 255.0


def _srgb_to_lin(s):
    s = np.clip(s, 0.0, 1.0)
    return np.where(s <= 0.04045, s / 12.92, ((s + 0.055) / 1.055) ** 2.4)


def _lin_to_srgb(l):
    l = np.clip(l, 0.0, 1.0)
    return np.where(l <= 0.0031308, l * 12.92, 1.055 * (l ** (1.0 / 2.4)) - 0.055)


def _encode_image(arr, mime="image/jpeg"):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGB")
    buf = io.BytesIO()
    if mime == "image/png":
        im.save(buf, format="PNG")
        return buf.getvalue(), "image/png"
    im.save(buf, format="JPEG", quality=94)
    return buf.getvalue(), "image/jpeg"


def _target_skin_srgb(skin_ref):
    with Image.open(skin_ref) as im:
        arr = np.asarray(im.convert("RGB")) / 255.0
    h, w, _ = arr.shape
    sub = arr[int(0.25 * h):int(0.65 * h), int(0.30 * w):int(0.70 * w)].reshape(-1, 3)
    sk = (sub[:, 0] > sub[:, 2] + 0.06) & (sub[:, 0] > 0.35) & (sub.min(1) < 0.88) & ((sub[:, 0] - sub[:, 1]) < 0.25)
    if sk.sum() < 200:
        return None
    return np.median(sub[sk], axis=0)


def _match_skin_atlas(atlas, target_srgb, label, vert_uv=None, vert_mask=None):
    s = atlas.astype(np.float32) / 255.0
    r, g, b = s[..., 0], s[..., 1], s[..., 2]
    w_lum = np.clip((r - 0.38) / 0.14, 0.0, 1.0)
    w_warm = np.clip(((r - b) - 0.035) / 0.06, 0.0, 1.0)
    w_not_lip = np.clip((0.26 - (r - g)) / 0.08, 0.25, 1.0)
    w_not_green = np.clip(((r - g) + 0.01) / 0.04, 0.0, 1.0)
    w = w_lum * w_warm * w_not_lip * w_not_green
    if vert_uv is not None and vert_mask is not None and vert_mask.any():
        xy = np.mod(vert_uv[vert_mask], 1.0) * [atlas.shape[1], atlas.shape[0]] - 0.5
        x0 = np.clip(np.round(xy[:, 0]).astype(int), 0, atlas.shape[1] - 1)
        y0 = np.clip(np.round(xy[:, 1]).astype(int), 0, atlas.shape[0] - 1)
        samples = s[y0, x0]
        sk = (samples[:, 0] > samples[:, 2] + 0.05) & (samples[:, 0] > 0.48) & ((samples[:, 0] - samples[:, 1]) < 0.24)
        if sk.sum() < 100:
            return atlas, None
        src_med = np.median(samples[sk], axis=0)
    else:
        strong = (w > 0.72) & (r > 0.52)
        if strong.sum() < 500:
            return atlas, None
        src_med = np.median(s[strong], axis=0)
    lin_src = _srgb_to_lin(src_med)
    lin_tgt = _srgb_to_lin(target_srgb)
    scale_lin = np.clip(lin_tgt / np.maximum(lin_src, 1e-4), 0.45, 1.45)
    w_im = Image.fromarray(np.clip(w * 255.0, 0, 255).astype(np.uint8), mode="L").filter(ImageFilter.GaussianBlur(1.5))
    w_soft = (np.asarray(w_im, dtype=np.float32) / 255.0)[..., None]
    lin = _srgb_to_lin(s)
    lin_new = lin * (1.0 + w_soft * (scale_lin - 1.0))
    out = np.clip(_lin_to_srgb(lin_new) * 255.0 + 0.5, 0, 255).astype(np.uint8)
    info = {
        "kalla_srgb": np.round(src_med, 3).tolist(),
        "mal_srgb": np.round(target_srgb, 3).tolist(),
        "lin_skala": np.round(scale_lin, 3).tolist(),
    }
    return out, info


def rodrigues(a, b):
    a, b = unit(np.asarray(a, float)), unit(np.asarray(b, float))
    v, c = np.cross(a, b), float(a @ b)
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3)
    k = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + k + k @ k / (1 + c)


def underarm(pos, side, H):
    """Fingertopp, underarmens riktning (från armbåge mot hand) och handledens läge längs den."""
    lateral = pos[:, 0] * side
    tip = pos[np.argmax(lateral)]
    shoulder = np.array([side * 0.11 * H, pos[:, 1].min() + 0.81 * H, 0.0])
    d = unit(tip - shoulder)
    for _ in range(3):
        rel = pos - tip
        along = rel @ d
        radial = np.linalg.norm(rel - np.outer(along, d), axis=1)
        sel = pos[(along < -0.10 * H) & (along > -0.24 * H) & (radial < 0.05 * H)]
        if len(sel) < 50:
            break
        c = sel.mean(0)
        _, _, vt = np.linalg.svd(sel - c, full_matrices=False)
        nd = vt[0] if vt[0] @ d > 0 else -vt[0]
        d = unit(nd)
        # Linjen går genom armens mitt: flytta 'tip' så axeln passerar c.
        tip_axis = c + d * ((tip - c) @ d)
    else:
        tip_axis = tip
    rel = pos - tip_axis
    along = rel @ d
    radial = np.linalg.norm(rel - np.outer(along, d), axis=1)
    near = radial < 0.06 * H
    tipv = along[near].max()
    # Smalaste tvärsnittet 6–16 % av längden innanför fingertoppen.
    step = 0.004 * H
    best, best_area = None, np.inf
    for a in np.arange(tipv - 0.16 * H, tipv - 0.06 * H, step):
        m = near & (along >= a) & (along < a + step)
        if m.sum() < 8:
            continue
        q = rel[m] - np.outer(along[m], d)
        e1 = unit(np.cross(d, [0, 0, 1.0])); e2 = np.cross(d, e1)
        area = np.ptp(q @ e1) * np.ptp(q @ e2)
        if area < best_area:
            best, best_area = a + step / 2, area
    return {"axel_punkt": tip_axis, "riktning": d, "spets": tipv, "handled": best}


def assemble_apose(body_file, head_file, hands_file, output, skin_ref=None, neck_slope=0.22):
    body_asset, head_asset, hands_asset = (Asset(p) for p in (body_file, head_file, hands_file))
    body, head, right = map(surface, (body_asset, head_asset, hands_asset))
    if {n.get("name") for n in hands_asset.g["nodes"]} != {"Hand.R", "Hand.L"}:
        raise ValueError("Expected the paired hand module from bygg_modul.")
    atlas = body_asset.color()
    head_atlas = head_asset.color()
    hand_atlas = hands_asset.color()
    low, high = body.pos.min(axis=0), body.pos.max(axis=0)
    H = high[1] - low[1]

    skin_report = None
    if skin_ref is not None and Path(skin_ref).is_file():
        tgt_skin = _target_skin_srgb(skin_ref)
        if tgt_skin is not None:
            tgt_skin = _lin_to_srgb(_srgb_to_lin(tgt_skin) * 0.91)
            head_atlas, h_info = _match_skin_atlas(head_atlas, tgt_skin, "Huvud")
            hand_atlas, hp_info = _match_skin_atlas(hand_atlas, tgt_skin, "Handpar")
            k_neck_mask = (body.pos[:, 1] > low[1] + 0.83 * H) & (np.abs(body.pos[:, 0]) < 0.12 * H)
            atlas, k_info = _match_skin_atlas(atlas, tgt_skin, "Kropp", vert_uv=body_asset.uv, vert_mask=k_neck_mask)
            skin_report = {"mal_srgb": np.round(tgt_skin, 3).tolist(), "huvud": h_info, "handpar": hp_info, "kropp": k_info}

    original = body.pos.copy()
    neck, neck_width = halssnitt(original, H)
    srgb0 = _sample_srgb(atlas, body_asset.uv)
    skin0 = (srgb0[:, 0] > srgb0[:, 2] + 0.06) & (srgb0[:, 0] > 0.45)
    krage, best, start = None, None, None
    for lv in np.arange(0.84, 0.91, 0.0025):
        sl = (np.abs(original[:, 1] - (low[1] + lv * H)) < 0.002 * H) & (np.abs(original[:, 0]) < 0.12 * H)
        if sl.sum() < 20:
            continue
        hud = skin0[sl].mean()
        if start is None:
            if hud < 0.97:
                krage = lv
                continue
            start = lv
        if lv > start + 0.025:
            break
        width = np.ptp(original[sl, 0]) / H
        if best is None or width < best[1] - 1e-4:
            best = (lv, width)

    _axial_h = head.pos[:, 1] + neck_slope * head.pos[:, 2]
    _part_h, _upper_h = montera.clip(head, _axial_h.min() + np.ptp(_axial_h) * 0.004, True, neck_slope)
    _pc_h, _upper_h = montera.centered_loop(_part_h, _upper_h)
    _part_top = float(_part_h.pos[:, 1].max() - _pc_h[1])
    _part_span = np.ptp(_part_h.pos[_upper_h][:, [0, 2]], axis=0)

    global NECK_BODY_H
    NECK_BODY_H = float(H)
    try:
        def ratio_at(level):
            stump, lower = montera.clip(body, low[1] + level * H, False, neck_slope)
            sc, lower = montera.centered_loop(stump, lower)
            scale = (high[1] - sc[1] - H * 0.003) / _part_top
            r = np.ptp(stump.pos[lower][:, [0, 2]], axis=0) / (_part_span * scale)
            lp = stump.pos[lower]; depth_ok = (np.ptp(lp[:, 2]) >= 0.038 * H) and (lp[:, 2].max() > 0.005 * H) and (abs(lp[:, 0].min() + lp[:, 0].max()) < 0.025 * H) and (np.ptp(lp[:, 0]) < 0.11 * H)
            return r, depth_ok

        neck_ratios = {}
        if krage is not None and best is not None:
            for level in np.arange((start if start is not None else neck) + 0.025, min(neck, start or neck) - 0.0001, -0.0025):
                try:
                    r, depth_ok = ratio_at(level)
                    if depth_ok:
                        neck_ratios[round(float(level), 4)] = np.round(r, 3).tolist()
                except ValueError:
                    continue
            if neck_ratios:
                lvl = min(neck_ratios, key=lambda k: max(abs(np.log(neck_ratios[k]))))
                neck, neck_width = lvl, None
        else:
            hair0 = (srgb0[:, 0] > srgb0[:, 2] + 0.03) & (srgb0[:, 0] > 0.10) & (srgb0[:, 0] <= 0.50) & ~skin0
            cloth0 = ~skin0 & ~hair0
            collar_hits = []
            for lv in np.arange(0.835, 0.895, 0.0025):
                front = (np.abs(original[:, 1] + neck_slope * original[:, 2] - (low[1] + lv * H)) < 0.003 * H) & (np.abs(original[:, 0]) < 0.06 * H) & (original[:, 2] > 0)
                if front.sum() >= 20 and cloth0[front].mean() > 0.08:
                    collar_hits.append(lv)
            collar_top = max(collar_hits) if collar_hits else 0.845
            krage = collar_top
            for level in np.arange(max(0.845, collar_top - 0.0125), min(0.875, collar_top + 0.025), 0.0025):
                try:
                    r, depth_ok = ratio_at(level)
                    lim = (0.50, 1.80) if neck_slope < 0.15 else HALS_BREDDKVOT
                    if depth_ok and np.all((r > lim[0]) & (r < lim[1])):
                        neck_ratios[round(float(level), 4)] = np.round(r, 3).tolist()
                except ValueError:
                    continue
            if neck_ratios:
                lvl = min(neck_ratios, key=lambda k: max(abs(np.log(neck_ratios[k]))))
                neck, neck_width = lvl, None

        neck_fit = None
        try:
            r, _ = ratio_at(neck)
        except Exception:
            r = None
        if r is not None and np.any(r > 1.05):
            level_y = low[1] + neck * H
            band = 0.045 * H
            ring = (np.abs(body.pos[:, 1] + neck_slope * body.pos[:, 2] - level_y) < 0.003 * H) & (np.abs(body.pos[:, 0]) < 0.09 * H) & (body.pos[:, 2] > -0.06 * H)
            cx, cz = np.median(body.pos[ring][:, 0]), np.median(body.pos[ring][:, 2])
            f = 1 / np.maximum(r, 1.0)
            pos = body.pos.astype(float)
            dx, dz = pos[:, 0] - cx, pos[:, 2] - cz
            t = np.clip((pos[:, 1] + neck_slope * pos[:, 2] - (level_y - band)) / band, 0, None)
            t = np.where(t > 1, 1.0, t * t * (3 - 2 * t))
            near = np.hypot(dx, dz) < 0.09 * H
            t = np.where(near, t, 0.0)
            pos[:, 0] = cx + dx * (1 + t * (f[0] - 1))
            pos[:, 2] = cz + dz * (1 + t * (f[1] - 1))
            body = Mesh(pos.astype(body.pos.dtype), body.nor, body.uv, body.faces)
            r_after, _ = ratio_at(neck)
            neck_fit = {"kvot_fore": np.round(r, 3).tolist(), "kvot_efter": np.round(r_after, 3).tolist()}
        report = {"halsanpassning": neck_fit, "krage_overkant": krage and round(float(krage), 4), "halskvoter_per_niva": neck_ratios, "langd_m": round(float(H), 4), "halssnitt": round(neck, 4), "halsbredd_per_langd": neck_width and round(neck_width, 4),
                  "hudton": skin_report, "handleder": {}}
        body, head, neck_seam = attach(body, head, np.eye(3), low[1] + H * neck, neck_slope, high[1], H * 0.003, atlas,
                                       head_atlas, limits=(0.50, 1.80) if neck_slope < 0.15 else HALS_BREDDKVOT, warp_frac=0.11)
    finally:
        NECK_BODY_H = 0.0
    pieces = [(head, 1), (neck_seam, 3)]
    arms = {side: underarm(original, side, H) for side in (-1, 1)}
    # Handen = hudfärgade hörn ytterst på armen (skjortans manschett är mörkblå). Snittet läggs
    # vinkelrätt mot underarmen strax innanför manschettkanten; handlängden mäts längs underarmen.
    srgb_arms = _sample_srgb(atlas, body_asset.uv)
    skin = (srgb_arms[:, 0] > srgb_arms[:, 2] + 0.06) & (srgb_arms[:, 0] > 0.45)
    starts, shares = {}, {}
    for side, a in arms.items():
        d = a["riktning"]
        rel = original - a["axel_punkt"]
        along = rel @ d
        radial = np.linalg.norm(rel - np.outer(along, d), axis=1)
        hand = skin & (radial < 0.09 * H) & (along > a["spets"] - 0.2 * H)
        if hand.sum() < 500:
            raise ValueError("Hittar ingen hudfärgad hand ytterst på armen.")
        starts[side] = float(np.percentile(along[hand], 0.5)) + 0.004 * H
        shares[side] = (float(along[hand].max()) - starts[side]) / H
        a["hand_horn"] = int(hand.sum())
    if abs(shares[-1] - shares[1]) > 0.008:
        shares = dict.fromkeys(shares, min(shares.values()))
    shares = {k: float(np.clip(v, HANDLANGD[0], HANDLANGD[1])) for k, v in shares.items()}
    # hand_atlas redan hudtonsmatchad ovan
    for side, hand in ((-1, right), (1, rotate(right, np.diag([-1, 1, 1])))):
        a = arms[side]
        d = a["riktning"]
        frame_t = np.array([[0, side, 0], [0, 0, 1], [side, 0, 0]], float)
        R = rodrigues([side, 0, 0], d)
        frame = R @ frame_t
        assert np.allclose(frame[:, 1], d, atol=1e-6)
        p0 = a["axel_punkt"]
        cut = float(p0 @ d + starts[side])  # handledssnittet längs underarmen (lokal Y)
        tip = cut + shares[side] * H  # donatorhandens fingertopp, rak handled
        local_axis = p0 @ frame
        MASK.update(ax=float(local_axis[0]), az=float(local_axis[2]), r=0.09 * H)
        try:
            # Handen behåller sin egen handled (vidgas inte till ärmens mått) och dess början dras in i ärmen.
            body, fitted, seam = attach(body, hand, frame, cut, 0, tip, H * 0.002, atlas, hand_atlas, tuck=H * HANDLED_IN)
        finally:
            MASK.clear()
        share = (tip - cut) / H
        vinkel = float(np.degrees(np.arccos(abs(d[1]))))
        report["handleder"]["hoger" if side == -1 else "vanster"] = {
            "underarm_riktning": np.round(d, 4).tolist(), "underarm_vinkel_fran_lodlinje_grader": round(vinkel, 1),
            "handlangd_per_langd": round(float(share), 3), "hudhorn_i_handen": a["hand_horn"]}
        if not HANDLANGD[0] <= share <= HANDLANGD[1]:
            raise ValueError(f"Handlängd {share:.3f} av kroppslängden ligger utanför {HANDLANGD}.")
        pieces.extend([(fitted, 2), (seam, 3)])
    result = Export()
    result.g["asset"]["generator"] = "avatar / montera_apose"
    result.g["nodes"][0]["name"] = result.g["meshes"][0]["name"] = Path(output).stem
    for source, img_arr, name in ((body_asset, atlas, "Kropp"), (head_asset, head_atlas, "Huvud"), (hands_asset, hand_atlas, "Handpar")):
        k_tex = source.mat["pbrMetallicRoughness"]["baseColorTexture"]["index"]
        img_idx = source.g["textures"][k_tex]["source"]
        orig_mime = source.g["images"][img_idx].get("mimeType", "image/jpeg")
        enc_bytes, enc_mime = _encode_image(img_arr, orig_mime)
        result.material(_EditedAsset(source, {img_idx: (enc_bytes, enc_mime)}), name)
    result.g["materials"].append({"name": "Skarvar", "doubleSided": True, "pbrMetallicRoughness": {
        "metallicFactor": 0.0, "roughnessFactor": 0.62}})
    for mesh, material in [(body, 0), *pieces]:
        result.mesh(mesh, material, colored=material == 3)
    tmp = Path(output).with_suffix(".tmp")
    result.write(tmp)
    tmp.replace(output)
    return report


if __name__ == "__main__":
    b, h, hp, out = map(Path, sys.argv[1:5])
    rep = assemble_apose(b, h, hp, out)
    print(json.dumps(rep, indent=1, ensure_ascii=False))
    out.with_name("montering.json").write_text(json.dumps(rep, indent=1, ensure_ascii=False), encoding="utf-8")
