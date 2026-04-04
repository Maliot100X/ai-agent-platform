import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "";
const VERCEL_AI_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const SITE_URL = "https://ai-agent-platform-six.vercel.app";

async function sendMessage(chatId: number | string, text: string, parseMode = "Markdown") {
  if (!BOT_TOKEN) return;
  const truncated = text.length > 4000 ? text.slice(0, 4000) + "..." : text;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: truncated,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });
}

async function sendSignalToChannel(signal: any) {
  if (!BOT_TOKEN || !CHANNEL_ID) return;
  const emoji = signal.signal_type === "buy" ? "BUY" : signal.signal_type === "sell" ? "SELL" : "HOLD";
  const strength = "X".repeat(signal.strength || 1);
  const text = `*${emoji} Signal | ${signal.symbol}*\n\n` +
    `Strength: ${strength} (${signal.strength}/5)\n` +
    `MC: $${(signal.market_cap || 0).toLocaleString()}\n` +
    `Source: ${signal.source || "PumpFun"}\n\n` +
    `${signal.reasoning || ""}\n\n` +
    `[View on PumpFun](${signal.pair_url || "#"}) | [Dashboard](${SITE_URL})`;

  await sendMessage(CHANNEL_ID, text);
}

async function handleCommand(text: string, chatId: number | string): Promise<string> {
  const cmd = text.trim().toLowerCase();

  if (cmd === "/start" || cmd === "/help") {
    return `*FLUXMINT AI Trading Platform*\n\n` +
      `*Trading Commands:*\n` +
      `/market - Global crypto market summary\n` +
      `/trending - Trending Solana tokens\n` +
      `/pumpfun - Latest PumpFun launches\n` +
      `/signals - AI trading signals (PumpFun + DEX)\n\n` +
      `*Agent Commands:*\n` +
      `/agents - List agents from dashboard\n` +
      `/status - System health check\n\n` +
      `*AI Chat:*\n` +
      `/ai <question> - Ask the AI anything\n` +
      `Or just type normally to chat\n\n` +
      `*Links:*\n` +
      `[Dashboard](${SITE_URL})\n` +
      `[Skills](${SITE_URL}/skills)\n` +
      `[Launchpad](${SITE_URL}/launchpad)\n` +
      `[Website](https://kainova.xyz)\n` +
      `[Twitter](https://x.com/KaiNovasWarm)`;
  }

  if (cmd === "/status") {
    try {
      const res = await fetch(`${SITE_URL}/api/health`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      return `*System Status*\n\n` +
        `Status: ${data.status}\n` +
        `Provider: ${data.provider}\n` +
        `Model: ${data.model}\n` +
        `Skills: ${data.skills}\n` +
        `Version: ${data.version}\n` +
        `Uptime: ${data.uptime}`;
    } catch { return "System status unavailable"; }
  }

  if (cmd === "/market") {
    try {
      const resp = await fetch("https://api.coingecko.com/api/v3/global", { signal: AbortSignal.timeout(8000) });
      const data = await resp.json();
      const g = data.data || {};
      return `*Market Summary*\n\n` +
        `Total MC: $${((g.total_market_cap?.usd || 0) / 1e12).toFixed(2)}T\n` +
        `24h Vol: $${((g.total_volume?.usd || 0) / 1e9).toFixed(1)}B\n` +
        `BTC Dom: ${(g.market_cap_percentage?.btc || 0).toFixed(1)}%\n` +
        `ETH Dom: ${(g.market_cap_percentage?.eth || 0).toFixed(1)}%\n` +
        `SOL Dom: ${(g.market_cap_percentage?.sol || 0).toFixed(2)}%\n` +
        `24h Change: ${(g.market_cap_change_percentage_24h_usd || 0).toFixed(2)}%`;
    } catch { return "Error fetching market data"; }
  }

  if (cmd === "/trending") {
    try {
      const resp = await fetch("https://api.dexscreener.com/latest/dex/search?q=SOL", { signal: AbortSignal.timeout(8000) });
      const data = await resp.json();
      const pairs = (data.pairs || []).filter((p: any) => p.chainId === "solana").slice(0, 10);
      const lines = pairs.map((p: any, i: number) => {
        const change = parseFloat(p.priceChange?.h24 || "0");
        return `${i + 1}. *${p.baseToken?.symbol}* $${parseFloat(p.priceUsd || "0").toFixed(6)} (${change > 0 ? "+" : ""}${change.toFixed(1)}%)`;
      });
      return `*Trending Solana Tokens*\n\n${lines.join("\n")}`;
    } catch { return "Error fetching trending data"; }
  }

  if (cmd === "/pumpfun") {
    try {
      const resp = await fetch("https://frontend-api-v3.pump.fun/coins?offset=0&limit=10&sort=created_timestamp&order=DESC&includeNsfw=false", { signal: AbortSignal.timeout(8000) });
      const tokens = await resp.json();
      const list = (Array.isArray(tokens) ? tokens : []).slice(0, 10);
      const lines = list.map((t: any, i: number) =>
        `${i + 1}. *${t.symbol}* (${t.name})\n   MC: $${(t.usd_market_cap || 0).toLocaleString()} | ${t.complete ? "Graduated" : "Active"} | ${t.reply_count || 0} replies`
      );
      return `*PumpFun Latest Launches*\n\n${lines.join("\n\n")}\n\n[View More](${SITE_URL}/launchpad)`;
    } catch { return "Error fetching PumpFun data"; }
  }

  if (cmd === "/signals") {
    try {
      const resp = await fetch(`${SITE_URL}/api/signals`, { signal: AbortSignal.timeout(10000) });
      const data = await resp.json();
      const sigs = (data.signals || []).filter((s: any) => s.signal_type === "buy").slice(0, 8);
      if (sigs.length === 0) return "No buy signals right now. Check back soon.";

      const lines = sigs.map((s: any, i: number) => {
        const emoji = s.strength >= 4 ? "STRONG" : s.strength >= 3 ? "BUY" : "WATCH";
        return `${i + 1}. *${emoji}* ${s.symbol}\n` +
          `   Str: ${"X".repeat(s.strength)} (${s.strength}/5)\n` +
          `   MC: $${(s.market_cap || 0).toLocaleString()}\n` +
          `   ${s.reasoning?.slice(0, 100) || ""}`;
      });

      // Send top signals to channel too
      for (const s of sigs.filter((s: any) => s.strength >= 4).slice(0, 2)) {
        await sendSignalToChannel(s);
      }

      return `*Trading Signals*\n\n${lines.join("\n\n")}\n\n[Full Dashboard](${SITE_URL}/signals)`;
    } catch { return "Error fetching signals"; }
  }

  if (cmd === "/agents") {
    return `*Agents*\n\n` +
      `Agents are managed through the dashboard.\n` +
      `Create and start agents at:\n` +
      `[Agent Dashboard](${SITE_URL}/agents)\n\n` +
      `Available Skills: 10\n` +
      `PumpFun Sniper, Whale Watcher, Momentum Trader,\n` +
      `Dip Buyer, Graduation Hunter, Market Data,\n` +
      `Signal Generator, Risk Analysis, Wallet Tracker,\n` +
      `News Sentiment\n\n` +
      `[View Skills](${SITE_URL}/skills)`;
  }

  if (cmd.startsWith("/ai ")) {
    const question = text.slice(4).trim();
    const apiKey = process.env.VERCEL_API_KEY;
    if (!apiKey) return "AI not configured. Set VERCEL\\_API\\_KEY in environment.";
    try {
      // Get market context
      let context = "";
      try {
        const mRes = await fetch("https://api.coingecko.com/api/v3/global", { signal: AbortSignal.timeout(5000) });
        const mData = await mRes.json();
        const g = mData.data || {};
        context = `\nMarket: MC $${((g.total_market_cap?.usd || 0) / 1e12).toFixed(2)}T, BTC ${(g.market_cap_percentage?.btc || 0).toFixed(1)}%`;
      } catch {}

      const resp = await fetch(VERCEL_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.MODEL_NAME || "deepseek/deepseek-v3.2",
          messages: [
            { role: "system", content: `You are FLUXMINT AI, a Solana trading intelligence assistant. Provide direct, actionable trading analysis. ${context}` },
            { role: "user", content: question },
          ],
          temperature: 0.7, max_tokens: 1024,
        }),
      });
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "No response from AI.";
    } catch (e: any) { return `AI Error: ${e.message}`; }
  }

  // Default: AI chat for non-command messages
  if (!text.startsWith("/")) {
    const apiKey = process.env.VERCEL_API_KEY;
    if (!apiKey) return "Type /help for available commands.";
    try {
      const resp = await fetch(VERCEL_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.MODEL_NAME || "deepseek/deepseek-v3.2",
          messages: [
            { role: "system", content: "You are FLUXMINT AI, a Solana trading assistant with access to PumpFun, DexScreener, and market data." },
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
      const response = await handleCommand(message.text, message.chat.id);
      await sendMessage(message.chat.id, response);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  if (!BOT_TOKEN) return NextResponse.json({ error: "No bot token" });
  return NextResponse.json({
    bot_active: true,
    commands: ["/start", "/help", "/market", "/trending", "/pumpfun", "/signals", "/agents", "/status", "/ai"],
    channel_id: CHANNEL_ID || "not set",
    webhook_url: `${SITE_URL}/api/telegram/webhook`,
  });
}
