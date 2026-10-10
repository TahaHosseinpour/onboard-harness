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

One file is outside all of that: the rules file itself. An agent may never
change it without the user saying yes, in any mode and whatever the rules say -
otherwise a run in "auto" could simply rewrite its own limits.

What actually ran is recorded afterwards by `hooks/audit.py`.

Note: deepagents has its own `permissions=` argument, but in 0.7 it cannot be
combined with a backend that can run commands. Deciding here keeps one rule
set for files and shell alike.
"""

from __future__ import annotations

import posixpath
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal, get_args

import yaml
from wcmatch import glob

from .config import PermissionMode
from .workspace import DEFAULT_RULES, HARNESS_DIR

Access = Literal["allow", "ask", "deny"]

WRITE_TOOLS = frozenset({"write_file", "edit_file", "delete", "add_table_rows", "write_table", "write_document", "extract_archive"})
READ_TOOLS = frozenset({"read_file", "ls", "glob", "grep", "read_table", "aggregate_table", "read_document", "list_archive"})
# Windows and macOS treat `/Finance` and `/finance` as one folder, so the rules must too.
_GLOB_FLAGS = glob.GLOBSTAR | glob.BRACE | glob.DOTGLOB | (0 if sys.platform == "linux" else glob.IGNORECASE)
_RULES_PATH = f"/{HARNESS_DIR}/rules.yaml"

# What a tool is held to when the rules file does not mention it. Reaching the
# internet is "ask" even in a workspace whose rules were written before the
# browser existed: an address can carry data out.
DEFAULT_TOOL_ACCESS: dict[str, "Access"] = {"browse_page": "ask"}


def target_path(tool: str, args: dict[str, Any]) -> str:
    """The file or folder a tool call reads or changes, as the rules see it."""
    if tool == "extract_archive":
        # Unpacking writes to the destination; left out, that is a folder named after the archive.
        return normalize(args.get("destination") or posixpath.splitext(str(args.get("path") or "/"))[0])
    return normalize(args.get("file_path") or args.get("path"))


def normalize(path: Any) -> str:
    """One spelling per file, so `/a/../finance/x`, `finance/x` and `/finance/x` meet the same rule."""
    return posixpath.normpath("/" + str(path or "/").replace("\\", "/").lstrip("/"))


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
            path = target_path(tool, args)
            access = next((rule.access for rule in self.file_rules if rule.matches(operation, path)), "allow")
            if operation == "write" and path.casefold() == _RULES_PATH:
                return "deny" if access == "deny" else "ask"  # never "allow", not even in auto mode
        else:
            access = self.tool_rules.get(tool, DEFAULT_TOOL_ACCESS.get(tool, "allow"))
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
        guarded = WRITE_TOOLS | READ_TOOLS | set(self.tool_rules) | set(DEFAULT_TOOL_ACCESS)
        return {
            name: {
                "allowed_decisions": ["approve", "edit", "reject"],
                "when": lambda request: self.decide(request.tool_call["name"], request.tool_call.get("args", {})) == "ask",
            }
            for name in guarded
        }


def parse_rules(text: str) -> dict[str, Any]:
    """Rules from YAML text. Raises ValueError when they are not rules: a broken file never means "no rules"."""
    try:
        data = yaml.safe_load(text) or {}
    except yaml.YAMLError as error:
        raise ValueError(f"not valid YAML: {error}") from error
    if not isinstance(data, dict):
        raise ValueError("expected `files:` and `tools:` at the top level")
    rules = {"files": data.get("files") or [], "tools": data.get("tools") or {}}
    build_policy(rules, "ask")
    return rules


def load_rules(rules_file: Path) -> dict[str, Any]:
    """The workspace's rules. A missing file means the cautious defaults, not "everything is allowed"."""
    return parse_rules(rules_file.read_text(encoding="utf-8") if rules_file.exists() else DEFAULT_RULES)


def build_policy(rules: dict[str, Any], mode: PermissionMode) -> Policy:
    levels = get_args(Access)
    if not isinstance(rules["files"], list) or not isinstance(rules["tools"], dict):
        raise ValueError("`files` must be a list and `tools` a mapping")
    file_rules = []
    for rule in rules["files"]:
        if not isinstance(rule, dict) or not isinstance(rule.get("paths"), list) or not rule["paths"]:
            raise ValueError(f"a file rule needs a list of `paths`: {rule!r}")
        operations = rule.get("operations", ["read", "write"])
        access = rule.get("access", "allow")
        if access not in levels or not isinstance(operations, list) or not set(operations) <= {"read", "write"}:
            raise ValueError(f"a file rule has `operations` of read/write and `access` of allow/ask/deny: {rule!r}")
        file_rules.append(FileRule(paths=tuple(str(path) for path in rule["paths"]), operations=tuple(operations), access=access))
    for tool, access in rules["tools"].items():
        if access not in levels:
            raise ValueError(f"tool `{tool}` must be allow, ask or deny, not {access!r}")
    return Policy(mode=mode, file_rules=tuple(file_rules), tool_rules=dict(rules["tools"]))
