import { NextResponse } from "next/server";

const startTime = Date.now();

export async function GET() {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  return NextResponse.json({
    status: "healthy",
    uptime: `${hours}h ${minutes}m`,
    agents: 0,
    provider: process.env.MODEL_PROVIDER || "vercel",
    model: process.env.MODEL_NAME || "deepseek/deepseek-v3.2",
    ws_clients: 0,
    signals_count: 0,
    skills: 10,
    version: "2.0.0",
    integrations: {
      pumpfun: "active",
      dexscreener: "active",
      coingecko: "active",
      birdeye: process.env.BIRDEYE_API_KEY ? "active" : "not configured",
      helius: process.env.HELIUS_API_KEY ? "active" : "not configured",
      telegram: process.env.TELEGRAM_BOT_TOKEN ? "active" : "not configured",
      vercel_ai: process.env.VERCEL_API_KEY ? "active" : "not configured",
    },
  });
}
