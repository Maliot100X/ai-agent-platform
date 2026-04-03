# API Reference

Base URL: `http://localhost:8000`

---

## Health

### GET /api/health

Returns system health and status.

**Response:**
```json
{
  "status": "healthy",
  "uptime": "2h 15m",
  "agents": 3,
  "provider": "fireworks",
  "model": "accounts/fireworks/routers/kimi-k2p5-turbo",
  "ws_clients": 2,
  "signals_count": 47,
  "skills": 6
}
```

---

## Agents

### GET /api/agents

List all registered agents.

**Response:**
```json
{
  "agents": [
    {
      "agent_id": "uuid",
      "name": "market_scanner",
      "goal": "Monitor markets and generate signals",
      "status": "running",
      "provider": "fireworks",
      "skills": [...],
      "conversation_length": 12,
      "tool_calls": 45,
      "recent_tools": [...]
    }
  ]
}
```

### POST /api/agents

Create a new agent.

**Body:**
```json
{
  "name": "market_scanner",
  "goal": "Monitor BTC and ETH for trading opportunities",
  "provider": "fireworks",
  "model": "accounts/fireworks/routers/kimi-k2p5-turbo",
  "skills": ["market_data", "signal_generation", "risk_analysis"],
  "config": {
    "loop_interval": 60
  }
}
```

### POST /api/agents/{agent_id}/start

Start an agent's continuous execution loop.

### POST /api/agents/{agent_id}/stop

Stop an agent.

### DELETE /api/agents/{agent_id}

Remove an agent.

---

## Signals

### GET /api/signals?limit=50

Get recent trading signals.

**Response:**
```json
{
  "signals": [
    {
      "agent_id": "uuid",
      "agent_name": "market_scanner",
      "symbol": "BTC",
      "signal": "BUY",
      "strength": 0.75,
      "reasoning": "Strong upward momentum...",
      "timeframe": "4h",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Strategies

### GET /api/strategies/portfolio

Paper trading portfolio summary.

**Response:**
```json
{
  "balance": 10250.50,
  "initial_balance": 10000.00,
  "total_pnl": 250.50,
  "total_pnl_percent": 2.51,
  "open_pnl": 50.25,
  "closed_pnl": 200.25,
  "open_positions": 2,
  "closed_positions": 8,
  "win_rate": 62.5,
  "positions": [...]
}
```

### GET /api/strategies/positions

Get open and closed positions.

### POST /api/strategies/start

Start a strategy. Body: `{"strategy": "momentum"}`

### POST /api/strategies/stop

Stop a strategy. Body: `{"strategy": "momentum"}`

---

## Providers

### GET /api/providers

List available AI providers.

**Response:**
```json
{
  "providers": ["fireworks", "gemini", "ollama", "openai"],
  "current": "fireworks",
  "model": "accounts/fireworks/routers/kimi-k2p5-turbo"
}
```

---

## Skills

### GET /api/skills

List registered skills.

**Response:**
```json
{
  "skills": [
    {
      "name": "market_data",
      "description": "Fetch current market prices...",
      "version": "1.0.0",
      "inputs": {...}
    }
  ]
}
```

---

## Logs

### GET /api/logs?limit=50

Get recent system logs.

---

## Market Data

### GET /api/market/prices?symbols=bitcoin,ethereum&source=coingecko

Fetch current market prices.

### GET /api/market/markets?source=coingecko

Fetch top markets.

---

## WebSocket

### WS /ws

Real-time event stream.

**Message types:**
```json
{"type": "signal", "data": {...}}
{"type": "agent_action", "data": {...}}
{"type": "log", "data": {...}}
{"type": "metric", "data": {...}}
```
