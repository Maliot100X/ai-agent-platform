"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, apiPost } from "@/lib/api";

interface AgentSkill {
  id: string;
  name: string;
  desc: string;
}

interface Agent {
  agent_id: string;
  name: string;
  goal: string;
  provider: string;
  status: string;
  skills: string[];
  skill_details: AgentSkill[];
  max_tokens: number;
  signals_generated: number;
  trades_executed: number;
  created_at: string;
  started_at?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    goal: "",
    provider: "vercel",
    skills: ["momentum_trader", "signal_generation"] as string[],
  });

  const loadAgents = useCallback(async () => {
    try {
      const data = await apiFetch("/api/agents");
      setAgents(data.agents || []);
      if (data.skills) setSkills(data.skills);
    } catch {}
  }, []);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, [loadAgents]);

  const handleCreate = async () => {
    if (!form.name) return;
    await apiPost("/api/agents", form);
    setShowCreate(false);
    setForm({ name: "", goal: "", provider: "vercel", skills: ["momentum_trader", "signal_generation"] });
    loadAgents();
  };

  const handleStart = async (id: string) => {
    await apiPost("/api/agents", { action: "start", agent_id: id });
    loadAgents();
  };

  const handleStop = async (id: string) => {
    await apiPost("/api/agents", { action: "stop", agent_id: id });
    loadAgents();
  };

  const handleDelete = async (id: string) => {
    await apiPost("/api/agents", { action: "delete", agent_id: id });
    loadAgents();
  };

  const toggleSkill = (skillId: string) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skillId)
        ? f.skills.filter((s) => s !== skillId)
        : [...f.skills, skillId],
    }));
  };

  const runningCount = agents.filter((a) => a.status === "running").length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            Agents
          </h1>
          <p className="text-slate-400 mt-1">
            {agents.length} agents created, {runningCount} running
          </p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="Agent Name (e.g. SOL-Hunter)"
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
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI Compatible</option>
              </select>
            </div>

            <h4 className="text-sm font-medium text-slate-300 mb-2">Select Skills:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    form.skills.includes(skill.id)
                      ? "bg-primary-500/10 border-primary-500/50 text-white"
                      : "bg-surface-800/50 border-white/5 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <p className="text-xs font-medium">{skill.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{skill.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={!form.name}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Create Agent
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 bg-surface-800 text-slate-400 rounded-xl text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.length === 0 ? (
          <div className="glass-card p-8 text-center col-span-2">
            <p className="text-slate-400">No agents created yet. Click &quot;+ New Agent&quot; to get started.</p>
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
              
              <div className="flex flex-wrap gap-1 mb-3">
                {(agent.skill_details || []).map((s) => (
                  <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-300">
                    {s.name}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                <span>Provider: {agent.provider}</span>
                <span>Max Tokens: {agent.max_tokens}</span>
                <span>Signals: {agent.signals_generated}</span>
                <span>Trades: {agent.trades_executed}</span>
              </div>
              
              <div className="flex gap-2">
                {agent.status !== "running" ? (
                  <button
                    onClick={() => handleStart(agent.agent_id)}
                    className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                  >
                    Start
                  </button>
                ) : (
                  <button
                    onClick={() => handleStop(agent.agent_id)}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
                  >
                    Stop
                  </button>
                )}
                <button
                  onClick={() => handleDelete(agent.agent_id)}
                  className="px-3 py-1.5 bg-surface-800 text-slate-400 rounded-lg text-xs hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
