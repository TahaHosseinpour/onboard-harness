"""File freshness: never overwrite a version of a file the agent has not seen.

Two tasks can work in the same workspace at once, and the user can edit a file
by hand while a task is running. Without a check, whoever writes last silently
erases the other's work. So before an existing file is changed:

- the agent must have read it in this run, and
- the file must still be exactly as it was when the agent read it.

Otherwise the write is refused and the agent is told to read the file again
and redo its change on the current content. A per-file lock makes "check, then
write" one step, so two tasks cannot both pass the check and then collide.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any

from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import ToolMessage

from ..workspace import Workspace
from .outcome import tool_failed

_CHANGING = {"write_file", "edit_file"}
# One lock per file for the whole process: tasks in the same workspace share it.
_LOCKS: dict[Path, asyncio.Lock] = defaultdict(asyncio.Lock)


def _version(path: Path) -> tuple[int, int] | None:
    """A cheap fingerprint of a file's current content, or None when it does not exist."""
    try:
        stat = path.stat()
    except OSError:
        return None
    return stat.st_mtime_ns, stat.st_size


class FreshnessHook(AgentMiddleware):
    def __init__(self, workspace: Workspace) -> None:
        self.workspace = workspace
        self.seen: dict[Path, tuple[int, int] | None] = {}  # what this agent last saw of each file

    def _real(self, args: dict[str, Any]) -> Path | None:
        virtual = args.get("file_path") or args.get("path")
        return (self.workspace.root / str(virtual).lstrip("/\\")).resolve() if virtual else None

    async def awrap_tool_call(self, request: Any, handler: Callable[[Any], Awaitable[Any]]) -> Any:
        name, args = request.tool_call["name"], request.tool_call.get("args", {})
        path = self._real(args)

        if name == "read_file" and path is not None:
            result = await handler(request)
            if not tool_failed(result):
                self.seen[path] = _version(path)
            return result

        if name not in _CHANGING or path is None:
            return await handler(request)

        async with _LOCKS[path]:
            current = _version(path)
            if current is not None and self.seen.get(path) != current:
                reason = "has changed since you read it (the user or another task edited it)" if path in self.seen else "already exists and you have not read it in this task"
                return ToolMessage(
                    content=f"Error: {args.get('file_path')} {reason}. Read it with read_file, then apply your change to its current content. Keep everything that is already there.",
                    tool_call_id=request.tool_call.get("id", ""),
                    name=name,
                    status="error",
                )
            result = await handler(request)
            if not tool_failed(result):
                self.seen[path] = _version(path)
            return result
