'use client';

import { ArrowsClockwiseIcon, FolderOpenIcon, PlugsIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input, PathText } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { useBackend } from '@/lib/backend';
import { useUi } from '@/lib/store';
import { Onboarding, onboardingSeen } from './onboarding';
import { AppSidebar } from './sidebar';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-sidebar flex h-dvh flex-col">
      <div className="desktop-strip app-drag" />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="bg-background w-full max-w-lg rounded-2xl border p-8 text-center">{children}</div>
      </div>
    </div>
  );
}

/** First run: a workspace is a folder, chosen once. Everything the app makes lives inside it. */
function ChooseWorkspace() {
  const openWorkspace = useBackend((s) => s.openWorkspace);
  const known = useBackend((s) => s.workspace?.known ?? []);
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // `named` is false for a workspace opened before: it keeps the name it already has.
  const open = async (folder: string, named = true) => {
    if (!folder.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await openWorkspace(folder.trim(), named ? name : undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'باز کردن پوشه ممکن نشد.');
    } finally {
      setBusy(false);
    }
  };

  const pick = async () => {
    const folder = await window.desktop?.pickFolder?.();
    if (folder) await open(folder);
  };

  return (
    <Centered>
      <Image src="/logo.png" alt="" width={56} height={56} className="mx-auto" />
      <h1 className="mt-4 text-xl font-semibold">یک فضای کاری بسازید</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-7">
        برایش یک نام بگذارید و یک پوشه انتخاب کنید. همهٔ فایل‌ها، مهارت‌ها، قوانین و سابقهٔ کارها داخل همین پوشه ذخیره می‌شود. پوشهٔ یک فضای کاری بعداً عوض نمی‌شود؛ برای پوشهٔ دیگر، فضای کاری دیگری می‌سازید.
      </p>
      <Input className="mt-6 text-center" placeholder="نام فضای کاری، مثلاً: فروشگاه من" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      <p className="text-muted-foreground mt-1.5 text-xs">اگر خالی بماند، نام پوشه نمایش داده می‌شود. بعداً در تنظیمات قابل تغییر است.</p>
      {typeof window !== 'undefined' && window.desktop?.pickFolder ? (
        <Button className="mt-4" onClick={pick} disabled={busy}>
          <FolderOpenIcon /> انتخاب پوشه
        </Button>
      ) : (
        <div className="mt-4 flex gap-2">
          <Input dir="ltr" className="font-mono" placeholder="D:\MyWorkspace" value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && open(path)} />
          <Button onClick={() => open(path)} disabled={busy || !path.trim()}>
            باز کن
          </Button>
        </div>
      )}
      {error && <p className="text-danger mt-3 text-sm">{error}</p>}
      {known.length > 0 && (
        <div className="mt-6 border-t pt-4 text-start">
          <div className="text-muted-foreground mb-2 text-xs">فضاهای کاری قبلی</div>
          {known.map((item) => (
            <button key={item.path} onClick={() => open(item.path, false)} className="hover:bg-hover block w-full rounded-lg px-3 py-2 text-start">
              <span className="block truncate text-sm font-medium">{item.name}</span>
              <PathText path={item.path} className="text-muted-foreground text-xs" />
            </button>
          ))}
        </div>
      )}
    </Centered>
  );
}

/** Kortix's inset layout: the canvas and sidebar share one tone, and the page
 *  lives in a rounded pane floating on it. Mirrored for RTL — sidebar on the right. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const setActiveThread = useUi((s) => s.setActiveThread);
  const status = useBackend((s) => s.status);
  const workspace = useBackend((s) => s.workspace);
  const connect = useBackend((s) => s.connect);
  const refreshRuns = useBackend((s) => s.refreshRuns);
  const models = useBackend((s) => s.models);
  const introOpen = useUi((s) => s.introOpen);
  const setIntroOpen = useUi((s) => s.setIntroOpen);
  const setSettingsTab = useUi((s) => s.setSettingsTab);

  useEffect(() => {
    connect();
  }, [connect]);

  // First launch on this machine: explain the app before asking for anything.
  useEffect(() => {
    if (!onboardingSeen()) setIntroOpen(true);
  }, [setIntroOpen]);

  const closeIntro = () => {
    setIntroOpen(false);
    // With a workspace already open, the one thing left to do is connecting a model: go there.
    if (workspace?.path && models.every((model) => model.base_url.startsWith('demo://'))) {
      setSettingsTab('models');
      router.push('/settings');
    }
  };

  // Keep the task list and the approvals badge current while tasks run in the background.
  useEffect(() => {
    if (status !== 'ready' || !workspace?.path) return;
    const timer = setInterval(() => refreshRuns().catch(() => {}), 4000);
    return () => clearInterval(timer);
  }, [status, workspace?.path, refreshRuns]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return;
      // event.code keeps the shortcuts working while the Persian layout is active.
      if (event.code === 'KeyB') {
        event.preventDefault();
        toggleSidebar();
      } else if (event.code === 'KeyJ') {
        event.preventDefault();
        setActiveThread(null);
        router.push('/tasks');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, setActiveThread, toggleSidebar]);

  // The engine starts in the background meanwhile, so the introduction also covers the wait.
  if (introOpen) return <Onboarding onDone={closeIntro} />;

  if (status === 'connecting')
    return (
      <Centered>
        <ArrowsClockwiseIcon className="text-primary mx-auto size-8 animate-spin" />
        <p className="text-muted-foreground mt-4 text-sm">در حال آماده‌شدن…</p>
      </Centered>
    );

  if (status === 'offline')
    return (
      <Centered>
        <PlugsIcon className="text-danger mx-auto size-10" />
        <h1 className="mt-4 text-lg font-semibold">موتور آنبورد هارنس در دسترس نیست</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-7">بخشی که کارها را اجرا می‌کند بالا نیامده است. برنامه را ببندید و دوباره باز کنید؛ اگر باز هم نشد، دوباره تلاش کنید.</p>
        <Button className="mt-6" variant="outline" onClick={() => connect()}>
          <ArrowsClockwiseIcon /> تلاش دوباره
        </Button>
      </Centered>
    );

  if (!workspace?.path) return <ChooseWorkspace />;

  return (
    <div className="bg-sidebar flex h-dvh flex-col">
      <div className="desktop-strip app-drag" />
      <div className="shell-body flex min-h-0 flex-1 pt-2">
        <AppSidebar open={sidebarOpen} />
        <main className="bg-background relative me-2 mb-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border">{children}</main>
      </div>
    </div>
  );
}
