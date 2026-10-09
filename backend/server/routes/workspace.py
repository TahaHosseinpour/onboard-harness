"""The workspace folder: opening it, its files, and the harness's own files in it."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException, Request

from harness.memory import read_memory, write_memory
from harness.skills import list_skills
from harness.subagents import list_agents
from harness.workspace import HARNESS_DIR, Workspace

from .. import settings
from ..schemas import FileBody, OpenWorkspace, TextBody
from ..state import AppState

router = APIRouter(tags=["workspace"])


def _state(request: Request) -> AppState:
    return request.app.state.harness


def _inside(workspace: Workspace, path: str) -> Path:
    """Resolve a workspace-relative path, refusing anything that escapes the folder."""
    target = (workspace.root / path.lstrip("/\\")).resolve()
    if not workspace.contains(target):
        raise HTTPException(status_code=400, detail="Path is outside the workspace.")
    return target


@router.get("/workspace")
def current(request: Request) -> dict[str, Any]:
    data = settings.load()
    path = data["current_workspace"]
    return {"path": path, "name": Path(path).name if path else None, "known": data["workspaces"]}


@router.post("/workspace")
def open_workspace(body: OpenWorkspace, request: Request) -> dict[str, str]:
    """Open a folder as the workspace. A new folder gets a `.harness/` with defaults.

    A workspace is tied to its folder for good; working elsewhere means opening
    another workspace, never re-pointing this one.
    """
    workspace = _state(request).open(body.path)
    return {"path": str(workspace.root), "name": workspace.root.name}


@router.get("/files")
def list_files(request: Request, system: bool = False) -> list[dict[str, Any]]:
    """Every file in the workspace. Harness files under `.harness/` only when `system` is set."""
    workspace = _state(request).workspace
    entries = []
    for file in sorted(workspace.root.rglob("*")):
        relative = file.relative_to(workspace.root)
        is_system = relative.parts[0] == HARNESS_DIR
        # Run logs and checkpoints are internals, not documents; they never show up as files.
        if not file.is_file() or (is_system and (not system or relative.parts[1:2] in (("runs",), ("artifacts",)) or file.name.startswith("state.db"))):
            continue
        stat = file.stat()
        entries.append({"path": "/" + relative.as_posix(), "name": file.name, "folder": "/" + relative.parent.as_posix().strip("."), "size": stat.st_size, "modified": stat.st_mtime, "system": is_system})
    return entries


@router.get("/files/content")
def read_file(path: str, request: Request) -> dict[str, str]:
    target = _inside(_state(request).workspace, path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="No such file.")
    try:
        return {"path": path, "content": target.read_text(encoding="utf-8")}
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=415, detail="This file is not text.") from error


@router.put("/files/content")
def write_file(body: FileBody, request: Request) -> dict[str, str]:
    target = _inside(_state(request).workspace, body.path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body.content, encoding="utf-8")
    return {"path": body.path}


@router.get("/skills")
def skills(request: Request) -> list[dict[str, str]]:
    return [skill.__dict__ for skill in list_skills(_state(request).workspace)]


@router.get("/agents")
def agents(request: Request) -> list[dict[str, Any]]:
    return [agent.__dict__ for agent in list_agents(_state(request).workspace)]


@router.get("/memory")
def get_memory(request: Request) -> dict[str, str]:
    return {"content": read_memory(_state(request).workspace)}


@router.put("/memory")
def put_memory(body: TextBody, request: Request) -> dict[str, bool]:
    write_memory(_state(request).workspace, body.content)
    return {"saved": True}


@router.get("/rules")
def get_rules(request: Request) -> dict[str, str]:
    file = _state(request).workspace.rules_file
    return {"content": file.read_text(encoding="utf-8") if file.exists() else ""}


@router.put("/rules")
def put_rules(body: TextBody, request: Request) -> dict[str, bool]:
    try:
        yaml.safe_load(body.content)
    except yaml.YAMLError as error:
        raise HTTPException(status_code=400, detail=f"Rules are not valid YAML: {error}") from error
    _state(request).workspace.rules_file.write_text(body.content, encoding="utf-8")
    return {"saved": True}
