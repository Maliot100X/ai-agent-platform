"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch, apiPost } from "@/lib/api";
import PerformanceChart from "@/components/PerformanceChart";

export default function StrategiesPage() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [positions, setPositions] = useState<any>({ open: [], closed: [] });
  const [agents, setAgents] = useState<any[]>([]);

  const loadData = () => {
    apiFetch("/api/strategies/portfolio").then(setPortfolio).catch(() => {});
    apiFetch("/api/strategies/positions").then(setPositions).catch(() => {});
    apiFetch("/api/agents").then((d) => setAgents(d.agents || [])).catch(() => {});
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
          Strategies & Positions
        </h1>
        <p className="text-slate-400 mt-1">Live portfolio from agent trading activity</p>
      </motion.div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Balance</p>
          <p className="text-2xl font-bold text-white">${portfolio?.balance?.toLocaleString() || "0"}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total P&L</p>
          <p className={`text-2xl font-bold ${(portfolio?.total_pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${portfolio?.total_pnl || "0.00"}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Win Rate</p>
          <p className="text-2xl font-bold text-white">{portfolio?.win_rate || 0}%</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Open / Closed</p>
          <p className="text-2xl font-bold text-primary-400">
            {portfolio?.open_positions || 0} / {portfolio?.closed_positions || 0}
          </p>
        </div>
      </div>

      <PerformanceChart />

      {/* Active Agents */}
      <h3 className="text-lg font-semibold text-white">Active Agents</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.filter((a) => a.status === "running").length === 0 ? (
          <div className="glass-card p-6 col-span-3 text-center">
            <p className="text-slate-400">No running agents. <a href="/agents" className="text-primary-400 hover:text-primary-300">Create and start an agent</a> to begin trading.</p>
          </div>
        ) : agents.filter((a) => a.status === "running").map((agent) => (
          <div key={agent.agent_id || agent.id} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-medium">{agent.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 ml-auto">Running</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              <div><p className="text-slate-500">Balance</p><p className="text-white">${Number(agent.balance || 0).toLocaleString()}</p></div>
              <div><p className="text-slate-500">Trades</p><p className="text-white">{agent.trades_executed || 0}</p></div>
              <div><p className="text-slate-500">Holdings</p><p className="text-white">{(agent.holdings || []).length}/{agent.max_tokens || 3}</p></div>
            </div>
            {(agent.holdings || []).map((h: any) => (
              <div key={h.mint} className="flex items-center justify-between text-xs py-1 border-t border-white/5">
                <span className="text-white">{h.symbol}</span>
                <span className="text-slate-500">${Number(h.current_mc || h.entry_mc || 0).toLocaleString()}</span>
                <span className={`font-medium ${(h.pnl_percent || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(h.pnl_percent || 0) >= 0 ? "+" : ""}{(h.pnl_percent || 0).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Open Positions */}
      <h3 className="text-lg font-semibold text-white">Open Positions (All Agents)</h3>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left p-4 text-slate-400 font-medium">Token</th>
              <th className="text-left p-4 text-slate-400 font-medium">Agent</th>
              <th className="text-left p-4 text-slate-400 font-medium">Entry MC</th>
              <th className="text-left p-4 text-slate-400 font-medium">Current MC</th>
              <th className="text-left p-4 text-slate-400 font-medium">P&L</th>
              <th className="text-left p-4 text-slate-400 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(positions.open || []).length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-slate-500">No open positions. Start an agent to begin trading.</td></tr>
            ) : (positions.open || []).map((p: any) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="p-4 text-white font-medium">{p.symbol}</td>
                <td className="p-4 text-slate-400">{p.agent}</td>
                <td className="p-4 text-slate-300">${Number(p.entry_price || 0).toLocaleString()}</td>
                <td className="p-4 text-slate-300">${Number(p.current_price || 0).toLocaleString()}</td>
                <td className={`p-4 font-medium ${(p.pnl_percent || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(p.pnl_percent || 0) >= 0 ? "+" : ""}{(p.pnl_percent || 0).toFixed(1)}%
                </td>
                <td className="p-4 text-slate-300">${p.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Closed Trades */}
      {(positions.closed || []).length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-white">Closed Trades</h3>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-slate-400 font-medium">Token</th>
                  <th className="text-left p-4 text-slate-400 font-medium">P&L</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Amount</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Closed</th>
                </tr>
              </thead>
              <tbody>
                {(positions.closed || []).map((p: any) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="p-4 text-white font-medium">{p.symbol}</td>
                    <td className={`p-4 font-medium ${(p.pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {(p.pnl || 0) >= 0 ? "+" : ""}{Number(p.pnl || 0).toFixed(1)}%
                    </td>
                    <td className="p-4 text-slate-300">${p.amount}</td>
                    <td className="p-4 text-slate-500 text-xs">{p.closed_at ? new Date(p.closed_at).toLocaleString() : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
