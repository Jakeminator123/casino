"""Steg 11: en färdig dealer sätts på en grunddockas skelett, led för led (Jakob 2026-11-27: "Rörelsemönster och allt
ska ju komma från Danilo och Frasse. Men också den docka som är skapad utifrån dem och som vi arbetat med hela tiden är
grunden för den docka av Tomasz som ska göras").

Dealerns yta (huvud, hud, kläder, ansiktsformer) formas om så att den sitter på dockans skelett, och skelettet byts mot
dockans: samma leder i vila och samma benlängder, också fingrarnas. Då spelar dealern dockans rörelser ett till ett, utan
att editorn skalar honom (figure-model.ts skalar en modell efter armens längd, och armen är nu dockans).

1. Vridbenen: har dealern inga, får han dem först med steg 6:s vridben.py (huden i vila oförändrad).
2. En avbildning per ben, från dealerns leder till dockans:
   - Armarna och benen: benet vrids och sträcks längs sig självt, så att dess led och nästa led hamnar på dockans.
     Vridningen tas i hierarkins ordning: barnet ärver förälderns vridning och vrids sedan den kortaste vägen. Vridbenen
     följer underarmen. Foten och tårna följer underbenet utan att sträckas: skon behåller sin form (riggarnas fot- och
     tåleder sitter efter olika vana).
   - Handflatan: en mjuk avbildning (thin plate spline) som lägger handleden och de fem knogarna exakt på dockans, med
     tjockleken bevarad och handleden i underarmens förlängning.
   - Fingrarna: dockans knogar och dockans längder, det tredje benet till dockans fingertopp mätt på huden så som
     figure-model.ts mäter den (fingertopp.ts), men hans egen krökning i vila: varje finger följer handflatans vridning
     vid sin knoge och sträcks längs sig självt, och fingerbenen i dockans skelett vrids till hans riktning. Dockans
     krökning skiljer 35-65 grader vid knogarna, och att tvinga in den rev huden (kanter sträcktes upp till nio gånger).
     Greppet blir dockans ändå, eftersom editorn riktar varje fingerben mot rörelsens punkter.
   - Bålen, halsen och nyckelbenen: en mjuk avbildning (thin plate spline, φ(r) = r) genom höftlederna, nyckelbenens
     inre ändar, axellederna och huvudets led, med djupet bevarat. Ryggradens och halsens leder är inte samma punkt på
     kroppen i två riggar (Meshys halsled ligger vid huvudet, MPFB:s vid halsens bas), så de styr inte ytan.
   - Huvudet: flyttas till dockans huvudled utan att formas om (ansiktet är hans), käken och ögonlederna med det.
3. Varje hörn flyttas med sina egna vikter (benens avbildningar blandade som en armatur gör), i vilan och i var och en
   av ansiktsformerna.
4. Dockans skelett tar dealerns plats: hans yta binds till dockans armatur med samma vikter. Dockans käk- och ögonleder
   flyttas dit hans käke och ögonglober sitter (steg 9); dockans övriga ansiktsben och IK-ben följer med utan vikter.
5. Exporten som steg 9, och kontrollen: den nya modellen läses in igen, och dess leder jämförs med dockans, ytan med den
   beräknade, formerna och materialen räknas, och hudens sträckning mäts per kroppsdel.

    blender -b --python-exit-code 1 --python steg/11-pa-dockans-grund/pa_grund.py -- dealer.glb docka.glb ut.glb
        [--arbete <mapp>]
Dockan är en grunddocka med 81 ben (assets/docka/standarddocka_danilo.glb eller _frasse.glb). Rapporten blir <ut>.json
och pa-grund.json i arbetsmappen (förval slask/avatar-auto-pipeline/pa-grund-<ut>/), där också hud.npz ligger: ytan före
och efter, för bilder av var den sträcktes.
"""
import argparse, json, os, sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector

ROT = Path(__file__).resolve().parents[2]          # avatar-auto-pipeline
sys.path.insert(0, str(ROT / 'gemensamt'))
from sokvagar import add_paths, slask             # noqa: E402
add_paths(ROT)
import vridben                                      # noqa: E402  (steg 06)

SIDOR = ('Right', 'Left')
FINGRAR = ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')
BAL = ('Hips', 'Spine', 'Spine1', 'Spine2', 'neck', 'LeftShoulder', 'RightShoulder')
HUVUD = ('Head', 'HeadTop_End', 'headfront', 'jaw', 'eye.L', 'eye.R')
ANSIKTSLEDER = ('jaw', 'eye.L', 'eye.R')            # flyttas till dealerns (hans käke och ögonglober)
INST = {
    'djup_m': 0.12,          # bålens avbildning: varje styrpunkt får en tvilling så här långt fram och bak, med samma flytt
    'huvud_m': 0.09,         # och huvudet fem punkter så här långt ut, så att det flyttas utan att formas om
    'stracka': (0.5, 2.0),   # ett ben sträcks aldrig mer än så (en rigg med ett nästan tomt ben, t.ex. Meshys hals)
    'handflata_m': 0.012,    # handflatans avbildning: handleden och knogarna får tvillingar så här långt över och under
    'tps_lambda': 1e-7,
}


def las_args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('dealer'); ap.add_argument('docka'); ap.add_argument('ut')
    ap.add_argument('--arbete', default=None)
    return ap.parse_args(a)


# ---------------------------------------------------------------- hjälp
def importera(path):
    fore = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    nya = [o for o in bpy.data.objects if o not in fore]
    arm = next(o for o in nya if o.type == 'ARMATURE')
    mesh = next(o for o in nya if o.type == 'MESH' and o.find_armature() == arm)
    for o in nya:
        if o not in (arm, mesh):
            bpy.data.objects.remove(o)
    arm.data.pose_position = 'REST'
    if arm.animation_data:
        arm.animation_data.action = None
    return arm, mesh


def varld(o, co=None):
    if co is None:
        co = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    M = np.array(o.matrix_world); return co @ M[:3, :3].T + M[:3, 3]


def leder(arm):
    M = arm.matrix_world
    return {b.name: np.array(M @ b.head_local) for b in arm.data.bones}


def viktmatris(o, namn):
    """Hörnens vikter på benen i `namn` (N x len(namn)), som de står i hörngrupperna."""
    idx = {g.index: namn.index(g.name) for g in o.vertex_groups if g.name in namn}
    W = np.zeros((len(o.data.vertices), len(namn)))
    for v in o.data.vertices:
        for ge in v.groups:
            k = idx.get(ge.group)
            if k is not None:
                W[v.index, k] = ge.weight
    return W


def enhet(v):
    return v / np.linalg.norm(v)


def svang(a, b):
    """Den kortaste vridningen som för riktningen a till b."""
    a, b = enhet(a), enhet(b); v = np.cross(a, b); c = float(a @ b); s = float(np.linalg.norm(v))
    if s < 1e-9:
        if c > 0:
            return np.eye(3)
        p = enhet(np.cross(a, [1.0, 0, 0] if abs(a[0]) < 0.9 else [0, 1.0, 0]))
        return 2 * np.outer(p, p) - np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K * ((1 - c) / s ** 2)


def kabsch(A, B):
    """Vridningen R som bäst för raderna i A till raderna i B (R a ≈ b)."""
    U, S, Vt = np.linalg.svd(A.T @ B); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(Vt.T @ U.T))
    return Vt.T @ D @ U.T


def vridningsdel(J):
    U, S, Vt = np.linalg.svd(J); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt))
    return U @ D @ Vt


def grader(R):
    return float(np.degrees(np.arccos(np.clip((np.trace(R) - 1) / 2, -1, 1))))


def fingertopp(h2, h3, moln):
    """Som dealer3d/src/fingertopp.ts: mitt i toppens rundning, en radie innanför fingrets slut längs dess längdaxel."""
    if len(moln) < 20:
        return None
    c = moln.mean(0); C = (moln - c).T @ (moln - c); u = enhet(c - h3)
    v = u.copy()
    for _ in range(100):
        v = enhet(C @ v)
    if v @ u < 0:
        v = -v
    s = (moln - h3) @ v; slut = s.max()
    m = (s > slut - 0.010) & (s < slut - 0.005)
    if m.sum() < 6:
        return None
    mitt = moln[m].mean(0); q = moln[m] - mitt
    radie = float(np.linalg.norm(q - np.outer(q @ v, v), axis=1).mean())
    return mitt + v * (slut - radie - (mitt - h3) @ v)


class Platta:
    """Thin plate spline i 3D (φ(r) = r): flytten i styrpunkterna P blir exakt Q - P, mjukt emellan."""
    def __init__(self, P, Q, lam):
        n = len(P); K = np.linalg.norm(P[:, None] - P[None], axis=2) + lam * np.eye(n)
        P1 = np.hstack([np.ones((n, 1)), P]); A = np.zeros((n + 4, n + 4)); A[:n, :n] = K; A[:n, n:] = P1; A[n:, :n] = P1.T
        b = np.zeros((n + 4, 3)); b[:n] = Q - P
        x = np.linalg.solve(A, b); self.P, self.w, self.a = P, x[:n], x[n:]

    def __call__(self, X):
        out = np.empty_like(X)
        for i in range(0, len(X), 20000):
            Y = X[i:i + 20000]
            out[i:i + 20000] = Y + np.linalg.norm(Y[:, None] - self.P[None], axis=2) @ self.w + np.hstack([np.ones((len(Y), 1)), Y]) @ self.a
        return out

    def jacobi(self, x, h=1e-4):
        return np.stack([(self(x[None] + h * e) - self(x[None] - h * e))[0] / (2 * h) for e in np.eye(3)], axis=1)


# ---------------------------------------------------------------- 2. avbildningarna
def avbildningar(JT, JD, toppT, toppD, rap):
    """Ett ben -> ('affin', A, hT, hD) | ('bal',) | ('platta', tps) | ('flytt', t), och fingrarnas nya leder
    (namn -> (huvud, riktning, längd)). Lederna i världens rum."""
    # Bålen: styrpunkterna och deras tvillingar framåt och bakåt (djupet bevaras), huvudets fem punkter.
    namn = ['LeftUpLeg', 'RightUpLeg', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm']
    P, Q = [], []
    for n in namn:
        for dy in (0.0, -INST['djup_m'], INST['djup_m']):
            d = np.array([0, dy, 0]); P.append(JT[n] + d); Q.append(JD[n] + d)
    th = JD['Head'] - JT['Head']
    for d in ([0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1]):
        p = JT['Head'] + INST['huvud_m'] * np.array(d, float); P.append(p); Q.append(p + th)
    platta = Platta(np.array(P), np.array(Q), INST['tps_lambda'])
    rap['balen'] = {'styrpunkter': namn + ['Head'], 'fel_i_styrpunkterna_mm': round(float(np.abs(platta(np.array(P)) - np.array(Q)).max() * 1000), 4),
                    'lutning_vid_axlarna_grader': round(grader(vridningsdel(platta.jacobi((JT['LeftArm'] + JT['RightArm']) / 2))), 2),
                    'bredd_skala_vid_hofterna': round(float(platta.jacobi((JT['LeftUpLeg'] + JT['RightUpLeg']) / 2)[0, 0]), 4),
                    'bredd_skala_vid_axlarna': round(float(platta.jacobi((JT['LeftArm'] + JT['RightArm']) / 2)[0, 0]), 4)}
    k = {n: ('bal',) for n in BAL}
    nya_leder = {}
    for n in HUVUD:
        k[n] = ('flytt', th)
    led = {}

    def kedja(ben, barn_T, barn_D, Rf):
        hT, hD = JT[ben], JD[ben]; vT, vD = barn_T - hT, barn_D - hD
        LT, LD = np.linalg.norm(vT), np.linalg.norm(vD); aT = vT / LT
        R = svang(Rf @ aT, vD) @ Rf
        s = float(np.clip(LD / LT, *INST['stracka']))
        A = R @ (np.eye(3) + (s - 1) * np.outer(aT, aT))
        k[ben] = ('affin', A, hT, hD)
        led[ben] = {'langd_dealer_mm': round(LT * 1000, 1), 'langd_docka_mm': round(LD * 1000, 1), 'stracks': round(s, 3),
                    'egen_vridning_grader': round(grader(R @ Rf.T), 1), 'missar_nasta_led_mm': round(float(np.linalg.norm(hD + A @ vT - barn_D)) * 1000, 2)}
        return R

    for s in SIDOR:
        Ra = vridningsdel(platta.jacobi(JT[s + 'Arm']))
        Ra = kedja(s + 'Arm', JT[s + 'ForeArm'], JD[s + 'ForeArm'], Ra)
        Rf = kedja(s + 'ForeArm', JT[s + 'Hand'], JD[s + 'Hand'], Ra)
        for t in (1, 2):
            k[f'{s}ForeArmTwist{t}'] = k[s + 'ForeArm']
        # Handen: handflatan formas mjukt (thin plate spline) så att handleden och de fem knogarna (fingrarnas första
        # led) ligger exakt som dockans, tjockleken bevarad, och handleden följer underarmen.
        h = s + 'Hand'; kn = [f'{h}{f}1' for f in FINGRAR]
        vT = np.array([JT[n] - JT[h] for n in kn]); vD = np.array([JD[n] - JD[h] for n in kn])
        R0 = kabsch(vT, vD)
        nT = enhet(np.cross(JT[kn[1]] - JT[h], JT[kn[4]] - JT[h]))
        aF = enhet(JT[h] - JT[s + 'ForeArm']); _, Af, hTf, hDf = k[s + 'ForeArm']
        P, Q = [JT[h] - 0.04 * aF], [hDf + (JT[h] - 0.04 * aF - hTf) @ Af.T]
        for p, q in [(JT[h], JD[h])] + [(JT[n], JD[n]) for n in kn]:
            for dn in (0.0, -INST['handflata_m'], INST['handflata_m']):
                P.append(p + dn * nT); Q.append(q + dn * (R0 @ nT))
        hp = Platta(np.array(P), np.array(Q), INST['tps_lambda'])
        k[h] = ('platta', hp)
        J0 = hp.jacobi(JT[h])
        led[h] = {'vridning_grader': round(grader(R0), 1), 'vridning_mot_underarmen_grader': round(grader(R0 @ Rf.T), 1),
                  'knogarna_flyttas_mm': [round(float(x) * 1000, 1) for x in np.linalg.norm((vT @ R0.T) - vD, axis=1)],
                  'skala_vid_handleden_singularvarden': np.round(np.linalg.svd(J0, compute_uv=False), 3).tolist()}
        # Fingrarna: dockans knogar och dockans längder (fingertoppen mätt på huden), men hans egen krökning i vila:
        # varje finger följer handflatans vridning vid sin knoge och sträcks längs sig självt. (Dockans krökning i vila
        # skiljer 35-65 grader vid knogarna; att tvinga in den rev huden, kanter sträcktes upp till nio gånger.)
        # Editorn riktar varje fingerben mot rörelsens punkter (figure-model.ts), så greppet blir dockans ändå.
        for f in FINGRAR:
            b1 = f'{h}{f}1'; R = vridningsdel(hp.jacobi(JT[b1])); hD = JD[b1]
            for j in (1, 2, 3):
                b = f'{h}{f}{j}'
                cT = JT[f'{h}{f}{j + 1}'] if j < 3 else toppT.get(b)
                cD = JD[f'{h}{f}{j + 1}'] if j < 3 else toppD.get(b)
                if cT is None or cD is None:       # ingen topp att mäta: benet följer det förra, osträckt
                    k[b] = ('affin', R, JT[b], hD); nya_leder[b] = (hD, enhet(R @ (JT[b] - JT[f'{h}{f}2'])), 0.02); continue
                vT = cT - JT[b]; LT = np.linalg.norm(vT); aT = vT / LT
                LD = np.linalg.norm(cD - JD[b])
                st = float(np.clip(LD / LT, *INST['stracka']))
                A = R @ (np.eye(3) + (st - 1) * np.outer(aT, aT))
                k[b] = ('affin', A, JT[b], hD)
                riktning = R @ aT
                nya_leder[b] = (hD, riktning, LD)
                led[b] = {'langd_dealer_mm': round(LT * 1000, 1), 'langd_docka_mm': round(LD * 1000, 1), 'stracks': round(st, 3),
                          'riktning_mot_dockans_grader': round(float(np.degrees(np.arccos(np.clip(riktning @ enhet(cD - JD[b]), -1, 1)))), 1),
                          'leden_mot_dockans_mm': round(float(np.linalg.norm(hD - JD[b])) * 1000, 1)}
                hD = hD + riktning * LD
        # Benen: låret och underbenet sträcks, foten och tårna följer underbenet utan att sträckas.
        Rh = vridningsdel(platta.jacobi(JT[s + 'UpLeg']))
        Rh = kedja(s + 'UpLeg', JT[s + 'Leg'], JD[s + 'Leg'], Rh)
        Rl = kedja(s + 'Leg', JT[s + 'Foot'], JD[s + 'Foot'], Rh)
        for b in (s + 'Foot', s + 'ToeBase', s + 'Toe_End'):
            k[b] = ('affin', Rl, JT[s + 'Foot'], JD[s + 'Foot'])
    rap['leder'] = led
    return k, platta, nya_leder


def flytta(X, W, ben, karta, platta):
    """Varje hörn med sina vikter: summan av benens avbildningar, viktad (som en armatur, vikterna normerade)."""
    tot = W.sum(1); ut = np.zeros_like(X); P = None
    for j, b in enumerate(ben):
        i = np.nonzero(W[:, j] > 0)[0]
        if not len(i):
            continue
        m = karta[b]
        if m[0] == 'platta':
            Y = m[1](X[i])
        elif m[0] == 'bal':
            if P is None:
                P = np.zeros_like(X); bi = np.nonzero(sum(W[:, jj] for jj, nn in enumerate(ben) if karta[nn][0] == 'bal') > 0)[0]
                P[bi] = platta(X[bi])
            Y = P[i]
        elif m[0] == 'flytt':
            Y = X[i] + m[1]
        else:
            Y = m[3] + (X[i] - m[2]) @ m[1].T
        ut[i] += W[i, j, None] * Y
    return ut / tot[:, None]


# ---------------------------------------------------------------- huvudet
def main():
    args = las_args()
    dealer, docka, utfil = Path(args.dealer).resolve(), Path(args.docka).resolve(), Path(args.ut).resolve()
    arb = Path(args.arbete).resolve() if args.arbete else slask(f'pa-grund-{utfil.stem}')
    arb.mkdir(parents=True, exist_ok=True)
    rap = {'dealer': dealer.name, 'docka': docka.name, 'ut': utfil.name, 'installningar': INST}
    bpy.ops.wm.read_factory_settings(use_empty=True)
    d_arm, d_me = importera(docka)
    t_arm, t_me = importera(dealer)

    # 1. vridbenen (i ställning, så att vridben.py:s egen kontroll av huden prövar något)
    t_arm.data.pose_position = 'POSE'
    rap['vridben'] = vridben.lagga_till(t_arm, t_me)
    t_arm.data.pose_position = 'REST'

    JT, JD = leder(t_arm), leder(d_arm)
    saknas = [b.name for b in t_arm.data.bones if b.name not in JD and not b.name.endswith('_End')]
    if saknas:
        raise SystemExit(f'dockan saknar ben som dealern har: {saknas}')
    tben = [b.name for b in t_arm.data.bones if b.use_deform]
    W = viktmatris(t_me, tben)
    if (W.sum(1) <= 0).any():
        raise SystemExit(f'{int((W.sum(1) <= 0).sum())} hörn hänger inte på något ben')
    Wn = W / W.sum(1)[:, None]
    dben = [b.name for b in d_arm.data.bones if b.use_deform]
    WD = viktmatris(d_me, dben); WD /= np.maximum(WD.sum(1), 1e-9)[:, None]
    XT, XD = varld(t_me), varld(d_me)

    # fingertopparna på huden, på båda
    toppT, toppD = {}, {}
    for s in SIDOR:
        for f in FINGRAR:
            b2, b3 = f'{s}Hand{f}2', f'{s}Hand{f}3'
            if b3 in tben:
                toppT[b3] = fingertopp(JT[b2], JT[b3], XT[Wn[:, tben.index(b3)] >= 0.5])
            if b3 in dben:
                toppD[b3] = fingertopp(JD[b2], JD[b3], XD[WD[:, dben.index(b3)] >= 0.5])
    rap['fingertoppar_mm_fran_tredje_leden'] = {b: [round(float(np.linalg.norm(toppT[b] - JT[b])) * 1000, 1) if toppT.get(b) is not None else None,
                                                    round(float(np.linalg.norm(toppD[b] - JD[b])) * 1000, 1) if toppD.get(b) is not None else None]
                                                for b in toppT}

    # 2. avbildningarna, 3. ytan och formerna
    karta, platta, nya_leder = avbildningar(JT, JD, toppT, toppD, rap)
    for b in tben:
        if b not in karta:
            par = t_arm.data.bones[b].parent
            while par is not None and par.name not in karta:
                par = par.parent
            karta[b] = karta[par.name] if par is not None else ('bal',)
            rap.setdefault('ben_som_foljer_foraldern', []).append(b)
    me = t_me.data
    Y = flytta(XT, W, tben, karta, platta)
    nycklar = {}
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            K = np.empty(len(me.vertices) * 3); kb.data.foreach_get('co', K); K = varld(t_me, K.reshape(-1, 3))
            rör = np.nonzero(np.abs(K - XT).max(1) > 1e-9)[0]
            Kn = Y.copy()
            if len(rör):
                Kn[rör] = flytta(K[rör], W[rör], tben, karta, platta)
            nycklar[kb.name] = Kn
            if kb.name != me.shape_keys.reference_key.name:
                rap.setdefault('former_storsta_flytt_fore_efter_mm', {})[kb.name] = [
                    round(float(np.linalg.norm(K - XT, axis=1).max()) * 1000, 2), round(float(np.linalg.norm(Kn - Y, axis=1).max()) * 1000, 2)]

    # hudens sträckning per kroppsdel (kanternas längd efter / före)
    E = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
    l0 = np.linalg.norm(XT[E[:, 0]] - XT[E[:, 1]], axis=1); l1 = np.linalg.norm(Y[E[:, 0]] - Y[E[:, 1]], axis=1)
    kvot = l1 / np.maximum(l0, 1e-9); dom = np.array(tben, dtype=object)[W.argmax(1)]

    def del_av(n):
        if n in HUVUD: return 'huvudet'
        if n in BAL: return 'bålen och halsen'
        if 'Hand' in n: return 'händerna'
        if 'ForeArm' in n: return 'underarmarna'
        if n.endswith('Arm'): return 'överarmarna'
        if 'UpLeg' in n or n.endswith('Leg'): return 'benen'
        return 'fötterna'
    delar = np.array([del_av(n) for n in dom], dtype=object)
    kdel = delar[E[:, 0]]
    rap['hudens_strackning'] = {d: {'kanter': int((kdel == d).sum()),
                                    'median_procent': round(float(np.median(np.abs(kvot[kdel == d] - 1))) * 100, 2),
                                    'p95_procent': round(float(np.percentile(np.abs(kvot[kdel == d] - 1), 95)) * 100, 2),
                                    'mest_procent': round(float(np.abs(kvot[kdel == d] - 1).max()) * 100, 1),
                                    'langst_kvot_min_max': [round(float(kvot[kdel == d].min()), 3), round(float(kvot[kdel == d].max()), 3)]}
                                for d in sorted(set(kdel))}
    tri = np.empty(sum(len(p.vertices) for p in me.polygons), np.int64); me.polygons.foreach_get('vertices', tri)
    mi = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get('material_index', mi)
    np.savez_compressed(arb / 'hud.npz', fore=XT.astype(np.float32), efter=Y.astype(np.float32), ytor=tri.reshape(-1, 3),
                        material=mi, delar=delar.astype(str), dockans_offset=np.array(d_arm.matrix_world)[:3, 3])

    # 4. dockans skelett tar dealerns plats
    rullning = {}
    bpy.ops.object.select_all(action='DESELECT'); t_arm.select_set(True); bpy.context.view_layer.objects.active = t_arm
    bpy.ops.object.mode_set(mode='EDIT')
    MT = t_arm.matrix_world
    for n in ANSIKTSLEDER:
        eb = t_arm.data.edit_bones.get(n)
        if eb is not None:
            rullning[n] = (np.array(MT @ eb.head) + karta['Head'][1], np.array(MT @ eb.tail) + karta['Head'][1], eb.roll)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT'); d_arm.select_set(True); bpy.context.view_layer.objects.active = d_arm
    bpy.ops.object.mode_set(mode='EDIT')
    inv = d_arm.matrix_world.inverted()
    for n, (h, t, r) in rullning.items():
        eb = d_arm.data.edit_bones.get(n) or d_arm.data.edit_bones.new(n)
        eb.head, eb.tail, eb.roll = inv @ Vector(h), inv @ Vector(t), r
        eb.parent = d_arm.data.edit_bones['Head']; eb.use_deform = True
    # fingrarna: dockans knogar och längder, hans krökning (benets ram vrids den kortaste vägen till den nya riktningen)
    inv3 = np.linalg.inv(np.array(d_arm.matrix_world)[:3, :3])
    for n, (h, r, L) in nya_leder.items():
        eb = d_arm.data.edit_bones[n]; M = np.array(eb.matrix)
        y = enhet(inv3 @ r); rot = svang(M[:3, 1], y) @ M[:3, :3]
        N = np.eye(4); N[:3, :3] = rot; N[:3, 3] = np.array(inv @ Vector(h))
        eb.matrix = Matrix(N.tolist()); eb.length = float(L)
    bpy.ops.object.mode_set(mode='OBJECT')
    rap['ansiktsleder_flyttade'] = {n: np.round(h, 4).tolist() for n, (h, t, r) in rullning.items()}

    bpy.data.objects.remove(d_me)
    t_me.parent = d_arm; t_me.matrix_parent_inverse = Matrix.Identity(4); t_me.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    Mi = np.linalg.inv(np.array(d_arm.matrix_world))
    lok = lambda X: X @ Mi[:3, :3].T + Mi[:3, 3]
    me.vertices.foreach_set('co', lok(Y).ravel())
    for n, K in nycklar.items():
        me.shape_keys.key_blocks[n].data.foreach_set('co', lok(K).ravel())
    me.update()
    for m in t_me.modifiers:
        if m.type == 'ARMATURE':
            m.object = d_arm
    bort = [g.name for g in t_me.vertex_groups if g.name not in d_arm.data.bones]
    for g in bort:
        t_me.vertex_groups.remove(t_me.vertex_groups[g])
    rap['horngrupper_utan_ben_borttagna'] = bort
    bpy.data.objects.remove(t_arm)

    # 5. exporten (som steg 9)
    bpy.ops.object.select_all(action='DESELECT'); d_arm.select_set(True); t_me.select_set(True)
    bpy.context.view_layer.objects.active = d_arm
    ny = utfil.with_suffix('.ny.glb')
    bpy.ops.export_scene.gltf(filepath=str(ny), export_format='GLB', use_selection=True, export_animations=False,
                              export_image_format='AUTO')
    os.replace(ny, utfil)
    material = [s.material.name if s.material else None for s in t_me.material_slots]

    # kontrollen: läs in den nya modellen och dockan igen
    bpy.ops.wm.read_factory_settings(use_empty=True)
    n_arm, n_me = importera(utfil)
    g_arm, g_me = importera(docka)
    JN, JG = leder(n_arm), leder(g_arm)
    krokta = {n for n in nya_leder if not n.endswith('1')}      # fingrarnas andra och tredje led: hans krökning
    avv = {b: float(np.linalg.norm(JN[b] - JG[b])) for b in JG if b in JN and b not in ANSIKTSLEDER and b not in krokta}
    storst = max(avv, key=avv.get)
    XN = varld(n_me)
    nben = [b.name for b in n_arm.data.bones if b.use_deform]
    WN = viktmatris(n_me, nben); WN /= np.maximum(WN.sum(1), 1e-9)[:, None]
    fingrar = {}
    for s in SIDOR:
        for f in FINGRAR:
            b = [f'{s}Hand{f}{j}' for j in (1, 2, 3)]
            tN = fingertopp(JN[b[1]], JN[b[2]], XN[WN[:, nben.index(b[2])] >= 0.5])
            lN = [np.linalg.norm(JN[b[1]] - JN[b[0]]), np.linalg.norm(JN[b[2]] - JN[b[1]]), np.linalg.norm(tN - JN[b[2]]) if tN is not None else np.nan]
            lG = [np.linalg.norm(JG[b[1]] - JG[b[0]]), np.linalg.norm(JG[b[2]] - JG[b[1]]),
                  np.linalg.norm(toppD[b[2]] - JD[b[2]]) if toppD.get(b[2]) is not None else np.nan]
            fingrar[f'{s}{f}'] = {'langder_mm_ny_docka': [[round(float(x) * 1000, 1) for x in lN], [round(float(x) * 1000, 1) for x in lG]],
                                  'lederna_2_3_mot_dockans_i_vila_mm': [round(float(np.linalg.norm(JN[x] - JG[x])) * 1000, 1) for x in b[1:]]}
    from mathutils.kdtree import KDTree
    kd = KDTree(len(Y))
    for i, p in enumerate(Y):
        kd.insert(Vector(p), i)
    kd.balance()
    fel = max(kd.find(Vector(p))[2] for p in XN[::7])
    rap['kontroll'] = {
        'ben': len(n_arm.data.bones), 'dockans_ben': len(g_arm.data.bones),
        'leder_mot_dockans_storsta_mm': round(avv[storst] * 1000, 4), 'storst_i': storst,
        'ytan_mot_den_beraknade_storsta_mm': round(fel * 1000, 4),
        'former': len(n_me.data.shape_keys.key_blocks) - 1 if n_me.data.shape_keys else 0,
        'material': [s.material.name if s.material else None for s in n_me.material_slots], 'material_fore': material,
        'horn': len(n_me.data.vertices),
        'arm_overarm_underarm_m': {s: [round(float(np.linalg.norm(JN[s + 'ForeArm'] - JN[s + 'Arm'])), 4),
                                       round(float(np.linalg.norm(JN[s + 'Hand'] - JN[s + 'ForeArm'])), 4)] for s in SIDOR},
        'axelleder_isar_m': round(float(np.linalg.norm(JN['LeftArm'] - JN['RightArm'])), 4),
        'fingrarna': fingrar,
    }
    txt = json.dumps(rap, indent=1, ensure_ascii=False, default=lambda x: x.tolist() if hasattr(x, 'tolist') else str(x))
    (arb / 'pa-grund.json').write_text(txt, encoding='utf-8'); utfil.with_suffix('.json').write_text(txt, encoding='utf-8')
    print('PA GRUND KLART', utfil, json.dumps(rap['kontroll'], ensure_ascii=False))
    print('STRACKNING', json.dumps(rap['hudens_strackning'], ensure_ascii=False))


main()
