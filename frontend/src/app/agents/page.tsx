"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, apiPost } from "@/lib/api";

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", provider: "vercel" });

  const loadAgents = () => {
    apiFetch("/api/agents").then((d) => setAgents(d.agents || [])).catch(() => {});
  };

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const createAgent = async () => {
    await apiPost("/api/agents", form);
    setShowCreate(false);
    setForm({ name: "", goal: "", provider: "vercel" });
    loadAgents();
  };

  const startAgent = async (id: string) => {
    await apiPost(`/api/agents/${id}/start`, {});
    loadAgents();
  };

  const stopAgent = async (id: string) => {
    await apiPost(`/api/agents/${id}/stop`, {});
    loadAgents();
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Agents</h1>
          <p className="text-slate-400 mt-1">Manage autonomous AI agents</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          + New Agent
        </button>
      </motion.div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Create New Agent</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Agent Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
              />
              <input
                type="text"
                placeholder="Goal / Mission"
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                className="bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
              />
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className="bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="vercel">Vercel AI Gateway (DeepSeek v3.2)</option>
                <option value="fireworks">Fireworks AI</option>
                <option value="gemini">Google Gemini</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI Compatible</option>
              </select>
            </div>
            <button
              onClick={createAgent}
              className="mt-4 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Create Agent
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.length === 0 ? (
          <div className="glass-card p-8 text-center col-span-2">
            <p className="text-slate-400">No agents created yet. Create one to get started.</p>
          </div>
        ) : (
          agents.map((agent) => (
            <motion.div
              key={agent.agent_id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    agent.status === "running" ? "bg-emerald-400 animate-pulse" :
                    agent.status === "error" ? "bg-red-400" : "bg-slate-500"
                  }`} />
                  <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg ${
                  agent.status === "running" ? "bg-emerald-500/10 text-emerald-400" :
                  agent.status === "error" ? "bg-red-500/10 text-red-400" :
                  "bg-slate-500/10 text-slate-400"
                }`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-3">{agent.goal}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                <span>Provider: {agent.provider}</span>
                <span>Skills: {agent.skills?.length || 0}</span>
                <span>Tool calls: {agent.tool_calls || 0}</span>
              </div>
              <div className="flex gap-2">
                {agent.status !== "running" ? (
                  <button
                    onClick={() => startAgent(agent.agent_id)}
                    className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                  >
                    Start
                  </button>
                ) : (
                  <button
                    onClick={() => stopAgent(agent.agent_id)}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
                  >
                    Stop
                  </button>
                )}
              </div>

              {/* Recent tool calls */}
              {agent.recent_tools?.length > 0 && (
                <div className="mt-4 border-t border-white/5 pt-3">
                  <p className="text-xs text-slate-500 mb-2">Recent Actions:</p>
                  {agent.recent_tools.slice(-3).map((t: any, i: number) => (
                    <div key={i} className="text-xs text-slate-400 py-1">
                      <span className="text-primary-400">{t.skill}</span>
                      {" - "}
                      {t.success ? "OK" : "Failed"}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
