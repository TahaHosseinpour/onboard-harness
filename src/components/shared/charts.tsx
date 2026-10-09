'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { fa } from '@/lib/utils';

const axis = { fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' };
export const chartColors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

type TooltipEntry = { name?: string | number; value?: number | string; color?: string; dataKey?: string | number };

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: TooltipEntry[]; label?: string | number; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="bg-popover shadow-overlay rounded-md border px-3 py-2 text-xs">
      {label != null && <div className="mb-1 font-medium">{label}</div>}
      {payload.map((entry) => (
        <div key={String(entry.dataKey ?? entry.name)} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ms-auto ps-3 font-medium">
            {fa(Number(entry.value))} {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

// Charts are mirrored for Persian: the X axis runs right-to-left and the Y axis sits on the right.

export function TrendChart({
  data,
  xKey,
  series,
  unit,
  height = 260,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: { key: string; name: string; dashed?: boolean }[];
  unit?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 0, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} reversed tick={axis} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis orientation="right" tick={axis} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => fa(v)} domain={['auto', 'auto']} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: 'var(--border)' }} />
        {series.map((s, index) =>
          s.dashed ? (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
          ) : (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={chartColors[index]}
              strokeWidth={2}
              fill={index === 0 ? 'url(#trendFill)' : 'transparent'}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ),
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ColumnChart({
  data,
  xKey,
  yKey,
  name,
  unit,
  height = 240,
  highlight,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  name: string;
  unit?: string;
  height?: number;
  /** Value of xKey to draw in the warning colour. */
  highlight?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: 8, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} reversed tick={axis} tickLine={false} axisLine={false} tickMargin={8} interval={0} />
        <YAxis orientation="right" tick={axis} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => fa(v)} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'var(--hover)' }} />
        <Bar dataKey={yKey} name={name} radius={[5, 5, 0, 0]} maxBarSize={44}>
          {data.map((row) => (
            <Cell key={String(row[xKey])} fill={row[xKey] === highlight ? 'var(--danger)' : 'var(--chart-1)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 200 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip content={<ChartTooltip unit="٪" />} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
          {data.map((row, index) => (
            <Cell key={row.name} fill={chartColors[index % chartColors.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
