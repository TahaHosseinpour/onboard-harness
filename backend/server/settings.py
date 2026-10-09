"""App settings that belong to this machine, not to a workspace.

Stored in the user's app-data folder: which workspaces exist, which one is
open, and the models the user defined. API keys are *not* here - see `keychain.py`.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from harness import ModelSpec

from . import keychain

_DEMO = {"id": "demo", "name": "مدل نمایشی (بدون کلید)", "base_url": "demo://", "model": "demo", "input_price": 0.0, "output_price": 0.0}


def home() -> Path:
    """Folder for machine-level settings. `HARNESS_HOME` overrides it (used by tests)."""
    base = os.environ.get("HARNESS_HOME") or os.path.join(os.environ.get("APPDATA") or Path.home() / ".config", "OnboardHarness")
    path = Path(base)
    path.mkdir(parents=True, exist_ok=True)
    return path


def load() -> dict[str, Any]:
    file = home() / "settings.json"
    data = json.loads(file.read_text(encoding="utf-8")) if file.exists() else {}
    data.setdefault("workspaces", [])
    data.setdefault("current_workspace", None)
    data.setdefault("models", [_DEMO])
    data.setdefault("default_model", "demo")
    return data


def save(data: dict[str, Any]) -> None:
    (home() / "settings.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def model_spec(model_id: str | None) -> ModelSpec | None:
    """The full spec for a model, with its key fetched from the OS keychain."""
    data = load()
    wanted = model_id or data["default_model"]
    entry = next((m for m in data["models"] if m["id"] == wanted), None)
    if entry is None:
        return None
    return ModelSpec(**entry, api_key=keychain.get_key(entry["id"]))
