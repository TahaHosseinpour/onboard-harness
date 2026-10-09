"""Events: the harness's only output format.

Everything a run does is reported as a stream of small events. The UI draws
them live, the trace file stores them, tests assert on them. Nothing outside
the harness needs to understand LangGraph's own stream format.
"""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

EventType = Literal[
    "run_started",
    "text",  # a piece of the agent's answer
    "plan",  # the todo list changed
    "tool_started",
    "tool_finished",
    "file_changed",
    "approval_required",  # the run is paused, waiting for a human
    "approval_decided",  # a human answered: who, and what they decided
    "verification",  # the stop hook sent the agent back to fix something
    "usage",
    "run_finished",
]

# Why a run ended. Exactly one of these is recorded for every run.
StopReason = Literal[
    "completed",
    "awaiting_approval",
    "stopped_by_user",
    "model_call_limit",
    "tool_call_limit",
    "time_limit",
    "cost_limit",
    "circuit_open",
    "error",
]


@dataclass(frozen=True)
class Event:
    type: EventType
    thread_id: str
    data: dict[str, Any] = field(default_factory=dict)
    at: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
