import { NextResponse } from "next/server";

export const revalidate = 15;

export async function GET() {
  try {
    // Fetch real PumpFun tokens for signals
    const [pumpRes, dexRes] = await Promise.allSettled([
      fetch("https://frontend-api-v3.pump.fun/coins?offset=0&limit=20&sort=market_cap&order=DESC&includeNsfw=false", {
        signal: AbortSignal.timeout(8000),
      }),
      fetch("https://api.dexscreener.com/token-pairs/v1/solana/So11111111111111111111111111111111111111112", {
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    const signals: any[] = [];

    // PumpFun signals - real meme tokens
    if (pumpRes.status === "fulfilled" && pumpRes.value.ok) {
      const tokens = await pumpRes.value.json();
      const pumpTokens = Array.isArray(tokens) ? tokens : [];

      for (const t of pumpTokens.slice(0, 12)) {
        const mc = t.usd_market_cap || 0;
        const replies = t.reply_count || 0;
        const isComplete = t.complete || false;

        // Signal logic based on PumpFun metrics
        let signalType = "hold";
        let strength = 1;
        let reasoning = "";

        if (!isComplete && mc > 50000 && mc < 500000 && replies > 10) {
          signalType = "buy";
          strength = 4;
          reasoning = `Pre-graduation with strong community (${replies} replies). MC: $${mc.toLocaleString()}. High graduation probability.`;
        } else if (!isComplete && mc > 20000 && replies > 5) {
          signalType = "buy";
          strength = 3;
          reasoning = `Growing PumpFun token. MC: $${mc.toLocaleString()}, ${replies} replies. Watch for graduation.`;
        } else if (isComplete && mc > 100000) {
          signalType = "buy";
          strength = 2;
          reasoning = `Graduated token with $${mc.toLocaleString()} MC. Listed on Raydium. Moderate momentum.`;
        } else if (!isComplete && mc < 5000) {
          signalType = "hold";
          strength = 1;
          reasoning = `New launch, low MC ($${mc.toLocaleString()}). Too early, watching for traction.`;
        } else if (isComplete && mc < 50000) {
          signalType = "sell";
          strength = 2;
          reasoning = `Graduated but losing momentum. MC dropped to $${mc.toLocaleString()}.`;
        } else {
          reasoning = `MC: $${mc.toLocaleString()} | ${replies} replies | ${isComplete ? "Graduated" : "Active"}`;
        }

        const estimatedPrice = mc > 0 ? mc / 1_000_000_000 : 0;

        signals.push({
          symbol: t.symbol || "???",
          name: t.name || "",
          address: t.mint || "",
          price: estimatedPrice,
          signal_type: signalType,
          signal: signalType,
          strength,
          reasoning,
          entry: estimatedPrice,
          take_profit: +(estimatedPrice * (signalType === "buy" ? 1.3 : 1.05)).toFixed(12),
          stop_loss: +(estimatedPrice * (signalType === "buy" ? 0.85 : 0.95)).toFixed(12),
          market_cap: mc,
          replies,
          graduated: isComplete,
          source: "pumpfun",
          pair_url: `https://pump.fun/${t.mint}`,
          image_uri: t.image_uri || "",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // DexScreener SOL pairs for additional context
    if (dexRes.status === "fulfilled" && dexRes.value.ok) {
      const data = await dexRes.value.json();
      const pairs = (Array.isArray(data) ? data : data.pairs || [])
        .filter((p: any) => p.chainId === "solana")
        .slice(0, 5);

      for (const p of pairs) {
        const price = parseFloat(p.priceUsd || "0");
        const vol = parseFloat(p.volume?.h24 || "0");
        const liq = parseFloat(p.liquidity?.usd || "0");
        const change = parseFloat(p.priceChange?.h24 || "0");
        const vlr = liq > 0 ? vol / liq : 0;

        let signalType = "hold";
        let strength = 1;
        if (vlr > 5 && change > 5) { signalType = "buy"; strength = 5; }
        else if (vlr > 3 && change > 0) { signalType = "buy"; strength = 4; }
        else if (change < -15) { signalType = "sell"; strength = 3; }

        signals.push({
          symbol: p.baseToken?.symbol || "???",
          name: p.baseToken?.name || "",
          address: p.baseToken?.address || "",
          price,
          signal_type: signalType,
          signal: signalType,
          strength,
          reasoning: `DEX Vol/Liq: ${vlr.toFixed(1)}x | 24h: ${change > 0 ? "+" : ""}${change.toFixed(1)}% | Liq: $${liq.toLocaleString()}`,
          entry: price,
          take_profit: +(price * 1.15).toFixed(10),
          stop_loss: +(price * 0.92).toFixed(10),
          volume_24h: vol,
          liquidity: liq,
          change_24h: change,
          source: "dexscreener",
          pair_url: p.url || "",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Sort: buy signals first, then by strength
    signals.sort((a, b) => {
      if (a.signal_type === "buy" && b.signal_type !== "buy") return -1;
      if (a.signal_type !== "buy" && b.signal_type === "buy") return 1;
      return b.strength - a.strength;
    });

    return NextResponse.json({ signals, count: signals.length });
  } catch (e: any) {
    return NextResponse.json({ signals: [], error: e.message });
  }
}
