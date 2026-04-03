#!/bin/bash
set -euo pipefail

echo "=== Starting Celery Workers ==="

cd /opt/ai-agent-platform
source venv/bin/activate
export PYTHONPATH=/opt/ai-agent-platform

celery -A backend.services.tasks worker --loglevel=info --concurrency=4
