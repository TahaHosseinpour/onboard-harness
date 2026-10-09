"""Ceilings on the loop: attempts, time, cost, and the user's stop button.

deepagents itself lets a run go on for thousands of steps. This hook is checked
before every model call; once a ceiling is hit the run ends there, and the
reason is recorded so "why did it stop?" always has an answer.
"""

from __future__ import annotations

from typing import Any

from langchain.agents.middleware import AgentMiddleware, hook_config
from langchain_core.messages import AIMessage

from ..tracker import RunTracker

_MESSAGES = {
    "stopped_by_user": "کار به درخواست شما متوقف شد.",
    "model_call_limit": "به سقف تعداد گام‌های این کار رسیدم و متوقف شدم.",
    "tool_call_limit": "به سقف تعداد اقدام‌های این کار رسیدم و متوقف شدم.",
    "time_limit": "زمان مجاز این کار تمام شد و متوقف شدم.",
    "cost_limit": "به سقف هزینهٔ این کار رسیدم و متوقف شدم.",
    "circuit_open": "یک ابزار پشت‌سرهم خطا داد؛ برای جلوگیری از تکرار بی‌فایده متوقف شدم.",
}


class LimitsHook(AgentMiddleware):
    def __init__(self, tracker: RunTracker) -> None:
        self.tracker = tracker

    @hook_config(can_jump_to=["end"])
    def before_model(self, state: Any, runtime: Any) -> dict[str, Any] | None:  # noqa: ARG002
        reason = self.tracker.limit_reached()
        if reason:
            self.tracker.stop_reason = reason
            return {"jump_to": "end", "messages": [AIMessage(content=_MESSAGES.get(reason, "کار متوقف شد."))]}
        self.tracker.model_calls += 1
        return None
