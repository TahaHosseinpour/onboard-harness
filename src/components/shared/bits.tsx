'use client';

import { ArrowDownRightIcon, ArrowUpRightIcon, DatabaseIcon, SealCheckIcon, WarningCircleIcon } from '@phosphor-icons/react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays';
import { Glyph } from '@/components/ui/primitives';
import { agentById } from '@/lib/mock';
import { cn, percent } from '@/lib/utils';

export function AgentChip({ id, size = 'sm', showName = true, className }: { id: string; size?: 'sm' | 'md' | 'lg'; showName?: boolean; className?: string }) {
  const agent = agentById(id);
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      <Glyph size={size} tone={agent.tone}>{agent.initial}</Glyph>
      {showName && <span className="truncate text-xs">{agent.name}</span>}
    </span>
  );
}

/** Change vs. the previous period. `good` decides the colour, not the sign. */
export function Delta({ value, good, className }: { value: number; good: boolean; className?: string }) {
  const Icon = value >= 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className={cn('ltr-nums inline-flex items-center gap-0.5 text-xs font-medium', good ? 'text-success' : 'text-danger', className)}>
      <Icon className="size-3.5" weight="bold" />
      {percent(value)}
    </span>
  );
}

export function Sparkline({ data, good, className }: { data: number[]; good: boolean; className?: string }) {
  const width = 96;
  const height = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const color = good ? 'var(--success)' : 'var(--danger)';
  const [lastX, lastY] = points[points.length - 1];
  return (
    // Time runs right-to-left in a Persian layout, so the series is mirrored.
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('h-8 w-24 -scale-x-100 overflow-visible', className)} aria-hidden>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={color} opacity={0.08} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2.4} fill={color} />
    </svg>
  );
}

/** Provenance for a number: where it came from, how fresh it is, whether a human checked it. */
export function SourceInfo({ source, updated, verified, children }: { source: string; updated: string; verified: boolean; children?: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children ?? (
          <button
            className={cn('hover:bg-hover inline-flex size-5 items-center justify-center rounded-full', verified ? 'text-success' : 'text-warning')}
            aria-label="منبع و وضعیت تأیید"
          >
            {verified ? <SealCheckIcon weight="fill" className="size-4" /> : <WarningCircleIcon weight="fill" className="size-4" />}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 text-xs" align="end">
        <dl className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground flex items-center gap-1.5">
              <DatabaseIcon className="size-3.5" /> منبع
            </dt>
            <dd className="font-medium">{source}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">به‌روزرسانی</dt>
            <dd className="font-medium">{updated}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">وضعیت</dt>
            <dd className={cn('font-medium', verified ? 'text-success' : 'text-warning')}>{verified ? 'تأییدشده' : 'تأییدنشده'}</dd>
          </div>
        </dl>
        {!verified && <p className="text-muted-foreground mt-2.5 border-t pt-2.5 leading-5">این عدد هنوز با منبع دوم تطبیق داده نشده است.</p>}
      </PopoverContent>
    </Popover>
  );
}
