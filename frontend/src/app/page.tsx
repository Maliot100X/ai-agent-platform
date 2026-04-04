"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import StatCard from "@/components/StatCard";
import SignalFeed from "@/components/SignalFeed";
import ActivityTimeline from "@/components/ActivityTimeline";
import PerformanceChart from "@/components/PerformanceChart";
import { apiFetch } from "@/lib/api";
import { useWebSocket } from "@/lib/useWebSocket";
import { getAgentCount, getRunningAgentCount } from "@/lib/agentStore";

const NetworkGraph = dynamic(() => import("@/components/NetworkGraph"), { ssr: false });

export default function OverviewPage() {
  const [health, setHealth] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [pumpfunTokens, setPumpfunTokens] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any>(null);
  const { connected, signals, actions } = useWebSocket();

  useEffect(() => {
    apiFetch("/api/health").then(setHealth).catch(() => {});
    apiFetch("/api/strategies/portfolio").then(setPortfolio).catch(() => {});
    apiFetch("/api/trading/pumpfun/launches?limit=6").then((d) => setPumpfunTokens(d.launches || [])).catch(() => {});
    apiFetch("/api/trading/summary").then(setMarketData).catch(() => {});

    const interval = setInterval(() => {
      apiFetch("/api/health").then(setHealth).catch(() => {});
      apiFetch("/api/trading/pumpfun/launches?limit=6").then((d) => setPumpfunTokens(d.launches || [])).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const agentCount = typeof window !== "undefined" ? getAgentCount() : 0;
  const runningCount = typeof window !== "undefined" ? getRunningAgentCount() : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-slate-400 mt-1">Real-time PumpFun analytics and AI trading signals</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-sm text-slate-400">{connected ? "Live" : "Reconnecting..."}</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Agents"
          value={`${runningCount}/${agentCount}`}
          subtitle="Running / Total created"
          color="blue"
        />
        <StatCard
          title="PumpFun Signals"
          value={signals.filter((s: any) => s.source === "pumpfun").length}
          subtitle="Real-time from PumpFun API"
          color="purple"
        />
        <StatCard
          title="Market Cap"
          value={marketData ? `$${(marketData.total_market_cap / 1e12).toFixed(2)}T` : "Loading..."}
          subtitle={marketData ? `${marketData.market_cap_change_24h?.toFixed(2) || 0}% 24h` : ""}
          trend={marketData?.market_cap_change_24h > 0 ? "up" : marketData?.market_cap_change_24h < 0 ? "down" : "neutral"}
          color="green"
        />
        <StatCard
          title="Buy Signals"
          value={signals.filter((s: any) => s.signal_type === "buy").length}
          subtitle={`${signals.filter((s: any) => s.strength >= 4).length} strong signals`}
          color="yellow"
        />
      </div>

      {/* PumpFun Hot Tokens */}
      {pumpfunTokens.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="text-lg font-semibold text-white mb-3">PumpFun Hot Launches</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pumpfunTokens.map((t: any) => (
              <a
                key={t.mint}
                href={`https://pump.fun/${t.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card p-4 hover:border-primary-500/30 transition-all group"
              >
                <div className="flex items-start gap-3">
                  {t.image_uri && (
                    <img
                      src={t.image_uri}
                      alt={t.symbol}
                      className="w-8 h-8 rounded-lg object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{t.symbol}</span>
                      {t.complete && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                          Graduated
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{t.name}</p>
                  </div>
                  <span className="text-xs text-white font-medium">
                    ${(t.market_cap || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
