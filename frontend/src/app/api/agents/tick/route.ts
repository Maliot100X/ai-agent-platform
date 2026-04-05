import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * Agent Trading Engine
 * Fetches NEW PumpFun tokens sorted by newest first.
 * Each agent buys different tokens based on skills.
 * Sells at profit/loss thresholds.
 */
export async function POST() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  try {
    const { data: agents } = await sb.from("agents").select("*").eq("status", "running");
    if (!agents?.length) return NextResponse.json({ message: "No running agents", trades: 0 });

    // Fetch NEW PumpFun tokens (sorted by newest, not by MC)
    let newTokens: any[] = [];
    let trendingTokens: any[] = [];

    const [newResp, trendResp] = await Promise.allSettled([
      fetch("https://frontend-api-v3.pump.fun/coins?offset=0&limit=30&sort=created_timestamp&order=DESC&includeNsfw=false", {
        signal: AbortSignal.timeout(8000), headers: { "User-Agent": "FLUXMINT-AI/2.0" },
      }),
      fetch("https://frontend-api-v3.pump.fun/coins?offset=0&limit=20&sort=market_cap&order=DESC&includeNsfw=false&complete=false", {
        signal: AbortSignal.timeout(8000), headers: { "User-Agent": "FLUXMINT-AI/2.0" },
      }),
    ]);

    if (newResp.status === "fulfilled" && newResp.value.ok) {
      const d = await newResp.value.json();
      newTokens = Array.isArray(d) ? d : [];
    }
    if (trendResp.status === "fulfilled" && trendResp.value.ok) {
      const d = await trendResp.value.json();
      trendingTokens = Array.isArray(d) ? d : [];
    }

    if (!newTokens.length && !trendingTokens.length) {
      return NextResponse.json({ message: "No PumpFun data", trades: 0 });
    }

    const logs: any[] = [];
    // Collect all mints already held by any agent to avoid duplicates
    const globalHeldMints = new Set<string>();
    for (const agent of agents) {
      for (const h of agent.holdings || []) globalHeldMints.add(h.mint);
    }

    for (const agent of agents) {
      let balance = Number(agent.balance) || 10000;
      const minBuy = Number(agent.min_buy) || 50;
      const maxTokens = agent.max_tokens || 3;
      let holdings: any[] = agent.holdings || [];
      const skills = agent.skills || [];
      let sigCount = agent.signals_generated || 0;
      let tradeCount = agent.trades_executed || 0;

      // 1. Update current prices on holdings from PumpFun data
      const allTokens = [...newTokens, ...trendingTokens];
      for (const h of holdings) {
        const current = allTokens.find((t: any) => t.mint === h.mint);
        if (current) {
          h.current_mc = current.usd_market_cap || 0;
          h.current_price = (current.usd_market_cap || 0) / 1e9;
          const entryMC = h.entry_mc || 0;
          h.pnl_percent = entryMC > 0 ? ((h.current_mc - entryMC) / entryMC) * 100 : 0;
          h.pnl_usd = (h.amount || minBuy) * (h.pnl_percent / 100);
        }
      }

      // 2. Sell holdings at thresholds
      const toSell = holdings.filter((h: any) => {
        const pnl = h.pnl_percent || 0;
        return pnl >= 50 || pnl <= -30;
      });

      for (const h of toSell) {
        const pnlUsd = (h.amount || minBuy) * ((h.pnl_percent || 0) / 100);
        logs.push({
          agent_id: agent.id, action: "sell", symbol: h.symbol, mint: h.mint,
          price: h.current_price || 0, amount: h.amount || minBuy,
          market_cap: h.current_mc || 0, signal_type: "sell",
          strength: (h.pnl_percent || 0) >= 50 ? 5 : 2,
          reasoning: `SELL ${h.symbol}: ${(h.pnl_percent || 0) >= 0 ? "+" : ""}${(h.pnl_percent || 0).toFixed(1)}% P&L. Entry: $${(h.entry_mc || 0).toLocaleString()} -> Now: $${(h.current_mc || 0).toLocaleString()}`,
          pnl: h.pnl_percent || 0,
        });
        balance += (h.amount || minBuy) + pnlUsd;
        tradeCount++;
        sigCount++;
        globalHeldMints.delete(h.mint);
      }
      holdings = holdings.filter((h: any) => !toSell.includes(h));

      // 3. Buy NEW tokens based on skills
      if (holdings.length < maxTokens && balance >= minBuy) {
        // Pick candidates based on skill type
        let candidates: any[] = [];

        if (skills.includes("pumpfun_sniper")) {
          // Snipers buy BRAND NEW tokens (low MC, just launched)
          candidates.push(...newTokens.filter((t: any) => {
            const mc = t.usd_market_cap || 0;
            return !t.complete && mc > 100 && mc < 50000 && !globalHeldMints.has(t.mint);
          }));
        }

        if (skills.includes("graduation_hunter")) {
          // Graduation hunters buy tokens approaching graduation (high MC, not complete)
          candidates.push(...trendingTokens.filter((t: any) => {
            const mc = t.usd_market_cap || 0;
            return !t.complete && mc > 20000 && mc < 500000 && !globalHeldMints.has(t.mint);
          }));
        }

        if (skills.includes("momentum_trader")) {
          // Momentum traders buy tokens with high activity
          candidates.push(...trendingTokens.filter((t: any) => {
            const mc = t.usd_market_cap || 0;
            return mc > 5000 && (t.reply_count || 0) > 3 && !globalHeldMints.has(t.mint);
          }));
        }

        if (skills.includes("dip_buyer")) {
          // Dip buyers target graduated tokens with lower MC
          candidates.push(...allTokens.filter((t: any) => {
            const mc = t.usd_market_cap || 0;
            return t.complete && mc > 5000 && mc < 200000 && !globalHeldMints.has(t.mint);
          }));
        }

        // Deduplicate and shuffle for variety
        const seen = new Set<string>();
        candidates = candidates.filter((t: any) => {
          if (seen.has(t.mint)) return false;
          seen.add(t.mint);
          return true;
        });
        // Shuffle to get diverse picks
        for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        // Buy up to maxTokens
        const buyCount = Math.min(maxTokens - holdings.length, candidates.length);
        for (let i = 0; i < buyCount && balance >= minBuy; i++) {
          const token = candidates[i];
          const mc = token.usd_market_cap || 0;
          const price = mc / 1e9;

          let strength = 3;
          if (!token.complete && mc < 10000) strength = 5;
          else if (!token.complete && mc < 50000) strength = 4;
          else if (token.complete) strength = 2;

          logs.push({
            agent_id: agent.id, action: "buy", symbol: token.symbol, mint: token.mint,
            price, amount: minBuy, market_cap: mc, signal_type: "buy", strength,
            reasoning: `BUY ${token.symbol} (${token.name || ""}) at MC $${mc.toLocaleString()}. ${token.complete ? "Graduated" : "Active bonding"}. ${token.reply_count || 0} replies. SOL pool: ${((token.virtual_sol_reserves || 0) / 1e9).toFixed(1)}`,
          });

          holdings.push({
            mint: token.mint, symbol: token.symbol, name: token.name || "",
            image_uri: token.image_uri || "",
            entry_mc: mc, entry_price: price,
            current_mc: mc, current_price: price,
            amount: minBuy, pnl_percent: 0, pnl_usd: 0,
            bought_at: new Date().toISOString(),
          });

          balance -= minBuy;
          tradeCount++;
          sigCount++;
          globalHeldMints.add(token.mint);
        }
      }

      // 4. Update agent
      await sb.from("agents").update({
        balance, holdings,
        signals_generated: sigCount,
        trades_executed: tradeCount,
        updated_at: new Date().toISOString(),
      }).eq("id", agent.id);
    }

    if (logs.length > 0) await sb.from("agent_logs").insert(logs);

    return NextResponse.json({
      agents: agents.length,
      buys: logs.filter((l) => l.action === "buy").length,
      sells: logs.filter((l) => l.action === "sell").length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
