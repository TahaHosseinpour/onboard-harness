"""The workspace: one folder on disk that holds everything.

Like a repository, a workspace *is* its folder. The user's documents live at the
top; everything the harness keeps for itself lives under `.harness/`:

    <workspace>/
      ...user files (Word, Excel, images, reports)
      .harness/
        agents/        one YAML per agent profile
        skills/        one folder per skill, each with a SKILL.md
        memory/        AGENTS.md (always loaded) and other notes
        rules.yaml     permissions: allow / ask / deny
        runs/          one folder per task: trace, plan, summary
        artifacts/     large tool results moved out of the conversation
        state.db       checkpoints (lets a task resume after a restart)

Agents see the workspace as a virtual root: `/` is the workspace folder and
they cannot reach above it through the file tools.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

HARNESS_DIR = ".harness"

_DEFAULT_RULES = """\
# What agents may do in this workspace.
# access: allow (just do it) | ask (pause for approval) | deny (never)
# The first matching rule wins.
files:
  - paths: ["/.harness/runs/**", "/.harness/artifacts/**"]
    operations: [write]
    access: allow
  - paths: ["/.harness/**"]
    operations: [write]
    access: ask
  - paths: ["/**"]
    operations: [write]
    access: ask
tools:
  execute: ask
"""

_DEFAULT_MEMORY = """\
# Workspace memory

Facts worth remembering across tasks. Keep each one short.

- Amounts are written in Toman with thousands separators.
- The work week starts on Saturday.
"""

_DEFAULT_AGENT = """\
name: analyst
title: تحلیلگر
description: Reads tables and reports in the workspace, calculates, and writes findings to a file.
prompt: |
  You analyse business data. State numbers with their source file, and use the
  calculation tools for every figure instead of doing arithmetic in your head.
tools: [calculate, read_table, aggregate_table]
"""

_DEFAULT_SKILL = """\
---
name: weekly-report
description: Write a weekly report from a sales table - summary first, then the numbers, then suggested actions.
---

# Weekly report

## When to use
The user asks for a weekly or periodic report from tabular data.

## Steps
1. Read the table with `read_table`; never guess its columns.
2. Compute totals and changes with `aggregate_table` and `calculate`.
3. Write the report to a Markdown file in the workspace:
   a three-line management summary, the key numbers with their source, then suggested actions.
4. Tell the user where the file is.
"""


@dataclass(frozen=True)
class Workspace:
    root: Path

    @classmethod
    def at(cls, path: str | Path) -> "Workspace":
        return cls(Path(path).expanduser().resolve())

    # ── locations ──
    @property
    def harness(self) -> Path:
        return self.root / HARNESS_DIR

    @property
    def agents_dir(self) -> Path:
        return self.harness / "agents"

    @property
    def skills_dir(self) -> Path:
        return self.harness / "skills"

    @property
    def memory_dir(self) -> Path:
        return self.harness / "memory"

    @property
    def rules_file(self) -> Path:
        return self.harness / "rules.yaml"

    @property
    def runs_dir(self) -> Path:
        return self.harness / "runs"

    @property
    def state_db(self) -> Path:
        return self.harness / "state.db"

    def run_dir(self, thread_id: str) -> Path:
        return self.runs_dir / thread_id

    def virtual(self, path: Path) -> str:
        """The path an agent uses for a real file: `/` is the workspace root."""
        return "/" + path.resolve().relative_to(self.root).as_posix()

    def contains(self, path: Path) -> bool:
        try:
            path.resolve().relative_to(self.root)
        except ValueError:
            return False
        return True

    # ── creation ──
    def scaffold(self) -> "Workspace":
        """Create `.harness/` with working defaults. Existing files are never overwritten."""
        for folder in (self.agents_dir, self.skills_dir, self.memory_dir, self.runs_dir, self.harness / "artifacts"):
            folder.mkdir(parents=True, exist_ok=True)
        defaults = {
            self.rules_file: _DEFAULT_RULES,
            self.memory_dir / "AGENTS.md": _DEFAULT_MEMORY,
            self.agents_dir / "analyst.yaml": _DEFAULT_AGENT,
            self.skills_dir / "weekly-report" / "SKILL.md": _DEFAULT_SKILL,
        }
        for file, content in defaults.items():
            if not file.exists():
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(content, encoding="utf-8")
        return self
