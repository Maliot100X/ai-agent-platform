#!/bin/bash
set -euo pipefail

echo "=== Deploying systemd services ==="

# Copy service files
sudo cp infra/systemd/api-server.service /etc/systemd/system/
sudo cp infra/systemd/agent-runtime.service /etc/systemd/system/
sudo cp infra/systemd/celery-workers.service /etc/systemd/system/

# Reload and enable
sudo systemctl daemon-reload
sudo systemctl enable api-server agent-runtime celery-workers
sudo systemctl start api-server agent-runtime celery-workers

echo "=== Services deployed ==="
echo ""
echo "Check status:"
echo "  sudo systemctl status api-server"
echo "  sudo systemctl status agent-runtime"
echo "  sudo systemctl status celery-workers"
echo ""
echo "View logs:"
echo "  journalctl -u api-server -f"
echo "  journalctl -u agent-runtime -f"
