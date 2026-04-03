"""Skill registry for managing and discovering available skills."""

import structlog

from .base import BaseSkill

logger = structlog.get_logger()


class SkillRegistry:
    """Central registry for all available skills."""

    def __init__(self):
        self._skills: dict[str, BaseSkill] = {}

    def register(self, skill: BaseSkill) -> None:
        """Register a skill in the registry."""
        self._skills[skill.name] = skill
        logger.info("skill_registered", name=skill.name, version=skill.version)

    def unregister(self, name: str) -> None:
        """Remove a skill from the registry."""
        if name in self._skills:
            del self._skills[name]
            logger.info("skill_unregistered", name=name)

    def get(self, name: str) -> BaseSkill | None:
        """Get a skill by name."""
        return self._skills.get(name)

    def list_skills(self) -> list[dict]:
        """List all registered skills with metadata."""
        return [
            {
                "name": s.name,
                "description": s.description,
                "version": s.version,
                "inputs": s.inputs,
            }
            for s in self._skills.values()
        ]

    def get_tool_definitions(self, skill_names: list[str] | None = None) -> list[dict]:
        """Get OpenAI-compatible tool definitions for skills."""
        skills = self._skills.values()
        if skill_names:
            skills = [s for s in skills if s.name in skill_names]
        return [s.to_tool_definition() for s in skills]

    @property
    def count(self) -> int:
        return len(self._skills)


# Global registry instance
global_registry = SkillRegistry()
