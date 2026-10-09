'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useUi } from '@/lib/store';
import { AppSidebar } from './sidebar';

/** Kortix's inset layout: the canvas and sidebar share one tone, and the page
 *  lives in a rounded pane floating on it. Mirrored for RTL — sidebar on the right.
 *  There is no top bar; navigation, notifications and theme all live in the sidebar. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const setActiveTask = useUi((s) => s.setActiveTask);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return;
      // event.code keeps the shortcuts working while the Persian layout is active.
      if (event.code === 'KeyB') {
        event.preventDefault();
        toggleSidebar();
      } else if (event.code === 'KeyJ') {
        event.preventDefault();
        setActiveTask('new');
        router.push('/tasks');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, setActiveTask, toggleSidebar]);

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
