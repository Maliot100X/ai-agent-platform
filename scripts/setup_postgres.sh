#!/bin/bash
set -euo pipefail

echo "=== Setting up PostgreSQL ==="

# Start PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql -c "CREATE USER agent_user WITH PASSWORD 'agent_pass';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE agent_platform OWNER agent_user;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE agent_platform TO agent_user;"

echo "=== PostgreSQL setup complete ==="
echo "Connection: postgresql://agent_user:agent_pass@localhost:5432/agent_platform"
