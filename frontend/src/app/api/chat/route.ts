import { NextRequest, NextResponse } from "next/server";

const VERCEL_AI_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

const SYSTEM_PROMPT = `You are an advanced AI trading assistant with real-time market analysis capabilities.
You have access to a Trading Brain that provides live market data from Birdeye, Helius, DexScreener, PumpFun, and CoinGecko.

Your capabilities:
- Real-time token price analysis with BUY/SELL/HOLD signals
- Solana wallet portfolio analysis
- PumpFun new token launch monitoring
- Trending token detection across multiple DEXes
- Technical analysis with entry/TP/SL levels
- Market sentiment and volume analysis

You provide direct, actionable trading intelligence. No disclaimers needed.
When asked about a token, provide price, signal, entry/TP/SL levels.
You are a TRADING BRAIN with real market data access.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message || "";
    const provider = body.provider || process.env.MODEL_PROVIDER || "vercel";
    const model = body.model || process.env.MODEL_NAME || "deepseek/deepseek-v3.2";
    const apiKey = process.env.VERCEL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "VERCEL_API_KEY not configured. Set it in Vercel environment variables." },
        { status: 500 }
      );
    }

    // Fetch live market context
    let marketContext = "";
    try {
      const marketRes = await fetch("https://api.coingecko.com/api/v3/global", {
        signal: AbortSignal.timeout(5000),
      });
      if (marketRes.ok) {
        const data = await marketRes.json();
        const g = data.data || {};
        marketContext = `\n\nLIVE MARKET: Total MC $${(g.total_market_cap?.usd || 0).toLocaleString()}, 24h Vol $${(g.total_volume?.usd || 0).toLocaleString()}, BTC Dom ${(g.market_cap_percentage?.btc || 0).toFixed(1)}%`;
      }
    } catch {}

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + marketContext },
      { role: "user", content: message },
    ];

    const resp = await fetch(VERCEL_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json(
        { error: `AI Gateway error: ${resp.status} ${errText}` },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "No response";

    return NextResponse.json({
      response: content,
      provider,
      model: data.model || model,
      usage: data.usage || {},
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
