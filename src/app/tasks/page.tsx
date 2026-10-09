'use client';

import { CheckCircleIcon, CircleDashedIcon, CircleNotchIcon, FileTextIcon, MagnifyingGlassIcon, SidebarSimpleIcon, StopIcon, WarningCircleIcon, XCircleIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { toast } from 'sonner';

import { ApprovalCard } from '@/components/shared/approval-card';
import { Composer } from '@/components/shared/composer';
import { Button } from '@/components/ui/button';
import { ListRow, MetaDot, PanelCard, PlanRing } from '@/components/ui/patterns';
import { Badge, Dot, Hint, Input } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { describeAction, modeLabel, stopReasonLabel, toolLabel, useBackend } from '@/lib/backend';
import { useUi } from '@/lib/store';
import { useRun, type Item, type Step, type Todo } from '@/lib/use-run';
import { cn, fa } from '@/lib/utils';

const userBubble = 'bg-primary text-primary-foreground max-w-[82%] rounded-3xl rounded-ee-lg px-4.5 py-2.5 leading-7 whitespace-pre-wrap';
const agentBubble = 'bg-secondary max-w-[88%] rounded-3xl rounded-es-lg px-4.5 py-2.5 leading-7 whitespace-pre-wrap';

const statusTone = { running: 'primary', waiting: 'warning', finished: 'neutral' } as const;

function relative(seconds: number) {
  const diff = Date.now() / 1000 - seconds;
  if (diff < 90) return 'همین حالا';
  if (diff < 3600) return `${fa(Math.round(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${fa(Math.round(diff / 3600))} ساعت پیش`;
  return `${fa(Math.round(diff / 86400))} روز پیش`;
}

/** What the agent did, one plain line per action. */
function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="border-border/80 space-y-1.5 border-s ps-4">
      {steps.map((step) => (
        <li key={step.id} className="flex items-start gap-2 text-sm">
          <span className="mt-1">
            {!step.done ? (
              <CircleNotchIcon className="text-primary size-4 animate-spin" />
            ) : step.ok ? (
              <CheckCircleIcon className="text-muted-foreground/70 size-4" />
            ) : (
              <XCircleIcon className="text-danger size-4" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-baseline gap-2.5">
              <span className={cn('shrink-0', !step.done ? 'text-shimmer font-medium' : 'text-muted-foreground')}>
                {toolLabel[step.tool] ?? step.tool}
                {step.agent !== 'lead' && <span className="text-muted-foreground/70 text-xs"> · دستیار</span>}
              </span>
              <bdi className="text-muted-foreground/70 min-w-0 truncate text-xs">{describeAction(step.tool, step.args)}</bdi>
            </span>
            {step.done && !step.ok && step.output && <span className="text-danger block text-xs" dir="auto">{step.output.slice(0, 200)}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Transcript({ items, running, onDecide }: { items: Item[]; running: boolean; onDecide: (decisions: Record<string, any>[]) => Promise<void> }) {
  return (
    <>
      {items.map((item, index) => {
        if (item.kind === 'user')
          return (
            <div key={index} className="flex justify-end">
              <div className={userBubble} dir="auto">{item.text}</div>
            </div>
          );
        if (item.kind === 'agent') return <div key={index} className={agentBubble} dir="auto">{item.text}</div>;
        if (item.kind === 'steps') return <Steps key={index} steps={item.steps} />;
        if (item.kind === 'approval') return item.open && !running ? <ApprovalCard key={index} actions={item.actions} onDecide={onDecide} /> : null;
        return (
          <div key={index} className={cn('flex items-center gap-2 text-xs', item.tone === 'danger' ? 'text-danger' : item.tone === 'warning' ? 'text-warning' : 'text-muted-foreground')}>
            {item.tone !== 'muted' && <WarningCircleIcon weight="fill" className="size-4 shrink-0" />}
            <span dir="auto">{item.text}</span>
          </div>
        );
      })}
      {running && items[items.length - 1]?.kind !== 'steps' && (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <CircleNotchIcon className="text-primary size-4 animate-spin" /> در حال کار…
        </div>
      )}
    </>
  );
}

/** The side panel: the plan, the files this task produced, and what it cost. */
function SidePanel({ todos, files, usage, model }: { todos: Todo[]; files: string[]; usage: Record<string, any>; model?: string }) {
  const router = useRouter();
  const setOpenFile = useUi((s) => s.setOpenFile);
  const done = todos.filter((t) => t.status === 'completed').length;
  const current = todos.find((t) => t.status === 'in_progress');

  return (
    <div className="bg-surface/60 flex h-full flex-col gap-2 overflow-y-auto p-2.5">
      <PanelCard
        title="برنامه"
        indicator={
          todos.length > 0 ? (
            <span className="flex items-center gap-1.5">
              <PlanRing done={done} total={todos.length} />
              <span className="text-muted-foreground text-xs">{fa(done)} از {fa(todos.length)}</span>
            </span>
          ) : undefined
        }
        subtitle={current ? <span className="text-foreground/70 block truncate text-xs">{current.content}</span> : undefined}
        contentClassName="border-t px-3.5 py-3"
      >
        {todos.length === 0 ? (
          <p className="text-muted-foreground text-xs leading-6">برای کارهای چندمرحله‌ای، برنامه و پیشرفت هر گام اینجا دیده می‌شود.</p>
        ) : (
          <ol className="space-y-2.5">
            {todos.map((todo, index) => (
              <li key={index} className="flex gap-2.5">
                <span className="mt-0.5">
                  {todo.status === 'completed' ? (
                    <CheckCircleIcon weight="fill" className="text-success size-4" />
                  ) : todo.status === 'in_progress' ? (
                    <CircleNotchIcon className="text-primary size-4 animate-spin" />
                  ) : (
                    <CircleDashedIcon className="text-muted-foreground/50 size-4" />
                  )}
                </span>
                <span className={cn('text-sm leading-5', todo.status === 'pending' && 'text-muted-foreground')} dir="auto">{todo.content}</span>
              </li>
            ))}
          </ol>
        )}
      </PanelCard>

      <PanelCard title="فایل‌های این کار" count={files.length} contentClassName="border-t p-1.5">
        {files.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-xs leading-6">فایل‌هایی که ایجنت می‌سازد یا تغییر می‌دهد اینجا می‌آید.</p>
        ) : (
          files.map((path) => (
            <ListRow
              key={path}
              onClick={() => {
                setOpenFile(path);
                router.push('/files');
              }}
              icon={<FileTextIcon className="text-primary size-5 shrink-0" />}
              title={<bdi className="truncate text-sm">{path.replace(/^\//, '')}</bdi>}
            />
          ))
        )}
      </PanelCard>

      {usage.input_tokens > 0 && (
        <PanelCard title="مصرف" defaultExpanded={false} contentClassName="border-t px-3.5 py-3">
          <dl className="space-y-1.5 text-xs">
            {[
              ['مدل', model ?? usage.model],
              ['توکن ورودی', fa(usage.input_tokens ?? 0)],
              ['از کش خوانده شد', fa(usage.cached_tokens ?? 0)],
              ['توکن خروجی', fa(usage.output_tokens ?? 0)],
              ['گام‌های مدل', usage.model_calls != null ? fa(usage.model_calls) : '—'],
              ['زمان', usage.seconds != null ? `${fa(Math.round(usage.seconds))} ثانیه` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="ltr-nums font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </PanelCard>
      )}
    </div>
  );
}

/** No task open: start one, or pick up an earlier one. */
function NewTask({ onSend }: { onSend: (text: string) => void }) {
  const runs = useBackend((s) => s.runs);
  const setActiveThread = useUi((s) => s.setActiveThread);
  const [query, setQuery] = useState('');
  const visible = runs.filter((run) => (run.title ?? '').includes(query.trim()));

  return (
    <div className="scrollbar-minimal h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 pb-12">
        <div className={cn('flex flex-col justify-center', runs.length ? 'min-h-[62vh]' : 'min-h-[80vh]')}>
          <h1 className="text-center text-2xl font-semibold">چه کاری انجام بدهم؟</h1>
          <Composer large autoFocus className="mt-7" placeholder="کار را به زبان خودتان بنویسید…" onSend={onSend} />
        </div>

        {runs.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base">تاریخچهٔ کارها</h2>
              <div className="relative w-56">
                <MagnifyingGlassIcon className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجو در کارها…" className="h-8 ps-9" />
              </div>
            </div>
            <div className="mt-3 space-y-px">
              {visible.map((run) => (
                <ListRow
                  key={run.thread_id}
                  onClick={() => setActiveThread(run.thread_id)}
                  icon={<Dot tone={statusTone[run.status]} pulse={run.status === 'running'} className="mx-1 size-2.5" />}
                  title={<span className="truncate" dir="auto">{run.title || 'کار بدون عنوان'}</span>}
                  meta={
                    <>
                      <span>{relative(run.updated_at)}</span>
                      {run.model && (
                        <>
                          <MetaDot />
                          <span className="ltr-nums">{run.model}</span>
                        </>
                      )}
                    </>
                  }
                  trailing={<Badge tone={run.status === 'waiting' ? 'warning' : run.status === 'running' ? 'primary' : run.stop_reason === 'completed' ? 'success' : 'neutral'}>{run.status === 'running' ? 'در حال اجرا' : stopReasonLabel[run.stop_reason ?? ''] ?? '—'}</Badge>}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const threadId = useUi((s) => s.activeThread);
  const setActiveThread = useUi((s) => s.setActiveThread);
  const options = useUi((s) => s.runOptions);
  const startRun = useBackend((s) => s.startRun);
  const summary = useBackend((s) => s.runs.find((run) => run.thread_id === threadId));
  const { items, todos, files, usage, running, stop, decide, follow } = useRun(threadId);
  const [showPanel, setShowPanel] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [items]);

  const send = async (text: string) => {
    try {
      const id = await startRun({ prompt: text, threadId: threadId ?? undefined, modelId: options.modelId, agentId: options.agentId, mode: options.mode });
      if (id === threadId) follow(id);
      else setActiveThread(id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'شروع کار ممکن نشد.');
    }
  };

  if (!threadId) return <NewTask onSend={send} />;

  const waiting = !running && items.some((item) => item.kind === 'approval' && item.open);
  const title = summary?.title ?? items.find((item) => item.kind === 'user')?.text ?? '';

  return (
    <Group orientation="horizontal" className="h-full min-h-0">
      <Panel defaultSize="68%" minSize="45%" className="flex min-w-0 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-5">
          <h1 className="min-w-0 truncate text-base font-semibold" dir="auto">{title}</h1>
          <Badge tone={running ? 'primary' : waiting ? 'warning' : 'neutral'} className="shrink-0">
            {running && <Dot tone="primary" pulse />}
            {running ? 'در حال اجرا' : waiting ? 'منتظر تأیید' : (stopReasonLabel[usage.stop_reason] ?? 'آماده')}
          </Badge>
          <div className="flex-1" />
          {summary?.mode && <span className="text-muted-foreground hidden text-xs lg:inline">{modeLabel[summary.mode].label}</span>}
          {running && (
            <Button variant="outline" size="sm" onClick={() => stop().catch(() => toast.error('توقف ممکن نشد.'))}>
              <StopIcon weight="fill" /> توقف
            </Button>
          )}
          <Hint label={showPanel ? 'بستن پنل کناری' : 'نمایش پنل کناری'}>
            <Button variant="muted" size="icon-sm" onClick={() => setShowPanel((v) => !v)} aria-label="پنل کناری">
              <SidebarSimpleIcon />
            </Button>
          </Hint>
        </div>

        <div ref={scrollRef} className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-4 px-5 py-6">
            <Transcript items={items} running={running} onDecide={decide} />
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl px-5 pb-4">
          <Composer busy={running} onStop={() => stop().catch(() => {})} onSend={send} placeholder={waiting ? 'اول به درخواست تأیید بالا پاسخ بدهید…' : 'ادامه بدهید یا تغییری بخواهید…'} />
        </div>
      </Panel>

      {showPanel && (
        <>
          <Separator className="bg-border hover:bg-primary/50 data-[separator=active]:bg-primary w-px outline-none transition-colors" />
          <Panel defaultSize="32%" minSize="24%" className="min-w-0">
            <SidePanel todos={todos} files={files} usage={usage} model={summary?.model} />
          </Panel>
        </>
      )}
    </Group>
  );
}
