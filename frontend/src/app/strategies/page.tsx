"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch, apiPost } from "@/lib/api";
import PerformanceChart from "@/components/PerformanceChart";

const strategies = [
  { name: "pumpfun_snipe", label: "PumpFun Sniper", desc: "Detects new PumpFun launches and enters early positions before bonding curve fills. Sells at 2-5x or on rug signals.", risk: "High", color: "from-red-500/20 to-orange-500/5" },
  { name: "graduation_ride", label: "Graduation Rider", desc: "Buys tokens at 80-95% bonding curve completion and rides the Raydium listing pump. Targets 50-200% gains.", risk: "High", color: "from-yellow-500/20 to-amber-500/5" },
  { name: "momentum", label: "Momentum Trader", desc: "Rides sustained price movement on high-volume tokens. Uses DexScreener volume spikes and trend analysis.", risk: "Medium", color: "from-purple-500/20 to-pink-500/5" },
  { name: "whale_copy", label: "Whale Copy", desc: "Mirrors trades from known profitable wallets on Solana. Tracks via Helius RPC and enters with configurable delay.", risk: "Medium", color: "from-blue-500/20 to-cyan-500/5" },
  { name: "dip_accumulate", label: "Dip Accumulator", desc: "Buys tokens after sharp dips when RSI indicates oversold conditions. Best for graduated tokens with established liquidity.", risk: "Low", color: "from-green-500/20 to-emerald-500/5" },
];

export default function StrategiesPage() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [positions, setPositions] = useState<any>({ open: [], closed: [] });
  const [activeStrategies, setActiveStrategies] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    apiFetch("/api/strategies/portfolio").then(setPortfolio).catch(() => {});
    apiFetch("/api/strategies/positions").then(setPositions).catch(() => {});
  }, []);

  const startStrategy = async (name: string) => {
    try {
      const res = await apiPost("/api/strategies/start", { strategy: name });
      if (res.success) {
        setActiveStrategies((prev) => [...prev, name]);
        setStatusMsg(`Strategy '${name}' started in paper trading mode.`);
        setTimeout(() => setStatusMsg(""), 3000);
      }
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-white">Strategies</h1>
        <p className="text-slate-400 mt-1">PumpFun and Solana trading strategies with paper trading</p>
      </motion.div>

      {/* Status Message */}
      {statusMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-3 text-sm text-emerald-400 border-emerald-500/20"
        >
          {statusMsg}
        </motion.div>
      )}

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Balance</p>
          <p className="text-2xl font-bold text-white">${portfolio?.balance?.toLocaleString() || "10,000"}</p>
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
          <p className="text-sm text-slate-400">Active Strategies</p>
          <p className="text-2xl font-bold text-primary-400">{activeStrategies.length}</p>
        </div>
      </div>

      <PerformanceChart />

      {/* Strategy Cards */}
      <h3 className="text-lg font-semibold text-white">Available Strategies</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((s) => {
          const isActive = activeStrategies.includes(s.name);
          return (
            <motion.div
              key={s.name}
              whileHover={{ scale: 1.02 }}
              className={`glass-card p-5 bg-gradient-to-br ${s.color} ${isActive ? "animate-border-glow" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-white">{s.label}</h4>
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  s.risk === "High" ? "bg-red-500/10 text-red-400" :
                  s.risk === "Medium" ? "bg-yellow-500/10 text-yellow-400" :
                  "bg-green-500/10 text-green-400"
                }`}>
                  {s.risk} Risk
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-4">{s.desc}</p>
              <button
                onClick={() => startStrategy(s.name)}
                disabled={isActive}
                className={`w-full px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 cursor-default"
                    : "bg-primary-500/10 text-primary-400 hover:bg-primary-500/20"
                }`}
              >
                {isActive ? "Running" : "Start Strategy"}
              </button>
            </motion.div>
          );
        })}
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
            {(positions.open?.length || 0) === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  No open positions. Start a strategy to begin paper trading.
                </td>
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
