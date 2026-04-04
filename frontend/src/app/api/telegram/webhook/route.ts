import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "";
const VERCEL_AI_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

async function sendMessage(chatId: number | string, text: string) {
  if (!BOT_TOKEN) return;
  const truncated = text.length > 4000 ? text.slice(0, 4000) + "..." : text;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: truncated, parse_mode: "Markdown" }),
  });
}

async function handleCommand(text: string): Promise<string> {
  const cmd = text.trim().toLowerCase();

  if (cmd === "/start" || cmd === "/help") {
    return `*AI Agent Trading Platform*\n\nCommands:\n/market - Market summary\n/trending - Trending tokens\n/pumpfun - New PumpFun launches\n/signals - Trading signals\n/agents - List agents\n/ai <question> - AI chat\n/status - System health`;
  }

  if (cmd === "/status") {
    return `*System Status*\nProvider: Vercel AI Gateway\nModel: deepseek/deepseek-v3.2\nStatus: Online\nSkills: 10`;
  }

  if (cmd === "/market") {
    try {
      const resp = await fetch("https://api.coingecko.com/api/v3/global", { signal: AbortSignal.timeout(8000) });
      const data = await resp.json();
      const g = data.data || {};
      return `*Market Summary*\nTotal MC: $${((g.total_market_cap?.usd || 0) / 1e12).toFixed(2)}T\n24h Vol: $${((g.total_volume?.usd || 0) / 1e9).toFixed(1)}B\nBTC Dom: ${(g.market_cap_percentage?.btc || 0).toFixed(1)}%\n24h Change: ${(g.market_cap_change_percentage_24h_usd || 0).toFixed(2)}%`;
    } catch { return "Error fetching market data"; }
  }

  if (cmd === "/trending") {
    try {
      const resp = await fetch("https://api.dexscreener.com/latest/dex/search?q=SOL", { signal: AbortSignal.timeout(8000) });
      const data = await resp.json();
      const pairs = (data.pairs || []).filter((p: any) => p.chainId === "solana").slice(0, 8);
      const lines = pairs.map((p: any) => `${p.baseToken?.symbol} $${parseFloat(p.priceUsd || "0").toFixed(6)} (${parseFloat(p.priceChange?.h24 || "0") > 0 ? "+" : ""}${parseFloat(p.priceChange?.h24 || "0").toFixed(1)}%)`);
      return `*Trending Solana Tokens*\n\n${lines.join("\n")}`;
    } catch { return "Error fetching trending data"; }
  }

  if (cmd === "/pumpfun") {
    try {
      const resp = await fetch("https://frontend-api-v3.pump.fun/coins?offset=0&limit=8&sort=created_timestamp&order=DESC&includeNsfw=false", { signal: AbortSignal.timeout(8000) });
      const tokens = await resp.json();
      const lines = (Array.isArray(tokens) ? tokens : []).slice(0, 8).map((t: any) =>
        `${t.symbol} (${t.name})\nMC: $${(t.usd_market_cap || 0).toLocaleString()} | ${t.complete ? "Graduated" : "Active"}`
      );
      return `*PumpFun Launches*\n\n${lines.join("\n\n")}`;
    } catch { return "Error fetching PumpFun data"; }
  }

  if (cmd === "/signals") {
    try {
      const resp = await fetch("https://api.dexscreener.com/latest/dex/search?q=SOL", { signal: AbortSignal.timeout(8000) });
      const data = await resp.json();
      const pairs = (data.pairs || []).filter((p: any) => p.chainId === "solana").slice(0, 5);
      const lines = pairs.map((p: any) => {
        const change = parseFloat(p.priceChange?.h24 || "0");
        const signal = change > 10 ? "BUY" : change < -10 ? "SELL" : "HOLD";
        return `${signal} ${p.baseToken?.symbol} @ $${parseFloat(p.priceUsd || "0").toFixed(6)}\n24h: ${change > 0 ? "+" : ""}${change.toFixed(1)}% | Vol: $${parseFloat(p.volume?.h24 || "0").toLocaleString()}`;
      });
      return `*Trading Signals*\n\n${lines.join("\n\n")}`;
    } catch { return "Error fetching signals"; }
  }

  if (cmd === "/agents") {
    return "*Agents*\nNo running agents. Create agents from the dashboard.";
  }

  if (cmd.startsWith("/ai ")) {
    const question = text.slice(4).trim();
    const apiKey = process.env.VERCEL_API_KEY;
    if (!apiKey) return "AI not configured. Set VERCEL_API_KEY.";
    try {
      const resp = await fetch(VERCEL_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.MODEL_NAME || "deepseek/deepseek-v3.2",
          messages: [
            { role: "system", content: "You are an AI trading assistant. Provide direct, actionable trading intelligence." },
            { role: "user", content: question },
          ],
          temperature: 0.7, max_tokens: 1024,
        }),
      });
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "No response from AI.";
    } catch (e: any) { return `AI Error: ${e.message}`; }
  }

  // Default: treat as AI chat
  if (!text.startsWith("/")) {
    const apiKey = process.env.VERCEL_API_KEY;
    if (!apiKey) return "Type /help for commands";
    try {
      const resp = await fetch(VERCEL_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.MODEL_NAME || "deepseek/deepseek-v3.2",
          messages: [
            { role: "system", content: "You are an AI trading assistant with access to Solana market data." },
            { role: "user", content: text },
          ],
          temperature: 0.7, max_tokens: 1024,
        }),
      });
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "No response";
    } catch { return "Type /help for commands"; }
  }

  return "Unknown command. Type /help for available commands.";
}

export async function POST(request: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  try {
    const update = await request.json();
    const message = update?.message;
    if (message?.text) {
      const response = await handleCommand(message.text);
      await sendMessage(message.chat.id, response);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET for setting webhook
export async function GET() {
  if (!BOT_TOKEN) return NextResponse.json({ error: "No bot token" });
  return NextResponse.json({
    webhook_url: `Set webhook with: https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=YOUR_DOMAIN/api/telegram/webhook`,
    bot_token_set: !!BOT_TOKEN,
    channel_id: CHANNEL_ID || "not set",
  });
}
