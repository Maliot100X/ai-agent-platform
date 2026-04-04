import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

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

let memoryAgents: any[] = [];

function expandSkills(skills: string[]) {
  return AVAILABLE_SKILLS.filter((s) => skills.includes(s.id));
}

export async function GET() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from("agents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const agents = (data || []).map((a: any) => ({
        ...a, agent_id: a.id, skill_details: expandSkills(a.skills || []),
      }));
      return NextResponse.json({ agents, skills: AVAILABLE_SKILLS, storage: "supabase" });
    } catch (e: any) {
      return NextResponse.json({
        agents: memoryAgents.map((a) => ({ ...a, skill_details: expandSkills(a.skills || []) })),
        skills: AVAILABLE_SKILLS, storage: "memory", error: e.message,
      });
    }
  }
  return NextResponse.json({
    agents: memoryAgents.map((a) => ({ ...a, skill_details: expandSkills(a.skills || []) })),
    skills: AVAILABLE_SKILLS, storage: "memory",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    const sb = getSupabase();

    if (sb) {
      if (action === "start" && body.agent_id) {
        const { data, error } = await sb.from("agents")
          .update({ status: "running", started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", body.agent_id).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, agent: { ...data, agent_id: data.id, skill_details: expandSkills(data.skills || []) } });
      }
      if (action === "stop" && body.agent_id) {
        const { data, error } = await sb.from("agents")
          .update({ status: "idle", updated_at: new Date().toISOString() })
          .eq("id", body.agent_id).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, agent: { ...data, agent_id: data.id, skill_details: expandSkills(data.skills || []) } });
      }
      if (action === "delete" && body.agent_id) {
        const { error } = await sb.from("agents").delete().eq("id", body.agent_id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }
      if (action === "add_skill" && body.agent_id && body.skill_id) {
        const { data: agent } = await sb.from("agents").select("skills").eq("id", body.agent_id).single();
        if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        const skills = [...new Set([...(agent.skills || []), body.skill_id])];
        const { data, error } = await sb.from("agents")
          .update({ skills, updated_at: new Date().toISOString() })
          .eq("id", body.agent_id).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, agent: { ...data, agent_id: data.id, skill_details: expandSkills(data.skills || []) } });
      }
      // Create
      const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const selectedSkills = body.skills || ["momentum_trader", "signal_generation"];
      const { data, error } = await sb.from("agents").insert({
        id, name: body.name || "Trading Agent",
        goal: body.goal || "Monitor PumpFun markets and generate trading signals",
        provider: body.provider || "vercel", model: body.model || "deepseek/deepseek-v3.2",
        status: "idle", skills: selectedSkills, max_tokens: body.max_tokens || 3,
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ agent_id: data.id, status: "created", agent: { ...data, agent_id: data.id, skill_details: expandSkills(data.skills || []) }, storage: "supabase" });
    }

    // Memory fallback
    if (action === "start" && body.agent_id) {
      const a = memoryAgents.find((x) => x.agent_id === body.agent_id);
      if (a) { a.status = "running"; a.started_at = new Date().toISOString(); }
      return NextResponse.json({ success: true, agent: a });
    }
    if (action === "stop" && body.agent_id) {
      const a = memoryAgents.find((x) => x.agent_id === body.agent_id);
      if (a) a.status = "idle";
      return NextResponse.json({ success: true, agent: a });
    }
    if (action === "delete" && body.agent_id) {
      memoryAgents = memoryAgents.filter((x) => x.agent_id !== body.agent_id);
      return NextResponse.json({ success: true });
    }
    const agent = {
      agent_id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: body.name || "Trading Agent", goal: body.goal || "Monitor PumpFun markets",
      provider: body.provider || "vercel", model: "deepseek/deepseek-v3.2",
      status: "idle", skills: body.skills || ["momentum_trader", "signal_generation"],
      max_tokens: 3, signals_generated: 0, trades_executed: 0, created_at: new Date().toISOString(),
    };
    memoryAgents.push(agent);
    return NextResponse.json({ agent_id: agent.agent_id, status: "created", agent, storage: "memory" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
