'use client';

import { CheckIcon, PencilSimpleIcon, ShieldCheckIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge, Input, Textarea } from '@/components/ui/primitives';
import type { PendingAction } from '@/lib/api';
import { toolLabel } from '@/lib/backend';

/** Plain names for the inputs of an action, so the card does not show field names from the code. */
const argLabel: Record<string, string> = {
  file_path: 'فایل',
  path: 'مسیر',
  destination: 'پوشهٔ مقصد',
  content: 'محتوا',
  old_string: 'متن فعلی',
  new_string: 'متن جدید',
  replace_all: 'همهٔ موارد',
  command: 'فرمان',
  timeout: 'مهلت (ثانیه)',
  description: 'شرح کار',
  subagent_type: 'دستیار',
  url: 'نشانی',
  screenshot: 'عکس از صفحه',
  rows: 'ردیف‌ها',
  columns: 'ستون‌ها',
  sheet: 'برگه',
  overwrite: 'جایگزینی فایل موجود',
};

/** What the agent wants to do, shown in full, with one answer for the whole request: approve or
 *  reject, a single click each. An action can be changed first; rejecting can carry a reason. */
export function ApprovalCard({ actions, onDecide }: { actions: PendingAction[]; onDecide: (decisions: Record<string, any>[]) => Promise<void> }) {
  const [edited, setEdited] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (answer: 'approve' | 'reject') => {
    setBusy(true);
    setError(null);
    try {
      const decisions = actions.map((action, index) => {
        if (answer === 'reject') return { type: 'reject', message: reason.trim() || 'کاربر این اقدام را رد کرد.' };
        if (edited[index] !== undefined) return { type: 'edit', edited_action: { name: action.tool, args: JSON.parse(edited[index]) } };
        return { type: 'approve' };
      });
      await onDecide(decisions);
    } catch (e) {
      setError(e instanceof SyntaxError ? 'متن ویرایش‌شده JSON معتبر نیست.' : e instanceof Error ? e.message : 'ثبت تصمیم ممکن نشد.');
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
        {actions.map((action, index) => (
          <li key={index} className="bg-background rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{toolLabel[action.tool] ?? action.tool}</span>
              {edited[index] !== undefined && <Badge tone="info">ویرایش شده</Badge>}
              <div className="flex-1" />
              {action.allowed.includes('edit') && (
                <Button variant="muted" size="xs" onClick={() => setEditing(editing === index ? null : index)}>
                  <PencilSimpleIcon /> {editing === index ? 'بستن ویرایش' : 'ویرایش'}
                </Button>
              )}
            </div>

            {editing === index ? (
              <Textarea
                dir="ltr"
                className="bg-surface mt-2.5 min-h-32 font-mono text-xs"
                defaultValue={edited[index] ?? JSON.stringify(action.args, null, 2)}
                onChange={(e) => setEdited((previous) => ({ ...previous, [index]: e.target.value }))}
              />
            ) : (
              <dl className="mt-2.5 space-y-1.5 text-xs">
                {Object.entries(edited[index] !== undefined ? safeParse(edited[index], action.args) : action.args).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[7rem_1fr] gap-2">
                    <dt className="text-muted-foreground truncate pt-1.5">{argLabel[key] ?? key}</dt>
                    <dd className="bg-surface max-h-40 overflow-auto rounded-lg px-2.5 py-1.5 leading-6 whitespace-pre-wrap" dir="auto">
                      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="text-danger px-4 pb-2 text-xs">{error}</p>}
      <div className="flex items-center gap-2 border-t px-3 py-2.5">
        <Input className="bg-background h-9 min-w-0 flex-1 text-sm" placeholder="اگر رد می‌کنید، دلیلش را بنویسید (اختیاری)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="danger" size="sm" disabled={busy} onClick={() => submit('reject')}>
          <XIcon /> رد
        </Button>
        <Button size="sm" disabled={busy} onClick={() => submit('approve')}>
          <CheckIcon /> تأیید
        </Button>
      </div>
    </div>
  );
}

function safeParse(text: string, fallback: Record<string, any>): Record<string, any> {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : fallback;
  } catch {
    return fallback;
  }
}
