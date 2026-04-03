"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getWebSocketUrl } from "./api";

export interface WSMessage {
  type: "signal" | "agent_action" | "log" | "metric";
  data: any;
}

export function useWebSocket() {
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(getWebSocketUrl());

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          setMessages((prev) => [...prev.slice(-200), msg]);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 3s
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {}
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const signals = messages.filter((m) => m.type === "signal").map((m) => m.data);
  const actions = messages.filter((m) => m.type === "agent_action").map((m) => m.data);
  const logs = messages.filter((m) => m.type === "log").map((m) => m.data);

  return { connected, messages, signals, actions, logs };
}
