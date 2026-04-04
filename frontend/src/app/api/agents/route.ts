import { NextRequest, NextResponse } from "next/server";

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

// In-memory store
const agents: any[] = [];

export async function GET() {
  return NextResponse.json({ agents, skills: AVAILABLE_SKILLS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === "start" && body.agent_id) {
      const agent = agents.find((a) => a.agent_id === body.agent_id);
      if (agent) {
        agent.status = "running";
        agent.started_at = new Date().toISOString();
        return NextResponse.json({ success: true, agent });
      }
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (action === "stop" && body.agent_id) {
      const agent = agents.find((a) => a.agent_id === body.agent_id);
      if (agent) {
        agent.status = "idle";
        return NextResponse.json({ success: true, agent });
      }
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (action === "delete" && body.agent_id) {
      const idx = agents.findIndex((a) => a.agent_id === body.agent_id);
      if (idx >= 0) {
        agents.splice(idx, 1);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Create new agent
    const selectedSkills = body.skills || ["momentum_trader", "signal_generation"];
    const agent = {
      agent_id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: body.name || "Trading Agent",
      goal: body.goal || "Monitor Solana markets and generate trading signals",
      provider: body.provider || process.env.MODEL_PROVIDER || "vercel",
      model: body.model || process.env.MODEL_NAME || "deepseek/deepseek-v3.2",
      status: "idle",
      skills: selectedSkills,
      skill_details: AVAILABLE_SKILLS.filter((s) => selectedSkills.includes(s.id)),
      max_tokens: body.max_tokens || 3,
      holdings: [],
      tool_calls: 0,
      signals_generated: 0,
      trades_executed: 0,
      recent_tools: [],
      created_at: new Date().toISOString(),
    };
    agents.push(agent);
    return NextResponse.json({ agent_id: agent.agent_id, status: "created", agent });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
