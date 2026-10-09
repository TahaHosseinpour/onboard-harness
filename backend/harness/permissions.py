"""Permissions: decided before a tool runs, from rules the user can read.

The workspace's `.harness/rules.yaml` gives one of three answers for every
action - allow, ask, deny - which is exactly what the UI shows:

    files:                      # first matching rule wins; no match means allow
      - paths: ["/finance/**"]
        operations: [write]
        access: deny
    tools:
      execute: ask

`Policy.decide(tool, args)` is the single place that answer is computed. Two
things enforce it, both before the tool runs:

- "ask"  -> the run pauses for a human (`interrupt_on()`, used by deepagents'
            human-in-the-loop step; see `runner.py` for how it resumes)
- "deny" -> the call is refused (`hooks/permission.py`)

The run's mode then tightens or loosens the rules:

    read_only  no writes, no shell, nothing that needs approval
    ask        the rules as written
    auto       "ask" becomes "allow"; "deny" stays "deny"

What actually ran is recorded afterwards by `hooks/audit.py`.

Note: deepagents has its own `permissions=` argument, but in 0.7 it cannot be
combined with a backend that can run commands. Deciding here keeps one rule
set for files and shell alike.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import yaml
from wcmatch import glob

from .config import PermissionMode

Access = Literal["allow", "ask", "deny"]

WRITE_TOOLS = frozenset({"write_file", "edit_file", "delete"})
READ_TOOLS = frozenset({"read_file", "ls", "glob", "grep"})
_GLOB_FLAGS = glob.GLOBSTAR | glob.BRACE | glob.DOTGLOB


@dataclass(frozen=True)
class FileRule:
    paths: tuple[str, ...]
    operations: tuple[str, ...]
    access: Access

    def matches(self, operation: str, path: str) -> bool:
        # A folder matches a rule about its contents: `/finance` falls under `/finance/**`.
        candidates = (path, path.rstrip("/") + "/")
        return operation in self.operations and any(glob.globmatch(c, list(self.paths), flags=_GLOB_FLAGS) for c in candidates)


@dataclass(frozen=True)
class Policy:
    """The rules for one run, with the mode applied."""

    mode: PermissionMode
    file_rules: tuple[FileRule, ...] = ()
    tool_rules: dict[str, Access] = field(default_factory=dict)

    def decide(self, tool: str, args: dict[str, Any]) -> Access:
        """allow, ask or deny for this exact call."""
        if tool in WRITE_TOOLS or tool in READ_TOOLS:
            operation = "write" if tool in WRITE_TOOLS else "read"
            if operation == "write" and self.mode == "read_only":
                return "deny"
            path = args.get("file_path") or args.get("path") or "/"
            access = next((rule.access for rule in self.file_rules if rule.matches(operation, path)), "allow")
        else:
            access = self.tool_rules.get(tool, "allow")
            if self.mode == "read_only" and (tool == "execute" or access == "ask"):
                return "deny"
        return "allow" if (access == "ask" and self.mode == "auto") else access

    @property
    def allow_shell(self) -> bool:
        return self.decide("execute", {}) != "deny"

    def interrupt_on(self) -> dict[str, Any]:
        """Which tool calls pause for a human: any call the policy answers with "ask".

        The human may approve, change the arguments, or refuse with a reason.
        """
        guarded = WRITE_TOOLS | READ_TOOLS | set(self.tool_rules)
        return {
            name: {
                "allowed_decisions": ["approve", "edit", "reject"],
                "when": lambda request: self.decide(request.tool_call["name"], request.tool_call.get("args", {})) == "ask",
            }
            for name in guarded
        }


def load_rules(rules_file: Path) -> dict[str, Any]:
    if not rules_file.exists():
        return {"files": [], "tools": {}}
    data = yaml.safe_load(rules_file.read_text(encoding="utf-8")) or {}
    return {"files": data.get("files") or [], "tools": data.get("tools") or {}}


def build_policy(rules: dict[str, Any], mode: PermissionMode) -> Policy:
    file_rules = tuple(
        FileRule(paths=tuple(rule["paths"]), operations=tuple(rule.get("operations", ["read", "write"])), access=rule.get("access", "allow"))
        for rule in rules["files"]
    )
    return Policy(mode=mode, file_rules=file_rules, tool_rules=dict(rules["tools"]))
