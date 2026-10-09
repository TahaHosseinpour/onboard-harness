"""Table tools: read CSV / Excel files and total them with code, not by eye."""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path
from typing import Literal

from langchain_core.tools import BaseTool, tool

from ..workspace import Workspace

_OPERATIONS = {
    "sum": sum,
    "avg": lambda xs: sum(xs) / len(xs),
    "min": min,
    "max": max,
    "count": len,
}


def _load(path: Path) -> list[dict[str, object]]:
    """Rows of a table as dicts keyed by the header row."""
    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as handle:
            return list(csv.DictReader(handle))
    if path.suffix.lower() in {".xlsx", ".xlsm"}:
        from openpyxl import load_workbook  # imported lazily: only needed for Excel files

        sheet = load_workbook(path, read_only=True, data_only=True).active
        rows = sheet.iter_rows(values_only=True)
        header = [str(cell) if cell is not None else f"column_{i + 1}" for i, cell in enumerate(next(rows, ()))]
        return [dict(zip(header, row, strict=False)) for row in rows if any(cell is not None for cell in row)]
    raise ValueError("only .csv and .xlsx files are supported")


def _number(value: object) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    try:
        return float(str(value).replace(",", "").replace("٬", "").strip())
    except ValueError:
        return None


def make_table_tools(workspace: Workspace) -> list[BaseTool]:
    def resolve(path: str) -> Path:
        """Map an agent path (`/` = workspace root) to disk, refusing anything outside the workspace."""
        target = (workspace.root / path.lstrip("/\\")).resolve()
        if not workspace.contains(target):
            raise ValueError("path is outside the workspace")
        if not target.is_file():
            raise ValueError(f"no such file: {path}")
        return target

    @tool
    def read_table(path: str, max_rows: int = 20) -> str:
        """Show the columns, row count and first rows of a .csv or .xlsx file in the workspace.

        Call this before analysing a table so you use its real column names.
        """
        try:
            rows = _load(resolve(path))
        except ValueError as error:
            return f"Error: {error}."
        if not rows:
            return "The table is empty."
        columns = list(rows[0])
        preview = "\n".join(" | ".join(str(row.get(column, "")) for column in columns) for row in rows[: max(1, max_rows)])
        return f"columns: {', '.join(columns)}\nrows: {len(rows)}\n\n{' | '.join(columns)}\n{preview}"

    @tool
    def aggregate_table(
        path: str,
        value_column: str,
        operation: Literal["sum", "avg", "min", "max", "count"] = "sum",
        group_by: str | None = None,
    ) -> str:
        """Compute sum / avg / min / max / count of a numeric column, optionally per group.

        Use this for every total you report from a table. Example:
        aggregate_table("/sales.csv", value_column="amount", operation="sum", group_by="city")
        """
        try:
            rows = _load(resolve(path))
        except ValueError as error:
            return f"Error: {error}."
        if rows and value_column not in rows[0]:
            return f"Error: no column {value_column!r}. Columns are: {', '.join(rows[0])}."
        if group_by and rows and group_by not in rows[0]:
            return f"Error: no column {group_by!r}. Columns are: {', '.join(rows[0])}."

        groups: dict[str, list[float]] = defaultdict(list)
        skipped = 0
        for row in rows:
            number = _number(row.get(value_column))
            if number is None:
                skipped += 1
                continue
            groups[str(row.get(group_by)) if group_by else "all"].append(number)
        if not groups:
            return f"Error: column {value_column!r} has no numeric values."

        lines = [f"{key}: {round(_OPERATIONS[operation](values), 4)}" for key, values in sorted(groups.items())]
        note = f"\n({skipped} rows without a number in {value_column!r} were skipped)" if skipped else ""
        return f"{operation} of {value_column}" + (f" by {group_by}" if group_by else "") + ":\n" + "\n".join(lines) + note

    return [read_table, aggregate_table]
