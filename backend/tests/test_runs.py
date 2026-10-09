"""End-to-end runs with a scripted model: the fixed test suite for the harness.

Each test pins one promise from the design. When a real run goes wrong, the
fix lands here as a new test (or in `rules.yaml` as a new rule).
"""

from __future__ import annotations

import json

from langchain_core.messages import AIMessage

from harness import Limits
from harness.demo_model import call
from harness.observability import list_runs, read_trace

from .conftest import collect, finished, of_type, request


async def test_full_run_plans_computes_writes_and_finishes(runner, workspace):
    events = await collect(runner.start(request(mode="auto")))

    assert finished(events)["stop_reason"] == "completed"
    assert of_type(events, "plan"), "the plan is reported as it changes"
    assert [e.data["tool"] for e in of_type(events, "tool_started")].count("calculate") == 1
    assert (workspace.root / "گزارش-نمایشی.md").exists(), "the file tool wrote into the workspace"
    assert of_type(events, "file_changed")[0].data["path"] == "/گزارش-نمایشی.md"
    assert "".join(e.data["text"] for e in of_type(events, "text")).strip(), "the final answer is streamed"


async def test_every_step_is_on_disk(runner, workspace):
    req = request(mode="auto")
    events = await collect(runner.start(req))

    trace = read_trace(workspace, req.thread_id)
    assert [e["type"] for e in trace] == [e.type for e in events], "the trace file is the event stream, in order"
    summary = list_runs(workspace)[0]
    assert summary["status"] == "finished" and summary["stop_reason"] == "completed"
    plan = json.loads((workspace.run_dir(req.thread_id) / "plan.json").read_text(encoding="utf-8"))
    assert plan and all(step["status"] == "completed" for step in plan), "the plan is stored outside the conversation"


async def test_cost_is_counted_from_reported_usage(runner):
    data = finished(await collect(runner.start(request(mode="auto"))))

    assert data["input_tokens"] == 1200 * data["model_calls"]
    assert data["cost"] > 0


async def test_ask_mode_pauses_before_writing_then_resumes_on_approval(runner, workspace):
    req = request(mode="ask")
    first = await collect(runner.start(req))

    assert finished(first)["stop_reason"] == "awaiting_approval"
    pending = of_type(first, "approval_required")[0].data["actions"]
    assert pending[0]["tool"] == "write_file"
    assert not (workspace.root / "گزارش-نمایشی.md").exists(), "nothing is written before the human decides"
    assert list_runs(workspace)[0]["status"] == "waiting"

    second = await collect(runner.resume(req, [{"type": "approve"}]))

    assert finished(second)["stop_reason"] == "completed"
    assert (workspace.root / "گزارش-نمایشی.md").exists()


async def test_rejection_is_respected(runner, workspace):
    req = request(mode="ask")
    await collect(runner.start(req))
    events = await collect(runner.resume(req, [{"type": "reject", "message": "فعلاً لازم نیست"}]))

    assert not (workspace.root / "گزارش-نمایشی.md").exists()
    assert not [e for e in of_type(events, "tool_started") if e.data["tool"] == "write_file"], "a rejected action is never executed or audited"


async def test_the_human_can_edit_an_action_before_it_runs(runner, workspace):
    req = request(mode="ask")
    await collect(runner.start(req))
    edited = {"name": "write_file", "args": {"file_path": "/ویرایش‌شده.md", "content": "متن اصلاح‌شده"}}
    await collect(runner.resume(req, [{"type": "edit", "edited_action": edited}]))

    assert (workspace.root / "ویرایش‌شده.md").read_text(encoding="utf-8") == "متن اصلاح‌شده"
    assert not (workspace.root / "گزارش-نمایشی.md").exists()


async def test_read_only_mode_changes_nothing(runner, workspace):
    before = {p for p in workspace.root.rglob("*") if ".harness" not in p.parts}
    events = await collect(runner.start(request(mode="read_only")))

    assert finished(events)["stop_reason"] == "completed"
    assert not of_type(events, "file_changed")
    assert {p for p in workspace.root.rglob("*") if ".harness" not in p.parts} == before


async def test_model_call_ceiling_stops_the_run_with_a_reason(runner):
    events = await collect(runner.start(request(mode="auto", limits=Limits(max_model_calls=2))))

    assert finished(events)["stop_reason"] == "model_call_limit"
    assert finished(events)["model_calls"] == 2


async def test_time_ceiling_stops_the_run(runner):
    events = await collect(runner.start(request(mode="auto", limits=Limits(max_seconds=0))))

    assert finished(events)["stop_reason"] == "time_limit"


async def test_cost_ceiling_stops_the_run(runner):
    events = await collect(runner.start(request(mode="auto", limits=Limits(max_cost=0.001))))

    assert finished(events)["stop_reason"] == "cost_limit"


async def test_stop_hook_sends_the_agent_back_when_the_plan_is_unfinished(runner, script):
    open_plan = [{"content": "نوشتن گزارش", "status": "in_progress"}]
    script(
        AIMessage(content="", tool_calls=[call("write_todos", todos=open_plan)]),
        AIMessage(content="تمام شد."),  # claims to be done with an open step
        AIMessage(content="", tool_calls=[call("write_todos", todos=[{**open_plan[0], "status": "completed"}])]),
        AIMessage(content="حالا واقعاً تمام شد."),
    )
    events = await collect(runner.start(request(mode="auto")))

    assert of_type(events, "verification"), "the unfinished plan was caught"
    assert finished(events)["stop_reason"] == "completed"
    assert of_type(events, "plan")[-1].data["todos"][0]["status"] == "completed"


async def test_circuit_breaker_ends_a_run_that_keeps_failing(runner, script):
    failing = AIMessage(content="", tool_calls=[call("read_table", path="/وجود-ندارد.csv")])
    script(failing, failing, failing, failing, failing, AIMessage(content="نشد."))
    events = await collect(runner.start(request(mode="auto")))

    assert finished(events)["stop_reason"] == "circuit_open"
    assert len([e for e in of_type(events, "tool_finished") if not e.data["ok"]]) == 3, "the tool is closed after three failures"


async def test_a_crashing_model_is_reported_not_raised(runner, monkeypatch):
    def broken(spec):
        raise RuntimeError("no such endpoint")

    monkeypatch.setattr("harness.core.build_chat_model", broken)
    data = finished(await collect(runner.start(request(mode="auto"))))

    assert data["stop_reason"] == "error" and "no such endpoint" in data["error"]


async def test_a_conversation_continues_on_the_same_thread(runner, script, workspace):
    script(AIMessage(content="سلام."))
    req = request(mode="auto", prompt="سلام")
    await collect(runner.start(req))
    again = await collect(runner.start(request(mode="auto", prompt="ادامه بده", thread_id=req.thread_id)))

    assert finished(again)["stop_reason"] == "completed"
    assert len(read_trace(workspace, req.thread_id)) > len(again), "both turns share one trace"


async def test_a_paused_run_resumes_after_a_restart(runner, workspace):
    from harness import Runner

    req = request(mode="ask")
    await collect(runner.start(req))
    # A new Runner stands in for the app being closed and opened again: only the files on disk carry over.
    events = await collect(Runner(workspace).resume(req, [{"type": "approve"}]))

    assert finished(events)["stop_reason"] == "completed"
    assert (workspace.root / "گزارش-نمایشی.md").exists()


async def test_the_stop_button_ends_the_run_before_the_next_step(runner):
    req = request(mode="auto")
    events = []
    async for event in runner.start(req):
        events.append(event)
        if event.type == "tool_started":
            assert runner.stop(req.thread_id)

    assert finished(events)["stop_reason"] == "stopped_by_user"
    assert not runner.is_running(req.thread_id)


async def test_the_shell_runs_inside_the_workspace_and_asks_first(runner, script, workspace):
    script(AIMessage(content="", tool_calls=[call("execute", command="echo hello > from-shell.txt")]), AIMessage(content="انجام شد."))

    paused = await collect(runner.start(request(mode="ask")))
    assert of_type(paused, "approval_required")[0].data["actions"][0]["tool"] == "execute"
    assert not (workspace.root / "from-shell.txt").exists()

    events = await collect(runner.start(request(mode="auto")))
    assert finished(events)["stop_reason"] == "completed"
    assert (workspace.root / "from-shell.txt").exists(), "the command ran with the workspace as its folder"


async def test_a_denied_action_is_refused_and_not_audited(runner, script, workspace):
    workspace.rules_file.write_text("files:\n  - {paths: ['/**'], operations: [write], access: deny}\n", encoding="utf-8")
    script(AIMessage(content="", tool_calls=[call("write_file", file_path="/x.md", content="x")]), AIMessage(content="اجازه ندارم."))
    events = await collect(runner.start(request(mode="auto")))

    assert not (workspace.root / "x.md").exists()
    assert not of_type(events, "tool_started"), "a denied call is not an execution"


async def test_memory_and_skills_reach_the_model_but_run_context_stays_out_of_the_system_prompt(runner, monkeypatch):
    from langchain_core.messages import HumanMessage, SystemMessage

    from harness.demo_model import ScriptedChatModel

    seen = {}

    class Recording(ScriptedChatModel):
        def _generate(self, messages, *args, **kwargs):
            seen["system"] = "\n".join(str(m.content) for m in messages if isinstance(m, SystemMessage))
            seen["human"] = "\n".join(str(m.content) for m in messages if isinstance(m, HumanMessage))
            return super()._generate(messages, *args, **kwargs)

    monkeypatch.setattr("harness.core.build_chat_model", lambda spec: Recording(script=[AIMessage(content="سلام.")]))
    await collect(runner.start(request(mode="auto", user_name="نیما")))

    assert "Amounts are written in Toman" in seen["system"], "workspace memory is loaded"
    assert "weekly-report" in seen["system"], "skills are listed by name and description"
    assert "## Steps" not in seen["system"], "a skill's body is not loaded until it is needed"
    assert "<run_context>" in seen["human"] and "<run_context>" not in seen["system"]
