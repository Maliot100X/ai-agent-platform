"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch, apiPost } from "@/lib/api";

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [form, setForm] = useState({
    default_provider: "vercel",
    default_model: "deepseek/deepseek-v3.2",
    agent_loop_interval: 60,
    initial_balance: 10000,
    max_positions: 10,
    auto_refresh_interval: 300,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch("/api/health").then(setHealth).catch(() => {});
    apiFetch("/api/settings").then((d) => {
      if (d.settings) {
        setSettings(d.settings);
        // Merge saved settings into form
        const s = d.settings;
        setForm((f) => ({
          ...f,
          ...(s.default_provider && { default_provider: s.default_provider }),
          ...(s.default_model && { default_model: s.default_model }),
          ...(s.agent_loop_interval && { agent_loop_interval: s.agent_loop_interval }),
          ...(s.initial_balance && { initial_balance: s.initial_balance }),
          ...(s.max_positions && { max_positions: s.max_positions }),
          ...(s.auto_refresh_interval && { auto_refresh_interval: s.auto_refresh_interval }),
        }));
      }
    }).catch(() => {});
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await apiPost("/api/settings", form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">Settings</h1>
        <p className="text-slate-400 mt-1">Platform configuration (saved to Supabase)</p>
      </motion.div>

      {saved && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-3 text-sm text-emerald-400 border-emerald-500/20">
          Settings saved successfully.
        </motion.div>
      )}

      {/* System Status */}
      {health && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-slate-500">Status</p><p className="text-sm text-emerald-400 font-medium">{health.status}</p></div>
            <div><p className="text-xs text-slate-500">Provider</p><p className="text-sm text-white">{health.provider}</p></div>
            <div><p className="text-xs text-slate-500">Model</p><p className="text-sm text-white">{health.model}</p></div>
            <div><p className="text-xs text-slate-500">Skills</p><p className="text-sm text-white">{health.skills}</p></div>
            <div><p className="text-xs text-slate-500">Version</p><p className="text-sm text-white">{health.version}</p></div>
            <div><p className="text-xs text-slate-500">Uptime</p><p className="text-sm text-white">{health.uptime}</p></div>
          </div>
          {health.integrations && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-slate-500 mb-2">Integrations</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(health.integrations).map(([k, v]) => (
                  <span key={k} className={`text-[10px] px-2 py-1 rounded-lg ${
                    v === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"
                  }`}>
                    {k}: {v as string}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="glass-card p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Agent Defaults</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Default Provider</label>
              <select
                value={form.default_provider}
                onChange={(e) => setForm({ ...form, default_provider: e.target.value })}
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
              <label className="text-sm text-slate-400 block mb-1">Default Model</label>
              <input
                type="text"
                value={form.default_model}
                onChange={(e) => setForm({ ...form, default_model: e.target.value })}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Agent Loop Interval (seconds)</label>
              <input
                type="number"
                value={form.agent_loop_interval}
                onChange={(e) => setForm({ ...form, agent_loop_interval: parseInt(e.target.value) || 60 })}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Auto-Refresh Interval (seconds)</label>
              <input
                type="number"
                value={form.auto_refresh_interval}
                onChange={(e) => setForm({ ...form, auto_refresh_interval: parseInt(e.target.value) || 300 })}
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
                value={form.initial_balance}
                onChange={(e) => setForm({ ...form, initial_balance: parseInt(e.target.value) || 10000 })}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Max Positions</label>
              <input
                type="number"
                value={form.max_positions}
                onChange={(e) => setForm({ ...form, max_positions: parseInt(e.target.value) || 10 })}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 pt-4 border-t border-white/5">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div className="border-t border-white/5 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Integrations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "PumpFun", desc: "Solana meme token launchpad (free API)", active: true },
              { name: "DexScreener", desc: "DEX pair data & trending (free API)", active: true },
              { name: "CoinGecko", desc: "Global market data (free tier)", active: true },
              { name: "Vercel AI Gateway", desc: "DeepSeek v3.2 via ai-gateway.vercel.sh", active: true },
              { name: "Supabase", desc: "Database for agents, logs, settings", active: true },
              { name: "Birdeye API", desc: "Solana token prices (requires key)", active: true },
              { name: "Helius RPC", desc: "Solana wallet analysis (requires key)", active: true },
              { name: "Telegram", desc: "Bot & channel signals", active: true },
            ].map((int) => (
              <div key={int.name} className="bg-surface-800/50 rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${int.active ? "bg-emerald-400" : "bg-yellow-400"}`} />
                  <p className="text-sm text-white font-medium">{int.name}</p>
                </div>
                <p className="text-xs text-slate-400">{int.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
