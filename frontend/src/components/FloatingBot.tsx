"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiPost, apiFetch } from "@/lib/api";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

const COMMANDS = [
  { cmd: "/help", desc: "Show all commands" },
  { cmd: "/market", desc: "Market summary" },
  { cmd: "/trending", desc: "Trending tokens" },
  { cmd: "/pumpfun", desc: "PumpFun launches" },
  { cmd: "/analyze <addr>", desc: "Analyze a token" },
  { cmd: "/wallet <addr>", desc: "Analyze a wallet" },
  { cmd: "/signals", desc: "Latest trading signals" },
  { cmd: "/agents", desc: "List active agents" },
  { cmd: "/status", desc: "System health" },
  { cmd: "/providers", desc: "AI providers" },
];

export default function FloatingBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "FLUXMINT AI Trading Brain online. Type /help for commands or ask me anything about crypto markets.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const addMessage = (role: Message["role"], content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleCommand = async (text: string) => {
    const cmd = text.trim().toLowerCase();

    if (cmd === "/help") {
      const helpText = COMMANDS.map((c) => `${c.cmd} - ${c.desc}`).join("\n");
      addMessage("assistant", `Available Commands:\n\n${helpText}`);
      return;
    }

    if (cmd === "/market") {
      try {
        const data = await apiFetch("/api/trading/summary");
        addMessage(
          "assistant",
          `Market Summary:\n\n` +
            `Total Market Cap: $${(data.total_market_cap || 0).toLocaleString()}\n` +
            `24h Volume: $${(data.total_volume_24h || 0).toLocaleString()}\n` +
            `BTC Dominance: ${(data.btc_dominance || 0).toFixed(1)}%\n` +
            `24h Change: ${(data.market_cap_change_24h || 0).toFixed(2)}%`
        );
      } catch (e: any) {
        addMessage("assistant", `Error fetching market data: ${e.message}`);
      }
      return;
    }

    if (cmd === "/trending") {
      try {
        const data = await apiFetch("/api/trading/trending");
        const tokens = data.tokens || [];
        if (tokens.length === 0) {
          addMessage("assistant", "No trending tokens found.");
          return;
        }
        const lines = tokens
          .slice(0, 10)
          .map(
            (t: any) =>
              `${t.symbol} - $${Number(t.price || 0).toFixed(6)} (Vol: $${Number(t.volume_24h || 0).toLocaleString()})`
          );
        addMessage("assistant", `Trending Tokens:\n\n${lines.join("\n")}`);
      } catch (e: any) {
        addMessage("assistant", `Error: ${e.message}`);
      }
      return;
    }

    if (cmd === "/pumpfun") {
      try {
        const data = await apiFetch("/api/trading/pumpfun/launches?limit=10");
        const launches = data.launches || [];
        if (launches.length === 0) {
          addMessage("assistant", "No PumpFun launches found.");
          return;
        }
        const lines = launches.map(
          (l: any) =>
            `${l.symbol} (${l.name})\n  MC: $${Number(l.market_cap || 0).toLocaleString()} | ${l.complete ? "Graduated" : "Active"}`
        );
        addMessage("assistant", `PumpFun Launches:\n\n${lines.join("\n\n")}`);
      } catch (e: any) {
        addMessage("assistant", `Error: ${e.message}`);
      }
      return;
    }

    if (cmd.startsWith("/analyze ")) {
      const addr = text.slice(9).trim();
      if (!addr) {
        addMessage("assistant", "Usage: /analyze <token_address>");
        return;
      }
      try {
        const data = await apiFetch(`/api/trading/analyze/${addr}`);
        const sig = data.signal || {};
        addMessage(
          "assistant",
          `Token Analysis:\n\n` +
            `Price: $${data.price || 0}\n` +
            `Volume 24h: $${Number(data.volume_24h || 0).toLocaleString()}\n` +
            `Liquidity: $${Number(data.liquidity || 0).toLocaleString()}\n` +
            `Market Cap: $${Number(data.market_cap || 0).toLocaleString()}\n\n` +
            `Signal: ${sig.type || "UNKNOWN"} (${sig.strength || 0}/5)\n` +
            `Entry: $${sig.entry || 0}\n` +
            `Take Profit: $${sig.take_profit || 0}\n` +
            `Stop Loss: $${sig.stop_loss || 0}\n\n` +
            `${sig.reasoning || ""}`
        );
      } catch (e: any) {
        addMessage("assistant", `Error: ${e.message}`);
      }
      return;
    }

    if (cmd.startsWith("/wallet ")) {
      const addr = text.slice(8).trim();
      if (!addr) {
        addMessage("assistant", "Usage: /wallet <wallet_address>");
        return;
      }
      try {
        const data = await apiFetch(`/api/trading/wallet/${addr}`);
        const holdings = (data.top_holdings || [])
          .slice(0, 10)
          .map((h: any) => `  ${h.symbol} - ${h.name}`)
          .join("\n");
        addMessage(
          "assistant",
          `Wallet Analysis:\n\n` +
            `SOL Balance: ${Number(data.sol_balance || 0).toFixed(4)} SOL\n` +
            `Tokens: ${data.token_count || 0}\n` +
            `Recent Txns: ${data.recent_transactions || 0}\n\n` +
            `Top Holdings:\n${holdings || "None found"}`
        );
      } catch (e: any) {
        addMessage("assistant", `Error: ${e.message}`);
      }
      return;
    }

    if (cmd === "/signals") {
      try {
        const data = await apiFetch("/api/signals/latest");
        const sigs = data.signals || [];
        if (sigs.length === 0) {
          addMessage("assistant", "No signals available right now.");
          return;
        }
        const lines = sigs.slice(0, 5).map(
          (s: any) =>
            `${s.signal_type?.toUpperCase() || "?"} ${s.symbol} @ $${Number(s.price || 0).toFixed(6)}\n` +
            `  Strength: ${s.strength || 0}/5 | TP: $${Number(s.take_profit || 0).toFixed(6)} | SL: $${Number(s.stop_loss || 0).toFixed(6)}`
        );
        addMessage("assistant", `Latest Signals:\n\n${lines.join("\n\n")}`);
      } catch (e: any) {
        addMessage("assistant", `Error: ${e.message}`);
      }
      return;
    }

    if (cmd === "/agents") {
      try {
        const data = await apiFetch("/api/agents");
        const agents = data.agents || [];
        if (agents.length === 0) {
          addMessage("assistant", "No agents running.");
          return;
        }
        const lines = agents.map(
          (a: any) => `${a.name} [${a.status}] - Skills: ${(a.skills || []).length}`
        );
        addMessage("assistant", `Active Agents:\n\n${lines.join("\n")}`);
      } catch (e: any) {
        addMessage("assistant", `Error: ${e.message}`);
      }
      return;
    }

    if (cmd === "/status") {
      try {
        const data = await apiFetch("/api/health");
        addMessage(
          "assistant",
          `System Status: ${data.status}\n` +
            `Uptime: ${data.uptime}\n` +
            `Provider: ${data.provider}\n` +
            `Model: ${data.model}\n` +
            `Skills: ${data.skills}\n` +
            `Version: ${data.version || "1.0.0"}`
        );
      } catch (e: any) {
        addMessage("assistant", `Error: ${e.message}`);
      }
      return;
    }

    if (cmd === "/providers") {
      try {
        const data = await apiFetch("/api/providers");
        addMessage(
          "assistant",
          `AI Providers:\n\n` +
            `Current: ${data.current} (${data.model})\n` +
            `Available: ${(data.providers || []).join(", ")}`
        );
      } catch (e: any) {
        addMessage("assistant", `Error: ${e.message}`);
      }
      return;
    }

    // Default: AI chat
    try {
      const data = await apiPost("/api/chat", {
        message: text,
        include_market_data: true,
      });
      addMessage("assistant", data.response || "No response from AI.");
    } catch (e: any) {
      addMessage("assistant", `AI Error: ${e.message}`);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    addMessage("user", text);
    setInput("");
    setLoading(true);

    try {
      await handleCommand(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[32rem] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">FLUXMINT AI</h3>
                <p className="text-white/70 text-xs">Trading Brain Online</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/70">Live</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : msg.role === "system"
                          ? "bg-purple-900/50 text-purple-200 border border-purple-700/50"
                          : "bg-slate-800 text-slate-200 border border-slate-700"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-400">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a command or message..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-lg text-white text-sm transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Type /help for commands
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
