import { cn } from '@/lib/utils';

/** One-line page bar: the title on the reading side, then tabs, with context
 *  chips and actions pushed to the far side. No subtitle — anything worth
 *  saying about the page goes in `meta`, on the same line. */
export function PageHeader({
  title,
  tabs,
  meta,
  actions,
}: {
  title: React.ReactNode;
  tabs?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-5 border-b px-6">
      <h1 className="shrink-0 text-base font-semibold">{title}</h1>
      {tabs && <div className="scrollbar-none min-w-0 self-stretch overflow-x-auto">{tabs}</div>}
      <div className="flex-1" />
      {meta && <div className="text-muted-foreground hidden shrink-0 items-center gap-2 text-xs lg:flex">{meta}</div>}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageBody({ className, wide, children }: { className?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto">
      <div className={cn('mx-auto w-full px-6 py-6', wide ? 'max-w-[1400px]' : 'max-w-[1120px]', className)}>{children}</div>
    </div>
  );
}
