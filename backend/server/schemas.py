"""Request bodies. Responses are plain dicts read straight from the harness's files."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class OpenWorkspace(BaseModel):
    path: str


class ModelIn(BaseModel):
    id: str | None = None
    name: str = ""
    base_url: str
    model: str
    # Sent only when the user types a new key; omitted means "keep the stored one".
    api_key: str | None = None
    input_price: float = 0.0
    output_price: float = 0.0
    streaming: bool = True


class StartRun(BaseModel):
    prompt: str = Field(min_length=1)
    # Present to continue an existing conversation; absent to start a new task.
    thread_id: str | None = None
    model_id: str | None = None
    agent_id: str | None = None
    mode: Literal["read_only", "ask", "auto"] = "ask"
    rubric: str | None = None
    user_name: str = ""


class Decisions(BaseModel):
    # One per pending action, in order: {"type": "approve" | "edit" | "reject", ...}
    decisions: list[dict[str, Any]]


class FileBody(BaseModel):
    path: str
    content: str


class TextBody(BaseModel):
    content: str
