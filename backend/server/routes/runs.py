"""Tasks: start, watch, stop, and answer approvals."""

from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from harness import RunRequest
from harness.observability import Tracer, list_runs, read_trace

from .. import settings
from ..schemas import Decisions, StartRun
from ..state import AppState

router = APIRouter(tags=["runs"])


def _state(request: Request) -> AppState:
    return request.app.state.harness


def _request_for(thread_id: str, *, prompt: str, model_id: str | None, agent_id: str | None, mode: str, rubric: str | None = None, user_name: str = "") -> RunRequest:
    model = settings.model_spec(model_id)
    if model is None:
        raise HTTPException(status_code=400, detail="No model is defined. Add one in Settings.")
    return RunRequest(thread_id=thread_id, prompt=prompt, model=model, mode=mode, agent_id=agent_id, rubric=rubric, user_name=user_name)  # type: ignore[arg-type]


@router.post("/runs")
async def start_run(body: StartRun, request: Request) -> dict[str, str]:
    manager = _state(request).manager
    thread_id = body.thread_id or uuid.uuid4().hex[:12]
    if manager.is_running(thread_id):
        raise HTTPException(status_code=409, detail="This task is already running.")
    run = _request_for(thread_id, prompt=body.prompt, model_id=body.model_id, agent_id=body.agent_id, mode=body.mode, rubric=body.rubric, user_name=body.user_name)
    manager.launch(thread_id, manager.runner.start(run))
    return {"thread_id": thread_id}


@router.get("/runs")
def all_runs(request: Request) -> list[dict[str, Any]]:
    return list_runs(_state(request).workspace)


@router.get("/runs/{thread_id}")
def one_run(thread_id: str, request: Request) -> dict[str, Any]:
    state = _state(request)
    summary = Tracer(state.workspace, thread_id).read_summary()
    if not summary:
        raise HTTPException(status_code=404, detail="No such task.")
    return {**summary, "running": state.manager.is_running(thread_id), "events": read_trace(state.workspace, thread_id)}


@router.get("/runs/{thread_id}/events")
async def watch_run(thread_id: str, request: Request) -> StreamingResponse:
    """Server-sent events: the trace so far, then live events until the run ends."""
    manager = _state(request).manager

    async def stream() -> AsyncIterator[str]:
        async for event in manager.watch(thread_id):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        yield "event: end\ndata: {}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/runs/{thread_id}/stop")
def stop_run(thread_id: str, request: Request) -> dict[str, bool]:
    return {"stopping": _state(request).manager.runner.stop(thread_id)}


@router.post("/runs/{thread_id}/decisions")
async def decide(thread_id: str, body: Decisions, request: Request) -> dict[str, str]:
    """Answer the actions a paused task is waiting on, and let it continue."""
    state = _state(request)
    summary = Tracer(state.workspace, thread_id).read_summary()
    pending = summary.get("pending") or []
    if summary.get("status") != "waiting" or not pending:
        raise HTTPException(status_code=409, detail="This task is not waiting for approval.")
    if len(body.decisions) != len(pending):
        raise HTTPException(status_code=400, detail=f"Expected {len(pending)} decisions, one per pending action.")
    run = _request_for(thread_id, prompt="", model_id=summary.get("model_id"), agent_id=summary.get("agent_id"), mode=summary.get("mode", "ask"))
    state.manager.launch(thread_id, state.manager.runner.resume(run, body.decisions))
    return {"thread_id": thread_id}


@router.get("/approvals")
def approvals(request: Request) -> list[dict[str, Any]]:
    """Every action waiting for a human, across all tasks: the approvals inbox."""
    return [
        {"thread_id": run["thread_id"], "title": run.get("title", ""), "agent_id": run.get("agent_id"), "updated_at": run.get("updated_at"), "actions": run["pending"]}
        for run in list_runs(_state(request).workspace)
        if run.get("status") == "waiting" and run.get("pending")
    ]
