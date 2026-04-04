import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy for PumpFun API to avoid CORS issues.
 * Client-side requests to frontend-api-v3.pump.fun get blocked by CORS.
 * This route proxies the request server-side.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const offset = searchParams.get("offset") || "0";
  const limit = searchParams.get("limit") || "30";
  const sort = searchParams.get("sort") || "created_timestamp";
  const order = searchParams.get("order") || "DESC";
  const complete = searchParams.get("complete");

  let url = `https://frontend-api-v3.pump.fun/coins?offset=${offset}&limit=${limit}&sort=${sort}&order=${order}&includeNsfw=false`;
  if (complete !== null) {
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
    const tokens = Array.isArray(data) ? data : [];

    return NextResponse.json({
      tokens,
      count: tokens.length,
      source: "pump.fun",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message, tokens: [] },
      { status: 500 }
    );
  }
}
