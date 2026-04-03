# Technology Selection Report

## AI Agent Platform - Technology Evaluation & Selection

---

## 1. AI Agent Frameworks

| Framework | Stars | Commit Freq | Docs | Production Use | Selected |
|-----------|-------|-------------|------|----------------|----------|
| LangChain | 98k+ | Daily | Excellent | Widely adopted | No |
| LangGraph | 8k+ | Daily | Good | Growing | No |
| CrewAI | 22k+ | Daily | Good | Growing | No |
| AutoGen | 35k+ | Weekly | Good | Microsoft-backed | No |

**Decision**: Custom lightweight runtime. Agent frameworks add significant dependency overhead and abstractions that constrain our architecture. Our use case (continuous market monitoring + tool calling) is better served by a purpose-built runtime with direct provider API calls.

**Reasoning**: We need fine-grained control over the agent loop, memory management, and skill execution. A custom runtime gives us full control while keeping dependencies minimal.

---

## 2. LLM Providers

| Provider | API Quality | Latency | Cost | Tool Calling | Selected |
|----------|-------------|---------|------|--------------|----------|
| Fireworks AI | OpenAI-compatible | Low | Competitive | Yes | Primary |
| Google Gemini | Native API | Medium | Free tier | Yes | Secondary |
| Ollama | Local | Varies | Free | Yes | Local dev |
| OpenAI | Standard | Low | Premium | Yes | Compatible |

**Decision**: Fireworks AI as primary provider using `accounts/fireworks/routers/kimi-k2p5-turbo` model. Pluggable abstraction supports all four.

**Reasoning**: Fireworks offers OpenAI-compatible API with competitive pricing and fast inference. The provider abstraction layer allows switching without code changes.

---

## 3. Crypto Data Providers

| Provider | API Quality | Rate Limits | WebSocket | Selected |
|----------|-------------|-------------|-----------|----------|
| CoinGecko | Excellent | Generous free | No | Primary |
| DexScreener | Good | Generous | No | DEX data |
| CryptoCompare | Good | Moderate | Yes | Secondary |

**Decision**: CoinGecko as primary, DexScreener for DEX data, CryptoCompare as fallback.

**Reasoning**: CoinGecko has the most comprehensive free API. DexScreener covers DEX pairs. All three are implemented as pluggable adapters.

---

## 4. Strategy Simulation

| Library | Stars | Use Case | Selected |
|---------|-------|----------|----------|
| Backtrader | 14k+ | Full backtesting | No |
| Zipline | 17k+ | Quantitative | No |
| Custom Engine | N/A | Paper trading | Yes |

**Decision**: Custom paper trading engine.

**Reasoning**: We only need paper trading (position tracking, PnL, stop loss/take profit). A custom engine is simpler and integrates directly with our signal system.

---

## 5. Task Orchestration

| Tool | Stars | Complexity | Selected |
|------|-------|------------|----------|
| Celery | 24k+ | Moderate | Yes |
| Temporal | 12k+ | High | No |
| Prefect | 17k+ | High | No |
| Arq | 2k+ | Low | No |

**Decision**: Celery with Redis broker.

**Reasoning**: Industry standard, well-documented, and integrates naturally with our Redis + Python stack.

---

## 6. Observability

| Tool | Purpose | Selected |
|------|---------|----------|
| structlog | Structured logging | Yes |
| Prometheus | Metrics (future) | Planned |
| Sentry | Error tracking (future) | Planned |

**Decision**: structlog for structured JSON logging, stored in PostgreSQL for the MVP.

---

## 7. Database

| Option | Purpose | Selected |
|--------|---------|----------|
| PostgreSQL | Primary data store | Yes |
| Redis | Cache, pub/sub, Celery broker | Yes |

**Decision**: PostgreSQL 16 + Redis 7.

---

## 8. Telegram Bot

| Framework | Stars | Async | Selected |
|-----------|-------|-------|----------|
| python-telegram-bot | 26k+ | Yes | Yes |
| aiogram | 5k+ | Yes | No |

**Decision**: python-telegram-bot v21+.

**Reasoning**: Larger community, better documentation, mature async support.

---

## 9. Real-time Messaging

| Technology | Complexity | Selected |
|------------|------------|----------|
| WebSockets (FastAPI native) | Low | Yes |
| Redis Pub/Sub | Low | Internal |
| Kafka | High | No |

**Decision**: FastAPI WebSockets for client communication, Redis Pub/Sub for internal messaging.

---

## 10. Dashboard Visualization

| Library | Stars | 3D Support | Selected |
|---------|-------|------------|----------|
| Three.js | 103k+ | Yes | Yes (3D) |
| Recharts | 24k+ | No | Yes (Charts) |
| Framer Motion | 24k+ | No | Yes (Animations) |

**Decision**: Three.js for 3D network visualization, Recharts for charts, Framer Motion for UI animations.

---

## Integration Plan

```
Frontend (Next.js + Three.js + Recharts + Framer Motion)
    |
    | WebSocket + REST API
    |
Backend (FastAPI + SQLAlchemy + Redis)
    |
    |-- Agent Runtime (Custom) --> Provider Abstraction --> Fireworks/Gemini/Ollama/OpenAI
    |-- Skill Registry --> Market Data / Signals / Risk / Backtest
    |-- Strategy Engine --> Paper Trading
    |-- Telegram Bot --> python-telegram-bot
    |
    |-- PostgreSQL (data) + Redis (cache/pubsub/celery)
```
