"""Extensible skill/plugin system for agent capabilities."""

from .base import BaseSkill, SkillResult
from .registry import SkillRegistry

__all__ = ["BaseSkill", "SkillResult", "SkillRegistry"]
