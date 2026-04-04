"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [source, setSource] = useState<"agents" | "pumpfun">("agents");

  const fetchSignals = useCallback(async () => {
    try {
      // First try agent logs (real trades from running agents)
      const logData = await apiFetch("/api/logs?limit=50");
      if (logData.logs?.length > 0) {
        const logSignals = logData.logs.map((l: any) => ({
          symbol: l.symbol || "???",
          signal_type: l.signal_type || l.action,
          strength: l.strength || 3,
          reasoning: l.reasoning || `${l.action} ${l.symbol}`,
          timestamp: l.created_at,
          agent_id: l.agent_id,
          mint: l.mint,
          market_cap: l.market_cap,
          pnl: l.pnl,
          source: "agent",
          pair_url: l.mint ? `https://pump.fun/${l.mint}` : "",
        }));
        setSignals(logSignals);
        setSource("agents");
        setLastRefresh(new Date());
        setLoading(false);
        return;
      }

      // Fallback to PumpFun signals
      const data = await apiFetch("/api/signals");
      setSignals(data.signals || []);
      setSource("pumpfun");
      setLastRefresh(new Date());
    } catch {
      setSignals([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSignals();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const buyCount = signals.filter((s) => s.signal_type === "buy").length;
  const sellCount = signals.filter((s) => s.signal_type === "sell").length;
  const holdCount = signals.filter((s) => s.signal_type === "hold").length;
  const strongCount = signals.filter((s) => s.strength >= 4).length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Signals</h1>
          <p className="text-slate-400 mt-1">
            {source === "agents" ? "Real-time agent trading activity" : "PumpFun AI-scored signals"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">
            Last: {lastRefresh.toLocaleTimeString()} | Auto: 5min
          </span>
          <button
            onClick={fetchSignals}
            disabled={loading}
            className="px-3 py-2 bg-primary-500/10 text-primary-400 rounded-xl text-xs hover:bg-primary-500/20 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh Now"}
          </button>
        </div>
      </motion.div>

      {/* Signal Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{buyCount}</p>
          <p className="text-sm text-slate-400">Buy Signals</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{sellCount}</p>
          <p className="text-sm text-slate-400">Sell Signals</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{holdCount}</p>
          <p className="text-sm text-slate-400">Hold Signals</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-primary-400">{strongCount}</p>
          <p className="text-sm text-slate-400">Strong (4+/5)</p>
        </div>
      </div>

      {/* Source indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${source === "agents" ? "bg-emerald-400 animate-pulse" : "bg-purple-400"}`} />
        <span className="text-xs text-slate-400">
          {source === "agents" ? "Showing real agent trades from Supabase" : "Showing PumpFun signal scan (no running agents)"}
        </span>
      </div>

      {/* Signal List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">
            {source === "agents" ? "Agent Trade Log" : "Live Signal Feed"}
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {signals.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {loading ? "Loading signals..." : "No signals yet. Start an agent to generate trades."}
            </div>
          ) : (
            signals.map((s, i) => {
              const type = (s.signal_type || "hold").toLowerCase();
              return (
                <motion.div
                  key={`${s.mint || s.symbol}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className="p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase min-w-[50px] text-center ${
                      type === "buy" ? "signal-buy" : type === "sell" ? "signal-sell" : "signal-hold"
                    }`}>
                      {type}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{s.symbol}</span>
                        {s.name && <span className="text-xs text-slate-500">{s.name}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          s.source === "agent" ? "bg-emerald-500/10 text-emerald-400" : "bg-purple-500/10 text-purple-400"
                        }`}>
                          {s.source === "agent" ? "Agent" : "PumpFun"}
                        </span>
                        {s.pnl !== undefined && s.pnl !== null && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            Number(s.pnl) >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          }`}>
                            {Number(s.pnl) >= 0 ? "+" : ""}{Number(s.pnl).toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{s.reasoning}</p>
                      {s.timestamp && (
                        <p className="text-[10px] text-slate-600 mt-0.5">{new Date(s.timestamp).toLocaleString()}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 min-w-[80px]">
                      <div className="flex-1 bg-surface-800 rounded-full h-1.5">
                        <div
                          className={`h-full rounded-full ${
                            type === "buy" ? "bg-emerald-400" : type === "sell" ? "bg-red-400" : "bg-yellow-400"
                          }`}
                          style={{ width: `${(s.strength || 0) * 20}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-medium">{s.strength}/5</span>
                    </div>

                    {s.market_cap > 0 && (
                      <span className="text-xs text-slate-400 min-w-[70px] text-right">
                        ${Number(s.market_cap || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    )}

                    {s.pair_url && (
                      <a href={s.pair_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                        View
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
