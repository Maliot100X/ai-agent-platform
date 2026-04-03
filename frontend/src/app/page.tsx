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

const NetworkGraph = dynamic(() => import("@/components/NetworkGraph"), { ssr: false });

export default function OverviewPage() {
  const [health, setHealth] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const { connected, signals, actions } = useWebSocket();

  useEffect(() => {
    apiFetch("/api/health").then(setHealth).catch(() => {});
    apiFetch("/api/strategies/portfolio").then(setPortfolio).catch(() => {});
    const interval = setInterval(() => {
      apiFetch("/api/health").then(setHealth).catch(() => {});
      apiFetch("/api/strategies/portfolio").then(setPortfolio).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-slate-400 mt-1">Real-time AI agent monitoring and paper trading</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-sm text-slate-400">{connected ? "Live" : "Connecting..."}</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Agents"
          value={health?.agents ?? 0}
          subtitle="Running continuously"
          color="blue"
        />
        <StatCard
          title="Signals Generated"
          value={health?.signals_count ?? signals.length}
          subtitle="Paper trading signals"
          color="purple"
        />
        <StatCard
          title="Portfolio P&L"
          value={portfolio ? `$${portfolio.total_pnl}` : "$0.00"}
          subtitle={portfolio ? `${portfolio.total_pnl_percent}%` : "0%"}
          trend={portfolio?.total_pnl > 0 ? "up" : portfolio?.total_pnl < 0 ? "down" : "neutral"}
          color="green"
        />
        <StatCard
          title="Open Positions"
          value={portfolio?.open_positions ?? 0}
          subtitle={`Win rate: ${portfolio?.win_rate ?? 0}%`}
          color="yellow"
        />
      </div>

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
