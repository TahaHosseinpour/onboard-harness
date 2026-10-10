"""Request bodies. Responses are plain dicts read straight from the harness's files."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from harness.workspace import THREAD_ID


class OpenWorkspace(BaseModel):
    path: str = Field(min_length=1)
    # What the user calls this workspace. Left out, the folder's name is shown.
    name: str | None = Field(default=None, max_length=60)


class WorkspaceName(BaseModel):
    name: str = Field(min_length=1, max_length=60)


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

    @field_validator("base_url")
    @classmethod
    def _a_web_address(cls, value: str) -> str:
        # The key is sent to this address, so it has to be one: not a file path, not another scheme.
        value = value.strip()
        if not value.startswith(("https://", "http://", "demo://")):
            raise ValueError("Base URL must start with https:// or http://")
        return value


class StartRun(BaseModel):
    prompt: str = Field(min_length=1)
    # Present to continue an existing conversation; absent to start a new task.
    thread_id: str | None = Field(default=None, pattern=THREAD_ID)
    model_id: str | None = None
    agent_id: str | None = None
    mode: Literal["read_only", "ask", "auto"] = "ask"
    rubric: str | None = None


class RunTitle(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class Decisions(BaseModel):
    # One per pending action, in order: {"type": "approve" | "edit" | "reject", ...}
    decisions: list[dict[str, Any]]


class FileBody(BaseModel):
    path: str
    content: str


class MediaPath(BaseModel):
    path: str


class TextBody(BaseModel):
    content: str


class FileRule(BaseModel):
    paths: list[str]
    operations: list[Literal["read", "write"]] = ["write"]
    access: Literal["allow", "ask", "deny"] = "ask"


class RulesBody(BaseModel):
    # Either the raw YAML text...
    content: str | None = None
    # ...or the structured form the rules screen edits.
    files: list[FileRule] | None = None
    tools: dict[str, Literal["allow", "ask", "deny"]] | None = None
