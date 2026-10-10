'use client';

import { DotsThreeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/overlays';
import { Input } from '@/components/ui/primitives';
import { ApiError, type RunSummary } from '@/lib/api';
import { useBackend } from '@/lib/backend';
import { cn } from '@/lib/utils';

/** The three-dot menu of a task: give it another name, or remove it from the history. */
export function TaskMenu({ run, className }: { run: RunSummary; className?: string }) {
  const renameRun = useBackend((s) => s.renameRun);
  const deleteRun = useBackend((s) => s.deleteRun);
  const [dialog, setDialog] = useState<'rename' | 'delete' | null>(null);
  const [title, setTitle] = useState('');

  const act = async (action: Promise<void>, done: string) => {
    try {
      await action;
      toast.success(done);
      setDialog(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'انجام نشد.');
    }
  };
  const rename = () => title.trim() && act(renameRun(run.thread_id, title.trim()), 'نام کار عوض شد.');

  return (
    // Clicks inside the menu must not also open the row the menu sits on.
    <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <Menu>
        <MenuTrigger asChild>
          <Button variant="muted" size="icon-xs" aria-label="گزینه‌های این کار" className={cn('data-[state=open]:bg-hover data-[state=open]:opacity-100', className)}>
            <DotsThreeIcon weight="bold" className="size-[18px]!" />
          </Button>
        </MenuTrigger>
        <MenuContent align="end" className="min-w-40">
          <MenuItem
            onSelect={() => {
              setTitle(run.title ?? '');
              setDialog('rename');
            }}
          >
            <PencilSimpleIcon /> تغییر نام
          </MenuItem>
          <MenuItem className="text-danger" onSelect={() => setDialog('delete')}>
            <TrashIcon /> حذف
          </MenuItem>
        </MenuContent>
      </Menu>

      <Dialog open={dialog === 'rename'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent
          title="تغییر نام کار"
          footer={
            <>
              <DialogClose asChild>
                <Button variant="ghost" size="sm">انصراف</Button>
              </DialogClose>
              <Button size="sm" disabled={!title.trim()} onClick={rename}>ذخیره</Button>
            </>
          }
        >
          <Input autoFocus dir="auto" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && rename()} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'delete'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent
          title="این کار حذف شود؟"
          footer={
            <>
              <DialogClose asChild>
                <Button variant="ghost" size="sm">انصراف</Button>
              </DialogClose>
              <Button variant="destructive" size="sm" onClick={() => act(deleteRun(run.thread_id), 'کار حذف شد.')}>
                <TrashIcon /> حذف
              </Button>
            </>
          }
        >
          <p className="text-sm leading-7">
            گفتگو و سابقهٔ «<bdi>{run.title || 'کار بدون عنوان'}</bdi>» پاک می‌شود و برنمی‌گردد. فایل‌هایی که این کار در پوشهٔ فضای کاری ساخته سر جایشان می‌مانند.
          </p>
        </DialogContent>
      </Dialog>
    </span>
  );
}
