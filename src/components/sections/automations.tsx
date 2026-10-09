'use client';

import { ArrowRightIcon, CheckIcon, LightningIcon, PlayIcon, SparkleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AgentChip } from '@/components/shared/bits';
import { Button } from '@/components/ui/button';
import { Block, BlockLabel, MetaDot, Row, RowGroup } from '@/components/ui/patterns';
import { Badge, Glyph, Input, Switch } from '@/components/ui/primitives';
import { agentById, automations, runHistory, runStatus } from '@/lib/mock';
import { fa, toman } from '@/lib/utils';

type Automation = (typeof automations)[number];

function Detail({ item, enabled, onToggle, onBack }: { item: Automation; enabled: boolean; onToggle: (v: boolean) => void; onBack: () => void }) {
  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={onBack} className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1.5 text-sm">
        <ArrowRightIcon className="size-4" /> اتوماسیون‌ها
      </button>
      <div className="flex items-center gap-3">
        <Glyph size="lg" tone="warning">
          <LightningIcon weight="fill" />
        </Glyph>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">{item.name}</h1>
          <p className="text-muted-foreground text-sm">{item.when}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => toast.success('اجرا شروع شد', { description: item.name })}>
          <PlayIcon weight="fill" /> اجرای دستی
        </Button>
        <Switch checked={enabled} onCheckedChange={onToggle} aria-label="فعال" />
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Block className="py-3">
          <div className="text-muted-foreground text-xs">اجراکننده</div>
          <AgentChip id={item.agent} className="mt-1 [&>span:last-child]:text-sm [&>span:last-child]:font-medium" />
        </Block>
        <Block className="py-3">
          <div className="text-muted-foreground text-xs">تعداد اجرا</div>
          <div className="mt-0.5 text-sm font-medium">{fa(item.runs)} بار</div>
        </Block>
      </div>

      <div className="mt-6">
        <BlockLabel>دستور کار</BlockLabel>
        <Block>
          <p className="text-sm leading-7">
            {item.when}، {agentById(item.agent).name} «{item.name}» را انجام می‌دهد، نتیجه را در پوشهٔ گزارش‌ها ذخیره می‌کند و اگر اقدامی اثر بیرونی
            داشته باشد، آن را به صندوق تأیید می‌فرستد.
          </p>
        </Block>
      </div>

      <div className="mt-6">
        <BlockLabel>تاریخچهٔ اجرا</BlockLabel>
        <RowGroup>
          {runHistory.map((run) => (
            <Row
              key={run.when}
              label={
                <span className="flex items-center gap-2">
                  {run.when}
                  <Badge tone={runStatus[run.status].tone}>{runStatus[run.status].label}</Badge>
                </span>
              }
              description={run.note}
            >
              <span className="text-muted-foreground text-xs">{run.duration}</span>
              <span className="w-24 text-end text-xs font-medium">{toman(run.cost)}</span>
            </Row>
          ))}
        </RowGroup>
      </div>
    </div>
  );
}

export function Automations() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(automations.map((a) => [a.id, a.enabled])));
  const [selected, setSelected] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<string | null>(null);

  const toggle = (id: string, value: boolean) => {
    setEnabled((prev) => ({ ...prev, [id]: value }));
    toast(value ? 'اتوماسیون فعال شد' : 'اتوماسیون غیرفعال شد');
  };

  const item = automations.find((a) => a.id === selected);

  return (
    <>
      {item ? (
        <Detail item={item} enabled={enabled[item.id]} onToggle={(v) => toggle(item.id, v)} onBack={() => setSelected(null)} />
      ) : (
        <div className="space-y-5">
          {/* Create from a sentence, then confirm the parsed preview */}
          <div className="bg-primary-soft/50 rounded-2xl p-2">
            <div className="flex items-center gap-3 ps-2">
              <SparkleIcon weight="fill" className="text-primary size-5 shrink-0" />
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && prompt.trim() && setDraft(prompt.trim())}
                placeholder="اتوماسیون را با یک جمله بسازید؛ مثلاً «وقتی تیکت جدیدی ثبت شد، یک پاسخ اولیه بنویس»"
                className="h-10 border-0 bg-transparent px-0 focus-visible:ring-0"
              />
              <Button disabled={!prompt.trim()} onClick={() => setDraft(prompt.trim())}>
                بساز
              </Button>
            </div>
            {draft && (
              <div className="bg-background mt-2 rounded-xl border p-4">
                <div className="text-muted-foreground text-xs font-medium">پیش‌نمایش · قبل از فعال‌شدن تأیید کنید</div>
                <div className="mt-2 text-sm font-medium">«{draft}»</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="info">
                    <LightningIcon /> وقتی تیکت جدیدی ثبت شد
                  </Badge>
                  <Badge tone="primary">اجراکننده: پشتیبان مشتری</Badge>
                  <Badge tone="warning">ارسال پاسخ · با تأیید</Badge>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
                    انصراف
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.success('اتوماسیون ساخته و فعال شد');
                      setDraft(null);
                      setPrompt('');
                    }}
                  >
                    <CheckIcon /> تأیید و فعال‌سازی
                  </Button>
                </div>
              </div>
            )}
          </div>

          <RowGroup>
            {automations.map((a) => {
              return (
                <Row
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                  leading={
                    <Glyph tone="warning">
                      <LightningIcon weight="fill" />
                    </Glyph>
                  }
                  label={a.name}
                  description={
                    <span className="flex flex-wrap items-center gap-1.5">
                      {a.when}
                      <MetaDot />
                      {agentById(a.agent).name}
                      <MetaDot />
                      آخرین اجرا: {a.lastRun}
                    </span>
                  }
                >
                  <Badge tone={runStatus[a.lastStatus].tone}>{runStatus[a.lastStatus].label}</Badge>
                  <span onClick={(e) => e.stopPropagation()} className="flex">
                    <Switch checked={enabled[a.id]} onCheckedChange={(v) => toggle(a.id, v)} aria-label={`فعال‌بودن ${a.name}`} />
                  </span>
                </Row>
              );
            })}
          </RowGroup>
        </div>
      )}
    </>
  );
}
