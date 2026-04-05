import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy for PumpFun + DexScreener APIs.
 * For "graduating" tab, also fetches from DexScreener PumpFun pairs.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const offset = searchParams.get("offset") || "0";
  const limit = parseInt(searchParams.get("limit") || "30");
  const sort = searchParams.get("sort") || "created_timestamp";
  const order = searchParams.get("order") || "DESC";
  const complete = searchParams.get("complete");
  const tab = searchParams.get("tab") || "";

  try {
    // For graduating tab, use DexScreener for active PumpFun pairs
    if (tab === "graduating") {
      const [pumpResp, dexResp] = await Promise.allSettled([
        fetch(`https://frontend-api-v3.pump.fun/coins?offset=${offset}&limit=40&sort=market_cap&order=DESC&includeNsfw=false&complete=false`, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "FLUXMINT-AI/2.0" },
        }),
        fetch("https://api.dexscreener.com/latest/dex/search?q=pump.fun", {
          signal: AbortSignal.timeout(8000),
        }),
      ]);

      let tokens: any[] = [];

      // PumpFun tokens with active bonding curve
      if (pumpResp.status === "fulfilled" && pumpResp.value.ok) {
        const data = await pumpResp.value.json();
        const pumpTokens = (Array.isArray(data) ? data : []).filter((t: any) => {
          const mc = t.usd_market_cap || 0;
          return !t.complete && mc > 5000;
        });
        tokens.push(...pumpTokens);
      }

      // DexScreener PumpFun pairs (active, not graduated)
      if (dexResp.status === "fulfilled" && dexResp.value.ok) {
        const data = await dexResp.value.json();
        const pairs = (data.pairs || [])
          .filter((p: any) => p.chainId === "solana" && p.dexId?.includes("pump"))
          .slice(0, 15);

        for (const p of pairs) {
          // Don't add if we already have this mint from PumpFun
          const exists = tokens.some((t: any) => t.mint === p.baseToken?.address);
          if (!exists && p.baseToken?.address) {
            tokens.push({
              mint: p.baseToken.address,
              name: p.baseToken.name || "",
              symbol: p.baseToken.symbol || "",
              usd_market_cap: parseFloat(p.marketCap || "0"),
              complete: false,
              reply_count: 0,
              image_uri: p.info?.imageUrl || "",
              description: "",
              creator: "",
              virtual_sol_reserves: 0,
              virtual_token_reserves: 0,
              created_timestamp: p.pairCreatedAt || Date.now(),
              source: "dexscreener",
              price_change_5m: parseFloat(p.priceChange?.m5 || "0"),
              volume_24h: parseFloat(p.volume?.h24 || "0"),
              pair_url: p.url || "",
            });
          }
        }
      }

      // Sort by MC descending
      tokens.sort((a: any, b: any) => (b.usd_market_cap || 0) - (a.usd_market_cap || 0));
      tokens = tokens.slice(0, limit);

      return NextResponse.json({ tokens, count: tokens.length, source: "pump.fun+dexscreener", tab });
    }

    // For graduated tab, fetch from PumpFun with complete=true
    if (tab === "graduated") {
      const resp = await fetch(
        `https://frontend-api-v3.pump.fun/coins?offset=${offset}&limit=${limit}&sort=market_cap&order=DESC&includeNsfw=false&complete=true`,
        { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "FLUXMINT-AI/2.0" } }
      );
      if (!resp.ok) return NextResponse.json({ tokens: [], error: `PumpFun: ${resp.status}` });
      const data = await resp.json();
      // Filter to recent tokens (last 24 hours for graduated)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const tokens = (Array.isArray(data) ? data : []).filter((t: any) => {
        return (t.created_timestamp || 0) > oneDayAgo;
      }).slice(0, limit);

      return NextResponse.json({ tokens, count: tokens.length, source: "pump.fun", tab });
    }

    // Default: new tokens (sorted by created_timestamp)
    let url = `https://frontend-api-v3.pump.fun/coins?offset=${offset}&limit=${Math.min(limit * 2, 60)}&sort=${sort}&order=${order}&includeNsfw=false`;
    if (complete !== null && complete !== "") url += `&complete=${complete}`;

    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "FLUXMINT-AI/2.0" },
    });
    if (!resp.ok) return NextResponse.json({ tokens: [], error: `PumpFun: ${resp.status}` });

    const data = await resp.json();
    const tokens = (Array.isArray(data) ? data : []).slice(0, limit);

    return NextResponse.json({ tokens, count: tokens.length, source: "pump.fun", tab: tab || "new" });
  } catch (e: any) {
    return NextResponse.json({ tokens: [], error: e.message }, { status: 500 });
  }
}
