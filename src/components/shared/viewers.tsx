'use client';

import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { Delta } from '@/components/shared/bits';
import { ColumnChart } from '@/components/shared/charts';
import { Button } from '@/components/ui/button';
import { cityRows, docHtml, slides, weeklySales } from '@/lib/mock';
import { cn, fa } from '@/lib/utils';

export function DocPreview({ className }: { className?: string }) {
  return <article className={cn('doc-prose', className)} dangerouslySetInnerHTML={{ __html: docHtml }} />;
}

export function CityTable() {
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-surface text-muted-foreground text-xs">
          <tr>
            {['شهر', 'فروش (میلیون تومان)', 'سفارش', 'تغییر هفتگی', 'سهم'].map((h) => (
              <th key={h} className="px-3 py-2 text-start font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border/70 divide-y">
          {cityRows.map((row) => (
            <tr key={row.city} className="hover:bg-hover">
              <td className="px-3 py-2 font-medium">{row.city}</td>
              <td className="px-3 py-2">{fa(row.sales)}</td>
              <td className="px-3 py-2">{fa(row.orders)}</td>
              <td className="px-3 py-2"><Delta value={row.change} good={row.change >= 0} /></td>
              <td className="px-3 py-2">{fa(row.share, 1)}٪</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SalesColumns({ height }: { height?: number }) {
  return <ColumnChart data={weeklySales} xKey="week" yKey="sales" name="فروش" unit="میلیون تومان" highlight="هفته ۲۹" height={height} />;
}

function Slide({ index, small }: { index: number; small?: boolean }) {
  const slide = slides[index];
  const cover = slide.kind === 'cover';
  return (
    <div
      className={cn(
        'relative flex aspect-video w-full flex-col justify-center overflow-hidden rounded-lg border',
        cover ? 'bg-primary text-white' : 'bg-card',
        small ? 'p-2' : 'p-[6%]',
      )}
    >
      {cover && <div className="absolute -end-[8%] -top-[20%] size-[45%] rounded-full bg-white/10" />}
      <div className={cn('font-semibold', small ? 'text-[7px] leading-3' : 'text-[clamp(16px,2.6vw,30px)] leading-snug')}>{slide.title}</div>
      <div className={cn(cover ? 'text-white/80' : 'text-muted-foreground', small ? 'text-[5px] leading-2' : 'mt-2 text-[clamp(11px,1.2vw,15px)]')}>
        {slide.subtitle}
      </div>
      {slide.kind === 'chart' && !small && (
        <div className="mt-4 flex h-[38%] items-end gap-[3%]">
          {weeklySales.map((w) => (
            <div key={w.week} className="bg-primary/80 flex-1 rounded-t-sm" style={{ height: `${(w.sales / 3600) * 100}%` }} />
          ))}
        </div>
      )}
      {slide.kind === 'bullets' && !small && (
        <ul className="text-muted-foreground mt-4 space-y-1.5 text-[clamp(10px,1.1vw,14px)]">
          {slide.subtitle.split(/[،·]/).map((part) => (
            <li key={part} className="flex items-center gap-2">
              <span className="bg-primary size-1.5 rounded-full" /> {part.trim()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SlideDeck({ className }: { className?: string }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Slide index={current} />
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} aria-label="اسلاید قبل">
          <CaretRightIcon />
        </Button>
        <div className="scrollbar-none flex flex-1 gap-2 overflow-x-auto p-0.5">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              onClick={() => setCurrent(index)}
              className={cn('w-20 shrink-0 rounded-lg outline-2 outline-offset-1', index === current ? 'outline-primary outline' : 'opacity-70 hover:opacity-100')}
            >
              <Slide index={index} small />
            </button>
          ))}
        </div>
        <Button variant="outline" size="icon-sm" disabled={current === slides.length - 1} onClick={() => setCurrent((c) => c + 1)} aria-label="اسلاید بعد">
          <CaretLeftIcon />
        </Button>
      </div>
    </div>
  );
}
