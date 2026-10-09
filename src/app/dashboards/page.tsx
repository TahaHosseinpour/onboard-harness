'use client';

import { ArrowsClockwiseIcon, ChartBarIcon, DatabaseIcon, FlaskIcon, PlusIcon, SealCheckIcon, SparkleIcon, TargetIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Delta, SourceInfo, Sparkline } from '@/components/shared/bits';
import { ColumnChart, DonutChart, TrendChart, chartColors } from '@/components/shared/charts';
import { Experiments, GoalDialog, Goals } from '@/components/sections/goals';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { Badge, Card, Dot, Input, SectionCard, Segmented } from '@/components/ui/primitives';
import { categorySales, channelShare, cityRows, dashboards, kpis, weeklySales } from '@/lib/mock';
import { cn, fa } from '@/lib/utils';

type SortKey = 'sales' | 'orders' | 'change' | 'share';

export default function DashboardsPage() {
  const [active, setActive] = useState(dashboards[0].id);
  const [range, setRange] = useState<'8w' | '4w'>('8w');
  const [prompt, setPrompt] = useState('');
  const [sort, setSort] = useState<SortKey>('sales');
  const [category, setCategory] = useState<string | null>(null);

  const dashboard = dashboards.find((d) => d.id === active)!;
  const series = range === '8w' ? weeklySales : weeklySales.slice(-4);
  const rows = [...cityRows].sort((a, b) => b[sort] - a[sort]);

  const build = () => {
    if (!prompt.trim()) return;
    toast.success('داشبورد در حال ساخت است', { description: `«${prompt.trim()}» — پیش‌نمایش پس از آماده‌شدن برای تأیید نشان داده می‌شود.` });
    setPrompt('');
  };

  return (
    <Tabs defaultValue="dashboard" className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="داشبوردها و اهداف"
        tabs={
          <TabsList>
            <TabsTrigger value="dashboard">
              <ChartBarIcon /> داشبورد
            </TabsTrigger>
            <TabsTrigger value="goals">
              <TargetIcon /> اهداف
            </TabsTrigger>
            <TabsTrigger value="experiments">
              <FlaskIcon /> آزمایش‌ها
            </TabsTrigger>
          </TabsList>
        }
        meta={
          <>
            <Dot tone="success" pulse /> زنده · {dashboard.source} · {dashboard.updated}
          </>
        }
        actions={
          <>
            <Button variant="outline" size="icon-sm" aria-label="به‌روزرسانی" onClick={() => toast('داده‌ها به‌روز شد')}>
              <ArrowsClockwiseIcon />
            </Button>
            <GoalDialog />
          </>
        }
      />
      <PageBody wide>
        <TabsContent value="goals" className="outline-none">
          <Goals />
        </TabsContent>
        <TabsContent value="experiments" className="outline-none">
          <Experiments />
        </TabsContent>
        <TabsContent value="dashboard" className="space-y-4 outline-none">
        <Segmented value={active} onChange={setActive} options={dashboards.map((d) => ({ value: d.id, label: d.name }))} />
        {/* Build a dashboard from a sentence */}
        <div className="bg-primary-soft/50 flex items-center gap-3 rounded-2xl border border-transparent p-2 ps-4">
          <SparkleIcon weight="fill" className="text-primary size-5 shrink-0" />
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && build()}
            placeholder="داشبورد یا نمودار جدید را توصیف کنید؛ مثلاً «فروش هر شهر به تفکیک دسته در ۳ ماه اخیر»"
            className="h-10 border-0 bg-transparent px-0 focus-visible:ring-0"
          />
          <Button onClick={build} disabled={!prompt.trim()}>
            <PlusIcon /> بساز
          </Button>
        </div>

        {/* Headline numbers, each with its provenance */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.id} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{kpi.label}</span>
                <SourceInfo source={kpi.source} updated={kpi.updated} verified={kpi.verified} />
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div>
                  <div className="text-xl leading-9 font-semibold tracking-tight whitespace-nowrap">{kpi.value}</div>
                  <Delta value={kpi.delta} good={kpi.good} />
                </div>
                <Sparkline data={kpi.spark} good={kpi.good} />
              </div>
              <div className="text-muted-foreground mt-3 flex items-center gap-1.5 border-t pt-2.5 text-xs">
                <DatabaseIcon className="size-3.5" />
                <span className="truncate">{kpi.source}</span>
                <span className="ms-auto shrink-0">{kpi.updated}</span>
              </div>
            </Card>
          ))}
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          <SectionCard
            title="روند فروش هفتگی"
            description="میلیون تومان · در مقایسه با هدف"
            className="xl:col-span-2"
            action={
              <Segmented
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: '4w', label: '۴ هفته' },
                  { value: '8w', label: '۸ هفته' },
                ]}
              />
            }
          >
            <div className="text-muted-foreground mb-2 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="bg-chart-1 h-0.5 w-4 rounded-full" /> فروش
              </span>
              <span className="flex items-center gap-1.5">
                <span className="border-muted-foreground w-4 border-t border-dashed" /> هدف
              </span>
            </div>
            <TrendChart
              data={series}
              xKey="week"
              unit="میلیون"
              series={[
                { key: 'sales', name: 'فروش' },
                { key: 'target', name: 'هدف', dashed: true },
              ]}
            />
          </SectionCard>

          <SectionCard title="سهم کانال‌ها" description="از کل سفارش‌های این هفته">
            <DonutChart data={channelShare} height={190} />
            <ul className="mt-3 space-y-2">
              {channelShare.map((channel, index) => (
                <li key={channel.name} className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: chartColors[index] }} />
                  <span className="flex-1">{channel.name}</span>
                  <span className="font-medium">{fa(channel.value)}٪</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          <SectionCard title="فروش بر اساس دسته" description="روی هر دسته بزنید تا جدول فیلتر شود" className="xl:col-span-2">
            <ColumnChart data={categorySales} xKey="name" yKey="value" name="فروش" unit="میلیون" highlight="آشپزخانه" height={220} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {categorySales.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setCategory(category === item.name ? null : item.name)}
                  className={cn(
                    'flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors',
                    category === item.name ? 'border-primary bg-primary-soft text-primary' : 'hover:bg-hover',
                  )}
                >
                  {item.name}
                  <Delta value={item.change} good={item.change >= 0} />
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title={category ? `فروش شهرها · ${category}` : 'فروش شهرها'}
            description="برای مرتب‌سازی روی عنوان ستون بزنید"
            flush
            className="xl:col-span-3"
            action={category ? <Badge tone="primary">فیلتر: {category}</Badge> : undefined}
          >
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs">
                <tr className="border-b">
                  <th className="px-5 py-2.5 text-start font-medium">شهر</th>
                  {(
                    [
                      ['sales', 'فروش (میلیون)'],
                      ['orders', 'سفارش'],
                      ['change', 'تغییر هفتگی'],
                      ['share', 'سهم'],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <th key={key} className="px-3 py-2.5 text-start font-medium">
                      <button onClick={() => setSort(key)} className={cn('hover:text-foreground', sort === key && 'text-primary')}>
                        {label} {sort === key && '↓'}
                      </button>
                    </th>
                  ))}
                  <th className="px-5 py-2.5 text-start font-medium">وضعیت عدد</th>
                </tr>
              </thead>
              <tbody className="divide-border/70 divide-y">
                {rows.map((row) => (
                  <tr key={row.city} className="hover:bg-hover">
                    <td className="px-5 py-2.5 font-medium">{row.city}</td>
                    <td className="px-3 py-2.5">{fa(row.sales)}</td>
                    <td className="px-3 py-2.5">{fa(row.orders)}</td>
                    <td className="px-3 py-2.5">
                      <Delta value={row.change} good={row.change >= 0} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="bg-secondary h-1.5 w-16 overflow-hidden rounded-full">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${(row.share / 41.5) * 100}%` }} />
                        </div>
                        {fa(row.share, 1)}٪
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <SourceInfo source="پایگاه سفارش‌ها" updated="۵ دقیقه پیش" verified={row.verified}>
                        <button className={cn('flex items-center gap-1 text-xs', row.verified ? 'text-success' : 'text-warning')}>
                          {row.verified ? <SealCheckIcon weight="fill" className="size-4" /> : <WarningCircleIcon weight="fill" className="size-4" />}
                          {row.verified ? 'تأییدشده' : 'تأییدنشده'}
                        </button>
                      </SourceInfo>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
        </TabsContent>
      </PageBody>
    </Tabs>
  );
}
