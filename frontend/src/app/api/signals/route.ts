import { NextResponse } from "next/server";

export async function GET() {
  // Fetch live signals from DexScreener trending
  try {
    const resp = await fetch("https://api.dexscreener.com/latest/dex/tokens/SOL", {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 30 },
    });
    if (!resp.ok) return NextResponse.json({ signals: [] });
    const data = await resp.json();
    const pairs = data.pairs || [];

    const signals = pairs.slice(0, 10).map((p: any) => {
      const price = parseFloat(p.priceUsd || "0");
      const vol = parseFloat(p.volume?.h24 || "0");
      const liq = parseFloat(p.liquidity?.usd || "0");
      const change = parseFloat(p.priceChange?.h24 || "0");
      const vlr = liq > 0 ? vol / liq : 0;

      let signalType = "hold";
      let strength = 0;
      if (vlr > 5) { signalType = "buy"; strength = 4; }
      else if (vlr > 2) { signalType = "buy"; strength = 3; }
      else if (change > 10) { signalType = "buy"; strength = 2; }
      else if (change < -10) { signalType = "sell"; strength = 2; }

      return {
        symbol: p.baseToken?.symbol || "???",
        name: p.baseToken?.name || "",
        address: p.baseToken?.address || "",
        price,
        signal_type: signalType,
        strength,
        reasoning: `Vol/Liq: ${vlr.toFixed(1)}x, 24h change: ${change.toFixed(1)}%, Liq: $${liq.toLocaleString()}`,
        entry: price,
        take_profit: price * (signalType === "buy" ? 1.15 : 1.05),
        stop_loss: price * (signalType === "buy" ? 0.92 : 0.97),
        timestamp: new Date().toISOString(),
      };
    });

    return NextResponse.json({ signals });
  } catch {
    return NextResponse.json({ signals: [] });
  }
}
