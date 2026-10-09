'use client';

import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  CircleNotchIcon,
  DatabaseIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  FileXlsIcon,
  PauseIcon,
  PresentationChartIcon,
  TableIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';

import { CityTable, DocPreview, SalesColumns, SlideDeck } from '@/components/shared/viewers';
import { Button } from '@/components/ui/button';
import { ListRow, MetaDot, PanelCard, PlanRing } from '@/components/ui/patterns';
import { Hint, Segmented } from '@/components/ui/primitives';
import { planSteps } from '@/lib/mock';
import { cn } from '@/lib/utils';

type OutputKind = 'doc' | 'table' | 'chart' | 'slides';

const outputs: { kind: OutputKind; title: string; type: string; icon: Icon; readyAt: number }[] = [
  { kind: 'doc', title: 'تحلیل افت فروش آشپزخانه', type: 'سند', icon: FileTextIcon, readyAt: 5 },
  { kind: 'table', title: 'تفکیک شهرها', type: 'جدول', icon: TableIcon, readyAt: 3 },
  { kind: 'chart', title: 'روند ۸ هفته', type: 'نمودار', icon: ChartBarIcon, readyAt: 3 },
  { kind: 'slides', title: 'خلاصه برای جلسه', type: 'اسلاید', icon: PresentationChartIcon, readyAt: 5 },
];

const context = [
  { title: 'sales_1405.xlsx', meta: 'پوشهٔ گزارش‌ها · ۲۳٬۴۱۰ ردیف', icon: FileXlsIcon },
  { title: 'پایگاه سفارش‌ها', meta: 'اتصال · فقط خواندن', icon: DatabaseIcon },
  { title: 'قیمت‌گذاری پاییز', meta: 'پوشهٔ گزارش‌ها', icon: FileXlsIcon },
];

type RunState = 'idle' | 'running' | 'paused' | 'done';

function StepIcon({ done, current, state }: { done: boolean; current: boolean; state: RunState }) {
  if (done) return <CheckCircleIcon weight="fill" className="text-success size-4 shrink-0" />;
  if (current && state === 'running')
    return (
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <span className="bg-primary/25 absolute inline-flex size-4 animate-ping rounded-full" />
        <CircleNotchIcon className="text-primary relative size-4 animate-spin" />
      </span>
    );
  if (current) return <PauseIcon weight="fill" className="text-warning size-4 shrink-0" />;
  return <CircleDashedIcon className="text-muted-foreground/50 size-4 shrink-0" />;
}

function DetailView({ kind, onBack, onClose }: { kind: OutputKind; onBack: () => void; onClose: () => void }) {
  const [current, setCurrent] = useState(kind);
  const output = outputs.find((o) => o.kind === current)!;
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <Hint label="بازگشت">
          <Button variant="muted" size="icon-sm" onClick={onBack} aria-label="بازگشت">
            <ArrowRightIcon />
          </Button>
        </Hint>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{output.title}</span>
        <Segmented
          size="sm"
          value={current}
          onChange={setCurrent}
          options={outputs.map((o) => ({ value: o.kind, label: o.type, icon: <o.icon /> }))}
        />
        <Hint label="باز کردن در فایل‌ها">
          <Button asChild variant="muted" size="icon-sm">
            <Link href="/files" aria-label="باز کردن در فایل‌ها">
              <ArrowSquareOutIcon />
            </Link>
          </Button>
        </Hint>
        <Button variant="muted" size="icon-sm" onClick={onClose} aria-label="بستن">
          <XIcon />
        </Button>
      </div>
      <div className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto p-5">
        {current === 'doc' && <DocPreview className="mx-auto max-w-2xl" />}
        {current === 'table' && <CityTable />}
        {current === 'chart' && (
          <div>
            <div className="mb-3 text-sm font-medium">فروش هفتگی (میلیون تومان)</div>
            <SalesColumns height={300} />
            <p className="text-muted-foreground mt-3 text-xs">هفتهٔ ۲۹ با رنگ قرمز مشخص شده است؛ ۱۴٫۹٪ کمتر از میانگین هشت هفته.</p>
          </div>
        )}
        {current === 'slides' && <SlideDeck />}
      </div>
    </div>
  );
}

/** The session side panel, after Kortix: a column of collapsible cards
 *  (plan, outputs, context). Opening an output swaps the column for a viewer. */
export function OutputPanel({ step, state, onClose }: { step: number; state: RunState; onClose: () => void }) {
  const [open, setOpen] = useState<OutputKind | null>(null);
  const total = planSteps.length;
  const done = Math.min(step, total);
  const ready = outputs.filter((o) => step >= o.readyAt);
  const live = state !== 'done' && step < total ? planSteps[step].title : 'همهٔ مراحل انجام شد';

  if (open) return <DetailView kind={open} onBack={() => setOpen(null)} onClose={onClose} />;

  return (
    <div className="bg-surface/60 flex h-full flex-col gap-2 p-2.5">
      <PanelCard
        title="برنامه"
        indicator={
          <span className="flex items-center gap-1.5">
            <PlanRing done={done} total={total} />
            <span className="text-muted-foreground text-xs">
              {done.toLocaleString('fa-IR')} از {total.toLocaleString('fa-IR')}
            </span>
          </span>
        }
        subtitle={<span className={cn('block truncate text-xs', state === 'done' ? 'text-muted-foreground' : 'text-foreground/70')}>{live}</span>}
        contentClassName="border-t px-3.5 py-3"
      >
        <ol className="space-y-2.5">
          {planSteps.map((item, index) => {
            const isDone = index < step;
            const current = index === step && state !== 'done';
            return (
              <li key={item.id} className="flex gap-2.5">
                <span className="mt-0.5">
                  <StepIcon done={isDone} current={current} state={state} />
                </span>
                <div className="min-w-0">
                  <div className={cn('text-sm leading-5', !isDone && !current && 'text-muted-foreground', isDone && 'text-foreground/80')}>{item.title}</div>
                  {(isDone || current) && <div className="text-muted-foreground mt-0.5 text-xs">{item.detail}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      </PanelCard>

      <PanelCard
        title="خروجی‌ها"
        count={ready.length}
        fill
        contentClassName="border-t p-1.5"
        headerAction={
          ready.length > 0 ? (
            <Hint label="دانلود همه">
              <Button variant="muted" size="icon-xs" aria-label="دانلود همه">
                <DownloadSimpleIcon />
              </Button>
            </Hint>
          ) : undefined
        }
      >
        {ready.length === 0 ? (
          <div className="px-4 py-7 text-center">
            <div className="mx-auto flex w-fit gap-1.5 opacity-50">
              {[FileTextIcon, TableIcon, ChartBarIcon].map((I, i) => (
                <span key={i} className="bg-secondary text-muted-foreground flex size-9 items-center justify-center rounded-md">
                  <I className="size-4" />
                </span>
              ))}
            </div>
            <p className="text-muted-foreground mt-3 text-xs">سند، جدول، نمودار و اسلایدهایی که ایجنت می‌سازد اینجا ظاهر می‌شود.</p>
          </div>
        ) : (
          ready.map((o) => (
            <ListRow
              key={o.kind}
              onClick={() => setOpen(o.kind)}
              icon={
                <span className="bg-primary-soft text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
                  <o.icon className="size-4" />
                </span>
              }
              title={<span className="truncate">{o.title}</span>}
              meta={
                <>
                  <span>{o.type}</span>
                  <MetaDot />
                  <span>همین حالا</span>
                </>
              }
            />
          ))
        )}
      </PanelCard>

      <PanelCard title="زمینه" count={context.length} defaultExpanded={false} contentClassName="border-t p-1.5">
        {context.map((c) => (
          <ListRow
            key={c.title}
            icon={<c.icon className="text-muted-foreground size-5 shrink-0" />}
            title={<span className="ltr-nums truncate">{c.title}</span>}
            meta={<span className="truncate">{c.meta}</span>}
          />
        ))}
      </PanelCard>
    </div>
  );
}
