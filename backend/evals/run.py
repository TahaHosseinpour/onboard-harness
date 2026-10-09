"""Run the acceptance checklist against a real model and write a report.

    set HARNESS_EVAL_KEY=...            (never written to disk)
    python -m evals.run                 all cases
    python -m evals.run 6. 11.1         only ids starting with these prefixes

Writes evals/REPORT.md and evals/results.json.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from dataclasses import asdict
from pathlib import Path

from . import cases_a, cases_b  # noqa: F401 - importing registers the cases
from .cases_b import end_reasons
from .kit import ALL_RUNS, Result, real_model
from .registry import CASES, execute

HERE = Path(__file__).parent
LABEL = {"pass": "✅ قبول", "partial": "🟡 ناقص", "fail": "❌ رد", "not_built": "⬜ ساخته نشده", "not_testable": "➖ قابل تست نیست"}
ORDER = ["pass", "partial", "fail", "not_built", "not_testable"]


def sort_key(result: Result) -> list[int]:
    return [int(part) for part in result.id.replace("-", ".").split(".") if part.isdigit()]


async def main(prefixes: list[str]) -> None:
    chosen = [c for c in CASES if not prefixes or any(c.id.startswith(p) for p in prefixes)]
    started = time.monotonic()
    # The test provider drops requests under load, which shows up as false failures; keep this low.
    gate = asyncio.Semaphore(int(os.environ.get("HARNESS_EVAL_PARALLEL", "2")))

    async def guarded(c):
        async with gate:
            result = await execute(c)
            print(f"{LABEL[result.status]}  {result.id}  {result.title}", flush=True)
            return result

    # Cases that swap the model or measure timing run alone; the rest run side by side.
    results = [await guarded(c) for c in chosen if c.serial]
    results += await asyncio.gather(*(guarded(c) for c in chosen if not c.serial))

    if not prefixes or any("1.3".startswith(p) for p in prefixes):
        status, evidence = end_reasons()
        results.append(Result("1.3", "۱. حلقهٔ اجرا", "هر اجرا یک دلیل پایان مشخص دارد", status, evidence))

    results.sort(key=sort_key)
    counts = {status: sum(1 for r in results if r.status == status) for status in ORDER}
    tokens = sum(r.summary.get("input_tokens", 0) + r.summary.get("output_tokens", 0) for r in ALL_RUNS)
    cost = sum(r.summary.get("cost", 0) for r in ALL_RUNS)
    model = real_model()

    lines = [
        "# گزارش تست پذیرش Onboard Harness",
        "",
        f"مدل: `{model.model}` از `{model.base_url}` · {len(ALL_RUNS)} اجرای ایجنت · {tokens:,} توکن · حدود {cost:.2f} دلار (قیمت فهرستی) · {time.monotonic() - started:.0f} ثانیه",
        "",
        " · ".join(f"{LABEL[s]}: {counts[s]}" for s in ORDER) + f" · مجموع: {len(results)}",
        "",
    ]
    area = None
    for result in results:
        if result.area != area:
            area = result.area
            lines += ["", f"## {area}", "", "| # | مورد | نتیجه | شواهد |", "|---|---|---|---|"]
        lines.append(f"| {result.id} | {result.title} | {LABEL[result.status]} | {result.evidence.replace('|', '¦').replace(chr(10), ' ')} |")

    (HERE / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (HERE / "results.json").write_text(json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n" + " · ".join(f"{LABEL[s]}: {counts[s]}" for s in ORDER))


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
