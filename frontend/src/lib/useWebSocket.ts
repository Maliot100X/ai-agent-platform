"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "./api";

/**
 * Polls /api/logs for real agent activity (buy/sell/signal from running agents).
 * Falls back to /api/signals if no agent logs exist.
 */
export function useWebSocket() {
  const [signals, setSignals] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [connected, setConnected] = useState(true);
  const retryCount = useRef(0);

  const poll = useCallback(async () => {
    try {
      // First try agent logs (real trades)
      const logData = await apiFetch("/api/logs?limit=30");
      if (logData.logs?.length > 0) {
        const logSignals = logData.logs.map((l: any) => ({
          symbol: l.symbol || "???",
          signal_type: l.signal_type || l.action,
          signal: l.signal_type || l.action,
          strength: l.strength || 3,
          reasoning: l.reasoning || `${l.action} ${l.symbol}`,
          timestamp: l.created_at,
          agent_id: l.agent_id,
          mint: l.mint,
          market_cap: l.market_cap,
          pnl: l.pnl,
          source: "agent",
        }));
        setSignals(logSignals);
        setActions(logData.logs.filter((l: any) => l.action === "buy" || l.action === "sell").slice(0, 10).map((l: any) => ({
          type: l.action,
          message: `${l.action.toUpperCase()} ${l.symbol} @ MC $${Number(l.market_cap || 0).toLocaleString()} ${l.pnl ? `(${Number(l.pnl) >= 0 ? "+" : ""}${Number(l.pnl).toFixed(1)}%)` : ""}`,
          timestamp: l.created_at,
        })));
        setConnected(true);
        retryCount.current = 0;
        return;
      }

      // Fallback to PumpFun signals if no agent logs
      const data = await apiFetch("/api/signals");
      if (data.signals?.length) {
        setSignals(data.signals);
        const newActions = data.signals
          .filter((s: any) => s.signal_type === "buy" && s.strength >= 3)
          .slice(0, 5)
          .map((s: any) => ({
            type: "signal",
            message: `${s.signal_type?.toUpperCase()} ${s.symbol} (${s.strength}/5) - ${s.reasoning?.slice(0, 80)}`,
            timestamp: s.timestamp,
          }));
        setActions(newActions);
      }
      setConnected(true);
      retryCount.current = 0;
    } catch {
      retryCount.current += 1;
      if (retryCount.current >= 3) setConnected(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(poll, 1000);
    const interval = setInterval(poll, 15000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [poll]);

  return { connected, signals, actions };
}
