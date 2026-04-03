"""Telegram bot for controlling the agent platform."""

import httpx
import structlog
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, ContextTypes, CallbackQueryHandler,
)

from backend.config import settings

logger = structlog.get_logger()

# Backend API base URL
API_BASE = f"http://{settings.api_host}:{settings.api_port}/api"


async def _api_get(path: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{API_BASE}{path}")
        resp.raise_for_status()
        return resp.json()


async def _api_post(path: str, data: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(f"{API_BASE}{path}", json=data or {})
        resp.raise_for_status()
        return resp.json()


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command."""
    await update.message.reply_text(
        "Welcome to the AI Agent Platform\n\n"
        "Available commands:\n"
        "/status - System health\n"
        "/agents - List active agents\n"
        "/models - Available AI models\n"
        "/provider - Current provider info\n"
        "/run_strategy <name> - Start a strategy\n"
        "/stop_strategy <name> - Stop a strategy\n"
        "/signals - Recent signals\n"
        "/logs - Recent logs\n"
        "/dashboard - Dashboard link\n"
    )


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /status command."""
    try:
        data = await _api_get("/health")
        text = (
            f"System Status: {data.get('status', 'unknown')}\n"
            f"Agents: {data.get('agents', 0)}\n"
            f"Uptime: {data.get('uptime', 'N/A')}\n"
            f"Provider: {data.get('provider', 'N/A')}\n"
            f"WebSocket clients: {data.get('ws_clients', 0)}\n"
        )
    except Exception as e:
        text = f"Error fetching status: {e}"
    await update.message.reply_text(text)


async def cmd_agents(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /agents command."""
    try:
        data = await _api_get("/agents")
        agents = data.get("agents", [])
        if not agents:
            await update.message.reply_text("No agents running.")
            return
        lines = []
        for a in agents:
            lines.append(
                f"  {a['name']} [{a['status']}]\n"
                f"  Skills: {len(a.get('skills', []))} | "
                f"Tool calls: {a.get('tool_calls', 0)}"
            )
        await update.message.reply_text("Active Agents:\n\n" + "\n\n".join(lines))
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


async def cmd_models(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /models command."""
    try:
        data = await _api_get("/providers")
        providers = data.get("providers", [])
        text = "Available Providers:\n\n" + "\n".join(
            f"  {p}" for p in providers
        )
    except Exception as e:
        text = f"Error: {e}"
    await update.message.reply_text(text)


async def cmd_provider(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /provider command."""
    text = (
        f"Current Provider: {settings.model_provider}\n"
        f"Model: {settings.model_name}"
    )
    await update.message.reply_text(text)


async def cmd_run_strategy(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /run_strategy command."""
    if not context.args:
        await update.message.reply_text("Usage: /run_strategy <momentum|mean_reversion|breakout>")
        return
    strategy = context.args[0]
    try:
        data = await _api_post("/strategies/start", {"strategy": strategy})
        await update.message.reply_text(f"Strategy '{strategy}' started: {data.get('message', 'OK')}")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


async def cmd_stop_strategy(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /stop_strategy command."""
    if not context.args:
        await update.message.reply_text("Usage: /stop_strategy <name>")
        return
    strategy = context.args[0]
    try:
        data = await _api_post("/strategies/stop", {"strategy": strategy})
        await update.message.reply_text(f"Strategy '{strategy}' stopped: {data.get('message', 'OK')}")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


async def cmd_signals(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /signals command."""
    try:
        data = await _api_get("/signals?limit=10")
        signals = data.get("signals", [])
        if not signals:
            await update.message.reply_text("No recent signals.")
            return
        lines = []
        for s in signals[:10]:
            emoji = {"buy": "BUY", "sell": "SELL", "hold": "HOLD"}.get(s.get("signal_type", ""), "?")
            lines.append(
                f"  {emoji} {s['symbol']} | Strength: {s.get('strength', 0):.2f}\n"
                f"  {s.get('reasoning', '')[:80]}"
            )
        await update.message.reply_text("Recent Signals:\n\n" + "\n\n".join(lines))
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


async def cmd_logs(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /logs command."""
    try:
        data = await _api_get("/logs?limit=10")
        logs = data.get("logs", [])
        if not logs:
            await update.message.reply_text("No recent logs.")
            return
        lines = [f"  [{l['level']}] {l['action']}: {l.get('message', '')[:60]}" for l in logs[:10]]
        await update.message.reply_text("Recent Logs:\n\n" + "\n".join(lines))
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


async def cmd_dashboard(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /dashboard command."""
    await update.message.reply_text(
        f"Dashboard: {settings.dashboard_url}\n\n"
        "Pages:\n"
        f"  Overview: {settings.dashboard_url}/overview\n"
        f"  Agents: {settings.dashboard_url}/agents\n"
        f"  Signals: {settings.dashboard_url}/signals\n"
        f"  Strategies: {settings.dashboard_url}/strategies\n"
    )


def create_bot() -> Application:
    """Create and configure the Telegram bot application."""
    if not settings.telegram_bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN is not configured")

    app = Application.builder().token(settings.telegram_bot_token).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("agents", cmd_agents))
    app.add_handler(CommandHandler("models", cmd_models))
    app.add_handler(CommandHandler("provider", cmd_provider))
    app.add_handler(CommandHandler("run_strategy", cmd_run_strategy))
    app.add_handler(CommandHandler("stop_strategy", cmd_stop_strategy))
    app.add_handler(CommandHandler("signals", cmd_signals))
    app.add_handler(CommandHandler("logs", cmd_logs))
    app.add_handler(CommandHandler("dashboard", cmd_dashboard))

    return app
