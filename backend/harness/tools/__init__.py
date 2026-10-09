"""Tools: the agent's few ways of acting beyond reading and writing files.

File tools (`ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`),
delegation (`task`) and the shell (`execute`) come from deepagents. This package
adds only what those cannot do reliably: exact arithmetic and exact table maths.

Keep this list short. Every tool is another decision the model has to make, and
another thing to permission, test and explain.
"""

from __future__ import annotations

from langchain_core.tools import BaseTool

from ..workspace import Workspace
from .calc import calculate
from .tables import make_table_tools


def build_tools(workspace: Workspace) -> dict[str, BaseTool]:
    """All custom tools, by name. Agent profiles pick from these by name."""
    tools: list[BaseTool] = [calculate, *make_table_tools(workspace)]
    return {tool.name: tool for tool in tools}
