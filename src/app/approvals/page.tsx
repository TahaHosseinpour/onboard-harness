'use client';

import { CheckIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ApprovalCard } from '@/components/shared/approval-card';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { EmptyNote } from '@/components/ui/patterns';
import { api, ApiError } from '@/lib/api';
import { useBackend, waitingRuns } from '@/lib/backend';
import { useUi } from '@/lib/store';
import { fa } from '@/lib/utils';

/** Every action that is paused for a human, across all tasks, in one queue. */
export default function ApprovalsPage() {
  const router = useRouter();
  const runs = useBackend((s) => s.runs);
  const refreshRuns = useBackend((s) => s.refreshRuns);
  const setActiveThread = useUi((s) => s.setActiveThread);
  const waiting = waitingRuns(runs);

  const decide = async (threadId: string, decisions: Record<string, any>[]) => {
    try {
      await api.post(`/runs/${threadId}/decisions`, { decisions });
      toast.success('تصمیم شما ثبت شد و کار ادامه پیدا کرد.');
      await refreshRuns();
    } catch (e) {
      throw new Error(e instanceof ApiError ? e.message : 'ثبت تصمیم ممکن نشد.');
    }
  };

  return (
    <>
      <PageHeader title="صندوق تأیید" meta={waiting.length ? `${fa(waiting.length)} کار منتظر شماست` : undefined} />
      <PageBody className="max-w-3xl space-y-6">
        {waiting.length === 0 ? (
          <EmptyNote icon={<CheckIcon />} title="چیزی منتظر تأیید نیست">
            هر وقت ایجنتی بخواهد کاری انجام دهد که قوانین فضای کاری برایش «با تأیید» گذاشته‌اند، اینجا می‌آید.
          </EmptyNote>
        ) : (
          waiting.map((run) => (
            <section key={run.thread_id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="min-w-0 truncate text-sm font-semibold" dir="auto">{run.title || 'کار بدون عنوان'}</h2>
                <Button
                  variant="muted"
                  size="xs"
                  onClick={() => {
                    setActiveThread(run.thread_id);
                    router.push('/tasks');
                  }}
                >
                  دیدن گفتگو
                </Button>
              </div>
              <ApprovalCard actions={run.pending ?? []} onDecide={(decisions) => decide(run.thread_id, decisions)} />
            </section>
          ))
        )}
      </PageBody>
    </>
  );
}
