-- FLUXMINT AI Agent Platform - Supabase Schema
-- Run this ENTIRE block in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT DEFAULT '',
  provider TEXT DEFAULT 'vercel',
  model TEXT DEFAULT 'deepseek/deepseek-v3.2',
  status TEXT DEFAULT 'idle',
  skills TEXT[] DEFAULT '{}',
  max_tokens INTEGER DEFAULT 3,
  balance NUMERIC DEFAULT 10000,
  min_buy NUMERIC DEFAULT 50,
  holdings JSONB DEFAULT '[]',
  signals_generated INTEGER DEFAULT 0,
  trades_executed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT DEFAULT 'idle',
  started_at TIMESTAMPTZ,
  trades INTEGER DEFAULT 0,
  pnl NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_logs (
  id BIGSERIAL PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  symbol TEXT,
  mint TEXT,
  price NUMERIC,
  amount NUMERIC,
  market_cap NUMERIC,
  signal_type TEXT,
  strength INTEGER,
  reasoning TEXT,
  pnl NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns if tables already exist
DO $$ BEGIN
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 10000;
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS min_buy NUMERIC DEFAULT 50;
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS holdings JSONB DEFAULT '[]';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY allow_all_agents ON agents FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY allow_all_strategies ON strategies FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY allow_all_logs ON agent_logs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY allow_all_settings ON settings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_logs(created_at DESC);
