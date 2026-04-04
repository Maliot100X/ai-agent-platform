import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * Agent Trading Engine - called every 30s by frontend for running agents.
 * 1. Fetches PumpFun tokens
 * 2. Updates current prices on holdings (live P&L)
 * 3. Sells if +50% profit or -30% loss
 * 4. Buys new tokens matching skills
 * 5. Logs everything to agent_logs
 */
export async function POST() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  try {
    const { data: agents } = await sb.from("agents").select("*").eq("status", "running");
    if (!agents || agents.length === 0) {
      return NextResponse.json({ message: "No running agents", trades: 0 });
    }

    // Fetch PumpFun tokens
    let pumpTokens: any[] = [];
    try {
      const resp = await fetch(
        "https://frontend-api-v3.pump.fun/coins?offset=0&limit=40&sort=market_cap&order=DESC&includeNsfw=false",
        { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "FLUXMINT-AI/2.0" } }
      );
      if (resp.ok) {
        const data = await resp.json();
        pumpTokens = Array.isArray(data) ? data : [];
      }
    } catch {}

    if (pumpTokens.length === 0) {
      return NextResponse.json({ message: "No PumpFun data", trades: 0 });
    }

    const logs: any[] = [];
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recentTokens = pumpTokens.filter((t: any) => (t.created_timestamp || 0) > twoWeeksAgo);

    for (const agent of agents) {
      let balance = Number(agent.balance) || 10000;
      const minBuy = Number(agent.min_buy) || 50;
      const maxTokens = agent.max_tokens || 3;
      let holdings: any[] = agent.holdings || [];
      const skills = agent.skills || [];
      let sigCount = agent.signals_generated || 0;
      let tradeCount = agent.trades_executed || 0;

      // 1. Update current prices on all holdings
      for (const holding of holdings) {
        const current = pumpTokens.find((t: any) => t.mint === holding.mint);
        if (current) {
          holding.current_mc = current.usd_market_cap || 0;
          holding.current_price = (current.usd_market_cap || 0) / 1e9;
          const entryMC = holding.entry_mc || 0;
          holding.pnl_percent = entryMC > 0 ? ((holding.current_mc - entryMC) / entryMC) * 100 : 0;
          holding.pnl_usd = (holding.amount || minBuy) * (holding.pnl_percent / 100);
        }
      }

      // 2. Check sell conditions on holdings
      const toSell: any[] = [];
      for (const holding of holdings) {
        const pnl = holding.pnl_percent || 0;
        // Sell at +50% profit or -30% loss
        if (pnl >= 50 || pnl <= -30) {
          toSell.push(holding);
        }
      }

      for (const holding of toSell) {
        const pnlUsd = (holding.amount || minBuy) * ((holding.pnl_percent || 0) / 100);
        logs.push({
          agent_id: agent.id,
          action: "sell",
          symbol: holding.symbol,
          mint: holding.mint,
          price: holding.current_price || 0,
          amount: holding.amount || minBuy,
          market_cap: holding.current_mc || 0,
          signal_type: "sell",
          strength: (holding.pnl_percent || 0) >= 50 ? 5 : 2,
          reasoning: `SELL ${holding.symbol}: ${(holding.pnl_percent || 0) >= 0 ? "+" : ""}${(holding.pnl_percent || 0).toFixed(1)}% P&L. Entry MC: $${(holding.entry_mc || 0).toLocaleString()} -> Current: $${(holding.current_mc || 0).toLocaleString()}`,
          pnl: holding.pnl_percent || 0,
        });
        balance += (holding.amount || minBuy) + pnlUsd;
        tradeCount++;
        sigCount++;
        holdings = holdings.filter((h: any) => h.mint !== holding.mint);
      }

      // 3. Buy new tokens if capacity and balance allow
      if (holdings.length < maxTokens && balance >= minBuy) {
        const heldMints = new Set(holdings.map((h: any) => h.mint));

        // Find candidates based on skills
        const candidates = recentTokens.filter((t: any) => {
          if (heldMints.has(t.mint)) return false;
          const mc = t.usd_market_cap || 0;
          const replies = t.reply_count || 0;

          if (skills.includes("pumpfun_sniper") && !t.complete && mc > 500 && mc < 20000) return true;
          if (skills.includes("graduation_hunter") && !t.complete && mc > 30000 && mc < 300000) return true;
          if (skills.includes("momentum_trader") && mc > 50000 && replies > 5) return true;
          if (skills.includes("dip_buyer") && t.complete && mc > 10000 && mc < 500000) return true;
          if (skills.includes("whale_watcher") && mc > 100000) return true;
          return false;
        });

        // Buy the best candidate
        const candidate = candidates[0];
        if (candidate) {
          const mc = candidate.usd_market_cap || 0;
          const price = mc / 1e9;

          let strength = 3;
          if (!candidate.complete && mc < 20000) strength = 5;
          else if (!candidate.complete && mc > 30000) strength = 4;
          else if (candidate.complete && mc > 100000) strength = 3;

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
            reasoning: `BUY ${candidate.symbol} at MC $${mc.toLocaleString()}. ${candidate.complete ? "Graduated (Raydium)" : "Active bonding curve"}. ${candidate.reply_count || 0} replies. SOL pool: ${((candidate.virtual_sol_reserves || 0) / 1e9).toFixed(1)} SOL`,
          });

          holdings.push({
            mint: candidate.mint,
            symbol: candidate.symbol,
            name: candidate.name || "",
            image_uri: candidate.image_uri || "",
            entry_mc: mc,
            entry_price: price,
            current_mc: mc,
            current_price: price,
            amount: minBuy,
            pnl_percent: 0,
            pnl_usd: 0,
            bought_at: new Date().toISOString(),
          });

          balance -= minBuy;
          tradeCount++;
          sigCount++;
        }
      }

      // 4. Generate watch signals
      if (skills.includes("signal_generation")) {
        const heldMints = new Set(holdings.map((h: any) => h.mint));
        const watchTokens = recentTokens
          .filter((t: any) => !heldMints.has(t.mint) && (t.usd_market_cap || 0) > 10000)
          .slice(0, 2);

        for (const t of watchTokens) {
          logs.push({
            agent_id: agent.id,
            action: "signal",
            symbol: t.symbol,
            mint: t.mint,
            price: (t.usd_market_cap || 0) / 1e9,
            market_cap: t.usd_market_cap || 0,
            signal_type: t.usd_market_cap > 50000 ? "buy" : "hold",
            strength: 3,
            reasoning: `WATCH: ${t.symbol} MC $${(t.usd_market_cap || 0).toLocaleString()} | ${t.complete ? "Graduated" : "Active"} | ${t.reply_count || 0} replies`,
          });
          sigCount++;
        }
      }

      // 5. Update agent in Supabase
      await sb.from("agents").update({
        balance,
        holdings,
        signals_generated: sigCount,
        trades_executed: tradeCount,
        updated_at: new Date().toISOString(),
      }).eq("id", agent.id);
    }

    // Insert all logs
    if (logs.length > 0) {
      await sb.from("agent_logs").insert(logs);
    }

    return NextResponse.json({
      agents_processed: agents.length,
      buys: logs.filter((l) => l.action === "buy").length,
      sells: logs.filter((l) => l.action === "sell").length,
      signals: logs.filter((l) => l.action === "signal").length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
