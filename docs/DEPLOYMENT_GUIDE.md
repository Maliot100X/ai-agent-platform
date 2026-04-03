# Deployment Guide

## Prerequisites

- Ubuntu 22.04+ server
- Python 3.12+
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

---

## Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/Maliot100X/ai-agent-platform.git
cd ai-agent-platform

# Copy environment files
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start all services
docker-compose up -d

# Dashboard: http://localhost:3000
# API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## Manual Ubuntu Deployment

### 1. Install Dependencies

```bash
sudo cp -r ai-agent-platform /opt/ai-agent-platform
cd /opt/ai-agent-platform

chmod +x scripts/*.sh
./scripts/install_dependencies.sh
```

### 2. Setup PostgreSQL

```bash
./scripts/setup_postgres.sh
```

### 3. Setup Redis

```bash
./scripts/setup_redis.sh
```

### 4. Configure Environment

```bash
cp backend/.env.example backend/.env
nano backend/.env
# Set your API keys:
# FIREWORKS_API_KEY=your_key
# TELEGRAM_BOT_TOKEN=your_token
# API_SECRET_KEY=random_secret
```

### 5. Start Backend

```bash
./scripts/start_backend.sh
```

### 6. Deploy as systemd Services (24/7)

```bash
./scripts/deploy_systemd.sh
```

### 7. Build & Deploy Frontend

```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend URL
npm install
npm run build
```

---

## Vercel Frontend Deployment

1. Push the repo to GitHub
2. Import `frontend/` directory in Vercel
3. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-backend-domain.com`
4. Deploy

---

## Service Management

```bash
# Check status
sudo systemctl status api-server
sudo systemctl status agent-runtime
sudo systemctl status celery-workers

# View logs
journalctl -u api-server -f
journalctl -u agent-runtime -f

# Restart
sudo systemctl restart api-server
```

---

## Health Check

```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": "0h 5m",
  "agents": 0,
  "provider": "fireworks",
  "model": "accounts/fireworks/routers/kimi-k2p5-turbo",
  "ws_clients": 0,
  "signals_count": 0,
  "skills": 6
}
```
