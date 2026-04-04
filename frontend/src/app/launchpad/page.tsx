"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

type Tab = "new" | "graduating" | "graduated";

export default function LaunchpadPage() {
  const [tab, setTab] = useState<Tab>("new");
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTokens = async (t: Tab) => {
    setLoading(true);
    try {
      let sort = "created_timestamp";
      let params = "includeNsfw=false";
      if (t === "graduating") {
        sort = "market_cap";
        params += "&complete=false";
      } else if (t === "graduated") {
        sort = "market_cap";
        params += "&complete=true";
      }
      const resp = await fetch(
        `https://frontend-api-v3.pump.fun/coins?offset=0&limit=30&sort=${sort}&order=DESC&${params}`
      );
      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();
      setTokens(Array.isArray(data) ? data : []);
    } catch {
      setTokens([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTokens(tab);
    const interval = setInterval(() => fetchTokens(tab), 15000);
    return () => clearInterval(interval);
  }, [tab]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-white">PumpFun Launchpad</h1>
        <p className="text-slate-400 mt-1">Real-time Solana meme token launches</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["new", "graduating", "graduated"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t
                ? "bg-primary-500 text-white"
                : "bg-surface-800 text-slate-400 hover:text-white hover:bg-surface-700"
            }`}
          >
            {t === "new" ? "New Launches" : t === "graduating" ? "Graduating" : "Graduated"}
          </button>
        ))}
        <button
          onClick={() => fetchTokens(tab)}
          className="ml-auto px-3 py-2 bg-surface-800 text-slate-400 rounded-xl text-xs hover:text-white"
        >
          Refresh
        </button>
      </div>

      {/* Token Grid */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-400">Loading PumpFun tokens...</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-400">No tokens found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens.map((t: any) => (
            <motion.div
              key={t.mint}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-4 hover:border-primary-500/30 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                {t.image_uri && (
                  <img
                    src={t.image_uri}
                    alt={t.symbol}
                    className="w-10 h-10 rounded-lg object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-sm truncate">{t.symbol}</h3>
                    {t.complete && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        Graduated
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{t.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <p className="text-slate-500">Market Cap</p>
                  <p className="text-white font-medium">${(t.usd_market_cap || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-slate-500">Replies</p>
                  <p className="text-white">{t.reply_count || 0}</p>
                </div>
              </div>

              {t.description && (
                <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">{t.description.slice(0, 120)}</p>
              )}

              <div className="flex gap-2">
                <a
                  href={`https://pump.fun/${t.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-2 py-1.5 bg-primary-500/10 text-primary-400 rounded-lg text-xs hover:bg-primary-500/20 transition-colors"
                >
                  View on PumpFun
                </a>
                <a
                  href={`https://solscan.io/token/${t.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1.5 bg-surface-700 text-slate-400 rounded-lg text-xs hover:text-white transition-colors"
                >
                  Solscan
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
