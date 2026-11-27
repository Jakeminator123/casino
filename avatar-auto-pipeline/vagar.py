"""Vägarna för att bygga en dealerdocka: kontrollerar vagar.json mot koden och skriver VAGAR.md ur den.

vagar.json är källan (delarna, alternativen, de färdiga vägarna och reglerna); VAGAR.md är en utskrift av den och ändras
aldrig för hand. Kör från avatar-auto-pipeline/ (bara standardbiblioteket behövs):

    .venv/Scripts/python.exe -I vagar.py              kontrollerar och skriver VAGAR.md
    .venv/Scripts/python.exe -I vagar.py --kolla      skriver inget; kod 1 när vagar.json inte stämmer med koden, när en
                                                      regel säger emot en färdig väg, eller när VAGAR.md inte stämmer
    .venv/Scripts/python.exe -I vagar.py --val kropp=meshy-kropp huvud=mpfb-huvud
                                                      vad som går ihop med de valen, och varför resten inte gör det
    .venv/Scripts/python.exe -I vagar.py --visa-steg  vad auto_avatar.py kör, läst ur koden (för den som rättar vagar.json)

Vad som kontrolleras mot verkligheten:
- att varje skript, mapp och datafil som filen pekar på finns;
- att Version 1 är de steg auto_avatar.py kör: stegens nummer, mappar och nycklar (STEP_DIRS och run_step), vilka
  funktioner och Blender-skript varje steg anropar, vilka hjälpskript de i sin tur importerar, vilka steg som betalar
  (ett steg betalar när det når ett requests.post mot en leverantör i om.leverantorer), kvittona och flaggorna.
  auto_avatar.py importeras när Python-miljön har det som behövs (.venv); annars läses samma tal ur koden med ast, och
  det sägs. Stegens anrop läses alltid ur koden med ast, eftersom stegen är funktioner inuti pipeline();
- att priserna gäller de inställningar koden har (meshy-7.1, 4K och så vidare);
- att standarddockans tal (ansiktsformerna, ansiktsbenen, längderna, flaggorna) stämmer med scen/bygg_docka.py, läst
  med ast eftersom skriptet bara går att köra i Blender;
- att benen spelet kräver är de som står under skelettet, tolkat ur texten i figure-model.ts (TypeScript);
- att Danilo och Frasse finns i mätningen live-bj/data/uppsattning.json;
- att ingen regel säger emot en färdig väg, inte heller när en del som vägen säger får bytas byts.
Prov och körningar (output/, slasken, blackjack-dealer/assets/proofs/) är inte i Git; saknas de nämns det bara.
"""
from __future__ import annotations

import argparse
import ast
import importlib
import json
import os
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # importen ska inte skriva __pycache__ i andras mappar
HERE = Path(__file__).resolve().parent
KALLA = HERE / "vagar.json"
UT = HERE / "VAGAR.md"
sys.path.insert(0, str(HERE / "gemensamt"))
import sokvagar  # noqa: E402  (bara standardbiblioteket; projektets sökordning för moduler)

BELAGT_NAMN = {"kod": "kod", "korning": "körning", "prov": "prov", "jakob": "Jakob", "data": "data",
               "bedomning": "bedömning"}
STATUS_NAMN = {"finns": "finns", "provat": "prövat", "tankt": "tänkt", "gar_inte": "går inte"}
STYRKA_NAMN = {"maste": "måste", "i_dag": "i dag"}
ALT_FAKTA = ("kraver", "ger", "gors_av", "kostnad", "tid", "status")
VAG_FAKTA = ("val", "last", "far_bytas", "varfor_last", "kostnad", "tid")
HJALP_UTOM = {"gemensamt/sokvagar.py"}  # alla skript använder den för att hitta projektet

fel: list[str] = []
noter: list[str] = []
lasning: list[str] = []


def rel(p: Path) -> str:
    return os.path.relpath(p, HERE).replace("\\", "/")


def fil(r: str) -> Path:
    return (HERE / r.rstrip("/")).resolve()


# ---- att läsa Python-kod utan att köra den ------------------------------------------------------------------------
_trad: dict[Path, ast.Module] = {}


def trad(p: Path) -> ast.Module:
    if p not in _trad:
        _trad[p] = ast.parse(p.read_text(encoding="utf-8"), filename=str(p))
    return _trad[p]


def hitta_modul(namn: str, fran: Path | None = None) -> Path | None:
    """Projektets fil för en modul, i samma ordning som sokvagar.add_paths (och skriptets egen mapp först)."""
    kand = []
    if fran is not None:
        kand.append(fran.parent / f"{namn}.py")
    kand.append(HERE / (namn.replace(".", "/") + ".py"))
    for d in [HERE, HERE / "gemensamt", HERE / "metod", *[HERE / "steg" / s for s in sokvagar.STEG]]:
        kand.append(d / f"{namn}.py")
    return next((k.resolve() for k in kand if k.is_file()), None)


def importer(p: Path) -> tuple[dict[str, Path], dict[str, tuple[Path, str]]]:
    """Projektmodulerna en fil importerar: (namn -> fil för `import X`, namn -> (fil, namn) för `from X import Y`)."""
    moduler, namn = {}, {}
    for n in ast.walk(trad(p)):
        if isinstance(n, ast.Import):
            for a in n.names:
                f = hitta_modul(a.name, p)
                if f:
                    moduler[a.asname or a.name] = f
        elif isinstance(n, ast.ImportFrom) and n.level == 0 and n.module:
            f = hitta_modul(n.module, p)
            for a in n.names:
                sub = hitta_modul(f"{n.module}.{a.name}", p)
                if sub and not f:
                    moduler[a.asname or a.name] = sub
                elif f:
                    namn[a.asname or a.name] = (f, a.name)
    return moduler, namn


def importerade_filer(p: Path) -> set[Path]:
    moduler, namn = importer(p)
    return set(moduler.values()) | {f for f, _ in namn.values()}


def hjalpskript(direkta: set[Path]) -> list[str]:
    """Det de direkta skripten importerar ur projektet, i flera led, utom dem själva och sokvagar.py."""
    sett, ko = set(direkta), list(direkta)
    while ko:
        p = ko.pop()
        if p.suffix != ".py" or not p.is_file():
            continue
        for f in importerade_filer(p):
            if f not in sett:
                sett.add(f)
                ko.append(f)
    return sorted(r for r in (rel(f) for f in sett - direkta) if r not in HJALP_UTOM)


def toppfunktioner(p: Path) -> dict[str, ast.FunctionDef]:
    return {n.name: n for n in trad(p).body if isinstance(n, ast.FunctionDef)}


def varde(node: ast.AST, p: Path):
    """Ett värde skrivet i koden (konstanter, listor, ordlistor med **, dict(x), modul.NAMN, HERE / "a" / "b")."""
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, (ast.List, ast.Tuple)):
        return [varde(e, p) for e in node.elts]
    if isinstance(node, ast.Dict):
        ut = {}
        for k, v in zip(node.keys, node.values):
            if k is None:
                ut.update(varde(v, p))
            else:
                ut[varde(k, p)] = varde(v, p)
        return ut
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "dict" and len(node.args) == 1:
        return dict(varde(node.args[0], p))
    if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name):
        f = importer(p)[0].get(node.value.id)
        if f:
            return konstant(f, node.attr)
    if isinstance(node, ast.Name):
        if node.id == "HERE":
            return p.parent
        return konstant(p, node.id)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Div):
        return Path(varde(node.left, p)) / varde(node.right, p)
    raise ValueError(f"kan inte läsa {ast.unparse(node)[:80]} i {rel(p)}")


def konstant(p: Path, namn: str):
    for n in trad(p).body:
        if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == namn for t in n.targets):
            return varde(n.value, p)
    raise ValueError(f"{namn} finns inte i {rel(p)}")


def strangar(node: ast.AST) -> set[str]:
    return {n.value for n in ast.walk(node) if isinstance(n, ast.Constant) and isinstance(n.value, str)}


def vardar(host_map: dict[str, str], texts: set[str]) -> set[str]:
    ut = set()
    for t in texts:
        for h in re.findall(r"https://([a-z0-9.-]+)", t):
            if h in host_map:
                ut.add(host_map[h])
    return ut


def betalar(p: Path, fn: ast.FunctionDef, leverantorer: dict[str, str], sett: set | None = None) -> set[str]:
    """Leverantörerna en funktion når med ett requests.post, i flera led genom projektets moduler."""
    sett = set() if sett is None else sett
    if (p, fn.name) in sett:
        return set()
    sett.add((p, fn.name))
    moduler, namn = importer(p)
    egna = toppfunktioner(p)
    ut: set[str] = set()
    for n in ast.walk(fn):
        if not isinstance(n, ast.Call):
            continue
        f = n.func
        if isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.value.id == "requests" and f.attr == "post":
            hos = vardar(leverantorer, strangar(fn)) or vardar(leverantorer, {s for s in strangar(trad(p))})
            ut |= hos or {"okänd leverantör"}
        elif isinstance(f, ast.Name):
            if f.id in egna and egna[f.id] is not fn:
                ut |= betalar(p, egna[f.id], leverantorer, sett)
            elif f.id in namn:
                mf, mn = namn[f.id]
                g = toppfunktioner(mf).get(mn)
                if g:
                    ut |= betalar(mf, g, leverantorer, sett)
        elif isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.value.id in moduler:
            mf = moduler[f.value.id]
            g = toppfunktioner(mf).get(f.attr)
            if g:
                ut |= betalar(mf, g, leverantorer, sett)
    return ut


# ---- auto_avatar.py ------------------------------------------------------------------------------------------------
_import: dict | None = None


def importera() -> dict:
    """auto_avatar.py och stegens moduler importerade, om miljön har det som behövs; annars {}."""
    global _import
    if _import is None:
        try:
            if str(HERE) not in sys.path:
                sys.path.insert(0, str(HERE))
            aa = importlib.import_module("auto_avatar")
            _import = {"auto_avatar": aa}
            lasning.append("auto_avatar.py importerad: STEP_DIRS, SCRIPTS, RIG_TRIANGLES och inställningarna är de som programmet använder.")
        except Exception as e:  # noqa: BLE001
            _import = {}
            lasning.append(f"auto_avatar.py gick inte att importera ({type(e).__name__}: {str(e).splitlines()[0][:120]}); "
                           "talen är lästa ur koden med ast i stället. Kör med .venv/Scripts/python.exe för att importera.")
    return _import


def modulvarde(modul: str, namn: str):
    imp = importera()
    if imp:
        try:
            return getattr(importlib.import_module(modul), namn)
        except Exception:  # noqa: BLE001
            pass
    f = HERE / "auto_avatar.py" if modul == "auto_avatar" else hitta_modul(modul)
    if f is None:
        raise ValueError(f"modulen {modul} finns inte")
    return konstant(f, namn)


def las_auto_avatar(leverantorer: dict[str, str]) -> dict:
    p = HERE / "auto_avatar.py"
    t = trad(p)
    moduler, namn = importer(p)
    step_dirs = {int(k): v for k, v in modulvarde("auto_avatar", "STEP_DIRS").items()}
    scripts = {k: Path(v).resolve() for k, v in modulvarde("auto_avatar", "SCRIPTS").items()}
    pipeline = toppfunktioner(p)["pipeline"]
    inre = {n.name: n for n in pipeline.body if isinstance(n, ast.FunctionDef)}
    steg = {}
    for n in ast.walk(pipeline):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == "run_step":
            nr, nyckel, fn = n.args[0].value, n.args[1].value, n.args[2].id
            kropp = inre[fn]
            anrop, direkta = set(), set()
            for c in ast.walk(kropp):
                if not isinstance(c, ast.Call):
                    continue
                f = c.func
                if isinstance(f, ast.Name) and f.id == "blender" and c.args and isinstance(c.args[0], ast.Constant):
                    anrop.add(f"blender:{c.args[0].value}")
                    sp = scripts.get(c.args[0].value)
                    if sp is None:
                        fel.append(f"auto_avatar.py steg {nr} anropar Blender-skriptet {c.args[0].value}, som inte står i SCRIPTS.")
                    else:
                        direkta.add(sp)
                elif isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.value.id in moduler:
                    anrop.add(f"{f.value.id}.{f.attr}")
                    direkta.add(moduler[f.value.id])
                elif isinstance(f, ast.Name) and f.id in namn:
                    mf, mn = namn[f.id]
                    anrop.add(f"{mf.stem}.{mn}")
                    direkta.add(mf)
            konst = strangar(kropp) | set().union(*(strangar(trad(d)) for d in direkta if d.suffix == ".py" and d.is_file()))
            steg[nr] = {"mapp": step_dirs.get(nr), "nyckel": nyckel, "anrop": anrop, "direkta": direkta,
                        "skript": sorted(rel(d) for d in direkta), "hjalp": hjalpskript(direkta),
                        "betalt": betalar(p, kropp, leverantorer), "strangar": konst}
    flaggor = {}
    for n in ast.walk(toppfunktioner(p)["main"]):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == "add_argument":
            forval = next((varde(k.value, p) for k in n.keywords if k.arg == "default"), None)
            flaggor[n.args[0].value] = forval
    return {"steg": steg, "step_dirs": step_dirs, "scripts": scripts, "flaggor": flaggor,
            "strangar": strangar(pipeline), "rig_trianglar": modulvarde("auto_avatar", "RIG_TRIANGLES")}


def flaggor_i(p: Path) -> dict:
    ut = {}
    for n in ast.walk(trad(p)):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == "add_argument" and n.args \
                and isinstance(n.args[0], ast.Constant) and str(n.args[0].value).startswith("--"):
            ut[n.args[0].value] = next((varde(k.value, p) for k in n.keywords if k.arg == "default"), None)
    return ut


# ---- formen -------------------------------------------------------------------------------------------------------
def kolla_form(d: dict) -> tuple[dict, dict]:
    om = d["om"]
    belagt_ok, status_ok, styrka_ok = set(om["belagt"]), set(om["status"]), set(om["styrka"])
    hos_ok = set(om["leverantorer"].values())
    prov = d["prov"]
    for pid, p in prov.items():
        if p.get("slag") not in ("korning", "prov"):
            fel.append(f"Provet {pid}: slag ska vara korning (en körning) eller prov (ett prov Jakob har sett).")
    delar = {}
    for del_ in d["delar"]:
        if del_["id"] in delar:
            fel.append(f"Delen {del_['id']} står två gånger.")
        alts = {}
        for a in del_["alternativ"]:
            namn = f"{del_['id']}/{a['id']}"
            if a["id"] in alts:
                fel.append(f"{namn} står två gånger.")
            alts[a["id"]] = a
            for k in ("namn", *ALT_FAKTA, "provet", "belagt"):
                if k not in a:
                    fel.append(f"{namn} saknar fältet {k}.")
            if a.get("status") not in status_ok:
                fel.append(f"{namn}: status {a.get('status')} finns inte i om.status.")
            faktafalt = [*ALT_FAKTA, *[k for k in ("hinder", "anm") if a.get(k)]]
            for k in faktafalt:
                if a.get("belagt", {}).get(k) not in belagt_ok:
                    fel.append(f"{namn}: belagt.{k} saknas eller är inte ett av {sorted(belagt_ok)}.")
            for k in a.get("belagt", {}):
                if k not in faktafalt:
                    fel.append(f"{namn}: belagt.{k} hör inte till någon uppgift i alternativet.")
            if a.get("status") in ("tankt", "gar_inte") and not a.get("hinder"):
                fel.append(f"{namn} är {STATUS_NAMN.get(a.get('status'))} men säger inte vad som hindrar (hinder).")
            if a.get("status") == "provat" and not a.get("provet"):
                fel.append(f"{namn} är prövat men säger inte i vilket prov (provet).")
            pv = a.get("provet")
            if pv and pv.get("id") not in prov:
                fel.append(f"{namn}: provet {pv.get('id')} står inte under prov.")
            ko = a.get("kostnad", {})
            if ko.get("hos") is not None and ko["hos"] not in hos_ok:
                fel.append(f"{namn}: kostnaden är hos {ko['hos']}, som inte står i om.leverantorer.")
            if not isinstance(a.get("kraver"), list) or not isinstance(a.get("ger"), list):
                fel.append(f"{namn}: kraver och ger ska vara listor.")
        delar[del_["id"]] = alts
    regler = {}
    for r in d["regler"]:
        if r["id"] in regler:
            fel.append(f"Regeln {r['id']} står två gånger.")
        regler[r["id"]] = r
        for o in r.get("om", []):
            if o != "*" and not finns_val(delar, o):
                fel.append(f"Regeln {r['id']}: {o} finns inte.")
        if r["typ"] == "kraver":
            for dl, alts in r.get("kraver", {}).items():
                for a in alts:
                    if not finns_val(delar, f"{dl}/{a}"):
                        fel.append(f"Regeln {r['id']}: {dl}/{a} finns inte.")
        elif r["typ"] == "utesluter":
            for o in r.get("utesluter", []):
                if not finns_val(delar, o):
                    fel.append(f"Regeln {r['id']}: {o} finns inte.")
        elif r["typ"] != "villkor":
            fel.append(f"Regeln {r['id']}: typen {r['typ']} finns inte (kraver, utesluter, villkor).")
        faktafalt = ("villkor", "prova", "i_dag", "varfor") if r["typ"] == "villkor" else ("varfor",)
        for k in faktafalt:
            if not r.get(k):
                fel.append(f"Regeln {r['id']} saknar {k}.")
            if r.get("belagt", {}).get(k) not in belagt_ok:
                fel.append(f"Regeln {r['id']}: belagt.{k} saknas eller är fel.")
        if r["typ"] != "villkor" and r.get("styrka") not in styrka_ok:
            fel.append(f"Regeln {r['id']}: styrka ska vara en av {sorted(styrka_ok)}.")
    for v in d["vagar"]:
        kolla_vag_form(v, delar, d)
    pris_ids = {p["id"] for p in d["priser"]}
    for p in d["priser"]:
        if p["hos"] not in hos_ok:
            fel.append(f"Priset {p['id']}: {p['hos']} står inte i om.leverantorer.")
    for v in d["vagar"]:
        for s in v.get("steg", []):
            if (s.get("betalt") or {}).get("pris") and s["betalt"]["pris"] not in pris_ids:
                fel.append(f"{v['namn']}, steg {s['nr']}: priset {s['betalt']['pris']} står inte under priser.")
    return delar, regler


def finns_val(delar: dict, o: str) -> bool:
    dl, _, a = o.partition("/")
    return dl in delar and a in delar[dl]


def kolla_vag_form(v: dict, delar: dict, d: dict) -> None:
    namn, om = v.get("namn", v["id"]), d["om"]
    for k in ("namn", "status", "kan_koras", "beskrivning", *VAG_FAKTA, "provet", "belagt"):
        if k not in v:
            fel.append(f"Vägen {namn} saknar fältet {k}.")
    if v.get("status") not in ("finns", "provat", "tankt"):
        fel.append(f"Vägen {namn}: status ska vara finns, provat eller tankt.")
    if set(v.get("val", {})) != set(delar):
        fel.append(f"Vägen {namn}: val ska ha en rad per del ({', '.join(sorted(set(delar) ^ set(v.get('val', {}))))} fattas eller är för mycket).")
    tillatet = {"finns": {"finns"}, "provat": {"finns", "provat"}}.get(v.get("status"))
    for dl, a in v.get("val", {}).items():
        if a is None and v.get("status") == "finns":
            fel.append(f"Vägen {namn} finns men har inget val för {dl}.")
        elif a is not None and not finns_val(delar, f"{dl}/{a}"):
            fel.append(f"Vägen {namn}: {dl}/{a} finns inte.")
        elif a is not None and tillatet and delar[dl][a]["status"] not in tillatet:
            fel.append(f"Vägen {namn} är {STATUS_NAMN[v['status']]} men väljer {dl}/{a}, som är {STATUS_NAMN[delar[dl][a]['status']]}.")
    last, fritt = set(v.get("last", [])), set(v.get("far_bytas", {}))
    if last & fritt:
        fel.append(f"Vägen {namn}: {', '.join(sorted(last & fritt))} är både låst och fri.")
    if (last | fritt) != set(delar):
        fel.append(f"Vägen {namn}: varje del ska vara låst eller få bytas ({', '.join(sorted(set(delar) - last - fritt))} är ingetdera).")
    for dl, alts in v.get("far_bytas", {}).items():
        if v.get("val", {}).get(dl) not in alts:
            fel.append(f"Vägen {namn}: far_bytas.{dl} ska ha med vägens eget val.")
        for a in alts:
            if not finns_val(delar, f"{dl}/{a}"):
                fel.append(f"Vägen {namn}: far_bytas {dl}/{a} finns inte.")
    faktafalt = [*VAG_FAKTA, *[k for k in ("anm", "saknas", "dockor") if v.get(k)]]
    for k in faktafalt:
        if v.get("belagt", {}).get(k) not in om["belagt"]:
            fel.append(f"Vägen {namn}: belagt.{k} saknas eller är fel.")
    if v.get("status") == "tankt" and not v.get("saknas"):
        fel.append(f"Vägen {namn} är tänkt men säger inte vad som saknas.")
    if v.get("kan_koras") and (v.get("status") != "finns" or not v.get("korning")):
        fel.append(f"Vägen {namn} sägs gå att köra men är inte en väg som finns med en körning.")
    if v.get("provet") and v["provet"].get("id") not in d["prov"]:
        fel.append(f"Vägen {namn}: provet {v['provet'].get('id')} står inte under prov.")
    for hos, kr in v.get("kostnad", {}).get("krediter", {}).items():
        if hos not in om["leverantorer"].values() or not isinstance(kr, (int, float)):
            fel.append(f"Vägen {namn}: kostnaden {hos} {kr} är inte en leverantör med ett tal.")


# ---- reglerna -----------------------------------------------------------------------------------------------------
def brott(regler: dict, val: dict, strikt: bool) -> list[tuple[dict, str, str]]:
    """Reglerna (kräver, utesluter) som valen bryter mot: (regeln, valet som utlöste den, vad som brister).
    strikt: en del som regeln kräver men som inte är vald räknas som ett brott (en färdig väg); annars kan den väljas sen."""
    ut = []
    for r in regler.values():
        if r["typ"] not in ("kraver", "utesluter"):
            continue
        utlost = [o for o in r["om"] if o != "*" and val.get(o.split("/")[0]) == o.split("/")[1]]
        if not utlost:
            continue
        if r["typ"] == "kraver":
            for dl, alts in r["kraver"].items():
                v = val.get(dl)
                if v is None and strikt:
                    ut.append((r, utlost[0], f"{dl} är inte vald"))
                elif v is not None and v not in alts:
                    ut.append((r, utlost[0], f"{dl}/{v}"))
        else:
            for o in r["utesluter"]:
                dl, a = o.split("/")
                if val.get(dl) == a:
                    ut.append((r, utlost[0], o))
    return ut


def brott_text(r: dict, ur: str, vad: str) -> str:
    if r["typ"] == "utesluter":
        return f"{ur} utesluter {vad}"
    dl = vad.split("/")[0].split(" ")[0]
    return f"{ur} kräver {dl}: {' eller '.join(r['kraver'][dl])}, men vägen har {vad}"


def kolla_regler(d: dict, delar: dict, regler: dict) -> None:
    for v in d["vagar"]:
        val = v["val"]
        bas = brott(regler, val, strikt=True)
        for r, ur, vad in bas:
            fel.append(f"Vägen {v['namn']} bryter mot regeln {r['id']}: {brott_text(r, ur, vad)}.")
        sett = {(r["id"], ur, vad) for r, ur, vad in bas}
        for dl, alts in v.get("far_bytas", {}).items():
            for a in alts:
                if a == val[dl]:
                    continue
                for r, ur, vad in brott(regler, {**val, dl: a}, strikt=True):
                    if (r["id"], ur, vad) not in sett:
                        fel.append(f"Vägen {v['namn']} säger att {dl} får bytas till {a}, men då bryts regeln {r['id']}: {brott_text(r, ur, vad)}.")


# ---- verkligheten -------------------------------------------------------------------------------------------------
def kolla_filer(d: dict) -> None:
    pekar = []
    for del_ in d["delar"]:
        for a in del_["alternativ"]:
            pekar += [(f"{del_['id']}/{a['id']}", s) for s in a["gors_av"].get("skript", [])]
    pekar += [("scenen", s) for s in d["scenen"]["skript"]]
    pekar.append(("skelettet", d["skelettet"]["kalla"]))
    for v in d["vagar"]:
        if v.get("korning"):
            pekar.append((v["namn"], v["korning"]["program"]))
        for s in v.get("steg", []):
            pekar += [(f"{v['namn']}, steg {s['nr']}", x) for x in s.get("skript", []) + s.get("hjalp", [])]
    for vem, r in pekar:
        if not fil(r).exists():
            fel.append(f"{vem} pekar på {r}, som inte finns.")
    for pid, p in d["prov"].items():
        saknas = [x for x in p["var"] if not fil(x).exists()]
        if saknas:
            noter.append(f"Provet {pid}: {', '.join(saknas)} finns inte på den här datorn (inte i Git).")


def kolla_version_1(d: dict, aa: dict, delar: dict) -> None:
    v = next((x for x in d["vagar"] if (x.get("korning") or {}).get("program") == "auto_avatar.py"), None)
    if v is None:
        fel.append("Ingen väg körs av auto_avatar.py (korning.program), så Version 1 saknas.")
        return
    namn = v["namn"]
    kod, fil_steg = aa["steg"], {s["nr"]: s for s in v["steg"]}
    if set(kod) != set(fil_steg):
        fel.append(f"{namn}: koden kör stegen {sorted(kod)}, vagar.json har {sorted(fil_steg)}.")
    if set(aa["step_dirs"]) != set(kod):
        fel.append(f"auto_avatar.py: STEP_DIRS har {sorted(aa['step_dirs'])} men run_step kör {sorted(kod)}.")
    for nr in sorted(set(kod) & set(fil_steg)):
        k, s, vem = kod[nr], fil_steg[nr], f"{namn}, steg {nr}"
        if s["mapp"] != k["mapp"]:
            fel.append(f"{vem}: mappen är {k['mapp']} i koden, {s['mapp']} i vagar.json.")
        if s["nyckel"] != k["nyckel"]:
            fel.append(f"{vem}: nyckeln är {k['nyckel']} i koden, {s['nyckel']} i vagar.json.")
        jamfor(vem, "anropen", set(s["anrop"]), k["anrop"])
        jamfor(vem, "skripten", set(s["skript"]), set(k["skript"]))
        jamfor(vem, "hjälpskripten", set(s.get("hjalp", [])), set(k["hjalp"]))
        hos = {s["betalt"]["hos"]} if s.get("betalt") else set()
        if hos != k["betalt"]:
            fel.append(f"{vem}: koden betalar hos {sorted(k['betalt']) or 'ingen'}, vagar.json säger {sorted(hos) or 'ingen'}.")
        if s.get("kvitto") and s["kvitto"] not in k["strangar"]:
            fel.append(f"{vem}: kvittot {s['kvitto']} står inte i stegets kod eller i modulerna det anropar.")
        for dl in s.get("delar", []):
            if dl not in delar:
                fel.append(f"{vem}: delen {dl} finns inte.")
    flaggor_fil = {f["flagga"]: f for f in v["korning"]["flaggor"]}
    jamfor(f"{namn}, flaggorna", "", set(flaggor_fil), set(aa["flaggor"]))
    for fl, f in flaggor_fil.items():
        if "forval" in f and fl in aa["flaggor"] and aa["flaggor"][fl] != f["forval"]:
            fel.append(f"{namn}: {fl} har förvalet {aa['flaggor'][fl]} i koden, {f['forval']} i vagar.json.")
    for k in ("status_fil", "rapport_fil"):
        if v["korning"].get(k) and v["korning"][k] not in aa["strangar"]:
            fel.append(f"{namn}: {v['korning'][k]} står inte i pipeline() i auto_avatar.py.")
    # alternativen och stegen: ett alternativ som säger att ett steg i Version 1 gör det ska höra till stegets delar
    # och skript
    for dl, a, alt in ((dl, a, alt) for dl, alts in delar.items() for a, alt in alts.items()):
        for nr in alt["gors_av"].get("steg") or []:
            s = fil_steg.get(nr)
            if s is None:
                fel.append(f"{dl}/{a} säger steg {nr}, som Version 1 inte har.")
                continue
            if dl not in s.get("delar", []):
                fel.append(f"{dl}/{a} säger steg {nr}, men steg {nr} har inte delen {dl} under delar.")
        stegens = set().union(*[set(fil_steg[nr]["skript"]) | set(fil_steg[nr].get("hjalp", []))
                                for nr in (alt["gors_av"].get("steg") or []) if nr in fil_steg])
        for sk in alt["gors_av"].get("skript", []):
            if alt["gors_av"].get("steg") and sk not in stegens:
                fel.append(f"{dl}/{a}: {sk} körs inte av steg {alt['gors_av']['steg']} enligt koden.")
    # kostnaden och tiden räknade ur stegen och ur valen
    per_hos: dict[str, float] = {}
    for s in v["steg"]:
        b = s.get("betalt")
        if b and b.get("krediter") is not None:
            per_hos[b["hos"]] = per_hos.get(b["hos"], 0) + b["krediter"]
    if per_hos != v["kostnad"]["krediter"]:
        fel.append(f"{namn}: stegen kostar {per_hos}, vägen säger {v['kostnad']['krediter']}.")
    summa = round(sum(s["tid_s"] for s in v["steg"] if s.get("tid_s") is not None), 1)
    if v["tid"]["sekunder"] is not None and abs(summa - v["tid"]["sekunder"]) > 0.05:
        fel.append(f"{namn}: stegens tider är {summa} s, vägen säger {v['tid']['sekunder']} s.")
    rig = next((a.get("matt", {}).get("rig_trianglar") for a in delar["rigg"].values() if a.get("matt", {}).get("rig_trianglar")), None)
    if rig is not None and rig != aa["rig_trianglar"]:
        fel.append(f"auto_avatar.py gör den lätta kopian på {aa['rig_trianglar']} trianglar, vagar.json säger {rig}.")
    priser = {p["id"]: p for p in d["priser"]}
    for s in v["steg"]:
        b = s.get("betalt") or {}
        if b.get("pris") and b.get("jobb") and b.get("krediter") != priser[b["pris"]]["krediter"] * b["jobb"]:
            fel.append(f"{namn}, steg {s['nr']}: {b['jobb']} jobb à {priser[b['pris']]['krediter']} är inte {b['krediter']} krediter.")
    jobb2 = next((n for n in ast.walk(toppfunktioner(HERE / 'auto_avatar.py')['pipeline'])
                  if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "jobs" for t in n.targets)), None)
    if jobb2 is not None and isinstance(jobb2.value, ast.Dict):
        n = len(jobb2.value.keys)
        s2 = next((s for s in v["steg"] if (s.get("betalt") or {}).get("pris") == "meshy-bild-till-3d"), None)
        if s2 and s2["betalt"].get("jobb") != n:
            fel.append(f"{namn}: koden beställer {n} delar hos Meshy, vagar.json säger {s2['betalt'].get('jobb')}.")


def jamfor(vem: str, vad: str, enligt_filen: set, enligt_koden: set) -> None:
    if enligt_filen != enligt_koden:
        bara_kod, bara_fil = sorted(enligt_koden - enligt_filen), sorted(enligt_filen - enligt_koden)
        delar = ([f"koden har också {', '.join(bara_kod)}"] if bara_kod else []) + \
                ([f"koden har inte {', '.join(bara_fil)}"] if bara_fil else [])
        fel.append(f"{vem}{': ' + vad if vad else ''} stämmer inte med koden ({'; '.join(delar)}).")


def kolla_andra_steg(d: dict) -> None:
    """Hjälpskripten för stegen i de andra vägarna (de som inte körs av auto_avatar.py)."""
    for v in d["vagar"]:
        if (v.get("korning") or {}).get("program") == "auto_avatar.py":
            continue
        for s in v.get("steg", []):
            direkta = {fil(x) for x in s.get("skript", []) if fil(x).suffix == ".py" and fil(x).is_file()}
            jamfor(f"{v['namn']}, steg {s['nr']}", "hjälpskripten", set(s.get("hjalp", [])), set(hjalpskript(direkta)))


def kolla_standarddockan(d: dict, delar: dict) -> None:
    p = HERE / "scen" / "bygg_docka.py"
    try:
        former, ben, matt = len(konstant(p, "ARKIT_KARTA")), len(konstant(p, "ANSIKTSBEN")), konstant(p, "MATT")
    except Exception as e:  # noqa: BLE001
        fel.append(f"scen/bygg_docka.py gick inte att läsa: {e}")
        return
    lasning.append("scen/bygg_docka.py läst med ast (ARKIT_KARTA, ANSIKTSBEN, MATT och flaggorna): skriptet går bara att köra i Blender.")
    a = delar["ansiktsrigg"].get("mpfb-ansikte", {}).get("matt", {})
    if a and (a.get("ansiktsformer") != former or a.get("ansiktsben") != ben):
        fel.append(f"ansiktsrigg/mpfb-ansikte säger {a.get('ansiktsformer')} former och {a.get('ansiktsben')} ansiktsben; bygg_docka.py har {former} och {ben}.")
    s = delar["underlag"].get("standardmatt", {}).get("matt", {})
    for kon in ("kvinna", "man"):
        if s and s.get(f"langd_{kon}") != MATT_langd(matt, kon):
            fel.append(f"underlag/standardmatt: {kon}nans längd är {MATT_langd(matt, kon)} i bygg_docka.py, {s.get(f'langd_{kon}')} i vagar.json.")
    v = next((x for x in d["vagar"] if (x.get("korning") or {}).get("program") == "scen/bygg_docka.py"), None)
    if v:
        kod = flaggor_i(p)
        filen = {f["flagga"]: f for f in v["korning"]["flaggor"]}
        jamfor(f"{v['namn']}, flaggorna", "", set(filen), set(kod))
        for fl, f in filen.items():
            if "forval" in f and fl in kod and kod[fl] != f["forval"]:
                fel.append(f"{v['namn']}: {fl} har förvalet {kod[fl]} i koden, {f['forval']} i vagar.json.")


def MATT_langd(matt: dict, kon: str):
    return (matt.get(kon) or {}).get("langd")


def kolla_skelettet(d: dict) -> None:
    sk = d["skelettet"]
    p = fil(sk["kalla"])
    if not p.is_file():
        return
    src = p.read_text(encoding="utf-8")
    sidor = re.search(r"const SIDES = \[([^\]]*)\]", src)
    sidor = re.findall(r"'(\w+)'", sidor.group(1)) if sidor else []
    kravs = {f"{s}{n}" for n in re.findall(r"bone\(`\$\{s\}(\w+)`\)", src) for s in sidor}
    kravs |= set(re.findall(r"\bbone\('(\w+)'\)", src))
    kravs |= set(re.findall(r"spine\[0\]\.bone\.name !== '(\w+)'", src))
    lasning.append(f"{sk['kalla']} tolkad ur texten (TypeScript): benen som bone(...) kräver, och Hips.")
    if not kravs:
        fel.append(f"Benen som spelet kräver gick inte att läsa ur {sk['kalla']} (skrivsättet har ändrats?).")
    else:
        jamfor("skelettet.kravs", "", set(sk["kravs"]), kravs)


def kolla_matningen(d: dict, delar: dict) -> None:
    a = delar["underlag"].get("matt-ur-film")
    if not a:
        return
    p = fil("../live-bj/data/uppsattning.json")
    if not p.is_file():
        fel.append("underlag/matt-ur-film: ../live-bj/data/uppsattning.json finns inte.")
        return
    dealer = json.loads(p.read_text(encoding="utf-8")).get("dealer", {})
    for stil, docka in a.get("matt", {}).get("dockor", {}).items():
        x = dealer.get(stil) or {}
        if x.get("docka") != docka:
            fel.append(f"underlag/matt-ur-film: stilen {stil} är {x.get('docka')} i uppsattning.json, {docka} i vagar.json.")
        if not isinstance((x.get("body") or {}).get("shoulder_width"), (int, float)):
            fel.append(f"underlag/matt-ur-film: {docka} har ingen axelbredd (dealer.{stil}.body.shoulder_width) i uppsattning.json.")
    for v in d["vagar"]:
        for dk in v.get("dockor", []):
            if a.get("matt", {}).get("dockor", {}).get(dk["stil"]) != dk["namn"].lower():
                fel.append(f"Vägen {v['namn']}: {dk['namn']} (stilen {dk['stil']}) står inte så i underlag/matt-ur-film.")


def kolla_priser(d: dict) -> None:
    for pr in d["priser"]:
        for g in pr["galler_nar"]:
            try:
                har = modulvarde(g["modul"], g["namn"])
            except Exception as e:  # noqa: BLE001
                fel.append(f"Priset {pr['id']}: {g['modul']}.{g['namn']} gick inte att läsa ({e}).")
                continue
            for k, v in g["varden"].items():
                if har.get(k) != v:
                    fel.append(f"Priset {pr['id']} ({pr['krediter']} krediter) gäller {k} = {v}, men {g['modul']}.{g['namn']} har {har.get(k)}.")


def kolla_val_mot_kostnad(d: dict, delar: dict) -> None:
    for v in d["vagar"]:
        per: dict[str, float] = {}
        for dl, a in v["val"].items():
            if a is None:
                continue
            k = delar[dl][a]["kostnad"]
            if k.get("hos") and k.get("krediter"):
                per[k["hos"]] = per.get(k["hos"], 0) + k["krediter"]
        if per != v["kostnad"]["krediter"]:
            fel.append(f"Vägen {v['namn']}: valen kostar {per}, vägen säger {v['kostnad']['krediter']}.")


def kolla(d: dict) -> tuple[dict, dict, dict | None]:
    delar, regler = kolla_form(d)
    if fel:
        return delar, regler, None
    kolla_filer(d)
    kolla_regler(d, delar, regler)
    kolla_val_mot_kostnad(d, delar)
    aa = None
    try:
        aa = las_auto_avatar(d["om"]["leverantorer"])
    except Exception as e:  # noqa: BLE001
        fel.append(f"auto_avatar.py gick inte att läsa: {type(e).__name__}: {e}")
    if aa:
        lasning.append("Stegens anrop, hjälpskript, betalningar och flaggor lästa ur auto_avatar.py med ast.")
        kolla_version_1(d, aa, delar)
    kolla_andra_steg(d)
    kolla_standarddockan(d, delar)
    kolla_skelettet(d)
    kolla_matningen(d, delar)
    kolla_priser(d)
    return delar, regler, aa


# ---- utskriften ---------------------------------------------------------------------------------------------------
def c(x) -> str:
    return str(x).replace("|", "\\|")


def b(text: str, kind: str | None) -> str:
    return f"{text} _({BELAGT_NAMN[kind]})_" if kind else text


def tal(x: float) -> str:
    s = f"{x:.1f}".rstrip("0").rstrip(".")
    return s.replace(".", ",")


def tabell(rubriker: list[str], rader: list[list]) -> str:
    ut = ["| " + " | ".join(rubriker) + " |", "| " + " | ".join("---" for _ in rubriker) + " |"]
    ut += ["| " + " | ".join(c(x) for x in r) + " |" for r in rader]
    return "\n".join(ut)


def kostnad_text(k: dict) -> str:
    return k["text"] if not k.get("hos") or k["hos"] in k["text"] else f"{k['text']} ({k['hos']})"


def provet(d: dict, pv: dict) -> str:
    slag = d["prov"][pv["id"]]["slag"]
    return f"{'körningen' if slag == 'korning' else 'provet'} `{pv['id']}`: {b(pv['sa'], slag)}"


def alt_namn(delar: dict, o: str) -> str:
    dl, a = o.split("/")
    return delar[dl][a]["namn"]


def skriv(d: dict, delar: dict, regler: dict) -> str:
    delnamn = {x["id"]: x["namn"] for x in d["delar"]}
    ut = ["# Vägarna: så byggs en dealerdocka", "", d["om"]["vad"], "",
          "**Den här filen ändras aldrig för hand.** Den skrivs av `vagar.py` ur `vagar.json`, som är källan, och skrivs över "
          "nästa gång. Ändra i `vagar.json` och kör sedan, från `avatar-auto-pipeline/`:", "", "```text",
          ".venv/Scripts/python.exe -I vagar.py              kontrollerar vagar.json mot koden och skriver VAGAR.md",
          ".venv/Scripts/python.exe -I vagar.py --kolla      skriver inget; blir röd när något inte stämmer",
          ".venv/Scripts/python.exe -I vagar.py --val kropp=meshy-kropp huvud=mpfb-huvud   vad som går ihop med valen",
          ".venv/Scripts/python.exe -I vagar.py --visa-steg  vad auto_avatar.py kör, läst ur koden",
          "```", "", "## Så läses den", "",
          "Varje uppgift bär sitt belägg inom parentes: " + "; ".join(f"_({BELAGT_NAMN[k]})_ {v}" for k, v in d["om"]["belagt"].items()) + ".",
          "", "Status: " + "; ".join(f"**{STATUS_NAMN[k]}** {v}" for k, v in d["om"]["status"].items()) + ".",
          "", "En regels styrka: " + "; ".join(f"**{STYRKA_NAMN[k]}** {v}" for k, v in d["om"]["styrka"].items()) + ".", ""]

    sk = d["skelettet"]
    ut += ["## Skelettet", "", b(sk["regel"], sk["belagt"]["regel"]), "",
           b(f"Spelet (`{sk['kalla'].replace('../', '')}`) kräver: " + ", ".join(f"`{x}`" for x in sk["kravs"]) + ".", sk["belagt"]["kravs"]), "",
           b("Används när de finns: " + "; ".join(sk["anvands_om_de_finns"]) + ".", sk["belagt"]["anvands_om_de_finns"]), "",
           b(sk["var_egen_kontroll"], sk["belagt"]["var_egen_kontroll"]), "", d["scenen"]["text"], ""]

    ut += ["## Vägarna i korthet", "", tabell(["Väg", "Status", "Går att köra", "Kostnad", "Tid"], [
        [f"[{v['namn']}](#{ankare(v['namn'])})", STATUS_NAMN[v["status"]], "ja" if v["kan_koras"] else "nej",
         b(v["kostnad"]["text"], v["belagt"]["kostnad"]), b(v["tid"]["text"], v["belagt"]["tid"])] for v in d["vagar"]]), ""]

    ut += ["## Delarna och alternativen", ""]
    for i, del_ in enumerate(d["delar"], 1):
        ut += [f"### {i}. {del_['namn']}", "", f"_{del_['fraga']}_", ""]
        rader, efter = [], []
        for a in del_["alternativ"]:
            bl = a["belagt"]
            gors = a["gors_av"]
            gtext = "; ".join(x for x in [
                ("steg " + ", ".join(str(n) for n in gors["steg"])) if gors.get("steg") else "",
                ", ".join(f"`{s}`" for s in gors.get("skript", [])), gors.get("text", "")] if x)
            rader.append([f"**{a['namn']}** (`{a['id']}`)", b(STATUS_NAMN[a["status"]], bl["status"]),
                          b("; ".join(a["kraver"]), bl["kraver"]), b("; ".join(a["ger"]), bl["ger"]),
                          b(gtext, bl["gors_av"]), b(kostnad_text(a["kostnad"]), bl["kostnad"]), b(a["tid"]["text"], bl["tid"])])
            if a.get("provet"):
                efter.append(f"- {a['namn']}: {provet(d, a['provet'])}")
            if a.get("hinder"):
                efter.append(f"- {a['namn']}: hinder: {b(a['hinder'], bl.get('hinder'))}")
            if a.get("anm"):
                efter.append(f"- {a['namn']}: {b(a['anm'], bl.get('anm'))}")
        ut += [tabell(["Alternativ", "Status", "Kräver", "Ger", "Görs av", "Kostnad", "Tid"], rader), ""]
        if efter:
            ut += efter + [""]

    ut += ["## De färdiga vägarna", "",
           "En färdig väg är en uppsättning val som hör ihop och är prövade tillsammans. De låsta delarna byts inte en och en; "
           "de som får bytas har sina alternativ i tabellen.", ""]
    for v in d["vagar"]:
        bl = v["belagt"]
        ut += [f"### {v['namn']}", "", f"**{STATUS_NAMN[v['status']].capitalize()}**"
               + (f", körs med `{v['korning']['kommando']}`" if v.get("korning") else "")
               + (f" (Jakob: `{v['korning']['jakob_startar']}`)" if (v.get("korning") or {}).get("jakob_startar") else "") + ".",
               "", v["beskrivning"], "",
               f"- Kostnad: {b(v['kostnad']['text'], bl['kostnad'])}",
               f"- Tid: {b(v['tid']['text'], bl['tid'])}"]
        if v.get("provet"):
            ut.append(f"- {provet(d, v['provet']).capitalize()}")
        for dk in v.get("dockor", []):
            ut.append(f"- {dk['namn']}: stilen {dk['stil']}, måtten i `{dk['kalla'].replace('../', '')}` _({BELAGT_NAMN[bl['dockor']]})_")
        ut += ["", tabell(["Del", "Valet", "I vägen"], [
            [delnamn[dl], delar[dl][a]["namn"] if a else "inte gjort",
             "låst" if dl in v["last"] else "får bytas: " + ", ".join(delar[dl][x]["namn"] for x in v["far_bytas"][dl] if x != a)]
            for dl, a in v["val"].items()]), "", f"Varför de är låsta: {b(v['varfor_last'], bl['varfor_last'])}", ""]
        if v.get("anm"):
            ut += [b(v["anm"], bl.get("anm")), ""]
        if v.get("steg"):
            ut += ["Steg för steg:", "", tabell(["Steg", "Vad", "Skript", "Betalt", "Kvitto", "Tid"], [
                [f"{s['nr']}" + (f" `{s['mapp']}`" if s.get("mapp") else "") + f" {s['namn']}",
                 s["gor"] + (f" `{s['kommando']}`" if s.get("kommando") else ""),
                 ", ".join(f"`{x}`" for x in s["skript"]) + (f"; med {', '.join(f'`{x}`' for x in s['hjalp'])}" if s.get("hjalp") else ""),
                 (f"{s['betalt']['text']} ({s['betalt']['hos']})" if s.get("betalt") else "gratis"),
                 f"`{s['kvitto']}`" if s.get("kvitto") else "",
                 (b(f"{tal(s['tid_s'])} s", "korning") if s.get("tid_s") is not None else "inte mätt")]
                for s in v["steg"]]), ""]
        if (v.get("korning") or {}).get("flaggor"):
            ut += ["Flaggorna:", "", tabell(["Flagga", "Gör", "Förval", "I guiden"], [
                [f"`{f['flagga']}`", f["gor"], c(f.get("forval", "")) if "forval" in f else "", "ja" if f["i_guiden"] else "nej"]
                for f in v["korning"]["flaggor"]]), ""]
        if v.get("saknas"):
            ut += ["Det som saknas:", ""] + [f"- {x}" for x in v["saknas"]] + [f"_({BELAGT_NAMN[bl['saknas']]})_", ""]

    ut += ["## Reglerna", "", "Guiden erbjuder bara det som går ihop med de val som redan är gjorda, och säger varför resten inte går. "
           "Styrkan _i dag_ betyder att ett nytt steg kan ändra det.", "", "### Det som krävs och det som utesluts", ""]
    rader = []
    for r in regler.values():
        if r["typ"] == "kraver":
            sa = "kräver " + "; ".join(f"{delnamn[dl]}: " + " eller ".join(delar[dl][a]["namn"] for a in alts) for dl, alts in r["kraver"].items())
        elif r["typ"] == "utesluter":
            sa = "utesluter " + "; ".join(f"{delnamn[o.split('/')[0]]}: {alt_namn(delar, o)}" for o in r["utesluter"])
        else:
            continue
        rader.append([" eller ".join(alt_namn(delar, o) for o in r["om"]), sa, STYRKA_NAMN[r["styrka"]], b(r["varfor"], r["belagt"]["varfor"]), f"`{r['id']}`"])
    ut += [tabell(["Om du väljer", "så", "Styrka", "Varför", "Regel"], rader), "", "### Villkor som modellen själv måste uppfylla", "",
           "De prövas på modellen, inte på valen. En princip är Jakobs regel för hur valet ska göras.", ""]
    for r in regler.values():
        if r["typ"] != "villkor":
            continue
        bl = r["belagt"]
        galler = "alla vägar" if r["om"] == ["*"] else ", ".join(alt_namn(delar, o) for o in r["om"])
        ut += [f"**{'Princip: ' if r.get('princip') else ''}{b(r['villkor'], bl['villkor'])}** (`{r['id']}`; gäller {galler})", "",
               f"- Prövas: {b(r['prova'], bl['prova'])}", f"- I dag: {b(r['i_dag'], bl['i_dag'])}",
               f"- Varför: {b(r['varfor'], bl['varfor'])}", f"- Källa: {r['kalla']}", ""]

    ut += ["## Proven och körningarna", "", tabell(["Prov", "Slag", "Datum", "Vad det sa", "Jakobs ord", "Var"], [
        [f"`{pid}` {p['namn']}", "körning" if p["slag"] == "korning" else "prov", p["datum"], p["sa"],
         p["jakobs_ord"] or (f"inte dömt av honom; domaren: {p['domarens_ord']}" if p.get("domarens_ord") else "inte dömt"),
         ", ".join(f"`{x.replace('../', '')}`" for x in p["var"])]
        for pid, p in d["prov"].items()]), "", "## Priserna", "",
        "Ett pris gäller bara de inställningar som står bredvid; ändras inställningen i koden blir `--kolla` röd.", "",
        tabell(["Vad", "Hos", "Krediter", "Gäller när", "Källa"], [
            [p["vad"], p["hos"], b(str(p["krediter"]), p["belagt"]["krediter"]),
             "; ".join(f"`{g['modul']}.{g['namn']}` " + ", ".join(f"{k} = {json.dumps(x)}" for k, x in g["varden"].items()) for g in p["galler_nar"]),
             p["kalla"]] for p in d["priser"]]), "", "## Så kontrolleras filen", "",
        "`vagar.py --kolla` är röd när något av det här inte stämmer:", "",
        "- varje skript, mapp och datafil som `vagar.json` pekar på finns;",
        "- Version 1 är de steg `auto_avatar.py` kör: nummer, mappar och nycklar, vad varje steg anropar och vilka hjälpskript de "
        "importerar, vilka steg som betalar och hos vem, kvittona och flaggorna med sina förval;",
        "- priserna gäller de inställningar koden har, och vägarnas kostnad är summan av stegen och valen;",
        "- standarddockans ansiktsformer, ansiktsben, längder och flaggor är de i `scen/bygg_docka.py`;",
        "- benen spelet kräver är de under Skelettet;",
        "- Danilo och Frasse finns i mätningen `live-bj/data/uppsattning.json`;",
        "- ingen regel säger emot en färdig väg, inte heller när en del som får bytas byts;",
        "- VAGAR.md är det `vagar.py` skriver ur `vagar.json`.", "",
        "Proven och körningarna ligger inte i Git; saknas de på en dator nämns det bara.", ""]
    return "\n".join(ut).replace("\n\n\n", "\n\n")


def ankare(rubrik: str) -> str:
    s = rubrik.lower()
    s = re.sub(r"[^\w\- ]", "", s)
    return s.replace(" ", "-")


# ---- valen (för guiden) -------------------------------------------------------------------------------------------
def visa_val(d: dict, delar: dict, regler: dict, args: list[str]) -> int:
    val = {dl: None for dl in delar}
    for x in args:
        dl, _, a = x.partition("=")
        if dl not in delar or a not in delar[dl]:
            print(f"Okänt val: {x}. Delarna: {', '.join(delar)}; alternativen står i VAGAR.md.")
            return 2
        val[dl] = a
    delnamn = {x["id"]: x["namn"] for x in d["delar"]}
    bas = brott(regler, val, strikt=False)
    print("Valen: " + ("; ".join(f"{delnamn[dl]} = {delar[dl][a]['namn']}" for dl, a in val.items() if a) or "inga"))
    for r, ur, vad in bas:
        print(f"  Går inte ihop: {alt_namn(delar, ur)} och {alt_namn(delar, vad)}: {r['varfor']}")
    for dl, alts in delar.items():
        print(f"\n{delnamn[dl]}{' (vald)' if val[dl] else ''}:")
        for a, alt in alts.items():
            nya = [x for x in brott(regler, {**val, dl: a}, strikt=False) if (x[0]["id"], x[1], x[2]) not in {(y[0]["id"], y[1], y[2]) for y in bas}]
            st = {"finns": "", "provat": " [prövat, men inget steg här kör det]", "tankt": " [tänkt, inte gjort]",
                  "gar_inte": f" [går inte i dag: {alt.get('hinder', '')}]"}[alt["status"]]
            mark = "*" if val[dl] == a else " "
            if not nya:
                print(f" {mark} går:      {alt['namn']}{st}")
            else:
                r, ur, vad = nya[0]
                print(f" {mark} går inte: {alt['namn']}{st}: {r['varfor']} ({STYRKA_NAMN[r['styrka']]}, regeln {r['id']})")
    villkor = [r for r in regler.values() if r["typ"] == "villkor" and (r["om"] == ["*"] or any(val.get(o.split('/')[0]) == o.split('/')[1] for o in r["om"]))]
    if villkor:
        print("\nVillkor som modellen måste uppfylla:")
        for r in villkor:
            print(f"  - {r['villkor']} Prövas: {r['prova']}")
    passar = [v["namn"] for v in d["vagar"] if all(a is None or v["val"].get(dl) == a or a in v["far_bytas"].get(dl, []) for dl, a in val.items())]
    print("\nFärdiga vägar som stämmer med valen: " + (", ".join(passar) or "ingen"))
    return 0


def visa_steg(d: dict) -> int:
    aa = las_auto_avatar(d["om"]["leverantorer"])
    for nr, s in sorted(aa["steg"].items()):
        print(f"Steg {nr} ({s['mapp']}, {s['nyckel']}): betalar hos {', '.join(sorted(s['betalt'])) or 'ingen'}")
        print(f"  anrop:  {json.dumps(sorted(s['anrop']), ensure_ascii=False)}")
        print(f"  skript: {json.dumps(s['skript'], ensure_ascii=False)}")
        print(f"  hjalp:  {json.dumps(s['hjalp'], ensure_ascii=False)}")
    print(f"Flaggor: {json.dumps(aa['flaggor'], ensure_ascii=False)}")
    for line in lasning:
        print(line)
    return 0


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--kolla", action="store_true", help="skriver inget; kod 1 när något inte stämmer")
    ap.add_argument("--val", nargs="*", metavar="DEL=ALTERNATIV", help="vad som går ihop med valen")
    ap.add_argument("--visa-steg", action="store_true", help="vad auto_avatar.py kör, läst ur koden")
    ap.add_argument("--fil", type=Path, default=KALLA, help="en annan vagar.json, för att pröva en ändring (med --kolla eller --val)")
    a = ap.parse_args()
    if a.fil.resolve() != KALLA and not (a.kolla or a.val is not None):
        print("--fil går bara med --kolla eller --val: VAGAR.md skrivs bara ur avatar-auto-pipeline/vagar.json.")
        return 2
    d = json.loads(a.fil.read_text(encoding="utf-8"))
    if a.visa_steg:
        return visa_steg(d)
    if a.val is not None:
        delar, regler = kolla_form(d)
        if fel:
            print("vagar.json har fel i formen:\n" + "\n".join(f"- {x}" for x in fel))
            return 1
        return visa_val(d, delar, regler, a.val)
    delar, regler, _ = kolla(d)
    for line in lasning:
        print(f"Läst: {line}")
    for n in noter:
        print(f"Obs: {n}")
    if fel:
        print(f"\nvagar.json stämmer inte ({len(fel)} fel):\n" + "\n".join(f"- {x}" for x in fel))
        if not a.kolla:
            print("VAGAR.md är inte skriven. Rätta vagar.json (eller koden) och kör igen.")
        return 1
    nytt = skriv(d, delar, regler)
    if a.kolla:
        nu = UT.read_text(encoding="utf-8") if UT.is_file() else None
        if nu == nytt:
            print("vagar.json stämmer med koden, och VAGAR.md med vagar.json.")
            return 0
        if nu is None:
            print("VAGAR.md finns inte. Skriv den med: .venv/Scripts/python.exe -I vagar.py")
            return 1
        x, y = nu.split("\n"), nytt.split("\n")
        olika = [f"rad {i + 1}:\n  i VAGAR.md:      {(x[i] if i < len(x) else '(ingen rad)')[:200]}\n  ur vagar.json:   {(y[i] if i < len(y) else '(ingen rad)')[:200]}"
                 for i in range(max(len(x), len(y))) if (x[i] if i < len(x) else None) != (y[i] if i < len(y) else None)][:10]
        print("VAGAR.md stämmer inte med vagar.json. Skriv om den med: .venv/Scripts/python.exe -I vagar.py\n" + "\n".join(olika))
        return 1
    UT.write_text(nytt, encoding="utf-8", newline="\n")
    print(f"VAGAR.md skriven: {nytt.count(chr(10))} rader; vagar.json stämmer med koden.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
