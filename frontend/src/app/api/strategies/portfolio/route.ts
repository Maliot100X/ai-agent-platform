import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({
      balance: 10000, initial_balance: 10000, total_pnl: 0,
      total_pnl_percent: 0, open_positions: 0, closed_positions: 0, win_rate: 0,
    });
  }

  try {
    // Get all agents
    const { data: agents } = await sb.from("agents").select("*");
    const allAgents = agents || [];

    // Calculate total portfolio from all agents
    let totalBalance = 0;
    let totalInitial = 0;
    let openPositions = 0;
    let totalPnl = 0;

    for (const agent of allAgents) {
      const balance = Number(agent.balance) || 0;
      const initial = 10000; // Default initial
      const holdings = agent.holdings || [];
      totalBalance += balance;
      totalInitial += initial;
      openPositions += holdings.length;

      // Sum P&L from holdings
      for (const h of holdings) {
        totalPnl += Number(h.pnl_usd) || 0;
      }
    }

    // Add unrealized P&L to balance difference
    const balancePnl = totalBalance - totalInitial + totalPnl;

    // Get closed trades for win rate
    const { data: closedTrades } = await sb.from("agent_logs")
      .select("pnl")
      .eq("action", "sell")
      .order("created_at", { ascending: false })
      .limit(100);

    const wins = (closedTrades || []).filter((t: any) => Number(t.pnl) > 0).length;
    const total = (closedTrades || []).length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return NextResponse.json({
      balance: Math.round(totalBalance),
      initial_balance: totalInitial,
      total_pnl: Math.round(balancePnl * 100) / 100,
      total_pnl_percent: totalInitial > 0 ? Math.round((balancePnl / totalInitial) * 10000) / 100 : 0,
      open_positions: openPositions,
      closed_positions: total,
      win_rate: winRate,
      agents: allAgents.length,
      running: allAgents.filter((a: any) => a.status === "running").length,
    });
  } catch (e: any) {
    return NextResponse.json({
      balance: 10000, initial_balance: 10000, total_pnl: 0,
      total_pnl_percent: 0, open_positions: 0, closed_positions: 0,
      win_rate: 0, error: e.message,
    });
  }
}
