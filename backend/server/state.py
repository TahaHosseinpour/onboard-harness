"""What the API holds in memory: the open workspace and its run manager."""

from __future__ import annotations

from fastapi import HTTPException

from harness import Workspace

from . import settings
from .runs import RunManager


class AppState:
    def __init__(self) -> None:
        self._manager: RunManager | None = None
        current = settings.load()["current_workspace"]
        if current:
            self.open(current)

    def open(self, path: str) -> Workspace:
        """Open (and, the first time, set up) a workspace folder."""
        workspace = Workspace.at(path).scaffold()
        self._manager = RunManager(workspace)
        data = settings.load()
        if str(workspace.root) not in data["workspaces"]:
            data["workspaces"].append(str(workspace.root))
        data["current_workspace"] = str(workspace.root)
        settings.save(data)
        return workspace

    @property
    def manager(self) -> RunManager:
        if self._manager is None:
            raise HTTPException(status_code=409, detail="No workspace is open. Create or open one first.")
        return self._manager

    @property
    def workspace(self) -> Workspace:
        return self.manager.workspace
