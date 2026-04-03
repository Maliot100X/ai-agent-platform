# Developer Guide

## Project Structure

```
ai-agent-platform/
  backend/
    agents/          # Agent runtime and manager
    skills/          # Plugin skill system
    providers/       # Multi-LLM provider abstraction
    services/        # Market data, WebSocket, logging
    telegram/        # Telegram bot interface
    strategies/      # Paper trading engine + strategies
    database/        # SQLAlchemy models + migrations
    config.py        # Environment-based configuration
    main.py          # FastAPI application entry point
  frontend/
    src/
      app/           # Next.js App Router pages
      components/    # React components (Three.js, charts, etc.)
      lib/           # API client, WebSocket hook
  infra/             # Docker + systemd files
  scripts/           # Deployment scripts
  docs/              # Documentation
```

---

## Adding a New Skill

1. Create a file in `backend/skills/`:

```python
from backend.skills.base import BaseSkill, SkillResult

class MyCustomSkill(BaseSkill):
    name = "my_custom_skill"
    description = "Does something useful"

    @property
    def inputs(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "param1": {"type": "string", "description": "A parameter"},
            },
            "required": ["param1"],
        }

    async def execute(self, param1: str = "", **kwargs) -> SkillResult:
        # Your logic here
        return SkillResult(success=True, data={"result": "something"})
```

2. Register it in `backend/main.py`:

```python
from backend.skills.my_custom import MyCustomSkill
global_registry.register(MyCustomSkill())
```

---

## Adding a New Provider

1. Create a file in `backend/providers/`:

```python
from backend.providers.base import BaseProvider, ProviderResponse, ToolDefinition

class MyProvider(BaseProvider):
    provider_name = "my_provider"

    async def generate(self, messages, temperature=0.7, max_tokens=4096, **kwargs):
        # Implement
        ...

    async def stream(self, messages, temperature=0.7, max_tokens=4096, **kwargs):
        # Implement
        ...

    async def tool_call(self, messages, tools, temperature=0.3, **kwargs):
        # Implement
        ...
```

2. Register in `backend/providers/factory.py`:

```python
_PROVIDERS["my_provider"] = MyProvider
```

---

## Adding a New Strategy

1. Create a strategy class in `backend/strategies/strategies.py`:

```python
class MyStrategy(BaseStrategy):
    name = "my_strategy"
    description = "My custom strategy"

    async def analyze(self, market_data: dict) -> StrategySignal | None:
        # Your analysis logic
        ...
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | System health check |
| GET | `/api/agents` | List all agents |
| POST | `/api/agents` | Create an agent |
| POST | `/api/agents/{id}/start` | Start an agent |
| POST | `/api/agents/{id}/stop` | Stop an agent |
| GET | `/api/signals` | Get recent signals |
| GET | `/api/strategies/portfolio` | Portfolio summary |
| GET | `/api/strategies/positions` | Open/closed positions |
| GET | `/api/providers` | Available providers |
| GET | `/api/skills` | Registered skills |
| GET | `/api/logs` | Recent logs |
| GET | `/api/market/prices` | Market prices |
| WS | `/ws` | Real-time updates |

---

## Running Locally

```bash
# Backend
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```
