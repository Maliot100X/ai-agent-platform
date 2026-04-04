import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
  try {
    const resp = await fetch(
      `https://frontend-api-v3.pump.fun/coins?offset=0&limit=${limit}&sort=created_timestamp&order=DESC&includeNsfw=false`,
      { signal: AbortSignal.timeout(10000), next: { revalidate: 15 } }
    );
    if (!resp.ok) throw new Error(`PumpFun: ${resp.status}`);
    const tokens = await resp.json();
    const launches = (Array.isArray(tokens) ? tokens : []).slice(0, limit).map((t: any) => ({
      mint: t.mint || "",
      name: t.name || "",
      symbol: t.symbol || "",
      market_cap: t.usd_market_cap || 0,
      complete: t.complete || false,
      reply_count: t.reply_count || 0,
      created: t.created_timestamp || 0,
      image_uri: t.image_uri || "",
      description: (t.description || "").slice(0, 200),
    }));
    return NextResponse.json({ launches, count: launches.length });
  } catch (e: any) {
    return NextResponse.json({ launches: [], error: e.message }, { status: 500 });
  }
}
