"""Tools: the agent's ways of acting beyond reading and writing plain text files.

File tools (`ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`),
delegation (`task`) and the shell (`execute`) come from deepagents. This package
adds what those cannot do, one module per kind of thing:

    calc.py       exact arithmetic
    tables.py     Excel / CSV: read, total, add rows, create
    documents.py  Word, PowerPoint, PDF: read as text; Word, PowerPoint: create
    archives.py   .zip / .rar / .7z / .tar: list and unpack
    browser.py    open one public web page and read it

Keep this list short. Every tool is another decision the model has to make, and
another thing to permission, test and explain. A tool that changes files must
be listed in `permissions.WRITE_TOOLS`, so the file rules apply to it.
"""

from __future__ import annotations

from langchain_core.tools import BaseTool

from ..workspace import Workspace
from .archives import make_archive_tools
from .browser import make_browser_tools
from .calc import calculate
from .documents import make_document_tools
from .tables import make_table_tools


def build_tools(workspace: Workspace) -> dict[str, BaseTool]:
    """All custom tools, by name. Agent profiles pick from these by name."""
    tools: list[BaseTool] = [calculate, *make_table_tools(workspace), *make_document_tools(workspace), *make_archive_tools(workspace), *make_browser_tools(workspace)]
    return {tool.name: tool for tool in tools}
