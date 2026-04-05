"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useWebSocket } from "@/lib/useWebSocket";

export default function SignalsPage() {
  const [historicalSignals, setHistoricalSignals] = useState<any[]>([]);
  const { signals: liveSignals } = useWebSocket();

  useEffect(() => {
    apiFetch("/api/signals")
      .then((d) => setHistoricalSignals(d.signals || []))
      .catch(() => {});
  }, []);

  const allSignals = historicalSignals.length > liveSignals.length ? historicalSignals : liveSignals;

  const buyCount = allSignals.filter((s) => s.signal_type === "buy").length;
  const sellCount = allSignals.filter((s) => s.signal_type === "sell").length;
  const holdCount = allSignals.filter((s) => s.signal_type === "hold").length;
  const strongCount = allSignals.filter((s) => s.strength >= 4).length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-white">Trading Signals</h1>
        <p className="text-slate-400 mt-1">Real-time PumpFun and DEX signals with AI analysis</p>
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

      {/* Signal List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Live Signal Feed</h3>
        </div>
        <div className="divide-y divide-white/5">
          {allSignals.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Loading signals from PumpFun...</div>
          ) : (
            allSignals.map((s, i) => {
              const type = (s.signal_type || "hold").toLowerCase();
              return (
                <motion.div
                  key={`${s.address || s.symbol}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Signal badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase min-w-[50px] text-center ${
                      type === "buy" ? "signal-buy" : type === "sell" ? "signal-sell" : "signal-hold"
                    }`}>
                      {type}
                    </span>

                    {/* Token info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {s.image_uri && (
                          <img
                            src={s.image_uri}
                            alt={s.symbol}
                            className="w-5 h-5 rounded object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        )}
                        <span className="font-semibold text-white">{s.symbol}</span>
                        {s.name && <span className="text-xs text-slate-500">{s.name}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          s.source === "pumpfun" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {s.source === "pumpfun" ? "PumpFun" : "DEX"}
                        </span>
                        {s.graduated && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                            Graduated
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{s.reasoning}</p>
                    </div>

                    {/* Strength */}
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

                    {/* MC */}
                    {s.market_cap > 0 && (
                      <span className="text-xs text-slate-400 min-w-[70px] text-right">
                        ${(s.market_cap || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    )}

                    {/* Link */}
                    {s.pair_url && (
                      <a
                        href={s.pair_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      >
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
