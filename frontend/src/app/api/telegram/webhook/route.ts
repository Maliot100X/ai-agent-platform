import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8353945339:AAGuhY9vYjzfDMv245NB7lGt6J-lLRcQAwQ";
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "-1002926556738";
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY || "6c18a51c829ac16237a956c786e23e1368570311";
const VERCEL_AI_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const SITE_URL = "https://ai-agent-platform-six.vercel.app";

async function sendMessage(chatId: number | string, text: string) {
  if (!BOT_TOKEN) return;
  const truncated = text.length > 4000 ? text.slice(0, 4000) + "..." : text;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: truncated,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });
}

async function sendVoiceMessage(chatId: number | string, text: string) {
  if (!DEEPGRAM_KEY || !BOT_TOKEN) {
    await sendMessage(chatId, text);
    return;
  }
  try {
    const ttsResp = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-2-iris-en&encoding=opus&container=ogg",
      {
        method: "POST",
        headers: { Authorization: `Token ${DEEPGRAM_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!ttsResp.ok) {
      await sendMessage(chatId, text);
      return;
    }
    const audioBuffer = await ttsResp.arrayBuffer();
    const blob = new Blob([audioBuffer], { type: "audio/ogg" });
    const formData = new FormData();
    formData.append("chat_id", String(chatId));
    formData.append("voice", blob, "voice.ogg");
    formData.append("caption", text.length > 200 ? text.slice(0, 200) + "..." : text);
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVoice`, { method: "POST", body: formData });
  } catch {
    await sendMessage(chatId, text);
  }
}

async function getAgentsFromDB(): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = getSupabase();
    if (!sb) return [];
    const { data } = await sb.from("agents").select("*").order("created_at", { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}

async function handleCommand(text: string): Promise<string> {
  const cmd = text.trim().toLowerCase();
  const parts = text.trim().split(/\s+/);

  if (cmd === "/start" || cmd === "/help") {
    return [
      "FLUXMINT AI Trading Platform",
      "━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      "TRADING",
      "  /market - Global crypto market data",
      "  /trending - Trending Solana tokens",
      "  /pumpfun - Latest PumpFun launches",
      "  /signals - AI-scored PumpFun signals",
      "",
      "AGENTS",
      "  /agents - List all dashboard agents",
      "  /pullagent <name> - Pull agent details + holdings",
      "",
      "VOICE & AI",
      "  /tts <question> - AI voice reply (audio message)",
      "  /ai <question> - Ask the AI (text reply)",
      "  /status - System health & integrations",
      "",
      "LINKS",
      `  Dashboard: ${SITE_URL}`,
      `  Launchpad: ${SITE_URL}/launchpad`,
      `  Skills: ${SITE_URL}/skills`,
      "  Website: https://kainova.xyz",
      "  Twitter: https://x.com/KaiNovasWarm",
      "  GitHub: https://github.com/Maliot100X",
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━",
      "Built by Maliot | Type any message to chat with AI",
    ].join("\n");
  }

  if (cmd === "/status") {
    try {
      const res = await fetch(`${SITE_URL}/api/health`, { signal: AbortSignal.timeout(8000) });
      const d = await res.json();
      const integrations = d.integrations || {};
      const intLines = Object.entries(integrations)
        .map(([k, v]) => `  ${v === "active" ? "ON" : "OFF"} ${k}`)
        .join("\n");
      return [
        "*System Status*",
        "",
        `Status: ${d.status}`,
        `Provider: ${d.provider}`,
        `Model: ${d.model}`,
        `Skills: ${d.skills}`,
        `Storage: ${d.storage || "unknown"}`,
        `Version: ${d.version}`,
        "",
        "*Integrations:*",
        intLines,
      ].join("\n");
    } catch { return "System unavailable"; }
  }

  if (cmd === "/market") {
    try {
      const resp = await fetch("https://api.coingecko.com/api/v3/global", { signal: AbortSignal.timeout(8000) });
      const data = await resp.json();
      const g = data.data || {};
      return [
        "*Market Summary*",
        "",
        `Total MC: *$${((g.total_market_cap?.usd || 0) / 1e12).toFixed(2)}T*`,
        `24h Vol: $${((g.total_volume?.usd || 0) / 1e9).toFixed(1)}B`,
        `BTC: ${(g.market_cap_percentage?.btc || 0).toFixed(1)}% | ETH: ${(g.market_cap_percentage?.eth || 0).toFixed(1)}%`,
        `SOL: ${(g.market_cap_percentage?.sol || 0).toFixed(2)}%`,
        `24h Change: ${(g.market_cap_change_percentage_24h_usd || 0).toFixed(2)}%`,
      ].join("\n");
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
      return `*Trending Solana*\n\n${lines.join("\n")}`;
    } catch { return "Error fetching trending"; }
  }

  if (cmd === "/pumpfun") {
    try {
      const resp = await fetch(`${SITE_URL}/api/pumpfun/coins?limit=8&sort=created_timestamp&order=DESC&tab=new`, { signal: AbortSignal.timeout(10000) });
      const data = await resp.json();
      const tokens = data.tokens || [];
      const lines = tokens.map((t: any, i: number) =>
        `${i + 1}. *${t.symbol}* (${t.name})\n   MC: $${(t.usd_market_cap || 0).toLocaleString()} | ${t.complete ? "Graduated" : "Active"}\n   \`${t.mint}\``
      );
      return `*PumpFun Latest*\n\n${lines.join("\n\n")}\n\n[Launchpad](${SITE_URL}/launchpad)`;
    } catch { return "Error fetching PumpFun"; }
  }

  if (cmd === "/signals") {
    try {
      // First try agent logs (real trades)
      const logResp = await fetch(`${SITE_URL}/api/logs?limit=10`, { signal: AbortSignal.timeout(8000) });
      const logData = await logResp.json();
      if (logData.logs?.length > 0) {
        const lines = logData.logs.slice(0, 8).map((l: any, i: number) => {
          const action = (l.action || "signal").toUpperCase();
          const pnl = l.pnl ? ` (${Number(l.pnl) >= 0 ? "+" : ""}${Number(l.pnl).toFixed(1)}%)` : "";
          return `${i + 1}. *${action}* ${l.symbol}${pnl}\n   MC: $${Number(l.market_cap || 0).toLocaleString()}\n   ${l.reasoning?.slice(0, 60) || ""}`;
        });
        return `*Agent Trading Signals*\n\n${lines.join("\n\n")}\n\n[Dashboard](${SITE_URL}/signals)`;
      }
      // Fallback to PumpFun signals
      const resp = await fetch(`${SITE_URL}/api/signals`, { signal: AbortSignal.timeout(10000) });
      const data = await resp.json();
      const sigs = (data.signals || []).filter((s: any) => s.signal_type === "buy").slice(0, 6);
      if (sigs.length === 0) return "No buy signals right now.";
      const lines = sigs.map((s: any, i: number) =>
        `${i + 1}. *${s.strength >= 4 ? "STRONG" : "BUY"}* ${s.symbol}\n   MC: $${(s.market_cap || 0).toLocaleString()} | Str: ${s.strength}/5\n   \`${s.mint}\`\n   ${s.reasoning?.slice(0, 80) || ""}`
      );
      return `*PumpFun Signals*\n\n${lines.join("\n\n")}\n\n[Dashboard](${SITE_URL}/signals)`;
    } catch { return "Error fetching signals"; }
  }

  if (cmd === "/agents") {
    const agents = await getAgentsFromDB();
    if (agents.length === 0) {
      return `*Agents*\n\nNo agents created yet.\n[Create Agent](${SITE_URL}/agents)`;
    }
    const lines = agents.map((a: any, i: number) => {
      const status = a.status === "running" ? "RUNNING" : "IDLE";
      const holdingsCount = (a.holdings || []).length;
      const balance = Number(a.balance || 0).toLocaleString();
      return `${i + 1}. *${a.name}* [${status}]\n   Balance: $${balance} | Holdings: ${holdingsCount}\n   Skills: ${(a.skills || []).join(", ")}\n   Trades: ${a.trades_executed || 0}`;
    });
    return `*Dashboard Agents* (${agents.length})\n\n${lines.join("\n\n")}\n\n[Manage](${SITE_URL}/agents)`;
  }

  if (parts[0].toLowerCase() === "/pullagent") {
    const searchName = parts.slice(1).join(" ").toLowerCase();
    if (!searchName) return "Usage: /pullagent <agent name>";
    
    const agents = await getAgentsFromDB();
    const agent = agents.find((a: any) => a.name.toLowerCase().includes(searchName));
    
    if (!agent) {
      const names = agents.map((a: any) => a.name).join(", ");
      return `Agent "${searchName}" not found.\n\nAvailable: ${names || "none"}`;
    }

    const holdings = (agent.holdings || []);
    const holdingLines = holdings.map((h: any) => {
      const pnl = Number(h.pnl_percent || 0);
      return `  ${h.symbol}: $${h.amount || 0} | MC: $${Number(h.current_mc || h.entry_mc || 0).toLocaleString()} | P&L: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%`;
    });

    return [
      `*Agent: ${agent.name}*`,
      "",
      `Status: ${agent.status === "running" ? "RUNNING" : "IDLE"}`,
      `Balance: $${Number(agent.balance || 0).toLocaleString()}`,
      `Provider: ${agent.provider}`,
      `Model: ${agent.model || "deepseek/deepseek-v3.2"}`,
      `Max Tokens: ${agent.max_tokens || 3}`,
      `Skills: ${(agent.skills || []).join(", ")}`,
      `Signals: ${agent.signals_generated || 0}`,
      `Trades: ${agent.trades_executed || 0}`,
      "",
      holdings.length > 0 ? `*Holdings* (${holdings.length}):` : "No holdings",
      ...holdingLines,
      "",
      `Created: ${agent.created_at ? new Date(agent.created_at).toLocaleDateString() : "N/A"}`,
      agent.started_at ? `Started: ${new Date(agent.started_at).toLocaleString()}` : "",
      "",
      `[View on Dashboard](${SITE_URL}/agents)`,
    ].filter(Boolean).join("\n");
  }

  if (cmd.startsWith("/ai ")) {
    const question = text.slice(4).trim();
    const apiKey = process.env.VERCEL_API_KEY;
    if (!apiKey) return "AI not configured. Set VERCEL\\_API\\_KEY.";
    try {
      const resp = await fetch(VERCEL_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.MODEL_NAME || "deepseek/deepseek-v3.2",
          messages: [
            { role: "system", content: "You are FLUXMINT AI, a Solana trading assistant. Be brief and actionable." },
            { role: "user", content: question },
          ],
          temperature: 0.7, max_tokens: 1024,
        }),
      });
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "No response.";
    } catch (e: any) { return `AI Error: ${e.message}`; }
  }

  // Default AI chat
  if (!text.startsWith("/")) {
    const apiKey = process.env.VERCEL_API_KEY;
    if (!apiKey) return "Type /help for commands.";
    try {
      const resp = await fetch(VERCEL_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.MODEL_NAME || "deepseek/deepseek-v3.2",
          messages: [
            { role: "system", content: "You are FLUXMINT AI, a Solana/PumpFun trading assistant. Be brief." },
            { role: "user", content: text },
          ],
          temperature: 0.7, max_tokens: 1024,
        }),
      });
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "No response";
    } catch { return "Type /help for commands"; }
  }

  return "Unknown command. /help for available commands.";
}

export async function POST(request: NextRequest) {
  if (!BOT_TOKEN) return NextResponse.json({ error: "No bot token" }, { status: 500 });
  try {
    const update = await request.json();
    const message = update?.message;
    if (message?.text) {
      const text = message.text.trim();
      const chatId = message.chat.id;

      if (text.toLowerCase().startsWith("/tts ")) {
        const question = text.slice(5).trim();
        if (!question) {
          await sendMessage(chatId, "Usage: /tts <your question>\nExample: /tts what are the best crypto signals today");
        } else {
          const aiResponse = await handleCommand(`/ai ${question}`);
          await sendVoiceMessage(chatId, aiResponse);
        }
      } else {
        const response = await handleCommand(text);
        await sendMessage(chatId, response);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    bot_active: !!BOT_TOKEN,
    commands: ["/start", "/help", "/market", "/trending", "/pumpfun", "/signals", "/agents", "/pullagent", "/tts", "/status", "/ai"],
    channel_id: CHANNEL_ID || "not set",
    webhook_url: `${SITE_URL}/api/telegram/webhook`,
  });
}
