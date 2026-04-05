import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8353945339:AAGuhY9vYjzfDMv245NB7lGt6J-lLRcQAwQ";
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "-1002926556738";
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

/**
 * Generate TTS audio via Deepgram REST API and send as Telegram voice message.
 * Uses Deepgram's /v1/speak endpoint with OGG Opus output for Telegram compatibility.
 */
async function sendVoiceMessage(chatId: number | string, text: string) {
  const dgKey = process.env.DEEPGRAM_API_KEY;
  if (!dgKey || !BOT_TOKEN) return;

  try {
    // Step 1: Generate audio via Deepgram TTS REST API
    const ttsResp = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-stella-en&encoding=opus&container=ogg",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${dgKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!ttsResp.ok) {
      // Fallback: send as text
      await sendMessage(chatId, text);
      return;
    }

    const audioBuffer = await ttsResp.arrayBuffer();

    // Step 2: Send as voice message to Telegram using multipart/form-data
    const blob = new Blob([audioBuffer], { type: "audio/ogg" });
    const formData = new FormData();
    formData.append("chat_id", String(chatId));
    formData.append("voice", blob, "voice.ogg");
    formData.append("caption", text.length > 200 ? text.slice(0, 200) + "..." : text);

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVoice`, {
      method: "POST",
      body: formData,
    });
  } catch {
    // Fallback to text on error
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
      "*FLUXMINT AI Trading Platform*",
      "",
      "----------- *TRADING* -----------",
      "/market - Global crypto market data",
      "/trending - Trending Solana tokens",
      "/pumpfun - Latest PumpFun launches",
      "/signals - AI-scored PumpFun signals",
      "",
      "----------- *AGENTS* -----------",
      "/agents - List dashboard agents",
      "/pullagent <name> - Pull agent details",
      "",
      "----------- *VOICE & AI* -----------",
      "/tts <question> - AI voice reply (audio message)",
      "/ai <question> - Ask the AI (text reply)",
      "/status - System health & integrations",
      "",
      "----------- *LINKS* -----------",
      `[Dashboard](${SITE_URL}) | [Skills](${SITE_URL}/skills)`,
      `[Launchpad](${SITE_URL}/launchpad) | [Signals](${SITE_URL}/signals)`,
      "[Website](https://kainova.xyz) | [Twitter](https://x.com/KaiNovasWarm)",
      "",
      "_Type any message to chat with AI_",
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
      return `${i + 1}. *${a.name}* [${status}]\n   Skills: ${(a.skills || []).join(", ")}\n   Provider: ${a.provider}`;
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

    return [
      `*Agent: ${agent.name}*`,
      "",
      `Status: ${agent.status === "running" ? "RUNNING" : "IDLE"}`,
      `Provider: ${agent.provider}`,
      `Model: ${agent.model || "deepseek/deepseek-v3.2"}`,
      `Max Tokens: ${agent.max_tokens || 3}`,
      `Skills: ${(agent.skills || []).join(", ")}`,
      `Signals: ${agent.signals_generated || 0}`,
      `Trades: ${agent.trades_executed || 0}`,
      `Created: ${agent.created_at ? new Date(agent.created_at).toLocaleDateString() : "N/A"}`,
      agent.started_at ? `Started: ${new Date(agent.started_at).toLocaleString()}` : "",
      "",
      `[View](${SITE_URL}/agents)`,
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
            { role: "system", content: "You are FLUXMINT AI, a Solana trading assistant." },
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
            { role: "system", content: "You are FLUXMINT AI, a Solana/PumpFun trading assistant." },
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

      // /tts command: get AI response then send as voice message
      if (text.toLowerCase().startsWith("/tts ")) {
        const question = text.slice(5).trim();
        if (!question) {
          await sendMessage(chatId, "Usage: /tts <your question>\nExample: /tts what are the best crypto signals today");
        } else {
          // Get AI text response first
          const aiResponse = await handleCommand(`/ai ${question}`);
          // Send as voice message via Deepgram TTS
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
