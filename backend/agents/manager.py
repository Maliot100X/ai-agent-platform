"""Agent manager - orchestrates multiple agent runtimes."""

import structlog

from .runtime import AgentRuntime
from backend.skills.registry import global_registry

logger = structlog.get_logger()


class AgentManager:
    """Manages the lifecycle of multiple agent runtimes."""

    def __init__(self):
        self._agents: dict[str, AgentRuntime] = {}
        self._action_callbacks: list = []
        self._signal_callbacks: list = []

    def on_action(self, callback) -> None:
        self._action_callbacks.append(callback)

    def on_signal(self, callback) -> None:
        self._signal_callbacks.append(callback)

    async def create_agent(
        self,
        name: str,
        goal: str,
        provider_name: str | None = None,
        model: str | None = None,
        skills: list[str] | None = None,
        config: dict | None = None,
    ) -> AgentRuntime:
        """Create and register a new agent."""
        agent = AgentRuntime(
            name=name,
            goal=goal,
            provider_name=provider_name,
            model=model,
            skills=skills,
            config=config,
        )
        agent.register_skills_from_global(global_registry)

        # Wire up broadcasts
        for cb in self._action_callbacks:
            agent.on_action(cb)
        for cb in self._signal_callbacks:
            agent.on_signal(cb)

        self._agents[agent.agent_id] = agent
        logger.info("agent_created", agent_id=agent.agent_id, name=name)
        return agent

    async def start_agent(self, agent_id: str) -> bool:
        agent = self._agents.get(agent_id)
        if not agent:
            return False
        await agent.start()
        return True

    async def stop_agent(self, agent_id: str) -> bool:
        agent = self._agents.get(agent_id)
        if not agent:
            return False
        await agent.stop()
        return True

    async def remove_agent(self, agent_id: str) -> bool:
        agent = self._agents.get(agent_id)
        if not agent:
            return False
        await agent.stop()
        del self._agents[agent_id]
        return True

    def get_agent(self, agent_id: str) -> AgentRuntime | None:
        return self._agents.get(agent_id)

    def list_agents(self) -> list[dict]:
        return [a.get_status() for a in self._agents.values()]

    async def start_all(self) -> None:
        for agent in self._agents.values():
            await agent.start()

    async def stop_all(self) -> None:
        for agent in self._agents.values():
            await agent.stop()

    @property
    def count(self) -> int:
        return len(self._agents)
