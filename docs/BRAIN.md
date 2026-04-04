# FLUXMINT AI Trading Brain - Complete Documentation

## Overview

The FLUXMINT AI Trading Brain is an autonomous AI-powered trading intelligence system built on Solana. It combines real-time market data from multiple sources with AI analysis to provide actionable trading signals, wallet analysis, and market intelligence.

**No restrictions. Raw market data. Direct trading signals.**

## Architecture

```
User (Web / Telegram / API)
    |
    v
FastAPI Backend (Vercel Serverless)
    |
    +-- AI Provider Layer (Vercel AI Gateway / DeepSeek / Fireworks / Ollama)
    |
    +-- Trading Brain Service
    |       +-- Birdeye API v3 (Token prices, OHLCV, security)
    |       +-- Helius RPC (Wallet analysis, on-chain data)
    |       +-- DexScreener (DEX pair data)
    |       +-- CoinGecko (Global market data)
    |       +-- PumpFun API (Meme token launches)
    |
    +-- Skill Registry
    |       +-- MarketDataSkill
    |       +-- SignalGenerationSkill
    |       +-- RiskAnalysisSkill
    |       +-- StrategyBacktestSkill
    |       +-- NewsSentimentSkill
    |       +-- WalletTrackingSkill
    |       +-- PumpFunSkill
    |
    +-- Agent Manager
            +-- Autonomous agents with configurable goals
            +-- Paper trading engine
```

## AI Providers

### Vercel AI Gateway (Primary)
- **Model**: deepseek/deepseek-v3.2
- **Base URL**: https://ai-gateway.vercel.sh/v1
- **Auth**: Bearer token (VERCEL_API_KEY)
- **Endpoint**: /v1/chat/completions
- **Supports**: Chat completions, streaming, tool/function calling
- **Docs**: https://vercel.com/docs/ai-gateway

### Fireworks AI
- **Model**: accounts/fireworks/routers/kimi-k2p5-turbo
- **Base URL**: https://api.fireworks.ai/inference/v1
- **Auth**: Bearer token (FIREWORKS_API_KEY)
- **OpenAI-compatible API**

### Ollama (Local)
- **Base URL**: http://localhost:11434
- **Endpoint**: /api/chat
- **No API key required**
- **Runs local models**: llama3.1, mistral, codellama, etc.

### OpenAI Compatible
- **Configurable base URL**
- **Standard OpenAI API format**

## Trading Brain Capabilities

### 1. Token Analysis
Analyzes any Solana token by address:
- Real-time price from Birdeye API v3
- Supplementary data from DexScreener
- Volume/Liquidity ratio analysis
- Security audit (mutable metadata, freeze authority, top holder concentration)
- Automatic BUY/SELL/HOLD signal with entry/TP/SL levels

### 2. Signal Generation
Generates trading signals based on:
- Volume/Liquidity ratio (>5x = strong momentum)
- Liquidity depth (>$100k = adequate, >$500k = strong)
- Market cap validation
- 5-point strength scoring system

Signal output:
```
Type: BUY/SELL/HOLD
Strength: 0-5
Entry: current price
Take Profit: +15% (BUY), +10% (HOLD), +5% (SELL)
Stop Loss: -8% (BUY), -5% (HOLD), -3% (SELL)
Reasoning: detailed analysis text
```

### 3. Wallet Analysis (Helius RPC)
- SOL balance
- All SPL token holdings via DAS API
- Recent transaction history
- Token account enumeration

### 4. PumpFun Integration
Real-time access to PumpFun Solana meme token launchpad:
- New token launches (sorted by creation time)
- Trending tokens (sorted by market cap)
- King of the Hill tokens (highest bonding curve progress)
- Graduated tokens (completed bonding curve, migrated to Raydium)
- Token search by name/symbol
- Detailed token info with bonding curve status

PumpFun API endpoints used:
- `https://frontend-api-v3.pump.fun/coins` - Token listings
- `https://frontend-api-v3.pump.fun/coins/king-of-the-hill` - Top tokens
- `https://frontend-api-v3.pump.fun/coins/{address}` - Token details

### 5. Market Summary (CoinGecko)
- Total crypto market cap
- 24h volume
- BTC/ETH dominance
- Market cap change percentage
- Active cryptocurrencies count

### 6. Trending Tokens
Aggregates trending data from:
- Birdeye trending tokens API
- DexScreener new Solana pairs
- Cross-referenced for accuracy

## API Endpoints

### AI Chat
```
POST /api/chat
Body: { "message": "analyze SOL", "provider": "vercel", "include_market_data": true }
Response: { "response": "...", "provider": "vercel", "model": "deepseek/deepseek-v3.2" }
```

### Trading Brain
```
GET  /api/trading/summary          - Global market summary
GET  /api/trading/analyze/{addr}   - Analyze a specific token
GET  /api/trading/wallet/{addr}    - Analyze a wallet
GET  /api/trading/trending         - Trending tokens
GET  /api/trading/pumpfun/launches - Latest PumpFun launches
```

### PumpFun
```
GET /api/pumpfun/new_tokens        - New token launches
GET /api/pumpfun/trending          - Trending by market cap
GET /api/pumpfun/king_of_hill      - King of the Hill tokens
GET /api/pumpfun/graduated         - Graduated tokens
GET /api/pumpfun/token_info?token_address=xxx - Token details
GET /api/pumpfun/search?query=xxx  - Search tokens
```

### Signals
```
GET /api/signals              - Historical signals
GET /api/signals/latest       - Live signals from trending tokens
```

### Agents
```
GET    /api/agents             - List agents
POST   /api/agents             - Create agent
POST   /api/agents/{id}/start  - Start agent
POST   /api/agents/{id}/stop   - Stop agent
DELETE /api/agents/{id}        - Remove agent
```

### System
```
GET  /api/health     - System health
GET  /api/providers  - Available AI providers
GET  /api/skills     - Registered skills
GET  /api/logs       - System logs
```

### Telegram
```
POST /api/telegram/webhook      - Webhook for Telegram updates
POST /api/telegram/set-webhook  - Set webhook URL
```

## Telegram Bot Commands

| Command | Description |
|---------|-------------|
| /start | Welcome message with command list |
| /status | System health and uptime |
| /agents | List active trading agents |
| /signals | Latest trading signals with entry/TP/SL |
| /trending | Trending tokens from multiple sources |
| /pumpfun | New PumpFun token launches |
| /analyze <address> | Full token analysis with signal |
| /wallet <address> | Wallet portfolio analysis |
| /ai <question> | AI chat with trading brain context |
| /market | Global market summary |

Any non-command message is treated as an AI chat query with live market data context.

## Floating Bot (Frontend)

The web dashboard includes a floating AI bot accessible from any page. It supports all the same commands as the Telegram bot plus direct AI chat. The bot panel shows:
- Real-time connection status
- Message history with proper formatting
- Command autocomplete hints
- Loading states during API calls

## Skill Registry

Skills are self-contained capabilities that agents can invoke through tool-calling:

| Skill | Description |
|-------|-------------|
| market_data | Fetch prices from CoinGecko, DexScreener, CryptoCompare |
| signal_generation | Generate BUY/SELL/HOLD signals with technical analysis |
| risk_analysis | Assess risk levels for tokens and portfolios |
| strategy_backtest | Backtest trading strategies against historical data |
| news_sentiment | Analyze crypto news sentiment |
| wallet_tracking | Track wallet activity and holdings |
| pumpfun | PumpFun meme token launchpad integration |

## Data Sources

| Source | What It Provides | Auth |
|--------|-----------------|------|
| Birdeye API v3 | Solana token prices, OHLCV, security, trending | API Key (X-API-KEY header) |
| Helius RPC | Wallet assets, balances, transactions, DAS API | API Key (query param) |
| DexScreener | DEX pair data, new pairs, search | Free (no key) |
| CoinGecko | Global market data, token prices | Free tier |
| PumpFun | Meme token launches, bonding curves, graduation | Free (no key) |
| CryptoCompare | Historical data, market pairs | Free tier |

## Agent System

Agents are autonomous AI entities that:
1. Run continuously with a defined goal
2. Use the AI provider for reasoning
3. Invoke skills through tool-calling
4. Generate signals based on analysis
5. Log all actions for transparency

Agent configuration:
```json
{
  "name": "SOL-Scanner",
  "goal": "Monitor Solana ecosystem for high-momentum tokens",
  "provider": "vercel",
  "model": "deepseek/deepseek-v3.2",
  "skills": ["market_data", "signal_generation", "pumpfun", "risk_analysis"],
  "config": {
    "scan_interval": 60,
    "min_liquidity": 50000,
    "signal_threshold": 3
  }
}
```

## Paper Trading Engine

Built-in paper trading for strategy validation:
- Virtual portfolio with configurable starting balance
- Open/close positions based on signals
- Track P&L, win rate, and performance metrics
- No real funds at risk during testing
