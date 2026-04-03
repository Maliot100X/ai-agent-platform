"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

const providerInfo: Record<string, { name: string; desc: string; color: string }> = {
  fireworks: {
    name: "Fireworks AI",
    desc: "High-performance inference with OpenAI-compatible API. Default model: kimi-k2p5-turbo",
    color: "from-orange-500/20 to-orange-600/5 border-orange-500/20",
  },
  gemini: {
    name: "Google Gemini",
    desc: "Google's multimodal AI model with function calling support",
    color: "from-blue-500/20 to-blue-600/5 border-blue-500/20",
  },
  ollama: {
    name: "Ollama (Local)",
    desc: "Run models locally for privacy and zero-cost inference",
    color: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
  },
  openai: {
    name: "OpenAI Compatible",
    desc: "Any OpenAI-compatible API endpoint (OpenAI, Together, Groq, etc.)",
    color: "from-slate-500/20 to-slate-600/5 border-slate-500/20",
  },
};

export default function ModelsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiFetch("/api/providers").then(setData).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-white">Models & Providers</h1>
        <p className="text-slate-400 mt-1">Multi-LLM provider configuration</p>
      </motion.div>

      {/* Current Provider */}
      {data && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Active Provider</h3>
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-white font-medium">{providerInfo[data.current]?.name || data.current}</p>
              <p className="text-sm text-slate-400">Model: {data.model}</p>
            </div>
          </div>
        </div>
      )}

      {/* Provider Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.providers?.map((p: string) => {
          const info = providerInfo[p] || { name: p, desc: "", color: "from-slate-500/20 to-slate-600/5 border-slate-500/20" };
          const isActive = data.current === p;
          return (
            <motion.div
              key={p}
              whileHover={{ scale: 1.01 }}
              className={`bg-gradient-to-br ${info.color} border rounded-2xl p-5 ${isActive ? "ring-2 ring-primary-500/50" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-white">{info.name}</h4>
                {isActive && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">Active</span>
                )}
              </div>
              <p className="text-sm text-slate-400">{info.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
