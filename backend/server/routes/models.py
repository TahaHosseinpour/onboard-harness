"""Models the user defined: address, model name, and a key kept in the OS keychain."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from .. import keychain, settings
from ..schemas import ModelIn

router = APIRouter(tags=["models"])


def _public(entry: dict[str, Any], default_id: str) -> dict[str, Any]:
    """A model as the UI may see it: never the key itself, only whether one is stored."""
    return {**entry, "has_key": keychain.has_key(entry["id"]), "is_default": entry["id"] == default_id}


@router.get("/models")
def list_models() -> list[dict[str, Any]]:
    data = settings.load()
    return [_public(entry, data["default_model"]) for entry in data["models"]]


@router.post("/models")
def save_model(body: ModelIn) -> dict[str, Any]:
    """Add a model, or update the one with the same id."""
    data = settings.load()
    model_id = body.id or uuid.uuid4().hex[:8]
    entry = {"id": model_id, "name": body.name or body.model, "base_url": body.base_url.strip(), "model": body.model.strip(), "input_price": body.input_price, "output_price": body.output_price, "streaming": body.streaming}
    data["models"] = [m for m in data["models"] if m["id"] != model_id] + [entry]
    if not any(m["id"] == data["default_model"] for m in data["models"]):
        data["default_model"] = model_id
    settings.save(data)
    if body.api_key:
        keychain.set_key(model_id, body.api_key)
    return _public(entry, data["default_model"])


@router.delete("/models/{model_id}")
def delete_model(model_id: str) -> dict[str, bool]:
    data = settings.load()
    remaining = [m for m in data["models"] if m["id"] != model_id]
    if len(remaining) == len(data["models"]):
        raise HTTPException(status_code=404, detail="No such model.")
    data["models"] = remaining
    if data["default_model"] == model_id:
        data["default_model"] = remaining[0]["id"] if remaining else ""
    settings.save(data)
    keychain.delete_key(model_id)
    return {"deleted": True}


@router.post("/models/{model_id}/default")
def set_default(model_id: str) -> dict[str, str]:
    data = settings.load()
    if not any(m["id"] == model_id for m in data["models"]):
        raise HTTPException(status_code=404, detail="No such model.")
    data["default_model"] = model_id
    settings.save(data)
    return {"default_model": model_id}
