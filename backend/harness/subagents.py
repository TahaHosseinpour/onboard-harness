"""Multi-agent: agent profiles, and handing independent work to one of them.

Each YAML file under `.harness/agents/` is a profile: a name, what it is for,
its instructions and the tools it may use. A run has one lead agent; the other
profiles are offered to it as sub-agents through deepagents' `task` tool.

A sub-agent starts with an empty conversation and returns one report. That
isolation is the point (its reading does not fill the lead's context) and the
cost (it knows only what the instruction says). So delegation is for work that
is genuinely independent; the system prompt tells the lead exactly that.

Sub-agents get no `task` tool of their own, so delegation is one level deep.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import yaml
from langchain_core.tools import BaseTool

from .workspace import Workspace

GENERAL_PURPOSE = "general-purpose"


@dataclass(frozen=True)
class AgentProfile:
    id: str
    title: str
    description: str
    prompt: str
    tools: list[str] = field(default_factory=list)


def list_agents(workspace: Workspace) -> list[AgentProfile]:
    profiles = []
    for file in sorted(workspace.agents_dir.glob("*.yaml")):
        try:
            data = yaml.safe_load(file.read_text(encoding="utf-8")) or {}
        except (yaml.YAMLError, OSError, UnicodeDecodeError):
            continue  # a half-edited profile is skipped, not fatal to every run
        if not isinstance(data, dict):
            continue
        profiles.append(
            AgentProfile(
                id=str(data.get("name") or file.stem),
                title=str(data.get("title") or file.stem),
                description=str(data.get("description") or ""),
                prompt=str(data.get("prompt") or ""),
                tools=[str(name) for name in data.get("tools") or []] if isinstance(data.get("tools"), list) else [],
            )
        )
    return profiles


def build_subagents(
    profiles: list[AgentProfile],
    tools: dict[str, BaseTool],
    skills: list[str],
    lead_id: str | None,
    hooks_for: Callable[[str], list[Any]],
) -> list[dict[str, Any]]:
    """Every profile except the lead, as a deepagents sub-agent spec.

    `hooks_for(name)` supplies the middleware each sub-agent must carry (rules,
    audit, ceilings); deepagents does not pass the lead's own down. For the
    same reason a `general-purpose` sub-agent is defined here: deepagents would
    otherwise add its own, which would run outside those hooks.
    """
    specs = [
        {
            "name": profile.id,
            "description": profile.description,
            "system_prompt": profile.prompt,
            "tools": [tools[name] for name in profile.tools if name in tools],
            # Sub-agents do not inherit the lead's skills; they are passed explicitly.
            "skills": skills,
            "middleware": hooks_for(profile.id),
        }
        for profile in profiles
        if profile.id != lead_id
    ]
    specs.append(
        {
            "name": GENERAL_PURPOSE,
            "description": "A general helper for a self-contained piece of work that needs many steps or a lot of reading. It starts with no context: give it complete instructions.",
            "system_prompt": "Do exactly the task you are given, using the workspace files. Finish with a short report of what you found or did, including file paths.",
            "tools": list(tools.values()),
            "skills": skills,
            "middleware": hooks_for(GENERAL_PURPOSE),
        }
    )
    return specs
