"""Hooks: rules that always run at fixed points of the loop.

A prompt asks; a hook guarantees. Each file here is one guarantee, written as
a LangChain middleware so it runs at a defined moment regardless of what the
model decides:

    limits.py    before every model call   - stop when a ceiling is hit
    cost.py      after every model call    - count tokens and money
    permission.py around every tool call   - refuse what the rules deny
    audit.py     around every tool call    - record what was actually done
    breaker.py   around every tool call    - stop calling a tool that keeps failing
    freshness.py around every file change  - refuse to overwrite a version the agent has not seen
    verify.py    when the agent wants to finish - send it back if the work is not done

Order matters for the ones that wrap tool calls (first listed = outermost):
permission, then breaker, then audit, then freshness - so a call that is denied
or cut off is never recorded as an execution, while a refused stale write is
recorded as the failed attempt it was.
"""

from __future__ import annotations

from langchain.agents.middleware import AgentMiddleware

from ..permissions import Policy
from ..tracker import RunTracker
from ..workspace import Workspace
from .audit import AuditHook
from .breaker import CircuitBreakerHook
from .cost import CostHook
from .freshness import FreshnessHook
from .limits import LimitsHook
from .permission import PermissionHook
from .verify import VerifyHook


def build_subagent_hooks(tracker: RunTracker, policy: Policy, workspace: Workspace, name: str) -> list[AgentMiddleware]:
    """The guarantees a sub-agent keeps too: the same ceilings, cost count, rules and audit trail.

    deepagents does not pass the lead's middleware down to sub-agents, so without
    this a delegated task would run outside the rules.
    """
    return [LimitsHook(tracker), CostHook(tracker, agent=name), PermissionHook(policy), CircuitBreakerHook(tracker), AuditHook(tracker, agent=name), FreshnessHook(workspace)]


def build_hooks(tracker: RunTracker, policy: Policy, workspace: Workspace) -> list[AgentMiddleware]:
    return [LimitsHook(tracker), CostHook(tracker), PermissionHook(policy), CircuitBreakerHook(tracker), AuditHook(tracker), FreshnessHook(workspace), VerifyHook(tracker)]
