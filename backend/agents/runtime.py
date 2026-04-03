"""Core agent runtime - the continuous execution loop for a single agent."""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Any

import structlog

from backend.providers import get_provider
from backend.providers.base import ToolDefinition
from backend.skills.registry import SkillRegistry

logger = structlog.get_logger()


class AgentRuntime:
    """Runtime for a single autonomous agent.

    Each agent has its own:
    - agent_id and goal
    - memory store
    - task queue
    - skill registry
    - conversation history
    - tool call history
    """

    def __init__(
        self,
        agent_id: str | None = None,
        name: str = "default_agent",
        goal: str = "Monitor markets and generate trading signals",
        provider_name: str | None = None,
        model: str | None = None,
        skills: list[str] | None = None,
        config: dict | None = None,
    ):
        self.agent_id = agent_id or str(uuid.uuid4())
        self.name = name
        self.goal = goal
        self.provider = get_provider(provider_name, model)
        self.skill_registry = SkillRegistry()
        self.config = config or {}

        # State
        self.status = "idle"
        self.memory: dict[str, Any] = {}
        self.conversation_history: list[dict] = []
        self.tool_call_history: list[dict] = []
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self._running = False
        self._loop_task: asyncio.Task | None = None

        # Callbacks for broadcasting updates
        self._on_action: list = []
        self._on_signal: list = []

        # Requested skills
        self._requested_skills = skills or [
            "market_data", "signal_generation", "risk_analysis",
            "strategy_backtest", "news_sentiment",
        ]

    def register_skills_from_global(self, global_registry: SkillRegistry) -> None:
        """Copy requested skills from the global registry."""
        for name in self._requested_skills:
            skill = global_registry.get(name)
            if skill:
                self.skill_registry.register(skill)

    def on_action(self, callback) -> None:
        """Register a callback for agent actions."""
        self._on_action.append(callback)

    def on_signal(self, callback) -> None:
        """Register a callback for generated signals."""
        self._on_signal.append(callback)

    async def _broadcast_action(self, action: dict) -> None:
        for cb in self._on_action:
            try:
                await cb(action)
            except Exception as e:
                logger.error("action_broadcast_error", error=str(e))

    async def _broadcast_signal(self, signal: dict) -> None:
        for cb in self._on_signal:
            try:
                await cb(signal)
            except Exception as e:
                logger.error("signal_broadcast_error", error=str(e))

    async def start(self) -> None:
        """Start the agent's continuous execution loop."""
        if self._running:
            return
        self._running = True
        self.status = "running"
        self._loop_task = asyncio.create_task(self._run_loop())
        logger.info("agent_started", agent_id=self.agent_id, name=self.name)

    async def stop(self) -> None:
        """Stop the agent."""
        self._running = False
        self.status = "idle"
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass
        logger.info("agent_stopped", agent_id=self.agent_id, name=self.name)

    async def _run_loop(self) -> None:
        """Main agent loop: scan -> analyze -> reason -> act -> broadcast."""
        cycle = 0
        interval = self.config.get("loop_interval", 60)

        while self._running:
            cycle += 1
            try:
                logger.info("agent_cycle", agent_id=self.agent_id, cycle=cycle)

                # Build system prompt
                system_msg = {
                    "role": "system",
                    "content": (
                        f"You are an autonomous trading analysis agent named '{self.name}'. "
                        f"Your goal: {self.goal}. "
                        "You have access to tools for market data, signal generation, "
                        "risk analysis, strategy backtesting, and news sentiment. "
                        "Analyze current market conditions, generate signals, and assess risk. "
                        "Call the appropriate tools to gather information, then provide your analysis. "
                        "This is paper trading only - no real trades are executed."
                    ),
                }

                user_msg = {
                    "role": "user",
                    "content": (
                        f"Cycle {cycle}: Perform your analysis. "
                        "Scan for opportunities, check risk levels, and generate any signals. "
                        "Use your available tools."
                    ),
                }

                messages = [system_msg] + self.conversation_history[-10:] + [user_msg]

                # Get tool definitions from skills
                tool_defs = [
                    ToolDefinition(
                        name=s["function"]["name"],
                        description=s["function"]["description"],
                        parameters=s["function"]["parameters"],
                    )
                    for s in self.skill_registry.get_tool_definitions()
                ]

                if tool_defs:
                    response = await self.provider.tool_call(messages, tool_defs)
                else:
                    response = await self.provider.generate(messages)

                # Process tool calls
                if response.tool_calls:
                    for tc in response.tool_calls:
                        func = tc.get("function", tc) if isinstance(tc, dict) else tc
                        func_name = func.get("name", "") if isinstance(func, dict) else getattr(func, "name", "")
                        func_args_raw = func.get("arguments", "{}") if isinstance(func, dict) else getattr(func, "arguments", "{}")
                        try:
                            func_args = json.loads(func_args_raw) if isinstance(func_args_raw, str) else func_args_raw
                        except json.JSONDecodeError:
                            func_args = {}

                        skill = self.skill_registry.get(func_name)
                        if skill:
                            result = await skill.execute(**func_args)
                            self.tool_call_history.append({
                                "cycle": cycle,
                                "skill": func_name,
                                "args": func_args,
                                "result": result.data if result.success else result.error,
                                "success": result.success,
                                "timestamp": datetime.utcnow().isoformat(),
                            })

                            await self._broadcast_action({
                                "agent_id": self.agent_id,
                                "agent_name": self.name,
                                "action": "tool_call",
                                "skill": func_name,
                                "result": result.data,
                                "timestamp": datetime.utcnow().isoformat(),
                            })

                            # If signal was generated, broadcast it
                            if func_name == "signal_generation" and result.success and result.data:
                                await self._broadcast_signal({
                                    "agent_id": self.agent_id,
                                    "agent_name": self.name,
                                    **result.data,
                                    "timestamp": datetime.utcnow().isoformat(),
                                })

                # Store reasoning in conversation history
                if response.content:
                    self.conversation_history.append({
                        "role": "assistant",
                        "content": response.content,
                    })
                    # Keep history bounded
                    if len(self.conversation_history) > 50:
                        self.conversation_history = self.conversation_history[-30:]

                await self._broadcast_action({
                    "agent_id": self.agent_id,
                    "agent_name": self.name,
                    "action": "cycle_complete",
                    "cycle": cycle,
                    "reasoning": response.content[:500] if response.content else "",
                    "tool_calls_count": len(response.tool_calls),
                    "timestamp": datetime.utcnow().isoformat(),
                })

            except Exception as e:
                logger.error("agent_cycle_error", agent_id=self.agent_id, cycle=cycle, error=str(e))
                await self._broadcast_action({
                    "agent_id": self.agent_id,
                    "action": "error",
                    "error": str(e),
                    "cycle": cycle,
                    "timestamp": datetime.utcnow().isoformat(),
                })

            await asyncio.sleep(interval)

    def get_status(self) -> dict:
        """Return current agent status."""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "goal": self.goal,
            "status": self.status,
            "provider": self.provider.provider_name,
            "skills": self.skill_registry.list_skills(),
            "conversation_length": len(self.conversation_history),
            "tool_calls": len(self.tool_call_history),
            "recent_tools": self.tool_call_history[-5:] if self.tool_call_history else [],
        }
