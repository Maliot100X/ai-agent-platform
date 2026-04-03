const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
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
  const wsBase = API_URL.replace("http://", "ws://").replace("https://", "wss://");
  return `${wsBase}/ws`;
}
