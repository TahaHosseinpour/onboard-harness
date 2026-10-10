'use client';

import { create } from 'zustand';

import { useUi } from './store';
import { api, type AgentProfile, type Mode, type Model, type RunSummary, type Workspace } from './api';

type Status = 'connecting' | 'ready' | 'offline';

/** Live data from the backend that several screens share. Nothing here is sample data. */
type BackendState = {
  status: Status;
  workspace: Workspace | null;
  models: Model[];
  agents: AgentProfile[];
  runs: RunSummary[];

  connect: () => Promise<void>;
  openWorkspace: (path: string, name?: string) => Promise<void>;
  renameWorkspace: (name: string) => Promise<void>;
  refreshModels: () => Promise<void>;
  refreshRuns: () => Promise<void>;
  renameRun: (threadId: string, title: string) => Promise<void>;
  /** Remove a task from the history. Files it made stay in the workspace. */
  deleteRun: (threadId: string) => Promise<void>;
  /** Start a task (or add a message to an existing one). Returns its thread id. */
  startRun: (input: { prompt: string; threadId?: string; modelId?: string; agentId?: string | null; mode: Mode }) => Promise<string>;
};

export const useBackend = create<BackendState>((set, get) => ({
  status: 'connecting',
  workspace: null,
  models: [],
  agents: [],
  runs: [],

  connect: async () => {
    try {
      // The desktop app starts the engine alongside the window; give it time to come up.
      for (let attempt = 0; ; attempt++) {
        try {
          await api.get('/health');
          break;
        } catch (error) {
          if (attempt >= 40) throw error;
          await new Promise((resolve) => setTimeout(resolve, 750));
        }
      }
      const workspace = await api.get<Workspace>('/workspace');
      set({ status: 'ready', workspace });
      await get().refreshModels();
      if (workspace.path) {
        const [agents] = await Promise.all([api.get<AgentProfile[]>('/agents'), get().refreshRuns()]);
        set({ agents });
      }
    } catch {
      set({ status: 'offline' });
    }
  },

  openWorkspace: async (path, name) => {
    await api.post('/workspace', { path, name: name?.trim() || undefined });
    set({ runs: [] });
    await get().connect();
  },

  renameWorkspace: async (name) => {
    await api.put('/workspace/name', { name });
    set({ workspace: await api.get<Workspace>('/workspace') });
  },

  refreshModels: async () => set({ models: await api.get<Model[]>('/models') }),

  refreshRuns: async () => {
    if (!get().workspace?.path) return;
    set({ runs: await api.get<RunSummary[]>('/runs') });
  },

  renameRun: async (threadId, title) => {
    await api.put(`/runs/${threadId}`, { title });
    await get().refreshRuns();
  },

  deleteRun: async (threadId) => {
    await api.del(`/runs/${threadId}`);
    // The open conversation is gone: go back to "new task" before the list refreshes.
    if (useUi.getState().activeThread === threadId) useUi.getState().setActiveThread(null);
    await get().refreshRuns();
  },

  startRun: async ({ prompt, threadId, modelId, agentId, mode }) => {
    const { thread_id } = await api.post<{ thread_id: string }>('/runs', { prompt, thread_id: threadId, model_id: modelId, agent_id: agentId || undefined, mode });
    await get().refreshRuns();
    return thread_id;
  },
}));

/** Open a workspace file or folder with the system's own program, and say why when that is not possible. */
export async function openOutside(path: string, notify: (message: string) => void) {
  if (!window.desktop?.openPath) return notify('این کار فقط در برنامهٔ دسکتاپ ممکن است.');
  const result = await window.desktop.openPath(path);
  if (result === 'runnable') notify('این فایل اجرایی است و برای ایمنی باز نشد؛ در پوشه‌اش نشان داده شد.');
  else if (result) notify('باز کردن ممکن نشد.');
}

export const waitingRuns = (runs: RunSummary[]) => runs.filter((run) => run.status === 'waiting' && run.pending?.length);

/** Plain-language names for what the agent is doing, so nobody has to read tool names. */
export const toolLabel: Record<string, string> = {
  read_file: 'خواندن فایل',
  write_file: 'نوشتن فایل',
  edit_file: 'ویرایش فایل',
  delete: 'حذف فایل',
  ls: 'دیدن محتوای پوشه',
  glob: 'جست‌وجوی نام فایل‌ها',
  grep: 'جست‌وجو در متن فایل‌ها',
  execute: 'اجرای فرمان',
  task: 'سپردن بخشی از کار به یک دستیار',
  write_todos: 'به‌روزرسانی برنامه',
  calculate: 'محاسبه',
  read_table: 'خواندن جدول',
  aggregate_table: 'جمع‌بندی جدول',
  add_table_rows: 'افزودن ردیف به جدول',
  write_table: 'ساختن جدول',
  read_document: 'خواندن سند',
  write_document: 'ساختن سند',
  list_archive: 'دیدن محتوای فایل فشرده',
  extract_archive: 'باز کردن فایل فشرده',
  browse_page: 'باز کردن صفحهٔ وب',
};

export const stopReasonLabel: Record<string, string> = {
  completed: 'انجام شد',
  awaiting_approval: 'منتظر تأیید',
  stopped_by_user: 'متوقف شد',
  model_call_limit: 'به سقف گام‌ها رسید',
  tool_call_limit: 'به سقف اقدام‌ها رسید',
  time_limit: 'زمان تمام شد',
  cost_limit: 'به سقف هزینه رسید',
  circuit_open: 'به‌خاطر خطای تکراری متوقف شد',
  error: 'خطا',
};

export const modeLabel: Record<Mode, { label: string; hint: string }> = {
  ask: { label: 'با تأیید', hint: 'برای تغییر فایل‌ها و اجرای فرمان اول از شما می‌پرسد' },
  auto: { label: 'خودکار', hint: 'هر کاری که قوانین ممنوع نکرده باشند را انجام می‌دهد' },
  read_only: { label: 'فقط خواندن', hint: 'فقط نگاه می‌کند؛ چیزی را تغییر نمی‌دهد' },
};

/** What a file or shell action will touch, in a few words, for activity lines and approval cards. */
export function describeAction(tool: string, args: Record<string, any>): string {
  const target = args.url ?? args.file_path ?? args.path ?? args.command ?? args.expression ?? args.pattern ?? args.description ?? '';
  return String(target).slice(0, 140);
}
