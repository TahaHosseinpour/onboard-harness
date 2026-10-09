"""Durability: a run survives failures and restarts.

- Checkpoint : after every step the whole state is saved to `.harness/state.db`.
- Resume     : running the same `thread_id` again continues from the last
               checkpoint - after a pause for approval, a crash, or a restart.
- Retry      : a failed model call is retried with backoff; so are tools that
               only read, where repeating is harmless. Tools that change
               things are never retried automatically.
- Fallback   : if the model still fails, an alternative model takes over (optional).
- Circuit breaker: lives with the other hooks, in `hooks/breaker.py`.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from langchain.agents.middleware import AgentMiddleware, ModelFallbackMiddleware, ModelRetryMiddleware, ToolRetryMiddleware
from langchain_core.language_models.chat_models import BaseChatModel
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from .workspace import Workspace

# Repeating these cannot change anything, so retrying them is always safe.
READ_ONLY_TOOLS = ["ls", "read_file", "glob", "grep", "read_table", "aggregate_table", "calculate"]


@asynccontextmanager
async def open_checkpointer(workspace: Workspace) -> AsyncIterator[BaseCheckpointSaver]:
    """The workspace's checkpoint store. One SQLite file, no server to install."""
    workspace.harness.mkdir(parents=True, exist_ok=True)
    async with AsyncSqliteSaver.from_conn_string(str(workspace.state_db)) as saver:
        yield saver


def build_resilience(fallback: BaseChatModel | None = None) -> list[AgentMiddleware]:
    middleware: list[AgentMiddleware] = [
        # After the last retry the failure is raised, so the run ends as an error instead of
        # carrying on with an error message standing in for the model's answer.
        ModelRetryMiddleware(max_retries=2, initial_delay=1.0, backoff_factor=2.0, on_failure="error"),
        ToolRetryMiddleware(max_retries=1, tools=READ_ONLY_TOOLS, initial_delay=0.5),
    ]
    if fallback is not None:
        middleware.append(ModelFallbackMiddleware(fallback))
    return middleware
