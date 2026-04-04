"""FastAPI application entry point."""

import asyncio
import time
from contextlib import asynccontextmanager
from datetime import datetime

import structlog
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.services.logging import setup_logging
from backend.services.websocket import ws_manager
from backend.agents.manager import AgentManager
from backend.strategies.simulator import PaperTradingEngine
from backend.providers.factory import list_providers, get_provider
from backend.skills.registry import global_registry
from backend.skills.market_data import MarketDataSkill
from backend.skills.signal_generation import SignalGenerationSkill
from backend.skills.risk_analysis import RiskAnalysisSkill
from backend.skills.strategy_backtest import StrategyBacktestSkill
from backend.skills.news_sentiment import NewsSentimentSkill
from backend.skills.wallet_tracking import WalletTrackingSkill
from backend.skills.pumpfun import PumpFunSkill
from backend.services.trading_brain import trading_brain

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
    global_registry.register(PumpFunSkill())


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
    description="Autonomous AI analysis platform with multi-LLM support, trading brain, and PumpFun integration",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        "version": "2.0.0",
    }


# ---- AI Chat ----

TRADING_SYSTEM_PROMPT = """You are an advanced AI trading assistant with real-time market analysis capabilities.
You have access to a Trading Brain that provides live market data from Birdeye, Helius, DexScreener, PumpFun, and CoinGecko.

Your capabilities:
- Real-time token price analysis with BUY/SELL/HOLD signals
- Solana wallet portfolio analysis
- PumpFun new token launch monitoring
- Trending token detection across multiple DEXes
- Technical analysis with entry/TP/SL levels
- Market sentiment and volume analysis
- Whale tracking and on-chain analytics

You provide direct, actionable trading intelligence. No disclaimers needed.
When asked about a token, provide price, signal, entry/TP/SL levels.
When asked about market conditions, provide real data with analysis.

You are NOT a generic chatbot. You are a TRADING BRAIN with real market data access."""


@app.post("/api/chat")
async def ai_chat(body: dict):
    """AI chat endpoint with trading intelligence."""
    message = body.get("message", "")
    provider_name = body.get("provider", settings.model_provider)
    model = body.get("model", settings.model_name)
    include_market_data = body.get("include_market_data", True)

    # Build context with live market data if requested
    context_parts = []
    if include_market_data:
        try:
            summary = await trading_brain.get_market_summary()
            if summary and "error" not in summary:
                context_parts.append(
                    f"LIVE MARKET DATA:\n"
                    f"Total Market Cap: ${summary.get('total_market_cap', 0):,.0f}\n"
                    f"24h Volume: ${summary.get('total_volume_24h', 0):,.0f}\n"
                    f"BTC Dominance: {summary.get('btc_dominance', 0):.1f}%\n"
                    f"Market Cap Change 24h: {summary.get('market_cap_change_24h', 0):.2f}%"
                )
        except Exception:
            pass

    # Check if message mentions a specific token address
    import re
    sol_address = re.search(r'[1-9A-HJ-NP-Za-km-z]{32,44}', message)
    if sol_address:
        try:
            analysis = await trading_brain.analyze_token(sol_address.group())
            signal = analysis.get("signal", {})
            context_parts.append(
                f"\nTOKEN ANALYSIS for {sol_address.group()}:\n"
                f"Price: ${analysis.get('price', 0)}\n"
                f"Volume 24h: ${analysis.get('volume_24h', 0):,.0f}\n"
                f"Liquidity: ${analysis.get('liquidity', 0):,.0f}\n"
                f"Market Cap: ${analysis.get('market_cap', 0):,.0f}\n"
                f"Signal: {signal.get('type', 'UNKNOWN')} (Strength: {signal.get('strength', 0)}/5)\n"
                f"Entry: ${signal.get('entry', 0)}\n"
                f"Take Profit: ${signal.get('take_profit', 0)}\n"
                f"Stop Loss: ${signal.get('stop_loss', 0)}\n"
                f"Reasoning: {signal.get('reasoning', '')}"
            )
        except Exception:
            pass

    # Build messages
    system_msg = TRADING_SYSTEM_PROMPT
    if context_parts:
        system_msg += "\n\n" + "\n".join(context_parts)

    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": message},
    ]

    try:
        provider = get_provider(provider_name, model)
        response = await provider.generate(messages, temperature=0.7, max_tokens=2048)
        return {
            "response": response.content,
            "provider": response.provider,
            "model": response.model,
            "usage": response.usage,
        }
    except Exception as e:
        logger.error("chat_error", error=str(e))
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "provider": provider_name, "model": model},
        )


@app.post("/api/ai")
async def ai_alias(body: dict):
    """Alias for /api/chat."""
    return await ai_chat(body)


# ---- Trading Brain ----

@app.get("/api/trading/summary")
async def trading_summary():
    """Get overall market summary."""
    return await trading_brain.get_market_summary()


@app.get("/api/trading/analyze/{address}")
async def trading_analyze(address: str):
    """Analyze a specific token."""
    return await trading_brain.analyze_token(address)


@app.get("/api/trading/wallet/{wallet}")
async def trading_wallet(wallet: str):
    """Analyze a Solana wallet."""
    return await trading_brain.analyze_wallet(wallet)


@app.get("/api/trading/trending")
async def trading_trending():
    """Get trending tokens from multiple sources."""
    tokens = await trading_brain.get_trending_tokens()
    return {"tokens": tokens, "count": len(tokens)}


@app.get("/api/trading/pumpfun/launches")
async def pumpfun_launches(limit: int = Query(default=20, le=50)):
    """Get latest PumpFun token launches."""
    launches = await trading_brain.get_pumpfun_launches(limit)
    return {"launches": launches, "count": len(launches)}


# ---- PumpFun Skill ----

@app.get("/api/pumpfun/{action}")
async def pumpfun_action(
    action: str,
    token_address: str | None = None,
    query: str | None = None,
    limit: int = Query(default=20, le=50),
):
    """Execute PumpFun skill actions."""
    skill = global_registry.get("pumpfun")
    if not skill:
        return JSONResponse(status_code=404, content={"error": "PumpFun skill not registered"})
    result = await skill.execute(
        action=action, token_address=token_address, query=query, limit=limit
    )
    if result.success:
        return {"data": result.data, "metadata": result.metadata}
    return JSONResponse(status_code=400, content={"error": result.error})


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


@app.get("/api/signals/latest")
async def get_latest_signals():
    """Get latest trading signals with live data."""
    # Generate fresh signals from trending tokens
    try:
        trending = await trading_brain.get_trending_tokens()
        signals = []
        for token in trending[:5]:
            addr = token.get("address", "")
            if addr:
                try:
                    analysis = await trading_brain.analyze_token(addr)
                    sig = analysis.get("signal", {})
                    signals.append({
                        "symbol": token.get("symbol", "???"),
                        "name": token.get("name", ""),
                        "address": addr,
                        "price": analysis.get("price", 0),
                        "signal_type": sig.get("type", "UNKNOWN").lower(),
                        "strength": sig.get("strength", 0),
                        "reasoning": sig.get("reasoning", ""),
                        "entry": sig.get("entry", 0),
                        "take_profit": sig.get("take_profit", 0),
                        "stop_loss": sig.get("stop_loss", 0),
                        "timestamp": datetime.utcnow().isoformat(),
                    })
                except Exception:
                    continue
        return {"signals": signals}
    except Exception as e:
        return {"signals": signal_store[-10:], "error": str(e)}


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


@app.post("/api/providers/switch")
async def switch_provider(body: dict):
    """Switch the active AI provider."""
    new_provider = body.get("provider", "")
    new_model = body.get("model", "")
    available = list_providers()
    if new_provider not in available:
        return JSONResponse(
            status_code=400,
            content={"error": f"Unknown provider '{new_provider}'. Available: {available}"},
        )
    # Note: in serverless, this only affects the current request context
    return {
        "message": f"Provider switched to {new_provider}",
        "provider": new_provider,
        "model": new_model or settings.model_name,
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


# ---- Telegram Webhook ----

@app.post("/api/telegram/webhook")
async def telegram_webhook(request: Request):
    """Handle Telegram webhook updates (for serverless deployment).

    Set webhook URL to: https://your-domain.vercel.app/_/backend/api/telegram/webhook
    """
    if not settings.telegram_bot_token:
        return JSONResponse(status_code=500, content={"error": "TELEGRAM_BOT_TOKEN not set"})

    try:
        from telegram import Update, Bot
        from telegram.ext import Application

        data = await request.json()
        bot = Bot(token=settings.telegram_bot_token)

        # Process the update
        update = Update.de_json(data, bot)
        if update and update.message and update.message.text:
            text = update.message.text
            chat_id = update.message.chat_id

            response_text = ""
            if text.startswith("/start"):
                response_text = (
                    "Welcome to FLUXMINT AI Trading Bot\n\n"
                    "Commands:\n"
                    "/status - System health\n"
                    "/agents - List active agents\n"
                    "/signals - Latest trading signals\n"
                    "/trending - Trending tokens\n"
                    "/pumpfun - New PumpFun launches\n"
                    "/analyze <address> - Analyze a token\n"
                    "/wallet <address> - Analyze a wallet\n"
                    "/ai <question> - AI chat with trading brain\n"
                    "/market - Market summary\n"
                )
            elif text.startswith("/status"):
                uptime = int(time.time() - start_time)
                response_text = (
                    f"System Status: healthy\n"
                    f"Uptime: {uptime // 3600}h {(uptime % 3600) // 60}m\n"
                    f"Provider: {settings.model_provider}\n"
                    f"Model: {settings.model_name}\n"
                    f"Skills: {global_registry.count}\n"
                )
            elif text.startswith("/signals"):
                try:
                    data = await get_latest_signals()
                    sigs = data.get("signals", [])
                    if sigs:
                        lines = []
                        for s in sigs[:5]:
                            emoji = {"buy": "BUY", "sell": "SELL", "hold": "HOLD"}.get(s.get("signal_type", ""), "?")
                            lines.append(
                                f"{emoji} {s['symbol']} @ ${s.get('price', 0):.6f}\n"
                                f"  Strength: {s.get('strength', 0)}/5\n"
                                f"  TP: ${s.get('take_profit', 0):.6f} | SL: ${s.get('stop_loss', 0):.6f}"
                            )
                        response_text = "Latest Signals:\n\n" + "\n\n".join(lines)
                    else:
                        response_text = "No signals available right now."
                except Exception as e:
                    response_text = f"Error fetching signals: {e}"
            elif text.startswith("/trending"):
                try:
                    tokens = await trading_brain.get_trending_tokens()
                    if tokens:
                        lines = [
                            f"{t['symbol']} - ${t.get('price', 0):.6f} (Vol: ${t.get('volume_24h', 0):,.0f})"
                            for t in tokens[:10]
                        ]
                        response_text = "Trending Tokens:\n\n" + "\n".join(lines)
                    else:
                        response_text = "No trending data available."
                except Exception as e:
                    response_text = f"Error: {e}"
            elif text.startswith("/pumpfun"):
                try:
                    launches = await trading_brain.get_pumpfun_launches(10)
                    if launches:
                        lines = [
                            f"{l['symbol']} ({l['name']})\n  MC: ${l.get('market_cap', 0):,.0f} | {'Graduated' if l.get('complete') else 'Active'}"
                            for l in launches[:10]
                        ]
                        response_text = "PumpFun Launches:\n\n" + "\n".join(lines)
                    else:
                        response_text = "No PumpFun data available."
                except Exception as e:
                    response_text = f"Error: {e}"
            elif text.startswith("/analyze"):
                parts = text.split(maxsplit=1)
                if len(parts) > 1:
                    addr = parts[1].strip()
                    try:
                        analysis = await trading_brain.analyze_token(addr)
                        sig = analysis.get("signal", {})
                        response_text = (
                            f"Token Analysis:\n\n"
                            f"Price: ${analysis.get('price', 0)}\n"
                            f"Volume 24h: ${analysis.get('volume_24h', 0):,.0f}\n"
                            f"Liquidity: ${analysis.get('liquidity', 0):,.0f}\n"
                            f"Market Cap: ${analysis.get('market_cap', 0):,.0f}\n\n"
                            f"Signal: {sig.get('type', 'UNKNOWN')} ({sig.get('strength', 0)}/5)\n"
                            f"Entry: ${sig.get('entry', 0)}\n"
                            f"TP: ${sig.get('take_profit', 0)}\n"
                            f"SL: ${sig.get('stop_loss', 0)}\n\n"
                            f"{sig.get('reasoning', '')}"
                        )
                    except Exception as e:
                        response_text = f"Error analyzing token: {e}"
                else:
                    response_text = "Usage: /analyze <token_address>"
            elif text.startswith("/wallet"):
                parts = text.split(maxsplit=1)
                if len(parts) > 1:
                    addr = parts[1].strip()
                    try:
                        wallet_data = await trading_brain.analyze_wallet(addr)
                        holdings = wallet_data.get("top_holdings", [])
                        holdings_text = "\n".join(
                            f"  {h['symbol']} - {h['name']}" for h in holdings[:10]
                        )
                        response_text = (
                            f"Wallet Analysis:\n\n"
                            f"SOL Balance: {wallet_data.get('sol_balance', 0):.4f} SOL\n"
                            f"Tokens: {wallet_data.get('token_count', 0)}\n"
                            f"Recent Txns: {wallet_data.get('recent_transactions', 0)}\n\n"
                            f"Top Holdings:\n{holdings_text or 'None found'}"
                        )
                    except Exception as e:
                        response_text = f"Error analyzing wallet: {e}"
                else:
                    response_text = "Usage: /wallet <wallet_address>"
            elif text.startswith("/market"):
                try:
                    summary = await trading_brain.get_market_summary()
                    response_text = (
                        f"Market Summary:\n\n"
                        f"Total Market Cap: ${summary.get('total_market_cap', 0):,.0f}\n"
                        f"24h Volume: ${summary.get('total_volume_24h', 0):,.0f}\n"
                        f"BTC Dominance: {summary.get('btc_dominance', 0):.1f}%\n"
                        f"24h Change: {summary.get('market_cap_change_24h', 0):.2f}%\n"
                        f"Active Coins: {summary.get('active_coins', 0):,}"
                    )
                except Exception as e:
                    response_text = f"Error: {e}"
            elif text.startswith("/ai"):
                parts = text.split(maxsplit=1)
                if len(parts) > 1:
                    try:
                        chat_result = await ai_chat({"message": parts[1], "include_market_data": True})
                        if isinstance(chat_result, dict):
                            response_text = chat_result.get("response", "No response from AI.")
                        else:
                            response_text = "AI processing error."
                    except Exception as e:
                        response_text = f"AI Error: {e}"
                else:
                    response_text = "Usage: /ai <your question>"
            elif text.startswith("/agents"):
                agents = agent_manager.list_agents()
                if agents:
                    lines = [
                        f"{a['name']} [{a['status']}] - Skills: {len(a.get('skills', []))}"
                        for a in agents
                    ]
                    response_text = "Active Agents:\n\n" + "\n".join(lines)
                else:
                    response_text = "No agents running."
            else:
                # Default: treat as AI chat
                try:
                    chat_result = await ai_chat({"message": text, "include_market_data": True})
                    if isinstance(chat_result, dict):
                        response_text = chat_result.get("response", "No response.")
                    else:
                        response_text = "Processing error."
                except Exception as e:
                    response_text = f"Error: {e}"

            if response_text:
                # Truncate to Telegram limit
                if len(response_text) > 4000:
                    response_text = response_text[:4000] + "..."
                await bot.send_message(chat_id=chat_id, text=response_text)

        return {"ok": True}
    except Exception as e:
        logger.error("telegram_webhook_error", error=str(e))
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/telegram/set-webhook")
async def set_telegram_webhook(body: dict):
    """Set the Telegram webhook URL."""
    webhook_url = body.get("url", "")
    if not webhook_url:
        return JSONResponse(status_code=400, content={"error": "url is required"})
    if not settings.telegram_bot_token:
        return JSONResponse(status_code=500, content={"error": "TELEGRAM_BOT_TOKEN not set"})

    try:
        import httpx as hx
        async with hx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/setWebhook",
                json={"url": webhook_url},
            )
            return resp.json()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
