"""Fingerben + hals/axel-viktrensning för en Meshy-riggad A-pose-avatar (körs i Blender).

blender -b --python pipeline/bygg_fingrar_apose.py -- riggad.glb avatar-rigg.glb
Sätt AXELFLYTT=0 för att behålla Meshys axelleder."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import fingrar_apose
import bygg_fingrar
bygg_fingrar.fit_fingers = fingrar_apose.fit_fingers
import os
if os.environ.get("AXELFLYTT") == "0":
    bygg_fingrar.flytta_axelleder = lambda arm, model: {"hoppade_over": "AXELFLYTT=0 (Meshys A-pose-leder behålls)"}
src, dst = sys.argv[sys.argv.index("--") + 1:]
bygg_fingrar.export(Path(src).resolve(), Path(dst).resolve())
Path(dst).with_name("fingrar-apose.json").write_text(json.dumps(fingrar_apose.RAPPORT, indent=1), encoding="utf-8")

