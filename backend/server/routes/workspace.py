"""The workspace folder: opening it, its files, and the harness's own files in it."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException, Request

from harness.memory import read_memory, write_memory
from harness.permissions import load_rules
from harness.skills import list_skills
from harness.subagents import list_agents
from harness.workspace import HARNESS_DIR, Workspace

from .. import settings
from ..schemas import FileBody, OpenWorkspace, RulesBody, TextBody
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
        folder = "/" if relative.parent == Path(".") else "/" + relative.parent.as_posix()
        entries.append({"path": "/" + relative.as_posix(), "name": file.name, "folder": folder, "size": stat.st_size, "modified": stat.st_mtime, "system": is_system})
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
def get_rules(request: Request) -> dict[str, Any]:
    """The rules both as the raw file and as structured data the UI can edit."""
    file = _state(request).workspace.rules_file
    return {"content": file.read_text(encoding="utf-8") if file.exists() else "", **load_rules(file)}


@router.put("/rules")
def put_rules(body: RulesBody, request: Request) -> dict[str, bool]:
    """Save rules, given either as the raw YAML text or as structured `files` and `tools`."""
    file = _state(request).workspace.rules_file
    if body.content is not None:
        try:
            yaml.safe_load(body.content)
        except yaml.YAMLError as error:
            raise HTTPException(status_code=400, detail=f"Rules are not valid YAML: {error}") from error
        file.write_text(body.content, encoding="utf-8")
        return {"saved": True}
    header = "\n".join(["# What agents may do in this workspace.", "# access: allow (just do it) | ask (pause for approval) | deny (never)", "# The first matching rule wins.", ""])
    data = {"files": [rule.model_dump() for rule in body.files or []], "tools": body.tools or {}}
    file.write_text(header + yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return {"saved": True}
