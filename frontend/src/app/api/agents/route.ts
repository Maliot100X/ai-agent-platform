import { NextRequest, NextResponse } from "next/server";

// In-memory agent store (serverless - resets on cold start)
const agents: any[] = [];

export async function GET() {
  return NextResponse.json({ agents });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agent = {
      agent_id: `agent-${Date.now()}`,
      name: body.name || "Trading Agent",
      goal: body.goal || "Monitor markets and generate signals",
      provider: body.provider || process.env.MODEL_PROVIDER || "vercel",
      model: body.model || process.env.MODEL_NAME || "deepseek/deepseek-v3.2",
      status: "idle",
      skills: ["market_data", "signal_generation", "pumpfun", "risk_analysis", "wallet_tracking", "news_sentiment"],
      tool_calls: 0,
      recent_tools: [],
      created_at: new Date().toISOString(),
    };
    agents.push(agent);
    return NextResponse.json({ agent_id: agent.agent_id, status: "created" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
