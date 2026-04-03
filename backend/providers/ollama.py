"""Ollama local LLM provider."""

import json
from typing import AsyncIterator

import httpx

from backend.config import settings
from .base import BaseProvider, ProviderResponse, ToolDefinition


class OllamaProvider(BaseProvider):
    """Ollama provider for local model inference."""

    provider_name = "ollama"

    def __init__(self, model: str | None = None, base_url: str | None = None):
        self.model = model or "llama3.1"
        self.base_url = base_url or settings.ollama_base_url
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=300.0,
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
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        resp = await self.client.post("/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return ProviderResponse(
            content=data["message"]["content"],
            model=self.model,
            provider=self.provider_name,
            usage={
                "prompt_tokens": data.get("prompt_eval_count", 0),
                "completion_tokens": data.get("eval_count", 0),
            },
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
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        async with self.client.stream("POST", "/api/chat", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.strip():
                    try:
                        data = json.loads(line)
                        if content := data.get("message", {}).get("content"):
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
            "stream": False,
            "options": {"temperature": temperature},
        }
        resp = await self.client.post("/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()
        msg = data["message"]
        tool_calls = []
        for tc in msg.get("tool_calls", []):
            tool_calls.append({
                "function": {
                    "name": tc["function"]["name"],
                    "arguments": json.dumps(tc["function"]["arguments"]),
                }
            })
        return ProviderResponse(
            content=msg.get("content", ""),
            model=self.model,
            provider=self.provider_name,
            tool_calls=tool_calls,
            raw=data,
        )
