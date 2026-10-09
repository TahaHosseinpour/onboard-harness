'use client';

import {
  ArrowLeftIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  FileTextIcon,
  HourglassMediumIcon,
  LightningIcon,
  PresentationChartIcon,
  TableIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AgentChip, Delta, SourceInfo, Sparkline } from '@/components/shared/bits';
import { Composer } from '@/components/shared/composer';
import { PageBody } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Badge, Card, Dot, Glyph, SectionCard } from '@/components/ui/primitives';
import { anomalies, approvals, briefing, kpis, me, riskMeta } from '@/lib/mock';
import { useUi } from '@/lib/store';
import { jalaliToday, toman } from '@/lib/utils';

const shortcuts = [
  { label: 'گزارش فروش این هفته', icon: FileTextIcon },
  { label: 'چرا فروش آشپزخانه افت کرد؟', icon: ChartLineUpIcon },
  { label: 'جدول مقایسهٔ قیمت با رقبا', icon: TableIcon },
  { label: 'اسلاید جلسهٔ هیئت‌مدیره', icon: PresentationChartIcon },
  { label: 'یک اتوماسیون بساز', icon: LightningIcon },
];

export default function HomePage() {
  const router = useRouter();
  const setPendingPrompt = useUi((s) => s.setPendingPrompt);
  const setActiveTask = useUi((s) => s.setActiveTask);

  const start = (prompt: string) => {
    setPendingPrompt(prompt);
    setActiveTask('new');
    router.push('/tasks');
  };

  return (
    <PageBody className="space-y-6 py-10">
      {/* Greeting + start a new task */}
      <section className="mx-auto max-w-3xl">
        <p className="text-muted-foreground text-center text-xs" suppressHydrationWarning>
          {jalaliToday()}
        </p>
        <h1 className="mt-1 text-center text-2xl font-semibold tracking-tight">صبح بخیر، {me.name.split(' ')[0]}</h1>
        <Composer large className="mt-6" placeholder="امروز چه کاری را به تیم بسپارم؟" onSend={(text) => start(text)} />
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {shortcuts.map((item) => (
            <button
              key={item.label}
              onClick={() => start(item.label)}
              className="text-muted-foreground hover:bg-hover hover:text-foreground flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors"
            >
              <item.icon className="size-3.5" />
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* Daily briefing */}
      <SectionCard
        title="خلاصهٔ امروز"
        description="از دیروز ساعت ۱۸:۰۰ تا الان"
        action={<Badge tone="primary">به‌روز شد · ۵ دقیقه پیش</Badge>}
        flush
        className="mt-10"
      >
        <div className="divide-border/70 grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0 lg:divide-x-reverse">
          <div className="p-5">
            <h3 className="text-success flex items-center gap-1.5 text-sm">
              <CheckCircleIcon weight="fill" className="size-4" /> چه شد
            </h3>
            <ul className="mt-3 space-y-3">
              {briefing.happened.map((item) => (
                <li key={item.text} className="text-sm leading-6">
                  {item.text}
                  <AgentChip id={item.agent} className="text-muted-foreground mt-1 flex" />
                </li>
              ))}
            </ul>
          </div>
          <div className="p-5">
            <h3 className="text-warning flex items-center gap-1.5 text-sm">
              <WarningIcon weight="fill" className="size-4" /> چه چیزی غیرعادی است
            </h3>
            <ul className="mt-3 space-y-3">
              {briefing.unusual.map((item) => (
                <li key={item.text} className="flex gap-2 text-sm leading-6">
                  <Dot tone={item.tone} className="mt-2.5" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-5">
            <h3 className="text-primary flex items-center gap-1.5 text-sm">
              <HourglassMediumIcon weight="fill" className="size-4" /> چه چیزی منتظر تأیید شماست
            </h3>
            <ul className="mt-3 space-y-3">
              {briefing.pending.map((item) => (
                <li key={item.text} className="text-sm leading-6">
                  {item.text}
                  <AgentChip id={item.agent} className="text-muted-foreground mt-1 flex" />
                </li>
              ))}
            </ul>
            <Button asChild variant="soft" size="sm" className="mt-4">
              <Link href="/approvals">
                رفتن به صندوق تأیید <ArrowLeftIcon />
              </Link>
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.id} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">{kpi.label}</span>
              <SourceInfo source={kpi.source} updated={kpi.updated} verified={kpi.verified} />
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <div className="text-xl leading-8 font-semibold tracking-tight whitespace-nowrap">{kpi.value}</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Delta value={kpi.delta} good={kpi.good} />
                  <span className="text-muted-foreground text-xs">نسبت به هفتهٔ قبل</span>
                </div>
              </div>
              <Sparkline data={kpi.spark} good={kpi.good} />
            </div>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Anomalies */}
        <SectionCard title="هشدار ناهنجاری‌ها" count={anomalies.length} flush className="lg:col-span-3">
          <ul className="divide-border/70 divide-y">
            {anomalies.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                <Glyph tone={item.tone}>
                  <WarningIcon weight="fill" />
                </Glyph>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{item.title}</span>
                    <Badge tone={item.tone} className="ltr-nums">{item.metric}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">{item.detail}</p>
                </div>
                <span className="text-muted-foreground hidden text-xs sm:block">{item.when}</span>
                <Button variant="outline" size="xs" onClick={() => start(`بررسی کن: ${item.title}`)}>
                  بررسی کن
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Waiting for approval */}
        <SectionCard
          title="منتظر تأیید"
          count={approvals.length}
          flush
          className="lg:col-span-2"
          action={
            <Button asChild variant="muted" size="xs">
              <Link href="/approvals">همه</Link>
            </Button>
          }
        >
          <ul className="divide-border/70 divide-y">
            {approvals.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link href="/approvals" className="hover:bg-hover block px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{item.title}</span>
                    <Badge tone={riskMeta[item.risk].tone}>{riskMeta[item.risk].label}</Badge>
                  </div>
                  <div className="text-muted-foreground mt-1.5 flex items-center gap-2 text-xs">
                    <AgentChip id={item.agent} />
                    <span>·</span>
                    <span>{item.cost ? toman(item.cost) : 'بدون هزینه'}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </PageBody>
  );
}
