#!/bin/bash
set -euo pipefail

echo "=== Setting up Redis ==="

sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify
redis-cli ping

echo "=== Redis setup complete ==="
