"""Cost: count tokens after every model call.

Spending is measured from what the provider reports, not estimated. The total
feeds the cost ceiling in `limits.py` and the run summary. Sub-agents carry
this hook too, so delegated work is counted in the same total.

Two other cost levers live elsewhere:
- prompt caching is switched on by deepagents for providers that support it,
  and `prompts.py` keeps the system prompt stable so the cache actually hits;
- which model to use is the user's choice per task (a cheaper one for simple work).
"""

from __future__ import annotations

from typing import Any

from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import AIMessage

from ..tracker import RunTracker


class CostHook(AgentMiddleware):
    def __init__(self, tracker: RunTracker, agent: str = "lead") -> None:
        self.tracker = tracker
        self.agent = agent  # "lead" or the sub-agent's name

    def after_model(self, state: Any, runtime: Any) -> None:  # noqa: ARG002
        last = state["messages"][-1] if state.get("messages") else None
        usage = getattr(last, "usage_metadata", None) if isinstance(last, AIMessage) else None
        if not usage:
            return
        cached = (usage.get("input_token_details") or {}).get("cache_read", 0)
        self.tracker.add_usage(usage.get("input_tokens", 0), usage.get("output_tokens", 0), cached)
        self.tracker.emit(
            "usage",
            agent=self.agent,
            # This call alone: how much context the agent was carrying at this step.
            call_input_tokens=usage.get("input_tokens", 0),
            call_cached_tokens=cached,
            **{key: value for key, value in self.tracker.summary().items() if key.endswith("tokens") or key == "cost"},
        )
