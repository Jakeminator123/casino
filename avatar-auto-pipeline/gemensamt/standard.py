"""Läser scen/standard.yaml – projektets enda sanning för mått (meter, Blender Z upp).

Blenders inbyggda Python saknar PyYAML, så här finns en liten läsare för just den YAML-delmängd
som standard.yaml använder: block-mappar med två blankstegs indrag, skalärer, "strängar",
inline-listor [..] och inline-mappar {..}. Finns PyYAML används den i stället.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

STANDARD = Path(__file__).resolve().parent.parent / "scen" / "standard.yaml"


def _strip_comment(line: str) -> str:
    out, quote = [], False
    for i, ch in enumerate(line):
        if ch == '"':
            quote = not quote
        if ch == "#" and not quote and (i == 0 or line[i - 1] in " \t"):
            break
        out.append(ch)
    return "".join(out).rstrip()


def _scalar(text: str):
    text = text.strip()
    if text == "":
        return None
    if text[0] in "[{":
        # inline: citera nakna nycklar så att det blir JSON
        js = re.sub(r'([{,]\s*)([A-Za-z_][\w.]*)\s*:', r'\1"\2":', text)
        return json.loads(js)
    if text[0] == '"':
        return json.loads(text)
    if text in ("true", "false"):
        return text == "true"
    if text in ("null", "~"):
        return None
    try:
        return int(text)
    except ValueError:
        pass
    try:
        return float(text)
    except ValueError:
        return text


def _mini_load(text: str) -> dict:
    root: dict = {}
    stack: list[tuple[int, dict]] = [(-1, root)]
    for raw in text.splitlines():
        line = _strip_comment(raw)
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip(" "))
        key, _, rest = line.strip().partition(":")
        while stack[-1][0] >= indent:
            stack.pop()
        parent = stack[-1][1]
        k = int(key) if key.isdigit() else key
        if rest.strip() == "":
            parent[k] = {}
            stack.append((indent, parent[k]))
        else:
            parent[k] = _scalar(rest)
    return root


def load(path: str | Path | None = None) -> dict:
    p = Path(path) if path else STANDARD
    text = p.read_text(encoding="utf-8")
    try:
        import yaml  # type: ignore
        return yaml.safe_load(text)
    except ImportError:
        return _mini_load(text)


def spelets_dump(nytt: bool = False) -> dict:
    """Spelets egna tal, lästa ur blackjack-dealers kod av scen/las_spelet.ts (Node): {'spelet': ..., 'bord': ...}.

    Dumpen ligger i slasken och görs om när den saknas eller när `nytt` är sant. scen/gen_standard.py gör
    standard.yaml av den; QC-verktygen ritar spelets egna bildpunkter ur den.
    """
    import subprocess

    from gemensamt.sokvagar import slask

    rot = Path(__file__).resolve().parent.parent
    fil = slask("matt", rot) / "spelet.json"
    if nytt or not fil.exists():
        subprocess.run(["node", str(rot / "scen" / "las_spelet.ts"), str(fil)], check=True, stdin=subprocess.DEVNULL)
    return json.loads(fil.read_text(encoding="utf-8"))


def get(d: dict, dotted: str):
    """get(std, 'platser.P1.C1') – sista delen får innehålla punkt (P1.C1)."""
    parts = dotted.split(".")
    cur = d
    i = 0
    while i < len(parts):
        for j in range(len(parts), i, -1):
            k = ".".join(parts[i:j])
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
                i = j
                break
        else:
            raise KeyError(dotted)
    return cur
