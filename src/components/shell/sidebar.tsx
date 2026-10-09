'use client';

import {
  BellIcon,
  CaretDownIcon,
  CaretUpDownIcon,
  CheckIcon,
  FolderOpenIcon,
  GearSixIcon,
  PlusIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  UserCircleIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays';
import { Dot, Glyph, Hint, Input, Kbd, Label } from '@/components/ui/primitives';
import { agentById, APP_NAME, me, notifications, org, tasks, taskStatus, workspace } from '@/lib/mock';
import { useUi } from '@/lib/store';
import { cn } from '@/lib/utils';
import { navItems } from './nav';

// No hover transition on rows: they are hit all day, and an animated highlight lags the pointer.
const rowClass =
  'group/row text-muted-foreground hover:bg-hover hover:text-sidebar-foreground data-[active=true]:bg-active data-[active=true]:text-foreground relative flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[0.8125rem] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&_svg]:size-[18px] [&_svg]:shrink-0';
const railRow = 'justify-center px-0';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('bg-primary inline-flex size-7 shrink-0 items-center justify-center rounded-full', className)}>
      <svg viewBox="0 0 16 16" className="size-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="8" cy="8" r="2.2" fill="currentColor" stroke="none" />
        <path d="M8 1.8v2.4M8 11.8v2.4M1.8 8h2.4M11.8 8h2.4" />
      </svg>
    </span>
  );
}

/** A workspace is its folder, the way a repository is: it is chosen once, at creation.
 *  Pointing an existing workspace at another folder would orphan everything in it. */
function NewWorkspaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [folder, setFolder] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="فضای کاری جدید"
        description="هر فضای کاری یک پوشه روی این سیستم است و همه‌چیز همان‌جا ذخیره می‌شود."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">انصراف</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button size="sm" disabled={!folder} onClick={() => toast.success('فضای کاری ساخته شد', { description: folder })}>
                ساخت فضای کاری
              </Button>
            </DialogClose>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>نام</Label>
            <Input placeholder="مثلاً: شعبهٔ اصفهان" />
          </div>
          <div>
            <Label>پوشه</Label>
            <div className="flex gap-2">
              <Input readOnly dir="ltr" value={folder} placeholder="D:\..." className="font-mono" />
              <Button variant="outline" onClick={() => setFolder('D:\\Nikan-Isfahan')}>
                <FolderOpenIcon /> انتخاب
              </Button>
            </div>
          </div>
          <p className="bg-warning-soft text-warning rounded-xl px-3.5 py-2.5 text-xs leading-6">
            پوشهٔ فضای کاری بعداً قابل تغییر نیست. برای کار در پوشه‌ای دیگر، یک فضای کاری جدید بسازید.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceSwitcher({ open }: { open: boolean }) {
  const [creating, setCreating] = useState(false);
  return (
    <>
    <Menu>
      <MenuTrigger
        className={cn('hover:bg-hover data-[state=open]:bg-hover flex h-10 min-w-0 items-center gap-2 rounded-lg text-start outline-none', open ? 'flex-1 px-1.5' : 'w-10 justify-center')}
        aria-label="فضای کاری"
      >
        <LogoMark />
        {open && (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{org.name}</span>
            <CaretUpDownIcon className="text-muted-foreground size-4" />
          </>
        )}
      </MenuTrigger>
      <MenuContent align="start" className="w-64">
        <MenuLabel>فضاهای کاری</MenuLabel>
        <MenuItem className="h-auto py-1.5">
          <Glyph size="sm" tone="primary">ن</Glyph>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block">{org.name}</span>
            <span className="text-muted-foreground ltr-nums block truncate text-end font-mono text-[11px]">{workspace.path}</span>
          </span>
          <CheckIcon className="text-primary!" />
        </MenuItem>
        <MenuItem className="h-auto py-1.5">
          <Glyph size="sm">ش</Glyph>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block">فضای شخصی</span>
            <span className="text-muted-foreground ltr-nums block truncate text-end font-mono text-[11px]">{'C:\\Users\\Nima\\Harness'}</span>
          </span>
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>واحد فعال</MenuLabel>
        {['مدیریت', 'فروش', 'مارکتینگ', 'مالی'].map((unit) => (
          <MenuItem key={unit}>
            <span className="flex-1">{unit}</span>
            {unit === org.unit && <CheckIcon className="text-primary!" />}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem onSelect={() => setCreating(true)}>
          <PlusIcon />
          فضای کاری جدید
        </MenuItem>
      </MenuContent>
    </Menu>
    <NewWorkspaceDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

function Notifications() {
  const unread = notifications.filter((n) => n.unread).length;
  return (
    <Popover>
      <Hint label="اعلان‌ها" side="bottom">
        <PopoverTrigger asChild>
          <Button variant="muted" size="icon-sm" aria-label="اعلان‌ها" className="relative">
            <BellIcon />
            {unread > 0 && <span className="bg-primary ring-sidebar absolute end-1.5 top-1.5 size-2 rounded-full ring-2" />}
          </Button>
        </PopoverTrigger>
      </Hint>
      <PopoverContent align="end" side="bottom" className="w-92 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">اعلان‌ها</span>
          <button className="text-primary text-xs">همه را خوانده‌شده کن</button>
        </div>
        <ul className="divide-border/70 divide-y">
          {notifications.map((n) => (
            <li key={n.id} className={cn('hover:bg-hover flex gap-3 px-4 py-3', n.unread && 'bg-primary-soft/40')}>
              <Dot tone={n.tone} className="mt-2.5 size-2" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-muted-foreground text-xs">{n.when}</span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs leading-5">{n.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu({ open }: { open: boolean }) {
  const router = useRouter();
  return (
    <Menu>
      <MenuTrigger
        className={cn('hover:bg-hover data-[state=open]:bg-hover flex h-10 min-w-0 items-center gap-2 rounded-lg text-start outline-none', open ? 'flex-1 px-1.5' : 'w-10 justify-center')}
        aria-label="حساب کاربری"
      >
        <span className="bg-primary-soft text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">{me.initials}</span>
        {open && (
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">{me.name}</span>
        )}
      </MenuTrigger>
      <MenuContent align="start" side="top" className="w-56">
        <MenuItem>
          <UserCircleIcon />
          حساب کاربری
        </MenuItem>
        <MenuItem onSelect={() => router.push('/settings')}>
          <GearSixIcon />
          تنظیمات
        </MenuItem>
        <MenuSeparator />
        <MenuItem>
          <SignOutIcon />
          خروج
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

/** Expanded: full navigation and recent tasks. Collapsed: an icon rail, so the way back is always visible. */
export function AppSidebar({ open }: { open: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const setActiveTask = useUi((s) => s.setActiveTask);
  const activeTaskId = useUi((s) => s.activeTaskId);
  const [recentOpen, setRecentOpen] = useState(true);

  const toggle = (
    <Hint
      side="left"
      label={
        <>
          بازکردن منو <Kbd className="bg-background/20 text-background ltr-nums">Ctrl B</Kbd>
        </>
      }
    >
      <Button variant="muted" size="icon-sm" aria-label="منو" onClick={toggleSidebar}>
        <SidebarSimpleIcon className="-scale-x-100" />
      </Button>
    </Hint>
  );

  return (
    <aside className={cn('flex shrink-0 flex-col px-2 pb-2 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]', open ? 'w-[248px]' : 'w-14')}>
      <div className={cn('flex items-center gap-1', !open && 'flex-col')}>
        <WorkspaceSwitcher open={open} />
        <Notifications />
        {!open && toggle}
      </div>

      <Link href="/tasks" className={cn(rowClass, 'text-sidebar-foreground mt-2 shrink-0', !open && railRow)} onClick={() => setActiveTask('new')} aria-label="کار جدید">
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
            const link = (
              <Link href={item.href} className={cn(rowClass, !open && railRow)} data-active={active} aria-label={item.label}>
                <item.icon weight={active ? 'fill' : 'bold'} className={cn(active && 'text-primary')} />
                {open && <span className="flex-1 truncate">{item.label}</span>}
                {item.badge &&
                  (open ? (
                    <span className="bg-primary text-primary-foreground flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-medium">
                      {item.badge.toLocaleString('fa-IR')}
                    </span>
                  ) : (
                    <span className="bg-primary ring-sidebar absolute end-2 top-1.5 size-2 rounded-full ring-2" />
                  ))}
              </Link>
            );
            return <li key={item.href}>{open ? link : <Hint label={item.label} side="left">{link}</Hint>}</li>;
          })}
        </ul>

        {open && (
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
              {tasks.map((task) => {
                const agent = agentById(task.agent);
                return (
                  <li key={task.id}>
                    <button
                      className={cn(rowClass, 'font-normal')}
                      data-active={pathname.startsWith('/tasks') && activeTaskId === task.id}
                      onClick={() => {
                        setActiveTask(task.id);
                        router.push('/tasks');
                      }}
                    >
                      <span className="relative">
                        <Glyph size="sm" tone={agent.tone}>{agent.initial}</Glyph>
                        {task.status !== 'done' && (
                          <Dot tone={taskStatus[task.status].tone} pulse={task.status === 'running'} className="ring-sidebar absolute -end-0.5 -bottom-0.5 size-2 ring-2" />
                        )}
                      </span>
                      <span className="flex-1 truncate text-start">{task.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      <div className={cn('mt-2 flex items-center gap-0.5', !open && 'flex-col-reverse')}>
        <UserMenu open={open} />
        <Hint label="تنظیمات" side="top">
          <Button asChild variant="muted" size="icon-sm" className={cn(pathname.startsWith('/settings') && 'bg-active text-primary')}>
            <Link href="/settings" aria-label="تنظیمات">
              <GearSixIcon weight={pathname.startsWith('/settings') ? 'fill' : 'bold'} />
            </Link>
          </Button>
        </Hint>
      </div>
      <span className="sr-only">{APP_NAME}</span>
    </aside>
  );
}
