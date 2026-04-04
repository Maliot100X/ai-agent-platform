"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [filterAgent, setFilterAgent] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = filterAgent ? `/api/logs?limit=100&agent_id=${filterAgent}` : "/api/logs?limit=100";
      const data = await apiFetch(url);
      setLogs(data.logs || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    apiFetch("/api/agents").then((d) => setAgents(d.agents || [])).catch(() => {});
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [filterAgent]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">Agent Logs</h1>
          <p className="text-slate-400 mt-1">Real-time activity from your trading agents</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="bg-surface-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            <option value="">All Agents</option>
            {agents.map((a: any) => (
              <option key={a.agent_id} value={a.agent_id}>{a.name}</option>
            ))}
          </select>
          <button onClick={fetchLogs} className="px-3 py-2 bg-surface-800 text-slate-400 rounded-xl text-xs hover:text-white">
            Refresh
          </button>
        </div>
      </motion.div>

      <div className="glass-card overflow-hidden">
        <div className="divide-y divide-white/5">
          {loading && logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No logs yet. Start an agent to see activity here.
              {!filterAgent && <p className="text-xs mt-1">Logs are stored in Supabase when agents execute trades and generate signals.</p>}
            </div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase ${
                    log.action === "buy" ? "bg-emerald-500/10 text-emerald-400" :
                    log.action === "sell" ? "bg-red-500/10 text-red-400" :
                    log.action === "signal" ? "bg-blue-500/10 text-blue-400" :
                    "bg-slate-500/10 text-slate-400"
                  }`}>
                    {log.action}
                  </span>
                  {log.symbol && <span className="text-white font-medium text-sm">{log.symbol}</span>}
                  {log.signal_type && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      log.signal_type === "buy" ? "bg-emerald-500/10 text-emerald-400" :
                      log.signal_type === "sell" ? "bg-red-500/10 text-red-400" :
                      "bg-yellow-500/10 text-yellow-400"
                    }`}>
                      {log.signal_type.toUpperCase()}
                    </span>
                  )}
                  {log.strength && <span className="text-xs text-slate-500">Str: {log.strength}/5</span>}
                  {log.market_cap > 0 && <span className="text-xs text-slate-500">MC: ${Number(log.market_cap).toLocaleString()}</span>}
                  {log.pnl !== null && log.pnl !== undefined && (
                    <span className={`text-xs font-medium ${Number(log.pnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {Number(log.pnl) >= 0 ? "+" : ""}{Number(log.pnl).toFixed(2)}%
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-slate-600">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                  </span>
                </div>
                {log.reasoning && <p className="text-xs text-slate-500 mt-1 truncate">{log.reasoning}</p>}
                {log.mint && <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">{log.mint}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
