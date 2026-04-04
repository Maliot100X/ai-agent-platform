"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = () => {
    apiFetch("/api/logs?limit=100")
      .then((d) => {
        setLogs(d.logs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-white">System Logs</h1>
        <p className="text-slate-400 mt-1">Real-time platform activity and agent actions</p>
      </motion.div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-400">{logs.length} log entries</span>
          <button
            onClick={loadLogs}
            className="px-3 py-1.5 bg-primary-500/10 text-primary-400 rounded-lg text-xs font-medium hover:bg-primary-500/20 transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-slate-400">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">No logs yet. Logs will appear when agents run actions.</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[70vh] overflow-y-auto font-mono text-xs">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`flex gap-3 px-3 py-2 rounded-lg ${
                  log.level === "error"
                    ? "bg-red-500/5 text-red-300"
                    : log.level === "warning"
                      ? "bg-yellow-500/5 text-yellow-300"
                      : "bg-surface-800/50 text-slate-300"
                }`}
              >
                <span className="text-slate-500 shrink-0">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "--:--:--"}
                </span>
                <span
                  className={`shrink-0 w-12 uppercase ${
                    log.level === "error"
                      ? "text-red-400"
                      : log.level === "warning"
                        ? "text-yellow-400"
                        : "text-blue-400"
                  }`}
                >
                  {log.level || "info"}
                </span>
                {log.agent && (
                  <span className="text-purple-400 shrink-0">[{log.agent}]</span>
                )}
                <span className="text-emerald-400 shrink-0">{log.action || ""}</span>
                <span className="text-slate-300 truncate">{log.message || ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
