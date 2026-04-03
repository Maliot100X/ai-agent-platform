"""FastAPI application entry point."""

import asyncio
import time
from contextlib import asynccontextmanager
from datetime import datetime

import structlog
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.services.logging import setup_logging
from backend.services.websocket import ws_manager
from backend.agents.manager import AgentManager
from backend.strategies.simulator import PaperTradingEngine
from backend.providers.factory import list_providers
from backend.skills.registry import global_registry
from backend.skills.market_data import MarketDataSkill
from backend.skills.signal_generation import SignalGenerationSkill
from backend.skills.risk_analysis import RiskAnalysisSkill
from backend.skills.strategy_backtest import StrategyBacktestSkill
from backend.skills.news_sentiment import NewsSentimentSkill
from backend.skills.wallet_tracking import WalletTrackingSkill

logger = structlog.get_logger()

# Global state
agent_manager = AgentManager()
paper_engine = PaperTradingEngine()
start_time = time.time()
signal_store: list[dict] = []
log_store: list[dict] = []


def _register_skills():
    """Register all built-in skills."""
    global_registry.register(MarketDataSkill())
    global_registry.register(SignalGenerationSkill())
    global_registry.register(RiskAnalysisSkill())
    global_registry.register(StrategyBacktestSkill())
    global_registry.register(NewsSentimentSkill())
    global_registry.register(WalletTrackingSkill())


async def _on_signal(signal: dict):
    signal_store.append(signal)
    if len(signal_store) > 1000:
        signal_store.pop(0)
    await ws_manager.broadcast_signal(signal)


async def _on_action(action: dict):
    log_entry = {
        "level": "info",
        "action": action.get("action", "unknown"),
        "message": action.get("reasoning", action.get("skill", "")),
        "agent": action.get("agent_name", ""),
        "timestamp": action.get("timestamp", datetime.utcnow().isoformat()),
    }
    log_store.append(log_entry)
    if len(log_store) > 1000:
        log_store.pop(0)
    await ws_manager.broadcast_action(action)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_level)
    _register_skills()
    agent_manager.on_signal(_on_signal)
    agent_manager.on_action(_on_action)
    logger.info("platform_started", provider=settings.model_provider, model=settings.model_name)
    yield
    await agent_manager.stop_all()
    logger.info("platform_shutdown")


app = FastAPI(
    title="AI Agent Platform",
    description="Autonomous AI analysis platform with multi-LLM support and paper trading",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Health ----

@app.get("/api/health")
async def health():
    uptime = int(time.time() - start_time)
    return {
        "status": "healthy",
        "uptime": f"{uptime // 3600}h {(uptime % 3600) // 60}m",
        "agents": agent_manager.count,
        "provider": settings.model_provider,
        "model": settings.model_name,
        "ws_clients": ws_manager.connection_count,
        "signals_count": len(signal_store),
        "skills": global_registry.count,
    }


# ---- Agents ----

@app.get("/api/agents")
async def list_agents():
    return {"agents": agent_manager.list_agents()}


@app.post("/api/agents")
async def create_agent(body: dict):
    agent = await agent_manager.create_agent(
        name=body.get("name", "agent"),
        goal=body.get("goal", "Monitor markets and generate signals"),
        provider_name=body.get("provider"),
        model=body.get("model"),
        skills=body.get("skills"),
        config=body.get("config", {}),
    )
    return {"agent_id": agent.agent_id, "status": "created"}


@app.post("/api/agents/{agent_id}/start")
async def start_agent(agent_id: str):
    ok = await agent_manager.start_agent(agent_id)
    return {"success": ok}


@app.post("/api/agents/{agent_id}/stop")
async def stop_agent(agent_id: str):
    ok = await agent_manager.stop_agent(agent_id)
    return {"success": ok}


@app.delete("/api/agents/{agent_id}")
async def remove_agent(agent_id: str):
    ok = await agent_manager.remove_agent(agent_id)
    return {"success": ok}


# ---- Signals ----

@app.get("/api/signals")
async def get_signals(limit: int = Query(default=50, le=200)):
    return {"signals": signal_store[-limit:]}


# ---- Strategies ----

@app.get("/api/strategies/portfolio")
async def get_portfolio():
    return paper_engine.get_portfolio()


@app.post("/api/strategies/start")
async def start_strategy(body: dict):
    strategy = body.get("strategy", "momentum")
    return {"message": f"Strategy '{strategy}' started", "strategy": strategy}


@app.post("/api/strategies/stop")
async def stop_strategy(body: dict):
    strategy = body.get("strategy", "")
    return {"message": f"Strategy '{strategy}' stopped", "strategy": strategy}


@app.get("/api/strategies/positions")
async def get_positions():
    return {
        "open": [p.to_dict() for p in paper_engine.open_positions.values()],
        "closed": [p.to_dict() for p in paper_engine.closed_positions[-50:]],
    }


# ---- Providers ----

@app.get("/api/providers")
async def get_providers():
    return {
        "providers": list_providers(),
        "current": settings.model_provider,
        "model": settings.model_name,
    }


# ---- Skills ----

@app.get("/api/skills")
async def get_skills():
    return {"skills": global_registry.list_skills()}


# ---- Logs ----

@app.get("/api/logs")
async def get_logs(limit: int = Query(default=50, le=200)):
    return {"logs": log_store[-limit:]}


# ---- WebSocket ----

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo or handle client messages
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ---- Market Data ----

@app.get("/api/market/prices")
async def get_market_prices(symbols: str = "bitcoin,ethereum,solana", source: str = "coingecko"):
    from backend.services.market_data import MarketDataService
    svc = MarketDataService()
    adapter = svc.get_adapter(source)
    data = await adapter.fetch_prices(symbols.split(","))
    return {"prices": data, "source": source}


@app.get("/api/market/markets")
async def get_markets(source: str = "coingecko"):
    from backend.services.market_data import MarketDataService
    svc = MarketDataService()
    adapter = svc.get_adapter(source)
    data = await adapter.fetch_markets()
    return {"markets": data[:20], "source": source}
