"""Projektrot och importvägar för skript i steg/ och gemensamt/."""

from __future__ import annotations

import sys
from pathlib import Path

STEG = (
    "01-referenser",
    "02-meshy-delar",
    "03-montering",
    "04-rigg",
    "05-fingrar-handleder",
    "06-dealer-export",
    "07-qc",
    "08-film",
)


def project_root(start=None) -> Path:
    p = Path(start or __file__).resolve()
    if p.is_file():
        p = p.parent
    for cand in (p, *p.parents):
        if (cand / "auto_avatar.py").is_file() and (cand / "steg").is_dir():
            return cand
    raise RuntimeError("Hittar inte projektroten (auto_avatar.py + steg/).")


def add_paths(root=None) -> Path:
    root = Path(root) if root is not None else project_root()
    paths = [root, root / "gemensamt", root / "metod", *[root / "steg" / name for name in STEG]]
    for path in reversed(paths):
        s = str(path)
        if path.is_dir() and s not in sys.path:
            sys.path.insert(0, s)
    return root


def slask(uppgift: str, root=None) -> Path:
    """Arbetsmappen för en uppgift: <casino>/slask/avatar-auto-pipeline/<uppgift>/ (casino/AGENTS.md, "Tillfälligt och producerat").

    Skapar mappen när den saknas. Det som ligger där är tillfälligt: slaskens regel tar det som inte har ändrats på tre
    timmar, och verktyget som skrev det gör om det.
    """
    root = Path(root) if root is not None else project_root()
    mapp = root.parent / "slask" / root.name / uppgift
    mapp.mkdir(parents=True, exist_ok=True)
    return mapp


def env_candidates(root=None) -> list[Path]:
    root = Path(root) if root is not None else project_root()
    return [
        root / ".env",
        root / ".env.local",
        root.parent / ".env",
        root.parent / ".env.local",
    ]
