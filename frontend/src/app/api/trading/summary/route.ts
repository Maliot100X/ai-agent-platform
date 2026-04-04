import { NextResponse } from "next/server";

export async function GET() {
  try {
    const resp = await fetch("https://api.coingecko.com/api/v3/global", {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 60 },
    });
    if (!resp.ok) throw new Error(`CoinGecko: ${resp.status}`);
    const data = await resp.json();
    const g = data.data || {};
    return NextResponse.json({
      total_market_cap: g.total_market_cap?.usd || 0,
      total_volume_24h: g.total_volume?.usd || 0,
      btc_dominance: g.market_cap_percentage?.btc || 0,
      eth_dominance: g.market_cap_percentage?.eth || 0,
      active_coins: g.active_cryptocurrencies || 0,
      markets: g.markets || 0,
      market_cap_change_24h: g.market_cap_change_percentage_24h_usd || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
