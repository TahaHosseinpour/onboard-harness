"""The runner: start, continue and stop a task, and report it as events.

This is the harness's public surface. A caller (the API, a test, a script)
needs only three things:

    async for event in runner.start(request): ...        # run a task
    async for event in runner.resume(request, decisions): ...  # answer an approval
    runner.stop(thread_id)                                # the stop button

Internally it builds the agent (`core.py`), streams it, and translates
LangGraph's stream into `Event`s. Human-in-the-loop works through the same
door: when a tool needs approval the stream ends with `approval_required`, the
state stays checkpointed, and `resume` picks it up - minutes or days later.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Sequence
from typing import Any

from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.tools import BaseTool
from langgraph.types import Command

from .config import RunRequest
from .core import build_agent
from .durability import open_checkpointer
from .events import Event
from .observability import Tracer
from .prompts import run_context
from .subagents import list_agents
from .tracker import RunTracker
from .workspace import Workspace

# A human's answer to one paused action:
#   {"type": "approve"}
#   {"type": "edit", "edited_action": {"name": ..., "args": {...}}}
#   {"type": "reject", "message": "why"}
Decision = dict[str, Any]

_MODEL_NODE = "model"  # the node name LangChain gives the model step


def _text(content: Any) -> str:
    if isinstance(content, str):
        return content
    return "".join(block.get("text", "") for block in content if isinstance(block, dict) and block.get("type") == "text")


class Runner:
    def __init__(self, workspace: Workspace, extra_tools: Sequence[BaseTool] = ()) -> None:
        self.workspace = workspace
        self.extra_tools = tuple(extra_tools)
        self._active: dict[str, RunTracker] = {}

    # ── public ──

    def start(self, request: RunRequest) -> AsyncIterator[Event]:
        """Run a task from a prompt. On an existing thread this continues the conversation."""
        lead = next((p for p in list_agents(self.workspace) if p.id == request.agent_id), None)
        context = run_context(request, lead.title if lead else None, self.workspace.root.name)
        graph_input: dict[str, Any] = {"messages": [{"role": "user", "content": f"{context}\n\n{request.prompt}"}]}
        if request.rubric:
            graph_input["rubric"] = request.rubric
        return self._stream(request, graph_input, title=request.prompt)

    def resume(self, request: RunRequest, decisions: list[Decision]) -> AsyncIterator[Event]:
        """Continue a paused task with the human's decisions, one per pending action, in order."""
        return self._stream(request, Command(resume={"decisions": decisions}), decisions=decisions)

    def stop(self, thread_id: str) -> bool:
        """Ask a running task to stop. It ends cleanly before its next model call."""
        tracker = self._active.get(thread_id)
        if tracker:
            tracker.request_stop()
        return tracker is not None

    def is_running(self, thread_id: str) -> bool:
        return thread_id in self._active

    # ── internals ──

    async def _stream(self, request: RunRequest, graph_input: Any, title: str | None = None, decisions: list[Decision] | None = None) -> AsyncIterator[Event]:
        thread_id = request.thread_id
        tracer = Tracer(self.workspace, thread_id)
        config = {"configurable": {"thread_id": thread_id}}

        # The agent works in a background task and reports through a queue, so an
        # event reaches the caller the moment it happens - including "tool started"
        # while that tool is still running. Hooks may fire from worker threads,
        # hence the thread-safe hand-off.
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[Event | None] = asyncio.Queue()
        tracker = RunTracker(thread_id=thread_id, limits=request.limits, model=request.model, emit_event=lambda event: loop.call_soon_threadsafe(queue.put_nowait, event))
        self._active[thread_id] = tracker

        async def work() -> None:
            pending: list[dict[str, Any]] = []
            error: str | None = None
            tracker.emit("run_started", mode=request.mode, model=request.model.model, agent=request.agent_id, user=request.user_name, prompt=title)
            if decisions is not None:
                # Who answered a pending approval, and how: the audit trail of human decisions.
                tracker.emit("approval_decided", by=request.user_name, decisions=[{"type": d.get("type"), "message": d.get("message"), "edited": d.get("edited_action")} for d in decisions])
            tracer.write_summary(status="running", pending=[], mode=request.mode, model_id=request.model.id, agent_id=request.agent_id, **({"title": title} if title else {}))
            try:
                async with open_checkpointer(self.workspace) as checkpointer:
                    agent = build_agent(self.workspace, request, tracker, checkpointer, self.extra_tools)
                    # The hooks stop the run at its own ceilings; this outer timeout only catches a hung call.
                    async with asyncio.timeout(request.limits.max_seconds + 30):
                        async for mode, chunk in agent.astream(graph_input, config, stream_mode=["updates", "messages"]):
                            if mode == "messages":
                                self._on_token(tracker, chunk)
                            else:
                                pending += self._on_update(tracker, chunk)
                    state = await agent.aget_state(config)
                    tracer.write_plan(list(state.values.get("todos") or []))
            except TimeoutError:
                tracker.stop_reason = "time_limit"
            except Exception as exc:  # noqa: BLE001 - a failed run is reported, never raised into the caller
                tracker.stop_reason, error = "error", f"{type(exc).__name__}: {exc}"

            if pending and tracker.stop_reason is None:
                tracker.stop_reason = "awaiting_approval"
            tracker.stop_reason = tracker.stop_reason or "completed"
            summary = tracker.summary() | ({"error": error} if error else {})
            tracer.write_summary(status="waiting" if tracker.stop_reason == "awaiting_approval" else "finished", pending=pending, **summary)
            tracker.emit("run_finished", **summary)

        async def supervised() -> None:
            try:
                await work()
            finally:
                self._active.pop(thread_id, None)
                loop.call_soon_threadsafe(queue.put_nowait, None)  # after every event: the end marker

        task = asyncio.create_task(supervised())
        try:
            while (event := await queue.get()) is not None:
                tracer.record(event)
                yield event
        finally:
            # The caller went away mid-run (closed tab, killed process): stop working for nobody.
            if not task.done():
                tracker.request_stop()
                task.cancel()

    @staticmethod
    def _on_token(tracker: RunTracker, chunk: tuple[Any, dict[str, Any]]) -> None:
        """Model output as it is produced. Only the lead agent's own words are shown."""
        message, metadata = chunk
        if isinstance(message, (AIMessage, AIMessageChunk)) and metadata.get("langgraph_node") == _MODEL_NODE:
            if text := _text(message.content):
                tracker.emit("text", text=text)

    @staticmethod
    def _on_update(tracker: RunTracker, update: dict[str, Any]) -> list[dict[str, Any]]:
        """State changes after each step. Returns the actions waiting for approval, if the run paused."""
        pending: list[dict[str, Any]] = []
        for node, change in update.items():
            if node == "__interrupt__":
                for interrupt in change:
                    request = interrupt.value if isinstance(interrupt.value, dict) else {}
                    allowed = {c["action_name"]: c["allowed_decisions"] for c in request.get("review_configs", [])}
                    for action in request.get("action_requests", []):
                        pending.append({"tool": action["name"], "args": action.get("args", {}), "description": action.get("description", ""), "allowed": allowed.get(action["name"], ["approve", "reject"])})
                if pending:
                    tracker.emit("approval_required", actions=pending)
                continue
            if not isinstance(change, dict):
                continue
            if "todos" in change:
                tracker.emit("plan", todos=change["todos"])
            # Text written by a hook (e.g. "stopped at the limit") never passes through the model stream.
            if node != _MODEL_NODE:
                for message in change.get("messages") or []:
                    if isinstance(message, AIMessage) and (text := _text(message.content)):
                        tracker.emit("text", text=text)
        return pending
