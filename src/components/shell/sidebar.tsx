'use client';

import { BellIcon, CaretDownIcon, CaretUpDownIcon, CheckIcon, FolderOpenIcon, GearSixIcon, PlusIcon, SidebarSimpleIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { TaskMenu } from '@/components/shared/task-menu';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays';
import { navRow } from '@/components/ui/patterns';
import { Dot, Hint, Kbd, PathText } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { toolLabel, useBackend, waitingRuns } from '@/lib/backend';
import { useUi } from '@/lib/store';
import { cn } from '@/lib/utils';
import { navItems } from './nav';

const railRow = 'justify-center px-0';

const runTone: Record<string, string> = { running: 'primary', waiting: 'warning', finished: 'neutral' };

export function LogoMark({ className }: { className?: string }) {
  return <Image src="/logo.png" alt="" width={28} height={28} priority className={cn('size-7 shrink-0 object-contain', className)} />;
}

/** The open workspace and the other folders this machine has used. A workspace is
 *  its folder, like a repository: switching means opening another folder. */
function WorkspaceSwitcher({ open }: { open: boolean }) {
  const workspace = useBackend((s) => s.workspace);
  const openWorkspace = useBackend((s) => s.openWorkspace);

  const switchTo = async (path: string) => {
    try {
      await openWorkspace(path);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'باز کردن فضای کاری ممکن نشد.');
    }
  };
  const pickNew = async () => {
    const folder = await window.desktop?.pickFolder?.();
    if (folder) await switchTo(folder);
    else if (!window.desktop?.pickFolder) toast('انتخاب پوشه فقط در برنامهٔ دسکتاپ ممکن است.');
  };

  return (
    <Menu>
      <MenuTrigger
        className={cn('hover:bg-hover data-[state=open]:bg-hover flex h-10 min-w-0 items-center gap-2 rounded-lg text-start outline-none', open ? 'flex-1 px-1.5' : 'w-10 justify-center')}
        aria-label="فضای کاری"
      >
        <LogoMark />
        {open && (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{workspace?.name}</span>
            <CaretUpDownIcon className="text-muted-foreground size-4" />
          </>
        )}
      </MenuTrigger>
      <MenuContent align="start" className="w-72">
        <MenuLabel>فضاهای کاری این سیستم</MenuLabel>
        {(workspace?.known ?? []).map((known) => (
          <MenuItem key={known.path} className="h-auto py-1.5" onSelect={() => known.path !== workspace?.path && switchTo(known.path)}>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate">{known.name}</span>
              <PathText path={known.path} className="text-muted-foreground text-[11px]" />
            </span>
            {known.path === workspace?.path && <CheckIcon className="text-primary!" />}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem onSelect={pickNew}>
          <FolderOpenIcon />
          باز کردن پوشه‌ای دیگر
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

/** The bell lists what is waiting for the user right now: paused actions, across all tasks. */
function Notifications() {
  const router = useRouter();
  const waiting = waitingRuns(useBackend((s) => s.runs));
  return (
    <Popover>
      <Hint label="منتظر شما" side="bottom">
        <PopoverTrigger asChild>
          <Button variant="muted" size="icon-sm" aria-label="اعلان‌ها" className="relative">
            <BellIcon />
            {waiting.length > 0 && <span className="bg-primary ring-sidebar absolute end-1.5 top-1.5 size-2 rounded-full ring-2" />}
          </Button>
        </PopoverTrigger>
      </Hint>
      <PopoverContent align="end" side="bottom" className="w-92 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">منتظر تأیید شما</div>
        {waiting.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">چیزی منتظر شما نیست.</p>
        ) : (
          <ul className="divide-border/70 divide-y">
            {waiting.map((run) => (
              <li key={run.thread_id}>
                <button className="hover:bg-hover flex w-full gap-3 px-4 py-3 text-start" onClick={() => router.push('/approvals')}>
                  <Dot tone="warning" className="mt-2.5 size-2" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{run.title || 'کار بدون عنوان'}</span>
                    <span className="text-muted-foreground block truncate text-xs">{(run.pending ?? []).map((a) => toolLabel[a.tool] ?? a.tool).join('، ')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Expanded: navigation and recent tasks. Collapsed: an icon rail, so the way back is always visible. */
export function AppSidebar({ open }: { open: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const setActiveThread = useUi((s) => s.setActiveThread);
  const activeThread = useUi((s) => s.activeThread);
  const runs = useBackend((s) => s.runs);
  const [recentOpen, setRecentOpen] = useState(true);
  const waitingCount = waitingRuns(runs).length;
  const settingsActive = pathname.startsWith('/settings');

  return (
    <aside className={cn('flex shrink-0 flex-col px-2 pb-2 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]', open ? 'w-[248px]' : 'w-14')}>
      <div className={cn('flex items-center gap-1', !open && 'flex-col')}>
        <WorkspaceSwitcher open={open} />
        <Notifications />
        {!open && (
          <Hint side="left" label={<>بازکردن منو <Kbd className="bg-background/20 text-background ltr-nums">Ctrl B</Kbd></>}>
            <Button variant="muted" size="icon-sm" aria-label="منو" onClick={toggleSidebar}>
              <SidebarSimpleIcon className="-scale-x-100" />
            </Button>
          </Hint>
        )}
      </div>

      <Link href="/tasks" className={cn(navRow, 'text-sidebar-foreground mt-2 shrink-0', !open && railRow)} onClick={() => setActiveThread(null)} aria-label="کار جدید">
        <PlusIcon />
        {open && (
          <>
            <span className="flex-1">کار جدید</span>
            <Kbd className="ltr-nums opacity-0 group-hover/row:opacity-100">Ctrl J</Kbd>
          </>
        )}
      </Link>

      <nav className="scrollbar-none mt-2 min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const badge = item.href === '/approvals' ? waitingCount : 0;
            const link = (
              <Link href={item.href} className={cn(navRow, !open && railRow)} data-active={active} aria-label={item.label}>
                <item.icon weight={active ? 'fill' : 'bold'} className={cn(active && 'text-primary')} />
                {open && <span className="flex-1 truncate">{item.label}</span>}
                {badge > 0 &&
                  (open ? (
                    <span className="bg-primary text-primary-foreground flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-medium">
                      {badge.toLocaleString('fa-IR')}
                    </span>
                  ) : (
                    <span className="bg-primary ring-sidebar absolute end-2 top-1.5 size-2 rounded-full ring-2" />
                  ))}
              </Link>
            );
            return <li key={item.href}>{open ? link : <Hint label={item.label} side="left">{link}</Hint>}</li>;
          })}
        </ul>

        {open && runs.length > 0 && (
          <div className="mt-5">
            <button
              onClick={() => setRecentOpen((v) => !v)}
              aria-expanded={recentOpen}
              className="text-muted-foreground/80 hover:text-foreground flex h-7 w-full items-center gap-1 px-2.5 text-xs font-medium"
            >
              کارهای اخیر
              <CaretDownIcon className={cn('size-3 transition-transform', !recentOpen && 'rotate-90')} />
            </button>
            <ul className={cn('flex flex-col gap-0.5', !recentOpen && 'hidden')}>
              {runs.slice(0, 12).map((run) => (
                <li key={run.thread_id} className="group/task relative">
                  <button
                    className={cn(navRow, 'pe-9 font-normal')}
                    data-active={pathname.startsWith('/tasks') && activeThread === run.thread_id}
                    onClick={() => {
                      setActiveThread(run.thread_id);
                      router.push('/tasks');
                    }}
                  >
                    <Dot tone={runTone[run.status]} pulse={run.status === 'running'} className="mx-1.5 size-2" />
                    <span className="flex-1 truncate text-start">{run.title || 'کار بدون عنوان'}</span>
                  </button>
                  <span className="absolute end-1 top-1/2 -translate-y-1/2">
                    <TaskMenu run={run} className="opacity-0 group-hover/task:opacity-100 focus-visible:opacity-100" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <Link href="/settings" className={cn(navRow, 'mt-2 shrink-0', !open && railRow)} data-active={settingsActive} aria-label="تنظیمات">
        <GearSixIcon weight={settingsActive ? 'fill' : 'bold'} className={cn(settingsActive && 'text-primary')} />
        {open && <span className="flex-1">تنظیمات</span>}
      </Link>
    </aside>
  );
}
