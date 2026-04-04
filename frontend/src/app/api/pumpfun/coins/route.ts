import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy for PumpFun API to avoid CORS issues.
 * Filters tokens to only show recent ones (max 2 weeks old).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const offset = searchParams.get("offset") || "0";
  const limit = parseInt(searchParams.get("limit") || "30");
  const sort = searchParams.get("sort") || "created_timestamp";
  const order = searchParams.get("order") || "DESC";
  const complete = searchParams.get("complete");
  const tab = searchParams.get("tab") || "";

  let url = `https://frontend-api-v3.pump.fun/coins?offset=${offset}&limit=${Math.min(limit * 2, 60)}&sort=${sort}&order=${order}&includeNsfw=false`;
  
  if (complete !== null && complete !== "") {
    url += `&complete=${complete}`;
  }

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "FLUXMINT-AI/2.0",
        "Accept": "application/json",
      },
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `PumpFun API returned ${resp.status}`, tokens: [] },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    let tokens = Array.isArray(data) ? data : [];

    // Filter to only recent tokens (max 2 weeks old)
    const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    tokens = tokens.filter((t: any) => {
      const created = t.created_timestamp || 0;
      // PumpFun timestamps are in milliseconds
      return created > twoWeeksAgo;
    });

    // For "graduating" tab: tokens that are NOT complete but have significant MC
    // (bonding curve still active, approaching graduation)
    if (tab === "graduating") {
      tokens = tokens.filter((t: any) => {
        const mc = t.usd_market_cap || 0;
        return !t.complete && mc > 5000; // Must have some traction
      });
    }

    // For "graduated" tab: only completed tokens
    if (tab === "graduated") {
      tokens = tokens.filter((t: any) => t.complete === true);
    }

    // For "new" tab: newest tokens regardless of status
    if (tab === "new") {
      // Already sorted by created_timestamp DESC
    }

    // Limit results
    tokens = tokens.slice(0, limit);

    return NextResponse.json({
      tokens,
      count: tokens.length,
      source: "pump.fun",
      tab: tab || "all",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message, tokens: [] },
      { status: 500 }
    );
  }
}
