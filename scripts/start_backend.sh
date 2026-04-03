#!/bin/bash
set -euo pipefail

echo "=== Starting AI Agent Platform Backend ==="

cd /opt/ai-agent-platform
source venv/bin/activate
export PYTHONPATH=/opt/ai-agent-platform

# Run database migrations
echo "Running database migrations..."
# alembic upgrade head  # Uncomment when migrations are set up

# Start the API server
echo "Starting FastAPI server on port 8000..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000
