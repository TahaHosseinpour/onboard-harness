"""Audit: record every action after it runs.

Permission is decided before a tool runs (`permissions.py`, and a human when
the rule says "ask"). This hook is the other half: once a tool has actually
run, it records what was called, with what, how long it took and whether it
worked. A call that was denied or rejected never reaches here, so the audit
trail lists executions only.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from typing import Any

from langchain.agents.middleware import AgentMiddleware
from ..permissions import WRITE_TOOLS, target_path
from ..tracker import RunTracker
from .outcome import tool_failed


def _short(value: Any, limit: int = 300) -> Any:
    """Arguments are logged, but a whole document passed to write_file is not."""
    if isinstance(value, str) and len(value) > limit:
        return value[:limit] + f"… (+{len(value) - limit} chars)"
    if isinstance(value, dict):
        return {key: _short(item, limit) for key, item in value.items()}
    return value


class AuditHook(AgentMiddleware):
    def __init__(self, tracker: RunTracker, agent: str = "lead") -> None:
        self.tracker = tracker
        self.agent = agent  # "lead" or the sub-agent's name

    async def awrap_tool_call(self, request: Any, handler: Callable[[Any], Awaitable[Any]]) -> Any:
        name, args, call_id = request.tool_call["name"], request.tool_call.get("args", {}), request.tool_call.get("id")
        self.tracker.tool_calls += 1
        self.tracker.emit("tool_started", tool=name, args=_short(args), call_id=call_id, agent=self.agent)

        started = time.monotonic()
        result = await handler(request)
        failed = tool_failed(result)

        output = result.content if isinstance(getattr(result, "content", None), str) else ""
        self.tracker.emit("tool_finished", tool=name, call_id=call_id, ok=not failed, ms=round((time.monotonic() - started) * 1000), output=_short(output, 1500), agent=self.agent)
        if name in WRITE_TOOLS and not failed:
            self.tracker.emit("file_changed", path=target_path(name, args), tool=name)
        return result
