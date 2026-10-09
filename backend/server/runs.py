"""Run manager: keeps tasks going in the background and lets the UI watch them.

The harness yields events; a browser tab may open, close and reopen while a
task runs. So each run is pumped by a background task that does not depend on
anyone listening, and a listener gets the trace so far followed by live events.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

from harness import Event, Runner, Workspace
from harness.observability import read_trace


class RunManager:
    def __init__(self, workspace: Workspace) -> None:
        self.workspace = workspace
        self.runner = Runner(workspace)
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._listeners: dict[str, set[asyncio.Queue[dict[str, Any] | None]]] = {}

    def is_running(self, thread_id: str) -> bool:
        task = self._tasks.get(thread_id)
        return task is not None and not task.done()

    def launch(self, thread_id: str, stream: AsyncIterator[Event]) -> None:
        self._tasks[thread_id] = asyncio.create_task(self._pump(thread_id, stream))

    async def _pump(self, thread_id: str, stream: AsyncIterator[Event]) -> None:
        try:
            async for event in stream:
                for queue in self._listeners.get(thread_id, ()):
                    queue.put_nowait(event.to_dict())
        finally:
            for queue in self._listeners.get(thread_id, ()):
                queue.put_nowait(None)

    async def watch(self, thread_id: str) -> AsyncIterator[dict[str, Any]]:
        """Everything recorded so far, then live events until the run ends."""
        queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
        self._listeners.setdefault(thread_id, set()).add(queue)
        try:
            # Subscribe first, replay second: an event written in between arrives
            # both ways, and is dropped below by its timestamp.
            replayed_until = 0.0
            for event in read_trace(self.workspace, thread_id):
                replayed_until = event["at"]
                yield event
            if not self.is_running(thread_id):
                return
            while (event := await queue.get()) is not None:
                if event["at"] > replayed_until:
                    yield event
        finally:
            self._listeners[thread_id].discard(queue)

    async def wait(self, thread_id: str) -> None:
        if task := self._tasks.get(thread_id):
            await task
