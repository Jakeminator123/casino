"""Gemensamma rigg-funktioner (bpy) för standarddockan och bryggorna mot dealer3d.

Standardramen (scen/standard.yaml): meter, Z upp, origo på golvet under dealerkanten, spelarna på -Y.
dealer3d (blackjack-dealer) räknar i filmlinsens värld: three.js y upp, filmkameran i (0, h, 0) tittar mot -z.
"""
import math
from mathutils import Vector, Matrix, Quaternion

SIDOR = {'R': 'Right', 'L': 'Left'}
FINGRAR = [('Thumb', (1, 2, 3, 4)), ('Index', (5, 6, 7, 8)), ('Middle', (9, 10, 11, 12)), ('Ring', (13, 14, 15, 16)), ('Pinky', (17, 18, 19, 20))]
KRAVDA_BEN = ['RightArm', 'LeftArm', 'RightForeArm', 'LeftForeArm', 'RightHand', 'LeftHand', 'RightUpLeg', 'LeftUpLeg',
              'RightLeg', 'LeftLeg', 'RightFoot', 'LeftFoot', 'neck', 'Head', 'headfront']


class Ram:
    """Omräkning lins-värld <-> standard. filt_z och dealerkantens z ur standard.yaml / spelet."""
    def __init__(self, std):
        self.fz = std['filt_z']
        self.ze = std['lins']['dealerkant_lins_z']

    def till_std(self, p):
        x, y, z = p; return Vector((x, -(z - self.ze), y + self.fz))

    def till_lins(self, v):
        return [float(v.x), float(v.z - self.fz), float(-v.y + self.ze)]


def hand_axlar(p0, p5, p9, p17, sign=1.0):
    """Samma ram som dealer3d/src/hand-pose.ts axesOf: framåt = p9-p0, handflata = (p5-p0)x(p17-p0) ortogonaliserad."""
    fwd = (p9 - p0).normalized(); raw = (p5 - p0).cross(p17 - p0).normalized() * sign
    palm = (raw - fwd * raw.dot(fwd)).normalized(); across = palm.cross(fwd)
    return Matrix((fwd, palm, across)).transposed()  # kolumner = axlar


def sikta_ben(arm_ob, pb, riktning_varld, upp_hint=None):
    """Vrider benet (pose) så att dess Y-axel pekar längs riktning_varld, minsta vridning från nuvarande läge."""
    mw = arm_ob.matrix_world
    cur = mw @ pb.matrix  # benets världsmatris nu
    y = cur.to_3x3().col[1].normalized()
    q = y.rotation_difference(riktning_varld.normalized())
    rot = q.to_matrix().to_4x4()
    head = cur.translation.copy()
    ny = Matrix.Translation(head) @ rot @ Matrix.Translation(-head) @ cur
    pb.matrix = mw.inverted() @ ny


def satt_rotation_varld(arm_ob, pb, rot3):
    mw = arm_ob.matrix_world; cur = mw @ pb.matrix
    ny = Matrix.Translation(cur.translation) @ rot3.to_4x4()
    sc = cur.to_scale(); ny = ny @ Matrix.Diagonal((*sc, 1.0))
    pb.matrix = mw.inverted() @ ny


def tvaled_ik(axel, mal, pol, l1, l2):
    """Armbågens läge för en tvåledad kedja med längder l1, l2 mot målet, i planet mot polen."""
    d = mal - axel; L = d.length
    L = min(max(L, abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4)
    dn = d.normalized()
    a = (l1 * l1 - l2 * l2 + L * L) / (2 * L)
    h = math.sqrt(max(l1 * l1 - a * a, 0.0))
    pv = (pol - axel); pv = pv - dn * pv.dot(dn)
    if pv.length < 1e-6:
        pv = Vector((0, 1, 0)) - dn * dn.y
    return axel + dn * a + pv.normalized() * h, (mal - axel).length <= l1 + l2
