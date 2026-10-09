"""One shared answer to "did that tool call fail?"."""

from __future__ import annotations

from typing import Any

from langchain_core.messages import ToolMessage


def tool_failed(result: Any) -> bool:
    """True for a tool error, whether it was raised or returned as an `Error:` message."""
    if not isinstance(result, ToolMessage):
        return False
    text = result.content if isinstance(result.content, str) else ""
    return result.status == "error" or text.lstrip().startswith(("Error:", "Refused:"))
