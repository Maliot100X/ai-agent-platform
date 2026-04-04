"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    apiFetch("/api/health").then(setHealth).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Platform configuration</p>
      </motion.div>

      {/* System Status */}
      {health && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="text-sm text-emerald-400 font-medium">{health.status}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Uptime</p>
              <p className="text-sm text-white">{health.uptime}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Provider</p>
              <p className="text-sm text-white">{health.provider}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Model</p>
              <p className="text-sm text-white">{health.model}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Skills</p>
              <p className="text-sm text-white">{health.skills}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Agents</p>
              <p className="text-sm text-white">{health.agents}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Signals</p>
              <p className="text-sm text-white">{health.signals_count}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Version</p>
              <p className="text-sm text-white">{health.version || "1.0.0"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Backend API URL</label>
              <input
                type="text"
                defaultValue={typeof window !== "undefined" ? `${window.location.origin}/_/backend` : ""}
                readOnly
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Agent Defaults</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Default Provider</label>
              <select
                defaultValue="vercel"
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              >
                <option value="vercel">Vercel AI Gateway (DeepSeek v3.2)</option>
                <option value="fireworks">Fireworks AI</option>
                <option value="gemini">Google Gemini</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI Compatible</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Agent Loop Interval (seconds)</label>
              <input
                type="number"
                defaultValue={60}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Paper Trading</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Initial Balance (USD)</label>
              <input
                type="number"
                defaultValue={10000}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Max Positions</label>
              <input
                type="number"
                defaultValue={10}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Integrations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-800/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-sm text-white font-medium">Vercel AI Gateway</p>
              </div>
              <p className="text-xs text-slate-400">DeepSeek v3.2 via ai-gateway.vercel.sh</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-sm text-white font-medium">PumpFun</p>
              </div>
              <p className="text-xs text-slate-400">Solana meme token launchpad (free API)</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <p className="text-sm text-white font-medium">Birdeye API</p>
              </div>
              <p className="text-xs text-slate-400">Solana token prices & analytics (requires API key)</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <p className="text-sm text-white font-medium">Helius RPC</p>
              </div>
              <p className="text-xs text-slate-400">Solana wallet analysis & on-chain data (requires API key)</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-sm text-white font-medium">DexScreener</p>
              </div>
              <p className="text-xs text-slate-400">DEX pair data & new token pairs (free API)</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-sm text-white font-medium">CoinGecko</p>
              </div>
              <p className="text-xs text-slate-400">Global market data & token prices (free tier)</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6">
          <h3 className="text-lg font-semibold text-white mb-2">Security Notice</h3>
          <p className="text-sm text-slate-400">
            All API keys and sensitive configuration are managed through Vercel environment variables.
            They are never exposed to the frontend. The Trading Brain provides real market data and signals
            from Birdeye, Helius, DexScreener, PumpFun, and CoinGecko.
          </p>
        </div>
      </div>
    </div>
  );
}
