"""The core: one function that assembles the agent.

Everything the harness can do is decided here, in one call to deepagents'
`create_deep_agent`. Each argument comes from the module that owns that
concern, so this file reads as the table of contents of the whole harness:

    model         models.py        which model answers (the user's choice per task)
    system_prompt prompts.py       the fixed instructions
    tools         tools/           the few custom tools
    backend       sandbox.py       the workspace files and the guarded shell
    interrupt_on  permissions.py   allow / ask / deny from rules.yaml; "ask" pauses for a human
    skills        skills.py        how-to knowledge, loaded on demand
    memory        memory.py        what is remembered between tasks
    subagents     subagents.py     other agent profiles, for independent work
    checkpointer  durability.py    saved state: pause, resume, survive restarts
    middleware    hooks/ + durability.py   planning, retries, limits, audit, verification

What deepagents adds by itself, with no code here: the agent loop, the file
tools, moving large tool results into files, summarising a long conversation,
and prompt caching for providers that support it.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from deepagents import RubricMiddleware, create_deep_agent
from langchain.agents.middleware import TodoListMiddleware
from langchain_core.tools import BaseTool
from langgraph.checkpoint.base import BaseCheckpointSaver

from .config import RunRequest
from .durability import build_resilience
from .hooks import build_hooks, build_subagent_hooks
from .memory import memory_sources
from .models import build_chat_model
from .permissions import build_policy, load_rules
from .prompts import PLANNING_PROMPT, PLANNING_TOOL_DESCRIPTION, SYSTEM_PROMPT
from .sandbox import build_backend
from .skills import skill_sources
from .subagents import build_subagents, list_agents
from .tools import build_tools
from .tracker import RunTracker
from .workspace import Workspace


def build_agent(workspace: Workspace, request: RunRequest, tracker: RunTracker, checkpointer: BaseCheckpointSaver, extra_tools: Sequence[BaseTool] = ()) -> Any:
    """Assemble the agent for one run. Cheap enough to do on every run, so settings never go stale."""
    model = build_chat_model(request.model)
    fallback = build_chat_model(request.fallback_model) if request.fallback_model else None
    policy = build_policy(load_rules(workspace.rules_file), request.mode)

    # Tools the embedding app registered (connectors, MCP) join the built-in ones and obey the same rules.
    all_tools = build_tools(workspace) | {tool.name: tool for tool in extra_tools}
    profiles = list_agents(workspace)
    lead = next((profile for profile in profiles if profile.id == request.agent_id), None)
    # The lead uses its own tool list; without a lead the coordinator may use every tool.
    tool_names = lead.tools if lead else list(all_tools)
    tools = [all_tools[name] for name in tool_names if name in all_tools]
    skills = skill_sources(workspace)

    middleware = [
        # planning: the `write_todos` tool and the plan in state, with our own wording of when to plan
        TodoListMiddleware(system_prompt=PLANNING_PROMPT, tool_description=PLANNING_TOOL_DESCRIPTION),
        *build_resilience(fallback),  # retry and fallback
        *build_hooks(tracker, policy, workspace),  # limits, cost, permission, breaker, audit, file freshness, verification
    ]
    if request.rubric:
        middleware.append(RubricMiddleware(model=model))  # grade the answer before finishing

    return create_deep_agent(
        name="harness",
        model=model,
        system_prompt=SYSTEM_PROMPT + (f"\n## Your role in this task\n{lead.prompt}" if lead else ""),
        tools=tools,
        backend=build_backend(workspace, allow_shell=policy.allow_shell, on_stop=tracker.on_stop),
        interrupt_on=policy.interrupt_on(),
        skills=skills,
        memory=memory_sources(workspace),
        subagents=build_subagents(profiles, all_tools, skills, lead_id=lead.id if lead else None, hooks_for=lambda name: build_subagent_hooks(tracker, policy, workspace, name)),
        checkpointer=checkpointer,
        middleware=middleware,
    )
