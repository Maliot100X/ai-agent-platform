/**
 * Client-side agent persistence using localStorage.
 * Serverless functions lose in-memory state between invocations,
 * so we keep agents in the browser and sync via API for Telegram access.
 */

export interface AgentSkill {
  id: string;
  name: string;
  desc: string;
}

export interface AgentHolding {
  symbol: string;
  name: string;
  address: string;
  entry_price: number;
  current_price: number;
  amount: number;
  pnl: number;
  pnl_percent: number;
  strategy: string;
  entered_at: string;
}

export interface Agent {
  agent_id: string;
  name: string;
  goal: string;
  provider: string;
  model: string;
  status: "idle" | "running" | "error";
  skills: string[];
  skill_details: AgentSkill[];
  max_tokens: number;
  holdings: AgentHolding[];
  signals_generated: number;
  trades_executed: number;
  created_at: string;
  started_at?: string;
}

const STORAGE_KEY = "fluxmint_agents";

export const AVAILABLE_SKILLS: AgentSkill[] = [
  { id: "pumpfun_sniper", name: "PumpFun Sniper", desc: "Auto-detect and snipe new PumpFun launches before bonding curve fills" },
  { id: "whale_watcher", name: "Whale Watcher", desc: "Track whale wallets and mirror their trades on Solana" },
  { id: "momentum_trader", name: "Momentum Trader", desc: "Detect volume spikes and ride momentum on trending tokens" },
  { id: "dip_buyer", name: "Dip Buyer", desc: "Buy tokens after sharp dips when RSI indicates oversold conditions" },
  { id: "graduation_hunter", name: "Graduation Hunter", desc: "Buy tokens near PumpFun graduation and sell on Raydium listing pump" },
  { id: "market_data", name: "Market Data", desc: "Fetch real-time prices from CoinGecko, DexScreener, Birdeye" },
  { id: "signal_generation", name: "Signal Generator", desc: "Generate BUY/SELL/HOLD signals with entry/TP/SL levels" },
  { id: "risk_analysis", name: "Risk Analysis", desc: "Assess token risk: liquidity, holder concentration, freeze authority" },
  { id: "wallet_tracking", name: "Wallet Tracker", desc: "Monitor wallets via Helius RPC for token movements" },
  { id: "news_sentiment", name: "News Sentiment", desc: "Analyze crypto news sentiment for trading edge" },
];

function loadAgents(): Agent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAgents(agents: Agent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

export function getAgents(): Agent[] {
  return loadAgents();
}

export function getAgent(id: string): Agent | undefined {
  return loadAgents().find((a) => a.agent_id === id);
}

export function createAgent(data: {
  name: string;
  goal: string;
  provider: string;
  skills: string[];
  max_tokens?: number;
}): Agent {
  const agents = loadAgents();
  const selectedSkills = data.skills || ["momentum_trader", "signal_generation"];
  const agent: Agent = {
    agent_id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: data.name || "Trading Agent",
    goal: data.goal || "Monitor PumpFun markets and generate trading signals",
    provider: data.provider || "vercel",
    model: "deepseek/deepseek-v3.2",
    status: "idle",
    skills: selectedSkills,
    skill_details: AVAILABLE_SKILLS.filter((s) => selectedSkills.includes(s.id)),
    max_tokens: data.max_tokens || 3,
    holdings: [],
    signals_generated: 0,
    trades_executed: 0,
    created_at: new Date().toISOString(),
  };
  agents.push(agent);
  saveAgents(agents);
  return agent;
}

export function startAgent(id: string): Agent | null {
  const agents = loadAgents();
  const agent = agents.find((a) => a.agent_id === id);
  if (!agent) return null;
  agent.status = "running";
  agent.started_at = new Date().toISOString();
  saveAgents(agents);
  return agent;
}

export function stopAgent(id: string): Agent | null {
  const agents = loadAgents();
  const agent = agents.find((a) => a.agent_id === id);
  if (!agent) return null;
  agent.status = "idle";
  saveAgents(agents);
  return agent;
}

export function deleteAgent(id: string): boolean {
  const agents = loadAgents();
  const idx = agents.findIndex((a) => a.agent_id === id);
  if (idx < 0) return false;
  agents.splice(idx, 1);
  saveAgents(agents);
  return true;
}

export function updateAgentHoldings(id: string, holdings: AgentHolding[]): Agent | null {
  const agents = loadAgents();
  const agent = agents.find((a) => a.agent_id === id);
  if (!agent) return null;
  agent.holdings = holdings.slice(0, agent.max_tokens);
  saveAgents(agents);
  return agent;
}

export function incrementAgentStats(id: string, field: "signals_generated" | "trades_executed"): void {
  const agents = loadAgents();
  const agent = agents.find((a) => a.agent_id === id);
  if (!agent) return;
  agent[field] += 1;
  saveAgents(agents);
}

export function getRunningAgents(): Agent[] {
  return loadAgents().filter((a) => a.status === "running");
}

export function getAgentCount(): number {
  return loadAgents().length;
}

export function getRunningAgentCount(): number {
  return loadAgents().filter((a) => a.status === "running").length;
}
