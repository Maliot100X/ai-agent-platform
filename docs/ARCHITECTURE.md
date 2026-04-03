# Architecture Documentation

## System Overview

The AI Agent Platform is a modular, production-grade autonomous analysis system built around three core layers:

1. **Agent Layer** - Autonomous AI agents that continuously analyze markets
2. **Service Layer** - Market data, strategy simulation, and real-time communication
3. **Interface Layer** - Dashboard UI and Telegram bot for monitoring and control

---

## Architecture Diagram

```
+------------------+     +------------------+     +------------------+
|   Dashboard UI   |     |   Telegram Bot   |     |   External APIs  |
|   (Next.js)      |     | (python-telegram) |     |  (CoinGecko etc) |
+--------+---------+     +--------+---------+     +--------+---------+
         |                         |                         |
         | WebSocket + REST        | HTTP                    |
         |                         |                         |
+--------v-------------------------v-------------------------v--------+
|                          FastAPI Server                              |
|  /api/health  /api/agents  /api/signals  /api/strategies  /ws       |
+---------------------------------------------------------------------+
         |                    |                    |
+--------v--------+  +-------v--------+  +--------v--------+
|  Agent Manager  |  |  Paper Trading |  |  WebSocket Mgr  |
|                 |  |     Engine     |  |  (Broadcast)     |
+--------+--------+  +-------+--------+  +-----------------+
         |                    |
+--------v--------+  +-------v--------+
|  Agent Runtime  |  |   Strategies   |
|  (Loop: scan    |  |  - Momentum    |
|   -> analyze    |  |  - Mean Revert |
|   -> reason     |  |  - Breakout    |
|   -> act)       |  +----------------+
+--------+--------+
         |
+--------v--------+     +------------------+
|  Skill Registry |---->|  Provider Layer  |
|  - market_data  |     |  - Fireworks     |
|  - signals      |     |  - Gemini        |
|  - risk         |     |  - Ollama        |
|  - backtest     |     |  - OpenAI        |
|  - sentiment    |     +------------------+
|  - wallet       |
+--------+--------+
         |
+--------v--------+     +------------------+
|   PostgreSQL    |     |      Redis       |
|  (persistent)   |     |  (cache/pubsub)  |
+-----------------+     +------------------+
```

---

## Component Details

### Agent Runtime (`backend/agents/runtime.py`)

Each agent runs an autonomous loop:

1. **Scan** - Gather market data via skills
2. **Analyze** - Process signals and assess risk
3. **Reason** - Use LLM to make decisions with tool calling
4. **Act** - Execute skill calls based on LLM decisions
5. **Broadcast** - Push updates via WebSocket

Agents maintain:
- Conversation history (bounded to last 50 messages)
- Tool call history
- Memory store (key-value)
- Skill registry (per-agent)

### Provider Abstraction (`backend/providers/`)

All providers implement three methods:
- `generate()` - Standard completion
- `stream()` - Streaming completion
- `tool_call()` - Function/tool calling

Provider selection via `MODEL_PROVIDER` environment variable.

### Skill System (`backend/skills/`)

Plugin architecture where each skill:
- Has a name, description, inputs schema, outputs schema
- Implements `execute(**kwargs) -> SkillResult`
- Auto-converts to OpenAI tool definitions for LLM tool calling

### Strategy Simulator (`backend/strategies/`)

Paper trading engine that:
- Tracks simulated positions (long/short)
- Calculates real-time PnL
- Enforces stop loss and take profit
- Maintains trade history
- Computes portfolio metrics (win rate, etc.)

### Database (`backend/database/`)

PostgreSQL with async SQLAlchemy:
- `agents` - Agent configurations and state
- `agent_logs` - Structured activity logs
- `signals` - Generated trading signals
- `strategies` - Strategy configurations
- `positions` - Paper trading positions
- `providers` - Provider configurations
- `sessions` - Authentication sessions

### Real-time System (`backend/services/websocket.py`)

WebSocket connection manager broadcasts:
- Signals (buy/sell/hold)
- Agent actions (tool calls, cycle completions)
- Logs
- Strategy metrics

---

## Data Flow

```
Market Data APIs --> Market Data Skill --> Agent Runtime --> LLM Provider
                                              |
                                              v
                                    Signal Generation Skill
                                              |
                                              v
                                    Signal Store + WebSocket Broadcast
                                              |
                              +---------------+---------------+
                              |                               |
                        Dashboard UI                   Telegram Bot
```

---

## Security Model

- All API keys stored in environment variables
- No secrets in code or version control
- `.env.example` provides template without real values
- Dashboard auth via session tokens
- Telegram restricted to admin chat ID
