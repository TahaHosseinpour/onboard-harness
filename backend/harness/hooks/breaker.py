"""Circuit breaker: stop calling a tool that keeps failing.

Retries (see `durability.py`) handle a hiccup. A breaker handles the opposite
case: the same tool failing again and again, where another attempt only burns
time and money. After `threshold` failures in a row the tool is closed for the
rest of the run, the agent is told so, and the run ends with a clear reason
instead of looping.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import ToolMessage

from ..tracker import RunTracker
from .outcome import tool_failed


class CircuitBreakerHook(AgentMiddleware):
    def __init__(self, tracker: RunTracker, threshold: int = 3) -> None:
        self.tracker = tracker
        self.threshold = threshold
        self.failures: dict[str, int] = defaultdict(int)

    async def awrap_tool_call(self, request: Any, handler: Callable[[Any], Awaitable[Any]]) -> Any:
        name, call_id = request.tool_call["name"], request.tool_call.get("id", "")

        if self.failures[name] >= self.threshold:
            return ToolMessage(content=f"`{name}` is disabled for this run after repeated failures. Do not call it again.", tool_call_id=call_id, name=name, status="error")

        try:
            result = await handler(request)
        except Exception as error:  # noqa: BLE001 - any tool crash becomes a result the agent can read
            result = ToolMessage(content=f"`{name}` failed: {error}", tool_call_id=call_id, name=name, status="error")

        if tool_failed(result):
            self.failures[name] += 1
            if self.failures[name] >= self.threshold:
                self.tracker.stop_reason = "circuit_open"
        else:
            self.failures[name] = 0
        return result
