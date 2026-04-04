import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * Agent Trading Engine - called periodically by the frontend.
 * For each running agent:
 * 1. Fetches PumpFun tokens
 * 2. Evaluates based on agent skills
 * 3. Makes paper buy/sell decisions
 * 4. Logs to agent_logs
 * 5. Updates agent balance and holdings
 */
export async function POST() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  try {
    // Get running agents
    const { data: agents } = await sb.from("agents").select("*").eq("status", "running");
    if (!agents || agents.length === 0) {
      return NextResponse.json({ message: "No running agents", trades: 0 });
    }

    // Fetch PumpFun tokens
    let pumpTokens: any[] = [];
    try {
      const resp = await fetch(
        "https://frontend-api-v3.pump.fun/coins?offset=0&limit=30&sort=market_cap&order=DESC&includeNsfw=false",
        { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "FLUXMINT-AI/2.0" } }
      );
      if (resp.ok) {
        const data = await resp.json();
        pumpTokens = Array.isArray(data) ? data : [];
      }
    } catch {}

    if (pumpTokens.length === 0) {
      return NextResponse.json({ message: "No PumpFun data available", trades: 0 });
    }

    const logs: any[] = [];
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    for (const agent of agents) {
      const balance = agent.balance || 10000;
      const minBuy = agent.min_buy || 50;
      const maxTokens = agent.max_tokens || 3;
      const holdings = agent.holdings || [];
      const skills = agent.skills || [];

      // Filter tokens based on skills
      const candidates = pumpTokens
        .filter((t: any) => (t.created_timestamp || 0) > twoWeeksAgo)
        .filter((t: any) => {
          const mc = t.usd_market_cap || 0;
          const replies = t.reply_count || 0;

          if (skills.includes("pumpfun_sniper") && !t.complete && mc < 10000 && mc > 100) return true;
          if (skills.includes("graduation_hunter") && !t.complete && mc > 30000) return true;
          if (skills.includes("momentum_trader") && mc > 50000 && replies > 5) return true;
          if (skills.includes("dip_buyer") && t.complete && mc > 10000 && mc < 200000) return true;
          return false;
        });

      // Check existing holdings for sell conditions
      for (const holding of holdings) {
        const current = pumpTokens.find((t: any) => t.mint === holding.mint);
        if (!current) continue;
        const currentMC = current.usd_market_cap || 0;
        const entryMC = holding.entry_mc || 0;
        const pnlPercent = entryMC > 0 ? ((currentMC - entryMC) / entryMC) * 100 : 0;

        // Sell conditions: +50% profit or -30% loss
        if (pnlPercent >= 50 || pnlPercent <= -30) {
          const action = pnlPercent >= 0 ? "sell_profit" : "sell_loss";
          const pnlUsd = (holding.amount || minBuy) * (pnlPercent / 100);

          logs.push({
            agent_id: agent.id,
            action: "sell",
            symbol: holding.symbol,
            mint: holding.mint,
            price: currentMC / 1e9,
            amount: holding.amount || minBuy,
            market_cap: currentMC,
            signal_type: "sell",
            strength: pnlPercent >= 50 ? 5 : 2,
            reasoning: `${action}: ${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(1)}% (Entry MC: $${entryMC.toLocaleString()} -> $${currentMC.toLocaleString()})`,
            pnl: pnlPercent,
          });

          // Remove from holdings, add back to balance
          const idx = holdings.findIndex((h: any) => h.mint === holding.mint);
          if (idx >= 0) holdings.splice(idx, 1);
          const newBalance = balance + (holding.amount || minBuy) + pnlUsd;

          await sb.from("agents").update({
            balance: newBalance,
            holdings,
            signals_generated: (agent.signals_generated || 0) + 1,
            trades_executed: (agent.trades_executed || 0) + 1,
            updated_at: new Date().toISOString(),
          }).eq("id", agent.id);
        }
      }

      // Buy new tokens if we have capacity and balance
      if (holdings.length < maxTokens && balance >= minBuy && candidates.length > 0) {
        // Pick the best candidate not already held
        const heldMints = holdings.map((h: any) => h.mint);
        const candidate = candidates.find((t: any) => !heldMints.includes(t.mint));

        if (candidate) {
          const mc = candidate.usd_market_cap || 0;
          const price = mc / 1e9;

          // Score the buy
          let strength = 2;
          if (!candidate.complete && mc > 30000 && mc < 200000) strength = 4;
          else if (candidate.complete && mc > 100000) strength = 3;
          else if (!candidate.complete && mc < 10000) strength = 5; // Early snipe

          logs.push({
            agent_id: agent.id,
            action: "buy",
            symbol: candidate.symbol,
            mint: candidate.mint,
            price,
            amount: minBuy,
            market_cap: mc,
            signal_type: "buy",
            strength,
            reasoning: `BUY ${candidate.symbol} at MC $${mc.toLocaleString()}. ${candidate.complete ? "Graduated" : "Active bonding curve"}. ${candidate.reply_count || 0} replies.`,
          });

          // Add to holdings, deduct from balance
          holdings.push({
            mint: candidate.mint,
            symbol: candidate.symbol,
            name: candidate.name,
            entry_mc: mc,
            entry_price: price,
            amount: minBuy,
            bought_at: new Date().toISOString(),
          });

          await sb.from("agents").update({
            balance: balance - minBuy,
            holdings,
            signals_generated: (agent.signals_generated || 0) + 1,
            trades_executed: (agent.trades_executed || 0) + 1,
            updated_at: new Date().toISOString(),
          }).eq("id", agent.id);
        }
      }

      // Generate signal logs for watched tokens (no buy, just signal)
      if (skills.includes("signal_generation")) {
        const watchTokens = candidates.slice(0, 3).filter((t: any) => {
          return !holdings.some((h: any) => h.mint === t.mint);
        });
        for (const t of watchTokens.slice(0, 2)) {
          logs.push({
            agent_id: agent.id,
            action: "signal",
            symbol: t.symbol,
            mint: t.mint,
            price: (t.usd_market_cap || 0) / 1e9,
            market_cap: t.usd_market_cap || 0,
            signal_type: "buy",
            strength: 3,
            reasoning: `Watch: ${t.symbol} MC $${(t.usd_market_cap || 0).toLocaleString()}, ${t.complete ? "graduated" : "active"}, ${t.reply_count || 0} replies`,
          });
        }
      }
    }

    // Insert all logs
    if (logs.length > 0) {
      await sb.from("agent_logs").insert(logs);
    }

    return NextResponse.json({
      message: `Processed ${agents.length} agents`,
      trades: logs.filter((l) => l.action === "buy" || l.action === "sell").length,
      signals: logs.filter((l) => l.action === "signal").length,
      total_logs: logs.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
