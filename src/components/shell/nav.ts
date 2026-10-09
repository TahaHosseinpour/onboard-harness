import { ChatsCircleIcon, CheckSquareOffsetIcon, FolderSimpleIcon, HouseIcon, SlidersHorizontalIcon, type Icon } from '@phosphor-icons/react';

export type NavItem = { href: string; label: string; icon: Icon };

// Only screens that are backed by the engine. Dashboards, goals and team return
// here when they have real data behind them.
export const navItems: NavItem[] = [
  { href: '/', label: 'خانه', icon: HouseIcon },
  { href: '/tasks', label: 'کارها', icon: ChatsCircleIcon },
  { href: '/approvals', label: 'صندوق تأیید', icon: CheckSquareOffsetIcon },
  { href: '/files', label: 'فایل‌ها', icon: FolderSimpleIcon },
  { href: '/customize', label: 'سفارشی‌سازی', icon: SlidersHorizontalIcon },
];
