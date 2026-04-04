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
      let params = `&tab=${t}`;
      if (t === "graduating") {
        sort = "market_cap";
        params += "&complete=false";
      } else if (t === "graduated") {
        sort = "market_cap";
        params += "&complete=true";
      }
      const data = await apiFetch(
        `/api/pumpfun/coins?offset=0&limit=30&sort=${sort}&order=DESC${params}`
      );
      setTokens(data.tokens || []);
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
          PumpFun Launchpad
        </h1>
        <p className="text-slate-400 mt-1">Real-time Solana meme token launches (recent 2 weeks)</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["new", "graduating", "graduated"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t
                ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                : "bg-surface-800 text-slate-400 hover:text-white hover:bg-surface-700"
            }`}
          >
            {t === "new" ? "New Launches" : t === "graduating" ? "Graduating (Active)" : "Graduated (Raydium)"}
          </button>
        ))}
        <button
          onClick={() => fetchTokens(tab)}
          className="ml-auto px-3 py-2 bg-surface-800 text-slate-400 rounded-xl text-xs hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Token Grid */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-slate-400">Loading PumpFun tokens...</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-400">No recent tokens found in this category. Try refreshing.</p>
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
                    className="w-12 h-12 rounded-lg object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-sm truncate">{t.symbol}</h3>
                    {t.complete ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Graduated</span>
                    ) : (t.usd_market_cap || 0) > 20000 ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">Graduating</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">New</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{t.name}</p>
                </div>
              </div>

              {/* Contract Address */}
              <div className="mb-3">
                <p className="text-[10px] text-slate-600 mb-0.5">CA</p>
                <p className="text-[11px] text-slate-400 font-mono truncate select-all">{t.mint}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <p className="text-slate-500">Market Cap</p>
                  <p className="text-white font-medium">
                    ${(t.usd_market_cap || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Replies</p>
                  <p className="text-white">{t.reply_count || 0}</p>
                </div>
                {t.virtual_sol_reserves && (
                  <div>
                    <p className="text-slate-500">SOL Pool</p>
                    <p className="text-white">{(t.virtual_sol_reserves / 1e9).toFixed(2)} SOL</p>
                  </div>
                )}
                {t.ath_market_cap && (
                  <div>
                    <p className="text-slate-500">ATH MC</p>
                    <p className="text-white">${(t.ath_market_cap || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                )}
              </div>

              {t.description && (
                <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">{t.description.slice(0, 120)}</p>
              )}

              {t.creator && (
                <p className="text-[10px] text-slate-600 mb-2 truncate">
                  Creator: <span className="text-slate-500 font-mono">{t.creator}</span>
                </p>
              )}

              <div className="flex gap-2">
                <a
                  href={`https://pump.fun/${t.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-2 py-1.5 bg-primary-500/10 text-primary-400 rounded-lg text-xs hover:bg-primary-500/20 transition-colors"
                >
                  PumpFun
                </a>
                <a
                  href={`https://dexscreener.com/solana/${t.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1.5 bg-surface-700 text-slate-400 rounded-lg text-xs hover:text-white transition-colors"
                >
                  DexScreener
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
