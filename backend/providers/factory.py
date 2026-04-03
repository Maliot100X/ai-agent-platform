"""Provider factory - returns the correct provider based on configuration."""

from backend.config import settings
from .base import BaseProvider
from .fireworks import FireworksProvider
from .gemini import GeminiProvider
from .ollama import OllamaProvider
from .openai_compat import OpenAICompatProvider

_PROVIDERS: dict[str, type[BaseProvider]] = {
    "fireworks": FireworksProvider,
    "gemini": GeminiProvider,
    "ollama": OllamaProvider,
    "openai": OpenAICompatProvider,
}


def get_provider(
    provider_name: str | None = None,
    model: str | None = None,
    **kwargs,
) -> BaseProvider:
    """Get an AI provider instance by name.

    Falls back to the configured default provider.
    """
    name = provider_name or settings.model_provider
    provider_cls = _PROVIDERS.get(name)
    if provider_cls is None:
        raise ValueError(
            f"Unknown provider '{name}'. Available: {list(_PROVIDERS.keys())}"
        )
    return provider_cls(model=model, **kwargs)


def list_providers() -> list[str]:
    """Return list of available provider names."""
    return list(_PROVIDERS.keys())
