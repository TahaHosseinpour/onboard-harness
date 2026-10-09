'use client';

import { CheckIcon, PencilSimpleIcon, ShieldCheckIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge, Textarea } from '@/components/ui/primitives';
import type { PendingAction } from '@/lib/api';
import { toolLabel } from '@/lib/backend';

/** Plain names for the inputs of an action, so the card does not show field names from the code. */
const argLabel: Record<string, string> = {
  file_path: 'فایل',
  path: 'مسیر',
  content: 'محتوا',
  old_string: 'متن فعلی',
  new_string: 'متن جدید',
  replace_all: 'همهٔ موارد',
  command: 'فرمان',
  timeout: 'مهلت (ثانیه)',
  description: 'شرح کار',
  subagent_type: 'دستیار',
};

type Choice = { type: 'approve' | 'reject' | 'edit'; message?: string; args?: string };

/** What the agent wants to do, shown in full, with the three answers a human can give:
 *  approve, change it first, or refuse with a reason. One answer per action. */
export function ApprovalCard({ actions, onDecide }: { actions: PendingAction[]; onDecide: (decisions: Record<string, any>[]) => Promise<void> }) {
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (index: number, choice: Choice) => setChoices((prev) => ({ ...prev, [index]: choice }));
  const ready = actions.every((_, index) => choices[index]);

  const submit = async (override?: Choice['type']) => {
    setBusy(true);
    setError(null);
    try {
      const decisions = actions.map((action, index) => {
        const choice = override ? { type: override } : choices[index];
        if (choice.type === 'edit') return { type: 'edit', edited_action: { name: action.tool, args: JSON.parse(choice.args ?? '{}') } };
        if (choice.type === 'reject') return { type: 'reject', message: choice.message || 'کاربر این اقدام را رد کرد.' };
        return { type: 'approve' };
      });
      await onDecide(decisions);
    } catch (e) {
      setError(e instanceof SyntaxError ? 'متن ویرایش‌شده JSON معتبر نیست.' : e instanceof Error ? e.message : 'ثبت تصمیم ممکن نشد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-warning/40 bg-warning-soft/40 rounded-2xl border">
      <div className="flex items-center gap-2.5 px-4 pt-3.5">
        <ShieldCheckIcon weight="fill" className="text-warning size-5 shrink-0" />
        <span className="text-sm font-semibold">برای ادامه به تأیید شما نیاز است</span>
      </div>

      <ul className="space-y-2 p-3">
        {actions.map((action, index) => {
          const choice = choices[index];
          return (
            <li key={index} className="bg-background rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{toolLabel[action.tool] ?? action.tool}</span>
                {choice && <Badge tone={choice.type === 'reject' ? 'danger' : choice.type === 'edit' ? 'info' : 'success'}>{choice.type === 'reject' ? 'رد' : choice.type === 'edit' ? 'با ویرایش' : 'تأیید'}</Badge>}
                <div className="flex-1" />
                {action.allowed.includes('edit') && (
                  <Button variant="muted" size="xs" onClick={() => setEditing(editing === index ? null : index)}>
                    <PencilSimpleIcon /> ویرایش
                  </Button>
                )}
                <Button variant={choice?.type === 'reject' ? 'danger' : 'ghost'} size="xs" onClick={() => set(index, { type: 'reject' })}>
                  <XIcon /> رد
                </Button>
                <Button variant={choice?.type === 'approve' ? 'success' : 'outline'} size="xs" onClick={() => set(index, { type: 'approve' })}>
                  <CheckIcon /> تأیید
                </Button>
              </div>

              {editing === index ? (
                <Textarea
                  dir="ltr"
                  className="bg-surface mt-2.5 min-h-32 font-mono text-xs"
                  defaultValue={JSON.stringify(action.args, null, 2)}
                  onChange={(e) => set(index, { type: 'edit', args: e.target.value })}
                />
              ) : (
                <dl className="mt-2.5 space-y-1.5 text-xs">
                  {Object.entries(action.args).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-muted-foreground truncate pt-1.5">{argLabel[key] ?? key}</dt>
                      <dd className="bg-surface max-h-40 overflow-auto rounded-lg px-2.5 py-1.5 leading-6 whitespace-pre-wrap" dir="auto">
                        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {choice?.type === 'reject' && (
                <Textarea className="bg-background mt-2.5 min-h-12 text-sm" placeholder="دلیل رد (اختیاری) — به ایجنت گفته می‌شود" onChange={(e) => set(index, { type: 'reject', message: e.target.value })} />
              )}
            </li>
          );
        })}
      </ul>

      {error && <p className="text-danger px-4 pb-2 text-xs">{error}</p>}
      <div className="flex items-center justify-end gap-2 border-t px-3 py-2.5">
        {actions.length > 1 && (
          <>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => submit('reject')}>
              رد همه
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => submit('approve')}>
              تأیید همه
            </Button>
          </>
        )}
        <Button size="sm" disabled={busy || !ready} onClick={() => submit()}>
          <CheckIcon /> ثبت تصمیم
        </Button>
      </div>
    </div>
  );
}
