import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ open: [], closed: [] });

  try {
    // Open positions from agent holdings
    const { data: agents } = await sb.from("agents").select("id, name, holdings");
    const open: any[] = [];
    for (const agent of agents || []) {
      for (const h of agent.holdings || []) {
        open.push({
          id: `${agent.id}-${h.mint}`,
          agent: agent.name,
          symbol: h.symbol,
          mint: h.mint,
          side: "long",
          entry_price: h.entry_mc || 0,
          current_price: h.current_mc || h.entry_mc || 0,
          pnl: h.pnl_usd || 0,
          pnl_percent: h.pnl_percent || 0,
          amount: h.amount || 0,
          strategy: "agent",
          bought_at: h.bought_at,
        });
      }
    }

    // Closed trades from sell logs
    const { data: sells } = await sb.from("agent_logs")
      .select("*")
      .eq("action", "sell")
      .order("created_at", { ascending: false })
      .limit(50);

    const closed = (sells || []).map((s: any) => ({
      id: s.id,
      symbol: s.symbol,
      mint: s.mint,
      side: "long",
      entry_price: 0,
      exit_price: s.market_cap || 0,
      pnl: s.pnl || 0,
      amount: s.amount || 0,
      strategy: "agent",
      closed_at: s.created_at,
    }));

    return NextResponse.json({ open, closed });
  } catch (e: any) {
    return NextResponse.json({ open: [], closed: [], error: e.message });
  }
}
