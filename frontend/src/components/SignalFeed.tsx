"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Signal {
  symbol: string;
  signal_type?: string;
  signal?: string;
  strength: number;
  reasoning?: string;
  timestamp?: string;
  agent_name?: string;
}

export default function SignalFeed({ signals }: { signals: Signal[] }) {
  return (
    <div className="glass-card p-5 max-h-[400px] overflow-y-auto">
      <h3 className="text-lg font-semibold text-white mb-4">Live Signal Feed</h3>
      <AnimatePresence mode="popLayout">
        {signals.length === 0 ? (
          <p className="text-sm text-slate-500">No signals yet. Agents will generate signals when running.</p>
        ) : (
          signals.slice(-20).reverse().map((s, i) => {
            const type = (s.signal_type || s.signal || "hold").toLowerCase();
            return (
              <motion.div
                key={`${s.timestamp}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0"
              >
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${
                  type === "buy" ? "signal-buy" : type === "sell" ? "signal-sell" : "signal-hold"
                }`}>
                  {type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{s.symbol}</span>
                    <div className="flex-1 bg-surface-800 rounded-full h-1.5">
                      <div
                        className={`h-full rounded-full ${
                          type === "buy" ? "bg-emerald-400" : type === "sell" ? "bg-red-400" : "bg-yellow-400"
                        }`}
                        style={{ width: `${(s.strength || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{((s.strength || 0) * 100).toFixed(0)}%</span>
                  </div>
                  {s.reasoning && (
                    <p className="text-xs text-slate-500 mt-1 truncate">{s.reasoning}</p>
                  )}
                </div>
                {s.agent_name && (
                  <span className="text-xs text-slate-500">{s.agent_name}</span>
                )}
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}
