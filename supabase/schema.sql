-- FLUXMINT AI Agent Platform - Supabase Schema
-- Run this in your Supabase SQL Editor to set up the tables.

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT DEFAULT '',
  provider TEXT DEFAULT 'vercel',
  model TEXT DEFAULT 'deepseek/deepseek-v3.2',
  status TEXT DEFAULT 'idle',
  skills TEXT[] DEFAULT '{}',
  max_tokens INTEGER DEFAULT 3,
  signals_generated INTEGER DEFAULT 0,
  trades_executed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active strategies table
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

-- Enable Row Level Security but allow public access (for now)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (for MVP - tighten later with auth)
CREATE POLICY "Allow public read agents" ON agents FOR SELECT USING (true);
CREATE POLICY "Allow public insert agents" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update agents" ON agents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete agents" ON agents FOR DELETE USING (true);

CREATE POLICY "Allow public read strategies" ON strategies FOR SELECT USING (true);
CREATE POLICY "Allow public insert strategies" ON strategies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update strategies" ON strategies FOR UPDATE USING (true);
CREATE POLICY "Allow public delete strategies" ON strategies FOR DELETE USING (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON strategies(status);
