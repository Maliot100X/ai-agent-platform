"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch, apiPost } from "@/lib/api";

const SKILLS = [
  {
    id: "pumpfun_sniper",
    name: "PumpFun Sniper",
    category: "Trading",
    risk: "High",
    desc: "Auto-detect and snipe new PumpFun launches before the bonding curve fills. Monitors the PumpFun API for freshly created tokens, evaluates creator history, initial liquidity, and social signals, then enters positions within seconds of launch.",
    features: ["Real-time launch detection", "Creator wallet analysis", "Auto-entry on bonding curve", "Configurable max buy amount", "Rug-pull pre-checks"],
    metrics: { avg_return: "+180%", win_rate: "32%", avg_hold: "4h", trades_day: "8-15" },
    color: "from-red-500 to-orange-500",
  },
  {
    id: "whale_watcher",
    name: "Whale Watcher",
    category: "Copy Trading",
    risk: "Medium",
    desc: "Track known whale wallets on Solana and mirror their trades in real-time. Uses Helius RPC to monitor wallet activity, detects token purchases/sales, and generates copy-trade signals with configurable position sizing.",
    features: ["Whale wallet database", "Real-time transaction monitoring", "Copy-trade signal generation", "Position size scaling", "Whale scoring algorithm"],
    metrics: { avg_return: "+45%", win_rate: "58%", avg_hold: "12h", trades_day: "3-8" },
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "momentum_trader",
    name: "Momentum Trader",
    category: "Technical",
    risk: "Medium",
    desc: "Detect volume spikes and ride momentum on trending Solana tokens. Analyzes DexScreener and Birdeye data for sudden volume increases, price acceleration, and social momentum to catch tokens before they peak.",
    features: ["Volume spike detection", "Price momentum scoring", "Multi-timeframe analysis", "Auto TP/SL placement", "Trend strength indicator"],
    metrics: { avg_return: "+65%", win_rate: "48%", avg_hold: "6h", trades_day: "5-12" },
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "dip_buyer",
    name: "Dip Buyer",
    category: "Technical",
    risk: "Medium",
    desc: "Buy tokens after sharp dips when technical indicators signal oversold conditions. Monitors RSI, volume profile, and support levels to enter positions at optimal dip points with tight risk management.",
    features: ["RSI oversold detection", "Support level analysis", "Volume profile scoring", "Risk-adjusted position sizing", "Multi-token monitoring"],
    metrics: { avg_return: "+35%", win_rate: "62%", avg_hold: "24h", trades_day: "2-5" },
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "graduation_hunter",
    name: "Graduation Hunter",
    category: "PumpFun",
    risk: "High",
    desc: "Target tokens approaching PumpFun graduation (bonding curve completion) and ride the Raydium listing pump. Monitors bonding curve progress, buys near 85-95% completion, and sells during the post-graduation spike.",
    features: ["Bonding curve progress tracking", "Graduation probability scoring", "Auto-entry near completion", "Raydium listing detection", "Post-grad momentum riding"],
    metrics: { avg_return: "+120%", win_rate: "38%", avg_hold: "2h", trades_day: "3-6" },
    color: "from-yellow-500 to-amber-500",
  },
  {
    id: "market_data",
    name: "Market Data Feed",
    category: "Data",
    risk: "None",
    desc: "Aggregates real-time market data from CoinGecko, DexScreener, Birdeye, and PumpFun. Provides live price feeds, market cap data, volume analytics, and trending token lists to power other trading skills.",
    features: ["Multi-source price aggregation", "24h volume tracking", "Market cap monitoring", "Trending token detection", "Historical data caching"],
    metrics: { avg_return: "N/A", win_rate: "N/A", avg_hold: "N/A", trades_day: "N/A" },
    color: "from-slate-500 to-slate-600",
  },
  {
    id: "signal_generation",
    name: "Signal Generator",
    category: "Analysis",
    risk: "None",
    desc: "Generate BUY/SELL/HOLD signals with entry price, take-profit, and stop-loss levels. Combines technical analysis, volume/liquidity ratios, and momentum indicators to produce actionable trading signals with strength scores.",
    features: ["5-point signal strength", "Entry/TP/SL levels", "Multi-factor analysis", "Signal confidence scoring", "Historical signal tracking"],
    metrics: { avg_return: "N/A", win_rate: "N/A", avg_hold: "N/A", trades_day: "15-30" },
    color: "from-indigo-500 to-blue-500",
  },
  {
    id: "risk_analysis",
    name: "Risk Analysis",
    category: "Security",
    risk: "None",
    desc: "Assess token risk by analyzing liquidity depth, holder concentration, mint/freeze authority, and contract patterns. Flags potential rug-pulls, honeypots, and low-liquidity traps before other skills execute trades.",
    features: ["Liquidity depth analysis", "Top holder concentration", "Mint/freeze authority check", "Honeypot detection", "Risk score 1-100"],
    metrics: { avg_return: "N/A", win_rate: "N/A", avg_hold: "N/A", trades_day: "N/A" },
    color: "from-red-600 to-red-500",
  },
  {
    id: "wallet_tracking",
    name: "Wallet Tracker",
    category: "On-Chain",
    risk: "None",
    desc: "Monitor Solana wallets in real-time via Helius RPC. Track token balances, transaction history, and portfolio changes. Useful for whale watching, team wallet monitoring, and detecting insider movements.",
    features: ["Real-time balance updates", "Transaction history", "Token transfer alerts", "Portfolio analytics", "Multi-wallet monitoring"],
    metrics: { avg_return: "N/A", win_rate: "N/A", avg_hold: "N/A", trades_day: "N/A" },
    color: "from-teal-500 to-cyan-500",
  },
  {
    id: "news_sentiment",
    name: "News Sentiment",
    category: "Sentiment",
    risk: "None",
    desc: "Analyze crypto news and social media sentiment for trading edge. Monitors trending topics, influencer mentions, and community sentiment to detect narrative shifts before they move token prices.",
    features: ["News feed aggregation", "Sentiment scoring", "Trending topic detection", "Influencer tracking", "Narrative shift alerts"],
    metrics: { avg_return: "N/A", win_rate: "N/A", avg_hold: "N/A", trades_day: "N/A" },
    color: "from-violet-500 to-purple-500",
  },
];

const categories = ["All", "Trading", "PumpFun", "Technical", "Copy Trading", "Analysis", "Data", "Security", "On-Chain", "Sentiment"];

export default function SkillsPage() {
  const [filter, setFilter] = useState("All");
  const [agents, setAgents] = useState<any[]>([]);
  const [addingTo, setAddingTo] = useState<{ skillId: string; agentId: string } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch("/api/agents").then((d) => setAgents(d.agents || [])).catch(() => {});
  }, []);

  const filtered = filter === "All" ? SKILLS : SKILLS.filter((s) => s.category === filter);

  const addSkillToAgent = async (skillId: string, agentId: string) => {
    try {
      setAddingTo({ skillId, agentId });
      await apiPost("/api/agents", { action: "add_skill", agent_id: agentId, skill_id: skillId });
      setMessage(`Added skill to agent`);
      setTimeout(() => setMessage(""), 2000);
      // Refresh agents
      const d = await apiFetch("/api/agents");
      setAgents(d.agents || []);
    } catch {
      setMessage("Error adding skill");
    }
    setAddingTo(null);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
          Trading Skills
        </h1>
        <p className="text-slate-400 mt-1">
          10 AI-powered trading skills. Add them to your agents.
        </p>
      </motion.div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card p-3 text-sm text-emerald-400 border-emerald-500/20">
          {message}
        </motion.div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === cat
                ? "bg-primary-500 text-white"
                : "bg-surface-800 text-slate-400 hover:text-white hover:bg-surface-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Skill Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((skill, i) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card overflow-hidden"
          >
            <div className={`h-1 bg-gradient-to-r ${skill.color}`} />
            
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{skill.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-surface-800 text-slate-400">
                      {skill.category}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      skill.risk === "High" ? "bg-red-500/10 text-red-400" :
                      skill.risk === "Medium" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-slate-500/10 text-slate-400"
                    }`}>
                      Risk: {skill.risk}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-4">{skill.desc}</p>

              <div className="space-y-1 mb-4">
                {skill.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-1 h-1 rounded-full bg-primary-400" />
                    {f}
                  </div>
                ))}
              </div>

              {skill.metrics.avg_return !== "N/A" && (
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/5 mb-4">
                  <div>
                    <p className="text-[10px] text-slate-500">Avg Return</p>
                    <p className="text-xs font-medium text-emerald-400">{skill.metrics.avg_return}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Win Rate</p>
                    <p className="text-xs font-medium text-white">{skill.metrics.win_rate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Avg Hold</p>
                    <p className="text-xs font-medium text-white">{skill.metrics.avg_hold}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Trades/Day</p>
                    <p className="text-xs font-medium text-white">{skill.metrics.trades_day}</p>
                  </div>
                </div>
              )}

              {/* Add to Agent */}
              {agents.length > 0 ? (
                <div className="pt-3 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 mb-2">Add to Agent:</p>
                  <div className="flex flex-wrap gap-1">
                    {agents.map((agent: any) => {
                      const hasSkill = (agent.skills || []).includes(skill.id);
                      return (
                        <button
                          key={agent.agent_id}
                          onClick={() => !hasSkill && addSkillToAgent(skill.id, agent.agent_id)}
                          disabled={hasSkill || addingTo?.skillId === skill.id}
                          className={`text-[10px] px-2 py-1 rounded-lg transition-all ${
                            hasSkill
                              ? "bg-emerald-500/10 text-emerald-400 cursor-default"
                              : "bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 cursor-pointer"
                          }`}
                        >
                          {hasSkill ? `${agent.name} (added)` : `+ ${agent.name}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-white/5">
                  <p className="text-[10px] text-slate-500">
                    <a href="/agents" className="text-primary-400 hover:text-primary-300">Create an agent</a> to add this skill.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
