"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import StatCard from "@/components/StatCard";
import SignalFeed from "@/components/SignalFeed";
import ActivityTimeline from "@/components/ActivityTimeline";
import PerformanceChart from "@/components/PerformanceChart";
import { apiFetch } from "@/lib/api";
import { useWebSocket } from "@/lib/useWebSocket";

const NetworkGraph = dynamic(() => import("@/components/NetworkGraph"), { ssr: false });

export default function OverviewPage() {
  const [health, setHealth] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [pumpfunTokens, setPumpfunTokens] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any>(null);
  const [agentData, setAgentData] = useState<any>({ agents: [] });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { connected, signals, actions } = useWebSocket();

  const loadAll = useCallback(() => {
    apiFetch("/api/health").then(setHealth).catch(() => {});
    apiFetch("/api/strategies/portfolio").then(setPortfolio).catch(() => {});
    apiFetch("/api/pumpfun/coins?limit=6&sort=market_cap&order=DESC").then((d) => setPumpfunTokens(d.tokens || [])).catch(() => {});
    apiFetch("/api/trading/summary").then(setMarketData).catch(() => {});
    apiFetch("/api/agents").then(setAgentData).catch(() => {});
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    loadAll();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const agents = agentData?.agents || [];
  const runningCount = agents.filter((a: any) => a.status === "running").length;
  const totalBalance = agents.reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);
  const totalHoldings = agents.reduce((sum: number, a: any) => sum + (a.holdings || []).length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-slate-400 mt-1">Real-time agent trading and PumpFun analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">
            {lastRefresh.toLocaleTimeString()} | Auto: 5min
          </span>
          <button onClick={loadAll} className="px-3 py-1.5 bg-primary-500/10 text-primary-400 rounded-lg text-xs hover:bg-primary-500/20 transition-colors font-medium">
            Refresh
          </button>
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-sm text-slate-400">{connected ? "Live" : "Reconnecting..."}</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Agents"
          value={`${runningCount}/${agents.length}`}
          subtitle={`${totalHoldings} open positions`}
          color="blue"
        />
        <StatCard
          title="Total Balance"
          value={`$${totalBalance.toLocaleString()}`}
          subtitle={`${agents.length} agent${agents.length !== 1 ? "s" : ""} total`}
          color="green"
        />
        <StatCard
          title="Agent Trades"
          value={signals.filter((s: any) => s.source === "agent").length || signals.length}
          subtitle={`${signals.filter((s: any) => s.signal_type === "buy").length} buys, ${signals.filter((s: any) => s.signal_type === "sell").length} sells`}
          color="purple"
        />
        <StatCard
          title="Market Cap"
          value={marketData ? `$${(marketData.total_market_cap / 1e12).toFixed(2)}T` : "Loading..."}
          subtitle={marketData ? `${marketData.market_cap_change_24h?.toFixed(2) || 0}% 24h` : ""}
          trend={marketData?.market_cap_change_24h > 0 ? "up" : marketData?.market_cap_change_24h < 0 ? "down" : "neutral"}
          color="yellow"
        />
      </div>

      {/* Running Agents Quick View */}
      {runningCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="text-lg font-semibold text-white mb-3">Running Agents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.filter((a: any) => a.status === "running").map((agent: any) => (
              <div key={agent.agent_id || agent.id} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white font-medium text-sm">{agent.name}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">${Number(agent.balance || 0).toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(agent.skill_details || []).slice(0, 3).map((s: any) => (
                    <span key={s.id} className="text-[9px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-300">{s.name}</span>
                  ))}
                </div>
                {(agent.holdings || []).length > 0 && (
                  <div className="space-y-1">
                    {(agent.holdings || []).map((h: any) => {
                      const pnl = Number(h.pnl_percent || 0);
                      return (
                        <div key={h.mint} className="flex items-center justify-between text-[10px]">
                          <span className="text-white">{h.symbol}</span>
                          <span className={pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                            {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* PumpFun Hot Tokens */}
      {pumpfunTokens.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="text-lg font-semibold text-white mb-3">PumpFun Hot Launches</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pumpfunTokens.map((t: any) => (
              <a key={t.mint} href={`https://pump.fun/${t.mint}`} target="_blank" rel="noopener noreferrer"
                className="glass-card p-4 hover:border-primary-500/30 transition-all group">
                <div className="flex items-start gap-3">
                  {t.image_uri && (
                    <img src={t.image_uri} alt={t.symbol} className="w-10 h-10 rounded-lg object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{t.symbol}</span>
                      {t.complete && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Graduated</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{t.name}</p>
                    <p className="text-[10px] text-slate-600 font-mono truncate mt-0.5">{t.mint}</p>
                  </div>
                  <span className="text-xs text-white font-medium">
                    ${(t.usd_market_cap || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {/* Network Graph + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Agent Network</h3>
          <NetworkGraph />
        </div>
        <PerformanceChart />
      </div>

      {/* Signals + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SignalFeed signals={signals} />
        <ActivityTimeline activities={actions} />
      </div>
    </div>
  );
}
