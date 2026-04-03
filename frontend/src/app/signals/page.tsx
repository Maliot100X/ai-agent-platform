"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useWebSocket } from "@/lib/useWebSocket";
import SignalFeed from "@/components/SignalFeed";

export default function SignalsPage() {
  const [historicalSignals, setHistoricalSignals] = useState<any[]>([]);
  const { signals: liveSignals } = useWebSocket();

  useEffect(() => {
    apiFetch("/api/signals?limit=100")
      .then((d) => setHistoricalSignals(d.signals || []))
      .catch(() => {});
  }, []);

  const allSignals = [...historicalSignals, ...liveSignals];

  const buyCount = allSignals.filter((s) => (s.signal_type || s.signal || "").toLowerCase() === "buy").length;
  const sellCount = allSignals.filter((s) => (s.signal_type || s.signal || "").toLowerCase() === "sell").length;
  const holdCount = allSignals.filter((s) => (s.signal_type || s.signal || "").toLowerCase() === "hold").length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-white">Signals</h1>
        <p className="text-slate-400 mt-1">AI-generated trading signals (paper trading only)</p>
      </motion.div>

      {/* Signal Stats */}
      <div className="grid grid-cols-3 gap-4">
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
      </div>

      <SignalFeed signals={allSignals} />
    </div>
  );
}
