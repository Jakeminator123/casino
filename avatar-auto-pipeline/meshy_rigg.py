"""Bind a light textured avatar to Mixamo body and finger joints, resuming the same paid job."""

import argparse
import json
import time
from pathlib import Path

from filelock import FileLock
from meshy_enbild import TERMINAL_FAILURE, api_get, digest, download, get_key, model_info, store, submit

ENDPOINT = "https://api.meshy.ai/openapi/v1/rigging"
SETTINGS = {
    "animation_type": "biped",
    "skeleton_template": "mixamo",
    "include_fingers": True,
    "height_meters": 1.8,
}


def bind(light, folder, task_id=None):
    folder.mkdir(parents=True, exist_ok=True)
    receipt = folder / "riggjobb.json"
    rig = folder / "riggad.glb"
    with FileLock(str(folder / ".meshy.lock"), timeout=0):
        signature = {"input_sha256": digest(light), "endpoint": ENDPOINT, "settings": SETTINGS}
        record = json.loads(receipt.read_bytes()) if receipt.exists() else dict(signature)
        if any(record.get(k) != v for k, v in signature.items()):
            raise ValueError("Riggjobbet gäller en annan lätt kopia eller andra inställningar.")
        if task_id and record.get("task_id") not in (None, task_id):
            raise ValueError("Angivet jobb-ID skiljer sig från det sparade riggjobbet.")
        if rig.is_file() and record.get("sha256") == digest(rig):
            return rig
        if model_info(light)["triangles"] > 380000 or light.stat().st_size > 100_000_000:
            raise ValueError("Den lätta GLB-filen överskrider Meshys gräns för riggning via data-URI.")
        key = get_key()
        if task_id and not record.get("task_id"):
            api_get(task_id, key, ENDPOINT)
            record.update(task_id=task_id, status="PENDING")
            store(receipt, record)
        if not record.get("task_id"):
            if record.get("status") == "SUBMITTING":
                raise RuntimeError("Riggjobbet kan ha startat. Återuppta med Meshys jobb-ID och --task-id.")
            submit(
                light.read_bytes(),
                "model/gltf-binary",
                record,
                receipt,
                key,
                endpoint=ENDPOINT,
                field="model_url",
                settings=SETTINGS,
            )
        previous = None
        while True:
            data = api_get(record["task_id"], key, ENDPOINT)
            state = (data["status"], data.get("progress"))
            if state != previous:
                print("Meshy-rigg", *state, flush=True)
                previous = state
            if state[0] == "SUCCEEDED":
                break
            if state[0] in TERMINAL_FAILURE:
                record.update(status=state[0], consumed_credits=data.get("consumed_credits"))
                store(receipt, record)
                raise RuntimeError(f"Riggjobbet avslutades med {state[0]}.")
            time.sleep(8)
        _, details = download(data["result"]["rigged_character_glb_url"], rig.with_suffix(""), model=True)
        if not details["skins"]:
            raise ValueError("Meshy-exporten saknar skinning.")
        record.update(
            status="SUCCEEDED",
            consumed_credits=data.get("consumed_credits"),
            sha256=digest(rig),
            model=details,
        )
        store(receipt, record)
    return rig


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("light", type=Path)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--task-id")
    args = parser.parse_args()
    print(bind(args.light.resolve(), args.folder.resolve(), args.task_id))
