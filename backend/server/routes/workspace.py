"""The workspace folder: opening it, its files, and the harness's own files in it."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from harness.memory import read_memory, write_memory
from harness.permissions import parse_rules
from harness.skills import list_skills
from harness.subagents import list_agents
from harness.tools.documents import document_markdown
from harness.tools.tables import table_preview
from harness.workspace import HARNESS_DIR, Workspace

from .. import settings
from ..schemas import FileBody, MediaPath, OpenWorkspace, RulesBody, TextBody, WorkspaceName
from ..state import AppState

router = APIRouter(tags=["workspace"])

# The files screen is a browser for documents, not an indexer: folders that hold
# thousands of generated files are passed over, and the list has a ceiling.
_SKIPPED_FOLDERS = {".git", "node_modules", ".venv", "venv", "__pycache__"}
_MAX_FILES = 5000
_MAX_TEXT_BYTES = 2_000_000
_MAX_VIEW_BYTES = 50_000_000
# Files the screen shows as they are. Anything else never leaves as raw bytes:
# an HTML file served from this address would run with the app's own access.
_RAW_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".jfif": "image/jpeg",
    ".avif": "image/avif",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml",  # only ever drawn inside an <img>, where the scripts an SVG may carry do not run
    ".pdf": "application/pdf",
}
# Sound and video are played from the file itself, piece by piece, so their size does not matter.
_MEDIA_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
    ".opus": "audio/ogg",
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".mov": "video/mp4",
    ".webm": "video/webm",
    ".ogv": "video/ogg",
    ".mkv": "video/x-matroska",
}


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
    known = [{"path": folder, "name": settings.workspace_name(data, folder)} for folder in data["workspaces"]]
    return {"path": path, "name": settings.workspace_name(data, path) if path else None, "known": known}


@router.post("/workspace")
def open_workspace(body: OpenWorkspace, request: Request) -> dict[str, str]:
    """Open a folder as the workspace. A new folder gets a `.harness/` with defaults.

    A workspace is tied to its folder for good; working elsewhere means opening
    another workspace, never re-pointing this one.
    """
    workspace = _state(request).open(body.path, body.name)
    return {"path": str(workspace.root), "name": settings.workspace_name(settings.load(), str(workspace.root))}


@router.put("/workspace/name")
def rename_workspace(body: WorkspaceName, request: Request) -> dict[str, str]:
    """Rename the open workspace. Only the name shown in the app changes, never the folder."""
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="The name is empty.")
    return {"name": _state(request).rename(body.name)}


@router.get("/files")
def list_files(request: Request, system: bool = False) -> list[dict[str, Any]]:
    """Every file in the workspace. Harness files under `.harness/` only when `system` is set."""
    workspace = _state(request).workspace
    entries: list[dict[str, Any]] = []
    for folder, subfolders, names in os.walk(workspace.root):
        relative = Path(folder).relative_to(workspace.root)
        is_system = relative.parts[:1] == (HARNESS_DIR,)
        if relative == Path("."):
            subfolders[:] = [name for name in subfolders if name not in _SKIPPED_FOLDERS and (system or name != HARNESS_DIR)]
        elif relative == Path(HARNESS_DIR):
            # Run logs and checkpoints are internals, not documents; they never show up as files.
            subfolders[:] = [name for name in subfolders if name not in ("runs", "artifacts")]
            names = [name for name in names if not name.startswith("state.db")]
        else:
            subfolders[:] = [name for name in subfolders if name not in _SKIPPED_FOLDERS]
        subfolders.sort()
        for name in sorted(names):
            try:
                stat = (Path(folder) / name).stat()
            except OSError:
                continue  # removed while we were listing, or not readable
            entries.append({"path": "/" + (relative / name).as_posix(), "name": name, "folder": "/" if relative == Path(".") else "/" + relative.as_posix(), "size": stat.st_size, "modified": stat.st_mtime, "system": is_system})
            if len(entries) >= _MAX_FILES:
                return entries
    return entries


@router.get("/files/content")
def read_file(path: str, request: Request) -> dict[str, str]:
    target = _inside(_state(request).workspace, path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="No such file.")
    if target.stat().st_size > _MAX_TEXT_BYTES:
        raise HTTPException(status_code=413, detail="This file is too large to open here.")
    try:
        return {"path": path, "content": target.read_text(encoding="utf-8")}
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=415, detail="This file is not text.") from error


def _viewable(request: Request, path: str) -> Path:
    target = _inside(_state(request).workspace, path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="No such file.")
    if target.stat().st_size > _MAX_VIEW_BYTES:
        raise HTTPException(status_code=413, detail="This file is too large to show here.")
    return target


@router.get("/files/raw")
def raw_file(path: str, request: Request) -> FileResponse:
    """An image or PDF as it is on disk, for the files screen to display."""
    target = _viewable(request, path)
    media_type = _RAW_TYPES.get(target.suffix.lower())
    if media_type is None:
        raise HTTPException(status_code=415, detail="This kind of file is not shown as it is.")
    return FileResponse(target, media_type=media_type, headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "no-store"})


@router.post("/files/media-ticket")
def media_ticket(body: MediaPath, request: Request) -> dict[str, str]:
    """A short-lived address for playing one sound or video file.

    A player cannot send the token in a header, and it asks for the file in
    pieces as it plays. So the page gets a random one-file ticket instead, good
    for a few hours; the ticket in the address is the only thing it grants.
    """
    state = _state(request)
    target = _inside(state.workspace, body.path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="No such file.")
    if target.suffix.lower() not in _MEDIA_TYPES:
        raise HTTPException(status_code=415, detail="This kind of file cannot be played.")
    return {"ticket": state.issue_ticket(target)}


@router.get("/files/media/{ticket}")
def media_file(ticket: str, request: Request) -> FileResponse:
    target = _state(request).ticket_file(ticket)
    if target is None or not target.is_file() or not _state(request).workspace.contains(target):
        raise HTTPException(status_code=404, detail="This link has expired.")
    return FileResponse(target, media_type=_MEDIA_TYPES[target.suffix.lower()], headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "no-store"})


@router.get("/files/preview")
def preview_file(path: str, request: Request, sheet: str | None = None) -> dict[str, Any]:
    """A spreadsheet as rows, or a Word / PowerPoint file as Markdown, for the files screen to draw."""
    target = _viewable(request, path)
    suffix = target.suffix.lower()
    try:
        if suffix in (".xlsx", ".xlsm", ".xls", ".csv"):
            return {"kind": "table", **table_preview(target, sheet)}
        if suffix in (".docx", ".pptx", ".doc", ".ppt"):
            return {"kind": "document", "markdown": document_markdown(target)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:  # noqa: BLE001 - a damaged file is an answer, not a crash
        raise HTTPException(status_code=422, detail="This file could not be read. It may be damaged or password-protected.") from error
    raise HTTPException(status_code=415, detail="There is no preview for this kind of file.")


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
    content = file.read_text(encoding="utf-8") if file.exists() else ""
    try:
        return {"content": content, **parse_rules(content)}
    except ValueError as error:
        # Hand-edited into something that is not rules: show the text, and say so. Runs refuse to start until it is fixed.
        return {"content": content, "files": [], "tools": {}, "error": str(error)}


@router.put("/rules")
def put_rules(body: RulesBody, request: Request) -> dict[str, bool]:
    """Save rules, given either as the raw YAML text or as structured `files` and `tools`."""
    file = _state(request).workspace.rules_file
    if body.content is not None:
        try:
            parse_rules(body.content)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=f"These rules cannot be used: {error}") from error
        file.write_text(body.content, encoding="utf-8")
        return {"saved": True}
    header = "\n".join(["# What agents may do in this workspace.", "# access: allow (just do it) | ask (pause for approval) | deny (never)", "# The first matching rule wins.", ""])
    data = {"files": [rule.model_dump() for rule in body.files or []], "tools": body.tools or {}}
    file.write_text(header + yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return {"saved": True}
