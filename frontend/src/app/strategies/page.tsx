"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch, apiPost } from "@/lib/api";
import PerformanceChart from "@/components/PerformanceChart";

const strategies = [
  { name: "momentum", label: "Momentum", desc: "Trades in the direction of sustained price movement" },
  { name: "mean_reversion", label: "Mean Reversion", desc: "Trades reversals when price is overextended" },
  { name: "breakout", label: "Breakout", desc: "Detects and trades price breakouts from ranges" },
];

export default function StrategiesPage() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [positions, setPositions] = useState<any>({ open: [], closed: [] });

  useEffect(() => {
    apiFetch("/api/strategies/portfolio").then(setPortfolio).catch(() => {});
    apiFetch("/api/strategies/positions").then(setPositions).catch(() => {});
  }, []);

  const startStrategy = async (name: string) => {
    await apiPost("/api/strategies/start", { strategy: name });
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-white">Strategies</h1>
        <p className="text-slate-400 mt-1">Paper trading strategy management and performance</p>
      </motion.div>

      {/* Portfolio Summary */}
      {portfolio && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-sm text-slate-400">Balance</p>
            <p className="text-2xl font-bold text-white">${portfolio.balance}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-slate-400">Total P&L</p>
            <p className={`text-2xl font-bold ${portfolio.total_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              ${portfolio.total_pnl}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-slate-400">Win Rate</p>
            <p className="text-2xl font-bold text-white">{portfolio.win_rate}%</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-slate-400">Open Positions</p>
            <p className="text-2xl font-bold text-primary-400">{portfolio.open_positions}</p>
          </div>
        </div>
      )}

      <PerformanceChart />

      {/* Strategy Cards */}
      <h3 className="text-lg font-semibold text-white">Available Strategies</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map((s) => (
          <motion.div
            key={s.name}
            whileHover={{ scale: 1.02 }}
            className="glass-card p-5"
          >
            <h4 className="text-lg font-semibold text-white mb-2">{s.label}</h4>
            <p className="text-sm text-slate-400 mb-4">{s.desc}</p>
            <button
              onClick={() => startStrategy(s.name)}
              className="px-4 py-2 bg-primary-500/10 text-primary-400 rounded-xl text-sm font-medium hover:bg-primary-500/20 transition-colors"
            >
              Start Strategy
            </button>
          </motion.div>
        ))}
      </div>

      {/* Open Positions */}
      <h3 className="text-lg font-semibold text-white">Open Positions</h3>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left p-4 text-slate-400 font-medium">Symbol</th>
              <th className="text-left p-4 text-slate-400 font-medium">Side</th>
              <th className="text-left p-4 text-slate-400 font-medium">Entry</th>
              <th className="text-left p-4 text-slate-400 font-medium">Current</th>
              <th className="text-left p-4 text-slate-400 font-medium">P&L</th>
              <th className="text-left p-4 text-slate-400 font-medium">Strategy</th>
            </tr>
          </thead>
          <tbody>
            {positions.open?.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">No open positions</td>
              </tr>
            ) : (
              positions.open?.map((p: any) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="p-4 text-white font-medium">{p.symbol}</td>
                  <td className="p-4">
                    <span className={p.side === "long" ? "text-emerald-400" : "text-red-400"}>{p.side}</span>
                  </td>
                  <td className="p-4 text-slate-300">${p.entry_price}</td>
                  <td className="p-4 text-slate-300">${p.current_price}</td>
                  <td className={`p-4 font-medium ${p.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${p.pnl} ({p.pnl_percent}%)
                  </td>
                  <td className="p-4 text-slate-400">{p.strategy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
