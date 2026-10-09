"""Observability: every step of every run is on disk, in the workspace.

Each run has a folder `.harness/runs/<thread_id>/` with:

    trace.jsonl   every event, one JSON object per line, in order
    run.json      the summary: status, why it stopped, tokens, cost, what is waiting
    plan.json     the plan as it stood at the end

Plain files mean a self-hosted install needs no external service to answer
"what did the agent do and why did it stop?". They are also what the test
suite reads, and where a failed run is turned into a new test or a new rule.

LangSmith tracing is optional and needs no code: set `LANGSMITH_TRACING=true`
and `LANGSMITH_API_KEY` and the same runs appear there too.
"""

from __future__ import annotations

import json
import time
from typing import Any

from .events import Event
from .workspace import Workspace


class Tracer:
    def __init__(self, workspace: Workspace, thread_id: str) -> None:
        self.dir = workspace.run_dir(thread_id)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.thread_id = thread_id

    def record(self, event: Event) -> None:
        with (self.dir / "trace.jsonl").open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(event.to_dict(), ensure_ascii=False) + "\n")

    def write_summary(self, **fields: Any) -> dict[str, Any]:
        """Merge new fields into run.json and return the result."""
        summary = {**self.read_summary(), **fields, "thread_id": self.thread_id, "updated_at": time.time()}
        (self.dir / "run.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        return summary

    def read_summary(self) -> dict[str, Any]:
        file = self.dir / "run.json"
        return json.loads(file.read_text(encoding="utf-8")) if file.exists() else {}

    def write_plan(self, todos: list[dict[str, Any]]) -> None:
        (self.dir / "plan.json").write_text(json.dumps(todos, ensure_ascii=False, indent=2), encoding="utf-8")


def read_trace(workspace: Workspace, thread_id: str) -> list[dict[str, Any]]:
    file = workspace.run_dir(thread_id) / "trace.jsonl"
    if not file.exists():
        return []
    return [json.loads(line) for line in file.read_text(encoding="utf-8").splitlines() if line.strip()]


def list_runs(workspace: Workspace) -> list[dict[str, Any]]:
    """Summaries of all runs, newest first."""
    summaries = []
    for file in workspace.runs_dir.glob("*/run.json"):
        try:
            summaries.append(json.loads(file.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            continue
    return sorted(summaries, key=lambda s: s.get("updated_at", 0), reverse=True)
