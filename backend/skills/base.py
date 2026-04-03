"""Base skill interface that all skills must implement."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SkillResult:
    """Standardized result from skill execution."""
    success: bool
    data: Any = None
    error: str | None = None
    metadata: dict = field(default_factory=dict)


class BaseSkill(ABC):
    """Abstract base class for all agent skills.

    Each skill is a self-contained capability that an agent can invoke
    through tool-calling.
    """

    name: str = "base_skill"
    description: str = "Base skill"
    version: str = "1.0.0"

    @property
    def inputs(self) -> dict:
        """JSON schema for skill inputs."""
        return {"type": "object", "properties": {}}

    @property
    def outputs(self) -> dict:
        """Description of skill outputs."""
        return {"type": "object", "properties": {}}

    @abstractmethod
    async def execute(self, **kwargs) -> SkillResult:
        """Execute the skill with given parameters."""
        ...

    def to_tool_definition(self) -> dict:
        """Convert skill to OpenAI-compatible tool definition."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.inputs,
            },
        }
