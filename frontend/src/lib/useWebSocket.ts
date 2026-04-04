"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "./api";

/**
 * Polls /api/signals for live PumpFun data.
 * Replaces WebSocket since Vercel serverless doesn't support persistent connections.
 * Starts connected=true optimistically to avoid showing "Connecting..." on load.
 */
export function useWebSocket() {
  const [signals, setSignals] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [connected, setConnected] = useState(true); // optimistic
  const retryCount = useRef(0);

  const poll = useCallback(async () => {
    try {
      const data = await apiFetch("/api/signals");
      if (data.signals?.length) {
        setSignals(data.signals);
        // Build actions from buy signals
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
      // Only show disconnected after 3 consecutive failures
      if (retryCount.current >= 3) {
        setConnected(false);
      }
    }
  }, []);

  useEffect(() => {
    // Initial poll with slight delay to let page render first
    const initialTimer = setTimeout(poll, 1000);
    const interval = setInterval(poll, 20000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [poll]);

  return { connected, signals, actions };
}
