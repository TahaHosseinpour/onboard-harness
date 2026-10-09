"""Permission gate: a denied action never runs.

The decision itself comes from `permissions.py`. "ask" has already paused the
run for a human by the time a tool is called, so what is left to enforce here
is "deny": the tool is not executed and the agent is told why. Because this
hook is the outermost one around tools, a refused call is neither retried nor
recorded as an execution.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import ToolMessage

from ..permissions import Policy


class PermissionHook(AgentMiddleware):
    def __init__(self, policy: Policy) -> None:
        self.policy = policy

    async def awrap_tool_call(self, request: Any, handler: Callable[[Any], Awaitable[Any]]) -> Any:
        name, args = request.tool_call["name"], request.tool_call.get("args", {})
        if self.policy.decide(name, args) == "deny":
            return ToolMessage(
                content=f"Permission denied: `{name}` is not allowed here by the workspace rules. Do not retry; tell the user.",
                tool_call_id=request.tool_call.get("id", ""),
                name=name,
                status="error",
            )
        return await handler(request)
