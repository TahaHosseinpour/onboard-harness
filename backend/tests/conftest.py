"""Shared fixtures: a throwaway workspace and a way to script the model."""

from __future__ import annotations

import uuid

import pytest
from langchain_core.messages import AIMessage

from harness import ModelSpec, Runner, RunRequest, Workspace
from harness.demo_model import ScriptedChatModel

DEMO = ModelSpec(id="demo", name="Demo", base_url="demo://", model="demo", input_price=1.0, output_price=2.0)


@pytest.fixture
def workspace(tmp_path) -> Workspace:
    return Workspace.at(tmp_path / "ws").scaffold()


@pytest.fixture
def runner(workspace) -> Runner:
    return Runner(workspace)


@pytest.fixture
def script(monkeypatch):
    """Replace the model with one that replays the given replies."""

    def use(*replies: AIMessage) -> None:
        monkeypatch.setattr("harness.core.build_chat_model", lambda spec: ScriptedChatModel(script=list(replies)))

    return use


def request(prompt: str = "گزارش فروش را بنویس", **overrides) -> RunRequest:
    return RunRequest(thread_id=overrides.pop("thread_id", uuid.uuid4().hex), prompt=prompt, model=DEMO, **overrides)


async def collect(stream) -> list:
    return [event async for event in stream]


def of_type(events, type_: str) -> list:
    return [event for event in events if event.type == type_]


def finished(events) -> dict:
    return of_type(events, "run_finished")[-1].data
