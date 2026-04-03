"""Fireworks AI provider using OpenAI-compatible API."""

import json
from typing import AsyncIterator

import httpx

from backend.config import settings
from .base import BaseProvider, ProviderResponse, ToolDefinition


class FireworksProvider(BaseProvider):
    """Fireworks AI provider.

    Supports both OpenAI-compatible and Anthropic-compatible endpoints.
    Default model: accounts/fireworks/routers/kimi-k2p5-turbo
    """

    provider_name = "fireworks"
    OPENAI_BASE = "https://api.fireworks.ai/inference/v1"
    ANTHROPIC_BASE = "https://api.fireworks.ai/inference"

    def __init__(self, model: str | None = None, api_key: str | None = None):
        self.model = model or settings.model_name
        self.api_key = api_key or settings.fireworks_api_key
        self.client = httpx.AsyncClient(
            base_url=self.OPENAI_BASE,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=120.0,
        )

    async def generate(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> ProviderResponse:
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs,
        }
        resp = await self.client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        choice = data["choices"][0]
        return ProviderResponse(
            content=choice["message"]["content"] or "",
            model=data.get("model", self.model),
            provider=self.provider_name,
            usage=data.get("usage", {}),
            tool_calls=choice["message"].get("tool_calls", []),
            raw=data,
        )

    async def stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
            **kwargs,
        }
        async with self.client.stream(
            "POST", "/chat/completions", json=payload
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]
                    if chunk.strip() == "[DONE]":
                        break
                    try:
                        data = json.loads(chunk)
                        delta = data["choices"][0].get("delta", {})
                        if content := delta.get("content"):
                            yield content
                    except json.JSONDecodeError:
                        continue

    async def tool_call(
        self,
        messages: list[dict],
        tools: list[ToolDefinition],
        temperature: float = 0.3,
        **kwargs,
    ) -> ProviderResponse:
        tool_defs = [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                },
            }
            for t in tools
        ]
        payload = {
            "model": self.model,
            "messages": messages,
            "tools": tool_defs,
            "tool_choice": "auto",
            "temperature": temperature,
            **kwargs,
        }
        resp = await self.client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        choice = data["choices"][0]
        return ProviderResponse(
            content=choice["message"].get("content", "") or "",
            model=data.get("model", self.model),
            provider=self.provider_name,
            usage=data.get("usage", {}),
            tool_calls=choice["message"].get("tool_calls", []),
            raw=data,
        )
