"""Beställer dealerns stol hos Meshy (text-to-3D, preview + refine). BETALT: cirka 30 krediter, bara på Jakobs ord.

    python scen/meshy_stol.py --betala

Råfilen hamnar i assets/meshy/stol_meshy_ra.glb och varje anrop loggas med saldo i assets/meshy/meshy-logg.json
(kvittot). Finns råfilen redan görs ingenting, så den som har filen betalar inte en gång till. Nyckeln läses ur
.env och skrivs aldrig ut. scen/bygg_stol.py skalar sedan stolen till standard.yaml.
"""
import json, sys, time, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from gemensamt.sokvagar import env_candidates

OUT = ROOT / "assets" / "meshy"
RAFIL = OUT / "stol_meshy_ra.glb"
LOG = OUT / "meshy-logg.json"
API = "https://api.meshy.ai"

if RAFIL.exists():
    sys.exit(f"Stolen finns redan ({RAFIL.relative_to(ROOT)}): inget beställs.")
if "--betala" not in sys.argv[1:]:
    sys.exit("Det här kostar cirka 30 Meshy-krediter och kräver Jakobs ord. Kör med --betala när han har sagt ja.")

key = ""
for env in env_candidates(ROOT):
    if env.is_file():
        key = next((l.split("=", 1)[1].strip().strip('"') for l in env.read_text(encoding="utf-8").splitlines() if l.startswith("MESHY_API_KEY=")), "")
    if key:
        break
if not key:
    sys.exit("MESHY_API_KEY saknas i .env")
H = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, headers=H, data=json.dumps(body).encode() if body else None)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read() or b"{}")


def log(entry):
    OUT.mkdir(parents=True, exist_ok=True)
    data = json.loads(LOG.read_text(encoding="utf-8")) if LOG.exists() else []
    entry["tid"] = time.strftime("%Y-%m-%d %H:%M:%S")
    data.append(entry); LOG.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")


def balance():
    return call("GET", "/openapi/v1/balance").get("balance")


def wait(tid):
    while True:
        t = call("GET", f"/openapi/v2/text-to-3d/{tid}")
        if t.get("status") in ("SUCCEEDED", "FAILED", "CANCELED", "EXPIRED"):
            return t
        time.sleep(10)


b0 = balance(); log({"anrop": "GET balance", "saldo": b0})
prompt = ("casino blackjack dealer chair, tall bar-height stool with padded dark brown leather seat and low backrest, "
          "black metal frame, four legs, round chrome footrest ring, realistic, clean, no text")
pv = call("POST", "/openapi/v2/text-to-3d", {"mode": "preview", "prompt": prompt, "ai_model": "meshy-7.1",
                                             "should_remesh": True, "target_polycount": 30000, "topology": "quad"})
pid = pv.get("result"); log({"anrop": "POST text-to-3d preview", "task": pid, "modell": "meshy-7.1", "pris_enligt_docs": 20, "prompt": prompt})
t = wait(pid); log({"anrop": "preview klar", "task": pid, "status": t.get("status")})
if t.get("status") != "SUCCEEDED":
    sys.exit("preview misslyckades: " + str(t.get("task_error")))
rf = call("POST", "/openapi/v2/text-to-3d", {"mode": "refine", "preview_task_id": pid, "enable_pbr": True})
rid = rf.get("result"); log({"anrop": "POST text-to-3d refine", "task": rid, "pris_enligt_docs": 10})
t = wait(rid); log({"anrop": "refine klar", "task": rid, "status": t.get("status")})
if t.get("status") != "SUCCEEDED":
    sys.exit("refine misslyckades: " + str(t.get("task_error")))
RAFIL.write_bytes(urllib.request.urlopen(t["model_urls"]["glb"], timeout=300).read())
b1 = balance(); log({"anrop": "GET balance", "saldo": b1, "forbrukat": (b0 - b1) if (b0 is not None and b1 is not None) else None})
print("klart; krediter före", b0, "efter", b1)
