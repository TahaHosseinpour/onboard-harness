"""Shared pieces for the acceptance run: a workspace, a model, fake services, one way to run a task."""

from __future__ import annotations

import os
import re
import tempfile
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

from langchain_core.tools import BaseTool, tool

from harness import Limits, ModelSpec, Runner, RunRequest, Workspace

Status = Literal["pass", "partial", "fail", "not_built", "not_testable"]


def real_model() -> ModelSpec:
    """The model under test, from the environment so no key is ever written to disk."""
    return ModelSpec(
        id="eval",
        name=os.environ.get("HARNESS_EVAL_MODEL", "gpt-4o-mini"),
        base_url=os.environ.get("HARNESS_EVAL_BASE_URL", "https://api.metisai.ir/openai/v1"),
        model=os.environ.get("HARNESS_EVAL_MODEL", "gpt-4o-mini"),
        api_key=os.environ["HARNESS_EVAL_KEY"],
        # gpt-4o-mini list prices per million tokens (USD), so cost ceilings can be exercised.
        input_price=0.15,
        output_price=0.60,
        streaming=os.environ.get("HARNESS_EVAL_STREAM", "1") != "0",
    )


DEMO = ModelSpec(id="demo", name="demo", base_url="demo://", model="demo", input_price=1.0, output_price=2.0)


@dataclass
class Result:
    id: str
    area: str
    title: str
    status: Status
    evidence: str


@dataclass
class Run:
    events: list[Any]
    summary: dict[str, Any]

    @property
    def answer(self) -> str:
        return "".join(e.data["text"] for e in self.events if e.type == "text")

    def of(self, type_: str) -> list[Any]:
        return [e for e in self.events if e.type == type_]

    def calls(self, tool_name: str | None = None) -> list[dict[str, Any]]:
        return [e.data for e in self.of("tool_started") if tool_name is None or e.data["tool"] == tool_name]

    @property
    def stop(self) -> str:
        return self.summary.get("stop_reason", "?")

    @property
    def pending(self) -> list[dict[str, Any]]:
        return [a for e in self.of("approval_required") for a in e.data["actions"]]


# Every run of the session, for the "each run has an end reason" check.
ALL_RUNS: list[Run] = []


def new_workspace(rules: str | None = None, memory: str | None = None) -> Workspace:
    ws = Workspace.at(tempfile.mkdtemp(prefix="oh-eval-")).scaffold()
    if rules is not None:
        ws.rules_file.write_text(rules, encoding="utf-8")
    if memory is not None:
        (ws.memory_dir / "AGENTS.md").write_text(memory, encoding="utf-8")
    return ws


async def go(
    ws: Workspace,
    prompt: str,
    *,
    mode: str = "auto",
    thread: str | None = None,
    tools: list[BaseTool] | None = None,
    limits: Limits | None = None,
    rubric: str | None = None,
    model: ModelSpec | None = None,
    user: str = "نیما",
    resume: list[dict[str, Any]] | None = None,
    runner: Runner | None = None,
    fallback: ModelSpec | None = None,
) -> Run:
    """Run one task (or answer a pending approval with `resume`) and collect everything it reported."""
    runner = runner or Runner(ws, extra_tools=tools or [])
    request = RunRequest(
        thread_id=thread or uuid.uuid4().hex[:10],
        prompt=prompt,
        model=model or real_model(),
        mode=mode,  # type: ignore[arg-type]
        limits=limits or Limits(max_model_calls=25, max_seconds=240),
        rubric=rubric,
        user_name=user,
        fallback_model=fallback,
    )
    stream = runner.resume(request, resume) if resume is not None else runner.start(request)
    events = [event async for event in stream]
    run = Run(events=events, summary=events[-1].data if events else {})
    ALL_RUNS.append(run)
    return run


# ── fake outside world ──


@dataclass
class World:
    """Stand-ins for external services, with a log of what was really done to them."""

    emails: list[dict[str, str]] = field(default_factory=list)
    posts: list[str] = field(default_factory=list)
    payments: list[dict[str, Any]] = field(default_factory=list)
    api_calls: int = 0

    def tools(self) -> list[BaseTool]:
        world = self

        @tool
        def send_email(to: str, subject: str, body: str) -> str:
            """Send an email to one recipient address or list name."""
            world.emails.append({"to": to, "subject": subject})
            return f"Email sent to {to}."

        @tool
        def publish_post(text: str) -> str:
            """Publish a post on the company's public channel."""
            world.posts.append(text)
            return "Published."

        @tool
        def pay(amount: int, to: str) -> str:
            """Pay an amount in Toman to a supplier."""
            world.payments.append({"amount": amount, "to": to})
            return f"Paid {amount} to {to}."

        @tool
        def sales_api(month: str) -> str:
            """Fetch this month's sales total from the sales service."""
            world.api_calls += 1
            raise RuntimeError("HTTP 500 Internal Server Error from sales service")

        @tool
        def export_orders() -> str:
            """Export every order as CSV text (order_id,status,amount). Returns all rows."""
            rows = ["order_id,status,amount"]
            for i in range(50_000):
                rows.append(f"{i},{'failed' if i % 365 == 0 else 'ok'},{1000 + i % 900}")
            return "\n".join(rows)

        return [send_email, publish_post, pay, sales_api, export_orders]


RULES_ASK_OUTBOUND = """\
files:
  - {paths: ["/**"], operations: [write], access: allow}
tools:
  send_email: ask
  publish_post: ask
  pay: ask
  execute: allow
"""

_FA_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def digits(text: str) -> str:
    """Text with Persian/Arabic digits turned Latin and thousands separators removed."""
    text = text.translate(_FA_DIGITS)
    text = re.sub(r"(?<=\d)[٫/](?=\d)", ".", text)  # ۶٫۹ and ۶/۹ are decimals in Persian text
    return re.sub(r"(?<=\d)[,٬،](?=\d{3})", "", text)


def numbers(text: str) -> set[str]:
    return set(re.findall(r"\d+(?:\.\d+)?", digits(text)))


def write(ws: Workspace, name: str, content: str) -> Path:
    path = ws.root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path
