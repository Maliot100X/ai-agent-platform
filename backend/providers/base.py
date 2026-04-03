"""Base provider interface that all AI providers must implement."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Optional


@dataclass
class ProviderResponse:
    """Standardized response from any AI provider."""
    content: str
    model: str
    provider: str
    usage: dict = field(default_factory=dict)
    tool_calls: list = field(default_factory=list)
    raw: Optional[dict] = None


@dataclass
class ToolDefinition:
    """Tool definition for function calling."""
    name: str
    description: str
    parameters: dict


class BaseProvider(ABC):
    """Abstract base class for all AI providers.

    Every provider must implement generate(), stream(), and tool_call().
    """

    provider_name: str = "base"

    @abstractmethod
    async def generate(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> ProviderResponse:
        """Generate a completion from the model."""
        ...

    @abstractmethod
    async def stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs,
    ) -> AsyncIterator[str]:
        """Stream a completion from the model."""
        ...

    @abstractmethod
    async def tool_call(
        self,
        messages: list[dict],
        tools: list[ToolDefinition],
        temperature: float = 0.3,
        **kwargs,
    ) -> ProviderResponse:
        """Generate a completion with tool/function calling."""
        ...
