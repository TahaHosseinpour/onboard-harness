"""The run's scoreboard: counters, cost, and the reason it stopped.

One `RunTracker` is created per run and handed to every hook. Hooks update it
and read it; the runner turns it into the final summary. Keeping this state in
one plain object is what lets each hook stay a few lines long.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from .config import Limits, ModelSpec
from .events import Event, EventType, StopReason


@dataclass
class RunTracker:
    thread_id: str
    limits: Limits
    model: ModelSpec
    emit_event: Callable[[Event], None]
    started_at: float = field(default_factory=time.monotonic)

    model_calls: int = 0
    tool_calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0
    cost: float = 0.0

    stop_reason: StopReason | None = None
    stop_requested: bool = False  # set from outside when the user presses stop
    on_stop: list[Callable[[], None]] = field(default_factory=list)  # what to end when the user stops the run

    def request_stop(self) -> None:
        self.stop_requested = True
        for end in self.on_stop:
            end()

    def emit(self, type: EventType, **data: Any) -> None:
        self.emit_event(Event(type=type, thread_id=self.thread_id, data=data))

    @property
    def elapsed(self) -> float:
        return time.monotonic() - self.started_at

    def limit_reached(self) -> StopReason | None:
        """The first ceiling this run has hit, if any. Checked before every model call."""
        if self.stop_requested:
            return "stopped_by_user"
        if self.stop_reason:
            return self.stop_reason
        if self.model_calls >= self.limits.max_model_calls:
            return "model_call_limit"
        if self.tool_calls >= self.limits.max_tool_calls:
            return "tool_call_limit"
        if self.elapsed >= self.limits.max_seconds:
            return "time_limit"
        if self.limits.max_cost is not None and self.cost >= self.limits.max_cost:
            return "cost_limit"
        return None

    def add_usage(self, input_tokens: int, output_tokens: int, cached_tokens: int = 0) -> None:
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens
        self.cached_tokens += cached_tokens
        self.cost += (input_tokens * self.model.input_price + output_tokens * self.model.output_price) / 1_000_000

    def summary(self) -> dict[str, Any]:
        return {
            "stop_reason": self.stop_reason,
            "model_calls": self.model_calls,
            "tool_calls": self.tool_calls,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cached_tokens": self.cached_tokens,
            "cost": round(self.cost, 6),
            "seconds": round(self.elapsed, 2),
            "model": self.model.model,
        }
