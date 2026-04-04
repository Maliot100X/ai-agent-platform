/**
 * API client for the AI Agent Platform backend.
 *
 * On Vercel, requests go through the rewrite: /api/* -> /_/backend/api/*
 * Locally, they go to http://localhost:8000
 */

function getBaseUrl(): string {
  // In browser, use relative path (rewrites handle routing)
  if (typeof window !== "undefined") {
    return "";
  }
  // Server-side: use env var or default
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/_/backend`;
  return "http://localhost:8000";
}

const API_URL = getBaseUrl();

export async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function apiPost<T = any>(path: string, data: any): Promise<T> {
  return apiFetch(path, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getWebSocketUrl(): string {
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/_/backend/ws`;
  }
  const wsBase = API_URL.replace("http://", "ws://").replace("https://", "wss://");
  return `${wsBase}/ws`;
}
