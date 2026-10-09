"""Registry of acceptance cases: each is one line of the checklist, with its own pass rule."""

from __future__ import annotations

import traceback
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from .kit import Result, Status


@dataclass
class Case:
    id: str
    area: str
    title: str
    run: Callable[[], Awaitable[tuple[Status, str]]]
    # Serial cases swap the model for a scripted one or measure timing, so they must not overlap others.
    serial: bool = False


CASES: list[Case] = []


def case(id: str, area: str, title: str, *, serial: bool = False):
    def register(fn: Callable[[], Awaitable[tuple[Status, str]]]):
        CASES.append(Case(id, area, title, fn, serial))
        return fn

    return register


def note(id: str, area: str, title: str, status: Status, evidence: str) -> None:
    """A checklist line that needs no run: the feature is absent, or it cannot be tested here."""

    async def fixed() -> tuple[Status, str]:
        return status, evidence

    CASES.append(Case(id, area, title, fixed, serial=True))


async def execute(c: Case) -> Result:
    try:
        status, evidence = await c.run()
    except Exception as error:  # noqa: BLE001 - a crashing case is a failed case, with its reason
        status, evidence = "fail", f"خطا در اجرای تست: {type(error).__name__}: {error} | {traceback.format_exc(limit=2).splitlines()[-2].strip()}"
    return Result(c.id, c.area, c.title, status, evidence)
