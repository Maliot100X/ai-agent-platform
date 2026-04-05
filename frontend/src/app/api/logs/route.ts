import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
  const agentId = request.nextUrl.searchParams.get("agent_id");

  const sb = getSupabase();
  if (sb) {
    try {
      let query = sb.from("agent_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (agentId) query = query.eq("agent_id", agentId);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ logs: data || [], storage: "supabase" });
    } catch (e: any) {
      return NextResponse.json({ logs: [], error: e.message, storage: "error" });
    }
  }

  return NextResponse.json({ logs: [], storage: "no_supabase" });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

    const { data, error } = await sb.from("agent_logs").insert({
      agent_id: body.agent_id,
      action: body.action || "signal",
      symbol: body.symbol,
      mint: body.mint,
      price: body.price,
      amount: body.amount,
      market_cap: body.market_cap,
      signal_type: body.signal_type,
      strength: body.strength,
      reasoning: body.reasoning,
      pnl: body.pnl,
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ log: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
