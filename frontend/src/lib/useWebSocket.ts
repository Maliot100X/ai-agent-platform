"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "./api";

/**
 * Replaces WebSocket with polling for Vercel serverless.
 * Polls /api/signals every 30 seconds for live data.
 */
export function useWebSocket() {
  const [signals, setSignals] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [connected, setConnected] = useState(true);

  const poll = useCallback(async () => {
    try {
      const data = await apiFetch("/api/signals");
      if (data.signals?.length) {
        setSignals(data.signals);
      }
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [poll]);

  return { connected, signals, actions };
}
