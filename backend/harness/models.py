"""Models: turn a user-defined `ModelSpec` into a chat model.

The harness is self-hosted, so nothing is hard-coded: each installation brings
its own endpoint, key and model name. Two wire formats cover almost everything:

- Anthropic's API (detected from the address)
- the OpenAI-compatible chat API, which OpenAI, OpenRouter, Ollama, vLLM and
  most gateways speak

`demo://` is a scripted stand-in that needs no key. It exists so the app and the
test suite can run a whole task end to end without calling a real model.
"""

from __future__ import annotations

from langchain_core.language_models.chat_models import BaseChatModel

from .config import ModelSpec

DEMO_SCHEME = "demo://"


def build_chat_model(spec: ModelSpec) -> BaseChatModel:
    if spec.base_url.startswith(DEMO_SCHEME):
        from .demo_model import demo_model

        return demo_model()

    if "anthropic" in spec.base_url:
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=spec.model, api_key=spec.api_key, base_url=spec.base_url, max_retries=0)

    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=spec.model,
        # Local servers such as Ollama ignore the key but the client insists on one.
        api_key=spec.api_key or "not-needed",
        base_url=spec.base_url,
        stream_usage=True,
        disable_streaming=not spec.streaming,
        # Retries are owned by the durability layer, so they are counted and visible.
        max_retries=0,
    )
