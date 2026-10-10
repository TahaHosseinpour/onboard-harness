"""Skills: how to do one kind of job, loaded only when that job comes up.

A skill is a folder under `.harness/skills/` with a `SKILL.md`: a name, a
one-line description, then the instructions. The agent always sees the names
and descriptions (cheap), and reads the full text only when a task matches
(progressive disclosure). That keeps the prompt small however many skills exist.

deepagents does the loading; this module only says where to look and lists
what is there for the UI.
"""

from __future__ import annotations

from dataclasses import dataclass

import yaml

from .workspace import Workspace


def skill_sources(workspace: Workspace) -> list[str]:
    """Skill folders as agent paths (`/` = workspace root)."""
    return [workspace.virtual(workspace.skills_dir) + "/"]


@dataclass(frozen=True)
class Skill:
    id: str
    name: str
    description: str
    body: str


def list_skills(workspace: Workspace) -> list[Skill]:
    skills = []
    for file in sorted(workspace.skills_dir.glob("*/SKILL.md")):
        try:
            text = file.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        meta, body = {}, text
        if text.startswith("---") and text.count("---") >= 2:
            _, header, body = text.split("---", 2)
            try:
                meta = yaml.safe_load(header) or {}
            except yaml.YAMLError:
                meta = {}
            if not isinstance(meta, dict):
                meta = {}
        skills.append(Skill(id=file.parent.name, name=str(meta.get("name") or file.parent.name), description=str(meta.get("description") or ""), body=body.strip()))
    return skills
