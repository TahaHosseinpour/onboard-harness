'use client';

import { ArrowLeftIcon, CheckSquareOffsetIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Composer } from '@/components/shared/composer';
import { PageBody } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/patterns';
import { Badge, Dot, SectionCard } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { stopReasonLabel, toolLabel, useBackend, waitingRuns } from '@/lib/backend';
import { useUi } from '@/lib/store';
import { jalaliToday } from '@/lib/utils';

const statusTone = { running: 'primary', waiting: 'warning', finished: 'neutral' } as const;

export default function HomePage() {
  const router = useRouter();
  const runs = useBackend((s) => s.runs);
  const startRun = useBackend((s) => s.startRun);
  const workspace = useBackend((s) => s.workspace);
  const options = useUi((s) => s.runOptions);
  const setActiveThread = useUi((s) => s.setActiveThread);
  const waiting = waitingRuns(runs);

  const open = (threadId: string) => {
    setActiveThread(threadId);
    router.push('/tasks');
  };

  const start = async (prompt: string) => {
    try {
      open(await startRun({ prompt, modelId: options.modelId, agentId: options.agentId, mode: options.mode }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'شروع کار ممکن نشد.');
    }
  };

  return (
    <PageBody className="space-y-6 py-10">
      <section className="mx-auto max-w-3xl">
        <p className="text-muted-foreground text-center text-xs" suppressHydrationWarning>
          {jalaliToday()}
        </p>
        <h1 className="mt-1 text-center text-2xl font-semibold tracking-tight">امروز چه کاری انجام بدهم؟</h1>
        <Composer large className="mt-6" placeholder={`کاری را در فضای کاری «${workspace?.name ?? ''}» بسپارید…`} onSend={start} />
      </section>

      <div className="mx-auto grid max-w-3xl gap-4 pt-6">
        {waiting.length > 0 && (
          <SectionCard
            title="منتظر تأیید شما"
            count={waiting.length}
            flush
            action={
              <Button asChild variant="soft" size="xs">
                <Link href="/approvals">
                  صندوق تأیید <ArrowLeftIcon />
                </Link>
              </Button>
            }
          >
            <div className="p-1.5">
              {waiting.map((run) => (
                <ListRow
                  key={run.thread_id}
                  onClick={() => router.push('/approvals')}
                  icon={<CheckSquareOffsetIcon className="text-warning size-5 shrink-0" />}
                  title={<span className="truncate" dir="auto">{run.title || 'کار بدون عنوان'}</span>}
                  meta={<span className="truncate">{(run.pending ?? []).map((a) => toolLabel[a.tool] ?? a.tool).join('، ')}</span>}
                />
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard title="کارهای اخیر" count={runs.length || undefined} flush>
          {runs.length === 0 ? (
            <p className="text-muted-foreground px-5 py-8 text-center text-sm">هنوز کاری انجام نشده است. اولین کار را از کادر بالا شروع کنید.</p>
          ) : (
            <div className="p-1.5">
              {runs.slice(0, 8).map((run) => (
                <ListRow
                  key={run.thread_id}
                  onClick={() => open(run.thread_id)}
                  icon={<Dot tone={statusTone[run.status]} pulse={run.status === 'running'} className="mx-1 size-2.5" />}
                  title={<span className="truncate" dir="auto">{run.title || 'کار بدون عنوان'}</span>}
                  trailing={<Badge tone={run.status === 'waiting' ? 'warning' : run.status === 'running' ? 'primary' : run.stop_reason === 'completed' ? 'success' : 'neutral'}>{run.status === 'running' ? 'در حال اجرا' : stopReasonLabel[run.stop_reason ?? ''] ?? '—'}</Badge>}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageBody>
  );
}
