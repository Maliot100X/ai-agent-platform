import { NextResponse } from "next/server";

export async function GET() {
  try {
    const resp = await fetch(
      "https://api.dexscreener.com/latest/dex/tokens/SOL",
      { signal: AbortSignal.timeout(10000), next: { revalidate: 30 } }
    );
    if (!resp.ok) throw new Error(`DexScreener: ${resp.status}`);
    const data = await resp.json();
    const pairs = data.pairs || [];
    const tokens = pairs.slice(0, 20).map((p: any) => ({
      source: "dexscreener",
      name: p.baseToken?.name || "",
      symbol: p.baseToken?.symbol || "",
      address: p.baseToken?.address || "",
      price: parseFloat(p.priceUsd || "0"),
      volume_24h: parseFloat(p.volume?.h24 || "0"),
      price_change_24h: parseFloat(p.priceChange?.h24 || "0"),
      liquidity: parseFloat(p.liquidity?.usd || "0"),
      pair_address: p.pairAddress || "",
    }));
    return NextResponse.json({ tokens, count: tokens.length });
  } catch (e: any) {
    return NextResponse.json({ tokens: [], error: e.message }, { status: 500 });
  }
}
