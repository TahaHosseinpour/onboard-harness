"""Where a tool may read and write: inside the workspace, nowhere else."""

from __future__ import annotations

from pathlib import Path

from ..workspace import Workspace


def existing_file(workspace: Workspace, path: str) -> Path:
    """Map an agent path (`/` = workspace root) to a file on disk, refusing anything outside the workspace."""
    target = inside(workspace, path)
    if not target.is_file():
        raise ValueError(f"no such file: {path}")
    return target


def new_file(workspace: Workspace, path: str, *, overwrite: bool) -> Path:
    """The disk path for a file a tool is about to create. An existing file is kept unless `overwrite` is set."""
    target = inside(workspace, path)
    if target.is_dir():
        raise ValueError(f"{path} is a folder")
    if target.exists() and not overwrite:
        raise ValueError(f"{path} already exists. Choose another name, or pass overwrite=true if the user asked to replace it")
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def inside(workspace: Workspace, path: str) -> Path:
    target = (workspace.root / str(path).lstrip("/\\")).resolve()
    if not workspace.contains(target):
        raise ValueError("path is outside the workspace")
    return target
