'use client';

import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  CaretDownIcon,
  CheckIcon,
  CoinsIcon,
  CreditCardIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  PencilSimpleIcon,
  ProhibitIcon,
  ShieldWarningIcon,
  TableIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AgentChip } from '@/components/shared/bits';
import { PageHeader } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '@/components/ui/overlays';
import { Block, BlockLabel, EmptyNote, MetaDot, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/patterns';
import { Badge, Hint, Input, Segmented, Textarea } from '@/components/ui/primitives';
import { approvals, kindLabel, riskMeta, type Approval } from '@/lib/mock';
import { useUi } from '@/lib/store';
import { cn, toman } from '@/lib/utils';

const kindIcon: Record<Approval['kind'], Icon> = {
  document: FileTextIcon,
  sheet: TableIcon,
  campaign: MegaphoneIcon,
  payment: CreditCardIcon,
};

function Detail({ item, onBack }: { item: Approval; onBack: () => void }) {
  const decisions = useUi((s) => s.decisions[item.id]) ?? {};
  const decide = useUi((s) => s.decide);
  const decideAll = useUi((s) => s.decideAll);
  const resolve = useUi((s) => s.resolve);
  const resolved = useUi((s) => s.resolved[item.id]);
  const [editing, setEditing] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const ids = item.changes.map((c) => c.id);
  const approvedCount = ids.filter((id) => decisions[id] === 'approved').length;
  const decidedCount = ids.filter((id) => decisions[id]).length;
  const risk = riskMeta[item.risk];

  const finish = () => {
    const outcome = approvedCount > 0 ? 'approved' : 'rejected';
    resolve(item.id, outcome);
    toast.success(outcome === 'approved' ? `${approvedCount.toLocaleString('fa-IR')} تغییر تأیید و برای اجرا ارسال شد` : 'پیشنهاد رد شد', {
      description: item.title,
    });
    onBack();
  };

  return (
    <div className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-5">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1.5 text-sm">
          <ArrowRightIcon className="size-4" /> صندوق تأیید
        </button>

        {/* Title on the reading side; risk, cost and reversibility as chips on the far side. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="min-w-0 text-lg font-semibold">{item.title}</h1>
          {resolved && <Badge tone={resolved === 'approved' ? 'success' : 'danger'}>{resolved === 'approved' ? 'تأیید شد' : 'رد شد'}</Badge>}
          <div className="flex-1" />
          <Badge tone={risk.tone}>
            <ShieldWarningIcon weight="fill" /> {risk.label}
          </Badge>
          <Badge tone="outline">
            <CoinsIcon /> {item.cost ? toman(item.cost) : 'بدون هزینه'}
          </Badge>
          <Badge tone={item.reversible ? 'outline' : 'danger'}>
            {item.reversible ? <ArrowCounterClockwiseIcon /> : <ProhibitIcon />}
            {item.reversible ? 'قابل برگشت' : 'غیرقابل برگشت'}
          </Badge>
        </div>

        <Block className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <AgentChip id={item.agent} className="[&>span:last-child]:text-sm [&>span:last-child]:font-medium" />
          <p className="min-w-0 flex-1 text-sm">{item.summary}</p>
          <span className="text-muted-foreground text-xs">
            {item.target} · {item.when}
          </span>
        </Block>

        {/* One row per change; each is decided on its own. */}
        <div className="mt-6">
          <BlockLabel
            action={
              <span className="text-muted-foreground text-xs">
                {decidedCount.toLocaleString('fa-IR')} از {ids.length.toLocaleString('fa-IR')} بررسی شد
              </span>
            }
          >
            تغییرات
          </BlockLabel>
          <Table>
            <THead>
              <Th className="w-[18%]">تغییر</Th>
              <Th className="w-[30%]">قبل</Th>
              <Th>بعد</Th>
              <Th className="w-px text-end">تصمیم</Th>
            </THead>
            <TBody>
              {item.changes.map((change) => {
                const decision = decisions[change.id];
                const after = edits[change.id] ?? change.after;
                return (
                  <Tr key={change.id} className={cn(decision === 'approved' && 'bg-success-soft/40', decision === 'rejected' && 'opacity-60')}>
                    <Td className="align-top font-medium">
                      {change.label}
                      {edits[change.id] && <Badge tone="info" className="ms-2">ویرایش‌شده</Badge>}
                    </Td>
                    <Td className="align-top leading-7">
                      <span className={change.before === '—' ? 'text-muted-foreground' : 'diff-del'}>{change.before}</span>
                    </Td>
                    <Td className="align-top leading-7">
                      {editing === change.id ? (
                        <div className="space-y-2">
                          <Textarea
                            autoFocus
                            defaultValue={after}
                            onChange={(e) => setEdits((prev) => ({ ...prev, [change.id]: e.target.value }))}
                            className="bg-background text-sm"
                          />
                          <Button size="xs" onClick={() => setEditing(null)}>
                            ذخیرهٔ ویرایش
                          </Button>
                        </div>
                      ) : (
                        <span className="diff-add">{after}</span>
                      )}
                    </Td>
                    <Td className="align-top">
                      <div className="flex items-center justify-end gap-1">
                        <Hint label="ویرایش پیشنهاد">
                          <Button variant="muted" size="icon-xs" aria-label="ویرایش" onClick={() => setEditing(editing === change.id ? null : change.id)} disabled={!!resolved}>
                            <PencilSimpleIcon />
                          </Button>
                        </Hint>
                        <Button
                          variant={decision === 'rejected' ? 'danger' : 'ghost'}
                          size="xs"
                          disabled={!!resolved}
                          onClick={() => decide(item.id, change.id, decision === 'rejected' ? null : 'rejected')}
                        >
                          <XIcon /> رد
                        </Button>
                        <Button
                          variant={decision === 'approved' ? 'success' : 'outline'}
                          size="xs"
                          disabled={!!resolved}
                          onClick={() => decide(item.id, change.id, decision === 'approved' ? null : 'approved')}
                        >
                          <CheckIcon /> تأیید
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </div>

        {!resolved && (
          <Block className="sticky bottom-4 mt-6 flex items-center justify-between gap-3 py-3 shadow-float">
            <p className="text-muted-foreground min-w-0 text-sm">
              {decidedCount === 0
                ? 'هر تغییر را جداگانه بررسی کنید یا همه را یک‌جا تصمیم بگیرید.'
                : `${approvedCount.toLocaleString('fa-IR')} تأیید · ${(decidedCount - approvedCount).toLocaleString('fa-IR')} رد`}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => decideAll(item.id, ids, 'rejected')}>
                رد همه
              </Button>
              <Button variant="outline" size="sm" onClick={() => decideAll(item.id, ids, 'approved')}>
                تأیید همه
              </Button>
              <Button size="sm" disabled={decidedCount < ids.length} onClick={finish}>
                <CheckIcon weight="bold" /> ثبت تصمیم
              </Button>
            </div>
          </Block>
        )}
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const resolved = useUi((s) => s.resolved);
  const [selected, setSelected] = useState<string | null>(null);
  const [segment, setSegment] = useState<'pending' | 'done'>('pending');
  const [kind, setKind] = useState<'all' | Approval['kind']>('all');
  const [query, setQuery] = useState('');

  const pending = approvals.filter((a) => !resolved[a.id]);
  const visible = useMemo(
    () =>
      approvals.filter(
        (a) => (segment === 'pending' ? !resolved[a.id] : !!resolved[a.id]) && (kind === 'all' || a.kind === kind) && (a.title + a.summary).includes(query.trim()),
      ),
    [resolved, segment, kind, query],
  );

  const item = approvals.find((a) => a.id === selected);
  if (item) return <Detail item={item} onBack={() => setSelected(null)} />;

  return (
    <>
      <PageHeader title="صندوق تأیید" meta={<>{pending.length.toLocaleString('fa-IR')} مورد منتظر شماست</>} />
      <div className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto">
        <div className="w-full px-4">
          <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Segmented
              value={segment}
              onChange={setSegment}
              options={[
                { value: 'pending', label: `منتظر تأیید · ${pending.length.toLocaleString('fa-IR')}` },
                { value: 'done', label: 'بررسی‌شده' },
              ]}
            />
            <div className="flex items-center gap-2">
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {kind === 'all' ? 'همهٔ انواع' : kindLabel[kind]}
                    <CaretDownIcon className="text-muted-foreground size-3.5!" />
                  </Button>
                </MenuTrigger>
                <MenuContent align="end" className="w-44">
                  <MenuLabel>نوع اقدام</MenuLabel>
                  <MenuItem onSelect={() => setKind('all')}>همهٔ انواع</MenuItem>
                  {(Object.keys(kindLabel) as Approval['kind'][]).map((k) => {
                    const KindIcon = kindIcon[k];
                    return (
                      <MenuItem key={k} onSelect={() => setKind(k)}>
                        <KindIcon /> {kindLabel[k]}
                      </MenuItem>
                    );
                  })}
                </MenuContent>
              </Menu>
              <div className="relative sm:w-56">
                <MagnifyingGlassIcon className="text-muted-foreground absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجو…" className="h-8 ps-8 text-sm" />
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyNote icon={<CheckIcon />} title={segment === 'pending' ? 'چیزی منتظر تأیید نیست' : 'هنوز موردی بررسی نشده'}>
              هر وقت ایجنتی بخواهد کاری با اثر بیرونی انجام دهد، اینجا می‌آید.
            </EmptyNote>
          ) : (
            <Table className="mb-6">
              <THead>
                <Th>اقدام</Th>
                <Th>ایجنت</Th>
                <Th>نوع</Th>
                <Th>تغییرات</Th>
                <Th>هزینه</Th>
                <Th>برگشت‌پذیری</Th>
                <Th>ریسک</Th>
                <Th>زمان</Th>
              </THead>
              <TBody>
                {visible.map((a) => {
                  const KindIcon = kindIcon[a.kind];
                  const done = resolved[a.id];
                  return (
                    <Tr key={a.id} onClick={() => setSelected(a.id)}>
                      <Td className="min-w-64">
                        <div className="flex items-center gap-2 font-medium">
                          {a.title}
                          {done && <Badge tone={done === 'approved' ? 'success' : 'danger'}>{done === 'approved' ? 'تأیید شد' : 'رد شد'}</Badge>}
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <AgentChip id={a.agent} className="[&>span:last-child]:text-sm" />
                      </Td>
                      <Td className="text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <KindIcon className="size-4" /> {kindLabel[a.kind]}
                        </span>
                      </Td>
                      <Td className="text-muted-foreground whitespace-nowrap">{a.changes.length.toLocaleString('fa-IR')} تغییر</Td>
                      <Td className="whitespace-nowrap">{a.cost ? toman(a.cost) : '—'}</Td>
                      <Td className={cn('whitespace-nowrap', a.reversible ? 'text-muted-foreground' : 'text-danger')}>{a.reversible ? 'قابل برگشت' : 'غیرقابل برگشت'}</Td>
                      <Td>
                        <Badge tone={riskMeta[a.risk].tone}>{riskMeta[a.risk].label.replace('ریسک ', '')}</Badge>
                      </Td>
                      <Td className="text-muted-foreground whitespace-nowrap">{a.when}</Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
