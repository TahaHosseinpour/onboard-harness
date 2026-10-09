'use client';

// Page-level patterns carried over from Kortix: flat bordered blocks with a
// muted label above, grouped rows split by hairlines, and collapsible panel cards.

import { CaretLeftIcon } from '@phosphor-icons/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Muted heading above a block ("What changed", "Actions"). */
export function BlockLabel({ className, children, action }: { className?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={cn('mb-2 flex items-center justify-between gap-3', className)}>
      <div className="text-muted-foreground text-sm font-semibold">{children}</div>
      {action}
    </div>
  );
}

export function Block({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('bg-popover rounded-xl border px-4 py-3.5', className)} {...props} />;
}

/** Title + one-line description + trailing action, at the top of a pane. */
export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/** Consecutive rows share one border and are split by hairlines, not gaps. */
export function RowGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('bg-popover divide-border divide-y overflow-hidden rounded-xl border', className)} {...props} />;
}

/** Label (+ description) on the reading side, control on the far side, always vertically centred. */
export function Row({
  label,
  description,
  leading,
  children,
  className,
  onClick,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  leading?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', onClick && 'hover:bg-hover cursor-pointer', className)} onClick={onClick}>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-muted-foreground mt-0.5 text-xs leading-5">{description}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

/** List row from Kortix's review centre: icon, title, a meta line, trailing slot. */
export function ListRow({
  icon,
  title,
  meta,
  trailing,
  active,
  onClick,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick();
      }}
      className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none', active ? 'bg-active' : 'hover:bg-hover', className)}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium">{title}</div>
        {meta && <div className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">{meta}</div>}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}

export function MetaDot() {
  return (
    <span aria-hidden className="text-muted-foreground/60">
      •
    </span>
  );
}

/** Collapsible card of the session side panel. The header states the card's
 *  size right after its title; the chevron toggles an in-place body. */
export function PanelCard({
  title,
  count,
  indicator,
  subtitle,
  headerAction,
  defaultExpanded = true,
  fill,
  contentClassName = 'border-t p-3.5',
  children,
}: {
  title: string;
  count?: number;
  indicator?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  defaultExpanded?: boolean;
  fill?: boolean;
  contentClassName?: string;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  return (
    <div className={cn('bg-background overflow-hidden rounded-xl border', fill ? 'flex min-h-0 flex-col' : 'shrink-0')}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v);
        }}
        className="hover:bg-muted-foreground/[0.04] flex min-h-12 w-full items-center justify-between gap-2 px-3.5 py-2 outline-none"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{title}</span>
            {typeof count === 'number' && count > 0 && (
              <span className="bg-secondary text-muted-foreground rounded-full px-1.5 text-xs font-medium">{count.toLocaleString('fa-IR')}</span>
            )}
            {indicator}
          </span>
          {subtitle}
        </span>
        <span className="flex shrink-0 items-center gap-0.5">
          {headerAction && <span onClick={(e) => e.stopPropagation()}>{headerAction}</span>}
          <CaretLeftIcon className={cn('text-muted-foreground size-4 transition-transform duration-200', expanded && '-rotate-90')} />
        </span>
      </div>
      {expanded && <div className={cn(fill && 'scrollbar-minimal min-h-0 overflow-y-auto', contentClassName)}>{children}</div>}
    </div>
  );
}

/** Plan dial: a ring that fills with the share of finished steps. */
export function PlanRing({ done, total, className }: { done: number; total: number; className?: string }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  const ratio = total ? Math.min(1, done / total) : 0;
  return (
    <svg viewBox="0 0 16 16" className={cn('size-4 shrink-0 -rotate-90', className)} aria-hidden>
      <circle cx="8" cy="8" r={r} fill="none" stroke="var(--border)" strokeWidth="2.2" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke={ratio === 1 ? 'var(--success)' : 'var(--primary)'}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - ratio)}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

export function EmptyNote({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg px-6 py-12 text-center">
      {icon && <div className="text-muted-foreground/70 [&_svg]:size-8">{icon}</div>}
      <div className="text-sm font-medium">{title}</div>
      {children && <div className="text-muted-foreground max-w-sm text-sm">{children}</div>}
    </div>
  );
}

/* ───────────── Table ───────────── */

/** Column table: labels live once in the header row, never repeated inside cells. */
export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-popover scrollbar-minimal overflow-x-auto rounded-xl border', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-surface text-muted-foreground text-xs">
      <tr className="border-b">{children}</tr>
    </thead>
  );
}

export function Th({ className, ...props }: React.ComponentProps<'th'>) {
  return <th className={cn('px-4 py-2.5 text-start font-medium whitespace-nowrap', className)} {...props} />;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-border/70 divide-y">{children}</tbody>;
}

export function Tr({ className, onClick, ...props }: React.ComponentProps<'tr'>) {
  // Clickable rows are reachable from the keyboard too.
  return (
    <tr
      className={cn(onClick && 'hover:bg-hover focus-visible:bg-hover cursor-pointer outline-none', className)}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && e.currentTarget.click() : undefined}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}
