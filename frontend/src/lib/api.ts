/**
 * API client for the AI Agent Platform backend.
 *
 * In browser: uses relative paths (/api/*) which get rewritten to /_/backend/api/* by Vercel
 * On server: uses NEXT_PUBLIC_API_URL or localhost fallback
 */

const API_URL = "";

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
    return `${proto}//${window.location.host}/api/ws`;
  }
  return "ws://localhost:8000/ws";
}
