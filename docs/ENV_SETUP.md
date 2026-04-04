# Vercel Environment Variables Setup

Go to your Vercel project dashboard -> Settings -> Environment Variables and add the following.

## Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `MODEL_PROVIDER` | `vercel` | AI provider to use (vercel/fireworks/ollama/openai) |
| `MODEL_NAME` | `deepseek/deepseek-v3.2` | Model identifier for the selected provider |
| `VERCEL_API_KEY` | *(your Vercel AI Gateway key starting with vck_)* | Vercel AI Gateway API key |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (use `*` or your domain) |

## Telegram Bot

| Variable | Value | Description |
|----------|-------|-------------|
| `TELEGRAM_BOT_TOKEN` | *(your Telegram bot token)* | Telegram Bot API token |
| `TELEGRAM_ADMIN_CHAT_ID` | *(your Telegram user ID)* | Your Telegram user ID for admin commands |
| `TELEGRAM_CHANNEL_ID` | *(your channel/group ID)* | FLUXMINT AI Free Signals group ID |

### Setting Up the Telegram Webhook

After deploying to Vercel, set the webhook by calling:

```bash
curl -X POST https://YOUR-DOMAIN.vercel.app/_/backend/api/telegram/set-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-DOMAIN.vercel.app/_/backend/api/telegram/webhook"}'
```

Or directly via Telegram API:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://YOUR-DOMAIN.vercel.app/_/backend/api/telegram/webhook"
```

## Solana / DeFi APIs

| Variable | Value | Description |
|----------|-------|-------------|
| `BIRDEYE_API_KEY` | *(get from birdeye.so)* | Birdeye API v3 key for Solana token data |
| `HELIUS_API_KEY` | *(get from helius.dev)* | Helius RPC key for on-chain Solana data |
| `HELIUS_API_KEY_2` | *(optional backup)* | Secondary Helius key for rate limit rotation |
| `HELIUS_API_KEY_3` | *(optional backup)* | Tertiary Helius key for rate limit rotation |

### Getting Free API Keys

**Birdeye** (https://birdeye.so):
1. Go to https://bds.birdeye.so
2. Sign up for a free account
3. Navigate to API Keys section
4. Generate a new API key
5. Free tier: 100 requests/minute

**Helius** (https://helius.dev):
1. Go to https://dev.helius.xyz
2. Sign up with GitHub
3. Create a new project
4. Copy your API key
5. Free tier: 100,000 credits/month

## Optional Provider Keys

| Variable | Value | Description |
|----------|-------|-------------|
| `FIREWORKS_API_KEY` | *(your Fireworks AI key)* | Fireworks AI API key |
| `OPENAI_API_KEY` | *(your key)* | OpenAI API key (if using openai provider) |
| `GEMINI_API_KEY` | *(your key)* | Google Gemini API key |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama base URL (local only, not for Vercel) |

## Database (Optional - for persistent storage)

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL connection string |
| `DATABASE_SYNC_URL` | `postgresql://...` | Sync PostgreSQL connection string |
| `REDIS_URL` | `redis://...` | Redis connection string |

**Note**: The platform works without database/Redis - it uses in-memory storage on Vercel serverless. For persistent data, add a Vercel Postgres or Neon database.

## Application Settings

| Variable | Value | Description |
|----------|-------|-------------|
| `API_SECRET_KEY` | *(random string)* | Secret key for API authentication |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG/INFO/WARNING/ERROR) |
| `ENABLE_METRICS` | `true` | Enable Prometheus metrics |

## Quick Setup Checklist

1. [ ] Set `MODEL_PROVIDER=vercel`
2. [ ] Set `MODEL_NAME=deepseek/deepseek-v3.2`
3. [ ] Set `VERCEL_API_KEY` with your Vercel AI Gateway key
4. [ ] Set `TELEGRAM_BOT_TOKEN` for the Telegram bot
5. [ ] Set `TELEGRAM_ADMIN_CHAT_ID` with your user ID
6. [ ] Set `TELEGRAM_CHANNEL_ID` for the signals group
7. [ ] Set `BIRDEYE_API_KEY` for Solana token data
8. [ ] Set `HELIUS_API_KEY` for on-chain wallet analysis
9. [ ] Set `CORS_ORIGINS=*`
10. [ ] Deploy and set Telegram webhook
11. [ ] Test `/status` command in Telegram
12. [ ] Test the floating bot on the web dashboard

## Vercel Project Settings

Make sure these are configured in your Vercel project:

- **Root Directory**: `./` (project root)
- **Framework**: Auto-detected (Next.js for frontend, Python for backend)
- **Build Command**: Auto (handled by experimentalServices)
- **Node.js Version**: 20.x
- **Python Version**: 3.12

The `vercel.json` at the project root defines the multi-service setup:

```json
{
  "experimentalServices": {
    "frontend": {
      "entrypoint": "frontend",
      "routePrefix": "/",
      "framework": "nextjs"
    },
    "backend": {
      "entrypoint": "backend",
      "routePrefix": "/_/backend"
    }
  }
}
```

Frontend routes `/api/*` are rewritten to `/_/backend/api/*` via `frontend/vercel.json`.
