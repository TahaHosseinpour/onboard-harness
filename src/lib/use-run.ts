'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api, watchRun, type PendingAction, type RunEvent } from './api';
import { useBackend } from './backend';

export type Step = { id: string; tool: string; args: Record<string, any>; agent: string; done: boolean; ok: boolean; output?: string };

/** One thing shown in the conversation, in order. */
export type Item =
  | { kind: 'user'; text: string }
  | { kind: 'agent'; text: string }
  | { kind: 'steps'; steps: Step[] }
  | { kind: 'note'; tone: 'warning' | 'danger' | 'muted'; text: string }
  | { kind: 'approval'; actions: PendingAction[]; open: boolean };

export type Todo = { content: string; status: 'pending' | 'in_progress' | 'completed' };

const stopNote: Record<string, string> = {
  model_call_limit: 'به سقف تعداد گام‌های این کار رسید و متوقف شد.',
  tool_call_limit: 'به سقف تعداد اقدام‌های این کار رسید و متوقف شد.',
  time_limit: 'زمان مجاز این کار تمام شد.',
  cost_limit: 'به سقف هزینهٔ این کار رسید.',
  circuit_open: 'یک ابزار پشت‌سرهم خطا داد و کار متوقف شد.',
  stopped_by_user: 'به درخواست شما متوقف شد.',
};

/** Turn the raw event stream into what the screen shows. Pure, so it is easy to reason about. */
export function buildView(events: RunEvent[]) {
  const items: Item[] = [];
  const steps = new Map<string, Step>();
  let todos: Todo[] = [];
  const files: string[] = [];
  let usage: Record<string, any> = {};
  let finished: Record<string, any> | null = null;

  const last = () => items[items.length - 1];

  for (const event of events) {
    const data = event.data;
    switch (event.type) {
      case 'run_started':
        finished = null;
        if (data.prompt) items.push({ kind: 'user', text: data.prompt });
        break;
      case 'text': {
        const tail = last();
        if (tail?.kind === 'agent') tail.text += data.text;
        else items.push({ kind: 'agent', text: data.text });
        break;
      }
      case 'tool_started': {
        if (data.tool === 'write_todos') break; // the plan has its own place on screen
        const step: Step = { id: data.call_id ?? `${event.at}`, tool: data.tool, args: data.args ?? {}, agent: data.agent ?? 'lead', done: false, ok: true };
        steps.set(step.id, step);
        const tail = last();
        if (tail?.kind === 'steps') tail.steps.push(step);
        else items.push({ kind: 'steps', steps: [step] });
        break;
      }
      case 'tool_finished': {
        const step = steps.get(data.call_id);
        if (step) Object.assign(step, { done: true, ok: data.ok, output: data.output });
        break;
      }
      case 'plan':
        todos = data.todos ?? [];
        break;
      case 'file_changed':
        if (data.path && !files.includes(data.path)) files.push(data.path);
        break;
      case 'verification':
        items.push({ kind: 'note', tone: 'muted', text: 'پیش از پایان، کار را دوباره بررسی کرد.' });
        break;
      case 'approval_required':
        items.push({ kind: 'approval', actions: data.actions ?? [], open: true });
        break;
      case 'approval_decided': {
        const pending = [...items].reverse().find((item) => item.kind === 'approval');
        if (pending?.kind === 'approval') pending.open = false;
        const kinds = (data.decisions ?? []).map((d: any) => d.type);
        items.push({ kind: 'note', tone: 'muted', text: kinds.every((k: string) => k === 'approve') ? 'تأیید شد.' : kinds.every((k: string) => k === 'reject') ? 'رد شد.' : 'تصمیم شما ثبت شد.' });
        break;
      }
      case 'usage':
        usage = data;
        break;
      case 'run_finished':
        finished = data;
        usage = { ...usage, ...data };
        if (data.stop_reason === 'error') items.push({ kind: 'note', tone: 'danger', text: `خطا: ${data.error ?? 'نامشخص'}` });
        else if (stopNote[data.stop_reason]) items.push({ kind: 'note', tone: 'warning', text: stopNote[data.stop_reason] });
        break;
    }
  }
  return { items, todos, files, usage, finished };
}

/** Follow one task live: its events, whether it is running, and the actions the user can take on it. */
export function useRun(threadId: string | null) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [live, setLive] = useState(false);
  const refreshRuns = useBackend((s) => s.refreshRuns);
  const closeRef = useRef<(() => void) | null>(null);

  const follow = useCallback(
    (id: string) => {
      closeRef.current?.();
      setEvents([]);
      setLive(true);
      closeRef.current = watchRun(
        id,
        (event) => setEvents((list) => [...list, event]),
        () => {
          setLive(false);
          refreshRuns().catch(() => {});
        },
      );
    },
    [refreshRuns],
  );

  useEffect(() => {
    if (threadId) follow(threadId);
    else {
      closeRef.current?.();
      setEvents([]);
      setLive(false);
    }
    return () => closeRef.current?.();
  }, [threadId, follow]);

  const view = useMemo(() => buildView(events), [events]);
  // Running means: we are still receiving, and the run has not reported its end.
  const running = live && !view.finished;

  const stop = useCallback(() => (threadId ? api.post(`/runs/${threadId}/stop`) : Promise.resolve()), [threadId]);
  const decide = useCallback(
    async (decisions: Record<string, any>[]) => {
      if (!threadId) return;
      await api.post(`/runs/${threadId}/decisions`, { decisions });
      follow(threadId);
    },
    [threadId, follow],
  );

  return { ...view, running, stop, decide, follow };
}
