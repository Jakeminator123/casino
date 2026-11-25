"""Fingerben + hals/axel-viktrensning för en Meshy-riggad A-pose-avatar (körs i Blender).

blender -b --python pipeline/bygg_fingrar_apose.py -- riggad.glb avatar-rigg.glb
Sätt AXELFLYTT=0 för att behålla Meshys axelleder."""

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

import json, sys
from pathlib import Path
import fingrar_apose
import bygg_fingrar
bygg_fingrar.fit_fingers = fingrar_apose.fit_fingers
import os
if os.environ.get("AXELFLYTT") == "0":
    bygg_fingrar.flytta_axelleder = lambda arm, model: {"hoppade_over": "AXELFLYTT=0 (Meshys A-pose-leder behålls)"}
src, dst = sys.argv[sys.argv.index("--") + 1:]
bygg_fingrar.export(Path(src).resolve(), Path(dst).resolve())
Path(dst).with_name("fingrar-apose.json").write_text(json.dumps(fingrar_apose.RAPPORT, indent=1), encoding="utf-8")

