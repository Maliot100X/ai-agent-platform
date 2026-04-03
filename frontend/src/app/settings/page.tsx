"use client";

import { motion } from "framer-motion";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Platform configuration</p>
      </motion.div>

      <div className="glass-card p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Backend API URL</label>
              <input
                type="text"
                defaultValue={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
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
              <select className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm">
                <option value="fireworks">Fireworks AI</option>
                <option value="gemini">Google Gemini</option>
                <option value="ollama">Ollama</option>
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
          <h3 className="text-lg font-semibold text-white mb-2">Security Notice</h3>
          <p className="text-sm text-slate-400">
            All API keys and sensitive configuration are managed through environment variables on the server.
            They are never exposed to the frontend. This system operates in paper trading mode only --
            no real trades are executed.
          </p>
        </div>
      </div>
    </div>
  );
}
