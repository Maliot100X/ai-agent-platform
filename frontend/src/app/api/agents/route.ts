import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Available skills
const AVAILABLE_SKILLS = [
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

/**
 * Agents are stored in a cookie for persistence across page refreshes.
 * Cookie max size is 4KB, so we store a compact version.
 * For production, use Vercel KV or a database.
 */
async function getAgentsFromCookie(): Promise<any[]> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("fluxmint_agents")?.value;
    if (!raw) return [];
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return [];
  }
}

function setAgentsCookie(response: NextResponse, agents: any[]): void {
  // Compact the agents to fit in cookie (max ~4KB)
  const compact = agents.map((a) => ({
    id: a.agent_id,
    n: a.name,
    g: a.goal,
    p: a.provider,
    s: a.status,
    sk: a.skills,
    mt: a.max_tokens || 3,
    sg: a.signals_generated || 0,
    te: a.trades_executed || 0,
    ca: a.created_at,
    sa: a.started_at,
  }));
  const value = encodeURIComponent(JSON.stringify(compact));
  // Set cookie with 30 day expiry
  response.cookies.set("fluxmint_agents", value, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  });
}

function expandAgents(compact: any[]): any[] {
  return compact.map((c) => ({
    agent_id: c.id || c.agent_id,
    name: c.n || c.name,
    goal: c.g || c.goal,
    provider: c.p || c.provider || "vercel",
    model: "deepseek/deepseek-v3.2",
    status: c.s || c.status || "idle",
    skills: c.sk || c.skills || ["momentum_trader"],
    skill_details: AVAILABLE_SKILLS.filter((s) => (c.sk || c.skills || []).includes(s.id)),
    max_tokens: c.mt || c.max_tokens || 3,
    holdings: [],
    signals_generated: c.sg || c.signals_generated || 0,
    trades_executed: c.te || c.trades_executed || 0,
    created_at: c.ca || c.created_at || new Date().toISOString(),
    started_at: c.sa || c.started_at,
  }));
}

export async function GET() {
  const raw = await getAgentsFromCookie();
  const agents = expandAgents(raw);
  return NextResponse.json({ agents, skills: AVAILABLE_SKILLS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    const raw = await getAgentsFromCookie();
    let agents = expandAgents(raw);

    if (action === "start" && body.agent_id) {
      const agent = agents.find((a) => a.agent_id === body.agent_id);
      if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      agent.status = "running";
      agent.started_at = new Date().toISOString();
      const resp = NextResponse.json({ success: true, agent });
      setAgentsCookie(resp, agents);
      return resp;
    }

    if (action === "stop" && body.agent_id) {
      const agent = agents.find((a) => a.agent_id === body.agent_id);
      if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      agent.status = "idle";
      const resp = NextResponse.json({ success: true, agent });
      setAgentsCookie(resp, agents);
      return resp;
    }

    if (action === "delete" && body.agent_id) {
      agents = agents.filter((a) => a.agent_id !== body.agent_id);
      const resp = NextResponse.json({ success: true });
      setAgentsCookie(resp, agents);
      return resp;
    }

    // Create new agent
    const selectedSkills = body.skills || ["momentum_trader", "signal_generation"];
    const agent = {
      agent_id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: body.name || "Trading Agent",
      goal: body.goal || "Monitor PumpFun markets and generate trading signals",
      provider: body.provider || process.env.MODEL_PROVIDER || "vercel",
      model: body.model || process.env.MODEL_NAME || "deepseek/deepseek-v3.2",
      status: "idle",
      skills: selectedSkills,
      skill_details: AVAILABLE_SKILLS.filter((s) => selectedSkills.includes(s.id)),
      max_tokens: body.max_tokens || 3,
      holdings: [],
      signals_generated: 0,
      trades_executed: 0,
      created_at: new Date().toISOString(),
    };
    agents.push(agent);
    const resp = NextResponse.json({ agent_id: agent.agent_id, status: "created", agent });
    setAgentsCookie(resp, agents);
    return resp;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
