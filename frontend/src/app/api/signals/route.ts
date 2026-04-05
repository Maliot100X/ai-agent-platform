import { NextResponse } from "next/server";

export const revalidate = 15;

export async function GET() {
  try {
    // Fetch real PumpFun tokens - server-side, no CORS issue
    const pumpRes = await fetch(
      "https://frontend-api-v3.pump.fun/coins?offset=0&limit=20&sort=market_cap&order=DESC&includeNsfw=false",
      {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "FLUXMINT-AI/2.0", "Accept": "application/json" },
      }
    );

    if (!pumpRes.ok) {
      return NextResponse.json({ signals: [], error: `PumpFun API: ${pumpRes.status}` });
    }

    const tokens = await pumpRes.json();
    const pumpTokens = Array.isArray(tokens) ? tokens : [];

    const signals = pumpTokens.map((t: any) => {
      const mc = t.usd_market_cap || 0;
      const replies = t.reply_count || 0;
      const isComplete = t.complete || false;
      const solReserves = t.virtual_sol_reserves ? t.virtual_sol_reserves / 1e9 : 0;
      const tokenReserves = t.virtual_token_reserves ? t.virtual_token_reserves / 1e6 : 0;

      // Calculate actual price from reserves
      const price = tokenReserves > 0 ? (solReserves / tokenReserves) : (mc > 0 ? mc / 1e9 : 0);

      // Signal logic based on PumpFun metrics
      let signalType = "hold";
      let strength = 1;
      let reasoning = "";

      if (!isComplete && mc > 50000 && mc < 500000 && replies > 10) {
        signalType = "buy";
        strength = 4;
        reasoning = `Pre-graduation pump. MC: $${mc.toLocaleString()}, ${replies} replies, ${solReserves.toFixed(1)} SOL in pool. High graduation probability.`;
      } else if (!isComplete && mc > 20000 && replies > 5) {
        signalType = "buy";
        strength = 3;
        reasoning = `Growing token. MC: $${mc.toLocaleString()}, ${replies} replies. Bonding curve active.`;
      } else if (isComplete && mc > 200000) {
        signalType = "buy";
        strength = 3;
        reasoning = `Graduated with strong MC ($${mc.toLocaleString()}). Listed on Raydium. Momentum play.`;
      } else if (isComplete && mc > 50000) {
        signalType = "buy";
        strength = 2;
        reasoning = `Graduated token. MC: $${mc.toLocaleString()}. Moderate liquidity on Raydium.`;
      } else if (!isComplete && mc < 5000 && replies < 3) {
        signalType = "hold";
        strength = 1;
        reasoning = `Fresh launch, low traction. MC: $${mc.toLocaleString()}, ${replies} replies. Wait for momentum.`;
      } else if (isComplete && mc < 30000) {
        signalType = "sell";
        strength = 2;
        reasoning = `Graduated but low MC ($${mc.toLocaleString()}). Momentum fading.`;
      } else {
        reasoning = `MC: $${mc.toLocaleString()} | ${replies} replies | ${solReserves.toFixed(1)} SOL reserves | ${isComplete ? "Graduated" : "Active"}`;
      }

      return {
        symbol: t.symbol || "???",
        name: t.name || "",
        address: t.mint || "",
        mint: t.mint || "",
        price,
        signal_type: signalType,
        signal: signalType,
        strength,
        reasoning,
        entry: price,
        take_profit: +(price * (signalType === "buy" ? 1.5 : 1.1)).toFixed(12),
        stop_loss: +(price * (signalType === "buy" ? 0.7 : 0.9)).toFixed(12),
        market_cap: mc,
        replies,
        graduated: isComplete,
        sol_reserves: solReserves,
        token_reserves: tokenReserves,
        creator: t.creator || "",
        source: "pumpfun",
        pair_url: `https://pump.fun/${t.mint}`,
        dexscreener_url: `https://dexscreener.com/solana/${t.mint}`,
        image_uri: t.image_uri || "",
        description: (t.description || "").slice(0, 200),
        created_timestamp: t.created_timestamp || 0,
        timestamp: new Date().toISOString(),
      };
    });

    // Sort: buy signals first, then by strength, then by MC
    signals.sort((a: any, b: any) => {
      if (a.signal_type === "buy" && b.signal_type !== "buy") return -1;
      if (a.signal_type !== "buy" && b.signal_type === "buy") return 1;
      if (a.strength !== b.strength) return b.strength - a.strength;
      return b.market_cap - a.market_cap;
    });

    return NextResponse.json({ signals, count: signals.length, source: "pump.fun" });
  } catch (e: any) {
    return NextResponse.json({ signals: [], error: e.message });
  }
}
