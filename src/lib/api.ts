'use client';

// The one place the UI talks to the local backend (backend/server).
// In the desktop app the address and token come from Electron; in a browser
// during development the backend is expected on its default port.

declare global {
  interface Window {
    desktop?: {
      isDesktop: boolean;
      platform: string;
      api?: { url: string; token: string };
      setTheme: (theme: 'light' | 'dark') => void;
      pickFolder?: () => Promise<string | null>;
      openPath?: (path: string) => Promise<void>;
    };
  }
}

const target = () => (typeof window !== 'undefined' && window.desktop?.api) || { url: 'http://127.0.0.1:8765', token: '' };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { url, token } = target();
  let response: Response;
  try {
    response = await fetch(url + path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'موتور برنامه در دسترس نیست.');
  }
  if (!response.ok) {
    const detail = await response.json().then((d) => d.detail).catch(() => null);
    throw new ApiError(response.status, typeof detail === 'string' ? detail : `خطای ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

/* ───────────── types (mirror backend/harness/events.py and server routes) ───────────── */

export type RunEvent = { type: string; thread_id: string; at: number; data: Record<string, any> };

export type PendingAction = { tool: string; args: Record<string, any>; description: string; allowed: string[] };

export type RunSummary = {
  thread_id: string;
  title?: string;
  status: 'running' | 'waiting' | 'finished';
  stop_reason?: string;
  pending?: PendingAction[];
  updated_at: number;
  model?: string;
  model_id?: string;
  agent_id?: string | null;
  mode?: Mode;
  cost?: number;
  input_tokens?: number;
  output_tokens?: number;
  seconds?: number;
  error?: string;
  running?: boolean;
};

export type Mode = 'read_only' | 'ask' | 'auto';

export type Model = { id: string; name: string; base_url: string; model: string; has_key: boolean; is_default: boolean; streaming?: boolean };

export type FileEntry = { path: string; name: string; folder: string; size: number; modified: number; system: boolean };

export type Workspace = { path: string | null; name: string | null; known: string[] };

export type Skill = { id: string; name: string; description: string; body: string };
export type AgentProfile = { id: string; title: string; description: string; prompt: string; tools: string[] };

/** Follow a run live. Replays what already happened, then streams until the run ends. Returns a stop function. */
export function watchRun(threadId: string, onEvent: (event: RunEvent) => void, onEnd: () => void): () => void {
  const { url, token } = target();
  const source = new EventSource(`${url}/runs/${threadId}/events${token ? `?token=${encodeURIComponent(token)}` : ''}`);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    source.close();
  };
  source.onmessage = (message) => onEvent(JSON.parse(message.data));
  source.addEventListener('end', () => {
    close();
    onEnd();
  });
  source.onerror = () => {
    close();
    onEnd();
  };
  return close;
}
