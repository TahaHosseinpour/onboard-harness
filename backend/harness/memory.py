"""Memory: what should still be known in the next task.

Memory is a file, `.harness/memory/AGENTS.md`. It is loaded into every run, the
agent can add to it with the ordinary file tools, and the user can open and
edit it like any other file - nothing is remembered where the user cannot see it.

Memory vs. skills: memory is short and always present ("amounts are in Toman");
a skill is long and fetched on demand ("how to write the weekly report").
"""

from __future__ import annotations

from .workspace import Workspace

MEMORY_FILE = "AGENTS.md"


def memory_sources(workspace: Workspace) -> list[str]:
    """Memory files as agent paths. Missing files are skipped by deepagents."""
    return [workspace.virtual(workspace.memory_dir / MEMORY_FILE)]


def read_memory(workspace: Workspace) -> str:
    file = workspace.memory_dir / MEMORY_FILE
    return file.read_text(encoding="utf-8") if file.exists() else ""


def write_memory(workspace: Workspace, text: str) -> None:
    workspace.memory_dir.mkdir(parents=True, exist_ok=True)
    (workspace.memory_dir / MEMORY_FILE).write_text(text, encoding="utf-8")
