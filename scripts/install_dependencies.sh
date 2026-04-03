#!/bin/bash
set -euo pipefail

echo "=== AI Agent Platform - Dependency Installation ==="

# System packages
echo "[1/5] Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  python3.12 python3.12-venv python3-pip \
  postgresql-16 postgresql-client-16 \
  redis-server \
  nodejs npm \
  curl git build-essential

# Python virtual environment
echo "[2/5] Creating Python virtual environment..."
cd /opt/ai-agent-platform
python3.12 -m venv venv
source venv/bin/activate

# Python dependencies
echo "[3/5] Installing Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# Node dependencies (frontend)
echo "[4/5] Installing Node.js dependencies..."
cd frontend
npm install
cd ..

# Create agent user if not exists
echo "[5/5] Setting up agent user..."
if ! id -u agent &>/dev/null; then
  sudo useradd -r -m -s /bin/bash agent
fi
sudo chown -R agent:agent /opt/ai-agent-platform

echo "=== Dependencies installed successfully ==="
