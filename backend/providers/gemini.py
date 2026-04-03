"""Google Gemini AI provider."""

import json
from typing import AsyncIterator

import httpx

from backend.config import settings
from .base import BaseProvider, ProviderResponse, ToolDefinition


class GeminiProvider(BaseProvider):
    """Google Gemini provider using the generative AI API."""

    provider_name = "gemini"
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self, model: str | None = None, api_key: str | None = None):
        self.model = model or "gemini-2.0-flash"
        self.api_key = api_key or settings.gemini_api_key
        self.client = httpx.AsyncClient(timeout=120.0)

    def _convert_messages(self, messages: list[dict]) -> tuple[str | None, list[dict]]:
        """Convert OpenAI-style messages to Gemini format."""
        system = None
        contents = []
        for msg in messages:
            role = msg["role"]
            if role == "system":
                system = msg["content"]
            else:
                gemini_role = "user" if role == "user" else "model"
                contents.append({
                    "role": gemini_role,
                    "parts": [{"text": msg["content"]}],
                })
        return system, contents

    async def generate(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> ProviderResponse:
        system, contents = self._convert_messages(messages)
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}

        url = f"{self.BASE_URL}/models/{self.model}:generateContent?key={self.api_key}"
        resp = await self.client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return ProviderResponse(
            content=text,
            model=self.model,
            provider=self.provider_name,
            usage=data.get("usageMetadata", {}),
            raw=data,
        )

    async def stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> AsyncIterator[str]:
        system, contents = self._convert_messages(messages)
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}

        url = f"{self.BASE_URL}/models/{self.model}:streamGenerateContent?alt=sse&key={self.api_key}"
        async with self.client.stream("POST", url, json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])
                        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                        for part in parts:
                            if text := part.get("text"):
                                yield text
                    except (json.JSONDecodeError, IndexError, KeyError):
                        continue

    async def tool_call(
        self,
        messages: list[dict],
        tools: list[ToolDefinition],
        temperature: float = 0.3,
        **kwargs,
    ) -> ProviderResponse:
        system, contents = self._convert_messages(messages)
        tool_defs = {
            "functionDeclarations": [
                {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                }
                for t in tools
            ]
        }
        payload = {
            "contents": contents,
            "tools": [tool_defs],
            "generationConfig": {"temperature": temperature},
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}

        url = f"{self.BASE_URL}/models/{self.model}:generateContent?key={self.api_key}"
        resp = await self.client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        parts = data["candidates"][0]["content"]["parts"]
        tool_calls = []
        content = ""
        for part in parts:
            if "functionCall" in part:
                tool_calls.append({
                    "function": {
                        "name": part["functionCall"]["name"],
                        "arguments": json.dumps(part["functionCall"].get("args", {})),
                    }
                })
            elif "text" in part:
                content += part["text"]

        return ProviderResponse(
            content=content,
            model=self.model,
            provider=self.provider_name,
            usage=data.get("usageMetadata", {}),
            tool_calls=tool_calls,
            raw=data,
        )
