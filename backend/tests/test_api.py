"""The HTTP layer, exercised end to end against the demo model."""

from __future__ import annotations

import json

import httpx
import pytest

from server import keychain
from server.app import create_app


@pytest.fixture
async def api(tmp_path, monkeypatch):
    """A client on a fresh app, with machine settings and the keychain redirected away from the real ones."""
    monkeypatch.setenv("HARNESS_HOME", str(tmp_path / "home"))
    monkeypatch.delenv("HARNESS_TOKEN", raising=False)
    vault: dict[str, str] = {}
    monkeypatch.setattr(keychain, "get_key", lambda model_id: vault.get(model_id, ""))
    monkeypatch.setattr(keychain, "set_key", vault.__setitem__)
    monkeypatch.setattr(keychain, "delete_key", lambda model_id: vault.pop(model_id, None))

    app = create_app()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        client.vault = vault  # type: ignore[attr-defined]
        client.app = app  # type: ignore[attr-defined]
        client.workspace_path = str(tmp_path / "ws")  # type: ignore[attr-defined]
        yield client


async def _open(api) -> None:
    assert (await api.post("/workspace", json={"path": api.workspace_path})).status_code == 200


async def _finish(api, thread_id: str) -> dict:
    await api.app.state.harness.manager.wait(thread_id)
    return (await api.get(f"/runs/{thread_id}")).json()


async def test_nothing_runs_before_a_workspace_is_open(api):
    response = await api.post("/runs", json={"prompt": "سلام"})

    assert response.status_code == 409


async def test_a_task_runs_in_the_background_and_its_trace_is_readable(api):
    await _open(api)
    thread_id = (await api.post("/runs", json={"prompt": "گزارش بنویس", "mode": "auto"})).json()["thread_id"]
    run = await _finish(api, thread_id)

    assert run["status"] == "finished" and run["stop_reason"] == "completed"
    assert run["title"] == "گزارش بنویس"
    assert {"run_started", "plan", "tool_started", "file_changed", "run_finished"} <= {event["type"] for event in run["events"]}
    assert any(file["name"] == "گزارش-نمایشی.md" for file in (await api.get("/files")).json())


async def test_the_event_stream_replays_a_finished_run(api):
    await _open(api)
    thread_id = (await api.post("/runs", json={"prompt": "گزارش بنویس", "mode": "auto"})).json()["thread_id"]
    await _finish(api, thread_id)

    body = (await api.get(f"/runs/{thread_id}/events")).text
    events = [json.loads(line[6:]) for line in body.splitlines() if line.startswith("data: {\"")]

    assert events[0]["type"] == "run_started" and events[-1]["type"] == "run_finished"
    assert body.rstrip().endswith("event: end\ndata: {}")


async def test_the_approvals_inbox_lists_and_resolves_paused_actions(api):
    await _open(api)
    thread_id = (await api.post("/runs", json={"prompt": "گزارش بنویس", "mode": "ask"})).json()["thread_id"]
    assert (await _finish(api, thread_id))["status"] == "waiting"

    inbox = (await api.get("/approvals")).json()
    assert inbox[0]["thread_id"] == thread_id and inbox[0]["actions"][0]["tool"] == "write_file"

    wrong = await api.post(f"/runs/{thread_id}/decisions", json={"decisions": []})
    assert wrong.status_code == 400

    assert (await api.post(f"/runs/{thread_id}/decisions", json={"decisions": [{"type": "approve"}]})).status_code == 200
    assert (await _finish(api, thread_id))["stop_reason"] == "completed"
    assert (await api.get("/approvals")).json() == []


async def test_model_keys_go_to_the_keychain_and_never_come_back_out(api):
    saved = (await api.post("/models", json={"name": "Claude", "base_url": "https://api.anthropic.com", "model": "claude-opus-5-5", "api_key": "sk-ant-secret"})).json()

    assert api.vault[saved["id"]] == "sk-ant-secret"
    listed = (await api.get("/models")).json()
    assert "sk-ant-secret" not in json.dumps(listed)
    assert next(m for m in listed if m["id"] == saved["id"])["has_key"] is True

    await api.post(f"/models/{saved['id']}/default")
    assert next(m for m in (await api.get("/models")).json() if m["is_default"])["id"] == saved["id"]

    await api.delete(f"/models/{saved['id']}")
    assert saved["id"] not in api.vault


async def test_files_stay_inside_the_workspace_and_system_files_are_opt_in(api):
    await _open(api)
    await api.put("/files/content", json={"path": "/notes/todo.md", "content": "سلام"})

    assert (await api.get("/files/content", params={"path": "/notes/todo.md"})).json()["content"] == "سلام"
    assert (await api.get("/files/content", params={"path": "/../../etc/passwd"})).status_code == 400

    plain = (await api.get("/files")).json()
    with_system = (await api.get("/files", params={"system": True})).json()
    assert not any(file["system"] for file in plain)
    assert any(file["path"] == "/.harness/rules.yaml" for file in with_system)
    assert not any("/runs/" in file["path"] or "state.db" in file["path"] for file in with_system)


async def test_harness_files_are_editable_and_rules_are_validated(api):
    await _open(api)

    assert (await api.get("/skills")).json()[0]["id"] == "weekly-report"
    assert (await api.get("/agents")).json()[0]["id"] == "analyst"

    await api.put("/memory", json={"content": "- مبالغ به تومان"})
    assert (await api.get("/memory")).json()["content"] == "- مبالغ به تومان"

    assert (await api.put("/rules", json={"content": "files: [unclosed"})).status_code == 400
    assert (await api.put("/rules", json={"content": "files: []\ntools: {}\n"})).status_code == 200


async def test_a_token_is_required_when_one_is_configured(api, monkeypatch):
    monkeypatch.setenv("HARNESS_TOKEN", "s3cret")

    assert (await api.get("/health")).status_code == 401
    assert (await api.get("/health", headers={"Authorization": "Bearer s3cret"})).status_code == 200
    assert (await api.get("/health", params={"token": "s3cret"})).status_code == 200
