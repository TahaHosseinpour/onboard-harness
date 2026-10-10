"""What the API holds in memory: the open workspace and its run manager."""

from __future__ import annotations

import secrets
import time
from pathlib import Path

from fastapi import HTTPException

from harness import Workspace

from . import settings
from .runs import RunManager


def _workspace_folder(path: str) -> Path:
    """The folder to open, refused when it is too broad to hand to an agent.

    Agents may read and change everything under the workspace, so it must be a
    folder chosen for that - not a whole drive, and not the user's home folder
    with their keys, browser profile and every other project in it.
    """
    folder = Path(path.strip()).expanduser()
    if not folder.is_absolute():
        raise HTTPException(status_code=400, detail="Give the full path of the folder.")
    folder = folder.resolve()
    home = Path.home().resolve()
    if folder == home or folder in home.parents or folder == Path(folder.anchor):
        raise HTTPException(status_code=400, detail="This folder is too broad for a workspace. Choose or create a folder just for this work.")
    if folder.exists() and not folder.is_dir():
        raise HTTPException(status_code=400, detail="This path is a file, not a folder.")
    return folder


class AppState:
    def __init__(self) -> None:
        self._manager: RunManager | None = None
        self._tickets: dict[str, tuple[Path, float]] = {}
        current = settings.load()["current_workspace"]
        if current:
            try:
                self.open(current)
            except (HTTPException, OSError):
                pass  # the folder is gone (moved, unplugged drive): start with no workspace open

    def open(self, path: str, name: str | None = None) -> Workspace:
        """Open (and, the first time, set up) a workspace folder. `name` is what the user calls it."""
        try:
            workspace = Workspace.at(_workspace_folder(path)).scaffold()
        except OSError as error:
            raise HTTPException(status_code=400, detail=f"This folder cannot be opened: {error.strerror or error}") from error
        self._manager = RunManager(workspace)
        data = settings.load()
        if str(workspace.root) not in data["workspaces"]:
            data["workspaces"].append(str(workspace.root))
        data["current_workspace"] = str(workspace.root)
        if name and name.strip():
            data["workspace_names"][str(workspace.root)] = name.strip()[:60]
        settings.save(data)
        return workspace

    def issue_ticket(self, file: Path, seconds: int = 4 * 3600) -> str:
        """A random, expiring pass for reading one file without the token (see the media routes)."""
        now = time.time()
        self._tickets = {ticket: entry for ticket, entry in self._tickets.items() if entry[1] > now}
        ticket = secrets.token_urlsafe(32)
        self._tickets[ticket] = (file, now + seconds)
        return ticket

    def ticket_file(self, ticket: str) -> Path | None:
        entry = self._tickets.get(ticket)
        return entry[0] if entry and entry[1] > time.time() else None

    def rename(self, name: str) -> str:
        """Give the open workspace a name. The folder itself is not renamed."""
        root = str(self.workspace.root)
        data = settings.load()
        data["workspace_names"][root] = name.strip()[:60]
        settings.save(data)
        return settings.workspace_name(data, root)

    @property
    def manager(self) -> RunManager:
        if self._manager is None:
            raise HTTPException(status_code=409, detail="No workspace is open. Create or open one first.")
        return self._manager

    @property
    def workspace(self) -> Workspace:
        return self.manager.workspace
