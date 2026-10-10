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
      /** Opens a file or folder of the workspace. Resolves to '' when opened, otherwise to the reason it was not. */
      openPath?: (path: string) => Promise<'' | 'outside' | 'missing' | 'runnable' | 'failed'>;
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

/** A workspace image or PDF as a local object URL. The token travels in a header, so a plain `src` cannot fetch it. */
export async function fileUrl(path: string, type: string): Promise<string> {
  const { url, token } = target();
  const response = await fetch(`${url}/files/raw?path=${encodeURIComponent(path)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new ApiError(response.status, `خطای ${response.status}`);
  // The type is ours, not the server's: the bytes are only ever treated as the picture or PDF we asked for.
  return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type }));
}

/** An address a player can use for one sound or video file. It carries a short-lived ticket for that file only. */
export async function mediaUrl(path: string): Promise<string> {
  const { ticket } = await request<{ ticket: string }>('POST', '/files/media-ticket', { path });
  return `${target().url}/files/media/${ticket}`;
}

export type TablePreview = { kind: 'table'; sheets: string[]; sheet: string | null; columns: string[]; rows: (string | number)[][]; total_rows: number; truncated: boolean };
export type DocumentPreview = { kind: 'document'; markdown: string };

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

export type Workspace = { path: string | null; name: string | null; known: { path: string; name: string }[] };

export type Skill = { id: string; name: string; description: string; body: string };
export type AgentProfile = { id: string; title: string; description: string; prompt: string; tools: string[] };

/** Follow a run live. Replays what already happened, then streams until the run ends. Returns a stop function. */
export function watchRun(threadId: string, onEvent: (event: RunEvent) => void, onEnd: () => void): () => void {
  const { url, token } = target();
  const controller = new AbortController();

  // Read the event stream with fetch, not EventSource: EventSource cannot send
  // headers, and the token must not travel in the address.
  (async () => {
    try {
      const response = await fetch(`${url}/runs/${threadId}/events`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal });
      if (!response.ok || !response.body) return;
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buffer += value;
        for (let cut = buffer.indexOf('\n\n'); cut >= 0; cut = buffer.indexOf('\n\n')) {
          const block = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          if (block.startsWith('event: end')) return;
          if (block.startsWith('data: ')) onEvent(JSON.parse(block.slice(6)));
        }
      }
    } catch {
      // stopped by the caller, or the connection dropped
    } finally {
      if (!controller.signal.aborted) onEnd();
    }
  })();

  return () => controller.abort();
}
