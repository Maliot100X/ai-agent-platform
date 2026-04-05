# AI Agent Platform - Complete Project History

> Full timeline of everything built from day one. Use this as context for any future work.

---

## Project Overview

**Repository**: [Maliot100X/ai-agent-platform](https://github.com/Maliot100X/ai-agent-platform)
**Started**: April 3, 2026
**Stack**: Next.js 15 + TypeScript frontend, Python/FastAPI backend (backend abandoned for Vercel API routes), Supabase DB, Deepgram Voice, Telegram Bot, Three.js 3D visuals
**Deployed on**: Vercel (frontend only, backend converted to Next.js API routes)

---

## Phase 1: Initial Build (April 3, 2026)

### Commit `00fb02a` - Initial commit - project setup
- Empty repo scaffolding

### Commit `a7ef3f4` / `c680850` - Complete AI agent platform - all 15 phases
- **79 files, ~5600 lines** built in one shot
- **Backend (Python/FastAPI)**:
  - Provider Abstraction Layer: Fireworks AI, Google Gemini, Ollama, OpenAI compatible
  - Agent Runtime: continuous scan/analyze/reason/act/broadcast loop
  - Skill Plugin System: 6 skills (market_data, signal_generation, risk_analysis, strategy_backtest, news_sentiment, wallet_tracking)
  - Market Data Layer: CoinGecko, DexScreener, CryptoCompare adapters
  - Paper Trading Engine: positions, PnL, stop-loss/take-profit
  - 3 Strategies: Momentum, Mean Reversion, Breakout
  - Telegram Bot: full command interface
  - WebSocket real-time broadcasting
  - PostgreSQL + Redis layer
- **Frontend (Next.js 15)**:
  - 7 pages: Dashboard, Agents, Signals, Strategies, Logs, Models, Settings
  - Three.js 3D network graph
  - Recharts performance charts
  - Framer Motion animations
  - WebSocket real-time updates
  - TailwindCSS dark theme
- **Infrastructure**: Docker Compose, systemd services, deployment scripts
- **Documentation**: Architecture docs, API Reference, Deployment Guide, Developer Guide

### PR #1 (closed, not merged) - feat: Complete AI Agent Platform - All 15 Phases
- This was the original PR but was superseded by direct commits

### PR #3 (open, not merged) - fix: add Vercel multi-service deployment configuration
- Commit `c563b11` / `603ced4` - Added vercel.json for multi-service deploy

---

## Phase 2: Vercel Deployment Fixes (April 4, 2026)

### PR #5 (merged) - Full platform upgrade - Vercel AI Gateway, PumpFun, Trading Brain, Floating Bot
- Commit `c3c280f` - feat: full platform upgrade
  - Added Vercel AI Gateway provider
  - PumpFun integration for Solana token launches
  - Trading Brain logic
  - Floating bot UI component
- Commit `906aa21` - fix: update frontend
  - Vercel provider as default
  - FLUXMINT branding
  - Live status indicators

### Backend Deployment Struggles (multiple commits):
- `ed61892` - fix: CORS errors, API routing, React hydration
- `d0ec15b` - fix: build error, ClientBot wrapper for ssr:false, logs page
- `9a97295` - feat: add logs page
- `fd26ac2` - fix: backend serverless crash, strip heavy deps
- `52fb277` - fix: backend serverless module path resolution
- `db442dd` - debug: catch startup errors in health endpoint
- `b52617f` - debug: raw ASGI fallback to diagnose Vercel runtime
- `2723b95` - fix: remove builds config, use Vercel auto-detect

### The Big Pivot: Backend to Next.js API Routes
- `63e8805` - **feat: convert backend to Next.js API routes**
  - Abandoned Python/FastAPI backend for Vercel deployment
  - All API logic moved to `frontend/src/app/api/` routes
  - This was the key fix that made Vercel deployment work
- `730b8fd` - fix: restore experimentalServices (frontend-only)

---

## Phase 3: Major Platform Upgrade (April 4, 2026)

### Commit `d8bb9a5` (current default branch `feature/complete-platform`)
- feat: major upgrade - launchpad, skills, agents, telegram, signals
- Added:
  - `/launchpad` page - PumpFun token launcher
  - `/skills` page - skill management UI
  - Enhanced `/agents` page with create/manage
  - Telegram webhook improvements
  - `/signals` page with live feed

### PR #8 (merged) - Full platform upgrade v2
- Commit `4a33ad6` - feat: major platform upgrade
  - PumpFun signals integration
  - Agent persistence (cookie-based)
  - 3D animated background
  - Skills page
  - Telegram bot improvements
- Commit `6151848` - fix: proxy PumpFun API through server routes
  - Cookie-based agent persistence
  - Full token data display

---

## Phase 4: Supabase + Real Trading Engine (April 4, 2026)

### PR #10 (merged) - Supabase persistence, skills add-to-agent, PumpFun filter, Telegram /pullagent
- Commit `d95be64`:
  - Supabase integration for persistent storage
  - Skills can be added to agents
  - PumpFun date filter
  - Telegram `/pullagent` command
  - `frontend/src/lib/supabase.ts` created

### PR #11 (merged) - Supabase settings, agent logs, improved UI
- Commit `3ea6771`:
  - Settings save to Supabase
  - Agent activity logs
  - Settings API route
  - Logs with agent filter

### PR #12 (merged) - Agent trading engine with real PumpFun buy/sell
- Commit `0d072bb`:
  - Real buy/sell logic with PumpFun data
  - Balance tracking per agent
  - Auto-tick system (`/api/agents/tick`)
  - Agent store (`frontend/src/lib/agentStore.ts`)

### PR #13 (merged) - Supabase connection fix
- Commit `c8e6f2d`:
  - Hardcoded Supabase URL/key as fallback
  - Fixed `storage:memory` issue on Vercel

### PR #14 (merged) - Live P&L tracking, real portfolio
- Commit `9f523fe`:
  - Live P&L tracking
  - Real portfolio from agent data
  - Positions derived from holdings

### Additional fix on the branch:
- Commit `6f7fb48` - fix: agents buy NEW diverse tokens, DexScreener for graduating tab
- Commit `96ce12c` - fix: hardcode Telegram bot token, sell buttons, strategies shows agents

---

## Phase 5: Voice Agent - Deepgram Integration (April 4, 2026)

### PR #15 (merged) - Deepgram Voice Agent
- Commit `be35c01` - feat: Deepgram Voice Agent integration
  - Real-time voice trading assistant
  - `/voice-agent` page
  - Deepgram WebSocket connection
  - `/api/deepgram/token` route
  - `CryptoPlanet.tsx` 3D component

### Multiple fixes to get Deepgram working correctly:
- `454388d` / `64ff7f7` - fix: WS auth, binaryType, fallback auth
- `4e61a8d` - fix: Settings format (type Settings, 48kHz, provider objects)
- `617be4e` - fix: correct WebSocket URL (`wss://agent.deepgram.com/v1/agent/converse`)
- `c27adbc` - fix: remove language field, use flux-general-en model
- `eac302f` - fix: better voice model (aura-2-iris-en), buffered audio
- `03017c9` - feat: Stella voice, Claude Sonnet 4.6, crypto planet 3D
- `98ebe80` - fix: correct Stella voice model name
- `4232114` - feat: improved audio buffering, crypto ticker planet, Telegram /tts

**Current main HEAD**: `4232114` (this is the deployed state)

---

## Phase 6: Comprehensive Fixes (PR #16 - OPEN DRAFT)

### PR #16 (open, draft) - fix: comprehensive platform fixes
- Branch: `feature/comprehensive-platform-fixes`
- Commit `fa1ae1b`
- **10 files changed, +592 / -450 lines**

#### What PR #16 fixes:
1. **Voice Agent**: Deepgram settings corrected (open_ai/gpt-4o-mini for think, flux-general-en v2 for listen, aura-2-iris-en for speak), 250ms audio buffering
2. **Telegram Bot**: Hardcoded DEEPGRAM_API_KEY, /pullagent shows holdings with P&L, /signals tries agent logs first, improved /start layout
3. **3D CryptoPlanet**: 8 crypto tickers (BTC/ETH/SOL/PUMP/DOGE/AVAX/LINK/MATIC), glow spheres, 3 orbital rings, 120 particles
4. **Graduated Tab**: DexScreener + PumpFun combined for real graduated tokens
5. **Auto-Refresh**: All pages auto-refresh every 5 minutes with manual refresh button
6. **Signals Page**: Real agent trade logs from Supabase first, falls back to PumpFun
7. **Dashboard**: Running Agents quick view, total balance/holdings stats
8. **OG Share Image**: Better Twitter preview cards
9. **Deepgram Token**: Hardcoded API key fallback

---

## Current Codebase Structure (on main)

### Pages (11 total):
| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Overview with stats, agent activity |
| Agents | `/agents` | Create/manage AI trading agents |
| Launchpad | `/launchpad` | PumpFun token launches (New/Graduating/Graduated tabs) |
| Signals | `/signals` | Trading signals feed |
| Strategies | `/strategies` | Strategy management |
| Voice Agent | `/voice-agent` | Deepgram real-time voice assistant |
| Skills | `/skills` | Agent skill plugins |
| Settings | `/settings` | Platform configuration |
| Logs | `/logs` | Agent activity logs |
| Models | `/models` | AI model providers |

### API Routes (18 total):
| Route | Description |
|-------|-------------|
| `/api/agents` | CRUD for agents (Supabase) |
| `/api/agents/tick` | Auto-trading tick (buy/sell logic) |
| `/api/chat` | AI chat completions |
| `/api/deepgram/token` | Deepgram API key for voice agent |
| `/api/health` | Health check |
| `/api/logs` | Agent activity logs |
| `/api/og` | OpenGraph image generation |
| `/api/providers` | AI provider list |
| `/api/pumpfun/coins` | PumpFun + DexScreener token data |
| `/api/settings` | Settings CRUD (Supabase) |
| `/api/signals` | Trading signals |
| `/api/strategies/portfolio` | Portfolio data |
| `/api/strategies/positions` | Position tracking |
| `/api/strategies/start` | Start strategy execution |
| `/api/telegram/webhook` | Telegram bot webhook |
| `/api/trading/pumpfun/launches` | PumpFun launch data |
| `/api/trading/summary` | Trading summary |
| `/api/trading/trending` | Trending tokens |

### Key Components:
| Component | Description |
|-----------|-------------|
| `CryptoPlanet.tsx` | Three.js 3D rotating planet with crypto tickers |
| `AnimatedBackground.tsx` | Three.js particle background |
| `Sidebar.tsx` | Navigation sidebar |
| `FloatingBot.tsx` | Floating chat bot widget |
| `StatCard.tsx` | Dashboard stat cards |
| `SignalFeed.tsx` | Real-time signal feed |
| `PerformanceChart.tsx` | Recharts performance charts |
| `NetworkGraph.tsx` | Three.js network visualization |

### Key Libraries:
| Library | Description |
|---------|-------------|
| `supabase.ts` | Supabase client with hardcoded fallback credentials |
| `agentStore.ts` | In-memory agent state management |
| `api.ts` | API client utilities |
| `useWebSocket.ts` | WebSocket hook |

### External Services:
| Service | Usage |
|---------|-------|
| **Supabase** | Database (agents, settings, logs tables) |
| **Deepgram** | Voice agent (STT/TTS/LLM) |
| **Telegram** | Bot commands (/start, /agents, /signals, /tts, /pullagent, etc.) |
| **PumpFun** | Solana token launch data |
| **DexScreener** | Token price/volume data |
| **Vercel** | Hosting + serverless functions |

---

## Hardcoded Credentials (in source code as fallbacks)

These are hardcoded in the source as fallbacks when env vars are missing on Vercel:
- Supabase URL + anon key (in `supabase.ts`)
- Telegram bot token (in `webhook/route.ts`)
- Deepgram API key (in `deepgram/token/route.ts`)

---

## Open PRs

| PR | Status | Description |
|----|--------|-------------|
| #3 | Open | Vercel multi-service deployment config (stale, superseded) |
| #9 | Open | ECC bundle from ecc-tools bot (automated, not relevant) |
| #16 | Open (Draft) | Comprehensive fixes (voice, telegram, signals, refresh, 3D) |

---

## What's Deployed (main branch = commit 4232114)

Everything through PR #15 is merged to main and deployed. PR #16 is a draft with additional fixes not yet merged.

### Known Issues on Current Main:
1. Voice agent may disconnect (Deepgram settings format issues - fixed in PR #16)
2. Graduated tab doesn't show real graduated tokens (fixed in PR #16 with DexScreener)
3. No auto-refresh on pages (fixed in PR #16)
4. Signals page shows PumpFun scan data, not real agent trades (fixed in PR #16)
5. Dashboard doesn't show running agent data (fixed in PR #16)
6. /tts Telegram command may fail without DEEPGRAM_API_KEY env var (fixed in PR #16)

---

## Timeline Summary

```
Apr 3  00fb02a  Initial commit
Apr 3  a7ef3f4  Complete platform (79 files, 5600 lines)
Apr 4  PR #5    Vercel AI Gateway, PumpFun, Trading Brain
Apr 4  63e8805  PIVOT: Backend converted to Next.js API routes
Apr 4  d8bb9a5  Major upgrade: launchpad, skills, agents, telegram
Apr 4  PR #8    PumpFun signals, agent persistence, 3D background
Apr 4  PR #10   Supabase persistence, /pullagent
Apr 4  PR #11   Settings to Supabase, agent logs
Apr 4  PR #12   Agent trading engine (real buy/sell with PumpFun)
Apr 4  PR #13   Supabase connection fix (hardcoded fallback)
Apr 4  PR #14   Live P&L tracking, real portfolio
Apr 4  PR #15   Deepgram Voice Agent (8 fix commits to get working)
Apr 4  PR #16   Comprehensive fixes (DRAFT, not merged)
```
