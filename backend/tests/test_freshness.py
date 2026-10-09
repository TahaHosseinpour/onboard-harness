"""A file is never overwritten with a version the agent has not seen."""

from __future__ import annotations

from langchain_core.messages import AIMessage

from harness.demo_model import call

from .conftest import collect, finished, of_type, request


def _failed_writes(events) -> list:
    return [e for e in of_type(events, "tool_finished") if e.data["tool"] in ("write_file", "edit_file") and not e.data["ok"]]


async def test_an_existing_file_must_be_read_before_it_is_changed(runner, script, workspace):
    target = workspace.root / "notes.md"
    target.write_text("خط کاربر\n", encoding="utf-8")
    edit = call("edit_file", file_path="/notes.md", old_string="خط کاربر", new_string="خط کاربر\nخط ایجنت")
    script(
        AIMessage(content="", tool_calls=[edit]),  # blind edit: refused
        AIMessage(content="", tool_calls=[call("read_file", file_path="/notes.md")]),
        AIMessage(content="", tool_calls=[edit]),  # after reading: allowed
        AIMessage(content="انجام شد."),
    )
    events = await collect(runner.start(request(mode="auto")))

    assert len(_failed_writes(events)) == 1 and "have not read it" in _failed_writes(events)[0].data["output"]
    assert target.read_text(encoding="utf-8") == "خط کاربر\nخط ایجنت\n"
    assert finished(events)["stop_reason"] == "completed"


async def test_a_file_changed_by_someone_else_after_reading_is_not_overwritten(runner, script, workspace):
    target = workspace.root / "notes.md"
    target.write_text("نسخهٔ اول\n", encoding="utf-8")
    script(
        AIMessage(content="", tool_calls=[call("read_file", file_path="/notes.md")]),
        # Between the read and the edit, the user changes the file by hand (see the loop below).
        AIMessage(content="", tool_calls=[call("edit_file", file_path="/notes.md", old_string="نسخهٔ اول", new_string="نسخهٔ ایجنت")]),
        AIMessage(content="نشد."),
    )
    events = []
    async for event in runner.start(request(mode="auto")):
        events.append(event)
        if event.type == "tool_finished" and event.data["tool"] == "read_file":
            target.write_text("نسخهٔ اول\nدست‌نوشتهٔ کاربر\n", encoding="utf-8")

    assert "has changed since you read it" in _failed_writes(events)[0].data["output"]
    assert target.read_text(encoding="utf-8") == "نسخهٔ اول\nدست‌نوشتهٔ کاربر\n", "the user's edit survived"


async def test_new_files_need_no_reading(runner, workspace):
    events = await collect(runner.start(request(mode="auto")))

    assert not _failed_writes(events)
    assert (workspace.root / "گزارش-نمایشی.md").exists()
