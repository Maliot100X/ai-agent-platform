# AI Agent Platform

**Production-grade autonomous AI analysis platform with multi-LLM support, paper trading, and real-time dashboard.**

```
     _    ___      _                    _     ____  _       _    __                      
    / \  |_ _|    / \   __ _  ___ _ __ | |_  |  _ \| | __ _| |_ / _| ___  _ __ _ __ ___  
   / _ \  | |    / _ \ / _` |/ _ \ '_ \| __| | |_) | |/ _` | __| |_ / _ \| '__| '_ ` _ \ 
  / ___ \ | |   / ___ \ (_| |  __/ | | | |_  |  __/| | (_| | |_|  _| (_) | |  | | | | | |
 /_/   \_\___|_/_/   \_\__, |\___|_| |_|\__| |_|   |_|\__,_|\__|_|  \___/|_|  |_| |_| |_|
                        |___/                                                               
```

---

## What is this?

An AI-driven autonomous analysis platform that:

- Runs **autonomous AI agents** that continuously monitor crypto markets
- Generates **trading signals** using multi-LLM reasoning (Fireworks AI, Gemini, Ollama, OpenAI)
- Simulates trades with a **paper trading engine** (no real money)
- Provides a **real-time dashboard** with 3D visualizations
- Offers **Telegram bot** control for remote monitoring
- Uses an **extensible skill/plugin system** for agent capabilities

**This is paper trading only. No real trades are executed.**

---

## Architecture

```
Dashboard (Next.js + Three.js)  <-->  FastAPI Backend  <-->  AI Providers
         |                                    |
    WebSocket                          Agent Runtime
                                           |
                                    Skill Registry
                                    /      |      \
                              Market    Signals    Risk
                               Data   Generation  Analysis
                                           |
                                    Paper Trading
                                      Engine
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python, FastAPI, SQLAlchemy, Celery |
| **AI Providers** | Fireworks AI, Google Gemini, Ollama, OpenAI |
| **Database** | PostgreSQL 16, Redis 7 |
| **Frontend** | Next.js 15, TypeScript, TailwindCSS |
| **Visualizations** | Three.js, Recharts, Framer Motion |
| **Bot** | python-telegram-bot |
| **Infrastructure** | Docker, systemd, Vercel |

---

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/Maliot100X/ai-agent-platform.git
cd ai-agent-platform

# Configure
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Launch
docker-compose up -d

# Dashboard: http://localhost:3000
# API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Setup

```bash
# Backend
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## Features

### Multi-LLM Provider System
- **Fireworks AI** - Primary provider (kimi-k2p5-turbo)
- **Google Gemini** - Secondary provider
- **Ollama** - Local inference
- **OpenAI Compatible** - Any OpenAI-spec API

All providers implement: `generate()`, `stream()`, `tool_call()`

### Autonomous Agent Runtime
- Continuous execution loop: scan -> analyze -> reason -> act -> broadcast
- Per-agent memory, conversation history, and tool call tracking
- LLM-driven reasoning with function/tool calling
- Configurable loop interval and skills

### Skill Plugin System
| Skill | Description |
|-------|-------------|
| `market_data` | Fetch prices from CoinGecko, DexScreener, CryptoCompare |
| `signal_generation` | AI-powered buy/sell/hold signal generation |
| `risk_analysis` | Portfolio and position risk assessment |
| `strategy_backtest` | Historical strategy simulation |
| `news_sentiment` | AI-driven crypto sentiment analysis |
| `wallet_tracking` | On-chain wallet monitoring |

### Paper Trading Engine
- Position tracking (long/short)
- Real-time PnL calculation
- Stop loss and take profit
- Risk limits
- Three built-in strategies: Momentum, Mean Reversion, Breakout

### Real-time Dashboard
- Live signal feed
- Agent activity timeline
- 3D agent network visualization (Three.js)
- Strategy performance charts
- WebSocket-powered real-time updates
- Animated UI with Framer Motion

### Telegram Bot
Commands: `/start`, `/status`, `/agents`, `/models`, `/signals`, `/logs`, `/dashboard`, `/run_strategy`, `/stop_strategy`

---

## Project Structure

```
ai-agent-platform/
  backend/
    agents/          # Agent runtime & manager
    skills/          # Extensible skill plugins
    providers/       # Multi-LLM abstraction (Fireworks, Gemini, Ollama, OpenAI)
    services/        # Market data, WebSocket, logging
    telegram/        # Telegram bot
    strategies/      # Paper trading engine + strategies
    database/        # PostgreSQL models & migrations
    config.py        # Environment configuration
    main.py          # FastAPI entry point
  frontend/
    src/app/         # Next.js pages (overview, agents, signals, strategies, logs, models, settings)
    src/components/  # React components (Three.js graph, charts, timeline)
    src/lib/         # API client, WebSocket hook
  infra/             # Docker + systemd services
  scripts/           # Deployment scripts
  docs/              # Full documentation
  docker-compose.yml
```

---

## Documentation

- [Technology Selection Report](docs/TECHNOLOGY_SELECTION_REPORT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [API Reference](docs/API_REFERENCE.md)

---

## Environment Variables

```env
# AI Provider
MODEL_PROVIDER=fireworks
MODEL_NAME=accounts/fireworks/routers/kimi-k2p5-turbo
FIREWORKS_API_KEY=your_key

# Database
DATABASE_URL=postgresql+asyncpg://agent_user:agent_pass@localhost:5432/agent_platform

# Redis
REDIS_URL=redis://localhost:6379/0

# Telegram
TELEGRAM_BOT_TOKEN=your_token

# API
API_SECRET_KEY=random_secret
```

See `backend/.env.example` for full configuration.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | System health |
| GET/POST | `/api/agents` | List/create agents |
| POST | `/api/agents/{id}/start` | Start agent |
| GET | `/api/signals` | Trading signals |
| GET | `/api/strategies/portfolio` | Portfolio summary |
| GET | `/api/providers` | Available LLM providers |
| GET | `/api/skills` | Registered skills |
| WS | `/ws` | Real-time updates |

Full API documentation: [API Reference](docs/API_REFERENCE.md)

---

## Ubuntu Server Deployment

```bash
# Install everything
./scripts/install_dependencies.sh
./scripts/setup_postgres.sh
./scripts/setup_redis.sh

# Deploy as 24/7 services
./scripts/deploy_systemd.sh

# Check status
sudo systemctl status api-server agent-runtime celery-workers
```

---

## Vercel Frontend Deployment

1. Import the `frontend/` directory in Vercel
2. Set `NEXT_PUBLIC_API_URL` environment variable
3. Deploy

---

## License

MIT
