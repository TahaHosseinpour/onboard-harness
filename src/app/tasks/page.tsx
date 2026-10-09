'use client';

import {
  ChartBarIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  CloudIcon,
  DesktopIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  PauseIcon,
  PlayIcon,
  PresentationChartIcon,
  ShieldCheckIcon,
  SidebarSimpleIcon,
  TableIcon,
  TargetIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { Composer } from '@/components/shared/composer';
import { OutputPanel } from '@/components/tasks/output-panel';
import { Button } from '@/components/ui/button';
import { ListRow, MetaDot } from '@/components/ui/patterns';
import { Badge, Dot, Glyph, Hint, Input, Segmented } from '@/components/ui/primitives';
import { agentById, planSteps, tasks, taskStatus, type TaskStatus } from '@/lib/mock';
import { useUi } from '@/lib/store';
import { cn } from '@/lib/utils';

type Message = { id: number; from: 'user' | 'agent'; text: string };
type RunState = 'idle' | 'running' | 'paused' | 'done';

const initialStep: Record<TaskStatus, number> = { running: 2, waiting: planSteps.length, done: planSteps.length, stopped: 3 };

const userBubble = 'bg-primary text-primary-foreground max-w-[82%] rounded-3xl rounded-ee-lg px-4.5 py-2.5 leading-7';
const agentBubble = 'bg-secondary max-w-[88%] rounded-3xl rounded-es-lg px-4.5 py-2.5 leading-7';

/** The transcript's activity trail: one quiet line per step the agent has
 *  reached. The checklist itself lives in the side panel's plan card. */
function Activity({ step, state }: { step: number; state: RunState }) {
  const shown = planSteps.slice(0, Math.min(step + 1, planSteps.length));
  return (
    <ol className="border-border/80 space-y-2 border-s ps-4">
      {shown.map((item, index) => {
        const current = index === step && state !== 'done';
        return (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span className="mt-1">
              {!current ? (
                <CheckCircleIcon className="text-muted-foreground/70 size-4" />
              ) : state === 'running' ? (
                <CircleNotchIcon className="text-primary size-4 animate-spin" />
              ) : (
                <PauseIcon weight="fill" className="text-warning size-4" />
              )}
            </span>
            <span className={cn(current && state === 'running' ? 'text-shimmer font-medium' : 'text-muted-foreground')}>{item.title}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** No task selected: start a new one, or pick up an earlier one from the history. */
function NewTask({ onSend, onSelect }: { onSend: (text: string) => void; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const visible = tasks.filter((t) => (filter === 'all' || t.status === filter) && t.title.includes(query.trim()));

  return (
    <div className="scrollbar-minimal h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 pb-12">
        {/* The composer sits at the optical centre of the first screen; history starts below the fold line. */}
        <div className="flex min-h-[68vh] flex-col justify-center">
          <h1 className="text-center text-2xl font-semibold">چه کاری انجام بدهم؟</h1>
          <Composer large autoFocus className="mt-7" placeholder="کار را به زبان خودتان بنویسید…" onSend={onSend} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base">تاریخچهٔ کارها</h2>
          <div className="flex items-center gap-2">
            <Segmented
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'همه' },
                { value: 'running', label: 'در اجرا' },
                { value: 'waiting', label: 'منتظر تأیید' },
                { value: 'done', label: 'تمام‌شده' },
              ]}
            />
            <div className="relative w-52">
              <MagnifyingGlassIcon className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجو در کارها…" className="h-8 ps-9" />
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-px">
          {visible.map((task) => {
            const agent = agentById(task.agent);
            return (
              <ListRow
                key={task.id}
                onClick={() => onSelect(task.id)}
                icon={<Glyph tone={agent.tone}>{agent.initial}</Glyph>}
                title={<span className="truncate">{task.title}</span>}
                meta={
                  <>
                    <span>{agent.name}</span>
                    <MetaDot />
                    <span>{task.when}</span>
                    <MetaDot />
                    <span className="flex items-center gap-1">
                      {task.where === 'cloud' ? <CloudIcon className="size-3.5" /> : <DesktopIcon className="size-3.5" />}
                      {task.where === 'cloud' ? 'ابری' : 'همین سیستم'}
                    </span>
                  </>
                }
                trailing={
                  <Badge tone={taskStatus[task.status].tone}>
                    {task.status === 'running' && <Dot tone="primary" pulse />}
                    {taskStatus[task.status].label}
                  </Badge>
                }
              />
            );
          })}
          {visible.length === 0 && <p className="text-muted-foreground py-10 text-center text-sm">کاری با این مشخصات پیدا نشد.</p>}
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const activeId = useUi((s) => s.activeTaskId);
  const setActive = useUi((s) => s.setActiveTask);
  const pendingPrompt = useUi((s) => s.pendingPrompt);
  const setPendingPrompt = useUi((s) => s.setPendingPrompt);

  const task = useMemo(() => tasks.find((t) => t.id === activeId), [activeId]);
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<RunState>('idle');
  const [showPanel, setShowPanel] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load the selected task, or begin a fresh run from a prompt typed on the home page.
  useEffect(() => {
    if (task) {
      setDraftTitle(null);
      setMessages([{ id: 1, from: 'user', text: `${task.title} را انجام بده و نتیجه را برایم بنویس.` }]);
      setStep(initialStep[task.status]);
      setState(task.status === 'running' ? 'running' : task.status === 'stopped' ? 'paused' : 'done');
    } else if (pendingPrompt) {
      startRun(pendingPrompt);
      setPendingPrompt(null);
    } else {
      setDraftTitle(null);
      setState('idle');
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, task]);

  // Fake progress: one plan step at a time while the run is active.
  useEffect(() => {
    if (state !== 'running') return;
    if (step >= planSteps.length) {
      setState('done');
      return;
    }
    const timer = setTimeout(() => setStep((s) => s + 1), planSteps[step].seconds * 700);
    return () => clearTimeout(timer);
  }, [state, step]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, step, state]);

  function startRun(text: string) {
    setDraftTitle(text);
    setMessages([{ id: 1, from: 'user', text }]);
    setStep(0);
    setState('running');
  }

  const send = (text: string) => {
    if (state === 'idle') return startRun(text);
    setMessages((list) => [
      ...list,
      { id: list.length + 1, from: 'user', text },
      { id: list.length + 2, from: 'agent', text: state === 'running' ? 'متوجه شدم. این نکته را در ادامهٔ کار در نظر می‌گیرم.' : 'حتماً. خروجی را بر همین اساس به‌روز می‌کنم.' },
    ]);
  };

  const title = task?.title ?? draftTitle;
  if (state === 'idle' || !title) return <NewTask onSend={send} onSelect={setActive} />;

  const agent = agentById(task?.agent ?? 'sales');
  const where = task?.where ?? 'local';
  const waiting = task?.status === 'waiting';
  const statusKey: TaskStatus = state === 'running' ? 'running' : state === 'paused' ? 'stopped' : waiting ? 'waiting' : 'done';

  return (
    <Group orientation="horizontal" className="h-full min-h-0">
      <Panel defaultSize="68%" minSize="45%" className="flex min-w-0 flex-col">
        {/* Session header */}
        {/* One line: who and what on the reading side; where it runs and which goal it serves as icons on the far side. */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-5">
          <Hint label={agent.name}>
            <span>
              <Glyph tone={agent.tone}>{agent.initial}</Glyph>
            </span>
          </Hint>
          <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
          <Badge tone={taskStatus[statusKey].tone} className="shrink-0">
            {state === 'running' && <Dot tone="primary" pulse />}
            {taskStatus[statusKey].label}
          </Badge>
          <div className="flex-1" />
          <Hint label={where === 'cloud' ? 'اجرای ابری' : 'اجرا روی همین سیستم'}>
            <span className="text-muted-foreground flex size-8 shrink-0 items-center justify-center">
              {where === 'cloud' ? <CloudIcon className="size-[18px]" /> : <DesktopIcon className="size-[18px]" />}
            </span>
          </Hint>
          {task?.goal && (
            <Hint label={`هدف: ${task.goal}`}>
              <Link href="/dashboards" className="text-muted-foreground hover:bg-hover hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full" aria-label={task.goal}>
                <TargetIcon className="size-[18px]" />
              </Link>
            </Hint>
          )}
          {state === 'running' && (
            <Button variant="outline" size="sm" onClick={() => setState('paused')}>
              <PauseIcon weight="fill" /> توقف
            </Button>
          )}
          {state === 'paused' && (
            <Button variant="soft" size="sm" onClick={() => setState('running')}>
              <PlayIcon weight="fill" /> ادامه
            </Button>
          )}
          <Hint label={showPanel ? 'بستن پنل کناری' : 'نمایش پنل کناری'}>
            <Button variant="muted" size="icon-sm" onClick={() => setShowPanel((v) => !v)} aria-label="پنل کناری">
              <SidebarSimpleIcon />
            </Button>
          </Hint>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-4 px-5 py-6">
            <div className="flex justify-end">
              <div className={userBubble}>{messages[0]?.text}</div>
            </div>

            <div className={agentBubble}>
              برای این کار یک برنامهٔ {planSteps.length.toLocaleString('fa-IR')} مرحله‌ای چیده‌ام. هر جا لازم بود وسط کار بنویسید تا مسیر را عوض کنم.
            </div>
            <Activity step={step} state={state} />

            {messages.slice(1).map((m) => (
              <div key={m.id} className={cn('flex', m.from === 'user' && 'justify-end')}>
                <div className={m.from === 'user' ? userBubble : agentBubble}>{m.text}</div>
              </div>
            ))}

            {state === 'paused' && (
              <div className="bg-warning-soft text-warning flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm">
                <PauseIcon weight="fill" className="size-4" />
                کار متوقف شده است. می‌توانید بازخورد بدهید یا «ادامه» را بزنید.
              </div>
            )}

            {state === 'done' && (
              <div className="space-y-3">
                <div className={agentBubble}>
                  تمام شد. فروش لوازم آشپزخانه <strong className="font-semibold">۳۱٪ افت</strong> کرده و سه علت اصلی دارد: قیمت بالاتر از رقبا، کمبود موجودی
                  شش کالای پرفروش و سهم کم این دسته از بودجهٔ تبلیغات. گزارش کامل، جدول شهرها و نمودار در پنل کناری آماده است.
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'تحلیل افت فروش آشپزخانه', icon: FileTextIcon },
                    { label: 'تفکیک شهرها', icon: TableIcon },
                    { label: 'روند ۸ هفته', icon: ChartBarIcon },
                    { label: 'خلاصه برای جلسه', icon: PresentationChartIcon },
                  ].map((file) => (
                    <button key={file.label} onClick={() => setShowPanel(true)} className="hover:bg-hover flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm">
                      <file.icon className="text-primary size-4" />
                      {file.label}
                    </button>
                  ))}
                </div>
                {waiting && (
                  <div className="border-warning/40 bg-warning-soft/50 flex items-center gap-3 rounded-2xl border px-4 py-3">
                    <ShieldCheckIcon weight="fill" className="text-warning size-6 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">برای اقدام بعدی به تأیید شما نیاز دارم</div>
                      <div className="text-muted-foreground text-xs">این کار خارج از سیستم اثر می‌گذارد و بدون تأیید انجام نمی‌شود.</div>
                    </div>
                    <Button asChild size="sm">
                      <Link href="/approvals">بررسی و تأیید</Link>
                    </Button>
                  </div>
                )}
                <div className="text-muted-foreground flex items-center gap-1">
                  <Hint label="خوب بود"><Button variant="muted" size="icon-sm"><ThumbsUpIcon /></Button></Hint>
                  <Hint label="خوب نبود"><Button variant="muted" size="icon-sm"><ThumbsDownIcon /></Button></Hint>
                  <span className="ms-1 text-xs">۱۶ ثانیه · حدود ۱۲٬۴۰۰ تومان</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl px-5 pb-4">
          <Composer
            busy={state === 'running'}
            onStop={() => setState('paused')}
            onSend={send}
            placeholder={state === 'running' ? 'وسط کار بازخورد بدهید…' : 'ادامه بدهید یا تغییری بخواهید…'}
          />
        </div>
      </Panel>

      {showPanel && (
        <>
          <Separator className="bg-border hover:bg-primary/50 data-[separator=active]:bg-primary w-px outline-none transition-colors" />
          <Panel defaultSize="32%" minSize="24%" className="min-w-0">
            <OutputPanel step={step} state={state} onClose={() => setShowPanel(false)} />
          </Panel>
        </>
      )}
    </Group>
  );
}
