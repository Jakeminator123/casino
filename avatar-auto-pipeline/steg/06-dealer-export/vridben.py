"""Två vridben i varje underarm på en riggad dealer, som standarddockorna har (new_docka.md 7.1b).

ForeArmTwist1 och ForeArmTwist2 blir barn till ForeArm, längs den med dess egen rullning: Twist1 från en tredjedel
till två tredjedelar av underarmen, Twist2 från två tredjedelar till handleden. Underarmens vikt delas efter hörnets
läge längs underarmen (u = 0 vid armbågen, 1 vid handleden): bara ForeArm vid armbågen, lika ForeArm och Twist1 vid
u = 0,25, bara Twist1 vid u = 0,5, lika Twist1 och Twist2 vid u = 0,75, bara Twist2 vid handleden och bortom den.
Handens och fingrarnas vikter rörs inte, högst fyra ben per hörn. Eftersom vridbenen följer ForeArm så länge de inte
vrids, är huden i vila, och i varje ställning där de inte vrids, exakt som förut: lagga_till() mäter det.

Anropas av exportera_dealer.py (steg 06) före exporten; ett prefix på benen (mixamorig:) följer med till vridbenen.
"""
import bpy
import numpy as np
from mathutils import Matrix

VRID_NOD = (0.0, 0.5, 1.0)  # som scen/bygg_docka.py: ForeArm -> Twist1 (mitten) -> Twist2 (handleden)


def _evaluated(mesh):
    ev = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    pts = np.empty((len(ev.data.vertices), 3))
    ev.data.vertices.foreach_get("co", pts.ravel())
    return pts


def _prova_stallning(arm, on):
    """En ställning som rör armarna ordentligt (axel, armbåge, underarmens rullning och handleden), men inte vridbenen."""
    rot = {"Arm": (0.4, 0.2, -0.3), "ForeArm": (0.9, 0.7, 0.2), "Hand": (0.5, -0.6, 0.3)}
    for pb in arm.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
        if on:
            part = pb.name.split(":")[-1].replace("Left", "").replace("Right", "")
            if part in rot:
                pb.rotation_mode = "XYZ"
                pb.rotation_euler = rot[part]
    bpy.context.view_layer.update()


def lagga_till(arm, mesh):
    bones = {b.name.split(":")[-1]: b.name for b in arm.data.bones}
    if all(f"{s}ForeArmTwist{j}" in bones for s in ("Left", "Right") for j in (1, 2)):
        return {"hoppade_over": "vridbenen finns redan"}
    _prova_stallning(arm, True)
    before_pose = _evaluated(mesh)
    _prova_stallning(arm, False)
    before_rest = _evaluated(mesh)

    view = bpy.context.view_layer
    for o in view.objects:
        o.select_set(False)
    arm.select_set(True)
    view.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    for side in ("Right", "Left"):
        fe = eb[bones[side + "ForeArm"]]
        prefix = fe.name[: -len(side + "ForeArm")]
        for j, (t0, t1) in enumerate(((1 / 3, 2 / 3), (2 / 3, 1.0)), start=1):
            tb = eb.new(f"{prefix}{side}ForeArmTwist{j}")
            tb.head = fe.head.lerp(fe.tail, t0)
            tb.tail = fe.head.lerp(fe.tail, t1)
            tb.roll = fe.roll
            tb.parent = fe
            tb.use_connect = False
            tb.use_deform = True
    bpy.ops.object.mode_set(mode="OBJECT")

    deform = {b.name for b in arm.data.bones if b.use_deform}
    namn = {g.index: g.name for g in mesh.vertex_groups}
    M = np.array(arm.matrix_world.inverted() @ mesh.matrix_world)
    co = np.empty((len(mesh.data.vertices), 3))
    mesh.data.vertices.foreach_get("co", co.ravel())
    co = co @ M[:3, :3].T + M[:3, 3]
    rep = {}
    for side in ("Right", "Left"):
        fa = arm.data.bones[bones[side + "ForeArm"]]
        prefix = fa.name[: -len(side + "ForeArm")]
        e, wr = np.array(fa.head_local), np.array(fa.tail_local)
        L = float(np.linalg.norm(wr - e))
        dvec = (wr - e) / L
        g_fa = mesh.vertex_groups[fa.name]
        g_t = [mesh.vertex_groups.new(name=f"{prefix}{side}ForeArmTwist{j}") for j in (1, 2)]
        delade = samlade = 0
        for v in mesh.data.vertices:
            wf = next((ge.weight for ge in v.groups if ge.group == g_fa.index), 0.0)
            if wf <= 0:
                continue
            u = float((co[v.index] - e) @ dvec / L)
            n0, n1, n2 = VRID_NOD
            if u <= n0:
                continue
            if u < n1:
                f = (u - n0) / (n1 - n0); dela = [wf * (1 - f), wf * f, 0.0]
            elif u < n2:
                f = (u - n1) / (n2 - n1); dela = [0.0, wf * (1 - f), wf * f]
            else:
                dela = [0.0, 0.0, wf]
            for i in range(3):  # en mycket liten del läggs till grannen, så att inget ben får en vikt som inget gör
                if 0 < dela[i] < 1e-3 * wf:
                    j = i + 1 if i < 2 and dela[i + 1] > 0 else i - 1
                    dela[j] += dela[i]; dela[i] = 0.0
            andra = sum(1 for ge in v.groups if namn.get(ge.group) in deform and ge.weight > 0 and ge.group != g_fa.index)
            if andra + sum(1 for x in dela if x > 0) > 4:
                # Högst fyra ben: hela underarmens vikt på det av de tre som har mest av den.
                k = int(np.argmax(dela)); dela = [wf if i == k else 0.0 for i in range(3)]
                samlade += 1
            for g, w in zip((g_fa, *g_t), dela):
                if w > 0:
                    g.add([v.index], w, "REPLACE")
                elif g is g_fa:
                    g.remove([v.index])
            delade += 1
        rep[side] = {"horn_delade": delade, "horn_pa_ett_ben_for_fyragransen": samlade,
                     "underarm_m": round(L, 4), "vridben_langd_m": round(L / 3, 4)}
    _prova_stallning(arm, False)
    after_rest = _evaluated(mesh)
    _prova_stallning(arm, True)
    after_pose = _evaluated(mesh)
    _prova_stallning(arm, False)
    rep["hud_i_vila_max_mm"] = round(float(np.linalg.norm(after_rest - before_rest, axis=1).max()) * 1000, 5)
    rep["hud_i_stallning_max_mm"] = round(float(np.linalg.norm(after_pose - before_pose, axis=1).max()) * 1000, 5)
    if rep["hud_i_vila_max_mm"] > 0.01 or rep["hud_i_stallning_max_mm"] > 0.05:
        raise ValueError(f"Vridbenen ändrar huden när de inte vrids: {rep}")
    return rep
