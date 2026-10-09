"""Plain data that describes one run. No behaviour lives here."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

# How much the agent may do without asking:
#   read_only - may look, may not change anything or run commands
#   ask       - follows the workspace rules; anything marked "ask" pauses for a human
#   auto      - like "ask", but "ask" rules pass without pausing ("deny" still denies)
PermissionMode = Literal["read_only", "ask", "auto"]


@dataclass(frozen=True)
class ModelSpec:
    """A model the user connected: any compatible endpoint, their own key."""

    id: str
    name: str
    base_url: str
    model: str
    api_key: str = ""
    # Optional prices per million tokens, in whatever currency the user thinks in.
    # Left at zero, cost tracking still counts tokens but reports no money.
    input_price: float = 0.0
    output_price: float = 0.0
    # Some gateways cannot stream a reply that contains tool calls. With this off, each
    # step's answer arrives whole instead of word by word; everything else is unchanged.
    streaming: bool = True


@dataclass(frozen=True)
class Limits:
    """Hard ceilings for one run. Reaching any of them ends the run with a recorded reason."""

    max_model_calls: int = 40
    max_tool_calls: int = 80
    max_seconds: int = 600
    max_cost: float | None = None


@dataclass(frozen=True)
class RunRequest:
    """Everything needed to start (or continue) a task."""

    thread_id: str
    prompt: str
    model: ModelSpec
    mode: PermissionMode = "ask"
    # Id of the agent profile that leads this run; None means the default coordinator.
    agent_id: str | None = None
    limits: Limits = field(default_factory=Limits)
    # A cheaper model for retries when the main one keeps failing. Optional.
    fallback_model: ModelSpec | None = None
    # When set, the answer is graded against this text before the run may finish.
    rubric: str | None = None
    user_name: str = ""
