'use client';

import { CalendarBlankIcon, ChatsCircleIcon, PlusIcon, TargetIcon, UserIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { toast } from 'sonner';

import { AgentChip } from '@/components/shared/bits';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger, Select } from '@/components/ui/overlays';
import { Block, BlockLabel, MetaDot, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/patterns';
import { Badge, Card, Input, Label, Textarea } from '@/components/ui/primitives';
import { agents, experiments, experimentStatus, goals, goalStatus, members } from '@/lib/mock';
import { cn, fa, toman } from '@/lib/utils';

const barTone = { ahead: 'bg-success', ontrack: 'bg-primary', risk: 'bg-warning', off: 'bg-danger' };

export function GoalDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon /> هدف جدید
        </Button>
      </DialogTrigger>
      <DialogContent
        title="تعریف هدف"
        description="هر هدف یک مالک، یک شاخص قابل‌اندازه‌گیری و یک مهلت دارد."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">انصراف</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button size="sm" onClick={() => toast.success('هدف ثبت شد')}>ثبت هدف</Button>
            </DialogClose>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>عنوان هدف</Label>
            <Input placeholder="مثلاً: رشد ۲۰٪ فروش زمستان" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>مالک</Label>
              <Select defaultValue={members[1].name} options={members.map((m) => ({ value: m.name, label: m.name }))} />
            </div>
            <div>
              <Label>مهلت</Label>
              <Input placeholder="۲۹ اسفند ۱۴۰۵" />
            </div>
            <div>
              <Label>شاخص</Label>
              <Input placeholder="فروش فصلی" />
            </div>
            <div>
              <Label>مقدار هدف</Label>
              <Input placeholder="۵۰ میلیارد تومان" />
            </div>
          </div>
          <div>
            <Label>ایجنت مسئول</Label>
            <Select defaultValue="sales" options={agents.map((a) => ({ value: a.id, label: a.name, hint: `واحد ${a.unit}` }))} />
          </div>
          <div>
            <Label>توضیح (اختیاری)</Label>
            <Textarea placeholder="چرا این هدف مهم است؟" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Goals() {
  return (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            {(Object.keys(goalStatus) as (keyof typeof goalStatus)[]).map((key) => (
              <Block key={key} className="flex items-center justify-between py-3">
                <span className="text-muted-foreground text-sm">{goalStatus[key].label}</span>
                <span className="text-xl font-semibold">{goals.filter((g) => g.status === key).length.toLocaleString('fa-IR')}</span>
              </Block>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {goals.map((goal) => {
              const status = goalStatus[goal.status];
              const gap = goal.progress - goal.expected;
              return (
                <Card key={goal.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base">{goal.title}</h3>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <UserIcon className="size-3.5" /> {goal.owner}
                        <MetaDot />
                        <span>واحد {goal.unit}</span>
                        <MetaDot />
                        <CalendarBlankIcon className="size-3.5" /> {goal.deadline}
                      </div>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>

                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-tight">{fa(goal.current, 1)}</span>
                    <span className="text-muted-foreground text-sm">
                      از {fa(goal.target, 1)} {goal.unitLabel}
                    </span>
                    <span className="text-muted-foreground ms-auto text-xs">{goal.metric}</span>
                  </div>

                  {/* Progress against where the goal should be by today */}
                  <div className="relative mt-3">
                    <div className="bg-secondary h-2.5 overflow-hidden rounded-full">
                      <div className={cn('h-full rounded-full', barTone[goal.status])} style={{ width: `${goal.progress}%` }} />
                    </div>
                    <div className="bg-foreground absolute -top-1 h-4.5 w-0.5 rounded-full" style={{ insetInlineStart: `${goal.expected}%` }} title="جایی که باید امروز باشیم" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">پیشرفت {fa(goal.progress)}٪ · انتظار امروز {fa(goal.expected)}٪</span>
                    <span className={cn('font-medium', gap >= 0 ? 'text-success' : 'text-danger')}>
                      {gap >= 0 ? `${fa(gap)} واحد جلوتر` : `${fa(-gap)} واحد انحراف`}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3.5">
                    <div className="flex items-center gap-3">
                      {goal.agents.map((id) => (
                        <AgentChip key={id} id={id} />
                      ))}
                    </div>
                    <Button asChild variant="muted" size="xs">
                      <Link href="/tasks">
                        <ChatsCircleIcon /> {fa(goal.tasks)} کار مرتبط
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
  );
}

export function Experiments() {
  return (
        <div>
          <BlockLabel
            action={
              <Button variant="outline" size="xs">
                <PlusIcon /> ثبت آزمایش
              </Button>
            }
          >
            {fa(experiments.length)} آزمایش
          </BlockLabel>
          <Table>
            <THead>
              <Th>فرضیه</Th>
              <Th>هدف</Th>
              <Th>بازه</Th>
              <Th>هزینه</Th>
              <Th>نتیجه</Th>
              <Th>وضعیت</Th>
            </THead>
            <TBody>
              {experiments.map((item) => {
                const status = experimentStatus[item.status];
                return (
                  <Tr key={item.id}>
                    <Td className="min-w-72 font-medium">{item.hypothesis}</Td>
                    <Td className="text-muted-foreground whitespace-nowrap">{item.goal}</Td>
                    <Td className="text-muted-foreground whitespace-nowrap">{item.period}</Td>
                    <Td className="whitespace-nowrap">{toman(item.cost)}</Td>
                    <Td className={cn('whitespace-nowrap', item.status === 'won' && 'text-success', item.status === 'lost' && 'text-danger')}>{item.result}</Td>
                    <Td>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </div>
  );
}
