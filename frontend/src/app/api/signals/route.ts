import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch from DexScreener search for popular Solana tokens
    const resp = await fetch("https://api.dexscreener.com/latest/dex/search?q=SOL", {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) throw new Error(`DexScreener: ${resp.status}`);
    const data = await resp.json();
    const pairs = (data.pairs || []).filter((p: any) => p.chainId === "solana").slice(0, 15);

    const signals = pairs.map((p: any) => {
      const price = parseFloat(p.priceUsd || "0");
      const vol = parseFloat(p.volume?.h24 || "0");
      const liq = parseFloat(p.liquidity?.usd || "0");
      const change = parseFloat(p.priceChange?.h24 || "0");
      const vlr = liq > 0 ? vol / liq : 0;

      let signalType = "hold";
      let strength = 1;
      if (vlr > 5 && change > 5) { signalType = "buy"; strength = 5; }
      else if (vlr > 3 && change > 0) { signalType = "buy"; strength = 4; }
      else if (vlr > 2) { signalType = "buy"; strength = 3; }
      else if (change > 10) { signalType = "buy"; strength = 2; }
      else if (change < -15) { signalType = "sell"; strength = 3; }
      else if (change < -5) { signalType = "sell"; strength = 2; }

      return {
        symbol: p.baseToken?.symbol || "???",
        name: p.baseToken?.name || "",
        address: p.baseToken?.address || "",
        price,
        signal_type: signalType,
        signal: signalType,
        strength,
        reasoning: `Vol/Liq: ${vlr.toFixed(1)}x | 24h: ${change > 0 ? "+" : ""}${change.toFixed(1)}% | Liq: $${liq.toLocaleString()}`,
        entry: price,
        take_profit: +(price * (signalType === "buy" ? 1.15 : 1.05)).toFixed(10),
        stop_loss: +(price * (signalType === "buy" ? 0.92 : 0.97)).toFixed(10),
        volume_24h: vol,
        liquidity: liq,
        change_24h: change,
        pair_url: p.url || "",
        timestamp: new Date().toISOString(),
      };
    });

    return NextResponse.json({ signals });
  } catch (e: any) {
    return NextResponse.json({ signals: [], error: e.message });
  }
}
